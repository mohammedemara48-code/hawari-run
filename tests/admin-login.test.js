import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
const mocks = vi.hoisted(() => ({
  sql: vi.fn(),
  check: vi.fn(),
  store: vi.fn(),
}));
vi.mock('../api/_db.js', () => ({
  getSql: () => mocks.sql,
  checkPlayerPin: mocks.check,
  clientIp: () => 'test',
  rateLimit: () => true,
  readBody: (r) => r.body,
  json: (res, status, body) => {
    res.status = status;
    res.body = body;
  },
  nameKey: (n) => n.trim().toLowerCase(),
  normalizeName: (n) => n.trim(),
  validPin: () => true,
  hashPin: vi.fn(),
  newSalt: vi.fn(),
  isProgress: () => false,
  setSession: vi.fn(),
}));
vi.mock('../api/_progress.js', () => ({ storeProgress: mocks.store }));
import login from '../api/login.js';
const id = '12345678-1234-1234-1234-123456789abc';
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('ADMIN_PLAYER_ID', id);
  vi.stubEnv('ADMIN_RESERVED_NAME', 'owner');
  mocks.store.mockResolvedValue({ unlocked: 0 });
});
afterEach(() => vi.unstubAllEnvs());
const request = {
  method: 'POST',
  body: { name: 'owner', pin: '1234', admin: true },
};
describe('server-verified admin login', () => {
  it('refuses public creation of a reserved admin name', async () => {
    mocks.sql.mockResolvedValue([]);
    const r = {};
    await login(request, r);
    expect(r.status).toBe(403);
    expect(mocks.sql).toHaveBeenCalledTimes(1);
  });
  it('requires a correct PIN even for the allowlisted id', async () => {
    mocks.sql.mockResolvedValue([{ id, name: 'owner' }]);
    mocks.check.mockResolvedValue({ error: 401, message: 'wrong' });
    const r = {};
    await login(request, r);
    expect(r.status).toBe(401);
    expect(mocks.store).not.toHaveBeenCalled();
  });
  it('ignores client admin flags for a normal player', async () => {
    mocks.sql.mockResolvedValue([{ id: 'normal-id', name: 'owner' }]);
    mocks.check.mockResolvedValue({ row: {} });
    const r = {};
    await login(request, r);
    expect(r.body.admin).toBe(false);
  });
  it('grants the allowlisted existing id only after PIN validation', async () => {
    mocks.sql.mockResolvedValue([{ id, name: 'owner' }]);
    mocks.check.mockResolvedValue({ row: {} });
    const r = {};
    await login(request, r);
    expect(r.status).toBe(200);
    expect(r.body.admin).toBe(true);
    expect(r.body.progress.unlocked).toBe(0);
  });
});
