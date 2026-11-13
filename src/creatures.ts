// Original pixel creatures for the reworked levels: bat, rooster, pigeon,
// sewer rat and the boss «الفتوة برعي». Drawn with the same integer
// rasterizer as the hero (outlined, palette-only, no smoothing).
import Phaser from 'phaser';
import { P, make, type Pixels } from './characters';

function bat(p: Pixels, f: number) {
  const body = '#4b3f63',
    light = '#7a6a9a',
    wing = '#33294a',
    wingLight = '#5d4f7e';
  if (f === 0) {
    // Hanging upside-down, wings folded.
    p.line([16, 0], [16, 4], 1, P.ink);
    p.poly(
      [
        [10, 4],
        [22, 4],
        [24, 14],
        [19, 21],
        [13, 21],
        [8, 14],
      ],
      wing,
      true,
    );
    p.poly(
      [
        [12, 6],
        [20, 6],
        [21, 13],
        [16, 17],
        [11, 13],
      ],
      body,
    );
    p.r(13, 7, 2, 5, light);
    p.r(12, 15, 3, 2, '#ffd36b');
    p.r(17, 15, 3, 2, '#ffd36b');
    p.r(13, 15, 1, 2, P.ink);
    p.r(18, 15, 1, 2, P.ink);
    p.poly(
      [
        [12, 21],
        [13, 24],
        [15, 21],
      ],
      body,
    );
    p.poly(
      [
        [17, 21],
        [19, 24],
        [20, 21],
      ],
      body,
    );
    return;
  }
  const lift = [0, -6, 0, 5][f];
  p.poly(
    [
      [14, 11],
      [6, 6 + lift],
      [0, 9 + lift],
      [3, 12 + lift / 2],
      [2, 16],
      [8, 14],
      [12, 17],
    ],
    wing,
    true,
  );
  p.poly(
    [
      [18, 11],
      [26, 6 + lift],
      [32, 9 + lift],
      [29, 12 + lift / 2],
      [30, 16],
      [24, 14],
      [20, 17],
    ],
    wing,
    true,
  );
  p.line([13, 11], [5, 7 + lift], 1, wingLight);
  p.line([19, 11], [27, 7 + lift], 1, wingLight);
  p.poly(
    [
      [11, 8],
      [21, 8],
      [22, 16],
      [16, 20],
      [10, 16],
    ],
    body,
    true,
  );
  p.poly(
    [
      [11, 8],
      [12, 3],
      [14, 8],
    ],
    body,
    true,
  );
  p.poly(
    [
      [18, 8],
      [20, 3],
      [21, 8],
    ],
    body,
    true,
  );
  p.r(13, 9, 6, 2, light);
  p.r(12, 11, 3, 2, '#ffd36b');
  p.r(17, 11, 3, 2, '#ffd36b');
  p.r(13, 11, 1, 2, P.ink);
  p.r(18, 11, 1, 2, P.ink);
  p.r(14, 15, 1, 2, '#ffffff');
  p.r(17, 15, 1, 2, '#ffffff');
}

