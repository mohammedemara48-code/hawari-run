// World 5 creatures (الأقصر): the scarab beetle, the mummy that pulls
// itself back together, the spitting cobra, the sand-dust devil, and the
// final boss «الكبش الحارس» — a ram-headed sphinx of the avenue woken up,
// sandstone cracked with turquoise light. Same integer rasterizer as the
// other characters; everything faces left.
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
const TURQ = '#3ad8c8',
  TURQ_D = '#1a8a80';

/** Scarab 24×18: 0-1 walk, 2 wings open (hop), 3 tucked. */
function scarab(p: Pixels, f: number) {
  const legs = f % 2 ? 1 : -1;
  for (let i = 0; i < 3; i++) {
    const x = 8 + i * 5;
    p.line([x, 13], [x - 2 + legs * (i % 2 ? 1 : -1), 17], 1.4, '#14100e');
  }
  if (f === 2) {
    // Wing cases lifted, the gauzy flight wings out behind.
    p.poly(
      [
        [12, 9],
        [24, 2],
        [22, 9],
      ],
      '#c8e0d8',
      true,
    );
    p.poly(
      [
        [10, 8],
        [17, 0],
        [19, 6],
      ],
      '#2a5a5a',
      true,
    );
  }
  oval(p, 13, 11, 8.5, 5.5, '#1e3a3a', true);
  if (f !== 2) {
    p.r(13, 6, 1, 10, '#0e2020');
    p.r(9, 8, 3, 1, '#4aa898');
    p.r(15, 8, 4, 1, '#3a8a7a');
    p.r(10, 9, 1, 3, '#6ad0c0');
  }
  // Head with its toothed shovel.
  oval(p, 4.5, 11, 3.5, 3, '#2a4a40', true);
  for (const y of [9, 11, 13]) p.r(0, y, 2, 1, '#14100e');
  p.r(4, 10, 1, 1, '#e8b84a');
}
/** Mummy 32×38: 0-1 shuffle, 2 a heap of bandages, 3 pulling itself up. */
function mummy(p: Pixels, f: number) {
  const wrap = '#d8ccb0',
    shade = '#a89a7a',
    dark = '#6a5e48';
  if (f === 2) {
    // The heap: loose bandages and a skull-less head wrapped tight.
    oval(p, 16, 34, 13, 4, shade, true);
    oval(p, 12, 31, 6, 4, wrap, true);
    oval(p, 21, 32, 6, 3, wrap, true);
    p.line([4, 35], [12, 30], 2, dark);
    p.line([18, 36], [28, 31], 2, dark);
    oval(p, 9, 28, 4, 3.5, wrap, true);
    p.r(7, 27, 2, 1, '#3ad8c8');
    return;
  }
  const up = f === 3 ? 10 : 0;
  const step = f === 1 ? 2 : 0;
  // Legs.
  p.line([14, 26 + up / 2], [12 - step, 37], 5, wrap, true);
  p.line([19, 26 + up / 2], [21 + step, 37], 5, shade, true);
  // Body, wrapped.
  p.poly(
    [
      [10, 10 + up],
      [22, 10 + up],
      [23, 28],
      [9, 28],
    ],
    wrap,
    true,
  );
  for (let y = 12 + up; y < 28; y += 3) p.line([9, y], [23, y + 1.5], 1, shade);
  // Arms stretched forward (left), trailing a bandage end.
  if (f !== 3) {
    p.line([12, 14], [2, 16 + step / 2], 4, wrap, true);
    p.line([16, 15], [4, 19 - step / 2], 4, shade, true);
    p.line([20, 14], [30, 22 + step], 1.5, shade);
  } else {
    p.line([12, 18], [4, 30], 4, wrap, true);
  }
  // Head with glowing eyes in the slit.
  oval(p, 15, 7 + up, 6, 6, wrap, true);
  p.line([9, 6 + up], [21, 8 + up], 1, shade);
  p.line([9, 10 + up], [21, 11 + up], 1, shade);
  p.r(10, 7 + up, 7, 2, '#14100e');
  p.r(11, 7 + up, 2, 2, '#3ad8c8');
  p.r(15, 7 + up, 2, 2, '#3ad8c8');
  p.r(13, 13 + up, 6, 2, dark);
}
/** Cobra 28×32: 0-1 swaying, 2 hood spread (warning), 3 spitting. */
function cobra(p: Pixels, f: number) {
  const body = '#6a5a2a',
    belly = '#d8c070',
    band = '#2e2614';
  // Coils on the ground.
  oval(p, 16, 28, 11, 4, body, true);
  oval(p, 14, 25, 7, 3, '#7a6a34', true);
  p.r(8, 27, 16, 1, band);
  const sway = f === 1 ? -2 : 0;
  // Raised neck.
  p.line([16, 24], [12 + sway, 10], 6, body, true);
  p.line([14, 22], [11 + sway, 11], 2, belly);
  const hooded = f >= 2;
  // Hood.
  if (hooded)
    p.poly(
      [
        [11 + sway, 4],
        [19 + sway, 8],
        [18 + sway, 18],
        [12 + sway, 20],
        [5 + sway, 16],
        [5 + sway, 8],
      ],
      body,
      true,
    );
  if (hooded) {
    p.r(9 + sway, 10, 5, 7, belly);
    for (let y = 11; y < 17; y += 2) p.r(9 + sway, y, 5, 1, '#a89040');
  }
  // Head (facing left).
  oval(p, 9 + sway, hooded ? 5 : 8, 5, 3.5, '#7a6a34', true);
  p.r(6 + sway, hooded ? 4 : 7, 2, 2, '#ffe36a');
  p.r(6 + sway, hooded ? 4 : 7, 1, 1, '#14100e');
  if (f === 3) {
    // Mouth open, venom flying.
    p.poly(
      [
        [5 + sway, 6],
        [0, 4],
        [0, 9],
      ],
      '#8a2a2a',
    );
    p.r(0, 5, 3, 2, '#8ad040');
  } else p.r(3 + sway, hooded ? 6 : 9, 3, 1, '#c83a2a');
}
/** Sand-dust devil 34×48: a spinning column of sand, four frames. */
function devil(p: Pixels, f: number) {
  const tones = ['#c89a5a', '#e0b878', '#a87a40', '#f0d098'];
  for (let i = 0; i < 9; i++) {
    const y = 6 + i * 4.6,
      w = 16 - i * 1.25 + Math.sin(i + f) * 1.5,
      cx = 17 + Math.sin(i * 0.9 + f * 1.4) * 3;
    oval(p, cx, y, w, 3.2, tones[(i + f) % 4], i === 0);
  }
  // Spiral streaks and flying grit.
  for (let i = 0; i < 6; i++) {
    const a = f * 0.9 + i * 1.1,
      y = 8 + i * 6;
    p.r(17 + Math.cos(a) * (14 - i * 1.6), y, 4, 1, '#fff0c8');
    p.r(17 - Math.cos(a) * (12 - i * 1.4), y + 2, 3, 1, '#8a5e32');
  }
  for (let i = 0; i < 5; i++)
    p.r(
      2 + ((i * 7 + f * 5) % 30),
      2 + ((i * 11 + f * 3) % 40),
      2,
      2,
      '#d8aa6e',
    );
  // A pair of ember eyes deep in the swirl.
  p.r(12, 14, 3, 2, '#ffb040');
  p.r(19, 14, 3, 2, '#ffb040');
}
export const RAM_POSES = [
  'idle0',
  'idle1',
  'rear',
  'slam',
  'bowed',
  'charge',
  'hurt',
  'dead',
] as const;
/** «الكبش الحارس» 160×112: a colossal ram-headed sphinx, sandstone body
 * veined with glowing turquoise cracks, a headcloth in faded paint and a
 * turquoise gem on the brow — his weak point when he bows his head. */
