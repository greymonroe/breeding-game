/**
 * Shared phenotype/allele color helpers for curriculum components.
 *
 * Colors are always resolved from a stable semantic key (the phenotype label
 * or the allele letter), never from a palette index, sort order, or count.
 * The same phenotype must render in the same color across every chart in
 * every experiment — see CLAUDE.md "Correctness hard rules".
 *
 * This module exists to deduplicate the near-identical `phenotypeFill` /
 * `alleleFill` helpers that used to live in `RatioBar.tsx` and
 * `GameteVisualizer.tsx`. Behavior is preserved exactly for all labels the
 * existing curriculum produces.
 */

import type { GeneDefinition } from '../genetics-engine';

/** Fallback fill used when no gene colorMap matches the label. */
export const FALLBACK_FILL = '#999';

/** Resolved colors for a (possibly multi-gene) phenotype label. */
export interface PhenotypeColors {
  /** Primary fill (first gene's contribution). */
  fill: string;
  /** Optional secondary indicator for a second gene in a multi-gene label. */
  secondary?: string;
}

/**
 * Resolve the primary fill color for a phenotype label.
 *
 * - Single-gene label (no comma): looks up `label` in each gene's colorMap
 *   in order, returning the first hit. This matches the historical
 *   GameteVisualizer behavior and is a superset of "look in genes[0] only".
 * - Multi-gene label ("Red, Round"): splits on ", " and looks up each part
 *   in the matching gene's colorMap by position. This is the RatioBar
 *   behavior that lets a dihybrid bar show two bands of meaning.
 *
 * `fallback` is only returned if no lookup succeeds; in practice labels
 * produced by the engine always resolve, so this is a defensive default.
 */
export function phenotypeFill(
  label: string,
  genes: GeneDefinition[],
  fallback: string = '#cfcfcf',
): string {
  const resolved = phenotypeColors(label, genes);
  return resolved.fill === FALLBACK_FILL ? fallback : resolved.fill;
}

/**
 * Resolve both primary and (for multi-gene labels) secondary colors for a
 * phenotype label. Use this when you want to render a two-color swatch for
 * a dihybrid phenotype bar; otherwise use `phenotypeFill`.
 */
export function phenotypeColors(
  label: string,
  genes: GeneDefinition[] | undefined,
): PhenotypeColors {
  if (!genes || genes.length === 0) return { fill: FALLBACK_FILL };

  // Single-gene label (no ", " separator): search every gene's colorMap
  // for the first matching entry. Works whether the caller passed one gene
  // or many.
  if (!label.includes(', ')) {
    for (const g of genes) {
      const c = g.colorMap?.[label];
      if (c) return { fill: c };
    }
    return { fill: FALLBACK_FILL };
  }

  // Multi-gene label: position-matched lookup. parts[i] is looked up in
  // genes[i].colorMap. parts[0] → primary fill, parts[1] → secondary.
  const parts = label.split(', ').map(p => p.trim());
  let fill: string | undefined;
  let secondary: string | undefined;
  for (let i = 0; i < parts.length && i < genes.length; i++) {
    const c = genes[i]?.colorMap?.[parts[i]];
    if (i === 0) fill = c;
    else if (i === 1 && !secondary) secondary = c;
  }
  return { fill: fill ?? FALLBACK_FILL, secondary };
}

/**
 * Epistasis palette for the maize aleurone example. Used by RatioBar when
 * `epistasis` is true so the Purple / Red / Colorless classes render with
 * the canonical aleurone colors regardless of which gene's colorMap they
 * happen to sit in.
 */
export function epistasisColors(label: string): string | undefined {
  if (label === 'Colorless') return '#fef3c7';
  if (label === 'Purple') return '#6b21a8';
  if (label === 'Red') return '#c2410c';
  return undefined;
}

/**
 * Color for a single *allele gamete* — the phenotype color that a
 * homozygous pairing of that allele with itself would produce. Used by
 * GameteVisualizer to tint each haploid gamete cell.
 */
export function alleleFill(allele: string, gene: GeneDefinition): string {
  const key = `${allele}${allele}`;
  const pheno = gene.phenotypeMap?.[key] ?? 'Unknown';
  return gene.colorMap?.[pheno] ?? '#cfcfcf';
}
