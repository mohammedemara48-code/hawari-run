import Phaser from 'phaser';
import type { Alley } from './game';
import { body } from './game-shared';
import type { Sprite } from './game-shared';
import { TILE } from './level-data';
import { BIRD_REST_MS } from './level-parse';
import { hash } from './world-art';
import { updateAlexEnemy } from './world4';
import { updateLuxorEnemy } from './world5';
import { updateAswanEnemy } from './world6';
import { updatePortSaidEnemy } from './world7';
import { updateSiwaEnemy } from './world8';
import { sound } from './audio';

export function updateEnemy(scene: Alley, e: Sprite, time: number) {
  if (updateLuxorEnemy(scene, e, time)) return;
  if (updateAswanEnemy(scene, e, time)) return;
  if (updateSiwaEnemy(scene, e, time)) return;
  if (updatePortSaidEnemy(scene, e, time)) return;
  if (updateAlexEnemy(scene, e, time)) return;
  const eb = body(e),
    kind = e.getData('kind') as string,
    home = e.getData('home') as { x: number; y: number },
    state = e.getData('state') as string,
    dx = scene.hero.x - e.x,
    dy = scene.hero.y - e.y;
  const frame = (n: number) => e.setTexture(kind + n);
  const dist = (x: number, y: number) =>
    Phaser.Math.Distance.Between(e.x, e.y, x, y);
  if (kind === 'bat') {
    // Perches, swoops at where the hero was, flaps back home.
    if (state === 'perch') {
      frame(0);
      eb.setVelocity(0, 0);
      if (
        Math.abs(dx) < 170 &&
        dy > -10 &&
        dy < 220 &&
        time > e.getData('until')
      ) {
        e.setData('state', 'swoop').setData('until', time + 1300);
        e.setData('target', { x: scene.hero.x, y: scene.hero.y });
      }
    } else if (state === 'swoop') {
      const t = e.getData('target');
      scene.physics.moveTo(e, t.x, t.y, 190);
      frame(1 + (Math.floor(time / 80) % 3));
      if (time > e.getData('until') || dist(t.x, t.y) < 10)
        e.setData('state', 'return');
    } else {
      scene.physics.moveTo(e, home.x, home.y, 120);
      frame(1 + (Math.floor(time / 100) % 3));
      if (dist(home.x, home.y) < 6) {
        e.setPosition(home.x, home.y);
        e.setData('state', 'perch').setData('until', time + 900);
      }
    }
    e.setFlipX(eb.velocity.x > 0);
    return;
  }
  if (kind === 'crow') {
    // Patrols wide, then dive-bombs where the hero is heading and
    // swoops back up past him (faster and meaner than the pigeon).
    const seed = e.getData('seed');
    if (state === 'walk') {
      const tx = home.x + Math.sin(time / 1100 + seed) * 60,
        ty = home.y + Math.sin(time / 380 + seed) * 10;
      eb.setVelocity((tx - e.x) * 4, (ty - e.y) * 4);
      frame(Math.floor(time / 80) % 3);
      if (
        Math.abs(dx) < 180 &&
        dy > 10 &&
        dy < 260 &&
        time > e.getData('until') &&
        !scene.nearSpawn(scene.hero.x) &&
        !scene.nearSpawn(e.x)
      ) {
        scene.birdTell(e, time, 'caw');
      }
    } else if (state === 'tell') {
      frame(Math.floor(time / 50) % 3);
      scene.birdTelling(e, time, 250);
    } else if (state === 'dive') {
      frame(3);
      if (time > e.getData('until') || eb.blocked.down) {
        e.setData('state', 'climb');
        eb.setVelocity(eb.velocity.x * 0.2, -170);
      }
    } else {
      if (e.y < home.y + 20) scene.physics.moveTo(e, home.x, home.y, 150);
      frame(Math.floor(time / 60) % 3);
      if (dist(home.x, home.y) < 10)
        e.setData('state', 'walk').setData('until', time + BIRD_REST_MS);
    }
    e.setFlipX(eb.velocity.x > 0);
    return;
  }
  if (kind === 'pigeon') {
    // Hovers on a figure-eight, dives at the hero, climbs back.
    const seed = e.getData('seed');
    if (state === 'walk') {
      const tx = home.x + Math.sin(time / 900 + seed) * 34,
        ty = home.y + Math.sin(time / 420 + seed) * 8;
      eb.setVelocity((tx - e.x) * 4, (ty - e.y) * 4);
      frame(Math.floor(time / 90) % 3);
      if (
        Math.abs(dx) < 130 &&
        dy > 10 &&
        dy < 230 &&
        time > e.getData('until')
      ) {
        scene.birdTell(e, time, 'caw');
      }
    } else if (state === 'tell') {
      frame(Math.floor(time / 60) % 3);
      scene.birdTelling(e, time, 235);
    } else if (state === 'dive') {
      frame(3);
      if (time > e.getData('until') || eb.blocked.down)
        e.setData('state', 'climb');
    } else {
      scene.physics.moveTo(e, home.x, home.y, 130);
      frame(Math.floor(time / 70) % 3);
      if (dist(home.x, home.y) < 8)
        e.setData('state', 'walk').setData('until', time + BIRD_REST_MS);
    }
    e.setFlipX(eb.velocity.x < 0);
    return;
  }
  if (kind === 'gull') {
    // Glides back and forth high up and drops shells when it's above you.
    const seed = e.getData('seed');
    const tx = home.x + Math.sin(time / 1400 + seed) * 90,
      ty = home.y + Math.sin(time / 500 + seed) * 8;
    eb.setVelocity((tx - e.x) * 3, (ty - e.y) * 3);
    const drop =
      Math.abs(dx + body(scene.hero).velocity.x * 0.25) < 26 &&
      dy > 30 &&
      dy < 300 &&
      time > e.getData('until');
    frame(
      drop || time < e.getData('until') - 1700 ? 3 : Math.floor(time / 110) % 3,
    );
    if (drop) {
      e.setData('until', time + 2000);
      const sh = scene.hazards.create(e.x, e.y + 10, 'shell') as Sprite;
      body(sh).setSize(8, 6);
      sh.setVelocity(eb.velocity.x * 0.5, 40)
        .setData('kind', 'shell')
        .setDepth(9);
      sound.fx('gull');
    }
    e.setFlipX(eb.velocity.x > 0);
    return;
  }
  if (e.getData('sleep')) return;
  const rolling = e.getData('rolling');
  if (kind === 'goose') {
    // Spots you, honks and gives chase with flapping hops.
    if (
      state === 'walk' &&
      Math.abs(dx) < 150 &&
      Math.abs(dy) < 50 &&
      time > e.getData('until')
    ) {
      e.setData('state', 'chase').setData('until', time + 2600);
      sound.fx('honk');
    }
    if (state === 'chase') {
      const d = Math.sign(dx) || 1;
      const ahead = scene.standable(
        Math.floor((e.x + d * 16) / TILE),
        Math.floor((eb.bottom + 2) / TILE),
      );
      e.setVelocityX(ahead || !eb.blocked.down ? d * 118 : 0);
      if (eb.blocked.down && time > (e.getData('hop') || 0)) {
        e.setVelocityY(-210);
        e.setData('hop', time + 700);
      }
      e.setFlipX(d > 0);
      frame(eb.blocked.down ? 2 : 3);
      if (time > e.getData('until'))
        e.setData('state', 'walk').setData('until', time + 1600);
      return;
    }
  }
  if (kind === 'buffalo') {
    // Lowers its horns (telegraph), charges hard, knocks itself dizzy.
    if (
      state === 'walk' &&
      Math.abs(dy) < 40 &&
      Math.abs(dx) < 220 &&
      time > e.getData('until')
    ) {
      e.setData('state', 'tell')
        .setData('until', time + 650)
        .setData('dir', Math.sign(dx) || 1);
      e.setVelocityX(0);
      sound.fx('moo');
      return;
    }
    if (state === 'tell') {
      frame(2);
      e.setVelocityX(Math.sin(time / 25) * 18);
      e.setFlipX(e.getData('dir') > 0);
      if (Math.floor(time / 90) % 3 === 0)
        scene.burst(e.x - e.getData('dir') * 24, e.y + 4, 0xffffff, 1);
      if (time > e.getData('until'))
        e.setData('state', 'charge').setData('until', time + 1700);
      return;
    }
    if (state === 'charge') {
      frame(2);
      const d = e.getData('dir');
      e.setVelocityX(d * 270);
      e.setFlipX(d > 0);
      const ahead = scene.standable(
        Math.floor((e.x + d * 24) / TILE),
        Math.floor((eb.bottom + 2) / TILE),
      );
      if (Math.floor(time / 70) % 2 === 0)
        scene.burst(e.x - d * 20, eb.bottom, 0x8a6a4a, 1);
      if (
        time > e.getData('until') ||
        eb.blocked.left ||
        eb.blocked.right ||
        (eb.blocked.down && !ahead)
      ) {
        e.setVelocityX(0);
        if (eb.blocked.left || eb.blocked.right)
          scene.cameras.main.shake(90, 0.004);
        e.setData('state', 'dizzy').setData('until', time + 1300);
        scene.burst(e.x, e.y - 16, 0xffe36a, 5);
      }
      return;
    }
    if (state === 'dizzy') {
      frame(3);
      e.setVelocityX(0);
      if (time > e.getData('until')) {
        e.setData('state', 'walk').setData('until', time + 900);
        e.setVelocityX(-(e.getData('dir') || 1) * scene.walkSpeed(kind));
      }
      return;
    }
  }
  if (kind === 'crab') {
    // Scuttles, and every couple of seconds raises its claws (guard):
    // stomping it then hurts.
    if (state === 'walk' && time > e.getData('until')) {
      e.setData('state', 'guard').setData('until', time + 900);
      e.setVelocityX(0);
      if (Math.abs(dx) < 260) sound.fx('clack');
      return;
    }
    if (state === 'guard') {
      frame(2);
      e.setVelocityX(0);
      if (time > e.getData('until'))
        e.setData('state', 'walk').setData(
          'until',
          time + 1900 + hash(e.x, time) * 1200,
        );
      return;
    }
  }
  if (kind === 'plane') {
    // A runaway carpenter's plane: lines up with you and dashes.
    if (
      state === 'walk' &&
      Math.abs(dy) < 26 &&
      Math.abs(dx) < 170 &&
      time > e.getData('until')
    ) {
      e.setData('state', 'tell')
        .setData('until', time + 380)
        .setData('dir', Math.sign(dx) || 1);
      e.setVelocityX(0);
      return;
    }
    if (state === 'tell') {
      frame(2);
      e.setFlipX(e.getData('dir') > 0);
      e.setVelocityX(Math.sin(time / 18) * 16);
      if (time > e.getData('until'))
        e.setData('state', 'charge').setData('until', time + 900);
      return;
    }
    if (state === 'charge') {
      frame(2);
      const d = e.getData('dir');
      e.setVelocityX(d * 225);
      if (Math.floor(time / 60) % 2 === 0)
        scene.burst(e.x - d * 14, eb.bottom - 2, 0xf0d090, 1);
      const ahead = scene.standable(
        Math.floor((e.x + d * 14) / TILE),
        Math.floor((eb.bottom + 2) / TILE),
      );
      if (
        time > e.getData('until') ||
        eb.blocked.left ||
        eb.blocked.right ||
        (eb.blocked.down && !ahead)
      ) {
        e.setVelocityX(0);
        e.setData('state', 'dizzy').setData('until', time + 800);
      }
      return;
    }
    if (state === 'dizzy') {
      frame(3);
      e.setVelocityX(0);
      if (time > e.getData('until')) {
        e.setData('state', 'walk').setData('until', time + 900);
        e.setVelocityX(-(e.getData('dir') || 1) * scene.walkSpeed(kind));
      }
      return;
    }
  }
  if (kind === 'thief' && state === 'flee') {
    // Runs off with your fish; turns at walls and edges.
    let d = e.getData('dir') as number;
    if (eb.blocked.left) d = 1;
    if (eb.blocked.right) d = -1;
    if (
      eb.blocked.down &&
      !scene.standable(
        Math.floor((e.x + d * 14) / TILE),
        Math.floor((eb.bottom + 2) / TILE),
      )
    )
      d = -d;
    e.setData('dir', d)
      .setVelocityX(d * 150)
      .setFlipX(d > 0);
    frame(2);
    if (time > e.getData('until')) e.setData('state', 'walk');
    return;
  }
  if (kind === 'rooster') {
    // Spots you, scratches the ground (telegraph), charges, gets dizzy.
    if (
      state === 'walk' &&
      Math.abs(dy) < 34 &&
      Math.abs(dx) < 170 &&
      time > e.getData('until')
    ) {
      e.setData('state', 'tell')
        .setData('until', time + 450)
        .setData('dir', Math.sign(dx) || 1);
      e.setVelocityX(0);
      return;
    }
    if (state === 'tell') {
      frame(2);
      e.setVelocityX(Math.sin(time / 20) * 20);
      e.setFlipX(e.getData('dir') > 0);
      if (time > e.getData('until'))
        e.setData('state', 'charge').setData('until', time + 1300);
      return;
    }
    if (state === 'charge') {
      frame(2);
      const d = e.getData('dir');
      e.setVelocityX(d * 240);
      e.setFlipX(d > 0);
      const ahead = scene.standable(
        Math.floor((e.x + d * 16) / TILE),
        Math.floor((eb.bottom + 2) / TILE),
      );
      if (
        time > e.getData('until') ||
        eb.blocked.left ||
        eb.blocked.right ||
        (eb.blocked.down && !ahead)
      ) {
        e.setVelocityX(0);
        e.setData('state', 'dizzy').setData('until', time + 950);
        scene.burst(e.x, e.y - 12, 0xffe36a, 4);
      }
      return;
    }
    if (state === 'dizzy') {
      frame(3);
      e.setVelocityX(0);
      if (time > e.getData('until')) {
        e.setData('state', 'walk').setData('until', time + 800);
        e.setVelocityX(-(e.getData('dir') || 1) * scene.walkSpeed(kind));
      }
      return;
    }
  }
  let direction = Math.sign(eb.velocity.x) || -1;
  if (eb.blocked.left) direction = 1;
  if (eb.blocked.right) direction = -1;
  if (eb.blocked.down && !rolling) {
    const col = Math.floor((e.x + direction * 14) / TILE),
      row = Math.floor((eb.bottom + 2) / TILE);
    if (!scene.standable(col, row)) direction *= -1;
  }
  e.setVelocityX(direction * (rolling ? 290 : scene.walkSpeed(kind)));
  if (kind === 'saw' && Math.abs(dx) < 200 && time > e.getData('until')) {
    e.setData('until', time + 1500);
    sound.fx('saw');
  }
  if (kind === 'rat' && eb.blocked.down && time > e.getData('until')) {
    e.setData('until', time + 1400 + hash(time, e.x) * 1400);
    e.setVelocityY(-250);
  }
  e.setFlipX(direction > 0);
  frame(
    kind === 'rooster' ||
      kind === 'buffalo' ||
      kind === 'goose' ||
      kind === 'crab' ||
      kind === 'plane' ||
      kind === 'thief'
      ? Math.floor(
          time / (kind === 'buffalo' ? 220 : kind === 'crab' ? 110 : 160),
        ) % 2
      : kind === 'saw'
        ? Math.floor(time / 40) % 4
        : Math.floor(time / (rolling ? 45 : kind === 'rat' ? 70 : 150)) % 4,
  );
}
