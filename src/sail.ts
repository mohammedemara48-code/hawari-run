// Aswan's signature level: sail a felucca up the Nile through the first
// cataract. The hero stays on deck; you sail it instead of walking:
//   → (hold) haul the sheet and drive the boat; ← spill the wind / brake.
//   jump: tack — swing the yard over, and the boat heads for the other bank.
// With the wind behind you the boat runs fast and drifts slowly across the
// river. With the wind against you it only makes headway while it is
// reaching across the river, so you zig-zag from bank to bank; run into
// the reeds without tacking and it runs aground until you do. The wind
// turns every few seconds (the vane and the arrow flash first). Granite
// rocks sit on the near or far side of the channel and stop the boat;
// crocodiles surface on one side (bubbles first) and bite a boat passing
// on their side; a thrown frond sends one back under.
import Phaser from 'phaser';
import type { Alley } from './game';
import { TILE, type LevelMeta } from './level-data';
import { sound } from './audio';
import { toast } from './ui';
import { disc, poly, tex } from './art-kit';

type Img = Phaser.GameObjects.Image;
type Body = Phaser.Physics.Arcade.Body;
export type SailCourse = NonNullable<LevelMeta['sail']>;
/** Tuning (px/s, lanes/s, ms). */
export const SAIL = {
  tail: 175,
  head: 112,
  backwind: 48,
  accel: 120,
  driftTail: 0.28,
  driftHead: 0.55,
  tackCost: 0.75,
  tackCooldown: 320,
  laneRise: 34,
  warn: 2200,
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
  winds: { dir: number; str: number; ms: number }[];
  t0: number;
  wind: { dir: number; str: number };
  aground: boolean;
  lastTack: number;
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
    winds: course.winds.map(([dir, str, sec]) => ({
      dir,
      str,
      ms: sec * 1000,
    })),
    t0: 0,
    wind: { dir: course.winds[0][0], str: course.winds[0][1] },
    aground: false,
    lastTack: 0,
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
    .setAngle(sl.wind.dir * 3 + Math.sin(s.clock * 1.3) * 1.5)
    .setDepth(8.4 - sl.lane * 4);
  sl.wake
    .setPosition(sl.x - 40 * k, y + 4)
    .setScale(k * Math.min(1.4, Math.abs(sl.v) / 120), k)
    .setAlpha(sl.v > 20 ? 0.8 : 0)
    .setDepth(8.5 - sl.lane * 4);
}
/** Wind at this moment of the voyage, and the next one coming. */
function windAt(sl: Sail, t: number) {
  const total = sl.winds.reduce((a, w) => a + w.ms, 0);
  let m = t % total;
  for (let i = 0; i < sl.winds.length; i++) {
    if (m < sl.winds[i].ms)
      return {
        now: sl.winds[i],
        next: sl.winds[(i + 1) % sl.winds.length],
        left: sl.winds[i].ms - m,
      };
    m -= sl.winds[i].ms;
  }
  return { now: sl.winds[0], next: sl.winds[1], left: 1e9 };
}
function drawVane(
  s: Alley,
  sl: Sail,
  time: number,
  left: number,
  nextDir: number,
) {
  const cam = s.cameras.main;
  sl.vane.setPosition(cam.width / 2, 58).setVisible(sl.on);
  const g = sl.vaneArrow,
    d = sl.wind.dir,
    warn = left < SAIL.warn && nextDir !== d;
  const flash = warn && Math.floor(time / 160) % 2 === 0;
  g.clear();
  g.fillStyle(0x1b140f, 0.6).fillRoundedRect(-92, -4, 184, 44, 8);
  const col = flash ? 0xffd84a : d > 0 ? 0x8ae8a0 : 0xff9a7a;
  const n = Math.round(sl.wind.str * 3);
  for (let i = 0; i < n; i++) {
    const x = (i - (n - 1) / 2) * 18;
    g.fillStyle(col, 1).fillTriangle(
      x + d * 8,
      10,
      x - d * 6,
      2,
      x - d * 6,
      18,
    );
  }
  sl.vaneText
    .setY(20)
    .setText(
      warn
        ? 'الريح هتلف! جهّز نفسك'
        : d > 0
          ? 'الريح ورا ضهرك: دوس يمين وشدّ الشراع'
          : 'الريح في وشّك: لِف من شط لشط (نط)',
    );
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
    sound.fx('creak');
    toast(
      'إنت الريّس! يمين = شدّ الشراع · شمال = فرملة · نطّ = لِف الشراع وروح للشط التاني',
    );
  }
}

