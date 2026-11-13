// World 3 (دمياط) art: carved-walnut workshop tiles with arabesque panels,
// limestone harbour quays, conveyor belts, chandeliers and harbour lanterns,
// toppling furniture stacks, Damietta fishing boats, nets and the sea.
// Drawn in code like the rest of the game.
import Phaser from 'phaser';
import type { Theme } from './level-data';
import { disc, hash, poly, rect, tex, type Palette } from './art-kit';

type C = CanvasRenderingContext2D;
const T = 24;
export const W3_PALETTES: Record<'workshop' | 'harbor', Palette> = {
  // Varnished walnut and brass under workshop lamps.
  workshop: {
    sky: [
      [0, '#6a7aa0'],
      [0.6, '#e8b08a'],
      [1, '#ffe0b0'],
    ],
    stone: ['#6a4228', '#74492c', '#5e3a22', '#7c4f30'],
    mortar: '#2e1c10',
    top: ['#c8924e', '#d8a25a', '#b8823e'],
    wood: ['#7a4a2a', '#a8703e', '#4e2e18'],
    accent: '#ffd27a',
    glow: '#ffcf8a',
    window: '#2a1a10',
    windowLit: '#ffd890',
    fog: '#e8c8a0',
  },
  // Sun-bleached limestone quay, tarred timber, sea blues.
  harbor: {
    sky: [
      [0, '#5a4a8a'],
      [0.55, '#e88a6a'],
      [1, '#ffd08a'],
    ],
    stone: ['#8a8070', '#948a78', '#7e7466', '#9c927e'],
    mortar: '#3e382e',
    top: ['#c0b090', '#d0c0a0', '#ae9e80'],
    wood: ['#6a4a30', '#8a6040', '#4a3220'],
    accent: '#ffd27a',
    glow: '#ffe0a0',
    window: '#2a3040',
    windowLit: '#ffd27a',
    fog: '#d8a0a0',
  },
};
export const isW3 = (theme: Theme) =>
  theme === 'workshop' || theme === 'harbor';

/** An eight-point arabesque star (two overlapping squares). */
function star(c: C, cx: number, cy: number, r: number, color: string) {
  const sq = (a0: number) =>
    poly(
      c,
      [0, 1, 2, 3].map((k) => {
        const a = a0 + (k * Math.PI) / 2;
        return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
      }),
      color,
    );
  sq(0);
  sq(Math.PI / 4);
}

