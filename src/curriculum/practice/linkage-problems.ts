/**
 * Practice Mode problem generators -- Linkage & Recombination curriculum.
 *
 * Five problem types mapping to five core linkage concepts:
 *  1. Forward linkage ratio: given map distance, predict testcross ratio
 *  2. Backward RF from counts: given testcross counts, compute RF%
 *  3. Linked vs unlinked: decide if testcross data shows linkage
 *  4. Noise recognition: distinguish sampling variation from real deviation
 *  5. Forward RF to ratio: given RF%, predict four testcross class frequencies
 *
 * All problems use maize C/c Sh/sh kernel phenotypes:
 *  - C (colored/Purple aleurone) dominant over c (colorless/Yellow)
 *  - Sh (plump/full kernel) dominant over sh (shrunken)
 *
 * Testcross: heterozygous F1 (C Sh / c sh in coupling) x homozygous
 * recessive (c sh / c sh). Parental classes = Purple Plump + Yellow Shrunken;
 * recombinant classes = Purple Shrunken + Yellow Plump.
 *
 * Canonical map distance for C-Sh on maize chr 9: ~17 cM (Creighton &
 * McClintock 1931). Problems use a variety of RF values for practice.
 *
 * Distractors reflect real student misconceptions. No option is annotated
 * with correctness info -- the `isCorrect` flag drives feedback alone.
 */

import type { PracticeProblem, PracticeOption } from './problems';

// -- Public types -----------------------------------------------------------

export type LinkageProblemType =
  | 'forward-linkage-ratio'
  | 'backward-rf-from-counts'
  | 'linked-vs-unlinked'
  | 'noise-recognition'
  | 'forward-rf-to-ratio';

export type LinkageConcept =
  | 'linkage-ratio'
  | 'rf-calculation'
  | 'linkage-testing'
  | 'sampling-variation'
  | 'rf-to-phenotype';

// -- Concept metadata -------------------------------------------------------

export const LINKAGE_ALL_CONCEPTS: readonly LinkageConcept[] = [
  'linkage-ratio',
  'rf-calculation',
  'linkage-testing',
  'sampling-variation',
  'rf-to-phenotype',
];

export const LINKAGE_CONCEPT_LABELS: Record<LinkageConcept, string> = {
  'linkage-ratio': 'Linkage ratio prediction',
  'rf-calculation': 'RF% calculation',
  'linkage-testing': 'Linked vs independent',
  'sampling-variation': 'Sampling variation',
  'rf-to-phenotype': 'RF to phenotype frequencies',
};

export const LINKAGE_CONCEPT_TO_TYPE: Record<LinkageConcept, LinkageProblemType> = {
  'linkage-ratio': 'forward-linkage-ratio',
  'rf-calculation': 'backward-rf-from-counts',
  'linkage-testing': 'linked-vs-unlinked',
  'sampling-variation': 'noise-recognition',
  'rf-to-phenotype': 'forward-rf-to-ratio',
};

// -- RNG helpers ------------------------------------------------------------

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

// -- 1. Forward linkage ratio -----------------------------------------------
//
// Teaching goal: given a map distance (RF in cM), predict the approximate
// testcross phenotype ratio.
//
// Canonical: for a testcross of a coupling heterozygote, the four classes
// are (1-RF)/2 parental1 : RF/2 recomb1 : RF/2 recomb2 : (1-RF)/2 parental2.
// At RF = 0.10, that's 45:5:5:45 or simplified 9:1:1:9.
//
// Discovery beat: the student connects map distance to expected offspring
// proportions, not just memorizes a ratio table.

const FORWARD_RF_VALUES = [0.05, 0.10, 0.15, 0.20, 0.25] as const;

/** Convert RF to a simplified ratio string "a:b:b:a" for display. */
function rfToSimplifiedRatio(rf: number): string {
  // Express as counts out of 100 offspring
  const parental = round((1 - rf) / 2 * 100, 0);
  const recomb = round(rf / 2 * 100, 0);
  // Find GCD for simplification
  const g = gcd(parental, recomb);
  const p = parental / g;
  const r = recomb / g;
  return `${p}:${r}:${r}:${p}`;
}

function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) { [a, b] = [b, a % b]; }
  return a;
}

