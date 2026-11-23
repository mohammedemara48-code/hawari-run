import { SHOTS as SHOTS_DIR } from './browser-paths.mjs';
// Play through World 5 (الأقصر) with enemies on and no invulnerability
// cheats. An input bot holds right, jumps, waits for boats, balloons and
// crushing pillars, and throws the throwing stick. Reports deaths per level.
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';

const SHOTS = SHOTS_DIR;
let server;
let gameUrl = process.env.GAME_URL;
if (!gameUrl) {
  if (!existsSync('dist/index.html'))
    throw new Error('dist/ is missing; run vite build first');
  server = spawn(
    'npx',
    [
      'vite',
      'preview',
      '--host',
      '127.0.0.1',
      '--port',
      '4173',
      '--strictPort',
    ],
    { stdio: 'pipe' },
  );
  gameUrl = 'http://127.0.0.1:4173/';
  let ready = '';
  const start = Date.now();
  while (Date.now() - start < 20000) {
    try {
      const r = await fetch(gameUrl);
      if (r.ok) {
        ready = 'ok';
        break;
      }
    } catch {
      await sleep(150);
    }
  }
  if (!ready) {
    server.kill();
    throw new Error('vite preview did not start');
  }
}

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
  window.localStorage.setItem(
    'hawari-progress',
    JSON.stringify({
      unlocked: 20,
      best: {},
      coins: {},
      secrets: {},
      cleared: {},
    }),
  );
});
await page.goto(gameUrl);
await page.waitForFunction(
  () => window.hawari?.scene.getScene('alley')?.hero,
  null,
  { timeout: 20000 },
);
const ev = (fn, arg) => page.evaluate(fn, arg);
const wait = (ms) => page.waitForTimeout(ms);
// Close the «الجديد في التحديث» note so it doesn't cover the game.
await wait(800);
const ok = page.locator('[data-update="ok"]');
if (await ok.count()) await ok.first().click();
await ev(() => {
  window.T = { s: window.hawari.scene.getScene('alley') };
});
/** A fresh run of a Luxor level: 3 lives, small, enemies on. */
const go = (i) =>
  ev((i) => {
    const s = window.T.s;
    s.score = 0;
    s.coinCount = 0;
    s.lives = 3;
    s.power = 0;
    s.checkpoint = false;
    s.startLevel(i);
  }, i);
const release = async () => {
  for (const k of ['ArrowRight', 'ArrowLeft', 'Space', 'x'])
    await page.keyboard.up(k);
};
const state = () =>
  ev(() => {
    const s = window.T.s,
      b = s.hero.body,
      hx = b.center.x;
    const near = s.enemies
      .getChildren()
      .filter((e) => e.active)
      .map((e) => ({ dx: e.x - hx, dy: e.y - b.center.y }))
      .filter((e) => e.dx > -20 && e.dx < 170 && Math.abs(e.dy) < 150);
    const hazard = s.hazards
      .getChildren()
      .some(
        (h) =>
          h.active &&
          Math.abs(h.x - hx) < 90 &&
          h.y < b.top &&
          h.getData('kind') !== 'shock',
      );
    const venom = s.hazards
      .getChildren()
      .some(
        (h) =>
          h.active && h.getData('kind') === 'venom' && Math.abs(h.x - hx) < 140,
      );
    const shock = s.hazards
      .getChildren()
      .some(
        (h) =>
          h.active &&
          h.getData('kind') === 'shock' &&
          Math.abs(h.x - hx) < 110 &&
          Math.sign(hx - h.x) === Math.sign(h.body.velocity.x),
      );
    const row = Math.floor((b.bottom + 8) / 24);
    const st = (dx) => s.standable(Math.floor((hx + dx) / 24), row);
    const ground = b.blocked.down || b.touching.down;
    const gap = !st(20) && !s.swimming;
    const edge = !st(8) && !s.swimming;
    // A landing within jump reach (same row or a little higher/lower).
    let land = false;
    for (let dx = 48; dx <= 132 && !land; dx += 12)
      for (let dr = -2; dr <= 2 && !land; dr++)
        if (s.standable(Math.floor((hx + dx) / 24), row + dr)) land = true;
    const movers = (s.moverList || [])
      .filter((m) => (m.boat || m.balloon) && m.img?.body)
      .map((m) => ({
        dx: m.img.body.center.x - hx,
        dy: m.img.body.top - b.bottom,
        w: m.img.body.width,
        kind: m.boat ? 'boat' : 'balloon',
        vy: m.img.body.velocity?.y ?? 0,
      }));
    const ride = movers.some(
      (q) => Math.abs(q.dx) < q.w / 2 + 6 && q.dy > -10 && q.dy < 10,
    );
    const hopOn = movers.some(
      (q) => q.dx > 10 && q.dx < 120 && q.dy > -60 && q.dy < 40,
    );
    const moverAhead = movers.some((q) => q.dx > -40 && q.dx < 420);
    const pillar = (s.w5?.pillars || []).find(
      (p) => p.x - hx > -14 && p.x - hx < 64,
    );
    const pillarBad =
      pillar &&
      !(pillar.state === 'up' && pillar.x - hx < 40) &&
      pillar.state !== 'up';
    return {
      x: hx,
      mode: s.mode,
      lives: s.lives,
      power: s.power,
      remaining: s.remaining,
      swim: s.swimming,
      blocked: b.blocked.right,
      lastHurtBy: s.lastHurtBy,
      width: s.L.width,
      exit: s.spec.exit.x,
      ground,
      near,
      hazard,
      shock,
      venom,
      gap,
      edge,
      land,
      ride,
      hopOn,
      moverAhead,
      pillarBad: !!pillarBad,
      boss: !!s.bossState?.active,
      bossBowed: s.bossState?.state === 'bowed',
      bossDx: s.boss ? s.boss.x - hx : 9999,
    };
  });
