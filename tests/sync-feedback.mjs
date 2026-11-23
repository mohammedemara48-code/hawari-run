import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { SHOTS } from './browser-paths.mjs';
const b = await chromium.launch({ args: ['--no-sandbox'] });
try {
  const p = await b.newPage({
    viewport: { width: 844, height: 390 },
    isMobile: true,
    hasTouch: true,
  });
  let server = {
      unlocked: 3,
      best: { lanterns: 500 },
      coins: {},
      secrets: {},
      cleared: { lanterns: true },
      resume: null,
    },
    signed = false,
    writes = 0;
  await p.route('**/api/**', async (r) => {
    const path = new URL(r.request().url()).pathname;
    let status = 200,
      data = {};
    if (path === '/api/login') {
      signed = true;
      data = { name: 'sync-test', progress: server };
    } else if (path === '/api/me') {
      status = signed ? 200 : 401;
      data = signed ? { name: 'sync-test', progress: server } : {};
    } else if (path === '/api/progress') {
      const q = r.request().postDataJSON();
      if (r.request().method() === 'PUT') {
        server = q.progress;
        writes++;
      }
      data = { name: 'sync-test', progress: server };
    }
    await r.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(data),
    });
  });
  await p.addInitScript(() =>
    window.localStorage.setItem('hawari-seen-version', '999'),
  );
  await p.goto((process.env.GAME_URL || 'http://127.0.0.1:5190') + '/?login=1');
  await p.locator('#player-name-input').fill('sync-test');
  await p.locator('#player-pin-input').fill('1234');
  await p.locator('#login-form button[type="submit"]').tap();
  await p.locator('[data-screen="title"]:not([hidden])').waitFor();
  assert.match(await p.locator('#journey-sync-status').innerText(), /متزامن/);
  assert.ok(
    (
      await p.evaluate(() =>
        JSON.parse(window.localStorage.getItem('hawari-progress')),
      )
    ).unlocked >= 3,
    'server progress downloaded',
  );
  await p.screenshot({ path: SHOTS + '/sync-menu.png' });
  await p.evaluate(() => window.hawari.scene.getScene('alley').startLevel(29));
  assert.equal(
    await p.locator('#journey-sync-status').isVisible(),
    false,
    'no status banner during play',
  );
  await p.evaluate(() => window.hawari.scene.getScene('alley').action('map'));
  await p.waitForFunction(
    () =>
      document.querySelector('#journey-sync-status').dataset.state === 'synced',
  );
  await p.waitForTimeout(800);
  assert.ok(writes > 0, 'new resume/progress uploaded');
  await p.reload();
  await p.waitForFunction(
    () =>
      document.querySelector('#journey-sync-status').dataset.state === 'synced',
  );
  console.log(
    'PASS mocked two-way sync, visible menu status, hidden play status, restored session',
    writes,
  );
  // Honest offline fallback: local success must not announce cloud sync.
  signed = false;
  await p.route('**/api/login', (r) =>
    r.fulfill({ status: 503, contentType: 'application/json', body: '{}' }),
  );
  await p.evaluate(() =>
    window.hawari.scene.getScene('alley').action('switch-player'),
  );
  await p.locator('#player-name-input').fill('sync-test');
  await p.locator('#player-pin-input').fill('1234');
  await p.locator('#login-form button[type="submit"]').tap();
  await p.locator('[data-screen="title"]:not([hidden])').waitFor();
  assert.match(await p.locator('#journey-sync-status').innerText(), /الجهاز/);
  await p.screenshot({ path: SHOTS + '/sync-local-only.png' });
  console.log('PASS offline login clearly local-only, not claimed synced');
} finally {
  await b.close();
}
