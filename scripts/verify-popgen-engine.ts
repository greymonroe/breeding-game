/**
 * Numeric verification for src/curriculum/popgen-engine.ts.
 *
 * Run:  npx tsx scripts/verify-popgen-engine.ts
 *
 * Checks:
 *   1. Wright-Fisher drift variance matches closed-form p(1-p)/(2N).
 *   2. HWE chi-square statistic follows chi-square(1) under random mating
 *      (mean ≈ 1, variance ≈ 2). This is the critical check that the
 *      Exp 2 rigged-HWE bug is gone: pre-fix the mean was ≈ 0 by
 *      construction (deterministic HW round-trip); post-fix the mean
 *      should be ≈ 1.
 *   3. Neutral fixation probability equals p_0 (diffusion theory).
 *   4. Deterministic selection Δp matches textbook closed form
 *      p' = (p² wAA + pq wAa) / wBar.
 *   5. Migration convergence: two-island mixing isn't in simulate() itself
 *      (the module uses a deterministic recursion in Exp 5), but the
 *      engine's one-way migration option still must converge to migrantFreqA.
 *
 * Any ratio off by more than a few percent is a bug — fix the engine,
 * don't loosen the tolerance.
 */

import { simulate, simulateReplicates, testHWE } from '../src/curriculum/popgen-engine';

function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}
function variance(xs: number[]): number {
  const m = mean(xs);
  return xs.reduce((a, b) => a + (b - m) * (b - m), 0) / xs.length;
}

let passes = 0;
let fails = 0;
function check(label: string, ratio: number, tol: number): void {
  const ok = Math.abs(ratio - 1) <= tol;
  const tag = ok ? 'PASS' : 'FAIL';
  const pct = ((ratio - 1) * 100).toFixed(1);
  console.log(`  [${tag}] ${label}   ratio=${ratio.toFixed(3)} (${pct >= '0' ? '+' : ''}${pct}%)`);
  if (ok) passes++; else fails++;
}

// ──────────────────────────────────────────────────────────────────────
// 1. Wright-Fisher drift variance
// ──────────────────────────────────────────────────────────────────────
// The engine constructs generation 0 by drawing 2N alleles from the ideal
// gamete pool at initialFreqA (via a multinomial zygote sample), and then
// generation 1 is one Wright-Fisher step from the realized generation-0 p.
// So var(p_1) across replicates has TWO contributions, each equal to
// p(1-p)/(2N):
//   (a) initial-sample variance of p_0 around initialFreqA,
//   (b) WF drift variance of p_1 around p_0.
// Using the law of total variance (and noting both steps sample 2N alleles
// at essentially the same p for small one-step drift):
//     var(p_1) ≈ var(p_0) + E[p_0(1-p_0)]/(2N) ≈ 2 p(1-p)/(2N) = p(1-p)/N
//
// We therefore compare var(p_1) to p(1-p)/N (i.e. 2× the per-step drift
// variance). To isolate the per-step WF drift alone, we'd need to condition
// on p_0; [check 1b] below does that by running 2 generations and measuring
// the step-2 conditional variance.
console.log('\n[1a] Total var(p_1) across replicates  (= init-sample + WF drift)');
console.log('     predicted: var(p_1) ≈ p₀(1-p₀)/N  (two 2N-allele sampling steps)');
const driftReps = 10000;
for (const N of [20, 100, 1000]) {
  for (const p0 of [0.1, 0.5, 0.9]) {
    const reps = simulateReplicates(
      { popSize: N, initialFreqA: p0, generations: 1 },
      driftReps,
    );
    const p1s = reps.map(r => r.freqHistory[1]);
    const measured = variance(p1s);
    const predicted = (p0 * (1 - p0)) / N;
    check(`N=${String(N).padStart(4)}  p0=${p0}`, measured / predicted, 0.1);
  }
}

console.log('\n[1b] Conditional WF drift variance  (step-2 variance | p_1)');
console.log('     By law of total variance and E[p_2|p_1]=p_1:');
console.log('       var(p_2) − var(p_1) = E[p_1(1−p_1)] / (2N)');
console.log('     This isolates the Wright-Fisher step from initial sampling.');
for (const N of [20, 100, 1000]) {
  for (const p0 of [0.1, 0.5, 0.9]) {
    const reps = simulateReplicates(
      { popSize: N, initialFreqA: p0, generations: 2 },
      driftReps,
    );
    const p1 = reps.map(r => r.freqHistory[1]);
    const p2 = reps.map(r => r.freqHistory[2]);
    const measured = variance(p2) - variance(p1);
    const predicted = mean(p1.map(q => (q * (1 - q)) / (2 * N)));
    check(`N=${String(N).padStart(4)}  p0=${p0}`, measured / predicted, 0.15);
  }
}

