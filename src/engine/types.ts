// Pure types for the genetics engine. No DOM, no React.

export type LocusType = 'mendelian' | 'qtl' | 'marker' | 'regulatory';

export interface Locus {
  id: string;
  chromosome: number;
  /** position in centiMorgans along the chromosome */
  position: number;
  alleles: string[];
  type: LocusType;
}

export interface Chromosome {
  id: number;
  /** total length in cM */
  length: number;
  loci: Locus[];
}

export interface GenomeMap {
  species: string;
  chromosomes: Chromosome[];
  /** convenience: locusId -> Locus */
  lociById: Map<string, Locus>;
}

/** A haplotype maps locusId -> allele symbol on a single chromatid set. */
export type Haplotype = Map<string, string>;

export interface Genotype {
  /** diploid: [maternal, paternal] */
  haplotypes: [Haplotype, Haplotype];
  species: string;
}

export interface Individual {
  id: string;
  genotype: Genotype;
  phenotype: Map<string, number>;
  parents: [string, string] | null;
  generation: number;
  sex?: 'F' | 'M' | 'H'; // H = hermaphrodite (default for plants)
  isAlive: boolean;
  /** Optional sibling group identifier. Set when offspring come from a known
   *  controlled cross; siblings share the same familyId. */
  familyId?: string;
}

export type DominanceMode = 'complete' | 'incomplete' | 'codominant';

export interface QualitativeTrait {
  name: string;
  displayName: string;
  type: 'qualitative';
  locus: string;
  dominantAllele: string;
  dominance: DominanceMode;
  /** display values for the three genotypic classes */
  values: { dominantHom: number; het: number; recessiveHom: number };
}

export interface QuantitativeTrait {
  name: string;
  displayName: string;
  type: 'quantitative';
  /** narrow-sense h² (for calibrating env variance) */
  heritability: number;
  loci: string[];
  /** locusId -> additive effect (per copy of "+") */
  effects: Map<string, number>;
  /** locusId -> dominance deviation added at heterozygotes (default 0) */
  dominance: Map<string, number>;
  /** locusId -> "favorable" allele symbol */
  favorable: Map<string, string>;
  baseline: number;
  /** computed at construction so phenotype noise hits target h² */
  environmentalVariance: number;
}

export type Trait = QualitativeTrait | QuantitativeTrait;

export interface RNG {
  (): number; // uniform [0,1)
}
