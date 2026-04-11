# Linkage Module v2 — Vision & Implementation Plan

**Status:** Planning. Created 2026-04-10, immediately after the Mendelian v2
build shipped (see commits `8a512bd`…`094fc69`). Supersedes the current
ship-ready-but-pedagogically-thin v1 Linkage module (post-April-2026 audit; the
`threePointAnalysis` single-crossover bug, the Exp 3 textbook-answer
rejection, and the Exp 6 hardcoded-data chi-square have all been fixed and the
engine math is now correct).

**Read first:** `CLAUDE.md` at the repo root, then `docs/MENDELIAN_V2_PLAN.md`
(for the methodology — this plan follows it section-for-section), then
`docs/CURRICULUM_DEVELOPMENT_METHODOLOGY.md` (for the five-phase pattern and
agent orchestration). Then come back here.

---

## The north star

A student who finishes the Linkage v2 module should be able to **look at any
dihybrid testcross result, recognize in seconds whether the genes are linked
or unlinked, and — if linked — compute the recombination frequency and map
distance in their head** by reasoning about crossovers at the gamete level.
They should understand why recombination frequency approximates physical
distance for short intervals, why double crossovers cause apparent distance
to underestimate true distance, and why 50% RF is the ceiling (independent
assortment is indistinguishable from 50 cM). They should be able to do a
three-point cross, identify the middle gene from the rarest class, and
explain *why* the rarest class is the diagnostic one. They should know that
Creighton & McClintock in 1931 proved crossing-over is a physical exchange of
chromatid material — the moment classical genetics became cytological — and
that Sturtevant in 1913 built the first genetic map at age 19. They should
also have fun doing it.

Right now (v1), a student who finishes the module can correctly pick "same
chromosome" from a menu, type 17 into a number box, and slide a marker to
the 17-cM tick. That is recall, not reasoning. The north star above is the
target that the three phases below are built to hit.

---

## The four principles

Same four axes as Mendelian v2. Every decision grades against these.

### 1. Genetic accuracy

- Every number on screen derivable from textbook genetics. RF = 17% is the
  pedagogically simplified value the module uses for C–Sh on maize chr9
  (the true C–sh1 distance is ~29 cM; the module already acknowledges this
  in Exp 4 prose). Keep that simplification — 17 is the canonical teaching
  value from Creighton-McClintock 1931 — but **never** rewrite it to a
  stochastic sample.
- Validation must always accept the textbook RF even when the sample drifts.
  Exp 3 already does this post-audit (the `targetRF = 17` fallback path);
  every new validation added in v2 must follow the same pattern.
- Plant examples only. Maize chromosome 9 C–Sh–Wx is the canonical and the
  existing module already uses it — keep it. Sturtevant is acknowledged in
  the historical prose but there will be **no Drosophila** experiment,
  visual, or diagram in the module. Historical mention only.
- Notation: plant slash convention everywhere (`C/c`, `Sh/sh`, `Wx/wx`,
  `C Sh / c sh`, `C sh / c Sh`). Verify during cleanup — v1 is mostly
  consistent but the prose drifts in a few places (`Cc Shsh` vs `C/c Sh/sh`).
- Every experiment that uses simulated offspring must consume the student's
  own data. Exp 6's post-audit fix (chi-square on a freshly-run 400-kernel
  cross via `useState(() => …)`) is the right pattern — never regress.
- Every stochastic output is verifiable against closed-form prediction. A
  Wright-Fisher-style verification script for the linkage engine belongs in
  `/tmp/linkage-audit/scripts/` and should produce measured RF → closed-form
  17% ratios before and after any engine change.
- The `canonicalGenotypeKey` normalization is in place in `linkage-engine.ts`
  (cleanup pass 2 of the Mendelian v2 build applied it). Don't regress —
  both draw orders of a heterozygote must map to the same phenotype key.

### 2. Visual aesthetic consistency

- **Cyan primary.** The Linkage module uses cyan per `ModuleShell.THEME.cyan`.
  This is deliberate — each curriculum module has its own theme color so
  students navigating across modules know which room they're in. Cyan stays.
- **CTA contrast fix from Mendelian Bundle A applies here.** Bundle A bumped
  Mendelian's CTAs from `emerald-500`/`emerald-600` to `emerald-700` to hit
  WCAG AA (4.5:1 against white text). Linkage v1 still has `from-cyan-500 to
  cyan-600` gradients on its "Cross!", "Check", "Place Gene", and "Complete
  Module" buttons. `cyan-500` against white is roughly 2.3:1 — it fails AA
  the same way emerald-500 did. **Phase 1 must bump all cyan CTAs to
  `cyan-700` or darker.** `ModuleShell.THEME.cyan.button` is already
  `bg-cyan-700` for sidebar-level CTAs; the experiment-body CTAs need the
  same treatment.
- Violet for teaching callouts (`bg-violet-50 border-violet-200 text-violet-800`).
  Stone-50 neutral callouts for law definitions. Dusty-rose red for errors.
- `rounded-2xl` cards, `border border-stone-200 shadow-sm`, `p-6` bodies,
  `space-y-6` vertical stacking. Match the Mendelian module aesthetic so
  students perceive a family resemblance across modules.
- Typography: Nunito for body, Patrick Hand for handwritten-feel headers and
  historical-framing callouts. The current `linkage.html` only loads Nunito;
  Phase 1 should load Patrick Hand the same way `lab.html` does (confirm
  against the Mendelian entry point before editing).
- Deterministic phenotype colors by **label**. The existing
  `phenotypeFill(label)` helper in `LinkageModule.tsx` is already
  label-keyed (post-audit fix) and maps Purple-ish labels to a purple
  family and Yellow-ish labels to a yellow family. Keep it; unify with the
  shared `components/colors.ts` helper extracted during Mendelian v2 cleanup
  pass 1 if the keys can be aligned without regressing the Wx/waxy shade
  nudges.
- Organisms rendered through shared iconography. Linkage has a harder
  visual problem than Mendelian because it's about *kernels on an ear of
  maize*, not whole plants. The existing `ChromosomeDiagram` SVG is the
  right primitive for linkage-specific views; keep it and extend it in
  Phase 2 with the crossover animation.
- Charts: `LinkageRatioBar` is specialized to the 4- or 8-class testcross
  output and reuses the shared phenotype-fill map. Reuse; don't invent.

### 3. Pedagogical value

- Every experiment passes the **"new problem test"**: after this experiment,
  can the student solve a linkage problem they've never seen? Right now v1
  fails this test in places — Exp 4's slider has the target at 17 cM; a
  student can get it right by moving the slider to the "17" label without
  understanding that 1% RF = 1 cM.
- Every concept has a **discovery beat** with prediction before observation.
  Exp 1 currently shows the non-1:1:1:1 result *before* asking why — the
  student doesn't get to predict 1:1:1:1 first and be wrong. Fix in Phase 1.
- **Forward AND backward problems** on every narrative experiment. Linkage
  is where backward reasoning is the dominant move in real research — given
  a 7:1:1:7 ratio, infer the map distance; given an 8-class result, infer
  the gene order. Every existing experiment needs an inverse panel.
- **Mechanism beats memorization.** The 17% RF is not a fact — it is an
  emergent property of meiotic crossing-over at the gamete level. Students
  who memorize "17 cM" cannot solve a 20 cM problem. Students who see
  crossovers happening on a chromosome diagram and count recombinant gametes
  can solve any distance they've never seen.
- **Name the laws and the historical insights.** Sturtevant (1913): "RF is
  proportional to physical distance." Creighton & McClintock (1931):
  "crossing-over is a physical exchange of chromosome material, not a
  metaphor." Make these explicit named callouts the way Mendelian v2 named
  the Law of Segregation and the Law of Independent Assortment.
- **Noise literacy.** A 500-kernel testcross at true RF 17% has a standard
  error of ~1.7% — so an observed RF of 14% or 20% is still consistent with
  17%. Students need to see this, the same way Mendelian v2 showed them
  that 72:28 is 3:1.
