// World art for the four themed levels: tilesets painted per tile with
// deterministic variation (no two neighbouring tiles alike), Cairo-landmark
// parallax layers, props, lighting brushes and particle sprites.
// Everything is drawn in code for this game — no external images.
import Phaser from 'phaser';
import type { Theme } from './level-data';
import { SOLID, type Parsed } from './level-parse';

type C = CanvasRenderingContext2D;
const T = 24;
export const hash = (a: number, b: number, s = 0) => {
  let h = (a * 374761393 + b * 668265263 + s * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
function rect(c: C, x: number, y: number, w: number, h: number, color: string) {
  c.fillStyle = color;
  c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}
function poly(c: C, pts: number[][], color: string) {
  c.fillStyle = color;
  c.beginPath();
  pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.closePath();
  c.fill();
}
function disc(
  c: C,
  x: number,
  y: number,
  r: number,
  color: string,
  start = 0,
  end = Math.PI * 2,
) {
  c.fillStyle = color;
  c.beginPath();
  c.moveTo(x, y);
  c.arc(x, y, r, start, end);
  c.closePath();
  c.fill();
}
function grad(c: C, y0: number, y1: number, stops: [number, string][]) {
  const g = c.createLinearGradient(0, y0, 0, y1);
  for (const [o, col] of stops) g.addColorStop(o, col);
  return g;
}
function tex(
  scene: Phaser.Scene,
  key: string,
  w: number,
  h: number,
  paint: (c: C) => void,
) {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const t = scene.textures.createCanvas(key, w, h)!;
  t.context.imageSmoothingEnabled = false;
  paint(t.context);
  t.refresh();
  return t;
}
function sign(
  c: C,
  x: number,
  y: number,
  w: number,
  text: string,
  bg: string,
  fg: string,
) {
  rect(c, x - 1, y - 1, w + 2, 15, '#1d1416');
  rect(c, x, y, w, 13, bg);
  rect(c, x, y, w, 2, '#ffffff22');
  c.fillStyle = fg;
  c.font = 'bold 10px Changa, Tahoma, sans-serif';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.direction = 'rtl';
  c.fillText(text, x + w / 2, y + 7);
}

/* ───────────────────────── Palettes ───────────────────────── */
export interface Palette {
  sky: [number, string][];
  stone: string[];
  mortar: string;
  top: string[];
  wood: string[];
  accent: string;
  glow: string;
  window: string;
  windowLit: string;
  fog: string;
}
export const PALETTES: Record<Theme, Palette> = {
  night: {
    sky: [
      [0, '#070b1f'],
      [0.55, '#1a2350'],
      [1, '#3d3561'],
    ],
    stone: ['#4a4057', '#54485f', '#3f3750', '#5c4f66'],
    mortar: '#2a2236',
    top: ['#8a7c92', '#a497a8', '#6b5f77'],
    wood: ['#5a3a2e', '#7a5240', '#3c261f'],
    accent: '#ffcf7a',
    glow: '#ffbf5a',
    window: '#26304e',
    windowLit: '#ffcf7a',
    fog: '#1b1d3b',
  },
  market: {
    sky: [
      [0, '#4b2f5e'],
      [0.45, '#d9675a'],
      [0.8, '#f4a95f'],
      [1, '#ffd88f'],
    ],
    stone: ['#b9825a', '#c48d62', '#a8744f', '#cf9a6c'],
    mortar: '#7a4f39',
    top: ['#e9c18c', '#f2d29f', '#d9ab78'],
    wood: ['#7a4b2e', '#9c6640', '#5a3420'],
    accent: '#ffd36b',
    glow: '#ffb35c',
    window: '#4a3a4a',
    windowLit: '#ffd88f',
    fog: '#e8915e',
  },
  roof: {
    sky: [
      [0, '#4f9fe0'],
      [0.6, '#9fd4f2'],
      [1, '#f4e6c4'],
    ],
    stone: ['#d9b58c', '#e3c29a', '#cda67d', '#e8caa6'],
    mortar: '#a07d5e',
    top: ['#f6efe0', '#ffffff', '#e2d6c0'],
    wood: ['#8a5b3a', '#b07a4f', '#5f3c26'],
    accent: '#ffe08a',
    glow: '#fff0b0',
    window: '#3e5a6e',
    windowLit: '#9fd0e6',
    fog: '#bfe0f0',
  },
  sewer: {
    sky: [
      [0, '#0c1416'],
      [1, '#1c2b2c'],
    ],
    stone: ['#3b4a4e', '#435458', '#33403f', '#4b5c5e'],
    mortar: '#1f2a2b',
    top: ['#7d9088', '#93a79b', '#5e716b'],
    wood: ['#4d3a2a', '#6b5038', '#2f241b'],
    accent: '#9fe3c4',
    glow: '#b7f0c0',
    window: '#1a2426',
    windowLit: '#e8d07a',
    fog: '#173032',
  },
};

/* ─────────────────────── Tile painting ─────────────────────── */
function stoneFill(
  c: C,
  x: number,
  y: number,
  col: number,
  row: number,
  pal: Palette,
  theme: Theme,
) {
  const h = hash(col, row),
    base = pal.stone[Math.floor(h * pal.stone.length)];
  rect(c, x, y, T, T, base);
  // Staggered block courses with varied widths.
  const off = row % 2 ? 0 : 12;
  rect(c, x, y + 11, T, 1, pal.mortar);
  rect(c, x, y + 23, T, 1, pal.mortar);
  rect(c, x + ((off + Math.floor(h * 5)) % T), y, 1, 11, pal.mortar);
  rect(
    c,
    x + ((off + 12 + Math.floor(hash(col, row, 1) * 5)) % T),
    y + 12,
    1,
    11,
    pal.mortar,
  );
  // Per-block tint and highlight.
  rect(c, x + 1, y + 1, 9, 1, '#ffffff18');
  rect(c, x + 13, y + 13, 8, 1, '#ffffff14');
  if (h > 0.82) {
    // Crack.
    rect(c, x + 6, y + 3, 1, 4, pal.mortar);
    rect(c, x + 7, y + 6, 1, 3, pal.mortar);
    rect(c, x + 8, y + 8, 2, 1, pal.mortar);
  } else if (h < 0.12) {
    // Weathered plaster patch.
    rect(c, x + 3, y + 14, 10, 7, theme === 'sewer' ? '#2c3a39' : '#00000022');
    rect(c, x + 4, y + 15, 7, 1, '#ffffff1c');
  } else if (h > 0.6 && h < 0.66 && theme === 'sewer') {
    rect(c, x + 2, y + 18, 6, 5, '#3f6b4a');
    rect(c, x + 3, y + 17, 3, 1, '#5f9a68');
  }
}
function capTop(
  c: C,
  x: number,
  y: number,
  col: number,
  row: number,
  pal: Palette,
  theme: Theme,
) {
  const h = hash(col, row, 7);
  if (theme === 'night') {
    // Cobblestones with a moonlit rim.
    rect(c, x, y, T, 8, pal.top[2]);
    for (let i = 0; i < 3; i++) {
      const w = 6 + Math.floor(hash(col, row, i) * 3);
      rect(c, x + i * 8 + 1, y + 1, w, 5, pal.top[i % 2]);
      rect(c, x + i * 8 + 1, y + 1, w, 1, '#c9bfd2');
    }
    rect(c, x, y + 7, T, 2, '#241c30');
  } else if (theme === 'market') {
    // Cement floor tiles with a little geometric star.
    rect(c, x, y, T, 7, pal.top[Math.floor(h * 3)]);
    rect(c, x, y, T, 1, '#fff2cf');
    rect(c, x + 11, y + 2, 2, 3, '#a8603e');
    rect(c, x + 10, y + 3, 4, 1, '#a8603e');
    rect(c, x + 23, y, 1, 7, '#b98a5e');
    rect(c, x, y + 7, T, 2, '#6e4430');
  } else if (theme === 'roof') {
    // White-washed parapet lip.
    rect(c, x, y, T, 6, pal.top[Math.floor(h * 3)]);
    rect(c, x, y + 6, T, 2, '#b8a48a');
    rect(c, x, y, T, 1, '#ffffff');
    if (h > 0.7) rect(c, x + 4, y + 2, 5, 2, '#d8c8b0');
  } else {
    // Wet concrete curb with moss tufts.
    rect(c, x, y, T, 7, pal.top[Math.floor(h * 3)]);
    rect(c, x, y, T, 1, '#b8d8c4');
    if (h > 0.5) {
      rect(c, x + 2 + Math.floor(h * 10), y - 2, 5, 3, '#4f8a54');
      rect(c, x + 3 + Math.floor(h * 10), y - 3, 2, 1, '#7fc07a');
    }
    rect(c, x, y + 7, T, 2, '#162022');
  }
}
function facadeWindow(
  c: C,
  x: number,
  y: number,
  col: number,
  row: number,
  pal: Palette,
  theme: Theme,
) {
  const h = hash(col, row, 3),
    lit = theme === 'night' ? h > 0.45 : theme === 'sewer' ? h > 0.8 : false;
  if (theme === 'sewer') {
    // Vent grille.
    rect(c, x + 3, y + 5, 18, 14, '#151d1e');
    for (let i = 0; i < 4; i++)
      rect(c, x + 5 + i * 4, y + 6, 2, 12, lit ? '#e8d07a' : '#3a4a4a');
    return;
  }
  // Mashrabiya / shuttered window with a stone frame.
  rect(c, x + 2, y + 2, 20, 21, '#2a1d1c');
  rect(c, x + 3, y + 3, 18, 19, lit ? pal.windowLit : pal.window);
  if (h > 0.5) {
    // Lattice.
    for (let i = 0; i < 18; i += 3) {
      rect(c, x + 3 + i, y + 3, 1, 19, '#5b3b2a');
      rect(c, x + 3, y + 3 + i, 18, 1, '#5b3b2a');
    }
  } else {
    rect(c, x + 3, y + 3, 9, 19, theme === 'roof' ? '#4f8a7a' : '#3f6b62');
    rect(c, x + 12, y + 3, 9, 19, theme === 'roof' ? '#5f9a8a' : '#4a7a70');
    for (let i = 5; i < 22; i += 3) rect(c, x + 3, y + i, 18, 1, '#2d4a44');
  }
  rect(c, x + 1, y + 22, 22, 2, pal.top[0]);
  rect(c, x + 1, y, 22, 2, pal.top[2]);
}
function slab(
  c: C,
  x: number,
  y: number,
  col: number,
  row: number,
  pal: Palette,
  theme: Theme,
) {
  const h = hash(col, row, 11);
  if (theme === 'sewer') {
    rect(c, x, y, T, 10, '#56636a');
    rect(c, x, y, T, 2, '#9aa9ae');
    for (let i = 2; i < T; i += 6) rect(c, x + i, y + 3, 3, 6, '#2c3539');
    rect(c, x, y + 10, T, 2, '#1d2427');
  } else if (theme === 'roof') {
    rect(c, x, y, T, 12, '#c9c1b1');
    rect(c, x, y, T, 2, '#f1ebdf');
    rect(c, x, y + 12, T, 2, '#7d7466');
    if (h > 0.6) rect(c, x + 6, y + 13, 1, 6, '#6b4a3a');
    rect(c, x + 3, y + 5, 4, 3, '#b0a898');
  } else {
    rect(c, x, y, T, 10, pal.wood[1]);
    rect(c, x, y, T, 2, pal.accent + '88');
    rect(c, x, y + 5, T, 1, pal.wood[2]);
    rect(c, x + Math.floor(h * 16), y + 2, 1, 3, pal.wood[2]);
    rect(c, x, y + 10, T, 2, pal.wood[2]);
  }
}
function ledge(
  c: C,
  x: number,
  y: number,
  col: number,
  row: number,
  pal: Palette,
  theme: Theme,
  end: number,
) {
  const h = hash(col, row, 5);
  if (theme === 'night') {
    // Wooden balcony plank on a mashrabiya rail.
    rect(c, x, y, T, 5, pal.wood[1]);
    rect(c, x, y, T, 1, '#c79a72');
    rect(c, x, y + 5, T, 1, pal.wood[2]);
    for (let i = 2; i < T; i += 5) rect(c, x + i, y + 6, 2, 6, pal.wood[0]);
    rect(c, x, y + 11, T, 2, pal.wood[2]);
  } else if (theme === 'market') {
    // Shop shelf with jars of pickles and spices.
    rect(c, x, y, T, 4, pal.wood[1]);
    rect(c, x, y, T, 1, '#e9b88a');
    rect(c, x, y + 4, T, 2, pal.wood[2]);
    if (h > 0.4) {
      const jar = ['#c94f35', '#e0a43a', '#6b9a4a', '#8a4fa0'][
        Math.floor(h * 4)
      ];
      rect(c, x + 4, y + 6, 6, 6, jar);
      rect(c, x + 5, y + 6, 4, 1, '#ffffff55');
    }
  } else if (theme === 'roof') {
    // Steel beam / water tank stand.
    rect(c, x, y, T, 5, '#8c939a');
    rect(c, x, y, T, 1, '#d8dde2');
    rect(c, x, y + 5, T, 1, '#4c5156');
    if ((col + row) % 3 === 0) rect(c, x + 10, y + 6, 3, 8, '#5d6266');
  } else {
    // Pipe walkway.
    rect(c, x, y, T, 6, '#6b7b6f');
    rect(c, x, y + 1, T, 2, '#a3b8a8');
    rect(c, x, y + 6, T, 1, '#27302b');
    if (col % 4 === 0) rect(c, x + 2, y - 1, 4, 8, '#8a6a3a');
  }
  if (end) {
    // Bracket under the free end.
    rect(c, x + (end < 0 ? 0 : T - 3), y + 4, 3, 8, '#2a2024');
  }
}

/** Paints a level's static terrain into chunked canvas textures. */
export function paintLevel(
  scene: Phaser.Scene,
  L: Parsed,
  index: number,
  overlay = false,
) {
  const theme = L.meta.theme,
    pal = PALETTES[theme];
  const chunks: { key: string; x: number }[] = [];
  const CW = 960;
  const solid = (c: number, r: number) =>
    SOLID.has(L.at(c, r)) && L.at(c, r) !== 'T';
  const fake = (c: number, r: number) => L.at(c, r) === 'Q';
  for (let x0 = 0; x0 < L.width; x0 += CW) {
    const key = `lvl${index}-${overlay ? 'q' : 't'}-${x0}`,
      w = Math.min(CW, L.width - x0);
    tex(scene, key, w, L.height, (c) => {
      const c0 = Math.floor(x0 / T),
        c1 = Math.min(L.cols - 1, Math.floor((x0 + w - 1) / T));
      for (let row = 0; row < L.rows; row++)
        for (let col = c0; col <= c1; col++) {
          const ch = L.at(col, row),
            x = col * T - x0,
            y = row * T;
          if (overlay) {
            if (!fake(col, row)) continue;
            stoneFill(c, x, y, col, row, pal, theme);
            if (!fake(col, row - 1) && !solid(col, row - 1))
              capTop(c, x, y, col, row, pal, theme);
            continue;
          }
          if (ch === '#') {
            const exposed = !solid(col, row - 1);
            // Facade detail inside tall masses.
            let depth = 0;
            while (depth < 4 && solid(col, row - depth - 1)) depth++;
            const wide = solid(col - 1, row) && solid(col + 1, row);
            const tall = solid(col, row + 2) && solid(col, row + 1);
            stoneFill(c, x, y, col, row, pal, theme);
            if (
              !exposed &&
              wide &&
              tall &&
              depth >= 1 &&
              col % 3 === 1 &&
              row % 3 === 0 &&
              hash(col, row, 9) > 0.25
            )
              facadeWindow(c, x, y, col, row, pal, theme);
            if (exposed) capTop(c, x, y, col, row, pal, theme);
            // Soft shading at the edges of masses.
            if (!solid(col - 1, row)) rect(c, x, y, 2, T, '#ffffff16');
            if (!solid(col + 1, row)) rect(c, x + T - 2, y, 2, T, '#00000033');
            if (depth >= 2) rect(c, x, y, T, T, '#0000000c');
          } else if (ch === '=') slab(c, x, y, col, row, pal, theme);
          else if (ch === '-') {
            const end =
              L.at(col - 1, row) !== '-'
                ? -1
                : L.at(col + 1, row) !== '-'
                  ? 1
                  : 0;
            ledge(c, x, y, col, row, pal, theme, end);
          }
        }
      if (!overlay) {
        // Clotheslines with laundry (decor drawn into the terrain).
        for (const { a, b } of L.lines) {
          const ax = a.x - x0,
            bx = b.x - x0;
          c.strokeStyle = '#2a2024';
          c.lineWidth = 1;
          c.beginPath();
          c.moveTo(ax, a.y - 10);
          c.quadraticCurveTo((ax + bx) / 2, (a.y + b.y) / 2 - 4, bx, b.y - 10);
          c.stroke();
          for (const p of [a, b]) {
            rect(c, p.x - x0 - 2, p.y - 14, 4, 30, '#5c4a40');
            rect(c, p.x - x0 - 4, p.y - 14, 8, 3, '#8a6a52');
          }
          const n = Math.floor(Math.hypot(b.x - a.x, b.y - a.y) / 34);
          for (let i = 1; i < n; i++) {
            if (hash(a.col, i) < 0.3) continue;
            const t = i / n,
              px = ax + (bx - ax) * t,
              py = a.y - 10 + (b.y - a.y) * t - Math.sin(t * Math.PI) * 2;
            const colr = [
              '#e8e2d0',
              '#d24a4a',
              '#3d6fb0',
              '#e8b84a',
              '#6aa86a',
            ][Math.floor(hash(i, a.row) * 5)];
            const kind = hash(a.row, i, 2);
            if (kind > 0.5) {
              // Shirt.
              poly(
                c,
                [
                  [px - 7, py + 1],
                  [px + 7, py + 1],
                  [px + 9, py + 5],
                  [px + 5, py + 6],
                  [px + 5, py + 16],
                  [px - 5, py + 16],
                  [px - 5, py + 6],
                  [px - 9, py + 5],
                ],
                colr,
              );
              rect(c, px - 5, py + 2, 10, 1, '#ffffff44');
            } else {
              // Towel / galabeya.
              rect(c, px - 5, py + 1, 10, 18, colr);
              rect(c, px - 5, py + 15, 10, 2, '#00000033');
            }
            rect(c, px - 1, py - 1, 2, 3, '#c8a070');
          }
        }
      }
    });
    chunks.push({ key, x: x0 });
  }
  return chunks;
}

/* ─────────────────────────── Props ─────────────────────────── */
export function makeProps(scene: Phaser.Scene) {
  if (scene.textures.exists('lantern-on')) return;
  for (const on of [false, true])
    tex(scene, on ? 'lantern-on' : 'lantern-off', 20, 34, (c) => {
      // Fanoos on a wall bracket.
      rect(c, 9, 0, 2, 5, '#2a2024');
      poly(
        c,
        [
          [10, 4],
          [16, 9],
          [4, 9],
        ],
        '#3d2a20',
      );
      rect(c, 4, 9, 12, 2, '#c99a3a');
      poly(
        c,
        [
          [4, 11],
          [16, 11],
          [18, 20],
          [14, 28],
          [6, 28],
          [2, 20],
        ],
        '#2a1d18',
      );
      poly(
        c,
        [
          [5, 12],
          [15, 12],
          [16, 20],
          [13, 26],
          [7, 26],
          [4, 20],
        ],
        on ? '#ffd36b' : '#5a4a3a',
      );
      if (on) {
        poly(
          c,
          [
            [7, 14],
            [10, 13],
            [9, 24],
            [7, 22],
          ],
          '#fff3c4',
        );
        rect(c, 12, 15, 2, 8, '#ffb347');
      } else {
        rect(c, 7, 14, 2, 10, '#7a6a52');
      }
      for (const yy of [16, 21]) rect(c, 3, yy, 14, 1, '#c99a3a');
      rect(c, 6, 28, 8, 2, '#c99a3a');
      rect(c, 9, 30, 2, 4, '#c99a3a');
    });
  // Golden fanoos: the hidden secret in every level.
  tex(scene, 'fanoos-gold', 22, 32, (c) => {
    rect(c, 10, 0, 2, 4, '#7a5a20');
    poly(
      c,
      [
        [11, 3],
        [19, 9],
        [3, 9],
      ],
      '#b8862a',
    );
    poly(
      c,
      [
        [3, 9],
        [19, 9],
        [21, 18],
        [16, 27],
        [6, 27],
        [1, 18],
      ],
      '#5a3a10',
    );
    poly(
      c,
      [
        [4, 10],
        [18, 10],
        [19, 18],
        [15, 25],
        [7, 25],
        [3, 18],
      ],
      '#ffd23f',
    );
    poly(
      c,
      [
        [6, 11],
        [10, 11],
        [9, 23],
        [6, 19],
      ],
      '#fff6c8',
    );
    for (const yy of [14, 19]) rect(c, 2, yy, 18, 1, '#b8862a');
    rect(c, 9, 15, 4, 4, '#e83f5a');
    rect(c, 6, 27, 10, 2, '#b8862a');
    rect(c, 10, 29, 2, 3, '#b8862a');
  });
  // Ghost ledge: a plank the lantern light reveals.
  tex(scene, 'ghost', 24, 12, (c) => {
    rect(c, 0, 0, 24, 6, '#ffd77a');
    rect(c, 0, 0, 24, 1, '#fff6d0');
    rect(c, 0, 5, 24, 2, '#b8803a');
    for (let i = 3; i < 24; i += 6) rect(c, i, 7, 2, 5, '#c8903a');
  });
  tex(scene, 'ghost-hint', 24, 12, (c) => {
    for (let i = 0; i < 24; i += 4) rect(c, i, 0, 2, 1, '#ffe7b0');
    for (let i = 2; i < 24; i += 4) rect(c, i, 5, 2, 1, '#ffe7b0');
  });
  // Awning segments: striped canvas with a scalloped edge.
  for (const [k, a, b] of [
    ['awning0', '#d8443a', '#f4ead2'],
    ['awning1', '#2f8a5a', '#f4ead2'],
    ['awning2', '#2f62a8', '#ffd36b'],
  ])
    tex(scene, k, 24, 16, (c) => {
      for (let i = 0; i < 24; i += 6) {
        rect(c, i, 0, 3, 10, a);
        rect(c, i + 3, 0, 3, 10, b);
      }
      rect(c, 0, 0, 24, 2, '#ffffff55');
      for (let i = 0; i < 24; i += 6) {
        disc(c, i + 3, 10, 3, i % 12 ? b : a, 0, Math.PI);
      }
      rect(c, 0, 10, 24, 1, '#00000033');
    });
  tex(scene, 'awning-pole', 4, 24, (c) => {
    rect(c, 1, 0, 2, 24, '#5a3a2a');
    rect(c, 1, 0, 1, 24, '#8a6a4a');
  });
  // Vendor cart: a foul-medames cart with a copper pot.
  tex(scene, 'vcart', 72, 40, (c) => {
    rect(c, 2, 10, 68, 14, '#1d1416');
    rect(c, 3, 11, 66, 12, '#2f7a9a');
    rect(c, 3, 11, 66, 2, '#8fd0e0');
    for (let i = 8; i < 66; i += 12) rect(c, 3 + i, 13, 2, 10, '#ffd36b');
    rect(c, 3, 8, 66, 3, '#e8d2a2');
    // Copper pot (idra).
    poly(
      c,
      [
        [44, 8],
        [46, -0],
        [60, -0],
        [62, 8],
      ],
      '#b8602a',
    );
    rect(c, 46, 0, 14, 2, '#ffb36b');
    rect(c, 52, -2, 2, 2, '#6a3a1a');
    // Wheels.
    for (const wx of [14, 56]) {
      disc(c, wx, 31, 8, '#1d1416');
      disc(c, wx, 31, 6, '#8a5a3a');
      disc(c, wx, 31, 2, '#e8c070');
      rect(c, wx - 6, 30, 12, 1, '#5a3a2a');
      rect(c, wx - 1, 25, 1, 12, '#5a3a2a');
    }
    sign(c, 14, 12, 28, 'فول', '#c83a3a', '#fff6d8');
  });
  // Crumbling crate.
  tex(scene, 'ccrate', 24, 24, (c) => {
    rect(c, 0, 0, 24, 24, '#3a2418');
    rect(c, 1, 1, 22, 22, '#a8743e');
    rect(c, 1, 1, 22, 2, '#d8a466');
    for (const y of [8, 15]) rect(c, 1, y, 22, 1, '#6a4422');
    poly(
      c,
      [
        [2, 2],
        [5, 2],
        [22, 20],
        [22, 22],
        [19, 22],
        [2, 5],
      ],
      '#7a4e28',
    );
    rect(c, 15, 4, 1, 4, '#3a2418');
    rect(c, 16, 7, 2, 1, '#3a2418');
    sign(c, 3, 9, 18, 'عطارة', '#d8a466', '#5a2a10');
  });
  // Satellite dish on a stand.
  tex(scene, 'dish', 28, 24, (c) => {
    rect(c, 12, 14, 3, 10, '#5d6266');
    rect(c, 6, 22, 15, 2, '#3d4246');
    c.save();
    c.translate(14, 10);
    c.rotate(-0.35);
    c.fillStyle = '#1d2226';
    c.beginPath();
    c.ellipse(0, 0, 13, 7, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#e8ecef';
    c.beginPath();
    c.ellipse(0, 0, 12, 6, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#b8c0c6';
    c.beginPath();
    c.ellipse(1, 1, 8, 3, 0, 0, Math.PI * 2);
    c.fill();
    c.restore();
    rect(c, 14, 6, 1, 6, '#3d4246');
    rect(c, 13, 5, 3, 2, '#e85a3a');
  });
  tex(scene, 'plank', 48, 12, (c) => {
    rect(c, 0, 0, 48, 10, '#2a1d18');
    rect(c, 1, 1, 46, 8, '#8a6a42');
    rect(c, 1, 1, 46, 2, '#c8a070');
    for (const x of [15, 31]) rect(c, x, 1, 1, 8, '#4a3020');
    rect(c, 2, 9, 44, 3, '#3a6a6a');
  });
  tex(scene, 'lift', 48, 14, (c) => {
    rect(c, 0, 0, 48, 12, '#1d2226');
    rect(c, 1, 1, 46, 10, '#7d8a8e');
    rect(c, 1, 1, 46, 2, '#c8d4d8');
    for (let i = 4; i < 46; i += 8) rect(c, i, 4, 4, 5, '#4a5458');
    rect(c, 2, 11, 44, 3, '#e8b84a');
    for (let i = 2; i < 46; i += 8) rect(c, i, 11, 4, 3, '#1d2226');
  });
  tex(scene, 'chain', 4, 24, (c) => {
    rect(c, 1, 0, 2, 5, '#8a9498');
    rect(c, 1, 7, 2, 5, '#5d6668');
    rect(c, 1, 14, 2, 5, '#8a9498');
    rect(c, 1, 21, 2, 3, '#5d6668');
  });
  tex(scene, 'glass', 24, 12, (c) => {
    for (const [x, h, col] of [
      [1, 8, '#8fd0c0'],
      [6, 12, '#bfeee0'],
      [11, 7, '#6fb0a0'],
      [15, 11, '#dffff4'],
      [19, 9, '#8fd0c0'],
    ] as [number, number, string][])
      poly(
        c,
        [
          [x, 12],
          [x + 2, 12 - h],
          [x + 4, 12],
        ],
        col,
      );
  });
  tex(scene, 'water', 48, 16, (c) => {
    rect(c, 0, 4, 48, 12, '#1f6a6aee');
    for (let i = 0; i < 48; i += 12) {
      rect(c, i, 2, 8, 2, '#6fd0c0');
      rect(c, i + 2, 1, 4, 1, '#c8fff0');
    }
    rect(c, 0, 8, 48, 1, '#3f9a8a');
  });
  tex(scene, 'water-body', 8, 8, (c) => rect(c, 0, 0, 8, 8, '#174f52'));
  // Theme exits: a carved doorway with a hanging fanoos.
  tex(scene, 'exit-door', 56, 84, (c) => {
    rect(c, 0, 10, 56, 74, '#2a1d18');
    disc(c, 28, 28, 28, '#2a1d18', Math.PI, 0);
    rect(c, 4, 14, 48, 70, '#c88a4a');
    disc(c, 28, 28, 24, '#c88a4a', Math.PI, 0);
    rect(c, 9, 18, 38, 66, '#5a2e1a');
    disc(c, 28, 30, 19, '#5a2e1a', Math.PI, 0);
    for (let y = 30; y < 84; y += 8) rect(c, 9, y, 38, 1, '#3a1d10');
    rect(c, 27, 18, 2, 66, '#3a1d10');
    for (const [x, y] of [
      [14, 40],
      [40, 40],
      [14, 64],
      [40, 64],
    ])
      disc(c, x, y, 2, '#e8b84a');
    // Hanging fanoos above the door.
    rect(c, 27, 0, 2, 8, '#2a1d18');
    poly(
      c,
      [
        [22, 8],
        [34, 8],
        [36, 14],
        [32, 20],
        [24, 20],
        [20, 14],
      ],
      '#ffd36b',
    );
    rect(c, 24, 10, 3, 8, '#fff3c4');
  });
  tex(scene, 'checkpoint-flag', 30, 66, (c) => {
    rect(c, 3, 4, 3, 62, '#4a3a30');
    rect(c, 2, 2, 5, 3, '#e8b84a');
    poly(
      c,
      [
        [6, 6],
        [29, 12],
        [6, 22],
      ],
      '#2f8a5a',
    );
    poly(
      c,
      [
        [6, 8],
        [24, 12],
        [6, 17],
      ],
      '#5fbf7f',
    );
    disc(c, 13, 13, 3, '#fff6d0');
    rect(c, 0, 62, 10, 4, '#2a2024');
  });
  tex(scene, 'checkpoint-lit', 30, 66, (c) => {
    rect(c, 3, 4, 3, 62, '#4a3a30');
    rect(c, 2, 2, 5, 3, '#ffe68a');
    poly(
      c,
      [
        [6, 6],
        [29, 12],
        [6, 22],
      ],
      '#ffb34a',
    );
    poly(
      c,
      [
        [6, 8],
        [24, 12],
        [6, 17],
      ],
      '#ffe08a',
    );
    disc(c, 13, 13, 3, '#ffffff');
    rect(c, 0, 62, 10, 4, '#2a2024');
  });
  // Lighting brushes and particles.
  const radial = (key: string, size: number, stops: [number, string][]) =>
    tex(scene, key, size, size, (c) => {
      const g = c.createRadialGradient(
        size / 2,
        size / 2,
        0,
        size / 2,
        size / 2,
        size / 2,
      );
      for (const [o, col] of stops) g.addColorStop(o, col);
      c.fillStyle = g;
      c.fillRect(0, 0, size, size);
    });
  radial('light', 256, [
    [0, 'rgba(255,255,255,1)'],
    [0.45, 'rgba(255,255,255,0.85)'],
    [0.75, 'rgba(255,255,255,0.35)'],
    [1, 'rgba(255,255,255,0)'],
  ]);
  radial('glow', 128, [
    [0, 'rgba(255,220,150,0.9)'],
    [0.35, 'rgba(255,170,80,0.45)'],
    [1, 'rgba(255,140,40,0)'],
  ]);
  tex(scene, 'shaft', 80, 260, (c) => {
    const g = c.createLinearGradient(0, 0, 0, 260);
    g.addColorStop(0, 'rgba(255,240,200,0.55)');
    g.addColorStop(1, 'rgba(255,240,200,0)');
    c.fillStyle = g;
    poly(
      c,
      [
        [26, 0],
        [54, 0],
        [80, 260],
        [0, 260],
      ],
      'rgba(0,0,0,0)',
    );
    c.beginPath();
    c.moveTo(26, 0);
    c.lineTo(54, 0);
    c.lineTo(80, 260);
    c.lineTo(0, 260);
    c.closePath();
    c.fill();
  });
  tex(scene, 'firefly', 6, 6, (c) => {
    rect(c, 2, 0, 2, 6, '#fff6a0');
    rect(c, 0, 2, 6, 2, '#fff6a0');
    rect(c, 2, 2, 2, 2, '#ffffff');
  });
  tex(scene, 'mote', 2, 2, (c) => rect(c, 0, 0, 2, 2, '#ffffff'));
  tex(scene, 'steam', 16, 16, (c) => {
    const g = c.createRadialGradient(8, 8, 0, 8, 8, 8);
    g.addColorStop(0, 'rgba(255,255,255,0.8)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, 16, 16);
  });
  tex(scene, 'drip', 2, 5, (c) => {
    rect(c, 0, 0, 2, 5, '#9fe3d4');
    rect(c, 0, 0, 1, 2, '#ffffff');
  });
  tex(scene, 'streak', 26, 2, (c) => {
    rect(c, 0, 0, 26, 1, '#ffffffaa');
    rect(c, 8, 1, 14, 1, '#ffffff55');
  });
  tex(scene, 'feather', 5, 3, (c) => {
    rect(c, 0, 1, 5, 1, '#e8ecf4');
    rect(c, 1, 0, 3, 3, '#c8d0e0');
  });
  tex(scene, 'bird', 12, 6, (c) => {
    rect(c, 0, 1, 4, 1, '#2a2a38');
    rect(c, 4, 2, 4, 2, '#2a2a38');
    rect(c, 8, 1, 4, 1, '#2a2a38');
  });
}

/* ─────────────────────── Parallax layers ─────────────────────── */
function citadel(
  c: C,
  x: number,
  base: number,
  s: number,
  col: string,
  lit: string,
) {
  // Muhammad Ali mosque: great dome, cascading half-domes, pencil minarets.
  rect(c, x - 70 * s, base - 30 * s, 140 * s, 30 * s, col);
  rect(c, x - 90 * s, base - 14 * s, 180 * s, 14 * s, col);
  for (const [dx, r] of [
    [-44, 16],
    [44, 16],
    [-24, 22],
    [24, 22],
  ])
    disc(c, x + dx * s, base - 30 * s, r * s, col, Math.PI, 0);
  rect(c, x - 30 * s, base - 46 * s, 60 * s, 16 * s, col);
  disc(c, x, base - 46 * s, 30 * s, col, Math.PI, 0);
  rect(c, x - 1.5 * s, base - 84 * s, 3 * s, 10 * s, col);
  disc(c, x, base - 84 * s, 2 * s, col);
  for (const dx of [-62, 62]) {
    rect(c, x + dx * s - 3 * s, base - 130 * s, 6 * s, 130 * s, col);
    for (const b of [70, 100])
      rect(c, x + dx * s - 5 * s, base - b * s, 10 * s, 3 * s, col);
    poly(
      c,
      [
        [x + dx * s - 3 * s, base - 130 * s],
        [x + dx * s + 3 * s, base - 130 * s],
        [x + dx * s, base - 150 * s],
      ],
      col,
    );
    if (lit) rect(c, x + dx * s - 1, base - 72 * s, 2, 2, lit);
  }
  if (lit)
    for (let i = -3; i <= 3; i++)
      rect(c, x + i * 10 * s, base - 22 * s, 2, 3, lit);
}
function cairoTower(
  c: C,
  x: number,
  base: number,
  s: number,
  col: string,
  lit: string,
) {
  poly(
    c,
    [
      [x - 6 * s, base],
      [x + 6 * s, base],
      [x + 4 * s, base - 120 * s],
      [x - 4 * s, base - 120 * s],
    ],
    col,
  );
  // Lotus crown.
  poly(
    c,
    [
      [x - 4 * s, base - 120 * s],
      [x - 12 * s, base - 132 * s],
      [x - 9 * s, base - 140 * s],
      [x + 9 * s, base - 140 * s],
      [x + 12 * s, base - 132 * s],
      [x + 4 * s, base - 120 * s],
    ],
    col,
  );
  rect(c, x - 1, base - 160 * s, 2, 20 * s, col);
  if (lit) {
    for (let y = 10; y < 118; y += 9)
      rect(c, x - 1, base - y * s, 2, 1, lit + '88');
    rect(c, x - 8 * s, base - 134 * s, 16 * s, 2, lit);
    rect(c, x, base - 162 * s, 1, 2, '#ff5a5a');
  }
}
function azhar(
  c: C,
  x: number,
  base: number,
  s: number,
  col: string,
  lit: string,
) {
  // Stacked Mamluk minaret with a twin finial.
  rect(c, x - 7 * s, base - 50 * s, 14 * s, 50 * s, col);
  rect(c, x - 9 * s, base - 52 * s, 18 * s, 3 * s, col);
  rect(c, x - 5 * s, base - 82 * s, 10 * s, 30 * s, col);
  rect(c, x - 7 * s, base - 84 * s, 14 * s, 3 * s, col);
  for (const dx of [-3, 3]) {
    rect(c, x + dx * s - 2 * s, base - 100 * s, 4 * s, 16 * s, col);
    disc(c, x + dx * s, base - 100 * s, 3 * s, col);
    rect(c, x + dx * s, base - 108 * s, 1, 6 * s, col);
  }
  if (lit) rect(c, x - 1, base - 70 * s, 2, 6, lit);
}
function dome(c: C, x: number, base: number, r: number, col: string) {
  rect(c, x - r, base - r * 0.6, r * 2, r * 0.6, col);
  disc(c, x, base - r * 0.6, r, col, Math.PI, 0);
  rect(c, x - 1, base - r * 1.6 - 6, 2, 8, col);
}
function pyramids(
  c: C,
  x: number,
  base: number,
  s: number,
  a: string,
  b: string,
) {
  for (const [dx, h] of [
    [0, 90],
    [120, 70],
    [200, 40],
  ]) {
    poly(
      c,
      [
        [x + dx * s - h * s, base],
        [x + dx * s, base - h * s],
        [x + dx * s + h * s, base],
      ],
      a,
    );
    poly(
      c,
      [
        [x + dx * s, base - h * s],
        [x + dx * s + h * s, base],
        [x + dx * s + h * 0.3 * s, base],
      ],
      b,
    );
  }
}
function houseRow(
  c: C,
  y: number,
  h: number,
  seed: number,
  cols: string[],
  lit: string,
  dark: boolean,
  w = 960,
) {
  let x = -10;
  let i = 0;
  while (x < w + 10) {
    const bw = 50 + Math.floor(hash(i, seed) * 70),
      bh = h * (0.6 + hash(seed, i) * 0.55),
      col = cols[i % cols.length];
    rect(c, x, y - bh, bw, bh + 400, col);
    rect(c, x, y - bh, bw, 3, '#ffffff14');
    // Windows / mashrabiya boxes.
    for (let wy = y - bh + 12; wy < y - 14; wy += 22)
      for (let wx = x + 8; wx < x + bw - 12; wx += 18) {
        const r = hash(wx, wy, seed);
        if (r < 0.25) continue;
        const on = dark ? r > 0.55 : false;
        rect(c, wx, wy, 9, 12, on ? lit : '#00000040');
        if (r > 0.8) rect(c, wx - 2, wy + 12, 13, 2, '#00000055');
      }
    // Rooftop clutter.
    const r = hash(i, seed, 4);
    if (r > 0.55) {
      // Satellite dish.
      c.fillStyle = col;
      c.beginPath();
      c.ellipse(x + bw * 0.3, y - bh - 6, 7, 4, -0.4, 0, Math.PI * 2);
      c.fill();
      rect(c, x + bw * 0.3, y - bh - 4, 2, 5, col);
    } else if (r > 0.3) {
      // Water tank.
      rect(c, x + bw * 0.6, y - bh - 12, 14, 9, col);
      rect(c, x + bw * 0.6 + 2, y - bh - 3, 2, 3, col);
      rect(c, x + bw * 0.6 + 10, y - bh - 3, 2, 3, col);
    }
    x += bw - 2;
    i++;
  }
}
function mashrabiyaHouse(
  c: C,
  x: number,
  base: number,
  w: number,
  h: number,
  col: string,
  trim: string,
  lit: string,
  night: boolean,
  seed: number,
) {
  rect(c, x, base - h, w, h, col);
  rect(c, x, base - h, w, 4, trim);
  rect(c, x - 3, base - h - 4, w + 6, 5, trim);
  for (let y = base - h + 16; y < base - 40; y += 44) {
    for (let wx = x + 10; wx < x + w - 30; wx += 40) {
      const r = hash(wx, y, seed);
      if (r > 0.5) {
        // Projecting mashrabiya box.
        rect(c, wx - 4, y - 2, 34, 32, '#3a2418');
        rect(c, wx - 2, y, 30, 28, night && r > 0.7 ? lit : '#6a4428');
        for (let i = 0; i < 30; i += 4) {
          rect(c, wx - 2 + i, y, 1, 28, '#3a2418');
          rect(c, wx - 2, y + i, 30, 1, '#3a2418');
        }
        rect(c, wx - 6, y + 28, 38, 4, '#2a1810');
      } else {
        rect(c, wx, y, 18, 26, '#2a1d18');
        rect(c, wx + 2, y + 2, 14, 22, night && r > 0.2 ? lit : '#3f6b62');
        rect(c, wx + 8, y + 2, 2, 22, '#2a1d18');
        rect(c, wx - 3, y + 26, 24, 3, trim);
        if (r < 0.2) {
          // AC unit.
          rect(c, wx + 20, y + 8, 14, 10, '#d8dce0');
          rect(c, wx + 22, y + 10, 10, 6, '#8a9094');
        }
      }
    }
  }
  // Ground-floor shop.
  rect(c, x + 6, base - 34, w - 12, 34, '#2a1d18');
  rect(c, x + 8, base - 32, w - 16, 32, night ? '#4a3020' : '#7a5a3a');
  for (let i = x + 10; i < x + w - 10; i += 6)
    rect(c, i, base - 30, 1, 30, '#00000044');
}
export function makeParallax(scene: Phaser.Scene, theme: Theme) {
  const pal = PALETTES[theme];
  const W = 960,
    H = 360;
  const key = (n: string) => `${theme}-${n}`;
  if (scene.textures.exists(key('sky'))) return;
  tex(scene, key('sky'), W, H, (c) => {
    c.fillStyle = grad(c, 0, H, pal.sky);
    c.fillRect(0, 0, W, H);
    if (theme === 'night') {
      for (let i = 0; i < 140; i++) {
        const x = hash(i, 1) * W,
          y = hash(i, 2) * H * 0.7;
        rect(
          c,
          x,
          y,
          hash(i, 3) > 0.9 ? 2 : 1,
          hash(i, 3) > 0.9 ? 2 : 1,
          hash(i, 4) > 0.5 ? '#ffffff' : '#c8d0ff',
        );
      }
      disc(c, 760, 70, 26, '#fff6d8');
      disc(c, 770, 64, 24, '#1a2350');
      c.globalAlpha = 0.25;
      disc(c, 760, 70, 44, '#fff6d8');
      c.globalAlpha = 1;
    } else if (theme === 'market') {
      disc(c, 220, 250, 60, '#ffd88f');
      disc(c, 220, 250, 44, '#fff0c0');
      for (let i = 0; i < 6; i++) {
        const x = hash(i, 9) * W,
          y = 60 + hash(i, 8) * 120;
        rect(c, x, y, 120 + hash(i, 7) * 80, 6, '#f8b8a0aa');
        rect(c, x + 20, y - 5, 70, 5, '#ffd0b8aa');
      }
    } else if (theme === 'roof') {
      disc(c, 150, 70, 30, '#fff8d8');
      for (let i = 0; i < 7; i++) {
        const x = hash(i, 19) * W,
          y = 30 + hash(i, 18) * 110;
        for (let k = 0; k < 4; k++)
          disc(c, x + k * 16, y - (k % 2) * 6, 14, '#ffffffdd');
        rect(c, x - 10, y, 74, 10, '#ffffffdd');
      }
    } else {
      // Tunnel wall.
      for (let y = 0; y < H; y += 12)
        for (let x = (y / 12) % 2 ? 0 : 16; x < W; x += 32) {
          rect(c, x, y, 31, 11, hash(x, y) > 0.5 ? '#16201f' : '#1a2524');
          rect(c, x, y, 31, 1, '#22302e');
        }
    }
  });
  tex(scene, key('far'), W, H, (c) => {
    if (theme === 'night') {
      const col = '#232b55';
      houseRow(c, 330, 70, 3, [col, '#262f5a', '#20284f'], '#ffcf7a99', true);
      citadel(c, 260, 270, 0.9, col, '#ffcf7a');
      cairoTower(c, 640, 290, 1, col, '#ffcf7a');
      azhar(c, 820, 280, 0.9, col, '#ffcf7a');
      azhar(c, 860, 285, 0.8, col, '#ffcf7a');
      dome(c, 470, 290, 22, col);
      dome(c, 90, 300, 18, col);
    } else if (theme === 'market') {
      const col = '#8a4a58';
      houseRow(c, 330, 80, 5, [col, '#94505e', '#7e4452'], '#ffd88f', false);
      azhar(c, 140, 270, 1.1, col, '');
      azhar(c, 180, 278, 0.9, col, '');
      dome(c, 330, 280, 30, col);
      // Khan el-Khalili gate (Bab al-Badistan).
      rect(c, 520, 180, 120, 120, col);
      disc(c, 580, 220, 34, '#c86a5a', Math.PI, 0);
      rect(c, 546, 220, 68, 80, '#c86a5a');
      for (let i = 0; i < 5; i++) rect(c, 530 + i * 24, 172, 12, 10, col);
      citadel(c, 820, 290, 0.6, col, '');
    } else if (theme === 'roof') {
      const pyr = '#e8c890',
        pyrShade = '#c8a070';
      pyramids(c, 120, 300, 0.9, pyr, pyrShade);
      // The Nile with a bridge.
      rect(c, 0, 300, W, 18, '#6fb0d0');
      rect(c, 0, 302, W, 2, '#bfe6f4');
      for (let x = 380; x < 760; x += 38) {
        rect(c, x, 286, 4, 18, '#8a9aa8');
        c.strokeStyle = '#8a9aa8';
        c.lineWidth = 2;
        c.beginPath();
        c.arc(x + 19, 300, 17, Math.PI, 0);
        c.stroke();
      }
      rect(c, 370, 284, 400, 4, '#7a8a98');
      cairoTower(c, 640, 290, 0.9, '#8aa0b4', '');
      citadel(c, 860, 296, 0.5, '#9aa8b8', '');
      houseRow(c, 340, 40, 9, ['#c8b8a0', '#d4c4ac', '#bcac94'], '', false);
    } else {
      // Metro tunnel arches with a lit platform sign.
      for (let x = 0; x < W; x += 240) {
        rect(c, x, 80, 240, 280, '#101818');
        disc(c, x + 120, 200, 100, '#0b1212', Math.PI, 0);
        rect(c, x + 20, 200, 200, 160, '#0b1212');
        for (let i = 0; i < 9; i++)
          rect(c, x + 26 + i * 22, 112 + Math.abs(4 - i) * 6, 4, 4, '#2a3a3a');
      }
      sign(c, 400, 150, 70, 'محطة العتبة', '#1f4a8a', '#ffffff');
      sign(c, 780, 160, 50, 'مترو', '#c83a3a', '#ffffff');
    }
  });
  tex(scene, key('mid'), W, H, (c) => {
    if (theme === 'night' || theme === 'market') {
      const night = theme === 'night';
      const cols = night
        ? ['#3a3256', '#41385c', '#352d50']
        : ['#b06a4e', '#c07a58', '#a05e44'];
      let x = 0,
        i = 0;
      while (x < W) {
        const w = 120 + Math.floor(hash(i, 21) * 70),
          h = 160 + Math.floor(hash(i, 22) * 90);
        mashrabiyaHouse(
          c,
          x,
          360,
          w,
          h,
          cols[i % 3],
          night ? '#5a4f78' : '#e8c09a',
          '#ffcf7a',
          night,
          i,
        );
        if (!night) {
          const labels = [
            'فول وطعمية',
            'عطارة',
            'خردوات',
            'كشري',
            'عصير قصب',
            'حلواني',
          ];
          sign(
            c,
            x + 14,
            360 - 50,
            w - 28,
            labels[i % labels.length],
            ['#2f62a8', '#2f8a5a', '#c83a3a'][i % 3],
            '#fff6d8',
          );
        } else if (i % 2)
          sign(
            c,
            x + 18,
            360 - 50,
            w - 36,
            ['قهوة المعلّم', 'مكوجي', 'بقالة'][i % 3],
            '#2a2040',
            '#ffcf7a',
          );
        x += w + 6;
        i++;
      }
      // Strings of little lanterns / bunting between houses.
      c.strokeStyle = night ? '#00000088' : '#3a241888';
      for (let k = 0; k < 4; k++) {
        const y0 = 70 + k * 30;
        c.beginPath();
        c.moveTo(k * 240, y0);
        c.quadraticCurveTo(k * 240 + 120, y0 + 30, k * 240 + 240, y0);
        c.stroke();
        for (let t = 0.1; t < 1; t += 0.12) {
          const px = k * 240 + 240 * t,
            py = y0 + 60 * t * (1 - t);
          if (night)
            rect(
              c,
              px - 2,
              py,
              4,
              6,
              hash(k, t * 100) > 0.4 ? '#ffcf7a' : '#ff8a5a',
            );
          else
            poly(
              c,
              [
                [px - 4, py],
                [px + 4, py],
                [px, py + 8],
              ],
              ['#e8443a', '#ffd36b', '#2f8a5a', '#2f62a8'][
                Math.floor(t * 8) % 4
              ],
            );
        }
      }
    } else if (theme === 'roof') {
      houseRow(c, 360, 120, 13, ['#c09a78', '#b08a6a', '#cca684'], '', false);
      // Pigeon towers (gheyya).
      for (const x of [180, 610]) {
        poly(
          c,
          [
            [x - 16, 250],
            [x + 16, 250],
            [x + 26, 120],
            [x - 26, 120],
          ],
          '#8a6a4a',
        );
        for (let y = 130; y < 250; y += 12)
          rect(c, x - 22 + (y - 120) / 12, y, 44 - (y - 120) / 6, 2, '#5a4030');
        rect(c, x - 30, 112, 60, 8, '#5a4030');
        rect(c, x - 1, 90, 2, 22, '#5a4030');
        rect(c, x, 90, 14, 8, '#d8443a');
      }
    } else {
      // Pipes and girders.
      for (let x = 0; x < W; x += 160) {
        rect(c, x + 30, 0, 14, 360, '#24302f');
        rect(c, x + 32, 0, 3, 360, '#3a4a48');
        for (let y = 40; y < 360; y += 90) rect(c, x + 26, y, 22, 6, '#4a3a2a');
      }
      rect(c, 0, 60, W, 10, '#2c3a38');
      rect(c, 0, 62, W, 2, '#4a5a58');
      for (let x = 80; x < W; x += 320) {
        rect(c, x, 20, 50, 30, '#1a2222');
        for (let i = 0; i < 5; i++)
          rect(c, x + 4 + i * 10, 22, 4, 26, '#e8d07a55');
      }
    }
  });
  tex(scene, key('near'), W, H, (c) => {
    const col =
      theme === 'night'
        ? '#0a0b1a'
        : theme === 'market'
          ? '#3a1d18'
          : theme === 'roof'
            ? '#5a4a3a'
            : '#050909';
    if (theme === 'market') {
      // Hanging fabric and lanterns from the top edge.
      for (let x = 0; x < W; x += 80) {
        const h = 14 + hash(x, 3) * 22;
        poly(
          c,
          [
            [x, 0],
            [x + 70, 0],
            [x + 60, h],
            [x + 35, h + 8],
            [x + 10, h],
          ],
          ['#9a2a2a', '#2a6a4a', '#2a4a8a'][(x / 80) % 3],
        );
        rect(c, x, 0, 70, 3, '#ffd36b');
      }
    } else if (theme === 'roof') {
      for (let x = 30; x < W; x += 300) {
        // Antennas silhouetted at the top corners.
        rect(c, x, 0, 3, 50, col);
        for (let k = 0; k < 4; k++)
          rect(c, x - 12 + k * 2, 10 + k * 10, 27 - k * 4, 2, col);
      }
    } else {
      for (let x = 0; x < W; x += 120) {
        const h = 10 + hash(x, 5) * 18;
        rect(c, x, 0, 120, h, col);
        if (theme === 'sewer')
          for (let k = 0; k < 3; k++)
            rect(c, x + 20 + k * 30, h, 2, 6 + k * 3, '#2a4a48');
        else {
          c.strokeStyle = col;
          c.beginPath();
          c.moveTo(x, h + 4);
          c.quadraticCurveTo(x + 60, h + 24, x + 120, h + 4);
          c.stroke();
        }
      }
    }
  });
}
