/**
 * Full-featured headless harness for Artificial Selection.
 * Commands passed as CLI args. State persisted to /tmp/breeding-game-full.json.
 *
 * Commands:
 *   init                          - start fresh game
 *   status                        - show budget, season, portfolio, diversity
 *   list                          - show all plants with phenotypes
 *   measure <trait>               - phenotype yield/flavor/disease
 *   select <i,j,k>               - choose parents by index
 *   advance [N]                   - advance season, grow N offspring (default 30)
 *   release <i> [name...]         - release variety
 *   inspect <i>                   - show genotype of plant
 *   tech                          - show tech tree & what's unlockable
 *   unlock <techId>               - unlock a technology
 *   cross <i> <j> [N]            - controlled cross between two plants (N offspring, default 5)
 *   self <i> [N]                  - self-pollinate plant i (N offspring, default 5)
 *   wildgerm                      - acquire wild accession (goes to germplasm bank)
 *   bank                          - show germplasm bank
 *   introduce <bankIdx>           - move plant from bank into active population
 *   genotype                      - genotype all plants (requires marker_discovery)
 *   gwas <trait>                  - run GWAS scan (requires marker_discovery)
 *   associations                  - show discovered marker-trait associations
 *   trainpredictor                - train genomic predictor (requires genomic_prediction)
 *   mutagenize                    - mutagenize field (requires mutagenesis)
 *   edit <plantIdx> <locus> <allele> - gene edit (requires gene_editing)
 */
import fs from 'fs';
import {
  computePhenotype,
  crossIndividuals,
  makeRng,
  meanHe,
  inbreedingCoefficient,
  randomFounder,
  genotypeIndividuals,
  discoverAssociations,
  markerAssistedSelect,
  trainGenomicPredictor,
  genomicSelect,
  mutagenize,
  geneEdit,
  makeMarkerKnowledge,
  individualUniformity,
  type Individual,
  type Trait,
  type GenomeMap,
  type Haplotype,
  type MarkerKnowledge,
  type GenomicPredictor,
} from './src/engine/index.js';
import { makeStarterPopulation } from './src/game/starter.js';
import {
  Costs,
  MARKET_DRIFT_PER_SEASON,
  DISEASE_OUTBREAK_CHANCE,
  DISEASE_GRACE_GENERATIONS,
  varietyBaseRevenue,
  FREE_PHENOTYPES,
  MEASURE_COST,
  COMPETITION_LOSER_SHARE,
  segmentKey,
  SEGMENT_LABELS,
  makeInitialMarket,
  meanRevertMarket,
  type SegmentId,
} from './src/game/economy.js';
import { TECHS, TECHS_BY_ID, canUnlock, type TechId } from './src/game/progression.js';

const STATE_FILE = '/tmp/breeding-game-full.json';
const FUNCTIONAL_LOCI = ['COLOR','SHAPE','DR','Y1','Y2','Y3','Y4','Y5','Y6','Y7','F1','F2','F3'];

// ── Serialization ──
function serializeInd(ind: Individual): any {
  return {
    ...ind,
    phenotype: [...ind.phenotype.entries()],
    genotype: {
      species: ind.genotype.species,
      haplotypes: [
        [...ind.genotype.haplotypes[0].entries()],
        [...ind.genotype.haplotypes[1].entries()],
      ],
    },
  };
}
function deserializeInd(raw: any): Individual {
  return {
    ...raw,
    phenotype: new Map(raw.phenotype),
    genotype: {
      species: raw.genotype.species,
      haplotypes: [
        new Map(raw.genotype.haplotypes[0]) as Haplotype,
        new Map(raw.genotype.haplotypes[1]) as Haplotype,
      ],
    },
  };
}
function serializeMarkers(mk: MarkerKnowledge): any {
  return {
    discoveredLoci: [...mk.discoveredLoci],
    genotyped: [...mk.genotyped.entries()].map(([k,v]) => [k, [...v]]),
    associations: [...mk.associations.entries()],
  };
}
function deserializeMarkers(raw: any): MarkerKnowledge {
  return {
    discoveredLoci: new Set(raw.discoveredLoci),
    genotyped: new Map((raw.genotyped || []).map(([k,v]: [string, string[]]) => [k, new Set(v)])),
    associations: new Map(raw.associations || []),
  };
}

