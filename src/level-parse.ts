// Pure parsing of authored level maps (shared by the scene and the tests).
import { LEVELS, TILE, type LevelMeta } from './level-data';

export const SOLID = new Set([
  '#',
  '=',
  'B',
  '?',
  'F',
  'C',
  'S',
  'T',
  'N',
  'u',
  '{',
  '}',
  '$',
]);
export const LEDGE = new Set(['-', '~', 'A']);
export const BOXES: Record<string, string> = {
  '?': 'coin',
  F: 'food',
  C: 'chili',
  S: 'invincible',
  i: 'coin',
};
export const ENEMY: Record<string, string> = {
  g: 'cat',
  b: 'bug',
  k: 'basket',
  t: 'bat',
  r: 'rooster',
  p: 'pigeon',
  m: 'rat',
  q: 'buffalo',
  n: 'goose',
  v: 'crow',
  a: 'crab',
  l: 'gull',
  d: 'saw',
  e: 'plane',
  f: 'thief',
  '1': 'skua',
  '2': 'jelly',
  '3': 'brolly',
  '4': 'ball',
};
/** Flying enemies ignore gravity and floors (jellyfish swim). */
export const FLYING = new Set([
  'bat',
  'pigeon',
  'crow',
  'gull',
  'skua',
  'jelly',
  'brolly',
]);
/** Conveyor belts: push direction per cell. */
export const BELT: Record<string, number> = { '}': 1, '{': -1 };
/** Canal water: current direction per cell. */
export const WATER: Record<string, number> = { w: 1, x: -1 };
export interface Pt {
  col: number;
  row: number;
  x: number;
  y: number;
}
export interface Parsed {
  meta: LevelMeta;
  cols: number;
  rows: number;
  width: number;
  height: number;
  at: (col: number, row: number) => string;
  start: Pt;
  exit: Pt;
  checkpoint?: Pt;
  boss?: Pt;
  secret?: Pt;
  tank?: Pt;
  boxes: (Pt & { content: string; hidden: boolean })[];
  bricks: Pt[];
  coins: Pt[];
  lanterns: Pt[];
  ghosts: Pt[];
  awnings: Pt[];
  crates: Pt[];
  dishes: Pt[];
  carts: Pt[];
  planks: Pt[];
  lifts: Pt[];
  spikes: Pt[];
  fakes: Pt[];
  enemies: (Pt & { kind: string })[];
  lines: { a: Pt; b: Pt }[];
  wind: { x0: number; x1: number; y0: number; y1: number; dir: number }[];
  saqias: Pt[];
  donkeys: { a: Pt; endCol: number }[];
  /** Canal water bodies: pixel rect of the water plus current direction. */
  canals: {
    x0: number;
    x1: number;
    top: number;
    bottom: number;
    dir: number;
    topRow: number;
    c0: number;
    c1: number;
  }[];
  /** World 3: conveyor runs, lamp pivots, furniture stacks, boats, nets, sea. */
  belts: { row: number; c0: number; c1: number; dir: number }[];
  lamps: Pt[];
  stacks: Pt[];
  boats: { a: Pt; endCol: number }[];
  nets: Pt[];
  seas: {
    x0: number;
    x1: number;
    top: number;
    bottom: number;
    topRow: number;
    c0: number;
    c1: number;
  }[];
  /** World 4: wave spots, the tram run, wires/bridges, umbrella stands. */
  waves: Pt[];
  trams: { a: Pt; endCol: number }[];
  /** Hazard rects (px) of overhead wires ('|') and low bridges (':'). */
  wires: { x0: number; x1: number; y0: number; y1: number; bridge: boolean }[];
  stands: Pt[];
}
const pt = (col: number, row: number): Pt => ({
  col,
  row,
  x: col * TILE + TILE / 2,
  y: row * TILE + TILE / 2,
});
export function parseLevel(index: number): Parsed {
  const meta = LEVELS[index],
    grid = meta.rows,
    rows = grid.length,
    cols = grid[0].length;
  const at = (c: number, r: number) =>
    r < 0 || c < 0 || c >= cols ? '#' : r >= rows ? '.' : grid[r][c];
  const out: Parsed = {
    meta,
    cols,
    rows,
    width: cols * TILE,
    height: rows * TILE,
    at,
    start: pt(1, rows - 3),
    exit: pt(cols - 2, rows - 3),
    boxes: [],
    bricks: [],
    coins: [],
    lanterns: [],
    ghosts: [],
    awnings: [],
    crates: [],
    dishes: [],
    carts: [],
    planks: [],
    lifts: [],
    spikes: [],
    fakes: [],
    enemies: [],
    lines: [],
    wind: [],
    saqias: [],
    donkeys: [],
    canals: [],
    belts: [],
    lamps: [],
    stacks: [],
    boats: [],
    nets: [],
    seas: [],
    waves: [],
    trams: [],
    wires: [],
    stands: [],
  };
  const carts: Pt[] = [],
    cartEnds: Pt[] = [];
  const starts: Pt[] = [],
    ends: Pt[] = [];
  const windCells: Pt[] = [];
  const boats: Pt[] = [],
    boatEnds: Pt[] = [];
  const trams: Pt[] = [],
    tramEnds: Pt[] = [];
  let tankSeen = false;
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const ch = grid[r][c],
        p = pt(c, r);
      if (ch in BOXES)
        out.boxes.push({ ...p, content: BOXES[ch], hidden: ch === 'i' });
      else if (ch in ENEMY) out.enemies.push({ ...p, kind: ENEMY[ch] });
      else
        switch (ch) {
          case 'P':
            out.start = p;
            break;
          case 'E':
            out.exit = p;
            break;
          case 'c':
            out.checkpoint = p;
            break;
          case 'Z':
            out.boss = p;
            break;
          case 'G':
            out.secret = p;
            break;
          case 'T':
            if (!tankSeen) out.tank = p;
            tankSeen = true;
            break;
          case 'B':
            out.bricks.push(p);
            break;
          case 'o':
            out.coins.push(p);
            break;
          case 'L':
            out.lanterns.push(p);
            break;
          case '~':
            out.ghosts.push(p);
            break;
          case 'A':
            out.awnings.push(p);
            break;
          case 'X':
            out.crates.push(p);
            break;
          case 'D':
            out.dishes.push(p);
            break;
          case 'K':
            out.carts.push(p);
            break;
          case 'M':
            out.planks.push(p);
            break;
          case 'V':
            out.lifts.push(p);
            break;
          case '^':
            out.spikes.push(p);
            break;
          case 'W':
            out.saqias.push(p);
            break;
          case 'Y':
            carts.push(p);
            break;
          case 'O':
            out.lamps.push(p);
            break;
          case 'R':
            out.stacks.push(p);
            break;
          case '%':
            out.nets.push(p);
            break;
          case 'U':
            boats.push(p);
            break;
          case 'I':
            boatEnds.push(p);
            break;
          case 'y':
            cartEnds.push(p);
            break;
          case 'Q':
            out.fakes.push(p);
            break;
          case '*':
            out.waves.push(p);
            break;
          case '&':
            trams.push(p);
            break;
          case '+':
            tramEnds.push(p);
            break;
          case '(':
            out.stands.push(p);
            break;
          case 'H':
          case 'J':
            starts.push({ ...p, tag: ch.toLowerCase() } as Pt);
            break;
          case 'h':
          case 'j':
            ends.push({ ...p, tag: ch } as Pt);
            break;
          case '>':
          case '<':
            windCells.push({ ...p, col: c * (ch === '>' ? 1 : -1) });
            break;
        }
    }
  // Donkey carts run along their row to the nearest end marker on the right.
  for (const a of carts) {
    const end = cartEnds
      .filter((e) => e.row === a.row && e.col > a.col)
      .sort((x, y) => x.col - y.col)[0];
    out.donkeys.push({ a, endCol: end ? end.col : a.col + 8 });
  }
  for (const a of boats) {
    const end = boatEnds
      .filter((e) => e.row === a.row && e.col > a.col)
      .sort((x, y) => x.col - y.col)[0];
    out.boats.push({ a, endCol: end ? end.col : a.col + 6 });
  }
  for (const a of trams) {
    const end = tramEnds
      .filter((e) => e.row === a.row && e.col > a.col)
      .sort((x, y) => x.col - y.col)[0];
    out.trams.push({ a, endCol: end ? end.col : a.col + 20 });
  }
  // Wires and bridges: per horizontal run; the hazard stops 16px above the
  // bottom of the lowest cell, so a crouching hero on the tram passes under.
  for (const ch of ['|', ':'])
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        if (grid[r][c] !== ch || grid[r - 1]?.[c] === ch) continue;
        let c1 = c;
        while (
          c1 + 1 < cols &&
          grid[r][c1 + 1] === ch &&
          grid[r - 1]?.[c1 + 1] !== ch
        )
          c1++;
        let r1 = r;
        while (r1 + 1 < rows && grid[r1 + 1][c] === ch) r1++;
        out.wires.push({
          x0: c * TILE,
          x1: (c1 + 1) * TILE,
          y0: r * TILE,
          y1: (r1 + 1) * TILE - WIRE.gap,
          bridge: ch === ':',
        });
        c = c1;
      }
  // Conveyor belts: horizontal runs of one direction.
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const ch = grid[r][c];
      if (!(ch in BELT)) continue;
      let c1 = c;
      while (c1 + 1 < cols && grid[r][c1 + 1] === ch) c1++;
      out.belts.push({ row: r, c0: c, c1, dir: BELT[ch] });
      c = c1;
    }
  // Sea: contiguous water runs in their top (high-tide) row. Boat markers
  // sit in the water and count as sea.
  const isSea = (ch: string | undefined) =>
    ch === 's' || ch === 'U' || ch === 'I' || ch === '2';
  for (let r = 0; r < rows; r++) {
    let c = 0;
    while (c < cols) {
      if (isSea(grid[r][c]) && !isSea(grid[r - 1]?.[c])) {
        let c1 = c;
        while (
          c1 + 1 < cols &&
          isSea(grid[r][c1 + 1]) &&
          !isSea(grid[r - 1]?.[c1 + 1])
        )
          c1++;
        let r1 = r;
        while (r1 + 1 < rows && isSea(grid[r1 + 1][c])) r1++;
        out.seas.push({
          x0: c * TILE,
          x1: (c1 + 1) * TILE,
          top: r * TILE,
          bottom: (r1 + 1) * TILE,
          topRow: r,
          c0: c,
          c1,
        });
        c = c1 + 1;
      } else c++;
    }
  }
  // Canals: contiguous runs of water in their top row.
  for (let r = 0; r < rows; r++) {
    let c = 0;
    while (c < cols) {
      const ch = grid[r][c];
      const above = r > 0 ? grid[r - 1][c] : '.';
      if (ch in WATER && !(above in WATER)) {
        let c1 = c;
        while (
          c1 + 1 < cols &&
          grid[r][c1 + 1] === ch &&
          !(grid[r - 1]?.[c1 + 1] in WATER)
        )
          c1++;
        let r1 = r;
        while (r1 + 1 < rows && grid[r1 + 1][c] in WATER) r1++;
        out.canals.push({
          x0: c * TILE,
          x1: (c1 + 1) * TILE,
          top: r * TILE,
          bottom: (r1 + 1) * TILE,
          dir: WATER[ch],
          topRow: r,
          c0: c,
          c1,
        });
        c = c1 + 1;
      } else c++;
    }
  }
  // Each zip line runs from H to h (or J to j).
  type Tagged = Pt & { tag?: string };
  for (const a of starts as Tagged[]) {
    const b = (ends as Tagged[]).find((e) => e.tag === a.tag);
    if (b) out.lines.push({ a, b });
  }
  // Wind: merge cells into bounding boxes per direction.
  for (const dir of [1, -1]) {
    const cells = windCells.filter(
      (w) => Math.sign(w.col) === dir || (w.col === 0 && dir === 1),
    );
    if (!cells.length) continue;
    out.wind.push({
      x0: Math.min(...cells.map((c) => c.x)) - TILE / 2,
      x1: Math.max(...cells.map((c) => c.x)) + TILE / 2,
      y0: Math.min(...cells.map((c) => c.y)) - TILE / 2,
      y1: Math.max(...cells.map((c) => c.y)) + TILE / 2,
      dir,
    });
  }
  return out;
}
/** Moving-object geometry shared with the scene. */
export const MOVERS = {
  cart: { width: 3, range: 4, speed: 52 },
  plank: { width: 2, range: 4, speed: 46 },
  lift: { width: 2, range: 5, speed: 40 },
};
/** World 2 mechanics, shared by the scene and the reachability tests. */
export const SAQIA = { radius: 3, buckets: 4, width: 2, speed: 0.55 };
export const DONKEY = { width: 4, speed: 115, back: 70 };
export const MUD = { speed: 0.5, jump: 0.78 };
export const CANAL = { current: 85, swimJump: 460 };
/** World 3 mechanics. */
export const BELT_SPEED = 80;
/** Pendulum lamp: chain length (tiles), platform width, swing (rad, rad/s). */
export const LAMP = { length: 3, width: 2, amp: 0.85, speed: 1.7 };
/** Furniture stack: tiles tall, bridge length once toppled, wobble (ms). */
export const STACK = { height: 3, bridge: 3, delay: 650 };
export const BOAT = { width: 3, speed: 40, bob: 4 };
export const NET = { climb: 110, hop: 400 };
/** Sea surface y at time t (s): low tide at t = 0, high tide half a period on. */
export function tideY(
  sea: { top: number },
  tide: { amp: number; period: number } | undefined,
  t: number,
) {
  if (!tide) return sea.top;
  return (
    sea.top +
    tide.amp * TILE * (0.5 + 0.5 * Math.cos((2 * Math.PI * t) / tide.period))
  );
}
/** World 4 mechanics. The tram: tiles long and tall, speed (px/s). */
export const TRAM = { width: 8, height: 3, speed: 120 };
/** Wire/bridge hazards end this many px above their lowest cell's bottom. */
export const WIRE = { gap: 16 };
/** Umbrella glide: capped fall speed and how hard the wind pushes it. */
export const GLIDE = { fall: 70, wind: 1.9, lift: 520 };
/** Wet tiles: how fast you can change speed on them (vs 1000 / 1400). */
export const WET = { accel: 240, decel: 110 };
/** Default gusts (Cairo rooftops): push px/s, ms on, ms off. */
export const GUST = { push: 150, on: 2600, off: 1600 };
/** Is a wave at spot `col` breaking (or foaming) at time t (s)? */
export function waveState(
  w: { period: number; warn: number; crash: number },
  col: number,
  t: number,
): 'calm' | 'warn' | 'crash' {
  // Neighbouring spots break in a rolling sequence along the wall.
  const k = (((t + col * 0.29) % w.period) + w.period) % w.period;
  if (k < w.warn) return 'warn';
  if (k < w.warn + w.crash) return 'crash';
  return 'calm';
}
export const BOUNCE = {
  awning: 700,
  awningHold: 790,
  dish: 640,
  dishHold: 720,
};
