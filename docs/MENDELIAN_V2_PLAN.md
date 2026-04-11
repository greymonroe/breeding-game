# Mendelian Module v2 — Vision & Implementation Plan

**Status:** Planning. Created 2026-04-10 after the April 2026 peer-review audit
of the three curriculum modules. Supersedes the ship-ready-but-pedagogically-thin
v1 Mendelian module (committed in `670148c`, `54e6971`).

**Read first:** `CLAUDE.md` at the repo root. Then come back here.

---

## The north star

A student who finishes the Mendelian v2 module should be able to **solve any
monohybrid, dihybrid, or trihybrid cross they've never seen before, in their
head, in under a minute, by reasoning about gametes and multiplying
probabilities** — not by pattern-matching memorized ratios. They should
understand why Mendel's laws are true at the gamete level, why they sometimes
break, and what made Mendel's 1865 proposal a scientific revolution. They
should also have fun doing it.

Right now (v1), a student who finishes the module can pick "3:1" from a menu
after seeing a bar chart. That's not the same thing.

---

## The four principles

Every decision in this plan is graded against these four axes. If a change
doesn't serve at least three of them, drop it. If it actively fights one of
them, it's out.

### 1. Genetic accuracy

- Every number on screen must be derivable from textbook genetics. Engine
  outputs must match closed-form predictions within stochastic noise.
- Plant examples only (see `CLAUDE.md` → plants-only rule). Peas for monohybrids,
  snapdragons for incomplete dominance, maize aleurone for epistasis, tomato/
  Arabidopsis for polygenic.
- Notation must be internally consistent across all experiments. Slash
  notation for plant alleles (`Cc Rr`, not `CcRr` or `Cc/Rr`).
- Dominance must be explained *molecularly* (one functional enzyme copy is
  usually enough), not as "strength."
- Never validate a student's answer against a stochastic sample as if it were
  the target. Textbook answers must be accepted even when the sample drifts.
- Every experiment uses the student's own cross data where possible. No
  hardcoded magic-number arrays.

### 2. Visual aesthetic consistency

- Emerald theme (`from-emerald-500 to-emerald-600` gradients, `bg-emerald-50`
  success callouts, `bg-stone-50` neutral callouts). Violet for interactive
  hints. Red for errors. Match the existing Mendelian look.
- Typography: Nunito for body, Patrick Hand for handwritten-feel headers and
  callouts (the "lab notebook" aesthetic already set by v1).
- All organisms rendered through `src/shared/icons/PlantIcon.tsx` and
  `src/curriculum/components/OrganismCard.tsx`. **Never raw circles or ad-hoc
  SVGs.** Every plant in the module is visually the same family of illustration.
- Phenotype colors mapped deterministically by semantic meaning. Red flower →
  the same red everywhere. Purple aleurone → the same purple everywhere. Never
  sort-order coloring. See `FLOWER_COLOR.colorMap` and the `phenotypeFill`
  pattern.
- Charts: consistent axis styling, emerald/stone palette backgrounds, labeled
  axes with proper units. Reuse `RatioBar`, `FrequencyChart`, `HistogramChart`
  — don't invent new chart components unless genuinely needed.
- Motion: subtle. Fade-ins 200-400ms, gamete animations 1.5-2s, never jarring.
  Use Framer Motion if a new animation lands (dependency check first — if it's
  not already in the project, use CSS transitions instead of adding a dep).
- Cards: `rounded-2xl`, subtle `border border-stone-200`, `shadow-sm`, generous
  `p-6` padding. Match the existing `ModuleShell` card aesthetic.
- Icons and decorative elements are always plants or kernels or seeds, never
  emoji, never abstract shapes.

### 3. Pedagogical value

- Every experiment should pass the **"new problem test"**: after this
  experiment, can the student solve a cross they've never seen?
- Every concept should have a **discovery beat**: the student observes
  something that forces them to update their model. Never tell the student the
  answer before they've had a chance to be surprised.
- **Forward and backward problems.** Every experiment's question panel should
  have a forward question ("given these parents, what ratio?") and a backward
  question ("given this ratio, what must the parents have been?") — because
  real genetic analysis is backward.
- **Gametes are the mechanism**, not Punnett squares. Show haploid gametes
  segregating from each parent and randomly fusing. Punnett squares are one
  visualization of this; the underlying concept is the multiplication rule on
  independent random events.
- **Name the laws.** Law of Segregation at the end of Exp 2. Law of Independent
  Assortment at the end of Exp 5. Explicitly say "these are two separate claims,
  and the second one can break — find out in the Linkage module."
- **Noise literacy.** Students need to see sampling variation with their own
  eyes so they stop panicking when 3:1 comes out as 72:28 instead of 75:25.
- **Spaced, interleaved practice** beats blocked practice. Practice mode
  should interleave problem types within a session (monohybrid, dihybrid, test
  cross, incomplete dominance in rotation), not drill one type ten times in a row.

