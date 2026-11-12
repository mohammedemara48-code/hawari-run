import { levelSpec } from './rules';
// Pure level layout data shared by the scene and the reachability checks.
export const PHYSICS = {
  gravity: 1100,
  jump: 470,
  runJump: 485,
  step: 1 / 60,
};
export const TILE = 24;
export const GROUND_TOP = 312;
export type BoxContent = 'coin' | 'food' | 'chili' | 'invincible';
export interface BlockDef {
  x: number;
  y: number;
  kind: 'brick' | 'box';
  content?: BoxContent;
}
export interface LevelLayout {
  /** [x, y, tiles] floating terraces (centre coordinates of the first tile). */
  platforms: [number, number, number][];
  /** Low stepping stones that let the hero climb onto a block row. */
  steps: [number, number][];
  blocks: BlockDef[];
  /** Coins resting on top of block rows. */
  rowCoins: [number, number][];
  /** Every coin in the level (terraces, rows, guiding trails, street). */
  coins: [number, number][];
  enemies: { x: number; kind: 'cat' | 'bug' | 'basket' }[];
}
/** Low terraces float high enough for the powered hero to walk underneath. */
const LOW = 240;
const ROW_Y = 216;
const CONTENTS: BoxContent[] = [
  'food',
  'coin',
  'chili',
  'coin',
  'invincible',
  'coin',
  'coin',
  'coin',
];
export function levelLayout(index: number): LevelLayout {
  const platforms: [number, number, number][] =
    index === 0
      ? [
          [552, LOW, 4],
          [1248, LOW, 3],
          [1392, 216, 4],
          [2400, LOW, 4],
          [2808, LOW, 4],
          [3552, LOW, 4],
          [3696, 216, 3],
          [4368, LOW, 4],
        ]
      : [
          [504, LOW, 4],
          [1152, LOW, 4],
          [1320, 216, 3],
          [2088, LOW, 4],
          [2832, LOW, 4],
          [3288, LOW, 3],
          [3456, 216, 4],
          [4224, LOW, 4],
          [4752, LOW, 4],
        ];
  // Block rows: brick · gold box · brick. Every row sits over open ground.
  const sets =
    index === 0
      ? [408, 816, 1536, 1920, 2592, 3024, 3840, 4512]
      : [360, 768, 1536, 2256, 2592, 3624, 4128, 4872];
  // Every row top can be climbed: a stepping stone sits beside rows with no terrace nearby.
  const steps: [number, number][] =
    index === 0
      ? [
          [720, LOW],
          [1824, LOW],
        ]
      : [
          [672, LOW],
          [1440, LOW],
          [2496, LOW],
        ];
  const blocks: BlockDef[] = [];
  const rowCoins: [number, number][] = [];
  sets.forEach((x, i) => {
    blocks.push({ x: x - TILE, y: ROW_Y, kind: 'brick' });
    blocks.push({ x, y: ROW_Y, kind: 'box', content: CONTENTS[i] });
    blocks.push({ x: x + TILE, y: ROW_Y, kind: 'brick' });
    if (i % 2 === 1) rowCoins.push([x - TILE, 171], [x, 152], [x + TILE, 171]);
  });
  const spec = levelSpec(index);
  const coins: [number, number][] = [];
  for (const [x, y, n] of platforms)
    for (let i = 0; i < n; i++) coins.push([x + i * TILE, y - 39]);
  coins.push(...rowCoins);
  // Guiding trails: a coin over each stepping stone points at the row above,
  // and an arc over the secret tank hints that it can be entered.
  for (const [x, y] of steps) coins.push([x, y - 39]);
  coins.push(
    [spec.portal - 24, 222],
    [spec.portal, 208],
    [spec.portal + 24, 222],
  );
  // Street rhythm coins, kept clear of pits, block rows and the tank.
  const blocked = (x: number) =>
    spec.gaps.some(([a, b]) => x > a - 12 && x < b + 12) ||
    Math.abs(x - spec.portal) < 40 ||
    steps.some(([sx]) => Math.abs(x - sx) < 20);
  for (let x = 276; x < spec.width - 350; x += 156)
    if (!blocked(x)) coins.push([x, 284]);
  // Lead-in coins before every pit show the take-off point.
  for (const [a] of spec.gaps)
    for (const c of [
      [a - 60, 284],
      [a - 36, 270],
    ] as [number, number][])
      if (!coins.some(([x, y]) => Math.hypot(x - c[0], y - c[1]) < 24))
        coins.push(c);
  const enemyX =
    index === 0
      ? [648, 936, 1368, 1800, 2352, 2760, 3168, 3648, 3960, 4464]
      : [624, 840, 1224, 1656, 2124, 2508, 2928, 3360, 3768, 4320, 4776, 4968];
  const enemies = enemyX.map((x, i) => ({
    x,
    kind: (i % 3 === 2
      ? 'basket'
      : index === 1 && i % 2 === 0
        ? 'bug'
        : 'cat') as 'cat' | 'bug' | 'basket',
  }));
  return { platforms, steps, blocks, rowCoins, coins, enemies };
}
