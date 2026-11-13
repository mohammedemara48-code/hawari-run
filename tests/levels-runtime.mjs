// Runtime check of every level's signature mechanic, the boss and the flow.
// Drives the real scene in Chromium; the vitest level graph proves each map is
// completable, this proves the pieces behave the way the graph assumes.
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
await page.addInitScript(() => window.localStorage.clear());
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
      // Drop in from just above the surface so one-way bodies catch the feet.
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
        top: b.top,
        vx: b.velocity.x,
        vy: b.velocity.y,
        grounded: b.blocked.down || b.touching.down,
        mode: s.mode,
        lives: s.lives,
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

/* Flow: title → map; only level 1 unlocked. */
await page.locator('[data-screen="title"] [data-action="start"]').click();
await wait(400);
assert.equal(await ev(() => window.T.s.mode), 'map');
assert.equal(
  await page.locator('.map-node:not([disabled])').count(),
  1,
  'only level 1 open at first',
);
const audio = await ev(() => window.hawariAudio.state());
assert.ok(
  audio.ready && audio.compressor,
  'audio graph with compressor + limiter',
);
assert.equal(audio.errors, 0, 'no audio errors');
log('map + audio graph', audio.context, audio.trackName);

/* 1 · Lanterns: darkness, lighting a lantern solidifies the ghost path. */
await page.locator('.map-node[data-node="0"]').click();
await wait(500);
await ev(() => window.T.go(0));
const lant = await ev(() => {
  const s = window.T.s;
  const r = (s.L.meta.lanternRadius ?? 0) * 24;
  const l = s.lanterns.find((l) =>
    s.ghosts
      .getChildren()
      .some((g) => Math.hypot(g.x - l.img.x, g.y - l.img.y) < r),
  );
  const g = s.ghosts
    .getChildren()
    .filter((g) => Math.hypot(g.x - l.img.x, g.y - l.img.y) < r);
  return {
    x: l.img.x,
    y: l.img.y,
    i: s.lanterns.indexOf(l),
    ghosts: g.map((o) => ({ x: o.x, top: o.body.top, lit: o.getData('lit') })),
    dark: !!s.dark?.visible,
  };
});
assert.ok(lant.dark, 'night darkness overlay is on');
assert.ok(
  lant.ghosts.length >= 2 && lant.ghosts.every((g) => !g.lit),
  'ghost ledges start unlit',
);
// Unlit ghost: the hero falls through it.
await ev(
  ([x, t]) => window.T.place(x, t - 30),
  [lant.ghosts[0].x, lant.ghosts[0].top],
);
await wait(500);
assert.ok(
  (await hero()).bottom > lant.ghosts[0].top + 20,
  'unlit ghost ledge is not solid',
);
await ev(([x, y]) => window.T.place(x, y + 20), [lant.x, lant.y]);
await wait(250);
const litNow = await ev((i) => window.T.s.lanterns[i].lit, lant.i);
assert.ok(litNow, 'touching the lantern lights it');
await wait(700);
await ev(
  ([x, t]) => window.T.place(x, t - 30),
  [lant.ghosts[0].x, lant.ghosts[0].top],
);
await wait(600);
const onGhost = await hero();
assert.ok(
  onGhost.grounded && Math.abs(onGhost.bottom - lant.ghosts[0].top) < 3,
  'lit ghost ledge holds the hero',
);
await ev(([x, y]) => window.T.place(x - 60, y + 20), [lant.x, lant.y]);
await wait(400);
await shot('13-level1.png');
log('L1 lanterns reveal', lant.ghosts.length, 'ghost ledges');

/* 2 · Market: awning trampoline, moving cart carries, crate crumbles. */
await ev(() => window.T.go(1));
await wait(300);
const aw = await ev(() => {
  const a = window.T.s.bouncers
    .getChildren()
    .find((o) => o.getData('kind') === 'awning');
  return { x: a.x, top: a.body.top };
});
await ev(([x, t]) => window.T.place(x, t - 40), [aw.x, aw.top]);
const awVy = Math.min(
  ...(await sample(500, () => window.T.s.hero.body.velocity.y)),
);
assert.ok(awVy <= -650, `awning bounces high (vy ${awVy})`);
const cart = await ev(() => {
  const m = window.T.s.moverList.find((m) => m.img.texture.key === 'vcart');
  return { x: m.img.body.center.x, top: m.img.body.top };
});
await ev(([x, t]) => window.T.place(x, t - 2), [cart.x, cart.top]);
await wait(350);
const cartX = () =>
  ev(
    () =>
      window.T.s.moverList.find((m) => m.img.texture.key === 'vcart').img.body
        .center.x,
  );