function generateForwardLinkageRatio(rng: Rng): PracticeProblem {
  const rf = pick(FORWARD_RF_VALUES, rng);
  const rfPct = round(rf * 100, 0);
  const correctRatio = rfToSimplifiedRatio(rf);

  // Build distractors from other RF values + the independent (1:1:1:1) ratio
  const otherRFs = FORWARD_RF_VALUES.filter(r => r !== rf);
  const distRatios = otherRFs.map(r => rfToSimplifiedRatio(r));
  // Always include 1:1:1:1 (independent assortment) as a distractor
  const distractorSet = new Set(distRatios);
  distractorSet.add('1:1:1:1');
  distractorSet.delete(correctRatio);
  const distractors = shuffle([...distractorSet], rng).slice(0, 3);

  const options: PracticeOption[] = shuffle([
    {
      label: correctRatio,
      isCorrect: true,
      feedback: `Correct! At RF = ${rfPct}%, each parental class is (1 \u2212 ${rf})/2 = ${round((1 - rf) / 2, 3)} and each recombinant class is ${rf}/2 = ${round(rf / 2, 3)}, giving the ratio ${correctRatio} (Purple Plump : Purple Shrunken : Yellow Plump : Yellow Shrunken).`,
    },
    ...distractors.map(d => ({
      label: d,
      isCorrect: false,
      feedback: d === '1:1:1:1'
        ? `Not quite. A 1:1:1:1 ratio would mean the genes assort independently (RF = 50%). With RF = ${rfPct}%, the genes are linked and parental classes greatly outnumber recombinants. The correct ratio is ${correctRatio}.`
        : `Not quite. That ratio corresponds to a different map distance. With RF = ${rfPct}%, parental classes each make up (1 \u2212 ${rf})/2 = ${round((1 - rf) / 2, 3)} and recombinant classes each make up ${rf}/2 = ${round(rf / 2, 3)}. The correct ratio is ${correctRatio}.`,
    })),
  ], rng);

  return {
    id: `flr-${uid(rng)}`,
    type: 'forward-linkage-ratio',
    concept: 'linkage-ratio',
    difficulty: 1,
    prompt: `The C (kernel color) and Sh (kernel shape) genes on maize chromosome 9 are ${rfPct} cM apart. You testcross a coupling heterozygote (C Sh / c sh) with a homozygous recessive (c sh / c sh). What is the expected phenotype ratio? (Purple Plump : Purple Shrunken : Yellow Plump : Yellow Shrunken)`,
    hint: 'In a testcross, each parental class frequency = (1 \u2212 RF)/2 and each recombinant class = RF/2.',
    options,
    explanation: `At RF = ${rf} (${rfPct} cM), the testcross produces parental classes at frequency (1 \u2212 ${rf})/2 = ${round((1 - rf) / 2, 3)} each and recombinant classes at ${rf}/2 = ${round(rf / 2, 3)} each. Simplified ratio: ${correctRatio}. Parental classes (Purple Plump and Yellow Shrunken) predominate because the C and Sh alleles are in coupling on the same chromosome.`,
  };
}

// -- 2. Backward RF from counts ---------------------------------------------
//
// Teaching goal: given raw testcross offspring counts, compute RF%.
//
// Canonical: RF = (recombinants) / (total offspring).
//
// Discovery beat: the student identifies which classes are recombinant and
// divides by total. The counts include realistic sampling noise.

/** RF values to sample from, plus a total N for generating counts. */
const BACKWARD_RF_TARGETS = [0.08, 0.12, 0.17, 0.22, 0.30] as const;
const BACKWARD_N_VALUES = [400, 500, 600] as const;

