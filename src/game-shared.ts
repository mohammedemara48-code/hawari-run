import Phaser from 'phaser';

export type Sprite = Phaser.Physics.Arcade.Sprite;
export type Img = Phaser.Physics.Arcade.Image;
export type Body = Phaser.Physics.Arcade.Body;
export type SBody = Phaser.Physics.Arcade.StaticBody;
export type Mode =
  'title' | 'map' | 'play' | 'pause' | 'dead' | 'clear' | 'over' | 'win';
export type Any = Phaser.Types.Physics.Arcade.GameObjectWithBody;
export const body = (s: Phaser.GameObjects.GameObject) =>
  (s as Sprite).body as Body;
export const EDGE = 144;
export const coarse = () => window.matchMedia?.('(pointer: coarse)').matches;
/** Best effort: only works in fullscreen / installed apps on some browsers. */
export function lockLandscape() {
  try {
    const o = window.screen.orientation as ScreenOrientation & {
      lock?: (o: string) => Promise<void>;
    };
    o?.lock?.('landscape')?.catch(() => {});
  } catch {
    /* Orientation lock unsupported. */
  }
}
/** Fullscreen on the first tap of a phone; iOS falls back to standalone + 100dvh. */
export function enterFullscreen() {
  try {
    if (document.fullscreenElement) return;
    const wrap = document.getElementById('game-wrap') as HTMLElement & {
      webkitRequestFullscreen?: () => void;
    };
    const root = document.documentElement as HTMLElement & {
      webkitRequestFullscreen?: () => void;
    };
    // Phones: the whole page, so the portrait quarter turn (a transform on
    // the wrap, which browsers strip from a fullscreen element) still works.
    const el = coarse() ? root : wrap || root;
    const go = (
      node: HTMLElement & { webkitRequestFullscreen?: () => void },
    ) => {
      if (node.requestFullscreen)
        return node
          .requestFullscreen({ navigationUI: 'hide' })
          .then(() => lockLandscape());
      node.webkitRequestFullscreen?.();
      return Promise.resolve();
    };
    go(el).catch(() => go(root).catch(() => {}));
  } catch {
    /* Fullscreen is unavailable (e.g. iOS Safari): CSS fills the viewport. */
  }
}
export function armFirstTapFullscreen() {
  if (!coarse()) return;
  const ask = (e: Event) => {
    const t = e.target as HTMLElement | null;
    if (t?.closest?.('input, textarea, select')) return;
    enterFullscreen();
  };
  document.addEventListener('pointerdown', ask, { capture: true });
}
export function oneWay(b: SBody | Body) {
  b.checkCollision.down = false;
  b.checkCollision.left = false;
  b.checkCollision.right = false;
}
export const randomZone = (r: Phaser.Geom.Rectangle) =>
  ({
    type: 'random',
    source: r as unknown as Phaser.Types.GameObjects.Particles.RandomZoneSource,
  }) as Phaser.Types.GameObjects.Particles.EmitZoneData;
/** Hidden boxes: invisible and solid only when bumped from below. */
export function oneWayBelow(b: SBody) {
  b.checkCollision.up = false;
  b.checkCollision.left = false;
  b.checkCollision.right = false;
}
export interface Lantern {
  img: Phaser.GameObjects.Image;
  glow: Phaser.GameObjects.Image;
  lit: boolean;
  col: number;
  row: number;
  /** World 5 torches: when it burns out (scene time, ms). */
  until?: number;
}
export interface Mover {
  img: Img;
  axis: 'x' | 'y';
  min: number;
  max: number;
  speed: number;
  chains?: Phaser.GameObjects.TileSprite[];
  chainTop?: number;
  steam?: Phaser.GameObjects.Particles.ParticleEmitter;
  /** Platforms that carry a rider sideways with their own motion. */
  carry?: boolean;
  /** Saqia bucket: wheel centre and its angular offset on the wheel. */
  saqia?: { cx: number; cy: number; phase: number };
  /** Donkey cart: runs to max while ridden, walks home when left. */
  donkey?: { min: number; max: number; leftAt: number; ridden: boolean };
  /** Swinging chandelier / lantern: pivot and phase. */
  lamp?: {
    px: number;
    py: number;
    phase: number;
    /** Rope segments as drawn this frame: [x1, y1, x2, y2] each. */
    ropes?: [number, number, number, number][];
  };
  /** Fishing boat riding the tide on its sea. */
  boat?: { sea: { top: number }; seed: number };
  /** The Alexandria tram (World 4): moved by world4.ts. */
  tram?: boolean;
  /** A Luxor hot-air balloon (World 5): moved by world5.ts. */
  balloon?: {
    base: number;
    phase: number;
    sink: number;
    env: Phaser.GameObjects.Image;
  };
}
export interface Canal {
  x0: number;
  x1: number;
  top: number;
  bottom: number;
  dir: number;
  surface: Phaser.GameObjects.TileSprite;
  /** Harbour sea: no current; its top follows the tide. */
  sea?: boolean;
}
export interface Water {
  top: Phaser.GameObjects.TileSprite;
  fill: Phaser.GameObjects.Rectangle;
  y: number;
  active: boolean;
  x0: number;
  x1: number;
  stop: number;
  speed: number;
  trigger: number;
}
