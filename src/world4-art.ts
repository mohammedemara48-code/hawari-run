// World 4 (اسكندرية) art: the corniche sea wall in pale limestone with its
// blue-and-white tiled promenade, wet slippery tiles, café awnings, the
// yellow-and-blue tram, overhead wires and stone footbridges, breaking
// waves, beach umbrellas, and the weathered ashlar of Qaitbay fort in a
// winter storm. Drawn in code like the rest of the game.
import Phaser from 'phaser';
import type { Theme } from './level-data';
import { disc, hash, poly, rect, tex, type Palette } from './art-kit';

type C = CanvasRenderingContext2D;
const T = 24;
export const W4_PALETTES: Record<'corniche' | 'fort', Palette> = {
  // Sun on pale limestone, Mediterranean blues.
  corniche: {
    sky: [
      [0, '#5a9ad0'],
      [0.6, '#a8d0ec'],
      [1, '#e8f4fa'],
    ],
    stone: ['#c8b896', '#d2c2a0', '#bcac8a', '#d8caa8'],
    mortar: '#8a7a5e',
    top: ['#f0f4f6', '#e4ecf0', '#dce6ea'],
    wood: ['#3a6aa0', '#5a8ac0', '#24466a'],
    accent: '#2e6ab0',
    glow: '#fff2c0',
    window: '#24466a',
    windowLit: '#ffe8a8',
    fog: '#d8ecf6',
  },
  // Storm-soaked ashlar under a bruised sky.
  fort: {
    sky: [
      [0, '#2a3040'],
      [0.6, '#4a5468'],
      [1, '#6a7484'],
    ],
    stone: ['#8a8070', '#948a78', '#7e7464', '#9a9080'],
    mortar: '#4a443a',
    top: ['#a89e8a', '#b4aa94', '#9c927e'],
    wood: ['#4a3a2a', '#6a5038', '#2e241a'],
    accent: '#c8d4e0',
    glow: '#e8f0ff',
    window: '#1a1e26',
    windowLit: '#ffd88a',
    fog: '#8a96a8',
  },
};
export const isW4 = (theme: Theme) => theme === 'corniche' || theme === 'fort';
const BLUE = '#2e6ab0',
  WHITE = '#f4f8fa';

/** One 6px glazed tile of the corniche promenade (alternating motif). */
function glazed(c: C, x: number, y: number, k: number, wet: boolean) {
  rect(c, x, y, 6, 6, k % 2 ? BLUE : WHITE);
  if (k % 2) {
    rect(c, x + 2, y + 2, 2, 2, WHITE);
  } else {
    rect(c, x + 1, y + 2, 4, 2, '#9ab8d8');
    rect(c, x + 2, y + 1, 2, 4, '#9ab8d8');
  }
  rect(c, x, y, 6, 1, '#ffffff55');
  if (wet) rect(c, x + 1, y + 1, 2, 1, '#ffffffcc');
}

