import { useGame } from '../game/state';
import { TECHS, type Tech } from '../game/progression';

export function TechTreeView() {
  const { unlocked, budget, unlockTech } = useGame();
  const tiers = [1, 2, 3, 4, 5] as const;
  return (
    <div className="space-y-5">
      {/* Chalkboard header */}
      <div className="card-school p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{'\u{1F393}'}</span>
          <div>
            <h2 className="font-hand text-xl text-school-text">Research & Technology</h2>
            <p className="text-[11px] text-school-text/60 font-semibold">Unlock tools with cash earned from variety sales</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-school-text/60 font-bold uppercase">Budget</div>
          <div className="font-mono font-extrabold text-lg text-school-accent">${budget.cash}</div>
        </div>
      </div>

      {tiers.map((tier) => {
        const techs = TECHS.filter((t) => t.tier === tier);
        if (techs.length === 0) return null;
        return (
          <section key={tier}>
            <div className="flex items-center gap-2 mb-2">
              <div className="h-px flex-1 bg-soil/15" />
              <h2 className="text-xs font-extrabold uppercase tracking-widest text-leaf px-2">Tier {tier}</h2>
              <div className="h-px flex-1 bg-soil/15" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
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
      className={`rounded-xl border-2 p-4 transition-all ${
        unlocked
          ? 'border-leaf/40 bg-gradient-to-br from-leaf/5 to-leaf/10 shadow-sm'
          : prereqsMet
          ? 'border-soil/20 bg-white shadow-sm hover:shadow-md'
          : 'border-soil/10 bg-soil/5 opacity-50'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="font-extrabold text-soil">{tech.name}</div>
          <div className="text-xs text-muted font-semibold mt-0.5">{tech.description}</div>
          {tech.requires.length > 0 && (
            <div className="text-[10px] text-muted mt-1 font-bold">
              Requires: {tech.requires.join(', ')}
            </div>
          )}
        </div>
        <div className="text-right shrink-0">
          {unlocked ? (
            <span className="inline-flex items-center gap-1 text-xs text-leaf font-extrabold bg-leaf/10 rounded-lg px-2.5 py-1">
              {'\u{2705}'} Done
            </span>
          ) : (
            <button
              disabled={!buyable}
              onClick={onUnlock}
              className="rounded-xl bg-gradient-to-b from-accent to-accent/90 px-4 py-2 text-xs font-extrabold text-white shadow-sm hover:shadow-md disabled:opacity-40 disabled:shadow-none transition-all border border-accent/50"
            >
              ${tech.cost}
            </button>
          )}
        </div>
      </div>
      {unlocked && (
        <div className="mt-2 text-[11px] italic text-leaf font-semibold bg-leaf/5 rounded-lg px-2 py-1.5">
          {'\u{1F4A1}'} {tech.blurb}
        </div>
      )}
    </div>
  );
}
