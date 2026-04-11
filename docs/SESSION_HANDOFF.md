# Session handoff — 2026-04-11

**For the next agent:** read this file first, then skim the three vision plans
and the methodology document in the order listed below. Do not re-read the
prior session's transcripts; they're gone. Everything load-bearing is here or
in the committed files.

**Tone from the project owner:** he is a plant genomics professor and he
wants you to *execute*, not present option trees. If you find yourself
writing "Option A / Option B / Option C — which one?" at the end of a
response, delete it and pick one. Ask permission only for irreversible or
shared-state actions (force push, schema migrations, destructive rewrites).
Default is: read, decide, do, report.

---

## TL;DR — the state right now

- **Branch:** `main`, clean working tree, up to date with `origin/main`.
- **HEAD:** `0462dbd` (or whatever `SESSION_HANDOFF.md` commit adds).
- **Last major work:** Mendelian v2 module shipped (18 commits, peer-reviewed,
  9.5/10 success criteria). Then three vision plans committed for the three
  curriculum modules. Then one urgent CRITICAL bug fix in `popgen-engine.ts`.
- **What's unblocked:** Linkage v2 Phase 1 and PopGen v2 Phase 1 both have
  committed contracts and are ready to execute. Pick one and go.
- **What's blocked:** nothing. There is no blocker. The prior session ended
  because the agent kept asking which to do next instead of doing it.

---

## The four reading-order files the next agent must know about

1. **`CLAUDE.md`** (repo root) — the pedagogical and correctness contract.
   Hard rules: plant examples only, notation consistency, deterministic colors
   by label, validation accepts textbook answers not stochastic samples, no
   telegraphed options, no rigged discovery, closed-form verification scripts
   for engine work, `tsc -b` clean is the gate. Read first, every session.

2. **`docs/CURRICULUM_DEVELOPMENT_METHODOLOGY.md`** (~5,200 words) — the
   roadmap for how these builds work. Five phases (pedagogy tightening →
   mental-model components → subsystems & historical framing → cleanup passes
   between phases → peer review and fix cycle). Four reviewer personas for
   peer review (plant geneticist, first-encounter undergrad, pedagogy
   researcher, UX/QA engineer). Ten encoded pedagogical principles. This is
   the recipe you'll follow.

3. **`docs/MENDELIAN_V2_PLAN.md`** (~10,000 words) — the first plan written,
   the one that got executed in full. Use as the template for shape. The
   module is shipped; don't re-execute it.

4. **`docs/LINKAGE_V2_PLAN.md`** (~1267 lines / 65KB) — second plan. Not
   executed yet. Ready to go.

5. **`docs/POPGEN_V2_PLAN.md`** (~2180 lines / 114KB) — third plan. Not
   executed yet. Larger than the others because it includes a plant-example
   refloor (PopGen v1 uses abstract A/a — CLAUDE.md violation) AND documents
   the engine bug that was fixed at `0462dbd`.

---

## What shipped this session — complete commit log

### Mendelian v2 build (18 commits, 8a512bd..6579426)

```
8a512bd Add Mendelian v2 vision plan
8da9c61 Phase 1 — pedagogy tightening in Exp 1, 2, 5
c4345a5 Phase 2B — Exp 4 real-puzzle rework (informative-cross selection)
430d192 Phase 2A — GameteVisualizer shared component (~860 lines)
f60a9b4 Phase 2 wiring — mount GameteVisualizer in Exp 1, 2, 5
6b1955d Phase 3A — add Exp 0 (Particulate vs Blending, Mendel 1865)
5c663a7 Cleanup pass 1 — 7 flagged issues from Phases 1/2/3A
eb94a91 Cleanup pass 2 — residual setTimeout + linkage-engine canonicalization
4dbba53 Phase 3B — Practice Mode subsystem (problems.ts + spaced-repetition + UI)
cede3bc Phase 3C — backwards problems for Exp 1-7
72b77f2 Cleanup pass 3 — latch backward gating + plant theme Exp 7 (tomato fruit weight)
cfba3e8 Bundle A — critical UX & a11y pass (CTA contrast, rapid-Enter guard, etc)
7d0e115 Bundle F — Practice Mode calibration
9993393 Bundle B — pedagogy pass: telegraphs & backward inversions
164b942 Bundle C — trihybrid transfer + 7:1:1:7 linkage preview + backward dihybrid
95126a9 Bundle D — clarity pass: jargon and notation primers
eaf71ac Bundle E — factual corrections (Mendel myth, maize Pr, Yule history)
6579426 Bundle G — dead-code sweep, polish, latch carry-overs
```

### After the build — documents and second-module work

