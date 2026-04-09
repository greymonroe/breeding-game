import { useGame } from '../game/state';
import { alleleFreqs } from '../engine';
import { ChromosomeView } from '../challenges/visualizations/ChromosomeView';

export function DataView() {
  const { history, releases, budget, map, unlocked } = useGame();
  const population = useGame((s) => s.population());
  const showDiversity = unlocked.has('diversity_dashboard');
  const maxY = Math.max(60, ...history.map((h) => h.bestYield));
  const minY = Math.min(40, ...history.map((h) => h.meanYield));
  const range = maxY - minY || 1;

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-soil/20 bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-leaf">
          Genome Map
        </h2>
        <ChromosomeView />
      </section>

      <section className="rounded-lg border border-soil/20 bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-leaf">
          Selection response
        </h2>
        <svg viewBox="0 0 400 160" className="w-full h-40">
          {history.map((h, i) => {
            if (i === 0) return null;
            const prev = history[i - 1];
            const x1 = ((i - 1) / Math.max(1, history.length - 1)) * 380 + 10;
            const x2 = (i / Math.max(1, history.length - 1)) * 380 + 10;
            const y1 = 150 - ((prev.meanYield - minY) / range) * 140;
            const y2 = 150 - ((h.meanYield - minY) / range) * 140;
            return <line key={`m${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#4a7c59" strokeWidth="2" />;
          })}
          {history.map((h, i) => {
            if (i === 0) return null;
            const prev = history[i - 1];
            const x1 = ((i - 1) / Math.max(1, history.length - 1)) * 380 + 10;
            const x2 = (i / Math.max(1, history.length - 1)) * 380 + 10;
            const y1 = 150 - ((prev.bestYield - minY) / range) * 140;
            const y2 = 150 - ((h.bestYield - minY) / range) * 140;
            return <line key={`b${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#e07a3a" strokeWidth="2" strokeDasharray="3 2" />;
          })}
        </svg>
        <div className="text-[11px] text-muted flex gap-4 mt-1">
          <span><span className="inline-block w-3 h-0.5 bg-leaf align-middle mr-1" />mean yield</span>
          <span><span className="inline-block w-3 h-0.5 bg-accent align-middle mr-1" />best yield</span>
        </div>
      </section>

      {showDiversity && (
        <section className="rounded-lg border border-soil/20 bg-white p-4">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-leaf">Inbreeding (F) over time</h2>
          <div className="space-y-1">
            {history.map((h) => (
              <div key={h.season} className="flex items-center gap-2 text-xs">
                <div className="w-12 text-muted font-mono">gen {h.season}</div>
                <div className="flex-1 h-3 bg-soil/10 rounded">
                  <div className="h-3 rounded bg-danger/70" style={{ width: `${Math.max(0, Math.min(1, h.f)) * 100}%` }} />
                </div>
                <div className="w-12 text-right font-mono text-soil">{h.f.toFixed(2)}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {showDiversity && (
        <section className="rounded-lg border border-soil/20 bg-white p-4">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-leaf">Allele frequencies (current pop)</h2>
          <div className="space-y-1">
            {map.chromosomes.flatMap((c) => c.loci).map((l) => {
              const f = alleleFreqs(population, l.id);
              const a0 = l.alleles[0];
              const p = f.get(a0) ?? 0;
              return (
                <div key={l.id} className="flex items-center gap-2 text-xs">
                  <div className="w-14 text-muted font-mono">{l.id}</div>
                  <div className="flex-1 h-3 bg-soil/10 rounded overflow-hidden flex">
                    <div className="h-3 bg-leaf" style={{ width: `${p * 100}%` }} />
                    <div className="h-3 bg-wheat" style={{ width: `${(1 - p) * 100}%` }} />
                  </div>
                  <div className="w-20 text-right font-mono text-soil">{a0}={p.toFixed(2)}</div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="rounded-lg border border-soil/20 bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-leaf">Diversity (He) over time</h2>
        <div className="space-y-1">
          {history.map((h) => (
            <div key={h.season} className="flex items-center gap-2 text-xs">
              <div className="w-12 text-muted font-mono">gen {h.season}</div>
              <div className="flex-1 h-3 bg-soil/10 rounded">
                <div className="h-3 rounded bg-leaf-light" style={{ width: `${h.he * 100}%` }} />
              </div>
              <div className="w-12 text-right font-mono text-soil">{h.he.toFixed(2)}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-soil/20 bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-leaf">Released varieties</h2>
        {releases.length === 0 ? (
          <p className="text-xs text-muted">No varieties released yet. Find a strong individual in the Field and release it.</p>
        ) : (
          <table className="w-full text-xs">
            <thead className="text-muted">
              <tr><th className="text-left">Name</th><th>Gen</th><th>Yield</th><th>Total earned</th></tr>
            </thead>
            <tbody>
              {releases.map((r) => (
                <tr key={r.id} className="border-t border-soil/10">
                  <td className="py-1">{r.name}{r.resistant && ' 🛡'}</td>
                  <td className="text-center font-mono">{r.releasedAtSeason}</td>
                  <td className="text-center font-mono">{r.traits.yield.toFixed(1)}</td>
                  <td className="text-center font-mono text-leaf">+${r.totalEarned}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="rounded-lg border border-soil/20 bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-leaf">Ledger</h2>
        <ul className="text-xs font-mono space-y-0.5 max-h-48 overflow-auto">
          {budget.history.slice().reverse().map((h, i) => (
            <li key={i} className="flex justify-between">
              <span className="text-muted">s {h.generation}</span>
              <span>{h.reason}</span>
              <span className="text-soil">${h.cash}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
