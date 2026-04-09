import { useState, useMemo } from 'react';
import type { ChallengeChildProps } from './ChallengeShell';

interface TrainingPlant {
  id: string;
  markers: number[];
  actualYield: number;
}

interface GenomicFitData {
  plants: TrainingPlant[];
  markerNames: string[];
  baseline: number;
  hint: string;
}

/**
 * Genomic Prediction Fit challenge.
 * Player adjusts marker effect sliders to fit a linear model to training data.
 * Live scatter plot and R² update as sliders change.
 */
export function GenomicFitChallenge({ instance, onSubmit, submitted }: ChallengeChildProps) {
  const data = instance.data as GenomicFitData;
  const [effects, setEffects] = useState<number[]>(data.markerNames.map(() => 1.0));
  const [showHint, setShowHint] = useState(false);

  function setEffect(idx: number, val: number) {
    if (submitted) return;
    const next = [...effects];
    next[idx] = val;
    setEffects(next);
  }

  // Compute predicted yields and R²
  const { predictions, rSquared } = useMemo(() => {
    const preds = data.plants.map((p) => {
      let pred = data.baseline;
      p.markers.forEach((m, i) => {
        pred += m * (effects[i] ?? 0);
      });
      return pred;
    });

    const actuals = data.plants.map((p) => p.actualYield);
    const meanActual = actuals.reduce((a, b) => a + b, 0) / actuals.length;
    const ssTot = actuals.reduce((s, y) => s + (y - meanActual) ** 2, 0);
    const ssRes = actuals.reduce((s, y, i) => s + (y - preds[i]) ** 2, 0);
    const r2 = ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 0;

    return { predictions: preds, rSquared: r2 };
  }, [data.plants, data.baseline, effects]);

  // SVG scatter plot dimensions
  const svgW = 280;
  const svgH = 220;
  const pad = 35;

  const allValues = [...predictions, ...data.plants.map((p) => p.actualYield)];
  const minVal = Math.min(...allValues) - 2;
  const maxVal = Math.max(...allValues) + 2;
  const range = maxVal - minVal || 1;

  function toX(v: number) {
    return pad + ((v - minVal) / range) * (svgW - 2 * pad);
  }
  function toY(v: number) {
    return svgH - pad - ((v - minVal) / range) * (svgH - 2 * pad);
  }

  function handleSubmit() {
    onSubmit({ effects: effects.map((e) => Math.round(e * 10) / 10) });
  }

  // R² color
  const r2Color = rSquared > 0.8 ? '#4a7c59' : rSquared > 0.5 ? '#e07a3a' : '#c0392b';

  return (
    <div className="space-y-4">
      {/* Instructions */}
      <div className="rounded-lg border border-sky/30 bg-sky/5 p-3">
        <p className="text-sm font-medium text-soil">
          Fit a genomic prediction model by adjusting marker effects.
        </p>
        <p className="mt-1 text-xs text-muted">
          Predicted yield = {data.baseline} (baseline){data.markerNames.map((n, i) => ` + ${n} x effect[${i}]`).join('')}.
          Maximize R² to get the best fit.
        </p>
      </div>

      {/* Training data table */}
      <div className="rounded-lg border border-soil/10 bg-white p-3">
        <p className="mb-2 text-xs font-semibold uppercase text-muted">Training Data</p>
        <div className="max-h-48 overflow-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-soil/10">
                <th className="py-1 text-left font-semibold text-muted">ID</th>
                {data.markerNames.map((n) => (
                  <th key={n} className="py-1 text-center font-semibold text-muted">{n}</th>
                ))}
                <th className="py-1 text-right font-semibold text-muted">Actual</th>
                <th className="py-1 text-right font-semibold text-muted">Predicted</th>
              </tr>
            </thead>
            <tbody>
              {data.plants.map((p, i) => (
                <tr key={p.id} className="border-b border-soil/5">
                  <td className="py-1 font-mono font-semibold text-soil">{p.id}</td>
                  {p.markers.map((m, mi) => (
                    <td key={mi} className="py-1 text-center font-mono text-soil">{m}</td>
                  ))}
                  <td className="py-1 text-right font-mono text-soil">{p.actualYield}</td>
                  <td className="py-1 text-right font-mono text-accent">{predictions[i].toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sliders */}
      <div className="rounded-lg border border-soil/10 bg-white p-3">
        <p className="mb-2 text-xs font-semibold uppercase text-muted">Marker Effects</p>
        <div className="space-y-3">
          {data.markerNames.map((name, i) => (
            <div key={name} className="flex items-center gap-3">
              <span className="w-12 text-xs font-semibold text-soil">{name}</span>
              <input
                type="range"
                min={0}
                max={4}
                step={0.1}
                value={effects[i]}
                onChange={(e) => setEffect(i, parseFloat(e.target.value))}
                disabled={submitted}
                className="h-2 flex-1 appearance-none rounded-full bg-soil/10 accent-accent"
              />
              <span className="w-10 text-right font-mono text-xs font-bold text-accent">
                {effects[i].toFixed(1)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Scatter plot + R² */}
      <div className="rounded-lg border border-soil/10 bg-white p-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase text-muted">Predicted vs Actual</p>
          <div className="flex items-center gap-1">
            <span className="text-xs font-semibold text-muted">R² =</span>
            <span className="font-mono text-sm font-bold" style={{ color: r2Color }}>
              {rSquared.toFixed(3)}
            </span>
          </div>
        </div>
        <svg viewBox={`0 0 ${svgW} ${svgH}`} className="mx-auto w-full max-w-xs">
          {/* Axes */}
          <line x1={pad} y1={svgH - pad} x2={svgW - pad} y2={svgH - pad} stroke="#3d2c1f" strokeWidth={1} opacity={0.2} />
          <line x1={pad} y1={pad} x2={pad} y2={svgH - pad} stroke="#3d2c1f" strokeWidth={1} opacity={0.2} />

          {/* Axis labels */}
          <text x={svgW / 2} y={svgH - 5} textAnchor="middle" fontSize={10} fill="#3d2c1f" opacity={0.5}>
            Predicted
          </text>
          <text x={10} y={svgH / 2} textAnchor="middle" fontSize={10} fill="#3d2c1f" opacity={0.5} transform={`rotate(-90, 10, ${svgH / 2})`}>
            Actual
          </text>

          {/* 1:1 line */}
          <line
            x1={toX(minVal)}
            y1={toY(minVal)}
            x2={toX(maxVal)}
            y2={toY(maxVal)}
            stroke="#87CEEB"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            opacity={0.6}
          />

          {/* Data points */}
          {data.plants.map((p, i) => (
            <circle
              key={p.id}
              cx={toX(predictions[i])}
              cy={toY(p.actualYield)}
              r={5}
              fill="#e07a3a"
              stroke="white"
              strokeWidth={1}
              opacity={0.85}
            />
          ))}
        </svg>
        <div className="mt-1 text-center text-[10px] text-muted">
          <span className="inline-block h-0.5 w-4 bg-sky" /> = 1:1 line (perfect prediction)
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
        disabled={submitted}
        className="w-full rounded bg-leaf py-2 text-sm font-semibold text-white disabled:opacity-40"
      >
        Submit Model (R² = {rSquared.toFixed(3)})
      </button>
    </div>
  );
}
