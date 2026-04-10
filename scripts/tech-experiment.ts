/**
 * Tech Tree Value Experiment
 *
 * Uses a strong genetics-aware baseline bot, then tests variants that
 * unlock and USE each tech tree item. Shows the marginal value of each tech.
 *
 * Run:  npx tsx scripts/tech-experiment.ts
 */

import { HeadlessGame } from './headless-game';
import { geneticValue } from '../src/engine/traits';
import { individualUniformity } from '../src/engine';
import type { Individual } from '../src/engine';
import type { GenomicPredictor } from '../src/engine/prediction';

const MAX_SEASONS = 25;
const RUNS = 500;

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
    g.cash -= sibSize;
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

// ── Shared baseline logic ───────────────────────────────────────────────
// Every bot gets this same core breeding loop.
// Tech-specific bots add behavior on top.

interface TechConfig {
  useControlledCross: boolean;
  useMAS: boolean;
  useGenomicPrediction: boolean;
  useWildGermplasm: boolean;
  useHybrid: boolean;
  useMutagenesis: boolean;
  useGeneEditing: boolean;
}

const NO_TECH: TechConfig = {
  useControlledCross: false,
  useMAS: false,
  useGenomicPrediction: false,
  useWildGermplasm: false,
  useHybrid: false,
  useMutagenesis: false,
  useGeneEditing: false,
};

