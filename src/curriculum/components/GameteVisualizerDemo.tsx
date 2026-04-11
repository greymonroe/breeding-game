/**
 * GameteVisualizerDemo — dev harness for manual visual verification of
 * <GameteVisualizer />. Not wired into any page; import into any dev surface
 * to eyeball the animation against two canonical crosses:
 *
 *   1. Monohybrid Rr × Rr (2 gametes/parent, 2×2 Punnett, 3:1 expected).
 *   2. Dihybrid Rr Ss × Rr Ss (4 gametes/parent, 4×4 Punnett, 9:3:3:1).
 *
 * Having both instances on one screen makes regressions in the dihybrid
 * Punnett view catchable visually — colors, gamete enumeration, and
 * phenotype composition all exercised at once.
 */

import { GameteVisualizer } from './GameteVisualizer';
import { FLOWER_COLOR, SEED_SHAPE, makeOrganism } from '../genetics-engine';

export default function GameteVisualizerDemo() {
  // Rr × Rr monohybrid pea cross: the canonical 3:1 Mendel monohybrid.
  const monoA = makeOrganism({ color: ['R', 'r'] }, 'demo-mono-A');
  const monoB = makeOrganism({ color: ['R', 'r'] }, 'demo-mono-B');

  // Rr Ss × Rr Ss dihybrid pea cross: 9:3:3:1 from two independent
  // monohybrid segregations multiplied together.
  const diA = makeOrganism(
    { color: ['R', 'r'], shape: ['S', 's'] },
    'demo-di-A',
  );
  const diB = makeOrganism(
    { color: ['R', 'r'], shape: ['S', 's'] },
    'demo-di-B',
  );

  return (
    <div className="min-h-screen bg-stone-100 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <div className="text-2xl font-bold text-stone-800">
            Gamete Visualizer — dev harness
          </div>
          <div className="text-sm text-stone-600">
            Two instances side by side: monohybrid and dihybrid.
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="text-sm font-bold text-stone-700">
              Monohybrid — Rr × Rr (pea flower color)
            </div>
            <div className="text-xs text-stone-500">
              Expected F2: ~3 Red : 1 White. Punnett grid should be 2×2.
            </div>
            <GameteVisualizer
              parentA={monoA}
              parentB={monoB}
              genes={[FLOWER_COLOR]}
              sampleSize={16}
              autoPlay
              onComplete={offspring => {
                // eslint-disable-next-line no-console
                console.log(
                  '[GameteVisualizerDemo:mono] cycle complete',
                  offspring.length,
                  'offspring built',
                );
              }}
            />
          </div>

          <div className="space-y-3">
            <div className="text-sm font-bold text-stone-700">
              Dihybrid — Rr Ss × Rr Ss (color + seed shape)
            </div>
            <div className="text-xs text-stone-500">
              Expected F2: ~9 Red Round : 3 Red Wrinkled : 3 White Round : 1 White Wrinkled.
              Punnett grid should be 4×4.
            </div>
            <GameteVisualizer
              parentA={diA}
              parentB={diB}
              genes={[FLOWER_COLOR, SEED_SHAPE]}
              sampleSize={16}
              autoPlay
              onComplete={offspring => {
                // eslint-disable-next-line no-console
                console.log(
                  '[GameteVisualizerDemo:dihybrid] cycle complete',
                  offspring.length,
                  'offspring built',
                );
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
