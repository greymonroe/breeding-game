import type { TechId } from '../game/progression';
import type { ChallengeDefinition } from './types';

// ─── Tech Unlock Challenges ──────────────────────────────────────────

const punnettSquare: ChallengeDefinition = {
  id: 'punnett_square',
  type: 'tech_unlock',
  techId: 'controlled_cross',
  title: 'Punnett Square',
  description: 'Predict the offspring ratios from a cross between two plants.',
  difficulty: 1,
  generate(ctx) {
    // Find an Rr plant in the nursery, or fabricate one
    const rrPlant = ctx.nurseryPlants.find((p) => {
      const a = p.genotype.haplotypes[0].get('COLOR');
      const b = p.genotype.haplotypes[1].get('COLOR');
      return (a === 'R' && b === 'r') || (a === 'r' && b === 'R');
    });
    const parentGenotype = rrPlant ? 'Rr' : 'Rr'; // always Rr for this challenge
    return {
      definitionId: this.id,
      data: {
        parentGenotype,
        parentColor: 'red',
        question: 'If you self-pollinate this red (Rr) plant, what fraction of the offspring will be WHITE?',
        hint: 'R is dominant over r. A plant needs two copies of r to be white.',
        alleles: ['R', 'r'],
      },
      answer: { fraction: 0.25, ratio: '3:1', whiteCount: 1, totalCount: 4 },
    };
  },
  validate(_instance, playerAnswer) {
    const ans = playerAnswer as { fraction?: number; grid?: string[][] };
    const correct = ans.fraction !== undefined && Math.abs(ans.fraction - 0.25) < 0.01;
    return {
      correct,
      explanation: correct
        ? 'Correct! An Rr x Rr cross produces 1 RR : 2 Rr : 1 rr offspring. Since R is dominant, 3/4 are red and 1/4 are white. This is Mendel\'s famous 3:1 ratio.'
        : 'Not quite. When you self an Rr plant, each parent contributes R or r with equal probability. The offspring are: RR (red), Rr (red), Rr (red), rr (white) = 1/4 white.',
      detail: 'RR (25%) + Rr (50%) + rr (25%) = 3 red : 1 white',
    };
  },
};

const manhattanPlot: ChallengeDefinition = {
  id: 'manhattan_plot',
  type: 'tech_unlock',
  techId: 'marker_discovery',
  title: 'Find the QTL',
  description: 'Scan a genome-wide association plot and identify the significant peaks.',
  difficulty: 2,
  generate(ctx) {
    // Generate effect sizes for all loci across all chromosomes
    const loci: Array<{ id: string; chr: number; pos: number; effect: number; isQtl: boolean }> = [];
    for (const chr of ctx.map.chromosomes) {
      for (const loc of chr.loci) {
        const isQtl = loc.type === 'qtl';
        // Simulate effect: QTLs get real effect, markers get noise
        const effect = isQtl
          ? 1.5 + ctx.rng() * 3 // QTLs: 1.5 - 4.5
          : ctx.rng() * 0.8;     // noise: 0 - 0.8
        loci.push({ id: loc.id, chr: chr.id, pos: loc.position, effect, isQtl });
      }
    }
    // Pick a target QTL (one of the major yield QTLs)
    const majorQtls = loci.filter((l) => l.isQtl && l.effect > 3);
    const target = majorQtls.length > 0 ? majorQtls[0] : loci.find((l) => l.isQtl)!;
    return {
      definitionId: this.id,
      data: {
        loci,
        chromosomes: ctx.map.chromosomes.map((c) => ({ id: c.id, length: c.length })),
        question: 'Click on the highest peak — the marker most strongly associated with yield.',
        hint: 'Real QTLs produce tall peaks. Background noise produces small bumps.',
      },
      answer: { targetId: target.id, targetChr: target.chr, targetPos: target.pos },
    };
  },
  validate(instance, playerAnswer) {
    const ans = playerAnswer as { locusId: string };
    const target = instance.answer as { targetId: string; targetChr: number; targetPos: number };
    const loci = instance.data.loci as Array<{ id: string; chr: number; pos: number; isQtl: boolean }>;
    const clicked = loci.find((l) => l.id === ans.locusId);
    const correct = clicked?.isQtl === true;
    return {
      correct,
      explanation: correct
        ? 'You found a QTL! This peak represents a real association between a DNA marker and yield. The height reflects how strongly this genomic region affects the trait.'
        : 'That peak was just noise — random variation that looks like a signal. Real QTLs produce the tallest, most consistent peaks. Try looking for the highest point across all chromosomes.',
      detail: correct
        ? `QTL ${ans.locusId} on chromosome ${clicked!.chr} at ${clicked!.pos} cM`
        : `The strongest QTL was ${target.targetId} on chromosome ${target.targetChr}`,
    };
  },
};

