import type { GenomeMap, Individual } from './types';

/** Allele counts at one locus across a diploid population. */
export function alleleCounts(
  population: Individual[],
  locusId: string
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const ind of population) {
    for (const h of ind.genotype.haplotypes) {
      const a = h.get(locusId);
      if (a == null) continue;
      counts.set(a, (counts.get(a) ?? 0) + 1);
    }
  }
  return counts;
}

/** Allele frequencies at one locus. */
export function alleleFreqs(
  population: Individual[],
  locusId: string
): Map<string, number> {
  const counts = alleleCounts(population, locusId);
  let total = 0;
  for (const v of counts.values()) total += v;
  const out = new Map<string, number>();
  if (total === 0) return out;
  for (const [k, v] of counts) out.set(k, v / total);
  return out;
}

/** Expected heterozygosity at one locus: He = 1 - Σ p_i² */
export function expectedHeterozygosity(
  population: Individual[],
  locusId: string
): number {
  const freqs = alleleFreqs(population, locusId);
  let sumSq = 0;
  for (const p of freqs.values()) sumSq += p * p;
  return 1 - sumSq;
}

/** Mean He across all loci in the genome map. */
export function meanHe(population: Individual[], map: GenomeMap): number {
  let sum = 0;
  let n = 0;
  for (const c of map.chromosomes) {
    for (const l of c.loci) {
      sum += expectedHeterozygosity(population, l.id);
      n++;
    }
  }
  return n === 0 ? 0 : sum / n;
}

/** Observed heterozygosity at one locus (fraction of individuals that are heterozygous). */
export function observedHeterozygosity(
  population: Individual[],
  locusId: string
): number {
  if (population.length === 0) return 0;
  let het = 0;
  for (const ind of population) {
    const a = ind.genotype.haplotypes[0].get(locusId);
    const b = ind.genotype.haplotypes[1].get(locusId);
    if (a !== b) het++;
  }
  return het / population.length;
}