function rooster(p: Pixels, f: number) {
  const angry = f === 2,
    dizzy = f === 3,
    step = f === 1 ? 2 : 0;
  const feather = angry ? '#ff7a4d' : '#e8dcc0',
    shade = angry ? '#b84a2c' : '#b8a888';
  // Tail plume.
  p.poly(
    [
      [3, 6],
      [10, 12],
      [9, 20],
      [2, 16],
    ],
    '#2f6b55',
    true,
  );
  p.poly(
    [
      [6, 3],
      [12, 11],
      [6, 13],
    ],
    '#4b9a6f',
    true,
  );
  p.r(4, 8, 2, 6, '#d24a3a');
  // Body.
  p.poly(
    [
      [8, 12],
      [21, 10],
      [26, 15],
      [23, 24],
      [11, 25],
      [7, 19],
    ],
    feather,
    true,
  );
  p.poly(
    [
      [10, 18],
      [20, 17],
      [22, 22],
      [12, 23],
    ],
    shade,
  );
  p.poly(
    [
      [12, 14],
      [19, 13],
      [17, 18],
      [11, 18],
    ],
    '#c7533b',
  );
  // Neck and head (lowered when charging).
  const hy = angry ? 6 : 0;
  p.poly(
    [
      [19, 12 + hy / 2],
      [23, 3 + hy],
      [28, 4 + hy],
      [27, 12 + hy],
      [23, 15],
    ],
    feather,
    true,
  );
  p.poly(
    [
      [22, 3 + hy],
      [23, 0 + hy],
      [25, 2 + hy],
      [27, 0 + hy],
      [28, 4 + hy],
    ],
    '#e8313f',
    true,
  );
  p.poly(
    [
      [28, 6 + hy],
      [32, 7 + hy],
      [28, 9 + hy],
    ],
    '#f2b33a',
    true,
  );
  p.r(26, 10 + hy, 2, 3, '#e8313f');
  if (dizzy) {
    p.r(24, 5 + hy, 3, 1, P.ink);
    p.r(25, 4 + hy, 1, 3, P.ink);
  } else {
    p.r(24, 5 + hy, 2, 2, '#ffffff');
    p.r(25, 5 + hy, 1, 2, P.ink);
  }
  // Legs.
  p.line([14 + step, 24], [13 + step, 30], 2, '#e0a23a', true);
  p.line([19 - step, 24], [20 - step, 30], 2, '#e0a23a', true);
  p.r(11 + step, 30, 5, 1, '#e0a23a');
  p.r(18 - step, 30, 5, 1, '#e0a23a');
}

function pigeon(p: Pixels, f: number) {
  const grey = '#8f9bb4',
    dark = '#5a6480',
    light = '#c9d2e6';
  const dive = f === 3,
    lift = [-5, 0, 4][f] ?? 0;
  if (!dive) {
    p.poly(
      [
        [12, 9],
        [4, 3 + lift],
        [0, 6 + lift],
        [6, 12],
      ],
      dark,
      true,
    );
  }
  p.poly(
    dive
      ? [
          [6, 6],
          [18, 8],
          [24, 16],
          [16, 20],
          [6, 12],
        ]
      : [
          [3, 12],
          [10, 8],
          [20, 9],
          [24, 13],
          [18, 17],
          [8, 17],
        ],
    grey,
    true,
  );
  p.poly(
    dive
      ? [
          [16, 13],
          [22, 14],
          [24, 19],
          [19, 21],
        ]
      : [
          [18, 9],
          [24, 7],
          [27, 10],
          [24, 13],
        ],
    '#6fa59a',
    true,
  );
  if (dive) {
    p.poly(
      [
        [8, 7],
        [14, 3],
        [18, 8],
      ],
      dark,
      true,
    );
    p.r(21, 16, 2, 2, '#ff9a4a');
    p.r(23, 19, 3, 1, '#e8b460');
  } else {
    p.poly(
      [
        [13, 10],
        [20, 3 + lift],
        [24, 5 + lift],
        [18, 12],
      ],
      light,
      true,
    );
    p.r(23, 8, 2, 2, '#ff9a4a');
    p.r(23, 8, 1, 1, P.ink);
    p.r(27, 10, 2, 1, '#e8b460');
  }
  p.r(6, 14, 8, 1, light);
  p.r(2, 12, 3, 2, dark);
}

function rat(p: Pixels, f: number) {
  const fur = '#6d6470',
    light = '#9c93a0',
    pink = '#e79aa1';
  const step = f % 2 ? 2 : 0,
    bob = f % 2;
  p.line([3, 10 + bob], [0, 6], 1, pink);
  p.line([0, 6], [2, 2], 1, pink);
  p.poly(
    [
      [3, 9 + bob],
      [12, 5 + bob],
      [22, 6 + bob],
      [28, 11 + bob],
      [25, 15],
      [6, 15],
    ],
    fur,
    true,
  );
  p.poly(
    [
      [8, 7 + bob],
      [18, 6 + bob],
      [20, 9 + bob],
      [9, 10 + bob],
    ],
    light,
  );
  p.poly(
    [
      [18, 3 + bob],
      [21, 1 + bob],
      [23, 5 + bob],
    ],
    pink,
    true,
  );
  p.r(23, 8 + bob, 2, 2, '#ff4d4d');
  p.r(28, 11 + bob, 2, 2, pink);
  p.r(25, 13 + bob, 1, 1, '#ffffff');
  p.box(8 + step, 15, 3, 2, pink);
  p.box(19 - step, 15, 3, 2, pink);
}

