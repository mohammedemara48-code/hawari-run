import {
  clientIp,
  getSql,
  isProgress,
  json,
  nameKey,
  pinMatches,
  rateLimit,
  readBody,
  sessionId,
  validPin,
} from './_db.js';

async function findPlayer(sql, name, pin) {
  const key = nameKey(name);
  if (!key || !validPin(pin)) return { error: 400, message: 'بيانات ناقصة' };
  const rows =
    await sql`SELECT id, name, pin_salt, pin_hash, progress, failed_attempts, locked_until FROM players WHERE name_key = ${key}`;
  const row = rows[0];
  if (!row) return { error: 404, message: 'اللاعب مش موجود' };
  if (row.locked_until && new Date(row.locked_until).getTime() > Date.now())
    return { error: 429, message: 'استنى شوية وجرّب تاني' };
  if (!pinMatches(pin, row.pin_salt, row.pin_hash)) {
    const fails = (row.failed_attempts || 0) + 1;
    const lock =
      fails >= 8 ? new Date(Date.now() + 60_000).toISOString() : null;
    await sql`UPDATE players SET failed_attempts = ${fails}, locked_until = ${lock} WHERE id = ${row.id}`;
    return { error: 401, message: 'الرقم السري غلط' };
  }
  return { row };
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
    if (req.method === 'POST' && !isProgress(body.progress)) {
      await sql`UPDATE players SET failed_attempts = 0, locked_until = NULL WHERE id = ${found.row.id}`;
      return json(res, 200, {
        name: found.row.name,
        progress: found.row.progress || {},
      });
    }
    if (!isProgress(body.progress))
      return json(res, 400, { error: 'بيانات ناقصة' });
    await sql`UPDATE players SET failed_attempts = 0, locked_until = NULL, progress = ${JSON.stringify(body.progress)}::jsonb, updated_at = now() WHERE id = ${found.row.id}`;
    return json(res, 200, { name: found.row.name, progress: body.progress });
  } catch (err) {
    console.error('progress failed', err?.message || err);
    return json(res, 500, { error: 'حصل خطأ، جرّب تاني' });
  }
}
