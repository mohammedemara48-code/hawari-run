// World 5 (الأقصر) runtime: sand slides, hot-air balloons that rise and
// sink (and sink faster under you), feluccas on the Nile current, torches
// that burn out, rotating stone doors worked by levers, crushing pillars on
// a beat, sand pouring from cracked ceilings, the World 5 creatures and the
// final boss «الكبش الحارس». Kept apart from the scene; every function
// takes the scene.
import Phaser from 'phaser';
import type { Alley } from './game';
import { TILE } from './level-data';
import {
  BALLOON,
  DOOR,
  SAND,
  SANDFALL,
  SLIDE,
  pillarState,
} from './level-parse';
import { isW5 } from './world5-art';
import { sound } from './audio';
import { toast } from './ui';

type Img = Phaser.Physics.Arcade.Image;
type Sprite = Phaser.Physics.Arcade.Sprite;
type Body = Phaser.Physics.Arcade.Body;
type SBody = Phaser.Physics.Arcade.StaticBody;
const body = (s: Phaser.GameObjects.GameObject) =>
  (s as Phaser.Physics.Arcade.Image).body as Body;

export interface Door {
  col: number;
  x: number;
  y0: number;
  y1: number;
  zone: Phaser.GameObjects.Zone;
  blocks: Phaser.GameObjects.Image[];
  lever?: { img: Phaser.GameObjects.Image; x: number; y: number };
  open: boolean;
  until: number;
  lastTick: number;
}
export interface Pillar {
  col: number;
  x: number;
  top: number;
  rest: number;
  floor: number;
  head: Phaser.GameObjects.Image;
  shaft: Phaser.GameObjects.TileSprite;
  /** Inside the boss court: still until the guardian's third phase. */
  arena: boolean;
  state: string;
}
export interface SandTrap {
  x: number;
  y: number;
  next: number;
  pourAt: number;
}
export interface W5 {
  doors: Door[];
  pillars: Pillar[];
  sands: SandTrap[];
  sails: { img: Phaser.GameObjects.Image; boat: Img }[];
  /** Extra darkness over the level (the boss's last phase). */
  darkTarget: number;
  /** The last sand slide stood on, so its push carries over each step. */
  slide: { dir: number; at: number };
}

