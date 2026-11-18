// Phone landscape: no side bars, login, then كمّل from a checkpoint.
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

const url = process.env.GAME_URL || 'http://localhost:5173';
const out = '/workspace/hawari-shots';
await mkdir(out, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox'],
});
const page = await browser.newPage({
  viewport: { width: 915, height: 412 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 2,
  userAgent:
    'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
});
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

await page.goto(url + '/?login=1', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.hawari?.scene.getScene('alley')?.hero);
await page.waitForSelector('[data-screen="login"]:not([hidden])');

const bars = await page.evaluate(() => {
  const wrap = document.getElementById('game-wrap').getBoundingClientRect();
  const canvas = document.querySelector('#game canvas').getBoundingClientRect();
  const chrome = ['masthead', 'underbar', 'field-guide'].map((c) => {
    const el = document.querySelector('.' + c);
    if (!el) return { c, hidden: true };
    const s = window.getComputedStyle(el);
    return {
      c,
      hidden:
        s.display === 'none' ||
        el.offsetParent === null ||
        el.getBoundingClientRect().height === 0,
    };
  });
  return {
    vw: window.innerWidth,
    vh: window.innerHeight,
    wrap: {
      x: wrap.x,
      y: wrap.y,
      w: wrap.width,
      h: wrap.height,
    },
    canvas: {
      x: canvas.x,
      y: canvas.y,
      w: canvas.width,
      h: canvas.height,
    },
    leftGap: Math.round(canvas.left),
    rightGap: Math.round(window.innerWidth - canvas.right),
    topGap: Math.round(canvas.top),
    bottomGap: Math.round(window.innerHeight - canvas.bottom),
    chrome,
  };
});
console.log('fill', bars);
assert.ok(
  bars.chrome.every((c) => c.hidden),
  'page chrome still visible',
);
assert.ok(
  Math.abs(bars.wrap.w - bars.vw) <= 2 && Math.abs(bars.wrap.h - bars.vh) <= 2,
  'game-wrap does not fill the viewport: ' + JSON.stringify(bars.wrap),
);
assert.ok(
  bars.leftGap <= 2 && bars.rightGap <= 2,
  'side bars remain: left=' + bars.leftGap + ' right=' + bars.rightGap,
);
assert.ok(
  bars.topGap <= 2 && bars.bottomGap <= 2,
  'vertical bars remain: top=' + bars.topGap + ' bottom=' + bars.bottomGap,
);

await page.screenshot({ path: out + '/21-login.png' });

await page.locator('#player-name-input').fill('بلبل تجربة');
await page.locator('#player-pin-input').fill('1234');
await page.locator('#login-form button[type="submit"]').click();
await page.waitForSelector('[data-screen="title"]:not([hidden])');
assert.equal(
  await page.locator('[data-player-name]').first().textContent(),
  'بلبل تجربة',
);
await page.screenshot({ path: out + '/21-title.png' });

await page.locator('[data-screen="title"] [data-action="start"]').click();
await page.waitForSelector('[data-screen="map"]:not([hidden])');
await page.locator('.map-node[data-node="0"]').click();
await page.waitForFunction(
  () => window.hawari.scene.getScene('alley').mode === 'play',
);

// Mid-level: walk to the checkpoint, stash, and leave for the map.
const reached = await page.evaluate(async () => {
  const s = window.hawari.scene.getScene('alley');
  s.enemies?.clear?.(true, true);
  s.score = 420;
  s.coinCount = 7;
  s.lives = 2;
  s.power = 1;
  const cp = s.spec.checkpoint;
  if (!cp || !cp.x) return { ok: false, reason: 'no checkpoint' };
  s.hero.x = cp.x;
  s.hero.y = cp.y - 20;
  s.checkpoint = true;
  s.stashRun();
  return { ok: true, x: s.hero.x, level: s.level };
});
assert.equal(reached.ok, true, reached.reason || 'checkpoint missing');

await page.locator('#pause-btn').click();
await page.waitForSelector('[data-screen="pause"]:not([hidden])');
const mapBtn = page.locator('[data-screen="pause"] [data-action="map"]');
assert.equal(await mapBtn.isVisible(), true);
assert.match(await mapBtn.textContent(), /خريطة/);
await page.screenshot({ path: out + '/21-pause.png' });
await mapBtn.click();
await page.waitForSelector('[data-screen="map"]:not([hidden])');
const resumeBtn = page.locator('[data-screen="map"] [data-action="resume"]');
await resumeBtn.waitFor({ state: 'visible' });
assert.match(
  await page.locator('[data-screen="map"] [data-resume-label]').textContent(),
  /كمّل/,
);
await page.screenshot({ path: out + '/21-map-resume.png' });
await resumeBtn.click();
await page.waitForFunction(
  () => window.hawari.scene.getScene('alley').mode === 'play',
);
const resumed = await page.evaluate(() => {
  const s = window.hawari.scene.getScene('alley');
  return {
    mode: s.mode,
    checkpoint: s.checkpoint,
    lives: s.lives,
    score: s.score,
    coins: s.coinCount,
    power: s.power,
    x: s.hero.x,
  };
});
console.log('resumed', resumed);
assert.equal(resumed.checkpoint, true, 'did not resume at the checkpoint');
assert.equal(resumed.lives, 2);
assert.equal(resumed.score, 420);
assert.equal(resumed.coins, 7);
assert.equal(resumed.power, 1);
await page.screenshot({ path: out + '/21-resumed.png' });

if (errors.length) {
  console.error('page errors', errors);
  await browser.close();
  process.exit(1);
}
console.log('PASS: phone landscape fill + login + resume');
await browser.close();
