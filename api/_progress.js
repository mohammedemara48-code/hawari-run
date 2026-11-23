import { mergeProgress, normalizeProgress } from '../shared/progress.js';

/** Optimistic compare-and-swap: merge against the exact row we replace.
 * A concurrent login or device save causes a retry, never a blind overwrite.
 * No schema migration is needed and old clients keep their best achievements.
 */
export async function storeProgress(sql, playerId, incoming) {
  for (let attempt = 0; attempt < 8; attempt++) {
    const rows = await sql`SELECT progress FROM players WHERE id = ${playerId}`;
    if (!rows[0]) throw new Error('player missing');
    const previous = rows[0].progress;
    if (!incoming) return normalizeProgress(previous);
    const merged = mergeProgress(previous, incoming);
    const saved =
      await sql`UPDATE players SET progress = ${JSON.stringify(merged)}::jsonb, updated_at = now() WHERE id = ${playerId} AND progress IS NOT DISTINCT FROM ${previous == null ? null : JSON.stringify(previous)}::jsonb RETURNING progress`;
    if (saved.length) return normalizeProgress(saved[0].progress);
  }
  throw new Error('progress contention; retry later');
}
