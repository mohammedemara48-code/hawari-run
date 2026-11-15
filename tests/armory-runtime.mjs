// Chili crate before every boss: bumping it arms بلبل (the touch «شطة» button
// lights up), pays a bonus if he is already armed, and is back after a
// respawn. Phone landscape with touch; dev server must be running.
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'],
});
const ctx = await browser.newContext({
  viewport: { width: 844, height: 390 },
  isMobile: true,
  hasTouch: true,
});
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.addInitScript(() => {
  window.localStorage.clear();
  window.localStorage.setItem('hawari-seen-version', '999');
});
await page.goto(process.env.GAME_URL || 'http://localhost:5173/');
await page.waitForFunction(
  () => window.hawari?.scene.getScene('alley')?.hero,
  null,
  { timeout: 20000 },
);
const wait = (ms) => page.waitForTimeout(ms);
const ev = (fn, arg) => page.evaluate(fn, arg);
// Start a level from the title so the touch controls are shown.
await page.locator('[data-screen="title"] [data-action="start"]').tap();
await page.locator('.map-node[data-node="0"]').tap();
await wait(300);
const throwOff = () =>
  ev(() =>
    document.querySelector('[data-touch="throw"]').classList.contains('off'),
  );
const crate = () =>
  ev(() => {
    const s = window.hawari.scene.getScene('alley');
    const c = s.blocks
      .getChildren()
      .find(
        (b) =>
          ['armory', 'used'].includes(b.getData('kind')) && b.getData('crate'),
      );
    return c ? { kind: c.getData('kind'), x: c.x, y: c.y } : null;
  });
async function go(i, power) {
  await ev(
    ([i, power]) => {
      const s = window.hawari.scene.getScene('alley');
      s.lives = 9;
      s.power = 0;
      s.checkpoint = false;
      s.startLevel(i);
      s.remaining = 999;
      s.enemies.clear(true, true);
      s.hurtUntil = s.time.now + 1e8;
      s.blocks
        .getChildren()
        .filter((b) => b.getData('kind') === 'armory')
        .forEach((b) => b.setData('crate', true));
      if (power) s.setPower(power, false);
    },
    [i, power],
  );
  await wait(250);
}
async function bump() {
  const c = await crate();
  await ev((c) => {
    const s = window.hawari.scene.getScene('alley');
    const b = s.hero.body;
    const half = s.hero.y - b.bottom;
    // Stand on the floor four rows below the crate, right under it.
    b.reset(c.x, c.y + 84 - 4 + half);
    s.hero.setVelocity(0, 0);
  }, c);
  await wait(300);
  await page.keyboard.down('Space');
  await wait(450);
  await page.keyboard.up('Space');
  await wait(400);
}
const state = () =>
  ev(() => {
    const s = window.hawari.scene.getScene('alley');
    return { power: s.power, score: s.score, name: s.L.meta.name };
  });
const bosses = [3, 7, 11, 15];
for (const i of bosses) {
  await go(i, 0);
  assert.equal((await crate())?.kind, 'armory', `crate in level ${i + 1}`);
  assert.equal(await throwOff(), true, 'شطة button off before the crate');
  await bump();
  const st = await state();
  assert.equal(st.power, 2, `${st.name}: the crate arms بلبل`);
  assert.equal((await crate()).kind, 'used', `${st.name}: crate opened`);
  assert.equal(await throwOff(), false, `${st.name}: شطة button lights up`);
  // Already armed: a bonus instead.
  await go(i, 2);
  const before = (await state()).score;
  await bump();
  const armed = await state();
  assert.equal(armed.power, 2, 'keeps the chili');
  assert.equal(armed.score - before, 1000, 'bonus when already armed');
  console.log('✔', st.name, 'crate arms and pays a bonus');
}
// Respawn: die after opening it; the crate is back from the checkpoint.
await go(3, 0);
await bump();
await ev(() => {
  const s = window.hawari.scene.getScene('alley');
  s.checkpoint = true;
  s.hurtUntil = 0;
  s.die();
});
await wait(1600);
assert.equal(
  await ev(() =>
    window.hawari.scene
      .getScene('alley')
      .blocks.getChildren()
      .some((b) => b.getData('kind') === 'armory'),
  ),
  true,
  'crate is back after a respawn',
);
assert.equal((await state()).power, 0);
console.log('✔ crate respawns after dying');
assert.deepEqual(errors, []);
console.log('PASS armory-runtime');
await browser.close();
