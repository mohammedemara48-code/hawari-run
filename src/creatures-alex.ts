// World 4 creatures (اسكندرية): the storm gull, jellyfish, an umbrella blown
// loose, a runaway beach ball and the boss «ريّس النوة», a giant storm gull.
// Same integer rasterizer as the other characters. Flyers face left.
import Phaser from 'phaser';
import { make, type Pixels, type Point } from './characters';

function oval(
  p: Pixels,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  color: string,
  outline = false,
) {
  const pts: Point[] = [];
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2;
    pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  }
  p.poly(pts, color, outline);
}
/** A gull drawn at scale `s` with origin (ox, oy), facing left.
 * wing: -1 up, 0 level, 1 down; dive tucks the wings back. */
function gullBody(
  p: Pixels,
  ox: number,
  oy: number,
  s: number,
  wing: number,
  dive: boolean,
  col: {
    body: string;
    back: string;
    tip: string;
    head: string;
    beak: string;
    eye: string;
  },
) {
  const X = (x: number) => ox + x * s,
    Y = (y: number) => oy + y * s;
  const wy = [-9, 0, 7][wing + 1];
  // Far wing.
  if (!dive)
    p.poly(
      [
        [X(15), Y(10)],
        [X(25), Y(wy + 4)],
        [X(31), Y(wy + 2)],
        [X(22), Y(12)],
      ],
      col.back,
      true,
    );
  // Body and tail.
  oval(p, X(16), Y(12), 9 * s, 4.5 * s, col.body, true);
  p.poly(
    [
      [X(23), Y(10)],
      [X(32), Y(dive ? 6 : 9)],
      [X(31), Y(13)],
      [X(24), Y(15)],
    ],
    col.body,
    true,
  );
  // Head and beak.
  const hy = dive ? 14 : 9;
  oval(p, X(7), Y(hy), 4.5 * s, 4 * s, col.head, true);
  p.poly(
    [
      [X(3), Y(hy - 1)],
      [X(-2), Y(hy + 1)],
      [X(3), Y(hy + 2)],
    ],
    col.beak,
  );
  p.r(X(3), Y(hy + 1), 1 * s, 1 * s, '#c83a2a');
  p.r(X(5), Y(hy - 1), Math.max(1, s), Math.max(1, s), col.eye);
  // Near wing with its dark tip.
  const near: Point[] = dive
    ? [
        [X(12), Y(10)],
        [X(30), Y(6)],
        [X(32), Y(9)],
        [X(18), Y(14)],
      ]
    : [
        [X(12), Y(11)],
        [X(22), Y(wy + 6)],
        [X(30), Y(wy + 5)],
        [X(20), Y(14)],
      ];
  p.poly(near, col.back, true);
  const t = near[2];
  p.poly(
    [
      [t[0] - 5 * s, t[1] - 1 * s],
      [t[0] + 1 * s, t[1] - 1 * s],
      [t[0] - 2 * s, t[1] + 2 * s],
    ],
    col.tip,
  );
}
/** Storm gull (نورس النوة): sooty back, black hood, mean red eye. */
function skua(p: Pixels, f: number) {
  gullBody(p, 1, 1, 1, [-1, 0, 1, 0][f], f === 3, {
    body: '#c8ccd0',
    back: '#4a4e58',
    tip: '#14161c',
    head: '#24262e',
    beak: '#e8b030',
    eye: '#ff3a2a',
  });
  // A white wing flash.
  if (f !== 3) p.r(19, [3, 9, 14][f % 3] + 2, 4, 1, '#f4f6f2');
}
/** Jellyfish (قنديل): a pulsing pink-lilac bell with trailing arms. */
function jelly(p: Pixels, f: number) {
  const squash = [0, 1, 2, 1][f];
  const rx = 9 + squash,
    ry = 8 - squash;
  // Trailing tentacles, swaying.
  for (let i = 0; i < 5; i++) {
    const x = 5 + i * 3.5,
      sway = Math.sin(f * 1.6 + i) * 2;
    p.line([x, 11], [x + sway, 22 + (i % 2) * 3], 1.4, '#c89ad8');
  }
  p.line([10, 11], [9 + Math.sin(f) * 2, 25], 2.4, '#f0a8d0');
  p.line([14, 11], [15 - Math.sin(f) * 2, 26], 2.4, '#f0a8d0');
  // Bell.
  oval(p, 12, 9, rx, ry, '#e8b8f0', true);
  oval(p, 12, 8, rx - 2, ry - 2.5, '#f6d8fa');
  p.r(6, 12, 12, 1, '#b07ac8');
  // Four-leaf gonads glowing through the bell.
  for (const [x, y] of [
    [9, 7],
    [14, 7],
  ] as Point[])
    oval(p, x, y, 2, 1.5, '#d070b0');
  p.r(8, 4, 3, 1, '#ffffff');
}
/** An umbrella blown loose (شمسية طايرة): canopy flutters as it tumbles. */
function brolly(p: Pixels, f: number) {
  const lift = [0, 2, 0, -2][f];
  const n = 6,
    cx = 18,
    cy = 14 + lift / 2,
    r = 16;
  for (let i = 0; i < n; i++) {
    const a0 = Math.PI + (i / n) * Math.PI,
      a1 = Math.PI + ((i + 1) / n) * Math.PI;
    p.poly(
      [
        [cx, cy - 10 - lift],
        [cx + Math.cos(a0) * r, cy + Math.sin(a0) * 3],
        [cx + Math.cos(a1) * r, cy + Math.sin(a1) * 3],
      ],
      i % 2 ? '#f4f8fa' : i === 2 ? '#d84a3a' : '#2e6ab0',
      true,
    );
  }
  // Scalloped rim and the pole with its spike, swinging.
  for (let i = 0; i <= n; i++)
    p.r(
      cx + Math.cos(Math.PI + (i / n) * Math.PI) * r - 1,
      cy - 1,
      2,
      2,
      '#1d1416',
    );
  const sw = [0, 2, 0, -2][f];
  p.line([cx, cy - 10 - lift], [cx + sw, cy + 15], 2, '#e8e0d0', true);
  p.r(cx + sw - 1, cy + 14, 3, 2, '#8a8a90');
}
/** Beach ball (كورة بحر): six bright panels rolling round. */
function ball(p: Pixels, f: number) {
  const cols = [
    '#e83a3a',
    '#f4f4f0',
    '#2e6ab0',
    '#f4f4f0',
    '#f0c030',
    '#f4f4f0',
  ];
  oval(p, 11, 11, 10, 10, '#f4f4f0', true);
  for (let k = 0; k < 6; k++) {
    const a0 = (k / 6) * Math.PI * 2 + (f * Math.PI) / 6,
      a1 = ((k + 1) / 6) * Math.PI * 2 + (f * Math.PI) / 6;
    const pts: Point[] = [[11, 11]];
    for (let t = 0; t <= 4; t++) {
      const a = a0 + ((a1 - a0) * t) / 4;
      pts.push([11 + Math.cos(a) * 9.5, 11 + Math.sin(a) * 9.5]);
    }
    p.poly(pts, cols[k]);
  }
  oval(p, 11, 11, 2.5, 2.5, '#f4f4f0');
  p.r(6, 5, 3, 2, '#ffffff');
}
export const STORM_POSES = [
  'idle0',
  'idle1',
  'tell',
  'dive',
  'stuck',
  'gust',
  'hurt',
  'dead',
] as const;
/** «ريّس النوة»: a giant storm gull with a ragged sailor's cap, scars on
 * his beak and a mean glare. 140×90, faces left. */
