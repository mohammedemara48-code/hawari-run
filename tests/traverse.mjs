import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox'],
});
const p = await browser.newPage();
await p.goto('http://localhost:5173');
await p.waitForFunction(() => window.hawari?.scene.getScene('alley')?.hero);
await p.locator('[data-screen="title"] button').click();
for (let level = 0; level < 2; level++) {
  await p.evaluate(() => {
    const s = window.hawari.scene.getScene('alley');
    s.invincible = s.time.now + 60000;
  });
  await p.keyboard.down('ArrowRight');
  await p.keyboard.down('Shift');
  let jumpAt = 0;
  const start = Date.now();
  let lastX = 0;
  while (Date.now() - start < 50000) {
    const s = await p.evaluate(() => {
      const s = window.hawari.scene.getScene('alley');
      return {
        x: s.hero.x,
        grounded: s.hero.body.blocked.down,
        mode: s.mode,
        gaps: s.spec.gaps,
        portal: s.spec.portal,
        blocked: s.hero.body.blocked.right,
      };
    });
    if (s.mode === 'clear' || s.mode === 'win') break;
    if (s.mode === 'over') throw Error('game over while traversing');
    const gap = s.gaps.some(([a, z]) => s.x > a - 75 && s.x < z);
    const tank = Math.abs(s.x - (s.portal - 38)) < 40;
    if (
      s.grounded &&
      (gap || tank || s.blocked || Math.abs(s.x - lastX) < 1) &&
      Date.now() - jumpAt > 550
    ) {
      await p.keyboard.down('Space');
      jumpAt = Date.now();
    }
    if (Date.now() - jumpAt > 330) await p.keyboard.up('Space');
    lastX = s.x;
    await p.waitForTimeout(70);
  }
  await p.keyboard.up('ArrowRight');
  await p.keyboard.up('Shift');
  await p.keyboard.up('Space');
  const state = await p.evaluate(() => {
    const s = window.hawari.scene.getScene('alley');
    return { x: s.hero.x, mode: s.mode, lives: s.lives };
  });
  console.log('World', level + 1, state);
  assert.equal(
    state.mode,
    level === 0 ? 'clear' : 'win',
    'complete full authored route using keyboard controls',
  );
  if (level === 0) await p.locator('[data-action="next"]').click();
}
await browser.close();
