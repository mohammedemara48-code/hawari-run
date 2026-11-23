// Port Said's signature: the port's cranes. Instead of walking and
// throwing, you cross the free-market and the container yard on them:
//   • crane hooks slide along overhead rails — jump up to grab one, ride
//     it over the gap, jump to let go (you keep the hook's speed);
//   • containers slung from cranes carry you sideways, and hoisted ones
//     rise and sink in place;
//   • in the chase level the crane's runaway electromagnet sweeps along
//     behind you — fall behind it and you're gone;
//   • on the quay the port's gantry hook carries a container: hang from it
//     and press ↓ to drop the container on the captain's crane cab.
import Phaser from 'phaser';
import type { Alley } from './game';
import { TILE } from './level-data';
import { CRANE } from './level-parse';
import { PHYSICS } from './levels';
import { sound } from './audio';
import { touch } from './ui';
import { makePortSaidProps } from './world7-art';

type Img = Phaser.GameObjects.Image;
type Body = Phaser.Physics.Arcade.Body;
const body = (o: Phaser.GameObjects.GameObject) =>
  (o as Phaser.Physics.Arcade.Image).body as Body;

/** How far the hook hangs below its trolley, and the magnet's numbers. */
export const HOOK = {
  drop: 58,
  release: 340,
  payloadReload: 1400,
  gantrySpeed: 260,
};
export const MAGNET = { lead: 420, far: 560, catchUp: 130, reach: 26 };

export interface Hook {
  x0: number;
  x1: number;
  /** The hook point (where the hands go). */
  x: number;
  y: number;
  dir: number;
  vx: number;
  pauseUntil: number;
  trolley: Img;
  hook: Img;
  cable: Phaser.GameObjects.Rectangle;
  /** The quay's gantry hook carries a container to drop on the boss. */
  payload?: Img;
  loadAt?: number;
  controls?: Phaser.GameObjects.Text;
}
interface Falling {
  img: Img;
  vy: number;
}
export interface Crane {
  hooks: Hook[];
  hang: Hook | null;
  cooldown: number;
  cables: { img: Img; g: Phaser.GameObjects.Graphics }[];
  falling: Falling[];
  magnet?: {
    img: Img;
    glow: Phaser.GameObjects.Rectangle;
    cable: Phaser.GameObjects.Rectangle;
    x: number;
    on: boolean;
    done: boolean;
    from: number;
    to: number;
    speed: number;
  };
}

export function buildCrane(s: Alley): Crane | undefined {
  const L = s.L;
  if (!L.hooks.length && !L.slings.length && !L.hoists.length) return;
  makePortSaidProps(s);
  const c: Crane = {
    hooks: [],
    hang: null,
    cooldown: 0,
    cables: [],
    falling: [],
  };
  const boss = L.meta.bossKind === 'captain';
  for (const h of L.hooks) {
    const x0 = h.a.col * TILE + 12,
      x1 = h.endCol * TILE + 12,
      y = (h.a.row + 1) * TILE,
      railY = y - HOOK.drop - 8;
    s.add
      .tileSprite((x0 + x1) / 2, railY, x1 - x0 + 60, 12, 'crane-rail')
      .setDepth(1);
    // Lattice legs at both ends, down to the ground below.
    const legs = s.add.graphics().setDepth(-1);
    for (const lx of [x0 - 30, x1 + 30]) {
      legs.fillStyle(0x1b140f, 1).fillRect(lx - 4, railY, 8, L.height - railY);
      legs.fillStyle(0xc89020, 1).fillRect(lx - 2, railY, 4, L.height - railY);
      for (let yy = railY + 12; yy < L.height; yy += 26)
        legs
          .lineStyle(2, 0x1b140f, 0.8)
          .lineBetween(lx - 4, yy, lx + 4, yy + 13);
    }
    const trolley = s.add.image(x0, railY + 6, 'crane-trolley').setDepth(2);
    const cable = s.add
      .rectangle(x0, railY + 10, 2, HOOK.drop - 10, 0x1b140f)
      .setOrigin(0.5, 0)
      .setDepth(2);
    const hook = s.add
      .image(x0, y, 'crane-hook')
      .setOrigin(0.5, 0.2)
      .setDepth(7);
    const k: Hook = {
      x0,
      x1,
      x: x0,
      y,
      dir: 1,
      vx: 0,
      pauseUntil: 0,
      trolley,
      hook,
      cable,
    };
    if (boss) {
      k.payload = s.add
        .image(x0, y + 24, 'container3b')
        .setDepth(6)
        .setScale(0.9);
      k.loadAt = 0;
      k.controls = s.add
        .text(x0, y - 35, '← → تحريك   ↓ إسقاط   نط: سيب', {
          fontFamily: 'sans-serif',
          fontSize: '12px',
          color: '#ffffff',
          backgroundColor: '#201a12',
          padding: { x: 6, y: 4 },
        })
        .setOrigin(0.5, 1)
        .setDepth(15);
    }
    c.hooks.push(k);
  }
  const addBox = (
    col: number,
    row: number,
    axis: 'x' | 'y',
    min: number,
    max: number,
    speed: number,
    key: string,
  ) => {
    const img = s.movers.create(
      col * TILE,
      row * TILE,
      key,
    ) as Phaser.Physics.Arcade.Image;
    img.setOrigin(0, 0).setDepth(2);
    const b = body(img);
    b.setSize(CRANE.width * TILE, 10).setOffset(0, 0);
    b.reset(img.x, img.y);
    b.checkCollision.down = false;
    b.checkCollision.left = false;
    b.checkCollision.right = false;
    if (axis === 'x') img.setVelocityX(speed);
    else img.setVelocityY(-speed);
    s.moverList.push({ img, axis, min, max, speed, carry: true });
    c.cables.push({ img, g: s.add.graphics().setDepth(1) });
  };
  for (const k of L.slings)
    addBox(
      k.a.col,
      k.a.row,
      'x',
      k.a.col * TILE,
      k.endCol * TILE,
      CRANE.slingSpeed,
      'container3',
    );
  for (const h of L.hoists)
    addBox(
      h.a.col,
      h.a.row,
      'y',
      h.topRow * TILE,
      h.a.row * TILE,
      CRANE.hoistSpeed,
      'container3b',
    );
  const ch = L.meta.chase;
  if (ch) {
    const img = s.add.image(-400, 0, 'magnet').setDepth(12);
    const glow = s.add
      .rectangle(-400, L.height / 2, 900, L.height, 0xd83a3a, 0.16)
      .setOrigin(1, 0.5)
      .setDepth(11);
    const cable = s.add
      .rectangle(-400, 0, 4, 10, 0x3a3a42)
      .setOrigin(0.5, 0)
      .setDepth(11);
    c.magnet = {
      img,
      glow,
      cable,
      x: -400,
      on: false,
      done: false,
      from: ch.fromCol * TILE,
      to: ch.toCol * TILE,
      speed: ch.speed,
    };
  }
  return c;
}

