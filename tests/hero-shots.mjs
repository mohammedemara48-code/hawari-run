import { chromium } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
const b = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const p = await b.newPage({
  viewport: { width: 1440, height: 1100 },
  deviceScaleFactor: 1,
});
await p.goto(process.env.GAME_URL || 'http://localhost:5173');
await p.waitForFunction(() =>
  window.hawari?.scene.getScene('alley')?.textures.exists('hero-big-throw0'),
);
const png = await p.evaluate(() => {
  const scene = window.hawari.scene.getScene('alley');
  const poses = [
    'idle0',
    'idle1',
    'idle2',
    'idle3',
    'run0',
    'run1',
    'run2',
    'run3',
    'run4',
    'run5',
    'run6',
    'run7',
    'skid',
    'rise',
    'fall',
    'crouch',
    'hurt',
    'dead',
    'grow0',
    'grow1',
    'grow2',
    'throw0',
    'throw1',
  ];
  const c = document.createElement('canvas');
  c.width = 1536;
  c.height = 1680;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.fillStyle = '#d9d5c8';
  g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = '#283947';
  g.font = 'bold 28px sans-serif';
  g.fillText('BOLBOL / ORIGINAL CHARACTER ANIMATION STUDY / 4x PIXELS', 40, 43);
  for (let form = 0; form < 2; form++) {
    const top = 90 + form * 750;
    g.font = 'bold 19px sans-serif';
    g.fillText(
      form ? 'POWERED / 32 x 48' : 'SMALL / 32 x 40 visible silhouette',
      40,
      top - 18,
    );
    poses.forEach((pose, i) => {
      const x = 28 + (i % 8) * 188,
        y = top + Math.floor(i / 8) * 242;
      g.fillStyle = (i + Math.floor(i / 8)) % 2 ? '#cccfc5' : '#e2e1d5';
      g.fillRect(x, y, 176, 230);
      g.drawImage(
        scene.textures
          .get(`hero-${form ? 'big' : 'small'}-${pose}`)
          .getSourceImage(),
        x + 24,
        y + 8,
        128,
        192,
      );
      g.fillStyle = '#374b55';
      g.font = '16px monospace';
      g.fillText(pose, x + 24, y + 218);
    });
  }
  return c.toDataURL().split(',')[1];
});
await writeFile(
  '/workspace/hawari-shots/04-hero-sheet.png',
  Buffer.from(png, 'base64'),
);
await p.locator('[data-screen="title"] button').click();
await p.evaluate(() => {
  const s = window.hawari.scene.getScene('alley');
  s.hero.body.reset(350, 288);
  s.setPower(2, false);
  s.hurtUntil = 0;
  s.invincible = 0;
  s.hero.setVelocity(0, 0);
});
await p.waitForTimeout(800);
await p
  .locator('#game-wrap')
  .screenshot({ path: '/workspace/hawari-shots/05-gameplay-new.png' });
const crop = await p.evaluate(
  () =>
    new Promise((resolve) => {
      const game = window.hawari,
        s = game.scene.getScene('alley'),
        cam = s.cameras.main,
        x = Math.round(s.hero.x - cam.scrollX - 40),
        y = Math.round(s.hero.y - 64);
      game.renderer.snapshotArea(x, y, 80, 96, (image) => {
        const c = document.createElement('canvas');
        c.width = 320;
        c.height = 384;
        const g = c.getContext('2d');
        g.imageSmoothingEnabled = false;
        g.drawImage(image, 0, 0, 320, 384);
        resolve(c.toDataURL().split(',')[1]);
      });
    }),
);
await writeFile(
  '/workspace/hawari-shots/06-hero-closeup.png',
  Buffer.from(crop, 'base64'),
);
await b.close();
