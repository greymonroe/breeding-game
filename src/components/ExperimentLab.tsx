import { useGame } from '../game/state';

/**
 * Lab Notebook — shows discoveries made and protocols learned.
 * Experiments are done in the Field (cross plants, interpret offspring).
 * This panel shows what you've learned so far.
 */
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
    <div className="rounded-lg border border-soil/20 bg-white p-3 space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-soil">Lab Notebook</h3>
        <p className="text-[11px] text-muted mt-0.5">
          Your discoveries and protocols. Cross plants with different phenotypes in the <strong>Field</strong> tab
          to discover inheritance patterns — interpretation prompts appear on the cross family.
        </p>
      </div>

      {!hasAnyDiscovery && (
        <div className="rounded border border-accent/30 bg-accent/5 p-2 text-xs text-muted">
          <strong className="text-soil">Getting started:</strong> Go to the Field tab, select a red-flowered plant
          and a white-flowered plant, then make a controlled cross. Observe the offspring to discover which color
          is dominant.
        </div>
      )}

      {/* Discoveries */}
      <div className="space-y-2">
        <DiscoveryCard
          traitLabel="Flower color"
          locusLabel="COLOR"
          disc={colorDisc}
          resolvedCount={discovery.resolvedGenotypes.COLOR?.size ?? 0}
        />
        {(shapeDisc.level !== 'unknown' || colorDisc.level !== 'unknown') && (
          <DiscoveryCard
            traitLabel="Fruit shape"
            locusLabel="SHAPE"
            disc={shapeDisc}
            resolvedCount={discovery.resolvedGenotypes.SHAPE?.size ?? 0}
          />
        )}
        {diseaseDisc.level !== 'unknown' && (
          <DiscoveryCard
            traitLabel="Disease resistance"
            locusLabel="DR"
            disc={diseaseDisc}
            resolvedCount={discovery.resolvedGenotypes.DR?.size ?? 0}
          />
        )}
      </div>

      {resolvedCount > 0 && (
        <div className="text-[10px] text-muted">
          {resolvedCount} individual genotype{resolvedCount !== 1 ? 's' : ''} resolved via test crosses.
        </div>
      )}
    </div>
  );
}

function DiscoveryCard({ traitLabel, locusLabel, disc, resolvedCount }: {
  traitLabel: string;
  locusLabel: string;
  disc: { level: string; dominantAllele?: string; recessiveAllele?: string; dominanceDiscoveredAt?: number };
  resolvedCount: number;
}) {
  if (disc.level === 'unknown') {
    return (
      <div className="rounded border border-soil/10 bg-soil/5 p-2 text-xs text-muted">
        <span className="font-semibold">{traitLabel}</span> — inheritance unknown.
        Cross plants with different phenotypes to discover.
      </div>
    );
  }

  return (
    <div className="rounded border border-leaf/30 bg-leaf/5 p-2 text-xs">
      <div className="font-semibold text-soil">{traitLabel} ({locusLabel})</div>
      <div className="text-[11px] text-muted mt-0.5">
        <strong>{disc.dominantAllele}</strong> is dominant over <strong>{disc.recessiveAllele}</strong>.
        {disc.dominanceDiscoveredAt != null && ` Discovered season ${disc.dominanceDiscoveredAt}.`}
      </div>
      <div className="text-[11px] text-muted mt-0.5">
        Recessive plants: <span className="font-mono">{disc.recessiveAllele}{disc.recessiveAllele}</span> (known).
        Dominant plants: <span className="font-mono">{disc.dominantAllele}?</span> — test cross to resolve.
        {resolvedCount > 0 && <span className="text-leaf"> ({resolvedCount} resolved)</span>}
      </div>
      <div className="text-[10px] text-muted mt-1 italic">
        Protocol: cross a {disc.dominantAllele}? plant with a {disc.recessiveAllele}{disc.recessiveAllele} tester.
        If all offspring are dominant → {disc.dominantAllele}{disc.dominantAllele}.
        If ~half are recessive → {disc.dominantAllele}{disc.recessiveAllele}.
      </div>
    </div>
  );
}
