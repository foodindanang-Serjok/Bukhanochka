const CACHE = 'buhanochka-v4';
const CACHE_MUSIC = 'buhanochka-music-v4';

// Основные файлы — кэшируем сразу
const FILES_CORE = [
  './',
  './index.html',
  './game.js',
  './manifest.json',
  './cover.png',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
];

// Музыка — кэшируем отдельно в фоне
const FILES_MUSIC = [
  './disco.mp3',
  './apex_drift.mp3',
  './mirage_velocity.mp3',
  './final_lap_sprint.mp3',
  './Iceland.mp3',
  './Forest.mp3',
];

// Установка — только основные файлы блокируют install
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(FILES_CORE))
  );
  self.skipWaiting();
});

// Активация — удаляем старый кэш, потом кэшируем музыку в фоне
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE && k !== CACHE_MUSIC).map(k => caches.delete(k)))
    ).then(() => {
      // Музыку качаем в фоне после активации
      caches.open(CACHE_MUSIC).then(c => {
        FILES_MUSIC.forEach(f => {
          fetch(f).then(r => { if (r.ok) c.put(f, r); }).catch(() => {});
        });
      });
    })
  );
  self.clients.claim();
});

// Запросы — сначала кэш, потом сеть
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => {
      if (r) return r;
      return fetch(e.request).then(response => {
        // Если это музыка — сохраняем в кэш на лету
        if (FILES_MUSIC.some(f => e.request.url.includes(f.replace('./', '')))) {
          caches.open(CACHE_MUSIC).then(c => c.put(e.request, response.clone()));
        }
        return response;
      }).catch(() => {});
    })
  );
});
