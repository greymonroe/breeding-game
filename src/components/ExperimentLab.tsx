import { useState } from 'react';
import { useGame, type Experiment } from '../game/state';
import type { Individual } from '../engine';

/**
 * The Experiment Lab — where players discover genetics through the scientific method.
 * Available from season 0, no tech unlock needed.
 */
export function ExperimentLab() {
  const {
    nurseries, discovery, experiments,
    startDominanceTest, interpretDominanceTest,
    startTestCross, interpretTestCross,
  } = useGame();

  const allPlants = nurseries.flatMap((n) => n.plants);
  const colorDisc = discovery.traitDiscoveries.color;
  const shapeDisc = discovery.traitDiscoveries.shape;

  return (
    <div className="rounded-lg border border-soil/20 bg-white p-3 space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-soil">Genetics Lab</h3>
        <p className="text-[11px] text-muted mt-0.5">
          Set up experiments to discover how traits are inherited. Cross plants with different phenotypes and observe the offspring.
        </p>
      </div>

      {/* Dominance tests */}
      {colorDisc.level === 'unknown' && (
        <DominanceTestSetup
          traitName="color"
          traitLabel="Flower color"
          phenotypeA="Red"
          phenotypeB="White"
          allPlants={allPlants}
          filterA={(p) => (p.phenotype.get('color') ?? 0) >= 0.5}
          filterB={(p) => (p.phenotype.get('color') ?? 0) < 0.5}
          onStart={startDominanceTest}
        />
      )}
      {shapeDisc.level === 'unknown' && colorDisc.level !== 'unknown' && (
        <DominanceTestSetup
          traitName="shape"
          traitLabel="Fruit shape"
          phenotypeA="Round"
          phenotypeB="Elongated"
          allPlants={allPlants}
          filterA={(p) => (p.phenotype.get('shape') ?? 0) >= 1.5}
          filterB={(p) => (p.phenotype.get('shape') ?? 0) < 0.5}
          onStart={startDominanceTest}
        />
      )}

      {/* Pending experiments */}
      {experiments.filter(e => e.status === 'awaiting_result').map((exp) => (
        <ExperimentResultPanel
          key={exp.id}
          experiment={exp}
          nurseries={nurseries}
          onInterpretDominance={interpretDominanceTest}
          onInterpretTestCross={interpretTestCross}
        />
      ))}

      {/* Test cross setup — available once dominance is known */}
      {colorDisc.level !== 'unknown' && (
        <TestCrossSetup
          traitName="color"
          traitLabel="Flower color"
          discovery={discovery}
          allPlants={allPlants}
          dominantAllele={colorDisc.dominantAllele!}
          recessiveAllele={colorDisc.recessiveAllele!}
          locusId={colorDisc.locusId}
          onStart={startTestCross}
        />
      )}

      {/* Completed experiments */}
      {experiments.filter(e => e.status === 'complete').length > 0 && (
        <details className="text-[11px]">
          <summary className="cursor-pointer text-muted hover:text-soil">
            Completed experiments ({experiments.filter(e => e.status === 'complete').length})
          </summary>
          <div className="mt-1 space-y-1">
            {experiments.filter(e => e.status === 'complete').map(e => (
              <div key={e.id} className="text-muted font-mono">
                ✓ {e.type === 'dominance_test' ? 'Dominance test' : 'Test cross'}: {e.traitName}
                {e.targetIndividualId && ` (${e.targetIndividualId})`}
              </div>
            ))}
          </div>
        </details>
      )}

      {colorDisc.level === 'unknown' && allPlants.length === 0 && (
        <div className="text-xs text-muted italic">
          You need plants in your nurseries to run experiments. Go to the Field tab first.
        </div>
      )}
    </div>
  );
}

function DominanceTestSetup({
  traitName, traitLabel, phenotypeA, phenotypeB,
  allPlants, filterA, filterB, onStart,
}: {
  traitName: string;
  traitLabel: string;
  phenotypeA: string;
  phenotypeB: string;
  allPlants: Individual[];
  filterA: (p: Individual) => boolean;
  filterB: (p: Individual) => boolean;
  onStart: (traitName: string, parentAId: string, parentBId: string) => void;
}) {
  const [selectedA, setSelectedA] = useState('');
  const [selectedB, setSelectedB] = useState('');
  const plantsA = allPlants.filter(filterA);
  const plantsB = allPlants.filter(filterB);

  return (
    <div className="rounded border border-accent/30 bg-accent/5 p-2 text-xs">
      <div className="font-semibold text-soil mb-1">🔬 Dominance Test: {traitLabel}</div>
      <p className="text-[11px] text-muted mb-2">
        Which phenotype is dominant? Cross a {phenotypeA.toLowerCase()} plant with a {phenotypeB.toLowerCase()} plant
        and observe what the offspring look like.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1">
          {phenotypeA}:
          <select value={selectedA} onChange={(e) => setSelectedA(e.target.value)}
            className="rounded border border-soil/30 px-1 py-0.5 text-[11px]">
            <option value="">pick…</option>
            {plantsA.map((p) => (
              <option key={p.id} value={p.id}>{p.id}</option>
            ))}
          </select>
        </label>
        <span className="text-muted">×</span>
        <label className="flex items-center gap-1">
          {phenotypeB}:
          <select value={selectedB} onChange={(e) => setSelectedB(e.target.value)}
            className="rounded border border-soil/30 px-1 py-0.5 text-[11px]">
            <option value="">pick…</option>
            {plantsB.map((p) => (
              <option key={p.id} value={p.id}>{p.id}</option>
            ))}
          </select>
        </label>
        <button
          disabled={!selectedA || !selectedB}
          onClick={() => { onStart(traitName, selectedA, selectedB); setSelectedA(''); setSelectedB(''); }}
          className="rounded bg-accent px-3 py-1 text-[11px] font-bold text-white hover:bg-accent/90 disabled:opacity-40"
        >
          Run experiment (free)
        </button>
      </div>
    </div>
  );
}

