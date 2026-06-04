/* Pipiya service worker — Web Push display, click-through, and offline asset caching. */

const CACHE_NAME = 'pipiya-static-v1';

// Cache static shell assets on install so the app loads offline
const PRECACHE_URLS = ['/', '/index.html', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Evict old caches from previous SW versions
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests on our own origin
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  // API / function calls → network-only (never cache dynamic data)
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/functions/')) return;

  // Static assets (JS/CSS/images/fonts) → cache-first
  if (/\.(js|css|woff2?|png|svg|ico|webp)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(request, clone));
          }
          return res;
        });
      })
    );
    return;
  }

  // HTML navigation → stale-while-revalidate (serve cached shell, refresh in background)
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache =>
        cache.match('/index.html').then(cached => {
          const networkFetch = fetch(request).then(res => {
            if (res.ok) cache.put('/index.html', res.clone());
            return res;
          }).catch(() => cached);
          return cached || networkFetch;
        })
      )
    );
  }
});

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { body: event.data && event.data.text() }; }
  const title = data.title || 'Pipiya';
  const options = {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: data.url || data.action_url || '/' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      for (const c of clients) {
        if ('focus' in c) { c.navigate(url); return c.focus(); }
      }
      return self.clients.openWindow(url);
    })
  );
});