/* ───────────── Tiles ───────────── */
export function w3Stone(
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
  if (theme === 'workshop') {
    // Carved walnut panel: a frame, wood grain and, every other tile, a
    // raised arabesque star inlaid in lighter wood.
    rect(c, x, y, T, 1, '#00000040');
    rect(c, x, y, 1, T, '#00000030');
    rect(c, x + 2, y + 2, T - 4, T - 4, '#00000018');
    rect(c, x + 3, y + 3, T - 6, T - 6, pal.stone[(col + row) % 4]);
    for (let i = 0; i < 3; i++) {
      const gx = x + 4 + Math.floor(hash(col, row, i + 5) * 16);
      rect(c, gx, y + 3, 1, T - 6, '#00000022');
    }
    if ((col + row) % 2 === 0) {
      star(c, x + 12, y + 12, 7, '#3e2414');
      star(c, x + 12, y + 12, 5.5, '#b07a44');
      star(c, x + 12, y + 12, 3, '#6a4228');
      rect(c, x + 11, y + 11, 2, 2, '#e8b870');
    } else {
      rect(c, x + 6, y + 6, 12, 12, '#00000020');
      rect(c, x + 6, y + 6, 12, 1, '#ffffff18');
    }
    return;
  }
  // Harbour: big limestone courses, salt bloom, weed and barnacles low down.
  const off = row % 2 ? 0 : 12;
  rect(c, x, y + 11, T, 1, pal.mortar);
  rect(c, x, y + 23, T, 1, pal.mortar);
  rect(c, x + ((off + 4) % T), y, 1, 11, pal.mortar);
  rect(c, x + ((off + 16) % T), y + 12, 1, 11, pal.mortar);
  rect(c, x + 1, y + 1, 9, 1, '#ffffff22');
  if (h > 0.8) rect(c, x + 4, y + 4, 6, 4, '#ffffff14');
  if (row >= 12) {
    rect(c, x, y + 18, T, 6, '#2e4a3a66');
    for (let i = 0; i < 3; i++)
      rect(
        c,
        x + Math.floor(hash(col, row, i) * 20),
        y + 19 + i * 2,
        2,
        2,
        '#d8d0c0',
      );
  }
}
export function w3Cap(
  c: C,
  x: number,
  y: number,
  col: number,
  row: number,
  pal: Palette,
  theme: Theme,
) {
  const h = hash(col, row, 7);
  if (theme === 'workshop') {
    // Varnished moulding with a bead-and-reel edge.
    rect(c, x, y, T, 7, '#3e2414');
    rect(c, x, y, T, 5, pal.top[Math.floor(h * 3)]);
    rect(c, x, y, T, 1, '#ffe0a8');
    for (let i = 0; i < T; i += 4) rect(c, x + i + 1, y + 5, 2, 2, '#e8b870');
    // Sawdust and the odd shaving on the floor.
    if (h > 0.7) {
      rect(c, x + 6, y - 1, 5, 1, '#f0d090');
      rect(c, x + 8, y - 2, 2, 1, '#f0d090');
    }
    return;
  }
  // Quay edge: a worn lip, a bollard or mooring ring now and then.
  rect(c, x, y, T, 6, '#5e5648');
  rect(c, x, y, T, 4, pal.top[Math.floor(h * 3)]);
  rect(c, x, y, T, 1, '#f0e4c8');
  if (h > 0.86) {
    rect(c, x + 8, y - 6, 8, 7, '#2a2a2e');
    rect(c, x + 7, y - 7, 10, 2, '#3e3e44');
    rect(c, x + 9, y - 5, 2, 4, '#5a5a62');
  } else if (h < 0.1) {
    c.strokeStyle = '#3a3a3e';
    c.lineWidth = 2;
    c.beginPath();
    c.arc(x + 12, y + 8, 3, 0, Math.PI * 2);
    c.stroke();
  }
}
export function w3Window(
  c: C,
  x: number,
  y: number,
  col: number,
  row: number,
  pal: Palette,
  theme: Theme,
) {
  if (theme === 'workshop') {
    // A turned-bead mashrabiya panel glowing from the lamp behind it.
    rect(c, x + 3, y + 2, 18, 20, '#2a1a10');
    rect(c, x + 4, y + 3, 16, 18, pal.windowLit);
    for (let i = 0; i < 4; i++)
      for (let j = 0; j < 4; j++) {
        rect(c, x + 4 + i * 4, y + 3 + j * 4.5, 3, 3, '#5a3a20');
        rect(c, x + 5 + i * 4, y + 4 + j * 4.5, 1, 1, '#b07a44');
      }
    return;
  }
  // A storm drain in the quay wall: an arched iron grate with a rust streak.
  void pal;
  rect(c, x + 6, y + 8, 12, 12, '#24221e');
  rect(c, x + 8, y + 6, 8, 2, '#24221e');
  for (let i = 0; i < 4; i++) rect(c, x + 7 + i * 3, y + 8, 1, 12, '#5a5650');
  rect(c, x + 6, y + 13, 12, 1, '#5a5650');
  if (hash(col, row, 3) > 0.5) rect(c, x + 11, y + 20, 2, 4, '#7a4a2a88');
}
export function w3Slab(
  c: C,
  x: number,
  y: number,
  col: number,
  row: number,
  _pal: Palette,
  theme: Theme,
) {
  if (theme === 'workshop') {
    // A carved beam with a running arabesque inlay.
    rect(c, x, y, T, 12, '#3e2414');
    rect(c, x, y + 1, T, 9, '#8a5a32');
    rect(c, x, y + 1, T, 2, '#c8925a');
    star(c, x + 12, y + 6, 3.5, '#e8b870');
    rect(c, x, y + 10, T, 2, '#2a180c');
    return;
  }
  // Pier planks on tarred posts, nail heads.
  rect(c, x, y, T, 10, '#2a1c12');
  rect(c, x, y + 1, T, 7, '#7a5a3a');
  rect(c, x, y + 1, T, 2, '#a8805a');
  rect(c, x + 11, y + 1, 1, 7, '#2a1c12');
  rect(c, x + 3, y + 4, 1, 1, '#c8c8c8');
  rect(c, x + 19, y + 4, 1, 1, '#c8c8c8');
  if (col % 3 === 0) rect(c, x + 10, y + 10, 4, 14, '#3a2a1a');
}
export function w3Ledge(
  c: C,
  x: number,
  y: number,
  col: number,
  row: number,
  _pal: Palette,
  theme: Theme,
  end: number,
) {
  const h = hash(col, row, 5);
  if (theme === 'workshop') {
    // A workshop shelf on brackets, with varnish cans and glue pots.
    rect(c, x, y, T, 5, '#3e2414');
    rect(c, x, y, T, 4, '#a8703e');
    rect(c, x, y, T, 1, '#e8b870');
    if (end) rect(c, x + (end < 0 ? 2 : 18), y + 4, 4, 10, '#3e2414');
    if (h > 0.55) varnishCan(c, x + 4 + Math.floor(h * 8), y - 11, h > 0.8);
    return;
  }
  // Rope-lashed plank with a frayed net fringe.
  rect(c, x, y, T, 5, '#2a1c12');
  rect(c, x, y, T, 4, '#8a6a46');
  rect(c, x, y, T, 1, '#c8a878');
  rect(c, x + 5, y, 2, 5, '#d8c090');
  rect(c, x + 17, y, 2, 5, '#d8c090');
  for (let i = 0; i < T; i += 4)
    rect(c, x + i, y + 5, 1, 3 + ((i + col) % 3), '#6a6450');
}
/** A tin of varnish (ورنيش) with a drip down the label. */
export function varnishCan(c: C, x: number, y: number, open: boolean) {
  rect(c, x, y, 10, 11, '#1d1416');
  rect(c, x + 1, y + 1, 8, 9, '#b8c0c4');
  rect(c, x + 1, y + 4, 8, 4, '#a8402a');
  rect(c, x + 3, y + 5, 4, 2, '#f0d090');
  rect(c, x + 1, y + 1, 8, 1, '#e8eef0');
  if (open) {
    rect(c, x + 1, y, 8, 2, '#6a2a10');
    rect(c, x + 7, y + 1, 1, 5, '#8a3a18');
  }
}
/** Belt bed: the frame and rollers under the moving surface. */
export function beltBed(c: C, x: number, y: number, col: number) {
  rect(c, x, y, T, T, '#2a2420');
  rect(c, x, y + 8, T, 10, '#3e3630');
  disc(c, x + 12, y + 13, 5, '#1a1612');
  disc(c, x + 12, y + 13, 3, '#8a8a90');
  rect(c, x + 11, y + 10, 2, 2, '#c8c8d0');
  rect(c, x, y + 20, T, 4, col % 2 ? '#e8b84a' : '#1d1416');
}
/** Sea floor: sand ripples, weed and the odd shell on the bottom row; the
 * water itself is drawn live so the tide can move it. */
