import type { Individual, Locus, QuantitativeTrait } from './types';
import { alleleDosage, geneticValue } from './traits';

/**
 * "Marker genotypes" the player has paid to reveal. We model this as a Set
 * of locus IDs whose alleles are visible. The actual allele data already
 * lives in the genotype — markers gate *visibility*, not biology.
 */
export interface MarkerKnowledge {
  /** locus IDs the player has discovered (lab workflow → "this marker exists") */
  discoveredLoci: Set<string>;
  /** individuals × marker locus IDs that have been genotyped */
  genotyped: Map<string, Set<string>>; // individualId -> set of locusIds
  /** discovered marker → trait associations and the favorable allele estimate */
  associations: Map<string, MarkerAssociation>;
}

export interface MarkerAssociation {
  locusId: string;
  traitName: string;
  /** estimated additive effect per copy of `favorable` (positive = good) */
  effect: number;
  favorable: string;
}

export function makeMarkerKnowledge(): MarkerKnowledge {
  return {
    discoveredLoci: new Set(),
    genotyped: new Map(),
    associations: new Map(),
  };
}

export function discoverMarker(k: MarkerKnowledge, locusId: string): MarkerKnowledge {
  const next = { ...k, discoveredLoci: new Set(k.discoveredLoci) };
  next.discoveredLoci.add(locusId);
  return next;
}

export function genotypeIndividuals(
  k: MarkerKnowledge,
  individuals: Individual[],
  locusIds: string[]
): MarkerKnowledge {
  const genotyped = new Map(k.genotyped);
  for (const ind of individuals) {
    const set = new Set(genotyped.get(ind.id) ?? []);
    for (const l of locusIds) set.add(l);
    genotyped.set(ind.id, set);
  }
  return { ...k, genotyped };
}

export function isGenotyped(k: MarkerKnowledge, indId: string, locusId: string): boolean {
  return k.genotyped.get(indId)?.has(locusId) ?? false;
}

/**
 * Run a simple single-marker GWAS-style scan: for each candidate locus,
 * compute the mean phenotype difference between allele classes. The locus
 * with the largest absolute effect that exceeds `threshold` becomes a
 * discovered association.
 *
 * Returns the new knowledge object plus the list of associations found.
 */
export function discoverAssociations(
  k: MarkerKnowledge,
  population: Individual[],
  candidateLoci: Locus[],
  traitName: string,
  threshold = 0.5
): { knowledge: MarkerKnowledge; found: MarkerAssociation[] } {
  const found: MarkerAssociation[] = [];
  for (const l of candidateLoci) {
    // group individuals by allele dosage of l.alleles[0]
    const target = l.alleles[0];
    const buckets: number[][] = [[], [], []];
    for (const ind of population) {
      const v = ind.phenotype.get(traitName);
      if (v == null) continue;
      const d = alleleDosage(ind, l.id, target);
      buckets[d].push(v);
    }
    const mean = (xs: number[]) => (xs.length === 0 ? null : xs.reduce((a, b) => a + b, 0) / xs.length);
    const m0 = mean(buckets[0]);
    const m2 = mean(buckets[2]);
    if (m0 == null || m2 == null) continue;
    const effect = (m2 - m0) / 2;
    if (Math.abs(effect) >= threshold) {
      found.push({
        locusId: l.id,
        traitName,
        effect: Math.abs(effect),
        favorable: effect >= 0 ? l.alleles[0] : l.alleles[1],
      });
    }
  }
  // Pick top 5 by |effect|
  found.sort((a, b) => b.effect - a.effect);
  const top = found.slice(0, 5);
  const associations = new Map(k.associations);
  const discoveredLoci = new Set(k.discoveredLoci);
  for (const a of top) {
    associations.set(a.locusId, a);
    discoveredLoci.add(a.locusId);
  }
  return { knowledge: { ...k, associations, discoveredLoci }, found: top };
}

/**
 * Marker-based estimated breeding value (EBV) for an individual using only
 * loci the player has discovered associations for. This is the score MAS
 * picks on.
 */
export function markerEBV(
  ind: Individual,
  knowledge: MarkerKnowledge,
  traitName: string
): number {
  let s = 0;
  for (const a of knowledge.associations.values()) {
    if (a.traitName !== traitName) continue;
    s += a.effect * alleleDosage(ind, a.locusId, a.favorable);
  }
  return s;
}

/** Marker-assisted selection: pick top N by marker EBV. */
export function markerAssistedSelect(
  population: Individual[],
  knowledge: MarkerKnowledge,
  traitName: string,
  n: number
): Individual[] {
  return [...population]
    .map((ind) => ({ ind, score: markerEBV(ind, knowledge, traitName) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, n)
    .map((x) => x.ind);
}

/**
 * Helper for test/sanity: true breeding value for a quantitative trait
 * (genotypic value, no environmental noise).
 */
export function trueBreedingValue(ind: Individual, trait: QuantitativeTrait): number {
  return geneticValue(ind, trait);
}
