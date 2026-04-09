/**
 * Headless game engine that mirrors the full Zustand store logic but runs
 * without React. Used by bots and parameter sweeps.
 */

import {
  crossIndividuals,
  computePhenotype,
  discoverAssociations,
  genotypeIndividuals,
  individualUniformity,
  makeMarkerKnowledge,
  makeRng,
  markerAssistedSelect,
  meanHe,
  meanPhenotype,
  randomFounder,
  type GenomeMap,
  type Individual,
  type MarkerKnowledge,
  type RNG,
  type Trait,
} from '../src/engine';
import { makeStarterPopulation } from '../src/game/starter';
import {
  Costs,
  COMPETITION_LOSER_SHARE,
  DISEASE_GRACE_GENERATIONS,
  DISEASE_OUTBREAK_CHANCE,
  FREE_PHENOTYPES,
  MARKET_DRIFT_PER_SEASON,
  MEASURE_COST,
  makeInitialMarket,
  meanRevertMarket,
  segmentKey,
  varietyBaseRevenue,
  type SegmentId,
} from '../src/game/economy';
import { TECHS_BY_ID, canUnlock, type TechId } from '../src/game/progression';

const FUNCTIONAL_LOCI = [
  'COLOR', 'SHAPE', 'DR',
  'Y1', 'Y2', 'Y4', 'Y7', 'Y8', 'Y11', 'Y15', 'Y16', 'Y19', 'Y22',
  'F1', 'F4', 'F7',
];

export interface Variety {
  id: string;
  traits: { yield: number; flavor: number; color: number };
  resistant: boolean;
  uniformity: number;
  totalEarned: number;
  lastSeasonRevenue: number;
  releasedAt: number;
}

export interface SeasonLog {
  season: number;
  cash: number;
  trust: number;
  marketBaseline: number;
  he: number;
  meanYield: number;
  bestYield: number;
  totalPlants: number;
  income: number;
  expenses: number;
  releasesCount: number;
  diseaseActive: boolean;
  market: Record<SegmentId, number>;
}

export class HeadlessGame {
  map: GenomeMap;
  traits: Trait[];
  rng: RNG;
  populations: Map<string, Individual[]> = new Map();
  season = 0;
  cash: number;
  trust = 1.0;
  marketBaseline: number;
  market: Record<SegmentId, number>;
  diseaseActive = false;
  diseaseStartedAt: number | null = null;
  releases: Variety[] = [];
  unlocked: Set<TechId>;
  markers: MarkerKnowledge;
  log: SeasonLog[] = [];

  // Objective tracking
  redReleased = false;
  whiteReleased = false;
  redReleasedAt: number | null = null;
  whiteReleasedAt: number | null = null;

  constructor(seed: number, startingCash = 2000) {
    this.rng = makeRng(seed);
    const starter = makeStarterPopulation(seed);
    this.map = starter.map;
    this.traits = starter.traits;
    this.populations.set('main', starter.population);
    this.cash = startingCash;
    this.marketBaseline = starter.initialMarketBaseline;
    this.market = makeInitialMarket();
    this.unlocked = new Set<TechId>(['mass_selection']);
    this.markers = makeMarkerKnowledge();
  }

  get main(): Individual[] { return this.populations.get('main') ?? []; }
  set main(v: Individual[]) { this.populations.set('main', v); }
  get totalPlants(): number {
    let n = 0;
    for (const p of this.populations.values()) n += p.length;
    return n;
  }

  // ── Actions ──

  measureTrait(popName: string, traitName: string): number {
    const pop = this.populations.get(popName);
    if (!pop) return 0;
    const traitObj = this.traits.find((t) => t.name === traitName);
    if (!traitObj) return 0;
    let cost = 0;
    for (const ind of pop) {
      if (!ind.phenotype.has(traitName)) {
        ind.phenotype.set(traitName, computePhenotype(ind, traitObj, this.rng));
        cost += MEASURE_COST[traitName] ?? 0;
      }
    }
    this.cash -= cost;
    return cost;
  }

  measureAllTraits(popName: string): number {
    let cost = 0;
    for (const t of this.traits) {
      if (!FREE_PHENOTYPES.has(t.name)) {
        cost += this.measureTrait(popName, t.name);
      }
    }
    return cost;
  }

  stripPaid(ind: Individual) {
    for (const k of [...ind.phenotype.keys()]) {
      if (!FREE_PHENOTYPES.has(k)) ind.phenotype.delete(k);
    }
  }

  openPollinate(parents: Individual[], popSize: number): Individual[] {
    const offspring: Individual[] = [];
    for (let i = 0; i < popSize; i++) {
      const mom = parents[Math.floor(this.rng() * parents.length)];
      const dad = parents[Math.floor(this.rng() * parents.length)];
      const child = crossIndividuals(mom, dad, this.map, this.traits, this.rng, 1)[0];
      this.stripPaid(child);
      offspring.push(child);
    }
    return offspring;
  }

