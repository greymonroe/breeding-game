import type { GenomeMap, Individual } from './types';
import { alleleFreqs, expectedHeterozygosity, observedHeterozygosity } from './population';

/**
 * Population-level inbreeding coefficient F = 1 - Ho / He.
 *
 * Computed across all loci on the map and averaged. Returns 0 if He is 0.
 */
export function inbreedingCoefficient(population: Individual[], map: GenomeMap): number {
  let sumF = 0;
  let n = 0;
  for (const c of map.chromosomes) {
    for (const l of c.loci) {
      const he = expectedHeterozygosity(population, l.id);
      if (he <= 0) continue;
      const ho = observedHeterozygosity(population, l.id);
      sumF += 1 - ho / he;
      n++;
    }
  }
  return n === 0 ? 0 : sumF / n;
}

/**
 * Effective number of alleles per locus (Ne_a = 1 / Σ p²) averaged across loci.
 * Drops as alleles are lost to selection/drift.
 */
export function meanEffectiveAlleles(population: Individual[], map: GenomeMap): number {
  let sum = 0;
  let n = 0;
  for (const c of map.chromosomes) {
    for (const l of c.loci) {
      const freqs = alleleFreqs(population, l.id);
      let sq = 0;
      for (const p of freqs.values()) sq += p * p;
      if (sq > 0) {
        sum += 1 / sq;
        n++;
      }
    }
  }
  return n === 0 ? 0 : sum / n;
}

/**
 * Within-individual genotypic uniformity over a chosen set of loci.
 * Returns the fraction of those loci at which the individual is homozygous.
 *
 * Used to predict how uniform the offspring of a self-pollinated release
 * will be. A fully inbred line returns 1.0; an F1 between two contrasting
 * inbreds returns 0.0.
 */
export function individualUniformity(
  ind: import('./types').Individual,
  locusIds: string[]
): number {
  if (locusIds.length === 0) return 1;
  let homo = 0;
  for (const id of locusIds) {
    const a = ind.genotype.haplotypes[0].get(id);
    const b = ind.genotype.haplotypes[1].get(id);
    if (a === b) homo++;
  }
  return homo / locusIds.length;
}

/** Number of alleles still segregating across the genome. */
export function segregatingAllelesLost(population: Individual[], map: GenomeMap): {
  total: number;
  remaining: number;
} {
  let total = 0;
  let remaining = 0;
  for (const c of map.chromosomes) {
    for (const l of c.loci) {
      total += l.alleles.length;
      const freqs = alleleFreqs(population, l.id);
      for (const a of l.alleles) if ((freqs.get(a) ?? 0) > 0) remaining++;
    }
  }
  return { total, remaining };
}
