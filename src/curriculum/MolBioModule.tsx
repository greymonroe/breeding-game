/**
 * Molecular Biology Curriculum Module
 *
 * Eight experiments covering the central dogma of molecular biology:
 *  0. The Transforming Principle — Avery-MacLeod-McCarty 1944 (historical framing)
 *  1. DNA Structure — Base Pairing
 *  2. Transcription — DNA to mRNA
 *  3. The Genetic Code — Codons
 *  4. Translation — Building a Protein
 *  5. Mutations — What Changes?
 *  6. From Sequence to Structure — Rubisco
 *  7. Why Molecular Biology Matters for Genetics
 */

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  transcribe,
  reverseComplement,
  codingToMrna,
  translate,
  classifyMutation,
  translateToProtein,
  CODON_TABLE,
  AA_THREE_LETTER,
  AA_PROPERTIES,
  AA_PROPERTY_LABELS,
  AA_PROPERTY_COLORS,
  type MutationType,
} from './molbio-engine';
import {
  ModuleShell, QuestionPanel,
  type ModuleDefinition,
} from './components';

// ── Constants ─────────────────────────────────────────────────────────

/** Base colors for visualization */
const BASE_COLORS: Record<string, string> = {
  A: '#22c55e', // green
  T: '#ef4444', // red
  U: '#f97316', // orange (RNA)
  G: '#3b82f6', // blue
  C: '#eab308', // yellow
};

// ── Shared helpers ────────────────────────────────────────────────────

function BaseBlock({ base, size = 'md', onClick, highlight }: {
  base: string;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  highlight?: string;
}) {
  const sizeClasses = size === 'sm' ? 'w-7 h-7 text-xs' : size === 'lg' ? 'w-12 h-12 text-lg' : 'w-9 h-9 text-sm';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`${sizeClasses} rounded font-bold text-white flex items-center justify-center transition-all ${
        onClick ? 'cursor-pointer hover:scale-110 hover:shadow-md' : 'cursor-default'
      } ${highlight ? 'ring-2 ring-offset-1' : ''}`}
      style={{
        backgroundColor: BASE_COLORS[base.toUpperCase()] ?? '#9ca3af',
        ...(highlight ? { ringColor: highlight } : {}),
      }}
    >
      {base}
    </button>
  );
}

function HydrogenBonds({ count }: { count: number }) {
  return (
    <div className="flex flex-col items-center gap-0.5 px-1">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="w-4 border-t border-dashed border-stone-400" />
      ))}
    </div>
  );
}

function OptionButton({ label, selected, correct, onClick, disabled }: {
  label: string;
  selected: boolean;
  correct?: boolean | null;
  onClick: () => void;
  disabled?: boolean;
}) {
  let classes = 'w-full text-left rounded-lg border-2 px-4 py-3 text-sm transition-all ';
  if (correct === true && selected) {
    classes += 'border-emerald-400 bg-emerald-50 text-emerald-800 font-semibold';
  } else if (correct === false && selected) {
    classes += 'border-red-300 bg-red-50 text-red-800';
  } else if (selected) {
    classes += 'border-amber-400 bg-amber-50 text-amber-800';
  } else {
    classes += 'border-stone-200 bg-white text-stone-700 hover:border-stone-300 hover:bg-stone-50';
  }
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={classes}>
      {label}
    </button>
  );
}

// ── Experiment 0: The Transforming Principle ──────────────────────────

