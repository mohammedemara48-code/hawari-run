import { describe, expect, it } from 'vitest';
import { LEVELS } from '../src/level-data';
import {
  LEVEL_IDS,
  mergeProgress,
  normalizeProgress,
  validResume,
} from '../shared/progress.js';

// Release 2.6 saves use these numeric indexes. New levels must only append.
const ORIGINAL_IDS = [
  'lanterns',
  'market',
  'roofs',
  'metro',
  'fields',
  'canals',
  'saqia',
  'jurn',
  'furniture',
  'workshop',
  'harbor',
  'rasbar',
  'corniche',
  'tram',
  'stanley',
  'qaitbay',
  'kabbash',
  'nile',
  'valley',
  'karnak',
  'nubia',
  'feluccas',
  'dam',
  'cataract',
  'crocisland',
  'freezone',
  'yard',
  'quay',
  'grove',
  'saltlake',
  'shali',
  'qibli',
];

describe('append-only city expansion compatibility', () => {
  it('keeps all original numeric level indexes and registry entries', () => {
    expect(
      LEVELS.slice(0, ORIGINAL_IDS.length).map((level) => level.id),
    ).toEqual(ORIGINAL_IDS);
    expect(LEVEL_IDS.slice(0, ORIGINAL_IDS.length)).toEqual(ORIGINAL_IDS);
    expect(LEVEL_IDS).toEqual(LEVELS.map((level) => level.id));
    expect(new Set(LEVEL_IDS).size).toBe(LEVEL_IDS.length);
  });

  it.each(ORIGINAL_IDS.map((id, index) => ({ id, index })))(
    'preserves the old $id checkpoint at index $index',
    ({ index }) => {
      const snapshot = {
        levelIndex: index,
        checkpoint: true,
        lives: 2,
        score: 850,
        coins: 7,
        power: 1,
        at: 100,
      };
      const saved = normalizeProgress({
        unlocked: index,
        resume: snapshot,
        updatedAt: 100,
      });
      expect(saved.resume).toEqual(snapshot);
      expect(saved.unlocked).toBe(index);
    },
  );

  it('unlocks the first appended level only after clearing the old final boss', () => {
    const oldUnfinished = normalizeProgress({ unlocked: 31 });
    expect(oldUnfinished.unlocked).toBe(31);
    const oldFinished = normalizeProgress({
      unlocked: 31,
      cleared: { qibli: true },
      best: { qibli: 2200 },
      coins: { qibli: 13 },
      secrets: { qibli: true },
    });
    expect(oldFinished.unlocked).toBe(Math.min(32, LEVEL_IDS.length - 1));
    expect(oldFinished).toMatchObject({
      cleared: { qibli: true },
      best: { qibli: 2200 },
      coins: { qibli: 13 },
      secrets: { qibli: true },
    });
    expect(oldFinished.resume).toBeNull();
  });

  it('preserves every original achievement while normalizing and syncing', () => {
    const old = {
      unlocked: 31,
      cleared: Object.fromEntries(ORIGINAL_IDS.map((id) => [id, true])),
      best: Object.fromEntries(ORIGINAL_IDS.map((id, i) => [id, 1000 + i])),
      coins: Object.fromEntries(ORIGINAL_IDS.map((id, i) => [id, i])),
      secrets: Object.fromEntries(ORIGINAL_IDS.map((id) => [id, true])),
      resume: null,
      updatedAt: 100,
    };
    const synced = mergeProgress(old, { unlocked: 0, updatedAt: 200 });
    expect(synced.best).toEqual(old.best);
    expect(synced.coins).toEqual(old.coins);
    expect(synced.secrets).toEqual(old.secrets);
    expect(synced.cleared).toEqual(old.cleared);
    expect(synced.unlocked).toBe(Math.min(32, LEVEL_IDS.length - 1));
    expect(normalizeProgress(synced)).toEqual(synced);
  });

  it('validates the live registry boundary rather than a fixed level count', () => {
    expect(validResume({ levelIndex: LEVEL_IDS.length - 1 })?.levelIndex).toBe(
      LEVEL_IDS.length - 1,
    );
    expect(validResume({ levelIndex: LEVEL_IDS.length })).toBeNull();
    expect(validResume({ levelIndex: 31.5 })).toBeNull();
    const unknown = normalizeProgress({
      best: { 'unreleased-city': 9999 },
      cleared: { 'unreleased-city': true },
    });
    expect(unknown.best).toEqual({});
    expect(unknown.cleared).toEqual({});
  });
});
