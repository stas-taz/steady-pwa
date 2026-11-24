// Steady — Service Worker (Cache-First)
// Обеспечивает 100% оффлайн-работу после первого открытия.
// Обновите CACHE_VERSION при изменении ресурсов, чтобы инвалидировать кэш.

const CACHE_VERSION = 'steady-v3';
const CACHE_NAME = `${CACHE_VERSION}`;

// Статические ресурсы, которые кэшируются при установке.
// Кэшируем и корень (./), и явный index.html, чтобы PWA гарантированно
// открывалась оффлайн и по /, и по /index.html на GitHub Pages.
const PRECACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './assets/icon_1.png',
  './assets/icon_2.png',
  './assets/icon_3.png',
  './assets/icon_4.png',
  './assets/icon_5.png',
  './assets/icon_6.png',
  './assets/icon_7.png',
  './assets/icon_8.png',
  './assets/icon_9.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  // Cache-First: отдаём из кэша, если есть; иначе идём в сеть и кэшируем ответ.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request)
        .then((response) => {
          // Кэшируем только успешные ответы с того же origin (избегаем CORS-мусора).
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => {
          // Оффлайн и нет в кэше: для навигаций отдаём index.html.
          if (request.mode === 'navigate') {
            return caches.match('./index.html');
          }
          return new Response('Offline', { status: 503, statusText: 'Offline' });
        });
    })
  );
});
