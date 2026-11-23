import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const browser = await chromium.launch({ args: ['--no-sandbox'] });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(process.env.GAME_URL || 'http://localhost:5173');
  await page.waitForFunction(
    () => window.hawari?.scene.getScene('alley')?.hero,
  );
  const initial = await page.evaluate(() => {
    const s = window.hawari.scene.getScene('alley');
    return {
      keys: s.textures.getTextureKeys(),
      unused: s.textures.exists('buffalo0'),
    };
  });
  assert.deepEqual(
    initial.keys.filter((k) => /^backdrop-/.test(k)),
    ['backdrop-0'],
  );
  assert.equal(
    initial.unused,
    false,
    'unvisited farm creatures are not generated',
  );
  assert.deepEqual(
    initial.keys.filter((k) => /-(sky|far|mid|near)$/.test(k)),
    ['night-near'],
  );
  for (let i = 0; i < 32; i++) {
    await page.evaluate((i) => {
      const s = window.hawari.scene.getScene('alley');
      s.startLevel(i);
      assertVisible();
      function assertVisible() {
        if (s.children.list.some((o) => o.texture?.key === '__MISSING'))
          throw new Error(`Missing art at ${i}`);
      }
    }, i);
    await page.waitForTimeout(75);
  }
  await page.evaluate(() =>
    window.hawari.scene.getScene('alley').startLevel(0),
  );
  assert.deepEqual(errors, []);
  console.log(
    'Lazy art: initial',
    initial.keys.length,
    'textures; all 32 level scene builds contain art',
  );
} finally {
  await browser.close();
}
