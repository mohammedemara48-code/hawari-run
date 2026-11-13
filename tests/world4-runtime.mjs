// Runtime check of World 4 (اسكندرية): breaking waves, wet tiles, umbrella
// gliding, the tram ride with its scrolling view and wires to duck under,
// the Stanley gale, the storm, the four new creatures and the boss
// «ريّس النوة», driven in the real scene.
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
// Cairo, the countryside and Damietta cleared: world 4 is open.
await page.addInitScript(() => {
  if (window.sessionStorage.getItem('seeded')) return;
  window.sessionStorage.setItem('seeded', '1');
  window.localStorage.clear();
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
  ];
  window.localStorage.setItem(
    'hawari-progress',
    JSON.stringify({
      unlocked: 12,
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
      s.hurtUntil = s.time.now + 1e8;
    },
    place(x, feet, vy = 0) {
      const b = s.hero.body;
      const half = s.hero.y - b.bottom;
      b.reset(x, feet - 26 + half);
      s.hero.setVelocity(0, vy);
      if (!s.camFocus && !s.w4?.tram?.moving)
        s.cameras.main.centerOn(x, feet - 80);
    },
    /** Feet y of the first standable surface at or below row r0 in col. */
    floor(col, r0 = 0) {
      let r = r0;
      while (r < s.L.rows && !(s.standable(col, r) && !s.standable(col, r - 1)))
        r++;
      return r * 24;
    },
    spawn(x, y, kind) {
      window.T.e = s.enemy(x, y, kind);
    },
    hero() {
      const b = s.hero.body;
      return {
        x: b.center.x,
        bottom: b.bottom,
        top: b.top,
        vx: b.velocity.x,
        vy: b.velocity.y,
        grounded: b.blocked.down || b.touching.down || s.riding,
        mode: s.mode,
        power: s.power,
      };
    },
  };
});
const hero = () => ev(() => window.T.hero());
const sample = async (ms, fn, arg) => {
  const out = [];
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    out.push(await ev(fn, arg));
    await wait(16);
  }
  return out;
};
const shot = (name) =>
  page.screenshot({ path: `/workspace/hawari-shots/${name}` });
const log = (...a) => console.log('✔', ...a);
/** Make the next hit count: one food power so a hit shows as a power loss. */
const vulnerable = () =>
  ev(() => {
    const s = window.T.s;
    s.hurtUntil = 0;
    s.invincible = 0;
    s.setPower(1, false);
  });
const safe = () =>
  ev(() => {
    const s = window.T.s;
    s.hurtUntil = s.time.now + 1e8;
  });

/* Map: title → Egypt map on Alexandria, one level open, accordion music. */
await page.locator('[data-screen="title"] [data-action="start"]').click();
await wait(400);
assert.equal(await ev(() => window.T.s.mode), 'map');
assert.equal(
  await page.locator('.world-pin.selected').getAttribute('data-world'),
  '3',
);
assert.equal(await page.locator('.world-pin.soon').count(), 1, 'only Luxor');
assert.equal(await page.locator('.map-node:not([disabled])').count(), 1);
await shot('14-map-world4-unlocked-desk.png');
await page.locator('.map-node:not([disabled])').click();
await wait(700);
assert.equal(await ev(() => window.T.s.mode), 'play');
assert.equal(await ev(() => window.T.s.level), 12, 'world 4 level 1');
const audio = await ev(() => window.hawariAudio.state());
assert.equal(audio.track, 15, 'Alexandria music');
assert.match(audio.trackName, /أكورديون/);
log('map opens world 4, track', audio.trackName);
await shot('14-w4-l1-corniche.png');

/* Waves: harmless while calm, a hit while breaking. */
{
  await ev(() => window.T.go(12));
  const w = await ev(() => {
    const p = window.T.s.L.waves[0];
    return { x: p.x, feet: (p.row + 1) * 24, col: p.col };
  });
  const waitWave = async (st) => {
    for (let i = 0; i < 400; i++) {
      if ((await ev(() => window.T.s.w4.waves[0].state)) === st) return;
      await wait(16);
    }
    throw new Error('wave never ' + st);
  };
  await waitWave('calm');
  await vulnerable();
  await ev((w) => window.T.place(w.x, w.feet), w);
  await wait(120);
  assert.equal((await hero()).power, 1, 'a calm wall is safe');
  await safe();
  await ev((w) => window.T.place(w.x - 80, w.feet), w);
  await waitWave('warn');
  await wait(200);
  await shot('14-w4-wave-warning.png');
  await waitWave('crash');
  await vulnerable();
  await ev((w) => window.T.place(w.x, w.feet), w);
  await wait(160);
  await shot('14-w4-wave-crash.png');
  assert.equal((await hero()).power, 0, 'a breaking wave knocks you back');
  await safe();
  log('waves: calm / foam / crash');
}

