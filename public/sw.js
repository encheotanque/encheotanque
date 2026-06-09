// Service Worker for Enche o Tanque PWA
const CACHE_NAME = 'enche-tanque-v1.9.0';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/Logo_maker_project.png'
];

self.addEventListener('install', (event) => {
  console.log('[SW] Installing version:', CACHE_NAME);
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching assets');
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip caching for non-http, chrome extensions, etc.
  if (!event.request.url.startsWith('http')) return;

  // Network First Strategy
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Only cache valid successful GET requests for resources
        if (response && response.status === 200 && event.request.method === 'GET' && !url.pathname.includes('/api/')) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // If network fails, try cache
        return caches.match(event.request);
      })
  );
});
