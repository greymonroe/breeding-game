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
 * Starter genome: 7 chromosomes, ~50 loci each (350 total).
 *
 * DESIGN GOALS:
 *  - Diversity has inherent genetic value: beneficial alleles are scattered
 *    across founders. No single founder has all the good alleles. Purging
 *    any founder loses unique alleles forever.
 *  - Dominance at yield QTLs creates natural heterosis: crossing diverse
 *    parents gives an F1 yield boost. Inbreeding causes yield depression
 *    as heterozygosity is lost. No artificial multiplier needed.
 *  - Strategic linkage traps create breeding challenges:
 *    (1) COLOR-Y1: 25 cM coupling — selecting yield purges white
 *    (2) DR-Y4: 8 cM repulsion in wild — introgressing DR drags in Y4-
 *    (3) Y3-F1: 25 cM repulsion across founders — yield vs flavor trade-off
 *
 * YIELD ARCHITECTURE:
 *  - 25 QTLs: 3 major (effect 2.0), 7 medium (1.2), 15 minor (0.5)
 *  - Max theoretical yield: ~94 (requires combining alleles from ALL sources)
 *  - Starting founders average ~57 yield
 *  - Red-only breeding caps at ~72 yield
 *  - Adding white founder alleles pushes to ~82
 *  - Full allele stacking from all founders reaches ~88-90
 *  - Market baseline drifts +0.5/season, so diversity is REQUIRED to stay profitable
 *
 * FOUNDER DESIGN (10 plants):
 *  - 2 elite red (RR): safe release, decent yield from Y1+Y2+Y4 or Y19
 *  - 2 trap red (Rr): highest initial yield but heterozygous — segregate if released
 *  - 2 white (rr): lower yield but carry UNIQUE major QTL Y15 and exclusive alleles
 *  - 2 diverse (Rr): moderate yield, carry alleles not in elite or white groups
 *  - 2 oddball (Rr/rr): lowest yield but carry rare minor alleles and unique flavor QTLs
 *
 * All founders are DR=r/r (susceptible). DR=R only from wild accessions.
 */

const PER_CHROM = 50;

// ── Locus ID constants ──

const YIELD_LOCI = [
  'Y1','Y2','Y3','Y4','Y5','Y6','Y7','Y8','Y9','Y10',
  'Y11','Y12','Y13','Y14','Y15','Y16','Y17','Y18','Y19','Y20',
  'Y21','Y22','Y23','Y24','Y25',
];
const FLAVOR_LOCI = ['F1','F2','F3','F4','F5','F6','F7','F8'];

const MAJOR_YIELD = new Set(['Y1', 'Y7', 'Y15']);
const MEDIUM_YIELD = new Set(['Y2', 'Y4', 'Y8', 'Y11', 'Y16', 'Y19', 'Y22']);
const MAJOR_FLAVOR = new Set(['F1', 'F4', 'F7']);