export function buildLuxor(s: Alley): W5 | undefined {
  const L = s.L;
  if (!isW5(L.meta.theme)) return undefined;
  const w5: W5 = {
    doors: [],
    pillars: [],
    sands: [],
    sails: [],
    darkTarget: 0,
    slide: { dir: 0, at: -1e9 },
  };
  // Rotating doors: a stack of stone blocks on a pivot, solid until their
  // lever is pulled.
  for (const d of L.doors) {
    const x = d.col * TILE,
      y0 = d.row0 * TILE,
      y1 = (d.row1 + 1) * TILE;
    const zone = s.add.zone(x + TILE / 2, (y0 + y1) / 2, TILE, y1 - y0);
    s.terrain.add(zone);
    const blocks: Phaser.GameObjects.Image[] = [];
    for (let y = y0; y < y1; y += TILE)
      blocks.push(
        s.add
          .image(x + TILE / 2, y + TILE / 2, 'door-stone')
          .setDepth(3)
          .setFlipX(((y / TILE) | 0) % 2 === 1),
      );
    s.add
      .image(x + TILE / 2, y0 - 2, 'door-hinge')
      .setOrigin(0.5, 0.5)
      .setDepth(4);
    const lever = d.lever
      ? {
          img: s.add
            .image(d.lever.x, (d.lever.row + 1) * TILE, 'lever-off')
            .setOrigin(0.5, 1)
            .setDepth(3),
          x: d.lever.x,
          y: (d.lever.row + 1) * TILE,
        }
      : undefined;
    w5.doors.push({
      col: d.col,
      x: x + TILE / 2,
      y0,
      y1,
      zone,
      blocks,
      lever,
      open: false,
      until: 0,
      lastTick: 0,
    });
  }
  // Crushing pillars: a shaft from the ceiling down to a carved head.
  const arenaCol = L.boss ? L.boss.col - 17 : 1e9;
  for (const p of L.pillars) {
    let r = p.row - 1;
    while (r >= 0 && L.at(p.col, r) !== '#') r--;
    const top = (r + 1) * TILE;
    let f = p.row + 1;
    while (f < L.rows && L.at(p.col, f) !== '#' && L.at(p.col, f) !== 'X') f++;
    const rest = (p.row + 1) * TILE;
    const shaft = s.add
      .tileSprite(p.col * TILE, top, TILE, rest - top, 'pillar-shaft')
      .setOrigin(0)
      .setDepth(6);
    const head = s.add
      .image(p.x, rest, 'pillar-head')
      .setOrigin(0.5, 1)
      .setDepth(7);
    w5.pillars.push({
      col: p.col,
      x: p.x,
      top,
      rest,
      floor: f * TILE,
      head,
      shaft,
      arena: p.col >= arenaCol,
      state: 'up',
    });
  }
  for (const p of L.sands) {
    s.add
      .image(p.x, p.row * TILE, 'crack')
      .setOrigin(0.5, 0)
      .setDepth(2);
    w5.sands.push({ x: p.x, y: (p.row + 1) * TILE, next: 0, pourAt: 0 });
  }
  // Balloons: wicker baskets under painted envelopes.
  L.balloons.forEach((p, i) => {
    const img = s.movers.create(
      p.col * TILE,
      p.row * TILE,
      'balloon-basket',
    ) as Img;
    img.setOrigin(0, 0).setDepth(3);
    const b = body(img);
    b.setSize(BALLOON.width * TILE, 10).setOffset(0, 0);
    b.checkCollision.down = false;
    b.checkCollision.left = false;
    b.checkCollision.right = false;
    b.reset(img.x, img.y);
    const env = s.add
      .image(img.x + TILE, img.y + 2, 'balloon-envelope')
      .setOrigin(0.5, 1)
      .setDepth(2);
    s.moverList.push({
      img,
      axis: 'y',
      min: (p.row - BALLOON.range) * TILE,
      max: p.row * TILE,
      speed: 0,
      balloon: { base: p.row * TILE, phase: i * 2.1, sink: 0, env },
    });
  });
  // Feluccas: the harbour boats re-dressed with a lateen sail.
  for (const m of s.moverList)
    if (m.boat) {
      m.img.setTexture('felucca');
      w5.sails.push({
        img: s.add.image(0, 0, 'felucca-sail').setOrigin(0.5, 1).setDepth(9),
        boat: m.img,
      });
    }
  // The Nile: a greener river that flows against you.
  if (L.meta.current && s.w3)
    for (const k of s.w3.seas) {
      k.fill.setFillStyle(0x2a5a5e, 0.78);
      k.surface.setTint(0xd8f0e0);
      const c = s.canals.find((q) => q.surface === k.surface);
      if (c) c.dir = Math.sign(L.meta.current);
    }
  return w5;
}

