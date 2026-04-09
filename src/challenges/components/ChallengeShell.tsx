import { useState, type ReactNode } from 'react';
import { useGame } from '../../game/state';
import type { ChallengeDefinition, ChallengeInstance, ChallengeResult } from '../types';

export interface ChallengeChildProps {
  instance: ChallengeInstance;
  onSubmit: (answer: unknown) => void;
  submitted: boolean;
}

interface Props {
  definition: ChallengeDefinition;
  instance: ChallengeInstance;
  children: (props: ChallengeChildProps) => ReactNode;
}

/**
 * Shared wrapper for all challenges.
 * Handles: title, description, submit flow, result display, reward.
 */
export function ChallengeShell({ definition, instance, children }: Props) {
  const [result, setResult] = useState<ChallengeResult | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const submitChallenge = useGame((s) => s.submitChallenge);
  const dismissChallenge = useGame((s) => s.dismissChallenge);

  function handleSubmit(answer: unknown) {
    if (submitted) return;
    setSubmitted(true);
    const r = submitChallenge(answer);
    setResult(r);
  }

  const diffStars = '★'.repeat(definition.difficulty) + '☆'.repeat(3 - definition.difficulty);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-soil">{definition.title}</h2>
          <span className="text-xs text-accent">{diffStars}</span>
        </div>
        <p className="mt-1 text-sm text-muted">{definition.description}</p>
      </div>

      <hr className="border-soil/10" />

      {/* Interactive area */}
      {!result && children({ instance, onSubmit: handleSubmit, submitted })}

      {/* Result */}
      {result && (
        <div
          className={`rounded-lg border p-4 ${
            result.correct
              ? 'border-leaf/30 bg-leaf/5'
              : 'border-accent/30 bg-accent/5'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="text-2xl">{result.correct ? '✓' : '✗'}</span>
            <span className={`font-bold ${result.correct ? 'text-leaf' : 'text-accent'}`}>
              {result.correct ? 'Correct!' : 'Not quite...'}
            </span>
          </div>
          <p className="mt-2 text-sm text-soil">{result.explanation}</p>
          {result.detail && (
            <p className="mt-1 text-xs text-muted">{result.detail}</p>
          )}

          <div className="mt-4 flex gap-2">
            {result.correct ? (
              <button
                onClick={dismissChallenge}
                className="rounded bg-leaf px-4 py-2 text-sm font-semibold text-white"
              >
                Continue
              </button>
            ) : (
              <>
                <button
                  onClick={() => { setResult(null); setSubmitted(false); }}
                  className="rounded bg-accent px-4 py-2 text-sm font-semibold text-white"
                >
                  Try Again
                </button>
                <button
                  onClick={dismissChallenge}
                  className="rounded border border-soil/20 px-4 py-2 text-sm text-muted"
                >
                  Come Back Later
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
