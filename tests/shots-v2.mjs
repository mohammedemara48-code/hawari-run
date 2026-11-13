// Screenshots for the v2 Cairo world: title, level 4, landscape-phone
// fullscreen play, and "after" shots to compare with 11-before-level1/2.png.
import { chromium } from '@playwright/test';
const URL = process.env.GAME_URL || 'http://localhost:5173/';
const OUT = '/workspace/hawari-shots/';
const b = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const errors = [];
const boot = async (page) => {
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(URL);
  await page.waitForFunction(
    () => window.hawari?.scene.getScene('alley')?.hero,
  );
  await page.waitForTimeout(500);
};
const play = (page, level, x, y) =>
  page.evaluate(
    ([level, x, y]) => {
      const s = window.hawari.scene.getScene('alley');
      s.lives = 3;
      s.startLevel(level);
      s.hurtUntil = s.time.now + 1e8;
      s.remaining = 300;
      s.hero.body.reset(x, y ?? s.spec.start.y - 40);
    },
    [level, x, y],
  );
const desk = await b.newPage({ viewport: { width: 1280, height: 720 } });
await boot(desk);
await desk.screenshot({ path: OUT + '11-title.png' });
await play(desk, 0, 300);
await desk.waitForTimeout(1500);
await desk.screenshot({ path: OUT + '11-after-level1.png' });
await play(desk, 1, 300);
await desk.waitForTimeout(1500);
await desk.screenshot({ path: OUT + '11-after-level2.png' });
await play(desk, 3, 1500);
await desk.waitForTimeout(1500);
await desk.screenshot({ path: OUT + '11-level4.png' });
// Landscape phone, the way an installed app plays: canvas fills the screen.
const phone = await b.newPage({
  viewport: { width: 844, height: 390 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 2,
});
await boot(phone);
await phone.locator('[data-screen="title"] [data-action="start"]').tap();
await phone.waitForTimeout(400);
await phone.screenshot({ path: OUT + '11-phone-map.png' });
await phone.locator('.map-node[data-node="0"]').tap();
await play(phone, 1, 600);
await phone.waitForTimeout(1500);
const fill = await phone.evaluate(() => {
  const r = document.querySelector('#game canvas').getBoundingClientRect();
  return {
    w: Math.round(r.width),
    h: Math.round(r.height),
    view: window.hawari.scale.gameSize.width,
  };
});
console.log('phone canvas', fill);
await phone.screenshot({ path: OUT + '11-phone-landscape.png' });
await play(phone, 2, 200, 1300);
await phone.waitForTimeout(1500);
await phone.screenshot({ path: OUT + '11-phone-rooftops.png' });
console.log('errors', errors);
await b.close();
if (errors.length) process.exit(1);
