import { describe, expect, it } from 'vitest';
import { LEVELS } from '../src/level-data';
import { SOLID, parseLevel } from '../src/level-parse';
import { onSurface, reach, standable } from './level-graph';

describe('authored levels', () => {
  it('has four distinct levels', () => {
    expect(LEVELS.length).toBe(4);
    expect(new Set(LEVELS.map((l) => l.theme)).size).toBe(4);
    expect(new Set(LEVELS.map((l) => l.mechanic)).size).toBe(4);
  });
  LEVELS.forEach((meta, index) => {
    const L = parseLevel(index);
    describe(`${index + 1} ${meta.name}`, () => {
      const { S, seen, first } = reach(L);
      it('is a well-formed grid with one start and one exit', () => {
        expect(meta.rows.every((r) => r.length === L.cols)).toBe(true);
        const all = meta.rows.join('');
        expect(all.split('P').length - 1).toBe(1);
        expect(all.split('E').length - 1).toBe(1);
        expect(all.split('G').length - 1, 'one golden fanoos secret').toBe(1);
        expect(first).toBeGreaterThanOrEqual(0);
      });
      it('the exit can be reached from the start', () => {
        expect(
          onSurface(S, seen, L.exit.col, L.exit.row, [1, 1]),
          JSON.stringify(L.exit),
        ).toBe(true);
      });
      it('the secret, checkpoint and every lantern are reachable', () => {
        expect(onSurface(S, seen, L.secret!.col, L.secret!.row, [1, 4])).toBe(
          true,
        );
        if (L.checkpoint)
          expect(
            onSurface(S, seen, L.checkpoint.col, L.checkpoint.row, [1, 1]),
          ).toBe(true);
        for (const l of L.lanterns)
          expect(
            onSurface(S, seen, l.col, l.row, [1, 1]),
            `lantern ${l.col},${l.row}`,
          ).toBe(true);
      });
      it('every box can be bumped from below (both forms)', () => {
        for (const b of L.boxes) {
          const ok = S.some(
            (s, i) =>
              seen.has(i) &&
              s.c0 <= b.col &&
              s.c1 >= b.col &&
              s.row - b.row - 1 >= 3 &&
              s.row - b.row - 1 <= 4 &&
              [...Array(s.row - b.row - 1)].every(
                (_, k) => !SOLID.has(L.at(b.col, b.row + 1 + k)),
              ),
          );
          expect(ok, `box ${b.col},${b.row}`).toBe(true);
        }
      });
      it('every coin is reachable and none is embedded', () => {
        for (const c of L.coins) {
          expect(SOLID.has(L.at(c.col, c.row))).toBe(false);
          const near = S.some(
            (s, i) =>
              seen.has(i) &&
              c.col >= s.c0 - 2 &&
              c.col <= s.c1 + 2 &&
              s.row - c.row >= 1 &&
              s.row - c.row <= (s.bounce ? s.bounce + 1 : 6),
          );
          const onLine = L.lines.some(({ a, b }) => {
            const t = Math.max(
              0,
              Math.min(
                1,
                ((c.x - a.x) * (b.x - a.x) + (c.y - a.y) * (b.y - a.y)) /
                  ((b.x - a.x) ** 2 + (b.y - a.y) ** 2),
              ),
            );
            return (
              Math.hypot(
                a.x + t * (b.x - a.x) - c.x,
                a.y + t * (b.y - a.y) - c.y,
              ) < 50
            );
          });
          expect(near || onLine, `coin ${c.col},${c.row}`).toBe(true);
        }
      });
      it('every ghost ledge has a lantern in range', () => {
        for (const g of L.ghosts)
          expect(
            L.lanterns.some(
              (l) =>
                Math.hypot(l.col - g.col, l.row - g.row) <=
                (meta.lanternRadius ?? 0),
            ),
            `ghost ${g.col},${g.row}`,
          ).toBe(true);
      });
      it('enemies stand on something or fly', () => {
        for (const e of L.enemies) {
          if (['bat', 'pigeon'].includes(e.kind)) continue;
          expect(
            standable(L.at(e.col, e.row + 1)),
            `${e.kind} ${e.col},${e.row}`,
          ).toBe(true);
        }
      });
    });
  });
  it('each level has its own signature pieces', () => {
    const [a, b, c, d] = LEVELS.map((_, i) => parseLevel(i));
    expect(a.lanterns.length).toBeGreaterThanOrEqual(5);
    expect(a.ghosts.length).toBeGreaterThan(10);
    expect(b.awnings.length).toBeGreaterThan(6);
    expect(b.carts.length).toBeGreaterThanOrEqual(3);
    expect(b.crates.length).toBeGreaterThanOrEqual(6);
    expect(c.lines.length).toBeGreaterThanOrEqual(2);
    expect(c.dishes.length).toBeGreaterThanOrEqual(2);
    expect(c.wind.length).toBeGreaterThanOrEqual(1);
    expect(c.rows).toBeGreaterThan(40);
    expect(d.lifts.length + d.planks.length).toBeGreaterThanOrEqual(3);
    expect(d.boss).toBeTruthy();
    expect(d.meta.water).toBeTruthy();
    expect(
      new Set(
        [a, b, c, d].map((l) =>
          l.enemies
            .map((e) => e.kind)
            .sort()
            .join(),
        ),
      ),
    ).toHaveProperty('size', 4);
  });
});
