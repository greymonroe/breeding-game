import { useState, useRef, useEffect } from 'react';
import type { Individual, Trait } from '../engine';
import { MEASURE_COST } from '../game/economy';
import { GenotypeBar } from '../challenges/visualizations/GenotypeBar';
import { useGame } from '../game/state';
import { PlantIcon } from '../shared/icons';

function trialSE(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance / values.length);
}

interface Props {
  ind: Individual;
  /** Unused but kept for callers — phenotype rendering reads from ind directly. */
  traits?: Trait[];
  selected?: boolean;
  onClick?: () => void;
}

const colorFor = (v: number) => (v >= 0.5 ? '#c0392b' : '#f5f1e8');
const colorStroke = (v: number) => (v >= 0.5 ? '#a02318' : '#c4b08a');
const shapeFor = (v: number) => (v >= 1.5 ? 'M40 70 Q10 40 40 10 Q70 40 40 70 Z' : v >= 0.5 ? 'M40 75 Q15 40 40 5 Q65 40 40 75 Z' : 'M40 75 Q30 40 40 5 Q50 40 40 75 Z');

function familyHue(familyId: string): number {
  let h = 0;
  for (let i = 0; i < familyId.length; i++) h = (h * 31 + familyId.charCodeAt(i)) % 360;
  return h;
}

const TRAIT_INFO: { key: string; label: string; unit: string }[] = [
  { key: 'yield', label: 'Yield', unit: '' },
  { key: 'flavor', label: 'Flavor', unit: '' },
  { key: 'color', label: 'Color', unit: '' },
  { key: 'shape', label: 'Shape', unit: '' },
  { key: 'disease', label: 'Disease R.', unit: '' },
];

function formatTraitValue(key: string, value: number): string {
  if (key === 'color') return value >= 0.5 ? 'Red' : 'White';
  if (key === 'shape') return value >= 1.5 ? 'Round' : value >= 0.5 ? 'Oval' : 'Elongated';
  if (key === 'disease') return value >= 0.5 ? 'Resistant' : 'Susceptible';
  return value.toFixed(1);
}

export function PlantCard({ ind, selected, onClick }: Props) {
  const discovery = useGame((s) => s.discovery);
  const trialData = useGame((s) => s.trialData);
  const color = ind.phenotype.get('color') ?? 0;
  const shape = ind.phenotype.get('shape') ?? 0;
  const yieldV = ind.phenotype.get('yield');
  const flavor = ind.phenotype.get('flavor');
  const disease = ind.phenotype.get('disease');
  // Visual height: known yield drives it; unknown shows a default seedling height.
  const height = yieldV != null ? 30 + yieldV * 0.6 : 45;
  const familyStripe = ind.familyId ? `hsl(${familyHue(ind.familyId)} 55% 55%)` : null;

  // Yield bar: normalize to 0-100 range (yield typically 30-70)
  const yieldPct = yieldV != null ? Math.min(100, Math.max(0, ((yieldV - 20) / 60) * 100)) : 0;

  const [showTooltip, setShowTooltip] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cardRef = useRef<HTMLButtonElement>(null);

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => setShowTooltip(true), 300);
  };
  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setShowTooltip(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <div className="relative">
      <button
        ref={cardRef}
        onClick={onClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`relative flex flex-col items-center rounded-xl border-2 p-1.5 transition-all w-full ${
          selected
            ? 'plant-selected border-accent'
            : 'border-soil/15 bg-gradient-to-b from-white to-wheat-light/30 hover:border-leaf hover:shadow-sm'
        }`}
      >
        {/* Family stripe */}
        {familyStripe && (
          <div
            className="absolute top-0 left-1 right-1 h-1 rounded-b"
            style={{ background: familyStripe }}
          />
        )}

        {/* Disease shield badge */}
        {disease != null && disease >= 0.5 && (
          <span className="absolute top-0.5 right-1 text-[10px]">{'\u{1F6E1}'}</span>
        )}

        {/* Plant SVG — larger */}
        <PlantIcon color={colorFor(color)} strokeColor={colorStroke(color)} height={height} leafPath={shapeFor(shape)} />

        {/* Yield bar */}
        {yieldV != null && (
          <div className="yield-bar w-full mt-1" style={{ maxWidth: '42px' }}>
            <div
              className="yield-bar-fill"
              style={{ width: `${yieldPct}%` }}
            />
          </div>
        )}

        {/* Values */}
        <div className="text-[10px] font-bold font-mono text-soil leading-tight mt-1">
          {yieldV != null ? yieldV.toFixed(0) : '?'}
          <span className="text-muted font-normal"> / </span>
          {flavor != null ? flavor.toFixed(0) : '?'}
        </div>

        <GenotypeBar ind={ind} discovery={discovery} />
      </button>

      {showTooltip && (
        <div
          className="fixed sm:absolute z-50 sm:bottom-full left-1/2 -translate-x-1/2 bottom-4 sm:bottom-auto sm:mb-2 w-[85vw] sm:w-48 max-w-[12rem] rounded-xl border-2 border-soil/20 bg-white shadow-game-lg p-3 text-[11px] text-soil pointer-events-none"
        >
          <div className="font-extrabold text-soil mb-1 font-mono text-[10px]">
            {ind.id}
          </div>
          <div className="flex items-center gap-2 text-[10px] text-muted mb-2">
            <span className="bg-soil/10 rounded px-1.5 py-0.5 font-semibold">Gen {ind.generation}</span>
            {ind.familyId && (
              <>
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full border border-white shadow-sm"
                  style={{ background: `hsl(${familyHue(ind.familyId)} 55% 55%)` }}
                />
                <span className="font-mono truncate max-w-[5rem]">{ind.familyId}</span>
              </>
            )}
          </div>

          <table className="w-full">
            <tbody>
              {TRAIT_INFO.map((t) => {
                const val = ind.phenotype.get(t.key);
                const measured = val != null;
                const cost = MEASURE_COST[t.key];
                const trials = trialData.get(`${ind.id}:${t.key}`);
                const reps = trials?.length ?? (measured ? 1 : 0);
                const se = trials && trials.length >= 2 ? trialSE(trials) : 0;
                return (
                  <tr key={t.key} className="border-t border-soil/10">
                    <td className="py-0.5 pr-1 text-muted font-semibold">{t.label}</td>
                    <td className="py-0.5 text-right font-mono">
                      {measured ? (
                        <span className="text-soil font-bold">
                          {formatTraitValue(t.key, val)}
                          {se > 0 && <span className="text-[9px] text-muted font-normal"> &plusmn;{se.toFixed(1)}</span>}
                          {reps > 1 && <span className="text-[8px] text-muted font-normal"> n={reps}</span>}
                        </span>
                      ) : cost != null ? (
                        <span className="text-muted italic">? <span className="text-[9px]">(${cost}/plant)</span></span>
                      ) : (
                        <span className="text-muted italic">?</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {ind.parents && (
            <div className="mt-2 pt-1.5 border-t border-soil/10 text-[9px] text-muted font-mono">
              Parents: {ind.parents[0] === ind.parents[1]
                ? `self(${ind.parents[0]})`
                : `${ind.parents[0]} x ${ind.parents[1]}`}
            </div>
          )}

          <div
            className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0"
            style={{
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: '6px solid white',
            }}
          />
        </div>
      )}
    </div>
  );
}
