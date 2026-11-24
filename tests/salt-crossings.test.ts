import { describe, it, expect } from 'vitest';
import { MOVERS, parseLevel, SOLID } from '../src/level-parse';

describe('Salt Mirage redesigned crossings', () => {
  it('crosses open brine on ferry pans, never on patched hopscotch', () => {
    const l = parseLevel(29);
    // Every open gap on the required path is exactly one ferry crossing…
    const gaps: [number, number][] = [];
    let start = -1;
    for (let c = l.start.col; c <= l.exit.col; c++) {
      if (!SOLID.has(l.at(c, 13))) {
        if (start < 0) start = c;
      } else if (start >= 0) {
        gaps.push([start, c - 1]);
        start = -1;
      }
    }
    expect(gaps.length).toBeGreaterThanOrEqual(3);
    for (const [a, b] of gaps) {
      // …wide enough to read as a real gap, never a one-tile patch…
      expect(b - a + 1).toBeGreaterThanOrEqual(4);
      // …and a floating pan's full travel span covers it.
      const span = MOVERS.plank.range + MOVERS.plank.width;
      const ferry = l.planks.some(
        (p) => p.row === 13 && p.col <= a + 1 && p.col + span >= b,
      );
      expect(ferry, `ferry pan covers the gap at ${a}-${b}`).toBe(true);
    }
  });

  it('has no narrow clutter islands: every crust run is broad and deliberate', () => {
    const l = parseLevel(29);
    let run = 0;
    for (let c = l.start.col; c <= l.exit.col; c++) {
      if (SOLID.has(l.at(c, 13))) run++;
      else {
        if (run > 0)
          expect(run, `crust run ending at ${c - 1}`).toBeGreaterThanOrEqual(3);
        run = 0;
      }
    }
    expect(run).toBeGreaterThanOrEqual(3);
  });

  it('keeps a guarded shelf between the last two ferries', () => {
    const l = parseLevel(29);
    const scorpions: number[] = [];
    for (let c = 0; c < l.cols; c++) if (l.at(c, 12) === 'ق') scorpions.push(c);
    // Guards along the way, including one on the shelf between the ferries.
    expect(scorpions.length).toBeGreaterThanOrEqual(5);
  });

  it('keeps optional mirages, pan rides, secret and checkpoint', () => {
    const l = parseLevel(29);
    expect(l.planks.length).toBeGreaterThanOrEqual(3);
    expect(l.meta.rows.join('')).toContain('غ');
    expect(l.meta.rows.join('')).toContain('G');
    expect(l.checkpoint).toBeTruthy();
    // The high route to the secret still starts from a step-pan.
    expect(l.planks.some((p) => p.row === 10)).toBe(true);
  });
});
