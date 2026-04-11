/**
 * GameteVisualizerDemo — tiny dev harness for manual visual verification of
 * <GameteVisualizer />. Not wired into any page; import into any dev surface
 * to eyeball the animation against an Rr × Rr monohybrid pea cross.
 *
 * This harness is intentionally minimal. It does not exercise dihybrid,
 * incomplete dominance, or step-through mode — those are easy to verify by
 * tweaking props here.
 */

import { GameteVisualizer } from './GameteVisualizer';
import { FLOWER_COLOR, makeOrganism } from '../genetics-engine';

export default function GameteVisualizerDemo() {
  // Rr × Rr monohybrid pea cross: the canonical 3:1 Mendel monohybrid.
  const parentA = makeOrganism({ color: ['R', 'r'] }, 'demo-A');
  const parentB = makeOrganism({ color: ['R', 'r'] }, 'demo-B');

  return (
    <div className="min-h-screen bg-stone-100 p-8">
      <div className="max-w-3xl mx-auto space-y-4">
        <div>
          <div className="text-2xl font-bold text-stone-800">
            Gamete Visualizer — dev harness
          </div>
          <div className="text-sm text-stone-600">
            Rr × Rr (pea flower color). Expected F1: ~3 Red : 1 White.
          </div>
        </div>
        <GameteVisualizer
          parentA={parentA}
          parentB={parentB}
          genes={[FLOWER_COLOR]}
          sampleSize={16}
          autoPlay
          onComplete={offspring => {
            // eslint-disable-next-line no-console
            console.log(
              '[GameteVisualizerDemo] cycle complete',
              offspring.length,
              'offspring built',
            );
          }}
        />
      </div>
    </div>
  );
}
