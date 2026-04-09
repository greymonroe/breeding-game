import { create } from 'zustand';
import {
  computePhenotype,
  crossIndividuals,
  discoverAssociations,
  geneEdit,
  genomicSelect,
  genotypeIndividuals,
  inbreedingCoefficient,
  individualUniformity,
  makeMarkerKnowledge,
  makeRng,
  markerAssistedSelect,
  meanHe,
  meanPhenotype,
  mutagenize,
  randomFounder,
  trainGenomicPredictor,
  type GenomeMap,
  type GenomicPredictor,
  type Individual,
  type MarkerKnowledge,
  type RNG,
  type Trait,
} from '../engine';
import { makeStarterPopulation } from './starter';
import {
  Costs,
  COMPETITION_LOSER_SHARE,
  DISEASE_GRACE_GENERATIONS,
  DISEASE_OUTBREAK_CHANCE,
  FREE_PHENOTYPES,
  makeBudget,
  makeInitialMarket,
  MEASURE_COST,
  meanRevertMarket,
  MARKET_DRIFT_PER_SEASON,
  SEGMENT_LABELS,
  segmentKey,
  spend,
  varietyBaseRevenue,
  type Budget,
  type SegmentId,
} from './economy';
import { canUnlock, TECHS_BY_ID, type TechId } from './progression';
import type { ChallengeCompletion, ChallengeInstance, ChallengeResult } from '../challenges/types';
import { ALL_CHALLENGES, TECH_CHALLENGES, BONUS_CHALLENGES } from '../challenges/registry';
import { buildChallengeContext, generateChallenge, validateChallenge } from '../challenges/engine';

// ─────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────

export interface Nursery {
  id: string;
  name: string;
  plants: Individual[];
  /** Default population size used for the next advance. */
  popSize: number;
}

export interface ReleasedVariety {
  id: string;
  name: string;
  releasedAtSeason: number;
  parentId: string;
  traits: { yield: number; flavor: number; color: number; shape: number };
  resistant: boolean;
  /** Genotypic uniformity at functional loci, computed at release time. */
  uniformity: number;
  totalEarned: number;
  lastSeasonRevenue: number;
}

export interface GenerationStat {
  season: number;
  meanYield: number;
  bestYield: number;
  he: number;
  f: number;
}

export interface Notice {
  id: number;
  text: string;
}

export interface NewsItem {
  id: number;
  season: number;
  text: string;
  kind: 'event' | 'release' | 'disease' | 'price' | 'system';
}

export type SelectionMode = 'phenotype' | 'mas' | 'gp';

export interface Objective {
  id: string;
  title: string;
  description: string;
  reward: number;
  /** Season it becomes visible. */
  availableAt: number;
  completed: boolean;
  completedAt?: number;
}

function makeObjectives(): Objective[] {
  return [
    {
      id: 'release_red',
      title: 'Release a Red variety',
      description: 'Release a red-flowered variety that farmers are happy with.',
      reward: 200,
      availableAt: 0,
      completed: false,
    },
    {
      id: 'release_white',
      title: 'Release a White variety',
      description: 'Release a white-flowered variety with competitive yield.',
      reward: 400,
      availableAt: 5,
      completed: false,
    },
  ];
}

interface GameState {
  map: GenomeMap;
  traits: Trait[];
  rng: RNG;

  nurseries: Nursery[];
  activeNurseryId: string;

  archive: Map<string, Individual>;
  budget: Budget;
  releases: ReleasedVariety[];
  history: GenerationStat[];
  selectedIds: string[];
  marketBaseline: number;
  season: number;
  diseaseActive: boolean;
  diseaseStartedAt: number | null;
  /** Farmer trust 0..1. Multiplies all portfolio revenue. */
  trust: number;

  unlocked: Set<TechId>;
  objectives: Objective[];
  notices: Notice[];
  news: NewsItem[];

  /** Per-segment demand multiplier (1.0 = neutral). */
  market: Record<SegmentId, number>;
  /** Trend snapshot of last advance for arrow display. */
  marketTrend: Record<SegmentId, 'up' | 'down' | 'flat'>;

  markers: MarkerKnowledge;
  germplasm: Individual[];
  predictor: GenomicPredictor | null;

  // ── Challenges ──
  challengeCompletion: Map<string, ChallengeCompletion>;
  activeChallenge: { definitionId: string; instance: ChallengeInstance } | null;

  // ── Selectors ──
  activeNursery: () => Nursery;
  population: () => Individual[]; // active nursery's plants
  totalPlants: () => number;

  // ── Actions ──
  setActiveNursery: (id: string) => void;
  createNursery: (name: string) => void;
  deleteNursery: (id: string) => void;
  renameNursery: (id: string, name: string) => void;
  setNurseryPopSize: (id: string, n: number) => void;
  moveIndividual: (indId: string, toNurseryId: string) => void;

  toggleSelect: (id: string) => void;
  clearSelection: () => void;
  autoSelectTopInActive: (n: number, mode: SelectionMode) => void;

  /** Advance the season globally: every nursery with selected parents inside it
   *  produces a new generation; the rest persist. Pays per-plant maintenance,
   *  pays portfolio income (with segmentation), drifts market, rolls disease. */
  advanceSeason: () => void;

