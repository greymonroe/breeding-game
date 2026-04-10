import { useGame } from '../game/state';

export function Objectives() {
  const { objectives, season } = useGame();
  const visible = objectives.filter((o) => o.availableAt <= season);
  if (visible.length === 0) return null;

  const isLocked = (o: typeof objectives[0]) => {
    if (!o.requires || o.requires.length === 0) return false;
    return o.requires.some(reqId => !objectives.find(x => x.id === reqId)?.completed);
  };

  const completed = visible.filter(o => o.completed);
  const active = visible.filter(o => !o.completed && !isLocked(o));
  const locked = visible.filter(o => !o.completed && isLocked(o));

  return (
    <div className="bg-wood rounded-2xl border-2 border-soil/30 p-4 shadow-game">
      {/* Board header */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">{'\u{1F4CC}'}</span>
        <h2 className="text-sm font-extrabold text-soil uppercase tracking-wide">Quest Board</h2>
        <span className="ml-auto text-[10px] font-bold text-soil/60 bg-white/40 rounded-full px-2 py-0.5">
          {completed.length}/{visible.length}
        </span>
      </div>

      <div className="space-y-2">
        {/* Active quests first */}
        {active.map((o) => (
          <div
            key={o.id}
            className="pin-card rounded-xl bg-white/90 border border-soil/15 p-2.5 shadow-sm"
          >
            <div className="flex items-start gap-2">
              <span className="text-base mt-0.5">{'\u{2B50}'}</span>
              <div className="flex-1 min-w-0">
                <div className="font-extrabold text-soil text-xs">{o.title}</div>
                <div className="text-[10px] text-muted font-semibold mt-0.5">{o.description}</div>
              </div>
              <div className="text-right">
                <span className="text-[11px] font-extrabold text-leaf bg-leaf/10 rounded-lg px-2 py-0.5">
                  +${o.reward}
                </span>
              </div>
            </div>
          </div>
        ))}

        {/* Completed */}
        {completed.map((o) => (
          <div
            key={o.id}
            className="quest-complete pin-card rounded-xl bg-leaf/10 border border-leaf/20 p-2.5"
          >
            <div className="flex items-start gap-2">
              <span className="text-base mt-0.5">{'\u{2705}'}</span>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-leaf text-xs line-through decoration-leaf/30">{o.title}</div>
              </div>
              <span className="text-[10px] font-bold text-leaf/60">s{o.completedAt}</span>
            </div>
          </div>
        ))}

        {/* Locked */}
        {locked.map((o) => (
          <div
            key={o.id}
            className="pin-card rounded-xl bg-soil/5 border border-soil/10 p-2.5 opacity-50"
          >
            <div className="flex items-start gap-2">
              <span className="text-base mt-0.5">{'\u{1F512}'}</span>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-soil/50 text-xs">{o.title}</div>
                <div className="text-[10px] text-muted/50">{o.description}</div>
              </div>
              <span className="text-[10px] font-bold text-soil/30">+${o.reward}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
