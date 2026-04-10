/** Tech tree definitions and unlock logic. */

export type TechId =
  | 'mass_selection'
  | 'controlled_cross'
  | 'pedigree'
  | 'marker_discovery'
  | 'mas'
  | 'diversity_dashboard'
  | 'genomic_prediction'
  | 'wild_germplasm'
  | 'hybrid_breeding'
  | 'mutagenesis'
  | 'gene_editing';

export interface Tech {
  id: TechId;
  name: string;
  tier: 1 | 2 | 3 | 4 | 5;
  /** Cost in cash to research and unlock this technique. */
  cost: number;
  requires: TechId[];
  description: string;
  /** One-line teaching moment shown when unlocked. */
  blurb: string;
}

export const TECHS: Tech[] = [
  {
    id: 'mass_selection',
    name: 'Mass selection',
    tier: 1,
    cost: 0,
    requires: [],
    description: 'Pick the best phenotypes; use them as parents.',
    blurb: 'Mass selection is the oldest breeding tool. Response = h² × selection differential.',
  },
  {
    id: 'controlled_cross',
    name: 'Controlled crosses',
    tier: 1,
    cost: 30,
    requires: [],
    description: 'Choose specific parent combinations to make labeled F1 families.',
    blurb: 'Knowing the parents lets you track inheritance, design pedigrees, and inbreed deliberately.',
  },
  {
    id: 'pedigree',
    name: 'Pedigree tracking',
    tier: 2,
    cost: 35,
    requires: ['controlled_cross'],
    description: 'Visualize ancestry of every line.',
    blurb: 'Pedigree records prevent unintentional inbreeding and reveal where alleles came from.',
  },
  {
    id: 'diversity_dashboard',
    name: 'Diversity dashboard',
    tier: 2,
    cost: 30,
    requires: ['mass_selection'],
    description: 'See He, F, and effective alleles over time.',
    blurb: 'Aggressive selection erodes diversity. Watch He fall and F rise — and feel the squeeze.',
  },
  {
    id: 'marker_discovery',
    name: 'Marker discovery',
    tier: 3,
    cost: 80,
    requires: ['diversity_dashboard'],
    description: 'Run a single-marker scan to find QTL associations.',
    blurb: 'A scan tests every marker for an effect on the trait. The big peaks are your friends.',
  },
  {
    id: 'mas',
    name: 'Marker-assisted selection',
    tier: 3,
    cost: 80,
    requires: ['marker_discovery'],
    description: 'Select on marker EBVs without phenotyping.',
    blurb: 'MAS lets you select before flowering — faster cycles, especially for hard-to-phenotype traits.',
  },
  {
    id: 'wild_germplasm',
    name: 'Wild germplasm collection',
    tier: 3,
    cost: 60,
    requires: ['diversity_dashboard'],
    description: 'Acquire wild relatives carrying novel alleles.',
    blurb: 'Wild relatives bring unique alleles — but expect linkage drag with the elite background.',
  },
  {
    id: 'hybrid_breeding',
    name: 'Hybrid breeding',
    tier: 4,
    cost: 80,
    requires: ['pedigree', 'controlled_cross'],
    description: 'Develop inbreds and produce F1 hybrids that exploit heterosis.',
    blurb: 'Crossing two complementary inbred lines yields F1 hybrids with vigor (heterosis) absent in the parents.',
  },
  {
    id: 'mutagenesis',
    name: 'Mutagenesis',
    tier: 4,
    cost: 100,
    requires: ['marker_discovery'],
    description: 'Treat a population with mutagen to create new alleles.',
    blurb: 'Most mutations are deleterious. Screen many to find the rare beneficial variant.',
  },
  {
    id: 'gene_editing',
    name: 'Gene editing (CRISPR)',
    tier: 5,
    cost: 180,
    requires: ['mas'],
    description: 'Force a known QTL allele in a chosen individual.',
    blurb: 'You can only edit what you have already discovered. Knowing the locus is the hard part.',
  },
  {
    id: 'genomic_prediction',
    name: 'Genomic prediction',
    tier: 5,
    cost: 200,
    requires: ['mas'],
    description: 'Predict breeding values from whole-genome markers (ridge regression).',
    blurb: 'When marker effects are small and many, GBLUP-style prediction beats single-marker MAS.',
  },
];

export const TECHS_BY_ID: Record<TechId, Tech> = Object.fromEntries(
  TECHS.map((t) => [t.id, t])
) as Record<TechId, Tech>;

export function canUnlock(tech: Tech, unlocked: Set<TechId>, cash: number): boolean {
  if (unlocked.has(tech.id)) return false;
  if (cash < tech.cost) return false;
  return tech.requires.every((r) => unlocked.has(r));
}