/* ───────────── Tiles ───────────── */
export function w4Stone(
  c: C,
  x: number,
  y: number,
  col: number,
  row: number,
  pal: Palette,
  theme: Theme,
) {
  const h = hash(col, row);
  rect(c, x, y, T, T, pal.stone[Math.floor(h * pal.stone.length)]);
  if (theme === 'fort') {
    // Big Qaitbay ashlar: two courses per tile, offset, worn corners,
    // salt streaks and rain-dark patches.
    const off = row % 2 ? 0 : 12;
    rect(c, x, y + 11, T, 2, pal.mortar);
    rect(c, x, y + 23, T, 1, pal.mortar);
    rect(c, x + ((off + 6) % T), y, 2, 11, pal.mortar);
    rect(c, x + ((off + 18) % T), y + 13, 2, 10, pal.mortar);
    rect(c, x + 1, y + 1, 8, 1, '#ffffff1c');
    if (h > 0.7) rect(c, x + 3, y + 14, 8, 6, '#00000018');
    if (hash(col, row, 3) > 0.75) rect(c, x + 14, y + 2, 1, 9, '#e8e4d82a');
    if (row >= 12) rect(c, x, y + 16, T, 8, '#2a4a3a55');
    return;
  }
  // Corniche sea wall: long pale limestone blocks, a tide line and weed
  // low down, a carved string-course every few rows.
  const off = row % 2 ? 4 : 16;
  rect(c, x, y + 23, T, 1, pal.mortar);
  rect(c, x + off, y, 1, 23, pal.mortar);
  rect(c, x + 1, y + 1, 10, 1, '#ffffff30');
  if (h > 0.78) rect(c, x + 6, y + 6, 7, 5, '#ffffff16');
  if (h < 0.12) rect(c, x + 14, y + 12, 5, 3, '#00000014');
  if (row >= 13) {
    rect(c, x, y + 10, T, 14, '#3a5a4a40');
    for (let i = 0; i < 3; i++)
      rect(
        c,
        x + Math.floor(hash(col, row, i) * 22),
        y + 14 + i * 3,
        2,
        2,
        '#2e5a3a',
      );
  }
}
export function w4Cap(
  c: C,
  x: number,
  y: number,
  col: number,
  row: number,
  pal: Palette,
  theme: Theme,
  wet = false,
) {
  const h = hash(col, row, 7);
  if (theme === 'fort') {
    // Worn top course: rounded lip, moss in the joints, rain puddles.
    rect(c, x, y, T, 6, '#5a5446');
    rect(c, x, y, T, 4, pal.top[Math.floor(h * 3)]);
    rect(c, x, y, T, 1, '#d8d0bc');
    if (h > 0.6) rect(c, x + 4, y + 4, 6, 2, '#4a6a3a');
    if (wet || h < 0.3) {
      rect(c, x + 8, y + 1, 10, 2, '#8aa0b8');
      rect(c, x + 10, y + 1, 4, 1, '#e8f0ff');
    }
    return;
  }
  // Promenade: a granite curb over a band of blue-and-white glazed tiles.
  rect(c, x, y, T, 9, '#6a6458');
  rect(c, x, y, T, 3, '#a8a49a');
  rect(c, x, y, T, 1, '#e8e6e0');
  for (let i = 0; i < 4; i++)
    glazed(c, x + i * 6, y + 3, col * 4 + i + row, wet);
  rect(c, x, y + 9, T, 1, '#00000040');
  if (wet) {
    // Standing water: a sheen and a reflection of the sky.
    rect(c, x + 2, y, 14, 2, '#bfe4ff');
    rect(c, x + 4 + Math.floor(h * 6), y, 6, 1, '#ffffff');
    if (h > 0.5) rect(c, x + 14, y + 10, 2, 5, '#9ad0f088');
  }
  if (!wet && h > 0.9) {
    // A bollard of the balustrade.
    rect(c, x + 9, y - 8, 6, 8, '#d8d2c4');
    rect(c, x + 8, y - 9, 8, 2, '#f0ece2');
  }
}
export function w4Window(
  c: C,
  x: number,
  y: number,
  col: number,
  row: number,
  _pal: Palette,
  theme: Theme,
) {
  if (theme === 'fort') {
    // A plain arrow slit: splayed stone reveal, a narrow dark opening.
    rect(c, x + 8, y + 2, 8, 20, '#8a7a62');
    rect(c, x + 9, y + 3, 6, 18, '#5e5242');
    rect(c, x + 11, y + 4, 2, 16, '#14161c');
    rect(c, x + 7, y + 22, 10, 2, '#b8a888');
    if (hash(col, row, 5) > 0.6) rect(c, x + 11, y + 9, 2, 6, '#ffd88a55');
    return;
  }
  // A storm-drain arch in the sea wall: dressed voussoirs, iron grille and
  // a green-brown wet streak below where the water runs out.
  const dark = '#1c2228';
  rect(c, x + 4, y + 8, 16, 14, dark);
  rect(c, x + 6, y + 5, 12, 3, dark);
  rect(c, x + 9, y + 3, 6, 2, dark);
  // voussoirs
  for (const [dx, dy, w] of [
    [2, 8, 2],
    [3, 5, 3],
    [6, 2, 3],
    [9, 1, 6],
    [15, 2, 3],
    [18, 5, 3],
    [20, 8, 2],
  ])
    rect(c, x + dx, y + dy, w, 2, '#efe6d2');
  for (let i = 0; i < 4; i++) rect(c, x + 6 + i * 4, y + 6, 1, 16, '#4a5258');
  rect(c, x + 4, y + 14, 16, 1, '#4a5258');
  rect(c, x + 5, y + 21, 14, 1, '#2f6a6a');
  rect(c, x + 9, y + 22, 6, 2, '#4a6a52aa');
}
export function w4Slab(
  c: C,
  x: number,
  y: number,
  col: number,
  _row: number,
  _pal: Palette,
  theme: Theme,
) {
  if (theme === 'fort') {
    rect(c, x, y, T, 12, '#2e241a');
    rect(c, x, y + 1, T, 9, '#6a5038');
    rect(c, x, y + 1, T, 2, '#9a7a58');
    rect(c, x + 3, y + 5, 2, 2, '#2a2a2e');
    rect(c, x + 19, y + 5, 2, 2, '#2a2a2e');
    return;
  }
  // A limestone balustrade rail on turned balusters.
  rect(c, x, y, T, 6, '#8a826e');
  rect(c, x, y, T, 4, '#e0d8c4');
  rect(c, x, y, T, 1, '#fffaf0');
  rect(c, x + 5 + (col % 2), y + 6, 4, 6, '#d0c8b2');
}
export function w4Ledge(
  c: C,
  x: number,
  y: number,
  col: number,
  row: number,
  _pal: Palette,
  theme: Theme,
  end: number,
) {
  if (theme === 'fort') {
    // A stone corbel ledge, rain dripping off the edge.
    rect(c, x, y, T, 6, '#4a443a');
    rect(c, x, y, T, 4, '#a89e8a');
    rect(c, x, y, T, 1, '#d8d0bc');
    if (end)
      poly(
        c,
        [
          [x + (end < 0 ? 0 : T), y + 6],
          [x + 12, y + 6],
          [x + 12, y + 14],
        ],
        '#4a443a',
      );
    if (hash(col, row, 2) > 0.5) rect(c, x + 6, y + 6, 1, 4, '#9ab0c8aa');
    return;
  }
  // Café awning: blue-and-white stripes with a scalloped fringe.
  rect(c, x, y, T, 7, '#1d1416');
  for (let i = 0; i < T; i += 6)
    rect(c, x + i, y, 6, 6, (i / 6 + col) % 2 ? BLUE : WHITE);
  rect(c, x, y, T, 1, '#ffffff80');
  for (let i = 0; i < T; i += 6)
    disc(c, x + i + 3, y + 6, 3, (i / 6 + col) % 2 ? BLUE : WHITE, 0, Math.PI);
  if (end) rect(c, x + (end < 0 ? 1 : T - 3), y + 6, 2, 16, '#3a3a40');
}
/** Wet tiles: the cap is drawn with standing water by w4Cap(wet). */
export function wetTile(
  c: C,
  x: number,
  y: number,
  col: number,
  row: number,
  pal: Palette,
  theme: Theme,
  exposed: boolean,
) {
  w4Stone(c, x, y, col, row, pal, theme);
  if (exposed) w4Cap(c, x, y, col, row, pal, theme, true);
  rect(c, x, y, T, T, '#4a8ac014');
}
/** Overhead tram wire: the contact wire, a messenger wire and droppers;
 * the pole itself is drawn down to the street on the first cell. */
