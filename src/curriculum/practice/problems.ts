/**
 * Practice Mode problem generators — Mendelian curriculum v2.1 starter set.
 *
 * Each generator returns a randomized instance of a `PracticeProblem`.
 * Problems are parameterized over parent genotype combinations and rely on
 * canonical textbook ratios (3:1, 1:1, 1:2:1, 9:3:3:1, etc.), NOT on
 * stochastic samples from `cross()`. The noise-recognition generator draws
 * a sample deliberately but still validates against the textbook ratio —
 * see CLAUDE.md "Correctness hard rules": validation must accept the
 * textbook answer regardless of Monte Carlo drift.
 *
 * Distractors are chosen to reflect common student misconceptions (confusing
 * 3:1 with 1:2:1, dropping the dominance distinction, multiplying instead of
 * adding, etc.). No option is ever annotated with "(correct)" or similar —
 * the correctness flag lives on the option object and drives feedback alone.
 *
 * All problems use the existing plant gene definitions from
 * `genetics-engine.ts` (FLOWER_COLOR, SEED_SHAPE, FLOWER_COLOR_INCOMPLETE).
 * No mice, no flies, no blood types.
 */

// ── Public types ────────────────────────────────────────────────────────

export type PracticeProblemType =
  | 'forward-monohybrid'
  | 'forward-dihybrid'
  | 'backward-monohybrid'
  | 'noise-recognition'
  | 'incomplete-dominance';

export type PracticeConcept =
  | 'monohybrid-ratio'
  | 'multiplication-rule'
  | 'parental-genotype-inference'
  | 'sampling-variation'
  | 'incomplete-dominance';

export interface PracticeOption {
  label: string;
  isCorrect: boolean;
  /** Per-option feedback shown when this option is selected. Falls back to
   *  problem.explanation if omitted. */
  feedback?: string;
}

export interface PracticeProblem {
  id: string;
  type: PracticeProblemType;
  concept: PracticeConcept;
  difficulty: 1 | 2 | 3;
  prompt: string;
  options: PracticeOption[];
  explanation: string;
}

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

// ── Monohybrid truth table ──────────────────────────────────────────────
//
// For a complete-dominance single gene (FLOWER_COLOR: R dominant red,
// r recessive white), the six unique parent pairings produce these
// phenotypic ratios (dominant : recessive):

interface MonohybridCase {
  parents: [string, string];         // ['RR', 'rr'] etc.
  ratioKey: MonoRatio;               // textbook classification
}

type MonoRatio = 'all-red' | '3:1' | '1:1' | 'all-white';

// Note: Rr × Rr (the canonical 3:1 monohybrid cross) is duplicated so that
// the most pedagogically valuable case surfaces ~3/9 of uniform draws rather
// than ~1/6. The all-red cases are represented once each since they all
// teach the same "dominant allele present → uniform F1" lesson. This fixes
// F-031 from the April 2026 peer review.
const MONOHYBRID_CASES: readonly MonohybridCase[] = [
  { parents: ['RR', 'RR'], ratioKey: 'all-red' },
  { parents: ['RR', 'Rr'], ratioKey: 'all-red' },
  { parents: ['RR', 'rr'], ratioKey: 'all-red' },
  { parents: ['Rr', 'Rr'], ratioKey: '3:1' },
  { parents: ['Rr', 'Rr'], ratioKey: '3:1' },
  { parents: ['Rr', 'Rr'], ratioKey: '3:1' },
  { parents: ['Rr', 'rr'], ratioKey: '1:1' },
  { parents: ['Rr', 'rr'], ratioKey: '1:1' },
  { parents: ['rr', 'rr'], ratioKey: 'all-white' },
];

const MONO_RATIO_LABEL: Record<MonoRatio, string> = {
  'all-red': 'All red',
  '3:1': '3 red : 1 white',
  '1:1': '1 red : 1 white',
  'all-white': 'All white',
};

