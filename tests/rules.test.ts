import { describe, expect, it } from 'vitest';
import { approach, jumpAllowed, levelSpec, tally, stomped } from '../src/rules';
describe('tight platforming rules', () => {
  it('accelerates without overshooting', () => {
    expect(approach(0, 180, 20)).toBe(20);
    expect(approach(175, 180, 20)).toBe(180);
  });
  it('allows buffered jumps within coyote time only', () => {
    expect(jumpAllowed(50, 70)).toBe(true);
    expect(jumpAllowed(150, 70)).toBe(false);
    expect(jumpAllowed(30, 140)).toBe(false);
  });
  it('stomps only when descending from above', () => {
    expect(stomped(150, 142, 146)).toBe(true);
    expect(stomped(-50, 142, 146)).toBe(false);
    expect(stomped(150, 160, 146)).toBe(false);
  });
  it('tallies time and treasure separately', () => {
    expect(tally(30, 12, 4)).toEqual({
      time: 300,
      treasure: 1200,
      enemies: 800,
      total: 2300,
    });
  });
  it('provides distinct long levels with safe starts and finishes', () => {
    for (let i = 0; i < 2; i++) {
      const l = levelSpec(i);
      expect(l.width).toBeGreaterThan(4500);
      expect(
        l.gaps.every(([a, b]) => a > 650 && b < l.width - 500 && b - a <= 96),
      ).toBe(true);
    }
    expect(levelSpec(0).gaps).not.toEqual(levelSpec(1).gaps);
  });
});
