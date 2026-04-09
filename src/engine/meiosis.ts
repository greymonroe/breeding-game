import type { Genotype, GenomeMap, Haplotype, RNG } from './types';

/**
 * Produce one gamete from a diploid genotype.
 *
 * Model: for each chromosome, we start on a randomly chosen parental
 * haplotype, then walk loci in cM order. Between adjacent loci separated by
 * d cM, the recombination probability is given by the Haldane mapping
 * function r = 0.5 * (1 - exp(-2d/100)). At each gap we flip the active
 * haplotype with probability r. This naturally produces:
 *   - independent assortment across chromosomes (each starts independently)
 *   - linkage between nearby loci
 *   - r → 0.5 for unlinked loci on the same chromosome
 */
export function produceGamete(genotype: Genotype, map: GenomeMap, rng: RNG): Haplotype {
  const out: Haplotype = new Map();
  const [hA, hB] = genotype.haplotypes;

  for (const chrom of map.chromosomes) {
    const loci = [...chrom.loci].sort((a, b) => a.position - b.position);
    if (loci.length === 0) continue;

    let active: 0 | 1 = rng() < 0.5 ? 0 : 1; // independent assortment per chromosome
    const src = () => (active === 0 ? hA : hB);

    out.set(loci[0].id, src().get(loci[0].id)!);
    for (let i = 1; i < loci.length; i++) {
      const d = loci[i].position - loci[i - 1].position; // cM
      const r = 0.5 * (1 - Math.exp((-2 * d) / 100)); // Haldane
      if (rng() < r) active = active === 0 ? 1 : 0;
      out.set(loci[i].id, src().get(loci[i].id)!);
    }
  }
  return out;
}
