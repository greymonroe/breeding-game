import type { GenomeMap, Individual } from './types';

/**
 * Genomic prediction via ridge regression on additive marker dosages.
 *
 * Training: take phenotyped+genotyped individuals; encode each individual as
 * a feature vector x_i where x_ij is the dosage (0/1/2) of allele[0] at
 * locus j (centered). Solve (X'X + λI) β = X'y for β. Then for any new
 * individual, predicted EBV = x · β.
 *
 * This is a deliberately tiny implementation: closed-form on the small
 * marker matrix. Fine for our toy genome (~10–50 loci).
 */
export interface GenomicPredictor {
  loci: string[];
  /** allele used as "+1 dosage reference" per locus */
  refAllele: string[];
  /** centered means used during training (so out-of-sample inputs match) */
  means: number[];
  /** intercept (mean phenotype) */
  intercept: number;
  /** coefficients in same order as loci */
  beta: number[];
}

function dosage(ind: Individual, locusId: string, ref: string): number {
  const a = ind.genotype.haplotypes[0].get(locusId);
  const b = ind.genotype.haplotypes[1].get(locusId);
  return (a === ref ? 1 : 0) + (b === ref ? 1 : 0);
}

/**
 * Solve (A + λI) β = b where A is p×p symmetric positive-semidefinite.
 * Uses Gauss–Jordan with partial pivoting. Returns β.
 */
function ridgeSolve(A: number[][], b: number[], lambda: number): number[] {
  const p = A.length;
  // Build augmented matrix [A + λI | b]
  const M: number[][] = Array.from({ length: p }, (_, i) => {
    const row = A[i].slice();
    row[i] += lambda;
    row.push(b[i]);
    return row;
  });
  for (let i = 0; i < p; i++) {
    // Pivot
    let max = Math.abs(M[i][i]);
    let maxRow = i;
    for (let k = i + 1; k < p; k++) {
      if (Math.abs(M[k][i]) > max) {
        max = Math.abs(M[k][i]);
        maxRow = k;
      }
    }
    if (max < 1e-12) continue;
    if (maxRow !== i) [M[i], M[maxRow]] = [M[maxRow], M[i]];
    // Eliminate
    for (let k = 0; k < p; k++) {
      if (k === i) continue;
      const f = M[k][i] / M[i][i];
      for (let j = i; j <= p; j++) M[k][j] -= f * M[i][j];
    }
  }
  const beta = new Array<number>(p).fill(0);
  for (let i = 0; i < p; i++) {
    if (Math.abs(M[i][i]) > 1e-12) beta[i] = M[i][p] / M[i][i];
  }
  return beta;
}

export function trainGenomicPredictor(
  trainingPop: Individual[],
  map: GenomeMap,
  traitName: string,
  lambda = 1
): GenomicPredictor | null {
  const loci = map.chromosomes.flatMap((c) => c.loci);
  const refAllele = loci.map((l) => l.alleles[0]);
  const samples = trainingPop.filter((i) => i.phenotype.has(traitName));
  if (samples.length < 2) return null;

  const n = samples.length;
  const p = loci.length;

  // Build X (n×p) and y
  const X: number[][] = samples.map((ind) =>
    loci.map((l, j) => dosage(ind, l.id, refAllele[j]))
  );
  const y = samples.map((ind) => ind.phenotype.get(traitName)!);

  // Center columns of X and y
  const means = new Array<number>(p).fill(0);
  for (let j = 0; j < p; j++) {
    let s = 0;
    for (let i = 0; i < n; i++) s += X[i][j];
    means[j] = s / n;
    for (let i = 0; i < n; i++) X[i][j] -= means[j];
  }
  const yMean = y.reduce((a, b) => a + b, 0) / n;
  const yc = y.map((v) => v - yMean);

  // X'X (p×p) and X'y (p)
  const XtX: number[][] = Array.from({ length: p }, () => new Array<number>(p).fill(0));
  const Xty: number[] = new Array<number>(p).fill(0);
  for (let i = 0; i < p; i++) {
    for (let j = 0; j < p; j++) {
      let s = 0;
      for (let k = 0; k < n; k++) s += X[k][i] * X[k][j];
      XtX[i][j] = s;
    }
    let s = 0;
    for (let k = 0; k < n; k++) s += X[k][i] * yc[k];
    Xty[i] = s;
  }

  const beta = ridgeSolve(XtX, Xty, lambda);
  return {
    loci: loci.map((l) => l.id),
    refAllele,
    means,
    intercept: yMean,
    beta,
  };
}

export function predict(predictor: GenomicPredictor, ind: Individual): number {
  let s = predictor.intercept;
  for (let j = 0; j < predictor.loci.length; j++) {
    const d = dosage(ind, predictor.loci[j], predictor.refAllele[j]);
    s += (d - predictor.means[j]) * predictor.beta[j];
  }
  return s;
}

/** Pick top N individuals by predicted breeding value. */
export function genomicSelect(
  population: Individual[],
  predictor: GenomicPredictor,
  n: number
): Individual[] {
  return [...population]
    .map((ind) => ({ ind, score: predict(predictor, ind) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, n)
    .map((x) => x.ind);
}
