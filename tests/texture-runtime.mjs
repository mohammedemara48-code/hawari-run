// Terrain texture lifetime regression, across all worlds and repeated visits.
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const browser = await chromium.launch({ args: ['--no-sandbox'] });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(process.env.GAME_URL || 'http://localhost:5173/');
  await page.waitForFunction(
    () => window.hawari?.scene.getScene('alley')?.hero,
  );
  const snapshots = [];
  for (const index of [
    0, 1, 2, 3, 4, 8, 12, 16, 20, 25, 28, 31, 32, 36, 40, 43, 0,
  ]) {
    const snapshot = await page.evaluate((index) => {
      const s = window.hawari.scene.getScene('alley');
      s.startLevel(index);
      const keys = s.textures
        .getTextureKeys()
        .filter((k) => /^lvl\d+-/.test(k));
      if (keys.some((k) => !k.startsWith(`lvl${index}-`)))
        throw new Error(`Stale terrain at ${index}`);
      const bytes = keys.reduce((sum, k) => {
        const image = s.textures.get(k).getSourceImage();
        return sum + image.width * image.height * 4;
      }, 0);
      return {
        index,
        count: keys.length,
        rgbaMiB: +(bytes / 1048576).toFixed(1),
        keys,
      };
    }, index);
    snapshots.push(snapshot);
    // Yield to rendering and resource disposal between actual scene changes.
    await page.waitForTimeout(100);
  }
  const result = { snapshots, final: snapshots.at(-1).keys };
  assert.ok(result.final.every((k) => k.startsWith('lvl0-')));
  assert.deepEqual(errors, []);
  console.log(
    'Terrain lifecycle passed across every world',
    JSON.stringify(result),
  );
} finally {
  await browser.close();
}