function makeTechBot(config: TechConfig): BotFn {
  return (g: HeadlessGame) => {
    g.measureAllTraits('main');

    // Separate color pools (all bots know about color segments)
    const whites = g.sortByColor(g.main, 'white');
    const reds = g.sortByColor(g.main, 'red');
    if (whites.length >= 2) g.populations.set('white', whites);
    if (reds.length > 0) g.main = reds;

    let wildAcquired = false;
    let resistantPool: Individual[] = [];
    let predictor: GenomicPredictor | null = null;
    let inbredLineA: Individual | null = null;
    let inbredLineB: Individual | null = null;

    for (let s = 0; s < MAX_SEASONS && g.cash > 10; s++) {
      // ── Buy techs as needed ──
      if (config.useControlledCross && g.cash > 200 && !g.unlocked.has('controlled_cross'))
        g.buyTech('controlled_cross');
      if ((config.useMAS || config.useGenomicPrediction || config.useMutagenesis || config.useGeneEditing)
        && g.cash > 200 && !g.unlocked.has('diversity_dashboard'))
        g.buyTech('diversity_dashboard');
      if ((config.useMAS || config.useGenomicPrediction || config.useGeneEditing)
        && g.cash > 200 && !g.unlocked.has('marker_discovery') && g.unlocked.has('diversity_dashboard'))
        g.buyTech('marker_discovery');
      if ((config.useMAS || config.useGenomicPrediction || config.useGeneEditing)
        && g.cash > 200 && !g.unlocked.has('mas') && g.unlocked.has('marker_discovery'))
        g.buyTech('mas');
      if (config.useWildGermplasm && g.cash > 200 && !g.unlocked.has('diversity_dashboard'))
        g.buyTech('diversity_dashboard');
      if (config.useWildGermplasm && g.cash > 200 && !g.unlocked.has('wild_germplasm') && g.unlocked.has('diversity_dashboard'))
        g.buyTech('wild_germplasm');
      if (config.useHybrid && g.cash > 200 && !g.unlocked.has('controlled_cross'))
        g.buyTech('controlled_cross');
      if (config.useHybrid && g.cash > 200 && !g.unlocked.has('pedigree') && g.unlocked.has('controlled_cross'))
        g.buyTech('pedigree');
      if (config.useHybrid && g.cash > 300 && !g.unlocked.has('hybrid_breeding') && g.unlocked.has('pedigree'))
        g.buyTech('hybrid_breeding');
      if (config.useMutagenesis && g.cash > 200 && !g.unlocked.has('mutagenesis') && g.unlocked.has('marker_discovery'))
        g.buyTech('mutagenesis');
      if (config.useGeneEditing && g.cash > 300 && !g.unlocked.has('gene_editing') && g.unlocked.has('mas'))
        g.buyTech('gene_editing');
      if (config.useGenomicPrediction && g.cash > 300 && !g.unlocked.has('genomic_prediction') && g.unlocked.has('mas'))
        g.buyTech('genomic_prediction');

      // ── Parent selection ──
      // MAS/GP supplement phenotypic selection — pick top by phenotype,
      // then use markers to break ties or select within top candidates.
      // Larger popSize when using markers (need sample size for GWAS).
      const usesMarkers = (config.useMAS || config.useGenomicPrediction) && g.unlocked.has('mas');
      const popSize = usesMarkers ? 30 : 20;
      let redParents: Individual[];

      if (config.useGenomicPrediction && predictor && g.unlocked.has('genomic_prediction')) {
        // Select top 8 by phenotype, then re-rank by genomic prediction
        const phenoTop = g.sortByYield(g.main).slice(0, 8);
        redParents = g.genomicSelect(phenoTop, predictor, 3);
        if (redParents.length === 0) redParents = phenoTop.slice(0, 3);
      } else if (config.useMAS && g.unlocked.has('mas') && g.markers.associations.size > 0) {
        // Select top 8 by phenotype, then re-rank by marker EBV
        const phenoTop = g.sortByYield(g.main).slice(0, 8);
        const masRanked = g.masSelect('main', 'yield', 8);
        // Intersect: plants that are top by BOTH phenotype and markers
        const phenoIds = new Set(phenoTop.map(p => p.id));
        const both = masRanked.filter(p => phenoIds.has(p.id));
        redParents = both.length >= 3 ? both.slice(0, 3) : phenoTop.slice(0, 3);
      } else {
        redParents = g.sortByYield(g.main).slice(0, 3);
      }

      if (redParents.length > 0) {
        g.advanceSeason(new Map([['main', { parents: redParents, popSize }]]));
        g.measureAllTraits('main');
      }

      // ── GWAS / genotyping for MAS/GP ──
      if ((config.useMAS || config.useGenomicPrediction || config.useGeneEditing)
        && g.unlocked.has('marker_discovery') && g.markers.associations.size < 5 && g.cash > 80) {
        g.genotypePopulation('main');
        g.runGwas('main', 'yield');
      }

      // ── Train genomic predictor ──
      if (config.useGenomicPrediction && g.unlocked.has('genomic_prediction')
        && !predictor && g.cash > 80) {
        g.genotypePopulation('main');
        predictor = g.trainPredictor('main', 'yield');
        // Retrain every 5 seasons
      } else if (config.useGenomicPrediction && predictor && g.season % 5 === 0 && g.cash > 60) {
        g.genotypePopulation('main');
        predictor = g.trainPredictor('main', 'yield');
      }

      // ── White pool ──
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

      // ── Linkage breaking (all bots do this — it's genetics knowledge) ──
      if (g.season === 4 && g.cash > 120) {
        const bestRed = bestByYield(g.main);
        const bestWhite = bestByYield(g.populations.get('white') ?? []);
        if (bestRed && bestWhite) {
          const f1 = g.crossTwo(bestRed, bestWhite, 6);
          g.cash -= 6;
          if (f1.length > 0) {
            const f2 = g.selfOne(f1[0], 25);
            g.cash -= 25;
            g.populations.set('_f2', f2);
            g.measureAllTraits('_f2');
            const f2Pop = g.populations.get('_f2') ?? [];
            const goodW = g.sortByColor(g.sortByYield(f2Pop), 'white').slice(0, 4);
            const goodR = g.sortByColor(g.sortByYield(f2Pop), 'red').slice(0, 4);
            if (goodW.length > 0) {
              const existing = g.populations.get('white') ?? [];
              g.populations.set('white', [...existing, ...goodW]);
            }
            if (goodR.length > 0) g.main = [...g.main, ...goodR];
            g.populations.delete('_f2');
          }
        }
      }

      // ── Wild germplasm introgression ──
      if (config.useWildGermplasm && !wildAcquired && g.unlocked.has('wild_germplasm') && g.cash > 180) {
        const wild = g.acquireWild();
        const bestElite = bestByYield(g.main);
        if (bestElite && g.cash > 50) {
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

      // Backcross resistant lines periodically
      if (config.useWildGermplasm && resistantPool.length > 0 && g.season % 5 === 0 && g.cash > 80) {
        const bestElite = bestByYield(g.main);
        if (bestElite) {
          const bc = g.crossTwo(bestElite, resistantPool[0], 12);
          g.cash -= 12;
          g.populations.set('_bc', bc);
          g.measureAllTraits('_bc');
          const bcPop = g.populations.get('_bc') ?? [];
          const resistant = bcPop.filter(p => {
            const a = p.genotype.haplotypes[0].get('DR');
            const b = p.genotype.haplotypes[1].get('DR');
            return a === 'R' || b === 'R';
          });
          if (resistant.length > 0) resistantPool = g.sortByYield(resistant).slice(0, 5);
          g.populations.delete('_bc');
        }
      }

      // ── Mutagenesis ──
      if (config.useMutagenesis && g.unlocked.has('mutagenesis') && g.season % 6 === 0 && g.cash > 100) {
        // Mutagenize a small pool, screen for improved yield
        const best3 = g.sortByYield(g.main).slice(0, 3);
        if (best3.length > 0) {
          const mutPool = g.selfOne(best3[0], 20);
          g.cash -= 20;
          g.populations.set('_mut', mutPool);
          g.mutagenizePopulation('_mut');
          g.measureAllTraits('_mut');
          const improved = g.sortByYield(g.populations.get('_mut') ?? []);
          if (improved.length > 0 && (improved[0].phenotype.get('yield')! > (best3[0].phenotype.get('yield') ?? 0))) {
            g.main.push(improved[0]); // inject mutant into main pool
          }
          g.populations.delete('_mut');
        }
      }

      // ── Gene editing ──
      if (config.useGeneEditing && g.unlocked.has('gene_editing') && g.season % 8 === 0 && g.cash > 150) {
        // Edit the best plant: fix favorable alleles at known QTLs
        const best = bestByYield(g.main);
        if (best) {
          // Find QTL associations from GWAS
          const assocLoci = [...g.markers.associations.entries()]
            .filter(([, v]) => v.trait === 'yield')
            .map(([k]) => k);
          if (assocLoci.length > 0) {
            // Edit the first unfixed QTL
            const bestIdx = g.main.indexOf(best);
            if (bestIdx >= 0) {
              const locusId = assocLoci[0];
              const fav = g.markers.associations.get(locusId)?.favorableAllele;
              if (fav) {
                g.editGene('main', bestIdx, locusId, fav);
              }
            }
          }
        }
      }

      // ── Hybrid breeding ──
      if (config.useHybrid && g.unlocked.has('hybrid_breeding') && g.cash > 100) {
        // Develop/update inbred lines from best reds
        if (!inbredLineA || g.season % 4 === 0) {
          const topTwo = g.sortByYield(g.main).slice(0, 2);
          if (topTwo.length >= 2 && g.cash > 80) {
            inbredLineA = selfToUniformity(g, topTwo[0], 3, 8);
            inbredLineB = selfToUniformity(g, topTwo[1], 3, 8);
          }
        }
        // Release hybrid every 4 seasons
        if (inbredLineA && inbredLineB && g.season % 4 === 0) {
          g.releaseHybrid(inbredLineA, inbredLineB);
        }
      }

      // ── Forced release each season: pick best available, inbreed ──
      const redBest = bestByYield(g.main);
      const whiteBest = bestByYield(g.populations.get('white') ?? []);
      const resBest = resistantPool.length > 0 ? resistantPool[0] : null;

      // During disease, prefer resistant
      let releaseCandidate: Individual | null = null;
      if (g.diseaseActive && resBest && resBest.phenotype.has('yield')) {
        releaseCandidate = resBest;
      } else {
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
}

// ── Metrics ─────────────────────────────────────────────────────────────

interface Result {
  name: string;
  avgCash: number;
  avgTrust: number;
  avgReleases: number;
  avgEarned: number;
  avgGV: number;
  avgUniformity: number;
  brokeRate: number;
  pctWhite: number;
  resistantRels: number;
  hybridRels: number;
}

function run(name: string, fn: BotFn): Result {
  let tCash=0,tTrust=0,tRels=0,tEarn=0,tGV=0,tUnif=0,tBroke=0;
  let tWhite=0,tRes=0,tHyb=0;

  for (let i = 0; i < RUNS; i++) {
    const g = new HeadlessGame(i * 17 + 3);
    fn(g);

    tCash += g.cash;
    tTrust += g.trust;
    tRels += g.releases.length;
    tEarn += g.releases.reduce((s, r) => s + r.totalEarned, 0);
    if (g.cash < 0) tBroke++;
    if (g.whiteReleased) tWhite++;
    tRes += g.releases.filter(r => r.resistant).length;
    tHyb += g.releases.filter(r => r.id.startsWith('hyb_')).length;

    const uniforms = g.releases.map(r => r.uniformity);
    tUnif += uniforms.length > 0 ? uniforms.reduce((a,b)=>a+b,0) / uniforms.length : 0;

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
    avgGV: +(tGV / RUNS).toFixed(1),
    avgUniformity: +(tUnif / RUNS).toFixed(2),
    brokeRate: Math.round(tBroke / RUNS * 100),
    pctWhite: Math.round(tWhite / RUNS * 100),
    resistantRels: +(tRes / RUNS).toFixed(1),
    hybridRels: +(tHyb / RUNS).toFixed(1),
  };
}

// ── Experiments ──────────────────────────────────────────────────────────

const experiments: [string, TechConfig][] = [
  // Baseline: no tech at all (pure phenotypic + genetics knowledge)
  ['No tech (baseline)',           { ...NO_TECH }],

  // Individual techs ON (one at a time)
  ['+ Controlled cross',          { ...NO_TECH, useControlledCross: true }],
  ['+ Wild germplasm',            { ...NO_TECH, useWildGermplasm: true }],
  ['+ MAS',                       { ...NO_TECH, useMAS: true }],
  ['+ Genomic prediction',        { ...NO_TECH, useGenomicPrediction: true }],
  ['+ Hybrid breeding',           { ...NO_TECH, useHybrid: true }],
  ['+ Mutagenesis',               { ...NO_TECH, useMutagenesis: true }],
  ['+ Gene editing',              { ...NO_TECH, useGeneEditing: true }],

  // Combos
  ['MAS + Wild',                  { ...NO_TECH, useMAS: true, useWildGermplasm: true }],
  ['MAS + Hybrid',                { ...NO_TECH, useMAS: true, useHybrid: true }],
  ['GP + Wild + Hybrid',          { ...NO_TECH, useGenomicPrediction: true, useWildGermplasm: true, useHybrid: true }],

  // Everything
  ['ALL techs',                   {
    useControlledCross: true, useMAS: true, useGenomicPrediction: true,
    useWildGermplasm: true, useHybrid: true, useMutagenesis: true,
    useGeneEditing: true,
  }],
];

console.log(`\n🔬 TECH TREE VALUE EXPERIMENT — ${RUNS} runs × ${MAX_SEASONS} seasons`);
console.log(`   All bots use same genetics-aware baseline (color pools, linkage breaking, inbreeding).`);
console.log(`   Each row adds one tech on top. Which techs actually pay for themselves?\n`);

const hdr = [
  'Strategy'.padEnd(24),
  'Cash'.padStart(7),
  'Trust'.padStart(6),
  'Rels'.padStart(5),
  'Earn$'.padStart(7),
  'GV'.padStart(6),
  'Unif'.padStart(6),
  'Brk%'.padStart(5),
  'Wht%'.padStart(5),
  'Res'.padStart(4),
  'Hyb'.padStart(4),
].join(' ');
console.log(hdr);
console.log('─'.repeat(hdr.length));

for (const [name, config] of experiments) {
  const r = run(name, makeTechBot(config));
  console.log([
    r.name.padEnd(24),
    String(r.avgCash).padStart(7),
    String(r.avgTrust).padStart(6),
    String(r.avgReleases).padStart(5),
    String(r.avgEarned).padStart(7),
    String(r.avgGV).padStart(6),
    String(r.avgUniformity).padStart(6),
    `${r.brokeRate}%`.padStart(5),
    `${r.pctWhite}%`.padStart(5),
    String(r.resistantRels).padStart(4),
    String(r.hybridRels).padStart(4),
  ].join(' '));
}

console.log(`
INTERPRETATION:
  Compare each row to baseline. Positive Earn$ delta = tech pays for itself.
  GV = true genetic value (breeding progress, higher = better genetics).
  Res = disease resistance releases (big revenue during outbreaks).
  Hyb = hybrid variety releases (exploit heterosis).

  If a tech has negative cash delta: it costs more than it earns — bad ROI.
  If a tech boosts GV but not Earn$: teaches good genetics but game doesn't reward it enough.
  Both signals help us tune the economy.
`);
