import assert from 'node:assert/strict';
import { SHOTS } from './browser-paths.mjs';
import { chromium } from '@playwright/test';
const browser = await chromium.launch({ args: ['--no-sandbox'] });
try {
  const page = await browser.newPage({ viewport: { width: 844, height: 390 } });
  page.on('pageerror', console.error);
  await page.addInitScript(() =>
    window.localStorage.setItem('hawari-seen-version', '999'),
  );
  await page.goto(process.env.GAME_URL || 'http://localhost:5173');
  await page.waitForFunction(
    () => window.hawari?.scene.getScene('alley')?.hero,
  );
  await page.evaluate(() =>
    window.hawari.scene.getScene('alley').startLevel(27),
  );
  await page.waitForTimeout(300);
  await page.keyboard.down('Shift');
  const state = () =>
    page.evaluate(() => {
      const s = window.hawari.scene.getScene('alley'),
        b = s.hero.body,
        k = s.crane.hooks[0];
      return {
        time: s.elapsed * 1000,
        x: s.hero.x,
        y: s.hero.y,
        feet: b.bottom,
        vy: b.velocity.y,
        ground: b.blocked.down || b.touching.down || s.riding,
        wall: b.blocked.right,
        hang: !!s.crane.hang,
        mode: s.mode,
        lives: s.lives,
        power: s.power,
        boss: s.boss?.x,
        hp: s.bossState.hp,
        active: s.bossState.active,
        bst: s.bossState.state,
        kx: k.x,
        loaded: k.payload.visible,
        cam: s.cameras.main.scrollX,
        enemies: s.enemies
          .getChildren()
          .filter((e) => e.active)
          .map((e) => ({ x: e.x, y: e.y, kind: e.getData('kind') })),
        movers: s.moverList.map((m) => ({ x: m.img.x, y: m.img.y })),
      };
    });
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
  let lastJump = -10000,
    lastShot = 0,
    ferryBoard = false,
    ferryLeft = false;
  for (let i = 0; i < 2200; i++) {
    const s = await state();
    if (i % 20 === 0 || (s.x > 1090 && s.x < 1300))
      console.log(i, JSON.stringify(s));
    if (s.mode !== 'play') {
      console.log('END', s);
      assert.equal(s.mode, 'clear');
      break;
    }
    let dir = 1,
      jump = false,
      drop = false;
    if (s.hang && s.hp <= 0) {
      jump = true;
      dir = 1;
    } else if (s.hang) {
      dir = s.boss > s.x + 15 ? 1 : s.boss < s.x - 15 ? -1 : 0;
      drop = Math.abs(s.x - s.boss) < 35 && s.loaded;
    } else if (s.x > 1410 && s.x < 1810) {
      if (s.x < 1470) {
        dir = 1;
        jump = s.ground;
      } else if (s.feet > 242) {
        dir = 1;
        jump = s.ground;
      } else if (s.x > 1500 && s.feet > 194) {
        dir = 1;
        jump = s.ground;
      } else if (s.x > 1620 && s.feet > 146) {
        dir = 1;
        jump = s.ground;
      }
    } else if (s.x > 3780 && s.x < 4090 && s.hp > 0) {
      dir = s.x < 3945 ? 1 : s.x > 3951 ? -1 : 0;
      jump = s.ground && Math.abs(s.x - 3948) < 18;
    } else if (s.x > 500 && s.x < 985 && !ferryLeft) {
      const ferry = s.movers[0];
      if (!ferryBoard) {
        dir = s.x < 600 ? 1 : 0;
        if (ferry.x < 680 && s.x > 590) {
          jump = !!s.ground;
          ferryBoard = true;
          dir = 1;
        }
      } else {
        dir = s.x < ferry.x + 30 ? 1 : s.x > ferry.x + 55 ? -1 : 0;
        if (ferry.x > 865 && s.ground) {
          dir = 1;
          jump = true;
          ferryLeft = true;
        }
      }
    } else {
      jump =
        s.ground &&
        (s.enemies.some(
          (e) =>
            e.x > s.x - 25 &&
            e.x < s.x + (e.kind === 'pelican' ? 125 : 180) &&
            Math.abs(e.y - s.y) < 65,
        ) ||
          s.wall ||
          (s.x > 1400 && s.x < 1490) ||
          (s.x > 1520 && s.x < 1580) ||
          (s.x > 1650 && s.x < 1710) ||
          (s.x > 120 && s.x < 200) ||
          (s.x > 1800 && s.x < 1970) ||
          (s.x > 2700 && s.x < 2920));
    }
    const hold = s.x > 1450 && s.x < 1810 ? 1000 : 430;
    if (jump && s.time - lastJump < hold + 130) jump = false;
    if (jump) lastJump = s.time;
    if (s.time - lastJump < hold) jump = true;
    await key(
      'Shift',
      !((s.x > 500 && s.x < 985) || (s.x > 1400 && s.x < 1810) || s.x > 3780),
    );
    await key('ArrowRight', dir > 0);
    await key('ArrowLeft', dir < 0);
    await key('Space', jump);
    if (drop) await page.keyboard.press('ArrowDown');
    if (i - lastShot >= 120 || drop) {
      await page.screenshot({ path: `${SHOTS}/quay-${i}.png` });
      lastShot = i;
    }
    await page.waitForTimeout(50);
    if (s.lives < 3) throw Error('lost life');
  }
  const final = await state();
  assert.equal(final.mode, 'clear');
  assert.equal(final.hp, 0);
  assert.equal(final.lives, 3);
  await page.screenshot({ path: `${SHOTS}/quay-clear.png` });
  console.log(
    'Controls-only spawn to exit, enemies active, 3 lives, no teleports or invulnerability',
  );
} finally {
  await browser.close();
}
