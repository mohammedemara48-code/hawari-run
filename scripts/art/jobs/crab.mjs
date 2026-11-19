// أبو مقص (Ras El Bar crab boss), QuiverAI art, front view.
import { stars, dust, drops, HURT, DEAD } from './common.mjs';
const claws = (l, r, dy = 0) => ({
  'left-claw': { rotate: l, pivot: [0.85, 0.95], dy },
  'right-claw': { rotate: r, pivot: [0.15, 0.95], dy },
});
const bubbles =
  '<g fill="#d8f4ff" stroke="#1b140f" stroke-width="3"><circle cx="200" cy="150" r="9"/><circle cx="214" cy="128" r="12"/><circle cx="196" cy="104" r="15"/></g>';
const pose = {
  idle0: {},
  idle1: { parts: { ...claws(-6, 6), 'rear-legs': { dy: 3 } } },
  guard: { parts: claws(38, -38, 10) },
  snap: { parts: { ...claws(-10, 10, -6), crab: { dy: -4 } } },
  stuck: {
    parts: claws(70, -70, 30),
    overlays: [
      {
        in: 'crab',
        svg:
          dust(70, 205, 16, -1, 3) +
          dust(330, 205, 16, 1, 3) +
          stars(150, -20, 14, 3),
      },
    ],
  },
  spit: { parts: claws(-10, 10), overlays: [{ in: 'crab', svg: bubbles }] },
  hurt: { parts: claws(-10, 10), tint: HURT },
  dead: { parts: { crab: { sy: -1, pivot: [0.5, 0.5] } }, tint: DEAD },
};
export default {
  svg: 'scripts/art/svg/crab.svg',
  frames: Object.entries(pose).map(([k, v]) => ({
    key: 'boss3-' + k,
    w: 124,
    h: 72,
    box: [0, 4, 124, 64],
    ...v,
  })),
};
