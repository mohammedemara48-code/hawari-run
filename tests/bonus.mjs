import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const b = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const p = await b.newPage();
await p.goto('http://localhost:5173');
await p.waitForFunction(() => window.hawari?.scene.getScene('alley')?.hero);
await p.locator('[data-screen="title"] button').click();
await p.evaluate(() => {
  const s = window.hawari.scene.getScene('alley');
  s.remaining = 130;
  s.levelCoins = 7;
  s.kills = 2;
  s.hero.body.reset(s.spec.portal, 233);
  s.hero.body.blocked.down = true;
  s.portal();
});
const state = () =>
  p.evaluate(() => {
    const s = window.hawari.scene.getScene('alley');
    return {
      time: s.remaining,
      coins: s.levelCoins,
      kills: s.kills,
      bonus: s.bonus,
    };
  });
console.log('Entering', await state());
assert.equal(
  (await state()).coins,
  7,
  'bonus entry preserves level coin tally',
);
assert.equal((await state()).kills, 2);
assert.ok((await state()).time <= 130);
await p.evaluate(() => {
  const s = window.hawari.scene.getScene('alley');
  s.remaining = 120;
  s.levelCoins += 3;
  s.hero.x = 850;
  s.portal();
});
console.log('Returning', await state());
assert.equal((await state()).coins, 10);
assert.ok((await state()).time <= 120);
await b.close();
