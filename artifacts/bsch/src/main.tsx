import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// ── PWA Service Worker registration ──────────────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');

      // Detect when a new service worker is waiting (app was updated)
      const handleWaiting = (waiting: ServiceWorker) => {
        // Dispatch a custom event so the app can show an update toast
        window.dispatchEvent(
          new CustomEvent('sw-update-available', { detail: { waiting } })
        );
      };

      if (registration.waiting) {
        handleWaiting(registration.waiting);
      }

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            handleWaiting(newWorker);
          }
        });
      });

      // When the SW updates and takes control, reload for fresh assets
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    } catch {
      // SW registration is best-effort; silently continue
    }
  });
}

createRoot(document.getElementById('root')!).render(<App />);
