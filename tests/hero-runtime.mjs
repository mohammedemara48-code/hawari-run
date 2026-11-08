import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(process.env.GAME_URL || 'http://localhost:5173');
await page.waitForFunction(() => window.hawari?.scene.getScene('alley')?.hero);
await page.locator('[data-screen="title"] button').click();
const s = () =>
  page.evaluate(() => {
    const s = window.hawari.scene.getScene('alley'),
      b = s.hero.body;
    return {
      pose: s.hero.getData('pose'),
      height: b.height,
      offset: b.offset.y,
      key: s.hero.texture.key,
      bottom: b.bottom,
    };
  });
await page.waitForTimeout(180);
assert.equal((await s()).height, 34);
assert.equal((await s()).offset, 14);
await page.keyboard.down('ArrowRight');
await page.waitForTimeout(180);
assert.match((await s()).pose, /^run/);
await page.keyboard.up('ArrowRight');
await page.keyboard.down('ArrowLeft');
await page.waitForTimeout(35);
assert.equal((await s()).pose, 'skid');
await page.keyboard.up('ArrowLeft');
await page.waitForTimeout(180);
await page.keyboard.down('ArrowDown');
await page.waitForTimeout(75);
assert.equal((await s()).pose, 'crouch');
assert.equal((await s()).height, 24);
assert.equal((await s()).bottom, 312);
await page.keyboard.up('ArrowDown');
await page.waitForTimeout(80);
assert.equal((await s()).height, 34);
assert.equal((await s()).bottom, 312);
await page.keyboard.down('Space');
await page.waitForTimeout(120);
assert.equal((await s()).pose, 'rise');
await page.keyboard.up('Space');
await page.waitForTimeout(200);
assert.equal((await s()).pose, 'fall');
await page.waitForTimeout(350);
await page.evaluate(() => window.hawari.scene.getScene('alley').setPower(1));
await page.waitForTimeout(65);
assert.match((await s()).pose, /^grow/);
assert.equal((await s()).height, 42);
assert.equal((await s()).offset, 6);
await page.waitForTimeout(440);
await page.evaluate(() =>
  window.hawari.scene.getScene('alley').setPower(2, false),
);
await page.keyboard.press('x', { delay: 90 });
assert.match((await s()).pose, /^throw/);
await page.evaluate(() => {
  const s = window.hawari.scene.getScene('alley');
  s.hurtUntil = 0;
  s.hurt();
});
await page.waitForTimeout(50);
assert.equal((await s()).pose, 'hurt');
await page.evaluate(() => window.hawari.scene.getScene('alley').die());
assert.match((await s()).key, /-dead$/);
const pixels = await page.evaluate(() => {
  const s = window.hawari.scene.getScene('alley');
  const keys = s.textures
    .getTextureKeys()
    .filter((k) => k.startsWith('hero-small-') || k.startsWith('hero-big-'));
  let partial = 0;
  const bounds = {};
  for (const key of keys) {
    const c = s.textures.get(key).getSourceImage(),
      d = c.getContext('2d').getImageData(0, 0, 32, 48).data;
    let top = 48,
      bottom = 0;
    for (let i = 3; i < d.length; i += 4) {
      if (d[i] !== 0 && d[i] !== 255) partial++;
      if (d[i]) {
        const y = Math.floor((i - 3) / 4 / 32);
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      }
    }
    if (key.endsWith('idle0')) bounds[key] = [top, bottom];
  }
  return { frames: keys.length, partial, bounds };
});
assert.equal(pixels.frames, 46);
assert.equal(pixels.partial, 0);
assert.deepEqual(pixels.bounds['hero-small-idle0'], [8, 47]);
assert.deepEqual(pixels.bounds['hero-big-idle0'], [0, 47]);
assert.deepEqual(errors, []);
console.log(
  'PASS: 46 opaque-palette hero drawings, eight-state gameplay integration, growth and foot-aligned collision',
);
await browser.close();
