import { useGame } from '../game/state';

export function ExperimentLab() {
  const { discovery } = useGame();

  const colorDisc = discovery.traitDiscoveries.color;
  const shapeDisc = discovery.traitDiscoveries.shape;
  const diseaseDisc = discovery.traitDiscoveries.disease;

  const hasAnyDiscovery = colorDisc.level !== 'unknown' || shapeDisc.level !== 'unknown' || diseaseDisc.level !== 'unknown';
  const resolvedCount = (discovery.resolvedGenotypes.COLOR?.size ?? 0)
    + (discovery.resolvedGenotypes.SHAPE?.size ?? 0)
    + (discovery.resolvedGenotypes.DR?.size ?? 0);

  return (
    <div className="card-lab p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-xl">{'\u{1F4D3}'}</span>
        <div>
          <h3 className="text-sm font-extrabold text-lab-accent">Lab Notebook</h3>
          <p className="text-[10px] text-muted font-semibold mt-0.5">
            Cross plants with different phenotypes in the <strong>Field</strong> tab to discover inheritance patterns.
          </p>
        </div>
      </div>

      {!hasAnyDiscovery && (
        <div className="rounded-xl border-2 border-accent/30 bg-accent/5 p-3 text-xs text-muted">
          <strong className="text-soil">{'\u{1F4A1}'} Getting started:</strong> Go to the Field tab, select a red-flowered plant
          and a white-flowered plant, then advance the season. Observe the offspring to discover which color
          is dominant.
        </div>
      )}

      <div className="space-y-2">
        <DiscoveryCard
          traitLabel="Flower color"
          locusLabel="COLOR"
          disc={colorDisc}
          resolvedCount={discovery.resolvedGenotypes.COLOR?.size ?? 0}
          icon={'\u{1F338}'}
        />
        {(shapeDisc.level !== 'unknown' || colorDisc.level !== 'unknown') && (
          <DiscoveryCard
            traitLabel="Fruit shape"
            locusLabel="SHAPE"
            disc={shapeDisc}
            resolvedCount={discovery.resolvedGenotypes.SHAPE?.size ?? 0}
            icon={'\u{1F343}'}
          />
        )}
        {diseaseDisc.level !== 'unknown' && (
          <DiscoveryCard
            traitLabel="Disease resistance"
            locusLabel="DR"
            disc={diseaseDisc}
            resolvedCount={discovery.resolvedGenotypes.DR?.size ?? 0}
            icon={'\u{1F6E1}'}
          />
        )}
      </div>

      {resolvedCount > 0 && (
        <div className="text-[10px] text-muted font-bold bg-lab-bg/50 rounded-lg px-3 py-1.5">
          {'\u{1F9EA}'} {resolvedCount} individual genotype{resolvedCount !== 1 ? 's' : ''} resolved via test crosses.
        </div>
      )}
    </div>
  );
}

function DiscoveryCard({ traitLabel, locusLabel, disc, resolvedCount, icon }: {
  traitLabel: string;
  locusLabel: string;
  disc: { level: string; dominantAllele?: string; recessiveAllele?: string; dominanceDiscoveredAt?: number };
  resolvedCount: number;
  icon: string;
}) {
  if (disc.level === 'unknown') {
    return (
      <div className="rounded-xl border border-soil/10 bg-soil/5 p-3 text-xs text-muted">
        <span className="mr-1">{icon}</span>
        <span className="font-bold">{traitLabel}</span> &mdash; inheritance unknown.
        Cross plants with different phenotypes to discover.
      </div>
    );
  }

  return (
    <div className="rounded-xl border-2 border-leaf/30 bg-gradient-to-r from-leaf/5 to-leaf/10 p-3 text-xs">
      <div className="font-extrabold text-soil">
        <span className="mr-1">{icon}</span>
        {traitLabel} <span className="text-muted font-bold">({locusLabel})</span>
      </div>
      <div className="text-[11px] text-muted mt-1 font-semibold">
        <strong className="text-soil">{disc.dominantAllele}</strong> is dominant over <strong className="text-soil">{disc.recessiveAllele}</strong>.
        {disc.dominanceDiscoveredAt != null && ` Discovered season ${disc.dominanceDiscoveredAt}.`}
      </div>
      <div className="text-[11px] text-muted mt-1 font-semibold">
        Recessive: <span className="font-mono font-bold bg-white/50 rounded px-1">{disc.recessiveAllele}{disc.recessiveAllele}</span> (known).
        Dominant: <span className="font-mono font-bold bg-white/50 rounded px-1">{disc.dominantAllele}?</span> &mdash; test cross to resolve.
        {resolvedCount > 0 && <span className="text-leaf font-bold"> ({resolvedCount} resolved)</span>}
      </div>
      <div className="text-[10px] text-muted mt-2 italic bg-white/40 rounded-lg px-2 py-1.5">
        {'\u{1F4CB}'} Protocol: cross {disc.dominantAllele}? &times; {disc.recessiveAllele}{disc.recessiveAllele}.
        All dominant offspring &rarr; {disc.dominantAllele}{disc.dominantAllele}.
        ~Half recessive &rarr; {disc.dominantAllele}{disc.recessiveAllele}.
      </div>
    </div>
  );
}
