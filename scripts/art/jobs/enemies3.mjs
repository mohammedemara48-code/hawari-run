// Cairo/Damietta enemies (cat, cockroach, bread basket, carpenter's plane)
// from a QuiverAI sheet without part ids, split into one image per creature.
const D = 'scripts/art/svg/split/';
const bob = (r = 4, dy = -2) => ({ rotate: r, dy, pivot: [0.5, 1] });
const squash = (sy, sx = 1) => ({ sy, sx, pivot: [0.5, 1] });
const E = [
  [
    'cat',
    32,
    28,
    [0, 1, 29, 26],
    false,
    [{}, bob(4), bob(-4), squash(0.9, 1.06)],
  ],
  [
    'bug',
    32,
    22,
    [2, 0, 29, 20],
    false,
    [{}, bob(3, -1), bob(-3, -1), squash(0.9, 1.04)],
  ],
  [
    'basket',
    32,
    28,
    [3, 4, 27, 24],
    false,
    [{}, bob(4), bob(-4), squash(0.88, 1.08)],
  ],
  [
    'plane',
    32,
    20,
    [1, 0, 30, 17],
    false,
    [{}, bob(3, -1), bob(-3, -1), squash(0.9, 1.05)],
  ],
];
export const jobs = E.map(([key, w, h, box, flip, fr]) => ({
  svg: D + key + '.svg',
  frames: fr.map((t, i) => ({
    key: key + i,
    w,
    h,
    box,
    flip,
    sx: { cat: 1.35, plane: 1.25 }[key],
    parts: Object.keys(t).length ? { [key]: t } : {},
  })),
}));
export default jobs[0];
