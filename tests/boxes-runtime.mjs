// Real-input check: jump into every gold box in both levels, confirm it pays out.
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(process.env.GAME_URL || 'http://localhost:5173/');
await page.waitForFunction(() => window.hawari?.scene.getScene('alley')?.hero);
await page.locator('[data-screen="title"] [data-action="start"]').click();
const ev = (fn, arg) => page.evaluate(fn, arg);
const boxesOf = () =>
  ev(() =>
    window.hawari.scene
      .getScene('alley')
      .solids.getChildren()
      .filter((b) => b.getData('kind') === 'box')
      .map((b) => ({ x: b.x, y: b.y, content: b.getData('content') })),
  );
let shot = false;
for (const level of [0, 1]) {
  await ev((level) => {
    const s = window.hawari.scene.getScene('alley');
    s.level = level;
    s.power = 0;
    s.loadLevel();
    s.remaining = 999;
  }, level);
  const boxes = await boxesOf();
  assert.equal(boxes.length, 8, `level ${level} has 8 gold boxes`);
  for (const [n, box] of boxes.entries()) {
    // Vary where the head lands (centred / leaning toward a brick) and the form.
    const offset = [0, 8, -8][n % 3],
      power = box.content === 'coin' ? n % 2 : 0;
    await ev(
      ([x, power]) => {
        const s = window.hawari.scene.getScene('alley');
        s.enemies.clear(true, true);
        s.items.clear(true, true);
        s.setPower(power, false);
        s.hero.body.reset(x, 312 - s.hero.height / 2);
        s.hero.setVelocity(0, 0);
      },
      [box.x + offset, power],
    );
    await page.waitForTimeout(150);
    const before = await ev(
      () => window.hawari.scene.getScene('alley').levelCoins,
    );
    await page.keyboard.down('Space');
    await page.waitForTimeout(260);
    await page.keyboard.up('Space');
    await page.waitForTimeout(150);
    const kind = await ev(
      (x) =>
        window.hawari.scene
          .getScene('alley')
          .solids.getChildren()
          .find((b) => b.x === x && b.y < 250)
          ?.getData('kind'),
      box.x,
    );
    assert.equal(
      kind,
      'used',
      `L${level + 1} box ${box.x} was hit by a real jump`,
    );
    if (box.content === 'coin') {
      const after = await ev(
        () => window.hawari.scene.getScene('alley').levelCoins,
      );
      assert.equal(after, before + 1, `L${level + 1} box ${box.x} pays a coin`);
    } else {
      // The power-up must emerge, slide off the row and land on the street.
      let item;
      for (let t = 0; t < 60; t++) {
        await page.waitForTimeout(100);
        item = await ev(() => {
          const i = window.hawari.scene
            .getScene('alley')
            .items.getChildren()[0];
          return (
            i && {
              x: i.x,
              y: i.y,
              kind: i.getData('kind'),
              settled: !!i.getData('settled'),
            }
          );
        });
        if (!item || item.settled) break;
      }
      assert.ok(item, `L${level + 1} box ${box.x} spawned ${box.content}`);
      assert.equal(item.kind, box.content);
      assert.ok(
        item.y > 250 && item.y < 312,
        `${box.content} reached the street (y=${item.y})`,
      );
      if (!shot && level === 0 && box.content === 'food') {
        await ev(() => {
          const s = window.hawari.scene.getScene('alley');
          s.hero.body.reset(s.hero.x - 70, 312 - s.hero.height / 2);
        });
        await page.waitForTimeout(120);
        await page.screenshot({
          path: '/workspace/hawari-shots/07-boxes-fixed.png',
        });
        shot = true;
      }
      // Walk into it with real input to pick it up.
      const key =
        item.x > (await ev(() => window.hawari.scene.getScene('alley').hero.x))
          ? 'ArrowRight'
          : 'ArrowLeft';
      await page.keyboard.down(key);
      let taken = false;
      for (let t = 0; t < 30 && !taken; t++) {
        await page.waitForTimeout(100);
        taken = await ev(
          () => window.hawari.scene.getScene('alley').items.getLength() === 0,
        );
      }
      await page.keyboard.up(key);
      assert.ok(taken, `${box.content} can be collected`);
    }
    console.log(
      `PASS: L${level + 1} box x=${box.x} → ${box.content} (offset ${offset}, ${power ? 'powered' : 'small'})`,
    );
  }
}
// Game feel: variable jump height, corner correction and bump-kills.
await ev(() => {
  const s = window.hawari.scene.getScene('alley');
  s.level = 0;
  s.power = 0;
  s.loadLevel();
  s.remaining = 999;
  s.enemies.clear(true, true);
});
const jumpPeak = async (x, hold) => {
  await ev((x) => {
    const s = window.hawari.scene.getScene('alley');
    s.hero.body.reset(x, 312 - s.hero.height / 2);
    s.hero.setVelocity(0, 0);
    s.peak = 999;
  }, x);
  await page.waitForTimeout(150);
  await page.keyboard.down('Space');
  const end = Date.now() + 700;
  let peak = 999;
  let released = false;
  while (Date.now() < end) {
    if (!released && Date.now() > end - 700 + hold) {
      await page.keyboard.up('Space');
      released = true;
    }
    peak = Math.min(
      peak,
      await ev(() => window.hawari.scene.getScene('alley').hero.body.top),
    );
    await page.waitForTimeout(16);
  }
  if (!released) await page.keyboard.up('Space');
  return peak;
};
const tap = await jumpPeak(200, 60),
  hold = await jumpPeak(200, 600);
console.log(`tap peak ${tap.toFixed(0)}, hold peak ${hold.toFixed(0)}`);
assert.ok(tap - hold > 25, 'releasing jump early gives a shorter hop');
// Head clips the outer 5px of the row's left brick (372..396): slide past it.
const clip = await jumpPeak(372 - 12 + 5, 600);
assert.ok(
  clip < 200,
  `corner correction lets the jump continue (peak ${clip})`,
);
assert.equal(
  await ev(() =>
    window.hawari.scene
      .getScene('alley')
      .solids.getChildren()
      .some((b) => b.x === 384 && b.y === 216),
  ),
  true,
);
console.log('PASS: variable jump height and corner correction');
// A cat standing on a brick is knocked out when the brick is bumped.
await ev(() => {
  const s = window.hawari.scene.getScene('alley');
  s.loadLevel();
  s.enemies.clear(true, true);
  const e = s.enemy(816 + 24, 'cat');
  e.body.reset(816 + 24, 216 - 12 - 11 - 1);
  e.setVelocityX(0);
  s.hero.body.reset(816 + 24, 312 - s.hero.height / 2);
});
await page.waitForTimeout(200);
await page.keyboard.down('Space');
await page.waitForTimeout(260);
await page.keyboard.up('Space');
await page.waitForTimeout(200);
assert.equal(await ev(() => window.hawari.scene.getScene('alley').kills), 1);
console.log('PASS: bumping a block knocks out the enemy on it');
assert.deepEqual(errors, []);
await browser.close();
console.log('PASS: every gold box pays out from a real jump');
