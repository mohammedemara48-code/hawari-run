import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { SHOTS } from './browser-paths.mjs';
const browser = await chromium.launch({ args: ['--no-sandbox'] });
try {
  const page = await browser.newPage({
      viewport: { width: 1280, height: 850 },
    }),
    errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(process.env.GAME_URL || 'http://localhost:5173');
  await page.waitForFunction(
    () => window.hawari?.scene.getScene('alley')?.hero,
  );
  const tap = async () => {
    await page.keyboard.down('ArrowDown');
    await page.waitForTimeout(65);
    await page.keyboard.up('ArrowDown');
    await page.waitForTimeout(65);
  };
  const place = async (col, offset = 12) => {
    await page.evaluate(
      ({ col, offset }) => {
        const s = window.hawari.scene.getScene('alley');
        s.hero.body.reset(col * 24 + offset, 325);
        s.hero.setVelocity(0, 0);
        s.hurtUntil = s.time.now + 1e8;
      },
      { col, offset },
    );
    await page.waitForTimeout(70);
  };
  const solve = async () => {
    const p = await page.evaluate(
      () => window.hawari.scene.getScene('alley').L.meta.landmark,
    );
    for (let i = 0; i < p.stations.length; i++) {
      await place(p.stations[i], p.kind === 'stealth' ? 30 : 12);
      const current = await page.evaluate(
        (i) => window.hawari.scene.getScene('alley').landmark.values[i] ?? 0,
        i,
      );
      const turns =
        p.kind === 'light'
          ? (p.target[i] - current + 4) % 4
          : p.kind === 'balance'
            ? (p.target[0] - current + 6) % 6
            : 1;
      for (let j = 0; j < turns; j++) await tap();
    }
    await page.waitForFunction(
      () => window.hawari.scene.getScene('alley').landmark.solved,
      null,
      { timeout: 2500 },
    );
  };
  for (let index = 32; index < 44; index++) {
    await page.evaluate((index) => {
      const s = window.hawari.scene.getScene('alley');
      s.startLevel(index);
      s.hurtUntil = s.time.now + 1e8;
    }, index);
    await page.waitForTimeout(130);
    assert.equal(
      await page.evaluate(
        () => window.hawari.scene.getScene('alley').landmark.solved,
      ),
      false,
    );
    if (index % 4 !== 3) {
      // Unsolved exits are hidden even if a player could jump around the gate.
      assert.equal(
        await page.evaluate(
          () => window.hawari.scene.getScene('alley').exitDoor.visible,
        ),
        false,
      );
    }
    await solve();
    const state = await page.evaluate(() => {
      const s = window.hawari.scene.getScene('alley');
      return {
        id: s.L.meta.id,
        solved: s.landmark.solved,
        disabled: s.landmark.gates.every((g) => !g.body.enable),
        missing: s.children.list.filter((o) => o.texture?.key === '__MISSING')
          .length,
      };
    });
    assert.equal(state.solved, true);
    assert.equal(state.disabled, true);
    assert.equal(state.missing, 0);
    console.log('Puzzle interactions', state);
    if (index % 4 === 3) {
      // Mechanic-level test, not an uninterrupted manual playthrough.
      // Real controls solve each shield cycle; real damage handles invulnerability.
      for (let hit = 0; hit < 6; hit++) {
        const status = await page.evaluate(() => {
          const s = window.hawari.scene.getScene('alley');
          return {
            solved: s.landmark.solved,
            until: s.landmark.vulnerableUntil,
            now: s.time.now,
            hp: s.bossState.hp,
          };
        });
        if (!status.solved) await solve();
        await page.evaluate(() =>
          window.hawari.scene.getScene('alley').bossChili(),
        );
        await page.waitForTimeout(1100);
      }
      const hp = await page.evaluate(
        () => window.hawari.scene.getScene('alley').bossState.hp,
      );
      assert.equal(hp, 0, `boss ${index} defeated through exposed shield`);
      console.log('Boss shield and damage verified', index);
    }
    // Move to the exit and verify ordinary clear handling/save IDs.
    await page.evaluate(() => {
      const s = window.hawari.scene.getScene('alley');
      s.hero.body.reset(s.spec.exit.x, 325);
      s.hero.setVelocity(0, 0);
    });
    await page.waitForFunction(
      () =>
        window.hawari.scene.getScene('alley').mode === 'clear' ||
        window.hawari.scene.getScene('alley').mode === 'win',
      null,
      { timeout: 4000 },
    );
  }
  // Checkpoint restart rebuilds a puzzle rather than retaining stale solved gates.
  await page.evaluate(() => {
    const s = window.hawari.scene.getScene('alley');
    s.startLevel(32);
  });
  await solve();
  await page.evaluate(() => {
    const s = window.hawari.scene.getScene('alley');
    s.checkpoint = true;
    s.loadLevel();
  });
  assert.equal(
    await page.evaluate(
      () => window.hawari.scene.getScene('alley').landmark.solved,
    ),
    false,
  );
  // Actual current map layout, with all worlds unlocked by the test saves.
  await page.evaluate(() =>
    window.hawari.scene.getScene('alley').action('map'),
  );
  await page.screenshot({ path: `${SHOTS}/landmark-map.png`, fullPage: true });
  assert.deepEqual(errors, []);
  console.log(
    'All12landmark puzzles,3boss shields,clear flow and checkpoint reset passed',
  );
} finally {
  await browser.close();
}
