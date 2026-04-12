/**
 * Verification script: Wright-Fisher drift variance
 *
 * After one generation of pure drift starting at p0, the variance of
 * the allele frequency across replicates should be:
 *
 *   Var(p1) = p0(1 - p0) / (2N)
 *
 * We run many replicates at several N values and compare measured
 * variance to the closed-form prediction. The ratio should be 1.0 ± 0.10.
 *
 * Also checks fixation probability: at N=20, p0=0.5, after 500 generations,
 * ~50% of replicates should fix the A allele (by symmetry).
 *
 * Run: npx tsx scripts/popgen/verify-drift-variance.ts
 */

import { simulate } from '../../src/curriculum/popgen-engine.ts';

const REPS = 10_000;
const P0 = 0.5;
const EXPECTED_VARIANCE = P0 * (1 - P0); // = 0.25

let pass = true;

console.log('=== Wright-Fisher Drift Variance ===');
console.log(`Replicates: ${REPS}`);
console.log(`p0: ${P0}`);
console.log();

// --- Variance test at multiple N ---
// The engine's simulate() for generations=1 produces freqHistory of length 2:
//   freqHistory[0] = allele freq from the initial sampleZygotes (has sampling variance)
//   freqHistory[1] = allele freq after one WF drift step from freqHistory[0]
//
// To isolate the WF drift step, we measure the variance of the CHANGE
// (p1 - p0_realized). Given p0_realized, the WF step draws 2N alleles
// with binomial(2N, p0_realized), so Var(delta_p | p0) = p0(1-p0)/(2N).
// Since p0_realized clusters tightly around P0 for large N, the unconditional
// variance of delta_p ≈ P0*(1-P0)/(2N).
for (const N of [20, 100, 500]) {
  const deltaValues: number[] = [];

  for (let i = 0; i < REPS; i++) {
    const result = simulate({
      popSize: N,
      initialFreqA: P0,
      generations: 1,
    });
    // Isolate the WF drift step by taking the change from realized p0 to p1
    const p0Realized = result.freqHistory[0];
    const p1 = result.freqHistory[1];
    deltaValues.push(p1 - p0Realized);
  }

  const mean = deltaValues.reduce((a, b) => a + b, 0) / REPS;
  const variance = deltaValues.reduce((a, b) => a + (b - mean) ** 2, 0) / (REPS - 1);
  const expectedVar = EXPECTED_VARIANCE / (2 * N);
  const ratio = variance / expectedVar;

  console.log(`N = ${N}:`);
  console.log(`  Measured variance: ${variance.toFixed(6)}`);
  console.log(`  Expected variance: ${expectedVar.toFixed(6)}`);
  console.log(`  Ratio (measured/expected): ${ratio.toFixed(4)}`);

  if (Math.abs(ratio - 1.0) > 0.10) {
    console.log(`  FAIL: Ratio ${ratio.toFixed(4)} outside 1.0 ± 0.10`);
    pass = false;
  } else {
    console.log(`  PASS`);
  }
  console.log();
}

// --- Fixation test: N=20, p0=0.5, 500 generations ---
const FIX_REPS = 1000;
const FIX_N = 20;
const FIX_GENS = 500;
let fixedA = 0;
let fixedTotal = 0;

for (let i = 0; i < FIX_REPS; i++) {
  const result = simulate({
    popSize: FIX_N,
    initialFreqA: P0,
    generations: FIX_GENS,
  });
  if (result.fixedAllele === 'A') {
    fixedA++;
    fixedTotal++;
  } else if (result.fixedAllele === 'a') {
    fixedTotal++;
  }
}

const fixRateA = fixedA / FIX_REPS;
const fixRateTotal = fixedTotal / FIX_REPS;

console.log('=== Fixation Test (N=20, p0=0.5, 500 gens) ===');
console.log(`Replicates: ${FIX_REPS}`);
console.log(`Total fixation rate: ${(fixRateTotal * 100).toFixed(1)}%  (expected: ~100% at 500 gens)`);
console.log(`A fixation rate:     ${(fixRateA * 100).toFixed(1)}%  (expected: ~50%)`);

if (Math.abs(fixRateA - 0.5) > 0.10) {
  console.log(`FAIL: A fixation rate ${(fixRateA * 100).toFixed(1)}% outside 50% ± 10%`);
  pass = false;
} else {
  console.log(`PASS`);
}

console.log();
if (pass) {
  console.log('ALL CHECKS PASSED');
} else {
  console.log('SOME CHECKS FAILED');
  process.exit(1);
}