// ── Problem 1: forward monohybrid ───────────────────────────────────────

export function generateForwardMonohybrid(rng: Rng = Math.random): PracticeProblem {
  const chosen = pick(MONOHYBRID_CASES, rng);
  const [a, b] = chosen.parents;

  // Build all four ratio options, mark the correct one, shuffle.
  const optionKeys: MonoRatio[] = ['all-red', '3:1', '1:1', 'all-white'];
  const options: PracticeOption[] = shuffle(
    optionKeys.map(key => ({
      label: MONO_RATIO_LABEL[key],
      isCorrect: key === chosen.ratioKey,
      feedback: MONO_FEEDBACK[key],
    })),
    rng,
  );

  return {
    id: `fwd-mono-${uid(rng)}`,
    type: 'forward-monohybrid',
    concept: 'monohybrid-ratio',
    difficulty: 1,
    prompt: `${a} \u00d7 ${b} \u2192 what phenotype ratio appears in the F1 offspring? (R is dominant for red flowers; r is recessive for white.)`,
    options,
    explanation: EXPLAIN_MONO[chosen.ratioKey](a, b),
  };
}

const MONO_FEEDBACK: Record<MonoRatio, string> = {
  'all-red':
    'Every offspring inherits at least one R allele, so every plant shows the dominant red phenotype.',
  '3:1':
    'Each Rr parent passes R half the time and r half the time. The Punnett square gives 1 RR : 2 Rr : 1 rr = 3 red : 1 white.',
  '1:1':
    'The Rr parent gives R or r with equal probability, paired with r from the rr parent \u2014 half the offspring are Rr (red) and half are rr (white).',
  'all-white':
    'Both parents are rr and can only pass r, so every offspring is rr and shows white.',
};

const EXPLAIN_MONO: Record<MonoRatio, (a: string, b: string) => string> = {
  'all-red': (a, b) =>
    `${a} \u00d7 ${b}: at least one parent contributes R to every offspring, so all F1 are red (dominant phenotype).`,
  '3:1': (_a, _b) =>
    'Rr \u00d7 Rr is the canonical monohybrid cross. Gametes 1/2 R, 1/2 r from each parent \u2192 offspring 1/4 RR, 1/2 Rr, 1/4 rr \u2192 3 red : 1 white.',
  '1:1': (a, b) =>
    `${a} \u00d7 ${b}: the heterozygote contributes R half the time and r half the time, so half the offspring are Rr (red) and half are rr (white).`,
  'all-white': (_a, _b) =>
    'rr \u00d7 rr: both parents are homozygous recessive, so every offspring is rr (white). No R allele in the gene pool of this cross.',
};

// ── Problem 2: forward dihybrid probability ─────────────────────────────
//
// For two unlinked genes, the probability of any specific genotype class
// factors as P(gene A class) \u00d7 P(gene B class). Student learns the
// multiplication rule by applying it to concrete parent pairs.

interface DihybridCase {
  parentA: string; // e.g. 'Rr Ss'
  parentB: string;
  /** P(rr ss) expressed as numerator/denominator in canonical form. */
  pRrss: { num: number; denom: number };
}

// For this v2.1 starter set we only ask for P(rr ss) \u2014 the double
// recessive \u2014 because it has the cleanest truth table.
//
//   P(rr) given parents:   RR\u00d7RR 0,  RR\u00d7Rr 0,  RR\u00d7rr 0,
//                          Rr\u00d7Rr 1/4, Rr\u00d7rr 1/2, rr\u00d7rr 1
//
// and likewise for the second gene. The double-recessive probability is
// the product.