function stormBoss(p: Pixels, pose: (typeof STORM_POSES)[number]) {
  const col = {
    body: '#d8dce0',
    back: '#545a66',
    tip: '#14161c',
    head: '#e8ecee',
    beak: '#f0b830',
    eye: '#14100e',
  };
  const s = 3.6;
  const wing =
    pose === 'idle0'
      ? -1
      : pose === 'idle1' || pose === 'stuck'
        ? 1
        : pose === 'tell' || pose === 'gust'
          ? -1
          : 0;
  const dive = pose === 'dive';
  const oy = pose === 'stuck' ? 34 : pose === 'dead' ? 30 : 17;
  gullBody(p, 14, oy, s, wing, dive, col);
  const X = (x: number) => 14 + x * s,
    Y = (y: number) => oy + y * s;
  const hy = dive ? 14 : 9;
  // Feathering on the big near wing: covert rows, ragged primaries with
  // a white trailing edge, so it reads as a wing, not a slab.
  const wy = [-9, 0, 7][wing + 1];
  const near: Point[] = dive
    ? [
        [X(12), Y(10)],
        [X(30), Y(6)],
        [X(32), Y(9)],
        [X(18), Y(14)],
      ]
    : [
        [X(12), Y(11)],
        [X(22), Y(wy + 6)],
        [X(30), Y(wy + 5)],
        [X(20), Y(14)],
      ];
  const lerp = (a: Point, b: Point, t: number): Point => [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
  ];
  for (const t of [0.3, 0.55]) {
    const a0 = lerp(near[0], near[3], t),
      a1 = lerp(near[1], near[2], t);
    p.line(a0, lerp(a0, a1, 0.85), 1.4, '#6e7684');
  }
  // Outward normal of the trailing edge (away from the wing's middle).
  const [e0, e1] = [near[3], near[2]];
  const mid = lerp(near[0], near[1], 0.5);
  let nx = -(e1[1] - e0[1]),
    ny = e1[0] - e0[0];
  const len = Math.hypot(nx, ny) || 1;
  nx /= len;
  ny /= len;
  if ((mid[0] - e0[0]) * nx + (mid[1] - e0[1]) * ny > 0) {
    nx = -nx;
    ny = -ny;
  }
  for (let k = 0; k < 7; k++) {
    const a0 = lerp(e0, e1, k / 7),
      a1 = lerp(e0, e1, (k + 1) / 7);
    const dark = k >= 4,
      reach = dark ? 9 : 6;
    p.poly(
      [
        [a0[0] - nx * 2, a0[1] - ny * 2],
        [a1[0] - nx * 2, a1[1] - ny * 2],
        [a1[0] + nx * reach, a1[1] + ny * reach],
      ],
      dark ? '#1e2128' : '#eef1ee',
      true,
    );
  }
  // Captain's cap, frayed by the storm.
  p.poly(
    [
      [X(2.5), Y(hy - 3)],
      [X(11), Y(hy - 4)],
      [X(11.5), Y(hy - 6.5)],
      [X(3.5), Y(hy - 6.5)],
    ],
    '#1c2a4a',
    true,
  );
  p.r(X(2), Y(hy - 3.4), 9.5 * s, 1.2 * s, '#14161c');
  p.r(X(6), Y(hy - 5.8), 2.4 * s, 1.4 * s, '#f0c84a');
  // Eye and brow by pose.
  const ex = X(5),
    ey = Y(hy - 1);
  if (pose === 'dead') {
    p.line([ex - 4, ey - 4], [ex + 4, ey + 4], 2, '#14100e');
    p.line([ex - 4, ey + 4], [ex + 4, ey - 4], 2, '#14100e');
  } else if (pose === 'hurt' || pose === 'stuck') {
    oval(p, ex, ey, 3, 3, '#fffbe8', true);
    p.r(ex - 1, ey - 1, 2, 2, '#14100e');
    // Dizzy stars.
    for (const [x, y] of [
      [X(1), Y(hy - 10)],
      [X(10), Y(hy - 11)],
    ] as Point[])
      p.r(x, y, 4, 4, '#ffe36a');
  } else {
    oval(p, ex, ey, 3.4, 3, '#ffe890', true);
    p.r(ex - 2, ey - 1, 3, 3, '#14100e');
    p.line([ex - 6, ey - 6], [ex + 6, ey - 3], 2.6, '#14100e');
  }
  // Beak scar.
  p.r(X(0), Y(hy + 0.5), 2 * s, 1, '#a87a20');
  if (pose === 'tell' || pose === 'gust') {
    // Beak wide open, screeching.
    p.poly(
      [
        [X(3), Y(hy + 2)],
        [X(-3), Y(hy + 5)],
        [X(3), Y(hy + 3.5)],
      ],
      '#f0b830',
      true,
    );
    p.r(X(1), Y(hy + 2.2), 2 * s, 1 * s, '#8a2a2a');
  }
  if (pose === 'stuck') {
    // Beak jammed in the roof stones, legs flailing.
    p.r(X(-3), Y(hy + 3), 6 * s, 3, '#a89e8a');
    for (const dx of [16, 20])
      p.line([X(dx), Y(16)], [X(dx + 3), Y(19)], 3, '#f0b830', true);
  }
  if (pose !== 'stuck' && pose !== 'dead' && pose !== 'dive') {
    // Webbed feet tucked under.
    for (const dx of [14, 18])
      p.line([X(dx), Y(16)], [X(dx + 2), Y(18.5)], 3, '#f0b830', true);
  }
  if (pose === 'gust')
    for (let i = 0; i < 4; i++) p.r(2 + i * 2, 50 + i * 7, 10, 2, '#c8dcf0');
}
export function makeAlexCreatures(scene: Phaser.Scene) {
  if (scene.textures.exists('skua0')) return;
  for (let f = 0; f < 4; f++) {
    make(scene, 'skua' + f, 34, 22, (p) => skua(p, f));
    make(scene, 'jelly' + f, 24, 28, (p) => jelly(p, f));
    make(scene, 'brolly' + f, 36, 32, (p) => brolly(p, f));
    make(scene, 'ball' + f, 22, 22, (p) => ball(p, f));
  }
  for (const pose of STORM_POSES)
    make(scene, 'boss4-' + pose, 140, 96, (p) => stormBoss(p, pose));
}
