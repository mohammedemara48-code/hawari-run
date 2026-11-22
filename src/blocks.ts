import type { Alley } from './game';
import { body } from './game-shared';
import type { Sprite, SBody } from './game-shared';
import { TILE } from './level-data';
import { sound } from './audio';
import { toast } from './ui';

export function headBump(scene: Alley) {
  const hb = body(scene.hero);
  if (!hb.blocked.up || scene.time.now - scene.lastBump < 120) return;
  let best: SBody | undefined,
    bestOverlap = 0,
    touched = 0;
  for (const sb of scene.solidsNear()) {
    if (Math.abs(sb.bottom - hb.top) > 3) continue;
    const overlap = Math.min(sb.right, hb.right) - Math.max(sb.left, hb.left);
    if (overlap <= 0) continue;
    touched++;
    if (overlap > bestOverlap) {
      bestOverlap = overlap;
      best = sb;
    }
  }
  if (!best) return;
  // Corner correction: clipping a block edge by a few pixels slides past it.
  if (touched === 1 && bestOverlap <= 7 && scene.riseVy < -120) {
    const shift =
      hb.center.x < best.center.x ? -(bestOverlap + 1) : bestOverlap + 1;
    const left = hb.left + shift,
      right = hb.right + shift;
    const free = !scene
      .solidsNear()
      .some(
        (o) =>
          o.left < right &&
          o.right > left &&
          o.top < hb.bottom - 1 &&
          o.bottom > hb.top - 8,
      );
    if (free) {
      scene.hero.x += shift;
      hb.x += shift;
      hb.velocity.y = scene.riseVy;
      hb.blocked.up = false;
      return;
    }
  }
  scene.lastBump = scene.time.now;
  const go = best.gameObject as Sprite;
  if (go && scene.blocks.contains(go)) scene.hitBlock(go);
}
export function hitBlock(scene: Alley, block: Sprite) {
  if (!block.active || scene.hero.y < block.y || block.getData('busy')) return;
  const kind = block.getData('kind');
  if (kind !== 'brick' && kind !== 'box' && kind !== 'armory') return;
  block.setData('busy', true);
  if (block.getData('hidden')) {
    block.setAlpha(1).setData('hidden', false);
    const sb = block.body as SBody;
    sb.checkCollision.up =
      sb.checkCollision.left =
      sb.checkCollision.right =
        true;
    scene.popText(block.x, block.y - 24, 'مخبّي!', '#ffe08a');
  }
  if (kind === 'brick' && scene.power > 0) {
    scene.burst(block.x, block.y, 0xcc8a62, 12);
    scene.debris(block.x, block.y);
    block.destroy();
    sound.fx('break');
    scene.cameras.main.shake(70, 0.003);
    scene.score += 50;
    return;
  }
  sound.fx('bump');
  scene.bumpAbove(block);
  const oldY = block.y;
  scene.tweens.add({
    targets: block,
    y: oldY - 6,
    duration: 70,
    yoyo: true,
    onComplete: () => {
      if (block.active) block.setData('busy', false);
    },
  });
  if (kind === 'armory') scene.openArmory(block);
  if (kind === 'box') {
    block.setData('kind', 'used').setTexture(scene.skin('used'));
    const content = block.getData('content') || 'coin';
    if (content === 'coin') {
      scene.collect();
      const c = scene.add
        .image(block.x, block.y - 20, scene.skin('coin1'))
        .setDepth(15);
      scene.tweens.add({
        targets: c,
        y: c.y - 46,
        duration: 260,
        yoyo: true,
        ease: 'Quad.easeOut',
        onComplete: () => {
          scene.burst(c.x, c.y, 0xffd474, 6);
          c.destroy();
        },
      });
      scene.popText(block.x, block.y - 34, '+١٠٠');
    } else scene.spawnItem(block, content);
  }
}
/** Weapon crate before a boss: arms بلبل with this world's weapon,
 * or pays a bonus if he is already armed. */
export function openArmory(scene: Alley, block: Sprite) {
  const w = scene.weapon();
  block.setData('kind', 'used').setTexture(scene.skin('used'));
  const item = scene.add.image(block.x, block.y - 20, w.item).setDepth(15);
  scene.tweens.add({
    targets: item,
    y: item.y - 40,
    duration: 280,
    yoyo: true,
    ease: 'Quad.easeOut',
    onComplete: () => {
      scene.burst(item.x, item.y, 0xff6a3c, 10);
      item.destroy();
    },
  });
  if (scene.power === 2) {
    scene.score += 1000;
    scene.popText(block.x, block.y - 34, '+١٠٠٠', '#ffb08a');
    toast(`معاك ${w.short} أصلًا… خد ١٠٠٠ بونص وواجه!`);
    sound.fx('coin');
    scene.updateHud();
    return;
  }
  scene.setPower(2, false);
  scene.growUntil = scene.time.now + 420;
  scene.burst(scene.hero.x, scene.hero.y, 0xff7a4a, 18);
  scene.popText(block.x, block.y - 34, w.short + '!', '#ffb08a');
  toast(w.toast);
  sound.fx('power');
}
export function debris(scene: Alley, x: number, y: number) {
  for (let i = 0; i < 4; i++) {
    const d = scene.add
      .image(x, y, 'particle')
      .setScale(2)
      .setTint(0x9a5a44)
      .setDepth(20);
    scene.tweens.add({
      targets: d,
      x: x + (i % 2 ? 1 : -1) * (20 + i * 8),
      y: y + 120,
      angle: 200,
      duration: 600,
      ease: 'Quad.easeIn',
      onComplete: () => d.destroy(),
    });
  }
}
export function bumpAbove(scene: Alley, block: Sprite) {
  const sb = block.body as SBody;
  for (const e of scene.enemies.getChildren() as Sprite[]) {
    const eb = body(e);
    if (
      Math.abs(eb.bottom - sb.top) < 4 &&
      eb.right > sb.left &&
      eb.left < sb.right
    )
      scene.killEnemy(e);
  }
  for (const item of scene.items.getChildren() as Sprite[]) {
    const ib = body(item);
    if (
      ib.enable &&
      Math.abs(ib.bottom - sb.top) < 4 &&
      ib.right > sb.left &&
      ib.left < sb.right
    )
      item.setVelocityY(-200);
  }
}
export function spawnItem(scene: Alley, block: Sprite, content: string) {
  const kind = content === 'chili' ? scene.weapon().item : content;
  const top = block.y - 12;
  const item = scene.items.create(block.x, top, scene.skin(kind)) as Sprite;
  item.setData('kind', kind).setDepth(5).setScale(0.3);
  const ib = body(item);
  ib.setAllowGravity(false).enable = false;
  scene.tweens.add({
    targets: item,
    y: top - item.height / 2 - 1,
    scale: 1,
    duration: 380,
    ease: 'Sine.easeOut',
    onComplete: () => {
      if (!item.active) return;
      ib.enable = true;
      ib.reset(item.x, item.y);
      ib.setAllowGravity(true);
      const away = scene.hero.x <= block.x ? 1 : -1;
      const dir = scene.floorAhead(block.x, block.y + 12 + 3 * TILE, away)
        ? away
        : -away;
      item.setData('direction', dir).setData('spawnY', item.y);
      item.setVelocity(dir * 70, 0);
    },
  });
}