  selfOne(parent: Individual, count: number): Individual[] {
    const offspring = crossIndividuals(parent, parent, this.map, this.traits, this.rng, count);
    for (const c of offspring) this.stripPaid(c);
    return offspring;
  }

  crossTwo(a: Individual, b: Individual, count: number): Individual[] {
    const offspring = crossIndividuals(a, b, this.map, this.traits, this.rng, count);
    for (const c of offspring) this.stripPaid(c);
    return offspring;
  }

  /**
   * Advance the season. Takes a map of popName -> { parents, popSize }.
   * Any population not in the map persists unchanged (costs nothing).
   */
  advanceSeason(plans: Map<string, { parents: Individual[]; popSize: number }>) {
    let expenses = 0;

    for (const [popName, plan] of plans) {
      if (plan.parents.length === 0) continue;
      const cost = plan.popSize * Costs.perPlant;
      this.cash -= cost;
      expenses += cost;
      const offspring = this.openPollinate(plan.parents, plan.popSize);
      this.populations.set(popName, offspring);
    }

    this.season++;
    this.marketBaseline += MARKET_DRIFT_PER_SEASON;

    // Disease
    if (
      !this.diseaseActive &&
      this.season >= DISEASE_GRACE_GENERATIONS &&
      this.rng() < DISEASE_OUTBREAK_CHANCE
    ) {
      this.diseaseActive = true;
      this.diseaseStartedAt = this.season;
    }
    if (this.diseaseActive && this.diseaseStartedAt != null) {
      const resReleasedDuring = this.releases.some(
        (r) => r.releasedAt >= this.diseaseStartedAt! && r.resistant
      );
      if (resReleasedDuring || this.season - this.diseaseStartedAt >= 5) {
        this.diseaseActive = false;
        this.diseaseStartedAt = null;
      }
    }

    // Market
    this.market = meanRevertMarket(this.market, 0.25);
    if (this.diseaseActive) {
      this.market.red_R = Math.max(this.market.red_R, 1.6);
      this.market.white_R = Math.max(this.market.white_R, 1.6);
      this.market.red_s = Math.min(this.market.red_s, 0.2);
      this.market.white_s = Math.min(this.market.white_s, 0.2);
    } else if (this.rng() < 0.20) {
      // Random market event
      const events = [
        () => { this.market.red_R += 0.5; this.market.red_s += 0.5; },
        () => { this.market.white_R += 0.5; this.market.white_s += 0.5; },
        () => { this.market.red_R += 0.4; this.market.white_R += 0.4; },
        () => { this.market.red_s = Math.max(0.4, this.market.red_s - 0.3); this.market.white_s = Math.max(0.4, this.market.white_s - 0.3); },
        () => { for (const k of ['red_R', 'red_s', 'white_R', 'white_s'] as SegmentId[]) this.market[k] += 0.2; },
      ];
      events[Math.floor(this.rng() * events.length)]();
    }

    // Trust recovery
    this.trust = Math.min(1, this.trust + 0.01);

    // Portfolio income
    const income = this.applyPortfolioIncome();
    this.cash += income;

    // Log
    const mainPop = this.main;
    this.log.push({
      season: this.season,
      cash: this.cash,
      trust: this.trust,
      marketBaseline: this.marketBaseline,
      he: meanHe(mainPop, this.map),
      meanYield: meanPhenotype(mainPop, 'yield'),
      bestYield: Math.max(...mainPop.map((p) => p.phenotype.get('yield') ?? 0), 0),
      totalPlants: this.totalPlants,
      income,
      expenses,
      releasesCount: this.releases.length,
      diseaseActive: this.diseaseActive,
      market: { ...this.market },
    });
  }

  applyPortfolioIncome(): number {
    const segments = new Map<string, Variety[]>();
    for (const r of this.releases) {
      const k = segmentKey(r.traits.color, r.resistant);
      const arr = segments.get(k) ?? [];
      arr.push(r);
      segments.set(k, arr);
    }
    const winners = new Set<string>();
    for (const [, group] of segments) {
      group.sort((a, b) => b.traits.yield - a.traits.yield);
      winners.add(group[0].id);
    }
    let total = 0;
    for (const r of this.releases) {
      const base = varietyBaseRevenue({
        yieldValue: r.traits.yield,
        flavor: r.traits.flavor,
        resistant: r.resistant,
        marketBaseline: this.marketBaseline,
        diseaseActive: this.diseaseActive,
      });
      const share = winners.has(r.id) ? 1 : COMPETITION_LOSER_SHARE;
      const seg = segmentKey(r.traits.color, r.resistant);
      const demand = this.market[seg];
      const rev = Math.round(base * share * demand * this.trust);
      r.lastSeasonRevenue = rev;
      r.totalEarned += rev;
      total += rev;
    }
    return total;
  }

