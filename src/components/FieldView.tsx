import { useState } from 'react';
import { useGame, type Nursery } from '../game/state';
import type { Individual } from '../engine';
import { PlantCard } from './PlantCard';
import { PedigreeGraph } from '../challenges/visualizations/PedigreeGraph';
import { Portfolio } from './Portfolio';
import { Costs, MEASURE_COST } from '../game/economy';

export function FieldView() {
  const {
    nurseries,
    activeNurseryId,
    setActiveNursery,
    createNursery,
    deleteNursery,
    setNurseryPopSize,
    moveIndividual,
    selectedIds,
    toggleSelect,
    clearSelection,
    advanceSeason,
    release,
    budget,
    unlocked,
    marketBaseline,
    season,
    diseaseActive,
    measureTrait,
    makeControlledCross,
    archive,
  } = useGame();

  const totalCost = nurseries
    .filter((n) => n.plants.some((p) => selectedIds.includes(p.id)))
    .reduce((s, n) => s + n.popSize * Costs.perPlant, 0);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-leaf/30 bg-leaf/5 p-3 text-xs text-soil flex items-center gap-3">
        <div className="flex-1">
          <strong>Season {season}</strong> · {nurseries.length} {nurseries.length === 1 ? 'nursery' : 'nurseries'} ·
          market yield baseline <span className="font-mono">{marketBaseline.toFixed(1)}</span>
          {diseaseActive && <span className="ml-2 text-danger">🦠 outbreak active</span>}
        </div>
        <button
          onClick={advanceSeason}
          disabled={selectedIds.length === 0 || totalCost > budget.cash}
          title={selectedIds.length === 0 ? 'Select parents in at least one nursery first.' : ''}
          className="rounded-lg bg-leaf px-4 py-2 text-sm font-bold text-white shadow disabled:opacity-40"
        >
          ⏭ Advance season ({totalCost > 0 ? `−$${totalCost}` : 'no cost'})
        </button>
      </div>

      <Portfolio />

      <div className="rounded-lg border border-soil/20 bg-white p-3 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-soil">Nurseries:</span>
        {nurseries.map((n) => (
          <button
            key={n.id}
            onClick={() => setActiveNursery(n.id)}
            className={`rounded px-3 py-1 text-xs font-semibold ${
              activeNurseryId === n.id ? 'bg-accent text-white' : 'bg-soil/5 text-soil hover:bg-soil/10'
            }`}
          >
            {n.name} <span className="opacity-60">({n.plants.length})</span>
          </button>
        ))}
        <button
          onClick={() => createNursery(`Nursery ${nurseries.length + 1}`)}
          className="rounded px-3 py-1 text-xs border border-soil/30 hover:bg-soil/5"
        >
          + New population (free)
        </button>
      </div>

      {nurseries.map((nursery) => (
        <NurserySection
          key={nursery.id}
          nursery={nursery}
          isActive={nursery.id === activeNurseryId}
          allNurseries={nurseries}
          selectedIds={selectedIds}
          toggleSelect={toggleSelect}
          clearSelection={clearSelection}
          setNurseryPopSize={setNurseryPopSize}
          moveIndividual={moveIndividual}
          unlocked={unlocked}
          release={release}
          deleteNursery={deleteNursery}
          canDelete={nurseries.length > 1}
          measureTrait={measureTrait}
          makeControlledCross={makeControlledCross}
          archive={archive}
        />
      ))}
    </div>
  );
}

