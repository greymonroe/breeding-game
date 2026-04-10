import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../index.css';
import MendelianModule from './MendelianModule';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MendelianModule />
  </StrictMode>,
);
