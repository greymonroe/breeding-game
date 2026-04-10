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
  const [sidePanel, setSidePanel] = useState<'quests' | 'market' | null>(null);
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
      {/* ── Header ── */}
      <header className="sticky top-0 z-10 border-b-2 border-soil/30 bg-gradient-to-b from-wheat to-wheat-light shadow-game">
        <div className="mx-auto max-w-7xl px-3 sm:px-4 py-1.5 sm:py-2">
          {/* Title row — compact on mobile */}
          <div className="flex items-center justify-between mb-1.5 sm:mb-2">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="text-2xl sm:text-3xl">{'\u{1F331}'}</div>
              <div>
                <h1 className="text-base sm:text-xl font-extrabold text-soil tracking-tight leading-tight">
                  Artificial Selection
                </h1>
                <p className="text-[9px] sm:text-[11px] font-semibold text-muted tracking-wide hidden sm:block">
                  Breed &middot; Select &middot; Evolve
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Mobile-only side panel toggles */}
              <div className="flex gap-1 lg:hidden">
                <button
                  onClick={() => setSidePanel(sidePanel === 'quests' ? null : 'quests')}
                  className={`rounded-lg px-2 py-1.5 text-xs font-bold transition-all ${
                    sidePanel === 'quests'
                      ? 'bg-accent text-white shadow-sm'
                      : 'border border-soil/20 bg-white/60 text-soil'
                  }`}
                >
                  {'\u{1F4CC}'} <span className="hidden sm:inline">Quests</span>
                </button>
                <button
                  onClick={() => setSidePanel(sidePanel === 'market' ? null : 'market')}
                  className={`rounded-lg px-2 py-1.5 text-xs font-bold transition-all ${
                    sidePanel === 'market'
                      ? 'bg-accent text-white shadow-sm'
                      : 'border border-soil/20 bg-white/60 text-soil'
                  }`}
                >
                  {'\u{1F4F0}'} <span className="hidden sm:inline">Market</span>
                </button>
              </div>
              <button
                onClick={reset}
                className="rounded-lg border-2 border-soil/20 bg-white/60 px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-bold text-soil hover:bg-white/90 transition-all shadow-sm"
              >
                New Game
              </button>
            </div>
          </div>

          {/* Tab navigation */}
          <nav className="flex gap-0.5 sm:gap-1 -mb-[2px]">
            {TAB_CONFIG.map((t) => (
              <button
                key={t.id}
                onClick={() => { setTab(t.id); setSidePanel(null); }}
                className={`relative flex items-center justify-center gap-1 sm:gap-1.5 flex-1 sm:flex-initial px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-bold rounded-t-xl border-2 border-b-0 transition-all ${
                  tab === t.id
                    ? 'bg-white/90 border-soil/30 text-soil -mb-[1px] pb-[7px] sm:pb-[9px] shadow-sm z-[1]'
                    : 'bg-soil/5 border-transparent text-muted hover:bg-white/50 hover:text-soil'
                }`}
              >
                <span className="text-base sm:text-lg leading-none">{t.icon}</span>
                <span className="text-[10px] sm:text-sm">{t.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* HUD */}
        <div className="border-t border-soil/10 bg-white/70 backdrop-blur-sm">
          <div className="mx-auto max-w-7xl px-3 sm:px-4 py-1.5 sm:py-2">
            <HUD />
          </div>
        </div>
      </header>

      {/* ── Mobile side panel overlay ── */}
      {sidePanel && (
        <div className="lg:hidden fixed inset-0 z-20 flex" onClick={() => setSidePanel(null)}>
          <div className="absolute inset-0 bg-black/30" />
          <div
            className="relative ml-auto w-[85vw] max-w-[360px] bg-surface overflow-y-auto shadow-game-lg animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-wheat/95 border-b border-soil/20 px-3 py-2 flex items-center justify-between z-10">
              <span className="font-extrabold text-soil text-sm">
                {sidePanel === 'quests' ? '\u{1F4CC} Quest Board' : '\u{1F4F0} Market'}
              </span>
              <button
                onClick={() => setSidePanel(null)}
                className="rounded-lg bg-soil/10 px-2 py-1 text-xs font-bold text-soil"
              >
                &times; Close
              </button>
            </div>
            <div className="p-3 space-y-4">
              {sidePanel === 'quests' && <Objectives />}
              {sidePanel === 'market' && <MarketPanel />}
            </div>
          </div>
        </div>
      )}

      {/* ── Notices ── */}
      {notices.length > 0 && (
        <div className="mx-auto max-w-7xl px-3 sm:px-4 pt-2 sm:pt-3 space-y-2">
          {notices.map((n) => (
            <div
              key={n.id}
              className="flex items-start gap-2 sm:gap-3 rounded-xl border-2 border-accent/40 bg-gradient-to-r from-accent/10 to-accent/5 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-soil shadow-sm animate-slide-up font-semibold"
            >
              <span className="text-base sm:text-lg">{'\u{2B50}'}</span>
              <div className="flex-1">{n.text}</div>
              <button onClick={() => dismissNotice(n.id)} className="text-muted hover:text-soil text-lg leading-none">&times;</button>
            </div>
          ))}
        </div>
      )}

      {/* ── Main content ── */}
      <main className={`min-h-[calc(100vh-140px)] sm:min-h-[calc(100vh-180px)] ${currentTab.bg} transition-colors duration-300`}>
        <div className="mx-auto max-w-7xl p-2 sm:p-4 grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="min-w-0">
            {tab === 'field' && (
              <div className="mb-2 sm:mb-3">
                <ContextualHints />
              </div>
            )}
            {tab === 'field' && <FieldView />}
            {tab === 'lab' && <LabView />}
            {tab === 'data' && <DataView />}
            {tab === 'tech' && <TechTreeView />}
          </div>
          {/* Desktop sidebar — hidden on mobile (use overlay instead) */}
          <div className="hidden lg:block lg:sticky lg:top-[180px] lg:self-start space-y-4">
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
