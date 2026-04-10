import { MarkerLab } from './MarkerLab';
import { AdvancedLab } from './AdvancedLab';
import { ExperimentLab } from './ExperimentLab';

export function LabView() {
  return (
    <div className="space-y-4">
      {/* Lab Notebook — always available */}
      <ExperimentLab />

      {/* DNA Lab — tech-gated tools */}
      <div className="rounded-lg border border-soil/20 bg-white p-3">
        <h3 className="text-sm font-semibold text-soil mb-1">DNA Lab</h3>
        <p className="text-[11px] text-muted mb-3">
          Molecular tools for marker analysis, mutagenesis, gene editing, and genomic prediction.
          Unlock these in the Tech tree.
        </p>
        <MarkerLab />
        <AdvancedLab />
      </div>
    </div>
  );
}