function generateBackwardRFFromCounts(rng: Rng): PracticeProblem {
  const targetRF = pick(BACKWARD_RF_TARGETS, rng);
  const n = pick(BACKWARD_N_VALUES, rng);

  // Generate counts with sampling noise around the target RF
  const expectedRecomb = targetRF * n;
  const expectedParental = (1 - targetRF) * n;

  // Add Poisson-like noise
  const noise = () => Math.floor(rng() * 7) - 3;
  const purplePlump = Math.round(expectedParental / 2) + noise();
  const yellowShrunken = Math.round(expectedParental / 2) + noise();
  const purpleShrunken = Math.round(expectedRecomb / 2) + noise();
  const yellowPlump = Math.round(expectedRecomb / 2) + noise();

  // Adjust to hit exact total
  const total = purplePlump + yellowShrunken + purpleShrunken + yellowPlump;
  const actualRecomb = purpleShrunken + yellowPlump;
  const actualRF = round((actualRecomb / total) * 100, 1);
  const targetRFPct = round(targetRF * 100, 1);

  // Correct answer: the sampled RF
  const correctLabel = `RF = ${actualRF}%`;

  // Distractor 1: divide by 2N instead of N (common error)
  const wrong1 = round((actualRecomb / (total * 2)) * 100, 1);

  // Distractor 2: use parental counts as recombinant (swap confusion)
  const wrongRecomb = purplePlump + yellowShrunken;
  const wrong2 = round((wrongRecomb / total) * 100, 1);

  // Distractor 3: divide recombinants by parentals instead of total
  const wrong3 = round((actualRecomb / (total - actualRecomb)) * 100, 1);

  const options: PracticeOption[] = shuffle([
    {
      label: correctLabel,
      isCorrect: true,
      feedback: `Correct! Recombinant classes are Purple Shrunken (${purpleShrunken}) and Yellow Plump (${yellowPlump}) = ${actualRecomb} total recombinants. RF = ${actualRecomb}/${total} = ${actualRF}%. The textbook value for C\u2013Sh is ~${targetRFPct}% (${targetRFPct} cM).`,
    },
    {
      label: `RF = ${wrong1}%`,
      isCorrect: false,
      feedback: `Not quite. You divided recombinants by 2N instead of N. RF = recombinants / total offspring = ${actualRecomb}/${total} = ${actualRF}%. Don't double the denominator.`,
    },
    {
      label: `RF = ${wrong2}%`,
      isCorrect: false,
      feedback: `Not quite. You used the parental classes as recombinants. In a coupling testcross, Purple Shrunken and Yellow Plump are the recombinant classes (new allele combinations). RF = (${purpleShrunken} + ${yellowPlump})/${total} = ${actualRF}%.`,
    },
    {
      label: `RF = ${wrong3}%`,
      isCorrect: false,
      feedback: `Not quite. RF is recombinants divided by total offspring, not recombinants divided by parentals. RF = ${actualRecomb}/${total} = ${actualRF}%.`,
    },
  ], rng);

  return {
    id: `brf-${uid(rng)}`,
    type: 'backward-rf-from-counts',
    concept: 'rf-calculation',
    difficulty: 2,
    prompt: `A testcross of a maize C Sh / c sh heterozygote produces:\n\nPurple Plump: ${purplePlump}\nYellow Shrunken: ${yellowShrunken}\nPurple Shrunken: ${purpleShrunken}\nYellow Plump: ${yellowPlump}\n\nWhat is the recombination frequency (RF%)?`,
    hint: 'RF = (number of recombinant offspring) / (total offspring). First identify which classes are recombinant (new allele combinations not present in the parents).',
    options,
    explanation: `In a coupling heterozygote (C Sh / c sh), parental classes are Purple Plump (C Sh) and Yellow Shrunken (c sh). Recombinant classes are Purple Shrunken (C sh) and Yellow Plump (c Sh). RF = (${purpleShrunken} + ${yellowPlump}) / ${total} = ${actualRecomb}/${total} = ${actualRF}%.`,
  };
}

// -- 3. Linked vs unlinked --------------------------------------------------
//
// Teaching goal: given testcross data, decide whether genes are linked or
// independently assorting.
//
// Canonical: independent assortment produces 1:1:1:1; linkage produces a
// parental excess.
//
// Discovery beat: the student must look at the data and judge whether the
// deviation from 1:1:1:1 is large enough to indicate linkage.

