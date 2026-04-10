/**
 * Genetics Knowledge Experiment
 *
 * Tests whether understanding genetics actually wins the game.
 * Bots range from "random clicker" to "understands QTL linkage and inbreeding".
 *
 * Key question: does the game economy force players to learn genetics,
 * or can you win by just picking the tallest plants?
 *
 * NEW RULE: forced variety release every season (like a real breeding program
 * that must keep the pipeline moving). Release the best available — even if
 * it's bad. This makes the game more active and punishes ignorance faster.
 *
 * Run:  npx tsx scripts/genetics-experiment.ts
 */

import { HeadlessGame } from './headless-game';
import { geneticValue } from '../src/engine/traits';
import { individualUniformity, meanHe } from '../src/engine';
import type { Individual } from '../src/engine';

const MAX_SEASONS = 25;
const RUNS = 500;

const FUNCTIONAL_LOCI = [
  'COLOR', 'SHAPE', 'DR',
  'Y1', 'Y2', 'Y4', 'Y7', 'Y8', 'Y11', 'Y15', 'Y16', 'Y19', 'Y22',
  'F1', 'F4', 'F7',
];

// ── Helpers ─────────────────────────────────────────────────────────────

function bestByYield(pop: Individual[]): Individual | null {
  const measured = pop.filter(p => p.phenotype.has('yield'));
  if (measured.length === 0) return null;
  return measured.reduce((a, b) =>
    (a.phenotype.get('yield')! > b.phenotype.get('yield')!) ? a : b
  );
}

function selfToUniformity(
  g: HeadlessGame, ind: Individual, rounds: number, sibSize: number
): Individual | null {
  let current = ind;
  for (let i = 0; i < rounds; i++) {
    if (g.cash < sibSize * 3) return current;
    const sibs = g.selfOne(current, sibSize);
    g.cash -= sibSize; // perPlant cost
    g.populations.set('_self', sibs);
    g.measureAllTraits('_self');
    const best = bestByYield(sibs);
    g.populations.delete('_self');
    if (!best) return current;
    current = best;
  }
  return current;
}

type BotFn = (g: HeadlessGame) => void;

// ── Bot 1: RANDOM — picks parents randomly, releases best each season ──

const randomBot: BotFn = (g) => {
  g.measureAllTraits('main');
  for (let s = 0; s < MAX_SEASONS && g.cash > 10; s++) {
    // Random parent selection (2-6 parents, randomly chosen)
    const nParents = 2 + Math.floor(g.rng() * 5);
    const shuffled = [...g.main].sort(() => g.rng() - 0.5);
    const parents = shuffled.slice(0, Math.min(nParents, shuffled.length));

    g.advanceSeason(new Map([['main', { parents, popSize: 20 }]]));
    g.measureAllTraits('main');

    // Forced release: pick a random plant
    const candidate = g.main[Math.floor(g.rng() * g.main.length)];
    if (candidate) g.release(candidate);
  }
};

// ── Bot 2: PHENOTYPE ONLY — selects highest yield, no genetics knowledge ──
// This is the "good farmer who doesn't understand genetics" strategy.
// Picks top-yielding parents, releases the best plant each season.
// No inbreeding, no color strategy, no understanding of uniformity.

const phenotypeBot: BotFn = (g) => {
  g.measureAllTraits('main');
  for (let s = 0; s < MAX_SEASONS && g.cash > 10; s++) {
    // Select top yielders as parents
    const parents = g.sortByYield(g.main).slice(0, 4);
    if (parents.length === 0) break;

    g.advanceSeason(new Map([['main', { parents, popSize: 25 }]]));
    g.measureAllTraits('main');

    // Forced release: best yield, no concern about uniformity
    const best = bestByYield(g.main);
    if (best) g.release(best);
  }
};

// ── Bot 3: PHENOTYPE + INBREEDING — understands uniformity matters ──
// Knows that releasing segregating lines kills trust. Selfs before release.
// Still no color/linkage/market strategy.

const phenoInbreedBot: BotFn = (g) => {
  g.measureAllTraits('main');
  for (let s = 0; s < MAX_SEASONS && g.cash > 10; s++) {
    const parents = g.sortByYield(g.main).slice(0, 4);
    if (parents.length === 0) break;

    g.advanceSeason(new Map([['main', { parents, popSize: 25 }]]));
    g.measureAllTraits('main');

    // Forced release: inbreed best before releasing
    const best = bestByYield(g.main);
    if (best && g.cash > 60) {
      const line = selfToUniformity(g, best, 2, 10);
      if (line) g.release(line);
    } else if (best) {
      g.release(best);
    }
  }
};

