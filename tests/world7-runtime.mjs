// Runtime check of World 7 (بورسعيد), built on the port's cranes: an old
// save that cleared Aswan opens Port Said; no throwable weapon anywhere;
// grabbing a moving crane hook, riding it over a gap and jumping off onto
// the far side; a slung container carries you; a hoist lifts you; the
// chase magnet sweeps up behind you and catches you if you stand still;
// pelicans rear before they peck; barrels roll; the captain's cab is steel
// (stomps bounce), he drops at most one container at a time, swats at you
// from phase 2 when you hang close, and three containers dropped from the
// gantry hook beat him; the crocodile leads on to Port Said and the captain
// on to Siwa. Screenshots: /workspace/hawari-shots/27-portsaid-*.png.
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
// Worlds 1–6 cleared on an older build: unlocked was capped at 24.
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
    'nubia',
    'feluccas',
    'dam',
    'cataract',
    'crocisland',
  ];
  window.localStorage.setItem(
    'hawari-progress',
    JSON.stringify({
      unlocked: 24,
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

/* Map: the old save opens Port Said and its first level. */
await page.locator('[data-screen="title"] [data-action="start"]').click();
await wait(400);
assert.equal(await ev(() => window.T.s.mode), 'map');
assert.equal(
  await page.locator('.world-pin.selected').getAttribute('data-world'),
  '6',
  'the map opens on Port Said',
);
assert.equal(await page.locator('.map-node:not([disabled])').count(), 1);
await shot('27-portsaid-map.png');
await page.locator('.map-node:not([disabled])').click();
await wait(600);
assert.equal(await ev(() => window.T.s.L.meta.id), 'freezone');
log('map: old save → Port Said open, مطاردة السوق الحرة playable');

/* Each level: spawn clear, bright, cranes, and no weapon to throw. */
for (const [i, id] of [
  [25, 'freezone'],
  [26, 'yard'],
  [27, 'quay'],
]) {
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
      pickups: s.L.pickups.length + s.L.armories.length,
      hooks: s.crane?.hooks.length ?? 0,
      dark: s.L.meta.dark,
      weapon: s.weapon()?.id ?? null,
    };
  });
  assert.equal(info.id, id);
  assert.equal(info.near, 0, `${id}: nobody camps the spawn`);
  assert.equal(info.pickups, 0, `${id}: nothing to throw`);
  assert.ok(info.hooks >= 1, `${id}: crane hooks`);
  assert.equal(info.dark, 0, `${id}: bright`);
  assert.equal(info.weapon, 'none', `${id}: no throwable`);
}
assert.equal(
  await page.locator('[data-touch="throw"]').evaluate((el) => el.hidden),
  true,
  'the throw button is hidden in Port Said',
);
log('levels: spawn clear, bright, cranes everywhere, no throwable');

/* A crane hook: jump up, grab it, ride it over the gap, jump off. */
await ev(() => window.T.go(25, true));
await wait(300);
await ev(() => {
  const s = window.T.s,
    k = s.crane.hooks[0];
  s.crane.magnet.done = true; // no chase for this check
  s.crane.magnet.img.setVisible(false);
  s.crane.magnet.glow.setVisible(false);
  s.hurtUntil = s.time.now + 1e8;
  k.x = k.x0;
  k.dir = 1;
  k.pauseUntil = s.time.now + 400;
  window.T.place(k.x0, k.y + 6 + s.hero.body.height + 4, -60);
});
await wait(250);
assert.ok(await ev(() => !!window.T.s.crane.hang), 'grabbed the hook');
await wait(1600);
const mid = await ev(() => {
  const s = window.T.s,
    k = s.crane.hooks[0];
  return {
    hang: !!s.crane.hang,
    dx: Math.abs(s.hero.x - k.x),
    x: s.hero.x,
    pitL: 60 * 24,
    pitR: 72 * 24,
    pose: s.hero.getData('pose'),
  };
});
assert.ok(mid.hang, 'still hanging while it moves');
assert.ok(mid.dx < 6, `hands on the hook (${mid.dx.toFixed(1)})`);
assert.ok(mid.x > mid.pitL, 'carried out over the gap');
assert.equal(mid.pose, 'throw1', 'hanging pose');
await shot('27-portsaid-hook.png');
// Ride to the far end, then jump off onto the far side.
for (let k = 0; k < 60; k++) {
  const done = await ev(() => {
    const k = window.T.s.crane.hooks[0];
    return k.x >= k.x1 - 30;
  });
  if (done) break;
  await wait(100);
}
await page.keyboard.down('ArrowRight');
await page.keyboard.press('Space', { delay: 60 });
await wait(900);
await page.keyboard.up('ArrowRight');
const land = await ev(() => {
  const s = window.T.s;
  return {
    hang: !!s.crane.hang,
    x: s.hero.x,
    grounded: s.hero.body.blocked.down,
    mode: s.mode,
  };
});
assert.equal(land.hang, false, 'let go');
assert.equal(land.mode, 'play');
assert.ok(land.x > 72 * 24 && land.grounded, `landed past the gap (${land.x})`);
log('hook: grabbed, carried across, jumped off onto the far side');

