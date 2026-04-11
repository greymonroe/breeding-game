# Population Genetics Module v2 — Vision & Implementation Plan

**Status:** Planning. Created 2026-04-10, immediately after the Linkage v2 vision
plan committed (`c00d4d9`) and while the Mendelian v2 build sits at `094fc69`.
Supersedes the current ship-ready-but-pedagogically-thin v1 PopGen module. The
April 2026 peer-review audit of this module (see `/tmp/popgen-audit/REPORT.md`
during live sessions) found 15 bugs, 3 of them CRITICAL: Exp 5's migration model
had converged two populations to **swapped** allele frequencies rather than a
common mean; the simulation engine was re-sampling genotypes via a multinomial
draw **after** the Wright-Fisher binomial step, tripling the observed drift
variance and silently forcing HWE every generation; and Exp 2's HWE "discovery"
was rigged by that same resampling path. All three CRITICAL bugs are fixed in
the current `popgen-engine.ts` and `PopGenModule.tsx`: migration uses the
correct `p' = (1-m)p + m·p_other` recursion on both populations, and the engine
runs a single `binomial(2N, p)` draw per generation with no subsequent
multinomial resampling.

There is, however, a **residual engine concern** the audit missed that this
plan must flag up front — see the "CRITICAL residual: genotype reconstruction
is deterministic" note in the "Current state" section below. It does not
invalidate the engine's drift dynamics (the `p` trajectory is a correct
Wright-Fisher sample), but it silently re-imposes HWE on the per-generation
**genotype** counts by `round(N · p²)` / `round(N · q²)`. That means the Exp 2
chi-square "test" is trivially passing — the observed genotypes are the HWE
prediction by construction, not by random mating. Phase 2 of this plan fixes it.

**Read first:** `CLAUDE.md` at the repo root, then `docs/MENDELIAN_V2_PLAN.md`
and `docs/LINKAGE_V2_PLAN.md` (for the methodology — this plan follows them
section-for-section), then `docs/CURRICULUM_DEVELOPMENT_METHODOLOGY.md` (for
the five-phase pattern and agent orchestration). Then come back here.

---

## The north star

A student who finishes the PopGen v2 module should be able to **look at a
plant population, predict how its allele frequencies will change over
generations under the five evolutionary forces — drift, selection, migration,
mutation, and non-random mating — and recognize when Hardy-Weinberg is and
isn't a reasonable null**. They should be able to write p² + 2pq + q² = 1
and use it in both directions; know that drift variance is p(1−p)/(2N) and
that small populations drift fast while large populations barely move; know
that a neutral allele's fixation probability equals its starting frequency;
use Δp = spq²/(1−sq²) for directional selection on a recessive and recognize
from the form alone that selection against a rare recessive is almost
arithmetically slow; compute the mutation-selection balance q̂ ≈ √(μ/s);
recognize a founder-effect signature in an observed island vs. mainland
comparison; and know that migration is a force that **pulls two populations
toward a common mean**, not a force that swaps their allele frequencies.
They should know that Hardy 1908 was a one-page Science letter written to
settle a dispute with Reginald Punnett, that Weinberg independently derived
the same result the same year, that Wright 1931 invented path analysis to
understand drift, and that Fisher and Haldane in the late 1920s and early
1930s built the mathematical theory of natural selection from first
principles. They should also have fun doing it.

Right now (v1), a student who finishes the module can correctly enter
`p = 0.6` into a number box after counting circles, type HWE predictions
into three more number boxes, click "Simulate" and be told "the population
IS in Hardy-Weinberg equilibrium" (from an engine that literally constructs
genotypes at HWE proportions), predict how many of 10 replicates fix the A
allele (which is the one genuinely good discovery beat in the module,
post-audit), click through three deterministic Force-A-Allele-Up sliders,
and read one histogram of founder allele frequencies. That's recall and
button-pushing, not reasoning about a population. The north star above is
the target that the three phases below are built to hit.

---

## The four principles

Same four axes as Mendelian v2 and Linkage v2. Every decision in this plan
grades against these. If a change doesn't serve at least three of them,
drop it. If it actively fights one of them, it's out.

### 1. Genetic accuracy

- Every formula on screen must be derivable from canonical population
  genetics textbooks. The baseline references for this module are
  **Hartl & Clark (*Principles of Population Genetics*, 4th ed.)**,
  **Gillespie (*Population Genetics: A Concise Guide*, 2nd ed.)**, and
  **Felsenstein (*Theoretical Evolutionary Genetics*, online draft)**.
  These are the textbooks a professor is grading the module against.
- Engine outputs must match closed-form predictions within Monte Carlo
  noise. Specifically:
  - Drift: variance of `p` at generation `t` starting from `p₀` should
    match `p₀(1−p₀) · (1 − (1 − 1/(2N))^t)`, and per-generation
    variance should match `p(1−p)/(2N)`.
  - Fixation: the probability that a neutral allele reaches fixation must
    equal its starting frequency `p₀`. At `p₀ = 0.5` and enough replicates,
    ~50% of populations should fix A.
  - Selection: under constant `s` against `aa`, the one-generation recursion
    `p' = (p² + pq(1 + 0)/2) / w̄` (equivalently
    `p' = p(1 + sp) / (1 + sp²)` in Gillespie's form for heterozygote-same-
    as-dominant) must match the engine output to floating-point precision
    when drift is off.
  - Migration: two-island model with symmetric rate `m` must drive both
    populations to `(p₁₀ + p₂₀)/2` (the *weighted mean*, not a swap).
    Asymptote must be hit to within 1% by generation `~3/m`.
  - Mutation-selection balance: with only `A → a` mutation and selection
    `s` against `aa`, equilibrium `q̂` must match `√(μ/s)` to within 10%.
- **Validation must always accept the textbook answer** even when the
  engine's stochastic output drifts. If the module asks "what's the
  variance of `p` at `N = 50`, `p₀ = 0.5`, after 20 generations?" and the
  textbook says `~0.025`, then answers near `0.025` must be accepted even
  if the current sample computed `0.031`. Same rule as Linkage Exp 3's
  dual-tolerance fix.
- **Plant examples only.** The v1 module uses abstract `A`/`a` alleles
  throughout — this violates `CLAUDE.md`'s plants-only rule. The canonical
  plant examples for every PopGen concept already exist and are named in
  `CLAUDE.md`:
  - **Hardy-Weinberg, drift, founder effect:** *Mimulus* anthocyanin
    (a balanced polymorphism in monkeyflowers with well-characterized
    population structure).
  - **Balancing selection (mentioned but not a v2.1 experiment):**
    *Brassica* S-alleles (self-incompatibility, where heterozygote
    advantage is literally forced by the biology).
  - **Directional selection in real time:** *Amaranthus palmeri* or
    *Amaranthus tuberculatus* glyphosate resistance — one of the best
    documented real-time directional-selection events in any plant,
    measured directly in agricultural fields across the US Midwest
    from ~2005 onward.
  - **Mutation-selection balance:** *Arabidopsis* chlorophyll mutants
    (deleterious recessive, near-lethal when homozygous, persistent at
    very low equilibrium frequency from recurrent mutation).
  - **Founder effect:** Hawaiian *Bidens* (tarweeds / beggar-ticks),
    one of the most dramatic adaptive radiations in plant biology,
    starting from a tiny founding population that arrived on the
    islands by long-distance dispersal.
  - **Drift in small populations:** island *Plantago* populations in
    the Mediterranean (the textbook example from Wright's own
    isolation-by-distance work extended to plants).
  - **Migration / gene flow:** *Mimulus* again, where adjacent populations
    of serpentine-adapted and non-serpentine plants exchange gametes via
    pollen flow and the resulting cline is a direct observation of
    migration-selection balance.
  **Do not reach for ABO blood types, human sickle cell, or abstract
  letter alleles** — they are the textbook defaults precisely because the
  textbook wasn't written for plant biologists, and every one of them
  has a canonical plant alternative.
- **Notation must be internally consistent across the whole module.**
  Allele notation: use plant slash convention with distinct upper/lower
  case for the dominant/recessive relationship where it applies. For the
  *Mimulus* anthocyanin example, use `M/m` (where `M` = anthocyanin-
  producing allele, `m` = non-producing null) or — if the professor
  prefers the literature convention for the MYB transcription factor
  involved — `MYB/myb`. Pick one per experiment and stay with it.
  Population-level frequencies use `p` (frequency of the dominant / named
  allele) and `q = 1 − p` (frequency of the other). Genotype frequencies
  are `p²`, `2pq`, `q²`. The current v1 notation (`freq(AA) = p²` with
  abstract `A`) should be renamed consistently with whichever plant
  example the experiment uses.
- **Consume the student's own data where possible.** Exp 2's HWE
  "discovery" must run the chi-square on a stochastic sample produced by
  the student's own parameters, not on an engine output that has been
  round-tripped through `round(N · p²)` (which gives chi-square ≈ 0 by
  construction — see Critical residual below). Exp 7's founder-effect
  histogram already does this correctly; replicate that pattern for
  Exp 2.
- **Add a numeric verification script for every engine change.** The
  pattern is `/tmp/popgen-audit/scripts/verify-engine.js` (the audit's
  reference implementation): runs Wright-Fisher simulations at multiple
  `N` values and multiple `p₀` values, measures the variance of `p` at
  generation 1 across 10,000 replicates, compares to the closed-form
  prediction `p(1−p)/(2N)`, and prints the measured/expected ratio. If
  the ratio is not within 10% of 1.0, the engine is wrong. Paste the
  ratios into the commit message, before and after any engine edit.
  `CLAUDE.md` requires this explicitly for engine work on this codebase.

### 2. Visual aesthetic consistency

- **Violet primary.** PopGen uses violet per `ModuleShell.THEME.violet`:
  sidebar gradient `from-violet-800 to-violet-700`, active sidebar item
  `bg-violet-100 border-violet-400 text-violet-800`, completion badge
  `bg-violet-100 text-violet-700`, `button: bg-violet-700`. Each curriculum
  module has its own theme color so students navigating across modules
  know which room they're in (emerald for Mendelian, cyan for Linkage,
  violet for PopGen). Violet stays.
- **CTA contrast fix from Mendelian Bundle A and Linkage Phase 1.8 applies
  here.** The sidebar-level violet CTA in `ModuleShell.THEME.violet.button`
  is already `bg-violet-700` — that's correct. But the experiment-body
  CTAs in `PopGenModule.tsx` all use `from-violet-500 to-violet-600`
  gradients. `violet-500` against white text is about 2.7:1 — fails
  WCAG AA (4.5:1). Phase 1 must bump every experiment-body CTA to
  `from-violet-700 to-violet-800` (or `bg-violet-700` flat). Same fix as
  emerald-500 → emerald-700 and cyan-500 → cyan-700. Search-and-replace
  on the single file. Zero cognitive cost.
- Violet secondary for teaching callouts (`bg-violet-50 border-violet-200
  text-violet-800`). Stone-50 neutral callouts for law definitions and
  assumption lists. Dusty-rose red for errors. Same palette as Mendelian
  and Linkage so a student moving between modules feels continuity.
- `rounded-2xl` cards, `border border-stone-200 shadow-sm`, `p-6` body
  padding, `space-y-6` vertical stacking. Match Mendelian/Linkage exactly.
- Typography: Nunito for body, Patrick Hand for handwritten-feel
  "lab-notebook" callouts and historical framing. **`popgen.html`
  currently only loads Nunito** — Phase 1 must add the Patrick Hand
  `<link>` the same way `lab.html` does (verify the exact font-load URL
  against `lab.html` before editing). Same gap that existed in `linkage.html`
  before Linkage Phase 1.
- **Deterministic phenotype colors by label.** PopGen's v1 uses hard-coded
  violet shades for `AA` / `Aa` / `aa` in `PopulationGrid`. When the
  module moves off abstract alleles onto *Mimulus* anthocyanin, the
  genotype colors should map to actual flower colors: `MM` = anthocyanin-
  rich deep pink/magenta, `Mm` = intermediate pink (note: the real allele
  is close to dominant for anthocyanin presence, so `Mm` looks similar to
  `MM` — this matches biology), `mm` = white/cream flower. Same rule as
  Mendelian: use the `phenotypeFill(label)` helper from
  `components/colors.ts` or a similar label-keyed map. Never sort-order.
- **Organisms rendered through shared iconography.** Populations of
  individuals should be rendered via `OrganismCard` where a full flower
  icon is appropriate, and via compact colored circles via
  `PopulationGrid` for the "here's 50 plants" grid view. Do not invent
  new flower SVGs for this module; the *Mimulus* flower can reuse the
  shared `PlantIcon` from `src/shared/icons/` by passing a different
  `colorMap` to it. Confirm this is possible during Phase 1; if not,
  add a *Mimulus* variant to the shared icons folder as part of Phase 2.
- Charts: the v1 `FrequencyChart` is local to `PopGenModule.tsx` and has
  not been promoted to `components/`. Phase 2 promotes it and extends it
  into an `AlleleTrajectoryVisualizer` (see 2.1 below) that can handle the
  20-replicate drift-at-different-N display the module needs. `HistogramChart`
  (already shared) reuses as-is for the founder-effect histogram.

### 3. Pedagogical value

- Every experiment must pass the **"new problem test"**: after this
  experiment, can the student predict the outcome of a population-
  genetics problem they've never seen? Right now v1 fails this in Exp 1
  (the "compute p and q from a population grid" is a mechanical count,
  not a transferable skill), Exp 2 (HWE is demonstrated as a fixed fact,
  not something the student derives from the multiplication rule), and
  Exp 4 (the three preset selection coefficients run in parallel; the
  student never has to compute Δp by hand for any parameter combination).
