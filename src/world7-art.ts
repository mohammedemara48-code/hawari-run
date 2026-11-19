// World 7 (بورسعيد) art: the canal-side city of wooden balconies — pastel
// plaster house fronts with carved wooden balconies on top, a stone quay
// edged in blue and white, steel dock plates and pier planks, Egyptian flag
// bunting with Eid lanterns, the canal ferry, the crane hooks, containers and magnet,
// the pelican and the harbour barrel, and the port captain's crane. The
// creatures and the captain are drawn art baked into public/sprites (these
// code frames are only the fallback); everything faces left.
import Phaser from 'phaser';
import type { Theme } from './level-data';
import { disc, hash, poly, rect, tex, type Palette } from './art-kit';
import { make, type Pixels } from './characters';

type C = CanvasRenderingContext2D;
const T = 24;
export const W7_PALETTES: Record<'portsaid', Palette> = {
  // Bright Mediterranean light on pastel plaster and green-painted wood.
  portsaid: {
    sky: [
      [0, '#3a9ae0'],
      [0.6, '#9ad4f4'],
      [1, '#f4ecd8'],
    ],
    stone: ['#e8a0a8', '#f0c860', '#7ab0e0', '#a8d8a0'],
    mortar: '#f6f0e2',
    top: ['#e8dcc0', '#f2e6cc', '#dccfb0'],
    wood: ['#5a7a3a', '#7a9a4a', '#3a5228'],
    accent: '#2a7ac8',
    glow: '#fff0c8',
    window: '#22303a',
    windowLit: '#ffe4a8',
    fog: '#f0ecdc',
  },
};
export const isW7 = (theme: Theme) => theme === 'portsaid';
const WHITE = '#fbf6ea',
  INK = '#1b140f';
/** One pastel house front per stretch of wall (changes every 4 columns). */
const wallColour = (col: number) =>
  ['#e8a0a8', '#f0c860', '#7ab0e0', '#a8d8a0', '#f4f0e4'][
    Math.floor(hash(Math.floor(col / 4), 11) * 5)
  ];
const woodColour = (col: number) =>
  ['#4a8a5a', '#8a5a3a', '#3a6a9a', '#6a4a2a'][
    Math.floor(hash(Math.floor(col / 4), 13) * 4)
  ];

/* ───────────── Tiles ───────────── */
export function w7Stone(c: C, x: number, y: number, col: number, row: number) {
  rect(c, x, y, T, T, wallColour(col));
  const h = hash(col, row, 3);
  rect(c, x + 2 + Math.floor(h * 10), y + 4, 8, 2, '#ffffff22');
  rect(c, x + Math.floor(h * 12), y + 16, 10, 2, '#00000010');
  // Pilasters every fourth column, like the old colonial fronts.
  if (col % 4 === 0) {
    rect(c, x, y, 3, T, '#ffffff40');
    rect(c, x + 3, y, 1, T, '#0000001a');
  }
  if (row >= 13) {
    // The quay: dressed stone blocks with a blue-and-white painted kerb.
    rect(c, x, y, T, T, '#d8ccb0');
    rect(c, x, y + 11, T, 1, '#a89878');
    rect(c, x + (row % 2 ? 0 : 12), y, 1, 11, '#a89878');
    rect(c, x + (row % 2 ? 12 : 0), y + 12, 1, 12, '#a89878');
  }
}
export function w7Cap(c: C, x: number, y: number, col: number, row: number) {
  w7Stone(c, x, y, col, row);
  // A carved wooden balcony along the roof line: rail, balusters, shade.
  const wood = woodColour(col);
  rect(c, x, y, T, 3, INK);
  rect(c, x, y + 1, T, 2, wood);
  rect(c, x, y + 1, T, 1, '#ffffff55');
  for (let i = 1; i < T; i += 4) rect(c, x + i, y + 3, 2, 7, wood);
  rect(c, x, y + 10, T, 2, wood);
  rect(c, x, y + 12, T, 1, '#00000030');
}
export function w7Window(c: C, x: number, y: number, col: number, row: number) {
  w7Stone(c, x, y, col, row);
  // A tall shuttered window under a little cornice.
  const wood = woodColour(col);
  rect(c, x + 5, y + 3, 14, 2, WHITE);
  rect(c, x + 6, y + 5, 12, 16, '#22303a');
  rect(c, x + 6, y + 5, 5, 16, wood);
  rect(c, x + 13, y + 5, 5, 16, wood);
  for (let i = 7; i < 20; i += 3) {
    rect(c, x + 6, y + i, 5, 1, '#00000030');
    rect(c, x + 13, y + i, 5, 1, '#00000030');
  }
}
export function w7Slab(c: C, x: number, y: number) {
  // A riveted steel dock plate.
  rect(c, x, y, T, 12, '#2a3238');
  rect(c, x, y + 1, T, 9, '#7a8a94');
  rect(c, x, y + 1, T, 1, '#b8c8d0');
  for (const rx of [3, 19]) rect(c, x + rx, y + 4, 2, 2, '#3a4a52');
  rect(c, x + 8, y + 3, 8, 1, '#5a6a74');
}
export function w7Ledge(c: C, x: number, y: number, end: number) {
  // Pier planks on a timber post.
  rect(c, x, y, T, 6, '#3e2a18');
  rect(c, x, y, T, 4, '#b8865a');
  for (let i = 5; i < T; i += 6) rect(c, x + i, y, 1, 4, '#7a5432');
  if (end) rect(c, x + (end < 0 ? 1 : T - 4), y + 4, 3, 12, '#5a3c22');
}