const c0 = await hero(),
  k0 = await cartX();
await wait(800);
const c1 = await hero(),
  k1 = await cartX();
assert.ok(Math.abs(k1 - k0) > 10, 'cart moves');
assert.ok(
  c1.grounded && Math.abs(c1.x - k1 - (c0.x - k0)) < 5,
  `cart carries the hero ${JSON.stringify([k0, k1, c0.x, c1.x])}`,
);
const crate = await ev(() => {
  const c = window.T.s.crates.getChildren()[0];
  return { x: c.x, top: c.body.top };
});
await ev(([x, t]) => window.T.place(x, t - 2), [crate.x, crate.top]);
await wait(700);
assert.equal(
  await ev(() => window.T.s.crates.getChildren()[0].body.enable),
  false,
  'crate gives way under the hero',
);
await wait(3000);
assert.equal(
  await ev(() => window.T.s.crates.getChildren()[0].body.enable),
  true,
  'crate respawns',
);
await ev(([x, t]) => window.T.place(x - 30, t - 40), [aw.x, aw.top]);
await wait(350);
await shot('13-level2.png');
log(
  'L2 awning vy',
  Math.round(awVy),
  'cart moved',
  Math.round(c1.x - c0.x),
  'with hero',
);

/* 3 · Rooftops: dish bounce, zip line, wind gust. */
await ev(() => window.T.go(2));
await wait(300);
const dish = await ev(() => {
  const d = window.T.s.bouncers
    .getChildren()
    .find((o) => o.getData('kind') === 'dish');
  return { x: d.x, top: d.body.top };
});
await ev(([x, t]) => window.T.place(x, t - 40), [dish.x, dish.top]);
const dVy = Math.min(
  ...(await sample(500, () => window.T.s.hero.body.velocity.y)),
);
assert.ok(dVy <= -600, `dish springs the hero (vy ${dVy})`);
const zip = await ev(() => {
  const s = window.T.s;
  const z = s.lineAt(0);
  const dir = Math.sign(z.bx - z.ax);
  const x = z.ax + dir * 20;
  const ly = z.ay + ((z.by - z.ay) * (x - z.ax)) / (z.bx - z.ax);
  return { x, ly, dir, end: z.bx };
});
await ev(
  ([x, ly]) => {
    const s = window.T.s;
    window.T.place(x, ly + 2 + 46);
    s.zipCooldown = 0;
  },
  [zip.x, zip.ly],
);
await wait(150);
assert.ok(await ev(() => !!window.T.s.zip), 'hero grabs the zip line');
const z0 = await hero();
await wait(500);
const z1 = await hero();
assert.ok((z1.x - z0.x) * zip.dir > 60, 'zip carries the hero along the rope');
const wind = await ev(() => {
  const w = window.T.s.L.wind[0];
  return { x: (w.x0 + w.x1) / 2, y: w.y1, dir: w.dir };
});
await ev(
  () => ((window.T.s.zip = null), window.T.s.hero.body.setAllowGravity(true)),
);
// Stand in the gust corridor: find the floor under its centre.
await ev(([x, y]) => window.T.place(x, y - 60), [wind.x, wind.y]);
const windVx = await sample(4400, () => window.T.s.hero.body.velocity.x);
const push = Math.max(...windVx.map((v) => v * wind.dir));
assert.ok(push > 90, `wind gust pushes the hero (${Math.round(push)} px/s)`);
await ev(([x, t]) => window.T.place(x - 40, t - 2), [dish.x, dish.top]);
await wait(400);
await shot('13-level3.png');
log('L3 dish vy', Math.round(dVy), 'zip ok, wind', Math.round(push));