function NurserySection({
  nursery, isActive, allNurseries, selectedIds, toggleSelect, clearSelection,
  setNurseryPopSize, moveIndividual,
  unlocked, release, deleteNursery, canDelete, measureTrait, makeControlledCross, archive,
}: {
  nursery: Nursery;
  isActive: boolean;
  allNurseries: Nursery[];
  selectedIds: string[];
  toggleSelect: (id: string) => void;
  clearSelection: () => void;
  setNurseryPopSize: (id: string, n: number) => void;
  moveIndividual: (indId: string, toId: string) => void;
  unlocked: Set<string>;
  release: (id: string) => void;
  deleteNursery: (id: string) => void;
  canDelete: boolean;
  measureTrait: (nurseryId: string, traitName: string) => void;
  makeControlledCross: (a: string, b: string, count: number) => void;
  archive: Map<string, Individual>;
}) {
  const sorted = [...nursery.plants].sort(
    (a, b) => (b.phenotype.get('yield') ?? 0) - (a.phenotype.get('yield') ?? 0)
  );
  const selectedHere = nursery.plants.filter((p) => selectedIds.includes(p.id));
  const focused = selectedHere.length === 1 ? selectedHere[0] : null;
  const otherNurseries = allNurseries.filter((n) => n.id !== nursery.id);

  return (
    <section className={`rounded-lg border-2 p-3 ${isActive ? 'border-accent/50 bg-accent/5' : 'border-soil/20 bg-white'}`}>
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <h2 className="text-sm font-semibold text-leaf flex-1">
          {nursery.name} <span className="text-muted font-normal">({nursery.plants.length} plants, {selectedHere.length} parents selected)</span>
        </h2>
        {canDelete && nursery.plants.length === 0 && (
          <button
            onClick={() => deleteNursery(nursery.id)}
            className="text-[10px] text-danger hover:underline"
          >
            delete
          </button>
        )}
      </div>

      {nursery.plants.length === 0 ? (
        <div className="text-xs text-muted italic p-4 text-center border border-dashed border-soil/20 rounded">
          Empty nursery. Move plants in from another nursery (use the "Move to…" picker on a selected plant) or
          plant from the seed bank in the Lab.
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 mb-2 text-xs">
            <label className="flex items-center gap-1">
              Next pop
              <input
                type="number"
                value={nursery.popSize}
                min={1}
                max={300}
                onChange={(e) => setNurseryPopSize(nursery.id, Math.max(1, Number(e.target.value) || 1))}
                className="w-16 rounded border border-soil/30 px-2 py-1 font-mono"
              />
            </label>
            <span className="text-muted">cost ${nursery.popSize * Costs.perPlant}</span>
            <span className="text-muted">· open pollination among selected parents (selfing allowed)</span>
            <button onClick={clearSelection} className="ml-auto rounded border border-soil/30 px-2 py-1 hover:bg-soil/5">
              Clear selection
            </button>
          </div>

          <NurseryStats nursery={nursery} />
          <PhenotypePanel nursery={nursery} measureTrait={measureTrait} />

          {selectedHere.length === 1 && (
            <SelfPanel parent={selectedHere[0]} makeControlledCross={makeControlledCross} />
          )}
          {selectedHere.length === 2 && unlocked.has('controlled_cross') && (
            <ControlledCrossPanel
              parentA={selectedHere[0]}
              parentB={selectedHere[1]}
              makeControlledCross={makeControlledCross}
            />
          )}
          {selectedHere.length === 2 && !unlocked.has('controlled_cross') && (
            <div className="mb-2 rounded border border-soil/20 bg-soil/5 px-2 py-1.5 text-[11px] text-muted">
              Research <strong>Controlled crosses</strong> in the Tech tree to make explicit F1 families from any two
              selected parents.
            </div>
          )}

          {focused && (
            <div className="border-t border-soil/10 pt-2 mb-2 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-muted">
                {focused.id} — Y {focused.phenotype.has('yield') ? focused.phenotype.get('yield')!.toFixed(1) : '?'}, F{' '}
                {focused.phenotype.has('flavor') ? focused.phenotype.get('flavor')!.toFixed(1) : '?'},{' '}
                {(focused.phenotype.get('color') ?? 0) >= 0.5 ? 'red' : 'white'}
                {focused.phenotype.has('disease') && (focused.phenotype.get('disease') ?? 0) >= 0.5 && ', 🛡'}
              </span>
              <button
                onClick={() => release(focused.id)}
                className="rounded bg-accent px-3 py-1 text-xs font-bold text-white hover:bg-accent/90"
              >
                📦 Release ($20)
              </button>
              {otherNurseries.length > 0 && (
                <select
                  value=""
                  onChange={(e) => e.target.value && moveIndividual(focused.id, e.target.value)}
                  className="rounded border border-soil/30 px-2 py-1"
                >
                  <option value="">Move to nursery…</option>
                  {otherNurseries.map((n) => (
                    <option key={n.id} value={n.id}>{n.name}</option>
                  ))}
                </select>
              )}
              {unlocked.has('pedigree') && (
                <details className="text-[11px]">
                  <summary className="cursor-pointer text-muted hover:text-soil">pedigree</summary>
                  <PedigreeGraph ind={focused} archive={archive} maxDepth={3} />
                </details>
              )}
            </div>
          )}

          <FamilyGroupedGrid
            plants={sorted}
            archive={archive}
            selectedIds={selectedIds}
            toggleSelect={toggleSelect}
          />
        </>
      )}
    </section>
  );
}

