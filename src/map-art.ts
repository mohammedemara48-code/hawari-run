// Pixel-art map of Egypt for the journey screen, painted procedurally at a
// fraction of its on-screen size so it stays crisp at any aspect ratio.
// Original art: the Mediterranean, the Red Sea, Sinai, the Nile and its delta.
import { WORLDS } from './level-data';

export type WorldState = 'cleared' | 'open' | 'locked' | 'soon';

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
/** Point-in-polygon on normalised coordinates. */
function inside(x: number, y: number, poly: number[][]) {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i],
      [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)
      hit = !hit;
  }
  return hit;
}
// Mainland Egypt west of the Red Sea, and Sinai.
const LAND = [
  [0, 0.11],
  [0.12, 0.115],
  [0.24, 0.1],
  [0.3, 0.095],
  [0.38, 0.075],
  [0.46, 0.065],
  [0.54, 0.07],
  [0.6, 0.09],
  [0.66, 0.12],
  [0.7, 0.15],
  [0.73, 0.3],
  [0.78, 0.42],
  [0.86, 0.56],
  [0.95, 0.78],
  [1, 0.9],
  [1, 1],
  [0, 1],
];
const SINAI = [
  [0.7, 0.12],
  [0.78, 0.12],
  [0.88, 0.13],
  [0.86, 0.22],
  [0.83, 0.34],
  [0.8, 0.42],
  [0.77, 0.36],
  [0.74, 0.26],
  [0.71, 0.16],
];
// The Nile from the south up to Cairo, then the two delta branches.
const NILE = [
  [0.6, 1],
  [0.64, 0.9],
  [0.66, 0.84],
  [0.64, 0.76],
  [0.62, 0.7],
  [0.58, 0.62],
  [0.55, 0.54],
  [0.52, 0.46],
  [0.5, 0.36],
  [0.49, 0.3],
];
const BRANCHES = [
  [
    [0.49, 0.3],
    [0.44, 0.22],
    [0.38, 0.15],
    [0.34, 0.1],
  ],
  [
    [0.49, 0.3],
    [0.53, 0.22],
    [0.57, 0.15],
    [0.58, 0.09],
  ],
];
export function paintEgypt(canvas: HTMLCanvasElement, states: WorldState[]) {
  const box = canvas.parentElement!.getBoundingClientRect();
  const PX = box.height < 280 ? 2 : 3;
  const W = Math.max(80, Math.round(box.width / PX)),
    H = Math.max(80, Math.round(box.height / PX));
  canvas.width = W;
  canvas.height = H;
  const c = canvas.getContext('2d')!;
  c.imageSmoothingEnabled = false;
  const r = rng(11);
  const px = (x: number, y: number, col: string, w = 1, h = 1) => {
    c.fillStyle = col;
    c.fillRect(Math.round(x), Math.round(y), w, h);
  };
  // Land, sea and desert texture per pixel.
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const nx = x / W,
        ny = y / H;
      const land = inside(nx, ny, LAND) || inside(nx, ny, SINAI);
      if (!land) {
        const wave = (x + y * 3) % 23 === 0 || (x * 7 + y) % 41 === 0;
        px(x, y, wave ? '#5aa0c0' : ny < 0.2 ? '#22607e' : '#1e5672');
      } else {
        const n = r();
        px(
          x,
          y,
          n < 0.08
            ? '#c9a062'
            : n > 0.94
              ? '#ecd09a'
              : ny > 0.6
                ? '#d8ae6c'
                : '#dcb676',
        );
      }
    }
  // Coastline shading.
  for (let y = 1; y < H; y++)
    for (let x = 0; x < W; x++) {
      const a = inside(x / W, y / H, LAND) || inside(x / W, y / H, SINAI),
        b =
          inside(x / W, (y - 1) / H, LAND) || inside(x / W, (y - 1) / H, SINAI);
      if (a && !b) px(x, y, '#f4e2b0');
    }
  // Dunes in the Western Desert.
  for (let i = 0; i < W * 0.3; i++) {
    const x = r() * W * 0.42,
      y = H * (0.3 + r() * 0.65);
    px(x, y, '#c08e52', 3, 1);
    px(x + 1, y - 1, '#ecd09a', 2, 1);
  }
  // Green valley and delta, then the river itself.
  const line = (pts: number[][], width: number, col: string) => {
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i],
        [x1, y1] = pts[i + 1];
      const steps = Math.ceil(Math.hypot((x1 - x0) * W, (y1 - y0) * H));
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        px(
          (x0 + (x1 - x0) * t) * W - width / 2,
          (y0 + (y1 - y0) * t) * H - width / 2,
          col,
          width,
          width,
        );
      }
    }
  };
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const nx = x / W,
        ny = y / H;
      if (
        ny > 0.08 &&
        ny < 0.31 &&
        inside(nx, ny, [
          [0.49, 0.31],
          [0.31, 0.1],
          [0.6, 0.09],
        ])
      )
        px(x, y, (x + y) % 5 === 0 ? '#6aa848' : '#4e8c3a');
    }
  line(NILE, Math.max(4, W * 0.035), '#4e8c3a');
  line(NILE, 2, '#3a8ab8');
  BRANCHES.forEach((b) => line(b, 2, '#3a8ab8'));
  // Lake Nasser in the far south.
  px(
    0.6 * W,
    0.92 * H,
    '#3a8ab8',
    Math.max(3, W * 0.04),
    Math.max(3, H * 0.05),
  );
  // Little landmarks: pyramids at Giza, temple columns at Luxor.
  const pyr = (x: number, y: number, s: number) => {
    for (let i = 0; i < s; i++)
      px(x - i, y - s + i, i % 2 ? '#c89048' : '#e0b060', i * 2 + 1, 1);
  };
  pyr(0.43 * W, 0.37 * H, 5);
  pyr(0.4 * W, 0.38 * H, 3);
  for (let i = 0; i < 4; i++) px(0.68 * W + i * 3, 0.71 * H, '#b08048', 2, 6);
  px(0.68 * W - 1, 0.7 * H, '#8a6034', 13, 1);
  // Journey path between the world markers.
  for (let i = 0; i < WORLDS.length - 1; i++) {
    const a = WORLDS[i],
      b = WORLDS[i + 1];
    const steps = Math.round(Math.hypot((b.x - a.x) * W, (b.y - a.y) * H));
    const done = states[i] === 'cleared';
    for (let s = 0; s <= steps; s++) {
      if (s % 4 > 1) continue;
      const t = s / steps;
      const x = (a.x + (b.x - a.x) * t) * W,
        y = (a.y + (b.y - a.y) * t) * H - Math.sin(t * Math.PI) * H * 0.03;
      px(x, y + 1, '#1a1410', 2, 2);
      px(x, y, done ? '#ffd36b' : '#f4ead2aa', 2, 2);
    }
  }
  // Labels for the seas.
  c.fillStyle = '#9fd0e8';
  c.font = `${PX === 2 ? 6 : 7}px Changa, Tahoma, sans-serif`;
  c.textAlign = 'center';
  c.direction = 'rtl';
  c.fillText('البحر المتوسط', W * 0.14, H * 0.06);
  c.save();
  c.translate(W * 0.9, H * 0.62);
  c.rotate(1.05);
  c.fillText('البحر الأحمر', 0, 0);
  c.restore();
}