function generateLinkedVsUnlinked(rng: Rng): PracticeProblem {
  const n = pick([200, 300, 400] as const, rng);
  const isLinked = rng() < 0.5;

  let purplePlump: number;
  let yellowShrunken: number;
  let purpleShrunken: number;
  let yellowPlump: number;

  if (isLinked) {
    // Linked: RF between 5-25%, strong parental excess
    const rf = 0.05 + rng() * 0.20;
    const parentalEach = Math.round(((1 - rf) / 2) * n);
    const recombEach = Math.round((rf / 2) * n);
    const noise = () => Math.floor(rng() * 5) - 2;
    purplePlump = parentalEach + noise();
    yellowShrunken = parentalEach + noise();
    purpleShrunken = recombEach + noise();
    yellowPlump = recombEach + noise();
  } else {
    // Independent: near 1:1:1:1
    const each = Math.round(n / 4);
    const noise = () => Math.floor(rng() * 7) - 3;
    purplePlump = each + noise();
    yellowShrunken = each + noise();
    purpleShrunken = each + noise();
    yellowPlump = each + noise();
  }

  const total = purplePlump + yellowShrunken + purpleShrunken + yellowPlump;
  const recombCount = purpleShrunken + yellowPlump;
  const obsRF = round((recombCount / total) * 100, 1);

  // Compute chi-square against 1:1:1:1
  const exp = total / 4;
  const chiSq = round(
    ((purplePlump - exp) ** 2) / exp +
    ((yellowShrunken - exp) ** 2) / exp +
    ((purpleShrunken - exp) ** 2) / exp +
    ((yellowPlump - exp) ** 2) / exp,
    2,
  );
  // 3 df, alpha=0.05 critical value = 7.815
  const CHI_CRITICAL = 7.815;

  const correctLabel = isLinked
    ? `Genes are linked (RF = ${obsRF}%, significantly different from 50%)`
    : `Genes assort independently (consistent with 1:1:1:1)`;

  const wrongLabel = isLinked
    ? `Genes assort independently (consistent with 1:1:1:1)`
    : `Genes are linked (RF = ${obsRF}%, significantly different from 50%)`;

  const options: PracticeOption[] = shuffle([
    {
      label: correctLabel,
      isCorrect: true,
      feedback: isLinked
        ? `Correct! The parental classes (${purplePlump} + ${yellowShrunken}) greatly outnumber recombinant classes (${purpleShrunken} + ${yellowPlump}). RF = ${obsRF}%, far from the 50% expected under independent assortment. \u03C7\u00B2 = ${chiSq} (df = 3, critical = ${CHI_CRITICAL}).`
        : `Correct! All four classes are near ${round(exp, 0)} (expected under 1:1:1:1). RF \u2248 ${obsRF}%, close to the 50% expected for independent assortment. \u03C7\u00B2 = ${chiSq} < ${CHI_CRITICAL} (df = 3), so we fail to reject the null.`,
    },
    {
      label: wrongLabel,
      isCorrect: false,
      feedback: isLinked
        ? `Not quite. Look at the counts more carefully: parental classes (${purplePlump} + ${yellowShrunken} = ${purplePlump + yellowShrunken}) far outnumber recombinant classes (${purpleShrunken} + ${yellowPlump} = ${recombCount}). This large parental excess indicates linkage, with RF = ${obsRF}%.`
        : `Not quite. The four classes are all close to ${round(exp, 0)}, which is what you expect under 1:1:1:1 independent assortment. RF \u2248 ${obsRF}%, near the 50% expected when genes are on different chromosomes. \u03C7\u00B2 = ${chiSq} < ${CHI_CRITICAL}.`,
    },
    {
      label: 'Cannot determine from these data',
      isCorrect: false,
      feedback: `Actually, you can. Compare the observed ratio to the expected 1:1:1:1. If parental classes greatly outnumber recombinants (RF << 50%), the genes are linked. If all four classes are roughly equal (RF \u2248 50%), the genes assort independently.`,
    },
    {
      label: 'Need to test the reciprocal cross first',
      isCorrect: false,
      feedback: `A single testcross is sufficient to detect linkage. If the four offspring classes deviate significantly from 1:1:1:1, the genes are linked. A reciprocal cross can distinguish coupling from repulsion but isn't needed to detect linkage itself.`,
    },
  ], rng);

  return {
    id: `lvu-${uid(rng)}`,
    type: 'linked-vs-unlinked',
    concept: 'linkage-testing',
    difficulty: 1,
    prompt: `A testcross of a maize dihybrid (C/c Sh/sh) produces:\n\nPurple Plump: ${purplePlump}\nYellow Shrunken: ${yellowShrunken}\nPurple Shrunken: ${purpleShrunken}\nYellow Plump: ${yellowPlump}\n\nAre these genes linked or do they assort independently?`,
    hint: 'Under independent assortment, all four testcross classes should be roughly equal (1:1:1:1). Linkage produces a large parental excess.',
    options,
    explanation: isLinked
      ? `The parental classes (Purple Plump + Yellow Shrunken = ${purplePlump + yellowShrunken}) greatly outnumber recombinant classes (Purple Shrunken + Yellow Plump = ${recombCount}). RF = ${obsRF}% << 50%, indicating linkage. \u03C7\u00B2 against 1:1:1:1 = ${chiSq} > ${CHI_CRITICAL} (df = 3, \u03B1 = 0.05), so we reject independent assortment.`
      : `All four classes are near the expected ${round(exp, 0)} under 1:1:1:1. RF \u2248 ${obsRF}%, close to 50%. \u03C7\u00B2 = ${chiSq} < ${CHI_CRITICAL} (df = 3, \u03B1 = 0.05), so we fail to reject independent assortment. These genes are on different chromosomes (or far apart on the same chromosome).`,
  };
}

