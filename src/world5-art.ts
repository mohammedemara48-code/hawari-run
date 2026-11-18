// World 5 (الأقصر) art: sun-baked sandstone carved with bands of
// hieroglyph-style ornament (abstract marks, never real writing), recumbent
// ram-headed sphinxes on their plinths, lotus columns, pouring sand slides,
// the Nile bank with reeds and feluccas, hot-air balloons at dawn, the
// painted plaster of a royal tomb lit by torches, crushing pillars, rotating
// stone doors and their levers. Drawn in code like the rest of the game.
import Phaser from 'phaser';
import type { Theme } from './level-data';
import { disc, hash, poly, rect, tex, type Palette } from './art-kit';

type C = CanvasRenderingContext2D;
const T = 24;
export const W5_PALETTES: Record<'temple' | 'nile' | 'tomb', Palette> = {
  // Warm sandstone in low sun.
  temple: {
    sky: [
      [0, '#3a78b8'],
      [0.6, '#9ac4e0'],
      [1, '#f0dcb0'],
    ],
    stone: ['#c8955a', '#d2a064', '#bd8a50', '#d8aa6e'],
    mortar: '#8a5e32',
    top: ['#e8c48a', '#f0cc92', '#dcb880'],
    wood: ['#7a5232', '#9a6a40', '#4e3420'],
    accent: '#2a8a8a',
    glow: '#ffd88a',
    window: '#3a2416',
    windowLit: '#ffcf7a',
    fog: '#f0d8a8',
  },
  // Dawn on the river bank: mud brick and quay stone.
  nile: {
    sky: [
      [0, '#4a5a8a'],
      [0.6, '#d0a0a8'],
      [1, '#f8d8b8'],
    ],
    stone: ['#a8845a', '#b48e62', '#9c7a52', '#ba966a'],
    mortar: '#6a4e30',
    top: ['#5a8a3a', '#6a9a44', '#4e7a32'],
    wood: ['#6a4a2a', '#8a6038', '#3e2a18'],
    accent: '#3a8aa8',
    glow: '#ffe0b0',
    window: '#2a1c12',
    windowLit: '#ffd8a0',
    fog: '#e8c8c0',
  },
  // A royal tomb: painted plaster in warm torchlight, readable not pitch-black.
  tomb: {
    sky: [
      [0, '#1e140c'],
      [0.6, '#3a2818'],
      [1, '#5a3c24'],
    ],
    stone: ['#b07a4a', '#bc8454', '#a67244', '#c48e5c'],
    mortar: '#5a3c28',
    top: ['#dcb47c', '#e6be86', '#d0aa72'],
    wood: ['#7a5638', '#9a6e48', '#5a3c28'],
    accent: '#2a7a8a',
    glow: '#ffb860',
    window: '#2a1c12',
    windowLit: '#ffb860',
    fog: '#7a5a3a',
  },
};
export const isW5 = (theme: Theme) =>
  theme === 'temple' || theme === 'nile' || theme === 'tomb';
const TURQ = '#2aa8a0',
  OCHRE = '#c8642a',
  LAPIS = '#2a4a9a',
  GOLD = '#e8b84a';

/** One abstract hieroglyph-style mark in a 6×8 cell (ornament only: the
 * shapes are invented and never combine into writing). */
export function glyph(c: C, x: number, y: number, k: number, ink: string) {
  switch (k % 10) {
    case 0: // zigzag ripple
      for (let i = 0; i < 3; i++) {
        rect(c, x, y + 1 + i * 3, 2, 1, ink);
        rect(c, x + 2, y + 2 + i * 3, 2, 1, ink);
        rect(c, x + 4, y + 1 + i * 3, 2, 1, ink);
      }
      break;
    case 1: // ring with a dot
      rect(c, x + 1, y + 1, 4, 1, ink);
      rect(c, x + 1, y + 5, 4, 1, ink);
      rect(c, x, y + 2, 1, 3, ink);
      rect(c, x + 5, y + 2, 1, 3, ink);
      rect(c, x + 2, y + 3, 2, 1, ink);
      break;
    case 2: // dome over a bar
      rect(c, x + 1, y + 3, 4, 2, ink);
      rect(c, x + 2, y + 2, 2, 1, ink);
      rect(c, x, y + 6, 6, 1, ink);
      break;
    case 3: // stalk with two leaves
      rect(c, x + 2, y, 1, 8, ink);
      rect(c, x + 3, y + 1, 2, 1, ink);
      rect(c, x, y + 3, 2, 1, ink);
      break;
    case 4: // stepped triangle
      rect(c, x + 2, y + 2, 2, 1, ink);
      rect(c, x + 1, y + 4, 4, 1, ink);
      rect(c, x, y + 6, 6, 1, ink);
      break;
    case 5: // hook and dot
      rect(c, x + 1, y + 1, 1, 5, ink);
      rect(c, x + 2, y + 5, 3, 1, ink);
      rect(c, x + 4, y + 2, 1, 1, ink);
      break;
    case 6: // crescent
      rect(c, x + 1, y + 2, 1, 3, ink);
      rect(c, x + 2, y + 1, 2, 1, ink);
      rect(c, x + 2, y + 5, 2, 1, ink);
      rect(c, x + 4, y + 2, 1, 1, ink);
      rect(c, x + 4, y + 4, 1, 1, ink);
      break;
    case 7: // three strokes
      for (let i = 0; i < 3; i++) rect(c, x + i * 2, y + 1, 1, 6, ink);
      break;
    case 8: // diamond
      rect(c, x + 2, y + 1, 2, 1, ink);
      rect(c, x + 1, y + 2, 4, 3, ink);
      rect(c, x + 2, y + 5, 2, 1, ink);
      break;
    default: // cross-hatched square
      rect(c, x, y + 1, 6, 1, ink);
      rect(c, x, y + 6, 6, 1, ink);
      rect(c, x, y + 1, 1, 6, ink);
      rect(c, x + 5, y + 1, 1, 6, ink);
      rect(c, x + 2, y + 3, 2, 2, ink);
  }
}

