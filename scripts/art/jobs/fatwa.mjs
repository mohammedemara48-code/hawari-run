// الفتوة برعي (Cairo alley bully cat boss), QuiverAI art, front view.
import { stars, dust, HURT, DEAD } from './common.mjs';
const R = 'dapper-tabby-cat';
const HEAD = [
  'fez-and-tassel',
  'tabby-head',
  'ears',
  'expressive-eyes',
  'smile-and-gold-tooth',
  'pink-nose',
  'sweeping-moustache',
  'cheek-and-chin-details',
];
const NECK = [560, 420];
const head = (rotate, dy = 0) =>
  Object.fromEntries(HEAD.map((id) => [id, { rotate, at: NECK, dy }]));
const pose = {
  idle0: {},
  idle1: { parts: head(0, 10) },
  crouch: {
    parts: { [R]: { sx: 1.06, sy: 0.86, pivot: [0.5, 1] } },
    overlays: [
      { in: R, svg: dust(300, 950, 50, -1, 14) + dust(800, 950, 50, 1, 14) },
    ],
  },
  leap: {
    parts: { [R]: { sx: 0.94, sy: 0.97, pivot: [0.5, 1] }, hands: { dy: -50 } },
  },
  dazed: {
    parts: head(-12),
    overlays: [{ in: R, svg: stars(380, -40, 50, 12) }],
  },
  hurt: { parts: head(10), tint: HURT },
  throw: {
    parts: {
      [R]: { rotate: -8, pivot: [0.5, 1] },
      hands: { dy: -90, rotate: -10 },
      ...head(-6),
    },
  },
  dead: {
    parts: {
      [R]: { rotate: 90, sx: 0.72, sy: 0.72, pivot: [0.5, 0.5], dy: 52 },
    },
    tint: DEAD,
  },
};
export default {
  svg: 'scripts/art/svg/fatwa.svg',
  frames: Object.entries(pose).map(([k, v]) => ({
    key: 'boss-' + k,
    w: 78,
    h: 64,
    box: [0, 1, 78, 63],
    ...v,
  })),
};
