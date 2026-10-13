// Service worker mínimo do app da rua: deixa o navegador oferecer "instalar" e abre a tela mesmo com sinal fraco.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});
