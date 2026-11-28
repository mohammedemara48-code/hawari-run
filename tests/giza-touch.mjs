// Prism scarab with real touch events at phone size: stick drags and the jump
// button via CDP, starting from the level's own checkpoint. State is only read.
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { SHOTS } from './browser-paths.mjs';
const browser = await chromium.launch({ args: ['--no-sandbox'] });
try {
  const p = await browser.newPage({
    viewport: { width: 844, height: 390 },
    isMobile: true,
    hasTouch: true,
  });
  await p.addInitScript(() => {
    window.localStorage.setItem('hawari-seen-version', '999');
    Element.prototype.requestFullscreen = undefined;
  });
  await p.goto(process.env.GAME_URL || 'http://127.0.0.1:5182');
  await p.waitForFunction(() => window.hawari?.scene.getScene('alley')?.hero);
  await p.evaluate(() =>
    window.hawari.scene.getScene('alley').startLevel(35, { checkpoint: true }),
  );
  await p.waitForTimeout(800);
  const cdp = await p.context().newCDPSession(p);
  const sz = await p.locator('.stick-zone').boundingBox();
  const jb = await p.locator('[data-touch="jump"]').boundingBox();
  const sx = sz.x + sz.width / 2,
    sy = sz.y + sz.height / 2;
  const pts = (list) => list.map(([id, x, y]) => ({ id, x, y, radiusX: 6, radiusY: 6, force: 1 }));
  let stickDown = false, stickAt = [0, 0], jumpDown = false;
  const send = async (type, list) =>
    cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts(list) });
  const active = () => {
    const l = [];
    if (stickDown) l.push([1, sx + stickAt[0], sy + stickAt[1]]);
    if (jumpDown) l.push([2, jb.x + jb.width / 2, jb.y + jb.height / 2]);
    return l;
  };
  const setStick = async (dx, dy) => {
    const was = stickDown;
    if (!dx && !dy) {
      if (was) { const S = [1, sx + stickAt[0], sy + stickAt[1]]; stickDown = false; await send('touchEnd', [S]); }
      return;
    }
    if (!was) {
      stickAt = [0, 0];
      stickDown = true;
      await send('touchStart', active());
    }
    stickAt = [dx, dy];
    await send('touchMove', active());
  };
  const setJump = async (on) => {
    if (on === jumpDown) return;
    const J = [2, jb.x + jb.width / 2, jb.y + jb.height / 2];
    jumpDown = on;
    await send(on ? 'touchStart' : 'touchEnd', on ? active() : [J]);
  };
  let lastDown = -1000, shot = new Set(), deaths = 0, lastLives = 3;
  for (let tick = 0; tick < 2600; tick++) {
    const s = await p.evaluate(() => {
      const s = window.hawari.scene.getScene('alley'), b = s.hero.body;
      const pz = s.landmark ? { v: s.landmark.values, st: s.L.meta.landmark.stations, t: s.L.meta.landmark.target } : null;
      return {
        now: s.elapsed * 1000, x: s.hero.x, ground: b.blocked.down || b.touching.down,
        vy: b.velocity.y, mode: s.mode, lives: s.lives, pz,
        boss: s.boss && s.boss.active ? { x: s.boss.x, st: s.bossState.state, hp: s.bossState.hp, act: s.bossState.active } : null,
        cue: document.getElementById('fight-cue')?.dataset.show === '1' ? document.getElementById('fight-cue').innerText : '',
        pulse: document.querySelector('[data-touch="throw"]')?.classList.contains('salt-cue'),
        abyss: (() => { const c = Math.floor(b.center.x / 24), r = Math.floor((b.bottom + 2) / 24); const a = []; for (let d = 1; d < 3; d++) { let ok = false; for (let rr = r; rr < s.L.rows; rr++) if ('#=-~'.includes(s.L.at(c + d, rr))) ok = true; a.push(!ok); } return a; })(),
        wall: b.blocked.right,
        en: s.enemies.getChildren().filter((e) => e.active).map((e) => ({ x: e.x, y: e.y })),
        feet: b.bottom,
      };
    });
    if (s.lives < lastLives) { deaths++; lastLives = s.lives; }
    if (s.mode === 'clear') break;
    if (s.mode !== 'play') { await setStick(0, 0); await setJump(false); await p.waitForTimeout(200); continue; }
    let dir = 1, down = false, jump = false;
    if (s.pz) {
      const i = s.pz.st.findIndex((c, k) => s.pz.v[k] !== s.pz.t[k]);
      if (i >= 0 && s.boss) {
        const x = s.pz.st[i] * 24 + 12;
        if (s.x > x + 23) dir = -1;
        if (Math.abs(s.x - x) < 23) {
          dir = 0;
          if (s.now - lastDown > 260) { down = true; lastDown = s.now; }
        }
      }
    }
    if (s.boss && s.boss.st === 'exposed') {
      const dx = s.boss.x - s.x;
      dir = Math.abs(dx) < 20 ? 0 : Math.sign(dx);
      if (Math.abs(dx) < 85 && Math.abs(dx) > 30 && s.ground) jump = true;
    } else if (s.boss && s.boss.st === 'guard') {
      const dx = s.boss.x - s.x;
      if (Math.abs(dx) < 95 && Math.abs(dx) > 10 && s.ground) jump = true;
    }
    const gap = s.abyss.some(Boolean);
    const enemy = s.en.some((e) => e.x > s.x - 12 && e.x < s.x + 125 && Math.abs(e.y - s.feet + 20) < 40);
    if (s.ground && (s.wall || gap || enemy)) jump = true;
    if (s.vy > 0) jump = false;
    if (s.cue) {
      for (const [k, re] of [['locked', /مقفول/], ['open', /اتفتح/], ['attack', /هتهجم/]])
        if (!shot.has(k) && re.test(s.cue)) { shot.add(k); await p.screenshot({ path: `${SHOTS}/prism-touch-${k}.png` }); console.log('cue', k, s.cue, 'pulse', s.pulse); }
    }
    await setJump(jump);
    if (down) await setStick(0, 60);
    else await setStick(dir * 90, 0);
    if (tick % 200 === 0) console.log(tick, Math.round(s.x), JSON.stringify(s.boss), 'lives', s.lives);
    await p.waitForTimeout(16);
  }
  await setStick(0, 0); await setJump(false);
  const end = await p.evaluate(() => { const s = window.hawari.scene.getScene('alley'); return { mode: s.mode, lives: s.lives }; });
  console.log('END', JSON.stringify(end), 'deaths', deaths, 'cues', [...shot]);
  await p.screenshot({ path: `${SHOTS}/prism-touch-end.png` });
  assert.equal(end.mode, 'clear');
  assert.ok(shot.has('locked') && shot.has('open'), 'cues shown');
} finally {
  await browser.close();
}
