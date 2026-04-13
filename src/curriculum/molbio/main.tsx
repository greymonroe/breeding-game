import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../../index.css';
import MolBioModule from '../MolBioModule';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MolBioModule />
  </StrictMode>,
);
