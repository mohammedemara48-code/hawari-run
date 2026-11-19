import { describe, expect, it } from 'vitest';
import { CATARACT, LEVELS } from '../src/level-data';

describe('the cataract voyage (Aswan felucca level)', () => {
  const c = CATARACT;
  it('is in Aswan, before the crocodile boss', () => {
    const i = LEVELS.findIndex((l) => l.id === 'cataract');
    expect(LEVELS[i].world).toBe(5);
    expect(LEVELS[i + 1].bossKind).toBe('croc');
  });
  it('the wind turns both ways, and every rock and croc is on the river', () => {
    expect(new Set(c.winds.map((w) => w[0]))).toEqual(new Set([1, -1]));
    for (const [col] of [...c.rocks, ...c.crocs, ...c.coins])
      expect(col > c.fromCol + 6 && col < c.toCol - 2).toBe(true);
  });
  it('never blocks both sides of the channel at once', () => {
    const things = [...c.rocks, ...c.crocs];
    for (const [a, la] of things)
      for (const [b, lb] of things)
        if (la !== lb) expect(Math.abs(a - b)).toBeGreaterThanOrEqual(4);
  });
});
