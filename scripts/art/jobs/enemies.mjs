// Common enemies from two QuiverAI sheets. Each enemy keeps its texture size
// and footprint (box = where the old frames drew), frames 0–3 keep their
// meaning (0/1 move cycle, 2–3 the enemy's special frame).
import { HURT } from './common.mjs';
const S1 = 'scripts/art/svg/enemies1.svg',
  S2 = 'scripts/art/svg/enemies2.svg';
const bob = (r = 4, dy = -6) => ({ rotate: r, dy, pivot: [0.5, 1] });
const flap = (sy) => ({ sy, pivot: [0.5, 0.6] });
const squash = (sy, sx = 1) => ({ sy, sx, pivot: [0.5, 1] });
const tilt = (r) => ({ rotate: r, pivot: [0.5, 0.6] });
// [key, svg, group, w, h, box, flip, frames: 4 transforms (+ optional tint)]
const E = [
  [
    'bat',
    S1,
    'purple-bat',
    32,
    25,
    [0, 0, 32, 23],
    false,
    [{ sy: -0.8, sx: 0.6, pivot: [0.5, 0.3] }, flap(1), flap(0.7), flap(0.9)],
  ],
  [
    'rooster',
    S1,
    'rooster',
    34,
    32,
    [1, 0, 33, 31],
    false,
    [{}, bob(), { t: [255, 80, 50, 0.3], ...tilt(-8) }, tilt(10)],
  ],
  [
    'pigeon',
    S1,
    'gray-pigeon',
    30,
    22,
    [0, 0, 30, 19],
    true,
    [{}, flap(0.75), flap(0.9), tilt(30)],
  ],
  [
    'rat',
    S1,
    'gray-rat',
    31,
    18,
    [0, 0, 31, 18],
    false,
    [{}, bob(3, -4), squash(0.9, 1.05), bob(-3, -2)],
  ],
  [
    'goose',
    S1,
    'white-goose',
    31,
    28,
    [0, 1, 30, 26],
    false,
    [{}, bob(), tilt(-10), { rotate: -14, sy: 1.05, pivot: [0.5, 1] }],
  ],
  [
    'crow',
    S1,
    'black-raven',
    31,
    23,
    [0, 0, 31, 19],
    false,
    [{}, flap(0.75), flap(0.9), tilt(-40)],
  ],
  [
    'buffalo',
    S1,
    'black-bull',
    52,
    38,
    [1, 0, 51, 37],
    false,
    [{}, bob(2, -4), tilt(-8), bob(-2, -2)],
  ],
  [
    'crab',
    S2,
    'orange-crab',
    34,
    24,
    [0, 1, 34, 22],
    false,
    [{}, bob(4, -2), squash(1.08), bob(-4, -2)],
  ],
  [
    'gull',
    S2,
    'white-eagle',
    34,
    22,
    [0, 0, 34, 20],
    false,
    [{}, flap(0.75), flap(0.9), tilt(-30)],
  ],
  [
    'thief',
    S2,
    'orange-masked-cat',
    34,
    27,
    [0, 2, 33, 24],
    true,
    [{}, bob(3, -4), tilt(-10), bob(-3, -2)],
  ],
  [
    'skua',
    S2,
    'brown-eagle',
    34,
    22,
    [0, 0, 34, 18],
    false,
    [{}, flap(0.75), flap(0.9), tilt(-35)],
  ],
  [
    'jelly',
    S2,
    'pink-jellyfish',
    24,
    28,
    [1, 0, 22, 26],
    false,
    [{}, squash(0.9, 1.06), squash(1.05, 0.95), squash(0.95, 1.03)],
  ],
  [
    'scarab',
    S2,
    'emerald-beetle',
    24,
    18,
    [0, 5, 22, 12],
    false,
    [{}, bob(3, -3), tilt(-18), bob(-3, -2)],
  ],
  [
    'mummy',
    S2,
    'bandaged-mummy',
    32,
    38,
    [1, 0, 29, 38],
    false,
    [{}, bob(3, -4), squash(0.3, 1.2), squash(0.7, 1.05)],
  ],
  [
    'cobra',
    S2,
    'hooded-cobra',
    28,
    32,
    [1, 4, 27, 28],
    false,
    [
      {},
      tilt(-4),
      { rotate: -8, sx: 1.08, sy: 1.04, pivot: [0.5, 1] },
      { rotate: -12, sx: 1.12, sy: 1.06, pivot: [0.5, 1] },
    ],
  ],
  [
    'devil',
    S2,
    'golden-ring-spirit',
    34,
    48,
    [0, 2, 34, 44],
    false,
    [{}, squash(1, 0.9), { sx: -1, pivot: [0.5, 0.5] }, squash(0.97, 1.08)],
  ],
];
// Tall art in a flat box: draw a little wider so it fills its footprint.
const WIDE = {
  pigeon: 1.4,
  crow: 1.4,
  gull: 1.45,
  skua: 1.45,
  crab: 1.25,
  scarab: 1.15,
};
export const jobs = [S1, S2].map((svg) => ({
  svg,
  frames: E.filter((e) => e[1] === svg).flatMap(
    ([key, , only, w, h, box, flip, fr]) =>
      fr.map((t, i) => {
        const { t: tint, ...tf } = t;
        return {
          key: key + i,
          w,
          h,
          box,
          flip,
          only,
          sx: WIDE[key],
          parts: Object.keys(tf).length ? { [only]: tf } : {},
          tint,
        };
      }),
  ),
}));
export default jobs[0];
