import { useGame } from '../game/state';

export function HUD() {
  const { budget, releases, history, marketBaseline, season, trust } = useGame();
  const totalPlants = useGame((s) => s.totalPlants());
  const stat = history[history.length - 1];

  const trustPct = Math.round(trust * 100);
  const trustColor = trust >= 0.8 ? 'text-leaf' : trust >= 0.5 ? 'text-accent' : 'text-danger';
  const trustBg = trust >= 0.8 ? 'bg-leaf' : trust >= 0.5 ? 'bg-accent' : 'bg-danger';
  const cashColor = budget.cash < 50 ? 'text-danger' : 'text-soil';

  // Show "?" if yield hasn't been measured (meanYield is 0 or very close)
  const yieldMeasured = stat.meanYield > 1;
  const yieldDisplay = yieldMeasured ? stat.meanYield.toFixed(1) : '?';
  const yieldColor = !yieldMeasured ? 'text-accent' : undefined;

  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-xs">
      <HudStat icon={'\u{2600}'} label="Season" value={`${season}`} />
      <HudStat icon={'\u{1FA99}'} label="Cash" value={`$${budget.cash}`} valueClass={cashColor} />
      <HudStat icon={'\u{1F33F}'} label="Plants" value={`${totalPlants}`} />
      <HudStat
        icon={'\u{1F4C8}'}
        label="Yield"
        value={yieldDisplay}
        valueClass={yieldColor}
        sub={`mkt ${marketBaseline.toFixed(1)}`}
      />
      <div className="rounded-xl border border-soil/15 bg-white/80 px-3 py-1.5">
        <div className="flex items-center gap-1 text-[10px] text-muted font-semibold uppercase tracking-wide mb-0.5">
          <span>{'\u{1F91D}'}</span> Trust
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex-1 h-2 bg-soil/10 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${trustBg} transition-all duration-500`} style={{ width: `${trustPct}%` }} />
          </div>
          <span className={`font-extrabold font-mono text-sm ${trustColor}`}>{trustPct}%</span>
        </div>
      </div>
      <HudStat icon={'\u{1F4E6}'} label="Releases" value={`${releases.length}`} />
    </div>
  );
}

function HudStat({ icon, label, value, valueClass, sub }: {
  icon: string; label: string; value: string; valueClass?: string; sub?: string;
}) {
  return (
    <div className="rounded-xl border border-soil/15 bg-white/80 px-3 py-1.5">
      <div className="flex items-center gap-1 text-[10px] text-muted font-semibold uppercase tracking-wide mb-0.5">
        <span>{icon}</span> {label}
      </div>
      <div className={`font-extrabold font-mono text-sm leading-tight ${valueClass ?? 'text-soil'}`}>
        {value}
      </div>
      {sub && <div className="text-[9px] text-muted font-mono">{sub}</div>}
    </div>
  );
}
