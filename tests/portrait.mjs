// Phone held upright: the game turns itself to landscape (CSS quarter turn),
// fills the screen, and the stick + jump still drive the hero.
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const b = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const p = await b.newPage({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 2,
});
const errors = [];
p.on('pageerror', (e) => errors.push(e.message));
await p.goto(process.env.GAME_URL || 'http://localhost:5173');
await p.waitForFunction(() => window.hawari?.scene.getScene('alley')?.hero);
assert.ok(
  await p.evaluate(() => document.documentElement.classList.contains('rotated')),
  'portrait phone gets the quarter turn',
);
const size = await p.evaluate(() => ({
  width: window.hawari.scale.gameSize.width,
  height: window.hawari.scale.gameSize.height,
}));
assert.ok(size.width > size.height * 1.6, 'game is landscape: ' + size.width);
const box = await p.locator('#game-wrap').boundingBox();
assert.ok(box.width >= 380 && box.height >= 830, 'wrap fills the screen');
assert.equal(await p.locator('.rotate-hint').isVisible(), false);
await p.locator('[data-screen="title"] [data-action="start"]').tap();
await p.waitForTimeout(250);
await p.locator('.map-node[data-node="0"]').tap();
await p.waitForFunction(
  () => window.hawari.scene.getScene('alley').mode === 'play',
);
await p.evaluate(() =>
  window.hawari.scene.getScene('alley').enemies.clear(true, true),
);
await p.waitForTimeout(400);
if (process.env.SHOT) await p.screenshot({ path: process.env.SHOT });
const cdp = await p.context().newCDPSession(p);
const touch = (type, pts) =>
  cdp.send('Input.dispatchTouchEvent', {
    type,
    touchPoints: pts.map(([x, y], id) => ({ id, x, y, radiusX: 8, radiusY: 8 })),
  });
// The stick sits bottom-left of the game, which is top-left of the screen
// once turned; "right" in the game is "down" on the screen.
const zone = await p.locator('[data-stick]').boundingBox();
const sx = zone.x + zone.width / 2,
  sy = zone.y + zone.height / 2;
const x0 = await p.evaluate(() => window.hawari.scene.getScene('alley').hero.x);
await touch('touchStart', [[sx, sy]]);
for (let i = 1; i <= 6; i++) await touch('touchMove', [[sx, sy + i * 10]]);
await p.waitForTimeout(700);
await touch('touchEnd', []);
const x1 = await p.evaluate(() => window.hawari.scene.getScene('alley').hero.x);
assert.ok(x1 > x0 + 30, `stick drag moves the hero right (${x0} → ${x1})`);
const jump = await p.locator('[data-touch="jump"]').boundingBox();
await touch('touchStart', [[jump.x + jump.width / 2, jump.y + jump.height / 2]]);
await p.waitForTimeout(120);
const vy = await p.evaluate(
  () => window.hawari.scene.getScene('alley').hero.body.velocity.y,
);
await touch('touchEnd', []);
assert.ok(vy < 0, 'jump button jumps: vy=' + vy);
assert.deepEqual(errors, []);
console.log('portrait ok', { size, x0, x1, vy });
await b.close();
