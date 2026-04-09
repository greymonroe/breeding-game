import { useState } from 'react';
import { useGame } from '../game/state';

export function MarkerLab() {
  const { unlocked, markers, genotypeAll, runGwas, budget, nurseries, traits } = useGame();
  const [nurseryId, setNurseryId] = useState<string>('');
  const [traitName, setTraitName] = useState<string>('yield');

  if (!unlocked.has('marker_discovery')) {
    return (
      <div className="rounded-lg border border-soil/20 bg-white p-3 text-xs text-muted">
        Unlock <strong>Marker discovery</strong> in the Tech Tree to use the marker lab.
      </div>
    );
  }

  const target = nurseries.find((n) => n.id === nurseryId) ?? nurseries[0];
  const cost = target.plants.length * 3;
  const phenotypedCount = target.plants.filter((p) => p.phenotype.has(traitName)).length;
  const associations = [...markers.associations.values()];
  const measurableTraits = traits.filter((t) => t.type === 'quantitative' || t.name === 'disease');

  return (
    <div className="rounded-lg border border-soil/20 bg-white p-3 space-y-3">
      <div>
        <h3 className="font-semibold text-soil text-sm">Marker lab</h3>
        <p className="text-[11px] text-muted">
          Genotype a nursery, then GWAS-scan it on a chosen phenotype to discover marker–trait associations.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <label className="flex items-center gap-1">
          Nursery:
          <select
            value={target.id}
            onChange={(e) => setNurseryId(e.target.value)}
            className="rounded border border-soil/30 px-2 py-1"
          >
            {nurseries.map((n) => (
              <option key={n.id} value={n.id}>
                {n.name} ({n.plants.length})
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1">
          Trait:
          <select
            value={traitName}
            onChange={(e) => setTraitName(e.target.value)}
            className="rounded border border-soil/30 px-2 py-1"
          >
            {measurableTraits.map((t) => (
              <option key={t.name} value={t.name}>
                {t.displayName}
              </option>
            ))}
          </select>
        </label>
        <span className="text-muted">
          {phenotypedCount}/{target.plants.length} have {traitName} measured
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => genotypeAll(target.id)}
          disabled={budget.cash < cost}
          className="rounded bg-leaf px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
        >
          Genotype {target.name} (${cost})
        </button>
        <button
          onClick={() => runGwas(traitName, target.id)}
          className="rounded bg-accent px-3 py-1.5 text-xs font-semibold text-white"
        >
          Run GWAS on {traitName}
        </button>
      </div>

      {associations.length > 0 && (
        <div>
          <div className="text-[11px] uppercase text-muted">Discovered associations</div>
          <table className="w-full text-xs mt-1">
            <thead className="text-muted">
              <tr><th className="text-left">Locus</th><th>Trait</th><th>Effect</th><th>Favorable</th></tr>
            </thead>
            <tbody>
              {associations.map((a) => (
                <tr key={a.locusId} className="border-t border-soil/10">
                  <td className="py-1 font-mono">{a.locusId}</td>
                  <td className="text-center">{a.traitName}</td>
                  <td className="text-center font-mono">{a.effect.toFixed(2)}</td>
                  <td className="text-center font-mono">{a.favorable}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
