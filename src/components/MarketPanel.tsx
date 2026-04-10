import { useGame } from '../game/state';
import { SEGMENT_LABELS, MARKET_DRIFT_PER_SEASON, type SegmentId } from '../game/economy';

const SEGMENT_ORDER: SegmentId[] = ['red_R', 'red_s', 'white_R', 'white_s'];

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

  const prevBaseline = history.length >= 2 ? (marketBaseline - MARKET_DRIFT_PER_SEASON) : null;
  const baselineTrend = prevBaseline != null ? (marketBaseline > prevBaseline ? 'up' : 'flat') : null;

  return (
    <aside className="bg-newspaper rounded-2xl border-2 border-news-border p-4 shadow-game">
      {/* Newspaper header */}
      <div className="border-b-2 border-soil/20 pb-2 mb-3">
        <div className="flex items-center justify-between">
          <h2 className="font-hand text-2xl text-soil tracking-tight leading-tight">The Breeder&rsquo;s Gazette</h2>
          <span className="text-[10px] font-bold text-muted bg-soil/5 rounded-full px-2 py-0.5">Season {season}</span>
        </div>
        <div className="border-t border-soil/15 mt-1 pt-1">
          <div className="text-[9px] uppercase tracking-widest text-muted font-bold">Market Report &middot; Crop Futures &middot; Industry News</div>
        </div>
      </div>

      {/* Baseline yield */}
      <div className="mb-3 rounded-xl border border-soil/15 bg-white/60 px-3 py-2.5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-wide text-muted font-extrabold">Baseline Yield</div>
            <div className="font-mono text-xl font-extrabold text-soil leading-tight">
              {marketBaseline.toFixed(1)}
              {baselineTrend === 'up' && (
                <span className="text-danger text-[10px] ml-1 font-bold">{'\u25B2'} +{MARKET_DRIFT_PER_SEASON}/season</span>
              )}
            </div>
          </div>
          <div className="text-[10px] text-muted text-right max-w-[8rem] font-semibold italic">
            Competitors are improving. Beat this to earn.
          </div>
        </div>
      </div>

      {diseaseActive && (
        <div className="mb-3 rounded-xl border-2 border-danger/40 bg-danger/10 px-3 py-2 text-[11px] text-danger font-bold">
          {'\u{26A0}'} OUTBREAK &mdash; resistant lines at premium, susceptible cratered.
        </div>
      )}

      {/* Market segments */}
      <div className="grid grid-cols-1 gap-2 mb-3">
        {SEGMENT_ORDER.map((seg) => {
          const d = market[seg];
          const t = marketTrend[seg];
          const arrow = t === 'up' ? '\u25b2' : t === 'down' ? '\u25bc' : '\u2013';
          const arrowColor = t === 'up' ? 'text-leaf' : t === 'down' ? 'text-danger' : 'text-muted';
          const bg = d > 1.3 ? 'bg-leaf/8 border-leaf/30' : d < 0.7 ? 'bg-danger/8 border-danger/30' : 'bg-white/50 border-soil/15';
          const driverText = DEMAND_DRIVERS[seg][t];
          const barPct = Math.min(Math.max((d / 2) * 100, 5), 100);

          return (
            <div key={seg} className={`rounded-xl border-2 px-3 py-2 text-xs ${bg}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-extrabold text-soil">{SEGMENT_LABELS[seg]}</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-extrabold text-soil">{d.toFixed(2)}x</span>
                  <span className={`text-[11px] font-bold ${arrowColor}`}>{arrow}</span>
                </div>
              </div>
              <div className="h-1.5 bg-soil/10 rounded-full overflow-hidden mb-1.5">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    d > 1.3 ? 'bg-leaf' : d < 0.7 ? 'bg-danger' : 'bg-accent/70'
                  }`}
                  style={{ width: `${barPct}%` }}
                />
              </div>
              <div className="text-[10px] text-muted italic leading-tight font-semibold">{driverText}</div>
            </div>
          );
        })}
      </div>

      {/* News feed */}
      <div className="border-t-2 border-soil/15 pt-2">
        <h3 className="text-[11px] uppercase tracking-wide text-muted font-extrabold mb-2">{'\u{1F4F0}'} Latest News</h3>
        <ul className="space-y-1.5 max-h-48 overflow-auto pr-1">
          {news.map((n) => (
            <li key={n.id} className="text-[11px] text-soil border-l-3 border-l-accent/40 pl-2.5 py-0.5">
              <div className="text-[9px] text-muted font-bold">Season {n.season}</div>
              <span className="font-semibold">{n.text}</span>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