/** Every frame: hooks slide and pause, cables follow their containers,
 * dropped containers fall, and the magnet sweeps along. */
export function craneIdle(s: Alley, c: Crane, time: number, dt: number) {
  for (const k of c.hooks) {
    if (k.payload) {
      // The boss gantry is a player-operated crane, not a long forced ride.
      // Park at the boarding platform whenever the player lets go.
      const dir =
        c.hang === k
          ? Number(s.keys.RIGHT.isDown || s.keys.D.isDown || touch.right) -
            Number(s.keys.LEFT.isDown || s.keys.A.isDown || touch.left)
          : k.x > k.x0 + 1
            ? -1
            : 0;
      k.vx = dir * HOOK.gantrySpeed;
      const next = Phaser.Math.Clamp(k.x + k.vx * dt, k.x0, k.x1);
      if (next === k.x) k.vx = 0;
      k.x = next;
    } else if (time < k.pauseUntil) k.vx = 0;
    else {
      k.vx = k.dir * CRANE.hookSpeed;
      k.x += k.vx * dt;
      if ((k.dir > 0 && k.x >= k.x1) || (k.dir < 0 && k.x <= k.x0)) {
        k.x = Phaser.Math.Clamp(k.x, k.x0, k.x1);
        k.dir = -k.dir;
        k.pauseUntil = time + CRANE.hookPause;
      }
    }
    k.trolley.x = k.x;
    k.cable.x = k.x;
    k.hook.setPosition(k.x, k.y);
    k.hook.rotation = Math.sin(time / 260) * (k.vx ? 0.12 : 0.04);
    if (k.payload) {
      // Reload in place, without a full rail round trip.
      if (!k.payload.visible && k.loadAt && time > k.loadAt) {
        k.payload.setVisible(true);
        k.loadAt = 0;
        sound.fx('clack');
      }
      k.payload.setPosition(k.x, k.y + 30);
      k.controls
        ?.setPosition(k.x, k.y - 35)
        .setText(
          c.hang === k
            ? k.payload.visible
              ? '← → تحريك   ↓ إسقاط   نط: سيب'
              : 'جاري التحميل…   نط: سيب'
            : 'انط من المنصة للخطاف',
        );
    }
  }
  for (const { img, g } of c.cables) {
    const x = img.x + (CRANE.width * TILE) / 2;
    g.clear();
    g.lineStyle(2, 0x1b140f, 0.9);
    g.lineBetween(x - 22, img.y, x, img.y - 46);
    g.lineBetween(x + 22, img.y, x, img.y - 46);
    g.lineBetween(x, img.y - 46, x, img.y - 46 - 400);
  }
  for (const f of [...c.falling]) {
    f.vy = Math.min(f.vy + PHYSICS.gravity * 1.2 * dt, 620);
    f.img.y += f.vy * dt;
    const boss = s.boss;
    const fb = f.img.getBounds();
    let gone = false;
    if (boss?.active && s.bossState.hp > 0) {
      const bb = body(boss);
      if (
        fb.right > bb.left &&
        fb.left < bb.right &&
        fb.bottom > bb.top &&
        fb.top < bb.bottom
      ) {
        s.burst(f.img.x, fb.bottom, 0x3a9a5a, 12);
        s.burst(f.img.x, fb.bottom, 0xc8b898, 10);
        if (time >= s.bossState.invuln) {
          s.bossState.state = 'hurt';
          s.bossState.until = time + 900;
          s.bossDamage(2);
        }
        gone = true;
      }
    }
    const col = Math.floor(f.img.x / TILE),
      row = Math.floor((fb.bottom + 2) / TILE);
    if (!gone && (s.standable(col, row) || f.img.y > s.L.height + 60)) {
      sound.fx('crush');
      s.cameras.main.shake(140, 0.007);
      s.burst(f.img.x, fb.bottom, 0xc8b898, 10);
      gone = true;
    }
    if (gone) {
      f.img.destroy();
      c.falling.splice(c.falling.indexOf(f), 1);
    }
  }
  const m = c.magnet;
  if (m && !m.done && s.mode === 'play') {
    const hx = s.hero.x;
    if (!m.on && hx > m.from) {
      m.on = true;
      m.x = hx - MAGNET.lead;
      sound.fx('roar');
      s.hint(
        'magnet',
        'مغناطيس الونش فلت وجاي وراك! اجري… ومتستناش كتير عند الخطاطيف',
      );
    }
    if (m.on) {
      const gap = hx - m.x;
      m.x += (gap > MAGNET.far ? MAGNET.catchUp : m.speed) * dt;
      if (m.x >= m.to) {
        m.done = true;
        sound.fx('shock');
        s.tweens.add({
          targets: [m.img, m.glow, m.cable],
          alpha: 0,
          duration: 700,
        });
        s.hint(
          'magnet-done',
          'المغناطيس اتشبك في الونش ووقف! خلاص… كمّل على مهلك',
        );
      } else if (hx < m.x + MAGNET.reach) {
        s.lastHurtBy = 'magnet';
        s.die();
      }
    }
  }
  if (m) {
    const y = Phaser.Math.Clamp(
      s.cameras.main.scrollY + 150,
      60,
      s.L.height - 80,
    );
    m.img.setPosition(m.x - 20, y + Math.sin(time / 300) * 6);
    m.img.rotation = Math.sin(time / 180) * 0.05;
    m.glow.setPosition(
      m.x + 10,
      s.cameras.main.scrollY + s.cameras.main.height / 2,
    );
    m.cable.setPosition(m.x - 18, 0).setSize(4, Math.max(4, m.img.y - 40));
    if (m.on && !m.done && Math.floor(time / 90) % 3 === 0)
      s.burst(m.x + 10, m.img.y + Phaser.Math.Between(-30, 40), 0x9ad0ff, 1);
  }
}