/** Per-frame World 5 motion: balloons, sails, doors, pillars, sand, torches. */
export function updateLuxorWorld(s: Alley, time: number, dt: number) {
  const w5 = s.w5;
  if (!w5) return;
  const play = s.mode === 'play';
  const hb = body(s.hero);
  // Balloons: drift up and down on a slow cycle, sinking under a rider.
  for (const m of s.moverList) {
    const bl = m.balloon;
    if (!bl) continue;
    const b = body(m.img);
    const ridden =
      play &&
      Math.abs(hb.bottom - b.top) < 4 &&
      hb.right > b.left + 2 &&
      hb.left < b.right - 2;
    bl.sink = ridden
      ? Math.min(BALLOON.sinkMax * TILE, bl.sink + BALLOON.sink * dt)
      : Math.max(0, bl.sink - 18 * dt);
    const a = (2 * Math.PI * s.clock) / BALLOON.period + bl.phase;
    const target =
      bl.base - BALLOON.range * TILE * (0.5 - 0.5 * Math.cos(a)) + bl.sink;
    b.setVelocity(0, Phaser.Math.Clamp((target - m.img.y) * 5, -90, 90));
    bl.env.setPosition(
      m.img.x + TILE + Math.sin(s.clock * 0.9 + bl.phase) * 1.5,
      m.img.y + 2,
    );
  }
  for (const sl of w5.sails)
    sl.img
      .setPosition(sl.boat.x + 42, sl.boat.y + 9)
      .setAngle(Math.sin(s.clock * 1.3 + sl.boat.x / 90) * 2);
  // Doors and levers.
  for (const d of w5.doors) {
    if (
      play &&
      d.lever &&
      !d.open &&
      Math.abs(s.hero.x - d.lever.x) < 20 &&
      Math.abs(hb.bottom - d.lever.y) < 30
    )
      openDoor(s, d, time);
    if (d.open) {
      const left = d.until - time;
      if (left < DOOR.warn * 1000) {
        for (const b of d.blocks) b.x = d.x + Math.sin(time / 30) * 1.2;
        if (time - d.lastTick > (left < 700 ? 180 : 380)) {
          d.lastTick = time;
          if (Math.abs(s.hero.x - d.x) < 500) sound.fx('tick');
        }
      }
      if (left <= 0) closeDoor(s, d);
    }
  }
  // Crushing pillars.
  const ram = s.bossKind === 'ram' && s.bossState.active;
  const armed = ram && !s.bossState.defeated && s.bossPhase() >= 3;
  for (const p of w5.pillars) {
    const st =
      p.arena && !armed
        ? { state: 'up' as const, k: 0 }
        : pillarState(p.col, s.clock);
    const travel = p.floor - p.rest;
    const off =
      st.state === 'fall'
        ? st.k * st.k
        : st.state === 'down'
          ? 1
          : st.state === 'rise'
            ? 1 - st.k
            : 0;
    const bottom = p.rest + off * travel;
    p.head.setPosition(
      p.x + (st.state === 'warn' ? Math.sin(time / 25) * 1.5 : 0),
      bottom,
    );
    p.shaft.height = Math.max(4, bottom - 28 - p.top);
    if (st.state !== p.state) {
      if (st.state === 'down' && Math.abs(p.x - s.hero.x) < 480) {
        sound.fx('crush');
        s.cameras.main.shake(90, 0.004);
        s.burst(p.x, p.floor - 2, 0xd8aa6e, 8);
      }
      p.state = st.state;
    }
    if (st.state === 'warn' && Math.floor(time / 90) % 3 === 0)
      s.burst(p.x + (Math.random() - 0.5) * 20, p.top + 4, 0xc8a070, 1);
    if (
      play &&
      (st.state === 'fall' || st.state === 'down' || st.state === 'rise') &&
      hb.right > p.x - 12 &&
      hb.left < p.x + 12 &&
      hb.top < bottom &&
      hb.bottom > bottom - 30
    ) {
      s.hint('pillar', 'العمود بيهرس! استنى لما يطلع وعدّي على طول');
      const before = s.hurtUntil;
      s.hurt();
      if (s.mode === 'play' && s.hurtUntil !== before)
        s.hero.setVelocity(s.hero.x < p.x ? -240 : 240, -220);
      else if (s.mode === 'play') s.hero.x += s.hero.x < p.x ? -3 : 3;
    }
  }
  // Ceiling cracks pour sand on whoever walks beneath.
  for (const t of w5.sands) {
    if (
      play &&
      !t.pourAt &&
      time > t.next &&
      Math.abs(s.hero.x - t.x) < 30 &&
      s.hero.y > t.y
    ) {
      t.pourAt = time + SANDFALL.warn;
      sound.fx('sand');
    }
    if (t.pourAt && time < t.pourAt && Math.floor(time / 50) % 2 === 0) {
      const g = s.add
        .image(t.x + (Math.random() - 0.5) * 8, t.y, 'sand-grain')
        .setDepth(8);
      s.tweens.add({
        targets: g,
        y: g.y + 60,
        alpha: 0,
        duration: 420,
        onComplete: () => g.destroy(),
      });
    }
    if (t.pourAt && time >= t.pourAt) {
      t.pourAt = 0;
      t.next = time + SANDFALL.cooldown;
      dropSand(s, t.x, t.y + 4);
    }
  }
  // Torches burn down: flicker, then go out and the ghost ledges fade.
  const burn = s.L.meta.torchBurn;
  if (burn)
    for (const l of s.lanterns) {
      if (!l.lit || !l.until) continue;
      const left = l.until - time;
      if (left < 2500)
        l.glow.setAlpha(
          Math.floor(time / (left < 900 ? 60 : 120)) % 2 ? 0.25 : 0.85,
        );
      if (left <= 0) {
        l.lit = false;
        l.until = 0;
        s.tweens.killTweensOf(l.glow);
        l.img.setTexture(s.skin('lantern-off'));
        l.glow.setAlpha(0.15).setScale(0.5);
        if (Math.abs(l.img.x - s.hero.x) < 500) sound.fx('hiss');
        const radius = s.L.meta.lanternRadius ?? 0;
        for (const g of s.ghosts.getChildren() as Sprite[]) {
          if (!g.getData('lit')) continue;
          const col = Math.floor(g.x / TILE),
            row = Math.floor((g.y + 6) / TILE);
          const held = s.lanterns.some(
            (o) => o.lit && Math.hypot(col - o.col, row - o.row) <= radius,
          );
          if (held) continue;
          g.setData('lit', false);
          (g.getData('hint') as Phaser.GameObjects.Image).setVisible(true);
          s.tweens.add({ targets: g, alpha: 0, duration: 200 });
        }
        s.hint('torch-out', 'المشعل طفى! المّسه تاني يولّع… والسلالم بتختفي');
      }
    }
  // Darkness creeping in (the guardian's last phase).
  s.darkBoost += (w5.darkTarget - s.darkBoost) * Math.min(1, dt * 1.5);
}

