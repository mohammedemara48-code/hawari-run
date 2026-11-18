import { afterEach, describe, expect, it } from 'vitest';
import {
  clearResume,
  emptyProgress,
  loadProgress,
  mergeProgress,
  recordClear,
  saveProgress,
  saveResume,
  validResume,
} from '../src/progress';

const mem = new Map<string, string>();
const ls = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => {
    mem.set(k, v);
  },
  removeItem: (k: string) => {
    mem.delete(k);
  },
};
Object.defineProperty(globalThis, 'localStorage', {
  value: ls,
  configurable: true,
});

afterEach(() => mem.clear());

describe('progress and resume', () => {
  it('starts empty and ignores junk', () => {
    expect(loadProgress().unlocked).toBe(0);
    mem.set('hawari-progress', '{nope');
    expect(loadProgress().unlocked).toBe(0);
    expect(validResume(null)).toBeNull();
    expect(validResume({ levelIndex: 99, checkpoint: true })).toBeNull();
  });
  it('records a clear and drops a mid-level resume', () => {
    saveResume({
      levelIndex: 0,
      checkpoint: true,
      lives: 2,
      score: 400,
      coins: 3,
      power: 1,
    });
    expect(loadProgress().resume?.checkpoint).toBe(true);
    recordClear(0, 1200, 8, true);
    const p = loadProgress();
    expect(p.cleared.lanterns || p.cleared[Object.keys(p.cleared)[0]]).toBe(
      true,
    );
    expect(p.unlocked).toBeGreaterThanOrEqual(1);
    expect(p.resume).toBeNull();
  });
  it('merges two saves by taking the best of both', () => {
    const a = emptyProgress();
    a.unlocked = 3;
    a.best = { alley: 100 };
    a.cleared = { alley: true };
    a.resume = {
      levelIndex: 1,
      checkpoint: false,
      lives: 2,
      score: 10,
      coins: 1,
      power: 0,
      at: 10,
    };
    const b = emptyProgress();
    b.unlocked = 2;
    b.best = { alley: 250, market: 40 };
    b.secrets = { market: true };
    b.resume = {
      levelIndex: 2,
      checkpoint: true,
      lives: 3,
      score: 80,
      coins: 4,
      power: 2,
      at: 20,
    };
    const m = mergeProgress(a, b);
    expect(m.unlocked).toBeGreaterThanOrEqual(3);
    expect(m.best.alley).toBe(250);
    expect(m.best.market).toBe(40);
    expect(m.secrets.market).toBe(true);
    expect(m.cleared.alley).toBe(true);
    expect(m.resume?.levelIndex).toBe(2);
    expect(m.resume?.checkpoint).toBe(true);
  });
  it('clears a stored resume', () => {
    saveResume({
      levelIndex: 0,
      checkpoint: false,
      lives: 3,
      score: 0,
      coins: 0,
      power: 0,
    });
    clearResume();
    expect(loadProgress().resume).toBeNull();
  });
  it('keeps a valid mid-level snapshot', () => {
    saveProgress(
      {
        unlocked: 4,
        best: {},
        coins: {},
        secrets: {},
        cleared: {},
        resume: {
          levelIndex: 1,
          checkpoint: true,
          lives: 2,
          score: 900,
          coins: 5,
          power: 2,
          at: 1,
        },
      },
      false,
    );
    const r = loadProgress().resume;
    expect(r).toMatchObject({
      levelIndex: 1,
      checkpoint: true,
      lives: 2,
      score: 900,
      coins: 5,
      power: 2,
    });
  });
});
