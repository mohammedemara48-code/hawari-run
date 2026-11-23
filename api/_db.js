// Shared helpers for /api/login and /api/progress. Never log secrets.
import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
  scrypt,
} from 'node:crypto';
import { promisify } from 'node:util';
import { neon } from '@neondatabase/serverless';

const buckets = new Map();

export function clientIp(req) {
  const x = req.headers['x-forwarded-for'];
  if (typeof x === 'string' && x.trim()) return x.split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

/** Light per-IP limit: 30 requests / minute. */
export function rateLimit(ip, max = 30, windowMs = 60_000) {
  const now = Date.now();
  if (buckets.size > 4096) {
    for (const [key, bucket] of buckets)
      if (now >= bucket.reset) buckets.delete(key);
    if (buckets.size > 4096 && !buckets.has(ip)) return false;
  }
  const b = buckets.get(ip);
  if (!b || now >= b.reset) {
    buckets.set(ip, { count: 1, reset: now + windowMs });
    return true;
  }
  if (b.count >= max) return false;
  b.count += 1;
  return true;
}

export function json(res, status, body) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.status(status).json(body);
}

export function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return {};
}

export function normalizeName(name) {
  if (typeof name !== 'string') return '';
  return name.normalize('NFKC').trim().replace(/\s+/g, ' ').slice(0, 24);
}

export function nameKey(name) {
  return normalizeName(name).toLocaleLowerCase('ar');
}

export function validPin(pin) {
  return typeof pin === 'string' && /^\d{4}$/.test(pin);
}

const derive = promisify(scrypt);
export async function hashPin(pin, salt) {
  const key = await derive(pin, salt, 32);
  return key.toString('hex');
}
export function newSalt() {
  return 'scrypt$' + randomBytes(12).toString('hex');
}
export async function pinMatches(pin, salt, expected) {
  if (typeof expected !== 'string' || typeof salt !== 'string') return false;
  const actual = salt.startsWith('scrypt$')
    ? await hashPin(pin, salt)
    : createHash('sha256')
        .update(salt + pin)
        .digest('hex');
  const got = Buffer.from(actual),
    want = Buffer.from(expected);
  return got.length === want.length && timingSafeEqual(got, want);
}
/** Reserve a PIN attempt atomically in the shared database, across instances.
 * Reset the window after its lock expires. Eight concurrent tries share a cap.
 */
export async function checkPlayerPin(sql, row, pin) {
  const reserved = await sql`UPDATE players SET
    failed_attempts = CASE WHEN locked_until IS NOT NULL AND locked_until <= now() THEN 1 ELSE COALESCE(failed_attempts, 0) + 1 END,
    locked_until = CASE WHEN (CASE WHEN locked_until IS NOT NULL AND locked_until <= now() THEN 1 ELSE COALESCE(failed_attempts, 0) + 1 END) >= 8 THEN now() + interval '1 minute' ELSE NULL END
    WHERE id = ${row.id} AND (locked_until IS NULL OR locked_until <= now()) RETURNING id`;
  if (!reserved.length) return { error: 429, message: 'استنى شوية وجرّب تاني' };
  if (!(await pinMatches(pin, row.pin_salt, row.pin_hash)))
    return { error: 401, message: 'الرقم السري غلط' };
  // Upgrade legacy hashes only after successful authentication, no PIN reset.
  if (!row.pin_salt.startsWith('scrypt$')) {
    const salt = newSalt();
    const upgraded = await hashPin(pin, salt);
    await sql`UPDATE players SET pin_salt = ${salt}, pin_hash = ${upgraded} WHERE id = ${row.id} AND pin_hash = ${row.pin_hash}`;
  }
  await sql`UPDATE players SET failed_attempts = 0, locked_until = NULL WHERE id = ${row.id}`;
  return { row };
}

export { isProgress } from '../shared/progress.js';

export function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  return neon(url);
}

/* ── Session cookie: a signed, httpOnly token that remembers the player even
 * when the page's own storage is wiped (in-app browsers, PWA containers). */
const COOKIE = 'hawari_session';
const YEAR = 31536000;
function sessionKey() {
  const base = process.env.SESSION_SECRET || process.env.DATABASE_URL || '';
  return createHash('sha256')
    .update('hawari-session-v1:' + base)
    .digest();
}
function sign(payload) {
  return createHmac('sha256', sessionKey()).update(payload).digest('base64url');
}
export function setSession(res, playerId) {
  const payload = `${playerId}.${Math.floor(Date.now() / 1000)}`;
  res.setHeader(
    'Set-Cookie',
    `${COOKIE}=${payload}.${sign(payload)}; Max-Age=${YEAR}; Path=/; HttpOnly; Secure; SameSite=Lax`,
  );
}
export function clearSession(res) {
  res.setHeader(
    'Set-Cookie',
    `${COOKIE}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax`,
  );
}
/** The player id from a valid session cookie, or null. */
export function sessionId(req) {
  const raw = String(req.headers.cookie || '');
  const m = raw.match(/(?:^|;\s*)hawari_session=([^;]+)/);
  if (!m) return null;
  let parts;
  try {
    parts = decodeURIComponent(m[1]).split('.');
  } catch {
    return null;
  }
  if (parts.length !== 3) return null;
  const [id, iat, sig] = parts;
  const want = Buffer.from(sign(`${id}.${iat}`));
  const got = Buffer.from(sig);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return null;
  const age = Date.now() / 1000 - Number(iat);
  if (!(age >= 0 && age < YEAR)) return null;
  return /^[0-9a-f-]{36}$/i.test(id) ? id : null;
}
