// World 3 (دمياط) runtime: conveyor belts, swinging chandeliers and harbour
// lanterns, toppling furniture stacks, bobbing boats on the tide, climbable
// nets and the sea itself. Kept apart from the scene so game.ts stays
// readable; every function takes the scene.
import Phaser from 'phaser';
import type { Alley } from './game';
import { TILE } from './level-data';
import { BELT, BELT_SPEED, BOAT, LAMP, NET, STACK, tideY } from './level-parse';
import { sound } from './audio';

type Img = Phaser.Physics.Arcade.Image;
type Body = Phaser.Physics.Arcade.Body;
const body = (s: Phaser.GameObjects.GameObject) =>
  (s as Phaser.Physics.Arcade.Image).body as Body;

export interface Stack {
  img: Phaser.GameObjects.Image;
  wall: Phaser.GameObjects.Zone;
  col: number;
  row: number;
  state: 'stand' | 'wobble' | 'fallen';
  since: number;
}
export interface SeaRun {
  x0: number;
  x1: number;
  top: number;
  bottom: number;
  surface: Phaser.GameObjects.TileSprite;
  fill: Phaser.GameObjects.Rectangle;
  /** Shared with the scene's swimming code (a canal with no current). */
  canal: { x0: number; x1: number; top: number; bottom: number; dir: number };
}
export interface W3 {
  belts: { tile: Phaser.GameObjects.TileSprite; dir: number }[];
  stacks: Stack[];
  seas: SeaRun[];
  nets: Phaser.Geom.Rectangle[];
  ropes: Phaser.GameObjects.Graphics;
  hanging: boolean;
  netCooldown: number;
}
export const emptyW3 = (): W3 | undefined => undefined;

/** Lamp platform top-left target and velocity at clock t. */
export function lampPose(
  px: number,
  py: number,
  phase: number,
  t: number,
): { x: number; y: number; vx: number; vy: number } {
  const w = LAMP.speed * t + phase,
    a = LAMP.amp * Math.sin(w),
    da = LAMP.amp * LAMP.speed * Math.cos(w),
    R = LAMP.length * TILE;
  return {
    x: px + Math.sin(a) * R - (LAMP.width * TILE) / 2,
    y: py + Math.cos(a) * R,
    vx: Math.cos(a) * R * da,
    vy: -Math.sin(a) * R * da,
  };
}
/** Boat deck top-left target at clock t for a boat on `sea`. */
export function seaLevel(s: Alley, sea: { top: number }) {
  return tideY(sea, s.L.meta.tide, s.clock);
}

