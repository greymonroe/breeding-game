/** Costs and revenue formulas for the breeding economy. */

export const Costs = {
  /** $ per plant grown to next generation (field space + maintenance) */
  perPlant: 1,
  /** Flat $ paid to register a released variety (paperwork, IP, etc.) */
  releaseFee: 15,
  /** Per-cross fee for an explicit controlled cross (in addition to per-plant). */
  controlledCrossFee: 5,
  /** $ per individual per marker panel */
  genotypePerPlant: 2,
  /** $ to mutagenize the entire current field */
  mutagenize: 40,
  /** $ to perform a targeted gene edit on one individual */
  geneEdit: 60,
  /** $ to acquire one wild accession into the seed bank */
  wildAccession: 30,
  /** $ to train the genomic predictor (one-shot per training) */
  trainPredictor: 20,
  /** Flat $ to register a hybrid variety (higher than inbred). */
  hybridReleaseFee: 40,
  /** Per-season cost to maintain inbred parent lines for hybrid seed production. */
  hybridMaintenanceCost: 10,
};

/**
 * Revenue from releasing a variety. Driven by yield *above the current
 * market baseline*. The baseline drifts up each season (competitors are
 * also breeding!), so naive mass selection eventually can't keep up unless
 * the player invests in better tools.
 */
/**
 * Base per-season revenue from one variety, before competition.
 *
 *  - Yield premium: max(0, yield - marketBaseline) × 8
 *  - Flavor premium: max(0, flavor - 50) × 1.5
 *  - Disease penalty: under outbreak, non-resistant earn 10%
 */
export function varietyBaseRevenue(opts: {
  yieldValue: number;
  flavor: number;
  resistant: boolean;
  marketBaseline: number;
  diseaseActive: boolean;
}): number {
  const yieldPremium = Math.max(0, opts.yieldValue - opts.marketBaseline) * 12;
  const flavorPremium = Math.max(0, opts.flavor - 50) * 2;
  let total = yieldPremium + flavorPremium;
  if (opts.diseaseActive && !opts.resistant) total *= 0.05;
  return total;
}

/**
 * Market segment for a variety. Segments are defined by (color, resistance).
 * Within a segment, only the highest-yield variety earns full revenue;
 * everyone else earns competitionLoserShare. Forces players to develop
 * varieties for *different niches* (red vs white, resistant vs susceptible)
 * if they want a multi-variety portfolio.
 */
export type SegmentId = 'red_R' | 'red_s' | 'white_R' | 'white_s';

export function segmentKey(color: number, resistant: boolean): SegmentId {
  const c = color >= 0.5 ? 'red' : 'white';
  return `${c}_${resistant ? 'R' : 's'}` as SegmentId;
}

export const SEGMENT_LABELS: Record<SegmentId, string> = {
  red_R: 'Red · 🛡 resistant',
  red_s: 'Red · susceptible',
  white_R: 'White · 🛡 resistant',
  white_s: 'White · susceptible',
};

export const COMPETITION_LOSER_SHARE = 0.25;

/** Trait phenotypes that are visible at germination ($0 to "measure"). */
export const FREE_PHENOTYPES = new Set(['color', 'shape']);

/** Per-plant $ cost to phenotype each measurable trait. */
export const MEASURE_COST: Record<string, number> = {
  yield: 0.5,
  flavor: 0.5,
  disease: 2,
};

/** All segments start at demand = 1.0 (neutral). */
export function makeInitialMarket(): Record<SegmentId, number> {
  return { red_R: 1, red_s: 1, white_R: 1, white_s: 1 };
}

/** Pull each segment's demand a fraction toward 1.0 (mean reversion). */
export function meanRevertMarket(
  m: Record<SegmentId, number>,
  rate = 0.2
): Record<SegmentId, number> {
  const out = { ...m };
  for (const k of Object.keys(out) as SegmentId[]) {
    out[k] = out[k] + (1 - out[k]) * rate;
  }
  return out;
}

/** Market drift per season — the rest of the world is breeding too. */
export const MARKET_DRIFT_PER_SEASON = 0.7;

/** Probability per season of a disease outbreak triggering (after grace gens). */
export const DISEASE_OUTBREAK_CHANCE = 0.20;
/** Number of generations of grace before disease outbreaks can occur. */
export const DISEASE_GRACE_GENERATIONS = 4;

export interface Budget {
  cash: number;
  history: { generation: number; cash: number; reason: string }[];
}

export function makeBudget(starting = 300): Budget {
  return { cash: starting, history: [{ generation: 0, cash: starting, reason: 'Starting funds' }] };
}

export function spend(b: Budget, amount: number, reason: string, generation: number): Budget {
  return {
    cash: b.cash - amount,
    history: [...b.history, { generation, cash: b.cash - amount, reason: `-$${amount} ${reason}` }],
  };
}

export function earn(b: Budget, amount: number, reason: string, generation: number): Budget {
  return {
    cash: b.cash + amount,
    history: [...b.history, { generation, cash: b.cash + amount, reason: `+$${amount} ${reason}` }],
  };
}
