// In-game screenshot of a boss (or the first enemy of a kind) for art review.
// node scripts/art/shot.mjs <levelIndex> <out.png> [boss|<enemyKind>] [old]
import { chromium } from '@playwright/test';
const [lv, out, what = 'boss', old] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 1024, height: 576 } });
await p.addInitScript(() => {
  localStorage.setItem(
    'hawari-progress',
    JSON.stringify({
      unlocked: 99,
      best: {},
      coins: {},
      secrets: {},
      cleared: {},
    }),
  );
  localStorage.setItem(
    'hawari-player',
    JSON.stringify({ name: 'art', guest: true }),
  );
});
await p.goto(
  (process.env.GAME_URL || 'http://localhost:5173/') + (old ? '?oldart' : ''),
);
await p.waitForFunction(() => window.hawari?.scene.getScene('alley')?.hero);
await p.evaluate((lv) => {
  const s = window.hawari.scene.getScene('alley');
  s.lives = 9;
  s.startLevel(+lv);
  s.remaining = 999;
  s.hurtUntil = s.time.now + 1e8;
  s.invincible = s.time.now + 1e8;
}, lv);
await p.waitForTimeout(500);
const place = (x) =>
  p.evaluate((x) => {
    const s = window.hawari.scene.getScene('alley');
    const b = s.hero.body;
    b.reset(x, s.hero.y - 200);
    s.hero.setVelocity(0, 0);
  }, x);
if (what === 'boss') {
  await place(
    await p.evaluate(
      () => window.hawari.scene.getScene('alley').L.boss.x - 170,
    ),
  );
  for (let k = 0; k < 80; k++) {
    if (
      await p.evaluate(
        () => !!window.hawari.scene.getScene('alley').bossState.active,
      )
    )
      break;
    await p.keyboard.down('ArrowRight');
    await p.waitForTimeout(50);
    await p.keyboard.up('ArrowRight');
  }
  await p.waitForTimeout(+(process.env.WAIT || 1800));
} else {
  const x = await p.evaluate((kind) => {
    const s = window.hawari.scene.getScene('alley');
    const e = s.enemies.getChildren().find((e) => e.getData('kind') === kind);
    return e ? e.x : null;
  }, what);
  if (x == null) throw new Error('no ' + what + ' in level ' + lv);
  await place(x - 110);
  await p.waitForTimeout(900);
}
await p.evaluate(() =>
  document
    .querySelectorAll('.toast, .screen, .modal, dialog, [role=dialog]')
    .forEach((t) => (t.style.display = 'none')),
);
console.log(
  await p.evaluate(() => {
    const s = window.hawari.scene.getScene('alley');
    return {
      mode: s.mode,
      boss: s.boss && [
        Math.round(s.boss.x),
        Math.round(s.boss.y),
        s.boss.texture.key,
      ],
      hero: [Math.round(s.hero.x), Math.round(s.hero.y)],
      active: s.bossState?.active,
    };
  }),
);
await p.screenshot({ path: out });
await b.close();
