// Pure parsing of authored level maps (shared by the scene and the tests).
import { LEVELS, TILE, type LevelMeta } from './level-data';

export const SOLID = new Set(['#', '=', 'B', '?', 'F', 'C', 'S', 'T']);
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
};
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
  };
  const starts: Pt[] = [],
    ends: Pt[] = [];
  const windCells: Pt[] = [];
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
          case 'Q':
            out.fakes.push(p);
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
export const BOUNCE = {
  awning: 700,
  awningHold: 790,
  dish: 640,
  dishHold: 720,
};
