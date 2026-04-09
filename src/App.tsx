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

type Tab = 'field' | 'lab' | 'data' | 'tech';

export default function App() {
  const [tab, setTab] = useState<Tab>('field');
  const reset = useGame((s) => s.reset);
  const notices = useGame((s) => s.notices);
  const dismissNotice = useGame((s) => s.dismissNotice);
  const activeChallenge = useGame((s) => s.activeChallenge);

  return (
    <div className="min-h-screen bg-surface text-ink">
      <header className="sticky top-0 z-10 border-b border-soil/20 bg-wheat/95 backdrop-blur px-4 py-3">
        <div className="mx-auto max-w-5xl flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-semibold text-soil">Artificial Selection</h1>
            <p className="text-xs text-muted">Breed. Select. Evolve.</p>
          </div>
          <button
            onClick={reset}
            className="rounded-lg border border-soil/30 px-3 py-1.5 text-xs text-soil hover:bg-soil/5"
          >
            New game
          </button>
        </div>
        <nav className="mx-auto max-w-5xl mb-3 grid grid-cols-4 rounded-lg border border-soil/20 bg-white overflow-hidden">
          {(['field', 'lab', 'data', 'tech'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`py-2 text-sm font-semibold capitalize transition-colors ${
                tab === t ? 'bg-accent text-white' : 'text-muted hover:bg-soil/5'
              }`}
            >
              {t === 'field' ? '🌱 Field' : t === 'lab' ? '🧪 Lab' : t === 'data' ? '📊 Data' : '🌳 Tech'}
            </button>
          ))}
        </nav>
        <div className="mx-auto max-w-5xl">
          <HUD />
        </div>
      </header>

      {notices.length > 0 && (
        <div className="mx-auto max-w-5xl px-4 pt-3 space-y-2">
          {notices.map((n) => (
            <div
              key={n.id}
              className="flex items-start gap-2 rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-xs text-soil"
            >
              <div className="flex-1">{n.text}</div>
              <button onClick={() => dismissNotice(n.id)} className="text-muted hover:text-soil">×</button>
            </div>
          ))}
        </div>
      )}

      <main className="mx-auto max-w-7xl p-4 grid gap-4 lg:grid-cols-[1fr_300px]">
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
      </main>

      {activeChallenge && <ChallengeModal />}
    </div>
  );
}
