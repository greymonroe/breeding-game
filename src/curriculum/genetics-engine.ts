/**
 * Simplified genetics engine for the Mendelian curriculum.
 * Designed for pedagogy: clear allele notation, configurable dominance,
 * clean ratio computation, and explicit genotype/phenotype separation.
 */

export type DominanceType = 'complete' | 'incomplete' | 'codominant';

export interface GeneDefinition {
  id: string;
  name: string;           // e.g. "Flower color"
  alleles: [string, string]; // e.g. ["R", "r"]
  dominance: DominanceType;
  /**
   * Map canonical genotype key → phenotype label. Use the
   * `canonicalGenotypeKey` helper to build keys — it sorts the two alleles
   * so uppercase (dominant) comes first, which means authors only need to
   * write each heterozygote once (e.g. "Rr", not both "Rr" and "rR"). The
   * engine normalizes both draw orders before lookup.
   */
  phenotypeMap: Record<string, string>;
  /** Map phenotype → CSS color for display */
  colorMap: Record<string, string>;
}

/**
 * Canonical ordering for a two-allele genotype key. Uppercase alleles sort
 * before lowercase; same-case alleles keep their natural string order. So
 * "rR" → "Rr", "Rr" → "Rr", "rr" → "rr", "RR" → "RR". This lets
 * `phenotypeMap` authors write each heterozygote exactly once without
 * worrying which allele the parent contributed first at meiosis.
 */
export function canonicalGenotypeKey(a: string, b: string): string {
  const aUpper = a === a.toUpperCase() && a !== a.toLowerCase();
  const bUpper = b === b.toUpperCase() && b !== b.toLowerCase();
  if (aUpper && !bUpper) return `${a}${b}`;
  if (!aUpper && bUpper) return `${b}${a}`;
  // Same case (both upper or both lower) — preserve natural ordering.
  return a <= b ? `${a}${b}` : `${b}${a}`;
}

export interface Organism {
  id: string;
  genotype: Record<string, [string, string]>; // geneId → [allele1, allele2]
}

export interface CrossResult {
  parents: [Organism, Organism];
  offspring: Organism[];
  /** Phenotype counts */
  phenotypeCounts: Record<string, number>;
  /** Genotype counts */
  genotypeCounts: Record<string, number>;
  total: number;
}

// ── Gene definitions for curriculum ──

// phenotypeMap keys use canonicalGenotypeKey (uppercase-first). Each
// heterozygote is written exactly once — the engine normalizes both draw
// orders before lookup.

export const FLOWER_COLOR: GeneDefinition = {
  id: 'color',
  name: 'Flower color',
  alleles: ['R', 'r'],
  dominance: 'complete',
  phenotypeMap: { 'RR': 'Red', 'Rr': 'Red', 'rr': 'White' },
  colorMap: { 'Red': '#dc4444', 'White': '#f5f0e0' },
};

export const FLOWER_COLOR_INCOMPLETE: GeneDefinition = {
  id: 'color_inc',
  name: 'Flower color',
  alleles: ['R', 'r'],
  dominance: 'incomplete',
  phenotypeMap: { 'RR': 'Red', 'Rr': 'Pink', 'rr': 'White' },
  colorMap: { 'Red': '#dc4444', 'Pink': '#e8a0a0', 'White': '#f5f0e0' },
};

export const SEED_SHAPE: GeneDefinition = {
  id: 'shape',
  name: 'Seed shape',
  alleles: ['S', 's'],
  dominance: 'complete',
  phenotypeMap: { 'SS': 'Round', 'Ss': 'Round', 'ss': 'Wrinkled' },
  colorMap: { 'Round': '#7ab55c', 'Wrinkled': '#c9a84c' },
};

