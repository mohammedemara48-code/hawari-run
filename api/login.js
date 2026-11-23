import { isAdminPlayer, isReservedAdminName } from './_admin.js';
import {
  clientIp,
  getSql,
  hashPin,
  isProgress,
  json,
  nameKey,
  newSalt,
  normalizeName,
  checkPlayerPin,
  rateLimit,
  readBody,
  setSession,
  validPin,
} from './_db.js';

import { normalizeProgress } from '../shared/progress.js';
import { storeProgress } from './_progress.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return json(res, 405, { error: 'method' });
  const ip = clientIp(req);
  if (!rateLimit(ip, 20))
    return json(res, 429, { error: 'استنى شوية وجرّب تاني' });
  const sql = getSql();
  if (!sql) return json(res, 503, { error: 'السيرفر مش جاهز' });
  const body = readBody(req);
  const name = normalizeName(body.name);
  const key = nameKey(body.name);
  const pin = body.pin;
  if (name.length < 2) return json(res, 400, { error: 'الاسم قصّر أوي' });
  if (!validPin(pin))
    return json(res, 400, { error: 'الرقم السري لازم ٤ أرقام' });
  try {
    const rows =
      await sql`SELECT id, name, pin_salt, pin_hash, progress, failed_attempts, locked_until FROM players WHERE name_key = ${key}`;
    const row = rows[0];
    const incoming = isProgress(body.progress) ? body.progress : null;
    if (!row) {
      if (isReservedAdminName(name))
        return json(res, 403, {
          error: 'الاسم ده محجوز. تواصل مع صاحب اللعبة',
        });
      const salt = newSalt();
      const progress = normalizeProgress(incoming);
      const made =
        await sql`INSERT INTO players (name, name_key, pin_salt, pin_hash, progress)
        VALUES (${name}, ${key}, ${salt}, ${await hashPin(pin, salt)}, ${JSON.stringify(progress)}::jsonb) RETURNING id`;
      setSession(res, made[0].id);
      return json(res, 200, { name, created: true, progress, admin: false });
    }
    const checked = await checkPlayerPin(sql, row, pin);
    if (checked.error)
      return json(res, checked.error, { error: checked.message });
    const progress = await storeProgress(sql, row.id, incoming);
    await sql`UPDATE players SET failed_attempts = 0, locked_until = NULL WHERE id = ${row.id}`;
    setSession(res, row.id);
    return json(res, 200, {
      name: row.name,
      created: false,
      progress,
      admin: isAdminPlayer(row.id),
    });
  } catch (err) {
    console.error('login failed', err?.message || err);
    return json(res, 500, { error: 'حصل خطأ، جرّب تاني' });
  }
}
