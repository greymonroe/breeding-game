import {
  useState,
  useCallback,
  useContext,
  createContext,
  type ComponentType,
  type ReactNode,
} from 'react';

// ── Public types ────────────────────────────────────────────────────────

export interface ExperimentDefinition {
  id: string;
  title: string;
  subtitle: string;
  Component: ComponentType<{ onComplete: () => void }>;
}

export interface ModuleDefinition {
  id: string;
  title: string;
  subtitle: string;
  color: 'emerald' | 'cyan' | 'violet';
  backLink?: { href: string; label: string };
  experiments: ExperimentDefinition[];
  /**
   * Optional practice-mode tab. If provided, the shell renders a "Practice"
   * section below the experiments list in the sidebar; selecting it replaces
   * the main experiment pane with this ReactNode.
   *
   * Kept optional so Linkage and PopGen modules (which don't have a practice
   * tab) don't need changes. Can be injected directly on the module
   * definition OR at runtime via `<ModuleShellPracticeProvider>` \u2014 the
   * latter is how `lab.html` adds practice mode to the Mendelian module
   * without touching `MendelianModule.tsx`.
   */
  practiceMode?: ReactNode;
}

// ── Practice-mode context override ─────────────────────────────────────
//
// The Mendelian module is rendered by `MendelianModule.tsx` which this
// agent must NOT modify (a parallel agent is editing it). To inject the
// practice tab from outside (specifically from `src/curriculum/main.tsx`),
// we expose a React context: any ancestor that wraps the module in
// `<ModuleShellPracticeProvider practice={<PracticeMode />}>` gets the
// practice tab added to the sidebar. This keeps the public API additive
// and MendelianModule.tsx untouched.

const PracticeContext = createContext<ReactNode | null>(null);

export function ModuleShellPracticeProvider({
  practice,
  children,
}: {
  practice: ReactNode;
  children: ReactNode;
}) {
  return (
    <PracticeContext.Provider value={practice}>
      {children}
    </PracticeContext.Provider>
  );
}

// ── Color theme mapping ─────────────────────────────────────────────────

const THEME = {
  emerald: {
    gradient: 'from-emerald-800 to-emerald-700',
    light: 'text-emerald-200',
    active: 'bg-emerald-100 border-2 border-emerald-400 font-bold text-emerald-800',
    done: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
    button: 'bg-emerald-500',
    complete: 'bg-emerald-100 text-emerald-700',
  },
  cyan: {
    gradient: 'from-cyan-800 to-cyan-700',
    light: 'text-cyan-200',
    active: 'bg-cyan-100 border-2 border-cyan-400 font-bold text-cyan-800',
    done: 'bg-cyan-50 text-cyan-700 hover:bg-cyan-100',
    button: 'bg-cyan-500',
    complete: 'bg-cyan-100 text-cyan-700',
  },
  violet: {
    gradient: 'from-violet-800 to-violet-700',
    light: 'text-violet-200',
    active: 'bg-violet-100 border-2 border-violet-400 font-bold text-violet-800',
    done: 'bg-violet-50 text-violet-700 hover:bg-violet-100',
    button: 'bg-violet-500',
    complete: 'bg-violet-100 text-violet-700',
  },
} as const;

// ── Shell component ─────────────────────────────────────────────────────

type View = 'experiment' | 'practice';