  release: (id: string) => void;
  unlockTech: (id: TechId) => boolean;
  genotypeAll: (nurseryId?: string) => void;
  runGwas: (traitName: string, nurseryId?: string) => void;
  measureTrait: (nurseryId: string, traitName: string) => void;
  makeControlledCross: (parentAId: string, parentBId: string, count: number) => void;
  acquireWildAccession: () => void;
  introducePlantFromBank: (id: string) => void;
  mutagenizeField: () => void;
  editIndividual: (indId: string, locusId: string, allele: string) => void;
  trainPredictor: () => void;
  dismissNotice: (id: number) => void;
  reset: () => void;

  // ── Challenge actions ──
  startChallenge: (definitionId: string) => void;
  submitChallenge: (playerAnswer: unknown) => ChallengeResult;
  dismissChallenge: () => void;
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────

let _noticeCounter = 0;
function notice(text: string): Notice {
  return { id: ++_noticeCounter, text };
}
let _newsCounter = 0;
function news(text: string, season: number, kind: NewsItem['kind'] = 'event'): NewsItem {
  return { id: ++_newsCounter, season, text, kind };
}
let _nurseryCounter = 0;
function nurseryId(): string {
  _nurseryCounter += 1;
  return `nur_${_nurseryCounter}`;
}

function archiveOf(inds: Individual[]): Map<string, Individual> {
  const m = new Map<string, Individual>();
  for (const i of inds) m.set(i.id, i);
  return m;
}

function phenotypeAll(ind: Individual, traits: Trait[], rng: RNG) {
  for (const t of traits) ind.phenotype.set(t.name, computePhenotype(ind, t, rng));
}

/** Restrict an individual's phenotype map to only the FREE traits.
 *  Used for newly created offspring/wild plants — paid traits must be measured. */
function stripPaidPhenotypes(ind: Individual) {
  for (const k of [...ind.phenotype.keys()]) {
    if (!FREE_PHENOTYPES.has(k)) ind.phenotype.delete(k);
  }
}

function findNurseryFor(nurseries: Nursery[], indId: string): Nursery | null {
  for (const n of nurseries) if (n.plants.some((p) => p.id === indId)) return n;
  return null;
}

/** Functional loci on the starter genome (the ones that actually segregate
 *  for traits the player cares about). Used to compute variety uniformity. */
const FUNCTIONAL_LOCI = [
  'COLOR', 'SHAPE', 'DR',
  'Y1', 'Y2', 'Y4', 'Y7', 'Y8', 'Y11', 'Y15', 'Y16', 'Y19', 'Y22',
  'F1', 'F4', 'F7',
];

function makeInitial(): Omit<GameState,
  | 'activeNursery' | 'population' | 'totalPlants'
  | 'setActiveNursery' | 'createNursery' | 'deleteNursery' | 'renameNursery'
  | 'setNurseryPopSize' | 'moveIndividual'
  | 'toggleSelect' | 'clearSelection' | 'autoSelectTopInActive'
  | 'advanceSeason' | 'release' | 'unlockTech' | 'genotypeAll' | 'runGwas'
  | 'acquireWildAccession' | 'introducePlantFromBank' | 'mutagenizeField'
  | 'editIndividual' | 'trainPredictor' | 'dismissNotice' | 'reset'
  | 'measureTrait' | 'makeControlledCross'
  | 'startChallenge' | 'submitChallenge' | 'dismissChallenge'> {
  const seed = Math.floor(Math.random() * 1e9);
  const rng = makeRng(seed);
  const starter = makeStarterPopulation(seed);
  const mainNursery: Nursery = {
    id: nurseryId(),
    name: 'Main breeding line',
    plants: starter.population,
    popSize: 30,
  };
  const stat: GenerationStat = {
    season: 0,
    meanYield: meanPhenotype(starter.population, 'yield'),
    bestYield: Math.max(...starter.population.map((p) => p.phenotype.get('yield') ?? 0)),
    he: meanHe(starter.population, starter.map),
    f: inbreedingCoefficient(starter.population, starter.map),
  };
  return {
    map: starter.map,
    traits: starter.traits,
    rng,
    nurseries: [mainNursery],
    activeNurseryId: mainNursery.id,
    archive: archiveOf(starter.population),
    budget: makeBudget(2000),
    releases: [],
    history: [stat],
    selectedIds: [],
    marketBaseline: starter.initialMarketBaseline,
    season: 0,
    diseaseActive: false,
    diseaseStartedAt: null,
    trust: 1.0,
    unlocked: new Set<TechId>(['mass_selection']),
    objectives: makeObjectives(),
    notices: [],
    news: [news('Welcome to your breeding program. Markets are quiet — for now.', 0, 'system')],
    market: makeInitialMarket(),
    marketTrend: { red_R: 'flat', red_s: 'flat', white_R: 'flat', white_s: 'flat' } as Record<SegmentId, 'up' | 'down' | 'flat'>,
    markers: makeMarkerKnowledge(),
    germplasm: [],
    predictor: null,
    challengeCompletion: new Map(),
    activeChallenge: null,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────────────────────────────────

export const useGame = create<GameState>((set, get) => ({
  ...makeInitial(),

  activeNursery: () => {
    const s = get();
    return s.nurseries.find((n) => n.id === s.activeNurseryId) ?? s.nurseries[0];
  },
  population: () => get().activeNursery().plants,
  totalPlants: () => get().nurseries.reduce((acc, n) => acc + n.plants.length, 0),

  setActiveNursery: (id) =>
    set((s) => ({ activeNurseryId: id, selectedIds: s.selectedIds })),

  createNursery: (name) => {
    const s = get();
    // Creating a population is free — we want players to split their work
    // into many small breeding sub-populations.
    const nur: Nursery = { id: nurseryId(), name: name || 'New nursery', plants: [], popSize: 20 };
    set({
      nurseries: [...s.nurseries, nur],
      activeNurseryId: nur.id,
    });
  },

  deleteNursery: (id) => {
    const s = get();
    if (s.nurseries.length <= 1) return;
    const next = s.nurseries.filter((n) => n.id !== id);
    set({
      nurseries: next,
      activeNurseryId: s.activeNurseryId === id ? next[0].id : s.activeNurseryId,
    });
  },

  renameNursery: (id, name) =>
    set((s) => ({
      nurseries: s.nurseries.map((n) => (n.id === id ? { ...n, name } : n)),
    })),

  setNurseryPopSize: (id, n) =>
    set((s) => ({
      nurseries: s.nurseries.map((nu) => (nu.id === id ? { ...nu, popSize: Math.max(1, n) } : nu)),
    })),

  moveIndividual: (indId, toNurseryId) => {
    const s = get();
    const from = findNurseryFor(s.nurseries, indId);
    if (!from || from.id === toNurseryId) return;
    const ind = from.plants.find((p) => p.id === indId)!;
    set({
      nurseries: s.nurseries.map((n) => {
        if (n.id === from.id) return { ...n, plants: n.plants.filter((p) => p.id !== indId) };
        if (n.id === toNurseryId) return { ...n, plants: [...n.plants, ind] };
        return n;
      }),
    });
  },

  toggleSelect: (id) =>
    set((s) => ({
      selectedIds: s.selectedIds.includes(id)
        ? s.selectedIds.filter((x) => x !== id)
        : [...s.selectedIds, id],
    })),

  clearSelection: () => set({ selectedIds: [] }),

  autoSelectTopInActive: (n, mode) => {
    const s = get();
    const active = s.activeNursery();
    let ranked: Individual[];
    if (mode === 'gp' && s.predictor) {
      ranked = genomicSelect(active.plants, s.predictor, n);
    } else if (mode === 'mas' && s.unlocked.has('mas')) {
      ranked = markerAssistedSelect(active.plants, s.markers, 'yield', n);
    } else {
      ranked = [...active.plants]
        .sort((a, b) => (b.phenotype.get('yield') ?? 0) - (a.phenotype.get('yield') ?? 0))
        .slice(0, n);
    }
    // Replace any selection from this nursery with the new ranking, keep selections from other nurseries.
    const otherNurseryIds = new Set(active.plants.map((p) => p.id));
    const keep = s.selectedIds.filter((id) => !otherNurseryIds.has(id));
    set({ selectedIds: [...keep, ...ranked.map((i) => i.id)] });
  },

  advanceSeason: () => {
    const s = get();

    // Compute parent groups per nursery
    const nurseryAdvances = s.nurseries.map((n) => {
      const parents = n.plants.filter((p) => s.selectedIds.includes(p.id));
      return { nursery: n, parents };
    });

    // Total seed cost (only nurseries that will advance pay seed cost)
    const totalCost = nurseryAdvances
      .filter((a) => a.parents.length > 0)
      .reduce((acc, a) => acc + a.nursery.popSize * Costs.perPlant, 0);

    if (s.budget.cash < totalCost) {
      set({ notices: [...s.notices, notice(`Need $${totalCost} to plant all queued nurseries.`)] });
      return;
    }

    // Produce offspring per advancing nursery
    const archive = new Map(s.archive);
    const newNurseries: Nursery[] = [];
    let allOffspring: Individual[] = [];
    for (const { nursery, parents } of nurseryAdvances) {
      if (parents.length === 0) {
        newNurseries.push(nursery);
        continue;
      }
      // Open pollination: each offspring is the result of one random pairing
      // among the selected parents, drawn independently with replacement.
      // When only one parent is selected, every offspring is a self of that
      // parent and they form a labeled sibling family.
      const offspring: Individual[] = [];
      const N = nursery.popSize;
      const selfingFamilyId =
        parents.length === 1 ? `self_${parents[0].id}_s${s.season + 1}` : null;
      for (let i = 0; i < N; i++) {
        const mom = parents[Math.floor(s.rng() * parents.length)];
        const dad = parents[Math.floor(s.rng() * parents.length)];
        const child = crossIndividuals(mom, dad, s.map, s.traits, s.rng, 1)[0];
        stripPaidPhenotypes(child);
        if (selfingFamilyId) child.familyId = selfingFamilyId;
        offspring.push(child);
      }
      for (const o of offspring) archive.set(o.id, o);
      allOffspring.push(...offspring);
      newNurseries.push({ ...nursery, plants: offspring });
    }

    // Stats from active nursery's *new* plants (or its current plants if it didn't advance)
    const newActive = newNurseries.find((n) => n.id === s.activeNurseryId)!;
    const newSeason = s.season + 1;
    const stat: GenerationStat = {
      season: newSeason,
      meanYield: meanPhenotype(newActive.plants, 'yield'),
      bestYield: Math.max(...newActive.plants.map((p) => p.phenotype.get('yield') ?? 0), 0),
      he: meanHe(newActive.plants, s.map),
      f: inbreedingCoefficient(newActive.plants, s.map),
    };

    const newBaseline = s.marketBaseline + MARKET_DRIFT_PER_SEASON;

    // Disease check
    let diseaseActive = s.diseaseActive;
    let diseaseStartedAt = s.diseaseStartedAt;
    const notices = [...s.notices];
    const newsItems: NewsItem[] = [];
    if (
      !diseaseActive &&
      newSeason >= DISEASE_GRACE_GENERATIONS &&
      s.rng() < DISEASE_OUTBREAK_CHANCE
    ) {
      diseaseActive = true;
      diseaseStartedAt = newSeason;
      notices.push(
        notice('🦠 DISEASE OUTBREAK! Non-resistant varieties are losing market share. Introgress R from a wild accession.')
      );
      newsItems.push(news('🦠 Farmers report rust outbreak in central valley. Resistant lines spike, susceptible collapse.', newSeason, 'disease'));
    }
    if (diseaseActive && diseaseStartedAt != null) {
      const releasedDuringOutbreak = s.releases.some(
        (r) => r.releasedAtSeason >= diseaseStartedAt! && r.resistant
      );
      if (releasedDuringOutbreak || newSeason - diseaseStartedAt >= 5) {
        diseaseActive = false;
        diseaseStartedAt = null;
        notices.push(notice('🌤 Disease pressure subsided. Markets recovering.'));
        newsItems.push(news('🌤 Disease pressure has subsided. Markets are normalizing.', newSeason, 'disease'));
      }
    }

    // ── Market dynamics ──
    let market = meanRevertMarket(s.market, 0.25);
    if (diseaseActive) {
      // Resistant segments command a premium during outbreak; non-resistant crater
      market = {
        ...market,
        red_R: Math.max(market.red_R, 1.6),
        white_R: Math.max(market.white_R, 1.6),
        red_s: Math.min(market.red_s, 0.2),
        white_s: Math.min(market.white_s, 0.2),
      };
    } else if (s.rng() < 0.20) {
      // Random ambient market event
      const events = [
        {
          text: '📰 Restaurant chain signs deal for premium red-flower varieties.',
          apply: (m: typeof market) => ({ ...m, red_R: m.red_R + 0.5, red_s: m.red_s + 0.5 }),
        },
        {
          text: '📰 Wholesaler announces white-flower contract for next year.',
          apply: (m: typeof market) => ({ ...m, white_R: m.white_R + 0.5, white_s: m.white_s + 0.5 }),
        },
        {
          text: '📰 Exporters seeking robust resistant lines for shipping markets.',
          apply: (m: typeof market) => ({ ...m, red_R: m.red_R + 0.4, white_R: m.white_R + 0.4 }),
        },
        {
          text: '📰 Bumper harvest expected — buyers cool on commodity lines.',
          apply: (m: typeof market) => ({ ...m, red_s: Math.max(0.4, m.red_s - 0.3), white_s: Math.max(0.4, m.white_s - 0.3) }),
        },
        {
          text: '📰 Heirloom-flavor trend boosts every segment slightly.',
          apply: (m: typeof market) => ({
            red_R: m.red_R + 0.2, red_s: m.red_s + 0.2, white_R: m.white_R + 0.2, white_s: m.white_s + 0.2,
          }),
        },
      ];
      const ev = events[Math.floor(s.rng() * events.length)];
      market = ev.apply(market);
      newsItems.push(news(ev.text, newSeason, 'event'));
    }

    // Compute trend (vs previous)
    const trend: Record<SegmentId, 'up' | 'down' | 'flat'> = {
      red_R: 'flat', red_s: 'flat', white_R: 'flat', white_s: 'flat',
    };
    for (const k of Object.keys(trend) as SegmentId[]) {
      const d = market[k] - s.market[k];
      trend[k] = d > 0.05 ? 'up' : d < -0.05 ? 'down' : 'flat';
    }

    // Apply portfolio revenue WITH segmentation
    const segments = new Map<string, ReleasedVariety[]>();
    for (const r of s.releases) {
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

    // Trust slowly recovers toward 1.0 each season
    const newTrust = Math.min(1, s.trust + 0.01);

    let totalIncome = 0;
    const updatedReleases = s.releases.map((r) => {
      const base = varietyBaseRevenue({
        yieldValue: r.traits.yield,
        flavor: r.traits.flavor,
        resistant: r.resistant,
        marketBaseline: newBaseline,
        diseaseActive,
      });
      const share = winners.has(r.id) ? 1 : COMPETITION_LOSER_SHARE;
      const seg = segmentKey(r.traits.color, r.resistant);
      const demand = market[seg];
      const rev = Math.round(base * share * demand * newTrust);
      totalIncome += rev;
      return { ...r, lastSeasonRevenue: rev, totalEarned: r.totalEarned + rev };
    });

    const cashAfter = s.budget.cash - totalCost + totalIncome;
    const ledger = [...s.budget.history];
    if (totalCost > 0) {
      ledger.push({
        generation: newSeason,
        cash: s.budget.cash - totalCost,
        reason: `-$${totalCost} planted across nurseries`,
      });
    }
    if (totalIncome > 0) {
      ledger.push({
        generation: newSeason,
        cash: cashAfter,
        reason: `+$${totalIncome} portfolio income`,
      });
    }

    if (stat.he < 0.15 && (s.history[s.history.length - 1]?.he ?? 1) >= 0.15) {
      notices.push(notice('⚠ Diversity (He) is low in your active nursery. Pull in fresh material.'));
    }

    // Bonus challenge trigger: ~20% chance per season, min 4 seasons apart
    const lastBonusSeason = s.history.findIndex((h) => h.season === newSeason) === -1 ? -10 : -10;
    if (
      BONUS_CHALLENGES.length > 0 &&
      newSeason >= 3 &&
      s.rng() < 0.20 &&
      !s.activeChallenge
    ) {
      const uncompleted = BONUS_CHALLENGES.filter((b) => !s.challengeCompletion.has(b.id));
      if (uncompleted.length > 0) {
        const pick = uncompleted[Math.floor(s.rng() * uncompleted.length)];
        newsItems.push(news(`🧪 A farmer has a genetics question for you! Check the notification bar.`, newSeason, 'system'));
        notices.push(notice(`🧪 Bonus challenge available: "${pick.title}" — earn $${pick.reward}!`));
      }
    }
    void lastBonusSeason;

    set({
      nurseries: newNurseries,
      archive,
      budget: { cash: cashAfter, history: ledger },
      releases: updatedReleases,
      history: [...s.history, stat],
      marketBaseline: newBaseline,
      season: newSeason,
      diseaseActive,
      diseaseStartedAt,
      trust: newTrust,
      notices,
      news: [...newsItems, ...s.news].slice(0, 50),
      market,
      marketTrend: trend,
      selectedIds: [],
    });
    void allOffspring;
  },

  release: (id) => {
    const s = get();
    // search across all nurseries for the individual
    let ind: Individual | undefined;
    for (const n of s.nurseries) {
      const found = n.plants.find((p) => p.id === id);
      if (found) { ind = found; break; }
    }
    if (!ind) return;
    if (!ind.phenotype.has('yield') || !ind.phenotype.has('flavor')) {
      set({
        notices: [
          ...s.notices,
          notice('Cannot release: yield and flavor must be measured first (Phenotype panel in the field).'),
        ],
      });
      return;
    }
    if (s.budget.cash < Costs.releaseFee) {
      set({ notices: [...s.notices, notice(`Need $${Costs.releaseFee} registration fee.`)] });
      return;
    }
    const a = ind.genotype.haplotypes[0].get('DR');
    const b = ind.genotype.haplotypes[1].get('DR');
    const resistant = a === 'R' || b === 'R';
    const uniformity = individualUniformity(ind, FUNCTIONAL_LOCI);
    const release: ReleasedVariety = {
      id: `var_${s.releases.length + 1}`,
      name: `Variety ${s.releases.length + 1}`,
      releasedAtSeason: s.season,
      parentId: ind.id,
      traits: {
        yield: ind.phenotype.get('yield') ?? 0,
        flavor: ind.phenotype.get('flavor') ?? 0,
        color: ind.phenotype.get('color') ?? 0,
        shape: ind.phenotype.get('shape') ?? 0,
      },
      resistant,
      uniformity,
      totalEarned: 0,
      lastSeasonRevenue: 0,
    };

    // Trust dynamics from this release. The exact uniformity is hidden from
    // the player — they have to learn from the *consequences*.
    let trustDelta = 0;
    let trustNote = '';
    if (uniformity >= 0.92) {
      trustDelta = 0.04;
      trustNote = 'Farmers love it. Uniform stand, easy to harvest. Trust ↑.';
    } else if (uniformity >= 0.8) {
      trustDelta = -0.02;
      trustNote = 'Performs as expected, but some minor variation noted.';
    } else if (uniformity >= 0.6) {
      trustDelta = -0.25;
      trustNote = '⚠ Some farmers report off-types in the field. Trust ↓.';
    } else {
      trustDelta = -0.5;
      trustNote = '🚨 Farmers report severe variability — the variety is segregating in their fields. Trust collapses.';
    }
    // Release frequency penalty: if released within last 2 seasons, extra -0.03 trust
    const recentReleases = s.releases.filter(r => s.season - r.releasedAtSeason <= 2).length;
    if (recentReleases > 1) {
      trustDelta -= 0.04 * (recentReleases - 1);
      if (trustNote && recentReleases > 2) trustNote += ' Market saturation from frequent releases hurts reputation.';
    }

    const newTrust = Math.max(0.1, Math.min(1, s.trust + trustDelta));
    const seg = segmentKey(release.traits.color, release.resistant);

    // Check objectives — a release counts toward an objective only if trust
    // didn't crater (uniformity >= 0.8 → trustDelta >= 0).
    const objectiveOk = uniformity >= 0.8;
    const isRed = release.traits.color >= 0.5;
    const isWhite = !isRed;
    const updatedObjectives = s.objectives.map((o) => {
      if (o.completed) return o;
      if (o.availableAt > s.season) return o;
      if (o.id === 'release_red' && isRed && objectiveOk) {
        return { ...o, completed: true, completedAt: s.season };
      }
      if (o.id === 'release_white' && isWhite && objectiveOk) {
        return { ...o, completed: true, completedAt: s.season };
      }
      return o;
    });

    // Compute bonus from newly completed objectives
    let objBonus = 0;
    const objNotices: Notice[] = [];
    const objNews: NewsItem[] = [];
    for (let i = 0; i < updatedObjectives.length; i++) {
      if (updatedObjectives[i].completed && !s.objectives[i].completed) {
        objBonus += updatedObjectives[i].reward;
        objNotices.push(
          notice(`🏆 Objective complete: "${updatedObjectives[i].title}" — earned $${updatedObjectives[i].reward} bonus!`)
        );
        objNews.push(
          news(`🏆 Objective "${updatedObjectives[i].title}" completed! +$${updatedObjectives[i].reward}.`, s.season, 'event')
        );
      }
    }

    const budgetAfterRelease = spend(s.budget, Costs.releaseFee, `registered ${release.name}`, s.season);
    const finalCash = budgetAfterRelease.cash + objBonus;
    const finalHistory = objBonus > 0
      ? [...budgetAfterRelease.history, { generation: s.season, cash: finalCash, reason: `+$${objBonus} objective bonus` }]
      : budgetAfterRelease.history;

    set({
      releases: [...s.releases, release],
      budget: { cash: finalCash, history: finalHistory },
      trust: newTrust,
      objectives: updatedObjectives,
      notices: [
        ...s.notices,
        notice(
          `📦 ${release.name} added to portfolio (${SEGMENT_LABELS[seg]}, yield ${release.traits.yield.toFixed(1)}). ${trustNote}`
        ),
        ...objNotices,
      ],
      news: [
        ...objNews,
        news(
          `📦 You released ${release.name} into the ${SEGMENT_LABELS[seg]} segment (yield ${release.traits.yield.toFixed(1)}, flavor ${release.traits.flavor.toFixed(1)}). ${trustNote}`,
          s.season,
          'release'
        ),
        ...s.news,
      ].slice(0, 50),
    });
  },

  unlockTech: (id) => {
    const s = get();
    const tech = TECHS_BY_ID[id];
    if (!canUnlock(tech, s.unlocked, s.budget.cash)) return false;

    // If this tech has a challenge that hasn't been completed, start it instead
    const challenge = TECH_CHALLENGES[id];
    if (challenge && !s.challengeCompletion.has(challenge.id)) {
      const ctx = buildChallengeContext(s as unknown as Parameters<typeof buildChallengeContext>[0]);
      const instance = generateChallenge(challenge, ctx);
      set({ activeChallenge: { definitionId: challenge.id, instance } });
      return false; // unlock happens after challenge completion
    }

    // No challenge or already completed — unlock directly
    const next = new Set(s.unlocked);
    next.add(id);
    set({
      unlocked: next,
      budget: spend(s.budget, tech.cost, `researched ${tech.name}`, s.season),
      notices: [...s.notices, notice(`🔓 Unlocked: ${tech.name} — ${tech.blurb}`)],
    });
    return true;
  },

  genotypeAll: (nurseryId) => {
    const s = get();
    if (!s.unlocked.has('marker_discovery')) return;
    const target = nurseryId
      ? s.nurseries.find((n) => n.id === nurseryId) ?? s.activeNursery()
      : s.activeNursery();
    const allLoci = s.map.chromosomes.flatMap((c) => c.loci).map((l) => l.id);
    const cost = target.plants.length * Costs.genotypePerPlant;
    if (s.budget.cash < cost) {
      set({ notices: [...s.notices, notice(`Need $${cost} to genotype ${target.name}.`)] });
      return;
    }
    const markers = genotypeIndividuals(s.markers, target.plants, allLoci);
    set({
      markers,
      budget: spend(s.budget, cost, `genotyped ${target.plants.length} plants in ${target.name}`, s.season),
    });
  },

  runGwas: (traitName, nurseryId) => {
    const s = get();
    if (!s.unlocked.has('marker_discovery')) return;
    const target = nurseryId
      ? s.nurseries.find((n) => n.id === nurseryId) ?? s.activeNursery()
      : s.activeNursery();
    const phenotyped = target.plants.filter((p) => p.phenotype.has(traitName));
    if (phenotyped.length < 5) {
      set({
        notices: [
          ...s.notices,
          notice(
            `Need at least 5 plants in ${target.name} with ${traitName} measured before scanning.`
          ),
        ],
      });
      return;
    }
    const allLoci = s.map.chromosomes.flatMap((c) => c.loci);
    const { knowledge, found } = discoverAssociations(s.markers, phenotyped, allLoci, traitName, 0.3);
    set({
      markers: knowledge,
      notices: [
        ...s.notices,
        notice(
          found.length === 0
            ? `GWAS scan on ${traitName}: no significant associations in ${target.name}.`
            : `GWAS scan on ${traitName}: found ${found.length} marker–trait association${found.length === 1 ? '' : 's'} in ${target.name}.`
        ),
      ],
    });
  },

  measureTrait: (nurseryId, traitName) => {
    const s = get();
    const traitObj = s.traits.find((t) => t.name === traitName);
    if (!traitObj) return;
    const target = s.nurseries.find((n) => n.id === nurseryId);
    if (!target) return;
    const unmeasured = target.plants.filter((p) => !p.phenotype.has(traitName));
    if (unmeasured.length === 0) {
      set({ notices: [...s.notices, notice(`All ${traitName} values already measured in ${target.name}.`)] });
      return;
    }
    const perPlant = MEASURE_COST[traitName] ?? 0;
    const cost = unmeasured.length * perPlant;
    if (s.budget.cash < cost) {
      set({ notices: [...s.notices, notice(`Need $${cost} to phenotype ${traitName} in ${target.name}.`)] });
      return;
    }
    // Mutate phenotype maps in-place — they're owned by individuals already
    // referenced by the archive, so we'd need to reconstruct anyway. Build new
    // individual references to keep zustand happy.
    const updatedPlants = target.plants.map((p) => {
      if (p.phenotype.has(traitName)) return p;
      const newP: Individual = { ...p, phenotype: new Map(p.phenotype) };
      newP.phenotype.set(traitName, computePhenotype(newP, traitObj, s.rng));
      return newP;
    });
    const archive = new Map(s.archive);
    for (const p of updatedPlants) archive.set(p.id, p);
    set({
      nurseries: s.nurseries.map((n) => (n.id === nurseryId ? { ...n, plants: updatedPlants } : n)),
      archive,
      budget: spend(
        s.budget,
        cost,
        `phenotyped ${unmeasured.length}× ${traitName} in ${target.name}`,
        s.season
      ),
    });
  },

  makeControlledCross: (parentAId, parentBId, count) => {
    const s = get();
    // Selfing (both parents the same individual) is just open pollination
    // of one plant — biologically free, no tech gate. Crossing two
    // *different* individuals requires the controlled_cross tech.
    const isSelf = parentAId === parentBId;
    if (!isSelf && !s.unlocked.has('controlled_cross')) {
      set({
        notices: [...s.notices, notice('Research "Controlled crosses" in the Tech tree to cross two different parents.')],
      });
      return;
    }
    let parentA: Individual | undefined;
    let parentB: Individual | undefined;
    for (const n of s.nurseries) {
      if (!parentA) parentA = n.plants.find((p) => p.id === parentAId);
      if (!parentB) parentB = n.plants.find((p) => p.id === parentBId);
    }
    if (!parentA || !parentB) return;
    const cost = Costs.controlledCrossFee + count * Costs.perPlant;
    if (s.budget.cash < cost) {
      set({ notices: [...s.notices, notice(`Need $${cost} for this controlled cross.`)] });
      return;
    }
    const offspring = crossIndividuals(parentA, parentB, s.map, s.traits, s.rng, count);
    const familyId = isSelf
      ? `self_${parentAId}_s${s.season}`
      : `fam_${parentAId}_${parentBId}_${s.season}`;
    for (const o of offspring) {
      stripPaidPhenotypes(o);
      o.familyId = familyId;
    }
    const archive = new Map(s.archive);
    for (const o of offspring) archive.set(o.id, o);
    const activeId = s.activeNurseryId;
    set({
      nurseries: s.nurseries.map((n) =>
        n.id === activeId ? { ...n, plants: [...n.plants, ...offspring] } : n
      ),
      archive,
      budget: spend(
        s.budget,
        cost,
        `controlled cross ${parentAId}×${parentBId} (${count} offspring)`,
        s.season
      ),
      notices: [
        ...s.notices,
        notice(
          isSelf
            ? `⊙ Selfed ${parentAId} → ${count} sibling offspring (family ${familyId.slice(-8)}).`
            : `✕ Crossed ${parentAId} × ${parentBId} → ${count} F1 siblings (family ${familyId.slice(-8)}).`
        ),
      ],
      selectedIds: [],
    });
  },

  acquireWildAccession: () => {
    const s = get();
    if (!s.unlocked.has('wild_germplasm')) return;
    if (s.budget.cash < Costs.wildAccession) return;
    const wild = randomFounder(s.map, s.rng);
    wild.genotype.haplotypes[0].set('DR', 'R');
    wild.genotype.haplotypes[1].set('DR', 'R');
    // Linkage drag: Y4(33cM) is 8cM from DR(25cM) on chr2.
    // Wild carries Y4=- linked to DR=R.
    wild.genotype.haplotypes[0].set('Y4', '-');
    wild.genotype.haplotypes[1].set('Y4', '-');
    phenotypeAll(wild, s.traits, s.rng);
    stripPaidPhenotypes(wild);
    set({
      germplasm: [...s.germplasm, wild],
      budget: spend(s.budget, Costs.wildAccession, 'acquired wild accession', s.season),
      notices: [...s.notices, notice(`🌾 Acquired ${wild.id} (carries 🛡 disease resistance R/R).`)],
    });
  },

  introducePlantFromBank: (id) => {
    const s = get();
    const ind = s.germplasm.find((p) => p.id === id);
    if (!ind) return;
    const archive = new Map(s.archive);
    archive.set(ind.id, ind);
    const activeId = s.activeNurseryId;
    set({
      nurseries: s.nurseries.map((n) =>
        n.id === activeId ? { ...n, plants: [...n.plants, ind] } : n
      ),
      germplasm: s.germplasm.filter((p) => p.id !== id),
      archive,
    });
  },

  mutagenizeField: () => {
    const s = get();
    if (!s.unlocked.has('mutagenesis')) return;
    if (s.budget.cash < Costs.mutagenize) return;
    const active = s.activeNursery();
    const mutated = mutagenize(active.plants, s.map, s.traits, s.rng, 0.3);
    for (const m of mutated) stripPaidPhenotypes(m);
    const archive = new Map(s.archive);
    for (const m of mutated) archive.set(m.id, m);
    set({
      nurseries: s.nurseries.map((n) => (n.id === active.id ? { ...n, plants: mutated } : n)),
      archive,
      budget: spend(s.budget, Costs.mutagenize, `mutagenized ${active.name}`, s.season),
      notices: [...s.notices, notice('🧬 Mutagenesis applied — screen for useful variants.')],
    });
  },

  editIndividual: (indId, locusId, allele) => {
    const s = get();
    if (!s.unlocked.has('gene_editing')) return;
    if (s.budget.cash < Costs.geneEdit) return;
    const from = findNurseryFor(s.nurseries, indId);
    if (!from) return;
    const target = from.plants.find((p) => p.id === indId)!;
    const edited = geneEdit(target, locusId, allele, s.traits, s.rng);
    stripPaidPhenotypes(edited);
    const archive = new Map(s.archive);
    archive.set(edited.id, edited);
    set({
      nurseries: s.nurseries.map((n) =>
        n.id === from.id ? { ...n, plants: n.plants.map((p) => (p.id === indId ? edited : p)) } : n
      ),
      archive,
      budget: spend(s.budget, Costs.geneEdit, `edit ${locusId}→${allele}`, s.season),
      notices: [...s.notices, notice(`✂ Edited ${locusId} to ${allele}.`)],
    });
  },

  trainPredictor: () => {
    const s = get();
    if (!s.unlocked.has('genomic_prediction')) return;
    if (s.budget.cash < Costs.trainPredictor) return;
    const active = s.activeNursery();
    const predictor = trainGenomicPredictor(active.plants, s.map, 'yield', 1);
    if (!predictor) {
      set({ notices: [...s.notices, notice('Need more phenotyped data to train predictor.')] });
      return;
    }
    set({
      predictor,
      budget: spend(s.budget, Costs.trainPredictor, 'train predictor', s.season),
      notices: [...s.notices, notice(`🧠 Trained genomic predictor on ${active.plants.length} plants.`)],
    });
  },

  dismissNotice: (id) => set((s) => ({ notices: s.notices.filter((n) => n.id !== id) })),

  reset: () => set(makeInitial()),

  // ── Challenge actions ──

  startChallenge: (definitionId) => {
    const s = get();
    const def = ALL_CHALLENGES[definitionId];
    if (!def) return;
    const ctx = buildChallengeContext(s as unknown as Parameters<typeof buildChallengeContext>[0]);
    const instance = generateChallenge(def, ctx);
    set({ activeChallenge: { definitionId, instance } });
  },

  submitChallenge: (playerAnswer) => {
    const s = get();
    if (!s.activeChallenge) return { correct: false, explanation: 'No active challenge.' };
    const { definitionId, instance } = s.activeChallenge;
    const result = validateChallenge(definitionId, instance, playerAnswer);

    if (result.correct) {
      const prev = s.challengeCompletion.get(definitionId);
      const next = new Map(s.challengeCompletion);
      next.set(definitionId, { completedAt: s.season, attempts: (prev?.attempts ?? 0) + 1 });

      // If this is a tech unlock challenge, unlock the tech now
      const def = ALL_CHALLENGES[definitionId];
      const updates: Partial<GameState> = { challengeCompletion: next };
      if (def?.techId) {
        const tech = TECHS_BY_ID[def.techId];
        if (tech && !s.unlocked.has(def.techId) && s.budget.cash >= tech.cost) {
          const nextUnlocked = new Set(s.unlocked);
          nextUnlocked.add(def.techId);
          updates.unlocked = nextUnlocked;
          updates.budget = spend(s.budget, tech.cost, `researched ${tech.name}`, s.season);
          updates.notices = [...s.notices, notice(`🔓 Unlocked: ${tech.name} — ${tech.blurb}`)];
        }
      }
      // Bonus challenge cash reward
      if (def?.reward) {
        const b = updates.budget ?? s.budget;
        updates.budget = { cash: b.cash + def.reward, history: [...b.history, { generation: s.season, cash: b.cash + def.reward, reason: `+$${def.reward} challenge reward` }] };
      }

      set(updates as Partial<typeof s>);
    }
    return result;
  },

  dismissChallenge: () => set({ activeChallenge: null }),
}));