const DIHYBRID_CASES: readonly DihybridCase[] = [
  { parentA: 'Rr Ss', parentB: 'Rr Ss', pRrss: { num: 1, denom: 16 } },
  { parentA: 'Rr Ss', parentB: 'Rr ss', pRrss: { num: 1, denom: 8 } },
  { parentA: 'Rr Ss', parentB: 'rr Ss', pRrss: { num: 1, denom: 8 } },
  { parentA: 'Rr Ss', parentB: 'rr ss', pRrss: { num: 1, denom: 4 } },
  { parentA: 'Rr ss', parentB: 'Rr ss', pRrss: { num: 1, denom: 4 } },
  { parentA: 'Rr Ss', parentB: 'RR Ss', pRrss: { num: 0, denom: 1 } },
];

function fractionLabel(num: number, denom: number): string {
  if (num === 0) return '0';
  if (num === denom) return '1';
  return `${num}/${denom}`;
}

function fractionDecimal(num: number, denom: number): string {
  if (num === 0) return '0';
  const d = num / denom;
  // Round to 4 decimals, strip trailing zeros.
  return d.toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
}

export function generateForwardDihybrid(rng: Rng = Math.random): PracticeProblem {
  const chosen = pick(DIHYBRID_CASES, rng);
  const { num, denom } = chosen.pRrss;

  // Build a plausible distractor set. Common misconceptions:
  //  - adding probabilities instead of multiplying (1/4 + 1/4 = 1/2)
  //  - ignoring one gene (just 1/4 from one gene)
  //  - confusing with 9:3:3:1 (so 1/16 even when parents aren't both het)
  //  - "1/16 always"
  const distractorPool: { num: number; denom: number }[] = [
    { num: 1, denom: 16 },
    { num: 1, denom: 8 },
    { num: 1, denom: 4 },
    { num: 1, denom: 2 },
    { num: 3, denom: 16 },
    { num: 9, denom: 16 },
    { num: 1, denom: 32 },
  ];

  const distractors = distractorPool
    .filter(d => !(d.num === num && d.denom === denom))
    .filter(d => !(num === 0 ? false : d.num === 0));

  const picked: { num: number; denom: number }[] = [];
  const shuffled = shuffle(distractors, rng);
  for (const d of shuffled) {
    if (picked.length >= 3) break;
    if (picked.some(p => p.num * d.denom === d.num * p.denom)) continue;
    picked.push(d);
  }

  const allOptions = shuffle(
    [
      { value: { num, denom }, isCorrect: true },
      ...picked.map(value => ({ value, isCorrect: false })),
    ],
    rng,
  );

  const options: PracticeOption[] = allOptions.map(o => ({
    label: fractionLabel(o.value.num, o.value.denom),
    isCorrect: o.isCorrect,
    feedback: o.isCorrect
      ? `Correct. P(rr) \u00d7 P(ss) factors across the two unlinked genes. See explanation below for the factoring.`
      : `Not quite \u2014 P(rr ss) = P(rr) \u00d7 P(ss). Work out each gene's probability separately, then multiply (not add).`,
  }));

  return {
    id: `fwd-di-${uid(rng)}`,
    type: 'forward-dihybrid',
    concept: 'multiplication-rule',
    difficulty: 2,
    prompt: `${chosen.parentA} \u00d7 ${chosen.parentB}. What is P(rr ss) in the offspring? (R/r and S/s are on different chromosomes, both complete dominance.)`,
    options,
    explanation: explainDihybrid(chosen),
  };
}

function probRrText(parent: string): string {
  // Extract the first-gene genotype characters.
  const g = parent.slice(0, 2);
  if (g === 'RR') return '0';
  if (g === 'Rr') return '1/2';
  if (g === 'rr') return '1';
  return '?';
}
function probSsText(parent: string): string {
  const g = parent.slice(3, 5);
  if (g === 'SS') return '0';
  if (g === 'Ss') return '1/2';
  if (g === 'ss') return '1';
  return '?';
}

