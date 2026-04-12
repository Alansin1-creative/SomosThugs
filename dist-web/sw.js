/* eslint-disable no-restricted-globals */
self.addEventListener('push', (event) => {
  let payload = { title: 'Somos Thugs', body: '', data: {}, url: '/' };
  try {
    const t = event.data && typeof event.data.text === 'function' ? event.data.text() : '';
    if (t) payload = { ...payload, ...JSON.parse(t) };
  } catch (_) {

  }
  const title = String(payload.title || 'Somos Thugs');
  const options = {
    body: String(payload.body || ''),
    data: payload.data && typeof payload.data === 'object' ? payload.data : {},
    icon: typeof payload.icon === 'string' ? payload.icon : undefined,
    badge: typeof payload.badge === 'string' ? payload.badge : undefined,
    tag: typeof payload.tag === 'string' ? payload.tag : 'somos-thugs',
    renotify: true,
    requireInteraction: false,
    silent: false
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification && event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const c of clientList) {
        if (c.url && 'focus' in c) return c.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
      return undefined;
    })
  );
});
