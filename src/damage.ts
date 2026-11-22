import type { Alley } from './game';
import { body } from './game-shared';
import type { Sprite } from './game-shared';
import { stomped } from './rules';
import { hitIsFatal, powerAfterHit } from './weapons';
import { alexContact, dropUmbrella } from './world4';
import { luxorContact } from './world5';
import { letGo } from './crane';
import { clearResume } from './progress';
import { sound } from './audio';
import { screen, toast } from './ui';

export function contact(scene: Alley, e: Sprite) {
  if (scene.mode !== 'play' || !e.active) return;
  const b = body(scene.hero),
    eb = body(e);
  if (scene.time.now < scene.invincible) {
    scene.killEnemy(e);
    return;
  }
  const kind = e.getData('kind');
  const fromTop = stomped(
    b.touching.down ? Math.max(1, b.velocity.y) : b.velocity.y,
    b.prev.y + b.height,
    eb.top,
  );
  if (luxorContact(scene, e, fromTop)) return;
  if (alexContact(scene, e, fromTop)) return;
  if (
    fromTop &&
    (kind === 'saw' || (kind === 'crab' && e.getData('state') === 'guard'))
  ) {
    // Spinning blades and raised claws can't be stomped.
    scene.hero.setVelocityY(-360);
    scene.hint(
      kind === 'saw' ? 'saw' : 'claws',
      kind === 'saw'
        ? 'المنشار ما ينداسش! نطّ من فوقه أو ارميه بالشطة'
        : 'الكابوريا رافعة مقصّها! استنى لما تنزّله',
    );
    scene.hurt();
    return;
  }
  if (!fromTop && kind === 'thief' && e.getData('state') === 'flee') {
    // A cat running off with your fish isn't looking for a fight.
    scene.hero.setVelocityX(scene.hero.x < e.x ? -120 : 120);
    return;
  }
  if (!fromTop && kind === 'thief' && scene.coinCount > 0) {
    // The fish thief grabs your takings instead of hurting you.
    const n = Math.min(5, scene.coinCount);
    scene.coinCount -= n;
    scene.levelCoins = Math.max(0, scene.levelCoins - n);
    e.setData('stolen', (e.getData('stolen') || 0) + n);
    e.setData('state', 'flee')
      .setData('until', scene.time.now + 4000)
      .setData('dir', scene.hero.x < e.x ? 1 : -1);
    scene.hurtUntil = scene.time.now + 700;
    scene.popText(e.x, e.y - 20, `-${n}`, '#ffb0a0');
    scene.hint('thief', 'القطة سرقت الفكة! اتنطّ عليها ترجّعها');
    sound.fx('steal');
    scene.updateHud();
    return;
  }
  if (
    stomped(
      b.touching.down ? Math.max(1, b.velocity.y) : b.velocity.y,
      b.prev.y + b.height,
      eb.top,
    )
  ) {
    if (e.getData('kind') === 'basket') {
      if (e.getData('sleep')) {
        e.setData('sleep', false).setData('rolling', true);
        e.setVelocityX(scene.hero.x < e.x ? 290 : -290);
        e.setTint(0xffd18a);
      } else {
        e.setData('sleep', true).setData('rolling', false);
        e.setVelocityX(0);
        e.setScale(1, 0.7);
      }
      sound.fx('stomp');
    } else scene.damageEnemy(e);
    scene.hero.setVelocityY(scene.jumpWas ? -420 : -300);
    scene.burst(scene.hero.x, scene.hero.y + 14, 0xeed9a4, 5);
  } else if (e.getData('sleep')) {
    e.setData('sleep', false).setData('rolling', true);
    e.setVelocityX(scene.hero.x < e.x ? 290 : -290);
    scene.hurtUntil = scene.time.now + 250;
  } else scene.hurt(kind);
}
/** `soft`: a wave or a lightning bolt. These knock small بلبل back
 * instead of killing him (and still cost a big one his growth). */
export function hurt(scene: Alley, source = 'hit', soft = false) {
  if (
    scene.time.now < scene.hurtUntil ||
    scene.time.now < scene.invincible ||
    scene.mode !== 'play'
  )
    return;
  if (soft && hitIsFatal(scene.power)) {
    scene.lastHurtBy = source;
    scene.unstickHero();
    scene.cameras.main.shake(120, 0.005);
    scene.hero.setVelocity(-scene.facing * 160, -260);
    scene.hero.setTintFill(0xffffff);
    scene.time.delayedCall(
      90,
      () => scene.hero?.active && scene.hero.clearTint(),
    );
    scene.grantIframes();
    sound.fx('powerdown');
    return;
  }
  scene.lastHurtBy = source;
  if (scene.crane) letGo(scene, scene.crane, scene.time.now);
  dropUmbrella(scene);
  scene.cameras.main.shake(160, 0.007);
  scene.unstickHero();
  scene.hero.setVelocity(-scene.facing * 90, -220);
  scene.hero.setTintFill(0xffffff);
  scene.time.delayedCall(
    90,
    () => scene.hero?.active && scene.hero.clearTint(),
  );
  if (hitIsFatal(scene.power)) {
    sound.fx('hurt');
    scene.die();
    return;
  }
  scene.setPower(powerAfterHit(scene.power), false);
  scene.grantIframes();
  sound.fx('powerdown');
  scene.burst(scene.hero.x, scene.hero.y, 0xe6b17a, 16);
  scene.burst(scene.hero.x, scene.hero.y, 0xffffff, 8);
}
export function die(scene: Alley) {
  if (scene.mode !== 'play') return;
  scene.mode = 'dead';
  scene.lives--;
  scene.zip = null;
  if (scene.crane) scene.crane.hang = null;
  scene.unstickHero();
  body(scene.hero).setAllowGravity(true);
  scene.hero
    .setTexture(`hero-${scene.power > 0 ? 'big' : 'small'}-dead`)
    .setData('pose', 'dead')
    .clearTint()
    .setAlpha(1);
  scene.heroShadow.setVisible(false);
  body(scene.hero).checkCollision.none = true;
  scene.hero.setVelocity(-scene.facing * 40, -280);
  scene.hero.setDepth(30);
  sound.fx('hurt');
  sound.setIntensity(0);
  scene.updateHud();
  const overScore = scene.score,
    overCoins = scene.coinCount;
  scene.time.delayedCall(1100, () => {
    if (scene.lives <= 0) {
      scene.mode = 'over';
      scene.physics.pause();
      clearResume();
      scene.updateHud();
      const row = (a: string, b: string) =>
        `<div class="tally-row"><span>${a}</span><strong>${b}</strong></div>`;
      screen(
        'over',
        row('المجموع', String(overScore).padStart(6, '0')) +
          row('الفكة', String(overCoins).padStart(2, '0')),
      );
    } else {
      scene.power = 0;
      scene.loadLevel();
      scene.mode = 'play';
      scene.physics.resume();
      toast(scene.checkpoint ? 'راجع من علم الأمان' : 'لسه فيك نفس… جرّب تاني');
    }
  });
}