- Every concept has a **discovery beat** with prediction before observation.
  Exp 3 already has this post-audit (the student predicts the number of
  replicates that fix A before running the simulation — this is the one
  genuinely good pedagogical beat in v1). Exp 2 must add one (predict
  whether random mating alone produces HWE in one generation and what
  the F₁ ratios should be). Exp 4 must add one (predict Δp for given `s`
  and `q` and observe how close the student's prediction lands). Exp 5
  must add one (predict whether two populations with different starting
  frequencies converge to a common mean or something else).
- **Forward AND backward problems** on every narrative experiment.
  Population genetics is *the* domain where backward inference is the
  dominant research move: given an observed allele-frequency distribution
  across populations, the inference question is "which force produced
  this?" (drift, selection, migration, founder effect, structure). A
  module that only asks forward questions does not prepare students for
  real research. Every existing experiment needs an inverse panel — see
  Phase 3.3 for the specific inversions.
- **Mechanism beats memorization.** Drift is not magic — it is the
  literal finite-sampling noise of building the next gamete pool from a
  finite parent pool. A student who sees a coin-flip-like sampling beat
  in the trajectory visualizer will understand `variance = p(1−p)/(2N)`
  as a consequence of binomial sampling, not as a formula to memorize.
  Selection is not "survival of the fittest" metaphor — it is
  differential reproductive contribution, and the algebra is just
  weighted averages. Every formula in the module should be derivable
  from the mechanism beat the student just saw.
- **Name the theorems and the historical insights.** Hardy-Weinberg
  Theorem: explicitly named at the end of Exp 2 as a callout.
  Wright's Island Model: named in Exp 5 when migration-to-common-mean
  is demonstrated. Mutation-selection balance: named in Exp 6 with the
  `q̂ ≈ √(μ/s)` formula called out. Founder effect: named in Exp 7.
  Same pattern as Mendelian v2's Law of Segregation / Independent
  Assortment callouts and Linkage v2's Sturtevant / Creighton-McClintock
  callouts.
- **Noise literacy.** A population of `N = 50` with true `p = 0.5` has
  standard error at generation 1 of `√(0.25/100) = 0.05`, so observed
  `p₁` values in the range `0.40 – 0.60` are all "still `p = 0.5`." At
  `N = 500` the same SE is `0.016`, so observed `p₁` values in `0.484 –
  0.516` are indistinguishable. Students need to see this explicitly —
  a "run 20 replicates" comparison at `N = 50` vs `N = 500` is the
  right shape, and Exp 3 already sort-of does this (it runs 10
  replicates). Phase 1 sharpens it.
- **Interleaved spaced practice.** PopGen-specific problem types in a
  `practice/` subsystem, sharing the Mendelian / Linkage architecture.

### 4. Fun

- **Playful micro-interactions.** Hover on any trajectory line to see
  `p` at generation `g`. Click "new replicates" on the trajectory
  visualizer to re-draw instantly. Drag the `N` slider and watch the
  new trajectories fill in. Tap a replicate line to highlight it and
  dim the others. A small celebratory beat (seed scatter, 2 s, no
  gambling) when a practice-mode session goes 10/10.
- **Historical storytelling.** Hardy 1908 is one of the most charming
  stories in early-20th-century biology: **G. H. Hardy was a pure
  mathematician at Cambridge who detested applied mathematics** and
  published a one-page letter to *Science* essentially under protest,
  after the geneticist Udny Yule (via Reginald Punnett, Hardy's cricket
  companion at Cambridge) asked him to refute a bad population-level
  argument that dominant alleles should eventually swamp recessive ones.
  Hardy wrote out the algebra in a couple of paragraphs, pointed out the
  answer was trivial to anyone with a first course in probability, and
  the letter became one of the founding documents of population
  genetics. Meanwhile in Stuttgart, the physician **Wilhelm Weinberg**
  derived the same result independently in January 1908. **Sewall
  Wright** (Chicago, 1931) and **R. A. Fisher** (Cambridge, 1930) and
  **J. B. S. Haldane** (London, 1932) built the full theoretical
  apparatus over the next two decades — each of these three is a
  distinct personality worth a line or two of framing. The v1 module
  tells none of these stories.
- **Discovery moments.** Every experiment ends with the student saying
  "wait, that's not what I expected." Exp 2: "I thought you'd need
  many generations to reach equilibrium — but you get it in one?"
  Exp 3: "I thought drift was gradual — but in small populations it
  fixes in a handful of generations?" Exp 4: "I thought selection on
  a recessive would be fast — but while `q` is rare, almost every `a`
  allele is hiding in a heterozygote, so selection barely moves?"
  Exp 5: "I thought migration would swap the populations — but it
  pulls them to a common mean?" Exp 6: "I thought selection would
  eliminate a deleterious allele — but mutation keeps bringing it
  back and the balance is a real nonzero equilibrium?" Exp 7: "I
  thought all populations from the same source would look similar —
  but random sampling at founding produces huge differences?"
- **Streaks and small celebrations** in practice mode. Same Duolingo
  mechanic as Mendelian and Linkage. No XP, no loot, no leaderboards.
- **Charming copy.** The Hardy-Weinberg callout should read like "a
  mathematician wrote this on a napkin to shut up a cricket
  teammate," not like a textbook footnote.

If a feature increases student understanding but makes the module feel
clinical, push back. If a feature is fun but muddies the science, drop
it. The sweet spot is where all four principles align.

---

## Current state (honest)

### What v1 is good at

Assessed by reading `src/curriculum/PopGenModule.tsx` and
`src/curriculum/popgen-engine.ts` end-to-end after the April 2026 audit.

- **Engine is mostly correct post-audit.** The Wright-Fisher drift step
  is a single `binomial(2N, p)` draw per generation — no second
  multinomial resampling on top, which was the audit's CRITICAL bug that
  had drift variance inflated ~3× and HWE trivially forced at the
  population level. The `p` trajectory the engine produces is a
  statistically correct Wright-Fisher sample. Verified by tracing the
  loop body at `popgen-engine.ts:81-122`: selection → mutation →
  migration → drift (single binomial) → deterministic genotype
  reconstruction. Order of forces is the standard order used in Hartl
  & Clark §§3-5.
- **Migration converges to the common mean, not the swap.** Exp 5 uses
  the correct two-island recursion `p₁' = (1-m)p₁ + m·p₂, p₂' = (1-m)p₂
  + m·p₁`, which analytically drives both populations to
  `(p₁₀ + p₂₀)/2 = 0.5` in the symmetric `p₁₀ = 0.1, p₂₀ = 0.9` case.
  The audit's CRITICAL "converges to swapped" bug is fixed. Verified by
  reading `PopGenModule.tsx` lines 606-629.
- **Exp 3 has the one genuinely good pedagogical beat in the module.**
  The student makes a quantitative prediction (how many of `n = 10`
  replicates at `N = 20`, `p₀ = 0.5` will fix the A allele?) **before**
  seeing the simulation, and the prediction is locked before the sim
  runs. This is a real discovery beat. Keep it. Reuse the pattern in
  other experiments in Phase 1.
- **Exp 3 validation accepts a range, not a stochastic sample.** The
  check is `guess >= 3 && guess <= 7` (centered on the textbook
  expectation of 5/10, i.e. `p₀ · n`, with a ±2 tolerance for sampling
  variation). This is the right shape — textbook answer accepted even
  when the sample drifts. No textbook-vs-sample drift bug.
- **Exp 7 (founder effect) consumes the student's own sampled data.**
  The histogram is built from a fresh stochastic sample on every click,
  and the 20 founder populations are genuinely drawn from the source
  `p = 0.5`. No hardcoded magic-number array. The pattern is correct.
- **`testHWE` is a real chi-square test with correct CDF.** The
  chi-square-to-p-value conversion uses Abramowitz-Stegun `erf` for
  df = 1 and a lower-incomplete-gamma series for df > 1. Mathematically
  sound.
- **`simulateReplicates` works correctly.** Exp 3 uses it to run 10
  independent populations in parallel and plots all 10 trajectories
  on one chart. This is the right shape for drift comparison.
- **Violet theme is deterministic and label-based inside `FrequencyChart`**
  — trajectory colors cycle through `['#7c3aed', '#a78bfa', '#c4b5fd',
  '#ddd6fe']` in order of replicate index. Not a phenotype-coloring
  concern because there's no underlying label.
- **Seven-experiment ladder covers the canonical topics** (allele
  frequencies → HWE → drift → selection → migration → mutation-selection
  balance → founder effect). The progression is the textbook progression
  from Hartl & Clark Chapters 2-5.

### CRITICAL residual: genotype reconstruction is deterministic (AUDIT MISSED THIS)

The April 2026 audit fixed the post-WF multinomial resampling that was
tripling drift variance. But it replaced it with a **deterministic
reconstruction**:

```ts
// popgen-engine.ts lines 110-118
// 4. Drift — Wright-Fisher sampling of 2N alleles (this IS the drift step)
const nA = binomial(2 * popSize, p);
p = nA / (2 * popSize);

// Deterministic HW genotype reconstruction from post-drift p.
// Do NOT redraw genotypes here — that would add a second round of
// sampling noise on top of Wright-Fisher drift and force HWE on output.
const q = 1 - p;
const AA = Math.round(popSize * p * p);
const aa = Math.round(popSize * q * q);
// Absorb any rounding residual into Aa so AA+Aa+aa === popSize exactly.
const Aa = popSize - AA - aa;
geno = { AA, Aa, aa };
```

This is **correct for the allele-frequency trajectory** — `p` is a true
Wright-Fisher sample at each generation — but **incorrect for the
genotype chi-square test in Exp 2**. The per-generation genotype counts
the engine returns are, by construction, the HWE prediction
`round(N · p²), round(N · 2pq), round(N · q²)`. So when Exp 2 runs
`simulate({popSize: 1000, initialFreqA: 0.6, generations: 1})` and then
pipes `genotypeHistory[1]` into `testHWE`, the observed and expected
counts agree exactly (up to integer rounding on one cell absorbed by
`Aa`), the chi-square is ≈ 0, and the conclusion "the population IS in
Hardy-Weinberg equilibrium" is a tautology. The student is being shown
HWE because the engine has been told to output HWE, not because one
generation of random mating produces HWE (which it does — but the
student isn't seeing that, they're seeing a nop). The "discovery" beat is
rigged, exactly the way the April 2026 audit said it had been rigged
before the fix — the audit fix was incomplete.

This violates two `CLAUDE.md` rules:

1. "Stochastic outputs must be verifiable against closed-form predictions"
   — Exp 2's chi-square is not a test, it's an identity.
2. "Rigged discovery" (bug class #3 in the common bug classes list) —
   the conclusion is printed unconditionally because the simulation
   cannot produce a non-HWE population by construction.

**The fix** (done in Phase 2, not in this planning document):

- Track **allele counts** through the loop, not genotype counts. Drop
  the `geno` field from the Wright-Fisher step entirely.
- Only materialize genotypes at the moment the student asks to observe
  them, and do so via a **multinomial sample** at generation 0 under
  random mating: `genotypes = multinomial(N, [p², 2pq, q²])`. This is a
  single stochastic draw at display time that has the right variance
  for a chi-square to be a real test.
- Specifically for Exp 2: initialize a population at `p = 0.6`, form
  the gamete pool, draw `N = 1000` zygotes via multinomial on
  `[p², 2pq, q²]`, and **return those**. The observed `AA`, `Aa`, `aa`
  will have real sampling noise (expected chi-square ~1 with df=1,
  p-value ~0.3), and the "in HWE" conclusion will pass with high
  probability but not certainty. That's a real test.
- Alternatively, expose a separate `sampleZygotes(N, p)` function on
  the engine (the existing `sampleGenotypes` helper at
  `popgen-engine.ts:39` already does exactly this) and have Exp 2 call
  it directly, bypassing the deterministic reconstruction path for
  this experiment's display purposes.
- **Add a verification script** (`scripts/popgen/verify-hwe-test.ts`)
  that runs 10,000 one-generation HWE simulations at `p = 0.5`, `N =
  1000` and checks that the distribution of chi-square values matches
  a chi-square-with-df=1 distribution (specifically: mean ≈ 1, 5% of
  values > 3.84). If the engine is cheating, all chi-squares will be
  ≈ 0 and this test will fail. If the engine is correct, the
  chi-square distribution will match theory.

**Escalation:** this is a CRITICAL bug in the same category as the three
the audit found. It does not block Phase 1 (pedagogy tightening doesn't
touch the engine), but it must be fixed before Exp 2 is reshaped as a
puzzle in Phase 2.2. **Flag to the project owner before starting Phase 2.**

### What v1 is missing

Everything the north star demands. Specifically:

- **No plant examples anywhere.** Every experiment uses abstract `A`/`a`
  alleles. This is the single most glaring `CLAUDE.md` violation in the
  module — the rule is explicit ("plant examples only") and the v1
  module ignores it entirely. Phase 1 must refloor every experiment
  onto a real plant example (*Mimulus* anthocyanin for Exps 1-3,
  *Amaranthus* glyphosate resistance for Exp 4, *Mimulus* serpentine
  gene flow for Exp 5, *Arabidopsis* chlorophyll mutants for Exp 6,
  Hawaiian *Bidens* for Exp 7). The engine itself is allele-agnostic
  and doesn't need to change — just the labels, colors, captions, and
  prose. Same refactor Mendelian Exp 6 went through when it moved from
  mice to maize aleurone.
- **No allele-frequency-trajectory visualization as a shared component.**
  The v1 `FrequencyChart` is local to `PopGenModule.tsx` and is just
  a static line plot. There is no analog of `GameteVisualizer` (from
  Mendelian) or `CrossoverVisualizer` (from Linkage Phase 2). The
  biggest missing mental model in the module is a component that lets
  the student sweep `N`, `p₀`, `s`, `m`, and number of replicates and
  *see* drift, selection, and migration play out simultaneously across
  multiple trajectories. This is Phase 2.1's major addition.
- **No historical framing experiment (no Exp 0).** The module opens cold
  with "here is a population of 50 plants, count the `A` alleles" — no
  Hardy 1908, no Weinberg 1908, no context for why this mathematical
  framework is one of the founding achievements of 20th-century
  biology. Mendelian v2 added Exp 0 (Particulate vs Blending) for
  exactly this reason; Linkage v2 is adding Exp 0 (Creighton &
  McClintock 1931) for the same reason; PopGen must add Exp 0 (Hardy,
  Weinberg, and the equilibrium) in Phase 3.
- **No backward problems.** Every experiment in v1 is forward ("here are
  parameters, run the sim, explain what happens"). There is no "given
  an observed allele frequency distribution across islands, what
  force produced it?" or "given a `p₁ = 0.12` post-bottleneck, what was
  the founding population size?" or "given chi-square = 7.5, df = 1,
  what does the deviation from HWE tell you about the population?"
  Backward inference is the *entire* research move in population
  genetics and the module never asks it. Phase 3.3 addresses this for
  every narrative experiment.
- **No practice mode.** Every experiment is one-shot. Zero retrieval
  practice, zero skill automation. A student who finishes the module
  once forgets the `q̂ = √(μ/s)` formula by next week. Phase 3.1 adds
  `practice/popgen-problems.ts` as a subsystem parallel to the
  Mendelian and Linkage practice modes.
- **No molecular / physical explanation of drift as finite sampling.**
  Exp 3 says "drift is random fluctuations in allele frequency due to
  finite population size" — that's a definition, not a mechanism. The
  mechanism is: in a diploid population of size `N`, there are exactly
  `2N` alleles at each locus; the next generation is formed by drawing
  `2N` gametes from this finite pool, and the sample count of `A`
  alleles is `Binomial(2N, p)`, which has variance `2N · p(1-p)`, so
  the allele frequency has variance `p(1-p)/(2N)`. One violet callout
  stating this explicitly would fix the mechanism gap. Phase 1.3.
- **No noise literacy at different sample sizes.** Exp 3 compares
  `N = 20` vs `N = 500` (good) but only for drift dynamics, not for
  the "is this `p̂` consistent with the true `p`?" question. A student
  never sees that an observed `p̂ = 0.48` from `N = 50` and an observed
  `p̂ = 0.48` from `N = 5000` are very different statistical
  statements. Phase 1.4 (new noise-literacy sub-panel in Exp 2).
- **Exp 1 is a mechanical counting drill.** The student counts the
  genotypes off a `PopulationGrid`, plugs into `p = (2·AA + Aa)/(2N)`,
  and is told "correct." There is no discovery beat, no mechanism
  insight, no prediction. It is the pedagogical equivalent of a
  conversion-between-units drill. Phase 2.2 reshapes Exp 1 into a
  proper puzzle where the student is shown a sampled population (with
  sampling noise) from a source `p` and has to decide whether the
  sample is consistent with the source — this converts the arithmetic
  step into a real inference move.
- **Exp 2 (HWE) is rigged.** The engine's deterministic genotype
  reconstruction makes the chi-square ≈ 0 by construction (see
  CRITICAL residual above). The "discovery" is a nop. Phase 2.2
  reshapes this into a puzzle **after** Phase 2.0 fixes the engine.
- **Exp 4 (selection) has no Δp discovery beat.** The student slides a
  selection-coefficient slider and watches three parallel trajectories.
  They never have to compute Δp by hand for given `p` and `s`, and they
  never see the key insight that selection against a rare recessive is
  *almost arithmetically slow* because most `a` alleles are hiding in
  heterozygotes and thus invisible to selection. Phase 1.5 adds a "pick
  a starting `q` and a selection coefficient, predict Δp, observe
  actual Δp" prediction panel before the main simulation.
- **Exp 5 (migration) has no prediction beat.** The student runs the
  migration sim and answers "what happens to the two populations?"
  post-hoc, but never has to predict the asymptote first. A student
  could reasonably predict "they swap," "they converge to the average,"
  "they both go to 0.5 regardless of starting `p`s," or "they stay
  put" — and each is wrong in an instructive way. Phase 1.6 adds the
  prediction panel.
- **Exp 6 (mutation-selection balance) tells the student the answer
  before they can discover it.** The `q̂ ≈ √(μ/s)` formula is printed
  in a violet callout **before** the simulation runs, and then the
  observed final frequency is compared to it. The student never has
  to guess, compute, or discover the formula. Phase 1.7 moves the
  formula reveal to *after* the simulation and adds a prediction
  panel before the run.
- **Exp 7 (founder effect) is almost the best experiment in the
  module — but uses abstract `A`/`a`, and has no forward/backward
  question.** The histogram shape is correct; the student sees σ
  shrinking with larger founding groups (`σ ∝ 1/√(2N)` is called out
  in the feedback string, which is good); but the experiment is not
  framed as Hawaiian *Bidens* (the canonical plant example) and has
  no inverse question like "given this post-founding `p̂`, what was the
  founding `N`?" Phase 1.8 refloors onto *Bidens*; Phase 3.3 adds the
  inverse question.
- **No named theorems.** HWE is mentioned but not called a theorem in
  a named-callout box. Wright, Fisher, Haldane are not mentioned at
  all. Sewall Wright's name specifically should appear when drift is
  explained (he and Fisher invented drift theory in the early 1930s).
  Phase 1.9 adds named callouts throughout, same pattern as Mendelian's
  Law of Segregation callouts and Linkage's Sturtevant/Creighton
  callouts.
- **No narrative entry from Linkage.** PopGen is (per the Linkage v2
  plan) the module Linkage hands off to via a "linkage disequilibrium
  decays at rate (1−r) per generation" tease at the end of Linkage
  Exp 7. PopGen must acknowledge this handoff at its entry point — a
  small callout near the top of Exp 1 (or the new Exp 0) that says
  "You came from Linkage — the recombination frequency you just
  measured shows up again in this module as the rate at which linkage
  disequilibrium decays in populations. We won't model LD directly in
  v2.1, but it's the connective tissue." See Phase 1.10.
- **No forward tease out of PopGen.** PopGen is the end of the
  three-module curriculum tree, but it should still tease the next
  level up — either **quantitative genetics** (when many loci each
  contribute a small effect, the population-level variance in trait
  value itself evolves, and the math is the *breeder's equation*
  `R = h²S`), or **association mapping / GWAS** (which sits on top of
  linkage disequilibrium and population structure from this module
  plus the recombination frequencies from the Linkage module). Phase
  3.2 adds a tease callout at the end of the new Exp 0 or at the end
  of Exp 7.
- **Exp 1 through Exp 7 all use `setTimeout(onComplete, …)` from
  click handlers.** Same `useEffect`-migration debt Mendelian v2
  cleanup pass fixed and Linkage v2 will fix. Cleanup debt — Phase 1
  can sweep it.
- **Violet CTA contrast fails WCAG AA.** Every experiment-body
  `from-violet-500 to-violet-600` button needs bumping to
  `from-violet-700 to-violet-800`. See Phase 1.1.

These are all addressable. The scientific substrate is nearly correct
(modulo the genotype-reconstruction issue flagged above); what the
module needs is a real pedagogical and aesthetic layer on top of it,
plus the one engine fix for Exp 2.

---

## The plan: three phases

Phases are independent. Ship Phase 1 first, then decide whether to
continue. Each phase ends with one or more clean commits. Each phase
has its own verification pass.

### Phase 1 — Pedagogy tightening (1 agent session, ~1 day)

**Scope:** Text, callouts, small interactive additions inside existing
experiments, plus the replant-on-plant-examples refactor, plus the CTA
contrast fix and the Patrick Hand font load. No new shared components,
no engine changes (the Exp 2 engine fix is Phase 2's problem). Pure
pedagogy and aesthetics. High leverage, small risk.

**Items:**

#### 1.1 — CTA contrast fix (WCAG AA)

Bump every experiment-body CTA button in `PopGenModule.tsx` from
`from-violet-500 to-violet-600` to `from-violet-700 to-violet-800`
(or `bg-violet-700` flat, matching `ModuleShell.THEME.violet.button`).
Applies to every `Check`, `Simulate`, `Simulate Random Mating`, `Run 10
Replicates Each`, `Lock in prediction`, `Found 20 Populations`, and any
other violet-gradient button in the file. White text on `violet-700`
passes WCAG AA (~5.0:1); `violet-500` fails (~2.7:1).

**Why:** Accessibility correctness. Cheapest win in the whole plan.

**Implementation:** Search-and-replace `from-violet-500 to-violet-600`
→ `from-violet-700 to-violet-800`. Zero cognitive cost. Verify with
`grep from-violet-500` returning zero matches.

#### 1.2 — Replant-on-plant-examples refactor (the biggest Phase 1 item)

Every experiment moves off abstract `A`/`a` alleles onto a real plant
example. This is the single biggest `CLAUDE.md` violation in the
current module and must be fixed in Phase 1. The engine does not need
to change — only labels, colors, captions, and prose.

Experiment-by-experiment mapping:

- **Exp 1 (Allele Frequencies) → *Mimulus* anthocyanin.**
  "You're looking at a natural population of ~50 *Mimulus guttatus*
  (yellow monkeyflower) plants at a serpentine-soil site in northern
  California. At the MYB1 transcription factor locus, some plants carry
  the `M` allele that produces deep anthocyanin-red petal veins; others
  carry the `m` null allele with no anthocyanin. Count the genotypes
  and compute the allele frequency in the population." Genotypes
  `MM`/`Mm`/`mm` map to magenta/pink-magenta/cream flower colors via
  the shared `phenotypeFill` helper (or a local `POPGEN_COLORS` constant
  that Exp 1 and Exp 2 share).
- **Exp 2 (HWE) → same *Mimulus* anthocyanin example.** "Starting
  from the Exp 1 allele frequency, we model one generation of random
  mating — pollen from all `M`-carrying plants and pollen from all
  `m`-carrying plants form a random-union gamete pool, and the next
  generation draws `N = 1000` zygotes from it. What genotype
  frequencies do you predict?" Also where the engine fix (Phase 2.0)
  will land.
- **Exp 3 (Drift) → *Mimulus* in small vs. large sites.** "Compare
  two serpentine sites: a tiny roadside patch with ~20 plants and a
  larger hillside population with ~500 plants. Both start at the same
  anthocyanin allele frequency. Which one's frequency drifts more
  over 50 generations?" Keep the existing `n_reps = 10`,
  `initialFreq = 0.5`, `gens = 50` parameters and the existing
  "predict fixation count" discovery beat. Just relabel and recolor.
- **Exp 4 (Selection) → *Amaranthus* glyphosate resistance.**
  "Starting in 2005 and documented in real-time over the following
  decade, *Amaranthus palmeri* (Palmer amaranth) populations across
  the US Cotton Belt evolved glyphosate resistance in response to
  Roundup Ready soybean-and-cotton rotations. The resistant allele
  (`R`) was initially rare (`p < 0.001`) but spread rapidly under
  intense selection. Model the directional selection: dominant
  resistant allele, recessive susceptible; homozygous susceptible
  (`ss`) has fitness `1−s` under glyphosate exposure. How fast does
  the resistant allele spread, and does `s` matter?" Reusing the
  existing three-s-value comparison. The `A`/`a` in the current
  code becomes `R`/`s` (resistant / susceptible), with `R` dominant.
  The real-world hook is genuinely compelling — this is one of the
  best-documented real-time directional-selection events in any
  species.
- **Exp 5 (Migration) → *Mimulus* serpentine / non-serpentine gene
  flow.** "Two *Mimulus* populations, one on serpentine soil
  (`p_serpentine = 0.1` for a serpentine-tolerance allele) and one
  on normal soil (`p_normal = 0.9`), exchange pollen at rate `m`
  per generation via bumblebee vectors. What happens?" The engine
  model (symmetric migration) is exactly right for this case, and
  the real-world example is a textbook plant gene-flow story.
- **Exp 6 (Mutation-selection balance) → *Arabidopsis* chlorophyll
  mutants.** "Homozygous loss-of-function mutations in chlorophyll-
  biosynthesis genes in *Arabidopsis thaliana* produce albino
  seedlings that cannot photosynthesize and die before flowering (a
  nearly lethal recessive, `s ≈ 0.5 – 1.0`). Despite this strong
  selection, natural populations carry the mutant allele at low but
  detectable frequencies. Why?" Same engine parameters, relabeled.
- **Exp 7 (Founder effect) → Hawaiian *Bidens*.** "The ~19 species
  of Hawaiian *Bidens* (tarweeds / beggar-ticks) all descend from
  one or two mainland ancestors that arrived on the islands by
  long-distance seed dispersal ~5 million years ago. The founding
  population was tiny — probably fewer than 10 plants — and the
  resulting genetic bottleneck shaped every subsequent radiation.
  Simulate 'founding' 20 populations from a mainland source and see
  how different the founded populations can be." Source `p = 0.5`,
  vary founding `N`.

**Why:** Because `CLAUDE.md` requires it, and because real plant
examples are *dramatically* more compelling to students than abstract
letters. A student learning drift from "the island *Bidens* population
started with 4 plants" will remember drift. A student learning drift
from "imagine two alleles A and a" will not.

**Implementation:** Relabel prose. Rename color keys from
`{AA, Aa, aa}` to whatever the experiment's genotype notation is
(or keep the engine's internal `{AA, Aa, aa}` keys and add a
label-mapping dict at the experiment level). Add a `PLANT_EXAMPLES`
constant at the top of the file listing the mapping from each experiment
to its plant example and allele notation. Roughly 150-200 lines of
additions and renames across the 7 experiments. No engine changes.

**Verification:** Grep the module for `abstract`, `A/a`, `allele A`
— should return zero matches in prose. `grep -i "mimulus\|amaranthus\|
arabidopsis\|bidens"` should return multiple hits per mentioned
experiment.

#### 1.3 — Molecular drift callout in Exp 3

One violet callout in Exp 3, placed after the "predict fixation count"
discovery beat but before the simulation runs:

> **Drift is sampling.** In a diploid population of `N = 20` plants,
> there are exactly `40` alleles at each locus. The next generation
> is formed by drawing `40` gametes from these parents, and even when
> the true frequency is `p = 0.5`, the sampled count isn't going to
> be exactly 20 `M` and 20 `m` — just like 40 coin flips aren't
> going to land exactly 20 heads and 20 tails. The sample count of
> `M` alleles follows a binomial distribution with mean `2Np` and
> variance `2N · p(1 − p)`, so the allele *frequency* in the next
> generation has variance `p(1 − p) / (2N)`. **Smaller `N` means
> bigger variance means faster drift.** When `N = 2000`, the same
> formula gives a per-generation standard error of `√(0.25/4000) ≈
> 0.0079` — the frequency barely moves. Drift is not magic; it is
> finite-sample binomial noise in the gamete pool.

**Why:** Kills the "drift is random fluctuations" definition-without-
mechanism gap. One paragraph of real probability theory grounded in
the concrete coin-flip analogy. This is the PopGen equivalent of
Mendelian v2's "dominance is about whether one working copy is
enough" callout and Linkage v2's "crossing over is a physical
chiasma" callout. One violet callout, zero code complexity.

**Implementation:** Prose callout in `bg-violet-50 border-violet-200
text-violet-800` styling.

#### 1.4 — Noise literacy in Exp 2 ("How precise is your estimate?")

After the existing Exp 2 HWE prediction-and-simulate flow (which will
still work once Phase 2.0 fixes the engine), add a "run this at `N =
50` vs `N = 5000`" comparison panel. Both sample one generation from
`p = 0.6`. The `N = 50` run's observed `p̂` will be noticeably far
from `0.6` on any given click (standard error ≈ 0.049); the `N = 5000`
run's observed `p̂` will be very close (standard error ≈ 0.0049).

Caption: "Both populations are 'at HWE' with true `p = 0.6`. But at
small `N`, your sample `p̂` is a noisy estimate — you could easily
measure `p̂ = 0.52` or `p̂ = 0.68` just by sampling noise. At large
`N`, the estimate is tight. When you read a paper that says 'allele
frequency at this locus is 0.12 ± 0.05,' the ± is the sample's
standard error and it scales as `√(p(1−p)/(2N))`."

**Why:** Noise literacy is a transferable skill — every population
genetics paper students read later will report allele frequencies
with confidence intervals, and students who've never seen the
`1/√N` scaling with their own eyes will not develop a gut feel for
when a reported difference is meaningful. Same role as the Mendelian
"72:28 is still 3:1" panel and the Linkage "13/80 is still 17 cM"
panel.

**Implementation:** Reuse the existing `simulate` call with
different `popSize`. Render two side-by-side mini-histograms with
the observed `p̂` and the `±2 SE` band shaded. ~80 lines.

#### 1.5 — Prediction-before-selection in Exp 4

Insert a prediction step before the existing Exp 4 three-panel
selection sim. Show the student the starting frequency (`p = 0.2`, so
`q = 0.8`) and a selection coefficient (`s = 0.1`). Ask: "What is Δp
in the first generation?" Accept answers in a ± tolerance around the
closed-form prediction from the recessive-selection recursion:

```
Δp = (s · p · q²) / (1 − s · q²)
   = (0.1 · 0.2 · 0.64) / (1 − 0.1 · 0.64)
   = 0.0128 / 0.936
   ≈ 0.0137
```

After the student predicts, run one generation of the sim (with
drift disabled so the answer is deterministic), show the actual
Δp (≈ 0.014), and then run the full three-`s` comparison.

Caption on the feedback: "Selection against a rare recessive is
slow because almost all copies of the deleterious allele are hiding
in heterozygotes, where they are invisible to selection. With
`q = 0.8`, heterozygotes are `2pq = 0.32` of the population and
homozygous `aa` are `q² = 0.64` — but `2pq` of alleles sit in
heterozygotes, so selection only sees the fraction in `aa`."

**Why:** Converts Exp 4 from "run simulation, observe curve" into
"predict Δp, observe Δp, get the formula in your head." This is the
key pedagogical move for selection — students who have computed one
Δp by hand understand directional selection; students who haven't
never will.

**Implementation:** Add a `QuestionPanel` before the existing
slider + simulate flow. Use the closed-form Δp as the target with
±0.005 tolerance. Lock the prediction before revealing the answer.
~80 lines.

#### 1.6 — Prediction-before-migration in Exp 5

Insert a prediction step before the existing Exp 5 migration sim. Show
the two starting frequencies (`p₁ = 0.1`, `p₂ = 0.9`) and ask:
"After many generations of migration at rate `m = 0.05`, what will the
two populations' allele frequencies look like?" Four options:

- (a) They will swap: `p₁ → 0.9`, `p₂ → 0.1`.
- (b) They will converge to a common frequency, `p₁ = p₂ = 0.5`.
- (c) They will converge to a common frequency, but NOT exactly 0.5.
- (d) They will stay at their original frequencies indefinitely.

The correct answer is (b) for the symmetric case with these
starting frequencies. Note: (c) would be correct if the populations
had different sizes — a genuinely instructive distractor.

After the student commits, run the sim and confirm the prediction.

**Why:** This experiment's historical audit bug was migration
converging to *swapped* frequencies — the option (a) distractor is
the exact wrong mental model that bug would have produced, so calling
it out explicitly helps inoculate against the misconception. The
prediction step also makes the discovery beat real ("wait, migration
pulls them together, it doesn't swap them").

**Implementation:** Add a `QuestionPanel` before the slider + simulate
flow. Lock prediction before revealing. ~50 lines.

#### 1.7 — Reveal mutation-selection balance formula AFTER the sim

Currently Exp 6 prints the `q̂ ≈ √(μ/s)` formula in a violet callout
**before** the simulation runs. Move this reveal to **after** the
simulation, and add a prediction step before it:

> Before you run the simulation: you have an *Arabidopsis* chlorophyll
> mutant allele (`chl`) with mutation rate `μ = 10⁻⁴` (A → a forward
> mutation) and selection coefficient `s = 0.5` against the
> homozygous mutant. After many generations, what equilibrium
> frequency of the mutant allele do you expect?
>
> - (a) `q̂ = 0` (selection eliminates it)
> - (b) `q̂ = 1` (mutation dominates)
> - (c) `q̂ ≈ 0.5` (intermediate)
> - (d) `q̂ ≈ 0.014` (very low but nonzero)

Only (d) is correct (`√(10⁻⁴ / 0.5) ≈ 0.0141`), and crucially, a
student who hasn't seen the formula cannot solve (d) from (a)-(c)
by elimination — (a) is the "dominant intuition" wrong answer, (b)
is the "mutation accumulates" wrong answer, (c) is the "midpoint"
wrong answer. Only after the student predicts does the simulation
run, settle near ~0.014, and then the callout reveals the formula
`q̂ ≈ √(μ/s)` as the explanation for what just happened.

**Why:** Same move as Mendelian v2 Exp 0's particulate-vs-blending
prediction: let the student be wrong first, then show the right
answer. Exp 6 currently tells the student the answer, then runs the
sim to confirm. Reverse the order so the observation comes with a
side of surprise.

**Implementation:** Move the formula callout from above the
simulator to below it. Add a prediction panel. ~40 lines.

#### 1.8 — Refloor Exp 7 onto Hawaiian *Bidens*

Already covered in Item 1.2 (replant-on-plant-examples), but worth
calling out separately because Exp 7 also benefits from a
historical framing box. Add a stone-50 callout at the top of Exp 7:

> **The Hawaiian *Bidens* radiation.** The ~19 species of Hawaiian
> *Bidens* (tarweeds / beggar-ticks, in Asteraceae) all descend
> from one or two mainland ancestors that arrived on the islands by
> long-distance seed dispersal approximately 5 million years ago.
> The founding population was very small — likely fewer than 10
> plants — and every subsequent species in the Hawaiian radiation
> carries the genetic imprint of that bottleneck: reduced genetic
> diversity compared to mainland *Bidens*, fixed differences at
> many loci that are polymorphic on the mainland, and unusual
> allele-frequency distributions. The founder effect isn't a
> textbook hypothetical — it's a signal you can *see* in sequencing
> data from any Hawaiian *Bidens* population today. **Carlquist
> 1974** is the classic biogeographic account; **Baldwin &
> Wagner 2010** in *Annals of the Missouri Botanical Garden*
> reviews the phylogeography.

**Why:** Grounds the experiment in a real, compelling plant example
that a student can look up and keep reading about. Also gives the
experiment a *reason* (why does this matter?) beyond "let's sample
different group sizes."

**Implementation:** Stone-50 prose callout at the top of Exp 7.
Zero code complexity.

#### 1.9 — Named theorems and historical callouts throughout

Add named callouts for the key theorems and historical results, the
same way Mendelian v2 names the Laws of Segregation and Independent
Assortment and Linkage v2 names Sturtevant and Creighton-McClintock.

- **End of Exp 2: Hardy-Weinberg Theorem callout.**

  > **The Hardy-Weinberg Theorem (Hardy 1908; Weinberg 1908).** In a
  > large, randomly mating population with no selection, no migration,
  > and no mutation, allele frequencies stay constant from generation
  > to generation and genotype frequencies reach the values `p²`,
  > `2pq`, `q²` after a single generation of random mating. The
  > result was derived independently in 1908 by **G. H. Hardy**, a
  > Cambridge mathematician pressed into service by Reginald Punnett
  > over a cricket dinner to refute a bad population-level argument,
  > and **Wilhelm Weinberg**, a Stuttgart physician working on
  > twin studies. Hardy published his result as a one-page letter to
  > *Science*; it is one of the founding documents of 20th-century
  > population genetics.
  >
  > **⚠ This theorem has five assumptions** (large population,
  > random mating, no selection, no mutation, no migration). When
  > any one breaks, the population departs from HWE — and each of
  > the next five experiments breaks exactly one of them.

- **End of Exp 3: Sewall Wright's drift model callout.**

  > **Wright's drift model (Wright 1931).** In a population of finite
  > size `N`, allele frequencies fluctuate at random from generation
  > to generation because the next generation's gamete pool is a
  > finite sample from the current one. **Sewall Wright** at the
  > University of Chicago worked this out in his 1931 paper
  > *Evolution in Mendelian Populations* (*Genetics*, 16: 97-159),
  > one of the three foundational papers of theoretical population
  > genetics (along with Fisher 1930 and Haldane 1932). Wright
  > showed that the variance of `p` per generation is
  > `p(1 − p) / (2N)` — the smaller the population, the faster
  > drift operates.

- **End of Exp 4: Fisher's fundamental theorem callout (named only;
  don't derive).**

  > **Fisher on directional selection (Fisher 1930).** **R. A. Fisher**
  > in *The Genetical Theory of Natural Selection* (Oxford, 1930) laid
  > out the mathematical theory of selection on alleles of small
  > effect. Directional selection is a *deterministic* force (unlike
  > drift) and, for large populations, predictably increases the
  > frequency of the favorable allele. **J. B. S. Haldane**
  > independently derived the same selection recursions in his 1932
  > book *The Causes of Evolution*.

- **End of Exp 5: Wright's island model callout.**

  > **Wright's island model (Wright 1931, expanded 1943).** Migration
  > between populations is a homogenizing force: two populations
  > connected by gene flow at rate `m` converge toward a shared
  > allele frequency at rate `~m` per generation. Wright used this
  > model to develop the `F_ST` statistic for measuring population
  > structure. Modern conservation genetics still uses Wright's
  > model to decide when two populations are functionally connected.

- **End of Exp 6: Mutation-selection balance callout** (after the
  Phase 1.7 reorder):

  > **Mutation-selection balance.** In the absence of all other
  > forces, the equilibrium frequency of a deleterious recessive
  > allele under recurrent mutation is `q̂ ≈ √(μ/s)`. This is why
  > deleterious recessive alleles persist at low but nonzero
  > frequencies in real populations — the mutation pressure forces
  > new copies into every generation at rate `μ`, and selection
  > removes them at rate `s · q²`, and the balance between these
  > two opposing forces is an equilibrium. *Arabidopsis* chlorophyll
  > mutants at `q ≈ 0.014` in our simulation above would correspond
  > to approximately `1` in `5000` alleles being mutant — exactly
  > the order of magnitude seen in real sequencing surveys.

- **End of Exp 7: founder-effect callout** (adding the historical
  framing from Item 1.8 — they go together).

**Why:** Naming the theorems and the historical figures attaches
concept to context. A student who leaves the module knowing "Hardy
1908" and "Wright 1931" and "Fisher 1930" has a skeleton to hang
everything else on; a student who just sees formulas does not.

**Implementation:** Five prose callouts in the respective
experiments. Zero code complexity.

#### 1.10 — Narrative handoff from Linkage

Add a small callout near the top of Exp 1 (or the future Exp 0)
acknowledging the Linkage → PopGen handoff, mirroring the tease
Linkage v2 Phase 1.7 will add at the end of Linkage Exp 7:

> **Coming from the Linkage module?** Good — population genetics
> is where the recombination frequency you just learned to measure
> shows up again. When two alleles at linked loci travel together
> in a population for many generations, they build up a correlation
> called **linkage disequilibrium** (LD). LD decays over time at a
> rate proportional to `1 − r`, where `r` is the recombination
> frequency between the loci — so tightly-linked loci can stay in
> LD for thousands of generations, while loosely-linked loci
> randomize within dozens. We won't model LD explicitly in this
> v2.1 of the module, but it's the connective tissue into
> association mapping and QTL — see the "What's next" tease at
> the end of Exp 7.

**Why:** Narrative continuity across modules. If a student took
Mendelian → Linkage → PopGen in sequence, they should feel the
thread between modules, not discontinuous topic switches.

**Implementation:** Prose callout. Zero code complexity.

**Phase 1 total scope:** ~500 lines of additions and rewrites in
`PopGenModule.tsx`. Plus a small `popgen.html` Patrick Hand font-load
update. No new components, no engine changes. One agent session.
Should compile cleanly and deploy without risk.

---

### Phase 2 — Engine fix + mental model component + puzzle rework (2-3 agent sessions, ~2-3 days)

**Scope:** The single biggest missing visual in the PopGen module — the
allele-frequency trajectory visualizer. Plus the Exp 2 engine fix
(the CRITICAL residual flagged above). Plus reshaping one existing
demo-shaped experiment into a puzzle-shaped one.

#### 2.0 — Engine fix: decouple `p` from genotype reconstruction

**Prerequisite for 2.2.** Fix the deterministic-genotype-reconstruction
bug described in the Current State "CRITICAL residual" section above.

**Options considered:**

- **Option A (preferred):** Add a new function `sampleZygotes(N, p)`
  to `popgen-engine.ts` that draws `N` multinomial samples from
  `[p², 2pq, q²]`. This function already exists at `popgen-engine.ts:39`
  as `sampleGenotypes` — it's used to initialize the population but
  not called anywhere inside the main loop. Export it. Then have Exp 2
  call `sampleZygotes(1000, 0.6)` directly for its HWE demonstration,
  bypassing the main `simulate` loop entirely. The main `simulate`
  loop stays unchanged (its per-generation genotype field is still
  deterministic, which is correct for the `FrequencyChart` trajectory
  displays that only need `p`, not genotype counts).
- **Option B:** Change the main `simulate` loop to track alleles only
  (a scalar `p` plus `popSize`), and compute genotypes lazily at
  display time via a multinomial draw. This is cleaner but invasive —
  every consumer of `genotypeHistory` would need updating.
- **Option C:** Replace the `round(N·p²)` reconstruction with a
  `sampleGenotypes(N, p)` multinomial draw inside the loop. This
  reintroduces the "post-WF resampling" pattern the audit explicitly
  removed — don't do this.

**Go with Option A.** Minimal invasiveness, fixes the Exp 2 rigging,
keeps the drift-trajectory engine correct, and `sampleGenotypes` is
already written.

**Also add a verification script** at
`scripts/popgen/verify-hwe-test.ts`:

- Run 10,000 independent calls to `sampleZygotes(1000, 0.5)`.
- For each, compute chi-square against HWE expected
  `[N·p², N·2pq, N·q²]`.
- Check that the distribution of chi-square values is consistent with
  a chi-square-with-df=1 distribution: mean ≈ 1, P(χ² > 3.84) ≈ 0.05.
- Print the mean chi-square and the P(χ² > 3.84) fraction. If the
  ratios are off by more than ~15%, fail loudly.
- Paste results into the commit message.

**Also add a verification script** at
`scripts/popgen/verify-drift-variance.ts`:

- Run 10,000 independent one-generation simulations at
  `N ∈ {20, 100, 500}` starting at `p₀ = 0.5`.
- Measure the sample variance of `p₁` across replicates.
- Compare to the closed-form `p₀(1−p₀)/(2N) = 0.25/(2N)`, i.e.
  `{0.00625, 0.00125, 0.00025}`.
- The measured/expected ratio should be `1.0 ± 0.05` for each `N`.
- Also measure the fixation rate at `N = 20, p₀ = 0.5, gens = 500`
  across 10,000 replicates and confirm that ~50% fix `A` and ~50%
  fix `a` (neutral fixation probability = `p₀`).
- Paste ratios into the commit message.

**Why:** Makes Exp 2 a real test instead of an identity; also
locks the engine's drift behavior against the closed-form
prediction so future edits can't silently break it. Required by
`CLAUDE.md`'s engine-verification rule.

**Implementation:** Add `export` to `sampleGenotypes`, rename to
`sampleZygotes` for clarity, update `simulate` to use it at init
(that's the one existing caller). Add two new verification scripts
in `scripts/popgen/` (new directory, matching Mendelian's
`scripts/mendelian/` pattern). ~50 lines of engine change, ~100 lines
of verification scripts.

#### 2.1 — `AlleleTrajectoryVisualizer` shared component

The PopGen equivalent of `GameteVisualizer` (Mendelian Phase 2.1) and
`CrossoverVisualizer` (Linkage Phase 2.1). A new shared component in
`src/curriculum/components/` that is the mental-model visualization
for the entire module.

**Behavior:**

- Takes a set of simulation parameters (`N`, `p₀`, `s`, `m`, `μ`,
  `generations`, `nReplicates`) and renders the resulting allele-
  frequency trajectories for `nReplicates` independent populations
  on a single line plot.
- Controls:
  - `N` slider: discrete stops at `20, 100, 500, 2000, 10000`.
  - `p₀` slider: `0.05, 0.1, 0.25, 0.5, 0.75, 0.9, 0.95`.
  - `s` slider: `0, 0.01, 0.05, 0.1, 0.3` (selection coefficient
    against `aa`).
  - `m` slider: `0, 0.01, 0.05, 0.1` (migration rate; requires a
    `migrantFreqA` selector to be meaningful).
  - `μ` slider: `0, 10⁻⁴, 10⁻³, 10⁻²` (forward mutation rate).
  - `nReplicates`: `5, 10, 50`.
  - `generations`: `10, 50, 100, 500, 1000`.
- "Run" button simulates all `nReplicates` populations and plots them
  simultaneously. Each replicate is a thin line (`strokeWidth` 1 for
  `nReplicates > 5`, 1.5 otherwise), with opacity `0.4` for the larger
  counts so the visual density reads.
- Hover on any line shows `p` at generation `g` in a tooltip.
- "New replicates" button re-samples without changing parameters.
- Toggles: "show HWE band" (shades the `p₀ ± 2 · SE` band around
  the starting frequency for one generation of Wright-Fisher
  sampling), "show mean trajectory" (plots the ensemble mean across
  replicates as a thick line on top).
- Optional: "show fixation events" — dots on the top/bottom axis
  at the generation where each replicate fixed, if any. Nice but
  not required for v2.1.
- **`prefers-reduced-motion` fallback:** skips the animated fill-in
  and renders the final state instantly.
- **Crucially: delegates to the engine.** The component must not
  reimplement Wright-Fisher sampling — it calls
  `simulateReplicates` from `popgen-engine.ts` for the actual math.
  The visualization is a *display layer* on top of the engine's
  stochastic output; no `Math.random()` inside the visualizer for
  sampling decisions.
- Reuses in **Exp 3** (drift at different `N` — the current
  `FrequencyChart` is replaced by this), **Exp 4** (selection at
  different `s`), **Exp 5** (migration), and **Exp 6**
  (mutation-selection balance). Same component, different preset
  parameters. Also available as a standalone sandbox in a new
  Phase 3 "Playground" tab (or embedded at the end of Exp 7).

**Why:** This is the mental-model component for PopGen. Students
who see 10 drift trajectories fanning out at `N = 20` and then
immediately see 10 trajectories at `N = 2000` barely moving will
understand drift variance in a way no amount of formula memorization
can produce. Students who can sweep `s` from 0 to 0.3 and watch the
selection curves steepen will internalize that directional selection
is a deterministic force. Build this component once, reuse it across
four experiments and the practice mode.

**Implementation:**

- New file `src/curriculum/components/AlleleTrajectoryVisualizer.tsx`
  (~500-700 lines with SVG rendering, hover interactions, controls).
- Uses Framer Motion if already in `package.json` (verified by the
  Mendelian v2 build to be present; confirm again before starting).
  Otherwise CSS transitions.
- Exported from `components/index.ts`.
- Delegates to `simulateReplicates(config, nReps)` in
  `popgen-engine.ts`.
- Style-matches the existing `FrequencyChart` (same SVG layout,
  same violet palette, same axis labels) but scales up to 50
  trajectories and adds interactive controls.
- A `AlleleTrajectoryVisualizerDemo.tsx` dev harness showing a
  drift-at-`N=50` configuration cycling every 3 seconds. Matches
  the pattern of `GameteVisualizerDemo.tsx`. Used for verification.
- An on-screen counter in the demo harness: "measured variance of
  `p` at generation 1 over last 100 runs vs. closed-form
  `p(1−p)/(2N)`." If the ratio drifts from 1.0, the engine is
  wrong.

**Verification:** Open the demo harness and watch 50 cycles. Does
the observed variance match closed-form? Does the hover tooltip
show the right `p` at generation `g`? Do the controls update the
plot on release without jank? Does `prefers-reduced-motion` skip
the fill-in?

#### 2.2 — Exp 2 HWE real-puzzle rework

Depends on 2.0 landing first. Exp 2 is currently a "predict `p²`,
`2pq`, `q²`, run sim, confirm" demo. Reshape it into a reasoning
puzzle where the student has to **decide whether an observed
population is in HWE** via chi-square.

**New flow:**

1. **Prediction (kept from v1):** Given `p = 0.6`, predict the
   three HWE genotype frequencies. Validate. Unlock the next step.

2. **Observation (new, using the engine fix):** Call the new
   `sampleZygotes(1000, 0.6)` function to get a single stochastic
   sample of 1000 zygotes. Display the observed counts (with
   real noise — e.g. `{MM: 358, Mm: 486, mm: 156}` rather than
   the deterministic `{360, 480, 160}`). Compute `p̂` from the
   observed counts (which will drift ~0.003 from `0.6`).

3. **Chi-square puzzle (new):** Show the observed counts in a
   table alongside the HWE-expected counts (computed from the
   *observed* `p̂`, which is the correct null for a single-
   population HWE test). Walk the student through the chi-square
   formula and compute it live. Ask: "Is this population in HWE?"
   Four options:
   - (a) Yes — `χ² = 0.7, p = 0.40`, fail to reject.
   - (b) No — `χ² = 12.3, p < 0.001`, reject.
   - (c) Yes — the sample matches expected perfectly.
   - (d) Cannot tell without more data.

   With real sampling noise, (a) will be correct most of the
   time; occasionally (b) will be correct by chance (one run in 20
   at `α = 0.05`). The correct answer is computed from the live
   observation, so validation is deterministic per-run.

4. **Teaching feedback on each wrong answer:**
   - (b) when (a) is correct: "Not quite — the observed chi-square
     is well below the 0.05 critical value of `3.84`, so we fail
     to reject. Sample noise at `N = 1000` is enough to produce
     small deviations from exact HWE without meaning the
     population is structured."
   - (c): "The sample never matches expected *perfectly* — there
     is always sampling noise. HWE is a statistical null
     hypothesis, not a prediction that observed equals expected
     to the decimal place."
   - (d): "We have plenty of data — `N = 1000` gives a chi-square
     test with good power. What we *can* tell is whether the
     observed deviations are bigger than sampling noise."

5. **Follow-up prediction:** "What happens if we add selection
   against `mm` (fitness 0.5)?" Re-run Exp 2 with `fitnessaa = 0.5`
   for one generation. Now the post-selection genotypes violate
   HWE (excess `MM` and `Mm`, deficit `mm`). Compute chi-square
   live; it should now be significantly > 3.84, and the correct
   answer is "No, this population is not in HWE." Teaching point:
   "HWE breaks when any of the five assumptions break. You just
   broke the 'no selection' assumption."

**Why:** Converts the experiment from "recite the HWE formula" into
"use HWE as a statistical null and decide whether a population fits
it." That is the actual research use of HWE — geneticists do not
memorize `p²`, `2pq`, `q²`; they run chi-square tests and ask whether
their observed population deviates. The experiment as currently
structured does not teach this.

**Implementation:** Refactor `Exp2_HardyWeinberg`. Requires the
Phase 2.0 engine fix (`sampleZygotes`). ~150 lines of rewrite.

#### 2.3 — Wire `AlleleTrajectoryVisualizer` into Exps 3, 4, 5, 6

Replace the local `FrequencyChart` in Exp 3 with the new shared
`AlleleTrajectoryVisualizer`, preset to the drift configuration
(`N ∈ {20, 500}`, `p₀ = 0.5`, `nReps = 10`, `gens = 50`). Keep the
existing predict-fixation-count discovery beat in Exp 3 — don't
regress that.

Same for Exp 4 (preset to selection configuration), Exp 5 (preset
to migration configuration with a new "two populations" mode on the
visualizer), and Exp 6 (preset to mutation-selection balance).

Exp 5 requires the visualizer to support a "two separate populations
with migration between them" mode. Since the existing engine's
`simulate` function models a single population with migration *in*
(from an abstract migrant pool), and Exp 5's current code does the
two-island recursion inline (not via the engine), the visualizer
will need to either (a) embed the two-island recursion directly, or
(b) call `simulate` twice with cross-linked migrant frequencies
per generation. Option (b) is cleaner but requires a per-generation
update hook. Pick (a) for v2.1 — the two-island model is simple
enough to inline without muddying the general visualizer.

**Why:** One mental model for the whole module. Students who learn
the visualizer in Exp 3 should find Exps 4-6 use the same widget
with different parameters.

**Implementation:** Delete `FrequencyChart` local component. Replace
its four uses with `AlleleTrajectoryVisualizer`. ~100 lines of
refactor.

**Phase 2 total scope:** One engine fix (~50 lines + 100 lines of
verification scripts), one major new component (~600 lines), one
major experiment rework (~150 lines), one wiring pass (~100 lines).
Four commits. Two to three agent sessions depending on how much
iteration the trajectory visualizer takes. **The trajectory
visualizer is the single most impactful visual addition in the
entire plan — take time to get it right, especially the hover
interactions and the replicate-count density readability.**

Coordination note: Phase 2.0 (engine fix) **must land before** Phase
2.2 (Exp 2 rework) because 2.2 depends on `sampleZygotes`. Phase
2.1 (visualizer) touches disjoint files and can run in parallel with
2.0, but 2.3 (wiring) must wait for 2.1 to land. Suggested order:

- **Agent 2A:** Phase 2.0 engine fix + verification scripts
  (engine file only).
- **Agent 2B (parallel with 2A):** Phase 2.1 trajectory visualizer
  (components files only).
- **Agent 2C (after 2A + 2B):** Phase 2.2 Exp 2 rework + 2.3 wiring
  (module file only, depends on both prior agents).

---

### Phase 3 — Subsystems and historical framing (2-3 agent sessions, ~3-4 days)

**Scope:** The biggest investment. Adds a completely new practice
subsystem parallel to Mendelian's and Linkage's, a new historical
Exp 0, and backwards problems throughout the narrative experiments.

#### 3.1 — Practice Mode subsystem for PopGen

A second sidebar tab alongside the 7-experiment narrative. Duolingo-
flavored rapid practice for PopGen-specific problem types. Same
architecture as Mendelian v2's `practice/` subfolder and Linkage v2's
planned practice subfolder — problem generators, spaced-repetition
scheduler, session UI, `localStorage` persistence.

**Behavior:** Identical in shape to the Mendelian practice mode. 10
questions per session, ~30 seconds per question, interleaved across
problem types, spaced repetition with ease factors, streak counter,
end-of-session scorecard with weakest concept called out, confetti-on-
10/10. No XP, no leaderboards.

**Problem types (v2.1 starter set — 5 types, same count as Mendelian
and Linkage):**

1. **Forward HWE.** Given `p = 0.3` (numeric prompt), predict the
   three HWE genotype frequencies. Numeric answer for each. Tolerance
   ±0.02.
2. **Backward HWE.** Given genotype counts `{MM: 90, Mm: 420,
   mm: 490}` (total 1000), compute `p̂` and decide whether the
   population is in HWE. Numeric answer for `p̂` plus yes/no
   decision. Accept a single correct answer (computed live from
   the generated counts).
3. **Drift scale.** Given two trajectories (rendered as small line
   charts) with different `N`, pick which one has smaller `N`. No
   math — this is a "read the graph" transfer test for noise
   literacy, analogous to Mendelian's "which of these 4 histograms
   is 3:1 with noise?" problem type.
4. **Selection Δp.** Given `p = 0.1, s = 0.2` and selection against
   `aa`, predict the magnitude of Δp in one generation. Closed form:
   `Δp = spq² / (1 − sq²) = 0.2 · 0.1 · 0.81 / (1 − 0.2 · 0.81)
   = 0.0162 / 0.838 ≈ 0.0193`. Numeric answer with tolerance ±0.005.
5. **Migration convergence.** Given two populations at `p₁ = 0.2,
   p₂ = 0.8` exchanging alleles at rate `m = 0.05`, what common
   frequency do they converge to (symmetric, same `N`)? Numeric
   answer `0.5`, tolerance ±0.01. Distractors include `0.2`, `0.8`,
   and "they never converge."

Start with types 1, 2, 4, 5, plus one "recognize drift vs selection
trajectory" forward problem (similar to type 3 but forward-direction,
asking which trajectory is drift-only vs selection-only). Add types
for mutation-selection balance, founder-effect variance scaling,
neutral-fixation probability, and chi-square interpretation in
subsequent passes.

**Implementation:**

- New file `src/curriculum/practice/popgen-problems.ts` — problem
  generators parallel to Mendelian's `problems.ts` (and Linkage's
  future `linkage-problems.ts`). Each function produces a randomized
  instance of a problem type.
- Extend `src/curriculum/practice/PracticeMode.tsx` to accept a
  `problems` prop so the same session UI can serve Mendelian,
  Linkage, and PopGen. If the refactor is too invasive at the
  time Phase 3 runs (i.e. if Linkage has already shipped a
  `LinkagePracticeMode.tsx` split instead), create
  `PopGenPracticeMode.tsx` following the same pattern.
- Sidebar modification in `ModuleShell.tsx` to mount the Practice
  tab for PopGen, themed violet.
- `localStorage` key prefix: `popgen.practice.*`, `popgen.streak`,
  `popgen.ease.{concept}`. Keep all three modules' stats separate.

**Design notes:**

- Match the violet theme of the PopGen narrative.
- Respect the same no-gambling rules as Mendelian and Linkage.
- Problems that reference numeric `p̂` values must accept both the
  sampled value and the textbook value (dual-tolerance pattern from
  Linkage Exp 3).
- Problem distractors should never be absurd. Use plausible-wrong
  answers. Same rule as the other two modules.

**Verification:** Run a 10-question session end-to-end. Does
interleaving rotate through the 5 starter types? Does the streak
survive a page reload? Does `localStorage` persist per-module
(Mendelian and Linkage streaks unaffected by PopGen practice)?

#### 3.2 — Experiment 0: Hardy 1908 + Weinberg 1908

A new experiment before Exp 1 that stages the 1908 moment population
genetics was born.

**Flow:**

1. **Historical framing:**

   > It's 1908. Gregor Mendel's 1865 pea paper has been rediscovered
   > for eight years, the word "gene" has just been coined by Wilhelm
   > Johannsen, and biologists are wrestling with a seemingly obvious
   > question: **if dominant alleles really are dominant, shouldn't
   > they eventually take over the population?** After all, in every
   > cross where a dominant allele is present, it wins the phenotype.
   > Surely, over many generations, dominance should swamp recession
   > and every population should reach 100% dominant phenotype.
   >
   > Over a cricket dinner at Cambridge, the Mendelian geneticist
   > **Reginald Punnett** mentions this puzzle to his cricketing
   > companion **G. H. Hardy**, who is one of the most celebrated
   > pure mathematicians in Britain and who *detests* applied
   > mathematics on principle. Hardy is annoyed enough to write a
   > one-page letter to *Science* essentially under protest, titled
   > *"Mendelian Proportions in a Mixed Population,"* explaining
   > the answer in algebra a first-year probability student would
   > understand. The letter appears in volume 28 of *Science*,
   > July 10, 1908, pages 49–50. In Stuttgart, the physician
   > **Wilhelm Weinberg** derives the same result independently
   > earlier the same year, presenting it in German to a regional
   > natural-history society. The result is now called the
   > **Hardy-Weinberg Theorem**, and it is the single most
   > important mathematical result in population genetics.

2. **Prediction panel:** "Punnett's intuition says dominant alleles
   should take over. You start with a population at `p(M) = 0.5`
   (equal frequencies of anthocyanin-producing `M` and non-
   producing `m` alleles), where `M` is dominant over `m`. After
   many generations of random mating (with no drift, no selection,
   no migration, no mutation), what do you predict?"
   - (a) `p(M)` rises toward 1.0 (dominance wins eventually).
   - (b) `p(M)` stays at 0.5 indefinitely.
   - (c) `p(M)` falls toward 0.0 (recessives eventually win).
   - (d) Cannot predict without more information.

   The intuitive wrong answer is (a) — many real students pick it.
   The correct answer is (b). Lock the prediction before revealing
   the answer.

3. **Observation:** Run one generation of the engine with `N =
   10000` (large enough to be essentially drift-free), `p₀ = 0.5`,
   no selection. Show the observed `p₁ ≈ 0.5`. Run 20 more
   generations. Show the trajectory is flat — exactly what Hardy
   and Weinberg predicted.

4. **Reveal:**

   > Hardy's one-page algebra. If the allele frequency is `p`, then
   > under random mating the gamete pool has frequency `p` for `M`
   > and `q = 1 − p` for `m`. Random union of gametes produces
   > zygotes at frequencies `p² : 2pq : q²` — the binomial
   > expansion. The total frequency of `M` in the next generation,
   > counting alleles from both parents, is:
   >
   > `p' = (2 · p² + 2pq) / (2 · (p² + 2pq + q²)) = p² + pq = p(p + q) = p · 1 = p`.
   >
   > **The frequency doesn't change.** Dominance describes
   > phenotype expression, not allele transmission — and Mendelian
   > inheritance at a single locus is frequency-conservative by
   > construction. This is the first theorem of population
   > genetics.

5. **Exit question:** "Why does Hardy's one-page letter matter
   beyond settling a dinner dispute?"
   - (a) It proves that evolution cannot happen under Mendelian
     inheritance. **Wrong** — evolution needs one of the five
     HWE assumptions to break, which any real population has.
   - (b) It provides a null hypothesis: a population that is not
     evolving should have frequencies stable at `p² : 2pq : q²`.
     Any deviation from this is evidence that one of the five
     forces is operating. **Correct** — this is why every
     population-genetics paper starts with a chi-square test.
   - (c) It proves that dominant alleles become more common over
     time. **Wrong** — the whole *point* is the opposite.
   - (d) It shows that Mendelian inheritance is wrong. **Wrong**.

   Feedback on (b): "You just learned the single most important
   move in population genetics: **Hardy-Weinberg is the null**.
   Every experiment in this module breaks one of Hardy's five
   assumptions, and we'll use HWE as the baseline against which
   we detect each force — drift (Exp 3), selection (Exp 4),
   migration (Exp 5), mutation-selection balance (Exp 6), founder
   effect (Exp 7)."

6. **Tease out:** A final callout:

   > **What's next after PopGen?** The next level up from here
   > is **quantitative genetics** — when many loci each contribute
   > a small effect, the population-level *variance* in trait
   > value itself evolves, and the math is the **breeder's
   > equation** `R = h² S` (Lush 1937). It is also the
   > intellectual foundation of modern plant and animal breeding
   > programs — the reason every hybrid maize variety in the US
   > exists. Adjacent: **association mapping / GWAS**, which sits
   > on top of the linkage disequilibrium you met briefly in
   > the Linkage module plus the population structure you met in
   > this module.

**Why:** Frames the PopGen module the way Mendelian v2 frames
Mendel (Exp 0: Particulate vs Blending) and Linkage v2 frames the
Creighton-McClintock proof (Exp 0: Creighton & McClintock 1931) —
as a scientific revolution, not a set of formulas to memorize.
Gives students a reason to care about `p² + 2pq + q²` before they
are asked to use it. Hardy 1908 is the PopGen equivalent of Mendel
1865 and it deserves its own experiment.

**Implementation:** New experiment `Exp0_HardyWeinberg1908` in
`PopGenModule.tsx`, inserted at index 0 of `EXPERIMENTS`,
renumbering the rest. Uses the existing engine, the new
`AlleleTrajectoryVisualizer` for the 20-generation stability demo,
and the existing `QuestionPanel`. Pure addition, ~250 lines. No new
shared components.

#### 3.3 — Backward problems throughout

For each of the seven narrative experiments (Exp 1-7 after renumber),
add a backward question panel after the forward one. Reuse existing
simulation data where possible. Gate `onComplete` on the backward
question using the latched `forwardEverCorrect` pattern from Mendelian
v2 cleanup pass 3.

**Examples (verify against final content during implementation):**

- **Exp 1 (Allele Frequencies).** Forward: compute `p` and `q` from
  the population grid. Backward: "A population has `p̂ = 0.12` for
  an herbicide-resistance allele. If you sampled `N = 100` plants
  and sequenced all 200 alleles, approximately how many resistant
  alleles would you expect to see? And what's the standard error
  of this estimate?" Correct: ~24 alleles, SE =
  `√(p(1−p)/(2N)) ≈ 0.023` or about 4.6 alleles.
- **Exp 2 (HWE).** Forward: predict HWE frequencies from `p`.
  Backward: "You sample 1000 plants and observe
  `{MM: 100, Mm: 200, mm: 700}`. Compute `p̂` and decide whether
  this population is in HWE." Correct: `p̂ = 0.2`, expected
  `{40, 320, 640}`, `χ² ≈ 113` — strongly reject HWE, deficit of
  heterozygotes suggests inbreeding or population structure.
- **Exp 3 (Drift).** Forward: predict fixation count for `N = 20`
  replicates. Backward: "An island population fixed the `m`
  allele at generation 15 starting from `p₀ = 0.5`. Another fixed
  `M` at generation 22. A third has not fixed after 50
  generations. What can you conclude about these three
  populations?" Correct: they are stochastic outcomes of the same
  drift process; no single trajectory is informative about
  population size, but the *variance* across replicates is.
- **Exp 4 (Selection).** Forward: predict Δp from `s` and `q`.
  Backward: "You observe an allele frequency rising from `p = 0.2`
  to `p = 0.6` over 20 generations in a field population.
  Estimate the selection coefficient if this is due to directional
  selection on a dominant allele." Numeric answer with tolerance
  (approximate `s ≈ 0.1 – 0.2`). Teaching feedback walks through
  the `Δp` recursion or the logit-transformation shortcut.
- **Exp 5 (Migration).** Forward: predict convergence. Backward:
  "Two populations start at `p₁ = 0.0` and `p₂ = 1.0`. After 30
  generations of symmetric migration at rate `m = 0.05`, they
  are at `p₁ = 0.38` and `p₂ = 0.62`. Is this consistent with
  the migration-only model, or is something else going on?"
  Correct: consistent (the symmetric model predicts they asymptote
  to 0.5 but the approach is exponential, so at generation 30
  with `m = 0.05` they are still en route — specifically,
  `p₁(30) = 0.5 − 0.5 · (1 − 2m)^30 ≈ 0.5 − 0.5 · 0.047 ≈ 0.38`).
- **Exp 6 (Mutation-selection balance).** Forward: predict
  equilibrium `q̂`. Backward: "You observe a recessive deleterious
  allele at `q̂ = 0.02` in a large population. If the selection
  coefficient is `s = 0.5`, what is the mutation rate `μ`?"
  Correct: `μ = s · q̂² = 0.5 · 0.0004 = 2 × 10⁻⁴`.
- **Exp 7 (Founder effect).** Forward: predict spread vs founder
  size. Backward: "A founded population has `p̂ = 0.7` for an
  allele that was at `p = 0.5` on the mainland. The ancestral
  mainland sample size is in the hundreds but the founding group
  size is unknown. What founding `N` is most consistent with this
  deviation?" Correct: compute from `(0.7 − 0.5)² ≈ p₀(1−p₀)/(2N)`
  → `N ≈ 0.25 / (2 · 0.04) ≈ 3` (a founding population of ~3
  individuals). Teaching feedback notes this is a rough point
  estimate, not an interval, and real analyses use a likelihood
  framework.

**Why:** Backward problems are where real population genetics
research lives. Every published pop-gen paper starts with observed
allele frequencies and infers underlying forces. Forward-only
teaching prepares students for exam questions but not research.

**Implementation:** Add a latched `forwardEverCorrect` bool to
each experiment, add a backward `QuestionPanel` below each forward
panel, gate `onComplete` on the backward answer. ~30 lines per
experiment × 8 experiments (including the new Exp 0) = ~240 lines
total.

**Phase 3 total scope:** One new subsystem (~1000 lines across new
practice files), one new Exp 0 (~250 lines), eight backward
additions (~240 lines). Three or four commits. Two or three agent
sessions.

Coordination note: Phase 3.2 (Exp 0) and Phase 3.3 (backward problems
in Exps 1-7) both touch `PopGenModule.tsx` but in disjoint regions.
3.2 prepends a new experiment at index 0; 3.3 edits the bodies of
existing experiments. They **cannot** run in parallel because 3.3
needs to renumber after 3.2 lands. Run 3.2 first, then 3.3. Phase
3.1 (practice mode) touches disjoint files (`practice/`) and can
run in parallel with either 3.2 or 3.3.

---

## Visual design system (consolidated for agent reference)

### Colors

- **Primary (violet, PopGen theme):** Experiment bodies use
  `from-violet-700 to-violet-800` gradients for CTAs (after
  the Phase 1.1 contrast fix), `bg-violet-50 border-violet-200`
  for success/teaching callouts, `text-violet-800` for correct-
  answer prose. Sidebar and header use `ModuleShell.THEME.violet`
  (`from-violet-800 to-violet-700`).
- **Secondary (violet-light):** `bg-violet-50 border-violet-200
  text-violet-800` for teaching callouts (Hardy's algebra, drift-
  is-sampling, Wright-drift-variance), prediction commitment
  inputs. Same violet family as primary — PopGen does not use a
  separate secondary color.
- **Neutral (stone):** `bg-stone-50 border-stone-200 text-stone-700`
  for informational callouts (HWE assumptions list, theorem
  definitions, historical framing boxes).
- **Error (dusty rose):** `bg-red-50 border-red-200 text-red-700`
  for wrong-answer feedback. Same shade as Mendelian and Linkage.
- **Emerald accent:** Reserved for the `Complete Module` CTA at
  the end of Exp 7 (or the "What's next" tease if added),
  echoing the "next module" convention Mendelian v2 uses
  (emerald-700 CTA linking to `linkage.html`). PopGen has no
  next module in the v2 curriculum, so this may link to a
  future quantitative-genetics module placeholder or to the
  hub.
- **Phenotype palette (new, anchored to real plant examples):**
  - *Mimulus* anthocyanin `MM` (dark magenta): `#a21caf`
  - *Mimulus* anthocyanin `Mm` (pink-magenta): `#d946ef`
  - *Mimulus* anthocyanin `mm` (cream / near-white): `#fef3c7`
    with a stone-300 border
  - *Amaranthus* resistant (`R` dominant, green vigorous): `#16a34a`
  - *Amaranthus* susceptible (`s`, wilted/brown): `#92400e`
  - *Arabidopsis* wild-type chlorophyll (`Chl`): `#15803d`
  - *Arabidopsis* albino (`chl`): `#fef9c3`
  - *Bidens* founding vs source: use a source-distance gradient
    (already done in v1 founder-effect histogram — keep the
    violet-to-red gradient as a visual "distance from source"
    signal).
- **Rule:** every phenotype label deterministically maps to a
  color. Never sort-order. `PopulationGrid` and any new widget
  should use a shared `popgenPhenotypeFill(label)` helper (add to
  `components/colors.ts` if not already there).

### Typography

- **Body:** Nunito (load via `popgen.html`; currently loaded).
- **Handwritten flavor:** Patrick Hand for Exp 0 historical
  callouts, the Hardy/Weinberg quotes, the Wright/Fisher/Haldane
  biographical notes. **Not currently loaded in `popgen.html`** —
  Phase 1 adds the font link, matching the pattern from `lab.html`.
- Same rule as Mendelian and Linkage: handwritten font for flavor
  only, never body text.

### Cards and layout

- `rounded-2xl`, `border border-stone-200 shadow-sm`, `p-6` body
  padding, `space-y-6` stacks. Match Mendelian and Linkage
  exactly.
- `HistogramChart` (already shared), the new `AlleleTrajectoryVisualizer`,
  and the existing `PopulationGrid` are the three main widget
  types in this module. No other chart types should be needed.

### Animation

- **Defaults:** Fade-in 300ms, slide 400ms, trajectory-line draw-on
  500-1500ms depending on `nReplicates`.
- **Trajectory visualizer:** Animated fill-in where each line
  draws left-to-right over ~1 second for small replicate counts
  (5-10) and instant-render for larger counts (50). Speed slider
  (0.5×, 1×, instant). `prefers-reduced-motion` skips the fill-in
  entirely.
- **Celebrations:** ≤2000ms. Subtle. Skippable. No gambling
  mechanics. Practice-mode 10/10 gets a seed-scatter confetti
  (shared with Mendelian and Linkage via
  `practice/celebration.tsx`).
- **Dependency check:** Framer Motion if already in
  `package.json` (confirmed present by the Mendelian v2 build;
  verify again before starting Phase 2).

### Icons

- Plants via shared `src/shared/icons/PlantIcon.tsx`. *Mimulus*
  flowers rendered by passing a magenta/cream `colorMap` to
  `PlantIcon`. *Amaranthus* rendered by passing a green/brown
  `colorMap`. *Arabidopsis* rendered as a rosette (if not
  already in the shared icons folder, add as a Phase 2 addition).
  No raw divs, no emoji.
- Population grids via `PopulationGrid` (local to
  `PopGenModule.tsx`) — consider promoting to `components/` in
  Phase 2 when `AlleleTrajectoryVisualizer` is added.

### Charts

- **Existing shared:** `HistogramChart`, `RatioBar`.
- **New shared in Phase 2:** `AlleleTrajectoryVisualizer` (promoted
  from and replacing the local `FrequencyChart` in this module).
- The trajectory visualizer has its own aesthetic (multi-line
  SVG plot with hover tooltips, controls panel below). Match the
  existing `FrequencyChart` axis styling (`#a8a29e` axes, `#e7e5e4`
  gridlines, violet-family line colors, `#78716c` text labels).

### Fun ground rules

- Same as Mendelian and Linkage. Yes to micro-animations, streaks,
  discovery, historical storytelling, charming copy. No to XP,
  leaderboards, random rewards.

---

## Success criteria — what "done" looks like

A student who finishes the full PopGen v2 module (Exp 0 through
Exp 7 plus ~5 practice sessions) should be able to:

1. **State the five Hardy-Weinberg assumptions without looking them
   up** — large population, random mating, no selection, no
   mutation, no migration — and name which assumption is broken by
   each of the five forces covered in Exps 3-7.
2. **Convert between allele frequencies and genotype frequencies in
   both directions.** Given `p = 0.3`, produce `{AA, Aa, aa} =
   {0.09, 0.42, 0.49}`. Given observed genotypes `{100, 420, 480}`,
   compute `p̂ = 0.31`.
3. **Recognize whether an observed population is in Hardy-Weinberg
   equilibrium** via a chi-square test computed from the sample,
   and interpret a significant deviation (excess heterozygotes,
   deficit heterozygotes, etc.) in terms of which force or mating
   system produced it.
4. **Predict the magnitude of drift** (`variance = p(1−p)/(2N)`)
   for any population size, and recognize that small populations
   drift fast while large populations barely move.
5. **Predict Δp for one generation under directional selection**
   using `Δp = spq²/(1−sq²)` (for a dominant favorable allele) or
   the simpler linear form for small `s`, and recognize that
   selection against a rare recessive is slow because the
   deleterious alleles hide in heterozygotes.
6. **State that the neutral fixation probability equals initial
   frequency** (`P(fix) = p₀`) and use this to predict outcomes
   across replicate drift simulations.
7. **Recognize migration as a force pulling two populations toward
   a common mean**, not swapping them, with asymptotic approach
   at rate `~m` per generation toward the weighted mean of the
   two source frequencies.
8. **Compute the equilibrium frequency under mutation-selection
   balance** for a deleterious recessive (`q̂ ≈ √(μ/s)`) and use
   this to explain why genetic diseases persist at low but nonzero
   frequencies in real populations despite strong selection.
9. **Identify a founder-effect signature** in a small-founding-
   population allele-frequency distribution — specifically, that
   founder variance scales as `p₀(1−p₀)/(2N)` so halving the
   founding `N` multiplies the standard deviation by `√2`, and
   that Hawaiian *Bidens* or any small-founding island system
   carries this signature.
10. **Explain why Hardy 1908 was a revolution**: a one-page
    mathematical letter that settled a real dispute by showing
    that Mendelian inheritance at a single locus produces a
    population-level frequency equilibrium, that this equilibrium
    is the statistical null against which every evolutionary
    force is measured, and that dominance describes phenotype
    expression but not allele transmission.

Right now v1 gets a student to maybe 3 of these 10 (the `p`/`q`
computation, the "drift is random" recognition, the "mutation-
selection-balance formula exists" recognition — and even the last
one is rigged because the formula is printed before the sim runs).
Phase 1 alone should reach 5-6 by adding the molecular drift
mechanism, named theorems, the Δp prediction beat, and the plant-
example refloor. Phase 2's engine fix plus trajectory visualizer
plus HWE puzzle rework should add 3, 4, and 7 (because students
finally see drift variance with their own eyes and run a real
chi-square test). Phase 3's Exp 0 and practice mode and backward
problems should add 5, 6, 9, and 10.

**If a student can do 8 of 10 after v2, we've shipped something real.**

---

## Launch instructions (for agents)

Same pattern as Mendelian v2 and Linkage v2. One phase per agent
dispatch. Each agent reads `CLAUDE.md`, the relevant section of this
plan, and the source file(s) it will edit, in that order. Each
agent commits its own work. No phase skips `tsc -b` or `vite build`.

### Launching Phase 1 (recommended first)

Dispatch a single agent with this brief:

> Read `docs/POPGEN_V2_PLAN.md` — Phase 1 section. Read `CLAUDE.md`
> at the repo root. Read `src/curriculum/PopGenModule.tsx` end to
> end. Read `src/curriculum/popgen-engine.ts` (do NOT edit it in
> Phase 1 — that's Phase 2's engine-fix agent).
>
> Implement Phase 1 items 1.1 through 1.10 in
> `src/curriculum/PopGenModule.tsx` plus the Patrick Hand font
> load in `popgen.html`. No new shared components, no engine
> changes. Respect the violet theme, `violet-700` for all CTAs
> (WCAG fix), violet-50 for teaching callouts, plant slash
> notation throughout.
>
> The biggest item is **1.2 — replant on real plant examples**.
> Every experiment moves off abstract `A`/`a` onto a real plant:
> Exps 1-3 use *Mimulus* anthocyanin, Exp 4 uses *Amaranthus*
> glyphosate resistance, Exp 5 uses *Mimulus* serpentine gene
> flow, Exp 6 uses *Arabidopsis* chlorophyll mutants, Exp 7 uses
> Hawaiian *Bidens*. The engine does not change — only labels,
> colors, prose, and the genotype-display mapping. See the plan
> for full per-experiment detail.
>
> Verify: `npx tsc -b` clean. Grep for `from-violet-500` —
> should return zero matches after 1.1. Grep for plant example
> names — `mimulus`, `amaranthus`, `arabidopsis`, `bidens` —
> should each appear multiple times. Grep for the text
> `allele A` or `A and a` in prose — should return zero matches
> (except possibly inside internal engine code, which is OK).
>
> Commit with a clear multi-line message explaining what each
> item does. Do not commit to `popgen-engine.ts`, `components/`,
> or anything outside `PopGenModule.tsx` and `popgen.html`.

### Launching Phase 2

Three agents. Phase 2.0 (engine) and 2.1 (visualizer) run in
parallel because they touch disjoint files. Phase 2.2 + 2.3 (Exp 2
rework + wiring) run after both 2.0 and 2.1 land.

**Agent 2A (Engine fix — CRITICAL residual):**

> Read `docs/POPGEN_V2_PLAN.md` — Phase 2 item 2.0. Read
> `CLAUDE.md` at the repo root, especially the section on engine
> verification scripts. Read `src/curriculum/popgen-engine.ts`
> end to end and confirm you understand the deterministic
> genotype reconstruction issue described in the plan.
>
> Export the existing `sampleGenotypes` function under the name
> `sampleZygotes` (keep a backward-compat alias if any caller
> outside the engine uses the old name — verify by greppping).
> Leave the main `simulate` loop's drift mechanics unchanged
> (single `binomial(2N, p)` draw per generation — do NOT add a
> second resampling step, that was the old critical bug).
>
> Add two verification scripts in a new `scripts/popgen/`
> directory:
>
> - `verify-hwe-test.ts` — 10,000 `sampleZygotes(1000, 0.5)`
>   calls; compute chi-square of each against HWE expected;
>   verify mean ≈ 1, P(χ² > 3.84) ≈ 0.05.
> - `verify-drift-variance.ts` — 10,000 one-generation sims at
>   `N ∈ {20, 100, 500}, p₀ = 0.5`; measure variance of `p₁`,
>   compare to `p₀(1-p₀)/(2N)`. Also measure fixation rate
>   across 10,000 long runs at `N = 20, p₀ = 0.5, gens = 500`
>   and verify it's ≈ 0.5 (neutral fixation probability equals
>   starting frequency).
>
> Run both scripts. Paste the measured/expected ratios into
> the commit message body.
>
> Only `popgen-engine.ts` and new `scripts/popgen/*.ts` change.
> Do NOT edit `PopGenModule.tsx` or any component file.

**Agent 2B (AlleleTrajectoryVisualizer — parallel with 2A):**

> Read `docs/POPGEN_V2_PLAN.md` — Phase 2 item 2.1. Read the
> existing `GameteVisualizer.tsx` (from Mendelian v2) and the
> local `FrequencyChart` component in `PopGenModule.tsx` as
> reference implementations. Check `package.json` for Framer
> Motion (should already be present from Mendelian v2).
>
> Create
> `src/curriculum/components/AlleleTrajectoryVisualizer.tsx`
> with the behavior described in the plan — `N`, `p₀`, `s`,
> `m`, `μ`, `nReplicates`, `generations` controls, multi-line
> SVG plot with hover tooltips, "show HWE band" and "show mean
> trajectory" toggles, `prefers-reduced-motion` handling.
> Delegate to `simulateReplicates` from `popgen-engine.ts` for
> all stochastic draws — do NOT reimplement Wright-Fisher
> sampling inside the component. Export from
> `components/index.ts`.
>
> Create `AlleleTrajectoryVisualizerDemo.tsx` as a dev harness
> showing a drift-at-`N=50` configuration cycling every 3
> seconds. Add an on-screen counter for "measured variance of
> `p₁` over last 100 runs vs. closed-form `p(1−p)/(2N)`" to
> verify the visualization matches the engine.
>
> Do NOT wire it into `PopGenModule.tsx` yet — that's for
> Agent 2C.

**Agent 2C (Exp 2 rework + wiring — after 2A and 2B land):**

> Read `docs/POPGEN_V2_PLAN.md` — Phase 2 items 2.2 and 2.3.
> Confirm 2.0 has landed (check that `sampleZygotes` is
> exported from `popgen-engine.ts`). Confirm 2.1 has landed
> (check that `AlleleTrajectoryVisualizer` is in
> `components/index.ts`).
>
> Refactor `Exp2_HardyWeinberg` in `PopGenModule.tsx` following
> item 2.2 — call `sampleZygotes(1000, 0.6)` directly for the
> observation step (bypassing the main `simulate` loop), compute
> chi-square live from the sampled counts, ask the "is this
> population in HWE?" chi-square puzzle with four options and
> per-option teaching feedback, add the follow-up "now add
> selection against `mm`" step.
>
> Replace the local `FrequencyChart` with
> `AlleleTrajectoryVisualizer` in Exps 3, 4, 5, 6 per item 2.3.
> Keep the existing discovery beats (especially the Exp 3
> "predict fixation count" beat — do not regress it).
>
> Only `PopGenModule.tsx` changes.

### Launching Phase 3

Phase 3 is the biggest. Largely sequential because 3.2 and 3.3 both
edit `PopGenModule.tsx`.

**Agent 3A (Exp 0 — Hardy 1908):** Add `Exp0_HardyWeinberg1908`
to `PopGenModule.tsx` following item 3.2. Prepend at index 0 of
`EXPERIMENTS`. Uses the existing engine and the Phase 2
`AlleleTrajectoryVisualizer` for the 20-generation stability demo.
Do NOT touch Exps 1-7 yet. ~250 lines of addition.

**Agent 3B (Practice Mode — PopGen, parallel with 3A):** Create
`src/curriculum/practice/popgen-problems.ts`. Refactor
`PracticeMode.tsx` to accept a `problems` prop so it can serve
Mendelian, Linkage (if landed), and PopGen; OR create
`PopGenPracticeMode.tsx` if the refactor is too invasive. Namespace
`localStorage` keys as `popgen.practice.*`, `popgen.streak`,
`popgen.ease.*`. Start with the 5 v2.1 problem types. Update
`ModuleShell.tsx` sidebar to mount the Practice tab for PopGen with
violet theme. Can run in parallel with 3A because files are
disjoint.

**Agent 3C (Backward problems for Exps 1-7, after 3A):** Add a
latched `forwardEverCorrect` bool to each of the seven narrative
experiments, add a backward `QuestionPanel` below each forward
panel, gate `onComplete` on the backward answer. Follow item 3.3
for the content of each backward question. Use the `latched`
monotonic pattern from Mendelian v2 cleanup pass 3. Must run
after 3A because the `EXPERIMENTS` array is renumbered when Exp 0
is prepended.

Between phases, run a **cleanup pass** agent to address any debt
flagged by the previous phase's agents. Same rule as Mendelian
v2 and Linkage v2: "we don't leave trash behind, we fix as we go."

### Launching Phase 5 — peer review and fix cycle

Once Phase 3 lands, follow the methodology in
`docs/CURRICULUM_DEVELOPMENT_METHODOLOGY.md`: four independent peer
reviewers in parallel (plant population geneticist, first-encounter
undergrad, pedagogy researcher, UX/QA engineer), each writing to
`/tmp/popgen-peer-review/reviewer-N-*.md`, followed by a synthesis
pass into `MASTER_REPORT.md`, followed by a fix cycle dispatched as
bundles. Exactly the shape of the Mendelian v2 peer review.
Non-negotiable for shipping.

### Verification approach

At the end of each phase:

- `npx tsc -b` clean. Hard gate.
- `vite build` clean. Second hard gate.
- Manual walk of affected experiments on dev server or deployed
  site.
- Grep for CTA contrast: `from-violet-500 to-violet-600` should
  never appear after Phase 1.1. `violet-700` is the minimum.
- Grep for plant examples: `mimulus`, `amaranthus`, `arabidopsis`,
  `bidens` should each appear multiple times in prose after
  Phase 1.2.
- Grep for abstract allele prose: `allele A`, `A and a` should
  not appear in user-facing strings after Phase 1.2 (engine
  internals may still use `AA`/`Aa`/`aa` as field names — that's
  OK, those aren't shown to students).
- For engine additions (Phase 2.0 `sampleZygotes` export and the
  two verification scripts), run the scripts and paste the
  measured/expected ratios into the commit message. Chi-square
  mean ≈ 1.0, drift variance ratio ≈ 1.0, neutral fixation
  rate ≈ 0.5.
- For the trajectory visualizer, open the demo harness and watch
  50 cycles. Does the measured variance match closed-form? Do
  the hover tooltips work? Does `prefers-reduced-motion` skip
  the fill-in?
- Commit as one commit per phase item or closely-related group,
  with clear multi-line messages. Never skip hooks.

---

## Out of scope for v2

These are explicitly deferred:

- **Multi-language support.** Stay English-only.
- **Teacher dashboards, LMS, accounts, backend.** Pure single-
  student client-side tool. `localStorage` only.
- **Coalescent theory, phylogenetics, ancestral recombination
  graphs.** Graduate topics — a separate module if the curriculum
  eventually expands.
- **Quantitative genetics / the breeder's equation.** That's its
  own module. Exp 0's "What's next" tease hands off to it, but
  the content itself is a separate curriculum build.
- **GWAS / association mapping.** Built on top of PopGen + Linkage;
  natural next-level module, but not v2.
- **Species-level processes** — speciation, phylogeography,
  hybridization genetics, introgression beyond simple migration.
  Out of scope.
- **Multi-allelic systems beyond 2 alleles.** The entire module
  uses two alleles per locus; multi-allelic generalization
  (*Brassica* S-alleles, for example) is a v3 candidate.
- **F-statistics and explicit population structure modeling.**
  Wright's `F_ST` is mentioned in the Exp 5 named-callout but
  not computed or simulated in any experiment. A v3 addition
  after the v2 subsystem is stable.
- **Linkage disequilibrium dynamics.** Mentioned in the Phase
  1.10 handoff callout and the Exp 0 "what's next" tease, but
  not modeled. LD is the natural v2.2 extension.
- **Non-random mating** beyond the HWE "what-if assumptions
  break?" discussion — no assortative mating, inbreeding
  coefficient, or self-fertilization experiments in v2.1.
  Arguably a v2.2 addition.
- **Stochastic selection** (selection with demographic stochasticity
  beyond pure drift). Out of scope.
- **Mendelian or Linkage module changes.** PopGen v2 only touches
  `PopGenModule.tsx`, `popgen-engine.ts`, `popgen.html`, new
  files in `components/`, new files in `practice/`, new files in
  `scripts/popgen/`, and the specific `ModuleShell.tsx` hooks
  needed to mount the PopGen Practice tab.

---

## References

### Project files

- `CLAUDE.md` (repo root) — project-level pedagogical contract,
  bug classes, architecture pointers.
- `docs/MENDELIAN_V2_PLAN.md` — the first v2 plan in this series.
  Read for methodology and voice.
- `docs/LINKAGE_V2_PLAN.md` — the second v2 plan in this series.
  Read for how the methodology adapts to a different concept.
- `docs/CURRICULUM_DEVELOPMENT_METHODOLOGY.md` — the five-phase
  pattern, the four reviewer personas, the agent orchestration
  recipe. The contract all three vision plans sit under.
- `src/curriculum/PopGenModule.tsx` (~963 lines post-audit) — the
  current v1 module this plan supersedes.
- `src/curriculum/popgen-engine.ts` (~246 lines post-audit) — the
  simulation engine. Wright-Fisher drift, selection, mutation,
  migration, chi-square HWE test. Contains the CRITICAL residual
  flagged in "Current State" (deterministic genotype
  reconstruction); Phase 2.0 fixes it.
- `src/curriculum/genetics-engine.ts` — shared engine primitives.
- `src/curriculum/components/` — shared components.
  `GameteVisualizer.tsx` (Mendelian) and the planned
  `CrossoverVisualizer.tsx` (Linkage Phase 2) are the reference
  pattern for the new `AlleleTrajectoryVisualizer`.
  `HistogramChart.tsx` and `RatioBar.tsx` reuse as-is.
  `colors.ts` holds the shared `phenotypeFill` helper — extend
  with `popgenPhenotypeFill` or a combined lookup as part of
  Phase 1.2.
- `src/curriculum/practice/` — Mendelian practice mode subsystem.
  PopGen Phase 3.1 reuses its `spaced-repetition.ts` storage and
  (ideally) refactors `PracticeMode.tsx` to accept a `problems`
  prop so the same session UI serves all three modules.
- `src/curriculum/LinkageModule.tsx` — once Linkage v2 Phase 1.7
  lands, will have the "PopGen hand-off" tease at the end of
  Exp 7 (Linkage Exp 7 → this module's entry). The Phase 1.10
  "coming from Linkage" callout honors that handoff.
- `src/curriculum/MendelianModule.tsx` — no direct reference to
  PopGen (the handoff chain is Mendelian → Linkage → PopGen,
  two jumps). Verified by greppinhg for "popgen" and
  "population" — zero matches.
- `lab.html` / `linkage.html` / `popgen.html` / `modules.html` —
  Vite multi-page entry points. `popgen.html` currently loads
  only Nunito; Phase 1 adds Patrick Hand matching `lab.html`.
- `src/shared/icons/` — shared plant icon library. *Mimulus* and
  *Amaranthus* variants can likely be produced via `colorMap`
  overrides on the existing `PlantIcon`; *Arabidopsis* rosette
  may need a new icon added in Phase 2.

### Historical references

- **Hardy, G. H. (1908).** "Mendelian Proportions in a Mixed
  Population." *Science*, 28(706), 49–50. The one-page letter
  that founded population genetics as a mathematical discipline.
  Hardy was a pure mathematician at Trinity College, Cambridge,
  famous for *A Mathematician's Apology* (1940) and his
  collaboration with Ramanujan. He later called this letter a
  "very slight" contribution and was embarrassed that it became
  more famous than his number-theory work.
- **Weinberg, W. (1908).** "Über den Nachweis der Vererbung beim
  Menschen." *Jahreshefte des Vereins für vaterländische
  Naturkunde in Württemberg*, 64, 369–382. Derived the same
  result independently in Stuttgart, presented to a regional
  natural-history society in German. Weinberg was a practicing
  physician and made many other contributions to statistical
  genetics (twin studies, ascertainment correction). The
  "Hardy-Weinberg" attribution was not universally accepted
  until the mid-20th century — in some early textbooks the
  result is called "Hardy's Law" alone.
- **Wright, S. (1931).** "Evolution in Mendelian Populations."
  *Genetics*, 16(2), 97–159. The foundational paper of drift
  theory. Wright developed path analysis to handle population
  structure and invented the `F_ST` statistic. Worked at the
  University of Chicago.
- **Fisher, R. A. (1930).** *The Genetical Theory of Natural
  Selection.* Oxford: Clarendon Press. The deterministic
  theoretical framework for selection on small-effect alleles.
  One of the three books (along with Wright 1931 and Haldane
  1932) that founded the "modern synthesis."
- **Haldane, J. B. S. (1932).** *The Causes of Evolution.*
  London: Longmans, Green. Haldane independently derived
  selection recursions and later contributed the enzymatic/
  kinetic mechanism of dominance ("Haldane 1930" one-page paper
  in *Nature*), which is also worth a historical mention when
  dominance is discussed.
- **Baldwin, B. G. & Wagner, W. L. (2010).** "Hawaiian
  angiosperm radiations of North American origin." *Annals of
  Botany*, 105(6), 849–879. Review of the Hawaiian *Bidens*
  radiation and other plant lineages; the canonical reference
  for the founder-effect example.
- **Powles, S. B. & Yu, Q. (2010).** "Evolution in action:
  plants resistant to herbicides." *Annual Review of Plant
  Biology*, 61, 317–347. Review of *Amaranthus* glyphosate
  resistance as a real-time directional-selection event. The
  canonical reference for the Exp 4 plant example.
- **Hartl, D. L. & Clark, A. G. (2007).** *Principles of
  Population Genetics*, 4th ed. Sinauer. The standard
  undergraduate textbook. Every closed-form formula in this
  plan can be traced to a Hartl & Clark chapter.
- **Gillespie, J. H. (2004).** *Population Genetics: A Concise
  Guide*, 2nd ed. Johns Hopkins. Shorter and more readable
  than Hartl & Clark; Gillespie's Δp recursion notation is the
  one used in Phase 1.5's prediction step.
- **Felsenstein, J.** *Theoretical Evolutionary Genetics.*
  Online draft, University of Washington. Free, comprehensive,
  mathematically rigorous — the reference for variance
  calculations and multi-locus theory if the verification
  scripts need to be extended.

### Prior audit

- `/tmp/popgen-audit/REPORT.md` — April 2026 peer-review audit
  (15 bugs, 3 CRITICAL). Found and fixed: Exp 5 migration
  converged to swapped frequencies (not common mean); engine
  post-WF multinomial resampling inflated drift variance ~3×;
  HWE "discovery" rigged by the same resampling bug. This
  report exists only during active audit sessions; re-audit can
  be re-run from `CLAUDE.md` and this plan's success criteria.
- `/tmp/popgen-audit/scripts/verify-engine.js` — reference
  pattern for the Phase 2.0 verification scripts. Runs
  Wright-Fisher simulations at multiple `N` values and compares
  measured variance to `p(1−p)/(2N)`. The Phase 2.0 agent should
  read this before writing the new scripts in
  `scripts/popgen/`.

### CRITICAL residual this plan flags (not yet audited)

- The deterministic genotype reconstruction
  `{AA, Aa, aa} = {round(N·p²), round(N·2pq), round(N·q²)}` at
  `popgen-engine.ts:110-118` makes Exp 2's chi-square test ≈ 0
  by construction. This is in the same bug class as the three
  CRITICAL bugs the April audit found and is Phase 2.0's
  primary deliverable.
