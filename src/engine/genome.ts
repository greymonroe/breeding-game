import type {
  Chromosome,
  Genotype,
  GenomeMap,
  Haplotype,
  Individual,
  Locus,
  RNG,
} from './types';
import { nextId, pickInt } from './rng';

export function buildGenomeMap(species: string, chromosomes: Chromosome[]): GenomeMap {
  const lociById = new Map<string, Locus>();
  for (const c of chromosomes) for (const l of c.loci) lociById.set(l.id, l);
  return { species, chromosomes, lociById };
}

/** Build a haplotype by drawing one allele uniformly at each locus. */
export function randomHaplotype(map: GenomeMap, rng: RNG): Haplotype {
  const h: Haplotype = new Map();
  for (const c of map.chromosomes) {
    for (const l of c.loci) {
      h.set(l.id, l.alleles[pickInt(rng, l.alleles.length)]);
    }
  }
  return h;
}

/** Haplotype where every locus is set to the given allele index. */
export function fixedHaplotype(map: GenomeMap, alleleIndex: number): Haplotype {
  const h: Haplotype = new Map();
  for (const c of map.chromosomes) {
    for (const l of c.loci) {
      h.set(l.id, l.alleles[Math.min(alleleIndex, l.alleles.length - 1)]);
    }
  }
  return h;
}

export function makeIndividual(
  genotype: Genotype,
  generation = 0,
  parents: [string, string] | null = null
): Individual {
  return {
    id: nextId(),
    genotype,
    phenotype: new Map(),
    parents,
    generation,
    isAlive: true,
  };
}

export function randomFounder(map: GenomeMap, rng: RNG, generation = 0): Individual {
  const g: Genotype = {
    species: map.species,
    haplotypes: [randomHaplotype(map, rng), randomHaplotype(map, rng)],
  };
  return makeIndividual(g, generation);
}

/** Homozygous founder fixed for one allele index across the whole genome. */
export function inbredFounder(map: GenomeMap, alleleIndex: number, generation = 0): Individual {
  const h = fixedHaplotype(map, alleleIndex);
  // Clone so the two haplotypes are independent objects.
  const g: Genotype = {
    species: map.species,
    haplotypes: [new Map(h), new Map(h)],
  };
  return makeIndividual(g, generation);
}
