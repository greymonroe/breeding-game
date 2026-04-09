import { useState } from 'react';
import type { ChallengeChildProps } from './ChallengeShell';

interface LocusPoint {
  id: string;
  chr: number;
  pos: number;
  effect: number;
  isQtl: boolean;
}

/**
 * Interactive Manhattan plot challenge.
 * Player clicks on the peak they think is a real QTL.
 */
export function ManhattanPlotChallenge({ instance, onSubmit }: ChallengeChildProps) {
  const data = instance.data as {
    loci: LocusPoint[];
    chromosomes: Array<{ id: number; length: number }>;
    question: string;
    hint: string;
  };

  const [selected, setSelected] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);

  // Layout: x = cumulative genome position, y = |effect|
  const chrOffsets: number[] = [];
  let cumulative = 0;
  for (const chr of data.chromosomes) {
    chrOffsets.push(cumulative);
    cumulative += chr.length + 10; // 10cM gap between chromosomes
  }
  const totalWidth = cumulative;
  const maxEffect = Math.max(...data.loci.map((l) => l.effect));

  // SVG dimensions
  const svgW = 580;
  const svgH = 220;
  const pad = { top: 20, right: 20, bottom: 40, left: 40 };
  const plotW = svgW - pad.left - pad.right;
  const plotH = svgH - pad.top - pad.bottom;

  function xScale(chr: number, pos: number) {
    const offset = chrOffsets[chr - 1] ?? 0;
    return pad.left + ((offset + pos) / totalWidth) * plotW;
  }
  function yScale(effect: number) {
    return pad.top + plotH - (effect / (maxEffect * 1.1)) * plotH;
  }

  // Alternate chromosome colors
  const chrColors = ['#4a7c59', '#7cb587', '#4a7c59', '#7cb587', '#4a7c59', '#7cb587', '#4a7c59'];

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-sky/30 bg-sky/5 p-3">
        <p className="text-sm font-medium text-soil">{data.question}</p>
      </div>

      {/* Manhattan Plot SVG */}
      <div className="overflow-x-auto rounded border border-soil/10 bg-white p-2">
        <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full" style={{ minWidth: 400 }}>
          {/* Background */}
          <rect x={pad.left} y={pad.top} width={plotW} height={plotH} fill="#faf7f2" />

          {/* Chromosome labels */}
          {data.chromosomes.map((chr) => {
            const midX = xScale(chr.id, chr.length / 2);
            return (
              <text key={chr.id} x={midX} y={svgH - 8} textAnchor="middle" fontSize={10} fill="#3d2c1f">
                Chr{chr.id}
              </text>
            );
          })}

          {/* Y axis label */}
          <text x={12} y={pad.top + plotH / 2} textAnchor="middle" fontSize={10} fill="#3d2c1f" transform={`rotate(-90, 12, ${pad.top + plotH / 2})`}>
            Effect size
          </text>

          {/* Threshold line */}
          <line
            x1={pad.left} x2={pad.left + plotW}
            y1={yScale(1.2)} y2={yScale(1.2)}
            stroke="#e07a3a" strokeWidth={1} strokeDasharray="4,3" opacity={0.6}
          />
          <text x={pad.left + plotW + 2} y={yScale(1.2) + 3} fontSize={8} fill="#e07a3a">
            threshold
          </text>

          {/* Data points */}
          {data.loci.map((loc) => {
            const cx = xScale(loc.chr, loc.pos);
            const cy = yScale(loc.effect);
            const isSelected = selected === loc.id;
            const color = chrColors[(loc.chr - 1) % chrColors.length];

            return (
              <circle
                key={loc.id}
                cx={cx}
                cy={cy}
                r={isSelected ? 6 : 3}
                fill={isSelected ? '#e07a3a' : color}
                stroke={isSelected ? '#c0392b' : 'none'}
                strokeWidth={isSelected ? 2 : 0}
                opacity={isSelected ? 1 : 0.7}
                className="cursor-pointer"
                onClick={() => setSelected(loc.id)}
              />
            );
          })}
        </svg>
      </div>

      {/* Selection info */}
      {selected && (
        <div className="rounded border border-accent/20 bg-accent/5 p-2 text-xs text-soil">
          Selected: <strong>{selected}</strong> on Chr{data.loci.find((l) => l.id === selected)?.chr}
          {' '}(effect = {data.loci.find((l) => l.id === selected)?.effect.toFixed(2)})
        </div>
      )}

      {!showHint && (
        <button onClick={() => setShowHint(true)} className="text-xs text-sky underline">Show hint</button>
      )}
      {showHint && (
        <p className="rounded border border-sky/20 bg-sky/5 p-2 text-xs text-soil">{data.hint}</p>
      )}

      <button
        onClick={() => selected && onSubmit({ locusId: selected })}
        disabled={!selected}
        className="w-full rounded bg-leaf py-2 text-sm font-semibold text-white disabled:opacity-40"
      >
        This is the QTL
      </button>
    </div>
  );
}