export function buildDamietta(s: Alley) {
  const L = s.L;
  const any =
    L.belts.length ||
    L.lamps.length ||
    L.stacks.length ||
    L.boats.length ||
    L.nets.length ||
    L.seas.length;
  if (!any) return undefined;
  const harbor = L.meta.theme === 'harbor';
  const w3: W3 = {
    belts: [],
    stacks: [],
    seas: [],
    nets: [],
    ropes: s.add.graphics().setDepth(1),
    hanging: false,
    netCooldown: 0,
  };
  // Belts: terrain bodies plus a scrolling slatted surface and arrows.
  for (const b of L.belts) {
    const x0 = b.c0 * TILE,
      w = (b.c1 - b.c0 + 1) * TILE;
    s.terrain.add(s.add.zone(x0 + w / 2, b.row * TILE + 12, w, TILE));
    const tile = s.add
      .tileSprite(x0, b.row * TILE - 2, w, 8, 'belt-top')
      .setOrigin(0)
      .setDepth(2);
    for (let x = x0 + 18; x < x0 + w - 6; x += 72)
      s.add
        .image(x, b.row * TILE + 8, 'belt-arrow')
        .setDepth(2)
        .setFlipX(b.dir < 0)
        .setAlpha(0.8);
    w3.belts.push({ tile, dir: b.dir });
  }
  // Stacks: a solid 1×3 tower of furniture; stand on it and it topples.
  for (const p of L.stacks) {
    const img = s.add
      .image((p.col + 1) * TILE, (p.row + 1) * TILE, 'stack')
      .setOrigin(1, 1)
      .setDepth(3);
    const wall = s.add.zone(
      p.col * TILE + 12,
      (p.row - STACK.height + 1) * TILE + (STACK.height * TILE) / 2,
      TILE,
      STACK.height * TILE,
    );
    s.terrain.add(wall);
    w3.stacks.push({
      img,
      wall,
      col: p.col,
      row: p.row,
      state: 'stand',
      since: 0,
    });
  }
  // Lamps: pendulum platforms hung from a carved beam.
  L.lamps.forEach((p, i) => {
    s.add.image(p.x, p.y - 10, 'lamp-hook').setDepth(2);
    const img = s.movers.create(
      0,
      0,
      harbor ? 'ship-lantern' : 'chandelier',
    ) as Img;
    img.setOrigin(0, 0).setDepth(3);
    const b = body(img);
    b.setSize(LAMP.width * TILE, 10).setOffset(4, 0);
    b.checkCollision.down = false;
    b.checkCollision.left = false;
    b.checkCollision.right = false;
    const phase = i * 1.3;
    const q = lampPose(p.x, p.y, phase, s.clock);
    img.setPosition(q.x - 4, q.y);
    b.reset(q.x - 4, q.y);
    s.moverList.push({
      img,
      axis: 'x',
      min: 0,
      max: 0,
      speed: 0,
      carry: true,
      lamp: { px: p.x, py: p.y, phase },
    });
  });
  // The sea: a tide-driven surface over the painted sand floor.
  for (const k of L.seas) {
    const surface = s.add
      .tileSprite(k.x0, k.top, k.x1 - k.x0, 10, 'sea-top')
      .setOrigin(0)
      .setDepth(11);
    const fill = s.add
      .rectangle(k.x0, k.top, k.x1 - k.x0, k.bottom - k.top, 0x1e5a80, 0.72)
      .setOrigin(0)
      .setDepth(11);
    const canal = { x0: k.x0, x1: k.x1, top: k.top, bottom: k.bottom, dir: 0 };
    w3.seas.push({
      x0: k.x0,
      x1: k.x1,
      top: k.top,
      bottom: k.bottom,
      surface,
      fill,
      canal,
    });
    s.canals.push({ ...canal, surface, sea: true } as never);
  }
  // Boats drift between their markers and ride the tide.
  for (const bt of L.boats) {
    const sea = L.seas.find((k) => bt.a.col >= k.c0 && bt.a.col <= k.c1)!;
    const img = s.movers.create(0, 0, 'boat') as Img;
    img.setOrigin(0, 0).setDepth(10);
    const b = body(img);
    b.setSize(BOAT.width * TILE, 10).setOffset(6, 9);
    b.checkCollision.down = false;
    b.checkCollision.left = false;
    b.checkCollision.right = false;
    const min = bt.a.col * TILE,
      max = bt.endCol * TILE;
    const y = seaLevel(s, sea) - TILE - 9;
    img.setPosition(min - 6, y);
    b.reset(min - 6, y);
    s.moverList.push({
      img,
      axis: 'x',
      min: min - 6,
      max: max - 6,
      speed: BOAT.speed,
      carry: true,
      boat: { sea, seed: bt.a.col },
    });
    b.setVelocityX(BOAT.speed);
  }
  // Nets: one climbable rectangle per vertical run of net cells.
  const seen = new Set<string>();
  for (const n of L.nets) {
    if (seen.has(n.col + ',' + n.row)) continue;
    let r1 = n.row;
    while (L.at(n.col, r1 + 1) === '%') r1++;
    for (let r = n.row; r <= r1; r++) seen.add(n.col + ',' + r);
    w3.nets.push(
      new Phaser.Geom.Rectangle(
        n.col * TILE - 4,
        n.row * TILE,
        TILE + 8,
        (r1 - n.row + 1) * TILE,
      ),
    );
  }
  return w3;
}

/** Per-frame world motion: belts scroll, tide, lamps, boats and ropes. */
export function updateDamiettaWorld(s: Alley, time: number, dt: number) {
  const w3 = s.w3;
  if (!w3) return;
  for (const b of w3.belts) b.tile.tilePositionX -= b.dir * BELT_SPEED * dt;
  for (const k of w3.seas) {
    const y = seaLevel(s, k);
    k.surface.y = y - 4;
    k.surface.tilePositionX = s.clock * 18;
    k.fill.y = y + 4;
    k.fill.height = Math.max(0, k.bottom - y - 4);
    const c = s.canals.find((q) => q.x0 === k.x0 && q.surface === k.surface);
    if (c) c.top = y;
  }
  w3.ropes.clear();
  for (const m of s.moverList) {
    const b = body(m.img);
    if (m.lamp) {
      const q = lampPose(m.lamp.px, m.lamp.py, m.lamp.phase, s.clock);
      b.setVelocity(
        q.vx + Phaser.Math.Clamp((q.x - 4 - m.img.x) * 8, -200, 200),
        q.vy + Phaser.Math.Clamp((q.y - m.img.y) * 8, -200, 200),
      );
      // Ropes from the beam to both ends of the platform.
      const cx = m.img.x + 4 + (LAMP.width * TILE) / 2;
      w3.ropes.lineStyle(2, 0x3a2414, 1);
      w3.ropes.lineBetween(m.lamp.px, m.lamp.py - 6, m.img.x + 6, m.img.y + 1);
      w3.ropes.lineBetween(m.lamp.px, m.lamp.py - 6, m.img.x + 50, m.img.y + 1);
      w3.ropes.lineStyle(1, 0xc8a878, 1);
      w3.ropes.lineBetween(m.lamp.px, m.lamp.py - 6, cx, m.img.y);
      m.img.rotation = Math.atan2(cx - m.lamp.px, m.img.y - m.lamp.py) * -0.3;
    } else if (m.boat) {
      const ty =
        seaLevel(s, m.boat.sea) -
        TILE -
        9 +
        Math.sin(s.clock * 2.2 + m.boat.seed) * BOAT.bob;
      if (m.img.x <= m.min && b.velocity.x <= 0) b.setVelocityX(m.speed);
      if (m.img.x >= m.max && b.velocity.x >= 0) b.setVelocityX(-m.speed);
      b.setVelocityY(Phaser.Math.Clamp((ty - m.img.y) * 6, -120, 120));
      m.img.rotation = Math.sin(s.clock * 1.7 + m.boat.seed) * 0.035;
    }
  }
  // Toppling furniture.
  for (const st of w3.stacks) {
    if (st.state !== 'stand') continue;
    const hb = body(s.hero),
      top = (st.row - STACK.height + 1) * TILE;
    const on =
      s.mode === 'play' &&
      Math.abs(hb.bottom - top) < 3 &&
      hb.right > st.col * TILE + 2 &&
      hb.left < (st.col + 1) * TILE - 2;
    if (!on) {
      st.since = 0;
      continue;
    }
    if (!st.since) {
      st.since = time;
      sound.fx('creak');
      s.hint('stack', 'العفش بيتهز! هيقع ويعمل كوبري');
      s.tweens.add({
        targets: st.img,
        angle: { from: -3, to: 3 },
        yoyo: true,
        repeat: 3,
        duration: STACK.delay / 8,
      });
    }
    if (time - st.since > STACK.delay) topple(s, st);
  }
}

