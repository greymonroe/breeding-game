import { useState, useEffect } from 'react';
import type { CrossoverEvent } from '../../engine/meiosis';

interface ChromeInfo {
  id: number;
  length: number;
}

interface Props {
  chromosomes: ChromeInfo[];
  /** Crossover events from the maternal gamete. */
  maternalCrossovers: CrossoverEvent[];
  /** Crossover events from the paternal gamete. */
  paternalCrossovers: CrossoverEvent[];
  /** Called when the animation finishes or is dismissed. */
  onComplete: () => void;
}

/**
 * Brief animated overlay showing meiosis with crossover events.
 * Shows parent chromosome pairs aligning, crossover X marks appearing,
 * then gametes separating. Auto-dismisses after ~4 seconds.
 */
export function MeiosisAnimation({ chromosomes, maternalCrossovers, paternalCrossovers, onComplete }: Props) {
  const [phase, setPhase] = useState<'align' | 'crossover' | 'separate' | 'done'>('align');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('crossover'), 800);
    const t2 = setTimeout(() => setPhase('separate'), 2200);
    const t3 = setTimeout(() => { setPhase('done'); onComplete(); }, 3800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onComplete]);

  // Pick up to 3 chromosomes with the most crossovers for visual clarity
  const allCrossovers = [...maternalCrossovers, ...paternalCrossovers];
  const chrCrossoverCounts = new Map<number, number>();
  for (const c of allCrossovers) {
    chrCrossoverCounts.set(c.chromosomeId, (chrCrossoverCounts.get(c.chromosomeId) ?? 0) + 1);
  }
  const displayChrs = [...chromosomes]
    .sort((a, b) => (chrCrossoverCounts.get(b.id) ?? 0) - (chrCrossoverCounts.get(a.id) ?? 0))
    .slice(0, 3);

  const maxLen = Math.max(...chromosomes.map((c) => c.length));

  // SVG layout
  const svgW = 400;
  const svgH = 200;
  const chrH = 12;
  const chrGap = 50;
  const leftPad = 50;
  const topPad = 30;

  function chrWidth(length: number) {
    return ((length / maxLen) * (svgW - leftPad - 40));
  }

  // Animation offsets
  const pairGap = phase === 'align' ? 20 : phase === 'crossover' ? 4 : 30;
  const separateOffset = phase === 'separate' ? 15 : 0;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-ink/40 backdrop-blur-sm cursor-pointer"
      onClick={onComplete}
    >
      <div className="rounded-xl border border-soil/20 bg-surface p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-soil">Meiosis &amp; Recombination</h3>
            <p className="text-xs text-muted">
              {phase === 'align' && 'Homologous chromosomes align...'}
              {phase === 'crossover' && 'Crossovers exchange genetic material!'}
              {phase === 'separate' && 'Gametes separate with recombinant chromosomes'}
              {phase === 'done' && 'Complete!'}
            </p>
          </div>
          <button onClick={onComplete} className="text-xs text-muted hover:text-soil">skip</button>
        </div>

        <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full" style={{ maxWidth: 500 }}>
          {displayChrs.map((chr, idx) => {
            const y = topPad + idx * chrGap;
            const w = chrWidth(chr.length);

            // Maternal crossovers on this chromosome
            const matCx = maternalCrossovers.filter((c) => c.chromosomeId === chr.id);
            const patCx = paternalCrossovers.filter((c) => c.chromosomeId === chr.id);

            return (
              <g key={chr.id}>
                {/* Chromosome label */}
                <text x={8} y={y + chrH + 2} fontSize={9} fill="#3d2c1f" fontWeight="bold">
                  Chr {chr.id}
                </text>

                {/* Maternal pair (top) */}
                <g style={{ transition: 'transform 0.6s ease', transform: `translateY(${-pairGap / 2 - separateOffset}px)` }}>
                  {/* Haplotype A (maternal) */}
                  <rect
                    x={leftPad} y={y} width={w} height={chrH}
                    rx={chrH / 2} fill="#c0392b" opacity={0.7}
                  />
                  {/* Haplotype B (maternal) */}
                  <rect
                    x={leftPad} y={y + chrH + 2} width={w} height={chrH}
                    rx={chrH / 2} fill="#e07a3a" opacity={0.7}
                  />

                  {/* Crossover marks on maternal */}
                  {phase !== 'align' && matCx.map((cx, i) => {
                    const xPos = leftPad + (cx.position / chr.length) * w;
                    return (
                      <g key={i}>
                        <line
                          x1={xPos - 4} y1={y - 2} x2={xPos + 4} y2={y + chrH * 2 + 4}
                          stroke="#3d2c1f" strokeWidth={2} opacity={0.8}
                        />
                        <line
                          x1={xPos + 4} y1={y - 2} x2={xPos - 4} y2={y + chrH * 2 + 4}
                          stroke="#3d2c1f" strokeWidth={2} opacity={0.8}
                        />
                        <text x={xPos} y={y - 5} fontSize={7} fill="#4a7c59" textAnchor="middle" fontWeight="bold">
                          CO
                        </text>
                      </g>
                    );
                  })}
                </g>

                {/* Paternal pair (bottom) */}
                <g style={{ transition: 'transform 0.6s ease', transform: `translateY(${pairGap / 2 + separateOffset}px)` }}>
                  <rect
                    x={leftPad} y={y + chrH * 2 + 6} width={w} height={chrH}
                    rx={chrH / 2} fill="#4a7c59" opacity={0.7}
                  />
                  <rect
                    x={leftPad} y={y + chrH * 3 + 8} width={w} height={chrH}
                    rx={chrH / 2} fill="#87CEEB" opacity={0.7}
                  />

                  {phase !== 'align' && patCx.map((cx, i) => {
                    const xPos = leftPad + (cx.position / chr.length) * w;
                    return (
                      <g key={i}>
                        <line
                          x1={xPos - 4} y1={y + chrH * 2 + 4} x2={xPos + 4} y2={y + chrH * 4 + 10}
                          stroke="#3d2c1f" strokeWidth={2} opacity={0.8}
                        />
                        <line
                          x1={xPos + 4} y1={y + chrH * 2 + 4} x2={xPos - 4} y2={y + chrH * 4 + 10}
                          stroke="#3d2c1f" strokeWidth={2} opacity={0.8}
                        />
                        <text x={xPos} y={y + chrH * 4 + 20} fontSize={7} fill="#4a7c59" textAnchor="middle" fontWeight="bold">
                          CO
                        </text>
                      </g>
                    );
                  })}
                </g>
              </g>
            );
          })}

          {/* Legend */}
          <g transform={`translate(${svgW - 130}, ${svgH - 25})`}>
            <rect width={8} height={8} fill="#c0392b" opacity={0.7} rx={2} />
            <text x={12} y={7} fontSize={7} fill="#3d2c1f">Maternal haplotypes</text>
            <rect y={12} width={8} height={8} fill="#4a7c59" opacity={0.7} rx={2} />
            <text x={12} y={19} fontSize={7} fill="#3d2c1f">Paternal haplotypes</text>
          </g>

          {/* Crossover count */}
          <text x={svgW / 2} y={svgH - 5} fontSize={8} fill="#3d2c1f" textAnchor="middle">
            {allCrossovers.length} crossover{allCrossovers.length !== 1 ? 's' : ''} detected across {chromosomes.length} chromosomes
          </text>
        </svg>
      </div>
    </div>
  );
}
