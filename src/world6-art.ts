// World 6 (أسوان) art: a Nubian village of plastered mud walls painted
// sky blue, ochre, rose and turquoise with white zigzag and triangle
// borders, flat roofs with little parapets, palm-wood platforms, granite
// boulders in the Nile, the steel sluice gates of the old dam, the palm
// frond weapon, the Nile crocodile and the great crocodile boss. Drawn in
// code like the rest of the game; everything faces left.
import Phaser from 'phaser';
import type { Theme } from './level-data';
import { disc, hash, poly, rect, tex, type Palette } from './art-kit';
import { make, type Pixels, type Point } from './characters';

type C = CanvasRenderingContext2D;
const T = 24;
export const W6_PALETTES: Record<'nubia', Palette> = {
  // Bright Upper-Egypt sun on painted plaster.
  nubia: {
    sky: [
      [0, '#2a86c8'],
      [0.6, '#8ac8e8'],
      [1, '#f4e4c0'],
    ],
    stone: ['#6aa8d8', '#e8b048', '#e88a8a', '#4ab8a8'],
    mortar: '#f4f0e4',
    top: ['#f0dcae', '#f6e4b8', '#e8d0a0'],
    wood: ['#7a5232', '#9a6a40', '#4e3420'],
    accent: '#2a8ac8',
    glow: '#fff0c0',
    window: '#2a1c12',
    windowLit: '#ffe0a0',
    fog: '#f4e8d0',
  },
};
export const isW6 = (theme: Theme) => theme === 'nubia';
const WHITE = '#f8f4ea',
  INK = '#1d1416';
/** One painted house colour per stretch of wall (changes every 4 columns). */
const wallColour = (col: number) =>
  ['#5aa0d8', '#e8a83a', '#e48484', '#3ab0a0', '#8a7ad0'][
    Math.floor(hash(Math.floor(col / 4), 3) * 5)
  ];

/* ───────────── Tiles ───────────── */
export function w6Stone(c: C, x: number, y: number, col: number, row: number) {
  const base = wallColour(col);
  rect(c, x, y, T, T, base);
  // Hand-smoothed plaster: soft lighter and darker patches.
  const h = hash(col, row);
  rect(c, x + 2 + Math.floor(h * 10), y + 3, 8, 3, '#ffffff1c');
  rect(c, x + Math.floor(h * 14), y + 15, 9, 2, '#0000000f');
  if (row >= 13) {
    // The foot of the wall: a whitewashed plinth splashed with mud.
    rect(c, x, y, T, T, '#e8dcc4');
    rect(c, x, y, T, 1, '#c8b898');
    if (h > 0.6) rect(c, x + 6, y + 8, 5, 2, '#b89a6a');
  }
}
export function w6Cap(c: C, x: number, y: number, col: number, row: number) {
  w6Stone(c, x, y, col, row);
  // A white painted border of triangles under a flat roof parapet.
  rect(c, x, y, T, 5, WHITE);
  rect(c, x, y, T, 1, '#ffffff');
  rect(c, x, y + 5, T, 1, '#c8c0b0');
  for (let i = 0; i < T; i += 6)
    poly(
      c,
      [
        [x + i, y + 6],
        [x + i + 6, y + 6],
        [x + i + 3, y + 10],
      ],
      WHITE,
    );
  if (hash(col, row, 7) > 0.75) rect(c, x + 9, y - 3, 6, 3, '#d8c8a8');
}
export function w6Window(c: C, x: number, y: number, col: number, row: number) {
  w6Stone(c, x, y, col, row);
  // An arched window in a white frame with painted wooden shutters.
  rect(c, x + 5, y + 6, 14, 14, WHITE);
  disc(c, x + 12, y + 7, 7, WHITE);
  rect(c, x + 7, y + 8, 10, 11, '#2a1c12');
  disc(c, x + 12, y + 8, 5, '#2a1c12');
  const sh = hash(col, row, 5) > 0.5 ? '#2a8ac8' : '#3aa060';
  rect(c, x + 7, y + 10, 3, 9, sh);
  rect(c, x + 14, y + 10, 3, 9, sh);
}
export function w6Slab(c: C, x: number, y: number) {
  // Palm-trunk planks lashed with rope.
  rect(c, x, y, T, 12, '#3e2a18');
  rect(c, x, y + 1, T, 9, '#9a6a40');
  for (let i = 2; i < T; i += 5) rect(c, x + i, y + 2, 1, 7, '#6a4628');
  rect(c, x, y + 1, T, 1, '#c89a68');
  rect(c, x + 10, y, 2, 11, '#d8c090');
}
export function w6Ledge(c: C, x: number, y: number, end: number) {
  // A reed-mat sunshade on palm poles.
  rect(c, x, y, T, 6, '#6a4a2a');
  rect(c, x, y, T, 4, '#d8b870');
  for (let i = 1; i < T; i += 3) rect(c, x + i, y, 1, 4, '#b89850');
  if (end) rect(c, x + (end < 0 ? 1 : T - 3), y + 4, 2, 10, '#6a4a2a');
}
/** A granite boulder cell (solid rock standing in the river). */
export function graniteCell(
  c: C,
  x: number,
  y: number,
  col: number,
  row: number,
) {
  rect(c, x, y, T, T, '#7a5a5a');
  for (let i = 0; i < 6; i++)
    rect(
      c,
      x + Math.floor(hash(col, row, i) * 22),
      y + Math.floor(hash(col, row, i + 9) * 22),
      2,
      2,
      i % 2 ? '#a88080' : '#4a3434',
    );
}