  release(ind: Individual): { ok: boolean; uniformity: number; trustDelta: number } {
    if (!ind.phenotype.has('yield') || !ind.phenotype.has('flavor')) {
      return { ok: false, uniformity: 0, trustDelta: 0 };
    }
    if (this.cash < Costs.releaseFee) return { ok: false, uniformity: 0, trustDelta: 0 };
    this.cash -= Costs.releaseFee;

    const a = ind.genotype.haplotypes[0].get('DR');
    const b = ind.genotype.haplotypes[1].get('DR');
    const resistant = a === 'R' || b === 'R';
    const uniformity = individualUniformity(ind, FUNCTIONAL_LOCI);

    this.releases.push({
      id: `var_${this.releases.length + 1}`,
      traits: {
        yield: ind.phenotype.get('yield')!,
        flavor: ind.phenotype.get('flavor')!,
        color: ind.phenotype.get('color') ?? 0,
      },
      resistant,
      uniformity,
      totalEarned: 0,
      lastSeasonRevenue: 0,
      releasedAt: this.season,
    });

    let trustDelta = 0;
    if (uniformity >= 0.92) trustDelta = 0.04;
    else if (uniformity >= 0.8) trustDelta = -0.02;
    else if (uniformity >= 0.6) trustDelta = -0.25;
    else trustDelta = -0.5;

    // Release frequency penalty: if released within last 2 seasons, extra -0.03 trust
    const recentReleases = this.releases.filter(r => this.season - r.releasedAt <= 2).length;
    if (recentReleases > 1) trustDelta -= 0.03 * (recentReleases - 1);

    this.trust = Math.max(0.1, Math.min(1, this.trust + trustDelta));

    // Objectives
    const isRed = (ind.phenotype.get('color') ?? 0) >= 0.5;
    const ok = uniformity >= 0.8;
    if (isRed && ok && !this.redReleased) {
      this.redReleased = true;
      this.redReleasedAt = this.season;
      this.cash += 200;
    }
    if (!isRed && ok && !this.whiteReleased) {
      this.whiteReleased = true;
      this.whiteReleasedAt = this.season;
      this.cash += 400;
    }

    return { ok: true, uniformity, trustDelta };
  }

  buyTech(id: TechId): boolean {
    const tech = TECHS_BY_ID[id];
    if (!canUnlock(tech, this.unlocked, this.cash)) return false;
    this.cash -= tech.cost;
    this.unlocked.add(id);
    return true;
  }

  genotypePopulation(popName: string): number {
    const pop = this.populations.get(popName);
    if (!pop) return 0;
    const allLoci = this.map.chromosomes.flatMap((c) => c.loci).map((l) => l.id);
    const cost = pop.length * Costs.genotypePerPlant;
    if (this.cash < cost) return 0;
    this.cash -= cost;
    this.markers = genotypeIndividuals(this.markers, pop, allLoci);
    return cost;
  }

  runGwas(popName: string, traitName: string) {
    const pop = this.populations.get(popName);
    if (!pop) return;
    const phenotyped = pop.filter((p) => p.phenotype.has(traitName));
    if (phenotyped.length < 5) return;
    const allLoci = this.map.chromosomes.flatMap((c) => c.loci);
    const { knowledge } = discoverAssociations(this.markers, phenotyped, allLoci, traitName, 0.3);
    this.markers = knowledge;
  }

  masSelect(popName: string, traitName: string, n: number): Individual[] {
    const pop = this.populations.get(popName) ?? [];
    return markerAssistedSelect(pop, this.markers, traitName, n);
  }

  acquireWild(): Individual {
    this.cash -= Costs.wildAccession;
    const wild = randomFounder(this.map, this.rng);
    wild.genotype.haplotypes[0].set('DR', 'R');
    wild.genotype.haplotypes[1].set('DR', 'R');
    // Linkage drag: DR(25cM) and Y4(33cM) are 8cM apart on chr2.
    // Wild carries DR=R with Y4=- (unfavorable). Introgressing DR=R
    // drags Y4=- along — player must screen large F2 for rare recombinant.
    wild.genotype.haplotypes[0].set('Y4', '-');
    wild.genotype.haplotypes[1].set('Y4', '-');
    for (const t of this.traits) {
      if (FREE_PHENOTYPES.has(t.name)) {
        wild.phenotype.set(t.name, computePhenotype(wild, t, this.rng));
      }
    }
    return wild;
  }

  sortByYield(pop: Individual[]): Individual[] {
    return [...pop]
      .filter((p) => p.phenotype.has('yield'))
      .sort((a, b) => b.phenotype.get('yield')! - a.phenotype.get('yield')!);
  }

  sortByColor(pop: Individual[], color: 'red' | 'white'): Individual[] {
    const target = color === 'red' ? 0.5 : -Infinity;
    return pop.filter((p) =>
      color === 'red'
        ? (p.phenotype.get('color') ?? 0) >= 0.5
        : (p.phenotype.get('color') ?? 0) < 0.5
    );
  }
}