// ── Bot 4: COLOR AWARE — understands market segments ──
// Knows red and white are different markets. Maintains both.
// Understands inbreeding. Doesn't understand linkage.

const colorAwareBot: BotFn = (g) => {
  g.measureAllTraits('main');

  // Separate red and white pools
  const whites = g.sortByColor(g.main, 'white');
  const reds = g.sortByColor(g.main, 'red');
  if (whites.length >= 2) g.populations.set('white', whites);
  if (reds.length >= 2) g.main = reds.length > 0 ? reds : g.main;

  for (let s = 0; s < MAX_SEASONS && g.cash > 10; s++) {
    // Advance red pool
    const redParents = g.sortByYield(g.main).slice(0, 4);
    if (redParents.length > 0) {
      g.advanceSeason(new Map([['main', { parents: redParents, popSize: 20 }]]));
      g.measureAllTraits('main');
    }

    // Advance white pool
    const wp = g.populations.get('white');
    if (wp && wp.length > 0 && g.cash > 50) {
      const wParents = g.sortByYield(wp).slice(0, 3);
      if (wParents.length > 0) {
        const off = g.openPollinate(wParents, 10);
        g.cash -= 10;
        g.populations.set('white', off);
        g.measureAllTraits('white');
      }
    }

    // Forced release: alternate red/white, inbreed first
    const isWhiteTurn = g.season % 2 === 0 && (g.populations.get('white')?.length ?? 0) > 0;
    const pool = isWhiteTurn ? (g.populations.get('white') ?? g.main) : g.main;
    const best = bestByYield(pool);
    if (best && g.cash > 60) {
      const line = selfToUniformity(g, best, 2, 10);
      if (line) g.release(line);
    } else if (best) {
      g.release(best);
    }
  }
};

// ── Bot 5: GENETICS AWARE — understands linkage, dominance, QTLs ──
// Knows about color-yield linkage (Y1 coupled with COLOR at 25cM).
// Actively breaks linkage by crossing red×white and selecting recombinants.
// Understands that white founders carry unique yield alleles (Y15).
// Inbreeds for uniformity. Diversifies across market segments.

const geneticsBot: BotFn = (g) => {
  g.measureAllTraits('main');

  // Phase 1: Identify best of each color, maintain both pools
  const whites = g.sortByColor(g.main, 'white');
  const reds = g.sortByColor(g.main, 'red');
  if (whites.length >= 2) g.populations.set('white', whites);
  if (reds.length > 0) g.main = reds;

  let linkageBroken = false;

  for (let s = 0; s < MAX_SEASONS && g.cash > 10; s++) {
    // Advance main (red) pool — fewer parents for faster fixation
    const redParents = g.sortByYield(g.main).slice(0, 3);
    if (redParents.length > 0) {
      g.advanceSeason(new Map([['main', { parents: redParents, popSize: 20 }]]));
      g.measureAllTraits('main');
    }

    // Advance white pool
    const wp = g.populations.get('white');
    if (wp && wp.length > 0 && g.cash > 40) {
      const wParents = g.sortByYield(wp).slice(0, 3);
      if (wParents.length > 0) {
        const off = g.openPollinate(wParents, 10);
        g.cash -= 10;
        g.populations.set('white', off);
        g.measureAllTraits('white');
      }
    }

    // KEY GENETICS MOVE: Break color-yield linkage
    // Cross best red × best white to create recombinants.
    // In F2, look for WHITE plants with HIGH yield (broke linkage with Y1)
    // and RED plants with Y15 alleles from white background.
    if (!linkageBroken && g.season >= 3 && g.cash > 150) {
      const bestRed = bestByYield(g.main);
      const bestWhite = bestByYield(g.populations.get('white') ?? []);
      if (bestRed && bestWhite) {
        const f1 = g.crossTwo(bestRed, bestWhite, 6);
        g.cash -= 6;
        if (f1.length > 0) {
          // Self F1 to get F2 segregants
          const f2 = g.selfOne(f1[0], 30);
          g.cash -= 30;
          g.populations.set('_f2', f2);
          g.measureAllTraits('_f2');

          // Find recombinants: high-yield whites (got Y1+ without COLOR)
          const f2Pop = g.populations.get('_f2') ?? [];
          const goodWhites = g.sortByColor(g.sortByYield(f2Pop), 'white').slice(0, 5);
          const goodReds = g.sortByColor(g.sortByYield(f2Pop), 'red').slice(0, 5);

          // Inject recombinants into pools
          if (goodWhites.length > 0) {
            const existing = g.populations.get('white') ?? [];
            g.populations.set('white', [...existing, ...goodWhites]);
          }
          if (goodReds.length > 0) {
            g.main = [...g.main, ...goodReds];
          }
          g.populations.delete('_f2');
          linkageBroken = true;
        }
      }
    }

    // Second linkage-breaking round for more recombinants
    if (linkageBroken && g.season >= 8 && g.season % 5 === 0 && g.cash > 120) {
      const bestRed = bestByYield(g.main);
      const bestWhite = bestByYield(g.populations.get('white') ?? []);
      if (bestRed && bestWhite) {
        const f1 = g.crossTwo(bestRed, bestWhite, 4);
        g.cash -= 4;
        if (f1.length > 0) {
          const f2 = g.selfOne(f1[0], 20);
          g.cash -= 20;
          g.populations.set('_f2', f2);
          g.measureAllTraits('_f2');
          const f2Pop = g.populations.get('_f2') ?? [];
          const goodWhites = g.sortByColor(g.sortByYield(f2Pop), 'white').slice(0, 3);
          const goodReds = g.sortByColor(g.sortByYield(f2Pop), 'red').slice(0, 3);
          if (goodWhites.length > 0) {
            const existing = g.populations.get('white') ?? [];
            g.populations.set('white', [...existing, ...goodWhites]);
          }
          if (goodReds.length > 0) g.main = [...g.main, ...goodReds];
          g.populations.delete('_f2');
        }
      }
    }

    // Forced release: strategic — inbreed, choose segment with best margin
    const redBest = bestByYield(g.main);
    const whiteBest = bestByYield(g.populations.get('white') ?? []);

    // Pick whichever has better yield premium over market baseline
    let releaseCandidate: Individual | null = null;
    if (redBest && whiteBest) {
      const redMargin = (redBest.phenotype.get('yield') ?? 0) - g.marketBaseline;
      const whiteMargin = (whiteBest.phenotype.get('yield') ?? 0) - g.marketBaseline;
      releaseCandidate = whiteMargin > redMargin ? whiteBest : redBest;
    } else {
      releaseCandidate = redBest ?? whiteBest;
    }

    if (releaseCandidate && g.cash > 50) {
      const line = selfToUniformity(g, releaseCandidate, 3, 10);
      if (line) g.release(line);
    } else if (releaseCandidate) {
      g.release(releaseCandidate);
    }
  }
};

