/**
 * Population Genetics Curriculum Module
 *
 * Seven experiments exploring evolutionary forces:
 *  1. Allele Frequencies — count alleles, compute p and q
 *  2. Hardy-Weinberg Equilibrium — predict genotype frequencies
 *  3. Genetic Drift — small vs large populations
 *  4. Natural Selection — directional selection on a recessive
 *  5. Migration — gene flow between populations
 *  6. Mutation-Selection Balance — equilibrium frequency
 *  7. Founder Effect — sampling shifts allele frequencies
 */

import { useState, useMemo, useCallback } from 'react';
import {
  simulate, simulateReplicates, hardyWeinberg, testHWE,
} from './popgen-engine';
import {
  ModuleShell, QuestionPanel, HistogramChart,
  type ModuleDefinition,
} from './components';

// ── Shared visualization components ─────────────────────────────────────

/** SVG line chart showing allele frequency trajectories */
function FrequencyChart({ trajectories, generations, height = 200, colors, labels }: {
  trajectories: number[][];
  generations: number;
  height?: number;
  colors?: string[];
  labels?: string[];
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
          Freq(A)
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

/** Grid of colored circles representing a population */
function PopulationGrid({ genotypes, size = 16 }: {
  genotypes: { AA: number; Aa: number; aa: number };
  size?: number;
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

  const colorMap = { AA: '#6d28d9', Aa: '#a78bfa', aa: '#ede9fe' };
  const borderMap = { AA: '#5b21b6', Aa: '#7c3aed', aa: '#c4b5fd' };

  return (
    <div className="flex flex-wrap gap-1.5 justify-center">
      {individuals.map((g, i) => (
        <div key={i} className="flex items-center justify-center rounded-full border"
          style={{
            width: size, height: size,
            backgroundColor: colorMap[g],
            borderColor: borderMap[g],
          }}
          title={g} />
      ))}
      <div className="w-full flex justify-center gap-4 mt-2 text-[10px] text-stone-500">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: '#6d28d9' }} /> AA
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: '#a78bfa' }} /> Aa
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-full border" style={{ backgroundColor: '#ede9fe', borderColor: '#c4b5fd' }} /> aa
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
  const countA = 2 * pop.AA + pop.Aa;
  const countASmall = pop.Aa + 2 * pop.aa; // count of 'a'
  const trueP = countA / totalAlleles;
  const trueQ = countASmall / totalAlleles;

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
      <p className="text-sm text-stone-600">
        Below is a population of <strong>50 diploid individuals</strong> at a single locus with two alleles: <strong>A</strong> and <strong>a</strong>.
        Each individual has a genotype: AA (dark), Aa (medium), or aa (light).
      </p>

      <PopulationGrid genotypes={pop} />

      <div className="rounded-lg bg-violet-50 border border-violet-200 p-3 text-sm text-violet-800">
        <strong>Count the genotypes:</strong> {pop.AA} AA, {pop.Aa} Aa, {pop.aa} aa
        <br />Total individuals: {pop.AA + pop.Aa + pop.aa} | Total alleles: {totalAlleles}
      </div>

      <QuestionPanel
        question={`Calculate the allele frequencies. Remember: p = freq(A) = (2 × AA + Aa) / (2N), and q = 1 - p.`}
        correct={correct}
        feedback={correct === true
          ? `Correct! p(A) = ${trueP.toFixed(3)}, q(a) = ${trueQ.toFixed(3)}. Allele frequency is the proportion of a specific allele in the population. Note p + q = 1.`
          : correct === false
          ? `Not quite. Count A alleles: each AA contributes 2, each Aa contributes 1. Total A = 2(${pop.AA}) + ${pop.Aa} = ${countA}. Then p = ${countA}/${totalAlleles} = ${trueP.toFixed(3)}.`
          : undefined}
      >
        <div className="flex gap-3 items-end flex-wrap">
          <div>
            <label className="block text-xs text-stone-500 mb-1">p (freq of A)</label>
            <input type="number" step="0.01" min="0" max="1" value={pInput}
              onChange={e => setPInput(e.target.value)}
              className="w-24 rounded-lg border-2 border-stone-200 px-2 py-1.5 text-sm focus:border-violet-400 outline-none" />
          </div>
          <div>
            <label className="block text-xs text-stone-500 mb-1">q (freq of a)</label>
            <input type="number" step="0.01" min="0" max="1" value={qInput}
              onChange={e => setQInput(e.target.value)}
              className="w-24 rounded-lg border-2 border-stone-200 px-2 py-1.5 text-sm focus:border-violet-400 outline-none" />
          </div>
          <button onClick={handleCheck}
            className="rounded-xl bg-gradient-to-b from-violet-500 to-violet-600 px-5 py-2 text-sm font-bold text-white shadow-md hover:shadow-lg">
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
  const [p] = useState(0.4);
  const [predAA, setPredAA] = useState('');
  const [predAa, setPredAa] = useState('');
  const [predaa, setPredaa] = useState('');
  const [predCorrect, setPredCorrect] = useState<boolean | null>(null);
  const [simResult, setSimResult] = useState<{ AA: number; Aa: number; aa: number } | null>(null);
  const [hweTest, setHweTest] = useState<ReturnType<typeof testHWE> | null>(null);

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

  return (
    <div className="space-y-6">
      <p className="text-sm text-stone-600">
        If p(A) = <strong>{p}</strong> and q(a) = <strong>{(1 - p).toFixed(1)}</strong>, and mating is
        random with no selection, drift, migration, or mutation — what genotype frequencies do you expect?
      </p>

      <div className="rounded-lg bg-violet-50 border border-violet-200 p-3 text-sm text-violet-800">
        <strong>Hardy-Weinberg Principle:</strong> Under ideal conditions, genotype frequencies are
        p^2 (AA), 2pq (Aa), q^2 (aa) after one generation of random mating.
      </div>

      <QuestionPanel
        question={`With p = ${p}, predict the genotype frequencies (to 2 decimal places):`}
        correct={predCorrect}
        feedback={predCorrect === true
          ? `Correct! AA = p^2 = ${hw.AA.toFixed(2)}, Aa = 2pq = ${hw.Aa.toFixed(2)}, aa = q^2 = ${hw.aa.toFixed(2)}. These sum to 1.`
          : predCorrect === false
          ? `Remember: AA = p^2 = ${p}^2, Aa = 2pq = 2(${p})(${1 - p}), aa = q^2 = ${1 - p}^2.`
          : undefined}
      >
        <div className="flex gap-3 items-end flex-wrap">
          <div>
            <label className="block text-xs text-stone-500 mb-1">freq(AA) = p^2</label>
            <input type="number" step="0.01" min="0" max="1" value={predAA}
              onChange={e => setPredAA(e.target.value)}
              className="w-24 rounded-lg border-2 border-stone-200 px-2 py-1.5 text-sm focus:border-violet-400 outline-none" />
          </div>
          <div>
            <label className="block text-xs text-stone-500 mb-1">freq(Aa) = 2pq</label>
            <input type="number" step="0.01" min="0" max="1" value={predAa}
              onChange={e => setPredAa(e.target.value)}
              className="w-24 rounded-lg border-2 border-stone-200 px-2 py-1.5 text-sm focus:border-violet-400 outline-none" />
          </div>
          <div>
            <label className="block text-xs text-stone-500 mb-1">freq(aa) = q^2</label>
            <input type="number" step="0.01" min="0" max="1" value={predaa}
              onChange={e => setPredaa(e.target.value)}
              className="w-24 rounded-lg border-2 border-stone-200 px-2 py-1.5 text-sm focus:border-violet-400 outline-none" />
          </div>
          <button onClick={handlePredict}
            className="rounded-xl bg-gradient-to-b from-violet-500 to-violet-600 px-5 py-2 text-sm font-bold text-white shadow-md hover:shadow-lg">
            Check
          </button>
        </div>
      </QuestionPanel>

      {step >= 1 && (
        <div className="space-y-3">
          <p className="text-sm text-stone-600">
            Now simulate random mating in a large population (N=1000) for one generation to verify:
          </p>
          <button onClick={handleSimulate}
            className="rounded-xl bg-gradient-to-b from-violet-500 to-violet-600 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:shadow-lg">
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
              return (
                <div key={g} className="rounded-lg bg-stone-50 border p-3">
                  <div className="font-bold text-stone-700">{g}</div>
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
            <strong>Chi-square test:</strong> X^2 = {hweTest.chiSquare.toFixed(3)}, p-value = {hweTest.pValue.toFixed(3)}.
            {hweTest.inEquilibrium
              ? ' The population IS in Hardy-Weinberg equilibrium — observed matches expected.'
              : ' Slight deviation detected, but with large N this is expected stochastic variation.'}
            <br /><strong>Key insight:</strong> Random mating alone produces HW equilibrium in just ONE generation.
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

  const nReps = 10;
  const gens = 50;

  const runSim = useCallback(() => {
    const small = simulateReplicates({ popSize: 20, initialFreqA: 0.5, generations: gens }, nReps);
    const large = simulateReplicates({ popSize: 500, initialFreqA: 0.5, generations: gens }, nReps);
    setSmallResults(small.map(r => r.freqHistory));
    setLargeResults(large.map(r => r.freqHistory));
    setHasRun(true);
  }, []);

  const smallFinal = smallResults?.map(h => h[h.length - 1]) ?? [];
  const largeFinal = largeResults?.map(h => h[h.length - 1]) ?? [];
  const smallFixed = smallFinal.filter(f => f === 0 || f === 1).length;

  return (
    <div className="space-y-6">
      <p className="text-sm text-stone-600">
        Does population size matter for allele frequency change? Let's compare <strong>small (N=20)</strong>
        vs <strong>large (N=500)</strong> populations, both starting at p = 0.5, with no selection.
      </p>

      <button onClick={runSim}
        className="rounded-xl bg-gradient-to-b from-violet-500 to-violet-600 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:shadow-lg">
        {hasRun ? 'Run Again' : 'Run 10 Replicates Each'}
      </button>

      {hasRun && smallResults && largeResults && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-stone-700 text-center">Small Population (N=20)</h3>
              <FrequencyChart trajectories={smallResults} generations={gens} height={180} />
              <div className="text-xs text-center text-stone-500">
                Fixed: {smallFixed}/{nReps} replicates
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-stone-700 text-center">Large Population (N=500)</h3>
              <FrequencyChart trajectories={largeResults} generations={gens} height={180} />
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
        </>
      )}
    </div>
  );
}

// ── Experiment 4: Natural Selection ─────────────────────────────────────

function Exp4_NaturalSelection({ onComplete }: { onComplete: () => void }) {
  const [selCoeff, setSelCoeff] = useState(0.1);
  const [results, setResults] = useState<number[][] | null>(null);
  const [answer, setAnswer] = useState('');
  const [correct, setCorrect] = useState<boolean | null>(null);

  const gens = 100;

  const runSim = useCallback(() => {
    // A is dominant, aa has fitness 1-s
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
        Now let's add <strong>natural selection</strong>. Allele A is dominant.
        Individuals with genotype <strong>aa</strong> have reduced fitness (survival disadvantage).
        Starting with p(A) = 0.2, watch how selection increases the favorable allele.
      </p>

      <div className="flex items-center gap-4 flex-wrap">
        <label className="text-sm font-semibold text-stone-600">
          Selection coefficient (s) for your simulation:
        </label>
        <input type="range" min="0.01" max="0.5" step="0.01" value={selCoeff}
          onChange={e => setSelCoeff(parseFloat(e.target.value))}
          className="w-40 accent-violet-500" />
        <span className="text-sm font-mono text-violet-700">{selCoeff.toFixed(2)}</span>
        <button onClick={runSim}
          className="rounded-xl bg-gradient-to-b from-violet-500 to-violet-600 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:shadow-lg">
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

  const gens = 80;

  const runSim = useCallback(() => {
    // Pop 1 starts at p=0.1, receives migrants from pop with p=0.9
    const pop1 = simulate({
      popSize: 500, initialFreqA: 0.1, generations: gens,
      migrationRate: migRate, migrantFreqA: 0.9,
    });
    // Pop 2 starts at p=0.9, receives migrants from pop with p=0.1
    const pop2 = simulate({
      popSize: 500, initialFreqA: 0.9, generations: gens,
      migrationRate: migRate, migrantFreqA: 0.1,
    });
    setResults([pop1.freqHistory, pop2.freqHistory]);
  }, [migRate]);

  return (
    <div className="space-y-6">
      <p className="text-sm text-stone-600">
        Two populations start with very different allele frequencies: <strong>Population 1</strong> has p = 0.1,
        <strong> Population 2</strong> has p = 0.9. Each generation, a fraction of individuals migrate between them.
      </p>

      <div className="flex items-center gap-4 flex-wrap">
        <label className="text-sm font-semibold text-stone-600">Migration rate:</label>
        <input type="range" min="0.01" max="0.2" step="0.01" value={migRate}
          onChange={e => setMigRate(parseFloat(e.target.value))}
          className="w-40 accent-violet-500" />
        <span className="text-sm font-mono text-violet-700">{migRate.toFixed(2)}</span>
        <button onClick={runSim}
          className="rounded-xl bg-gradient-to-b from-violet-500 to-violet-600 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:shadow-lg">
          Simulate
        </button>
      </div>

      {results && (
        <>
          <FrequencyChart
            trajectories={results}
            generations={gens}
            colors={['#7c3aed', '#f59e0b']}
            labels={['Population 1 (starts p=0.1)', 'Population 2 (starts p=0.9)']}
          />

          <QuestionPanel
            question="What happens to allele frequencies in the two populations over time?"
            correct={correct}
            feedback={correct === true
              ? 'Correct! Migration (gene flow) homogenizes allele frequencies between populations. Higher migration rates cause faster convergence. This is why connected populations tend to be genetically similar, while isolated populations diverge.'
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
        </>
      )}
    </div>
  );
}

// ── Experiment 6: Mutation-Selection Balance ────────────────────────────

function Exp6_MutationSelectionBalance({ onComplete }: { onComplete: () => void }) {
  const [mu, setMu] = useState(0.001);
  const [s, setS] = useState(0.1);
  const [result, setResult] = useState<number[] | null>(null);
  const [answer, setAnswer] = useState('');
  const [correct, setCorrect] = useState<boolean | null>(null);

  const gens = 500;
  const expectedEq = Math.sqrt(mu / s);

  const runSim = useCallback(() => {
    // Start with no 'a' alleles, let mutation introduce them
    const sim = simulate({
      popSize: 5000, initialFreqA: 1.0, generations: gens,
      fitnessAA: 1, fitnessAa: 1, fitnessaa: 1 - s,
      mutationRate: mu, // A -> a
    });
    // We track freq of A, but we want freq of 'a' = 1-p
    setResult(sim.freqHistory.map(p => 1 - p));
  }, [mu, s]);

  return (
    <div className="space-y-6">
      <p className="text-sm text-stone-600">
        Deleterious alleles should be removed by selection — so why do genetic diseases persist?
        Here, allele <strong>a</strong> is deleterious when homozygous (aa has fitness 1-s), but mutation
        keeps creating new copies at rate {'\u03BC'} (A {'\u2192'} a).
      </p>

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
          className="rounded-xl bg-gradient-to-b from-violet-500 to-violet-600 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:shadow-lg">
          Simulate
        </button>
      </div>

      {result && (
        <>
          <FrequencyChart
            trajectories={[result]}
            generations={gens}
            colors={['#7c3aed']}
          />
          <div className="text-xs text-center text-stone-500">
            Y-axis: frequency of deleterious allele (a)
          </div>

          <div className="rounded-lg bg-violet-50 border border-violet-200 p-3 text-sm text-violet-800">
            <strong>Expected equilibrium:</strong> q {'\u2248'} {'\u221A'}({'\u03BC'}/s) = {'\u221A'}({mu}/{s}) {'\u2248'} {expectedEq.toFixed(4)}
            <br />
            <strong>Observed final freq(a):</strong> {result[result.length - 1].toFixed(4)}
          </div>

          <QuestionPanel
            question="Why do deleterious alleles persist in populations despite selection against them?"
            correct={correct}
            feedback={correct === true
              ? `Correct! Mutation continuously introduces new deleterious alleles, while selection removes them. The balance between these opposing forces maintains the allele at a low but nonzero equilibrium frequency q ${'\u2248'} ${'\u221A'}(${'\u03BC'}/s). Higher mutation rates or weaker selection lead to higher equilibrium frequencies.`
              : correct === false
              ? 'Think about what happens if selection removes all copies — mutation creates new ones...'
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
        </>
      )}
    </div>
  );
}

// ── Experiment 7: Founder Effect ────────────────────────────────────────

function Exp7_FounderEffect({ onComplete }: { onComplete: () => void }) {
  const [founderSize, setFounderSize] = useState(10);
  const [founderFreqs, setFounderFreqs] = useState<number[] | null>(null);

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
      <p className="text-sm text-stone-600">
        When a small group founds a new population, their allele frequencies may differ from the
        source population purely by chance. The <strong>source population</strong> has p(A) = {sourceP}.
        "Found" a new population by sampling a small number of individuals.
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
          className="rounded-xl bg-gradient-to-b from-violet-500 to-violet-600 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:shadow-lg">
          Found {nTrials} Populations
        </button>
      </div>

      {histBins && founderFreqs && (
        <>
          <HistogramChart
            bins={histBins}
            labels={histLabels}
            title={`Allele frequencies in ${nTrials} founded populations (N=${founderSize})`}
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
              <span> — notice the wide spread with such a small founder group!</span>
            )}
          </div>

          <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-800">
            <strong>The Founder Effect:</strong> When a small group colonizes a new area, random sampling can
            dramatically shift allele frequencies from the source population. Smaller founding groups show
            more variation. This is why island populations and isolated communities often have unusual
            allele frequencies — it's drift acting at the moment of founding.
          </div>

          <button onClick={() => onComplete()}
            className="w-full rounded-xl bg-gradient-to-b from-violet-500 to-violet-600 py-3 text-sm font-bold text-white shadow-md">
            Complete Module
          </button>
        </>
      )}
    </div>
  );
}

// ── Module definition ───────────────────────────────────────────────────

const EXPERIMENTS = [
  { id: 'allele_freq', title: '1. Allele Frequencies', subtitle: 'Count alleles and compute p and q', Component: Exp1_AlleleFrequencies },
  { id: 'hwe', title: '2. Hardy-Weinberg', subtitle: 'Predict genotype frequencies from p and q', Component: Exp2_HardyWeinberg },
  { id: 'drift', title: '3. Genetic Drift', subtitle: 'Small vs large populations', Component: Exp3_GeneticDrift },
  { id: 'selection', title: '4. Natural Selection', subtitle: 'Directional change from fitness differences', Component: Exp4_NaturalSelection },
  { id: 'migration', title: '5. Migration', subtitle: 'Gene flow homogenizes populations', Component: Exp5_Migration },
  { id: 'mut_sel_balance', title: '6. Mutation-Selection', subtitle: 'Why deleterious alleles persist', Component: Exp6_MutationSelectionBalance },
  { id: 'founder', title: '7. Founder Effect', subtitle: 'Sampling shifts allele frequencies', Component: Exp7_FounderEffect },
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
