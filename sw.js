// Service worker: keeps the app's files on the device so it opens offline.
//
// Bump VERSION together with the ?v= numbers in index.html on every release.
// The new worker then caches the new files and removes the old cache.

const VERSION = '14';
const CACHE = `excitement-compass-v${VERSION}`;
const FILES = [
  './',
  'index.html',
  `styles.css?v=${VERSION}`,
  `strings.js?v=${VERSION}`,
  `storage.js?v=${VERSION}`,
  `sky.js?v=${VERSION}`,
  `app.js?v=${VERSION}`,
  'manifest.webmanifest',
  'icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      // Skip the browser's HTTP cache so a new version never caches old files.
      .then((cache) => cache.addAll(FILES.map((f) => new Request(f, { cache: 'reload' }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys
        .filter((k) => k.startsWith('excitement-compass-') && k !== CACHE)
        .map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  // Pages: try the network first so updates arrive, fall back to the cached app.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put('index.html', copy));
          }
          return res;
        })
        .catch(() => caches.match('index.html').then((res) => res || caches.match('./'))),
    );
    return;
  }

  // Files: their names carry the version, so the cached copy is always right.
  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).then((res) => {
      if (res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then((cache) => cache.put(req, copy));
      }
      return res;
    })),
  );
});
