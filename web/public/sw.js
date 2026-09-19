// Service worker minimo: solo habilita que el navegador ofrezca "instalar" la app.
// No cachea datos de la caja para evitar mostrar informacion desactualizada offline.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});