function ramBoss(p: Pixels, pose: (typeof RAM_POSES)[number]) {
  const stone = '#c8955a',
    hi = '#e8c48a',
    shade = '#9a6a3a',
    dark = '#6a4422';
  const rear = pose === 'rear',
    bowed = pose === 'bowed' || pose === 'slam',
    charge = pose === 'charge';
  const lift = rear ? -14 : 0;
  const headDrop = bowed ? 26 : charge ? 14 : 0;
  const step = pose === 'idle1' ? 2 : 0;
  // Hind legs and haunch (right side).
  p.line([124, 74], [130 + step, 108], 12, shade, true);
  p.line([112, 76], [114 - step, 108], 11, stone, true);
  p.r(106, 104, 16, 5, dark);
  p.r(122, 104, 16, 5, dark);
  // Tail with its tuft.
  p.line([140, 66], [154, 52], 4, shade, true);
  oval(p, 155, 50, 4, 4, dark, true);
  // Body: a lion's barrel, tilted up when rearing.
  p.poly(
    [
      [52, 56 + lift],
      [100, 50 + lift / 2],
      [138, 58],
      [144, 76],
      [128, 90],
      [64, 90 + lift / 3],
      [48, 74 + lift],
    ],
    stone,
    true,
  );
  p.poly(
    [
      [56, 58 + lift],
      [100, 53 + lift / 2],
      [134, 60],
      [130, 64],
      [60, 64 + lift],
    ],
    hi,
  );
  // Turquoise cracks glowing through the stone.
  for (const [a, b] of [
    [
      [70, 66],
      [80, 80],
    ],
    [
      [80, 80],
      [92, 76],
    ],
    [
      [108, 62],
      [116, 82],
    ],
    [
      [124, 70],
      [134, 64],
    ],
  ] as [Point, Point][])
    p.line(
      [a[0], a[1] + lift / 2],
      [b[0], b[1] + lift / 2],
      2,
      pose === 'hurt' ? '#ffffff' : TURQ,
    );
  // Forelegs: planted, raised when rearing, slammed flat.
  if (rear) {
    p.line([58, 70 + lift], [40, 48], 11, stone, true);
    p.line([68, 72 + lift], [52, 52], 10, shade, true);
    oval(p, 38, 46, 7, 5, hi, true);
    oval(p, 50, 50, 6, 4, stone, true);
  } else {
    const fx = pose === 'slam' ? -8 : 0;
    p.line([60, 78], [48 + fx, 106], 12, stone, true);
    p.line([72, 80], [64 + fx / 2, 106], 11, shade, true);
    p.r(36 + fx, 102, 20, 6, hi);
    p.r(56 + fx / 2, 102, 16, 6, stone);
    p.r(36 + fx, 102, 20, 1, '#fff0c8');
  }
  // Neck and the striped headcloth falling over the shoulders.
  const hx = 36,
    hy = 26 + lift + headDrop;
  p.poly(
    [
      [hx + 8, hy + 8],
      [hx + 30, hy + 4],
      [hx + 36, hy + 40],
      [hx + 16, hy + 42],
    ],
    '#2a5a7a',
    true,
  );
  for (let i = 0; i < 6; i++)
    p.line(
      [hx + 10 + i, hy + 10 + i * 5],
      [hx + 34 - i, hy + 8 + i * 5],
      2.2,
      i % 2 ? '#e8c88a' : '#2a6a8a',
    );
  // Ram head: long muzzle to the left.
  p.poly(
    [
      [hx + 22, hy],
      [hx + 4, hy + 4],
      [hx - 12, hy + 14],
      [hx - 16, hy + 24],
      [hx - 6, hy + 30],
      [hx + 14, hy + 28],
      [hx + 26, hy + 18],
    ],
    stone,
    true,
  );
  p.poly(
    [
      [hx + 18, hy + 2],
      [hx + 2, hy + 6],
      [hx - 10, hy + 15],
      [hx + 2, hy + 14],
    ],
    hi,
  );
  // Nostril and mouth.
  p.r(hx - 13, hy + 20, 3, 2, dark);
  p.line([hx - 14, hy + 26], [hx - 2, hy + 27], 1.5, dark);
  if (rear || charge)
    p.poly(
      [
        [hx - 14, hy + 26],
        [hx - 2, hy + 27],
        [hx - 6, hy + 31],
      ],
      '#3a1a10',
    );
  // The great curled horn: a spiral around the ear.
  oval(p, hx + 18, hy + 14, 13, 12, shade, true);
  oval(p, hx + 18, hy + 14, 9, 8, stone);
  oval(p, hx + 18, hy + 14, 5, 4.5, shade);
  oval(p, hx + 18, hy + 14, 2, 2, dark);
  p.line([hx + 6, hy + 22], [hx - 2, hy + 34], 5, shade, true);
  // Brow gem: the weak point, blazing when he bows.
  oval(p, hx + 4, hy + 6, 4, 3.5, bowed ? '#ffffff' : TURQ_D, true);
  oval(p, hx + 4, hy + 6, 2.5, 2, bowed ? TURQ : '#2ab8a8');
  // Eye.
  if (pose === 'dead') {
    p.line([hx - 4, hy + 9], [hx + 2, hy + 15], 2, '#14100e');
    p.line([hx - 4, hy + 15], [hx + 2, hy + 9], 2, '#14100e');
  } else if (pose === 'hurt' || pose === 'bowed') {
    p.r(hx - 4, hy + 11, 6, 2, '#14100e');
  } else {
    oval(p, hx - 1, hy + 12, 3.2, 2.6, TURQ, true);
    p.r(hx - 2, hy + 11, 2, 2, '#ffffff');
    p.line([hx - 8, hy + 7], [hx + 4, hy + 9], 2.4, dark);
  }
  if (pose === 'slam')
    for (let i = 0; i < 6; i++)
      p.r(24 + i * 10, 104 - (i % 2) * 4, 6, 3, '#e8c48a');
  if (charge)
    for (let i = 0; i < 4; i++) p.r(146 + i * 3, 70 + i * 8, 10, 2, '#e8d0a0');
  if (pose === 'dead') {
    // Crumbling back to stone.
    for (let i = 0; i < 8; i++)
      p.r(50 + i * 11, 92 + (i % 3) * 4, 6, 5, i % 2 ? shade : hi);
  }
}
export function makeLuxorCreatures(scene: Phaser.Scene) {
  if (scene.textures.exists('scarab0')) return;
  for (let f = 0; f < 4; f++) {
    make(scene, 'scarab' + f, 24, 18, (p) => scarab(p, f));
    make(scene, 'mummy' + f, 32, 38, (p) => mummy(p, f));
    make(scene, 'cobra' + f, 28, 32, (p) => cobra(p, f));
    make(scene, 'devil' + f, 34, 48, (p) => devil(p, f));
  }
  for (const pose of RAM_POSES)
    make(scene, 'boss5-' + pose, 160, 112, (p) => ramBoss(p, pose));
}
