import { useState } from 'react';
import type { ChallengeChildProps } from './ChallengeShell';

interface Individual {
  id: string;
  genotype: string;
  color: string;
  gen: number;
  parents: [string, string] | null;
}

interface PedigreeData {
  pedigree: Record<string, Individual>;
  options: [string, string];
  hint: string;
}

/**
 * Pedigree Trace challenge.
 * Player examines a 3-generation pedigree and identifies which individual is the carrier.
 */
export function PedigreeTraceChallenge({ instance, onSubmit, submitted }: ChallengeChildProps) {
  const data = instance.data as PedigreeData;
  const [selected, setSelected] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);

  const individuals = data.pedigree;
  const options = data.options;

  // Layout positions for a 3-gen pedigree: A,B top; C,D middle; E,F bottom
  const positions: Record<string, { x: number; y: number }> = {
    A: { x: 100, y: 40 },
    B: { x: 260, y: 40 },
    C: { x: 60, y: 140 },
    D: { x: 180, y: 140 },
    E: { x: 100, y: 240 },
    F: { x: 260, y: 240 },
  };

  // Connector lines between parents and children
  const connections: Array<{ from: [string, string]; to: string }> = [];
  for (const [id, ind] of Object.entries(individuals)) {
    if (ind.parents) {
      connections.push({ from: ind.parents, to: id });
    }
  }

  function handleSubmit() {
    if (!selected) return;
    onSubmit({ carrier: selected });
  }

  return (
    <div className="space-y-4">
      {/* Pedigree diagram */}
      <div className="rounded-lg border border-soil/10 bg-white p-3">
        <p className="mb-2 text-xs font-semibold uppercase text-muted">Pedigree Diagram</p>
        <svg viewBox="0 0 360 300" className="mx-auto w-full max-w-sm">
          {/* Connection lines */}
          {connections.map(({ from, to }, i) => {
            const p1 = positions[from[0]];
            const p2 = positions[from[1]];
            const child = positions[to];
            if (!p1 || !p2 || !child) return null;
            const midX = (p1.x + p2.x) / 2;
            const midY = (p1.y + p2.y) / 2 + 20;
            return (
              <g key={i}>
                {/* Horizontal line between parents */}
                <line x1={p1.x} y1={p1.y + 20} x2={p2.x} y2={p2.y + 20} stroke="#3d2c1f" strokeWidth={1.5} opacity={0.3} />
                {/* Vertical drop to child */}
                <line x1={midX} y1={midY} x2={child.x} y2={child.y - 10} stroke="#3d2c1f" strokeWidth={1.5} opacity={0.3} />
              </g>
            );
          })}

          {/* Individual nodes */}
          {Object.entries(individuals).map(([id, ind]) => {
            const pos = positions[id];
            if (!pos) return null;
            const isOption = options.includes(id);
            const isSelected = selected === id;
            return (
              <g key={id}>
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={22}
                  fill={ind.color}
                  stroke={isSelected ? '#e07a3a' : isOption ? '#4a7c59' : '#3d2c1f'}
                  strokeWidth={isSelected ? 3 : isOption ? 2.5 : 1.5}
                  opacity={0.9}
                />
                <text x={pos.x} y={pos.y - 2} textAnchor="middle" fontSize={12} fontWeight="bold" fill="white">
                  {id}
                </text>
                <text x={pos.x} y={pos.y + 12} textAnchor="middle" fontSize={9} fill="white" opacity={0.85}>
                  {ind.genotype}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="text-xs text-muted">
        <span className="font-semibold text-leaf">Green-outlined</span> individuals are your choices. Pick the <strong>carrier</strong>.
      </div>

      {/* Option cards */}
      <div className="grid grid-cols-2 gap-3">
        {options.map((opt) => {
          const ind = individuals[opt];
          return (
            <button
              key={opt}
              disabled={submitted}
              onClick={() => setSelected(opt)}
              className={`rounded-lg border-2 p-4 text-center transition-all ${
                selected === opt
                  ? 'border-accent bg-accent/10 shadow-md'
                  : 'border-soil/15 bg-white hover:border-leaf/40'
              }`}
            >
              <div className="text-lg font-bold text-soil">{opt}</div>
              <div className="mt-1 font-mono text-sm text-muted">{ind?.genotype ?? '??'}</div>
              <div
                className="mx-auto mt-2 h-4 w-4 rounded-full"
                style={{ backgroundColor: ind?.color ?? '#ccc' }}
              />
            </button>
          );
        })}
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
        disabled={!selected || submitted}
        className="w-full rounded bg-leaf py-2 text-sm font-semibold text-white disabled:opacity-40"
      >
        Check Answer
      </button>
    </div>
  );
}