// ── Genome construction ──

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
    { id: 'Y1', position: 35, alleles: ['+', '-'], type: 'qtl' },       // Major — 25cM from COLOR (coupling LD)
    { id: 'Y2', position: 80, alleles: ['+', '-'], type: 'qtl' },       // Medium
    { id: 'SHAPE', position: 120, alleles: ['L', 'l'], type: 'mendelian' },
    { id: 'Y3', position: 160, alleles: ['+', '-'], type: 'qtl' },      // Minor — 25cM from F1 (repulsion across founders)
    { id: 'F1', position: 185, alleles: ['+', '-'], type: 'qtl' },      // Major flavor
  ]);
  const chr2 = buildChromosome(2, 180, [
    { id: 'DR', position: 25, alleles: ['R', 'r'], type: 'mendelian' },
    { id: 'Y4', position: 33, alleles: ['+', '-'], type: 'qtl' },       // Medium — 8cM from DR (linkage drag from wild!)
    { id: 'Y5', position: 65, alleles: ['+', '-'], type: 'qtl' },       // Minor
    { id: 'F2', position: 95, alleles: ['+', '-'], type: 'qtl' },       // Minor flavor
    { id: 'Y6', position: 130, alleles: ['+', '-'], type: 'qtl' },      // Minor
    { id: 'F3', position: 165, alleles: ['+', '-'], type: 'qtl' },      // Minor flavor
  ]);
  const chr3 = buildChromosome(3, 160, [
    { id: 'Y7', position: 20, alleles: ['+', '-'], type: 'qtl' },       // Major
    { id: 'Y8', position: 55, alleles: ['+', '-'], type: 'qtl' },       // Medium
    { id: 'Y9', position: 95, alleles: ['+', '-'], type: 'qtl' },       // Minor
    { id: 'F4', position: 125, alleles: ['+', '-'], type: 'qtl' },      // Major flavor
    { id: 'Y10', position: 150, alleles: ['+', '-'], type: 'qtl' },     // Minor
  ]);
  const chr4 = buildChromosome(4, 140, [
    { id: 'Y11', position: 15, alleles: ['+', '-'], type: 'qtl' },      // Medium
    { id: 'Y12', position: 50, alleles: ['+', '-'], type: 'qtl' },      // Minor
    { id: 'F5', position: 75, alleles: ['+', '-'], type: 'qtl' },       // Minor flavor
    { id: 'Y13', position: 105, alleles: ['+', '-'], type: 'qtl' },     // Minor
    { id: 'Y14', position: 130, alleles: ['+', '-'], type: 'qtl' },     // Minor
  ]);
  const chr5 = buildChromosome(5, 150, [
    { id: 'Y15', position: 25, alleles: ['+', '-'], type: 'qtl' },      // Major — ONLY in white founders!
    { id: 'Y16', position: 60, alleles: ['+', '-'], type: 'qtl' },      // Medium
    { id: 'Y17', position: 90, alleles: ['+', '-'], type: 'qtl' },      // Minor
    { id: 'F6', position: 115, alleles: ['+', '-'], type: 'qtl' },      // Minor flavor
    { id: 'Y18', position: 140, alleles: ['+', '-'], type: 'qtl' },     // Minor
  ]);
  const chr6 = buildChromosome(6, 120, [
    { id: 'Y19', position: 20, alleles: ['+', '-'], type: 'qtl' },      // Medium
    { id: 'Y20', position: 55, alleles: ['+', '-'], type: 'qtl' },      // Minor
    { id: 'Y21', position: 85, alleles: ['+', '-'], type: 'qtl' },      // Minor
    { id: 'F7', position: 105, alleles: ['+', '-'], type: 'qtl' },      // Major flavor
  ]);
  const chr7 = buildChromosome(7, 130, [
    { id: 'Y22', position: 15, alleles: ['+', '-'], type: 'qtl' },      // Medium
    { id: 'Y23', position: 50, alleles: ['+', '-'], type: 'qtl' },      // Minor
    { id: 'F8', position: 80, alleles: ['+', '-'], type: 'qtl' },       // Minor flavor
    { id: 'Y24', position: 100, alleles: ['+', '-'], type: 'qtl' },     // Minor
    { id: 'Y25', position: 120, alleles: ['+', '-'], type: 'qtl' },     // Minor
  ]);

  const map = buildGenomeMap('cropus toyensis', [chr1, chr2, chr3, chr4, chr5, chr6, chr7]);

  // ── Qualitative traits ──

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

  // ── Quantitative traits ──

  // Yield: 25 QTLs with dominance that creates natural heterosis.
  // Major QTLs have strong dominance — F1 crosses show heterosis,
  // inbreeding causes depression. No artificial multiplier needed.
  const yieldLoci = YIELD_LOCI.map((id) => {
    if (MAJOR_YIELD.has(id)) return { id, effect: 2.0, favorable: '+', dominance: 1.5 };
    if (MEDIUM_YIELD.has(id)) return { id, effect: 1.2, favorable: '+', dominance: 0.8 };
    return { id, effect: 0.5, favorable: '+', dominance: 0.2 };
  });
  const yieldT = makeQuantitativeTrait({
    name: 'yield', displayName: 'Yield', heritability: 0.4, baseline: 50,
    loci: yieldLoci,
  });

  // Flavor: 8 QTLs with mild dominance
  const flavorLoci = FLAVOR_LOCI.map((id) => {
    if (MAJOR_FLAVOR.has(id)) return { id, effect: 2.5, favorable: '+', dominance: 0.5 };
    return { id, effect: 1.2, favorable: '+', dominance: 0.3 };
  });
  const flavor = makeQuantitativeTrait({
    name: 'flavor', displayName: 'Flavor', heritability: 0.5, baseline: 50,
    loci: flavorLoci,
  });

  const traits: Trait[] = [color, shape, disease, yieldT, flavor];
  return { map, traits };
}

// ── Founder creation ──

function phenotypeAll(ind: Individual, traits: Trait[], rng: RNG) {
  for (const t of traits) ind.phenotype.set(t.name, computePhenotype(ind, t, rng));
}

/**
 * Build a founder with explicitly set alleles at key loci.
 * Remaining neutral marker loci get random alleles via the rng.
 */
