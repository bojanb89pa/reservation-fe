import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Isti tokeni i globalni stilovi kao glavna aplikacija (`data-theme` tokeni).
import '../../web/src/styles/global.css';
import { WidgetApp } from '@fe/ui';

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

createRoot(root).render(
  <StrictMode>
    <WidgetApp />
  </StrictMode>,
);
