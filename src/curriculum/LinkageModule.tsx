/**
 * Linkage & Recombination Curriculum Module
 *
 * Students discover gene linkage, recombination, chromosome mapping,
 * and statistical testing through seven progressive experiments.
 *
 * Experiment flow:
 *  1. Linked Genes — testcross shows non-1:1:1:1 ratio
 *  2. Coupling vs Repulsion — same genes, different chromosome arrangement
 *  3. Recombination Frequency — count recombinants, calculate RF%
 *  4. Map Distance — RF% = centiMorgans, build a two-gene map
 *  5. Three-Point Testcross — classify 8 offspring classes, determine gene order
 *  6. Chi-Square Test — statistical goodness of fit
 *  7. Interference & Coincidence — double crossover analysis
 */

import { useState, useMemo, useCallback } from 'react';
import {
  linkedCross, chiSquare, classifyThreePoint, threePointAnalysis,
  makeLinkedOrganism, getLinkedPhenotypeLabel,
  BODY_COLOR, WING_TYPE, EYE_COLOR,
  type LinkedOrganism, type LinkedCrossResult, type LinkedGeneDefinition,
} from './linkage-engine';
import {
  ModuleShell, QuestionPanel,
  type ModuleDefinition,
} from './components';

// ── Shared UI pieces for linkage ───────────────────────────────────────