function explainDihybrid(c: DihybridCase): string {
  const { num, denom } = c.pRrss;
  if (num === 0) {
    return `At least one parent is homozygous dominant for one of the genes (no r or no s to give), so P(rr ss) = 0.`;
  }
  const prA = probRrText(c.parentA);
  const prB = probRrText(c.parentB);
  const psA = probSsText(c.parentA);
  const psB = probSsText(c.parentB);
  return `P(rr) = P(r from A) \u00d7 P(r from B) = ${prA} \u00d7 ${prB}. P(ss) = ${psA} \u00d7 ${psB}. Multiply the two gene probabilities \u2014 independent assortment lets you factor \u2014 to get ${fractionLabel(num, denom)} (\u2248 ${fractionDecimal(num, denom)}).`;
}

// ── Problem 3: backward monohybrid ──────────────────────────────────────
//
// Given an observed ratio, infer the parent genotypes. The truth table
// is the inverse of MONOHYBRID_CASES: each ratioKey maps to one or more
// canonical parent pairs.

interface BackwardCase {
  observed: MonoRatio;
  correctParents: string;
  /** Distractors are other parent pairs that a naive student might pick. */
  distractors: readonly string[];
  explanation: string;
}

const BACKWARD_CASES: readonly BackwardCase[] = [
  {
    observed: '3:1',
    correctParents: 'Rr \u00d7 Rr',
    distractors: ['RR \u00d7 Rr', 'Rr \u00d7 rr', 'RR \u00d7 rr'],
    explanation:
      'A 3:1 phenotype ratio means 1/4 of offspring are the recessive class. That 1/4 can only arise if BOTH parents contribute an r allele half the time \u2014 i.e. both parents are Rr. Each parent\u2019s gametes are 1/2 R : 1/2 r, so offspring are 1 RR : 2 Rr : 1 rr (3 red : 1 white).',
  },
  {
    observed: '1:1',
    correctParents: 'Rr \u00d7 rr',
    distractors: ['Rr \u00d7 Rr', 'RR \u00d7 rr', 'rr \u00d7 rr'],
    explanation:
      'A 1:1 phenotype ratio is the signature of a test cross: one parent is heterozygous (Rr, gives R or r with equal probability), the other is homozygous recessive (rr, always gives r). Half the offspring are Rr (red), half are rr (white).',
  },
  {
    observed: 'all-red',
    correctParents: 'RR \u00d7 rr',
    distractors: ['Rr \u00d7 Rr', 'Rr \u00d7 rr', 'rr \u00d7 rr'],
    explanation:
      'When every offspring is red and none are white, one parent must be incapable of passing r. RR \u00d7 rr is the classic "uniform F1" cross: every offspring inherits R from the RR parent and r from the rr parent, so every offspring is Rr (red).',
  },
  {
    observed: 'all-white',
    correctParents: 'rr \u00d7 rr',
    distractors: ['Rr \u00d7 rr', 'Rr \u00d7 Rr', 'RR \u00d7 rr'],
    explanation:
      'Every offspring is white (rr), so neither parent can contribute an R allele. Both parents must be homozygous recessive rr.',
  },
];

export function generateBackwardMonohybrid(rng: Rng = Math.random): PracticeProblem {
  const chosen = pick(BACKWARD_CASES, rng);
  const options: PracticeOption[] = shuffle(
    [
      { label: chosen.correctParents, isCorrect: true },
      ...chosen.distractors.map(label => ({ label, isCorrect: false })),
    ],
    rng,
  );

  // Attach per-option feedback that teaches why each wrong pair doesn't
  // produce the observed ratio.
  const withFeedback: PracticeOption[] = options.map(o =>
    o.isCorrect
      ? { ...o, feedback: 'Correct. Those parents produce exactly this ratio.' }
      : { ...o, feedback: whyWrongParent(o.label, chosen.observed) },
  );

  const ratioSentence: Record<MonoRatio, string> = {
    '3:1': 'You see a 3:1 phenotype ratio in the offspring (3 red for every 1 white).',
    '1:1': 'You see a 1:1 phenotype ratio (equal red and white).',
    'all-red': 'Every offspring is red; no white plants appear.',
    'all-white': 'Every offspring is white; no red plants appear.',
  };

  return {
    id: `bwd-mono-${uid(rng)}`,
    type: 'backward-monohybrid',
    concept: 'parental-genotype-inference',
    difficulty: 2,
    prompt: `${ratioSentence[chosen.observed]} What are the most likely parent genotypes?`,
    options: withFeedback,
    explanation: chosen.explanation,
  };
}