/* ───────────── Tiles ───────────── */
export function w5Stone(
  c: C,
  x: number,
  y: number,
  col: number,
  row: number,
  pal: Palette,
  theme: Theme,
) {
  const h = hash(col, row);
  if (theme === 'tomb') {
    // Plastered tomb wall: cream plaster gone amber with age, painted
    // bands, columns of carved marks in lapis and ochre, cracks.
    rect(c, x, y, T, T, ['#c9a06a', '#d4aa72', '#bc9662'][Math.floor(h * 3)]);
    rect(c, x, y, T, 1, '#00000022');
    if (row % 4 === 3) {
      // A painted frieze band.
      rect(c, x, y + 2, T, 3, OCHRE);
      rect(c, x, y + 5, T, 1, '#5a3c24');
      for (let i = 0; i < T; i += 6) {
        rect(c, x + i + 1, y + 7, 4, 3, i % 12 ? LAPIS : TURQ);
        rect(c, x + i + 2, y + 6, 2, 1, GOLD);
      }
      rect(c, x, y + 11, T, 1, '#5a3c24');
    } else {
      rect(c, x + 11, y, 1, T, '#8a6240');
      for (const gx of [3, 15])
        glyph(
          c,
          x + gx,
          y + 4 + Math.floor(hash(col, row, gx) * 8),
          Math.floor(hash(col, row, gx + 1) * 10),
          hash(col, row, gx + 2) > 0.5 ? '#3a4a7a' : '#8a3a1c',
        );
    }
    if (h > 0.86) {
      rect(c, x + 6, y + 3, 1, 9, '#5a3c28');
      rect(c, x + 7, y + 11, 1, 6, '#5a3c28');
    }
    return;
  }
  if (theme === 'nile') {
    // River bank: courses of sun-dried mud brick over a stone quay.
    rect(c, x, y, T, T, pal.stone[Math.floor(h * pal.stone.length)]);
    const off = row % 2 ? 0 : 6;
    for (const yy of [7, 15, 23]) rect(c, x, y + yy, T, 1, pal.mortar);
    for (let i = 0; i < 3; i++) {
      const yy = i * 8;
      rect(c, x + ((off + i * 6) % 12), y + yy, 1, 7, pal.mortar);
      rect(c, x + ((off + i * 6) % 12) + 12, y + yy, 1, 7, pal.mortar);
    }
    rect(c, x + 2, y + 2, 2, 1, '#d8b88a');
    rect(c, x + 14, y + 10, 2, 1, '#d8b88a');
    if (row >= 13) rect(c, x, y, T, T, '#2a3a2a44');
    return;
  }
  // Temple sandstone: big ashlar, two courses per tile, grain and wear.
  rect(c, x, y, T, T, pal.stone[Math.floor(h * pal.stone.length)]);
  const off = row % 2 ? 0 : 12;
  rect(c, x, y + 11, T, 1, pal.mortar);
  rect(c, x, y + 23, T, 1, pal.mortar);
  rect(c, x + ((off + 4) % T), y, 1, 11, pal.mortar);
  rect(c, x + ((off + 16) % T), y + 12, 1, 11, pal.mortar);
  rect(c, x + 1, y + 1, 9, 1, '#ffffff22');
  for (let i = 0; i < 3; i++)
    rect(
      c,
      x + Math.floor(hash(col, row, i + 20) * 22),
      y + Math.floor(hash(col, row, i + 30) * 22),
      2,
      1,
      '#00000018',
    );
  if (row % 5 === 2 && col % 2 === 0) {
    // A carved band: a sunken panel with two columns of marks in relief.
    rect(c, x + 2, y + 2, 20, 20, '#a8743e');
    rect(c, x + 2, y + 2, 20, 1, '#6a4422');
    rect(c, x + 2, y + 21, 20, 1, '#f0c890');
    rect(c, x + 11, y + 3, 1, 18, '#6a4422');
    for (const [gx, gy, s] of [
      [4, 4, 1],
      [4, 13, 2],
      [14, 4, 3],
      [14, 13, 4],
    ])
      glyph(
        c,
        x + gx,
        y + gy,
        Math.floor(hash(col, row, s) * 10),
        hash(col, row, s + 5) > 0.82 ? '#1e6a6a' : '#5a3418',
      );
  }
}
export function w5Cap(
  c: C,
  x: number,
  y: number,
  col: number,
  row: number,
  pal: Palette,
  theme: Theme,
) {
  const h = hash(col, row, 7);
  if (theme === 'tomb') {
    // Worn floor flags with a skin of dust.
    rect(c, x, y, T, 6, '#5a3c28');
    rect(c, x, y, T, 4, pal.top[Math.floor(h * 3)]);
    rect(c, x, y, T, 1, '#e0c090');
    if (h > 0.5) rect(c, x + 4, y + 1, 6, 1, '#c8a478');
    return;
  }
  if (theme === 'nile') {
    // Grassy bank with reed tufts.
    rect(c, x, y, T, 8, '#4a3420');
    rect(c, x, y, T, 4, pal.top[Math.floor(h * 3)]);
    rect(c, x, y, T, 1, '#a8d070');
    for (let i = 0; i < 3; i++) {
      const gx = x + Math.floor(hash(col, row, i + 40) * 22);
      rect(c, gx, y - 4, 1, 5, '#5a8a3a');
      rect(c, gx + 2, y - 2, 1, 3, '#7aa84a');
    }
    if (h > 0.8) {
      // A papyrus head.
      rect(c, x + 12, y - 9, 1, 10, '#5a8a3a');
      poly(
        c,
        [
          [x + 12, y - 9],
          [x + 8, y - 13],
          [x + 17, y - 13],
        ],
        '#8ab850',
      );
    }
    return;
  }
  // Sand drifted over the top course: ripples and a few pebbles.
  rect(c, x, y, T, 7, '#9a6a3a');
  rect(c, x, y, T, 5, pal.top[Math.floor(h * 3)]);
  rect(c, x, y, T, 1, '#fff0c8');
  rect(c, x + 2 + Math.floor(h * 6), y + 2, 8, 1, '#d0a46a');
  if (h > 0.7) rect(c, x + 15, y + 1, 2, 2, '#8a6a4a');
}
export function w5Window(
  c: C,
  x: number,
  y: number,
  col: number,
  row: number,
  _pal: Palette,
  theme: Theme,
) {
  const h = hash(col, row, 5);
  if (theme === 'tomb') {
    // A painted false-door niche: nested frames and a dark slot.
    rect(c, x + 3, y + 2, 18, 20, '#c89a5a');
    rect(c, x + 5, y + 4, 14, 18, OCHRE);
    rect(c, x + 7, y + 6, 10, 16, '#e8c88a');
    rect(c, x + 10, y + 8, 4, 14, '#2a1c12');
    rect(c, x + 5, y + 4, 14, 1, GOLD);
    return;
  }
  if (theme === 'nile') {
    // A pigeon-tower opening in the mud brick.
    rect(c, x + 7, y + 6, 10, 12, '#2a1c12');
    disc(c, x + 12, y + 6, 5, '#2a1c12');
    rect(c, x + 6, y + 18, 12, 2, '#d8b88a');
    if (h > 0.5) rect(c, x + 10, y + 12, 3, 3, '#e8e4dc');
    return;
  }
  // A deep-cut relief of a lotus bud in a recessed panel.
  rect(c, x + 4, y + 3, 16, 18, '#a8743e');
  rect(c, x + 4, y + 3, 16, 1, '#6a4422');
  rect(c, x + 11, y + 10, 2, 10, '#5a3418');
  poly(
    c,
    [
      [x + 12, y + 4],
      [x + 16, y + 10],
      [x + 12, y + 12],
      [x + 8, y + 10],
    ],
    h > 0.5 ? '#1e6a6a' : '#5a3418',
  );
}
export function w5Slab(
  c: C,
  x: number,
  y: number,
  col: number,
  _row: number,
  _pal: Palette,
  theme: Theme,
) {
  if (theme === 'nile') {
    // A palm-trunk landing stage.
    rect(c, x, y, T, 12, '#3e2a18');
    rect(c, x, y + 1, T, 9, '#8a6038');
    for (let i = 2; i < T; i += 5) rect(c, x + i, y + 2, 1, 7, '#5a3e22');
    rect(c, x, y + 1, T, 1, '#b08a58');
    return;
  }
  // A sandstone lintel block with a carved cavetto lip.
  rect(c, x, y, T, 12, '#6a4422');
  rect(c, x, y, T, 10, theme === 'tomb' ? '#c9a06a' : '#d2a064');
  rect(c, x, y, T, 2, theme === 'tomb' ? '#d8b888' : '#f0cc92');
  rect(c, x, y + 8, T, 1, '#00000030');
  if (col % 2) rect(c, x + 10, y + 3, 4, 4, '#a8743e');
}
export function w5Ledge(
  c: C,
  x: number,
  y: number,
  _col: number,
  _row: number,
  _pal: Palette,
  theme: Theme,
  end: number,
) {
  // A projecting cornice stone (or a palm-beam in the tomb).
  rect(c, x, y, T, 7, theme === 'tomb' ? '#6a4a2c' : '#4a2e18');
  rect(c, x, y, T, 5, theme === 'tomb' ? '#c9a06a' : '#e0b070');
  rect(c, x, y, T, 1, theme === 'tomb' ? '#e0c090' : '#fff0c8');
  for (let i = 3; i < T; i += 6)
    rect(c, x + i, y + 5, 2, 2, theme === 'tomb' ? '#6a4a2c' : '#4a2e18');
  if (end)
    poly(
      c,
      [
        [x + (end < 0 ? 0 : T), y + 6],
        [x + 12, y + 6],
        [x + (end < 0 ? 0 : T), y + 14],
      ],
      '#4a2e18',
    );
}
/** Sand slide cell: pouring sand over stone, streaked toward `dir`, with a
 * spill down the step it pours over. */
