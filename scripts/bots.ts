/**
 * Bot harness v2 for Artificial Selection.
 *
 * Run:  npx tsx scripts/bots.ts
 */

import { HeadlessGame } from './headless-game';
import { meanHe } from '../src/engine';
import type { Individual } from '../src/engine';

const MAX_SEASONS = 40;
const RUNS = 100;

type BotFn = (g: HeadlessGame) => void;

// ─── Helpers ───────────────────────────────────────────────────────────

function inbreed(
  g: HeadlessGame,
  candidate: Individual,
  rounds: number,
  sibSize: number,
  colorFilter?: 'red' | 'white'
): Individual | null {
  let c = candidate;
  for (let i = 0; i < rounds; i++) {
    if (g.cash < sibSize * 4) return null;
    const sibs = g.selfOne(c, sibSize);
    g.cash -= sibSize * 1; // perPlant
    g.populations.set('_ib', sibs);
    g.measureAllTraits('_ib');
    let pool = g.sortByYield(sibs);
    if (colorFilter) pool = g.sortByColor(pool, colorFilter);
    if (pool.length === 0) return null;
    c = pool[0];
    g.populations.delete('_ib');
  }
  return c;
}

function advanceMain(g: HeadlessGame, nParents: number, popSize: number) {
  const parents = g.sortByYield(g.main).slice(0, nParents);
  if (parents.length === 0) return;
  g.advanceSeason(new Map([['main', { parents, popSize }]]));
  g.measureAllTraits('main');
}

// ─── Bot 1: Naive ──────────────────────────────────────────────────────

const naiveBot: BotFn = (g) => {
  g.measureAllTraits('main');
  for (let s = 0; s < MAX_SEASONS && g.cash > 30; s++) {
    advanceMain(g, 8, 30);
    if (g.season % 3 === 0) {
      const best = g.sortByYield(g.main)[0];
      if (best) g.release(best);
    }
  }
};

// ─── Bot 2: Spammer ────────────────────────────────────────────────────

const spammerBot: BotFn = (g) => {
  g.measureAllTraits('main');
  for (let s = 0; s < MAX_SEASONS && g.cash > 30; s++) {
    advanceMain(g, 8, 30);
    const best = g.sortByYield(g.main)[0];
    if (best) g.release(best);
  }
};

// ─── Bot 3: Inbreeder ──────────────────────────────────────────────────

const inbreederBot: BotFn = (g) => {
  g.measureAllTraits('main');

  // Red first
  const reds = g.sortByColor(g.sortByYield(g.main), 'red');
  if (reds.length > 0 && g.cash > 200) {
    const line = inbreed(g, reds[0], 4, 15, 'red');
    if (line) g.release(line);
  }

  for (let s = g.season; s < MAX_SEASONS && g.cash > 30; s++) {
    advanceMain(g, 6, 25);
    // White attempt
    if (!g.whiteReleased && g.season >= 5 && g.cash > 200) {
      const whites = g.sortByColor(g.sortByYield(g.main), 'white');
      if (whites.length > 0 && whites[0].phenotype.get('yield')! > g.marketBaseline + 2) {
        const line = inbreed(g, whites[0], 4, 15, 'white');
        if (line) g.release(line);
      }
    }
    // Improved red periodically
    if (g.season % 6 === 0 && g.cash > 200) {
      const best = g.sortByColor(g.sortByYield(g.main), 'red')[0];
      if (best) {
        const line = inbreed(g, best, 3, 12, 'red');
        if (line) g.release(line);
      }
    }
  }
};

// ─── Bot 4: Diversity ──────────────────────────────────────────────────

