// قلعة قايتباي played like a person on a phone: 844×390 landscape, only the
// on-screen touch stick and buttons (real multi-touch through CDP), real
// time, enemies on, starting small with the normal three lives and no
// invincibility. The player reacts to what it saw a quarter of a second
// ago (REACT ms) and never presses anything frame-perfectly.
// Prints one JSON line: result, deaths, hurts, measured bird warnings and
// wave calms. Long: run it on its own (node tests/alex4-human.mjs with the dev server up).
import { chromium } from '@playwright/test';
const URL = process.env.GAME_URL || 'http://localhost:5173/';
const VIDEO = process.env.VIDEO || '';
const LIMIT = +(process.env.LIMIT || 480000);
const REACT = +(process.env.REACT || 250);
const LEVEL = 15;
const T = 24;
const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox'],
});
const ctx = await browser.newContext({
  viewport: { width: 844, height: 390 },
  isMobile: true,
  hasTouch: true,
  ...(VIDEO
    ? { recordVideo: { dir: VIDEO, size: { width: 844, height: 390 } } }
    : {}),
});
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.addInitScript(() => {
  window.localStorage.clear();
  window.localStorage.setItem('hawari-seen-version', '999');
  // Headless "fullscreen" would shrink the recording; a phone just goes
  // fullscreen, nothing else changes.
  window.Element.prototype.requestFullscreen = () => Promise.resolve();
});
await page.goto(URL);
await page.waitForFunction(
  () => window.hawari?.scene.getScene('alley')?.hero,
  null,
  { timeout: 30000 },
);
const ev = (fn, a) => page.evaluate(fn, a);
const wait = (ms) => page.waitForTimeout(ms);
await page.locator('[data-screen="title"] [data-action="start"]').tap();
await page.locator('.map-node[data-node="0"]').tap();
await wait(300);
// Setup only: open level 16 directly, then measure everything in-game.
await ev((lvl) => {
  const s = window.hawari.scene.getScene('alley');
  window.S = s;
  s.lives = 3;
  s.power = 0;
  s.score = 0;
  s.checkpoint = false;
  s.startLevel(lvl);
  const M = (window.M = { hurts: [], birds: [], boss: [], waves: [] });
  const orig = s.hurt.bind(s);
  s.hurt = (src, soft) => {
    const gate =
      s.time.now < s.hurtUntil ||
      s.time.now < s.invincible ||
      s.mode !== 'play';
    const b = s.hero.body;
    orig(src, soft);
    if (!gate)
      M.hurts.push({
        t: Math.round(s.time.now),
        src: src || 'hit',
        col: +(b.center.x / 24).toFixed(1),
        row: +(b.bottom / 24).toFixed(1),
        power: s.power,
        boss: s.bossState?.state,
        dead: s.mode === 'dead',
        hz: s.hazards
          .getChildren()
          .filter((h) => h.active && Math.abs(h.x - s.hero.x) < 120)
          .map((h) => [
            h.getData('kind'),
            Math.round(h.x - s.hero.x),
            Math.round(h.y - s.hero.y),
          ]),
        near: s.enemies
          .getChildren()
          .filter((e) => e.active)
          .map((e) => ({
            k: e.getData('kind'),
            st: e.getData('state'),
            dx: Math.round(e.x - s.hero.x),
            dy: Math.round(e.y - s.hero.y),
          }))
          .sort((a, c) => Math.hypot(a.dx, a.dy) - Math.hypot(c.dx, c.dy))
          .slice(0, 2),
      });
  };
  // Per frame: bird warning → dive → pull-up times, boss tell → stuck,
  // and the calm between wave crashes at each wave.
  const track = new Map();
  let bossTell = 0,
    bossPrev = '';
  const waveCrashEnd = new Map();
  s.events.on('postupdate', () => {
    const now = s.time.now;
    for (const e of s.enemies.getChildren()) {
      if (!e.active || e === s.boss) continue;
      const st = e.getData('state');
      const k = track.get(e) || { st: '', tell: 0, dive: 0, min: 1e9 };
      if (st !== k.st) {
        if (st === 'tell') {
          k.tell = now;
          k.min = 1e9;
        }
        if (st === 'dive') k.dive = now;
        if (k.st === 'dive' && k.tell)
          M.birds.push({
            kind: e.getData('kind'),
            tellMs: Math.round(k.dive - k.tell),
            tellToImpactMs: Math.round(now - k.tell),
            closestPx: Math.round(k.min),
          });
        k.st = st;
      }
      if (st === 'dive')
        k.min = Math.min(k.min, Math.hypot(e.x - s.hero.x, e.y - s.hero.y));
      track.set(e, k);
    }
    if (s.boss && s.bossState?.active) {
      const st = s.bossState.state;
      if (st !== bossPrev) {
        if (st === 'tell') bossTell = now;
        if (st === 'stuck' && bossTell)
          M.boss.push({
            tellToImpactMs: Math.round(now - bossTell),
            dx: Math.round(Math.abs(s.boss.x - s.hero.x)),
          });
        bossPrev = st;
      }
    }
    for (const w of s.w4?.waves || []) {
      const prev = w._prev;
      if (prev === 'crash' && w.state !== 'crash')
        waveCrashEnd.set(w.col, s.clock);
      if (prev !== 'warn' && w.state === 'warn' && waveCrashEnd.has(w.col))
        M.waves.push({
          col: w.col,
          calmS: +(s.clock - waveCrashEnd.get(w.col)).toFixed(2),
        });
      w._prev = w.state;
    }
  });
}, LEVEL);
await wait(600);

