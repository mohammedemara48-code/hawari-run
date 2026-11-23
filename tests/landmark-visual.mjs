import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';
const browser = await chromium.launch({
  args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'],
});
try {
  const p = await browser.newPage({ viewport: { width: 1280, height: 850 } }),
    errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  await p.goto(process.env.GAME_URL || 'http://localhost:5173');
  await p.waitForFunction(() => window.hawari?.scene.getScene('alley')?.hero);
  mkdirSync('/downloads/hawari-readable', { recursive: true });
  for (const index of [0, 4, 8, 12, 16, 20, 25, 28, 32, 36, 40]) {
    await p.evaluate((index) => {
      const s = window.hawari.scene.getScene('alley');
      s.startLevel(index);
      if (index >= 32) {
        s.hero.body.reset(s.L.meta.landmark.stations[0] * 24 - 40, 325);
        s.hero.setVelocity(0, 0);
      }
      s.hurtUntil = s.time.now - 1;
    }, index);
    await p.waitForFunction(
      (index) =>
        window.hawari.scene
          .getScene('alley')
          .textures.exists(`backdrop-${index}`),
      index,
    );
    await p.waitForTimeout(250);
    await p.screenshot({
      path: `/downloads/hawari-readable/after-${index}.png`,
      fullPage: true,
    });
    assert.equal(
      await p.evaluate(
        () =>
          window.hawari.scene
            .getScene('alley')
            .children.getByName('backdrop-readability').visible,
      ),
      true,
    );
  }
  // Verify generated audio really schedules and has nonzero waveform output.
  await p.evaluate(() => window.hawariAudio.start());
  for (const index of [
    32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 52, 53, 54,
  ]) {
    const result = await p.evaluate(async (index) => {
      const s = window.hawari.scene.getScene('alley'),
        audio = window.hawariAudio;
      if (index < 44) s.startLevel(index);
      else audio.setTrack(index);
      audio.start();
      await audio.ctx.resume();
      const analyser = audio.ctx.createAnalyser();
      analyser.fftSize = 2048;
      audio.master.connect(analyser);
      await new Promise((r) => setTimeout(r, 650));
      const samples = new Float32Array(analyser.fftSize);
      analyser.getFloatTimeDomainData(samples);
      audio.master.disconnect(analyser);
      return {
        ...audio.state(),
        rms: Math.sqrt(
          samples.reduce((sum, v) => sum + v * v, 0) / samples.length,
        ),
      };
    }, index);
    assert.equal(result.track, index < 44 ? index + 8 : index);
    assert.ok(result.rms > 0.00001);
    assert.equal(result.errors, 0);
    console.log('Audio synthesis', index, result);
  }
  // Readable map on desktop and a touch-sized viewport.
  await p.evaluate(() => window.hawari.scene.getScene('alley').action('map'));
  await p.screenshot({
    path: '/downloads/hawari-readable/map-desktop.png',
    fullPage: true,
  });
  await p.setViewportSize({ width: 850, height: 480 });
  await p.screenshot({
    path: '/downloads/hawari-readable/map-mobile.png',
    fullPage: true,
  });
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