function ExperimentResultPanel({
  experiment, nurseries,
  onInterpretDominance, onInterpretTestCross,
}: {
  experiment: Experiment;
  nurseries: { id: string; name: string; plants: Individual[] }[];
  onInterpretDominance: (expId: string, allele: string) => boolean;
  onInterpretTestCross: (expId: string, answer: 'homozygous' | 'heterozygous') => boolean;
}) {
  // Find the experiment nursery by matching family ID
  const expNursery = nurseries.find(n =>
    n.plants.some(p => p.familyId === experiment.familyId)
  );
  const offspring = expNursery?.plants.filter(p => p.familyId === experiment.familyId) ?? [];

  if (experiment.type === 'dominance_test') {
    return (
      <DominanceResultPanel
        experiment={experiment}
        offspring={offspring}
        onInterpret={onInterpretDominance}
      />
    );
  }

  return (
    <TestCrossResultPanel
      experiment={experiment}
      offspring={offspring}
      onInterpret={onInterpretTestCross}
    />
  );
}

function DominanceResultPanel({
  experiment, offspring, onInterpret,
}: {
  experiment: Experiment;
  offspring: Individual[];
  onInterpret: (expId: string, allele: string) => boolean;
}) {
  const traitName = experiment.traitName;

  // Count phenotypes
  let countA = 0;
  let countB = 0;
  let labelA = '';
  let labelB = '';
  if (traitName === 'color') {
    countA = offspring.filter(p => (p.phenotype.get('color') ?? 0) >= 0.5).length;
    countB = offspring.filter(p => (p.phenotype.get('color') ?? 0) < 0.5).length;
    labelA = 'Red';
    labelB = 'White';
  } else if (traitName === 'shape') {
    countA = offspring.filter(p => (p.phenotype.get('shape') ?? 0) >= 1).length;
    countB = offspring.filter(p => (p.phenotype.get('shape') ?? 0) < 0.5).length;
    labelA = 'Round/Oval';
    labelB = 'Elongated';
  }

  // Figure out which alleles to offer as choices
  const alleleChoices = traitName === 'color' ? [
    { allele: 'R', label: 'R (Red is dominant)' },
    { allele: 'r', label: 'r (White is dominant)' },
  ] : traitName === 'shape' ? [
    { allele: 'L', label: 'L (Round is dominant)' },
    { allele: 'l', label: 'l (Elongated is dominant)' },
  ] : [];

  return (
    <div className="rounded border border-sky/40 bg-sky/5 p-2 text-xs">
      <div className="font-semibold text-soil mb-1">🔬 Results: Dominance Test ({experiment.traitName})</div>
      <p className="text-[11px] text-muted mb-2">
        You crossed {experiment.parentAId} × {experiment.parentBId} and produced {offspring.length} offspring.
      </p>
      <div className="flex gap-4 mb-2">
        <div className="text-center">
          <div className="text-2xl font-bold text-soil">{countA}</div>
          <div className="text-[10px] text-muted">{labelA}</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-soil">{countB}</div>
          <div className="text-[10px] text-muted">{labelB}</div>
        </div>
      </div>
      <p className="text-[11px] text-muted mb-2">
        Based on these offspring, which allele is <strong>dominant</strong>?
      </p>
      <div className="flex gap-2">
        {alleleChoices.map(({ allele, label }) => (
          <button
            key={allele}
            onClick={() => onInterpret(experiment.id, allele)}
            className="rounded border border-soil/30 px-3 py-1 text-[11px] hover:bg-soil/5"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

function TestCrossSetup({
  traitName, traitLabel, discovery, allPlants,
  dominantAllele, recessiveAllele, locusId, onStart,
}: {
  traitName: string;
  traitLabel: string;
  discovery: import('../game/discovery').DiscoveryState;
  allPlants: Individual[];
  dominantAllele: string;
  recessiveAllele: string;
  locusId: string;
  onStart: (traitName: string, dominantId: string, recessiveId: string) => void;
}) {
  const [selectedDom, setSelectedDom] = useState('');
  const [selectedRec, setSelectedRec] = useState('');

  // Dominant phenotype plants that haven't been resolved yet
  const dominantPlants = allPlants.filter((p) => {
    const a0 = p.genotype.haplotypes[0].get(locusId);
    const a1 = p.genotype.haplotypes[1].get(locusId);
    const isRecessive = a0 === recessiveAllele && a1 === recessiveAllele;
    if (isRecessive) return false;
    // Already resolved?
    const resolved = discovery.resolvedGenotypes[locusId];
    return !resolved?.has(p.id);
  });

  const recessivePlants = allPlants.filter((p) => {
    const a0 = p.genotype.haplotypes[0].get(locusId);
    const a1 = p.genotype.haplotypes[1].get(locusId);
    return a0 === recessiveAllele && a1 === recessiveAllele;
  });

  if (dominantPlants.length === 0 || recessivePlants.length === 0) return null;

  return (
    <div className="rounded border border-leaf/30 bg-leaf/5 p-2 text-xs">
      <div className="font-semibold text-soil mb-1">🧪 Test Cross: {traitLabel}</div>
      <p className="text-[11px] text-muted mb-2">
        Cross a {dominantAllele}? plant with a known {recessiveAllele}{recessiveAllele} plant.
        If all offspring show the dominant phenotype → parent is {dominantAllele}{dominantAllele}.
        If ~half show the recessive phenotype → parent is {dominantAllele}{recessiveAllele}.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1">
          {dominantAllele}? plant:
          <select value={selectedDom} onChange={(e) => setSelectedDom(e.target.value)}
            className="rounded border border-soil/30 px-1 py-0.5 text-[11px]">
            <option value="">pick…</option>
            {dominantPlants.map((p) => (
              <option key={p.id} value={p.id}>{p.id}</option>
            ))}
          </select>
        </label>
        <span className="text-muted">×</span>
        <label className="flex items-center gap-1">
          {recessiveAllele}{recessiveAllele} tester:
          <select value={selectedRec} onChange={(e) => setSelectedRec(e.target.value)}
            className="rounded border border-soil/30 px-1 py-0.5 text-[11px]">
            <option value="">pick…</option>
            {recessivePlants.map((p) => (
              <option key={p.id} value={p.id}>{p.id}</option>
            ))}
          </select>
        </label>
        <button
          disabled={!selectedDom || !selectedRec}
          onClick={() => { onStart(traitName, selectedDom, selectedRec); setSelectedDom(''); setSelectedRec(''); }}
          className="rounded bg-leaf px-3 py-1 text-[11px] font-bold text-white hover:bg-leaf/90 disabled:opacity-40"
        >
          Run test cross (free)
        </button>
      </div>
    </div>
  );
}

function TestCrossResultPanel({
  experiment, offspring, onInterpret,
}: {
  experiment: Experiment;
  offspring: Individual[];
  onInterpret: (expId: string, answer: 'homozygous' | 'heterozygous') => boolean;
}) {
  const traitName = experiment.traitName;

  let countDom = 0;
  let countRec = 0;
  let labelDom = '';
  let labelRec = '';
  if (traitName === 'color') {
    countDom = offspring.filter(p => (p.phenotype.get('color') ?? 0) >= 0.5).length;
    countRec = offspring.filter(p => (p.phenotype.get('color') ?? 0) < 0.5).length;
    labelDom = 'Red';
    labelRec = 'White';
  } else if (traitName === 'shape') {
    countDom = offspring.filter(p => (p.phenotype.get('shape') ?? 0) >= 1).length;
    countRec = offspring.filter(p => (p.phenotype.get('shape') ?? 0) < 0.5).length;
    labelDom = 'Round/Oval';
    labelRec = 'Elongated';
  }

  return (
    <div className="rounded border border-sky/40 bg-sky/5 p-2 text-xs">
      <div className="font-semibold text-soil mb-1">🧪 Results: Test Cross ({experiment.targetIndividualId})</div>
      <p className="text-[11px] text-muted mb-2">
        Crossed {experiment.parentAId} × {experiment.parentBId}. {offspring.length} offspring produced:
      </p>
      <div className="flex gap-4 mb-2">
        <div className="text-center">
          <div className="text-2xl font-bold text-soil">{countDom}</div>
          <div className="text-[10px] text-muted">{labelDom}</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-soil">{countRec}</div>
          <div className="text-[10px] text-muted">{labelRec}</div>
        </div>
      </div>
      <p className="text-[11px] text-muted mb-2">
        Based on these offspring ratios, is <strong>{experiment.targetIndividualId}</strong>:
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => onInterpret(experiment.id, 'homozygous')}
          className="rounded border border-soil/30 px-3 py-1 text-[11px] hover:bg-soil/5"
        >
          Homozygous (all offspring dominant)
        </button>
        <button
          onClick={() => onInterpret(experiment.id, 'heterozygous')}
          className="rounded border border-soil/30 px-3 py-1 text-[11px] hover:bg-soil/5"
        >
          Heterozygous (segregating offspring)
        </button>
      </div>
    </div>
  );
}
