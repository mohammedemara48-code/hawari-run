// Installed-app (PWA) checks against the production build in dist/.
// Run `npm run build` first. Serves dist/ itself so the test can swap in the
// previous release's worker to exercise an upgrade.
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const DIST = 'dist';
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
};
let serveOldWorker = false;
const server = createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  try {
    let body;
    let file = path === '/' ? '/index.html' : path;
    if (path === '/sw.js' && serveOldWorker)
      body = await readFile('tests/fixtures/old-sw.js');
    else body = await readFile(join(DIST, normalize(file)));
    res.writeHead(200, {
      // Like vite preview / CDNs: Vary must not break offline cache hits.
      vary: 'Origin',
      'content-type': TYPES[extname(file)] || 'application/octet-stream',
      'cache-control': path === '/sw.js' ? 'no-cache' : 'no-cache',
    });
    res.end(body);
  } catch {
    res.writeHead(404).end('not found');
  }
});
await new Promise((r) => server.listen(4180, '127.0.0.1', r));
const ORIGIN = 'http://127.0.0.1:4180';

const pngSize = (buf) => [buf.readUInt32BE(16), buf.readUInt32BE(20)];
const b = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const ctx = await b.newContext({
  viewport: { width: 844, height: 390 },
  isMobile: true,
  hasTouch: true,
  userAgent:
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36',
});
const p = await ctx.newPage();
const errors = [];
p.on('pageerror', (e) => errors.push(e.message));
p.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
const cdp = await ctx.newCDPSession(p);
const workerState = () =>
  p.evaluate(async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    return {
      active: reg?.active?.state,
      controlled: !!navigator.serviceWorker.controller,
      caches: await caches.keys(),
    };
  });

// 1. Previous release installed (old worker + its 'hawari-v1.2' cache).
serveOldWorker = true;
await p.goto(ORIGIN + '/');
await p.waitForFunction(() => window.hawari?.scene.getScene('alley')?.hero);
await p.waitForFunction(
  async () => (await navigator.serviceWorker.getRegistration())?.active,
);
for (let i = 0; i < 60; i++) {
  if (
    await p.evaluate(
      async () =>
        (await navigator.serviceWorker.getRegistration())?.active?.state ===
        'activated',
    )
  )
    break;
  await p.waitForTimeout(150);
}
await p.evaluate(async () => {
  const c = await caches.open('hawari-v1.2');
  await c.put('/assets/index-OLDHASH.js', new Response('/* stale */'));
});
assert.ok(
  (await workerState()).caches.includes('hawari-v1.2'),
  'old cache present',
);
console.log('old release installed');

// 2. Deploy: the new worker replaces the old one and drops its cache.
serveOldWorker = false;
const sw = await (await fetch(ORIGIN + '/sw.js')).text();
const version = sw.match(/const VERSION = "([0-9a-f]{12})"/)?.[1];
assert.ok(version, 'build injected a cache version');
const precache = JSON.parse(sw.match(/const FILES = (\[[^\]]*\])/)[1]);
// Every level backdrop ships offline, worlds 2, 3 and 4 included.
for (let i = 1; i <= 16; i++)
  assert.ok(precache.includes(`/bg/l${i}.webp`), `backdrop l${i} precached`);
