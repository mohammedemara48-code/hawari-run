// Per-world throwables and the hero's three health tiers (small / big / armed).
// Later worlds add an entry to WEAPONS; anything missing falls back to Cairo's chili.

export const INVULN_MS = 2000;
/** Flying enemies may not dive inside this many pixels of the active spawn. */
export const SPAWN_CLEAR = 240;

export const POWER = { small: 0, big: 1, armed: 2 } as const;
export type Power = (typeof POWER)[keyof typeof POWER];

/** One hit drops a single tier; a hit at small is fatal. */
export const powerAfterHit = (power: number) => Math.max(0, power - 1);
export const hitIsFatal = (power: number) => power <= POWER.small;

export interface WorldWeapon {
  id: string;
  /** Pickup / box item texture and kind. */
  item: string;
  projectile: string;
  sfx: string;
  /** Short name on the throw button. */
  short: string;
  /** HUD label while armed (power 2). */
  armedLabel: string;
  readyLabel: string;
  lockedLabel: string;
  toast: string;
  /** Shot launch: px/s, plus gravity added to the world gravity. */
  vx: number;
  vy: number;
  gravityY: number;
  /** Clay pellets splat on the floor instead of bouncing. */
  bounce: boolean;
}

export const WEAPONS: Record<number, WorldWeapon> = {
  0: {
    id: 'chili',
    item: 'chili',
    projectile: 'fire',
    sfx: 'fire',
    short: 'شطة',
    armedLabel: 'شطة نار',
    readyLabel: 'ارمي الشطة',
    lockedLabel: 'الشطة مقفولة: كُل شطة من الصندوق',
    toast: 'شطة نار! دوس X أو زرار الشطة وارمي',
    vx: 350,
    vy: 110,
    gravityY: -600,
    bounce: true,
  },
  1: {
    id: 'sling',
    item: 'sling',
    projectile: 'pebble',
    sfx: 'sling',
    short: 'نبلة',
    armedLabel: 'نبلة طين',
    readyLabel: 'ارمي النبلة',
    lockedLabel: 'النبلة مقفولة: لمّ النبلة من أول المرحلة',
    toast: 'نبلة وطين! دوس X أو زرار النبلة وارمي الحصى',
    vx: 280,
    vy: -220,
    gravityY: -200,
    bounce: false,
  },
};

export function worldWeapon(world: number): WorldWeapon {
  return WEAPONS[world] ?? WEAPONS[0];
}

export function isWeaponItem(kind: string) {
  return (
    kind === 'chili' ||
    Object.values(WEAPONS).some((w) => w.item === kind || w.id === kind)
  );
}

export function powerLabel(power: number, weapon: WorldWeapon) {
  return ['على قدّه', 'شطارة الفول', weapon.armedLabel][power] ?? 'على قدّه';
}
