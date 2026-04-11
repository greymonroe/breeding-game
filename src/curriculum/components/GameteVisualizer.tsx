/**
 * GameteVisualizer — animates meiotic segregation and fertilization.
 *
 * Pedagogical goal: make the 3:1 (and 9:3:3:1) ratio an *emergent* fact of
 * haploid gamete segregation + random union + dominance — not a number to
 * memorize. Students see each parent split into gametes, watch one gamete
 * from each parent drift toward the center, fuse, and reveal a diploid
 * offspring whose phenotype is looked up by the engine's dominance rules.
 *
 * Engine coupling: the genetics are delegated to `cross()` in
 * `genetics-engine.ts`. This component calls `cross()` once up front to
 * produce the full offspring population, then animates through it, revealing
 * each child's true engine-derived genotype and phenotype. `Math.random` in
 * this file is used *only* for visual jitter, never for allele draws.
 *
 * Two views:
 *   - "Gamete": the animation described above.
 *   - "Punnett": a static 2×2 / 4×4 Punnett grid enumerating all possible
 *     gamete combinations from the same cross. Same color palette; same
 *     dominance rules. Complementary perspective on the same cross.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { OrganismCard } from './OrganismCard';
import { phenotypeFill, alleleFill } from './colors';
import {
  cross,
  getPhenotypeLabel,
  getGenotypeLabel,
  makeOrganism,
  type CrossResult,
  type GeneDefinition,
  type Organism,
} from '../genetics-engine';

// ── Types ──────────────────────────────────────────────────────────────────

type Beat = 'idle' | 'segregation' | 'migration' | 'fusion' | 'reveal';
type View = 'gamete' | 'punnett';
type Speed = 0.5 | 1 | 2;

interface GameteVisualizerProps {
  parentA: Organism;
  parentB: Organism;
  genes: GeneDefinition[];
  /** Number of offspring to generate (default 16 — a 4×4 grid). */
  sampleSize?: number;
  /** Autoplay the cycles vs. requiring a Next/Step button. Default true. */
  autoPlay?: boolean;
  /** Animation speed multiplier. Default 1. */
  speed?: Speed;
  /** If true, pauses at each beat and requires a click to advance. Default false. */
  stepThrough?: boolean;
  /** Called once the full population has been built. */
  onComplete?: (offspring: Organism[]) => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────
//
// Phenotype and allele color lookups live in `./colors` so RatioBar and
// GameteVisualizer share one source of truth. Colors here must always be
// resolved from a stable semantic key (phenotype label or allele letter),
// never a palette index.

/** Enumerate every possible gamete (one allele per gene) an organism can make.
 *  For N genes this returns 2^N strings (e.g. monohybrid -> 2, dihybrid -> 4).
 *  Deterministic order (no Math.random) so the Punnett grid renders stably. */
function enumerateGametes(org: Organism, genes: GeneDefinition[]): string[][] {
  // Array of [allele-per-gene] tuples.
  let acc: string[][] = [[]];
  for (const gene of genes) {
    const [a1, a2] = org.genotype[gene.id];
    const next: string[][] = [];
    for (const prefix of acc) {
      next.push([...prefix, a1]);
      next.push([...prefix, a2]);
    }
    acc = next;
  }
  return acc;
}

/** Build a diploid organism from two haploid gamete allele-tuples. */
function fertilize(
  gameteA: string[],
  gameteB: string[],
  genes: GeneDefinition[],
): Organism {
  const genotype: Record<string, [string, string]> = {};
  genes.forEach((gene, i) => {
    genotype[gene.id] = [gameteA[i], gameteB[i]];
  });
  return makeOrganism(genotype);
}

/** Beat durations in ms at 1× speed. Totals 1750ms per full cycle. */
const BEAT_MS_BASE: Record<Exclude<Beat, 'idle'>, number> = {
  segregation: 450,
  migration: 500,
  fusion: 300,
  reveal: 500,
};

/** Small, deterministic jitter based on cycle index — used for visual
 *  placement variety only, never for genetics. */
function jitter(i: number, amp: number): number {
  // Deterministic pseudo-jitter: sin-based so it varies but doesn't need rng.
  return (Math.sin((i + 1) * 12.9898) * 43758.5453) % 1 * amp;
}

// ── Component ──────────────────────────────────────────────────────────────

