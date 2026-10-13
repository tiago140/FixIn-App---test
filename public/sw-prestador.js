// Service worker do portal do prestador: recebe a notificação e abre a ordem (ou o PDF dela) ao tocar.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});

self.addEventListener('push', (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch (e) { d = { titulo: 'FixIn', corpo: event.data ? event.data.text() : '' }; }
  event.waitUntil(self.registration.showNotification(d.titulo || 'FixIn Reformas', {
    body: d.corpo || '',
    icon: '/icons/foto-192.png',
    badge: '/icons/foto-192.png',
    data: { url: d.url || '/prestador/dashboard' },
    tag: d.url || 'fixin',
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/prestador/dashboard';
  event.waitUntil((async () => {
    const abertas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of abertas) { if ('focus' in c) { await c.focus(); if ('navigate' in c) { try { await c.navigate(url); } catch (e) {} } return; } }
    await self.clients.openWindow(url);
  })());
});
