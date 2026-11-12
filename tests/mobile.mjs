// Landscape phone: analog stick + jump + chili, with real multi-touch via CDP.
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const b = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const p = await b.newPage({
  viewport: { width: 844, height: 390 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 2,
});
const errors = [];
p.on('pageerror', (e) => errors.push(e.message));
await p.goto(process.env.GAME_URL || 'http://localhost:5173');
await p.waitForFunction(() => window.hawari?.scene.getScene('alley')?.hero);
await p.locator('[data-screen="title"] button').click();
await p.waitForTimeout(150);
assert.equal(await p.locator('.touch-controls').isVisible(), true);
assert.equal(
  await p.locator('[data-touch="left"], [data-touch="right"]').count(),
  0,
  'arrow buttons are gone',
);
const cdp = await p.context().newCDPSession(p);
const touches = new Map();
const send = (type) =>
  cdp.send('Input.dispatchTouchEvent', {
    type,
    touchPoints: [...touches.entries()].map(([id, [x, y]]) => ({
      id,
      x,
      y,
      radiusX: 8,
      radiusY: 8,
      force: 1,
    })),
  });
const down = async (id, x, y) => {
  touches.set(id, [x, y]);
  await send('touchStart');
};
const move = async (id, x, y, steps = 6) => {
  const [x0, y0] = touches.get(id);
  for (let i = 1; i <= steps; i++) {
    touches.set(id, [x0 + ((x - x0) * i) / steps, y0 + ((y - y0) * i) / steps]);
    await send('touchMove');
    await p.waitForTimeout(16);
  }
};
const up = async (id) => {
  const pt = touches.get(id);
  touches.delete(id);
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [...touches.entries()].map(([i, [x, y]]) => ({ id: i, x, y })),
  });
  return pt;
};
const center = async (sel) => {
  const r = await p.locator(sel).boundingBox();
  return [r.x + r.width / 2, r.y + r.height / 2, r];
};
const st = () =>
  p.evaluate(() => {
    const s = window.hawari.scene.getScene('alley');
    return {
      x: s.hero.x,
      y: s.hero.y,
      vx: s.hero.body.velocity.x,
      grounded: s.hero.body.blocked.down,
      pose: s.hero.getData('pose'),
      shots: s.shots.getLength(),
      power: s.power,
    };
  });
const reset = (x = 160, power = 0) =>
  p.evaluate(
    ([x, power]) => {
      const s = window.hawari.scene.getScene('alley');
      s.enemies.clear(true, true);
      s.setPower(power, false);
      s.hero.body.reset(x, 312 - s.hero.height / 2);
      s.hero.setVelocity(0, 0);
    },
    [x, power],
  );
// Sizes: comfortable thumb targets inside the safe area.
const [, , jumpBox] = await center('[data-touch="jump"]');
const [, , chiliBox] = await center('[data-touch="throw"]');
const [, , baseBox] = await center('.stick-base');
console.log('sizes', {
  jump: jumpBox.width,
  chili: chiliBox.width,
  stick: baseBox.width,
});
assert.ok(jumpBox.width >= 66 && chiliBox.width >= 52 && baseBox.width >= 96);
assert.ok(
  jumpBox.x + jumpBox.width <= 844 && jumpBox.y + jumpBox.height <= 390,
);
// 1. Small push past the deadzone walks; tiny push stays inside the deadzone.
await reset();
const [sx, sy] = await center('.stick-base');
await down(1, sx, sy);
await move(1, sx + 6, sy);
await p.waitForTimeout(150);
assert.equal(
  Math.round((await st()).vx),
  0,
  'deadzone ignores a resting thumb',
);
await move(1, sx + 28, sy);
await p.waitForTimeout(450);
const walk = await st();
assert.ok(walk.vx > 120 && walk.vx < 170, `half push walks (vx=${walk.vx})`);
// 2. Pushing far runs.
await move(1, sx + 60, sy);
await p.waitForTimeout(450);
const run = await st();
assert.ok(run.vx > 220, `far push runs (vx=${run.vx})`);
assert.equal(await p.locator('.stick-zone.running').count(), 1);
// 3. Pushing down crouches.
await move(1, sx, sy + 50);
await p.waitForTimeout(350);
assert.equal((await st()).pose, 'crouch', 'stick down crouches');
await up(1);
await p.waitForTimeout(150);
// 3b. Stick up is a jump: flick vs hold (variable height), no auto-repeat.
const peakOf = async (holdMs) => {
  await reset();
  await p.waitForTimeout(120);
  await down(1, sx, sy);
  await move(1, sx, sy - 50, 1);
  if (holdMs === 0) await move(1, sx, sy, 1); // quick flick
  const t0 = Date.now();
  let peak = 999,
    released = holdMs === 0;
  while (Date.now() - t0 < 750) {
    if (!released && Date.now() - t0 > holdMs) {
      await move(1, sx, sy, 2);
      released = true;
    }
    peak = Math.min(peak, (await st()).y);
    await p.waitForTimeout(16);
  }
  await up(1);
  return peak;
};
const flick = await peakOf(0),
  held = await peakOf(700);
