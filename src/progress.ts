// Saved journey across the four levels (local only).
import { LEVELS } from './level-data';
export interface Progress {
  unlocked: number;
  best: Record<string, number>;
  coins: Record<string, number>;
  secrets: Record<string, boolean>;
  cleared: Record<string, boolean>;
}
const KEY = 'hawari-progress';
export function loadProgress(): Progress {
  const empty: Progress = {
    unlocked: 0,
    best: {},
    coins: {},
    secrets: {},
    cleared: {},
  };
  try {
    const p = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (!p || typeof p.unlocked !== 'number') return empty;
    return {
      ...empty,
      ...p,
      unlocked: Math.max(0, Math.min(LEVELS.length - 1, p.unlocked)),
    };
  } catch {
    return empty;
  }
}
export function saveProgress(p: Progress) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* Private browsing can disable storage. */
  }
}
export function recordClear(
  index: number,
  score: number,
  coins: number,
  secret: boolean,
) {
  const p = loadProgress(),
    id = LEVELS[index].id;
  p.cleared[id] = true;
  p.best[id] = Math.max(p.best[id] || 0, score);
  p.coins[id] = Math.max(p.coins[id] || 0, coins);
  if (secret) p.secrets[id] = true;
  p.unlocked = Math.max(p.unlocked, Math.min(LEVELS.length - 1, index + 1));
  saveProgress(p);
  return p;
}
export function recordSecret(index: number) {
  const p = loadProgress();
  p.secrets[LEVELS[index].id] = true;
  saveProgress(p);
}