function FamilyGroupedGrid({
  plants,
  archive,
  selectedIds,
  toggleSelect,
}: {
  plants: Individual[];
  archive: Map<string, Individual>;
  selectedIds: string[];
  toggleSelect: (id: string) => void;
}) {
  // Group by familyId; collect ungrouped under null
  const groups = new Map<string | null, Individual[]>();
  for (const p of plants) {
    const key = p.familyId ?? null;
    const arr = groups.get(key) ?? [];
    arr.push(p);
    groups.set(key, arr);
  }
  // Order: ungrouped first, then families by season descending
  const orderedKeys = [...groups.keys()].sort((a, b) => {
    if (a == null && b == null) return 0;
    if (a == null) return -1;
    if (b == null) return 1;
    return b.localeCompare(a);
  });
  const familyHue = (id: string) => {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360;
    return h;
  };
  return (
    <div className="space-y-2">
      {orderedKeys.map((key) => {
        const members = groups.get(key)!;
        const isUngrouped = key == null;
        const sample = members[0];
        let header: React.ReactNode;
        if (isUngrouped) {
          header = (
            <div className="text-[10px] uppercase tracking-wide text-muted">
              Ungrouped ({members.length})
            </div>
          );
        } else {
          const isSelf = key!.startsWith('self_');
          const parents = sample.parents;
          const pA = parents ? archive.get(parents[0]) : null;
          const pB = parents ? archive.get(parents[1]) : null;
          const hue = familyHue(key!);
          header = (
            <div
              className="flex items-center gap-2 text-[11px]"
              style={{ borderLeft: `3px solid hsl(${hue} 60% 55%)`, paddingLeft: 6 }}
            >
              <span className="font-semibold text-soil">
                {isSelf ? '⊙ Self' : '✕ Cross'}
              </span>
              <span className="font-mono text-muted">
                {parents
                  ? isSelf
                    ? `of ${parents[0]}`
                    : `${parents[0]} × ${parents[1]}`
                  : key}
              </span>
              {pA && (
                <span className="text-[10px] text-muted">
                  P1 Y{(pA.phenotype.get('yield') ?? NaN).toFixed?.(0) || '?'}
                </span>
              )}
              {!isSelf && pB && (
                <span className="text-[10px] text-muted">
                  P2 Y{(pB.phenotype.get('yield') ?? NaN).toFixed?.(0) || '?'}
                </span>
              )}
              <span className="ml-auto text-muted">{members.length} sibs</span>
            </div>
          );
        }
        return (
          <div
            key={key ?? 'ungrouped'}
            className={`rounded border ${
              isUngrouped ? 'border-soil/10 bg-soil/5' : 'border-soil/20 bg-white'
            } p-2`}
          >
            {header}
            <div className="mt-1 grid grid-cols-6 gap-1 sm:grid-cols-8 md:grid-cols-12 lg:grid-cols-16">
              {members.map((ind) => (
                <PlantCard
                  key={ind.id}
                  ind={ind}
                  selected={selectedIds.includes(ind.id)}
                  onClick={() => toggleSelect(ind.id)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TraitRangeBar({
  label,
  stat,
}: {
  label: string;
  stat: { n: number; min: number; max: number; mean: number; sd: number };
}) {
  // Determine visual scale — use a reasonable range for the trait
  const range = stat.max - stat.min;
  const cv = stat.mean > 0 ? stat.sd / stat.mean : 0;
  // Color: tight distribution = green (uniform), wide = yellow (segregating)
  const barColor = cv < 0.08 ? 'bg-leaf' : cv < 0.15 ? 'bg-leaf/70' : cv < 0.25 ? 'bg-accent/70' : 'bg-accent';
  const barBg = cv < 0.08 ? 'bg-leaf/15' : cv < 0.15 ? 'bg-leaf/10' : cv < 0.25 ? 'bg-accent/10' : 'bg-accent/10';

  // Normalize positions for the bar visualization
  // Use a padded range so dots don't sit on edges
  const pad = range > 0 ? range * 0.1 : stat.mean * 0.05 || 1;
  const lo = stat.min - pad;
  const hi = stat.max + pad;
  const scale = hi - lo;
  const minPct = ((stat.min - lo) / scale) * 100;
  const maxPct = ((stat.max - lo) / scale) * 100;
  const meanPct = ((stat.mean - lo) / scale) * 100;

  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span className="w-12 text-right text-muted shrink-0">{label}</span>
      <span className="font-mono text-[10px] w-8 text-right text-soil shrink-0">{stat.min.toFixed(0)}</span>
      <div className={`relative flex-1 h-3 rounded-full ${barBg} overflow-hidden`} style={{ minWidth: '4rem' }}>
        {/* Range bar from min to max */}
        <div
          className={`absolute top-0.5 bottom-0.5 rounded-full ${barColor} opacity-60`}
          style={{ left: `${minPct}%`, width: `${Math.max(maxPct - minPct, 1)}%` }}
        />
        {/* Mean marker */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-soil"
          style={{ left: `${meanPct}%` }}
        />
      </div>
      <span className="font-mono text-[10px] w-8 text-soil shrink-0">{stat.max.toFixed(0)}</span>
      <span className="text-[10px] text-muted shrink-0 w-24">
        <span className="font-mono">{'\u03bc'}{stat.mean.toFixed(1)}</span>
        {' '}
        <span className="font-mono">{'\u03c3'}{stat.sd.toFixed(1)}</span>
      </span>
      <span className="text-[9px] text-muted shrink-0">n={stat.n}</span>
    </div>
  );
}

function NurseryStats({ nursery }: { nursery: Nursery }) {
  const summary = (traitName: string) => {
    const vals = nursery.plants
      .map((p) => p.phenotype.get(traitName))
      .filter((v): v is number => v != null);
    if (vals.length === 0) return null;
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const variance = vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length;
    const sd = Math.sqrt(variance);
    return { n: vals.length, min, max, mean, sd };
  };
  const y = summary('yield');
  const f = summary('flavor');
  const families = new Set(nursery.plants.map((p) => p.familyId).filter(Boolean));

  return (
    <div className="mb-2 rounded border border-soil/10 bg-white px-3 py-2 space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wide text-muted font-semibold">Population statistics</span>
        {families.size > 0 && (
          <span className="text-[10px] text-muted">{families.size} famil{families.size > 1 ? 'ies' : 'y'}</span>
        )}
      </div>
      {y ? (
        <TraitRangeBar label="Yield" stat={y} />
      ) : (
        <div className="flex items-center gap-2 text-[11px]">
          <span className="w-12 text-right text-muted">Yield</span>
          <span className="italic text-muted">not measured</span>
        </div>
      )}
      {f ? (
        <TraitRangeBar label="Flavor" stat={f} />
      ) : (
        <div className="flex items-center gap-2 text-[11px]">
          <span className="w-12 text-right text-muted">Flavor</span>
          <span className="italic text-muted">not measured</span>
        </div>
      )}
    </div>
  );
}

function PhenotypePanel({
  nursery,
  measureTrait,
}: {
  nursery: Nursery;
  measureTrait: (nurseryId: string, traitName: string) => void;
}) {
  const TRAITS: { name: string; label: string }[] = [
    { name: 'yield', label: 'Yield' },
    { name: 'flavor', label: 'Flavor' },
    { name: 'disease', label: 'Disease' },
  ];
  return (
    <div className="mb-2 rounded border border-soil/10 bg-soil/5 px-2 py-1.5 flex flex-wrap items-center gap-2 text-xs">
      <span className="text-muted">Phenotype:</span>
      {TRAITS.map((t) => {
        const unmeasured = nursery.plants.filter((p) => !p.phenotype.has(t.name)).length;
        const cost = unmeasured * (MEASURE_COST[t.name] ?? 0);
        const fullyMeasured = unmeasured === 0;
        return (
          <button
            key={t.name}
            onClick={() => measureTrait(nursery.id, t.name)}
            disabled={fullyMeasured}
            className={`rounded px-2 py-1 text-[11px] ${
              fullyMeasured
                ? 'bg-leaf/20 text-leaf cursor-default'
                : 'bg-leaf text-white hover:bg-leaf/90'
            }`}
            title={fullyMeasured ? 'all plants measured' : `measure ${unmeasured} plants`}
          >
            {fullyMeasured ? `✓ ${t.label}` : `Measure ${t.label} ($${cost})`}
          </button>
        );
      })}
      <span className="text-[10px] text-muted ml-auto">
        Color & shape are visible at germination — free.
      </span>
    </div>
  );
}

function SelfPanel({
  parent,
  makeControlledCross,
}: {
  parent: Individual;
  makeControlledCross: (a: string, b: string, count: number) => void;
}) {
  const [count, setCount] = useState(12);
  const cost = Costs.controlledCrossFee + count * Costs.perPlant;
  return (
    <div className="mb-2 rounded border border-leaf/40 bg-leaf/5 px-2 py-1.5 flex flex-wrap items-center gap-2 text-xs">
      <span className="text-soil font-semibold">⊙ Self:</span>
      <span className="font-mono text-soil">{parent.id}</span>
      <label className="flex items-center gap-1 ml-2">
        N
        <input
          type="number"
          value={count}
          min={1}
          max={100}
          onChange={(e) => setCount(Math.max(1, Number(e.target.value) || 1))}
          className="w-14 rounded border border-soil/30 px-2 py-0.5 font-mono"
        />
      </label>
      <span className="text-muted">cost ${cost}</span>
      <button
        onClick={() => makeControlledCross(parent.id, parent.id, count)}
        className="rounded bg-leaf px-3 py-1 text-[11px] font-bold text-white hover:bg-leaf/90 ml-auto"
      >
        Make sib family
      </button>
    </div>
  );
}

function ControlledCrossPanel({
  parentA,
  parentB,
  makeControlledCross,
}: {
  parentA: Individual;
  parentB: Individual;
  makeControlledCross: (a: string, b: string, count: number) => void;
}) {
  const [count, setCount] = useState(12);
  const cost = Costs.controlledCrossFee + count * Costs.perPlant;
  return (
    <div className="mb-2 rounded border border-accent/40 bg-accent/5 px-2 py-1.5 flex flex-wrap items-center gap-2 text-xs">
      <span className="text-soil font-semibold">✕ Controlled cross:</span>
      <span className="font-mono text-soil">{parentA.id}</span>
      <span className="text-muted">×</span>
      <span className="font-mono text-soil">{parentB.id}</span>
      <label className="flex items-center gap-1 ml-2">
        N
        <input
          type="number"
          value={count}
          min={1}
          max={100}
          onChange={(e) => setCount(Math.max(1, Number(e.target.value) || 1))}
          className="w-14 rounded border border-soil/30 px-2 py-0.5 font-mono"
        />
      </label>
      <span className="text-muted">cost ${cost}</span>
      <button
        onClick={() => makeControlledCross(parentA.id, parentB.id, count)}
        className="rounded bg-accent px-3 py-1 text-[11px] font-bold text-white hover:bg-accent/90 ml-auto"
      >
        Make F1 family
      </button>
    </div>
  );
}
