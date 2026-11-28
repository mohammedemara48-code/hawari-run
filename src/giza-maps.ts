// Giza stages 34-36, authored in the Super Mario Bros way: each stage teaches
// one idea in a safe spot, tests it, then mixes it with what came before.
// All coordinates are tiles. Floor is rows 15-16, the hero walks on row 14.
import { expandPilot } from './pilot-maps';

type G = ReturnType<typeof expandPilot>;
const base = (width: number, flag = width - 4) => {
  const g = expandPilot(
    Array.from({ length: 17 }, () => '.'.repeat(width)),
    [],
  );
  g.floor(0, width - 1);
  g.put(3, 14, 'P');
  g.put(flag, 14, 'E');
  return g;
};
const pit = (g: G, a: number, b: number, coins = true) => {
  g.run(a, b, 15, '.');
  g.run(a, b, 16, '.');
  if (coins) g.run(a, b, 12, 'o');
};
const ledge = (g: G, x: number, y: number, w: number) => {
  g.run(x, x + w - 1, y, '-');
  g.run(x + 1, x + w - 2, y - 1, 'o');
};
const stack = (g: G, x: number, w: number, h: number) => {
  for (let r = 0; r < h; r++) g.run(x, x + w - 1, 14 - r, '#');
  g.run(x, x + w - 1, 14 - h, 'o');
};
/** Question blocks between bricks, Mario style. */
const row = (g: G, x: number, y: number, pattern: string) =>
  [...pattern].forEach((c, i) => g.put(x + i, y, c));

/** 34. Valley Temple Road: teach. One enemy at a time, small pits, one mirror. */
export function gizaValley() {
  const g = base(210);
  g.put(9, 11, 'F');
  g.put(100, 14, 'c');
  // Lesson 1: a lone scarab on open ground, then coin blocks to bump.
  g.put(30, 14, '5');
  row(g, 38, 10, 'B?B?B');
  // Lesson 2: a short pit, then the same pit twice with a landing between.
  pit(g, 50, 52);
  pit(g, 66, 68);
  pit(g, 73, 75);
  g.put(58, 14, '5');
  // Lesson 3: a wall to climb in steps, scorpion waits behind it.
  stack(g, 84, 2, 1);
  stack(g, 88, 2, 2);
  g.put(96, 14, 'ق');
  // Optional high road with the hidden lantern.
  ledge(g, 60, 12, 6);
  ledge(g, 66, 9, 8);
  ledge(g, 76, 6, 8);
  g.put(80, 5, 'G');
  // Lesson 4: the first mirror, alone, no enemy. Gate far ahead.
  g.put(125, 11, '?');
  // After the gate: a victory run with a last pit and scarabs.
  pit(g, 160, 163);
  g.put(150, 14, '5');
  g.put(172, 14, '5');
  stack(g, 182, 4, 2);
  g.put(190, 14, 'b');
  return g.rows();
}
export const VALLEY = { stations: [120], gate: 145, target: [1] };

/** 35. Climbing Gallery: develop. Stairs, high ledges, two mirrors under pressure. */
export function gizaGallery() {
  const g = base(240);
  g.put(9, 11, 'F');
  g.put(104, 14, 'c');
  // Rising steps, then a ledge chain over a pit with a scarab below.
  for (const [x, h] of [
    [24, 1],
    [28, 2],
    [32, 3],
  ])
    stack(g, x, 3, h);
  pit(g, 38, 41);
  ledge(g, 36, 10, 7);
  // Mixed enemies in a row with space to react.
  g.put(55, 14, 'b');
  g.put(66, 14, 'ق');
  row(g, 58, 10, 'B?B');
  pit(g, 78, 81);
  pit(g, 86, 89);
  ledge(g, 78, 10, 4);
  // A beetle after the pit: land, then stomp.
  g.put(96, 14, 'b');
  // Two mirrors with a scarab walking between: do it under pressure.
  g.put(124, 14, '5');
  g.put(108, 11, '?');
  // Optional upper gallery with the lantern.
  ledge(g, 18, 12, 6);
  ledge(g, 24, 9, 6);
  ledge(g, 30, 6, 8);
  g.put(35, 5, 'G');
  // After the gate.
  pit(g, 180, 183);
  stack(g, 192, 3, 2);
  g.put(172, 14, '6');
  g.put(160, 14, 'b');
  g.put(196, 14, 'b');
  pit(g, 210, 213);
  g.put(220, 14, 'b');
  return g.rows();
}
export const GALLERY = { stations: [116, 124], gate: 150, target: [1, 3] };

/** 36. Horizon Court: test. A gap run, then the prism scarab arena. */
export function gizaHorizon() {
  const w = 270;
  const g = base(w, w - 4);
  const z = w - 12;
  g.put(9, 11, 'F');
  g.put(212, 14, 'c');
  g.put(z - 20, 11, '!');
  // Fast rhythm: pit, enemy, stack, repeat, with a clear beat between.
  for (const x of [30, 70, 110]) pit(g, x, x + 3);
  for (const x of [50, 90, 128]) stack(g, x, 3, 2);
  g.put(40, 14, '5');
  g.put(60, 14, 'ق');
  g.put(80, 14, '6');
  g.put(100, 14, 'b');
  // A choice: the lower road with enemies, or a ledge route over a cobra.
  ledge(g, 145, 10, 12);
  g.put(150, 9, '7');
  g.put(162, 14, 'b');
  g.put(170, 14, 'ق');
  pit(g, 178, 181);
  pit(g, 188, 191);
  ledge(g, 185, 11, 4);
  g.put(196, 14, 'b');
  g.put(206, 14, 'ق');
  stack(g, 214, 3, 2);
  // Optional lantern climb.
  ledge(g, 222, 12, 5);
  ledge(g, 228, 9, 6);
  g.put(232, 8, 'G');
  g.put(z, 14, 'Z');
  return g.rows();
}
export const HORIZON = {
  stations: [244, 248, 252],
  gate: 266,
  target: [1, 3, 2],
};