const diversityBot: BotFn = (g) => {
  g.measureAllTraits('main');
  const whites = g.sortByColor(g.main, 'white');
  if (whites.length >= 2) {
    g.populations.set('white_pool', whites);
    const reds = g.sortByColor(g.main, 'red');
    if (reds.length > 0) g.main = reds;
  }

  for (let s = 0; s < MAX_SEASONS && g.cash > 50; s++) {
    // Adaptive sizing to conserve cash
    const popSize = g.cash > 600 ? 20 : 15;
    const parents = g.sortByYield(g.main).slice(0, 5);
    if (parents.length > 0) {
      g.advanceSeason(new Map([['main', { parents, popSize }]]));
      g.measureAllTraits('main');
    }
    // White pool - smaller to save cash
    const wp = g.populations.get('white_pool');
    if (wp && wp.length > 0 && g.cash > 150) {
      const wParents = g.sortByYield(wp).slice(0, 3);
      if (wParents.length > 0) {
        const off = g.openPollinate(wParents, 8);
        g.cash -= 8;
        g.populations.set('white_pool', off);
        g.measureAllTraits('white_pool');
      }
    }
    // Recombinant cross every 5 seasons
    if (g.season % 5 === 0 && wp && wp.length > 0 && g.cash > 200) {
      const bm = g.sortByYield(g.main)[0];
      const bw = g.sortByYield(wp)[0];
      if (bm && bw) {
        const f1 = g.crossTwo(bm, bw, 8);
        g.cash -= 8;
        if (f1.length > 0) {
          const f2 = g.selfOne(f1[0], 15);
          g.cash -= 15;
          g.populations.set('_rec', f2);
          g.measureAllTraits('_rec');
          const goodW = g.sortByColor(g.sortByYield(f2), 'white').slice(0, 3);
          if (goodW.length > 0) {
            g.populations.set('white_pool', [...(wp), ...goodW]);
          }
          g.populations.delete('_rec');
        }
      }
    }
    // Release red
    if (!g.redReleased && g.season >= 3 && g.cash > 200) {
      const best = g.sortByColor(g.sortByYield(g.main), 'red')[0];
      if (best) { const l = inbreed(g, best, 4, 12, 'red'); if (l) g.release(l); }
    }
    // Release white
    if (!g.whiteReleased && g.season >= 6 && g.cash > 150) {
      const allW = [...(g.populations.get('white_pool') ?? []), ...g.sortByColor(g.main, 'white')];
      const best = g.sortByYield(allW)[0];
      if (best && best.phenotype.get('yield')! > g.marketBaseline) {
        const l = inbreed(g, best, 4, 12, 'white');
        if (l) g.release(l);
      }
    }
    // Improved releases periodically
    if (g.season % 7 === 0 && g.cash > 250) {
      const bestR = g.sortByColor(g.sortByYield(g.main), 'red')[0];
      if (bestR) { const l = inbreed(g, bestR, 3, 10, 'red'); if (l) g.release(l); }
    }
  }
};

// ─── Bot 5: Disease-reactive (buys wild accession, introgresses R) ─────

const diseaseBot: BotFn = (g) => {
  g.measureAllTraits('main');
  // Red first
  const reds = g.sortByColor(g.sortByYield(g.main), 'red');
  if (reds.length > 0 && g.cash > 200) {
    const line = inbreed(g, reds[0], 4, 15, 'red');
    if (line) g.release(line);
  }

  let wildAcquired = false;
  let introgressedPop: Individual[] = [];

  for (let s = g.season; s < MAX_SEASONS && g.cash > 30; s++) {
    advanceMain(g, 6, 20);

    // Buy wild germplasm tech early (preemptively at s=4) + acquire accession
    if (!wildAcquired && g.cash > 300 && g.season >= 4) {
      if (!g.unlocked.has('diversity_dashboard')) g.buyTech('diversity_dashboard');
      if (!g.unlocked.has('wild_germplasm')) g.buyTech('wild_germplasm');
      if (g.unlocked.has('wild_germplasm') && g.cash > 100) {
        const wild = g.acquireWild();
        // Cross wild × best elite → introgression
        const bestElite = g.sortByYield(g.main)[0];
        if (bestElite && g.cash > 80) {
          const f1 = g.crossTwo(bestElite, wild, 15);
          g.cash -= 15;
          // Self F1 for F2
          if (f1.length > 0 && g.cash > 60) {
            const f2 = g.selfOne(f1[0], 40);
            g.cash -= 40;
            g.populations.set('introgression', f2);
            g.measureAllTraits('introgression');
            // Find resistant + high-yield individuals
            const intro = g.populations.get('introgression') ?? [];
            const resistant = intro.filter((p) => {
              const a = p.genotype.haplotypes[0].get('DR');
              const b = p.genotype.haplotypes[1].get('DR');
              return a === 'R' || b === 'R';
            });
            const resYield = g.sortByYield(resistant);
            if (resYield.length > 0) {
              // Inbreed best resistant line
              const line = inbreed(g, resYield[0], 3, 15);
              if (line) g.release(line);
              // Keep resistant pool for further breeding
              introgressedPop = resYield.slice(0, 5);
            }
            g.populations.delete('introgression');
          }
        }
        wildAcquired = true;
      }
    }

    // Continue introgression breeding for more resistant releases
    if (introgressedPop.length > 0 && g.season % 5 === 0 && g.cash > 200) {
      // Backcross to elite
      const bestElite = g.sortByYield(g.main)[0];
      const bestRes = introgressedPop[0];
      if (bestElite && bestRes) {
        const bc = g.crossTwo(bestElite, bestRes, 20);
        g.cash -= 20;
        g.populations.set('_bc', bc);
        g.measureAllTraits('_bc');
        const bcPop = g.populations.get('_bc') ?? [];
        const resistant = bcPop.filter((p) => {
          const a = p.genotype.haplotypes[0].get('DR');
          const b = p.genotype.haplotypes[1].get('DR');
          return a === 'R' || b === 'R';
        });
        const resYield = g.sortByYield(resistant);
        if (resYield.length > 0) {
          const line = inbreed(g, resYield[0], 3, 12);
          if (line) g.release(line);
          introgressedPop = resYield.slice(0, 5);
        }
        g.populations.delete('_bc');
      }
    }

    // Improved releases
    if (g.season % 6 === 0 && g.cash > 200) {
      const best = g.sortByYield(g.main)[0];
      if (best) {
        const line = inbreed(g, best, 3, 12);
        if (line) g.release(line);
      }
    }
  }
};

