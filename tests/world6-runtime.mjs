// Runtime check of World 6 (أسوان): an old save that cleared Karnak (its
// stored frontier stuck at the old last level) opens Aswan; the palm frond
// (start pickup, throw, spin); crocodiles gape before they lunge; a lever
// lifts a dam gate; the frond crate before the boss; the great crocodile is
// only him plus at most one splash wave, and can be stomped while his jaws
// are stuck. Screenshots go to /workspace/hawari-shots/23-aswan-*.png.
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
// Worlds 1–5 cleared on an older build: unlocked was capped at 19.
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
    'kabbash',
    'nile',
    'valley',
    'karnak',
  ];
  window.localStorage.setItem(
    'hawari-progress',
    JSON.stringify({
      unlocked: 19,
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
const floorAt = (c) =>
  ev((c) => {
    const s = window.T.s;
    let r = 0;
    while (r < s.L.rows && !(s.standable(c, r) && !s.standable(c, r - 1))) r++;
    return r * 24;
  }, c);

/* Map: the old save opens Aswan and its first level. */
await page.locator('[data-screen="title"] [data-action="start"]').click();
await wait(400);
assert.equal(await ev(() => window.T.s.mode), 'map');
assert.equal(
  await page.locator('.world-pin.selected').getAttribute('data-world'),
  '5',
  'the map opens on Aswan',
);
assert.equal(await page.locator('.map-node:not([disabled])').count(), 1);
await shot('23-aswan-map.png');
await page.locator('.map-node:not([disabled])').click();
await wait(600);
assert.equal(await ev(() => window.T.s.L.meta.id), 'nubia');
log('map: old save → Aswan open, نجع النوبة playable');

/* The palm frond: picked up near the start, thrown, spinning. */
await ev(() => window.T.go(20, true));
await wait(300);
assert.equal(await ev(() => window.T.s.weapon().id), 'frond');
const pick = await ev(() => window.T.s.L.pickups[0]);
await ev((p) => window.T.place(p.x - 30, (p.row + 1) * 24), pick);
await page.keyboard.down('ArrowRight');
await wait(500);
await page.keyboard.up('ArrowRight');
assert.equal(await ev(() => window.T.s.power), 2, 'the frond arms بلبل');
await page.keyboard.press('x', { delay: 60 });
await wait(120);
const spin = await ev(() => {
  const sh = window.T.s.shots.getChildren().filter((o) => o.active);
  return sh.length ? { n: sh.length, key: sh[0].texture.key } : { n: 0 };
});
assert.ok(spin.n >= 1, 'the frond flies');
assert.equal(spin.key, 'frondshot');
const a0 = await ev(() => window.T.s.shots.getChildren()[0]?.angle ?? 0);
await wait(100);
const a1 = await ev(() => window.T.s.shots.getChildren()[0]?.angle ?? 0);
assert.notEqual(a0, a1, 'and spins');
log('weapon: سعف النخل picked up, thrown, spinning');

/* Each level: start clear of enemies, a frond pickup, bright (no dark). */
const levels = [
  [20, 'nubia', 64],
  [21, 'feluccas', 60],
  [22, 'dam', 58],
  [23, 'crocisland', 60],
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
      dark: s.L.meta.dark,
    };
  });
  assert.equal(info.id, id);
  assert.equal(info.near, 0, `${id}: nobody camps the spawn`);
  assert.ok(info.pickups >= 1, `${id}: a frond to pick up`);
  assert.equal(info.dark, 0, `${id}: bright`);
  const feet = await floorAt(col);
  await ev((a) => window.T.place(a[0] * 24 + 12, a[1]), [col, feet]);
  await wait(700);
  if (id === 'nubia') await shot('23-aswan-village.png');
}
log('levels: spawn clear, frond at the start, bright');

/* A crocodile gapes (tell) before it lunges. */
await ev(() => window.T.go(20, true));
await wait(300);
const croc = await ev(() => {
  const e = window.T.s.enemies
    .getChildren()
    .find((o) => o.active && o.getData('kind') === 'croc');
  return { x: e.x, y: e.body.bottom };
});
await ev((c) => {
  window.T.s.hurtUntil = window.T.s.time.now + 1e8;
  window.T.place(c.x - 110, c.y);
}, croc);
let gaped = false;
for (let k = 0; k < 40 && !gaped; k++) {
  gaped = await ev(() =>
    window.T.s.enemies
      .getChildren()
      .some(
        (o) => o.getData('kind') === 'croc' && o.getData('state') === 'gape',
      ),
  );
  if (!gaped) await wait(30);
}
assert.ok(gaped, 'the crocodile opens its jaws first');
log('croc: gape before lunge');

