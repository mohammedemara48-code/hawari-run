import { defineConfig } from 'vite';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
export default defineConfig({
  // Phaser's complete renderer/physics bundle is budgeted at 1.3 MB raw (~333 KB gzip).
  build: { chunkSizeWarningLimit: 1300 },
  plugins: [
    {
      name: 'offline-game',
      closeBundle() {
        const files = [
          '/',
          '/icon.svg',
          '/icon-192.png',
          '/icon-512.png',
          '/manifest.webmanifest',
          '/fonts/changa.ttf',
          '/fonts/noto-sans-arabic.ttf',
          ...readdirSync('dist/assets').map((f) => '/assets/' + f),
        ];
        const sw = readFileSync('dist/sw.js', 'utf8').replace(
          /\/\* PRECACHE \*\/\s*\[[\s\S]*?\]/,
          JSON.stringify(files),
        );
        writeFileSync('dist/sw.js', sw);
      },
    },
  ],
});
