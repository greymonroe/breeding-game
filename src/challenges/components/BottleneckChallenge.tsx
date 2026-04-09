import { useState } from 'react';
import type { ChallengeChildProps } from './ChallengeShell';

interface PlantAllele {
  id: number;
  allele1: string;
  allele2: string;
}

interface BottleneckData {
  population: PlantAllele[];
  totalAlleles: number;
  hint: string;
}

/**
 * Bottleneck / Genetic Drift challenge.
 * Shows a population of 20 plants. Two are highlighted as survivors.
 * Player predicts how many unique alleles survive the bottleneck.
 */
export function BottleneckChallenge({ instance, onSubmit, submitted }: ChallengeChildProps) {
  const data = instance.data as BottleneckData;
  const [count, setCount] = useState('');
  const [showHint, setShowHint] = useState(false);

  const survivors = [1, 2];

  // Collect all unique alleles for display
  const allAlleles = new Set<string>();
  data.population.forEach((p) => {
    allAlleles.add(p.allele1);
    allAlleles.add(p.allele2);
  });

  // Color mapping for alleles
  const alleleColors: Record<string, string> = {};
  const palette = [
    '#e07a3a', '#4a7c59', '#87CEEB', '#c0392b', '#3d2c1f',
    '#9b59b6', '#e8d5a3', '#2ecc71', '#e74c3c', '#3498db',
    '#f39c12', '#1abc9c', '#d35400', '#8e44ad', '#2c3e50',
  ];
  let ci = 0;
  allAlleles.forEach((a) => {
    alleleColors[a] = palette[ci % palette.length];
    ci++;
  });

  function handleSubmit() {
    const n = parseInt(count, 10);
    if (isNaN(n)) return;
    onSubmit({ count: n });
  }

  return (
    <div className="space-y-4">
      {/* Population info */}
      <div className="rounded-lg border border-sky/30 bg-sky/5 p-3">
        <p className="text-sm font-medium text-soil">
          A population of {data.population.length} plants carries <strong>{data.totalAlleles}</strong> unique alleles.
        </p>
        <p className="mt-1 text-xs text-muted">
          A drought kills all but plants <strong>#1</strong> and <strong>#2</strong>.
          How many unique alleles survive?
        </p>
      </div>

      {/* Population grid */}
      <div className="rounded-lg border border-soil/10 bg-white p-3">
        <p className="mb-2 text-xs font-semibold uppercase text-muted">Population</p>
        <div className="grid grid-cols-5 gap-2">
          {data.population.map((plant) => {
            const isSurvivor = survivors.includes(plant.id);
            return (
              <div
                key={plant.id}
                className={`relative flex flex-col items-center rounded-lg border-2 p-2 ${
                  isSurvivor
                    ? 'border-accent bg-accent/10 shadow-md'
                    : 'border-soil/10 bg-surface opacity-60'
                }`}
              >
                {isSurvivor && (
                  <span className="absolute -right-1 -top-1 rounded-full bg-accent px-1.5 text-[10px] font-bold text-white">
                    ★
                  </span>
                )}
                <span className="text-[10px] font-bold text-muted">#{plant.id}</span>
                <div className="mt-1 flex gap-1">
                  <span
                    className="inline-block h-5 w-5 rounded-full border border-white text-center text-[9px] font-bold leading-5 text-white"
                    style={{ backgroundColor: alleleColors[plant.allele1] }}
                    title={plant.allele1}
                  >
                    {plant.allele1.slice(0, 2)}
                  </span>
                  <span
                    className="inline-block h-5 w-5 rounded-full border border-white text-center text-[9px] font-bold leading-5 text-white"
                    style={{ backgroundColor: alleleColors[plant.allele2] }}
                    title={plant.allele2}
                  >
                    {plant.allele2.slice(0, 2)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Allele legend */}
      <div className="flex flex-wrap gap-2">
        {Array.from(allAlleles).map((a) => (
          <span key={a} className="flex items-center gap-1 text-[10px] text-muted">
            <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: alleleColors[a] }} />
            {a}
          </span>
        ))}
      </div>

      {/* Answer input */}
      <div className="rounded-lg border border-soil/10 bg-white p-3">
        <label className="block text-sm font-medium text-soil">
          How many unique alleles survive the bottleneck?
        </label>
        <div className="mt-2 flex items-center gap-2">
          <input
            type="number"
            min={1}
            max={data.totalAlleles}
            value={count}
            onChange={(e) => setCount(e.target.value)}
            placeholder="e.g. 3"
            className="w-24 rounded border border-soil/30 px-3 py-1.5 font-mono text-sm"
            disabled={submitted}
          />
          <span className="text-xs text-muted">out of {data.totalAlleles} total</span>
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
        disabled={!count || submitted}
        className="w-full rounded bg-leaf py-2 text-sm font-semibold text-white disabled:opacity-40"
      >
        Check Answer
      </button>
    </div>
  );
}
