/**
 * CrossoverVisualizer — step-through visualization of meiotic crossover.
 *
 * Pedagogical goal: students see the physical mechanism that produces
 * recombinant gametes. Four steps mirror the textbook meiosis I diagram:
 *   1. Homologous chromosomes (two bars, one per homolog)
 *   2. Replication (four sister chromatids)
 *   3. Chiasma (crossover X marks between non-sister chromatids)
 *   4. Result (four chromatids with swapped segments; gamete highlighted)
 *
 * All randomness lives in `makeGameteWithTrace` from the engine.
 * This component calls it once per meiosis and renders the trace.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  makeGameteWithTrace,
  type GeneConfig,
  type GameteTrace,
} from '../linkage-engine';

// ── Props ─────────────────────────────────────────────────────────────────

export interface CrossoverVisualizerProps {
  genes: GeneConfig[];
  recombFreqs: number[];
  height?: number;
  onGameteProduced?: (trace: GameteTrace) => void;
  autoRun?: boolean;
}

// ── Constants ─────────────────────────────────────────────────────────────

const STEP_COUNT = 4;
const STEP_LABELS = [
  'Homologous chromosomes',
  'DNA replication — sister chromatids',
  'Crossing over at chiasma',
  'Meiotic products — gamete selected',
];

// Cyan-themed chromosome colors
const HOMOLOG1_COLOR = '#0e7490'; // cyan-700
const HOMOLOG2_COLOR = '#155e75'; // cyan-800
const HOMOLOG1_LIGHT = '#a5f3fc'; // cyan-200
const HOMOLOG2_LIGHT = '#67e8f9'; // cyan-300
const CROSSOVER_MARK = '#f59e0b'; // amber-500
const GAMETE_HIGHLIGHT = '#10b981'; // emerald-500

// ── Component ─────────────────────────────────────────────────────────────

export function CrossoverVisualizer({
  genes,
  recombFreqs,
  height = 340,
  onGameteProduced,
  autoRun = false,
}: CrossoverVisualizerProps) {
  const [step, setStep] = useState(0);
  const [generation, setGeneration] = useState(0);

  // Respect prefers-reduced-motion: jump to final state
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener?.('change', handler);
    return () => mq.removeEventListener?.('change', handler);
  }, []);

  // Generate trace once per meiosis (on mount or when generation bumps)
  const trace: GameteTrace = useMemo(
    () => makeGameteWithTrace(genes, recombFreqs),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [genes, recombFreqs, generation],
  );

  // Notify parent when a gamete is produced (step reaches final)
  useEffect(() => {
    if (step === STEP_COUNT - 1) {
      onGameteProduced?.(trace);
    }
  }, [step, trace, onGameteProduced]);

  // If reduced motion, show final state directly
  useEffect(() => {
    if (reducedMotion) setStep(STEP_COUNT - 1);
  }, [reducedMotion, generation]);

  // Auto-run: advance to step 0 on mount
  useEffect(() => {
    if (autoRun && step === 0 && generation === 0) {
      setStep(0);
    }
  }, [autoRun, step, generation]);

  const newMeiosis = useCallback(() => {
    setStep(0);
    setGeneration(g => g + 1);
  }, []);

  const nextStep = useCallback(() => {
    setStep(s => Math.min(s + 1, STEP_COUNT - 1));
  }, []);

  const prevStep = useCallback(() => {
    setStep(s => Math.max(s - 1, 0));
  }, []);

  // ── Layout calculations ──────────────────────────────────────────────
  const svgWidth = 520;
  const svgHeight = height;
  const chromLeft = 80;
  const chromRight = svgWidth - 40;
  const chromWidth = chromRight - chromLeft;
  const chromHeight = 18;

  // Gene tick positions (normalized 0–1 along chromosome)
  const minPos = Math.min(...genes.map(g => g.position));
  const maxPos = Math.max(...genes.map(g => g.position));
  const range = maxPos - minPos || 1;
  const geneXPositions = genes.map(g =>
    chromLeft + ((g.position - minPos) / range) * chromWidth,
  );

  // Interval midpoints (for crossover marks)
  const intervalMidpoints = recombFreqs.map((_, i) =>
    (geneXPositions[i] + geneXPositions[i + 1]) / 2,
  );

  // ── SVG rendering ────────────────────────────────────────────────────

  function renderChromBar(
    x: number,
    y: number,
    w: number,
    h: number,
    color: string,
    opacity: number = 1,
  ) {
    return (
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={h / 2}
        fill={color}
        opacity={opacity}
      />
    );
  }

  function renderGeneTicks(y: number, h: number) {
    return geneXPositions.map((gx, i) => (
      <line
        key={i}
        x1={gx}
        y1={y - 1}
        x2={gx}
        y2={y + h + 1}
        stroke="white"
        strokeWidth={2}
        opacity={0.7}
      />
    ));
  }

  function renderGeneLabelsAbove(y: number, isHomolog1: boolean) {
    return genes.map((g, i) => (
      <text
        key={i}
        x={geneXPositions[i]}
        y={y}
        textAnchor="middle"
        fontSize={11}
        fontFamily="monospace"
        fontWeight="bold"
        fill={isHomolog1 ? HOMOLOG1_COLOR : HOMOLOG2_COLOR}
      >
        {isHomolog1 ? g.allele1 : g.allele2}
      </text>
    ));
  }

  // Step 1: Two homologs
  function renderStep1() {
    const y1 = svgHeight / 2 - 30;
    const y2 = svgHeight / 2 + 12;
    return (
      <g>
        {renderGeneLabelsAbove(y1 - 6, true)}
        {renderChromBar(chromLeft, y1, chromWidth, chromHeight, HOMOLOG1_COLOR)}
        {renderGeneTicks(y1, chromHeight)}

        {renderGeneLabelsAbove(y2 - 6, false)}
        {renderChromBar(chromLeft, y2, chromWidth, chromHeight, HOMOLOG2_COLOR)}
        {renderGeneTicks(y2, chromHeight)}

        {/* Homolog labels */}
        <text x={chromLeft - 8} y={y1 + chromHeight / 2 + 4} textAnchor="end" fontSize={10} fill={HOMOLOG1_COLOR} fontWeight="bold">
          Homolog 1
        </text>
        <text x={chromLeft - 8} y={y2 + chromHeight / 2 + 4} textAnchor="end" fontSize={10} fill={HOMOLOG2_COLOR} fontWeight="bold">
          Homolog 2
        </text>
      </g>
    );
  }

  // Step 2: Four sister chromatids
  function renderStep2() {
    const baseY = svgHeight / 2 - 50;
    const gap = 6;
    const ys = [baseY, baseY + chromHeight + gap, baseY + (chromHeight + gap) * 2 + 10, baseY + (chromHeight + gap) * 3 + 10];
    const colors = [HOMOLOG1_COLOR, HOMOLOG1_LIGHT, HOMOLOG2_COLOR, HOMOLOG2_LIGHT];
    const labels = ['1a', '1b', '2a', '2b'];

    return (
      <g>
        {ys.map((y, idx) => (
          <g key={idx}>
            {renderChromBar(chromLeft, y, chromWidth, chromHeight, colors[idx])}
            {renderGeneTicks(y, chromHeight)}
            <text x={chromLeft - 8} y={y + chromHeight / 2 + 4} textAnchor="end" fontSize={9} fill="#64748b" fontWeight="bold">
              {labels[idx]}
            </text>
          </g>
        ))}
        {/* Gene labels at top */}
        {genes.map((g, i) => (
          <g key={i}>
            <text x={geneXPositions[i]} y={baseY - 6} textAnchor="middle" fontSize={10} fontFamily="monospace" fontWeight="bold" fill={HOMOLOG1_COLOR}>
              {g.allele1}
            </text>
            <text x={geneXPositions[i]} y={ys[2] - 6} textAnchor="middle" fontSize={10} fontFamily="monospace" fontWeight="bold" fill={HOMOLOG2_COLOR}>
              {g.allele2}
            </text>
          </g>
        ))}
      </g>
    );
  }

  // Step 3: Chiasma marks at crossover locations
  function renderStep3() {
    const baseY = svgHeight / 2 - 50;
    const gap = 6;
    const ys = [baseY, baseY + chromHeight + gap, baseY + (chromHeight + gap) * 2 + 10, baseY + (chromHeight + gap) * 3 + 10];
    const colors = [HOMOLOG1_COLOR, HOMOLOG1_LIGHT, HOMOLOG2_COLOR, HOMOLOG2_LIGHT];
    const labels = ['1a', '1b', '2a', '2b'];

    return (
      <g>
        {ys.map((y, idx) => (
          <g key={idx}>
            {renderChromBar(chromLeft, y, chromWidth, chromHeight, colors[idx])}
            {renderGeneTicks(y, chromHeight)}
            <text x={chromLeft - 8} y={y + chromHeight / 2 + 4} textAnchor="end" fontSize={9} fill="#64748b" fontWeight="bold">
              {labels[idx]}
            </text>
          </g>
        ))}
        {/* Gene labels */}
        {genes.map((g, i) => (
          <g key={i}>
            <text x={geneXPositions[i]} y={baseY - 6} textAnchor="middle" fontSize={10} fontFamily="monospace" fontWeight="bold" fill={HOMOLOG1_COLOR}>
              {g.allele1}
            </text>
            <text x={geneXPositions[i]} y={ys[2] - 6} textAnchor="middle" fontSize={10} fontFamily="monospace" fontWeight="bold" fill={HOMOLOG2_COLOR}>
              {g.allele2}
            </text>
          </g>
        ))}
        {/* Crossover X marks */}
        {trace.crossovers.map((co, i) => {
          if (!co) return null;
          const cx = intervalMidpoints[i];
          // Draw X between chromatid 1b and 2a (non-sister)
          const topY = ys[1] + chromHeight / 2;
          const botY = ys[2] + chromHeight / 2;
          const midY = (topY + botY) / 2;
          const armLen = 12;
          return (
            <g key={i}>
              {/* X mark */}
              <line x1={cx - armLen} y1={topY} x2={cx + armLen} y2={botY} stroke={CROSSOVER_MARK} strokeWidth={3} strokeLinecap="round" />
              <line x1={cx + armLen} y1={topY} x2={cx - armLen} y2={botY} stroke={CROSSOVER_MARK} strokeWidth={3} strokeLinecap="round" />
              {/* Label */}
              <text x={cx} y={midY - 14} textAnchor="middle" fontSize={9} fill={CROSSOVER_MARK} fontWeight="bold">
                chiasma
              </text>
            </g>
          );
        })}
      </g>
    );
  }

  // Step 4: Result — four chromatids with recombinant segments, gamete highlighted
  function renderStep4() {
    const baseY = svgHeight / 2 - 60;
    const gap = 6;
    const ys = [baseY, baseY + chromHeight + gap, baseY + (chromHeight + gap) * 2 + 14, baseY + (chromHeight + gap) * 3 + 14];
    const chromatidIdx = trace.sourceChromatid;

    // Build allele arrays for each of the 4 chromatids after crossover.
    // Chromatids 0 (1a) and 3 (2b) are unchanged parental.
    // Chromatid 1 (1b) starts as homolog 1, swaps at each crossover to homolog 2 and back.
    // Chromatid 2 (2a) starts as homolog 2, swaps at each crossover to homolog 1 and back.
    const chromatidAlleles: string[][] = [[], [], [], []];
    let swap1b = false; // is 1b currently reading from homolog 2?
    let swap2a = false; // is 2a currently reading from homolog 1?

    for (let i = 0; i < genes.length; i++) {
      const a1 = genes[i].allele1;
      const a2 = genes[i].allele2;

      // Check if there's a crossover before this gene (between gene i-1 and i)
      if (i > 0 && trace.crossovers[i - 1]) {
        swap1b = !swap1b;
        swap2a = !swap2a;
      }

      chromatidAlleles[0].push(a1);           // 1a: always homolog 1
      chromatidAlleles[1].push(swap1b ? a2 : a1); // 1b: swaps at crossovers
      chromatidAlleles[2].push(swap2a ? a1 : a2); // 2a: swaps at crossovers
      chromatidAlleles[3].push(a2);           // 2b: always homolog 2
    }

    // Determine which chromatids are recombinant
    const isRecombinant = [false, false, false, false];
    if (trace.crossovers.some(c => c)) {
      isRecombinant[1] = true;
      isRecombinant[2] = true;
    }

    // Color segments of each chromatid based on which homolog the allele came from
    function renderSegmentedChrom(y: number, alleles: string[], idx: number) {
      const isSelected = idx === chromatidIdx;
      const segments: { x1: number; x2: number; color: string }[] = [];

      for (let i = 0; i < genes.length; i++) {
        const fromHomolog1 = alleles[i] === genes[i].allele1;
        const color = fromHomolog1 ? HOMOLOG1_COLOR : HOMOLOG2_COLOR;
        const x1 = i === 0 ? chromLeft : (geneXPositions[i - 1] + geneXPositions[i]) / 2;
        const x2 = i === genes.length - 1 ? chromLeft + chromWidth : (geneXPositions[i] + geneXPositions[i + 1]) / 2;
        segments.push({ x1, x2, color });
      }

      return (
        <g>
          {/* Selection highlight */}
          {isSelected && (
            <rect
              x={chromLeft - 4}
              y={y - 3}
              width={chromWidth + 8}
              height={chromHeight + 6}
              rx={chromHeight / 2 + 3}
              fill="none"
              stroke={GAMETE_HIGHLIGHT}
              strokeWidth={2.5}
              strokeDasharray="none"
            />
          )}
          {/* Chromosome segments */}
          {segments.map((seg, si) => {
            const isFirst = si === 0;
            const isLast = si === segments.length - 1;
            // Use clipPath for rounded ends on first/last segment
            return (
              <rect
                key={si}
                x={seg.x1}
                y={y}
                width={seg.x2 - seg.x1}
                height={chromHeight}
                rx={isFirst || isLast ? chromHeight / 2 : 0}
                fill={seg.color}
                opacity={isSelected ? 1 : 0.5}
              />
            );
          })}
          {/* Gene ticks */}
          {renderGeneTicks(y, chromHeight)}
          {/* Allele labels */}
          {alleles.map((a, i) => (
            <text
              key={i}
              x={geneXPositions[i]}
              y={y + chromHeight + 12}
              textAnchor="middle"
              fontSize={9}
              fontFamily="monospace"
              fontWeight="bold"
              fill={isSelected ? '#065f46' : '#64748b'}
            >
              {a}
            </text>
          ))}
        </g>
      );
    }

    const chromLabels = ['1a (parental)', '1b', '2a', '2b (parental)'];

    return (
      <g>
        {[0, 1, 2, 3].map(idx => (
          <g key={idx}>
            {renderSegmentedChrom(ys[idx], chromatidAlleles[idx], idx)}
            <text
              x={chromLeft - 8}
              y={ys[idx] + chromHeight / 2 + 4}
              textAnchor="end"
              fontSize={8}
              fill={idx === chromatidIdx ? GAMETE_HIGHLIGHT : '#94a3b8'}
              fontWeight={idx === chromatidIdx ? 'bold' : 'normal'}
            >
              {chromLabels[idx]}
              {isRecombinant[idx] ? ' *' : ''}
            </text>
          </g>
        ))}
        {/* Gamete result label */}
        <text
          x={svgWidth / 2}
          y={ys[3] + chromHeight + 30}
          textAnchor="middle"
          fontSize={12}
          fontWeight="bold"
          fill={GAMETE_HIGHLIGHT}
        >
          Gamete: {genes.map(g => trace.gamete[g.name]).join(' ')}
          {isRecombinant[chromatidIdx] ? ' (recombinant)' : ' (parental)'}
        </text>
      </g>
    );
  }

  const stepRenderers = [renderStep1, renderStep2, renderStep3, renderStep4];

  return (
    <div className="rounded-2xl border border-stone-200 bg-white shadow-sm p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-lg font-bold text-cyan-800">Crossover Visualizer</div>
          <div className="text-xs text-stone-500">
            Step through meiosis to see how crossing over produces recombinant gametes.
          </div>
        </div>
      </div>

      {/* SVG stage */}
      <div className="flex justify-center">
        <svg
          width={svgWidth}
          height={svgHeight}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="max-w-full"
          style={{ overflow: 'visible' }}
        >
          {stepRenderers[step]()}
        </svg>
      </div>

      {/* Step indicator + controls */}
      <div className="flex items-center justify-between pt-2 border-t border-stone-100">
        <div className="text-xs font-semibold text-stone-500">
          Step {step + 1} of {STEP_COUNT}:
          <span className="ml-1 text-cyan-700">{STEP_LABELS[step]}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={prevStep}
            disabled={step === 0}
            className="px-3 py-1 text-xs font-semibold rounded-lg border border-stone-200 bg-white text-stone-600 hover:bg-stone-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={nextStep}
            disabled={step === STEP_COUNT - 1}
            className="px-3 py-1 text-xs font-semibold rounded-lg border border-cyan-300 bg-cyan-50 text-cyan-800 hover:bg-cyan-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
          <button
            type="button"
            onClick={newMeiosis}
            className="px-3 py-1 text-xs font-bold rounded-lg bg-gradient-to-b from-cyan-700 to-cyan-800 text-white shadow-sm hover:shadow-md active:from-cyan-800 transition-all"
          >
            New meiosis
          </button>
        </div>
      </div>

      {/* Crossover summary (visible on steps 3+4) */}
      {step >= 2 && (
        <div className="text-xs text-stone-500 bg-stone-50 rounded-lg px-3 py-2 border border-stone-100">
          {trace.crossovers.some(c => c) ? (
            <>
              Crossover{trace.crossovers.filter(c => c).length > 1 ? 's' : ''} occurred in{' '}
              {trace.crossovers
                .map((c, i) => (c ? `interval ${genes[i].name}--${genes[i + 1].name}` : null))
                .filter(Boolean)
                .join(' and ')}
              .{' '}
              {trace.crossovers.filter(c => c).length >= 2 && 'Double crossover! '}
              The selected gamete is{' '}
              <span className="font-semibold text-cyan-700">
                {trace.crossovers.some(c => c) &&
                [1, 2].includes(trace.sourceChromatid)
                  ? 'recombinant'
                  : 'parental'}
              </span>
              .
            </>
          ) : (
            <>No crossover in this meiosis — all four chromatids are parental type.</>
          )}
        </div>
      )}
    </div>
  );
}