interface GameState {
  seed: number;
  season: number;
  budget: number;
  marketBaseline: number;
  diseaseActive: boolean;
  diseaseStartedAt: number | null;
  population: Individual[];
  germplasm: Individual[];
  releases: { name: string; yield: number; flavor: number; color: number; resistant: boolean; season: number; uniformity: number }[];
  unlocked: TechId[];
  trust: number;
  market: Record<SegmentId, number>;
  markers: MarkerKnowledge;
  predictor: GenomicPredictor | null;
  rngCalls: number;
}

function save(state: GameState) {
  fs.writeFileSync(STATE_FILE, JSON.stringify({
    ...state,
    population: state.population.map(serializeInd),
    germplasm: state.germplasm.map(serializeInd),
    unlocked: state.unlocked,
    markers: serializeMarkers(state.markers),
  }, null, 2));
}

function load(): GameState {
  const raw = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
  return {
    ...raw,
    population: raw.population.map(deserializeInd),
    germplasm: (raw.germplasm || []).map(deserializeInd),
    unlocked: raw.unlocked || ['mass_selection'],
    markers: raw.markers ? deserializeMarkers(raw.markers) : makeMarkerKnowledge(),
    predictor: raw.predictor || null,
    trust: raw.trust ?? 1.0,
    market: raw.market || makeInitialMarket(),
  };
}

function getEngine(seed: number) {
  const starter = makeStarterPopulation(seed);
  return { map: starter.map, traits: starter.traits };
}

function getRng(seed: number, calls: number) {
  const rng = makeRng(seed + 999);
  for (let i = 0; i < calls; i++) rng();
  return rng;
}

// Track rng calls approximately
let rngCounter = 0;
function trackedRng(rng: ReturnType<typeof makeRng>): typeof rng {
  return (() => { rngCounter++; return rng(); }) as typeof rng;
}

const cmd = process.argv[2];
const args = process.argv.slice(3);

if (cmd === 'init') {
  const seed = 314159;
  const starter = makeStarterPopulation(seed);
  for (const ind of starter.population) {
    for (const k of [...ind.phenotype.keys()]) {
      if (!FREE_PHENOTYPES.has(k)) ind.phenotype.delete(k);
    }
  }
  const state: GameState = {
    seed, season: 0, budget: 1500,
    marketBaseline: starter.initialMarketBaseline,
    diseaseActive: false, diseaseStartedAt: null,
    population: starter.population, germplasm: [],
    releases: [], unlocked: ['mass_selection'],
    trust: 1.0, market: makeInitialMarket(),
    markers: makeMarkerKnowledge(), predictor: null,
    rngCalls: 0,
  };
  save(state);
  console.log(`🌱 New game! Seed: ${seed} | Budget: $${state.budget} | Baseline: ${state.marketBaseline.toFixed(1)} | Pop: ${state.population.length}`);
}

