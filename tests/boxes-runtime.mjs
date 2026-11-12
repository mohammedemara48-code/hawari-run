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
assert.deepEqual(errors, []);
await browser.close();
console.log('PASS: every gold box pays out from a real jump');
