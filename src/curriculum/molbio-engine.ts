/**
 * Molecular Biology Engine
 *
 * Core functions for DNA/RNA operations, the standard genetic code,
 * translation, and mutation classification. Used by the MolBio
 * curriculum module.
 */

// ── DNA / RNA operations ──────────────────────────────────────────────

/** Complement map for DNA bases */
const DNA_COMPLEMENT: Record<string, string> = {
  A: 'T', T: 'A', G: 'C', C: 'G',
};

/** Template-strand DNA → mRNA (T→A, A→U, G→C, C→G) */
const TRANSCRIPTION_MAP: Record<string, string> = {
  A: 'U', T: 'A', G: 'C', C: 'G',
};

/**
 * Transcribe a DNA template strand (read 3'→5') to mRNA (written 5'→3').
 * Input: template strand bases, written 3'→5' (leftmost = 3' end).
 * Output: mRNA bases, written 5'→3'.
 */
export function transcribe(dnaTemplate: string): string {
  return dnaTemplate
    .toUpperCase()
    .split('')
    .map(b => TRANSCRIPTION_MAP[b] ?? b)
    .join('');
}

/** Return the reverse complement of a DNA strand */
export function reverseComplement(dna: string): string {
  return dna
    .toUpperCase()
    .split('')
    .reverse()
    .map(b => DNA_COMPLEMENT[b] ?? b)
    .join('');
}

/** Convert a coding (sense) DNA strand to mRNA — just swap T→U */
export function codingToMrna(codingStrand: string): string {
  return codingStrand.toUpperCase().replace(/T/g, 'U');
}

// ── Codon table ───────────────────────────────────────────────────────

/** Three-letter amino acid codes by single-letter code */
export const AA_THREE_LETTER: Record<string, string> = {
  A: 'Ala', R: 'Arg', N: 'Asn', D: 'Asp', C: 'Cys',
  E: 'Glu', Q: 'Gln', G: 'Gly', H: 'His', I: 'Ile',
  L: 'Leu', K: 'Lys', M: 'Met', F: 'Phe', P: 'Pro',
  S: 'Ser', T: 'Thr', W: 'Trp', Y: 'Tyr', V: 'Val',
  '*': 'Stop',
};

/**
 * Standard genetic code: mRNA codon → single-letter amino acid.
 * Stop codons are represented as '*'.
 */
export const CODON_TABLE: Record<string, string> = {
  // Phe
  UUU: 'F', UUC: 'F',
  // Leu
  UUA: 'L', UUG: 'L', CUU: 'L', CUC: 'L', CUA: 'L', CUG: 'L',
  // Ile
  AUU: 'I', AUC: 'I', AUA: 'I',
  // Met (start)
  AUG: 'M',
  // Val
  GUU: 'V', GUC: 'V', GUA: 'V', GUG: 'V',
  // Ser
  UCU: 'S', UCC: 'S', UCA: 'S', UCG: 'S', AGU: 'S', AGC: 'S',
  // Pro
  CCU: 'P', CCC: 'P', CCA: 'P', CCG: 'P',
  // Thr
  ACU: 'T', ACC: 'T', ACA: 'T', ACG: 'T',
  // Ala
  GCU: 'A', GCC: 'A', GCA: 'A', GCG: 'A',
  // Tyr
  UAU: 'Y', UAC: 'Y',
  // Stop
  UAA: '*', UAG: '*', UGA: '*',
  // His
  CAU: 'H', CAC: 'H',
  // Gln
  CAA: 'Q', CAG: 'Q',
  // Asn
  AAU: 'N', AAC: 'N',
  // Lys
  AAA: 'K', AAG: 'K',
  // Asp
  GAU: 'D', GAC: 'D',
  // Glu
  GAA: 'E', GAG: 'E',
  // Cys
  UGU: 'C', UGC: 'C',
  // Trp
  UGG: 'W',
  // Arg
  CGU: 'R', CGC: 'R', CGA: 'R', CGG: 'R', AGA: 'R', AGG: 'R',
  // Gly
  GGU: 'G', GGC: 'G', GGA: 'G', GGG: 'G',
};

// ── Translation ───────────────────────────────────────────────────────

export interface TranslationResult {
  aminoAcids: string[];       // single-letter codes
  codons: string[];           // the mRNA codons consumed
  stoppedEarly: boolean;
  stopPosition?: number;      // codon index where stop was hit
}

/**
 * Translate an mRNA string into amino acids.
 * Reads from the start of the string in triplets.
 * Stops at the first stop codon or when bases run out.
 */
