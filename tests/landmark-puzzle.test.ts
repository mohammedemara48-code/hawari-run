import { describe, expect, it } from 'vitest';
import { lightAligned, seesHero, balanceY } from '../src/landmark-puzzle';
import { LANDMARK_LEVELS } from '../src/landmark-data';
describe('landmark puzzle rules', () => {
  it('requires every reflector, including number and orientation', () => {
    expect(lightAligned([1, 3, 2], [1, 3, 2])).toBe(true);
    expect(lightAligned([1, 3], [1, 3, 2])).toBe(false);
    expect(lightAligned([1, 2, 2], [1, 3, 2])).toBe(false);
  });
  it('sees only inside the cone, within range, with no cover', () => {
    const guard = { x: 0, y: 0, angle: 0, range: 200 };
    expect(seesHero(guard, { x: 100, y: 0 }, [])).toBe(true);
    expect(seesHero(guard, { x: 210, y: 0 }, [])).toBe(false);
    expect(seesHero(guard, { x: -10, y: 0 }, [])).toBe(false);
    expect(seesHero(guard, { x: 50, y: 80 }, [])).toBe(false);
    expect(
      seesHero(guard, { x: 100, y: 0 }, [{ x: 40, y: -20, w: 25, h: 40 }]),
    ).toBe(false);
    expect(
      seesHero(guard, { x: 100, y: 0 }, [{ x: 40, y: 30, w: 25, h: 40 }]),
    ).toBe(true);
  });
  it('raises one pan as the other drops by the exact same distance', () => {
    const a = balanceY(1, 2),
      b = balanceY(2, 2),
      c = balanceY(3, 2);
    expect(a.left - b.left).toBe(20);
    expect(a.right - b.right).toBe(-20);
    expect(c.left + c.right).toBe(a.left + a.right);
  });
  it('authors all controls in reachable map bounds and boss controls inside lock', () => {
    for (const level of LANDMARK_LEVELS) {
      const p = level.landmark!,
        width = level.rows[0].length;
      expect(p.gate).toBeLessThan(width);
      for (const station of p.stations) {
        expect(station).toBeGreaterThan(3);
        expect(station).toBeLessThan(width - 3);
        if (level.boss) expect(station).toBeGreaterThan(width - 12 - 17);
      }
      if (p.kind === 'light') expect(p.target).toHaveLength(p.stations.length);
    }
  });
});
