/**
 * Population Genetics Curriculum Module
 *
 * Eight experiments exploring evolutionary forces:
 *  0. Hardy 1908 — why dominant alleles don't take over (historical framing)
 *  1. Allele Frequencies — count alleles, compute p and q (Mimulus guttatus)
 *  2. Hardy-Weinberg Equilibrium — predict genotype frequencies (Mimulus)
 *  3. Genetic Drift — small vs large populations (Mimulus serpentine sites)
 *  4. Natural Selection — directional selection on a recessive (Amaranthus palmeri)
 *  5. Migration — gene flow between populations (Mimulus serpentine/non-serpentine)
 *  6. Mutation-Selection Balance — equilibrium frequency (Arabidopsis thaliana)
 *  7. Founder Effect — sampling shifts allele frequencies (Hawaiian Bidens)
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  simulate, hardyWeinberg, testHWE, sampleZygotes,
} from './popgen-engine';
import {
  ModuleShell, QuestionPanel, HistogramChart, AlleleTrajectoryVisualizer,
  type ModuleDefinition,
} from './components';
import { PlantIcon } from '../shared/icons/PlantIcon';

// ── Plant example mapping ──────────────────────────────────────────────
/**
 * PLANT_EXAMPLES — experiment-to-organism mapping for the PopGen module.
 *
 * Exp 0 (Hardy 1908), Exp 1 (Allele Freq), Exp 2 (HWE), Exp 3 (Drift), Exp 5 (Migration):
 *   Mimulus guttatus (yellow monkeyflower) — anthocyanin pigmentation
 *   Alleles: M (anthocyanin, dominant) / m (null recessive)
 *   MM = deep magenta, Mm = pink-magenta, mm = cream/pale
 *
 * Exp 4 (Selection): Amaranthus palmeri (Palmer amaranth) — glyphosate resistance
 *   Alleles: R (resistant, dominant) / r (susceptible recessive)
 *   RR/Rr = resistant, rr = susceptible (reduced fitness under herbicide)
 *
 * Exp 6 (Mutation-Selection): Arabidopsis thaliana — chlorophyll biosynthesis
 *   Alleles: Chl (normal, dominant) / chl (null recessive)
 *   chl/chl = albino seedling, nearly lethal
 *
 * Exp 7 (Founder Effect): Hawaiian Bidens (beggar-ticks, Asteraceae: Coreopsideae)
 *   Uses abstract allele freq sampling (no specific locus), framed as Bidens colonization
 */
const PLANT_EXAMPLES = {
  mimulus: {
    species: 'Mimulus guttatus',
    common: 'yellow monkeyflower',
    alleles: { dominant: 'M', recessive: 'm' },
    genotypeLabels: { AA: 'MM', Aa: 'Mm', aa: 'mm' },
    colors: { AA: '#be185d', Aa: '#f472b6', aa: '#fef3c7' },
    borders: { AA: '#9d174d', Aa: '#ec4899', aa: '#fde68a' },
  },
  amaranthus: {
    species: 'Amaranthus palmeri',
    common: 'Palmer amaranth',
    alleles: { dominant: 'R', recessive: 'r' },
    genotypeLabels: { AA: 'RR', Aa: 'Rr', aa: 'rr' },
    colors: { AA: '#15803d', Aa: '#4ade80', aa: '#fde68a' },
    borders: { AA: '#166534', Aa: '#22c55e', aa: '#fbbf24' },
  },
  arabidopsis: {
    species: 'Arabidopsis thaliana',
    common: 'thale cress',
    alleles: { dominant: 'Chl', recessive: 'chl' },
    genotypeLabels: { AA: 'Chl/Chl', Aa: 'Chl/chl', aa: 'chl/chl' },
    colors: { AA: '#15803d', Aa: '#86efac', aa: '#fefce8' },
    borders: { AA: '#166534', Aa: '#4ade80', aa: '#fef08a' },
  },
  bidens: {
    species: 'Bidens',
    common: 'Hawaiian beggar-ticks',
    alleles: { dominant: 'A', recessive: 'a' },
    genotypeLabels: { AA: 'AA', Aa: 'Aa', aa: 'aa' },
    colors: { AA: '#7c3aed', Aa: '#c4b5fd', aa: '#f5f3ff' },
    borders: { AA: '#6d28d9', Aa: '#a78bfa', aa: '#ddd6fe' },
  },
} as const;

// ── Shared visualization components ─────────────────────────────────────

