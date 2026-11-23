import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const browser = await chromium.launch({ args: ['--no-sandbox'] });
try {
  const page = await browser.newPage({ serviceWorkers: 'block' });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(process.env.GAME_URL || 'http://localhost:5173');
  await page.waitForFunction(
    () => window.hawari?.scene.getScene('alley')?.hero,
  );
  const keys = await page.evaluate(() =>
    window.hawari.scene
      .getScene('alley')
      .textures.getTextureKeys()
      .filter((k) => /^backdrop-/.test(k)),
  );
  assert.deepEqual(keys, ['backdrop-0'], 'only first image decoded on boot');
  await page.evaluate(() =>
    window.hawari.scene.getScene('alley').startLevel(4),
  );
  await page.waitForFunction(() =>
    window.hawari.scene
      .getScene('alley')
      .layers.some((l) => l.getData('name') === 'backdrop'),
  );
  assert.equal(
    await page.evaluate(() =>
      window.hawari.scene.getScene('alley').textures.exists('backdrop-4'),
    ),
    true,
  );
  await page.route('**/bg/l9.webp', async (route) => {
    await new Promise((r) => setTimeout(r, 1000));
    await route.abort();
  });
  await page.evaluate(() =>
    window.hawari.scene.getScene('alley').startLevel(8),
  );
  assert.equal(
    await page.evaluate(() => window.hawari.scene.getScene('alley').mode),
    'play',
  );
  await page.waitForTimeout(1400);
  const fallback = await page.evaluate(() => {
    const s = window.hawari.scene.getScene('alley');
    return {
      layers: s.layers.map((l) => l.getData('name')),
      old: s.textures.exists('backdrop-4'),
      missing: s.children.list.some((o) => o.texture?.key === '__MISSING'),
    };
  });
  assert.deepEqual(fallback.layers, ['sky', 'far', 'mid', 'near']);
  assert.equal(fallback.old, false);
  assert.equal(fallback.missing, false);
  await page.screenshot({
    path:
      process.env.SHOT_PATH || 'test-results/screenshots/backdrop-fallback.png',
  });
  assert.deepEqual(errors, []);
  console.log(
    'Backdrops: first-only boot, on-demand swap, released old image, network failure fallback',
  );
} finally {
  await browser.close();
}
