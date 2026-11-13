import { TILE } from '../src/level-data';
import {
  BELT,
  BOAT,
  BOUNCE,
  LAMP,
  LEDGE,
  STACK,
  MOVERS,
  SAQIA,
  SOLID,
  WATER,
  type Parsed,
} from '../src/level-parse';
import { PHYSICS } from '../src/levels';

/** Rows the hero can rise with a normal jump (96px apex → 3 full tiles). */
const RISE = 3;
const bounceRows = (v: number) =>
  Math.floor((v * v) / (2 * PHYSICS.gravity) / TILE) - 1;

export interface Surface {
  row: number;
  c0: number;
  c1: number;
  bounce: number;
  solid: boolean;
  /** Mud: a weak jump (one row up, short gaps). */
  mud?: boolean;
  /** Conveyor belt: it may push against you, so shorter gaps. */
  belt?: boolean;
  /** Climbable net: climb anywhere within it; short hops off it. */
  net?: boolean;
}
export const standable = (ch: string) =>
  SOLID.has(ch) || LEDGE.has(ch) || ch === 'X' || ch === 'D';

export function surfaces(L: Parsed): Surface[] {
  type Cell = {
    bounce: number;
    solid: boolean;
    mud?: boolean;
    belt?: boolean;
    net?: boolean;
  };
  const cell = new Map<string, Cell>();
  const key = (c: number, r: number) => c + ',' + r;
  const free = (c: number, r: number) => !SOLID.has(L.at(c, r));
  for (let r = 0; r < L.rows; r++)
    for (let c = 0; c < L.cols; c++) {
      const ch = L.at(c, r);
      if (
        !standable(ch) ||
        !free(c, r - 1) ||
        !free(c, r - 2) ||
        !free(c, r - 3)
      )
        continue;
      const bounce =
        ch === 'A'
          ? bounceRows(BOUNCE.awning)
          : ch === 'D'
            ? bounceRows(BOUNCE.dish)
            : 0;
      cell.set(key(c, r), {
        bounce,
        solid: SOLID.has(ch),
        mud: ch === 'u',
        belt: ch in BELT,
      });
    }
  const tideAmp = L.meta.tide?.amp ?? 0;
  // Sea: swim at the surface, modelled at low tide (the hardest case).
  for (const k of L.seas)
    for (let c = k.c0; c <= k.c1; c++)
      cell.set(key(c, k.topRow + tideAmp + 1), { bounce: 0, solid: false });
  // Boats drift between their markers, decks one row above low water.
  for (const b of L.boats) {
    const sea = L.seas.find((k) => b.a.col >= k.c0 && b.a.col <= k.c1)!;
    for (let c = b.a.col; c < b.endCol + BOAT.width; c++)
      cell.set(key(c, sea.topRow + tideAmp - 1), { bounce: 0, solid: false });
  }
  // Furniture stacks: stand on top; once toppled they bridge to the right.
  for (const p of L.stacks) {
    cell.set(key(p.col, p.row - STACK.height + 1), { bounce: 0, solid: true });
    for (let c = p.col + 1; c <= p.col + STACK.bridge; c++)
      cell.set(key(c, p.row), { bounce: 0, solid: false });
  }
  // Nets: every net cell is a place to hang (standing row = the cell's row).
  for (const n of L.nets)
    cell.set(key(n.col, n.row + 1), { bounce: 0, solid: false, net: true });
  // Swinging lamps: sample the arc of the platform.
  for (const p of L.lamps)
    for (let k = 0; k <= 8; k++) {
      const a = -LAMP.amp + (k / 8) * LAMP.amp * 2,
        x = p.x + Math.sin(a) * LAMP.length * TILE,
        y = p.y + Math.cos(a) * LAMP.length * TILE;
      const half = (LAMP.width * TILE) / 2,
        row = Math.floor(y / TILE);
      for (
        let c = Math.floor((x - half) / TILE);
        c <= Math.floor((x + half - 1) / TILE);
        c++
      )
        cell.set(key(c, row), { bounce: 0, solid: false });
    }
  // Canals: you float at the surface and can swim-jump out, modelled
  // conservatively as standing one row below the water's top row.
  for (const k of L.canals)
    for (let c = k.c0; c <= k.c1; c++)
      if (L.at(c, k.topRow) in WATER)
        cell.set(key(c, k.topRow + 1), { bounce: 0, solid: false });
  // Movers cover their whole travel.
  const span = (
    p: { col: number; row: number },
    m: { width: number; range: number },
    vertical: boolean,
  ) => {
    if (vertical)
      for (let r = p.row - m.range; r <= p.row; r++)
        for (let c = p.col; c < p.col + m.width; c++)
          cell.set(key(c, r), { bounce: 0, solid: false });
    else
      for (let c = p.col; c < p.col + m.width + m.range; c++)
        cell.set(key(c, p.row), { bounce: 0, solid: false });
  };
  L.carts.forEach((p) => span(p, MOVERS.cart, false));
  L.planks.forEach((p) => span(p, MOVERS.plank, false));
  L.lifts.forEach((p) => span(p, MOVERS.lift, true));
  // Donkey carts ride from their start to the end marker.
  for (const d of L.donkeys)
    for (let c = d.a.col; c <= d.endCol; c++)
      cell.set(key(c, d.a.row), { bounce: 0, solid: false });
  // Saqia buckets sweep the whole wheel: sample the circle.
  for (const w of L.saqias)
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2,
        x = w.x + Math.cos(a) * SAQIA.radius * TILE,
        y = w.y + Math.sin(a) * SAQIA.radius * TILE;
      const half = (SAQIA.width * TILE) / 2,
        row = Math.floor(y / TILE);
      for (
        let c = Math.floor((x - half) / TILE);
        c <= Math.floor((x + half - 1) / TILE);
        c++
      )
        cell.set(key(c, row), { bounce: 0, solid: false });
    }
  const out: Surface[] = [];
  for (let r = 0; r < L.rows; r++) {
    let cur: Surface | null = null;
    for (let c = 0; c <= L.cols; c++) {
      const v = cell.get(key(c, r));
      if (
        v &&
        cur &&
        cur.bounce === v.bounce &&
        cur.solid === v.solid &&
        !!cur.mud === !!v.mud &&
        !!cur.belt === !!v.belt &&
        !!cur.net === !!v.net
      ) {
        cur.c1 = c;
      } else {
        if (cur) out.push(cur);
        cur = v
          ? {
              row: r,
              c0: c,
              c1: c,
              bounce: v.bounce,
              solid: v.solid,
              mud: v.mud,
              belt: v.belt,
              net: v.net,
            }
          : null;
      }
    }
  }
  return out;
}
export function canJump(u: Surface, v: Surface) {
  const rise = u.row - v.row;
  let gap = Math.max(0, v.c0 - u.c1 - 1, u.c0 - v.c1 - 1);
  const overlap = v.c0 <= u.c1 && u.c0 <= v.c1;
  if (rise > 0 && overlap && v.solid) {
    // A solid block overhead: you must jump from beyond its edge.
    if (u.c0 < v.c0 || u.c1 > v.c1) gap = 1;
    else return false;
  }
  if (u.net && v.net && overlap) return true;
  if (u.net) return rise <= 2 && gap <= 2 + Math.max(0, Math.floor(-rise / 2));
  if (u.bounce) return rise <= u.bounce && gap <= 5;
  if (u.belt && rise <= RISE && gap > 4) return false;
  if (u.mud) return rise <= 1 && gap <= 3 + Math.max(0, Math.floor(-rise / 2));
  if (rise > RISE) return false;
  if (rise <= 0) return gap <= 5 + Math.floor(-rise / 2);
  return gap <= [5, 4, 3, 2][rise];
}
export function reach(L: Parsed) {
  const S = surfaces(L);
  const startRow = L.start.row + 1;
  const first = S.findIndex(
    (s) => s.row === startRow && s.c0 <= L.start.col && s.c1 >= L.start.col,
  );
  const seen = new Set<number>([first]);
  const edges = (i: number) => {
    const u = S[i],
      next: number[] = [];
    S.forEach((v, j) => j !== i && canJump(u, v) && next.push(j));
    // Zip lines: grab the start, ride to the end, drop to anything below it.
    for (const { a, b } of L.lines) {
      const hands = u.row - a.row;
      if (hands >= 1 && hands <= 5 && a.col >= u.c0 - 2 && a.col <= u.c1 + 2)
        S.forEach((v, j) => {
          if (
            v.row > b.row &&
            v.row - b.row <= 12 &&
            b.col >= v.c0 - 3 &&
            b.col <= v.c1 + 3
          )
            next.push(j);
        });
    }
    return next;
  };
  const queue = [first];
  while (queue.length)
    for (const j of edges(queue.shift()!))
      if (!seen.has(j)) {
        seen.add(j);
        queue.push(j);
      }
  return { S, seen, first };
}
export const onSurface = (
  S: Surface[],
  seen: Set<number>,
  col: number,
  row: number,
  below: [number, number],
) =>
  S.some(
    (s, i) =>
      seen.has(i) &&
      s.c0 <= col &&
      s.c1 >= col &&
      s.row - row >= below[0] &&
      s.row - row <= below[1],
  );
