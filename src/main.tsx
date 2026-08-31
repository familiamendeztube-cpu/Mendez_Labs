import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { runIntegrityChecks } from '@/utils/integrity';
import { getThemeById, applyThemeToDOM, loadThemeId } from '@/lib/themes';
import './index.css';

applyThemeToDOM(getThemeById(loadThemeId()));

// Run dev-only integrity checks. These NEVER crash the app — failures are
// collected and reported via console.error. The app always mounts.
const integrityResult = runIntegrityChecks();
if (integrityResult.failures.length > 0) {
  // Expose for a dev diagnostics banner if needed
  (window as unknown as { __M1_INTEGRITY__?: string[] }).__M1_INTEGRITY__ = integrityResult.failures;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
