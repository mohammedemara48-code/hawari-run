import { defineConfig } from 'vite';
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { APP_VERSION, CHANGELOG } from './src/changelog.ts';
// Identifies this deploy; /version.json carries the same id so a running game
// can tell that a newer build is live.
const commit = (() => {
  if (process.env.VERCEL_GIT_COMMIT_SHA)
    return process.env.VERCEL_GIT_COMMIT_SHA;
  try {
    return execSync('git rev-parse HEAD', {
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim();
  } catch {
    return 'local';
  }
})();
const BUILD =
  process.env.HAWARI_BUILD || `${APP_VERSION}-${commit.slice(0, 12)}`;
export default defineConfig({
  define: { __BUILD__: JSON.stringify(BUILD) },
  // Phaser's complete renderer/physics bundle is plus the game budgeted at 1.4 MB raw (~370 KB gzip).
  build: { chunkSizeWarningLimit: 1600 },
  plugins: [
    {
      name: 'offline-game',
      closeBundle() {
        const files = [
          '/index.html',
          '/icon.svg',
          '/icon-192.png',
          '/icon-512.png',
          '/icon-maskable-192.png',
          '/icon-maskable-512.png',
          '/apple-touch-icon.png',
          '/manifest.webmanifest',
          '/fonts/changa.ttf',
          '/fonts/noto-sans-arabic.ttf',
          ...readdirSync('dist/bg').map((f) => '/bg/' + f),
          ...readdirSync('dist/sprites').map((f) => '/sprites/' + f),
          ...readdirSync('dist/assets').map((f) => '/assets/' + f),
        ];
        // The cache version is a hash of every precached file's content, so
        // any change to the build produces a new worker and a new cache.
        const hash = createHash('sha256').update(readFileSync('dist/sw.js'));
        for (const f of files) hash.update(f).update(readFileSync('dist' + f));
        const version = hash.digest('hex').slice(0, 12);
        const sw = readFileSync('dist/sw.js', 'utf8')
          .replace(/\/\* PRECACHE \*\/\s*\[[\s\S]*?\]/, JSON.stringify(files))
          .replace(/\/\* VERSION \*\/\s*'[^']*'/, JSON.stringify(version));
        if (!sw.includes(version))
          throw new Error('sw.js version not injected');
        writeFileSync('dist/sw.js', sw);
        writeFileSync(
          'dist/version.json',
          JSON.stringify({
            build: BUILD,
            version: APP_VERSION,
            changelog: CHANGELOG.slice(0, 10),
          }),
        );
      },
    },
  ],
});
