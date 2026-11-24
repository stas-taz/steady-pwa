// Steady — Service Worker
// Стратегии:
//   • Навигация (index.html) — Network-First: при онлайне всегда свежая версия, оффлайн — кэш.
//   • Ресурсы (иконки, ассеты, манифест) — Stale-While-Revalidate: мгновенно из кэша,
//     свежая версия подтягивается в фоне. Поэтому CACHE_VERSION больше НЕ нужно
//     поднимать вручную при каждом деплое — обновления приходят сами.
// CACHE_VERSION используется только для очистки старых кэшей.

const CACHE_VERSION = 'steady-v16';
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

  // Ресурсы: Stale-While-Revalidate (мгновенно из кэша + фоновое обновление).
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached || new Response('Offline', { status: 503, statusText: 'Offline' }));

      return cached || network;
    })
  );
});
