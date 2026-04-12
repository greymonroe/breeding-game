/**
 * AlleleTrajectoryVisualizer — shared SVG line‐plot for allele‐frequency
 * trajectories across replicate Wright‐Fisher populations.
 *
 * Pedagogical goal: students who see 10 drift trajectories fanning out at
 * N = 20 and then see 10 trajectories at N = 2000 barely moving will
 * understand drift variance viscerally — variance ∝ 1/(2N).
 *
 * Engine coupling: all stochastic simulation is delegated to
 * `simulateReplicates` in `popgen-engine.ts`. This component never calls
 * `Math.random()`. The only inline model is the deterministic two-island
 * migration recurrence (p1' = (1−m)p1 + m·p2), which has no randomness.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { simulateReplicates, type PopGenConfig } from '../popgen-engine';

// ── Types ──────────────────────────────────────────────────────────────────

export interface AlleleTrajectoryVisualizerProps {
  // Simulation parameters
  popSize: number;
  initialFreqA: number;
  generations: number;
  nReplicates: number;
  // Optional force parameters
  fitnessAA?: number;
  fitnessAa?: number;
  fitnessaa?: number;
  migrationRate?: number;
  migrantFreqA?: number;
  mutationRate?: number;
  // Display options
  height?: number;
  yLabel?: string;
  colors?: string[];
  // Control visibility
  showControls?: boolean;
  // Preset label for chart title area
  presetLabel?: string;
  // Two-island deterministic migration mode
  twoIsland?: {
    p1Init: number;
    p2Init: number;
    migRate: number;
    generations: number;
  };
  // External trajectories (for experiments that compute their own)
  trajectories?: number[][];
  trajectoryLabels?: string[];
  trajectoryColors?: string[];
  // Callback when simulation completes
  onSimComplete?: (results: {
    freqHistories: number[][];
    fixedCount: number;
    fixedACount: number;
  }) => void;
}

// ── Constants ──────────────────────────────────────────────────────────────

const DEFAULT_PALETTE = [
  '#7c3aed', '#a78bfa', '#c4b5fd', '#ddd6fe',
  '#6d28d9', '#8b5cf6', '#5b21b6', '#c084fc',
];

const TWO_ISLAND_COLORS = ['#7c3aed', '#f59e0b']; // violet + amber

const SVG_WIDTH = 500;
const PAD = { top: 20, right: 20, bottom: 30, left: 40 };

// ── Two-island deterministic model ─────────────────────────────────────────

function simulateTwoIsland(
  p1Init: number,
  p2Init: number,
  migRate: number,
  generations: number,
): { pop1: number[]; pop2: number[] } {
  const pop1: number[] = [p1Init];
  const pop2: number[] = [p2Init];
  let p1 = p1Init;
  let p2 = p2Init;
  for (let g = 0; g < generations; g++) {
    const newP1 = (1 - migRate) * p1 + migRate * p2;
    const newP2 = (1 - migRate) * p2 + migRate * p1;
    p1 = newP1;
    p2 = newP2;
    pop1.push(p1);
    pop2.push(p2);
  }
  return { pop1, pop2 };
}

// ── Component ──────────────────────────────────────────────────────────────

export function AlleleTrajectoryVisualizer({
  popSize,
  initialFreqA,
  generations,
  nReplicates,
  fitnessAA,
  fitnessAa,
  fitnessaa,
  migrationRate,
  migrantFreqA,
  mutationRate,
  height = 200,
  yLabel = 'Freq(A)',
  colors,
  showControls = false,
  presetLabel,
  twoIsland,
  trajectories: externalTrajectories,
  trajectoryLabels,
  trajectoryColors,
  onSimComplete,
}: AlleleTrajectoryVisualizerProps) {
  // ── State ────────────────────────────────────────────────────────────────

  const [trajectories, setTrajectories] = useState<number[][]>([]);
  const [showMean, setShowMean] = useState(false);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; gen: number; freq: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Prefer external trajectories when provided
  const displayTrajectories = externalTrajectories ?? trajectories;

  // ── Derived layout ───────────────────────────────────────────────────────

  const plotW = SVG_WIDTH - PAD.left - PAD.right;
  const plotH = height - PAD.top - PAD.bottom;

  // ── Determine effective generation count for x-axis ──────────────────────

  const effectiveGenerations = twoIsland ? twoIsland.generations : generations;

  // ── Simulation ───────────────────────────────────────────────────────────

  const runSimulation = useCallback(() => {
    if (twoIsland) {
      const { pop1, pop2 } = simulateTwoIsland(
        twoIsland.p1Init, twoIsland.p2Init,
        twoIsland.migRate, twoIsland.generations,
      );
      setTrajectories([pop1, pop2]);
      onSimComplete?.({
        freqHistories: [pop1, pop2],
        fixedCount: 0,
        fixedACount: 0,
      });
      return;
    }

    const config: PopGenConfig = {
      popSize,
      initialFreqA,
      generations,
      fitnessAA,
      fitnessAa,
      fitnessaa,
      migrationRate,
      migrantFreqA,
      mutationRate,
    };

    const results = simulateReplicates(config, nReplicates);
    const freqHistories = results.map(r => r.freqHistory);
    const fixedCount = results.filter(r => r.fixedAllele !== null).length;
    const fixedACount = results.filter(r => r.fixedAllele === 'A').length;

    setTrajectories(freqHistories);
    onSimComplete?.({ freqHistories, fixedCount, fixedACount });
  }, [
    popSize, initialFreqA, generations, nReplicates,
    fitnessAA, fitnessAa, fitnessaa,
    migrationRate, migrantFreqA, mutationRate,
    twoIsland, onSimComplete,
  ]);

  // ── Palette ──────────────────────────────────────────────────────────────

  const palette = useMemo(() => {
    if (trajectoryColors && externalTrajectories) return trajectoryColors;
    if (twoIsland) return TWO_ISLAND_COLORS;
    return colors ?? DEFAULT_PALETTE;
  }, [colors, twoIsland, trajectoryColors, externalTrajectories]);

  // ── Mean trajectory ──────────────────────────────────────────────────────

  const meanTrajectory = useMemo(() => {
    if (displayTrajectories.length === 0) return [];
    const maxLen = Math.max(...displayTrajectories.map(t => t.length));
    const mean: number[] = [];
    for (let i = 0; i < maxLen; i++) {
      let sum = 0;
      let count = 0;
      for (const traj of displayTrajectories) {
        if (i < traj.length) {
          sum += traj[i];
          count++;
        }
      }
      mean.push(count > 0 ? sum / count : 0);
    }
    return mean;
  }, [displayTrajectories]);

  // ── Coordinate helpers ───────────────────────────────────────────────────

  const toSvgX = useCallback((gen: number, maxGen: number) =>
    PAD.left + (gen / Math.max(effectiveGenerations, maxGen)) * plotW,
    [effectiveGenerations, plotW],
  );

  const toSvgY = useCallback((freq: number) =>
    PAD.top + plotH - freq * plotH,
    [plotH],
  );

  // ── Hover → tooltip ─────────────────────────────────────────────────────

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (displayTrajectories.length === 0 || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * SVG_WIDTH;
    const svgY = ((e.clientY - rect.top) / rect.height) * height;

    // Map svgX back to generation
    const frac = (svgX - PAD.left) / plotW;
    if (frac < 0 || frac > 1) { setTooltip(null); return; }

    const maxLen = Math.max(...displayTrajectories.map(t => t.length));
    const gen = Math.round(frac * (maxLen - 1));
    if (gen < 0 || gen >= maxLen) { setTooltip(null); return; }

    // Find closest trajectory at this generation
    let closestFreq = 0;
    let closestDist = Infinity;
    for (const traj of displayTrajectories) {
      if (gen < traj.length) {
        const ty = toSvgY(traj[gen]);
        const d = Math.abs(ty - svgY);
        if (d < closestDist) {
          closestDist = d;
          closestFreq = traj[gen];
        }
      }
    }

    setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top, gen, freq: closestFreq });
  }, [displayTrajectories, height, plotW, toSvgY]);

  const handleMouseLeave = useCallback(() => setTooltip(null), []);

  // Auto-run when no controls — re-run when simulation-relevant props change
  useEffect(() => {
    if (!showControls && !externalTrajectories) {
      runSimulation();
    }
  }, [showControls, externalTrajectories, runSimulation]);

  // ── Build polyline points ────────────────────────────────────────────────

  const polylines = useMemo(() => {
    return displayTrajectories.map((traj, ti) => {
      const maxGen = traj.length - 1;
      if (maxGen === 0) return null;
      const pts = traj.map((f, i) => {
        const x = toSvgX(i, maxGen);
        const y = toSvgY(f);
        return `${x},${y}`;
      }).join(' ');
      const color = palette[ti % palette.length];
      const sw = displayTrajectories.length > 5 ? 1 : 1.5;
      const op = displayTrajectories.length > 5 ? 0.4 : 0.8;
      return { pts, color, sw, op, key: ti };
    }).filter(Boolean) as { pts: string; color: string; sw: number; op: number; key: number }[];
  }, [displayTrajectories, palette, toSvgX, toSvgY]);

  const meanPts = useMemo(() => {
    if (!showMean || meanTrajectory.length <= 1) return null;
    const maxGen = meanTrajectory.length - 1;
    return meanTrajectory.map((f, i) => {
      const x = toSvgX(i, maxGen);
      const y = toSvgY(f);
      return `${x},${y}`;
    }).join(' ');
  }, [showMean, meanTrajectory, toSvgX, toSvgY]);

  // ── X-axis tick labels ───────────────────────────────────────────────────

  const xTicks = useMemo(() => {
    const g = effectiveGenerations;
    if (g <= 10) return Array.from({ length: g + 1 }, (_, i) => i);
    // ~5 ticks
    const step = Math.ceil(g / 5 / 10) * 10; // round to nearest 10
    const ticks: number[] = [0];
    for (let v = step; v < g; v += step) ticks.push(v);
    ticks.push(g);
    return ticks;
  }, [effectiveGenerations]);

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="rounded-2xl border border-stone-200 shadow-sm bg-white p-4 space-y-3">
      {/* Title / preset label */}
      {presetLabel && (
        <div className="text-xs font-semibold text-violet-700 text-center">{presetLabel}</div>
      )}

      {/* SVG plot */}
      <div className="relative w-full">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${SVG_WIDTH} ${height}`}
          className="w-full"
          preserveAspectRatio="xMidYMid meet"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {/* Y-axis line */}
          <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + plotH}
            stroke="#a8a29e" strokeWidth="1" />
          {/* X-axis line */}
          <line x1={PAD.left} y1={PAD.top + plotH} x2={PAD.left + plotW} y2={PAD.top + plotH}
            stroke="#a8a29e" strokeWidth="1" />

          {/* Y-axis gridlines + labels: 0, 0.25, 0.50, 0.75, 1.00 */}
          {[0, 0.25, 0.5, 0.75, 1].map(v => (
            <g key={v}>
              <text x={PAD.left - 5} y={PAD.top + plotH - v * plotH + 3}
                textAnchor="end" fontSize="8" fill="#78716c">{v.toFixed(2)}</text>
              <line x1={PAD.left} y1={PAD.top + plotH - v * plotH}
                x2={PAD.left + plotW} y2={PAD.top + plotH - v * plotH}
                stroke="#e7e5e4" strokeWidth="0.5" />
            </g>
          ))}

          {/* p = 0.5 reference dashed line */}
          <line
            x1={PAD.left} y1={toSvgY(0.5)}
            x2={PAD.left + plotW} y2={toSvgY(0.5)}
            stroke="#a8a29e" strokeWidth="0.75" strokeDasharray="4,3" opacity="0.5"
          />

          {/* X-axis tick labels */}
          {xTicks.map(g => {
            const x = PAD.left + (g / effectiveGenerations) * plotW;
            return (
              <text key={g} x={x} y={PAD.top + plotH + 14}
                textAnchor="middle" fontSize="8" fill="#78716c">{g}</text>
            );
          })}

          {/* X-axis label */}
          <text x={PAD.left + plotW / 2} y={height - 4}
            textAnchor="middle" fontSize="9" fill="#78716c">Generation</text>

          {/* Y-axis label */}
          <text x={12} y={PAD.top + plotH / 2}
            textAnchor="middle" fontSize="9" fill="#78716c"
            transform={`rotate(-90, 12, ${PAD.top + plotH / 2})`}>
            {yLabel}
          </text>

          {/* Trajectory polylines */}
          {polylines.map(({ pts, color, sw, op, key }) => (
            <polyline key={key} points={pts} fill="none" stroke={color}
              strokeWidth={sw} opacity={op} />
          ))}

          {/* Mean trajectory */}
          {meanPts && (
            <polyline points={meanPts} fill="none" stroke="#1e1b4b"
              strokeWidth="2.5" opacity="0.9" strokeLinejoin="round" />
          )}

          {/* Legend for two-island or labelled trajectories */}
          {(trajectoryLabels ?? (twoIsland ? ['Pop 1', 'Pop 2'] : null))?.map((lbl, i) => (
            <g key={i}>
              <line x1={PAD.left + plotW - 100} y1={PAD.top + 10 + i * 14}
                x2={PAD.left + plotW - 85} y2={PAD.top + 10 + i * 14}
                stroke={palette[i % palette.length]} strokeWidth="2" />
              <text x={PAD.left + plotW - 80} y={PAD.top + 13 + i * 14}
                fontSize="8" fill="#57534e">{lbl}</text>
            </g>
          ))}
        </svg>

        {/* Tooltip overlay */}
        {tooltip && (
          <div
            className="pointer-events-none absolute z-10 rounded bg-stone-800 px-2 py-1 text-[10px] text-white shadow"
            style={{ left: tooltip.x + 12, top: tooltip.y - 28 }}
          >
            Gen {tooltip.gen}: {tooltip.freq.toFixed(3)}
          </div>
        )}
      </div>

      {/* Controls */}
      {showControls && (
        <div className="flex items-center gap-2 justify-center flex-wrap">
          <button
            onClick={runSimulation}
            className="px-4 py-1.5 text-xs font-semibold text-white rounded-lg bg-gradient-to-b from-violet-700 to-violet-800 hover:from-violet-800 hover:to-violet-900 transition-colors shadow-sm"
          >
            {displayTrajectories.length === 0 ? 'Run' : 'New replicates'}
          </button>
          {displayTrajectories.length > 1 && (
            <label className="flex items-center gap-1 text-xs text-stone-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showMean}
                onChange={e => setShowMean(e.target.checked)}
                className="accent-violet-700"
              />
              Show mean
            </label>
          )}
        </div>
      )}
    </div>
  );
}
