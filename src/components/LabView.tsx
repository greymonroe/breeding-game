import { MarkerLab } from './MarkerLab';
import { AdvancedLab } from './AdvancedLab';
import { ExperimentLab } from './ExperimentLab';

export function LabView() {
  return (
    <div className="space-y-4">
      {/* Lab Notebook — always available */}
      <ExperimentLab />

      {/* DNA Lab — tech-gated tools */}
      <div className="card-lab p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">{'\u{1F9EC}'}</span>
          <h3 className="text-sm font-extrabold text-lab-accent">DNA Lab</h3>
        </div>
        <p className="text-[11px] text-muted mb-3 font-semibold">
          Molecular tools for marker analysis, mutagenesis, gene editing, and genomic prediction.
          Unlock these in the Tech tree.
        </p>
        <MarkerLab />
        <AdvancedLab />
      </div>
    </div>
  );
}
