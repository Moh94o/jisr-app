// Service Worker disabled - self-destruct to clear old caches
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
  );
  self.clients.claim();
  // Unregister self
  self.registration.unregister();
});
