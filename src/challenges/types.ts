import type { TechId } from '../game/progression';

export type ChallengeType = 'tech_unlock' | 'bonus' | 'diagnostic';

/** Static definition of a challenge — lives in the registry. */
export interface ChallengeDefinition {
  id: string;
  type: ChallengeType;
  /** Which tech this challenge gates (tech_unlock only). */
  techId?: TechId;
  title: string;
  /** Brief description shown before starting. */
  description: string;
  /** Cash reward for bonus/diagnostic challenges. */
  reward?: number;
  difficulty: 1 | 2 | 3;
  /**
   * Generate a concrete problem instance from the current game state.
   * The snapshot is a read-only slice of the Zustand store.
   */
  generate: (ctx: ChallengeContext) => ChallengeInstance;
  /**
   * Validate the player's answer against the correct answer.
   * Returns explanation text shown to the player.
   */
  validate: (instance: ChallengeInstance, playerAnswer: unknown) => ChallengeResult;
}

/** Read-only game state slice passed to challenge generators. */
export interface ChallengeContext {
  nurseryPlants: Array<{
    id: string;
    genotype: { haplotypes: [Map<string, string>, Map<string, string>] };
    phenotype: Map<string, number>;
    parents: [string, string] | null;
  }>;
  season: number;
  map: {
    chromosomes: Array<{
      id: number;
      length: number;
      loci: Array<{ id: string; position: number; alleles: string[]; type: string }>;
    }>;
  };
  markers: { associations: Map<string, unknown> };
  rng: () => number;
}

/** A concrete problem instance with generated data and correct answer. */
export interface ChallengeInstance {
  definitionId: string;
  /** Challenge-specific data (genotypes, plants, sequences, etc.) */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  /** The correct answer (opaque to the framework, interpreted by validate). */
  answer: unknown;
}

export interface ChallengeResult {
  correct: boolean;
  /** Shown to the player after submission — teaches the concept. */
  explanation: string;
  /** Optional detailed breakdown (e.g., "Expected 3:1, you said 1:1"). */
  detail?: string;
}

/** Stored per-challenge completion record. */
export interface ChallengeCompletion {
  completedAt: number; // season
  attempts: number;
}
