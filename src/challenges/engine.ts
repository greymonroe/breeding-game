import type { ChallengeContext, ChallengeDefinition, ChallengeInstance, ChallengeResult } from './types';
import { ALL_CHALLENGES, TECH_CHALLENGES } from './registry';
import type { TechId } from '../game/progression';

/**
 * Build a ChallengeContext from the game state.
 * This is the read-only slice that challenge generators receive.
 */
export function buildChallengeContext(state: {
  nurseries: Array<{ plants: Array<unknown> }>;
  activeNurseryId: string;
  map: unknown;
  markers: unknown;
  rng: () => number;
  season: number;
}): ChallengeContext {
  // Find active nursery plants
  const nursery = (state.nurseries as Array<{ id: string; plants: Array<unknown> }>)
    .find((n) => n.id === state.activeNurseryId);
  const plants = (nursery?.plants ?? []) as ChallengeContext['nurseryPlants'];

  return {
    nurseryPlants: plants,
    season: state.season,
    map: state.map as ChallengeContext['map'],
    markers: state.markers as ChallengeContext['markers'],
    rng: state.rng,
  };
}

/** Generate a challenge instance from a definition and game state. */
export function generateChallenge(
  def: ChallengeDefinition,
  ctx: ChallengeContext
): ChallengeInstance {
  return def.generate(ctx);
}

/** Validate a player's answer against a challenge instance. */
export function validateChallenge(
  definitionId: string,
  instance: ChallengeInstance,
  playerAnswer: unknown
): ChallengeResult {
  const def = ALL_CHALLENGES[definitionId];
  if (!def) return { correct: false, explanation: 'Unknown challenge.' };
  return def.validate(instance, playerAnswer);
}

/** Get the challenge definition for a tech, if one exists. */
export function getChallengeForTech(techId: TechId): ChallengeDefinition | undefined {
  return TECH_CHALLENGES[techId];
}

/** Check if a tech's challenge has been completed. */
export function isTechChallengeCompleted(
  techId: TechId,
  completions: Map<string, { completedAt: number }>
): boolean {
  const def = TECH_CHALLENGES[techId];
  if (!def) return true; // no challenge required
  return completions.has(def.id);
}