/* 4 · Metro: rising water kills, lifts move, boss runs 3 phases → exit. */
await ev(() => window.T.go(3));
await wait(300);
const water = await ev(() => {
  const w = window.T.s.water;
  return {
    x: (w.x0 + w.x1) / 2,
    y: w.y,
    trigger: w.trigger,
    lifts: window.T.s.moverList.filter((m) => m.axis === 'y').length,
  };
});
assert.ok(water.lifts >= 1, 'metro has moving lifts');
const lift0 = await ev(
  () => window.T.s.moverList.find((m) => m.axis === 'y').img.y,
);
await wait(500);
const lift1 = await ev(
  () => window.T.s.moverList.find((m) => m.axis === 'y').img.y,
);
assert.notEqual(Math.round(lift0), Math.round(lift1), 'lift moves');
const livesBefore = (await hero()).lives;
await ev(([x, y]) => window.T.place(x, y + 40), [water.x, water.y]);
await wait(300);
assert.ok(
  await ev(() => window.T.s.water?.active !== false),
  'shaft water starts rising',
);
await wait(1400);
assert.equal(
  (await hero()).lives,
  livesBefore - 1,
  'touching the water costs a life',
);
await ev(() => {
  const s = window.T.s;
  s.remaining = 999;
  s.enemies.clear(true, true);
  s.hurtUntil = s.time.now + 1e8;
});
// Boss arena.
const arena = await ev(() => {
  const s = window.T.s;
  return { x: s.bossState.arenaX, floor: s.boss.body.bottom, bossX: s.boss.x };
});
assert.equal(
  await ev(() => window.T.s.exitDoor.visible),
  false,
  'exit hidden until the boss falls',
);
await ev(([x, f]) => window.T.place(x + 110, f - 2), [arena.x, arena.floor]);
await wait(400);
assert.ok(
  await ev(() => window.T.s.bossState.active),
  'boss wakes when the hero enters',
);
assert.equal(
  (await ev(() => window.hawariAudio.state())).track,
  4,
  'boss theme plays',
);
const statesSeen = new Set();
const watch = async (ms) => {
  for (const st of await sample(ms, () => window.T.s.bossState.state))
    statesSeen.add(st);
};
const stomp = async () => {
  const hp = await ev(() => window.T.s.bossState.hp);
  for (let tries = 0; tries < 40; tries++) {
    await ev(() => {
      const s = window.T.s,
        bs = s.bossState;
      if (
        s.time.now < bs.invuln ||
        bs.state === 'hurt' ||
        bs.state === 'leap' ||
        bs.state === 'slam'
      )
        return;
      window.T.place(s.boss.x, s.boss.body.top, 380);
    });
    await wait(160);
    if ((await ev(() => window.T.s.bossState.hp)) < hp) return;
  }
  throw new Error('could not stomp the boss');
};
await watch(4200);
assert.ok(
  ['walk', 'telegraph', 'leap', 'dazed'].every((s) => statesSeen.has(s)),
  `phase 1 pattern ${[...statesSeen]}`,
);
await shot('13-boss-phase1.png');
const hp0 = await ev(() => window.T.s.bossState.hp);
await stomp();
await wait(300);
assert.equal(
  await ev(() => window.T.s.bossState.hp),
  hp0 - 1,
  'a stomp costs the boss a heart',
);
// Chili: two hits per heart.
await ev(() => window.T.s.setPower(2, false));
await wait(1100);
const hpC = await ev(() => window.T.s.bossState.hp);
for (
  let i = 0;
  i < 6 && (await ev(() => window.T.s.bossState.hp)) === hpC;
  i++
) {
  await ev(() => {
    const s = window.T.s;
    window.T.place(s.boss.x - 90, s.boss.body.bottom - 2);
    s.facing = 1;
  });
  await page.keyboard.down('x');
  await wait(60);
  await page.keyboard.up('x');
  await wait(420);
}
assert.equal(
  await ev(() => window.T.s.bossState.hp),
  hpC - 1,
  'two chili hits cost a heart',
);
assert.equal(await ev(() => window.T.s.bossPhase()), 2, 'phase 2 at 4 hearts');
statesSeen.clear();
await watch(3500);
assert.ok(statesSeen.has('throw'), 'phase 2 throws bones');
await shot('13-boss-phase2.png');
await stomp();
await wait(1100);
await stomp();
await wait(300);
assert.equal(await ev(() => window.T.s.bossPhase()), 3, 'phase 3 at 2 hearts');
assert.equal(
  (await ev(() => window.hawariAudio.state())).bossPhase,
  2,
  'boss music escalates',
);
statesSeen.clear();
let shock = 0;
const t3 = Date.now();
while (Date.now() - t3 < 5000) {
  const r = await ev(() => [
    window.T.s.bossState.state,
    window.T.s.hazards
      .getChildren()
      .filter((h) => h.getData('kind') === 'shock').length,
  ]);
  statesSeen.add(r[0]);
  shock = Math.max(shock, r[1]);
  await wait(16);
}
assert.ok(
  statesSeen.has('slam') && shock >= 2,
  'phase 3 slams with two shockwaves',
);
await shot('13-boss-phase3.png');
await wait(800);
await stomp();
await wait(1200);
await stomp();
await wait(900);
assert.equal(
  await ev(() => window.T.s.bossState.defeated),
  true,
  'boss defeated',
);
assert.equal(
  await ev(() => window.T.s.exitDoor.visible),
  true,
  'exit door opens',
);
await ev(() => {
  const s = window.T.s;
  window.T.place(s.spec.exit.x, s.spec.exit.y - 1);
});
await wait(500);
assert.equal(
  await ev(() => window.T.s.mode),
  'clear',
  'leaving through the door clears Cairo',
);
assert.match(
  await page.locator('#clear-title').textContent(),
  /الأرياف/,
  'clearing Cairo opens the road to the countryside',
);
assert.equal(
  await ev(
    () => JSON.parse(window.localStorage.getItem('hawari-progress')).unlocked,
  ),
  4,
  "Cairo's boss unlocks world 2",
);
log('L4 water + lifts + boss', [...statesSeen].join('/'));

