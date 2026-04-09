import type { GenomeMap, Genotype, Individual, RNG, Trait } from './types';
import { makeIndividual } from './genome';
import { produceGamete } from './meiosis';
import { computePhenotype } from './traits';

export function crossIndividuals(
  mother: Individual,
  father: Individual,
  map: GenomeMap,
  traits: Trait[],
  rng: RNG,
  count = 1
): Individual[] {
  const offspring: Individual[] = [];
  const generation = Math.max(mother.generation, father.generation) + 1;
  for (let i = 0; i < count; i++) {
    const g: Genotype = {
      species: map.species,
      haplotypes: [
        produceGamete(mother.genotype, map, rng),
        produceGamete(father.genotype, map, rng),
      ],
    };
    const child = makeIndividual(g, generation, [mother.id, father.id]);
    for (const t of traits) {
      child.phenotype.set(t.name, computePhenotype(child, t, rng));
    }
    offspring.push(child);
  }
  return offspring;
}

/** Self-pollinate (selfing) — same individual on both sides. */
export function self(
  parent: Individual,
  map: GenomeMap,
  traits: Trait[],
  rng: RNG,
  count = 1
): Individual[] {
  return crossIndividuals(parent, parent, map, traits, rng, count);
}
