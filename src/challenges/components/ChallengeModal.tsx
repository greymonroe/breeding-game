import { useGame } from '../../game/state';
import { ALL_CHALLENGES } from '../registry';
import { ChallengeShell } from './ChallengeShell';
import { PunnettSquareChallenge } from './PunnettSquareChallenge';
import { ManhattanPlotChallenge } from './ManhattanPlotChallenge';
import { GuideRNAChallenge } from './GuideRNAChallenge';
import { PedigreeTraceChallenge } from './PedigreeTraceChallenge';
import { BottleneckChallenge } from './BottleneckChallenge';
import { MASRankingChallenge } from './MASRankingChallenge';
import { BackcrossChallenge } from './BackcrossChallenge';
import { TestcrossChallenge } from './TestcrossChallenge';
import { MutantScreenChallenge } from './MutantScreenChallenge';
import { GenomicFitChallenge } from './GenomicFitChallenge';
import { BonusQuiz } from './BonusQuiz';

const CHALLENGE_COMPONENTS: Record<string, React.ComponentType<any>> = {
  punnett_square: PunnettSquareChallenge,
  manhattan_plot: ManhattanPlotChallenge,
  guide_rna: GuideRNAChallenge,
  pedigree_trace: PedigreeTraceChallenge,
  bottleneck_sim: BottleneckChallenge,
  mas_ranking: MASRankingChallenge,
  backcross_scheme: BackcrossChallenge,
  testcross_hybrid: TestcrossChallenge,
  mutant_screen: MutantScreenChallenge,
  genomic_fit: GenomicFitChallenge,
  // Bonus challenges use BonusQuiz
  bonus_color_ratio: BonusQuiz,
  bonus_best_parent: BonusQuiz,
  bonus_offtypes: BonusQuiz,
};

/** Full-screen overlay that renders the active challenge. */
export function ChallengeModal() {
  const activeChallenge = useGame((s) => s.activeChallenge);
  const dismissChallenge = useGame((s) => s.dismissChallenge);

  if (!activeChallenge) return null;

  const def = ALL_CHALLENGES[activeChallenge.definitionId];
  if (!def) return null;

  const ChallengeComponent = CHALLENGE_COMPONENTS[activeChallenge.definitionId];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 backdrop-blur-sm">
      <div className="relative mx-4 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-soil/20 bg-surface p-6 shadow-2xl">
        <button
          onClick={dismissChallenge}
          className="absolute right-3 top-3 text-lg text-muted hover:text-soil"
          aria-label="Close"
        >
          &times;
        </button>

        <ChallengeShell definition={def} instance={activeChallenge.instance}>
          {(props) =>
            ChallengeComponent ? (
              <ChallengeComponent {...props} />
            ) : (
              <div className="space-y-3 text-center">
                <p className="text-muted">This challenge is coming soon.</p>
                <button
                  onClick={() => props.onSubmit(true)}
                  className="rounded bg-leaf px-4 py-2 text-sm font-semibold text-white"
                >
                  Continue
                </button>
              </div>
            )
          }
        </ChallengeShell>
      </div>
    </div>
  );
}
