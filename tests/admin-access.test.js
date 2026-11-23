import { describe, it, expect, vi, afterEach } from 'vitest';
import { isAdminPlayer, isReservedAdminName } from '../api/_admin.js';
import {
  acceptServerRole,
  clearAdminAccess,
  hasAdminAccess,
} from '../src/admin';
const id = '12345678-1234-1234-1234-123456789abc';
afterEach(() => {
  vi.unstubAllEnvs();
  clearAdminAccess();
});
describe('admin requires the existing server-side player id', () => {
  it('fails closed without valid configuration', () => {
    vi.stubEnv('ADMIN_PLAYER_ID', '');
    expect(isAdminPlayer(id)).toBe(false);
    vi.stubEnv('ADMIN_PLAYER_ID', 'admin');
    expect(isAdminPlayer('admin')).toBe(false);
  });
  it('does not trust a matching email or name, only the exact database id', () => {
    vi.stubEnv('ADMIN_PLAYER_ID', id);
    expect(isAdminPlayer('mohammedemara48@gmail.com')).toBe(false);
    expect(isAdminPlayer('other-player')).toBe(false);
    expect(isAdminPlayer(id)).toBe(true);
  });
  it('reserves the owner name when provisioning instead of first-registration wins', () => {
    vi.stubEnv('ADMIN_RESERVED_NAME', ' Owner   Name ');
    expect(isReservedAdminName('owner name')).toBe(true);
    expect(isReservedAdminName('normal')).toBe(false);
  });
  it('keeps the role in memory only and removes it on session clear', () => {
    expect(hasAdminAccess()).toBe(false);
    for (const x of ['true', { admin: true }, undefined, 1]) {
      acceptServerRole(x);
      expect(hasAdminAccess()).toBe(false);
    }
    acceptServerRole(true);
    expect(hasAdminAccess()).toBe(true);
    clearAdminAccess();
    expect(hasAdminAccess()).toBe(false);
  });
});