function whyWrongParent(pair: string, observed: MonoRatio): string {
  // Parse "RR \u00d7 Rr" etc.
  const parts = pair.split(/\s*[\u00d7x]\s*/);
  const a = parts[0];
  const b = parts[1] ?? '';
  const ratio = monoCrossRatio(a, b);
  const ratioText = ratio === null ? 'an undefined ratio' : MONO_RATIO_LABEL[ratio];
  return `${pair} would produce ${ratioText}, not ${MONO_RATIO_LABEL[observed]}. Work through the gametes each parent can make.`;
}

function monoCrossRatio(a: string, b: string): MonoRatio | null {
  const match = MONOHYBRID_CASES.find(
    c =>
      (c.parents[0] === a && c.parents[1] === b) ||
      (c.parents[0] === b && c.parents[1] === a),
  );
  return match?.ratioKey ?? null;
}

// ── Problem 4: noise recognition ────────────────────────────────────────
//
// Pedagogical point: real data is noisy. 71:29 out of 100 is NOT a 2:1
// ratio, it\u2019s a 3:1 ratio that happened to sample slightly below
// expectation. The student must learn to map noisy counts back to the
// nearest canonical ratio. Validation accepts the textbook answer (3:1)
// regardless of what Math.random() happened to draw.

interface NoiseTarget {
  label: MonoRatio;
  /** Expected count of the FIRST (dominant/red) class out of 100. */
  expectedRed: number;
}

const NOISE_TARGETS: readonly NoiseTarget[] = [
  // Use 3:1 primarily \u2014 it\u2019s the cleanest case. 1:1 included for
  // variety so the student learns more than one pattern.
  { label: '3:1', expectedRed: 75 },
  { label: '1:1', expectedRed: 50 },
];

export function generateNoiseRecognition(rng: Rng = Math.random): PracticeProblem {
  const target = pick(NOISE_TARGETS, rng);

  // Draw a sample near the expected count. Keep within ~1 SE so the
  // answer is unambiguously the textbook ratio. SE for n=100, p=0.75
  // is ~4.33; for p=0.5 it\u2019s 5. We clamp to at most 1.2 SE so we
  // never drift close to another canonical ratio.
  //
  // Note: we still accept the textbook answer even if the draw lands at
  // the edge. The stochastic sample is a *display artifact*, not the
  // validation target.
  const se =
    Math.sqrt((target.expectedRed / 100) * (1 - target.expectedRed / 100) * 100);
  const maxDrift = Math.min(6, Math.floor(se * 1.2));
  // Triangular-ish noise: (rng+rng-1) centered at 0 with max |1|.
  const noise = (rng() + rng() - 1) * maxDrift;
  let red = Math.round(target.expectedRed + noise);
  // Clamp: for 3:1, keep red in [70, 80] (roughly \u00b11 SE around 75 \u2014
  //        stays clear of the 2:1 boundary at 66.7 and the all-red extreme);
  //        for 1:1 keep in [44, 56]. Tightened from [68, 82] per F-018 peer
  //        review, because 68/100 is only ~1.3 counts from 2:1 and ~1.8 SE
  //        below 3:1 \u2014 genuinely ambiguous for a noise-recognition item.
  if (target.label === '3:1') red = Math.max(70, Math.min(80, red));
  else red = Math.max(44, Math.min(56, red));
  const white = 100 - red;

  const optionKeys: MonoRatio[] = ['all-red', '3:1', '1:1', 'all-white'];
  const options: PracticeOption[] = shuffle(
    optionKeys.map(key => ({
      label: MONO_RATIO_LABEL[key],
      isCorrect: key === target.label,
      feedback:
        key === target.label
          ? `Correct. ${red}:${white} is close to ${key === '3:1' ? '75:25' : '50:50'}, which is exactly ${MONO_RATIO_LABEL[key]}. Small departures from the exact expected counts are normal sampling variation.`
          : `${MONO_RATIO_LABEL[key]} would predict very different counts. For ${key === '3:1' ? '75 red out of 100' : key === '1:1' ? '50 red out of 100' : key === 'all-red' ? '100 red out of 100' : '0 red out of 100'}. The observed ${red}:${white} is much closer to ${target.label === '3:1' ? '75:25 (3:1)' : '50:50 (1:1)'}.`,
    })),
    rng,
  );

  return {
    id: `noise-${uid(rng)}`,
    type: 'noise-recognition',
    concept: 'sampling-variation',
    difficulty: 2,
    prompt: `A cross produced ${red} red and ${white} white offspring out of 100. What canonical Mendelian ratio does this sample most closely match?`,
    options,
    explanation:
      target.label === '3:1'
        ? `The textbook 3:1 ratio predicts 75 red : 25 white out of 100. A sample of ${red}:${white} is within normal binomial sampling error of that prediction (SE \u2248 4.3 for n=100, p=0.75). Real genetic data never lands on the exact expected count \u2014 the skill is recognizing 3:1 through the noise, not rejecting it when the numbers drift a few percent.`
        : `The textbook 1:1 ratio predicts 50 red : 50 white out of 100. A sample of ${red}:${white} is within normal binomial sampling error of that prediction (SE = 5 for n=100, p=0.5). Recognizing the underlying pattern through sampling variation is the core of Mendelian analysis.`,
  };
}

