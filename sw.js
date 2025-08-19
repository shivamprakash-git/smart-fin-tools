/* Enhanced service worker for SmartFinTools */
const CACHE_NAME = 'smartfin-cache-v3';
const CORE_ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/script.js',
  './js/ticker.js',
  './images/calculator.png',
  './manifest.webmanifest'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : undefined)))).then(() => self.clients.claim())
  );
});

// Helper: network-first strategy (for HTML navigations and JSON/API)
async function networkFirst(request, { fallbackTo } = {}) {
  try {
    const fresh = await fetch(request);
    // Optionally cache same-origin successful responses
    try {
      const url = new URL(request.url);
      if (fresh.ok && url.origin === self.location.origin) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, fresh.clone());
      }
    } catch {}
    return fresh;
  } catch (e) {
    if (fallbackTo) {
      const cached = await caches.match(fallbackTo);
      if (cached) return cached;
    }
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response('Offline', { status: 503, statusText: 'Offline' });
  }
}

// Helper: stale-while-revalidate (for static assets: css/js/img)
async function staleWhileRevalidate(request) {
  const cachedPromise = caches.match(request);
  const fetchPromise = (async () => {
    try {
      const response = await fetch(request);
      try {
        const url = new URL(request.url);
        if (response.ok && url.origin === self.location.origin) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, response.clone());
        }
      } catch {}
      return response;
    } catch (e) {
      return undefined;
    }
  })();

  const cached = await cachedPromise;
  return cached || (await fetchPromise) || new Response('Offline', { status: 503, statusText: 'Offline' });
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return; // only cache GET

  const url = new URL(request.url);

  // Always network-first for navigations (HTML) to pick up latest app quickly
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, { fallbackTo: './index.html' }));
    return;
  }

  // Network-first for JSON/API to get fresh data (fallback to cache if offline)
  const accept = request.headers.get('accept') || '';
  const isJSON = accept.includes('application/json') || url.pathname.endsWith('.json') || url.pathname.startsWith('/api/');
  if (isJSON) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Network-first for same-origin static assets (prefer fresh; fallback to cache when offline)
  if (url.origin === self.location.origin) {
    event.respondWith(networkFirst(request));
    return;
  }

  // For cross-origin, just fetch normally (no SW caching)
  event.respondWith(fetch(request));
});
