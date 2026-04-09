import type { Individual } from './types';

/** Pick the top N individuals by phenotype for the named trait (descending). */
export function massSelect(
  population: Individual[],
  traitName: string,
  n: number
): Individual[] {
  return [...population]
    .filter((i) => i.phenotype.has(traitName))
    .sort((a, b) => (b.phenotype.get(traitName)! - a.phenotype.get(traitName)!))
    .slice(0, n);
}

/** Mean phenotype for a trait across a population. */
export function meanPhenotype(population: Individual[], traitName: string): number {
  const vals = population
    .map((i) => i.phenotype.get(traitName))
    .filter((v): v is number => v != null);
  if (vals.length === 0) return 0;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

/** Selection differential S = mean(selected) - mean(parents). */
export function selectionDifferential(
  parents: Individual[],
  selected: Individual[],
  traitName: string
): number {
  return meanPhenotype(selected, traitName) - meanPhenotype(parents, traitName);
}
