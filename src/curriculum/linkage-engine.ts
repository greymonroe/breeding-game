/**
 * Linkage genetics engine for the Linkage & Recombination curriculum.
 * Models linked genes on the same chromosome with recombination.
 *
 * Key difference from Mendelian engine: alleles on the SAME chromosome
 * travel together during meiosis unless recombination occurs.
 */

// ── Types ──────────────────────────────────────────────────────────────

export interface LinkedGeneDefinition {
  id: string;
  name: string;
  alleles: [string, string]; // [dominant, recessive]
  phenotypeMap: Record<string, string>;
  colorMap: Record<string, string>;
}

export interface LinkedOrganism {
  id: string;
  /** Two chromosomes, each carrying alleles for all linked genes */
  chromosome1: Record<string, string>; // geneId → allele
  chromosome2: Record<string, string>;
}

export interface LinkedCrossResult {
  parents: [LinkedOrganism, LinkedOrganism];
  offspring: LinkedOrganism[];
  phenotypeCounts: Record<string, number>;
  genotypeCounts: Record<string, number>;
  total: number;
  recombinantCount: number;
  recombinationFrequency: number;
}

// ── Gene definitions (maize chromosome 9) ─────────────────────────────
// The classical plant linkage trio, from Creighton & McClintock (1931):
// three genes linked on maize chromosome 9, order C — Sh — Wx.

export const KERNEL_COLOR: LinkedGeneDefinition = {
  id: 'color',
  name: 'Aleurone',
  alleles: ['C', 'c'],
  phenotypeMap: {
    'CC': 'Purple', 'Cc': 'Purple',
    'cC': 'Purple', 'cc': 'Yellow',
  },
  colorMap: { 'Purple': '#5a2a6b', 'Yellow': '#e8c24a' },
};

export const KERNEL_SHAPE: LinkedGeneDefinition = {
  id: 'shape',
  name: 'Shape',
  alleles: ['Sh', 'sh'],
  phenotypeMap: {
    'ShSh': 'Plump', 'Shsh': 'Plump',
    'shSh': 'Plump', 'shsh': 'Shrunken',
  },
  colorMap: { 'Plump': '#e4d08a', 'Shrunken': '#a8874a' },
};

export const ENDOSPERM: LinkedGeneDefinition = {
  id: 'endo',
  name: 'Endosperm',
  alleles: ['Wx', 'wx'],
  phenotypeMap: {
    'WxWx': 'Starchy', 'Wxwx': 'Starchy',
    'wxWx': 'Starchy', 'wxwx': 'Waxy',
  },
  colorMap: { 'Starchy': '#f2e8c4', 'Waxy': '#d4a870' },
};

// ── Helper functions ───────────────────────────────────────────────────

export function makeLinkedOrganism(
  chrom1: Record<string, string>,
  chrom2: Record<string, string>,
  id?: string,
): LinkedOrganism {
  return {
    id: id ?? `lorg_${Math.random().toString(36).slice(2, 8)}`,
    chromosome1: { ...chrom1 },
    chromosome2: { ...chrom2 },
  };
}

/** Get phenotype for one gene */
function genoPhenotype(gene: LinkedGeneDefinition, a1: string, a2: string): string {
  const key = `${a1}${a2}`;
  return gene.phenotypeMap[key] ?? gene.phenotypeMap[`${a2}${a1}`] ?? 'Unknown';
}

/** Get phenotype string for display */
export function getLinkedPhenotype(org: LinkedOrganism, genes: LinkedGeneDefinition[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const gene of genes) {
    const a1 = org.chromosome1[gene.id];
    const a2 = org.chromosome2[gene.id];
    if (a1 !== undefined && a2 !== undefined) {
      result[gene.id] = genoPhenotype(gene, a1, a2);
    }
  }
  return result;
}

export function getLinkedPhenotypeLabel(org: LinkedOrganism, genes: LinkedGeneDefinition[]): string {
  const pheno = getLinkedPhenotype(org, genes);
  return genes.map(g => pheno[g.id] ?? '?').join(', ');
}

export function getLinkedGenotypeLabel(org: LinkedOrganism, genes: LinkedGeneDefinition[]): string {
  return genes.map(g => {
    const a1 = org.chromosome1[g.id] ?? '?';
    const a2 = org.chromosome2[g.id] ?? '?';
    return `${a1}/${a2}`;
  }).join(' ');
}

