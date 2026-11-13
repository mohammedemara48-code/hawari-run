import { describe, expect, it } from 'vitest';
import { heroBody } from '../src/hero-state';
import { jumpAllowed } from '../src/rules';
import { PHYSICS, apex } from '../src/levels';
import { BOUNCE, BOXES, parseLevel } from '../src/level-parse';
import { LEVELS, TILE } from '../src/level-data';

const WALK_JUMP = apex(PHYSICS.jump);
const RUN_JUMP = apex(PHYSICS.runJump);

describe('jump physics behind the reachability graph', () => {
  it('a normal jump clears three tiles (the graph’s rise limit)', () => {
    expect(WALK_JUMP).toBeGreaterThan(3 * TILE + 20);
    expect(RUN_JUMP).toBeGreaterThan(WALK_JUMP);
    console.log(
      `apex walk ${WALK_JUMP.toFixed(1)}px, run ${RUN_JUMP.toFixed(1)}px`,
    );
  });
  it('awnings and dishes reach the heights the maps rely on', () => {
    expect(apex(BOUNCE.awning)).toBeGreaterThan(8 * TILE + 20);
    expect(apex(BOUNCE.dish)).toBeGreaterThan(6 * TILE + 20);
    expect(apex(BOUNCE.awningHold)).toBeGreaterThan(apex(BOUNCE.awning));
  });
  it('both hero forms fit under a box with three free rows', () => {
    expect(heroBody(true, false).height).toBeLessThan(3 * TILE);
    expect(heroBody(false, false).height + WALK_JUMP).toBeGreaterThan(3 * TILE);
  });
  it('keeps coyote time and jump buffering forgiving', () => {
    expect(jumpAllowed(100, 0)).toBe(true);
    expect(jumpAllowed(0, 110)).toBe(true);
    expect(jumpAllowed(130, 0)).toBe(false);
  });
});
describe('boxes', () => {
  it('every box in every level has real contents', () => {
    for (let i = 0; i < LEVELS.length; i++) {
      const L = parseLevel(i);
      expect(L.boxes.length).toBeGreaterThan(0);
      for (const b of L.boxes)
        expect(Object.values(BOXES)).toContain(b.content);
    }
  });
  it('each level offers a power-up before its hardest set piece', () => {
    for (let i = 0; i < LEVELS.length; i++) {
      const L = parseLevel(i);
      expect(
        L.boxes.some((b) => b.content !== 'coin'),
        LEVELS[i].id,
      ).toBe(true);
    }
  });
});
