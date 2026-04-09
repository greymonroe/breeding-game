import { describe, it, expect } from 'vitest';
import {
  buildGenomeMap,
  inbredFounder,
  crossIndividuals,
  self,
  alleleDosage,
  makeRng,
  makeQuantitativeTrait,
  type Chromosome,
  type QualitativeTrait,
} from '../../src/engine';

// A small genome: chromosome 1 has a single Mendelian locus "A".
function singleLocusMap() {
  const chr1: Chromosome = {
    id: 1,
    length: 100,
    loci: [
      { id: 'A', chromosome: 1, position: 50, alleles: ['A', 'a'], type: 'mendelian' },
    ],
  };
  return buildGenomeMap('toy', [chr1]);
}

const colorTrait: QualitativeTrait = {
  type: 'qualitative',
  name: 'color',
  displayName: 'Color',
  locus: 'A',
  dominantAllele: 'A',
  dominance: 'complete',
  values: { dominantHom: 1, het: 1, recessiveHom: 0 },
};

describe('Mendelian segregation', () => {
  it('F1 of AA x aa is all Aa', () => {
    const map = singleLocusMap();
    const rng = makeRng(42);
    const AA = inbredFounder(map, 0); // alleleIndex 0 -> "A"
    const aa = inbredFounder(map, 1); // alleleIndex 1 -> "a"
    const f1 = crossIndividuals(AA, aa, map, [colorTrait], rng, 200);
    for (const c of f1) expect(alleleDosage(c, 'A', 'A')).toBe(1);
  });

  it('F2 (Aa x Aa) gives ~1:2:1 genotypic ratio and ~3:1 phenotypic ratio', () => {
    const map = singleLocusMap();
    const rng = makeRng(7);
    const AA = inbredFounder(map, 0);
    const aa = inbredFounder(map, 1);
    const f1 = crossIndividuals(AA, aa, map, [colorTrait], rng, 1)[0];
    const f2 = self(f1, map, [colorTrait], rng, 4000);

    let homDom = 0, het = 0, homRec = 0;
    for (const c of f2) {
      const d = alleleDosage(c, 'A', 'A');
      if (d === 2) homDom++;
      else if (d === 1) het++;
      else homRec++;
    }
    const n = f2.length;
    // Expect 1/4, 1/2, 1/4. Allow generous tolerance.
    expect(homDom / n).toBeGreaterThan(0.20);
    expect(homDom / n).toBeLessThan(0.30);
    expect(het / n).toBeGreaterThan(0.45);
    expect(het / n).toBeLessThan(0.55);
    expect(homRec / n).toBeGreaterThan(0.20);
    expect(homRec / n).toBeLessThan(0.30);

    // Phenotypic 3:1 under complete dominance
    let dom = 0;
    for (const c of f2) if ((c.phenotype.get('color') ?? 0) > 0.5) dom++;
    const p = dom / n;
    expect(p).toBeGreaterThan(0.71);
    expect(p).toBeLessThan(0.79);
  });
});

