/**
 * Population Genetics Simulation Engine
 *
 * Simulates allele frequency dynamics under drift, selection,
 * migration, and mutation. All simulations use Wright-Fisher
 * sampling for finite-population drift.
 */

export interface PopGenConfig {
  popSize: number;
  initialFreqA: number;
  generations: number;
  fitnessAA?: number;
  fitnessAa?: number;
  fitnessaa?: number;
  migrationRate?: number;
  migrantFreqA?: number;
  mutationRate?: number;
  backMutationRate?: number;
}

export interface PopGenResult {
  freqHistory: number[];
  genotypeHistory: { AA: number; Aa: number; aa: number }[];
  finalFreqA: number;
  fixedAllele: 'A' | 'a' | null;
}

/** Draw from binomial(n, p) using direct sampling */
function binomial(n: number, p: number): number {
  let successes = 0;
  for (let i = 0; i < n; i++) {
    if (Math.random() < p) successes++;
  }
  return successes;
}

/**
 * Sample N diploid zygotes via random mating at allele frequency p.
 *
 * Under random mating, each zygote independently draws two alleles from the
 * gamete pool of frequency p, so (N_AA, N_Aa, N_aa) ~ Multinomial(N, [p², 2pq, q²]).
 * This is the CORRECT sampling distribution for genotype counts given p.
 *
 * It is also the distribution against which the standard HWE chi-square test
 * is valid — the test statistic follows chi-square(1) under the null precisely
 * because the counts are a multinomial draw, not a deterministic rounding of
 * N·p², N·2pq, N·q².
 */
function sampleZygotes(n: number, p: number): { AA: number; Aa: number; aa: number } {
  const q = 1 - p;
  const pAA = p * p;
  const pAa = 2 * p * q;
  // Sequential binomial formulation of the multinomial draw:
  //   N_AA ~ Binomial(N, p²)
  //   N_Aa | N_AA ~ Binomial(N - N_AA, 2pq / (2pq + q²))
  //   N_aa = N - N_AA - N_Aa
  // This is more efficient than per-zygote categorical sampling and preserves
  // N_AA + N_Aa + N_aa === N exactly.
  const AA = binomial(n, pAA);
  const remaining = n - AA;
  const condAa = pAA < 1 ? pAa / (1 - pAA) : 0;
  const Aa = binomial(remaining, condAa);
  const aa = remaining - Aa;
  return { AA, Aa, aa };
}

/** Run one population genetics simulation */
export function simulate(config: PopGenConfig): PopGenResult {
  const {
    popSize,
    initialFreqA,
    generations,
    fitnessAA = 1.0,
    fitnessAa = 1.0,
    fitnessaa = 1.0,
    migrationRate = 0,
    migrantFreqA = 0,
    mutationRate = 0,
    backMutationRate = 0,
  } = config;

  const freqHistory: number[] = [];
  const genotypeHistory: { AA: number; Aa: number; aa: number }[] = [];

  // Initialize population: multinomial sample of N zygotes from the
  // ideal gamete pool at frequency initialFreqA.
  let p = initialFreqA;
  let geno = sampleZygotes(popSize, p);
  // Recompute p from the realized sample so that observed allele frequency
  // and observed genotype counts are internally consistent.
  p = (2 * geno.AA + geno.Aa) / (2 * popSize);

  freqHistory.push(p);
  genotypeHistory.push({ ...geno });

  for (let gen = 0; gen < generations; gen++) {
    // 1. Selection — closed-form post-selection allele frequency.
    //
    // Under random mating at frequency p, the expected genotype frequencies
    // are (p², 2pq, q²), and the post-selection allele frequency is
    //
    //   p' = (p² wAA + pq wAa) / (p² wAA + 2pq wAa + q² waa)
    //
    // We compute p' from p directly, rather than from the previous
    // generation's realized genotype counts, so that the selection recursion
    // is the textbook closed form (no added noise from genotype sampling in
    // the PARENTS; selection acts on expected genotype frequencies given p).
    // The Wright-Fisher step below still draws finite-population drift, and
    // the zygote sample below still draws real random-mating variance.
    const q = 1 - p;
    const wBar = p * p * fitnessAA + 2 * p * q * fitnessAa + q * q * fitnessaa;
    if (wBar > 0) {
      p = (p * p * fitnessAA + p * q * fitnessAa) / wBar;
    }

    // 2. Mutation
    if (mutationRate > 0 || backMutationRate > 0) {
      p = p * (1 - mutationRate) + (1 - p) * backMutationRate;
    }

    // 3. Migration
    if (migrationRate > 0) {
      p = (1 - migrationRate) * p + migrationRate * migrantFreqA;
    }

    // Clamp
    p = Math.max(0, Math.min(1, p));

    // 4. Drift — Wright-Fisher sampling of 2N alleles. This is the finite-
    // population drift step and is a function of p alone, not of genotype
    // counts.
    const nA = binomial(2 * popSize, p);
    p = nA / (2 * popSize);

    // 5. Random mating: draw N diploid zygotes from the gamete pool of the
    // post-drift frequency p. Under the null (HWE), the resulting counts are
    // a Multinomial(N, [p², 2pq, q²]) sample — NOT a deterministic rounding
    // of N·p², N·2pq, N·q². That deterministic round-trip (used previously)
    // made Exp 2's chi-square test a tautology: observed would equal expected
    // by construction, so X² would be ≈ 0 regardless of any biological
    // process. With a real multinomial draw, X² follows chi-square(1) under
    // the null and the test measures genuine deviations.
    geno = sampleZygotes(popSize, p);

    freqHistory.push(p);
    genotypeHistory.push({ ...geno });

    // Check fixation — once an allele is lost from the gamete pool it cannot
    // return (assuming no mutation), so fill remaining generations.
    if (p === 0 || p === 1) {
      const fixed = p === 1 ? 1 : 0;
      const fixedGeno = fixed === 1
        ? { AA: popSize, Aa: 0, aa: 0 }
        : { AA: 0, Aa: 0, aa: popSize };
      for (let r = gen + 1; r < generations; r++) {
        freqHistory.push(fixed);
        genotypeHistory.push({ ...fixedGeno });
      }
      break;
    }
  }

  const finalFreqA = freqHistory[freqHistory.length - 1];
  const fixedAllele = finalFreqA === 1 ? 'A' : finalFreqA === 0 ? 'a' : null;

  return { freqHistory, genotypeHistory, finalFreqA, fixedAllele };
}