export function slideCell(
  c: C,
  x: number,
  y: number,
  col: number,
  row: number,
  dir: number,
  exposed: boolean,
  pal: Palette,
  theme: Theme,
) {
  w5Stone(c, x, y, col, row, pal, theme);
  if (!exposed) return;
  rect(c, x, y, T, 9, '#b07a3a');
  rect(c, x, y, T, 7, '#f0c880');
  rect(c, x, y, T, 1, '#fff4d0');
  for (let i = 0; i < 4; i++) {
    const sx = x + ((Math.floor(hash(col, row, i) * 24) + i * 6) % 20);
    rect(c, sx, y + 2 + i, 5, 1, '#c8955a');
    rect(c, sx + (dir > 0 ? 5 : -1), y + 2 + i, 1, 1, '#fff4d0');
  }
  // Chevrons that show which way it pours.
  for (const cx of [6, 16]) {
    const ax = x + cx;
    rect(c, ax - dir * 2, y + 3, 1, 1, '#9a6a34');
    rect(c, ax, y + 4, 1, 1, '#9a6a34');
    rect(c, ax - dir * 2, y + 5, 1, 1, '#9a6a34');
  }
}
/** Spilling sand over the lip of a slide step (drawn into the cell below
 * the edge the slide pours off). */
export function sandSpill(c: C, x: number, y: number, dir: number) {
  const x0 = dir > 0 ? x : x + T - 10;
  poly(
    c,
    [
      [x0, y],
      [x0 + 10, y],
      [x0 + (dir > 0 ? 4 : 6), y + 18],
    ],
    '#e0b070',
  );
  rect(c, x0 + 4, y + 2, 1, 10, '#fff0c8');
}
/** A recumbent ram-headed sphinx filling the box of ',' cells. */
export function sphinxArt(
  c: C,
  x: number,
  y: number,
  w: number,
  h: number,
  facing: number,
  moon: boolean,
) {
  const s = moon ? 0.82 : 1;
  const tone = (hex: string) => {
    if (!moon) return hex;
    const n = parseInt(hex.slice(1), 16);
    const r = Math.round(((n >> 16) & 255) * s),
      g = Math.round(((n >> 8) & 255) * s),
      b = Math.round((n & 255) * s * 1.06);
    return `rgb(${r},${g},${Math.min(255, b)})`;
  };
  // Drawn in a 96×48 box (u right, v down), mirrored when facing left;
  // the ram head rises above the box and the paws reach past it.
  const k = w / 96;
  const P = (u: number, v: number): [number, number] => [
    facing > 0 ? x + u * k : x + w - u * k,
    y + (v * h) / 48,
  ];
  const ink = '#2e1c0e';
  const base = tone('#d2a064'),
    shade = tone('#a8743e'),
    deep = tone('#8a5a2e'),
    light = tone('#ecc488');
  const shape = (pts: [number, number][], fill: string, outline = true) => {
    const q = pts.map(([u, v]) => P(u, v));
    if (outline)
      for (const [dx, dy] of [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ])
        poly(
          c,
          q.map(([px, py]) => [px + dx, py + dy]),
          ink,
        );
    poly(c, q, fill);
  };
  const blob = (u: number, v: number, r: number, fill: string) => {
    const [px, py] = P(u, v);
    disc(c, px, py, r * k + 1, ink);
    disc(c, px, py, r * k, fill);
  };
  // The long lion body: rump, dipping back, then the chest under the head.
  shape(
    [
      [8, 16],
      [14, 5],
      [26, 1],
      [44, 3],
      [60, 4],
      [70, 1],
      [80, 3],
      [86, 22],
      [84, 44],
      [24, 46],
      [10, 40],
    ],
    base,
  );
  // Top light and belly shadow.
  shape(
    [
      [14, 6],
      [26, 2],
      [44, 4],
      [60, 5],
      [60, 7],
      [44, 6],
      [26, 4],
      [16, 9],
    ],
    light,
    false,
  );
  shape(
    [
      [24, 40],
      [84, 38],
      [84, 44],
      [24, 46],
    ],
    shade,
    false,
  );
  // Rear haunch and the folded hind leg.
  blob(22, 30, 13, shade);
  blob(21, 29, 11, base);
  blob(19, 26, 5, light);
  shape(
    [
      [2, 48],
      [4, 42],
      [22, 41],
      [28, 48],
    ],
    shade,
  );
  // Ribs of the lion's flank, cut in shallow relief.
  for (const u of [40, 48, 56])
    shape(
      [
        [u, 18],
        [u + 2, 18],
        [u + 3, 34],
        [u + 1, 34],
      ],
      shade,
      false,
    );
  // Forelegs stretched forward onto the plinth, paws past the chest.
  shape(
    [
      [66, 36],
      [98, 37],
      [104, 41],
      [104, 48],
      [66, 48],
    ],
    base,
  );
  shape(
    [
      [66, 44],
      [104, 44],
      [104, 48],
      [66, 48],
    ],
    shade,
    false,
  );
  for (const u of [98, 101])
    shape(
      [
        [u, 45],
        [u + 1, 45],
        [u + 1, 48],
        [u, 48],
      ],
      deep,
      false,
    );
  // A little standing figure sheltered between the paws.
  shape(
    [
      [88, 16],
      [93, 16],
      [94, 36],
      [87, 36],
    ],
    shade,
  );
  blob(90.5, 13, 3, shade);
  // Striped headcloth falling over the shoulders behind the head.
  shape(
    [
      [66, -4],
      [80, -8],
      [86, 4],
      [84, 20],
      [70, 18],
    ],
    tone('#e0b878'),
  );
  for (let i = 0; i < 5; i++)
    shape(
      [
        [68, -1 + i * 4],
        [84, -3 + i * 4],
        [84, -1 + i * 4],
        [68, 1 + i * 4],
      ],
      tone('#2a6a8a'),
      false,
    );
  // The ram head: long, gently convex muzzle pointing down the avenue.
  shape(
    [
      [72, -14],
      [80, -20],
      [90, -17],
      [100, -6],
      [102, 0],
      [98, 4],
      [88, 4],
      [78, 0],
    ],
    base,
  );
  shape(
    [
      [80, -19],
      [90, -16],
      [98, -7],
      [96, -6],
      [88, -14],
      [80, -16],
    ],
    light,
    false,
  );
  shape(
    [
      [86, 2],
      [98, 2],
      [98, 4],
      [88, 4],
    ],
    shade,
    false,
  );
  // The curled horn wrapping down round the ear, with its ridges.
  blob(79, -6, 8.5, shade);
  blob(79, -6, 6, base);
  blob(80, -5, 3.5, shade);
  blob(80.5, -4.5, 1.6, deep);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const [px, py] = P(79 + Math.cos(a) * 7.2, -6 + Math.sin(a) * 7.2);
    rect(c, px, py, 1, 1, deep);
  }
  // Eye and nostril.
  const [ex, ey] = P(90, -10);
  rect(c, ex - 1, ey, 3, 2, '#1a100a');
  rect(c, ex, ey, 1, 1, light);
  const [nx, ny] = P(99, -3);
  rect(c, nx - 1, ny, 2, 1, deep);
  // A turquoise inlay on the brow band (painted, long faded).
  shape(
    [
      [74, -12],
      [82, -16],
      [83, -14],
      [75, -10],
    ],
    tone('#3aa8a0'),
    false,
  );
  // Weathering: chips and cracks.
  for (let i = 0; i < 7; i++) {
    const [px, py] = P(14 + hash(i, w) * 64, 16 + hash(i, h) * 24);
    rect(c, px, py, 3, 1, '#00000026');
  }
  const [cx, cy] = P(50, 22);
  rect(c, cx, cy, 1, 6, '#00000030');
}
/** A lotus column: shaft cells, a papyrus-bundle base, an open lotus
 * capital on the top cell. */
