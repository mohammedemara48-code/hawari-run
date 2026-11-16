import { describe, expect, it } from 'vitest';
import pkgJson from '../package.json?raw';
import {
  APP_VERSION,
  CHANGELOG,
  compareVersions,
  releasesSince,
} from '../src/changelog';

describe('changelog and update prompt data', () => {
  it('the newest entry is the package version', () => {
    const pkg = JSON.parse(pkgJson);
    expect(APP_VERSION).toBe(pkg.version);
  });
  it('entries are newest first, unique and in Arabic', () => {
    const versions = CHANGELOG.map((r) => r.version);
    expect(new Set(versions).size).toBe(versions.length);
    for (let i = 1; i < CHANGELOG.length; i++)
      expect(compareVersions(versions[i - 1], versions[i])).toBe(1);
    for (const r of CHANGELOG) {
      expect(r.notes.length).toBeGreaterThan(0);
      expect(r.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      for (const n of r.notes) expect(n).toMatch(/[\u0600-\u06ff]/);
    }
    expect(CHANGELOG[0].notes.join(' ')).toContain('نبلة');
    expect(
      CHANGELOG.some((r) => r.notes.join(' ').includes('تحت المترو')),
    ).toBe(true);
  });
  it('compares dotted versions numerically', () => {
    expect(compareVersions('2.0.10', '2.0.9')).toBe(1);
    expect(compareVersions('2.0', '2.0.0')).toBe(0);
    expect(compareVersions('1.9.9', '2.0.0')).toBe(-1);
  });
  it('lists only the releases newer than the running one', () => {
    const log = [
      { version: '2.1.0', date: '2026-12-01', notes: ['ج'] },
      { version: '2.0.2', date: '2026-11-20', notes: ['ب'] },
      { version: '2.0.1', date: '2026-11-15', notes: ['أ'] },
    ];
    expect(releasesSince('2.0.1', log).map((r) => r.version)).toEqual([
      '2.1.0',
      '2.0.2',
    ]);
    expect(releasesSince('2.1.0', log)).toEqual([]);
    expect(releasesSince(null, log)).toHaveLength(3);
  });
});
