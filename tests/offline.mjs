import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const b = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const ctx = await b.newContext();
const p = await ctx.newPage();
await p.goto('http://localhost:4173');
await p.waitForFunction(() => window.hawari?.scene.getScene('alley')?.hero);
await p.waitForTimeout(1500);
const installed = await p.evaluate(async () => {
  const reg = await navigator.serviceWorker.getRegistration();
  return reg?.active?.state;
});
assert.equal(
  installed,
  'activated',
  'production offline worker must successfully install',
);
await ctx.setOffline(true);
await p.reload();
await p.waitForFunction(() => window.hawari?.scene.getScene('alley')?.hero);
await p.locator('[data-screen="title"] button').click();
assert.equal(
  await p.evaluate(() => window.hawari.scene.getScene('alley').mode),
  'map',
);
await p.locator('.map-node[data-node="0"]').click();
assert.equal(
  await p.evaluate(() => window.hawari.scene.getScene('alley').mode),
  'play',
);
console.log('PASS: production game loads and starts with network disabled');
await b.close();
