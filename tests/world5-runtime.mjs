// Runtime check of World 5 (الأقصر): the road opens after ريّس النوة, the
// Luxor throwing stick (start pickup, throw, spin), the three health tiers,
// telegraphed pillars and sand, the stick crate before the ram, and a fair
// stomp on «الكبش الحارس», driven in the real scene. Screenshots go to
// /workspace/hawari-shots/19-luxor-*.png.
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
// Worlds 1–4 cleared: Luxor is open.
await page.addInitScript(() => {
  if (window.sessionStorage.getItem('seeded')) return;
  window.sessionStorage.setItem('seeded', '1');
  window.localStorage.clear();
  window.localStorage.setItem('hawari-seen-version', '999');
  const ids = [
    'lanterns',
    'market',
    'roofs',
    'metro',
    'fields',
    'canals',
    'saqia',
    'jurn',
    'furniture',
    'workshop',
    'harbor',
    'rasbar',
    'corniche',
    'tram',
    'stanley',
    'qaitbay',
  ];
  window.localStorage.setItem(
    'hawari-progress',
    JSON.stringify({
      unlocked: 16,
      best: {},
      coins: {},
      secrets: {},
      cleared: Object.fromEntries(ids.map((i) => [i, true])),
    }),
  );
});
await page.goto(process.env.GAME_URL || 'http://localhost:5173/');
await page.waitForFunction(
  () => window.hawari?.scene.getScene('alley')?.hero,
  null,
  { timeout: 20000 },
);
const wait = (ms) => page.waitForTimeout(ms);
const ev = (fn, arg) => page.evaluate(fn, arg);
await ev(() => {
  const s = window.hawari.scene.getScene('alley');
  window.T = {
    s,
    go(i, keepEnemies = false) {
      s.score = 0;
      s.lives = 9;
      s.power = 0;
      s.checkpoint = false;
      s.startLevel(i);
      s.remaining = 999;
      if (!keepEnemies) s.enemies.clear(true, true);
    },
    place(x, feet, vy = 0) {
      const b = s.hero.body;
      const half = s.hero.y - b.bottom;
      b.reset(x, feet - 26 + half);
      s.hero.setVelocity(0, vy);
      s.cameras.main.centerOn(x, feet - 80);
    },
  };
});
const shot = (name) =>
  page.screenshot({ path: `/workspace/hawari-shots/${name}` });
const log = (...a) => console.log('✔', ...a);

/* Map: Luxor is open and selected, its first level playable. */
await page.locator('[data-screen="title"] [data-action="start"]').click();
await wait(400);
assert.equal(await ev(() => window.T.s.mode), 'map');
assert.equal(await page.locator('.world-pin.soon').count(), 0, 'all open');
assert.equal(
  await page.locator('.world-pin.selected').getAttribute('data-world'),
  '4',
  'the map opens on Luxor',
);
assert.equal(await page.locator('.map-node:not([disabled])').count(), 1);
await page.locator('.map-node:not([disabled])').click();
await wait(600);
assert.equal(await ev(() => window.T.s.L.meta.id), 'kabbash');
log('map: Luxor open, طريق الكباش playable');

/* The throwing stick: picked up near the start, thrown, spinning. */
await ev(() => window.T.go(16, true));
await wait(300);
assert.equal(await ev(() => window.T.s.weapon().id), 'stick');
const pick = await ev(() => window.T.s.L.pickups[0]);
await ev((p) => window.T.place(p.x - 30, (p.row + 1) * 24), pick);
await page.keyboard.down('ArrowRight');
await wait(500);
await page.keyboard.up('ArrowRight');
assert.equal(await ev(() => window.T.s.power), 2, 'the stick arms بلبل');
await page.keyboard.press('x', { delay: 60 });
await wait(120);
const spin = await ev(() => {
  const sh = window.T.s.shots.getChildren().filter((o) => o.active);
  return sh.length ? { n: sh.length, key: sh[0].texture.key } : { n: 0 };
});
assert.ok(spin.n >= 1, 'the stick flies');
assert.equal(spin.key, 'stickshot');
const a0 = await ev(() => window.T.s.shots.getChildren()[0]?.angle ?? 0);
await wait(100);
const a1 = await ev(() => window.T.s.shots.getChildren()[0]?.angle ?? 0);
assert.notEqual(a0, a1, 'and spins');
await shot('19-luxor-weapon.png');
log('weapon: العصاية الفرعوني picked up, thrown, spinning');

