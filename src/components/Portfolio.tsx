import { useGame } from '../game/state';
import { varietyBaseRevenue, segmentKey, SEGMENT_LABELS, COMPETITION_LOSER_SHARE, type SegmentId } from '../game/economy';

/** Tiny inline SVG sparkline for income history. */
function Sparkline({ data, width = 60, height = 18 }: { data: number[]; width?: number; height?: number }) {
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
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* dot on last point */}
      <circle
        cx={(data.length - 1) / (data.length - 1) * width}
        cy={height - ((lastVal - min) / range) * (height - 2) - 1}
        r="2"
        fill={color}
      />
    </svg>
  );
}

/** Visual trust meter */
function TrustBar({ trust }: { trust: number }) {
  const pct = Math.round(trust * 100);
  const barColor = trust >= 0.8 ? 'bg-leaf' : trust >= 0.5 ? 'bg-accent' : 'bg-danger';
  return (
    <div className="flex items-center gap-2 text-[10px]">
      <span className="text-muted">Trust</span>
      <div className="flex-1 h-1.5 bg-soil/10 rounded-full overflow-hidden" style={{ maxWidth: '5rem' }}>
        <div className={`h-full rounded-full ${barColor} transition-all duration-300`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`font-mono font-semibold ${trust >= 0.8 ? 'text-leaf' : trust >= 0.5 ? 'text-accent' : 'text-danger'}`}>
        {pct}%
      </span>
      {trust < 1 && (
        <span className="text-muted">({Math.round((1 - trust) * 100)}% revenue penalty)</span>
      )}
    </div>
  );
}

export function Portfolio() {
  const { releases, marketBaseline, diseaseActive, market, trust, season } = useGame();

  if (releases.length === 0) {
    return (
      <div className="rounded-lg border border-soil/20 bg-white p-3 text-xs text-muted">
        <strong className="text-soil">Portfolio</strong> — empty. Release a plant in the field to add it here.
        Each variety pays you per season, as long as it stays competitive.
      </div>
    );
  }

  // Group by segment to determine winners
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

  // Build income history per variety (up to last 5 seasons)
  // We approximate from lastSeasonRevenue stored on each variety
  // For sparkline, we build from totalEarned / seasons active, but use actual lastSeasonRevenue
  function getIncomeHistory(r: typeof releases[0]): number[] {
    const seasonsActive = Math.max(1, season - r.releasedAtSeason);
    const history: number[] = [];
    // We only have totalEarned and lastSeasonRevenue, so approximate:
    // avg prior = (totalEarned - lastSeasonRevenue) / (seasonsActive - 1)
    const priorSeasons = Math.min(seasonsActive - 1, 4);
    const avgPrior = seasonsActive > 1 ? (r.totalEarned - r.lastSeasonRevenue) / (seasonsActive - 1) : r.lastSeasonRevenue;
    for (let i = 0; i < priorSeasons; i++) {
      history.push(Math.round(avgPrior));
    }
    history.push(r.lastSeasonRevenue);
    return history;
  }

  return (
    <div className="rounded-lg border border-soil/20 bg-white p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-semibold text-soil">Portfolio ({releases.length})</div>
        <div className="text-xs text-muted">
          Projected: <span className="font-mono text-leaf font-bold">+${total}/season</span>
        </div>
      </div>

      <TrustBar trust={trust} />

      {diseaseActive && (
        <div className="mt-2 rounded border border-danger/40 bg-danger/10 px-2 py-1 text-[11px] text-danger">
          Disease outbreak — non-resistant varieties earning 2%. Release a resistant variety to break the outbreak.
        </div>
      )}

      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {projected.map(({ rel, rev, winner, seg, demand }) => {
          const dead = rev === 0;
          const segLabel = SEGMENT_LABELS[seg as SegmentId];
          const incomeHistory = getIncomeHistory(rel);
          return (
            <div
              key={rel.id}
              className={`rounded-lg border p-2.5 text-xs ${
                dead
                  ? 'border-soil/10 bg-soil/5 opacity-60'
                  : winner
                  ? 'border-leaf/40 bg-leaf/5'
                  : 'border-soil/20 bg-white'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="font-semibold text-soil">
                  {rel.name}
                  {winner && <span className="ml-1 text-[10px] text-leaf font-semibold">&#9733;</span>}
                </div>
                <div className={`font-mono font-bold ${rev > 0 ? 'text-leaf' : 'text-muted'}`}>
                  {rev > 0 ? `+$${rev}` : '\u2014'}
                </div>
              </div>

              {/* Segment badge */}
              <div className="flex items-center gap-1.5 mb-1">
                <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                  seg.startsWith('red') ? 'bg-danger/15 text-danger' : 'bg-soil/10 text-soil'
                }`}>
                  {segLabel}
                </span>
                <span className="text-[9px] text-muted font-mono">
                  demand {demand.toFixed(2)}x
                </span>
              </div>

              <div className="text-[11px] text-muted font-mono mb-1">
                Y {rel.traits.yield.toFixed(1)} / F {rel.traits.flavor.toFixed(1)} / released S{rel.releasedAtSeason}
              </div>

              <div className="flex items-center justify-between">
                <div className="text-[10px] text-muted">
                  {!winner && !dead && (
                    <span className="text-accent">outcompeted in segment</span>
                  )}
                  {(winner || dead) && (
                    <span>lifetime: <span className="font-mono">${rel.totalEarned}</span></span>
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