/** Check if an allele is dominant.
 *  Supports both Drosophila '+' notation and classical plant genetics
 *  (first character uppercase = dominant, e.g. 'C' vs 'c', 'Sh' vs 'sh'). */
function isDominant(allele: string): boolean {
  if (allele.endsWith('+')) return true;
  const c = allele[0];
  return c >= 'A' && c <= 'Z';
}

/** Check if organism is homozygous recessive for a gene */
export function isHomozygousRecessive(org: LinkedOrganism, geneId: string): boolean {
  return !isDominant(org.chromosome1[geneId]) && !isDominant(org.chromosome2[geneId]);
}

// ── Gamete generation with recombination ───────────────────────────────

/**
 * Generate a single gamete from a linked organism.
 * genes must be in chromosome order; recombFreqs[i] = RF between genes[i] and genes[i+1].
 * For two genes: recombFreqs has 1 element.
 * For three genes: recombFreqs has 2 elements.
 */
function makeGamete(
  org: LinkedOrganism,
  genes: LinkedGeneDefinition[],
  recombFreqs: number[],
  coincidence: number = 1,
  rng: () => number = Math.random,
): Record<string, string> {
  // Start with one chromosome chosen randomly
  const useChrom1 = rng() < 0.5;
  const source = useChrom1 ? org.chromosome1 : org.chromosome2;
  const other = useChrom1 ? org.chromosome2 : org.chromosome1;

  const gamete: Record<string, string> = {};

  // Determine crossover events between each consecutive gene pair
  const crossovers: boolean[] = [];
  for (let i = 0; i < recombFreqs.length; i++) {
    crossovers.push(rng() < recombFreqs[i]);
  }

  // For three-point: model interference via coincidence
  // If both single crossovers occurred, double crossover happens with prob = coincidence
  if (crossovers.length >= 2) {
    const bothCrossed = crossovers.every(c => c);
    if (bothCrossed) {
      // Double crossover: keep or remove based on coincidence
      if (rng() >= coincidence) {
        // Interference prevented one of them — randomly pick which to remove
        const removeIdx = rng() < 0.5 ? 0 : 1;
        crossovers[removeIdx] = false;
      }
    }
  }

  // Build gamete: track which chromosome we're reading from
  let currentIsSource = true;
  for (let i = 0; i < genes.length; i++) {
    if (i > 0 && crossovers[i - 1]) {
      currentIsSource = !currentIsSource;
    }
    const chrom = currentIsSource ? source : other;
    gamete[genes[i].id] = chrom[genes[i].id];
  }

  return gamete;
}

// ── Cross function ─────────────────────────────────────────────────────

export function linkedCross(
  parentA: LinkedOrganism,
  parentB: LinkedOrganism,
  genes: LinkedGeneDefinition[],
  recombFreqs: number[],
  n: number,
  coincidence: number = 1,
  rng: () => number = Math.random,
): LinkedCrossResult {
  const offspring: LinkedOrganism[] = [];
  const phenotypeCounts: Record<string, number> = {};
  const genotypeCounts: Record<string, number> = {};

  // Determine parental phenotype classes (from parentA gametes × testcross)
  // For RF calculation, we consider parentA's gamete types
  const parentalGameteA: Record<string, string> = {};
  const parentalGameteB: Record<string, string> = {};
  for (const g of genes) {
    parentalGameteA[g.id] = parentA.chromosome1[g.id];
    parentalGameteB[g.id] = parentA.chromosome2[g.id];
  }

  let recombinantCount = 0;

  for (let i = 0; i < n; i++) {
    const gameteA = makeGamete(parentA, genes, recombFreqs, coincidence, rng);
    const gameteB = makeGamete(parentB, genes, recombFreqs, coincidence, rng);

    const child = makeLinkedOrganism(gameteA, gameteB);
    offspring.push(child);

    const phenoLabel = getLinkedPhenotypeLabel(child, genes);
    phenotypeCounts[phenoLabel] = (phenotypeCounts[phenoLabel] ?? 0) + 1;

    const genoLabel = getLinkedGenotypeLabel(child, genes);
    genotypeCounts[genoLabel] = (genotypeCounts[genoLabel] ?? 0) + 1;

    // Check if gameteA is recombinant (differs from both parental configurations)
    const matchesParentalA = genes.every(g => gameteA[g.id] === parentalGameteA[g.id]);
    const matchesParentalB = genes.every(g => gameteA[g.id] === parentalGameteB[g.id]);
    if (!matchesParentalA && !matchesParentalB) {
      recombinantCount++;
    }
  }

  return {
    parents: [parentA, parentB],
    offspring,
    phenotypeCounts,
    genotypeCounts,
    total: n,
    recombinantCount,
    recombinationFrequency: recombinantCount / n,
  };
}