// ---- touch controls (CDP multi-touch, like tests/mobile.mjs) ----
const cdp = await ctx.newCDPSession(page);
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
const box = async (sel) => {
  const r = await page.locator(sel).boundingBox();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width };
};
const stickBox = await box('.stick-base');
const jumpBox = await box('[data-touch="jump"]');
const throwBox = await box('[data-touch="throw"]');
const R = stickBox.w * 0.4;
let stickNow = 0;
const setStick = async (v) => {
  if (v === stickNow) return;
  if (v === 0) {
    const [x, y] = touches.get(1) || [stickBox.x, stickBox.y];
    touches.delete(1);
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: [{ id: 1, x, y }],
    });
  } else {
    const dx = Math.sign(v) * R * (Math.abs(v) === 2 ? 1.6 : 0.6);
    if (!touches.has(1)) {
      touches.set(1, [stickBox.x, stickBox.y]);
      await send('touchStart');
    }
    touches.set(1, [stickBox.x + dx, stickBox.y]);
    await send('touchMove');
  }
  stickNow = v;
};
const btn = async (id, b, on) => {
  if (on && !touches.has(id)) {
    touches.set(id, [b.x, b.y]);
    await send('touchStart');
  } else if (!on && touches.has(id)) {
    const [x, y] = touches.get(id);
    touches.delete(id);
    // CDP: a touchEnd lists the point being lifted.
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: [{ id, x, y }],
    });
  }
};

