// Port Said (hand-drawn SVG in the same outlined cel style — the art
// connectors were out of credits): the port captain on his crane, the
// pelican and the harbour barrel.
import { INK, HURT, DEAD, dust, speed, stars } from './common.mjs';
const steam = (x, y) =>
  [0, 1, 2]
    .map(
      (i) =>
        `<circle cx="${x + i * 12}" cy="${y - i * 16}" r="${9 + i * 3}" fill="#f4f4f0" stroke="${INK}" stroke-width="4"/>`,
    )
    .join('');
const TIP = [30, 30],
  ROOT = [150, 104],
  SHOULDER = [134, 150];
const cap = (pose) => ({
  key: 'boss7-' + pose[0],
  w: 160,
  h: 112,
  box: [0, 0, 160, 112],
  refBox: [0, 0, 320, 224],
  ...pose[1],
});
const poses = [
  ['idle0', {}],
  [
    'idle1',
    {
      parts: {
        treads: { dx: 8 },
        load: { rotate: 5, at: TIP },
        head: { dy: 2 },
      },
    },
  ],
  [
    'aim',
    {
      parts: {
        load: { rotate: -10, at: TIP },
        arm: { rotate: 50, at: SHOULDER },
        brow: { rotate: 12, pivot: [1, 0.5] },
      },
    },
  ],
  [
    'drop',
    {
      parts: {
        container: { hide: true },
        load: { rotate: 4, at: TIP, dy: -6 },
        boom: { rotate: 3, at: ROOT },
        arm: { rotate: 60, at: SHOULDER },
      },
    },
  ],
  [
    'jam',
    {
      parts: {
        boom: { rotate: -9, at: ROOT },
        load: { rotate: 9, at: TIP },
        head: { rotate: -8, pivot: [0.5, 1] },
      },
      overlays: [{ in: 'crane', svg: steam(207, 58) + stars(122, 82, 8, 3) }],
    },
  ],
  [
    'charge',
    {
      parts: {
        boom: { rotate: 6, at: ROOT },
        load: { rotate: 16, at: TIP },
        treads: { dx: -8 },
        brow: { rotate: 16, pivot: [1, 0.5] },
      },
      overlays: [
        {
          in: 'crane',
          svg: speed(236, 128, 70, 3, 6) + dust(250, 210, 16, 1, 4),
        },
      ],
    },
  ],
  [
    'hurt',
    {
      parts: {
        cap: { dy: -14, rotate: -18 },
        load: { rotate: -6, at: TIP },
      },
      tint: HURT,
    },
  ],
  [
    'dead',
    {
      parts: {
        boom: { rotate: -24, at: ROOT },
        container: { hide: true },
        cap: { dy: -10, rotate: 20 },
      },
      overlays: [{ in: 'crane', svg: stars(122, 84, 8, 3) }],
      tint: DEAD,
    },
  ],
];
const frames = poses.map(cap);
// Pelican: walk, walk, rear back (tell), peck.
const NECK = [64, 74];
const pel = [
  {},
  {
    parts: {
      'leg-near': { dx: -6 },
      'leg-far': { dx: 5 },
      'neck-head': { dx: -1, dy: 1 },
    },
  },
  {
    parts: {
      'neck-head': { rotate: 28, at: NECK },
      beak: { rotate: -10, pivot: [1, 0.5] },
    },
  },
  {
    parts: {
      'neck-head': { rotate: -20, at: NECK, dx: -3 },
      'leg-near': { dx: -8 },
      'leg-far': { dx: 6 },
    },
  },
];
pel.forEach((v, i) =>
  frames.push({
    svg: 'scripts/art/svg/pelican.svg',
    key: 'pelican' + i,
    w: 34,
    h: 32,
    box: [0, 0, 34, 32],
    refBox: [-14, 6, 150, 120],
    ...v,
  }),
);
for (let i = 0; i < 4; i++)
  frames.push({
    svg: 'scripts/art/svg/barrel.svg',
    key: 'barrel' + i,
    w: 30,
    h: 30,
    box: [3, 4, 24, 24],
    refBox: [0, 0, 120, 120],
    parts: { barrel: { rotate: -45 * i, at: [60, 60] } },
  });
export default { svg: 'scripts/art/svg/captain.svg', frames };
