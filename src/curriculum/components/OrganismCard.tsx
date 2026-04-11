import { OrganismIcon } from '../../shared/icons';
import {
  getPhenotype, getPhenotypeLabel, getGenotypeLabel,
  getEpistasisPhenotype, PIGMENT_GENE, AGOUTI_GENE,
  type GeneDefinition, type Organism,
} from '../genetics-engine';
import { epistasisColors } from './colors';

export function OrganismCard({
  org, genes, label, size = 'md', showGenotype = false, epistasis = false,
  onClick, selected = false,
}: {
  org: Organism; genes: GeneDefinition[]; label?: string; size?: 'sm' | 'md';
  showGenotype?: boolean; epistasis?: boolean; onClick?: () => void; selected?: boolean;
}) {
  const pheno = getPhenotype(org, genes);
  const mainGene = genes[0];
  let displayColor = mainGene.colorMap[pheno[mainGene.id]] ?? '#ccc';
  let displayLabel = getPhenotypeLabel(org, genes);

  if (epistasis) {
    const ep = getEpistasisPhenotype(org, PIGMENT_GENE, AGOUTI_GENE);
    displayLabel = ep;
    // Maize aleurone palette — single source of truth in ./colors.ts.
    displayColor = epistasisColors(ep) ?? '#ccc';
  }

  const px = size === 'sm' ? 'p-1.5' : 'p-2';

  const commonClassName = `inline-flex flex-col items-center gap-1 rounded-lg border-2 ${px} transition-all
    ${selected ? 'border-amber-500 bg-amber-50 shadow-md' : 'border-stone-200 bg-white'}
    ${onClick ? 'cursor-pointer hover:border-amber-300' : ''}`;

  const inner = (
    <>
      <OrganismIcon type="plant" color={displayColor} size={size} />
      {genes.length > 1 && !epistasis && (
        <div className="flex gap-0.5">
          {genes.slice(1).map(g => (
            <div key={g.id} className="w-4 h-4 rounded-sm border border-stone-200"
              style={{ backgroundColor: g.colorMap[pheno[g.id]] ?? '#ccc' }} />
          ))}
        </div>
      )}
      <div className="text-[9px] text-stone-500 font-semibold text-center leading-tight">
        {displayLabel}
      </div>
      {showGenotype && (
        <div className="text-[10px] font-mono text-stone-600 bg-stone-100 rounded px-1">
          {getGenotypeLabel(org, genes)}
        </div>
      )}
      {label && <div className="text-[9px] text-stone-400">{label}</div>}
    </>
  );

  // When onClick is provided, render as a real <button> so keyboard-only
  // users can activate it (Enter/Space) and it gets focus-ring semantics.
  // When not, a plain <div> avoids introducing an extraneous tab stop.
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={commonClassName}>
        {inner}
      </button>
    );
  }
  return <div className={commonClassName}>{inner}</div>;
}
