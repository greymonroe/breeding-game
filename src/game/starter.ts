import {
  buildGenomeMap,
  computePhenotype,
  makeQuantitativeTrait,
  makeRng,
  type Chromosome,
  type Genotype,
  type Haplotype,
  type Individual,
  type Locus,
  type QualitativeTrait,
  type RNG,
  type Trait,
} from '../engine';
import { makeIndividual } from '../engine/genome';

/**
 * Starter genome: 3 chromosomes, ~100 loci each (300 total).
 *
 * KEY DESIGN: The COLOR locus (R/r) on chr1 is in coupling-phase LD with
 * Y1 (a major yield QTL 25 cM away). In the founders:
 *   R haplotype → Y1=+  (red = high yield at Y1)
 *   r haplotype → Y1=−  (white = low yield at Y1)
 *
 * This means:
 *  - Selecting hard for yield purges the 'r' (white) allele.
 *  - Releasing a heterozygous Rr plant looks red but segregates in the field.
 *  - Getting a high-yield white requires finding a recombinant (r + Y1=+).
 *  - At 25 cM, recombination rate ≈ 20%, so it takes deliberate breeding.
 */

const PER_CHROM = 100;

interface FunctionalLocus {
  id: string;
  position: number;
  alleles: string[];
  type: Locus['type'];
}

function buildChromosome(id: number, length: number, functional: FunctionalLocus[]): Chromosome {
  const loci: Locus[] = functional.map((f) => ({
    id: f.id, chromosome: id, position: f.position, alleles: f.alleles, type: f.type,
  }));
  const filled = new Set(functional.map((f) => Math.round(f.position * 10) / 10));
  const need = PER_CHROM - functional.length;
  let placed = 0;
  for (let i = 1; i <= need + functional.length && placed < need; i++) {
    const pos = Math.round(((i / (need + 1)) * length) * 10) / 10;
    if (filled.has(pos)) continue;
    loci.push({ id: `M${id}_${i}`, chromosome: id, position: pos, alleles: ['A', 'B'], type: 'marker' });
    placed += 1;
  }
  loci.sort((a, b) => a.position - b.position);
  return { id, length, loci };
}

export function makeStarterGenome() {
  const chr1 = buildChromosome(1, 200, [
    { id: 'COLOR', position: 10, alleles: ['R', 'r'], type: 'mendelian' },
    { id: 'Y1', position: 35, alleles: ['+', '-'], type: 'qtl' },
    { id: 'Y2', position: 75, alleles: ['+', '-'], type: 'qtl' },
    { id: 'SHAPE', position: 95, alleles: ['L', 'l'], type: 'mendelian' },
    { id: 'Y3', position: 150, alleles: ['+', '-'], type: 'qtl' },
  ]);
  const chr2 = buildChromosome(2, 150, [
    { id: 'DR', position: 25, alleles: ['R', 'r'], type: 'mendelian' },
    { id: 'F1', position: 50, alleles: ['+', '-'], type: 'qtl' },
    { id: 'F2', position: 80, alleles: ['+', '-'], type: 'qtl' },
    { id: 'F3', position: 110, alleles: ['+', '-'], type: 'qtl' },
    { id: 'Y4', position: 135, alleles: ['+', '-'], type: 'qtl' },
  ]);
  const chr3 = buildChromosome(3, 180, [
    { id: 'Y5', position: 30, alleles: ['+', '-'], type: 'qtl' },
    { id: 'Y6', position: 90, alleles: ['+', '-'], type: 'qtl' },
    { id: 'Y7', position: 160, alleles: ['+', '-'], type: 'qtl' },
  ]);
  const map = buildGenomeMap('cropus toyensis', [chr1, chr2, chr3]);

  const color: QualitativeTrait = {
    type: 'qualitative', name: 'color', displayName: 'Flower color',
    locus: 'COLOR', dominantAllele: 'R', dominance: 'complete',
    values: { dominantHom: 1, het: 1, recessiveHom: 0 },
  };
  const shape: QualitativeTrait = {
    type: 'qualitative', name: 'shape', displayName: 'Leaf shape',
    locus: 'SHAPE', dominantAllele: 'L', dominance: 'incomplete',
    values: { dominantHom: 2, het: 1, recessiveHom: 0 },
  };
  const disease: QualitativeTrait = {
    type: 'qualitative', name: 'disease', displayName: 'Disease resistance',
    locus: 'DR', dominantAllele: 'R', dominance: 'complete',
    values: { dominantHom: 1, het: 1, recessiveHom: 0 },
  };
  const yieldT = makeQuantitativeTrait({
    name: 'yield', displayName: 'Yield', heritability: 0.4, baseline: 50,
    loci: ['Y1', 'Y2', 'Y3', 'Y4', 'Y5', 'Y6', 'Y7'].map((id) => ({
      id, effect: 1.5, favorable: '+', dominance: 1.0,
    })),
  });
  const flavor = makeQuantitativeTrait({
    name: 'flavor', displayName: 'Flavor', heritability: 0.5, baseline: 50,
    loci: ['F1', 'F2', 'F3'].map((id) => ({ id, effect: 2.5, favorable: '+' })),
  });

  const traits: Trait[] = [color, shape, disease, yieldT, flavor];
  return { map, traits };
}