function openDoor(s: Alley, d: Door, time: number) {
  d.open = true;
  d.until = time + DOOR.open * 1000;
  d.lever!.img.setTexture('lever-on');
  (d.zone.body as SBody).enable = false;
  sound.fx('rumble');
  s.cameras.main.shake(160, 0.003);
  s.burst(d.x, d.y1 - 4, 0xd8aa6e, 10);
  // The slab turns on its pivot until it's edge-on.
  s.tweens.add({
    targets: d.blocks,
    scaleX: 0.16,
    duration: 420,
    ease: 'Quad.inOut',
  });
  for (const b of d.blocks) b.setTint(0x9a8060);
  s.hint('lever', 'الباب الحجر لفّ! عدّي بسرعة قبل ما يقفل تاني');
}
function closeDoor(s: Alley, d: Door) {
  d.open = false;
  d.lever?.img.setTexture('lever-off');
  sound.fx('rumble');
  for (const b of d.blocks) b.clearTint().setX(d.x);
  s.tweens.add({
    targets: d.blocks,
    scaleX: 1,
    duration: 260,
    ease: 'Quad.in',
  });
  const zb = d.zone.body as SBody;
  zb.enable = true;
  // Caught in the doorway: shoved out (and hurt).
  const hb = body(s.hero);
  if (
    s.mode === 'play' &&
    hb.right > d.x - 12 &&
    hb.left < d.x + 12 &&
    hb.bottom > d.y0 &&
    hb.top < d.y1
  ) {
    const dir = s.hero.x < d.x ? -1 : 1;
    s.hero.x = d.x + dir * (12 + hb.width / 2 + 2);
    s.hurt();
  }
}

/** Falling sand: a clump that bursts on whatever it hits. */
export function dropSand(s: Alley, x: number, y: number) {
  const c = s.hazards.create(x, y, 'sand-clump') as Sprite;
  c.setData('kind', 'sand').setDepth(9);
  body(c).setSize(10, 10).setMaxVelocity(0, 460);
  return c;
}