// ─── Bot 6: Smart adaptive (tech + market + disease + diversity) ───────

const smartBot: BotFn = (g) => {
  g.measureAllTraits('main');

  // Preserve whites early
  const whites = g.sortByColor(g.main, 'white');
  if (whites.length >= 2) {
    g.populations.set('white_pool', whites);
    const reds = g.sortByColor(g.main, 'red');
    if (reds.length > 0) g.main = reds;
  }

  let bestRedYield = 0;
  let wildAcquired = false;
  let resistantPool: Individual[] = [];

  for (let s = 0; s < MAX_SEASONS && g.cash > 50; s++) {
    // Adaptive sizing
    const popSize = g.cash > 800 ? 30 : g.cash > 400 ? 20 : 12;
    const nP = Math.max(8, Math.min(14, Math.floor(popSize * 0.45)));

    // Buy tech in order when affordable
    if (g.cash > 500 && !g.unlocked.has('controlled_cross')) g.buyTech('controlled_cross');
    if (g.cash > 400 && !g.unlocked.has('diversity_dashboard')) g.buyTech('diversity_dashboard');
    if (g.cash > 500 && !g.unlocked.has('marker_discovery') && g.unlocked.has('diversity_dashboard')) g.buyTech('marker_discovery');
    if (g.cash > 500 && !g.unlocked.has('mas') && g.unlocked.has('marker_discovery')) g.buyTech('mas');
    if (g.cash > 400 && !g.unlocked.has('wild_germplasm') && g.unlocked.has('diversity_dashboard')) g.buyTech('wild_germplasm');

    // Advance main
    advanceMain(g, nP, popSize);

    // Advance white pool
    const wp = g.populations.get('white_pool');
    if (wp && wp.length > 0 && g.cash > 100) {
      const parents = g.sortByYield(wp).slice(0, 3);
      if (parents.length > 0) {
        const off = g.openPollinate(parents, 10);
        g.cash -= 10;
        g.populations.set('white_pool', off);
        g.measureAllTraits('white_pool');
      }
    }

    // GWAS once
    if (g.unlocked.has('marker_discovery') && g.markers.associations.size < 5 && g.cash > 100) {
      g.genotypePopulation('main');
      g.runGwas('main', 'yield');
    }

    // Recombinant cross every 4s
    if (g.season % 4 === 0 && wp && wp.length > 0 && g.cash > 100) {
      const bm = g.sortByYield(g.main)[0];
      const bw = g.sortByYield(wp)[0];
      if (bm && bw) {
        const f1 = g.crossTwo(bm, bw, 10);
        g.cash -= 10;
        if (f1.length > 0) {
          const f2 = g.selfOne(f1[0], 20);
          g.cash -= 20;
          g.populations.set('_rec', f2);
          g.measureAllTraits('_rec');
          const goodW = g.sortByColor(g.sortByYield(f2), 'white').slice(0, 3);
          if (goodW.length > 0) {
            g.populations.set('white_pool', [...(wp), ...goodW]);
          }
          const goodR = g.sortByColor(g.sortByYield(f2), 'red').slice(0, 3);
          for (const r of goodR) g.main.push(r);
          g.populations.delete('_rec');
        }
      }
    }

    // Disease response: acquire wild + introgress
    if (!wildAcquired && g.unlocked.has('wild_germplasm') && (g.diseaseActive || g.season >= 6) && g.cash > 150) {
      const wild = g.acquireWild();
      const bestElite = g.sortByYield(g.main)[0];
      if (bestElite && g.cash > 60) {
        const f1 = g.crossTwo(bestElite, wild, 10);
        g.cash -= 10;
        if (f1.length > 0) {
          const f2 = g.selfOne(f1[0], 25);
          g.cash -= 25;
          g.populations.set('_intro', f2);
          g.measureAllTraits('_intro');
          g.measureTrait('_intro', 'disease');
          const resistant = (g.populations.get('_intro') ?? []).filter((p) => {
            const a = p.genotype.haplotypes[0].get('DR');
            const b = p.genotype.haplotypes[1].get('DR');
            return a === 'R' || b === 'R';
          });
          const resYield = g.sortByYield(resistant);
          if (resYield.length > 0) {
            const line = inbreed(g, resYield[0], 3, 12);
            if (line) g.release(line);
            resistantPool = resYield.slice(0, 5);
          }
          g.populations.delete('_intro');
        }
      }
      wildAcquired = true;
    }

    // Periodically improve resistant lines via backcross to elite
    if (resistantPool.length > 0 && g.season % 6 === 0 && g.cash > 150) {
      const bestElite = g.sortByYield(g.main)[0];
      const bestRes = resistantPool[0];
      if (bestElite && bestRes) {
        const bc = g.crossTwo(bestElite, bestRes, 15);
        g.cash -= 15;
        g.populations.set('_bc', bc);
        g.measureAllTraits('_bc');
        const bcPop = g.populations.get('_bc') ?? [];
        const resistant = bcPop.filter((p) => {
          const a = p.genotype.haplotypes[0].get('DR');
          const b = p.genotype.haplotypes[1].get('DR');
          return a === 'R' || b === 'R';
        });
        const resYield = g.sortByYield(resistant);
        if (resYield.length > 0) {
          const line = inbreed(g, resYield[0], 3, 12);
          if (line) g.release(line);
          resistantPool = resYield.slice(0, 5);
        }
        g.populations.delete('_bc');
      }
    }

    // Release red — only if significantly better than last
    if (g.cash > 150) {
      const bestRed = g.sortByColor(g.sortByYield(g.main), 'red')[0];
      if (bestRed && bestRed.phenotype.get('yield')! > Math.max(bestRedYield + 2, g.marketBaseline + 3)) {
        const line = inbreed(g, bestRed, 4, 12, 'red');
        if (line) {
          const r = g.release(line);
          if (r.ok && r.uniformity >= 0.8) bestRedYield = line.phenotype.get('yield')!;
        }
      }
    }

    // Release white
    if (!g.whiteReleased && g.season >= 5 && g.cash > 150) {
      const allW = [...(g.populations.get('white_pool') ?? []), ...g.sortByColor(g.main, 'white')];
      const bestW = g.sortByYield(allW)[0];
      if (bestW && bestW.phenotype.get('yield')! > g.marketBaseline) {
        const line = inbreed(g, bestW, 4, 12, 'white');
        if (line) g.release(line);
      }
    }

    if (g.cash < -200) break;
  }
};