/* A slung container carries بلبل sideways. */
const sling = await ev(() => {
  const s = window.T.s;
  const m = s.moverList.find((q) => q.img.texture.key === 'container3');
  m.img.body.reset(m.min, m.img.y);
  m.img.body.setVelocityX(m.speed);
  window.T.place(m.img.x + 36, m.img.body.top);
  return { x0: s.hero.x };
});
await wait(1500);
const sling1 = await ev(() => window.T.s.hero.x);
assert.ok(sling1 - sling.x0 > 50, `rode the container (${sling1 - sling.x0})`);
await shot('27-portsaid-sling.png');
log('sling: a crane container carries you over the gap');

/* A hoist lifts بلبل up the container wall. */
const hoist = await ev(() => {
  const s = window.T.s;
  const m = s.moverList.find((q) => q.img.texture.key === 'container3b');
  m.img.body.reset(m.img.x, m.max);
  m.img.body.setVelocityY(-m.speed);
  // Sit on the container (T.place subtracts a tile — that's for floors).
  const b = s.hero.body,
    feet = m.img.body.top;
  b.reset(m.img.x + 36, feet + (s.hero.y - b.bottom));
  s.hero.setVelocity(0, m.img.body.velocity.y);
  return { y0: s.hero.body.bottom, top: m.min };
});
await wait(2200);
const hoist1 = await ev(() => window.T.s.hero.body.bottom);
assert.ok(hoist.y0 - hoist1 > 60, `rose with the hoist (${hoist.y0 - hoist1})`);
await shot('27-portsaid-hoist.png');
log('hoist: rises with you up the wall');

/* The chase: stand still and the runaway magnet gets you. */
await ev(() => window.T.go(25, true));
await wait(300);
await ev(() => {
  const s = window.T.s;
  s.hurtUntil = s.time.now + 1e8;
  s.invincible = s.time.now + 1e8;
  window.T.place(30 * 24, 12 * 24);
});
await wait(300);
assert.ok(await ev(() => window.T.s.crane.magnet.on), 'the magnet comes');
let caught = false,
  shotTaken = false;
for (let k = 0; k < 90 && !caught; k++) {
  const r = await ev(() => {
    const s = window.T.s;
    return {
      gap: s.hero.x - s.crane.magnet.x,
      mode: s.mode,
      by: s.lastHurtBy,
    };
  });
  if (!shotTaken && r.gap < 160) {
    await shot('27-portsaid-chase.png');
    shotTaken = true;
  }
  caught = r.mode === 'dead' && r.by === 'magnet';
  if (!caught) await wait(100);
}
assert.ok(caught, 'standing still, the magnet catches you');
await wait(1500);
log('chase: the magnet sweeps up and catches a hero who waits');

/* A pelican rears back (tell) before it pecks. */
await ev(() => window.T.go(25, true));
await wait(300);
await ev(() => (window.T.s.crane.magnet.done = true));
const pel = await ev(() => {
  const e = window.T.s.enemies
    .getChildren()
    .filter((o) => o.active && o.getData('kind') === 'pelican')
    .sort((a, b) => a.x - b.x)[0];
  return { x: e.x, y: e.body.bottom };
});
await ev((c) => {
  window.T.s.hurtUntil = window.T.s.time.now + 1e8;
  window.T.place(c.x - 90, c.y);
}, pel);
let reared = false;
for (let k = 0; k < 40 && !reared; k++) {
  reared = await ev(() =>
    window.T.s.enemies
      .getChildren()
      .some(
        (o) => o.getData('kind') === 'pelican' && o.getData('state') === 'rear',
      ),
  );
  if (!reared) await wait(30);
}
assert.ok(reared, 'the pelican rears back first');
log('pelican: rear before peck');

/* A barrel starts rolling when بلبل comes near. */
await ev(() => window.T.go(26, true));
await wait(300);
const bar = await ev(() => {
  const e = window.T.s.enemies
    .getChildren()
    .filter((o) => o.active && o.getData('kind') === 'barrel')
    .sort((a, b) => a.x - b.x)[0];
  return { x: e.x, y: e.body.bottom };
});
await ev((c) => {
  window.T.s.hurtUntil = window.T.s.time.now + 1e8;
  window.T.s.invincible = window.T.s.time.now + 1e8;
  window.T.place(c.x - 150, c.y);
}, bar);
await wait(500);
const rolling = await ev(() =>
  window.T.s.enemies
    .getChildren()
    .some(
      (o) =>
        o.getData('kind') === 'barrel' &&
        o.getData('rolling') &&
        Math.abs(o.body.velocity.x) > 50,
    ),
);
assert.ok(rolling, 'the barrel rolls');
await shot('27-portsaid-yard.png');
log('barrel: rolls at you');

