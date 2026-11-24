import { SHOTS as SHOTS_DIR } from './browser-paths.mjs';
// Runtime check of World 8 (سيوة): an old save that cleared Port Said
// opens Siwa; thirst drains in the sun, slower in shade, a spring refills
// it, and empty thirst costs a life; sink-sand swallows you if you stand
// still; a camel can be ridden; dates open a shortcut; mirages shimmer
// (fakes drop you, salt marks the real ones); the sandboard runs forward
// on its own; the Qibli's stomp bounces, salt interrupts a slam, and an
// open spring grounds him; the captain now leads on to Siwa and the Qibli
// to the ending. City weapon is salt, with its own button icon.
// Screenshots: test-results/screenshots/29-siwa-*.png.
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
    'fatwa',
    'fields',
    'canal',
    'saqia',
    'barn',
    'furniture',
    'workshop',
    'harbour',
    'raselbar',
    'corniche',
    'tram',
    'stanley',
    'qaitbay',
    'avenue',
    'nile',
    'kings',
    'karnak',
    'nubia',
    'feluccas',
    'dam',
    'cataract',
    'crocisland',
    'freezone',
    'yard',
    'quay',
  ];
  window.localStorage.setItem(
    'hawari-progress',
    JSON.stringify({
      unlocked: 27,
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
      s.power = 2;
      s.checkpoint = false;
      s.startLevel(i);
      s.remaining = 999;
      if (s.siwa) s.siwa.thirst = 100;
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
const shot = (name) => page.screenshot({ path: `${SHOTS_DIR}/${name}` });
const log = (...a) => console.log('✔', ...a);

await page.locator('[data-screen="title"] [data-action="start"]').click();
await wait(400);
assert.equal(await ev(() => window.T.s.mode), 'map');
assert.equal(
  await page.locator('.world-pin.selected').getAttribute('data-world'),
  '7',
  'the map opens on Siwa',
);
await shot('29-siwa-map.png');
await page.locator('.map-node:not([disabled])').click();
await wait(700);
assert.equal(await ev(() => window.T.s.L.meta.id), 'grove');
log('map: old save → Siwa open, بستان سيوة playable');

/* Weapon button: Siwa shows salt; Aswan still shows the frond. */
await ev(() => window.T.go(28));
await wait(300);
const siwaBtn = await ev(() => {
  const b = document.querySelector('[data-touch="throw"]');
  return {
    hidden: b.hidden,
    weapon: b.dataset.weapon,
    salt: !b.querySelector('[data-weapon-icon="salt"]').hidden,
    frond: !b.querySelector('[data-weapon-icon="frond"]').hidden,
    label: b.querySelector('[data-throw-label]').textContent,
  };
});
assert.equal(siwaBtn.hidden, false);
assert.equal(siwaBtn.weapon, 'salt');
assert.equal(siwaBtn.salt, true);
assert.equal(siwaBtn.frond, false);
assert.equal(siwaBtn.label, 'ملح');
log('weapon button: Siwa shows ملح');

await ev(() => window.T.go(20)); // نجع النوبة, Aswan
await wait(300);
const frondBtn = await ev(() => {
  const b = document.querySelector('[data-touch="throw"]');
  return {
    weapon: b.dataset.weapon,
    frond: !b.querySelector('[data-weapon-icon="frond"]').hidden,
    salt: !b.querySelector('[data-weapon-icon="salt"]').hidden,
    label: b.querySelector('[data-throw-label]').textContent,
  };
});
assert.equal(frondBtn.weapon, 'frond');
assert.equal(frondBtn.frond, true);
assert.equal(frondBtn.salt, false);
assert.equal(frondBtn.label, 'سعفة');
log('weapon button: Aswan still shows سعفة');

/* Grove: thirst drains in the sun, a spring refills, shade is slower. */
await ev(() => window.T.go(28, true));
await wait(400);
const spawn = await ev(() => {
  const s = window.T.s;
  const bar = document.getElementById('thirst-bar');
  return {
    id: s.L.meta.id,
    dark: s.L.meta.dark,
    thirst: s.siwa.thirst,
    bar: !bar.hidden,
    springs: s.siwa.springs.length,
    camels: s.siwa.camels.length,
    dates: s.siwa.datesNeed,
    startX: s.spec.start.x,
  };
});
assert.equal(spawn.id, 'grove');
assert.equal(spawn.dark, 0);
assert.equal(spawn.bar, true);
assert.ok(spawn.springs >= 1, 'a spring is in the grove');
assert.ok(spawn.camels >= 1, 'a camel waits in the grove');
assert.ok(spawn.dates >= 3, 'dates to unlock the shortcut');
log('grove: thirst bar, springs, camel, dates');

// Drain in the sun, away from the first spring.
await ev(() => {
  const s = window.T.s;
  s.siwa.thirst = 80;
  // Mid sink-sand stretch: open sun, no palms.
  window.T.place(40 * 24 + 12, 13 * 24);
});
await page.waitForFunction(() => window.T.s.siwa.thirst < 76, null, {
  timeout: 8000,
});
const drained = await ev(() => window.T.s.siwa.thirst);
assert.ok(drained < 80 - 3, `thirst drained in the sun (now ${drained})`);
const sunRate = (80 - drained) / 1.5;
log(
  'thirst: sun drained to',
  drained.toFixed(1),
  'rate',
  sunRate.toFixed(1),
  '/s',
);

// Stand in the first spring and refill.
await ev(() => {
  const s = window.T.s;
  s.siwa.thirst = 40;
  const p = s.siwa.springs[0];
  window.T.place(p.x, p.y + 18);
});
await wait(400);
const filled = await ev(() => window.T.s.siwa.thirst);
assert.ok(filled > 90, `spring refilled thirst (now ${filled})`);
await shot('29-siwa-spring.png');
log('thirst: spring refilled');

// Sink-sand: stand still on س and get swallowed (accelerate the timer).
await ev(() => {
  const s = window.T.s;
  s.hurtUntil = 0;
  s.siwa.thirst = 100;
  window.T.place(40 * 24 + 12, 13 * 24);
  s.hero.setVelocity(0, 0);
});
await wait(250);
await ev(() => {
  const s = window.T.s;
  s.hero.setVelocity(0, 0);
  s.siwa.sinkMs = 1400;
  s.siwa.sinking = true;
});
await page.waitForFunction(
  () => window.T.s.lives < 9 || window.T.s.mode === 'dead',
  null,
  { timeout: 5000 },
);
const afterSink = await ev(() => ({
  lives: window.T.s.lives,
  mode: window.T.s.mode,
}));
assert.ok(
  afterSink.lives < 9 || afterSink.mode === 'dead',
  'standing still on sink-sand costs a life',
);
log('sink-sand: standing still is fatal');

await ev(() => window.T.go(28, true));
await wait(400);
await ev(() => {
  const s = window.T.s;
  s.siwa.thirst = 100;
  window.T.place(s.spec.start.x + 80, 13 * 24);
});
await shot('29-siwa-grove-thirst.png');

/* Salt lakes: mirages are there, salt button is ready. */
await ev(() => window.T.go(29, true));
await wait(400);
const lake = await ev(() => {
  const s = window.T.s;
  return {
    id: s.L.meta.id,
    mirages: s.siwa.mirages.length,
    reals: s.siwa.mirages.filter((m) => m.active && m.getData('real')).length,
  };
});
assert.equal(lake.id, 'saltlake');
assert.ok(lake.mirages >= 3, 'mirages shimmer over the salt');
await ev(() => {
  const s = window.T.s;
  const m = s.siwa.mirages[0];
  if (m) window.T.place(m.x, m.y - 4, -40);
});
await wait(200);
await shot('29-siwa-mirage.png');
log('saltlake: mirages present');

/* Sandboard: auto-forward, brisk. */
await ev(() => window.T.go(31, true));
await wait(500);
await ev(() => {
  const s = window.T.s;
  s.siwa.thirst = 100;
  s.hurtUntil = s.time.now + 1e8;
  window.T.place(10 * 24, 13 * 24);
  s.hero.setVelocity(80, 0);
});
await wait(400);
const boarded = await ev(() => window.T.s.siwa.boarding);
assert.ok(boarded, 'the sandboard mounted');
const x0 = await ev(() => window.T.s.hero.x);
await wait(2000);
const x1 = await ev(() => window.T.s.hero.x);
const boardSpeed = (x1 - x0) / 2;
assert.ok(boardSpeed > 90, `board is brisk (${boardSpeed.toFixed(0)} px/s)`);
await shot('29-siwa-board.png');
log('sandboard: auto-forward at', boardSpeed.toFixed(0), 'px/s');

/* Qibli: stomp bounces, salt stuns a charge, the tail stomp takes a heart,
   his hits never strip your salt, a spring hit deals two, then the ending. */
await ev(() => {
  const s = window.T.s;
  s.siwa.thirst = 100;
  s.hurtUntil = s.time.now + 1e8;
  // Walk into the arena.
  window.T.place((s.L.boss.col - 8) * 24, 13 * 24);
});
for (let k = 0; k < 40; k++) {
  if (await ev(() => !!window.T.s.bossState.active)) break;
  await page.keyboard.down('ArrowRight');
  await wait(50);
  await page.keyboard.up('ArrowRight');
}
assert.ok(await ev(() => window.T.s.bossState.active), 'qibli arena locked');
await shot('29-siwa-boss.png');

// Stomp bounces without damaging him.
const hp0 = await ev(() => {
  const s = window.T.s;
  const b = s.boss;
  s.hero.setVelocity(0, 200);
  window.T.place(b.x, b.body.top, 240);
  return s.bossState.hp;
});
await wait(300);
const afterStomp = await ev(() => ({
  hp: window.T.s.bossState.hp,
  vy: window.T.s.hero.body.velocity.y,
}));
assert.equal(afterStomp.hp, hp0, 'a stomp does not chip the Qibli');
assert.ok(afterStomp.vy < 0, 'the stomp bounces off');
log('boss: stomp bounces, no damage');

// His hits knock you back but never strip the salt you brought.
await ev(() => {
  const s = window.T.s;
  s.power = 2;
  s.hurtUntil = 0;
  s.invincible = 0;
  s.bossState.state = 'hover';
  s.bossState.until = s.time.now + 3000;
  const b = s.boss.body;
  window.T.place(b.left + 2, b.bottom, 0);
});
await wait(300);
const kept = await ev(() => ({
  power: window.T.s.power,
  mode: window.T.s.mode,
}));
assert.equal(kept.power, 2, 'a Qibli hit never strips the salt');
assert.equal(kept.mode, 'play', 'a powered hit is not fatal');
log('boss: hits knock back, salt stays armed');

// Force a tell, then salt drops him: stunned, low, tail exposed.
await ev(() => {
  const s = window.T.s;
  s.bossState.state = 'tell';
  s.bossState.until = s.time.now + 2000;
  s.bossChili();
});
await wait(200);
assert.equal(
  await ev(() => window.T.s.bossState.state),
  'stunned',
  'salt mid-charge drops the Qibli',
);
log('boss: salt during the charge stuns him');

// A stomp on the exposed tail takes one heart.
const hpBeforeTail = await ev(() => window.T.s.bossState.hp);
await ev(() => {
  const s = window.T.s;
  const b = s.boss;
  s.hero.setVelocity(0, 200);
  window.T.place(b.x, b.body.top, 240);
});
await wait(300);
const afterTail = await ev(() => ({
  hp: window.T.s.bossState.hp,
  state: window.T.s.bossState.state,
}));
assert.equal(afterTail.hp, hpBeforeTail - 1, 'the tail stomp takes a heart');
assert.equal(afterTail.state, 'hurt', 'he reels after the stomp');
await shot('29-siwa-boss-stunned.png');
log('boss: tail stomp during the stun deals 1');

// Ground him on an open spring (twice per heart is not used; spring deals 2).
await ev(() => {
  const s = window.T.s;
  const p =
    s.siwa.springs.filter((x) => x.x > s.L.boss.x - 400).pop() ||
    s.siwa.springs[0];
  if (p.buried) {
    p.buried.destroy();
    p.buried = undefined;
    p.img.setVisible(true);
  }
  s.boss.x = p.x;
  s.bossState.state = 'slam';
  s.bossState.until = s.time.now + 800;
  s.bossState.invuln = 0;
});
await wait(200);
const hp1 = await ev(() => window.T.s.bossState.hp);
assert.ok(hp1 < hp0, `spring slam damaged the Qibli (${hp0} → ${hp1})`);
log('boss: slam on an open spring deals damage');

await ev(() => {
  const s = window.T.s;
  s.bossState.invuln = 0;
  if (s.bossState.hp > 0) s.bossDamage(s.bossState.hp);
});
await wait(2500);
await ev(() => {
  const s = window.T.s;
  window.T.place(s.spec.exit.x, s.spec.exit.y - 1);
});
await wait(900);
assert.equal(
  await ev(() => window.T.s.mode),
  'clear',
  'the journey continues from Siwa to Giza',
);
log('qibli boss → on to Giza');

const leftover = errors.filter((e) => !/ResizeObserver|AudioContext/.test(e));
assert.deepEqual(leftover, [], leftover.join('\n'));
await browser.close();
console.log('world 8 runtime: all good');