const poll = async (fn, arg, what, ms = 15000) => {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await p.evaluate(fn, arg)) return;
    await p.waitForTimeout(150);
  }
  throw new Error('timed out waiting for ' + what);
};
await p.reload();
await poll(
  async (v) =>
    (await caches.keys()).includes('hawari-' + v) &&
    (await navigator.serviceWorker.getRegistration())?.active?.state ===
      'activated',
  version,
  'new worker',
);
// A page load under the new worker clears anything the old one re-created.
await p.reload();
await poll(
  async (v) => {
    const k = await caches.keys();
    return k.length === 1 && k[0] === 'hawari-' + v;
  },
  version,
  'old cache removal',
);
const after = await workerState();
assert.deepEqual(
  after.caches,
  ['hawari-' + version],
  'only the new cache remains',
);
const cached = await p.evaluate(
  async (v) =>
    (await (await caches.open('hawari-' + v)).keys()).map(
      (r) => new URL(r.url).pathname,
    ),
  version,
);
for (const f of precache) assert.ok(cached.includes(f), `precached ${f}`);
// The cached index references only assets that are in the same cache.
const shell = await p.evaluate(
  async (v) =>
    (await (await caches.open('hawari-' + v)).match('/index.html')).text(),
  version,
);
for (const a of shell.match(/\/assets\/[^"]+/g))
  assert.ok(cached.includes(a), `shell asset ${a} cached`);
console.log(
  'PASS: upgrade from the previous worker,',
  precache.length,
  'files precached',
);

// 3. Manifest: installable, scoped, with exact-size PNG icons incl. maskable.
const manifest = await (await fetch(ORIGIN + '/manifest.webmanifest')).json();
assert.equal(manifest.id, '/');
assert.equal(manifest.scope, '/');
assert.ok(manifest.start_url.startsWith('/'), 'start_url inside scope');
assert.equal(manifest.display, 'standalone');
assert.ok(
  manifest.name &&
    manifest.short_name &&
    manifest.theme_color &&
    manifest.background_color,
);
for (const size of [192, 512])
  for (const purpose of ['any', 'maskable'])
    assert.ok(
      manifest.icons.some(
        (i) => i.sizes === `${size}x${size}` && i.purpose === purpose,
      ),
      `${purpose} ${size} icon declared`,
    );
for (const icon of manifest.icons) {
  const res = await fetch(ORIGIN + icon.src);
  assert.equal(res.status, 200, icon.src);
  assert.equal(res.headers.get('content-type'), icon.type);
  const [w, h] = pngSize(Buffer.from(await res.arrayBuffer()));
  assert.equal(`${w}x${h}`, icon.sizes, `${icon.src} real size matches`);
}
const apple = await fetch(ORIGIN + '/apple-touch-icon.png');
assert.deepEqual(pngSize(Buffer.from(await apple.arrayBuffer())), [180, 180]);
const head = await p.evaluate(() => ({
  apple: document
    .querySelector('link[rel="apple-touch-icon"]')
    ?.getAttribute('href'),
  capable: document.querySelector('meta[name="apple-mobile-web-app-capable"]')
    ?.content,
  mobile: document.querySelector('meta[name="mobile-web-app-capable"]')
    ?.content,
  theme: document.querySelector('meta[name="theme-color"]')?.content,
}));
assert.deepEqual(head, {
  apple: '/apple-touch-icon.png',
  capable: 'yes',
  mobile: 'yes',
  theme: '#192b32',
});
const install = await cdp.send('Page.getInstallabilityErrors');
assert.deepEqual(
  install.installabilityErrors,
  [],
  'Chrome reports no installability errors',
);
const appManifest = await cdp.send('Page.getAppManifest');
assert.deepEqual(appManifest.errors, [], 'manifest parses without errors');
const appId = await cdp.send('Page.getAppId');
// Headless Chrome may not compute an app id; when it does it must be the origin root.
if (appId.appId) assert.equal(appId.appId, ORIGIN + '/', 'stable app id');
console.log('parsed manifest id:', appManifest.parsed?.id ?? '(n/a)');
console.log('PASS: manifest, icons and installability', appId);

// 4. Launch as an installed app, exactly like tapping the home-screen icon:
// Chromium installs the manifest and opens start_url in an app window with no
// user gesture. (Headless cannot render a standalone window, so display-mode
// is reported, not required.)
{
  const app = await chromium.launchPersistentContext(
    `/tmp/hawari-pwa-${Date.now()}`,
    {
      channel: 'chromium',
      headless: true,
      args: ['--no-sandbox'],
    },
  );
  const appErrors = [];
  const watch = (pg) => {
    pg.on('pageerror', (e) => appErrors.push(e.message));
    pg.on('console', (m) => m.type() === 'error' && appErrors.push(m.text()));
  };
  app.on('page', watch);
  const first = app.pages()[0] || (await app.newPage());
  watch(first);
  await first.goto(ORIGIN + '/');
  await first.waitForFunction(
    () => window.hawari?.scene.getScene('alley')?.hero,
  );
  const s = await app.newCDPSession(first);
  await s.send('PWA.install', { manifestId: ORIGIN + '/' });
  const opened = app.waitForEvent('page');
  await s.send('PWA.launch', { manifestId: ORIGIN + '/' });
  const win = await opened;
  await win.waitForLoadState();
  assert.equal(
    new URL(win.url()).search,
    '?source=pwa',
    'launched at start_url',
  );
  await win.waitForFunction(() => window.hawari?.scene.getScene('alley')?.hero);
  assert.equal(
    await win.locator('[data-screen="title"]').isVisible(),
    true,
    'title screen shows',
  );
  const mode = await win.evaluate(() =>
    ['standalone', 'fullscreen', 'minimal-ui', 'browser'].find(
      (m) => matchMedia(`(display-mode: ${m})`).matches,
    ),
  );
  assert.deepEqual(appErrors, [], 'no console errors on app launch');
  console.log(
    'PASS: installed-app launch boots to title with no gesture (display-mode:',
    mode + ')',
  );
  await app.close();
}

// 5. Offline: launching the installed app still works, and play starts.
await ctx.setOffline(true);
await p.goto(ORIGIN + manifest.start_url);
await p.waitForFunction(() => window.hawari?.scene.getScene('alley')?.hero);
await p.goto(ORIGIN + '/some/deep/link?x=1');
await p.waitForFunction(() => window.hawari?.scene.getScene('alley')?.hero);
await p.locator('[data-screen="title"] [data-action="start"]').click();
await p.locator('.map-node[data-node="0"]').click();
assert.equal(
  await p.evaluate(() => window.hawari.scene.getScene('alley').mode),
  'play',
);
assert.deepEqual(
  errors.filter(
    (e) => !/ERR_INTERNET_DISCONNECTED|Failed to load resource/.test(e),
  ),
  [],
);
console.log('PASS: offline launch from start_url and deep links');
await ctx.setOffline(false);

// 6. iOS-standalone-like browser: no AudioContext, no fullscreen API,
// orientation lock that throws. The game must still start and play.
{
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.addInitScript(() => {
    delete window.AudioContext;
    delete window.webkitAudioContext;
    Element.prototype.requestFullscreen = undefined;
    Object.defineProperty(screen, 'orientation', {
      get: () => ({
        lock: () => {
          throw new Error('NotSupportedError');
        },
      }),
    });
  });
  await page.goto(ORIGIN + manifest.start_url);
  await page.waitForFunction(
    () => window.hawari?.scene.getScene('alley')?.hero,
  );
  // The fullscreen button is hidden on landscape phones; trigger it directly.
  await page.evaluate(() => document.getElementById('fullscreen-btn').click());
  await page.locator('[data-screen="title"] [data-action="start"]').click();
  await page.locator('.map-node[data-node="0"]').click();
  assert.equal(
    await page.evaluate(() => window.hawari.scene.getScene('alley').mode),
    'play',
  );
  assert.deepEqual(
    errs,
    [],
    'no uncaught errors without audio/fullscreen/orientation APIs',
  );
  console.log(
    'PASS: boots and plays without audio, fullscreen or orientation lock',
  );
}
await b.close();
server.close();
