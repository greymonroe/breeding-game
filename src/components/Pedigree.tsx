import { useGame } from '../game/state';
import type { Individual } from '../engine';

/** Render the ancestry tree of a single individual back N generations. */
export function Pedigree({ id, depth = 4 }: { id: string; depth?: number }) {
  const archive = useGame((s) => s.archive);
  const root = archive.get(id);
  if (!root) return <div className="text-xs text-muted">No record.</div>;
  return (
    <div className="text-xs font-mono">
      <Node ind={root} archive={archive} depth={depth} />
    </div>
  );
}

function Node({
  ind, archive, depth,
}: { ind: Individual; archive: Map<string, Individual>; depth: number }) {
  const y = ind.phenotype.get('yield');
  return (
    <div className="pl-3 border-l border-soil/20 my-0.5">
      <div className="text-soil">
        {ind.id} <span className="text-muted">gen {ind.generation}{y != null && `, y=${y.toFixed(1)}`}</span>
      </div>
      {depth > 0 && ind.parents && (
        <>
          {ind.parents.map((pid, i) => {
            const p = archive.get(pid);
            return p ? (
              <Node key={`${pid}-${i}`} ind={p} archive={archive} depth={depth - 1} />
            ) : (
              <div key={`${pid}-${i}`} className="pl-3 text-muted">{pid} (founder)</div>
            );
          })}
        </>
      )}
    </div>
  );
}
