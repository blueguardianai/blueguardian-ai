// Service worker for the website build.
// 1. Serves the students' photos (stored in the "photos" cache) at userdata/<name>.
// 2. Keeps the app, including the AI model, available offline after the first visit.
const SHELL = 'shell-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k !== SHELL && k !== 'photos') await caches.delete(k);
  await self.clients.claim();
})()));

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return; // map tiles go straight to the network
  if (url.pathname.includes('/userdata/')) {
    e.respondWith(caches.open('photos').then(c => c.match(url.href)).then(r => r ?? new Response('', { status: 404 })));
    return;
  }
  // Network first so updates arrive; cache as the offline fallback. The model never changes, so cache first.
  e.respondWith((async () => {
    const cache = await caches.open(SHELL);
    const cached = await cache.match(e.request, { ignoreSearch: true }); // ?v= changes every deploy
    if (cached && url.pathname.endsWith('.onnx')) return cached;
    try {
      const res = await fetch(e.request);
      if (res.ok) cache.put(url.origin + url.pathname, res.clone());
      return res;
    } catch (err) {
      if (cached) return cached;
      throw err;
    }
  })());
});