export const PLANT_HEIGHT: GeneDefinition = {
  id: 'height',
  name: 'Plant height',
  alleles: ['T', 't'],
  dominance: 'complete',
  phenotypeMap: { 'TT': 'Tall', 'Tt': 'Tall', 'tt': 'Short' },
  colorMap: { 'Tall': '#4a8a5a', 'Short': '#8ab47a' },
};

// Epistasis example: maize aleurone color (C colored-vs-colorless + R purple-vs-red).
// cc kernels are colorless regardless of R; C_ R_ → Purple, C_ rr → Red.
// Variable names kept (PIGMENT_GENE / AGOUTI_GENE) for backward compatibility with importers.
export const PIGMENT_GENE: GeneDefinition = {
  id: 'aleurone_c',
  name: 'Aleurone Color (C)',
  alleles: ['C', 'c'],
  dominance: 'complete',
  phenotypeMap: { 'CC': 'Colored', 'Cc': 'Colored', 'cc': 'Colorless' },
  colorMap: { 'Colored': '#6b21a8', 'Colorless': '#fef3c7' },
};

export const AGOUTI_GENE: GeneDefinition = {
  id: 'aleurone_r',
  name: 'Aleurone Pigment (R)',
  alleles: ['R', 'r'],
  dominance: 'complete',
  phenotypeMap: { 'RR': 'Purple', 'Rr': 'Purple', 'rr': 'Red' },
  colorMap: { 'Purple': '#6b21a8', 'Red': '#c2410c' },
};

// ── Quantitative trait genes (additive) ──

export function makeAdditiveGene(id: string, index: number): GeneDefinition {
  const upper = String.fromCharCode(65 + index); // A, B, C, ...
  const lower = upper.toLowerCase();
  return {
    id,
    name: `QTL ${index + 1}`,
    alleles: [upper, lower],
    dominance: 'complete', // not really used for quantitative
    // Canonical keys (uppercase-first) — normalizer handles draw order.
    phenotypeMap: {
      [`${upper}${upper}`]: '+2',
      [`${upper}${lower}`]: '+1',
      [`${lower}${lower}`]: '+0',
    },
    colorMap: { '+2': '#2d6a4f', '+1': '#74c69d', '+0': '#d4c4a8' },
  };
}

// ── Core functions ──

export function makeOrganism(
  genotype: Record<string, [string, string]>,
  id?: string
): Organism {
  return { id: id ?? `org_${Math.random().toString(36).slice(2, 8)}`, genotype };
}

/** Get phenotype string for an organism across specified genes.
 *  Genotype lookup is normalized via `canonicalGenotypeKey`, so a gene
 *  only needs to define each heterozygote once regardless of which parent
 *  contributed which allele. */
export function getPhenotype(org: Organism, genes: GeneDefinition[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const gene of genes) {
    const alleles = org.genotype[gene.id];
    if (!alleles) continue;
    const key = canonicalGenotypeKey(alleles[0], alleles[1]);
    result[gene.id] = gene.phenotypeMap[key] ?? 'Unknown';
  }
  return result;
}

/** Get combined phenotype label (for multi-gene crosses) */
export function getPhenotypeLabel(org: Organism, genes: GeneDefinition[]): string {
  const pheno = getPhenotype(org, genes);
  return genes.map(g => pheno[g.id]).join(', ');
}

/** Get genotype label. Uses the canonical key ordering (uppercase first)
 *  so students always see "Rr", never "rR", regardless of which parent
 *  contributed which allele at meiosis. */
export function getGenotypeLabel(org: Organism, genes: GeneDefinition[]): string {
  return genes.map(g => {
    const alleles = org.genotype[g.id];
    if (!alleles) return '??';
    return canonicalGenotypeKey(alleles[0], alleles[1]);
  }).join(' ');
}

/** Epistasis phenotype: maize aleurone color (recessive epistasis, 9:3:4).
 *  cc is epistatic and masks the R gene → Colorless.
 *  Otherwise R_ → Purple, rr → Red. */