// ── Bot 6: FULL GENETICIST — everything above + MAS + disease prep ──

const fullGeneticistBot: BotFn = (g) => {
  g.measureAllTraits('main');

  const whites = g.sortByColor(g.main, 'white');
  const reds = g.sortByColor(g.main, 'red');
  if (whites.length >= 2) g.populations.set('white', whites);
  if (reds.length > 0) g.main = reds;

  let linkageBroken = false;
  let wildAcquired = false;
  let resistantPool: Individual[] = [];

  for (let s = 0; s < MAX_SEASONS && g.cash > 10; s++) {
    // Buy tech when affordable
    if (g.cash > 300 && !g.unlocked.has('controlled_cross')) g.buyTech('controlled_cross');
    if (g.cash > 300 && !g.unlocked.has('diversity_dashboard')) g.buyTech('diversity_dashboard');
    if (g.cash > 300 && !g.unlocked.has('marker_discovery') && g.unlocked.has('diversity_dashboard')) g.buyTech('marker_discovery');
    if (g.cash > 300 && !g.unlocked.has('wild_germplasm') && g.unlocked.has('diversity_dashboard')) g.buyTech('wild_germplasm');

    // Advance red pool — tight selection
    const redParents = g.sortByYield(g.main).slice(0, 3);
    if (redParents.length > 0) {
      g.advanceSeason(new Map([['main', { parents: redParents, popSize: 20 }]]));
      g.measureAllTraits('main');
    }

    // Advance white pool
    const wp = g.populations.get('white');
    if (wp && wp.length > 0 && g.cash > 40) {
      const wParents = g.sortByYield(wp).slice(0, 3);
      if (wParents.length > 0) {
        const off = g.openPollinate(wParents, 10);
        g.cash -= 10;
        g.populations.set('white', off);
        g.measureAllTraits('white');
      }
    }

    // Break linkage (same as genetics bot)
    if (!linkageBroken && g.season >= 3 && g.cash > 150) {
      const bestRed = bestByYield(g.main);
      const bestWhite = bestByYield(g.populations.get('white') ?? []);
      if (bestRed && bestWhite) {
        const f1 = g.crossTwo(bestRed, bestWhite, 6);
        g.cash -= 6;
        if (f1.length > 0) {
          const f2 = g.selfOne(f1[0], 30);
          g.cash -= 30;
          g.populations.set('_f2', f2);
          g.measureAllTraits('_f2');
          const f2Pop = g.populations.get('_f2') ?? [];
          const goodWhites = g.sortByColor(g.sortByYield(f2Pop), 'white').slice(0, 5);
          const goodReds = g.sortByColor(g.sortByYield(f2Pop), 'red').slice(0, 5);
          if (goodWhites.length > 0) {
            const existing = g.populations.get('white') ?? [];
            g.populations.set('white', [...existing, ...goodWhites]);
          }
          if (goodReds.length > 0) g.main = [...g.main, ...goodReds];
          g.populations.delete('_f2');
          linkageBroken = true;
        }
      }
    }

    // Preemptive disease resistance introgression
    if (!wildAcquired && g.unlocked.has('wild_germplasm') && g.cash > 200) {
      const wild = g.acquireWild();
      const bestElite = bestByYield(g.main);
      if (bestElite && g.cash > 60) {
        const f1 = g.crossTwo(bestElite, wild, 8);
        g.cash -= 8;
        if (f1.length > 0) {
          const f2 = g.selfOne(f1[0], 25);
          g.cash -= 25;
          g.populations.set('_intro', f2);
          g.measureAllTraits('_intro');
          const intro = g.populations.get('_intro') ?? [];
          const resistant = intro.filter(p => {
            const a = p.genotype.haplotypes[0].get('DR');
            const b = p.genotype.haplotypes[1].get('DR');
            return a === 'R' || b === 'R';
          });
          resistantPool = g.sortByYield(resistant).slice(0, 5);
          g.populations.delete('_intro');
        }
      }
      wildAcquired = true;
    }

    // Backcross resistant lines to elite periodically
    if (resistantPool.length > 0 && g.season % 5 === 0 && g.cash > 100) {
      const bestElite = bestByYield(g.main);
      if (bestElite) {
        const bc = g.crossTwo(bestElite, resistantPool[0], 15);
        g.cash -= 15;
        g.populations.set('_bc', bc);
        g.measureAllTraits('_bc');
        const bcPop = g.populations.get('_bc') ?? [];
        const resistant = bcPop.filter(p => {
          const a = p.genotype.haplotypes[0].get('DR');
          const b = p.genotype.haplotypes[1].get('DR');
          return a === 'R' || b === 'R';
        });
        resistantPool = g.sortByYield(resistant).slice(0, 5);
        g.populations.delete('_bc');
      }
    }

    // Strategic release — consider disease resistance premium
    const redBest = bestByYield(g.main);
    const whiteBest = bestByYield(g.populations.get('white') ?? []);
    const resBest = resistantPool.length > 0 ? resistantPool[0] : null;

    // If disease active, prioritize resistant release
    let releaseCandidate: Individual | null = null;
    if (g.diseaseActive && resBest && resBest.phenotype.has('yield')) {
      releaseCandidate = resBest;
    } else {
      // Pick best margin across pools
      const candidates = [redBest, whiteBest, resBest].filter(Boolean) as Individual[];
      if (candidates.length > 0) {
        releaseCandidate = candidates.reduce((a, b) =>
          (a.phenotype.get('yield') ?? 0) > (b.phenotype.get('yield') ?? 0) ? a : b
        );
      }
    }

    if (releaseCandidate && g.cash > 50) {
      const line = selfToUniformity(g, releaseCandidate, 3, 10);
      if (line) g.release(line);
    } else if (releaseCandidate) {
      g.release(releaseCandidate);
    }
  }
};