export function lotusCell(
  c: C,
  x: number,
  y: number,
  col: number,
  row: number,
  top: boolean,
  left: boolean,
  moon: boolean,
) {
  const base = moon ? '#a88a74' : '#d2a064',
    dark = moon ? '#6a5650' : '#9a6a3a',
    hi = moon ? '#d8c4b4' : '#f0cc92';
  rect(c, x, y, T, T, base);
  // Bundle ribs.
  for (let i = left ? 3 : 1; i < T; i += 5) rect(c, x + i, y, 1, T, dark);
  rect(c, x + (left ? 1 : 0), y, 2, T, left ? hi : base);
  if (!left) rect(c, x + T - 2, y, 2, T, '#00000033');
  // Painted bands and incised marks.
  if (row % 3 === 0) {
    rect(c, x, y + 10, T, 3, moon ? '#3a5a7a' : TURQ);
    rect(c, x, y + 13, T, 1, moon ? '#5a4a6a' : OCHRE);
  } else
    glyph(
      c,
      x + (left ? 9 : 4),
      y + 8,
      Math.floor(hash(col, row) * 10),
      moon ? '#4a3a40' : '#6a4422',
    );
  if (top) {
    // Open lotus capital: a flared bell with petals.
    rect(c, x - 2, y, T + 4, 7, '#3a2412');
    rect(c, x - 1, y + 1, T + 2, 5, hi);
    if (left)
      for (let i = 0; i < 3; i++)
        poly(
          c,
          [
            [x + i * 8, y + 6],
            [x + i * 8 + 4, y + 13],
            [x + i * 8 + 8, y + 6],
          ],
          moon ? '#4a6a8a' : '#2a8a7a',
        );
    else
      for (let i = 0; i < 3; i++)
        poly(
          c,
          [
            [x + i * 8, y + 6],
            [x + i * 8 + 4, y + 13],
            [x + i * 8 + 8, y + 6],
          ],
          moon ? '#4a6a8a' : '#2a8a7a',
        );
    rect(c, x - 1, y + 1, T + 2, 1, '#fff0c8');
  }
}
/** Nile water body (the animated surface is drawn by the scene). */
export function nileBed(
  c: C,
  x: number,
  y: number,
  col: number,
  row: number,
  below: string,
) {
  rect(c, x, y, T, T, below === '#' ? '#2a4a52' : '#244450');
  if (hash(col, row, 60) > 0.6) rect(c, x + 3, y + 8, 9, 1, '#4a7a80');
  if (below === '#' && hash(col, row, 61) > 0.6)
    rect(c, x + 8, y + 16, 3, 8, '#3a6a3a');
}

