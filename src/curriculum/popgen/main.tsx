import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../../index.css';
import PopGenModule from '../PopGenModule';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PopGenModule />
  </StrictMode>,
);
