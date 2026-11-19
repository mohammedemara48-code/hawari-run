import { describe, expect, it } from 'vitest';
import { CATARACT, LEVELS } from '../src/level-data';

describe('the cataract voyage (Aswan felucca level)', () => {
  const c = CATARACT;
  it('is in Aswan, before the crocodile boss', () => {
    const i = LEVELS.findIndex((l) => l.id === 'cataract');
    expect(LEVELS[i].world).toBe(5);
    expect(LEVELS[i + 1].bossKind).toBe('croc');
  });
  it('the boat runs on its own, and every rock and croc is on the river', () => {
    expect(c.gusts.length).toBeGreaterThan(0);
    for (const [at, sec, boost] of c.gusts) {
      expect(sec).toBeGreaterThan(0);
      expect(boost).toBeGreaterThan(0);
      expect(at).toBeGreaterThan(0);
    }
    for (const [col] of [...c.rocks, ...c.crocs, ...c.coins])
      expect(col > c.fromCol + 6 && col < c.toCol - 2).toBe(true);
  });
  it('never blocks both sides of the channel at once', () => {
    const things = [...c.rocks, ...c.crocs];
    for (const [a, la] of things)
      for (const [b, lb] of things)
        if (la !== lb) expect(Math.abs(a - b)).toBeGreaterThanOrEqual(4);
  });
  it('a clean cruise finishes in about a minute', () => {
    const dist = (c.toCol - c.fromCol) * 24 - 88;
    const cruise = 80; // SAIL.cruise — keep in sync with src/sail.ts
    const sec = dist / cruise;
    expect(sec).toBeGreaterThanOrEqual(55);
    expect(sec).toBeLessThanOrEqual(90);
  });
});