export function wireCell(
  c: C,
  x: number,
  y: number,
  first: boolean,
  poleTo: number,
) {
  if (first) {
    rect(c, x + 2, y - 30, 4, poleTo - y + 30, '#3a3e44');
    rect(c, x + 3, y - 30, 1, poleTo - y + 30, '#6a7078');
    rect(c, x - 2, y - 30, 26, 3, '#3a3e44');
    rect(c, x + 20, y - 28, 3, 6, '#c8c8b0');
  }
  rect(c, x - 12, y - 18, T + 24, 1, '#2a2a30');
  rect(c, x - 12, y + 2, T + 24, 2, '#1a1a20');
  rect(c, x - 12, y + 2, T + 24, 1, '#8a8a90');
  for (const dx of [-6, 6, 18]) rect(c, x + dx, y - 18, 1, 20, '#2a2a3088');
  // Warning bunting so the low wire reads at a glance.
  for (const dx of [0, 12])
    poly(
      c,
      [
        [x + dx, y + 4],
        [x + dx + 6, y + 4],
        [x + dx + 3, y + 9],
      ],
      dx ? '#e8c040' : '#d84a3a',
    );
}
/** A stone footbridge over the tram line (painted per cell). */
export function bridgeCell(
  c: C,
  x: number,
  y: number,
  col: number,
  row: number,
  top: boolean,
  bottom: boolean,
) {
  const h = hash(col, row, 4);
  rect(c, x, y, T, T, ['#bcae90', '#c6b898', '#b2a486'][Math.floor(h * 3)]);
  rect(c, x, y + 11, T, 1, '#8a7a5e');
  rect(c, x + (row % 2 ? 6 : 18), y, 1, 11, '#8a7a5e');
  if (top) {
    // Iron railing on the deck.
    rect(c, x, y - 10, T, 2, '#2a2a30');
    for (let i = 2; i < T; i += 6) rect(c, x + i, y - 10, 2, 10, '#2a2a30');
    rect(c, x, y, T, 3, '#e8dcc0');
  }
  if (bottom) {
    rect(c, x, y + T - 6, T, 6, '#6a5e48');
    rect(c, x, y + T - 6, T, 1, '#e8dcc0');
    for (let i = 0; i < T; i += 8)
      poly(
        c,
        [
          [x + i, y + T],
          [x + i + 4, y + T + 4],
          [x + i + 8, y + T],
        ],
        '#d84a3a',
      );
  }
}