const guideRNA: ChallengeDefinition = {
  id: 'guide_rna',
  type: 'tech_unlock',
  techId: 'gene_editing',
  title: 'Design a CRISPR Guide RNA',
  description: 'Select the right 20bp guide sequence next to a PAM site to edit a yield gene.',
  difficulty: 3,
  generate(ctx) {
    // Generate a fake DNA sequence around a target locus with PAM sites
    const bases = ['A', 'T', 'G', 'C'];
    const rng = ctx.rng;
    const seqLen = 80;
    const seq: string[] = [];
    for (let i = 0; i < seqLen; i++) seq.push(bases[Math.floor(rng() * 4)]);
    // Insert PAM sites (NGG) at a few positions
    const pamPositions = [15, 35, 55];
    for (const p of pamPositions) {
      seq[p] = bases[Math.floor(rng() * 4)];
      seq[p + 1] = 'G';
      seq[p + 2] = 'G';
    }
    // The correct guide is the 20bp UPSTREAM of one of the PAMs
    const targetPam = pamPositions[1]; // PAM at position 35
    const guideStart = targetPam - 20;
    const guideEnd = targetPam;
    return {
      definitionId: this.id,
      data: {
        sequence: seq.join(''),
        pamPositions,
        targetLocus: 'Y1',
        question: 'Select a 20bp guide RNA sequence immediately upstream of a PAM site (NGG) to target the Y1 yield gene.',
        hint: 'CRISPR-Cas9 requires a PAM sequence (NGG) on the target DNA. The guide RNA binds the 20 bases just upstream of the PAM.',
      },
      answer: { guideStart, guideEnd, pamPosition: targetPam },
    };
  },
  validate(instance, playerAnswer) {
    const ans = playerAnswer as { start: number; end: number };
    const data = instance.data as { pamPositions: number[]; sequence: string };
    // Check if the selected region is 20bp and ends at a PAM
    const len = ans.end - ans.start;
    const validLength = len === 20;
    const adjacentPam = data.pamPositions.includes(ans.end);
    const correct = validLength && adjacentPam;
    return {
      correct,
      explanation: correct
        ? 'Excellent guide design! Your 20bp sequence is immediately upstream of an NGG PAM site. Cas9 will bind here and create a double-strand break, allowing you to edit the allele at this locus.'
        : !validLength
          ? `The guide RNA must be exactly 20 bases long. You selected ${len} bases.`
          : 'Your guide is not adjacent to a PAM site (NGG). Cas9 cannot bind without a PAM — it\'s like a molecular address that tells the enzyme where to cut.',
      detail: 'CRISPR-Cas9 scans DNA for NGG sequences, then checks if the upstream 20bp match the guide RNA. No PAM = no cutting.',
    };
  },
};

// ─── Pedigree Trace Challenge ────────────────────────────────────────