// ── Problem 5: incomplete dominance ─────────────────────────────────────

interface IncompleteDomCase {
  prompt: string;
  correct: string;
  distractors: readonly string[];
  explanation: string;
}

// Species parameters for incomplete-dominance prompts. All three are real
// textbook incomplete-dominance plants: snapdragons (Antirrhinum), four
// o'clocks (Mirabilis jalapa \u2014 Correns 1909), and carnations
// (Dianthus). Parameterizing over species prevents students from memorizing
// "snapdragon pink" as a pattern-match and forces them to apply the
// 1:2:1 genotype-equals-phenotype logic across organisms. Per F-042.
interface IncompleteDomSpecies {
  plant: string;                   // e.g. 'snapdragons'
  singular: string;                // e.g. 'snapdragon'
  heteroPhenotype: string;         // e.g. 'pink'
  homoDomPhenotype: string;        // e.g. 'red'
  homoRecPhenotype: string;        // e.g. 'white'
}

const INCOMPLETE_DOM_SPECIES: readonly IncompleteDomSpecies[] = [
  {
    plant: 'snapdragons',
    singular: 'snapdragon',
    heteroPhenotype: 'pink',
    homoDomPhenotype: 'red',
    homoRecPhenotype: 'white',
  },
  {
    plant: 'four o\u2019clocks',
    singular: 'four o\u2019clock',
    heteroPhenotype: 'pink',
    homoDomPhenotype: 'red',
    homoRecPhenotype: 'white',
  },
  {
    plant: 'carnations',
    singular: 'carnation',
    heteroPhenotype: 'pink',
    homoDomPhenotype: 'red',
    homoRecPhenotype: 'white',
  },
];

