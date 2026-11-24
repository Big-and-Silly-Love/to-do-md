// Offline support. The list files (todo.md / todo.xlsx) are never cached here: the app always
// fetches them fresh and keeps its own copy for offline use. App files are network-first,
// falling back to the cached copy when there's no signal.
const CACHE = 'to-do-v2';
const FILES = ['./', 'index.html', 'manifest.json', 'icon-180.png', 'icon-192.png', 'icon-512.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES.map(f => new Request(f, {cache: 'reload'})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('to-do-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  if (/\.(md|xlsx|csv|txt|html?)$/i.test(url.pathname) && !/\/index\.html$/i.test(url.pathname)) return;
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    try {
      const r = await Promise.race([fetch(e.request, {cache: 'no-cache'}), new Promise((_, no) => setTimeout(() => no(new Error('slow')), 5000))]);
      if (r.ok) c.put(e.request, r.clone());
      return r;
    } catch (err) {
      return (await c.match(e.request, {ignoreSearch: true})) || (await c.match('./')) || Response.error();
    }
  })());
});