/* ───────────── Props ───────────── */
export function makeAlexProps(scene: Phaser.Scene) {
  if (scene.textures.exists('tram')) return;
  // The Alexandria tram: cream-yellow upper body, blue skirt, a trolley
  // pole on the roof. 8 tiles long, 3 tall; the roof is the platform.
  tex(scene, 'tram', 192, 84, (c) => {
    const y0 = 12;
    // Trolley pole and its shoe.
    c.strokeStyle = '#2a2a30';
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(70, y0 + 2);
    c.lineTo(110, 0);
    c.stroke();
    rect(c, 106, 0, 10, 3, '#2a2a30');
    rect(c, 62, y0 - 2, 20, 4, '#3a3a40');
    // Roof.
    rect(c, 2, y0, 188, 8, '#1d1416');
    rect(c, 4, y0 + 1, 184, 5, '#8a8a84');
    rect(c, 4, y0 + 1, 184, 1, '#c8c8c0');
    // Body.
    rect(c, 0, y0 + 8, 192, 52, '#1d1416');
    rect(c, 2, y0 + 9, 188, 26, '#f0c84a');
    rect(c, 2, y0 + 9, 188, 3, '#ffe890');
    rect(c, 2, y0 + 35, 188, 22, '#2e6ab0');
    rect(c, 2, y0 + 35, 188, 2, '#5a90d0');
    rect(c, 2, y0 + 47, 188, 2, '#f0c84a');
    // Windows with passengers' silhouettes and the odd hand-written sign.
    for (let i = 0; i < 9; i++) {
      const wx = 10 + i * 20;
      rect(c, wx, y0 + 14, 15, 16, '#1d1416');
      rect(c, wx + 1, y0 + 15, 13, 14, '#a8d0e8');
      rect(c, wx + 1, y0 + 15, 13, 3, '#e8f6ff');
      if (hash(i, 3) > 0.45) {
        disc(c, wx + 7, y0 + 24, 3, '#3a2a24');
        rect(c, wx + 4, y0 + 27, 7, 3, '#3a2a24');
      }
    }
    // Doors and the route plate.
    rect(c, 92, y0 + 36, 12, 20, '#1c4a84');
    rect(c, 97, y0 + 36, 2, 20, '#1d1416');
    rect(c, 150, y0 + 37, 26, 8, '#f4f0e0');
    c.fillStyle = '#1c4a84';
    c.font = 'bold 7px Changa, Tahoma, sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('٢٥', 163, y0 + 41);
    // Headlight and bumpers.
    disc(c, 186, y0 + 44, 3, '#fff4c0');
    rect(c, 0, y0 + 56, 192, 4, '#2a2a30');
    // Bogies and wheels.
    for (const bx of [22, 140]) {
      rect(c, bx, y0 + 60, 32, 6, '#2a2a30');
      for (const wx of [bx + 6, bx + 26]) {
        disc(c, wx, y0 + 66, 6, '#1d1416');
        disc(c, wx, y0 + 66, 3, '#8a8a90');
      }
    }
  });
  // Rails under the tram's run.
  tex(scene, 'rail', 24, 6, (c) => {
    rect(c, 0, 2, 24, 4, '#4a4038');
    rect(c, 0, 0, 24, 2, '#a8a8a8');
    rect(c, 6, 2, 4, 4, '#2a2420');
    rect(c, 18, 2, 4, 4, '#2a2420');
  });
  // A wave breaking over the sea wall: three frames of a spray column,
  // and a foam swell that warns of it.
  for (let f = 0; f < 3; f++)
    tex(scene, 'wave-crash' + f, 72, 112, (c) => {
      const h = [70, 112, 96][f];
      const top = 112 - h;
      // Body of the wave.
      poly(
        c,
        [
          [6, 112],
          [14, top + 30],
          [26, top + 8],
          [40, top],
          [54, top + 12],
          [64, top + 34],
          [70, 112],
        ],
        '#2e6a9a',
      );
      poly(
        c,
        [
          [12, 112],
          [18, top + 34],
          [30, top + 14],
          [40, top + 8],
          [50, top + 18],
          [58, top + 38],
          [62, 112],
        ],
        '#5aa0d0',
      );
      poly(
        c,
        [
          [22, 112],
          [28, top + 44],
          [40, top + 24],
          [50, top + 46],
          [52, 112],
        ],
        '#9ad0ee',
      );
      // Crest of white foam and flying spray.
      for (let i = 0; i < 9; i++) {
        const a = (i / 8) * Math.PI;
        disc(
          c,
          36 - Math.cos(a) * 26,
          top + 10 - Math.sin(a) * (8 + f * 3),
          5 - (i % 2),
          '#f4fbff',
        );
      }
      for (let i = 0; i < 14; i++)
        disc(
          c,
          6 + hash(i, f) * 60,
          top - 4 + hash(i, f, 2) * 30,
          1.5 + hash(i, f, 3) * 2,
          '#ffffff',
        );
    });
  tex(scene, 'wave-foam', 72, 24, (c) => {
    poly(
      c,
      [
        [0, 24],
        [8, 12],
        [20, 8],
        [36, 4],
        [52, 8],
        [64, 12],
        [72, 24],
      ],
      '#3a7aaa',
    );
    for (let i = 0; i < 10; i++)
      disc(c, 6 + i * 6.5, 12 - Math.sin(i) * 3, 3.5, '#f0faff');
  });
  // Beach umbrella stand (grab it), and the umbrella you carry.
  tex(scene, 'stand', 40, 60, (c) => {
    rect(c, 19, 10, 2, 46, '#e8e0d0');
    rect(c, 13, 54, 14, 6, '#c8b088');
    stripes(c, 20, 12, 20, 10);
  });
  tex(scene, 'brolly-open', 44, 26, (c) => {
    stripes(c, 22, 14, 21, 12);
    rect(c, 21, 12, 2, 14, '#e8e0d0');
    rect(c, 18, 24, 4, 2, '#e8e0d0');
  });
  tex(scene, 'brolly-shut', 10, 30, (c) => {
    poly(
      c,
      [
        [5, 0],
        [9, 18],
        [1, 18],
      ],
      BLUE,
    );
    rect(c, 3, 4, 2, 14, WHITE);
    rect(c, 4, 18, 2, 10, '#e8e0d0');
    rect(c, 2, 27, 4, 2, '#e8e0d0');
  });
  tex(scene, 'rain', 3, 14, (c) => {
    rect(c, 1, 0, 1, 14, '#c8dcf0');
    rect(c, 0, 10, 1, 4, '#c8dcf0');
  });
  tex(scene, 'spray', 6, 6, (c) => {
    disc(c, 3, 3, 3, '#e8f6ff');
    disc(c, 2, 2, 1, '#ffffff');
  });
  // Lightning bolt for the storm (and the boss's strikes).
  tex(scene, 'bolt', 30, 200, (c) => {
    c.strokeStyle = '#ffffff';
    c.lineWidth = 4;
    c.beginPath();
    let x = 15;
    c.moveTo(x, 0);
    for (let y = 20; y <= 200; y += 20) {
      x = 15 + (hash(y, 7) - 0.5) * 22;
      c.lineTo(x, y);
    }
    c.stroke();
    c.strokeStyle = '#a8d0ff';
    c.lineWidth = 1.5;
    c.stroke();
  });
  tex(scene, 'strike-mark', 40, 10, (c) => {
    c.fillStyle = '#ffe890';
    c.beginPath();
    c.ellipse(20, 5, 19, 4, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.ellipse(20, 5, 9, 2, 0, 0, Math.PI * 2);
    c.fill();
  });
  // Hazard skins: broken bottles on the street, sea urchins on the rocks.
  tex(scene, 'corniche-glass', 24, 12, (c) => {
    for (const [x, col] of [
      [3, '#4a9a5a'],
      [13, '#8a5a2a'],
    ] as const) {
      poly(
        c,
        [
          [x, 12],
          [x + 2, 4],
          [x + 4, 7],
          [x + 6, 2],
          [x + 8, 12],
        ],
        col,
      );
      rect(c, x + 2, 6, 1, 3, '#ffffffaa');
    }
  });
  tex(scene, 'fort-glass', 24, 12, (c) => {
    for (const x of [6, 18]) {
      disc(c, x, 8, 5, '#1a1424');
      for (let k = 0; k < 9; k++) {
        const a = Math.PI + (k / 8) * Math.PI;
        c.strokeStyle = '#3a2a4a';
        c.lineWidth = 1;
        c.beginPath();
        c.moveTo(x, 8);
        c.lineTo(x + Math.cos(a) * 9, 8 + Math.sin(a) * 8);
        c.stroke();
      }
    }
  });
}
/** A striped beach-umbrella canopy centred at (cx, cy). */
function stripes(c: C, cx: number, cy: number, r: number, h: number) {
  const n = 6;
  for (let i = 0; i < n; i++) {
    const a0 = Math.PI + (i / n) * Math.PI,
      a1 = Math.PI + ((i + 1) / n) * Math.PI;
    poly(
      c,
      [
        [cx, cy - h],
        [cx + Math.cos(a0) * r, cy + Math.sin(a0) * 2],
        [cx + Math.cos(a1) * r, cy + Math.sin(a1) * 2],
      ],
      i % 2 ? WHITE : i === 2 ? '#d84a3a' : BLUE,
    );
  }
  for (let i = 0; i <= n; i++)
    disc(c, cx + Math.cos(Math.PI + (i / n) * Math.PI) * r, cy, 1.5, '#1d1416');
}

/** Near-layer silhouettes (in front of the view). */
export function w4Near(c: C, theme: Theme, W: number) {
  if (theme === 'fort') {
    // Low storm clouds rolling across the top of the view.
    for (let x = -40; x < W; x += 70) {
      const r = 26 + hash(x, 9) * 22;
      disc(c, x, 4 + hash(x, 3) * 10, r, '#1a1e28');
    }
    return;
  }
  // Corniche: festoon of café bulbs and the head of a lamp standard.
  c.strokeStyle = '#141820';
  c.lineWidth = 2;
  for (let x = 0; x < W; x += 240) {
    c.beginPath();
    c.moveTo(x, 4);
    c.quadraticCurveTo(x + 120, 40, x + 240, 4);
    c.stroke();
    for (let k = 1; k < 10; k++) {
      const t = k / 10,
        bx = x + t * 240,
        by = 4 + 4 * t * (1 - t) * 36;
      disc(c, bx, by + 4, 3, k % 3 ? '#141820' : '#2a2014');
    }
  }
}