function Exp0_TransformingPrinciple({ onComplete }: { onComplete: () => void }) {
  const [showResults, setShowResults] = useState(false);
  const [answer1, setAnswer1] = useState<string | null>(null);
  const [submitted1, setSubmitted1] = useState(false);
  const [answer2, setAnswer2] = useState<string | null>(null);
  const [submitted2, setSubmitted2] = useState(false);
  const completedRef = useRef(false);

  useEffect(() => {
    if (submitted1 && answer1 === 'c' && submitted2 && answer2 === 'a' && !completedRef.current) {
      completedRef.current = true;
      const timer = setTimeout(onComplete, 600);
      return () => clearTimeout(timer);
    }
  }, [submitted1, answer1, submitted2, answer2, onComplete]);

  const treatments = [
    { id: 'X', result: true, desc: 'Enzyme X added to extract' },
    { id: 'Y', result: true, desc: 'Enzyme Y added to extract' },
    { id: 'Z', result: false, desc: 'Enzyme Z added to extract' },
  ];

  return (
    <div className="space-y-6">
      {/* Historical framing */}
      <div className="bg-stone-50 rounded-xl border border-stone-200 p-5">
        <p className="font-['Patrick_Hand'] text-lg text-stone-600 mb-3">ROCKEFELLER INSTITUTE, 1944</p>
        <div className="text-sm text-stone-600 space-y-3">
          <p>
            In 1928, Frederick Griffith discovered something remarkable: when he mixed heat-killed
            virulent (smooth) <em>Streptococcus pneumoniae</em> with live non-virulent (rough) bacteria
            and injected the mixture into mice, the mice died — and live smooth bacteria could be recovered.
            Something from the dead smooth bacteria had <strong>transformed</strong> the rough bacteria
            into smooth ones. But what was this "transforming principle"?
          </p>
          <p>
            In 1944, Oswald Avery, Colin MacLeod, and Maclyn McCarty at the Rockefeller Institute
            set out to identify the molecule. They purified the transforming extract and treated it
            with different enzymes to see which one destroyed its ability to transform bacteria.
          </p>
        </div>
      </div>

      {/* Interactive experiment */}
      <div className="space-y-3">
        <p className="text-sm font-semibold text-stone-700">
          Run the experiment: apply each enzyme to the transforming extract, then test for transformation.
        </p>
        {!showResults && (
          <button
            type="button"
            onClick={() => setShowResults(true)}
            className="bg-amber-700 text-white font-bold px-6 py-2.5 rounded-xl hover:bg-amber-800 transition-colors"
          >
            Apply Enzymes & Test
          </button>
        )}
      </div>

      {showResults && (
        <>
          {/* Results table */}
          <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 border-b border-stone-200">
                <tr>
                  <th className="text-left px-4 py-2 font-semibold text-stone-600">Treatment</th>
                  <th className="text-left px-4 py-2 font-semibold text-stone-600">Transformation?</th>
                </tr>
              </thead>
              <tbody>
                {treatments.map(t => (
                  <tr key={t.id} className="border-b border-stone-100 last:border-0">
                    <td className="px-4 py-3 font-medium text-stone-700">{t.desc}</td>
                    <td className="px-4 py-3">
                      {t.result ? (
                        <span className="text-emerald-600 font-semibold">Transformation occurs</span>
                      ) : (
                        <span className="text-red-600 font-semibold">Transformation FAILS</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="text-xs text-stone-500 italic">
            Enzyme X degrades one type of biological molecule. Enzyme Y degrades another. Enzyme Z degrades a third.
            Only one enzyme destroyed the transforming ability.
          </div>

          {/* Question 1 */}
          <QuestionPanel
            question="Which molecule is the transforming principle?"
            correct={submitted1 ? answer1 === 'c' : null}
            feedback={
              submitted1
                ? answer1 === 'c'
                  ? 'Correct! Only Enzyme Z (which degrades DNA) destroyed the transforming ability. DNA is the molecule that carries hereditary information.'
                  : 'Not quite. Look at the results: which enzyme destroyed transformation? That enzyme targets the transforming principle.'
                : undefined
            }
          >
            <div className="space-y-2">
              {[
                { key: 'a', label: 'Protein — because enzymes are proteins' },
                { key: 'b', label: 'RNA — because RNA carries information' },
                { key: 'c', label: 'DNA — because only destroying DNA stops transformation' },
                { key: 'd', label: 'All three are needed together' },
              ].map(opt => (
                <OptionButton
                  key={opt.key}
                  label={`(${opt.key}) ${opt.label}`}
                  selected={answer1 === opt.key}
                  correct={submitted1 ? (answer1 === opt.key ? opt.key === 'c' : null) : null}
                  onClick={() => { if (!submitted1) setAnswer1(opt.key); }}
                  disabled={submitted1}
                />
              ))}
              {answer1 && !submitted1 && (
                <button
                  type="button"
                  onClick={() => setSubmitted1(true)}
                  className="bg-amber-700 text-white font-bold px-4 py-2 rounded-lg text-sm hover:bg-amber-800"
                >
                  Submit
                </button>
              )}
            </div>
          </QuestionPanel>

          {/* Question 2 — only after Q1 correct */}
          {submitted1 && answer1 === 'c' && (
            <QuestionPanel
              question="Why was Avery's result initially met with skepticism? Most biologists in the 1940s expected proteins to carry hereditary information because..."
              correct={submitted2 ? answer2 === 'a' : null}
              feedback={
                submitted2
                  ? answer2 === 'a'
                    ? 'Correct! With 20 amino acids vs only 4 nucleotide bases, proteins seemed to have a much richer "alphabet" for encoding information. It took until Hershey-Chase (1952) and Watson-Crick (1953) to convince the field that DNA\'s structure was perfectly suited for information storage.'
                    : 'Consider: what was the argument for proteins as information molecules? Think about the "alphabet" available to each molecule.'
                  : undefined
              }
            >
              <div className="space-y-2">
                {[
                  { key: 'a', label: 'Proteins have 20 amino acids (more "letters" than DNA\'s 4 bases) — so they seemed more capable of encoding complex information' },
                  { key: 'b', label: 'DNA was too expensive to study' },
                  { key: 'c', label: 'Avery wasn\'t a respected scientist' },
                  { key: 'd', label: 'The experiment used bacteria, not eukaryotes' },
                ].map(opt => (
                  <OptionButton
                    key={opt.key}
                    label={`(${opt.key}) ${opt.label}`}
                    selected={answer2 === opt.key}
                    correct={submitted2 ? (answer2 === opt.key ? opt.key === 'a' : null) : null}
                    onClick={() => { if (!submitted2) setAnswer2(opt.key); }}
                    disabled={submitted2}
                  />
                ))}
                {answer2 && !submitted2 && (
                  <button
                    type="button"
                    onClick={() => setSubmitted2(true)}
                    className="bg-amber-700 text-white font-bold px-4 py-2 rounded-lg text-sm hover:bg-amber-800"
                  >
                    Submit
                  </button>
                )}
              </div>
            </QuestionPanel>
          )}
        </>
      )}
    </div>
  );
}

// ── Experiment 1: DNA Structure — Base Pairing ────────────────────────

const EXP1_STRAND = 'ATGCCTAAG';

function Exp1_BasePairing({ onComplete }: { onComplete: () => void }) {
  const [studentBases, setStudentBases] = useState<(string | null)[]>(
    () => Array(EXP1_STRAND.length).fill(null)
  );
  const [showResult, setShowResult] = useState(false);
  const completedRef = useRef(false);

  // The complement at each position: A↔T, G↔C
  const positionComplement = EXP1_STRAND.split('').map(b => {
    const comp: Record<string, string> = { A: 'T', T: 'A', G: 'C', C: 'G' };
    return comp[b] ?? '?';
  });

  const hBonds: Record<string, number> = { A: 2, T: 2, G: 3, C: 3 };

  const cycleBases = ['A', 'T', 'G', 'C'];

  const handleClickBase = useCallback((index: number) => {
    if (showResult) return;
    setStudentBases(prev => {
      const next = [...prev];
      const current = next[index];
      if (current === null) {
        next[index] = 'A';
      } else {
        const idx = cycleBases.indexOf(current);
        next[index] = cycleBases[(idx + 1) % 4];
      }
      return next;
    });
  }, [showResult]);

  const allFilled = studentBases.every(b => b !== null);
  const isCorrect = allFilled && studentBases.every((b, i) => b === positionComplement[i]);

  const handleCheck = useCallback(() => {
    setShowResult(true);
  }, []);

  useEffect(() => {
    if (showResult && isCorrect && !completedRef.current) {
      completedRef.current = true;
      const timer = setTimeout(onComplete, 600);
      return () => clearTimeout(timer);
    }
  }, [showResult, isCorrect, onComplete]);

  // Question section
  const [qAnswer, setQAnswer] = useState('');
  const [qSubmitted, setQSubmitted] = useState(false);
  const qCorrect = qSubmitted ? qAnswer.replace(/[\s'-]/g, '').toUpperCase() === 'GCTAATGC' : null;

  useEffect(() => {
    if (qCorrect === true && showResult && isCorrect && !completedRef.current) {
      completedRef.current = true;
      const timer = setTimeout(onComplete, 600);
      return () => clearTimeout(timer);
    }
  }, [qCorrect, showResult, isCorrect, onComplete]);

  return (
    <div className="space-y-6">
      <div className="text-sm text-stone-600 space-y-2">
        <p>
          DNA is a double-stranded molecule. The two strands are held together by hydrogen bonds
          between complementary bases:
        </p>
        <div className="flex gap-6 text-sm font-mono">
          <span><strong className="text-emerald-600">A</strong> pairs with <strong className="text-red-500">T</strong> (2 hydrogen bonds)</span>
          <span><strong className="text-blue-500">G</strong> pairs with <strong className="text-yellow-500">C</strong> (3 hydrogen bonds)</span>
        </div>
        <p>The strands run <strong>antiparallel</strong>: one runs 5&apos;&#x2192;3&apos;, the other 3&apos;&#x2192;5&apos;.</p>
      </div>

      {/* Interactive base pairing */}
      <div className="bg-white rounded-xl border border-stone-200 p-5">
        <p className="text-sm font-semibold text-stone-700 mb-4">
          Build the complementary strand. Click each position to cycle through bases (A, T, G, C).
        </p>

        {/* 5' → 3' label */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-mono text-stone-400 w-10">5&apos;</span>
          <div className="flex gap-1">
            {EXP1_STRAND.split('').map((base, i) => (
              <BaseBlock key={`top-${i}`} base={base} />
            ))}
          </div>
          <span className="text-xs font-mono text-stone-400">3&apos;</span>
        </div>

        {/* Hydrogen bonds */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-mono text-stone-400 w-10" />
          <div className="flex gap-1">
            {EXP1_STRAND.split('').map((base, i) => (
              <HydrogenBonds key={`hb-${i}`} count={hBonds[base] ?? 2} />
            ))}
          </div>
        </div>

        {/* Student strand */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-stone-400 w-10">3&apos;</span>
          <div className="flex gap-1">
            {studentBases.map((base, i) => (
              <BaseBlock
                key={`bot-${i}`}
                base={base ?? '?'}
                onClick={() => handleClickBase(i)}
                highlight={showResult ? (base === positionComplement[i] ? '#22c55e' : '#ef4444') : undefined}
              />
            ))}
          </div>
          <span className="text-xs font-mono text-stone-400">5&apos;</span>
        </div>

        <div className="mt-4 flex gap-3 items-center">
          {allFilled && !showResult && (
            <button
              type="button"
              onClick={handleCheck}
              className="bg-amber-700 text-white font-bold px-4 py-2 rounded-lg text-sm hover:bg-amber-800"
            >
              Check Pairing
            </button>
          )}
          {showResult && (
            <div className={`text-sm font-semibold ${isCorrect ? 'text-emerald-600' : 'text-red-600'}`}>
              {isCorrect
                ? 'Perfect! The complementary strand is correct.'
                : `Not quite. Remember: A pairs with T, G pairs with C. Try again!`}
            </div>
          )}
          {showResult && !isCorrect && (
            <button
              type="button"
              onClick={() => { setShowResult(false); setStudentBases(Array(EXP1_STRAND.length).fill(null)); }}
              className="bg-stone-200 text-stone-700 font-bold px-4 py-2 rounded-lg text-sm hover:bg-stone-300"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Question */}
      {showResult && isCorrect && (
        <QuestionPanel
          question="If one strand is 5'-GCATTAGC-3', what is the complementary strand (written 5' to 3')?"
          correct={qCorrect}
          feedback={
            qSubmitted
              ? qCorrect
                ? "Correct! The complement of 5'-GCATTAGC-3' is 3'-CGTAATCG-5', which written 5' to 3' is GCTAATGC."
                : "Remember: first write the complement (A-T, G-C), then reverse it to read 5' to 3'."
              : undefined
          }
        >
          <div className="flex gap-2 items-center">
            <span className="text-sm font-mono text-stone-500">5&apos;-</span>
            <input
              type="text"
              value={qAnswer}
              onChange={e => setQAnswer(e.target.value.toUpperCase().replace(/[^ATGC]/g, ''))}
              disabled={qSubmitted && qCorrect === true}
              className="border border-stone-300 rounded-lg px-3 py-2 text-sm font-mono w-40 focus:outline-none focus:border-amber-400"
              placeholder="XXXXXXXX"
              maxLength={8}
            />
            <span className="text-sm font-mono text-stone-500">-3&apos;</span>
            {qAnswer.length === 8 && !qSubmitted && (
              <button
                type="button"
                onClick={() => setQSubmitted(true)}
                className="bg-amber-700 text-white font-bold px-4 py-2 rounded-lg text-sm hover:bg-amber-800"
              >
                Submit
              </button>
            )}
            {qSubmitted && !qCorrect && (
              <button
                type="button"
                onClick={() => { setQSubmitted(false); setQAnswer(''); }}
                className="bg-stone-200 text-stone-700 font-bold px-3 py-2 rounded-lg text-xs hover:bg-stone-300"
              >
                Retry
              </button>
            )}
          </div>
        </QuestionPanel>
      )}
    </div>
  );
}

// ── Experiment 2: Transcription ───────────────────────────────────────

const EXP2_TEMPLATE = 'TACGAATTC'; // 3'→5'
const EXP2_MRNA_ANSWER = transcribe(EXP2_TEMPLATE); // AUGCUUAAG

function Exp2_Transcription({ onComplete }: { onComplete: () => void }) {
  const [studentMrna, setStudentMrna] = useState<(string | null)[]>(
    () => Array(EXP2_TEMPLATE.length).fill(null)
  );
  const [showResult, setShowResult] = useState(false);
  const completedRef = useRef(false);

  const rnaBases = ['A', 'U', 'G', 'C'];

  const handleClickBase = useCallback((index: number) => {
    if (showResult) return;
    setStudentMrna(prev => {
      const next = [...prev];
      const current = next[index];
      if (current === null) {
        next[index] = 'A';
      } else {
        const idx = rnaBases.indexOf(current);
        next[index] = rnaBases[(idx + 1) % 4];
      }
      return next;
    });
  }, [showResult]);

  const allFilled = studentMrna.every(b => b !== null);
  const expectedBases = EXP2_MRNA_ANSWER.split('');
  const isCorrect = allFilled && studentMrna.every((b, i) => b === expectedBases[i]);

  useEffect(() => {
    if (showResult && isCorrect && !completedRef.current) {
      completedRef.current = true;
      const timer = setTimeout(onComplete, 600);
      return () => clearTimeout(timer);
    }
  }, [showResult, isCorrect, onComplete]);

  return (
    <div className="space-y-6">
      <div className="text-sm text-stone-600 space-y-2">
        <p>
          <strong>Transcription</strong> is the process of copying DNA into messenger RNA (mRNA).
          RNA polymerase reads the <strong>template strand</strong> in the 3&apos;&#x2192;5&apos; direction
          and synthesizes mRNA in the 5&apos;&#x2192;3&apos; direction.
        </p>
        <div className="bg-amber-50 rounded-lg p-3 space-y-1 text-xs font-mono">
          <div>Template DNA base &#x2192; mRNA base:</div>
          <div>A &#x2192; <strong className="text-orange-500">U</strong> &nbsp;|&nbsp; T &#x2192; <strong className="text-emerald-600">A</strong> &nbsp;|&nbsp; G &#x2192; <strong className="text-yellow-500">C</strong> &nbsp;|&nbsp; C &#x2192; <strong className="text-blue-500">G</strong></div>
          <div className="text-stone-500 mt-1">Note: RNA uses <strong>U</strong> (uracil) instead of T (thymine)</div>
        </div>
      </div>

      {/* Gene diagram */}
      <div className="bg-white rounded-xl border border-stone-200 p-5">
        <p className="text-sm font-semibold text-stone-700 mb-4">
          Transcribe this gene. Click each position to build the mRNA (cycle through A, U, G, C).
        </p>

        {/* Coding strand (for reference) */}
        <div className="text-xs text-stone-400 mb-1 ml-12">Coding strand (for reference):</div>
        <div className="flex items-center gap-2 mb-2 opacity-50">
          <span className="text-xs font-mono text-stone-400 w-10">5&apos;</span>
          <div className="flex gap-1">
            {reverseComplement(EXP2_TEMPLATE).split('').map((base, i) => (
              <BaseBlock key={`coding-${i}`} base={base} size="sm" />
            ))}
          </div>
          <span className="text-xs font-mono text-stone-400">3&apos;</span>
        </div>

        {/* Template strand */}
        <div className="text-xs text-stone-500 mb-1 ml-12 font-semibold">Template strand (RNA polymerase reads this):</div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-mono text-stone-400 w-10">3&apos;</span>
          <div className="flex gap-1">
            {EXP2_TEMPLATE.split('').map((base, i) => (
              <BaseBlock key={`template-${i}`} base={base} />
            ))}
          </div>
          <span className="text-xs font-mono text-stone-400">5&apos;</span>
        </div>

        <div className="flex items-center gap-2 mb-1 ml-12">
          <div className="flex gap-1">
            {EXP2_TEMPLATE.split('').map((_, i) => (
              <div key={`arrow-${i}`} className="w-9 text-center text-stone-300">&#x2193;</div>
            ))}
          </div>
        </div>

        {/* Student mRNA */}
        <div className="text-xs text-stone-500 mb-1 ml-12 font-semibold">Your mRNA:</div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-stone-400 w-10">5&apos;</span>
          <div className="flex gap-1">
            {studentMrna.map((base, i) => (
              <BaseBlock
                key={`mrna-${i}`}
                base={base ?? '?'}
                onClick={() => handleClickBase(i)}
                highlight={showResult ? (base === expectedBases[i] ? '#22c55e' : '#ef4444') : undefined}
              />
            ))}
          </div>
          <span className="text-xs font-mono text-stone-400">3&apos;</span>
        </div>

        <div className="mt-4 flex gap-3 items-center">
          {allFilled && !showResult && (
            <button
              type="button"
              onClick={() => setShowResult(true)}
              className="bg-amber-700 text-white font-bold px-4 py-2 rounded-lg text-sm hover:bg-amber-800"
            >
              Check Transcription
            </button>
          )}
          {showResult && (
            <div className={`text-sm font-semibold ${isCorrect ? 'text-emerald-600' : 'text-red-600'}`}>
              {isCorrect
                ? `Correct! The mRNA is 5'-${EXP2_MRNA_ANSWER}-3'. Notice it matches the coding strand with U replacing T.`
                : 'Not quite. Remember: A on template becomes U in mRNA, T becomes A, G becomes C, C becomes G.'}
            </div>
          )}
          {showResult && !isCorrect && (
            <button
              type="button"
              onClick={() => { setShowResult(false); setStudentMrna(Array(EXP2_TEMPLATE.length).fill(null)); }}
              className="bg-stone-200 text-stone-700 font-bold px-4 py-2 rounded-lg text-sm hover:bg-stone-300"
            >
              Reset
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Experiment 3: The Genetic Code — Codons ───────────────────────────

const EXP3_MRNA = 'AUGCUUAAGUAA';

function Exp3_GeneticCode({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0); // 0: explore table, 1: codon exercise, 2: reading frame
  const completedRef = useRef(false);

  // Step 1: codon translation exercise
  const codons = useMemo(() => {
    const result: string[] = [];
    for (let i = 0; i < EXP3_MRNA.length; i += 3) {
      result.push(EXP3_MRNA.slice(i, i + 3));
    }
    return result;
  }, []);
  const correctAAs = codons.map(c => CODON_TABLE[c] ?? '?');

  const [studentAAs, setStudentAAs] = useState<(string | null)[]>(() => Array(codons.length).fill(null));
  const [codonSubmitted, setCodonSubmitted] = useState(false);
  const codonCorrect = codonSubmitted && studentAAs.every((aa, i) => aa === correctAAs[i]);

  // Step 2: reading frame
  const [rfAnswer, setRfAnswer] = useState<string | null>(null);
  const [rfSubmitted, setRfSubmitted] = useState(false);

  // The frame-shifted version (reading from position 1):
  const shiftedMrna = EXP3_MRNA.slice(1);
  const shiftedCodons: string[] = [];
  for (let i = 0; i + 2 < shiftedMrna.length; i += 3) {
    shiftedCodons.push(shiftedMrna.slice(i, i + 3));
  }
  const shiftedAAs = shiftedCodons.map(c => {
    const aa = CODON_TABLE[c];
    return aa === '*' ? 'Stop' : (AA_THREE_LETTER[aa ?? ''] ?? c);
  });

  useEffect(() => {
    if (rfSubmitted && rfAnswer === 'b' && !completedRef.current) {
      completedRef.current = true;
      const timer = setTimeout(onComplete, 600);
      return () => clearTimeout(timer);
    }
  }, [rfSubmitted, rfAnswer, onComplete]);

  const aaOptions = ['M', 'L', 'K', 'F', 'I', 'V', 'S', 'P', '*'];

  return (
    <div className="space-y-6">
      <div className="text-sm text-stone-600 space-y-2">
        <p>
          The <strong>genetic code</strong> maps each three-base <strong>codon</strong> in mRNA to an
          amino acid (or a stop signal). There are 64 possible codons encoding 20 amino acids plus 3 stop signals.
        </p>
        <p>Key features: <strong>AUG</strong> = start codon (Met). <strong>UAA, UAG, UGA</strong> = stop codons.</p>
      </div>

      {/* Codon table */}
      <div className="bg-white rounded-xl border border-stone-200 p-4 overflow-x-auto">
        <p className="text-xs font-semibold text-stone-500 mb-2">Standard Genetic Code</p>
        <div className="grid grid-cols-4 gap-px bg-stone-200 text-xs font-mono rounded overflow-hidden" style={{ minWidth: 400 }}>
          {/* Header row */}
          <div className="bg-stone-100 p-1.5 text-center font-bold text-stone-500">1st \\ 2nd</div>
          {['U', 'C', 'A', 'G'].map(b => (
            <div key={b} className="bg-stone-100 p-1.5 text-center font-bold" style={{ color: BASE_COLORS[b] }}>{b}</div>
          ))}
          {/* Not a real 4-col grid; we need a more complex layout */}
        </div>

        {/* Simplified codon table as grouped rows */}
        <div className="mt-2 text-xs font-mono space-y-0.5">
          {['U', 'C', 'A', 'G'].map(first => (
            <div key={first} className="flex gap-1">
              <div className="w-6 font-bold flex items-center justify-center" style={{ color: BASE_COLORS[first] }}>{first}</div>
              <div className="flex-1 grid grid-cols-4 gap-0.5">
                {['U', 'C', 'A', 'G'].map(second => (
                  <div key={`${first}${second}`} className="bg-stone-50 rounded p-1 space-y-0.5">
                    {['U', 'C', 'A', 'G'].map(third => {
                      const codon = first + second + third;
                      const aa = CODON_TABLE[codon] ?? '?';
                      const label = aa === '*' ? 'Stop' : AA_THREE_LETTER[aa] ?? aa;
                      const isStop = aa === '*';
                      const isStart = codon === 'AUG';
                      return (
                        <div
                          key={codon}
                          className={`flex justify-between px-1 py-0.5 rounded ${
                            isStop ? 'bg-red-50 text-red-700' : isStart ? 'bg-emerald-50 text-emerald-700' : 'text-stone-600'
                          }`}
                        >
                          <span>{codon}</span>
                          <span className="font-bold">{label}</span>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {step === 0 && (
        <button
          type="button"
          onClick={() => setStep(1)}
          className="bg-amber-700 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-amber-800"
        >
          Try Translating a Sequence
        </button>
      )}

      {step >= 1 && (
        <div className="bg-white rounded-xl border border-stone-200 p-5 space-y-4">
          <p className="text-sm font-semibold text-stone-700">
            Translate this mRNA sequence. For each codon, select the amino acid from the dropdown.
          </p>

          {/* mRNA broken into codons */}
          <div className="flex flex-wrap gap-3 items-end">
            {codons.map((codon, i) => (
              <div key={i} className="text-center">
                <div className="flex gap-0.5 mb-1">
                  {codon.split('').map((base, j) => (
                    <BaseBlock key={j} base={base} size="sm" />
                  ))}
                </div>
                <select
                  value={studentAAs[i] ?? ''}
                  onChange={e => {
                    const val = e.target.value || null;
                    setStudentAAs(prev => { const n = [...prev]; n[i] = val; return n; });
                  }}
                  disabled={codonSubmitted}
                  className={`text-xs border rounded px-1 py-1 w-16 ${
                    codonSubmitted
                      ? studentAAs[i] === correctAAs[i] ? 'border-emerald-400 bg-emerald-50' : 'border-red-300 bg-red-50'
                      : 'border-stone-300'
                  }`}
                >
                  <option value="">--</option>
                  {aaOptions.map(aa => (
                    <option key={aa} value={aa}>
                      {aa === '*' ? 'Stop' : AA_THREE_LETTER[aa]}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          {!codonSubmitted && studentAAs.every(a => a !== null) && (
            <button
              type="button"
              onClick={() => setCodonSubmitted(true)}
              className="bg-amber-700 text-white font-bold px-4 py-2 rounded-lg text-sm hover:bg-amber-800"
            >
              Check
            </button>
          )}

          {codonSubmitted && (
            <div className={`text-sm font-semibold ${codonCorrect ? 'text-emerald-600' : 'text-red-600'}`}>
              {codonCorrect
                ? `Correct! AUG-CUU-AAG-UAA = Met-Leu-Lys-Stop. The protein is 3 amino acids long.`
                : 'Not quite. Check each codon against the table above. AUG is always Met (start).'}
            </div>
          )}

          {codonSubmitted && codonCorrect && step === 1 && (
            <button
              type="button"
              onClick={() => setStep(2)}
              className="bg-amber-700 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-amber-800"
            >
              Explore Reading Frames
            </button>
          )}
        </div>
      )}

      {step >= 2 && (
        <div className="bg-white rounded-xl border border-stone-200 p-5 space-y-4">
          <p className="text-sm font-semibold text-stone-700">Reading Frame Matters</p>
          <p className="text-sm text-stone-600">
            What if we shift the reading frame by one base? Instead of starting at position 1,
            we start at position 2:
          </p>

          <div className="bg-stone-50 rounded-lg p-3 space-y-1 text-sm font-mono">
            <div>Original frame: <strong>AUG</strong> | <strong>CUU</strong> | <strong>AAG</strong> | <strong>UAA</strong></div>
            <div className="text-stone-400">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Met&nbsp;&nbsp;&nbsp;Leu&nbsp;&nbsp;&nbsp;Lys&nbsp;&nbsp;&nbsp;Stop</div>
            <div className="mt-2">Shifted (+1):&nbsp;&nbsp;&nbsp;<strong>{shiftedCodons.join(' | ')}</strong></div>
            <div className="text-stone-400">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{shiftedAAs.join('   ')}</div>
          </div>

          <QuestionPanel
            question="What happens when the reading frame shifts by one base?"
            correct={rfSubmitted ? rfAnswer === 'b' : null}
            feedback={
              rfSubmitted
                ? rfAnswer === 'b'
                  ? 'Correct! A frameshift completely changes which codons are read, producing a completely different (and usually nonfunctional) protein. This is why frameshift mutations (insertions/deletions) are typically more severe than point mutations.'
                  : 'Look at the two translations above. The shifted frame produces completely different amino acids.'
                : undefined
            }
          >
            <div className="space-y-2">
              {[
                { key: 'a', label: 'Only the first amino acid changes' },
                { key: 'b', label: 'Every codon changes — a completely different protein results' },
                { key: 'c', label: 'Nothing changes — the code is frame-independent' },
              ].map(opt => (
                <OptionButton
                  key={opt.key}
                  label={`(${opt.key}) ${opt.label}`}
                  selected={rfAnswer === opt.key}
                  correct={rfSubmitted ? (rfAnswer === opt.key ? opt.key === 'b' : null) : null}
                  onClick={() => { if (!rfSubmitted) setRfAnswer(opt.key); }}
                  disabled={rfSubmitted}
                />
              ))}
              {rfAnswer && !rfSubmitted && (
                <button
                  type="button"
                  onClick={() => setRfSubmitted(true)}
                  className="bg-amber-700 text-white font-bold px-4 py-2 rounded-lg text-sm hover:bg-amber-800"
                >
                  Submit
                </button>
              )}
            </div>
          </QuestionPanel>
        </div>
      )}
    </div>
  );
}

// ── Experiment 4: Translation — Building a Protein ────────────────────

// A real fragment from Rubisco large subunit (rbcL) - first 30 bp after start codon
// This is a simplified educational sequence based on rbcL
const EXP4_CODING_DNA = 'ATGAGCCAAGCTGCTTCTAATGCCAAATGG'; // 30 bp = 10 codons
const EXP4_TEMPLATE_DNA = reverseComplement(EXP4_CODING_DNA);

function Exp4_Translation({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  // Step 0: identify template strand
  // Step 1: transcribe to mRNA
  // Step 2: break into codons
  // Step 3: translate to protein
  // Step 4: write final sequence
  const completedRef = useRef(false);

  // Step 0: template strand identification
  const [templateAnswer, setTemplateAnswer] = useState<string | null>(null);
  const [templateSubmitted, setTemplateSubmitted] = useState(false);

  // Step 1: mRNA (auto-computed for verification)
  const correctMrna = codingToMrna(EXP4_CODING_DNA);

  // Step 3: protein
  const expectedProtein = translateToProtein(EXP4_CODING_DNA);
  const expectedProteinStr = expectedProtein.map(aa => AA_THREE_LETTER[aa] ?? aa).join('-');

  // Step 4: final answer
  const [proteinAnswer, setProteinAnswer] = useState('');
  const [proteinSubmitted, setProteinSubmitted] = useState(false);
  const expectedSingleLetter = expectedProtein.join('');
  const proteinCorrect = proteinSubmitted && proteinAnswer.toUpperCase().replace(/[^A-Z]/g, '') === expectedSingleLetter;

  useEffect(() => {
    if (proteinCorrect && !completedRef.current) {
      completedRef.current = true;
      const timer = setTimeout(onComplete, 600);
      return () => clearTimeout(timer);
    }
  }, [proteinCorrect, onComplete]);

  return (
    <div className="space-y-6">
      <div className="text-sm text-stone-600 space-y-2">
        <p>
          Now put it all together: go from a DNA coding sequence to a protein. This sequence is based on
          a fragment of <strong>rbcL</strong>, the gene encoding the large subunit of <strong>Rubisco</strong> (ribulose-1,5-bisphosphate
          carboxylase/oxygenase) — the most abundant protein on Earth, responsible for fixing CO&#x2082; in
          photosynthesis.
        </p>
      </div>

      {/* Show the DNA */}
      <div className="bg-white rounded-xl border border-stone-200 p-5 space-y-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold text-stone-500">Gene fragment (rbcL):</p>
          <div className="bg-stone-50 rounded-lg p-3 text-xs font-mono space-y-1">
            <div>5&apos;-{EXP4_CODING_DNA}-3&apos; &nbsp;<span className="text-stone-400">(Strand 1)</span></div>
            <div>3&apos;-{EXP4_TEMPLATE_DNA.split('').reverse().join('')}-5&apos; &nbsp;<span className="text-stone-400">(Strand 2)</span></div>
          </div>
        </div>

        {/* Step 0: Which is the template? */}
        <QuestionPanel
          question="Step 1: Which strand does RNA polymerase use as the template? (Hint: the mRNA must start with AUG, which corresponds to ATG on the coding strand.)"
          correct={templateSubmitted ? templateAnswer === 'b' : null}
          feedback={
            templateSubmitted
              ? templateAnswer === 'b'
                ? 'Correct! Strand 2 is the template. RNA polymerase reads it 3\'→5\' to produce mRNA that matches Strand 1 (with U instead of T).'
                : 'The template strand is the one that RNA polymerase reads. The mRNA will match the coding strand (Strand 1) with U replacing T. So the template is the OTHER strand.'
              : undefined
          }
        >
          <div className="space-y-2">
            <OptionButton
              label="(a) Strand 1 is the template"
              selected={templateAnswer === 'a'}
              correct={templateSubmitted ? (templateAnswer === 'a' ? false : null) : null}
              onClick={() => { if (!templateSubmitted) setTemplateAnswer('a'); }}
              disabled={templateSubmitted}
            />
            <OptionButton
              label="(b) Strand 2 is the template"
              selected={templateAnswer === 'b'}
              correct={templateSubmitted ? (templateAnswer === 'b' ? true : null) : null}
              onClick={() => { if (!templateSubmitted) setTemplateAnswer('b'); }}
              disabled={templateSubmitted}
            />
            {templateAnswer && !templateSubmitted && (
              <button
                type="button"
                onClick={() => { setTemplateSubmitted(true); if (templateAnswer === 'b') setStep(1); }}
                className="bg-amber-700 text-white font-bold px-4 py-2 rounded-lg text-sm hover:bg-amber-800"
              >
                Submit
              </button>
            )}
          </div>
        </QuestionPanel>

        {/* Step 1: Show the mRNA */}
        {step >= 1 && (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-stone-700">Step 2: The mRNA (transcribed from the template):</p>
            <div className="bg-amber-50 rounded-lg p-3 font-mono text-sm overflow-x-auto">
              5&apos;-{correctMrna}-3&apos;
            </div>
            <button type="button" onClick={() => setStep(2)} className="bg-amber-700 text-white font-bold px-4 py-2 rounded-lg text-sm hover:bg-amber-800">
              Break into Codons
            </button>
          </div>
        )}

        {/* Step 2: Show codons */}
        {step >= 2 && (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-stone-700">Step 3: Reading in triplets (codons):</p>
            <div className="flex flex-wrap gap-2 font-mono text-sm">
              {(() => {
                const codons: string[] = [];
                for (let i = 0; i < correctMrna.length; i += 3) {
                  codons.push(correctMrna.slice(i, i + 3));
                }
                return codons.map((codon, i) => {
                  const aa = CODON_TABLE[codon];
                  const label = aa === '*' ? 'Stop' : (AA_THREE_LETTER[aa ?? ''] ?? '?');
                  return (
                    <div key={i} className="text-center">
                      <div className="bg-stone-100 rounded px-2 py-1 font-bold">{codon}</div>
                      <div className={`text-xs mt-0.5 ${aa === '*' ? 'text-red-600' : aa === 'M' && i === 0 ? 'text-emerald-600' : 'text-stone-500'}`}>
                        {label}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
            <button type="button" onClick={() => setStep(3)} className="bg-amber-700 text-white font-bold px-4 py-2 rounded-lg text-sm hover:bg-amber-800">
              Translate to Protein
            </button>
          </div>
        )}

        {/* Step 3: Show protein */}
        {step >= 3 && (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-stone-700">Step 4: The protein (amino acid sequence):</p>
            <div className="bg-emerald-50 rounded-lg p-3 font-mono text-sm">
              {expectedProteinStr}
            </div>
            <p className="text-sm text-stone-600">
              This {expectedProtein.length}-amino-acid fragment is the very beginning of the Rubisco large subunit.
              The full protein is 475 amino acids long.
            </p>
          </div>
        )}

        {/* Final verification */}
        {step >= 3 && (
          <QuestionPanel
            question={`Write the protein sequence using single-letter amino acid codes (${expectedProtein.length} letters):`}
            correct={proteinSubmitted ? proteinCorrect : null}
            feedback={
              proteinSubmitted
                ? proteinCorrect
                  ? `Correct! The protein sequence is ${expectedSingleLetter}.`
                  : `Check the codon table. The correct sequence is ${expectedSingleLetter}.`
                : undefined
            }
          >
            <div className="flex gap-2 items-center">
              <input
                type="text"
                value={proteinAnswer}
                onChange={e => setProteinAnswer(e.target.value.toUpperCase())}
                disabled={proteinCorrect}
                className="border border-stone-300 rounded-lg px-3 py-2 text-sm font-mono w-48 focus:outline-none focus:border-amber-400"
                placeholder={`${expectedProtein.length} letter codes...`}
                maxLength={expectedProtein.length + 5}
              />
              {proteinAnswer.length >= expectedProtein.length && !proteinSubmitted && (
                <button
                  type="button"
                  onClick={() => setProteinSubmitted(true)}
                  className="bg-amber-700 text-white font-bold px-4 py-2 rounded-lg text-sm hover:bg-amber-800"
                >
                  Submit
                </button>
              )}
              {proteinSubmitted && !proteinCorrect && (
                <button
                  type="button"
                  onClick={() => { setProteinSubmitted(false); setProteinAnswer(''); }}
                  className="bg-stone-200 text-stone-700 font-bold px-3 py-2 rounded-lg text-xs hover:bg-stone-300"
                >
                  Retry
                </button>
              )}
            </div>
          </QuestionPanel>
        )}
      </div>
    </div>
  );
}

// ── Experiment 5: Mutations — What Changes? ───────────────────────────

const EXP5_DNA = 'ATGAGCCAAGCTGCTTCTAATGCC'; // 24 bp = 8 codons

function Exp5_Mutations({ onComplete }: { onComplete: () => void }) {
  const [mutatedDna, setMutatedDna] = useState(EXP5_DNA);
  const [mutationLog, setMutationLog] = useState<Array<{
    position: number;
    original: string;
    mutant: string;
    type: MutationType;
    codon: string;
    newCodon: string;
    originalAA: string;
    newAA: string;
  }>>([]);

  const completedRef = useRef(false);

  // Tally mutation types
  const typeCounts = useMemo(() => {
    const counts: Record<MutationType, number> = { synonymous: 0, nonsynonymous: 0, nonsense: 0, 'start-loss': 0 };
    for (const m of mutationLog) counts[m.type]++;
    return counts;
  }, [mutationLog]);

  const hasExploredEnough = mutationLog.length >= 3;

  // Questions
  const [q1Answer, setQ1Answer] = useState<string | null>(null);
  const [q1Submitted, setQ1Submitted] = useState(false);
  const [q2Answer, setQ2Answer] = useState<string | null>(null);
  const [q2Submitted, setQ2Submitted] = useState(false);

  useEffect(() => {
    if (q1Submitted && q1Answer === 'c' && q2Submitted && q2Answer === 'b' && !completedRef.current) {
      completedRef.current = true;
      const timer = setTimeout(onComplete, 600);
      return () => clearTimeout(timer);
    }
  }, [q1Submitted, q1Answer, q2Submitted, q2Answer, onComplete]);

  const handleMutate = useCallback((position: number) => {
    const bases = ['A', 'T', 'G', 'C'];
    const currentBase = mutatedDna[position];
    const idx = bases.indexOf(currentBase);
    const newBase = bases[(idx + 1) % 4];

    // Always classify against wild type for pedagogical clarity
    const classification = classifyMutation(EXP5_DNA, position, newBase);

    setMutatedDna(prev => prev.slice(0, position) + newBase + prev.slice(position + 1));
    setMutationLog(prev => [...prev, {
      position,
      original: EXP5_DNA[position],
      mutant: newBase,
      type: classification.type,
      codon: classification.originalCodon,
      newCodon: classification.newCodon,
      originalAA: classification.originalAA,
      newAA: classification.newAA,
    }]);
  }, [mutatedDna]);

  const handleReset = useCallback(() => {
    setMutatedDna(EXP5_DNA);
    setMutationLog([]);
  }, []);

  // Current protein
  const wildTypeProtein = translateToProtein(EXP5_DNA);
  const currentResult = translate(codingToMrna(mutatedDna));

  const TYPE_COLORS: Record<MutationType, string> = {
    synonymous: '#22c55e',
    nonsynonymous: '#f59e0b',
    nonsense: '#ef4444',
    'start-loss': '#ef4444',
  };

  return (
    <div className="space-y-6">
      <div className="text-sm text-stone-600 space-y-2">
        <p>
          <strong>Click on any base</strong> in the DNA sequence below to mutate it (it will cycle
          through A &#x2192; T &#x2192; G &#x2192; C). Watch how each mutation affects the mRNA, the codon,
          and the resulting amino acid.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-stone-200 p-5 space-y-4">
        {/* DNA sequence - clickable */}
        <div>
          <div className="flex items-center gap-1 mb-2">
            <span className="text-xs font-semibold text-stone-500 w-14">DNA:</span>
            <div className="flex gap-0.5 flex-wrap">
              {mutatedDna.split('').map((base, i) => {
                const isChanged = base !== EXP5_DNA[i];
                return (
                  <BaseBlock
                    key={i}
                    base={base}
                    size="sm"
                    onClick={() => handleMutate(i)}
                    highlight={isChanged ? TYPE_COLORS[classifyMutation(EXP5_DNA, i, base).type] : undefined}
                  />
                );
              })}
            </div>
          </div>

          {/* mRNA */}
          <div className="flex items-center gap-1 mb-2">
            <span className="text-xs font-semibold text-stone-500 w-14">mRNA:</span>
            <div className="text-xs font-mono text-stone-600 tracking-wider">
              {codingToMrna(mutatedDna)}
            </div>
          </div>

          {/* Protein */}
          <div className="flex items-center gap-1">
            <span className="text-xs font-semibold text-stone-500 w-14">Protein:</span>
            <div className="flex gap-1 flex-wrap">
              {currentResult.aminoAcids.map((aa, i) => {
                const isChanged = aa !== wildTypeProtein[i];
                return (
                  <span
                    key={i}
                    className={`text-xs font-mono px-1.5 py-0.5 rounded ${
                      isChanged ? 'bg-amber-100 text-amber-800 font-bold' : 'bg-stone-100 text-stone-600'
                    }`}
                  >
                    {AA_THREE_LETTER[aa] ?? aa}
                  </span>
                );
              })}
              {currentResult.stoppedEarly && (
                <span className="text-xs font-bold text-red-600 px-1.5 py-0.5 bg-red-50 rounded">STOP</span>
              )}
            </div>
          </div>
        </div>

        {/* Mutation log */}
        {mutationLog.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-semibold text-stone-500">Mutation Log:</p>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {mutationLog.map((m, i) => (
                <div
                  key={i}
                  className="text-xs rounded px-2 py-1 flex justify-between items-center"
                  style={{ backgroundColor: TYPE_COLORS[m.type] + '15', borderLeft: `3px solid ${TYPE_COLORS[m.type]}` }}
                >
                  <span className="font-mono">
                    pos {m.position + 1}: {m.original}&#x2192;{m.mutant} &nbsp;
                    ({m.codon}&#x2192;{m.newCodon})
                  </span>
                  <span className="font-semibold" style={{ color: TYPE_COLORS[m.type] }}>
                    {m.type === 'start-loss' ? 'Start loss' :
                     m.type === 'synonymous' ? `Silent (${AA_THREE_LETTER[m.originalAA]}=${AA_THREE_LETTER[m.newAA]})` :
                     m.type === 'nonsynonymous' ? `Missense (${AA_THREE_LETTER[m.originalAA]}→${AA_THREE_LETTER[m.newAA]})` :
                     `Nonsense (${AA_THREE_LETTER[m.originalAA]}→Stop)`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tally */}
        {mutationLog.length > 0 && (
          <div className="flex gap-3 text-xs">
            <span className="text-emerald-600 font-semibold">Synonymous: {typeCounts.synonymous}</span>
            <span className="text-amber-600 font-semibold">Missense: {typeCounts.nonsynonymous}</span>
            <span className="text-red-600 font-semibold">Nonsense: {typeCounts.nonsense}</span>
            {typeCounts['start-loss'] > 0 && (
              <span className="text-red-600 font-semibold">Start loss: {typeCounts['start-loss']}</span>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={handleReset}
          className="bg-stone-200 text-stone-700 font-bold px-3 py-1.5 rounded-lg text-xs hover:bg-stone-300"
        >
          Reset to Wild Type
        </button>
      </div>

      {/* Questions */}
      {hasExploredEnough && (
        <div className="space-y-4">
          <QuestionPanel
            question='Why does the third position of a codon often produce synonymous mutations?'
            correct={q1Submitted ? q1Answer === 'c' : null}
            feedback={
              q1Submitted
                ? q1Answer === 'c'
                  ? 'Correct! The genetic code is degenerate: most amino acids are encoded by multiple codons that typically differ only at the third (wobble) position. For example, GCU, GCC, GCA, and GCG all encode Alanine.'
                  : 'Think about codon degeneracy. Look at the codon table — how many codons encode the same amino acid?'
                : undefined
            }
          >
            <div className="space-y-2">
              {[
                { key: 'a', label: 'The third position is not read by the ribosome' },
                { key: 'b', label: 'The third position always contains the same base' },
                { key: 'c', label: 'The genetic code is degenerate — most amino acids have multiple codons that differ at the third (wobble) position' },
              ].map(opt => (
                <OptionButton
                  key={opt.key}
                  label={`(${opt.key}) ${opt.label}`}
                  selected={q1Answer === opt.key}
                  correct={q1Submitted ? (q1Answer === opt.key ? opt.key === 'c' : null) : null}
                  onClick={() => { if (!q1Submitted) setQ1Answer(opt.key); }}
                  disabled={q1Submitted}
                />
              ))}
              {q1Answer && !q1Submitted && (
                <button type="button" onClick={() => setQ1Submitted(true)} className="bg-amber-700 text-white font-bold px-4 py-2 rounded-lg text-sm hover:bg-amber-800">Submit</button>
              )}
            </div>
          </QuestionPanel>

          {q1Submitted && q1Answer === 'c' && (
            <QuestionPanel
              question="If a nonsense mutation occurred at codon 4 of this 8-codon protein, what would happen?"
              correct={q2Submitted ? q2Answer === 'b' : null}
              feedback={
                q2Submitted
                  ? q2Answer === 'b'
                    ? 'Correct! A premature stop codon at position 4 means only 3 amino acids would be translated. The resulting protein fragment would almost certainly be nonfunctional — it lacks most of its structure.'
                    : 'A nonsense mutation creates a premature stop codon. How much of the protein would be made?'
                  : undefined
              }
            >
              <div className="space-y-2">
                {[
                  { key: 'a', label: 'The protein would be normal — one mutation rarely matters' },
                  { key: 'b', label: 'The protein would be truncated to 3 amino acids — almost certainly nonfunctional' },
                  { key: 'c', label: 'The protein would be longer than normal' },
                ].map(opt => (
                  <OptionButton
                    key={opt.key}
                    label={`(${opt.key}) ${opt.label}`}
                    selected={q2Answer === opt.key}
                    correct={q2Submitted ? (q2Answer === opt.key ? opt.key === 'b' : null) : null}
                    onClick={() => { if (!q2Submitted) setQ2Answer(opt.key); }}
                    disabled={q2Submitted}
                  />
                ))}
                {q2Answer && !q2Submitted && (
                  <button type="button" onClick={() => setQ2Submitted(true)} className="bg-amber-700 text-white font-bold px-4 py-2 rounded-lg text-sm hover:bg-amber-800">Submit</button>
                )}
              </div>
            </QuestionPanel>
          )}
        </div>
      )}
    </div>
  );
}

// ── Experiment 6: From Sequence to Structure — Rubisco ────────────────

// A short stretch of Rubisco large subunit amino acids (first 30 of rbcL)
const RUBISCO_FRAGMENT = 'MSQAASNAKWNYGPQHIGSP'.split('');
const RUBISCO_FULL_LENGTH = 475;

function Exp6_ProteinStructure({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const completedRef = useRef(false);

  const [q1Answer, setQ1Answer] = useState<string | null>(null);
  const [q1Submitted, setQ1Submitted] = useState(false);
  const [q2Answer, setQ2Answer] = useState<string | null>(null);
  const [q2Submitted, setQ2Submitted] = useState(false);

  useEffect(() => {
    if (q1Submitted && q1Answer === 'a' && q2Submitted && q2Answer === 'b' && !completedRef.current) {
      completedRef.current = true;
      const timer = setTimeout(onComplete, 600);
      return () => clearTimeout(timer);
    }
  }, [q1Submitted, q1Answer, q2Submitted, q2Answer, onComplete]);

  return (
    <div className="space-y-6">
      <div className="text-sm text-stone-600 space-y-3">
        <p>
          <strong>Rubisco</strong> (ribulose-1,5-bisphosphate carboxylase/oxygenase) is the most
          abundant protein on Earth. It is found in every photosynthetic organism and catalyzes the
          first step of carbon fixation in the Calvin cycle — converting CO&#x2082; into organic carbon.
        </p>
        <p>
          The large subunit is encoded by the chloroplast gene <strong>rbcL</strong> ({RUBISCO_FULL_LENGTH} amino acids).
          A protein&apos;s amino acid sequence determines its 3D structure, which determines its function.
        </p>
      </div>

      {/* Amino acid property viewer */}
      <div className="bg-white rounded-xl border border-stone-200 p-5 space-y-4">
        <p className="text-sm font-semibold text-stone-700">
          Amino acid properties of the first {RUBISCO_FRAGMENT.length} residues of Rubisco:
        </p>

        <div className="flex flex-wrap gap-0.5">
          {RUBISCO_FRAGMENT.map((aa, i) => {
            const prop = AA_PROPERTIES[aa] ?? 'special';
            const color = AA_PROPERTY_COLORS[prop];
            return (
              <div
                key={i}
                className="w-8 h-10 rounded text-xs font-mono font-bold flex flex-col items-center justify-center text-white"
                style={{ backgroundColor: color }}
                title={`${AA_THREE_LETTER[aa]} — ${AA_PROPERTY_LABELS[prop]}`}
              >
                <span>{aa}</span>
                <span className="text-[8px] opacity-80">{i + 1}</span>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 text-xs">
          {(['hydrophobic', 'polar', 'positive', 'negative', 'special'] as const).map(prop => (
            <div key={prop} className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: AA_PROPERTY_COLORS[prop] }} />
              <span className="text-stone-600">{AA_PROPERTY_LABELS[prop]}</span>
            </div>
          ))}
        </div>

        <div className="text-sm text-stone-600 space-y-2">
          <p>
            <strong>Hydrophobic</strong> amino acids tend to fold to the <em>interior</em> of the protein
            (away from water). <strong>Charged</strong> and <strong>polar</strong> amino acids tend to
            face the <em>exterior</em> (interacting with water and other molecules).
          </p>
          <p>
            The active site of Rubisco — where CO&#x2082; binds — requires specific amino acids in precise
            positions. Even a single change at a critical position can eliminate enzymatic activity.
          </p>
        </div>

        {step === 0 && (
          <button type="button" onClick={() => setStep(1)} className="bg-amber-700 text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-amber-800">
            Continue to Questions
          </button>
        )}
      </div>

      {step >= 1 && (
        <div className="space-y-4">
          <QuestionPanel
            question={`If a nonsense mutation truncated Rubisco at position 50 of ${RUBISCO_FULL_LENGTH}, would the protein function?`}
            correct={q1Submitted ? q1Answer === 'a' : null}
            feedback={
              q1Submitted
                ? q1Answer === 'a'
                  ? `Correct! A protein truncated at position 50 out of ${RUBISCO_FULL_LENGTH} would retain only ~10% of its sequence — far too little for proper folding or an active site. It would be completely nonfunctional.`
                  : `Think about what fraction of the protein remains. 50 out of ${RUBISCO_FULL_LENGTH} is only ~10%.`
                : undefined
            }
          >
            <div className="space-y-2">
              {[
                { key: 'a', label: 'No — the protein would lose most of its structure and its active site' },
                { key: 'b', label: 'Yes — the first 50 amino acids contain enough information' },
                { key: 'c', label: 'It depends on which amino acid is at position 50' },
              ].map(opt => (
                <OptionButton
                  key={opt.key}
                  label={`(${opt.key}) ${opt.label}`}
                  selected={q1Answer === opt.key}
                  correct={q1Submitted ? (q1Answer === opt.key ? opt.key === 'a' : null) : null}
                  onClick={() => { if (!q1Submitted) setQ1Answer(opt.key); }}
                  disabled={q1Submitted}
                />
              ))}
              {q1Answer && !q1Submitted && (
                <button type="button" onClick={() => setQ1Submitted(true)} className="bg-amber-700 text-white font-bold px-4 py-2 rounded-lg text-sm hover:bg-amber-800">Submit</button>
              )}
            </div>
          </QuestionPanel>

          {q1Submitted && q1Answer === 'a' && (
            <QuestionPanel
              question="If a synonymous mutation changed codon 100 but not the amino acid, would the protein structure change?"
              correct={q2Submitted ? q2Answer === 'b' : null}
              feedback={
                q2Submitted
                  ? q2Answer === 'b'
                    ? 'Correct! Since the amino acid sequence is unchanged, the protein folds identically. This is why synonymous mutations are often called "silent" — they change the DNA/mRNA but not the protein. (In reality, codon usage can affect translation speed and folding in some cases, but the primary structure is identical.)'
                    : 'A synonymous mutation changes the codon but not the amino acid. If the amino acid is the same, what happens to the protein?'
                  : undefined
              }
            >
              <div className="space-y-2">
                {[
                  { key: 'a', label: 'Yes — any DNA change affects protein structure' },
                  { key: 'b', label: 'No — same amino acid sequence means same folding' },
                  { key: 'c', label: 'Only if the mutation is in the active site' },
                ].map(opt => (
                  <OptionButton
                    key={opt.key}
                    label={`(${opt.key}) ${opt.label}`}
                    selected={q2Answer === opt.key}
                    correct={q2Submitted ? (q2Answer === opt.key ? opt.key === 'b' : null) : null}
                    onClick={() => { if (!q2Submitted) setQ2Answer(opt.key); }}
                    disabled={q2Submitted}
                  />
                ))}
                {q2Answer && !q2Submitted && (
                  <button type="button" onClick={() => setQ2Submitted(true)} className="bg-amber-700 text-white font-bold px-4 py-2 rounded-lg text-sm hover:bg-amber-800">Submit</button>
                )}
              </div>
            </QuestionPanel>
          )}

          {q2Submitted && q2Answer === 'b' && (
            <div className="bg-blue-50 rounded-xl border border-blue-200 p-4 text-sm text-blue-800">
              <p className="font-semibold mb-1">AlphaFold and Protein Structure Prediction</p>
              <p>
                In 2020, DeepMind&apos;s <strong>AlphaFold</strong> solved the protein structure prediction
                problem — predicting 3D structure from amino acid sequence alone with near-experimental
                accuracy. This confirmed that the amino acid sequence is the primary determinant of
                protein structure, a principle you just demonstrated with Rubisco.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Experiment 7: Why Molecular Biology Matters for Genetics ──────────

function Exp7_Synthesis({ onComplete }: { onComplete: () => void }) {
  const [answer, setAnswer] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const completedRef = useRef(false);

  useEffect(() => {
    if (submitted && answer === 'c' && !completedRef.current) {
      completedRef.current = true;
      const timer = setTimeout(onComplete, 600);
      return () => clearTimeout(timer);
    }
  }, [submitted, answer, onComplete]);

  return (
    <div className="space-y-6">
      <div className="text-sm text-stone-600 space-y-3">
        <p className="font-semibold text-stone-700 text-base">Connecting Molecular Biology to Genetics</p>
        <p>
          Everything you have learned in this module connects directly to the genetics concepts in the
          other modules. The central dogma — DNA &#x2192; RNA &#x2192; Protein — is the molecular basis
          of inheritance.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4">
          <p className="text-sm font-bold text-emerald-800 mb-2">Mendelian Genetics</p>
          <p className="text-xs text-emerald-700">
            The &ldquo;alleles&rdquo; in Mendelian genetics are different DNA sequences at the same locus.
            A dominant allele often encodes a functional protein, while a recessive allele may encode a
            nonfunctional one. <strong>Dominance</strong> often arises from <strong>haplosufficiency</strong> — one
            functional copy producing enough protein for a normal phenotype.
          </p>
        </div>

        <div className="bg-cyan-50 rounded-xl border border-cyan-200 p-4">
          <p className="text-sm font-bold text-cyan-800 mb-2">Linkage &amp; Recombination</p>
          <p className="text-xs text-cyan-700">
            Crossing over during meiosis is a physical DNA event — chromosomes break and rejoin.
            Genes that are close together on a chromosome are less likely to have a crossover between
            them, which is why they are &ldquo;linked.&rdquo; The genetic map distances you measured in
            the Linkage module correspond to physical DNA distances.
          </p>
        </div>

        <div className="bg-violet-50 rounded-xl border border-violet-200 p-4">
          <p className="text-sm font-bold text-violet-800 mb-2">Population Genetics</p>
          <p className="text-xs text-violet-700">
            &ldquo;Allele frequencies&rdquo; are frequencies of different DNA sequence variants in a population.
            <strong> Mutations</strong> — the base changes you explored in Experiment 5 — are the raw material
            that drift and selection act on. A nonsynonymous mutation in rbcL that reduces Rubisco function
            would be selected against; a synonymous mutation might drift neutrally.
          </p>
        </div>

        <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
          <p className="text-sm font-bold text-amber-800 mb-2">Evolution</p>
          <p className="text-xs text-amber-700">
            All evolutionary change is ultimately molecular. Mutations create new alleles. Natural
            selection acts on phenotypes, which are determined by proteins, which are encoded by DNA.
            The central dogma connects genotype to phenotype at every level.
          </p>
        </div>
      </div>

      {/* Synthesis question */}
      <QuestionPanel
        question="A plant has a missense mutation in the rbcL gene that changes a critical active-site residue of Rubisco. Predict the consequence:"
        correct={submitted ? answer === 'c' : null}
        feedback={
          submitted
            ? answer === 'c'
              ? 'Correct! This is the complete chain: DNA mutation → altered protein → impaired enzyme → reduced carbon fixation → reduced growth. In a natural population, plants with this allele would photosynthesize less efficiently and produce fewer offspring — the allele would be selected against (connecting molecular biology to population genetics).'
              : 'Think through the entire chain: DNA → mRNA → protein → enzyme function → phenotype → fitness.'
            : undefined
        }
      >
        <div className="space-y-2">
          {[
            { key: 'a', label: 'No effect — Rubisco is too abundant to be affected by one mutation' },
            { key: 'b', label: 'The plant dies immediately — Rubisco is essential' },
            { key: 'c', label: 'Rubisco cannot fix CO\u2082 efficiently → reduced photosynthesis → reduced growth → this allele would be selected against in a population' },
            { key: 'd', label: 'Only the chloroplast is affected — the rest of the plant is normal' },
          ].map(opt => (
            <OptionButton
              key={opt.key}
              label={`(${opt.key}) ${opt.label}`}
              selected={answer === opt.key}
              correct={submitted ? (answer === opt.key ? opt.key === 'c' : null) : null}
              onClick={() => { if (!submitted) setAnswer(opt.key); }}
              disabled={submitted}
            />
          ))}
          {answer && !submitted && (
            <button type="button" onClick={() => setSubmitted(true)} className="bg-amber-700 text-white font-bold px-4 py-2 rounded-lg text-sm hover:bg-amber-800">Submit</button>
          )}
        </div>
      </QuestionPanel>

      {submitted && answer === 'c' && (
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-5 text-sm text-amber-800">
          <p className="font-bold mb-2">Module Complete!</p>
          <p>
            You have traced the path from DNA to protein and back to whole-organism genetics.
            The central dogma — DNA &#x2192; RNA &#x2192; Protein — is the molecular foundation of
            everything in genetics: inheritance, variation, and evolution.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Module definition ─────────────────────────────────────────────────

const EXPERIMENTS = [
  {
    id: 'molbio-0',
    title: 'The Transforming Principle',
    subtitle: 'Avery-MacLeod-McCarty, 1944',
    Component: Exp0_TransformingPrinciple,
  },
  {
    id: 'molbio-1',
    title: 'DNA Structure',
    subtitle: 'Base pairing rules',
    Component: Exp1_BasePairing,
  },
  {
    id: 'molbio-2',
    title: 'Transcription',
    subtitle: 'DNA to mRNA',
    Component: Exp2_Transcription,
  },
  {
    id: 'molbio-3',
    title: 'The Genetic Code',
    subtitle: 'Codons & amino acids',
    Component: Exp3_GeneticCode,
  },
  {
    id: 'molbio-4',
    title: 'Translation',
    subtitle: 'Building a protein from rbcL',
    Component: Exp4_Translation,
  },
  {
    id: 'molbio-5',
    title: 'Mutations',
    subtitle: 'What changes?',
    Component: Exp5_Mutations,
  },
  {
    id: 'molbio-6',
    title: 'Protein Structure',
    subtitle: 'From sequence to Rubisco',
    Component: Exp6_ProteinStructure,
  },
  {
    id: 'molbio-7',
    title: 'Synthesis',
    subtitle: 'Why molecular biology matters',
    Component: Exp7_Synthesis,
  },
];

const MODULE_DEF: ModuleDefinition = {
  id: 'molbio',
  title: 'Molecular Biology',
  subtitle: 'DNA, transcription, translation, mutations & protein structure',
  color: 'amber',
  backLink: { href: '/breeding-game/modules.html', label: 'All Modules' },
  experiments: EXPERIMENTS,
};

export default function MolBioModule() {
  return <ModuleShell module={MODULE_DEF} />;
}
