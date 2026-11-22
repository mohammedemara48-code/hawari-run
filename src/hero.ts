import type { Alley } from './game';
import { HERO_FRAME, heroBody, heroPose } from './hero-state';
import { body } from './game-shared';
import { INVULN_MS, worldWeapon } from './weapons';
import { LEVELS } from './level-data';
import { hud } from './ui';
import type { SBody, Sprite } from './game-shared';

export function fitHeroBody(scene: Alley, crouch: boolean) {
  const m = heroBody(scene.power > 0, crouch),
    b = body(scene.hero);
  if (b.width !== m.width || b.height !== m.height || b.offset.y !== m.y)
    b.setSize(m.width, m.height, false).setOffset(m.x, m.y);
  scene.heroCrouched = crouch;
}
export function solidsNear(scene: Alley): SBody[] {
  const out: SBody[] = [];
  for (const g of [scene.terrain, scene.blocks, scene.crates])
    for (const s of g.getChildren()) {
      const b = (s as Sprite).body as SBody;
      if (b && b.enable && s.active) out.push(b);
    }
  return out;
}
export function animateHero(
  scene: Alley,
  now: number,
  grounded: boolean,
  direction: number,
  down: boolean,
) {
  let crouch = grounded && down;
  if (scene.heroCrouched && !crouch) {
    const m = heroBody(scene.power > 0, false),
      left = scene.hero.x - HERO_FRAME.width / 2 + m.x,
      top = scene.hero.y - HERO_FRAME.height / 2 + m.y;
    crouch = scene
      .solidsNear()
      .some(
        (b) =>
          left < b.right &&
          left + m.width > b.left &&
          top < b.bottom &&
          top + m.height > b.top + 0.5,
      );
  }
  scene.fitHeroBody(crouch);
  let pose = heroPose({
    now,
    grounded,
    vx: body(scene.hero).velocity.x,
    vy: body(scene.hero).velocity.y,
    direction,
    down: crouch,
    growUntil: scene.growUntil,
    throwUntil: scene.throwUntil,
    hurtUntil: scene.hurtPoseUntil,
    dead: scene.mode === 'dead',
  });
  if ((scene.zip || scene.crane?.hang) && scene.mode === 'play')
    pose = 'throw1';
  const form = pose === 'grow0' ? 'small' : scene.power > 0 ? 'big' : 'small';
  scene.hero.setTexture(`hero-${form}-${pose}`).setData('pose', pose);
  scene.heroShadow
    .setPosition(scene.hero.x, body(scene.hero).bottom + 1)
    .setAlpha(grounded ? 0.24 : 0)
    .setVisible(scene.mode !== 'dead');
}
export function updateHud(scene: Alley) {
  hud(
    scene.score,
    scene.coinCount,
    scene.lives,
    Math.max(0, Math.ceil(scene.remaining)),
    `${scene.level + 1} · ${LEVELS[scene.level].name}`,
    scene.power,
    scene.secretFound,
    scene.weapon(),
  );
}
export function weapon(scene: Alley) {
  return worldWeapon(scene.L?.meta.world ?? 0);
}
export function grantIframes(scene: Alley) {
  scene.hurtUntil = scene.time.now + INVULN_MS;
  scene.hurtPoseUntil = scene.time.now + 280;
  scene.hero.setAlpha(0.45);
  scene.updateHud();
}
/** Lift the hero out of any solid he was pushed into (crow/dive clips). */
export function unstickHero(scene: Alley) {
  if (!scene.hero?.body) return;
  const b = body(scene.hero);
  for (let i = 0; i < 16; i++) {
    const stuck = scene
      .solidsNear()
      .some(
        (s) =>
          b.right > s.left &&
          b.left < s.right &&
          b.bottom > s.top + 1 &&
          b.top < s.bottom,
      );
    if (!stuck) break;
    scene.hero.y -= 2;
    b.reset(scene.hero.x, scene.hero.y);
  }
}
export function spawnX(scene: Alley) {
  const cp = scene.spec.checkpoint;
  return scene.checkpoint && cp.x >= 0 ? cp.x : scene.spec.start.x;
}
/** A diving bird warns first: it stops, shakes and flashes with a "!"
 * over its head for BIRD_TELL_MS, then dives in a straight line at the
 * spot where بلبل was when the warning started (no homing), so walking
 * away during the warning is always enough. */
