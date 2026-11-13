// World 4 (اسكندرية) runtime: waves breaking over the sea wall on a beat,
// wet slippery tiles, the tram ride (auto-scrolling view, duck under wires
// and bridges), beach umbrellas to glide with, gusts of set strength, the
// winter storm (rain and lightning), the World 4 creatures and the boss
// «ريّس النوة». Kept apart from the scene; every function takes the scene.
import Phaser from 'phaser';
import type { Alley } from './game';
import { TILE } from './level-data';
import { GLIDE, TRAM, waveState, type Pt } from './level-parse';
import { sound } from './audio';
import { toast } from './ui';

type Img = Phaser.Physics.Arcade.Image;
type Sprite = Phaser.Physics.Arcade.Sprite;
type Body = Phaser.Physics.Arcade.Body;
const body = (s: Phaser.GameObjects.GameObject) =>
  (s as Phaser.Physics.Arcade.Image).body as Body;

export interface Wave {
  col: number;
  x: number;
  /** Top of the ground the wave breaks over. */
  y: number;
  foam: Phaser.GameObjects.Image;
  crash: Phaser.GameObjects.Image;
  state: 'calm' | 'warn' | 'crash';
}
export interface Tram {
  img: Img;
  start: number;
  end: number;
  moving: boolean;
  done: boolean;
}
export interface W4 {
  waves: Wave[];
  tram?: Tram;
  stands: {
    img: Phaser.GameObjects.Image;
    x: number;
    y: number;
    back: number;
  }[];
  /** Carrying a beach umbrella; gliding with it open this frame. */
  umbrella: boolean;
  gliding: boolean;
  brolly: Phaser.GameObjects.Image;
  flash?: Phaser.GameObjects.Rectangle;
  nextBolt: number;
  /** Boss wing-beat: push direction and when it ends. */
  bossGust: number;
  bossGustUntil: number;
  bolts: {
    img: Phaser.GameObjects.Image;
    hz?: Sprite;
    at: number;
    x: number;
  }[];
}

export function buildAlexandria(s: Alley) {
  const L = s.L;
  const any =
    L.waves.length ||
    L.trams.length ||
    L.stands.length ||
    L.wires.length ||
    L.meta.storm ||
    L.meta.theme === 'corniche' ||
    L.meta.theme === 'fort' ||
    L.meta.rows.some((r) => r.includes('$'));
  if (!any) return undefined;
  const w4: W4 = {
    waves: [],
    stands: [],
    umbrella: false,
    gliding: false,
    brolly: s.add.image(0, 0, 'brolly-shut').setDepth(11).setVisible(false),
    nextBolt: s.time.now + 2500,
    bossGust: 0,
    bossGustUntil: 0,
    bolts: [],
  };
  // Wet tiles are solid ground.
  for (const [r, a, b] of s.runs('$'))
    s.terrain.add(
      s.add.zone(
        ((a + b + 1) / 2) * TILE,
        r * TILE + 12,
        (b - a + 1) * TILE,
        TILE,
      ),
    );
  for (const p of L.waves) {
    const y = (p.row + 1) * TILE;
    w4.waves.push({
      col: p.col,
      x: p.x,
      y,
      foam: s.add
        .image(p.x, y + 6, 'wave-foam')
        .setOrigin(0.5, 1)
        .setDepth(7)
        .setAlpha(0),
      crash: s.add
        .image(p.x, y + 10, 'wave-crash0')
        .setOrigin(0.5, 1)
        .setDepth(12)
        .setVisible(false),
      state: 'calm',
    });
  }
  for (const p of L.stands)
    w4.stands.push({
      img: s.add
        .image(p.x, (p.row + 1) * TILE + 2, 'stand')
        .setOrigin(0.5, 1)
        .setDepth(3),
      x: p.x,
      y: (p.row + 1) * TILE,
      back: 0,
    });
  const t = L.trams[0];
  if (t) w4.tram = makeTram(s, t.a, t.endCol);
  if (L.meta.storm)
    w4.flash = s.add
      .rectangle(0, 0, 4000, 2000, 0xe8f0ff, 0)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(60);
  return w4;
}

