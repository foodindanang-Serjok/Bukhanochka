const CACHE = 'buhanochka-v3';
const FILES = [
  './',
  './index.html',
  './game.js',
  './manifest.json',
  './cover.png',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  './disco.mp3',
  './apex_drift.mp3',
  './mirage_velocity.mp3',
  './final_lap_sprint.mp3',
  './Iceland.mp3',
  './Forest.mp3',
];

// Установка — кэшируем все файлы
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(FILES))
  );
  self.skipWaiting();
});

// Активация — удаляем старый кэш
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Запросы — сначала кэш, потом сеть
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});