/** Ground control on sand slides: they carry you and give little grip. */
export function luxorMove(
  s: Alley,
  grounded: boolean,
  under: string,
): { push: number; sand: boolean } {
  const w5 = s.w5;
  if (!w5) return { push: 0, sand: false };
  const now = s.time.now;
  if (grounded && !(under in SLIDE)) {
    // Either foot on the sand counts, so you can't perch on a step's lip.
    const hb = body(s.hero),
      row = Math.floor((hb.bottom + 2) / TILE);
    for (const x of [hb.left + 2, hb.right - 2]) {
      const ch = s.L.at(Math.floor(x / TILE), row);
      if (ch in SLIDE) under = ch;
    }
  }
  if (!grounded || !(under in SLIDE)) {
    // Tumbling down from one step to the next keeps the slide's momentum.
    if (!grounded && now - w5.slide.at < 260)
      return { push: w5.slide.dir * SAND.push, sand: true };
    return { push: 0, sand: false };
  }
  w5.slide = { dir: SLIDE[under], at: now };
  s.hint('slide', 'الرمل بيزحلقك! نطّ بدري قبل ما يرميك');
  if (Math.floor(s.time.now / 90) % 2 === 0)
    s.burst(s.hero.x, body(s.hero).bottom, 0xe8c080, 1);
  return { push: SLIDE[under] * SAND.push, sand: true };
}

