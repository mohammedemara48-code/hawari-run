// Renders the install icons from the game's own hero sprite (no third-party art).
// Usage: dev server running on :5173, then `npm run icons`.
import { chromium } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
const b = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const p = await b.newPage();
await p.goto(process.env.GAME_URL || 'http://localhost:5173/');
await p.waitForFunction(() => window.hawari?.scene.getScene('alley')?.hero);
// [file, size, hero height as a share of the canvas, rounded corners]
const icons = [
  ['icon-192.png', 192, 0.8],
  ['icon-512.png', 512, 0.8],
  // Maskable: the hero stays inside the central 80% safe circle.
  ['icon-maskable-192.png', 192, 0.58],
  ['icon-maskable-512.png', 512, 0.58],
  // iOS ignores transparency and rounds corners itself: opaque square.
  ['apple-touch-icon.png', 180, 0.74],
];
for (const [file, size, share] of icons) {
  const data = await p.evaluate(
    ([size, share]) => {
      const s = window.hawari.scene.getScene('alley');
      const src = s.textures.get('hero-big-idle0').getSourceImage();
      // Crop the sprite to its opaque pixels so it can be centred precisely.
      const t = document.createElement('canvas');
      t.width = src.width;
      t.height = src.height;
      const tc = t.getContext('2d');
      tc.drawImage(src, 0, 0);
      const px = tc.getImageData(0, 0, t.width, t.height).data;
      let x0 = t.width,
        y0 = t.height,
        x1 = 0,
        y1 = 0;
      for (let y = 0; y < t.height; y++)
        for (let x = 0; x < t.width; x++)
          if (px[(y * t.width + x) * 4 + 3] > 0) {
            x0 = Math.min(x0, x);
            y0 = Math.min(y0, y);
            x1 = Math.max(x1, x);
            y1 = Math.max(y1, y);
          }
      const w = x1 - x0 + 1,
        h = y1 - y0 + 1;
      const c = document.createElement('canvas');
      c.width = c.height = size;
      const ctx = c.getContext('2d');
      const g = ctx.createRadialGradient(
        size / 2,
        size * 0.42,
        size * 0.05,
        size / 2,
        size / 2,
        size * 0.72,
      );
      g.addColorStop(0, '#2f5960');
      g.addColorStop(1, '#14262c');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, size, size);
      // Warm lantern glow behind the hero.
      ctx.fillStyle = '#f1b94c22';
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size * share * 0.55, 0, Math.PI * 2);
      ctx.fill();
      ctx.imageSmoothingEnabled = false;
      const k = Math.floor(((size * share) / h) * 4) / 4,
        dw = Math.round(w * k),
        dh = Math.round(h * k);
      ctx.drawImage(
        t,
        x0,
        y0,
        w,
        h,
        Math.round((size - dw) / 2),
        Math.round((size - dh) / 2),
        dw,
        dh,
      );
      return c.toDataURL('image/png').split(',')[1];
    },
    [size, share],
  );
  await writeFile(`public/${file}`, Buffer.from(data, 'base64'));
  console.log('wrote', file, size);
}
await b.close();