export function getEpistasisPhenotype(
  org: Organism,
  pigmentGene: GeneDefinition,
  agoutiGene: GeneDefinition
): string {
  const pigment = getPhenotype(org, [pigmentGene])[pigmentGene.id];
  if (pigment === 'Colorless') return 'Colorless'; // cc is epistatic — masks R
  const r = getPhenotype(org, [agoutiGene])[agoutiGene.id];
  return r === 'Purple' ? 'Purple' : 'Red';
}

/** Compute additive genetic value from multiple QTL genes */
export function getAdditiveValue(org: Organism, genes: GeneDefinition[]): number {
  let value = 0;
  for (const gene of genes) {
    const alleles = org.genotype[gene.id];
    if (!alleles) continue;
    // Count uppercase (favorable) alleles
    if (alleles[0] === alleles[0].toUpperCase() && alleles[0] !== alleles[0].toLowerCase()) value++;
    if (alleles[1] === alleles[1].toUpperCase() && alleles[1] !== alleles[1].toLowerCase()) value++;
  }
  return value;
}

/** Cross two organisms, producing N offspring */
export function cross(
  parentA: Organism,
  parentB: Organism,
  genes: GeneDefinition[],
  n: number,
  rng: () => number = Math.random
): CrossResult {
  const offspring: Organism[] = [];
  const phenotypeCounts: Record<string, number> = {};
  const genotypeCounts: Record<string, number> = {};

  for (let i = 0; i < n; i++) {
    const childGenotype: Record<string, [string, string]> = {};
    for (const gene of genes) {
      const aAlleles = parentA.genotype[gene.id];
      const bAlleles = parentB.genotype[gene.id];
      if (!aAlleles || !bAlleles) continue;
      // Random gamete from each parent
      const fromA = aAlleles[rng() < 0.5 ? 0 : 1];
      const fromB = bAlleles[rng() < 0.5 ? 0 : 1];
      childGenotype[gene.id] = [fromA, fromB];
    }
    const child = makeOrganism(childGenotype);
    offspring.push(child);

    const phenoLabel = getPhenotypeLabel(child, genes);
    phenotypeCounts[phenoLabel] = (phenotypeCounts[phenoLabel] ?? 0) + 1;

    const genoLabel = getGenotypeLabel(child, genes);
    genotypeCounts[genoLabel] = (genotypeCounts[genoLabel] ?? 0) + 1;
  }

  return { parents: [parentA, parentB], offspring, phenotypeCounts, genotypeCounts, total: n };
}

/** Expected Mendelian ratio for monohybrid cross */
export function expectedRatio(_genes: GeneDefinition[]): Record<string, number> {
  // Enumerate all possible gamete combinations
  const gametes = (org: Record<string, [string, string]>, geneIds: string[]): Record<string, string>[] => {
    if (geneIds.length === 0) return [{}];
    const [first, ...rest] = geneIds;
    const alleles = org[first];
    const restGametes = gametes(org, rest);
    const result: Record<string, string>[] = [];
    for (const a of [alleles[0], alleles[1]]) {
      for (const r of restGametes) {
        result.push({ ...r, [first]: a });
      }
    }
    return result;
  };
  // This would need actual parents to compute — skip for now
  return {};
}

/** Simplify ratio (e.g., {A: 12, B: 4} → {A: 3, B: 1}) */
export function simplifyRatio(counts: Record<string, number>): Record<string, number> {
  const values = Object.values(counts);
  if (values.length === 0) return {};
  const minVal = Math.min(...values.filter(v => v > 0));
  if (minVal === 0) return counts;
  // Try common denominators
  for (const divisor of [minVal, 1]) {
    if (divisor === 0) continue;
    if (values.every(v => v % divisor === 0)) {
      const result: Record<string, number> = {};
      for (const [k, v] of Object.entries(counts)) {
        result[k] = v / divisor;
      }
      return result;
    }
  }
  return counts;
}
