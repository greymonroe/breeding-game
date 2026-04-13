/**
 * Gene Structure & Regulation Engine
 *
 * Core types and functions for gene anatomy, splicing, CArG-box detection,
 * and the AGAMOUS / ABC model of flower development. Used by the GeneReg
 * curriculum module.
 *
 * Biological reference:
 *  - Yanofsky et al. 1990, Nature 346:35-39 (AGAMOUS cloning)
 *  - Coen & Meyerowitz 1991, Nature 353:31-37 (ABC model)
 *  - Riechmann et al. 1996, Biol Chem 377:349-350 (MADS domain structure)
 *  - Huang et al. 1996, Plant Cell 8:81-94 (AG CArG boxes)
 */

// ── Gene structure types ────────────────────────────────────────────────

export type GeneRegionType =
  | 'upstream'
  | 'promoter'
  | 'tata-box'
  | '5utr'
  | 'exon'
  | 'intron'
  | '3utr'
  | 'poly-a-signal'
  | 'start-codon'
  | 'stop-codon'
  | 'carg-box';

export interface GeneRegion {
  type: GeneRegionType;
  start: number;
  end: number;
  label: string;
  sequence?: string;
}

// ── Color map for gene regions ──────────────────────────────────────────

export const REGION_COLORS: Record<GeneRegionType, string> = {
  upstream:        '#d4d4d8', // stone-300
  promoter:        '#fbbf24', // amber-400
  'tata-box':      '#f59e0b', // amber-500
  '5utr':          '#a5b4fc', // indigo-300
  exon:            '#6366f1', // indigo-500
  intron:          '#e5e7eb', // gray-200
  '3utr':          '#a5b4fc', // indigo-300
  'poly-a-signal': '#818cf8', // indigo-400
  'start-codon':   '#22c55e', // green-500
  'stop-codon':    '#ef4444', // red-500
  'carg-box':      '#f97316', // orange-500
};

// ── Simplified AGAMOUS gene model ───────────────────────────────────────
//
// Loosely modeled on the Arabidopsis AGAMOUS locus (At4g18960).
// Real AG has 7 exons and a very large second intron (~3 kb) containing
// regulatory CArG boxes. We simplify to 3 exons / 2 introns for pedagogy,
// but preserve key structural features:
//  - CArG boxes in the upstream / intronic regulatory region
//  - TATA box at ~-25
//  - GT...AG intron boundaries
//  - Poly-A signal (AATAAA) in the 3' region

export const AG_GENE_MODEL: GeneRegion[] = [
  // Upstream regulatory — contains a CArG box
  { type: 'upstream',      start: 1,    end: 180,  label: 'Upstream regulatory' },
  { type: 'carg-box',      start: 120,  end: 129,  label: 'CArG box I', sequence: 'CCAATTAAGG' },
  // Promoter
  { type: 'promoter',      start: 181,  end: 240,  label: 'Promoter' },
  { type: 'tata-box',      start: 216,  end: 221,  label: 'TATA box', sequence: 'TATAAA' },
  // Transcription start site is at 241
  { type: '5utr',          start: 241,  end: 290,  label: "5' UTR" },
  // Exon 1 — contains start codon and most of MADS domain
  { type: 'start-codon',   start: 291,  end: 293,  label: 'Start codon (ATG)', sequence: 'ATG' },
  { type: 'exon',          start: 291,  end: 470,  label: 'Exon 1 (MADS domain)' },
  // Intron 1 — GT...AG
  { type: 'intron',        start: 471,  end: 590,  label: 'Intron 1', sequence: 'GT...AG' },
  // Exon 2 — K domain (coiled-coil)
  { type: 'exon',          start: 591,  end: 740,  label: 'Exon 2 (K domain)' },
  // Intron 2 — large, contains a CArG box (like real AG intron 2)
  { type: 'intron',        start: 741,  end: 940,  label: 'Intron 2', sequence: 'GT...AG' },
  { type: 'carg-box',      start: 820,  end: 829,  label: 'CArG box II', sequence: 'CCATTTAAGG' },
  // Exon 3 — C-terminal domain
  { type: 'exon',          start: 941,  end: 1120, label: 'Exon 3 (C domain)' },
  { type: 'stop-codon',    start: 1118, end: 1120, label: 'Stop codon (TGA)', sequence: 'TGA' },
  // 3' UTR
  { type: '3utr',          start: 1121, end: 1200, label: "3' UTR" },
  { type: 'poly-a-signal', start: 1180, end: 1185, label: 'Poly-A signal', sequence: 'AATAAA' },
];

