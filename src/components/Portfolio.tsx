import { useGame } from '../game/state';
import { varietyBaseRevenue, segmentKey, SEGMENT_LABELS, COMPETITION_LOSER_SHARE, type SegmentId } from '../game/economy';

function Sparkline({ data, width = 60, height = 20 }: { data: number[]; width?: number; height?: number }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 2) - 1;
    return `${x},${y}`;
  }).join(' ');
  const lastVal = data[data.length - 1];
  const prevVal = data[data.length - 2];
  const color = lastVal >= prevVal ? '#4a7c59' : '#c0392b';
  return (
    <svg width={width} height={height} className="inline-block align-middle">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={(data.length - 1) / (data.length - 1) * width}
        cy={height - ((lastVal - min) / range) * (height - 2) - 1}
        r="2.5"
        fill={color}
      />
    </svg>
  );
}

function TrustBar({ trust }: { trust: number }) {
  const pct = Math.round(trust * 100);
  const barColor = trust >= 0.8 ? 'bg-leaf' : trust >= 0.5 ? 'bg-accent' : 'bg-danger';
  const textColor = trust >= 0.8 ? 'text-leaf' : trust >= 0.5 ? 'text-accent' : 'text-danger';
  return (
    <div className="flex items-center gap-2 text-[10px]">
      <span className="text-muted font-bold">{'\u{1F91D}'} Trust</span>
      <div className="flex-1 h-2 bg-soil/10 rounded-full overflow-hidden" style={{ maxWidth: '6rem' }}>
        <div className={`h-full rounded-full ${barColor} transition-all duration-300`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`font-mono font-extrabold ${textColor}`}>
        {pct}%
      </span>
      {trust < 1 && (
        <span className="text-muted font-semibold">({Math.round((1 - trust) * 100)}% penalty)</span>
      )}
    </div>
  );
}

