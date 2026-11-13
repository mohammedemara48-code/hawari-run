// Runtime check of World 2 (الأرياف): mud, canals, saqia wheels, the donkey
// cart, the new enemies and the buffalo boss, driven in the real scene.
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
// Cairo already cleared: world 2's first level is open.
await page.addInitScript(() => {
  if (window.sessionStorage.getItem('seeded')) return;
  window.sessionStorage.setItem('seeded', '1');
  window.localStorage.clear();
  window.localStorage.setItem(
    'hawari-progress',
    JSON.stringify({
      unlocked: 4,
      best: {},
      coins: {},
      secrets: {},
      cleared: { lanterns: true, market: true, roofs: true, metro: true },
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
      s.cameras.main.centerOn(x, feet - 80);
    },
    hero() {
      const b = s.hero.body;
      return {
        x: b.center.x,
        bottom: b.bottom,
        vx: b.velocity.x,
        vy: b.velocity.y,
        grounded: b.blocked.down || b.touching.down,
        mud: s.onMud,
        swim: s.swimming,
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
/** Hold jump and record the strongest upward speed while it is held. */
const jumpPeak = async () => {
  await page.keyboard.down('Space');
  const vy = Math.min(...(await sample(260, () => window.T.hero().vy)));
  await page.keyboard.up('Space');
  return vy;
};
/** Scan levels 4-7 for a feature; returns the level index. */
const levelWith = async (feature) => {
  for (let i = 4; i < 8; i++) {
    await ev((i) => window.T.go(i), i);
    const has = await ev((f) => {
      const L = window.T.s.L;
      if (f === 'mud') {
        for (let r = 0; r < L.rows; r++)
          for (let c = 0; c < L.cols; c++) if (L.at(c, r) === 'u') return true;
        return false;
      }
      return L[f].length > 0;
    }, feature);
    if (has) return i;
  }
  throw new Error('no world 2 level has ' + feature);
};

/* Map: title → Egypt map on the countryside, one level open. */
await page.locator('[data-screen="title"] [data-action="start"]').click();
await wait(400);
assert.equal(await ev(() => window.T.s.mode), 'map');
assert.equal(
  await page.locator('.world-pin.selected').getAttribute('data-world'),
  '1',
);
assert.equal(await page.locator('.map-node:not([disabled])').count(), 1);
await page.locator('.map-node:not([disabled])').click();
await wait(700);
assert.equal(await ev(() => window.T.s.mode), 'play');
assert.equal(await ev(() => window.T.s.level), 4, 'world 2 level 1');
const audio = await ev(() => window.hawariAudio.state());
assert.equal(audio.track, 5, 'countryside music');
log('map opens world 2, track', audio.track);

/* Mud: half speed, weak jump. */
{
  const li = await levelWith('mud');
  const spot = await ev(() => {
    const L = window.T.s.L;
    // Longest run of mud tops.
    let best = { c: 0, r: 0, n: 0 };
    for (let r = 1; r < L.rows; r++)
      for (let c = 0; c < L.cols; c++) {
        if (L.at(c, r) !== 'u' || L.at(c, r - 1) === 'u') continue;
        let n = 0;
        while (L.at(c + n, r) === 'u' && L.at(c + n, r - 1) !== 'u') n++;
        if (n > best.n) best = { c, r, n };
        c += n;
      }
    return best;
  });
  assert.ok(spot.n >= 4, 'a real mud patch');
  await ev(([x, f]) => window.T.place(x, f), [spot.c * 24 + 14, spot.r * 24]);
  await wait(250);
  await page.keyboard.down('ArrowRight');
  const run = await sample(Math.min(900, spot.n * 24 * 9), () =>
    window.T.hero(),
  );
  await page.keyboard.up('ArrowRight');
  const onMud = run.filter((h) => h.mud);
  assert.ok(onMud.length > 5, 'standing on mud is detected');
  const vmax = Math.max(...onMud.map((h) => h.vx));
  assert.ok(vmax > 40 && vmax < 95, `mud halves the walk (${vmax | 0})`);
  await ev(([x, f]) => window.T.place(x, f), [spot.c * 24 + 14, spot.r * 24]);
  await wait(300);
  const jumpMud = await jumpPeak();
  // Same jump from firm ground at the level start.
  await ev(() => {
    const s = window.T.s;
    window.T.place(s.spec.start.x, s.spec.start.y + 13);
  });
  await wait(400);
  const jumpFirm = await jumpPeak();
  assert.ok(
    jumpMud > jumpFirm * 0.85 && jumpMud < jumpFirm * 0.7,
    `mud weakens the jump (${jumpMud | 0} vs ${jumpFirm | 0})`,
  );
  log(`L${li - 3} mud vmax ${vmax | 0}, jump ${jumpMud | 0}/${jumpFirm | 0}`);
}

/* Canal: float, drift with the current, swim-jump out. */
{
  const li = await levelWith('canals');
  const k = await ev(() => {
    const k = window.T.s.L.canals[0];
    return { x0: k.x0, x1: k.x1, top: k.top, bottom: k.bottom, dir: k.dir };
  });
  const x = k.dir > 0 ? k.x0 + 40 : k.x1 - 40;
  await ev(([x, f]) => window.T.place(x, f), [x, k.top]);
  await wait(900);
  const floating = await hero();
  assert.ok(floating.swim, 'in the canal the hero swims');
  assert.ok(floating.bottom < k.bottom + 2, 'and floats instead of sinking');
  const x0 = floating.x;
  await wait(500);
  const drift = (await hero()).x - x0;
  assert.ok(
    Math.sign(drift) === k.dir && Math.abs(drift) > 15,
    `the current carries him (${drift | 0})`,
  );
  await shot('13-w2-canal.png');
  const vy = await jumpPeak();
  assert.ok(vy < -380, `swim jump (${vy | 0})`);
  log(`L${li - 3} canal drift ${drift | 0}, swim jump ${vy | 0}`);
}

/* Saqia: buckets ride a circle and carry the hero. */
{
  const li = await levelWith('saqias');
  const track = await sample(1200, () => {
    const m = window.T.s.moverList.find((m) => m.saqia);
    return [m.img.x, m.img.y, m.saqia.cx, m.saqia.cy];
  });
  const xs = track.map((t) => t[0]),
    ys = track.map((t) => t[1]);
  assert.ok(
    Math.max(...xs) - Math.min(...xs) > 10 &&
      Math.max(...ys) - Math.min(...ys) > 10,
    'a bucket moves in two axes',
  );
  for (const [x, y, cx, cy] of track) {
    const r = Math.hypot(x + 24 - cx, y - cy);
    assert.ok(Math.abs(r - 72) < 6, `bucket stays on the rim (${r | 0})`);
  }
  // Ride the top bucket.
  await ev(() => {
    const s = window.T.s;
    const m = s.moverList
      .filter((m) => m.saqia)
      .sort((a, b) => a.img.y - b.img.y)[0];
    window.T.bucket = m;
    window.T.place(m.img.x + 24, m.img.body.top);
  });
  await wait(700);
  const ride = await ev(() => {
    const m = window.T.bucket,
      h = window.T.hero();
    return {
      dy: Math.abs(h.bottom - m.img.body.top),
      dx: Math.abs(h.x - (m.img.x + 24)),
      grounded: h.grounded,
    };
  });
  assert.ok(
    ride.dy < 4 && ride.dx < 28 && ride.grounded,
    `the bucket carries him ${JSON.stringify(ride)}`,
  );
  await shot('13-w2-saqia.png');
  log(`L${li - 3} saqia ride`, JSON.stringify(ride));
}

/* Donkey cart: goes while ridden, walks home when left. */
{
  const li = await levelWith('donkeys');
  const start = await ev(() => {
    const s = window.T.s;
    const m = s.moverList.find((m) => m.donkey);
    window.T.cart = m;
    window.T.place(m.img.body.center.x, m.img.body.top);
    return m.img.x;
  });
  await wait(1500);
  const rode = await ev(() => ({
    x: window.T.cart.img.x,
    ridden: window.T.cart.donkey.ridden,
    on: Math.abs(window.T.hero().x - window.T.cart.img.body.center.x) < 40,
  }));
  assert.ok(rode.ridden && rode.on, 'riding the cart');
  assert.ok(rode.x - start > 100, `the cart trots on (${rode.x - start})`);
  await shot('13-w2-donkey.png');
  await ev(() => {
    const s = window.T.s;
    window.T.place(s.spec.start.x, s.spec.start.y + 13);
  });
  await wait(2200);
  const back = await ev(() => window.T.cart.img.x);
  assert.ok(back < rode.x - 30, 'left alone it heads back home');
  log(
    `L${li - 3} donkey +${(rode.x - start) | 0}, back ${(rode.x - back) | 0}`,
  );
}

/* Enemies on flat ground at level 1's start. */
{
  await ev(() => window.T.go(4));
  const base = await ev(() => {
    const s = window.T.s;
    window.T.place(s.spec.start.x + 40, s.spec.start.y + 13);
    return { x: s.spec.start.x + 40, y: s.spec.start.y };
  });
  await wait(300);
  // Buffalo: telegraph, charge, dizzy; takes two hits.
  await ev(
    ([x, y]) => {
      window.T.e = window.T.s.enemy(x + 170, y, 'buffalo');
    },
    [base.x, base.y],
  );
  const bStates = new Set(
    await sample(2600, () => window.T.e.getData('state')),
  );
  assert.ok(
    ['tell', 'charge', 'dizzy'].every((s) => bStates.has(s)),
    `buffalo pattern ${[...bStates]}`,
  );
  await ev(
    ([x, y]) => {
      window.T.e = window.T.s.enemy(x + 500, y, 'buffalo');
    },
    [base.x, base.y],
  );
  assert.equal(await ev(() => window.T.e.getData('hp')), 2, 'buffalo has 2 hp');
  await ev(() => {
    window.T.s.damageEnemy(window.T.e);
  });
  assert.equal(
    await ev(() => window.T.e.active),
    true,
    'one hit is not enough',
  );
  await ev(() => {
    window.T.s.damageEnemy(window.T.e);
  });
  await wait(50);
  assert.equal(await ev(() => window.T.e.active), false, 'two hits fell it');
  // Goose: honks and chases.
  await ev(() => {
    const s = window.T.s;
    s.enemies.clear(true, true);
    window.T.place(s.spec.start.x + 40, s.spec.start.y + 13);
  });
  await ev(
    ([x, y]) => {
      window.T.e = window.T.s.enemy(x + 120, y, 'goose');
    },
    [base.x, base.y],
  );
  const goose = await sample(1500, () => [
    window.T.e.getData('state'),
    window.T.e.body?.velocity.x ?? 0,
  ]);
  assert.ok(
    goose.some(([st, vx]) => st === 'chase' && vx < -80),
    'goose chases the hero',
  );
  // Crow: dives from above.
  await ev(() => {
    window.T.s.enemies.clear(true, true);
  });
  await ev(
    ([x, y]) => {
      window.T.e = window.T.s.enemy(x + 60, y - 150, 'crow');
    },
    [base.x, base.y],
  );
  const crow = await sample(2500, () => [
    window.T.e.getData('state'),
    window.T.e.body?.velocity.y ?? 0,
  ]);
  assert.ok(
    crow.some(([st, vy]) => st === 'dive' && vy > 100),
    'crow dive-bombs',
  );
  await ev(() => {
    window.T.s.enemies.clear(true, true);
  });
  log('buffalo/goose/crow behave');
}

/* Boss: أبو قرون. */
await ev(() => window.T.go(7));
const arena = await ev(() => {
  const s = window.T.s;
  return { x: s.bossState.arenaX, floor: s.boss.body.bottom };
});
await ev(([x, f]) => window.T.place(x + 110, f - 2), [arena.x, arena.floor]);
await wait(400);
assert.ok(await ev(() => window.T.s.bossState.active), 'boss wakes');
assert.equal(
  (await ev(() => window.hawariAudio.state())).track,
  9,
  'boss theme',
);
assert.match(await page.locator('.boss-name').textContent(), /أبو قرون/);
const seen = new Set();
const watch = async (ms) => {
  for (const st of await sample(ms, () => window.T.s.bossState.state))
    seen.add(st);
};
/** How far the boss sprite pokes out of the view while the hero-boss gap
 * still lets the camera show both (0 = fully framed). */
let worstCut = 0;
const waitState = async (st, ms = 8000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const [s, cut] = await ev(() => {
      const g = window.T.s,
        b = g.boss,
        v = g.cameras.main.worldView;
      const half = b.displayWidth / 2;
      const fits = Math.abs(g.hero.x - b.x) < v.width - 40 - half - 20;
      const cut = fits
        ? Math.max(0, v.x - (b.x - half), b.x + half - (v.x + v.width))
        : 0;
      return [g.bossState.state, cut];
    });
    worstCut = Math.max(worstCut, cut);
    seen.add(s);
    if (s === st) return;
    await wait(16);
  }
  throw new Error('boss never reached ' + st);
};
const stomp = async () => {
  const hp = await ev(() => window.T.s.bossState.hp);
  for (let tries = 0; tries < 6; tries++) {
    await waitState('dazed');
    await ev(() => {
      const s = window.T.s;
      window.T.place(s.boss.x, s.boss.body.top, 380);
    });
    await wait(200);
    if ((await ev(() => window.T.s.bossState.hp)) < hp) return;
  }
  throw new Error('could not stomp the dazed buffalo');
};
await watch(600);
// Its back is hard unless it is dazed.
await waitState('walk');
const hpA = await ev(() => window.T.s.bossState.hp);
await ev(() => {
  const s = window.T.s;
  window.T.place(s.boss.x, s.boss.body.top, 380);
});
await wait(120);
assert.equal(
  await ev(() => window.T.s.bossState.hp),
  hpA,
  'stomping a fresh buffalo does nothing',
);
await ev(([x, f]) => window.T.place(x + 110, f - 2), [arena.x, arena.floor]);
await waitState('dazed');
assert.ok(
  ['walk', 'telegraph', 'charge', 'dazed'].every((s) => seen.has(s)),
  `phase 1 pattern ${[...seen]}`,
);
await shot('13-w2-boss-phase1.png');
await stomp();
await stomp();
assert.equal(await ev(() => window.T.s.bossPhase()), 2, 'phase 2 at 4 hearts');
await waitState('charge');
await waitState('dazed');
await wait(200);
const clods = await ev(
  () =>
    window.T.s.hazards.getChildren().filter((h) => h.getData('kind') === 'clod')
      .length,
);
assert.ok(clods >= 3, `phase 2 crashes drop clods (${clods})`);
await shot('13-w2-boss-phase2.png');
await stomp();
await stomp();
assert.equal(await ev(() => window.T.s.bossPhase()), 3, 'phase 3 at 2 hearts');
const crows = await ev(
  () =>
    window.T.s.enemies
      .getChildren()
      .filter((e) => e.active && e.getData('kind') === 'crow').length,
);
assert.ok(crows >= 2, 'crows join in phase 3');
assert.equal(
  (await ev(() => window.hawariAudio.state())).bossPhase,
  2,
  'boss music escalates',
);
seen.clear();
await waitState('slam', 12000);
await shot('13-w2-boss-phase3.png');
await stomp();
await stomp();
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
assert.equal(
  await ev(() => window.T.s.mode),
  'clear',
  'world 2 done: on to Damietta',
);
assert.match(
  await page.locator('#clear-title').textContent(),
  /دمياط/,
  'the clear screen opens the road to Damietta',
);
assert.ok(
  (await ev(() => JSON.parse(window.localStorage.getItem('hawari-progress'))))
    .unlocked >= 8,
  'world 3 unlocked',
);
await shot('13-w2-clear-to-damietta.png');
log('boss: hard back, 3 phases, clods, crows, world 3 unlocked');

assert.deepEqual(errors, [], 'no console errors');
await browser.close();
console.log('world 2 runtime: all good');