// ── Splicing ────────────────────────────────────────────────────────────

/** Canonical GT...AG intron boundary rule */
export function findSpliceSites(sequence: string): { gt: number[]; ag: number[] } {
  const upper = sequence.toUpperCase();
  const gt: number[] = [];
  const ag: number[] = [];
  for (let i = 0; i < upper.length - 1; i++) {
    const di = upper[i] + upper[i + 1];
    if (di === 'GT') gt.push(i);
    if (di === 'AG') ag.push(i);
  }
  return { gt, ag };
}

/**
 * Splice out introns from a pre-mRNA string, given intron positions.
 * Returns the mature mRNA with exons joined.
 */
export function splicePreMRNA(
  premrna: string,
  intronPositions: { start: number; end: number }[],
): string {
  // Sort introns by start position, descending, so splicing from the end
  // doesn't shift earlier indices.
  const sorted = [...intronPositions].sort((a, b) => b.start - a.start);
  let result = premrna;
  for (const intron of sorted) {
    result = result.slice(0, intron.start) + result.slice(intron.end);
  }
  return result;
}

// ── CArG box detection ──────────────────────────────────────────────────

/** CArG box consensus: CC followed by 6 A/T bases followed by GG */
export const CARG_CONSENSUS = 'CC[AT]{6}GG';
const CARG_REGEX = /CC[AT]{6}GG/gi;

/**
 * Find all CArG box motifs in a DNA sequence.
 * Returns position, matched sequence, and a simple score (number of A/T
 * in the central 6 bp — max 6, since the consensus is all A/T there).
 */
export function findCArgBoxes(
  sequence: string,
): { position: number; sequence: string; score: number }[] {
  const results: { position: number; sequence: string; score: number }[] = [];
  const upper = sequence.toUpperCase();
  let match: RegExpExecArray | null;
  // Reset regex state
  CARG_REGEX.lastIndex = 0;
  while ((match = CARG_REGEX.exec(upper)) !== null) {
    const seq = match[0];
    // Score: count A/T in the central 6 bp (positions 2..7)
    const center = seq.slice(2, 8);
    const score = center.split('').filter(b => b === 'A' || b === 'T').length;
    results.push({ position: match.index, sequence: seq, score });
  }
  return results;
}

// ── MADS domain ─────────────────────────────────────────────────────────

/**
 * First ~60 amino acids of Arabidopsis AGAMOUS (At4g18960).
 * This is the MADS domain — the DNA-binding domain that recognizes CArG boxes.
 * Source: UniProt P17839.
 */
export const MADS_DOMAIN_SEQUENCE =
  'MQRGKIEIKR IENQTNRQVY FSKRRSGLMK KAYELSVLCD AEVALIIFSS RGKLYEFCSS';

/** A canonical CArG box DNA target for AGAMOUS */
export const CARG_BOX_TARGET = 'CCAAAAAATGG';

// ── ABC model ───────────────────────────────────────────────────────────

export type FlowerOrgan = 'sepal' | 'petal' | 'stamen' | 'carpel';

export interface AbcState {
  A: boolean;
  B: boolean;
  C: boolean;
}

/**
 * Determine the flower organ identity for a given whorl based on ABC gene
 * activity. Uses the classic Coen & Meyerowitz 1991 model.
 *
 * Whorl 1: A only → sepal
 * Whorl 2: A + B → petal
 * Whorl 3: B + C → stamen
 * Whorl 4: C only → carpel
 *
 * When A is lost, C expands into whorls 1-2 (and vice versa).
 * This is the mutual antagonism rule: A and C are mutually exclusive.
 */
