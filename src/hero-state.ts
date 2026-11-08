export const HERO_POSES = [
  'idle0',
  'idle1',
  'idle2',
  'idle3',
  'run0',
  'run1',
  'run2',
  'run3',
  'run4',
  'run5',
  'run6',
  'run7',
  'skid',
  'rise',
  'fall',
  'crouch',
  'hurt',
  'dead',
  'grow0',
  'grow1',
  'grow2',
  'throw0',
  'throw1',
] as const;
export type HeroPose = (typeof HERO_POSES)[number];
export interface HeroState {
  now: number;
  grounded: boolean;
  vx: number;
  vy: number;
  direction: number;
  down: boolean;
  growUntil: number;
  throwUntil: number;
  hurtUntil: number;
  dead: boolean;
}
export function heroBody(big: boolean, crouch: boolean) {
  const height = crouch ? (big ? 30 : 24) : big ? 42 : 34,
    width = big ? 22 : 20;
  return { width, height, x: (32 - width) / 2, y: 48 - height };
}
export function heroPose(s: HeroState): HeroPose {
  if (s.dead) return 'dead';
  if (s.growUntil > s.now)
    return `grow${Math.min(2, Math.floor((420 - (s.growUntil - s.now)) / 140))}` as HeroPose;
  if (s.hurtUntil > s.now) return 'hurt';
  if (s.throwUntil > s.now)
    return s.throwUntil - s.now > 100 ? 'throw0' : 'throw1';
  if (!s.grounded) return s.vy < 0 ? 'rise' : 'fall';
  if (s.down) return 'crouch';
  if (s.direction && Math.sign(s.vx) !== s.direction && Math.abs(s.vx) > 50)
    return 'skid';
  if (Math.abs(s.vx) > 15)
    return `run${Math.floor(s.now / (Math.abs(s.vx) > 190 ? 65 : 88)) % 8}` as HeroPose;
  const beat = Math.floor(s.now / 300) % 12;
  return beat === 10
    ? 'idle3'
    : beat < 4
      ? 'idle0'
      : beat < 7
        ? 'idle1'
        : 'idle2';
}