/* Every exit really ends its level and unlocks the next on the map. */
for (const i of [0, 1, 2]) {
  await ev((i) => window.T.go(i), i);
  await ev(() => {
    const s = window.T.s;
    window.T.place(s.spec.exit.x, s.spec.exit.y - 1);
  });
  await wait(400);
  assert.equal(
    await ev(() => window.T.s.mode),
    'clear',
    `level ${i + 1} exit clears`,
  );
}
await ev(() => window.T.s.action('map'));
await wait(400);
// The map opens on the newest world: the countryside, first level open.
assert.equal(
  await page.locator('.world-pin.selected').getAttribute('data-world'),
  '1',
);
assert.equal(
  await page.locator('.map-node').count(),
  4,
  'four countryside levels',
);
assert.equal(
  await page.locator('.map-node:not([disabled])').count(),
  1,
  'only the first countryside level is open',
);
assert.equal(
  await page.locator('.world-pin.soon').count(),
  2,
  'Alexandria and Luxor are coming soon',
);
await shot('13-map-world2.png');
await page.locator('.world-pin[data-world="0"]').click();
await wait(300);
assert.equal(
  await page.locator('.map-node:not([disabled])').count(),
  4,
  'all Cairo levels open after clearing',
);
await shot('13-map.png');
log('exits + progress map');

/* Walkers' textures face left (the game flips them to walk right): the
   rooster's beak and the rat's eye must sit in the left half, and a walker
   heading right is flipped so it looks where it's going. */
const facing = await ev(() => {
  const s = window.T.s;
  const find = (key, hex) => {
    const img = s.textures.get(key).getSourceImage();
    const g = Object.assign(document.createElement('canvas'), {
      width: img.width,
      height: img.height,
    }).getContext('2d');
    g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, img.width, img.height).data;
    const [r, gg, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    let sum = 0,
      n = 0;
    for (let i = 0; i < d.length; i += 4)
      if (d[i] === r && d[i + 1] === gg && d[i + 2] === b && d[i + 3] > 200) {
        sum += (i / 4) % img.width;
        n++;
      }
    return n ? sum / n / img.width : -1;
  };
  return {
    rooster: find('rooster0', '#f2b33a'),
    rat: find('rat0', '#ff4d4d'),
  };
});
assert.ok(
  facing.rooster > 0 && facing.rooster < 0.5,
  `rooster texture faces left (${facing.rooster})`,
);
assert.ok(facing.rat > 0 && facing.rat < 0.5, `rat faces left (${facing.rat})`);
await ev(() => window.T.go(1));
const walk = await ev(async () => {
  const s = window.T.s;
  const e = s.enemy(s.spec.start.x + 300, s.spec.start.y, 'rooster');
  e.setData('until', 1e12);
  e.setVelocityX(40);
  await new Promise((r) => setTimeout(r, 300));
  return { vx: e.body.velocity.x, flip: e.flipX };
});
assert.equal(walk.flip, walk.vx > 0, 'a rooster walking right is flipped');
log('walkers face where they walk', JSON.stringify(facing));
assert.deepEqual(errors, []);
console.log('PASS levels-runtime');
await browser.close();
