// Saved journey across the levels of every world (local cache; synced when logged in).
import { LEVELS } from './level-data';
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
export function validResume(r: unknown): Resume | null {
  if (!r || typeof r !== 'object') return null;
  const x = r as Resume;
  if (
    typeof x.levelIndex !== 'number' ||
    x.levelIndex < 0 ||
    x.levelIndex >= LEVELS.length
  )
    return null;
  return {
    levelIndex: x.levelIndex,
    checkpoint: !!x.checkpoint,
    lives: Math.max(1, Math.min(9, Number(x.lives) || 3)),
    score: Math.max(0, Number(x.score) || 0),
    coins: Math.max(0, Number(x.coins) || 0),
    power: Math.max(0, Math.min(2, Number(x.power) || 0)),
    at: Number(x.at) || 0,
  };
}
function frontierFrom(p: Pick<Progress, 'unlocked' | 'cleared'>) {
  let frontier = p.unlocked || 0;
  LEVELS.forEach((l, i) => {
    if (p.cleared?.[l.id]) frontier = Math.max(frontier, i + 1);
  });
  return Math.max(0, Math.min(LEVELS.length - 1, frontier));
}
export function loadProgress(): Progress {
  const empty = emptyProgress();
  try {
    const p = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (!p || typeof p.unlocked !== 'number') return empty;
    const cleared: Record<string, boolean> = p.cleared || {};
    return {
      ...empty,
      ...p,
      cleared,
      resume: validResume(p.resume),
      unlocked: frontierFrom({ ...p, cleared }),
    };
  } catch {
    return empty;
  }
}
let onSave: (() => void) | null = null;
export function onProgressSave(fn: () => void) {
  onSave = fn;
}
export function saveProgress(p: Progress, sync = true) {
  p.updatedAt = Date.now();
  p.unlocked = frontierFrom(p);
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* Private browsing can disable storage. */
  }
  if (sync) onSave?.();
}
export function mergeProgress(a: Progress, b: Progress): Progress {
  const best = { ...(a.best || {}) };
  for (const [k, v] of Object.entries(b.best || {}))
    best[k] = Math.max(best[k] || 0, v);
  const coins = { ...(a.coins || {}) };
  for (const [k, v] of Object.entries(b.coins || {}))
    coins[k] = Math.max(coins[k] || 0, v);
  const ar = validResume(a.resume);
  const br = validResume(b.resume);
  const resume = ar && br ? ((br.at || 0) >= (ar.at || 0) ? br : ar) : ar || br;
  const out: Progress = {
    unlocked: Math.max(a.unlocked || 0, b.unlocked || 0),
    best,
    coins,
    secrets: { ...(a.secrets || {}), ...(b.secrets || {}) },
    cleared: { ...(a.cleared || {}), ...(b.cleared || {}) },
    resume,
    updatedAt: Math.max(a.updatedAt || 0, b.updatedAt || 0),
  };
  out.unlocked = frontierFrom(out);
  return out;
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
  p.resume = validResume({ ...r, at: Date.now() });
  saveProgress(p);
}
export function clearResume() {
  const p = loadProgress();
  if (!p.resume) return;
  p.resume = null;
  saveProgress(p);
}
