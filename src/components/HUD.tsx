import { useGame } from '../game/state';

export function HUD() {
  const { budget, releases, history, marketBaseline, season, trust } = useGame();
  const totalPlants = useGame((s) => s.totalPlants());
  const stat = history[history.length - 1];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-xs">
      <Stat label="Season" value={`${season}`} />
      <Stat label="Cash" value={`$${budget.cash}`} accent={budget.cash < 50 ? 'danger' : 'normal'} />
      <Stat label="Plants" value={`${totalPlants}`} />
      <Stat label="Mean / Mkt" value={`${stat.meanYield.toFixed(1)} / ${marketBaseline.toFixed(1)}`} />
      <Stat
        label="Trust"
        value={`${(trust * 100).toFixed(0)}%`}
        accent={trust < 0.5 ? 'danger' : 'normal'}
      />
      <Stat label="Releases" value={`${releases.length}`} />
    </div>
  );
}

function Stat({ label, value, accent = 'normal' }: { label: string; value: string; accent?: 'normal' | 'danger' }) {
  return (
    <div className={`rounded-lg border px-3 py-2 ${accent === 'danger' ? 'border-danger bg-danger/10' : 'border-soil/20 bg-white'}`}>
      <div className="text-[10px] uppercase tracking-wide text-muted">{label}</div>
      <div className="font-mono text-base text-soil">{value}</div>
    </div>
  );
}