else if (cmd === 'status') {
  const s = load();
  const { map } = getEngine(s.seed);
  console.log(`\n═══ Season ${s.season} ═══`);
  console.log(`💰 Budget: $${s.budget.toFixed(0)} | Trust: ${(s.trust*100).toFixed(0)}%`);
  console.log(`📈 Market baseline: ${s.marketBaseline.toFixed(1)}`);
  console.log(`🦠 Disease: ${s.diseaseActive ? `ACTIVE (since season ${s.diseaseStartedAt})` : 'none'}`);
  const red = s.population.filter(p => (p.phenotype.get('color') ?? 0) >= 0.5).length;
  console.log(`🌿 Population: ${s.population.length} plants (${red} red, ${s.population.length-red} white)`);
  const yielded = s.population.filter(p => p.phenotype.has('yield'));
  if (yielded.length > 0) {
    const vals = yielded.map(p => p.phenotype.get('yield')!);
    console.log(`   Yield: mean=${(vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(1)}, best=${Math.max(...vals).toFixed(1)}`);
  } else console.log(`   Yield: not measured`);
  console.log(`   He=${meanHe(s.population, map).toFixed(3)}, F=${inbreedingCoefficient(s.population, map).toFixed(3)}`);
  if (s.releases.length > 0) {
    console.log(`\n📦 Portfolio:`);
    for (const r of s.releases) {
      const seg = segmentKey(r.color, r.resistant);
      console.log(`   ${r.name}: yield=${r.yield.toFixed(1)}, flavor=${r.flavor.toFixed(1)}, ${SEGMENT_LABELS[seg]}, uniformity=${(r.uniformity*100).toFixed(0)}% (season ${r.season})`);
    }
  }
  // Market demand
  console.log(`\n📊 Market demand: red_s=${s.market.red_s.toFixed(2)} red_R=${s.market.red_R.toFixed(2)} white_s=${s.market.white_s.toFixed(2)} white_R=${s.market.white_R.toFixed(2)}`);
  console.log(`🔬 Unlocked: [${s.unlocked.join(', ')}]`);
  if (s.germplasm.length > 0) console.log(`🌾 Germplasm bank: ${s.germplasm.length} accessions`);
}

else if (cmd === 'list') {
  const s = load();
  console.log(`\n  #  | Color  | Shape | Yield  | Flavor | Disease`);
  console.log(`  ---|--------|-------|--------|--------|--------`);
  for (let i = 0; i < s.population.length; i++) {
    const p = s.population[i];
    const color = (p.phenotype.get('color') ?? 0) >= 0.5 ? 'Red  ' : 'White';
    const shapeVal = p.phenotype.get('shape');
    const shape = shapeVal === undefined ? '  ?  ' : shapeVal >= 1.5 ? 'Long ' : shapeVal >= 0.5 ? 'Med  ' : 'Round';
    const y = p.phenotype.has('yield') ? p.phenotype.get('yield')!.toFixed(1).padStart(5) : '  ?  ';
    const f = p.phenotype.has('flavor') ? p.phenotype.get('flavor')!.toFixed(1).padStart(5) : '  ?  ';
    const d = p.phenotype.has('disease') ? (p.phenotype.get('disease')! >= 0.5 ? '  R  ' : '  S  ') : '  ?  ';
    console.log(`  ${String(i).padStart(2)} | ${color} | ${shape} | ${y}  | ${f}  | ${d}`);
  }
}

else if (cmd === 'measure') {
  const traitName = args[0];
  const s = load();
  const { traits } = getEngine(s.seed);
  const traitObj = traits.find(t => t.name === traitName)!;
  if (!traitObj) { console.log('Unknown trait'); process.exit(1); }
  const costPer = MEASURE_COST[traitName] ?? 0;
  const unmeasured = s.population.filter(p => !p.phenotype.has(traitName));
  if (unmeasured.length === 0) { console.log('All already measured.'); process.exit(0); }
  const cost = unmeasured.length * costPer;
  if (s.budget < cost) { console.log(`Need $${cost}, have $${s.budget.toFixed(0)}`); process.exit(1); }
  const rng = trackedRng(getRng(s.seed, s.rngCalls));
  rngCounter = 0;
  for (const p of unmeasured) p.phenotype.set(traitName, computePhenotype(p, traitObj, rng));
  s.budget -= cost;
  s.rngCalls += rngCounter;
  save(s);
  console.log(`📏 Measured ${traitName} on ${unmeasured.length} plants (-$${cost}). Budget: $${s.budget.toFixed(0)}`);
}