console.log('stick-up peaks', {
  flick: Math.round(flick),
  held: Math.round(held),
});
assert.ok(flick < 270, 'flicking up jumps');
assert.ok(flick - held > 25, 'holding up jumps higher (variable height)');
// Holding up after landing must not bounce again until the thumb re-centres.
await reset();
await p.waitForTimeout(120);
await down(1, sx, sy);
await move(1, sx, sy - 50, 3);
await p.waitForTimeout(1300);
const stillHeld = await st();
assert.ok(stillHeld.grounded, 'no auto-repeat jump while up is held');
await move(1, sx, sy - 5, 3);
await p.waitForTimeout(60);
await move(1, sx, sy - 50, 3);
await p.waitForTimeout(150);
assert.ok(!(await st()).grounded, 're-centre then up jumps again');
await up(1);
await p.waitForTimeout(900);
// Diagonal up-right: jump while moving.
await reset();
await p.waitForTimeout(120);
await down(1, sx, sy);
await move(1, sx + 30, sy - 40, 3);
await p.waitForTimeout(200);
const diag = await st();
assert.ok(
  !diag.grounded && diag.vx > 100,
  `diagonal up-right jumps while moving (vx=${diag.vx})`,
);
await up(1);
await p.waitForTimeout(900);
console.log('PASS: stick up = jump (flick, hold, no repeat, diagonal)');
// 4. Chili button is dim and inert without the chili power.
await reset(160, 0);
const [cx, cy] = await center('[data-touch="throw"]');
assert.equal(
  await p.locator('[data-touch="throw"].off').count(),
  1,
  'chili dim without power',
);
await down(3, cx, cy);
await p.waitForTimeout(80);
await up(3);
assert.equal((await st()).shots, 0);
// 5. Multi-touch: move + jump + throw at the same time.
await reset(160, 2);
await p.waitForTimeout(100);
assert.equal(
  await p.locator('[data-touch="throw"].off').count(),
  0,
  'chili lit with power',
);
const [jx, jy] = await center('[data-touch="jump"]');
const x0 = (await st()).x;
await down(1, sx, sy);
await move(1, sx + 30, sy);
await p.waitForTimeout(120);
await move(1, sx + 28, sy - 42, 2); // up-right on the stick = jump
await p.waitForTimeout(40);
await down(3, cx, cy); // chili with the other thumb
await p.waitForTimeout(110);
const multi = await st();
await p.screenshot({ path: '/workspace/hawari-shots/09-joystick.png' });
assert.ok(
  !multi.grounded && multi.y < 275,
  'jumped from the stick while moving',
);
assert.ok(multi.shots >= 1, 'threw chili while moving and jumping');
assert.ok(multi.x > x0 + 15, 'kept moving during jump and throw');
await up(3);
await up(1);
await p.waitForTimeout(900);
// The optional jump button still works together with the stick.
await reset(160, 2);
await p.waitForTimeout(120);
await down(1, sx, sy);
await move(1, sx + 30, sy);
await p.waitForTimeout(100);
await down(2, jx, jy);
await p.waitForTimeout(120);
const btn = await st();
assert.ok(!btn.grounded && btn.vx > 100, 'jump button + stick move together');
await up(2);
await up(1);
// 6. No page scroll or zoom from play gestures.
const vp = await p.evaluate(() => ({
  sx: window.scrollX,
  sy: window.scrollY,
  scale: window.visualViewport.scale,
}));
assert.deepEqual(vp, { sx: 0, sy: 0, scale: 1 });
console.log(
  'PASS mobile joystick: walk',
  Math.round(walk.vx),
  'run',
  Math.round(run.vx),
  'multi-touch ok, fps=',
  await p.evaluate(() => Math.round(window.hawari.loop.actualFps)),
);
assert.deepEqual(errors, []);
await b.close();
