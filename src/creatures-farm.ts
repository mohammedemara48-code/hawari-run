// World 2 creatures: water buffalo, goose, crow and the boss «أبو قرون».
// Same integer rasterizer as the other characters. Enemies face left
// (they start walking left); the boss faces right like the Cairo boss.
import Phaser from 'phaser';
import { P, make, type Pixels } from './characters';

/** Water buffalo (جاموسة): f0/f1 walk, f2 snort/charge, f3 dizzy. */
function buffalo(p: Pixels, f: number) {
  const hide = '#3a3640',
    light = '#5e5866',
    dark = '#242028',
    horn = '#d8ccb0';
  const charge = f === 2,
    dizzy = f === 3,
    step = f === 1 ? 2 : 0;
  const hy = charge ? 5 : 0;
  // Tail.
  p.line([48, 12], [51, 24], 2, dark, true);
  // Legs (behind the body).
  for (const [x, d] of [
    [14, step],
    [22, -step],
    [36, step],
    [43, -step],
  ] as [number, number][]) {
    p.line([x, 26], [x + d, 36], 4, dark, true);
    p.r(x + d - 2, 35, 5, 2, '#14100e');
  }
  // Barrel body.
  p.poly(
    [
      [12, 12],
      [24, 8],
      [44, 9],
      [50, 14],
      [48, 28],
      [14, 29],
      [9, 22],
    ],
    hide,
    true,
  );
  p.poly(
    [
      [16, 11],
      [40, 10],
      [44, 13],
      [18, 15],
    ],
    light,
  );
  p.r(18, 25, 26, 3, dark);
  // Head lowered when charging, with swept-back crescent horns.
  p.poly(
    [
      [2, 16 + hy],
      [6, 10 + hy],
      [16, 9 + hy],
      [18, 18 + hy],
      [10, 24 + hy],
      [3, 23 + hy],
    ],
    hide,
    true,
  );
  p.r(2, 19 + hy, 6, 4, '#6e646e');
  p.r(3, 20 + hy, 1, 1, P.ink);
  p.r(6, 20 + hy, 1, 1, P.ink);
  p.poly(
    [
      [6, 10 + hy],
      [12, 3 + hy],
      [22, 1 + hy],
      [26, 5 + hy],
      [20, 4 + hy],
      [13, 8 + hy],
    ],
    horn,
    true,
  );
  if (dizzy) {
    p.r(8, 13 + hy, 3, 1, P.ink);
    p.r(9, 12 + hy, 1, 3, P.ink);
  } else {
    p.r(8, 13 + hy, 3, 2, charge ? '#ff5a3a' : '#f4e8d0');
    p.r(8, 13 + hy, 1, 2, P.ink);
  }
  if (charge) {
    // Snorting steam.
    p.r(0, 18 + hy, 2, 1, '#ffffff');
    p.r(0, 22 + hy, 2, 1, '#ffffff');
  }
}

/** Goose (وزة): f0/f1 waddle, f2 honk with wings up, f3 hop. */
function goose(p: Pixels, f: number) {
  const white = '#f4f0e6',
    shade = '#c8c0b0',
    orange = '#f0902a';
  const honk = f === 2 || f === 3,
    step = f === 1 ? 2 : 0,
    lift = f === 3 ? -3 : 0;
  // Legs.
  p.line([14 + step, 20 + lift], [13 + step, 26 + lift], 2, orange, true);
  p.line([19 - step, 20 + lift], [20 - step, 26 + lift], 2, orange, true);
  p.r(10 + step, 26 + lift, 5, 1, orange);
  p.r(18 - step, 26 + lift, 5, 1, orange);
  // Body.
  p.poly(
    [
      [8, 14 + lift],
      [18, 10 + lift],
      [28, 12 + lift],
      [26, 20 + lift],
      [12, 22 + lift],
    ],
    white,
    true,
  );
  p.poly(
    [
      [14, 16 + lift],
      [26, 14 + lift],
      [24, 19 + lift],
      [14, 20 + lift],
    ],
    shade,
  );
  if (honk)
    p.poly(
      [
        [16, 12 + lift],
        [26, 2 + lift],
        [29, 6 + lift],
        [22, 14 + lift],
      ],
      white,
      true,
    );
  // Neck and head (stretched forward when honking).
  const nx = honk ? -4 : 0,
    ny = honk ? 4 : 0;
  p.line([10, 15 + lift], [6 + nx, 4 + ny + lift], 4, white, true);
  p.poly(
    [
      [3 + nx, 3 + ny + lift],
      [9 + nx, 2 + ny + lift],
      [10 + nx, 7 + ny + lift],
      [4 + nx, 8 + ny + lift],
    ],
    white,
    true,
  );
  p.poly(
    [
      [0 + nx, 5 + ny + lift],
      [4 + nx, 4 + ny + lift],
      [4 + nx, 7 + ny + lift],
      [0 + nx, 7 + ny + lift],
    ],
    orange,
    true,
  );
  if (honk) p.r(1 + nx, 6 + ny + lift, 3, 1, '#c83a1a');
  p.r(6 + nx, 4 + ny + lift, 1, 1, P.ink);
}