```
094fc69 Add curriculum development methodology document
c00d4d9 Add Linkage v2 vision plan
b91beb7 Add PopGen v2 vision plan
0462dbd popgen-engine: fix rigged HWE chi-square — real random-mating sample
```

All pushed to `origin/main`.

---

## What each of the three plans says, in one paragraph each

### Linkage v2

**North star:** student should look at any dihybrid testcross, recognize
linked vs unlinked, and compute RF / map distance in their head by reasoning
about crossovers. Understand RF ≈ physical distance for short intervals, why
double crossovers cause apparent RF to underestimate, why 50% is the ceiling,
how to identify the middle gene in a three-point cross from the rarest class.
**Canonical plant example:** maize chr9 C–Sh–Wx (Creighton-McClintock 1931).
**Already in use, already correct post-April audit, keep it. The engine math
is correct.** What's missing from v1: no chromosome/crossover visualizer, no
historical framing experiment (Creighton-McClintock 1931 is the Exp 0
equivalent), no backward problems, no practice mode, no molecular callout on
crossing-over as a physical prophase-I event, no noise literacy on small-
sample RF, the three-point cross experiment is still demo-shaped rather than
puzzle-shaped. **Phase 1** is pedagogy tightening (RF derivation, RF noise
literacy, molecular callout, Sturtevant 1913 named insight, PopGen tease).
**Phase 2** is `ChromosomeVisualizer` + three-point-cross puzzle rework.
**Phase 3** is practice mode + Exp 0 Creighton-McClintock + backward problems.
**Theme color:** cyan (per `ModuleShell.THEME`).

### PopGen v2

**North star:** student should predict how a plant population's allele
frequencies will change under drift / selection / migration / mutation / non-
random mating, and recognize when Hardy-Weinberg is a reasonable null.
**Canonical plant examples** (from CLAUDE.md): Mimulus anthocyanin, Brassica
S-alleles, Amaranthus glyphosate resistance, Arabidopsis chlorophyll mutants,
Hawaiian Bidens (founder effect), island Plantago (drift). **NONE OF THESE
ARE CURRENTLY IN v1.** v1 uses abstract A/a alleles throughout — the biggest
CLAUDE.md rule violation across the three modules. This is the single biggest
pedagogical urgency. **Phase 1** includes a plant-example refloor as its
highest-priority item, plus HWE derivation (p² + 2pq + q² from one generation
of random union of gametes), drift noise literacy (N=20 vs N=2000), molecular
drift callout (drift is finite-sample binomial noise), named HWE theorem with
the five-assumptions warning, Linkage tease reception (LD decay). **Phase 2**
is `AlleleTrajectoryVisualizer` (or extension of `FrequencyChart`) + the HWE
chi-square experiment reworked from demo-shaped to puzzle-shaped (student
actually decides whether a population is in HWE). **Phase 3** is practice
mode + Exp 0 Hardy 1908 + backward problems. **Theme color:** violet (or
whatever `ModuleShell.THEME` defines; verify). **Engine:** was previously
CRITICAL-broken (rigged HWE chi-square by deterministic round-trip after WF
drift), **now fixed at 0462dbd**. The verification script at
`scripts/verify-popgen-engine.ts` passes all 23 checks.

### Mendelian v2

**Shipped.** Don't re-execute. Read the plan only if you need to understand
patterns to reuse for Linkage / PopGen (e.g., how backward problems were
structured, how GameteVisualizer was built and wired, how Exp 0 historical
framing was composed, how Practice Mode persists state in localStorage).
9.5/10 against the plan's stated success criteria. Criterion #1 (Punnett fill-
in mode) is the only 🟡 — the GameteVisualizer's Punnett view drills it but
there's no student-facing fill-in mode. Future work, out of scope for v2.

---

## Known technical debt (not urgent, but don't leave it rotting)

### Flagged but not fixed in the prior session

1. **`PopGenModule.tsx` Exp 2 `handleSimulate` uses `setTimeout(onComplete, 2000)`
   outside a `useEffect`** — bug class #4 from CLAUDE.md (setTimeout from
   click handler). Same anti-pattern the Mendelian cleanup passes 1 and 2
   stamped out across that module. Trivial fix (~10 lines). Fold into PopGen
   Phase 1 when it runs, or patch independently — your call.

2. **`popgen-engine.ts` uses `Math.random()` directly** — no seeded PRNG, so
   verification runs are non-deterministic. Fine for production; ugly for
   reproducible audit runs. Worth a seeded-PRNG refactor eventually. Not
   urgent.

3. **`PopGenModule.tsx` `initialFreqA` vs `freqHistory[0]` drifts by one
   sampling step** — the initial multinomial sample causes a one-generation
   shift. Pre-existing behavior, not a regression. Module treats
   `freqHistory[0]` as observed-start so it's internally consistent. Flag if
   you ever tighten Exp 3's closed-form comparison.

