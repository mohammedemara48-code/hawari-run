// World 3 creatures (دمياط): crab, seagull, runaway saw and plane, the
// fish-thief tomcat and the boss «أبو مقص». Same integer rasterizer as the
// other characters. Walkers face left (the game flips them to walk right).
import Phaser from 'phaser';
import { make, type Pixels, type Point } from './characters';

/** Filled ellipse as a polygon (optionally ink-outlined). */
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
/** Crab claw: a pincer opened by `open` (0..1), pointing up or sideways. */
function claw(
  p: Pixels,
  x: number,
  y: number,
  dir: number,
  up: boolean,
  open: number,
  s: number,
  shell: string,
  light: string,
) {
  const ox = up ? 0 : dir * 4 * s,
    oy = up ? -6 * s : 0;
  oval(p, x + ox, y + oy, 4 * s, 3.4 * s, shell, true);
  const tip = (a: number): Point => [
    x + ox + Math.cos(a) * 6 * s,
    y + oy + Math.sin(a) * 6 * s,
  ];
  const base = up ? -Math.PI / 2 : dir > 0 ? 0 : Math.PI;
  for (const k of [-1, 1]) {
    const a = base + k * (0.15 + open * 0.45);
    p.line([x + ox, y + oy], tip(a), 2.4 * s, shell, true);
  }
  p.r(x + ox - s, y + oy - 2 * s, 2 * s, s, light);
}
/** Crab (كابوريا): f0/f1 scuttle, f2 claws up (don't stomp!), f3 hurt. */
function crab(p: Pixels, f: number) {
  const shell = '#d2563a',
    light = '#f08a5a',
    dark = '#8a2e22';
  const guard = f === 2,
    hurt = f === 3,
    step = f === 1 ? 1 : 0;
  // Legs: three a side, alternating.
  for (let i = 0; i < 3; i++) {
    const d = (i + step) % 2 ? 1 : -1;
    p.line([10 - i * 2, 15], [3 - i * 2, 21 + d], 2, dark, true);
    p.line([24 + i * 2, 15], [31 + i * 2, 21 - d], 2, dark, true);
  }
  // Shell.
  oval(p, 17, 14, 11, 6, shell, true);
  p.r(10, 10, 12, 2, light);
  p.r(9, 17, 16, 2, dark);
  // Eye stalks.
  for (const x of [13, 21]) {
    p.r(x, hurt ? 7 : 5, 2, 5, dark);
    p.box(x - 1, hurt ? 6 : 3, 4, 3, '#fffbe8');
    p.r(x + (hurt ? 0 : 1), hurt ? 7 : 4, 1, 1, '#14100e');
  }
  claw(
    p,
    6,
    guard ? 7 : 12,
    -1,
    guard,
    guard ? 1 : step * 0.5,
    1,
    shell,
    light,
  );
  claw(
    p,
    28,
    guard ? 7 : 12,
    1,
    guard,
    guard ? 1 : step * 0.5,
    1,
    shell,
    light,
  );
}
/** Seagull (نورس): f0-f2 flap, f3 dive. Faces left. */
function gull(p: Pixels, f: number) {
  const white = '#f4f6f2',
    grey = '#9aa6b2',
    dark = '#4a5562';
  const wingY = [2, 9, 15, 4][f];
  const dive = f === 3;
  // Far wing.
  p.poly(
    [
      [16, 11],
      [26, wingY + 2],
      [31, wingY],
      [22, 12],
    ],
    grey,
    true,
  );
  // Body.
  oval(p, 16, 13, 9, 4.5, white, true);
  p.poly(
    [
      [23, 11],
      [32, 10 + (dive ? -3 : 0)],
      [31, 14],
      [24, 15],
    ],
    white,
    true,
  );
  // Head and beak (left).
  oval(p, 7, dive ? 14 : 10, 4.5, 4, white, true);
  p.poly(
    [
      [3, dive ? 14 : 10],
      [-1, dive ? 16 : 12],
      [3, dive ? 16 : 12],
    ],
    '#f2b33a',
  );
  p.r(5, dive ? 13 : 9, 1, 1, '#14100e');
  // Near wing with dark tip.
  p.poly(
    [
      [12, 12],
      [20, wingY + 4],
      [25, wingY + 1],
      [18, 13],
    ],
    grey,
    true,
  );
  p.r(21, wingY + 2, 3, 2, dark);
  p.r(14, 17, 2, 2, '#f2b33a');
}
/** Runaway circular saw (منشار): spinning teeth, frame = rotation step. */
function saw(p: Pixels, f: number) {
  const steel = '#c8d0d6',
    shade = '#7e8a94';
  oval(p, 12, 12, 9, 9, steel, true);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + (f * Math.PI) / 20;
    const o: Point = [12 + Math.cos(a) * 9, 12 + Math.sin(a) * 9];
    const t: Point = [
      12 + Math.cos(a + 0.22) * 12,
      12 + Math.sin(a + 0.22) * 12,
    ];
    const b: Point = [12 + Math.cos(a + 0.5) * 9, 12 + Math.sin(a + 0.5) * 9];
    p.poly([o, t, b], steel, true);
  }
  oval(p, 12, 12, 8, 8, steel);
  oval(p, 12, 12, 5, 5, shade);
  oval(p, 12, 12, 2.4, 2.4, '#3a3f46');
  // Motion glint.
  const a = (f * Math.PI) / 2;
  p.r(12 + Math.cos(a) * 5, 12 + Math.sin(a) * 5, 2, 2, '#ffffff');
  // Angry eyes painted on by an apprentice.
  p.r(8, 9, 2, 2, '#14100e');
  p.r(14, 9, 2, 2, '#14100e');
}
/** Runaway hand plane (فارة نجارة): f0/f1 slide, f2 dash, f3 stunned. */
function plane(p: Pixels, f: number) {
  const wood = '#b07a46',
    light = '#d8a466',
    dark = '#6e4626';
  const dash = f === 2,
    lean = dash ? 2 : 0,
    bob = f === 1 ? 1 : 0;
  // Body block, nose to the left.
  p.poly(
    [
      [2, 12 + bob],
      [6, 8 + bob - lean],
      [27, 8 + bob],
      [29, 12 + bob],
      [28, 16 + bob],
      [3, 16 + bob],
    ],
    wood,
    true,
  );
  p.r(6, 9 + bob, 20, 2, light);
  p.r(4, 14 + bob, 24, 2, dark);
  // Front knob and rear tote handle.
  oval(p, 8, 6 + bob - lean, 3, 3, '#7a3a26', true);
  p.poly(
    [
      [19, 8 + bob],
      [21, 1 + bob],
      [26, 1 + bob],
      [26, 8 + bob],
    ],
    '#7a3a26',
    true,
  );
  p.r(22, 3 + bob, 2, 3, '#14100e');
  // Steel blade and an eye.
  p.r(14, 5 + bob, 3, 4, '#c8d0d6');
  p.r(9, 11 + bob, 2, 2, f === 3 ? '#ffe36a' : '#14100e');
  // Wood shavings when dashing.
  if (dash)
    for (const [x, y] of [
      [29, 9],
      [31, 13],
    ] as Point[])
      oval(p, x, y, 2, 2, '#f0d090');
}
/** Fish-thief tomcat (قط حرامي): f0/f1 sneak, f2 runs off with a fish, f3 dizzy. */
function thief(p: Pixels, f: number) {
  const fur = '#d8822e',
    light = '#f4b060',
    stripe = '#8a4a1a';
  const run = f === 2,
    dizzy = f === 3,
    step = f === 1 ? 2 : 0;
  // Tail.
  p.line([25, 14], [31, run ? 12 : 5], 3, fur, true);
  // Legs.
  for (const [x, d] of [
    [8, step],
    [13, -step],
    [20, step],
    [24, -step],
  ] as [number, number][])
    p.line([x, 18], [x + (run ? d * 2 : d), 25], 3, fur, true);
  // Body.
  oval(p, 16, 15, 10, 5, fur, true);
  for (const x of [12, 16, 20]) p.r(x, 10, 2, 5, stripe);
  p.r(10, 18, 12, 2, light);
  // Head (left) with ears.
  oval(p, 7, 11, 6, 5, fur, true);
  p.poly(
    [
      [2, 8],
      [3, 2],
      [7, 6],
    ],
    fur,
    true,
  );
  p.poly(
    [
      [8, 6],
      [11, 2],
      [12, 8],
    ],
    fur,
    true,
  );
  p.r(4, 14, 6, 2, light);
  if (dizzy) {
    p.r(4, 10, 2, 1, '#14100e');
    p.r(8, 10, 2, 1, '#14100e');
  } else {
    p.r(4, 9, 2, 2, '#9ae36a');
    p.r(8, 9, 2, 2, '#9ae36a');
    p.r(4, 10, 1, 1, '#14100e');
    p.r(8, 10, 1, 1, '#14100e');
  }
  // A stolen fish in its jaws.
  if (run) {
    p.poly(
      [
        [-1, 14],
        [4, 12],
        [9, 14],
        [4, 16],
      ],
      '#9ab8c8',
      true,
    );
    p.poly(
      [
        [-1, 14],
        [-3, 11],
        [-3, 17],
      ],
      '#9ab8c8',
    );
  }
}
/** Boss «أبو مقص»: a giant harbour crab, front-on, 120×70. */
export const CRAB_POSES = [
  'idle0',
  'idle1',
  'guard',
  'snap',
  'stuck',
  'spit',
  'hurt',
  'dead',
];
function bossCrab(p: Pixels, pose: string) {
  const shell = '#c8442e',
    light = '#f07a4e',
    dark = '#7a2418',
    belly = '#f0c8a0';
  const guard = pose === 'guard',
    snap = pose === 'snap',
    stuck = pose === 'stuck',
    hurt = pose === 'hurt',
    dead = pose === 'dead',
    step = pose === 'idle1' ? 2 : 0;
  const by = dead ? 10 : 0;
  // Six legs.
  for (let i = 0; i < 3; i++) {
    const d = (i + step) % 2 ? 2 : -2;
    p.line([40 - i * 6, 46 + by], [22 - i * 7, 64 + d], 5, dark, true);
    p.line([80 + i * 6, 46 + by], [98 + i * 7, 64 - d], 5, dark, true);
  }
  // Carapace with spiny rim and a barnacle crust.
  oval(p, 60, 42 + by, 34, 17, shell, true);
  for (let i = 0; i < 9; i++)
    p.poly(
      [
        [30 + i * 7, 30 + by],
        [33 + i * 7, 24 + by + (i % 2) * 2],
        [36 + i * 7, 30 + by],
      ],
      shell,
      true,
    );
  oval(p, 60, 38 + by, 26, 8, light);
  oval(p, 60, 51 + by, 24, 5, belly);
  for (const [x, y] of [
    [44, 36],
    [76, 34],
    [70, 44],
  ] as Point[])
    oval(p, x, y + by, 3, 2, '#e8e0d0', true);
  // Eyes on stalks, angry brows.
  for (const x of [50, 70]) {
    p.r(x, 18 + by, 3, 12, dark);
    oval(p, x + 1.5, 16 + by, 5, 5, '#fffbe8', true);
    const look = hurt || dead ? 0 : snap ? 1 : 0;
    p.r(x + look, 15 + by, 3, 3, dead ? '#7a2418' : '#14100e');
    if (dead) p.r(x - 2, 16 + by, 7, 1, '#14100e');
    p.line([x - 4, 9 + by], [x + 6, 12 + by], 2, '#14100e');
  }
  p.r(54, 30 + by, 12, 2, '#14100e');
  // Claws: raised (guard), thrust out (snap), buried in the sand (stuck).
  const claws = (side: number) => {
    const x = 60 + side * 40;
    if (guard) {
      p.line([60 + side * 26, 40], [x, 18], 7, shell, true);
      claw(p, x, 18, side, true, 1, 2.2, shell, light);
    } else if (snap) {
      p.line([60 + side * 26, 42], [x + side * 8, 40], 7, shell, true);
      claw(p, x + side * 8, 40, side, false, 0.2, 2.2, shell, light);
    } else if (stuck) {
      p.line([60 + side * 26, 46], [x, 62], 7, shell, true);
      claw(p, x, 64, side, false, 0, 2.2, shell, light);
      p.r(x - 10, 64, 20, 6, '#d8c08a');
    } else {
      const lift = pose === 'spit' ? -4 : step;
      p.line([60 + side * 26, 44 + by], [x, 38 + by + lift], 7, shell, true);
      claw(p, x, 38 + by + lift, side, false, 0.6, 2.2, shell, light);
    }
  };
  claws(-1);
  claws(1);
  if (pose === 'spit') oval(p, 60, 33, 5, 4, '#9ad8f0', true);
  if (hurt)
    for (const [x, y] of [
      [30, 18],
      [92, 20],
    ] as Point[])
      p.r(x, y, 4, 4, '#ffe36a');
}
export function makeSeaCreatures(scene: Phaser.Scene) {
  if (scene.textures.exists('crab0')) return;
  for (let f = 0; f < 4; f++) {
    make(scene, 'crab' + f, 34, 24, (p) => crab(p, f));
    make(scene, 'gull' + f, 34, 22, (p) => gull(p, f));
    make(scene, 'saw' + f, 24, 24, (p) => saw(p, f));
    make(scene, 'plane' + f, 32, 20, (p) => plane(p, f));
    make(scene, 'thief' + f, 34, 27, (p) => thief(p, f));
  }
  for (const pose of CRAB_POSES)
    make(scene, 'boss3-' + pose, 124, 72, (p) => bossCrab(p, pose));
}
