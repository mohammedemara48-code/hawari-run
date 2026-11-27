import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { SHOTS } from './browser-paths.mjs';
const browser = await chromium.launch({ args: ['--no-sandbox'] });
try {
  const p = await browser.newPage({
    viewport: { width: 844, height: 390 },
    isMobile: true,
    hasTouch: true,
  });
  await p.addInitScript(() => {
    window.localStorage.setItem('hawari-seen-version', '999');
    Element.prototype.requestFullscreen = undefined;
  });
  await p.goto(process.env.GAME_URL || 'http://127.0.0.1:5182');
  await p.waitForFunction(() => window.hawari?.scene.getScene('alley')?.hero);
  await p.evaluate(() => window.hawari.scene.getScene('alley').startLevel(31));
  await p.waitForTimeout(800);
  const S = (fn, arg) =>
    p.evaluate(
      ([f, a]) => {
        const s = window.hawari.scene.getScene('alley');
        return new Function('s', 'a', f)(s, a);
      },
      [fn, arg],
    );
  // Arrive without salt on purpose: the arena must hand one over.
  await S(
    's.setPower(0,false); s.hero.setPosition(4150,280); s.invincible=1e12;',
  );
  await p.waitForTimeout(600);
  assert.equal(await S('return s.power'), 2, 'salt granted in the arena');
  await p.waitForTimeout(500);
  const intro = await p.locator('#fight-cue').innerText();
  assert.match(intro, /الملح/);
  await p.screenshot({ path: `${SHOTS}/qibli-intro.png` });
  const cdp = await p.context().newCDPSession(p);
  const tap = async (sel) => {
    const b = await p.locator(sel).boundingBox();
    const x = b.x + b.width / 2,
      y = b.y + b.height / 2;
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ id: 9, x, y, radiusX: 6, radiusY: 6, force: 1 }],
    });
    await p.waitForTimeout(80);
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: [],
    });
  };
  for (let hit = 1; hit <= 3; hit++) {
    // Wait for the glowing tell, then check the cue and the pulsing button.
    await p.waitForFunction(
      () => window.hawari.scene.getScene('alley').bossState.state === 'tell',
      null,
      { timeout: 20000 },
    );
    await p.waitForTimeout(150);
    assert.match(await p.locator('#fight-cue').innerText(), /زرار الملح/);
    assert.ok(
      await p
        .locator('[data-touch="throw"]')
        .evaluate((e) => e.classList.contains('salt-cue')),
      'salt button pulses during the tell',
    );
    if (hit === 1) await p.screenshot({ path: `${SHOTS}/qibli-tell.png` });
    await tap('[data-touch="throw"]');
    await p.waitForFunction(
      () => window.hawari.scene.getScene('alley').bossState.state === 'stunned',
      null,
      { timeout: 2000 },
    );
    await p.waitForTimeout(150);
    assert.match(await p.locator('#fight-cue').innerText(), /ديله/);
    if (hit === 1) await p.screenshot({ path: `${SHOTS}/qibli-stunned.png` });
    const hp = await S('return s.bossState.hp');
    // Land on the exposed tail.
    await S(
      's.hero.setPosition(s.boss.x - 20, s.boss.y - 70); s.hero.body.setVelocity(0, 200);',
    );
    await p.waitForFunction(
      (before) => {
        const s = window.hawari.scene.getScene('alley');
        return s.bossState.hp < before || s.bossState.defeated;
      },
      hp,
      { timeout: 4000 },
    );
    await p.waitForTimeout(1500);
    if (!(await S('return s.bossState.defeated'))) {
      const y = await S('return s.boss.y');
      assert.ok(y > 100 && y < 330, 'boss stays on screen after a hit, y=' + y);
    }
    await S('s.hero.setPosition(4150, 280);');
  }
  console.log('qibli touch fight ok');
} finally {
  await browser.close();
}
