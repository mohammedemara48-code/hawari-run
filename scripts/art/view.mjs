import { chromium } from '@playwright/test';
const [svg, out] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 800, height: 500 } });
await p.goto('file://' + svg);
await p.screenshot({ path: out, omitBackground: false });
await b.close();
