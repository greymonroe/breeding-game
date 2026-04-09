import { useGame } from '../game/state';
import { SEGMENT_LABELS, MARKET_DRIFT_PER_SEASON, type SegmentId } from '../game/economy';

const SEGMENT_ORDER: SegmentId[] = ['red_R', 'red_s', 'white_R', 'white_s'];

/** Contextual flavor text explaining what drives each segment's demand. */
const DEMAND_DRIVERS: Record<SegmentId, Record<'up' | 'down' | 'flat', string>> = {
  red_R: {
    up: 'Disease-resistant reds in high demand as growers seek safer options.',
    down: 'Growers shifting away from resistant reds as outbreak fears subside.',
    flat: 'Steady demand for disease-resistant red varieties.',
  },
  red_s: {
    up: 'Red varieties trending after restaurant chain partnerships.',
    down: 'Red susceptible market softening as buyers seek disease protection.',
    flat: 'Stable demand for red susceptible varieties.',
  },
  white_R: {
    up: 'White resistant lines gaining traction in export markets.',
    down: 'White resistant segment cooling as disease pressure eases.',
    flat: 'Consistent demand for white resistant varieties.',
  },
  white_s: {
    up: 'White varieties popular with processors this season.',
    down: 'White susceptible losing share to resistant alternatives.',
    flat: 'Moderate demand for white susceptible lines.',
  },
};

export function MarketPanel() {
  const { market, marketTrend, news, season, diseaseActive, marketBaseline, history } = useGame();

  // Determine baseline trend from history
  const prevBaseline = history.length >= 2 ? (marketBaseline - MARKET_DRIFT_PER_SEASON) : null;
  const baselineTrend = prevBaseline != null ? (marketBaseline > prevBaseline ? 'up' : 'flat') : null;

  return (
    <aside className="rounded-lg border-2 border-soil/20 bg-white p-3 space-y-3">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-leaf">Market</h2>
          <span className="text-[10px] text-muted">season {season}</span>
        </div>

        {/* Market baseline yield */}
        <div className="mb-2 rounded border border-soil/15 bg-soil/5 px-2.5 py-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-wide text-muted">Baseline yield</div>
              <div className="font-mono text-lg font-bold text-soil leading-tight">
                {marketBaseline.toFixed(1)}
                {baselineTrend === 'up' && (
                  <span className="text-danger text-xs ml-1">&#9650; +{MARKET_DRIFT_PER_SEASON}/season</span>
                )}
              </div>
            </div>
            <div className="text-[10px] text-muted text-right max-w-[8rem]">
              Competitors are breeding too. Your varieties must exceed this to earn income.
            </div>
          </div>
        </div>

        {diseaseActive && (
          <div className="mb-2 rounded border border-danger/40 bg-danger/10 px-2 py-1 text-[11px] text-danger">
            Outbreak active -- resistant lines at premium, susceptible cratered.
          </div>
        )}

        <div className="grid grid-cols-1 gap-2">
          {SEGMENT_ORDER.map((seg) => {
            const d = market[seg];
            const t = marketTrend[seg];
            const arrow = t === 'up' ? '\u25b2' : t === 'down' ? '\u25bc' : '\u2013';
            const arrowColor = t === 'up' ? 'text-leaf' : t === 'down' ? 'text-danger' : 'text-muted';
            const bg = d > 1.3 ? 'bg-leaf/10 border-leaf/40' : d < 0.7 ? 'bg-danger/10 border-danger/40' : 'bg-soil/5 border-soil/20';
            const driverText = DEMAND_DRIVERS[seg][t];

            // Demand bar: normalize around 1.0 (0.5 to 1.5 is typical range)
            const barPct = Math.min(Math.max((d / 2) * 100, 5), 100);

            return (
              <div key={seg} className={`rounded-lg border px-2.5 py-2 text-xs ${bg}`}>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[11px] font-semibold text-soil">{SEGMENT_LABELS[seg]}</span>
                  <div className="flex items-center gap-1">
                    <span className="font-mono font-bold text-soil">{d.toFixed(2)}x</span>
                    <span className={`text-[10px] ${arrowColor}`}>{arrow}</span>
                  </div>
                </div>
                {/* Demand bar */}
                <div className="h-1 bg-soil/10 rounded-full overflow-hidden mb-1">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      d > 1.3 ? 'bg-leaf' : d < 0.7 ? 'bg-danger' : 'bg-accent/70'
                    }`}
                    style={{ width: `${barPct}%` }}
                  />
                </div>
                <div className="text-[10px] text-muted italic leading-tight">{driverText}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="text-[11px] uppercase tracking-wide text-muted mb-1">News feed</h3>
        <ul className="space-y-1 max-h-72 overflow-auto pr-1">
          {news.map((n) => (
            <li key={n.id} className="text-[11px] text-soil border-l-2 border-leaf/40 pl-2">
              <div className="text-[9px] text-muted">season {n.season}</div>
              {n.text}
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
