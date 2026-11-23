import { describe, expect, it } from 'vitest';
import { releaseLevelTextures } from '../src/level-textures';
import { LEVELS } from '../src/level-data';
import {
  LEVEL_IDS,
  normalizeProgress,
  mergeProgress,
  validResume,
  isProgress,
} from '../shared/progress.js';

describe('save validation and texture lifetime', () => {
  it('keeps the shared level registry in the exact gameplay order', () => {
    expect(LEVEL_IDS).toEqual(LEVELS.map((l) => l.id));
  });
  it('rejects fractional/out-of-range levels and normalizes unsafe numeric fields', () => {
    for (const levelIndex of [0.5, -1, 32, NaN, Infinity])
      expect(validResume({ levelIndex })).toBeNull();
    expect(
      validResume({
        levelIndex: 0,
        lives: Infinity,
        score: NaN,
        coins: -3,
        power: 1.5,
      }),
    ).toMatchObject({ lives: 3, score: 0, coins: 0, power: 0 });
    expect(isProgress({ unlocked: 0.5 })).toBe(false);
    expect(
      normalizeProgress({
        unlocked: Infinity,
        best: { lanterns: Infinity },
        coins: [],
        cleared: { market: true, roofs: false },
      }),
    ).toMatchObject({
      unlocked: 2,
      best: {},
      coins: {},
      cleared: { market: true },
    });
  });
  it('retains achievements and makes newer deletion defeat older checkpoints both ways', () => {
    const old = {
      unlocked: 1,
      best: { lanterns: 100 },
      secrets: { market: true },
      resume: { levelIndex: 0, at: 10 },
      updatedAt: 10,
    };
    const newer = {
      unlocked: 0,
      best: { market: 200 },
      secrets: { market: false },
      resume: null,
      updatedAt: 20,
    };
    for (const [a, b] of [
      [old, newer],
      [newer, old],
    ])
      expect(mergeProgress(a, b)).toMatchObject({
        unlocked: 1,
        best: { lanterns: 100, market: 200 },
        secrets: { market: true },
        resume: null,
        resumeUpdatedAt: 20,
      });
  });
  it('does not let a later unrelated score update override the checkpoint deletion clock', () => {
    const stale = { resume: { levelIndex: 0, at: 10 }, updatedAt: 100 };
    const cleared = { resume: null, resumeUpdatedAt: 20, updatedAt: 20 };
    expect(mergeProgress(stale, cleared).resume).toBeNull();
    expect(
      mergeProgress(cleared, {
        resume: { levelIndex: 1, at: 30 },
        resumeUpdatedAt: 30,
      }).resume?.levelIndex,
    ).toBe(1);
  });
  it('deletes only generated terrain textures after children have been removed', () => {
    const keys = new Set([
      'lvl0-t-0',
      'lvl0-q-960',
      'hero-small-idle0',
      'backdrop-0',
      'cairo-near',
      'lvl-not-terrain',
    ]);
    releaseLevelTextures({
      getTextureKeys: () => [...keys],
      remove: (k) => keys.delete(k),
    });
    expect([...keys]).toEqual([
      'hero-small-idle0',
      'backdrop-0',
      'cairo-near',
      'lvl-not-terrain',
    ]);
  });
});
