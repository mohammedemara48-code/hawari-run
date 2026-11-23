import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { SHOTS } from './browser-paths.mjs';
const browser = await chromium.launch({ args: ['--no-sandbox'] });
try {
  const page = await browser.newPage({ viewport: { width: 844, height: 390 } });
  await page.addInitScript(() =>
    window.localStorage.setItem('hawari-seen-version', '999'),
  );
  await page.goto(process.env.GAME_URL || 'http://localhost:5173');
  await page.waitForFunction(
    () => window.hawari?.scene.getScene('alley')?.hero,
  );
  await page.evaluate(() =>
    window.hawari.scene.getScene('alley').startLevel(28),
  );
  await page.waitForTimeout(300);
  const held = new Set();
  const key = async (k, on) => {
    if (held.has(k) === on) return;
    if (on) {
      await page.keyboard.down(k);
      held.add(k);
    } else {
      await page.keyboard.up(k);
      held.delete(k);
    }
  };
  let lastJump = -1e9,
    ridden = new Set();
  const state = () =>
    page.evaluate(() => {
      const s = window.hawari.scene.getScene('alley'),
        b = s.hero.body;
      return {
        time: s.time.now,
        x: s.hero.x,
        y: s.hero.y,
        feet: b.bottom,
        vy: b.velocity.y,
        ground: b.blocked.down || b.touching.down || s.riding,
        riding: s.riding,
        wall: b.blocked.right,
        mode: s.mode,
        lives: s.lives,
        thirst: s.siwa.thirst,
        cam: s.cameras.main.scrollX,
        enemies: s.enemies
          .getChildren()
          .filter((e) => e.active)
          .map((e) => ({ x: e.x, y: e.y, kind: e.getData('kind') })),
        camels: s.siwa.camels.map((c) => ({
          x: c.img.x,
          y: c.img.y,
          min: c.min,
          max: c.max,
          top: c.img.body.top,
          vx: c.img.body.velocity.x,
          member: s.movers.contains(c.img),
          gravity: c.img.body.allowGravity,
        })),
      };
    });
  for (let i = 0; i < 1800; i++) {
    const s = await state();
    if (i % 30 === 0) console.log(i, JSON.stringify(s));
    if (s.mode !== 'play') {
      assert.equal(s.mode, 'clear');
      break;
    }
    for (const c of s.camels) {
      assert.equal(c.member, true);
      assert.equal(c.gravity, false);
      assert.equal(c.y, 312);
    }
    assert.equal(s.lives, 3);

    let dir = 1,
      jump = false,
      run = true;
    const ci = s.x > 3000 ? 1 : s.x > 1950 && s.x < 2800 ? 0 : -1;
    if (ci >= 0) {
      const c = s.camels[ci];
      run = false;
      if (s.riding && Math.abs(s.x - (c.x + 60)) < 85) {
        ridden.add(ci);
        dir = 0;
        if (c.x > c.max - 20) {
          dir = 1;
          jump = true;
        }
      } else if (s.x < c.max + 110) {
        dir = s.x < c.x + 35 ? 1 : 0;
        jump = s.ground && s.x > c.x - 55;
      }
    } else
      jump =
        s.ground &&
        (s.wall ||
          s.enemies.some(
            (e) =>
              e.x > s.x - 20 && e.x < s.x + 125 && Math.abs(e.y - s.y) < 65,
          ));
    if (jump && s.time - lastJump < 650) jump = false;
    if (jump) lastJump = s.time;
    if (s.time - lastJump < 430) jump = true;
    await key('Shift', run);
    await key('ArrowRight', dir > 0);
    await key('ArrowLeft', dir < 0);
    await key('Space', jump);
    if (i % 150 === 0)
      await page.screenshot({ path: `${SHOTS}/siwa-journey-${i}.png` });
    await page.waitForTimeout(50);
  }
  const end = await state();
  console.log('END', end);
  assert.equal(end.mode, 'clear');
  assert.equal(end.lives, 3);
  assert.equal(ridden.size, 2);
  assert.ok(
    end.camels[0].x <= end.camels[0].min + 3,
    'first camel returned to boarding bank',
  );
  await page.screenshot({ path: `${SHOTS}/siwa-journey-clear.png` });
} finally {
  await browser.close();
}