/* ───────────── Near layer ───────────── */
export function w6Near(c: C, W: number) {
  // Strings of bright bunting across the top, and palm fronds.
  const cols = ['#e84a4a', '#f4c040', '#2a8ac8', '#3ab070', '#f8f4ea'];
  for (let x = 0; x < W; x += 240) {
    c.strokeStyle = '#3a2a20';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(x, 4);
    c.quadraticCurveTo(x + 120, 34, x + 240, 4);
    c.stroke();
    for (let k = 1; k < 12; k++) {
      const t = k / 12,
        px = x + t * 240,
        py = 4 + 4 * t * (1 - t) * 30;
      poly(
        c,
        [
          [px - 5, py],
          [px + 5, py],
          [px, py + 10],
        ],
        cols[k % cols.length],
      );
    }
  }
  for (let x = 120; x < W; x += 480)
    for (let k = 0; k < 6; k++) {
      const a = -0.3 + k * 0.6;
      poly(
        c,
        [
          [x, 0],
          [x + Math.cos(a) * 90, Math.sin(a) * 26 + 30],
          [x + 4 + Math.cos(a) * 80, Math.sin(a) * 26 + 22],
        ],
        '#1e3418',
      );
    }
}

/* ───────────── Creatures ───────────── */
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
const SKIN = '#4a6a34',
  SKIN_D = '#2e4620',
  BELLY = '#c8c078';
/** A crocodile drawn into a box `w`×`h`, facing left. `gape` opens the
 * upper jaw (0..1), `step` swaps the legs. */
function croc(
  p: Pixels,
  w: number,
  h: number,
  gape: number,
  step: number,
  vs = 1,
) {
  const k = w / 44;
  const s = (v: number) => v * k;
  // Vertical measures (the boss is drawn chunkier so he reads at a glance).
  const u = (v: number) => v * k * vs;
  const base = h - u(3);
  // Tail tapering away to the right with its ridge of scutes.
  p.poly(
    [
      [s(26), base - u(9)],
      [w - 1, base - u(4)],
      [s(26), base - u(2)],
    ],
    SKIN,
    true,
  );
  for (let i = 0; i < 5; i++)
    p.r(s(28 + i * 3), base - u(8 - i * 0.8), s(1.6), s(1.4), SKIN_D);
  // Legs.
  for (const [lx, d] of [
    [s(14), step],
    [s(26), -step],
  ])
    p.line(
      [lx, base - u(3)],
      [lx - s(2) + d * s(2), base],
      s(2.4),
      SKIN_D,
      true,
    );
  // Body.
  oval(p, s(20), base - u(5), s(11), u(4.6), SKIN, true);
  p.r(s(11), base - u(2.6), s(18), u(1.6), BELLY);
  for (let i = 0; i < 5; i++)
    p.r(s(13 + i * 3.4), base - u(9.4), s(1.8), s(1.6), SKIN_D);
  // Lower jaw.
  p.poly(
    [
      [s(10), base - u(5)],
      [s(0.5), base - u(3)],
      [s(10), base - u(1.6)],
    ],
    SKIN,
    true,
  );
  // Upper jaw, hinged at the eye; open shows pink and white teeth.
  const lift = gape * u(7);
  if (gape > 0) {
    p.poly(
      [
        [s(10), base - u(5)],
        [s(1.5), base - u(4) - lift],
        [s(1.5), base - u(3.4)],
      ],
      '#e87a8a',
    );
    for (let i = 0; i < 3; i++) {
      p.r(s(3 + i * 2.4), base - u(4.4), s(0.9), s(1.2), WHITE);
      p.r(
        s(3 + i * 2.4),
        base - u(5.4) - lift * (1 - i * 0.25),
        s(0.9),
        s(1.2),
        WHITE,
      );
    }
  }
  p.poly(
    [
      [s(11), base - u(8)],
      [s(0.5), base - u(5.2) - lift],
      [s(1.5), base - u(3.6) - lift],
      [s(11), base - u(4.6)],
    ],
    SKIN,
    true,
  );
  for (let i = 0; i < 3; i++)
    p.r(s(3 + i * 2.6), base - u(4.4) - lift * 0.6, s(0.9), s(1.1), WHITE);
  // Eye bump with a yellow eye.
  oval(p, s(10), base - u(8.4), s(2), u(1.6), SKIN, true);
  p.r(s(9), base - u(9.2), s(1.4), s(1.2), '#f4d040');
  p.r(s(9.4), base - u(9), s(0.6), s(0.8), INK);
  p.r(s(1), base - u(5.6) - lift, s(1), s(0.8), SKIN_D);
}
export const CROC_POSES = [
  'idle0',
  'idle1',
  'gape',
  'lunge',
  'stuck',
  'tail',
  'hurt',
  'dead',
] as const;
function crocBoss(p: Pixels, pose: (typeof CROC_POSES)[number]) {
  const W = 168,
    H = 88;
  const gape =
    pose === 'gape' ? 1 : pose === 'lunge' ? 0.7 : pose === 'stuck' ? 0.9 : 0;
  croc(p, W, H, gape, pose === 'idle1' ? 1 : 0, 1.6);
  if (pose === 'stuck') {
    // Jaws dug into the sand: a puff of sand, and dizzy stars over the head.
    for (let i = 0; i < 5; i++)
      p.r(4 + i * 7, H - 6 - (i % 2) * 3, 5, 3, '#e8d0a0');
    for (const [sx, sy] of [
      [30, 6],
      [42, 2],
      [54, 8],
    ]) {
      p.r(sx, sy, 4, 1, '#ffe060');
      p.r(sx + 1.5, sy - 1.5, 1, 4, '#ffe060');
    }
  }
  if (pose === 'tail')
    for (let i = 0; i < 4; i++) p.r(140 + i * 6, 30 + i * 6, 8, 2, '#c8f0ff');
  if (pose === 'lunge')
    for (let i = 0; i < 4; i++) p.r(150 + i * 4, 40 + i * 6, 12, 2, '#e8d0a0');
  if (pose === 'hurt')
    for (let i = 0; i < 3; i++) p.r(40 + i * 18, 18 - i * 3, 6, 6, '#ffffff');
}