export function ModuleShell({ module }: { module: ModuleDefinition }) {
  const [currentExp, setCurrentExp] = useState(0);
  const [completed, setCompleted] = useState<Set<number>>(() => new Set());
  const [view, setView] = useState<View>('experiment');

  const theme = THEME[module.color];
  const experiments = module.experiments;

  // Practice mode comes from either the module definition directly OR the
  // optional `ModuleShellPracticeProvider` context override. Context wins
  // when both are set so `main.tsx` can inject practice mode without
  // modifying the module file.
  const contextPractice = useContext(PracticeContext);
  const practiceMode: ReactNode = contextPractice ?? module.practiceMode ?? null;
  const hasPractice = practiceMode != null;

  const handleComplete = useCallback(() => {
    setCompleted(prev => new Set(prev).add(currentExp));
    // Auto-advance after a delay
    setTimeout(() => {
      setCurrentExp(cur => (cur < experiments.length - 1 ? cur + 1 : cur));
    }, 1000);
  }, [currentExp, experiments.length]);

  const selectExperiment = useCallback((i: number) => {
    setView('experiment');
    setCurrentExp(i);
  }, []);

  const selectPractice = useCallback(() => setView('practice'), []);

  const exp = experiments[currentExp];

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className={`bg-gradient-to-r ${theme.gradient} text-white px-6 py-4 shadow-lg`}>
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">{module.title}</h1>
            <p className={`${theme.light} text-xs mt-0.5`}>{module.subtitle}</p>
          </div>
          {module.backLink && (
            <a href={module.backLink.href} className={`${theme.light} text-xs hover:text-white underline`}>
              {module.backLink.label}
            </a>
          )}
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 flex gap-6">
        {/* Sidebar — experiment list */}
        <nav className="w-52 shrink-0 hidden md:block">
          <div className="sticky top-6 space-y-1">
            {experiments.map((e, i) => {
              const isCompleted = completed.has(i);
              const isCurrent = i === currentExp && view === 'experiment';
              const isLocked = i > 0 && !completed.has(i - 1) && !isCurrent;
              return (
                <button key={e.id}
                  onClick={() => !isLocked && selectExperiment(i)}
                  disabled={isLocked}
                  className={`w-full text-left rounded-lg px-3 py-2 text-xs transition-all ${
                    isCurrent ? theme.active :
                    isCompleted ? theme.done :
                    isLocked ? 'text-stone-300 cursor-not-allowed' :
                    'text-stone-500 hover:bg-stone-100'
                  }`}>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">
                      {isCompleted ? '\u2705' : isLocked ? '\u{1F512}' : '\u{25CB}'}
                    </span>
                    <div>
                      <div className="font-semibold">{e.title}</div>
                      <div className="text-[10px] text-stone-400">{e.subtitle}</div>
                    </div>
                  </div>
                </button>
              );
            })}

            {hasPractice && (
              <div className="pt-4 mt-4 border-t border-stone-200 space-y-1">
                <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-stone-400">
                  Practice
                </div>
                <button
                  type="button"
                  onClick={selectPractice}
                  className={`w-full text-left rounded-lg px-3 py-2 text-xs transition-all ${
                    view === 'practice'
                      ? theme.active
                      : 'text-stone-500 hover:bg-stone-100'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <circle cx="12" cy="12" r="10" />
                      <circle cx="12" cy="12" r="6" />
                      <circle cx="12" cy="12" r="2" />
                    </svg>
                    <div>
                      <div className="font-semibold">Practice Mode</div>
                      <div className="text-[10px] text-stone-400">
                        Quick drills, spaced repetition
                      </div>
                    </div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </nav>

        {/* Main content */}
        <main className="flex-1 min-w-0">
          {/* Mobile experiment selector */}
          <div className="md:hidden flex gap-1 overflow-x-auto pb-3 mb-4">
            {experiments.map((e, i) => {
              const isCompleted = completed.has(i);
              const isLocked = i > 0 && !completed.has(i - 1) && i !== currentExp;
              return (
                <button key={e.id}
                  onClick={() => !isLocked && selectExperiment(i)}
                  disabled={isLocked}
                  className={`shrink-0 rounded-lg px-3 py-1.5 text-[10px] font-bold transition-all ${
                    i === currentExp && view === 'experiment' ? `${theme.button} text-white` :
                    isCompleted ? `${theme.complete}` :
                    isLocked ? 'bg-stone-100 text-stone-300' :
                    'bg-stone-100 text-stone-500'
                  }`}>
                  {isCompleted ? '\u2705' : ''} {e.title}
                </button>
              );
            })}
            {hasPractice && (
              <button
                type="button"
                onClick={selectPractice}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-[10px] font-bold transition-all ${
                  view === 'practice'
                    ? `${theme.button} text-white`
                    : 'bg-stone-100 text-stone-500'
                }`}
              >
                Practice
              </button>
            )}
          </div>

          {view === 'practice' && hasPractice ? (
            <>{practiceMode}</>
          ) : (
            <>
              {/* Experiment card */}
              <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6">
                <div className="mb-6">
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-bold text-stone-800">{exp.title}</h2>
                    {completed.has(currentExp) && (
                      <span className={`text-xs ${theme.complete} px-2 py-0.5 rounded-full font-bold`}>
                        Complete
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-stone-500 mt-0.5">{exp.subtitle}</p>
                </div>
                <exp.Component key={exp.id} onComplete={handleComplete} />
              </div>

              {/* Progress */}
              <div className="mt-6 text-center text-xs text-stone-400">
                {completed.size} / {experiments.length} experiments completed
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
