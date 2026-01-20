const CACHE_NAME = 'karura-trails-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/karura-trails.geojson',
  '/markers.json',
];

// Install event - cache assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(() => {
        // If some assets fail to cache, continue anyway
        return Promise.resolve();
      });
    }),
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        }),
      );
    }),
  );
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached response if available
      if (response) {
        return response;
      }

      // Otherwise, fetch from network
      return fetch(event.request)
        .then((response) => {
          // Don't cache if not a successful response
          if (
            !response ||
            response.status !== 200 ||
            response.type === 'error'
          ) {
            return response;
          }

          // Clone the response
          const responseToCache = response.clone();

          // Cache successful responses (but not CDN assets like OpenStreetMap tiles)
          if (
            event.request.url.includes('karura') ||
            event.request.url.includes('markers') ||
            event.request.url.includes('manifest')
          ) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }

          return response;
        })
        .catch(() => {
          // Return offline fallback if both cache and network fail
          return new Response('Offline - cached content not available', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({
              'Content-Type': 'text/plain',
            }),
          });
        });
    }),
  );
});

// Handle messages from clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
