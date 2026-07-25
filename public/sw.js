// PWA Service Worker — 离线缓存
const CACHE = 'laobangdai-v1';

// 需要缓存的关键资源
const PRECACHE = [
  '/',
  '/upload',
  '/login',
  '/styles/main.css',
  '/scripts/main.js',
  '/scripts/particles.js',
  '/scripts/sound.js',
  '/manifest.json'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
});

self.addEventListener('fetch', (e) => {
  // 只缓存 GET 请求
  if (e.request.method !== 'GET') return;

  // 不缓存上传文件
  if (e.request.url.includes('/uploads/')) return;

  e.respondWith(
    caches.match(e.request).then((cached) => {
      // 有缓存直接返回，同时后台更新
      if (cached) {
        fetch(e.request).then((res) => {
          if (res.ok) {
            caches.open(CACHE).then((cache) => cache.put(e.request, res));
          }
        });
        return cached;
      }
      // 没缓存就请求并缓存
      return fetch(e.request).then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then((cache) => cache.put(e.request, clone));
        }
        return res;
      });
    })
  );
});
