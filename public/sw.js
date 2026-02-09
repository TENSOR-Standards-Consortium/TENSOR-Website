const CACHE_NAME = 'tensor-pwa-v9';
const PRECACHE_URLS = [
  '/',
  '/offline/',
  '/about/',
  '/docs/',
  '/metrics/',
  '/ai-reliability/',
  '/extensions/',
  '/graphs/',
  '/schemas/',
  '/studio/',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/assets/data/tensor-core.json',
  '/assets/data/core.schema.json',
  '/assets/js/app-init.js',
  '/assets/img/logo-tensor-icon.png',
  '/assets/img/logo-tensor-framework.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((cacheName) => cacheName !== CACHE_NAME)
            .map((cacheName) => caches.delete(cacheName))
        )
      )
      .then(() => self.clients.claim())
  );
});

function shouldCacheResponse(response) {
  if (!response || !response.ok) {
    return false;
  }

  const cacheControl = String(response.headers.get('cache-control') || '').toLowerCase();
  return !cacheControl.includes('no-store');
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) {
    return cached;
  }

  const response = await fetch(request);
  if (shouldCacheResponse(response)) {
    cache.put(request, response.clone());
  }
  return response;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  const networkPromise = fetch(request)
    .then((response) => {
      if (shouldCacheResponse(response)) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  return cached || networkPromise || Response.error();
}

async function networkFirstNavigation(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (shouldCacheResponse(response)) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cachedMatch = await cache.match(request);
    if (cachedMatch) {
      return cachedMatch;
    }
    const offline = await cache.match('/offline/');
    if (offline) {
      return offline;
    }
    return new Response('Offline', {
      status: 503,
      statusText: 'Offline',
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (shouldCacheResponse(response)) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cachedMatch = await cache.match(request);
    if (cachedMatch) {
      return cachedMatch;
    }
    return Response.error();
  }
}

async function networkOnly(request) {
  try {
    return await fetch(request);
  } catch {
    return Response.error();
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkOnly(request));
    return;
  }

  if (url.pathname === '/assets/releases/manifest.json') {
    event.respondWith(networkFirst(request));
    return;
  }

  if (url.pathname.startsWith('/assets/data/')) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  if (url.pathname.startsWith('/assets/releases/')) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  if (url.pathname.startsWith('/assets/img/')) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (url.pathname.startsWith('/_astro/')) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  event.respondWith(staleWhileRevalidate(request));
});
