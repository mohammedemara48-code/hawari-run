import { isAdminPlayer } from './_admin.js';
import { normalizeProgress } from '../shared/progress.js';
import { storeProgress } from './_progress.js';
import {
  clientIp,
  getSql,
  isProgress,
  json,
  nameKey,
  checkPlayerPin,
  rateLimit,
  readBody,
  sessionId,
  setSession,
  validPin,
} from './_db.js';

async function findPlayer(sql, name, pin) {
  const key = nameKey(name);
  if (!key || !validPin(pin)) return { error: 400, message: 'بيانات ناقصة' };
  const rows =
    await sql`SELECT id, name, pin_salt, pin_hash, progress, failed_attempts, locked_until FROM players WHERE name_key = ${key}`;
  const row = rows[0];
  if (!row) return { error: 404, message: 'اللاعب مش موجود' };
  return checkPlayerPin(sql, row, pin);
}

async function sessionPlayer(sql, id) {
  const rows =
    await sql`SELECT id, name, progress FROM players WHERE id = ${id}`;
  return rows[0] ? { row: rows[0] } : { error: 401, message: 'سجّل تاني' };
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST' && req.method !== 'PUT')
    return json(res, 405, { error: 'method' });
  const ip = clientIp(req);
  if (!rateLimit(ip, 40))
    return json(res, 429, { error: 'استنى شوية وجرّب تاني' });
  const sql = getSql();
  if (!sql) return json(res, 503, { error: 'السيرفر مش جاهز' });
  const body = readBody(req);
  try {
    // A remembered session (httpOnly cookie) stands in for the PIN.
    const sid = body.pin ? null : sessionId(req);
    const found = sid
      ? await sessionPlayer(sql, sid)
      : await findPlayer(sql, body.name, body.pin);
    if (found.error) return json(res, found.error, { error: found.message });
    if (sid && body.name && nameKey(body.name) !== nameKey(found.row.name))
      return json(res, 401, { error: 'سجّل تاني' });
    if (body.pin) setSession(res, found.row.id);
    if (req.method === 'POST' && !isProgress(body.progress)) {
      await sql`UPDATE players SET failed_attempts = 0, locked_until = NULL WHERE id = ${found.row.id}`;
      return json(res, 200, {
        name: found.row.name,
        admin: isAdminPlayer(found.row.id),
        progress: normalizeProgress(found.row.progress),
      });
    }
    if (!isProgress(body.progress))
      return json(res, 400, { error: 'بيانات ناقصة' });
    const progress = await storeProgress(sql, found.row.id, body.progress);
    return json(res, 200, {
      name: found.row.name,
      progress,
      admin: isAdminPlayer(found.row.id),
    });
  } catch (err) {
    console.error('progress failed', err?.message || err);
    return json(res, 500, { error: 'حصل خطأ، جرّب تاني' });
  }
}
