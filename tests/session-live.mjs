/* global localStorage, indexedDB */
// Live check: log in, wipe every page-side copy (localStorage, the JS cookie,
// IndexedDB), reload: the httpOnly session cookie brings the player back.
// Usage: GAME_URL=https://hawari-run.vercel.app LOGIN_NAME=… LOGIN_PIN=… node tests/session-live.mjs
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const url = (process.env.GAME_URL || 'http://localhost:4173') + '/?login=1';
const b = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const ctx = await b.newContext({ viewport: { width: 844, height: 390 } });
const p = await ctx.newPage();
await p.goto(url);
await p.waitForSelector('[data-screen="login"]:not([hidden])');
await p.fill('#player-name-input', process.env.LOGIN_NAME);
await p.fill('#player-pin-input', process.env.LOGIN_PIN);
await p.click('#login-form button[type="submit"]');
await p.waitForSelector('[data-screen="title"]:not([hidden])');
const cookies = await ctx.cookies();
const s = cookies.find((c) => c.name === 'hawari_session');
assert.ok(s && s.httpOnly && s.secure, 'httpOnly session cookie set');
assert.ok(s.expires - Date.now() / 1000 > 360 * 86400, 'lasts a year');
await p.evaluate(async () => {
  localStorage.clear();
  document.cookie = 'hawari-player=; max-age=0; path=/';
  await new Promise((r) => {
    const d = indexedDB.deleteDatabase('hawari');
    d.onsuccess = d.onerror = d.onblocked = r;
  });
});
await p.reload();
await p.waitForFunction(
  () =>
    !document.querySelector('[data-screen="title"]').hidden &&
    !!localStorage.getItem('hawari-player'),
  null,
  { timeout: 10000 },
);
const who = await p.evaluate(
  () => JSON.parse(localStorage.getItem('hawari-player')).name,
);
assert.equal(who, process.env.LOGIN_NAME);
console.log('session restored after wipe:', who);
await b.close();