export function GameteVisualizer({
  parentA,
  parentB,
  genes,
  sampleSize = 16,
  autoPlay = true,
  speed = 1,
  stepThrough: stepThroughProp = false,
  onComplete,
}: GameteVisualizerProps) {
  // View + UI toggles
  const [view, setView] = useState<View>('gamete');
  const [showLabels, setShowLabels] = useState(true);
  const [localSpeed, setLocalSpeed] = useState<Speed>(speed);
  const [stepThrough, setStepThrough] = useState<boolean>(stepThroughProp);

  // Respect prefers-reduced-motion: default to step-through, no auto-advance.
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    if (mq.matches) setStepThrough(true);
    const handler = (e: MediaQueryListEvent) => {
      setReducedMotion(e.matches);
      if (e.matches) setStepThrough(true);
    };
    mq.addEventListener?.('change', handler);
    return () => mq.removeEventListener?.('change', handler);
  }, []);

  // Engine call: produce the full population ONCE. The visualizer is a
  // visualization of *this* randomness; it does not re-roll anything.
  const [generation, setGeneration] = useState(0); // bump to re-roll
  const population: CrossResult = useMemo(
    () => cross(parentA, parentB, genes, sampleSize),
    // `generation` is included so "Re-run" can regenerate.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [parentA, parentB, genes, sampleSize, generation],
  );

  // Animation state
  const [index, setIndex] = useState(0); // which offspring we're currently building
  const [beat, setBeat] = useState<Beat>('idle');
  const [built, setBuilt] = useState<Organism[]>([]); // revealed offspring so far
  const timerRef = useRef<number | null>(null);
  const completedRef = useRef(false);

  // Reset when inputs change
  useEffect(() => {
    setIndex(0);
    setBeat('idle');
    setBuilt([]);
    completedRef.current = false;
  }, [parentA, parentB, genes, sampleSize, generation]);

  // Start autoplay if enabled
  useEffect(() => {
    if (view !== 'gamete') return;
    if (stepThrough) return;
    if (!autoPlay) return;
    if (beat !== 'idle') return;
    if (index >= population.offspring.length) return;
    // Kick off the first beat
    setBeat('segregation');
  }, [view, stepThrough, autoPlay, beat, index, population.offspring.length]);

  // Advance through beats for the current offspring
  const advanceBeat = useCallback(() => {
    setBeat(prev => {
      if (prev === 'idle') return 'segregation';
      if (prev === 'segregation') return 'migration';
      if (prev === 'migration') return 'fusion';
      if (prev === 'fusion') return 'reveal';
      // reveal -> commit + next
      return 'idle';
    });
  }, []);

  // When beat enters 'reveal', commit the current offspring to `built`.
  // When beat returns to 'idle' after a reveal, advance to the next offspring.
  useEffect(() => {
    if (view !== 'gamete') return;
    if (beat === 'idle') return;
    if (stepThrough) return; // student drives advancement manually

    const mult = 1 / localSpeed;
    const ms = BEAT_MS_BASE[beat] * mult;
    timerRef.current = window.setTimeout(() => {
      if (beat === 'reveal') {
        // Commit this offspring
        setBuilt(b => {
          const nextBuilt = [...b, population.offspring[index]];
          return nextBuilt;
        });
        setBeat('idle');
        setIndex(i => i + 1);
      } else {
        advanceBeat();
      }
    }, ms);
    return () => {
      if (timerRef.current != null) window.clearTimeout(timerRef.current);
    };
  }, [beat, view, stepThrough, localSpeed, index, population.offspring, advanceBeat]);

  // Step-through: manual commit on reveal
  const stepForward = useCallback(() => {
    if (view !== 'gamete') return;
    if (index >= population.offspring.length) return;
    if (beat === 'reveal') {
      setBuilt(b => [...b, population.offspring[index]]);
      setBeat('idle');
      setIndex(i => i + 1);
      return;
    }
    if (beat === 'idle') {
      setBeat('segregation');
      return;
    }
    advanceBeat();
  }, [view, index, population.offspring, beat, advanceBeat]);

  // Notify parent on completion (once)
  useEffect(() => {
    if (
      built.length === population.offspring.length &&
      built.length > 0 &&
      !completedRef.current
    ) {
      completedRef.current = true;
      onComplete?.(built);
    }
  }, [built, population.offspring.length, onComplete]);

  // Keyboard: space bar advances in step-through
  useEffect(() => {
    if (!stepThrough) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        stepForward();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [stepThrough, stepForward]);

  const done = index >= population.offspring.length && beat === 'idle';

  // ── Derive current-cycle gametes directly from the engine-produced child ──
  // population.offspring[index].genotype[gene.id] = [fromA, fromB]
  // fromA = the allele parentA contributed; fromB = the allele parentB contributed.
  // This is why we don't re-roll Math.random: the engine already told us which
  // allele each parent sent to this particular offspring. We just show it.
  const currentChild: Organism | null =
    index < population.offspring.length ? population.offspring[index] : null;

  const chosenGameteA: string[] = currentChild
    ? genes.map(g => currentChild.genotype[g.id][0])
    : [];
  const chosenGameteB: string[] = currentChild
    ? genes.map(g => currentChild.genotype[g.id][1])
    : [];

  // The other two "unused" gametes — the alleles *not* chosen for this child.
  // These fade out during migration; they're the other meiotic products.
  const otherGameteA: string[] = currentChild
    ? genes.map(g => {
        const [a1, a2] = parentA.genotype[g.id];
        return chosenGameteA[genes.indexOf(g)] === a1 ? a2 : a1;
      })
    : [];
  const otherGameteB: string[] = currentChild
    ? genes.map(g => {
        const [a1, a2] = parentB.genotype[g.id];
        return chosenGameteB[genes.indexOf(g)] === a1 ? a2 : a1;
      })
    : [];

  // ── Punnett enumeration (static, all gamete combinations) ──
  const gametesA = useMemo(() => enumerateGametes(parentA, genes), [parentA, genes]);
  const gametesB = useMemo(() => enumerateGametes(parentB, genes), [parentB, genes]);

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="rounded-2xl border border-stone-200 bg-white shadow-sm p-6 space-y-4">
      {/* Header + controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xl font-bold text-stone-800">Gamete Visualizer</div>
          <div className="text-xs text-stone-500">
            Watch meiosis → fertilization → phenotype, one offspring at a time.
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="inline-flex rounded-full border border-stone-200 bg-stone-50 p-0.5">
            <button
              type="button"
              onClick={() => setView('gamete')}
              className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
                view === 'gamete'
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'text-stone-600 hover:text-stone-800'
              }`}
            >
              Gamete view
            </button>
            <button
              type="button"
              onClick={() => setView('punnett')}
              className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
                view === 'punnett'
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'text-stone-600 hover:text-stone-800'
              }`}
            >
              Punnett view
            </button>
          </div>
          {/* Show-labels toggle */}
          <button
            type="button"
            onClick={() => setShowLabels(v => !v)}
            className={`px-3 py-1 text-xs font-semibold rounded-full border transition-colors ${
              showLabels
                ? 'bg-violet-50 border-violet-200 text-violet-800'
                : 'bg-white border-stone-200 text-stone-500'
            }`}
          >
            {showLabels ? 'Labels on' : 'Labels off'}
          </button>
        </div>
      </div>

      {/* Parents row — reuse OrganismCard */}
      <div className="flex items-center justify-center gap-6">
        <OrganismCard org={parentA} genes={genes} label="Parent 1" showGenotype />
        <span className="text-2xl font-bold text-stone-400">&times;</span>
        <OrganismCard org={parentB} genes={genes} label="Parent 2" showGenotype />
      </div>

      {/* Fixed-min-height stage so view swaps don't shift layout */}
      <div className="relative" style={{ minHeight: 280 }}>
        {view === 'gamete' ? (
          <GameteStage
            genes={genes}
            beat={beat}
            index={index}
            reducedMotion={reducedMotion}
            localSpeed={localSpeed}
            showLabels={showLabels}
            chosenGameteA={chosenGameteA}
            chosenGameteB={chosenGameteB}
            otherGameteA={otherGameteA}
            otherGameteB={otherGameteB}
            currentChild={currentChild}
            total={population.offspring.length}
          />
        ) : (
          <PunnettStage
            genes={genes}
            gametesA={gametesA}
            gametesB={gametesB}
            showLabels={showLabels}
          />
        )}
      </div>

      {/* Controls row */}
      {view === 'gamete' && (
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-stone-100">
          <div className="flex items-center gap-2 rounded-xl bg-violet-50 border border-violet-200 px-3 py-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wide text-violet-700">
              Speed
            </span>
            {([0.5, 1, 2] as Speed[]).map(s => (
              <button
                key={s}
                type="button"
                onClick={() => setLocalSpeed(s)}
                className={`px-2 py-0.5 rounded-md text-xs font-semibold transition-colors ${
                  localSpeed === s
                    ? 'bg-violet-600 text-white'
                    : 'text-violet-700 hover:bg-violet-100'
                }`}
              >
                {s}×
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-xs text-stone-600 font-semibold select-none">
            <input
              type="checkbox"
              checked={stepThrough}
              onChange={e => setStepThrough(e.target.checked)}
              className="accent-emerald-500"
            />
            Step through (space)
          </label>
          <div className="flex items-center gap-2">
            {stepThrough && !done && (
              <button
                type="button"
                onClick={stepForward}
                className="rounded-xl bg-gradient-to-b from-emerald-500 to-emerald-600 px-4 py-1.5 text-xs font-bold text-white shadow-md hover:shadow-lg active:from-emerald-600 transition-all"
              >
                {beat === 'idle' ? 'Start cycle' : beat === 'reveal' ? 'Keep →' : 'Next beat'}
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                completedRef.current = false;
                setGeneration(g => g + 1);
              }}
              className="rounded-xl bg-stone-100 hover:bg-stone-200 border border-stone-200 px-3 py-1.5 text-xs font-semibold text-stone-700 transition-colors"
            >
              Re-run
            </button>
          </div>
        </div>
      )}

      {/* Offspring population grid (built as cycles complete) */}
      {view === 'gamete' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-stone-600">
              Offspring population
            </div>
            <div className="text-[10px] text-stone-400 font-mono">
              {built.length} / {population.offspring.length}
            </div>
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {Array.from({ length: population.offspring.length }).map((_, i) => {
              const child = i < built.length ? built[i] : null;
              if (!child) {
                return (
                  <div
                    key={i}
                    className="aspect-square rounded-lg border border-dashed border-stone-200 bg-stone-50"
                  />
                );
              }
              const label = getPhenotypeLabel(child, genes);
              const fill = phenotypeFill(label, genes);
              const genoLabel = getGenotypeLabel(child, genes);
              return (
                <div
                  key={i}
                  className="aspect-square rounded-lg border border-stone-200 bg-white flex flex-col items-center justify-center p-1 transition-opacity duration-500"
                  style={{ opacity: 1 }}
                  title={`${genoLabel} — ${label}`}
                >
                  <div
                    className="w-6 h-6 rounded-full border border-stone-300"
                    style={{ backgroundColor: fill }}
                  />
                  {showLabels && (
                    <div className="text-[8px] font-mono text-stone-600 mt-0.5 leading-none">
                      {genoLabel}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Stage sub-components ───────────────────────────────────────────────────

interface GameteStageProps {
  genes: GeneDefinition[];
  beat: Beat;
  index: number;
  reducedMotion: boolean;
  localSpeed: Speed;
  showLabels: boolean;
  chosenGameteA: string[];
  chosenGameteB: string[];
  otherGameteA: string[];
  otherGameteB: string[];
  currentChild: Organism | null;
  total: number;
}

function GameteStage({
  genes,
  beat,
  index,
  reducedMotion,
  localSpeed,
  showLabels,
  chosenGameteA,
  chosenGameteB,
  otherGameteA,
  otherGameteB,
  currentChild,
  total,
}: GameteStageProps) {
  // Transition duration tied to beat speed (not per-frame — just CSS timing)
  const txMs = Math.round(450 / localSpeed);
  const txStyle = reducedMotion
    ? { transition: 'none' as const }
    : { transition: `transform ${txMs}ms ease-out, opacity ${txMs}ms ease-out` };

  const hasStarted = beat !== 'idle' || index > 0;
  const cycleComplete = index >= total && beat === 'idle';

  // Per-beat visibility and translation flags
  const showGametes = beat !== 'idle';
  const migrated = beat === 'migration' || beat === 'fusion' || beat === 'reveal';
  const fused = beat === 'fusion' || beat === 'reveal';
  const revealed = beat === 'reveal';

  // Jitter the "other" (unused) gametes slightly so they don't overlap
  const jA = jitter(index, 8);
  const jB = jitter(index + 100, 8);

  return (
    <div className="relative h-full w-full">
      <div className="relative h-full w-full flex items-center justify-center">
        {/* Left-parent gametes column */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col gap-2">
          <GameteCell
            alleles={chosenGameteA}
            genes={genes}
            showLabels={showLabels}
            visible={showGametes}
            // Selected one drifts right during migration
            style={{
              ...txStyle,
              transform: migrated ? 'translate(140px, 0)' : 'translate(0, 0)',
              opacity: showGametes ? 1 : 0,
            }}
            ringClass={fused && !revealed ? 'ring-2 ring-emerald-400' : ''}
          />
          <GameteCell
            alleles={otherGameteA}
            genes={genes}
            showLabels={showLabels}
            visible={showGametes}
            faded={migrated}
            style={{
              ...txStyle,
              transform: `translate(${jA}px, ${jA / 2}px)`,
              opacity: migrated ? 0 : showGametes ? 1 : 0,
            }}
          />
        </div>

        {/* Right-parent gametes column */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2">
          <GameteCell
            alleles={chosenGameteB}
            genes={genes}
            showLabels={showLabels}
            visible={showGametes}
            style={{
              ...txStyle,
              transform: migrated ? 'translate(-140px, 0)' : 'translate(0, 0)',
              opacity: showGametes ? 1 : 0,
            }}
            ringClass={fused && !revealed ? 'ring-2 ring-emerald-400' : ''}
          />
          <GameteCell
            alleles={otherGameteB}
            genes={genes}
            showLabels={showLabels}
            visible={showGametes}
            faded={migrated}
            style={{
              ...txStyle,
              transform: `translate(${jB}px, ${jB / 2}px)`,
              opacity: migrated ? 0 : showGametes ? 1 : 0,
            }}
          />
        </div>

        {/* Fusion center — revealed offspring */}
        <div
          className={`relative flex flex-col items-center justify-center transition-all duration-300 ${
            fused ? 'scale-110' : 'scale-95'
          }`}
          style={{ minWidth: 100, minHeight: 100 }}
        >
          {fused && currentChild && (
            <div
              className={`flex flex-col items-center justify-center rounded-full border-2 ${
                revealed ? 'border-stone-300' : 'border-emerald-400'
              } ${revealed ? '' : 'ring-2 ring-emerald-300'} bg-white p-2 transition-all duration-300`}
              style={{ width: 84, height: 84 }}
            >
              <div
                className="w-10 h-10 rounded-full border border-stone-300"
                style={{
                  backgroundColor: phenotypeFill(
                    getPhenotypeLabel(currentChild, genes),
                    genes,
                  ),
                }}
              />
              {showLabels && revealed && (
                <>
                  <div className="text-[9px] font-mono text-stone-700 mt-0.5 leading-tight">
                    {getGenotypeLabel(currentChild, genes)}
                  </div>
                  <div className="text-[8px] text-stone-500 leading-tight">
                    {getPhenotypeLabel(currentChild, genes)}
                  </div>
                </>
              )}
            </div>
          )}
          {!hasStarted && (
            <div className="font-hand text-stone-400 text-sm text-center">
              Press play or &ldquo;Start cycle&rdquo;<br />
              to watch gametes form.
            </div>
          )}
          {cycleComplete && (
            <div className="font-hand text-emerald-700 text-sm text-center">
              All {total} offspring built!
            </div>
          )}
        </div>
      </div>

      {/* Beat label */}
      <div className="absolute bottom-0 left-0 right-0 text-center">
        <span className="inline-block px-3 py-0.5 rounded-full bg-stone-50 border border-stone-200 text-[10px] font-semibold uppercase tracking-wider text-stone-500">
          {beat === 'idle' && !cycleComplete && 'Ready'}
          {beat === 'segregation' && 'Meiosis — alleles separate'}
          {beat === 'migration' && 'One gamete from each parent migrates'}
          {beat === 'fusion' && 'Fertilization — gametes fuse'}
          {beat === 'reveal' && 'Phenotype revealed (dominance applied)'}
          {cycleComplete && 'Done'}
        </span>
      </div>
    </div>
  );
}

// A single haploid gamete cell — small circle showing one allele per gene.
function GameteCell({
  alleles,
  genes,
  showLabels,
  visible,
  style,
  ringClass = '',
  faded = false,
}: {
  alleles: string[];
  genes: GeneDefinition[];
  showLabels: boolean;
  visible: boolean;
  style?: React.CSSProperties;
  ringClass?: string;
  faded?: boolean;
}) {
  if (!visible || alleles.length === 0) {
    return <div style={{ width: 44, height: 44 }} />;
  }
  // For multi-gene gametes, show stacked mini-circles inside one chip.
  return (
    <div
      className={`relative flex items-center justify-center gap-0.5 rounded-full border border-stone-300 bg-white shadow-sm ${ringClass} ${
        faded ? 'opacity-40' : 'opacity-100'
      }`}
      style={{ width: 44, height: 44, ...style }}
    >
      <div className="flex items-center justify-center gap-0.5">
        {alleles.map((allele, i) => (
          <div
            key={i}
            className="rounded-full border border-stone-300 flex items-center justify-center"
            style={{
              width: alleles.length === 1 ? 30 : 18,
              height: alleles.length === 1 ? 30 : 18,
              backgroundColor: alleleFill(allele, genes[i]),
            }}
          >
            {showLabels && (
              <span
                className="font-hand text-[11px] font-bold"
                style={{
                  color:
                    allele === allele.toUpperCase()
                      ? 'rgba(255,255,255,0.95)'
                      : 'rgba(30,30,30,0.85)',
                  textShadow: '0 1px 1px rgba(0,0,0,0.25)',
                }}
              >
                {allele}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Punnett view ───────────────────────────────────────────────────────────

interface PunnettStageProps {
  genes: GeneDefinition[];
  gametesA: string[][];
  gametesB: string[][];
  showLabels: boolean;
}

function PunnettStage({
  genes,
  gametesA,
  gametesB,
  showLabels,
}: PunnettStageProps) {
  const gameteLabel = (g: string[]) => g.join('');

  return (
    <div className="flex items-center justify-center h-full">
      <div className="inline-block">
        <table className="border-collapse">
          <thead>
            <tr>
              <th className="p-1" />
              {gametesB.map((gb, j) => (
                <th key={j} className="p-1">
                  <div className="flex items-center justify-center mx-auto rounded-full border border-stone-300 bg-white"
                    style={{ width: 36, height: 36 }}
                  >
                    <span className="font-hand text-xs font-bold text-stone-700">
                      {gameteLabel(gb)}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {gametesA.map((ga, i) => (
              <tr key={i}>
                <td className="p-1">
                  <div className="flex items-center justify-center rounded-full border border-stone-300 bg-white"
                    style={{ width: 36, height: 36 }}
                  >
                    <span className="font-hand text-xs font-bold text-stone-700">
                      {gameteLabel(ga)}
                    </span>
                  </div>
                </td>
                {gametesB.map((gb, j) => {
                  const child = fertilize(ga, gb, genes);
                  const phenoLabel = getPhenotypeLabel(child, genes);
                  const genoLabel = getGenotypeLabel(child, genes);
                  const fill = phenotypeFill(phenoLabel, genes);
                  return (
                    <td key={j} className="p-1">
                      <div
                        className="rounded-lg border border-stone-200 flex flex-col items-center justify-center"
                        style={{
                          width: 60,
                          height: 60,
                          backgroundColor: fill,
                        }}
                        title={`${genoLabel} — ${phenoLabel}`}
                      >
                        {showLabels && (
                          <>
                            <span
                              className="font-mono text-[10px] font-bold leading-none"
                              style={{
                                color: isDark(fill)
                                  ? 'rgba(255,255,255,0.95)'
                                  : 'rgba(30,30,30,0.85)',
                              }}
                            >
                              {genoLabel}
                            </span>
                            <span
                              className="text-[8px] mt-0.5 leading-none"
                              style={{
                                color: isDark(fill)
                                  ? 'rgba(255,255,255,0.8)'
                                  : 'rgba(60,60,60,0.8)',
                              }}
                            >
                              {phenoLabel}
                            </span>
                          </>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-3 text-center text-[10px] text-stone-500">
          Every possible combination of one gamete from each parent.
          The ratio you see in the gamete view is what emerges from running this table many times.
        </div>
      </div>
    </div>
  );
}

/** Quick luminance heuristic — decide whether to use light or dark text on a swatch. */
function isDark(hex: string): boolean {
  if (!hex.startsWith('#')) return false;
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  // Relative luminance approx
  const L = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return L < 0.55;
}