// ─── Parameter sweep ───────────────────────────────────────────────────

function makeParamBot(opts: {
  popSize: number; nParents: number; selfRounds: number; releaseEvery: number;
}): BotFn {
  return (g) => {
    g.measureAllTraits('main');
    for (let s = 0; s < MAX_SEASONS && g.cash > 20; s++) {
      advanceMain(g, opts.nParents, opts.popSize);
      if (g.season % opts.releaseEvery === 0) {
        let c = g.sortByYield(g.main)[0];
        if (c && opts.selfRounds > 0) {
          const l = inbreed(g, c, opts.selfRounds, 12);
          if (l) c = l;
        }
        if (c) g.release(c);
      }
    }
  };
}

// ─── Results ───────────────────────────────────────────────────────────

interface Result {
  name: string;
  avgCash: number; avgTrust: number; avgSeasons: number; avgRels: number;
  pctRed: number; avgRedAt: string; pctWhite: number; avgWhiteAt: string;
  avgHe: number; avgEarned: number; brokeRate: number;
  diseaseSeasonsAvg: number; resistantReleasePct: number;
}

function run(name: string, fn: BotFn, runs = RUNS): Result {
  let tCash=0,tTrust=0,tSzn=0,tRed=0,tWhite=0,tRedAt=0,tWhiteAt=0;
  let tHe=0,tEarn=0,tBroke=0,tRels=0,tDisease=0,tResRel=0;
  for (let i = 0; i < runs; i++) {
    const g = new HeadlessGame(i * 13 + 1);
    fn(g);
    tCash += g.cash; tTrust += g.trust; tSzn += g.season;
    if (g.redReleased) { tRed++; tRedAt += g.redReleasedAt!; }
    if (g.whiteReleased) { tWhite++; tWhiteAt += g.whiteReleasedAt!; }
    tHe += meanHe(g.main, g.map);
    tEarn += g.releases.reduce((s,r)=>s+r.totalEarned,0);
    if (g.cash < 0) tBroke++;
    tRels += g.releases.length;
    // Count disease seasons from log
    tDisease += g.log.filter(l=>l.diseaseActive).length;
    tResRel += g.releases.filter(r=>r.resistant).length;
  }
  return {
    name,
    avgCash: Math.round(tCash/runs),
    avgTrust: +(tTrust/runs).toFixed(2),
    avgSeasons: +(tSzn/runs).toFixed(1),
    avgRels: +(tRels/runs).toFixed(1),
    pctRed: Math.round(tRed/runs*100),
    avgRedAt: tRed>0?(tRedAt/tRed).toFixed(1):'–',
    pctWhite: Math.round(tWhite/runs*100),
    avgWhiteAt: tWhite>0?(tWhiteAt/tWhite).toFixed(1):'–',
    avgHe: +(tHe/runs).toFixed(3),
    avgEarned: Math.round(tEarn/runs),
    brokeRate: Math.round(tBroke/runs*100),
    diseaseSeasonsAvg: +(tDisease/runs).toFixed(1),
    resistantReleasePct: Math.round(tResRel/Math.max(1,tRels)*100),
  };
}