else if (cmd === 'select') {
  const indices = args[0]?.split(',').map(Number) ?? [];
  const s = load();
  // Just print the selection — we'll use it in advance
  fs.writeFileSync('/tmp/bg-selection.json', JSON.stringify(indices));
  console.log(`Selected ${indices.length} parents:`);
  for (const i of indices) {
    const p = s.population[i];
    if (!p) { console.log(`  #${i}: INVALID INDEX`); continue; }
    const color = (p.phenotype.get('color') ?? 0) >= 0.5 ? 'Red' : 'White';
    const y = p.phenotype.has('yield') ? p.phenotype.get('yield')!.toFixed(1) : '?';
    const fl = p.phenotype.has('flavor') ? p.phenotype.get('flavor')!.toFixed(1) : '?';
    console.log(`  #${i}: ${color}, yield=${y}, flavor=${fl}`);
  }
}

else if (cmd === 'advance') {
  const popSize = parseInt(args[0] || '30');
  const s = load();
  const { map, traits } = getEngine(s.seed);
  let indices: number[];
  try { indices = JSON.parse(fs.readFileSync('/tmp/bg-selection.json', 'utf-8')); }
  catch { console.log('No parents selected! Use: select i,j,k'); process.exit(1); }
  if (indices.length === 0) { console.log('No parents selected!'); process.exit(1); }
  const parents = indices.map(i => s.population[i]).filter(Boolean);
  const cost = popSize * Costs.perPlant;
  if (s.budget < cost) { console.log(`Need $${cost}, have $${s.budget.toFixed(0)}`); process.exit(1); }

  const rng = trackedRng(getRng(s.seed, s.rngCalls));
  rngCounter = 0;

  const offspring: Individual[] = [];
  for (let i = 0; i < popSize; i++) {
    const mom = parents[Math.floor(rng() * parents.length)];
    const dad = parents[Math.floor(rng() * parents.length)];
    const child = crossIndividuals(mom, dad, map, traits, rng, 1)[0];
    for (const k of [...child.phenotype.keys()]) {
      if (!FREE_PHENOTYPES.has(k)) child.phenotype.delete(k);
    }
    offspring.push(child);
  }

  s.season++;
  s.budget -= cost;
  s.marketBaseline += MARKET_DRIFT_PER_SEASON;
  s.population = offspring;

  // Disease
  if (!s.diseaseActive && s.season >= DISEASE_GRACE_GENERATIONS && rng() < DISEASE_OUTBREAK_CHANCE) {
    s.diseaseActive = true;
    s.diseaseStartedAt = s.season;
    console.log(`🦠 DISEASE OUTBREAK in season ${s.season}!`);
  }
  if (s.diseaseActive && s.diseaseStartedAt != null) {
    const resistantRelease = s.releases.some(r => r.season >= s.diseaseStartedAt! && r.resistant);
    if (resistantRelease || s.season - s.diseaseStartedAt >= 6) {
      s.diseaseActive = false;
      s.diseaseStartedAt = null;
      console.log(`🌤 Disease subsided.`);
    }
  }

  // Market dynamics
  s.market = meanRevertMarket(s.market, 0.25);
  if (s.diseaseActive) {
    s.market.red_R = Math.max(s.market.red_R, 1.8);
    s.market.white_R = Math.max(s.market.white_R, 1.8);
    s.market.red_s = Math.min(s.market.red_s, 0.3);
    s.market.white_s = Math.min(s.market.white_s, 0.3);
  }

  // Trust recovery
  s.trust = Math.min(1, s.trust + 0.03);

  // Portfolio income with segmentation
  const segments = new Map<string, typeof s.releases>();
  for (const r of s.releases) {
    const k = segmentKey(r.color, r.resistant);
    const arr = segments.get(k) ?? [];
    arr.push(r);
    segments.set(k, arr);
  }
  const winners = new Set<string>();
  for (const [, group] of segments) {
    group.sort((a, b) => b.yield - a.yield);
    winners.add(group[0].name);
  }
  let income = 0;
  for (const r of s.releases) {
    const base = varietyBaseRevenue({
      yieldValue: r.yield, flavor: r.flavor, resistant: r.resistant,
      marketBaseline: s.marketBaseline, diseaseActive: s.diseaseActive,
    });
    const share = winners.has(r.name) ? 1 : COMPETITION_LOSER_SHARE;
    const seg = segmentKey(r.color, r.resistant);
    const demand = s.market[seg];
    income += Math.round(base * share * demand * s.trust);
  }
  s.budget += income;

  s.rngCalls += rngCounter;
  save(s);

  const red = offspring.filter(p => (p.phenotype.get('color') ?? 0) >= 0.5).length;
  console.log(`\n═══ Season ${s.season} ═══`);
  console.log(`Planted ${popSize} (-$${cost}) | Income +$${income} | Budget: $${s.budget.toFixed(0)}`);
  console.log(`Baseline: ${s.marketBaseline.toFixed(1)} | Disease: ${s.diseaseActive ? 'ACTIVE' : 'none'} | Trust: ${(s.trust*100).toFixed(0)}%`);
  console.log(`Pop: ${red} red, ${popSize-red} white`);
}