describe('Recombination follows Haldane', () => {
  it('two loci 50 cM apart segregate ~independently (r ≈ 0.316)', () => {
    // Haldane: r = 0.5 * (1 - exp(-1)) ≈ 0.3161
    const chr: Chromosome = {
      id: 1,
      length: 100,
      loci: [
        { id: 'L1', chromosome: 1, position: 0, alleles: ['A', 'a'], type: 'mendelian' },
        { id: 'L2', chromosome: 1, position: 50, alleles: ['B', 'b'], type: 'mendelian' },
      ],
    };
    const map = buildGenomeMap('toy', [chr]);
    const rng = makeRng(123);

    // Build a fully heterozygous parent in coupling phase: AB / ab.
    const AB = new Map([['L1', 'A'], ['L2', 'B']]);
    const ab = new Map([['L1', 'a'], ['L2', 'b']]);
    const parent = {
      id: 'p',
      genotype: { species: 'toy', haplotypes: [AB, ab] as [Map<string, string>, Map<string, string>] },
      phenotype: new Map(),
      parents: null,
      generation: 0,
      isAlive: true,
    };
    // Test cross: parent x ab/ab tester. Recombinant offspring carry Ab or aB on the parent-derived gamete.
    const tester = {
      id: 't',
      genotype: { species: 'toy', haplotypes: [new Map(ab), new Map(ab)] as [Map<string, string>, Map<string, string>] },
      phenotype: new Map(),
      parents: null,
      generation: 0,
      isAlive: true,
    };

    const kids = crossIndividuals(parent, tester, map, [], rng, 5000);
    let recomb = 0;
    for (const k of kids) {
      // Look at the gamete from `parent` (haplotype 0 of child).
      const h = k.genotype.haplotypes[0];
      const a1 = h.get('L1');
      const a2 = h.get('L2');
      const isParental = (a1 === 'A' && a2 === 'B') || (a1 === 'a' && a2 === 'b');
      if (!isParental) recomb++;
    }
    const r = recomb / kids.length;
    expect(r).toBeGreaterThan(0.28);
    expect(r).toBeLessThan(0.36);
  });

  it('tightly linked loci (1 cM) almost never recombine', () => {
    const chr: Chromosome = {
      id: 1,
      length: 10,
      loci: [
        { id: 'L1', chromosome: 1, position: 0, alleles: ['A', 'a'], type: 'mendelian' },
        { id: 'L2', chromosome: 1, position: 1, alleles: ['B', 'b'], type: 'mendelian' },
      ],
    };
    const map = buildGenomeMap('toy', [chr]);
    const rng = makeRng(9);
    const AB = new Map([['L1', 'A'], ['L2', 'B']]);
    const ab = new Map([['L1', 'a'], ['L2', 'b']]);
    const parent = {
      id: 'p', generation: 0, isAlive: true, parents: null, phenotype: new Map(),
      genotype: { species: 'toy', haplotypes: [AB, ab] as [Map<string, string>, Map<string, string>] },
    };
    const tester = {
      id: 't', generation: 0, isAlive: true, parents: null, phenotype: new Map(),
      genotype: { species: 'toy', haplotypes: [new Map(ab), new Map(ab)] as [Map<string, string>, Map<string, string>] },
    };
    const kids = crossIndividuals(parent, tester, map, [], rng, 3000);
    let recomb = 0;
    for (const k of kids) {
      const h = k.genotype.haplotypes[0];
      const isParental =
        (h.get('L1') === 'A' && h.get('L2') === 'B') ||
        (h.get('L1') === 'a' && h.get('L2') === 'b');
      if (!isParental) recomb++;
    }
    expect(recomb / kids.length).toBeLessThan(0.03);
  });
});

describe('Quantitative trait', () => {
  it('h² calibration produces variance matching expectation in F2', () => {
    // 5 additive QTL, equal effects, p=0.5, h²=0.5
    const loci = ['Q1', 'Q2', 'Q3', 'Q4', 'Q5'];
    const chr: Chromosome = {
      id: 1, length: 200,
      loci: loci.map((id, i) => ({ id, chromosome: 1, position: i * 40, alleles: ['+', '-'], type: 'qtl' as const })),
    };
    const map = buildGenomeMap('toy', [chr]);
    const trait = makeQuantitativeTrait({
      name: 'yield',
      displayName: 'Yield',
      heritability: 0.5,
      baseline: 0,
      loci: loci.map((id) => ({ id, effect: 1, favorable: '+', freq: 0.5 })),
    });
    // Va per locus = 2*0.5*0.5*1 = 0.5; total Va = 2.5; Ve should equal Va.
    expect(trait.environmentalVariance).toBeCloseTo(2.5, 5);

    const rng = makeRng(2024);
    // Build two inbred founders, '+' and '-', cross to F1, then F2 by selfing.
    const plus = inbredFounder(map, 0);
    const minus = inbredFounder(map, 1);
    const f1 = crossIndividuals(plus, minus, map, [trait], rng, 1)[0];
    const f2 = self(f1, map, [trait], rng, 3000);
    const vals = f2.map((i) => i.phenotype.get('yield')!);
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const variance = vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length;
    // Expected total variance ≈ Va + Ve = 5
    // Expected ≈ 5, allow generous bounds for stochastic test
    expect(variance).toBeGreaterThan(3.0);
    expect(variance).toBeLessThan(8.0);
  });
});
