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
  type CrossResult,
} from './genetics-engine';
import {
  ModuleShell, QuestionPanel, CrossWorkbench, HistogramChart,
  type ModuleDefinition,
} from './components';

// ── Experiments ──────────────────────────────────────────────────────────

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

  const f1Child = f1Result ? f1Result.offspring[0] : null;

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
                const correct = opt === '3:1';
                setAnswer2Correct(correct);
                if (correct) setTimeout(onComplete, 1500);
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
    </div>
  );
}

function Exp2_GenotypePrediction({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const [crossResult, setCrossResult] = useState<CrossResult | null>(null);
  const [answer, setAnswer] = useState('');
  const [correct, setCorrect] = useState<boolean | null>(null);

  const parentRr = useMemo(() => makeOrganism({ color: ['R', 'r'] }, 'Rr'), []);
  const parentrr = useMemo(() => makeOrganism({ color: ['r', 'r'] }, 'rr'), []);

  return (
    <div className="space-y-6">
      <p className="text-sm text-stone-600">
        You know from experiment 1 that <strong>R</strong> is dominant over <strong>r</strong>.
        Now let's predict: if you cross a heterozygous red plant (<strong>Rr</strong>) with a white plant (<strong>rr</strong>),
        what ratio of red to white do you expect?
      </p>

      <QuestionPanel
        question="Before crossing — predict the offspring ratio:"
        correct={correct}
        feedback={correct === true
          ? "Correct! Rr × rr produces Rr (red) and rr (white) in equal proportions. Crossing against a homozygous recessive tester is one of the most powerful tools in genetics — you'll meet it again by name in Experiment 4."
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
            onCross={(r) => { setCrossResult(r); setTimeout(onComplete, 2000); }}
            crossResult={crossResult}
            sampleSize={100} label="Test Cross: Rr × rr" showGenotypes
          />
        </>
      )}
    </div>
  );
}

function Exp3_IncompleteDominance({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const [f1Result, setF1Result] = useState<CrossResult | null>(null);
  const [f2Result, setF2Result] = useState<CrossResult | null>(null);
  const [answer, setAnswer] = useState('');
  const [correct, setCorrect] = useState<boolean | null>(null);
  const [f2Answer, setF2Answer] = useState('');
  const [f2Correct, setF2Correct] = useState<boolean | null>(null);

  const parentRR = useMemo(() => makeOrganism({ color_inc: ['R', 'R'] }, 'RR'), []);
  const parentrr = useMemo(() => makeOrganism({ color_inc: ['r', 'r'] }, 'rr'), []);

  const f1Child = f1Result?.offspring[0];

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
                const isCorrect = opt === '1:2:1';
                setF2Correct(isCorrect);
                if (isCorrect) setTimeout(onComplete, 1500);
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
    </div>
  );
}

