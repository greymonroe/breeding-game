import { describe, it, expect } from 'vitest';
import {
  alleleDosage,
  buildGenomeMap,
  crossIndividuals,
  geneEdit,
  genomicSelect,
  inbredFounder,
  makeQuantitativeTrait,
  makeRng,
  meanPhenotype,
  mutagenize,
  predict,
  self,
  trainGenomicPredictor,
  type Chromosome,
} from '../../src/engine';

function map5() {
  const chr: Chromosome = {
    id: 1, length: 200,
    loci: ['Q1','Q2','Q3','Q4','Q5'].map((id, i) => ({
      id, chromosome: 1, position: i * 40, alleles: ['+', '-'], type: 'qtl' as const,
    })),
  };
  return buildGenomeMap('toy', [chr]);
}

describe('Heterosis (dominance)', () => {
  it('F1 of two contrasting inbreds beats midparent when d > 0', () => {
    const map = map5();
    const trait = makeQuantitativeTrait({
      name: 'y', displayName: 'y', heritability: 0.99, baseline: 0,
      // Make heterozygotes worth +2 above the additive expectation
      loci: ['Q1','Q2','Q3','Q4','Q5'].map((id) => ({ id, effect: 1, favorable: '+', dominance: 2 })),
    });
    const rng = makeRng(11);
    const plus = inbredFounder(map, 0); // ++++
    const minus = inbredFounder(map, 1); // ----
    const f1 = crossIndividuals(plus, minus, map, [trait], rng, 30);
    const meanF1 = meanPhenotype(f1, 'y');
    // additive value of F1 = baseline + 5 * 1 * 1 = 5; with dominance 2 per locus = 5 + 10 = 15
    // midparent additive: (10 + 0)/2 = 5. So heterosis ≈ 10.
    expect(meanF1).toBeGreaterThan(10);
  });
});

describe('Gene editing', () => {
  it('forces a locus homozygous for the target allele and updates phenotype', () => {
    const map = map5();
    const trait = makeQuantitativeTrait({
      name: 'y', displayName: 'y', heritability: 0.99, baseline: 0,
      loci: ['Q1','Q2','Q3','Q4','Q5'].map((id) => ({ id, effect: 2, favorable: '+' })),
    });
    const rng = makeRng(7);
    const minus = inbredFounder(map, 1); // ----
    minus.phenotype.set('y', 0);
    const edited = geneEdit(minus, 'Q1', '+', [trait], rng);
    expect(alleleDosage(edited, 'Q1', '+')).toBe(2);
    // Original untouched
    expect(alleleDosage(minus, 'Q1', '+')).toBe(0);
    // Phenotype increased by ~2 (additive effect)
    expect(edited.phenotype.get('y')!).toBeGreaterThan(minus.phenotype.get('y')! + 1);
  });
});

describe('Mutagenesis', () => {
  it('produces some mutants when rate=1', () => {
    const map = map5();
    const trait = makeQuantitativeTrait({
      name: 'y', displayName: 'y', heritability: 0.5, baseline: 0,
      loci: ['Q1','Q2','Q3','Q4','Q5'].map((id) => ({ id, effect: 1, favorable: '+' })),
    });
    const rng = makeRng(3);
    const inbred = inbredFounder(map, 0);
    const pop = self(inbred, map, [trait], rng, 60);
    const mutants = mutagenize(pop, map, [trait], rng, 1);
    let differs = 0;
    for (let i = 0; i < pop.length; i++) {
      const a = JSON.stringify([...pop[i].genotype.haplotypes[0], ...pop[i].genotype.haplotypes[1]]);
      const b = JSON.stringify([...mutants[i].genotype.haplotypes[0], ...mutants[i].genotype.haplotypes[1]]);
      if (a !== b) differs++;
    }
    expect(differs).toBeGreaterThan(40);
  });
});

describe('Genomic prediction (ridge)', () => {
  it('selects higher true-merit individuals than random', () => {
    const map = map5();
    const trait = makeQuantitativeTrait({
      name: 'y', displayName: 'y', heritability: 0.4, baseline: 0,
      loci: ['Q1','Q2','Q3','Q4','Q5'].map((id) => ({ id, effect: 2, favorable: '+' })),
    });
    const rng = makeRng(2024);
    const A = inbredFounder(map, 0);
    const a = inbredFounder(map, 1);
    const f1 = crossIndividuals(A, a, map, [trait], rng, 1)[0];
    const train = self(f1, map, [trait], rng, 200);
    const test = self(f1, map, [trait], rng, 200);

    const predictor = trainGenomicPredictor(train, map, 'y', 1)!;
    expect(predictor).toBeTruthy();

    const top = genomicSelect(test, predictor, 20);
    const random: typeof test = [];
    for (let i = 0; i < 20; i++) random.push(test[Math.floor(rng() * test.length)]);
    // Compare true genetic values (no env noise) — top should be clearly better
    const trueY = (i: typeof test[number]) => {
      let s = 0;
      for (const id of trait.loci) s += (trait.effects.get(id) ?? 0) * alleleDosage(i, id, '+');
      return s;
    };
    const meanTop = top.reduce((s, i) => s + trueY(i), 0) / top.length;
    const meanRand = random.reduce((s, i) => s + trueY(i), 0) / random.length;
    expect(meanTop).toBeGreaterThan(meanRand);
  });

  it('predict() returns finite numbers', () => {
    const map = map5();
    const trait = makeQuantitativeTrait({
      name: 'y', displayName: 'y', heritability: 0.5, baseline: 0,
      loci: ['Q1','Q2','Q3','Q4','Q5'].map((id) => ({ id, effect: 1, favorable: '+' })),
    });
    const rng = makeRng(5);
    const A = inbredFounder(map, 0);
    const a = inbredFounder(map, 1);
    const f1 = crossIndividuals(A, a, map, [trait], rng, 1)[0];
    const train = self(f1, map, [trait], rng, 100);
    const predictor = trainGenomicPredictor(train, map, 'y', 1)!;
    for (const ind of train.slice(0, 10)) {
      expect(Number.isFinite(predict(predictor, ind))).toBe(true);
    }
  });
});
