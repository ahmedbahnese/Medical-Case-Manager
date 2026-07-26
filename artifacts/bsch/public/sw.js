// ============================================================
// BSCH Service Worker — PWA Support
// Strategies:
//   - API calls (/api/*): Network-only (always fresh)
//   - Navigation (HTML): Network-first → cache → offline.html
//   - Static assets:     Cache-first → network (auto-cache on fetch)
// ============================================================

const CACHE_VERSION = 'v3';
const CACHE_NAME = `bsch-${CACHE_VERSION}`;

// App shell — cached on install for instant offline startup
const APP_SHELL = [
  '/',
  '/manifest.json',
  '/favicon.svg',
  '/offline.html',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// ── Install ───────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // addAll fails silently per-item so one 404 doesn't break the install
      Promise.allSettled(APP_SHELL.map((url) => cache.add(url)))
    )
  );
  // Activate immediately; don't wait for old tab to close
  self.skipWaiting();
});

// ── Activate ──────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('bsch-') && key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignore non-GET and non-http(s) requests (chrome-extension://, etc.)
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) return;

  // ── API: always go to network ──────────────────────────────────────────────
  if (url.pathname.startsWith('/api/')) return;

  // ── Navigation (SPA): network-first, fall back to cached '/', then offline ─
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((c) => c.put(request, clone));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match('/') || await caches.match('/offline.html');
          return cached || new Response('<h1>غير متصل</h1>', {
            status: 503,
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
          });
        })
    );
    return;
  }

  // ── Static assets: cache-first ─────────────────────────────────────────────
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request).then((response) => {
        // Only cache successful same-origin or CORS responses
        if (
          response.ok &&
          (response.type === 'basic' || response.type === 'cors')
        ) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((c) => c.put(request, clone));
        }
        return response;
      }).catch(() =>
        new Response('', { status: 503, statusText: 'Service Unavailable' })
      );
    })
  );
});

// ── Push Notifications (infrastructure ready) ─────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data = {};
  try { data = event.data.json(); } catch { data = { body: event.data.text() }; }

  const options = {
    body: data.body || 'إشعار جديد من نظام BSCH',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-32.png',
    tag: data.tag || 'bsch-notification',
    renotify: !!data.tag,
    dir: 'rtl',
    lang: 'ar',
    vibrate: [200, 100, 200],
    data: { url: data.url || '/dashboard' },
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'BSCH — إشعار', options)
  );
});

// ── Notification click ────────────────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/dashboard';

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Focus existing open window if possible
        for (const client of clientList) {
          if ('focus' in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        return clients.openWindow(targetUrl);
      })
  );
});

// ── Message handler (for SW update flow) ─────────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
