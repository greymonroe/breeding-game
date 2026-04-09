import { useState } from 'react';
import type { ChallengeChildProps } from './ChallengeShell';

interface Seedling {
  id: string;
  markers: { Y1: number; Y7: number; Y15: number };
  trueYield: number;
}

interface MASData {
  seedlings: Seedling[];
  hint: string;
}

const MARKER_LABELS: Record<number, string> = { 0: '-/-', 1: '+/-', 2: '+/+' };
const MARKER_COLORS: Record<number, string> = {
  0: 'bg-danger/20 text-danger',
  1: 'bg-wheat text-soil',
  2: 'bg-leaf/20 text-leaf',
};

/**
 * Marker-Assisted Selection ranking challenge.
 * Player selects the top 3 seedlings based on marker genotypes.
 */
export function MASRankingChallenge({ instance, onSubmit, submitted }: ChallengeChildProps) {
  const data = instance.data as MASData;
  const [selected, setSelected] = useState<string[]>([]);
  const [showHint, setShowHint] = useState(false);

  function toggle(id: string) {
    if (submitted) return;
    if (selected.includes(id)) {
      setSelected(selected.filter((s) => s !== id));
    } else if (selected.length < 3) {
      setSelected([...selected, id]);
    }
  }

  function handleSubmit() {
    if (selected.length !== 3) return;
    onSubmit({ topThree: selected });
  }

  return (
    <div className="space-y-4">
      {/* Instructions */}
      <div className="rounded-lg border border-sky/30 bg-sky/5 p-3">
        <p className="text-sm font-medium text-soil">
          Select the <strong>top 3</strong> seedlings using marker data.
        </p>
        <p className="mt-1 text-xs text-muted">
          Each marker locus shows copies of the favorable (+) allele. More + alleles = higher expected yield.
        </p>
      </div>

      {/* Seedling grid */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {data.seedlings.map((s) => {
          const isSelected = selected.includes(s.id);
          const rank = selected.indexOf(s.id);
          return (
            <button
              key={s.id}
              onClick={() => toggle(s.id)}
              disabled={submitted}
              className={`relative rounded-lg border-2 p-3 text-left transition-all ${
                isSelected
                  ? 'border-accent bg-accent/10 shadow-md'
                  : 'border-soil/10 bg-white hover:border-leaf/30'
              }`}
            >
              {isSelected && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white">
                  {rank + 1}
                </span>
              )}
              <div className="text-sm font-bold text-soil">{s.id}</div>
              <div className="mt-2 space-y-1">
                {(['Y1', 'Y7', 'Y15'] as const).map((m) => (
                  <div key={m} className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-muted">{m}</span>
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${MARKER_COLORS[s.markers[m]]}`}>
                      {MARKER_LABELS[s.markers[m]]}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-2 text-center text-xs text-muted">
                Score: {s.markers.Y1 + s.markers.Y7 + s.markers.Y15}/6
              </div>
            </button>
          );
        })}
      </div>

      {/* Selection status */}
      <div className="text-center text-xs text-muted">
        {selected.length}/3 selected
        {selected.length === 3 && <span className="ml-2 text-leaf font-semibold">Ready to submit</span>}
      </div>

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
        disabled={selected.length !== 3 || submitted}
        className="w-full rounded bg-leaf py-2 text-sm font-semibold text-white disabled:opacity-40"
      >
        Check Answer
      </button>
    </div>
  );
}