// Each species yields two prompt forms: (1) "what F2 ratio?" and
// (2) "what genotype corresponds to the intermediate phenotype?". That gives
// 3 species \u00d7 2 forms = 6 distinct prompts, satisfying F-042's
// \u22656-prompt requirement. All prompts validate against the same
// canonical incomplete-dominance rule (1:2:1 genotype = 1:2:1 phenotype).
const INCOMPLETE_DOM_CASES: readonly IncompleteDomCase[] = INCOMPLETE_DOM_SPECIES.flatMap(
  (sp): IncompleteDomCase[] => [
    {
      prompt:
        `In ${sp.plant}, ${sp.homoDomPhenotype} (RR) \u00d7 ${sp.homoRecPhenotype} (rr) ` +
        `produces all ${sp.heteroPhenotype} F1 plants. If you self the F1 ` +
        `(${sp.heteroPhenotype} \u00d7 ${sp.heteroPhenotype}), what phenotype ratio do ` +
        'you expect in the F2?',
      correct:
        `1 ${sp.homoDomPhenotype} : 2 ${sp.heteroPhenotype} : 1 ${sp.homoRecPhenotype}`,
      distractors: [
        `3 ${sp.homoDomPhenotype} : 1 ${sp.homoRecPhenotype}`,
        `1 ${sp.homoDomPhenotype} : 1 ${sp.homoRecPhenotype}`,
        `All ${sp.heteroPhenotype}`,
      ],
      explanation:
        `With incomplete dominance, the heterozygote (Rr) has its own distinct ` +
        `phenotype (${sp.heteroPhenotype}). The genotype ratio 1 RR : 2 Rr : 1 rr ` +
        `from Rr \u00d7 Rr maps directly to the phenotype ratio ` +
        `1 ${sp.homoDomPhenotype} : 2 ${sp.heteroPhenotype} : 1 ${sp.homoRecPhenotype}, ` +
        'because each genotype class now shows as a different color. There is no 3:1 collapse.',
    },
    {
      prompt:
        `${capitalize(sp.homoDomPhenotype)}-flowered (RR) \u00d7 ${sp.homoRecPhenotype}-flowered ` +
        `(rr) ${sp.plant} produce all ${sp.heteroPhenotype} F1. What genotype does ` +
        `the ${sp.heteroPhenotype} phenotype correspond to?`,
      correct: 'Rr (heterozygous)',
      distractors: [
        `RR (homozygous ${sp.homoDomPhenotype})`,
        `rr (homozygous ${sp.homoRecPhenotype})`,
        'A new mutation',
      ],
      explanation:
        'Under incomplete dominance, the heterozygote expresses an intermediate ' +
        'phenotype because neither allele fully masks the other. Every F1 plant ' +
        'inherits one R from the RR parent and one r from the rr parent, so every ' +
        `F1 plant is Rr \u2014 and Rr shows ${sp.heteroPhenotype} in ${sp.plant}, ` +
        `not ${sp.homoDomPhenotype}.`,
    },
  ],
);

function capitalize(s: string): string {
  return s.length === 0 ? s : s[0].toUpperCase() + s.slice(1);
}

export function generateIncompleteDominance(rng: Rng = Math.random): PracticeProblem {
  const chosen = pick(INCOMPLETE_DOM_CASES, rng);
  const options: PracticeOption[] = shuffle(
    [
      {
        label: chosen.correct,
        isCorrect: true,
        feedback:
          'Correct. With incomplete dominance the heterozygote has its own phenotype, so the genotype ratio equals the phenotype ratio.',
      },
      ...chosen.distractors.map(label => ({
        label,
        isCorrect: false,
        feedback: whyWrongIncomplete(label),
      })),
    ],
    rng,
  );

  return {
    id: `inc-dom-${uid(rng)}`,
    type: 'incomplete-dominance',
    concept: 'incomplete-dominance',
    difficulty: 2,
    prompt: chosen.prompt,
    options,
    explanation: chosen.explanation,
  };
}

