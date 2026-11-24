// Steady — Service Worker
// Навигация (index.html) — Network-First: при онлайне всегда свежая версия,
// оффлайн — из кэша. Остальные ресурсы — Cache-First для 100% оффлайна.
// Обновите CACHE_VERSION при изменении ресурсов, чтобы инвалидировать кэш.

const CACHE_VERSION = 'steady-v9';
const CACHE_NAME = `${CACHE_VERSION}`;

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
      .then(() => {
        // Перезагружаем открытые вкладки, чтобы они сразу получили новую версию.
        return self.clients.matchAll({ type: 'window' }).then((clients) => {
          clients.forEach((client) => {
            try { client.navigate(client.url); } catch (e) {}
          });
        });
      })
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  // Навигация: Network-First (всегда свежий index.html), оффлайн — кэш.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match('./index.html'))
        )
    );
    return;
  }

  // Остальное: Cache-First.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => new Response('Offline', { status: 503, statusText: 'Offline' }));
    })
  );
});
