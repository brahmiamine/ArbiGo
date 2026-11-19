/* Cache only the public app shell and immutable assets. Account data lives in account-scoped IndexedDB. */
const CACHE = 'arbigo-shell-v1';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) =>
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys())
        if (key.startsWith('arbigo-shell-') && key !== CACHE) await caches.delete(key);
      await self.clients.claim();
    })(),
  ),
);
self.addEventListener('fetch', (event) => {
  const request = event.request,
    url = new URL(request.url);
  if (
    request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith('/api/')
  )
    return;
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/debrief/') ||
    url.pathname.startsWith('/quiz/') ||
    url.pathname === '/icon.svg'
  ) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE),
          hit = await cache.match(request);
        if (hit) return hit;
        const response = await fetch(request);
        if (response.status === 200) await cache.put(request, response.clone());
        return response;
      })(),
    );
    return;
  }
  if (request.mode === 'navigate' && ['/app', '/demo'].includes(url.pathname))
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        try {
          const response = await fetch(request);
          if (response.ok) await cache.put(url.pathname, response.clone());
          return response;
        } catch {
          return (
            (await cache.match(url.pathname)) ??
            new Response('Ouvrez ArbiGo une première fois avec une connexion.', {
              status: 503,
              headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            })
          );
        }
      })(),
    );
});
self.addEventListener('push', (event) => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const focused = clients.find(
        (c) => c.visibilityState === 'visible' && new URL(c.url).pathname === '/app',
      );
      if (focused) {
        focused.postMessage({ type: 'PUSH_ALERT', ...data });
        return;
      }
      await self.registration.showNotification(data.title ?? 'ArbiGo', {
        body: data.body,
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        tag: data.tag ?? 'arbigo',
        data: { url: '/app' },
        renotify: false,
      });
    })(),
  );
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const existing = clients.find((c) => new URL(c.url).pathname === '/app');
      if (existing) return existing.focus();
      return self.clients.openWindow('/app');
    })(),
  );
});
