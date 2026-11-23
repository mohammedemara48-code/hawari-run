// Own the server and always close it, including failed browser assertions.
import { spawn } from 'node:child_process';
const production = process.env.BROWSER_MODE !== 'account';
const port = 5179;
const server = spawn(
  process.execPath,
  [
    'node_modules/vite/bin/vite.js',
    production ? 'preview' : '--host',
    ...(production ? ['--host'] : []),
    '127.0.0.1',
    '--port',
    String(port),
  ],
  { stdio: 'inherit' },
);
const url = `http://127.0.0.1:${port}`;
const run = (file, extra = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [file], {
      stdio: 'inherit',
      env: { ...process.env, GAME_URL: url, ...extra },
    });
    child.on('error', reject);
    child.on('exit', (code) =>
      code === 0 ? resolve() : reject(new Error(`${file}: exit ${code}`)),
    );
  });
try {
  let ready = false;
  for (let n = 0; n < 100; n++) {
    try {
      if ((await fetch(url)).ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  if (!ready) throw new Error('Vite did not start');
  const tests = production
    ? [
        'smoke',
        'hero-runtime',
        'texture-runtime',
        'worlds-smoke',
        'world-art-runtime',
        'backdrop-runtime',
        'landmark-runtime',
        'armory-runtime',
        'alex4-playable',
      ]
    : ['account-runtime'];
  const chosen = process.env.BROWSER_TESTS
    ? process.env.BROWSER_TESTS.split(',')
    : tests;
  for (const name of chosen) {
    if (
      name === 'world-art-runtime' &&
      !process.env.LEVEL_FROM &&
      !process.env.LEVEL_TO
    ) {
      for (const [from, to] of [
        [0, 16],
        [16, 32],
        [32, 44],
      ])
        await run(`tests/${name}.mjs`, {
          LEVEL_FROM: String(from),
          LEVEL_TO: String(to),
        });
    } else await run(`tests/${name}.mjs`);
  }
  if (production && process.env.SKIP_PWA !== '1') await run('tests/pwa.mjs');
} finally {
  server.kill('SIGTERM');
}
