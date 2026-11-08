import Phaser from 'phaser';
import { HERO_POSES, HERO_FRAME, type HeroPose } from './hero-state';
type Point = [number, number];
const P = {
  ink: '#0b1125',
  skin: '#d99568',
  skinLight: '#f6c28a',
  skinShade: '#aa654e',
  skinGlow: '#ffe2a5',
  hair: '#4a3839',
  hairLight: '#77504a',
  cobalt: '#244de0',
  cobaltLight: '#739bff',
  cobaltShade: '#142e8b',
  cream: '#edf2ff',
  creamLight: '#ffffff',
  creamShade: '#a3b6d2',
  navy: '#252b43',
  navyLight: '#596888',
  navyShade: '#12182e',
  orange: '#d68a49',
  orangeLight: '#ffd082',
  orangeShade: '#a15c40',
  scarf: '#e6324e',
  scarfLight: '#ff8692',
  scarfShade: '#9e1538',
  shoe: '#e7eeff',
  shoeLight: '#ffffff',
  shoeShade: '#8495bd',
};
// Integer rasterizer: all generated pixels are opaque palette entries or transparent.
// No antialiasing, fractional transforms, vector strokes, or scaled-up source art.
class Pixels {
  c: CanvasRenderingContext2D;
  constructor(c: CanvasRenderingContext2D) {
    this.c = c;
  }
  r(x: number, y: number, w: number, h: number, color: string) {
    this.c.fillStyle = color;
    this.c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }
  poly(points: Point[], color: string, outline = false) {
    const mask: Point[] = [];
    const xs = points.map((p) => p[0]),
      ys = points.map((p) => p[1]);
    for (
      let y = Math.floor(Math.min(...ys));
      y < Math.ceil(Math.max(...ys));
      y++
    )
      for (
        let x = Math.floor(Math.min(...xs));
        x < Math.ceil(Math.max(...xs));
        x++
      ) {
        let inside = false;
        for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
          const a = points[i],
            b = points[j];
          if (
            a[1] > y + 0.5 !== b[1] > y + 0.5 &&
            x + 0.5 < ((b[0] - a[0]) * (y + 0.5 - a[1])) / (b[1] - a[1]) + a[0]
          )
            inside = !inside;
        }
        if (inside) mask.push([x, y]);
      }
    if (outline)
      for (const [x, y] of mask)
        for (const [dx, dy] of [
          [0, -1],
          [-1, 0],
          [1, 0],
          [0, 1],
        ])
          this.r(x + dx, y + dy, 1, 1, P.ink);
    for (const [x, y] of mask) this.r(x, y, 1, 1, color);
  }
  line(a: Point, b: Point, width: number, color: string, outline = false) {
    const dx = b[0] - a[0],
      dy = b[1] - a[1],
      len = Math.hypot(dx, dy) || 1,
      nx = ((-dy / len) * width) / 2,
      ny = ((dx / len) * width) / 2;
    this.poly(
      [
        [a[0] + nx, a[1] + ny],
        [b[0] + nx, b[1] + ny],
        [b[0] - nx, b[1] - ny],
        [a[0] - nx, a[1] - ny],
      ],
      color,
      outline,
    );
  }
  box(x: number, y: number, w: number, h: number, color: string) {
    this.r(x - 1, y, w + 2, h, P.ink);
    this.r(x, y - 1, w, h + 2, P.ink);
    this.r(x, y, w, h, color);
  }
}
function make(
  scene: Phaser.Scene,
  key: string,
  w: number,
  h: number,
  paint: (p: Pixels) => void,
) {
  const t = scene.textures.createCanvas(key, w, h)!;
  t.context.imageSmoothingEnabled = false;
  paint(new Pixels(t.context));
  t.refresh();
}
function heroBrush(raw: Pixels): Pick<Pixels, 'r' | 'box' | 'poly' | 'line'> {
  const point = ([x, y]: Point): Point => [Math.round(1 + x * 1.2), y];
  return {
    r(x, y, w, h, c) {
      raw.r(Math.round(1 + x * 1.2), y, Math.max(1, Math.round(w * 1.2)), h, c);
    },
    box(x, y, w, h, c) {
      raw.box(Math.round(1 + x * 1.2), y, Math.round(w * 1.2), h, c);
    },
    poly(points, c, outline = false) {
      raw.poly(points.map(point), c, outline);
    },
    line(a, b, w, c, outline = false) {
      raw.line(point(a), point(b), w * 1.15, c, outline);
    },
  };
}
function hero(raw: Pixels, big: boolean, pose: HeroPose) {
  const p = heroBrush(raw);
  const run = pose.startsWith('run'),
    f = run ? Number(pose.slice(3)) : 0,
    crouch = pose === 'crouch',
    skid = pose === 'skid',
    hurt = pose === 'hurt' || pose === 'dead',
    throwing = pose.startsWith('throw');
  const bob = run
    ? [0, -1, -2, -1, 0, -1, -2, -1][f]
    : pose === 'idle1'
      ? -1
      : pose === 'grow1'
        ? -2
        : 0;
  const lean = skid ? -2 : run ? 1 : throwing ? -1 : 0;
  const head = (big ? 4 : 12) + (crouch ? (big ? 18 : 12) : 0) + bob;
  const top = (big ? 26 : 34) + (crouch ? (big ? 18 : 12) : 0) + bob,
    waist = crouch ? 58 : big ? 46 : 48;
  const x = (n: number) => n + lean;
  // Far arm, trousers and sneakers: silhouettes are posed rather than image-scaled.
  const runHands: Point[] = [
    [4, 5],
    [5, 2],
    [9, -2],
    [17, -4],
    [25, -3],
    [27, 0],
    [23, 5],
    [12, 7],
  ];
  let farHand: Point = [x(7), top + (big ? 12 : 10)],
    nearHand: Point = [x(25), top + (big ? 13 : 11)];
  if (run) {
    farHand = [runHands[f][0], top + runHands[f][1]];
    const a = runHands[(f + 4) % 8];
    nearHand = [a[0], top + a[1]];
  }
  if (pose === 'rise') {
    farHand = [6, top - 5];
    nearHand = [26, top - 6];
  }
  if (pose === 'fall') {
    farHand = [3, top + 3];
    nearHand = [28, top + 1];
  }
  if (crouch) {
    farHand = [7, 57];
    nearHand = [26, 57];
  }
  if (skid) {
    farHand = [6, top - 1];
    nearHand = [22, top + 4];
  }
  if (throwing) {
    farHand = [9, top + 7];
    nearHand = [pose === 'throw0' ? 28 : 26, top + (pose === 'throw0' ? 1 : 5)];
  }
  if (hurt) {
    farHand = [4, top - 3];
    nearHand = [28, top - 2];
  }
  const arm = (shoulder: Point, hand: Point, near: boolean) => {
    const elbow: Point = [
      Math.round((shoulder[0] + hand[0]) / 2) + (near ? 1 : -1),
      Math.round((shoulder[1] + hand[1]) / 2) + 1,
    ];
    p.line(shoulder, elbow, 4, near ? P.cream : P.creamShade, true);
    p.line(elbow, hand, 3, near ? P.cream : P.creamShade, true);
    p.line(
      [shoulder[0] - 1, shoulder[1]],
      [elbow[0] - 1, elbow[1]],
      1,
      P.creamLight,
    );
    p.box(hand[0] - 2, hand[1] - 1, 5, 5, P.skin);
    p.r(hand[0] - 2, hand[1] - 1, 3, 1, P.skinLight);
    p.r(hand[0] + 2, hand[1] + 1, 1, 2, P.skinShade);
    p.r(hand[0] - 1, hand[1] + 2, 2, 1, P.skinShade);
    p.r(hand[0] + 2, hand[1], 1, 1, P.skinLight);
  };
  arm([x(11), top + 2], farHand, false);
  let backFoot: Point = [11, 62],
    frontFoot: Point = [21, 62];
  if (run) {
    const steps: Point[][] = [
      [
        [7, 60],
        [25, 62],
      ],
      [
        [11, 57],
        [23, 62],
      ],
      [
        [16, 57],
        [19, 62],
      ],
      [
        [22, 59],
        [13, 62],
      ],
      [
        [25, 62],
        [7, 60],
      ],
      [
        [23, 62],
        [11, 57],
      ],
      [
        [19, 62],
        [16, 57],
      ],
      [
        [13, 62],
        [22, 59],
      ],
    ];
    [backFoot, frontFoot] = steps[f];
  }
  if (pose === 'rise') {
    backFoot = [8, 59];
    frontFoot = [22, 57];
  }
  if (pose === 'fall') {
    backFoot = [10, 62];
    frontFoot = [23, 61];
  }
  if (skid) {
    backFoot = [11, 62];
    frontFoot = [26, 62];
  }
  if (crouch) {
    backFoot = [8, 62];
    frontFoot = [24, 62];
  }
  if (pose === 'dead') {
    backFoot = [7, 59];
    frontFoot = [25, 61];
  }
  const leg = (hip: Point, foot: Point, near: boolean) => {
    const knee: Point = [
      Math.round((hip[0] + foot[0]) / 2) + (foot[0] < hip[0] ? -1 : 1),
      Math.round((hip[1] + foot[1]) / 2),
    ];
    p.line(hip, knee, 5, near ? P.navy : P.navyShade, true);
    p.line(knee, [foot[0], foot[1] - 1], 4, near ? P.navy : P.navyShade, true);
    p.line(
      [hip[0] - 1, hip[1]],
      [knee[0] - 1, knee[1]],
      1,
      near ? P.navyLight : P.navy,
    );
    p.box(foot[0] - 3, foot[1] - 2, 8, 3, near ? P.shoe : P.shoeShade);
    p.r(foot[0] - 3, foot[1] - 2, 5, 1, near ? P.shoeLight : P.shoe);
    p.r(foot[0] - 3, foot[1] + 1, 9, 1, P.ink);
    p.r(foot[0] + 1, foot[1] - 1, 2, 1, P.cobalt);
  };
  leg([x(13), waist - 1], backFoot, false);
  leg([x(19), waist - 1], frontFoot, true);
  // Kurta and embroidered waistcoat: bright white centre, royal-blue side panels, ochre piping.
  p.poly(
    [
      [x(11), top],
      [x(20), top - 1],
      [x(25), top + 3],
      [x(22), waist],
      [x(8), waist],
      [x(8), top + 3],
    ],
    P.cream,
    true,
  );
  p.poly(
    [
      [x(11), top],
      [x(14), top + 1],
      [x(14), waist - 1],
      [x(8), waist - 1],
      [x(8), top + 3],
    ],
    P.cobalt,
    true,
  );
  p.poly(
    [
      [x(19), top],
      [x(23), top + 2],
      [x(22), waist - 1],
      [x(19), waist - 1],
    ],
    P.cobaltShade,
    true,
  );
  p.line([x(10), top + 3], [x(10), waist - 2], 1, P.cobaltLight);
  p.line([x(13), top + 2], [x(13), waist - 2], 1, P.orangeLight);
  p.line([x(20), top + 2], [x(20), waist - 2], 1, P.cobaltLight);
  p.r(x(16), top + 4, 1, Math.max(1, waist - top - 5), P.creamLight);
  p.r(x(16), top + 3, 1, 1, P.orangeShade);
  if (big) {
    p.r(x(16), top + 7, 1, 1, P.orangeShade);
    p.r(x(16), top + 11, 1, 1, P.orangeShade);
    p.r(x(21), waist - 4, 2, 1, P.cobaltLight);
  }
  p.line([x(21), top + 1], [x(11), waist - 2], 2, P.orangeShade);
  p.line([x(20), top + 1], [x(10), waist - 2], 1, P.orangeLight);
  p.box(x(6), waist - 6, 6, 6, P.orange);
  p.r(x(6), waist - 6, 6, 2, P.orangeLight);
  p.r(x(10), waist - 3, 2, 3, P.orangeShade);
  p.r(x(8), waist - 3, 1, 1, P.creamLight);
  p.r(x(10), waist - 1, 12, 1, P.navyShade);
  p.r(x(16), waist - 1, 3, 1, P.orangeLight);
  arm([x(22), top + 2], nearHand, true);
  // Head, scarf and face are hand-pixelled in side profile with one visible eye.
  p.box(x(14), head + 20, 6, 3, P.skinShade);
  p.poly(
    [
      [x(12), head + 21],
      [x(20), head + 21],
      [x(20), head + 24],
      [x(15), head + 25],
    ],
    P.scarf,
    true,
  );
  p.r(x(13), head + 21, 5, 1, P.scarfLight);
  p.poly(
    [
      [x(18), head + 23],
      [x(21), head + 24],
      [x(20), head + 29],
      [x(17), head + 27],
    ],
    P.scarfShade,
  );
  p.poly(
    [
      [x(11), head + 7],
      [x(23), head + 7],
      [x(26), head + 10],
      [x(26), head + 12],
      [x(29), head + 14],
      [x(28), head + 16],
      [x(26), head + 16],
      [x(25), head + 19],
      [x(21), head + 21],
      [x(14), head + 20],
      [x(11), head + 17],
      [x(9), head + 16],
      [x(8), head + 12],
      [x(9), head + 9],
    ],
    P.skin,
    true,
  );
  p.poly(
    [
      [x(12), head + 8],
      [x(22), head + 8],
      [x(24), head + 10],
      [x(21), head + 12],
      [x(13), head + 12],
      [x(12), head + 16],
      [x(10), head + 14],
    ],
    P.skinLight,
  );
  p.poly(
    [
      [x(25), head + 11],
      [x(26), head + 13],
      [x(28), head + 14],
      [x(26), head + 16],
      [x(24), head + 19],
      [x(21), head + 20],
      [x(15), head + 19],
      [x(16), head + 18],
      [x(23), head + 18],
    ],
    P.skinShade,
  );
  p.r(x(13), head + 16, 3, 2, P.skinLight);
  p.r(x(27), head + 14, 1, 1, P.skinGlow);
  p.box(x(8), head + 13, 3, 4, P.skin);
  p.r(x(8), head + 13, 2, 1, P.skinLight);
  p.r(x(9), head + 15, 1, 1, P.skinShade);
  p.poly(
    [
      [x(9), head + 6],
      [x(22), head + 6],
      [x(23), head + 8],
      [x(17), head + 9],
      [x(14), head + 8],
      [x(13), head + 12],
      [x(11), head + 15],
      [x(10), head + 14],
      [x(10), head + 11],
      [x(8), head + 11],
      [x(8), head + 8],
    ],
    P.hair,
    true,
  );
  p.r(x(10), head + 7, 3, 1, P.hairLight);
  p.r(x(11), head + 10, 1, 2, P.hairLight);
  p.r(x(17), head + 7, 3, 1, P.hairLight);
  // Sloped soft cap with rolled band and diamond pin (no branded insignia).
  p.poly(
    [
      [x(10), head + 2],
      [x(19), head + 1],
      [x(23), head + 2],
      [x(25), head + 4],
      [x(24), head + 7],
      [x(9), head + 7],
      [x(8), head + 5],
    ],
    P.cobalt,
    true,
  );
  p.poly(
    [
      [x(10), head + 3],
      [x(18), head + 2],
      [x(21), head + 3],
      [x(20), head + 4],
      [x(10), head + 5],
    ],
    P.cobaltLight,
  );
  p.poly(
    [
      [x(22), head + 3],
      [x(24), head + 4],
      [x(23), head + 7],
      [x(21), head + 6],
    ],
    P.cobaltShade,
  );
  p.r(x(9), head + 6, 16, 2, P.cobaltShade);
  p.r(x(10), head + 6, 12, 1, P.cobaltLight);
  p.r(x(22), head + 5, 2, 2, P.orangeLight);
  p.r(x(23), head + 5, 1, 1, P.creamLight);
  const blink = pose === 'idle3';
  if (hurt) {
    for (const ex of [23]) {
      p.r(x(ex), head + 11, 1, 1, P.ink);
      p.r(x(ex + 1), head + 12, 1, 1, P.ink);
      p.r(x(ex), head + 13, 1, 1, P.ink);
      p.r(x(ex + 2), head + 11, 1, 1, P.ink);
      p.r(x(ex + 2), head + 13, 1, 1, P.ink);
    }
    p.box(x(21), head + 17, 3, 2, P.hair);
  } else if (blink) {
    p.r(x(22), head + 13, 4, 1, P.hair);
    p.r(x(21), head + 18, 3, 1, P.hair);
  } else {
    p.r(x(22), head + 10, 4, 1, P.hair);
    p.r(x(22), head + 11, 4, 4, P.creamLight);
    p.r(x(24), head + 12, 2, 3, P.ink);
    p.r(x(24), head + 12, 1, 1, '#ffffff');
    p.r(x(21), head + 18, 4, 1, P.hair);
    p.r(x(24), head + 17, 1, 1, P.hair);
    p.r(x(22), head + 18, 2, 1, P.creamLight);
    p.r(x(21), head + 19, 3, 1, P.skinLight);
  }
  if (pose.startsWith('grow')) {
    const n = Number(pose.slice(4));
    for (const [a, b] of [
      [3, 12 + n * 2],
      [28, 26 - n * 3],
      [5, 35 - n],
    ]) {
      p.r(a, b, 1, 3, P.orangeLight);
      p.r(a - 1, b + 1, 3, 1, P.creamLight);
    }
  }
}
function cat(p: Pixels, f: number) {
  const bob = f % 2,
    step = f < 2 ? 0 : 2;
  p.line([5, 17 + bob], [2, 10 + bob], 3, '#97654e', true);
  p.line([2, 10 + bob], [4, 7 + bob], 2, '#c68f65', true);
  p.poly(
    [
      [8, 10 + bob],
      [24, 10 + bob],
      [28, 16 + bob],
      [25, 24],
      [9, 24],
      [5, 18],
    ],
    '#bb805b',
    true,
  );
  p.poly(
    [
      [8, 12 + bob],
      [16, 10 + bob],
      [24, 12 + bob],
      [22, 17 + bob],
      [9, 18 + bob],
    ],
    '#e1ae76',
  );
  p.box(8 + step, 23, 5, 3, '#a26d54');
  p.box(21 - step, 23, 5, 3, '#c48c61');
  p.r(9 + step, 23, 3, 1, '#edc28a');
  p.r(22 - step, 23, 3, 1, '#f4cb92');
  p.poly(
    [
      [7, 13 + bob],
      [6, 3 + bob],
      [13, 8 + bob],
      [22, 7 + bob],
      [28, 2 + bob],
      [27, 17 + bob],
      [23, 21 + bob],
      [12, 21 + bob],
    ],
    '#c68f65',
    true,
  );
  p.poly(
    [
      [8, 7 + bob],
      [8, 5 + bob],
      [11, 8 + bob],
    ],
    '#db9b89',
  );
  p.poly(
    [
      [24, 8 + bob],
      [26, 5 + bob],
      [26, 11 + bob],
    ],
    '#db9b89',
  );
  p.r(10, 9 + bob, 4, 1, '#855846');
  p.r(21, 8 + bob, 4, 1, '#855846');
  p.r(10, 11 + bob, 5, 4, '#ffe3a2');
  p.r(21, 10 + bob, 5, 4, '#ffe3a2');
  p.r(13, 11 + bob, 2, 4, P.ink);
  p.r(22, 10 + bob, 2, 4, P.ink);
  p.r(13, 11 + bob, 1, 1, '#ffffff');
  p.r(22, 10 + bob, 1, 1, '#ffffff');
  p.r(10, 10 + bob, 5, 1, P.ink);
  p.r(21, 9 + bob, 5, 1, P.ink);
  p.poly(
    [
      [13, 16 + bob],
      [18, 15 + bob],
      [23, 16 + bob],
      [22, 19 + bob],
      [14, 19 + bob],
    ],
    '#f2cb99',
  );
  p.r(17, 15 + bob, 3, 2, '#986462');
  p.r(18, 17 + bob, 1, 2, P.ink);
  p.r(15, 19 + bob, 3, 1, P.ink);
  p.r(20, 19 + bob, 3, 1, P.ink);
  p.r(8, 16 + bob, 4, 1, '#805b50');
  p.r(25, 15 + bob, 4, 1, '#805b50');
}
function basket(p: Pixels, f: number) {
  p.poly(
    [
      [6, 9],
      [26, 9],
      [29, 17],
      [25, 24],
      [9, 25],
      [4, 18],
    ],
    '#ba854e',
    true,
  );
  p.poly(
    [
      [8, 10],
      [23, 10],
      [26, 15],
      [8, 17],
    ],
    '#edc47c',
  );
  for (let y = 12; y < 24; y += 4) p.r(7, y, 19, 1, '#8b603f');
  for (let x = 9; x < 27; x += 5) p.r(x, 11 + (f % 2), 1, 12, '#ffda92');
  p.box(6, 6, 21, 4, '#aa7446');
  p.r(7, 6, 18, 1, '#ffe2a2');
  p.r(8, 9, 18, 1, '#744f3d');
  p.box(11, 11, 4, 4, '#fff0c4');
  p.box(20, 11, 4, 4, '#fff0c4');
  p.r(13, 12, 2, 3, P.ink);
  p.r(22, 12, 2, 3, P.ink);
  p.r(14, 18, 7, 1, '#724a38');
  p.r(15, 19, 5, 1, '#f3ca8c');
  p.box(8 + (f % 2), 25, 5, 2, '#946e4d');
  p.box(22 - (f % 2), 25, 5, 2, '#bc8e5c');
}
function bug(p: Pixels, f: number) {
  for (const [x, y] of [
    [10, 10],
    [17, 10],
    [24, 11],
  ]) {
    p.line([x, y], [x - 4, 4 + (f % 2)], 1, P.ink);
    p.line([x, y + 4], [x - 4, 20 - (f % 2)], 1, P.ink);
  }
  p.poly(
    [
      [10, 7],
      [22, 5],
      [28, 8],
      [30, 13],
      [25, 17],
      [12, 17],
      [7, 13],
    ],
    '#8c626d',
    true,
  );
  p.poly(
    [
      [12, 7],
      [21, 6],
      [27, 9],
      [23, 12],
      [12, 12],
    ],
    '#c68b91',
  );
  p.line([20, 7], [21, 16], 1, '#594453');
  p.r(15, 8, 5, 1, '#e5b8ac');
  p.poly(
    [
      [5, 9],
      [10, 7],
      [14, 10],
      [12, 15],
      [6, 15],
      [3, 12],
    ],
    '#d6ac6e',
    true,
  );
  p.r(5, 9, 3, 3, '#fff0c4');
  p.r(10, 9, 3, 3, '#fff0c4');
  p.r(6, 10, 2, 2, P.ink);
  p.r(11, 10, 2, 2, P.ink);
  p.line([5, 8], [3, 2], 1, P.ink);
  p.line([9, 7], [10, 1], 1, P.ink);
  p.r(2, 1, 2, 2, P.orangeLight);
  p.r(10, 0, 2, 2, P.orangeLight);
}
export function makeCharacters(scene: Phaser.Scene) {
  for (const big of [false, true])
    for (const pose of HERO_POSES)
      make(
        scene,
        `hero-${big ? 'big' : 'small'}-${pose}`,
        HERO_FRAME.width,
        HERO_FRAME.height,
        (p) => hero(p, big, pose),
      );
  make(scene, 'hero0', HERO_FRAME.width, HERO_FRAME.height, (p) =>
    hero(p, false, 'idle0'),
  );
  for (let f = 0; f < 4; f++) {
    make(scene, 'cat' + f, 32, 28, (p) => cat(p, f));
    make(scene, 'basket' + f, 32, 28, (p) => basket(p, f));
    make(scene, 'bug' + f, 32, 22, (p) => bug(p, f));
  }
  make(scene, 'hero-shadow', 28, 6, (p) => {
    p.poly(
      [
        [4, 1],
        [23, 1],
        [27, 3],
        [23, 5],
        [4, 5],
        [0, 3],
      ],
      '#0b1125',
    );
  });
}