/* Wet tiles: you keep sliding after letting go. */
{
  const slide = async (wet) => {
    const at = await ev((wet) => {
      const L = window.T.s.L;
      for (let c = 3; c < L.cols - 12; c++) {
        let ok = true;
        for (let k = 0; k < 6; k++)
          if ((L.at(c + k, 11) === '$') !== wet || L.at(c + k, 10) === '#')
            ok = false;
        if (ok) return c;
      }
      return -1;
    }, wet);
    assert.ok(at > 0, 'found a run');
    await ev((c) => window.T.place(c * 24 + 12, 11 * 24), at);
    await wait(150);
    await ev(() => {
      window.T.s.hero.setVelocityX(157);
    });
    await wait(16);
    const x0 = (await hero()).x;
    await wait(250);
    return (await hero()).x - x0;
  };
  const dry = await slide(false),
    wet = await slide(true);
  assert.ok(
    wet > dry * 2 && wet > 25,
    `wet tiles slide (${wet | 0} vs ${dry | 0}px)`,
  );
  log('wet tiles slide', wet | 0, 'px vs', dry | 0);
}

/* Umbrella: take one from a stand and glide with jump held. */
{
  const st = await ev(() => {
    const p = window.T.s.L.stands[0];
    return { x: p.x, feet: (p.row + 1) * 24 };
  });
  const fall = async () => {
    await ev((st) => {
      window.T.s.w4.umbrella = false;
      window.T.place(st.x - 100, st.feet - 200);
    }, st);
    await wait(120);
    await page.keyboard.down('Space');
    await wait(60);
    const vys = await sample(500, () => window.T.hero().vy);
    await page.keyboard.up('Space');
    return Math.max(...vys);
  };
  const plain = await fall();
  await ev((st) => window.T.place(st.x, st.feet), st);
  await wait(200);
  assert.ok(await ev(() => window.T.s.w4.umbrella), 'took an umbrella');
  await ev((st) => window.T.place(st.x - 100, st.feet - 200), st);
  await wait(120);
  await page.keyboard.down('Space');
  await wait(300);
  await shot('14-w4-umbrella-glide.png');
  const vys = await sample(300, () => window.T.hero().vy);
  await page.keyboard.up('Space');
  const glide = Math.max(...vys);
  assert.ok(plain > 300, `without it you drop (${plain | 0})`);
  assert.ok(glide <= 72, `with it you float down (${glide | 0})`);
  // Getting hurt blows the umbrella away.
  await vulnerable();
  await ev(() => window.T.s.hurt());
  assert.equal(await ev(() => window.T.s.w4.umbrella), false, 'lost on a hit');
  await safe();
  log('umbrella glide', glide | 0, 'vs', plain | 0);
}

/* Creatures: jellyfish sting, beach balls pop, umbrellas fold, storm gulls dive. */
{
  await ev(() => window.T.go(12));
  const sea = await ev(() => {
    const k = window.T.s.L.seas[0];
    return { x: (k.x0 + k.x1) / 2, top: k.top, bottom: k.bottom };
  });
  await ev((k) => window.T.spawn(k.x, (k.top + k.bottom) / 2, 'jelly'), sea);
  const ys = await sample(2800, () => window.T.e.y);
  assert.ok(Math.max(...ys) - Math.min(...ys) > 8, 'jellyfish drift');
  assert.ok(
    ys.every((y) => y > sea.top && y < sea.bottom),
    'jellyfish stay in the sea',
  );
  await vulnerable();
  await ev(() => {
    const e = window.T.e;
    window.T.place(e.x, e.body.top, 380);
  });
  await wait(150);
  await shot('14-w4-jellyfish.png');
  assert.equal((await hero()).power, 0, 'stomping a jellyfish stings');
  assert.ok(await ev(() => window.T.e.active), 'and it is still there');
  await safe();
  await ev(() => window.T.s.enemies.clear(true, true));
  // Beach ball: bounces along; stomp it and it pops, launching you.
  const g = { x: 5 * 24 + 12, feet: 11 * 24 };
  await ev((g) => window.T.place(g.x - 110, g.feet), g);
  await ev((g) => window.T.spawn(g.x + 60, g.feet - 12, 'ball'), g);
  const by = await sample(1200, () => window.T.e.body.bottom);
  assert.ok(Math.max(...by) - Math.min(...by) > 40, 'the ball bounces');
  await shot('14-w4-beachball.png');
  await ev(() => {
    const e = window.T.e;
    window.T.place(e.x, e.body.top, 380);
  });
  const vy = Math.min(...(await sample(200, () => window.T.hero().vy)));
  assert.ok(!(await ev(() => window.T.e.active)), 'the ball pops');
  assert.ok(vy < -450, `a popped ball launches you (${vy | 0})`);
  // A loose umbrella: stomp it and it's yours to glide with.
  await ev((g) => window.T.place(g.x, g.feet), g);
  await wait(300);
  await ev(() => (window.T.s.w4.umbrella = false));
  await ev((g) => window.T.spawn(g.x - 60, g.feet - 70, 'brolly'), g);
  await wait(400);
  await shot('14-w4-flying-umbrella.png');
  await ev(() => {
    const e = window.T.e;
    window.T.place(e.x, e.body.top, 380);
  });
  await wait(120);
  assert.ok(!(await ev(() => window.T.e.active)), 'the umbrella folds');
  assert.ok(await ev(() => window.T.s.w4.umbrella), 'and you keep it');
  // Storm gull: wheels about, dives at you.
  await ev((g) => window.T.place(g.x, g.feet), g);
  await ev((g) => window.T.spawn(g.x + 60, g.feet - 150, 'skua'), g);
  const states = await sample(2500, () => window.T.e.getData('state'));
  assert.ok(states.includes('dive'), 'the storm gull dives');
  await shot('14-w4-storm-gull.png');
  await ev(() => window.T.s.enemies.clear(true, true));
  log('jellyfish / beach ball / umbrella / storm gull');
}

