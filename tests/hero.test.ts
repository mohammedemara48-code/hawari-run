import { describe, it, expect } from 'vitest';
import { heroPose, heroBody, HERO_POSES } from '../src/hero-state';
const still = {
  now: 1000,
  grounded: true,
  vx: 0,
  vy: 0,
  direction: 0,
  down: false,
  growUntil: 0,
  throwUntil: 0,
  hurtUntil: 0,
  dead: false,
};
describe('original character animation and silhouette', () => {
  it('provides eight distinct running drawings and four breathing drawings', () => {
    expect(HERO_POSES.filter((p) => p.startsWith('run'))).toHaveLength(8);
    expect(HERO_POSES.filter((p) => p.startsWith('idle'))).toHaveLength(4);
  });
  it('distinguishes rising and falling', () => {
    expect(heroPose({ ...still, grounded: false, vy: -100 })).toBe('rise');
    expect(heroPose({ ...still, grounded: false, vy: 100 })).toBe('fall');
  });
  it('brakes visibly before turning and crouches only on ground', () => {
    expect(heroPose({ ...still, vx: 120, direction: -1 })).toBe('skid');
    expect(heroPose({ ...still, down: true })).toBe('crouch');
    expect(heroPose({ ...still, down: true, grounded: false, vy: 50 })).toBe(
      'fall',
    );
  });
  it('gives throw, hurt, grow and death explicit poses', () => {
    expect(heroPose({ ...still, throwUntil: 1100 })).toMatch(/^throw/);
    expect(heroPose({ ...still, hurtUntil: 1100 })).toBe('hurt');
    expect(heroPose({ ...still, growUntil: 1300 })).toMatch(/^grow/);
    expect(heroPose({ ...still, dead: true })).toBe('dead');
  });
  it('keeps collision feet at exactly frame row 64 through growth and crouch', () => {
    for (const big of [false, true])
      for (const crouch of [false, true]) {
        const b = heroBody(big, crouch);
        expect(b.height + b.y).toBe(64);
        expect(b.width + 2 * b.x).toBe(40);
      }
    expect(heroBody(false, false).height).toBe(46);
    expect(heroBody(true, false).height).toBe(54);
    expect(heroBody(true, true).height).toBeLessThan(54);
  });
});
