// World 8 (سيوة) art: karshif salt-mud walls, sink-sand and salt crust,
// Cleopatra-style springs, shimmering mirages, date palms, the salt
// crystal weapon, the scorpion, the cream camel and «القِبْلي». Creature
// frames are painted art baked into public/sprites (these code frames are
// only the fallback); everything faces left.
import Phaser from 'phaser';
import type { Theme } from './level-data';
import { disc, hash, poly, rect, tex, type Palette } from './art-kit';
import { make, type Pixels } from './characters';

type C = CanvasRenderingContext2D;
const T = 24;
export const W8_PALETTES: Record<'siwa', Palette> = {
  // Hot western-desert light on ochre karshif and turquoise springs.
  siwa: {
    sky: [
      [0, '#3a8ad0'],
      [0.55, '#7ec4e8'],
      [1, '#f3e2b8'],
    ],
    stone: ['#c48a4a', '#d8a86a', '#b07840', '#e0c08a'],
    mortar: '#e8d4b0',
    top: ['#e8c888', '#d4b070', '#c49a58'],
    wood: ['#5a7a30', '#3a5a20', '#8a9a40'],
    accent: '#2aa0c8',
    glow: '#fff4c0',
    window: '#3a2418',
    windowLit: '#ffe4a0',
    fog: '#f4ead0',
  },
};
export const isW8 = (theme: Theme) => theme === 'siwa';
const INK = '#2a1a10';

export function w8Stone(c: C, x: number, y: number, col: number, row: number) {
  // Karshif: salt-mud chunks, uneven courses, pale bloom.
  const h = hash(col, row, 3);
  const base = ['#c48a4a', '#d0a060', '#b07840', '#c89858'][Math.floor(h * 4)];
  rect(c, x, y, T, T, base);
  const off = row % 2 ? 0 : 10;
  rect(c, x, y + 7, T, 1, '#e8d4b088');
  rect(c, x, y + 16, T, 1, '#00000018');
  rect(c, x + ((off + 4) % T), y, 1, 7, '#00000014');
  rect(c, x + ((off + 14) % T), y + 8, 1, 8, '#00000014');
  // Salt bloom flecks.
  for (let i = 0; i < 3; i++) {
    const fx = Math.floor(hash(col, row, i + 8) * 20);
    const fy = Math.floor(hash(col, row, i + 20) * 20);
    rect(c, x + fx, y + fy, 2, 1, '#f4ead088');
  }
  if (row >= 13) {
    rect(c, x, y, T, T, '#d8b060');
    rect(c, x, y + 2, T, 2, '#e8d090');
  }
}
export function w8Cap(c: C, x: number, y: number, col: number, row: number) {
  w8Stone(c, x, y, col, row);
  rect(c, x, y, T, 3, '#e8d090');
  rect(c, x, y, T, 1, '#fff4c888');
  // A crumbling merlon every other column, like Shali's battlements.
  if (col % 2 === 0) rect(c, x + 4, y - 3, 8, 3, '#c89858');
}
export function w8Window(c: C, x: number, y: number, col: number, row: number) {
  w8Stone(c, x, y, col, row);
  rect(c, x + 6, y + 5, 12, 14, INK);
  rect(c, x + 7, y + 6, 10, 12, '#3a2418');
  rect(c, x + 8, y + 7, 3, 5, '#ffe4a044');
  rect(c, x + 5, y + 4, 14, 2, '#a07040');
}
export function w8Slab(c: C, x: number, y: number) {
  rect(c, x, y, T, T, '#d8b878');
  rect(c, x, y, T, 3, '#e8d090');
  rect(c, x + 2, y + 8, 20, 1, '#00000014');
}
export function w8Ledge(c: C, x: number, y: number, end: number | boolean) {
  rect(c, x, y, T, 6, end ? '#c89858' : '#d8b060');
  rect(c, x, y, T, 2, '#f0dc9a');
  if (end) rect(c, x + T - 3, y, 3, 8, '#a07040');
}
export function w8Near(c: C, W: number) {
  // Date-palm fronds hanging into the top of the view.
  c.fillStyle = '#1e2a14';
  for (const x0 of [40, 180, 420, 620, 860]) {
    c.beginPath();
    c.moveTo(x0, 0);
    c.quadraticCurveTo(x0 + 80, 20, x0 + 140, 70);
    c.lineTo(x0 + 130, 74);
    c.quadraticCurveTo(x0 + 70, 24, x0 - 4, 0);
    c.fill();
    for (let i = 0; i < 7; i++) {
      const t = i / 6;
      const px = x0 + 140 * t,
        py = 8 + 60 * t * t;
      rect(c, px, py, 10, 2, '#2a4a18');
    }
  }
  void W;
}

