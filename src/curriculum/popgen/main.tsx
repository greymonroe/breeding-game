import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../../index.css';
import PopGenModule from '../PopGenModule';
import { ModuleShellPracticeProvider } from '../components';
import { PracticeMode } from '../practice';
import {
  popgenGenerateProblemForConcept,
  POPGEN_ALL_CONCEPTS,
  POPGEN_CONCEPT_LABELS,
} from '../practice/popgen-problems';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ModuleShellPracticeProvider
      practice={
        <PracticeMode
          generateProblemForConcept={popgenGenerateProblemForConcept}
          allConcepts={POPGEN_ALL_CONCEPTS}
          conceptLabels={POPGEN_CONCEPT_LABELS}
          storageKey="popgen-practice-v1"
          themeColor="violet"
        />
      }
    >
      <PopGenModule />
    </ModuleShellPracticeProvider>
  </StrictMode>,
);
