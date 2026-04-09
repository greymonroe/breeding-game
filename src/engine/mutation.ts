import type { GenomeMap, Individual, RNG } from './types';
import { computePhenotype } from './traits';
import type { Trait } from './types';

/**
 * Apply random mutagenesis to a population. For each individual, with
 * probability `rate`, pick one random locus and one random haplotype, and
 * flip the allele to a *different* allele drawn from that locus's allele
 * pool. (If the locus only has one allele defined, no change.)
 *
 * Returns a new array; original individuals are not mutated in place.
 */
export function mutagenize(
  population: Individual[],
  map: GenomeMap,
  traits: Trait[],
  rng: RNG,
  rate: number
): Individual[] {
  const allLoci = map.chromosomes.flatMap((c) => c.loci);
  return population.map((ind) => {
    if (rng() >= rate) return ind;
    const locus = allLoci[Math.floor(rng() * allLoci.length)];
    if (locus.alleles.length < 2) return ind;
    const hapIndex = rng() < 0.5 ? 0 : 1;
    const current = ind.genotype.haplotypes[hapIndex].get(locus.id);
    const others = locus.alleles.filter((a) => a !== current);
    const newAllele = others[Math.floor(rng() * others.length)];
    const newHap = new Map(ind.genotype.haplotypes[hapIndex]);
    newHap.set(locus.id, newAllele);
    const newHaps: [typeof newHap, typeof newHap] =
      hapIndex === 0
        ? [newHap, ind.genotype.haplotypes[1]]
        : [ind.genotype.haplotypes[0], newHap];
    const mutant: Individual = {
      ...ind,
      genotype: { ...ind.genotype, haplotypes: newHaps },
      phenotype: new Map(),
    };
    for (const t of traits) mutant.phenotype.set(t.name, computePhenotype(mutant, t, rng));
    return mutant;
  });
}
