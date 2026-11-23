// Production smoke covers a playable level in each world. Detailed legacy
// mechanic suites remain available through npm run test:browser.
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const browser = await chromium.launch({ args: ['--no-sandbox'] });
try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 720 },
  });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(process.env.GAME_URL || 'http://localhost:5173');
  await page.waitForFunction(
    () => window.hawari?.scene.getScene('alley')?.hero,
  );
  for (const index of [0, 4, 8, 12, 16, 20, 25, 28]) {
    const initial = await page.evaluate((index) => {
      const s = window.hawari.scene.getScene('alley');
      s.startLevel(index);
      s.hurtUntil = s.time.now + 1e8;
      if (s.children.list.some((o) => o.texture?.key === '__MISSING'))
        throw new Error(`Missing art entering ${index}`);
      s.enemies.clear(true, true);
      return { x: s.hero.x, time: s.time.now };
    }, index);
    await page.keyboard.down('ArrowRight');
    await page.waitForFunction(
      ({ x, time }) => {
        const s = window.hawari.scene.getScene('alley');
        return s.time.now > time + 300 && s.hero.x > x + 10;
      },
      initial,
      { timeout: 10000 },
    );
    await page.keyboard.up('ArrowRight');
    const state = await page.evaluate(() => {
      const s = window.hawari.scene.getScene('alley');
      return {
        level: s.level,
        mode: s.mode,
        x: s.hero.x,
        y: s.hero.y,
        missing: s.children.list.filter((o) => o.texture?.key === '__MISSING')
          .length,
      };
    });
    assert.equal(state.level, index);
    assert.equal(state.mode, 'play');
    assert.ok(Number.isFinite(state.x) && Number.isFinite(state.y));
    assert.equal(state.missing, 0, `missing art at level ${index}`);
    console.log('World smoke', index, state);
  }
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
