import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../../index.css';
import GeneRegModule from '../GeneRegModule';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GeneRegModule />
  </StrictMode>,
);
