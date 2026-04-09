import { useState } from 'react';
import type { ChallengeChildProps } from './ChallengeShell';

interface BackcrossData {
  options: number[];
  hint: string;
}

const BC_INFO: Record<number, { label: string; recovery: string; pct: number }> = {
  1: { label: 'BC1', recovery: '75%', pct: 75 },
  2: { label: 'BC2', recovery: '87.5%', pct: 87.5 },
  3: { label: 'BC3', recovery: '93.75%', pct: 93.75 },
  4: { label: 'BC4', recovery: '96.9%', pct: 96.9 },
};

/**
 * Backcross generations challenge.
 * Player selects how many backcross generations are needed for >87% elite genome recovery.
 */
export function BackcrossChallenge({ instance, onSubmit, submitted }: ChallengeChildProps) {
  const data = instance.data as BackcrossData;
  const [selected, setSelected] = useState<number | null>(null);
  const [showHint, setShowHint] = useState(false);

  function handleSubmit() {
    if (selected === null) return;
    onSubmit({ generations: selected });
  }

  return (
    <div className="space-y-4">
      {/* Scenario */}
      <div className="rounded-lg border border-sky/30 bg-sky/5 p-3">
        <p className="text-sm font-medium text-soil">
          You want to introgress a disease-resistance gene from a wild relative into your elite line.
        </p>
        <p className="mt-1 text-xs text-muted">
          How many backcross generations to the elite parent are needed to recover <strong>&gt;87%</strong> of the elite genome?
        </p>
      </div>

      {/* Parent comparison */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-leaf/20 bg-leaf/5 p-3 text-center">
          <div className="text-xs font-semibold uppercase text-muted">Elite Parent</div>
          <div className="mt-1 text-lg font-bold text-leaf">Yield: High</div>
          <div className="text-xs text-danger">Susceptible</div>
        </div>
        <div className="rounded-lg border border-accent/20 bg-accent/5 p-3 text-center">
          <div className="text-xs font-semibold uppercase text-muted">Wild Parent</div>
          <div className="mt-1 text-lg font-bold text-accent">Yield: Low</div>
          <div className="text-xs text-leaf">Resistant</div>
        </div>
      </div>

      {/* Options */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {data.options.map((gen) => {
          const info = BC_INFO[gen];
          if (!info) return null;
          const isSelected = selected === gen;
          const meetsThreshold = info.pct > 87;
          return (
            <button
              key={gen}
              onClick={() => !submitted && setSelected(gen)}
              disabled={submitted}
              className={`rounded-lg border-2 p-3 text-center transition-all ${
                isSelected
                  ? 'border-accent bg-accent/10 shadow-md'
                  : 'border-soil/10 bg-white hover:border-leaf/30'
              }`}
            >
              <div className="text-sm font-bold text-soil">{info.label}</div>
              <div className="mt-1 text-lg font-bold text-soil">{info.recovery}</div>
              <div className="text-[10px] text-muted">elite recovery</div>
              {/* Visual bar */}
              <div className="mx-auto mt-2 h-2 w-full overflow-hidden rounded-full bg-soil/10">
                <div
                  className={`h-full rounded-full ${meetsThreshold ? 'bg-leaf' : 'bg-accent/60'}`}
                  style={{ width: `${info.pct}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>

      {/* Threshold line note */}
      <div className="text-center text-[10px] text-muted">
        Target: &gt;87% elite genome recovery
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
        disabled={selected === null || submitted}
        className="w-full rounded bg-leaf py-2 text-sm font-semibold text-white disabled:opacity-40"
      >
        Check Answer
      </button>
    </div>
  );
}
