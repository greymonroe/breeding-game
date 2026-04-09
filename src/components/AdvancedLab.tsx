import { useState } from 'react';
import { useGame } from '../game/state';

export function AdvancedLab() {
  const {
    unlocked,
    germplasm,
    selectedIds,
    markers,
    predictor,
    budget,
    acquireWildAccession,
    introducePlantFromBank,
    mutagenizeField,
    editIndividual,
    trainPredictor,
  } = useGame();
  const active = useGame((s) => s.activeNursery());
  const population = active.plants;

  const showAny =
    unlocked.has('wild_germplasm') ||
    unlocked.has('mutagenesis') ||
    unlocked.has('gene_editing') ||
    unlocked.has('genomic_prediction') ||
    unlocked.has('hybrid_breeding');

  if (!showAny) return null;

  const focused =
    selectedIds.length === 1 ? population.find((p) => p.id === selectedIds[0]) : null;
  const associations = [...markers.associations.values()];
  const [editLocus, setEditLocus] = useState<string>('');
  const [editAllele, setEditAllele] = useState<string>('');

  return (
    <div className="rounded-lg border border-soil/20 bg-white p-3 space-y-4">
      <h3 className="font-semibold text-soil text-sm">Advanced lab</h3>

      {unlocked.has('wild_germplasm') && (
        <section>
          <div className="text-[11px] uppercase text-muted">Germplasm bank</div>
          <p className="text-[11px] text-muted">
            Wild accessions add novel alleles to the gene pool. Cross them with elite to introgress useful variation.
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <button
              onClick={acquireWildAccession}
              disabled={budget.cash < 30}
              className="rounded bg-leaf px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
            >
              Acquire wild accession ($30)
            </button>
            <span className="text-[11px] text-muted">In bank: {germplasm.length}</span>
          </div>
          {germplasm.length > 0 && (
            <ul className="mt-2 space-y-1">
              {germplasm.map((g) => (
                <li key={g.id} className="text-xs flex items-center gap-2">
                  <span className="font-mono">{g.id}</span>
                  <span className="text-muted">y={g.phenotype.get('yield')?.toFixed(1)}</span>
                  <button
                    onClick={() => introducePlantFromBank(g.id)}
                    className="ml-auto rounded border border-soil/30 px-2 py-0.5 text-[11px]"
                  >
                    Plant in field
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {unlocked.has('hybrid_breeding') && (
        <section>
          <div className="text-[11px] uppercase text-muted">Hybrid breeding</div>
          <p className="text-[11px] text-muted">
            Develop two contrasting inbred lines (repeatedly self), then cross them to produce F1 hybrids that
            show heterosis. Watch yield jump in the F1 vs the inbred parents.
          </p>
        </section>
      )}

      {unlocked.has('mutagenesis') && (
        <section>
          <div className="text-[11px] uppercase text-muted">Mutagenesis</div>
          <p className="text-[11px] text-muted">
            Apply mutagen to the current field. ~30% of plants will receive a random allele change. Most will be
            neutral or deleterious — screen for improvements.
          </p>
          <button
            onClick={mutagenizeField}
            disabled={budget.cash < 25}
            className="mt-1 rounded bg-accent px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
          >
            Mutagenize field ($25)
          </button>
        </section>
      )}

      {unlocked.has('gene_editing') && (
        <section>
          <div className="text-[11px] uppercase text-muted">Gene editing</div>
          {associations.length === 0 ? (
            <p className="text-[11px] text-muted">Discover marker–trait associations first (Marker lab → GWAS).</p>
          ) : !focused ? (
            <p className="text-[11px] text-muted">Select exactly one plant in the field to edit.</p>
          ) : (
            <div className="space-y-1 mt-1">
              <p className="text-[11px] text-muted">Editing {focused.id}:</p>
              <div className="flex flex-wrap gap-2 items-center">
                <select
                  value={editLocus}
                  onChange={(e) => {
                    setEditLocus(e.target.value);
                    const a = associations.find((x) => x.locusId === e.target.value);
                    if (a) setEditAllele(a.favorable);
                  }}
                  className="rounded border border-soil/30 px-2 py-1 text-xs"
                >
                  <option value="">Choose locus…</option>
                  {associations.map((a) => (
                    <option key={a.locusId} value={a.locusId}>
                      {a.locusId} (fav: {a.favorable})
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => editLocus && editIndividual(focused.id, editLocus, editAllele)}
                  disabled={!editLocus || budget.cash < 40}
                  className="rounded bg-accent px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
                >
                  Edit ($40)
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {unlocked.has('genomic_prediction') && (
        <section>
          <div className="text-[11px] uppercase text-muted">Genomic prediction</div>
          <p className="text-[11px] text-muted">
            Train a ridge-regression model on phenotyped plants. Then in the Field, switch advance mode to <em>GP</em> to
            select on predicted breeding values — even on un-phenotyped material.
          </p>
          <div className="flex items-center gap-2 mt-1">
            <button
              onClick={trainPredictor}
              className="rounded bg-leaf px-3 py-1.5 text-xs font-semibold text-white"
            >
              Train predictor
            </button>
            <span className="text-[11px] text-muted">
              {predictor ? `Model trained on ${predictor.loci.length} loci` : 'No model trained'}
            </span>
          </div>
        </section>
      )}
    </div>
  );
}