else if (cmd === 'release') {
  const idx = parseInt(args[0]);
  const name = args.slice(1).join(' ') || `Variety ${Date.now()}`;
  const s = load();
  const p = s.population[idx];
  if (!p) { console.log('Invalid index'); process.exit(1); }
  if (!p.phenotype.has('yield') || !p.phenotype.has('flavor')) {
    console.log('Must measure yield AND flavor first!'); process.exit(1);
  }
  if (s.budget < Costs.releaseFee) { console.log(`Need $${Costs.releaseFee}`); process.exit(1); }
  const dr0 = p.genotype.haplotypes[0].get('DR');
  const dr1 = p.genotype.haplotypes[1].get('DR');
  const resistant = dr0 === 'R' || dr1 === 'R';
  const color = p.phenotype.get('color') ?? 0;
  const uniformity = individualUniformity(p, FUNCTIONAL_LOCI);

  // Trust impact
  let trustDelta = 0;
  let trustNote = '';
  if (uniformity >= 0.9) { trustDelta = 0.05; trustNote = 'Farmers love it — uniform stand. Trust ↑'; }
  else if (uniformity >= 0.75) { trustDelta = 0; trustNote = 'Performs as expected.'; }
  else if (uniformity >= 0.55) { trustDelta = -0.15; trustNote = '⚠ Off-types reported. Trust ↓'; }
  else { trustDelta = -0.35; trustNote = '🚨 Severe segregation in field! Trust collapses.'; }

  s.budget -= Costs.releaseFee;
  s.trust = Math.max(0.1, Math.min(1, s.trust + trustDelta));
  const seg = segmentKey(color, resistant);
  s.releases.push({
    name, yield: p.phenotype.get('yield')!, flavor: p.phenotype.get('flavor')!,
    color, resistant, season: s.season, uniformity,
  });
  save(s);
  console.log(`📦 Released "${name}" — ${SEGMENT_LABELS[seg]}`);
  console.log(`   Yield=${p.phenotype.get('yield')!.toFixed(1)}, Flavor=${p.phenotype.get('flavor')!.toFixed(1)}`);
  console.log(`   Uniformity: ${(uniformity*100).toFixed(0)}% | Resistant: ${resistant}`);
  console.log(`   ${trustNote} (Trust now ${(s.trust*100).toFixed(0)}%)`);
}

else if (cmd === 'inspect') {
  const idx = parseInt(args[0]);
  const s = load();
  const p = s.population[idx];
  if (!p) { console.log('Invalid index'); process.exit(1); }
  console.log(`Plant #${idx} (${p.id}) | Gen ${p.generation} | Parents: ${p.parents ? p.parents.join(' × ') : 'founder'}`);
  console.log(`\nPhenotypes:`);
  for (const [k, v] of p.phenotype.entries()) console.log(`  ${k}: ${v.toFixed(2)}`);
  console.log(`\nKey loci:`);
  for (const loc of FUNCTIONAL_LOCI) {
    const a = p.genotype.haplotypes[0].get(loc) ?? '?';
    const b = p.genotype.haplotypes[1].get(loc) ?? '?';
    const homo = a === b ? ' (fixed)' : ' (het)';
    console.log(`  ${loc.padEnd(6)}: ${a}/${b}${homo}`);
  }
}

