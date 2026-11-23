import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { SHOTS } from './browser-paths.mjs';
const b = await chromium.launch({ args: ['--no-sandbox'] });
try {
  for (const admin of [false, true]) {
    const p = await b.newPage({
      viewport: { width: 844, height: 390 },
      isMobile: true,
      hasTouch: true,
    });
    const progress = {
      unlocked: 0,
      best: {},
      coins: {},
      secrets: {},
      cleared: {},
      resume: null,
    };
    await p.addInitScript(() => {
      window.localStorage.setItem('hawari-seen-version', '999');
      // These user-editable values must not elevate a normal server account.
      window.localStorage.setItem(
        'hawari-player',
        JSON.stringify({ name: 'owner-looking-name', admin: true }),
      );
      window.localStorage.setItem('hawari-admin', 'true');
      Element.prototype.requestFullscreen = undefined;
    });
    await p.route('**/api/**', async (r) => {
      const path = new URL(r.request().url()).pathname;
      let data = {};
      if (path === '/api/me' || path === '/api/login')
        data = { name: 'owner-looking-name', progress, admin };
      else if (path === '/api/progress')
        data = { name: 'owner-looking-name', progress, admin };
      await r.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(data),
      });
    });
    await p.goto(process.env.GAME_URL || 'http://127.0.0.1:5191');
    await p.waitForFunction(() => window.hawari?.scene.getScene('alley')?.hero);
    await p.waitForFunction(() =>
      document
        .querySelector('[data-player-name]')
        ?.textContent.includes('owner-looking-name'),
    );
    await p.locator('[data-action="start"]').click();
    const siwa = p.locator('[data-world="7"]');
    await p.screenshot({
      path: `${SHOTS}/admin-${admin ? 'yes' : 'no'}-map.png`,
    });
    assert.equal((await siwa.getAttribute('aria-disabled')) === 'true', !admin);
    if (admin) {
      await siwa.click();
      const salt = p.locator('[data-node="29"]');
      assert.equal(await salt.isDisabled(), false);
      await p.screenshot({ path: `${SHOTS}/admin-unlocked-siwa.png` });
      await salt.click();
      await p.waitForFunction(
        () =>
          window.hawari.scene.getScene('alley').level === 29 &&
          window.hawari.scene.getScene('alley').mode === 'play',
      );
    } else {
      // The game action itself must reject a locked level, not only the button.
      await p.evaluate(() =>
        window.hawari.scene.getScene('alley').action('play-29'),
      );
      assert.equal(
        await p.evaluate(() => window.hawari.scene.getScene('alley').level),
        0,
      );
    }
    const saved = await p.evaluate(() =>
      JSON.parse(window.localStorage.getItem('hawari-progress')),
    );
    assert.equal(
      saved.unlocked,
      0,
      'granting access does not change progression',
    );
    assert.deepEqual(saved.cleared, {});
    await p.close();
    console.log(
      `PASS ${admin ? 'admin accesses Salt Mirage without changing progress' : 'normal cannot unlock by forged local flags or name'}`,
    );
  }
} finally {
  await b.close();
}