// ─── Run ───────────────────────────────────────────────────────────────

const bots: [string, BotFn][] = [
  ['Naive (top8, rel/3s)', naiveBot],
  ['Spammer (rel every s)', spammerBot],
  ['Inbreeder (self 4)', inbreederBot],
  ['Diversity (2 pools)', diversityBot],
  ['Disease-reactive', diseaseBot],
  ['Smart (full adaptive)', smartBot],
];

const sweeps = [
  { popSize: 15, nParents: 3, selfRounds: 0, releaseEvery: 3 },
  { popSize: 15, nParents: 3, selfRounds: 4, releaseEvery: 4 },
  { popSize: 30, nParents: 4, selfRounds: 0, releaseEvery: 3 },
  { popSize: 30, nParents: 4, selfRounds: 4, releaseEvery: 4 },
  { popSize: 30, nParents: 8, selfRounds: 4, releaseEvery: 5 },
  { popSize: 50, nParents: 6, selfRounds: 4, releaseEvery: 5 },
  { popSize: 50, nParents: 10, selfRounds: 0, releaseEvery: 3 },
];
for (const c of sweeps) {
  bots.push([`p${c.popSize}/n${c.nParents}/s${c.selfRounds}/r${c.releaseEvery}`, makeParamBot(c)]);
}

console.log(`\n🧬 Artificial Selection Bot Sim v2 — ${RUNS} runs, ${MAX_SEASONS} max seasons\n`);
const hdr = [
  'Strategy'.padEnd(30),
  'Cash'.padStart(6),
  'Trst'.padStart(5),
  'Szns'.padStart(5),
  'Rels'.padStart(5),
  'Red%'.padStart(5),
  'R@'.padStart(4),
  'Wht%'.padStart(5),
  'W@'.padStart(4),
  'He'.padStart(6),
  'Earn$'.padStart(7),
  'Brk%'.padStart(5),
  'Dis'.padStart(4),
  'Res%'.padStart(5),
].join(' ');
console.log(hdr);
console.log('─'.repeat(hdr.length));

for (const [name, fn] of bots) {
  const r = run(name, fn);
  console.log([
    r.name.padEnd(30),
    String(r.avgCash).padStart(6),
    String(r.avgTrust).padStart(5),
    String(r.avgSeasons).padStart(5),
    String(r.avgRels).padStart(5),
    `${r.pctRed}%`.padStart(5),
    r.avgRedAt.padStart(4),
    `${r.pctWhite}%`.padStart(5),
    r.avgWhiteAt.padStart(4),
    String(r.avgHe).padStart(6),
    String(r.avgEarned).padStart(7),
    `${r.brokeRate}%`.padStart(5),
    String(r.diseaseSeasonsAvg).padStart(4),
    `${r.resistantReleasePct}%`.padStart(5),
  ].join(' '));
}
console.log();
