export interface HistogramChartProps {
  bins: number[];
  labels?: string[];
  colorFn?: (index: number, total: number) => string;
  title?: string;
  /** Optional reference value in the same units as `labels` (numeric x).
   *  Draws a vertical dashed line across the chart height at that x-position,
   *  assuming labels represent evenly-spaced bin centers from 0..1. */
  referenceX?: number;
  referenceLabel?: string;
}

const DEFAULT_COLOR_FN = (index: number, total: number): string => {
  const intensity = total > 1 ? index / (total - 1) : 0.5;
  const r = Math.round(45 + 160 * (1 - intensity));
  const g = Math.round(106 + 80 * intensity);
  const b = Math.round(79 + 40 * intensity);
  return `rgb(${r}, ${g}, ${b})`;
};

export function HistogramChart({
  bins,
  labels,
  colorFn = DEFAULT_COLOR_FN,
  title,
  referenceX,
  referenceLabel,
}: HistogramChartProps) {
  const maxCount = Math.max(...bins, 1);

  // Reference line position as a percentage across the bar row.
  // Assumes labels are numeric bin centers spanning [0, 1] (as used by Exp 7).
  const refPct =
    referenceX !== undefined && referenceX >= 0 && referenceX <= 1
      ? referenceX * 100
      : null;

  return (
    <div className="space-y-1">
      {title && (
        <div className="text-xs font-semibold text-stone-500 text-center">{title}</div>
      )}
      <div className="relative h-48 px-2 border-b border-stone-200">
        <div className="flex items-end gap-px h-full">
          {bins.map((count, i) => {
            const height = maxCount > 0 ? (count / maxCount) * 100 : 0;
            const color = colorFn(i, bins.length);
            return (
              <div key={i} className="flex-1 flex flex-col justify-end items-center h-full">
                <div className="text-[8px] text-stone-400 font-mono leading-none mb-0.5">
                  {count > 0 ? count : ''}
                </div>
                <div
                  className="w-full rounded-t-sm"
                  style={{
                    height: `${height}%`,
                    backgroundColor: color,
                    minHeight: count > 0 ? 2 : 0,
                  }}
                />
              </div>
            );
          })}
        </div>
        {refPct !== null && (
          <>
            <div
              className="pointer-events-none absolute top-0 bottom-0"
              style={{
                left: `calc(${refPct}% )`,
                borderLeft: '2px dashed #dc2626',
              }}
            />
            {referenceLabel && (
              <div
                className="pointer-events-none absolute top-0 text-[9px] font-semibold text-red-600"
                style={{ left: `calc(${refPct}% + 3px)` }}
              >
                {referenceLabel}
              </div>
            )}
          </>
        )}
      </div>
      {labels && (
        <div className="flex gap-px px-2">
          {labels.map((lbl, i) => (
            <div key={i} className="flex-1 text-center text-[8px] text-stone-500 font-mono">
              {lbl}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
