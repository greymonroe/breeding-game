import { create } from 'zustand';
import {
  computePhenotype,
  crossIndividuals,
  produceGameteWithTrace,
  discoverAssociations,
  geneEdit,
  gaussian,
  genomicSelect,
  genotypeIndividuals,
  hybridGeneticValue,
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
import { makeInitialDiscovery, type DiscoveryState, type LinkageDiscovery, type TraitDiscovery } from './discovery';

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
  kind: 'inbred' | 'hybrid';
  /** For hybrids: archive IDs of the two inbred parent lines. */
  hybridParents?: [string, string];
  traits: { yield: number; flavor: number; color: number; shape: number };
  resistant: boolean;
  /** Genotypic uniformity at functional loci, computed at release time. */
  uniformity: number;
  totalEarned: number;
  lastSeasonRevenue: number;
  /** Per-season cost to maintain (0 for inbreds, >0 for hybrids). */
  maintenanceCost: number;
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
  /** IDs of objectives that must be completed before this one can complete. */
  requires?: string[];
  completed: boolean;
  completedAt?: number;
}

function makeObjectives(): Objective[] {
  return [
    {
      id: 'discover_color_dominance',
      title: 'What makes a flower red?',
      description: 'Cross a red-flowered plant with a white-flowered plant and figure out which color is dominant. Use the Lab to set up a dominance test.',
      reward: 100,
      availableAt: 0,
      completed: false,
    },
    {
      id: 'identify_homozygous_red',
      title: 'True-breeding red',
      description: 'Use a test cross to identify a homozygous red (RR) plant. Cross a red plant with a white plant and examine the offspring.',
      reward: 150,
      availableAt: 0,
      requires: ['discover_color_dominance'],
      completed: false,
    },
    {
      id: 'release_red',
      title: 'Release a homozygous red variety',
      description: 'Release a confirmed-homozygous red variety that won\'t segregate in farmer fields.',
      reward: 300,
      availableAt: 0,
      requires: ['identify_homozygous_red'],
      completed: false,
    },
    {
      id: 'release_white',
      title: 'White gold',
      description: 'Release a white-flowered variety with competitive yield.',
      reward: 500,
      availableAt: 5,
      completed: false,
    },
    {
      id: 'discover_shape_dominance',
      title: 'How do leaves get their shape?',
      description: 'Cross a round-leaved plant with an elongated-leaved plant and observe the offspring. What type of inheritance is this?',
      reward: 120,
      availableAt: 2,
      completed: false,
    },
    {
      id: 'discover_linkage',
      title: 'A curious pattern',
      description: 'You\'ve noticed white plants always yield less than red ones. Grow a large segregating population (cross Rr × Rr) and examine whether color and yield are truly independent.',
      reward: 200,
      availableAt: 4,
      requires: ['discover_color_dominance'],
      completed: false,
    },
    {
      id: 'break_color_yield_linkage',
      title: 'Break the chain',
      description: 'Find a rare recombinant: release a white variety with yield above the market baseline. You\'ll need a large segregating population to find one.',
      reward: 400,
      availableAt: 6,
      requires: ['discover_linkage'],
      completed: false,
    },
    {
      id: 'introgress_dr',
      title: 'Taming the wild',
      description: 'Disease outbreaks destroy susceptible varieties. Introgress disease resistance from wild germplasm and release a resistant variety with competitive yield — but watch out for linkage drag.',
      reward: 500,
      availableAt: 10,
      requires: ['discover_color_dominance'],
      completed: false,
    },
    {
      id: 'unlock_controlled_cross',
      title: 'Precision breeding',
      description: 'Unlock "Controlled crosses" in the Tech tab to make targeted crosses between specific parents. This is essential for systematic test crosses.',
      reward: 50,
      availableAt: 2,
      completed: false,
    },
    {
      id: 'unlock_diversity_dashboard',
      title: 'Know your population',
      description: 'Unlock the "Diversity dashboard" in the Tech tab, then check the Data tab to see how diverse your breeding population is. Are you losing alleles?',
      reward: 80,
      availableAt: 4,
      completed: false,
    },
    {
      id: 'run_gwas',
      title: 'Map the genome',
      description: 'Unlock "Marker discovery" in the Tech tab, genotype your plants, and run a GWAS to find which chromosome regions affect yield. Check the Data tab genome map to see the hits.',
      reward: 200,
      availableAt: 6,
      requires: ['unlock_controlled_cross'],
      completed: false,
    },
    {
      id: 'release_hybrid',
      title: 'Release an F1 hybrid',
      description: 'Develop two inbred parent lines and release a high-performing F1 hybrid.',
      reward: 600,
      availableAt: 8,
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

  // ── Trials ──
  /** Replicated trial data: key = "indId:traitName", value = array of phenotype values. */
  trialData: Map<string, number[]>;

  // ── Discovery ──
  discovery: DiscoveryState;

  // ── Challenges ──
  challengeCompletion: Map<string, ChallengeCompletion>;
  activeChallenge: { definitionId: string; instance: ChallengeInstance } | null;

  // ── Meiosis animation ──
  meiosisTrace: {
    maternalCrossovers: Array<{ chromosomeId: number; position: number; newActive: 0 | 1 }>;
    paternalCrossovers: Array<{ chromosomeId: number; position: number; newActive: 0 | 1 }>;
  } | null;

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
  releaseHybrid: (parentAId: string, parentBId: string) => void;
  unlockTech: (id: TechId) => boolean;
  genotypeAll: (nurseryId?: string) => void;
  runGwas: (traitName: string, nurseryId?: string) => void;
  measureTrait: (nurseryId: string, traitName: string, reps?: number) => void;
  makeControlledCross: (parentAId: string, parentBId: string, count: number) => void;
  acquireWildAccession: () => void;
  introducePlantFromBank: (id: string) => void;
  mutagenizeField: () => void;
  editIndividual: (indId: string, locusId: string, allele: string) => void;
  trainPredictor: () => void;
  dismissNotice: (id: number) => void;
  reset: () => void;

  // ── Discovery actions ──
  /** Interpret a cross family to discover dominance. The family must have parents with different phenotypes. */
  interpretDominance: (traitName: string, familyId: string, dominantAllele: string) => boolean;
  /** Interpret a cross family as a test cross. One parent must have the dominant phenotype, the other recessive. */
  interpretTestCross: (traitName: string, familyId: string, targetIndId: string, answer: 'homozygous' | 'heterozygous') => boolean;
  /** Interpret a segregating F2 population to discover linkage between color and yield. */
  interpretLinkage: (answer: 'linkage' | 'pleiotropy' | 'coincidence') => boolean;

  // ── Challenge actions ──
  startChallenge: (definitionId: string) => void;
  submitChallenge: (playerAnswer: unknown) => ChallengeResult;
  dismissChallenge: () => void;
  dismissMeiosis: () => void;
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

/** Check if an objective's prerequisites are all completed. */
function prereqsMet(obj: Objective, allObjectives: Objective[]): boolean {
  if (!obj.requires || obj.requires.length === 0) return true;
  return obj.requires.every(reqId => allObjectives.some(o => o.id === reqId && o.completed));
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
  | 'advanceSeason' | 'release' | 'releaseHybrid' | 'unlockTech' | 'genotypeAll' | 'runGwas'
  | 'interpretDominance' | 'interpretTestCross' | 'interpretLinkage'
  | 'acquireWildAccession' | 'introducePlantFromBank' | 'mutagenizeField'
  | 'editIndividual' | 'trainPredictor' | 'dismissNotice' | 'reset'
  | 'measureTrait' | 'makeControlledCross'
  | 'startChallenge' | 'submitChallenge' | 'dismissChallenge' | 'dismissMeiosis'> {
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
    trialData: new Map(),
    discovery: makeInitialDiscovery(),
    challengeCompletion: new Map(),
    activeChallenge: null,
    meiosisTrace: null,
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
      // Offspring are grouped into families by parent pair so the Field view
      // can show interpretation panels for each cross.
      const offspring: Individual[] = [];
      const N = nursery.popSize;
      for (let i = 0; i < N; i++) {
        const mom = parents[Math.floor(s.rng() * parents.length)];
        const dad = parents[Math.floor(s.rng() * parents.length)];
        const child = crossIndividuals(mom, dad, s.map, s.traits, s.rng, 1)[0];
        stripPaidPhenotypes(child);
        // Assign family ID: canonical order so mom×dad = dad×mom
        const [p1, p2] = [mom.id, dad.id].sort();
        child.familyId = p1 === p2
          ? `self_${p1}_s${s.season + 1}`
          : `cross_${p1}_${p2}_s${s.season + 1}`;
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
      const gross = Math.round(base * share * demand * newTrust);
      const rev = gross - (r.maintenanceCost ?? 0);
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
      kind: 'inbred',
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
      maintenanceCost: 0,
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
      if (!prereqsMet(o, s.objectives)) return o;
      if (o.id === 'release_red' && isRed && objectiveOk) {
        return { ...o, completed: true, completedAt: s.season };
      }
      if (o.id === 'release_white' && isWhite && objectiveOk) {
        return { ...o, completed: true, completedAt: s.season };
      }
      // Break linkage: release a white variety with yield above market baseline
      if (o.id === 'break_color_yield_linkage' && isWhite && objectiveOk && release.traits.yield >= s.marketBaseline) {
        return { ...o, completed: true, completedAt: s.season };
      }
      // Introgress DR: release a resistant variety with competitive yield
      if (o.id === 'introgress_dr' && release.resistant && objectiveOk && release.traits.yield >= s.marketBaseline) {
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

  releaseHybrid: (parentAId, parentBId) => {
    const s = get();
    if (!s.unlocked.has('hybrid_breeding')) {
      set({ notices: [...s.notices, notice('Unlock Hybrid breeding in the Tech tree first.')] });
      return;
    }
    // Find parents across all nurseries and archive
    const findInd = (id: string): Individual | undefined => {
      for (const n of s.nurseries) {
        const found = n.plants.find((p) => p.id === id);
        if (found) return found;
      }
      return s.archive.get(id);
    };
    const parentA = findInd(parentAId);
    const parentB = findInd(parentBId);
    if (!parentA || !parentB) return;
    if (parentAId === parentBId) {
      set({ notices: [...s.notices, notice('A hybrid requires two different parents.')] });
      return;
    }
    if (!parentA.phenotype.has('yield') || !parentA.phenotype.has('flavor') ||
        !parentB.phenotype.has('yield') || !parentB.phenotype.has('flavor')) {
      set({ notices: [...s.notices, notice('Both parents must have yield and flavor measured.')] });
      return;
    }
    if (s.budget.cash < Costs.hybridReleaseFee) {
      set({ notices: [...s.notices, notice(`Need $${Costs.hybridReleaseFee} hybrid registration fee.`)] });
      return;
    }

    // Compute F1 traits from the two parents
    const yieldTrait = s.traits.find((t) => t.name === 'yield');
    const flavorTrait = s.traits.find((t) => t.name === 'flavor');
    const colorTrait = s.traits.find((t) => t.name === 'color');
    const shapeTrait = s.traits.find((t) => t.name === 'shape');
    if (!yieldTrait || !flavorTrait || !colorTrait || !shapeTrait) return;

    const f1Yield = yieldTrait.type === 'quantitative'
      ? hybridGeneticValue(parentA, parentB, yieldTrait) + gaussian(s.rng) * Math.sqrt(yieldTrait.environmentalVariance)
      : 0;
    const f1Flavor = flavorTrait.type === 'quantitative'
      ? hybridGeneticValue(parentA, parentB, flavorTrait) + gaussian(s.rng) * Math.sqrt(flavorTrait.environmentalVariance)
      : 0;
    // Qualitative traits: F1 gets one allele from each parent
    const colorDose = (parentA.genotype.haplotypes[0].get('COLOR') === 'R' ? 1 : 0)
                    + (parentB.genotype.haplotypes[0].get('COLOR') === 'R' ? 1 : 0);
    const f1Color = colorDose >= 1 ? 1 : 0; // complete dominance
    const shapeDose = (parentA.genotype.haplotypes[0].get('SHAPE') === 'L' ? 1 : 0)
                    + (parentB.genotype.haplotypes[0].get('SHAPE') === 'L' ? 1 : 0);
    const f1Shape = shapeDose === 2 ? 1 : shapeDose === 1 ? 0.5 : 0; // incomplete dominance

    const drA = parentA.genotype.haplotypes[0].get('DR');
    const drB = parentB.genotype.haplotypes[0].get('DR');
    const resistant = drA === 'R' || drB === 'R';

    // F1 uniformity depends on how inbred each parent is.
    // Fully inbred parents → all F1 seeds are genetically identical → uniformity 1.0.
    // Non-inbred parents → variable gametes → F1 seed lot is not uniform.
    const uniA = individualUniformity(parentA, FUNCTIONAL_LOCI);
    const uniB = individualUniformity(parentB, FUNCTIONAL_LOCI);
    const uniformity = uniA * uniB;

    const release: ReleasedVariety = {
      id: `var_${s.releases.length + 1}`,
      name: `Hybrid ${s.releases.length + 1}`,
      releasedAtSeason: s.season,
      parentId: parentAId,
      kind: 'hybrid',
      hybridParents: [parentAId, parentBId],
      traits: { yield: f1Yield, flavor: f1Flavor, color: f1Color, shape: f1Shape },
      resistant,
      uniformity,
      totalEarned: 0,
      lastSeasonRevenue: 0,
      maintenanceCost: Costs.hybridMaintenanceCost,
    };

    // Trust dynamics (same as inbred release)
    let trustDelta = 0;
    let trustNote = '';
    if (uniformity >= 0.92) {
      trustDelta = 0.04;
      trustNote = 'Farmers love it. Uniform F1 hybrid, vigorous stand. Trust ↑.';
    } else if (uniformity >= 0.8) {
      trustDelta = -0.02;
      trustNote = 'Hybrid performs well, but some off-types noted — are the parent lines pure?';
    } else if (uniformity >= 0.6) {
      trustDelta = -0.25;
      trustNote = '⚠ F1 seed lot is variable — parent lines are not sufficiently inbred. Trust ↓.';
    } else {
      trustDelta = -0.5;
      trustNote = '🚨 Hybrid seed is highly variable — parents are segregating. Trust collapses.';
    }
    const newTrust = Math.max(0.1, Math.min(1, s.trust + trustDelta));
    const seg = segmentKey(release.traits.color, release.resistant);

    // Check objectives
    const objectiveOk = uniformity >= 0.8;
    const isRed = release.traits.color >= 0.5;
    const isWhite = !isRed;
    const updatedObjectives = s.objectives.map((o) => {
      if (o.completed) return o;
      if (o.availableAt > s.season) return o;
      if (!prereqsMet(o, s.objectives)) return o;
      if (o.id === 'release_red' && isRed && objectiveOk) return { ...o, completed: true, completedAt: s.season };
      if (o.id === 'release_white' && isWhite && objectiveOk) return { ...o, completed: true, completedAt: s.season };
      if (o.id === 'release_hybrid' && objectiveOk) return { ...o, completed: true, completedAt: s.season };
      if (o.id === 'break_color_yield_linkage' && isWhite && objectiveOk && release.traits.yield >= s.marketBaseline) return { ...o, completed: true, completedAt: s.season };
      if (o.id === 'introgress_dr' && release.resistant && objectiveOk && release.traits.yield >= s.marketBaseline) return { ...o, completed: true, completedAt: s.season };
      return o;
    });

    let objBonus = 0;
    const objNotices: Notice[] = [];
    const objNews: NewsItem[] = [];
    for (let i = 0; i < updatedObjectives.length; i++) {
      if (updatedObjectives[i].completed && !s.objectives[i].completed) {
        objBonus += updatedObjectives[i].reward;
        objNotices.push(notice(`🏆 Objective complete: "${updatedObjectives[i].title}" — earned $${updatedObjectives[i].reward} bonus!`));
        objNews.push(news(`🏆 Objective "${updatedObjectives[i].title}" completed! +$${updatedObjectives[i].reward}.`, s.season, 'event'));
      }
    }

    const budgetAfterRelease = spend(s.budget, Costs.hybridReleaseFee, `registered ${release.name}`, s.season);
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
        notice(`🌽 ${release.name} (F1) added to portfolio (${SEGMENT_LABELS[seg]}, yield ${release.traits.yield.toFixed(1)}, maintenance $${release.maintenanceCost}/season). ${trustNote}`),
        ...objNotices,
      ],
      news: [
        ...objNews,
        news(
          `🌽 You released ${release.name} — an F1 hybrid into the ${SEGMENT_LABELS[seg]} segment (yield ${release.traits.yield.toFixed(1)}, flavor ${release.traits.flavor.toFixed(1)}). ${trustNote}`,
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

    // Check tech-unlock quests
    const techQuestMap: Record<string, string> = {
      controlled_cross: 'unlock_controlled_cross',
      diversity_dashboard: 'unlock_diversity_dashboard',
    };
    const questId = techQuestMap[id];
    const updatedObjectives = s.objectives.map(o => {
      if (o.completed) return o;
      if (!prereqsMet(o, s.objectives)) return o;
      if (questId && o.id === questId) return { ...o, completed: true, completedAt: s.season };
      return o;
    });
    let objBonus = 0;
    const objNotices: Notice[] = [];
    for (let i = 0; i < updatedObjectives.length; i++) {
      if (updatedObjectives[i].completed && !s.objectives[i].completed) {
        objBonus += updatedObjectives[i].reward;
        objNotices.push(notice(`🏆 Quest complete: "${updatedObjectives[i].title}" — earned $${updatedObjectives[i].reward}!`));
      }
    }

    set({
      unlocked: next,
      objectives: updatedObjectives,
      budget: spend(
        { cash: s.budget.cash + objBonus, history: objBonus > 0 ? [...s.budget.history, { generation: s.season, cash: s.budget.cash + objBonus, reason: `+$${objBonus} quest bonus` }] : s.budget.history },
        tech.cost,
        `researched ${tech.name}`,
        s.season
      ),
      notices: [...s.notices, notice(`🔓 Unlocked: ${tech.name} — ${tech.blurb}`), ...objNotices],
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

    // Check GWAS quest
    const updatedObjectives = s.objectives.map(o => {
      if (o.completed) return o;
      if (!prereqsMet(o, s.objectives)) return o;
      if (o.id === 'run_gwas' && found.length > 0) return { ...o, completed: true, completedAt: s.season };
      return o;
    });
    let objBonus = 0;
    const objNotices: Notice[] = [];
    for (let i = 0; i < updatedObjectives.length; i++) {
      if (updatedObjectives[i].completed && !s.objectives[i].completed) {
        objBonus += updatedObjectives[i].reward;
        objNotices.push(notice(`🏆 Quest complete: "${updatedObjectives[i].title}" — earned $${updatedObjectives[i].reward}!`));
      }
    }

    set({
      markers: knowledge,
      objectives: updatedObjectives,
      budget: objBonus > 0
        ? { cash: s.budget.cash + objBonus, history: [...s.budget.history, { generation: s.season, cash: s.budget.cash + objBonus, reason: `+$${objBonus} quest bonus` }] }
        : s.budget,
      notices: [
        ...s.notices,
        notice(
          found.length === 0
            ? `GWAS scan on ${traitName}: no significant associations in ${target.name}.`
            : `GWAS scan on ${traitName}: found ${found.length} marker–trait association${found.length === 1 ? '' : 's'} in ${target.name}.`
        ),
        ...objNotices,
      ],
    });
  },

  measureTrait: (nurseryId, traitName, reps = 1) => {
    const s = get();
    const traitObj = s.traits.find((t) => t.name === traitName);
    if (!traitObj) return;
    const target = s.nurseries.find((n) => n.id === nurseryId);
    if (!target) return;

    // For reps > 1, we can re-measure already-measured plants (adding more reps)
    const plantsToMeasure = reps === 1
      ? target.plants.filter((p) => !p.phenotype.has(traitName))
      : target.plants;
    if (plantsToMeasure.length === 0) {
      set({ notices: [...s.notices, notice(`All ${traitName} values already measured in ${target.name}.`)] });
      return;
    }
    const perPlant = (MEASURE_COST[traitName] ?? 0) * reps;
    const cost = plantsToMeasure.length * perPlant;
    if (s.budget.cash < cost) {
      set({ notices: [...s.notices, notice(`Need $${cost} for ${reps}-rep ${traitName} trial in ${target.name}.`)] });
      return;
    }

    const newTrialData = new Map(s.trialData);

    const updatedPlants = target.plants.map((p) => {
      if (reps === 1 && p.phenotype.has(traitName)) return p;
      const key = `${p.id}:${traitName}`;
      // Take `reps` independent phenotype samples
      const newValues: number[] = [];
      for (let r = 0; r < reps; r++) {
        newValues.push(computePhenotype(p, traitObj, s.rng));
      }
      // Merge with existing trial data
      const existing = newTrialData.get(key) ?? [];
      const allValues = [...existing, ...newValues];
      newTrialData.set(key, allValues);
      // Set the phenotype to the mean of all reps
      const mean = allValues.reduce((a, b) => a + b, 0) / allValues.length;
      const newP: Individual = { ...p, phenotype: new Map(p.phenotype) };
      newP.phenotype.set(traitName, mean);
      return newP;
    });

    const archive = new Map(s.archive);
    for (const p of updatedPlants) archive.set(p.id, p);

    const updatedHistory = traitName === 'yield' && nurseryId === s.activeNurseryId
      ? (() => {
          const newMean = meanPhenotype(updatedPlants, 'yield');
          const newBest = Math.max(...updatedPlants.map(p => p.phenotype.get('yield') ?? 0), 0);
          const h = [...s.history];
          h[h.length - 1] = { ...h[h.length - 1], meanYield: newMean, bestYield: newBest };
          return h;
        })()
      : s.history;

    const label = reps > 1 ? `${reps}-rep trial` : 'phenotyped';
    set({
      nurseries: s.nurseries.map((n) => (n.id === nurseryId ? { ...n, plants: updatedPlants } : n)),
      archive,
      trialData: newTrialData,
      history: updatedHistory,
      budget: spend(
        s.budget,
        cost,
        `${label} ${plantsToMeasure.length}× ${traitName} in ${target.name}`,
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
    // Capture meiosis crossover events for animation (run extra trace on parents)
    const matTrace = produceGameteWithTrace(parentA.genotype, s.map, s.rng);
    const patTrace = produceGameteWithTrace(parentB.genotype, s.map, s.rng);
    const meiosisTrace = {
      maternalCrossovers: matTrace.crossovers,
      paternalCrossovers: patTrace.crossovers,
    };
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
      meiosisTrace,
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

  // ── Discovery actions ──
  // These work on existing cross families — no separate experiment creation needed.

  interpretDominance: (traitName, _familyId, dominantAllele) => {
    const s = get();
    const disc = s.discovery.traitDiscoveries[traitName];
    if (!disc || disc.level !== 'unknown') return false;

    const traitDef = s.traits.find(t => t.name === traitName);
    if (!traitDef || traitDef.type !== 'qualitative') return false;
    const correctDominant = traitDef.dominantAllele;

    if (dominantAllele !== correctDominant) {
      const hint = traitDef.dominance === 'incomplete'
        ? `❌ Look again — the offspring phenotype is different from both parents. What does that tell you about how the alleles interact?`
        : `❌ That doesn't match the offspring data. Look at the phenotype ratios again.`;
      set({ notices: [...s.notices, notice(hint)] });
      return false;
    }

    const locus = s.map.chromosomes.flatMap(c => c.loci).find(l => l.id === disc.locusId);
    const recessiveAllele = locus?.alleles.find(a => a !== correctDominant) ?? '?';

    const updatedDisc: TraitDiscovery = {
      ...disc,
      level: 'test_cross_ready',
      dominantAllele: correctDominant,
      recessiveAllele,
      dominanceDiscoveredAt: s.season,
    };

    const updatedObjectives = s.objectives.map(o => {
      if (o.completed) return o;
      if (!prereqsMet(o, s.objectives)) return o;
      if (o.id === `discover_${traitName}_dominance`) return { ...o, completed: true, completedAt: s.season };
      return o;
    });
    let objBonus = 0;
    const objNotices: Notice[] = [];
    for (let i = 0; i < updatedObjectives.length; i++) {
      if (updatedObjectives[i].completed && !s.objectives[i].completed) {
        objBonus += updatedObjectives[i].reward;
        objNotices.push(notice(`🏆 Quest complete: "${updatedObjectives[i].title}" — earned $${updatedObjectives[i].reward}!`));
      }
    }

    set({
      discovery: {
        ...s.discovery,
        traitDiscoveries: { ...s.discovery.traitDiscoveries, [traitName]: updatedDisc },
      },
      objectives: updatedObjectives,
      budget: objBonus > 0
        ? { cash: s.budget.cash + objBonus, history: [...s.budget.history, { generation: s.season, cash: s.budget.cash + objBonus, reason: `+$${objBonus} quest bonus` }] }
        : s.budget,
      notices: [
        ...s.notices,
        notice(traitDef.dominance === 'incomplete'
          ? `🧬 Discovery: ${traitName} shows INCOMPLETE DOMINANCE! ${correctDominant}${correctDominant} = one phenotype, ${recessiveAllele}${recessiveAllele} = another, and ${correctDominant}${recessiveAllele} = intermediate. All three genotypes are distinguishable by phenotype alone!`
          : `🧬 Discovery: ${correctDominant} is dominant over ${recessiveAllele} for ${traitName}! Recessive plants now show ${recessiveAllele}${recessiveAllele}. Use test crosses (dominant × recessive) to resolve ${correctDominant}? individuals.`),
        ...objNotices,
      ],
    });
    return true;
  },

  interpretTestCross: (traitName, _familyId, targetIndId, answer) => {
    const s = get();
    const disc = s.discovery.traitDiscoveries[traitName];
    if (!disc || disc.level === 'unknown') return false;

    const target = s.archive.get(targetIndId);
    if (!target) return false;
    const a0 = target.genotype.haplotypes[0].get(disc.locusId);
    const a1 = target.genotype.haplotypes[1].get(disc.locusId);
    const isHomozygous = a0 === disc.dominantAllele && a1 === disc.dominantAllele;
    const correctAnswer = isHomozygous ? 'homozygous' : 'heterozygous';

    if (answer !== correctAnswer) {
      set({ notices: [...s.notices, notice(`❌ Look at the offspring ratios more carefully. Are all offspring showing the dominant phenotype, or is there a mix?`)] });
      return false;
    }

    const resolvedGenotypes = { ...s.discovery.resolvedGenotypes };
    resolvedGenotypes[disc.locusId] = new Set(resolvedGenotypes[disc.locusId]);
    resolvedGenotypes[disc.locusId].add(targetIndId);

    const genotypeStr = isHomozygous
      ? `${disc.dominantAllele}${disc.dominantAllele} (homozygous dominant)`
      : `${disc.dominantAllele}${disc.recessiveAllele} (heterozygous)`;

    const updatedObjectives = s.objectives.map(o => {
      if (o.completed) return o;
      if (!prereqsMet(o, s.objectives)) return o;
      if (o.id === 'identify_homozygous_red' && isHomozygous && traitName === 'color') {
        return { ...o, completed: true, completedAt: s.season };
      }
      return o;
    });
    let objBonus = 0;
    const objNotices: Notice[] = [];
    for (let i = 0; i < updatedObjectives.length; i++) {
      if (updatedObjectives[i].completed && !s.objectives[i].completed) {
        objBonus += updatedObjectives[i].reward;
        objNotices.push(notice(`🏆 Quest complete: "${updatedObjectives[i].title}" — earned $${updatedObjectives[i].reward}!`));
      }
    }

    set({
      discovery: { ...s.discovery, resolvedGenotypes },
      objectives: updatedObjectives,
      budget: objBonus > 0
        ? { cash: s.budget.cash + objBonus, history: [...s.budget.history, { generation: s.season, cash: s.budget.cash + objBonus, reason: `+$${objBonus} quest bonus` }] }
        : s.budget,
      notices: [
        ...s.notices,
        notice(`🧬 ${targetIndId} is ${genotypeStr}.`),
        ...objNotices,
      ],
    });
    return true;
  },

  interpretLinkage: (answer) => {
    const s = get();
    // Linkage is between COLOR and Y1 — the correct answer is 'linkage'
    if (answer !== 'linkage') {
      set({ notices: [...s.notices, notice(`❌ Look again at the data. Is color directly causing the yield difference, or could these genes just be physically close on the same chromosome?`)] });
      return false;
    }

    const linkage: LinkageDiscovery = {
      locus1: 'COLOR',
      locus2: 'Y1',
      trait1Name: 'color',
      trait2Name: 'yield',
      discoveredAt: s.season,
    };

    const updatedObjectives = s.objectives.map(o => {
      if (o.completed) return o;
      if (!prereqsMet(o, s.objectives)) return o;
      if (o.id === 'discover_linkage') return { ...o, completed: true, completedAt: s.season };
      return o;
    });
    let objBonus = 0;
    const objNotices: Notice[] = [];
    for (let i = 0; i < updatedObjectives.length; i++) {
      if (updatedObjectives[i].completed && !s.objectives[i].completed) {
        objBonus += updatedObjectives[i].reward;
        objNotices.push(notice(`🏆 Quest complete: "${updatedObjectives[i].title}" — earned $${updatedObjectives[i].reward}!`));
      }
    }

    set({
      discovery: {
        ...s.discovery,
        linkages: [...s.discovery.linkages, linkage],
      },
      objectives: updatedObjectives,
      budget: objBonus > 0
        ? { cash: s.budget.cash + objBonus, history: [...s.budget.history, { generation: s.season, cash: s.budget.cash + objBonus, reason: `+$${objBonus} quest bonus` }] }
        : s.budget,
      notices: [
        ...s.notices,
        notice(`🧬 Discovery: Color and yield are LINKED! The color locus and a major yield gene sit close together on the same chromosome. Red haplotypes carry the favorable yield allele. To get high-yielding white plants, you'll need to find rare recombinants in a large population.`),
        ...objNotices,
      ],
    });
    return true;
  },

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
  dismissMeiosis: () => set({ meiosisTrace: null }),
}));
