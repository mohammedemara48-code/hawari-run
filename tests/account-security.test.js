import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import {
  hashPin,
  newSalt,
  pinMatches,
  sessionId,
  setSession,
  checkPlayerPin,
} from '../api/_db.js';

describe('account security helpers', () => {
  it('uses memory-hard hashes and keeps existing PIN hashes valid', async () => {
    const salt = newSalt();
    const hash = await hashPin('1234', salt);
    expect(salt.length).toBeLessThanOrEqual(32);
    expect(hash).toHaveLength(64);
    expect(await pinMatches('1234', salt, hash)).toBe(true);
    expect(await pinMatches('9999', salt, hash)).toBe(false);
    const legacySalt = 'abc';
    const legacy = createHash('sha256')
      .update(legacySalt + '1234')
      .digest('hex');
    expect(await pinMatches('1234', legacySalt, legacy)).toBe(true);
  });
  it('treats malformed, tampered, expired and missing session cookies as anonymous', () => {
    for (const cookie of [
      '',
      'hawari_session=%E0%A4%A',
      'hawari_session=wrong',
      'hawari_session=one.two.three',
    ])
      expect(sessionId({ headers: { cookie } })).toBeNull();
    let cookie;
    const id = '12345678-1234-1234-1234-123456789abc';
    setSession(
      {
        setHeader: (_, value) => {
          cookie = value;
        },
      },
      id,
    );
    expect(cookie).toContain('HttpOnly; Secure; SameSite=Lax');
    expect(sessionId({ headers: { cookie } })).toBe(id);
    expect(
      sessionId({
        headers: {
          cookie: cookie.replace(id, '92345678-1234-1234-1234-123456789abc'),
        },
      }),
    ).toBeNull();
  });
  it('reserves attempts in one database update and upgrades only a correct legacy PIN', async () => {
    const row = {
      id: 'player',
      pin_salt: 'abc',
      pin_hash: createHash('sha256').update('abc1234').digest('hex'),
    };
    const calls = [];
    const sql = async (strings, ...values) => {
      calls.push({ text: strings.join('?'), values });
      return [{ id: 'player' }];
    };
    expect((await checkPlayerPin(sql, row, '9999')).error).toBe(401);
    expect(calls).toHaveLength(1);
    expect(calls[0].text).toContain('COALESCE(failed_attempts, 0) + 1');
    calls.length = 0;
    expect((await checkPlayerPin(sql, row, '1234')).row).toEqual(row);
    expect(calls).toHaveLength(3);
    expect(calls[1].values[0]).toMatch(/^scrypt\$/);
    expect(calls[1].values[1]).toHaveLength(64);
    expect((await checkPlayerPin(async () => [], row, '1234')).error).toBe(429);
  });
});

const mem = new Map();
let cookie = '';
beforeEach(() => {
  vi.resetModules();
  mem.clear();
  cookie = '';
  vi.stubGlobal('localStorage', {
    getItem: (k) => mem.get(k) ?? null,
    setItem: (k, v) => mem.set(k, v),
    removeItem: (k) => mem.delete(k),
  });
  vi.stubGlobal('document', {
    get cookie() {
      return cookie;
    },
    set cookie(v) {
      cookie = v;
    },
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
describe('client credential migration and sync status', () => {
  it('scrubs a legacy PIN without changing local progress', async () => {
    mem.set('hawari-player', JSON.stringify({ name: 'tester', pin: '1234' }));
    mem.set('hawari-progress', JSON.stringify({ unlocked: 12 }));
    const a = await import('../src/account');
    expect(a.getPlayer()).toEqual({ name: 'tester' });
    expect(mem.get('hawari-player')).not.toContain('1234');
    expect(cookie).not.toContain('1234');
    expect(JSON.parse(mem.get('hawari-progress')).unlocked).toBe(12);
  });
  it('never persists a new PIN and reports an offline-only login honestly', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    const a = await import('../src/account');
    expect((await a.login('tester', '1234')).ok).toBe(true);
    expect(mem.get('hawari-player')).toBe(JSON.stringify({ name: 'tester' }));
    expect(cookie).not.toContain('1234');
    expect(a.getSyncState()).toBe('offline');
  });
  it('makes a server login session-based and distinguishes failed sync', async () => {
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ name: 'tester', progress: { unlocked: 2 } }),
    });
    vi.stubGlobal('fetch', fetch);
    const a = await import('../src/account');
    expect((await a.login('tester', '1234')).ok).toBe(true);
    expect(a.getSyncState()).toBe('synced');
    fetch.mockResolvedValue({ ok: false, status: 401, json: async () => ({}) });
    await a.pullProgress();
    expect(a.getSyncState()).toBe('login-required');
    expect(JSON.parse(fetch.mock.calls.at(-1)[1].body)).not.toHaveProperty(
      'pin',
    );
  });
});