// ── Metrics ─────────────────────────────────────────────────────────────

interface Result {
  name: string;
  avgCash: number;
  avgTrust: number;
  avgReleases: number;
  avgEarned: number;
  avgYield: number;    // mean yield of final population (genetic gain)
  avgUniformity: number; // mean uniformity of releases
  brokeRate: number;
  pctRed: number;
  pctWhite: number;
  avgGeneticValue: number; // true genetic value (no noise) — measures real gain
  resistantRels: number;
}

function run(name: string, fn: BotFn): Result {
  let tCash=0,tTrust=0,tRels=0,tEarn=0,tYield=0,tUnif=0,tBroke=0;
  let tRed=0,tWhite=0,tGV=0,tRes=0;

  for (let i = 0; i < RUNS; i++) {
    const g = new HeadlessGame(i * 17 + 3);
    fn(g);

    tCash += g.cash;
    tTrust += g.trust;
    tRels += g.releases.length;
    tEarn += g.releases.reduce((s, r) => s + r.totalEarned, 0);
    if (g.cash < 0) tBroke++;
    if (g.redReleased) tRed++;
    if (g.whiteReleased) tWhite++;
    tRes += g.releases.filter(r => r.resistant).length;

    // Mean uniformity of all releases
    const uniforms = g.releases.map(r => r.uniformity);
    tUnif += uniforms.length > 0 ? uniforms.reduce((a,b)=>a+b,0) / uniforms.length : 0;

    // Final population yield (phenotypic)
    const finalYields = g.main.filter(p => p.phenotype.has('yield')).map(p => p.phenotype.get('yield')!);
    tYield += finalYields.length > 0 ? finalYields.reduce((a,b)=>a+b,0) / finalYields.length : 0;

    // True genetic value of final pop (no environmental noise)
    const yieldTrait = g.traits.find(t => t.name === 'yield');
    if (yieldTrait) {
      const gvs = g.main.map(p => geneticValue(p, yieldTrait));
      tGV += gvs.reduce((a,b)=>a+b,0) / gvs.length;
    }
  }

  return {
    name,
    avgCash: Math.round(tCash / RUNS),
    avgTrust: +(tTrust / RUNS).toFixed(2),
    avgReleases: +(tRels / RUNS).toFixed(1),
    avgEarned: Math.round(tEarn / RUNS),
    avgYield: +(tYield / RUNS).toFixed(1),
    avgUniformity: +(tUnif / RUNS).toFixed(2),
    brokeRate: Math.round(tBroke / RUNS * 100),
    pctRed: Math.round(tRed / RUNS * 100),
    pctWhite: Math.round(tWhite / RUNS * 100),
    avgGeneticValue: +(tGV / RUNS).toFixed(1),
    resistantRels: +(tRes / RUNS).toFixed(1),
  };
}