else if (cmd === 'tech') {
  const s = load();
  const unlockedSet = new Set(s.unlocked);
  console.log('\n🔬 Tech Tree:');
  for (const t of TECHS) {
    const status = unlockedSet.has(t.id) ? '✅' : canUnlock(t, unlockedSet, s.budget) ? '🔓' : '🔒';
    const reqStr = t.requires.length > 0 ? ` (requires: ${t.requires.join(', ')})` : '';
    console.log(`  ${status} ${t.name} [${t.id}] — $${t.cost}${reqStr}`);
    if (!unlockedSet.has(t.id)) console.log(`     ${t.description}`);
  }
}

else if (cmd === 'unlock') {
  const techId = args[0] as TechId;
  const s = load();
  const tech = TECHS_BY_ID[techId];
  if (!tech) { console.log('Unknown tech. Use: tech to see options.'); process.exit(1); }
  const unlockedSet = new Set(s.unlocked);
  if (!canUnlock(tech, unlockedSet, s.budget)) {
    console.log(`Can't unlock ${tech.name}. Need $${tech.cost} and prereqs: [${tech.requires.join(', ')}]`);
    process.exit(1);
  }
  s.budget -= tech.cost;
  s.unlocked.push(techId);
  save(s);
  console.log(`🔓 Unlocked: ${tech.name} (-$${tech.cost}). Budget: $${s.budget.toFixed(0)}`);
  console.log(`   "${tech.blurb}"`);
}

else if (cmd === 'cross') {
  const iA = parseInt(args[0]), iB = parseInt(args[1]), count = parseInt(args[2] || '5');
  const s = load();
  if (!s.unlocked.includes('controlled_cross') && iA !== iB) {
    console.log('Need to unlock controlled_cross first!'); process.exit(1);
  }
  const { map, traits } = getEngine(s.seed);
  const pA = s.population[iA], pB = s.population[iB];
  if (!pA || !pB) { console.log('Invalid index'); process.exit(1); }
  const cost = Costs.controlledCrossFee + count * Costs.perPlant;
  if (s.budget < cost) { console.log(`Need $${cost}`); process.exit(1); }
  const rng = trackedRng(getRng(s.seed, s.rngCalls));
  rngCounter = 0;
  const offspring = crossIndividuals(pA, pB, map, traits, rng, count);
  for (const o of offspring) {
    for (const k of [...o.phenotype.keys()]) {
      if (!FREE_PHENOTYPES.has(k)) o.phenotype.delete(k);
    }
  }
  s.population.push(...offspring);
  s.budget -= cost;
  s.rngCalls += rngCounter;
  save(s);
  const label = iA === iB ? `Selfed #${iA}` : `Crossed #${iA} × #${iB}`;
  console.log(`${label} → ${count} offspring added to population (-$${cost}). Budget: $${s.budget.toFixed(0)}`);
  console.log(`Pop size now: ${s.population.length}`);
}

else if (cmd === 'self') {
  // Redirect to cross with same parent
  const i = args[0];
  const n = args[1] || '5';
  process.argv = [process.argv[0], process.argv[1], 'cross', i, i, n];
  // just re-run cross logic inline
  const iA = parseInt(i), count = parseInt(n);
  const s = load();
  const { map, traits } = getEngine(s.seed);
  const pA = s.population[iA];
  if (!pA) { console.log('Invalid index'); process.exit(1); }
  const cost = Costs.controlledCrossFee + count * Costs.perPlant;
  if (s.budget < cost) { console.log(`Need $${cost}`); process.exit(1); }
  const rng = trackedRng(getRng(s.seed, s.rngCalls));
  rngCounter = 0;
  const offspring = crossIndividuals(pA, pA, map, traits, rng, count);
  for (const o of offspring) {
    for (const k of [...o.phenotype.keys()]) {
      if (!FREE_PHENOTYPES.has(k)) o.phenotype.delete(k);
    }
  }
  s.population.push(...offspring);
  s.budget -= cost;
  s.rngCalls += rngCounter;
  save(s);
  console.log(`Selfed #${iA} → ${count} offspring (-$${cost}). Budget: $${s.budget.toFixed(0)} | Pop: ${s.population.length}`);
}