export function topple(s: Alley, st: Stack) {
  if (st.state !== 'stand') return;
  st.state = 'wobble';
  s.terrain.remove(st.wall, true, true);
  sound.fx('creak');
  s.tweens.killTweensOf(st.img);
  st.img.angle = 0;
  // The bridge is solid as soon as the stack starts to tip, so nothing can
  // fall through the gap it is about to cover.
  const bridge = s.add.zone(
    (st.col + 1) * TILE + (STACK.bridge * TILE) / 2,
    st.row * TILE + 12,
    STACK.bridge * TILE,
    TILE,
  );
  s.terrain.add(bridge);
  s.tweens.add({
    targets: st.img,
    angle: 90,
    duration: 420,
    ease: 'Quad.in',
    onComplete: () => {
      st.state = 'fallen';
      sound.fx('topple');
      s.cameras.main.shake(120, 0.006);
      s.burst((st.col + 2.5) * TILE, (st.row + 1) * TILE, 0xc8924e, 10);
    },
  });
}

/** Push from a belt underfoot (px/s). */
export function beltPush(under: string, grounded: boolean) {
  return grounded && under in BELT ? BELT[under] * BELT_SPEED : 0;
}

/** Net climbing. Returns true while the hero hangs on a net (the caller
 * then skips normal walking and jumping). */
export function updateNet(
  s: Alley,
  time: number,
  input: { dir: number; jump: boolean; jumpPressed: boolean; down: boolean },
  grounded: boolean,
) {
  const w3 = s.w3;
  if (!w3 || !w3.nets.length) return false;
  const hb = body(s.hero);
  const net = w3.nets.find(
    (r) =>
      hb.center.x > r.x + 2 &&
      hb.center.x < r.right - 2 &&
      hb.bottom > r.y + 4 &&
      hb.top < r.bottom - 2,
  );
  const grab =
    !!net &&
    !s.swimming &&
    time > w3.netCooldown &&
    (w3.hanging || input.jump || (!grounded && hb.velocity.y > -120));
  if (!grab) {
    if (w3.hanging) {
      w3.hanging = false;
      hb.setAllowGravity(true);
    }
    return false;
  }
  if (!w3.hanging) {
    w3.hanging = true;
    s.hint('net', 'الشبكة بتتسلق! اطلع بالنطّ، وانزل لتحت، ونطّ من فوقها');
  }
  hb.setAllowGravity(false);
  const atTop = hb.bottom <= net.y + 10;
  if ((input.jump && atTop) || (input.jumpPressed && input.dir)) {
    // Hop off: up and over at the top, or sideways off the mesh.
    w3.hanging = false;
    w3.netCooldown = time + 260;
    hb.setAllowGravity(true);
    s.hero.setVelocity(input.dir * 160, -NET.hop);
    sound.fx('jump');
    return false;
  }
  if (grounded && !input.jump) {
    w3.hanging = false;
    hb.setAllowGravity(true);
    return false;
  }
  const vy = input.jump ? -NET.climb : input.down ? NET.climb : 0;
  s.hero.setVelocity(input.dir * 70, vy);
  if (input.dir) s.facing = input.dir;
  return true;
}