export function Portfolio() {
  const { releases, marketBaseline, diseaseActive, market, trust, season } = useGame();

  if (releases.length === 0) {
    return (
      <div className="card-farm p-4 text-xs text-muted">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">{'\u{1F3C6}'}</span>
          <strong className="text-soil text-sm font-extrabold">Variety Portfolio</strong>
        </div>
        <span className="font-semibold">Empty &mdash; release your best plant from the field to add it here.</span>
      </div>
    );
  }

  const segments = new Map<string, typeof releases>();
  for (const r of releases) {
    const k = segmentKey(r.traits.color, r.resistant);
    const arr = segments.get(k) ?? [];
    arr.push(r);
    segments.set(k, arr);
  }
  const winners = new Set<string>();
  for (const [, group] of segments) {
    const sortedGroup = [...group].sort((a, b) => b.traits.yield - a.traits.yield);
    winners.add(sortedGroup[0].id);
  }
  const projected = releases.map((r) => {
    const base = varietyBaseRevenue({
      yieldValue: r.traits.yield,
      flavor: r.traits.flavor,
      resistant: r.resistant,
      marketBaseline,
      diseaseActive,
    });
    const share = winners.has(r.id) ? 1 : COMPETITION_LOSER_SHARE;
    const seg = segmentKey(r.traits.color, r.resistant);
    const demand = market[seg];
    return {
      rel: r,
      rev: Math.round(base * share * demand * trust),
      winner: winners.has(r.id),
      seg,
      demand,
    };
  });
  const total = projected.reduce((s, p) => s + p.rev, 0);

  function getIncomeHistory(r: typeof releases[0]): number[] {
    const seasonsActive = Math.max(1, season - r.releasedAtSeason);
    const history: number[] = [];
    const priorSeasons = Math.min(seasonsActive - 1, 4);
    const avgPrior = seasonsActive > 1 ? (r.totalEarned - r.lastSeasonRevenue) / (seasonsActive - 1) : r.lastSeasonRevenue;
    for (let i = 0; i < priorSeasons; i++) {
      history.push(Math.round(avgPrior));
    }
    history.push(r.lastSeasonRevenue);
    return history;
  }

  return (
    <div className="card-farm p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{'\u{1F3C6}'}</span>
          <span className="text-sm font-extrabold text-soil">Variety Portfolio ({releases.length})</span>
        </div>
        <div className="text-xs text-muted font-semibold">
          Projected: <span className="font-mono text-leaf font-extrabold text-sm">+${total}/season</span>
        </div>
      </div>

      <TrustBar trust={trust} />

      {diseaseActive && (
        <div className="mt-2 rounded-xl border-2 border-danger/40 bg-danger/10 px-3 py-2 text-[11px] text-danger font-bold">
          {'\u{1F9A0}'} Disease outbreak &mdash; non-resistant varieties earning 2%.
        </div>
      )}

      <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
        {projected.map(({ rel, rev, winner, seg }) => {
          const dead = rev === 0;
          const segLabel = SEGMENT_LABELS[seg as SegmentId];
          const incomeHistory = getIncomeHistory(rel);
          const isRed = rel.traits.color >= 0.5;
          return (
            <div
              key={rel.id}
              className={`rounded-xl border-2 p-3 transition-all ${
                dead
                  ? 'border-soil/10 bg-soil/5 opacity-50'
                  : winner
                  ? 'border-leaf/40 bg-gradient-to-br from-leaf/5 to-leaf/10 shadow-sm'
                  : 'border-soil/15 bg-white/80'
              }`}
            >
              {/* Variety header with mini plant */}
              <div className="flex items-start gap-2 mb-2">
                <svg viewBox="0 0 40 50" width="28" height="36" className="shrink-0">
                  <line x1="20" y1="48" x2="20" y2="18" stroke="#4a7c59" strokeWidth="2.5" strokeLinecap="round" />
                  <circle cx="20" cy="15" r="8" fill={isRed ? '#c0392b' : '#f5f1e8'} stroke={isRed ? '#a02318' : '#c4b08a'} strokeWidth="1.5" />
                  <circle cx="18" cy="13" r="2" fill="rgba(255,255,255,0.3)" />
                </svg>
                <div className="flex-1 min-w-0">
                  <div className="font-extrabold text-soil text-sm">
                    {rel.name}
                    {rel.kind === 'hybrid' && (
                      <span className="ml-1.5 inline-block px-1.5 py-0.5 rounded-lg text-[8px] font-extrabold bg-sky/20 text-sky border border-sky/30">F1</span>
                    )}
                    {winner && <span className="ml-1 text-leaf">{'\u{2B50}'}</span>}
                  </div>
                  <span className={`inline-block px-2 py-0.5 rounded-lg text-[9px] font-bold mt-0.5 ${
                    seg.startsWith('red') ? 'bg-danger/15 text-danger' : 'bg-soil/10 text-soil'
                  }`}>
                    {segLabel}
                  </span>
                </div>
                <div className={`font-mono font-extrabold text-sm ${rev > 0 ? 'text-leaf' : 'text-muted'}`}>
                  {rev > 0 ? `+$${rev}` : '\u2014'}
                </div>
              </div>

              <div className="text-[11px] text-muted font-mono font-semibold mb-1.5">
                Y {rel.traits.yield.toFixed(1)} / F {rel.traits.flavor.toFixed(1)} / S{rel.releasedAtSeason}
                {rel.maintenanceCost > 0 && (
                  <span className="text-accent font-bold"> &middot; &minus;${rel.maintenanceCost}/s</span>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="text-[10px] text-muted font-semibold">
                  {!winner && !dead && (
                    <span className="text-accent">{'\u{26A0}'} outcompeted</span>
                  )}
                  {(winner || dead) && (
                    <span>lifetime: <span className="font-mono font-bold">${rel.totalEarned}</span></span>
                  )}
                </div>
                {incomeHistory.length >= 2 && (
                  <Sparkline data={incomeHistory} />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