/* Feluccas on the Nile with a crocodile on a midstream rock. */
await ev(() => window.T.go(21, true));
await wait(300);
const boat = await ev(() => {
  const m = window.T.s.moverList.find((q) => q.boat && q.img.x > 70 * 24);
  return { x: m.img.x + 30, y: m.img.body.top };
});
await ev((b) => {
  window.T.s.hurtUntil = window.T.s.time.now + 1e8;
  window.T.place(b.x, b.y);
}, boat);
await wait(900);
assert.equal(
  await ev(() => window.T.s.w5?.sails.length > 0),
  true,
  'feluccas carry lateen sails',
);
await shot('23-aswan-felucca-croc.png');
log('feluccas: riding a felucca past the crocodile rock');

/* The dam: touching the lever lifts the next sluice gate. */
await ev(() => window.T.go(22, true));
await wait(300);
assert.ok(
  (await ev(() => window.T.s.w4?.waves.length)) >= 4,
  'spillway bursts',
);
const lever = await ev(() => {
  const l = window.T.s.w5.doors[0].lever;
  return { x: l.x, y: l.y };
});
await ev((l) => window.T.place(l.x, l.y), lever);
await wait(300);
assert.equal(await ev(() => window.T.s.w5.doors[0].open), true, 'gate up');
log('dam: lever lifts the gate, spillways on a beat');

/* Crocodile island: a frond crate, then the boss. */
await ev(() => window.T.go(23));
await wait(300);
assert.equal(await ev(() => window.T.s.L.armories.length), 1, 'frond crate');
await ev(() => {
  const s = window.T.s;
  s.hurtUntil = s.time.now + 1e8;
  window.T.place(s.L.boss.x - 160, 12 * 24);
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
assert.ok(active, 'the crocodile wakes');
// Let him fight for a while (phase 2, with tail waves): never more than
// one wave and no other enemies in the arena.
await ev(() => {
  const s = window.T.s;
  s.bossState.hp = 4;
  s.hurtUntil = s.time.now + 1e8;
  s.invincible = s.time.now + 1e8;
});
let maxWaves = 0,
  others = 0,
  sawWave = false;
for (let k = 0; k < 90; k++) {
  const r = await ev(() => {
    const s = window.T.s,
      lo = s.bossState.arenaX;
    return {
      w: s.hazards.getChildren().filter((h) => h.active).length,
      e: s.enemies.getChildren().filter((e) => e.active && e.x >= lo).length,
    };
  });
  maxWaves = Math.max(maxWaves, r.w);
  others = Math.max(others, r.e);
  if (r.w) sawWave = true;
  if (k === 30) await shot('23-aswan-boss.png');
  await wait(100);
}
assert.ok(maxWaves <= 1, `at most one splash wave at a time (${maxWaves})`);
assert.equal(others, 0, 'nothing else in the arena');
console.log('  saw a splash wave:', sawWave);
const hp0 = await ev(() => window.T.s.bossState.hp);
await ev(() => {
  const s = window.T.s,
    st = s.bossState,
    b = s.boss;
  s.hazards.clear(true, true);
  st.state = 'stuck';
  st.until = s.time.now + 4000;
  st.invuln = 0;
  b.setVelocity(0, 0);
  window.T.place(b.x - 40, b.body.top - 30, 260);
});
await wait(500);
assert.ok(
  (await ev(() => window.T.s.bossState.hp)) < hp0,
  'stomping his head while stuck hurts the crocodile',
);
log('boss: one wave max, alone in the arena, stomped while stuck');

/* Karnak won → the road goes on to Aswan (not the ending). */
await ev(() => window.T.go(19));
await wait(400);
await ev(() => {
  const s = window.T.s;
  s.hurtUntil = s.time.now + 1e8;
  window.T.place(s.L.boss.x - 140, 12 * 24);
});
for (let k = 0; k < 60; k++) {
  if (await ev(() => !!window.T.s.bossState.active)) break;
  await page.keyboard.down('ArrowRight');
  await wait(50);
  await page.keyboard.up('ArrowRight');
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
assert.equal(await ev(() => window.T.s.mode), 'clear', 'world 5 done');
assert.match(
  await page.locator('#clear-title').textContent(),
  /أسوان/,
  'the road opens to Aswan',
);
log('karnak boss → on to Aswan');

assert.deepEqual(
  errors.filter((e) => !/ResizeObserver|AudioContext/.test(e)),
  [],
  'no console errors',
);
await browser.close();
console.log('world 6 runtime: all good');
