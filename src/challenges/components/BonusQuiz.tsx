import { useState } from 'react';
import type { ChallengeChildProps } from './ChallengeShell';

/**
 * Lightweight multiple-choice quiz for bonus challenges.
 * data.question: string, data.options: string[], data.hint?: string
 * Sends { answer: string } (the selected option text).
 */
export function BonusQuiz({ instance, onSubmit }: ChallengeChildProps) {
  const data = instance.data as {
    question: string;
    options: string[];
    hint?: string;
  };

  const [selected, setSelected] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-sky/30 bg-sky/5 p-3">
        <p className="text-sm font-medium text-soil">{data.question}</p>
      </div>

      <div className="space-y-2">
        {data.options.map((opt) => (
          <button
            key={opt}
            onClick={() => setSelected(opt)}
            className={`w-full rounded-lg border p-3 text-left text-sm transition-colors ${
              selected === opt
                ? 'border-accent bg-accent/10 font-semibold text-soil'
                : 'border-soil/20 bg-white text-soil hover:border-leaf/40'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>

      {data.hint && !showHint && (
        <button onClick={() => setShowHint(true)} className="text-xs text-sky underline">
          Show hint
        </button>
      )}
      {showHint && data.hint && (
        <p className="rounded border border-sky/20 bg-sky/5 p-2 text-xs text-soil">{data.hint}</p>
      )}

      <button
        onClick={() => selected && onSubmit({ answer: selected })}
        disabled={!selected}
        className="w-full rounded bg-leaf py-2 text-sm font-semibold text-white disabled:opacity-40"
      >
        Submit Answer
      </button>
    </div>
  );
}
