// Aswan's signature level: a brisk felucca ride up the first cataract.
// The boat runs forward on its own the moment you step aboard (auto-scroll
// feel). Left and right only trim the speed a little; jump hops you to the
// other side of the channel to dodge granite rocks and surfacing crocodiles.
// Occasional wind gusts show an arrow and give an automatic speed burst.
// Hitting a rock bumps you and you slide past — you never sit aground.
import Phaser from 'phaser';
import type { Alley } from './game';
import { TILE, type LevelMeta } from './level-data';
import { sound } from './audio';
import { toast } from './ui';
import { disc, poly, tex } from './art-kit';

type Img = Phaser.GameObjects.Image;
type Body = Phaser.Physics.Arcade.Body;
export type SailCourse = NonNullable<LevelMeta['sail']>;
/** Tuning (px/s, ms). Cruise covers the cataract in about a minute. */
export const SAIL = {
  cruise: 80,
  boost: 36,
  slow: 28,
  min: 44,
  accel: 320,
  hopMs: 180,
  laneRise: 34,
  warn: 700,
  bump: 0.5,
  knock: 40,
  bubbles: 1100,
  up: 1700,
  rest: 2600,
  /** A rock or croc owns the near (lane < 0.4) or far (lane > 0.6) side. */
  side: 0.4,
};
interface Croc {
  x: number;
  lane: number;
  state: 'wait' | 'bubbles' | 'up' | 'rest';
  until: number;
  img: Img;
  ring: Img;
}
interface Coin {
  x: number;
  lane: number;
  img: Phaser.Physics.Arcade.Sprite;
}
interface Gust {
  at: number;
  ms: number;
  boost: number;
}
export interface Sail {
  on: boolean;
  done: boolean;
  x: number;
  v: number;
  lane: number;
  tack: number;
  surface: number;
  startX: number;
  endX: number;
  dockX: number;
  hull: Img;
  sail: Img;
  wake: Img;
  river: Phaser.GameObjects.Rectangle;
  vane: Phaser.GameObjects.Container;
  vaneArrow: Phaser.GameObjects.Graphics;
  vaneText: Phaser.GameObjects.Text;
  gusts: Gust[];
  t0: number;
  hopUntil: number;
  hopFrom: number;
  hopTo: number;
  bumped: number;
  gustPlayed: number;
  rocks: { x: number; lane: number; img: Img }[];
  crocs: Croc[];
  coins: Coin[];
}
const body = (o: Phaser.GameObjects.GameObject) =>
  (o as Phaser.Physics.Arcade.Image).body as Body;
const near = (lane: number, side: number) =>
  side < 0.5 ? lane < SAIL.side : lane > 1 - SAIL.side;

export function makeSailProps(scene: Phaser.Scene) {
  if (scene.textures.exists('cataract-rock')) return;
  // A pink Aswan granite boulder breaking the water, with a foam collar.
  tex(scene, 'cataract-rock', 52, 34, (c) => {
    poly(
      c,
      [
        [2, 33],
        [6, 14],
        [16, 4],
        [32, 2],
        [44, 10],
        [50, 33],
      ],
      '#1b140f',
    );
    poly(
      c,
      [
        [5, 31],
        [9, 15],
        [17, 7],
        [31, 5],
        [42, 12],
        [47, 31],
      ],
      '#b87a78',
    );
    poly(
      c,
      [
        [12, 14],
        [18, 9],
        [30, 7],
        [26, 13],
      ],
      '#e0a8a0',
    );
    for (const [x, y] of [
      [20, 20],
      [34, 16],
      [28, 26],
      [14, 26],
      [40, 24],
    ])
      disc(c, x, y, 1.5, '#5a3a3a');
    for (let x = 0; x < 52; x += 7) disc(c, x + 3, 32, 3, '#f4fbff');
  });
  tex(scene, 'sail-ring', 40, 10, (c) => {
    c.strokeStyle = '#f4fbff';
    c.lineWidth = 2;
    c.beginPath();
    c.ellipse(20, 5, 18, 4, 0, 0, Math.PI * 2);
    c.stroke();
  });
  tex(scene, 'sail-wake', 60, 8, (c) => {
    for (let i = 0; i < 6; i++) disc(c, 8 + i * 9, 4, 3 - i * 0.4, '#f4fbff');
  });
}

