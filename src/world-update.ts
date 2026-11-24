import { updateLandmark } from './landmark-world';
import Phaser from 'phaser';
import { camelGroundY } from './camel-ground';
import type { Alley } from './game';
import { body } from './game-shared';
import type { Sprite } from './game-shared';
import { TILE } from './level-data';
import { DONKEY, SAQIA } from './level-parse';
import { sailIdle } from './sail';
import { craneIdle } from './crane';
import { updateDamiettaWorld } from './world3';
import { updateAlexWorld } from './world4';
import { updateLuxorWorld } from './world5';
import { updateSiwaWorld } from './world8';
import { sound } from './audio';
import { touch } from './ui';

export function fitView(scene: Alley) {
  const cam = scene.cameras.main;
  const w = scene.scale.gameSize.width,
    h = scene.scale.gameSize.height;
  cam.setSize(w, h);
  for (const l of scene.layers) l.setSize(w, 360);
  if (scene.dark) scene.dark.resize(w, h);
}
export function updateDarkness(scene: Alley) {
  const rt = scene.dark;
  if (!rt) return;
  const cam = scene.cameras.main,
    sx = cam.scrollX,
    sy = cam.scrollY;
  rt.clear();
  rt.fill(
    scene.L.meta.theme === 'tomb' ? 0x080402 : 0x05061a,
    Math.min(0.95, scene.L.meta.dark + scene.darkBoost),
  );
  const light = (x: number, y: number, r: number, a = 1) => {
    if (
      x + r < sx ||
      x - r > sx + cam.width ||
      y + r < sy ||
      y - r > sy + cam.height
    )
      return;
    rt.stamp('light', undefined, x - sx, y - sy, {
      scale: (r * 2) / 256,
      alpha: a,
      erase: true,
    });
  };
  light(
    scene.hero.x,
    scene.hero.y,
    (scene.L.meta.theme === 'tomb' ? 92 : 120) + Math.sin(scene.clock * 3) * 3,
  );
  const radius = (scene.L.meta.lanternRadius ?? 4) * TILE;
  for (const l of scene.lanterns)
    light(l.img.x, l.img.y, l.lit ? radius * 1.05 : 46, l.lit ? 1 : 0.7);
  if (scene.secret?.active) light(scene.secret.x, scene.secret.y, 60, 0.9);
  if (scene.exitDoor?.visible)
    light(scene.exitDoor.x, scene.exitDoor.y - 50, 110);
  if (scene.flag)
    light(scene.flag.x, scene.flag.y - 40, scene.checkpoint ? 120 : 50, 0.8);
  if (scene.water)
    light((scene.water.x0 + scene.water.x1) / 2, scene.water.y, 170, 0.7);
  if (scene.boss?.active && scene.bossState.active)
    light(scene.boss.x, scene.boss.y, scene.darkBoost > 0.2 ? 64 : 170);
  for (const s of scene.shots.getChildren() as Sprite[])
    light(s.x, s.y, 50, 0.9);
  for (const m of scene.moverList) light(m.img.x + 24, m.img.y, 60, 0.6);
  // Luxor: levers glow faintly and the stone doors catch the light, so the
  // puzzles can be read in the tomb's dark.
  if (scene.w5)
    for (const d of scene.w5.doors) {
      if (d.lever) light(d.lever.x, d.lever.y - 14, 46, 0.85);
      light(d.x, (d.y0 + d.y1) / 2, d.open ? 80 : 52, 0.7);
    }
  // Gameplay silhouettes stay readable in Cairo darkness, without lighting
  // ghost ledges or changing their separate lantern-distance collision rule.
  for (const obj of [
    ...scene.blocks.getChildren(),
    ...scene.coins.getChildren(),
    ...scene.enemies.getChildren(),
    ...scene.hazards.getChildren(),
  ]) {
    const item = obj as Sprite;
    if (item.active) light(item.x, item.y, 34, 0.65);
  }
  // Crushing pillars: the carved head shows faintly, brighter as it shudders.
  if (scene.w5)
    for (const p of scene.w5.pillars)
      light(
        p.head.x,
        p.head.y - 14,
        p.state === 'warn' ? 60 : 38,
        p.state === 'warn' ? 0.9 : 0.55,
      );
}
export function updateWorld(scene: Alley, time: number, dt: number) {
  const cam = scene.cameras.main;
  const maxY = Math.max(0, scene.L.height - cam.height);
  for (const l of scene.layers) {
    const f = l.getData('factor') as number,
      name = l.getData('name');
    if (name === 'near' || name === 'backdrop') {
      l.tilePositionX = cam.scrollX * f;
      l.y = 0;
    } else if (name === 'sky') {
      l.tilePositionX = cam.scrollX * f + scene.clock * 2;
      l.y = 0;
      l.setScale(1, Math.max(1, cam.height / 360));
    } else {
      l.tilePositionX = cam.scrollX * f;
      // Climbing lowers the skyline so the sky opens up above.
      l.y = cam.height - 360 + Math.min(320, (maxY - cam.scrollY) * f * 0.6);
    }
  }
  scene.ambient?.setPosition(
    cam.scrollX + cam.width / 2,
    cam.scrollY + (scene.L.meta.theme === 'sewer' ? 20 : cam.height / 2),
  );
  const shine = scene.skin(Math.floor(time / 140) % 10 < 2 ? 'box1' : 'box');
  const flare = Math.floor(time / 180) % 4 === 0 ? 'armory1' : 'armory';
  for (const obj of scene.blocks.getChildren() as Sprite[]) {
    const kind = obj.getData('kind');
    if (kind === 'box' && obj.texture.key !== shine) obj.setTexture(shine);
    else if (kind === 'armory' && obj.texture.key !== flare)
      obj.setTexture(flare);
  }
  for (const obj of scene.coins.getChildren() as Sprite[])
    obj.setTexture(
      scene.skin('coin' + (Math.floor(time / 100 + obj.getData('phase')) % 6)),
    );
  // Ground the camels before finding their riders. Carry the vertical step
  // too, so a descending dune cannot drop away from under the rider.
  for (const m of scene.moverList) {
    if (!m.camel) continue;
    const mb = body(m.img),
      hb = body(scene.hero);
    const riding =
      Math.abs(hb.bottom - mb.top) < 8 &&
      hb.velocity.y >= -5 &&
      hb.right > mb.left + 2 &&
      hb.left < mb.right - 2;
    const y = camelGroundY(scene.L.at, scene.L.rows, m.img.x, m.img.y);
    const dy = y - m.img.y;
    if (Math.abs(dy) < 0.01) continue;
    m.img.y = y;
    mb.position.y += dy;
    mb.prev.y += dy;
    mb.center.y += dy;
    if (riding) {
      scene.hero.y += dy;
      hb.position.y += dy;
      hb.prev.y += dy;
      hb.center.y += dy;
    }
  }
  // Ride carts and planks: carry the hero by the platform's own step.
  scene.riding = false;
  if (scene.mode === 'play' && !scene.zip && !scene.crane?.hang) {
    const hb = body(scene.hero);
    const on = scene.moverList.find((m) => {
      const mb = body(m.img);
      const slop = m.lamp || m.boat || m.axis === 'y' ? 8 : 3;
      return (
        m.carry &&
        Math.abs(hb.bottom - mb.top) < slop &&
        hb.right > mb.left + 2 &&
        hb.left < mb.right - 2
      );
    });
    const ob = on && body(on.img);
    scene.riding = !!(
      ob &&
      (on.lamp || on.boat || on.tram || on.camel || on.axis === 'y') &&
      hb.velocity.y >= Math.min(0, ob.velocity.y) - 5
    );
    if (ob && hb.velocity.y >= Math.min(0, ob.velocity.y) - 5) {
      scene.hero.x += ob.velocity.x * dt;
      // Swinging lamps and bobbing boats also drop away under you: stick.
      // Port Said's hoists need the same stick going up, or gravity
      // leaves you behind the rising container.
      if (on.lamp || on.boat || on.axis === 'y') {
        hb.velocity.y = ob.velocity.y;
        if (on.axis === 'y') scene.hero.y += ob.top - hb.bottom;
      }
    }
    for (const m of scene.moverList)
      if (m.donkey) {
        const ridden = on === m && hb.velocity.y >= 0;
        if (ridden && !m.donkey.ridden) sound.fx('cart');
        m.donkey.ridden = ridden;
        if (ridden) m.donkey.leftAt = time;
      }
  }
  for (const w of scene.wheels) w.rotation = scene.clock * SAQIA.speed;
  for (const k of scene.canals)
    k.surface.tilePositionX = -scene.clock * 30 * k.dir;
  for (const m of scene.moverList) {
    const b = body(m.img);
    if (m.lamp || m.boat || m.tram || m.balloon) continue;
    if (m.saqia) {
      // Follow the wheel: the rim's own velocity plus a gentle pull back
      // onto the rim, so buckets glide instead of jittering.
      const a = m.saqia.phase + scene.clock * SAQIA.speed,
        v = SAQIA.radius * TILE * SAQIA.speed;
      const [tx, ty] = scene.saqiaPos(m, scene.clock);
      b.setVelocity(
        -Math.sin(a) * v + Phaser.Math.Clamp((tx - m.img.x) * 8, -200, 200),
        Math.cos(a) * v + Phaser.Math.Clamp((ty - m.img.y) * 8, -200, 200),
      );
      continue;
    }
    if (m.donkey) {
      const d = m.donkey;
      let vx = 0;
      if (d.ridden) {
        const back =
          m.camel &&
          (scene.keys.LEFT.isDown || scene.keys.A.isDown || touch.left);
        if (back && m.img.x > d.min) vx = -m.speed;
        else if (!back && m.img.x < d.max)
          vx = m.camel ? m.speed : DONKEY.speed;
      } else if (!d.ridden && time - d.leftAt > 1200 && m.img.x > d.min)
        vx = -DONKEY.back;
      if (vx > 0 && m.img.x + vx * dt > d.max) vx = (d.max - m.img.x) / dt;
      if (vx < 0 && m.img.x + vx * dt < d.min) vx = (d.min - m.img.x) / dt;
      b.setVelocityX(vx);
      m.img.setTexture(
        (m.camel ? 'camel' : 'donkey') + (vx ? Math.floor(time / 160) % 2 : 0),
      );
      continue;
    }
    if (m.axis === 'x') {
      if (m.dwellUntil && time < m.dwellUntil) {
        // A ferry pan rests at the bank for a beat, then turns back.
        b.setVelocityX(0);
      } else if (m.img.x <= m.min && b.velocity.x < 0) {
        b.setVelocityX(m.speed);
        if (m.dwell) m.dwellUntil = time + m.dwell;
      } else if (m.img.x >= m.max && b.velocity.x > 0) {
        b.setVelocityX(-m.speed);
        if (m.dwell) m.dwellUntil = time + m.dwell;
      } else if (b.velocity.x === 0)
        b.setVelocityX(m.img.x >= m.max ? -m.speed : m.speed);
    } else {
      if (m.img.y <= m.min && b.velocity.y <= 0) b.setVelocityY(m.speed);
      if (m.img.y >= m.max && b.velocity.y >= 0) b.setVelocityY(-m.speed);
    }
    if (m.chains && m.chainTop !== undefined)
      for (const c of m.chains) c.setSize(4, Math.max(4, m.img.y - m.chainTop));
    m.steam?.setPosition(m.img.x + 53, m.img.y - 2);
  }
  updateDamiettaWorld(scene, time, dt);
  updateAlexWorld(scene, time, dt);
  updateLuxorWorld(scene, time, dt);
  updateSiwaWorld(scene, time, dt);
  updateLandmark(scene, time, dt);
  if (scene.sail && !scene.sail.on) sailIdle(scene, scene.sail);
  if (scene.crane) craneIdle(scene, scene.crane, time, dt);
  if (scene.water) {
    scene.water.top.tilePositionX = scene.clock * 20;
    scene.water.top.y = scene.water.y;
    scene.water.fill.y = scene.water.y + 14;
  }
  scene.updateDarkness();
  void dt;
}
