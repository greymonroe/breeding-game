/**
 * Practice Mode problem generators — Population Genetics curriculum.
 *
 * Five problem types mapping to five core PopGen concepts:
 *  1. Forward HWE: given p, predict genotype frequencies (p², 2pq, q²)
 *  2. Backward HWE: given genotype counts, estimate p̂ and chi-square test
 *  3. Drift scale: visual comparison of trajectory variance at different N
 *  4. Selection Δp: compute Δp = spq²/(1−sq²) from given s and p
 *  5. Migration convergence: predict equilibrium from two starting freqs
 *
 * All problems use plant framing consistent with PopGenModule.tsx:
 *  - Mimulus guttatus M/m (anthocyanin) for HWE, drift, migration
 *  - Amaranthus palmeri R/s (glyphosate resistance) for selection
 *
 * Distractors reflect real student misconceptions (swapping p/q, forgetting
 * denominators, confusing pq with pq², etc.). No option is annotated with
 * correctness info — the `isCorrect` flag drives feedback alone.
 *
 * All validation is against textbook closed-form values, never stochastic
 * samples.
 */

import type { PracticeProblem, PracticeOption } from './problems';

// ── Public types ────────────────────────────────────────────────────────

export type PopGenProblemType =
  | 'forward-hwe'
  | 'backward-hwe'
  | 'drift-scale'
  | 'selection-delta-p'
  | 'migration-convergence';

export type PopGenConcept =
  | 'hwe-prediction'
  | 'hwe-testing'
  | 'drift-variance'
  | 'selection-recurrence'
  | 'migration-equilibrium';

// ── Concept metadata ────────────────────────────────────────────────────

export const POPGEN_ALL_CONCEPTS: readonly PopGenConcept[] = [
  'hwe-prediction',
  'hwe-testing',
  'drift-variance',
  'selection-recurrence',
  'migration-equilibrium',
];

export const POPGEN_CONCEPT_LABELS: Record<PopGenConcept, string> = {
  'hwe-prediction': 'HWE genotype prediction',
  'hwe-testing': 'HWE chi-square testing',
  'drift-variance': 'Drift & population size',
  'selection-recurrence': 'Selection \u0394p',
  'migration-equilibrium': 'Migration equilibrium',
};

export const POPGEN_CONCEPT_TO_TYPE: Record<PopGenConcept, PopGenProblemType> = {
  'hwe-prediction': 'forward-hwe',
  'hwe-testing': 'backward-hwe',
  'drift-variance': 'drift-scale',
  'selection-recurrence': 'selection-delta-p',
  'migration-equilibrium': 'migration-convergence',
};

// ── RNG helpers ─────────────────────────────────────────────────────────

type Rng = () => number;

function pick<T>(arr: readonly T[], rng: Rng): T {
  return arr[Math.floor(rng() * arr.length)];
}

