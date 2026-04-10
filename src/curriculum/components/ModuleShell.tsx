import { useState, useCallback, type ComponentType } from 'react';

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
  color: 'emerald' | 'sky' | 'violet';
  backLink?: { href: string; label: string };
  experiments: ExperimentDefinition[];
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
  sky: {
    gradient: 'from-sky-800 to-sky-700',
    light: 'text-sky-200',
    active: 'bg-sky-100 border-2 border-sky-400 font-bold text-sky-800',
    done: 'bg-sky-50 text-sky-700 hover:bg-sky-100',
    button: 'bg-sky-500',
    complete: 'bg-sky-100 text-sky-700',
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

export function ModuleShell({ module }: { module: ModuleDefinition }) {
  const [currentExp, setCurrentExp] = useState(0);
  const [completed, setCompleted] = useState<Set<number>>(() => new Set());

  const theme = THEME[module.color];
  const experiments = module.experiments;

  const handleComplete = useCallback(() => {
    setCompleted(prev => new Set(prev).add(currentExp));
    // Auto-advance after a delay
    setTimeout(() => {
      setCurrentExp(cur => (cur < experiments.length - 1 ? cur + 1 : cur));
    }, 1000);
  }, [currentExp, experiments.length]);

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
              const isCurrent = i === currentExp;
              const isLocked = i > 0 && !completed.has(i - 1) && !isCurrent;
              return (
                <button key={e.id}
                  onClick={() => !isLocked && setCurrentExp(i)}
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
                  onClick={() => !isLocked && setCurrentExp(i)}
                  disabled={isLocked}
                  className={`shrink-0 rounded-lg px-3 py-1.5 text-[10px] font-bold transition-all ${
                    i === currentExp ? `${theme.button} text-white` :
                    isCompleted ? `${theme.complete}` :
                    isLocked ? 'bg-stone-100 text-stone-300' :
                    'bg-stone-100 text-stone-500'
                  }`}>
                  {isCompleted ? '\u2705' : ''} {e.title}
                </button>
              );
            })}
          </div>

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
        </main>
      </div>
    </div>
  );
}
