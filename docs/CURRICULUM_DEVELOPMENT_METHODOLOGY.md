# A roadmap for game-based curriculum development with AI agents

**Audience:** plant genetics professors (and other STEM faculty) thinking about
whether agentic AI can be used to build pedagogically rigorous, interactive
curriculum modules — not as a one-shot prompt, but as a structured engineering
process with named phases, peer review, and a fix cycle.

**Source:** the actual development log of the Mendelian v2 module of this
project (`src/curriculum/MendelianModule.tsx`), built across one extended
session in April 2026 by a Claude-Code agent operating against this codebase.
By the end of the session the module had grown from a "ship-ready but
pedagogically thin" v1 (committed in `670148c`, `54e6971`) to v2 — Exp 0
historical framing, gamete-level mechanism, derivation of 9:3:3:1 from
multiplication, named laws, noise literacy, a real reasoning puzzle for the
test cross, backward problems on every experiment, a Duolingo-flavored practice
mode, and corrections from a four-reviewer peer audit. This document is the
process that produced it.

---

## The four conditions that make this work

Before describing the process, it's worth being honest about what made it
viable in the first place. Without these four pieces, none of the rest would
have produced anything an educator would actually trust.

1. **A standing pedagogical contract.** A `CLAUDE.md` file at the repo root
   that articulates the bar in plain language, lists specific bug classes that
   have shipped before, and names the rules ("plant examples only", "validate
   against textbook not stochastic samples", "no telegraphed options",
   "deterministic colors by label"). The agent reads this before every edit.
   Without it the agent will default to "looks like a genetics lesson"
   plausible content, which is not the same thing as correct content.