function customFounder(
  map: ReturnType<typeof buildGenomeMap>,
  overrides: Record<string, [string, string]>,
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

/**
 * Create a founder with specified favorable alleles.
 * All yield/flavor QTLs not listed default to unfavorable ('-/-').
 * COLOR and DR are set explicitly. SHAPE and neutral markers are random.
 *
 * For Rr founders, haplotype 0 = R haplotype, haplotype 1 = r haplotype.
 * Y1 het entries maintain coupling LD: hap0(R) carries Y1=+, hap1(r) carries Y1=-.
 */
function makeFounder(
  map: ReturnType<typeof buildGenomeMap>,
  opts: {
    color: [string, string];
    yieldHom?: string[];    // yield QTLs at +/+
    yieldHet?: string[];    // yield QTLs at +/- (coupling: hap0=+, hap1=-)
    flavorHom?: string[];   // flavor QTLs at +/+
  },
  rng: RNG,
): Individual {
  const overrides: Record<string, [string, string]> = {};
  overrides['COLOR'] = opts.color;
  overrides['DR'] = ['r', 'r'];

  for (const y of YIELD_LOCI) {
    if (opts.yieldHom?.includes(y)) overrides[y] = ['+', '+'];
    else if (opts.yieldHet?.includes(y)) overrides[y] = ['+', '-'];
    else overrides[y] = ['-', '-'];
  }
  for (const f of FLAVOR_LOCI) {
    if (opts.flavorHom?.includes(f)) overrides[f] = ['+', '+'];
    else overrides[f] = ['-', '-'];
  }

  return customFounder(map, overrides, rng);
}

// ── Starter population ──

export function makeStarterPopulation(seed = 1) {
  const { map, traits } = makeStarterGenome();
  const rng = makeRng(seed);

  const founders: Individual[] = [];

  // ── Group 1: Elite Red (RR) — safe early release candidates ──
  // Carry Y1(major)+Y2(med)+Y4(med). Solid starting yield (~59 genetic).
  // Different second-tier alleles between the two → crossing them helps.

  // F1: Y1+Y2+Y4
  founders.push(makeFounder(map, {
    color: ['R', 'R'],
    yieldHom: ['Y1', 'Y2', 'Y4'],
  }, rng));

  // F2: Y1+Y2+Y19 (different medium QTL)
  founders.push(makeFounder(map, {
    color: ['R', 'R'],
    yieldHom: ['Y1', 'Y2', 'Y19'],
  }, rng));

  // ── Group 2: Trap Red (Rr) — highest initial yield but heterozygous ──
  // These LOOK like the best plants but segregate at COLOR+Y1 if released.
  // F3 also carries Y7(major!), making it tempting.

  // F3: het at COLOR+Y1, hom Y7(major)+Y11(med). Also carries F2 flavor.
  founders.push(makeFounder(map, {
    color: ['R', 'r'],
    yieldHom: ['Y7', 'Y11'],
    yieldHet: ['Y1', 'Y4'],
    flavorHom: ['F2'],
  }, rng));

  // F4: het at COLOR+Y1+Y7, hom Y8(med)+Y3(minor). Y3 in repulsion with F1 flavor.
  founders.push(makeFounder(map, {
    color: ['R', 'r'],
    yieldHom: ['Y8', 'Y3'],
    yieldHet: ['Y1', 'Y7'],
  }, rng));

  // ── Group 3: White (rr) — lower yield but IRREPLACEABLE alleles ──
  // F5 carries Y15 (MAJOR yield QTL, ONLY source!). Culling whites = losing Y15.
  // Also carry unique flavor alleles not found elsewhere.

  // F5: Y15(major!)+Y10+Y12, F4 flavor (major, only source)
  founders.push(makeFounder(map, {
    color: ['r', 'r'],
    yieldHom: ['Y15', 'Y10', 'Y12'],
    flavorHom: ['F4'],
  }, rng));

  // F6: Y13+Y17+Y22(med), F3+F6 flavor
  founders.push(makeFounder(map, {
    color: ['r', 'r'],
    yieldHom: ['Y13', 'Y17', 'Y22'],
    flavorHom: ['F3', 'F6'],
  }, rng));

  // ── Group 4: Diverse (Rr) — moderate yield, unique alleles ──
  // Carry alleles not found in elite or white groups.

  // F7: Y5+Y16(med), het Y1+Y8
  founders.push(makeFounder(map, {
    color: ['R', 'r'],
    yieldHom: ['Y5', 'Y16'],
    yieldHet: ['Y1', 'Y8'],
  }, rng));

  // F8: Y9+Y20+Y23, F7 flavor (major, only source)
  founders.push(makeFounder(map, {
    color: ['R', 'r'],
    yieldHom: ['Y9', 'Y20', 'Y23'],
    yieldHet: ['Y1'],
    flavorHom: ['F7'],
  }, rng));

  // ── Group 5: Oddballs — look mediocre but carry rare alleles ──
  // Many minor yield QTLs that add up. Unique flavor alleles.

  // F9 (Rr): 4 minor yield QTLs + F8 flavor
  founders.push(makeFounder(map, {
    color: ['R', 'r'],
    yieldHom: ['Y18', 'Y21', 'Y24', 'Y25'],
    yieldHet: ['Y1'],
    flavorHom: ['F8'],
  }, rng));

  // F10 (rr): Y14+Y6 (minors), F1(major flavor, ONLY source)+F5 flavor
  founders.push(makeFounder(map, {
    color: ['r', 'r'],
    yieldHom: ['Y14', 'Y6'],
    flavorHom: ['F1', 'F5'],
  }, rng));

  for (const ind of founders) phenotypeAll(ind, traits, rng);

  const meanY =
    founders.reduce((s, f) => s + (f.phenotype.get('yield') ?? 0), 0) / founders.length;
  const initialMarketBaseline = Math.round((meanY - 5) * 10) / 10;

  return { population: founders, map, traits, initialMarketBaseline };
}
