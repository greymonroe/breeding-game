import { useState } from 'react';
import type { ChallengeChildProps } from './ChallengeShell';

interface BackcrossData {
  options: number[];
  hint: string;
  targetPct: number;
}

/**
 * Backcross generations challenge.
 * Player selects how many backcross generations are needed AND calculates
 * the elite-genome recovery percentage for that generation.
 */
export function BackcrossChallenge({ instance, onSubmit, submitted }: ChallengeChildProps) {
  const data = instance.data as BackcrossData;
  const targetPct = data.targetPct ?? 87;
  const [selected, setSelected] = useState<number | null>(null);
  const [pctInput, setPctInput] = useState('');

  function handleSubmit() {
    if (selected === null || pctInput === '') return;
    onSubmit({ generations: selected, recoveryPct: parseFloat(pctInput) });
  }

  return (
    <div className="space-y-4">
      {/* Scenario */}
      <div className="rounded-lg border border-sky/30 bg-sky/5 p-3">
        <p className="text-sm font-medium text-soil">
          You want to introgress a disease-resistance gene from a wild relative into your elite line.
        </p>
        <p className="mt-1 text-xs text-muted">
          How many backcross generations to the elite parent are needed to recover{' '}
          <strong>&gt;{targetPct}%</strong> of the elite genome?
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

      {/* Concept diagram */}
      <div className="rounded-lg border border-soil/10 bg-soil/5 p-3">
        <p className="text-xs font-semibold text-soil">How backcrossing works</p>
        <div className="mt-2 space-y-1">
          <div className="flex items-center gap-2 text-[11px] text-muted">
            <span className="font-mono font-bold text-soil">F1</span>
            <span>&rarr;</span>
            <span>50% elite, 50% wild</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-muted">
            <span className="font-mono font-bold text-soil">BC<em>n</em></span>
            <span>&rarr;</span>
            <span>Cross back to elite parent: <strong>halves</strong> remaining wild genome each time</span>
          </div>
        </div>
        <p className="mt-2 text-[11px] text-muted italic">
          Think: what fraction of the genome is wild after <em>n</em> backcrosses?
        </p>
      </div>

      {/* Step 1: choose generation */}
      <div>
        <p className="mb-2 text-xs font-semibold text-soil">
          Step 1: Select the minimum BC generation needed
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {data.options.map((gen) => {
            const isSelected = selected === gen;
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
                <div className="text-sm font-bold text-soil">BC{gen}</div>
                {/* Unlabeled progress bar — visual hint only */}
                <div className="mx-auto mt-2 h-2 w-full overflow-hidden rounded-full bg-soil/10">
                  <div
                    className="h-full rounded-full bg-leaf/50"
                    style={{ width: `${100 * (1 - Math.pow(0.5, gen + 1))}%` }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step 2: calculate recovery % */}
      {selected !== null && (
        <div>
          <p className="mb-2 text-xs font-semibold text-soil">
            Step 2: What is the elite genome recovery (%) after BC{selected}?
          </p>
          <div className="flex items-center gap-2">
            <input
              type="number"
              step="any"
              min={0}
              max={100}
              value={pctInput}
              onChange={(e) => !submitted && setPctInput(e.target.value)}
              disabled={submitted}
              placeholder="e.g. 87.5"
              className="w-32 rounded border border-soil/20 px-3 py-2 text-sm text-soil focus:border-leaf focus:outline-none disabled:opacity-40"
            />
            <span className="text-sm text-muted">%</span>
          </div>
        </div>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={selected === null || pctInput === '' || submitted}
        className="w-full rounded bg-leaf py-2 text-sm font-semibold text-white disabled:opacity-40"
      >
        Check Answer
      </button>
    </div>
  );
}