function makeTram(s: Alley, a: Pt, endCol: number): Tram {
  // After a checkpoint the tram waits at the stop by the flag.
  const cp = s.checkpoint && s.L.checkpoint ? s.L.checkpoint.col - 3 : 0;
  const startCol = Math.max(a.col, Math.min(cp, endCol));
  const roof = (a.row - TRAM.height + 1) * TILE;
  for (let c = a.col; c < endCol + TRAM.width; c++)
    s.add
      .image(c * TILE, (a.row + 1) * TILE - 4, 'rail')
      .setOrigin(0)
      .setDepth(1);
  const img = s.movers.create(startCol * TILE, roof - 12, 'tram') as Img;
  img.setOrigin(0, 0).setDepth(3);
  const b = body(img);
  b.setSize(TRAM.width * TILE, 10).setOffset(0, 12);
  b.checkCollision.down = false;
  b.checkCollision.left = false;
  b.checkCollision.right = false;
  b.reset(startCol * TILE, roof - 12);
  s.moverList.push({
    img,
    axis: 'x',
    min: startCol * TILE,
    max: endCol * TILE,
    speed: 0,
    carry: true,
    tram: true,
  });
  return {
    img,
    start: startCol * TILE,
    end: endCol * TILE,
    moving: false,
    done: false,
  };
}

/** Is the hero standing on the tram roof? */
export function onTram(s: Alley) {
  const tr = s.w4?.tram;
  if (!tr) return false;
  const hb = body(s.hero),
    tb = body(tr.img);
  return (
    Math.abs(hb.bottom - tb.top) < 5 &&
    hb.right > tb.left + 2 &&
    hb.left < tb.right - 2
  );
}

/** Per-frame world motion: waves, the tram and its view, umbrellas, storm. */
export function updateAlexWorld(s: Alley, time: number, dt: number) {
  const w4 = s.w4;
  if (!w4) return;
  const play = s.mode === 'play';
  const hb = body(s.hero);
  const meta = s.L.meta;
  // Waves.
  if (meta.waves)
    for (const w of w4.waves) {
      const st = waveState(meta.waves, w.col, s.clock);
      const k =
        (((((s.clock + w.col * 0.29) % meta.waves.period) + meta.waves.period) %
          meta.waves.period) -
          meta.waves.warn) /
        meta.waves.crash;
      if (st !== w.state) {
        if (st === 'crash' && Math.abs(w.x - s.hero.x) < 420) {
          sound.fx('wave');
          s.burst(w.x, w.y - 20, 0xe8f6ff, 10);
        }
        w.state = st;
      }
      w.foam.setAlpha(st === 'warn' ? 0.5 + 0.5 * Math.sin(time / 60) : 0);
      w.foam.y = w.y + 6 - (st === 'warn' ? Math.sin(time / 90) * 3 : 0);
      w.crash.setVisible(st === 'crash');
      if (st === 'crash') {
        w.crash.setTexture('wave-crash' + Math.min(2, Math.floor(k * 3)));
        const hit =
          play &&
          hb.right > w.x - 30 &&
          hb.left < w.x + 30 &&
          hb.bottom > w.y - 96 &&
          hb.top < w.y;
        if (hit) {
          s.hint('wave', 'الموجة بتضرب! استنى الرغوة تهدى وبعدين اجري');
          const before = s.hurtUntil;
          s.hurt();
          if (s.mode === 'play' && s.hurtUntil !== before)
            s.hero.setVelocity(s.hero.x < w.x ? -220 : 220, -300);
        }
      }
    }
  // Umbrella stands: walk into one to take an umbrella.
  for (const st of w4.stands) {
    const ready = time > st.back;
    st.img.setAlpha(ready ? 1 : 0.35);
    if (
      play &&
      ready &&
      !w4.umbrella &&
      Math.abs(s.hero.x - st.x) < 20 &&
      Math.abs(hb.bottom - st.y) < 40
    ) {
      st.back = time + 6000;
      giveUmbrella(s);
    }
  }
  // The umbrella in hand: open above you while you glide.
  if (w4.umbrella) {
    w4.brolly
      .setVisible(true)
      .setTexture(w4.gliding ? 'brolly-open' : 'brolly-shut')
      .setOrigin(0.5, 1)
      .setPosition(
        s.hero.x + (w4.gliding ? 0 : -s.facing * 12),
        w4.gliding ? hb.top + 2 : hb.bottom - 4,
      )
      .setAngle(w4.gliding ? Math.sin(time / 120) * 6 : 0);
  } else w4.brolly.setVisible(false);
  updateTram(s, time);
  // Wires and low bridges: duck under them (on the tram roof).
  if (play)
    for (const w of s.L.wires) {
      if (w.x1 < s.hero.x - 300 || w.x0 > s.hero.x + 400) continue;
      if (w4.tram?.moving && w.x0 > s.hero.x && w.x0 - s.hero.x < 190)
        s.hint(
          w.bridge ? 'bridge' : 'wire',
          w.bridge
            ? 'كوبري واطي! وطّي (اضغط لتحت)'
            : 'سلك الترام! وطّي (اضغط لتحت)',
        );
      if (
        hb.right > w.x0 + 2 &&
        hb.left < w.x1 - 2 &&
        hb.top < w.y1 &&
        hb.bottom > w.y0
      )
        s.hurt();
    }
  // The storm: lightning flashes and thunder.
  if (meta.storm && w4.flash && time > w4.nextBolt) {
    w4.nextBolt = time + 5200 + Math.random() * 4200;
    w4.flash.setAlpha(0.5);
    s.tweens.add({
      targets: w4.flash,
      alpha: 0,
      duration: 420,
      ease: 'Quad.out',
    });
    const cam = s.cameras.main;
    const bx = cam.scrollX + 80 + Math.random() * (cam.width - 160);
    const bolt = s.add
      .image(bx, 0, 'bolt')
      .setOrigin(0.5, 0)
      .setDepth(-50)
      .setScale(1, 1.4);
    s.tweens.add({
      targets: bolt,
      alpha: 0,
      duration: 260,
      delay: 80,
      onComplete: () => bolt.destroy(),
    });
    s.time.delayedCall(300 + Math.random() * 500, () => sound.fx('thunder'));
  }
  // Boss lightning strikes: a mark, then the bolt.
  for (const b of [...w4.bolts]) {
    if (!b.hz && time > b.at) {
      // Strikes where its mark was, from the clouds down to the stones.
      b.img.setTexture('bolt').setOrigin(0.5, 1).setScale(1, 1.3).setAlpha(1);
      const hz = s.hazards.create(b.x, b.img.y - 120, 'spray') as Sprite;
      hz.setVisible(false).setData('kind', 'bolt');
      body(hz).setAllowGravity(false).setImmovable(true).setSize(20, 240);
      b.hz = hz;
      sound.fx('thunder');
      s.cameras.main.shake(120, 0.006);
      if (w4.flash) {
        w4.flash.setAlpha(0.35);
        s.tweens.add({ targets: w4.flash, alpha: 0, duration: 260 });
      }
    } else if (b.hz && time > b.at + 260) {
      b.hz.destroy();
      b.img.destroy();
      w4.bolts.splice(w4.bolts.indexOf(b), 1);
    }
  }
  void dt;
}

