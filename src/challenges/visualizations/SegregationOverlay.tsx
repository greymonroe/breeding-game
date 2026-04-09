/**
 * One-time educational callout shown when a player selfs an Rr plant
 * and the offspring show a ~3:1 segregation ratio.
 */
export function SegregationOverlay({
  redCount,
  whiteCount,
  onDismiss,
}: {
  redCount: number;
  whiteCount: number;
  onDismiss: () => void;
}) {
  const total = redCount + whiteCount;
  const redPct = total > 0 ? (redCount / total) * 100 : 0;
  const whitePct = total > 0 ? (whiteCount / total) * 100 : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="mx-4 max-w-sm rounded-xl border-2 border-accent bg-white p-5 shadow-xl">
        <h3 className="mb-3 text-base font-bold text-soil">Segregation observed</h3>

        {/* Mini bar chart */}
        <div className="mb-3 flex items-end gap-3 justify-center h-24">
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs font-mono text-soil">{redCount}</span>
            <div
              className="w-10 rounded-t"
              style={{
                height: `${Math.max(redPct * 0.8, 4)}px`,
                backgroundColor: '#c0392b',
              }}
            />
            <span className="text-[10px] text-muted">Red</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs font-mono text-soil">{whiteCount}</span>
            <div
              className="w-10 rounded-t border border-soil/20"
              style={{
                height: `${Math.max(whitePct * 0.8, 4)}px`,
                backgroundColor: '#f5f1e8',
              }}
            />
            <span className="text-[10px] text-muted">White</span>
          </div>
        </div>

        <div className="mb-1 text-center text-sm font-semibold text-soil">
          {redCount} red : {whiteCount} white
        </div>

        <p className="mb-4 text-xs leading-relaxed text-soil/80">
          Your parent was heterozygous (Rr). R is dominant, so 3/4 of offspring
          are red and 1/4 are white. This is Mendel's 3:1 ratio!
        </p>

        <button
          onClick={onDismiss}
          className="w-full rounded-lg bg-accent px-4 py-2 text-sm font-bold text-white hover:bg-accent/90"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
