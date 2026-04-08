// ══════════════════════════════════════════
// WHV Australia Hub — Service Worker
// Version: 1.0.0
// ══════════════════════════════════════════

const CACHE_NAME = 'whv-hub-v1';

// 快取這些核心資源（離線時也能用）
const CORE_ASSETS = [
  './whv-hub.html',
  './manifest.json'
];

// 外部字體 / CDN — 有網路才快取，沒網路用備用
const EXTERNAL_ORIGINS = [
  'fonts.googleapis.com',
  'fonts.gstatic.com'
];

// ══════════════════════════════════════════
// INSTALL — 快取核心檔案
// ══════════════════════════════════════════
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Caching core assets');
      return cache.addAll(CORE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// ══════════════════════════════════════════
// ACTIVATE — 清掉舊版快取
// ══════════════════════════════════════════
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      )
    ).then(() => self.clients.claim())
  );
});

// ══════════════════════════════════════════
// FETCH — 快取優先策略（Cache First）
// 核心 HTML/JS：離線可用
// 外部字體：網路優先，fallback 快取
// ══════════════════════════════════════════
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // 外部 CDN / Google Fonts：Network First
  if (EXTERNAL_ORIGINS.some(origin => url.hostname.includes(origin))) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // 本地資源：Cache First，沒有再去 network
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(response => {
        // 只快取成功的 GET 請求
        if (!response || response.status !== 200 || event.request.method !== 'GET') {
          return response;
        }
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      });
    })
  );
});
