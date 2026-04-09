import { MarkerLab } from './MarkerLab';
import { AdvancedLab } from './AdvancedLab';
import { useGame } from '../game/state';

export function LabView() {
  const unlocked = useGame((s) => s.unlocked);
  const hasAny =
    unlocked.has('marker_discovery') ||
    unlocked.has('wild_germplasm') ||
    unlocked.has('mutagenesis') ||
    unlocked.has('gene_editing') ||
    unlocked.has('genomic_prediction') ||
    unlocked.has('hybrid_breeding');

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-leaf/30 bg-leaf/5 p-3 text-xs text-soil">
        The <strong>Lab</strong> is where you use unlocked tools that affect the field: marker scans, mutagenesis,
        gene editing, training a genomic predictor, and acquiring wild germplasm. Crosses themselves happen on the
        Field tab — you select parents there and press <em>Plant next generation</em>.
      </div>
      {!hasAny && (
        <div className="rounded-lg border border-soil/20 bg-white p-3 text-xs text-muted">
          No advanced tools unlocked yet. Visit the 🌳 <strong>Tech</strong> tab and research <em>Marker discovery</em>,
          the <em>Diversity dashboard</em>, or <em>Wild germplasm</em> to enable lab actions.
        </div>
      )}
      <MarkerLab />
      <AdvancedLab />
    </div>
  );
}
