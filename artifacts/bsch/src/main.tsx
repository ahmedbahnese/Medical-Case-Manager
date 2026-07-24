import { createRoot } from 'react-dom/client';

import App from './App';

import './index.css';

// Register PWA service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // SW registration is best-effort; ignore errors silently
    });
  });
}

createRoot(document.getElementById('root')!).render(<App />);