/** One frame of sailing; the hero rides the deck. */
export function sailStep(
  s: Alley,
  sl: Sail,
  time: number,
  dt: number,
  input: { dir: number; tack: boolean },
) {
  const w = windAt(sl, time - sl.t0);
  if (w.now.dir !== sl.wind.dir || w.now.str !== sl.wind.str) {
    if (w.now.dir !== sl.wind.dir) {
      sound.fx('wind');
      toast(
        w.now.dir > 0
          ? 'الريح لفّت ورا ضهرك! جري'
          : 'الريح لفّت في وشّك! لِف من شط لشط',
      );
    }
    sl.wind = { dir: w.now.dir, str: w.now.str };
  }
  const head = sl.wind.dir < 0;
  if (input.tack && time - sl.lastTack > SAIL.tackCooldown) {
    sl.lastTack = time;
    sl.tack = -sl.tack;
    sl.v *= SAIL.tackCost;
    if (sl.aground) {
      sl.aground = false;
      sl.v = Math.max(sl.v, 30);
    }
    sound.fx('creak');
    s.burst(sl.x, laneY(sl, sl.lane) - 40, 0xf4ece0, 3);
  }
  let target: number;
  const haul = input.dir > 0,
    brake = input.dir < 0;
  if (sl.aground) target = 0;
  else if (head)
    target = haul
      ? SAIL.head * sl.wind.str
      : brake
        ? -60
        : -SAIL.backwind * sl.wind.str;
  else target = haul ? SAIL.tail * sl.wind.str : brake ? 10 : 70 * sl.wind.str;
  const acc = brake ? SAIL.accel * 1.8 : SAIL.accel;
  sl.v += Phaser.Math.Clamp(target - sl.v, -acc * dt, acc * dt);
  // Across the river: hauled close to a headwind it reaches fast.
  if (!sl.aground) {
    const drift = head && haul ? SAIL.driftHead : SAIL.driftTail;
    sl.lane += sl.tack * drift * dt;
    if (sl.lane >= 1 || sl.lane <= 0) {
      sl.lane = Phaser.Math.Clamp(sl.lane, 0, 1);
      if (head && haul) {
        sl.aground = true;
        sl.v = 0;
        sound.fx('bump');
        s.burst(sl.x + 30, laneY(sl, sl.lane), 0x8ab060, 6);
        s.hint(
          'aground',
          'الفلوكة شحطت في البوص! نطّ عشان تلفّ الشراع وتروح للشط التاني',
        );
      }
    }
  }
  sl.x += sl.v * dt;
  if (sl.x < sl.startX) {
    sl.x = sl.startX;
    sl.v = Math.max(0, sl.v);
  }
  // Granite rocks own one side of the channel.
  for (const r of sl.rocks)
    if (Math.abs(sl.x - r.x) < 38 && near(sl.lane, r.lane)) {
      sl.x = r.x - 38 * Math.sign(r.x - sl.x || 1);
      sl.v = -40;
      sound.fx('bump');
      s.cameras.main.shake(100, 0.004);
      s.burst(r.x, laneY(sl, r.lane) - 8, 0xf4fbff, 6);
      s.hint(
        'rock',
        r.lane < 0.5
          ? 'صخرة على الشط القريب! نطّ عشان تلف وتعدّي من فوق'
          : 'صخرة على الشط البعيد! عدّي من تحت ناحيتك',
      );
    }
  // Crocodiles: bubbles, then up and snapping, then back under.
  for (const c of sl.crocs) stepCroc(s, sl, c, time);
  for (const c of sl.coins)
    if (c.img.active && Math.abs(c.x - sl.x) < 26 && near(sl.lane, c.lane)) {
      s.collect();
      s.burst(c.img.x, c.img.y, 0xffe08a, 4);
      c.img.destroy();
    }
  drawBoat(s, sl);
  drawVane(s, sl, time, w.left, w.next.dir);
  // The hero rides the deck, a little aft of the mast.
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
