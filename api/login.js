import {
  clientIp,
  getSql,
  hashPin,
  isProgress,
  json,
  nameKey,
  newSalt,
  normalizeName,
  pinMatches,
  rateLimit,
  readBody,
  setSession,
  validPin,
} from './_db.js';

function merge(a, b) {
  if (!isProgress(a))
    return isProgress(b)
      ? b
      : { unlocked: 0, best: {}, coins: {}, secrets: {}, cleared: {} };
  if (!isProgress(b)) return a;
  const best = { ...(a.best || {}) };
  for (const [k, v] of Object.entries(b.best || {}))
    best[k] = Math.max(best[k] || 0, v);
  const coins = { ...(a.coins || {}) };
  for (const [k, v] of Object.entries(b.coins || {}))
    coins[k] = Math.max(coins[k] || 0, v);
  const ar = a.resume && typeof a.resume === 'object' ? a.resume : null;
  const br = b.resume && typeof b.resume === 'object' ? b.resume : null;
  const resume = ar && br ? ((br.at || 0) >= (ar.at || 0) ? br : ar) : ar || br;
  return {
    unlocked: Math.max(a.unlocked || 0, b.unlocked || 0),
    best,
    coins,
    secrets: { ...(a.secrets || {}), ...(b.secrets || {}) },
    cleared: { ...(a.cleared || {}), ...(b.cleared || {}) },
    resume,
    updatedAt: Math.max(a.updatedAt || 0, b.updatedAt || 0, Date.now()),
  };
}

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
      const salt = newSalt();
      const progress = incoming || {
        unlocked: 0,
        best: {},
        coins: {},
        secrets: {},
        cleared: {},
      };
      const made =
        await sql`INSERT INTO players (name, name_key, pin_salt, pin_hash, progress)
        VALUES (${name}, ${key}, ${salt}, ${hashPin(pin, salt)}, ${JSON.stringify(progress)}::jsonb) RETURNING id`;
      setSession(res, made[0].id);
      return json(res, 200, { name, created: true, progress });
    }
    if (row.locked_until && new Date(row.locked_until).getTime() > Date.now())
      return json(res, 429, { error: 'استنى شوية وجرّب تاني' });
    if (!pinMatches(pin, row.pin_salt, row.pin_hash)) {
      const fails = (row.failed_attempts || 0) + 1;
      const lock =
        fails >= 8 ? new Date(Date.now() + 60_000).toISOString() : null;
      await sql`UPDATE players SET failed_attempts = ${fails}, locked_until = ${lock} WHERE id = ${row.id}`;
      return json(res, 401, { error: 'الرقم السري غلط' });
    }
    const progress = merge(row.progress || {}, incoming || {});
    await sql`UPDATE players SET failed_attempts = 0, locked_until = NULL, progress = ${JSON.stringify(progress)}::jsonb, updated_at = now() WHERE id = ${row.id}`;
    setSession(res, row.id);
    return json(res, 200, { name: row.name, created: false, progress });
  } catch (err) {
    console.error('login failed', err?.message || err);
    return json(res, 500, { error: 'حصل خطأ، جرّب تاني' });
  }
}
