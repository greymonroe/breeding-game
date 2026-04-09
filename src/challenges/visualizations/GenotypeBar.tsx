/**
 * Small inline genotype display for the COLOR locus.
 * Shows two cells representing each haplotype's allele.
 * Visible from season 1 — no tech required.
 */
export function GenotypeBar({ haplotypes }: {
  haplotypes: [Map<string, string>, Map<string, string>];
}) {
  const a0 = haplotypes[0].get('COLOR') ?? '?';
  const a1 = haplotypes[1].get('COLOR') ?? '?';

  const bg = (allele: string) =>
    allele === 'R' ? 'bg-danger/70 text-white' : allele === 'r' ? 'bg-wheat text-soil' : 'bg-soil/10 text-muted';

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
