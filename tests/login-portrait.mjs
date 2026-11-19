/* global getComputedStyle */
// Upright phone: the login form is never drawn sideways (also with the
// keyboard open), and once logged in the game turns to landscape and plays.
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const base = process.env.GAME_URL || 'http://localhost:5173/';
const shots = process.env.SHOTS; // folder for screenshots (optional)
const b = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const ctx = await b.newContext({
  viewport: { width: 390, height: 844 },
  screen: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 2,
});
const p = await ctx.newPage();
const errors = [];
p.on('pageerror', (e) => errors.push(e.message));
await p.goto(base + '?login=1');
await p.waitForSelector('[data-screen="login"]:not([hidden])');
const cls = () =>
  p.evaluate(() => [...document.documentElement.classList].join(' '));
const upright = async (label) => {
  const c = await cls();
  assert.ok(!c.includes('rotated'), `${label}: not rotated (${c})`);
  assert.ok(c.includes('form-upright'), `${label}: form upright (${c})`);
  const t = await p.evaluate(
    () => getComputedStyle(document.querySelector('.login-screen')).transform,
  );
  assert.ok(t === 'none', `${label}: login has no transform (${t})`);
  const vh = p.viewportSize().height;
  for (const sel of ['#player-name-input', '#player-pin-input']) {
    const r = await p.locator(sel).boundingBox();
    assert.ok(r, `${label}: ${sel} laid out`);
    assert.ok(r.width > 250, `${label}: ${sel} is wide (${r.width})`);
    assert.ok(r.width > r.height * 4, `${label}: ${sel} is horizontal`);
    assert.ok(r.y >= 0 && r.y + r.height <= vh, `${label}: ${sel} on screen`);
  }
  assert.equal(await p.locator('.rotate-hint').isVisible(), false);
};
await upright('login, portrait');
// Keyboard: a field gets focus and the visible height drops to ~450.
await p.locator('#player-name-input').tap();
await p.setViewportSize({ width: 390, height: 450 });
await p.waitForTimeout(250);
await upright('keyboard open');
await p.keyboard.type('zz-portrait');
await p.locator('#player-pin-input').tap();
await p.keyboard.type('4821');
await p.waitForTimeout(150);
await upright('typing pin');
assert.equal(await p.inputValue('#player-name-input'), 'zz-portrait');
if (shots) await p.screenshot({ path: shots + '/24-login-portrait.png' });
await p.locator('#login-form button[type="submit"]').tap();
await p.waitForSelector('[data-screen="title"]:not([hidden])', {
  timeout: 10000,
});
// Keyboard closes after submit (the tap may also have gone fullscreen; leave
// it so the window can be resized back).
await p.evaluate(() => document.fullscreenElement && document.exitFullscreen());
await p.waitForTimeout(200);
await p.setViewportSize({ width: 390, height: 844 });
await p.waitForTimeout(400);
const after = await cls();
assert.ok(after.includes('rotated') && !after.includes('form-upright'), after);
const size = await p.evaluate(() => window.hawari.scale.gameSize.width);
assert.ok(size > 360 * 1.6, 'game is landscape: ' + size);
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
const cdp = await ctx.newCDPSession(p);
const touch = (type, pts) =>
  cdp.send('Input.dispatchTouchEvent', {
    type,
    touchPoints: pts.map(([x, y], id) => ({
      id,
      x,
      y,
      radiusX: 8,
      radiusY: 8,
    })),
  });
const zone = await p.locator('[data-stick]').boundingBox();
const sx = zone.x + zone.width / 2,
  sy = zone.y + zone.height / 2;
const hx = () => p.evaluate(() => window.hawari.scene.getScene('alley').hero.x);
const x0 = await hx();
await touch('touchStart', [[sx, sy]]);
for (let i = 1; i <= 6; i++) await touch('touchMove', [[sx, sy + i * 10]]);
await p.waitForTimeout(700);
await touch('touchEnd', []);
const x1 = await hx();
assert.ok(x1 > x0 + 30, `stick moves the hero right (${x0} → ${x1})`);
const jump = await p.locator('[data-touch="jump"]').boundingBox();
await touch('touchStart', [
  [jump.x + jump.width / 2, jump.y + jump.height / 2],
]);
await p.waitForTimeout(120);
const vy = await p.evaluate(
  () => window.hawari.scene.getScene('alley').hero.body.velocity.y,
);
await touch('touchEnd', []);
assert.ok(vy < 0, 'jump works: vy=' + vy);
if (shots) await p.screenshot({ path: shots + '/24-after-login-rotated.png' });
assert.deepEqual(errors, []);
console.log('login portrait ok', { size, x0, x1, vy });
await b.close();
