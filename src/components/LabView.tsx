import { MarkerLab } from './MarkerLab';
import { AdvancedLab } from './AdvancedLab';
import { ExperimentLab } from './ExperimentLab';

export function LabView() {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-leaf/30 bg-leaf/5 p-3 text-xs text-soil">
        The <strong>Lab</strong> is where you discover genetics through experiments
        and use advanced breeding tools.
      </div>
      <ExperimentLab />
      <MarkerLab />
      <AdvancedLab />
    </div>
  );
}
