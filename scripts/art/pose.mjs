// Bakes posed sprite frames from layered SVG art (QuiverAI) into PNGs the
// game swaps in for its procedural creature textures (same key, same size).
// Usage: node scripts/art/pose.mjs job.json outDir
// job: { svg, frames: [{ key, w, h, box:[x,y,w,h], flip, parts:{ id:
//   { rotate, pivot:[fx,fy], dx, dy, sx, sy, hide } }, all:{…}, tint, alpha }] }
import { chromium } from '@playwright/test';
import fs from 'node:fs';
const [jobPath, outDir] = process.argv.slice(2);
const job = JSON.parse(fs.readFileSync(jobPath, 'utf8'));
fs.mkdirSync(outDir, { recursive: true });
const b = await chromium.launch({ args: ['--no-sandbox'] });
const p = await b.newPage();
await p.setContent('<body style="margin:0"></body>');
const svgText = fs.readFileSync(job.svg, 'utf8');
for (const f of job.frames) {
  const url = await p.evaluate(
    async ({ svgText, f }) => {
      document.body.innerHTML = svgText;
      const svg = document.querySelector('svg');
      svg.style.position = 'absolute';
      // Per-part transforms around a pivot given as a fraction of its box.
      // Regroup parts the art left together (e.g. the lower jaw).
      for (const m of f.moves || []) {
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.id = m.group;
        if (m.attrs)
          for (const [k, v] of Object.entries(m.attrs)) g.setAttribute(k, v);
        const anchor = svg.querySelector('#' + CSS.escape(m.before));
        anchor.parentNode.insertBefore(g, anchor);
        for (const id of m.ids)
          g.appendChild(svg.querySelector('#' + CSS.escape(id)));
      }
      // One creature out of a sheet: hide its siblings (and theirs, up the tree).
      if (f.only) {
        let el = svg.querySelector('#' + CSS.escape(f.only));
        while (el && el !== svg) {
          for (const sib of el.parentNode.children)
            if (
              sib !== el &&
              sib.tagName !== 'defs' &&
              !sib.querySelector?.('#' + CSS.escape(f.only))
            )
              sib.setAttribute('display', 'none');
          el = el.parentNode;
        }
      }
      // Fit box comes from the rest pose, so poses never change the scale.
      const bb0 = svg.getBBox();
      const ref = f.refBox || [bb0.x, bb0.y, bb0.width, bb0.height];
      const tf = (el, t) => {
        if (!el || !t) return;
        if (t.hide) return el.setAttribute('display', 'none');
        const bb = el.getBBox();
        const [fx, fy] = t.pivot || [0.5, 0.5];
        let [cx, cy] = t.at || [bb.x + bb.width * fx, bb.y + bb.height * fy];
        // A part with its own transform: pivot into its parent's units.
        const own = el.transform?.baseVal?.consolidate?.();
        if (own && !t.at) {
          const m = own.matrix;
          [cx, cy] = [m.a * cx + m.c * cy + m.e, m.b * cx + m.d * cy + m.f];
        }
        let s = `translate(${t.dx || 0} ${t.dy || 0}) `;
        s += `translate(${cx} ${cy}) rotate(${t.rotate || 0}) scale(${t.sx || 1} ${t.sy || 1}) translate(${-cx} ${-cy})`;
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('transform', s);
        el.parentNode.insertBefore(g, el);
        g.appendChild(el);
      };
      // Extra drawn bits (mouth inside, dust, stars), in a part's own units.
      for (const o of f.overlays || []) {
        const host = svg.querySelector('#' + CSS.escape(o.in));
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.innerHTML = o.svg;
        const before =
          o.before && svg.querySelector('#' + CSS.escape(o.before));
        if (before) before.parentNode.insertBefore(g, before);
        else host.appendChild(g);
      }
      for (const [id, t] of Object.entries(f.parts || {}))
        tf(svg.querySelector('#' + CSS.escape(id)), t);
      const vb = (svg.getAttribute('viewBox') || '').split(/[ ,]+/).map(Number);
      const xml = new XMLSerializer().serializeToString(svg);
      const img = new Image();
      img.src =
        'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(xml)));
      await img.decode();
      const c = document.createElement('canvas');
      c.width = f.w;
      c.height = f.h;
      const x = c.getContext('2d');
      const [bx, by, bw, bh] = f.box;
      const k = Math.min(bw / (ref[2] * (f.sx || 1)), bh / ref[3]);
      const kx = k * (f.sx || 1);
      // Align bottom-centre of the ref box to the bottom-centre of the target.
      const ox = bx + bw / 2 - (ref[0] + ref[2] / 2) * kx;
      const oy = by + bh - (ref[1] + ref[3]) * k;
      x.save();
      if (f.flip) {
        x.translate(f.w, 0);
        x.scale(-1, 1);
      }
      x.imageSmoothingEnabled = true;
      x.drawImage(img, ox - vb[0] * kx, oy - vb[1] * k, vb[2] * kx, vb[3] * k);
      x.restore();
      // Crisp sprite edges: hard alpha, optional tint for hurt/flash frames.
      const d = x.getImageData(0, 0, f.w, f.h);
      const a = d.data;
      for (let i = 0; i < a.length; i += 4) {
        a[i + 3] = a[i + 3] >= 100 ? 255 : 0;
        if (f.tint && a[i + 3]) {
          const [tr, tg, tb, tm] = f.tint;
          a[i] += (tr - a[i]) * tm;
          a[i + 1] += (tg - a[i + 1]) * tm;
          a[i + 2] += (tb - a[i + 2]) * tm;
        }
      }
      x.putImageData(d, 0, 0);
      return { url: c.toDataURL(), ref };
    },
    { svgText, f },
  );
  fs.writeFileSync(
    `${outDir}/${f.key}.png`,
    Buffer.from(url.url.split(',')[1], 'base64'),
  );
}
console.log('baked', job.frames.length);
await b.close();