4. **`LinkageModule.tsx` and `PopGenModule.tsx` may have additional
   `setTimeout` anti-patterns** — cleanup pass 2 only swept Mendelian. Worth
   a quick grep when executing Linkage Phase 1 or PopGen Phase 1, respectively.

5. **Two-island migration mode lives in the `AlleleTrajectoryVisualizer`
   (planned), not in `popgen-engine.ts`** — slightly breaks the "delegate to
   engine" rule. Could be cleaned up by adding `simulateTwoIsland` to the
   engine. Flagged in PopGen v2 plan as a judgment call the project owner
   can push back on.

### Open questions the project owner should decide before or during execution

- **Practice mode shape for Linkage + PopGen:** the Mendelian build used a
  generic `PracticeMode.tsx` wired via a `PracticeContext` so `MendelianModule`
  didn't need to import `PracticeMode` directly. For Linkage and PopGen,
  should the second and third modules share that single `PracticeMode`
  component via the context, or should each module ship its own
  `LinkagePracticeMode.tsx` / `PopGenPracticeMode.tsx`? The latter is cleaner
  for module-specific UI; the former keeps one source of truth. Whichever
  lands first sets the precedent — the PopGen plan notes that if Linkage ships
  a split, PopGen inherits it.

- **Exp 0 for PopGen — Hardy 1908 alone vs broader synthesis tour:** the
  planning agent chose Hardy 1908 as a focused discovery beat (the one-page
  paper that settled the Punnett dispute) rather than a broader Hardy +
  Wright + Fisher + Haldane historical tour. Wright/Fisher/Haldane each get
  named callouts at the end of individual experiments. Project owner can push
  back if he wants a fuller Exp 0.

- **Which plant example owns Exp 5 migration in PopGen:** the planning agent
  picked Mimulus serpentine / non-serpentine pollen flow. Alternatives:
  Plantago, Brassica, Amaranthus. All defensible. Project owner may prefer a
  different species.

### Never-done manual browser walk of the Mendelian v2 build

This session could not drive a browser. The 18-commit Mendelian v2 build is
verified by `tsc -b`, `vite build`, four reviewer agents computing WCAG
luminance from hex values, and static analysis. **It has not been opened in a
real browser and clicked through.** The project owner should do this before
trusting the build in a classroom, and the next agent should `npm run dev` in
the background and surface the URL when asked.

Specific things that need eyes-on verification (from the Mendelian v2
report):
- GameteVisualizer animation reads cleanly on Exp 1 monohybrid AND Exp 5
  dihybrid. The dihybrid Punnett view is the path the demo harness does NOT
  exercise.
- Exp 5 7:1:1:7 vs 1:1:1:1 linkage preview legible side-by-side.
- Exp 4 reordered backward question advances correctly.
- Exp 7 tomato fruit weight slider produces a clean bell curve at n≥5; maize
  kernel number transfer question reads naturally.
- Practice Mode 10/10 celebration fires and doesn't block the next button.
- Tab-through keyboard-only — `OrganismCard` button conversion and
  `role="radio"` semantics work.
- Refresh mid-experiment — localStorage progress survives.
- `prefers-reduced-motion: reduce` in devtools — GameteVisualizer steps
  through, celebration disabled.

---

## The user's operating rules (non-negotiable, learned the hard way)

1. **"We don't leave trash behind, we fix as we go."** Cleanup passes between
   phases are mandatory. If an agent flags an issue in its report, fix it in
   the next cleanup pass unless it's genuinely out of scope for the module.
   Don't carry debt forward.

2. **"Make sure it's all neat and perfect."** The bar is not "it compiles" —
   it's "a plant genomics professor would put it in a lecture without
   correcting it." Every phase ends with peer review if the stakes warrant
   it, and the fix cycle addresses every CRITICAL + HIGH finding before
   declaring done.

3. **"Launch a team of independent peer reviewers"** when a module is
   shipping. Four reviewers in parallel, each a distinct persona (plant
   geneticist, first-encounter undergrad, pedagogy researcher, UX/QA
   engineer), each writing to its own file in `/tmp/peer-review/`. Then one
   synthesis agent produces `MASTER_REPORT.md` with fix bundles. Then fix-
   cycle agents execute the bundles in dependency order.

4. **Don't present option trees at the end of responses.** Pick the highest-
   leverage next action and execute it. If genuinely unsure between two
   paths, do the smaller/safer one first and report, don't ask.

