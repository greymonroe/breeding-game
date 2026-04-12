/**
 * OffspringGrid — a grid of small plant icons representing offspring from a cross.
 *
 * Used in early Mendelian experiments to make the abstract ratio visible as
 * actual plants before the RatioBar abstracts it into a colored bar. Each
 * offspring is a tiny PlantIcon colored by its phenotype.
 *
 * Positions are shuffled once via useMemo so the grid looks like a field of
 * mixed plants rather than sorted blocks — same approach PopGen's
 * PopulationGrid uses (and the same useMemo-stabilisation fix from that
 * module's audit).
 */

import { useMemo } from 'react';
import { PlantIcon } from '../../shared/icons/PlantIcon';

export interface OffspringGridProps {
  /** Phenotype class entries with display color and count. */
  offspring: { phenotype: string; color: string; count: number }[];
  /** Maximum number of plant icons to display (default 40). */
  maxDisplay?: number;
  /** Icon pixel size (default 28). */
  size?: number;
  /** Show count summary below the grid (default true). */
  showCounts?: boolean;
  /** Shuffle plant positions — set false to keep phenotypes grouped (default true). */
  shuffle?: boolean;
}

export function OffspringGrid({
  offspring,
  maxDisplay = 40,
  size = 28,
  showCounts = true,
  shuffle = true,
}: OffspringGridProps) {
  const totalCount = offspring.reduce((s, o) => s + o.count, 0);
  if (totalCount === 0) return null;

  // Build an array of individual plant entries, down-sampled proportionally
  // when totalCount > maxDisplay so the ratio is preserved.
  const plants = useMemo(() => {
    const display = Math.min(totalCount, maxDisplay);
    const arr: { phenotype: string; color: string }[] = [];

    if (totalCount <= maxDisplay) {
      // Show every plant
      for (const o of offspring) {
        for (let i = 0; i < o.count; i++) {
          arr.push({ phenotype: o.phenotype, color: o.color });
        }
      }
    } else {
      // Down-sample proportionally, rounding so we hit `display` total.
      // Use largest-remainder method to keep ratios accurate.
      const rawShares = offspring.map(o => (o.count / totalCount) * display);
      const floored = rawShares.map(Math.floor);
      let remaining = display - floored.reduce((a, b) => a + b, 0);
      const remainders = rawShares.map((r, i) => ({ idx: i, rem: r - floored[i] }));
      remainders.sort((a, b) => b.rem - a.rem);
      for (let i = 0; i < remaining; i++) {
        floored[remainders[i].idx] += 1;
      }

      for (let i = 0; i < offspring.length; i++) {
        for (let j = 0; j < floored[i]; j++) {
          arr.push({ phenotype: offspring[i].phenotype, color: offspring[i].color });
        }
      }
    }

    // Shuffle (Fisher-Yates) if requested — deterministic per mount via useMemo
    if (shuffle) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
    }

    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offspring, maxDisplay, totalCount, shuffle]);

  const overflow = totalCount - plants.length;

  // Derive a slightly darker stroke from the fill color for each plant.
  // Quick approach: if color starts with '#', darken by blending toward black.
  function strokeFor(hex: string): string {
    if (!hex.startsWith('#') || hex.length < 7) return hex;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const darken = (v: number) => Math.max(0, Math.round(v * 0.7));
    return `#${darken(r).toString(16).padStart(2, '0')}${darken(g).toString(16).padStart(2, '0')}${darken(b).toString(16).padStart(2, '0')}`;
  }

  return (
    <div className="space-y-2">
      {/* Grid of plant icons */}
      <div
        className="flex flex-wrap gap-1 justify-center mx-auto"
        style={{ maxWidth: `${Math.min(12, Math.ceil(Math.sqrt(plants.length + 2))) * (size + 6) + 16}px` }}
      >
        {plants.map((p, i) => (
          <PlantIcon
            key={i}
            color={p.color}
            strokeColor={strokeFor(p.color)}
            pixelSize={size}
            size="sm"
            height={35}
            showSoil={false}
          />
        ))}
      </div>

      {/* Overflow note */}
      {overflow > 0 && (
        <p className="text-center text-[10px] text-stone-400 italic">
          (+{overflow} more not shown)
        </p>
      )}

      {/* Legend / counts */}
      {showCounts && (
        <div className="flex gap-3 justify-center flex-wrap">
          {offspring.filter(o => o.count > 0).map(o => (
            <div key={o.phenotype} className="flex items-center gap-1 text-[10px]">
              <span
                className="inline-block w-2.5 h-2.5 rounded-sm border border-stone-200"
                style={{ backgroundColor: o.color }}
              />
              <span className="text-stone-600 font-semibold">
                {o.phenotype}: {o.count}
              </span>
              <span className="text-stone-400">
                ({((o.count / totalCount) * 100).toFixed(0)}%)
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