/* ───────────── Props ───────────── */
export function makeLuxorProps(scene: Phaser.Scene) {
  if (scene.textures.exists('felucca')) return;
  // Felucca hull (same footprint as the harbour boat) and its lateen sail.
  tex(scene, 'felucca', 84, 30, (c) => {
    poly(
      c,
      [
        [0, 8],
        [84, 8],
        [76, 26],
        [10, 26],
      ],
      '#1d1416',
    );
    poly(
      c,
      [
        [2, 9],
        [82, 9],
        [75, 24],
        [11, 24],
      ],
      '#f4ece0',
    );
    rect(c, 2, 9, 80, 3, '#2a8aa8');
    rect(c, 12, 18, 62, 2, '#c8642a');
    for (const ex of [10, 74]) disc(c, ex, 15, 2, '#e8b84a');
    rect(c, 6, 6, 72, 3, '#6a4a2a');
  });
  tex(scene, 'felucca-sail', 90, 110, (c) => {
    // Mast and the long slanted yard of a lateen rig.
    rect(c, 43, 20, 3, 90, '#4a3220');
    c.strokeStyle = '#4a3220';
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(4, 104);
    c.lineTo(86, 2);
    c.stroke();
    poly(
      c,
      [
        [8, 100],
        [84, 6],
        [80, 100],
      ],
      '#1d1416',
    );
    poly(
      c,
      [
        [11, 98],
        [82, 10],
        [78, 98],
      ],
      '#f6efe2',
    );
    for (let i = 1; i < 5; i++)
      rect(c, 20 + i * 12, 30 + i * 2, 1, 66 - i * 10, '#d8ccb8');
    rect(c, 11, 96, 67, 2, '#c8b8a0');
  });
  // Hot-air balloon: the basket (the platform) and its envelope.
  tex(scene, 'balloon-basket', 48, 24, (c) => {
    rect(c, 0, 0, 48, 4, '#1d1416');
    rect(c, 1, 1, 46, 2, '#c8a060');
    rect(c, 3, 4, 42, 18, '#1d1416');
    rect(c, 4, 4, 40, 17, '#a87a40');
    for (let i = 6; i < 44; i += 4) rect(c, i, 4, 1, 17, '#7a5228');
    for (const yy of [9, 15]) rect(c, 4, yy, 40, 1, '#d8b070');
    rect(c, 4, 20, 40, 1, '#5a3a1a');
  });
  // Tall enough that a hero stands in the basket under the burner, with
  // the ropes running down to the basket's corners.
  tex(scene, 'balloon-envelope', 96, 152, (c) => {
    c.strokeStyle = '#3a2a1a';
    c.lineWidth = 1;
    for (const [a, b] of [
      [26, 25],
      [38, 30],
      [58, 66],
      [70, 71],
    ]) {
      c.beginPath();
      c.moveTo(a, 92);
      c.lineTo(b, 152);
      c.stroke();
    }
    rect(c, 36, 96, 24, 6, '#3a2a1a');
    disc(c, 48, 98, 4, '#ffb040');
    // Gores in red, ochre, turquoise and cream.
    const cols = ['#c83a2a', '#e8b84a', '#2aa8a0', '#f4ece0', '#c8642a'];
    disc(c, 48, 46, 46, '#1d1416');
    poly(
      c,
      [
        [8, 66],
        [88, 66],
        [62, 96],
        [34, 96],
      ],
      '#1d1416',
    );
    for (let i = 0; i < 9; i++) {
      const x0 = 4 + i * 10;
      c.fillStyle = cols[i % cols.length];
      c.beginPath();
      c.moveTo(48, 2);
      c.quadraticCurveTo(x0 - 10, 30, x0 + 1, 66);
      c.lineTo(34 + i * 3.1, 95);
      c.lineTo(34 + (i + 1) * 3.1, 95);
      c.lineTo(x0 + 11, 66);
      c.quadraticCurveTo(x0 + 10, 30, 48, 2);
      c.fill();
    }
    // Shading and a sheen.
    c.globalAlpha = 0.25;
    disc(c, 66, 50, 34, '#1d1416', -0.9, 1.6);
    c.globalAlpha = 0.35;
    disc(c, 30, 30, 12, '#ffffff');
    c.globalAlpha = 1;
    rect(c, 14, 64, 68, 3, '#3a2412');
  });
  // Crushing pillar: a carved head (the part that hits) and a shaft tile.
  tex(scene, 'pillar-head', 28, 30, (c) => {
    rect(c, 0, 0, 28, 30, '#2e1e12');
    rect(c, 1, 0, 26, 28, '#a8784a');
    rect(c, 1, 0, 3, 28, '#c8955a');
    rect(c, 24, 0, 3, 28, '#6a4628');
    rect(c, 1, 20, 26, 3, OCHRE);
    rect(c, 1, 23, 26, 5, '#5a3a20');
    for (let i = 3; i < 26; i += 5)
      poly(
        c,
        [
          [i, 28],
          [i + 2, 30],
          [i + 4, 28],
        ],
        '#2e1e12',
      );
    glyph(c, 8, 6, 1, '#4a2e18');
    glyph(c, 15, 7, 8, '#1e5a6a');
  });
  tex(scene, 'pillar-shaft', 24, 24, (c) => {
    rect(c, 0, 0, 24, 24, '#2e1e12');
    rect(c, 1, 0, 22, 24, '#96683e');
    rect(c, 1, 0, 3, 24, '#b8854e');
    rect(c, 20, 0, 3, 24, '#5e4024');
    rect(c, 1, 11, 22, 1, '#5e4024');
  });
  // Rotating stone door: one slab texture per cell.
  tex(scene, 'door-stone', 24, 24, (c) => {
    rect(c, 0, 0, 24, 24, '#2e1e12');
    rect(c, 1, 1, 22, 22, '#b08050');
    rect(c, 1, 1, 22, 2, '#d8aa6e');
    rect(c, 1, 21, 22, 2, '#6a4628');
    rect(c, 3, 5, 18, 14, '#9a6c40');
    glyph(c, 5, 8, 9, '#4a2e18');
    glyph(c, 13, 8, 4, '#1e5a6a');
  });
  tex(scene, 'door-hinge', 30, 14, (c) => {
    rect(c, 0, 4, 30, 10, '#2e1e12');
    rect(c, 1, 5, 28, 8, '#7a5230');
    disc(c, 15, 7, 6, '#2e1e12');
    disc(c, 15, 7, 4, GOLD);
    disc(c, 15, 7, 1.5, '#5a3a1a');
  });
  for (const on of [false, true])
    tex(scene, on ? 'lever-on' : 'lever-off', 24, 26, (c) => {
      rect(c, 4, 18, 16, 8, '#2e1e12');
      rect(c, 5, 19, 14, 6, '#a8784a');
      rect(c, 5, 19, 14, 1, '#d8aa6e');
      const tip = on ? [19, 4] : [5, 4];
      c.strokeStyle = '#2e1e12';
      c.lineWidth = 4;
      c.beginPath();
      c.moveTo(12, 20);
      c.lineTo(tip[0], tip[1]);
      c.stroke();
      c.strokeStyle = '#8a6a48';
      c.lineWidth = 2;
      c.stroke();
      disc(c, tip[0], tip[1], 3.5, '#2e1e12');
      disc(c, tip[0], tip[1], 2.5, on ? TURQ : '#c8642a');
    });
  // Torches (the World 5 lanterns): a bracketed torch, lit and unlit.
  for (const on of [false, true])
    for (const theme of ['temple', 'nile', 'tomb'])
      tex(scene, `${theme}-lantern-${on ? 'on' : 'off'}`, 20, 34, (c) => {
        rect(c, 8, 14, 4, 20, '#2e1e12');
        rect(c, 9, 14, 2, 20, '#7a5230');
        rect(c, 5, 12, 10, 4, '#2e1e12');
        rect(c, 6, 12, 8, 3, '#c8955a');
        if (on) {
          poly(
            c,
            [
              [4, 12],
              [10, 0],
              [16, 12],
            ],
            '#e8642a',
          );
          poly(
            c,
            [
              [6, 12],
              [10, 3],
              [14, 12],
            ],
            '#ffb040',
          );
          poly(
            c,
            [
              [8, 12],
              [10, 6],
              [12, 12],
            ],
            '#fff0b0',
          );
        } else {
          rect(c, 7, 9, 6, 3, '#3a2a1a');
          rect(c, 9, 6, 1, 3, '#6a6a6a88');
        }
      });
  // Ghost ledges in the torchlight: a shadowy stone beam.
  for (const theme of ['temple', 'nile', 'tomb']) {
    tex(scene, `${theme}-ghost`, 24, 8, (c) => {
      rect(c, 0, 0, 24, 8, '#3a2412');
      rect(c, 1, 0, 22, 6, '#c8a070');
      rect(c, 1, 0, 22, 1, '#fff0c8');
      glyph(c, 9, -1, 7, '#8a5a2e');
    });
    tex(scene, `${theme}-ghost-hint`, 24, 8, (c) => {
      for (let i = 0; i < 24; i += 4) rect(c, i, 3, 2, 1, '#ffd88a88');
    });
  }
  // Sand: a falling clump, a grain particle, and a cobra's venom blob.
  tex(scene, 'sand-clump', 14, 14, (c) => {
    disc(c, 7, 7, 6, '#8a5e32');
    disc(c, 7, 7, 5, '#e0b070');
    disc(c, 5, 5, 2, '#fff0c8');
  });
  tex(scene, 'sand-grain', 3, 3, (c) => {
    rect(c, 0, 0, 3, 3, '#e8c080');
    rect(c, 0, 0, 1, 1, '#fff4d0');
  });
  tex(scene, 'venom', 10, 10, (c) => {
    disc(c, 5, 5, 5, '#1a3a10');
    disc(c, 5, 5, 4, '#8ad040');
    disc(c, 4, 4, 1.5, '#e8ffb0');
  });
  tex(scene, 'crack', 24, 8, (c) => {
    rect(c, 2, 0, 20, 3, '#1a100a');
    rect(c, 6, 3, 3, 2, '#1a100a');
    rect(c, 14, 3, 4, 3, '#1a100a');
    rect(c, 10, 2, 2, 4, '#1a100a');
  });
  // Collapsing sandstone floor slab (replaces the crate in World 5).
  tex(scene, 'slab-crack', 24, 24, (c) => {
    rect(c, 0, 0, 24, 24, '#2e1e12');
    rect(c, 1, 1, 22, 22, '#c8955a');
    rect(c, 1, 1, 22, 4, '#e8c48a');
    rect(c, 1, 1, 22, 1, '#fff0c8');
    rect(c, 1, 20, 22, 3, '#8a5e32');
    c.strokeStyle = '#3a2412';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(4, 5);
    c.lineTo(9, 11);
    c.lineTo(7, 17);
    c.moveTo(9, 11);
    c.lineTo(16, 9);
    c.lineTo(20, 15);
    c.moveTo(16, 9);
    c.lineTo(15, 4);
    c.stroke();
  });
  tex(scene, 'tomb-slab-crack', 24, 24, (c) => {
    rect(c, 0, 0, 24, 24, '#4a3420');
    rect(c, 1, 1, 22, 22, '#c09462');
    rect(c, 1, 1, 22, 4, '#d4b080');
    rect(c, 1, 20, 22, 3, '#7a5638');
    c.strokeStyle = '#3a2818';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(3, 6);
    c.lineTo(10, 12);
    c.lineTo(8, 19);
    c.moveTo(10, 12);
    c.lineTo(18, 8);
    c.lineTo(21, 17);
    c.stroke();
  });
  // A small فانوس بلبل holds in the tomb, plus a pre-rendered warm cone
  // (more light ahead than behind) used with ADD blend. One texture, no
  // per-frame drawing.
  tex(scene, 'tomb-hand-lantern', 16, 22, (c) => {
    // Brass handle and cap.
    rect(c, 7, 0, 2, 4, '#5a3a22');
    rect(c, 4, 4, 8, 2, '#e8c48a');
    rect(c, 3, 5, 10, 2, '#c8955a');
    // Glass body with a flame.
    rect(c, 4, 7, 8, 9, '#2e1e12');
    rect(c, 5, 7, 6, 9, '#e8642a');
    rect(c, 6, 8, 4, 7, '#ffb040');
    rect(c, 7, 9, 2, 5, '#fff4c0');
    // Base and a short foot.
    rect(c, 3, 16, 10, 2, '#c8955a');
    rect(c, 4, 18, 8, 2, '#8a5e32');
    rect(c, 6, 20, 4, 2, '#5a3a22');
  });
  tex(scene, 'tomb-lantern-glow', 256, 192, (c) => {
    // Origin sits at (80, 96): about 2 tiles behind, 5 tiles ahead, ~3 up/down.
    const cx = 80,
      cy = 96;
    c.save();
    c.translate(cx, cy);
    c.scale(1.75, 0.95);
    const g = c.createRadialGradient(0, 0, 0, 0, 0, 96);
    g.addColorStop(0, 'rgba(255, 230, 160, 0.55)');
    g.addColorStop(0.22, 'rgba(255, 190, 90, 0.32)');
    g.addColorStop(0.5, 'rgba(255, 150, 60, 0.14)');
    g.addColorStop(0.78, 'rgba(255, 130, 40, 0.05)');
    g.addColorStop(1, 'rgba(255, 120, 30, 0)');
    c.fillStyle = g;
    c.beginPath();
    c.arc(0, 0, 96, 0, Math.PI * 2);
    c.fill();
    c.restore();
  });
}

