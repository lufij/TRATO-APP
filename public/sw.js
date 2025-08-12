// Minimal no-op Service Worker to avoid caching or reviving legacy assets
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Claim clients and clear any existing caches from previous SWs
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});
// Do not intercept fetch; let the network handle everything
self.addEventListener('fetch', () => {});