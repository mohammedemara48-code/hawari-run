import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { SHOTS } from './browser-paths.mjs';
const browser = await chromium.launch({ args: ['--no-sandbox'] });
try {
  const page = await browser.newPage({
    viewport: { width: 844, height: 390 },
    isMobile: true,
    hasTouch: true,
  });
  let meStatus = 401;
  await page.route('**/api/me', async (route) => {
    await new Promise((r) => setTimeout(r, 600));
    return route.fulfill({
      status: meStatus,
      contentType: 'application/json',
      body:
        meStatus === 200
          ? JSON.stringify({
              name: 'landscape-tester',
              progress: { unlocked: 0 },
            })
          : '{}',
    });
  });
  await page.route('**/api/login', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ name: 'landscape-tester', created: false }),
    }),
  );
  const url = (process.env.GAME_URL || 'http://localhost:5173') + '/?login=1';
  await page.goto(url);
  await page.locator('[data-screen="login"]:not([hidden])').waitFor();
  assert.equal(await page.locator('#journey-sync-status').isVisible(), false);
  const visible = await page
    .locator('#login-form button[type="submit"]')
    .evaluate((el) => {
      const r = el.getBoundingClientRect();
      return r.top >= 0 && r.bottom <= window.innerHeight;
    });
  assert.ok(visible, 'Enter button fully visible in phone landscape');
  assert.ok(
    await page
      .locator('.login-screen')
      .evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
    'no horizontal clipping',
  );
  await page.screenshot({ path: SHOTS + '/account-landscape.png' });
  await page.locator('#player-name-input').fill('landscape-tester');
  await page.locator('#player-pin-input').fill('1234');
  await page.locator('#login-form button[type="submit"]').tap();
  await page.locator('[data-screen="title"]:not([hidden])').waitFor();
  meStatus = 200;
  await page.reload();
  await page.waitForTimeout(1300);
  assert.equal(
    await page.locator('[data-screen="login"]').isVisible(),
    false,
    'remembered after reload',
  );
  assert.equal(await page.locator('#player-pin-input').inputValue(), '');
  // Local identity is enough for play even if server auth expires or network fails.
  meStatus = 401;
  await page.reload();
  await page.waitForTimeout(1300);
  assert.equal(await page.locator('[data-screen="login"]').isVisible(), false);
  await page.evaluate(() =>
    window.hawari.scene.getScene('alley').startLevel(0),
  );
  await page.waitForTimeout(100);
  assert.equal(await page.locator('#journey-sync-status').isDisabled(), true);
  assert.equal(await page.locator('#journey-sync-status').isVisible(), false);
  await page.evaluate(() =>
    window.hawari.scene.getScene('alley').action('switch-player'),
  );
  assert.equal(
    await page.locator('[data-screen="login"]').isVisible(),
    false,
    'cannot interrupt active play',
  );
  // Wiped localStorage + cookies still restores identity from IndexedDB before prompt.
  await page.evaluate(() => {
    window.localStorage.removeItem('hawari-player');
    document.cookie = 'hawari-player=; max-age=0; path=/';
  });
  await page.reload();
  await page.waitForTimeout(1300);
  assert.equal(await page.locator('[data-screen="login"]').isVisible(), false);
  assert.match(
    await page.evaluate(() => window.localStorage.getItem('hawari-player')),
    /landscape-tester/,
  );
  console.log(
    'Landscape form fits; device identity survives reload, expired server session and storage fallback; no mid-play prompt',
  );
  // Guest choice is remembered as well.
  const guest = await browser.newPage({
    viewport: { width: 740, height: 300 },
  });
  await guest.route('**/api/**', (r) => r.fulfill({ status: 503, body: '{}' }));
  await guest.goto(url);
  await guest.locator('[data-screen="login"]:not([hidden])').waitFor();
  await guest.locator('#login-cancel').click();
  await guest.reload();
  await guest.waitForTimeout(1200);
  assert.equal(await guest.locator('[data-screen="login"]').isVisible(), false);
} finally {
  await browser.close();
}
