import type { GeneDefinition } from '../genetics-engine';

export function RatioBar({ counts, colorMap, genes, epistasis = false }: {
  counts: Record<string, number>; colorMap?: Record<string, string>;
  genes?: GeneDefinition[]; epistasis?: boolean;
}) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (total === 0) return null;
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  function getColor(label: string): string {
    if (colorMap && colorMap[label]) return colorMap[label];
    if (epistasis) {
      if (label === 'Albino') return '#f5f0e0';
      if (label === 'Agouti') return '#a08060';
      if (label === 'Black') return '#3a2820';
    }
    if (genes && genes.length > 0) {
      return genes[0].colorMap[label] ?? '#999';
    }
    return '#999';
  }

  return (
    <div className="space-y-1">
      <div className="flex h-6 rounded-full overflow-hidden border border-stone-200">
        {entries.map(([label, count]) => (
          <div key={label} style={{
            width: `${(count / total) * 100}%`,
            backgroundColor: getColor(label),
          }} className="relative group" title={`${label}: ${count}`}>
            {(count / total) > 0.1 && (
              <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white drop-shadow-sm">
                {count}
              </span>
            )}
          </div>
        ))}
      </div>
      <div className="flex gap-3 justify-center flex-wrap">
        {entries.map(([label, count]) => (
          <div key={label} className="flex items-center gap-1 text-[10px]">
            <span className="w-2.5 h-2.5 rounded-sm border border-stone-200"
              style={{ backgroundColor: getColor(label) }} />
            <span className="text-stone-600 font-semibold">{label}: {count}</span>
            <span className="text-stone-400">({((count / total) * 100).toFixed(0)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}