function phenotypeAll(ind: Individual, traits: Trait[], rng: RNG) {
  for (const t of traits) ind.phenotype.set(t.name, computePhenotype(ind, t, rng));
}

/**
 * Build a founder with explicitly set alleles at key loci.
 * Remaining loci get random alleles via the rng.
 */
function customFounder(
  map: ReturnType<typeof buildGenomeMap>,
  overrides: Record<string, [string, string]>, // locusId -> [hap0 allele, hap1 allele]
  rng: RNG
): Individual {
  const h0: Haplotype = new Map();
  const h1: Haplotype = new Map();
  for (const c of map.chromosomes) {
    for (const l of c.loci) {
      if (overrides[l.id]) {
        h0.set(l.id, overrides[l.id][0]);
        h1.set(l.id, overrides[l.id][1]);
      } else {
        h0.set(l.id, l.alleles[Math.floor(rng() * l.alleles.length)]);
        h1.set(l.id, l.alleles[Math.floor(rng() * l.alleles.length)]);
      }
    }
  }
  const g: Genotype = { species: map.species, haplotypes: [h0, h1] };
  return makeIndividual(g, 0, null);
}

export function makeStarterPopulation(seed = 1) {
  const { map, traits } = makeStarterGenome();
  const rng = makeRng(seed);

  // ── Hand-crafted founders with coupling-phase LD ──
  //
  // The R haplotype (red) carries Y1=+ (good yield at the linked QTL).
  // The r haplotype (white) carries Y1=− (bad yield at the linked QTL).
  // This is the trap: selecting for yield purges 'r' from the population.
  //
  // All elite founders are susceptible (DR = r/r). Resistance is only in
  // wild accessions the player acquires later.
  //
  // Founder mix:
  //   2 homozygous red (RR, Y1=+/+): safe to release early, decent yield
  //   4 heterozygous red (Rr, Y1=+/−): look good but segregate if released
  //   2 homozygous white (rr, Y1=−/−): low yield, needed for diversity
  //   2 diverse (Rr) with mixed other loci: broadens the gene pool

  const founders: Individual[] = [];

  // 2× RR homozygous red, Y1=+/+ (safe early release candidates)
  for (let i = 0; i < 2; i++) {
    founders.push(customFounder(map, {
      COLOR: ['R', 'R'], Y1: ['+', '+'], DR: ['r', 'r'],
    }, rng));
  }

  // 4× Rr heterozygous red, Y1=+/− (the trap — high yield but segregates)
  for (let i = 0; i < 4; i++) {
    founders.push(customFounder(map, {
      COLOR: ['R', 'r'], Y1: ['+', '-'], DR: ['r', 'r'],
    }, rng));
  }

  // 2× rr homozygous white, Y1=−/− (low yield, white diversity source)
  for (let i = 0; i < 2; i++) {
    founders.push(customFounder(map, {
      COLOR: ['r', 'r'], Y1: ['-', '-'], DR: ['r', 'r'],
    }, rng));
  }

  // 2× Rr diverse (random other loci, broadens gene pool)
  for (let i = 0; i < 2; i++) {
    founders.push(customFounder(map, {
      COLOR: ['R', 'r'], Y1: ['+', '-'], DR: ['r', 'r'],
    }, rng));
  }

  for (const ind of founders) phenotypeAll(ind, traits, rng);

  const meanY =
    founders.reduce((s, f) => s + (f.phenotype.get('yield') ?? 0), 0) / founders.length;
  const initialMarketBaseline = Math.round((meanY - 5) * 10) / 10;

  return { population: founders, map, traits, initialMarketBaseline };
}
