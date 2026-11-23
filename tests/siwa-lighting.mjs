import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const browser = await chromium.launch({ args: ['--no-sandbox'] });
try {
  const p = await browser.newPage({ viewport: { width: 844, height: 390 } });
  await p.addInitScript(() =>
    window.localStorage.setItem('hawari-seen-version', '999'),
  );
  await p.goto(process.env.GAME_URL || 'http://127.0.0.1:5181');
  await p.waitForFunction(() => window.hawari?.scene.getScene('alley')?.hero);
  for (const i of [28, 29, 30, 31]) {
    await p.evaluate((i) => {
      const s = window.hawari.scene.getScene('alley');
      s.startLevel(i);
      s.physics.pause();
    }, i);
    await p.waitForTimeout(250);
    const before = await p.locator('#thirst-bar').boundingBox();
    const states = await p.evaluate(() => {
      const s = window.hawari.scene.getScene('alley');
      const bar = document.getElementById('thirst-bar');
      const snapshot = () => {
        const r = bar.getBoundingClientRect();
        return {
          width: r.width,
          height: r.height,
          shade: bar.classList.contains('in-shade'),
          gradient: window.getComputedStyle(bar).backgroundImage,
          dark: !!s.dark,
        };
      };
      const results = [];
      // Enter/leave a real shelter using the runtime's roof detection.
      const positions = [3, 16, 3, 16, 3];
      for (const col of positions) {
        s.hero.body.reset(col * 24 + 12, 280);
        s.updateWorld(s.time.now, 0.016);
        s.updateWorld(s.time.now, 0.016);
        results.push(snapshot());
      }
      // Drink at an actual spring, without clearing enemies or changing the map.
      const spring = s.siwa.springs.find((q) => !q.buried);
      if (spring) {
        const hb = s.hero.body;
        hb.reset(spring.x, spring.y + 6 - 32);
        s.siwa.thirst = 40;
        s.updateWorld(s.time.now, 0.016);
        results.push({ ...snapshot(), thirst: s.siwa.thirst });
      }
      return results;
    });
    for (const s of states) {
      assert.ok(s.width < 250 && s.height < 50, JSON.stringify(s));
      assert.equal(s.gradient, 'none');
      assert.equal(s.dark, false);
    }
    if (states.at(-1).thirst !== undefined)
      assert.equal(states.at(-1).thirst, 100);
    assert.ok(before.width < 250);
    console.log('PASS stable light shade/drink', i + 1, states);
  }
  // The menu dimmer must remain functional after scoping its selector.
  await p.evaluate(() => {
    const s = window.hawari.scene.getScene('alley');
    s.showTitle();
  });
  assert.equal(
    await p
      .locator('#shade')
      .evaluate((e) => window.getComputedStyle(e).position),
    'absolute',
  );
  console.log('PASS menu dimmer preserved');
} finally {
  await browser.close();
}
