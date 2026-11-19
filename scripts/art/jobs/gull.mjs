// ريّس النوة (Alexandria storm gull boss), QuiverAI art, facing left.
import { stars, dust, HURT, DEAD } from './common.mjs';
const R = 'flying-sailor-bird';
const wings = (near, far = near) => ({
  'near-raised-wing': { pivot: [0.15, 0.95], ...near },
  'far-raised-wing': { pivot: [0.8, 0.95], ...far },
});
const down = wings({ sy: -0.55 }, { sy: -0.5 });
const wind =
  '<g stroke="#e8f6ff" stroke-width="12" stroke-linecap="round" fill="none"><path d="M-60 260 q-60 -20 -120 0"/><path d="M-40 360 q-80 -30 -160 0"/><path d="M-60 460 q-60 -20 -120 0"/></g>';
const pose = {
  idle0: {},
  idle1: { parts: down },
  tell: {
    parts: {
      ...wings({ rotate: 4 }, { rotate: 4 }),
      [R]: { rotate: 8, sx: 0.88, sy: 0.88, pivot: [0.5, 0.7] },
    },
  },
  dive: {
    parts: {
      ...wings({ sy: 0.6 }, { sy: 0.6 }),
      [R]: { rotate: -35, pivot: [0.5, 0.5] },
    },
  },
  stuck: {
    parts: {
      ...wings({ rotate: 20 }, { rotate: 16 }),
      [R]: { rotate: -42, sx: 0.78, sy: 0.78, pivot: [0.5, 0.5], dy: 60 },
    },
    overlays: [{ in: R, svg: stars(300, -40, 30, 9) }],
  },
  gust: {
    parts: {
      ...wings({ rotate: -28 }, { rotate: -24 }),
      [R]: { sx: 0.9, sy: 0.9, pivot: [0.6, 1] },
    },
    overlays: [{ in: R, svg: wind }],
  },
  hurt: { parts: down, tint: HURT },
  dead: {
    parts: { ...down, [R]: { sx: 0.85, sy: -0.85, pivot: [0.5, 0.5] } },
    tint: DEAD,
  },
};
export default {
  svg: 'scripts/art/svg/gull.svg',
  frames: Object.entries(pose).map(([k, v]) => ({
    key: 'boss4-' + k,
    w: 140,
    h: 96,
    box: [8, 2, 124, 84],
    ...v,
  })),
};