export function sinkCell(
  c: C,
  x: number,
  y: number,
  col: number,
  row: number,
  deep = false,
) {
  rect(c, x, y, T, T, '#d2a050');
  const h = hash(col, row, 2);
  for (let i = 0; i < 5; i++) {
    const fx = Math.floor(hash(col, row, i + 4) * 20);
    const fy = 4 + Math.floor(hash(col, row, i + 11) * 16);
    rect(c, x + fx, y + fy, 5 + (h > 0.5 ? 2 : 0), 2, '#e8c070aa');
  }
  rect(c, x, y, T, 3, '#e8c878');
  rect(c, x + 2, y + 10, 8, 2, '#b0783088');
  if (deep) {
    rect(c, x, y + 3, T, T - 3, '#76552d');
    for (let i = 0; i < 3; i++) {
      rect(c, x + (i % 2 ? 3 : 10), y + 5 + i * 6, 11, 2, '#b58b48');
      rect(c, x + (i % 2 ? 12 : 1), y + 8 + i * 6, 8, 1, '#453b28');
    }
  }
}
export function saltCell(
  c: C,
  x: number,
  y: number,
  col: number,
  row: number,
  cap: boolean,
) {
  rect(c, x, y, T, T, cap ? '#f2eee6' : '#e4e0d6');
  for (let i = 0; i < 4; i++) {
    const fx = Math.floor(hash(col, row, i) * 20);
    const fy = Math.floor(hash(col, row, i + 7) * 18);
    rect(c, x + fx, y + fy, 3, 2, '#ffffffcc');
  }
  if (cap) {
    rect(c, x, y, T, 3, '#ffffff');
    rect(c, x, y + 3, T, 1, '#c8d8e0');
  }
  // Pink brine hint, like the salt lakes.
  if (hash(col, row, 9) > 0.7) rect(c, x + 4, y + 14, 10, 3, '#e8b0c088');
}

function saltCrystal(c: C, x: number, y: number, s: number) {
  poly(
    c,
    [
      [x, y + s],
      [x + s * 0.45, y],
      [x + s, y + s * 0.4],
      [x + s * 0.55, y + s],
    ],
    '#f4f8fc',
  );
  poly(
    c,
    [
      [x + s * 0.15, y + s * 0.7],
      [x + s * 0.45, y + s * 0.15],
      [x + s * 0.55, y + s * 0.45],
    ],
    '#c8e4f4',
  );
  rect(c, x + s * 0.35, y + s * 0.2, 2, 3, '#ffffff');
}

