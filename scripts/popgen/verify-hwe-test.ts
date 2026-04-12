/**
 * Verification script: HWE chi-square test calibration
 *
 * Under the null (random mating), sampleZygotes(N, p) produces a
 * Multinomial(N, [p^2, 2pq, q^2]) draw. The HWE chi-square test
 * statistic should follow chi-square(1), so:
 *   - E[X^2] = 1.0
 *   - P(X^2 > 3.84) ≈ 0.05  (the alpha=0.05 critical value for df=1)
 *
 * Run: npx tsx scripts/popgen/verify-hwe-test.ts
 */

import { sampleZygotes, testHWE } from '../../src/curriculum/popgen-engine.ts';

const REPS = 10_000;
const N = 1000;
const P = 0.5;

let sumChiSq = 0;
let countExceedCritical = 0;

for (let i = 0; i < REPS; i++) {
  const geno = sampleZygotes(N, P);
  const result = testHWE(geno);
  sumChiSq += result.chiSquare;
  if (result.chiSquare > 3.841) countExceedCritical++;
}

const meanChiSq = sumChiSq / REPS;
const rejectionRate = countExceedCritical / REPS;

console.log('=== HWE Chi-Square Test Calibration ===');
console.log(`Replicates:       ${REPS}`);
console.log(`Sample size (N):  ${N}`);
console.log(`Allele freq (p):  ${P}`);
console.log();
console.log(`Mean chi-square:  ${meanChiSq.toFixed(4)}  (expected: 1.0, tolerance: ±0.15)`);
console.log(`Rejection rate:   ${rejectionRate.toFixed(4)}  (expected: 0.05, tolerance: ±0.02)`);
console.log();

let pass = true;

if (Math.abs(meanChiSq - 1.0) > 0.15) {
  console.log(`FAIL: Mean chi-square ${meanChiSq.toFixed(4)} is outside 1.0 ± 0.15`);
  pass = false;
} else {
  console.log(`PASS: Mean chi-square within tolerance`);
}

if (Math.abs(rejectionRate - 0.05) > 0.02) {
  console.log(`FAIL: Rejection rate ${rejectionRate.toFixed(4)} is outside 0.05 ± 0.02`);
  pass = false;
} else {
  console.log(`PASS: Rejection rate within tolerance`);
}

console.log();
if (pass) {
  console.log('ALL CHECKS PASSED');
} else {
  console.log('SOME CHECKS FAILED');
  process.exit(1);
}
