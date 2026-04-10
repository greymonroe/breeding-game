/**
 * Interactive headless harness — run with commands like:
 *   npx tsx play.ts init
 *   npx tsx play.ts status
 *   npx tsx play.ts measure yield
 *   npx tsx play.ts list                    (show all plants with phenotypes)
 *   npx tsx play.ts select 0,1,4,7          (select plants by index)
 *   npx tsx play.ts advance 30              (advance season, grow 30 offspring)
 *   npx tsx play.ts release 3               (release plant at index 3)
 *   npx tsx play.ts inspect 3               (show genotype of plant at index)
 */
import fs from 'fs';
import {
  computePhenotype,
  crossIndividuals,
  makeRng,
  meanHe,
  inbreedingCoefficient,
  type Individual,
  type Trait,
  type GenomeMap,
  type Haplotype,
} from './src/engine/index.js';
import { makeStarterPopulation } from './src/game/starter.js';
import {
  Costs,
  MARKET_DRIFT_PER_SEASON,
  DISEASE_OUTBREAK_CHANCE,
  DISEASE_GRACE_GENERATIONS,
  varietyBaseRevenue,
  FREE_PHENOTYPES,
} from './src/game/economy.js';

const STATE_FILE = '/tmp/breeding-game-state.json';

// ── Serialization helpers (Maps don't JSON.stringify) ──
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

interface GameState {
  seed: number;
  season: number;
  budget: number;
  marketBaseline: number;
  diseaseActive: boolean;
  diseaseStartedAt: number | null;
  population: any[];
  releases: { name: string; yield: number; flavor: number; color: number; resistant: boolean; season: number }[];
  selectedIndices: number[];
  rngState: number; // how many rng calls we've made (for replay)
}

function save(state: GameState) {
  fs.writeFileSync(STATE_FILE, JSON.stringify({
    ...state,
    population: state.population.map(serializeInd),
  }, null, 2));
}

function load(): GameState & { population: Individual[] } {
  const raw = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
  return {
    ...raw,
    population: raw.population.map(deserializeInd),
  };
}

// We need the genome map and traits — rebuild from seed (deterministic)
function getEngine(seed: number) {
  const starter = makeStarterPopulation(seed);
  return { map: starter.map, traits: starter.traits };
}

// RNG: we create from seed and advance it by calling rng() `rngState` times
function getRng(seed: number, calls: number) {
  const rng = makeRng(seed + 999); // offset so game rng differs from starter rng
  for (let i = 0; i < calls; i++) rng();
  return { rng, calls };
}

const cmd = process.argv[2];
const args = process.argv.slice(3);

if (cmd === 'init') {
  const seed = 2026;
  const starter = makeStarterPopulation(seed);
  const rng = makeRng(seed + 999);
  // Founders come fully phenotyped from makeStarterPopulation, but in the real
  // game paid traits are stripped. Let's strip them to be authentic.
  for (const ind of starter.population) {
    for (const k of [...ind.phenotype.keys()]) {
      if (!FREE_PHENOTYPES.has(k)) ind.phenotype.delete(k);
    }
  }
  const state: GameState = {
    seed,
    season: 0,
    budget: 1500,
    marketBaseline: starter.initialMarketBaseline,
    diseaseActive: false,
    diseaseStartedAt: null,
    population: starter.population,
    releases: [],
    selectedIndices: [],
    rngState: 0,
  };
  save(state);
  console.log('🌱 Game initialized! Seed: 2026');
  console.log(`Budget: $${state.budget} | Market baseline: ${state.marketBaseline.toFixed(1)}`);
  console.log(`Population: ${state.population.length} founders`);
  console.log('Run: npx tsx play.ts status');
}

else if (cmd === 'status') {
  const s = load();
  console.log(`\n═══ Season ${s.season} ═══`);
  console.log(`💰 Budget: $${s.budget.toFixed(0)}`);
  console.log(`📈 Market baseline: ${s.marketBaseline.toFixed(1)}`);
  console.log(`🦠 Disease: ${s.diseaseActive ? 'ACTIVE' : 'none'}`);
  console.log(`🌿 Population: ${s.population.length} plants`);

  const red = s.population.filter(p => (p.phenotype.get('color') ?? 0) >= 0.5).length;
  console.log(`   Colors: ${red} red, ${s.population.length - red} white`);

  const yielded = s.population.filter(p => p.phenotype.has('yield'));
  if (yielded.length > 0) {
    const vals = yielded.map(p => p.phenotype.get('yield')!);
    console.log(`   Yield: mean=${(vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(1)}, best=${Math.max(...vals).toFixed(1)}, worst=${Math.min(...vals).toFixed(1)} (${yielded.length} measured)`);
  } else {
    console.log(`   Yield: not measured`);
  }

  const flav = s.population.filter(p => p.phenotype.has('flavor'));
  if (flav.length > 0) {
    const vals = flav.map(p => p.phenotype.get('flavor')!);
    console.log(`   Flavor: mean=${(vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(1)} (${flav.length} measured)`);
  }

  const { map } = getEngine(s.seed);
  console.log(`   He=${meanHe(s.population, map).toFixed(3)}, F=${inbreedingCoefficient(s.population, map).toFixed(3)}`);

  if (s.selectedIndices.length > 0) {
    console.log(`\n   Selected as parents: indices [${s.selectedIndices.join(', ')}]`);
  }

  if (s.releases.length > 0) {
    console.log(`\n📦 Released varieties:`);
    for (const r of s.releases) {
      console.log(`   - ${r.name}: yield=${r.yield.toFixed(1)}, flavor=${r.flavor.toFixed(1)}, ${r.color >= 0.5 ? 'Red' : 'White'}, resistant=${r.resistant} (season ${r.season})`);
    }
  }
}