// ── Run ─────────────────────────────────────────────────────────────────

const bots: [string, BotFn][] = [
  ['1. Random', randomBot],
  ['2. Phenotype only', phenotypeBot],
  ['3. Pheno + inbreed', phenoInbreedBot],
  ['4. + Color/segments', colorAwareBot],
  ['5. + Linkage breaking', geneticsBot],
  ['6. Full geneticist', fullGeneticistBot],
];

console.log(`\n🧬 GENETICS KNOWLEDGE EXPERIMENT — ${RUNS} runs × ${MAX_SEASONS} seasons`);
console.log(`   Does understanding genetics actually win the game?\n`);

const hdr = [
  'Strategy'.padEnd(24),
  'Cash'.padStart(7),
  'Trust'.padStart(6),
  'Rels'.padStart(5),
  'Earn$'.padStart(7),
  'Yield'.padStart(6),
  'GV'.padStart(6),
  'Unif'.padStart(6),
  'Brk%'.padStart(5),
  'Red%'.padStart(5),
  'Wht%'.padStart(5),
  'Res'.padStart(4),
].join(' ');
console.log(hdr);
console.log('─'.repeat(hdr.length));

for (const [name, fn] of bots) {
  const r = run(name, fn);
  console.log([
    r.name.padEnd(24),
    String(r.avgCash).padStart(7),
    String(r.avgTrust).padStart(6),
    String(r.avgReleases).padStart(5),
    String(r.avgEarned).padStart(7),
    String(r.avgYield).padStart(6),
    String(r.avgGeneticValue).padStart(6),
    String(r.avgUniformity).padStart(6),
    `${r.brokeRate}%`.padStart(5),
    `${r.pctRed}%`.padStart(5),
    `${r.pctWhite}%`.padStart(5),
    String(r.resistantRels).padStart(4),
  ].join(' '));
}

console.log(`
KEY METRICS:
  Cash    = ending cash (higher = more sustainable)
  Trust   = farmer trust (1.0 = perfect, <0.8 = problems)
  Rels    = total variety releases
  Earn$   = total lifetime earnings from varieties
  Yield   = mean phenotypic yield of final population
  GV      = mean TRUE genetic value (no env noise — real genetic gain)
  Unif    = mean uniformity of released varieties (>0.9 = uniform)
  Brk%    = % of runs that went bankrupt
  Red/Wht = % that released good red/white varieties (quest completion)
  Res     = avg resistant varieties released

INTERPRETATION:
  If genetics knowledge doesn't matter: bots 2-6 should perform similarly.
  If it DOES matter: there should be a clear staircase from 1→6.
  The game is well-designed if: random fails, phenotype-only struggles,
  and genetics-aware strategies clearly dominate.
`);