export function seaBed(
  c: C,
  x: number,
  y: number,
  col: number,
  row: number,
  below: string,
) {
  if ('sUI'.includes(below)) return;
  rect(c, x, y + 16, T, 8, '#c8b088');
  rect(c, x, y + 16, T, 2, '#e0cca0');
  if (hash(col, row, 4) > 0.55) {
    rect(c, x + 6, y + 4, 2, 13, '#2e6a4a');
    rect(c, x + 9, y + 8, 2, 9, '#3a7a52');
  }
  if (hash(col, row, 6) > 0.8) disc(c, x + 16, y + 19, 2, '#f0d8c0');
}
/** A hanging fishing net cell: diamond rope mesh with a float. */
export function netCell(
  c: C,
  x: number,
  y: number,
  col: number,
  row: number,
  topCell: boolean,
) {
  c.strokeStyle = '#3a3428';
  c.lineWidth = 2;
  c.beginPath();
  for (let k = -T; k < T; k += 8) {
    c.moveTo(x + k, y);
    c.lineTo(x + k + T, y + T);
    c.moveTo(x + k + T, y);
    c.lineTo(x + k, y + T);
  }
  c.stroke();
  c.strokeStyle = '#c8b890';
  c.lineWidth = 1;
  c.stroke();
  rect(c, x, y, 2, T, '#5a4a36');
  rect(c, x + T - 2, y, 2, T, '#5a4a36');
  if (topCell) rect(c, x - 2, y - 2, T + 4, 4, '#6a4a30');
  if (hash(col, row, 2) > 0.7) disc(c, x + 12, y + 12, 3, '#e86a3a');
}