else if (cmd === 'list') {
  const s = load();
  console.log(`\n  #  | Color  | Shape | Yield  | Flavor | Disease`);
  console.log(`  ---|--------|-------|--------|--------|--------`);
  for (let i = 0; i < s.population.length; i++) {
    const p = s.population[i];
    const color = (p.phenotype.get('color') ?? 0) >= 0.5 ? 'Red  ' : 'White';
    const shapeVal = p.phenotype.get('shape');
    const shape = shapeVal === undefined ? '?' : shapeVal >= 1.5 ? 'Long ' : shapeVal >= 0.5 ? 'Med  ' : 'Round';
    const y = p.phenotype.has('yield') ? p.phenotype.get('yield')!.toFixed(1).padStart(5) : '  ?  ';
    const f = p.phenotype.has('flavor') ? p.phenotype.get('flavor')!.toFixed(1).padStart(5) : '  ?  ';
    const d = p.phenotype.has('disease') ? (p.phenotype.get('disease')! >= 0.5 ? '  R  ' : '  S  ') : '  ?  ';
    const sel = s.selectedIndices.includes(i) ? ' ✓' : '';
    console.log(`  ${String(i).padStart(2)} | ${color} | ${shape} | ${y}  | ${f}  | ${d}${sel}`);
  }
}

else if (cmd === 'measure') {
  const traitName = args[0];
  if (!traitName) { console.log('Usage: measure <yield|flavor|disease>'); process.exit(1); }
  const s = load();
  const { traits } = getEngine(s.seed);
  const traitObj = traits.find(t => t.name === traitName)!;
  const costPer = traitName === 'disease' ? 2 : 0.5;
  const unmeasured = s.population.filter(p => !p.phenotype.has(traitName));
  const cost = unmeasured.length * costPer;
  if (s.budget < cost) { console.log(`Can't afford $${cost} (have $${s.budget})`); process.exit(1); }

  const { rng, calls } = getRng(s.seed, s.rngState);
  let rngCalls = 0;
  for (const p of unmeasured) {
    p.phenotype.set(traitName, computePhenotype(p, traitObj, rng));
    rngCalls++;
  }

  s.budget -= cost;
  s.rngState += rngCalls;
  save(s as any);
  console.log(`📏 Measured ${traitName} on ${unmeasured.length} plants (-$${cost}). Budget: $${s.budget.toFixed(0)}`);
}

else if (cmd === 'select') {
  const indices = args[0]?.split(',').map(Number) ?? [];
  const s = load();
  if (indices.some(i => i < 0 || i >= s.population.length)) {
    console.log(`Invalid index. Range: 0-${s.population.length - 1}`);
    process.exit(1);
  }
  s.selectedIndices = indices;
  save(s as any);
  console.log(`Selected ${indices.length} plants as parents: [${indices.join(', ')}]`);
  for (const i of indices) {
    const p = s.population[i];
    const color = (p.phenotype.get('color') ?? 0) >= 0.5 ? 'Red' : 'White';
    const y = p.phenotype.has('yield') ? p.phenotype.get('yield')!.toFixed(1) : '?';
    console.log(`  #${i}: ${color}, yield=${y}`);
  }
}

