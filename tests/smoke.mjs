import { chromium } from '@playwright/test';
const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox'],
});
const page = await browser.newPage({
  viewport: { width: 1440, height: 1100 },
  deviceScaleFactor: 1,
});
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(process.env.GAME_URL || 'http://localhost:5173/');
await page.waitForFunction(() => window.hawari?.scene.getScene('alley')?.hero);
await page.evaluate(() => document.fonts.ready);
await page.screenshot({
  path: '/workspace/hawari-shots/01-title.png',
  fullPage: true,
});
await page.locator('[data-screen="title"] [data-action="start"]').click();
await page.waitForTimeout(500);
await page.keyboard.down('ArrowRight');
await page.waitForTimeout(1400);
await page.keyboard.up('ArrowRight');
console.log(
  'State:',
  await page.evaluate(() => {
    const s = window.hawari.scene.getScene('alley');
    return { x: s.hero.x, y: s.hero.y, mode: s.mode, coins: s.coinCount };
  }),
);
await page.screenshot({
  path: '/workspace/hawari-shots/02-alley.png',
  fullPage: true,
});
console.log('Errors:', errors);
await browser.close();
if (errors.length) process.exit(1);