const pedigreeTrace: ChallengeDefinition = {
  id: 'pedigree_trace',
  type: 'tech_unlock',
  techId: 'pedigree',
  title: 'Trace the Carrier',
  description: 'Follow a recessive allele through 3 generations to find the hidden carrier.',
  difficulty: 1,
  generate(ctx) {
    // Build a 3-generation pedigree where one grandparent is Rr and one grandchild is rr.
    // Player must identify which parent is the carrier (Rr).
    const rng = ctx.rng;
    // Generation 1 (grandparents): A (RR) × B (Rr)
    // Generation 2 (parents): C could be RR or Rr (50/50)
    // Generation 3: if C is Rr and mates with Rr → can produce rr offspring
    const carrierParent = rng() < 0.5 ? 'C' : 'D';
    const pedigree = {
      A: { genotype: 'RR', color: 'red', gen: 1 },
      B: { genotype: 'Rr', color: 'red', gen: 1 },
      C: { genotype: carrierParent === 'C' ? 'Rr' : 'RR', color: 'red', gen: 2, parents: ['A', 'B'] },
      D: { genotype: carrierParent === 'D' ? 'Rr' : 'RR', color: 'red', gen: 2, parents: ['A', 'B'] },
      E: { genotype: 'Rr', color: 'red', gen: 2 }, // unrelated carrier
      F: { genotype: 'rr', color: 'white', gen: 3, parents: [carrierParent, 'E'] },
    };
    return {
      definitionId: this.id,
      data: {
        pedigree,
        question: 'A white (rr) offspring appeared in generation 3. Both parents look red. Which parent must be a carrier (Rr)?',
        hint: 'For a white (rr) offspring, both parents must contribute an r allele. One parent (E) is known Rr. The other parent got r from grandparent B (who is Rr).',
        options: ['C', 'D'],
      },
      answer: { carrier: carrierParent },
    };
  },
  validate(instance, playerAnswer) {
    const ans = playerAnswer as { carrier: string };
    const correct = ans.carrier === (instance.answer as { carrier: string }).carrier;
    return {
      correct,
      explanation: correct
        ? 'Correct! Since the white offspring is rr, both parents must carry at least one r allele. You traced the hidden r allele through the pedigree — this is exactly how genetic counselors identify carriers.'
        : 'Not quite. The white offspring is rr, so both parents must carry r. Trace backward: grandparent B is Rr, and only one of their children inherited the r allele.',
    };
  },
};

// ─── Bottleneck Simulation Challenge ─────────────────────────────────

const bottleneck: ChallengeDefinition = {
  id: 'bottleneck_sim',
  type: 'tech_unlock',
  techId: 'diversity_dashboard',
  title: 'Bottleneck Simulation',
  description: 'See what happens to allele diversity when you select only 2 parents from 20.',
  difficulty: 1,
  generate(ctx) {
    // Create a mock population with 10 different alleles at a locus
    const rng = ctx.rng;
    const popSize = 20;
    const alleles = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    const population: Array<{ id: number; allele1: string; allele2: string }> = [];
    for (let i = 0; i < popSize; i++) {
      population.push({
        id: i + 1,
        allele1: alleles[Math.floor(rng() * alleles.length)],
        allele2: alleles[Math.floor(rng() * alleles.length)],
      });
    }
    // Count unique alleles in full population
    const allAlleles = new Set(population.flatMap((p) => [p.allele1, p.allele2]));
    return {
      definitionId: this.id,
      data: {
        population,
        totalAlleles: allAlleles.size,
        question: `This population has ${allAlleles.size} different alleles at one locus. If you select only plants #1 and #2 as parents, how many alleles will remain?`,
        hint: 'Count the unique alleles carried by plants #1 and #2 combined. All other alleles will be lost forever.',
      },
      answer: {
        remainingAlleles: new Set([
          population[0].allele1, population[0].allele2,
          population[1].allele1, population[1].allele2,
        ]).size,
      },
    };
  },
  validate(instance, playerAnswer) {
    const ans = playerAnswer as { count: number };
    const expected = (instance.answer as { remainingAlleles: number }).remainingAlleles;
    const correct = ans.count === expected;
    return {
      correct,
      explanation: correct
        ? `Correct! Only ${expected} alleles survive the bottleneck. The other ${(instance.data as { totalAlleles: number }).totalAlleles - expected} are lost forever. This is why maintaining a broad genetic base matters — every time you cull a plant, you risk losing unique alleles.`
        : `Not quite. Count the unique alleles in the two selected plants. The answer is ${expected}. A bottleneck from 20 to 2 plants can lose most of the population's genetic diversity in a single generation.`,
    };
  },
};

// ─── MAS Ranking Challenge ───────────────────────────────────────────