/* ───────────── Creatures ───────────── */
const MUMMY_BODY: [number, number, number, number] = [18, 32, 7, 6];
/** World 5 enemy behaviour; returns true when it handled the enemy. */
export function updateLuxorEnemy(s: Alley, e: Sprite, time: number) {
  const kind = e.getData('kind') as string;
  if (!['scarab', 'mummy', 'cobra', 'devil'].includes(kind)) return false;
  const eb = body(e),
    home = e.getData('home') as { x: number; y: number },
    seed = e.getData('seed') as number,
    state = e.getData('state') as string,
    dx = s.hero.x - e.x,
    dy = s.hero.y - e.y;
  const frame = (n: number) => e.setTexture(kind + n);
  const edge = (d: number) =>
    eb.blocked.down &&
    !s.standable(
      Math.floor((e.x + d * 14) / TILE),
      Math.floor((eb.bottom + 2) / TILE),
    );
  if (kind === 'devil') {
    // Wanders along its row, spinning; flings whoever touches it.
    const tx = home.x + Math.sin(time / 1300 + seed) * 84,
      ty = home.y + Math.sin(time / 280 + seed) * 4;
    eb.setVelocity((tx - e.x) * 3, (ty - e.y) * 3);
    frame(Math.floor(time / 70) % 4);
    if (Math.floor(time / 140) % 3 === 0)
      s.burst(e.x + (Math.random() - 0.5) * 30, e.y + 20, 0xd8aa6e, 1);
    return true;
  }
  if (kind === 'cobra') {
    // Coiled and swaying; spreads its hood, then spits at you.
    eb.setVelocityX(0);
    e.setFlipX(dx > 0);
    if (state === 'rear') {
      frame(2);
      e.setTint(Math.floor(time / 70) % 2 ? 0xffe0a0 : 0xffffff);
      if (time > e.getData('until')) {
        e.clearTint();
        spit(s, e);
        e.setData('state', 'spit').setData('until', time + 260);
      }
    } else if (state === 'spit') {
      frame(3);
      if (time > e.getData('until'))
        e.setData('state', 'walk').setData('until', time + 1700);
    } else {
      frame(Math.floor(time / 380 + seed) % 2);
      if (
        Math.abs(dx) < 240 &&
        Math.abs(dy) < 130 &&
        time > e.getData('until')
      ) {
        e.setData('state', 'rear').setData('until', time + 480);
        sound.fx('hiss');
      }
    }
    return true;
  }
  if (kind === 'mummy') {
    if (state === 'pile') {
      frame(2);
      eb.setVelocityX(0);
      if (time > e.getData('until')) {
        e.setData('state', 'rise').setData('until', time + 650);
        sound.fx('creak');
      }
      return true;
    }
    if (state === 'rise') {
      frame(3);
      eb.setVelocityX(0);
      if (time > e.getData('until')) {
        const [w, h, ox, oy] = MUMMY_BODY;
        const bottom = eb.bottom;
        eb.setSize(w, h).setOffset(ox, oy);
        e.y = bottom - (oy + h) + e.height / 2;
        e.setData('state', 'walk');
      }
      return true;
    }
    // Shuffles toward you when you're near, otherwise paces.
    let d = (e.getData('dir') as number) || -1;
    if (Math.abs(dx) < 200 && Math.abs(dy) < 60) d = Math.sign(dx) || d;
    if (eb.blocked.left) d = 1;
    if (eb.blocked.right) d = -1;
    if (edge(d)) d = -d;
    e.setData('dir', d)
      .setVelocityX(d * (Math.abs(dx) < 200 ? 44 : 30))
      .setFlipX(d > 0);
    frame(Math.floor(time / 260) % 2);
    return true;
  }
  // Scarab: scuttles, and hops at you when you're close.
  let d = (e.getData('dir') as number) || -1;
  if (state === 'hop') {
    frame(2);
    if (eb.blocked.down && time > e.getData('until')) {
      e.setData('state', 'walk').setData('until', time + 1300);
    }
    return true;
  }
  if (eb.blocked.left) d = 1;
  if (eb.blocked.right) d = -1;
  if (edge(d)) d = -d;
  if (
    eb.blocked.down &&
    Math.abs(dx) < 140 &&
    Math.abs(dy) < 50 &&
    time > e.getData('until')
  ) {
    d = Math.sign(dx) || d;
    e.setData('state', 'hop').setData('until', time + 200);
    e.setVelocity(d * 170, -330);
    sound.fx('buzz');
  } else e.setVelocityX(d * 58);
  e.setData('dir', d).setFlipX(d > 0);
  frame(Math.floor(time / 90) % 2);
  return true;
}
function spit(s: Alley, e: Sprite) {
  const g = 500;
  const dx = s.hero.x - e.x,
    dy = s.hero.y - (e.y - 10);
  const t = Phaser.Math.Clamp(Math.abs(dx) / 230, 0.45, 1.1);
  const v = s.hazards.create(
    e.x + Math.sign(dx) * 10,
    e.y - 10,
    'venom',
  ) as Sprite;
  body(v)
    .setSize(8, 8)
    .setGravityY(g - 1100);
  v.setVelocity(
    Phaser.Math.Clamp(dx / t, -300, 300),
    Phaser.Math.Clamp((dy - 0.5 * g * t * t) / t, -420, 120),
  )
    .setData('kind', 'venom')
    .setDepth(9);
  sound.fx('spit');
}

/** World 5 contact rules; returns true when handled. */
export function luxorContact(s: Alley, e: Sprite, fromTop: boolean) {
  const kind = e.getData('kind'),
    state = e.getData('state');
  if (kind === 'devil') {
    if (fromTop) {
      // Riding the whirlwind's top throws you high (no harm done).
      s.hero.setVelocityY(-640);
      s.hint('devil-top', 'الزوبعة طيّرتك لفوق!');
      sound.fx('wind');
      return true;
    }
    s.hint(
      'devil',
      'زوبعة التراب ما تنداسش من الجنب! نطّ من فوقها أو ارميها بالشطة',
    );
    const before = s.hurtUntil;
    s.hurt();
    if (s.mode === 'play' && s.hurtUntil !== before)
      s.hero.setVelocity(s.hero.x < e.x ? -280 : 280, -420);
    return true;
  }
  if (kind === 'mummy') {
    if (state === 'pile') {
      if (fromTop) {
        e.setData('until', s.time.now + 2600);
        s.hero.setVelocityY(-300);
        sound.fx('stomp');
      } else s.hero.setVelocityX(s.hero.x < e.x ? -90 : 90);
      return true;
    }
    if (fromTop && state !== 'rise') {
      // Collapses into a heap of bandages… and pulls itself back up.
      e.setData('state', 'pile').setData('until', s.time.now + 2600);
      e.setVelocityX(0);
      const eb = body(e);
      const bottom = eb.bottom;
      eb.setSize(22, 8).setOffset(5, 30);
      e.y = bottom - 38 + e.height / 2;
      s.score += 100;
      s.popText(e.x, e.y - 10, '+١٠٠');
      s.burst(e.x, e.y + 10, 0xd8ccb0, 8);
      sound.fx('stomp');
      s.hero.setVelocityY(s.jumpWas ? -420 : -300);
      s.hint(
        'mummy',
        'المومياء بتتلم وتقوم تاني! عدّي بسرعة… أو ولّعها بالشطة',
      );
      return true;
    }
  }
  return false;
}