/* ───────────── Props ───────────── */
export function makeDamiettaProps(scene: Phaser.Scene) {
  if (scene.textures.exists('belt-top')) return;
  // Belt surface (scrolls): wooden slats on canvas.
  tex(scene, 'belt-top', 24, 8, (c) => {
    rect(c, 0, 0, 24, 8, '#1d1416');
    for (let i = 0; i < 24; i += 6) {
      rect(c, i, 1, 5, 5, '#8a6a46');
      rect(c, i, 1, 5, 1, '#c8a070');
    }
    rect(c, 0, 6, 24, 2, '#3a3028');
  });
  tex(scene, 'belt-arrow', 12, 8, (c) => {
    poly(
      c,
      [
        [0, 0],
        [6, 4],
        [0, 8],
        [3, 4],
      ],
      '#ffd27a',
    );
  });
  // Brass chandelier: a flat ring you can stand on, candles and glass drops.
  tex(scene, 'chandelier', 56, 30, (c) => {
    rect(c, 4, 0, 48, 6, '#3a2a10');
    rect(c, 5, 1, 46, 4, '#c8a040');
    rect(c, 5, 1, 46, 1, '#ffe08a');
    for (let i = 8; i < 50; i += 10) {
      rect(c, i, -4 + 4, 3, 1, '#ffe08a');
      rect(c, i, 6, 2, 10, '#8a6a20');
      disc(c, i + 1, 18, 3, '#bfeef8');
      disc(c, i + 1, 18, 1.5, '#ffffff');
    }
    poly(
      c,
      [
        [20, 6],
        [36, 6],
        [30, 26],
        [26, 26],
      ],
      '#a8802a',
    );
    disc(c, 28, 27, 3, '#ffd27a');
  });
  // Harbour version: a plank swing with a ship's lantern under it.
  tex(scene, 'ship-lantern', 56, 30, (c) => {
    rect(c, 4, 0, 48, 6, '#2a1c12');
    rect(c, 5, 1, 46, 4, '#8a6040');
    rect(c, 5, 1, 46, 1, '#c8a070');
    rect(c, 26, 6, 4, 4, '#2a2a2e');
    rect(c, 22, 10, 12, 14, '#2a2a2e');
    rect(c, 24, 12, 8, 10, '#ffd27a');
    rect(c, 26, 13, 4, 6, '#fff4c0');
    rect(c, 21, 24, 14, 3, '#2a2a2e');
  });
  tex(scene, 'rope', 4, 24, (c) => {
    for (let y = 0; y < 24; y += 4) {
      rect(c, 1, y, 2, 3, '#c8a878');
      rect(c, 1, y + 3, 2, 1, '#6a5438');
    }
  });
  tex(scene, 'lamp-hook', 24, 10, (c) => {
    rect(c, 0, 0, 24, 6, '#3a2414');
    rect(c, 0, 0, 24, 2, '#8a5a32');
    rect(c, 10, 6, 4, 4, '#8a9498');
  });
  // Stacked furniture: a carved chest, a cabinet and a chair on top (24×72).
  tex(scene, 'stack', 24, 72, (c) => {
    // Chair (top).
    rect(c, 2, 2, 3, 22, '#3e2414');
    rect(c, 3, 3, 1, 20, '#a8703e');
    rect(c, 2, 2, 20, 4, '#3e2414');
    rect(c, 3, 3, 18, 2, '#c8924e');
    rect(c, 2, 14, 20, 4, '#3e2414');
    rect(c, 3, 15, 18, 2, '#b04a3a');
    rect(c, 19, 14, 3, 10, '#3e2414');
    star(c, 12, 9, 3, '#e8b870');
    // Cabinet (middle) with arabesque doors.
    rect(c, 0, 24, 24, 24, '#2e1a0e');
    rect(c, 1, 25, 22, 22, '#7a4a2a');
    rect(c, 2, 26, 9, 20, '#8a5a32');
    rect(c, 13, 26, 9, 20, '#8a5a32');
    star(c, 6.5, 36, 3.5, '#e8b870');
    star(c, 17.5, 36, 3.5, '#e8b870');
    rect(c, 11, 34, 2, 4, '#ffd27a');
    // Chest (bottom) with drawers.
    rect(c, 0, 48, 24, 24, '#2e1a0e');
    rect(c, 1, 49, 22, 22, '#6a4228');
    for (const y of [50, 57, 64]) {
      rect(c, 2, y, 20, 6, '#8a5a32');
      rect(c, 2, y, 20, 1, '#c8924e');
      rect(c, 10, y + 2, 4, 2, '#ffd27a');
    }
  });
  // Damietta fishing boat: blue-and-red hull, an eye on the bow, 3 tiles deck.
  tex(scene, 'boat', 84, 34, (c) => {
    rect(c, 40, 0, 3, 12, '#4a3220');
    poly(
      c,
      [
        [43, 1],
        [60, 10],
        [43, 10],
      ],
      '#e8e0d0',
    );
    poly(
      c,
      [
        [0, 10],
        [84, 10],
        [76, 30],
        [8, 30],
      ],
      '#1d1416',
    );
    poly(
      c,
      [
        [3, 12],
        [81, 12],
        [74, 28],
        [10, 28],
      ],
      '#2e6aa8',
    );
    rect(c, 6, 12, 72, 4, '#f0ead8');
    rect(c, 8, 16, 68, 2, '#c83a3a');
    rect(c, 12, 22, 60, 2, '#e8b84a');
    // The protective eye on the bow.
    disc(c, 72, 19, 3, '#ffffff');
    disc(c, 72, 19, 1.5, '#14100e');
    rect(c, 2, 9, 80, 3, '#8a6040');
    rect(c, 2, 9, 80, 1, '#c8a070');
  });
  tex(scene, 'sea-top', 48, 10, (c) => {
    rect(c, 0, 4, 48, 6, '#3a7aa0');
    for (let i = 0; i < 48; i += 12) {
      rect(c, i, 3, 8, 2, '#8ad0e8');
      rect(c, i + 2, 2, 4, 1, '#e8f8ff');
    }
  });
  tex(scene, 'shell', 10, 8, (c) => {
    poly(
      c,
      [
        [0, 7],
        [5, 0],
        [10, 7],
      ],
      '#1d1416',
    );
    poly(
      c,
      [
        [1, 6],
        [5, 1],
        [9, 6],
      ],
      '#f0d8c0',
    );
    rect(c, 4, 2, 1, 4, '#c8a088');
    rect(c, 6, 3, 1, 3, '#c8a088');
  });
  tex(scene, 'bubble', 14, 14, (c) => {
    disc(c, 7, 7, 6, '#1d4a68');
    disc(c, 7, 7, 5, '#8ad0f0');
    disc(c, 7, 7, 3.5, '#bfeaff');
    rect(c, 4, 4, 2, 2, '#ffffff');
  });
  tex(scene, 'wave', 40, 22, (c) => {
    poly(
      c,
      [
        [0, 22],
        [6, 8],
        [18, 1],
        [30, 4],
        [40, 22],
      ],
      '#1d4a68',
    );
    poly(
      c,
      [
        [3, 22],
        [8, 10],
        [18, 4],
        [28, 7],
        [36, 22],
      ],
      '#4a9ac8',
    );
    poly(
      c,
      [
        [10, 8],
        [18, 4],
        [26, 7],
        [20, 9],
      ],
      '#e8f8ff',
    );
  });
  tex(scene, 'shaving', 8, 6, (c) => {
    c.strokeStyle = '#f0d090';
    c.lineWidth = 2;
    c.beginPath();
    c.arc(4, 3, 2.5, 0, Math.PI * 1.6);
    c.stroke();
  });
  // Hazard skins: tacks on the workshop floor, sea urchins on the quay.
  tex(scene, 'workshop-glass', 24, 12, (c) => {
    for (let i = 1; i < 24; i += 5) {
      rect(c, i, 8, 4, 2, '#c8c8d0');
      rect(c, i + 1, 2, 2, 7, '#e8e8f0');
      rect(c, i + 1, 1, 1, 1, '#ffffff');
    }
  });
  tex(scene, 'harbor-glass', 24, 12, (c) => {
    for (const x of [6, 18]) {
      disc(c, x, 8, 5, '#2a1a3a');
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        rect(c, x + Math.cos(a) * 6, 8 + Math.sin(a) * 5, 1, 1, '#6a4a8a');
      }
    }
  });
}