const masRanking: ChallengeDefinition = {
  id: 'mas_ranking',
  type: 'tech_unlock',
  techId: 'mas',
  title: 'Marker-Assisted Ranking',
  description: 'Rank seedlings by their marker genotypes before phenotyping. Can markers predict yield?',
  difficulty: 2,
  generate(ctx) {
    const rng = ctx.rng;
    // Generate 8 seedlings with 3 marker loci, each +/+ or +/- or -/-
    const seedlings: Array<{ id: string; markers: Record<string, number>; trueYield: number }> = [];
    for (let i = 0; i < 8; i++) {
      const m1 = Math.floor(rng() * 3); // 0, 1, 2 copies of +
      const m2 = Math.floor(rng() * 3);
      const m3 = Math.floor(rng() * 3);
      const genetic = 50 + m1 * 3 + m2 * 2 + m3 * 1.5;
      const noise = (rng() - 0.5) * 6;
      seedlings.push({
        id: `S${i + 1}`,
        markers: { Y1: m1, Y7: m2, Y15: m3 },
        trueYield: Math.round((genetic + noise) * 10) / 10,
      });
    }
    // Correct ranking: by marker score (m1*3 + m2*2 + m3*1.5)
    const markerRanked = [...seedlings].sort((a, b) => {
      const sa = a.markers.Y1 * 3 + a.markers.Y7 * 2 + a.markers.Y15 * 1.5;
      const sb = b.markers.Y1 * 3 + b.markers.Y7 * 2 + b.markers.Y15 * 1.5;
      return sb - sa;
    });
    return {
      definitionId: this.id,
      data: {
        seedlings,
        question: 'Rank these 8 seedlings from best to worst using their marker genotypes. You have 3 markers: Y1 (major), Y7 (major), Y15 (major). More + alleles = higher expected yield.',
        hint: 'Y1 has the largest effect. Weight it most heavily. A seedling with +/+ at Y1 is worth more than +/+ at Y15.',
      },
      answer: { topThree: markerRanked.slice(0, 3).map((s) => s.id) },
    };
  },
  validate(instance, playerAnswer) {
    const ans = playerAnswer as { topThree: string[] };
    const expected = (instance.answer as { topThree: string[] }).topThree;
    const overlap = ans.topThree.filter((id) => expected.includes(id)).length;
    const correct = overlap >= 2; // 2 of 3 correct is passing
    return {
      correct,
      explanation: correct
        ? `Good selection! You identified ${overlap}/3 of the best seedlings by markers alone — without waiting for phenotype data. This is the power of MAS: select at the seedling stage, save time and field space.`
        : `The top 3 by marker score were ${expected.join(', ')}. Weight the markers by their effect sizes: Y1 (3x) > Y7 (2x) > Y15 (1.5x). MAS lets you predict yield before the plant even flowers.`,
    };
  },
};

// ─── Backcross Scheme Challenge ──────────────────────────────────────

const backcrossScheme: ChallengeDefinition = {
  id: 'backcross_scheme',
  type: 'tech_unlock',
  techId: 'wild_germplasm',
  title: 'Backcross Breeding Plan',
  description: 'Design a scheme to introgress disease resistance from a wild relative while recovering elite yield.',
  difficulty: 2,
  generate() {
    return {
      definitionId: this.id,
      data: {
        question: 'You have an elite line (high yield, susceptible DR=r/r) and a wild accession (low yield, resistant DR=R/R). How many backcross generations to the elite parent do you need before selfing to recover >87% elite background?',
        hint: 'Each backcross generation recovers ~50% of the remaining wild genome. After BC1: 75% elite. BC2: 87.5%. BC3: 93.75%.',
        options: [1, 2, 3, 4],
      },
      answer: { generations: 2 },
    };
  },
  validate(_instance, playerAnswer) {
    const ans = playerAnswer as { generations: number };
    const correct = ans.generations === 2;
    return {
      correct,
      explanation: correct
        ? 'Correct! After 2 backcross generations (BC2), you recover ~87.5% of the elite genome. Then self the BC2F1 to fix the DR=R allele. This is the classic introgression pipeline — but watch out for linkage drag near DR!'
        : 'After each backcross to the elite parent, you recover half the remaining wild genome. BC1 = 75% elite, BC2 = 87.5%, BC3 = 93.75%. Two backcrosses is the minimum for >87% recovery.',
    };
  },
};

// ─── Testcross/Hybrid Challenge ──────────────────────────────────────