/** Hooded crow (غراب): f0..2 flap, f3 dive. */
function crow(p: Pixels, f: number) {
  const black = '#1e1c24',
    grey = '#8a8890',
    sheen = '#3a3a5a';
  const dive = f === 3,
    lift = [-5, 0, 4][f] ?? 0;
  if (!dive)
    p.poly(
      [
        [16, 10],
        [24, 3 + lift],
        [30, 5 + lift],
        [22, 13],
      ],
      black,
      true,
    );
  p.poly(
    dive
      ? [
          [8, 4],
          [20, 6],
          [24, 14],
          [14, 20],
          [6, 12],
        ]
      : [
          [5, 10],
          [12, 8],
          [24, 10],
          [28, 14],
          [18, 17],
          [8, 15],
        ],
    grey,
    true,
  );
  // Black head, wings and tail of the hooded crow.
  p.poly(
    dive
      ? [
          [4, 12],
          [9, 9],
          [12, 16],
          [6, 20],
        ]
      : [
          [2, 8],
          [8, 6],
          [11, 12],
          [5, 13],
        ],
    black,
    true,
  );
  p.poly(
    dive
      ? [
          [2, 18],
          [6, 17],
          [3, 22],
        ]
      : [
          [0, 10],
          [3, 9],
          [3, 11],
        ],
    '#3a3a3a',
    true,
  );
  if (!dive)
    p.poly(
      [
        [10, 11],
        [16, 3 + lift],
        [21, 5 + lift],
        [15, 12],
      ],
      sheen,
      true,
    );
  p.poly(
    dive
      ? [
          [20, 4],
          [27, 1],
          [25, 7],
        ]
      : [
          [26, 12],
          [30, 10],
          [30, 16],
        ],
    black,
    true,
  );
  p.r(dive ? 7 : 5, dive ? 13 : 9, 1, 1, '#ffd36b');
}

