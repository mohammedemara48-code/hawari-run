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
}
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
          [552, 264, 4],
          [1248, 264, 3],
          [1392, 216, 4],
          [2400, 264, 4],
          [2808, 252, 4],
          [3552, 264, 4],
          [3696, 216, 3],
          [4368, 264, 4],
        ]
      : [
          [504, 264, 4],
          [1152, 264, 4],
          [1320, 216, 3],
          [2088, 264, 4],
          [2832, 264, 4],
          [3288, 264, 3],
          [3456, 216, 4],
          [4224, 264, 4],
          [4752, 264, 4],
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
          [720, 264],
          [1824, 264],
        ]
      : [
          [672, 264],
          [1440, 264],
          [2496, 264],
        ];
  const blocks: BlockDef[] = [];
  const rowCoins: [number, number][] = [];
  sets.forEach((x, i) => {
    blocks.push({ x: x - TILE, y: ROW_Y, kind: 'brick' });
    blocks.push({ x, y: ROW_Y, kind: 'box', content: CONTENTS[i] });
    blocks.push({ x: x + TILE, y: ROW_Y, kind: 'brick' });
    if (i % 2 === 1) rowCoins.push([x - TILE, 171], [x, 152], [x + TILE, 171]);
  });
  return { platforms, steps, blocks, rowCoins };
}