- **Interleaved spaced practice.** Linkage-specific problem types in a
  `practice/` subsystem, sharing the Mendelian architecture.

### 4. Fun

- **Playful micro-interactions.** Two chromosomes physically swapping
  segments during a crossover animation. Recombinant chromatids emerging in
  a color that makes clear they are a *new* combination. A small celebratory
  beat when a three-point cross resolves to the correct gene order.
- **Historical storytelling.** Creighton and McClintock were graduate
  students at Cornell in 1931. Sturtevant was 19 and working in T.H.
  Morgan's Fly Room at Columbia in 1913. These are two of the most
  charming stories in 20th-century genetics and v1 tells neither of them.
- **Discovery moments.** Every experiment ends with the student saying "wait,
  that's not what I expected" — that's what linkage is, fundamentally, the
  moment Mendel's second law breaks.
- **Streaks and small celebrations** in practice mode. Same Duolingo
  mechanic as Mendelian. No XP, no loot, no leaderboards.
- **Charming copy.** The "Creighton & McClintock 1931" moment should read
  like the scientific revolution it was, not like a footnote.

---

## Current state (honest)

### What v1 is good at

- **Engine is correct post-audit.** `threePointAnalysis` uses a clean
  truth-table classification (`m0/m1/m2` booleans, four cases, no misrouted
  single crossovers). Verified by tracing: given parental `+++` and DCO
  `+-+`, `m0=true, m1=false, m2=true` → `m0===m2 && m0!==m1` → DCO bucket.
  Given a single crossover in region I (`-++` against parental `+++`):
  `m0=false, m1=true, m2=true` → `m0!==m1 && m1===m2` → singleI. Same for
  region II. The bug that had Exp 7 showing 5.3 / 13.4 cM instead of the
  true 8 / 10 is fixed.
- **`canonicalGenotypeKey` normalization is in place.** Both draw orders of
  a heterozygote (`Shsh` / `shSh`) canonicalize to the same key before
  phenotype lookup, so `phenotypeMap` authors only need to write each
  het once. This was the Mendelian v2 cleanup pass 2 fix, propagated to the
  linkage engine.
- **Plant examples throughout.** Maize chr9 C–Sh–Wx is the canonical linkage
  trio, straight from Creighton & McClintock 1931. No Drosophila. No mice.
- **Exp 3 tolerance is fixed.** The textbook `targetRF = 17` is always
  accepted even when the sample drifts, matching Exp 4's assertion.
- **Exp 6 consumes the student's own data.** A freshly-run 400-kernel cross
  is frozen via `useState(() => …)` at mount time; no hardcoded
  `[180, 170, 26, 24]` magic array. The chi-square terms in the table are
  derivatives of the student's actual observed counts.
- **Exp 5 (three-point) has the scrambled-to-true-order puzzle structure.**
  Genes are presented in order `[C, Wx, Sh]` while the simulation runs in
  true order `[C, Sh, Wx]`, so the student has to discover that Sh is the
  middle gene from the rarest class. The scaffolding is there.
- **Exp 7 is internally consistent.** By Exp 7 the student has learned the
  true order `C — Sh — Wx`, so the display uses that order; Region I
  (C–Sh) and Region II (Sh–Wx) labels match the simulation.
- **Zero-count classes are pre-seeded.** `classifyThreePoint` builds all 8
  patterns up front, so low-interference runs still show eight rows in the
  table. No silently-dropped classes.
- **`LinkageRatioBar` uses deterministic label-based coloring.** Not the
  sort-order palette that shipped in v0.
- **Module shell, sidebar, cyan theme, and 7-experiment progression** all
  work and match the Mendelian family resemblance.

### What v1 is missing

Everything the north star demands. Specifically:

- **No crossover visualization.** The single biggest mental-model gap in the
  module. Students see two chromosome bars, a `×`, and a bar chart of
  phenotype counts. They never see *why* the ratio is 7:1:1:7 rather than
  1:1:1:1 — they never see a crossover happen, they never see which
  chromatid carries which allele combination, they never watch a
  recombinant gamete form. This is the gamete-visualizer gap of the
  Linkage module. Phase 2 exists to close it.
- **No historical framing experiment.** There is no Exp 0. The module opens
  cold with "here is a testcross that doesn't give 1:1:1:1 — why?" without
  telling the student that the reason this matters was settled by two
  graduate students at Cornell in 1931. Mendelian v2 added Exp 0 for
  exactly this reason and the Linkage module needs the same treatment.