// -- 4. Noise recognition ---------------------------------------------------
//
// Teaching goal: distinguish sampling variation from a genuinely different
// map distance. Use SE = sqrt(p(1-p)/n) to judge.
//
// Canonical: a sample RF of 13/40 = 32.5% from a cross where the true
// distance is 17 cM. Is this consistent, or does it indicate a different
// distance?
//
// Discovery beat: the student evaluates whether observed RF is within the
// expected sampling error of the textbook value.

const NOISE_TRUE_RFS = [0.10, 0.17, 0.22, 0.30] as const;

function generateNoiseRecognition(rng: Rng): PracticeProblem {
  const trueRF = pick(NOISE_TRUE_RFS, rng);
  const trueRFPct = round(trueRF * 100, 1);

  // Small sample size to create noticeable sampling noise
  const n = pick([40, 50, 60, 80] as const, rng);
  const se = Math.sqrt((trueRF * (1 - trueRF)) / n);

  // Decide: consistent (within ~1.5 SE) or inconsistent (>3 SE away)
  const isConsistent = rng() < 0.5;

  let observedRecomb: number;
  if (isConsistent) {
    // Within ~1.5 SE: noisy but plausible
    const deviation = (rng() * 1.2) * se; // 0 to 1.2 SE
    const sign = rng() < 0.5 ? 1 : -1;
    observedRecomb = Math.round((trueRF + sign * deviation) * n);
    observedRecomb = Math.max(0, Math.min(n, observedRecomb));
  } else {
    // More than 3 SE away: genuinely different
    const deviation = (3 + rng() * 3) * se; // 3 to 6 SE
    const sign = rng() < 0.5 ? 1 : -1;
    observedRecomb = Math.round((trueRF + sign * deviation) * n);
    observedRecomb = Math.max(0, Math.min(n, observedRecomb));
    // Ensure it's actually far enough away
    const actualDev = Math.abs(observedRecomb / n - trueRF);
    if (actualDev < 2.5 * se) {
      // Force it further
      observedRecomb = Math.round((trueRF + (rng() < 0.5 ? 4 : -4) * se) * n);
      observedRecomb = Math.max(0, Math.min(n, observedRecomb));
    }
  }

  const obsRF = round((observedRecomb / n) * 100, 1);
  const sePct = round(se * 100, 1);
  const zScore = round(Math.abs(observedRecomb / n - trueRF) / se, 1);

  const correctLabel = isConsistent
    ? `Consistent with ${trueRFPct} cM (sampling variation)`
    : `Probably a different map distance (not consistent with ${trueRFPct} cM)`;

  const wrongLabel = isConsistent
    ? `Probably a different map distance (not consistent with ${trueRFPct} cM)`
    : `Consistent with ${trueRFPct} cM (sampling variation)`;

  const options: PracticeOption[] = shuffle([
    {
      label: correctLabel,
      isCorrect: true,
      feedback: isConsistent
        ? `Correct! SE = \u221A(p(1\u2212p)/n) = \u221A(${trueRF}\u00D7${round(1 - trueRF, 2)}/${n}) \u2248 ${sePct}%. The observed ${obsRF}% is only ${zScore} SE from ${trueRFPct}%, well within normal sampling fluctuation.`
        : `Correct! SE \u2248 ${sePct}%. The observed ${obsRF}% is ${zScore} SE from ${trueRFPct}% \u2014 too far to attribute to sampling noise alone. This likely reflects a genuinely different recombination rate.`,
    },
    {
      label: wrongLabel,
      isCorrect: false,
      feedback: isConsistent
        ? `Not quite. With n = ${n}, SE \u2248 ${sePct}%. The observed ${obsRF}% is only ${zScore} SE from ${trueRFPct}%. Small samples are noisy \u2014 this deviation is expected by chance.`
        : `Not quite. With n = ${n}, SE \u2248 ${sePct}%. The observed ${obsRF}% is ${zScore} SE from ${trueRFPct}%. That's too large a deviation to attribute to sampling noise \u2014 something else is likely going on.`,
    },
    {
      label: 'Need a larger sample to tell',
      isCorrect: false,
      feedback: `While a larger sample would narrow the confidence interval, we can still evaluate the current data. With n = ${n}, SE \u2248 ${sePct}%. The observed RF of ${obsRF}% is ${zScore} SE from the target of ${trueRFPct}%. ${isConsistent ? 'That is within normal sampling variation.' : 'That is a statistically significant deviation.'}`,
    },
    {
      label: 'The sample RF is the true distance regardless of the textbook value',
      isCorrect: false,
      feedback: `Not quite. A single small sample is a noisy estimate of the true recombination frequency. With n = ${n}, SE \u2248 ${sePct}%, so the true RF could easily differ from the observed ${obsRF}% by several percentage points. You need to compare the sample to the expected value and evaluate whether the deviation is within sampling error.`,
    },
  ], rng);

  return {
    id: `nr-${uid(rng)}`,
    type: 'noise-recognition',
    concept: 'sampling-variation',
    difficulty: 2,
    prompt: `The textbook map distance between C and Sh in maize is ${trueRFPct} cM. In your testcross of ${n} offspring, you observe ${observedRecomb} recombinants (RF = ${obsRF}%). Is this consistent with the expected ${trueRFPct} cM, or does it suggest a different map distance?`,
    hint: 'Compute the standard error: SE = \u221A(RF \u00D7 (1\u2212RF) / n). If the observed RF is within ~2 SE of the expected value, it is consistent with sampling variation.',
    options,
    explanation: `SE = \u221A(${trueRF} \u00D7 ${round(1 - trueRF, 2)} / ${n}) \u2248 ${sePct}%. The observed RF of ${obsRF}% is ${zScore} standard errors from the expected ${trueRFPct}%. ${isConsistent ? 'This is within normal sampling variation (|z| < 2), so the data are consistent with the textbook distance.' : 'This exceeds ~2 SE, suggesting the true recombination rate differs from the textbook value in this population or experimental context.'}`,
  };
}

