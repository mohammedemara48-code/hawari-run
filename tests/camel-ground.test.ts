import { describe, it, expect } from 'vitest';
import { camelGroundY } from '../src/camel-ground';
import { parseLevel } from '../src/level-parse';
describe('grounded Siwa camels', () => {
  it('has continuous visible sand under each full camel crossing', () => {
    const l = parseLevel(28);
    for (const d of l.donkeys)
      for (let c = d.a.col; c <= d.endCol; c++) {
        const supports = [12, 13, 14].some((r) => '#=س'.includes(l.at(c, r)));
        expect(supports, `ground column ${c}`).toBe(true);
      }
  });
  it('follows the dunes smoothly, with feet on their ground profile', () => {
    const l = parseLevel(28);
    for (const d of l.donkeys) {
      let last = camelGroundY(l.at, l.rows, d.a.col * 24, 314);
      const heights = new Set<number>();
      for (let x = d.a.col * 24; x < (d.endCol - 4) * 24; x++) {
        const y = camelGroundY(l.at, l.rows, x, 314);
        expect(Math.abs(y - last)).toBeLessThanOrEqual(1.01);
        expect(y).toBeGreaterThanOrEqual(314);
        expect(y).toBeLessThanOrEqual(338);
        heights.add(Math.round(y));
        last = y;
      }
      expect(heights.size).toBeGreaterThan(20);
    }
  });
});