export function giveUmbrella(s: Alley) {
  const w4 = s.w4;
  if (!w4) return;
  if (!w4.umbrella) sound.fx('brolly');
  w4.umbrella = true;
  s.hint('brolly', 'معاك شمسية! وانت نازل دوس نطّ وخليك دايس… هتطير بيها');
}
export function dropUmbrella(s: Alley) {
  const w4 = s.w4;
  if (!w4?.umbrella) return;
  w4.umbrella = false;
  w4.gliding = false;
  const img = s.add.image(s.hero.x, s.hero.y - 20, 'brolly-open').setDepth(20);
  s.tweens.add({
    targets: img,
    x: img.x - s.facing * 90,
    y: img.y - 60,
    angle: -s.facing * 200,
    alpha: 0,
    duration: 700,
    onComplete: () => img.destroy(),
  });
}

function updateTram(s: Alley, time: number) {
  const tr = s.w4?.tram;
  if (!tr) return;
  const b = body(tr.img);
  const cam = s.cameras.main;
  if (!tr.moving && !tr.done && s.mode === 'play' && onTram(s)) {
    tr.moving = true;
    sound.fx('tram');
    toast('الترام اتحرّك! وطّي من السلك والكباري ونطّ فوق النوارس');
    cam.stopFollow();
  }
  if (tr.moving) {
    let vx = TRAM.speed;
    if (tr.img.x + vx / 60 >= tr.end) {
      vx = 0;
      tr.img.x = tr.end;
      tr.moving = false;
      tr.done = true;
      sound.fx('tram');
      // Back to following the hero.
      s.followHero();
    }
    b.setVelocityX(vx);
    if (
      Math.floor(time / 2400) !== Math.floor((time - 17) / 2400) &&
      Math.random() < 0.3
    )
      sound.fx('tram');
  } else b.setVelocityX(0);
  if (tr.moving && s.mode === 'play') {
    // Auto-scroll: the view rides with the tram; you can't fall behind it.
    const target = tr.img.x + (TRAM.width * TILE) / 2 - cam.width * 0.42;
    cam.scrollX += (target - cam.scrollX) * 0.12;
    cam.scrollY = Math.max(0, s.L.height - cam.height);
    const lo = cam.scrollX + 14,
      hi = cam.scrollX + cam.width - 14;
    if (s.hero.x < lo) {
      s.hero.x = lo;
      if (body(s.hero).velocity.x < 0) body(s.hero).velocity.x = 0;
    }
    if (s.hero.x > hi) s.hero.x = hi;
  }
}

