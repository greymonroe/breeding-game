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
    <div className="space-y-5">
      {/* Genome Map */}
      <section className="rounded-2xl border-2 border-office-border bg-white/90 p-5 shadow-game">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">{'\u{1F9EC}'}</span>
          <h2 className="text-sm font-extrabold uppercase tracking-wide text-office-accent">Genome Map</h2>
        </div>
        <ChromosomeView />
      </section>

      {/* Selection Response */}
      <section className="rounded-2xl border-2 border-office-border bg-white/90 p-5 shadow-game">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">{'\u{1F4C8}'}</span>
          <h2 className="text-sm font-extrabold uppercase tracking-wide text-office-accent">Selection Response</h2>
        </div>
        <svg viewBox="0 0 400 160" className="w-full h-40">
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map(f => (
            <line key={f} x1="10" y1={150 - f * 140} x2="390" y2={150 - f * 140}
              stroke="#e8d5a3" strokeWidth="0.5" />
          ))}
          {/* Mean yield line */}
          {history.map((h, i) => {
            if (i === 0) return null;
            const prev = history[i - 1];
            const x1 = ((i - 1) / Math.max(1, history.length - 1)) * 380 + 10;
            const x2 = (i / Math.max(1, history.length - 1)) * 380 + 10;
            const y1 = 150 - ((prev.meanYield - minY) / range) * 140;
            const y2 = 150 - ((h.meanYield - minY) / range) * 140;
            return <line key={`m${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#4a7c59" strokeWidth="2.5" strokeLinecap="round" />;
          })}
          {/* Best yield line */}
          {history.map((h, i) => {
            if (i === 0) return null;
            const prev = history[i - 1];
            const x1 = ((i - 1) / Math.max(1, history.length - 1)) * 380 + 10;
            const x2 = (i / Math.max(1, history.length - 1)) * 380 + 10;
            const y1 = 150 - ((prev.bestYield - minY) / range) * 140;
            const y2 = 150 - ((h.bestYield - minY) / range) * 140;
            return <line key={`b${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#e07a3a" strokeWidth="2" strokeDasharray="4 3" strokeLinecap="round" />;
          })}
          {/* Data points */}
          {history.map((h, i) => {
            const x = (i / Math.max(1, history.length - 1)) * 380 + 10;
            const y = 150 - ((h.meanYield - minY) / range) * 140;
            return <circle key={`d${i}`} cx={x} cy={y} r="3" fill="#4a7c59" />;
          })}
        </svg>
        <div className="text-[11px] text-muted flex gap-4 mt-2 font-semibold">
          <span><span className="inline-block w-4 h-1 bg-leaf rounded align-middle mr-1.5" />Mean yield</span>
          <span><span className="inline-block w-4 h-1 bg-accent rounded align-middle mr-1.5" style={{ borderTop: '2px dashed #e07a3a', background: 'transparent' }} />Best yield</span>
        </div>
      </section>

      {/* Inbreeding */}
      {showDiversity && (
        <section className="rounded-2xl border-2 border-office-border bg-white/90 p-5 shadow-game">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">{'\u{1F4CA}'}</span>
            <h2 className="text-sm font-extrabold uppercase tracking-wide text-office-accent">Inbreeding (F)</h2>
          </div>
          <div className="space-y-1.5">
            {history.map((h) => (
              <div key={h.season} className="flex items-center gap-2 text-xs">
                <div className="w-12 text-muted font-mono font-bold">gen {h.season}</div>
                <div className="flex-1 h-3.5 bg-soil/10 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-danger/60" style={{ width: `${Math.max(0, Math.min(1, h.f)) * 100}%` }} />
                </div>
                <div className="w-12 text-right font-mono text-soil font-bold">{h.f.toFixed(2)}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Allele Frequencies */}
      {showDiversity && (
        <section className="rounded-2xl border-2 border-office-border bg-white/90 p-5 shadow-game">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">{'\u{1F9EC}'}</span>
            <h2 className="text-sm font-extrabold uppercase tracking-wide text-office-accent">Allele Frequencies</h2>
          </div>
          <div className="space-y-1.5">
            {map.chromosomes.flatMap((c) => c.loci).map((l) => {
              const f = alleleFreqs(population, l.id);
              const a0 = l.alleles[0];
              const p = f.get(a0) ?? 0;
              return (
                <div key={l.id} className="flex items-center gap-2 text-xs">
                  <div className="w-14 text-muted font-mono font-bold">{l.id}</div>
                  <div className="flex-1 h-3.5 bg-soil/10 rounded-full overflow-hidden flex">
                    <div className="h-full bg-leaf" style={{ width: `${p * 100}%` }} />
                    <div className="h-full bg-wheat" style={{ width: `${(1 - p) * 100}%` }} />
                  </div>
                  <div className="w-20 text-right font-mono text-soil font-bold">{a0}={p.toFixed(2)}</div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Diversity */}
      <section className="rounded-2xl border-2 border-office-border bg-white/90 p-5 shadow-game">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">{'\u{1F33F}'}</span>
          <h2 className="text-sm font-extrabold uppercase tracking-wide text-office-accent">Diversity (He)</h2>
        </div>
        <div className="space-y-1.5">
          {history.map((h) => (
            <div key={h.season} className="flex items-center gap-2 text-xs">
              <div className="w-12 text-muted font-mono font-bold">gen {h.season}</div>
              <div className="flex-1 h-3.5 bg-soil/10 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-leaf-light" style={{ width: `${h.he * 100}%` }} />
              </div>
              <div className="w-12 text-right font-mono text-soil font-bold">{h.he.toFixed(2)}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Released Varieties */}
      <section className="rounded-2xl border-2 border-office-border bg-white/90 p-5 shadow-game">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">{'\u{1F4E6}'}</span>
          <h2 className="text-sm font-extrabold uppercase tracking-wide text-office-accent">Released Varieties</h2>
        </div>
        {releases.length === 0 ? (
          <p className="text-xs text-muted font-semibold">No varieties released yet.</p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-muted font-bold border-b-2 border-soil/10">
                <th className="text-left py-1.5">Name</th>
                <th className="py-1.5">Gen</th>
                <th className="py-1.5">Yield</th>
                <th className="py-1.5">Earned</th>
              </tr>
            </thead>
            <tbody>
              {releases.map((r) => (
                <tr key={r.id} className="border-t border-soil/10">
                  <td className="py-1.5 font-bold">{r.name}{r.resistant && ' \u{1F6E1}'}</td>
                  <td className="text-center font-mono font-bold">{r.releasedAtSeason}</td>
                  <td className="text-center font-mono font-bold">{r.traits.yield.toFixed(1)}</td>
                  <td className="text-center font-mono text-leaf font-bold">+${r.totalEarned}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Ledger */}
      <section className="rounded-2xl border-2 border-office-border bg-white/90 p-5 shadow-game">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">{'\u{1F4B0}'}</span>
          <h2 className="text-sm font-extrabold uppercase tracking-wide text-office-accent">Ledger</h2>
        </div>
        <ul className="text-xs font-mono space-y-1 max-h-48 overflow-auto pr-1">
          {budget.history.slice().reverse().map((h, i) => (
            <li key={i} className="flex justify-between py-0.5 border-b border-soil/5">
              <span className="text-muted font-bold">s{h.generation}</span>
              <span className="font-semibold">{h.reason}</span>
              <span className="text-soil font-bold">${h.cash}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