/* ───────────── Props ───────────── */
export function makeAswanProps(scene: Phaser.Scene) {
  if (scene.textures.exists('frond')) return;
  for (let f = 0; f < 4; f++)
    make(scene, 'croc' + f, 44, 22, (p) =>
      croc(p, 44, 22, f === 2 ? 1 : f === 3 ? 0.6 : 0, f === 1 ? 1 : 0),
    );
  for (const pose of CROC_POSES)
    make(scene, 'boss6-' + pose, 168, 88, (p) => crocBoss(p, pose));
  // The palm frond: a green rib with leaflets, pickup and in flight.
  const frond = (c: C, w: number, h: number) => {
    c.strokeStyle = INK;
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(2, h - 2);
    c.quadraticCurveTo(w * 0.4, h * 0.3, w - 2, 2);
    c.stroke();
    c.strokeStyle = '#c8a050';
    c.lineWidth = 1.4;
    c.stroke();
    for (let t = 0.2; t < 1; t += 0.12) {
      const x = (1 - t) ** 2 * 2 + 2 * (1 - t) * t * w * 0.4 + t * t * (w - 2);
      const y = (1 - t) ** 2 * (h - 2) + 2 * (1 - t) * t * h * 0.3 + t * t * 2;
      const l = 7 * (1.1 - t);
      rect(c, x - l, y, l, 2, '#2a7a2a');
      rect(c, x, y + 1, 2, l, '#3a9a3a');
    }
  };
  tex(scene, 'frond', 24, 24, (c) => frond(c, 24, 24));
  tex(scene, 'frondshot', 20, 20, (c) => frond(c, 20, 20));
  // A steel sluice-gate panel with rivets, and the gear head above it.
  tex(scene, 'gate-steel', 24, 24, (c) => {
    rect(c, 0, 0, 24, 24, '#3a4a52');
    rect(c, 2, 0, 20, 24, '#6a7e88');
    rect(c, 2, 11, 20, 2, '#3a4a52');
    for (const [rx, ry] of [
      [4, 3],
      [18, 3],
      [4, 17],
      [18, 17],
    ])
      rect(c, rx, ry, 2, 2, '#c8d4d8');
    rect(c, 2, 0, 20, 1, '#9ab0b8');
  });
  tex(scene, 'gate-gear', 24, 12, (c) => {
    disc(c, 12, 8, 7, '#2a3238');
    disc(c, 12, 8, 4, '#e8a83a');
    rect(c, 0, 8, 24, 3, '#2a3238');
  });
  // The tail-splash wave the great crocodile sends along the sand.
  tex(scene, 'splash', 34, 22, (c) => {
    poly(
      c,
      [
        [0, 22],
        [6, 6],
        [14, 0],
        [22, 8],
        [34, 22],
      ],
      '#1e5a7a',
    );
    poly(
      c,
      [
        [3, 22],
        [8, 8],
        [14, 3],
        [20, 10],
        [30, 22],
      ],
      '#7ad0f0',
    );
    rect(c, 10, 4, 6, 2, '#ffffff');
    rect(c, 6, 12, 3, 2, '#e8f8ff');
  });
}
