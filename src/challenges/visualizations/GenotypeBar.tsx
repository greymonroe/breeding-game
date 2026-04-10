/**
 * Small inline genotype display for qualitative loci.
 * Shows two cells representing each haplotype's allele,
 * respecting the player's discovery state.
 */
import type { Individual } from '../../engine';
import { getAlleleDisplay, type DiscoveryState } from '../../game/discovery';

export function GenotypeBar({ ind, discovery }: {
  ind: Individual;
  discovery: DiscoveryState;
}) {
  const [a0, a1] = getAlleleDisplay(ind, 'color', discovery);

  const bg = (allele: string) =>
    allele === 'R' ? 'bg-danger/70 text-white'
    : allele === 'r' ? 'bg-wheat text-soil'
    : 'bg-soil/10 text-muted';

  // If both are '?', don't show the bar at all
  if (a0 === '?' && a1 === '?') return null;

  return (
    <div className="mt-0.5 flex justify-center gap-px" title={`Genotype: ${a0}${a1}`}>
      <span className={`inline-block w-3 rounded-l text-center text-[7px] font-bold leading-3 ${bg(a0)}`}>
        {a0}
      </span>
      <span className={`inline-block w-3 rounded-r text-center text-[7px] font-bold leading-3 ${bg(a1)}`}>
        {a1}
      </span>
    </div>
  );
}
