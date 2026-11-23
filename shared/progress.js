/** Canonical save format shared by the browser and server. No account data here. */
export const LEVEL_IDS = [
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
  'giza-plateau',
  'giza-valley',
  'giza-gallery',
  'giza-horizon',
  'citadel-ramparts',
  'citadel-towers',
  'citadel-terraces',
  'citadel-guardian',
  'rashid-lattices',
  'rashid-merchants',
  'rashid-river',
  'rashid-mill',
];
const object = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const uint = (v, fallback = 0, max = Number.MAX_SAFE_INTEGER) =>
  Number.isSafeInteger(v) && v >= 0 ? Math.min(v, max) : fallback;
export function validResume(value) {
  if (
    !object(value) ||
    !Number.isInteger(value.levelIndex) ||
    value.levelIndex < 0 ||
    value.levelIndex >= LEVEL_IDS.length
  )
    return null;
  return {
    levelIndex: value.levelIndex,
    checkpoint: value.checkpoint === true,
    lives: Math.max(1, uint(value.lives, 3, 9)),
    score: uint(value.score),
    coins: uint(value.coins),
    power: uint(value.power, 0, 2),
    at: uint(value.at),
  };
}
function map(value, boolean = false) {
  const out = {};
  if (!object(value)) return out;
  for (const id of LEVEL_IDS) {
    if (boolean) {
      if (value[id] === true) out[id] = true;
    } else if (Number.isSafeInteger(value[id]) && value[id] >= 0)
      out[id] = value[id];
  }
  return out;
}
export function isProgress(value) {
  return (
    object(value) &&
    Number.isSafeInteger(value.unlocked) &&
    value.unlocked >= 0 &&
    value.unlocked < LEVEL_IDS.length
  );
}
export function normalizeProgress(value) {
  const p = object(value) ? value : {};
  const cleared = map(p.cleared, true);
  let unlocked = uint(p.unlocked, 0, LEVEL_IDS.length - 1);
  LEVEL_IDS.forEach((id, i) => {
    if (cleared[id])
      unlocked = Math.max(unlocked, Math.min(i + 1, LEVEL_IDS.length - 1));
  });
  const resume = validResume(p.resume);
  // Old saves had no separate deletion clock. Migrate it without rewriting data.
  const legacyClock = resume
    ? resume.at
    : Object.hasOwn(p, 'resume')
      ? uint(p.updatedAt)
      : 0;
  return {
    unlocked,
    best: map(p.best),
    coins: map(p.coins),
    secrets: map(p.secrets, true),
    cleared,
    resume,
    resumeUpdatedAt: uint(p.resumeUpdatedAt, legacyClock),
    updatedAt: uint(p.updatedAt),
  };
}
export function mergeProgress(left, right) {
  const a = normalizeProgress(left),
    b = normalizeProgress(right);
  const best = { ...a.best },
    coins = { ...a.coins };
  for (const [id, value] of Object.entries(b.best))
    best[id] = Math.max(best[id] || 0, value);
  for (const [id, value] of Object.entries(b.coins))
    coins[id] = Math.max(coins[id] || 0, value);
  // Deletions win ties so replaying an old request cannot resurrect a checkpoint.
  const newest =
    b.resumeUpdatedAt > a.resumeUpdatedAt
      ? b
      : b.resumeUpdatedAt < a.resumeUpdatedAt
        ? a
        : !a.resume
          ? a
          : b;
  return normalizeProgress({
    unlocked: Math.max(a.unlocked, b.unlocked),
    best,
    coins,
    secrets: { ...a.secrets, ...b.secrets },
    cleared: { ...a.cleared, ...b.cleared },
    resume: newest.resume,
    resumeUpdatedAt: newest.resumeUpdatedAt,
    updatedAt: Math.max(a.updatedAt, b.updatedAt),
  });
}
