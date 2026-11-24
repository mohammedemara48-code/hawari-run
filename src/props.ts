import Phaser from 'phaser';
import type { Alley } from './game';
import { buildSail } from './sail';
import { buildCrane } from './crane';
import { buildSiwa } from './world8';
import { isW8 } from './world8-art';
import { isW5 } from './world5-art';
import { buildLuxor } from './world5';
import { buildAlexandria } from './world4';
import { buildDamietta } from './world3';
import { hash } from './world-art';
import { TILE } from './level-data';
import { DONKEY, MOVERS, SAQIA, SOLID } from './level-parse';
import { setThirst } from './ui';
import { body, oneWay, oneWayBelow, randomZone } from './game-shared';
import type { Img, SBody, Sprite, Mover } from './game-shared';

export function buildProps(scene: Alley) {
  const L = scene.L,
    theme = L.meta.theme;
  for (const p of L.bricks) scene.block(p.x, p.y, 'brick');
  for (const p of L.armories) scene.block(p.x, p.y, 'armory');
  for (const b of L.boxes) {
    const s = scene.block(b.x, b.y, 'box', b.content);
    if (b.hidden) {
      s.setAlpha(0).setData('hidden', true);
      oneWayBelow(s.body as SBody);
    }
  }
  if (L.tank) {
    const t = scene.blocks.create(
      L.tank.x + 12,
      L.tank.y + 12,
      'tank',
    ) as Sprite;
    t.setDisplaySize(48, 48).refreshBody();
    t.setData('kind', 'tank').setDepth(3);
  }
  for (const c of L.coins) scene.coin(c.x, c.y);
  for (const p of L.pickups) {
    const w = scene.weapon();
    const item = scene.items.create(p.x, p.y + 2, w.item) as Sprite;
    item.setData('kind', w.item).setData('settled', true).setDepth(6);
    body(item).setAllowGravity(false).setSize(16, 16);
  }
  for (const p of L.lanterns) {
    const img = scene.add
      .image(p.x, p.y - 2, scene.skin('lantern-off'))
      .setDepth(3);
    const glow = scene.add
      .image(p.x, p.y + 4, 'glow')
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(51)
      .setAlpha(0.15)
      .setScale(0.5);
    scene.lanterns.push({ img, glow, lit: false, col: p.col, row: p.row });
  }
  for (const g of L.ghosts) {
    const hint = scene.add
      .image(g.x, g.y - 6, scene.skin('ghost-hint'))
      .setDepth(2)
      .setAlpha(0.35);
    const s = scene.ghosts.create(g.x, g.y - 6, scene.skin('ghost')) as Sprite;
    s.setAlpha(0).setDepth(2).setData('lit', false).setData('hint', hint);
    const sb = s.body as SBody;
    sb.setSize(24, 8).setOffset(0, 0);
    oneWay(sb);
  }
  // Awnings: trampolines on poles.
  for (const [r, a, b] of scene.runs('A')) {
    const style = 'awning' + Math.floor(hash(a, r) * 3);
    for (let c = a; c <= b; c++) {
      const s = scene.bouncers.create(
        c * TILE + 12,
        r * TILE + 8,
        style,
      ) as Sprite;
      s.setDepth(3).setData('kind', 'awning');
      const sb = s.body as SBody;
      sb.setSize(24, 8).setOffset(0, 0);
      oneWay(sb);
    }
    for (const c of [a, b]) {
      let rr = r + 1;
      while (rr < L.rows && !SOLID.has(L.at(c, rr)) && rr - r < 6) rr++;
      if (rr - r < 6)
        scene.add
          .tileSprite(
            c * TILE + (c === a ? 2 : 22),
            r * TILE + 10,
            4,
            (rr - r) * TILE - 10,
            'awning-pole',
          )
          .setOrigin(0.5, 0)
          .setDepth(1);
    }
  }
  for (const d of L.dishes) {
    const s = scene.bouncers.create(d.x, d.y, 'dish') as Sprite;
    s.setDepth(3).setData('kind', 'dish');
    const sb = s.body as SBody;
    sb.setSize(22, 8).setOffset(3, 0);
    oneWay(sb);
  }
  for (const x of L.crates) {
    const s = scene.crates.create(
      x.x,
      x.y,
      isW8(theme)
        ? 'shali-crack'
        : isW5(theme)
          ? theme === 'tomb'
            ? 'tomb-slab-crack'
            : 'slab-crack'
          : 'ccrate',
    ) as Sprite;
    s.setDepth(3).setData('home', { x: x.x, y: x.y });
  }
  for (const g of L.spikes) {
    const s = scene.hazards.create(g.x, g.y + 6, scene.skin('glass')) as Sprite;
    body(s)
      .setAllowGravity(false)
      .setImmovable(true)
      .setSize(20, 6)
      .setOffset(2, 6);
    s.setData('kind', 'glass');
  }
  const addMover = (
    p: { col: number; row: number },
    kind: 'cart' | 'plank' | 'lift',
  ) => {
    const m = MOVERS[kind];
    const img = scene.movers.create(
      p.col * TILE,
      p.row * TILE,
      kind === 'cart'
        ? 'vcart'
        : kind === 'plank' && theme === 'farm'
          ? 'log'
          : kind,
    ) as Img;
    img.setOrigin(0, 0).setDepth(kind === 'cart' ? 3 : 2);
    const b = body(img);
    if (kind === 'cart') {
      img.y = p.row * TILE - 8;
      b.setSize(72, 12).setOffset(0, 8);
    } else b.setSize(m.width * TILE, 10).setOffset(0, 0);
    b.reset(img.x, img.y);
    oneWay(b);
    const mover: Mover =
      kind === 'lift'
        ? {
            img,
            axis: 'y',
            min: (p.row - m.range) * TILE,
            max: p.row * TILE,
            speed: m.speed,
          }
        : {
            img,
            axis: 'x',
            min: p.col * TILE,
            max: (p.col + m.range) * TILE,
            speed: m.speed,
            carry: true,
            // Ferry pans wait at each bank, so boarding never needs luck,
            // and stop one tile short so the pan ends flush with the far
            // crust instead of sliding into it and pinning the rider.
            ...(isW8(theme) && kind === 'plank'
              ? { dwell: 1100, max: (p.col + m.range - 1) * TILE }
              : {}),
          };
    if (kind === 'lift') {
      let r = p.row - m.range - 1;
      while (r > 0 && !SOLID.has(L.at(p.col, r))) r--;
      mover.chainTop = (r + 1) * TILE;
      mover.chains = [6, 42].map((dx) =>
        scene.add
          .tileSprite(img.x + dx, mover.chainTop!, 4, 10, 'chain')
          .setOrigin(0.5, 0)
          .setDepth(1),
      );
    }
    if (mover.axis === 'x') img.setVelocityX(m.speed);
    else img.setVelocityY(-m.speed);
    if (kind === 'cart')
      mover.steam = scene.add
        .particles(0, 0, 'steam', {
          lifespan: 1200,
          speedY: { min: -30, max: -14 },
          speedX: { min: -6, max: 6 },
          scale: { start: 0.4, end: 1.3 },
          alpha: { start: 0.45, end: 0 },
          frequency: 160,
        })
        .setDepth(4);
    scene.moverList.push(mover);
  };
  L.carts.forEach((p) => addMover(p, 'cart'));
  L.planks.forEach((p) => addMover(p, 'plank'));
  L.lifts.forEach((p) => addMover(p, 'lift'));
  buildFarm(scene);
  scene.w3 = buildDamietta(scene);
  scene.w4 = buildAlexandria(scene);
  scene.w5 = buildLuxor(scene);
  scene.sail = buildSail(scene);
  scene.crane = buildCrane(scene);
  scene.siwa = buildSiwa(scene);
  if (!scene.siwa) setThirst(false);
  for (const e of L.enemies) scene.enemy(e.x, e.y, e.kind);
  if (L.boss) scene.makeBoss(L.boss.x, (L.boss.row + 1) * TILE);
  if (L.checkpoint)
    scene.flag = scene.add
      .image(
        L.checkpoint.x,
        (L.checkpoint.row + 1) * TILE,
        scene.checkpoint ? 'checkpoint-lit' : 'checkpoint-flag',
      )
      .setOrigin(0.3, 1)
      .setDepth(3);
  scene.exitDoor = scene.add
    .image(L.exit.x, (L.exit.row + 1) * TILE, 'exit-door')
    .setOrigin(0.5, 1)
    .setDepth(2);
  scene.add
    .image(L.exit.x, (L.exit.row + 1) * TILE - 72, 'glow')
    .setBlendMode(Phaser.BlendModes.ADD)
    .setDepth(51)
    .setScale(0.9)
    .setVisible(!L.boss)
    .setName('exit-glow');
  if (L.boss) scene.exitDoor.setVisible(false);
  if (L.secret) {
    scene.secret = scene.add
      .image(L.secret.x, L.secret.y, 'fanoos-gold')
      .setDepth(5);
    scene.tweens.add({
      targets: scene.secret,
      y: L.secret.y - 4,
      yoyo: true,
      repeat: -1,
      duration: 700,
      ease: 'Sine.inOut',
    });
    scene.secretGlow = scene.add
      .image(L.secret.x, L.secret.y, 'glow')
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(51)
      .setScale(0.6);
  }
  const w = L.meta.water;
  if (w) {
    const x0 = w.col0 * TILE,
      x1 = (w.col1 + 1) * TILE,
      y = w.fromRow * TILE;
    scene.water = {
      top: scene.add
        .tileSprite(x0, y, x1 - x0, 16, 'water')
        .setOrigin(0)
        .setDepth(11),
      fill: scene.add
        .rectangle(x0, y + 14, x1 - x0, L.height, 0x174f52, 0.92)
        .setOrigin(0)
        .setDepth(11),
      y,
      active: false,
      x0,
      x1,
      stop: w.toRow * TILE,
      speed: w.speed,
      trigger: w.triggerCol * TILE,
    };
  }
  // Parked foul carts with steam on the flat streets.
  if (theme === 'market' || theme === 'night') {
    const groundRow = L.rows - 2;
    for (let c = 6; c < L.cols - 6; c += 23) {
      const ok = [0, 1, 2].every(
        (k) =>
          L.at(c + k, groundRow) === '#' &&
          L.at(c + k, groundRow - 1) === '.' &&
          L.at(c + k, groundRow - 2) === '.',
      );
      if (!ok || hash(c, 4) < 0.3) continue;
      scene.add
        .image(c * TILE, groundRow * TILE, 'vcart')
        .setOrigin(0, 1)
        .setDepth(1);
      scene.add
        .particles(c * TILE + 53, groundRow * TILE - 40, 'steam', {
          lifespan: 1600,
          speedY: { min: -26, max: -12 },
          speedX: { min: -5, max: 8 },
          scale: { start: 0.4, end: 1.6 },
          alpha: { start: 0.4, end: 0 },
          frequency: 220,
        })
        .setDepth(2);
    }
  }
}
/** World 2 pieces: saqia wheels, the donkey cart and canal water. */
export function buildFarm(scene: Alley) {
  const L = scene.L;
  for (const w of L.saqias) {
    // Mud-brick post from the hub down to whatever is below it.
    let r = w.row + 1;
    while (r < L.rows && !SOLID.has(L.at(w.col, r))) r++;
    scene.add
      .image(w.x, w.y, 'saqia-post')
      .setOrigin(0.5, 0)
      .setDisplaySize(40, Math.max(40, r * TILE - w.y))
      .setDepth(-1);
    scene.wheels.push(scene.add.image(w.x, w.y, 'saqia-wheel').setDepth(1));
    for (let i = 0; i < SAQIA.buckets; i++) {
      const phase = (i / SAQIA.buckets) * Math.PI * 2;
      const img = scene.movers.create(0, 0, 'bucket') as Img;
      img.setOrigin(0, 0).setDepth(2);
      const b = body(img);
      b.setSize(SAQIA.width * TILE, 10).setOffset(0, 0);
      oneWay(b);
      const m: Mover = {
        img,
        axis: 'x',
        min: 0,
        max: 0,
        speed: 0,
        carry: true,
        saqia: { cx: w.x, cy: w.y, phase },
      };
      const [x, y] = saqiaPos(scene, m, scene.clock);
      img.setPosition(x, y);
      b.reset(x, y);
      scene.moverList.push(m);
    }
  }
  for (const d of isW8(L.meta.theme) ? [] : L.donkeys) {
    const img = scene.movers.create(0, 0, 'donkey0') as Img;
    img.setOrigin(0, 0).setDepth(3);
    const x = d.a.col * TILE,
      y = (d.a.row + 1) * TILE - 44;
    img.setPosition(x, y);
    const b = body(img);
    b.setSize(DONKEY.width * TILE + 4, 10).setOffset(0, 12);
    b.reset(x, y);
    oneWay(b);
    const max = (d.endCol - DONKEY.width + 1) * TILE;
    scene.moverList.push({
      img,
      axis: 'x',
      min: x,
      max,
      speed: 0,
      carry: true,
      donkey: { min: x, max, leftAt: -1e9, ridden: false },
    });
    // A plank causeway where the track crosses open ground.
    const g = scene.add.graphics().setDepth(-1);
    const ty = (d.a.row + 1) * TILE;
    for (let c = d.a.col; c <= d.endCol; c++) {
      if (SOLID.has(L.at(c, d.a.row + 1))) continue;
      g.fillStyle(0x2a1a10, 1).fillRect(c * TILE, ty - 2, TILE, 8);
      g.fillStyle(0x8a5e3a, 1).fillRect(c * TILE + 1, ty - 1, TILE - 3, 5);
      g.fillStyle(0x5a3a22, 1).fillRect(c * TILE + 10, ty + 6, 3, 30);
    }
  }
  for (const k of L.canals) {
    const surface = scene.add
      .tileSprite(k.x0, k.top - 4, k.x1 - k.x0, 12, 'canal-top')
      .setOrigin(0)
      .setDepth(11);
    scene.add
      .rectangle(
        k.x0,
        k.top + 8,
        k.x1 - k.x0,
        k.bottom - k.top - 8,
        0x2a6a5a,
        0.5,
      )
      .setOrigin(0)
      .setDepth(11);
    scene.add
      .particles(0, 0, 'streak', {
        lifespan: 1100,
        speedX: { min: 50 * k.dir, max: 90 * k.dir },
        alpha: { start: 0.55, end: 0 },
        scaleX: 0.6,
        frequency: 180,
        emitZone: randomZone(
          new Phaser.Geom.Rectangle(k.x0, k.top + 2, k.x1 - k.x0, 14),
        ),
      })
      .setDepth(12);
    scene.canals.push({ ...k, surface });
  }
}
export function saqiaPos(scene: Alley, m: Mover, t: number): [number, number] {
  const q = m.saqia!,
    a = q.phase + t * SAQIA.speed,
    R = SAQIA.radius * TILE;
  return [
    q.cx + Math.cos(a) * R - (SAQIA.width * TILE) / 2,
    q.cy + Math.sin(a) * R,
  ];
}
export function canalAt(scene: Alley, x: number, bottom: number) {
  return scene.canals.find(
    (k) => x > k.x0 && x < k.x1 && bottom > k.top + 4 && bottom < k.bottom + 30,
  );
}