if (process.env.STICKTEST) {
  await ev(() => {
    window.PL = [];
    for (const t of [
      'pointerdown',
      'pointerup',
      'pointercancel',
      'lostpointercapture',
    ])
      document.addEventListener(
        t,
        (e) =>
          window.PL.push(
            t +
              ':' +
              e.pointerId +
              ':' +
              (e.target.className || e.target.tagName),
          ),
        true,
      );
  });
  await btn(2, jumpBox, true);
  await wait(100);
  await setStick(1);
  await wait(200);
  await btn(2, jumpBox, false);
  await wait(300);
  console.error('PL', JSON.stringify(await ev(() => window.PL)));
}
// ---- what the player sees ----
const look = () =>
  ev(() => {
    const s = window.S,
      b = s.hero.body,
      hx = b.center.x;
    const row = Math.floor((b.bottom + 4) / 24);
    const st = (c, r) => s.standable(c, r);
    const floorAt = (c) => {
      for (let r = row - 3; r <= row + 3; r++)
        if (st(c, r) && !st(c, r - 1)) return r;
      return 99;
    };
    const meta = s.L.meta.waves;
    const phase = (col) => {
      if (!meta) return 0;
      const k =
        (((s.clock + col * (meta.roll ?? 0.29)) % meta.period) + meta.period) %
        meta.period;
      return k;
    };
    const en = s.enemies
      .getChildren()
      .filter((e) => e.active && e !== s.boss)
      .map((e) => ({
        k: e.getData('kind'),
        st: e.getData('state'),
        x: e.x,
        y: e.y,
        dx: e.x - hx,
        dy: e.y - b.center.y,
        tx: e.getData('target')?.x,
      }))
      .filter((e) => Math.abs(e.dx) < 420 && Math.abs(e.dy) < 320);
    const items = s.items
      .getChildren()
      .filter((i) => i.active && i.getData('kind') !== 'coin')
      .map((i) => ({ k: i.getData('kind'), x: i.x, y: i.y }))
      .filter((i) => Math.abs(i.x - hx) < 360);
    const boxes = s.blocks
      .getChildren()
      .filter(
        (k) =>
          k.active &&
          k.getData('kind') === 'box' &&
          ['food', 'chili'].includes(k.getData('content')) &&
          Math.abs(k.x - hx) < 300,
      )
      .map((k) => ({ c: k.getData('content'), x: k.x, y: k.y }));
    const waves = (s.w4?.waves || []).map((w) => ({
      col: w.col,
      x: w.x,
      y: w.y,
      st: w.state,
      k: phase(w.col),
    }));
    const boss =
      s.boss && s.boss.active
        ? {
            st: s.bossState.state,
            x: s.boss.body.center.x,
            y: s.boss.y,
            bottom: s.boss.body.bottom,
            aimX: s.boss.getData('aimX'),
            left: s.bossState.until - s.time.now,
            hp: s.bossState.hp,
            active: !!s.bossState.active,
            arena: s.bossState.arenaX,
          }
        : null;
    return {
      mode: s.mode,
      lives: s.lives,
      clock: s.clock,
      x: hx,
      bottom: b.bottom,
      top: b.top,
      vx: b.velocity.x,
      vy: b.velocity.y,
      row,
      ground: b.blocked.down || b.touching.down,
      blockedR: b.blocked.right,
      blockedL: b.blocked.left,
      swim: !!s.swimming,
      power: s.power,
      brolly: !!s.w4?.umbrella,
      wetHere: s.L.at(Math.floor(hx / 24), row) === '$',
      floor: [-3, -2, -1, 0, 1, 2, 3, 4].map((k) =>
        floorAt(Math.floor(hx / 24) + k),
      ),
      wet: [-3, -2, -1, 0, 1, 2, 3, 4].map(
        (k) =>
          s.L.at(Math.floor(hx / 24) + k, floorAt(Math.floor(hx / 24) + k)) ===
          '$',
      ),
      waves,
      meta,
      en,
      items,
      boxes,
      boss,
      bolts: (s.w4?.bolts || []).map((q) => q.x),
      shells: s.hazards
        .getChildren()
        .filter((h) => h.active && h.getData('kind') === 'shell')
        .map((h) => ({ dx: h.x - hx, dy: h.y - b.center.y })),
      exit: s.spec.exit.x,
      cp: !!s.checkpoint,
    };
  });