const testcross: ChallengeDefinition = {
  id: 'testcross_hybrid',
  type: 'tech_unlock',
  techId: 'hybrid_breeding',
  title: 'Find the Best Hybrid',
  description: 'Cross 4 inbred lines in all combinations and identify which F1 hybrid yields the most.',
  difficulty: 2,
  generate(ctx) {
    const rng = ctx.rng;
    // 4 inbred lines with different allele complements
    const lines = ['Line A', 'Line B', 'Line C', 'Line D'];
    const lineValues = [55, 52, 48, 50]; // inbred yields (depressed)
    // Heterosis depends on genetic distance — more complementary = more heterosis
    const heterosis: Record<string, number> = {
      'A×B': 5, 'A×C': 12, 'A×D': 8,
      'B×C': 9, 'B×D': 6, 'C×D': 14,
    };
    const crosses: Array<{ cross: string; f1Yield: number }> = [];
    for (let i = 0; i < lines.length; i++) {
      for (let j = i + 1; j < lines.length; j++) {
        const key = `${lines[i][5]}×${lines[j][5]}`;
        const midparent = (lineValues[i] + lineValues[j]) / 2;
        const h = heterosis[key] ?? 5;
        const noise = (rng() - 0.5) * 3;
        crosses.push({
          cross: `${lines[i]} × ${lines[j]}`,
          f1Yield: Math.round((midparent + h + noise) * 10) / 10,
        });
      }
    }
    const best = crosses.reduce((a, b) => (a.f1Yield > b.f1Yield ? a : b));
    return {
      definitionId: this.id,
      data: {
        lines: lines.map((l, i) => ({ name: l, yield: lineValues[i] })),
        crosses,
        question: 'Which F1 hybrid cross produces the highest yield? Heterosis (hybrid vigor) comes from combining complementary alleles from genetically distant parents.',
        hint: 'The best hybrid isn\'t always from the two highest-yielding parents. Heterosis depends on genetic complementarity — crossing genetically distant lines gives the biggest boost.',
      },
      answer: { bestCross: best.cross },
    };
  },
  validate(instance, playerAnswer) {
    const ans = playerAnswer as { bestCross: string };
    const expected = (instance.answer as { bestCross: string }).bestCross;
    const correct = ans.bestCross === expected;
    return {
      correct,
      explanation: correct
        ? `Correct! ${expected} produced the highest F1 yield due to maximum heterosis. The parents are genetically complementary — their different favorable alleles combine in the hybrid, and dominance at many loci boosts the F1 above either parent.`
        : `The best hybrid was ${expected}. Remember: heterosis comes from genetic distance, not parent yield. Two mediocre-looking inbreds can produce an outstanding hybrid if they carry different favorable alleles.`,
    };
  },
};

// ─── Mutant Screen Challenge ─────────────────────────────────────────

const mutantScreen: ChallengeDefinition = {
  id: 'mutant_screen',
  type: 'tech_unlock',
  techId: 'mutagenesis',
  title: 'Mutant Screen',
  description: 'Find the rare beneficial mutant in a field of 50 mutagenized plants.',
  difficulty: 2,
  generate(ctx) {
    const rng = ctx.rng;
    const plants: Array<{ id: number; yield: number; mutant: boolean; mutationType: string }> = [];
    const beneficialIdx = Math.floor(rng() * 50);
    for (let i = 0; i < 50; i++) {
      let yld: number;
      let mutationType: string;
      if (i === beneficialIdx) {
        yld = 68 + rng() * 5; // clearly above average
        mutationType = 'beneficial';
      } else if (rng() < 0.3) {
        yld = 40 + rng() * 10; // deleterious
        mutationType = 'deleterious';
      } else {
        yld = 52 + rng() * 8; // neutral / wild-type range
        mutationType = 'neutral';
      }
      plants.push({ id: i + 1, yield: Math.round(yld * 10) / 10, mutant: i === beneficialIdx, mutationType });
    }
    return {
      definitionId: this.id,
      data: {
        plants,
        question: 'This field of 50 mutagenized plants contains mostly neutral or deleterious mutations. Find the ONE plant with a beneficial mutation (highest yield).',
        hint: 'Most mutations are harmful or neutral. The beneficial mutant will stand out with clearly higher yield than the population average (~55).',
        avgYield: Math.round(plants.reduce((s, p) => s + p.yield, 0) / plants.length * 10) / 10,
      },
      answer: { plantId: beneficialIdx + 1 },
    };
  },
  validate(instance, playerAnswer) {
    const ans = playerAnswer as { plantId: number };
    const expected = (instance.answer as { plantId: number }).plantId;
    const correct = ans.plantId === expected;
    const plants = (instance.data as { plants: Array<{ id: number; yield: number }> }).plants;
    const chosen = plants.find((p) => p.id === ans.plantId);
    return {
      correct,
      explanation: correct
        ? `You found the beneficial mutant! Plant #${expected} has a gain-of-function mutation that increased yield. In real mutagenesis, you screen thousands of plants to find one winner — most mutations break things rather than improve them.`
        : `Plant #${ans.plantId} (yield ${chosen?.yield.toFixed(1)}) was ${chosen && chosen.yield < 50 ? 'a deleterious mutant' : 'in the normal range'}. The beneficial mutant was #${expected} (yield ${plants.find((p) => p.id === expected)?.yield.toFixed(1)}). Mutagenesis is a numbers game — screen many, find few.`,
    };
  },
};

