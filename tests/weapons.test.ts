import { describe, expect, it } from 'vitest';
import { CANAL } from '../src/level-parse';
import {
  hitIsFatal,
  INVULN_MS,
  isWeaponItem,
  POWER,
  powerAfterHit,
  powerLabel,
  worldWeapon,
} from '../src/weapons';

describe('hero health tiers', () => {
  it('drops one tier per hit and only a small hero dies', () => {
    expect(powerAfterHit(POWER.armed)).toBe(POWER.big);
    expect(powerAfterHit(POWER.big)).toBe(POWER.small);
    expect(powerAfterHit(POWER.small)).toBe(POWER.small);
    expect(hitIsFatal(POWER.armed)).toBe(false);
    expect(hitIsFatal(POWER.big)).toBe(false);
    expect(hitIsFatal(POWER.small)).toBe(true);
  });
  it('grants a long, visible invulnerability window after each step down', () => {
    expect(INVULN_MS).toBe(2000);
  });
});

describe('per-world weapons', () => {
  it('keeps chili in Cairo and gives the countryside a slingshot', () => {
    expect(worldWeapon(0).id).toBe('chili');
    expect(worldWeapon(0).item).toBe('chili');
    expect(worldWeapon(0).projectile).toBe('fire');
    const sling = worldWeapon(1);
    expect(sling.id).toBe('sling');
    expect(sling.item).toBe('sling');
    expect(sling.projectile).toBe('pebble');
    expect(sling.short).toBe('نبلة');
    expect(sling.bounce).toBe(false);
    expect(sling.vy).toBeLessThan(0);
    expect(isWeaponItem('chili')).toBe(true);
    expect(isWeaponItem('sling')).toBe(true);
    expect(isWeaponItem('food')).toBe(false);
    expect(powerLabel(2, sling)).toBe('نبلة طين');
    expect(powerLabel(2, worldWeapon(0))).toBe('شطة نار');
  });
  it('lets later worlds fall back to chili until they get their own', () => {
    expect(worldWeapon(2).id).toBe('chili');
    expect(worldWeapon(99).id).toBe('chili');
  });
  it('hides the throw button in Port Said — the cranes are the weapon', () => {
    expect(worldWeapon(6).hidden).toBe(true);
    expect(worldWeapon(6).id).toBe('none');
    expect(worldWeapon(5).hidden).toBeFalsy();
  });
  it('gives each later city its own weapon id (Aswan frond, Siwa salt)', () => {
    expect(worldWeapon(4).id).toBe('stick');
    expect(worldWeapon(5).id).toBe('frond');
    expect(worldWeapon(5).short).toBe('سعفة');
    expect(worldWeapon(7).id).toBe('salt');
    expect(worldWeapon(7).short).toBe('ملح');
    expect(worldWeapon(7).item).toBe('salt');
    expect(worldWeapon(7).hidden).toBeFalsy();
    expect(powerLabel(2, worldWeapon(7))).toBe('ملح سيوة');
    // Damietta still uses chili (no layout change); Alexandria lobs the same chili.
    expect(worldWeapon(2).id).toBe('chili');
    expect(worldWeapon(3).id).toBe('chili');
  });
});

describe('canal swimming', () => {
  it('lets a walking hero make clear headway against the current', () => {
    const walk = 157 * CANAL.swim - CANAL.current;
    expect(walk).toBeGreaterThan(50);
    expect(CANAL.stroke).toBe(350);
  });
});