/** Grid of colored circles representing a population (Mimulus colors) */
function PopulationGrid({ genotypes, size = 20, colorScheme = 'mimulus' }: {
  genotypes: { AA: number; Aa: number; aa: number };
  size?: number;
  colorScheme?: 'mimulus' | 'violet';
}) {
  const individuals = useMemo(() => {
    const arr: ('AA' | 'Aa' | 'aa')[] = [];
    for (let i = 0; i < genotypes.AA; i++) arr.push('AA');
    for (let i = 0; i < genotypes.Aa; i++) arr.push('Aa');
    for (let i = 0; i < genotypes.aa; i++) arr.push('aa');

    // Shuffle for visual randomness (stable across re-renders)
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, [genotypes.AA, genotypes.Aa, genotypes.aa]);

  const mimulusColors = PLANT_EXAMPLES.mimulus.colors;
  const mimulusBorders = PLANT_EXAMPLES.mimulus.borders;
  const violetColors = { AA: '#6d28d9', Aa: '#a78bfa', aa: '#ede9fe' };
  const violetBorders = { AA: '#5b21b6', Aa: '#7c3aed', aa: '#c4b5fd' };

  const colorMap = colorScheme === 'mimulus' ? mimulusColors : violetColors;
  const borderMap = colorScheme === 'mimulus' ? mimulusBorders : violetBorders;
  const labels = colorScheme === 'mimulus' ? PLANT_EXAMPLES.mimulus.genotypeLabels : { AA: 'AA', Aa: 'Aa', aa: 'aa' };

  return (
    <div className="flex flex-wrap gap-1 justify-center mx-auto" style={{ maxWidth: `${10 * (size + 4) + 12}px` }}>
      {individuals.map((g, i) => (
        <div key={i} title={labels[g]}>
          <PlantIcon
            color={colorMap[g]}
            strokeColor={borderMap[g]}
            pixelSize={size}
            size="sm"
            height={35}
            showSoil={false}
          />
        </div>
      ))}
      <div className="w-full flex justify-center gap-4 mt-2 text-[11px] text-stone-500">
        <span className="flex items-center gap-1">
          <PlantIcon color={colorMap.AA} strokeColor={borderMap.AA} pixelSize={14} size="sm" height={35} showSoil={false} />
          {labels.AA}
        </span>
        <span className="flex items-center gap-1">
          <PlantIcon color={colorMap.Aa} strokeColor={borderMap.Aa} pixelSize={14} size="sm" height={35} showSoil={false} />
          {labels.Aa}
        </span>
        <span className="flex items-center gap-1">
          <PlantIcon color={colorMap.aa} strokeColor={borderMap.aa} pixelSize={14} size="sm" height={35} showSoil={false} />
          {labels.aa}
        </span>
      </div>
    </div>
  );
}

// ── Experiment 0: Hardy 1908 + Weinberg 1908 ────────────────────────────

function Exp0_HardyWeinberg1908({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const [prediction, setPrediction] = useState('');
  const [predCorrect, setPredCorrect] = useState<boolean | null>(null);
  const [exitAnswer, setExitAnswer] = useState('');
  const [exitCorrect, setExitCorrect] = useState<boolean | null>(null);
  const [forwardEverCorrect, setForwardEverCorrect] = useState(false);
  const [backAnswer, setBackAnswer] = useState('');
  const [backCorrect, setBackCorrect] = useState<boolean | null>(null);
  const [backCompleted, setBackCompleted] = useState(false);

  useEffect(() => {
    if (!backCompleted) return;
    const t = setTimeout(onComplete, 1500);
    return () => clearTimeout(t);
  }, [backCompleted, onComplete]);

  const handlePrediction = (ans: string) => {
    setPrediction(ans);
    const isCorrect = ans === 'stays';
    setPredCorrect(isCorrect);
    if (isCorrect) {
      setStep(1);
    }
  };

  const handleExit = (ans: string) => {
    setExitAnswer(ans);
    const isCorrect = ans === 'null_hypothesis';
    setExitCorrect(isCorrect);
    if (isCorrect) setForwardEverCorrect(true);
  };

  return (
    <div className="space-y-6">
      {/* Historical framing */}
      <div className="rounded-lg bg-stone-50 border border-stone-200 p-4 text-sm text-stone-700 space-y-3">
        <p className="font-hand text-lg font-bold text-stone-800">
          The dinner-table proof that settled a decade of confusion
        </p>
        <p>
          It's 1908. Gregor Mendel's 1865 pea paper has been rediscovered for eight years, the word "gene"
          has just been coined by Wilhelm Johannsen, and biologists are wrestling with a seemingly obvious
          question: <strong>if dominant alleles really are dominant, shouldn't they eventually take over the
          population?</strong> After all, in every cross where a dominant allele is present, it wins the
          phenotype. Surely, over many generations, dominance should swamp recession and every population
          should reach 100% dominant phenotype.
        </p>
        <p>
          Over a cricket dinner at Cambridge, the Mendelian geneticist <strong>Reginald Punnett</strong> mentions
          this puzzle to his cricketing companion <strong>G. H. Hardy</strong>, who is one of the most celebrated
          pure mathematicians in Britain and who <em>detests</em> applied mathematics on principle. Hardy is
          annoyed enough to write a one-page letter to <em>Science</em> essentially under protest, titled{' '}
          <em>"Mendelian Proportions in a Mixed Population,"</em> explaining the answer in algebra a first-year
          probability student would understand.
        </p>
        <p>
          The letter appears in volume 28 of <em>Science</em>, July 10, 1908,
          pages 49-50. In Stuttgart, the physician <strong>Wilhelm Weinberg</strong> derives the same result
          independently earlier the same year. The result is now called the <strong>Hardy-Weinberg Theorem</strong>,
          and it is the single most important mathematical result in population genetics.
        </p>
      </div>

      {/* Prediction panel */}
      <QuestionPanel
        question="Punnett's intuition says dominant alleles should take over. You start with a Mimulus population at p(M) = 0.5 (equal frequencies of anthocyanin-producing M and non-producing m alleles), where M is dominant over m. After many generations of random mating (with no drift, no selection, no migration, no mutation), what do you predict?"
        correct={predCorrect}
        feedback={predCorrect === true
          ? 'Correct — you predicted what Hardy proved: the frequency stays put. Let\'s see it in simulation.'
          : predCorrect === false
          ? 'Not quite. Think carefully: dominance describes phenotype expression, not allele transmission. Each Mm heterozygote still passes on m to half its offspring.'
          : undefined}
      >
        <div className="flex gap-2 flex-wrap">
          {[
            { key: 'rises', label: 'p(M) rises toward 1.0 (dominance wins eventually)' },
            { key: 'stays', label: 'p(M) stays at 0.5 indefinitely' },
            { key: 'falls', label: 'p(M) falls toward 0.0 (recessives eventually win)' },
            { key: 'unknown', label: 'Cannot predict without more information' },
          ].map(opt => (
            <button key={opt.key} onClick={() => handlePrediction(opt.key)}
              className={`rounded-lg border-2 px-3 py-2 text-xs font-semibold transition-all text-left ${
                prediction === opt.key
                  ? predCorrect ? 'border-emerald-400 bg-emerald-50' : 'border-red-300 bg-red-50'
                  : 'border-stone-200 bg-white hover:border-stone-300'
              }`}>
              {opt.label}
            </button>
          ))}
        </div>
      </QuestionPanel>

      {/* Observation: trajectory visualizer */}
      {step >= 1 && (
        <>
          <AlleleTrajectoryVisualizer
            popSize={10000}
            initialFreqA={0.5}
            generations={20}
            nReplicates={1}
            yLabel="p(M)"
            presetLabel="Mimulus random mating, N = 10,000"
          />
          <p className="text-sm text-stone-500 italic text-center">
            The frequency stays flat — exactly what Hardy and Weinberg predicted.
          </p>

          {/* Hardy's algebra */}
          <div className="rounded-lg bg-violet-50 border border-violet-200 p-4 text-sm text-violet-900 space-y-3">
            <p className="font-hand text-lg font-bold text-violet-800">
              Hardy's one-page algebra
            </p>
            <p>
              If the allele frequency is <em>p</em>, then under random mating the gamete pool has frequency{' '}
              <em>p</em> for M and <em>q</em> = 1 − <em>p</em> for m. Random union of gametes produces
              zygotes at frequencies <em>p</em><sup>2</sup> : 2<em>pq</em> : <em>q</em><sup>2</sup> — the
              binomial expansion. The total frequency of M in the next generation is:
            </p>
            <div className="bg-white rounded-lg p-3 font-mono text-xs text-center">
              p' = (2·p² + 2pq) / (2·(p² + 2pq + q²)) = p² + pq = p(p + q) = p·1 = p
            </div>
            <p>
              <strong>The frequency doesn't change.</strong> Dominance describes phenotype expression, not
              allele transmission — and Mendelian inheritance at a single locus is frequency-conservative
              by construction.
            </p>
          </div>

          {/* Exit question */}
          <QuestionPanel
            question="Why does Hardy's one-page letter matter beyond settling a dinner dispute?"
            correct={exitCorrect}
            feedback={exitCorrect === true
              ? 'You just learned the single most important move in population genetics: Hardy-Weinberg is the null. Every experiment in this module breaks one of Hardy\'s five assumptions, and we\'ll use HWE as the baseline against which we detect each force — drift (Genetic Drift), selection (Natural Selection), migration (Migration), mutation-selection balance (Mutation-Selection), founder effect (Founder Effect).'
              : exitCorrect === false
              ? 'Think again: Hardy showed that under ideal conditions, allele frequencies don\'t change. What does that give us when we study real populations?'
              : undefined}
          >
            <div className="flex flex-col gap-2">
              {[
                { key: 'no_evolution', label: 'It proves that evolution cannot happen under Mendelian inheritance' },
                { key: 'null_hypothesis', label: 'It provides a null hypothesis: a population that is not evolving should have frequencies stable at p\u00B2 : 2pq : q\u00B2. Any deviation is evidence that one of the five forces is operating.' },
                { key: 'dominant_increase', label: 'It proves that dominant alleles become more common over time' },
                { key: 'mendel_wrong', label: 'It shows that Mendelian inheritance is wrong' },
              ].map(opt => (
                <button key={opt.key} onClick={() => handleExit(opt.key)}
                  className={`rounded-lg border-2 px-3 py-2 text-xs font-semibold transition-all text-left ${
                    exitAnswer === opt.key
                      ? exitCorrect ? 'border-emerald-400 bg-emerald-50' : 'border-red-300 bg-red-50'
                      : 'border-stone-200 bg-white hover:border-stone-300'
                  }`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </QuestionPanel>

          {/* Backward problem */}
          {forwardEverCorrect && (
            <>
            <hr className="border-stone-200" />
            <QuestionPanel
              question="You observe a Mimulus population where 25% of plants have the mm (cream) phenotype. If the population is in HWE, what is p(M)?"
              correct={backCorrect}
              feedback={backCorrect === true
                ? 'Correct! If 25% are mm, then q\u00B2 = 0.25, so q = \u221A0.25 = 0.5, and p = 1 \u2212 q = 0.5. The key insight: you must take the square root of the recessive phenotype frequency to get the recessive allele frequency, not use the phenotype frequency directly.'
                : backCorrect === false
                ? 'Remember: under HWE, the frequency of mm = q\u00B2. If 25% are mm, what is q? And then what is p = 1 \u2212 q?'
                : undefined}
            >
              <div className="text-xs font-semibold tracking-wider text-stone-500 uppercase mb-1 font-hand">
                Working backward
              </div>
              <div className="flex flex-col gap-2">
                {[
                  { key: 'a', label: 'p(M) = 0.75 (confused phenotype frequency with allele frequency)' },
                  { key: 'b', label: 'p(M) = 0.50 (q = \u221A0.25 = 0.5, so p = 0.5)' },
                  { key: 'c', label: 'p(M) = 0.25 (using mm frequency directly as allele frequency)' },
                  { key: 'd', label: 'Cannot determine p(M) from phenotype data alone' },
                ].map(opt => (
                  <button key={opt.key} onClick={() => {
                    setBackAnswer(opt.key);
                    const isCorrect = opt.key === 'b';
                    setBackCorrect(isCorrect);
                    if (isCorrect) setBackCompleted(true);
                  }}
                    disabled={backCompleted}
                    className={`rounded-lg border-2 px-3 py-2 text-xs font-semibold transition-all text-left ${
                      backAnswer === opt.key
                        ? backCorrect ? 'border-emerald-400 bg-emerald-50' : 'border-red-300 bg-red-50'
                        : 'border-stone-200 bg-white hover:border-stone-300'
                    } ${backCompleted ? 'opacity-70 cursor-default' : ''}`}>
                    ({opt.key}) {opt.label}
                  </button>
                ))}
              </div>
            </QuestionPanel>
          </>
          )}

          {/* What's next tease */}
          {backCorrect && (
            <div className="rounded-lg bg-stone-50 border border-stone-200 p-3 text-xs text-stone-700">
              <strong className="text-stone-800">What's next after PopGen?</strong> The next level up from here
              is <strong>quantitative genetics</strong> — when many loci each contribute a small effect, the
              population-level variance in trait value itself evolves, and the math is the{' '}
              <strong>breeder's equation</strong> R = h²S (Lush 1937). Adjacent:{' '}
              <strong>association mapping / GWAS</strong>, which sits on top of the linkage disequilibrium from
              the Linkage module plus the population structure from this module.
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Experiment 1: Allele Frequencies ─────────────────────────────────────

function Exp1_AlleleFrequencies({ onComplete }: { onComplete: () => void }) {
  const [pop] = useState(() => {
    const result = simulate({ popSize: 50, initialFreqA: 0.6, generations: 0 });
    return result.genotypeHistory[0];
  });

  const totalAlleles = (pop.AA + pop.Aa + pop.aa) * 2;
  const countM = 2 * pop.AA + pop.Aa;
  const countm = pop.Aa + 2 * pop.aa;
  const trueP = countM / totalAlleles;
  const trueQ = countm / totalAlleles;

  const [visualEstimate, setVisualEstimate] = useState('');
  const [visualCorrect, setVisualCorrect] = useState<boolean | null>(null);
  const [pInput, setPInput] = useState('');
  const [qInput, setQInput] = useState('');
  const [correct, setCorrect] = useState<boolean | null>(null);
  const [forwardEverCorrect, setForwardEverCorrect] = useState(false);
  const [backInput, setBackInput] = useState('');
  const [backCorrect, setBackCorrect] = useState<boolean | null>(null);
  const [backCompleted1, setBackCompleted1] = useState(false);

  useEffect(() => {
    if (!backCompleted1) return;
    const t = setTimeout(onComplete, 1500);
    return () => clearTimeout(t);
  }, [backCompleted1, onComplete]);

  const handleCheck = () => {
    const pVal = parseFloat(pInput);
    const qVal = parseFloat(qInput);
    const pOk = Math.abs(pVal - trueP) < 0.03;
    const qOk = Math.abs(qVal - trueQ) < 0.03;
    const isCorrect = pOk && qOk;
    setCorrect(isCorrect);
    if (isCorrect) setForwardEverCorrect(true);
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-stone-600">
        Below is a natural population of <strong>~50 <em>Mimulus guttatus</em></strong> (yellow monkeyflower)
        plants sampled from a serpentine-soil site. Each plant is diploid at the anthocyanin pigmentation
        locus with two alleles: <strong>M</strong> (anthocyanin, dominant) and <strong>m</strong> (null).
        Genotypes: <strong>MM</strong> (deep magenta), <strong>Mm</strong> (pink-magenta), or <strong>mm</strong> (cream/pale).
      </p>

      <PopulationGrid genotypes={pop} colorScheme="mimulus" />

      {/* Fix 10: Prediction step -- visual estimation before counting */}
      <QuestionPanel
        question="Looking at the grid of Mimulus plants, estimate p(M) before counting. Is it closer to 0.3, 0.5, or 0.7?"
        correct={visualCorrect}
        feedback={visualCorrect === true
          ? `Good eye! The actual p(M) = ${trueP.toFixed(3)}. Now count precisely to verify.`
          : visualCorrect === false
          ? `Not quite \u2014 the actual p(M) = ${trueP.toFixed(3)}. Visual estimation is a useful first check, but always count to be sure.`
          : undefined}
      >
        <div className="flex gap-2 flex-wrap">
          {[
            { key: '0.3', label: 'Closer to 0.3' },
            { key: '0.5', label: 'Closer to 0.5' },
            { key: '0.7', label: 'Closer to 0.7' },
          ].map(opt => {
            const optVal = parseFloat(opt.key);
            const diffs = [Math.abs(trueP - 0.3), Math.abs(trueP - 0.5), Math.abs(trueP - 0.7)];
            const closestIdx = diffs.indexOf(Math.min(...diffs));
            const closestVal = [0.3, 0.5, 0.7][closestIdx];
            return (
              <button key={opt.key} onClick={() => {
                setVisualEstimate(opt.key);
                setVisualCorrect(optVal === closestVal);
              }}
                className={`rounded-lg border-2 px-3 py-2 text-xs font-semibold transition-all ${
                  visualEstimate === opt.key
                    ? visualCorrect ? 'border-emerald-400 bg-emerald-50' : 'border-red-300 bg-red-50'
                    : 'border-stone-200 bg-white hover:border-stone-300'
                }`}>
                {opt.label}
              </button>
            );
          })}
        </div>
      </QuestionPanel>

      <div className="rounded-lg bg-violet-50 border border-violet-200 p-3 text-sm text-violet-800">
        <strong>Your task:</strong> Count the genotypes directly from the grid above.
        There are <strong>{pop.AA + pop.Aa + pop.aa}</strong> diploid plants,
        so <strong>{totalAlleles}</strong> alleles total. Then compute p and q.
      </div>

      <QuestionPanel
        question={`Calculate the allele frequencies. Remember: p = freq(M) = (2 × MM + Mm) / (2N), and q = 1 - p.`}
        correct={correct}
        feedback={correct === true
          ? `Correct! p(M) = ${trueP.toFixed(3)}, q(m) = ${trueQ.toFixed(3)}. Allele frequency is the proportion of a specific allele in the population. Note p + q = 1.`
          : correct === false
          ? `Not quite. Look carefully at the grid and count how many deep magenta (MM), pink (Mm), and cream (mm) circles you see. Then use p = (2·MM + Mm) / (2N). Each MM contributes 2 M alleles; each Mm contributes 1.`
          : undefined}
      >
        <div className="flex gap-3 items-end flex-wrap">
          <div>
            <label className="block text-xs text-stone-500 mb-1">p (freq of M)</label>
            <input type="number" step="0.01" min="0" max="1" value={pInput}
              onChange={e => setPInput(e.target.value)}
              className="w-24 rounded-lg border-2 border-stone-200 px-2 py-1.5 text-sm focus:border-violet-400 outline-none" />
          </div>
          <div>
            <label className="block text-xs text-stone-500 mb-1">q (freq of m)</label>
            <input type="number" step="0.01" min="0" max="1" value={qInput}
              onChange={e => setQInput(e.target.value)}
              className="w-24 rounded-lg border-2 border-stone-200 px-2 py-1.5 text-sm focus:border-violet-400 outline-none" />
          </div>
          <button onClick={handleCheck}
            className="rounded-xl bg-gradient-to-b from-violet-700 to-violet-800 px-5 py-2 text-sm font-bold text-white shadow-md hover:shadow-lg">
            Check
          </button>
        </div>
      </QuestionPanel>

      {/* Backward problem */}
      {forwardEverCorrect && (
        <QuestionPanel
          question="A population has p\u0302(M) = 0.12 for the anthocyanin allele. If you sampled N = 100 Mimulus plants and sequenced all 200 alleles, approximately how many M alleles would you expect to see?"
          correct={backCorrect}
          feedback={backCorrect === true
            ? 'Correct! Expected count = 2N \u00D7 p = 200 \u00D7 0.12 = 24 M alleles.'
            : backCorrect === false
            ? 'Remember: the expected count of M alleles = 2N \u00D7 p. With N = 100 diploid plants, there are 200 alleles total.'
            : undefined}
        >
          <div className="text-xs font-semibold tracking-wider text-stone-500 uppercase mb-1 font-hand">
            Working backward
          </div>
          <div className="flex gap-3 items-end flex-wrap">
            <div>
              <label className="block text-xs text-stone-500 mb-1">Expected M allele count</label>
              <input type="number" step="1" min="0" max="200" value={backInput}
                onChange={e => setBackInput(e.target.value)}
                className="w-24 rounded-lg border-2 border-stone-200 px-2 py-1.5 text-sm focus:border-violet-400 outline-none" />
            </div>
            <button onClick={() => {
              const val = parseInt(backInput, 10);
              const isCorrect = !Number.isNaN(val) && Math.abs(val - 24) <= 3;
              setBackCorrect(isCorrect);
              if (isCorrect) setBackCompleted1(true);
            }}
              disabled={backCompleted1}
              className="rounded-xl bg-gradient-to-b from-violet-700 to-violet-800 px-5 py-2 text-sm font-bold text-white shadow-md hover:shadow-lg disabled:opacity-50">
              Check
            </button>
          </div>
        </QuestionPanel>
      )}

      {/* Linkage handoff callout — supplementary for students coming from the Linkage module */}
      <details className="rounded-lg bg-stone-50 border border-stone-200 p-3 text-xs text-stone-700">
        <summary className="cursor-pointer font-semibold text-stone-800">Coming from the Linkage module?</summary>
        <p className="mt-2">
          Population genetics is where the recombination frequency you just learned to measure shows up again.
          When two alleles at linked loci travel together in a population for many generations, they build up
          a correlation called <strong>linkage disequilibrium</strong> (LD). LD decays over time at a rate
          proportional to 1 {'\u2212'} <em>r</em>, where <em>r</em> is the recombination frequency between the
          loci — so tightly-linked loci can stay in LD for thousands of generations, while loosely-linked loci
          randomize within dozens.
        </p>
      </details>
    </div>
  );
}

// ── Experiment 2: Hardy-Weinberg Equilibrium ────────────────────────────

function Exp2_HardyWeinberg({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const [p] = useState(0.6);
  const [predAA, setPredAA] = useState('');
  const [predAa, setPredAa] = useState('');
  const [predaa, setPredaa] = useState('');
  const [predCorrect, setPredCorrect] = useState<boolean | null>(null);

  // Step 2: stochastic sample
  const [sampleData, setSampleData] = useState<{ obs: { AA: number; Aa: number; aa: number }; pHat: number; hwe: ReturnType<typeof testHWE> } | null>(null);

  // Step 3: chi-square quiz
  const [chiAnswer, setChiAnswer] = useState('');
  const [chiCorrect, setChiCorrect] = useState<boolean | null>(null);

  // Step 4: selection follow-up
  const [selData, setSelData] = useState<{ obs: { AA: number; Aa: number; aa: number }; hwe: ReturnType<typeof testHWE> } | null>(null);
  const [selAnswer, setSelAnswer] = useState('');
  const [selCorrect, setSelCorrect] = useState<boolean | null>(null);

  // Backward problem
  const [forwardEverCorrect, setForwardEverCorrect] = useState(false);
  const [backAnswer, setBackAnswer] = useState('');
  const [backCorrect, setBackCorrect] = useState<boolean | null>(null);
  const [backCompleted2, setBackCompleted2] = useState(false);

  useEffect(() => {
    if (!backCompleted2) return;
    const t = setTimeout(onComplete, 1500);
    return () => clearTimeout(t);
  }, [backCompleted2, onComplete]);

  // Noise literacy panel state (kept from Phase 1)
  const [showNoise, setShowNoise] = useState(false);
  const [noiseSmall, setNoiseSmall] = useState<{ p: number; se: number } | null>(null);
  const [noiseLarge, setNoiseLarge] = useState<{ p: number; se: number } | null>(null);

  const hw = hardyWeinberg(p);

  const handlePredict = () => {
    const aa = parseFloat(predAA);
    const ab = parseFloat(predAa);
    const bb = parseFloat(predaa);
    const ok = Math.abs(aa - hw.AA) < 0.03 && Math.abs(ab - hw.Aa) < 0.03 && Math.abs(bb - hw.aa) < 0.03;
    setPredCorrect(ok);
    if (ok) setStep(1);
  };

  const handleSample = () => {
    const obs = sampleZygotes(1000, p);
    const total = obs.AA + obs.Aa + obs.aa;
    const pHat = (2 * obs.AA + obs.Aa) / (2 * total);
    const hwe = testHWE(obs);
    setSampleData({ obs, pHat, hwe });
    setStep(2);
  };

  const getChiCorrectAnswer = () => {
    if (!sampleData) return '';
    return sampleData.hwe.chiSquare < 3.84 ? 'yes' : 'no';
  };

  const handleChiAnswer = (ans: string) => {
    setChiAnswer(ans);
    const correctAns = getChiCorrectAnswer();
    const isCorrect = ans === correctAns;
    setChiCorrect(isCorrect);
    if (isCorrect) setStep(3);
  };

  const chiWrongFeedback = () => {
    if (!sampleData) return '';
    const correctAns = getChiCorrectAnswer();
    if (chiAnswer === 'no' && correctAns === 'yes') {
      return `The observed X\u00B2 = ${sampleData.hwe.chiSquare.toFixed(3)} is below 3.84 \u2014 small deviations from exact HWE are just sampling noise at N=1000.`;
    }
    if (chiAnswer === 'perfect') {
      return 'The sample never matches expected perfectly \u2014 there is always sampling noise. HWE is a statistical null hypothesis, not an exact prediction.';
    }
    if (chiAnswer === 'cannot_tell') {
      return 'We have plenty of data \u2014 N=1000 gives a chi-square test with good power.';
    }
    if (chiAnswer === 'yes' && correctAns === 'no') {
      return `The observed X\u00B2 = ${sampleData.hwe.chiSquare.toFixed(3)} exceeds the critical value of 3.84, so we reject the null hypothesis of HWE at \u03B1 = 0.05.`;
    }
    return 'Look at the computed X\u00B2 value and compare it to the critical value of 3.84.';
  };

  const handleRunSelection = () => {
    // Apply one generation of selection: wAA=1, wAa=1, waa=0.5
    const wAA = 1, wAa = 1, waa = 0.5;
    const q = 1 - p;
    const wBar = p * p * wAA + 2 * p * q * wAa + q * q * waa;
    const pAfterSel = (p * p * wAA + p * q * wAa) / wBar;
    const obs = sampleZygotes(1000, pAfterSel);
    const hwe = testHWE(obs);
    setSelData({ obs, hwe });
    setStep(4);
  };

  const handleSelAnswer = (ans: string) => {
    setSelAnswer(ans);
    // After selection, chi-square should be large (testing against HWE expected from post-selection p-hat,
    // but the genotype frequencies from the post-selection gamete pool ARE in HWE because sampleZygotes
    // draws from random mating). The real test: genotype counts vs HWE expectations from the ORIGINAL p.
    // Actually, testHWE computes expected from the observed p-hat, so it will still likely pass HWE.
    // The pedagogically correct approach: test the post-selection sample against the ORIGINAL p=0.6 expectations.
    // We need to do a manual chi-square against original HWE expectations.
    const isCorrect = ans === 'no';
    setSelCorrect(isCorrect);
    if (isCorrect) setForwardEverCorrect(true);
  };

  // Manual chi-square of selection sample against original HWE (p=0.6)
  const selChiSquare = useMemo(() => {
    if (!selData) return null;
    const N = selData.obs.AA + selData.obs.Aa + selData.obs.aa;
    const expAA = hw.AA * N;
    const expAa = hw.Aa * N;
    const expaa = hw.aa * N;
    const chi = ((selData.obs.AA - expAA) ** 2) / expAA
              + ((selData.obs.Aa - expAa) ** 2) / expAa
              + ((selData.obs.aa - expaa) ** 2) / expaa;
    return chi;
  }, [selData, hw]);

  const runNoiseLiteracy = () => {
    const pNoise = 0.6;
    const small = simulate({ popSize: 50, initialFreqA: pNoise, generations: 1 });
    const smallP = small.freqHistory[1];
    const smallSE = Math.sqrt(pNoise * (1 - pNoise) / (2 * 50));
    const large = simulate({ popSize: 5000, initialFreqA: pNoise, generations: 1 });
    const largeP = large.freqHistory[1];
    const largeSE = Math.sqrt(pNoise * (1 - pNoise) / (2 * 5000));
    setNoiseSmall({ p: smallP, se: smallSE });
    setNoiseLarge({ p: largeP, se: largeSE });
    setShowNoise(true);
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-stone-600">
        Continuing with our <em>Mimulus guttatus</em> population: if p(M) = <strong>{p}</strong> and
        q(m) = <strong>{(1 - p).toFixed(1)}</strong>, and mating is random with no selection, drift,
        migration, or mutation — what genotype frequencies do you expect?
      </p>

      <div className="rounded-lg bg-violet-50 border border-violet-200 p-3 text-sm text-violet-800">
        <strong>Hardy-Weinberg Principle:</strong> Under ideal conditions, genotype frequencies are
        p{'\u00B2'} (MM), 2pq (Mm), q{'\u00B2'} (mm) after one generation of random mating.
      </div>

      <div className="rounded-lg bg-stone-50 border border-stone-200 p-3 text-xs text-stone-700">
        <strong className="text-stone-800">HWE assumes all five of the following:</strong>
        <ol className="list-decimal ml-5 mt-1 space-y-0.5">
          <li>Large population (no genetic drift)</li>
          <li>Random mating (no assortative mating or inbreeding)</li>
          <li>No selection (all genotypes equally fit)</li>
          <li>No mutation (no new alleles)</li>
          <li>No migration (a closed population)</li>
        </ol>
        <div className="mt-1 italic">When any of these break, the population departs from HWE.</div>
      </div>

      {/* Step 1: Predict genotype frequencies */}
      <QuestionPanel
        question={`With p = ${p}, predict the Mimulus genotype frequencies (to 2 decimal places):`}
        correct={predCorrect}
        feedback={predCorrect === true
          ? `Correct! MM = p\u00B2 = ${hw.AA.toFixed(2)}, Mm = 2pq = ${hw.Aa.toFixed(2)}, mm = q\u00B2 = ${hw.aa.toFixed(2)}. These sum to 1.`
          : predCorrect === false
          ? `Remember: MM = p\u00B2 = ${p}\u00B2, Mm = 2pq = 2(${p})(${(1 - p).toFixed(2)}), mm = q\u00B2 = ${(1 - p).toFixed(2)}\u00B2.`
          : undefined}
      >
        <div className="flex gap-3 items-end flex-wrap">
          <div>
            <label className="block text-xs text-stone-500 mb-1">freq(MM) = p{'\u00B2'}</label>
            <input type="number" step="0.01" min="0" max="1" value={predAA}
              onChange={e => setPredAA(e.target.value)}
              className="w-24 rounded-lg border-2 border-stone-200 px-2 py-1.5 text-sm focus:border-violet-400 outline-none" />
          </div>
          <div>
            <label className="block text-xs text-stone-500 mb-1">freq(Mm) = 2pq</label>
            <input type="number" step="0.01" min="0" max="1" value={predAa}
              onChange={e => setPredAa(e.target.value)}
              className="w-24 rounded-lg border-2 border-stone-200 px-2 py-1.5 text-sm focus:border-violet-400 outline-none" />
          </div>
          <div>
            <label className="block text-xs text-stone-500 mb-1">freq(mm) = q{'\u00B2'}</label>
            <input type="number" step="0.01" min="0" max="1" value={predaa}
              onChange={e => setPredaa(e.target.value)}
              className="w-24 rounded-lg border-2 border-stone-200 px-2 py-1.5 text-sm focus:border-violet-400 outline-none" />
          </div>
          <button onClick={handlePredict}
            className="rounded-xl bg-gradient-to-b from-violet-700 to-violet-800 px-5 py-2 text-sm font-bold text-white shadow-md hover:shadow-lg">
            Check
          </button>
        </div>
      </QuestionPanel>

      {/* Step 2: Stochastic sample */}
      {step >= 1 && (
        <div className="space-y-3">
          <p className="text-sm text-stone-600">
            Now sample 1000 diploid <em>Mimulus</em> zygotes from a random-mating population at p(M) = {p}.
            This is a <strong>real stochastic sample</strong> — the counts will not be exactly p{'\u00B2'}{'\u00B7'}N.
          </p>
          <button onClick={handleSample}
            className="rounded-xl bg-gradient-to-b from-violet-700 to-violet-800 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:shadow-lg">
            Sample 1000 Zygotes
          </button>
        </div>
      )}

      {step >= 2 && sampleData && (
        <div className="space-y-4">
          {/* Observed vs Expected table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-stone-100">
                  <th className="border border-stone-200 px-3 py-2 text-left">Genotype</th>
                  <th className="border border-stone-200 px-3 py-2 text-right">Observed</th>
                  <th className="border border-stone-200 px-3 py-2 text-right">Expected (HWE)</th>
                  <th className="border border-stone-200 px-3 py-2 text-right">(O{'\u2212'}E){'\u00B2'}/E</th>
                </tr>
              </thead>
              <tbody>
                {(['AA', 'Aa', 'aa'] as const).map(g => {
                  const label = g === 'AA' ? 'MM' : g === 'Aa' ? 'Mm' : 'mm';
                  const obs = sampleData.obs[g];
                  const exp = sampleData.hwe.expected[g];
                  const component = exp > 0 ? ((obs - exp) ** 2) / exp : 0;
                  return (
                    <tr key={g}>
                      <td className="border border-stone-200 px-3 py-1.5 font-bold text-stone-700">{label}</td>
                      <td className="border border-stone-200 px-3 py-1.5 text-right font-mono text-violet-700">{obs}</td>
                      <td className="border border-stone-200 px-3 py-1.5 text-right font-mono text-stone-600">{exp.toFixed(1)}</td>
                      <td className="border border-stone-200 px-3 py-1.5 text-right font-mono text-stone-600">{component.toFixed(3)}</td>
                    </tr>
                  );
                })}
                <tr className="bg-stone-50 font-bold">
                  <td className="border border-stone-200 px-3 py-1.5 text-right" colSpan={3}>Total X{'\u00B2'} =</td>
                  <td className="border border-stone-200 px-3 py-1.5 text-right font-mono text-violet-800">{sampleData.hwe.chiSquare.toFixed(3)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="rounded-lg bg-stone-50 border border-stone-200 p-3 text-xs text-stone-700">
            <strong>Observed p-hat:</strong> {sampleData.pHat.toFixed(4)} (true p = {p})
            <br />
            <strong>Chi-square formula:</strong> X{'\u00B2'} = {'\u03A3'} (O{'\u2212'}E){'\u00B2'}/E, df = 1 (3 classes {'\u2212'} 1 parameter {'\u2212'} 1)
            <br />
            <strong>Critical value:</strong> X{'\u00B2'}<sub>0.05,1</sub> = 3.84. If X{'\u00B2'} {'<'} 3.84, fail to reject HWE.
            <br />
            <strong>p-value:</strong> {sampleData.hwe.pValue.toFixed(4)}
          </div>

          {/* Step 3: Chi-square puzzle */}
          <QuestionPanel
            question={`Based on this chi-square test (X\u00B2 = ${sampleData.hwe.chiSquare.toFixed(3)}, critical value = 3.84), is this Mimulus population in Hardy-Weinberg equilibrium?`}
            correct={chiCorrect}
            feedback={chiCorrect === true
              ? sampleData.hwe.chiSquare < 3.84
                ? `Correct! X\u00B2 = ${sampleData.hwe.chiSquare.toFixed(3)} < 3.84. We fail to reject HWE. The observed deviations from p\u00B2, 2pq, q\u00B2 are within the range expected from sampling noise alone. Random mating produces HWE in just one generation.`
                : `Correct! X\u00B2 = ${sampleData.hwe.chiSquare.toFixed(3)} \u2265 3.84, so we reject HWE at \u03B1 = 0.05. This can happen about 5% of the time even when the null is true \u2014 a Type I error. Try re-sampling to see how often this occurs.`
              : chiCorrect === false
              ? chiWrongFeedback()
              : undefined}
          >
            <div className="flex gap-2 flex-wrap">
              {[
                { key: 'yes', label: 'Yes \u2014 fail to reject HWE' },
                { key: 'no', label: 'No \u2014 reject HWE' },
                { key: 'perfect', label: 'It matches perfectly' },
                { key: 'cannot_tell', label: 'Cannot tell from these data' },
              ].map(opt => (
                <button key={opt.key} onClick={() => handleChiAnswer(opt.key)}
                  className={`rounded-lg border-2 px-3 py-2 text-xs font-semibold transition-all ${
                    chiAnswer === opt.key
                      ? chiCorrect ? 'border-emerald-400 bg-emerald-50' : 'border-red-300 bg-red-50'
                      : 'border-stone-200 bg-white hover:border-stone-300'
                  }`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </QuestionPanel>
        </div>
      )}

      {/* Step 4: Selection follow-up */}
      {step >= 3 && (
        <div className="space-y-4">
          <div className="rounded-lg bg-violet-50 border border-violet-200 p-3 text-sm text-violet-800">
            <strong>What if we break an assumption?</strong> Let's apply one generation of <strong>selection
            against mm</strong> (w<sub>MM</sub> = 1, w<sub>Mm</sub> = 1, w<sub>mm</sub> = 0.5), then
            sample 1000 zygotes and test them against the <em>original</em> HWE expectations (p = {p}).
          </div>
          {!selData && (
            <button onClick={handleRunSelection}
              className="rounded-xl bg-gradient-to-b from-violet-700 to-violet-800 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:shadow-lg">
              Apply Selection + Sample
            </button>
          )}
          {selData && selChiSquare !== null && (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-stone-100">
                      <th className="border border-stone-200 px-3 py-2 text-left">Genotype</th>
                      <th className="border border-stone-200 px-3 py-2 text-right">Observed (after selection)</th>
                      <th className="border border-stone-200 px-3 py-2 text-right">Expected (original HWE, p={p})</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(['AA', 'Aa', 'aa'] as const).map(g => {
                      const label = g === 'AA' ? 'MM' : g === 'Aa' ? 'Mm' : 'mm';
                      const N = selData.obs.AA + selData.obs.Aa + selData.obs.aa;
                      const exp = (g === 'AA' ? hw.AA : g === 'Aa' ? hw.Aa : hw.aa) * N;
                      return (
                        <tr key={g}>
                          <td className="border border-stone-200 px-3 py-1.5 font-bold text-stone-700">{label}</td>
                          <td className="border border-stone-200 px-3 py-1.5 text-right font-mono text-violet-700">{selData.obs[g]}</td>
                          <td className="border border-stone-200 px-3 py-1.5 text-right font-mono text-stone-600">{exp.toFixed(1)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="rounded-lg bg-stone-50 border border-stone-200 p-3 text-xs text-stone-700">
                <strong>X{'\u00B2'} (vs original HWE):</strong> <span className="font-mono text-violet-800">{selChiSquare.toFixed(2)}</span>
                {selChiSquare >= 3.84
                  ? <span className="text-red-700 font-bold"> {'\u226B'} 3.84 \u2014 massively significant!</span>
                  : <span className="text-emerald-700"> {'<'} 3.84</span>}
              </div>

              <QuestionPanel
                question={`After one generation of selection against mm (X\u00B2 = ${selChiSquare.toFixed(2)} vs original HWE at p = ${p}), is this population still in Hardy-Weinberg equilibrium relative to the original p = ${p}?`}
                correct={selCorrect}
                feedback={selCorrect === true
                  ? `Correct! The chi-square is large not because random mating broke, but because the allele frequency shifted. Selection changed p from ${p} to ~${((p * p * 1 + p * (1 - p) * 1) / (p * p * 1 + 2 * p * (1 - p) * 1 + (1 - p) * (1 - p) * 0.5)).toFixed(3)} in just one generation. The post-selection genotypes ARE in HWE at their new p \u2014 random mating still works fine. But HWE assumes allele frequencies don't change, and selection violates that assumption.`
                  : selCorrect === false
                  ? `Look at X\u00B2 = ${selChiSquare.toFixed(2)}. That is far above 3.84. Selection against mm shifted the allele frequency away from p = ${p}, so the genotypes no longer match the original HWE expectations.`
                  : undefined}
              >
                <div className="flex gap-2 flex-wrap">
                  {[
                    { key: 'yes', label: 'Yes \u2014 still in HWE' },
                    { key: 'no', label: 'No \u2014 not in HWE' },
                    { key: 'closer', label: 'Even closer to HWE than before' },
                  ].map(opt => (
                    <button key={opt.key} onClick={() => handleSelAnswer(opt.key)}
                      className={`rounded-lg border-2 px-3 py-2 text-xs font-semibold transition-all ${
                        selAnswer === opt.key
                          ? selCorrect ? 'border-emerald-400 bg-emerald-50' : 'border-red-300 bg-red-50'
                          : 'border-stone-200 bg-white hover:border-stone-300'
                      }`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </QuestionPanel>
            </div>
          )}
        </div>
      )}

      {/* Noise literacy panel (kept from Phase 1) */}
      {step >= 3 && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-stone-700">How precise is your estimate?</p>
          <p className="text-xs text-stone-600">
            When you sample allele frequencies from a real population, your estimate carries sampling noise.
            The standard error of p-hat scales as {'\u221A'}(p(1{'\u2212'}p) / (2N)).
            Compare a small vs. large <em>Mimulus</em> sample, both drawn from p = 0.6:
          </p>
          <button onClick={runNoiseLiteracy}
            className="rounded-xl bg-gradient-to-b from-violet-700 to-violet-800 px-5 py-2 text-sm font-bold text-white shadow-md hover:shadow-lg">
            Sample N=50 vs N=5000
          </button>

          {showNoise && noiseSmall && noiseLarge && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-lg bg-stone-50 border p-3 text-center">
                <div className="text-sm font-bold text-stone-700">N = 50 plants</div>
                <div className="text-xs text-stone-500 mt-1">
                  Observed p-hat = <span className="font-mono text-violet-700">{noiseSmall.p.toFixed(3)}</span>
                </div>
                <div className="text-xs text-stone-500">
                  SE = {noiseSmall.se.toFixed(4)} &rarr; {'\u00B1'}2 SE band: [{Math.max(0, 0.6 - 2 * noiseSmall.se).toFixed(3)}, {Math.min(1, 0.6 + 2 * noiseSmall.se).toFixed(3)}]
                </div>
              </div>
              <div className="rounded-lg bg-stone-50 border p-3 text-center">
                <div className="text-sm font-bold text-stone-700">N = 5000 plants</div>
                <div className="text-xs text-stone-500 mt-1">
                  Observed p-hat = <span className="font-mono text-violet-700">{noiseLarge.p.toFixed(3)}</span>
                </div>
                <div className="text-xs text-stone-500">
                  SE = {noiseLarge.se.toFixed(4)} &rarr; {'\u00B1'}2 SE band: [{Math.max(0, 0.6 - 2 * noiseLarge.se).toFixed(3)}, {Math.min(1, 0.6 + 2 * noiseLarge.se).toFixed(3)}]
                </div>
              </div>
              <div className="md:col-span-2 text-xs text-stone-600 italic">
                The {'\u00B1'}2 SE band is ~10{'\u00D7'} wider for N=50 than N=5000. Sample size matters for precision.
                When you read a published allele frequency, always ask: how large was the sample?
              </div>
            </div>
          )}
        </div>
      )}

      {/* Hardy-Weinberg historical callout (kept from Phase 1) */}
      {step >= 3 && (
        <div className="rounded-lg bg-stone-50 border border-stone-200 p-3 text-xs text-stone-700">
          <strong className="text-stone-800">The Hardy-Weinberg Theorem (Hardy 1908; Weinberg 1908).</strong>{' '}
          In a large, randomly mating population with no selection, no migration, and no mutation, allele
          frequencies stay constant from generation to generation and genotype frequencies reach the values
          p{'\u00B2'}, 2pq, q{'\u00B2'} after a single generation of random mating. The result was derived
          independently in 1908 by <strong>G. H. Hardy</strong>, a Cambridge mathematician pressed into
          service by Reginald Punnett over a cricket dinner to refute a bad population-level argument, and{' '}
          <strong>Wilhelm Weinberg</strong>, a Stuttgart physician working on twin studies. Hardy published
          his result as a one-page letter to <em>Science</em>; it is one of the founding documents of
          20th-century population genetics.
          <br /><br />
          <strong>This theorem has five assumptions</strong> (large population, random mating, no selection,
          no mutation, no migration). When any one breaks, the population departs from HWE — and the next
          five experiments each violate at least one: drift (small population), selection,
          migration, mutation + selection together, and the founder effect (an extreme
          case of drift at the moment of colonization).
        </div>
      )}

      {/* Backward problem */}
      {forwardEverCorrect && (
        <QuestionPanel
          question="You sample 500 Mimulus plants and observe {MM: 50, Mm: 100, mm: 350}. Compute p\u0302(M) and decide: is this population in HWE?"
          correct={backCorrect}
          feedback={backCorrect === true
            ? 'Correct! p\u0302 = (2\u00D750 + 100)/(2\u00D7500) = 200/1000 = 0.20. Expected under HWE: MM = 0.04\u00D7500 = 20, Mm = 0.32\u00D7500 = 160, mm = 0.64\u00D7500 = 320. X\u00B2 = (50\u221220)\u00B2/20 + (100\u2212160)\u00B2/160 + (350\u2212320)\u00B2/320 = 45 + 22.5 + 2.8 = 70.3, vastly exceeding 3.84. The heterozygote deficit (100 observed vs 160 expected) is the signature of inbreeding.'
            : backCorrect === false
            ? 'First compute p\u0302: count M alleles = 2\u00D7MM + Mm, total alleles = 2\u00D7500. Then compute HWE expected counts and X\u00B2. Compare to 3.84.'
            : undefined}
        >
          <div className="text-xs font-semibold tracking-wider text-stone-500 uppercase mb-1 font-hand">
            Working backward
          </div>
          <div className="flex flex-col gap-2">
            {[
              { key: 'a', label: 'p\u0302 = 0.20, X\u00B2 \u2248 70, strongly reject HWE \u2014 deficit of heterozygotes suggests inbreeding' },
              { key: 'b', label: 'p\u0302 = 0.20, in HWE \u2014 observed matches expected' },
              { key: 'c', label: 'p\u0302 = 0.40, X\u00B2 \u2248 0, in HWE' },
              { key: 'd', label: 'Cannot tell without more data' },
            ].map(opt => (
              <button key={opt.key} onClick={() => {
                setBackAnswer(opt.key);
                const isCorrect = opt.key === 'a';
                setBackCorrect(isCorrect);
                if (isCorrect) setBackCompleted2(true);
              }}
                disabled={backCompleted2}
                className={`rounded-lg border-2 px-3 py-2 text-xs font-semibold transition-all text-left ${
                  backAnswer === opt.key
                    ? backCorrect ? 'border-emerald-400 bg-emerald-50' : 'border-red-300 bg-red-50'
                    : 'border-stone-200 bg-white hover:border-stone-300'
                } ${backCompleted2 ? 'opacity-70 cursor-default' : ''}`}>
                ({opt.key}) {opt.label}
              </button>
            ))}
          </div>
        </QuestionPanel>
      )}
    </div>
  );
}

// ── Experiment 3: Genetic Drift ─────────────────────────────────────────

function Exp3_GeneticDrift({ onComplete }: { onComplete: () => void }) {
  const [hasRun, setHasRun] = useState(false);
  const [smallFixedCount, setSmallFixedCount] = useState(0);
  const [smallFixedACount, setSmallFixedACount] = useState(0);
  const [largeFinalRange, setLargeFinalRange] = useState<{ min: number; max: number } | null>(null);
  const [answer, setAnswer] = useState('');
  const [correct, setCorrect] = useState<boolean | null>(null);

  // Quantitative prediction: how many of nReps (N=20, p0=0.5) fix the M allele?
  const [fixMPred, setFixMPred] = useState('');
  const [fixMPredCorrect, setFixMPredCorrect] = useState<boolean | null>(null);
  const [predictionLocked, setPredictionLocked] = useState(false);

  // Backward problem
  const [forwardEverCorrect, setForwardEverCorrect] = useState(false);
  const [backAnswer, setBackAnswer] = useState('');
  const [backCorrect, setBackCorrect] = useState<boolean | null>(null);
  const [backCompleted3, setBackCompleted3] = useState(false);

  useEffect(() => {
    if (!backCompleted3) return;
    const t = setTimeout(onComplete, 1500);
    return () => clearTimeout(t);
  }, [backCompleted3, onComplete]);

  // Simulation key to force re-render of AlleleTrajectoryVisualizer
  const [simKey, setSimKey] = useState(0);

  const nReps = 10;
  const gens = 50;
  const initialFreq = 0.5;

  const checkFixMPred = () => {
    const guess = parseInt(fixMPred, 10);
    if (Number.isNaN(guess)) { setFixMPredCorrect(false); return; }
    const ok = guess >= 3 && guess <= 7;
    setFixMPredCorrect(ok);
    if (ok) setPredictionLocked(true);
  };

  const handleSmallSimComplete = useCallback((results: { freqHistories: number[][]; fixedCount: number; fixedACount: number }) => {
    setSmallFixedCount(results.fixedCount);
    setSmallFixedACount(results.fixedACount);
    setHasRun(true);
  }, []);

  const handleLargeSimComplete = useCallback((results: { freqHistories: number[][] }) => {
    const finals = results.freqHistories.map(h => h[h.length - 1]);
    setLargeFinalRange({ min: Math.min(...finals), max: Math.max(...finals) });
  }, []);

  const runSim = () => {
    setSimKey(k => k + 1);
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-stone-600">
        Does population size matter for allele frequency change? Imagine <em>Mimulus guttatus</em> growing
        on serpentine soil sites: a <strong>tiny roadside patch (N=20 plants)</strong> vs a{' '}
        <strong>larger hillside population (N=500)</strong>, both starting at p(M) = {initialFreq} for the
        anthocyanin locus, with no selection.
      </p>

      {/* 1.3 — Molecular drift callout */}
      <div className="rounded-lg bg-violet-50 border border-violet-200 p-3 text-sm text-violet-800">
        <strong>Drift is sampling.</strong> In a diploid population of N = 20 plants, there are exactly
        40 alleles at each locus. The next generation is formed by drawing 40 gametes from these parents,
        and even when the true frequency is p = 0.5, the sampled count isn't going to be exactly 20 M
        and 20 m — just like 40 coin flips aren't going to land exactly 20 heads and 20 tails. The sample
        count of M alleles follows a binomial distribution with mean 2Np and variance 2N {'\u00B7'} p(1 {'\u2212'} p).
        Since allele frequency = count / (2N), dividing the count variance by (2N){'\u00B2'} gives:
        <div className="my-2 py-2 px-3 bg-white rounded-lg text-center">
          <span className="text-base font-bold text-violet-900 font-mono">
            Var(p) = p(1 {'\u2212'} p) / (2N)
          </span>
        </div>
        <strong>Smaller N means bigger variance means faster drift.</strong> When N = 2000, the same
        formula gives a per-generation standard error of {'\u221A'}(0.25/4000) {'\u2248'} 0.0079 — the
        frequency barely moves. Drift is not magic; it is finite-sample binomial noise in the gamete pool.
      </div>

      <QuestionPanel
        question={`Before running the simulation, make a prediction: out of ${nReps} independent small (N=20) replicates that start at p=${initialFreq} and run for ${gens} generations, how many do you expect to FIX the M allele (reach p=1)?`}
        correct={fixMPredCorrect}
        feedback={fixMPredCorrect === true
          ? `Good prediction. For a neutral allele, the probability of eventual fixation equals its starting frequency. So with p0 = ${initialFreq}, you expect roughly ${(initialFreq * nReps).toFixed(0)} out of ${nReps} replicates to fix M (the rest fix m). Any answer in the range 3\u20137 is within reasonable sampling variation.`
          : fixMPredCorrect === false
          ? `Hint: for a neutral allele, the probability that it eventually reaches fixation equals its starting frequency. With p0 = ${initialFreq}, what do you predict out of ${nReps} replicates?`
          : undefined}
      >
        <div className="flex gap-3 items-end flex-wrap">
          <div>
            <label className="block text-xs text-stone-500 mb-1">Reps that fix M (0–{nReps})</label>
            <input type="number" step="1" min="0" max={nReps} value={fixMPred}
              disabled={predictionLocked}
              onChange={e => setFixMPred(e.target.value)}
              className="w-24 rounded-lg border-2 border-stone-200 px-2 py-1.5 text-sm focus:border-violet-400 outline-none disabled:bg-stone-100" />
          </div>
          <button onClick={checkFixMPred} disabled={predictionLocked}
            className="rounded-xl bg-gradient-to-b from-violet-700 to-violet-800 px-5 py-2 text-sm font-bold text-white shadow-md hover:shadow-lg disabled:opacity-50">
            Lock in prediction
          </button>
        </div>
      </QuestionPanel>

      <button onClick={runSim} disabled={!predictionLocked}
        className="rounded-xl bg-gradient-to-b from-violet-700 to-violet-800 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">
        {hasRun ? 'Run Again' : 'Run 10 Replicates Each'}
      </button>

      {predictionLocked && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-stone-700 text-center">Tiny roadside patch (N=20)</h3>
              <AlleleTrajectoryVisualizer
                key={`small-${simKey}`}
                popSize={20}
                initialFreqA={initialFreq}
                generations={gens}
                nReplicates={nReps}
                height={250}
                yLabel="Freq(M)"
                onSimComplete={handleSmallSimComplete}
              />
              {hasRun && (
                <div className="text-xs text-center text-stone-500">
                  Fixed (either allele): {smallFixedCount}/{nReps} &middot;
                  {' '}<span className="text-violet-700 font-semibold">Fixed M: {smallFixedACount}/{nReps}</span>
                  {' '}(predicted {fixMPred || '\u2014'})
                </div>
              )}
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-stone-700 text-center">Larger hillside (N=500)</h3>
              <AlleleTrajectoryVisualizer
                key={`large-${simKey}`}
                popSize={500}
                initialFreqA={initialFreq}
                generations={gens}
                nReplicates={nReps}
                height={250}
                yLabel="Freq(M)"
                onSimComplete={handleLargeSimComplete}
              />
              {largeFinalRange && (
                <div className="text-xs text-center text-stone-500">
                  Range: {largeFinalRange.min.toFixed(2)} — {largeFinalRange.max.toFixed(2)}
                </div>
              )}
            </div>
          </div>

          {hasRun && (
            <>
              <QuestionPanel
                question="What effect does population size have on allele frequency change over time?"
                correct={correct}
                feedback={correct === true
                  ? `Exactly! This is genetic drift — random fluctuations in allele frequency due to finite population size. Smaller populations experience MORE drift. With N=20, alleles frequently reach fixation (0 or 1) purely by chance. With N=500, frequencies stay near 0.5.`
                  : correct === false
                  ? 'Look at the trajectories — which population shows more random variation?'
                  : undefined}
              >
                <div className="flex gap-2 flex-wrap">
                  {[
                    'Smaller populations fluctuate more randomly',
                    'Larger populations fluctuate more randomly',
                    'Population size has no effect',
                  ].map(opt => (
                    <button key={opt} onClick={() => {
                      setAnswer(opt);
                      const isCorrect = opt.includes('Smaller');
                      setCorrect(isCorrect);
                      if (isCorrect) setForwardEverCorrect(true);
                    }}
                      className={`rounded-lg border-2 px-3 py-2 text-xs font-semibold transition-all ${
                        answer === opt
                          ? correct ? 'border-emerald-400 bg-emerald-50' : 'border-red-300 bg-red-50'
                          : 'border-stone-200 bg-white hover:border-stone-300'
                      }`}>
                      {opt}
                    </button>
                  ))}
                </div>
              </QuestionPanel>

              {/* 1.9 — Wright's drift model callout */}
              <div className="rounded-lg bg-stone-50 border border-stone-200 p-3 text-xs text-stone-700">
                <strong className="text-stone-800">Wright's drift model (Wright 1931).</strong>{' '}
                In a population of finite size N, allele frequencies fluctuate at random from generation to
                generation because the next generation's gamete pool is a finite sample from the current one.{' '}
                <strong>Sewall Wright</strong> at the University of Chicago worked this out in his 1931 paper{' '}
                <em>Evolution in Mendelian Populations</em> (<em>Genetics</em>, 16: 97-159), one of the three
                foundational papers of theoretical population genetics (along with Fisher 1930 and Haldane 1932).
                Wright showed that the variance of p per generation is p(1 {'\u2212'} p) / (2N) — the smaller
                the population, the faster drift operates.
              </div>

              {/* Backward problem */}
              {forwardEverCorrect && (
                <QuestionPanel
                  question="Three island Mimulus populations (all N=20, p\u2080=0.5): one fixed M at gen 15, one fixed m at gen 22, one hasn't fixed after 50 generations. What can you conclude?"
                  correct={backCorrect}
                  feedback={backCorrect === true
                    ? 'Correct. At N=20, drift is strong and stochastic. Some lineages fix quickly, some slowly, some not at all within the observation window. No single trajectory tells you anything about the forces acting \u2014 you need many replicates to distinguish drift from selection.'
                    : backCorrect === false
                    ? 'Remember: drift is random. At N=20 with p\u2080=0.5, fixation time is highly variable. Any individual trajectory is just one draw from a wide distribution.'
                    : undefined}
                >
                  <div className="text-xs font-semibold tracking-wider text-stone-500 uppercase mb-1 font-hand">
                    Working backward
                  </div>
                  <div className="flex flex-col gap-2">
                    {[
                      { key: 'a', label: 'The population that fixed M must have had selection favoring M' },
                      { key: 'b', label: 'These are all normal outcomes of drift at N=20 \u2014 no single trajectory is informative about forces' },
                      { key: 'c', label: 'The unfixed population must be larger than the others' },
                      { key: 'd', label: 'Something is wrong \u2014 they should all fix at the same time' },
                    ].map(opt => (
                      <button key={opt.key} onClick={() => {
                        setBackAnswer(opt.key);
                        const isCorrect = opt.key === 'b';
                        setBackCorrect(isCorrect);
                        if (isCorrect) setBackCompleted3(true);
                      }}
                        disabled={backCompleted3}
                        className={`rounded-lg border-2 px-3 py-2 text-xs font-semibold transition-all text-left ${
                          backAnswer === opt.key
                            ? backCorrect ? 'border-emerald-400 bg-emerald-50' : 'border-red-300 bg-red-50'
                            : 'border-stone-200 bg-white hover:border-stone-300'
                        } ${backCompleted3 ? 'opacity-70 cursor-default' : ''}`}>
                        ({opt.key}) {opt.label}
                      </button>
                    ))}
                  </div>
                </QuestionPanel>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

// ── Experiment 4: Natural Selection ─────────────────────────────────────

function Exp4_NaturalSelection({ onComplete }: { onComplete: () => void }) {
  const [selCoeff, setSelCoeff] = useState(0.25);
  const [results, setResults] = useState<number[][] | null>(null);
  const [answer, setAnswer] = useState('');
  const [correct, setCorrect] = useState<boolean | null>(null);

  // 1.5 — Prediction step state
  const [predDeltaP, setPredDeltaP] = useState('');
  const [predCorrect, setPredCorrect] = useState<boolean | null>(null);
  const [predLocked, setPredLocked] = useState(false);

  // Backward problem
  const [forwardEverCorrect, setForwardEverCorrect] = useState(false);
  const [backAnswer, setBackAnswer] = useState('');
  const [backCorrect, setBackCorrect] = useState<boolean | null>(null);
  const [backCompleted4, setBackCompleted4] = useState(false);

  useEffect(() => {
    if (!backCompleted4) return;
    const t = setTimeout(onComplete, 1500);
    return () => clearTimeout(t);
  }, [backCompleted4, onComplete]);

  const gens = 100;

  // Closed-form: delta_p = s*p*q^2 / (1 - s*q^2) for p=0.2, q=0.8, s=0.1
  const predP = 0.2;
  const predQ = 0.8;
  const predS = 0.1;
  const closedFormDeltaP = (predS * predP * predQ * predQ) / (1 - predS * predQ * predQ);

  const checkPrediction = () => {
    const val = parseFloat(predDeltaP);
    if (Number.isNaN(val)) { setPredCorrect(false); return; }
    const ok = Math.abs(val - closedFormDeltaP) < 0.005;
    setPredCorrect(ok);
    if (ok) setPredLocked(true);
  };

  const runSim = useCallback(() => {
    // R is dominant (resistant), ss has fitness 1-s under herbicide pressure
    const weak = simulate({
      popSize: 500, initialFreqA: 0.2, generations: gens,
      fitnessAA: 1, fitnessAa: 1, fitnessaa: 1 - 0.05,
    });
    const medium = simulate({
      popSize: 500, initialFreqA: 0.2, generations: gens,
      fitnessAA: 1, fitnessAa: 1, fitnessaa: 1 - 0.1,
    });
    const strong = simulate({
      popSize: 500, initialFreqA: 0.2, generations: gens,
      fitnessAA: 1, fitnessAa: 1, fitnessaa: 1 - selCoeff,
    });
    setResults([weak.freqHistory, medium.freqHistory, strong.freqHistory]);
  }, [selCoeff]);

  return (
    <div className="space-y-6">
      <p className="text-sm text-stone-600">
        Now let's add <strong>natural selection</strong>, using a real-world example:{' '}
        <strong><em>Amaranthus palmeri</em></strong> (Palmer amaranth) in the US Cotton Belt. Since the
        mid-2000s, heavy glyphosate (Roundup) use on Roundup Ready crops has selected for herbicide
        resistance in this weed. Allele <strong>R</strong> (resistant, dominant) confers survival under
        herbicide pressure. Plants with genotype <strong>ss</strong> (susceptible homozygotes) have
        reduced fitness. Starting with p(R) = 0.2, watch how selection increases the resistant allele.
      </p>

      {/* Fix 5: Motivate the Δp formula before asking students to use it */}
      <div className="rounded-lg bg-violet-50 border border-violet-200 p-3 text-sm text-violet-800">
        <strong>Where does the formula come from?</strong> Selection against a recessive homozygote (ss)
        acts only on the fraction q{'\u00B2'} of the population. The per-generation change in p depends on
        how many susceptible homozygotes there are (q{'\u00B2'}), how many R alleles exist in the population (p),
        and how strong selection is (s). The exact formula is {'\u0394'}p = s{'\u00B7'}p{'\u00B7'}q{'\u00B2'} / (1 {'\u2212'} s{'\u00B7'}q{'\u00B2'}),
        where the denominator accounts for the reduced total population fitness.
      </div>

      {/* 1.5 — Prediction before selection */}
      <QuestionPanel
        question={`Before simulating, calculate \u0394p for the first generation. Given p(R) = ${predP}, q(s) = ${predQ}, selection coefficient s = ${predS} against ss homozygotes. Use the formula: \u0394p = s\u00B7p\u00B7q\u00B2 / (1 \u2212 s\u00B7q\u00B2)`}
        correct={predCorrect}
        feedback={predCorrect === true
          ? `Correct! \u0394p = (${predS} \u00D7 ${predP} \u00D7 ${predQ}\u00B2) / (1 \u2212 ${predS} \u00D7 ${predQ}\u00B2) = ${closedFormDeltaP.toFixed(4)}. Notice how small \u0394p is — selection against a rare recessive is SLOW because most r alleles hide in Rr heterozygotes where they are shielded from selection. This is why herbicide resistance can persist at low frequency for years before becoming a visible problem.`
          : predCorrect === false
          ? `Hint: plug in s=${predS}, p=${predP}, q=${predQ}. Numerator = s\u00B7p\u00B7q\u00B2 = ${predS} \u00D7 ${predP} \u00D7 ${(predQ * predQ).toFixed(2)}. Denominator = 1 \u2212 s\u00B7q\u00B2 = 1 \u2212 ${(predS * predQ * predQ).toFixed(3)}.`
          : undefined}
      >
        <div className="flex gap-3 items-end flex-wrap">
          <div>
            <label className="block text-xs text-stone-500 mb-1">{'\u0394'}p (to 4 decimal places)</label>
            <input type="number" step="0.0001" value={predDeltaP}
              disabled={predLocked}
              onChange={e => setPredDeltaP(e.target.value)}
              className="w-32 rounded-lg border-2 border-stone-200 px-2 py-1.5 text-sm focus:border-violet-400 outline-none disabled:bg-stone-100" />
          </div>
          <button onClick={checkPrediction} disabled={predLocked}
            className="rounded-xl bg-gradient-to-b from-violet-700 to-violet-800 px-5 py-2 text-sm font-bold text-white shadow-md hover:shadow-lg disabled:opacity-50">
            Check prediction
          </button>
        </div>
      </QuestionPanel>

      <div className="rounded-lg bg-violet-50 border border-violet-200 p-3 text-xs text-violet-800">
        <strong>Try it:</strong> drag the slider to small values (s {'\u2248'} 0.02) and large values (s {'\u2248'} 0.4).
        Pay attention to the <em>early</em> generations when q = freq(s) is high. Does R rise immediately,
        or is there a slow-start phase? Recessive deleterious alleles hide in heterozygotes, so selection
        against ss is weak while q is large — and accelerates as R becomes common.
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <label className="text-sm font-semibold text-stone-600">
          Selection coefficient (s) for your simulation:
        </label>
        <input type="range" min="0.01" max="0.5" step="0.01" value={selCoeff}
          onChange={e => setSelCoeff(parseFloat(e.target.value))}
          aria-label="Selection coefficient s"
          className="w-40 accent-violet-500" />
        <span className="text-sm font-mono text-violet-700">{selCoeff.toFixed(2)}</span>
        <button onClick={runSim}
          className="rounded-xl bg-gradient-to-b from-violet-700 to-violet-800 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:shadow-lg">
          Simulate
        </button>
      </div>

      {results && (
        <>
          <AlleleTrajectoryVisualizer
            popSize={500}
            initialFreqA={0.2}
            generations={gens}
            nReplicates={1}
            yLabel="Freq(R)"
            trajectories={results}
            trajectoryColors={['#ddd6fe', '#a78bfa', '#7c3aed']}
            trajectoryLabels={['s = 0.05 (weak)', 's = 0.10 (medium)', `s = ${selCoeff.toFixed(2)} (your choice)`]}
          />

          <QuestionPanel
            question="How does the strength of selection affect the rate of allele frequency change?"
            correct={correct}
            feedback={correct === true
              ? 'Correct! Selection is a deterministic force — stronger selection (higher s) drives allele frequency change faster. Unlike drift, selection has a predictable direction: it increases the frequency of the favorable allele.'
              : correct === false
              ? 'Compare the three curves. Which reaches high frequency fastest?'
              : undefined}
          >
            <div className="flex gap-2 flex-wrap">
              {[
                'Stronger selection causes faster change',
                'Weaker selection causes faster change',
                'Selection strength does not matter',
              ].map(opt => (
                <button key={opt} onClick={() => {
                  setAnswer(opt);
                  const isCorrect = opt.includes('Stronger');
                  setCorrect(isCorrect);
                  if (isCorrect) setForwardEverCorrect(true);
                }}
                  className={`rounded-lg border-2 px-3 py-2 text-xs font-semibold transition-all ${
                    answer === opt
                      ? correct ? 'border-emerald-400 bg-emerald-50' : 'border-red-300 bg-red-50'
                      : 'border-stone-200 bg-white hover:border-stone-300'
                  }`}>
                  {opt}
                </button>
              ))}
            </div>
          </QuestionPanel>

          {/* 1.9 — Fisher on directional selection callout */}
          <div className="rounded-lg bg-stone-50 border border-stone-200 p-3 text-xs text-stone-700">
            <strong className="text-stone-800">Fisher on directional selection (Fisher 1930).</strong>{' '}
            <strong>R. A. Fisher</strong> in <em>The Genetical Theory of Natural Selection</em> (Oxford, 1930)
            laid out the mathematical theory of selection on alleles of small effect. Directional selection
            is a <em>deterministic</em> force (unlike drift) and, for large populations, predictably increases
            the frequency of the favorable allele. <strong>J. B. S. Haldane</strong> independently derived
            the same selection recursions in his 1932 book <em>The Causes of Evolution</em>.
          </div>

          {/* Backward problem */}
          {forwardEverCorrect && (
            <QuestionPanel
              question="You observe the Amaranthus resistance allele R rising from p = 0.01 to p = 0.15 over 30 generations. If R is dominant and selection is against susceptible homozygotes (rr), is this consistent with s \u2248 0.1?"
              correct={backCorrect}
              feedback={backCorrect === true
                ? 'Correct. With s=0.1 and p\u2080=0.01, \u0394p \u2248 s\u00B7p\u00B7q\u00B2 \u2248 0.1\u00D70.01\u00D71 = 0.001 per gen initially, accelerating as p rises (because more ss homozygotes are exposed to selection). Over 30 generations, the recursion predicts p reaching roughly 0.10\u20130.20 \u2014 consistent with the observed 0.15.'
                : backCorrect === false
                ? 'Think about the selection recursion: at low p, \u0394p \u2248 s\u00B7p\u00B7q\u00B2. With s=0.1, p\u2080=0.01, the initial \u0394p is small but accelerates. Over 30 generations, does p reach the observed range?'
                : undefined}
            >
              <div className="text-xs font-semibold tracking-wider text-stone-500 uppercase mb-1 font-hand">
                Working backward
              </div>
              <div className="flex flex-col gap-2">
                {[
                  { key: 'a', label: 'Yes \u2014 with s=0.1 and p\u2080=0.01, the recursion predicts p reaching ~0.10\u20130.20 by generation 30' },
                  { key: 'b', label: 'No \u2014 s=0.1 is too weak; you\'d need s > 0.5' },
                  { key: 'c', label: 'No \u2014 selection cannot increase frequency this much in 30 generations' },
                  { key: 'd', label: 'Cannot tell \u2014 we need to know the population size' },
                ].map(opt => (
                  <button key={opt.key} onClick={() => {
                    setBackAnswer(opt.key);
                    const isCorrect = opt.key === 'a';
                    setBackCorrect(isCorrect);
                    if (isCorrect) setBackCompleted4(true);
                  }}
                    disabled={backCompleted4}
                    className={`rounded-lg border-2 px-3 py-2 text-xs font-semibold transition-all text-left ${
                      backAnswer === opt.key
                        ? backCorrect ? 'border-emerald-400 bg-emerald-50' : 'border-red-300 bg-red-50'
                        : 'border-stone-200 bg-white hover:border-stone-300'
                    } ${backCompleted4 ? 'opacity-70 cursor-default' : ''}`}>
                    ({opt.key}) {opt.label}
                  </button>
                ))}
              </div>
            </QuestionPanel>
          )}
        </>
      )}
    </div>
  );
}

// ── Experiment 5: Migration ─────────────────────────────────────────────

function Exp5_Migration({ onComplete }: { onComplete: () => void }) {
  const [migRate, setMigRate] = useState(0.05);
  const [hasRun, setHasRun] = useState(false);
  const [simKey, setSimKey] = useState(0);
  const [answer, setAnswer] = useState('');
  const [correct, setCorrect] = useState<boolean | null>(null);

  // 1.6 — Prediction before migration
  const [predAnswer, setPredAnswer] = useState('');
  const [predCorrect, setPredCorrect] = useState<boolean | null>(null);
  const [predLocked, setPredLocked] = useState(false);

  // Backward problem
  const [forwardEverCorrect, setForwardEverCorrect] = useState(false);
  const [backAnswer, setBackAnswer] = useState('');
  const [backCorrect, setBackCorrect] = useState<boolean | null>(null);
  const [backCompleted5, setBackCompleted5] = useState(false);

  useEffect(() => {
    if (!backCompleted5) return;
    const t = setTimeout(onComplete, 1500);
    return () => clearTimeout(t);
  }, [backCompleted5, onComplete]);

  const gens = 80;

  const runSim = () => {
    setSimKey(k => k + 1);
    setHasRun(true);
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-stone-600">
        Two <em>Mimulus guttatus</em> populations on adjacent soil types — a <strong>serpentine site</strong>{' '}
        with p(M) = 0.1 and a <strong>non-serpentine meadow</strong> with p(M) = 0.9 — are connected by
        bumblebee-mediated pollen flow. Each generation, a fraction <em>m</em> of each population's
        gametes come from the other population — true two-way gene flow.
      </p>

      {/* 1.6 — Prediction before migration */}
      <QuestionPanel
        question="Before simulating, predict: what will happen to the allele frequencies in these two populations over many generations of gene flow?"
        correct={predCorrect}
        feedback={predCorrect === true
          ? `Correct! With symmetric two-way migration (equal population sizes, equal migration rate), both populations converge to the average: (0.1 + 0.9) / 2 = 0.5. Gene flow is a homogenizing force.`
          : predCorrect === false
          ? 'Think about what happens when you mix two pools with different concentrations. Do they stay different, swap, or meet in the middle?'
          : undefined}
      >
        <div className="flex gap-2 flex-wrap">
          {[
            { key: 'a', label: 'They will swap frequencies (p\u2081 \u2192 0.9, p\u2082 \u2192 0.1)' },
            { key: 'b', label: 'They will converge to p\u2081 = p\u2082 = 0.5' },
            { key: 'c', label: 'They will converge, but NOT to exactly 0.5' },
            { key: 'd', label: 'They will stay at their original frequencies' },
          ].map(opt => (
            <button key={opt.key} onClick={() => {
              if (!predLocked) {
                setPredAnswer(opt.key);
                const isCorrect = opt.key === 'b';
                setPredCorrect(isCorrect);
                if (isCorrect) setPredLocked(true);
              }
            }}
              disabled={predLocked}
              className={`rounded-lg border-2 px-3 py-2 text-xs font-semibold transition-all ${
                predAnswer === opt.key
                  ? predCorrect ? 'border-emerald-400 bg-emerald-50' : 'border-red-300 bg-red-50'
                  : 'border-stone-200 bg-white hover:border-stone-300'
              } ${predLocked ? 'opacity-70' : ''}`}>
              ({opt.key}) {opt.label}
            </button>
          ))}
        </div>
      </QuestionPanel>

      <div className="flex items-center gap-4 flex-wrap">
        <label className="text-sm font-semibold text-stone-600">Migration rate:</label>
        <input type="range" min="0.01" max="0.2" step="0.01" value={migRate}
          onChange={e => setMigRate(parseFloat(e.target.value))}
          aria-label="Migration rate m"
          className="w-40 accent-violet-500" />
        <span className="text-sm font-mono text-violet-700">{migRate.toFixed(2)}</span>
        <button onClick={runSim}
          className="rounded-xl bg-gradient-to-b from-violet-700 to-violet-800 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:shadow-lg">
          Simulate
        </button>
      </div>

      {hasRun && (
        <>
          <AlleleTrajectoryVisualizer
            key={`mig-${simKey}`}
            popSize={500}
            initialFreqA={0.5}
            generations={gens}
            nReplicates={1}
            yLabel="Freq(M)"
            twoIsland={{ p1Init: 0.1, p2Init: 0.9, migRate: migRate, generations: gens }}
          />

          <QuestionPanel
            question="What happens to allele frequencies in the two populations over time?"
            correct={correct}
            feedback={correct === true
              ? 'Correct! Migration (gene flow) homogenizes allele frequencies between populations. Higher migration rates cause faster convergence. This is why connected Mimulus populations tend to be genetically similar, while isolated populations on distant serpentine outcrops diverge.'
              : correct === false
              ? 'Watch the two lines — do they stay apart, or move toward each other?'
              : undefined}
          >
            <div className="flex gap-2 flex-wrap">
              {[
                'They converge toward the same frequency',
                'They diverge further apart',
                'They stay at their original frequencies',
              ].map(opt => (
                <button key={opt} onClick={() => {
                  setAnswer(opt);
                  const isCorrect = opt.includes('converge');
                  setCorrect(isCorrect);
                  if (isCorrect) setForwardEverCorrect(true);
                }}
                  className={`rounded-lg border-2 px-3 py-2 text-xs font-semibold transition-all ${
                    answer === opt
                      ? correct ? 'border-emerald-400 bg-emerald-50' : 'border-red-300 bg-red-50'
                      : 'border-stone-200 bg-white hover:border-stone-300'
                  }`}>
                  {opt}
                </button>
              ))}
            </div>
          </QuestionPanel>

          {/* 1.9 — Wright's island model callout */}
          <div className="rounded-lg bg-stone-50 border border-stone-200 p-3 text-xs text-stone-700">
            <strong className="text-stone-800">Wright's island model (Wright 1931, expanded 1943).</strong>{' '}
            Migration between populations is a homogenizing force: two populations connected by gene flow
            at rate m converge toward a shared allele frequency at rate ~m per generation. Wright used this
            model to develop the F<sub>ST</sub> statistic for measuring population structure. Modern
            conservation genetics still uses Wright's model to decide when two populations are functionally
            connected.
          </div>

          {/* Backward problem */}
          {forwardEverCorrect && (
            <QuestionPanel
              question="Two Mimulus populations start at p\u2081=0.0 and p\u2082=1.0. After 30 generations of symmetric migration at m=0.03, you observe p\u2081=0.42 and p\u2082=0.58. Is this consistent with migration alone?"
              correct={backCorrect}
              feedback={backCorrect === true
                ? 'Yes, this is consistent. With m = 0.03, both populations are still converging toward 0.5 at generation 30. The convergence is exponential \u2014 fast at first, then slower as they approach the midpoint. The observed values of 0.42 and 0.58 are symmetric around 0.5 and match what the two-island model predicts.'
                : backCorrect === false
                ? 'Think about the migration model: each generation, both populations move toward the average. With m = 0.03 and 30 generations, would they have fully converged yet?'
                : undefined}
            >
              <div className="text-xs font-semibold tracking-wider text-stone-500 uppercase mb-1 font-hand">
                Working backward
              </div>
              <div className="flex flex-col gap-2">
                {[
                  { key: 'a', label: 'Yes \u2014 the symmetric model predicts exponential approach to 0.5, and at gen 30 they should be approximately 0.42/0.58' },
                  { key: 'b', label: 'No \u2014 they should have converged to 0.5 by now' },
                  { key: 'c', label: 'No \u2014 migration swaps frequencies, so p\u2081 should be near 1.0' },
                  { key: 'd', label: 'No \u2014 these values suggest selection is also acting' },
                ].map(opt => (
                  <button key={opt.key} onClick={() => {
                    setBackAnswer(opt.key);
                    const isCorrect = opt.key === 'a';
                    setBackCorrect(isCorrect);
                    if (isCorrect) setBackCompleted5(true);
                  }}
                    disabled={backCompleted5}
                    className={`rounded-lg border-2 px-3 py-2 text-xs font-semibold transition-all text-left ${
                      backAnswer === opt.key
                        ? backCorrect ? 'border-emerald-400 bg-emerald-50' : 'border-red-300 bg-red-50'
                        : 'border-stone-200 bg-white hover:border-stone-300'
                    } ${backCompleted5 ? 'opacity-70 cursor-default' : ''}`}>
                    ({opt.key}) {opt.label}
                  </button>
                ))}
              </div>
            </QuestionPanel>
          )}
        </>
      )}
    </div>
  );
}

// ── Experiment 6: Mutation-Selection Balance ────────────────────────────

function Exp6_MutationSelectionBalance({ onComplete }: { onComplete: () => void }) {
  const [mu, setMu] = useState(0.0001);
  const [s, setS] = useState(0.5);
  const [result, setResult] = useState<number[] | null>(null);
  const [answer, setAnswer] = useState('');
  const [correct, setCorrect] = useState<boolean | null>(null);

  // 1.7 — Prediction before sim
  const [predAnswer, setPredAnswer] = useState('');
  const [predCorrect, setPredCorrect] = useState<boolean | null>(null);
  const [predLocked, setPredLocked] = useState(false);

  // Backward problem
  const [forwardEverCorrect, setForwardEverCorrect] = useState(false);
  const [backInput, setBackInput] = useState('');
  const [backCorrect, setBackCorrect] = useState<boolean | null>(null);
  const [backCompleted6, setBackCompleted6] = useState(false);

  useEffect(() => {
    if (!backCompleted6) return;
    const t = setTimeout(onComplete, 1500);
    return () => clearTimeout(t);
  }, [backCompleted6, onComplete]);

  const gens = 500;
  const expectedEq = Math.sqrt(mu / s);

  const runSim = useCallback(() => {
    // Start with no 'chl' alleles, let mutation introduce them
    const sim = simulate({
      popSize: 5000, initialFreqA: 1.0, generations: gens,
      fitnessAA: 1, fitnessAa: 1, fitnessaa: 1 - s,
      mutationRate: mu,
    });
    // We track freq of Chl (dominant), but we want freq of 'chl' = 1-p
    setResult(sim.freqHistory.map(pVal => 1 - pVal));
  }, [mu, s]);

  return (
    <div className="space-y-6">
      <p className="text-sm text-stone-600">
        Deleterious alleles should be removed by selection — so why do they persist? Consider{' '}
        <strong><em>Arabidopsis thaliana</em></strong> (thale cress), a model plant species. At the
        chlorophyll biosynthesis locus, allele <strong>Chl</strong> (normal, dominant) produces green tissue.
        The recessive allele <strong>chl</strong> is a null mutant: homozygous <strong>chl/chl</strong>{' '}
        seedlings are albino and nearly lethal (fitness {'\u2248'} 1 {'\u2212'} s). But mutation keeps creating
        new chl copies at rate {'\u03BC'} (Chl {'\u2192'} chl).
      </p>

      {/* 1.7 — Prediction panel before sim (formula revealed AFTER) */}
      <QuestionPanel
        question={`With mutation rate \u03BC = ${mu.toExponential(0)} and selection coefficient s = ${s}, what equilibrium frequency do you expect for the chl allele?`}
        correct={predCorrect}
        feedback={predCorrect === true
          ? `Correct! With \u03BC = ${mu.toExponential(0)} and s = ${s}, the equilibrium frequency is very low but nonzero. Run the simulation below to see the exact dynamics, and we'll reveal the formula after.`
          : predCorrect === false
          ? 'Think about it: selection is strong (s = 0.5, nearly lethal), but mutation never stops. Will the allele be eliminated completely? Will it reach 50%? Or will it settle at some much lower value?'
          : undefined}
      >
        <div className="flex gap-2 flex-wrap">
          {[
            { key: 'a', label: 'The mutant allele will be completely eliminated (q\u0302 = 0)' },
            { key: 'b', label: 'The mutant allele will reach high frequency (q\u0302 > 0.1)' },
            { key: 'c', label: 'The mutant allele will settle at a very low but nonzero frequency' },
            { key: 'd', label: 'The mutant allele frequency will fluctuate randomly with no equilibrium' },
          ].map(opt => (
            <button key={opt.key} onClick={() => {
              if (!predLocked) {
                setPredAnswer(opt.key);
                const isCorrect = opt.key === 'c';
                setPredCorrect(isCorrect);
                if (isCorrect) setPredLocked(true);
              }
            }}
              disabled={predLocked}
              className={`rounded-lg border-2 px-3 py-2 text-xs font-semibold transition-all ${
                predAnswer === opt.key
                  ? predCorrect ? 'border-emerald-400 bg-emerald-50' : 'border-red-300 bg-red-50'
                  : 'border-stone-200 bg-white hover:border-stone-300'
              } ${predLocked ? 'opacity-70' : ''}`}>
              ({opt.key}) {opt.label}
            </button>
          ))}
        </div>
      </QuestionPanel>

      <div className="flex items-center gap-4 flex-wrap">
        <div>
          <label className="block text-xs text-stone-500 mb-1">Mutation rate ({'\u03BC'})</label>
          <input type="range" min="0.0001" max="0.01" step="0.0001" value={mu}
            onChange={e => setMu(parseFloat(e.target.value))}
            aria-label="Mutation rate mu"
            className="w-32 accent-violet-500" />
          <span className="ml-2 text-xs font-mono text-violet-700">{mu.toFixed(4)}</span>
        </div>
        <div>
          <label className="block text-xs text-stone-500 mb-1">Selection coefficient (s)</label>
          <input type="range" min="0.01" max="0.5" step="0.01" value={s}
            onChange={e => setS(parseFloat(e.target.value))}
            aria-label="Selection coefficient s"
            className="w-32 accent-violet-500" />
          <span className="ml-2 text-xs font-mono text-violet-700">{s.toFixed(2)}</span>
        </div>
        <button onClick={runSim}
          className="rounded-xl bg-gradient-to-b from-violet-700 to-violet-800 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:shadow-lg">
          Simulate
        </button>
      </div>

      {result && (
        <>
          <AlleleTrajectoryVisualizer
            popSize={5000}
            initialFreqA={1.0}
            generations={gens}
            nReplicates={1}
            yLabel="Freq(chl)"
            trajectories={[result]}
            trajectoryColors={['#7c3aed']}
          />

          {/* Formula revealed AFTER sim (per 1.7) */}
          <div className="rounded-lg bg-violet-50 border border-violet-200 p-3 text-sm text-violet-800">
            <strong>The formula:</strong> q{'\u0302'} {'\u2248'} {'\u221A'}({'\u03BC'}/s) = {'\u221A'}({mu}/{s}) {'\u2248'} {expectedEq.toFixed(4)}
            <br />
            <strong>Observed final freq(chl):</strong> {result[result.length - 1].toFixed(4)}
          </div>

          <QuestionPanel
            question="Why do deleterious alleles like chl persist in Arabidopsis populations despite selection against them?"
            correct={correct}
            feedback={correct === true
              ? `Correct! Mutation continuously introduces new chl alleles, while selection removes them when they appear as chl/chl homozygotes. The balance between these opposing forces maintains the allele at a low but nonzero equilibrium frequency q\u0302 \u2248 \u221A(\u03BC/s). Higher mutation rates or weaker selection lead to higher equilibrium frequencies.`
              : correct === false
              ? 'Think about what happens if selection removes all chl copies — mutation creates new ones...'
              : undefined}
          >
            <div className="flex gap-2 flex-wrap">
              {[
                'Mutation reintroduces them as fast as selection removes them',
                'Selection is not strong enough to remove any alleles',
                'Deleterious alleles are always dominant',
              ].map(opt => (
                <button key={opt} onClick={() => {
                  setAnswer(opt);
                  const isCorrect = opt.includes('reintroduces');
                  setCorrect(isCorrect);
                  if (isCorrect) setForwardEverCorrect(true);
                }}
                  className={`rounded-lg border-2 px-3 py-2 text-xs font-semibold transition-all ${
                    answer === opt
                      ? correct ? 'border-emerald-400 bg-emerald-50' : 'border-red-300 bg-red-50'
                      : 'border-stone-200 bg-white hover:border-stone-300'
                  }`}>
                  {opt}
                </button>
              ))}
            </div>
          </QuestionPanel>

          {/* 1.9 — Mutation-selection balance callout */}
          <div className="rounded-lg bg-stone-50 border border-stone-200 p-3 text-xs text-stone-700">
            <strong className="text-stone-800">Mutation-selection balance.</strong>{' '}
            In the absence of all other forces, the equilibrium frequency of a deleterious recessive
            allele under recurrent mutation is q{'\u0302'} {'\u2248'} {'\u221A'}({'\u03BC'}/s). This is why
            deleterious recessive alleles persist at low but nonzero frequencies in real populations — the
            mutation pressure forces new copies into every generation at rate {'\u03BC'}, and selection removes
            them at rate s {'\u00B7'} q{'\u00B2'}, and the balance between these two opposing forces is an
            equilibrium. <em>Arabidopsis</em> chlorophyll mutants at q {'\u2248'} 0.014 in our simulation
            above means approximately 1.4% of alleles in the population carry the mutant — about 1 in 71 alleles,
            or in a population of N = 5000 plants, roughly 140 of the 10,000 alleles would be <em>chl</em>.
          </div>

          {/* Backward problem */}
          {forwardEverCorrect && (
            <QuestionPanel
              question="You observe a recessive deleterious Arabidopsis chlorophyll mutant allele at q\u0302 = 0.02 in a large population. If selection against chl/chl homozygotes is s = 0.5, what is the forward mutation rate \u03BC? (Use q\u0302 \u2248 \u221A(\u03BC/s), so \u03BC = s\u00B7q\u0302\u00B2)"
              correct={backCorrect}
              feedback={backCorrect === true
                ? 'Correct! \u03BC = s\u00B7q\u0302\u00B2 = 0.5 \u00D7 (0.02)\u00B2 = 0.5 \u00D7 0.0004 = 0.0002 = 2\u00D710\u207B\u2074. This is within the typical range of per-locus mutation rates in plants.'
                : backCorrect === false
                ? 'Rearrange the formula: q\u0302 \u2248 \u221A(\u03BC/s), so \u03BC = s\u00B7q\u0302\u00B2. Plug in s = 0.5 and q\u0302 = 0.02.'
                : undefined}
            >
              <div className="text-xs font-semibold tracking-wider text-stone-500 uppercase mb-1 font-hand">
                Working backward
              </div>
              <div className="flex gap-3 items-end flex-wrap">
                <div>
                  <label className="block text-xs text-stone-500 mb-1">{'\u03BC'} (mutation rate)</label>
                  <input type="number" step="0.0001" min="0" max="0.01" value={backInput}
                    onChange={e => setBackInput(e.target.value)}
                    className="w-32 rounded-lg border-2 border-stone-200 px-2 py-1.5 text-sm focus:border-violet-400 outline-none" />
                </div>
                <button onClick={() => {
                  const val = parseFloat(backInput);
                  const isCorrect = !Number.isNaN(val) && Math.abs(val - 0.0002) <= 0.0001;
                  setBackCorrect(isCorrect);
                  if (isCorrect) setBackCompleted6(true);
                }}
                  disabled={backCompleted6}
                  className="rounded-xl bg-gradient-to-b from-violet-700 to-violet-800 px-5 py-2 text-sm font-bold text-white shadow-md hover:shadow-lg disabled:opacity-50">
                  Check
                </button>
              </div>
            </QuestionPanel>
          )}
        </>
      )}
    </div>
  );
}

// ── Experiment 7: Founder Effect ────────────────────────────────────────

function Exp7_FounderEffect({ onComplete }: { onComplete: () => void }) {
  const [founderSize, setFounderSize] = useState(10);
  const [founderFreqs, setFounderFreqs] = useState<number[] | null>(null);
  const [answer, setAnswer] = useState('');
  const [correct, setCorrect] = useState<boolean | null>(null);

  // Backward problem
  const [forwardEverCorrect, setForwardEverCorrect] = useState(false);
  const [backAnswer, setBackAnswer] = useState('');
  const [backCorrect, setBackCorrect] = useState<boolean | null>(null);
  const [backCompleted7, setBackCompleted7] = useState(false);

  useEffect(() => {
    if (!backCompleted7) return;
    const t = setTimeout(onComplete, 1500);
    return () => clearTimeout(t);
  }, [backCompleted7, onComplete]);

  const sourceP = 0.5;
  const nTrials = 20;

  const runFounder = useCallback(() => {
    const freqs: number[] = [];
    for (let i = 0; i < nTrials; i++) {
      // Sample founderSize diploid individuals from source (2N alleles)
      let countA = 0;
      for (let j = 0; j < 2 * founderSize; j++) {
        if (Math.random() < sourceP) countA++;
      }
      freqs.push(countA / (2 * founderSize));
    }
    setFounderFreqs(freqs);
  }, [founderSize]);

  // Build histogram bins (0 to 1 in steps of 0.1)
  const histBins = useMemo(() => {
    if (!founderFreqs) return null;
    const bins = new Array(11).fill(0);
    for (const f of founderFreqs) {
      const idx = Math.min(10, Math.round(f * 10));
      bins[idx]++;
    }
    return bins;
  }, [founderFreqs]);

  const histLabels = Array.from({ length: 11 }, (_, i) => (i / 10).toFixed(1));

  return (
    <div className="space-y-6">
      {/* 1.8 — Hawaiian Bidens historical framing */}
      <div className="rounded-lg bg-stone-50 border border-stone-200 p-3 text-xs text-stone-700">
        <strong className="text-stone-800">The Hawaiian <em>Bidens</em> radiation.</strong>{' '}
        The ~19 species of Hawaiian <em>Bidens</em> (beggar-ticks, in Asteraceae) all descend
        from one or two mainland ancestors that arrived on the islands by long-distance seed dispersal
        approximately 1.3–3 million years ago. The founding population was very small — likely fewer than
        10 plants — and every subsequent species in the Hawaiian radiation carries the genetic imprint
        of that bottleneck: reduced genetic diversity compared to mainland <em>Bidens</em>, fixed
        differences at many loci that are polymorphic on the mainland, and unusual allele-frequency
        distributions. <strong>Carlquist 1974</strong> is the classic biogeographic account;{' '}
        <strong>Baldwin &amp; Wagner 2010</strong> reviews the phylogeography.
      </div>

      <p className="text-sm text-stone-600">
        When a small group of <em>Bidens</em> seeds colonizes a new island, their allele frequencies may differ
        from the mainland source population purely by chance. The <strong>source population</strong> has
        p = {sourceP}. Simulate founding a new island population by sampling a small number of plants.
      </p>

      <div className="flex items-center gap-4 flex-wrap">
        <label className="text-sm font-semibold text-stone-600">Founder group size:</label>
        <div className="flex gap-1">
          {[5, 10, 20, 50].map(n => (
            <button key={n} onClick={() => { setFounderSize(n); setFounderFreqs(null); }}
              className={`rounded-lg px-3 py-1.5 text-sm font-bold transition-all ${
                founderSize === n ? 'bg-violet-500 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}>
              N={n}
            </button>
          ))}
        </div>
        <button onClick={runFounder}
          className="rounded-xl bg-gradient-to-b from-violet-700 to-violet-800 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:shadow-lg">
          Found {nTrials} Island Populations
        </button>
      </div>

      {histBins && founderFreqs && (
        <>
          <HistogramChart
            bins={histBins}
            labels={histLabels}
            title={`Allele frequencies in ${nTrials} founded Bidens populations (N=${founderSize})`}
            referenceX={sourceP}
            referenceLabel={`source p=${sourceP}`}
            colorFn={(i) => {
              const dist = Math.abs(i / 10 - sourceP);
              const r = Math.round(124 + 100 * dist);
              const g = Math.round(58 + 50 * (1 - dist));
              const b = Math.round(237 - 100 * dist);
              return `rgb(${r}, ${g}, ${b})`;
            }}
          />

          <div className="rounded-lg bg-violet-50 border border-violet-200 p-3 text-sm text-violet-800">
            <strong>Source frequency:</strong> p = {sourceP} (dashed line)
            <br />
            <strong>Founder frequencies:</strong> range {Math.min(...founderFreqs).toFixed(2)} to {Math.max(...founderFreqs).toFixed(2)},
            mean = {(founderFreqs.reduce((a, b) => a + b, 0) / founderFreqs.length).toFixed(3)}
            <br />
            <strong>Std deviation:</strong> {Math.sqrt(founderFreqs.reduce((sum, f) => sum + (f - sourceP) ** 2, 0) / founderFreqs.length).toFixed(3)}
            {founderSize <= 10 && (
              <span> — notice the wide spread with such a small founding group!</span>
            )}
          </div>

          <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-800">
            <strong>The Founder Effect:</strong> When a small group of <em>Bidens</em> seeds colonizes a new
            Hawaiian island, random sampling can dramatically shift allele frequencies from the mainland source.
            Smaller founding groups show more variation. This is why the Hawaiian <em>Bidens</em> radiation
            — and island populations generally — often have unusual allele frequencies. It's drift acting at
            the moment of founding.
          </div>

          <QuestionPanel
            question="Try different founder sizes above. If you halve the founder population size, how does the spread of founder allele frequencies change?"
            correct={correct}
            feedback={correct === true
              ? 'Correct. Since \u03C3 \u221D 1/\u221A(2N), halving N multiplies the spread by \u221A2 \u2248 1.41 — so the spread increases by about 41%. Smaller founding groups deviate from the source more dramatically; this is why founder effects are strongest for the smallest colonizing groups.'
              : correct === false
              ? 'Compare N=20 vs N=5 in the simulator above. Does the histogram get wider or narrower when N shrinks?'
              : undefined}
          >
            <div className="flex gap-2 flex-wrap">
              {[
                'Spread increases substantially (~40% wider)',
                'Spread stays the same',
                'Spread is cut in half',
                'No predictable change',
              ].map(opt => (
                <button key={opt} onClick={() => {
                  setAnswer(opt);
                  const isCorrect = opt.startsWith('Spread increases substantially');
                  setCorrect(isCorrect);
                  if (isCorrect) setForwardEverCorrect(true);
                }}
                  className={`rounded-lg border-2 px-3 py-2 text-xs font-semibold transition-all ${
                    answer === opt
                      ? correct ? 'border-emerald-400 bg-emerald-50' : 'border-red-300 bg-red-50'
                      : 'border-stone-200 bg-white hover:border-stone-300'
                  }`}>
                  {opt}
                </button>
              ))}
            </div>
          </QuestionPanel>

          {/* Backward problem */}
          {forwardEverCorrect && (
            <QuestionPanel
              question="A founded Bidens population has p&#x0302; = 0.85 for an allele that was p = 0.5 on the mainland. What founding group size N is most consistent with this deviation?"
              correct={backCorrect}
              feedback={backCorrect === true
                ? 'Correct. The deviation is (0.85 \u2212 0.5)\u00B2 = 0.1225. The expected sampling variance is p(1\u2212p)/(2N) = 0.25/(2N). Setting these equal: N \u2248 0.25/0.245 \u2248 1. A founding pair (N \u2248 2 diploid plants, 4 alleles) is the right order of magnitude \u2014 only an extremely small founding group could produce this large a deviation from the source.'
                : backCorrect === false
                ? 'Use the sampling variance formula: Var(p\u0302) = p(1\u2212p)/(2N). The observed deviation is |0.85 \u2212 0.5| = 0.35. What N makes (0.35)\u00B2 \u2248 0.25/(2N)?'
                : undefined}
            >
              <div className="text-xs font-semibold tracking-wider text-stone-500 uppercase mb-1 font-hand">
                Working backward
              </div>
              <div className="flex flex-col gap-2">
                {[
                  { key: 'a', label: 'N \u2248 2 (a founding pair) \u2014 the deviation of 0.35 is ~1 SD when N is very small' },
                  { key: 'b', label: 'N \u2248 50 \u2014 moderate founder group' },
                  { key: 'c', label: 'N \u2248 500 \u2014 large founder group' },
                  { key: 'd', label: 'Cannot estimate N from this information' },
                ].map(opt => (
                  <button key={opt.key} onClick={() => {
                    setBackAnswer(opt.key);
                    const isCorrect = opt.key === 'a';
                    setBackCorrect(isCorrect);
                    if (isCorrect) setBackCompleted7(true);
                  }}
                    disabled={backCompleted7}
                    className={`rounded-lg border-2 px-3 py-2 text-xs font-semibold transition-all text-left ${
                      backAnswer === opt.key
                        ? backCorrect ? 'border-emerald-400 bg-emerald-50' : 'border-red-300 bg-red-50'
                        : 'border-stone-200 bg-white hover:border-stone-300'
                    } ${backCompleted7 ? 'opacity-70 cursor-default' : ''}`}>
                    ({opt.key}) {opt.label}
                  </button>
                ))}
              </div>
            </QuestionPanel>
          )}
        </>
      )}
    </div>
  );
}

// ── Module definition ───────────────────────────────────────────────────

const EXPERIMENTS = [
  // Titles are plain; ModuleShell prefixes the index at render time (F-044).
  { id: 'hardy_weinberg_1908', title: 'Hardy 1908', subtitle: 'Why dominant alleles don\'t take over', Component: Exp0_HardyWeinberg1908 },
  { id: 'allele_freq', title: 'Allele Frequencies', subtitle: 'Count alleles and compute p and q in Mimulus', Component: Exp1_AlleleFrequencies },
  { id: 'hwe', title: 'Hardy-Weinberg', subtitle: 'Predict genotype frequencies from p and q', Component: Exp2_HardyWeinberg },
  { id: 'drift', title: 'Genetic Drift', subtitle: 'Small vs large Mimulus populations', Component: Exp3_GeneticDrift },
  { id: 'selection', title: 'Natural Selection', subtitle: 'Glyphosate resistance in Amaranthus', Component: Exp4_NaturalSelection },
  { id: 'migration', title: 'Migration', subtitle: 'Pollen flow between Mimulus populations', Component: Exp5_Migration },
  { id: 'mut_sel_balance', title: 'Mutation-Selection', subtitle: 'Arabidopsis chlorophyll mutants', Component: Exp6_MutationSelectionBalance },
  { id: 'founder', title: 'Founder Effect', subtitle: 'Hawaiian Bidens island colonization', Component: Exp7_FounderEffect },
];

const POPGEN_MODULE: ModuleDefinition = {
  id: 'popgen',
  title: 'Population Genetics',
  subtitle: 'Project 3: Evolutionary Forces',
  color: 'violet',
  backLink: { href: '/breeding-game/modules.html', label: '\u2190 Back to Hub' },
  experiments: EXPERIMENTS,
};

export default function PopGenModule() {
  return <ModuleShell module={POPGEN_MODULE} />;
}
