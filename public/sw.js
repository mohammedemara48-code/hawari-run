// Offline worker for «بلبل في الحواري».
// The build injects VERSION (a hash of the built files) and the PRECACHE list,
// so every deploy gets its own cache holding an index.html together with the
// exact hashed assets it references.
const VERSION = /* VERSION */ 'dev';
const CACHE = 'hawari-' + VERSION;
const FILES = /* PRECACHE */ ['/index.html', '/manifest.webmanifest'];
const SHELL = '/index.html';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      // Bypass the HTTP cache so a deploy never precaches stale files.
      .then((c) =>
        c.addAll(FILES.map((f) => new Request(f, { cache: 'reload' }))),
      )
      .then(() => self.skipWaiting()),
  );
});

// Drop caches from older releases. Also run on page loads, because a previous
// worker that was still controlling a tab can re-create its cache late.
const cleanup = () =>
  caches
    .keys()
    .then((keys) =>
      Promise.all(
        keys
          .filter((k) => k.startsWith('hawari-') && k !== CACHE)
          .map((k) => caches.delete(k)),
      ),
    );

self.addEventListener('activate', (event) => {
  event.waitUntil(cleanup().then(() => self.clients.claim()));
});

const timeout = (ms) =>
  new Promise((_, reject) =>
    setTimeout(() => reject(new Error('timeout')), ms),
  );

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Pages (including start_url "/?source=pwa"): network first with a short
  // timeout, then this version's own index.html. Fresh pages are not written
  // into the cache, so the offline shell always matches the cached assets.
  if (req.mode === 'navigate') {
    event.waitUntil(cleanup());
    event.respondWith(
      Promise.race([fetch(req), timeout(4000)])
        .then((res) => {
          if (res.ok) return res;
          throw new Error('bad status ' + res.status);
        })
        .catch(() =>
          caches
            .open(CACHE)
            .then((c) =>
              c.match(SHELL, { ignoreSearch: true, ignoreVary: true }),
            )
            .then((res) => res || fetch(req)),
        ),
    );
    return;
  }

  // Hashed build assets never change: cache first.
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.open(CACHE).then((c) =>
        // ignoreVary: servers may send Vary: Origin, and module scripts carry an
        // Origin header that the precache request did not.
        c.match(req, { ignoreVary: true }).then(
          (hit) =>
            hit ||
            fetch(req).then((res) => {
              if (res.ok) void c.put(req, res.clone());
              return res;
            }),
        ),
      ),
    );
    return;
  }

  // Everything else (icons, fonts, manifest): network first, cache fallback.
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          void caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() =>
        caches
          .open(CACHE)
          .then((c) => c.match(req, { ignoreSearch: true, ignoreVary: true }))
          .then((res) => res || Response.error()),
      ),
  );
});
