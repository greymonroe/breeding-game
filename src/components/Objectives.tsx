import { useGame } from '../game/state';

export function Objectives() {
  const { objectives, season } = useGame();
  const visible = objectives.filter((o) => o.availableAt <= season);
  if (visible.length === 0) return null;

  const isLocked = (o: typeof objectives[0]) => {
    if (!o.requires || o.requires.length === 0) return false;
    return o.requires.some(reqId => !objectives.find(x => x.id === reqId)?.completed);
  };

  return (
    <div className="rounded-lg border border-soil/20 bg-white p-3 space-y-1.5">
      <h2 className="text-xs uppercase tracking-wide text-leaf font-semibold">🎯 Objectives</h2>
      {visible.map((o) => {
        const locked = !o.completed && isLocked(o);
        return (
          <div
            key={o.id}
            className={`flex items-start gap-2 text-xs rounded px-2 py-1.5 ${
              o.completed ? 'bg-leaf/10 text-leaf' : locked ? 'bg-soil/5 text-soil/40' : 'bg-soil/5 text-soil'
            }`}
          >
            <span className="text-sm">{o.completed ? '✅' : locked ? '🔒' : '⬜'}</span>
            <div className="flex-1 min-w-0">
              <div className="font-semibold">{o.title}</div>
              <div className="text-[11px] text-muted">{o.description}</div>
            </div>
            <div className="text-right font-mono whitespace-nowrap">
              {o.completed ? `done s${o.completedAt}` : `+$${o.reward}`}
            </div>
          </div>
        );
      })}
    </div>
  );
}
