import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const browser = await chromium.launch({ args: ['--no-sandbox'] });
try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 800 },
  });
  await page.route('**/api/**', (route) =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: '{"error":"unavailable"}',
    }),
  );
  await page.goto(process.env.GAME_URL || 'http://localhost:5173');
  await page.waitForFunction(
    () => window.hawari?.scene.getScene('alley')?.hero,
  );
  await page.evaluate(async () => {
    const a = await import('/src/account.ts');
    window.localStorage.setItem(
      'hawari-player',
      JSON.stringify({ name: 'tester', pin: '1234' }),
    );
    await a.restoreSession();
    await a.login('tester', '1234');
  });
  await page.waitForTimeout(150);
  const copies = await page.evaluate(async () => {
    const db = await new Promise((resolve) => {
      const r = window.indexedDB.open('hawari', 1);
      r.onsuccess = () => resolve(r.result);
    });
    const idb = await new Promise((resolve) => {
      const r = db.transaction('kv').objectStore('kv').get('player');
      r.onsuccess = () => resolve(r.result);
    });
    db.close();
    return {
      local: window.localStorage.getItem('hawari-player'),
      cookie: document.cookie,
      idb,
    };
  });
  assert.ok(!JSON.stringify(copies).includes('1234'));
  assert.match(
    await page.locator('#journey-sync-status').textContent(),
    /الجهاز/,
  );
  assert.equal(
    await page.locator('#journey-sync-status').evaluate((el) => {
      const r = el.getBoundingClientRect();
      return (
        document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2) === el
      );
    }),
    true,
  );
  await page.screenshot({
    path: process.env.SHOT_PATH || '/downloads/hawari-sync-status.png',
  });
  console.log('PIN copies scrubbed, local-only status visible');
} finally {
  await browser.close();
}
