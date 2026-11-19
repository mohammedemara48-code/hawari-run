// أبو قرون (farm buffalo boss), QuiverAI art, facing right like the old frames.
import { stars, dust, speed, HURT, DEAD } from './common.mjs';
const R = 'ornamented-buffalo';
const NECK = [700, 300];
const head = (deg, dy = 0) =>
  Object.fromEntries(
    [
      'rear-horn',
      'head',
      'ear',
      'eye-and-bone',
      'muzzle-and-ring',
      'foreground-horn',
    ].map((id) => [id, { rotate: deg, at: NECK, dy }]),
  );
const whole = (deg, pivot, dy = 0) => ({ [R]: { rotate: deg, pivot, dy } });
const pose = {
  idle0: {},
  idle1: { parts: head(-4) },
  crouch: {
    parts: { ...whole(4, [0.9, 1]), ...head(18, 10) },
    overlays: [{ in: R, svg: dust(150, 640, 40, -1, 10) }],
  },
  charge: {
    parts: { ...whole(5, [0.85, 1]), ...head(22) },
    overlays: [{ in: R, svg: speed(-80, 280, 150, 3, 14) }],
  },
  leap: { parts: { ...whole(-10, [0.5, 1]), ...head(-6) } },
  dazed: {
    parts: head(26, 20),
    overlays: [{ in: R, svg: stars(700, 40, 40, 10) }],
  },
  hurt: { parts: head(-14), tint: HURT },
  dead: { parts: { [R]: { sy: -1, pivot: [0.5, 0.55] } }, tint: DEAD },
};
export default {
  svg: 'scripts/art/svg/buffalo.svg',
  frames: Object.entries(pose).map(([k, v]) => ({
    key: 'boss2-' + k,
    w: 100,
    h: 66,
    box: [0, 2, 100, 62],
    ...v,
  })),
};
