// Runtime check of World 3 (دمياط): conveyor belts, toppling furniture,
// swinging lamps, the tide, boats, nets, the sea, the five new enemies and
// the crab boss, driven in the real scene.
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
// Cairo and the countryside cleared: world 3's first level is open.
await page.addInitScript(() => {
  if (window.sessionStorage.getItem('seeded')) return;
  window.sessionStorage.setItem('seeded', '1');
  window.localStorage.clear();
  window.localStorage.setItem(
    'hawari-progress',
    JSON.stringify({
      unlocked: 8,
      best: {},
      coins: {},
      secrets: {},
      cleared: {
        lanterns: true,
        market: true,
        roofs: true,
        metro: true,
        fields: true,
        canal: true,
        saqia: true,
        jurn: true,
      },
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
    go(i) {
      s.score = 0;
      s.lives = 9;
      s.power = 0;
      s.checkpoint = false;
      s.startLevel(i);
      s.remaining = 999;
      s.enemies.clear(true, true);
      s.hurtUntil = s.time.now + 1e8;
    },
    place(x, feet, vy = 0) {
      const b = s.hero.body;
      const half = s.hero.y - b.bottom;
      b.reset(x, feet - 26 + half);
      s.hero.setVelocity(0, vy);
      // The boss-fight camera frames itself; snapping it would fake a cut.
      if (!s.camFocus) s.cameras.main.centerOn(x, feet - 80);
    },
    hero() {
      const b = s.hero.body;
      return {
        x: b.center.x,
        bottom: b.bottom,
        vx: b.velocity.x,
        vy: b.velocity.y,
        grounded: b.blocked.down || b.touching.down || s.riding,
        swim: s.swimming,
        hang: !!s.w3?.hanging,
        mode: s.mode,
      };
    },
  };
});
const hero = () => ev(() => window.T.hero());
const sample = async (ms, fn) => {
  const out = [];
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    out.push(await ev(fn));
    await wait(16);
  }
  return out;
};
const shot = (name) =>
  page.screenshot({ path: `/workspace/hawari-shots/${name}` });
const log = (...a) => console.log('✔', ...a);
const jumpPeak = async () => {
  await page.keyboard.down('Space');
  const vy = Math.min(...(await sample(260, () => window.T.hero().vy)));
  await page.keyboard.up('Space');
  return vy;
};
/** Make the next hit count: one food power so a hit shows as a power loss. */
const vulnerable = () =>
  ev(() => {
    const s = window.T.s;
    s.hurtUntil = 0;
    s.invincible = 0;
    s.setPower(1, false);
  });
const levelWith = async (feature) => {
  for (let i = 8; i < 12; i++) {
    await ev((i) => window.T.go(i), i);
    if (await ev((f) => window.T.s.L[f].length > 0, feature)) return i;
  }
  throw new Error('no world 3 level has ' + feature);
};

/* Map: title → Egypt map on Damietta, one level open, sea music. */
await page.locator('[data-screen="title"] [data-action="start"]').click();
await wait(400);
assert.equal(await ev(() => window.T.s.mode), 'map');
assert.equal(
  await page.locator('.world-pin.selected').getAttribute('data-world'),
  '2',
);
assert.equal(await page.locator('.map-node:not([disabled])').count(), 1);
await shot('13-map-world3-unlocked-desk.png');
await page.locator('.map-node:not([disabled])').click();
await wait(700);
assert.equal(await ev(() => window.T.s.mode), 'play');
assert.equal(await ev(() => window.T.s.level), 8, 'world 3 level 1');
const audio = await ev(() => window.hawariAudio.state());
assert.equal(audio.track, 10, 'Damietta music');
assert.match(audio.trackName, /سمسمية/);
log('map opens world 3, track', audio.trackName);
await shot('13-w3-level1.png');

/* Conveyor belt: standing still, the belt carries you along. */
{
  const li = await levelWith('belts');
  const belt = await ev(() => {
    const b = window.T.s.L.belts.sort((a, b) => b.c1 - b.c0 - (a.c1 - a.c0))[0];
    return b;
  });
  const x = belt.dir > 0 ? belt.c0 * 24 + 30 : (belt.c1 + 1) * 24 - 30;
  await ev(([x, f]) => window.T.place(x, f), [x, belt.row * 24]);
  await wait(150);
  const x0 = (await hero()).x;
  await wait(600);
  const h = await hero();
  const drift = h.x - x0;
  assert.ok(
    Math.sign(drift) === belt.dir && Math.abs(drift) > 25 && h.grounded,
    `the belt carries him (${drift | 0})`,
  );
  await shot('13-w3-belt.png');
  log(`L${li - 7} belt drift ${drift | 0}`);
}

/* Furniture stack: stand on top, it wobbles and topples into a bridge. */
{
  const li = await levelWith('stacks');
  const st = await ev(() => {
    const s = window.T.s,
      p = s.w3.stacks[0];
    return { col: p.col, row: p.row, state: p.state };
  });
  assert.equal(st.state, 'stand');
  await ev(
    ([x, f]) => window.T.place(x, f),
    [st.col * 24 + 12, (st.row - 2) * 24],
  );
  await wait(400);
  assert.ok((await hero()).grounded, 'the stack holds him at first');
  await wait(1100);
  assert.equal(
    await ev(() => window.T.s.w3.stacks[0].state),
    'fallen',
    'the stack topples',
  );
  await shot('13-w3-stack-toppled.png');
  await ev(
    ([x, f]) => window.T.place(x, f),
    [(st.col + 2) * 24 + 12, st.row * 24],
  );
  await wait(500);
  const h = await hero();
  assert.ok(
    h.grounded && Math.abs(h.bottom - st.row * 24) < 3,
    `the fallen stack is a bridge ${JSON.stringify(h)}`,
  );
  log(`L${li - 7} stack toppled into a bridge`);
}

/* Swinging lamp: swings on an arc and carries the hero. */
{
  const li = await levelWith('lamps');
  const track = await sample(1400, () => {
    const m = window.T.s.moverList.find((m) => m.lamp);
    return [m.img.body.center.x, m.img.body.top, m.lamp.px, m.lamp.py];
  });
  const xs = track.map((t) => t[0]);
  assert.ok(Math.max(...xs) - Math.min(...xs) > 30, 'the lamp swings');
  // The ropes stay parallel, equally long and end on the platform's edges.
  const ropes = await sample(900, () => {
    const m = window.T.s.moverList.find((m) => m.lamp);
    return {
      ropes: m.lamp.ropes,
      rot: m.img.rotation,
      left: m.img.body.left,
      right: m.img.body.right,
      top: m.img.body.top,
    };
  });
  for (const { ropes: r, rot, left, right, top } of ropes) {
    assert.equal(rot, 0, 'the swing platform stays level');
    const len = r.map(([a, b, c, d]) => Math.hypot(c - a, d - b));
    assert.ok(Math.abs(len[0] - len[1]) < 0.5, `ropes equal ${len}`);
    for (const [, , x, y] of r) {
      assert.ok(x > left && x < right, 'rope meets the platform');
      assert.ok(Math.abs(y - top) < 3, 'rope ends at the platform top');
    }
  }
  for (const [x, y, px, py] of track) {
    const r = Math.hypot(x - px, y - py);
    assert.ok(Math.abs(r - 72) < 8, `lamp stays on its chain (${r | 0})`);
  }
  await ev(() => {
    const m = window.T.s.moverList.find((m) => m.lamp);
    window.T.lamp = m;
    window.T.place(m.img.body.center.x, m.img.body.top);
  });
  await wait(600);
  const ride = await ev(() => {
    const m = window.T.lamp,
      h = window.T.hero();
    return {
      dy: Math.abs(h.bottom - m.img.body.top),
      dx: Math.abs(h.x - m.img.body.center.x),
      grounded: h.grounded,
    };
  });
  assert.ok(
    ride.dy < 4 && ride.dx < 30 && ride.grounded,
    `the lamp carries him ${JSON.stringify(ride)}`,
  );
  await shot('13-w3-lamp.png');
  log(`L${li - 7} lamp ride`, JSON.stringify(ride));
}

/* The tide: the sea rises and falls; the boats ride it and drift. */
{
  const li = await levelWith('boats');
  const tide = await ev(() => window.T.s.L.meta.tide);
  assert.ok(tide && tide.amp >= 2, 'the harbour has a tide');
  const read = () =>
    ev(() => {
      const s = window.T.s,
        k = s.canals.find((c) => c.sea),
        m = s.moverList.find((m) => m.boat);
      return { sea: k.top, boat: m.img.body.top, x: m.img.x };
    });
  await ev(() => {
    window.T.s.clock = 0;
  });
  await wait(900);
  const low = await read();
  await shot('13-w3-tide-low.png');
  await ev((p) => (window.T.s.clock = p / 2), tide.period);
  await wait(900);
  const high = await read();
  await shot('13-w3-tide-high.png');
  const rise = low.sea - high.sea;
  assert.ok(
    Math.abs(rise - tide.amp * 24) < 10,
    `the tide lifts the sea ${rise | 0}px`,
  );
  assert.ok(
    Math.abs(low.boat - high.boat - rise) < 14,
    `the boat rides the tide (${(low.boat - high.boat) | 0})`,
  );
  assert.ok(
    Math.abs(high.boat - (high.sea - 24)) < 8,
    'the deck sits one tile above the water',
  );
  await wait(800);
  assert.ok(Math.abs((await read()).x - high.x) > 15, 'the boat drifts');
  // Ride it.
  await ev(() => {
    const m = window.T.s.moverList.find((m) => m.boat);
    window.T.boat = m;
    window.T.place(m.img.body.center.x, m.img.body.top);
  });
  await wait(700);
  const ride = await ev(() => {
    const m = window.T.boat,
      h = window.T.hero();
    return {
      dy: Math.abs(h.bottom - m.img.body.top),
      dx: Math.abs(h.x - m.img.body.center.x),
      grounded: h.grounded,
    };
  });
  assert.ok(
    ride.dy < 5 && ride.dx < 40 && ride.grounded,
    `the boat carries him ${JSON.stringify(ride)}`,
  );
  await shot('13-w3-boat.png');
  log(`L${li - 7} tide ${rise | 0}px, boat ride`, JSON.stringify(ride));
}

/* The sea: swim at the surface, swim-jump out. */
{
  const k = await ev(() => {
    const k = window.T.s.canals.find((c) => c.sea);
    return { x0: k.x0, x1: k.x1, top: k.top, bottom: k.bottom };
  });
  await ev(([x, f]) => window.T.place(x, f), [(k.x0 + k.x1) / 2, k.top + 10]);
  await wait(900);
  const h = await hero();
  assert.ok(h.swim, 'in the sea the hero swims');
  assert.ok(h.bottom < k.bottom, 'and floats');
  const vy = await jumpPeak();
  assert.ok(vy < -380, `swim jump (${vy | 0})`);
  log('sea swim, jump', vy | 0);
}

/* Net: climb up, hang still, hop off the top. */
{
  const li = await levelWith('nets');
  const net = await ev(() => {
    const r = window.T.s.w3.nets.sort((a, b) => b.height - a.height)[0];
    return { x: r.centerX, top: r.y, bottom: r.bottom };
  });
  await ev(([x, f]) => window.T.place(x, f, 0), [net.x, net.bottom - 30]);
  await wait(80);
  await page.keyboard.down('Space');
  await wait(60);
  const y0 = (await hero()).bottom;
  await wait(500);
  const climbing = await hero();
  await page.keyboard.up('Space');
  assert.ok(climbing.hang, 'he grabs the net');
  assert.ok(
    y0 - climbing.bottom > 30,
    `and climbs (${(y0 - climbing.bottom) | 0})`,
  );
  await wait(400);
  const still = await hero();
  assert.ok(
    still.hang && Math.abs(still.vy) < 5,
    `hanging still ${JSON.stringify(still)}`,
  );
  await shot('13-w3-net.png');
  await ev(([x, f]) => window.T.place(x, f, 0), [net.x, net.top + 8]);
  await wait(120);
  const hop = await jumpPeak();
  assert.ok(hop < -360, `hop off the top (${hop | 0})`);
  log(`L${li - 7} net climb ${(y0 - climbing.bottom) | 0}px, hop ${hop | 0}`);
}

/* The five new enemies on flat ground at level 1's start. */
{
  await ev(() => window.T.go(8));
  const base = await ev(() => {
    const s = window.T.s;
    window.T.place(s.spec.start.x + 40, s.spec.start.y + 13);
    return { x: s.spec.start.x + 40, y: s.spec.start.y };
  });
  await wait(300);
  const spawn = (dx, dy, kind) =>
    ev(
      ([x, y, k]) => {
        window.T.s.enemies.clear(true, true);
        window.T.e = window.T.s.enemy(x, y, k);
      },
      [base.x + dx, base.y - 12 + dy, kind],
    );
  const stompIt = () =>
    ev(() => {
      const e = window.T.e;
      window.T.place(e.x, e.body.top - 2, 380);
    });
  // Crab: raises its claws on a timer; stomping then hurts.
  await spawn(200, 0, 'crab');
  const crab = await sample(3600, () => window.T.e.getData('state'));
  assert.ok(crab.includes('guard') && crab.includes('walk'), 'crab guards');
  await ev(() => {
    const e = window.T.e;
    e.setData('state', 'guard').setData('until', window.T.s.time.now + 5000);
  });
  await vulnerable();
  await stompIt();
  await wait(250);
  assert.equal(
    await ev(() => window.T.s.power),
    0,
    'claws up: the stomp hurts',
  );
  assert.ok(await ev(() => window.T.e.active), 'and the crab is fine');
  await ev(() => {
    const s = window.T.s;
    s.hurtUntil = s.time.now + 1e8;
    window.T.e.setData('state', 'walk').setData('until', s.time.now + 5000);
  });
  await stompIt();
  await wait(250);
  assert.ok(!(await ev(() => window.T.e.active)), 'claws down: stomped');
  // Saw: can't be stomped, chili cuts it down.
  await spawn(240, 0, 'saw');
  await wait(300);
  const sawVx = await ev(() => Math.abs(window.T.e.body.velocity.x));
  assert.ok(sawVx > 110, `the saw rolls fast (${sawVx | 0})`);
  await vulnerable();
  await stompIt();
  await wait(250);
  assert.equal(await ev(() => window.T.s.power), 0, 'stomping a saw hurts');
  assert.ok(await ev(() => window.T.e.active), 'the saw survives a stomp');
  await ev(() => window.T.s.damageEnemy(window.T.e));
  assert.ok(!(await ev(() => window.T.e.active)), 'chili breaks the saw');
  // Plane: lines up and dashes.
  await ev((base) => {
    const s = window.T.s;
    s.hurtUntil = s.time.now + 1e8;
    window.T.place(base.x, base.y + 13);
  }, base);
  await spawn(150, 0, 'plane');
  const plane = await sample(1600, () => [
    window.T.e.getData('state'),
    window.T.e.body?.velocity.x ?? 0,
  ]);
  assert.ok(
    plane.some(([st, vx]) => st === 'charge' && vx < -200),
    'the plane dashes at him',
  );
  // Gull: drops a shell from above.
  await spawn(0, -170, 'gull');
  const shells = await sample(2600, () =>
    window.T.s.hazards.getChildren().some((h) => h.getData('kind') === 'shell'),
  );
  assert.ok(shells.some(Boolean), 'the gull drops a shell');
  // Thief cat: steals coins instead of hurting, gives them back when stomped.
  await ev((base) => {
    const s = window.T.s;
    s.hazards.clear(true, true);
    s.coinCount = 12;
    s.levelCoins = 12;
    s.hurtUntil = 0;
    s.setPower(1, false);
    window.T.place(base.x, base.y + 13);
  }, base);
  await spawn(60, 0, 'thief');
  await ev(() => {
    window.T.e.setVelocityX(-120);
  });
  const stole = await sample(1500, () => [
    window.T.s.coinCount,
    window.T.e.getData('state'),
  ]);
  assert.ok(
    stole.some(([c, st]) => c === 7 && st === 'flee'),
    `the cat steals 5 and runs ${JSON.stringify(stole.at(-1))}`,
  );
  assert.equal(await ev(() => window.T.s.power), 1, 'stealing does not hurt');
  await shot('13-w3-thief.png');
  await ev(() => {
    window.T.s.killEnemy(window.T.e);
  });
  const dropped = await ev(
    () =>
      window.T.s.items.getChildren().filter((i) => i.getData('kind') === 'coin')
        .length,
  );
  assert.equal(dropped, 5, 'the stolen coins spill back out');
  await ev(() => {
    window.T.s.enemies.clear(true, true);
  });
  log('crab/saw/plane/gull/thief behave');
}

/* Boss: أبو مقص at رأس البر. */
await ev(() => window.T.go(11));
const arena = await ev(() => {
  const s = window.T.s;
  return { x: s.bossState.arenaX, floor: s.boss.body.bottom };
});
const toArena = () =>
  ev(([x, f]) => window.T.place(x + 110, f - 2), [arena.x, arena.floor]);
await toArena();
await wait(400);
assert.ok(await ev(() => window.T.s.bossState.active), 'boss wakes');
assert.equal(
  (await ev(() => window.hawariAudio.state())).track,
  14,
  'boss theme',
);
assert.match(await page.locator('.boss-name').textContent(), /أبو مقص/);
const seen = new Set();
let worstCut = 0;
const waitState = async (st, ms = 9000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const [s, cut, dbg] = await ev(() => {
      const g = window.T.s,
        b = g.boss,
        v = g.cameras.main.worldView;
      const half = b.displayWidth / 2;
      const fits = Math.abs(g.hero.x - b.x) < v.width - 40 - half - 20;
      const cut = fits
        ? Math.max(0, v.x - (b.x - half), b.x + half - (v.x + v.width))
        : 0;
      return [
        g.bossState.state,
        cut,
        [b.x | 0, half, v.x | 0, v.width, g.hero.x | 0, g.bossState.arenaX],
      ];
    });
    if (cut > 4 && process.env.DEBUG_CUT)
      console.log('cut', s, cut, JSON.stringify(dbg));
    worstCut = Math.max(worstCut, cut);
    seen.add(s);
    if (s === st) return;
    await wait(16);
  }
  const why = await ev(() => {
    const g = window.T.s,
      b = g.boss;
    return {
      state: g.bossState.state,
      hp: g.bossState.hp,
      mode: g.mode,
      x: b.x | 0,
      bottom: b.body.bottom | 0,
      down: b.body.blocked.down,
      until: (g.bossState.until - g.time.now) | 0,
    };
  });
  throw new Error('boss never reached ' + st + ' ' + JSON.stringify(why));
};
const stomp = async (target) => {
  // Lands on the boss while its claws are stuck, until hp reaches target
  // (he may also land a lucky hit while it walks under him).
  const hp = await ev(() => window.T.s.bossState.hp);
  if (hp <= target) return;
  for (let tries = 0; tries < 6; tries++) {
    await waitState('stuck');
    await ev(() => {
      const s = window.T.s;
      window.T.place(s.boss.x, s.boss.body.top, 380);
    });
    await wait(200);
    if ((await ev(() => window.T.s.bossState.hp)) <= target) {
      await toArena();
      return;
    }
  }
  throw new Error('could not stomp the stuck crab');
};
// Claws up: a stomp bounces off and hurts.
await waitState('guard');
const hpA = await ev(() => window.T.s.bossState.hp);
await vulnerable();
await ev(() => {
  const s = window.T.s;
  window.T.place(s.boss.x, s.boss.body.top, 380);
});
await wait(150);
assert.equal(
  await ev(() => window.T.s.bossState.hp),
  hpA,
  'stomping raised claws does nothing',
);
assert.equal(await ev(() => window.T.s.power), 0, 'and it hurts');
await ev(() => {
  const s = window.T.s;
  s.hurtUntil = s.time.now + 1e8;
});
await toArena();
await waitState('stuck');
assert.ok(
  ['walk', 'guard', 'snap', 'stuck'].every((s) => seen.has(s)),
  `phase 1 pattern ${[...seen]}`,
);
await shot('13-w3-boss-phase1.png');
await stomp(5);
await stomp(4);
assert.equal(await ev(() => window.T.s.bossPhase()), 2, 'phase 2 at 4 hearts');
await waitState('spit', 12000);
await wait(150);
const bubbles = await ev(
  () =>
    window.T.s.hazards
      .getChildren()
      .filter((h) => h.getData('kind') === 'bubble').length,
);
assert.ok(bubbles >= 3, `phase 2 spits bubbles (${bubbles})`);
await shot('13-w3-boss-phase2.png');
await toArena();
await stomp(3);
await stomp(2);
assert.equal(await ev(() => window.T.s.bossPhase()), 3, 'phase 3 at 2 hearts');
const gulls = await ev(
  () =>
    window.T.s.enemies
      .getChildren()
      .filter((e) => e.active && e.getData('kind') === 'gull').length,
);
assert.ok(gulls >= 2, 'gulls join in phase 3');
assert.equal(
  (await ev(() => window.hawariAudio.state())).bossPhase,
  2,
  'boss music escalates',
);
await waitState('spit', 14000);
await waitState('walk', 3000);
await wait(60);
const waves = await ev(
  () =>
    window.T.s.hazards.getChildren().filter((h) => h.getData('kind') === 'wave')
      .length,
);
assert.ok(waves >= 1, `phase 3 sends waves (${waves})`);
await shot('13-w3-boss-phase3.png');
await toArena();
await stomp(1);
await stomp(0);
await wait(600);
assert.equal(
  await ev(() => window.T.s.bossState.defeated),
  true,
  'boss beaten',
);
assert.ok(
  worstCut <= 4,
  `the camera keeps the boss in frame (cut ${worstCut})`,
);
assert.equal(await ev(() => window.T.s.exitDoor.visible), true, 'exit opens');
await ev(() => {
  const s = window.T.s;
  window.T.place(s.spec.exit.x, s.spec.exit.y - 1);
});
await wait(500);
// World 3 done: the clear screen opens the road to Alexandria.
assert.equal(await ev(() => window.T.s.mode), 'clear', 'world 3 cleared');
assert.match(
  await page.locator('#clear-title').textContent(),
  /اسكندرية/,
  'the road to Alexandria opens',
);
assert.ok(
  (await ev(
    () => JSON.parse(window.localStorage.getItem('hawari-progress')).unlocked,
  )) >= 12,
  'world 4 unlocked',
);
await shot('14-w3-clear-to-alexandria.png');
log('boss: claws, snap, stuck, bubbles, waves, gulls, clear → اسكندرية');

assert.deepEqual(errors, [], 'no console errors');
await browser.close();
console.log('world 3 runtime: all good');
