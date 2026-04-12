import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../../index.css';
import LinkageModule from '../LinkageModule';
import { ModuleShellPracticeProvider } from '../components';
import { PracticeMode } from '../practice';
import {
  linkageGenerateProblemForConcept,
  LINKAGE_ALL_CONCEPTS,
  LINKAGE_CONCEPT_LABELS,
} from '../practice/linkage-problems';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ModuleShellPracticeProvider
      practice={
        <PracticeMode
          generateProblemForConcept={linkageGenerateProblemForConcept}
          allConcepts={LINKAGE_ALL_CONCEPTS}
          conceptLabels={LINKAGE_CONCEPT_LABELS}
          storageKey="linkage-practice-v1"
          themeColor="cyan"
        />
      }
    >
      <LinkageModule />
    </ModuleShellPracticeProvider>
  </StrictMode>,
);
