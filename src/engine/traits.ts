import type {
  Individual,
  QualitativeTrait,
  QuantitativeTrait,
  RNG,
  Trait,
} from './types';
import { gaussian } from './rng';

/** Number of copies of a target allele in a diploid genotype at one locus. */
export function alleleDosage(ind: Individual, locusId: string, allele: string): 0 | 1 | 2 {
  const [a, b] = ind.genotype.haplotypes;
  const n = (a.get(locusId) === allele ? 1 : 0) + (b.get(locusId) === allele ? 1 : 0);
  return n as 0 | 1 | 2;
}

/** Genetic value (no environmental noise) for a quantitative trait. */
export function geneticValue(ind: Individual, trait: QuantitativeTrait): number {
  let g = trait.baseline;
  for (const locusId of trait.loci) {
    const fav = trait.favorable.get(locusId)!;
    const eff = trait.effects.get(locusId) ?? 0;
    const dom = trait.dominance.get(locusId) ?? 0;
    const dose = alleleDosage(ind, locusId, fav);
    g += eff * dose;
    if (dose === 1) g += dom; // dominance deviation at heterozygotes
  }
  return g;
}

export function qualitativeValue(ind: Individual, trait: QualitativeTrait): number {
  const dose = alleleDosage(ind, trait.locus, trait.dominantAllele);
  if (dose === 2) return trait.values.dominantHom;
  if (dose === 0) return trait.values.recessiveHom;
  // heterozygote
  if (trait.dominance === 'complete') return trait.values.dominantHom;
  return trait.values.het;
}

/**
 * Compute the F1 genetic value from two parents without running meiosis.
 * For each locus, take one allele from each parent (haplotype[0], since
 * a fully inbred parent has identical haplotypes). Apply the standard
 * additive + dominance model to the resulting diploid genotype.
 */
export function hybridGeneticValue(
  parentA: Individual,
  parentB: Individual,
  trait: QuantitativeTrait,
): number {
  let g = trait.baseline;
  for (const locusId of trait.loci) {
    const fav = trait.favorable.get(locusId)!;
    const eff = trait.effects.get(locusId) ?? 0;
    const dom = trait.dominance.get(locusId) ?? 0;
    // Take one representative allele from each parent
    const aAllele = parentA.genotype.haplotypes[0].get(locusId);
    const bAllele = parentB.genotype.haplotypes[0].get(locusId);
    const dose = (aAllele === fav ? 1 : 0) + (bAllele === fav ? 1 : 0);
    g += eff * dose;
    if (dose === 1) g += dom;
  }
  return g;
}

export function computePhenotype(ind: Individual, trait: Trait, rng: RNG): number {
  if (trait.type === 'qualitative') return qualitativeValue(ind, trait);
  const g = geneticValue(ind, trait);
  const ve = trait.environmentalVariance;
  const noise = ve > 0 ? gaussian(rng) * Math.sqrt(ve) : 0;
  return g + noise;
}

/**
 * Build a quantitative trait, calibrating environmental variance so that
 * h² = Va / (Va + Ve) under random mating with the given allele frequencies.
 *
 * Va for an additive locus with allele frequency p and effect a (per allele
 * copy) is 2*p*(1-p)*a². We default p=0.5 unless caller provides per-locus
 * frequencies.
 */
export function makeQuantitativeTrait(opts: {
  name: string;
  displayName: string;
  heritability: number;
  baseline: number;
  loci: { id: string; effect: number; favorable: string; freq?: number; dominance?: number }[];
}): QuantitativeTrait {
  const effects = new Map<string, number>();
  const favorable = new Map<string, string>();
  const dominance = new Map<string, number>();
  let va = 0;
  for (const l of opts.loci) {
    effects.set(l.id, l.effect);
    favorable.set(l.id, l.favorable);
    dominance.set(l.id, l.dominance ?? 0);
    const p = l.freq ?? 0.5;
    va += 2 * p * (1 - p) * l.effect * l.effect;
  }
  const h2 = Math.min(Math.max(opts.heritability, 0.0001), 0.9999);
  const ve = (va * (1 - h2)) / h2;
  return {
    type: 'quantitative',
    name: opts.name,
    displayName: opts.displayName,
    heritability: h2,
    loci: opts.loci.map((l) => l.id),
    effects,
    dominance,
    favorable,
    baseline: opts.baseline,
    environmentalVariance: ve,
  };
}
