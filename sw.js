const CACHE_NAME = 'eco-bem-cache-v2';

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(clients.claim());
});

// Network-First Strategy
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  
  // Skip caching for external requests (like Gemini API)
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    fetch(event.request).then(response => {
      const responseClone = response.clone();
      caches.open(CACHE_NAME).then(cache => {
        cache.put(event.request, responseClone);
      });
      return response;
    }).catch(() => {
      return caches.match(event.request);
    })
  );
});