5. **Ask permission only for:** irreversible actions (force push, destructive
   rewrites, schema migrations), shared-state actions (touching main branch
   of a module you don't own), or when a user instruction is ambiguous about
   scope. Not for "which of these three reasonable next steps do you prefer."

6. **Plant examples only.** This is a correctness rule, not a cosmetic one.
   Do not reach for Drosophila, mice, blood types, humans, or abstract A/a
   unless the curriculum domain literally requires them. Canonical plant
   alternatives exist for every concept — see CLAUDE.md's list.

7. **Validation accepts textbook answers, never stochastic samples.** A
   question that asks "what ratio is this?" must accept "3:1" regardless of
   whether the Math.random draw produced 72:28 or 78:22. The student is being
   tested on the textbook ratio, not on reading a number off the screen.

8. **`tsc -b` clean is the hard gate.** Every agent dispatch must verify
   before committing. Never commit code that doesn't type-check.

9. **Use Playwright via Bash if you want real browser verification.** This
   session's agents couldn't drive browsers. If the next session can, use it
   — especially for numeric / visual claims that static analysis can't
   verify.

10. **Commit on `main`, don't push unless asked.** The prior session ran
    every bundle as a local-only commit until the user explicitly said
    "commit push" — match that default.

---

## Recommended next action (my call, execute this unless the user overrides)

**Execute PopGen v2 Phase 1.** Reasons:

- PopGen v1 has the most urgent content gap: abstract A/a everywhere, in
  direct violation of the plants-only rule. A student currently using the
  live PopGen module leaves without having heard "Mimulus" or "Bidens." This
  is pedagogically worse than anything Linkage v1 has.
- The HWE engine bug just got fixed, so Phase 1 can actually demonstrate real
  random-mating chi-square, which was impossible last week.
- The plan is committed and ready (`b91beb7`). Phase 1 is pedagogy tightening
  + plant refloor — 5-6 concrete items, one agent session, one commit.
- Linkage v2 Phase 1 is also ready but has less urgency (Linkage v1 already
  uses maize chr9 correctly).

**Dispatch pattern:** one agent, `general-purpose`, brief that points to
`docs/POPGEN_V2_PLAN.md` Phase 1 section, lists the 5-6 items, sets the
hard gates (`tsc -b` clean, plant examples only, no telegraphed options),
and asks for a structured report back. Match the dispatch prompts from the
Mendelian v2 build for shape reference (search git log for "Phase 1" commit
messages and grep the transcripts if available).

**After Phase 1 lands, cleanup pass if anything was flagged, then Phase 2.**
Same rhythm as Mendelian v2.

**After PopGen Phase 1 + 2 + 3 and cleanup passes**, run the peer review
pipeline against PopGen v2 (four reviewers, synthesis, fix bundles) before
declaring it done. Then do the same for Linkage v2.

**Don't forget to drive `npm run dev` and give the user the URL when he
asks** — he may want to do the Mendelian v2 manual browser walk at any
point.

---

## Quick reference: how to dispatch a Phase 1 agent

Follow the shape of the Mendelian v2 Phase 1 commit brief. The core elements:

1. **Required reading** — CLAUDE.md first, then the plan section for this
   phase, then the source files the agent will touch, in order.
2. **Scope declaration** — exactly which file(s), which line ranges if known,
   which items from the plan (by number, e.g. 1.1 through 1.6).
3. **Non-negotiables** — the hard rules from CLAUDE.md restated for this
   task. `tsc -b` clean, plant examples, notation, deterministic colors,
   validation, no telegraphed options, `useEffect` for side effects.
4. **Out of scope** — an explicit list of files / modules / topics the agent
   must NOT touch. This prevents scope drift and merge conflicts.
5. **Verification gates** — `tsc -b`, `vite build`, grep checks for specific
   patterns that should or shouldn't appear after the edit, mental sanity
   checks for prior-phase features that must remain intact.
6. **Commit instructions** — subject pattern (`<Module> v2 Phase 1:
   <description>`), multi-line body format, "do NOT push" unless pushing is
   part of the task.
7. **Structured report-back** — required format, under a word budget, with
   file:line for every finding.

Use `Agent` tool with `subagent_type: "general-purpose"`. Run in foreground
unless you have other independent work to do in parallel (which you usually
don't during a Phase 1 dispatch).

---

## The session-state directory (`.claude/`)

There's an untracked `.claude/` directory in the working tree. It's session
state for the Claude Code runtime and is gitignored. Don't commit it. Don't
read it to reconstruct prior-session state — everything you need is in this
handoff file and the committed plans.

---

## One-sentence version for a 10-second attention span

**The Mendelian module is shipped and pushed; the Linkage and PopGen vision
plans are committed and pushed; the urgent PopGen HWE engine bug is fixed;
the next action is to execute PopGen v2 Phase 1 against `docs/POPGEN_V2_PLAN.md`;
don't ask permission, just do it.**