/** Airborne: grab a hook when the hands pass it. */
export function tryHook(s: Alley, c: Crane, time: number) {
  if (time < c.cooldown) return false;
  const b = body(s.hero);
  for (const k of c.hooks) {
    if (
      Math.abs(s.hero.x - k.x) < CRANE.grab &&
      Math.abs(b.top - (k.y + 6)) < CRANE.grab
    ) {
      c.hang = k;
      b.setAllowGravity(false);
      sound.fx('zip');
      s.hint(
        k.payload ? 'gantry' : 'hook',
        k.payload
          ? 'إنت المتحكم في الونش: يمين وشمال تحرّكه، سيب الاتجاه يقف، ↓ يرمي الحاوية، ونطّ يسيب الخطاف'
          : 'اتشعبطت في الخطّاف! استنى لما يعدّي الفجوة… واضغط نطّ تسيب',
      );
      return true;
    }
  }
  return false;
}

/** Hanging from a hook: ride it; jump lets go with its speed, ↓ drops the
 * payload (or lets go when there is none). */
export function hangStep(
  s: Alley,
  c: Crane,
  time: number,
  ctl: { dir: number; jumpPressed: boolean; downPressed: boolean },
) {
  const k = c.hang!,
    b = body(s.hero);
  b.setVelocity(k.vx + (k.x - s.hero.x) * 14, (k.y + 6 - b.top) * 14);
  if (ctl.dir) s.facing = ctl.dir;
  s.hero.setFlipX(s.facing < 0);
  if (ctl.downPressed && k.payload?.visible) {
    k.payload.setVisible(false);
    k.loadAt = time + HOOK.payloadReload;
    const img = s.add
      .image(k.x, k.y + 30, 'container3b')
      .setDepth(9)
      .setScale(0.9);
    c.falling.push({ img, vy: 60 });
    sound.fx('fire');
    return;
  }
  if (ctl.jumpPressed) {
    letGo(s, c, time);
    b.setVelocity(k.vx * 0.9 + ctl.dir * 90, -PHYSICS.jump * 0.85);
    sound.fx('jump');
  } else if (
    (ctl.downPressed && !k.payload?.visible) ||
    b.blocked.left ||
    b.blocked.right
  ) {
    letGo(s, c, time);
    b.setVelocity(k.vx * 0.9, 0);
  }
}
export function letGo(s: Alley, c: Crane, time: number) {
  if (!c.hang) return;
  c.hang = null;
  c.cooldown = time + HOOK.release;
  body(s.hero).setAllowGravity(true);
}
