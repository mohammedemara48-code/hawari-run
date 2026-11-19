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
  /** Spins in flight (deg/s), e.g. the Luxor throwing stick. */
  spin?: number;
  /** Splinter colour when the shot breaks on a wall. */
  splat?: number;
  /** When true, this world has no throwable — the throw button is hidden. */
  hidden?: boolean;
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
  // اسكندرية: the same chili, lobbed up in an arc so it can reach the
  // storm gulls overhead (and still comes down on the beach balls).
  3: {
    id: 'chili',
    item: 'chili',
    projectile: 'fire',
    sfx: 'fire',
    short: 'شطة',
    armedLabel: 'شطة نار',
    readyLabel: 'ارمي الشطة',
    lockedLabel: 'الشطة مقفولة: كُل شطة من الصندوق',
    toast: 'شطة نار! ارميها لفوق على النوارس',
    vx: 300,
    vy: -500,
    gravityY: -350,
    bounce: true,
  },
  // الأقصر: a painted pharaonic throwing stick (like the ones in the tombs),
  // flung flat and spinning — it skims low over the sand to the scarabs,
  // cobras and mummies, and breaks on the first wall.
  4: {
    id: 'stick',
    item: 'stick',
    projectile: 'stickshot',
    sfx: 'stick',
    short: 'عصاية',
    armedLabel: 'عصاية فرعوني',
    readyLabel: 'ارمي العصاية',
    lockedLabel: 'العصاية مقفولة: لمّ العصاية الفرعوني من أول المرحلة',
    toast: 'عصاية فرعوني! دوس X أو زرار العصاية وارميها وهي بتلف',
    vx: 380,
    vy: -140,
    gravityY: -620,
    bounce: false,
    spin: 900,
    splat: 0xd8a040,
  },
  // أسوان: a green palm frond (سعف النخل), flung end over end — it flies
  // a short, floaty arc that sweeps over a crocodile's back and breaks on
  // the first wall.
  5: {
    id: 'frond',
    item: 'frond',
    projectile: 'frondshot',
    sfx: 'stick',
    short: 'سعفة',
    armedLabel: 'سعف النخل',
    readyLabel: 'ارمي السعفة',
    lockedLabel: 'السعفة مقفولة: لمّ سعف النخل من أول المرحلة',
    toast: 'سعف النخل! دوس X أو زرار السعفة وارميها',
    vx: 330,
    vy: -180,
    gravityY: -560,
    bounce: false,
    spin: 720,
    splat: 0x4a9a3a,
  },
  // بورسعيد: no throwable. The city's weapon is the cranes themselves
  // (hooks, slung containers, the gantry drop). Chili must not appear.
  6: {
    id: 'none',
    item: 'none',
    projectile: 'none',
    sfx: 'fire',
    short: '',
    armedLabel: 'شطارة الفول',
    readyLabel: '',
    lockedLabel: '',
    toast: '',
    vx: 0,
    vy: 0,
    gravityY: 0,
    bounce: false,
    hidden: true,
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