/** The boss: a hulking alley tomcat in a striped galabeya and a tarboosh. */
function boss(p: Pixels, pose: string) {
  const fur = '#a8673f',
    furLight = '#d89660',
    furDark = '#6e3f2a',
    cloth = '#3d5f8f',
    clothLight = '#6d8fc0',
    stripe = '#ece0c2',
    red = '#c8343c';
  const crouch = pose === 'crouch' ? 8 : 0,
    leap = pose === 'leap',
    dazed = pose === 'dazed',
    hurt = pose === 'hurt',
    dead = pose === 'dead',
    bob = pose === 'idle1' ? 1 : 0,
    y = crouch + bob;
  // Tail.
  p.line([10, 52 - y / 2], [3, 30], 5, furDark, true);
  p.line([3, 30], [7, 20], 4, fur, true);
  // Galabeya body.
  p.poly(
    [
      [14, 26 + y],
      [62, 26 + y],
      [70, 60],
      [8, 60],
    ],
    cloth,
    true,
  );
  for (let x = 16; x < 66; x += 7)
    p.line([x, 28 + y], [x - 3 + (x > 40 ? 6 : 0), 59], 1, clothLight);
  p.poly(
    [
      [30, 27 + y],
      [46, 27 + y],
      [42, 40 + y],
      [34, 40 + y],
    ],
    stripe,
  );
  // Gold chain.
  for (let i = 0; i < 7; i++)
    p.r(28 + i * 3, 30 + y + Math.abs(3 - i), 2, 2, '#ffd76a');
  // Arms.
  const armUp = leap || pose === 'throw' ? -14 : 0;
  p.line([16, 30 + y], [6, 44 + y + armUp], 8, cloth, true);
  p.line([60, 30 + y], [70, 44 + y + armUp], 8, cloth, true);
  p.box(2, 42 + y + armUp, 8, 7, furLight);
  p.box(66, 42 + y + armUp, 8, 7, furLight);
  // Feet.
  if (!leap) {
    p.box(16, 58, 14, 5, furDark);
    p.box(48, 58, 14, 5, furDark);
  } else {
    p.box(14, 55, 12, 6, furDark);
    p.box(52, 55, 12, 6, furDark);
  }
  // Head.
  const hx = hurt ? 3 : 0,
    hy = y - (leap ? 2 : 0);
  p.poly(
    [
      [18 + hx, 10 + hy],
      [17 + hx, -0 + hy + 1],
      [27 + hx, 7 + hy],
      [49 + hx, 7 + hy],
      [59 + hx, 1 + hy],
      [58 + hx, 12 + hy],
      [61 + hx, 22 + hy],
      [54 + hx, 30 + hy],
      [22 + hx, 30 + hy],
      [15 + hx, 22 + hy],
    ],
    fur,
    true,
  );
  p.poly(
    [
      [20 + hx, 4 + hy],
      [25 + hx, 8 + hy],
      [20 + hx, 9 + hy],
    ],
    '#e09a8a',
  );
  p.poly(
    [
      [56 + hx, 4 + hy],
      [56 + hx, 9 + hy],
      [51 + hx, 8 + hy],
    ],
    '#e09a8a',
  );
  // Tarboosh.
  p.poly(
    [
      [29 + hx, 8 + hy],
      [31 + hx, -2 + hy + 2],
      [45 + hx, -2 + hy + 2],
      [47 + hx, 8 + hy],
    ],
    red,
    true,
  );
  p.line([45 + hx, 1 + hy], [50 + hx, 9 + hy], 1, P.ink);
  p.r(50 + hx, 9 + hy, 2, 3, P.ink);
  // Muzzle and face.
  p.poly(
    [
      [27 + hx, 19 + hy],
      [49 + hx, 19 + hy],
      [52 + hx, 26 + hy],
      [24 + hx, 26 + hy],
    ],
    furLight,
  );
  p.r(36 + hx, 18 + hy, 5, 3, '#8a4a48');
  // Scar.
  p.line([48 + hx, 9 + hy], [52 + hx, 18 + hy], 1, '#f1c8a8');
  if (dazed || dead) {
    for (const ex of [27, 45]) {
      p.r(ex + hx, 13 + hy, 5, 1, P.ink);
      p.r(ex + 2 + hx, 11 + hy, 1, 5, P.ink);
    }
    p.r(33 + hx, 25 + hy, 10, 2, P.ink);
  } else {
    const angry = pose === 'crouch' || leap || pose === 'throw';
    p.r(26 + hx, 12 + hy, 7, 5, '#ffe36a');
    p.r(44 + hx, 12 + hy, 7, 5, '#ffe36a');
    p.r(29 + hx, 12 + hy, 2, 5, P.ink);
    p.r(46 + hx, 12 + hy, 2, 5, P.ink);
    p.r(25 + hx, angry ? 11 + hy : 10 + hy, 8, 1, P.ink);
    p.r(44 + hx, angry ? 11 + hy : 10 + hy, 8, 1, P.ink);
    // Grin with a gold tooth.
    p.r(31 + hx, 24 + hy, 14, 2, P.ink);
    p.r(33 + hx, 24 + hy, 2, 2, '#ffd76a');
    p.r(41 + hx, 24 + hy, 2, 2, '#ffffff');
  }
  // Whiskers.
  for (const d of [0, 3]) {
    p.r(14 + hx, 21 + d + hy, 9, 1, '#f3e2c8');
    p.r(53 + hx, 21 + d + hy, 9, 1, '#f3e2c8');
  }
}