/* ───────────── Near layer ───────────── */
export function w7Near(c: C, W: number) {
  // Egyptian flag bunting (red, white, black) with little Eid lanterns.
  const cols = ['#d83a3a', '#fbf6ea', '#1b140f'];
  for (let x = 0; x < W; x += 240) {
    c.strokeStyle = '#3a2a20';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(x, 4);
    c.quadraticCurveTo(x + 120, 30, x + 240, 4);
    c.stroke();
    for (let k = 1; k < 12; k++) {
      const t = k / 12,
        px = x + t * 240,
        py = 4 + 4 * t * (1 - t) * 26;
      if (k % 4 === 2) {
        // A fanoos hanging from the string.
        rect(c, px - 1, py, 2, 3, '#3a2a20');
        poly(
          c,
          [
            [px - 4, py + 3],
            [px + 4, py + 3],
            [px + 3, py + 12],
            [px - 3, py + 12],
          ],
          '#f4b030',
        );
        rect(c, px - 2, py + 5, 4, 5, '#fff2b0');
        continue;
      }
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
}

/* ───────────── Fallback creature frames ───────────── */
function pelican(p: Pixels, f: number) {
  const lean = f === 2 ? 3 : 0;
  p.box(6, 12, 22, 12, '#f4f0e6');
  p.box(4 - lean, 4, 6, 10, '#f4f0e6');
  p.box(-4 - lean * 2, 6, 10, 4, '#f0a040');
  p.r(6 - lean, 6, 2, 2, INK);
  p.r(12 + (f % 2) * 2, 24, 2, 6, '#f0a040');
  p.r(20 - (f % 2) * 2, 24, 2, 6, '#f0a040');
}
function barrel(p: Pixels, f: number) {
  p.box(4, 4, 24, 24, '#9a6a3a');
  for (const y of [8, 16, 24]) p.r(4, y, 24, 2, '#4a4a50');
  p.r(10 + (f % 2) * 4, 12, 3, 3, INK);
  p.r(18 + (f % 2) * 4, 12, 3, 3, INK);
}
export const CAPTAIN_POSES = [
  'idle0',
  'idle1',
  'aim',
  'drop',
  'jam',
  'charge',
  'hurt',
  'dead',
] as const;
function captain(p: Pixels, pose: string) {
  // Tracks, cab, captain and the boom; the drawn art replaces this.
  p.box(48, 92, 64, 16, '#3a3a40');
  p.box(52, 50, 56, 42, '#f08a30');
  p.box(60, 56, 22, 18, '#9ad0f0');
  p.box(70, 34, 22, 20, '#f2d0a0');
  p.box(66, 28, 30, 8, WHITE);
  p.r(60, 42, 50, 4, '#f4c040');
  p.r(10, 10, 60, 4, '#f4c040');
  if (
    pose === 'idle0' ||
    pose === 'idle1' ||
    pose === 'aim' ||
    pose === 'charge'
  )
    p.box(4, 26, 20, 14, '#d83a3a');
  if (pose === 'jam') p.r(84, 20, 12, 6, '#e8e8e8');
}

/* ───────────── Props ───────────── */
export function makePortSaidProps(scene: Phaser.Scene) {
  if (scene.textures.exists('container3')) return;
  for (let f = 0; f < 4; f++) {
    make(scene, 'pelican' + f, 34, 32, (p) => pelican(p, f));
    make(scene, 'barrel' + f, 30, 30, (p) => barrel(p, f));
  }
  for (const pose of CAPTAIN_POSES)
    make(scene, 'boss7-' + pose, 160, 112, (p) => captain(p, pose));
  // The canal ferry (معدية): a white deckhouse on a blue hull.
  tex(scene, 'ferry', 84, 34, (c) => {
    rect(c, 2, 18, 80, 12, INK);
    rect(c, 3, 19, 78, 10, '#2a5aa8');
    rect(c, 3, 19, 78, 2, '#5a8ad8');
    rect(c, 0, 14, 84, 5, INK);
    rect(c, 1, 15, 82, 3, WHITE);
    rect(c, 14, 4, 50, 11, INK);
    rect(c, 15, 5, 48, 9, WHITE);
    for (let i = 18; i < 60; i += 9) rect(c, i, 7, 5, 4, '#3a6aa8');
    rect(c, 36, 0, 4, 5, '#d83a3a');
  });
  // The cranes: a steel hook, the trolley on its rail, a 3-wide slung
  // container (platform) and the runaway crane magnet.
  tex(scene, 'crane-hook', 18, 22, (c) => {
    rect(c, 6, 0, 6, 8, INK);
    rect(c, 7, 1, 4, 6, '#f4c040');
    c.strokeStyle = INK;
    c.lineWidth = 5;
    c.beginPath();
    c.arc(9, 14, 5, -0.2, Math.PI * 1.15);
    c.stroke();
    c.strokeStyle = '#9aa4ac';
    c.lineWidth = 2.5;
    c.beginPath();
    c.arc(9, 14, 5, -0.2, Math.PI * 1.15);
    c.stroke();
  });
  tex(scene, 'crane-rail', 24, 12, (c) => {
    rect(c, 0, 0, 24, 12, INK);
    rect(c, 0, 1, 24, 10, '#f4c040');
    rect(c, 0, 1, 24, 2, '#fff0a0');
    poly(
      c,
      [
        [2, 10],
        [12, 3],
        [22, 10],
      ],
      '#c89020',
    );
  });
  tex(scene, 'crane-trolley', 26, 14, (c) => {
    rect(c, 0, 0, 26, 14, INK);
    rect(c, 2, 2, 22, 10, '#5a6a74');
    disc(c, 7, 12, 3, INK);
    disc(c, 19, 12, 3, INK);
  });
  const box = (c: C, w: number, h: number, col: string, dark: string) => {
    rect(c, 0, 0, w, h, INK);
    rect(c, 2, 2, w - 4, h - 4, col);
    for (let i = 6; i < w - 4; i += 5) rect(c, i, 3, 2, h - 6, dark);
    rect(c, 2, 2, w - 4, 2, '#ffffff55');
  };
  tex(scene, 'container3', 72, 30, (c) => box(c, 72, 30, '#2a7ac8', '#1a5a98'));
  tex(scene, 'container3b', 72, 30, (c) =>
    box(c, 72, 30, '#3a9a5a', '#2a7a42'),
  );
  tex(scene, 'magnet', 84, 96, (c) => {
    rect(c, 40, 0, 4, 40, '#3a3a42');
    rect(c, 30, 34, 24, 10, INK);
    rect(c, 32, 36, 20, 6, '#5a6a74');
    disc(c, 42, 66, 38, INK);
    disc(c, 42, 66, 34, '#7a8a94');
    disc(c, 42, 66, 22, '#5a6a74');
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      disc(c, 42 + Math.cos(a) * 28, 66 + Math.sin(a) * 28, 4, '#f4c040');
    }
    disc(c, 42, 66, 8, '#d83a3a');
  });
  // A falling cargo container (the captain's crane drops them).
  tex(scene, 'container', 48, 30, (c) => {
    rect(c, 0, 0, 48, 30, INK);
    rect(c, 2, 2, 44, 26, '#c83a2a');
    for (let i = 6; i < 44; i += 5) rect(c, i, 3, 2, 24, '#9a2a1e');
    rect(c, 2, 2, 44, 2, '#e86a5a');
    rect(c, 18, 12, 12, 4, WHITE);
  });
}
