// Shared helpers for /api/login and /api/progress. Never log secrets.
import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';
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

export function hashPin(pin, salt) {
  return createHash('sha256')
    .update(salt + pin)
    .digest('hex');
}

export function newSalt() {
  return randomBytes(16).toString('hex');
}

export function pinMatches(pin, salt, expected) {
  const got = Buffer.from(hashPin(pin, salt), 'hex');
  const want = Buffer.from(expected, 'hex');
  return got.length === want.length && timingSafeEqual(got, want);
}

export function isProgress(p) {
  return !!p && typeof p === 'object' && typeof p.unlocked === 'number';
}

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
  const parts = decodeURIComponent(m[1]).split('.');
  if (parts.length !== 3) return null;
  const [id, iat, sig] = parts;
  const want = Buffer.from(sign(`${id}.${iat}`));
  const got = Buffer.from(sig);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return null;
  const age = Date.now() / 1000 - Number(iat);
  if (!(age >= 0 && age < YEAR)) return null;
  return /^[0-9a-f-]{36}$/i.test(id) ? id : null;
}