/* ───────────── Boss «الكبش الحارس» ───────────── */
/** walk → rear (tell) → slam (shockwaves; sand falls from phase 2) or,
 * from phase 3, a charge across the court → bowed (his brow gem is open:
 * stomp it) → walk. Phase 3 wakes the court's crushing pillars; phase 4
 * puts out the moon. */
export function updateRamBoss(s: Alley, time: number) {
  const boss = s.boss!,
    st = s.bossState,
    bb = body(boss);
  const phase = s.bossPhase();
  const grounded = bb.blocked.down;
  const over = time > st.until;
  const toHero = Math.sign(s.hero.x - boss.x) || 1;
  const [lo, hi] = s.bossRange();
  const tex = (pose: string) => boss.setTexture('boss5-' + pose);
  if (!['charge', 'hurt'].includes(st.state)) boss.setFlipX(toHero > 0);
  const P = (a: number[]) => a[phase - 1];
  switch (st.state) {
    case 'walk':
      tex('idle' + (Math.floor(time / 260) % 2));
      boss.setVelocityX(toHero * P([55, 65, 80, 95]));
      if (Math.floor(time / 300) % 2 === 0 && grounded)
        s.burst(boss.x + 30, bb.bottom, 0xd8aa6e, 1);
      if (over) {
        boss.setVelocityX(0);
        st.volley++;
        boss.setData(
          'next',
          phase >= 3 && st.volley % 2 === 0 ? 'charge' : 'slam',
        );
        sound.fx('roar');
        st.state = 'rear';
        st.until = time + P([820, 700, 600, 520]);
      }
      break;
    case 'rear':
      tex('rear');
      boss.setVelocityX(0);
      boss.setTint(Math.floor(time / 80) % 2 ? 0x9af0e8 : 0xffffff);
      if (over) {
        boss.clearTint();
        if (boss.getData('next') === 'charge') {
          boss.setData('dir', toHero);
          st.state = 'charge';
          st.until = time + 2600;
          sound.fx('rumble');
        } else {
          slam(s, boss, phase, time);
          st.state = 'bowed';
          st.until = time + P([1500, 1300, 1150, 1000]);
        }
      }
      break;
    case 'charge': {
      tex('charge');
      const d = (boss.getData('dir') as number) || 1;
      boss.setFlipX(d > 0);
      boss.setVelocityX(d * P([300, 320, 340, 380]));
      if (Math.floor(time / 60) % 2 === 0)
        s.burst(boss.x - d * 50, bb.bottom, 0xd8aa6e, 2);
      const wall =
        bb.blocked.left ||
        bb.blocked.right ||
        (d < 0 && boss.x <= lo + 2) ||
        (d > 0 && boss.x >= hi - 2);
      if (wall || over) {
        boss.setVelocityX(0);
        sound.fx('shock');
        s.cameras.main.shake(260, 0.014);
        s.burst(boss.x + d * 60, boss.y, 0xd8aa6e, 14);
        sandRain(s, phase === 4 ? 5 : 4);
        st.state = 'bowed';
        st.until = time + P([1500, 1300, 1150, 1000]);
      }
      break;
    }
    case 'bowed':
      tex('bowed');
      boss.setVelocityX(0);
      if (Math.floor(time / 110) % 2 === 0)
        s.burst(boss.x - (boss.flipX ? -1 : 1) * 40, boss.y - 4, 0x9af0e8, 1);
      if (over) {
        st.state = 'walk';
        st.until = time + P([1500, 1250, 1050, 900]);
      }
      break;
    case 'hurt':
      tex('hurt');
      if (over && grounded) {
        boss.setVelocityX(0);
        st.state = 'walk';
        st.until = time + 700;
      }
      break;
  }
  s.clampBoss();
}
function slam(s: Alley, boss: Sprite, phase: number, time: number) {
  const bb = body(boss);
  sound.fx('shock');
  s.cameras.main.shake(240, 0.013);
  for (const d of [-1, 1]) {
    const w = s.hazards.create(
      boss.x + d * 60,
      bb.bottom - 9,
      'shock',
    ) as Sprite;
    body(w).setAllowGravity(false).setSize(26, 14).setOffset(4, 4);
    w.setVelocityX(d * [230, 250, 270, 300][phase - 1])
      .setData('kind', 'shock')
      .setData('born', time)
      .setDepth(9)
      .setFlipX(d < 0);
  }
  if (phase >= 2) sandRain(s, phase >= 4 ? 5 : 3);
}
/** Sand shaken off the architrave over (and around) the hero. */
export function sandRain(s: Alley, n: number) {
  const st = s.bossState;
  for (let i = 0; i < n; i++) {
    const x = Phaser.Math.Clamp(
      s.hero.x + (i - (n - 1) / 2) * 64 + (Math.random() - 0.5) * 24,
      st.arenaX + 30,
      s.L.width - 40,
    );
    // Staggered so the clumps patter down one after another under the
    // architrave (they would burst at once inside the roof stones).
    s.time.delayedCall(i * 110, () => {
      if (s.mode === 'play' && !st.defeated) dropSand(s, x, 2 * TILE + 6);
    });
  }
}
/** Phase changes: helpers join, the pillars wake, the moon goes out. */
export function ramPhase(s: Alley, phase: number) {
  const boss = s.boss!,
    st = s.bossState;
  const kinds = ['', '', 'scarab', 'mummy', 'devil'];
  for (const dx of [-150, 150])
    s.enemy(
      Phaser.Math.Clamp(boss.x + dx, st.arenaX + 60, s.L.width - 60),
      phase === 4 ? 9 * TILE : 10 * TILE,
      kinds[phase],
    );
  toast(
    phase === 2
      ? 'الكبش الحارس اتعصّب! لما يخبط الأرض الرمل بيقع من السقف'
      : phase === 3
        ? 'الأعمدة صحيت! وبقى بيجري عليك بقرونه… خلّيه يخبط في الحيطة'
        : 'آخر نَفَس! القمر غاب… ولّع المشاعل وخلّي عينك على عينيه',
  );
  if (phase === 4 && s.w5) s.w5.darkTarget = 0.62;
}
/** «الكبش الحارس» contact: only his bowed brow can be stomped. */
export function ramContact(s: Alley, fromAbove: boolean) {
  const boss = s.boss!,
    st = s.bossState;
  if (st.state === 'bowed' && fromAbove) {
    s.hero.setVelocityY(-450);
    if (s.time.now >= st.invuln) s.bossDamage(1);
    return;
  }
  if (st.state === 'bowed' || st.state === 'hurt') {
    s.hero.setVelocityX(s.hero.x < boss.x ? -140 : 140);
    return;
  }
  if (fromAbove && st.state !== 'charge') {
    s.hero.setVelocity(s.hero.x < boss.x ? -220 : 220, -420);
    s.hint(
      'ram-back',
      'ده حجر! استنى لما يخبط الأرض ويوطّي راسه… واتنطّ على الجوهرة',
    );
    return;
  }
  if (s.time.now < s.invincible)
    s.hero.setVelocityX(s.hero.x < boss.x ? -260 : 260);
  else {
    s.hurt();
    if (s.mode === 'play')
      s.hero.setVelocity(s.hero.x < boss.x ? -280 : 280, -300);
  }
}