// -- 5. Forward RF to ratio -------------------------------------------------
//
// Teaching goal: given a recombination frequency, predict the four testcross
// class frequencies.
//
// Canonical: parental classes each = (1-RF)/2, recombinant classes each = RF/2.
//
// Discovery beat: the student applies the formula to get specific numbers,
// not just a qualitative ratio.

const FORWARD_RF_PCT_VALUES = [8, 12, 17, 22, 30] as const;
const FORWARD_N = 500;

function generateForwardRFToRatio(rng: Rng): PracticeProblem {
  const rfPct = pick(FORWARD_RF_PCT_VALUES, rng);
  const rf = rfPct / 100;

  const parentalEach = round(((1 - rf) / 2) * FORWARD_N, 0);
  const recombEach = round((rf / 2) * FORWARD_N, 0);

  const correctLabel = `Purple Plump: ${parentalEach}, Yellow Shrunken: ${parentalEach}, Purple Shrunken: ${recombEach}, Yellow Plump: ${recombEach}`;

  // Distractor 1: swap parental and recombinant (student flips which is which)
  const dist1 = `Purple Plump: ${recombEach}, Yellow Shrunken: ${recombEach}, Purple Shrunken: ${parentalEach}, Yellow Plump: ${parentalEach}`;

  // Distractor 2: divide by 4 instead of 2 (student divides total
  // frequency among all four classes rather than two per type)
  const wrongP2 = round(((1 - rf) / 4) * FORWARD_N, 0);
  const wrongR2 = round((rf / 4) * FORWARD_N, 0);
  const dist2 = `Purple Plump: ${wrongP2}, Yellow Shrunken: ${wrongP2}, Purple Shrunken: ${wrongR2}, Yellow Plump: ${wrongR2}`;

  // Distractor 3: 1:1:1:1 (independent, each = N/4 = 125)
  const indep = round(FORWARD_N / 4, 0);
  const dist3 = `Purple Plump: ${indep}, Yellow Shrunken: ${indep}, Purple Shrunken: ${indep}, Yellow Plump: ${indep}`;

  const options: PracticeOption[] = shuffle([
    {
      label: correctLabel,
      isCorrect: true,
      feedback: `Correct! With RF = ${rfPct}% and N = ${FORWARD_N}: parental classes (Purple Plump, Yellow Shrunken) each = (1 \u2212 ${rf})/2 \u00D7 ${FORWARD_N} = ${parentalEach}. Recombinant classes (Purple Shrunken, Yellow Plump) each = ${rf}/2 \u00D7 ${FORWARD_N} = ${recombEach}.`,
    },
    {
      label: dist1,
      isCorrect: false,
      feedback: `Not quite. You swapped parental and recombinant classes. In a coupling heterozygote (C Sh / c sh), Purple Plump (C Sh) and Yellow Shrunken (c sh) are parental \u2014 these should be the LARGER classes. Recombinants (Purple Shrunken, Yellow Plump) are the smaller classes at RF = ${rfPct}%.`,
    },
    {
      label: dist2,
      isCorrect: false,
      feedback: `Not quite. Each parental class is (1 \u2212 RF)/2, not (1 \u2212 RF)/4. The "/2" is because there are two parental classes splitting the (1 \u2212 RF) total, and two recombinant classes splitting the RF total. Correct: parental each = ${parentalEach}, recombinant each = ${recombEach}.`,
    },
    {
      label: dist3,
      isCorrect: false,
      feedback: `Not quite. A 1:1:1:1 ratio (each class = ${indep}) would mean independent assortment (RF = 50%). With RF = ${rfPct}%, the genes are linked: parental classes = ${parentalEach} each, recombinant classes = ${recombEach} each.`,
    },
  ], rng);

  return {
    id: `frf-${uid(rng)}`,
    type: 'forward-rf-to-ratio',
    concept: 'rf-to-phenotype',
    difficulty: 2,
    prompt: `The C and Sh genes are ${rfPct} cM apart in coupling (C Sh / c sh). In a testcross producing ${FORWARD_N} offspring, how many of each phenotype class do you expect?`,
    hint: 'Each parental class frequency = (1 \u2212 RF)/2 and each recombinant class = RF/2. Multiply by N for expected counts.',
    options,
    explanation: `With RF = ${rf} and N = ${FORWARD_N}: parental frequency = (1 \u2212 ${rf})/2 = ${round((1 - rf) / 2, 3)} each, recombinant frequency = ${rf}/2 = ${round(rf / 2, 3)} each. Expected: Purple Plump = ${parentalEach}, Yellow Shrunken = ${parentalEach}, Purple Shrunken = ${recombEach}, Yellow Plump = ${recombEach}. Total recombinants = ${recombEach * 2}, confirming RF = ${recombEach * 2}/${FORWARD_N} = ${round((recombEach * 2) / FORWARD_N * 100, 1)}%.`,
  };
}

// -- Public API -------------------------------------------------------------

const GENERATORS: Record<LinkageConcept, (rng: Rng) => PracticeProblem> = {
  'linkage-ratio': generateForwardLinkageRatio,
  'rf-calculation': generateBackwardRFFromCounts,
  'linkage-testing': generateLinkedVsUnlinked,
  'sampling-variation': generateNoiseRecognition,
  'rf-to-phenotype': generateForwardRFToRatio,
};

export function linkageGenerateProblemForConcept(
  concept: string,
  rng: () => number,
): PracticeProblem {
  const gen = GENERATORS[concept as LinkageConcept];
  if (!gen) {
    // Fallback: pick a random concept
    const keys = Object.keys(GENERATORS) as LinkageConcept[];
    const fallback = keys[Math.floor(rng() * keys.length)];
    return GENERATORS[fallback](rng);
  }
  return gen(rng);
}

export function linkageGenerateRandomProblem(rng: () => number): PracticeProblem {
  const concept = LINKAGE_ALL_CONCEPTS[Math.floor(rng() * LINKAGE_ALL_CONCEPTS.length)];
  return linkageGenerateProblemForConcept(concept, rng);
}
