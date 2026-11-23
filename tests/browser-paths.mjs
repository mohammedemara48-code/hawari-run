import { mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
export const SHOTS = resolve(
  process.env.SHOTS_DIR || 'test-results/screenshots',
);
mkdirSync(SHOTS, { recursive: true });
export const shotPath = (name) => join(SHOTS, name);
