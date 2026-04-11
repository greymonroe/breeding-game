import type { GeneDefinition } from '../genetics-engine';

export function RatioBar({ counts, colorMap, genes, epistasis = false, order }: {
  counts: Record<string, number>; colorMap?: Record<string, string>;
  genes?: GeneDefinition[]; epistasis?: boolean;
  /** Optional explicit ordering for entries; falls back to count-desc when omitted. */
  order?: string[];
}) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (total === 0) return null;
  const rawEntries = Object.entries(counts);
  const entries = order
    ? rawEntries.slice().sort((a, b) => {
        const ai = order.indexOf(a[0]);
        const bi = order.indexOf(b[0]);
        if (ai === -1 && bi === -1) return b[1] - a[1];
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
      })
    : rawEntries.slice().sort((a, b) => b[1] - a[1]);

  // Resolve a label like "Red" or "Red, Round" to a primary fill color
  // and (optionally) a secondary indicator color for the second gene.
  function resolveColors(label: string): { fill: string; secondary?: string } {
    if (colorMap && colorMap[label]) return { fill: colorMap[label] };
    if (epistasis) {
      // Maize aleurone palette
      if (label === 'Colorless') return { fill: '#fef3c7' };
      if (label === 'Purple') return { fill: '#6b21a8' };
      if (label === 'Red') return { fill: '#c2410c' };
    }
    if (genes && genes.length > 0) {
      // Single-gene case: direct lookup
      if (!label.includes(', ')) {
        return { fill: genes[0]?.colorMap?.[label] ?? '#999' };
      }
      // Multi-gene case: look up each part in the matching gene's colorMap.
      const parts = label.split(', ').map(p => p.trim());
      let fill: string | undefined;
      let secondary: string | undefined;
      for (let i = 0; i < parts.length && i < genes.length; i++) {
        const c = genes[i]?.colorMap?.[parts[i]];
        if (i === 0) fill = c;
        else if (i === 1 && !secondary) secondary = c;
      }
      return { fill: fill ?? '#999', secondary };
    }
    return { fill: '#999' };
  }

  return (
    <div className="space-y-1">
      <div className="flex h-6 rounded-full overflow-hidden border border-stone-200">
        {entries.map(([label, count]) => {
          const { fill, secondary } = resolveColors(label);
          return (
            <div key={label} style={{
              width: `${(count / total) * 100}%`,
              backgroundColor: fill,
            }} className="relative group" title={`${label}: ${count}`}>
              {secondary && (
                <span
                  className="absolute top-1/2 left-1 -translate-y-1/2 w-2 h-2 rounded-sm border border-white/70"
                  style={{ backgroundColor: secondary }}
                  aria-hidden
                />
              )}
              {(count / total) > 0.1 && (
                <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white drop-shadow-sm">
                  {count}
                </span>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex gap-3 justify-center flex-wrap">
        {entries.map(([label, count]) => {
          const { fill, secondary } = resolveColors(label);
          return (
            <div key={label} className="flex items-center gap-1 text-[10px]">
              <span className="relative inline-flex items-center justify-center w-2.5 h-2.5 rounded-sm border border-stone-200"
                style={{ backgroundColor: fill }}>
                {secondary && (
                  <span
                    className="absolute -right-1 -bottom-1 w-1.5 h-1.5 rounded-sm border border-white"
                    style={{ backgroundColor: secondary }}
                    aria-hidden
                  />
                )}
              </span>
              <span className="text-stone-600 font-semibold">{label}: {count}</span>
              <span className="text-stone-400">({((count / total) * 100).toFixed(0)}%)</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
