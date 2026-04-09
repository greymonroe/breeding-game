/**
 * Headless game runner — lets Claude play Artificial Selection
 * without a browser, calling the pure engine functions directly.
 */
import {
  computePhenotype,
  crossIndividuals,
  makeRng,
  meanHe,
  inbreedingCoefficient,
  meanPhenotype,
  type Individual,
  type RNG,
  type Trait,
  type GenomeMap,
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

// ── Initialize ──
const seed = 42;
const rng = makeRng(seed);
const starter = makeStarterPopulation(seed);
const { map, traits } = starter;

let population = starter.population;
let budget = 1500;
let season = 0;
let marketBaseline = starter.initialMarketBaseline;
let diseaseActive = false;
let diseaseStartedAt: number | null = null;
let releases: { name: string; yield: number; flavor: number; color: number; resistant: boolean; season: number }[] = [];

function stripPaid(ind: Individual) {
  for (const k of [...ind.phenotype.keys()]) {
    if (!FREE_PHENOTYPES.has(k)) ind.phenotype.delete(k);
  }
}

function measureAll(pop: Individual[], traitName: string) {
  const traitObj = traits.find(t => t.name === traitName)!;
  const cost_per = traitName === 'disease' ? 2 : 0.5;
  const unmeasured = pop.filter(p => !p.phenotype.has(traitName));
  const cost = unmeasured.length * cost_per;
  if (budget < cost) {
    console.log(`  ⚠ Can't afford to measure ${traitName} ($${cost} needed, have $${budget})`);
    return;
  }
  budget -= cost;
  for (const p of unmeasured) {
    p.phenotype.set(traitName, computePhenotype(p, traitObj, rng));
  }
  console.log(`  📏 Measured ${traitName} on ${unmeasured.length} plants (-$${cost})`);
}

function showPopulation(pop: Individual[]) {
  console.log(`\n  Population: ${pop.length} plants`);

  // Show color distribution
  const red = pop.filter(p => (p.phenotype.get('color') ?? 0) >= 0.5).length;
  const white = pop.length - red;
  console.log(`  Colors: ${red} red, ${white} white`);

  // Show yield if measured
  const yielded = pop.filter(p => p.phenotype.has('yield'));
  if (yielded.length > 0) {
    const yields = yielded.map(p => p.phenotype.get('yield')!);
    const mean = yields.reduce((a, b) => a + b, 0) / yields.length;
    const best = Math.max(...yields);
    const worst = Math.min(...yields);
    console.log(`  Yield: mean=${mean.toFixed(1)}, best=${best.toFixed(1)}, worst=${worst.toFixed(1)} (${yielded.length} measured)`);
  }

  // Show flavor if measured
  const flavored = pop.filter(p => p.phenotype.has('flavor'));
  if (flavored.length > 0) {
    const flavors = flavored.map(p => p.phenotype.get('flavor')!);
    const mean = flavors.reduce((a, b) => a + b, 0) / flavors.length;
    console.log(`  Flavor: mean=${mean.toFixed(1)} (${flavored.length} measured)`);
  }

  // Diversity
  const he = meanHe(pop, map);
  const f = inbreedingCoefficient(pop, map);
  console.log(`  Diversity: He=${he.toFixed(3)}, F=${f.toFixed(3)}`);
}

function selectTop(pop: Individual[], n: number, trait: string): Individual[] {
  const measured = pop.filter(p => p.phenotype.has(trait));
  measured.sort((a, b) => (b.phenotype.get(trait)! - a.phenotype.get(trait)!));
  return measured.slice(0, n);
}

function advanceSeason(parents: Individual[], popSize: number): Individual[] {
  const cost = popSize * Costs.perPlant;
  if (budget < cost) {
    console.log(`  ⚠ Can't afford to plant ($${cost} needed)`);
    return population;
  }
  budget -= cost;

  const offspring: Individual[] = [];
  for (let i = 0; i < popSize; i++) {
    const mom = parents[Math.floor(rng() * parents.length)];
    const dad = parents[Math.floor(rng() * parents.length)];
    const child = crossIndividuals(mom, dad, map, traits, rng, 1)[0];
    stripPaid(child);
    offspring.push(child);
  }

  season++;
  marketBaseline += MARKET_DRIFT_PER_SEASON;

  // Disease check
  if (!diseaseActive && season >= DISEASE_GRACE_GENERATIONS && rng() < DISEASE_OUTBREAK_CHANCE) {
    diseaseActive = true;
    diseaseStartedAt = season;
    console.log(`  🦠 DISEASE OUTBREAK!`);
  }
  if (diseaseActive && diseaseStartedAt != null && season - diseaseStartedAt >= 6) {
    diseaseActive = false;
    diseaseStartedAt = null;
    console.log(`  🌤 Disease subsided.`);
  }

  // Portfolio income
  let income = 0;
  for (const r of releases) {
    const rev = varietyBaseRevenue({
      yieldValue: r.yield,
      flavor: r.flavor,
      resistant: r.resistant,
      marketBaseline,
      diseaseActive,
    });
    income += Math.round(rev);
  }
  budget += income;

  console.log(`  Planted ${popSize} seeds (-$${cost}), portfolio income +$${income}`);
  return offspring;
}

function releaseVariety(ind: Individual, name: string) {
  if (!ind.phenotype.has('yield') || !ind.phenotype.has('flavor')) {
    console.log(`  ⚠ Must measure yield and flavor before release`);
    return;
  }
  budget -= Costs.releaseFee;
  const color = ind.phenotype.get('color') ?? 0;
  const dr0 = ind.genotype.haplotypes[0].get('DR');
  const dr1 = ind.genotype.haplotypes[1].get('DR');
  const resistant = dr0 === 'R' || dr1 === 'R';
  const rel = {
    name,
    yield: ind.phenotype.get('yield')!,
    flavor: ind.phenotype.get('flavor')!,
    color,
    resistant,
    season,
  };
  releases.push(rel);
  const seg = color >= 0.5 ? 'Red' : 'White';
  console.log(`  📦 Released "${name}" — ${seg}, yield=${rel.yield.toFixed(1)}, flavor=${rel.flavor.toFixed(1)}, resistant=${resistant}`);
}

// ════════════════════════════════════════════════════════════════════
// GAME START
// ════════════════════════════════════════════════════════════════════

console.log('╔════════════════════════════════════════╗');
console.log('║   ARTIFICIAL SELECTION — Headless Run  ║');
console.log('║   Player: Claude                       ║');
console.log('║   Seed: 42                             ║');
console.log('╚════════════════════════════════════════╝');
console.log(`\nStarting budget: $${budget}`);
console.log(`Market baseline: ${marketBaseline.toFixed(1)}`);

// ── Season 0: Survey the founders ──
console.log('\n═══ SEASON 0: Survey Founders ═══');
showPopulation(population);

// Measure yield and flavor on founders (they were phenotyped at creation but
// the game normally strips paid traits — our founders still have them from makeStarterPopulation)
// Let's check what we can see:
const hasYield = population.filter(p => p.phenotype.has('yield')).length;
console.log(`\n  Founders already have yield measured: ${hasYield}/${population.length}`);

// Founders from makeStarterPopulation were fully phenotyped. Let's use that.
// In the real game the player would pay to measure - let's measure if needed.
if (hasYield === 0) {
  measureAll(population, 'yield');
  measureAll(population, 'flavor');
}

showPopulation(population);

// ── Strategy: Mass selection for yield ──
// Select top 4 by yield for crossing (moderate selection intensity)
console.log('\n  DECISION: Select top 4 by yield as parents');
let parents = selectTop(population, 4, 'yield');
console.log(`  Selected parents (yield): ${parents.map(p => p.phenotype.get('yield')!.toFixed(1)).join(', ')}`);
console.log(`  Parent colors: ${parents.map(p => (p.phenotype.get('color')! >= 0.5 ? 'Red' : 'White')).join(', ')}`);

// ── Season 1 ──
console.log('\n═══ SEASON 1 ═══');
population = advanceSeason(parents, 30);
measureAll(population, 'yield');
measureAll(population, 'flavor');
showPopulation(population);
console.log(`  💰 Budget: $${budget.toFixed(0)} | Market baseline: ${marketBaseline.toFixed(1)}`);

// Select top 5 for next gen
parents = selectTop(population, 5, 'yield');
console.log(`  DECISION: Select top 5 by yield`);
console.log(`  Selected yields: ${parents.map(p => p.phenotype.get('yield')!.toFixed(1)).join(', ')}`);
console.log(`  Colors: ${parents.map(p => (p.phenotype.get('color')! >= 0.5 ? 'Red' : 'White')).join(', ')}`);

// ── Seasons 2-4 ──
for (let gen = 2; gen <= 4; gen++) {
  console.log(`\n═══ SEASON ${gen} ═══`);
  population = advanceSeason(parents, 30);
  measureAll(population, 'yield');
  measureAll(population, 'flavor');
  showPopulation(population);
  console.log(`  💰 Budget: $${budget.toFixed(0)} | Market baseline: ${marketBaseline.toFixed(1)}`);

  // Try to release best individual if yield is above baseline + 5
  const best = selectTop(population, 1, 'yield')[0];
  if (best && best.phenotype.get('yield')! > marketBaseline + 3 && releases.length === 0) {
    console.log(`  DECISION: Release best plant as first variety!`);
    releaseVariety(best, 'Pioneer Red');
  }

  // Select parents for next generation
  // Keep 5 parents but also try to maintain some white alleles
  const topYield = selectTop(population, 4, 'yield');
  const whites = population.filter(p => (p.phenotype.get('color') ?? 1) < 0.5 && p.phenotype.has('yield'));
  whites.sort((a, b) => (b.phenotype.get('yield')! - a.phenotype.get('yield')!));

  if (whites.length > 0 && gen >= 3) {
    // Include best white to maintain diversity
    parents = [...topYield, whites[0]];
    console.log(`  DECISION: Select top 4 + best white (yield=${whites[0].phenotype.get('yield')!.toFixed(1)}) to maintain color diversity`);
  } else {
    parents = topYield;
    console.log(`  DECISION: Select top 4 by yield`);
  }
  console.log(`  Colors: ${parents.map(p => (p.phenotype.get('color')! >= 0.5 ? 'Red' : 'White')).join(', ')}`);
}

// ── Seasons 5-10: Keep breeding, release white variety ──
for (let gen = 5; gen <= 12; gen++) {
  console.log(`\n═══ SEASON ${gen} ═══`);
  population = advanceSeason(parents, 30);
  measureAll(population, 'yield');
  measureAll(population, 'flavor');
  showPopulation(population);
  console.log(`  💰 Budget: $${budget.toFixed(0)} | Market baseline: ${marketBaseline.toFixed(1)} | Disease: ${diseaseActive ? 'ACTIVE' : 'none'}`);

  // Release logic
  const bestOverall = selectTop(population, 1, 'yield')[0];
  const whites = population.filter(p => (p.phenotype.get('color') ?? 1) < 0.5 && p.phenotype.has('yield'));
  whites.sort((a, b) => (b.phenotype.get('yield')! - a.phenotype.get('yield')!));

  // Release a white variety if we find a good one
  if (whites.length > 0 && !releases.find(r => r.color < 0.5)) {
    const bestWhite = whites[0];
    if (bestWhite.phenotype.get('yield')! > marketBaseline) {
      console.log(`  DECISION: Release best white variety!`);
      releaseVariety(bestWhite, 'Snow Queen');
    }
  }

  // Release improved red if much better than existing
  const existingRedYield = Math.max(...releases.filter(r => r.color >= 0.5).map(r => r.yield), 0);
  if (bestOverall && bestOverall.phenotype.get('yield')! > existingRedYield + 5 && (bestOverall.phenotype.get('color') ?? 0) >= 0.5) {
    console.log(`  DECISION: Release improved red variety!`);
    releaseVariety(bestOverall, `Red Advance ${gen}`);
  }

  // Selection: balance yield with diversity
  const topYield = selectTop(population, 4, 'yield');
  if (whites.length > 0) {
    parents = [...topYield, whites[0]];
    console.log(`  DECISION: Select top 4 + best white`);
  } else {
    parents = topYield;
    console.log(`  DECISION: Select top 4 (no whites available!)`);
  }
  console.log(`  Selected yields: ${parents.map(p => p.phenotype.get('yield')!.toFixed(1)).join(', ')}`);
}

// ── Final Summary ──
console.log('\n╔════════════════════════════════════════╗');
console.log('║         FINAL SUMMARY                  ║');
console.log('╚════════════════════════════════════════╝');
console.log(`Seasons played: ${season}`);
console.log(`Final budget: $${budget.toFixed(0)}`);
console.log(`Market baseline: ${marketBaseline.toFixed(1)}`);
console.log(`Released varieties: ${releases.length}`);
for (const r of releases) {
  console.log(`  - ${r.name}: yield=${r.yield.toFixed(1)}, flavor=${r.flavor.toFixed(1)}, ${r.color >= 0.5 ? 'Red' : 'White'}, resistant=${r.resistant}, released season ${r.season}`);
}
showPopulation(population);
