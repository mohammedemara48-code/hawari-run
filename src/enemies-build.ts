import type { Alley } from './game';
import { BOSS_NAMES, TILE } from './level-data';
import { FLYING } from './level-parse';
import { hash } from './world-art';
import { body } from './game-shared';
import type { Sprite } from './game-shared';

export function enemy(scene: Alley, x: number, y: number, type: string) {
  const flying = FLYING.has(type);
  const e = scene.enemies.create(x, y, type + '0') as Sprite;
  const sizes: Record<string, [number, number, number, number]> = {
    cat: [24, 22, 4, 5],
    bug: [22, 12, 5, 9],
    basket: [24, 22, 4, 5],
    bat: [20, 16, 6, 4],
    rooster: [22, 26, 6, 5],
    pigeon: [20, 14, 5, 4],
    rat: [22, 12, 5, 5],
    buffalo: [40, 28, 6, 8],
    goose: [20, 22, 5, 4],
    crow: [20, 14, 5, 4],
    crab: [26, 16, 4, 7],
    gull: [24, 14, 5, 4],
    saw: [20, 20, 2, 2],
    plane: [26, 14, 3, 5],
    thief: [26, 20, 4, 6],
    skua: [24, 14, 5, 4],
    jelly: [16, 18, 4, 4],
    brolly: [26, 18, 5, 4],
    ball: [18, 18, 2, 2],
    scarab: [18, 12, 3, 6],
    mummy: [18, 32, 7, 6],
    cobra: [14, 24, 8, 8],
    devil: [22, 40, 6, 6],
    croc: [34, 11, 5, 9],
    pelican: [20, 22, 7, 8],
    barrel: [22, 22, 4, 6],
    scorpion: [40, 20, 16, 20],
  };
  const [w, h, ox, oy] = sizes[type];
  const b = body(e);
  b.setSize(w, h).setOffset(ox, oy);
  if (flying) b.setAllowGravity(false);
  // Feet on the tile floor: body bottom = bottom of the tile cell.
  else e.y = y + TILE / 2 - (oy + h) + e.height / 2 - 1;
  b.reset(e.x, e.y);
  e.setDepth(8)
    .setData('kind', type)
    .setData('home', { x, y: e.y })
    .setData('state', type === 'bat' ? 'perch' : 'walk')
    .setData('until', 0)
    .setData('sleep', false)
    .setData('rolling', false)
    .setData('seed', hash(x, y) * 10)
    .setData('hp', type === 'buffalo' ? 2 : 1);
  if (!flying) e.setVelocityX(-scene.walkSpeed(type));
  return e;
}
export function walkSpeed(scene: Alley, type: string) {
  return (
    (
      {
        cat: 38,
        bug: 55,
        basket: 38,
        rooster: 34,
        rat: 92,
        buffalo: 28,
        goose: 46,
        crab: 50,
        saw: 128,
        plane: 44,
        thief: 56,
        ball: 78,
        scarab: 58,
        mummy: 30,
        cobra: 0,
        croc: 22,
        pelican: 30,
        barrel: 0,
        scorpion: 32,
      } as Record<string, number>
    )[type] ?? 40
  );
}
export function bossKind(scene: Alley) {
  return scene.L.meta.bossKind ?? 'fatwa';
}
/** Hearts: the final boss has four phases of two; the Qibli fights in three. */
export function bossMax(scene: Alley) {
  if (scene.L?.meta.bossKind === 'ram') return 8;
  if (scene.L?.meta.bossKind === 'qibli') return 3;
  return 6;
}
export function bossName(scene: Alley) {
  return BOSS_NAMES[bossKind(scene)];
}
export function bossTex(scene: Alley, pose: string) {
  return (
    {
      prism: 'boss-prism-',
      guardian: 'boss-guardian-',
      mill: 'boss-mill-',
      ram: 'boss5-',
      croc: 'boss6-',
      captain: 'boss7-',
      qibli: 'boss8-',
      buffalo: 'boss2-',
      crab: 'boss3-',
      gull: 'boss4-',
      fatwa: 'boss-',
    }[bossKind(scene)] + pose
  );
}
export function makeBoss(scene: Alley, x: number, bottom: number) {
  const buffalo = scene.bossKind === 'buffalo',
    crab = scene.bossKind === 'crab';
  const boss = scene.physics.add
    .sprite(x, bottom - (crab ? 36 : buffalo ? 33 : 32), scene.bossTex('idle0'))
    .setDepth(9);
  if (scene.L.meta.landmark) {
    body(boss).setSize(68, 72).setOffset(14, 14);
    boss.y = bottom - 48;
  } else if (scene.bossKind === 'gull') {
    body(boss).setSize(72, 40).setOffset(28, 39).setAllowGravity(false);
    boss.y = bottom - 60;
  } else if (scene.bossKind === 'ram') {
    body(boss).setSize(116, 56).setOffset(26, 52);
    boss.y = bottom - 52;
  } else if (scene.bossKind === 'croc') {
    body(boss).setSize(120, 40).setOffset(14, 30);
    boss.y = bottom - 26;
  } else if (scene.bossKind === 'captain') {
    body(boss).setSize(64, 60).setOffset(48, 50);
    boss.y = bottom - 54;
  } else if (scene.bossKind === 'qibli') {
    body(boss).setSize(80, 80).setOffset(40, 40).setAllowGravity(false);
    boss.y = bottom - 96;
  } else if (crab) body(boss).setSize(92, 40).setOffset(16, 30);
  else if (buffalo) body(boss).setSize(76, 50).setOffset(12, 14);
  else body(boss).setSize(52, 54).setOffset(13, 10);
  boss.setFlipX(true);
  scene.boss = boss;
}