export const BOSS_POSES = [
  'idle0',
  'idle1',
  'crouch',
  'leap',
  'dazed',
  'hurt',
  'throw',
  'dead',
];

export function makeCreatures(scene: Phaser.Scene) {
  if (scene.textures.exists('bat0')) return;
  for (let f = 0; f < 4; f++) {
    make(scene, 'bat' + f, 32, 25, (p) => bat(p, f));
    make(scene, 'rooster' + f, 34, 32, (p) => rooster(p, f));
    make(scene, 'pigeon' + f, 30, 22, (p) => pigeon(p, f));
    make(scene, 'rat' + f, 31, 18, (p) => rat(p, f));
  }
  for (const pose of BOSS_POSES)
    make(scene, 'boss-' + pose, 78, 64, (p) => boss(p, pose));
  make(scene, 'bone', 18, 10, (p) => {
    p.line([2, 5], [14, 5], 1, '#f3ead2', true);
    for (const x of [5, 8, 11]) p.line([x, 1], [x, 9], 1, '#f3ead2');
    p.poly(
      [
        [13, 5],
        [17, 1],
        [17, 9],
      ],
      '#e6d6b0',
      true,
    );
    p.r(2, 4, 2, 2, P.ink);
  });
  make(scene, 'shock', 34, 18, (p) => {
    p.poly(
      [
        [0, 18],
        [6, 8],
        [12, 12],
        [17, 0],
        [22, 12],
        [28, 8],
        [34, 18],
      ],
      '#ffcf6b',
      true,
    );
    p.poly(
      [
        [8, 18],
        [17, 6],
        [26, 18],
      ],
      '#fff2c0',
    );
  });
  make(scene, 'star', 7, 7, (p) => {
    p.r(3, 0, 1, 7, '#ffe36a');
    p.r(0, 3, 7, 1, '#ffe36a');
    p.r(2, 2, 3, 3, '#ffffff');
  });
}
