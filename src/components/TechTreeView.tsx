import { useGame } from '../game/state';
import { TECHS, type Tech } from '../game/progression';

export function TechTreeView() {
  const { unlocked, budget, unlockTech } = useGame();
  const tiers = [1, 2, 3, 4, 5] as const;
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-soil/20 bg-white p-3 flex items-center justify-between">
        <div className="text-sm">
          Cash: <span className="font-mono text-soil">${budget.cash}</span>
        </div>
        <p className="text-xs text-muted">Research costs cash. Earn it by releasing improved varieties.</p>
      </div>
      {tiers.map((tier) => {
        const techs = TECHS.filter((t) => t.tier === tier);
        if (techs.length === 0) return null;
        return (
          <section key={tier}>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-leaf">Tier {tier}</h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {techs.map((t) => (
                <TechCard
                  key={t.id}
                  tech={t}
                  unlocked={unlocked.has(t.id)}
                  canAfford={budget.cash >= t.cost}
                  prereqsMet={t.requires.every((r) => unlocked.has(r))}
                  onUnlock={() => unlockTech(t.id)}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function TechCard({
  tech, unlocked, canAfford, prereqsMet, onUnlock,
}: {
  tech: Tech; unlocked: boolean; canAfford: boolean; prereqsMet: boolean; onUnlock: () => void;
}) {
  const buyable = !unlocked && canAfford && prereqsMet;
  return (
    <div
      className={`rounded-lg border p-3 ${
        unlocked ? 'border-leaf bg-leaf/5' : prereqsMet ? 'border-soil/30 bg-white' : 'border-soil/10 bg-soil/5 opacity-60'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="font-semibold text-soil">{tech.name}</div>
          <div className="text-xs text-muted">{tech.description}</div>
          {tech.requires.length > 0 && (
            <div className="text-[10px] text-muted mt-1">Requires: {tech.requires.join(', ')}</div>
          )}
        </div>
        <div className="text-right">
          {unlocked ? (
            <span className="text-xs text-leaf font-semibold">UNLOCKED</span>
          ) : (
            <button
              disabled={!buyable}
              onClick={onUnlock}
              className="rounded bg-accent px-2 py-1 text-xs font-semibold text-white disabled:opacity-40"
            >
              ${tech.cost}
            </button>
          )}
        </div>
      </div>
      {unlocked && <div className="mt-2 text-[11px] italic text-leaf">{tech.blurb}</div>}
    </div>
  );
}
