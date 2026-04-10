export interface HistogramChartProps {
  bins: number[];
  labels?: string[];
  colorFn?: (index: number, total: number) => string;
  title?: string;
}

const DEFAULT_COLOR_FN = (index: number, total: number): string => {
  const intensity = total > 1 ? index / (total - 1) : 0.5;
  const r = Math.round(45 + 160 * (1 - intensity));
  const g = Math.round(106 + 80 * intensity);
  const b = Math.round(79 + 40 * intensity);
  return `rgb(${r}, ${g}, ${b})`;
};

export function HistogramChart({ bins, labels, colorFn = DEFAULT_COLOR_FN, title }: HistogramChartProps) {
  const maxCount = Math.max(...bins);

  return (
    <div className="space-y-1">
      {title && (
        <div className="text-xs font-semibold text-stone-500 text-center">{title}</div>
      )}
      <div className="flex items-end gap-px h-40 px-2">
        {bins.map((count, i) => {
          const height = maxCount > 0 ? (count / maxCount) * 100 : 0;
          const color = colorFn(i, bins.length);
          const lbl = labels ? labels[i] : String(i);
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
              <div className="text-[8px] text-stone-400 font-mono">{count > 0 ? count : ''}</div>
              <div className="w-full rounded-t-sm" style={{
                height: `${height}%`, backgroundColor: color, minHeight: count > 0 ? 2 : 0,
              }} />
              <div className="text-[8px] text-stone-500 font-mono">{lbl}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
