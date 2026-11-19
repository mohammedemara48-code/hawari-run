// Runtime check of Aswan's felucca voyage (شلال أسوان): step aboard and you
// sail instead of walking; with the wind behind, holding right runs fast;
// against the wind holding right reaches across the river until the boat
// runs aground in the reeds, and a tack (jump) frees it and heads for the
// other bank; a granite rock stops the boat on its side; a crocodile
// bubbles before it surfaces and bites a boat passing on its side; an
// autopilot that only tacks sails the whole cataract to the far jetty and
// the exit. Screenshots: /workspace/hawari-shots/26-sail-*.png.
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

const IDX = 23; // شلال أسوان
const press = async (key, ms = 60) => {
  await page.keyboard.down(key);
  await wait(ms);
  await page.keyboard.up(key);
};
await page.locator('[data-screen="title"] [data-action="start"]').click();
await wait(400);
await ev((i) => window.T.go(i, true), IDX);
await wait(400);
assert.equal(await ev(() => window.T.s.L.meta.id), 'cataract');
assert.equal(await ev(() => !!window.T.s.sail && !window.T.s.sail.on), true);
await shot('26-sail-jetty.png');
// Walk to the jetty: stepping aboard starts the voyage.
await page.keyboard.down('ArrowRight');
for (let k = 0; k < 60 && !(await ev(() => window.T.s.sail.on)); k++)
  await wait(50);
assert.equal(await ev(() => window.T.s.sail.on), true, 'boarded');
await ev(() => {
  window.T.s.hurtUntil = window.T.s.time.now + 1e8;
});
// First wind is behind: holding right, the boat gathers speed.
await wait(1800);
const tail = await ev(() => ({
  v: window.T.s.sail.v,
  dir: window.T.s.sail.wind.dir,
  x: window.T.s.sail.x,
  hx: window.T.s.hero.x,
}));
assert.equal(tail.dir, 1);
assert.ok(tail.v > 120, `runs before the wind (${tail.v})`);
assert.ok(Math.abs(tail.hx - tail.x) < 20, 'the hero rides the deck');
await shot('26-sail-tailwind.png');
log('board + tailwind run', Math.round(tail.v));
// Force a headwind: holding right reaches across until aground.
await ev(() => {
  const sl = window.T.s.sail;
  sl.t0 = window.T.s.time.now - 8000 - 10;
  sl.x = 34 * 24;
  sl.lane = 0.5;
  sl.tack = 1;
  sl.v = 0;
});
let aground = false;
for (let k = 0; k < 80 && !aground; k++) {
  aground = await ev(() => window.T.s.sail.aground);
  if (!aground) await wait(50);
}
assert.ok(aground, 'runs aground at the far bank without tacking');
const xa = await ev(() => window.T.s.sail.x);
await wait(400);
assert.ok(
  Math.abs((await ev(() => window.T.s.sail.x)) - xa) < 2,
  'aground boats stay put',
);
await shot('26-sail-aground.png');
await press('Space');
await wait(700);
const freed = await ev(() => ({
  a: window.T.s.sail.aground,
  t: window.T.s.sail.tack,
  lane: window.T.s.sail.lane,
}));
assert.equal(freed.a, false, 'a tack frees the boat');
assert.equal(freed.t, -1);
assert.ok(freed.lane < 1, 'and heads for the other bank');
await shot('26-sail-headwind.png');
log('headwind: aground in the reeds, tack frees it');
// A rock on the near side stops a boat on the near side.
await ev(() => {
  const sl = window.T.s.sail;
  sl.t0 = window.T.s.time.now; // wind behind again
  sl.x = 60 * 24 - 120;
  sl.lane = 0;
  sl.tack = -1;
  sl.v = 160;
});
await wait(1200);
const rock = await ev(() => window.T.s.sail.x);
assert.ok(rock < 60 * 24 - 30, `the rock stops the boat (${rock})`);
log('rock: near-side boulder blocks a near-side boat');
// A crocodile: bubbles first, then up.
await ev(() => {
  const sl = window.T.s.sail;
  sl.x = 94 * 24 - 320;
  sl.lane = 1;
  sl.tack = 1;
  sl.v = 0;
  window.T.s.hurtUntil = window.T.s.time.now + 1e8;
});
await page.keyboard.up('ArrowRight');
const seen = new Set();
for (let k = 0; k < 60; k++) {
  const st = await ev(
    () => window.T.s.sail.crocs.find((c) => c.x === 94 * 24).state,
  );
  seen.add(st);
  if (st === 'up') break;
  await wait(50);
}
assert.ok(seen.has('bubbles') && seen.has('up'), [...seen].join(','));
await ev(() => {
  window.T.s.sail.x = 94 * 24 - 120;
});
await wait(250);
await shot('26-sail-croc.png');
// A boat on the croc's side gets bitten.
await ev(() => {
  const s = window.T.s;
  s.hurtUntil = 0;
  s.invincible = 0;
  s.power = 2;
  s.sail.x = 94 * 24 - 10;
  s.sail.lane = 0;
  s.sail.v = 0;
});
await wait(200);
assert.ok(
  (await ev(() => window.T.s.power)) < 2,
  'a crocodile bites a boat on its side',
);
log('croc: bubbles, surfaces, bites on its side');
// Autopilot: hold right, tack when aground or when the next rock/croc ahead
// is on our side. It must reach the far jetty and the exit.
await ev(() => {
  const s = window.T.s;
  s.lives = 9;
  s.remaining = 999;
  s.power = 2;
  const sl = s.sail;
  sl.x = sl.startX;
  sl.lane = 0;
  sl.tack = 1;
  sl.v = 0;
  sl.t0 = s.time.now;
  for (const c of sl.crocs) {
    c.state = 'wait';
    c.until = 0;
    c.img.setVisible(false);
  }
  s.hurtUntil = s.time.now + 1e8;
});
await page.keyboard.down('ArrowRight');
const t0 = Date.now();
let arrived = false,
  bumps = 0;
while (Date.now() - t0 < 150000) {
  const r = await ev(() => {
    const sl = window.T.s.sail;
    const ahead = [...sl.rocks, ...sl.crocs]
      .filter((o) => o.x > sl.x - 30)
      .sort((a, b) => a.x - b.x)[0];
    const side = ahead ? (ahead.lane < 0.5 ? -1 : 1) : 0;
    const want = side ? -side : sl.tack;
    return {
      done: sl.done,
      tack: sl.aground || (ahead && ahead.x - sl.x < 260 && sl.tack !== want),
      v: sl.v,
    };
  });
  if (r.done) {
    arrived = true;
    break;
  }
  if (r.v < 0) bumps++;
  if (r.tack) await press('Space', 40);
  await wait(60);
}
await page.keyboard.up('ArrowRight');
const secs = Math.round((Date.now() - t0) / 1000);
assert.ok(arrived, 'the autopilot reaches the far jetty');
console.log(`  voyage took ~${secs}s wall time, bump frames: ${bumps}`);
await wait(500);
await page.keyboard.down('ArrowRight');
for (let k = 0; k < 80; k++) {
  if ((await ev(() => window.T.s.mode)) !== 'play') break;
  await wait(60);
}
await page.keyboard.up('ArrowRight');
assert.equal(await ev(() => window.T.s.mode), 'clear', 'walk off to the exit');
log('autopilot: sailed the cataract and walked to the exit');
assert.deepEqual(
  errors.filter((e) => !/ResizeObserver|AudioContext/.test(e)),
  [],
  'no console errors',
);
await browser.close();
console.log('sail runtime: all good');
