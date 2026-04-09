import { useState } from 'react';
import type { ChallengeChildProps } from './ChallengeShell';

interface Plant {
  id: number;
  yield: number;
  mutant: boolean;
}

interface MutantScreenData {
  plants: Plant[];
  avgYield: number;
  hint: string;
}

/**
 * Mutant Screen challenge.
 * Player scans a 10x5 grid of 50 plants and clicks the one they think is the beneficial mutant.
 */
export function MutantScreenChallenge({ instance, onSubmit, submitted }: ChallengeChildProps) {
  const data = instance.data as MutantScreenData;
  const [selected, setSelected] = useState<number | null>(null);
  const [showHint, setShowHint] = useState(false);

  const yields = data.plants.map((p) => p.yield);
  const minY = Math.min(...yields);
  const maxY = Math.max(...yields);

  function yieldColor(y: number): string {
    const range = maxY - minY || 1;
    const ratio = (y - minY) / range;
    if (ratio < 0.33) return '#c0392b'; // danger / low
    if (ratio < 0.66) return '#e8d5a3'; // wheat / mid
    return '#4a7c59'; // leaf / high
  }

  function handleSubmit() {
    if (selected === null) return;
    onSubmit({ plantId: selected });
  }

  return (
    <div className="space-y-4">
      {/* Instructions */}
      <div className="rounded-lg border border-sky/30 bg-sky/5 p-3">
        <p className="text-sm font-medium text-soil">
          Find the <strong>beneficial mutant</strong> in this mutagenized population.
        </p>
        <p className="mt-1 text-xs text-muted">
          Average yield is <strong>{data.avgYield}</strong>. Plants are colored by yield:
          <span className="ml-1" style={{ color: '#c0392b' }}>low</span> /
          <span className="ml-1" style={{ color: '#e8d5a3' }}>mid</span> /
          <span className="ml-1" style={{ color: '#4a7c59' }}>high</span>.
          Click the plant you think carries a beneficial mutation.
        </p>
      </div>

      {/* Reference line */}
      <div className="flex items-center gap-2 text-xs text-muted">
        <span className="inline-block h-0.5 w-8 bg-accent" />
        Avg yield: {data.avgYield}
      </div>

      {/* 10x5 grid */}
      <div className="rounded-lg border border-soil/10 bg-white p-3">
        <div className="grid grid-cols-10 gap-1">
          {data.plants.map((plant) => {
            const isSelected = selected === plant.id;
            const bg = yieldColor(plant.yield);
            return (
              <button
                key={plant.id}
                onClick={() => !submitted && setSelected(plant.id)}
                disabled={submitted}
                title={`#${plant.id} — Yield: ${plant.yield}`}
                className={`relative flex h-12 w-full flex-col items-center justify-center rounded text-[9px] transition-all ${
                  isSelected
                    ? 'ring-2 ring-accent ring-offset-1 shadow-md'
                    : 'hover:ring-1 hover:ring-leaf/40'
                }`}
                style={{ backgroundColor: bg }}
              >
                <span className="font-bold text-white drop-shadow-sm">{plant.yield}</span>
                <span className="text-[7px] text-white/70">#{plant.id}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selection */}
      {selected !== null && (
        <div className="text-center text-sm text-soil">
          Selected: Plant <strong className="text-accent">#{selected}</strong>
          {' '}(yield: {data.plants.find((p) => p.id === selected)?.yield})
        </div>
      )}

      {/* Hint */}
      {!showHint && (
        <button onClick={() => setShowHint(true)} className="text-xs text-sky underline">
          Show hint
        </button>
      )}
      {showHint && (
        <p className="rounded border border-sky/20 bg-sky/5 p-2 text-xs text-soil">
          {data.hint}
        </p>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={selected === null || submitted}
        className="w-full rounded bg-leaf py-2 text-sm font-semibold text-white disabled:opacity-40"
      >
        Check Answer
      </button>
    </div>
  );
}
