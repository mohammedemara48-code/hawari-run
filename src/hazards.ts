import Phaser from 'phaser';
import type { Alley } from './game';
import { body } from './game-shared';
import type { Sprite } from './game-shared';
import { sound } from './audio';

export function updateHazards(scene: Alley, time: number) {
  for (const h of scene.hazards.getChildren() as Sprite[]) {
    const k = h.getData('kind');
    if (
      (k === 'shock' || k === 'wave') &&
      (time - h.getData('born') > 2600 ||
        body(h).blocked.left ||
        body(h).blocked.right)
    )
      h.destroy();
    else if (k === 'shell' || k === 'bubble') {
      h.angle += k === 'shell' ? 9 : 0;
      if (h.y > scene.L.height + 40) h.destroy();
    } else if (k === 'sand' || k === 'venom' || k === 'container') {
      if (h.y > scene.L.height + 40) h.destroy();
    } else if (k === 'bone' || k === 'clod') {
      h.angle += k === 'bone' ? 12 : 4;
      if (h.y > scene.L.height + 40) h.destroy();
    }
  }
}
/** «أبو قرون»: walk → snort (telegraph) → charge → crash → dazed. */
export function updateBuffalo(scene: Alley, time: number) {
  const boss = scene.boss!,
    s = scene.bossState,
    bb = body(boss);
  const phase = scene.bossPhase();
  const grounded = bb.blocked.down;
  const toHero = Math.sign(scene.hero.x - boss.x) || 1;
  const [lo, hi] = scene.bossRange();
  if (!['charge', 'hurt', 'leap', 'slam'].includes(s.state))
    boss.setFlipX(toHero < 0);
  const over = time > s.until;
  const tex = (pose: string) => boss.setTexture(scene.bossTex(pose));
  switch (s.state) {
    case 'walk':
      tex('idle' + (Math.floor(time / 200) % 2));
      boss.setVelocityX(toHero * (phase === 3 ? 80 : 55));
      if (over) {
        boss.setVelocityX(0);
        scene.bossSet('telegraph', [800, 650, 500][phase - 1]);
        sound.fx('moo');
      }
      break;
    case 'telegraph':
      tex('crouch');
      boss.setVelocityX(Math.sin(time / 25) * 20);
      boss.setTint(Math.floor(time / 80) % 2 ? 0xff9a7a : 0xffffff);
      if (Math.floor(time / 100) % 2 === 0)
        scene.burst(boss.x + toHero * 50, boss.y + 8, 0xffffff, 1);
      if (over) {
        boss.clearTint();
        s.volley = toHero;
        scene.bossSet('charge', 2600);
        sound.fx('roar');
      }
      break;
    case 'charge': {
      tex('charge');
      const d = s.volley || 1;
      boss.setFlipX(d < 0);
      boss.setVelocityX(d * [300, 350, 400][phase - 1]);
      if (Math.floor(time / 60) % 2 === 0)
        scene.burst(boss.x - d * 40, bb.bottom, 0x8a6a4a, 2);
      const wall =
        bb.blocked.left ||
        bb.blocked.right ||
        (d < 0 && boss.x <= lo) ||
        (d > 0 && boss.x >= hi);
      if (wall || over) {
        boss.setVelocityX(0);
        boss.x = Phaser.Math.Clamp(boss.x, lo, hi);
        sound.fx('shock');
        scene.cameras.main.shake(260, 0.014);
        scene.burst(boss.x + d * 44, boss.y - 10, 0xb8a888, 14);
        if (phase >= 2) scene.dropClods(phase === 2 ? 2 : 3);
        scene.bossSet('dazed', [1700, 1400, 1150][phase - 1]);
      }
      break;
    }
    case 'dazed':
      tex('dazed');
      boss.setVelocityX(0);
      if (Math.floor(time / 120) % 3 === 0) {
        const st = scene.add
          .image(boss.x + Math.cos(time / 150) * 30, boss.y - 40, 'star')
          .setDepth(20);
        scene.tweens.add({
          targets: st,
          alpha: 0,
          y: st.y - 8,
          duration: 300,
          onComplete: () => st.destroy(),
        });
      }
      if (over)
        if (phase === 3) scene.bossSet('slamUp', 250);
        else scene.bossSet('walk', phase === 2 ? 900 : 1200);
      break;
    case 'slamUp':
      tex('crouch');
      boss.setVelocityX(0);
      if (grounded && over) {
        boss.setVelocity(toHero * 120, -600);
        tex('leap');
        scene.bossSet('slam', 2000);
      }
      break;
    case 'slam':
      if (grounded && bb.velocity.y >= 0 && time > s.until - 1800) {
        boss.setVelocityX(0);
        sound.fx('shock');
        scene.cameras.main.shake(220, 0.012);
        for (const d of [-1, 1]) {
          const w = scene.hazards.create(
            boss.x + d * 46,
            bb.bottom - 9,
            'shock',
          ) as Sprite;
          body(w).setAllowGravity(false).setSize(26, 14).setOffset(4, 4);
          w.setVelocityX(d * 240)
            .setData('kind', 'shock')
            .setData('born', time)
            .setDepth(9)
            .setFlipX(d < 0);
        }
        scene.bossSet('walk', 800);
      }
      break;
    case 'hurt':
      tex('hurt');
      if (over && grounded) {
        boss.setVelocityX(0);
        scene.bossSet('walk', 700);
      }
      break;
  }
  scene.clampBoss();
}
/** Mud clods shaken loose from the barn roof when the buffalo crashes. */
export function dropClods(scene: Alley, n: number) {
  const s = scene.bossState,
    cam = scene.cameras.main,
    groundY = body(scene.hero).bottom;
  // Few, slow, and telegraphed: a shadow marks each spot well before the clod lands.
  const side = Math.random() < 0.5 ? -1 : 1;
  for (let i = 0; i < n; i++) {
    const x = Phaser.Math.Clamp(
      scene.hero.x + side * (40 + i * 90) + (Math.random() - 0.5) * 20,
      s.arenaX + 30,
      scene.L.width - 30,
    );
    const mark = scene.add
      .ellipse(x, groundY - 2, 26, 7, 0x000000, 0.35)
      .setDepth(8);
    scene.tweens.add({
      targets: mark,
      scaleX: 1.4,
      alpha: 0.6,
      yoyo: true,
      repeat: -1,
      duration: 250,
    });
    scene.time.delayedCall(2200, () => mark.destroy());
    const c = scene.hazards.create(
      x,
      cam.scrollY - 160 - i * 70,
      'clod',
    ) as Sprite;
    c.setData('kind', 'clod').setDepth(9);
    body(c).setSize(10, 10).setMaxVelocity(0, 200);
  }
}
export function throwBone(scene: Alley, boss: Sprite, phase: number) {
  const bone = scene.hazards.create(boss.x, boss.y - 20, 'bone') as Sprite;
  const dx = scene.hero.x - boss.x;
  bone.setVelocity(
    Phaser.Math.Clamp(dx / 1.05, -320, 320) +
      (Math.random() - 0.5) * 40 * phase,
    -380,
  );
  bone.setData('kind', 'bone').setDepth(9);
  body(bone).setSize(14, 8);
  sound.fx('fire');
}
