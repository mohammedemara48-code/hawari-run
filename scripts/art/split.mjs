// Splits a sheet SVG without part ids into one SVG per creature (a hi-res
// image inside <g id=name>), cutting at empty columns.
// node scripts/art/split.mjs sheet.svg outDir name1 name2 …
import { chromium } from '@playwright/test';
import fs from 'node:fs';
const [svg, outDir, ...names] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--no-sandbox'] });
const p = await b.newPage({ deviceScaleFactor: 4 });
const text = fs.readFileSync(svg, 'utf8');
const vb = text
  .match(/viewBox="([^"]+)"/)[1]
  .split(/[ ,]+/)
  .map(Number);
await p.setViewportSize({ width: vb[2], height: vb[3] });
await p.setContent(
  `<body style="margin:0;background:transparent">${text}</body>`,
);
const png = await p.screenshot({
  omitBackground: true,
  clip: { x: 0, y: 0, width: vb[2], height: vb[3] },
});
const parts = await p.evaluate(async (b64) => {
  const img = new Image();
  img.src = 'data:image/png;base64,' + b64;
  await img.decode();
  const c = document.createElement('canvas');
  c.width = img.width;
  c.height = img.height;
  const x = c.getContext('2d');
  x.drawImage(img, 0, 0);
  const d = x.getImageData(0, 0, c.width, c.height).data;
  const col = (i) => {
    for (let y = 0; y < c.height; y++)
      if (d[(y * c.width + i) * 4 + 3] > 20) return true;
    return false;
  };
  const segs = [];
  let start = -1;
  for (let i = 0; i <= c.width; i++) {
    const on = i < c.width && col(i);
    if (on && start < 0) start = i;
    if (!on && start >= 0) {
      if (i - start > 8) segs.push([start, i]);
      start = -1;
    }
  }
  return segs.map(([a, z]) => {
    let top = c.height,
      bot = 0;
    for (let y = 0; y < c.height; y++)
      for (let i = a; i < z; i++)
        if (d[(y * c.width + i) * 4 + 3] > 20) {
          top = Math.min(top, y);
          bot = Math.max(bot, y);
          break;
        }
    const o = document.createElement('canvas');
    o.width = z - a;
    o.height = bot - top + 1;
    o.getContext('2d').drawImage(
      c,
      a,
      top,
      o.width,
      o.height,
      0,
      0,
      o.width,
      o.height,
    );
    return { w: o.width, h: o.height, url: o.toDataURL() };
  });
}, png.toString('base64'));
console.log('segments', parts.length);
fs.mkdirSync(outDir, { recursive: true });
parts.forEach((pt, i) => {
  const n = names[i] || 'part' + i,
    w = pt.w / 4,
    h = pt.h / 4;
  fs.writeFileSync(
    `${outDir}/${n}.svg`,
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"><g id="${n}"><image href="${pt.url}" x="0" y="0" width="${w}" height="${h}"/></g></svg>`,
  );
});
await b.close();
