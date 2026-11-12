import { describe, expect, it } from 'vitest';
import { heroBody } from '../src/hero-state';
import { levelSpec } from '../src/rules';
import { GROUND_TOP, PHYSICS, TILE, levelLayout } from '../src/levels';

interface Rect {
  left: number;
  right: number;
  top: number;
  bottom: number;
  kind: string;
}
const tile = (
  x: number,
  y: number,
  kind: string,
  w = TILE,
  h = TILE,
): Rect => ({
  left: x - w / 2,
  right: x + w / 2,
  top: y - h / 2,
  bottom: y + h / 2,
  kind,
});

/** Apex of a jump using Phaser Arcade's fixed 60 Hz integration (velocity first). */
export function apex(v0: number) {
  let v = -v0,
    y = 0,
    min = 0;
  for (let i = 0; i < 200; i++) {
    v += PHYSICS.gravity * PHYSICS.step;
    y += v * PHYSICS.step;
    min = Math.min(min, y);
  }
  return -min;
}

function world(index: number) {
  const spec = levelSpec(index),
    layout = levelLayout(index),
    solids: Rect[] = [];
  for (let x = 12; x < spec.width; x += 24)
    if (!spec.gaps.some(([a, b]) => x >= a && x < b))
      solids.push(tile(x, 324, 'ground'), tile(x, 348, 'ground'));
  for (const [x, y, n] of layout.platforms)
    for (let i = 0; i < n; i++) solids.push(tile(x + i * 24, y, 'platform'));
  for (const [x, y] of layout.steps) solids.push(tile(x, y, 'step'));
  for (const b of layout.blocks) solids.push(tile(b.x, b.y, b.kind));
  solids.push(tile(spec.portal, 282, 'tank', 48, 60));
  return { spec, layout, solids };
}

/** Merge solid tops into walkable surfaces (contiguous runs with nothing on top). */
function surfaces(solids: Rect[]) {
  const tops = solids
    .filter(
      (s) =>
        !solids.some(
          (o) =>
            o !== s &&
            o.bottom === s.top &&
            o.left < s.right &&
            o.right > s.left,
        ),
    )
    .sort((a, b) => a.top - b.top || a.left - b.left);
  const out: { left: number; right: number; top: number }[] = [];
  for (const s of tops) {
    const last = out[out.length - 1];
    if (last && last.top === s.top && last.right === s.left)
      last.right = s.right;
    else out.push({ left: s.left, right: s.right, top: s.top });
  }
  return out;
}

const SMALL_JUMP = apex(PHYSICS.jump);
const RUN_JUMP = apex(PHYSICS.runJump);

describe('jump physics', () => {
  it('reports the real jump heights', () => {
    const small = heroBody(false, false),
      big = heroBody(true, false);
    console.log(
      `apex walk ${SMALL_JUMP.toFixed(1)}px, run ${RUN_JUMP.toFixed(1)}px; ` +
        `head reach from ground: small ${(GROUND_TOP - small.height - SMALL_JUMP).toFixed(1)}, ` +
        `big ${(GROUND_TOP - big.height - SMALL_JUMP).toFixed(1)}`,
    );
    expect(SMALL_JUMP).toBeGreaterThan(95);
  });
});

for (const index of [0, 1]) {
  const { spec, layout, solids } = world(index);
  describe(`level ${index + 1}-${index ? 2 : 1} ${spec.name}`, () => {
    const boxes = layout.blocks.filter((b) => b.kind === 'box');
    it('has gold boxes and every one has contents', () => {
      expect(boxes.length).toBeGreaterThan(0);
      for (const b of boxes)
        expect(['coin', 'food', 'chili', 'invincible']).toContain(b.content);
      for (const b of layout.blocks.filter((b) => b.kind === 'brick'))
        expect(b.content).toBeUndefined();
    });
    it('has no overlapping or embedded solids', () => {
      for (let i = 0; i < solids.length; i++)
        for (let j = i + 1; j < solids.length; j++) {
          const a = solids[i],
            b = solids[j],
            hit =
              a.left < b.right &&
              a.right > b.left &&
              a.top < b.bottom &&
              a.bottom > b.top;
          expect(
            hit,
            `${a.kind}@${a.left},${a.top} overlaps ${b.kind}@${b.left},${b.top}`,
          ).toBe(false);
        }
    });
    for (const big of [false, true])
      it(`every gold box can be bumped from below (${big ? 'powered' : 'small'} form)`, () => {
        const hero = heroBody(big, false);
        const floors = surfaces(solids);
        for (const box of boxes) {
          const r = tile(box.x, box.y, 'box');
          // Try hero centres under the box (at least half the hero under it).
          const ok = [-6, -3, 0, 3, 6].some((dx) => {
            const left = box.x + dx - hero.width / 2,
              right = left + hero.width;
            const floor = floors
              .filter(
                (f) =>
                  f.left <= box.x + dx &&
                  f.right >= box.x + dx &&
                  f.top >= r.bottom,
              )
              .sort((a, b) => a.top - b.top)[0];
            if (!floor) return false;
            const head = floor.top - hero.height;
            if (head < r.bottom) return false; // no headroom to stand under it
            if (head - SMALL_JUMP > r.bottom - 1) return false; // too high
            // Nothing between the head and the box bottom.
            return !solids.some(
              (s) =>
                s.left < right &&
                s.right > left &&
                s.bottom > r.bottom &&
                s.top < head,
            );
          });
          expect(ok, `box at x=${box.x} unreachable`).toBe(true);
        }
      });
    it('a spawned power-up has free space above its box', () => {
      for (const box of boxes) {
        const item = tile(box.x, box.y - 24, 'item');
        expect(
          solids.some(
            (s) =>
              s.left < item.right &&
              s.right > item.left &&
              s.top < item.bottom &&
              s.bottom > item.top,
          ),
        ).toBe(false);
      }
    });
    it('every terrace and block row top is reachable (row coins included)', () => {
      const floors = surfaces(solids);
      const groundTop = GROUND_TOP;
      const reach = new Set(
        floors.filter((f) => f.top === groundTop).map((f) => floors.indexOf(f)),
      );
      let grew = true;
      while (grew) {
        grew = false;
        floors.forEach((f, i) => {
          if (reach.has(i)) return;
          for (const j of reach) {
            const g = floors[j],
              rise = g.top - f.top,
              gap = Math.max(0, f.left - g.right, g.left - f.right);
            if (rise <= SMALL_JUMP - 4 && gap <= 110) {
              reach.add(i);
              grew = true;
              return;
            }
          }
        });
      }
      const unreachable = floors.filter((_, i) => !reach.has(i));
      expect(unreachable, JSON.stringify(unreachable)).toEqual([]);
      for (const [x, y] of layout.rowCoins) {
        const under = floors.find(
          (f) => f.left <= x && f.right >= x && f.top > y,
        );
        expect(under && reach.has(floors.indexOf(under))).toBe(true);
      }
    });
  });
}