// ── Chi-square test ────────────────────────────────────────────────────

export function chiSquare(
  observed: number[],
  expected: number[],
): { statistic: number; df: number; pValue: number } {
  let stat = 0;
  for (let i = 0; i < observed.length; i++) {
    if (expected[i] === 0) continue;
    stat += ((observed[i] - expected[i]) ** 2) / expected[i];
  }
  const df = observed.length - 1;

  // Approximate p-value using chi-square CDF (Wilson-Hilferty approximation)
  const pValue = chiSquarePValue(stat, df);

  return { statistic: stat, df, pValue };
}

/** Approximate chi-square p-value */
function chiSquarePValue(x: number, df: number): number {
  if (df <= 0 || x <= 0) return 1;
  // Use regularized incomplete gamma function approximation
  // For curriculum purposes, we use a table-based approach for common df values
  const tables: Record<number, [number, number][]> = {
    1: [[3.841, 0.05], [6.635, 0.01], [10.828, 0.001]],
    2: [[5.991, 0.05], [9.210, 0.01], [13.816, 0.001]],
    3: [[7.815, 0.05], [11.345, 0.01], [16.266, 0.001]],
    4: [[9.488, 0.05], [13.277, 0.01], [18.467, 0.001]],
    5: [[11.070, 0.05], [15.086, 0.01], [20.515, 0.001]],
    6: [[12.592, 0.05], [16.812, 0.01], [22.458, 0.001]],
    7: [[14.067, 0.05], [18.475, 0.01], [24.322, 0.001]],
  };
  const table = tables[df];
  if (!table) return x > df * 3 ? 0.001 : 0.5;

  if (x < table[0][0]) return 0.5; // well above 0.05
  if (x < table[1][0]) return 0.05;
  if (x < table[2][0]) return 0.01;
  return 0.001;
}

// ── Three-point cross analysis ─────────────────────────────────────────

export interface ThreePointResult {
  geneOrder: string[];
  distances: [number, number]; // cM between gene1-gene2, gene2-gene3
  interference: number;
  coincidence: number;
  classCounts: {
    parental: number;
    singleI: number;   // single crossover region I
    singleII: number;  // single crossover region II
    doubleCO: number;  // double crossover
  };
}

/**
 * Analyze a three-point testcross. Offspring from AaBbCc × aabbcc.
 * Determines gene order, map distances, and interference.
 */