- **No backward problems.** Every experiment in v1 is forward ("run the
  cross → what does it show?"). There is no "given a 7:1:1:7 ratio, what
  is the map distance?" or "given 14 recombinants out of 80, is this
  consistent with 17 cM?" or "given an 8-class result, which gene is in
  the middle?" Backward reasoning is where real genetic mapping lives.
  Phase 3 addresses this for every narrative experiment.
- **No practice mode.** Every experiment is one-shot. Zero retrieval
  practice, zero skill automation. A student who finishes the module once
  forgets it by next week. Phase 3 adds `practice/` as a subsystem the
  same way Mendelian v2 did.
- **No molecular explanation of crossing-over.** Exp 1 says "these genes
  are on the same chromosome — crossing over happens," but doesn't
  explain what crossing-over *is* physically (homolog pairing in
  prophase I, chiasma formation, breakage and rejoining of chromatid
  strands, recombinant chromatids emerging). One violet callout would
  fix this; Phase 1.
- **No noise literacy on RF.** Exp 3 computes RF once, from 500 kernels,
  and the textbook tolerance is accepted. Students never see "run this
  testcross 10 more times" to watch the RF estimate jitter between 14%
  and 20% around the true 17%. They leave thinking RF is a fixed number,
  not a noisy estimate of a population parameter.
- **Exp 4 is demo-shaped.** The student reads "17% = 17 cM," slides a
  slider to 17, and is told they "built their first genetic map." There
  is no actual cognitive move the student has to make here — it's
  recognition, not reasoning. The slider exercise should be either
  promoted into a backward puzzle ("given these parental and recombinant
  counts, compute the map distance and place the gene") or demoted into
  a visual that reinforces Exp 3's conclusion.
- **Exp 1 skips the prediction beat.** The student reads the cross
  instructions and then clicks "Cross!" — the result is shown before
  the student commits to a prediction. A "predict the ratio first" step
  before the cross button would convert Exp 1 from a demo into a
  discovery moment.
- **No explicit named insight for "RF ∝ distance."** Sturtevant (1913)
  is mentioned in passing in Exp 4 prose but is never framed as the
  revolution it was. Compare to how Mendelian v2 names the Law of
  Segregation as an explicit callout at the end of Exp 2.
- **No Creighton-McClintock experiment as its own beat.** The module
  mentions Creighton & McClintock exactly once, in Exp 5's feedback
  string, after the gene-order question is already answered. The
  single most important paper in the history of classical genetics is
  a footnote in a feedback blurb. That is not the right weight.
- **No three-point cross as a real puzzle.** Exp 5 does force the
  student to find the middle gene from the rarest class, but it
  telegraphs by saying "The two LEAST frequent classes are double
  crossovers. Compare each rare class to the parental class it MOST
  resembles — the single gene that differs is the middle gene." That's
  the procedure, not the discovery. The student is being led through a
  ritual, not reasoning about crossovers.
- **No 50% RF ceiling discussion.** A student could leave the module
  thinking RF and distance are equivalent at all scales. They aren't:
  RF saturates at 50% because genes far enough apart undergo enough
  independent double crossovers that the result looks like independent
  assortment. This is the canonical "why apparent distance underestimates
  true distance" story and v1 doesn't tell it.
- **No tease into PopGen.** The module ends with "Complete Module" and
  drops the student on the floor. It should hand them off to the PopGen
  module the way Mendelian Exp 5 hands them off to Linkage.
- **No transfer test for "given RF, predict the ratio."** Every existing
  question runs the cross first and asks about its output. A student
  should also be able to be told "two genes are 10 cM apart; what
  testcross ratio do you expect?" and answer without running a sim.
- **Exp 7 uses `setTimeout(onComplete, …)` from click handlers.** The
  same pattern Mendelian v2 cleanup migrated to `useEffect` with
  cleanup. The linkage module still has it in Exp 1–6 as well. Cleanup
  pass debt.
- **Prose notation drifts in a few spots.** `C/c Sh/sh` vs `Cc Shsh` vs
  `C Sh / c sh` appear in different paragraphs of the same module. Pick
  slash notation everywhere.

These are all addressable. The scientific substrate is correct; what the
module needs is the same pedagogical and aesthetic layer Mendelian v2 just
built on top of its own scientifically-correct substrate.

---

## The plan: three phases

Phases are independent. Ship Phase 1 first, then decide whether to continue.
Each phase ends with one or more clean commits. Each phase has its own
verification pass.

### Phase 1 — Pedagogy tightening (1 agent session, ~1 day)

**Scope:** Text, callouts, small interactive additions inside existing
experiments. No new shared components, no engine changes. Pure pedagogy.
High leverage, small risk.

**Items:**

#### 1.1 — Prediction-before-cross in Exp 1

Currently Exp 1 tells the student "if the genes assort independently, you'd
expect 1:1:1:1" and then offers a big Cross button. Insert a prediction step
between the setup and the cross:

> **Before you cross, predict:** if these two genes are on different
> chromosomes (independent), what do you expect the four phenotype classes
> to look like?
>
> - 1 : 1 : 1 : 1 (independent assortment)
> - 9 : 3 : 3 : 1
> - All one class
> - Can't say yet

On click, lock in the student's choice (store in state, do NOT grade) and
reveal the Cross button. After the cross result appears, the discovery
beat is "your prediction was 1:1:1:1 — but look at the actual numbers."

**Why:** Exp 1's whole point is "your Mendelian intuition fails here." Without
a prediction step, the failure is narrated, not felt. Prediction commitment
is cheap and high-leverage.

**Implementation:** ~40 lines of state and UI inside `Exp1_LinkedGenes`. No
new components.

#### 1.2 — Derive RF from the gamete multiplication rule (Exp 3 inline box)

Before the Exp 3 Cross button, add an inline derivation that parallels the
Mendelian v2 Exp 5 "3/4 × 3/4 = 9/16" derivation grid:

> If C and Sh are unlinked: each gamete has P(C Sh) = 1/2 × 1/2 = 1/4.
> Testcross with `c sh / c sh` → four classes, each 1/4, ratio 1:1:1:1.
>
> If C and Sh are linked with 17% recombination: the dihybrid parent
> produces two *parental* gamete types (C Sh and c sh) with total
> probability 1 − 0.17 = 0.83, so each parental is ~0.415. The two
> *recombinant* gamete types (C sh and c Sh) split the remaining 0.17, so
> each recombinant is ~0.085. Testcross ratio ≈ 0.415 : 0.085 : 0.085 : 0.415
> = 41.5 : 8.5 : 8.5 : 41.5 ≈ 7 : 1 : 1 : 7 per 100 offspring.

This gives the student the bridge from "crossovers happen 17% of the time"
to "here is the exact ratio I should see." Without it, 7:1:1:7 is a magic
number and Exp 1's "wait, it's not 1:1:1:1" has no quantitative follow-up.

**Why:** Turns RF into something the student can *compute* rather than
observe. Same move as the Mendelian v2 inline derivation of 9:3:3:1.

**Implementation:** Small inline React component in Exp 3. Styled as a
`bg-violet-50 border border-violet-200 rounded-xl p-4` teaching callout.

#### 1.3 — Molecular crossover callout in Exp 1

One violet callout in Exp 1, after the discovery beat:

> **What is crossing over, physically?** During prophase I of meiosis,
> homologous chromosomes pair up tightly (synapsis) and swap segments
> of chromatid at points called chiasmata. A chiasma is a real physical
> break-and-rejoin event: one chromatid of each homolog is cut at the
> same position, and the cut ends are swapped before being rejoined.
> The result is four chromatids total — two parental (untouched) and
> two recombinant (carrying the swapped segments). This is why linked
> alleles sometimes travel together and sometimes don't — it depends on
> whether a chiasma happens to form between them.

**Why:** Kills the "crossing-over is a metaphor" misconception that lets
students coast through the module without actually understanding what
RF is measuring. One sentence of real molecular biology.

**Implementation:** Prose callout. Zero code complexity.

#### 1.4 — Name Sturtevant's insight + the 50% ceiling (Exp 4 callout)

At the top of Exp 4, replace the current "1% RF = 1 cM" sentence with a
named historical callout and a warning:

> **Sturtevant's insight (Columbia, 1913):** Alfred Sturtevant, a
> 19-year-old undergraduate in T.H. Morgan's lab, proposed that
> recombination frequency could be used as a measure of physical
> distance — because RF between two genes is roughly proportional to how
> far apart they sit on the chromosome. He used this insight to draw
> the first genetic map. We now call his unit the **centimorgan**: 1%
> recombination = 1 cM of map distance.
>
> **⚠ But this only holds for short distances.** Recombination frequency
> saturates at 50%. Two genes that are very far apart on the same
> chromosome undergo enough independent crossovers that the result
> looks just like independent assortment — you can never observe more
> than 50% recombinants in a testcross. This is why *apparent* map
> distance from two-point crosses underestimates the *true* physical
> distance for far-apart genes. (Exp 5 and Exp 7 come back to this with
> double crossovers.)

**Why:** Names the law, cites the historical origin by name and year,
and inoculates against the "RF and distance are always equal"
misconception before the student reaches Exp 5.

**Implementation:** Stone-50 or violet-50 callout replacing the existing
prose. Zero code complexity.

#### 1.5 — Noise literacy in Exp 3 ("Run 10 more times")

After the Exp 3 cross, add a "Run this testcross 10 more times" button that
re-runs the 500-kernel testcross 10 times (under the same parameters) and
shows each observed RF as a dot on a small strip chart, with a shaded band
at 17% ± 2 SE (roughly 13.6% – 20.4% at n = 500).

Caption: "Every one of these is still 17% RF. Real experiments have
sampling variation — 14%, 16%, 20% are all consistent with the same
true map distance. Don't panic when your measured RF is off by a few
points."

**Why:** Builds the foundation for the backward problems in Phase 3 (which
will ask "is 14/80 = 17.5% consistent with 17%?") and prevents students
from over-interpreting single-sample drift.

**Implementation:** Reuse `linkedCross` 10 times, render a compact dot
plot or strip chart. ~60 lines.

#### 1.6 — Named insight at end of Exp 1

Add a named callout at the end of Exp 1 after the discovery beat:

> **When Mendel's second law breaks:** Gregor Mendel's Law of Independent
> Assortment says two genes segregate independently into gametes. This
> is true when the genes are on *different chromosomes*. When they are
> on the same chromosome and close together, they tend to travel
> together in gametes — we say the genes are **linked**. Linkage is
> the first major exception to Mendel's laws. The rest of this module
> is about how to measure linkage quantitatively.

**Why:** Narratively closes the loop with the Mendelian module (Mendelian
v2's Exp 5 tease ends with "find out in Linkage" — Linkage Exp 1 should
answer "here is the answer") and explicitly names the concept the student
is being introduced to.

**Implementation:** Prose callout. Zero code complexity.

#### 1.7 — PopGen tease at end of Exp 7

At the end of Exp 7 (the Interference experiment, which is currently where
the module ends with a "Complete Module" button), add a PopGen tease in
the same shape as Mendelian v2's Linkage tease:

> When two linked alleles stay together generation after generation in a
> population, the population builds up an excess of some allele
> combinations over others — this is called **linkage disequilibrium**.
> It decays over many generations of random mating, and the rate of
> decay is a function of the recombination frequency you just learned
> to measure. The **Population Genetics module** picks up exactly here.
>
> [Open the Population Genetics module →]

**Why:** Narrative continuity. Leaves the student curious instead of done.

**Implementation:** Prose + CTA button. Zero code complexity.

#### 1.8 — CTA contrast fix (WCAG AA)

Bump every experiment-body CTA button in `LinkageModule.tsx` from
`from-cyan-500 to-cyan-600` to `from-cyan-700 to-cyan-800` (or to
`bg-cyan-700` flat, matching `ModuleShell.THEME.cyan.button`). Applies to
every "Cross!", "Check", "Place Gene", "Calculate Chi-Square", and
"Complete Module" button. White text on `cyan-700` is ~4.8:1; `cyan-500`
is ~2.3:1 — the same failure Mendelian Bundle A fixed.

**Why:** WCAG AA correctness. This is the single cheapest accessibility
fix in the entire module.

**Implementation:** Search-and-replace. Zero cognitive cost.

#### 1.9 — Notation pass

One pass through the module prose to normalize to plant slash notation
everywhere: `C/c Sh/sh`, `C Sh / c sh`, `Sh/sh` — never `Shsh`, never
`Cc Shsh`, never `Cc/Sh/sh`. Quick grep for `Shsh`, `Cc `, `Wxwx` and
fix each site. Student trust in a module that can't keep notation
consistent across two paragraphs is a real concern.

**Why:** Notation is correctness (see `CLAUDE.md`).

**Implementation:** Grep + Edit. Under 30 lines total.

**Phase 1 total scope:** ~400 lines of additions and edits to
`LinkageModule.tsx`. Plus a small `linkage.html` font-load update for
Patrick Hand. No new components, no engine changes. One agent session.
Should compile cleanly and deploy without risk.

---

### Phase 2 — Mental model components (1-2 agent sessions, ~2 days)

**Scope:** The single biggest missing visual in the Linkage module — the
crossover. Plus promoting two existing demo-shaped experiments into
puzzle-shaped ones.

#### 2.1 — `CrossoverVisualizer` shared component

The crossover equivalent of `GameteVisualizer`. A new shared component in
`src/curriculum/components/` that animates meiotic recombination and
makes the mechanism of linkage visible for the first time.

**Behavior:**

- Takes two homologous chromosomes (represented as parallel bars), a list
  of linked genes with positions, and a list of recombination frequencies
  between consecutive genes.
- Renders each chromosome as a horizontal bar with gene markers at each
  locus, labeled by allele (e.g. `C Sh Wx` on chromatid 1, `c sh wx` on
  chromatid 2).
- On trigger (toggle or auto on cross):
  1. The two chromosomes pair up (synapsis animation — they slide into
     alignment).
  2. After replication, each chromosome appears as a pair of sister
     chromatids (4 chromatids total, displayed as four parallel bars).
  3. A chiasma forms at a random position (drawn from the `recombFreqs`
     distribution by delegating to `linkage-engine.ts`). Visually: two
     non-sister chromatids break at the chiasma point, cross over each
     other, and rejoin.
  4. The four resulting chromatids are revealed — two parental (untouched)
     and two recombinant (carrying swapped segments past the chiasma).
  5. One of the four chromatids is randomly selected (by coin flip per
     chromatid) as the gamete that enters the next generation; it drifts
     off the top of the component.
  6. Repeat N times to build up the testcross sample.
- Animation duration ~2 seconds per cycle; speed slider (0.5×, 1×, 2×);
  step-through mode that pauses at each beat (pairing → replication →
  chiasma → exchange → gamete selection); `prefers-reduced-motion` fallback
  that skips straight to the result.
- "Show crossover" toggle mounted inside Exp 1, Exp 2, and Exp 3. Default
  expanded on first mount, sessionStorage-sticky collapse after. Same
  pattern as the Mendelian `GameteVisualizer` toggle (per Bundle B).
- **Crucially: delegates to the engine.** The component must not reimplement
  `makeGamete` — it should either call `linkedCross` and animate the
  offspring, or it should have an exposed `makeGameteWithTrace` function
  added to `linkage-engine.ts` that returns both the gamete and the
  crossover positions used to build it, so the animation reflects the
  actual randomness the engine is producing. No `Math.random()` inside
  the visualizer itself for allele selection.

**Why:** This is the "gamete visualizer" of the Linkage module — the
single highest-leverage visual addition in the entire plan. Students who
see a chiasma form, chromatids break, and recombinant chromatids emerge
will understand linkage. Students who only see a bar chart will memorize
7:1:1:7 the way v1 students memorize 9:3:3:1.

**Implementation:**

- New file `src/curriculum/components/CrossoverVisualizer.tsx` (~600-800
  lines with animation logic).
- New function `makeGameteWithTrace()` in `linkage-engine.ts` that returns
  `{ gamete, crossovers: boolean[], sourceChromatid: 0|1|2|3 }` so the
  component can animate the exact trace the engine produced. Pure
  engine-level addition; existing `makeGamete` stays as a thin wrapper.
- Exported from `components/index.ts`.
- A `CrossoverVisualizerDemo.tsx` dev harness (matching the pattern of
  `GameteVisualizerDemo.tsx`) showing a single `C Sh / c sh` chromosome
  cycling once every 2 seconds.

**Verification:** Manual visual walk. Does the chiasma position line up
visually with the crossover that the engine actually executed? Do the
resulting chromatids carry the correct allele combinations? Over many
cycles, does the observed RF converge on the supplied `recombFreqs`? (Add
a small on-screen counter in the demo harness for "measured RF over
last 100 gametes" to verify this in-browser.)

#### 2.2 — Exp 4 real-puzzle rework

Exp 4 is currently "17% = 17 cM, slide the slider to 17." Rework it into a
backward puzzle where the student has to **compute** the map distance from
observed counts and **explain** why RF is a distance.

**New flow:**

1. Prompt: "A colleague gives you the result of a maize testcross (C/c
   Sh/sh × c/c sh/sh) she ran last summer. You didn't run the cross
   yourself, you don't know the 'true' RF for these genes, and you only
   have the offspring counts. How far apart are C and Sh on the
   chromosome?"
2. Show offspring counts (from a fresh randomized run of `linkedCross`
   with 17 cM, 500 kernels, so the sample drifts naturally):
   - Purple, Plump: ~207
   - Yellow, Shrunken: ~208
   - Purple, Shrunken: ~42
   - Yellow, Plump: ~43
3. Student must compute RF = (recombinants / total) × 100 and enter map
   distance in cM. Accept ±2 cM of the sampled RF, OR ±2 cM of 17 (the
   textbook). Same tolerance structure as Exp 3.
4. After correct answer: "You just did what the first geneticists did
   for every linked-gene pair in maize, wheat, pea, and tomato. This is
   how every entry in a classical genetic map was made."
5. Add a second backward question: "Same cross, but now you ran it with
   only 80 kernels and you got 14 recombinants. What map distance would
   you estimate? Is this consistent with the 500-kernel result above?"
   (Accept 17.5 cM ± 5, explain that at n=80 the standard error is ~4.2%
   so yes, this is consistent with 17%.) This transfer-tests the noise
   literacy from Phase 1.

The slider-on-a-chromosome-bar visual stays as a *reinforcement* below the
puzzle, labeled "here is where you placed C and Sh on maize chromosome 9."
Not the gating mechanism anymore.

**Why:** Converts Exp 4 from "recall 1% = 1 cM" into "use a noisy sample
to estimate a map distance." That's the actual research move.

**Implementation:** Refactor of `Exp4_MapDistance`. Remove the `'17 cM'`
picklist. Add numeric input with the dual-tolerance validation. ~150 lines
of additions and deletions.

#### 2.3 — Exp 5 (three-point) un-telegraph

Exp 5 currently hands the student the procedure ("The two LEAST frequent
classes are double crossovers. Compare each rare class to the parental
class it MOST resembles — the single gene that differs is the middle
gene"). Remove the procedural telegraph. Replace with:

> Look at the 8 offspring classes. Two classes are much more frequent
> than the others — these are the parental classes. Two classes are
> extremely rare. Your job: figure out which of the three genes
> (C, Wx, Sh) is physically in the middle of the chromosome.
>
> **Hint (click to expand):** Think about how many crossovers would be
> required to produce the rarest classes. If a class requires two
> independent crossovers to form, those crossovers must flank which
> gene?

After the student picks a gene, give per-option teaching feedback (same
pattern as Mendelian Exp 4 post-Bundle B):

- "Aleurone color (C)" → "Not quite. For C to be in the middle, a double
  crossover would have to flip C while leaving Wx and Sh unchanged. Look
  at the rarest class — is it C that differs from parental, or one of
  the flanking genes?"
- "Endosperm (Wx)" → "Not quite. For Wx to be in the middle, a double
  crossover would flip Wx while leaving C and Sh unchanged. Check the
  rarest class — does only Wx differ from the parental, or is it another
  gene?"
- "Kernel shape (Sh)" → "Correct! In the rarest class, only the Sh
  locus has flipped relative to the parental class. The only way for a
  single gene to flip while its neighbors stay the same is if that gene
  lies between the other two, so a crossover on each side cancels out
  the flanks. Sh is in the middle; the true order is C — Sh — Wx."

**Why:** Forces reasoning from crossover mechanism, not from procedure
recall. Same move as Mendelian Exp 4's informative-cross selection.

**Implementation:** Rewrite of the Exp 5 question prose and feedback.
Minor React changes. ~80 lines.

**Phase 2 total scope:** One major new component (~700 lines), one new
engine function (~30 lines), two module reworks (~230 lines). Three
commits. One or two agent sessions depending on how much iteration the
crossover visualizer takes. **The crossover visualizer is the
single most impactful visual addition in the entire plan — take time to
get it right, especially the chiasma animation, which is where students
build the mental model that "linkage = physical exchange."**

Coordination note: Phase 2.1 (CrossoverVisualizer, new file) and Phase 2.2
+ 2.3 (`LinkageModule.tsx` edits) touch disjoint files and can run in
parallel as `Agent 2A` and `Agent 2B`. A third follow-up agent wires the
visualizer into Exps 1/2/3 via the Show-Crossover toggle.

---

### Phase 3 — Subsystems and historical framing (2-3 agent sessions, ~3-4 days)

**Scope:** The biggest investment. Adds a completely new practice subsystem
parallel to Mendelian's, a new historical Exp 0, and backwards problems
throughout the narrative experiments.

#### 3.1 — Practice Mode subsystem for Linkage

A second sidebar tab alongside the 7-experiment narrative. Duolingo-flavored
rapid practice for linkage-specific problem types. Same architecture as
Mendelian v2's `practice/` subfolder — problem generators,
spaced-repetition scheduler, session UI, `localStorage` persistence.

**Behavior:** Identical in shape to the Mendelian practice mode. 10
questions per session, ~30 seconds per question, interleaved across
problem types, spaced repetition with ease factors, streak counter, end-
of-session scorecard with weakest concept called out, confetti-on-10/10.
No XP, no leaderboards.

**Problem types (v2.1 starter set):**

1. **Forward linkage recognition.** Given two parent genotypes and a map
   distance (e.g. 10 cM), pick the approximate testcross ratio from a
   list of four (8:1:1:8, 4:1:1:4, 1:1:1:1, 7:1:1:7). Picklist answer.
2. **Backward RF from counts.** Given raw offspring counts from a
   dihybrid testcross, compute RF and enter as a percentage. Numeric
   answer. Accept ±2 cM of the sampled RF OR ±2 cM of the generating
   target.
3. **Linked vs unlinked discrimination.** Given a testcross result and a
   chi-square test statistic, decide: "consistent with 1:1:1:1" or
   "genes are linked." Two-option answer.
4. **Three-point gene order.** Given an 8-class testcross result, pick
   the middle gene from three options. Uses the same truth-table logic
   as Exp 5. Picklist answer.
5. **Noise recognition.** Given a small-sample RF (e.g. 13/40 = 32.5%
   from a 17-cM population), decide: "consistent with 17 cM at this
   sample size" or "map distance is probably much larger." Accept both
   answers when they are statistically indistinguishable; this problem
   type is the practical transfer test for Phase 1.5's noise literacy.
6. **Forward RF → ratio.** Given two genes are 20 cM apart and the
   parent is in coupling, predict the four testcross frequencies.
   Numeric answer for each class, with tolerance.
7. **Double-crossover correction.** Given map distances of 15 cM and
   20 cM between three genes and an observed three-point RF between the
   outer two of 30 cM, decide whether this is consistent with additive
   map distances (no, because double crossovers make the observed outer
   RF less than 15 + 20 = 35). Short-answer with feedback.
8. **Coupling vs repulsion.** Given a dihybrid testcross result (e.g.
   "Purple Plump and Yellow Shrunken are the most common classes"),
   infer the parental chromosome arrangement (`C Sh / c sh` coupling
   vs `C sh / c Sh` repulsion). Picklist answer.
9. **Map distance additivity check.** Given three genes with pairwise RFs
   of 8 cM, 10 cM, and 17 cM, decide which order is consistent with
   additivity (the middle-gene must be the one whose pairwise distance
   to each outer gene sums to the outer-to-outer distance). Picklist
   answer.
10. **50% ceiling.** Given two genes with an observed RF of 48%, decide
    whether the genes are "48 cM apart" or "on different chromosomes or
    very far apart on the same chromosome — you can't tell from the RF
    alone." Two-option answer.

Start with types 1, 2, 3, 5, 6 for the v2.1 ship (matching Mendelian's
starter of 5 types). Add 4, 7, 8, 9, 10 in subsequent passes.

**Implementation:**

- New files:
  - `src/curriculum/practice/linkage-problems.ts` — problem generators
    (parallel to Mendelian's `problems.ts`, NOT a rename; both modules
    need their own generators).
  - Extend the existing `src/curriculum/practice/PracticeMode.tsx` to
    accept a `problems` prop so the same session UI can serve both
    Mendelian and Linkage. Or, if that refactor is too invasive, create
    a `LinkagePracticeMode.tsx` that reuses the existing
    `spaced-repetition.ts` storage layer with a module-namespaced key
    (`linkage.ease.*`). Prefer the prop-based approach; it's cleaner.
- Sidebar modification in `ModuleShell.tsx` to mount the Practice tab
  for Linkage, themed cyan.
- `localStorage` key prefix: `linkage.practice.*`, `linkage.streak`,
  `linkage.ease.{concept}`. Keep Mendelian and Linkage stats separate.

**Design notes:**

- Match the cyan theme of the Linkage narrative.
- Respect the same no-gambling rules as Mendelian.
- Problems that reference numeric RF values must accept the textbook value
  AND the sampled value (same rule as Exp 3).
- Problem distractors should never be absurd (e.g. "1:1:1" as a four-class
  distractor). Use plausible-wrong ratios. Same rule as Mendelian Bundle F.

**Verification:** Run a 10-question session end-to-end. Does interleaving
rotate through the 5 starter types? Does the streak survive a page
reload? Does localStorage persist per-module (Mendelian streak unaffected
by Linkage practice)?

#### 3.2 — Experiment 0: Creighton & McClintock 1931

A new experiment before Exp 1 that stages the moment classical genetics
became physical.

**Flow:**

1. **Historical framing:**

   > It's 1931. At Cornell, Barbara McClintock and Harriet Creighton
   > are graduate students working on maize genetics. Everyone in the
   > field — going back to Morgan and Sturtevant in the 1910s — has been
   > using "crossing-over" as an abstract term for whatever produces
   > recombinant offspring. Nobody has *seen* a crossover. Nobody has
   > proven that crossing-over corresponds to a physical exchange of
   > chromosome segments. Some biologists still think genetic
   > recombination is a chemical process on a single chromosome, or
   > that the "chromosome exchange" language is just a metaphor.
   >
   > Creighton and McClintock have an idea: what if we took a maize
   > plant with two *cytologically visible* markers on one
   > chromosome — a knob at one end you can see under the microscope,
   > and a translocated piece at the other end you can also see — and
   > we made the same chromosome also carry two *genetic* markers we
   > can score in kernels? If crossing-over is a physical exchange,
   > then every time we see a recombinant kernel (a genetic crossover),
   > we should also see a recombinant chromosome (a physical swap of
   > the knob and the translocation) when we look at its pollen cells
   > under the scope.

2. **Prediction panel:** "If crossing-over is a physical chromosome
   exchange, what do you predict Creighton and McClintock observed when
   they looked at the chromosomes of recombinant kernels under the
   microscope?"
   - Recombinant kernels carry recombinant chromosomes (physical swap
     matches genetic recombination) — *correct*
   - Recombinant kernels carry the same chromosomes as parental kernels
     (genetic recombination doesn't correspond to physical change)
   - Recombinant kernels carry broken chromosomes
   - Recombinant kernels carry extra chromosomes
   (Student picks before seeing the result.)

3. **Observation:** A simplified diagram showing the four classes:
   parental genetic × parental cytological (common), parental genetic ×
   recombinant cytological (absent), recombinant genetic × parental
   cytological (absent), recombinant genetic × recombinant cytological
   (observed). The genetic and cytological classes **co-occur** — every
   observed recombinant kernel had the physically recombinant chromosome.

4. **Reveal:**

   > Every recombinant kernel Creighton and McClintock scored carried
   > a physically recombinant chromosome. Every parental kernel
   > carried a physically parental chromosome. Genetic recombination
   > corresponds to physical chromosome exchange. This was the first
   > proof that crossing-over is a real cytological event, not a
   > metaphor, and it was published in PNAS in August 1931. It is the
   > single most important paper in the history of the chromosome
   > theory of inheritance.

5. **Exit question:** "If you had to explain to a 1930 biologist
   skeptical of the chromosome theory of inheritance why Creighton and
   McClintock's result matters, you'd say…" — four options, the correct
   one being "it proves that recombination frequencies measured in
   kernels correspond to physical distances on chromosomes, so genetic
   maps are also physical maps." Leads naturally into Exp 1 ("now that
   you believe crossovers are physical, here is how to measure them").

**Why:** Frames the Linkage module the way Mendelian v2 frames Mendel —
as a scientific revolution rather than a set of procedures. Gives students
a reason to care about RF before they are asked to compute it. Creighton
and McClintock's paper is the Mendel 1865 of linkage and it deserves its
own experiment, not a footnote in Exp 5 feedback.

**Implementation:** New experiment `Exp0_CreightonMcClintock` in
`LinkageModule.tsx`, inserted at index 0 of `EXPERIMENTS`, renumbering
the rest. Uses the existing `ChromosomeDiagram` SVG with knob/
translocation decorations added as SVG primitives. Pure addition;
~250 lines. No new shared components (the knob and translocation marks
are local SVG inside this experiment).

#### 3.3 — Backwards problems throughout

For each of the seven narrative experiments (Exp 1–7 after renumber),
add a backward question panel after the forward one. Gate `onComplete`
on the backward question, the same way Mendelian v2 does. `latched`
state (`forwardEverCorrect`) so re-clicks don't erase progress.

**Examples (verify against final content during implementation):**

- **Exp 1 (Linked Genes).** Forward: "Why isn't this 1:1:1:1?" → same
  chromosome. Backward: "You observe an 8:1:1:8 testcross result. What
  can you conclude about the two genes?" Options: "close together on
  the same chromosome", "far apart on the same chromosome",
  "on different chromosomes", "one gene is epistatic to the other".
  Correct: close together on the same chromosome.
- **Exp 2 (Coupling vs Repulsion).** Forward: "Why do coupling and
  repulsion give different dominant phenotypes?" → arrangement.
  Backward: "A dihybrid testcross gives mostly Purple Plump and Yellow
  Shrunken with a few of the other classes. What is the parental
  chromosome arrangement?" Correct: coupling (`C Sh / c sh`).
- **Exp 3 (RF).** Forward: "Compute RF from the cross." Backward:
  "Given an RF of 10%, predict the four class proportions in a
  dihybrid testcross in coupling." (Student enters four numbers or
  picks from ratios.) Correct: ~45 : 5 : 5 : 45.
- **Exp 4 (Map distance).** Already partially reworked as a backward
  puzzle in Phase 2.2. Add a second backward question: "Two genes show
  an observed RF of 45% in a large testcross. Are they 45 cM apart?"
  Correct: "not necessarily — RF saturates near 50%, so 45% tells you
  they are *far apart*, but does not pin down the true cM distance
  without more information."
- **Exp 5 (Three-point).** Forward (post-2.3 un-telegraph): find the
  middle gene. Backward: "Given an 8-class testcross where the rarest
  class shows an allele flip at the FIRST gene, what does this tell
  you about the gene order?" Correct: the first gene listed must
  actually be the middle gene; the display order is not the true
  chromosomal order.
- **Exp 6 (Chi-square).** Forward: compute chi-square and reject 1:1:1:1.
  Backward: "You compute a chi-square of 1.2 with df=3. What do you
  conclude about the null hypothesis of independent assortment?"
  Correct: "fail to reject — the data are consistent with 1:1:1:1
  (the genes may be unlinked or very far apart)".
- **Exp 7 (Interference).** Forward: compute coincidence and interference.
  Backward: "A three-point cross yields an observed DCO frequency
  *higher* than expected (coincidence > 1). What is the interpretation?"
  Correct: "negative interference — one crossover makes a second
  crossover nearby *more* likely. Rare but reported in some eukaryotes."

**Why:** Backwards problems are where real genetic analysis lives. Every
published linkage paper starts with observed offspring and infers
underlying genotypes, arrangements, and map distances. Forward-only
teaching does not prepare students for actual research.

**Implementation:** Add a latched `forwardEverCorrect` bool to each
experiment (matching Mendelian's pattern). Add a backward `QuestionPanel`
below the existing forward one, gated on `forwardEverCorrect`. Gate
`onComplete` on the backward answer. ~30 lines per experiment × 7
experiments = ~210 lines total.

**Phase 3 total scope:** One new subsystem (~1200 lines across new
practice files), one new Exp 0 (~250 lines), seven backward additions
(~210 lines). Three or four commits. Two or three agent sessions.

Coordination note: Phase 3.2 (Exp 0) and Phase 3.3 (backward problems in
Exp 1–7) both touch `LinkageModule.tsx` but in disjoint regions — 3.2
prepends a new experiment at index 0, 3.3 edits the bodies of existing
experiments. They **cannot** run in parallel because 3.3 needs to
renumber after 3.2 lands and the `EXPERIMENTS` array edit will conflict.
Run 3.2 first, then 3.3.

---

## Visual design system (consolidated for agent reference)

### Colors

- **Primary (cyan, Linkage theme):** Bodies use `from-cyan-700 to cyan-800`
  gradients for CTAs, `bg-cyan-50 border-cyan-200` for success/teaching
  callouts, `text-cyan-800` for correct-answer prose. Sidebar and header
  use `ModuleShell.THEME.cyan` (`from-cyan-800 to cyan-700`).
- **Secondary (violet):** `bg-violet-50 border-violet-200 text-violet-800`
  for teaching callouts (crossover mechanism, Sturtevant's insight),
  prediction commitment inputs.
- **Neutral (stone):** `bg-stone-50 border-stone-200 text-stone-700` for
  informational callouts (chi-square null hypothesis, law definitions).
- **Error (dusty rose):** `bg-red-50 border-red-200 text-red-700` for wrong-
  answer feedback. Same shade as Mendelian.
- **Emerald accent:** Reserved for the `Complete Module` and PopGen-link
  CTAs at the end of Exp 7, echoing the "next module" convention
  Mendelian v2 uses (emerald-700 CTA linking to linkage.html).
- **Phenotype palette** (from `phenotypeFill()` + `KERNEL_*` defs — do
  not invent new colors):
  - Purple Plump (canonical parental): `#5a2a6b`
  - Yellow Shrunken (reciprocal parental): `#c49a48`
  - Purple Shrunken: `#4a1e5a`
  - Yellow Plump: `#e8c24a`
  - Waxy shifts warm the shade; non-waxy stays on the starchy tone.
- **Rule:** every phenotype label deterministically maps to a color.
  Never sort-order. `LinkageRatioBar` already enforces this post-audit.

### Typography

- **Body:** Nunito (load via `linkage.html`; currently loaded).
- **Handwritten flavor:** Patrick Hand for Exp 0 historical callouts and
  the Sturtevant/Creighton quotes. **Not currently loaded in
  `linkage.html` — Phase 1 adds the font link.**
- Same rule as Mendelian: handwritten font for flavor only, not body text.

### Cards and layout

- `rounded-2xl`, `border border-stone-200 shadow-sm`, `p-6` body padding,
  `space-y-6` stacks. Match Mendelian exactly.

### Animation

- **Defaults:** Fade-in 300ms, slide 400ms, dot-plot reveal 500ms.
- **Crossover visualizer:** 2000ms per full cycle (pairing → replication →
  chiasma → exchange → gamete selection), with speed slider and step-
  through. `prefers-reduced-motion` bypasses the animation entirely.
- **Celebrations:** ≤2000ms. Subtle. Skippable. No gambling mechanics.
- **Dependency check:** Framer Motion if already in `package.json` (the
  Mendelian v2 build checked and used CSS transitions — verify again
  before starting Phase 2).

### Icons

- Chromosomes via `ChromosomeDiagram` SVG (local to `LinkageModule.tsx`,
  extended in Phase 2 with chiasma primitives inside
  `CrossoverVisualizer`). Kernels via `phenotypeFill()` colored rects
  (`LinkageRatioBar`). No raw divs-as-kernels, no emoji.

### Charts

- Reuse `LinkageRatioBar`. If a new chart type is genuinely needed (e.g.
  a dot-plot strip for the Phase 1.5 "run 10 more times" feature),
  design with the same `rounded-2xl` / stone-50 aesthetic.

### Fun ground rules

- Same as Mendelian. Yes to micro-animations, streaks, discovery, historical
  storytelling, charming copy. No to XP, leaderboards, random rewards.

---

## Success criteria — what "done" looks like

A student who finishes the full Linkage v2 module (Exp 0 through Exp 7 plus
~5 practice sessions) should be able to:

1. **Recognize linkage from a testcross ratio.** Look at 9:3:3:1 vs
   1:1:1:1 vs 7:1:1:7 vs 4:1:1:4 and instantly classify: unlinked (9:3:3:1
   from F2 or 1:1:1:1 from testcross), loose linkage, tight linkage.
2. **Compute RF from raw offspring counts** in their head:
   `RF = (recombinants / total) × 100%`. Forward problem type.
3. **Convert RF to map distance.** 1% recombination = 1 centimorgan, for
   short distances. Explain the caveat for long distances.
4. **Explain crossing-over molecularly** as a physical chiasma and
   break/rejoin exchange of chromatid segments during prophase I of
   meiosis. Not "the genes swap" or "crossing-over happens" — the
   physical mechanism.
5. **Recognize a noisy RF estimate.** Look at 13 recombinants out of 80
   kernels (16.25%) and correctly call it "consistent with a true RF
   of 17% at this sample size" rather than treating it as a different
   map distance.
6. **Do a three-point cross.** Given an 8-class testcross result, identify
   the middle gene from the rarest class and explain *why* (the rarest
   class is the double crossover, and a double crossover flips only the
   middle gene).
7. **Explain the 50% RF ceiling.** Two genes with an observed RF of 48%
   cannot be "48 cM apart" — they are *far apart* (or on different
   chromosomes), and the RF has saturated.
8. **Explain why apparent map distance underestimates true distance** for
   long intervals (double crossovers between three or more markers cause
   pairwise RFs to lose sign from the middle of the interval).
9. **Name Creighton & McClintock 1931** and explain what they proved
   (genetic recombination corresponds to physical chromosome exchange;
   the chromosome theory of inheritance was established as cytologically
   grounded, not metaphorical).
10. **Name Sturtevant 1913** and explain what he proved (RF is
    proportional to physical distance, and genes can be arranged on a
    linear map — the first genetic map was built this way).

Right now v1 gets a student to maybe 3 of these 10 (the compute-RF move,
the "same chromosome" recognition, the three-point procedure). Phase 1
alone should reach 5–6 (adding the molecular mechanism, the 50% ceiling,
and Sturtevant's name). Phase 2's crossover visualizer should add 1, 4,
and 6 (because students finally see what the procedure is measuring).
Phase 3 adds 5, 7, 8, 9 via practice and Exp 0.

**If a student can do 8 of 10 after v2, we've shipped something real.**

---

## Launch instructions (for agents)

Same pattern as Mendelian v2. One phase per agent dispatch. Each agent
reads `CLAUDE.md`, the relevant section of this plan, and the source
file(s) it will edit, in that order.

### Launching Phase 1 (recommended first)

Dispatch a single agent with this brief:

> Read `docs/LINKAGE_V2_PLAN.md` — Phase 1 section. Read `CLAUDE.md` at
> the repo root. Read `src/curriculum/LinkageModule.tsx` end to end. Read
> the linkage-specific pieces of `linkage-engine.ts`. Confirm the engine
> is untouched by your work.
>
> Implement Phase 1 items 1.1 through 1.9 in `src/curriculum/LinkageModule.tsx`
> plus the Patrick Hand font load in `linkage.html`. No new shared
> components, no engine changes. Respect the cyan theme, `cyan-700` for
> all CTAs (WCAG fix), violet for teaching callouts, plant slash notation
> everywhere.
>
> Verify: `npx tsc -b` clean. Grep the file for `from-cyan-500` — should
> return zero matches after 1.8. Grep for `Shsh` (no slash) — should be
> zero. Verify Exp 3 validation still accepts both the sampled RF and
> the textbook 17.
>
> Commit with a clear multi-line message explaining what each item does
> and the F-ID range it addresses. Do not commit to
> `linkage-engine.ts`, `components/`, or anything outside `LinkageModule.tsx`
> and `linkage.html`.

### Launching Phase 2

Two agents in parallel (files are disjoint):

**Agent 2A (CrossoverVisualizer):**
> Read `docs/LINKAGE_V2_PLAN.md` — Phase 2 item 2.1. Read the existing
> `GameteVisualizer.tsx` as a reference implementation for animation
> structure. Check `package.json` for Framer Motion (use if present,
> CSS transitions if not).
>
> Add a new `makeGameteWithTrace()` function to `linkage-engine.ts` that
> returns the gamete plus the crossover positions it used, so the
> visualizer can animate the engine's actual randomness. Keep existing
> `makeGamete` as a thin wrapper so no callers break.
>
> Create `src/curriculum/components/CrossoverVisualizer.tsx` with the
> behavior described in the plan — synapsis, replication, chiasma,
> exchange, gamete selection beats, speed slider, step-through mode,
> `prefers-reduced-motion` handling. Export from `components/index.ts`.
>
> Create `CrossoverVisualizerDemo.tsx` as a dev harness showing a
> `C Sh / c sh` chromosome cycling every 2 seconds. Add an on-screen
> counter for "measured RF over last 100 gametes" to verify the
> visualization matches the engine.
>
> Do NOT wire it into `LinkageModule.tsx` yet — that's for the follow-up
> wiring agent.

**Agent 2B (Exp 4 + Exp 5 reworks):**
> Read `docs/LINKAGE_V2_PLAN.md` — Phase 2 items 2.2 and 2.3. Refactor
> `Exp4_MapDistance` and `Exp5_ThreePointCross` in
> `src/curriculum/LinkageModule.tsx` following the plan. Keep the
> randomized-per-run sample from `linkedCross` (do not hardcode offspring
> counts). Per-option teaching feedback for Exp 5's middle-gene question.
>
> Only `LinkageModule.tsx` changes. Do NOT touch `linkage-engine.ts`
> (Agent 2A owns that file for Phase 2) or `components/`.

Once both land, a third follow-up agent wires the `CrossoverVisualizer`
into Exp 1, Exp 2, and Exp 3 via a "Show crossover" toggle, with
sessionStorage-sticky collapse state.

### Launching Phase 3

Phase 3 is the biggest. Sequential, not parallel (they share state):

**Agent 3A (Exp 0 — Creighton & McClintock):** Add
`Exp0_CreightonMcClintock` to `LinkageModule.tsx` following item 3.2.
Prepend at index 0 of `EXPERIMENTS`. Do not touch Exps 1–7 yet. Include
the cytological knob/translocation SVG primitives as local SVG inside
the experiment — no new shared components.

**Agent 3B (Practice Mode — Linkage):** Create
`src/curriculum/practice/linkage-problems.ts`. Refactor
`PracticeMode.tsx` to accept a `problems` prop so it can serve both
modules, or create `LinkagePracticeMode.tsx` if the refactor is too
invasive. Namespace `localStorage` keys as `linkage.practice.*` so
Linkage and Mendelian streaks don't collide. Start with the 5 v2.1
problem types (1, 2, 3, 5, 6). Update `ModuleShell.tsx` sidebar to
mount the Practice tab for Linkage with cyan theme.

**Agent 3C (Backwards problems for Exp 1–7):** Add a latched
`forwardEverCorrect` bool to each of the seven narrative experiments,
add a backward `QuestionPanel` below each forward panel, gate
`onComplete` on the backward answer. Follow item 3.3 for the content of
each backward question. Use the `latched` monotonic pattern from
Mendelian v2 cleanup pass 3.

Between phases, run a **cleanup pass** agent to address any debt
flagged by the previous phase's agents. Same rule as Mendelian v2: "we
don't leave trash behind, we fix as we go."

### Launching Phase 5 — peer review and fix cycle

Once Phase 3 lands, follow the methodology in
`docs/CURRICULUM_DEVELOPMENT_METHODOLOGY.md`: four independent peer
reviewers in parallel (plant geneticist, first-encounter undergrad,
pedagogy researcher, UX/QA engineer), each writing to
`/tmp/linkage-peer-review/reviewer-N-*.md`, followed by a synthesis pass
into `MASTER_REPORT.md`, followed by a fix cycle dispatched as bundles.
Exactly the shape of the Mendelian v2 peer review. Non-negotiable for
shipping.

### Verification approach

At the end of each phase:

- `npx tsc -b` clean. Hard gate.
- `vite build` clean. Second hard gate.
- Manual walk of affected experiments on dev server or deployed site.
- Grep for CTA contrast: `from-cyan-500 to-cyan-600` should never appear
  after Phase 1.8. `cyan-700` is the minimum.
- Grep for notation drift: `Shsh`, `Wxwx`, `Cc ` (without slash) should
  not appear in prose. (They legitimately appear in `phenotypeMap` keys
  of `linkage-engine.ts`; those are internal and should stay.)
- For engine additions (Phase 2 `makeGameteWithTrace`), verify with a
  numeric script: run 10,000 gametes, compute observed RF, compare to
  supplied `recombFreqs`. Measured/expected ratio should be 1.0 ± 0.02.
  Paste ratios into the commit message.
- For the crossover visualizer, open the demo harness and watch 20
  cycles. Does the chiasma visually line up with the actual crossover
  the engine executed? Does the resulting chromatid carry the alleles
  the animation suggests?
- Commit as one commit per phase item or closely-related group, with
  clear multi-line messages. Never skip hooks.

---

## Out of scope for v2

These are explicitly deferred:

- **Multi-language support.** Stay English-only.
- **Teacher dashboards, LMS, accounts, backend.** Pure single-student
  client-side tool. `localStorage` only.
- **Save/load custom crosses.** Student can't design and save their own
  linkage setups.
- **Mitotic recombination, gene conversion, break-induced replication.**
  These are graduate topics.
- **Physical mapping (cytogenetic banding, FISH, sequencing-based maps,
  radiation hybrid maps).** Different topic — physical mapping is a
  separate module.
- **Linkage disequilibrium decay across generations.** That's a PopGen
  topic and the PopGen module is the place for it. The Exp 7 tease just
  hands off.
- **QTL mapping, association mapping, GWAS.** Quantitative linkage is a
  separate module.
- **Sex-linked inheritance.** No X-linked examples; plant genetics mostly
  doesn't use sex linkage and it's a Mendelian-module topic anyway.
- **Gene conversion and tetrad analysis in fungi.** Different organism,
  different mechanism.
- **Multi-locus genomic selection.** Not a linkage topic.
- **Mendelian or PopGen module changes.** Linkage v2 only touches
  `LinkageModule.tsx`, `linkage-engine.ts`, `linkage.html`, new files in
  `components/`, new files in `practice/`, and the specific
  `ModuleShell.tsx` hooks needed to mount the Linkage Practice tab.

---

## References

### Project files

- `CLAUDE.md` (repo root) — project-level pedagogical contract, bug
  classes, architecture pointers.
- `docs/MENDELIAN_V2_PLAN.md` — the template this plan follows
  section-for-section.
- `docs/CURRICULUM_DEVELOPMENT_METHODOLOGY.md` — the five-phase pattern,
  the four reviewer personas, the agent orchestration recipe.
- `src/curriculum/LinkageModule.tsx` (~1091 lines post-audit) — the
  current v1 module this plan supersedes.
- `src/curriculum/linkage-engine.ts` (~446 lines post-audit) — the
  simulation engine. `threePointAnalysis` verified correct; uses
  `canonicalGenotypeKey` from `genetics-engine.ts`.
- `src/curriculum/genetics-engine.ts` — shared engine primitives.
- `src/curriculum/components/` — shared components. `GameteVisualizer.tsx`
  is the reference implementation pattern for the new
  `CrossoverVisualizer`. `colors.ts` holds the shared `phenotypeFill`.
- `src/curriculum/practice/` — Mendelian practice mode subsystem. The
  Linkage practice mode reuses its `spaced-repetition.ts` storage and
  its `PracticeMode.tsx` session UI (refactored to accept a `problems`
  prop).
- `src/curriculum/MendelianModule.tsx` — the 7:1:1:7 vs 1:1:1:1 preview
  in Exp 5 (around line 2039–2134) is the narrative handoff this plan
  honors.
- `lab.html` / `linkage.html` / `popgen.html` / `modules.html` — Vite
  multi-page entry points.

### Historical references

- **Creighton, H. B., & McClintock, B. (1931).** "A correlation of
  cytological and genetical crossing-over in *Zea mays*." *Proceedings
  of the National Academy of Sciences*, 17(8), 492–497. The canonical
  proof that genetic recombination corresponds to physical chromosome
  exchange. The basis of Exp 0.
- **Sturtevant, A. H. (1913).** "The linear arrangement of six sex-linked
  factors in *Drosophila*, as shown by their mode of association."
  *Journal of Experimental Zoology*, 14(1), 43–59. The first genetic
  map. Note: Sturtevant worked in *Drosophila*, and this is the only
  place in the module where *Drosophila* is acknowledged — a historical
  mention in Exp 4 prose. There is no *Drosophila* experiment, visual,
  diagram, or simulation anywhere in the Linkage module. The experiments
  and visuals stay on maize chr9.
- **Morgan, T. H. (1911).** "Random segregation versus coupling in
  Mendelian inheritance." *Science*, 34(873), 384. The first
  demonstration that some genes don't assort independently — the empirical
  puzzle Sturtevant solved two years later. Optional historical mention.

### Prior audit

- `/tmp/linkage-audit/REPORT.md` — April 2026 peer-review audit (13
  bugs, 3 CRITICAL). Found and fixed: `threePointAnalysis` single-
  crossover misclassification, Exp 3 tolerance rejecting the textbook
  answer, Exp 6 chi-square on hardcoded data. This report exists only
  during active audit sessions; re-audit can be re-run from CLAUDE.md
  and this plan's success criteria.
