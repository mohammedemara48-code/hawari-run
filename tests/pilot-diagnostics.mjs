import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { SHOTS } from './browser-paths.mjs';
const browser = await chromium.launch({ args: ['--no-sandbox'] });
const results = [];
for (const index of [0, 28, 32]) {
  const page = await browser.newPage({ viewport: { width: 844, height: 390 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() =>
    window.localStorage.setItem('hawari-seen-version', '999'),
  );
  await page.goto(process.env.GAME_URL || 'http://localhost:5179');
  await page.waitForFunction(
    () => window.hawari?.scene.getScene('alley')?.hero,
  );

  const load = await page.evaluate((i) => {
    const s = window.hawari.scene.getScene('alley');
    const t = window.performance.now();
    s.startLevel(i);
    return window.performance.now() - t;
  }, index);
  await page.waitForTimeout(350);
  await page.screenshot({ path: `${SHOTS}/start-${index + 1}.png` });
  const metrics = await page.evaluate(async () => {
    const s = window.hawari.scene.getScene('alley');
    const times = [];
    let last = window.performance.now();
    for (let i = 0; i < 90; i++)
      await new Promise((r) =>
        window.requestAnimationFrame((t) => {
          times.push(t - last);
          last = t;
          r();
        }),
      );
    times.sort((a, b) => a - b);
    return {
      cols: s.L.cols,
      rows: s.L.rows,
      objects: s.children.length,
      staticBodies: s.physics.world.staticBodies.size,
      bodies: s.physics.world.bodies.size,
      frameMedian: times[45],
      frameP95: times[85],
      heap: window.performance.memory?.usedJSHeapSize,
      texturePixels: s.textures
        .getTextureKeys()
        .filter((k) => /^lvl\d+-/.test(k))
        .reduce((n, k) => {
          let im = s.textures.get(k).getSourceImage();
          return n + im.width * im.height;
        }, 0),
    };
  });
  results.push({ index, loadMs: load, ...metrics });
  if (process.env.PILOT_BASELINE === '1') {
    await page.close();
    continue;
  }
  // Isolated checkpoint restoration, separate from the uninterrupted key runs.
  await page.evaluate(
    (i) =>
      window.hawari.scene.getScene('alley').startLevel(i, { checkpoint: true }),
    index,
  );
  await page.waitForTimeout(100);
  const cp = await page.evaluate(() => {
    const s = window.hawari.scene.getScene('alley');
    return {
      x: s.hero.x,
      feet: s.hero.body.bottom,
      wantX: s.spec.checkpoint.x,
      wantY: s.spec.checkpoint.y,
      values: s.landmark?.values,
      thirst: s.siwa?.thirst,
      camels: s.siwa?.camels.map((c) => ({
        x: c.img.x,
        min: c.min,
        gravity: c.img.body.allowGravity,
        member: s.movers.contains(c.img),
      })),
    };
  });
  assert.ok(Math.abs(cp.x - cp.wantX) < 2);
  assert.ok(Math.abs(cp.feet - cp.wantY) < 3);
  if (index === 32) assert.deepEqual(cp.values, [1, 3, 0]);
  if (index === 28) {
    assert.ok(cp.thirst > 95);
    for (const c of cp.camels) {
      assert.ok(Math.abs(c.x - c.min) < 4);
      assert.equal(c.gravity, false);
      assert.equal(c.member, true);
    }
  }
  await page.screenshot({ path: `${SHOTS}/checkpoint-${index + 1}.png` });
  console.log('checkpoint restoration', index, cp);
  assert.deepEqual(errors, []);
  await page.close();
}
console.log('PERFORMANCE', JSON.stringify(results));
writeFileSync(`${SHOTS}/performance.json`, JSON.stringify(results, null, 2));
await browser.close();
