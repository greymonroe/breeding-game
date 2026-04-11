import { useCallback } from 'react';
import { OrganismCard } from './OrganismCard';
import { RatioBar } from './RatioBar';
import {
  cross, getEpistasisPhenotype, ALEURONE_C_GENE, ALEURONE_PR_GENE,
  type GeneDefinition, type Organism, type CrossResult,
} from '../genetics-engine';

export function CrossWorkbench({
  parentA, parentB, genes, onCross, crossResult, sampleSize = 100,
  showGenotypes = false, epistasis = false, label, order,
}: {
  parentA: Organism; parentB: Organism; genes: GeneDefinition[];
  onCross: (result: CrossResult) => void; crossResult: CrossResult | null;
  sampleSize?: number; showGenotypes?: boolean; epistasis?: boolean; label?: string;
  order?: string[];
}) {
  const doCross = useCallback(() => {
    const result = cross(parentA, parentB, genes, sampleSize);
    onCross(result);
  }, [parentA, parentB, genes, sampleSize, onCross]);

  // For epistasis, recompute phenotype counts
  let displayCounts = crossResult?.phenotypeCounts ?? {};
  if (epistasis && crossResult) {
    displayCounts = {};
    for (const off of crossResult.offspring) {
      const ep = getEpistasisPhenotype(off, ALEURONE_C_GENE, ALEURONE_PR_GENE);
      displayCounts[ep] = (displayCounts[ep] ?? 0) + 1;
    }
  }

  return (
    <div className="space-y-4">
      {label && <div className="text-xs font-bold text-stone-400 tracking-wider">{label}</div>}
      <div className="flex items-center justify-center gap-4">
        <OrganismCard org={parentA} genes={genes} label="Parent 1"
          showGenotype={showGenotypes} epistasis={epistasis} />
        <span className="text-2xl font-bold text-stone-400">&times;</span>
        <OrganismCard org={parentB} genes={genes} label="Parent 2"
          showGenotype={showGenotypes} epistasis={epistasis} />
        <button onClick={doCross}
          aria-label={`Run cross: ${label ?? 'current parents'}`}
          className="ml-4 rounded-xl bg-gradient-to-b from-emerald-600 to-emerald-700 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:shadow-lg active:from-emerald-700 transition-all">
          Cross!
        </button>
      </div>
      {crossResult && (
        <div className="space-y-3">
          <div className="text-xs text-stone-500 font-semibold text-center">
            {crossResult.total} offspring produced
          </div>
          <RatioBar counts={displayCounts} genes={genes} epistasis={epistasis} order={order} />
          {showGenotypes && (
            <div className="text-xs text-stone-400 text-center font-mono">
              Genotypes: {Object.entries(crossResult.genotypeCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([g, c]) => `${g}:${c}`).join('  ')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