/** Near-layer silhouettes (in front of the view). */
export function w5Near(c: C, theme: Theme, W: number) {
  if (theme === 'tomb') {
    // The rough-cut rock ceiling and a few roots and webs.
    c.fillStyle = '#4a3422';
    c.beginPath();
    c.moveTo(0, 0);
    for (let x = 0; x <= W; x += 16)
      c.lineTo(x, 6 + hash(x, 1) * 14 + (x % 96 === 0 ? 12 : 0));
    c.lineTo(W, 0);
    c.closePath();
    c.fill();
    c.strokeStyle = '#d8d0c088';
    c.lineWidth = 1;
    for (let x = 60; x < W; x += 300) {
      for (let k = 0; k < 4; k++) {
        c.beginPath();
        c.moveTo(x, 8);
        c.lineTo(x - 20 + k * 14, 40);
        c.stroke();
      }
      for (const r of [14, 24]) c.strokeRect(x - r / 2, 10 + r / 2, r, r * 0.6);
    }
    return;
  }
  if (theme === 'nile') {
    // Palm fronds and a kite (bird) circling high.
    c.fillStyle = '#1a2414';
    for (let x = 0; x < W; x += 320) {
      for (let k = 0; k < 7; k++) {
        const a = -0.2 + k * 0.5;
        poly(
          c,
          [
            [x + 20, 0],
            [x + 20 + Math.cos(a) * 110, Math.sin(a) * 30 + 34],
            [x + 24 + Math.cos(a) * 100, Math.sin(a) * 30 + 26],
          ],
          '#1a2414',
        );
      }
    }
    return;
  }
  // Temple: an architrave edge with a cavetto cornice and hanging lotus
  // garlands at the top of the view.
  rect(c, 0, 0, W, 10, '#2a1a0e');
  for (let x = 0; x < W; x += 12) rect(c, x, 10, 8, 4, '#2a1a0e');
  for (let x = 40; x < W; x += 200) {
    c.strokeStyle = '#2a1a0e';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(x, 12);
    c.quadraticCurveTo(x + 50, 44, x + 100, 12);
    c.stroke();
    for (let k = 1; k < 6; k++) {
      const t = k / 6;
      disc(c, x + t * 100, 12 + 4 * t * (1 - t) * 32 + 3, 3, '#2a1a0e');
    }
  }
}