/** «أبو قرون»: a giant water buffalo wearing a farmer's tasseled harness. */
function bossBuffalo(p: Pixels, pose: string) {
  const hide = '#34303a',
    light = '#58525e',
    dark = '#1e1a22',
    horn = '#e4d8bc',
    cloth = '#c8343c',
    gold = '#ffd76a';
  const crouch = pose === 'crouch' ? 6 : 0,
    charge = pose === 'charge',
    leap = pose === 'leap',
    dazed = pose === 'dazed' || pose === 'dead',
    hurt = pose === 'hurt',
    bob = pose === 'idle1' ? 1 : 0,
    y = crouch + bob;
  const step = charge ? 4 : 0;
  // Tail with a tuft.
  p.line([8, 22 + y], [3, 40], 3, dark, true);
  p.box(1, 40, 4, 5, dark);
  // Legs.
  for (const [x, d] of [
    [18, step],
    [30, -step],
    [62, step],
    [72, -step],
  ] as [number, number][]) {
    if (leap) p.line([x, 46], [x + d - 4, 58], 7, dark, true);
    else p.line([x, 46], [x + d, 62], 7, dark, true);
    p.r(x + d - 4, leap ? 57 : 61, 8, 3, '#100c0e');
  }
  // Barrel body.
  p.poly(
    [
      [10, 22 + y],
      [30, 14 + y],
      [70, 14 + y],
      [82, 24 + y],
      [80, 48],
      [14, 50],
      [8, 36],
    ],
    hide,
    true,
  );
  p.poly(
    [
      [16, 20 + y],
      [66, 17 + y],
      [74, 22 + y],
      [20, 26 + y],
    ],
    light,
  );
  p.r(20, 44, 56, 3, dark);
  // Harness: red blanket with gold tassels.
  p.poly(
    [
      [30, 15 + y],
      [58, 15 + y],
      [60, 36 + y],
      [28, 36 + y],
    ],
    cloth,
    true,
  );
  for (let x = 30; x < 60; x += 5) p.r(x, 36 + y, 2, 4, gold);
  p.r(30, 24 + y, 30, 2, gold);
  // Head (faces right), lowered for a charge.
  const hx = hurt ? -3 : 0,
    hy = y + (charge ? 8 : 0) + (leap ? -2 : 0);
  p.poly(
    [
      [74 + hx, 20 + hy],
      [86 + hx, 14 + hy],
      [96 + hx, 22 + hy],
      [97 + hx, 36 + hy],
      [88 + hx, 42 + hy],
      [78 + hx, 36 + hy],
    ],
    hide,
    true,
  );
  p.poly(
    [
      [88 + hx, 32 + hy],
      [97 + hx, 32 + hy],
      [96 + hx, 40 + hy],
      [88 + hx, 41 + hy],
    ],
    '#6a606a',
  );
  p.r(91 + hx, 35 + hy, 1, 2, P.ink);
  p.r(95 + hx, 35 + hy, 1, 2, P.ink);
  // Nose ring.
  p.r(92 + hx, 40 + hy, 3, 3, gold);
  p.r(93 + hx, 41 + hy, 1, 1, hide);
  // Huge water-buffalo horns: thick, ridged crescents sweeping back
  // over the neck and curling down at the tips.
  const hornPath = (ox: number, oy: number, k: number) =>
    p.poly(
      [
        [86 + ox, 18 + oy],
        [80 + ox, 10 + oy - k],
        [70 + ox, 6 + oy - k],
        [60 + ox, 8 + oy - k],
        [54 + ox, 14 + oy],
        [56 + ox, 18 + oy],
        [61 + ox, 14 + oy - k / 2],
        [70 + ox, 12 + oy - k / 2],
        [78 + ox, 15 + oy],
        [82 + ox, 21 + oy],
      ],
      horn,
      true,
    );
  hornPath(hx - 2, hy + 1, 0);
  hornPath(hx + 4, hy - 1, 2);
  for (const rx of [64, 70, 76]) p.r(rx + hx + 4, 9 + hy, 1, 4, '#b8ac90');
  if (dazed) {
    for (const ex of [82, 90]) {
      p.r(ex + hx, 25 + hy, 5, 1, P.ink);
      p.r(ex + 2 + hx, 23 + hy, 1, 5, P.ink);
    }
  } else {
    const angry = charge || pose === 'crouch' || leap;
    p.r(83 + hx, 23 + hy, 4, 3, angry ? '#ff5a3a' : '#f4e8d0');
    p.r(85 + hx, 23 + hy, 2, 3, P.ink);
    p.r(81 + hx, angry ? 22 + hy : 21 + hy, 7, 1, P.ink);
  }
  if (pose === 'crouch') {
    // Snort clouds.
    p.r(98, 38 + hy, 2, 2, '#ffffff');
    p.r(96, 44 + hy, 3, 1, '#ffffff');
  }
}

export const BOSS2_POSES = [
  'idle0',
  'idle1',
  'crouch',
  'charge',
  'leap',
  'dazed',
  'hurt',
  'dead',
];

export function makeFarmCreatures(scene: Phaser.Scene) {
  if (scene.textures.exists('buffalo0')) return;
  for (let f = 0; f < 4; f++) {
    make(scene, 'buffalo' + f, 52, 38, (p) => buffalo(p, f));
    make(scene, 'goose' + f, 31, 28, (p) => goose(p, f));
    make(scene, 'crow' + f, 31, 23, (p) => crow(p, f));
  }
  for (const pose of BOSS2_POSES)
    make(scene, 'boss2-' + pose, 100, 66, (p) => bossBuffalo(p, pose));
}