// Wave groups along the path (waves at most 7 columns apart, same row),
// and for each a dry place to wait before it.
const level = await ev(() => {
  const s = window.S;
  const ws = [...s.w4.waves].sort((a, b) => a.col - b.col);
  const groups = [];
  for (const w of ws) {
    const g = groups[groups.length - 1];
    if (g && w.col - g.cols[g.cols.length - 1] <= 7 && w.y === g.y) {
      g.cols.push(w.col);
      g.x1 = w.x;
    } else groups.push({ cols: [w.col], x0: w.x, x1: w.x, y: w.y });
  }
  for (const g of groups) {
    // Last dry standable column at least 2.5 columns before the first wave.
    let wait = null;
    for (let c = Math.floor((g.x0 - 60) / 24); c > g.cols[0] - 12; c--) {
      for (let r = 2; r < 13; r++)
        if (s.standable(c, r) && !s.standable(c, r - 1)) {
          if (s.L.at(c, r) !== '$' && r * 24 >= g.y - 4 * 24) wait = c;
          break;
        }
      if (wait !== null) break;
    }
    g.wait = wait === null ? g.x0 - 70 : wait * 24 + 12;
  }
  return { groups, cpX: s.L.checkpoint ? s.L.checkpoint.x : 0 };
});
console.error(
  'wave groups',
  JSON.stringify(level.groups.map((g) => [g.cols, Math.round(g.wait / 24)])),
);

// ---- the player ----
const hist = [];
const t0 = Date.now();
let lives = 3,
  deaths = 0,
  end = 'timeout';
let jumpUntil = 0,
  jumpCool = 0,
  throwUp = 0,
  lastThrow = 0,
  crossing = null,
  dodge = null,
  stuckSince = Date.now(),
  lastX = 0,
  lastLog = 0;
