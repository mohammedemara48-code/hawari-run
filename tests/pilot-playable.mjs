// Full controls-only journeys. State is read for steering; no position, health,
// enemy, puzzle or thirst writes after selecting a level at its normal spawn.
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { SHOTS } from './browser-paths.mjs';
const b = await chromium.launch({ args: ['--no-sandbox'] });
try {
  for (const index of (process.env.PILOT_LEVELS || '0,28,32')
    .split(',')
    .map(Number)) {
    const page = await b.newPage({ viewport: { width: 844, height: 390 } });
    await page.addInitScript(() =>
      window.localStorage.setItem('hawari-seen-version', '999'),
    );
    await page.goto(process.env.GAME_URL || 'http://localhost:5173');
    await page.waitForFunction(
      () => window.hawari?.scene.getScene('alley')?.hero,
    );
    await page.evaluate(
      ({ i, checkpoint }) =>
        window.hawari.scene.getScene('alley').startLevel(i, { checkpoint }),
      { i: index, checkpoint: process.env.PILOT_CHECKPOINT === '1' },
    );
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
    let jumpUntil = 0,
      lastJump = -1000,
      lastDown = -1000,
      reachedFlag = false;
    const detour =
      index === 0
        ? [
            { x: 246, feet: 312 },
            { x: 247, feet: 240 },
            { x: 251, feet: 168 },
            { x: 255, feet: 96 },
            { x: 262, feet: 96 },
          ]
        : index === 32
          ? [
              { x: 76, feet: 288 },
              { x: 83, feet: 216 },
              { x: 97, feet: 144 },
              { x: 104, feet: 144 },
            ]
          : [
              { x: 357, feet: 240 },
              { x: 362, feet: 168 },
              { x: 368, feet: 120 },
            ];
    let waypoint = 0;
    const ridden = new Set(),
      samples = [],
      start = Date.now();
    for (let tick = 0; tick < 1600; tick++) {
      const s = await page.evaluate(() => {
        const s = window.hawari.scene.getScene('alley'),
          b = s.hero.body;
        const col = Math.floor(b.center.x / 24),
          row = Math.floor((b.bottom + 2) / 24);
        const surface = [];
        const abyss = [];
        for (let d = 0; d < 5; d++) {
          let supported = false;
          for (let r = row; r < s.L.rows; r++) {
            if ('#=-~ف'.includes(s.L.at(col + d, r))) supported = true;
          }
          abyss.push(!supported);
        }
        for (let d = 0; d < 8; d++) surface.push(s.L.at(col + d, row));
        return {
          now: s.elapsed * 1000,
          exit: s.spec.exit.x,
          checkpointX: s.spec.checkpoint.x,
          secret: s.secretFound,
          x: s.hero.x,
          y: s.hero.y,
          feet: b.bottom,
          vy: b.velocity.y,
          ground: b.blocked.down || b.touching.down || s.riding,
          riding: s.riding,
          wall: b.blocked.right,
          mode: s.mode,
          lives: s.lives,
          cp: s.checkpoint,
          power: s.power,
          thirst: s.siwa?.thirst,
          cause: s.lastHurtBy,
          surface,
          abyss,
          col,
          row,
          enemies: s.enemies
            .getChildren()
            .filter((e) => e.active)
            .map((e) => ({ x: e.x, y: e.y })),
          puzzle: s.landmark
            ? {
                values: s.landmark.values,
                stations: s.L.meta.landmark.stations,
                target: s.L.meta.landmark.target,
              }
            : null,
          camels:
            s.siwa?.camels.map((c) => ({
              x: c.img.x,
              min: c.min,
              max: c.max,
              top: c.img.body.top,
            })) || [],
        };
      });
      if (tick % 40 === 0 || s.mode === 'dead')
        console.log(index, tick, JSON.stringify(s));
      if (s.cp) reachedFlag = true;
      if (s.mode === 'dead') {
        for (const k of [...held]) await key(k, false);
        lastJump = -1000;
        lastDown = -1000;
        jumpUntil = 0;
        await page.waitForTimeout(150);
        continue;
      }
      if (s.mode !== 'play') {
        console.log('NONPLAY', JSON.stringify(s));
        assert.equal(s.mode, 'clear');
        break;
      }
      assert.ok(s.lives > 0, 'no game over');
      let dir = 1,
        run = true,
        jump = false,
        down = false;
      if (index === 0) run = true;
      if (index === 28 && !s.cp && s.x > 208 * 24 && s.x < 217 * 24) {
        dir = s.x > 209 * 24 + 12 ? -1 : 0;
        run = false;
      }
      // Board any camel from the near bank, stand still while it crosses,
      // jump to the receiving bank. Every crossing is made with actual keys.
      const ci = s.camels.findIndex(
        (c) => s.x > c.min - 120 && s.x < c.max + 112,
      );
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
        } else {
          dir = s.x < c.x + 35 ? 1 : 0;
          jump = s.ground && s.x > c.x - 55;
        }
      } else if (s.puzzle) {
        const i = s.puzzle.stations.findIndex(
          (col, i) => s.puzzle.values[i] !== s.puzzle.target[i],
        );
        if (i >= 0) {
          const x = s.puzzle.stations[i] * 24 + 12;
          if (s.x > x + 23) {
            dir = -1;
          }
          if (Math.abs(s.x - x) < 23) {
            dir = 0;
            run = false;
            if (s.now - lastDown > 220) {
              down = true;
              lastDown = s.now;
            }
          }
        }
      }
      if (s.x > s.exit + 15) {
        dir = -1;
        run = false;
      }
      const gap = s.abyss.slice(1, 3).some(Boolean);
      const enemy = s.enemies.some(
        (e) =>
          e.x > s.x - 12 &&
          e.x < s.x + 125 &&
          e.y > s.feet - 36 &&
          e.y < s.feet + 18,
      );
      if (ci < 0 && s.ground && (s.wall || enemy || gap)) jump = true;

      const route = process.env.PILOT_SECRETS === '1' ? detour[waypoint] : null;
      if (route && s.x > (detour[0].x - 6) * 24) {
        const tx = route.x * 24 + 12;
        run = false;
        dir = Math.abs(tx - s.x) < 9 ? 0 : Math.sign(tx - s.x);
        jump = s.ground && (s.feet > route.feet + 10 || s.wall);
        if (Math.abs(tx - s.x) < 15 && Math.abs(s.feet - route.feet) < 12)
          waypoint++;
      }
      if (
        !s.cp &&
        s.x > s.checkpointX - 100 &&
        s.x < s.checkpointX + 180 &&
        ci < 0
      ) {
        const delta = s.checkpointX - s.x;
        dir = Math.abs(delta) < 8 ? 0 : Math.sign(delta);
        run = false;
        jump = false;
        jumpUntil = 0;
      }
      if (s.vy > 0) jumpUntil = 0;
      if (jump && s.ground && !held.has('Space') && s.now - lastJump > 450) {
        jumpUntil = Infinity;
        lastJump = s.now;
      }
      await key('ArrowDown', down);
      await key('Shift', run);
      await key('ArrowRight', dir > 0);
      await key('ArrowLeft', dir < 0);
      await key('Space', s.now < jumpUntil);
      if (tick % 250 === 0)
        await page.screenshot({
          path: `${SHOTS}/pilot-${index + 1}-${tick}.png`,
        });
      samples.push(s);
      await page.waitForTimeout(16);
    }
    const end = await page.evaluate(() => {
      const s = window.hawari.scene.getScene('alley');
      return {
        mode: s.mode,
        lives: s.lives,
        elapsed: s.elapsed,
        secret: s.secretFound,
        thirst: s.siwa?.thirst,
      };
    });
    console.log(
      'END',
      index,
      JSON.stringify({
        end,
        reachedFlag,
        ridden: [...ridden],
        wallSeconds: (Date.now() - start) / 1000,
      }),
    );
    assert.equal(end.mode, 'clear');
    if (process.env.PILOT_SECRETS === '1')
      assert.equal(end.secret, true, 'optional secret reached using keys');
    assert.ok(reachedFlag);
    assert.ok(
      end.lives >= 1,
      'journey finishes within the normal three-life budget',
    );
    if (index === 28)
      assert.equal(ridden.size, process.env.PILOT_CHECKPOINT === '1' ? 1 : 2);
    await page.screenshot({ path: `${SHOTS}/pilot-${index + 1}-clear.png` });
    await page.close();
  }
} finally {
  await b.close();
}