/* Health tiers: armed → loses the stick → small → dead. */
const tier = () =>
  ev(() => {
    const s = window.T.s;
    s.hurtUntil = 0;
    s.invincible = 0;
    s.hurt('test');
    return { power: s.power, mode: s.mode };
  });
assert.deepEqual(await tier(), { power: 1, mode: 'play' }, 'hit 1: stick');
assert.deepEqual(await tier(), { power: 0, mode: 'play' }, 'hit 2: size');
assert.equal((await tier()).mode, 'dead', 'hit 3: down');
await wait(1600);
log('health: three hits when armed (stick, size, life)');

/* Each level: start clear of enemies and with a stick pickup. */
const levels = [
  [16, 'kabbash', 60],
  [17, 'nile', 40],
  [18, 'valley', 30],
  [19, 'karnak', 30],
];
for (const [i, id, col] of levels) {
  await ev((i) => window.T.go(i, true), i);
  await wait(400);
  const info = await ev(() => {
    const s = window.T.s;
    const sx = s.spec.start.x;
    return {
      id: s.L.meta.id,
      near: s.enemies
        .getChildren()
        .filter((e) => e.active && Math.abs(e.x - sx) < 14 * 24).length,
      pickups: s.L.pickups.length,
    };
  });
  assert.equal(info.id, id);
  assert.equal(info.near, 0, `${id}: nobody camps the spawn`);
  assert.ok(info.pickups >= 1, `${id}: a stick to pick up`);
  await ev((c) => {
    const s = window.T.s;
    let r = 0;
    while (r < s.L.rows && !(s.standable(c, r) && !s.standable(c, r - 1))) r++;
    window.T.place(c * 24 + 12, r * 24);
  }, col);
  await wait(700);
  await shot(`19-luxor-${id}.png`);
}
log('levels: spawn clear, stick at the start, screenshots');

/* Telegraphs in the tomb: pillar shadows blink before they slam, and the
 * floor under a ceiling crack darkens before the sand pours. */
await ev(() => window.T.go(18));
await wait(300);
let warned = false;
for (let k = 0; k < 120 && !warned; k++) {
  warned = await ev(() =>
    window.T.s.w5.pillars.some(
      (p) => p.state === 'warn' && p.mark.fillAlpha >= 0.3,
    ),
  );
  if (!warned) await wait(30);
}
assert.ok(warned, 'a shuddering pillar shows its shadow');
const crack = await ev(() => {
  const t = window.T.s.w5.sands[0];
  return { x: t.x, floor: t.mark.y + 2 };
});
await ev((c) => {
  window.T.s.hurtUntil = window.T.s.time.now + 1e8;
  window.T.place(c.x, c.floor);
}, crack);
let marked = false;
for (let k = 0; k < 30 && !marked; k++) {
  marked = await ev(() => {
    const t = window.T.s.w5.sands[0];
    return !!t.pourAt && t.mark.fillAlpha > 0;
  });
  if (!marked) await wait(25);
}
assert.ok(marked, 'the sand spot is marked before it pours');
log('telegraphs: pillar shadows, sand spots');

/* Karnak: one stick crate before the arena; the ram can be stomped.
 * The court is just the ram and one telegraphed falling stone. */
