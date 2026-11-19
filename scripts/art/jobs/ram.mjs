// الكبش الحارس (Karnak ram boss), QuiverAI art, facing left like the old frames.
import { stars, dust, speed, HURT, DEAD } from './common.mjs';
const R = 'golden-stone-ram';
const NECK = [240, 250]; // inner units, where the neck meets the chest
const head = (deg, dy = 0) =>
  Object.fromEntries(
    ['far-horn', 'head', 'forehead-jewel', 'great-curled-horn', 'near-ear'].map(
      (id) => [id, { rotate: deg, at: NECK, dy }],
    ),
  );
const whole = (deg, pivot) => ({ [R]: { rotate: deg, pivot } });
const pose = {
  idle0: {},
  idle1: { parts: head(3) },
  rear: { parts: { ...whole(12, [0.85, 1]), ...head(8) } },
  slam: {
    parts: { ...whole(-6, [0.15, 1]), ...head(-12) },
    overlays: [{ in: R, svg: dust(120, 760, 60, -1, 12) }],
  },
  bowed: {
    parts: head(-38, 40),
    overlays: [{ in: R, svg: stars(60, -10, 40, 10) }],
  },
  charge: {
    parts: { ...whole(-5, [0.15, 1]), ...head(-34, 20) },
    overlays: [{ in: R, svg: speed(980, 360, 160, 3, 14) }],
  },
  hurt: { parts: head(12), tint: HURT },
  dead: {
    parts: { [R]: { sy: 0.55, pivot: [0.5, 1] }, ...head(-20) },
    tint: DEAD,
  },
};
export default {
  svg: 'scripts/art/svg/ram.svg',
  frames: Object.entries(pose).map(([k, v]) => ({
    key: 'boss5-' + k,
    w: 160,
    h: 112,
    box: [16, 22, 144, 88],
    sx: 1.15,
    ...v,
  })),
};
