// قلعة قايتباي with the enemies on, on a phone in landscape: the beach
// balls keep to their own stretch, storm gulls leave the checkpoint alone,
// and the boss arena keeps بلبل on screen.
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox'],
});
const ctx = await browser.newContext({
  viewport: { width: 844, height: 390 },
  isMobile: true,
  hasTouch: true,
});
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.addInitScript(() => {
  window.localStorage.clear();
  window.localStorage.setItem('hawari-seen-version', '999');
});
await page.goto(process.env.GAME_URL || 'http://localhost:5173/');
await page.waitForFunction(
  () => window.hawari?.scene.getScene('alley')?.hero,
  null,
  { timeout: 20000 },
);
const wait = (ms) => page.waitForTimeout(ms);
const ev = (fn, arg) => page.evaluate(fn, arg);
await page.locator('[data-screen="title"] [data-action="start"]').tap();
await page.locator('.map-node[data-node="0"]').tap();
await wait(200);
const go = (fromCheckpoint) =>
  ev((cp) => {
    const s = window.hawari.scene.getScene('alley');
    window.S = s;
    s.lives = 9;
    s.power = 0;
    s.startLevel(15);
    if (cp) {
      s.checkpoint = true;
      s.loadLevel();
      s.mode = 'play';
    }
    s.hurtUntil = s.time.now + 1e9;
    s.hero.body.moves = false;
  }, fromCheckpoint);

// 1. Beach balls bounce about but never roll off their ledge into the
// tide pools or down onto the path below.
await go(true);
const balls = () =>
  ev(() =>
    window.S.enemies
      .getChildren()
      .filter((e) => e.active && e.getData('kind') === 'ball')
      .map((e) => {
        const h = e.getData('home');
        const sea = window.S.L.seas.some(
          (k) => e.x >= k.x0 && e.x <= k.x1 && e.y >= k.top,
        );
        return {
          home: Math.round(h.x / 24),
          x: e.x / 24,
          drop: (e.y - h.y) / 24,
          sea,
        };
      }),
  );
const n0 = (await balls()).length;
assert.ok(n0 >= 1, 'beach balls on the level');
for (let i = 0; i < 12; i++) {
  await wait(1000);
  for (const b of await balls()) {
    assert.ok(
      !b.sea,
      `ball from col ${b.home} fell in the sea at ${b.x.toFixed(1)}`,
    );
    assert.ok(
      b.drop < 3,
      `ball from col ${b.home} rolled off its ledge (${b.drop.toFixed(1)} rows down)`,
    );
  }
}
assert.equal((await balls()).length, n0, 'no ball lost');

// 2. A storm gull over the checkpoint doesn't dive-bomb the respawn.
await go(true);
const dived = await ev(async () => {
  const s = window.S;
  const cp = s.spawnX();
  const g = s.enemies.getChildren().find((e) => e.getData('kind') === 'skua');
  const home = { x: cp + 40, y: s.hero.y - 150 };
  g.setData('home', home).setData('state', 'walk').setData('until', 0);
  g.body.reset(home.x, home.y);
  let dive = false;
  await new Promise((r) => {
    const t0 = window.performance.now();
    const tick = () => {
      if (g.getData('state') === 'dive') dive = true;
      if (window.performance.now() - t0 > 2500) r();
      else window.requestAnimationFrame(tick);
    };
    tick();
  });
  return dive;
});
assert.equal(dived, false, 'gull dived at the checkpoint');

// 3. Once «ريّس النوة» wakes up, بلبل can't walk (or be blown) out of the
// arena and off the locked camera.
await go(true);
const arena = await ev(async () => {
  const s = window.S;
  s.hero.body.moves = true;
  const x0 = s.bossState.arenaX;
  s.hero.body.reset(x0 + 24 * 5, 9 * 24);
  await new Promise((r) => setTimeout(r, 400));
  const active = s.bossState.active;
  s.hero.body.reset(x0 - 60, 9 * 24);
  s.hero.setVelocityX(-245);
  await new Promise((r) => setTimeout(r, 300));
  return { active, x: s.hero.x, lo: x0, cam: s.cameras.main.scrollX };
});
assert.ok(arena.active, 'boss fight started');
assert.ok(
  arena.x >= arena.lo + 10,
  `hero left the arena: ${arena.x} < ${arena.lo}`,
);
assert.ok(arena.x >= arena.cam, 'hero on screen');

// 4. v2.0.5: he calls in no gulls for the last round (one danger at a
// time), and nothing dives at بلبل while he is bouncing off the boss.
const quick = await ev(async () => {
  const s = window.S;
  s.bossState.hp = 3;
  s.hero.body.reset(s.boss.x, s.boss.y - 60);
  const skuas = () =>
    s.enemies
      .getChildren()
      .filter((e) => e.active && e.getData('kind') === 'skua').length;
  const base = skuas();
  s.bossDamage(1);
  const t0 = window.performance.now();
  let dive = false,
    called = 0;
  await new Promise((r) => {
    const tick = () => {
      const g = s.enemies
        .getChildren()
        .filter((e) => e.active && e.getData('kind') === 'skua');
      called = Math.max(called, g.length - base);
      if (g.some((e) => e.getData('state') === 'dive')) dive = true;
      if (window.performance.now() - t0 > 1200) r();
      else window.requestAnimationFrame(tick);
    };
    tick();
  });
  return { dive, called, phase: s.bossPhase() };
});
assert.equal(quick.phase, 3);
assert.equal(quick.called, 0, 'no gulls called in for the last round');
assert.equal(quick.dive, false, 'called-in gull dived straight away');

assert.deepEqual(errors, []);
console.log('alex4-playable ok');
await browser.close();
