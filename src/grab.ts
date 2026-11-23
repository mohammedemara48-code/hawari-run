import type { Alley } from './game';
import { body } from './game-shared';
import type { Sprite } from './game-shared';
import { TILE } from './level-data';
import { PHYSICS } from './levels';
import { sound } from './audio';
import { toast } from './ui';
import { recordSecret } from './progress';

export function findSecret(scene: Alley) {
  const s = scene.secret!;
  scene.secretFound = true;
  scene.score += 1000;
  recordSecret(scene.level);
  sound.fx('secret');
  scene.burst(s.x, s.y, 0xffd23f, 24);
  scene.popText(s.x, s.y - 20, 'الفانوس الدهبي! +١٠٠٠', '#ffe08a');
  toast('لقيت الفانوس الدهبي — سرّ المرحلة!');
  s.destroy();
  scene.secretGlow?.destroy();
  scene.updateHud();
}
export function useTank(scene: Alley) {
  const t = scene.blocks
    .getChildren()
    .find((s) => (s as Sprite).getData('kind') === 'tank') as
    Sprite | undefined;
  if (
    !t ||
    t.getData('used') ||
    Math.abs(t.x - scene.hero.x) > 24 ||
    body(scene.hero).bottom > t.y - 20
  )
    return;
  t.setData('used', true);
  toast('خزان الفكة! لمّ بسرعة');
  sound.fx('secret');
  for (let i = 0; i < 10; i++) {
    const c = scene.items.create(t.x, t.y - 34, scene.skin('coin1')) as Sprite;
    c.setData('kind', 'coin')
      .setData('settled', true)
      .setVelocity((i - 4.5) * 34, -330 - (i % 3) * 40)
      .setDepth(6);
  }
}
export function onOneWay(scene: Alley) {
  const b = body(scene.hero);
  const ch = scene.L.at(
    Math.floor(b.center.x / TILE),
    Math.floor((b.bottom + 2) / TILE),
  );
  return ch === '-' || ch === '~';
}
export function lineAt(scene: Alley, i: number) {
  const ln = scene.L.lines[i];
  return { ax: ln.a.x, ay: ln.a.y - 10, bx: ln.b.x, by: ln.b.y - 10 };
}
export function tryGrab(scene: Alley) {
  const b = body(scene.hero);
  const hand = b.top - 2;
  for (let i = 0; i < scene.L.lines.length; i++) {
    const { ax, ay, bx, by } = scene.lineAt(i);
    const x = scene.hero.x;
    if (x < Math.min(ax, bx) + 4 || x > Math.max(ax, bx) - 4) continue;
    const ly = ay + ((by - ay) * (x - ax)) / (bx - ax);
    if (Math.abs(hand - ly) < 14) {
      scene.zip = { line: i, dir: Math.sign(bx - ax) };
      b.setAllowGravity(false);
      scene.facing = scene.zip.dir;
      sound.fx('zip');
      return;
    }
  }
}
export function updateZip(scene: Alley, time: number, jump: boolean) {
  const zip = scene.zip!,
    b = body(scene.hero);
  const { ax, ay, bx, by } = scene.lineAt(zip.line);
  const slope = (by - ay) / (bx - ax);
  const vx = zip.dir * 235;
  const ly = ay + slope * (scene.hero.x - ax);
  // Hands stay on the rope: the body top hangs just under the line.
  b.setVelocity(vx, slope * vx + (ly + 2 - b.top) * 12);
  if (Math.floor(time / 50) % 3 === 0)
    scene.burst(scene.hero.x, b.top, 0xffffff, 1);
  const release = (vy: number) => {
    scene.zip = null;
    scene.zipCooldown = time + 380;
    b.setAllowGravity(true);
    b.setVelocity(vx * 0.85, vy);
  };
  if (jump && !scene.jumpWas) {
    release(-PHYSICS.jump * 0.85);
    sound.fx('jump');
  } else if (
    (zip.dir > 0 && scene.hero.x >= bx - 6) ||
    (zip.dir < 0 && scene.hero.x <= bx + 6)
  )
    release(0);
  else if (b.blocked.left || b.blocked.right || b.blocked.down) release(0);
}
