import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const b = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const p = await b.newPage({
  viewport: { width: 844, height: 390 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 1,
});
const errors = [];
p.on('pageerror', (e) => errors.push(e.message));
await p.goto('http://localhost:5173');
await p.waitForFunction(() => window.hawari?.scene.getScene('alley')?.hero);
await p.locator('[data-screen="title"] button').click();
await p.waitForTimeout(100);
assert.equal(await p.locator('.touch-controls').isVisible(), true);
const r = await p.locator('[data-touch="right"]').boundingBox();
await p.mouse.move(r.x + r.width / 2, r.y + r.height / 2);
await p.mouse.down();
await p.waitForTimeout(650);
await p.mouse.up();
const x = await p.evaluate(() => window.hawari.scene.getScene('alley').hero.x);
assert.ok(x > 170, 'touch right moves hero');
const j = await p.locator('[data-touch="jump"]').boundingBox();
await p.mouse.move(j.x + j.width / 2, j.y + j.height / 2);
await p.mouse.down();
await p.waitForTimeout(150);
assert.ok(
  (await p.evaluate(() => window.hawari.scene.getScene('alley').hero.y)) < 280,
  'touch jump leaves ground',
);
await p.mouse.up();
await p.screenshot({ path: '/workspace/hawari-checks/mobile.png' });
console.log(
  'PASS mobile touch, hero x=',
  x,
  'fps=',
  await p.evaluate(() => window.hawari.loop.actualFps),
);
assert.deepEqual(errors, []);
await b.close();