export function abcOrganIdentity(
  whorl: 1 | 2 | 3 | 4,
  abc: AbcState,
): FlowerOrgan {
  // Apply mutual antagonism: if C is active, A is suppressed; if A is
  // active, C is suppressed. If both are knocked out, neither expands.
  const hasA = abc.A && !abc.C ? true : !abc.A && !abc.C ? false : abc.A && abc.C ? (whorl <= 2) : false;
  const hasC = abc.C && !abc.A ? true : !abc.A && !abc.C ? false : abc.A && abc.C ? (whorl >= 3) : false;

  // B function is only in whorls 2 and 3 (no expansion rule for B)
  const hasB = abc.B && (whorl === 2 || whorl === 3);

  // Truth table for organ identity
  if (hasA && hasB) return 'petal';
  if (hasB && hasC) return 'stamen';
  if (hasA && !hasB) return 'sepal';
  if (hasC && !hasB) return 'carpel';

  // Fallback: no function → leaf-like (we'll call it sepal for simplicity)
  return 'sepal';
}

/**
 * Get the full flower phenotype (4 whorls) given an ABC state.
 */
export function flowerPhenotype(abc: AbcState): [FlowerOrgan, FlowerOrgan, FlowerOrgan, FlowerOrgan] {
  return [
    abcOrganIdentity(1, abc),
    abcOrganIdentity(2, abc),
    abcOrganIdentity(3, abc),
    abcOrganIdentity(4, abc),
  ];
}

/** Wild-type flower */
export const WILDTYPE_FLOWER = flowerPhenotype({ A: true, B: true, C: true });

/** ag mutant (C function lost) */
export const AG_MUTANT_FLOWER = flowerPhenotype({ A: true, B: true, C: false });

// ── Flower organ colors (for consistent visualization) ──────────────────

export const ORGAN_COLORS: Record<FlowerOrgan, string> = {
  sepal:  '#22c55e', // green
  petal:  '#f9a8d4', // pink
  stamen: '#fbbf24', // amber/yellow
  carpel: '#a855f7', // purple
};

export const ORGAN_LABELS: Record<FlowerOrgan, string> = {
  sepal:  'Sepal',
  petal:  'Petal',
  stamen: 'Stamen',
  carpel: 'Carpel',
};

// ── Sample sequences for interactive exercises ──────────────────────────

/**
 * A short pre-mRNA sequence for the splicing exercise.
 * Three exons separated by two introns, each with GT...AG boundaries.
 * Exon sequences are uppercase, intron sequences are lowercase in the
 * display, but internally all uppercase.
 */
export const SPLICING_EXERCISE = {
  // exon1 | intron1 | exon2 | intron2 | exon3
  premrna:
    'AUGCGCAAAGAUAUCGAG' +       // Exon 1 (18 bp)
    'GUAAGUCCUAGAUUCCAG' +       // Intron 1 (18 bp) — starts GT, ends AG
    'GAUCCAAUGGCUACUCGA' +       // Exon 2 (18 bp)
    'GUACGUUUAAACCCAUAG' +       // Intron 2 (18 bp) — starts GT, ends AG
    'CAGCUUGGAAUUCUGAUGA',       // Exon 3 (19 bp, includes stop)
  introns: [
    { start: 18, end: 36 },    // Intron 1
    { start: 54, end: 72 },    // Intron 2
  ],
  exonRanges: [
    { start: 0, end: 18, label: 'Exon 1' },
    { start: 36, end: 54, label: 'Exon 2' },
    { start: 72, end: 91, label: 'Exon 3' },
  ],
  matureMrna:
    'AUGCGCAAAGAUAUCGAG' +
    'GAUCCAAUGGCUACUCGA' +
    'CAGCUUGGAAUUCUGAUGA',
};

/**
 * A DNA sequence for the CArG-box-finding exercise.
 * Contains two CArG boxes embedded in flanking sequence.
 */
export const CARG_EXERCISE_SEQUENCE =
  'ATGCTAGCTAG' +
  'CCAATTAAGG' +   // CArG box at position 11
  'GCTAGCTAGCTA' +
  'TAGCGATCGATC' +
  'CCATATAATGG' +  // Not a CArG box — has 7 A/T (11 bp, extra base)
  'GATCGATCGATC' +
  'CCTTTTTTGG' +   // CArG box at position 68
  'ATCGATCG';

/**
 * A DNA sequence for the promoter / TATA box exercise.
 */
export const PROMOTER_EXERCISE_SEQUENCE =
  'GCTAGCTAGCTAGCGATCGA' +
  'TATAAA' +                    // TATA box at position 20
  'GCTAGCTAGCTAGCTAGCTA' +
  'GCTAGCTAGCTA';