export function buildSail(s: Alley): Sail | undefined {
  const course = s.L.meta.sail;
  if (!course) return undefined;
  makeSailProps(s);
  const surface = course.row * TILE;
  const dockX = course.fromCol * TILE;
  const endDock = course.toCol * TILE;
  const startX = dockX + 44,
    endX = endDock - 44;
  // The far half of the river, rising up the screen in perspective.
  const river = s.add
    .rectangle(
      (dockX + endDock) / 2,
      surface - SAIL.laneRise / 2 - 6,
      endDock - dockX,
      SAIL.laneRise + 12,
      0x2a5a5e,
      0.82,
    )
    .setDepth(2);
  // Its far edge: a line of glinting ripples.
  s.add
    .rectangle(
      (dockX + endDock) / 2,
      surface - SAIL.laneRise - 12,
      endDock - dockX,
      2,
      0xd8f0e0,
      0.7,
    )
    .setDepth(2);
  const hull = s.add.image(startX, 0, 'felucca').setOrigin(0.5, 0);
  const sail = s.add.image(startX, 0, 'felucca-sail').setOrigin(0.5, 1);
  const wake = s.add.image(startX, 0, 'sail-wake').setOrigin(1, 0.5);
  const vaneArrow = s.add.graphics();
  const vaneText = s.add
    .text(0, 0, '', {
      fontFamily: 'Changa, Tahoma',
      fontSize: '13px',
      color: '#fff6dc',
      stroke: '#1b140f',
      strokeThickness: 3,
    })
    .setOrigin(0.5, 0);
  const vane = s.add
    .container(0, 0, [vaneArrow, vaneText])
    .setScrollFactor(0)
    .setDepth(70)
    .setVisible(false);
  const sl: Sail = {
    on: false,
    done: false,
    x: startX,
    v: 0,
    lane: 0,
    tack: 1,
    surface,
    startX,
    endX,
    dockX,
    hull,
    sail,
    wake,
    river,
    vane,
    vaneArrow,
    vaneText,
    gusts: (course.gusts ?? []).map(([at, sec, boost]) => ({
      at: at * 1000,
      ms: sec * 1000,
      boost,
    })),
    t0: 0,
    hopUntil: 0,
    hopFrom: 0,
    hopTo: 0,
    bumped: 0,
    gustPlayed: -1,
    rocks: course.rocks.map(([col, lane]) => ({
      x: col * TILE,
      lane,
      img: s.add.image(col * TILE, 0, 'cataract-rock').setOrigin(0.5, 1),
    })),
    crocs: course.crocs.map(([col, lane]) => ({
      x: col * TILE,
      lane,
      state: 'wait',
      until: 0,
      img: s.add.image(col * TILE, 0, 'croc2').setVisible(false),
      ring: s.add.image(col * TILE, 0, 'sail-ring').setVisible(false),
    })),
    coins: [],
  };
  for (const [col, lane, n] of course.coins)
    for (let i = 0; i < n; i++) {
      const img = s.coin((col + i * 1.5) * TILE, 0);
      body(img).enable = false;
      sl.coins.push({ x: img.x, lane, img });
    }
  for (const r of sl.rocks) place(sl, r.img, r.lane, 6);
  for (const c of sl.coins)
    place(sl, c.img, c.lane, 2).setY(laneY(sl, c.lane) - 22);
  drawBoat(s, sl);
  return sl;
}
const laneY = (sl: Sail, lane: number) => sl.surface - lane * SAIL.laneRise;
const laneScale = (lane: number) => 1 - lane * 0.16;
/** Puts an object on a lane: y on the water, perspective scale and depth. */
function place<T extends Img | Phaser.Physics.Arcade.Sprite>(
  sl: Sail,
  o: T,
  lane: number,
  dy = 0,
) {
  o.setY(laneY(sl, lane) + dy * laneScale(lane))
    .setScale(laneScale(lane))
    .setDepth(9 - lane * 4);
  return o;
}
function drawBoat(s: Alley, sl: Sail) {
  const k = laneScale(sl.lane),
    y = laneY(sl, sl.lane),
    bob = Math.sin(s.clock * 2.4) * 1.5;
  sl.hull
    .setPosition(sl.x, y - 18 * k + bob)
    .setScale(k)
    .setDepth(8.6 - sl.lane * 4);
  sl.sail
    .setPosition(sl.x, y - 10 * k + bob)
    .setScale(k * (sl.tack > 0 ? 1 : 0.86), k)
    .setFlipX(sl.tack < 0)
    .setAngle(Math.sin(s.clock * 1.3) * 1.5)
    .setDepth(8.4 - sl.lane * 4);
  sl.wake
    .setPosition(sl.x - 40 * k, y + 4)
    .setScale(k * Math.min(1.4, Math.abs(sl.v) / 120), k)
    .setAlpha(sl.v > 20 ? 0.8 : 0)
    .setDepth(8.5 - sl.lane * 4);
}
/** The gust active at this moment of the voyage, and the next one coming. */
function gustAt(sl: Sail, t: number) {
  let next: Gust | undefined;
  for (const g of sl.gusts) {
    if (t >= g.at && t < g.at + g.ms)
      return { now: g, next, left: g.at + g.ms - t, warn: 0 };
    if (t < g.at) {
      next = g;
      break;
    }
  }
  return {
    now: undefined as Gust | undefined,
    next,
    left: 0,
    warn: next ? next.at - t : 1e9,
  };
}
function drawVane(
  s: Alley,
  sl: Sail,
  time: number,
  g: ReturnType<typeof gustAt>,
) {
  const cam = s.cameras.main;
  const coming = g.warn > 0 && g.warn < SAIL.warn;
  const active = !!g.now;
  sl.vane
    .setPosition(cam.width / 2, 58)
    .setVisible(sl.on && (active || coming));
  if (!sl.vane.visible) return;
  const flash = coming && Math.floor(time / 120) % 2 === 0;
  const col = flash || active ? 0xffd84a : 0x8ae8a0;
  const arrow = sl.vaneArrow;
  arrow.clear();
  arrow.fillStyle(0x1b140f, 0.6).fillRoundedRect(-70, -4, 140, 44, 8);
  // A single forward gust arrow, not a "haul the sheet" lecture.
  arrow.fillStyle(col, 1).fillTriangle(28, 12, 4, 2, 4, 22);
  arrow.fillStyle(col, 1).fillRect(-18, 8, 24, 8);
  sl.vaneText.setY(20).setText(active ? 'هبّة ريح!' : 'هبّة ريح جاية!');
}

