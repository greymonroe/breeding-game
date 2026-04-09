import type { Individual, RNG, Trait } from './types';
import { computePhenotype } from './traits';

/**
 * Targeted gene edit: set both haplotype copies of `locusId` in `ind` to
 * `targetAllele`. Returns a new individual; original is unchanged.
 *
 * Recomputes phenotypes after editing.
 */
export function geneEdit(
  ind: Individual,
  locusId: string,
  targetAllele: string,
  traits: Trait[],
  rng: RNG
): Individual {
  const h0 = new Map(ind.genotype.haplotypes[0]);
  const h1 = new Map(ind.genotype.haplotypes[1]);
  h0.set(locusId, targetAllele);
  h1.set(locusId, targetAllele);
  const edited: Individual = {
    ...ind,
    genotype: { ...ind.genotype, haplotypes: [h0, h1] },
    phenotype: new Map(),
  };
  for (const t of traits) edited.phenotype.set(t.name, computePhenotype(edited, t, rng));
  return edited;
}
