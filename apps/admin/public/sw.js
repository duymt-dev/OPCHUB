/* Push only: deliberately no fetch listener and no offline cache. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('push', (event) => {
  event.waitUntil(
    (async () => {
      let data;
      try {
        data = event.data?.json();
      } catch {
        return;
      }
      if (
        !data ||
        typeof data.title !== 'string' ||
        typeof data.body !== 'string' ||
        typeof data.tag !== 'string'
      )
        return;
      const link = safeLink(data.link);
      await self.registration.showNotification(data.title.slice(0, 60), {
        body: data.body.slice(0, 120),
        tag: data.tag,
        icon: new URL('opchub-logo.png', self.registration.scope).pathname,
        badge: new URL('opchub-logo.png', self.registration.scope).pathname,
        data: { link },
      });
    })(),
  );
});
function safeLink(value) {
  try {
    if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//'))
      return '/dashboard';
    const decoded = decodeURIComponent(value);
    if (/[\\\s\u0000-\u001f]/.test(decoded)) return '/dashboard';
    const url = new URL(decoded, self.location.origin);
    return url.origin === self.location.origin
      ? url.pathname + url.search + url.hash
      : '/dashboard';
  } catch {
    return '/dashboard';
  }
}
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const link = safeLink(event.notification.data?.link);
      const target = new URL(link, self.location.origin).href;
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const existing = windows.find((client) => client.url === target);
      if (existing) {
        await existing.focus();
        return;
      }
      await self.clients.openWindow(target);
    })(),
  );
});