// ──────────────────────────────────────────────────────────────────────
// 2. HWE chi-square null distribution
// ──────────────────────────────────────────────────────────────────────
console.log('\n[2] HWE chi-square statistic under random mating');
console.log('    Expected under null: mean(X²) ≈ 1, var(X²) ≈ 2  (chi-square with 1 df)');
console.log('    PRE-FIX expectation: mean(X²) ≈ 0 (deterministic HW round-trip — Exp 2 was rigged)');
const hweReps = 10000;
{
  const reps = simulateReplicates(
    { popSize: 200, initialFreqA: 0.5, generations: 1 },
    hweReps,
  );
  const stats = reps.map(r => testHWE(r.genotypeHistory[1]).chiSquare);
  const m = mean(stats);
  const v = variance(stats);
  console.log(`    measured  mean(X²) = ${m.toFixed(3)}   var(X²) = ${v.toFixed(3)}`);
  console.log(`    predicted mean(X²) = 1.000            var(X²) = 2.000`);
  // Accept ~15% tolerance because chi-square statistics have a heavy tail
  check('mean(X²)', m / 1.0, 0.15);
  check('var(X²)',  v / 2.0, 0.25);
}

// ──────────────────────────────────────────────────────────────────────
// 3. Neutral fixation probability
// ──────────────────────────────────────────────────────────────────────
console.log('\n[3] Neutral fixation probability  (= p_0 under diffusion)');
{
  const fixReps = 1000;
  const reps = simulateReplicates(
    { popSize: 50, initialFreqA: 0.1, generations: 1000 },
    fixReps,
  );
  const fixedA = reps.filter(r => r.finalFreqA === 1).length;
  const measured = fixedA / fixReps;
  const predicted = 0.1;
  console.log(`    N=50, p0=0.1, gens=1000, reps=${fixReps}`);
  console.log(`    fixed A: ${fixedA}/${fixReps} = ${measured.toFixed(3)}  (predicted ${predicted.toFixed(3)})`);
  // 1000 reps → SE ≈ sqrt(0.1*0.9/1000) ≈ 0.0095; ±30% accommodates sampling noise
  check('fixation prob', measured / predicted, 0.30);
}

// ──────────────────────────────────────────────────────────────────────
// 4. Deterministic selection Δp
// ──────────────────────────────────────────────────────────────────────
console.log('\n[4] Directional selection Δp  (closed-form dominant A, waa = 1-s)');
{
  const selReps = 4000;
  const p0 = 0.2;
  const s = 0.1;
  // closed-form one-generation selection (dominant A, aa fitness 1-s):
  //   p' = (p² * 1 + pq * 1) / (p² + 2pq + q²(1-s))
  //      = p / (1 - s q²)
  const q0 = 1 - p0;
  const predictedDp = p0 / (1 - s * q0 * q0) - p0;
  const reps = simulateReplicates(
    {
      popSize: 10000,
      initialFreqA: p0,
      generations: 1,
      fitnessAA: 1,
      fitnessAa: 1,
      fitnessaa: 1 - s,
    },
    selReps,
  );
  const measuredDp = mean(reps.map(r => r.freqHistory[1] - r.freqHistory[0]));
  console.log(`    p0=${p0}, s=${s}, N=10000, reps=${selReps}`);
  console.log(`    measured  Δp = ${measuredDp.toFixed(5)}`);
  console.log(`    predicted Δp = ${predictedDp.toFixed(5)}`);
  check('Δp closed-form', measuredDp / predictedDp, 0.1);
}

// ──────────────────────────────────────────────────────────────────────
// 5. One-way migration convergence
// ──────────────────────────────────────────────────────────────────────
console.log('\n[5] One-way migration convergence  (single run, large N, 200 gens)');
{
  const result = simulate({
    popSize: 5000,
    initialFreqA: 0.1,
    generations: 300,
    migrationRate: 0.05,
    migrantFreqA: 0.7,
  });
  const finalP = result.finalFreqA;
  console.log(`    start p=0.1 → final p=${finalP.toFixed(3)}  (migrant pool 0.7)`);
  check('migration converges to migrant pool', finalP / 0.7, 0.05);
}

console.log(`\nResults: ${passes} passed, ${fails} failed.`);
if (fails > 0) {
  process.exit(1);
}