/* The tram: board it, the view scrolls with it; duck under wires. */
{
  await ev(() => window.T.go(13));
  assert.equal((await ev(() => window.hawariAudio.state())).track, 16);
  await ev(() => {
    const t = window.T.s.w4.tram.img;
    window.T.place(t.x + 70, t.body.top);
  });
  await wait(400);
  assert.ok(await ev(() => window.T.s.w4.tram.moving), 'the tram sets off');
  const a = await ev(() => [
    window.T.s.w4.tram.img.x,
    window.T.s.cameras.main.scrollX,
  ]);
  await page.keyboard.down('ArrowDown');
  await wait(1000);
  const b = await ev(() => [
    window.T.s.w4.tram.img.x,
    window.T.s.cameras.main.scrollX,
  ]);
  assert.ok(b[0] - a[0] > 90, `the tram runs (${(b[0] - a[0]) | 0}px/s)`);
  assert.ok(b[1] - a[1] > 80, 'the view scrolls with it');
  // Ducked: the first wire passes over (a hit would cost the food power).
  await vulnerable();
  const wireX = await ev(() => window.T.s.L.wires[0].x1);
  for (let i = 0; i < 400; i++) {
    const h = await hero();
    if (h.x > wireX - 40 && h.x < wireX) {
      await shot('14-w4-tram-duck.png');
    }
    if (h.x > wireX + 30) break;
    await wait(16);
  }
  const ducked = await hero();
  assert.equal(ducked.power, 1, 'ducking under the wire is safe');
  assert.ok(ducked.grounded && ducked.mode === 'play', 'still riding');
  await page.keyboard.up('ArrowDown');
  // Standing up under the next wire hurts.
  const next = await ev(() => window.T.s.L.wires[1].x1);
  for (let i = 0; i < 500; i++) {
    if ((await hero()).x > next + 30) break;
    await wait(16);
  }
  assert.equal(
    (await hero()).power,
    0,
    'a standing hero is caught by the wire',
  );
  await safe();
  // You can't fall behind: the view pushes you along.
  await ev(() => {
    const s = window.T.s;
    window.T.place(s.cameras.main.scrollX - 60, 13 * 24);
  });
  await wait(100);
  const pushed = await ev(
    () => window.T.s.hero.x - window.T.s.cameras.main.scrollX,
  );
  assert.ok(pushed >= 10, 'the scrolling view pushes you along');
  // Bridge: wait for the first low bridge and frame it.
  await ev(() => {
    const s = window.T.s,
      t = s.w4.tram.img;
    window.T.place(t.x + 100, t.body.top);
  });
  await page.keyboard.down('ArrowDown');
  const bridgeX = await ev(() => window.T.s.L.wires.find((w) => w.bridge).x0);
  for (let i = 0; i < 900; i++) {
    const h = await hero();
    if (h.x > bridgeX - 20) break;
    await wait(16);
  }
  await shot('14-w4-tram-bridge.png');
  await page.keyboard.up('ArrowDown');
  log('tram rides, view scrolls, duck under wire and bridge');
}