/** Before boarding: the boat waits at the jetty; step aboard to sail. */
export function sailIdle(s: Alley, sl: Sail) {
  drawBoat(s, sl);
  for (const r of sl.rocks) r.img.setX(r.x);
  if (sl.on || sl.done || s.mode !== 'play') return;
  const b = body(s.hero);
  if (s.hero.x > sl.dockX - 6 && b.blocked.down) {
    sl.on = true;
    sl.t0 = s.time.now;
    sl.v = SAIL.cruise;
    sound.fx('creak');
    toast('الفلوكة جريت! نطّ تعدّي الصخر والتماسيح');
  }
}

/** One frame of sailing; the hero rides the deck. */
export function sailStep(
  s: Alley,
  sl: Sail,
  time: number,
  dt: number,
  input: { dir: number; jump: boolean },
) {
  const age = time - sl.t0;
  const g = gustAt(sl, age);
  if (g.now && sl.gustPlayed !== g.now.at) {
    sl.gustPlayed = g.now.at;
    sound.fx('wind');
  }
  // Hop to the other side of the channel — a dodge, not a tack.
  if (input.jump && time > sl.hopUntil) {
    sl.hopFrom = sl.lane;
    sl.hopTo = sl.lane < 0.5 ? 1 : 0;
    sl.hopUntil = time + SAIL.hopMs;
    sl.tack = sl.hopTo > sl.hopFrom ? 1 : -1;
    sound.fx('jump');
    s.burst(sl.x, laneY(sl, sl.lane) - 40, 0xf4ece0, 3);
  }
  if (time < sl.hopUntil) {
    const t = 1 - (sl.hopUntil - time) / SAIL.hopMs;
    const e = t * t * (3 - 2 * t);
    sl.lane = sl.hopFrom + (sl.hopTo - sl.hopFrom) * e;
  } else sl.lane = sl.hopTo;
  sl.lane = Phaser.Math.Clamp(sl.lane, 0, 1);
  let target = SAIL.cruise;
  if (input.dir > 0) target += SAIL.boost;
  if (input.dir < 0) target -= SAIL.slow;
  if (g.now) target += g.now.boost;
  sl.v += Phaser.Math.Clamp(target - sl.v, -SAIL.accel * dt, SAIL.accel * dt);
  sl.v = Math.max(SAIL.min, sl.v);
  sl.x += sl.v * dt;
  if (sl.x < sl.startX) {
    sl.x = sl.startX;
    sl.v = Math.max(SAIL.cruise, sl.v);
  }
  // Granite rocks: bump and slide past, never sit still.
  for (const r of sl.rocks)
    if (
      time > sl.bumped &&
      Math.abs(sl.x - r.x) < 38 &&
      near(sl.lane, r.lane)
    ) {
      sl.x = r.x + SAIL.knock;
      sl.v = Math.max(SAIL.min, sl.v * SAIL.bump);
      sl.bumped = time + 280;
      sound.fx('bump');
      s.cameras.main.shake(100, 0.004);
      s.burst(r.x, laneY(sl, r.lane) - 8, 0xf4fbff, 6);
      s.hint('rock', 'صخرة! نطّ للناحية التانية المرة الجاية');
    }
  for (const c of sl.crocs) stepCroc(s, sl, c, time);
  for (const c of sl.coins)
    if (c.img.active && Math.abs(c.x - sl.x) < 26 && near(sl.lane, c.lane)) {
      s.collect();
      s.burst(c.img.x, c.img.y, 0xffe08a, 4);
      c.img.destroy();
    }
  drawBoat(s, sl);
  drawVane(s, sl, time, g);
  const b = body(s.hero);
  const k = laneScale(sl.lane);
  b.setAllowGravity(false);
  s.hero.setScale(k);
  const deck = laneY(sl, sl.lane) - 10 * k + Math.sin(s.clock * 2.4) * 1.5;
  b.reset(sl.x - 14 * k, deck - (b.bottom - s.hero.y));
  s.hero.setDepth(8.5 - sl.lane * 4 + 0.05);
  s.facing = 1;
  s.hero.setFlipX(false);
  if (sl.x >= sl.endX) arrive(s, sl);
}
function stepCroc(s: Alley, sl: Sail, c: Croc, time: number) {
  const dx = c.x - sl.x;
  const k = laneScale(c.lane),
    y = laneY(sl, c.lane);
  c.ring
    .setPosition(c.x, y)
    .setScale(k)
    .setDepth(9 - c.lane * 4);
  switch (c.state) {
    case 'wait':
      if (dx < 330 && dx > -60 && time > c.until) {
        c.state = 'bubbles';
        c.until = time + SAIL.bubbles;
        s.hint(
          'croc-bubbles',
          'فقاقيع في المية… تمساح طالع! خلّي الفلوكة في الناحية التانية',
        );
      }
      break;
    case 'bubbles':
      c.ring.setVisible(true).setAlpha(0.5 + 0.5 * Math.sin(time / 60));
      if (Math.floor(time / 90) % 3 === 0)
        s.burst(c.x + Phaser.Math.Between(-14, 14), y - 2, 0xf4fbff, 1);
      if (time > c.until) {
        c.state = 'up';
        c.until = time + SAIL.up;
        c.img
          .setVisible(true)
          .setScale(k * 1.5)
          .setDepth(8.8 - c.lane * 4);
        c.img.setY(y + 10);
        s.tweens.add({ targets: c.img, y: y - 6 * k, duration: 180 });
        sound.fx('splash');
        s.burst(c.x, y - 4, 0xbfe8ff, 8);
      }
      break;
    case 'up': {
      c.img
        .setX(c.x)
        .setTexture(Math.floor(time / 200) % 2 ? 'croc2' : 'croc3');
      if (Math.floor(time / 400) % 2 === 0 && Math.floor(time / 200) % 2)
        sound.fx('clack');
      if (Math.abs(dx) < 40 && near(sl.lane, c.lane)) {
        const before = s.hurtUntil;
        s.hurt('croc');
        if (s.hurtUntil !== before) sl.v *= 0.3;
      }
      // A frond across its snout sends it back under.
      for (const sh of s.shots.getChildren() as Phaser.Physics.Arcade.Sprite[])
        if (
          sh.active &&
          Math.abs(sh.x - c.x) < 24 &&
          Math.abs(sh.y - c.img.y) < 26
        ) {
          sh.destroy();
          s.score += 200;
          s.popText(c.x, c.img.y - 16, '+٢٠٠');
          c.until = 0;
        }
      if (time > c.until) {
        c.state = 'rest';
        c.until = time + SAIL.rest;
        s.tweens.add({
          targets: c.img,
          y: y + 14,
          duration: 200,
          onComplete: () => c.img.setVisible(false),
        });
        c.ring.setVisible(false);
      }
      break;
    }
    case 'rest':
      if (time > c.until) {
        c.state = 'wait';
        c.until = time + 400;
      }
      break;
  }
}
function arrive(s: Alley, sl: Sail) {
  sl.on = false;
  sl.done = true;
  sl.v = 0;
  sl.lane = 0;
  drawBoat(s, sl);
  sl.vane.setVisible(false);
  for (const c of sl.crocs) {
    c.img.setVisible(false);
    c.ring.setVisible(false);
  }
  const b = body(s.hero);
  s.hero.setScale(1).setDepth(10);
  b.setAllowGravity(true);
  b.reset(sl.endX + 60, s.hero.y - 30);
  sound.fx('checkpoint');
  toast('وصلت المرسى! انزل وكمّل للباب');
}
