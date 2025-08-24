/* Optimized service worker for SmartFinTools - Modular Architecture */
const CACHE_NAME = 'smartfin-cache-v6';
const CORE_ASSETS = [
  './',
  './index.html',
  './css/tailwind.build.css',
  './css/style.css',
  './js/script.js',
  './js/widget.js',
  // Essential utility modules
  './js/utils/formatters.js',
  './js/utils/charts.js',
  './js/utils/theme-manager.js',
  './js/utils/ui-helpers.js',
  './js/utils/mobile-input-helper.js',
  './js/utils/storage-manager.js',
  // Calculator modules
  './js/calculators/sip-calculator.js',
  './js/calculators/lumpsum-calculator.js',
  './js/calculators/gst-calculator.js',
  './js/calculators/emi-calculator.js',
  // Essential images
  './images/calculator.png',
  './images/icons/icon-192.png',
  './images/icons/icon-512.png',
  './manifest.webmanifest'
];

// Only cache essential external resources
const EXTERNAL_ASSETS = [
  'https://cdn.jsdelivr.net/npm/chart.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Cache core assets
      const coreCache = cache.addAll(CORE_ASSETS);
      
      // Cache only essential external assets
      const externalCache = Promise.all(
        EXTERNAL_ASSETS.map(url => 
          fetch(url).then(response => {
            if (response.ok) {
              return cache.put(url, response);
            }
          }).catch(() => {
            // Log but don't fail installation
            console.log('Failed to cache external asset:', url);
          })
        )
      );
      
      return Promise.all([coreCache, externalCache]);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => 
      Promise.all(
        keys.map((k) => {
          if (k !== CACHE_NAME) {
            console.log('Deleting old cache:', k);
            return caches.delete(k);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

// Helper: cache-first strategy (for static assets that rarely change)
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) {
    // Update cache in background (non-blocking)
    fetch(request).then(response => {
      if (response.ok) {
        caches.open(CACHE_NAME).then(cache => cache.put(request, response));
      }
    }).catch(() => {
      // Ignore background update failures
    });
    return cached;
  }
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (e) {
    return new Response('Offline', { status: 503, statusText: 'Offline' });
  }
}

// Helper: network-first strategy (for HTML navigations and critical updates)
async function networkFirst(request, { fallbackTo } = {}) {
  try {
    const fresh = await fetch(request);
    // Cache successful responses
    if (fresh.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, fresh.clone());
    }
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

// Helper: stale-while-revalidate (for JavaScript modules)
async function staleWhileRevalidate(request) {
  const cachedPromise = caches.match(request);
  const fetchPromise = (async () => {
    try {
      const response = await fetch(request);
      if (response.ok) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, response.clone());
      }
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

  // Network-first for JSON/API to get fresh data
  const accept = request.headers.get('accept') || '';
  const isJSON = accept.includes('application/json') || url.pathname.endsWith('.json') || url.pathname.startsWith('/api/');
  if (isJSON) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Cache-first for CSS files (they rarely change)
  if (url.pathname.endsWith('.css')) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Stale-while-revalidate for JavaScript modules
  if (url.pathname.includes('/js/') && url.pathname.endsWith('.js')) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // Cache-first for images and other static assets
  if (url.pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|webp)$/)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Cache-first for manifest and other app files
  if (url.pathname.endsWith('.webmanifest') || url.pathname.endsWith('.json')) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Network-first for same-origin requests (fallback to cache)
  if (url.origin === self.location.origin) {
    event.respondWith(networkFirst(request));
    return;
  }

  // For Chart.js CDN, use stale-while-revalidate
  if (url.origin === 'https://cdn.jsdelivr.net' && url.pathname.includes('chart.js')) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // For other external requests, just fetch normally (no caching)
  event.respondWith(fetch(request));
});

// Handle background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  try {
    // Perform any background sync operations here
    console.log('Background sync completed');
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// Handle push notifications (if implemented in the future)
self.addEventListener('push', (event) => {
  if (event.data) {
    try {
      const data = event.data.json();
      const options = {
        body: data.body || 'SmartFinTools Update',
        icon: './images/icons/icon-192.png',
        badge: './images/icons/icon-192.png',
        tag: 'smartfin-notification',
        data: data
      };

      event.waitUntil(
        self.registration.showNotification(data.title || 'SmartFinTools', options)
      );
    } catch (error) {
      console.error('Push notification error:', error);
    }
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow('./')
  );
});
