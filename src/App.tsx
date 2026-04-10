import { useState } from 'react';
import { useGame } from './game/state';
import { HUD } from './components/HUD';
import { FieldView } from './components/FieldView';
import { LabView } from './components/LabView';
import { DataView } from './components/DataView';
import { TechTreeView } from './components/TechTreeView';
import { MarketPanel } from './components/MarketPanel';
import { Objectives } from './components/Objectives';
import { ContextualHints } from './components/ContextualHints';
import { ChallengeModal } from './challenges/components/ChallengeModal';
import { MeiosisAnimation } from './challenges/visualizations/MeiosisAnimation';

type Tab = 'field' | 'lab' | 'data' | 'tech';

const TAB_CONFIG: { id: Tab; label: string; icon: string; bg: string }[] = [
  { id: 'field', label: 'Field', icon: '\u{1F33E}', bg: 'bg-farm-field' },
  { id: 'lab', label: 'Lab', icon: '\u{1F52C}', bg: 'bg-lab-bench' },
  { id: 'data', label: 'Data', icon: '\u{1F4CA}', bg: 'bg-office' },
  { id: 'tech', label: 'Tech', icon: '\u{1F393}', bg: 'bg-chalkboard' },
];

export default function App() {
  const [tab, setTab] = useState<Tab>('field');
  const reset = useGame((s) => s.reset);
  const notices = useGame((s) => s.notices);
  const dismissNotice = useGame((s) => s.dismissNotice);
  const activeChallenge = useGame((s) => s.activeChallenge);
  const meiosisTrace = useGame((s) => s.meiosisTrace);
  const dismissMeiosis = useGame((s) => s.dismissMeiosis);
  const rawChromosomes = useGame((s) => s.map.chromosomes);
  const chromosomes = rawChromosomes.map((c) => ({ id: c.id, length: c.length }));

  const currentTab = TAB_CONFIG.find((t) => t.id === tab)!;

  return (
    <div className="min-h-screen font-game text-ink">
      {/* ── Header: Farm-style banner ── */}
      <header className="sticky top-0 z-10 border-b-2 border-soil/30 bg-gradient-to-b from-wheat to-wheat-light shadow-game">
        <div className="mx-auto max-w-7xl px-4 py-2">
          {/* Title row */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="text-3xl">
                {'\u{1F331}'}
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-soil tracking-tight leading-tight">
                  Artificial Selection
                </h1>
                <p className="text-[11px] font-semibold text-muted tracking-wide">
                  Breed &middot; Select &middot; Evolve
                </p>
              </div>
            </div>
            <button
              onClick={reset}
              className="rounded-lg border-2 border-soil/20 bg-white/60 px-3 py-1.5 text-xs font-bold text-soil hover:bg-white/90 hover:border-soil/40 transition-all shadow-sm"
            >
              New Game
            </button>
          </div>

          {/* Tab navigation */}
          <nav className="flex gap-1 -mb-[2px]">
            {TAB_CONFIG.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`relative flex items-center gap-1.5 px-4 py-2 text-sm font-bold rounded-t-xl border-2 border-b-0 transition-all ${
                  tab === t.id
                    ? 'bg-white/90 border-soil/30 text-soil -mb-[1px] pb-[9px] shadow-sm z-[1]'
                    : 'bg-soil/5 border-transparent text-muted hover:bg-white/50 hover:text-soil'
                }`}
              >
                <span className="text-lg leading-none">{t.icon}</span>
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* HUD */}
        <div className="border-t border-soil/10 bg-white/70 backdrop-blur-sm">
          <div className="mx-auto max-w-7xl px-4 py-2">
            <HUD />
          </div>
        </div>
      </header>

      {/* ── Notices ── */}
      {notices.length > 0 && (
        <div className="mx-auto max-w-7xl px-4 pt-3 space-y-2">
          {notices.map((n) => (
            <div
              key={n.id}
              className="flex items-start gap-3 rounded-xl border-2 border-accent/40 bg-gradient-to-r from-accent/10 to-accent/5 px-4 py-3 text-sm text-soil shadow-sm animate-slide-up font-semibold"
            >
              <span className="text-lg">{'\u{2B50}'}</span>
              <div className="flex-1">{n.text}</div>
              <button onClick={() => dismissNotice(n.id)} className="text-muted hover:text-soil text-lg leading-none">&times;</button>
            </div>
          ))}
        </div>
      )}

      {/* ── Main content with tab-specific background ── */}
      <main className={`min-h-[calc(100vh-180px)] ${currentTab.bg} transition-colors duration-300`}>
        <div className="mx-auto max-w-7xl p-4 grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="min-w-0">
            {tab === 'field' && (
              <div className="mb-3">
                <ContextualHints />
              </div>
            )}
            {tab === 'field' && <FieldView />}
            {tab === 'lab' && <LabView />}
            {tab === 'data' && <DataView />}
            {tab === 'tech' && <TechTreeView />}
          </div>
          <div className="lg:sticky lg:top-[180px] lg:self-start order-first lg:order-last space-y-4">
            <Objectives />
            <MarketPanel />
          </div>
        </div>
      </main>

      {activeChallenge && <ChallengeModal />}
      {meiosisTrace && (
        <MeiosisAnimation
          chromosomes={chromosomes}
          maternalCrossovers={meiosisTrace.maternalCrossovers}
          paternalCrossovers={meiosisTrace.paternalCrossovers}
          onComplete={dismissMeiosis}
        />
      )}
    </div>
  );
}