function shuffle<T>(arr: readonly T[], rng: Rng): T[] {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function uid(rng: Rng): string {
  return Math.floor(rng() * 1e9).toString(36);
}

/** Round to n decimal places. */
function round(x: number, n: number): number {
  const f = Math.pow(10, n);
  return Math.round(x * f) / f;
}

// ── 1. Forward HWE ─────────────────────────────────────────────────────
//
// Teaching goal: given allele frequency p, predict genotype frequencies
// using p², 2pq, q².
//
// Canonical: Hardy-Weinberg equilibrium genotype frequencies.
//
// Discovery beat: the student must apply the HW equation, not just recall it.

const HWE_P_VALUES = [0.2, 0.3, 0.4, 0.6, 0.7, 0.8] as const;

function generateForwardHWE(rng: Rng): PracticeProblem {
  const p = pick(HWE_P_VALUES, rng);
  const q = round(1 - p, 2);
  const pSq = round(p * p, 4);
  const twoPopQ = round(2 * p * q, 4);
  const qSq = round(q * q, 4);

  const correctLabel = `MM = ${pSq}, Mm = ${twoPopQ}, mm = ${qSq}`;

  // Distractor 1: swap p and q (student confuses which allele is p)
  const swapPSq = round(q * q, 4);
  const swapTwoPQ = round(2 * p * q, 4); // same as correct 2pq
  const swapQSq = round(p * p, 4);
  const distractor1 = `MM = ${swapPSq}, Mm = ${swapTwoPQ}, mm = ${swapQSq}`;

  // Distractor 2: use pq instead of 2pq (forget the 2)
  const wrongHet = round(p * q, 4);
  // Adjust homozygotes so they don't sum to 1 — the student error
  const distractor2 = `MM = ${pSq}, Mm = ${wrongHet}, mm = ${qSq}`;

  // Distractor 3: use p and q directly (no squaring)
  const distractor3 = `MM = ${p}, Mm = ${round(p * q, 4)}, mm = ${q}`;

  const options: PracticeOption[] = shuffle([
    {
      label: correctLabel,
      isCorrect: true,
      feedback: `Correct! With p(M) = ${p}: MM = p\u00B2 = ${pSq}, Mm = 2pq = ${twoPopQ}, mm = q\u00B2 = ${qSq}. These sum to 1.`,
    },
    {
      label: distractor1,
      isCorrect: false,
      feedback: `Not quite. You swapped p and q. If p(M) = ${p}, then p\u00B2 = ${pSq} is the frequency of MM (not mm). Remember: p\u00B2 corresponds to the allele you called p.`,
    },
    {
      label: distractor2,
      isCorrect: false,
      feedback: `Not quite. The heterozygote frequency is 2pq, not pq. There are two ways to form Mm (M from mom + m from dad, or m from mom + M from dad), so you must multiply by 2. The correct Mm frequency is ${twoPopQ}.`,
    },
    {
      label: distractor3,
      isCorrect: false,
      feedback: `Not quite. Genotype frequencies are p\u00B2, 2pq, and q\u00B2, not p, pq, and q. You need to square the allele frequencies to get homozygote frequencies and multiply by 2 for heterozygotes.`,
    },
  ], rng);

  return {
    id: `fhwe-${uid(rng)}`,
    type: 'forward-hwe',
    concept: 'hwe-prediction',
    difficulty: 1,
    prompt: `In a Mimulus guttatus population, the frequency of the anthocyanin allele M is p = ${p}. Assuming Hardy-Weinberg equilibrium, what are the expected genotype frequencies?`,
    hint: 'Remember: genotype frequencies under HWE are p\u00B2, 2pq, and q\u00B2, where q = 1 \u2212 p.',
    options,
    explanation: `Under HWE, genotype frequencies are: MM = p\u00B2 = ${p}\u00B2 = ${pSq}, Mm = 2pq = 2(${p})(${q}) = ${twoPopQ}, mm = q\u00B2 = ${q}\u00B2 = ${qSq}. The sum ${pSq} + ${twoPopQ} + ${qSq} = ${round(pSq + twoPopQ + qSq, 4)}.`,
  };
}

// ── 2. Backward HWE (chi-square test) ──────────────────────────────────
//
// Teaching goal: estimate p̂ from genotype counts and test HWE with chi-square.
//
// Canonical: chi-square goodness-of-fit with 1 df, critical value 3.841.
//
// Discovery beat: sometimes a population IS in HWE and sometimes it ISN'T.

const N_SAMPLE = 200;
const CHI_SQ_CRITICAL = 3.841;

/** Generate genotype counts. If `inHWE` is true, counts are drawn from
 *  HWE expectations with small perturbation. If false, excess homozygotes
 *  are injected to violate HWE. */
function makeGenotypeCounts(p: number, inHWE: boolean, rng: Rng): { MM: number; Mm: number; mm: number } {
  const q = 1 - p;
  if (inHWE) {
    // HWE expected + small noise
    const baseMM = Math.round(p * p * N_SAMPLE);
    const basemm = Math.round(q * q * N_SAMPLE);
    // Add small perturbation: +-0..3
    const noiseMM = Math.floor(rng() * 5) - 2;
    const noisemm = Math.floor(rng() * 5) - 2;
    const adjMM = Math.max(0, baseMM + noiseMM);
    const adjmm = Math.max(0, basemm + noisemm);
    const adjMm = Math.max(0, N_SAMPLE - adjMM - adjmm);
    return { MM: adjMM, Mm: adjMm, mm: adjmm };
  } else {
    // Excess homozygotes — move ~15-25% of heterozygotes to homozygotes
    const baseMM = Math.round(p * p * N_SAMPLE);
    const basemm = Math.round(q * q * N_SAMPLE);
    const baseMm = N_SAMPLE - baseMM - basemm;
    const shift = Math.round(baseMm * (0.3 + rng() * 0.2));
    const toMM = Math.round(shift * 0.5);
    const tomm = shift - toMM;
    return {
      MM: baseMM + toMM,
      Mm: Math.max(0, baseMm - shift),
      mm: basemm + tomm,
    };
  }
}

/** Compute chi-square for HWE from genotype counts. */
function computeHWEChiSq(counts: { MM: number; Mm: number; mm: number }): {
  pHat: number;
  chiSq: number;
  expMM: number;
  expMm: number;
  expmm: number;
} {
  const n = counts.MM + counts.Mm + counts.mm;
  const pHat = (2 * counts.MM + counts.Mm) / (2 * n);
  const qHat = 1 - pHat;
  const expMM = pHat * pHat * n;
  const expMm = 2 * pHat * qHat * n;
  const expmm = qHat * qHat * n;

  const chiSq =
    ((counts.MM - expMM) ** 2) / expMM +
    ((counts.Mm - expMm) ** 2) / expMm +
    ((counts.mm - expmm) ** 2) / expmm;

  return { pHat, chiSq, expMM, expMm, expmm };
}

function generateBackwardHWE(rng: Rng): PracticeProblem {
  const p = pick([0.3, 0.4, 0.5, 0.6, 0.7], rng);
  const inHWE = rng() < 0.5;
  const counts = makeGenotypeCounts(p, inHWE, rng);
  const { pHat, chiSq } = computeHWEChiSq(counts);
  const roundedP = round(pHat, 3);
  const roundedChi = round(chiSq, 2);
  const reject = chiSq > CHI_SQ_CRITICAL;

  const correctVerdict = reject
    ? `No, reject HWE. p\u0302 = ${roundedP}, \u03C7\u00B2 = ${roundedChi} > 3.841`
    : `Yes, fail to reject HWE. p\u0302 = ${roundedP}, \u03C7\u00B2 = ${roundedChi} < 3.841`;

  // Distractor: wrong p̂ (count alleles wrong — use only homozygotes)
  const wrongP = round(counts.MM / (counts.MM + counts.mm), 3);
  const distractor1 = reject
    ? `Yes, fail to reject HWE. p\u0302 = ${wrongP}, \u03C7\u00B2 = ${round(chiSq * 0.3, 2)} < 3.841`
    : `No, reject HWE. p\u0302 = ${wrongP}, \u03C7\u00B2 = ${round(chiSq * 3, 2)} > 3.841`;

  // Distractor: correct p̂ but wrong conclusion (flip reject/not)
  const distractor2 = reject
    ? `Yes, fail to reject HWE. p\u0302 = ${roundedP}, \u03C7\u00B2 = ${roundedChi} (not significant)`
    : `No, reject HWE. p\u0302 = ${roundedP}, \u03C7\u00B2 = ${roundedChi} (significant)`;

  // Distractor: use genotype frequencies as allele frequencies
  const n = counts.MM + counts.Mm + counts.mm;
  const wrongP2 = round(counts.MM / n, 3);
  const distractor3 = `Yes, fail to reject HWE. p\u0302 = ${wrongP2}, \u03C7\u00B2 = ${round(rng() * 2, 2)} < 3.841`;

  const options: PracticeOption[] = shuffle([
    {
      label: correctVerdict,
      isCorrect: true,
      feedback: `Correct! p\u0302 = (2\u00B7${counts.MM} + ${counts.Mm}) / (2\u00B7${n}) = ${roundedP}. The chi-square statistic is ${roundedChi}, which is ${reject ? 'greater than' : 'less than'} the critical value of 3.841 (1 df, \u03B1 = 0.05), so we ${reject ? 'reject' : 'fail to reject'} HWE.`,
    },
    {
      label: distractor1,
      isCorrect: false,
      feedback: `Not quite. To estimate p, count ALL M alleles: p\u0302 = (2\u00B7MM + Mm) / (2N), not just from homozygotes. Every MM individual contributes 2 M alleles and every Mm contributes 1.`,
    },
    {
      label: distractor2,
      isCorrect: false,
      feedback: `Your p\u0302 is correct (${roundedP}), but the conclusion is wrong. \u03C7\u00B2 = ${roundedChi} is ${reject ? '>' : '<'} 3.841, so we ${reject ? 'reject' : 'fail to reject'} HWE at \u03B1 = 0.05.`,
    },
    {
      label: distractor3,
      isCorrect: false,
      feedback: `Not quite. You used the genotype frequency (MM/N = ${wrongP2}) as the allele frequency. The allele frequency counts each allele: p\u0302 = (2\u00B7MM + Mm) / (2N) = ${roundedP}.`,
    },
  ], rng);

  return {
    id: `bhwe-${uid(rng)}`,
    type: 'backward-hwe',
    concept: 'hwe-testing',
    difficulty: 2,
    prompt: `A sample of ${n} Mimulus guttatus plants is genotyped at the anthocyanin locus: MM = ${counts.MM}, Mm = ${counts.Mm}, mm = ${counts.mm}. Estimate the allele frequency p\u0302(M) and test whether this population is in Hardy-Weinberg equilibrium (\u03B1 = 0.05, critical \u03C7\u00B2 = 3.841, df = 1).`,
    hint: 'First compute p\u0302 = (2\u00B7MM + Mm) / (2N). Then compute expected counts under HWE, then \u03C7\u00B2 = \u03A3 (O\u2212E)\u00B2/E.',
    options,
    explanation: `p\u0302 = (2\u00B7${counts.MM} + ${counts.Mm}) / (2\u00B7${n}) = ${roundedP}. Expected under HWE: MM = p\u00B2N, Mm = 2pqN, mm = q\u00B2N. \u03C7\u00B2 = ${roundedChi}. Critical value at 1 df, \u03B1=0.05 is 3.841. Since ${roundedChi} ${reject ? '>' : '<'} 3.841, we ${reject ? 'reject' : 'fail to reject'} HWE.`,
  };
}

// ── 3. Drift scale (visual) ────────────────────────────────────────────
//
// Teaching goal: smaller populations show more drift (wider trajectory spread).
//
// Canonical: Var(p̂) ~ p(1-p)/(2N).
//
// Discovery beat: the student compares two sets of trajectories visually.

/** Simple Wright-Fisher trajectory simulation for drift visualization. */
function simulateWFTrajectory(N: number, p0: number, generations: number, rng: Rng): number[] {
  const traj = [p0];
  let p = p0;
  for (let g = 1; g <= generations; g++) {
    // Binomial approximation: count successes in 2N trials
    let successes = 0;
    const twoN = 2 * N;
    for (let i = 0; i < twoN; i++) {
      if (rng() < p) successes++;
    }
    p = successes / twoN;
    traj.push(p);
    if (p === 0 || p === 1) {
      // Fill rest with fixed value
      while (traj.length <= generations) traj.push(p);
      break;
    }
  }
  return traj;
}

/** Render trajectories as a tiny inline SVG string for the problem label. */
function trajectorySVG(trajectories: number[][], label: string): string {
  // We encode as text description since PracticeOption labels are strings.
  // The UI renders this as text; a future enhancement could render actual SVGs.
  const finalPs = trajectories.map(t => round(t[t.length - 1], 2));
  const spread = round(Math.max(...finalPs) - Math.min(...finalPs), 2);
  return `${label}: final p range = [${Math.min(...finalPs).toFixed(2)}\u2013${Math.max(...finalPs).toFixed(2)}], spread = ${spread}`;
}

function generateDriftScale(rng: Rng): PracticeProblem {
  const p0 = 0.5;
  const gens = 20;
  const nTrajs = 5;

  // Two population sizes
  const sizes = rng() < 0.5
    ? { small: 20, large: 500 }
    : { small: 25, large: 200 };

  const smallTrajs = Array.from({ length: nTrajs }, () =>
    simulateWFTrajectory(sizes.small, p0, gens, rng)
  );
  const largeTrajs = Array.from({ length: nTrajs }, () =>
    simulateWFTrajectory(sizes.large, p0, gens, rng)
  );

  // Describe what the student sees
  const smallDesc = trajectorySVG(smallTrajs, 'Population A');
  const largeDesc = trajectorySVG(largeTrajs, 'Population B');

  // Randomize which is presented as A vs B
  const aIsSmall = rng() < 0.5;
  const popADesc = aIsSmall ? smallDesc : largeDesc;
  const popBDesc = aIsSmall ? largeDesc : smallDesc;
  const popASize = aIsSmall ? sizes.small : sizes.large;
  const popBSize = aIsSmall ? sizes.large : sizes.small;
  const smallerLabel = aIsSmall ? 'Population A' : 'Population B';

  const options: PracticeOption[] = shuffle([
    {
      label: `Population A is smaller (N = ${popASize < popBSize ? popASize : popBSize})`,
      isCorrect: aIsSmall,
      feedback: aIsSmall
        ? `Correct! Population A shows much wider fluctuations in allele frequency, indicating a smaller population. Drift variance scales as p(1\u2212p)/(2N) \u2014 smaller N means more variance.`
        : `Not quite. Population A's trajectories are more tightly clustered, indicating a larger population with less drift. The wider-spreading trajectories belong to the smaller population.`,
    },
    {
      label: `Population B is smaller (N = ${popBSize < popASize ? popBSize : popASize})`,
      isCorrect: !aIsSmall,
      feedback: !aIsSmall
        ? `Correct! Population B shows much wider fluctuations in allele frequency, indicating a smaller population. Drift variance scales as p(1\u2212p)/(2N) \u2014 smaller N means more variance.`
        : `Not quite. Population B's trajectories are more tightly clustered, indicating a larger population with less drift. The wider-spreading trajectories belong to the smaller population.`,
    },
    {
      label: 'Both populations are the same size',
      isCorrect: false,
      feedback: `Not quite. The two sets of trajectories show very different amounts of spread. More spread = more drift = smaller population. Drift variance is proportional to 1/(2N).`,
    },
    {
      label: 'Cannot determine population size from allele frequency trajectories',
      isCorrect: false,
      feedback: `Actually, you can! The amount of random fluctuation in allele frequency directly reflects population size. Drift variance = p(1\u2212p)/(2N), so larger fluctuations indicate smaller N.`,
    },
  ], rng);

  return {
    id: `drift-${uid(rng)}`,
    type: 'drift-scale',
    concept: 'drift-variance',
    difficulty: 1,
    prompt: `Two Mimulus guttatus populations (A and B) both start at p(M) = ${p0}. After ${gens} generations, here are 5 replicate allele-frequency trajectories for each:\n\n${popADesc}\n${popBDesc}\n\nWhich population is smaller?`,
    hint: 'Genetic drift is stronger in smaller populations. Look at how much the trajectories spread out from the starting frequency.',
    options,
    explanation: `${smallerLabel} is the smaller population (N = ${Math.min(sizes.small, sizes.large)}). Genetic drift causes more random fluctuation in smaller populations because drift variance = p(1\u2212p)/(2N). The trajectories with wider spread come from the smaller population.`,
  };
}

// ── 4. Selection Δp ────────────────────────────────────────────────────
//
// Teaching goal: compute the change in allele frequency under selection
// against a recessive homozygote.
//
// Canonical: Δp = spq²/(1−sq²) for selection against rr (fitness 1-s).
//
// Discovery beat: student works out the formula with specific numbers.

const SEL_P_VALUES = [0.1, 0.15, 0.2, 0.3, 0.4] as const;
const SEL_S_VALUES = [0.05, 0.1, 0.2, 0.3] as const;

function generateSelectionDeltaP(rng: Rng): PracticeProblem {
  const p = pick(SEL_P_VALUES, rng);
  const s = pick(SEL_S_VALUES, rng);
  const q = round(1 - p, 2);

  // Correct: Δp = spq² / (1 - sq²)
  const qSq = q * q;
  const deltaP = round((s * p * qSq) / (1 - s * qSq), 5);

  // Distractor 1: forget denominator (Δp ≈ spq²)
  const wrong1 = round(s * p * qSq, 5);

  // Distractor 2: use pq instead of pq² (common confusion)
  const wrong2 = round((s * p * q) / (1 - s * q), 5);

  // Distractor 3: use sp instead of spq²
  const wrong3 = round((s * p) / (1 - s * qSq), 5);

  const options: PracticeOption[] = shuffle([
    {
      label: `\u0394p = ${deltaP}`,
      isCorrect: true,
      feedback: `Correct! \u0394p = spq\u00B2/(1\u2212sq\u00B2) = (${s})(${p})(${q})\u00B2 / (1 \u2212 (${s})(${q})\u00B2) = ${deltaP}. Selection against the susceptible ss homozygote increases the frequency of R by this amount each generation.`,
    },
    {
      label: `\u0394p = ${wrong1}`,
      isCorrect: false,
      feedback: `Not quite. You computed spq\u00B2 = ${wrong1} but forgot the denominator. The correct formula is \u0394p = spq\u00B2/(1\u2212sq\u00B2). The denominator (1\u2212sq\u00B2) accounts for the reduced mean fitness of the population.`,
    },
    {
      label: `\u0394p = ${wrong2}`,
      isCorrect: false,
      feedback: `Not quite. You used pq instead of pq\u00B2. Selection acts against the recessive homozygote (frequency q\u00B2), not against all carriers of the recessive allele (frequency q). The correct term is spq\u00B2/(1\u2212sq\u00B2).`,
    },
    {
      label: `\u0394p = ${wrong3}`,
      isCorrect: false,
      feedback: `Not quite. You used sp in the numerator instead of spq\u00B2. The change in p depends on both allele frequencies: \u0394p = spq\u00B2/(1\u2212sq\u00B2). The q\u00B2 term represents the frequency of the selected-against genotype (ss).`,
    },
  ], rng);

  return {
    id: `sel-${uid(rng)}`,
    type: 'selection-delta-p',
    concept: 'selection-recurrence',
    difficulty: 2,
    prompt: `In an Amaranthus palmeri population, the frequency of the glyphosate-resistance allele R is p = ${p} (so q(s) = ${q}). Glyphosate application imposes selection coefficient s = ${s} against susceptible homozygotes (ss, fitness = ${round(1 - s, 2)}). What is \u0394p for one generation?`,
    hint: 'For selection against a recessive homozygote: \u0394p = spq\u00B2 / (1 \u2212 sq\u00B2).',
    options,
    explanation: `\u0394p = spq\u00B2/(1\u2212sq\u00B2) = (${s})(${p})(${q})\u00B2 / (1 \u2212 (${s})(${q})\u00B2) = (${s})(${p})(${round(qSq, 4)}) / (1 \u2212 (${s})(${round(qSq, 4)})) = ${round(s * p * qSq, 5)} / ${round(1 - s * qSq, 5)} = ${deltaP}. The R allele increases in frequency because ss homozygotes have lower fitness.`,
  };
}

// ── 5. Migration convergence ───────────────────────────────────────────
//
// Teaching goal: under symmetric migration, two populations converge to
// the average of their starting frequencies.
//
// Canonical: equilibrium = (p₁ + p₂) / 2 for equal-size populations
// with symmetric migration.
//
// Discovery beat: student predicts the convergence point.

const MIG_PAIRS: ReadonlyArray<[number, number]> = [
  [0.1, 0.9],
  [0.2, 0.8],
  [0.3, 0.7],
  [0.15, 0.85],
  [0.25, 0.75],
];

function generateMigrationConvergence(rng: Rng): PracticeProblem {
  const [p1, p2] = pick(MIG_PAIRS, rng);
  const equilibrium = round((p1 + p2) / 2, 3);

  const options: PracticeOption[] = shuffle([
    {
      label: `p = ${equilibrium} (the average of both starting frequencies)`,
      isCorrect: true,
      feedback: `Correct! With symmetric migration between equal-size populations, allele frequencies converge to their arithmetic mean: (${p1} + ${p2}) / 2 = ${equilibrium}. Gene flow homogenizes connected populations.`,
    },
    {
      label: `p = ${p1} (Population 1 dominates)`,
      isCorrect: false,
      feedback: `Not quite. With symmetric migration (equal rates both directions between equal-size populations), neither population dominates. Both converge to the average: (${p1} + ${p2}) / 2 = ${equilibrium}.`,
    },
    {
      label: `p = ${p2} (Population 2 dominates)`,
      isCorrect: false,
      feedback: `Not quite. With symmetric migration, neither population's starting frequency "wins." Both converge to the average: (${p1} + ${p2}) / 2 = ${equilibrium}.`,
    },
    {
      label: 'They never converge to a common frequency',
      isCorrect: false,
      feedback: `Actually, they do converge. With any nonzero migration rate, gene flow gradually homogenizes allele frequencies. The equilibrium for symmetric migration between equal populations is the average of the starting frequencies: ${equilibrium}.`,
    },
  ], rng);

  return {
    id: `mig-${uid(rng)}`,
    type: 'migration-convergence',
    concept: 'migration-equilibrium',
    difficulty: 1,
    prompt: `Two equal-size Mimulus guttatus populations are connected by symmetric pollen flow (equal migration rate in both directions). Population 1 (serpentine site) starts at p(M) = ${p1}, Population 2 (non-serpentine meadow) starts at p(M) = ${p2}. What common allele frequency will they eventually converge to?`,
    hint: 'With symmetric migration between equal-size populations, the equilibrium is the arithmetic mean of the starting frequencies.',
    options,
    explanation: `Under symmetric migration between two equal-size populations, the equilibrium allele frequency is the simple average: p\u0302 = (p\u2081 + p\u2082) / 2 = (${p1} + ${p2}) / 2 = ${equilibrium}. Higher migration rates reach this equilibrium faster, but the endpoint is the same.`,
  };
}

// ── Public API ──────────────────────────────────────────────────────────

const GENERATORS: Record<PopGenConcept, (rng: Rng) => PracticeProblem> = {
  'hwe-prediction': generateForwardHWE,
  'hwe-testing': generateBackwardHWE,
  'drift-variance': generateDriftScale,
  'selection-recurrence': generateSelectionDeltaP,
  'migration-equilibrium': generateMigrationConvergence,
};

export function popgenGenerateProblemForConcept(
  concept: string,
  rng: () => number,
): PracticeProblem {
  const gen = GENERATORS[concept as PopGenConcept];
  if (!gen) {
    // Fallback: pick a random concept
    const keys = Object.keys(GENERATORS) as PopGenConcept[];
    const fallback = keys[Math.floor(rng() * keys.length)];
    return GENERATORS[fallback](rng);
  }
  return gen(rng);
}

export function popgenGenerateRandomProblem(rng: () => number): PracticeProblem {
  const concept = pick(POPGEN_ALL_CONCEPTS, rng);
  return popgenGenerateProblemForConcept(concept, rng);
}