export function threePointAnalysis(
  offspring: LinkedOrganism[],
  genes: [LinkedGeneDefinition, LinkedGeneDefinition, LinkedGeneDefinition],
): ThreePointResult {
  const total = offspring.length;

  // Count phenotype classes based on testcross: read from chromosome1 (informative gamete)
  // In a testcross, chromosome2 is all recessive, so phenotype reflects chromosome1
  const classCounts: Record<string, number> = {};
  for (const off of offspring) {
    const key = genes.map(g => {
      const a1 = off.chromosome1[g.id];
      return isDominant(a1) ? '+' : '-';
    }).join('');
    classCounts[key] = (classCounts[key] ?? 0) + 1;
  }

  // Find parental classes (most frequent pair) and double crossover (least frequent pair)
  const entries = Object.entries(classCounts).sort((a, b) => b[1] - a[1]);

  // Parental = two most frequent classes
  const parentalClasses = entries.slice(0, 2);
  const parentalCount = parentalClasses.reduce((s, e) => s + e[1], 0);

  // Double crossover = two least frequent classes
  const dcoClasses = entries.slice(-2);
  const dcoCount = dcoClasses.reduce((s, e) => s + e[1], 0);

  // Determine gene order: the gene that switches in the double crossover is the MIDDLE gene
  // Compare parental to dco class — the allele that changes position indicates the middle gene
  const parentalPattern = parentalClasses[0][0]; // e.g., "+++"
  const dcoPattern = dcoClasses[dcoClasses.length - 1][0]; // e.g., "+-+"

  let middleIdx = 1; // default
  for (let i = 0; i < 3; i++) {
    // In a double crossover, only the middle gene flips relative to parental
    const parentalAllele = parentalPattern[i];
    const dcoAllele = dcoPattern[i];
    // Check if this gene is the one that differs
    const otherParentalSame = [0, 1, 2].filter(j => j !== i).every(j =>
      parentalPattern[j] === dcoPattern[j]
    );
    if (parentalAllele !== dcoAllele && otherParentalSame) {
      middleIdx = i;
      break;
    }
  }

  // Reorder genes: [first, middle, last]
  const geneOrder = [0, 1, 2].filter(i => i !== middleIdx);
  const orderedGenes = [genes[geneOrder[0]], genes[middleIdx], genes[geneOrder[1]]];
  const geneOrderNames = orderedGenes.map(g => g.id);

  // Classify offspring into single recombinant classes based on correct gene order
  // Region I: between gene1 and gene2 (middle)
  // Region II: between gene2 (middle) and gene3
  let singleI = 0;
  let singleII = 0;

  for (const off of offspring) {
    const pattern = orderedGenes.map(g => {
      const a1 = off.chromosome1[g.id];
      return isDominant(a1) ? '+' : '-';
    }).join('');

    // Determine the parental pattern in new order. We only need one parental
    // reference: the reciprocal parental gives the opposite booleans below,
    // which still satisfy the "all three equal" parental test.
    const pPattern = orderedGenes.map(g => {
      return parentalClasses[0][0].charAt(genes.indexOf(g));
    }).join('');

    // Classify by comparing each gene to one parental reference (pPattern).
    // m0/m1/m2 = does this offspring's allele at gene i match parental class 1?
    // - All three equal (all true OR all false) → parental (matches one of the two
    //   reciprocal parental gametes).
    // - Flanks agree but middle flips → DCO (m0===m2, m0!==m1).
    // - Break between gene 0 and gene 1 → singleI (m0!==m1, m1===m2).
    // - Break between gene 1 and gene 2 → singleII (m0===m1, m1!==m2).
    const m0 = pattern[0] === pPattern[0];
    const m1 = pattern[1] === pPattern[1];
    const m2 = pattern[2] === pPattern[2];

    if (m0 === m1 && m1 === m2) {
      // parental — counted via parentalCount above; nothing to do here
    } else if (m0 === m2 && m0 !== m1) {
      // DCO — counted via dcoCount above; nothing to do here
    } else if (m0 !== m1 && m1 === m2) {
      singleI++;
    } else if (m0 === m1 && m1 !== m2) {
      singleII++;
    }
  }

  // Map distances
  const distI = ((singleI + dcoCount) / total) * 100; // cM
  const distII = ((singleII + dcoCount) / total) * 100; // cM

  // Coincidence and interference
  const expectedDCO = (distI / 100) * (distII / 100) * total;
  const coincidence = expectedDCO > 0 ? dcoCount / expectedDCO : 0;
  const interference = 1 - coincidence;

  return {
    geneOrder: geneOrderNames,
    distances: [distI, distII],
    interference,
    coincidence,
    classCounts: {
      parental: parentalCount,
      singleI,
      singleII,
      doubleCO: dcoCount,
    },
  };
}

/**
 * Classify offspring from a three-point testcross into 8 phenotype classes.
 * Returns counts keyed by a pattern string like "+++", "++-", etc.
 */
export function classifyThreePoint(
  offspring: LinkedOrganism[],
  genes: [LinkedGeneDefinition, LinkedGeneDefinition, LinkedGeneDefinition],
): Record<string, number> {
  // Pre-seed all 2^3 = 8 possible class patterns to 0 so that classes with
  // zero observations (e.g. the rare DCO classes in a low-interference cross)
  // still appear in the output.
  const counts: Record<string, number> = {};
  for (let i = 0; i < 8; i++) {
    const key = [0, 1, 2].map(bit => ((i >> (2 - bit)) & 1) ? '+' : '-').join('');
    counts[key] = 0;
  }
  for (const off of offspring) {
    const key = genes.map(g => {
      const a1 = off.chromosome1[g.id];
      return isDominant(a1) ? '+' : '-';
    }).join('');
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}
