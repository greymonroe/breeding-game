import { useState } from 'react';
import type { ChallengeChildProps } from './ChallengeShell';

interface Line {
  name: string;
  yield: number;
}

interface Cross {
  cross: string;
  f1Yield: number;
}

interface TestcrossData {
  lines: Line[];
  crosses: Cross[];
  hint: string;
}

/**
 * Testcross / Combining Ability challenge.
 * Player examines inbred line yields and F1 cross results, then picks the best cross.
 */
export function TestcrossChallenge({ instance, onSubmit, submitted }: ChallengeChildProps) {
  const data = instance.data as TestcrossData;
  const [selected, setSelected] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);

  const maxF1 = Math.max(...data.crosses.map((c) => c.f1Yield));

  function handleSubmit() {
    if (!selected) return;
    onSubmit({ bestCross: selected });
  }

  return (
    <div className="space-y-4">
      {/* Instructions */}
      <div className="rounded-lg border border-sky/30 bg-sky/5 p-3">
        <p className="text-sm font-medium text-soil">
          Which F1 cross produces the <strong>highest yield</strong>?
        </p>
        <p className="mt-1 text-xs text-muted">
          Examine the inbred line performance and their F1 combinations. Heterosis means the F1 can exceed both parents.
        </p>
      </div>

      {/* Inbred lines table */}
      <div className="rounded-lg border border-soil/10 bg-white p-3">
        <p className="mb-2 text-xs font-semibold uppercase text-muted">Inbred Lines</p>
        <div className="grid grid-cols-4 gap-2">
          {data.lines.map((line) => (
            <div key={line.name} className="rounded border border-soil/10 bg-surface p-2 text-center">
              <div className="text-sm font-bold text-soil">{line.name}</div>
              <div className="mt-1 text-xs text-muted">
                Yield: <span className="font-mono font-semibold text-soil">{line.yield}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Crosses table */}
      <div className="rounded-lg border border-soil/10 bg-white p-3">
        <p className="mb-2 text-xs font-semibold uppercase text-muted">F1 Cross Results</p>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-soil/10">
              <th className="py-1 text-left text-xs font-semibold text-muted">Cross</th>
              <th className="py-1 text-right text-xs font-semibold text-muted">F1 Yield</th>
              <th className="py-1 text-right text-xs font-semibold text-muted">Bar</th>
            </tr>
          </thead>
          <tbody>
            {data.crosses.map((c) => {
              const isSelected = selected === c.cross;
              const barWidth = maxF1 > 0 ? (c.f1Yield / maxF1) * 100 : 0;
              return (
                <tr
                  key={c.cross}
                  onClick={() => !submitted && setSelected(c.cross)}
                  className={`cursor-pointer border-b border-soil/5 transition-colors ${
                    isSelected ? 'bg-accent/10' : 'hover:bg-leaf/5'
                  }`}
                >
                  <td className="py-2">
                    <span className={`font-semibold ${isSelected ? 'text-accent' : 'text-soil'}`}>
                      {c.cross}
                    </span>
                  </td>
                  <td className="py-2 text-right font-mono text-soil">{c.f1Yield}</td>
                  <td className="py-2 pl-3 text-right">
                    <div className="h-3 w-full overflow-hidden rounded-full bg-soil/10">
                      <div
                        className={`h-full rounded-full transition-all ${isSelected ? 'bg-accent' : 'bg-leaf/60'}`}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Selection display */}
      {selected && (
        <div className="text-center text-sm text-soil">
          Selected: <strong className="text-accent">{selected}</strong>
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
        disabled={!selected || submitted}
        className="w-full rounded bg-leaf py-2 text-sm font-semibold text-white disabled:opacity-40"
      >
        Check Answer
      </button>
    </div>
  );
}
