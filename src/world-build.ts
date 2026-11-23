import Phaser from 'phaser';
import type { Alley } from './game';
import { hash } from './world-art';
import { TILE } from './level-data';
import { body, randomZone } from './game-shared';
import type { Any, Body, Sprite } from './game-shared';
import { isWeaponItem } from './weapons';
import { sound } from './audio';
import { toast } from './ui';

export function buildAtmosphere(scene: Alley) {
  const L = scene.L,
    meta = L.meta,
    cam = scene.cameras.main;
  // Tomb levels keep the scene readable (brighter plaster + the held lantern).
  // Wall torches still light ghost ledges; they just don't punch a hole in a
  // full-screen dark overlay.
  if (meta.dark && meta.theme !== 'tomb')
    scene.dark = scene.add
      .renderTexture(0, 0, cam.width, cam.height)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(50);
  if (meta.theme === 'market' || meta.theme === 'sewer')
    for (let x = 300; x < L.width; x += 520 + Math.floor(hash(x, 2) * 200))
      scene.add
        .image(x, meta.theme === 'sewer' ? 3 * TILE : 0, 'shaft')
        .setOrigin(0.5, 0)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(meta.theme === 'sewer' ? 0.3 : 0.2)
        .setDepth(meta.theme === 'sewer' ? 52 : 6)
        .setScale(1.2, L.height / 300);
  const zone = (w: number, h: number) =>
    randomZone(new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h));
  const conf: Record<
    string,
    Phaser.Types.GameObjects.Particles.ParticleEmitterConfig
  > = {
    night: {
      lifespan: 4200,
      speed: { min: 4, max: 16 },
      scale: { start: 0.9, end: 0.3 },
      frequency: 160,
      blendMode: 'ADD',
      emitZone: zone(1000, 380),
      alpha: {
        onEmit: () => 0,
        onUpdate: (_p, _k, t) =>
          Math.sin(t * Math.PI) * (0.55 + 0.45 * Math.sin(t * 30)),
      },
    },
    market: {
      lifespan: 5000,
      speedX: { min: -8, max: 8 },
      speedY: { min: -6, max: 4 },
      scale: { min: 0.6, max: 1.4 },
      alpha: { start: 0.5, end: 0 },
      frequency: 90,
      tint: 0xffe3b0,
      blendMode: 'ADD',
      emitZone: zone(1000, 380),
    },
    roof: {
      lifespan: 5000,
      speedX: { min: 30, max: 60 },
      speedY: { min: 4, max: 18 },
      rotate: { min: 0, max: 360 },
      alpha: { start: 0.9, end: 0 },
      frequency: 500,
      emitZone: zone(1000, 380),
    },
    sewer: {
      lifespan: 900,
      speedY: { min: 0, max: 10 },
      gravityY: 700,
      alpha: { start: 0.9, end: 0.4 },
      frequency: 110,
      emitZone: zone(1000, 40),
    },
    farm: {
      // Chaff and pollen drifting off the fields.
      lifespan: 5200,
      speedX: { min: 12, max: 42 },
      speedY: { min: -6, max: 10 },
      rotate: { min: 0, max: 360 },
      alpha: { start: 0.85, end: 0 },
      tint: meta.timeOfDay === 'night' ? 0xc8d8ff : 0xffffff,
      frequency: 150,
      emitZone: zone(1000, 380),
    },
    workshop: {
      // Wood shavings and sawdust floating in the lamp light.
      lifespan: 5600,
      speedX: { min: -10, max: 14 },
      speedY: { min: 4, max: 16 },
      rotate: { min: 0, max: 360 },
      alpha: { start: 0.8, end: 0 },
      frequency: 220,
      emitZone: zone(1000, 380),
    },
    corniche: {
      // Sea spray glinting in the sun, blown in off the bay.
      lifespan: 3600,
      speedX: { min: 30, max: 70 },
      speedY: { min: -14, max: 4 },
      scale: { min: 0.4, max: 1.1 },
      alpha: { start: 0.55, end: 0 },
      blendMode: 'ADD',
      frequency: 140,
      emitZone: zone(1000, 380),
    },
    fort: {
      // Driving rain in the نوة.
      lifespan: 700,
      speedX: { min: 90, max: 140 },
      speedY: { min: 560, max: 680 },
      rotate: -12,
      alpha: { start: 0.65, end: 0.25 },
      frequency: 8,
      quantity: 2,
      emitZone: zone(1100, 420),
    },
    temple: {
      // Fine sand drifting on the desert wind (dust motes by moonlight).
      lifespan: 4600,
      speedX: { min: 24, max: 60 },
      speedY: { min: -6, max: 8 },
      scale: { min: 0.6, max: 1.4 },
      alpha: { start: 0.7, end: 0 },
      tint: meta.timeOfDay === 'moon' ? 0xc8d4ff : 0xffe0a8,
      frequency: 110,
      emitZone: zone(1000, 380),
    },
    nile: {
      // Dawn mist rising off the river.
      lifespan: 5200,
      speedX: { min: 6, max: 22 },
      speedY: { min: -14, max: -4 },
      scale: { min: 0.8, max: 1.8 },
      alpha: { start: 0.4, end: 0 },
      tint: 0xffe8f0,
      blendMode: 'ADD',
      frequency: 140,
      emitZone: zone(1000, 380),
    },
    nubia: {
      // Warm motes drifting in the bright Aswan air.
      lifespan: 4800,
      speedX: { min: 10, max: 30 },
      speedY: { min: -8, max: 6 },
      scale: { min: 0.6, max: 1.3 },
      alpha: { start: 0.5, end: 0 },
      tint: 0xfff0c8,
      frequency: 150,
      emitZone: zone(1000, 380),
    },
    tomb: {
      // Dust sifting down through the torchlight.
      lifespan: 3400,
      speedX: { min: -6, max: 6 },
      speedY: { min: 10, max: 26 },
      alpha: { start: 0.75, end: 0 },
      tint: 0xffc890,
      frequency: 120,
      emitZone: zone(1000, 380),
    },
    siwa: {
      // Hot desert dust drifting across the oasis.
      lifespan: 4200,
      speedX: { min: 16, max: 44 },
      speedY: { min: -8, max: 8 },
      scale: { min: 0.6, max: 1.4 },
      alpha: { start: 0.55, end: 0 },
      tint: 0xffe0a0,
      frequency: 130,
      emitZone: zone(1000, 380),
    },
    portsaid: {
      // Bright sea air: a few warm motes blowing in off the canal.
      lifespan: 4400,
      speedX: { min: 18, max: 40 },
      speedY: { min: -6, max: 6 },
      scale: { min: 0.6, max: 1.4 },
      alpha: { start: 0.45, end: 0 },
      tint: 0xfff8e0,
      frequency: 150,
      emitZone: zone(1000, 380),
    },
    harbor: {
      // Salt spray and sea mist blown off the water.
      lifespan: 4200,
      speedX: { min: 20, max: 50 },
      speedY: { min: -8, max: 6 },
      scale: { min: 0.6, max: 1.6 },
      alpha: { start: 0.45, end: 0 },
      tint: 0xd8f0ff,
      blendMode: 'ADD',
      frequency: 120,
      emitZone: zone(1000, 380),
    },
  };
  const key = {
    night: 'firefly',
    market: 'mote',
    roof: 'feather',
    sewer: 'drip',
    farm: meta.timeOfDay === 'night' ? 'firefly' : 'chaff',
    workshop: 'shaving',
    harbor: 'mote',
    corniche: 'spray',
    fort: 'rain',
    temple: 'sand-grain',
    nile: 'mote',
    tomb: 'sand-grain',
    nubia: 'mote',
    portsaid: 'mote',
    siwa: 'sand-grain',
    giza: 'sand-grain',
    citadel: 'mote',
    rashid: 'mote',
  }[meta.theme];
  scene.ambient = scene.add
    .particles(
      0,
      0,
      key,
      conf[meta.theme] ?? conf[meta.theme === 'giza' ? 'temple' : 'market'],
    )
    .setDepth(meta.theme === 'night' ? 53 : 30);
  for (const w of L.wind) {
    const e = scene.add.particles(0, 0, 'streak', {
      lifespan: 900,
      speedX: { min: 260 * w.dir, max: 380 * w.dir },
      alpha: { start: 0.7, end: 0 },
      frequency: 60,
      emitZone: randomZone(
        new Phaser.Geom.Rectangle(w.x0, w.y0, w.x1 - w.x0, w.y1 - w.y0),
      ),
      emitting: false,
    });
    e.setDepth(30);
    scene.windEmitters.push(e);
  }
  if (meta.theme === 'roof')
    scene.time.addEvent({
      delay: 3800,
      loop: true,
      callback: () => {
        const c2 = scene.cameras.main;
        for (let i = 0; i < 5; i++) {
          const b = scene.add
            .image(
              c2.scrollX - 30 - i * 14,
              c2.scrollY + 40 + (i % 2) * 10 + i * 4,
              'bird',
            )
            .setDepth(-85);
          scene.tweens.add({
            targets: b,
            x: b.x + c2.width + 120,
            y: b.y - 30,
            duration: 7000,
            onComplete: () => b.destroy(),
          });
          scene.tweens.add({
            targets: b,
            scaleY: 0.4,
            yoyo: true,
            repeat: -1,
            duration: 160,
          });
        }
      },
    });
}
export function buildColliders(scene: Alley) {
  const hero = scene.hero,
    hb = body(hero);
  const fromAbove = (h: unknown, s: unknown) => {
    const ho = h as Any,
      so = s as Any;
    const b = ho.body as Body,
      sb = so.body as Body;
    if (
      ho === (scene.hero as unknown) &&
      (scene.time.now < scene.dropUntil || scene.zip)
    )
      return false;
    const prevBottom = b.prev.y + b.height;
    const top = sb.moves ? Math.min(sb.top, sb.prev.y) : sb.top;
    return b.velocity.y >= -5 && prevBottom <= top + 7;
  };
  scene.physics.add.collider(hero, scene.terrain, () => scene.headBump());
  scene.physics.add.collider(hero, scene.blocks, () => scene.headBump());
  scene.physics.add.collider(hero, scene.ledges, undefined, fromAbove);
  scene.physics.add.collider(
    hero,
    scene.ghosts,
    undefined,
    (h, g) => (g as Sprite).getData('lit') && fromAbove(h, g),
  );
  scene.physics.add.collider(hero, scene.movers, undefined, fromAbove);
  scene.physics.add.collider(hero, scene.crates, (_h, c) => {
    if (Math.abs(hb.bottom - body(c as Sprite).top) < 3)
      scene.crumble(c as Sprite);
  });
  scene.physics.add.collider(
    hero,
    scene.bouncers,
    (_h, s) => scene.bounce(s as Sprite),
    fromAbove,
  );
  for (const g of [scene.enemies, scene.items]) {
    scene.physics.add.collider(g, scene.terrain);
    scene.physics.add.collider(g, scene.blocks);
    scene.physics.add.collider(g, scene.crates);
    scene.physics.add.collider(g, scene.ledges, undefined, fromAbove);
    scene.physics.add.collider(g, scene.movers, undefined, fromAbove);
    scene.physics.add.collider(g, scene.bouncers, undefined, fromAbove);
  }
  scene.physics.add.overlap(hero, scene.coins, (_p, c) => {
    scene.collect();
    scene.burst((c as Sprite).x, (c as Sprite).y, 0xffe08a, 4);
    c.destroy();
  });
  scene.physics.add.overlap(hero, scene.items, (_p, it) => {
    const item = it as Sprite;
    const type = item.getData('kind');
    if (type === 'coin') scene.collect();
    else if (type === 'invincible') {
      scene.invincible = scene.time.now + 9000;
      toast('خرزة الحظ! ٩ ثواني محدش يقدر عليك');
      sound.fx('power');
    } else if (isWeaponItem(type)) {
      scene.setPower(2);
      sound.fx('power');
    } else {
      scene.setPower(Math.max(1, scene.power));
      sound.fx('power');
    }
    scene.burst(item.x, item.y, 0xffd889, 15);
    item.destroy();
  });
  scene.physics.add.collider(hero, scene.enemies, (_p, e) =>
    scene.contact(e as Sprite),
  );
  scene.physics.add.overlap(hero, scene.hazards, (_h, hz) =>
    (hz as Sprite).getData('kind') === 'bolt'
      ? scene.hurt('bolt', true)
      : scene.hurt(),
  );
  scene.physics.add.collider(scene.hazards, scene.terrain, (h) => {
    const s = h as Sprite;
    const k = s.getData('kind');
    if (k === 'container') {
      // A dropped container slams down and breaks open.
      sound.fx('crush');
      scene.cameras.main.shake(160, 0.008);
      scene.burst(s.x, s.y + 8, 0xc83a2a, 10);
      scene.burst(s.x, s.y + 12, 0xc8b898, 8);
      s.destroy();
      return;
    }
    if (['bone', 'clod', 'shell', 'bubble', 'sand', 'venom'].includes(k)) {
      scene.burst(
        s.x,
        s.y,
        k === 'clod'
          ? 0x5a3a22
          : k === 'sand'
            ? 0xe0b070
            : k === 'venom'
              ? 0x8ad040
              : 0xf3ead2,
        k === 'sand' ? 7 : 4,
      );
      s.destroy();
    }
  });
  for (const g of [scene.terrain, scene.blocks, scene.crates])
    scene.physics.add.collider(scene.shots, g, (shot) => {
      const s = shot as Sprite;
      if (
        s.getData('bounce') !== false &&
        body(s).blocked.down &&
        (s.getData('bounces') || 0) < 3
      ) {
        s.setVelocityY(-160);
        s.setData('bounces', (s.getData('bounces') || 0) + 1);
      } else {
        scene.burst(s.x, s.y, s.getData('splat') ?? 0xf5a34d, 4);
        s.destroy();
      }
    });
  scene.physics.add.overlap(scene.shots, scene.enemies, (shot, e) => {
    scene.damageEnemy(e as Sprite);
    shot.destroy();
  });
  scene.physics.add.overlap(scene.enemies, scene.enemies, (a, b) => {
    const A = a as Sprite,
      B = b as Sprite;
    if (A !== B && (A.getData('rolling') || B.getData('rolling')))
      scene.killEnemy(A.getData('rolling') ? B : A);
  });
  if (scene.boss) {
    const boss = scene.boss;
    scene.physics.add.collider(boss, scene.terrain);
    scene.physics.add.collider(boss, scene.ledges, undefined, fromAbove);
    scene.physics.add.overlap(hero, boss, () => scene.bossContact());
    scene.physics.add.overlap(scene.shots, boss, (a, b) => {
      (a === boss ? b : a).destroy();
      scene.bossChili();
    });
  }
}
/* ───────────────────────── Entities ───────────────────────── */
/** The current world's skin for a shared element texture. */
