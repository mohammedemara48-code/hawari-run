import { chromium } from '@playwright/test';
/* global localStorage */
import assert from 'node:assert/strict';
import { SHOTS } from './browser-paths.mjs';
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || undefined,
  args: ['--no-sandbox'],
});
try {
  const p = await browser.newPage({
    viewport: { width: 844, height: 390 },
    isMobile: true,
    hasTouch: true,
  });
  let loggedIn = false,
    deleted = false;
  await p.route('**/api/me', async (r) => {
    const m = r.request().method();
    if (m === 'DELETE') {
      deleted = true;
      loggedIn = false;
      return r.fulfill({ status: 200, json: { ok: true } });
    }
    return loggedIn
      ? r.fulfill({
          status: 200,
          json: { name: 'Mohamed Emara', admin: true, progress: null },
        })
      : r.fulfill({ status: 401, json: { error: 'none' } });
  });
  await p.route('**/api/login', (r) => {
    loggedIn = true;
    return r.fulfill({
      status: 200,
      json: { name: 'Mohamed Emara', admin: true, progress: null },
    });
  });
  await p.route('**/api/progress', (r) =>
    r.fulfill({ status: 200, json: { admin: true, progress: null } }),
  );
  await p.addInitScript(() => {
    localStorage.setItem('hawari-seen-version', '999');
    localStorage.setItem(
      'hawari-player',
      JSON.stringify({ name: 'Mohamed Emara' }),
    );
    localStorage.setItem('hawari-admin-hint', '1');
    Element.prototype.requestFullscreen = undefined;
  });
  await p.goto(process.env.GAME_URL || 'http://127.0.0.1:5182');
  // 1) Remembered player but the server lost the session: must ask for the PIN.
  await p.waitForSelector('[data-screen="login"]:not([hidden])');
  assert.match(await p.locator('#login-error').innerText(), /الجلسة خلصت/);
  assert.equal(await p.inputValue('#player-name-input'), 'Mohamed Emara');
  await p.screenshot({ path: `${SHOTS}/account-relogin.png` });
  await p.fill('#player-pin-input', '1234');
  await p.click('#login-form button[type="submit"]');
  await p.waitForSelector('[data-screen="title"]:not([hidden])');
  const title = await p
    .locator('[data-screen="title"] [data-player-name]')
    .innerText();
  assert.match(title, /أدمن/);
  await p.screenshot({ path: `${SHOTS}/account-title.png` });
  // 2) Admin sees every city unlocked on the map.
  await p.click('[data-screen="title"] [data-action="start"]');
  await p.waitForSelector('[data-screen="map"]:not([hidden])');
  await p.screenshot({ path: `${SHOTS}/account-map.png` });
  await p.click('[data-screen="map"] [data-action="logout"]');
  await p.waitForSelector('[data-screen="login"]:not([hidden])');
  assert.ok(deleted, 'server session cleared');
  assert.equal(await p.inputValue('#player-name-input'), '');
  assert.equal(
    await p.evaluate(() => localStorage.getItem('hawari-player')),
    null,
  );
  await p.screenshot({ path: `${SHOTS}/account-loggedout.png` });
  console.log('account logout/relogin ok');
} finally {
  await browser.close();
}