function Exp4_TestCross({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const [answer, setAnswer] = useState('');
  const [correct, setCorrect] = useState<boolean | null>(null);
  const [crossResult, setCrossResult] = useState<CrossResult | null>(null);

  // Mystery plant — randomized once at mount, could be RR (homozygous) or Rr (heterozygous).
  // useState lazy initializer guarantees this runs exactly once for the lifetime of the component.
  const [mystery] = useState(() => {
    const isHomozygous = Math.random() < 0.5;
    return makeOrganism(
      { color: isHomozygous ? ['R', 'R'] : ['R', 'r'] },
      'mystery',
    );
  });
  const tester = useMemo(() => makeOrganism({ color: ['r', 'r'] }, 'tester'), []);

  // Auto-advance after the cross has been displayed long enough to read.
  useEffect(() => {
    if (step >= 2 && crossResult) {
      const t = setTimeout(() => onComplete(), 2500);
      return () => clearTimeout(t);
    }
  }, [step, crossResult, onComplete]);

  const whiteCount = crossResult?.phenotypeCounts?.['White'] ?? 0;

  return (
    <div className="space-y-6">
      <p className="text-sm text-stone-600">
        You have a red-flowered plant but don't know if it's <strong>RR</strong> (homozygous) or <strong>Rr</strong> (heterozygous).
        Both look red! How can you find out? (You've actually done a cross like this before, in Experiment 2 — now we'll
        use it on an unknown genotype, where it's called <em>the test cross</em>.)
      </p>

      <QuestionPanel
        question="What cross would reveal the mystery plant's genotype?"
        correct={correct}
        feedback={correct === true
          ? "Yes — crossing the unknown red against a white (rr) tester is the test cross. If the mystery plant is RR, all offspring will be red (Rr). If it's Rr, you'll get roughly half red and half white."
          : correct === false
          ? "Think about which cross would give different results depending on the unknown genotype..."
          : undefined}
      >
        <div className="flex gap-2 flex-wrap">
          {['Cross it with a white plant', 'Cross it with another red plant', 'Self-pollinate it'].map(opt => (
            <button key={opt} onClick={() => {
              setAnswer(opt);
              const isCorrect = opt === 'Cross it with a white plant';
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
        <>
          <p className="text-sm text-stone-600">
            Cross the mystery red plant with a white (rr) tester:
          </p>
          <CrossWorkbench
            parentA={mystery} parentB={tester} genes={[FLOWER_COLOR]}
            onCross={(r) => { setCrossResult(r); setStep(2); }} crossResult={crossResult}
            sampleSize={40} label="Test Cross: Mystery Red × White"
          />
        </>
      )}

      {step >= 2 && crossResult && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-800 space-y-2">
          {whiteCount > 0 ? (
            <>
              <p>
                <strong>White offspring appeared</strong> ({whiteCount} of {crossResult.total}).
                Only an Rr plant crossed with rr can produce rr (white) offspring, so the mystery plant
                must be <strong>Rr</strong> — heterozygous.
              </p>
              <p>
                If it were RR, it could only contribute R alleles, so every offspring would be Rr (red).
                Since we see rr offspring, the mystery parent must have contributed an r allele.
              </p>
            </>
          ) : (
            <>
              <p>
                <strong>No white offspring appeared.</strong> If the mystery plant were Rr, about half of the
                {' '}{crossResult.total} offspring would be white (rr). Since all of them are red, the mystery
                plant must be <strong>RR</strong> — homozygous dominant.
              </p>
              <p>
                An RR parent can only contribute R alleles, so every offspring is Rr and red. The absence of
                any white offspring is the evidence.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Exp5_TwoGenes({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const [f1Result, setF1Result] = useState<CrossResult | null>(null);
  const [f2Result, setF2Result] = useState<CrossResult | null>(null);
  const [answer, setAnswer] = useState('');
  const [correct, setCorrect] = useState<boolean | null>(null);

  const parentAABB = useMemo(() => makeOrganism({ color: ['R', 'R'], shape: ['S', 'S'] }, 'RRSS'), []);
  const parentaabb = useMemo(() => makeOrganism({ color: ['r', 'r'], shape: ['s', 's'] }, 'rrss'), []);

  const f1Child = f1Result?.offspring[0];

  return (
    <div className="space-y-6">
      <p className="text-sm text-stone-600">
        Now we track <strong>two genes at once</strong>: flower color (R/r) and seed shape (S/s, where S = Round is dominant).
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
          <CrossWorkbench
            parentA={f1Child} parentB={f1Result!.offspring[1] ?? f1Child}
            genes={[FLOWER_COLOR, SEED_SHAPE]}
            onCross={(r) => { setF2Result(r); setStep(2); }} crossResult={f2Result}
            sampleSize={200} label="F2: Dihybrid F1 × F1"
          />
        </>
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
                if (isCorrect) setTimeout(onComplete, 2000);
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
    </div>
  );
}

function Exp6_Epistasis({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const [f2Result, setF2Result] = useState<CrossResult | null>(null);
  const [answer, setAnswer] = useState('');
  const [correct, setCorrect] = useState<boolean | null>(null);

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
                const isCorrect = opt === '9:3:4';
                setCorrect(isCorrect);
                if (isCorrect) setTimeout(onComplete, 2000);
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
    </div>
  );
}

function Exp7_Quantitative({ onComplete }: { onComplete: () => void }) {
  const [nGenes, setNGenes] = useState(1);
  const [crossResult, setCrossResult] = useState<CrossResult | null>(null);
  const [classAnswer, setClassAnswer] = useState('');
  const [classCorrect, setClassCorrect] = useState<boolean | null>(null);

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
        What happens when a trait is controlled by <strong>many genes</strong>, each with a small additive effect?
        Each gene contributes +1 per favorable allele. Watch the distribution change as you add more genes.
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
          <strong>Parent 1</strong>: all favorable alleles (value = {nGenes * 2})
        </div>
        <span className="text-stone-400">×</span>
        <div className="text-xs text-stone-500">
          <strong>Parent 2</strong>: all unfavorable alleles (value = 0)
        </div>
        <button onClick={doF2}
          className="ml-auto rounded-xl bg-gradient-to-b from-emerald-500 to-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:shadow-lg">
          Make F2 (500 offspring)
        </button>
      </div>

      {histogram && (
        <div className="space-y-3">
          <HistogramChart
            bins={histogram}
            title="F2 Distribution — Trait Value (sum of favorable alleles)"
          />
          <div className="text-center text-xs text-stone-400">Trait value →</div>

          {nGenes >= 5 && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
              <strong>Notice the bell curve!</strong> With {nGenes} genes, each adding a small effect,
              the F2 distribution approaches a normal (Gaussian) distribution. This is how
              <strong> quantitative traits</strong> like yield, height, and weight work in real organisms —
              many genes, each with small effects, producing continuous variation.
              {nGenes >= 8 && (
                <span> You're now looking at the genetic basis of complex traits.
                This is why quantitative genetics uses statistics instead of counting ratios!</span>
              )}
            </div>
          )}

          {nGenes >= 8 && (
            <QuestionPanel
              question="How many phenotypic classes do you see for a trait controlled by n genes with additive effects (each contributing 0, 1, or 2 favorable alleles)?"
              correct={classCorrect}
              feedback={classCorrect === true
                ? "Right — 2n + 1. Each of the n loci contributes 0, 1, or 2 favorable alleles, so the total dose ranges from 0 to 2n. That gives 2n + 1 possible additive values, and as n grows, the binomial distribution over those classes approaches a Gaussian — the foundation of quantitative genetics."
                : classCorrect === false
                ? "Each gene contributes 0, 1, or 2 favorable alleles. What's the range of possible totals across n genes — and how many integer values does that range cover?"
                : undefined}
            >
              <div className="flex gap-2 flex-wrap">
                {['n', '2n', '2n + 1', 'infinitely many'].map(opt => (
                  <button key={opt} onClick={() => {
                    setClassAnswer(opt);
                    const isCorrect = opt === '2n + 1';
                    setClassCorrect(isCorrect);
                    if (isCorrect) setTimeout(onComplete, 2000);
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
        </div>
      )}
    </div>
  );
}

// ── Module definition ───────────────────────────────────────────────────

const EXPERIMENTS = [
  { id: 'one_gene', title: '1. One Gene', subtitle: 'Discover dominance and the 3:1 ratio', Component: Exp1_OneGene },
  { id: 'prediction', title: '2. Predict Offspring', subtitle: 'Use genotypes to predict ratios', Component: Exp2_GenotypePrediction },
  { id: 'incomplete', title: '3. Incomplete Dominance', subtitle: 'When the heterozygote looks different', Component: Exp3_IncompleteDominance },
  { id: 'test_cross', title: '4. The Test Cross', subtitle: 'Unmask hidden genotypes', Component: Exp4_TestCross },
  { id: 'two_genes', title: '5. Two Genes', subtitle: 'Independent assortment and 9:3:3:1', Component: Exp5_TwoGenes },
  { id: 'epistasis', title: '6. Epistasis', subtitle: 'When one gene masks another', Component: Exp6_Epistasis },
  { id: 'quantitative', title: '7. Many Genes', subtitle: 'From Mendelian to quantitative', Component: Exp7_Quantitative },
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
