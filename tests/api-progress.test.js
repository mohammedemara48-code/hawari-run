import { describe, expect, it } from 'vitest';
import { storeProgress } from '../api/_progress.js';

function database(progress, concurrent) {
  let current = progress,
    writes = 0;
  const sql = async (strings, ...values) => {
    if (strings.join('').startsWith('SELECT'))
      return [{ progress: JSON.parse(JSON.stringify(current)) }];
    writes++;
    if (concurrent && writes === 1) current = concurrent;
    const [merged, , previous] = values;
    if (JSON.stringify(current) !== previous) return [];
    current = JSON.parse(merged);
    return [{ progress: current }];
  };
  return { sql, value: () => current, writes: () => writes };
}
describe('server save compare-and-swap', () => {
  it('retries a concurrent update and preserves both devices achievements', async () => {
    const db = database(
      { unlocked: 0 },
      { unlocked: 3, best: { market: 900 }, resume: null, updatedAt: 50 },
    );
    const saved = await storeProgress(db.sql, 'player', {
      unlocked: 1,
      best: { lanterns: 100 },
      resume: { levelIndex: 0, at: 10 },
      updatedAt: 10,
    });
    expect(db.writes()).toBe(2);
    expect(saved).toMatchObject({
      unlocked: 3,
      best: { market: 900, lanterns: 100 },
      resume: null,
    });
    expect(db.value()).toEqual(saved);
  });
  it('returns normalized data without rewriting when no incoming save exists', async () => {
    const db = database({ unlocked: 2 });
    expect((await storeProgress(db.sql, 'player', null)).unlocked).toBe(2);
    expect(db.writes()).toBe(0);
  });
  it('fails safely rather than overwriting when every attempt races', async () => {
    const sql = async (strings) =>
      strings.join('').startsWith('SELECT')
        ? [{ progress: { unlocked: 0 } }]
        : [];
    await expect(storeProgress(sql, 'player', { unlocked: 2 })).rejects.toThrow(
      'contention',
    );
  });
});