export function makeSiwaProps(scene: Phaser.Scene) {
  if (!scene.textures.exists('spring')) {
    tex(scene, 'spring', 24, 16, (c) => {
      rect(c, 1, 8, 22, 8, '#1a6a6a');
      rect(c, 2, 6, 20, 6, '#2aa0b0');
      rect(c, 3, 5, 18, 4, '#4ad0d0');
      rect(c, 6, 4, 6, 2, '#d8ffff');
      disc(c, 16, 7, 2, '#ffffffaa');
    });
  }
  if (!scene.textures.exists('mirage')) {
    tex(scene, 'mirage', 24, 10, (c) => {
      rect(c, 0, 2, 24, 6, '#c8e8f088');
      rect(c, 1, 3, 22, 4, '#f0f8ffaa');
      rect(c, 0, 2, 24, 1, '#ffffffcc');
    });
  }
  if (!scene.textures.exists('palm-siwa')) {
    tex(scene, 'palm-siwa', 32, 48, (c) => {
      rect(c, 14, 16, 5, 32, '#6a4a22');
      rect(c, 15, 16, 2, 32, '#8a6a32');
      c.fillStyle = '#2a6a28';
      for (const [dx, dy, len] of [
        [-14, 2, 16],
        [-6, -6, 14],
        [6, -8, 14],
        [14, 0, 16],
        [0, -10, 12],
      ] as [number, number, number][]) {
        c.beginPath();
        c.moveTo(16, 16);
        c.quadraticCurveTo(16 + dx * 0.5, 16 + dy - 4, 16 + dx, 16 + dy + 6);
        c.lineTo(16 + dx * 0.7, 16 + dy + 8);
        c.fill();
        void len;
      }
      // A couple of dates hanging.
      disc(c, 10, 20, 2, '#8a3a18');
      disc(c, 22, 21, 2, '#8a3a18');
    });
  }
  if (!scene.textures.exists('date')) {
    tex(scene, 'date', 12, 12, (c) => {
      disc(c, 6, 7, 4, '#5a2a10');
      disc(c, 6, 7, 3, '#8a4a18');
      disc(c, 5, 6, 1, '#c87838');
      rect(c, 5, 1, 2, 3, '#2a6a28');
    });
  }
  if (!scene.textures.exists('date-log')) {
    tex(scene, 'date-log', 24, 8, (c) => {
      rect(c, 0, 1, 24, 6, '#6a4a22');
      rect(c, 0, 1, 24, 2, '#8a6a32');
      rect(c, 6, 2, 2, 4, '#4a3018');
      rect(c, 16, 2, 2, 4, '#4a3018');
    });
  }
  if (!scene.textures.exists('shali-crack')) {
    tex(scene, 'shali-crack', 24, 24, (c) => {
      w8Stone(c, 0, 0, 3, 4);
      c.strokeStyle = '#3a2418';
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(4, 2);
      c.lineTo(10, 12);
      c.lineTo(8, 22);
      c.moveTo(14, 0);
      c.lineTo(18, 14);
      c.stroke();
    });
  }
  if (!scene.textures.exists('sand-mound')) {
    tex(scene, 'sand-mound', 28, 16, (c) => {
      poly(
        c,
        [
          [0, 16],
          [6, 6],
          [14, 2],
          [22, 6],
          [28, 16],
        ],
        '#d2a050',
      );
      poly(
        c,
        [
          [6, 16],
          [14, 6],
          [20, 16],
        ],
        '#e8c070',
      );
    });
  }
  if (!scene.textures.exists('board')) {
    tex(scene, 'board', 36, 8, (c) => {
      poly(
        c,
        [
          [0, 4],
          [4, 1],
          [32, 1],
          [36, 4],
          [32, 7],
          [4, 7],
        ],
        '#8a5a28',
      );
      rect(c, 6, 2, 24, 2, '#c48a48');
    });
  }
  // Weapon: a chunk of Siwa salt.
  tex(scene, 'salt', 16, 16, (c) => {
    saltCrystal(c, 2, 2, 12);
    saltCrystal(c, 0, 7, 8);
  });
  tex(scene, 'saltshot', 12, 12, (c) => saltCrystal(c, 1, 1, 10));
  if (!scene.textures.exists('siwa-food')) {
    tex(scene, 'siwa-food', 24, 20, (c) => {
      rect(c, 8, 2, 8, 3, '#3a5a20');
      disc(c, 8, 12, 5, '#5a2a10');
      disc(c, 16, 12, 5, '#6a3414');
      disc(c, 12, 15, 5, '#8a4a18');
      disc(c, 10, 10, 1, '#c87838');
    });
  }

  // Fallback drawings; baked atlas cells win inside make().
  const scorpion = (p: Pixels, f: number) => {
    const tail = f === 2 ? -4 : f === 3 ? 4 : 0;
    p.box(8, 20, 36, 12, '#c48a28');
    p.box(6, 24, 10, 8, '#a07020');
    p.box(4, 28, 8, 4, '#8a5a18');
    p.r(10, 22, 4, 3, '#2a1a10');
    for (let i = 0; i < 4; i++) p.box(16 + i * 6, 30, 3, 8, '#a07020');
    p.box(40, 8 + tail, 8, 20, '#c48a28');
    p.box(42, 4 + tail, 6, 8, '#8a5a18');
  };
  for (let f = 0; f < 4; f++)
    make(scene, 'scorpion' + f, 72, 48, (p) => scorpion(p, f));

  const camelDraw = (p: Pixels, f: number) => {
    const step = f ? 2 : 0;
    p.box(40, 18, 40, 22, '#efe4d0');
    p.box(28, 8, 18, 16, '#efe4d0');
    p.box(16, 12, 16, 10, '#efe4d0');
    p.box(8, 16, 12, 6, '#e8d8c0');
    p.box(4, 18, 6, 3, '#2a1a10');
    p.r(12, 14, 2, 2, '#2a1a10');
    p.box(50, 8, 22, 16, '#a04030');
    p.box(30 + step, 38, 6, 26, '#efe4d0');
    p.box(48 - step, 38, 6, 26, '#efe4d0');
    p.box(62 + step, 38, 6, 26, '#efe4d0');
    p.box(76 - step, 38, 6, 26, '#efe4d0');
    p.box(86, 28, 10, 4, '#efe4d0');
  };
  make(scene, 'camel0', 120, 72, (p) => camelDraw(p, 0));
  make(scene, 'camel1', 120, 72, (p) => camelDraw(p, 1));

  const qibli = (p: Pixels, pose: string) => {
    const flash = pose === 'charge' || pose === 'slam' ? '#f0c060' : '#d89830';
    p.box(40, 30, 80, 80, flash);
    p.box(60, 50, 16, 10, '#2a1a10');
    p.box(90, 50, 16, 10, '#2a1a10');
    p.box(70, 80, 30, 16, '#2a1a10');
  };
  for (const pose of [
    'idle0',
    'idle1',
    'charge',
    'slam',
    'hurt',
    'dead',
    'bury',
  ])
    make(scene, 'boss8-' + pose, 160, 160, (p) => qibli(p, pose));
}