const calmLeft = (o, g) => {
  // Seconds of calm left at this wave group (they break together).
  const m = o.meta;
  const w = o.waves.find((q) => q.col === g.cols[0]);
  if (!m || !w) return 9;
  const calm0 = m.warn + m.crash;
  if (w.k < calm0) return -1;
  return m.period - w.k;
};
while (Date.now() - t0 < LIMIT) {
  const now = Date.now();
  const cur = await look();
  hist.push({ t: now, o: cur });
  while (hist.length > 2 && hist[1].t <= now - REACT) hist.shift();
  const o = hist[0].o; // what we saw REACT ms ago
  if (cur.lives < lives) {
    deaths++;
    lives = cur.lives;
    crossing = null;
    dodge = null;
  }
  if (cur.mode === 'clear' || cur.mode === 'win') {
    end = 'clear';
    await wait(2500);
    break;
  }
  if (cur.mode === 'over') {
    end = 'over';
    break;
  }
  if (now - lastLog > 10000) {
    lastLog = now;
    console.error(
      `[${Math.round((now - t0) / 1000)}s] ${cur.mode} col=${(cur.x / T).toFixed(1)} row=${cur.row} lives=${cur.lives} power=${cur.power} brolly=${cur.brolly}${cur.boss?.active ? ' boss=' + cur.boss.st + ' hp' + cur.boss.hp : ''}` +
        (process.env.DEBUG
          ? ' ' +
            JSON.stringify({
              items: cur.items,
              boxes: cur.boxes,
              en: cur.en.map((e) => [
                e.k,
                e.st,
                Math.round(e.dx),
                Math.round(e.dy),
              ]),
            })
          : ''),
    );
  }
  if (cur.mode !== 'play' || o.mode !== 'play') {
    await setStick(0);
    await btn(2, jumpBox, false);
    await wait(40);
    continue;
  }
  if (Math.abs(cur.x - lastX) > 10) {
    lastX = cur.x;
    stuckSince = now;
  }
  let stick = 2,
    jump = false,
    fire = false;
  const ground = o.ground;
  // 1. The kit: bump the ful and chili boxes, pick up what drops out, take
  // an umbrella. (Start, and the checkpoint after a respawn.)
  const kitBox = o.boxes.find(
    (k) =>
      (k.c === 'food' && o.power === 0) || (k.c === 'chili' && o.power < 2),
  );
  const item = o.items.find(
    (i) => ['food', 'chili'].includes(i.k) && Math.abs(i.y - o.bottom) < 90,
  );
  const bossOn = o.boss && o.boss.active;
  // Don't chase a box item out past the waves' waiting spot.
  const nextG = level.groups.find((q) => q.x1 + 45 > o.x);
  const safeX = nextG && o.x < nextG.x0 ? nextG.wait - 30 : 1e9;
  // Birds: a warning ("!") or a dive aimed near us comes first.
  const threat0 = o.en.find(
    (e) =>
      (e.k === 'skua' || e.k === 'crow' || e.k === 'pigeon') &&
      (e.st === 'tell' || e.st === 'dive') &&
      Math.abs((e.tx ?? o.x) - o.x) < 70,
  );
  if (!bossOn && threat0 && !crossing) {
    if (!dodge) dodge = threat0.dx > 0 ? -1 : 1;
    stick = dodge * 2;
  } else if (
    !bossOn &&
    item &&
    Math.abs(item.x - o.x) < 300 &&
    item.x < safeX
  ) {
    // Aim where we will be by the time the thumb moves (we see late).
    const d = item.x - (o.x + (o.vx * REACT) / 1000);
    stick = Math.abs(d) < 10 ? 0 : Math.sign(d) * (Math.abs(d) > 70 ? 2 : 1);
  } else if (
    !bossOn &&
    !o.swim &&
    kitBox &&
    kitBox.x - o.x > -120 &&
    Math.abs(kitBox.x - o.x) < 260 &&
    o.power < 2
  ) {
    const d = kitBox.x - (o.x + (o.vx * REACT) / 1000);
    if (Math.abs(d) > 14) stick = Math.sign(d) * (Math.abs(d) > 70 ? 2 : 1);
    else stick = 0;
    if (ground && Math.abs(kitBox.x - o.x) < 11) jump = true;
  } else if (bossOn) {
    // 3. The boss: step away from his warning, stomp/throw while stuck.
    const B = o.boss;
    const d = B.x - o.x,
      ad = Math.abs(d);
    const lo = B.arena + 40,
      hi = o.exit + 60;
    if (B.st === 'tell' || B.st === 'dive') {
      const aim = B.aimX ?? o.x;
      // Run away from his side (under his dive path is the worst place),
      // unless the wall is too close behind.
      if (!dodge) {
        dodge = Math.sign(o.x - B.x) || 1;
        if ((dodge < 0 && o.x - lo < 120) || (dodge > 0 && hi - o.x < 120))
          dodge = -dodge;
      }
      stick = Math.abs(o.x - aim) > 110 ? 0 : dodge * 2;
    } else {
      dodge = null;
      if (B.st === 'hurt') stick = -Math.sign(d) * 2;
      else if (B.st === 'stuck' && B.left - REACT > 350 + ad * 2) {
        // Walk up and hop onto his back (where we'll be when the thumb
        // moves, since we see late).
        const pd = Math.abs(B.x - (o.x + (o.vx * REACT) / 1000));
        stick = Math.sign(d) * (pd > 160 ? 2 : 1);
        if (ground && pd < 45) stick = -Math.sign(d);
        if (ground && pd >= 55 && pd <= 105) jump = true;
        if (!ground) stick = Math.sign(d);
      } else if (B.st === 'stuck' || ['gust', 'rise', 'hurt'].includes(B.st)) {
        stick = ad < 190 ? -Math.sign(d) * 2 : 0;
      } else {
        stick = ad < 140 ? -Math.sign(d) : ad > 220 ? Math.sign(d) : 0;
      }
      if (o.x < lo + 10 && stick < 0) stick = 0;
      if (o.x > hi - 10 && stick > 0) stick = 0;
    }
    if (o.bolts.length) {
      const xs = [...o.bolts].sort((a, b) => a - b);
      const spots = [
        xs[0] - 45,
        ...xs.slice(1).map((x, i) => (x + xs[i]) / 2),
        xs[xs.length - 1] + 45,
      ].filter((x) => x > lo && x < hi);
      // Prefer the gap away from the boss (he shoves you back).
      const cost = (x) =>
        Math.abs(x - o.x) +
        (Math.sign(x - o.x) === Math.sign(B.x - o.x) ? 120 : 0);
      const tgt = spots.sort((a, b) => cost(a) - cost(b))[0];
      const dd = tgt - o.x;
      stick = Math.abs(dd) > 12 ? Math.sign(dd) * 2 : 0;
      jump = false;
    }
    // A called-in gull warning or diving at us: step out of its line,
    // unless the boss himself is diving.
    if (threat0 && B.st !== 'tell' && B.st !== 'dive' && !o.bolts.length) {
      const away =
        Math.sign(o.x - (threat0.tx ?? o.x + threat0.dx)) ||
        -Math.sign(threat0.dx) ||
        1;
      stick = o.x < lo + 30 ? 2 : o.x > hi - 30 ? -2 : away * 2;
    }
    // A shell falling toward us: step out from under it.
    const shell = (o.shells || []).find((q) => Math.abs(q.dx) < 34 && q.dy < 0);
    if (shell && !o.bolts.length && B.st !== 'tell' && B.st !== 'dive')
      stick = (shell.dx > 0 ? -2 : 2) * (o.x < lo + 40 ? -1 : 1);
    if (B.hp <= 0 || B.st === 'dead') stick = Math.sign(o.exit - o.x) * 2;
  } else {
    // 2. On the way: waves, birds, balls, umbrellas, gaps.
    const g = level.groups.find(
      (q) => q.x1 + 45 > o.x && Math.abs(q.y - o.bottom) < 4 * T,
    );
    if (g && !crossing && o.x < g.x0 - 40) {
      const need = (g.x1 + 50 - o.x) / 200 + (o.wetHere ? 0.9 : 0.6);
      const left = calmLeft(o, g) - REACT / 1000;
      if (left < need) {
        // Not enough calm left: walk up to the dry spot and wait there.
        const d = g.wait - 10 - (o.x + (o.vx * REACT) / 1000);
        stick = Math.abs(d) < 12 ? 0 : d > 0 ? (d > 90 ? 2 : 1) : -1;
        if (o.x > g.wait + 10 && o.wetHere) stick = -1;
      } else {
        crossing = g;
        if (process.env.DEBUG)
          console.error('cross', {
            x: Math.round(o.x),
            vx: Math.round(o.vx),
            left: +left.toFixed(2),
            need: +need.toFixed(2),
            wet: o.wetHere,
            ts: Math.round((now - t0) / 100) / 10,
          });
      }
    }
    if (crossing) {
      stick = 2;
      if (o.x > crossing.x1 + 45) crossing = null;
    }
    // Birds: a warning ("!") or a dive at us → shoot it if armed, and get
    // away from where it is aiming.
    const threat = o.en.find(
      (e) =>
        (e.k === 'skua' || e.k === 'crow' || e.k === 'pigeon') &&
        (e.st === 'tell' || e.st === 'dive') &&
        Math.abs((e.tx ?? o.x) - o.x) < 70,
    );
    if (threat && !crossing) {
      if (!dodge) dodge = threat.dx > 0 ? -1 : 1;
      stick = dodge * 2;
      if (o.wetHere && dodge < 0 && Math.abs((threat.tx ?? o.x) - o.x) > 40)
        stick = 0;
    } else if (!threat) dodge = null;
    if (o.power === 2) {
      const target = o.en.find(
        (e) =>
          ['skua', 'ball', 'brolly', 'crow', 'pigeon'].includes(e.k) &&
          e.dx > 30 &&
          e.dx < 230 &&
          e.dy > -170 &&
          e.dy < 40,
      );
      if (target && target.k !== 'ball' && now - lastThrow > 450) fire = true;
    }
    // Beach ball on our level: wait for it to bounce away, or hop on it.
    // Beach balls and loose umbrellas on our level: time a running hop so
    // we come down on top (pop / catch it), or back off if too close.
    const low = o.en.find(
      (e) =>
        (e.k === 'ball' || e.k === 'brolly') &&
        e.dx > -10 &&
        e.dx < 200 &&
        Math.abs(e.dy) < 60,
    );
    // A loose umbrella swinging just above the path: wait for it to swing
    // off rather than jump into it.
    const over = o.en.find(
      (e) =>
        e.k === 'brolly' &&
        e.dx > -50 &&
        e.dx < 110 &&
        e.dy < -10 &&
        e.dy > -110,
    );
    if (over && !crossing && !threat && o.power < 2) {
      stick = over.dx < 30 ? -1 : 0;
    } else if (low && ground && !crossing && !threat) {
      const close = Math.max(120, Math.abs(o.vx) + 60);
      if (low.dx >= close * 0.42 && low.dx <= close * 0.62) {
        jump = true;
        stick = 2;
      } else if (low.dx < close * 0.42) stick = -1;
    }
    // Gaps, steps, walls.
    const c0 = 3; // index of our column in floor[]
    const f = o.floor;
    const stepUp = f[c0 + 1] < f[c0] || f[c0 + 2] < f[c0] - 1;
    const pit = f[c0 + 1] > f[c0] + 2 || f[c0 + 2] > f[c0] + 2;
    if (ground && stick > 0 && (o.blockedR || stepUp || pit)) jump = true;
    if (o.swim && (o.blockedR || now - stuckSince > 600)) jump = true;
    if (ground && now - stuckSince > 2500 && stick !== 0) jump = true;
    if (o.x > o.exit + 8) stick = -1;
  }
  // Boss: throw chili at him from a distance whenever armed.
  if (
    bossOn &&
    o.power === 2 &&
    !['dead', 'hurt'].includes(o.boss.st) &&
    Math.abs(o.boss.x - o.x) > 60 &&
    Math.abs(o.boss.x - o.x) < 260 &&
    Math.sign(o.boss.x - o.x) === Math.sign(cur.vx || o.boss.x - o.x)
  )
    fire = true;
  // In the water: always stroke toward the way out.
  if (o.swim && (o.blockedR || o.blockedL || now - stuckSince > 600))
    jump = true;
  // Throw facing the target: turn toward it first.
  if (fire && now - lastThrow > 450) {
    await btn(3, throwBox, true);
    throwUp = now + 90;
    lastThrow = now;
  }
  if (touches.has(3) && now > throwUp) await btn(3, throwBox, false);
  if (process.env.DEBUG && now - (globalThis.lastDbg || 0) > 2000) {
    globalThis.lastDbg = now;
    console.error('dbg', {
      stick,
      jump,
      fire,
      stickNow,
      touches: [...touches.keys()],
      x: Math.round(o.x),
      vx: Math.round(cur.vx),
      ground: o.ground,
    });
  }
  await setStick(stick);
  if (jump && now > jumpCool) {
    await btn(2, jumpBox, true);
    jumpUntil = now + 300;
    jumpCool = now + 550;
  }
  // Glide: keep jump held while falling with an umbrella over a pit.
  const hold =
    now < jumpUntil || (cur.brolly && cur.vy > 60 && !cur.ground && !cur.swim);
  await btn(2, jumpBox, hold);
  await wait(35);
}
await setStick(0);
const M = await ev(() => window.M);
const fin = await look();
console.log(
  JSON.stringify({
    end,
    deaths,
    lives: fin.lives,
    col: +(fin.x / T).toFixed(1),
    secs: Math.round((Date.now() - t0) / 1000),
    boss: fin.boss && { st: fin.boss.st, hp: fin.boss.hp },
    hurts: M.hurts,
    birds: M.birds,
    bossDives: M.boss,
    waves: M.waves.slice(0, 12),
    errors,
  }),
);
await ctx.close();
await browser.close();
