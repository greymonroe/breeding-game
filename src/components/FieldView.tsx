import { useState } from 'react';
import { useGame, type Nursery } from '../game/state';
import type { Individual } from '../engine';
import { hybridGeneticValue } from '../engine';
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
    releaseHybrid,
    budget,
    unlocked,
    marketBaseline,
    season,
    diseaseActive,
    measureTrait,
    makeControlledCross,
    archive,
    traits,
    discovery,
    interpretDominance,
    interpretTestCross,
    interpretLinkage,
  } = useGame();

  const totalCost = nurseries
    .filter((n) => n.plants.some((p) => selectedIds.includes(p.id)))
    .reduce((s, n) => s + n.popSize * Costs.perPlant, 0);

  return (
    <div className="space-y-4">
      {/* Season status & advance button */}
      <div className="card-farm p-4 flex items-center gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">{'\u{2600}\u{FE0F}'}</span>
            <span className="text-lg font-extrabold text-soil">Season {season}</span>
          </div>
          <div className="text-xs text-muted font-semibold">
            {nurseries.length} {nurseries.length === 1 ? 'nursery' : 'nurseries'} &middot;
            market baseline <span className="font-mono text-soil">{marketBaseline.toFixed(1)}</span>
            {diseaseActive && <span className="ml-2 text-danger font-bold">{'\u{1F9A0}'} Outbreak!</span>}
          </div>
        </div>
        <button
          onClick={advanceSeason}
          disabled={selectedIds.length === 0 || totalCost > budget.cash}
          title={selectedIds.length === 0 ? 'Select parents in at least one nursery first.' : ''}
          className="rounded-xl bg-gradient-to-b from-leaf to-leaf-dark px-6 py-3 text-sm font-extrabold text-white shadow-game hover:shadow-game-lg disabled:opacity-40 disabled:shadow-none transition-all border-2 border-leaf-dark/50"
        >
          {'\u{23ED}'} Advance Season
          {totalCost > 0 && <span className="block text-[10px] font-semibold opacity-80">&minus;${totalCost}</span>}
        </button>
      </div>

      <Portfolio />

      {/* Nursery tabs */}
      <div className="card-farm p-3 flex flex-wrap items-center gap-2">
        <span className="text-xs font-extrabold text-soil uppercase tracking-wide">{'\u{1F33E}'} Nurseries:</span>
        {nurseries.map((n) => (
          <button
            key={n.id}
            onClick={() => setActiveNursery(n.id)}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
              activeNurseryId === n.id
                ? 'bg-accent text-white shadow-sm'
                : 'bg-soil/5 text-soil hover:bg-soil/10 border border-soil/15'
            }`}
          >
            {n.name} <span className="opacity-60">({n.plants.length})</span>
          </button>
        ))}
        <button
          onClick={() => createNursery(`Nursery ${nurseries.length + 1}`)}
          className="rounded-lg px-3 py-1.5 text-xs font-bold border-2 border-dashed border-soil/25 text-muted hover:bg-soil/5 hover:border-soil/40 transition-all"
        >
          + New Plot
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
          releaseHybrid={releaseHybrid}
          deleteNursery={deleteNursery}
          canDelete={nurseries.length > 1}
          measureTrait={measureTrait}
          makeControlledCross={makeControlledCross}
          archive={archive}
          traits={traits}
          discovery={discovery}
          interpretDominance={interpretDominance}
          interpretTestCross={interpretTestCross}
          interpretLinkage={interpretLinkage}
        />
      ))}
    </div>
  );
}

function NurserySection({
  nursery, isActive, allNurseries, selectedIds, toggleSelect, clearSelection,
  setNurseryPopSize, moveIndividual,
  unlocked, release, releaseHybrid, deleteNursery, canDelete, measureTrait, makeControlledCross, archive, traits,
  discovery, interpretDominance, interpretTestCross, interpretLinkage,
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
  releaseHybrid: (a: string, b: string) => void;
  deleteNursery: (id: string) => void;
  canDelete: boolean;
  measureTrait: (nurseryId: string, traitName: string, reps?: number) => void;
  makeControlledCross: (a: string, b: string, count: number) => void;
  archive: Map<string, Individual>;
  traits: import('../engine').Trait[];
  discovery: import('../game/discovery').DiscoveryState;
  interpretDominance: (traitName: string, familyId: string, dominantAllele: string) => boolean;
  interpretTestCross: (traitName: string, familyId: string, targetIndId: string, answer: 'homozygous' | 'heterozygous') => boolean;
  interpretLinkage: (answer: 'linkage' | 'pleiotropy' | 'coincidence') => boolean;
}) {
  const sorted = [...nursery.plants].sort(
    (a, b) => (b.phenotype.get('yield') ?? 0) - (a.phenotype.get('yield') ?? 0)
  );
  const selectedHere = nursery.plants.filter((p) => selectedIds.includes(p.id));
  const focused = selectedHere.length === 1 ? selectedHere[0] : null;
  const otherNurseries = allNurseries.filter((n) => n.id !== nursery.id);

  return (
    <section className={`rounded-2xl border-2 p-4 transition-all ${
      isActive
        ? 'border-accent/40 bg-gradient-to-b from-white/90 to-wheat-light/40 shadow-game'
        : 'border-soil/15 bg-white/80'
    }`}>
      {/* Nursery header */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <h2 className="text-sm font-extrabold text-soil flex-1">
          {'\u{1F33F}'} {nursery.name}
          <span className="text-muted font-semibold ml-2">
            {nursery.plants.length} plants
            {selectedHere.length > 0 && (
              <span className="text-accent"> &middot; {selectedHere.length} selected</span>
            )}
          </span>
        </h2>
        {canDelete && nursery.plants.length === 0 && (
          <button
            onClick={() => deleteNursery(nursery.id)}
            className="text-[10px] text-danger font-bold hover:underline"
          >
            delete
          </button>
        )}
      </div>

      {nursery.plants.length === 0 ? (
        <div className="text-xs text-muted italic p-6 text-center border-2 border-dashed border-soil/15 rounded-xl bg-soil/5">
          Empty plot. Move plants here from another nursery or plant from the seed bank in the Lab.
        </div>
      ) : (
        <>
          {/* Controls bar */}
          <div className="flex flex-wrap items-center gap-2 mb-3 text-xs bg-soil/5 rounded-xl px-3 py-2">
            <label className="flex items-center gap-1 font-semibold text-soil">
              Next pop
              <input
                type="number"
                value={nursery.popSize}
                min={1}
                max={300}
                onChange={(e) => setNurseryPopSize(nursery.id, Math.max(1, Number(e.target.value) || 1))}
                className="w-16 rounded-lg border-2 border-soil/20 px-2 py-1 font-mono bg-white"
              />
            </label>
            <span className="text-muted font-semibold">${nursery.popSize * Costs.perPlant}</span>
            <span className="text-muted">&middot; open pollination</span>
            <button onClick={clearSelection} className="ml-auto rounded-lg border-2 border-soil/20 px-3 py-1 font-bold hover:bg-white transition-colors">
              Clear selection
            </button>
          </div>

          <NurseryStats nursery={nursery} />
          <PhenotypePanel nursery={nursery} measureTrait={measureTrait} />

          {/* Nursery-level linkage observation */}
          {discovery.traitDiscoveries.color.level !== 'unknown' && discovery.linkages.length === 0 && (() => {
            const withYield = nursery.plants.filter(p => p.phenotype.has('yield'));
            const reds = withYield.filter(p => (p.phenotype.get('color') ?? 0) >= 0.5);
            const whites = withYield.filter(p => (p.phenotype.get('color') ?? 0) < 0.5);
            if (reds.length < 5 || whites.length < 5) return null;
            const meanRed = reds.reduce((s, p) => s + p.phenotype.get('yield')!, 0) / reds.length;
            const meanWhite = whites.reduce((s, p) => s + p.phenotype.get('yield')!, 0) / whites.length;
            const diff = meanRed - meanWhite;
            if (diff < 2) return null;
            return (
              <div className="mb-3 rounded-xl border-2 border-purple-400/40 bg-purple-50 p-4 text-xs shadow-sm">
                <div className="font-extrabold text-soil mb-2 text-sm">{'\u{1F517}'} Population pattern: color and yield seem correlated</div>
                <div className="flex gap-8 mb-3">
                  <div className="text-center">
                    <div className="text-2xl font-extrabold text-soil">{meanRed.toFixed(1)}</div>
                    <div className="text-[10px] text-muted font-semibold">Mean yield &mdash; Red (n={reds.length})</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-extrabold text-soil">{meanWhite.toFixed(1)}</div>
                    <div className="text-[10px] text-muted font-semibold">Mean yield &mdash; White (n={whites.length})</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-extrabold text-accent">{diff > 0 ? '+' : ''}{diff.toFixed(1)}</div>
                    <div className="text-[10px] text-muted font-semibold">Difference</div>
                  </div>
                </div>
                <p className="text-[11px] text-muted mb-3">Across your whole nursery, red plants consistently out-yield white plants. Why?</p>
                <div className="flex gap-2 flex-wrap">
                  <button onClick={() => interpretLinkage('pleiotropy')}
                    className="rounded-lg border-2 border-soil/20 px-3 py-1.5 text-[11px] font-bold hover:bg-white transition-colors">
                    Pleiotropy (color gene directly affects yield)
                  </button>
                  <button onClick={() => interpretLinkage('linkage')}
                    className="rounded-lg border-2 border-purple-400/40 px-3 py-1.5 text-[11px] font-bold hover:bg-purple-100 transition-colors text-purple-700">
                    Linkage (nearby genes on same chromosome)
                  </button>
                  <button onClick={() => interpretLinkage('coincidence')}
                    className="rounded-lg border-2 border-soil/20 px-3 py-1.5 text-[11px] font-bold hover:bg-white transition-colors">
                    Coincidence (random noise)
                  </button>
                </div>
              </div>
            );
          })()}

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
          {selectedHere.length === 2 && unlocked.has('hybrid_breeding') && (
            <HybridReleasePanel
              parentA={selectedHere[0]}
              parentB={selectedHere[1]}
              releaseHybrid={releaseHybrid}
              traits={traits}
            />
          )}
          {selectedHere.length === 2 && !unlocked.has('controlled_cross') && (
            <div className="mb-3 rounded-xl border-2 border-soil/15 bg-soil/5 px-3 py-2 text-[11px] text-muted">
              Research <strong>Controlled crosses</strong> in the Tech tree to make explicit F1 families from any two
              selected parents.
            </div>
          )}

          {focused && (
            <div className="border-t-2 border-soil/10 pt-3 mb-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="bg-accent/10 rounded-lg px-2 py-1 font-bold text-soil">
                {focused.id} &mdash; Y {focused.phenotype.has('yield') ? focused.phenotype.get('yield')!.toFixed(1) : '?'}, F{' '}
                {focused.phenotype.has('flavor') ? focused.phenotype.get('flavor')!.toFixed(1) : '?'},{' '}
                {(focused.phenotype.get('color') ?? 0) >= 0.5 ? 'red' : 'white'}
                {focused.phenotype.has('disease') && (focused.phenotype.get('disease') ?? 0) >= 0.5 && ' \u{1F6E1}'}
              </span>
              <button
                onClick={() => release(focused.id)}
                className="rounded-xl bg-gradient-to-b from-accent to-accent/90 px-4 py-1.5 text-xs font-extrabold text-white shadow-sm hover:shadow-md transition-all border border-accent/50"
              >
                {'\u{1F4E6}'} Release ($20)
              </button>
              {otherNurseries.length > 0 && (
                <select
                  value=""
                  onChange={(e) => e.target.value && moveIndividual(focused.id, e.target.value)}
                  className="rounded-lg border-2 border-soil/20 px-2 py-1 text-xs bg-white"
                >
                  <option value="">Move to...</option>
                  {otherNurseries.map((n) => (
                    <option key={n.id} value={n.id}>{n.name}</option>
                  ))}
                </select>
              )}
              {unlocked.has('pedigree') && (
                <details className="text-[11px]">
                  <summary className="cursor-pointer text-muted hover:text-soil font-bold">pedigree</summary>
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
            discovery={discovery}
            interpretDominance={interpretDominance}
            interpretTestCross={interpretTestCross}
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
  discovery,
  interpretDominance,
  interpretTestCross,
}: {
  plants: Individual[];
  archive: Map<string, Individual>;
  selectedIds: string[];
  toggleSelect: (id: string) => void;
  discovery: import('../game/discovery').DiscoveryState;
  interpretDominance: (traitName: string, familyId: string, dominantAllele: string) => boolean;
  interpretTestCross: (traitName: string, familyId: string, targetIndId: string, answer: 'homozygous' | 'heterozygous') => boolean;
}) {
  const groups = new Map<string | null, Individual[]>();
  for (const p of plants) {
    const key = p.familyId ?? null;
    const arr = groups.get(key) ?? [];
    arr.push(p);
    groups.set(key, arr);
  }
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
    <div className="space-y-3">
      {orderedKeys.map((key) => {
        const members = groups.get(key)!;
        const isUngrouped = key == null;
        const sample = members[0];
        let header: React.ReactNode;
        if (isUngrouped) {
          header = (
            <div className="text-[10px] uppercase tracking-wide text-muted font-bold">
              Founders ({members.length})
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
              style={{ borderLeft: `4px solid hsl(${hue} 55% 50%)`, paddingLeft: 8 }}
            >
              <span className="font-extrabold text-soil">
                {isSelf ? '\u{229A} Self' : '\u{2715} Cross'}
              </span>
              <span className="font-mono text-muted font-semibold">
                {parents
                  ? isSelf
                    ? `of ${parents[0]}`
                    : `${parents[0]} \u00d7 ${parents[1]}`
                  : key}
              </span>
              {pA && (
                <span className="text-[10px] text-muted bg-soil/5 rounded px-1.5 py-0.5">
                  P1 Y{(pA.phenotype.get('yield') ?? NaN).toFixed?.(0) || '?'}
                </span>
              )}
              {!isSelf && pB && (
                <span className="text-[10px] text-muted bg-soil/5 rounded px-1.5 py-0.5">
                  P2 Y{(pB.phenotype.get('yield') ?? NaN).toFixed?.(0) || '?'}
                </span>
              )}
              <span className="ml-auto text-muted font-bold">{members.length} sibs</span>
            </div>
          );
        }
        // Detect if this cross family can be interpreted
        let interpretPanel: React.ReactNode = null;
        if (!isUngrouped && sample.parents && sample.parents[0] !== sample.parents[1]) {
          const pA = archive.get(sample.parents[0]);
          const pB = archive.get(sample.parents[1]);
          if (pA && pB) {
            const colorDisc = discovery.traitDiscoveries.color;
            const pAColor = pA.phenotype.get('color') ?? 0;
            const pBColor = pB.phenotype.get('color') ?? 0;
            const parentsHaveDiffColor = (pAColor >= 0.5) !== (pBColor >= 0.5);

            const redCount = members.filter(p => (p.phenotype.get('color') ?? 0) >= 0.5).length;
            const whiteCount = members.filter(p => (p.phenotype.get('color') ?? 0) < 0.5).length;

            if (colorDisc.level === 'unknown' && parentsHaveDiffColor) {
              interpretPanel = (
                <div className="mt-2 rounded-xl border-2 border-sky/40 bg-gradient-to-r from-sky-light/20 to-sky/5 p-3 text-xs shadow-sm">
                  <div className="font-extrabold text-soil mb-2 text-sm">{'\u{1F52C}'} You crossed a red plant with a white plant!</div>
                  <div className="flex gap-6 mb-3">
                    <div className="text-center bg-white/60 rounded-xl px-4 py-2">
                      <div className="text-2xl font-extrabold text-danger">{redCount}</div>
                      <div className="text-[10px] text-muted font-bold">Red</div>
                    </div>
                    <div className="text-center bg-white/60 rounded-xl px-4 py-2">
                      <div className="text-2xl font-extrabold text-soil">{whiteCount}</div>
                      <div className="text-[10px] text-muted font-bold">White</div>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted mb-3 font-semibold">Which allele is <strong>dominant</strong>?</p>
                  <div className="flex gap-2">
                    <button onClick={() => interpretDominance('color', key!, 'R')}
                      className="rounded-xl border-2 border-danger/30 px-4 py-2 text-[11px] font-bold hover:bg-danger/10 transition-colors">
                      R (Red is dominant)
                    </button>
                    <button onClick={() => interpretDominance('color', key!, 'r')}
                      className="rounded-xl border-2 border-soil/20 px-4 py-2 text-[11px] font-bold hover:bg-soil/5 transition-colors">
                      r (White is dominant)
                    </button>
                  </div>
                </div>
              );
            } else if (colorDisc.level !== 'unknown' && parentsHaveDiffColor) {
              const domParent = pAColor >= 0.5 ? pA : pB;
              const recParent = pAColor >= 0.5 ? pB : pA;
              const recA0 = recParent.genotype.haplotypes[0].get('COLOR');
              const recA1 = recParent.genotype.haplotypes[1].get('COLOR');
              const isRecessiveHomozygous = recA0 === colorDisc.recessiveAllele && recA1 === colorDisc.recessiveAllele;
              const alreadyResolved = discovery.resolvedGenotypes.COLOR?.has(domParent.id);

              if (isRecessiveHomozygous && !alreadyResolved && members.length >= 4) {
                interpretPanel = (
                  <div className="mt-2 rounded-xl border-2 border-leaf/40 bg-gradient-to-r from-leaf/10 to-leaf/5 p-3 text-xs shadow-sm">
                    <div className="font-extrabold text-soil mb-2 text-sm">{'\u{1F9EA}'} Test cross result ({members.length} offspring): is {domParent.id} homozygous or heterozygous?</div>
                    <div className="flex gap-6 mb-3">
                      <div className="text-center bg-white/60 rounded-xl px-4 py-2">
                        <div className="text-2xl font-extrabold text-danger">{redCount}</div>
                        <div className="text-[10px] text-muted font-bold">Red ({colorDisc.dominantAllele})</div>
                      </div>
                      <div className="text-center bg-white/60 rounded-xl px-4 py-2">
                        <div className="text-2xl font-extrabold text-soil">{whiteCount}</div>
                        <div className="text-[10px] text-muted font-bold">White ({colorDisc.recessiveAllele}{colorDisc.recessiveAllele})</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => interpretTestCross('color', key!, domParent.id, 'homozygous')}
                        className="rounded-xl border-2 border-leaf/30 px-4 py-2 text-[11px] font-bold hover:bg-leaf/10 transition-colors">
                        Homozygous {colorDisc.dominantAllele}{colorDisc.dominantAllele}
                      </button>
                      <button onClick={() => interpretTestCross('color', key!, domParent.id, 'heterozygous')}
                        className="rounded-xl border-2 border-accent/30 px-4 py-2 text-[11px] font-bold hover:bg-accent/10 transition-colors">
                        Heterozygous {colorDisc.dominantAllele}{colorDisc.recessiveAllele}
                      </button>
                    </div>
                  </div>
                );
              }
            }

            // Shape interpretation
            if (!interpretPanel) {
              const shapeDisc = discovery.traitDiscoveries.shape;
              const pAShape = pA.phenotype.get('shape') ?? -1;
              const pBShape = pB.phenotype.get('shape') ?? -1;
              const parentShapesDiffer = (pAShape >= 1.5 && pBShape < 0.5) || (pAShape < 0.5 && pBShape >= 1.5);

              const roundCount = members.filter(p => (p.phenotype.get('shape') ?? 0) >= 1.5).length;
              const ovalCount = members.filter(p => { const v = p.phenotype.get('shape') ?? 0; return v >= 0.5 && v < 1.5; }).length;
              const elongCount = members.filter(p => (p.phenotype.get('shape') ?? 0) < 0.5).length;

              if (shapeDisc.level === 'unknown' && parentShapesDiffer) {
                interpretPanel = (
                  <div className="mt-2 rounded-xl border-2 border-amber-400/40 bg-amber-50 p-3 text-xs shadow-sm">
                    <div className="font-extrabold text-soil mb-2 text-sm">{'\u{1F52C}'} Round-leaved x Elongated-leaved cross!</div>
                    <div className="flex gap-4 mb-3">
                      <div className="text-center bg-white/60 rounded-xl px-3 py-2">
                        <div className="text-xl font-extrabold text-soil">{roundCount}</div>
                        <div className="text-[10px] text-muted font-bold">Round</div>
                      </div>
                      <div className="text-center bg-white/60 rounded-xl px-3 py-2">
                        <div className="text-xl font-extrabold text-soil">{ovalCount}</div>
                        <div className="text-[10px] text-muted font-bold">Oval</div>
                      </div>
                      <div className="text-center bg-white/60 rounded-xl px-3 py-2">
                        <div className="text-xl font-extrabold text-soil">{elongCount}</div>
                        <div className="text-[10px] text-muted font-bold">Elongated</div>
                      </div>
                    </div>
                    <p className="text-[11px] text-muted mb-3 font-semibold">The offspring are <strong>intermediate</strong>. What type of inheritance?</p>
                    <div className="flex gap-2">
                      <button onClick={() => interpretDominance('shape', key!, 'L')}
                        className="rounded-xl border-2 border-amber-400/40 px-4 py-2 text-[11px] font-bold hover:bg-amber-100 transition-colors">
                        Incomplete dominance
                      </button>
                      <button onClick={() => interpretDominance('shape', key!, 'WRONG_complete')}
                        className="rounded-xl border-2 border-soil/20 px-4 py-2 text-[11px] font-bold hover:bg-soil/5 transition-colors">
                        Complete dominance
                      </button>
                    </div>
                  </div>
                );
              } else if (shapeDisc.level !== 'unknown' && parentShapesDiffer) {
                const roundParent = pAShape >= 1.5 ? pA : pB;
                const elongParent = pAShape >= 1.5 ? pB : pA;
                const eA0 = elongParent.genotype.haplotypes[0].get('SHAPE');
                const eA1 = elongParent.genotype.haplotypes[1].get('SHAPE');
                const isElongHomozygous = eA0 === shapeDisc.recessiveAllele && eA1 === shapeDisc.recessiveAllele;
                const alreadyResolved = discovery.resolvedGenotypes.SHAPE?.has(roundParent.id);
                const roundParentIsRound = (roundParent.phenotype.get('shape') ?? 0) >= 1.5;

                if (isElongHomozygous && !alreadyResolved && roundParentIsRound && members.length >= 4) {
                  interpretPanel = (
                    <div className="mt-2 rounded-xl border-2 border-leaf/40 bg-leaf/5 p-3 text-xs shadow-sm">
                      <div className="font-extrabold text-soil mb-2 text-sm">{'\u{1F9EA}'} Shape test cross ({members.length} offspring)</div>
                      <div className="flex gap-4 mb-3">
                        <div className="text-center bg-white/60 rounded-xl px-3 py-2">
                          <div className="text-xl font-extrabold text-soil">{roundCount}</div>
                          <div className="text-[10px] text-muted font-bold">Round ({shapeDisc.dominantAllele}{shapeDisc.dominantAllele})</div>
                        </div>
                        <div className="text-center bg-white/60 rounded-xl px-3 py-2">
                          <div className="text-xl font-extrabold text-soil">{ovalCount}</div>
                          <div className="text-[10px] text-muted font-bold">Oval ({shapeDisc.dominantAllele}{shapeDisc.recessiveAllele})</div>
                        </div>
                        <div className="text-center bg-white/60 rounded-xl px-3 py-2">
                          <div className="text-xl font-extrabold text-soil">{elongCount}</div>
                          <div className="text-[10px] text-muted font-bold">Elongated ({shapeDisc.recessiveAllele}{shapeDisc.recessiveAllele})</div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => interpretTestCross('shape', key!, roundParent.id, 'homozygous')}
                          className="rounded-xl border-2 border-leaf/30 px-4 py-2 text-[11px] font-bold hover:bg-leaf/10 transition-colors">
                          Homozygous {shapeDisc.dominantAllele}{shapeDisc.dominantAllele}
                        </button>
                        <button onClick={() => interpretTestCross('shape', key!, roundParent.id, 'heterozygous')}
                          className="rounded-xl border-2 border-accent/30 px-4 py-2 text-[11px] font-bold hover:bg-accent/10 transition-colors">
                          Heterozygous {shapeDisc.dominantAllele}{shapeDisc.recessiveAllele}
                        </button>
                      </div>
                    </div>
                  );
                }
              }
            }
          }
        }

        return (
          <div
            key={key ?? 'ungrouped'}
            className={`rounded-xl border-2 ${
              isUngrouped ? 'border-soil/10 bg-dirt-row' : 'border-soil/15 bg-white/70'
            } p-3`}
          >
            {header}
            {interpretPanel}
            <div className="mt-2 grid grid-cols-5 gap-1.5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10">
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
  const range = stat.max - stat.min;
  const cv = stat.mean > 0 ? stat.sd / stat.mean : 0;
  const barColor = cv < 0.08 ? 'bg-leaf' : cv < 0.15 ? 'bg-leaf/70' : cv < 0.25 ? 'bg-accent/70' : 'bg-accent';
  const barBg = cv < 0.08 ? 'bg-leaf/15' : cv < 0.15 ? 'bg-leaf/10' : cv < 0.25 ? 'bg-accent/10' : 'bg-accent/10';

  const pad = range > 0 ? range * 0.1 : stat.mean * 0.05 || 1;
  const lo = stat.min - pad;
  const hi = stat.max + pad;
  const scale = hi - lo;
  const minPct = ((stat.min - lo) / scale) * 100;
  const maxPct = ((stat.max - lo) / scale) * 100;
  const meanPct = ((stat.mean - lo) / scale) * 100;

  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span className="w-12 text-right text-muted shrink-0 font-bold">{label}</span>
      <span className="font-mono text-[10px] w-8 text-right text-soil shrink-0 font-bold">{stat.min.toFixed(0)}</span>
      <div className={`relative flex-1 h-3.5 rounded-full ${barBg} overflow-hidden`} style={{ minWidth: '4rem' }}>
        <div
          className={`absolute top-0.5 bottom-0.5 rounded-full ${barColor} opacity-60`}
          style={{ left: `${minPct}%`, width: `${Math.max(maxPct - minPct, 1)}%` }}
        />
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-soil"
          style={{ left: `${meanPct}%` }}
        />
      </div>
      <span className="font-mono text-[10px] w-8 text-soil shrink-0 font-bold">{stat.max.toFixed(0)}</span>
      <span className="text-[10px] text-muted shrink-0 w-24 font-mono">
        {'\u03bc'}{stat.mean.toFixed(1)} {'\u03c3'}{stat.sd.toFixed(1)}
      </span>
      <span className="text-[9px] text-muted shrink-0 font-bold">n={stat.n}</span>
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
    <div className="mb-3 rounded-xl border border-soil/10 bg-white/60 px-3 py-2 space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wide text-muted font-extrabold">{'\u{1F4CA}'} Population Stats</span>
        {families.size > 0 && (
          <span className="text-[10px] text-muted font-bold">{families.size} famil{families.size > 1 ? 'ies' : 'y'}</span>
        )}
      </div>
      {y ? (
        <TraitRangeBar label="Yield" stat={y} />
      ) : (
        <div className="flex items-center gap-2 text-[11px]">
          <span className="w-12 text-right text-muted font-bold">Yield</span>
          <span className="italic text-muted">not measured</span>
        </div>
      )}
      {f ? (
        <TraitRangeBar label="Flavor" stat={f} />
      ) : (
        <div className="flex items-center gap-2 text-[11px]">
          <span className="w-12 text-right text-muted font-bold">Flavor</span>
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
  measureTrait: (nurseryId: string, traitName: string, reps?: number) => void;
}) {
  const trialData = useGame((s) => s.trialData);
  const TRAITS: { name: string; label: string }[] = [
    { name: 'yield', label: 'Yield' },
    { name: 'flavor', label: 'Flavor' },
    { name: 'disease', label: 'Disease' },
  ];
  return (
    <div className="mb-3 rounded-xl border border-soil/10 bg-soil/5 px-3 py-2 flex flex-wrap items-center gap-2 text-xs">
      <span className="text-muted font-bold">{'\u{1F4CF}'} Measure:</span>
      {TRAITS.map((t) => {
        const unmeasured = nursery.plants.filter((p) => !p.phenotype.has(t.name)).length;
        const baseCost = MEASURE_COST[t.name] ?? 0;
        const cost1 = unmeasured * baseCost;
        const fullyMeasured = unmeasured === 0;

        const measuredPlants = nursery.plants.filter(p => p.phenotype.has(t.name));
        const avgReps = measuredPlants.length > 0
          ? measuredPlants.reduce((s, p) => s + (trialData.get(`${p.id}:${t.name}`)?.length ?? 1), 0) / measuredPlants.length
          : 0;

        const cost5 = nursery.plants.length * baseCost * 5;

        return (
          <span key={t.name} className="inline-flex items-center gap-1">
            {!fullyMeasured ? (
              <button
                onClick={() => measureTrait(nursery.id, t.name, 1)}
                className="rounded-lg px-3 py-1.5 text-[11px] font-bold bg-gradient-to-b from-leaf to-leaf-dark text-white shadow-sm hover:shadow-md transition-all"
                title={`Quick measure: 1 rep, ${unmeasured} plants`}
              >
                {t.label} (${cost1})
              </button>
            ) : (
              <span className="rounded-lg px-3 py-1.5 text-[11px] font-bold bg-leaf/15 text-leaf border border-leaf/20">
                {'\u{2713}'} {t.label}{avgReps > 1 ? ` (${avgReps.toFixed(0)} reps)` : ''}
              </span>
            )}
            {fullyMeasured && t.name !== 'disease' && (
              <button
                onClick={() => measureTrait(nursery.id, t.name, 5)}
                className="rounded-lg px-2 py-1.5 text-[10px] font-bold border-2 border-leaf/30 text-leaf hover:bg-leaf/10 transition-colors"
                title={`Run 5-rep replicated trial on all ${nursery.plants.length} plants`}
              >
                +5 reps (${cost5})
              </button>
            )}
          </span>
        );
      })}
      <span className="text-[10px] text-muted ml-auto font-semibold">
        Color & shape visible free
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
    <div className="mb-3 rounded-xl border-2 border-leaf/30 bg-leaf/5 px-3 py-2 flex flex-wrap items-center gap-2 text-xs">
      <span className="text-soil font-extrabold">{'\u{229A}'} Self:</span>
      <span className="font-mono text-soil font-bold">{parent.id}</span>
      <label className="flex items-center gap-1 ml-2">
        N
        <input
          type="number"
          value={count}
          min={1}
          max={100}
          onChange={(e) => setCount(Math.max(1, Number(e.target.value) || 1))}
          className="w-14 rounded-lg border-2 border-soil/20 px-2 py-0.5 font-mono bg-white"
        />
      </label>
      <span className="text-muted font-bold">${cost}</span>
      <button
        onClick={() => makeControlledCross(parent.id, parent.id, count)}
        className="rounded-xl bg-gradient-to-b from-leaf to-leaf-dark px-4 py-1.5 text-[11px] font-extrabold text-white shadow-sm hover:shadow-md ml-auto transition-all"
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
    <div className="mb-3 rounded-xl border-2 border-accent/30 bg-accent/5 px-3 py-2 flex flex-wrap items-center gap-2 text-xs">
      <span className="text-soil font-extrabold">{'\u{2715}'} Cross:</span>
      <span className="font-mono text-soil font-bold">{parentA.id}</span>
      <span className="text-muted font-bold">&times;</span>
      <span className="font-mono text-soil font-bold">{parentB.id}</span>
      <label className="flex items-center gap-1 ml-2">
        N
        <input
          type="number"
          value={count}
          min={1}
          max={100}
          onChange={(e) => setCount(Math.max(1, Number(e.target.value) || 1))}
          className="w-14 rounded-lg border-2 border-soil/20 px-2 py-0.5 font-mono bg-white"
        />
      </label>
      <span className="text-muted font-bold">${cost}</span>
      <button
        onClick={() => makeControlledCross(parentA.id, parentB.id, count)}
        className="rounded-xl bg-gradient-to-b from-accent to-accent/90 px-4 py-1.5 text-[11px] font-extrabold text-white shadow-sm hover:shadow-md ml-auto transition-all"
      >
        Make F1 family
      </button>
    </div>
  );
}

function HybridReleasePanel({
  parentA,
  parentB,
  releaseHybrid,
  traits,
}: {
  parentA: Individual;
  parentB: Individual;
  releaseHybrid: (a: string, b: string) => void;
  traits: import('../engine').Trait[];
}) {
  const yieldTrait = traits.find((t) => t.name === 'yield');
  const flavorTrait = traits.find((t) => t.name === 'flavor');
  const predictedYield = yieldTrait?.type === 'quantitative'
    ? hybridGeneticValue(parentA, parentB, yieldTrait)
    : null;
  const predictedFlavor = flavorTrait?.type === 'quantitative'
    ? hybridGeneticValue(parentA, parentB, flavorTrait)
    : null;
  const parentAYield = parentA.phenotype.get('yield');
  const parentBYield = parentB.phenotype.get('yield');
  const midparent = parentAYield != null && parentBYield != null
    ? (parentAYield + parentBYield) / 2
    : null;
  const heterosis = predictedYield != null && midparent != null && midparent > 0
    ? ((predictedYield - midparent) / midparent * 100)
    : null;

  return (
    <div className="mb-3 rounded-xl border-2 border-sky/40 bg-gradient-to-r from-sky-light/20 to-sky/5 px-3 py-2 text-xs shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-soil font-extrabold">{'\u{1F33D}'} Release as F1 hybrid:</span>
        <span className="font-mono text-soil font-bold">{parentA.id}</span>
        <span className="text-muted font-bold">&times;</span>
        <span className="font-mono text-soil font-bold">{parentB.id}</span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-muted">
        {predictedYield != null && (
          <span className="bg-white/60 rounded-lg px-2 py-1">Yield: <span className="font-mono font-extrabold text-soil">{predictedYield.toFixed(1)}</span></span>
        )}
        {predictedFlavor != null && (
          <span className="bg-white/60 rounded-lg px-2 py-1">Flavor: <span className="font-mono font-extrabold text-soil">{predictedFlavor.toFixed(1)}</span></span>
        )}
        {heterosis != null && (
          <span className={`font-bold rounded-lg px-2 py-1 ${heterosis > 0 ? 'text-leaf bg-leaf/10' : 'text-danger bg-danger/10'}`}>
            Heterosis: {heterosis > 0 ? '+' : ''}{heterosis.toFixed(1)}%
          </span>
        )}
        <span className="font-semibold">${Costs.hybridReleaseFee} + ${Costs.hybridMaintenanceCost}/season</span>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <button
          onClick={() => releaseHybrid(parentA.id, parentB.id)}
          className="rounded-xl bg-gradient-to-b from-sky to-sky/80 px-4 py-1.5 text-[11px] font-extrabold text-white shadow-sm hover:shadow-md transition-all"
        >
          {'\u{1F33D}'} Release hybrid (${Costs.hybridReleaseFee})
        </button>
        <span className="text-[10px] text-muted font-semibold">
          Inbred parents = uniform F1 seed
        </span>
      </div>
    </div>
  );
}