function ChromosomeDiagram({ genes, chrom1, chrom2, label }: {
  genes: LinkedGeneDefinition[];
  chrom1: Record<string, string>;
  chrom2: Record<string, string>;
  label?: string;
}) {
  const w = 320;
  const h = 70;
  const margin = 30;
  const barY1 = 18;
  const barY2 = 44;

  return (
    <div className="inline-flex flex-col items-center gap-1">
      {label && <div className="text-[9px] text-stone-400 font-semibold">{label}</div>}
      <svg width={w} height={h} className="block">
        {/* Chromosome 1 */}
        <rect x={margin} y={barY1} width={w - 2 * margin} height={8} rx={4} fill="#7cb5d4" />
        {/* Chromosome 2 */}
        <rect x={margin} y={barY2} width={w - 2 * margin} height={8} rx={4} fill="#7cb5d4" />
        {/* Gene positions */}
        {genes.map((g, i) => {
          const x = margin + ((w - 2 * margin) / (genes.length + 1)) * (i + 1);
          const a1 = chrom1[g.id] ?? '?';
          const a2 = chrom2[g.id] ?? '?';
          return (
            <g key={g.id}>
              {/* Marks on chrom 1 */}
              <line x1={x} y1={barY1 - 2} x2={x} y2={barY1 + 10} stroke="#1e5a7a" strokeWidth={2} />
              <text x={x} y={barY1 - 5} textAnchor="middle" className="text-[9px] font-bold fill-cyan-900">{a1}</text>
              {/* Marks on chrom 2 */}
              <line x1={x} y1={barY2 - 2} x2={x} y2={barY2 + 10} stroke="#1e5a7a" strokeWidth={2} />
              <text x={x} y={barY2 + 22} textAnchor="middle" className="text-[9px] font-bold fill-cyan-900">{a2}</text>
              {/* Gene name */}
              <text x={x} y={barY1 + 28} textAnchor="middle" className="text-[7px] fill-stone-400">{g.name}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function LinkageRatioBar({ counts }: {
  counts: Record<string, number>;
}) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (total === 0) return null;
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  // Build color from first gene's color map
  const colorPalette = ['#7cb5d4', '#2d6080', '#e8a060', '#c45a3a', '#6ab070', '#9060b0', '#d4a040', '#888'];

  return (
    <div className="space-y-1">
      <div className="flex h-6 rounded-full overflow-hidden border border-stone-200">
        {entries.map(([label, count], idx) => (
          <div key={label} style={{
            width: `${(count / total) * 100}%`,
            backgroundColor: colorPalette[idx % colorPalette.length],
          }} className="relative" title={`${label}: ${count}`}>
            {(count / total) > 0.08 && (
              <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-white drop-shadow-sm">
                {count}
              </span>
            )}
          </div>
        ))}
      </div>
      <div className="flex gap-3 justify-center flex-wrap">
        {entries.map(([label, count], idx) => (
          <div key={label} className="flex items-center gap-1 text-[10px]">
            <span className="w-2.5 h-2.5 rounded-sm border border-stone-200"
              style={{ backgroundColor: colorPalette[idx % colorPalette.length] }} />
            <span className="text-stone-600 font-semibold">{label}: {count}</span>
            <span className="text-stone-400">({((count / total) * 100).toFixed(1)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LinkageCrossWorkbench({ parentA, parentB, genes, recombFreqs, onCross, crossResult, sampleSize = 100, label, coincidence = 1 }: {
  parentA: LinkedOrganism;
  parentB: LinkedOrganism;
  genes: LinkedGeneDefinition[];
  recombFreqs: number[];
  onCross: (result: LinkedCrossResult) => void;
  crossResult: LinkedCrossResult | null;
  sampleSize?: number;
  label?: string;
  coincidence?: number;
}) {
  const doCross = useCallback(() => {
    const result = linkedCross(parentA, parentB, genes, recombFreqs, sampleSize, coincidence);
    onCross(result);
  }, [parentA, parentB, genes, recombFreqs, sampleSize, onCross, coincidence]);

  return (
    <div className="space-y-4">
      {label && <div className="text-xs font-bold text-stone-400 uppercase tracking-wider">{label}</div>}
      <div className="flex items-center justify-center gap-4 flex-wrap">
        <ChromosomeDiagram genes={genes} chrom1={parentA.chromosome1} chrom2={parentA.chromosome2} label="Parent 1" />
        <span className="text-2xl font-bold text-stone-400">&times;</span>
        <ChromosomeDiagram genes={genes} chrom1={parentB.chromosome1} chrom2={parentB.chromosome2} label="Parent 2" />
        <button onClick={doCross}
          className="ml-4 rounded-xl bg-gradient-to-b from-cyan-500 to-cyan-600 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:shadow-lg active:from-cyan-600 transition-all">
          Cross!
        </button>
      </div>
      {crossResult && (
        <div className="space-y-3">
          <div className="text-xs text-stone-500 font-semibold text-center">
            {crossResult.total} offspring produced
          </div>
          <LinkageRatioBar counts={crossResult.phenotypeCounts} />
        </div>
      )}
    </div>
  );
}

// ── Experiments ──────────────────────────────────────────────────────────

function Exp1_LinkedGenes({ onComplete }: { onComplete: () => void }) {
  // Coupling: AB/ab × ab/ab (testcross)
  const parentAB = useMemo(() => makeLinkedOrganism(
    { body: 'b+', wing: 'vg+' },
    { body: 'b', wing: 'vg' },
    'coupling',
  ), []);
  const tester = useMemo(() => makeLinkedOrganism(
    { body: 'b', wing: 'vg' },
    { body: 'b', wing: 'vg' },
    'tester',
  ), []);

  const [crossResult, setCrossResult] = useState<LinkedCrossResult | null>(null);
  const [answer, setAnswer] = useState('');
  const [correct, setCorrect] = useState<boolean | null>(null);

  const genes = [BODY_COLOR, WING_TYPE];
  const recombFreqs = [0.17]; // 17 cM between body and wing

  return (
    <div className="space-y-6">
      <p className="text-sm text-stone-600">
        Cross a fly heterozygous for <strong>body color</strong> (b+/b) and <strong>wing type</strong> (vg+/vg) with a
        homozygous recessive tester (b/b, vg/vg). If the genes assort independently, you'd expect a <strong>1:1:1:1</strong> ratio.
      </p>

      <LinkageCrossWorkbench
        parentA={parentAB} parentB={tester} genes={genes} recombFreqs={recombFreqs}
        onCross={setCrossResult} crossResult={crossResult}
        sampleSize={200} label="Testcross: b+/b vg+/vg × b/b vg/vg"
      />

      {crossResult && (
        <QuestionPanel
          question="The offspring DON'T follow a 1:1:1:1 ratio. Two classes are much more common than the other two. Why?"
          correct={correct}
          feedback={correct === true
            ? "Correct! These two genes are on the SAME chromosome. They tend to be inherited together — this is called genetic linkage. The rare classes are recombinants, produced when crossing over separates the linked alleles."
            : correct === false
            ? "Look at which classes are most frequent. The parental combinations (b+ vg+ and b vg) are far more common than the recombinant combinations..."
            : undefined}
        >
          <div className="flex gap-2 flex-wrap">
            {[
              'The genes are on the same chromosome (linked)',
              'One gene is epistatic to the other',
              'The sample size is too small',
            ].map(opt => (
              <button key={opt} onClick={() => {
                setAnswer(opt);
                const isCorrect = opt.includes('same chromosome');
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
      )}
    </div>
  );
}

function Exp2_CouplingRepulsion({ onComplete }: { onComplete: () => void }) {
  // Coupling: AB/ab  vs  Repulsion: Ab/aB
  const coupling = useMemo(() => makeLinkedOrganism(
    { body: 'b+', wing: 'vg+' },
    { body: 'b', wing: 'vg' },
    'coupling',
  ), []);
  const repulsion = useMemo(() => makeLinkedOrganism(
    { body: 'b+', wing: 'vg' },
    { body: 'b', wing: 'vg+' },
    'repulsion',
  ), []);
  const tester = useMemo(() => makeLinkedOrganism(
    { body: 'b', wing: 'vg' },
    { body: 'b', wing: 'vg' },
    'tester',
  ), []);

  const genes = [BODY_COLOR, WING_TYPE];
  const recombFreqs = [0.17];

  const [couplingResult, setCouplingResult] = useState<LinkedCrossResult | null>(null);
  const [repulsionResult, setRepulsionResult] = useState<LinkedCrossResult | null>(null);
  const [step, setStep] = useState(0);
  const [answer, setAnswer] = useState('');
  const [correct, setCorrect] = useState<boolean | null>(null);

  return (
    <div className="space-y-6">
      <p className="text-sm text-stone-600">
        Both parents below are <strong>b+/b vg+/vg</strong> — same genotype! But the alleles are arranged
        differently on the chromosomes. Compare the two testcrosses.
      </p>

      <LinkageCrossWorkbench
        parentA={coupling} parentB={tester} genes={genes} recombFreqs={recombFreqs}
        onCross={(r) => { setCouplingResult(r); setStep(s => Math.max(s, 1)); }}
        crossResult={couplingResult}
        sampleSize={200} label="Coupling (cis): b+ vg+ / b vg × tester"
      />

      {step >= 1 && (
        <LinkageCrossWorkbench
          parentA={repulsion} parentB={tester} genes={genes} recombFreqs={recombFreqs}
          onCross={(r) => { setRepulsionResult(r); setStep(s => Math.max(s, 2)); }}
          crossResult={repulsionResult}
          sampleSize={200} label="Repulsion (trans): b+ vg / b vg+ × tester"
        />
      )}

      {step >= 2 && repulsionResult && (
        <QuestionPanel
          question="Same genes, same alleles — but different results! Which statement explains this?"
          correct={correct}
          feedback={correct === true
            ? "Exactly! In coupling (cis), the two dominant alleles are on the same chromosome. In repulsion (trans), each chromosome carries one dominant and one recessive. The PARENTAL classes are always the most frequent, so the arrangement determines which phenotypes dominate."
            : correct === false
            ? "Think about which alleles travel together on each chromosome. The most common offspring classes reflect the parental chromosome arrangements."
            : undefined}
        >
          <div className="flex gap-2 flex-wrap">
            {[
              'The arrangement of alleles on chromosomes (cis vs trans) determines parental classes',
              'The recombination frequency changed between crosses',
              'Dominance relationships switched',
            ].map(opt => (
              <button key={opt} onClick={() => {
                setAnswer(opt);
                const isCorrect = opt.includes('cis vs trans');
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
      )}
    </div>
  );
}

function Exp3_RecombFrequency({ onComplete }: { onComplete: () => void }) {
  const parent = useMemo(() => makeLinkedOrganism(
    { body: 'b+', wing: 'vg+' },
    { body: 'b', wing: 'vg' },
    'het',
  ), []);
  const tester = useMemo(() => makeLinkedOrganism(
    { body: 'b', wing: 'vg' },
    { body: 'b', wing: 'vg' },
    'tester',
  ), []);

  const genes = [BODY_COLOR, WING_TYPE];
  const recombFreqs = [0.17];

  const [crossResult, setCrossResult] = useState<LinkedCrossResult | null>(null);
  const [rfInput, setRfInput] = useState('');
  const [rfCorrect, setRfCorrect] = useState<boolean | null>(null);

  const actualRF = crossResult ? (crossResult.recombinationFrequency * 100) : 0;

  return (
    <div className="space-y-6">
      <p className="text-sm text-stone-600">
        Perform the testcross again. This time, identify the <strong>recombinant</strong> offspring
        (new allele combinations not seen in either parent chromosome) and calculate the <strong>recombination frequency</strong>.
      </p>

      <LinkageCrossWorkbench
        parentA={parent} parentB={tester} genes={genes} recombFreqs={recombFreqs}
        onCross={setCrossResult} crossResult={crossResult}
        sampleSize={500} label="Testcross: b+ vg+ / b vg × b vg / b vg"
      />

      {crossResult && (
        <div className="space-y-4">
          <div className="rounded-lg bg-cyan-50 border border-cyan-200 p-3 text-sm text-cyan-800 space-y-2">
            <p><strong>Parental classes</strong> (most common): the allele combos that match the parent chromosomes.</p>
            <p><strong>Recombinant classes</strong> (less common): new allele combos from crossing over.</p>
            <p className="font-mono text-xs">
              Recombinants found: <strong>{crossResult.recombinantCount}</strong> / {crossResult.total} total
            </p>
          </div>

          <QuestionPanel
            question={`RF% = (recombinants / total) × 100. Calculate the recombination frequency (round to nearest whole number):`}
            correct={rfCorrect}
            feedback={rfCorrect === true
              ? `Correct! The recombination frequency is ~${Math.round(actualRF)}%. This tells us these genes are about ${Math.round(actualRF)} map units (centiMorgans) apart on the chromosome.`
              : rfCorrect === false
              ? `Not quite. RF% = (${crossResult.recombinantCount} / ${crossResult.total}) × 100 = ${actualRF.toFixed(1)}%. Round to the nearest whole number.`
              : undefined}
          >
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={rfInput}
                onChange={e => setRfInput(e.target.value)}
                placeholder="Enter RF%"
                className="rounded-lg border-2 border-stone-200 px-3 py-2 text-sm w-24 focus:border-cyan-400 focus:outline-none"
              />
              <span className="text-sm text-stone-500">%</span>
              <button
                onClick={() => {
                  const val = parseFloat(rfInput);
                  const isCorrect = Math.abs(val - Math.round(actualRF)) <= 2;
                  setRfCorrect(isCorrect);
                  if (isCorrect) setTimeout(onComplete, 1500);
                }}
                className="rounded-lg border-2 border-cyan-400 bg-cyan-50 px-3 py-2 text-xs font-semibold text-cyan-700 hover:bg-cyan-100"
              >
                Check
              </button>
            </div>
          </QuestionPanel>
        </div>
      )}
    </div>
  );
}

function Exp4_MapDistance({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const [answer, setAnswer] = useState('');
  const [correct, setCorrect] = useState<boolean | null>(null);
  const [mapInput, setMapInput] = useState(50); // slider for gene position

  // Known RF = 17% = 17 cM
  const targetCM = 17;

  return (
    <div className="space-y-6">
      <p className="text-sm text-stone-600">
        You've calculated that body color and wing type have a recombination frequency of about <strong>17%</strong>.
        In genetics, <strong>1% RF = 1 centiMorgan (cM)</strong> of map distance.
      </p>

      <div className="rounded-lg bg-cyan-50 border border-cyan-200 p-3 text-sm text-cyan-800">
        <strong>RF% = map distance in cM</strong>. This is Alfred Sturtevant's insight from 1913 —
        recombination frequency between genes reflects their physical distance on the chromosome.
      </div>

      <QuestionPanel
        question="If RF = 17%, what is the map distance between body color and wing type?"
        correct={correct}
        feedback={correct === true
          ? "Correct! 17% RF = 17 cM. Now let's visualize this on a chromosome map."
          : correct === false
          ? "Remember: 1% RF = 1 centiMorgan. The conversion is direct."
          : undefined}
      >
        <div className="flex gap-2 flex-wrap">
          {['8.5 cM', '17 cM', '34 cM', '1.7 cM'].map(opt => (
            <button key={opt} onClick={() => {
              setAnswer(opt);
              const isCorrect = opt === '17 cM';
              setCorrect(isCorrect);
              if (isCorrect) setStep(1);
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

      {step >= 1 && (
        <div className="space-y-4">
          <p className="text-sm text-stone-600">
            Place the <strong>wing type</strong> gene on the chromosome map. Body color is fixed at position 0.
            Drag the slider to position wing type at the correct map distance.
          </p>
          <div className="relative">
            {/* Chromosome map SVG */}
            <svg width="100%" height="80" viewBox="0 0 400 80">
              {/* Chromosome bar */}
              <rect x="30" y="25" width="340" height="10" rx="5" fill="#7cb5d4" />
              {/* Scale markers */}
              {[0, 10, 20, 30, 40, 50].map(cm => {
                const x = 30 + (cm / 50) * 340;
                return (
                  <g key={cm}>
                    <line x1={x} y1="20" x2={x} y2="40" stroke="#4a8ab0" strokeWidth={1} />
                    <text x={x} y="55" textAnchor="middle" className="text-[9px] fill-stone-400">{cm} cM</text>
                  </g>
                );
              })}
              {/* Body color gene (fixed at 0) */}
              <circle cx="30" cy="30" r="6" fill="#2d6080" />
              <text x="30" y="72" textAnchor="middle" className="text-[8px] font-bold fill-cyan-900">Body</text>
              {/* Wing type gene (draggable) */}
              <circle cx={30 + (mapInput / 50) * 340} cy="30" r="6" fill="#e8a060" />
              <text x={30 + (mapInput / 50) * 340} y="72" textAnchor="middle" className="text-[8px] font-bold fill-amber-700">Wing</text>
            </svg>
            <input
              type="range" min="0" max="50" step="1" value={mapInput}
              onChange={e => setMapInput(parseInt(e.target.value))}
              className="w-full"
            />
            <div className="text-center text-sm text-stone-600 font-semibold">
              Current position: {mapInput} cM
            </div>
          </div>
          <button
            onClick={() => {
              if (Math.abs(mapInput - targetCM) <= 2) {
                setStep(2);
                setTimeout(onComplete, 1500);
              } else {
                setStep(-1); // show error briefly
                setTimeout(() => setStep(1), 1500);
              }
            }}
            className="rounded-lg border-2 border-cyan-400 bg-cyan-50 px-4 py-2 text-xs font-semibold text-cyan-700 hover:bg-cyan-100"
          >
            Place Gene
          </button>
          {step === -1 && (
            <div className="text-sm text-red-600 font-semibold">Not quite — remember, 17% RF = 17 cM from body color.</div>
          )}
          {step === 2 && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-800">
              <strong>You built your first genetic map!</strong> Body color and wing type are 17 cM apart.
              This technique — converting recombination frequencies to map distances — is the foundation of
              all genetic mapping.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Exp5_ThreePointCross({ onComplete }: { onComplete: () => void }) {
  // Three genes: body color, eye color, wing type
  // True order: body — eye — wing (or we set up a specific order for pedagogy)
  // We present them as body, wing, eye and students must discover the correct order
  const threeGenes: [LinkedGeneDefinition, LinkedGeneDefinition, LinkedGeneDefinition] = [BODY_COLOR, WING_TYPE, EYE_COLOR];

  // True chromosome order: body — eye — wing
  // RFs: body-eye = 8 cM, eye-wing = 10 cM
  // We present genes in a different order so students discover the middle gene
  const trueOrderGenes: [LinkedGeneDefinition, LinkedGeneDefinition, LinkedGeneDefinition] = [BODY_COLOR, EYE_COLOR, WING_TYPE];

  const parent = useMemo(() => makeLinkedOrganism(
    { body: 'b+', wing: 'vg+', eye: 'cn+' },
    { body: 'b', wing: 'vg', eye: 'cn' },
    'trihybrid',
  ), []);
  const tester = useMemo(() => makeLinkedOrganism(
    { body: 'b', wing: 'vg', eye: 'cn' },
    { body: 'b', wing: 'vg', eye: 'cn' },
    'tester',
  ), []);

  const [crossResult, setCrossResult] = useState<LinkedCrossResult | null>(null);
  const [step, setStep] = useState(0);
  const [answer, setAnswer] = useState('');
  const [correct, setCorrect] = useState<boolean | null>(null);
  const [orderAnswer, setOrderAnswer] = useState('');
  const [orderCorrect, setOrderCorrect] = useState<boolean | null>(null);

  // Recomb freqs in TRUE order: body-eye, eye-wing
  const recombFreqs = [0.08, 0.10];

  const handleCross = useCallback(() => {
    // Cross using true gene order for correct recombination simulation
    const result = linkedCross(parent, tester, trueOrderGenes, recombFreqs, 1000, 0.6);
    // But display phenotype counts using the presented gene order
    const phenoCounts: Record<string, number> = {};
    const genoCounts: Record<string, number> = {};
    for (const off of result.offspring) {
      const pl = getLinkedPhenotypeLabel(off, threeGenes);
      phenoCounts[pl] = (phenoCounts[pl] ?? 0) + 1;
      const gl = threeGenes.map(g => `${off.chromosome1[g.id]}/${off.chromosome2[g.id]}`).join(' ');
      genoCounts[gl] = (genoCounts[gl] ?? 0) + 1;
    }
    setCrossResult({ ...result, phenotypeCounts: phenoCounts, genotypeCounts: genoCounts });
  }, [parent, tester]);

  // Classify offspring
  const classData = useMemo(() => {
    if (!crossResult) return null;
    return classifyThreePoint(crossResult.offspring, threeGenes);
  }, [crossResult]);

  return (
    <div className="space-y-6">
      <p className="text-sm text-stone-600">
        Now we track <strong>three linked genes</strong> in Drosophila: body color (b+/b),
        wing type (vg+/vg), and eye color (cn+/cn). Perform a testcross with 1000 offspring.
      </p>

      <div className="flex items-center justify-center gap-4 flex-wrap">
        <ChromosomeDiagram genes={threeGenes} chrom1={parent.chromosome1} chrom2={parent.chromosome2} label="Trihybrid Parent" />
        <span className="text-2xl font-bold text-stone-400">&times;</span>
        <ChromosomeDiagram genes={threeGenes} chrom1={tester.chromosome1} chrom2={tester.chromosome2} label="Tester" />
        <button onClick={handleCross}
          className="ml-4 rounded-xl bg-gradient-to-b from-cyan-500 to-cyan-600 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:shadow-lg active:from-cyan-600 transition-all">
          Cross!
        </button>
      </div>

      {crossResult && classData && (
        <div className="space-y-4">
          <div className="text-xs text-stone-500 font-semibold text-center">
            {crossResult.total} offspring — 8 phenotype classes (body, wing, eye: + = wild-type, - = mutant)
          </div>

          {/* Offspring class table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-cyan-50">
                  <th className="border border-cyan-200 px-2 py-1 text-left">Class</th>
                  <th className="border border-cyan-200 px-2 py-1">Body</th>
                  <th className="border border-cyan-200 px-2 py-1">Wing</th>
                  <th className="border border-cyan-200 px-2 py-1">Eye</th>
                  <th className="border border-cyan-200 px-2 py-1">Count</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(classData).sort((a, b) => b[1] - a[1]).map(([pattern, count], idx) => {
                  const isParental = idx < 2;
                  const isDCO = idx >= Object.entries(classData).length - 2 && count < 20;
                  return (
                    <tr key={pattern} className={
                      isParental ? 'bg-cyan-50' :
                      isDCO ? 'bg-amber-50' :
                      'bg-white'
                    }>
                      <td className="border border-stone-200 px-2 py-1 font-mono">{pattern}</td>
                      <td className="border border-stone-200 px-2 py-1 text-center">{pattern[0] === '+' ? 'Wild' : 'Black'}</td>
                      <td className="border border-stone-200 px-2 py-1 text-center">{pattern[1] === '+' ? 'Normal' : 'Vestigial'}</td>
                      <td className="border border-stone-200 px-2 py-1 text-center">{pattern[2] === '+' ? 'Wild' : 'Cinnabar'}</td>
                      <td className="border border-stone-200 px-2 py-1 text-center font-bold">{count}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <QuestionPanel
            question="The two LEAST frequent classes are double crossovers. Compare them to the parental classes — which gene changed position?"
            correct={correct}
            feedback={correct === true
              ? "Right! The double crossover class differs from the parental class at only the MIDDLE gene. This tells us wing type is NOT in the middle."
              : correct === false
              ? "Look at the rarest two classes and compare each allele (+/-) to the most common (parental) classes. Which gene flipped?"
              : undefined}
          >
            <div className="flex gap-2 flex-wrap">
              {['Body color', 'Wing type', 'Eye color'].map(opt => (
                <button key={opt} onClick={() => {
                  setAnswer(opt);
                  // The gene that flips in DCO is the middle gene
                  // True order is body-eye-wing, so eye is middle when presented as body,wing,eye
                  // In our presentation order (body, wing, eye), wing flips in DCO means wing is presented as middle
                  // But true middle is eye... let's check what actually happens
                  // Parent chrom1: b+ vg+ cn+, chrom2: b vg cn
                  // True order: body-eye-wing with RFs 0.08, 0.10
                  // DCO: body stays, eye flips, wing stays (in true order)
                  // In presented order (body, wing, eye): body stays, wing stays, eye flips
                  // So eye color is the gene that changed!
                  const isCorrect = opt === 'Eye color';
                  setCorrect(isCorrect);
                  if (isCorrect) setStep(1);
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

          {step >= 1 && (
            <QuestionPanel
              question="The gene that flips in the double crossover class is the MIDDLE gene. What is the correct gene order?"
              correct={orderCorrect}
              feedback={orderCorrect === true
                ? "Excellent! Body — Eye — Wing is the correct order. Eye color is in the middle because it's the gene that switches in the double crossover class. You've mapped three genes!"
                : orderCorrect === false
                ? "The middle gene is the one that changed in the double crossover. Since eye color flipped, it must be between body and wing."
                : undefined}
            >
              <div className="flex gap-2 flex-wrap">
                {[
                  'Body — Wing — Eye',
                  'Body — Eye — Wing',
                  'Eye — Body — Wing',
                ].map(opt => (
                  <button key={opt} onClick={() => {
                    setOrderAnswer(opt);
                    const isCorrect = opt === 'Body — Eye — Wing';
                    setOrderCorrect(isCorrect);
                    if (isCorrect) setTimeout(onComplete, 1500);
                  }}
                    className={`rounded-lg border-2 px-3 py-2 text-xs font-semibold transition-all ${
                      orderAnswer === opt
                        ? orderCorrect ? 'border-emerald-400 bg-emerald-50' : 'border-red-300 bg-red-50'
                        : 'border-stone-200 bg-white hover:border-stone-300'
                    }`}>
                    {opt}
                  </button>
                ))}
              </div>
            </QuestionPanel>
          )}
        </div>
      )}
    </div>
  );
}

function Exp6_ChiSquare({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const [inputs, setInputs] = useState<string[]>(['', '', '', '']);
  const [chiResult, setChiResult] = useState<{ statistic: number; df: number; pValue: number } | null>(null);
  const [answer, setAnswer] = useState('');
  const [correct, setCorrect] = useState<boolean | null>(null);

  // Given data: testcross offspring for two linked genes
  // Expected under independent assortment: 1:1:1:1
  const observed = [180, 170, 26, 24]; // parental:parental:recomb:recomb
  const labels = ['Wild body, Normal wings', 'Black body, Vestigial wings', 'Wild body, Vestigial wings', 'Black body, Normal wings'];
  const total = observed.reduce((a, b) => a + b, 0);
  const expected = [total / 4, total / 4, total / 4, total / 4]; // 1:1:1:1

  const chiSqTerms = observed.map((o, i) => ((o - expected[i]) ** 2) / expected[i]);
  const totalChiSq = chiSqTerms.reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      <p className="text-sm text-stone-600">
        From a testcross of linked genes, you observe the following offspring counts.
        If the genes were <strong>unlinked</strong>, you'd expect a <strong>1:1:1:1</strong> ratio.
        Let's use the <strong>chi-square test</strong> to statistically evaluate whether these data fit that expectation.
      </p>

      {/* Data table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-cyan-50">
              <th className="border border-cyan-200 px-2 py-1 text-left">Phenotype</th>
              <th className="border border-cyan-200 px-2 py-1">Observed (O)</th>
              <th className="border border-cyan-200 px-2 py-1">Expected (E)</th>
              <th className="border border-cyan-200 px-2 py-1">(O-E)²/E</th>
            </tr>
          </thead>
          <tbody>
            {labels.map((label, i) => (
              <tr key={i}>
                <td className="border border-stone-200 px-2 py-1">{label}</td>
                <td className="border border-stone-200 px-2 py-1 text-center font-bold">{observed[i]}</td>
                <td className="border border-stone-200 px-2 py-1 text-center">{expected[i].toFixed(0)}</td>
                <td className="border border-stone-200 px-2 py-1 text-center">
                  <input
                    type="number"
                    step="0.1"
                    value={inputs[i]}
                    onChange={e => {
                      const next = [...inputs];
                      next[i] = e.target.value;
                      setInputs(next);
                    }}
                    placeholder="?"
                    className="w-16 rounded border border-stone-200 px-1 py-0.5 text-center text-xs focus:border-cyan-400 focus:outline-none"
                  />
                </td>
              </tr>
            ))}
            <tr className="bg-stone-50 font-bold">
              <td className="border border-stone-200 px-2 py-1" colSpan={3}>Total chi-square =</td>
              <td className="border border-stone-200 px-2 py-1 text-center">
                {inputs.every(v => v !== '') ? inputs.reduce((s, v) => s + parseFloat(v || '0'), 0).toFixed(1) : '—'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <button
        onClick={() => {
          // Check if inputs are roughly correct
          const studentTotal = inputs.reduce((s, v) => s + parseFloat(v || '0'), 0);
          const isClose = Math.abs(studentTotal - totalChiSq) < totalChiSq * 0.15;
          if (isClose) {
            const result = chiSquare(observed, expected);
            setChiResult(result);
            setStep(1);
          } else {
            setStep(-1);
            setTimeout(() => setStep(0), 2000);
          }
        }}
        className="rounded-lg border-2 border-cyan-400 bg-cyan-50 px-4 py-2 text-xs font-semibold text-cyan-700 hover:bg-cyan-100"
      >
        Calculate Chi-Square
      </button>

      {step === -1 && (
        <div className="text-sm text-red-600">
          Check your calculations. For each class: (O-E)²/E. For example, the first class: ({observed[0]} - {expected[0].toFixed(0)})² / {expected[0].toFixed(0)} = {chiSqTerms[0].toFixed(2)}
        </div>
      )}

      {step >= 1 && chiResult && (
        <div className="space-y-4">
          <div className="rounded-lg bg-cyan-50 border border-cyan-200 p-3 text-sm text-cyan-800 space-y-1">
            <p><strong>Chi-square = {chiResult.statistic.toFixed(2)}</strong>, df = {chiResult.df}</p>
            <p>Critical value at p=0.05 with {chiResult.df} df = <strong>7.815</strong></p>
            <p>Your chi-square ({chiResult.statistic.toFixed(2)}) is {chiResult.statistic > 7.815 ? 'GREATER' : 'LESS'} than the critical value.</p>
          </div>

          <QuestionPanel
            question="Based on the chi-square test, do these data fit the 1:1:1:1 ratio expected for independent assortment?"
            correct={correct}
            feedback={correct === true
              ? "Correct! The chi-square value far exceeds the critical value, so we REJECT the null hypothesis. These genes are NOT assorting independently — they are linked! The chi-square test gives us statistical confidence in this conclusion."
              : correct === false
              ? `The chi-square (${chiResult.statistic.toFixed(1)}) is much larger than the critical value (7.815). When chi-square exceeds the critical value, we reject the null hypothesis.`
              : undefined}
          >
            <div className="flex gap-2 flex-wrap">
              {[
                'No — reject the 1:1:1:1 hypothesis (genes are linked)',
                'Yes — the data fit a 1:1:1:1 ratio',
              ].map(opt => (
                <button key={opt} onClick={() => {
                  setAnswer(opt);
                  const isCorrect = opt.includes('reject');
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
        </div>
      )}
    </div>
  );
}

function Exp7_Interference({ onComplete }: { onComplete: () => void }) {
  const threeGenes: [LinkedGeneDefinition, LinkedGeneDefinition, LinkedGeneDefinition] = [BODY_COLOR, WING_TYPE, EYE_COLOR];
  const trueOrderGenes: [LinkedGeneDefinition, LinkedGeneDefinition, LinkedGeneDefinition] = [BODY_COLOR, EYE_COLOR, WING_TYPE];

  const parent = useMemo(() => makeLinkedOrganism(
    { body: 'b+', wing: 'vg+', eye: 'cn+' },
    { body: 'b', wing: 'vg', eye: 'cn' },
    'trihybrid',
  ), []);
  const tester = useMemo(() => makeLinkedOrganism(
    { body: 'b', wing: 'vg', eye: 'cn' },
    { body: 'b', wing: 'vg', eye: 'cn' },
    'tester',
  ), []);

  const [crossResult, setCrossResult] = useState<LinkedCrossResult | null>(null);
  const [step, setStep] = useState(0);
  const [coincInput, setCoinInput] = useState('');
  const [intInput, setIntInput] = useState('');
  const [correct, setCorrect] = useState<boolean | null>(null);

  const recombFreqs = [0.08, 0.10]; // body-eye, eye-wing
  const usedCoincidence = 0.5; // strong positive interference

  const handleCross = useCallback(() => {
    const result = linkedCross(parent, tester, trueOrderGenes, recombFreqs, 2000, usedCoincidence);
    setCrossResult(result);
    setStep(1);
  }, [parent, tester]);

  // Analyze results
  const analysis = useMemo(() => {
    if (!crossResult) return null;
    return threePointAnalysis(crossResult.offspring, threeGenes);
  }, [crossResult]);

  // Compute expected vs observed DCO
  const expectedDCO = crossResult ? (analysis ? (analysis.distances[0] / 100) * (analysis.distances[1] / 100) * crossResult.total : 0) : 0;
  const observedDCO = analysis?.classCounts.doubleCO ?? 0;
  const actualCoincidence = expectedDCO > 0 ? observedDCO / expectedDCO : 0;
  const actualInterference = 1 - actualCoincidence;

  return (
    <div className="space-y-6">
      <p className="text-sm text-stone-600">
        In the three-point cross, we found double crossover offspring. But are there as many as we'd
        <strong> expect</strong>? If crossovers were independent, the expected frequency of double crossovers
        would be the product of the two single-crossover frequencies.
      </p>

      <div className="flex items-center justify-center gap-4 flex-wrap">
        <ChromosomeDiagram genes={threeGenes} chrom1={parent.chromosome1} chrom2={parent.chromosome2} label="Trihybrid" />
        <span className="text-2xl font-bold text-stone-400">&times;</span>
        <span className="text-sm text-stone-500">tester (all recessive)</span>
        <button onClick={handleCross}
          className="ml-4 rounded-xl bg-gradient-to-b from-cyan-500 to-cyan-600 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:shadow-lg active:from-cyan-600 transition-all">
          Cross! (2000 offspring)
        </button>
      </div>

      {step >= 1 && analysis && crossResult && (
        <div className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-cyan-50">
                  <th className="border border-cyan-200 px-2 py-1">Class</th>
                  <th className="border border-cyan-200 px-2 py-1">Count</th>
                </tr>
              </thead>
              <tbody>
                <tr><td className="border border-stone-200 px-2 py-1">Parental</td><td className="border border-stone-200 px-2 py-1 text-center font-bold">{analysis.classCounts.parental}</td></tr>
                <tr><td className="border border-stone-200 px-2 py-1">Single crossover (Region I)</td><td className="border border-stone-200 px-2 py-1 text-center font-bold">{analysis.classCounts.singleI}</td></tr>
                <tr><td className="border border-stone-200 px-2 py-1">Single crossover (Region II)</td><td className="border border-stone-200 px-2 py-1 text-center font-bold">{analysis.classCounts.singleII}</td></tr>
                <tr className="bg-amber-50"><td className="border border-stone-200 px-2 py-1">Double crossover</td><td className="border border-stone-200 px-2 py-1 text-center font-bold">{analysis.classCounts.doubleCO}</td></tr>
              </tbody>
            </table>
          </div>

          <div className="rounded-lg bg-cyan-50 border border-cyan-200 p-3 text-sm text-cyan-800 space-y-2">
            <p><strong>Map distances:</strong></p>
            <p>Region I (body — eye): ~{analysis.distances[0].toFixed(1)} cM</p>
            <p>Region II (eye — wing): ~{analysis.distances[1].toFixed(1)} cM</p>
            <p><strong>Expected double crossovers</strong> = RF₁ × RF₂ × total = {(analysis.distances[0] / 100).toFixed(3)} × {(analysis.distances[1] / 100).toFixed(3)} × {crossResult.total} = <strong>{expectedDCO.toFixed(1)}</strong></p>
            <p><strong>Observed double crossovers</strong> = <strong>{observedDCO}</strong></p>
          </div>

          <div className="space-y-3">
            <p className="text-sm text-stone-600">
              Calculate the <strong>coefficient of coincidence</strong> and <strong>interference</strong>:
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1">
                <span className="text-xs text-stone-600">Coincidence (observed/expected DCO):</span>
                <input type="number" step="0.01" value={coincInput}
                  onChange={e => setCoinInput(e.target.value)}
                  placeholder="?"
                  className="w-20 rounded border-2 border-stone-200 px-2 py-1 text-xs focus:border-cyan-400 focus:outline-none" />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-stone-600">Interference (1 - coincidence):</span>
                <input type="number" step="0.01" value={intInput}
                  onChange={e => setIntInput(e.target.value)}
                  placeholder="?"
                  className="w-20 rounded border-2 border-stone-200 px-2 py-1 text-xs focus:border-cyan-400 focus:outline-none" />
              </div>
            </div>
            <button
              onClick={() => {
                const cVal = parseFloat(coincInput);
                const iVal = parseFloat(intInput);
                const cClose = Math.abs(cVal - actualCoincidence) < 0.15;
                const iClose = Math.abs(iVal - actualInterference) < 0.15;
                setCorrect(cClose && iClose);
                if (cClose && iClose) setStep(2);
              }}
              className="rounded-lg border-2 border-cyan-400 bg-cyan-50 px-4 py-2 text-xs font-semibold text-cyan-700 hover:bg-cyan-100"
            >
              Check
            </button>
            {correct === false && (
              <div className="text-sm text-red-600">
                Coincidence = {observedDCO} / {expectedDCO.toFixed(1)} = {actualCoincidence.toFixed(2)}.
                Interference = 1 - {actualCoincidence.toFixed(2)} = {actualInterference.toFixed(2)}.
              </div>
            )}
          </div>

          {step >= 2 && (
            <div className="space-y-4">
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-800 space-y-2">
                <p><strong>Positive interference!</strong> There are FEWER double crossovers than expected ({observedDCO} observed vs {expectedDCO.toFixed(1)} expected).</p>
                <p>Coincidence = {actualCoincidence.toFixed(2)}, Interference = {actualInterference.toFixed(2)}</p>
                <p>This means one crossover <strong>inhibits</strong> a second crossover nearby. This is a real biological phenomenon — the physical mechanics of chromosome crossing over make nearby double events less likely.</p>
              </div>
              <button onClick={onComplete}
                className="w-full rounded-xl bg-gradient-to-b from-cyan-500 to-cyan-600 py-3 text-sm font-bold text-white shadow-md">
                Complete Module
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Module definition ───────────────────────────────────────────────────

const EXPERIMENTS = [
  { id: 'linked_genes', title: '1. Linked Genes', subtitle: 'When genes don\'t assort independently', Component: Exp1_LinkedGenes },
  { id: 'coupling_repulsion', title: '2. Coupling vs Repulsion', subtitle: 'Cis and trans arrangements', Component: Exp2_CouplingRepulsion },
  { id: 'recomb_freq', title: '3. Recombination Frequency', subtitle: 'Counting recombinants', Component: Exp3_RecombFrequency },
  { id: 'map_distance', title: '4. Map Distance', subtitle: 'RF% = centiMorgans', Component: Exp4_MapDistance },
  { id: 'three_point', title: '5. Three-Point Cross', subtitle: 'Determine gene order', Component: Exp5_ThreePointCross },
  { id: 'chi_square', title: '6. Chi-Square Test', subtitle: 'Statistical hypothesis testing', Component: Exp6_ChiSquare },
  { id: 'interference', title: '7. Interference', subtitle: 'Double crossover analysis', Component: Exp7_Interference },
];

const LINKAGE_MODULE: ModuleDefinition = {
  id: 'linkage',
  title: 'Linkage & Recombination',
  subtitle: 'Project 2: Gene Mapping',
  color: 'cyan',
  backLink: { href: '/breeding-game/modules.html', label: '\u2190 Back to Hub' },
  experiments: EXPERIMENTS,
};

export default function LinkageModule() {
  return <ModuleShell module={LINKAGE_MODULE} />;
}
