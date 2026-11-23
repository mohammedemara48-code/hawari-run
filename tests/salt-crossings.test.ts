import { describe, it, expect } from 'vitest';
import { parseLevel, SOLID } from '../src/level-parse';
describe('Salt Mirage phone crossings', () => {
  it('keeps every required ground gap to one tile, with broad landing islands', () => {
    const l = parseLevel(29);
    let gap = 0,
      max = 0;
    for (let c = l.start.col; c <= l.exit.col; c++) {
      if (!SOLID.has(l.at(c, 13))) {
        gap++;
        max = Math.max(max, gap);
      } else gap = 0;
    }
    expect(max).toBe(1);
    for (const c of [31, 35, 39, 43, 80, 84])
      for (let x = c; x < c + 3; x++) expect(SOLID.has(l.at(x, 13))).toBe(true);
  });
  it('keeps optional mirages, pan rides, secret and checkpoint', () => {
    const l = parseLevel(29);
    expect(l.planks.length).toBeGreaterThan(0);
    expect(l.meta.rows.join('')).toContain('غ');
    expect(l.meta.rows.join('')).toContain('G');
    expect(l.checkpoint).toBeTruthy();
  });
});