function whyWrongIncomplete(label: string): string {
  // Match by pattern so this works for any species parameterization.
  // Distractor shapes:
  //   "3 <dom> : 1 <rec>"            \u2192 complete-dominance trap
  //   "1 <dom> : 1 <rec>"            \u2192 test-cross trap
  //   "All <hetero>"                 \u2192 F1-is-final trap
  //   "RR (homozygous <dom>)"        \u2192 genotype confusion
  //   "rr (homozygous <rec>)"        \u2192 genotype confusion
  //   "A new mutation"               \u2192 blending misconception
  if (/^3\s+\w+\s*:\s*1\s+\w+$/.test(label))
    return 'That\u2019s the complete-dominance answer. With incomplete dominance the heterozygote has its own intermediate phenotype, so the ratio is 1:2:1, not 3:1.';
  if (/^1\s+\w+\s*:\s*1\s+\w+$/.test(label))
    return '1:1 is the test-cross ratio (Rr \u00d7 rr). The F1 \u00d7 F1 here is Rr \u00d7 Rr, and with incomplete dominance that gives three distinct phenotype classes, not two.';
  if (/^All\s+\w+$/.test(label))
    return 'The F1 are all heterozygous because they all inherit one R and one r. But crossing two Rr parents produces 1 RR : 2 Rr : 1 rr \u2014 both homozygous phenotypes reappear in the F2.';
  if (/^RR\s*\(homozygous/.test(label))
    return 'RR would show the full homozygous-dominant phenotype. The intermediate F1 plants got one R from the dominant parent and one r from the recessive parent, so they\u2019re Rr, not RR.';
  if (/^rr\s*\(homozygous/.test(label))
    return 'rr would show the full recessive phenotype. The F1 have one R allele each (from the RR parent), so they\u2019re heterozygous, not homozygous recessive.';
  if (label === 'A new mutation')
    return 'No mutation is needed. The intermediate phenotype is simply what the heterozygote looks like under incomplete dominance \u2014 the two alleles blend in the visible phenotype without altering the genetic material.';
  return 'Not quite \u2014 reason through what genotype the F1 plants must carry.';
}

// ── Generic dispatch + random selector ──────────────────────────────────

const GENERATORS: Record<PracticeProblemType, (rng: Rng) => PracticeProblem> = {
  'forward-monohybrid': generateForwardMonohybrid,
  'forward-dihybrid': generateForwardDihybrid,
  'backward-monohybrid': generateBackwardMonohybrid,
  'noise-recognition': generateNoiseRecognition,
  'incomplete-dominance': generateIncompleteDominance,
};

export const ALL_PROBLEM_TYPES: readonly PracticeProblemType[] = [
  'forward-monohybrid',
  'forward-dihybrid',
  'backward-monohybrid',
  'noise-recognition',
  'incomplete-dominance',
];

/** Map a concept to the problem type that exercises it. v2.1 is 1:1. */
export const CONCEPT_TO_TYPE: Record<PracticeConcept, PracticeProblemType> = {
  'monohybrid-ratio': 'forward-monohybrid',
  'multiplication-rule': 'forward-dihybrid',
  'parental-genotype-inference': 'backward-monohybrid',
  'sampling-variation': 'noise-recognition',
  'incomplete-dominance': 'incomplete-dominance',
};

export const ALL_CONCEPTS: readonly PracticeConcept[] = [
  'monohybrid-ratio',
  'multiplication-rule',
  'parental-genotype-inference',
  'sampling-variation',
  'incomplete-dominance',
];

export const CONCEPT_LABELS: Record<PracticeConcept, string> = {
  'monohybrid-ratio': 'Monohybrid ratios',
  'multiplication-rule': 'Multiplication rule',
  'parental-genotype-inference': 'Inferring parent genotypes',
  'sampling-variation': 'Recognizing sampling variation',
  'incomplete-dominance': 'Incomplete dominance',
};

export function generateProblem(
  type: PracticeProblemType,
  rng: Rng = Math.random,
): PracticeProblem {
  return GENERATORS[type](rng);
}

export function generateProblemForConcept(
  concept: PracticeConcept,
  rng: Rng = Math.random,
): PracticeProblem {
  return generateProblem(CONCEPT_TO_TYPE[concept], rng);
}

export function generateRandomProblem(rng: Rng = Math.random): PracticeProblem {
  return generateProblem(pick(ALL_PROBLEM_TYPES, rng), rng);
}
