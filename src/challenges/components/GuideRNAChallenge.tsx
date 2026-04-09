import { useState } from 'react';
import type { ChallengeChildProps } from './ChallengeShell';

/**
 * CRISPR guide RNA design challenge.
 * Player selects a 20bp region adjacent to a PAM site (NGG).
 */
export function GuideRNAChallenge({ instance, onSubmit }: ChallengeChildProps) {
  const data = instance.data as {
    sequence: string;
    pamPositions: number[];
    targetLocus: string;
    question: string;
    hint: string;
  };

  const [selStart, setSelStart] = useState<number | null>(null);
  const [selEnd, setSelEnd] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const seq = data.sequence;
  const pamSet = new Set(data.pamPositions);

  function handleMouseDown(i: number) {
    setSelStart(i);
    setSelEnd(i);
    setDragging(true);
  }
  function handleMouseEnter(i: number) {
    if (dragging) setSelEnd(i);
  }
  function handleMouseUp() {
    setDragging(false);
  }

  const lo = selStart !== null && selEnd !== null ? Math.min(selStart, selEnd) : null;
  const hi = selStart !== null && selEnd !== null ? Math.max(selStart, selEnd) + 1 : null;
  const selLen = lo !== null && hi !== null ? hi - lo : 0;

  function handleSubmit() {
    if (lo === null || hi === null) return;
    onSubmit({ start: lo, end: hi });
  }

  // Render sequence as individual base cells
  const basesPerRow = 40;
  const rows: string[][] = [];
  for (let i = 0; i < seq.length; i += basesPerRow) {
    rows.push(seq.slice(i, i + basesPerRow).split(''));
  }

  return (
    <div className="space-y-4" onMouseUp={handleMouseUp}>
      <div className="rounded-lg border border-sky/30 bg-sky/5 p-3">
        <p className="text-sm font-medium text-soil">{data.question}</p>
        <p className="mt-1 text-xs text-muted">Target gene: <strong>{data.targetLocus}</strong></p>
      </div>

      {/* Sequence viewer */}
      <div className="rounded border border-soil/10 bg-white p-3">
        <p className="mb-2 text-xs font-semibold text-muted uppercase">DNA Sequence (click and drag to select 20bp guide)</p>
        <div className="select-none font-mono text-xs leading-6">
          {rows.map((row, rowIdx) => {
            const offset = rowIdx * basesPerRow;
            return (
              <div key={rowIdx} className="flex flex-wrap">
                <span className="mr-2 w-6 text-right text-muted">{offset}</span>
                {row.map((base, colIdx) => {
                  const idx = offset + colIdx;
                  const inSelection = lo !== null && hi !== null && idx >= lo && idx < hi;
                  const isPam = pamSet.has(idx) || pamSet.has(idx - 1) || pamSet.has(idx - 2);
                  const pamStart = pamSet.has(idx);

                  let bg = 'bg-transparent';
                  if (inSelection) bg = 'bg-accent/30';
                  else if (isPam) bg = 'bg-sky/20';

                  let textColor = 'text-soil';
                  if (base === 'A') textColor = 'text-green-700';
                  else if (base === 'T') textColor = 'text-red-700';
                  else if (base === 'G') textColor = 'text-amber-700';
                  else if (base === 'C') textColor = 'text-blue-700';

                  return (
                    <span
                      key={idx}
                      className={`inline-block w-3.5 cursor-pointer text-center ${bg} ${textColor} ${pamStart ? 'border-b-2 border-sky' : ''}`}
                      onMouseDown={() => handleMouseDown(idx)}
                      onMouseEnter={() => handleMouseEnter(idx)}
                      title={isPam ? `PAM site (${seq.slice(idx, idx + 3)})` : `Position ${idx}`}
                    >
                      {base}
                    </span>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-2 flex items-center gap-4 text-xs text-muted">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-4 rounded bg-sky/30 border-b-2 border-sky" /> PAM site (NGG)
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-4 rounded bg-accent/30" /> Your selection
          </span>
        </div>
      </div>

      {/* Selection info */}
      <div className="text-xs text-muted">
        {selLen > 0 ? (
          <span>
            Selected: {selLen}bp (positions {lo}-{hi})
            {selLen !== 20 && <span className="ml-2 text-accent font-semibold">Need exactly 20bp</span>}
            {selLen === 20 && <span className="ml-2 text-leaf font-semibold">20bp selected</span>}
          </span>
        ) : (
          <span>Click and drag to select a 20bp guide region</span>
        )}
      </div>

      {!showHint && (
        <button onClick={() => setShowHint(true)} className="text-xs text-sky underline">Show hint</button>
      )}
      {showHint && (
        <p className="rounded border border-sky/20 bg-sky/5 p-2 text-xs text-soil">{data.hint}</p>
      )}

      <button
        onClick={handleSubmit}
        disabled={selLen !== 20}
        className="w-full rounded bg-leaf py-2 text-sm font-semibold text-white disabled:opacity-40"
      >
        Submit Guide RNA
      </button>
    </div>
  );
}