else if (cmd === 'advance') {
  const popSize = parseInt(args[0] || '30');
  const s = load();
  const { map, traits } = getEngine(s.seed);
  if (s.selectedIndices.length === 0) {
    console.log('No parents selected! Use: select 0,1,2,...');
    process.exit(1);
  }
  const cost = popSize * Costs.perPlant;
  if (s.budget < cost) { console.log(`Can't afford $${cost}`); process.exit(1); }

  const { rng, calls } = getRng(s.seed, s.rngState);
  let rngCalls = 0;

  const parents = s.selectedIndices.map(i => s.population[i]);
  const offspring: Individual[] = [];
  for (let i = 0; i < popSize; i++) {
    const mom = parents[Math.floor(rng() * parents.length)]; rngCalls++;
    const dad = parents[Math.floor(rng() * parents.length)]; rngCalls++;
    const child = crossIndividuals(mom, dad, map, traits, rng, 1)[0];
    // strip paid phenotypes
    for (const k of [...child.phenotype.keys()]) {
      if (!FREE_PHENOTYPES.has(k)) child.phenotype.delete(k);
    }
    offspring.push(child);
    rngCalls += 50; // approximate rng calls in crossIndividuals
  }

  s.season++;
  s.budget -= cost;
  s.marketBaseline += MARKET_DRIFT_PER_SEASON;

  // Disease check
  if (!s.diseaseActive && s.season >= DISEASE_GRACE_GENERATIONS) {
    const roll = rng(); rngCalls++;
    if (roll < DISEASE_OUTBREAK_CHANCE) {
      s.diseaseActive = true;
      s.diseaseStartedAt = s.season;
      console.log(`🦠 DISEASE OUTBREAK in season ${s.season}!`);
    }
  }
  if (s.diseaseActive && s.diseaseStartedAt != null && s.season - s.diseaseStartedAt >= 6) {
    s.diseaseActive = false;
    s.diseaseStartedAt = null;
    console.log(`🌤 Disease subsided.`);
  }

  // Portfolio income
  let income = 0;
  for (const r of s.releases) {
    const rev = varietyBaseRevenue({
      yieldValue: r.yield, flavor: r.flavor, resistant: r.resistant,
      marketBaseline: s.marketBaseline, diseaseActive: s.diseaseActive,
    });
    income += Math.round(rev);
  }
  s.budget += income;

  s.population = offspring;
  s.selectedIndices = [];
  s.rngState += rngCalls;
  save(s as any);

  const red = offspring.filter(p => (p.phenotype.get('color') ?? 0) >= 0.5).length;
  console.log(`\n═══ Season ${s.season} ═══`);
  console.log(`Planted ${popSize} seeds (-$${cost}), portfolio income +$${income}`);
  console.log(`Budget: $${s.budget.toFixed(0)} | Baseline: ${s.marketBaseline.toFixed(1)}`);
  console.log(`New population: ${red} red, ${popSize - red} white`);
  console.log(`Yield/flavor NOT measured yet — pay to phenotype.`);
}

else if (cmd === 'release') {
  const idx = parseInt(args[0]);
  const name = args.slice(1).join(' ') || `Variety ${Date.now()}`;
  const s = load();
  const p = s.population[idx];
  if (!p) { console.log('Invalid index'); process.exit(1); }
  if (!p.phenotype.has('yield') || !p.phenotype.has('flavor')) {
    console.log('Must measure yield and flavor first!');
    process.exit(1);
  }
  if (s.budget < Costs.releaseFee) { console.log(`Need $${Costs.releaseFee}`); process.exit(1); }

  const dr0 = p.genotype.haplotypes[0].get('DR');
  const dr1 = p.genotype.haplotypes[1].get('DR');
  const resistant = dr0 === 'R' || dr1 === 'R';
  const color = p.phenotype.get('color') ?? 0;

  s.budget -= Costs.releaseFee;
  s.releases.push({
    name, yield: p.phenotype.get('yield')!, flavor: p.phenotype.get('flavor')!,
    color, resistant, season: s.season,
  });
  save(s as any);
  console.log(`📦 Released "${name}" — ${color >= 0.5 ? 'Red' : 'White'}, yield=${p.phenotype.get('yield')!.toFixed(1)}, flavor=${p.phenotype.get('flavor')!.toFixed(1)}, resistant=${resistant}`);
}

else if (cmd === 'inspect') {
  const idx = parseInt(args[0]);
  const s = load();
  const p = s.population[idx];
  if (!p) { console.log('Invalid index'); process.exit(1); }
  console.log(`Plant #${idx} (${p.id})`);
  console.log(`Parents: ${p.parents ? p.parents.join(' × ') : 'founder'}`);
  console.log(`Generation: ${p.generation}`);
  console.log(`\nPhenotypes:`);
  for (const [k, v] of p.phenotype.entries()) console.log(`  ${k}: ${v.toFixed(2)}`);
  console.log(`\nKey loci (hap0 / hap1):`);
  for (const loc of ['COLOR', 'Y1', 'Y2', 'Y3', 'SHAPE', 'DR', 'F1', 'F2', 'F3', 'Y4', 'Y5', 'Y6', 'Y7']) {
    const a = p.genotype.haplotypes[0].get(loc) ?? '?';
    const b = p.genotype.haplotypes[1].get(loc) ?? '?';
    console.log(`  ${loc.padEnd(6)}: ${a} / ${b}`);
  }
}

else {
  console.log('Commands: init, status, list, measure <trait>, select <i,j,k>, advance <N>, release <i> [name], inspect <i>');
}