else if (cmd === 'wildgerm') {
  const s = load();
  if (!s.unlocked.includes('wild_germplasm')) { console.log('Unlock wild_germplasm first!'); process.exit(1); }
  if (s.budget < Costs.wildAccession) { console.log(`Need $${Costs.wildAccession}`); process.exit(1); }
  const { map, traits } = getEngine(s.seed);
  const rng = trackedRng(getRng(s.seed, s.rngCalls));
  rngCounter = 0;
  const wild = randomFounder(map, rng);
  // Wild accessions carry disease resistance
  wild.genotype.haplotypes[0].set('DR', 'R');
  wild.genotype.haplotypes[1].set('DR', 'R');
  // Phenotype free traits
  for (const t of traits) {
    if (FREE_PHENOTYPES.has(t.name)) {
      wild.phenotype.set(t.name, computePhenotype(wild, t, rng));
    }
  }
  s.germplasm.push(wild);
  s.budget -= Costs.wildAccession;
  s.rngCalls += rngCounter;
  save(s);
  const color = (wild.phenotype.get('color') ?? 0) >= 0.5 ? 'Red' : 'White';
  console.log(`🌾 Acquired wild accession (${color}, DR=R/R). Bank now has ${s.germplasm.length}. Budget: $${s.budget.toFixed(0)}`);
}

else if (cmd === 'bank') {
  const s = load();
  if (s.germplasm.length === 0) { console.log('Germplasm bank is empty.'); process.exit(0); }
  console.log('\n🌾 Germplasm bank:');
  for (let i = 0; i < s.germplasm.length; i++) {
    const p = s.germplasm[i];
    const color = (p.phenotype.get('color') ?? 0) >= 0.5 ? 'Red' : 'White';
    console.log(`  [${i}] ${p.id} — ${color}, DR=R/R (wild)`);
  }
}

else if (cmd === 'introduce') {
  const idx = parseInt(args[0]);
  const s = load();
  const p = s.germplasm[idx];
  if (!p) { console.log('Invalid bank index'); process.exit(1); }
  s.population.push(p);
  s.germplasm.splice(idx, 1);
  save(s);
  console.log(`Introduced ${p.id} from bank into population. Pop: ${s.population.length}`);
}

else if (cmd === 'genotype') {
  const s = load();
  if (!s.unlocked.includes('marker_discovery')) { console.log('Unlock marker_discovery first!'); process.exit(1); }
  const { map } = getEngine(s.seed);
  const allLoci = map.chromosomes.flatMap(c => c.loci).map(l => l.id);
  const cost = s.population.length * Costs.genotypePerPlant;
  if (s.budget < cost) { console.log(`Need $${cost}`); process.exit(1); }
  s.markers = genotypeIndividuals(s.markers, s.population, allLoci);
  s.budget -= cost;
  save(s);
  console.log(`🧬 Genotyped ${s.population.length} plants (-$${cost}). Budget: $${s.budget.toFixed(0)}`);
}

else if (cmd === 'gwas') {
  const traitName = args[0];
  const s = load();
  if (!s.unlocked.includes('marker_discovery')) { console.log('Unlock marker_discovery first!'); process.exit(1); }
  const { map } = getEngine(s.seed);
  const phenotyped = s.population.filter(p => p.phenotype.has(traitName));
  if (phenotyped.length < 5) { console.log(`Need at least 5 plants with ${traitName} measured.`); process.exit(1); }
  const allLoci = map.chromosomes.flatMap(c => c.loci);
  const { knowledge, found } = discoverAssociations(s.markers, phenotyped, allLoci, traitName, 0.3);
  s.markers = knowledge;
  save(s);
  if (found.length === 0) console.log(`GWAS on ${traitName}: no significant associations.`);
  else {
    console.log(`GWAS on ${traitName}: found ${found.length} associations:`);
    for (const a of found) console.log(`  ${a.locusId}: effect=${a.effect.toFixed(2)}, favorable=${a.favorable}`);
  }
}

