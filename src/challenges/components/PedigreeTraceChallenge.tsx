import { useState } from 'react';
import type { ChallengeChildProps } from './ChallengeShell';

interface Individual {
  color: string;
  gen: number;
  parents?: [string, string];
  label?: string;
}

interface PedigreeData {
  pedigree: Record<string, Individual>;
  options: [string, string];
  question: string;
  hint: string;
}

/**
 * Pedigree Trace challenge.
 * Player examines a pedigree with offspring evidence and deduces which
 * red-flowered individual is the carrier (Rr) vs homozygous (RR).
 * Genotypes are NOT shown — the player reasons from phenotypes only.
 */
export function PedigreeTraceChallenge({ instance, onSubmit, submitted }: ChallengeChildProps) {
  const data = instance.data as PedigreeData;
  const [selected, setSelected] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);

  const individuals = data.pedigree;
  const options = data.options;

  // Layout positions for a 7-node pedigree:
  // Gen 1: A, B (grandparents)
  // Gen 2: C, D (candidates), E (test cross partner)
  // Gen 3: F, G (offspring of candidate × E)
  const positions: Record<string, { x: number; y: number }> = {
    A: { x: 100, y: 40 },
    B: { x: 260, y: 40 },
    C: { x: 60, y: 140 },
    D: { x: 180, y: 140 },
    E: { x: 310, y: 140 },
    F: { x: 120, y: 260 },
    G: { x: 250, y: 260 },
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
      {/* Question */}
      <p className="text-sm text-soil">{data.question}</p>

      {/* Pedigree diagram */}
      <div className="rounded-lg border border-soil/10 bg-white p-3">
        <p className="mb-2 text-xs font-semibold uppercase text-muted">Pedigree Diagram</p>
        <svg viewBox="0 0 380 310" className="mx-auto w-full max-w-sm">
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
            const phenotypeLabel = ind.color === 'white' ? 'white' : 'red';
            return (
              <g key={id} className={isOption ? 'cursor-pointer' : ''} onClick={isOption && !submitted ? () => setSelected(id) : undefined}>
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={22}
                  fill={ind.color}
                  stroke={isSelected ? '#e07a3a' : isOption ? '#4a7c59' : '#3d2c1f'}
                  strokeWidth={isSelected ? 3 : isOption ? 2.5 : 1.5}
                  opacity={0.9}
                />
                <text x={pos.x} y={pos.y + 1} textAnchor="middle" fontSize={13} fontWeight="bold" fill="white">
                  {id}
                </text>
                {/* Phenotype label below the circle */}
                <text x={pos.x} y={pos.y + 38} textAnchor="middle" fontSize={9} fill="#3d2c1f" opacity={0.7}>
                  {phenotypeLabel}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="text-xs text-muted space-y-1">
        <div><span className="font-semibold text-leaf">Green-outlined</span> plants are your choices. Which one is the carrier?</div>
        <div>Red = dominant phenotype (at least one R allele). White = recessive (rr).</div>
      </div>

      {/* Option cards — phenotype only, NO genotype */}
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
              <div className="text-lg font-bold text-soil">Plant {opt}</div>
              <div
                className="mx-auto mt-2 h-5 w-5 rounded-full border border-soil/20"
                style={{ backgroundColor: ind?.color ?? '#ccc' }}
              />
              <div className="mt-1 text-xs text-muted">Red flower</div>
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