/** Run multiple independent replicates */
export function simulateReplicates(config: PopGenConfig, nReps: number): PopGenResult[] {
  const results: PopGenResult[] = [];
  for (let i = 0; i < nReps; i++) {
    results.push(simulate(config));
  }
  return results;
}

/** Hardy-Weinberg expected genotype frequencies given allele frequency p */
export function hardyWeinberg(p: number): { AA: number; Aa: number; aa: number } {
  const q = 1 - p;
  return {
    AA: p * p,
    Aa: 2 * p * q,
    aa: q * q,
  };
}

/** Chi-square goodness-of-fit test for Hardy-Weinberg equilibrium */
export function testHWE(observed: { AA: number; Aa: number; aa: number }): {
  expected: { AA: number; Aa: number; aa: number };
  chiSquare: number;
  pValue: number;
  inEquilibrium: boolean;
} {
  const total = observed.AA + observed.Aa + observed.aa;
  const p = (2 * observed.AA + observed.Aa) / (2 * total);
  const hw = hardyWeinberg(p);

  const expected = {
    AA: hw.AA * total,
    Aa: hw.Aa * total,
    aa: hw.aa * total,
  };

  let chiSquare = 0;
  for (const key of ['AA', 'Aa', 'aa'] as const) {
    if (expected[key] > 0) {
      chiSquare += (observed[key] - expected[key]) ** 2 / expected[key];
    }
  }

  // 1 degree of freedom for HWE test
  // Approximate p-value using chi-square CDF with 1 df
  const pValue = 1 - chiSquareCDF(chiSquare, 1);
  const inEquilibrium = pValue > 0.05;

  return { expected, chiSquare, pValue, inEquilibrium };
}

/** Approximate chi-square CDF using the regularized lower incomplete gamma function */
function chiSquareCDF(x: number, k: number): number {
  if (x <= 0) return 0;
  // For k=1: CDF = erf(sqrt(x/2))
  if (k === 1) {
    return erf(Math.sqrt(x / 2));
  }
  // General case using series expansion of lower incomplete gamma
  const a = k / 2;
  const z = x / 2;
  return lowerIncompleteGammaRatio(a, z);
}

function erf(x: number): number {
  // Abramowitz and Stegun approximation
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const poly =
    t *
    (0.254829592 +
      t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
  const result = 1 - poly * Math.exp(-x * x);
  return x >= 0 ? result : -result;
}

function lowerIncompleteGammaRatio(a: number, z: number): number {
  // Series expansion: P(a,z) = e^(-z) * z^a * sum(z^n / gamma(a+n+1))
  let sum = 0;
  let term = 1 / a;
  sum = term;
  for (let n = 1; n < 200; n++) {
    term *= z / (a + n);
    sum += term;
    if (Math.abs(term) < 1e-12) break;
  }
  return sum * Math.exp(-z + a * Math.log(z) - logGamma(a));
}

function logGamma(x: number): number {
  // Lanczos approximation
  const g = 7;
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  const t = x + g - 0.5;
  let sum = c[0];
  for (let i = 1; i < g + 2; i++) {
    sum += c[i] / (x + i - 1);
  }
  return 0.5 * Math.log(2 * Math.PI) + (x - 0.5) * Math.log(t) - t + Math.log(sum);
}