else if (cmd === 'associations') {
  const s = load();
  if (s.markers.associations.size === 0) { console.log('No associations discovered yet.'); process.exit(0); }
  console.log('\nDiscovered marker-trait associations:');
  for (const [, a] of s.markers.associations) {
    console.log(`  ${a.locusId} → ${a.traitName}: effect=${a.effect.toFixed(2)}, favorable=${a.favorable}`);
  }
}

else if (cmd === 'trainpredictor') {
  const s = load();
  if (!s.unlocked.includes('genomic_prediction')) { console.log('Unlock genomic_prediction first!'); process.exit(1); }
  if (s.budget < Costs.trainPredictor) { console.log(`Need $${Costs.trainPredictor}`); process.exit(1); }
  const { map } = getEngine(s.seed);
  const predictor = trainGenomicPredictor(s.population, map, 'yield', 1);
  if (!predictor) { console.log('Need more phenotyped data.'); process.exit(1); }
  s.predictor = predictor;
  s.budget -= Costs.trainPredictor;
  save(s);
  console.log(`🧠 Trained genomic predictor on ${s.population.length} plants (-$${Costs.trainPredictor}). Budget: $${s.budget.toFixed(0)}`);
}

else if (cmd === 'mutagenize') {
  const s = load();
  if (!s.unlocked.includes('mutagenesis')) { console.log('Unlock mutagenesis first!'); process.exit(1); }
  if (s.budget < Costs.mutagenize) { console.log(`Need $${Costs.mutagenize}`); process.exit(1); }
  const { map, traits } = getEngine(s.seed);
  const rng = trackedRng(getRng(s.seed, s.rngCalls));
  rngCounter = 0;
  s.population = mutagenize(s.population, map, traits, rng, 0.3);
  for (const p of s.population) {
    for (const k of [...p.phenotype.keys()]) {
      if (!FREE_PHENOTYPES.has(k)) p.phenotype.delete(k);
    }
  }
  s.budget -= Costs.mutagenize;
  s.rngCalls += rngCounter;
  save(s);
  console.log(`🧬 Mutagenized field (-$${Costs.mutagenize}). Budget: $${s.budget.toFixed(0)}`);
}

else if (cmd === 'edit') {
  const idx = parseInt(args[0]), locusId = args[1], allele = args[2];
  const s = load();
  if (!s.unlocked.includes('gene_editing')) { console.log('Unlock gene_editing first!'); process.exit(1); }
  if (s.budget < Costs.geneEdit) { console.log(`Need $${Costs.geneEdit}`); process.exit(1); }
  const { traits } = getEngine(s.seed);
  const rng = trackedRng(getRng(s.seed, s.rngCalls));
  rngCounter = 0;
  const edited = geneEdit(s.population[idx], locusId, allele, traits, rng);
  for (const k of [...edited.phenotype.keys()]) {
    if (!FREE_PHENOTYPES.has(k)) edited.phenotype.delete(k);
  }
  s.population[idx] = edited;
  s.budget -= Costs.geneEdit;
  s.rngCalls += rngCounter;
  save(s);
  console.log(`✂ Edited #${idx}: ${locusId} → ${allele}/${allele} (-$${Costs.geneEdit}). Budget: $${s.budget.toFixed(0)}`);
}

else {
  console.log('Commands: init, status, list, measure, select, advance, release, inspect, tech, unlock, cross, self, wildgerm, bank, introduce, genotype, gwas, associations, trainpredictor, mutagenize, edit');
}