/** Ground and air control tweaks: wet tiles slide, the umbrella glides. */
export function alexMove(
  s: Alley,
  grounded: boolean,
  under: string,
  jump: boolean,
  dt: number,
): { wet: boolean; glide: boolean } {
  const w4 = s.w4;
  const wet = grounded && under === '$';
  if (wet) s.hint('wet', 'البلاط مبلول! هتتزحلق… خفّف قبل الحافة');
  const hb = body(s.hero);
  const glide =
    !!w4?.umbrella && !grounded && jump && hb.velocity.y > 0 && !s.swimming;
  if (w4) w4.gliding = glide;
  if (glide) hb.velocity.y = Math.min(hb.velocity.y, GLIDE.fall);
  void dt;
  return { wet, glide };
}

/* ───────────── Creatures ───────────── */
/** World 4 enemy behaviour; returns true when it handled the enemy. */
export function updateAlexEnemy(s: Alley, e: Sprite, time: number) {
  const kind = e.getData('kind') as string;
  if (!['skua', 'jelly', 'brolly', 'ball'].includes(kind)) return false;
  const eb = body(e),
    home = e.getData('home') as { x: number; y: number },
    seed = e.getData('seed') as number,
    state = e.getData('state') as string,
    dx = s.hero.x - e.x,
    dy = s.hero.y - e.y;
  const frame = (n: number) => e.setTexture(kind + n);
  if (kind === 'skua') {
    // A storm gull: wheels about, then dives hard at where you're going.
    if (state === 'walk') {
      const tx = home.x + Math.sin(time / 900 + seed) * 70,
        ty = home.y + Math.sin(time / 330 + seed) * 12;
      eb.setVelocity((tx - e.x) * 4, (ty - e.y) * 4);
      frame(Math.floor(time / 70) % 3);
      if (
        Math.abs(dx) < 200 &&
        dy > 10 &&
        dy < 280 &&
        time > e.getData('until')
      ) {
        e.setData('state', 'dive').setData('until', time + 900);
        const lead = body(s.hero).velocity.x * 0.45;
        s.physics.moveTo(e, s.hero.x + lead, s.hero.y, 320);
        sound.fx('gull');
      }
    } else if (state === 'dive') {
      frame(3);
      if (time > e.getData('until') || eb.blocked.down) {
        e.setData('state', 'climb');
        eb.setVelocity(eb.velocity.x * 0.8, -190);
      }
    } else {
      if (e.y < home.y + 20) s.physics.moveTo(e, home.x, home.y, 170);
      frame(Math.floor(time / 55) % 3);
      if (Phaser.Math.Distance.Between(e.x, e.y, home.x, home.y) < 10)
        e.setData('state', 'walk').setData('until', time + 1000);
    }
    e.setFlipX(eb.velocity.x > 0);
    return true;
  }
  if (kind === 'jelly') {
    // Drifts up and down in the water, pulsing.
    const sea = s.L.seas.find((k) => home.x >= k.x0 && home.x <= k.x1);
    const top = (sea?.top ?? home.y - 20) + 14,
      bottom = (sea?.bottom ?? home.y + 20) - 14;
    const ty = Phaser.Math.Clamp(
        home.y + Math.sin(time / 420 + seed) * 22,
        top,
        bottom,
      ),
      tx = home.x + Math.sin(time / 1700 + seed) * 18;
    eb.setVelocity((tx - e.x) * 3, (ty - e.y) * 3);
    frame(Math.floor(time / 170 + seed) % 4);
    return true;
  }
  if (kind === 'brolly') {
    // Tumbles along on the wind, swooping in long arcs.
    const gust = s.windOn ? s.windDir() * 60 : 0;
    const tx = home.x + Math.sin(time / 1500 + seed) * 90 + gust,
      ty = home.y + Math.sin(time / 480 + seed) * 18;
    eb.setVelocity((tx - e.x) * 2.5, (ty - e.y) * 2.5);
    e.setAngle(Math.sin(time / 260 + seed) * 28);
    frame(Math.floor(time / 110) % 4);
    return true;
  }
  // Beach ball: bounces along, turning at walls.
  let d = (e.getData('dir') as number) || -1;
  if (eb.blocked.left) d = 1;
  if (eb.blocked.right) d = -1;
  e.setData('dir', d).setVelocityX(d * 78);
  if (eb.blocked.down) {
    e.setVelocityY(e.getData('hop') ? -300 : -380);
    e.setData('hop', !e.getData('hop'));
  }
  frame((((Math.floor(time / 90) * -d) % 4) + 4) % 4);
  return true;
}

