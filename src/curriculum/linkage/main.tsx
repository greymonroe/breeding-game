import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../../index.css';
import LinkageModule from '../LinkageModule';

createRoot(document.getElementById('root')!).render(
  <StrictMode><LinkageModule /></StrictMode>,
);
