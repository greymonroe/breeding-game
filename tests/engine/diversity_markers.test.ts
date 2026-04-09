import { describe, it, expect } from 'vitest';
import {
  buildGenomeMap,
  inbreedingCoefficient,
  inbredFounder,
  randomFounder,
  crossIndividuals,
  self,
  makeRng,
  makeQuantitativeTrait,
  discoverAssociations,
  makeMarkerKnowledge,
  markerAssistedSelect,
  meanPhenotype,
  type Chromosome,
} from '../../src/engine';

function multiLocusMap() {
  const chr: Chromosome = {
    id: 1,
    length: 200,
    loci: [
      { id: 'Q1', chromosome: 1, position: 10, alleles: ['+', '-'], type: 'qtl' },
      { id: 'Q2', chromosome: 1, position: 50, alleles: ['+', '-'], type: 'qtl' },
      { id: 'Q3', chromosome: 1, position: 100, alleles: ['+', '-'], type: 'qtl' },
      { id: 'Q4', chromosome: 1, position: 150, alleles: ['+', '-'], type: 'qtl' },
      { id: 'Q5', chromosome: 1, position: 190, alleles: ['+', '-'], type: 'qtl' },
    ],
  };
  return buildGenomeMap('toy', [chr]);
}

describe('Diversity', () => {
  it('F rises under repeated selfing', () => {
    const map = multiLocusMap();
    const trait = makeQuantitativeTrait({
      name: 'y', displayName: 'y', heritability: 0.5, baseline: 0,
      loci: ['Q1','Q2','Q3','Q4','Q5'].map((id) => ({ id, effect: 1, favorable: '+' })),
    });
    const rng = makeRng(11);
    // Start with 20 fully heterozygous individuals (cross of two inbreds)
    const A = inbredFounder(map, 0);
    const a = inbredFounder(map, 1);
    let pop = crossIndividuals(A, a, map, [trait], rng, 30);
    const f0 = inbreedingCoefficient(pop, map);
    // Self every individual once per generation, keep one offspring each, for several gens
    for (let g = 0; g < 4; g++) {
      const next = pop.flatMap((p) => self(p, map, [trait], rng, 1));
      pop = next;
    }
    const fLater = inbreedingCoefficient(pop, map);
    expect(f0).toBeLessThan(0.1);
    expect(fLater).toBeGreaterThan(0.5);
  });
});

describe('Marker-assisted selection', () => {
  it('discovers QTL and selects higher-merit individuals than random', () => {
    const map = multiLocusMap();
    const trait = makeQuantitativeTrait({
      name: 'y', displayName: 'y', heritability: 0.5, baseline: 0,
      loci: ['Q1','Q2','Q3','Q4','Q5'].map((id) => ({ id, effect: 2, favorable: '+' })),
    });
    const rng = makeRng(99);
    // Build a diverse F2-like population
    const A = inbredFounder(map, 0);
    const a = inbredFounder(map, 1);
    const f1 = crossIndividuals(A, a, map, [trait], rng, 1)[0];
    const pop = self(f1, map, [trait], rng, 400);

    const allLoci = map.chromosomes.flatMap((c) => c.loci);
    const { knowledge, found } = discoverAssociations(makeMarkerKnowledge(), pop, allLoci, 'y', 0.3);
    expect(found.length).toBeGreaterThan(0);

    const masPicks = markerAssistedSelect(pop, knowledge, 'y', 20);
    // Random "selection" baseline
    const random: typeof pop = [];
    for (let i = 0; i < 20; i++) random.push(pop[Math.floor(rng() * pop.length)]);
    expect(meanPhenotype(masPicks, 'y')).toBeGreaterThan(meanPhenotype(random, 'y'));
  });
});

describe('inbreedingCoefficient sanity', () => {
  it('is ~0 in a random outbred population', () => {
    const map = multiLocusMap();
    const rng = makeRng(3);
    const pop = Array.from({ length: 200 }, () => randomFounder(map, rng));
    const f = inbreedingCoefficient(pop, map);
    expect(Math.abs(f)).toBeLessThan(0.15);
  });
});