// ─── Genomic Prediction Fit Challenge ────────────────────────────────

const genomicFit: ChallengeDefinition = {
  id: 'genomic_fit',
  type: 'tech_unlock',
  techId: 'genomic_prediction',
  title: 'Fit the Prediction Model',
  description: 'Adjust marker effects to predict yield from genotype data. Minimize the prediction error.',
  difficulty: 3,
  generate(ctx) {
    const rng = ctx.rng;
    // 12 training plants with 4 markers and known yields
    const trueEffects = [2.5, 1.5, 1.0, 0.5]; // marker effects
    const plants: Array<{ id: string; markers: number[]; actualYield: number }> = [];
    for (let i = 0; i < 12; i++) {
      const markers = [0, 1, 2].map(() => Math.floor(rng() * 3)); // 0, 1, 2 allele copies
      markers.push(Math.floor(rng() * 3));
      const genetic = 50 + markers.reduce((s, m, j) => s + m * trueEffects[j], 0);
      const noise = (rng() - 0.5) * 4;
      plants.push({
        id: `P${i + 1}`,
        markers,
        actualYield: Math.round((genetic + noise) * 10) / 10,
      });
    }
    return {
      definitionId: this.id,
      data: {
        plants,
        markerNames: ['Y1', 'Y7', 'Y15', 'Y2'],
        question: 'Adjust the effect size for each marker to minimize the difference between predicted and actual yield. The baseline yield is 50.',
        hint: 'Start by looking at which markers the highest-yielding plants share. Markers with bigger true effects will show stronger correlations with yield.',
        baseline: 50,
      },
      answer: { trueEffects },
    };
  },
  validate(instance, playerAnswer) {
    const ans = playerAnswer as { effects: number[] };
    const plants = (instance.data as { plants: Array<{ markers: number[]; actualYield: number }> }).plants;
    const baseline = 50;
    // Calculate R-squared with player's effects
    const predictions = plants.map((p) => baseline + p.markers.reduce((s, m, j) => s + m * (ans.effects[j] ?? 0), 0));
    const actuals = plants.map((p) => p.actualYield);
    const meanActual = actuals.reduce((s, v) => s + v, 0) / actuals.length;
    const ssRes = actuals.reduce((s, v, i) => s + (v - predictions[i]) ** 2, 0);
    const ssTot = actuals.reduce((s, v) => s + (v - meanActual) ** 2, 0);
    const rSquared = 1 - ssRes / ssTot;
    const correct = rSquared > 0.4;
    return {
      correct,
      explanation: correct
        ? `Great model! R² = ${rSquared.toFixed(2)} — your marker effects explain ${Math.round(rSquared * 100)}% of yield variation. This is the core of genomic prediction: estimate allele effects from training data, then predict breeding values for untested individuals.`
        : `R² = ${rSquared.toFixed(2)} — the model needs to explain at least 40% of variation (R² > 0.4). Try adjusting: markers that high-yielding plants share in common should have larger positive effects.`,
      detail: `Your effects: [${ans.effects.map((e) => e.toFixed(1)).join(', ')}]. R² = ${rSquared.toFixed(3)}`,
    };
  },
};

// ─── Registries ─────────────────────────────────────────────────────

/** All tech unlock challenges, keyed by techId. */
export const TECH_CHALLENGES: Partial<Record<TechId, ChallengeDefinition>> = {
  controlled_cross: punnettSquare,
  pedigree: pedigreeTrace,
  diversity_dashboard: bottleneck,
  marker_discovery: manhattanPlot,
  mas: masRanking,
  wild_germplasm: backcrossScheme,
  hybrid_breeding: testcross,
  mutagenesis: mutantScreen,
  gene_editing: guideRNA,
  genomic_prediction: genomicFit,
};

// ALL_CHALLENGES populated after BONUS_CHALLENGES below

