// GET: who is remembered by the session cookie (name + saved progress).
// DELETE: forget this device (used when switching player).
import {
  clearSession,
  clientIp,
  getSql,
  json,
  rateLimit,
  sessionId,
  setSession,
} from './_db.js';

export default async function handler(req, res) {
  if (req.method === 'DELETE') {
    clearSession(res);
    return json(res, 200, { ok: true });
  }
  if (req.method !== 'GET') return json(res, 405, { error: 'method' });
  if (!rateLimit(clientIp(req), 40))
    return json(res, 429, { error: 'استنى شوية وجرّب تاني' });
  const id = sessionId(req);
  if (!id) return json(res, 401, { error: 'none' });
  const sql = getSql();
  if (!sql) return json(res, 503, { error: 'السيرفر مش جاهز' });
  try {
    const rows =
      await sql`SELECT id, name, progress FROM players WHERE id = ${id}`;
    if (!rows[0]) {
      clearSession(res);
      return json(res, 401, { error: 'none' });
    }
    // Sliding renewal: another year from today.
    setSession(res, rows[0].id);
    return json(res, 200, {
      name: rows[0].name,
      progress: rows[0].progress || {},
    });
  } catch (err) {
    console.error('me failed', err?.message || err);
    return json(res, 500, { error: 'حصل خطأ' });
  }
}