/** Near-layer silhouettes for the Damietta themes (in front of the view). */
export function w3Near(c: C, theme: Theme, W: number) {
  if (theme === 'workshop') {
    // A carved wooden valance (cornice) along the top with scallops.
    const col = '#1e120a';
    rect(c, 0, 0, W, 10, col);
    for (let x = 0; x < W; x += 24) {
      c.fillStyle = col;
      c.beginPath();
      c.arc(x + 12, 10, 10, 0, Math.PI);
      c.fill();
      star(c, x + 12, 6, 3, '#3a2414');
    }
    return;
  }
  // Harbour: a drooping fishing net and a rope across the top.
  c.strokeStyle = '#121a20';
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(0, 6);
  c.quadraticCurveTo(W / 2, 36, W, 6);
  c.stroke();
  c.lineWidth = 1.5;
  for (let x = 0; x < W; x += 320) {
    for (let k = 0; k < 10; k++) {
      c.beginPath();
      c.moveTo(x + k * 8, 0);
      c.lineTo(x + 40 + k * 4, 50 - k * 3);
      c.moveTo(x + 80 - k * 8, 0);
      c.lineTo(x + 40 - k * 4, 50 - k * 3);
      c.stroke();
    }
    disc(c, x + 40, 52, 5, '#121a20');
  }
}