/** Bonus challenge pool (to be expanded in Phase 5). */
export const BONUS_CHALLENGES: ChallengeDefinition[] = [
  {
    id: 'bonus_color_ratio',
    type: 'bonus',
    title: 'Quick Quiz: Predict the Ratio',
    description: 'A farmer asks you to predict offspring colors.',
    reward: 50,
    difficulty: 1,
    generate() {
      return {
        definitionId: 'bonus_color_ratio',
        data: {
          question: 'You self-pollinate a red flower plant that is heterozygous (Rr). What ratio of red to white flowers do you expect in the offspring?',
          options: ['1:1 (half red, half white)', '3:1 (three red, one white)', 'All red', '1:3 (one red, three white)'],
          hint: 'R is completely dominant over r. Work out the Punnett square for Rr × Rr.',
        },
        answer: '3:1 (three red, one white)',
      };
    },
    validate(_instance, playerAnswer) {
      const ans = (playerAnswer as { answer: string }).answer;
      const correct = ans === '3:1 (three red, one white)';
      return {
        correct,
        explanation: correct
          ? 'Correct! Rr × Rr gives 1 RR : 2 Rr : 1 rr. Since R is dominant, 3/4 are red and 1/4 are white = 3:1 ratio.'
          : 'The answer is 3:1. An Rr × Rr cross produces 1/4 RR + 1/2 Rr + 1/4 rr. With complete dominance, RR and Rr both look red.',
      };
    },
  },
  {
    id: 'bonus_best_parent',
    type: 'bonus',
    title: 'Quick Quiz: Choose the Better Parent',
    description: 'Two plants look identical — which makes a better parent?',
    reward: 75,
    difficulty: 1,
    generate() {
      return {
        definitionId: 'bonus_best_parent',
        data: {
          question: 'Two red plants have the same yield (62). Plant A is RR (homozygous) and Plant B is Rr (heterozygous). Which is the better parent if you want ALL offspring to be red?',
          options: ['Plant A (RR) — all offspring guaranteed red', 'Plant B (Rr) — more genetic diversity', 'Both equally good'],
          hint: 'Think about what happens when you cross each plant with another red plant.',
        },
        answer: 'Plant A (RR) — all offspring guaranteed red',
      };
    },
    validate(_instance, playerAnswer) {
      const ans = (playerAnswer as { answer: string }).answer;
      const correct = ans === 'Plant A (RR) — all offspring guaranteed red';
      return {
        correct,
        explanation: correct
          ? 'Right! RR can only pass R alleles, so all offspring will carry at least one R and be red. Rr has a 50% chance of passing r, which could produce white offspring if the other parent also carries r.'
          : 'Plant A (RR) is better for this goal. An RR plant can only contribute R gametes, guaranteeing red offspring. An Rr plant could pass r, leading to white segregants.',
      };
    },
  },
  {
    id: 'bonus_offtypes',
    type: 'bonus',
    title: 'Diagnose the Off-Types',
    description: 'A farmer reports unexpected white plants in your red variety.',
    reward: 100,
    difficulty: 2,
    generate() {
      return {
        definitionId: 'bonus_offtypes',
        data: {
          question: 'You released a red variety, but farmers report ~25% white plants in their fields. What is the most likely explanation?',
          options: [
            'The released plant was heterozygous (Rr) at the COLOR locus',
            'Environmental stress caused the color change',
            'A mutation occurred in the field',
            'Seed contamination from another variety',
          ],
          hint: '25% is a very specific number. What genetic cross produces a 3:1 ratio?',
        },
        answer: 'The released plant was heterozygous (Rr) at the COLOR locus',
      };
    },
    validate(_instance, playerAnswer) {
      const ans = (playerAnswer as { answer: string }).answer;
      const correct = ans === 'The released plant was heterozygous (Rr) at the COLOR locus';
      return {
        correct,
        explanation: correct
          ? 'Exactly! A 3:1 ratio (75% red : 25% white) is the hallmark of a heterozygous parent self-pollinating. The variety was Rr, not RR. This is why uniformity testing before release is critical — heterozygous varieties segregate in farmers\' fields.'
          : 'The ~25% white ratio is a dead giveaway for Mendelian segregation. When an Rr plant self-pollinates, it produces 3 red : 1 white offspring. The variety was released before it was fully homozygous.',
      };
    },
  },
];

/** All challenge definitions by ID (tech + bonus). */
export const ALL_CHALLENGES: Record<string, ChallengeDefinition> = {};
for (const ch of Object.values(TECH_CHALLENGES)) {
  if (ch) ALL_CHALLENGES[ch.id] = ch;
}
for (const ch of BONUS_CHALLENGES) {
  ALL_CHALLENGES[ch.id] = ch;
}