await ev(() => window.T.go(19));
await wait(300);
assert.equal(await ev(() => window.T.s.L.armories.length), 1, 'stick crate');
await ev(() => {
  const s = window.T.s;
  s.hurtUntil = s.time.now + 1e8;
  window.T.place(s.L.boss.x - 140, 12 * 24);
});
let active = false;
for (let k = 0; k < 80 && !active; k++) {
  active = await ev(() => !!window.T.s.bossState.active);
  if (!active) {
    await page.keyboard.down('ArrowRight');
    await wait(50);
    await page.keyboard.up('ArrowRight');
  }
}
assert.ok(active, 'the ram wakes');
const court = await ev(() => {
  const s = window.T.s,
    lo = s.bossState.arenaX;
  return {
    mummies: s.enemies
      .getChildren()
      .filter((e) => e.active && e.getData('kind') === 'mummy' && e.x >= lo)
      .length,
    pillars: (s.w5?.pillars || []).filter((p) => p.arena).length,
  };
});
assert.equal(court.mummies, 0, 'no mummies in the ram court');
assert.equal(court.pillars, 0, 'no crushing pillars in the ram court');
// One telegraphed sand clump to the side of the hero, after a slam.
await ev(() => {
  const s = window.T.s,
    st = s.bossState,
    b = s.boss;
  st.state = 'rear';
  st.until = s.time.now + 80;
  b.setData('next', 'slam');
  b.setVelocity(0, 0);
  window.T.place(b.x - 180, 12 * 24);
});
await wait(400);
await shot('22-karnak-calm.png');
let sand = { n: 0, dx: 0 };
for (let k = 0; k < 40 && sand.n === 0; k++) {
  sand = await ev(() => {
    const s = window.T.s;
    const clumps = s.hazards
      .getChildren()
      .filter((h) => h.active && h.getData('kind') === 'sand');
    return {
      n: clumps.length,
      dx: clumps.length ? Math.abs(clumps[0].x - s.hero.x) : 0,
    };
  });
  if (sand.n === 0) await wait(40);
}
assert.equal(sand.n, 1, 'one falling stone after a slam');
assert.ok(sand.dx >= 30, `the stone lands to the side (${sand.dx | 0}px)`);
const hp0 = await ev(() => window.T.s.bossState.hp);
await ev(() => {
  const s = window.T.s,
    st = s.bossState,
    b = s.boss;
  st.state = 'bowed';
  st.until = s.time.now + 4000;
  st.invuln = 0;
  b.setVelocity(0, 0);
  window.T.place(b.x, b.body.top - 30, 260);
});
await wait(500);
assert.ok(
  (await ev(() => window.T.s.bossState.hp)) < hp0,
  'stomping the bowed brow hurts the ram',
);
await shot('19-luxor-ram-stomp.png');
log('karnak: stick crate, calm court, one sand, ram stomped while bowed');

/* World 4 boss down → the road opens to Luxor. */
await ev(() => window.T.go(15));
await wait(400);
await ev(() => {
  const s = window.T.s;
  s.hurtUntil = s.time.now + 1e8;
  window.T.place(s.L.boss.x - 100, s.L.boss.y);
});
for (let k = 0; k < 60; k++) {
  if (await ev(() => !!window.T.s.bossState.active)) break;
  await wait(50);
}
await ev(() => {
  const s = window.T.s;
  s.bossState.invuln = 0;
  s.bossDamage(s.bossState.hp);
});
await wait(2500);
await ev(() => {
  const s = window.T.s;
  window.T.place(s.spec.exit.x, s.spec.exit.y - 1);
});
await wait(600);
assert.equal(await ev(() => window.T.s.mode), 'clear', 'world 4 done');
assert.match(
  await page.locator('#clear-title').textContent(),
  /الأقصر/,
  'the road opens to Luxor',
);
log('qaitbay boss → on to Luxor');

assert.deepEqual(
  errors.filter((e) => !/ResizeObserver|AudioContext/.test(e)),
  [],
  'no console errors',
);
await browser.close();
console.log('world 5 runtime: all good');
