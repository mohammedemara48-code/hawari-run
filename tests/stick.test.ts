import { describe, expect, it } from 'vitest';
import { stickFlags } from '../src/ui';

describe('analog stick mapping', () => {
  it('ignores the deadzone', () => {
    expect(stickFlags(0.1, 0.1)).toMatchObject({
      left: false,
      right: false,
      stickJump: false,
    });
  });
  it('walks on a half push and runs when pushed far', () => {
    expect(stickFlags(0.5, 0)).toMatchObject({ right: true, run: false });
    expect(stickFlags(-0.95, 0)).toMatchObject({ left: true, run: true });
  });
  it('crouches when pushed down and stops moving', () => {
    expect(stickFlags(0.1, 0.9)).toMatchObject({
      down: true,
      left: false,
      right: false,
    });
  });
  it('jumps when pushed up, including diagonals, with hysteresis', () => {
    expect(stickFlags(0, -0.8).stickJump).toBe(true);
    expect(stickFlags(0.6, -0.75)).toMatchObject({
      stickJump: true,
      right: true,
    });
    expect(stickFlags(-0.6, -0.75)).toMatchObject({
      stickJump: true,
      left: true,
    });
    expect(stickFlags(1, -0.3).stickJump).toBe(false); // mostly sideways
    expect(stickFlags(0, -0.4, false).stickJump).toBe(false); // below trigger
    expect(stickFlags(0, -0.4, true).stickJump).toBe(true); // still held
    expect(stickFlags(0, -0.2, true).stickJump).toBe(false); // released
  });
});
