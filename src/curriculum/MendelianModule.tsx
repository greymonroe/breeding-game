/**
 * Mendelian Genetics Curriculum Module
 *
 * A self-contained learning experience where students discover
 * transmission genetics through hypothesis testing. Each experiment
 * builds on the last, from one gene to quantitative traits.
 *
 * Experiment flow:
 *  1. One Gene — cross red x white, observe 3:1, deduce dominance
 *  2. Genotype Prediction — predict offspring from known genotypes
 *  3. Incomplete Dominance — red x white -> pink, different from #1
 *  4. Test Cross — determine if red is RR or Rr
 *  5. Two Genes — dihybrid cross, independent assortment, 9:3:3:1
 *  6. Epistasis — coat color, modified ratios (9:3:4)
 *  7. Polygenic -> Quantitative — 1,2,5,10 genes -> continuous distribution
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  cross, makeOrganism, getAdditiveValue, makeAdditiveGene,
  FLOWER_COLOR, FLOWER_COLOR_INCOMPLETE, SEED_SHAPE,
  PIGMENT_GENE, AGOUTI_GENE,
  type CrossResult, type Organism, type GeneDefinition,
} from './genetics-engine';
import {
  ModuleShell, QuestionPanel, CrossWorkbench, HistogramChart, GameteVisualizer,
  type ModuleDefinition,
} from './components';

// ── Shared "Show gametes" toggle ──────────────────────────────────────────
//
// Thin wrapper that mounts GameteVisualizer behind an opt-in toggle. Used by
// Exp 1 (Rr × Rr), Exp 2 (Rr × rr), and Exp 5 (dihybrid). Same component,
// different parents/genes — this is Phase 2 item 2.1 of MENDELIAN_V2_PLAN.md.
//
// The toggle defaults to collapsed so students aren't overwhelmed with
// animation on first view. When expanded, GameteVisualizer's own internal
// controls (speed, view toggle, step-through) take over. When collapsed, the
// visualizer is UNMOUNTED so each show starts with a fresh cycle.
function GameteToggle({
  parentA,
  parentB,
  genes,
  sampleSize = 16,
}: {
  parentA: Organism;
  parentB: Organism;
  genes: GeneDefinition[];
  sampleSize?: number;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 my-6 space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-[200px]">
          <p className="text-sm font-bold text-stone-800">See the mechanism: gametes</p>
          {!show && (
            <p className="text-xs text-stone-500 mt-0.5">
              Watch how each parent's alleles segregate into gametes and fuse to make offspring.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShow(v => !v)}
          className={`rounded-xl px-4 py-2 text-xs font-bold border-2 transition-all ${
            show
              ? 'bg-emerald-500 text-white border-emerald-500 shadow-md'
              : 'bg-white text-emerald-700 border-emerald-400 hover:bg-emerald-50'
          }`}
        >
          {show ? 'Hide gametes \u2191' : 'Show gametes \u2193'}
        </button>
      </div>
      {show && (
        <GameteVisualizer
          parentA={parentA}
          parentB={parentB}
          genes={genes}
          sampleSize={sampleSize}
        />
      )}
    </div>
  );
}

// ── Experiments ──────────────────────────────────────────────────────────

// Historical framing prequel (Phase 3 item 3.2 of MENDELIAN_V2_PLAN.md).
//
// Stages the 1865 intellectual debate between blending and particulate
// inheritance as a discovery beat. The student commits to a prediction BEFORE
// running the cross, then Mendel's canonical P→F1→F2 with red/white peas
// surprises (or confirms) them. The exit question hooks into Exp 1 (which
// now covers "why 1/4?" at the gamete level).
//
// Pedagogical contract:
//  - Real engine crosses (cross() twice), never hardcoded arrays.
//  - No option in either QuestionPanel is styled, labeled, or ordered to
//    telegraph the answer. Every option reads as plausible to a student
//    who doesn't already know genetics.
//  - Every prediction in Beat 2 is accepted as a valid hypothesis — this
//    is not a graded quiz, it's a commitment to a worldview so the result
//    can update their model.
//  - F2 sample size N=40 keeps the 3:1 visually unambiguous: expected
//    30 red / 10 white, binomial SD ≈ 2.74, so a typical run lands near
//    25–35 red, clearly more than 50% and clearly not 75% exactly.
function Exp0_ParticulateVsBlending({ onComplete }: { onComplete: () => void }) {
  // P generation: homozygous red x homozygous white (Mendel's actual setup).
  const parentRed = useMemo(() => makeOrganism({ color: ['R', 'R'] }, 'p_red'), []);
  const parentWhite = useMemo(() => makeOrganism({ color: ['r', 'r'] }, 'p_white'), []);

  const [step, setStep] = useState(0);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [f1Result, setF1Result] = useState<CrossResult | null>(null);
  const [f2Result, setF2Result] = useState<CrossResult | null>(null);
  const [exitAnswer, setExitAnswer] = useState<string | null>(null);
  const [exitCorrect, setExitCorrect] = useState<boolean | null>(null);

  // Use the first two F1 siblings as the F1 × F1 cross. Both are Rr by
  // construction (RR × rr → every offspring is Rr), so this is a genuine
  // Rr × Rr cross driven by the engine, not a hardcoded heterozygote.
  const f1ParentA = f1Result?.offspring[0] ?? null;
  const f1ParentB = f1Result?.offspring[1] ?? f1ParentA;

  // Exit-question options. `correct: true` means "get emerald success and
  // advance". (c) is the mechanistic answer; (d) is an honest "I want to
  // learn more" that hooks into Exp 1 — both are accepted per spec.
  const EXIT_OPTIONS = [
    {
      key: 'chance',
      label: 'By chance — 1/4 is just a round number.',
      correct: false,
      feedback:
        "Chance alone doesn't explain a consistent 3:1 across every replicate. Flip a coin 40 times and you won't always get exactly 20 heads, but you will always get roughly half. The 3:1 ratio is reproducible because there's a mechanism generating it — not because 1/4 is a convenient fraction.",
    },
    {
      key: 'law',
      label: 'Because of the 3:1 ratio, which is a universal law.',
      correct: false,
      feedback:
        "The 3:1 ratio is a consequence, not a cause. Something about how the F1 parents make gametes produces 1/4 white offspring — and the 3:1 ratio is the observable shadow of that mechanism. The real answer is about what each F1 parent carries and transmits.",
    },
    {
      key: 'gametes',
      label:
        'Because each F1 parent carries one hidden r allele, and 1/4 of the time both parents pass r to the offspring.',
      correct: true,
      feedback:
        "Exactly — and this is the Law of Segregation stated mechanistically. Every F1 parent is Rr. When it makes gametes, half carry R and half carry r. When two F1 plants cross, the probability that both contribute r is 1/2 × 1/2 = 1/4. That's the 1/4 white. Coming up in Experiment 2: you'll work this out at the gamete level and see it animate.",
    },
    {
      key: 'hook',
      label: "I want to learn how — take me to Experiment 2.",
      correct: true,
      feedback:
        "Perfect — that's the right instinct. You've observed the pattern (3:1), and now you want the mechanism that generates it. Experiment 2 builds on exactly this moment: every F1 parent (Rr) makes two kinds of gametes, half R and half r, and 1/2 × 1/2 = 1/4 is where the 1/4 white comes from. That's the Law of Segregation.",
    },
  ] as const;

  // Handoff: once the student picks a correct (or hook) exit answer, advance
  // after a short read-through delay. useEffect, not setTimeout-from-render.
  useEffect(() => {
    if (exitCorrect === true) {
      const t = setTimeout(() => onComplete(), 2200);
      return () => clearTimeout(t);
    }
  }, [exitCorrect, onComplete]);

  return (
    <div className="space-y-6">
      {/* Beat 1 — Historical framing. Stone card, Patrick Hand header for
          lab-notebook feel. Factually neutral on specifics we're not sure of. */}
      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-6 shadow-sm space-y-3">
        <div
          className="text-xs font-semibold tracking-wider text-stone-500 uppercase"
          style={{ fontFamily: '"Patrick Hand", cursive' }}
        >
          Mendel's garden, Brno — 1865
        </div>
        <p
          className="text-lg leading-snug text-stone-800"
          style={{ fontFamily: '"Patrick Hand", cursive' }}
        >
          It's 1865. You're Gregor Mendel, a monk in a monastery garden in Brno, Moravia,
          growing pea plants. You have hundreds of them, neatly labeled, and you're about
          to run the experiment that founds genetics.
        </p>
        <p className="text-sm text-stone-600 leading-relaxed">
          Most scientists of your era believe in <strong>blending inheritance</strong>:
          when you cross two plants with different traits, the offspring should be an
          intermediate <em>blend</em> that breeds true forever. Mix red paint and white
          paint, you get pink paint, and pink paint stays pink.
        </p>
        <p className="text-sm text-stone-600 leading-relaxed">
          But you have a different hypothesis: <strong>particulate inheritance</strong>.
          You think traits are carried by discrete factors that stay distinct across
          generations, even when they seem to disappear. The two pictures of the world
          make very different predictions — and you have a garden full of peas to settle
          the question.
        </p>
      </div>

      {/* Beat 2 — Prediction panel. Commit BEFORE the cross. Accepts any
          answer. No option is annotated, styled, or ordered to signal
          correctness — each must read as plausible to a 1865 student. */}
      <div className="rounded-2xl border border-violet-200 bg-violet-50 p-6 shadow-sm space-y-3">
        <p className="text-sm font-bold text-violet-900">
          Before you run the cross — what do you predict?
        </p>
        <p className="text-sm text-violet-800 leading-relaxed">
          You're about to cross a <strong>red-flowered pea plant</strong> with a{' '}
          <strong>white-flowered pea plant</strong>, then take the offspring (F1) and
          cross them with each other to get a second generation (F2). Which of these
          do you think will happen?
        </p>
        <div className="space-y-2">
          {[
            {
              key: 'blending',
              label:
                'Blending: F1 offspring are all pink. F2 offspring are all pink too — pink breeds true.',
            },
            {
              key: 'particulate',
              label:
                'Particulate: F1 offspring are all red (or all white). In F2, red and white both reappear unchanged in a fixed ratio.',
            },
            {
              key: 'mixed',
              label:
                'Mixed: F1 is a mix of red, white, and pink in roughly equal proportions.',
            },
            {
              key: 'extinction',
              label:
                'Extinction: The white color is destroyed in the cross — all descendants are red forever.',
            },
          ].map(opt => {
            const picked = prediction === opt.key;
            return (
              <button
                key={opt.key}
                onClick={() => {
                  setPrediction(opt.key);
                  if (step < 1) setStep(1);
                }}
                className={`w-full text-left rounded-lg border-2 px-4 py-3 text-sm transition-all ${
                  picked
                    ? 'border-violet-500 bg-white text-violet-900 shadow-sm'
                    : 'border-violet-200 bg-white text-stone-700 hover:border-violet-400'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        {prediction && (
          <p className="text-xs text-violet-700 italic">
            Prediction recorded. Now run the cross and see what the peas do.
          </p>
        )}
      </div>

      {/* Beat 3 — P cross. Engine-driven red x white. Small sample (12) so
          the all-red F1 reads as obvious at a glance. */}
      {step >= 1 && (
        <CrossWorkbench
          parentA={parentRed}
          parentB={parentWhite}
          genes={[FLOWER_COLOR]}
          onCross={r => {
            setF1Result(r);
            if (step < 2) setStep(2);
          }}
          crossResult={f1Result}
          sampleSize={12}
          label="P Cross: Red × White"
        />
      )}

      {/* Observation after F1 appears. Leaves the resolution open — we have
          to run the F2 to find out whether white was destroyed or hidden. */}
      {step >= 2 && f1Result && (
        <div className="rounded-2xl border border-stone-200 bg-stone-50 p-6 shadow-sm">
          <p className="text-sm font-bold text-stone-800 mb-2">
            Wait — every F1 plant is red.
          </p>
          <p className="text-sm text-stone-700 leading-relaxed">
            The white is gone. The blending hypothesis predicted pink F1, but you see
            pure red. Was the white <em>destroyed</em>? Or is it <em>hiding</em>?
            You can't tell yet from the F1 alone. Take two of these F1 plants and cross
            them with each other — if white was destroyed, every F2 should still be red.
            If white was hidden, it should reappear.
          </p>
        </div>
      )}

      {/* Beat 4 — F1 x F1. Uses two distinct F1 siblings from the engine's
          output (both Rr), so this is a genuine Rr x Rr cross. N=40 offspring
          makes the 3:1 visually unambiguous without being overwhelming.
          Expected: 30 red / 10 white, SD ≈ 2.74 per bucket. */}
      {step >= 2 && f1Result && f1ParentA && f1ParentB && (
        <CrossWorkbench
          parentA={f1ParentA}
          parentB={f1ParentB}
          genes={[FLOWER_COLOR]}
          onCross={r => {
            setF2Result(r);
            if (step < 3) setStep(3);
          }}
          crossResult={f2Result}
          sampleSize={40}
          label="F2 Cross: F1 × F1"
        />
      )}

      {/* Discovery callout after F2. Branches the congratulations/correction
          on which prediction the student committed to in Beat 2. */}
      {step >= 3 && f2Result && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm space-y-3">
          <p className="text-sm font-bold text-emerald-900">Look at that.</p>
          <p className="text-sm text-emerald-900 leading-relaxed">
            Roughly <strong>3 red : 1 white</strong>. The white is back — pure white,
            unchanged, exactly like the original grandparent plant. It wasn't destroyed
            in the F1, it was <strong>hidden</strong>. It reappeared in about one
            quarter of the F2 offspring.
          </p>
          <p className="text-sm text-emerald-900 leading-relaxed">
            This is <strong>particulate inheritance</strong>: traits are carried by
            discrete factors that stay distinct even when they're invisible. Blending
            inheritance is wrong. This is the founding observation of genetics, and
            it's what Mendel saw in his own garden in the 1860s.
          </p>
          {prediction === 'particulate' && (
            <p className="text-sm font-semibold text-emerald-900">
              You predicted this.
            </p>
          )}
          {prediction && prediction !== 'particulate' && (
            <p className="text-sm text-emerald-800 italic">
              Your prediction was wrong — and so was the consensus of every biologist
              in 1865. That's okay. Science works by predicting, observing, and updating.
            </p>
          )}
        </div>
      )}

      {/* Beat 5 — Exit question. Hooks into Exp 1. Both the mechanistic
          answer (c) and the honest "take me to Exp 1" hook (d) are accepted;
          (a) and (b) each get specific teaching feedback. */}
      {step >= 3 && f2Result && (
        <QuestionPanel
          question="Why does white reappear in roughly 1/4 of the F2 offspring?"
          correct={exitCorrect}
          feedback={
            exitAnswer
              ? EXIT_OPTIONS.find(o => o.key === exitAnswer)?.feedback
              : undefined
          }
        >
          <div className="space-y-2">
            {EXIT_OPTIONS.map(opt => {
              const picked = exitAnswer === opt.key;
              return (
                <button
                  key={opt.key}
                  onClick={() => {
                    setExitAnswer(opt.key);
                    setExitCorrect(opt.correct);
                  }}
                  className={`w-full text-left rounded-lg border-2 px-4 py-3 text-sm font-semibold transition-all ${
                    picked
                      ? opt.correct
                        ? 'border-emerald-400 bg-emerald-50 text-emerald-900'
                        : 'border-red-300 bg-red-50 text-red-900'
                      : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </QuestionPanel>
      )}
    </div>
  );
}

// Backwards ("working backward") options for Exp 1. Given a 3:1 offspring
// ratio, which cross must have produced it? All four options are plausible
// parental combinations — students have to reason from the transmission
// rules, not spot a flagged label.
const EXP1_BACKWARD_OPTIONS = [
  {
    key: 'RR_RR',
    label: 'RR × RR',
    correct: false,
    feedback:
      'RR × RR can only contribute R alleles — every offspring would be red. Zero white. That\u2019s not 3:1.',
  },
  {
    key: 'RR_rr',
    label: 'RR × rr',
    correct: false,
    feedback:
      'RR × rr produces only Rr offspring — every offspring is red (heterozygous, but red is dominant). That\u2019s the F1 generation, not 3:1.',
  },
  {
    key: 'Rr_Rr',
    label: 'Rr × Rr',
    correct: true,
    feedback:
      'Correct. Rr × Rr is the F1 self-cross. Each parent contributes R or r with equal probability, so offspring genotype is 1 RR : 2 Rr : 1 rr → 3 red : 1 white.',
  },
  {
    key: 'Rr_rr',
    label: 'Rr × rr',
    correct: false,
    feedback:
      'Rr × rr (a test cross) gives 1 Rr : 1 rr offspring — that\u2019s 1:1 red : white, not 3:1.',
  },
] as const;

function Exp1_OneGene({ onComplete }: { onComplete: () => void }) {
  const parentRR = useMemo(() => makeOrganism({ color: ['R', 'R'] }, 'p1'), []);
  const parentrr = useMemo(() => makeOrganism({ color: ['r', 'r'] }, 'p2'), []);

  const [step, setStep] = useState(0);
  const [f1Result, setF1Result] = useState<CrossResult | null>(null);
  const [f2Result, setF2Result] = useState<CrossResult | null>(null);
  const [answer1, setAnswer1] = useState('');
  const [answer1Correct, setAnswer1Correct] = useState<boolean | null>(null);
  const [answer2, setAnswer2] = useState('');
  const [answer2Correct, setAnswer2Correct] = useState<boolean | null>(null);
  // Latched "forward-ever-correct" gate for the backward question panel.
  // Once the student has answered the forward ratio question correctly even
  // once, the backward panel must stay visible even if they re-click a wrong
  // forward option out of curiosity. This is monotonic — never reset to false.
  const [forwardEverCorrect, setForwardEverCorrect] = useState(false);
  useEffect(() => {
    if (answer2Correct === true) setForwardEverCorrect(true);
  }, [answer2Correct]);
  const [backKey, setBackKey] = useState<string | null>(null);
  const backOpt = EXP1_BACKWARD_OPTIONS.find(o => o.key === backKey) ?? null;
  const backCorrect = backOpt ? backOpt.correct : null;

  // Replicate panel (noise literacy): each entry is the red fraction of one
  // independent Rr x Rr cross of sampleSize offspring. We reuse the engine's
  // `cross()` to draw — never hand-rolled — so the variation students see is
  // the same stochastic process the main F2 panel uses.
  const [replicates, setReplicates] = useState<number[]>([]);

  const f1Child = f1Result ? f1Result.offspring[0] : null;

  const runReplicates = useCallback(() => {
    if (!f1Child) return;
    const partner = f1Result?.offspring[1] ?? f1Child;
    const SAMPLE_SIZE = 100;
    const fractions: number[] = [];
    for (let i = 0; i < 10; i++) {
      const rep = cross(f1Child, partner, [FLOWER_COLOR], SAMPLE_SIZE);
      const red = rep.phenotypeCounts['Red'] ?? 0;
      fractions.push(red / SAMPLE_SIZE);
    }
    setReplicates(fractions);
  }, [f1Child, f1Result]);

  // Auto-advance once the student answers the BACKWARD question correctly.
  // The forward ratio question is the discovery beat; the backward question
  // ("given 3:1, what must the parents have been?") is the mastery gate.
  // useEffect with cleanup — never setTimeout from a click handler.
  useEffect(() => {
    if (backCorrect === true) {
      const t = setTimeout(onComplete, 1500);
      return () => clearTimeout(t);
    }
  }, [backCorrect, onComplete]);

  return (
    <div className="space-y-6">
      <p className="text-sm text-stone-600">
        You have two parent plants: one with <strong>red flowers</strong> and one with <strong>white flowers</strong>.
        What happens when you cross them?
      </p>

      {/* Step 1: P cross */}
      <CrossWorkbench
        parentA={parentRR} parentB={parentrr} genes={[FLOWER_COLOR]}
        onCross={(r) => { setF1Result(r); setStep(1); }} crossResult={f1Result}
        sampleSize={20} label="P Cross: Red × White"
      />

      {/* Step 2: Observe F1 */}
      {step >= 1 && (
        <QuestionPanel
          question="All F1 offspring are red. What does this tell you about the inheritance of flower color?"
          correct={answer1Correct}
          feedback={answer1Correct === true
            ? "Correct! Red is dominant over white. The F1 plants carry one allele from each parent (Rr) but show the dominant phenotype."
            : answer1Correct === false
            ? "Not quite. Think about what it means that ALL offspring look like only one parent..."
            : undefined}
        >
          <div className="flex gap-2 flex-wrap">
            {['Red is dominant over white', 'Red and white blend together', 'White allele was lost'].map(opt => (
              <button key={opt} onClick={() => {
                setAnswer1(opt);
                setAnswer1Correct(opt === 'Red is dominant over white');
                if (opt === 'Red is dominant over white') setStep(2);
              }}
                className={`rounded-lg border-2 px-3 py-2 text-xs font-semibold transition-all ${
                  answer1 === opt
                    ? answer1Correct ? 'border-emerald-400 bg-emerald-50' : 'border-red-300 bg-red-50'
                    : 'border-stone-200 bg-white hover:border-stone-300'
                }`}>
                {opt}
              </button>
            ))}
          </div>
        </QuestionPanel>
      )}

      {/* Dominance molecular callout — kill the "stronger allele" misconception. */}
      {step >= 2 && (
        <div className="rounded-2xl border border-violet-200 bg-violet-50 p-6 shadow-sm">
          <p className="text-sm font-bold text-violet-900 mb-2">Why is R dominant over r?</p>
          <p className="text-sm text-violet-800 leading-relaxed">
            The <strong>R</strong> allele codes for a working enzyme that makes red pigment.
            The <strong>r</strong> allele is a broken version — it can't make pigment.
            A plant with even one R allele (Rr) makes <em>enough</em> pigment to look red.
            Dominance isn't about which allele is "stronger" or "wins" — it's about whether
            one working copy is enough to produce the phenotype.
          </p>
        </div>
      )}

      {/* Step 3: F1 × F1 */}
      {step >= 2 && f1Child && (
        <>
          <p className="text-sm text-stone-600">
            Now self-pollinate the F1 plants (cross F1 × F1). What do you predict?
          </p>
          <CrossWorkbench
            parentA={f1Child} parentB={f1Result!.offspring[1] ?? f1Child}
            genes={[FLOWER_COLOR]}
            onCross={(r) => { setF2Result(r); setStep(3); }} crossResult={f2Result}
            sampleSize={100} label="F2 Cross: F1 × F1"
          />
        </>
      )}

      {/* Step 4: Observe F2 ratio */}
      {step >= 3 && f2Result && (
        <QuestionPanel
          question="White reappears! What ratio of red to white do you observe? (Approximately)"
          correct={answer2Correct}
          feedback={answer2Correct === true
            ? "That's Mendel's famous 3:1 ratio! Each F1 parent is Rr. When two Rr plants cross: RR (red) + 2×Rr (red) + rr (white) = 3 red : 1 white. The white allele was hidden in the F1 but not lost."
            : answer2Correct === false
            ? "Count carefully — about 75% are red and 25% are white."
            : undefined}
        >
          <div className="flex gap-2 flex-wrap">
            {['1:1', '3:1', '2:1', '9:3:3:1'].map(opt => (
              <button key={opt} onClick={() => {
                setAnswer2(opt);
                setAnswer2Correct(opt === '3:1');
              }}
                className={`rounded-lg border-2 px-4 py-2 text-sm font-bold transition-all ${
                  answer2 === opt
                    ? answer2Correct ? 'border-emerald-400 bg-emerald-50' : 'border-red-300 bg-red-50'
                    : 'border-stone-200 bg-white hover:border-stone-300'
                }`}>
                {opt}
              </button>
            ))}
          </div>
        </QuestionPanel>
      )}

      {/* Phase 2 gamete visualizer — mounts AFTER the F2 ratio is on screen and
          BEFORE the noise-literacy panel. Pedagogical order: see the ratio →
          see *why* (gamete mechanism) → see that the ratio is noisy. The cross
          matches the F2 the student just ran: Rr × Rr using the same F1
          siblings as the CrossWorkbench above. */}
      {step >= 3 && f2Result && f1Child && (
        <GameteToggle
          parentA={f1Child}
          parentB={f1Result!.offspring[1] ?? f1Child}
          genes={[FLOWER_COLOR]}
          sampleSize={16}
        />
      )}

      {/* Noise literacy: replicate the F2 cross 10 times so students see sampling
          variation is normal. Reuses cross() from the engine — no hand-rolled draws.
          Each bar is the red fraction of 100 offspring from one independent Rr x Rr. */}
      {step >= 3 && f2Result && (
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <p className="text-sm font-bold text-stone-800">Is your 3:1 exact? Let's run it 10 more times.</p>
              <p className="text-xs text-stone-500 mt-1">
                Each run is another independent Rr × Rr with 100 offspring — same parents, same biology,
                different random sample.
              </p>
            </div>
            <button
              onClick={runReplicates}
              className="rounded-xl bg-gradient-to-b from-emerald-600 to-emerald-700 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:shadow-lg"
            >
              {replicates.length > 0 ? 'Run 10 more times' : 'Run this cross 10 more times'}
            </button>
          </div>

          {replicates.length > 0 && (
            <>
              {/* Compact bar plot: x = replicate index, y = red fraction 0..1.
                  Shaded band covers the textbook 3:1 zone (~0.70-0.80 red). */}
              <div className="relative rounded-xl bg-stone-50 border border-stone-200 p-4">
                <div className="relative h-40">
                  {/* 3:1 zone shaded band — 0.70 to 0.80, which spans roughly 1 SE on either
                      side of 0.75 at n=100 (SE = sqrt(.75*.25/100) = 0.043). */}
                  <div
                    className="absolute left-0 right-0 bg-emerald-100 border-y border-dashed border-emerald-300"
                    style={{ top: `${(1 - 0.80) * 100}%`, height: `${(0.80 - 0.70) * 100}%` }}
                    aria-hidden
                  />
                  {/* y-axis ticks */}
                  {[0, 0.25, 0.5, 0.75, 1].map(y => (
                    <div
                      key={y}
                      className="absolute left-0 right-0 border-t border-stone-200"
                      style={{ top: `${(1 - y) * 100}%` }}
                      aria-hidden
                    >
                      <span className="absolute -left-6 -top-2 text-[9px] text-stone-400">{(y * 100).toFixed(0)}%</span>
                    </div>
                  ))}
                  {/* Dashed line at 0.75 target */}
                  <div
                    className="absolute left-0 right-0 border-t-2 border-dashed border-emerald-500"
                    style={{ top: `${(1 - 0.75) * 100}%` }}
                    aria-hidden
                  />
                  {/* Bars */}
                  <div className="absolute inset-0 flex items-end justify-around gap-1 pl-2">
                    {replicates.map((frac, i) => (
                      <div
                        key={i}
                        className="flex flex-col items-center flex-1 max-w-[32px] group"
                        title={`Run ${i + 1}: ${(frac * 100).toFixed(0)}% red`}
                      >
                        <div
                          className="w-full rounded-t"
                          style={{
                            height: `${frac * 100}%`,
                            backgroundColor: FLOWER_COLOR.colorMap['Red'],
                          }}
                        />
                      </div>
                    ))}
                  </div>
                  {/* 0.75 target label */}
                  <span
                    className="absolute right-0 text-[10px] font-semibold text-emerald-700 bg-white/80 px-1 rounded"
                    style={{ top: `${(1 - 0.75) * 100 - 8}%` }}
                  >
                    3:1 target = 75%
                  </span>
                </div>
                <div className="mt-2 text-center text-[10px] text-stone-500">
                  10 independent replicates of Rr × Rr (100 offspring each) · y-axis: % red offspring
                </div>
              </div>
              <p className="text-xs text-stone-600 leading-relaxed">
                <strong>Every one of these is 3:1.</strong> Real experiments have sampling variation —
                72:28 is still 3:1, so is 82:18. Don't panic when your numbers aren't exact. The biology
                is the same in every run; what changes is which 100 offspring you happened to measure.
              </p>
            </>
          )}
        </div>
      )}

      {/* Backwards problem — forward asked "what ratio from Rr × Rr?"; this
          flips it to "given a 3:1, what were the parents?" Real genetics
          almost always runs in this direction: you observe offspring ratios
          and infer parental genotypes. onComplete fires from the backward
          state, not the forward one — this is the mastery gate. Gated on
          the latched `forwardEverCorrect` so re-clicking a wrong forward
          option doesn't erase progress. */}
      {forwardEverCorrect && (
        <QuestionPanel
          question="You see a 3:1 red : white ratio in offspring. What must the parents have been?"
          correct={backCorrect}
          feedback={backOpt ? backOpt.feedback : undefined}
        >
          <div
            className="text-xs font-semibold tracking-wider text-stone-500 uppercase mb-1"
            style={{ fontFamily: '"Patrick Hand", cursive' }}
          >
            Working backward
          </div>
          <div className="flex flex-col gap-2">
            {EXP1_BACKWARD_OPTIONS.map(opt => {
              const picked = backKey === opt.key;
              return (
                <button
                  key={opt.key}
                  onClick={() => setBackKey(opt.key)}
                  className={`rounded-lg border-2 px-3 py-2 text-left text-xs font-semibold transition-all ${
                    picked
                      ? opt.correct
                        ? 'border-emerald-400 bg-emerald-50'
                        : 'border-red-300 bg-red-50'
                      : 'border-stone-200 bg-white hover:border-stone-300'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </QuestionPanel>
      )}
    </div>
  );
}

// Backwards options for Exp 2 — given 1:1 and one parent is rr, what must
// the other parent be? Every option must read as a genuine guess; the
// feedback strings are where reasoning is taught.
const EXP2_BACKWARD_OPTIONS = [
  {
    key: 'RR',
    label: 'RR (homozygous red)',
    correct: false,
    feedback:
      'An RR parent contributes only R alleles. With an rr parent contributing only r, every offspring would be Rr — all red, no white. You wouldn\u2019t see 1:1.',
  },
  {
    key: 'Rr',
    label: 'Rr (heterozygous red)',
    correct: true,
    feedback:
      'Correct. An Rr parent contributes R half the time and r half the time. Crossed with rr (which contributes only r), offspring are 1/2 Rr (red) : 1/2 rr (white). That\u2019s 1:1.',
  },
  {
    key: 'rr',
    label: 'rr (homozygous white)',
    correct: false,
    feedback:
      'Two rr parents would produce only rr offspring — all white. Not 1:1.',
  },
  {
    key: 'unknown',
    label: 'Cannot tell from a 1:1 ratio',
    correct: false,
    feedback:
      'You actually can. A 1:1 ratio with one rr parent is the signature of a test cross with a heterozygote. That\u2019s what makes the test cross diagnostic.',
  },
] as const;

function Exp2_GenotypePrediction({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const [crossResult, setCrossResult] = useState<CrossResult | null>(null);
  const [answer, setAnswer] = useState('');
  const [correct, setCorrect] = useState<boolean | null>(null);
  const [done, setDone] = useState(false);
  const [backKey, setBackKey] = useState<string | null>(null);
  const backOpt = EXP2_BACKWARD_OPTIONS.find(o => o.key === backKey) ?? null;
  const backCorrect = backOpt ? backOpt.correct : null;

  const parentRr = useMemo(() => makeOrganism({ color: ['R', 'r'] }, 'Rr'), []);
  const parentrr = useMemo(() => makeOrganism({ color: ['r', 'r'] }, 'rr'), []);

  // Auto-advance once the student answers the BACKWARD question correctly.
  // The test cross result (`done`) is the discovery beat; the backward
  // question ("given 1:1 and one rr parent, what's the other?") is the
  // mastery gate. useEffect with cleanup — never setTimeout from render.
  useEffect(() => {
    if (backCorrect === true) {
      const t = setTimeout(onComplete, 1500);
      return () => clearTimeout(t);
    }
  }, [backCorrect, onComplete]);

  return (
    <div className="space-y-6">
      <p className="text-sm text-stone-600">
        You know from Experiment 2 that <strong>R</strong> is dominant over <strong>r</strong>.
        Now let's predict: if you cross a heterozygous red plant (<strong>Rr</strong>) with a white plant (<strong>rr</strong>),
        what ratio of red to white do you expect?
      </p>

      <QuestionPanel
        question="Before crossing — predict the offspring ratio:"
        correct={correct}
        feedback={correct === true
          ? "Correct! Rr × rr produces Rr (red) and rr (white) in equal proportions. Crossing against a homozygous recessive tester is one of the most powerful tools in genetics — you'll meet it again by name in Experiment 5."
          : correct === false
          ? "Think about what gametes each parent can produce. Rr makes R and r gametes; rr makes only r gametes."
          : undefined}
      >
        <div className="flex gap-2 flex-wrap">
          {['All red', '3:1 red:white', '1:1 red:white', 'All white'].map(opt => (
            <button key={opt} onClick={() => {
              setAnswer(opt);
              setCorrect(opt === '1:1 red:white');
              if (opt === '1:1 red:white') setStep(1);
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
        <>
          <p className="text-sm text-stone-600">Now verify your prediction experimentally:</p>
          <CrossWorkbench
            parentA={parentRr} parentB={parentrr} genes={[FLOWER_COLOR]}
            onCross={(r) => { setCrossResult(r); setDone(true); }}
            crossResult={crossResult}
            sampleSize={100} label="Test Cross: Rr × rr" showGenotypes
          />

          {/* Phase 2 gamete visualizer — same Rr × rr test cross the student
              just ran. Watching the heterozygote split into R and r gametes
              while the rr tester only emits r makes the 1:1 ratio mechanical
              instead of memorized. Gated on crossResult so the mechanistic
              explanation appears *after* the observation, not before. */}
          {crossResult && (
            <GameteToggle
              parentA={parentRr}
              parentB={parentrr}
              genes={[FLOWER_COLOR]}
              sampleSize={16}
            />
          )}
        </>
      )}

      {/* Law of Segregation — named callout at end of Exp 2. */}
      {crossResult && (
        <div className="rounded-2xl border border-stone-200 bg-stone-50 p-6 shadow-sm">
          <p className="text-sm font-bold text-stone-800 mb-2">
            Law of Segregation (Mendel's First Law)
          </p>
          <p className="text-sm text-stone-700 leading-relaxed">
            In diploid organisms, the two alleles at a locus separate (segregate) into
            different gametes during meiosis. Each gamete carries exactly one allele.
            When gametes fuse at fertilization, the offspring gets one allele from each
            parent.
          </p>
        </div>
      )}

      {/* Backwards problem — given a 1:1 ratio and a known rr parent, infer
          the other parent. Gated on the forward test cross having run
          (`done`). onComplete now fires from the backward state. */}
      {done && (
        <QuestionPanel
          question="You see a 1:1 red : white ratio in offspring. One parent is white (rr). What must the other parent be?"
          correct={backCorrect}
          feedback={backOpt ? backOpt.feedback : undefined}
        >
          <div
            className="text-xs font-semibold tracking-wider text-stone-500 uppercase mb-1"
            style={{ fontFamily: '"Patrick Hand", cursive' }}
          >
            Working backward
          </div>
          <div className="flex flex-col gap-2">
            {EXP2_BACKWARD_OPTIONS.map(opt => {
              const picked = backKey === opt.key;
              return (
                <button
                  key={opt.key}
                  onClick={() => setBackKey(opt.key)}
                  className={`rounded-lg border-2 px-3 py-2 text-left text-xs font-semibold transition-all ${
                    picked
                      ? opt.correct
                        ? 'border-emerald-400 bg-emerald-50'
                        : 'border-red-300 bg-red-50'
                      : 'border-stone-200 bg-white hover:border-stone-300'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </QuestionPanel>
      )}
    </div>
  );
}

// Backwards options for Exp 3 — given a 1:2:1 three-class ratio, what
// inheritance mode does this imply? Every option must feel like a
// plausible hypothesis on first read.
const EXP3_BACKWARD_OPTIONS = [
  {
    key: 'complete',
    label: 'The two alleles show classical (complete) dominance.',
    correct: false,
    feedback:
      'With complete dominance you\u2019d see 3:1 (only two phenotypes), not 1:2:1 (three phenotypes). The fact that you see three distinct phenotypes is the giveaway.',
  },
  {
    key: 'incomplete',
    label: 'The two alleles show incomplete dominance — heterozygotes have an intermediate phenotype.',
    correct: true,
    feedback:
      'Correct. The heterozygote (Rr) has its own visible phenotype — pink — distinct from both homozygotes. So genotype 1:2:1 (RR:Rr:rr) maps directly to phenotype 1:2:1 (red:pink:white). This is incomplete dominance.',
  },
  {
    key: 'linked',
    label: 'The genes are linked.',
    correct: false,
    feedback:
      'Linkage affects how often two genes are inherited together — it doesn\u2019t create a third phenotype. With one gene and two alleles you can\u2019t get linkage.',
  },
  {
    key: 'multiallele',
    label: 'There must be more than two alleles at this locus.',
    correct: false,
    feedback:
      'A third allele could in principle create a third phenotype, but you\u2019d expect different ratios. The 1:2:1 with the heterozygote between the two homozygotes is the signature of incomplete dominance, not multi-allelism.',
  },
] as const;

function Exp3_IncompleteDominance({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const [f1Result, setF1Result] = useState<CrossResult | null>(null);
  const [f2Result, setF2Result] = useState<CrossResult | null>(null);
  const [answer, setAnswer] = useState('');
  const [correct, setCorrect] = useState<boolean | null>(null);
  const [f2Answer, setF2Answer] = useState('');
  const [f2Correct, setF2Correct] = useState<boolean | null>(null);
  // Latched "forward-ever-correct" gate — see Exp 1 for rationale. Once the
  // F2 ratio is identified once, the backward panel stays visible even if
  // the student re-clicks a wrong forward option. Monotonic.
  const [forwardEverCorrect, setForwardEverCorrect] = useState(false);
  useEffect(() => {
    if (f2Correct === true) setForwardEverCorrect(true);
  }, [f2Correct]);
  const [backKey, setBackKey] = useState<string | null>(null);
  const backOpt = EXP3_BACKWARD_OPTIONS.find(o => o.key === backKey) ?? null;
  const backCorrect = backOpt ? backOpt.correct : null;

  const parentRR = useMemo(() => makeOrganism({ color_inc: ['R', 'R'] }, 'RR'), []);
  const parentrr = useMemo(() => makeOrganism({ color_inc: ['r', 'r'] }, 'rr'), []);

  const f1Child = f1Result?.offspring[0];

  // Auto-advance once the student answers the BACKWARD question correctly.
  // useEffect with cleanup — never setTimeout from a click handler.
  useEffect(() => {
    if (backCorrect === true) {
      const t = setTimeout(onComplete, 1500);
      return () => clearTimeout(t);
    }
  }, [backCorrect, onComplete]);

  return (
    <div className="space-y-6">
      <p className="text-sm text-stone-600">
        Here's a <em>different species</em> of flower — the <strong>snapdragon</strong> (<em>Antirrhinum majus</em>),
        where flower color shows a different inheritance pattern. Cross a red with a white and see what happens.
        Is the result the same as before?
      </p>

      <div className="text-[10px] font-semibold tracking-wider text-stone-400 text-center uppercase">
        Snapdragon (Antirrhinum majus)
      </div>

      <CrossWorkbench
        parentA={parentRR} parentB={parentrr} genes={[FLOWER_COLOR_INCOMPLETE]}
        onCross={(r) => { setF1Result(r); setStep(1); }} crossResult={f1Result}
        sampleSize={20} label="P Cross: Red × White (snapdragon)"
      />

      {step >= 1 && (
        <QuestionPanel
          question="The F1 are PINK — not red! How is this different from complete dominance?"
          correct={correct}
          feedback={correct === true
            ? "Exactly! This is incomplete dominance. The heterozygote Rr shows an intermediate phenotype. Neither allele fully masks the other."
            : correct === false
            ? "In complete dominance, Rr looks like RR. Here, Rr looks different from both parents..."
            : undefined}
        >
          <div className="flex gap-2 flex-wrap">
            {[
              'Neither allele is fully dominant — the heterozygote is intermediate',
              'The alleles blended permanently',
              'A new mutation occurred'
            ].map(opt => (
              <button key={opt} onClick={() => {
                setAnswer(opt);
                const isCorrect = opt.includes('intermediate');
                setCorrect(isCorrect);
                if (isCorrect) setStep(2);
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

      {step >= 2 && f1Child && (
        <>
          <p className="text-sm text-stone-600">
            Cross two F1 (pink) plants and count the three phenotypic classes that appear in the F2.
          </p>
          <CrossWorkbench
            parentA={f1Child} parentB={f1Result!.offspring[1] ?? f1Child}
            genes={[FLOWER_COLOR_INCOMPLETE]}
            onCross={(r) => { setF2Result(r); setStep(3); }} crossResult={f2Result}
            sampleSize={100} label="F2: Pink × Pink" showGenotypes
          />
        </>
      )}

      {step >= 3 && f2Result && (
        <QuestionPanel
          question="Count the three phenotypic classes in the F2. What ratio do you observe?"
          correct={f2Correct}
          feedback={f2Correct === true
            ? "The 1:2:1 ratio. With incomplete dominance, every genotype has a distinct phenotype: 1 RR (red) : 2 Rr (pink) : 1 rr (white). Allele dose maps directly onto phenotype frequency, so you can read the genotype straight off the flower color."
            : f2Correct === false
            ? "Look at the bar: roughly a quarter red, half pink, a quarter white. Which ratio does that match?"
            : undefined}
        >
          <div className="flex gap-2 flex-wrap">
            {['3:1', '1:2:1', '9:3:4', '1:1:1'].map(opt => (
              <button key={opt} onClick={() => {
                setF2Answer(opt);
                setF2Correct(opt === '1:2:1');
              }}
                className={`rounded-lg border-2 px-4 py-2 text-sm font-bold transition-all ${
                  f2Answer === opt
                    ? f2Correct ? 'border-emerald-400 bg-emerald-50' : 'border-red-300 bg-red-50'
                    : 'border-stone-200 bg-white hover:border-stone-300'
                }`}>
                {opt}
              </button>
            ))}
          </div>
        </QuestionPanel>
      )}

      {/* Backwards problem — given a 1:2:1 three-class ratio, infer
          incomplete dominance. Gated on the latched `forwardEverCorrect`
          so re-clicking a wrong forward option doesn't erase progress.
          onComplete now fires from the backward state. */}
      {forwardEverCorrect && (
        <QuestionPanel
          question="You observe a 1:2:1 ratio of three distinct phenotypes (e.g. red, pink, white) in the F2 of a self-crossed F1. What does this tell you about the inheritance of color?"
          correct={backCorrect}
          feedback={backOpt ? backOpt.feedback : undefined}
        >
          <div
            className="text-xs font-semibold tracking-wider text-stone-500 uppercase mb-1"
            style={{ fontFamily: '"Patrick Hand", cursive' }}
          >
            Working backward
          </div>
          <div className="flex flex-col gap-2">
            {EXP3_BACKWARD_OPTIONS.map(opt => {
              const picked = backKey === opt.key;
              return (
                <button
                  key={opt.key}
                  onClick={() => setBackKey(opt.key)}
                  className={`rounded-lg border-2 px-3 py-2 text-left text-xs font-semibold transition-all ${
                    picked
                      ? opt.correct
                        ? 'border-emerald-400 bg-emerald-50'
                        : 'border-red-300 bg-red-50'
                      : 'border-stone-200 bg-white hover:border-stone-300'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </QuestionPanel>
      )}
    </div>
  );
}

// Backwards options for Exp 4 — TWO variants, chosen at runtime based on
// what the student actually observed in their test cross.
//
// Variant A (whiteCount === 0): the student saw all red, so the real data
// is the "all-40-red" case. Answer: RR.
// Variant B (whiteCount > 0): the student saw at least one white offspring,
// which rules out RR entirely. Answer: Rr.
//
// Using the student's actual data (instead of a fixed hypothetical) makes
// the backward question consume the same observation the forward beat
// produced, per the "consume the student's own data" rule in CLAUDE.md.
const EXP4_BACKWARD_OPTIONS_ALLRED = [
  {
    key: 'RR',
    label: 'RR (homozygous dominant)',
    correct: true,
    feedback:
      'Correct. If the mystery plant were Rr, an Rr × rr cross would produce roughly 50% white offspring. With 40 offspring and zero white, the probability that an Rr parent gave you that result by chance is 0.5^40 ≈ 10^-12 — vanishingly small. The mystery plant must be RR.',
  },
  {
    key: 'Rr',
    label: 'Rr (heterozygous)',
    correct: false,
    feedback:
      'Possible in principle, but extraordinarily unlikely. An Rr × rr cross produces 50% white offspring on average. The chance that Rr would give you 40 reds in a row by sampling luck is 0.5^40 ≈ one in a trillion. RR is far more likely.',
  },
  {
    key: 'rr',
    label: 'rr (homozygous recessive)',
    correct: false,
    feedback:
      'An rr parent contributes only r to its gametes. Crossed with rr, every offspring would be rr — all white. You saw all red, so the mystery plant cannot be rr.',
  },
  {
    key: 'unknown',
    label: 'Cannot tell from this data.',
    correct: false,
    feedback:
      'You actually can. With 40 offspring all red and zero white, the math heavily favors RR over Rr (a million-million to one). That\u2019s high enough confidence to call it.',
  },
] as const;

const EXP4_BACKWARD_OPTIONS_SOMEWHITE = [
  {
    key: 'RR',
    label: 'RR (homozygous dominant)',
    correct: false,
    feedback:
      'An RR parent can only contribute R alleles. Crossed with rr (which only contributes r), every offspring would be Rr — red. The moment you see even one white (rr) offspring, RR is ruled out: an RR parent literally cannot produce an rr offspring.',
  },
  {
    key: 'Rr',
    label: 'Rr (heterozygous)',
    correct: true,
    feedback:
      'Correct. An Rr parent contributes R half the time and r half the time. Crossed with rr (which only contributes r), the offspring are roughly 1/2 Rr (red) : 1/2 rr (white) — exactly what you observed. The presence of any white offspring is the smoking gun for a heterozygous mystery parent.',
  },
  {
    key: 'rr',
    label: 'rr (homozygous recessive)',
    correct: false,
    feedback:
      'An rr parent would contribute only r. Crossed with rr, every offspring would be rr — all white. You saw red offspring too, so the mystery plant cannot be rr.',
  },
  {
    key: 'unknown',
    label: 'Cannot tell from this data.',
    correct: false,
    feedback:
      'You actually can. The presence of even one white (rr) offspring means the mystery parent contributed an r allele — so it must carry at least one r. Combined with its red phenotype (which requires at least one R), the mystery plant must be Rr.',
  },
] as const;

// Exp 4 option keys and their per-option teaching feedback.
// Each option reads as plausible at first glance; the feedback prose is where
// the teaching happens. No option is annotated as "correct" in its label —
// the student has to reason from the factual genotype to gamete contribution.
const EXP4_OPTIONS = [
  {
    key: 'unknown_red',
    label: 'Another red plant (genotype unknown)',
    correct: false,
    feedback:
      "You don't know the other plant's genotype either — any offspring ratio you see could come from many combinations (RR × RR, RR × Rr, Rr × Rr all give mostly-red broods). To diagnose the mystery plant you need a tester whose genotype is already known.",
  },
  {
    key: 'rr_dominant',
    label: 'A red plant confirmed to be RR',
    correct: false,
    feedback:
      'An RR parent contributes an R allele to every gamete. Your mystery plant is either RR or Rr — in both cases, every offspring inherits at least one R from the tester, so every offspring is red. The cross can never distinguish the two possibilities: you get the same all-red brood either way.',
  },
  {
    key: 'rr_hetero',
    label: 'A red plant confirmed to be Rr',
    correct: false,
    feedback:
      "An Rr tester gives 50% R and 50% r gametes. If the mystery plant is RR, you'd see all red offspring. If it's Rr, you'd see roughly 3:1 red to white. That almost works — but any red offspring in the 3:1 case is still ambiguous (RR or Rr?), and the 3:1 vs all-red distinction leans on sampling variation. There's a cleaner tester that removes the ambiguity entirely.",
  },
  {
    key: 'white',
    label: 'A white plant (rr)',
    correct: true,
    feedback:
      "Exactly. An rr tester contributes only r to every gamete, so each offspring's phenotype is determined entirely by what the mystery plant contributed. Red offspring → mystery plant gave R. White offspring → mystery plant gave r. If you see even one white offspring, the mystery plant must carry at least one r allele and is therefore Rr. If every offspring is red, the mystery plant must be RR. A clean, unambiguous diagnostic.",
  },
] as const;

function Exp4_TestCross({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [crossResult, setCrossResult] = useState<CrossResult | null>(null);
  const [backKey, setBackKey] = useState<string | null>(null);

  // Mystery plant — randomized once at mount, could be RR (homozygous) or Rr (heterozygous).
  // useState lazy initializer guarantees this runs exactly once for the lifetime of the component.
  // DO NOT hardcode — the conditional conclusion below depends on this being genuinely random
  // so students can't memorize a fixed "answer".
  const [mystery] = useState(() => {
    const isHomozygous = Math.random() < 0.5;
    return makeOrganism(
      { color: isHomozygous ? ['R', 'R'] : ['R', 'r'] },
      'mystery',
    );
  });
  const tester = useMemo(() => makeOrganism({ color: ['r', 'r'] }, 'tester'), []);

  const selected = EXP4_OPTIONS.find(o => o.key === selectedKey) ?? null;
  const selectedCorrect = selected ? selected.correct : null;
  const whiteCount = crossResult?.phenotypeCounts?.['White'] ?? 0;
  // Derive the mystery plant's true genotype from its stored alleles — never
  // from a separate state variable that could drift out of sync.
  const mysteryAlleles = mystery.genotype.color;
  const mysteryIsHetero = mysteryAlleles[0] !== mysteryAlleles[1];
  const mysteryGenotypeLabel = mysteryIsHetero ? 'Rr' : 'RR';

  // Backward-question variant is chosen by what the student actually
  // observed: if they saw any white offspring, the data rules out RR and
  // the correct answer is Rr; if every offspring was red, the data makes
  // RR overwhelmingly likely. Consuming the student's own observation
  // here avoids the "suppose…" hypothetical and aligns with the
  // "consume the student's own data" rule in CLAUDE.md.
  const sawWhite = whiteCount > 0;
  const backOptions = sawWhite
    ? EXP4_BACKWARD_OPTIONS_SOMEWHITE
    : EXP4_BACKWARD_OPTIONS_ALLRED;
  const backOpt = backOptions.find(o => o.key === backKey) ?? null;
  const backCorrect = backOpt ? backOpt.correct : null;

  // Auto-advance once the student answers the BACKWARD question correctly.
  // The forward beats (picking the informative cross + running it) are
  // discovery; the backward question (grounded in the student's actual
  // observed offspring) is the mastery gate. useEffect with cleanup —
  // never setTimeout from a click handler.
  useEffect(() => {
    if (backCorrect === true) {
      const t = setTimeout(() => onComplete(), 1500);
      return () => clearTimeout(t);
    }
  }, [backCorrect, onComplete]);

  // Reset the backward selection when the student changes which branch
  // they're in (e.g. after a re-run). A key picked from the other variant
  // would otherwise look like an already-answered question.
  useEffect(() => {
    setBackKey(null);
  }, [sawWhite]);

  return (
    <div className="space-y-6">
      {/* Beat 1 — setup */}
      <p className="text-sm text-stone-600">
        You have a red-flowered plant. By eye it looks exactly like any other red plant, but its genotype could
        be <strong>RR</strong> (homozygous dominant) or <strong>Rr</strong> (heterozygous) — the dominant red
        phenotype hides the difference. Your task: design a cross whose result will tell you which.
      </p>

      {/* Beat 2 — informative-cross selection (the reasoning puzzle) */}
      <QuestionPanel
        question="Which plant should you cross the mystery red with to reveal its genotype?"
        correct={selectedCorrect}
        feedback={selected ? selected.feedback : undefined}
      >
        <div className="flex flex-col gap-2">
          {EXP4_OPTIONS.map(opt => {
            const isSelected = selectedKey === opt.key;
            const borderClass = isSelected
              ? opt.correct
                ? 'border-emerald-400 bg-emerald-50'
                : 'border-red-300 bg-red-50'
              : 'border-stone-200 bg-white hover:border-stone-300';
            return (
              <button
                key={opt.key}
                onClick={() => {
                  setSelectedKey(opt.key);
                  if (opt.correct && step < 2) setStep(2);
                }}
                className={`rounded-lg border-2 px-3 py-2 text-left text-xs font-semibold transition-all ${borderClass}`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </QuestionPanel>

      {/* Beat 3 — run the cross, only after correct choice. The mystery plant's
          genotype is NOT yet revealed in prose — the student should infer it from
          the observed offspring in Beat 4, not read it off a label. */}
      {step >= 2 && (
        <>
          <p className="text-sm text-stone-600">
            Cross the mystery red plant with a white (<strong>rr</strong>) tester and see what the
            offspring reveal.
          </p>
          <CrossWorkbench
            parentA={mystery} parentB={tester} genes={[FLOWER_COLOR]}
            onCross={(r) => { setCrossResult(r); setStep(3); }} crossResult={crossResult}
            sampleSize={40} label="Test Cross: Mystery Red × White (rr)"
          />
        </>
      )}

      {/* Beat 4 — conditional conclusion driven by observed offspring (not genotype).
          whiteCount is read from crossResult.phenotypeCounts['White'], so the text
          always reflects what the student actually saw on screen. */}
      {step >= 3 && crossResult && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm text-sm text-emerald-800 space-y-2">
          {whiteCount > 0 ? (
            <>
              <p>
                <strong>White offspring appeared</strong> ({whiteCount} of {crossResult.total}).
                Only an Rr plant crossed with rr can produce rr (white) offspring, so the mystery plant
                must be <strong>Rr</strong> — heterozygous. The dominant red phenotype was hiding a
                heterozygous genotype.
              </p>
              <p>
                If it were RR, it could only contribute R alleles, so every offspring would be Rr (red).
                Since we see rr offspring, the mystery parent must have contributed an r allele.
              </p>
              <p className="text-xs text-emerald-700">
                (Confirming: the mystery plant's true genotype was <strong>{mysteryGenotypeLabel}</strong>.)
              </p>
            </>
          ) : (
            <>
              <p>
                <strong>No white offspring appeared.</strong> All {crossResult.total} offspring are red.
                If the mystery plant were Rr, about half of the offspring would be white (rr) — and with
                {' '}{crossResult.total} offspring the probability of seeing zero white by chance is
                essentially zero. So the mystery plant must be <strong>RR</strong> — homozygous dominant.
              </p>
              <p>
                An RR parent can only contribute R alleles, so every offspring is Rr and red. The absence
                of any white offspring is the evidence.
              </p>
              <p className="text-xs text-emerald-700">
                (Confirming: the mystery plant's true genotype was <strong>{mysteryGenotypeLabel}</strong>.)
              </p>
            </>
          )}
        </div>
      )}

      {/* Beat 5 — name the technique (stone-neutral callout, matching Exp 2 / Exp 5 law callouts) */}
      {step >= 3 && crossResult && (
        <div className="rounded-2xl border border-stone-200 bg-stone-50 p-6 shadow-sm">
          <p className="text-sm font-bold text-stone-800 mb-2">Test cross</p>
          <p className="text-sm text-stone-700 leading-relaxed">
            Crossing an individual of unknown genotype with a <strong>homozygous recessive tester</strong>.
            The tester contributes only recessive alleles to every gamete, so each offspring's phenotype
            directly reveals what the unknown individual contributed. It is one of the most powerful
            diagnostic tools in classical genetics — used to infer genotype from phenotype without
            sequencing.
          </p>
        </div>
      )}

      {/* Backwards problem — question text and option set both branch on
          the student's own observed data (whiteCount). If they saw white
          offspring, the correct answer is Rr; if they saw all red, the
          correct answer is RR. Gated on the forward test cross having
          completed; step-based gating is already monotonic (step only
          increases, crossResult only gets set), so no separate latch is
          needed here. onComplete fires from the backward state. */}
      {step >= 3 && crossResult && (
        <QuestionPanel
          question={
            sawWhite
              ? `You did a test cross (mystery × rr) and saw ${whiteCount} white offspring out of ${crossResult.total}. What's the most likely genotype of the mystery plant?`
              : `You did a test cross (mystery × rr) and saw all ${crossResult.total} offspring red — zero white. What's the most likely genotype of the mystery plant?`
          }
          correct={backCorrect}
          feedback={backOpt ? backOpt.feedback : undefined}
        >
          <div
            className="text-xs font-semibold tracking-wider text-stone-500 uppercase mb-1"
            style={{ fontFamily: '"Patrick Hand", cursive' }}
          >
            Working backward
          </div>
          <div className="flex flex-col gap-2">
            {backOptions.map(opt => {
              const picked = backKey === opt.key;
              return (
                <button
                  key={opt.key}
                  onClick={() => setBackKey(opt.key)}
                  className={`rounded-lg border-2 px-3 py-2 text-left text-xs font-semibold transition-all ${
                    picked
                      ? opt.correct
                        ? 'border-emerald-400 bg-emerald-50'
                        : 'border-red-300 bg-red-50'
                      : 'border-stone-200 bg-white hover:border-stone-300'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </QuestionPanel>
      )}
    </div>
  );
}

// Backwards options for Exp 5 — given a 9:3:3:1 ratio, what does it tell
// you about parental genotypes and gene arrangement?
const EXP5_BACKWARD_OPTIONS = [
  {
    key: 'dihybrid_unlinked',
    label: 'Both parents are dihybrid (heterozygous for both genes), AND the two genes are unlinked.',
    correct: true,
    feedback:
      'Correct. 9:3:3:1 is the signature of two heterozygous parents whose genes assort independently. If the genes were linked, parental combinations would be over-represented and the ratio would be skewed.',
  },
  {
    key: 'dihybrid_eitherway',
    label: 'Both parents are dihybrid, but the genes might be linked or unlinked — you can\u2019t tell from this ratio.',
    correct: false,
    feedback:
      'Linkage actually distorts the 9:3:3:1 ratio — closely linked genes give more parental combinations than recombinants, which shifts the proportions. Seeing exactly 9:3:3:1 is positive evidence for unlinked genes.',
  },
  {
    key: 'testcross',
    label: 'One parent is dihybrid, the other is homozygous recessive for both genes.',
    correct: false,
    feedback:
      'A dihybrid × homozygous-recessive test cross gives 1:1:1:1, not 9:3:3:1. The 9:3:3:1 ratio specifically requires both parents to contribute four kinds of gametes (RS, Rs, rS, rs for each gene), which only happens when both are dihybrid.',
  },
  {
    key: 'tight_linkage',
    label: 'The genes are on the same chromosome, very close together.',
    correct: false,
    feedback:
      'Tightly linked genes would give fewer recombinant phenotypes than expected, distorting the ratio away from 9:3:3:1. Seeing the textbook 9:3:3:1 is evidence the genes are not tightly linked.',
  },
] as const;

function Exp5_TwoGenes({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const [f1Result, setF1Result] = useState<CrossResult | null>(null);
  const [f2Result, setF2Result] = useState<CrossResult | null>(null);
  const [answer, setAnswer] = useState('');
  const [correct, setCorrect] = useState<boolean | null>(null);
  const [linkAnswer, setLinkAnswer] = useState('');
  const [linkCorrect, setLinkCorrect] = useState<boolean | null>(null);
  // Latched "forward-ever-correct" gate for the Law of Independent Assortment
  // callout, linkage tease, and backward problem. Once the student picks
  // 9:3:3:1 correctly, these panels must stay visible even if they click a
  // wrong forward option afterwards. Monotonic — never reset to false.
  const [forwardEverCorrect, setForwardEverCorrect] = useState(false);
  useEffect(() => {
    if (correct === true) setForwardEverCorrect(true);
  }, [correct]);
  const [backKey, setBackKey] = useState<string | null>(null);
  const backOpt = EXP5_BACKWARD_OPTIONS.find(o => o.key === backKey) ?? null;
  const backCorrect = backOpt ? backOpt.correct : null;

  const parentAABB = useMemo(() => makeOrganism({ color: ['R', 'R'], shape: ['S', 'S'] }, 'RRSS'), []);
  const parentaabb = useMemo(() => makeOrganism({ color: ['r', 'r'], shape: ['s', 's'] }, 'rrss'), []);

  const f1Child = f1Result?.offspring[0];

  // Auto-advance once the student answers the BACKWARD question correctly.
  // The forward ratio + linkage tease are discovery; the backward
  // question ("given 9:3:3:1, what must the parents / arrangement be?")
  // is the mastery gate. useEffect with cleanup — never setTimeout from
  // render.
  useEffect(() => {
    if (backCorrect === true) {
      const t = setTimeout(onComplete, 1500);
      return () => clearTimeout(t);
    }
  }, [backCorrect, onComplete]);

  return (
    <div className="space-y-6">
      <p className="text-sm text-stone-600">
        Now we track <strong>two genes at once</strong>: flower color (Rr) and seed shape (Ss, where S = Round is dominant).
        We'll write the dihybrid genotype with a space — <strong>Rr Ss</strong> — to keep the two genes visually distinct.
        Cross a <strong>Red/Round</strong> plant with a <strong>White/Wrinkled</strong> plant.
      </p>

      <CrossWorkbench
        parentA={parentAABB} parentB={parentaabb} genes={[FLOWER_COLOR, SEED_SHAPE]}
        onCross={(r) => { setF1Result(r); setStep(1); }} crossResult={f1Result}
        sampleSize={20} label="P Cross: Red-Round × White-Wrinkled"
      />

      {step >= 1 && f1Child && (
        <>
          <p className="text-sm text-stone-600">
            All F1 are Red/Round (as expected — both dominant). Now cross two F1 plants.
            With <strong>two genes segregating</strong>, how many phenotypic classes do you predict?
          </p>

          {/* Derivation of 9:3:3:1 from (3:1) x (3:1) — before the F2 cross runs. */}
          <div className="rounded-2xl border border-violet-200 bg-violet-50 p-6 shadow-sm space-y-4">
            <p className="text-sm font-bold text-violet-900">Before you run the cross — predict the ratio from first principles.</p>
            <p className="text-sm text-violet-800 leading-relaxed">
              Each F1 parent is <strong>Rr Ss</strong>. Think about one gene at a time:
            </p>
            <ul className="text-sm text-violet-800 list-disc ml-5 space-y-1">
              <li>Gene 1 (flower color) Rr × Rr gives <strong>3 red : 1 white</strong> — so P(red) = 3/4, P(white) = 1/4.</li>
              <li>Gene 2 (seed shape) Ss × Ss gives <strong>3 round : 1 wrinkled</strong> — so P(round) = 3/4, P(wrinkled) = 1/4.</li>
            </ul>
            <p className="text-sm text-violet-800 leading-relaxed">
              If the two genes are <strong>independent</strong>, the probability of any combination is just the
              product of the individual probabilities. Multiply across the 2×2 grid:
            </p>

            {/* 2x2 probability grid — phenotype colors looked up deterministically by label. */}
            <div className="rounded-xl bg-white border border-violet-200 p-3">
              <div className="grid grid-cols-[auto_1fr_1fr] gap-2 text-xs">
                <div />
                <div className="text-center font-semibold text-violet-900">Round (3/4)</div>
                <div className="text-center font-semibold text-violet-900">Wrinkled (1/4)</div>

                <div className="flex items-center justify-end font-semibold text-violet-900 pr-2">Red (3/4)</div>
                <div className="rounded-lg border border-stone-200 p-2 flex flex-col items-center gap-1">
                  <div className="flex gap-1">
                    <span className="inline-block w-3 h-3 rounded-sm border border-stone-200" style={{ backgroundColor: FLOWER_COLOR.colorMap['Red'] }} />
                    <span className="inline-block w-3 h-3 rounded-sm border border-stone-200" style={{ backgroundColor: SEED_SHAPE.colorMap['Round'] }} />
                  </div>
                  <div className="text-[10px] font-semibold text-stone-700">Red, Round</div>
                  <div className="text-[11px] font-bold text-violet-900">3/4 × 3/4 = 9/16</div>
                </div>
                <div className="rounded-lg border border-stone-200 p-2 flex flex-col items-center gap-1">
                  <div className="flex gap-1">
                    <span className="inline-block w-3 h-3 rounded-sm border border-stone-200" style={{ backgroundColor: FLOWER_COLOR.colorMap['Red'] }} />
                    <span className="inline-block w-3 h-3 rounded-sm border border-stone-200" style={{ backgroundColor: SEED_SHAPE.colorMap['Wrinkled'] }} />
                  </div>
                  <div className="text-[10px] font-semibold text-stone-700">Red, Wrinkled</div>
                  <div className="text-[11px] font-bold text-violet-900">3/4 × 1/4 = 3/16</div>
                </div>

                <div className="flex items-center justify-end font-semibold text-violet-900 pr-2">White (1/4)</div>
                <div className="rounded-lg border border-stone-200 p-2 flex flex-col items-center gap-1">
                  <div className="flex gap-1">
                    <span className="inline-block w-3 h-3 rounded-sm border border-stone-200" style={{ backgroundColor: FLOWER_COLOR.colorMap['White'] }} />
                    <span className="inline-block w-3 h-3 rounded-sm border border-stone-200" style={{ backgroundColor: SEED_SHAPE.colorMap['Round'] }} />
                  </div>
                  <div className="text-[10px] font-semibold text-stone-700">White, Round</div>
                  <div className="text-[11px] font-bold text-violet-900">1/4 × 3/4 = 3/16</div>
                </div>
                <div className="rounded-lg border border-stone-200 p-2 flex flex-col items-center gap-1">
                  <div className="flex gap-1">
                    <span className="inline-block w-3 h-3 rounded-sm border border-stone-200" style={{ backgroundColor: FLOWER_COLOR.colorMap['White'] }} />
                    <span className="inline-block w-3 h-3 rounded-sm border border-stone-200" style={{ backgroundColor: SEED_SHAPE.colorMap['Wrinkled'] }} />
                  </div>
                  <div className="text-[10px] font-semibold text-stone-700">White, Wrinkled</div>
                  <div className="text-[11px] font-bold text-violet-900">1/4 × 1/4 = 1/16</div>
                </div>
              </div>
            </div>

            <p className="text-sm text-violet-900 font-semibold">
              Predicted ratio: 9 : 3 : 3 : 1. Now run the cross and see if the data agree.
            </p>
          </div>

          <CrossWorkbench
            parentA={f1Child} parentB={f1Result!.offspring[1] ?? f1Child}
            genes={[FLOWER_COLOR, SEED_SHAPE]}
            onCross={(r) => { setF2Result(r); setStep(2); }} crossResult={f2Result}
            sampleSize={200} label="F2: Dihybrid F1 × F1"
          />
        </>
      )}

      {/* Phase 2 gamete visualizer — dihybrid Rr Ss × Rr Ss. Two-gene mount:
          the component enumerates 2^2 = 4 possible gametes per parent and the
          Punnett view renders a 4×4 grid. Flow: derivation grid (predict) →
          F2 CrossWorkbench (observe) → gamete mechanism (see why). */}
      {step >= 2 && f2Result && f1Child && (
        <GameteToggle
          parentA={f1Child}
          parentB={f1Result!.offspring[1] ?? f1Child}
          genes={[FLOWER_COLOR, SEED_SHAPE]}
          sampleSize={16}
        />
      )}

      {step >= 2 && f2Result && (
        <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-6 shadow-sm">
          <p className="text-sm font-bold text-emerald-900">You just derived the Law of Independent Assortment.</p>
          <p className="text-sm text-emerald-800 leading-relaxed mt-1">
            The bars above match the 9:3:3:1 you predicted by multiplying (3:1) × (3:1). You didn't
            memorize this ratio — you built it from the product rule applied to two independent
            monohybrid segregations.
          </p>
        </div>
      )}

      {step >= 2 && f2Result && (
        <QuestionPanel
          question="What ratio do you observe? Count the four phenotypic classes."
          correct={correct}
          feedback={correct === true
            ? "The 9:3:3:1 ratio! This proves the two genes assort INDEPENDENTLY — knowing the color allele tells you nothing about the shape allele. This is Mendel's Law of Independent Assortment."
            : correct === false
            ? "Look at the four classes: Red-Round, Red-Wrinkled, White-Round, White-Wrinkled. What ratio are they in?"
            : undefined}
        >
          <div className="flex gap-2 flex-wrap">
            {['3:1', '1:1:1:1', '9:3:3:1', '12:3:1'].map(opt => (
              <button key={opt} onClick={() => {
                setAnswer(opt);
                const isCorrect = opt === '9:3:3:1';
                setCorrect(isCorrect);
              }}
                className={`rounded-lg border-2 px-4 py-2 text-sm font-bold transition-all ${
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

      {/* Law of Independent Assortment — named callout + warning that the law can break. */}
      {forwardEverCorrect && (
        <>
          <div className="rounded-2xl border border-stone-200 bg-stone-50 p-6 shadow-sm space-y-3">
            <p className="text-sm font-bold text-stone-800">
              Law of Independent Assortment (Mendel's Second Law)
            </p>
            <p className="text-sm text-stone-700 leading-relaxed">
              When two (or more) genes are on <em>different chromosomes</em>, their alleles segregate
              into gametes independently. This is why dihybrid crosses give 9:3:3:1 instead of 3:1.
            </p>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm text-amber-900">
                <strong>⚠ This law can break.</strong> When two genes are close together on the same
                chromosome, they tend to travel together in gametes — this is called <strong>linkage</strong>,
                and the 9:3:3:1 ratio is distorted.{' '}
                <a
                  href="/breeding-game/linkage.html"
                  className="font-bold text-emerald-700 hover:text-emerald-800 underline"
                >
                  Find out in the Linkage module →
                </a>
              </p>
            </div>
          </div>

          {/* Linkage tease question — all four options must read as plausible; no telegraphs. */}
          <QuestionPanel
            question="Mendel's 7 traits were all on different chromosomes — he got lucky. What do you think would happen if the color gene and the shape gene were right next to each other on the same chromosome?"
            correct={linkCorrect}
            feedback={linkCorrect !== null
              ? "Find out for yourself in the Linkage module →"
              : undefined}
          >
            <div className="flex gap-2 flex-wrap flex-col">
              {[
                'The same 9:3:3:1 ratio would still appear.',
                'The parental combinations would be over-represented, not 9:3:3:1.',
                'All offspring would be the same.',
                'The genes would fail to assort at all.',
              ].map(opt => (
                <button
                  key={opt}
                  onClick={() => {
                    setLinkAnswer(opt);
                    setLinkCorrect(opt === 'The parental combinations would be over-represented, not 9:3:3:1.');
                  }}
                  className={`rounded-lg border-2 px-3 py-2 text-xs font-semibold text-left transition-all ${
                    linkAnswer === opt
                      ? linkCorrect ? 'border-emerald-400 bg-emerald-50' : 'border-red-300 bg-red-50'
                      : 'border-stone-200 bg-white hover:border-stone-300'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
            {linkCorrect !== null && (
              <a
                href="/breeding-game/linkage.html"
                className="block mt-3 rounded-xl bg-gradient-to-b from-emerald-600 to-emerald-700 px-5 py-3 text-center text-sm font-bold text-white shadow-md hover:shadow-lg"
              >
                Open the Linkage module →
              </a>
            )}
          </QuestionPanel>
        </>
      )}

      {/* Backwards problem — given a 9:3:3:1 ratio, infer both parental
          genotypes AND the (un)linked arrangement. Gated on the latched
          `forwardEverCorrect` so re-clicking a wrong forward option doesn't
          erase progress. onComplete now fires from the backward state. */}
      {forwardEverCorrect && (
        <QuestionPanel
          question="You observe a 9:3:3:1 ratio in the offspring of a cross. What does this tell you about the parents and the genes?"
          correct={backCorrect}
          feedback={backOpt ? backOpt.feedback : undefined}
        >
          <div
            className="text-xs font-semibold tracking-wider text-stone-500 uppercase mb-1"
            style={{ fontFamily: '"Patrick Hand", cursive' }}
          >
            Working backward
          </div>
          <div className="flex flex-col gap-2">
            {EXP5_BACKWARD_OPTIONS.map(opt => {
              const picked = backKey === opt.key;
              return (
                <button
                  key={opt.key}
                  onClick={() => setBackKey(opt.key)}
                  className={`rounded-lg border-2 px-3 py-2 text-left text-xs font-semibold transition-all ${
                    picked
                      ? opt.correct
                        ? 'border-emerald-400 bg-emerald-50'
                        : 'border-red-300 bg-red-50'
                      : 'border-stone-200 bg-white hover:border-stone-300'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </QuestionPanel>
      )}
    </div>
  );
}

// Backwards options for Exp 6 — given 9:3:4, what does it tell you about
// gene interaction? Uses the maize aleurone labels the forward experiment
// teaches: Purple (R_C_) / Red (rrC_) / Colorless (anything cc).
const EXP6_BACKWARD_OPTIONS = [
  {
    key: 'recessive_epistasis',
    label: 'Two genes assort independently and there is recessive epistasis: one gene\u2019s recessive homozygote (cc) masks the other gene\u2019s effect entirely.',
    correct: true,
    feedback:
      'Correct. The 9:3:4 ratio is the signature of recessive epistasis. Without the C gene\u2019s product (when cc), the R gene can\u2019t produce its colored pigment — so all cc offspring (3+1 of the 16 = 4) are colorless regardless of R/r genotype. Purple = R_C_ (9), red = rrC_ (3), colorless = anything-cc (4).',
  },
  {
    key: 'linked',
    label: 'The two genes are linked.',
    correct: false,
    feedback:
      'Linkage would distort the ratio away from a clean 16-part split. The 9:3:4 still adds to 16, so it\u2019s still independent assortment — what changed is that two of the four phenotype classes (colorless from R_cc and rrcc) collapsed into one because of recessive epistasis.',
  },
  {
    key: 'incomplete',
    label: 'There\u2019s incomplete dominance at one of the loci.',
    correct: false,
    feedback:
      'Incomplete dominance affects a single gene\u2019s heterozygotes — it would create a third intermediate phenotype like pink. Epistasis is about one gene masking another gene\u2019s effect, which is what 9:3:4 tells you.',
  },
  {
    key: 'noise',
    label: 'The colorless class is a sampling artifact.',
    correct: false,
    feedback:
      'Nope — the colorless class is exactly 4/16 = 25% of offspring, which is far too consistent to be sampling noise. It\u2019s a real biological signal.',
  },
] as const;

function Exp6_Epistasis({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const [f2Result, setF2Result] = useState<CrossResult | null>(null);
  const [answer, setAnswer] = useState('');
  const [correct, setCorrect] = useState<boolean | null>(null);
  // Latched "forward-ever-correct" gate for the backward problem. Once the
  // student identifies 9:3:4 once, the backward panel must stay visible
  // even if they re-click a wrong forward option. Monotonic.
  const [forwardEverCorrect, setForwardEverCorrect] = useState(false);
  useEffect(() => {
    if (correct === true) setForwardEverCorrect(true);
  }, [correct]);
  const [backKey, setBackKey] = useState<string | null>(null);
  const backOpt = EXP6_BACKWARD_OPTIONS.find(o => o.key === backKey) ?? null;
  const backCorrect = backOpt ? backOpt.correct : null;

  // Auto-advance once the student answers the BACKWARD question correctly.
  // The forward 9:3:4 ratio answer is the discovery beat; the backward
  // question ("what does 9:3:4 tell you about the genes?") is the mastery
  // gate. useEffect with cleanup — never setTimeout from a click handler.
  useEffect(() => {
    if (backCorrect === true) {
      const t = setTimeout(onComplete, 1500);
      return () => clearTimeout(t);
    }
  }, [backCorrect, onComplete]);

  // F1 dihybrid for maize aleurone color: Cc Rr × Cc Rr.
  // Use the gene objects' id fields directly so this stays consistent if the engine renames them.
  const f1 = useMemo(
    () => makeOrganism(
      {
        [PIGMENT_GENE.id]: [PIGMENT_GENE.alleles[0], PIGMENT_GENE.alleles[1]],
        [AGOUTI_GENE.id]: [AGOUTI_GENE.alleles[0], AGOUTI_GENE.alleles[1]],
      },
      'F1',
    ),
    [],
  );

  return (
    <div className="space-y-6">
      <p className="text-sm text-stone-600">
        In maize kernels, the color of the <strong>aleurone</strong> (the outer pigmented layer of the seed) depends on
        <strong> two interacting genes</strong>:
      </p>
      <ul className="text-sm text-stone-600 list-disc ml-5 space-y-1">
        <li><strong>Gene C</strong>: controls whether <em>any</em> pigment is deposited at all (C = colored, c = colorless).</li>
        <li><strong>Gene R</strong>: controls <em>which</em> pigment forms when C is present (R = purple anthocyanin, r = red).</li>
      </ul>
      <p className="text-sm text-stone-600">
        Here's the catch: a <strong>cc</strong> kernel is always colorless, regardless of the R gene — without C
        there is no precursor for R to act on. This is <strong>epistasis</strong>: the recessive cc genotype
        <em> masks</em> whatever the R gene would otherwise produce.
      </p>

      <p className="text-sm text-stone-600">
        Cross two F1 kernels (both <strong>Cc Rr</strong>). A vanilla dihybrid would give 9:3:3:1, but with cc masking R
        the ratio is modified. Count the classes and decide what you see.
      </p>

      <CrossWorkbench
        parentA={f1} parentB={f1} genes={[PIGMENT_GENE, AGOUTI_GENE]}
        onCross={(r) => { setF2Result(r); setStep(1); }} crossResult={f2Result}
        sampleSize={800} label="F2: Cc Rr × Cc Rr" epistasis
      />

      {step >= 1 && f2Result && (
        <QuestionPanel
          question="Count the phenotypic classes on the bar. Which ratio fits the observed counts?"
          correct={correct}
          feedback={correct === true
            ? "9 purple : 3 red : 4 colorless. The colorless class (4) absorbs what would have been two separate classes in a normal dihybrid (3 ccR_ + 1 ccrr), because cc is epistatic to R. Without the C-encoded precursor, the R gene's effect is invisible. This is recessive epistasis."
            : correct === false
            ? "Three classes appear: purple, red, and colorless. The colorless class is bigger than you'd expect from a vanilla dihybrid — what ratio does that point to?"
            : undefined}
        >
          <div className="flex gap-2 flex-wrap">
            {['9:3:3:1', '9:3:4', '12:3:1', '15:1'].map(opt => (
              <button key={opt} onClick={() => {
                setAnswer(opt);
                setCorrect(opt === '9:3:4');
              }}
                className={`rounded-lg border-2 px-4 py-2 text-sm font-bold transition-all ${
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

      {/* Backwards problem — given a 9:3:4 ratio (9 purple : 3 red : 4
          colorless), infer recessive epistasis. Gated on the latched
          `forwardEverCorrect` so re-clicking a wrong forward option
          doesn't erase progress. onComplete now fires from the backward
          state. */}
      {forwardEverCorrect && (
        <QuestionPanel
          question="You observe a 9 purple : 3 red : 4 colorless ratio in F2. What does this tell you?"
          correct={backCorrect}
          feedback={backOpt ? backOpt.feedback : undefined}
        >
          <div
            className="text-xs font-semibold tracking-wider text-stone-500 uppercase mb-1"
            style={{ fontFamily: '"Patrick Hand", cursive' }}
          >
            Working backward
          </div>
          <div className="flex flex-col gap-2">
            {EXP6_BACKWARD_OPTIONS.map(opt => {
              const picked = backKey === opt.key;
              return (
                <button
                  key={opt.key}
                  onClick={() => setBackKey(opt.key)}
                  className={`rounded-lg border-2 px-3 py-2 text-left text-xs font-semibold transition-all ${
                    picked
                      ? opt.correct
                        ? 'border-emerald-400 bg-emerald-50'
                        : 'border-red-300 bg-red-50'
                      : 'border-stone-200 bg-white hover:border-stone-300'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </QuestionPanel>
      )}
    </div>
  );
}

// Backwards options for Exp 7 — given a continuous bell-shaped F2 fruit
// weight distribution, infer polygenic architecture. Exp 7 is themed on
// tomato fruit weight (Yule 1902; the canonical textbook polygenic plant
// trait), but the underlying engine is a generic additive model — each
// gene contributes +0/+1/+2 favorable alleles that sum to the plant's
// fruit weight. Re-theming is prose/labels only; the math is unchanged.
const EXP7_BACKWARD_OPTIONS = [
  {
    key: 'single_triallele',
    label: 'Fruit weight is controlled by a single gene with three alleles.',
    correct: false,
    feedback:
      'A single gene with three alleles would give at most 6 distinct genotype classes, producing a step-shaped distribution with discrete peaks — not a smooth bell curve. The smooth, continuous F2 fruit weight distribution implies many genes contributing together.',
  },
  {
    key: 'polygenic',
    label: 'Fruit weight is controlled by many genes, each contributing a small additive effect.',
    correct: true,
    feedback:
      'Correct. When fruit weight is the sum of contributions from many genes (polygenic), the central limit theorem produces a roughly normal (bell-shaped) distribution in the F2. Each gene contributes a small fraction, and most plants inherit a roughly average mix of \u201c+\u201d/\u201c\u2212\u201d alleles. Very few inherit all \u201c+\u201d (giant fruit) or all \u201c\u2212\u201d (tiny fruit). This is exactly what real tomato QTL studies have found for fruit weight.',
  },
  {
    key: 'linked',
    label: 'Fruit weight is controlled by linked genes on one chromosome.',
    correct: false,
    feedback:
      'Linkage doesn\u2019t create the bell shape — it affects which combinations of alleles travel together, but the underlying distribution still depends on how many independent loci contribute. A dozen loci scattered across several chromosomes will give you the same bell curve.',
  },
  {
    key: 'environmental',
    label: 'Fruit weight is purely environmental, not genetic.',
    correct: false,
    feedback:
      'If fruit weight were purely environmental you\u2019d see no relationship between parent and offspring values at all — but in F2 the mean matches the F1 mean, which is what you\u2019d expect for an additive polygenic trait. Environment contributes variance on top of genetics, but the bell shape itself comes from the polygenic architecture.',
  },
] as const;

function Exp7_Quantitative({ onComplete }: { onComplete: () => void }) {
  const [nGenes, setNGenes] = useState(1);
  const [crossResult, setCrossResult] = useState<CrossResult | null>(null);
  const [classAnswer, setClassAnswer] = useState('');
  const [classCorrect, setClassCorrect] = useState<boolean | null>(null);
  // Latched "forward-ever-correct" gate for the backward problem. Once the
  // student picks 2n+1 once, the backward panel stays visible even if they
  // re-click a wrong forward option afterwards. Monotonic — never false.
  const [forwardEverCorrect, setForwardEverCorrect] = useState(false);
  useEffect(() => {
    if (classCorrect === true) setForwardEverCorrect(true);
  }, [classCorrect]);
  const [backKey, setBackKey] = useState<string | null>(null);
  const backOpt = EXP7_BACKWARD_OPTIONS.find(o => o.key === backKey) ?? null;
  const backCorrect = backOpt ? backOpt.correct : null;

  // Auto-advance once the student answers the BACKWARD question correctly.
  // The forward 2n+1 answer is the discovery beat; the backward question
  // ("given a bell curve, infer the genetic architecture") is the mastery
  // gate. useEffect with cleanup — never setTimeout from a click handler.
  useEffect(() => {
    if (backCorrect === true) {
      const t = setTimeout(onComplete, 1500);
      return () => clearTimeout(t);
    }
  }, [backCorrect, onComplete]);

  const genes = useMemo(() =>
    Array.from({ length: nGenes }, (_, i) => makeAdditiveGene(`qtl${i}`, i)),
    [nGenes]
  );

  // Parents: one homozygous high, one homozygous low
  const parentHigh = useMemo(() => {
    const geno: Record<string, [string, string]> = {};
    for (const g of genes) geno[g.id] = [g.alleles[0], g.alleles[0]]; // uppercase
    return makeOrganism(geno, 'high');
  }, [genes]);

  const parentLow = useMemo(() => {
    const geno: Record<string, [string, string]> = {};
    for (const g of genes) geno[g.id] = [g.alleles[1], g.alleles[1]]; // lowercase
    return makeOrganism(geno, 'low');
  }, [genes]);

  const doF2 = useCallback(() => {
    // F1 cross
    const f1Result = cross(parentHigh, parentLow, genes, 2);
    const f1a = f1Result.offspring[0];
    const f1b = f1Result.offspring[1] ?? f1a;
    // F2 from F1 × F1
    const f2 = cross(f1a, f1b, genes, 500);
    setCrossResult(f2);
  }, [parentHigh, parentLow, genes]);

  // Compute value distribution for histogram
  const histogram = useMemo(() => {
    if (!crossResult) return null;
    const maxVal = nGenes * 2;
    const bins: number[] = new Array(maxVal + 1).fill(0);
    for (const off of crossResult.offspring) {
      bins[getAdditiveValue(off, genes)]++;
    }
    return bins;
  }, [crossResult, genes, nGenes]);

  return (
    <div className="space-y-6">
      <p className="text-sm text-stone-600">
        Mendel's 3:1 and 9:3:3:1 ratios work beautifully for traits with a handful of discrete classes — flower color, seed shape, kernel color.
        But most of the traits a plant breeder actually cares about — <strong>tomato fruit weight</strong>, maize kernel number, wheat yield — vary
        <em> continuously</em>. A tomato can weigh anywhere from under a gram (wild ancestors) to more than a kilogram (modern cultivars), with every value in between.
        Yule (1902) first argued that continuous variation was perfectly compatible with Mendel's laws if many genes each contributed a small additive effect.
        We now know tomato fruit weight is controlled by ~30 quantitative trait loci (QTLs), each adding a little to the total.
      </p>
      <p className="text-sm text-stone-600">
        Let's test Yule's idea. Cross a <strong>large-fruited</strong> parent (all favorable alleles) with a <strong>small-fruited</strong> parent (all unfavorable alleles),
        then self the F1 to get an F2 and plot the fruit-weight distribution. Each gene contributes +1 per favorable allele to the plant's final fruit weight.
        Watch how the distribution changes as you dial up the number of genes.
      </p>

      <div className="flex items-center gap-4">
        <label className="text-sm font-semibold text-stone-600">Number of genes:</label>
        <div className="flex gap-1">
          {[1, 2, 3, 5, 8, 12].map(n => (
            <button key={n} onClick={() => { setNGenes(n); setCrossResult(null); }}
              className={`rounded-lg px-3 py-1.5 text-sm font-bold transition-all ${
                nGenes === n ? 'bg-emerald-500 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}>
              {n}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-xs text-stone-500">
          <strong>Large-fruited parent</strong>: all favorable alleles (fruit weight = {nGenes * 2})
        </div>
        <span className="text-stone-400">×</span>
        <div className="text-xs text-stone-500">
          <strong>Small-fruited parent</strong>: all unfavorable alleles (fruit weight = 0)
        </div>
        <button onClick={doF2}
          className="ml-auto rounded-xl bg-gradient-to-b from-emerald-600 to-emerald-700 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:shadow-lg">
          Make F2 (500 fruits)
        </button>
      </div>

      {histogram && (
        <div className="space-y-3">
          <HistogramChart
            bins={histogram}
            title="F2 distribution — tomato fruit weight (sum of favorable alleles)"
          />
          <div className="text-center text-xs text-stone-400">Fruit weight (relative units) →</div>

          {nGenes >= 5 && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
              <strong>Notice the bell curve!</strong> With {nGenes} genes, each adding a small effect to fruit weight,
              the F2 distribution approaches a normal (Gaussian) distribution. This is how <strong>quantitative traits</strong> —
              fruit weight in tomato, kernel number in maize, rosette diameter in Arabidopsis — work in real plants: many genes,
              each contributing a small effect, producing continuous variation.
              {nGenes >= 8 && (
                <span> You're now looking at the genetic basis of real plant-breeding targets.
                This is why quantitative genetics uses statistics (means, variances, heritabilities) instead of counting ratios.</span>
              )}
            </div>
          )}

          {nGenes >= 8 && (
            <QuestionPanel
              question="How many distinct fruit-weight classes are possible when fruit weight is controlled by n genes with additive effects (each contributing 0, 1, or 2 favorable alleles)?"
              correct={classCorrect}
              feedback={classCorrect === true
                ? "Right — 2n + 1. Each of the n loci contributes 0, 1, or 2 favorable alleles, so the total dose ranges from 0 to 2n. That gives 2n + 1 possible fruit-weight values, and as n grows, the binomial distribution over those classes approaches a Gaussian — the foundation of quantitative genetics and of modern plant breeding."
                : classCorrect === false
                ? "Each gene contributes 0, 1, or 2 favorable alleles. What's the range of possible totals across n genes — and how many integer values does that range cover?"
                : undefined}
            >
              <div className="flex gap-2 flex-wrap">
                {['n', '2n', '2n + 1', 'infinitely many'].map(opt => (
                  <button key={opt} onClick={() => {
                    setClassAnswer(opt);
                    setClassCorrect(opt === '2n + 1');
                  }}
                    className={`rounded-lg border-2 px-4 py-2 text-sm font-bold transition-all ${
                      classAnswer === opt
                        ? classCorrect ? 'border-emerald-400 bg-emerald-50' : 'border-red-300 bg-red-50'
                        : 'border-stone-200 bg-white hover:border-stone-300'
                    }`}>
                    {opt}
                  </button>
                ))}
              </div>
            </QuestionPanel>
          )}

          {/* Backwards problem — given a continuous bell-shaped F2
              distribution, infer polygenic additive architecture. Gated
              on the latched `forwardEverCorrect` so re-clicking a wrong
              forward option doesn't erase progress AND on nGenes >= 5
              so a student who dials back to n=1 after answering doesn't
              see a question about a bell curve they can't currently see
              on screen (F-038). onComplete fires from the backward state. */}
          {forwardEverCorrect && nGenes >= 5 && (
            <QuestionPanel
              question="You observe a continuous, bell-shaped distribution of F2 tomato fruit weights (most fruits near the middle, few at the extremes — tiny or giant). What does this tell you about the genes controlling fruit weight?"
              correct={backCorrect}
              feedback={backOpt ? backOpt.feedback : undefined}
            >
              <div
                className="text-xs font-semibold tracking-wider text-stone-500 uppercase mb-1"
                style={{ fontFamily: '"Patrick Hand", cursive' }}
              >
                Working backward
              </div>
              <div className="flex flex-col gap-2">
                {EXP7_BACKWARD_OPTIONS.map(opt => {
                  const picked = backKey === opt.key;
                  return (
                    <button
                      key={opt.key}
                      onClick={() => setBackKey(opt.key)}
                      className={`rounded-lg border-2 px-3 py-2 text-left text-xs font-semibold transition-all ${
                        picked
                          ? opt.correct
                            ? 'border-emerald-400 bg-emerald-50'
                            : 'border-red-300 bg-red-50'
                          : 'border-stone-200 bg-white hover:border-stone-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </QuestionPanel>
          )}
        </div>
      )}
    </div>
  );
}

// ── Module definition ───────────────────────────────────────────────────

const EXPERIMENTS = [
  { id: 'particulate-vs-blending', title: "1. Mendel's Insight — 1865", subtitle: 'Particulate vs blending inheritance', Component: Exp0_ParticulateVsBlending },
  { id: 'one_gene', title: '2. One Gene', subtitle: 'Discover dominance and the 3:1 ratio', Component: Exp1_OneGene },
  { id: 'prediction', title: '3. Predict Offspring', subtitle: 'Use genotypes to predict ratios', Component: Exp2_GenotypePrediction },
  { id: 'incomplete', title: '4. Incomplete Dominance', subtitle: 'When the heterozygote looks different', Component: Exp3_IncompleteDominance },
  { id: 'test_cross', title: '5. The Test Cross', subtitle: 'Unmask hidden genotypes', Component: Exp4_TestCross },
  { id: 'two_genes', title: '6. Two Genes', subtitle: 'Independent assortment and 9:3:3:1', Component: Exp5_TwoGenes },
  { id: 'epistasis', title: '7. Epistasis', subtitle: 'When one gene masks another', Component: Exp6_Epistasis },
  { id: 'quantitative', title: '8. Many Genes — Tomato Fruit Weight', subtitle: 'From Mendelian ratios to continuous variation', Component: Exp7_Quantitative },
];

const MENDELIAN_MODULE: ModuleDefinition = {
  id: 'mendelian',
  title: 'Transmission Genetics',
  subtitle: 'Project 1: Mendelian Inheritance',
  color: 'emerald',
  backLink: { href: '/breeding-game/modules.html', label: '\u2190 Back to Hub' },
  experiments: EXPERIMENTS,
};

export default function MendelianModule() {
  return <ModuleShell module={MENDELIAN_MODULE} />;
}