const shot = (name) => page.screenshot({ path: `${SHOTS}/${name}` });

const reports = [];
const play = async (index) => {
  await release();
  await go(index);
  await wait(250);
  const name = await ev(() => window.T.s.L.meta.name);
  const deaths = [];
  let lives = 3;
  let jumping = false;
  let jumpUntil = 0;
  let lastThrow = 0;
  let stuckX = 0,
    stuckAt = Date.now();
  const t0 = Date.now();
  const limit = Number(process.env.LIMIT || 240000);
  while (Date.now() - t0 < limit) {
    const st = await state();
    if (st.lives < lives) {
      if (process.env.DEBUG_SHOTS)
        await shot(`_w5-death-${index}-${deaths.length}.png`);
      deaths.push({ cause: st.lastHurtBy || 'hit', x: Math.round(st.x / 24) });
      lives = st.lives;
    } else if (st.lives > lives) lives = st.lives;
    if (st.mode === 'clear' || st.mode === 'win' || st.mode === 'over') break;
    if (st.mode !== 'play') {
      if (jumping) await page.keyboard.up('Space');
      jumping = false;
      await wait(40);
      continue;
    }
    const now = Date.now();
    if (process.env.TRACE && now - (play.lastTrace || 0) > 5000) {
      play.lastTrace = now;
      console.log(
        'trace',
        Math.round(st.x / 24),
        Math.round(st.remaining),
        st.swim ? 'swim' : st.ride ? 'ride' : st.ground ? 'ground' : 'air',
        st.moverAhead ? 'moverAhead' : '',
        st.edge ? 'edge' : '',
      );
    }
    if (Math.abs(st.x - stuckX) > 30) {
      stuckX = st.x;
      stuckAt = now;
    }
    const stuck = now - stuckAt > 2500;
    // Movement: wait at an edge for a boat or balloon, and before a pillar
    // that is about to come down; otherwise keep going right.
    let hold = true;
    let back = false;
    if (st.x > st.exit + 10) back = true;
    else if (st.venom) hold = true;
    else if (st.pillarBad && st.ground) hold = false;
    else if (st.ride && !st.land) hold = false;
    else if (st.moverAhead && st.edge && !st.hopOn && !st.land && !st.swim)
      hold = false;
    if (st.boss && !st.bossBowed && Math.abs(st.bossDx) < 120) back = true;
    if (stuck) hold = true;
    if (back) {
      await page.keyboard.up('ArrowRight');
      await page.keyboard.down('ArrowLeft');
    } else {
      await page.keyboard.up('ArrowLeft');
      if (hold) await page.keyboard.down('ArrowRight');
      else await page.keyboard.up('ArrowRight');
    }
    const wantJump =
      st.swim ||
      st.blocked ||
      st.shock ||
      (st.boss && st.bossBowed && st.bossDx > 0 && st.bossDx < 110) ||
      (st.hopOn && (st.edge || st.gap)) ||
      (st.ride && st.land && st.edge) ||
      (st.near.length > 0 && !st.ride) ||
      (st.gap && !st.edge && (st.land || !st.moverAhead) && !st.ride) ||
      stuck;
    if (
      wantJump &&
      !jumping &&
      now >= jumpUntil &&
      (st.ground || st.swim || st.ride)
    ) {
      await page.keyboard.down('Space');
      jumping = true;
      jumpUntil = now + (st.swim ? 280 : 200);
    } else if (jumping && now >= jumpUntil) {
      await page.keyboard.up('Space');
      jumping = false;
      jumpUntil = now + 90;
    }
    if (
      st.power === 2 &&
      (st.near.length || (st.boss && st.bossBowed)) &&
      now - lastThrow > 320
    ) {
      await page.keyboard.press('x', { delay: 40 });
      lastThrow = now;
    }
    await wait(30);
  }
  await release();
  if (process.env.DEBUG_SHOTS) await shot(`_w5-end-${index}.png`);
  const end = await state();
  const report = {
    index,
    name,
    cleared: end.mode === 'clear' || end.mode === 'win',
    mode: end.mode,
    deaths: deaths.length,
    causes: deaths,
    lives: end.lives,
    remaining: Math.ceil(end.remaining),
    col: Math.round(end.x / 24),
    width: Math.round(end.width / 24),
  };
  reports.push(report);
  console.log(JSON.stringify(report));
  return report;
};

const only = process.env.LEVELS
  ? process.env.LEVELS.split(',').map(Number)
  : [16, 17, 18, 19];
for (const i of only) await play(i);

for (const r of reports)
  console.log(
    `L${r.index} ${r.name}: ${r.cleared ? 'cleared' : r.mode + ' at col ' + r.col + '/' + r.width} · deaths ${r.deaths}` +
      (r.causes.length
        ? ' (' + r.causes.map((c) => c.cause + '@' + c.x).join(', ') + ')'
        : '') +
      ` · time left ${r.remaining}s`,
  );
await browser.close();
if (server) server.kill();
assert.deepEqual(
  errors.filter((e) => !/ResizeObserver|AudioContext/.test(e)),
  [],
);
