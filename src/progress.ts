// Saved journey across the levels of every world (local cache; synced when logged in).
import { LEVELS } from './level-data';
import {
  normalizeProgress,
  validResume,
  mergeProgress,
} from '../shared/progress.js';
export { validResume, mergeProgress };
export interface Resume {
  levelIndex: number;
  checkpoint: boolean;
  lives: number;
  score: number;
  coins: number;
  power: number;
  at: number;
}
export interface Progress {
  unlocked: number;
  best: Record<string, number>;
  coins: Record<string, number>;
  secrets: Record<string, boolean>;
  cleared: Record<string, boolean>;
  resume?: Resume | null;
  updatedAt?: number;
  resumeUpdatedAt?: number;
}
const KEY = 'hawari-progress';
export function emptyProgress(): Progress {
  return {
    unlocked: 0,
    best: {},
    coins: {},
    secrets: {},
    cleared: {},
    resume: null,
    updatedAt: 0,
  };
}
export function loadProgress(): Progress {
  try {
    return normalizeProgress(JSON.parse(localStorage.getItem(KEY) || 'null'));
  } catch {
    return emptyProgress();
  }
}
let onSave: (() => void) | null = null;
export function onProgressSave(fn: () => void) {
  onSave = fn;
}
export function saveProgress(p: Progress, sync = true) {
  if (sync) p.updatedAt = Math.max(Date.now(), (p.updatedAt || 0) + 1);
  Object.assign(p, normalizeProgress(p));
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* Private browsing can disable storage. */
  }
  if (sync) onSave?.();
}
function resumeClock(p: Progress) {
  return Math.max(Date.now(), (p.resumeUpdatedAt || 0) + 1);
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
  p.resume = null;
  p.resumeUpdatedAt = resumeClock(p);
  saveProgress(p);
  return p;
}
export function recordSecret(index: number) {
  const p = loadProgress();
  p.secrets[LEVELS[index].id] = true;
  saveProgress(p);
}
export function saveResume(r: Omit<Resume, 'at'>) {
  const p = loadProgress();
  p.resumeUpdatedAt = resumeClock(p);
  p.resume = validResume({ ...r, at: p.resumeUpdatedAt });
  saveProgress(p);
}
export function clearResume() {
  const p = loadProgress();
  if (!p.resume) return;
  p.resume = null;
  p.resumeUpdatedAt = resumeClock(p);
  saveProgress(p);
}
