# Claude Code guidance for this repo

This is a plant breeding game with three undergraduate genetics curriculum modules
(Transmission / Mendelian, Linkage & Recombination, Population Genetics). The
curriculum modules are **teaching tools for real students**. They exist to build
correct mental models of genetics, not to be thematically plausible. Everything
below is about how to work on this codebase without breaking the science.

## The pedagogical imperative — read before editing any curriculum code

**This is educational software.** Every experiment in `src/curriculum/` is seen by
undergraduates who will go on to take more genetics courses. If you teach them
wrong numbers or wrong reasoning, they will carry it forward. Treat this with the
seriousness you would give a lecture you're about to deliver in a university
classroom — because that is what it is.

The bar is **not** "looks like a genetics lesson." The bar is **"a plant genomics
professor would put this in their lecture."** The project owner *is* a plant
genomics professor; he is the target reviewer of everything you change here.

### Design every experiment like a genetics professor, from first principles

Before you write any curriculum code — or modify any existing experiment — do
these four things in order:

1. **Write down what the experiment is trying to teach.** One sentence. What
   concept does the student walk away with that they didn't have before?
2. **Write down the canonical textbook numbers** that correspond to that concept.
   A 3:1 monohybrid. A 9:3:3:1 dihybrid. RF = 17 cM between C and sh on maize
   chr9. p² + 2pq + q² = 1. Δp = spq²/(1−sq²). These are your acceptance
   criteria — what the engine must produce and what the student must see on screen.
3. **Work out a closed-form prediction for what the simulation should output**
   given its parameters. Stochastic output should sit within a few standard
   errors of this prediction. If it doesn't, the engine is wrong — don't paper
   over it by widening tolerances in the UI.
4. **Identify the discovery beat.** What does the student *observe* that forces
   them to update their model? If the student can answer the question without
   looking at the data, the experiment is recall, not discovery, and it's failing
   its purpose.

Only after doing all four should you write code.

### Correctness hard rules

- **Prefer boolean truth tables over nested `if` branches** for any genetic
  classification logic (recombinant detection, epistasis masking, phenotype
  assignment, HWE genotype resampling). Branching logic is exactly where the
  Linkage Exp 7 bug lived (`threePointAnalysis` misrouted single crossovers
  into the wrong region, showing students 5.3 / 13.4 cM when the true values
  were 8 / 10 cM). Write out the truth table, trace every possible genotype
  through it by hand, confirm each case lands in the correct bucket.
- **Student-facing numbers and student-facing validation must agree.** If Exp 4
  asserts "RF = 17%", Exp 3 must accept "17" as correct. If Exp 5 says "8 kernel
  classes", the table must always show 8 classes (even when one happens to have
  zero observations — pre-seed the counts record). Cross-experiment consistency
  is a correctness property, not polish.
- **Never validate against a stochastic sample as if it were the target.** If
  the textbook answer is 17% and the sample drifted to 20.6% due to Monte Carlo
  noise, both answers should be acceptable — the student is not being tested on
  whether they can read the sample number off the screen. Validation drift was
  the bug that had Exp 3 rejecting "17" seconds before Exp 4 asserted it.
- **Each experiment should consume the student's own data where possible.** If
  Exp 6 is a chi-square test on a 1:1:1:1 null, it should run chi-square on the
  counts the student produced in Exp 1–3, not on a hardcoded `[180, 170, 26, 24]`
  magic array. The PopGen Exp 6 had this bug; so did the Mendelian module. Both
  are fixed. Don't reintroduce the pattern.
- **Validate stochastic outputs against closed-form predictions in code, not
  just by eye.** If you touch an engine, add or update a numeric verification
  script (see `/tmp/popgen-audit/scripts/verify-engine.js` as a reference — it
  runs Wright-Fisher simulations at multiple N and compares measured variance to
  `p(1−p)/(2N)`). Then run it and paste the ratios before vs after into your
  commit message. If the ratios don't match closed-form to within 10%, the
  engine has a bug — find it before shipping.
- **Colors must map deterministically by semantic meaning, never by render
  order, frequency, or array index.** This has bitten us twice: Linkage's
  `LinkageRatioBar` and Mendelian's `RatioBar` both indexed into a fixed palette
  by sort order, so "Yellow Shrunken" and "Red Round" would render in whatever
  color happened to be at position `n` that run. The same phenotype must always
  get the same color across every chart in every experiment. Use
  `phenotypeFill(label)` style mapping with the label as a stable key.
