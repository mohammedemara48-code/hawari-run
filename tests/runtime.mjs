import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(process.env.GAME_URL || 'http://localhost:5173/');
await page.waitForFunction(() => window.hawari?.scene.getScene('alley')?.hero);
await page.locator('[data-screen="title"] [data-action="start"]').click();
const setup = (fn) => page.evaluate(fn);
const state = () =>
  page.evaluate(() => {
    const s = window.hawari.scene.getScene('alley');
    return {
      x: s.hero.x,
      y: s.hero.y,
      vy: s.hero.body.velocity.y,
      mode: s.mode,
      power: s.power,
      kills: s.kills,
      lives: s.lives,
      bonus: s.bonus,
      time: s.remaining,
      coins: s.levelCoins,
      level: s.level,
    };
  });
await page.waitForTimeout(200);
// Real post-separation contact: descending onto a cat must count as a stomp.
await setup(() => {
  const s = window.hawari.scene.getScene('alley');
  s.hurtUntil = 0;
  const e = s.enemies.getChildren()[0];
  s.hero.body.reset(e.x, 242);
  s.hero.setVelocity(0, 170);
});
await page.waitForTimeout(230);
assert.equal(
  (await state()).kills,
  1,
  'stomp defeats the cat without losing a life',
);
assert.equal((await state()).lives, 3);
console.log('PASS: enemy stomp');
// Jump into the first arabesque block, then take its sandwich.
await setup(() => {
  const s = window.hawari.scene.getScene('alley');
  s.hero.body.reset(408, 294);
  s.hero.setVelocity(0, 0);
});
await page.waitForTimeout(120);
await page.keyboard.down('Space');
await page.waitForTimeout(230);
await page.keyboard.up('Space');
await page.waitForTimeout(230);
assert.equal(
  await setup(() =>
    window.hawari.scene
      .getScene('alley')
      .solids.getChildren()
      .find((b) => b.x === 408 && b.y < 250)
      ?.getData('kind'),
  ),
  'used',
  'mystery block dispenses only once',
);
assert.equal(
  await setup(() => window.hawari.scene.getScene('alley').items.getLength()),
  1,
);
await setup(() => {
  const s = window.hawari.scene.getScene('alley'),
    i = s.items.getChildren()[0];
  s.hero.body.reset(i.x, i.y);
});
await page.waitForTimeout(60);
assert.equal((await state()).power, 1);
console.log('PASS: block bump and sandwich pickup');
// Powered-up bricks break rather than turning into used blocks.
await setup(() => {
  const s = window.hawari.scene.getScene('alley');
  s.hero.body.reset(384, 294);
  s.hero.setVelocity(0, 0);
});
await page.waitForTimeout(120);
await page.keyboard.down('Space');
await page.waitForTimeout(250);
await page.keyboard.up('Space');
assert.equal(
  await setup(() =>
    window.hawari.scene
      .getScene('alley')
      .solids.getChildren()
      .some((b) => b.x === 384 && b.getData('kind') === 'brick'),
  ),
  false,
);
console.log('PASS: powered brick break');
// A chili projectile should defeat an enemy.
await setup(() => {
  const s = window.hawari.scene.getScene('alley');
  s.enemies.clear(true, true);
  s.hero.body.reset(170, 294);
  s.setPower(2, false);
  s.facing = 1;
  s.enemy(250, 'bug');
});
await page.waitForTimeout(100);
const before = (await state()).kills;
await page.keyboard.press('x', { delay: 90 });
await page.waitForTimeout(250);
assert.ok((await state()).kills > before);
console.log('PASS: chili shot');
// Pause must freeze both physics and the visible timer.
await page.keyboard.press('Escape');
const paused = (await state()).time;
await page.waitForTimeout(200);
assert.equal((await state()).time, paused);
await page.keyboard.press('Escape');
assert.equal((await state()).mode, 'play');
console.log('PASS: pause/resume');
// Checkpoint death restores a safe spawn.
await setup(() => {
  const s = window.hawari.scene.getScene('alley');
  s.hero.body.reset(s.spec.checkpoint + 30, 280);
});
await page.waitForTimeout(80);
assert.equal(
  await setup(() => window.hawari.scene.getScene('alley').checkpoint),
  true,
);
await setup(() => {
  const s = window.hawari.scene.getScene('alley');
  s.hero.body.reset(3000, 430);
});
await page.waitForTimeout(1300);
assert.equal((await state()).mode, 'play');
assert.ok((await state()).x > 2400);
assert.equal((await state()).lives, 2);
console.log('PASS: death and checkpoint respawn');
// Both end-level transitions and explicit time tally.
await setup(() => {
  const s = window.hawari.scene.getScene('alley');
  s.hero.body.reset(s.spec.exit, 280);
});
await page.waitForTimeout(80);
assert.equal((await state()).mode, 'clear');
assert.ok(await page.locator('#clear-details').textContent());
await page.locator('[data-action="next"]').click();
await page.waitForTimeout(150);
assert.equal((await state()).level, 1);
assert.equal((await state()).mode, 'play');
await setup(() => {
  const s = window.hawari.scene.getScene('alley');
  s.hero.body.reset(720, 250);
  s.hurtUntil = 0;
});
await page.waitForTimeout(160);
await page.screenshot({
  path: '/workspace/hawari-shots/03-market.png',
  fullPage: true,
});
await setup(() => {
  const s = window.hawari.scene.getScene('alley');
  s.hero.body.reset(s.spec.exit, 280);
});
await page.waitForTimeout(80);
assert.equal((await state()).mode, 'win');
assert.ok(await page.locator('#win-details').textContent());
console.log('PASS: both world completions and final result');
// PNG install icons are derived from the original hero sprite, not a third-party image.
for (const size of [192, 512]) {
  const encoded = await page.evaluate((size) => {
    const s = window.hawari.scene.getScene('alley'),
      c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#19333b';
    ctx.fillRect(0, 0, size, size);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      s.textures.get('hero0').getSourceImage(),
      size * 0.2,
      size * 0.07,
      size * 0.6,
      size * 0.83,
    );
    return c.toDataURL().split(',')[1];
  }, size);
  await writeFile(`public/icon-${size}.png`, Buffer.from(encoded, 'base64'));
}
// Full game-over and restart flow.
await page.locator('[data-screen="win"] button').click();
await setup(() => {
  const s = window.hawari.scene.getScene('alley');
  s.lives = 1;
  s.die();
});
await page.waitForTimeout(1300);
assert.equal((await state()).mode, 'over');
await page.locator('[data-screen="over"] button').click();
assert.equal((await state()).lives, 3);
console.log('PASS: game over and restart');
assert.deepEqual(errors, [], 'no browser exceptions');
await browser.close();
