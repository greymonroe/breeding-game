import { useState } from 'react';
import type { ChallengeChildProps } from './ChallengeShell';

/**
 * Interactive Punnett Square challenge.
 * Player fills in a 2x2 grid and predicts the fraction of white offspring.
 */
export function PunnettSquareChallenge({ instance, onSubmit }: ChallengeChildProps) {
  const data = instance.data as {
    parentGenotype: string;
    question: string;
    hint: string;
    alleles: string[];
  };

  // 2x2 grid state: [row][col] = allele pair string (e.g., "Rr")
  const [grid, setGrid] = useState<string[][]>([['', ''], ['', '']]);
  const [prediction, setPrediction] = useState('');
  const [showHint, setShowHint] = useState(false);

  const alleles = data.alleles; // ['R', 'r']

  function handleCellChange(r: number, c: number, val: string) {
    const next = grid.map((row) => [...row]);
    next[r][c] = val;
    setGrid(next);
  }

  function handleSubmit() {
    const frac = parseFloat(prediction);
    if (isNaN(frac)) return;
    onSubmit({ fraction: frac, grid });
  }

  return (
    <div className="space-y-4">
      {/* Question */}
      <div className="rounded-lg border border-sky/30 bg-sky/5 p-3">
        <p className="text-sm font-medium text-soil">{data.question}</p>
        <p className="mt-1 text-xs text-muted">Parent genotype: <strong>{data.parentGenotype}</strong> (self-pollination)</p>
      </div>

      {/* Punnett Square */}
      <div className="flex flex-col items-center">
        <p className="mb-2 text-xs font-semibold text-muted uppercase">Punnett Square</p>
        <div className="inline-block">
          {/* Header row */}
          <div className="flex">
            <div className="flex h-10 w-10 items-center justify-center" />
            {alleles.map((a, i) => (
              <div key={i} className="flex h-10 w-20 items-center justify-center border border-soil/20 bg-wheat/30 font-mono font-bold text-soil">
                {a}
              </div>
            ))}
          </div>
          {/* Grid rows */}
          {alleles.map((rowAllele, r) => (
            <div key={r} className="flex">
              <div className="flex h-12 w-10 items-center justify-center border border-soil/20 bg-wheat/30 font-mono font-bold text-soil">
                {rowAllele}
              </div>
              {alleles.map((_, c) => (
                <div key={c} className="flex h-12 w-20 items-center justify-center border border-soil/20">
                  <input
                    type="text"
                    maxLength={2}
                    value={grid[r][c]}
                    onChange={(e) => handleCellChange(r, c, e.target.value)}
                    className="h-full w-full bg-transparent text-center font-mono text-sm text-soil outline-none focus:bg-leaf/5"
                    placeholder="?"
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Color key */}
      <div className="flex items-center gap-4 text-xs text-muted">
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-full bg-danger/70" /> RR or Rr = Red (R is dominant)
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-full bg-wheat" /> rr = White
        </span>
      </div>

      {/* Prediction input */}
      <div className="rounded-lg border border-soil/10 bg-white p-3">
        <label className="block text-sm font-medium text-soil">
          What fraction of offspring will be <strong>white</strong>?
        </label>
        <div className="mt-2 flex items-center gap-2">
          <input
            type="number"
            min={0}
            max={1}
            step={0.01}
            value={prediction}
            onChange={(e) => setPrediction(e.target.value)}
            placeholder="e.g. 0.25"
            className="w-28 rounded border border-soil/30 px-3 py-1.5 font-mono text-sm"
          />
          <span className="text-xs text-muted">(enter as decimal: 0.25 = 25%)</span>
        </div>
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
        disabled={!prediction}
        className="w-full rounded bg-leaf py-2 text-sm font-semibold text-white disabled:opacity-40"
      >
        Check Answer
      </button>
    </div>
  );
}