- **Notation must be internally consistent across the whole module.** Pick one
  convention (uppercase/lowercase slash notation for plants — `C/c`, `Sh/sh`,
  `Cc Rr`; `+`/superscript notation for Drosophila — but we don't use Drosophila
  in this project, so default to plant slash notation) and apply it everywhere.
  Mixed `Shsh` / `Sh/sh` / `shsh` in the same module reads as sloppy and
  undermines student trust in everything else on the page.

### Plant examples only

See `src/curriculum/` — every module must use plant examples, not mice, flies,
humans, blood types, or any other textbook-default organism. This rule was set
after April 2026 when Linkage was built with Drosophila (the historical default
for linkage via Morgan's work) and PopGen used abstract A/a alleles. Linkage got
rewritten to use maize chromosome 9 and the Creighton–McClintock 1931 experiment
(genes C / Sh / Wx). Mendelian Exp 6 got rewritten to use maize aleurone color
instead of mouse coat color. If you add curriculum content and reach for
Drosophila / mice / fruit flies / blood types because they're what the textbook
uses, **stop and ask before implementing**. Canonical plant alternatives almost
always exist:

- Mendelian transmission: peas (Mendel), snapdragons (incomplete dominance),
  maize aleurone (epistasis).
- Linkage / recombination: maize chromosome 9 C–Sh–Wx (Creighton & McClintock).
- Population genetics: Mimulus anthocyanin, Brassica S-alleles, Amaranthus
  glyphosate resistance, Arabidopsis chlorophyll mutants, Hawaiian Bidens
  (founder effect), island Plantago (drift).
- Quantitative / polygenic: tomato fruit size, maize kernel number, Arabidopsis
  rosette diameter.

### Peer-review every module end-to-end before declaring it done

"It compiles and I can click through it" is not done. Before shipping any
curriculum change, do this peer-review pass:

1. Walk every experiment in the module on the live site (or local dev).
2. For each experiment, submit both a correct and a deliberately wrong answer.
   Screenshot the feedback state in both cases.
3. Verify the stochastic numbers on screen match closed-form expectation within
   a few standard errors. If not, the engine is wrong.
4. Check that labels match colors (Red phenotype → red swatch, never blue).
5. Check that every phenotype swatch is consistent across every chart in the
   module.
6. Check notation consistency across all seven experiments.
7. Cross-check: does anything in Exp N+1 contradict anything in Exp N?

Use `/tmp/linkage-audit/REPORT.md`, `/tmp/popgen-audit/REPORT.md`, and
`/tmp/mendelian-audit/REPORT.md` as the template for what a good peer review
looks like. They are the historical audits from April 2026 that found 43 bugs
(10 CRITICAL) across the three shipped modules.

### When in doubt, ask the project owner

He's a plant genomics professor. He would rather answer *"is the canonical C–sh1
distance ~17 or ~29 cM?"* up front than review wrong content later. Questions
about dominance, epistasis, gene order, map distance, or the right plant example
for a concept — ask, don't guess. He is the ground truth for this codebase.

## Architecture pointers

- `src/curriculum/` — the three curriculum modules. Each is one `*.tsx` file
  containing 7 experiment components plus an `EXPERIMENTS` array that wires them
  into `ModuleShell`.
- `src/curriculum/*-engine.ts` — the simulation engines (`genetics-engine.ts` for
  Mendelian, `linkage-engine.ts` for linkage, `popgen-engine.ts` for PopGen).
  These are where the science lives. Most CRITICAL bugs in the April 2026 audit
  were in engine files, not in module JSX.
- `src/curriculum/components/` — shared UI: `ModuleShell`, `CrossWorkbench`,
  `RatioBar`, `OrganismCard`, `HistogramChart`, `FrequencyChart`, `QuestionPanel`.
  `RatioBar` accepts an `order?: string[]` prop for explicit phenotype ordering
  (for incomplete-dominance cases where allele-dose order matters, not count-desc).
  `HistogramChart` accepts `referenceX` + `referenceLabel` props for dashed
  reference lines.
- `src/curriculum/components/index.ts` — barrel export.
- `src/shared/icons/` — shared plant SVG icons used by both the main game and
  the curriculum modules. Never raw circles or ad-hoc SVGs; import from here.
- `lab.html` / `linkage.html` / `popgen.html` / `modules.html` — Vite multi-page
  entry points. Adding a new module = adding a new HTML entry point, not a new
  route.
- Main game is in `src/` (not the curriculum folder). Don't touch main game
  gameplay when editing curriculum, and vice versa. The shared pieces are
  `src/shared/icons/` and nothing else.

## Common bug classes to check for (historical)

When reviewing or editing curriculum code, scan for these patterns — they have
all shipped before and were caught only in peer review:

1. **Validation tolerance drift** — `Math.abs(studentAnswer − sampledValue) < ε`
   instead of comparing to the target ratio. Drifts on every re-run.
2. **Hardcoded magic-number data** — `[180, 170, 26, 24]` literal arrays being
   fed into chi-square or chart components instead of using the student's own
   cross results.
3. **Rigged discovery** — `const mystery = useMemo(() => makeOrganism({color:
   ['R','r']}))` where the "unknown" is hardcoded; conclusions printed
   unconditionally without checking observed data.
4. **`setTimeout(onComplete)` from inside render** — creates a new timer every
   re-render. Always use `useEffect` for side effects.
5. **Sort-order color assignment** — `palette[index]` where index comes from
   a sort-desc-by-count. Flips on every run.
6. **Single-gene colorMap lookup for multi-gene labels** — `genes[0].colorMap[
   "Red, Round"]` returns undefined → falls back to `#999` gray for every
   dihybrid class.
7. **Telegraphed answer options** — `'Cross it with a white (rr) plant'` where
   only the correct option is annotated. Same for `'same chromosome (linked)'`.
8. **Hardcoded class lists that drop zero-count entries** — a `Record<string,
   number>` built by incrementing on each observation silently loses classes
   that happen to have zero observations in this run. Pre-seed the record.
9. **Engine re-sampling after the real stochastic step** — the PopGen engine
   did `binomial(2N, p)` (the correct WF drift) and then `sampleGenotypes(N, p)`
   on top, tripling drift variance and forcing HWE every generation. The
   second call was redundant and silently wrong.
10. **Branching classification where truth tables are clearer** — see the
    Linkage `threePointAnalysis` bug above.

If you're touching curriculum code and any of these patterns are near where
you're working, check for the bug even if it's not in your immediate scope.

## Historical audit reports

These are stored in `/tmp/*-audit/REPORT.md` during an active session but are
not committed to the repo. They found 43 bugs across the three modules in April
2026, 10 of which were CRITICAL. Use them as the template for future audits and
as a reminder that "it shipped" is not the same as "it's correct."

- Linkage: `/tmp/linkage-audit/REPORT.md` — 13 bugs, 3 CRITICAL.
  Most severe: `threePointAnalysis` misclassified single crossovers (wrong map
  distances shown as "correct"); Exp 3 tolerance rejected the textbook answer
  that Exp 4 then asserted; Exp 6 chi-square on hardcoded data.
- PopGen: `/tmp/popgen-audit/REPORT.md` — 15 bugs, 3 CRITICAL.
  Most severe: Exp 5 migration converges to *swapped* frequencies, not a common
  value, while the quiz marks "converge" as correct; engine post-WF resampling
  inflates drift ~3×; HWE "discovery" rigged by the same resampling bug.
- Mendelian: `/tmp/mendelian-audit/REPORT.md` — 15 bugs, 4 CRITICAL.
  Most severe: Exp 6 used mice (curriculum rule violation); Exp 5 dihybrid
  bars all gray; Exp 7 histogram bars never rendered; Exp 4 rigged discovery.

## Testing and build

- `npx tsc -b` — run before every commit. Zero errors, period.
- `npm run dev` — local dev server with hot reload. Use for visual work.
- Playwright verification — drive scripts live in `/tmp/*-audit/scripts/`.
  Pattern: walk every experiment, screenshot correct + wrong answer states,
  grep deployed JS bundle for the strings that should exist vs. shouldn't.
- No test framework is wired up at the project level yet. If you're adding
  one, prefer Vitest + Playwright over Jest.

## What NOT to do

- Don't touch the main game (`index.html` + `src/`) gameplay logic when editing
  curriculum. The game and the curriculum share only `src/shared/icons/`.
- Don't add React Router. This project uses Vite multi-page (separate HTML
  entry points per module).
- Don't make curriculum modules depend on the main game's Zustand store. Each
  module is self-contained.
- Don't over-abstract before building. Get the science right first, then
  refactor if it's genuinely needed.
- Don't skip pre-commit `tsc -b`. It's the single cheapest safeguard.
- Don't widen UI tolerances to paper over engine bugs. Fix the engine.
- Don't add "plausible" numbers that aren't textbook-derived. If you don't know
  the canonical value for a parameter, ask.
