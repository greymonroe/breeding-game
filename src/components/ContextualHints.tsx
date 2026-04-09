import { useState, useCallback } from 'react';
import { useGame } from '../game/state';

interface HintConfig {
  id: string;
  text: string;
  /** Return true to show this hint */
  condition: (state: ReturnType<typeof useGameSnapshot>) => boolean;
}

function useGameSnapshot() {
  const season = useGame((s) => s.season);
  const selectedIds = useGame((s) => s.selectedIds);
  const releases = useGame((s) => s.releases);
  const trust = useGame((s) => s.trust);
  const nurseries = useGame((s) => s.nurseries);
  const unlocked = useGame((s) => s.unlocked);
  return { season, selectedIds, releases, trust, nurseries, unlocked };
}

const HINTS: HintConfig[] = [
  {
    id: 'first_season',
    text: 'Click plants to select parents, then press Advance Season to create the next generation.',
    condition: (s) => s.season === 0 && s.selectedIds.length === 0,
  },
  {
    id: 'measure_yield',
    text: 'Use the "Measure Yield" button on a nursery to see which plants perform best. Yield drives variety income.',
    condition: (s) => {
      if (s.season < 1) return false;
      return s.nurseries.some(
        (n) => n.plants.length > 0 && n.plants.every((p) => !p.phenotype.has('yield'))
      );
    },
  },
  {
    id: 'parents_selected',
    text: 'With one parent selected, you can self it to create a family. Select two parents + unlock Controlled Crosses to make an F1.',
    condition: (s) => s.selectedIds.length >= 2 && s.season <= 3 && !s.unlocked.has('controlled_cross'),
  },
  {
    id: 'trust_drop',
    text: 'Your variety may be segregating in farmers\u2019 fields, reducing trust. Inbreed (self a plant several times) before releasing to improve uniformity.',
    condition: (s) => s.trust < 0.85 && s.releases.length > 0,
  },
  {
    id: 'first_selection',
    text: 'Good \u2014 you have parents selected. Set population size and press Advance Season to breed the next generation.',
    condition: (s) => s.season === 0 && s.selectedIds.length > 0,
  },
];

export function ContextualHints() {
  const snapshot = useGameSnapshot();
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set());
  const [fading, setFading] = useState<Set<string>>(() => new Set());

  const dismiss = useCallback((id: string) => {
    setFading((prev) => new Set(prev).add(id));
    setTimeout(() => {
      setDismissed((prev) => new Set(prev).add(id));
      setFading((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 400);
  }, []);

  // Re-evaluate when snapshot changes (reactive via render)
  void snapshot;

  const activeHints = HINTS.filter(
    (h) => !dismissed.has(h.id) && !fading.has(h.id) && h.condition(snapshot)
  );
  const fadingHints = HINTS.filter(
    (h) => fading.has(h.id) && h.condition(snapshot)
  );

  if (activeHints.length === 0 && fadingHints.length === 0) return null;

  return (
    <div className="space-y-1.5">
      {[...activeHints, ...fadingHints].slice(0, 2).map((hint) => (
        <div
          key={hint.id}
          className={`flex items-start gap-2 rounded-lg border border-sky/40 bg-sky/10 px-3 py-2 text-xs text-soil transition-opacity duration-400 ${
            fading.has(hint.id) ? 'opacity-0' : 'opacity-100'
          }`}
        >
          <span className="text-sky font-bold text-sm leading-none mt-0.5">i</span>
          <span className="flex-1">{hint.text}</span>
          <button
            onClick={() => dismiss(hint.id)}
            className="text-muted hover:text-soil text-sm leading-none"
          >
            x
          </button>
        </div>
      ))}
    </div>
  );
}
