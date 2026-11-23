import { spawn } from 'node:child_process';
const server = spawn(
  process.execPath,
  ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1'],
  { stdio: 'inherit' },
);
try {
  for (let i = 0; i < 80; i++) {
    try {
      await fetch('http://localhost:5173');
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  for (const name of process.argv.slice(2))
    await new Promise((resolve, reject) => {
      const p = spawn(process.execPath, [name], { stdio: 'inherit' });
      p.on('exit', (c) =>
        c === 0 ? resolve() : reject(Error(`${name}:${c}`)),
      );
      p.on('error', reject);
    });
} finally {
  server.kill();
}
