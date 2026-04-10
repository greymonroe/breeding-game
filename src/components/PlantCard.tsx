import { useState, useRef, useEffect } from 'react';
import type { Individual, Trait } from '../engine';
import { MEASURE_COST } from '../game/economy';
import { GenotypeBar } from '../challenges/visualizations/GenotypeBar';
import { useGame } from '../game/state';

interface Props {
  ind: Individual;
  /** Unused but kept for callers — phenotype rendering reads from ind directly. */
  traits?: Trait[];
  selected?: boolean;
  onClick?: () => void;
}

const colorFor = (v: number) => (v >= 0.5 ? '#c0392b' : '#f5f1e8');
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
  // Grab the stable discovery reference — it only changes when a discovery is made
  const discovery = useGame((s) => s.discovery);
  const color = ind.phenotype.get('color') ?? 0;
  const shape = ind.phenotype.get('shape') ?? 0;
  const yieldV = ind.phenotype.get('yield');
  const flavor = ind.phenotype.get('flavor');
  const disease = ind.phenotype.get('disease');
  // Visual height: known yield drives it; unknown shows a default seedling height.
  const height = yieldV != null ? 30 + yieldV * 0.6 : 45;
  const familyStripe = ind.familyId ? `hsl(${familyHue(ind.familyId)} 60% 60%)` : null;

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
        className={`relative flex flex-col items-center rounded-md border p-1 transition-all w-full ${
          selected ? 'border-accent bg-accent/10 ring-1 ring-accent' : 'border-soil/20 bg-white hover:border-leaf'
        }`}
      >
        {familyStripe && (
          <div
            className="absolute top-0 left-0 right-0 h-0.5 rounded-t"
            style={{ background: familyStripe }}
          />
        )}
        {disease != null && disease >= 0.5 && (
          <span className="absolute top-0 right-0.5 text-[8px]">&#x1f6e1;</span>
        )}
        <svg viewBox="0 0 80 110" width="36" height="50">
          <line x1="40" y1="105" x2="40" y2={110 - height} stroke="#4a7c59" strokeWidth="3" />
          <path d={shapeFor(shape)} transform={`translate(0 ${100 - height})`} fill="#7cb587" stroke="#4a7c59" strokeWidth="1" />
          <circle cx="40" cy={108 - height} r="8" fill={colorFor(color)} stroke="#3d2c1f" strokeWidth="1" />
        </svg>
        <div className="text-[9px] font-mono text-muted leading-none mt-0.5">
          {yieldV != null ? yieldV.toFixed(0) : '?'}
          {' / '}
          {flavor != null ? flavor.toFixed(0) : '?'}
        </div>
        <GenotypeBar ind={ind} discovery={discovery} />
      </button>

      {showTooltip && (
        <div
          className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-1 w-44 rounded-lg border border-soil/30 bg-white shadow-lg p-2 text-[11px] text-soil pointer-events-none"
          style={{ minWidth: '11rem' }}
        >
          <div className="font-semibold text-soil mb-1 font-mono text-[10px]">
            {ind.id}
          </div>
          <div className="flex items-center gap-2 text-[10px] text-muted mb-1.5">
            <span>Gen {ind.generation}</span>
            {ind.familyId && (
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ background: `hsl(${familyHue(ind.familyId)} 60% 60%)` }}
              />
            )}
            {ind.familyId && <span className="font-mono truncate max-w-[5rem]">{ind.familyId}</span>}
          </div>

          <table className="w-full">
            <tbody>
              {TRAIT_INFO.map((t) => {
                const val = ind.phenotype.get(t.key);
                const measured = val != null;
                const cost = MEASURE_COST[t.key];
                return (
                  <tr key={t.key} className="border-t border-soil/10">
                    <td className="py-0.5 pr-1 text-muted">{t.label}</td>
                    <td className="py-0.5 text-right font-mono">
                      {measured ? (
                        <span className="text-soil">{formatTraitValue(t.key, val)}</span>
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
            <div className="mt-1.5 pt-1 border-t border-soil/10 text-[9px] text-muted font-mono">
              Parents: {ind.parents[0] === ind.parents[1]
                ? `self(${ind.parents[0]})`
                : `${ind.parents[0]} x ${ind.parents[1]}`}
            </div>
          )}

          <div
            className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0"
            style={{
              borderLeft: '5px solid transparent',
              borderRight: '5px solid transparent',
              borderTop: '5px solid white',
            }}
          />
        </div>
      )}
    </div>
  );
}
