import { describe, expect, it } from 'vitest';
import { TILE } from '../src/level-data';
import { parseLevel, waveState } from '../src/level-parse';
import { standable } from './level-graph';

// قلعة قايتباي, played with the enemies on (v2.0.4 playtest).
const L = parseLevel(15);
const floorBelow = (col: number, row: number) => {
  let r = row + 1;
  while (r < L.meta.rows.length && !standable(L.at(col, r))) r++;
  return r;
};

describe('قلعة قايتباي with enemies', () => {
  it('leaves a real gap through every run of waves on the path', () => {
    const w = L.meta.waves!;
    // Waves within 6 columns of each other on the same row form one run.
    const sorted = [...L.waves].sort((a, b) => a.col - b.col);
    const groups: (typeof sorted)[] = [];
    for (const v of sorted) {
      const g = groups.find(
        (x) => x[0].row === v.row && v.col - x[x.length - 1].col <= 6,
      );
      if (g) g.push(v);
      else groups.push([v]);
    }
    for (const g of groups) {
      // From a standstill three columns before the first wave, running
      // (245 px/s) with the real slow pick-up on wet tiles: how many start
      // times get through without a crash on top of بلبل?
      const x0 = (g[0].col - 3) * TILE,
        goal = (g[g.length - 1].col + 2) * TILE;
      let ok = 0;
      const tries = 100;
      for (let i = 0; i < tries; i++) {
        let x = x0,
          v = 0,
          t = (i / tries) * w.period,
          hit = false;
        while (x < goal && !hit) {
          const wet = L.at(Math.floor(x / TILE), g[0].row + 1) === '$';
          v = Math.min(245, v + (wet ? 240 : 1000) / 60);
          x += v / 60;
          t += 1 / 60;
          hit = g.some(
            (q) =>
              Math.abs(x - (q.col * TILE + 12)) < 30 + 12 &&
              waveState(w, q.col, t) === 'crash',
          );
        }
        if (!hit) ok++;
      }
      expect(ok / tries, `waves at ${g.map((q) => q.col)}`).toBeGreaterThan(
        0.25,
      );
    }
  });
  it('keeps the storm gulls above head height', () => {
    for (const e of L.enemies.filter((x) => x.kind === 'skua')) {
      // At least three clear rows between the gull and the floor under it,
      // so it never sits on the walkway itself.
      expect(
        floorBelow(e.col, e.row) - e.row - 1,
        `gull ${e.col},${e.row}`,
      ).toBeGreaterThanOrEqual(3);
      // …and not right over a tall step, the only way up.
      for (let c = e.col - 2; c <= e.col + 2; c++)
        expect(
          Math.abs(floorBelow(c, e.row) - floorBelow(c + 1, e.row)),
          `gull ${e.col},${e.row} over the step at ${c}`,
        ).toBeLessThan(3);
    }
  });
  it('keeps one beach ball on the bastion, not a crowd at the climb', () => {
    const top = L.enemies.filter(
      (e) => e.kind === 'ball' && e.col >= 90 && e.col <= 125,
    );
    expect(top.length).toBe(1);
  });
});
