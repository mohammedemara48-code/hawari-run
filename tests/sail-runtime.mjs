// Runtime check of Aswan's felucca voyage (شلال أسوان): the boat runs
// forward on its own once you step aboard; left/right only trim the speed;
// jump hops to the other bank to dodge; a rock bump slides you past (never
// aground); a crocodile bubbles then bites on its side; a gust shows an
// arrow and bursts the speed by itself; an autopilot that only hops at
// hazards finishes the cataract in about a minute. Screenshot:
// /workspace/hawari-shots/28-felucca-fast.png.
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

// Walk to the jetty: stepping aboard starts the voyage at cruise speed,
// with no hands on the tiller.
await page.keyboard.down('ArrowRight');
for (let k = 0; k < 60 && !(await ev(() => window.T.s.sail.on)); k++)
  await wait(50);
assert.equal(await ev(() => window.T.s.sail.on), true, 'boarded');
await page.keyboard.up('ArrowRight');
await ev(() => {
  window.T.s.hurtUntil = window.T.s.time.now + 1e8;
});
await wait(400);
const idle = await ev(() => ({
  v: window.T.s.sail.v,
  x: window.T.s.sail.x,
  hx: window.T.s.hero.x,
  banner: [...document.querySelectorAll('.toast, #toast, [data-toast]')]
    .map((e) => e.textContent)
    .join(' '),
}));
assert.ok(idle.v > 70, `runs by itself (${idle.v})`);
assert.ok(Math.abs(idle.hx - idle.x) < 30, 'the hero rides the deck');
assert.equal(
  /شدّ الشراع|شد الشراع|لِف الشراع|لف الشراع/.test(idle.banner),
  false,
  `no sail-hauling banner (${idle.banner})`,
);
await shot('28-felucca-fast.png');
log('board: cruises on its own', Math.round(idle.v));

// Left trims slower, right trims faster, always forward.
await ev(() => {
  window.T.s.sail.v = 80;
});
await page.keyboard.down('ArrowLeft');
await wait(600);
const slow = await ev(() => window.T.s.sail.v);
await page.keyboard.up('ArrowLeft');
await page.keyboard.down('ArrowRight');
await wait(700);
const fast = await ev(() => window.T.s.sail.v);
await page.keyboard.up('ArrowRight');
assert.ok(slow < 80 && slow >= 44, `left eases off (${slow})`);
assert.ok(fast > slow + 10, `right is brisker (${slow} → ${fast})`);
assert.ok(slow > 0 && fast > 0, 'never stops or goes backwards');
log('trim: left', Math.round(slow), 'right', Math.round(fast));

// Jump hops to the other side; the boat keeps running.
const before = await ev(() => ({
  lane: window.T.s.sail.lane,
  v: window.T.s.sail.v,
  x: window.T.s.sail.x,
}));
await press('Space');
await wait(250);
const hopped = await ev(() => ({
  lane: window.T.s.sail.lane,
  v: window.T.s.sail.v,
  x: window.T.s.sail.x,
}));
assert.ok(Math.abs(hopped.lane - before.lane) > 0.6, 'jump changes bank');
assert.ok(hopped.v > 70, 'still running after the hop');
assert.ok(hopped.x > before.x, 'still going forward');
log('hop: lane', before.lane, '→', hopped.lane);

// A rock on this side bumps you and you slide past — not stuck.
await ev(() => {
  const sl = window.T.s.sail;
  sl.x = 60 * 24 - 80;
  sl.lane = 0;
  sl.hopTo = 0;
  sl.hopUntil = 0;
  sl.v = 80;
  sl.bumped = 0;
});
await wait(800);
const rock = await ev(() => ({
  x: window.T.s.sail.x,
  v: window.T.s.sail.v,
}));
assert.ok(rock.x > 60 * 24, `slid past the rock (${rock.x})`);
assert.ok(rock.v > 0, 'still moving after the bump');
log('rock: bump and continue', Math.round(rock.x), Math.round(rock.v));

