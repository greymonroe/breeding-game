/**
 * Discovery system — tracks what the player has learned about genetics
 * through experiments, not what they've purchased in the tech tree.
 *
 * Knowledge is progressive:
 *   unknown → dominance_known → test_cross_ready
 *
 * Recessive-phenotype individuals auto-resolve once dominance is known (rr).
 * Dominant-phenotype individuals require per-individual test crosses.
 */

import type { Individual } from '../engine';

export type TraitKnowledgeLevel =
  | 'unknown'           // only phenotypes visible
  | 'dominance_known'   // knows which allele is dominant; recessive plants show rr, dominant show R?
  | 'test_cross_ready'; // can perform test crosses (same display as dominance_known until tested)

export interface TraitDiscovery {
  traitName: string;
  locusId: string;               // e.g., 'COLOR', 'SHAPE', 'DR'
  level: TraitKnowledgeLevel;
  dominantAllele?: string;       // e.g., 'R'
  recessiveAllele?: string;      // e.g., 'r'
  dominanceDiscoveredAt?: number;
}

export interface LinkageDiscovery {
  locus1: string;          // e.g., 'COLOR'
  locus2: string;          // e.g., 'Y1'
  trait1Name: string;      // e.g., 'color'
  trait2Name: string;      // e.g., 'yield'
  discoveredAt: number;    // season
}

export interface DiscoveryState {
  traitDiscoveries: Record<string, TraitDiscovery>;
  /** Set of individual IDs whose genotype at a given locus has been resolved via test cross. */
  resolvedGenotypes: Record<string, Set<string>>;  // locusId → Set<individualId>
  /** Linkages the player has discovered. */
  linkages: LinkageDiscovery[];
}

export function makeInitialDiscovery(): DiscoveryState {
  return {
    traitDiscoveries: {
      color: { traitName: 'color', locusId: 'COLOR', level: 'unknown' },
      shape: { traitName: 'shape', locusId: 'SHAPE', level: 'unknown' },
      disease: { traitName: 'disease', locusId: 'DR', level: 'unknown' },
    },
    resolvedGenotypes: {
      COLOR: new Set(),
      SHAPE: new Set(),
      DR: new Set(),
    },
    linkages: [],
  };
}

/**
 * Determine what allele symbols to display for a qualitative locus.
 * Returns a tuple [allele0, allele1] where '?' means unknown.
 */
export function getAlleleDisplay(
  ind: Individual,
  traitName: string,
  discovery: DiscoveryState,
): [string, string] {
  const disc = discovery.traitDiscoveries[traitName];
  if (!disc || disc.level === 'unknown') {
    return ['?', '?'];
  }

  const locusId = disc.locusId;
  const a0 = ind.genotype.haplotypes[0].get(locusId) ?? '?';
  const a1 = ind.genotype.haplotypes[1].get(locusId) ?? '?';

  // Recessive phenotype → fully resolved (only possible genotype is rr)
  const isRecessive = a0 === disc.recessiveAllele && a1 === disc.recessiveAllele;
  if (isRecessive) {
    return [disc.recessiveAllele!, disc.recessiveAllele!];
  }

  // Dominant phenotype — check if this individual has been test-crossed
  const resolved = discovery.resolvedGenotypes[locusId];
  if (resolved?.has(ind.id)) {
    return [a0, a1]; // fully known
  }

  // Dominant phenotype, not resolved → show D? (one known dominant, one unknown)
  return [disc.dominantAllele!, '?'];
}
