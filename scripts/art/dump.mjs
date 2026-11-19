import { chromium } from '@playwright/test';
import fs from 'node:fs';
const out = process.argv[2] || '/workspace/art/old';
const b = await chromium.launch({ args: ['--no-sandbox'] });
const p = await b.newPage();
await p.goto('http://localhost:5173/');
await p.waitForFunction(() => window.hawari?.scene.getScene('alley')?.hero);
const re =
  /^(boss[0-9]?-|bat|rooster|pigeon|rat|buffalo|goose|crow|crab|gull|saw|plane|thief|skua|jelly|brolly|ball|scarab|mummy|cobra|devil|croc)[0-9]?/;
const data = await p.evaluate((src) => {
  const re = new RegExp(src);
  const tm = window.hawari.textures;
  const o = {};
  for (const k of tm.getTextureKeys()) {
    if (!re.test(k)) continue;
    const s = tm.get(k).getSourceImage();
    const c = document.createElement('canvas');
    c.width = s.width;
    c.height = s.height;
    c.getContext('2d').drawImage(s, 0, 0);
    o[k] = c.toDataURL();
  }
  return o;
}, re.source);
for (const [k, v] of Object.entries(data))
  fs.writeFileSync(`${out}/${k}.png`, Buffer.from(v.split(',')[1], 'base64'));
console.log(Object.keys(data).length, Object.keys(data).join(' '));
await b.close();
