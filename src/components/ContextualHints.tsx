import { useState, useCallback } from 'react';
import { useGame } from '../game/state';

interface HintConfig {
  id: string;
  text: string;
  condition: (state: ReturnType<typeof useGameSnapshot>) => boolean;
  priority?: number;
}

function useGameSnapshot() {
  const season = useGame((s) => s.season);
  const selectedIds = useGame((s) => s.selectedIds);
  const releases = useGame((s) => s.releases);
  const trust = useGame((s) => s.trust);
  const nurseries = useGame((s) => s.nurseries);
  const unlocked = useGame((s) => s.unlocked);
  const discovery = useGame((s) => s.discovery);
  const objectives = useGame((s) => s.objectives);
  return { season, selectedIds, releases, trust, nurseries, unlocked, discovery, objectives };
}

const HINTS: HintConfig[] = [
  {
    id: 'welcome',
    text: 'You have 10 founder plants with hidden genetics. Your goal: breed better varieties and release them to earn money. Start by clicking on 2\u20134 plants to select them as parents.',
    condition: (s) => s.season === 0 && s.selectedIds.length === 0,
    priority: 10,
  },
  {
    id: 'first_selection',
    text: 'Good \u2014 parents selected! Now press "Advance Season" to cross them and grow the next generation.',
    condition: (s) => s.season === 0 && s.selectedIds.length > 0,
    priority: 10,
  },
  {
    id: 'try_red_white',
    text: 'Tip: notice some flowers are red and some white? Try selecting one of each as parents \u2014 the offspring might reveal something about how color is inherited.',
    condition: (s) => {
      if (s.season !== 0) return false;
      if (s.selectedIds.length < 1) return false;
      const plants = s.nurseries.flatMap(n => n.plants);
      const selected = plants.filter(p => s.selectedIds.includes(p.id));
      const colors = selected.map(p => (p.phenotype.get('color') ?? 0) >= 0.5);
      return colors.length >= 2 && colors.every(c => c === colors[0]);
    },
  },
  {
    id: 'measure_yield',
    text: 'Use the "Measure Yield" button to see which plants perform best. Yield determines variety income \u2014 you need to know it before releasing.',
    condition: (s) => {
      if (s.season < 1) return false;
      return s.nurseries.some(
        (n) => n.plants.length > 0 && n.plants.every((p) => !p.phenotype.has('yield'))
      );
    },
    priority: 5,
  },
  {
    id: 'look_at_families',
    text: 'Your offspring are grouped by parent pair. Look at each family \u2014 do all siblings look the same, or are some red and some white? Look for blue interpretation panels on interesting families.',
    condition: (s) => s.season === 1 && s.discovery.traitDiscoveries.color.level === 'unknown',
    priority: 3,
  },
  {
    id: 'color_not_discovered',
    text: 'You\'ve bred several generations but haven\'t discovered how color is inherited yet. Make sure to cross a red plant with a white plant \u2014 look for the blue interpretation panel.',
    condition: (s) => s.season >= 3 && s.discovery.traitDiscoveries.color.level === 'unknown',
  },
  {
    id: 'no_releases',
    text: 'You haven\'t released any varieties yet! Select your best plant and click "Release ($20)" to start earning income. But watch out \u2014 releasing a plant that isn\'t true-breeding will hurt farmer trust.',
    condition: (s) => s.season >= 4 && s.releases.length === 0,
  },
  {
    id: 'trust_drop',
    text: 'Your variety is segregating in farmers\u2019 fields \u2014 trust is dropping. Self a plant several generations before releasing to improve uniformity.',
    condition: (s) => s.trust < 0.85 && s.releases.length > 0,
    priority: 5,
  },
  {
    id: 'market_rising',
    text: 'The market baseline rises every season \u2014 competitors are improving too. Keep selecting for higher yield or your varieties will become obsolete.',
    condition: (s) => s.season >= 6 && s.releases.length > 0 && s.releases.every(r => r.lastSeasonRevenue <= 0),
  },
  {
    id: 'test_cross_hint',
    text: 'To identify true-breeding (RR) plants, you need a test cross with enough offspring to read the ratio. Try selecting just 2 parents \u2014 one red, one white \u2014 so the family is large enough to interpret.',
    condition: (s) => {
      const quest = s.objectives.find(o => o.id === 'identify_homozygous_red');
      return !!quest && !quest.completed && s.discovery.traitDiscoveries.color.level !== 'unknown' && s.season >= 2;
    },
    priority: 4,
  },
  {
    id: 'tech_tree_hint',
    text: 'Check the Tech tab \u2014 unlocking "Controlled crosses" lets you pair specific parents into labeled families. This makes test crosses much easier.',
    condition: (s) => s.season >= 3 && !s.unlocked.has('controlled_cross') && s.discovery.traitDiscoveries.color.level !== 'unknown',
    priority: 2,
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

  void snapshot;

  const activeHints = HINTS.filter(
    (h) => !dismissed.has(h.id) && !fading.has(h.id) && h.condition(snapshot)
  ).sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  const fadingHints = HINTS.filter(
    (h) => fading.has(h.id) && h.condition(snapshot)
  );

  if (activeHints.length === 0 && fadingHints.length === 0) return null;

  return (
    <div className="space-y-2">
      {[...activeHints, ...fadingHints].slice(0, 2).map((hint) => (
        <div
          key={hint.id}
          className={`flex items-start gap-3 rounded-xl border-2 border-sky/30 bg-gradient-to-r from-sky-light/20 to-sky/5 px-4 py-3 text-xs text-soil transition-opacity duration-400 shadow-sm ${
            fading.has(hint.id) ? 'opacity-0' : 'opacity-100'
          }`}
        >
          <span className="text-sky font-extrabold text-base leading-none mt-0.5">{'\u{1F4A1}'}</span>
          <span className="flex-1 font-semibold">{hint.text}</span>
          <button
            onClick={() => dismiss(hint.id)}
            className="text-muted hover:text-soil text-lg leading-none font-bold"
          >
            &times;
          </button>
        </div>
      ))}
    </div>
  );
}
