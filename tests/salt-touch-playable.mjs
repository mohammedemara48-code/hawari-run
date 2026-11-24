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
  await p.evaluate(() => window.hawari.scene.getScene('alley').startLevel(29));
  const cdp = await p.context().newCDPSession(p),
    points = new Map();
  const send = (type) =>
    cdp.send('Input.dispatchTouchEvent', {
      type,
      touchPoints: [...points].map(([id, [x, y]]) => ({
        id,
        x,
        y,
        radiusX: 6,
        radiusY: 6,
        force: 1,
      })),
    });
  const set = async (id, pos) => {
    const existed = points.has(id);
    if (pos) points.set(id, pos);
    else points.delete(id);
    await send(pos ? (existed ? 'touchMove' : 'touchStart') : 'touchEnd');
  };
  const zone = await p.locator('.stick-zone').boundingBox(),
    base = await p.locator('.stick-base').boundingBox(),
    jump = await p.locator('[data-touch="jump"]').boundingBox();
  const start = [zone.x + zone.width * 0.35, zone.y + zone.height * 0.65],
    jp = [jump.x + jump.width / 2, jump.y + jump.height / 2];
  await set(1, start);
  let held = false,
    jumpUntil = 0,
    previous = 0,
    minLives = 3;
  const shots = new Set();
  for (let tick = 0; tick < 7000; tick++) {
    const s = await p.evaluate(() => {
      const s = window.hawari.scene.getScene('alley'),
        b = s.hero.body;
      const col = Math.floor(b.center.x / 24),
        row = Math.floor((b.bottom + 2) / 24);
      return {
        x: s.hero.x,
        feet: b.bottom,
        vy: b.velocity.y,
        ground: b.blocked.down || b.touching.down,
        wall: b.blocked.right,
        mode: s.mode,
        elapsed: s.elapsed,
        lives: s.lives,
        cp: s.checkpoint,
        exit: s.spec.exit.x,
        enemy: s.enemies
          .getChildren()
          .some(
            (e) =>
              e.active &&
              e.x > s.hero.x - 5 &&
              e.x < s.hero.x + 105 &&
              e.y > b.bottom - 38 &&
              e.y < b.bottom + 18,
          ),
        gap: [1].some((d) => {
          for (let r = row; r < s.L.rows; r++)
            if ('#=سل'.includes(s.L.at(col + d, r))) return false;
          return true;
        }),
        pans: s.moverList
          .filter((m) => !m.camel && m.axis === 'x')
          .map((m) => ({
            x: m.img.x,
            top: m.img.body.top,
            min: m.min,
            max: m.max,
            left: m.img.body.left,
            right: m.img.body.right,
          })),
      };
    });
    if (tick % 80 === 0 || s.mode !== 'play')
      console.log('STATE', JSON.stringify(s));
    minLives = Math.min(minLives, s.lives);
    assert.ok(s.lives > 0, 'no game over');
    if (s.mode === 'clear') {
      console.log('TOUCH CLEAR', JSON.stringify({ ...s, minLives }));
      await p.screenshot({ path: SHOTS + '/salt-touch-clear.png' });
      break;
    }
    assert.equal(s.mode, 'play', 'touch journey has no deaths');
    const dir = s.x > s.exit ? -1 : 1;
    // Ferry pans float at crust level: hold on the bank, walk aboard as
    // the pan slides home, stand still mid-brine, then walk off.
    const ferry = s.pans.find(
      (p) =>
        Math.abs(p.top - s.feet) < 12 && s.x > p.x - 8 * 24 && s.x < p.max + 60,
    );
    let stickDir = dir;
    if (ferry) {
      const fmin = ferry.min;
      const onPan =
        Math.abs(s.feet - ferry.top) < 6 &&
        s.x > ferry.x - 20 &&
        s.x < ferry.x + 56;
      if (onPan) {
        // Docked at the far bank: walk off. Otherwise hold the pan's center.
        if (ferry.x > ferry.max - 3) stickDir = 1;
        else {
          const c = ferry.x + 24;
          stickDir = Math.abs(s.x - c) < 8 ? 0 : Math.sign(c - s.x);
        }
      } else if (s.gap && s.x < ferry.x) {
        // On the home bank over brine: board only once it has docked.
        stickDir = ferry.x < fmin + 4 ? 1 : 0;
      }
    }
    // Half stick gives walking speed, no run flag. Tap the actual small jump
    // button for 120 simulated ms, not a held keyboard/run-jump shortcut.
    if (stickDir === 0) {
      // Park by sliding to neutral: lifting and re-pressing recenters the
      // stick on the touch point and reads as zero deflection.
      if (points.has(1)) await set(1, start);
    } else {
      await set(1, [start[0] + stickDir * base.width * 0.2, start[1]]);
    }
    const dockedFar = ferry && ferry.x > ferry.max - 3;
    if (
      !held &&
      s.ground &&
      (!ferry || (dockedFar && s.wall)) &&
      (s.gap || s.enemy || s.wall) &&
      s.elapsed - previous > 0.3
    ) {
      if (!points.has(1))
        await set(1, [start[0] + dir * base.width * 0.2, start[1]]);
      await set(2, jp);
      held = true;
      jumpUntil = s.elapsed + 0.12;
      previous = s.elapsed;
    }
    if (held && s.elapsed >= jumpUntil) {
      points.clear();
      await send('touchEnd');
      await set(1, start);
      held = false;
    }
    for (const col of [30, 90, 119, 139])
      if (!shots.has(col) && s.x > col * 24 && s.x < (col + 7) * 24) {
        shots.add(col);
        await p.screenshot({ path: SHOTS + `/salt-touch-gap-${col}.png` });
      }
    await p.waitForTimeout(16);
    if (tick === 6999) assert.fail('touch journey timed out');
  }
  await set(1, null);
  if (held) await set(2, null);
} finally {
  await browser.close();
}