### 4. Fun

Fun is the newest axis and the one that v1 completely ignored. Fun in a
genetics learning context means:

- **Playful micro-interactions.** Gametes that *actually* split off from the
  parent card and drift toward each other before fusing. Small celebratory
  animations on correct answers (a seed pod popping open, a flower blooming).
  Never jarring, always ~200-500ms.
- **Historical storytelling.** Mendel in his monastery garden, 1865. The
  dominant theory of the time was blending inheritance, and Mendel's peas
  broke it. That story is inherently interesting — lean into it.
- **Discovery moments.** You predict → you observe → "wait, that's not what
  I predicted" → aha. Set up every experiment as a small mystery.
- **Streaks and small celebrations** in practice mode. 🔥 for consecutive-day
  practice sessions (Duolingo's single most addictive mechanic). A small
  confetti or seed-scatter animation on a 10/10 session. No gambling mechanics,
  no XP for its own sake, no leaderboards — just the satisfaction of getting
  problems right.
- **Easter eggs.** "What if I cross a pea with a snapdragon?" → a small gentle
  "Hybrid sterile! Different species. Try again with parents of the same
  species." One line, charming.
- **Beautiful visuals that reward looking closely.** The plant icons already
  have stems and leaves and fruits. Make the parent cards feel like individual
  plants in Mendel's garden, not generic sprites. Hover states, small
  animations.
- **A sense of playing with real living things, not solving math problems.**
  The cross button should feel like pollinating a plant, not submitting a form.
  Framing matters.

If a feature increases student understanding but makes the module feel
clinical, push back. If a feature is fun but muddies the science, drop it.
The sweet spot is where all four principles align.

---

## Current state (honest)

### What v1 is good at

- Scientifically correct engine (`genetics-engine.ts`, post-audit). Every
  ratio verified against closed-form chi-square. No Linkage-style math bugs.
- Plant-themed throughout (peas, snapdragons, maize aleurone) post-audit.
- Seven-experiment ladder covers: monohybrid → test-cross reasoning →
  incomplete dominance → test cross diagnosis → dihybrid → epistasis →
  polygenic. Textbook progression.
- Exp 2 coupling-vs-repulsion-adjacent (already introduces the test cross
  concept informally).
- Post-audit, Exp 4 mystery is randomized and the conclusion is conditional on
  observed data.

### What v1 is missing

Everything the north star demands. Specifically:

- **No gamete visualization.** Students see parents → offspring as a magic
  box. They never see the haploid gamete step, so they can't reason about
  crosses mechanically.
- **No probability rules taught explicitly.** 9:3:3:1 is demonstrated, not
  derived. Students memorize the ratio instead of learning to multiply two
  3:1s.
- **No historical framing.** No particulate-vs-blending contrast, no 1865
  context, no sense that Mendel was a revolution.
- **No practice mode.** Every experiment is one-shot. Zero repetition,
  zero skill automation.
- **No inverse problems.** Every question is "given parents, what ratio?"
  Zero "given this ratio, what parents?" which is where real research lives.
- **No noise literacy.** Students see 72:28 once and are told "that's 3:1."
  No intuition for when sampling variation matters.
- **No molecular explanation of dominance.** Students leave thinking
  dominant = "stronger" or "more common."
- **No linkage tease.** Mendelian Exp 5 ends without motivating the Linkage
  module. Students who skip Linkage never learn that the second law can break.
- **No "informative cross" framing for Exp 4.** The test cross is demonstrated
  rather than reasoned into. Students don't learn *why* you'd pick this cross.
- **No celebration / fun mechanics.** Correct answers produce a green callout.
  That's it.

These are all addressable. The module has a good skeleton; what it needs is a
real pedagogical and aesthetic layer on top.

---

## The plan: three phases

Phases are independent. Ship Phase 1 first, then decide whether to continue.
Each phase should be a separate launch with its own verification pass.

### Phase 1 — Pedagogy tightening (1 agent session, ~1 day)

**Scope:** Text, callouts, small interactive additions inside existing
experiments. No new components, no new mechanics. Pure pedagogy. High leverage,
small risk.

**Items:**

#### 1.1 — Derive 9:3:3:1 from (3:1) × (3:1) in Exp 5
Before running the dihybrid cross, show the student a two-step derivation:
- "Gene 1 (flower color) gives 3 red : 1 white. Gene 2 (seed shape) gives 3
  round : 1 wrinkled. If the genes are independent, the probability of any
  combination is just the product of the individual probabilities."
- Show a small 2×2 grid: `3/4 × 3/4 = 9/16` red-round, `3/4 × 1/4 = 3/16`
  red-wrinkled, `1/4 × 3/4 = 3/16` white-round, `1/4 × 1/4 = 1/16` white-wrinkled.
- Click "Run the cross" → 9:3:3:1 appears → "You just derived the Law of
  Independent Assortment."

**Why:** Turns 9:3:3:1 from a memorized ratio into a reasoned derivation. This
single change is the most efficient way to increase a student's transfer
ability for multi-gene problems.

**Implementation:** Inline React component within Exp 5, rendered before the
`CrossWorkbench`. No new shared components. Uses existing `RatioBar` aesthetic
for the grid.

**Verification:** Student should see the derivation, understand multiplication,
and then see 9:3:3:1 on the bar immediately after.

#### 1.2 — Noise literacy in Exp 1 ("Run 10 times")
After the F2 cross, add a "Run this cross 10 more times" button. It runs 10
independent replicates of Rr × Rr and displays each result as a dot or small
bar on a compact histogram, with a shaded band indicating the "textbook 3:1
zone" (0.70–0.80 red fraction).

Caption: "Every one of these is 3:1. Real experiments have sampling variation —
72:28 is still 3:1, so is 82:18. Don't panic when your numbers aren't exact."

**Why:** Builds the foundation of all future chi-square reasoning. Students who
see sampling variation once stop flinching at it forever.

**Implementation:** Reuse the existing `simulate` / `cross` engine. Output is
10 small replicates, render as compact dot-plot. Roughly 40 lines.

**Verification:** The variation band should span observed red fractions from
~0.65 to ~0.85 over 10 replicates.

#### 1.3 — Dominance molecular callout in Exp 1
One violet callout in Exp 1, after the F1 question:

> **Why is R dominant over r?** The R allele codes for a working enzyme that
> makes red pigment. The r allele is a broken version — it can't make pigment.
> A plant with even one R allele (Rr) makes enough pigment to look red.
> Dominance isn't about which allele is "stronger" or "wins" — it's about
> whether one working copy is enough to produce the phenotype.

**Why:** Kills the single most common student misconception (dominant =
"stronger" or "better"). One sentence of real biology.

**Implementation:** Prose callout. Zero code complexity.

**Verification:** The word "stronger" should never appear in the module's
explanation of dominance. "Enough" and "working" should.

#### 1.4 — Name the two laws explicitly
At the end of Exp 2, add a named callout:

> **Law of Segregation (Mendel's First Law):** In diploid organisms, the two
> alleles at a locus separate (segregate) into different gametes during meiosis.
> Each gamete carries exactly one allele. When gametes fuse at fertilization,
> the offspring gets one allele from each parent.

At the end of Exp 5, add a second named callout:

> **Law of Independent Assortment (Mendel's Second Law):** When two (or more)
> genes are on *different chromosomes*, their alleles segregate into gametes
> independently. This is why dihybrid crosses give 9:3:3:1 instead of 3:1.
>
> **⚠ This law can break.** When two genes are close together on the same
> chromosome, they tend to travel together in gametes — this is called linkage,
> and the 9:3:3:1 ratio is distorted. Find out in the **Linkage module →**.

**Why:** Students need to know these are two separate claims and that one can
fail. This sets up the Linkage module as a genuine sequel instead of an
unrelated topic.

**Implementation:** Two prose callouts with the Linkage module link. Zero code
complexity.

#### 1.5 — Linkage tease quiz at end of Exp 5
After the 9:3:3:1 question, add one final question:

> Mendel's 7 traits were all on different chromosomes — he got lucky. What
> do you think would happen if the color gene and the shape gene were right
> next to each other on the same chromosome?
> 
> - (a) The same 9:3:3:1 ratio would still appear.
> - (b) The parental combinations would be over-represented, not 9:3:3:1.
> - (c) All offspring would be the same.
> - (d) The genes would fail to assort at all.

Correct: **(b)**. Feedback (regardless of answer): "Find out for yourself in
the Linkage module →" with a big emerald CTA button linking to `linkage.html`.

**Why:** Motivates the Linkage module, creates narrative continuity between
curriculum modules, and leaves the student curious instead of done.

**Implementation:** Reuse existing `QuestionPanel`. Add a CTA button below.

**Phase 1 total scope:** ~300 lines of additions to `MendelianModule.tsx`, no
new components, no engine changes. One agent session. Should compile cleanly
and deploy without risk.

---

### Phase 2 — Mental model components (1-2 agent sessions, ~2 days)

**Scope:** Two larger changes. One new shared component (gamete visualizer)
that touches multiple experiments, and one major rework of Exp 4 into a real
reasoning puzzle.

#### 2.1 — Gamete Visualizer (`components/GameteVisualizer.tsx`)
The single biggest missing mental model in the module. A new shared component
that animates meiotic segregation and fertilization.

**Behavior:**
- Takes two parent organisms and the list of genes.
- Renders each parent with its genotype visible (e.g. "Rr" next to the parent).
- On trigger (either automatic at cross time or a "Show Gametes" toggle):
  1. Each parent card splits vertically. Two small haploid "gamete cells"
     emerge from each parent, each carrying one randomly-chosen allele
     (shown as a mini-card with just that allele visible).
  2. One gamete from each parent drifts toward the center.
  3. The two gametes fuse into a single offspring cell.
  4. The offspring cell reveals its genotype (determined by the two incoming
     alleles) and phenotype (based on dominance rules).
  5. Repeat N times (where N = sample size), building the offspring population.
- Animation duration: ~1.5-2 seconds per cross, with a speed slider.
- Toggle: students can switch between "Gamete view" (animated segregation)
  and "Punnett view" (the classic 2×2 or 4×4 grid) for the same cross.

**Why:** This is how you teach *why* Mendel's laws are true. The 3:1 ratio is
an emergent property of haploid gamete segregation + random union + dominance.
Without seeing gametes, students memorize ratios. With gametes, they derive them.

**Design notes:**
- **Aesthetic:** Gametes are small circles or teardrops colored by the allele
  they carry (uses the existing phenotype color palette). Parent cards are
  the existing `OrganismCard` components. Animation uses CSS transforms
  (translate, scale, fade) — no new animation dependency needed unless the
  project already has Framer Motion.
- **Pedagogy knobs:** Speed slider (0.5×, 1×, 2×), "step through" mode so
  students can pause at each beat (meiosis → migration → fusion → phenotype),
  "show labels" toggle.
- **Reuse:** This component is used in Exp 1 (Rr × Rr → 3:1), Exp 2 (Rr × rr →
  1:1), and Exp 5 (dihybrid). Same component, different parents.

**Implementation:**
- New file: `src/curriculum/components/GameteVisualizer.tsx`
- ~300-400 lines with animation logic.
- Uses `cross()` from `genetics-engine.ts` for the actual gamete draws — the
  animation is a visualization of the same randomness that `cross()` computes.
- Exported from `components/index.ts`.

**Verification:** Manual visual walk. Does the segregation feel intuitive?
Do the gametes clearly show only one allele? Does the offspring's genotype
match what the two incoming gametes would imply? Is it beautiful?

#### 2.2 — Exp 4 real-puzzle rework
Currently Exp 4 is "pick the cross the module wants you to pick" (the "(rr)"
telegraph is removed post-audit, but the flow is still demo-shaped, not
puzzle-shaped). Rework it as a reasoning puzzle:

**New flow:**
1. "You have a red plant. It could be RR or Rr — you can't tell by looking.
   Your task: design a cross that will tell you which."
2. "Which plant should you cross it with?"
   - Another red plant (genotype unknown) — *wrong: not informative, could
     be anything*
   - A red plant confirmed to be RR — *wrong: all offspring will be red
     regardless of your mystery plant's genotype*
   - A red plant confirmed to be Rr — *wrong: produces white only if the
     mystery plant is Rr, but also produces red in both cases — ambiguous*
   - **A white plant (rr)** — *correct: white offspring reveal that the
     mystery plant must carry an r allele*
3. Feedback on each wrong answer explains *why* it's uninformative (not just
   "wrong"). This is the teaching moment.
4. After the correct choice, the randomized mystery plant is revealed and the
   cross runs. The conclusion branches conditionally on observed data
   (this part is already done post-audit).
5. Then: "Cross a test cross = cross with a homozygous recessive tester. This
   lets recessive alleles be exposed in the offspring. It's one of the most
   powerful tools in classical genetics."

**Why:** The test cross is a diagnostic tool, not a ritual. Students need to
discover *why* rr is the right tester (because it contributes only r, so any
rr offspring immediately reveals the mystery plant must carry r). Right now
v1 just hands them the answer.

**Implementation:** Refactor of `Exp4_TheTestCross`. Adds an "informative cross
selection" step before the actual cross. ~100-150 lines of additions.

**Verification:** A student who doesn't already know test crosses should be
able to reason their way to picking `rr` after reading the options. Each
wrong-answer feedback should genuinely explain the reasoning.

**Phase 2 total scope:** One new component (400 lines), one module rework
(150 lines). Two commits. One or two agent sessions depending on how much
design iteration the gamete visualizer takes. **The gamete visualizer is the
single most impactful visual addition in the entire plan — take time to get
it right.**

---

### Phase 3 — Practice mode + historical Exp 0 + inverse problems (2-3 agent sessions, ~3-4 days)

**Scope:** The biggest investment. Adds a completely new subsystem (practice
mode with spaced repetition), a new "experiment 0" that stages the historical
debate, and backwards-problem additions throughout the narrative experiments.

#### 3.1 — Practice Mode subsystem

A second sidebar tab alongside the 7-experiment narrative. Duolingo-flavored
rapid practice.

**Behavior:**
- Sidebar gains a new "Practice" section below the 7 experiments.
- Clicking it opens a problem set interface instead of a single experiment.
- Sessions are 10 questions, ~30 seconds per question, with immediate feedback.
- Questions are generated from a problem bank with multiple difficulty levels.
- **Interleaved, not blocked:** each session mixes problem types within the
  session. No "10 monohybrids in a row."
- **Adaptive difficulty:** track per-concept accuracy in `localStorage`.
  Concepts with low accuracy resurface more often.
- **Spaced repetition:** a concept the student aced yesterday reappears in
  3-5 days, not the next session.
- **Streak counter:** 🔥 for consecutive-day sessions. Reset to 0 on miss.
- **End-of-session scorecard:** "9/10 correct! Your weakest concept this
  session: dihybrid backward problems. You'll see more of those next time."
- **Celebratory animation** on 10/10: seed scatter or flower bloom, 2 seconds,
  nothing gaudy.

**Problem types (minimum v2.1 set):**
1. **Forward monohybrid:** "Rr × Rr → what ratio?" (picklist answer)
2. **Forward dihybrid:** "AaBb × AaBb → what's P(aabb)?" (numeric answer)
3. **Backward monohybrid:** "You see a 3:1 ratio — what are the parents?"
4. **Backward dihybrid:** "You see 9:3:3:1 — what are the parents?"
5. **Test cross reasoning:** "You have a red plant (? genotype). What cross
   tells you its genotype? Why?"
6. **Noise recognition:** "A cross produced 71 red and 29 white. What ratio
   is this?" (3:1, 1:1, 2:1, something else)
7. **Multi-gene probability:** "AaBbCc × AaBbCc → P(aabbcc)?" Answer: 1/64.
8. **Odd-one-out:** Given 4 crosses, pick the one that violates Mendel's
   laws (e.g. linked genes, sex-linked, lethal allele).
9. **Incomplete dominance:** "Red × white → pink F1. F2 ratio?"
10. **Epistasis:** "CcRr × CcRr, recessive epistasis → what ratio?"

Start with types 1, 2, 3, 6, 9 for the v2.1 ship. Add 4, 5, 7, 8, 10 in
subsequent passes.

**Why:** Skill automation requires varied spaced practice. Duolingo is
notoriously effective for probability reasoning (it's essentially what language
learning is — pattern matching under time pressure with immediate feedback).
Giving students a practice mode turns the module from a 1-hour tutorial into a
15-minutes-a-day habit.

**Implementation:**
- New file: `src/curriculum/practice/PracticeMode.tsx` (~400 lines for the
  session interface, scoreboard, streak tracking).
- New file: `src/curriculum/practice/problems.ts` (problem generators — each
  function produces a randomized instance of a problem type).
- New file: `src/curriculum/practice/spaced-repetition.ts` (per-concept
  accuracy tracker, scheduling logic, persisted in `localStorage`).
- Sidebar modification in `ModuleShell.tsx` to add the "Practice" section.
- New entry point `practice.html` OR integration as a tab within `lab.html`.
  Probably the latter is cleaner.

**Design notes:**
- **Aesthetic:** Match the Mendelian emerald theme. Scorecards and streak
  counters use the same card aesthetic as the narrative experiments. No
  green/red traffic lights — use the existing emerald-success and
  red-dusty-rose-error palette.
- **No gambling mechanics.** No random rewards, no XP-for-its-own-sake, no
  leaderboards. Just accuracy, streaks, and the satisfaction of getting it
  right. Respect the student.
- **Offline-friendly:** entire practice mode runs client-side with
  `localStorage`. No backend, no accounts.

**Verification:** Run a 10-question session. Does the interleaving feel
varied? Does the spaced repetition actually resurface weak concepts? Does the
streak counter survive a page reload?

#### 3.2 — Experiment 0: Particulate vs Blending Inheritance

A new experiment before Exp 1 that stages the 1865 intellectual debate.

**Flow:**
1. **Historical framing:** "It's 1865. You're a monk in a monastery garden in
   Brno, Moravia, growing pea plants. Most scientists of your era believe in
   **blending inheritance**: when you cross two plants with different traits,
   the offspring should be an intermediate *blend* that breeds true forever.
   But you have a different hypothesis: **particulate inheritance**. You think
   traits are carried by discrete factors that stay distinct across generations,
   even when they seem to disappear."

2. **Prediction panel:** "Which hypothesis do you think is right?"
   - Blending: red × white → all pink F1, all pink F2 forever.
   - Particulate: red × white → all red (or all white) F1, red and white
     *both reappear* in F2 in a fixed ratio.
   - (Let the student pick before running the cross.)

3. **Cross the P generation:** Red × White → all F1 plants are red (not pink).
   "Wait — the white is gone. Was it destroyed? Was blending wrong for the
   wrong reason?"

4. **F1 × F1:** "Cross the F1 plants with each other. Under blending, all
   offspring would be red (since F1 is all red). Under particulate, the hidden
   white should *reappear* unchanged in some of the offspring."

5. **F2 reveals:** Roughly 3 red : 1 white. White is back, pure white, unchanged.
   "Particulate inheritance is right. The white allele was *hidden* in the F1
   heterozygotes, but it wasn't destroyed. It reappeared in F2 in 1/4 of the
   offspring. This is Mendel's central insight."

6. **Exit question:** "Why does white reappear in exactly 1/4 of the F2 offspring?"
   Options: "by chance", "because of the 3:1 ratio", "because each F1 parent
   carries one r allele, and 1/4 of the time both parents pass r", **"see
   Experiment 1 to find out →"**. (The last answer is the correct "hook" —
   this primes Exp 1 to deliver the gamete-level mechanism.)

**Why:** Frames Mendel as an intellectual revolution, not a set of facts to
memorize. Gives students a reason to care about the 3:1 ratio. Also reinforces
the genotype-vs-phenotype distinction (the r allele is still there in the F1
plants, just not visible).

**Implementation:** New experiment `Exp0_ParticulateVsBlending` in
`MendelianModule.tsx`. Added to the `EXPERIMENTS` array at index 0. Renumbers
the rest of the module. Uses existing `CrossWorkbench`, `QuestionPanel`,
`OrganismCard`.

**Verification:** A student who reads this should walk into Exp 1 asking *why*
the ratio is 3:1, not *what* the ratio is.

#### 3.3 — Backwards problems throughout

For each of the seven narrative experiments (Exp 1-7), add a backward question
panel after the forward one. Reuse existing data.

**Examples:**
- **Exp 1:** Forward: "What ratio of red to white do you see?" → 3:1.
  Backward: "If you saw a 3:1 ratio, what must the parent genotypes be?"
  Options: RR × rr, Rr × Rr, Rr × rr, rr × rr. Correct: Rr × Rr.
- **Exp 2:** Forward: "Rr × rr produces what ratio?" → 1:1.
  Backward: "You see a 1:1 ratio in offspring. One parent is rr. What must
  the other parent be?" Correct: Rr.
- **Exp 3:** Forward: "What ratio of red : pink : white in F2?" → 1:2:1.
  Backward: "You observe 1:2:1. What can you conclude about dominance?"
  Options: "one allele is dominant", "alleles are codominant or incompletely
  dominant", "the genes are linked", "there are more than 2 alleles". Correct:
  incomplete dominance.
- **Exp 5:** Forward: "Dihybrid F2 ratio?" → 9:3:3:1.
  Backward: "You observe a 9:3:3:1 ratio. What does this tell you about the
  parents and the genes?" Correct: both parents are dihybrids AND the two
  genes are unlinked.

**Why:** Backward problems are where real genetic analysis lives. Every
published genetics paper starts with observed data and infers underlying
genotypes. If the module only teaches forward problems, it's not teaching
genetics — it's teaching a drill.

**Implementation:** Add a second `QuestionPanel` to each experiment, after the
forward panel. Reuses existing `QuestionPanel` component. ~20 lines per
experiment × 7 experiments = ~140 lines total.

**Verification:** After a student completes an experiment, they should be able
to go back and answer the backward question without re-running the sim.

**Phase 3 total scope:** One new subsystem (practice mode, ~800 lines across
new files), one new experiment (~200 lines), seven small additions (~140 lines).
Two or three commits. Two or three agent sessions.

---

## Visual design system (consolidated for agent reference)

### Colors
- **Primary (emerald):** `from-emerald-500 to-emerald-600` gradients for
  action buttons, `bg-emerald-50 border-emerald-200` for correct-answer
  feedback, `text-emerald-800` for correct-answer prose.
- **Secondary (violet):** `bg-violet-50 border-violet-200 text-violet-800`
  for teaching callouts ("Why is R dominant?"), prediction inputs, and
  secondary interactive elements.
- **Neutral (stone):** `bg-stone-50 border-stone-200 text-stone-700` for
  informational callouts (HWE assumptions list, law definitions).
- **Error (red):** `bg-red-50 border-red-200 text-red-700` for wrong-answer
  feedback. Never harsh red; the "dusty rose" tone.
- **Phenotype palette** (from `FLOWER_COLOR.colorMap` and existing engine
  defs — do not invent new colors):
  - Red flower: `#c0392b` or existing FLOWER_COLOR red
  - White flower: `#f5f5f5` with border
  - Pink (incomplete dom): `#e8a0a0`
  - Round seed: `#f4e4bc`
  - Wrinkled seed: `#d4a574`
  - Purple aleurone: `#6b21a8`
  - Red aleurone: `#c2410c`
  - Colorless aleurone: `#fef3c7`
- **Rule:** every phenotype is mapped to its color **deterministically by
  label** using `phenotypeFill()` or the gene's `colorMap`. Never sort-order.

### Typography
- **Body:** Nunito (already loaded in the project)
- **Headers / handwritten feel:** Patrick Hand (already loaded)
- Use handwritten font sparingly — for "lab notebook" callouts and historical
  framing in Exp 0. Body prose should be Nunito for readability.

### Cards and layout
- `rounded-2xl` cards with `border border-stone-200 shadow-sm`
- `p-6` padding for card bodies
- `space-y-6` for vertical stacking inside cards
- `gap-4` for horizontal layouts
- Headers: `text-xl font-bold` (experiment titles)
- Subheaders: `text-sm font-semibold text-stone-700`
- Body: `text-sm text-stone-600`
- Captions: `text-xs text-stone-500`

### Animation
- **Defaults:** Fade-in 300ms, slide 400ms, bounce 500ms.
- **Gamete visualizer:** 1500-2000ms per full cycle (meiosis → migration →
  fusion → reveal), with speed slider and step-through mode.
- **Celebrations:** 1500-2000ms. Subtle. Never takes control from the student
  — always skippable.
- **Avoid:** jarring movements, flashing colors, anything that would distract
  from comprehension.
- **Dependency check:** If Framer Motion is already in `package.json`, use it.
  Otherwise use CSS transitions + React state. Do **not** add a new animation
  dependency without asking first.

### Icons
- All plants via `src/shared/icons/PlantIcon.tsx`. All organism cards via
  `src/curriculum/components/OrganismCard.tsx`.
- **Never:** raw divs as "flowers", emoji as icons, ad-hoc SVGs, generic
  circles.
- The only acceptable non-plant icons are the "lock" icons in the locked
  sidebar entries (already in use) and the "checkmark" icons in completed
  sidebar entries (also already in use).

### Charts
- Reuse `RatioBar`, `FrequencyChart`, `HistogramChart` from
  `src/curriculum/components/`.
- Axis labels are required. Phenotype colors are deterministic (see above).
- If a new chart type is genuinely needed (e.g., a probability tree for
  Exp 5's derivation), design it with the same aesthetic: `rounded-2xl`
  container, stone-50 background, emerald accents.

### Fun ground rules
- **Yes:** micro-animations, streaks, discovery moments, historical storytelling,
  charming copy, small celebrations, easter eggs.
- **No:** random rewards, loot boxes, leaderboards, XP, levels for their own
  sake, anything gambling-adjacent, anything that rewards volume over
  understanding.
- **Copy tone:** curious, encouraging, precise. Think "friendly genetics TA,"
  not "gamified app" and not "textbook."

---

## Success criteria — what "done" looks like

A student who finishes the full Mendelian v2 module (Exp 0 through Exp 7 plus
~5 practice sessions) should be able to:

1. **Draw a Punnett square from scratch** for any cross they've never seen,
   in under a minute, without looking up reference material.
2. **Derive 9:3:3:1 from (3:1) × (3:1)** using the multiplication rule,
   without looking it up.
3. **Explain** why the 3:1 *phenotypic* ratio corresponds to a 1:2:1
   *genotypic* ratio, in their own words, referencing gametes.
4. **Explain** in one sentence why dominance is not about one allele being
   "stronger" than another.
5. **Look at a 72:28 result** and correctly identify it as a 3:1 ratio with
   normal sampling variation (not a deviation requiring explanation).
6. **Look at a 7:1:1:7 dihybrid testcross** and recognize "that's not
   independent assortment — those genes must be linked."
7. **Design a test cross** to determine an unknown genotype, and explain *why*
   crossing with the homozygous recessive is the right choice (it exposes
   recessive alleles in offspring).
8. **Compute P(offspring with three specific recessive traits from a
   trihybrid × trihybrid cross)** using the multiplication rule. Answer: 1/64.
9. **Name both of Mendel's laws** and explain which one can break under what
   circumstances (independent assortment, linkage).
10. **Explain why Mendel's work was revolutionary in 1865** — the contrast
    with blending inheritance and the significance of alleles reappearing
    unchanged in F2.

Right now v1 gets a student to maybe 3 of these 10. Phase 1 alone should get
to 5-6. Phase 2 adds 1, 3 (gametes make it click), and 4. Phase 3 adds 5, 8,
10 via practice and Exp 0, and 9 via the explicit two-laws callouts (though
those are Phase 1).

**If a student can do 8 of 10 after v2, we've shipped something real.**

---

## Launch instructions (for agents)

This plan is designed to be executed by agent sessions, each picking up one
phase. Suggested sequence:

### Launching Phase 1 (recommended first)

Dispatch a single agent with this brief:

> Read `docs/MENDELIAN_V2_PLAN.md` (this file) — Phase 1 section. Read
> `CLAUDE.md` at the repo root. Read `src/curriculum/MendelianModule.tsx`
> end to end.
>
> Implement Phase 1 items 1.1 through 1.5 in `src/curriculum/MendelianModule.tsx`.
> No new components, no engine changes. Respect the visual design system in
> the plan (emerald primary, stone neutrals, violet for teaching callouts,
> existing card aesthetic). Match the existing prose tone.
>
> Verify: `npx tsc -b` clean, visual walk of each modified experiment, commit
> with a clear multi-line message explaining what each item does and which
> section of the plan it implements.
>
> Do not commit changes to `components/`, `genetics-engine.ts`, or anything
> outside `MendelianModule.tsx`. If a Phase 1 item reveals it needs a new
> component, stop and report — don't expand scope.

### Launching Phase 2

Two agents in parallel (because the files are disjoint):

**Agent A (Gamete Visualizer):**
> Read `docs/MENDELIAN_V2_PLAN.md` — Phase 2 item 2.1. Read
> `src/curriculum/components/OrganismCard.tsx`, `CrossWorkbench.tsx`,
> `RatioBar.tsx`. Check `package.json` for Framer Motion (use it if present,
> CSS transitions if not). Create `src/curriculum/components/GameteVisualizer.tsx`.
> Export from `components/index.ts`.
>
> Test harness: add a `GameteVisualizerDemo.tsx` dev route showing a single
> Rr × Rr cross cycling once per second. Verify manually before committing.
> Do NOT wire it into `MendelianModule.tsx` yet — that's for the parallel
> agent.

**Agent B (Exp 4 rework):**
> Read `docs/MENDELIAN_V2_PLAN.md` — Phase 2 item 2.2. Refactor Exp 4 in
> `src/curriculum/MendelianModule.tsx` into the informative-cross-selection
> flow described in the plan. Keep the existing randomized mystery plant and
> conditional conclusion from the April 2026 audit fix. Only
> `MendelianModule.tsx` changes.

Once both land, a third follow-up agent wires the gamete visualizer into
Exp 1, 2, and 5 as the "Show Gametes" toggle described in item 2.1.

### Launching Phase 3

Phase 3 is the biggest. Split into three agents, ideally sequential because
they share state (`localStorage` schema in particular):

**Agent A (Exp 0):** Add `Exp0_ParticulateVsBlending` to `MendelianModule.tsx`
following item 3.2. Pure additions, no state coupling to practice mode.

**Agent B (Practice Mode):** Create the `src/curriculum/practice/` subfolder
with `PracticeMode.tsx`, `problems.ts`, `spaced-repetition.ts`. Add the
Practice tab to `ModuleShell.tsx`. Implement the 5 starter problem types
(items 1, 2, 3, 6, 9 from Phase 3.1). Use `localStorage` for persistence.

**Agent C (Backwards problems):** Add the inverse `QuestionPanel` to each of
the 7 narrative experiments in `MendelianModule.tsx` following item 3.3.
Light scope — should be under 200 lines of additions.

### Verification approach

At the end of each phase:
- `npx tsc -b` clean.
- Manual walk of the affected experiments on the dev server or deployed site.
- Screenshot verification for any visual changes (especially gamete
  visualizer — the animation should be smooth, the segregation visually
  correct, the fusion clear).
- Static bundle grep for key strings (per Phase 3 practice mode, grep for
  "streak", "9/10", etc.).
- Commit as one commit per phase item (or per closely-related group), with
  clear multi-line messages.

---

## Out of scope for v2

These are explicitly deferred to avoid scope bloat:

- **Multi-language support.** Stay English-only. Localization can come later.
- **Teacher dashboards.** No class roster, no progress tracking across
  students, no LMS integration. Pure single-student learning tool.
- **Backend / accounts.** Everything runs client-side in the browser with
  `localStorage` for persistence.
- **Save/load of custom crosses.** Student can't design and save their own
  experiments. Add later if there's demand.
- **Advanced topics:** sex linkage, mitochondrial inheritance, quantitative
  trait loci beyond the existing Exp 7, multi-allelic systems, lethal alleles.
  These are great v3 candidates.
- **Video or audio narration.** No voice-over, no video. All text + visuals.
- **Mobile-specific layout.** The existing responsive layout is good enough.
  Don't redesign for mobile as part of v2.
- **Analytics.** No usage tracking, no telemetry. Respect students' privacy.
- **PopGen and Linkage module parallel upgrades.** Those are separate efforts
  (see their own audit reports in `/tmp/` during active sessions). V2 is
  Mendelian-only.

---

## References

- `CLAUDE.md` (repo root) — project-level pedagogical principles, common bug
  classes, architecture pointers.
- `src/curriculum/MendelianModule.tsx` — the current v1 module (~800 lines
  post-audit).
- `src/curriculum/genetics-engine.ts` — engine for crosses, Punnett squares,
  epistasis, ratios. Post-audit verified correct.
- `src/curriculum/components/` — shared components: `ModuleShell`,
  `CrossWorkbench`, `OrganismCard`, `RatioBar`, `HistogramChart`,
  `FrequencyChart`, `QuestionPanel`.
- `src/shared/icons/` — shared plant icon library (used by main game too).
- `/tmp/mendelian-audit/REPORT.md` — the April 2026 peer-review audit that
  found and fixed the v1 bugs this plan is building on top of (only exists
  during active sessions — re-audit can be re-run from CLAUDE.md guidance).
- `lab.html` — the entry point for the Mendelian module in the Vite
  multi-page build.
