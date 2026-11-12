import { defineConfig } from 'vite';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
export default defineConfig({
  // Phaser's complete renderer/physics bundle is budgeted at 1.3 MB raw (~333 KB gzip).
  build: { chunkSizeWarningLimit: 1300 },
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
      },
    },
  ],
});
