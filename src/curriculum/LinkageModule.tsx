/**
 * Linkage & Recombination Curriculum Module
 *
 * Students discover gene linkage, recombination, chromosome mapping,
 * and statistical testing through seven progressive experiments.
 *
 * Organism: maize (corn). The canonical plant linkage trio lives on
 * chromosome 9 — colored aleurone (C), kernel shape (Sh), waxy endosperm
 * (Wx) — the three genes Creighton & McClintock used in 1931 to prove
 * crossing over corresponds to physical chromosome exchange.
 *
 * Experiment flow:
 *  0. Creighton & McClintock — 1931 proof that crossovers are physical
 *  1. Linked Genes — testcross shows non-1:1:1:1 ratio
 *  2. Coupling vs Repulsion — same genes, different chromosome arrangement
 *  3. Recombination Frequency — count recombinants, calculate RF%
 *  4. Map Distance — RF% = centiMorgans, build a two-gene map
 *  5. Three-Point Testcross — classify 8 offspring classes, determine gene order
 *  6. Chi-Square Test — statistical goodness of fit
 *  7. Interference & Coincidence — double crossover analysis
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  linkedCross, chiSquare, classifyThreePoint, threePointAnalysis,
  makeLinkedOrganism, getLinkedPhenotypeLabel,
  KERNEL_COLOR, KERNEL_SHAPE, ENDOSPERM,
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
  const w = 240;
  const h = 70;
  const margin = 24;
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
              {/* Gene name — placed in the gap between the two chromosome bars */}
              <text x={x} y={35} textAnchor="middle" className="text-[7px] fill-stone-500">{g.name}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// Map a phenotype label (e.g. "Purple, Plump" or "Yellow, Shrunken, Starchy")
// to a deterministic fill color. We key off the color word first (C/c drives
// the visually dominant anthocyanin pigment), then nudge shade using the
// other phenotypes so reciprocal classes are distinguishable but still
// recognizable as "purple-ish" or "yellow-ish". This replaces the old
// sort-order palette which scrambled colors across runs.
function phenotypeFill(label: string): string {
  const l = label.toLowerCase();
  const purple = l.includes('purple');
  const yellow = l.includes('yellow');
  const shrunken = l.includes('shrunken');
  const waxy = l.includes('waxy');

  // Base: Purple (anthocyanin) dark, Yellow (colorless aleurone) pale
  // Shrunken darkens/desaturates; Waxy shifts warmer. Values chosen to stay
  // on a purple-or-yellow family so the label always matches the swatch.
  if (purple) {
    if (shrunken && waxy) return '#3a1a4a';
    if (shrunken) return '#4a1e5a';
    if (waxy) return '#6e3a80';
    return '#5a2a6b'; // canonical purple plump (starchy) — matches KERNEL_COLOR
  }
  if (yellow) {
    if (shrunken && waxy) return '#a8823a';
    if (shrunken) return '#c49a48';
    if (waxy) return '#d4a860';
    return '#e8c24a'; // canonical yellow plump (starchy) — matches KERNEL_COLOR
  }
  return '#888';
}