/* Stanley: a headwind gust pushes you back. */
{
  await ev(() => window.T.go(14));
  assert.equal((await ev(() => window.hawariAudio.state())).track, 17);
  const w = await ev(() => window.T.s.L.wind[0]);
  await ev(() => window.T.place(45 * 24, 8 * 24));
  await shot('14-w4-stanley-bridge.png');
  const vx = await sample(4500, () => window.T.s.hero.body.velocity.x);
  assert.ok(w.dir < 0, 'headwind');
  assert.ok(
    Math.min(...vx) < -150,
    `the gust shoves you back (${Math.min(...vx) | 0})`,
  );
  log('stanley gust', Math.min(...vx) | 0);
}

/* Qaitbay: the storm, then «ريّس النوة». */
await ev(() => window.T.go(15));
assert.equal((await ev(() => window.hawariAudio.state())).track, 18);
{
  await ev(() => window.T.place(95 * 24, 5 * 24));
  let flashed = false;
  for (let i = 0; i < 700 && !flashed; i++) {
    flashed = await ev(() => window.T.s.w4.flash.alpha > 0.2);
    if (flashed) await shot('14-w4-qaitbay-storm-lightning.png');
    else await wait(16);
  }
  assert.ok(flashed, 'lightning flashes in the storm');
  assert.ok(await ev(() => window.T.s.ambient.texture.key === 'rain'), 'rain');
  log('storm: rain and lightning');
}
const arena = await ev(() => ({
  x: window.T.s.bossState.arenaX,
  floor: 11 * 24,
}));
const toArena = () =>
  ev(([x, f]) => window.T.place(x + 110, f - 2), [arena.x, arena.floor]);
await toArena();
await wait(400);
assert.ok(await ev(() => window.T.s.bossState.active), 'boss wakes');
assert.equal((await ev(() => window.hawariAudio.state())).track, 19);
assert.match(await page.locator('.boss-name').textContent(), /ريّس النوة/);
const seen = new Set();
let worstCut = 0;
const waitState = async (st, ms = 12000) => {
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
  const why = await ev(() => {
    const g = window.T.s;
    return [
      g.bossState.state,
      g.bossState.hp,
      g.mode,
      g.boss.x | 0,
      g.boss.y | 0,
    ];
  });
  throw new Error('boss never reached ' + st + ' ' + JSON.stringify(why));
};
const stomp = async (target) => {
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
  throw new Error('could not stomp the stuck gull');
};
// Flying: a stomp just bounces off.
await waitState('hover');
await wait(300);
const hpA = await ev(() => window.T.s.bossState.hp);
await ev(() => {
  const s = window.T.s;
  window.T.place(s.boss.x, s.boss.body.top, 380);
});
await wait(150);
assert.equal(await ev(() => window.T.s.bossState.hp), hpA, 'flying: no damage');
await toArena();
await waitState('tell');
await shot('14-w4-boss-phase1-screech.png');
await waitState('dive');
await waitState('stuck');
await shot('14-w4-boss-phase1-stuck.png');
assert.ok(
  ['hover', 'tell', 'dive', 'stuck'].every((s) => seen.has(s)),
  `phase 1 pattern ${[...seen]}`,
);
await stomp(5);
await stomp(4);
assert.equal(await ev(() => window.T.s.bossPhase()), 2, 'phase 2 at 4 hearts');
await waitState('gust', 16000);
await wait(200);
assert.ok(
  await ev(() => window.T.s.w4.bossGustUntil > window.T.s.time.now),
  'phase 2: the wing-beat gale',
);
await shot('14-w4-boss-phase2-gale.png');
await toArena();
await stomp(3);
await stomp(2);
assert.equal(await ev(() => window.T.s.bossPhase()), 3, 'phase 3 at 2 hearts');
const skuas = await ev(
  () =>
    window.T.s.enemies
      .getChildren()
      .filter((e) => e.active && e.getData('kind') === 'skua').length,
);
assert.ok(skuas >= 2, 'storm gulls join in phase 3');
await waitState('strike', 16000);
await wait(200);
assert.ok(
  await ev(() => window.T.s.w4.bolts.length === 3),
  'phase 3: three strike marks',
);
await shot('14-w4-boss-phase3-marks.png');
let struck = false;
for (let i = 0; i < 90 && !struck; i++) {
  struck = await ev(() => window.T.s.w4.bolts.some((b) => b.hz));
  if (!struck) await wait(16);
}
assert.ok(struck, 'phase 3: lightning strikes');
await shot('14-w4-boss-phase3-lightning.png');
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
assert.equal(await ev(() => window.T.s.mode), 'win', 'world 4 done: the win');
await shot('14-w4-win.png');
log('boss: hover, screech, dive, stuck, gale, lightning, gulls, win');

assert.deepEqual(errors, [], 'no console errors');
await browser.close();
console.log('world 4 runtime: all good');
