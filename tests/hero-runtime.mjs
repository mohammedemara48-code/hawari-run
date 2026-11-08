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
assert.equal((await s()).height, 46);
assert.equal((await s()).offset, 18);
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
assert.equal((await s()).height, 32);
assert.equal((await s()).bottom, 312);
await page.keyboard.up('ArrowDown');
await page.waitForTimeout(80);
assert.equal((await s()).height, 46);
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
assert.equal((await s()).height, 54);
assert.equal((await s()).offset, 10);
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
      d = c.getContext('2d').getImageData(0, 0, 40, 64).data;
    let top = 64,
      bottom = 0;
    for (let i = 3; i < d.length; i += 4) {
      if (d[i] !== 0 && d[i] !== 255) partial++;
      if (d[i]) {
        const y = Math.floor((i - 3) / 4 / 40);
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
assert.deepEqual(pixels.bounds['hero-small-idle0'], [12, 63]);
assert.deepEqual(pixels.bounds['hero-big-idle0'], [4, 63]);
assert.deepEqual(errors, []);
const eyes = await page.evaluate(() => {
  const s = window.hawari.scene.getScene('alley');
  return [false, true].map((big) => {
    const c = s.textures
        .get(`hero-${big ? 'big' : 'small'}-idle0`)
        .getSourceImage(),
      head = big ? 4 : 12,
      d = c.getContext('2d').getImageData(0, 0, 40, 64).data,
      seen = new Set();
    let count = 0;
    for (let y = head + 10; y <= head + 15; y++)
      for (let x = 12; x < 39; x++) {
        const id = y * 40 + x,
          i = id * 4;
        if (
          d[i] !== 255 ||
          d[i + 1] !== 255 ||
          d[i + 2] !== 255 ||
          !d[i + 3] ||
          seen.has(id)
        )
          continue;
        count++;
        const stack = [id];
        seen.add(id);
        while (stack.length) {
          const k = stack.pop();
          for (const n of [k - 1, k + 1, k - 40, k + 40]) {
            const ny = Math.floor(n / 40),
              nx = n % 40,
              j = n * 4;
            if (
              ny < head + 10 ||
              ny > head + 15 ||
              nx < 12 ||
              nx >= 39 ||
              seen.has(n) ||
              d[j] !== 255 ||
              d[j + 1] !== 255 ||
              d[j + 2] !== 255 ||
              !d[j + 3]
            )
              continue;
            seen.add(n);
            stack.push(n);
          }
        }
      }
    return count;
  });
});
assert.deepEqual(
  eyes,
  [1, 1],
  'each side-profile drawing has exactly one visible eye',
);
const wardrobe = await page.evaluate(() => {
  const s = window.hawari.scene.getScene('alley'),
    c = s.textures.get('hero-small-idle0').getSourceImage(),
    d = c.getContext('2d').getImageData(0, 0, 40, 64).data;
  const counts = { blue: 0, white: 0, red: 0, oldTeal: 0 };
  for (let i = 0; i < d.length; i += 4) {
    const rgb = [d[i], d[i + 1], d[i + 2]].join(',');
    if (rgb === '36,77,224') counts.blue++;
    if (rgb === '255,255,255') counts.white++;
    if (rgb === '230,50,78') counts.red++;
    if (rgb === '39,127,130') counts.oldTeal++;
  }
  return counts;
});
assert.ok(
  wardrobe.blue > 20 && wardrobe.white > 15 && wardrobe.red > 5,
  'cobalt, white and red are visibly present',
);
assert.equal(
  wardrobe.oldTeal,
  0,
  'no background-like teal remains on the hero',
);
console.log(
  'PASS: 46 opaque-palette hero drawings, eight-state gameplay integration, growth and foot-aligned collision',
);
await browser.close();