// A crocodile: bubbles first, then up, then a bite on its side.
await ev(() => {
  const sl = window.T.s.sail;
  sl.x = 94 * 24 - 320;
  sl.lane = 0;
  sl.hopTo = 0;
  sl.hopUntil = 0;
  sl.v = 80;
  window.T.s.hurtUntil = window.T.s.time.now + 1e8;
});
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
  const s = window.T.s;
  s.hurtUntil = 0;
  s.invincible = 0;
  s.power = 2;
  s.sail.x = 94 * 24 - 10;
  s.sail.lane = 0;
  s.sail.hopTo = 0;
  s.sail.v = 80;
});
await wait(200);
assert.ok(
  (await ev(() => window.T.s.power)) < 2,
  'a crocodile bites a boat on its side',
);
log('croc: bubbles, surfaces, bites on its side');

// A gust: the arrow appears and speed jumps on its own (hands off).
await ev(() => {
  const s = window.T.s;
  const sl = s.sail;
  sl.t0 = s.time.now - 8000;
  sl.v = 80;
  sl.gustPlayed = -1;
});
await wait(200);
const gust = await ev(() => ({
  v: window.T.s.sail.v,
  vane: window.T.s.sail.vane.visible,
  text: window.T.s.sail.vaneText.text,
}));
assert.ok(gust.vane, 'the gust arrow is visible');
assert.match(gust.text, /هبّة/);
assert.ok(gust.v > 100, `automatic gust burst (${gust.v})`);
assert.doesNotMatch(gust.text, /شدّ الشراع|لِف الشراع/);
log('gust: arrow + burst', Math.round(gust.v), gust.text);

// Autopilot: hop when the next rock or croc ahead is on our side.
// Hands off the speed keys — the boat runs itself. Measure game time.
await ev(() => {
  const s = window.T.s;
  s.lives = 9;
  s.remaining = 999;
  s.power = 2;
  const sl = s.sail;
  sl.x = sl.startX;
  sl.lane = 0;
  sl.hopTo = 0;
  sl.hopUntil = 0;
  sl.v = 80;
  sl.t0 = s.time.now;
  sl.bumped = 0;
  sl.gustPlayed = -1;
  sl.done = false;
  sl.on = true;
  for (const c of sl.crocs) {
    c.state = 'wait';
    c.until = 0;
    c.img.setVisible(false);
    c.ring.setVisible(false);
  }
  s.hurtUntil = s.time.now + 1e8;
});
const wall0 = Date.now();
let arrived = false,
  bumps = 0;
while (Date.now() - wall0 < 120000) {
  const r = await ev(() => {
    const sl = window.T.s.sail;
    const ahead = [...sl.rocks, ...sl.crocs]
      .filter((o) => o.x > sl.x - 20)
      .sort((a, b) => a.x - b.x)[0];
    const onSide = ahead && (ahead.lane < 0.5 ? sl.lane < 0.4 : sl.lane > 0.6);
    return {
      done: sl.done,
      hop: !!(ahead && ahead.x - sl.x < 240 && onSide),
      v: sl.v,
      game: (window.T.s.time.now - sl.t0) / 1000,
    };
  });
  if (r.done) {
    arrived = true;
    break;
  }
  if (r.v < 70) bumps++;
  if (r.hop) await press('Space', 40);
  await wait(50);
}
const gameSec = await ev(
  () => (window.T.s.time.now - window.T.s.sail.t0) / 1000,
);
const wallSec = (Date.now() - wall0) / 1000;
assert.ok(arrived, 'the autopilot reaches the far jetty');
assert.ok(
  gameSec >= 50 && gameSec <= 100,
  `voyage should last about a minute (got ${gameSec.toFixed(1)}s)`,
);
console.log(
  `  voyage game time ${gameSec.toFixed(1)}s, wall ${wallSec.toFixed(1)}s, slow frames: ${bumps}`,
);
log('autopilot: sailed the cataract');

await wait(500);
await page.keyboard.down('ArrowRight');
for (let k = 0; k < 80; k++) {
  if ((await ev(() => window.T.s.mode)) !== 'play') break;
  await wait(60);
}
await page.keyboard.up('ArrowRight');
assert.equal(await ev(() => window.T.s.mode), 'clear', 'walk off to the exit');
log('walked off to the exit');

assert.deepEqual(
  errors.filter((e) => !/ResizeObserver|AudioContext/.test(e)),
  [],
  'no console errors',
);
await browser.close();
console.log('sail runtime: all good');