/** World 4 contact rules; returns true when handled. */
export function alexContact(s: Alley, e: Sprite, fromTop: boolean) {
  const kind = e.getData('kind');
  if (kind === 'jelly') {
    // Stinging bells can't be stomped.
    if (fromTop) s.hero.setVelocityY(-340);
    s.hint('jelly', 'القنديل بيقرص! ما ينداسش… عدّي من جنبه أو ارميه بالشطة');
    s.hurt();
    return true;
  }
  if (kind === 'brolly' && fromTop) {
    s.killEnemy(e);
    s.hero.setVelocityY(-300);
    giveUmbrella(s);
    toast('مسكت الشمسية الطايرة! دوس نطّ وانت نازل تطير بيها');
    return true;
  }
  if (kind === 'ball' && fromTop) {
    s.killEnemy(e);
    sound.fx('pop');
    s.hero.setVelocityY(-560);
    return true;
  }
  return false;
}

/* ───────────── Boss «ريّس النوة» ───────────── */
/** hover → tell (screech) → dive → stuck (beak in the stones: stomp him)
 * → [phase 2: wing-beat gale · phase 3: lightning strikes] → rise. */
export function updateStormBoss(s: Alley, time: number) {
  const boss = s.boss!,
    st = s.bossState,
    bb = body(boss),
    w4 = s.w4!;
  const phase = s.bossPhase();
  const over = time > st.until;
  const tex = (pose: string) => boss.setTexture('boss4-' + pose);
  const floor = (s.L.boss!.row + 5) * TILE;
  const topY = 3 * TILE + 10;
  const toHero = Math.sign(s.hero.x - boss.x) || 1;
  if (!['dive', 'hurt'].includes(st.state)) boss.setFlipX(toHero > 0);
  switch (st.state) {
    case 'walk':
    case 'hover': {
      tex('idle' + (Math.floor(time / 140) % 2));
      const side = Math.sin(time / 1300) > 0 ? 1 : -1;
      const tx = s.hero.x + side * 110,
        ty = topY + Math.sin(time / 400) * 10;
      bb.setVelocity(
        Phaser.Math.Clamp((tx - boss.x) * 2, -200, 200),
        Phaser.Math.Clamp((ty - boss.y) * 3, -200, 200),
      );
      if (
        phase >= 2 &&
        time > (boss.getData('drop') || 0) &&
        Math.abs(s.hero.x - boss.x) < 40
      ) {
        boss.setData('drop', time + (phase === 3 ? 700 : 1000));
        const sh = s.hazards.create(boss.x, boss.y + 24, 'shell') as Sprite;
        body(sh).setSize(8, 6);
        sh.setVelocity(bb.velocity.x * 0.4, 60)
          .setData('kind', 'shell')
          .setDepth(9);
        sound.fx('gull');
      }
      if (over) {
        bb.setVelocity(0, 0);
        sound.fx('screech');
        st.state = 'tell';
        st.until = time + [700, 560, 440][phase - 1];
      }
      break;
    }
    case 'tell':
      tex('tell');
      bb.setVelocity(Math.sin(time / 25) * 30, -20);
      boss.setTint(Math.floor(time / 80) % 2 ? 0xffb0a0 : 0xffffff);
      if (over) {
        boss.clearTint();
        // Aim at where the hero is standing, carry on into the roof.
        const ang = Phaser.Math.Angle.Between(boss.x, boss.y, s.hero.x, floor);
        const v = [330, 380, 430][phase - 1];
        bb.setVelocity(Math.cos(ang) * v, Math.max(160, Math.sin(ang) * v));
        st.volley = Math.sign(bb.velocity.x) || 1;
        st.state = 'dive';
        st.until = time + 2200;
      }
      break;
    case 'dive': {
      tex('dive');
      boss.setFlipX(st.volley > 0);
      const [lo, hi] = s.bossRange();
      const wall =
        (boss.x <= lo + 1 && bb.velocity.x < 0) ||
        (boss.x >= hi - 1 && bb.velocity.x > 0);
      if (wall) bb.setVelocityX(0);
      if (bb.blocked.down || bb.bottom >= floor - 2 || over) {
        bb.setVelocity(0, 0);
        s.cameras.main.shake(200, 0.012);
        sound.fx('shock');
        s.burst(boss.x - st.volley * 40, bb.bottom, 0xa89e8a, 12);
        st.state = 'stuck';
        st.until = time + [1600, 1350, 1100][phase - 1];
      }
      break;
    }
    case 'stuck':
      tex('stuck');
      bb.setVelocity(0, 0);
      if (Math.floor(time / 130) % 3 === 0)
        s.burst(
          boss.x + (Math.random() - 0.5) * 60,
          bb.bottom - 4,
          0xa89e8a,
          1,
        );
      if (over) {
        if (phase === 2) {
          st.state = 'gust';
          st.until = time + 1500;
          w4.bossGust = toHero;
          w4.bossGustUntil = time + 1500;
          sound.fx('wind');
          s.hint(
            'boss-gust',
            'بيرفرف بجناحه ويطيّرك! امسك نفسك أو اختبي ورا الحيطة',
          );
        } else if (phase === 3) {
          st.state = 'strike';
          st.until = time + 1100;
          sound.fx('screech');
          for (const off of [-90, 0, 90]) {
            const x = Phaser.Math.Clamp(
              s.hero.x + off,
              st.arenaX + 40,
              s.L.width - 40,
            );
            const img = s.add
              .image(x, floor + 4, 'strike-mark')
              .setDepth(8)
              .setOrigin(0.5, 1);
            s.tweens.add({
              targets: img,
              alpha: 0.4,
              yoyo: true,
              repeat: 4,
              duration: 90,
            });
            w4.bolts.push({ img, at: time + 800, x });
          }
        } else rise(s, time);
      }
      break;
    case 'gust':
      tex('gust');
      bb.setVelocity(0, -30);
      if (Math.floor(time / 60) % 2 === 0)
        s.burst(boss.x + toHero * 50, boss.y, 0xc8dcf0, 2);
      if (over) rise(s, time);
      break;
    case 'strike':
      tex('tell');
      bb.setVelocity(0, -40);
      if (over) rise(s, time);
      break;
    case 'rise':
      tex('idle' + (Math.floor(time / 90) % 2));
      bb.setVelocity(-toHero * 60, -220);
      if (boss.y <= topY + 6 || over) {
        st.state = 'hover';
        st.until = time + [1900, 1600, 1300][phase - 1];
      }
      break;
    case 'hurt':
      tex('hurt');
      bb.velocity.x *= 0.92;
      bb.velocity.y = Math.min(bb.velocity.y + 20, 120);
      if (over) rise(s, time);
      break;
  }
  s.clampBoss();
  if (boss.y < 40) boss.y = 40;
}
function rise(s: Alley, time: number) {
  s.bossState.state = 'rise';
  s.bossState.until = time + 1400;
}
/** «ريّس النوة» contact: only stompable while his beak is stuck. */
export function stormContact(s: Alley, fromAbove: boolean) {
  const boss = s.boss!,
    st = s.bossState;
  if (st.state === 'stuck' && fromAbove) {
    s.hero.setVelocityY(-430);
    if (s.time.now >= st.invuln) s.bossDamage(1);
    return;
  }
  if (st.state === 'stuck' || st.state === 'hurt') {
    s.hero.setVelocityX(s.hero.x < boss.x ? -140 : 140);
    return;
  }
  if (fromAbove && st.state !== 'dive') {
    s.hero.setVelocity(s.hero.x < boss.x ? -200 : 200, -380);
    s.hint(
      'boss-fly',
      'ريّس النوة طاير! استنى لما يغرز منقاره في الأرض واتنطّ عليه',
    );
    return;
  }
  if (s.time.now < s.invincible)
    s.hero.setVelocityX(s.hero.x < boss.x ? -260 : 260);
  else {
    s.hurt();
    if (s.mode === 'play')
      s.hero.setVelocity(s.hero.x < boss.x ? -260 : 260, -280);
  }
}
/** Extra push on the hero from the boss's wing-beat (px/s). */
export function bossGustPush(s: Alley, time: number) {
  const w4 = s.w4;
  return w4 && time < w4.bossGustUntil ? w4.bossGust * 240 : 0;
}
