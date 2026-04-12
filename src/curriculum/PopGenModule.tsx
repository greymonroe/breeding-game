/**
 * Population Genetics Curriculum Module
 *
 * Seven experiments exploring evolutionary forces:
 *  1. Allele Frequencies — count alleles, compute p and q (Mimulus guttatus)
 *  2. Hardy-Weinberg Equilibrium — predict genotype frequencies (Mimulus)
 *  3. Genetic Drift — small vs large populations (Mimulus serpentine sites)
 *  4. Natural Selection — directional selection on a recessive (Amaranthus palmeri)
 *  5. Migration — gene flow between populations (Mimulus serpentine/non-serpentine)
 *  6. Mutation-Selection Balance — equilibrium frequency (Arabidopsis thaliana)
 *  7. Founder Effect — sampling shifts allele frequencies (Hawaiian Bidens)
 */

import { useState, useMemo, useCallback } from 'react';
import {
  simulate, simulateReplicates, hardyWeinberg, testHWE,
} from './popgen-engine';
import {
  ModuleShell, QuestionPanel, HistogramChart,
  type ModuleDefinition,
} from './components';

// ── Plant example mapping ──────────────────────────────────────────────
/**
 * PLANT_EXAMPLES — experiment-to-organism mapping for the PopGen module.
 *
 * Exp 1–3, 5: Mimulus guttatus (yellow monkeyflower) — anthocyanin pigmentation
 *   Alleles: M (anthocyanin, dominant) / m (null recessive)
 *   MM = deep magenta, Mm = pink-magenta, mm = cream/pale
 *
 * Exp 4: Amaranthus palmeri (Palmer amaranth) — glyphosate resistance
 *   Alleles: R (resistant, dominant) / s (susceptible recessive)
 *   RR/Rs = resistant, ss = susceptible (reduced fitness under herbicide)
 *
 * Exp 6: Arabidopsis thaliana — chlorophyll biosynthesis
 *   Alleles: Chl (normal, dominant) / chl (null recessive)
 *   chl/chl = albino seedling, nearly lethal
 *
 * Exp 7: Hawaiian Bidens (tarweeds/beggar-ticks) — founder effect
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
    alleles: { dominant: 'R', recessive: 's' },
  },
  arabidopsis: {
    species: 'Arabidopsis thaliana',
    common: 'thale cress',
    alleles: { dominant: 'Chl', recessive: 'chl' },
  },
  bidens: {
    species: 'Bidens',
    common: 'Hawaiian tarweeds / beggar-ticks',
  },
} as const;

// ── Shared visualization components ─────────────────────────────────────

/** SVG line chart showing allele frequency trajectories */
function FrequencyChart({ trajectories, generations, height = 200, colors, labels, yLabel = 'Freq(M)' }: {
  trajectories: number[][];
  generations: number;
  height?: number;
  colors?: string[];
  labels?: string[];
  yLabel?: string;
}) {
  const width = 500;
  const pad = { top: 20, right: 20, bottom: 30, left: 40 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const defaultColors = ['#7c3aed', '#a78bfa', '#c4b5fd', '#ddd6fe'];

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="xMidYMid meet">
        {/* Axes */}
        <line x1={pad.left} y1={pad.top} x2={pad.left} y2={pad.top + plotH}
          stroke="#a8a29e" strokeWidth="1" />
        <line x1={pad.left} y1={pad.top + plotH} x2={pad.left + plotW} y2={pad.top + plotH}
          stroke="#a8a29e" strokeWidth="1" />

        {/* Y-axis labels */}
        {[0, 0.25, 0.5, 0.75, 1].map(v => (
          <g key={v}>
            <text x={pad.left - 5} y={pad.top + plotH - v * plotH + 3}
              textAnchor="end" fontSize="8" fill="#78716c">{v.toFixed(2)}</text>
            <line x1={pad.left} y1={pad.top + plotH - v * plotH}
              x2={pad.left + plotW} y2={pad.top + plotH - v * plotH}
              stroke="#e7e5e4" strokeWidth="0.5" />
          </g>
        ))}

        {/* X-axis label */}
        <text x={pad.left + plotW / 2} y={height - 4} textAnchor="middle"
          fontSize="9" fill="#78716c">Generation</text>

        {/* Y-axis label */}
        <text x={12} y={pad.top + plotH / 2} textAnchor="middle"
          fontSize="9" fill="#78716c" transform={`rotate(-90, 12, ${pad.top + plotH / 2})`}>
          {yLabel}
        </text>

        {/* Trajectories */}
        {trajectories.map((traj, ti) => {
          const maxGen = traj.length - 1;
          if (maxGen === 0) return null;
          const pts = traj.map((f, i) => {
            const x = pad.left + (i / Math.max(generations, maxGen)) * plotW;
            const y = pad.top + plotH - f * plotH;
            return `${x},${y}`;
          }).join(' ');
          const color = colors?.[ti] ?? defaultColors[ti % defaultColors.length];
          return (
            <polyline key={ti} points={pts} fill="none" stroke={color}
              strokeWidth={trajectories.length > 5 ? 1 : 1.5}
              opacity={trajectories.length > 5 ? 0.4 : 0.8} />
          );
        })}

        {/* Legend */}
        {labels && labels.map((lbl, i) => (
          <g key={i}>
            <line x1={pad.left + plotW - 100} y1={pad.top + 10 + i * 14}
              x2={pad.left + plotW - 85} y2={pad.top + 10 + i * 14}
              stroke={colors?.[i] ?? defaultColors[i % defaultColors.length]} strokeWidth="2" />
            <text x={pad.left + plotW - 80} y={pad.top + 13 + i * 14}
              fontSize="8" fill="#57534e">{lbl}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

/** Grid of colored circles representing a population (Mimulus colors) */
function PopulationGrid({ genotypes, size = 16, colorScheme = 'mimulus' }: {
  genotypes: { AA: number; Aa: number; aa: number };
  size?: number;
  colorScheme?: 'mimulus' | 'violet';
}) {
  const individuals: ('AA' | 'Aa' | 'aa')[] = [];
  for (let i = 0; i < genotypes.AA; i++) individuals.push('AA');
  for (let i = 0; i < genotypes.Aa; i++) individuals.push('Aa');
  for (let i = 0; i < genotypes.aa; i++) individuals.push('aa');

  // Shuffle for visual randomness
  for (let i = individuals.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [individuals[i], individuals[j]] = [individuals[j], individuals[i]];
  }

  const mimulusColors = PLANT_EXAMPLES.mimulus.colors;
  const mimulusBorders = PLANT_EXAMPLES.mimulus.borders;
  const violetColors = { AA: '#6d28d9', Aa: '#a78bfa', aa: '#ede9fe' };
  const violetBorders = { AA: '#5b21b6', Aa: '#7c3aed', aa: '#c4b5fd' };

  const colorMap = colorScheme === 'mimulus' ? mimulusColors : violetColors;
  const borderMap = colorScheme === 'mimulus' ? mimulusBorders : violetBorders;
  const labels = colorScheme === 'mimulus' ? PLANT_EXAMPLES.mimulus.genotypeLabels : { AA: 'AA', Aa: 'Aa', aa: 'aa' };

  return (
    <div className="flex flex-wrap gap-1.5 justify-center">
      {individuals.map((g, i) => (
        <div key={i} className="flex items-center justify-center rounded-full border"
          style={{
            width: size, height: size,
            backgroundColor: colorMap[g],
            borderColor: borderMap[g],
          }}
          title={labels[g]} />
      ))}
      <div className="w-full flex justify-center gap-4 mt-2 text-[10px] text-stone-500">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: colorMap.AA }} /> {labels.AA}
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: colorMap.Aa }} /> {labels.Aa}
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-full border" style={{ backgroundColor: colorMap.aa, borderColor: borderMap.aa }} /> {labels.aa}
        </span>
      </div>
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

  const [pInput, setPInput] = useState('');
  const [qInput, setQInput] = useState('');
  const [correct, setCorrect] = useState<boolean | null>(null);

  const handleCheck = () => {
    const pVal = parseFloat(pInput);
    const qVal = parseFloat(qInput);
    const pOk = Math.abs(pVal - trueP) < 0.03;
    const qOk = Math.abs(qVal - trueQ) < 0.03;
    const isCorrect = pOk && qOk;
    setCorrect(isCorrect);
    if (isCorrect) setTimeout(onComplete, 1500);
  };

  return (
    <div className="space-y-6">
      {/* 1.10 — Linkage handoff callout */}
      <div className="rounded-lg bg-stone-50 border border-stone-200 p-3 text-xs text-stone-700">
        <strong className="text-stone-800">Coming from the Linkage module?</strong> Good — population genetics
        is where the recombination frequency you just learned to measure shows up again. When two alleles
        at linked loci travel together in a population for many generations, they build up a correlation
        called <strong>linkage disequilibrium</strong> (LD). LD decays over time at a rate proportional
        to 1 − <em>r</em>, where <em>r</em> is the recombination frequency between the loci — so
        tightly-linked loci can stay in LD for thousands of generations, while loosely-linked loci
        randomize within dozens.
      </div>

      <p className="text-sm text-stone-600">
        Below is a natural population of <strong>~50 <em>Mimulus guttatus</em></strong> (yellow monkeyflower)
        plants sampled from a serpentine-soil site. Each plant is diploid at the anthocyanin pigmentation
        locus with two alleles: <strong>M</strong> (anthocyanin, dominant) and <strong>m</strong> (null).
        Genotypes: <strong>MM</strong> (deep magenta), <strong>Mm</strong> (pink-magenta), or <strong>mm</strong> (cream/pale).
      </p>

      <PopulationGrid genotypes={pop} colorScheme="mimulus" />

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
  const [simResult, setSimResult] = useState<{ AA: number; Aa: number; aa: number } | null>(null);
  const [hweTest, setHweTest] = useState<ReturnType<typeof testHWE> | null>(null);

  // 1.4 — Noise literacy panel state
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

  const handleSimulate = () => {
    const result = simulate({ popSize: 1000, initialFreqA: p, generations: 1 });
    const geno = result.genotypeHistory[1];
    setSimResult(geno);
    setHweTest(testHWE(geno));
    setStep(2);
    setTimeout(onComplete, 2000);
  };

  const runNoiseLiteracy = () => {
    const pNoise = 0.6;
    // N=50 sample
    const small = simulate({ popSize: 50, initialFreqA: pNoise, generations: 1 });
    const smallP = small.freqHistory[1];
    const smallSE = Math.sqrt(pNoise * (1 - pNoise) / (2 * 50));
    // N=5000 sample
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

      {step >= 1 && (
        <div className="space-y-3">
          <p className="text-sm text-stone-600">
            Now simulate random mating in a large <em>Mimulus</em> population (N=1000) for one generation to verify:
          </p>
          <button onClick={handleSimulate}
            className="rounded-xl bg-gradient-to-b from-violet-700 to-violet-800 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:shadow-lg">
            Simulate Random Mating
          </button>
        </div>
      )}

      {step >= 2 && simResult && hweTest && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3 text-center text-sm">
            {(['AA', 'Aa', 'aa'] as const).map(g => {
              const total = simResult.AA + simResult.Aa + simResult.aa;
              const obs = simResult[g] / total;
              const exp = g === 'AA' ? hw.AA : g === 'Aa' ? hw.Aa : hw.aa;
              const label = g === 'AA' ? 'MM' : g === 'Aa' ? 'Mm' : 'mm';
              return (
                <div key={g} className="rounded-lg bg-stone-50 border p-3">
                  <div className="font-bold text-stone-700">{label}</div>
                  <div className="text-xs text-stone-500 mt-1">
                    Predicted: <span className="font-mono">{exp.toFixed(3)}</span>
                  </div>
                  <div className="text-xs text-violet-600 font-semibold">
                    Observed: <span className="font-mono">{obs.toFixed(3)}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-800">
            <strong>Chi-square test:</strong> X{'\u00B2'} = {hweTest.chiSquare.toFixed(3)}, p-value = {hweTest.pValue.toFixed(3)}.
            {hweTest.inEquilibrium
              ? ' The population IS in Hardy-Weinberg equilibrium — observed matches expected.'
              : ' Slight deviation detected, but with large N this is expected stochastic variation.'}
            <br /><strong>Key insight:</strong> Random mating alone produces HW equilibrium in just ONE generation.
          </div>

          {/* 1.4 — Noise literacy panel */}
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

          {/* 1.9 — Hardy-Weinberg historical callout */}
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
            no mutation, no migration). When any one breaks, the population departs from HWE — and each of
            the next five experiments breaks exactly one of them.
          </div>
        </div>
      )}
    </div>
  );
}

// ── Experiment 3: Genetic Drift ─────────────────────────────────────────

function Exp3_GeneticDrift({ onComplete }: { onComplete: () => void }) {
  const [hasRun, setHasRun] = useState(false);
  const [smallResults, setSmallResults] = useState<number[][] | null>(null);
  const [largeResults, setLargeResults] = useState<number[][] | null>(null);
  const [answer, setAnswer] = useState('');
  const [correct, setCorrect] = useState<boolean | null>(null);

  // Quantitative prediction: how many of nReps (N=20, p0=0.5) fix the M allele?
  const [fixMPred, setFixMPred] = useState('');
  const [fixMPredCorrect, setFixMPredCorrect] = useState<boolean | null>(null);
  const [predictionLocked, setPredictionLocked] = useState(false);

  const nReps = 10;
  const gens = 50;
  const initialFreq = 0.5;

  const runSim = useCallback(() => {
    const small = simulateReplicates({ popSize: 20, initialFreqA: initialFreq, generations: gens }, nReps);
    const large = simulateReplicates({ popSize: 500, initialFreqA: initialFreq, generations: gens }, nReps);
    setSmallResults(small.map(r => r.freqHistory));
    setLargeResults(large.map(r => r.freqHistory));
    setHasRun(true);
  }, []);

  const smallFinal = smallResults?.map(h => h[h.length - 1]) ?? [];
  const largeFinal = largeResults?.map(h => h[h.length - 1]) ?? [];
  const smallFixed = smallFinal.filter(f => f === 0 || f === 1).length;
  const smallFixedM = smallFinal.filter(f => f === 1).length;

  const checkFixMPred = () => {
    const guess = parseInt(fixMPred, 10);
    if (Number.isNaN(guess)) { setFixMPredCorrect(false); return; }
    // Neutral fixation probability = p0 = 0.5, so expected count ~= 5/10.
    // Accept +/-2 (i.e. 3..7) since stochastic.
    const ok = guess >= 3 && guess <= 7;
    setFixMPredCorrect(ok);
    if (ok) setPredictionLocked(true);
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
        count of M alleles follows a binomial distribution with mean 2Np and variance 2N {'\u00B7'} p(1 {'\u2212'} p),
        so the allele frequency in the next generation has variance p(1 {'\u2212'} p) / (2N).{' '}
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

      {hasRun && smallResults && largeResults && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-stone-700 text-center">Tiny roadside patch (N=20)</h3>
              <FrequencyChart trajectories={smallResults} generations={gens} height={180} yLabel="Freq(M)" />
              <div className="text-xs text-center text-stone-500">
                Fixed (either allele): {smallFixed}/{nReps} &middot;
                {' '}<span className="text-violet-700 font-semibold">Fixed M: {smallFixedM}/{nReps}</span>
                {' '}(predicted {fixMPred || '\u2014'})
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-stone-700 text-center">Larger hillside (N=500)</h3>
              <FrequencyChart trajectories={largeResults} generations={gens} height={180} yLabel="Freq(M)" />
              <div className="text-xs text-center text-stone-500">
                Range: {Math.min(...largeFinal).toFixed(2)} — {Math.max(...largeFinal).toFixed(2)}
              </div>
            </div>
          </div>

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
                  if (isCorrect) setTimeout(onComplete, 1500);
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

      {/* 1.5 — Prediction before selection */}
      <QuestionPanel
        question={`Before simulating, calculate \u0394p for the first generation. Given p(R) = ${predP}, q(s) = ${predQ}, selection coefficient s = ${predS} against ss homozygotes. Use the formula: \u0394p = s\u00B7p\u00B7q\u00B2 / (1 \u2212 s\u00B7q\u00B2)`}
        correct={predCorrect}
        feedback={predCorrect === true
          ? `Correct! \u0394p = (${predS} \u00D7 ${predP} \u00D7 ${predQ}\u00B2) / (1 \u2212 ${predS} \u00D7 ${predQ}\u00B2) = ${closedFormDeltaP.toFixed(4)}. Notice how small \u0394p is — selection against a rare recessive is SLOW because most s alleles hide in Rs heterozygotes where they are shielded from selection. This is why herbicide resistance can persist at low frequency for years before becoming a visible problem.`
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
          className="w-40 accent-violet-500" />
        <span className="text-sm font-mono text-violet-700">{selCoeff.toFixed(2)}</span>
        <button onClick={runSim}
          className="rounded-xl bg-gradient-to-b from-violet-700 to-violet-800 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:shadow-lg">
          Simulate
        </button>
      </div>

      {results && (
        <>
          <FrequencyChart
            trajectories={results}
            generations={gens}
            colors={['#ddd6fe', '#a78bfa', '#7c3aed']}
            labels={['s = 0.05 (weak)', 's = 0.10 (medium)', `s = ${selCoeff.toFixed(2)} (your choice)`]}
            yLabel="Freq(R)"
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
                  if (isCorrect) setTimeout(onComplete, 1500);
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
        </>
      )}
    </div>
  );
}

// ── Experiment 5: Migration ─────────────────────────────────────────────

function Exp5_Migration({ onComplete }: { onComplete: () => void }) {
  const [migRate, setMigRate] = useState(0.05);
  const [results, setResults] = useState<number[][] | null>(null);
  const [answer, setAnswer] = useState('');
  const [correct, setCorrect] = useState<boolean | null>(null);

  // 1.6 — Prediction before migration
  const [predAnswer, setPredAnswer] = useState('');
  const [predCorrect, setPredCorrect] = useState<boolean | null>(null);
  const [predLocked, setPredLocked] = useState(false);

  const gens = 80;

  const runSim = useCallback(() => {
    // Two-island migration model (Mimulus serpentine/non-serpentine)
    const m = migRate;
    const p1Init = 0.1;
    const p2Init = 0.9;
    let p1 = p1Init;
    let p2 = p2Init;
    const history1: number[] = [p1];
    const history2: number[] = [p2];
    for (let t = 0; t < gens; t++) {
      const newP1 = (1 - m) * p1 + m * p2;
      const newP2 = (1 - m) * p2 + m * p1;
      p1 = newP1;
      p2 = newP2;
      history1.push(p1);
      history2.push(p2);
    }
    setResults([history1, history2]);
  }, [migRate]);

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
          className="w-40 accent-violet-500" />
        <span className="text-sm font-mono text-violet-700">{migRate.toFixed(2)}</span>
        <button onClick={runSim}
          className="rounded-xl bg-gradient-to-b from-violet-700 to-violet-800 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:shadow-lg">
          Simulate
        </button>
      </div>

      {results && (
        <>
          <FrequencyChart
            trajectories={results}
            generations={gens}
            colors={['#7c3aed', '#f59e0b']}
            labels={['Serpentine site (starts p=0.1)', 'Non-serpentine meadow (starts p=0.9)']}
            yLabel="Freq(M)"
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
                  if (isCorrect) setTimeout(onComplete, 1500);
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
    setResult(sim.freqHistory.map(p => 1 - p));
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
            { key: 'a', label: 'q\u0302 = 0 (selection eliminates it completely)' },
            { key: 'b', label: 'q\u0302 = 1 (mutation dominates)' },
            { key: 'c', label: 'q\u0302 \u2248 0.5 (intermediate balance)' },
            { key: 'd', label: 'q\u0302 \u2248 0.014 (very low but nonzero)' },
          ].map(opt => (
            <button key={opt.key} onClick={() => {
              if (!predLocked) {
                setPredAnswer(opt.key);
                const isCorrect = opt.key === 'd';
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
            className="w-32 accent-violet-500" />
          <span className="ml-2 text-xs font-mono text-violet-700">{mu.toFixed(4)}</span>
        </div>
        <div>
          <label className="block text-xs text-stone-500 mb-1">Selection coefficient (s)</label>
          <input type="range" min="0.01" max="0.5" step="0.01" value={s}
            onChange={e => setS(parseFloat(e.target.value))}
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
          <FrequencyChart
            trajectories={[result]}
            generations={gens}
            colors={['#7c3aed']}
            yLabel="Freq(chl) — deleterious"
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
                  if (isCorrect) setTimeout(onComplete, 1500);
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
            above would correspond to approximately 1 in 5000 alleles being mutant — exactly the order of
            magnitude seen in real sequencing surveys.
          </div>
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
        The ~19 species of Hawaiian <em>Bidens</em> (tarweeds / beggar-ticks, in Asteraceae) all descend
        from one or two mainland ancestors that arrived on the islands by long-distance seed dispersal
        approximately 5 million years ago. The founding population was very small — likely fewer than
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
            question="Try different founder sizes above. If you halve the founder population size, how does the spread of founder allele frequencies change? (Hint: standard deviation scales as 1/\u221AN.)"
            correct={correct}
            feedback={correct === true
              ? 'Correct. Since \u03C3 \u221D 1/\u221A(2N), halving N multiplies the spread by \u221A2 \u2248 1.41 — so the spread increases substantially (roughly doubles in a qualitative sense). Smaller founding groups deviate from the source more dramatically; this is why founder effects are strongest for the smallest colonizing groups.'
              : correct === false
              ? 'Compare N=20 vs N=5 in the simulator above. Does the histogram get wider or narrower when N shrinks?'
              : undefined}
          >
            <div className="flex gap-2 flex-wrap">
              {[
                'Spread roughly doubles (increases)',
                'Spread stays the same',
                'Spread is cut in half',
                'No predictable change',
              ].map(opt => (
                <button key={opt} onClick={() => {
                  setAnswer(opt);
                  const isCorrect = opt.startsWith('Spread roughly doubles');
                  setCorrect(isCorrect);
                  if (isCorrect) setTimeout(onComplete, 1500);
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
        </>
      )}
    </div>
  );
}

// ── Module definition ───────────────────────────────────────────────────

const EXPERIMENTS = [
  // Titles are plain; ModuleShell prefixes the index at render time (F-044).
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
