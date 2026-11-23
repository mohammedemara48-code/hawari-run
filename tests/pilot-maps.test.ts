import { describe, it, expect } from 'vitest';
// @ts-expect-error Node runtime types are not part of the game's DOM config.
import { createHash } from 'node:crypto';
import { LEVELS } from '../src/level-data';
import baseline from './fixtures/pilot-baseline.json';
import { parseLevel } from '../src/level-parse';
describe('three-level pilot scope and restoration layout', () => {
  it('changes only levels1,29,33, keeping44stable IDs and tracks', () => {
    expect(LEVELS).toHaveLength(44);
    LEVELS.forEach((l, i) => {
      expect(l.id).toBe(baseline[i].id);
      expect(l.track).toBe(baseline[i].track);
      if (![0, 28, 32].includes(i))
        expect(
          createHash('sha256').update(JSON.stringify(l)).digest('hex'),
        ).toBe(baseline[i].hash);
    });
  });
  for (const [i, width] of [
    [0, 300],
    [28, 380],
    [32, 340],
  ])
    it(`level${i + 1} has one safe middle checkpoint`, () => {
      const l = parseLevel(i);
      expect(l.cols).toBe(width);
      const cp = l.checkpoint!;
      expect(cp).toBeTruthy();
      const ratio = (cp.col - l.start.col) / (l.exit.col - l.start.col);
      expect(ratio).toBeGreaterThan(0.45);
      expect(ratio).toBeLessThan(0.6);
      expect(l.at(cp.col, cp.row + 1)).toBe('#');
      expect(LEVELS[i].rows.join('').split('c')).toHaveLength(2);
    });
  it('keeps the last mirror beyond the checkpoint and all controls on safe floor', () => {
    const l = parseLevel(32),
      p = l.meta.landmark!;
    expect(p.stations).toEqual([56, 158, 270]);
    for (const col of p.stations) expect(l.at(col, 15)).toBe('#');
    expect(p.stations[2]).toBeGreaterThan(l.checkpoint!.col);
  });
});
