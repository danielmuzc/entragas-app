/* Service worker: deja la app abrir sin conexión. La API de Apps Script nunca se guarda en caché. */
const V = 'entregas-v1'; // súbelo (v2, v3...) si quieres forzar que todos los celulares descarguen una versión nueva
const NUCLEO = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];
const EXTERNOS = [
  'https://cdn.tailwindcss.com/3.4.17',
  'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@600;700&family=DM+Sans:wght@400;500;700&display=swap'
];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(V);
    await c.addAll(NUCLEO);
    // Recursos de otros sitios: respuesta opaca, se guarda "a mano" y sin que su fallo detenga la instalación
    await Promise.all(EXTERNOS.map(u => fetch(new Request(u, { mode: 'no-cors' })).then(r => c.put(u, r)).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

// Estrategia: responde con lo guardado y actualiza en segundo plano (las novedades se ven en la siguiente apertura)
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.hostname === 'script.google.com' || u.hostname.endsWith('.googleusercontent.com')) return;
  const red = fetch(e.request).then(r => {
    if (r.ok || r.type === 'opaque') { const copia = r.clone(); caches.open(V).then(c => c.put(e.request, copia)); }
    return r;
  });
  e.respondWith(caches.match(e.request, { ignoreVary: true }).then(hit => {
    if (hit) { e.waitUntil(red.catch(() => {})); return hit; }
    return red.catch(() => e.request.mode === 'navigate' ? caches.match('./index.html') : Response.error());
  }));
});