/* The quay: the captain on his crane. */
await ev(() => window.T.go(27));
await wait(300);
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
assert.ok(active, 'the captain wakes');
await ev(() => {
  const s = window.T.s;
  s.hurtUntil = s.time.now + 1e8;
  s.invincible = s.time.now + 1e8;
});
let maxBoxes = 0,
  others = 0,
  sawBox = false,
  states = new Set();
for (let k = 0; k < 90; k++) {
  const r = await ev(() => {
    const s = window.T.s,
      lo = s.bossState.arenaX;
    return {
      w: s.hazards.getChildren().filter((h) => h.active).length,
      e: s.enemies.getChildren().filter((e) => e.active && e.x >= lo).length,
      st: s.bossState.state,
    };
  });
  maxBoxes = Math.max(maxBoxes, r.w);
  others = Math.max(others, r.e);
  states.add(r.st);
  if (r.w) sawBox = true;
  if (k === 25) await shot('27-portsaid-boss.png');
  await wait(100);
}
assert.ok(maxBoxes <= 1, `at most one container at a time (${maxBoxes})`);
assert.equal(others, 0, 'nothing else in the arena');
assert.ok(sawBox, 'his crane drops a container');
console.log('  boss states seen:', [...states].join(' '));
// The steel cab: a stomp only bounces بلبل off.
const hp0 = await ev(() => window.T.s.bossState.hp);
await ev(() => {
  const s = window.T.s,
    st = s.bossState,
    b = s.boss;
  s.hazards.clear(true, true);
  st.state = 'walk';
  st.until = s.time.now + 4000;
  st.invuln = 0;
  b.setVelocity(0, 0);
  window.T.place(b.x, b.body.top - 30, 260);
});
await wait(500);
assert.equal(await ev(() => window.T.s.bossState.hp), hp0, 'cab is steel');
// The gantry hook: hang over his cab and drop the container (↓).
const hang = async () => {
  await ev(() => {
    const s = window.T.s,
      st = s.bossState,
      b = s.boss,
      k = s.crane.hooks[0];
    s.hazards.clear(true, true);
    st.state = 'drop';
    st.until = s.time.now + 3000;
    st.invuln = 0;
    b.setVelocity(0, 0);
    k.x = Math.min(k.x1, Math.max(k.x0, b.x));
    k.pauseUntil = s.time.now + 3000;
    k.payload.setVisible(true);
    s.crane.cooldown = 0;
    window.T.place(k.x, k.y + 6 + s.hero.body.height + 4, -60);
  });
  await wait(250);
  assert.ok(await ev(() => !!window.T.s.crane.hang), 'hanging from the gantry');
};
await hang();
await shot('27-portsaid-gantry.png');
await page.keyboard.press('ArrowDown', { delay: 60 });
await wait(700);
const hp1 = await ev(() => window.T.s.bossState.hp);
assert.equal(hp1, hp0 - 2, `a container on his cab (${hp0} → ${hp1})`);
await shot('27-portsaid-boss-hit.png');
log('boss: steel cab, one container max, the gantry container hits him');
// Phase 2+: hang close above him and the boom swats (flashing first).
await wait(1200);
await ev(() => {
  const s = window.T.s,
    st = s.bossState,
    b = s.boss,
    k = s.crane.hooks[0];
  st.state = 'walk';
  st.until = 0;
  b.setVelocity(0, 0);
  k.x = Math.min(k.x1, Math.max(k.x0, b.x));
  k.pauseUntil = s.time.now + 3000;
  k.payload.setVisible(false);
  k.loadAt = s.time.now + 1e8;
  s.crane.cooldown = 0;
  window.T.place(k.x, k.y + 6 + s.hero.body.height + 4, -60);
});
let swat = false;
for (let k = 0; k < 30 && !swat; k++) {
  swat = await ev(() => window.T.s.bossState.state === 'swat');
  if (!swat) await wait(50);
}
assert.ok(swat, 'the boom swats at a hero hanging close');
log('boss: from phase 2 the boom swats when you hang close');

/* Captain beaten → the road goes on to Siwa (not the ending). */
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
await wait(900);
assert.equal(await ev(() => window.T.s.mode), 'clear', 'world 7 done');
assert.match(
  await page.locator('#clear-title').textContent(),
  /سيوة/,
  'the road opens to Siwa',
);
log('captain boss → on to Siwa');

/* Crocodile island won → the road goes on to Port Said (not the ending). */
await ev(() => window.T.go(24));
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
assert.equal(await ev(() => window.T.s.mode), 'clear', 'world 6 done');
assert.match(
  await page.locator('#clear-title').textContent(),
  /بورسعيد/,
  'the road opens to Port Said',
);
log('croc boss → on to Port Said');

assert.deepEqual(
  errors.filter((e) => !/ResizeObserver|AudioContext/.test(e)),
  [],
  'no console errors',
);
await browser.close();
console.log('world 7 runtime: all good');