function LinkageRatioBar({ counts }: {
  counts: Record<string, number>;
}) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (total === 0) return null;
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-1">
      <div className="flex h-6 rounded-full overflow-hidden border border-stone-200">
        {entries.map(([label, count]) => {
          const fill = phenotypeFill(label);
          const isPale = label.toLowerCase().includes('yellow');
          return (
            <div key={label} style={{
              width: `${(count / total) * 100}%`,
              backgroundColor: fill,
            }} className="relative" title={`${label}: ${count}`}>
              {(count / total) > 0.08 && (
                <span className={`absolute inset-0 flex items-center justify-center text-[8px] font-bold drop-shadow-sm ${isPale ? 'text-stone-800' : 'text-white'}`}>
                  {count}
                </span>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex gap-3 justify-center flex-wrap">
        {entries.map(([label, count]) => (
          <div key={label} className="flex items-center gap-1 text-[10px]">
            <span className="w-2.5 h-2.5 rounded-sm border border-stone-200"
              style={{ backgroundColor: phenotypeFill(label) }} />
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
      {label && <div className="text-xs font-bold text-stone-400 tracking-wider">{label}</div>}
      <div className="flex items-center justify-center gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <ChromosomeDiagram genes={genes} chrom1={parentA.chromosome1} chrom2={parentA.chromosome2} label="Parent 1" />
          <span className="text-2xl font-bold text-stone-400">&times;</span>
          <ChromosomeDiagram genes={genes} chrom1={parentB.chromosome1} chrom2={parentB.chromosome2} label="Parent 2" />
        </div>
        <button onClick={doCross}
          className="rounded-xl bg-gradient-to-b from-cyan-700 to-cyan-800 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:shadow-lg active:from-cyan-800 transition-all">
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

function Exp0_CreightonMcClintock({ onComplete }: { onComplete: () => void }) {
  const [prediction, setPrediction] = useState<string | null>(null);
  const [predictionLocked, setPredictionLocked] = useState(false);
  const [exitAnswer, setExitAnswer] = useState<string | null>(null);
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

  const handlePrediction = (key: string) => {
    if (predictionLocked) return;
    setPrediction(key);
    setPredictionLocked(true);
  };

  return (
    <div className="space-y-6">
      {/* Historical framing */}
      <div className="rounded-xl bg-stone-50 border border-stone-200 p-5 space-y-3">
        <h3 className="font-['Patrick_Hand'] text-lg text-stone-700 tracking-wide">CORNELL, 1931</h3>
        <p className="text-sm text-stone-600 leading-relaxed">
          It's 1931. At Cornell, Barbara McClintock and Harriet Creighton are working on maize genetics.
          Everyone in the field — going back to Morgan and Sturtevant in the 1910s — has been using
          "crossing-over" as an abstract term for whatever produces recombinant offspring. Nobody has{' '}
          <em>seen</em> a crossover. Nobody has proven that crossing-over corresponds to a physical exchange
          of chromosome segments.
        </p>
        <p className="text-sm text-stone-600 leading-relaxed">
          Creighton and McClintock have an idea: take a maize plant with two{' '}
          <em>cytologically visible</em> markers on one chromosome — a knob at one end visible under the
          microscope, and a translocated piece at the other end also visible — and make the same chromosome
          carry two <em>genetic</em> markers scorable in kernels. If crossing-over is a physical exchange, then
          every recombinant kernel should also show a physically recombinant chromosome under the scope.
        </p>
      </div>

      {/* Prediction panel */}
      <QuestionPanel
        question="If crossing-over is a physical chromosome exchange, what do you predict Creighton and McClintock observed?"
        correct={predictionLocked ? (prediction === 'physical_swap' ? true : false) : null}
        feedback={prediction === 'physical_swap'
          ? "Good prediction. Let's see if the data agree."
          : predictionLocked
          ? "Interesting prediction. Let's see what actually happened."
          : undefined}
      >
        <div className="flex gap-2 flex-wrap">
          {[
            { key: 'physical_swap', label: 'Recombinant kernels carry recombinant chromosomes (physical swap matches genetic recombination)' },
            { key: 'same_chroms', label: 'Recombinant kernels carry the same chromosomes as parental kernels' },
            { key: 'broken', label: 'Recombinant kernels carry broken chromosomes' },
            { key: 'extra', label: 'Recombinant kernels carry extra chromosomes' },
          ].map(opt => (
            <button key={opt.key} onClick={() => handlePrediction(opt.key)}
              disabled={predictionLocked}
              className={`rounded-lg border-2 px-3 py-2 text-xs font-semibold transition-all text-left ${
                predictionLocked && prediction === opt.key
                  ? prediction === 'physical_swap'
                    ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                    : 'border-amber-400 bg-amber-50 text-amber-800'
                  : predictionLocked
                  ? 'border-stone-100 bg-stone-100 text-stone-400 cursor-not-allowed'
                  : 'border-stone-200 bg-white hover:border-stone-300 text-stone-700'
              }`}>
              {opt.label}
            </button>
          ))}
        </div>
      </QuestionPanel>

      {/* Observation table — shown after prediction is locked */}
      {predictionLocked && (
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-stone-700">What Creighton &amp; McClintock observed:</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  <th className="border border-stone-300 bg-stone-100 px-3 py-2 text-left text-stone-600"></th>
                  <th className="border border-stone-300 bg-stone-100 px-3 py-2 text-center text-stone-600 font-semibold">Parental chromosomes</th>
                  <th className="border border-stone-300 bg-stone-100 px-3 py-2 text-center text-stone-600 font-semibold">Recombinant chromosomes</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-stone-300 bg-stone-50 px-3 py-2 font-semibold text-stone-700">Parental kernels</td>
                  <td className="border border-stone-300 px-3 py-2 text-center text-emerald-700 font-bold">Common (observed)</td>
                  <td className="border border-stone-300 px-3 py-2 text-center text-stone-400">Not observed</td>
                </tr>
                <tr>
                  <td className="border border-stone-300 bg-stone-50 px-3 py-2 font-semibold text-stone-700">Recombinant kernels</td>
                  <td className="border border-stone-300 px-3 py-2 text-center text-stone-400">Not observed</td>
                  <td className="border border-stone-300 px-3 py-2 text-center text-emerald-700 font-bold">Observed (every time!)</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-stone-500 italic">
            Every recombinant kernel had a physically recombinant chromosome. Every parental kernel had a physically parental chromosome.
          </p>
        </div>
      )}

      {/* Reveal callout */}
      {predictionLocked && (
        <div className="rounded-xl bg-violet-50 border border-violet-200 p-5 space-y-2">
          <p className="text-sm text-violet-800 leading-relaxed">
            <strong>Genetic recombination corresponds to physical chromosome exchange.</strong> This was the
            first proof that crossing-over is a real cytological event, not a metaphor. Published in{' '}
            <em>PNAS</em>, August 1931 — the single most important paper in the history of the chromosome
            theory of inheritance.
          </p>
        </div>
      )}

      {/* Exit question — gates onComplete */}
      {predictionLocked && (
        <QuestionPanel
          question="Why does Creighton and McClintock's result matter for everything else in this module?"
          correct={exitCorrect}
          feedback={exitCorrect === true
            ? "Exactly. Because crossovers are physical exchanges, recombination frequency tells you something about physical distance. Genetic maps are maps of real chromosomes."
            : exitCorrect === false
            ? "Think about what it means to measure recombination frequency — if crossovers weren't physical, what would those measurements correspond to?"
            : undefined}
        >
          <div className="flex gap-2 flex-wrap">
            {[
              { key: 'rf_physical', label: 'It proves that RF measurements correspond to physical distances on chromosomes — so genetic maps are physical maps' },
              { key: 'all_linked', label: 'It proves that all genes are linked' },
              { key: 'mutation', label: 'It proves that mutation rates are constant' },
              { key: 's_phase', label: 'It proves that chromosomes replicate during S phase' },
            ].map(opt => (
              <button key={opt.key} onClick={() => {
                if (exitCorrect === true) return;
                setExitAnswer(opt.key);
                const isCorrect = opt.key === 'rf_physical';
                setExitCorrect(isCorrect);
                if (isCorrect) setForwardEverCorrect(true);
              }}
                disabled={exitCorrect === true}
                className={`rounded-lg border-2 px-3 py-2 text-xs font-semibold transition-all text-left ${
                  exitAnswer === opt.key
                    ? exitCorrect ? 'border-emerald-400 bg-emerald-50 text-emerald-800' : 'border-red-300 bg-red-50 text-red-800'
                    : exitCorrect === true
                    ? 'border-stone-100 bg-stone-100 text-stone-400 cursor-not-allowed'
                    : 'border-stone-200 bg-white hover:border-stone-300 text-stone-700'
                }`}>
                {opt.label}
              </button>
            ))}
          </div>
        </QuestionPanel>
      )}

      {/* Tease for the rest of the module */}
      {exitCorrect === true && (
        <div className="rounded-lg bg-cyan-50 border border-cyan-200 p-4">
          <p className="text-sm text-cyan-800 font-semibold">
            Now that you believe crossovers are physical, the rest of this module is about how to measure them — and what those measurements tell you about genome architecture.
          </p>
        </div>
      )}

      {/* Backward problem */}
      {forwardEverCorrect && (
        <>
          <hr className="border-stone-200" />
          <QuestionPanel
            question="A colleague claims they found recombinant kernels that do NOT have recombinant chromosomes. If true, what would this mean for the chromosome theory?"
            correct={backCorrect}
            feedback={backCorrect === true
              ? "Correct! Gene conversion is a real phenomenon where genetic information transfers between homologs without reciprocal exchange. It produces recombinant allele combinations without the physical chromosome rearrangement Creighton and McClintock used as their marker. The chromosome theory isn't wrong — it just has a nuance that wasn't visible in 1931."
              : backCorrect === false
              ? "Think about whether there are mechanisms other than reciprocal crossover that could produce new allele combinations. The chromosome theory is well-established — but is physical exchange the ONLY way to recombine alleles?"
              : undefined}
          >
            <div className="text-xs font-semibold tracking-wider text-stone-500 uppercase mb-1 font-hand">
              Working backward
            </div>
            <div className="flex flex-col gap-2">
              {[
                { key: 'a', label: 'Crossing-over is not always a physical exchange — some recombination is non-reciprocal or gene conversion' },
                { key: 'b', label: 'The chromosome theory is wrong' },
                { key: 'c', label: "Creighton and McClintock's experiment was flawed" },
                { key: 'd', label: 'Maize chromosomes behave differently from other organisms' },
              ].map(opt => (
                <button key={opt.key} onClick={() => {
                  setBackAnswer(opt.key);
                  const isCorrect = opt.key === 'a';
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
    </div>
  );
}

function Exp1_LinkedGenes({ onComplete }: { onComplete: () => void }) {
  // Coupling: CSh/csh × csh/csh (testcross)
  const parentCSh = useMemo(() => makeLinkedOrganism(
    { color: 'C', shape: 'Sh' },
    { color: 'c', shape: 'sh' },
    'coupling',
  ), []);
  const tester = useMemo(() => makeLinkedOrganism(
    { color: 'c', shape: 'sh' },
    { color: 'c', shape: 'sh' },
    'tester',
  ), []);

  const [prediction, setPrediction] = useState<string | null>(null);
  const [crossResult, setCrossResult] = useState<LinkedCrossResult | null>(null);
  const [answer, setAnswer] = useState('');
  const [correct, setCorrect] = useState<boolean | null>(null);
  const [forwardEverCorrect, setForwardEverCorrect] = useState(false);
  const [backAnswer, setBackAnswer] = useState('');
  const [backCorrect, setBackCorrect] = useState<boolean | null>(null);
  const [backCompleted, setBackCompleted] = useState(false);

  useEffect(() => {
    if (!backCompleted) return;
    const t = setTimeout(onComplete, 1500);
    return () => clearTimeout(t);
  }, [backCompleted, onComplete]);

  const genes = [KERNEL_COLOR, KERNEL_SHAPE];
  const recombFreqs = [0.17]; // 17 cM between C and Sh (pedagogical value)

  return (
    <div className="space-y-6">
      <p className="text-sm text-stone-600">
        You are about to cross a maize plant heterozygous for <strong>aleurone color</strong> (C/c) and <strong>kernel shape</strong> (Sh/sh) with a
        homozygous recessive tester (c/c, sh/sh).
      </p>

      {/* 1.1 — Prediction step before Cross */}
      <div className="rounded-xl border-2 border-stone-200 bg-stone-50 p-4 space-y-3">
        <p className="text-sm font-semibold text-stone-700">
          Before you cross: if these two genes are on <em>different</em> chromosomes, what phenotype ratio do you expect in the testcross offspring?
        </p>
        <div className="flex gap-2 flex-wrap">
          {[
            { label: '1:1:1:1 (independent assortment)', key: '1:1:1:1' },
            { label: '9:3:3:1', key: '9:3:3:1' },
            { label: 'All one class', key: 'all' },
            { label: "Can't say yet", key: 'unsure' },
          ].map(opt => (
            <button key={opt.key} onClick={() => { if (!prediction) setPrediction(opt.key); }}
              disabled={prediction !== null}
              className={`rounded-lg border-2 px-3 py-2 text-xs font-semibold transition-all ${
                prediction === opt.key
                  ? 'border-violet-400 bg-violet-50 text-violet-800'
                  : prediction !== null
                  ? 'border-stone-100 bg-stone-100 text-stone-400 cursor-not-allowed'
                  : 'border-stone-200 bg-white hover:border-stone-300'
              }`}>
              {opt.label}
            </button>
          ))}
        </div>
        {prediction && (
          <p className="text-xs text-stone-500 italic">
            Prediction locked. Now perform the cross to see what actually happens.
          </p>
        )}
      </div>

      {prediction && (
        <LinkageCrossWorkbench
          parentA={parentCSh} parentB={tester} genes={genes} recombFreqs={recombFreqs}
          onCross={setCrossResult} crossResult={crossResult}
          sampleSize={200} label="Testcross: C Sh / c sh  x  c sh / c sh"
        />
      )}

      {crossResult && (
        <>
          {prediction === '1:1:1:1' && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
              You predicted 1:1:1:1 — a good prediction if the genes are on different chromosomes.
              But look at the numbers. The four classes are <strong>not</strong> equal.
            </div>
          )}
          {prediction && prediction !== '1:1:1:1' && (
            <div className="rounded-lg bg-stone-50 border border-stone-200 p-3 text-sm text-stone-600">
              Look at the offspring counts. Are the four classes equal? What pattern do you see?
            </div>
          )}

          <QuestionPanel
            question="The kernels on the ear DON'T follow a 1:1:1:1 ratio. Two classes are much more common than the other two. Why?"
            correct={correct}
            feedback={correct === true
              ? "Correct! These two genes are on the SAME chromosome (maize chromosome 9). They tend to be inherited together — this is called genetic linkage. The rare classes are recombinants, produced when crossing over separates the linked alleles."
              : correct === false
              ? "Look at which kernel classes are most frequent. The parental combinations (Purple Plump and Yellow Shrunken) are far more common than the recombinant combinations..."
              : undefined}
          >
            <div className="flex gap-2 flex-wrap">
              {[
                'The genes are on the same chromosome',
                'One gene is epistatic to the other',
                'The sample size is too small',
              ].map(opt => (
                <button key={opt} onClick={() => {
                  setAnswer(opt);
                  const isCorrect = opt.includes('same chromosome');
                  setCorrect(isCorrect);
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

          {/* 1.3 — Molecular crossover callout */}
          {correct === true && (
            <div className="space-y-4">
              <div className="rounded-xl border-2 border-violet-200 bg-violet-50 p-4 space-y-2">
                <p className="text-sm font-semibold text-violet-900">How does crossing over work?</p>
                <p className="text-sm text-violet-800">
                  During <strong>prophase I</strong> of meiosis, homologous chromosomes pair up (<strong>synapsis</strong>) and
                  form physical connections called <strong>chiasmata</strong>. At each chiasma, two of the four chromatids
                  break and rejoin with each other — swapping segments of DNA.
                </p>
                <p className="text-sm text-violet-800">
                  The result: two chromatids remain <strong>parental</strong> (unchanged), and two become
                  <strong> recombinant</strong> (carrying new allele combinations). This is why we see mostly parental
                  phenotypes, with a smaller fraction of recombinants — each crossover event produces exactly
                  two parental and two recombinant chromatids out of the four in the tetrad.
                </p>
              </div>

              {/* 1.6 — Named insight callout */}
              <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-4 space-y-2">
                <p className="text-sm font-bold text-amber-900">When Mendel's Second Law breaks</p>
                <p className="text-sm text-amber-800">
                  Mendel's Law of Independent Assortment says alleles of different genes segregate
                  independently during gamete formation — producing a 1:1:1:1 testcross ratio. But that law
                  assumes the genes are on <strong>different chromosomes</strong>. When two genes sit on the
                  <strong> same</strong> chromosome, they are <strong>linked</strong>: they travel together unless a
                  crossover separates them. The closer the genes, the rarer the recombinants.
                </p>
              </div>

              {!forwardEverCorrect && (
                <button onClick={() => setForwardEverCorrect(true)}
                  className="rounded-lg border-2 border-cyan-400 bg-cyan-50 px-4 py-2 text-xs font-semibold text-cyan-700 hover:bg-cyan-100">
                  Continue
                </button>
              )}
            </div>
          )}

          {/* Backward problem */}
          {forwardEverCorrect && (
            <>
              <hr className="border-stone-200" />
              <QuestionPanel
                question="You observe an 8:1:1:8 testcross result for two genes. What can you conclude?"
                correct={backCorrect}
                feedback={backCorrect === true
                  ? "Correct! An 8:1:1:8 ratio means the parental classes vastly outnumber the recombinants. This high parental:recombinant ratio indicates tight linkage — the two genes are close together on the same chromosome, with a recombination frequency of about 1/(8+1) ≈ 11%."
                  : backCorrect === false
                  ? "Look at the ratio: 8 parental : 1 recombinant : 1 recombinant : 8 parental. The parental classes dominate. What does a very low recombinant fraction tell you about the genes' physical relationship?"
                  : undefined}
              >
                <div className="text-xs font-semibold tracking-wider text-stone-500 uppercase mb-1 font-hand">
                  Working backward
                </div>
                <div className="flex flex-col gap-2">
                  {[
                    { key: 'a', label: 'The genes are close together on the same chromosome' },
                    { key: 'b', label: 'The genes are far apart on the same chromosome' },
                    { key: 'c', label: 'The genes are on different chromosomes' },
                    { key: 'd', label: 'One gene is epistatic to the other' },
                  ].map(opt => (
                    <button key={opt.key} onClick={() => {
                      setBackAnswer(opt.key);
                      const isCorrect = opt.key === 'a';
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
        </>
      )}
    </div>
  );
}

function Exp2_CouplingRepulsion({ onComplete }: { onComplete: () => void }) {
  // Coupling: C Sh / c sh   vs   Repulsion: C sh / c Sh
  const coupling = useMemo(() => makeLinkedOrganism(
    { color: 'C', shape: 'Sh' },
    { color: 'c', shape: 'sh' },
    'coupling',
  ), []);
  const repulsion = useMemo(() => makeLinkedOrganism(
    { color: 'C', shape: 'sh' },
    { color: 'c', shape: 'Sh' },
    'repulsion',
  ), []);
  const tester = useMemo(() => makeLinkedOrganism(
    { color: 'c', shape: 'sh' },
    { color: 'c', shape: 'sh' },
    'tester',
  ), []);

  const genes = [KERNEL_COLOR, KERNEL_SHAPE];
  const recombFreqs = [0.17];

  const [couplingResult, setCouplingResult] = useState<LinkedCrossResult | null>(null);
  const [repulsionResult, setRepulsionResult] = useState<LinkedCrossResult | null>(null);
  const [step, setStep] = useState(0);
  const [answer, setAnswer] = useState('');
  const [correct, setCorrect] = useState<boolean | null>(null);
  const [forwardEverCorrect, setForwardEverCorrect] = useState(false);
  const [backAnswer, setBackAnswer] = useState('');
  const [backCorrect, setBackCorrect] = useState<boolean | null>(null);
  const [backCompleted, setBackCompleted] = useState(false);

  useEffect(() => {
    if (!backCompleted) return;
    const t = setTimeout(onComplete, 1500);
    return () => clearTimeout(t);
  }, [backCompleted, onComplete]);

  return (
    <div className="space-y-6">
      <p className="text-sm text-stone-600">
        Both parents below are <strong>C/c Sh/sh</strong> — same genotype! But the alleles are arranged
        differently on the chromosomes. Compare the two testcrosses.
      </p>

      <LinkageCrossWorkbench
        parentA={coupling} parentB={tester} genes={genes} recombFreqs={recombFreqs}
        onCross={(r) => { setCouplingResult(r); setStep(s => Math.max(s, 1)); }}
        crossResult={couplingResult}
        sampleSize={200} label="Coupling (cis): C Sh / c sh × tester"
      />

      {step >= 1 && (
        <LinkageCrossWorkbench
          parentA={repulsion} parentB={tester} genes={genes} recombFreqs={recombFreqs}
          onCross={(r) => { setRepulsionResult(r); setStep(s => Math.max(s, 2)); }}
          crossResult={repulsionResult}
          sampleSize={200} label="Repulsion (trans): C sh / c Sh × tester"
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
      )}

      {/* Backward problem */}
      {forwardEverCorrect && (
        <>
          <hr className="border-stone-200" />
          <QuestionPanel
            question="A testcross gives mostly Purple Shrunken and Yellow Plump kernels, with a few Purple Plump and Yellow Shrunken. What is the parental chromosome arrangement?"
            correct={backCorrect}
            feedback={backCorrect === true
              ? "Correct! The most common offspring classes are the parental types. Purple Shrunken (C sh) and Yellow Plump (c Sh) dominate, meaning the parent's chromosomes carried C with sh on one homolog and c with Sh on the other — that's repulsion (trans)."
              : backCorrect === false
              ? "The parental classes are the most frequent offspring. If Purple Shrunken and Yellow Plump dominate, what allele combinations must be on each parental chromosome?"
              : undefined}
          >
            <div className="text-xs font-semibold tracking-wider text-stone-500 uppercase mb-1 font-hand">
              Working backward
            </div>
            <div className="flex flex-col gap-2">
              {[
                { key: 'a', label: 'Repulsion: C sh / c Sh' },
                { key: 'b', label: 'Coupling: C Sh / c sh' },
                { key: 'c', label: 'Cannot determine from phenotype data' },
                { key: 'd', label: 'The genes are unlinked' },
              ].map(opt => (
                <button key={opt.key} onClick={() => {
                  setBackAnswer(opt.key);
                  const isCorrect = opt.key === 'a';
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
    </div>
  );
}

function Exp3_RecombFrequency({ onComplete }: { onComplete: () => void }) {
  const parent = useMemo(() => makeLinkedOrganism(
    { color: 'C', shape: 'Sh' },
    { color: 'c', shape: 'sh' },
    'het',
  ), []);
  const tester = useMemo(() => makeLinkedOrganism(
    { color: 'c', shape: 'sh' },
    { color: 'c', shape: 'sh' },
    'tester',
  ), []);

  const genes = [KERNEL_COLOR, KERNEL_SHAPE];
  const recombFreqs = [0.17];

  const [crossResult, setCrossResult] = useState<LinkedCrossResult | null>(null);
  const [rfInput, setRfInput] = useState('');
  const [rfCorrect, setRfCorrect] = useState<boolean | null>(null);
  // 1.5 — Noise literacy: replicate RF dots
  const [replicateRFs, setReplicateRFs] = useState<number[]>([]);
  const [forwardEverCorrect, setForwardEverCorrect] = useState(false);
  const [backAnswer, setBackAnswer] = useState('');
  const [backCorrect, setBackCorrect] = useState<boolean | null>(null);
  const [backCompleted, setBackCompleted] = useState(false);

  useEffect(() => {
    if (!backCompleted) return;
    const t = setTimeout(onComplete, 1500);
    return () => clearTimeout(t);
  }, [backCompleted, onComplete]);

  const actualRF = crossResult ? (crossResult.recombinationFrequency * 100) : 0;

  const runReplicates = useCallback(() => {
    const rfs: number[] = [];
    for (let i = 0; i < 10; i++) {
      const rep = linkedCross(parent, tester, genes, recombFreqs, 500, 1);
      rfs.push(rep.recombinationFrequency * 100);
    }
    setReplicateRFs(rfs);
  }, [parent, tester, genes, recombFreqs]);

  return (
    <div className="space-y-6">
      <p className="text-sm text-stone-600">
        Perform the testcross again. This time, identify the <strong>recombinant</strong> offspring
        (new allele combinations not seen in either parent chromosome) and calculate the <strong>recombination frequency</strong>.
      </p>

      {/* 1.2 — Derive RF from gamete multiplication rule */}
      <div className="rounded-xl border-2 border-violet-200 bg-violet-50 p-4 space-y-2">
        <p className="text-sm font-semibold text-violet-900">From crossover rate to expected ratio</p>
        <p className="text-sm text-violet-800">
          If C and Sh were on <strong>different chromosomes</strong> (unlinked), each gamete class would have
          probability 1/2 x 1/2 = <strong>1/4</strong>, giving a <strong>1:1:1:1</strong> testcross ratio.
        </p>
        <p className="text-sm text-violet-800">
          But if they are <strong>linked with 17% recombination</strong>, crossovers happen 17% of the time.
          That means 83% of gametes are parental, 17% are recombinant. Each parental class gets
          ~0.83/2 = <strong>0.415</strong> and each recombinant class gets ~0.17/2 = <strong>0.085</strong>.
        </p>
        <p className="text-sm text-violet-800">
          In 100 offspring, expect roughly <strong>41.5 : 8.5 : 8.5 : 41.5</strong> (parental : recomb : recomb : parental)
          — about a <strong>5:1:1:5</strong> ratio, very different from the 1:1:1:1 of independent assortment.
        </p>
      </div>

      <LinkageCrossWorkbench
        parentA={parent} parentB={tester} genes={genes} recombFreqs={recombFreqs}
        onCross={setCrossResult} crossResult={crossResult}
        sampleSize={500} label="Testcross: C Sh / c sh  x  c sh / c sh"
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
            question={`RF% = (recombinants / total) x 100. Calculate the recombination frequency (round to nearest whole number):`}
            correct={rfCorrect}
            feedback={rfCorrect === true
              ? `Correct! The recombination frequency in your sample is ~${actualRF.toFixed(1)}%, consistent with the canonical C-Sh distance of 17 cM. This tells us these genes are about 17 map units (centiMorgans) apart on the chromosome.`
              : rfCorrect === false
              ? `Not quite. RF% = (${crossResult.recombinantCount} / ${crossResult.total}) x 100 = ${actualRF.toFixed(1)}%. Round to the nearest whole number.`
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
                  // Accept +/-2 of EITHER the sampled RF from this run OR the
                  // target 17 cM (true population RF; see recombFreqs=[0.17]
                  // above). With n=500 and p=0.17, the sample drifts enough
                  // that "17" -- the textbook answer Exp 4 demands -- can get
                  // rejected if we only check against the sampled RF.
                  const targetRF = 17;
                  const isCorrect =
                    Math.abs(val - Math.round(actualRF)) <= 2 ||
                    Math.abs(val - targetRF) <= 2;
                  setRfCorrect(isCorrect);
                }}
                className="rounded-lg border-2 border-cyan-400 bg-cyan-50 px-3 py-2 text-xs font-semibold text-cyan-700 hover:bg-cyan-100"
              >
                Check
              </button>
            </div>
          </QuestionPanel>

          {/* 1.5 — Noise literacy: replicate strip chart */}
          {rfCorrect === true && (
            <div className="space-y-3">
              <p className="text-sm text-stone-600">
                Your RF was {actualRF.toFixed(1)}% from one sample. But a different ear of corn might give a slightly
                different number. How much does RF bounce around due to sampling?
              </p>
              <button onClick={runReplicates}
                className="rounded-lg border-2 border-cyan-400 bg-cyan-50 px-4 py-2 text-xs font-semibold text-cyan-700 hover:bg-cyan-100">
                Run this testcross 10 more times
              </button>
              {replicateRFs.length > 0 && (
                <div className="space-y-2">
                  {/* Strip chart */}
                  <div className="relative h-12 rounded-lg bg-stone-100 border border-stone-200 overflow-hidden">
                    {/* Shaded 17% +/- 2SE band: SE = sqrt(0.17*0.83/500) ~ 0.0168, 2SE ~ 3.4% */}
                    <div className="absolute top-0 bottom-0"
                      style={{
                        left: `${((13.6 - 5) / 30) * 100}%`,
                        width: `${((20.4 - 13.6) / 30) * 100}%`,
                        backgroundColor: 'rgba(139, 92, 246, 0.15)',
                      }} />
                    {/* 17% reference line */}
                    <div className="absolute top-0 bottom-0 w-px bg-violet-500"
                      style={{ left: `${((17 - 5) / 30) * 100}%` }} />
                    {/* Dots */}
                    {replicateRFs.map((rf, i) => (
                      <div key={i} className="absolute w-2.5 h-2.5 rounded-full bg-cyan-600 border border-white"
                        style={{
                          left: `${((rf - 5) / 30) * 100}%`,
                          top: `${20 + (i % 3) * 12}%`,
                          transform: 'translateX(-50%)',
                        }}
                        title={`${rf.toFixed(1)}%`} />
                    ))}
                  </div>
                  <div className="flex justify-between text-[9px] text-stone-400 px-1">
                    <span>5%</span>
                    <span>17% (true RF)</span>
                    <span>35%</span>
                  </div>
                  <p className="text-xs text-stone-500 italic">
                    Each dot is one testcross with n=500. The shaded band shows 17% +/- 2 standard errors (~13.6-20.4%).
                    Sampling variation means any single experiment won't give exactly 17% — but the dots cluster around the true value.
                  </p>
                  {!forwardEverCorrect && (
                    <button onClick={() => setForwardEverCorrect(true)}
                      className="rounded-lg border-2 border-cyan-400 bg-cyan-50 px-4 py-2 text-xs font-semibold text-cyan-700 hover:bg-cyan-100">
                      Continue
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Backward problem */}
          {forwardEverCorrect && (
            <>
              <hr className="border-stone-200" />
              <QuestionPanel
                question="Given an RF of 10% for two linked genes in coupling, predict the approximate testcross proportions per 100 offspring."
                correct={backCorrect}
                feedback={backCorrect === true
                  ? "Correct! With RF = 10%, 90% of gametes are parental and 10% are recombinant. Each parental class gets ~45 and each recombinant class gets ~5 out of 100. This is the direct backward application of the RF formula you just learned."
                  : backCorrect === false
                  ? "Think step by step: RF = 10% means 10% recombinant gametes and 90% parental. Split each group equally between the two classes in that category."
                  : undefined}
              >
                <div className="text-xs font-semibold tracking-wider text-stone-500 uppercase mb-1 font-hand">
                  Working backward
                </div>
                <div className="flex flex-col gap-2">
                  {[
                    { key: 'a', label: '45 : 5 : 5 : 45 (parental : recomb : recomb : parental)' },
                    { key: 'b', label: '40 : 10 : 10 : 40' },
                    { key: 'c', label: '25 : 25 : 25 : 25' },
                    { key: 'd', label: '48 : 2 : 2 : 48' },
                  ].map(opt => (
                    <button key={opt.key} onClick={() => {
                      setBackAnswer(opt.key);
                      const isCorrect = opt.key === 'a';
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
        </div>
      )}
    </div>
  );
}

function Exp4_MapDistance({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const [cmInput, setCmInput] = useState('');
  const [cmCorrect, setCmCorrect] = useState<boolean | null>(null);
  const [mapInput, setMapInput] = useState(50); // slider for gene position
  const [forwardEverCorrect, setForwardEverCorrect] = useState(false);
  const [backAnswer, setBackAnswer] = useState('');
  const [backCorrect, setBackCorrect] = useState<boolean | null>(null);
  const [backCompleted, setBackCompleted] = useState(false);

  useEffect(() => {
    if (!backCompleted) return;
    const t = setTimeout(onComplete, 1500);
    return () => clearTimeout(t);
  }, [backCompleted, onComplete]);

  const targetCM = 17;

  // Fresh testcross: C/c Sh/sh × c/c sh/sh, 500 kernels, RF = 17%
  const parent = useMemo(() => makeLinkedOrganism(
    { color: 'C', shape: 'Sh' },
    { color: 'c', shape: 'sh' },
    'het',
  ), []);
  const tester = useMemo(() => makeLinkedOrganism(
    { color: 'c', shape: 'sh' },
    { color: 'c', shape: 'sh' },
    'tester',
  ), []);

  const genes = [KERNEL_COLOR, KERNEL_SHAPE];
  const recombFreqs = [0.17];

  const [crossResult, setCrossResult] = useState<LinkedCrossResult | null>(null);

  // Sampled RF for dual-tolerance validation
  const sampledRF = crossResult ? crossResult.recombinationFrequency * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Sturtevant's insight callout — stays at the top */}
      <div className="rounded-xl border-2 border-violet-200 bg-violet-50 p-4 space-y-2">
        <p className="text-sm font-semibold text-violet-900">Sturtevant's insight (1913)</p>
        <p className="text-sm text-violet-800">
          <strong>Alfred Sturtevant</strong>, a 19-year-old undergraduate in Thomas Hunt Morgan's lab, realized
          that <strong>recombination frequency between two genes reflects their physical distance on the
          chromosome</strong>. He defined 1% RF = 1 <strong>centiMorgan</strong> (cM) and used this to construct the
          first genetic map of any organism.
        </p>
        <p className="text-sm text-violet-800">
          <strong>Important caveat:</strong> RF saturates at <strong>50%</strong>. When two genes are very far apart,
          multiple crossovers between them randomize allele combinations — making them <em>look</em> like they
          assort independently, even though they are on the same chromosome. This means the apparent RF
          underestimates the true genetic distance for loci more than ~30 cM apart. Mapping functions
          (like Haldane's) correct for this.
        </p>
      </div>

      <p className="text-sm text-stone-600">
        Perform a testcross of <strong>C/c Sh/sh × c/c sh/sh</strong> (500 kernels). From the offspring counts,
        calculate the recombination frequency and convert it to a <strong>map distance in centiMorgans</strong>.
        <span className="text-stone-400"> (Simplified for this module; the actual C–sh1 map distance on maize chromosome 9 is ~29 cM.)</span>
      </p>

      <LinkageCrossWorkbench
        parentA={parent} parentB={tester} genes={genes} recombFreqs={recombFreqs}
        onCross={setCrossResult} crossResult={crossResult}
        sampleSize={500} label="Testcross: C Sh / c sh  ×  c sh / c sh"
      />

      {crossResult && (
        <div className="space-y-4">
          <div className="rounded-lg bg-cyan-50 border border-cyan-200 p-3 text-sm text-cyan-800 space-y-1">
            <p><strong>Recombinant classes</strong> are the less-frequent phenotypes — allele combos not present in either parent chromosome.</p>
            <p className="font-mono text-xs">
              Total offspring: <strong>{crossResult.total}</strong>
            </p>
          </div>

          <QuestionPanel
            question="Count the recombinant offspring. Compute RF = (recombinants / total) × 100 and enter the map distance in cM (remember: 1% RF = 1 cM):"
            correct={cmCorrect}
            feedback={cmCorrect === true
              ? "You just did what the first geneticists did for every linked-gene pair in maize, wheat, pea, and tomato."
              : cmCorrect === false
              ? `Not quite. Identify the two less-common (recombinant) classes, add their counts, then RF% = (recombinants / ${crossResult.total}) × 100. Since 1% RF = 1 cM, the RF in percent IS the map distance in cM.`
              : undefined}
          >
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={cmInput}
                onChange={e => setCmInput(e.target.value)}
                placeholder="cM"
                className="rounded-lg border-2 border-stone-200 px-3 py-2 text-sm w-24 focus:border-cyan-400 focus:outline-none"
              />
              <span className="text-sm text-stone-500">cM</span>
              <button
                onClick={() => {
                  const val = parseFloat(cmInput);
                  // Dual tolerance: accept ±2 of sampled RF OR ±2 of textbook 17 cM
                  const isCorrect =
                    Math.abs(val - Math.round(sampledRF)) <= 2 ||
                    Math.abs(val - targetCM) <= 2;
                  setCmCorrect(isCorrect);
                  if (isCorrect) setStep(1);
                }}
                className="rounded-xl bg-gradient-to-b from-cyan-700 to-cyan-800 px-4 py-2 text-xs font-bold text-white shadow-md hover:shadow-lg active:from-cyan-800 transition-all"
              >
                Check
              </button>
            </div>
          </QuestionPanel>

          {/* Chromosome map visualization — reinforcement below the puzzle */}
          {step >= 1 && (
            <div className="space-y-4">
              <p className="text-sm text-stone-600">
                Now visualize your result. Place the <strong>Sh</strong> locus on the chromosome map.
                The C locus is fixed at position 0.
              </p>
              <div className="relative">
                <svg width="100%" height="80" viewBox="0 0 400 80">
                  <rect x="30" y="25" width="340" height="10" rx="5" fill="#7cb5d4" />
                  {[0, 10, 20, 30, 40, 50].map(cm => {
                    const x = 30 + (cm / 50) * 340;
                    return (
                      <g key={cm}>
                        <line x1={x} y1="20" x2={x} y2="40" stroke="#4a8ab0" strokeWidth={1} />
                        <text x={x} y="55" textAnchor="middle" className="text-[9px] fill-stone-400">{cm} cM</text>
                      </g>
                    );
                  })}
                  <circle cx="30" cy="30" r="6" fill="#5a2a6b" />
                  <text x="30" y="72" textAnchor="middle" className="text-[8px] font-bold fill-cyan-900">C</text>
                  <circle cx={30 + (mapInput / 50) * 340} cy="30" r="6" fill="#b8860b" />
                  <text x={30 + (mapInput / 50) * 340} y="72" textAnchor="middle" className="text-[8px] font-bold fill-amber-700">Sh</text>
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
                  } else {
                    setStep(-1);
                    setTimeout(() => setStep(1), 1500);
                  }
                }}
                className="rounded-xl bg-gradient-to-b from-cyan-700 to-cyan-800 px-4 py-2 text-xs font-bold text-white shadow-md hover:shadow-lg active:from-cyan-800 transition-all"
              >
                Place Gene
              </button>
              {step === -1 && (
                <div className="text-sm text-red-600 font-semibold">Not quite — remember, 1% RF = 1 cM. Place Sh at about 17 cM from C.</div>
              )}
              {step === 2 && (
                <div className="space-y-4">
                  <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-800">
                    <strong>You built your first genetic map!</strong> In this module C and Sh are 17 cM apart on
                    maize chromosome 9 (simplified from the actual C–sh1 distance of ~29 cM).
                    This technique — converting recombination frequencies to map distances — is the foundation of
                    all genetic mapping.
                  </div>
                  {!forwardEverCorrect && (
                    <button onClick={() => setForwardEverCorrect(true)}
                      className="rounded-lg border-2 border-cyan-400 bg-cyan-50 px-4 py-2 text-xs font-semibold text-cyan-700 hover:bg-cyan-100">
                      Continue
                    </button>
                  )}
                </div>
              )}

              {/* Backward problem */}
              {forwardEverCorrect && (
                <>
                  <hr className="border-stone-200" />
                  <QuestionPanel
                    question="Two genes show an observed RF of 45% in a large testcross. Are they 45 cM apart?"
                    correct={backCorrect}
                    feedback={backCorrect === true
                      ? "Correct! RF saturates at 50% because multiple crossovers between distant loci randomize allele combinations. An observed RF of 45% means the genes are far apart, but the true genetic distance could be much more than 45 cM. Mapping functions like Haldane's correct for this: −50 ln(1 − 2×0.45) = ~107 cM. This is why three-point crosses and additive mapping are needed for distant loci."
                      : backCorrect === false
                      ? "Think about what happens when two genes are very far apart on the same chromosome. Can RF ever exceed 50%? What does that imply about the relationship between RF and true distance for large distances?"
                      : undefined}
                  >
                    <div className="text-xs font-semibold tracking-wider text-stone-500 uppercase mb-1 font-hand">
                      Working backward
                    </div>
                    <div className="flex flex-col gap-2">
                      {[
                        { key: 'a', label: 'Not necessarily — RF saturates near 50%, so 45% means far apart but doesn\'t pin down exact cM' },
                        { key: 'b', label: 'Yes, 45% = 45 cM exactly' },
                        { key: 'c', label: 'No, 45% means the genes are on different chromosomes' },
                        { key: 'd', label: 'Yes, but only if there\'s no interference' },
                      ].map(opt => (
                        <button key={opt.key} onClick={() => {
                          setBackAnswer(opt.key);
                          const isCorrect = opt.key === 'a';
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
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Exp5_ThreePointCross({ onComplete }: { onComplete: () => void }) {
  // Three genes on maize chromosome 9: aleurone color (C), endosperm (Wx), kernel shape (Sh)
  // True order on chr9: C — Sh — Wx
  // We present the genes in a scrambled order (C, Wx, Sh) so students must
  // discover that Sh is actually in the middle.
  const threeGenes: [LinkedGeneDefinition, LinkedGeneDefinition, LinkedGeneDefinition] = [KERNEL_COLOR, ENDOSPERM, KERNEL_SHAPE];

  // True chromosome order: C — Sh — Wx
  // RFs: C–Sh = 8 cM, Sh–Wx = 10 cM
  const trueOrderGenes: [LinkedGeneDefinition, LinkedGeneDefinition, LinkedGeneDefinition] = [KERNEL_COLOR, KERNEL_SHAPE, ENDOSPERM];

  const parent = useMemo(() => makeLinkedOrganism(
    { color: 'C', endo: 'Wx', shape: 'Sh' },
    { color: 'c', endo: 'wx', shape: 'sh' },
    'trihybrid',
  ), []);
  const tester = useMemo(() => makeLinkedOrganism(
    { color: 'c', endo: 'wx', shape: 'sh' },
    { color: 'c', endo: 'wx', shape: 'sh' },
    'tester',
  ), []);

  const [crossResult, setCrossResult] = useState<LinkedCrossResult | null>(null);
  const [step, setStep] = useState(0);
  const [answer, setAnswer] = useState('');
  const [correct, setCorrect] = useState<boolean | null>(null);
  const [orderAnswer, setOrderAnswer] = useState('');
  const [orderCorrect, setOrderCorrect] = useState<boolean | null>(null);
  const [forwardEverCorrect, setForwardEverCorrect] = useState(false);
  const [backAnswer, setBackAnswer] = useState('');
  const [backCorrect, setBackCorrect] = useState<boolean | null>(null);
  const [backCompleted, setBackCompleted] = useState(false);

  useEffect(() => {
    if (!backCompleted) return;
    const t = setTimeout(onComplete, 1500);
    return () => clearTimeout(t);
  }, [backCompleted, onComplete]);

  // Recomb freqs in TRUE order: C–Sh, Sh–Wx
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
        Now we track <strong>three linked genes</strong> on maize chromosome 9: aleurone color (C/c),
        endosperm starch (Wx/wx), and kernel shape (Sh/sh). Perform a testcross with 1000 offspring.
      </p>

      <div className="flex items-center justify-center gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <ChromosomeDiagram genes={threeGenes} chrom1={parent.chromosome1} chrom2={parent.chromosome2} label="Trihybrid Parent" />
          <span className="text-2xl font-bold text-stone-400">&times;</span>
          <ChromosomeDiagram genes={threeGenes} chrom1={tester.chromosome1} chrom2={tester.chromosome2} label="Tester" />
        </div>
        <button onClick={handleCross}
          className="rounded-xl bg-gradient-to-b from-cyan-700 to-cyan-800 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:shadow-lg active:from-cyan-800 transition-all">
          Cross!
        </button>
      </div>

      {crossResult && classData && (
        <div className="space-y-4">
          <div className="text-xs text-stone-500 font-semibold text-center">
            {crossResult.total} offspring — 8 kernel classes (+ = dominant, - = recessive)
          </div>

          {/* Offspring class table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-cyan-50">
                  <th className="border border-cyan-200 px-2 py-1 text-left">Class</th>
                  <th className="border border-cyan-200 px-2 py-1">Color</th>
                  <th className="border border-cyan-200 px-2 py-1">Endosperm</th>
                  <th className="border border-cyan-200 px-2 py-1">Shape</th>
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
                      <td className="border border-stone-200 px-2 py-1 text-center">{pattern[0] === '+' ? 'Purple' : 'Yellow'}</td>
                      <td className="border border-stone-200 px-2 py-1 text-center">{pattern[1] === '+' ? 'Starchy' : 'Waxy'}</td>
                      <td className="border border-stone-200 px-2 py-1 text-center">{pattern[2] === '+' ? 'Plump' : 'Shrunken'}</td>
                      <td className="border border-stone-200 px-2 py-1 text-center font-bold">{count}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <QuestionPanel
            question="Look at the 8 offspring classes. Two classes are much more frequent — these are the parental classes. Two are extremely rare. Your job: figure out which of the three genes (C, Wx, Sh) is physically in the middle of the chromosome."
            correct={correct}
            feedback={correct === true
              ? "Correct! In the rarest class, only Sh flipped relative to parental. The only way for one gene to flip while neighbors stay the same is if it lies between the other two. Order: C — Sh — Wx."
              : correct === false
              ? (answer === 'Aleurone color (C)'
                ? "Not quite. For C to be in the middle, a double crossover would flip C while leaving Wx and Sh unchanged. Look at the rarest class — is it C that differs from parental?"
                : answer === 'Endosperm (Wx)'
                ? "Not quite. For Wx to be in the middle, a double crossover would flip Wx. Check the rarest class."
                : "Look at the rarest two classes and compare each allele (+/-) to the most common (parental) classes. Which gene flipped?")
              : undefined}
          >
            {/* Collapsible hint */}
            <details className="mb-3 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2">
              <summary className="text-xs font-semibold text-stone-500 cursor-pointer select-none">Hint (click to reveal)</summary>
              <p className="text-xs text-stone-600 mt-1">
                Think about how many crossovers would be required to produce the rarest classes. If a class
                requires two independent crossovers to form, those crossovers must flank which gene?
              </p>
            </details>
            <div className="flex gap-2 flex-wrap">
              {['Aleurone color (C)', 'Endosperm (Wx)', 'Kernel shape (Sh)'].map(opt => (
                <button key={opt} onClick={() => {
                  setAnswer(opt);
                  // True order on maize chr9 is C — Sh — Wx, so Sh is the middle gene.
                  // We present the genes in order [C, Wx, Sh]; in a double crossover
                  // around the middle gene (Sh), only Sh flips relative to the parental.
                  const isCorrect = opt === 'Kernel shape (Sh)';
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
                ? "Excellent! C — Sh — Wx is the correct order on maize chromosome 9. Sh is in the middle because it's the gene that switches in the double crossover class. You've mapped three genes — this is the same logic Creighton & McClintock used in 1931!"
                : orderCorrect === false
                ? "The middle gene is the one that changed in the double crossover. Since Sh flipped, it must be between C and Wx."
                : undefined}
            >
              <div className="flex gap-2 flex-wrap">
                {[
                  'C — Wx — Sh',
                  'C — Sh — Wx',
                  'Sh — C — Wx',
                ].map(opt => (
                  <button key={opt} onClick={() => {
                    setOrderAnswer(opt);
                    const isCorrect = opt === 'C — Sh — Wx';
                    setOrderCorrect(isCorrect);
                    if (isCorrect) setForwardEverCorrect(true);
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

          {/* Backward problem */}
          {forwardEverCorrect && (
            <>
              <hr className="border-stone-200" />
              <QuestionPanel
                question="In an 8-class three-point cross, the rarest class shows a flip at the FIRST gene listed (C). What does this tell you about the gene order?"
                correct={backCorrect}
                feedback={backCorrect === true
                  ? "Correct! The rarest classes in a three-point cross are always the double crossovers, and a double crossover flips only the MIDDLE gene. If C is the gene that flipped, then C must actually be the middle gene — the listed order doesn't match the chromosomal order. This is exactly the logic you used to discover that Sh was in the middle when we listed C, Wx, Sh."
                  : backCorrect === false
                  ? "Remember: in a three-point cross, the rarest classes are double crossovers, and a double crossover flips the gene in the MIDDLE of the chromosome. If the rarest class shows C flipped, what must C's position be?"
                  : undefined}
              >
                <div className="text-xs font-semibold tracking-wider text-stone-500 uppercase mb-1 font-hand">
                  Working backward
                </div>
                <div className="flex flex-col gap-2">
                  {[
                    { key: 'a', label: "C is actually the middle gene — the listed order doesn't match chromosomal order" },
                    { key: 'b', label: 'C is on a different chromosome' },
                    { key: 'c', label: 'C has a higher mutation rate' },
                    { key: 'd', label: 'The cross was done incorrectly' },
                  ].map(opt => (
                    <button key={opt.key} onClick={() => {
                      setBackAnswer(opt.key);
                      const isCorrect = opt.key === 'a';
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
  const [forwardEverCorrect, setForwardEverCorrect] = useState(false);
  const [backAnswer, setBackAnswer] = useState('');
  const [backCorrect, setBackCorrect] = useState<boolean | null>(null);
  const [backCompleted, setBackCompleted] = useState(false);

  useEffect(() => {
    if (!backCompleted) return;
    const t = setTimeout(onComplete, 1500);
    return () => clearTimeout(t);
  }, [backCompleted, onComplete]);

  // Run a fresh testcross with the same parameters as Exp 3 (C Sh / c sh
  // heterozygote × tester, 17 cM linkage, n=400). We freeze the result once,
  // via useState + empty-deps initializer, so the (O−E)²/E values the student
  // types against don't shift on every re-render. Students applying chi-square
  // to their own data — not hard-coded counts — is the pedagogical goal.
  const [{ observed, labels }] = useState(() => {
    const parent = makeLinkedOrganism(
      { color: 'C', shape: 'Sh' },
      { color: 'c', shape: 'sh' },
      'het',
    );
    const tester = makeLinkedOrganism(
      { color: 'c', shape: 'sh' },
      { color: 'c', shape: 'sh' },
      'tester',
    );
    const result = linkedCross(parent, tester, [KERNEL_COLOR, KERNEL_SHAPE], [0.17], 400, 1);
    // Canonical order: two parentals first, then two recombinants, so the
    // table reads naturally from "most common" to "least common".
    const order = ['Purple, Plump', 'Yellow, Shrunken', 'Purple, Shrunken', 'Yellow, Plump'];
    const obs = order.map(k => result.phenotypeCounts[k] ?? 0);
    return { observed: obs, labels: order };
  });

  // Expected under H₀ (independent assortment) is 1:1:1:1 — each class is
  // total/4. This is the null hypothesis; the chi-square test asks whether
  // observed counts are consistent with it.
  const total = observed.reduce((a, b) => a + b, 0);
  const expected = [total / 4, total / 4, total / 4, total / 4];

  const chiSqTerms = observed.map((o, i) => ((o - expected[i]) ** 2) / expected[i]);
  const totalChiSq = chiSqTerms.reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      <p className="text-sm text-stone-600">
        From a testcross of <strong>C/c Sh/sh</strong> × tester (same cross as Experiment 3), you observe the
        offspring counts below. Let's use the <strong>chi-square test</strong> to statistically evaluate
        whether these data fit the ratio we'd expect if the genes were independent.
      </p>
      <div className="rounded-lg bg-stone-50 border border-stone-200 p-3 text-xs text-stone-600 space-y-1">
        <p><strong>H₀:</strong> genes assort independently (1:1:1:1 ratio)</p>
        <p><strong>Hₐ:</strong> genes do not assort independently (they are linked)</p>
        <p><strong>df</strong> = categories − 1 = 4 − 1 = 3</p>
      </div>

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
            <>
              <hr className="border-stone-200" />
              <QuestionPanel
                question="You compute χ² = 1.2 with df = 3 for a dihybrid testcross. What do you conclude?"
                correct={backCorrect}
                feedback={backCorrect === true
                  ? "Correct! With χ² = 1.2 and df = 3, the critical value at p = 0.05 is 7.815. Since 1.2 < 7.815, you fail to reject the null hypothesis — the data are consistent with a 1:1:1:1 ratio, meaning the genes appear to assort independently. This is the opposite of what you found in this experiment, where linkage produced a huge chi-square."
                  : backCorrect === false
                  ? "Compare χ² = 1.2 to the critical value of 7.815 (df = 3, α = 0.05). Is 1.2 greater or less than 7.815? What does that mean for the null hypothesis?"
                  : undefined}
              >
                <div className="text-xs font-semibold tracking-wider text-stone-500 uppercase mb-1 font-hand">
                  Working backward
                </div>
                <div className="flex flex-col gap-2">
                  {[
                    { key: 'a', label: 'Fail to reject 1:1:1:1 — the data are consistent with independent assortment' },
                    { key: 'b', label: 'Reject — the genes are linked' },
                    { key: 'c', label: 'The test is invalid with only 3 degrees of freedom' },
                    { key: 'd', label: 'Need more data to decide' },
                  ].map(opt => (
                    <button key={opt.key} onClick={() => {
                      setBackAnswer(opt.key);
                      const isCorrect = opt.key === 'a';
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
        </div>
      )}
    </div>
  );
}

function Exp7_Interference({ onComplete }: { onComplete: () => void }) {
  // By Exp 7 the student has discovered the true order C — Sh — Wx, so we
  // display and analyze in true order (unlike Exp 5, which presented a
  // scrambled order as a puzzle).
  const trueOrderGenes: [LinkedGeneDefinition, LinkedGeneDefinition, LinkedGeneDefinition] = [KERNEL_COLOR, KERNEL_SHAPE, ENDOSPERM];

  const parent = useMemo(() => makeLinkedOrganism(
    { color: 'C', endo: 'Wx', shape: 'Sh' },
    { color: 'c', endo: 'wx', shape: 'sh' },
    'trihybrid',
  ), []);
  const tester = useMemo(() => makeLinkedOrganism(
    { color: 'c', endo: 'wx', shape: 'sh' },
    { color: 'c', endo: 'wx', shape: 'sh' },
    'tester',
  ), []);

  const [crossResult, setCrossResult] = useState<LinkedCrossResult | null>(null);
  const [step, setStep] = useState(0);
  const [coincInput, setCoinInput] = useState('');
  const [intInput, setIntInput] = useState('');
  const [correct, setCorrect] = useState<boolean | null>(null);
  // Remember the student's entered values at the moment they clicked Check,
  // so the feedback panel can print them alongside the measured values.
  const [submitted, setSubmitted] = useState<{ c: number; i: number } | null>(null);
  const [forwardEverCorrect, setForwardEverCorrect] = useState(false);
  const [backAnswer, setBackAnswer] = useState('');
  const [backCorrect, setBackCorrect] = useState<boolean | null>(null);
  const [backCompleted, setBackCompleted] = useState(false);

  useEffect(() => {
    if (!backCompleted) return;
    const t = setTimeout(onComplete, 1500);
    return () => clearTimeout(t);
  }, [backCompleted, onComplete]);

  const recombFreqs = [0.08, 0.10]; // C–Sh, Sh–Wx
  const usedCoincidence = 0.5; // strong positive interference

  const handleCross = useCallback(() => {
    const result = linkedCross(parent, tester, trueOrderGenes, recombFreqs, 2000, usedCoincidence);
    setCrossResult(result);
    setStep(1);
  }, [parent, tester]);

  // Analyze results in TRUE order (C — Sh — Wx). The simulation in
  // handleCross generates offspring in true order, so the analysis must
  // match — otherwise Region I / Region II get swapped relative to the
  // "Region I (C — Sh) / Region II (Sh — Wx)" labels shown below.
  const analysis = useMemo(() => {
    if (!crossResult) return null;
    return threePointAnalysis(crossResult.offspring, trueOrderGenes);
  }, [crossResult]);

  // Compute expected vs observed DCO
  const expectedDCO = crossResult ? (analysis ? (analysis.distances[0] / 100) * (analysis.distances[1] / 100) * crossResult.total : 0) : 0;
  const observedDCO = analysis?.classCounts.doubleCO ?? 0;
  const actualCoincidence = expectedDCO > 0 ? observedDCO / expectedDCO : 0;
  const actualInterference = 1 - actualCoincidence;

  return (
    <div className="space-y-6">
      <p className="text-sm text-stone-600">
        Now that we've discovered the order is <strong>C — Sh — Wx</strong>, we can quantify
        <strong> interference</strong>. In the three-point cross, we found double crossover offspring —
        but are there as many as we'd <strong>expect</strong>? If crossovers were independent, the
        expected frequency of double crossovers would be the product of the two single-crossover frequencies.
      </p>

      <div className="flex items-center justify-center gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <ChromosomeDiagram genes={trueOrderGenes} chrom1={parent.chromosome1} chrom2={parent.chromosome2} label="Trihybrid" />
          <span className="text-2xl font-bold text-stone-400">&times;</span>
          <span className="text-sm text-stone-500">tester (all recessive)</span>
        </div>
        <button onClick={handleCross}
          className="rounded-xl bg-gradient-to-b from-cyan-700 to-cyan-800 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:shadow-lg active:from-cyan-800 transition-all">
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
            <p>Region I (C — Sh): ~{analysis.distances[0].toFixed(1)} cM</p>
            <p>Region II (Sh — Wx): ~{analysis.distances[1].toFixed(1)} cM</p>
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
                setSubmitted({ c: cVal, i: iVal });
                setCorrect(cClose && iClose);
                if (cClose && iClose) setStep(2);
              }}
              className="rounded-lg border-2 border-cyan-400 bg-cyan-50 px-4 py-2 text-xs font-semibold text-cyan-700 hover:bg-cyan-100"
            >
              Check
            </button>
            {correct === false && submitted && (
              <div className="text-sm text-red-600 space-y-1">
                <p>You entered: c = {submitted.c.toFixed(2)}, I = {submitted.i.toFixed(2)}</p>
                <p>Measured from your cross: c = {actualCoincidence.toFixed(2)}, I = {actualInterference.toFixed(2)}</p>
                <p className="text-stone-600">Hint: Coincidence = {observedDCO} / {expectedDCO.toFixed(1)} = {actualCoincidence.toFixed(2)}; Interference = 1 − coincidence.</p>
              </div>
            )}
          </div>

          {step >= 2 && submitted && (
            <div className="space-y-4">
              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-800 space-y-2">
                <p><strong>Positive interference!</strong> There are FEWER double crossovers than expected ({observedDCO} observed vs {expectedDCO.toFixed(1)} expected).</p>
                <p>You entered: c = {submitted.c.toFixed(2)}, I = {submitted.i.toFixed(2)}</p>
                <p>Measured from your cross: c = {actualCoincidence.toFixed(2)}, I = {actualInterference.toFixed(2)} <span className="text-emerald-600">✓ within tolerance</span></p>
                <p>This means one crossover <strong>inhibits</strong> a second crossover nearby. This is a real biological phenomenon — the physical mechanics of chromosome crossing over make nearby double events less likely.</p>
              </div>
              {!forwardEverCorrect && (
                <button onClick={() => setForwardEverCorrect(true)}
                  className="w-full rounded-xl bg-gradient-to-b from-cyan-700 to-cyan-800 py-3 text-sm font-bold text-white shadow-md">
                  Continue
                </button>
              )}

              {/* Backward problem */}
              {forwardEverCorrect && (
                <>
                  <hr className="border-stone-200" />
                  <QuestionPanel
                    question="A three-point cross yields an observed double-crossover frequency HIGHER than expected (coincidence > 1). What is the interpretation?"
                    correct={backCorrect}
                    feedback={backCorrect === true
                      ? "Correct! When coincidence > 1, one crossover makes a nearby second crossover MORE likely, not less. This is called negative interference. It's rare in most eukaryotes but has been documented — for example in some fungal systems and at very short genetic intervals. It's the opposite of the positive interference you just measured in this experiment, where coincidence was well below 1."
                      : backCorrect === false
                      ? "Coincidence = observed DCO / expected DCO. If coincidence > 1, there are MORE double crossovers than expected. What does that imply about the effect of one crossover on the probability of a second nearby?"
                      : undefined}
                  >
                    <div className="text-xs font-semibold tracking-wider text-stone-500 uppercase mb-1 font-hand">
                      Working backward
                    </div>
                    <div className="flex flex-col gap-2">
                      {[
                        { key: 'a', label: 'Negative interference — one crossover makes a nearby second MORE likely' },
                        { key: 'b', label: 'Positive interference — crossovers suppress each other' },
                        { key: 'c', label: 'The data must be wrong' },
                        { key: 'd', label: 'The genes are on different chromosomes' },
                      ].map(opt => (
                        <button key={opt.key} onClick={() => {
                          setBackAnswer(opt.key);
                          const isCorrect = opt.key === 'a';
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

              {/* 1.7 — PopGen tease */}
              {backCompleted && (
                <div className="rounded-xl border-2 border-violet-200 bg-violet-50 p-4 space-y-3">
                  <p className="text-sm font-semibold text-violet-900">What comes next: Linkage Disequilibrium</p>
                  <p className="text-sm text-violet-800">
                    You've learned that linked genes travel together on chromosomes. In populations, this
                    non-random association of alleles at different loci is called <strong>linkage disequilibrium</strong> (LD).
                    Over generations, recombination breaks down LD — but selection, drift, and population structure
                    can maintain it. LD is the foundation of genome-wide association studies (GWAS) and genomic
                    selection in plant breeding.
                  </p>
                  <a href="/breeding-game/popgen.html"
                    className="block rounded-xl bg-gradient-to-b from-emerald-600 to-emerald-700 px-5 py-3 text-center text-sm font-bold text-white shadow-md hover:shadow-lg">
                    Explore drift and selection in the Population Genetics module &rarr;
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Module definition ───────────────────────────────────────────────────

const EXPERIMENTS = [
  // Titles are plain; ModuleShell prefixes the index at render time (F-044).
  { id: 'creighton_mcclintock', title: 'Creighton & McClintock', subtitle: 'Proving crossovers are physical', Component: Exp0_CreightonMcClintock },
  { id: 'linked_genes', title: 'Linked Genes', subtitle: 'When genes don\'t assort independently', Component: Exp1_LinkedGenes },
  { id: 'coupling_repulsion', title: 'Coupling vs Repulsion', subtitle: 'Cis and trans arrangements', Component: Exp2_CouplingRepulsion },
  { id: 'recomb_freq', title: 'Recombination Frequency', subtitle: 'Counting recombinants', Component: Exp3_RecombFrequency },
  { id: 'map_distance', title: 'Map Distance', subtitle: 'RF% = centiMorgans', Component: Exp4_MapDistance },
  { id: 'three_point', title: 'Three-Point Cross', subtitle: 'Determine gene order', Component: Exp5_ThreePointCross },
  { id: 'chi_square', title: 'Chi-Square Test', subtitle: 'Statistical hypothesis testing', Component: Exp6_ChiSquare },
  { id: 'interference', title: 'Interference', subtitle: 'Double crossover analysis', Component: Exp7_Interference },
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
