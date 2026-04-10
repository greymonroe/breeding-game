import type { ReactNode } from 'react';

export function QuestionPanel({ question, children, correct, feedback }: {
  question: string; children: ReactNode;
  correct?: boolean | null; feedback?: string;
}) {
  return (
    <div className={`rounded-xl border-2 p-4 space-y-3 ${
      correct === true ? 'border-emerald-400 bg-emerald-50' :
      correct === false ? 'border-red-300 bg-red-50' :
      'border-sky-300 bg-sky-50'
    }`}>
      <p className="text-sm font-semibold text-stone-700">{question}</p>
      {children}
      {feedback && (
        <div className={`text-sm rounded-lg p-3 ${
          correct ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
        }`}>
          {feedback}
        </div>
      )}
    </div>
  );
}
