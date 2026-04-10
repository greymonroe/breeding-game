interface AlleleBadgeProps {
  allele: string;
  dominant: boolean;
}

export function AlleleBadge({ allele, dominant }: AlleleBadgeProps) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded px-1.5 py-0.5 text-[11px] font-mono font-bold leading-none
        ${dominant
          ? 'bg-amber-100 text-amber-800 border border-amber-300'
          : 'bg-stone-100 text-stone-500 border border-stone-200'}`}
    >
      {allele}
    </span>
  );
}

interface GenotypeLabelProps {
  genotype: string;
}

export function GenotypeLabel({ genotype }: GenotypeLabelProps) {
  return (
    <span className="font-mono text-sm tracking-wide text-stone-700 bg-stone-50 rounded px-1.5 py-0.5 border border-stone-200">
      {genotype}
    </span>
  );
}

interface PunnettGridProps {
  rows: string[];
  cols: string[];
  cells: string[][];
}

export function PunnettGrid({ rows, cols, cells }: PunnettGridProps) {
  return (
    <table className="border-collapse text-center text-xs font-mono">
      <thead>
        <tr>
          <th className="w-8 h-8" />
          {cols.map((c, i) => (
            <th key={i} className="w-12 h-8 border border-stone-300 bg-amber-50 font-bold text-amber-800">
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, ri) => (
          <tr key={ri}>
            <th className="w-12 h-10 border border-stone-300 bg-amber-50 font-bold text-amber-800">
              {r}
            </th>
            {cells[ri].map((cell, ci) => (
              <td key={ci} className="w-12 h-10 border border-stone-300 bg-white text-stone-700">
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