export function translate(mrna: string): TranslationResult {
  const seq = mrna.toUpperCase().replace(/[^AUGC]/g, '');
  const aminoAcids: string[] = [];
  const codons: string[] = [];
  let stoppedEarly = false;
  let stopPosition: number | undefined;

  for (let i = 0; i + 2 < seq.length; i += 3) {
    const codon = seq.slice(i, i + 3);
    const aa = CODON_TABLE[codon];
    if (!aa) break; // invalid codon
    codons.push(codon);
    if (aa === '*') {
      stoppedEarly = true;
      stopPosition = codons.length - 1;
      break;
    }
    aminoAcids.push(aa);
  }

  return { aminoAcids, codons, stoppedEarly, stopPosition };
}

// ── Mutation classification ───────────────────────────────────────────

export type MutationType = 'synonymous' | 'nonsynonymous' | 'nonsense' | 'start-loss';

export interface MutationClassification {
  type: MutationType;
  originalCodon: string;
  newCodon: string;
  originalAA: string;   // single-letter
  newAA: string;         // single-letter
  codonIndex: number;    // which codon (0-based) the mutation falls in
  codonPosition: number; // position within codon (0, 1, or 2)
}

/**
 * Classify a point mutation in a coding DNA sequence.
 *
 * @param originalDna - the wild-type coding strand (sense strand, 5'→3')
 * @param position - 0-based position of the mutation in the DNA
 * @param newBase - the mutant base (A, T, G, or C)
 */
export function classifyMutation(
  originalDna: string,
  position: number,
  newBase: string,
): MutationClassification {
  const dna = originalDna.toUpperCase();
  const codonIndex = Math.floor(position / 3);
  const codonPosition = position % 3;
  const codonStart = codonIndex * 3;

  const originalDnaCodon = dna.slice(codonStart, codonStart + 3);
  const mutantDnaCodon =
    originalDnaCodon.slice(0, codonPosition) +
    newBase.toUpperCase() +
    originalDnaCodon.slice(codonPosition + 1);

  const originalMrnaCodon = codingToMrna(originalDnaCodon);
  const mutantMrnaCodon = codingToMrna(mutantDnaCodon);

  const originalAA = CODON_TABLE[originalMrnaCodon] ?? '?';
  const newAA = CODON_TABLE[mutantMrnaCodon] ?? '?';

  let type: MutationType;
  if (originalMrnaCodon === 'AUG' && codonIndex === 0 && newAA !== 'M') {
    type = 'start-loss';
  } else if (newAA === '*') {
    type = 'nonsense';
  } else if (newAA === originalAA) {
    type = 'synonymous';
  } else {
    type = 'nonsynonymous';
  }

  return {
    type,
    originalCodon: originalMrnaCodon,
    newCodon: mutantMrnaCodon,
    originalAA,
    newAA,
    codonIndex,
    codonPosition,
  };
}

// ── Full pipeline ─────────────────────────────────────────────────────

/**
 * Full pipeline: coding DNA → mRNA → amino acid sequence.
 * Returns the array of single-letter amino acid codes.
 */
export function translateToProtein(codingDna: string): string[] {
  const mrna = codingToMrna(codingDna);
  return translate(mrna).aminoAcids;
}

// ── Amino acid property classification ────────────────────────────────

export type AAProperty = 'hydrophobic' | 'polar' | 'positive' | 'negative' | 'special';

export const AA_PROPERTIES: Record<string, AAProperty> = {
  // Hydrophobic (nonpolar)
  A: 'hydrophobic', V: 'hydrophobic', I: 'hydrophobic', L: 'hydrophobic',
  M: 'hydrophobic', F: 'hydrophobic', W: 'hydrophobic', P: 'hydrophobic',
  // Polar (uncharged)
  S: 'polar', T: 'polar', N: 'polar', Q: 'polar', Y: 'polar', C: 'special',
  // Positively charged
  K: 'positive', R: 'positive', H: 'positive',
  // Negatively charged
  D: 'negative', E: 'negative',
  // Special
  G: 'special',
};

export const AA_PROPERTY_LABELS: Record<AAProperty, string> = {
  hydrophobic: 'Hydrophobic',
  polar: 'Polar',
  positive: 'Positively charged',
  negative: 'Negatively charged',
  special: 'Special',
};

export const AA_PROPERTY_COLORS: Record<AAProperty, string> = {
  hydrophobic: '#f59e0b', // amber
  polar: '#3b82f6',       // blue
  positive: '#ef4444',    // red
  negative: '#8b5cf6',    // violet
  special: '#6b7280',     // gray
};
