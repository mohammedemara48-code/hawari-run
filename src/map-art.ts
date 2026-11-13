// Pixel-art journey map, painted procedurally at 1/3 of the board's size so it
// stays crisp at any aspect ratio. Original art: a dusk view over Cairo with
// the four districts of the journey and a stitched path linking them.
export interface MapSpot {
  x: number; // 0..1 of the board width
  y: number; // 0..1 of the board height
}
export const MAP_SPOTS: MapSpot[] = [
  { x: 0.85, y: 0.66 },
  { x: 0.62, y: 0.4 },
  { x: 0.38, y: 0.62 },
  { x: 0.14, y: 0.42 },
];

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function paintMap(
  canvas: HTMLCanvasElement,
  cleared: boolean[],
  unlocked: number,
) {
  const box = canvas.parentElement!.getBoundingClientRect();
  const PX = box.height < 280 ? 2 : 3;
  const W = Math.max(120, Math.round(box.width / PX)),
    H = Math.max(60, Math.round(box.height / PX));
  canvas.width = W;
  canvas.height = H;
  const c = canvas.getContext('2d')!;
  c.imageSmoothingEnabled = false;
  const r = rng(7);
  const rect = (x: number, y: number, w: number, h: number, col: string) => {
    c.fillStyle = col;
    c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  };
  // Dusk sky in hard pixel bands with a dithered seam between each band.
  const bands = [
    '#1b1d3a',
    '#2a2546',
    '#46304f',
    '#6e3f55',
    '#a3555a',
    '#d97a5c',
    '#f0a865',
  ];
  const horizon = Math.round(H * 0.38);
  const bh = horizon / bands.length;
  bands.forEach((col, i) => {
    rect(0, i * bh, W, bh + 1, col);
    if (i)
      for (let x = i % 2; x < W; x += 2) rect(x, i * bh, 1, 1, bands[i - 1]);
  });
  for (let i = 0; i < W / 6; i++)
    rect(
      r() * W,
      r() * horizon * 0.45,
      1,
      1,
      r() < 0.3 ? '#fff4d0' : '#9b93c4',
    );
  rect(W * 0.72, horizon * 0.28, 6, 6, '#ffe6a8');
  rect(W * 0.72 + 1, horizon * 0.28 - 1, 4, 8, '#ffe6a8');
  rect(W * 0.72 + 2, horizon * 0.28 + 1, 5, 4, bands[1]);
  // Far skyline: pyramids, citadel domes, Cairo Tower, minarets.
  const far = '#4a2f4c';
  const pyr = (x: number, s: number) => {
    for (let i = 0; i < s; i++)
      rect(x - i, horizon - s + i, i * 2 + 1, 1, i % 3 ? far : '#5a3a55');
  };
  pyr(W * 0.06, 14);
  pyr(W * 0.12, 9);
  const minaret = (x: number, h: number, col = far) => {
    rect(x, horizon - h, 2, h, col);
    rect(x - 1, horizon - h * 0.7, 4, 1, col);
    rect(x, horizon - h - 3, 2, 3, col);
    rect(x + 0.5, horizon - h - 5, 1, 2, col);
  };
  const dome = (x: number, w: number, col = far) => {
    for (let i = 0; i < w / 2; i++) {
      const hw = Math.round(Math.sqrt((w / 2) ** 2 - i * i));
      rect(x - hw, horizon - 6 - i, hw * 2, 1, col);
    }
    rect(x - w / 2, horizon - 6, w, 6, col);
  };
  // Citadel on its hill.
  rect(W * 0.28 - 18, horizon - 4, 40, 4, far);
  dome(W * 0.28, 12);
  minaret(W * 0.28 - 9, 22);
  minaret(W * 0.28 + 8, 22);
  // Cairo Tower lattice.
  const tx = Math.round(W * 0.5);
  rect(tx, horizon - 34, 3, 34, far);
  rect(tx - 2, horizon - 38, 7, 4, far);
  rect(tx - 1, horizon - 41, 5, 3, far);
  rect(tx + 1, horizon - 45, 1, 4, far);
  for (let y = horizon - 32; y < horizon; y += 3)
    rect(tx + 1, y, 1, 1, '#6e4a63');
  dome(W * 0.88, 10);
  minaret(W * 0.84, 18);
  minaret(W * 0.93, 14);
  // Mid city: rows of houses with lit windows.
  for (let x = -4; x < W;) {
    const w = 8 + Math.floor(r() * 12),
      h = 6 + Math.floor(r() * 12);
    const col = r() < 0.5 ? '#3a2a44' : '#33263f';
    rect(x, horizon - h + 6, w, h, col);
    for (let wy = horizon - h + 8; wy < horizon + 4; wy += 3)
      for (let wx = x + 2; wx < x + w - 1; wx += 3)
        if (r() < 0.35) rect(wx, wy, 1, 1, '#ffcf6b');
    x += w;
  }
  // Ground of the city with a dithered top edge.
  const groundTop = horizon + 6;
  rect(0, groundTop, W, H - groundTop, '#2b3a33');
  for (let x = 0; x < W; x += 2) rect(x, groundTop, 1, 1, '#33263f');
  for (let i = 0; i < W * H * 0.02; i++)
    rect(
      r() * W,
      groundTop + 1 + r() * (H - groundTop),
      1,
      1,
      r() < 0.5 ? '#334539' : '#24322c',
    );
  // The Nile winding across, with a bridge.
  const riverY = (x: number) =>
    H * 0.82 + Math.sin((x / W) * Math.PI * 2.2) * H * 0.06;
  for (let x = 0; x < W; x++) {
    const y = Math.round(riverY(x));
    rect(x, y - 4, 1, 9, '#2c6a7c');
    rect(x, y - 5, 1, 1, '#c9b888');
    rect(x, y + 5, 1, 1, '#c9b888');
    if ((x * 7) % 11 === 0) rect(x, y - 1 + (x % 3), 2, 1, '#8fd0e0');
  }
  const bx = Math.round(W * 0.5);
  for (let x = bx - 14; x < bx + 14; x++)
    rect(x, riverY(x) - 7, 1, 2, '#8a7a66');
  for (let x = bx - 12; x < bx + 14; x += 6)
    rect(x, riverY(x) - 5, 1, 6, '#6a5a4a');
  // Districts painted under each map spot.
  const spot = (i: number) => [MAP_SPOTS[i].x * W, MAP_SPOTS[i].y * H] as const;
  const above = (i: number) =>
    [MAP_SPOTS[i].x * W, MAP_SPOTS[i].y * H - 13] as const;
  // 1 · Lantern alley: two houses, a string of lights.
  {
    const [x, y] = above(0);
    rect(x - 22, y - 16, 14, 18, '#5a4636');
    rect(x + 8, y - 20, 14, 22, '#634c3a');
    for (let i = 0; i < 4; i++)
      rect(
        x - 20 + (i % 2) * 6,
        y - 13 + Math.floor(i / 2) * 6,
        3,
        3,
        '#ffcf6b',
      );
    for (let i = 0; i < 4; i++)
      rect(
        x + 10 + (i % 2) * 6,
        y - 17 + Math.floor(i / 2) * 6,
        3,
        3,
        i === 1 ? '#3a2a24' : '#ffcf6b',
      );
    for (let i = 0; i < 16; i++)
      rect(
        x - 8 + i,
        y - 18 + Math.round(Math.sin(i / 5) * 2),
        1,
        1,
        i % 4 ? '#7a6a5a' : '#ffd36b',
      );
  }
  // 2 · Market: striped awnings and a gate.
  {
    const [x, y] = above(1);
    const stripes = ['#d8443a', '#f4ead2', '#2f7a5c', '#f4ead2'];
    for (let s = 0; s < 3; s++) {
      const sx = x - 24 + s * 17;
      rect(sx, y - 8, 14, 10, '#6a4a32');
      for (let k = 0; k < 14; k++)
        rect(sx + k, y - 12, 1, 4, stripes[(Math.floor(k / 2) + s) % 4]);
      rect(sx + 4, y - 5, 6, 7, '#ffcf6b');
    }
    rect(x - 4, y - 24, 9, 12, '#8a6a48');
    rect(x - 2, y - 20, 5, 8, '#2a1e18');
  }
  // 3 · Rooftops: tall blocks, dishes, a pigeon tower.
  {
    const [x, y] = above(2);
    rect(x - 20, y - 26, 12, 28, '#7a6650');
    rect(x - 6, y - 34, 12, 36, '#86705a');
    rect(x + 8, y - 22, 12, 24, '#705c48');
    rect(x - 3, y - 38, 5, 2, '#e8ecef');
    rect(x - 4, y - 37, 1, 1, '#e8ecef');
    rect(x + 13, y - 30, 3, 8, '#5a3a2a');
    rect(x + 11, y - 32, 7, 2, '#5a3a2a');
    for (let i = 0; i < 3; i++)
      rect(x + 2 + i * 4, y - 44 + (i % 2), 2, 1, '#f4ead2');
  }
  // 4 · Metro: a station entrance going down, with a sign.
  {
    const [x, y] = above(3);
    rect(x - 16, y - 4, 32, 8, '#3a4446');
    for (let i = 0; i < 4; i++)
      rect(
        x - 12 + i * 2,
        y - 4 + i * 2,
        24 - i * 4,
        2,
        i % 2 ? '#2a3234' : '#4b5c5e',
      );
    rect(x - 2, y - 18, 4, 12, '#556');
    rect(x - 6, y - 24, 12, 7, '#c0392b');
    rect(x - 3, y - 22, 6, 3, '#f4ead2');
    rect(x - 16, y + 4, 32, 2, '#6fd0c0');
  }
  // The stitched path between districts: gold where travelled, grey ahead.
  for (let i = 0; i < MAP_SPOTS.length - 1; i++) {
    const [x0, y0] = spot(i),
      [x1, y1] = spot(i + 1);
    const done = cleared[i];
    const open = i + 1 <= unlocked;
    const steps = Math.round(Math.hypot(x1 - x0, y1 - y0));
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const x = x0 + (x1 - x0) * t,
        y = y0 + (y1 - y0) * t + Math.sin(t * Math.PI) * H * 0.1;
      if (s % 5 < 3)
        rect(x, y, 2, 2, done ? '#ffd36b' : open ? '#e8d8b0' : '#56605a');
      if (s % 5 < 3) rect(x, y + 2, 2, 1, '#1a2420');
    }
  }
  // Vignette.
  c.fillStyle = 'rgba(8,10,20,0.35)';
  c.fillRect(0, 0, W, 2);
  c.fillRect(0, H - 2, W, 2);
}
