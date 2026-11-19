// node scripts/art/run.mjs croc  → bakes scripts/art/jobs/croc.mjs into /workspace/art/new
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
for (const name of process.argv.slice(2)) {
  const job = (await import(`./jobs/${name}.mjs`)).default;
  const tmp = `/tmp/art-job-${name}.json`;
  fs.writeFileSync(tmp, JSON.stringify(job));
  execFileSync('node', ['scripts/art/pose.mjs', tmp, '/workspace/art/new'], {
    stdio: 'inherit',
  });
}
