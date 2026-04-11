/**
 * Practice Mode — Duolingo-flavored rapid practice for the Mendelian module.
 *
 * A single session is 10 problems, interleaved across concepts via the
 * spaced-repetition selector. Problems render with immediate feedback and
 * an explanation card; the student must click "Next" to advance. At the
 * end of a session the scorecard shows per-concept results and (on a
 * perfect 10) a CSS-only celebration animation that respects
 * `prefers-reduced-motion`.
 *
 * All persistence happens through `spaced-repetition.ts`; no other module
 * reads or writes localStorage.
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type {
  PracticeProblem,
  PracticeConcept,
  PracticeOption,
} from './problems';
import {
  generateProblemForConcept,
  CONCEPT_LABELS,
  ALL_CONCEPTS,
} from './problems';
import {
  loadState,
  saveState,
  recordAnswer,
  recordSessionEnd,
  selectNextConcept,
  getStreakDisplay,
  type PracticeState,
} from './spaced-repetition';

const SESSION_LENGTH = 10;

type View = 'landing' | 'session' | 'scorecard';

interface SessionResult {
  problem: PracticeProblem;
  selectedIdx: number;
  correct: boolean;
}

// ── Root component ──────────────────────────────────────────────────────

export function PracticeMode() {
  const [state, setState] = useState<PracticeState>(() => loadState());
  const [view, setView] = useState<View>('landing');
  const [sessionResults, setSessionResults] = useState<SessionResult[]>([]);
  const [currentProblem, setCurrentProblem] = useState<PracticeProblem | null>(null);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  // Guard against rapid-Enter double-commits (F-003). The global Enter
  // handler fires synchronously for every keydown; a hold-Enter or two
  // presses within one frame would otherwise call `advance()` twice with
  // the same `selectedIdx`, record the answer twice, and push a duplicate
  // SessionResult. Set on entry, check-and-bail if already set, cleared
  // whenever the next problem mounts.
  const inFlightRef = useRef(false);

  const reducedMotion = usePrefersReducedMotion();

  const startSession = useCallback(() => {
    setSessionResults([]);
    setSelectedIdx(null);
    // Pick first concept + problem from the current state.
    const next = selectNextConcept(state, Math.random);
    setCurrentProblem(generateProblemForConcept(next, Math.random));
    setView('session');
  }, [state]);

  const advance = useCallback(() => {
    if (!currentProblem || selectedIdx === null) return;
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    const correct = currentProblem.options[selectedIdx]?.isCorrect === true;
    const newResult: SessionResult = {
      problem: currentProblem,
      selectedIdx,
      correct,
    };
    const newResults = [...sessionResults, newResult];

    // Update spaced-repetition state and persist (mid-session reload safety).
    const updated = recordAnswer(state, currentProblem.concept, correct);
    setState(updated);
    saveState(updated);

    if (newResults.length >= SESSION_LENGTH) {
      const correctCount = newResults.filter(r => r.correct).length;
      const finalState = recordSessionEnd(updated, newResults.length, correctCount);
      setState(finalState);
      saveState(finalState);
      setSessionResults(newResults);
      setCurrentProblem(null);
      setSelectedIdx(null);
      setView('scorecard');
      return;
    }

    // Next problem
    const nextConcept = selectNextConcept(updated, Math.random);
    setSessionResults(newResults);
    setSelectedIdx(null);
    setCurrentProblem(generateProblemForConcept(nextConcept, Math.random));
  }, [currentProblem, selectedIdx, sessionResults, state]);

  const backToLanding = useCallback(() => {
    setView('landing');
    setSessionResults([]);
    setCurrentProblem(null);
    setSelectedIdx(null);
  }, []);

  // Reset the in-flight guard whenever the current problem changes (either
  // the session started, advanced, or was torn down). Pairs with the guard
  // set in `advance()` to prevent double-commits on rapid Enter.
  useEffect(() => {
    inFlightRef.current = false;
  }, [currentProblem]);

  // Keyboard shortcuts: 1-4 select options; Enter advances after answered.
  useEffect(() => {
    if (view !== 'session') return;
    function onKey(e: KeyboardEvent) {
      if (!currentProblem) return;
      if (e.key >= '1' && e.key <= '4') {
        const idx = parseInt(e.key, 10) - 1;
        if (selectedIdx === null && idx < currentProblem.options.length) {
          setSelectedIdx(idx);
          e.preventDefault();
        }
      } else if (e.key === 'Enter' && selectedIdx !== null) {
        advance();
        e.preventDefault();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [view, currentProblem, selectedIdx, advance]);

  // ── Render dispatch ────────────────────────────────────────────────

  if (view === 'landing') {
    return <LandingCard state={state} onStart={startSession} />;
  }
  if (view === 'session' && currentProblem) {
    return (
      <SessionCard
        state={state}
        problem={currentProblem}
        selectedIdx={selectedIdx}
        setSelectedIdx={setSelectedIdx}
        onAdvance={advance}
        progress={{ index: sessionResults.length + 1, total: SESSION_LENGTH }}
      />
    );
  }
  if (view === 'scorecard') {
    return (
      <Scorecard
        state={state}
        results={sessionResults}
        reducedMotion={reducedMotion}
        onPracticeAgain={startSession}
        onBack={backToLanding}
      />
    );
  }
  return null;
}

// ── Landing ────────────────────────────────────────────────────────────

function LandingCard({
  state,
  onStart,
}: {
  state: PracticeState;
  onStart: () => void;
}) {
  const streak = getStreakDisplay(state);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-stone-200 shadow-sm bg-white p-6 space-y-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2
              className="text-2xl text-stone-800"
              style={{ fontFamily: "'Patrick Hand', cursive" }}
            >
              Practice Mode
            </h2>
            <p className="text-sm text-stone-600 mt-1">
              Quick drills across every concept in the module. Ten questions,
              immediate feedback, spaced-repetition scheduling.
            </p>
          </div>
          <StreakPill streak={streak} />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-center">
          <Stat label="Sessions" value={state.totalSessions} />
          <Stat label="Problems answered" value={state.totalProblems} />
          <Stat
            label="Overall accuracy"
            value={
              state.totalProblems === 0
                ? '\u2014'
                : `${Math.round((100 * state.totalCorrect) / state.totalProblems)}%`
            }
          />
        </div>

        <button
          type="button"
          onClick={onStart}
          className="w-full rounded-xl px-5 py-3 font-semibold text-white bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 shadow-md transition-all"
        >
          Start a 10-question session
        </button>
      </div>

      <div className="rounded-2xl border border-stone-200 shadow-sm bg-white p-6 space-y-4">
        <h3 className="text-sm font-semibold text-stone-700">
          Concept mastery
        </h3>
        <div className="space-y-3">
          {ALL_CONCEPTS.map(c => {
            const s = state.concepts[c];
            const acc = s.attempts === 0 ? 0 : s.correct / s.attempts;
            const pct = Math.round(acc * 100);
            return (
              <div key={c} className="space-y-1">
                <div className="flex items-baseline justify-between text-xs">
                  <span className="font-semibold text-stone-700">
                    {CONCEPT_LABELS[c]}
                  </span>
                  <span className="text-stone-500">
                    {s.attempts === 0
                      ? 'Not yet practiced'
                      : `${pct}% (${s.correct}/${s.attempts})`}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-stone-200 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
      <div className="text-xl font-bold text-stone-800">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-stone-500 mt-0.5">
        {label}
      </div>
    </div>
  );
}

function StreakPill({
  streak,
}: {
  streak: { current: number; best: number; isToday: boolean };
}) {
  const msg =
    streak.current === 0
      ? 'Start your streak today!'
      : streak.isToday
      ? `${streak.current} day streak \u2014 keep it up`
      : `${streak.current} day streak \u2014 practice today to extend it`;
  return (
    <div className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-800 flex items-center gap-1.5">
      <span aria-hidden>{'\uD83D\uDD25'}</span>
      <span>{msg}</span>
    </div>
  );
}

// ── Session card ───────────────────────────────────────────────────────

function SessionCard({
  state,
  problem,
  selectedIdx,
  setSelectedIdx,
  onAdvance,
  progress,
}: {
  state: PracticeState;
  problem: PracticeProblem;
  selectedIdx: number | null;
  setSelectedIdx: (i: number) => void;
  onAdvance: () => void;
  progress: { index: number; total: number };
}) {
  const answered = selectedIdx !== null;
  const selectedOption =
    selectedIdx !== null ? problem.options[selectedIdx] : null;
  const isCorrect = selectedOption?.isCorrect === true;
  const streak = getStreakDisplay(state);

  return (
    <div className="rounded-2xl border border-stone-200 shadow-sm bg-white p-6 space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <span
            className="text-xl text-stone-800"
            style={{ fontFamily: "'Patrick Hand', cursive" }}
          >
            Question {progress.index} of {progress.total}
          </span>
          <span className="text-xs text-stone-500">
            {CONCEPT_LABELS[problem.concept]}
          </span>
        </div>
        <StreakPill streak={streak} />
      </div>

      <ProgressBar current={progress.index} total={progress.total} />

      <div>
        <p className="text-base text-stone-800 leading-relaxed">
          {problem.prompt}
        </p>
        {problem.hint && (
          <p className="mt-1 text-xs italic text-stone-500 leading-snug">
            Hint: {problem.hint}
          </p>
        )}
      </div>

      <div
        className="grid gap-2"
        role="radiogroup"
        aria-label="Answer choices"
      >
        {problem.options.map((opt, i) => (
          <OptionButton
            key={`${problem.id}-${i}`}
            opt={opt}
            index={i}
            selected={selectedIdx === i}
            answered={answered}
            onClick={() => !answered && setSelectedIdx(i)}
          />
        ))}
      </div>

      {answered && selectedOption && (
        <FeedbackBlock
          correct={isCorrect}
          feedback={selectedOption.feedback ?? problem.explanation}
          explanation={problem.explanation}
        />
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onAdvance}
          disabled={!answered}
          className={`rounded-xl px-5 py-2.5 font-semibold text-sm transition-all ${
            answered
              ? 'text-white bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 shadow-md'
              : 'text-stone-400 bg-stone-100 cursor-not-allowed'
          }`}
        >
          {progress.index >= progress.total ? 'Finish session' : 'Next question'}
        </button>
      </div>
    </div>
  );
}

function OptionButton({
  opt,
  index,
  selected,
  answered,
  onClick,
}: {
  opt: PracticeOption;
  index: number;
  selected: boolean;
  answered: boolean;
  onClick: () => void;
}) {
  // After answering: show emerald for the correct option, red for the
  // student's wrong pick, neutral for the rest. Before answering:
  // neutral with hover.
  const showCorrect = answered && opt.isCorrect;
  const showWrong = answered && selected && !opt.isCorrect;

  const cls = showCorrect
    ? 'border-emerald-400 bg-emerald-50 text-emerald-900'
    : showWrong
    ? 'border-red-300 bg-red-50 text-red-800'
    : selected
    ? 'border-emerald-400 bg-emerald-50 text-stone-800'
    : 'border-stone-200 bg-white hover:bg-stone-50 text-stone-800';

  const mark = showCorrect ? '\u2713' : showWrong ? '\u2717' : `${index + 1}`;
  const markCls = showCorrect
    ? 'bg-emerald-500 text-white'
    : showWrong
    ? 'bg-red-400 text-white'
    : 'bg-stone-100 text-stone-500';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={answered}
      className={`w-full rounded-xl border-2 px-4 py-3 text-left text-sm transition-all flex items-center gap-3 ${cls} ${
        answered ? 'cursor-default' : 'cursor-pointer'
      }`}
      role="radio"
      aria-checked={selected}
    >
      <span
        className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${markCls}`}
        aria-hidden
      >
        {mark}
      </span>
      <span className="font-medium">{opt.label}</span>
    </button>
  );
}

function FeedbackBlock({
  correct,
  feedback,
  explanation,
}: {
  correct: boolean;
  feedback: string;
  explanation: string;
}) {
  const showExplanation = feedback !== explanation;
  return (
    <div className="space-y-2">
      <div
        className={`rounded-xl border px-4 py-3 text-sm flex items-start gap-3 ${
          correct
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : 'bg-red-50 border-red-200 text-red-700'
        }`}
        role="status"
      >
        <span
          className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
            correct ? 'bg-emerald-500 text-white' : 'bg-red-400 text-white'
          }`}
          aria-hidden
        >
          {correct ? '\u2713' : '\u2717'}
        </span>
        <div>
          <div className="font-semibold mb-0.5">
            {correct ? 'Correct' : 'Not quite'}
          </div>
          <div className="leading-relaxed">{feedback}</div>
        </div>
      </div>
      {showExplanation && (
        <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-xs text-stone-600 leading-relaxed">
          <span className="font-semibold text-stone-700">Why: </span>
          {explanation}
        </div>
      )}
    </div>
  );
}

function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = Math.round(((current - 1) / total) * 100);
  return (
    <div className="h-1.5 rounded-full bg-stone-200 overflow-hidden">
      <div
        className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ── Scorecard ──────────────────────────────────────────────────────────

function Scorecard({
  state,
  results,
  reducedMotion,
  onPracticeAgain,
  onBack,
}: {
  state: PracticeState;
  results: SessionResult[];
  reducedMotion: boolean;
  onPracticeAgain: () => void;
  onBack: () => void;
}) {
  const correctCount = results.filter(r => r.correct).length;
  const perfect = correctCount === results.length && results.length > 0;

  // Per-concept breakdown for just the concepts that appeared this session.
  const byConcept = useMemo(() => {
    const map = new Map<PracticeConcept, { attempts: number; correct: number }>();
    for (const r of results) {
      const k = r.problem.concept;
      const cur = map.get(k) ?? { attempts: 0, correct: 0 };
      cur.attempts += 1;
      if (r.correct) cur.correct += 1;
      map.set(k, cur);
    }
    return Array.from(map.entries());
  }, [results]);

  // Weakest concept by accuracy (ties broken by attempts desc).
  const weakest = useMemo(() => {
    let worst: {
      concept: PracticeConcept;
      acc: number;
      attempts: number;
    } | null = null;
    for (const [c, s] of byConcept) {
      const acc = s.attempts === 0 ? 1 : s.correct / s.attempts;
      if (acc < 1 && (worst === null || acc < worst.acc)) {
        worst = { concept: c, acc, attempts: s.attempts };
      }
    }
    return worst;
  }, [byConcept]);

  const streak = getStreakDisplay(state);

  return (
    <div className="relative rounded-2xl border border-stone-200 shadow-sm bg-white p-6 space-y-5 overflow-hidden">
      {perfect && !reducedMotion && <Celebration />}
      <div className="flex items-start justify-between gap-3 flex-wrap relative">
        <div>
          <h2
            className="text-2xl text-stone-800"
            style={{ fontFamily: "'Patrick Hand', cursive" }}
          >
            Session complete
          </h2>
          <p className="text-sm text-stone-500 mt-0.5">
            {perfect
              ? 'Perfect score \u2014 nicely done.'
              : 'Review your answers below and keep practicing.'}
          </p>
        </div>
        <StreakPill streak={streak} />
      </div>

      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center relative">
        <div
          className="text-5xl font-bold text-emerald-800"
          style={{ fontFamily: "'Patrick Hand', cursive" }}
        >
          {correctCount} / {results.length}
        </div>
        <div className="text-xs uppercase tracking-wide text-emerald-700 mt-1">
          correct answers
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-stone-700">
          By concept this session
        </h3>
        <div className="space-y-2">
          {byConcept.map(([c, s]) => {
            const pct = Math.round((100 * s.correct) / s.attempts);
            return (
              <div
                key={c}
                className="flex items-center justify-between rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-xs"
              >
                <span className="font-semibold text-stone-700">
                  {CONCEPT_LABELS[c]}
                </span>
                <span className="text-stone-600">
                  {s.correct} / {s.attempts} ({pct}%)
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {weakest && (
        <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-800">
          <span className="font-semibold">Weakest this session: </span>
          {CONCEPT_LABELS[weakest.concept]}. You&rsquo;ll see more of those next
          time.
        </div>
      )}

      <div className="flex gap-3 flex-wrap">
        <button
          type="button"
          onClick={onPracticeAgain}
          className="flex-1 min-w-[160px] rounded-xl px-5 py-2.5 font-semibold text-white bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 shadow-md transition-all"
        >
          Practice again
        </button>
        <button
          type="button"
          onClick={onBack}
          className="rounded-xl border border-stone-300 px-5 py-2.5 font-semibold text-sm text-stone-700 hover:bg-stone-50 transition-all"
        >
          Back to experiments
        </button>
      </div>
    </div>
  );
}

// ── Celebration (CSS-only, pointer-events-none, reduced-motion safe) ───

function Celebration() {
  // Eight scattering particles; fully non-interactive so the Next button
  // click is never blocked.
  const particles = Array.from({ length: 8 });
  return (
    <>
      <style>{CELEBRATION_CSS}</style>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
      >
        {particles.map((_, i) => (
          <span
            key={i}
            className="practice-celebrate-particle"
            style={{ ['--i' as never]: i }}
          />
        ))}
      </div>
    </>
  );
}

const CELEBRATION_CSS = `
.practice-celebrate-particle {
  position: absolute;
  width: 10px;
  height: 10px;
  border-radius: 9999px;
  background: radial-gradient(circle at 30% 30%, #6ee7b7, #059669);
  opacity: 0;
  animation: practice-celebrate 1400ms ease-out forwards;
  transform-origin: center;
}
.practice-celebrate-particle:nth-child(1) { animation-delay:   0ms; --angle:   0deg; }
.practice-celebrate-particle:nth-child(2) { animation-delay:  40ms; --angle:  45deg; }
.practice-celebrate-particle:nth-child(3) { animation-delay:  80ms; --angle:  90deg; }
.practice-celebrate-particle:nth-child(4) { animation-delay: 120ms; --angle: 135deg; }
.practice-celebrate-particle:nth-child(5) { animation-delay: 160ms; --angle: 180deg; }
.practice-celebrate-particle:nth-child(6) { animation-delay: 200ms; --angle: 225deg; }
.practice-celebrate-particle:nth-child(7) { animation-delay: 240ms; --angle: 270deg; }
.practice-celebrate-particle:nth-child(8) { animation-delay: 280ms; --angle: 315deg; }
@keyframes practice-celebrate {
  0%   { transform: translate(0, 0) scale(0.6); opacity: 0; }
  15%  { opacity: 1; }
  100% { transform: rotate(var(--angle)) translate(140px) scale(1.1); opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .practice-celebrate-particle { animation: none; opacity: 0; }
}
`;

// ── Reduced-motion hook ────────────────────────────────────────────────

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });
  const mqlRef = useRef<MediaQueryList | null>(null);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    mqlRef.current = mql;
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);
  return reduced;
}
