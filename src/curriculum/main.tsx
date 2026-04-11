import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../index.css';
import MendelianModule from './MendelianModule';
import { ModuleShellPracticeProvider } from './components';
import { PracticeMode } from './practice';

// Practice mode is injected into the Mendelian ModuleShell via context so
// that MendelianModule.tsx (owned by a parallel agent\u2019s scope) does
// not need to be modified. See ModuleShell.tsx for the context wiring.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ModuleShellPracticeProvider practice={<PracticeMode />}>
      <MendelianModule />
    </ModuleShellPracticeProvider>
  </StrictMode>,
);