2. **A vision plan that names the success criteria up front.** Before any
   coding started, the `docs/MENDELIAN_V2_PLAN.md` document was written: a
   "north star" sentence ("a student should be able to solve any monohybrid /
   dihybrid / trihybrid cross they've never seen, in their head, in under a
   minute, by reasoning about gametes and multiplying probabilities — not by
   pattern-matching"), four design principles, current-state honesty, and 10
   specific success criteria a student should hit after completing the module.
   The plan is the contract everything else is graded against.

3. **A target reviewer who actually exists.** The project owner is a plant
   genomics professor. Every agent prompt names him as "the audience." This
   matters more than it sounds — it changes the agent's defaults from "make it
   look educational" to "make it look like something a professor would put in a
   lecture without correcting it."

4. **An engineering substrate that catches obvious failures cheaply.** TypeScript
   strict-mode (`tsc -b`), a Vite multi-page build, deterministic engine code,
   and Playwright scripts in `/tmp/*-audit/scripts/` give the agent a way to
   verify its own work without needing the user in the loop for every change.
   "Run `tsc -b` after every edit" is a hard gate that catches half the
   regressions before they reach review.

If any of these four are missing, the process below collapses. With them in
place, you can run a multi-phase agent build with structured peer review and
expect the output to be defensible.

---

## The five phases (and why they exist in this order)

The Mendelian v2 build was structured as five sequential phases. Each phase
ends with a commit, and each phase has its own pedagogical purpose. The phases
are not arbitrary — they correspond to **escalating risk and complexity**, so
that the cheapest, highest-leverage work happens first and the riskiest work
happens last when you have the most context.

### Phase 1 — Pedagogy tightening (text-only additions, ~1 commit)

**What it is:** prose, callouts, and small interactive additions to existing
experiments. No new components, no new mechanics, no engine changes. Pure
pedagogy through inline edits.

**Why first:** highest leverage, smallest risk. A single sentence ("dominance is
about whether one working copy is enough, not which allele is stronger") kills
the most common student misconception in genetics. A single inline derivation
("3/4 × 3/4 = 9/16") turns a memorized ratio into a derivable one. These
changes don't touch any architecture and can't break anything that wasn't
already broken.

**Concrete Mendelian v2 deliverables:**
- Inline 2×2 derivation grid in Exp 5 showing (3:1)×(3:1) = 9:3:3:1.
- "Run 10 more times" replicate panel in Exp 1 for noise literacy.
- One violet callout in Exp 1 explaining dominance molecularly.
- Named callouts for the Law of Segregation (end of Exp 2) and Law of
  Independent Assortment (end of Exp 5), with the explicit warning that the
  second can break.
- A "linkage tease" question at the end of Exp 5 with a CTA to the Linkage
  module.

**Generalization:** every curriculum module has a "Phase 1 layer" — the prose
edits and small additions that close obvious pedagogy gaps without touching
mechanics. Always do these first. They're cheap, they're safe, and they
disproportionately improve the student experience.

### Phase 2 — Mental model components (new shared visualizations, ~2-3 commits)

**What it is:** new shared components that introduce a *mental model the
student didn't have before*. Plus reworking one existing experiment from
"demo-shaped" to "puzzle-shaped."

**Why second:** the highest-impact visual asset in any curriculum module is
usually the one that makes an invisible mechanism visible. For genetics that's
the gamete (haploid → fertilization → diploid offspring). For population
genetics it's the allele frequency over generations. For linkage it's the
recombination event during meiosis. **Build this component once, reuse it
across many experiments.**

**Concrete Mendelian v2 deliverables:**
- `GameteVisualizer` component (~860 lines): animated meiotic segregation,
  gamete migration, fusion, offspring reveal. Includes a Punnett-view toggle
  for the same data, a speed slider, step-through mode, `prefers-reduced-motion`
  handling. Mounted via a "Show gametes" toggle in Exp 1, Exp 2, Exp 5.
- Exp 4 reworked from "demo of a test cross" to "informative-cross selection
  puzzle": four plausible options (RR, Rr, rr, unknown) where only `rr` is
  diagnostic, with per-option teaching feedback explaining *why* the others
  are uninformative.

**Critical design rule:** the visualization component **must delegate to the
engine for any genetic logic**. The animation is a visualization of the
engine's randomness, not a parallel implementation. If you have `Math.random()`
near allele selection in your visual component, you've duplicated the engine
and you'll diverge.

**Generalization:** every curriculum module benefits from one well-built
mental-model visualization. Build it as a shared component, mount it with a
toggle, default to expanded for first encounter, default to collapsed once
the student has seen it. The toggle is the discovery beat — when the student
clicks "show me how" they're explicitly opting into a deeper mental model.

### Phase 3 — Subsystems and historical framing (~3-4 commits)

**What it is:** larger additions that change the *shape* of the module, not
just the content. New experiments, new entry points (practice mode), new
mental moves (forward → backward).

**Why third:** these touch many files and create new state schemas. Doing them
before Phase 1 + 2 means you're building features on top of pedagogy that
isn't right yet — you'll throw work away.

**Concrete Mendelian v2 deliverables:**
- **Exp 0** — historical framing experiment (Mendel 1865, Brno garden,
  blending vs particulate inheritance). A prediction-then-observation
  discovery beat that frames the entire module.
- **Practice Mode subsystem** (~1500 lines across `practice/problems.ts`,
  `practice/spaced-repetition.ts`, `practice/PracticeMode.tsx`). Five starter
  problem types, spaced repetition with ease levels, streak tracking,
  interleaved retrieval practice, end-of-session scorecard. Persisted entirely
  in `localStorage`. No backend, no analytics, no gambling mechanics.
- **Backward problems** for every narrative experiment (Exp 1–7). Each
  experiment now has a forward problem ("given parents → ratio") and a backward
  problem ("given ratio → parents"). The backward problem gates `onComplete`,
  forcing the student to do the inversion before advancing.

**Critical design rule:** practice mode is **interleaved spaced retrieval**,
not blocked drill. Within a session, problem types rotate. Across sessions,
problems the student missed yesterday resurface today. The streak counter is
the only "gamified" element — no XP, no leaderboards, no random rewards. Treat
the student as a serious learner.

**Generalization:** the forward → backward pattern is the single most powerful
pedagogical addition you can make to a STEM module that already teaches the
forward direction. It costs ~20 lines per experiment and forces the student
to do real research-style reasoning ("given this observation, what could have
caused it?") instead of textbook drill ("given this setup, what's the
answer?"). Real genetics is mostly backward.

### Phase 4 — Cleanup passes (each phase has its own debt)

**What it is:** every agent dispatch flags issues it didn't fix. After each
phase, run a focused cleanup pass that addresses every flagged item before the
next phase begins.

**Why this exists as its own phase:** the user's standing rule was *"we don't
leave trash behind, we fix as we go"*. Without this rule, agents accumulate
small inconsistencies — a `setTimeout` left in a click handler, a notation
drift between experiments, a stale "Experiment 1" reference after renumbering,
a duplicated color helper between two components. None of these are urgent
individually. Together they slowly degrade the codebase quality and become
peer-review noise that distracts from real findings.

**Concrete Mendelian v2 cleanup-pass debt addressed:**
- Notation drift in Exp 5 intro (`R/r` → `Rr`).
- `setTimeout(onComplete, ...)` in click handlers migrated to `useEffect` with
  cleanup (Exp 1, 2, 3, 6, 7).
- Stale "Experiment N" prose references after Exp 0 was added at index 0.
- Shared `phenotypeFill` color helper extracted from `RatioBar` and
  `GameteVisualizer` into `components/colors.ts`.
- `getPhenotype` invariant: canonicalized `Rr` and `rR` lookup in the engine
  so future genes don't need to remember to add both mirror entries.
  **Bonus:** this fixed a real correctness bug where Exp 3's dihybrid row was
  double-counting `Rr` and `rR` as separate genotype classes.
- Linkage engine canonical-key normalization (same fix applied to a different
  module).
- `Exp 5` forward `correct` state monotonically latched so re-clicking a wrong
  option doesn't make the backward panel disappear.
- Exp 7 re-themed from abstract "trait value" to **tomato fruit weight (Yule
  1902)** per the plant-examples rule.
- Exp 4 backward question made conditional on the student's actual observed
  data (RR if they saw all-red, Rr if they saw white).

**Generalization:** budget for cleanup passes between phases. They take one
agent dispatch each, they're cheap, and they dramatically improve peer-review
signal-to-noise. Cleanup passes also occasionally find real correctness bugs
hiding in tech debt — the `Rr`/`rR` canonicalization here found a silent
Exp 3 bug that no reviewer would have caught without the refactor.

### Phase 5 — Peer review and fix cycle (the most important phase)

**What it is:** a multi-agent independent peer review of the entire module,
followed by a synthesis pass that produces a master report, followed by a
structured fix cycle that addresses every CRITICAL and HIGH finding.

**Why this exists:** the most insidious failure mode for AI-built curriculum
is *plausible-but-wrong content*. An agent will happily produce content that
"looks like genetics" but contains a textbook myth (Mendel's 7 traits all on
different chromosomes — actually only 4 of 7 are unlinked), a factual slip
(pea flower color is a bHLH transcription factor, not an enzyme), an
ambiguous question (the noise-recognition clamp can produce 68:32 which is
genuinely ambiguous), or a pedagogy gap (the multiplication rule is derived
but never transfer-tested). One agent doing self-review will not catch these.
Four agents with different lenses will.

#### The four reviewer personas

Each reviewer agent runs **independently in parallel** with no knowledge of
the others' findings. Each writes a structured report to a file. The personas
are distinct lenses on the same artifact:

1. **The Plant Geneticist (factual lens).** "Would I cite this in a lecture
   without correcting it?" Checks every ratio, every gene name, every
   historical claim, every probability calculation. Verifies the engine
   actually produces what the prose claims. Catches things like "Mendel
   crossed red × white peas" (he crossed purple × white) and "0.5^40 ≈ 10⁻¹²"
   (it's actually ≈ 10⁻¹³).

2. **The First-Encounter Undergrad (clarity lens).** "If I don't already know
   the answer, can I figure it out from what's on the screen?" Catches
   telegraphed options (the correct answer is the longest), jargon used before
   defined ("heterozygous" appears in a graded question with no prior
   definition), notation introduced cold (`R_C_` wildcard appears in a
   backward question with no primer), distractors that are obviously wrong
   (9:3:3:1 as a monohybrid distractor).

3. **The Pedagogy Researcher (transfer lens).** "Does the student walk away
   able to solve a problem they've never seen?" Scores the module against the
   plan's stated success criteria. Catches things like "the multiplication
   rule is derived in Exp 5 but never transfer-tested with a trihybrid
   problem" (success criterion #8 is missed) and "the backward question on
   Exp 2 hands the student one parent — that's forward reasoning wearing a
   backward costume."

4. **The UX/QA Engineer (interaction lens).** "Would I let my employer ship
   this to thousands of users without a hotfix queue?" Catches WCAG AA
   contrast failures (white text on emerald-500 = 2.40:1, fails 4.5:1), edge
   cases (rapid-Enter in Practice Mode double-commits the same answer because
   the keyboard handler has no in-flight guard), state leaks (`ModuleShell`'s
   1-second `setTimeout` has no cleanup, so navigating mid-window snaps the
   student back), accessibility regressions (`OrganismCard` is a `<div
   onClick>`, keyboard-inaccessible).

**Each reviewer writes a structured report to `/tmp/peer-review/reviewer-N-*.md`** —
in this build, ~3000 words each, with severity labels (CRITICAL / HIGH /
MEDIUM / LOW), file:line citations, and proposed fixes. Writing to files
instead of returning to the parent context keeps the main agent's context
window clean for the synthesis pass.

#### The synthesis pass

A single synthesis agent reads all four reports, deduplicates (multiple
reviewers often catch the same root cause from different angles), re-ranks on a
unified severity scale, and produces a single **master report**
(`/tmp/peer-review/MASTER_REPORT.md`) with:

- One-paragraph executive summary.
- Findings grouped by severity (CRITICAL, HIGH, MEDIUM, LOW).
- Each finding normalized to: ID, severity, lens, who reported it, file:line,
  description, proposed fix, effort estimate.
- **Fix bundles** — groups of findings that can be fixed together in one
  agent dispatch. This is the most important output. 53 individual findings
  becomes 7 executable bundles.
- Dismissed findings (where spot-checking showed a reviewer was wrong).
- Future work (findings too big for a fix cycle).
- Convergence (where multiple reviewers caught the same thing — strongest
  signal).
- Divergence (where reviewers disagreed and how the synthesis resolved).

In this build the synthesis produced **53 unique findings (6 CRITICAL, 17
HIGH, 20 MEDIUM, 10 LOW)** grouped into **7 fix bundles** with clear
sequencing rules ("A and F can run in parallel because their files don't
overlap; B/C/D/E must run sequentially because they all touch
MendelianModule.tsx; G runs last as cleanup").

#### The fix cycle

Fix bundles are dispatched as agent runs against the master report. Each
agent's prompt includes:

- The bundle's findings, by ID, with file:line and proposed fix.
- The full master report path (so the agent has context if it needs more).
- Explicit out-of-scope notes ("do not touch findings outside Bundle B —
  Bundles C/D/E/G will fix those").
- Coordination notes when bundles can run in parallel ("Bundle A owns lines
  107-125 and 325-415 of PracticeMode.tsx; Bundle F owns line 580-586; do not
  modify each other's regions").
- Hard verification gates (`tsc -b` clean, `vite build` clean, grep checks
  for the specific patterns the bundle is supposed to introduce).
- A required structured report-back so the parent agent knows what landed.

In this build the fix cycle dispatched A and F in parallel (Round 1), then
B → C → D → E sequentially (Rounds 2–5), then G as cleanup (Round 6). Each
round produced one commit on `main` with a multi-line message listing every
F-ID it addressed.

**Generalization:** the peer-review-and-fix-cycle phase is the difference
between "the agent built something that compiles" and "the agent built
something a professor would teach from." Without it, you ship plausible-
looking bugs. With it, you ship something that has been read by four
independent lenses and corrected against their findings. **For curriculum
work this phase is non-negotiable.**

---

## The agent orchestration pattern

The mechanical pattern that makes the phases above executable:

### Each agent dispatch includes (always):

1. **Required reading** — a numbered list of files the agent must read before
   touching anything. CLAUDE.md is always #1. The relevant section of the
   plan is always #2. The specific source files come next. Reading order
   matters because later sections build on earlier ones.

2. **Scope declaration** — exactly what the agent owns. Files, line ranges
   when needed, specific F-IDs from the master report.

3. **Non-negotiables** — the standing rules from CLAUDE.md restated for this
   specific task. Plant examples only. Notation consistency. Validation
   accepts textbook answers. No telegraphed options. No setTimeout from render.
   `tsc -b` clean is the hard gate.

4. **Out of scope** — explicit list of things the agent must NOT touch. This
   is more important than scope declaration — without it, agents drift into
   adjacent files and create merge conflicts with parallel agents.

5. **Coordination notes** — when running in parallel, exact line ranges each
   agent owns in shared files, plus instructions for what to do if git
   reports a conflict ("stop and report — do not try to resolve").

6. **Verification gates** — `tsc -b`, `vite build`, grep checks for specific
   patterns that should or shouldn't appear after the edit, mental sanity
   checks for prior phase features that must remain intact.

7. **Commit instructions** — exact commit subject pattern, multi-line body
   format, "do NOT push" reminder.

8. **Structured report-back** — exact format the agent should return, under
   a word budget, with file:line for every finding.

### Each parallel pair includes (when applicable):

- A coordination note in **both** agent prompts identifying:
  - Which files overlap.
  - Which line ranges each agent owns in the overlapping file.
  - Which files are exclusive to each agent.
  - The "stop and report on conflict" rule.

In this build, parallel pairs ran (Phase 2A + Phase 2B), (Phase 3B + Phase
3C), (Bundle A + Bundle F). Each pair was dispatched in a single message with
two `Agent` tool calls. None of them produced a merge conflict in practice —
the explicit line-range coordination worked.

### Each round mandates (always):

- Read agent reports.
- Verify `tsc -b` and `git log` directly before proceeding.
- Update task list (`TaskUpdate`).
- Dispatch the next round.
- **Run a cleanup pass between rounds** if any agent flagged adjacent issues.

---

## The pedagogical philosophy that's encoded in this process

A few opinionated principles run through the whole methodology. Naming them
explicitly might help when you adapt this to your own course:

### 1. Validation is a curriculum design tool, not a code-quality concern

The single most common failure mode in computational curriculum is to
validate the student against a stochastic sample as if it were the answer.
"Your cross produced 72:28. The expected ratio is 75:25, so your answer of
'3:1' is correct *only if* the sample happened to drift close to 75:25 this
time." This is wrong on every level.

Always validate against the textbook answer. Always accept "3:1" or "9:3:3:1"
or "1/16" regardless of the stochastic sample. The student is being tested
on whether they know the textbook ratio for the cross — not whether they can
read a number off the screen.

### 2. Discovery requires commitment

Every experiment that wants to be a "discovery beat" must collect the
student's prediction *before* showing the result. Without commitment, you
have a demo, not a discovery. With commitment, the student gets to be wrong,
and being wrong is what actually creates learning.

### 3. Forward problems test recognition; backward problems test reasoning

Real research is mostly backward — published genetics papers start with
observed data and infer underlying genotypes. Forward problems ("given
parents → ratio") are necessary for scaffolding but they're not the goal.
Every experiment should eventually ask the inverse ("given ratio → parents").
Backward problems are the cheapest pedagogical addition with the highest
transfer payoff.

### 4. Mechanism beats memorization

The 3:1 ratio is not a fact to memorize — it's an emergent property of
haploid gamete segregation, random fertilization, and dominance. The student
who memorizes 3:1 cannot solve a trihybrid problem. The student who
understands the gamete-level mechanism can solve any cross they've never
seen, in their head, by multiplying probabilities. The whole module is built
to push students toward the second mental model and away from the first.

### 5. Plant examples only

This is a cosmetic rule that becomes a correctness rule. Every genetics
textbook defaults to *Drosophila* and mice because they're the model
organisms classical genetics was built on. But if the student leaves a
plant-genetics module with mouse coat color examples, they will carry the
wrong conceptual map forward. Every concept has a plant equivalent — peas
for monohybrids, snapdragons for incomplete dominance, maize aleurone for
epistasis, tomato fruit weight for polygenic. Use them. The agents will reach
for *Drosophila* unless you stop them, because that's what their training
data says is "the textbook example."

### 6. Notation is correctness

Mixed notation (`Rr`, `R/r`, `Shsh`, `Sh/sh` in the same module) reads as
sloppy and undermines student trust in everything else on the page. Pick one
convention and apply it everywhere. This sounds cosmetic and it is, but
cosmetic consistency is how you signal that the rest of the content has been
proofread.

### 7. Color is meaning

Phenotype colors must map deterministically by *label*, never by render order
or sort frequency. A "Red" flower has the same red on every chart in every
experiment, every run. This is implemented as a shared `phenotypeFill(label)`
helper that looks up the color from a label-keyed map. It is the kind of bug
that ships twice if you don't enforce it as a hard rule (in this codebase
the rule was added after both `LinkageRatioBar` and `RatioBar` shipped with
sort-order coloring, then both got fixed in the April 2026 audit).

### 8. The gating sequence is the curriculum

What the student must do to advance is more important than what the student
sees. The Mendelian v2 module gates `onComplete` on the **backward** question
being correct, not the forward one. This means a student who understands the
forward direction but can't invert it doesn't advance. The gate is the
mental move you're forcing the student to make. Designing the gates is
designing the curriculum.

### 9. Latched state is monotonic state

Once a student has answered a forward question correctly, the backward panel
appears. If the student then re-clicks a wrong forward option for any reason,
the backward panel must NOT disappear. Use a `forwardEverCorrect` boolean
that's set once and never reset. State that flips back is state that
punishes exploration.

### 10. Practice is interleaved retrieval, not blocked drill

Every educational app that wants to be Duolingo has a practice mode. Most of
them are blocked drill ("10 monohybrids in a row, then 10 dihybrids in a
row"). The cognitive science is unambiguous: interleaved practice produces
much better long-term retention than blocked. Within a session, rotate
problem types. Across sessions, resurface concepts the student missed.
Streak counters work. XP and random rewards do not. Respect the student.

---

## What this approach is not good at (yet)

A few honest limitations from this build:

- **Browser verification.** No agent in this session could actually drive a
  browser. All "tested in dev" claims rely on `tsc -b` + `vite build` +
  static analysis + grep checks. For a curriculum module that needs visual
  verification (animations, layout, color contrast on real screens), the
  human user must do a manual pass at the end. The peer-review phase
  partially compensates by having the UX/QA reviewer compute WCAG luminance
  ratios from hex values, but it's not a substitute.

- **Real student testing.** None of this replaces actually putting the
  module in front of students and watching where they get stuck. The peer
  reviewer #2 ("first-encounter undergrad") is a *simulation* of a student,
  and it catches a lot, but it doesn't replace classroom A/B testing.

- **Long-form transfer assessment.** The success criteria scorecard scores
  the module against 10 specific outcomes, but it can't measure whether a
  student can apply the concepts in a final exam two months later. That's
  a longitudinal question this process can't answer.

- **Original research about pedagogy.** This process executes pedagogy that
  the human professor specifies in CLAUDE.md and the plan. It does not
  *invent* pedagogy. The agents are very good at applying principles you
  give them; they are not a substitute for a curriculum designer with
  domain expertise.

- **Engine math beyond what's implemented.** The agents will correctly
  delegate to the existing engine and reuse its outputs. They will not
  notice if the engine itself implements a model wrong (the April 2026
  audit found three CRITICAL engine bugs in modules that had been
  "verified" — the agents trusted the engine's output as ground truth).
  Always have an independent numerical verification script for any new
  engine work.

---

## A roadmap you could execute for another course

Suppose you wanted to apply this to, say, an Evolution & Population Genetics
course, or a Plant Breeding Design course, or a Quantitative Genetics
course. The high-level recipe:

### Step 0 (one-time, ~2 days of professor time)

1. Write `CLAUDE.md` for your project. Articulate the bar. List the
   organism rules (plant examples, real published systems, no Drosophila /
   mice / blood types). List the anti-patterns from your own teaching
   experience — the misconceptions you want to kill, the wrong answers you
   see on exams, the textbook myths you want corrected.
2. Pick the first module. For each, write a vision plan: north star
   sentence, four design principles, current-state honesty, 10 success
   criteria. The success criteria are the contract.
3. Set up an engine substrate: TypeScript, a simulation library that
   implements the math correctly, a `tsc -b` gate, deterministic outputs
   you can verify.
4. Pick the visual mental-model component you'll build first. For
   Mendelian it was the gamete visualizer. For population genetics it
   would be allele-frequency-over-time. For quantitative genetics it's
   probably the breeder's-equation diagram. Build it once, reuse it
   across many experiments.

### Step 1 (~1 agent session)

Phase 1 — text-only pedagogy tightening of any existing experiment.
Inline derivations, named laws, molecular explanations, noise literacy.
Cheap and high leverage.

### Step 2 (~2 agent sessions)

Phase 2 — build the mental model component. Rework one demo-shaped
experiment into a puzzle-shaped one. Mount the component via toggles
in the relevant experiments.

### Step 3 (~3 agent sessions)

Phase 3 — historical framing experiment, practice mode subsystem,
backward problems on every narrative experiment. Each in its own
agent session, parallel where files don't overlap.

### Step 4 (~1 agent session per phase)

Cleanup passes between phases. Address every flagged item before
moving on. "We don't leave trash behind."

### Step 5 (~2 agent sessions)

Peer review and fix cycle. Four reviewers in parallel writing to
files. One synthesis agent producing a master report with fix
bundles. N fix-cycle agents addressing the bundles in dependency
order.

### Step 6 (irreducibly human)

Manual browser walk-through. Real student playtesting. Iterate on
findings. The agents are tireless and consistent; they are not a
substitute for the moment when a student says "wait, I don't get
it" and you have to figure out why.

---

## What this build actually shipped

For reference, here's the commit log of the full Mendelian v2 build:

```
8a512bd Add Mendelian v2 vision plan
8da9c61 Mendelian v2 Phase 1: pedagogy tightening in Exp 1, 2, and 5
c4345a5 Mendelian v2 Phase 2B: Exp 4 real-puzzle rework
430d192 Mendelian v2 Phase 2A: GameteVisualizer shared component
f60a9b4 Mendelian v2 Phase 2 wiring: mount GameteVisualizer in Exp 1, 2, 5
6b1955d Mendelian v2 Phase 3A: add Exp 0 — Particulate vs Blending
5c663a7 Mendelian v2 cleanup: fix flagged debt from Phases 1/2/3A
eb94a91 Mendelian v2 cleanup pass 2: residual setTimeout + linkage-engine canonicalization
4dbba53 Mendelian v2 Phase 3B: Practice Mode subsystem
cede3bc Mendelian v2 Phase 3C: backwards problems for Exp 1-7
72b77f2 Mendelian v2 cleanup pass 3: latch backward gating + plant theme Exp 7
cfba3e8 Mendelian v2 fix Bundle A: critical UX & a11y pass
7d0e115 Mendelian v2 fix Bundle F: Practice Mode calibration
[Bundles B, C, D, E, G follow]
```

Roughly **15 commits** across the full v2 build, each with a clear scope
and a clean `tsc -b`. The peer review pass found **53 unique findings**
across 4 reviewer lenses. The fix cycle addresses every CRITICAL and HIGH
finding before recommendation.

The methodology is reproducible. The output is defensible. The bar is
"a professor would put it in lecture without correcting it." That is the
right bar for educational software, and it's the bar this process is built
to clear.

---

## One last principle: trust but verify

The most important sentence in this entire methodology is the one the user
said when the build was midway through:

> "we don't leave trash behind we fix as we go!"

Followed by:

> "previous phases report left unaddressed problems/issues/improvements on
> the table... make sure its all neat and perfect"

Followed by:

> "when youre done with everything launch a team of indepdent peer reviewers"

These three sentences are the methodology. Don't accumulate debt. Don't
declare victory before peer review. Don't trust any single agent's claim
that the work is done. Run cleanup passes between phases. Run independent
reviews after the build. Address the findings systematically.

If you do these three things, agentic AI is a viable substrate for
building rigorous, peer-reviewed, classroom-ready curriculum modules. If
you skip any of them, you'll ship plausible-looking bugs.

The agents are good. The process is what makes the agents trustworthy.
