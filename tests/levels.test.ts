import { describe, expect, it } from 'vitest';
import { LEVELS, TILE, WORLDS } from '../src/level-data';
import { FLYING, SOLID, parseLevel } from '../src/level-parse';
import { heroBody } from '../src/hero-state';
import { fitsThrough, onSurface, reach, standable } from './level-graph';

describe('authored levels', () => {
  it('has six playable worlds of four distinct levels each', () => {
    expect(LEVELS.length).toBe(24);
    const cairo = LEVELS.filter((l) => l.world === 0),
      rif = LEVELS.filter((l) => l.world === 1);
    expect(cairo.length).toBe(4);
    expect(rif.length).toBe(4);
    expect(new Set(cairo.map((l) => l.theme)).size).toBe(4);
    expect(new Set(rif.map((l) => l.timeOfDay)).size).toBe(4);
    const dam = LEVELS.filter((l) => l.world === 2);
    expect(dam.length).toBe(4);
    expect(new Set(dam.map((l) => l.timeOfDay)).size).toBe(4);
    const alex = LEVELS.filter((l) => l.world === 3);
    expect(alex.length).toBe(4);
    expect(new Set(alex.map((l) => l.timeOfDay)).size).toBe(4);
    expect(alex.some((l) => l.storm && l.timeOfDay === 'storm')).toBe(true);
    const luxor = LEVELS.filter((l) => l.world === 4);
    expect(luxor.length).toBe(4);
    expect(new Set(luxor.map((l) => l.timeOfDay)).size).toBe(4);
    expect(luxor.some((l) => l.timeOfDay === 'tomb' && l.dark)).toBe(true);
    const aswan = LEVELS.filter((l) => l.world === 5);
    expect(aswan.length).toBe(4);
    expect(new Set(aswan.map((l) => l.timeOfDay)).size).toBe(4);
    expect(aswan.every((l) => !l.dark)).toBe(true);
    expect(new Set(LEVELS.map((l) => l.mechanic)).size).toBe(24);
    expect(new Set(LEVELS.map((l) => l.track)).size).toBe(24);
    // Levels are grouped by world in order, and each world ends with a boss.
    expect(LEVELS.map((l) => l.world)).toEqual([
      0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5,
    ]);
    expect([3, 7, 11, 15, 19, 23].every((i) => LEVELS[i].boss)).toBe(true);
    expect(LEVELS.filter((l) => l.boss).length).toBe(6);
    expect(LEVELS[19].bossKind).toBe('ram');
    expect(LEVELS[23].bossKind).toBe('croc');
    expect(WORLDS.filter((w) => w.playable).length).toBe(6);
    expect(WORLDS.map((w) => w.name)).toEqual([
      'القاهرة',
      'الأرياف',
      'دمياط',
      'اسكندرية',
      'الأقصر',
      'أسوان',
    ]);
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
      it('the big form can walk to the exit without crouching', () => {
        const rows = Math.ceil(heroBody(true, false).height / TILE);
        const route = fitsThrough(L, rows);
        expect(route.exit, `stuck after column ${route.furthest}`).toBe(true);
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
      it('every stone door has a reachable lever before it', () => {
        for (const d of L.doors) expect(d.lever, `door ${d.col}`).toBeTruthy();
        for (const l of L.levers)
          expect(
            onSurface(S, seen, l.col, l.row, [1, 1]),
            `lever ${l.col},${l.row}`,
          ).toBe(true);
      });
      it('every box can be bumped from below (both forms)', () => {
        for (const b of L.boxes) {
          const ok = S.some(
            (s, i) =>
              seen.has(i) &&
              !s.mud &&
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
      if (L.boss)
        it('a chili crate waits after the checkpoint, before the arena locks', () => {
          expect(L.armories, 'one chili crate').toHaveLength(1);
          const a = L.armories[0];
          // The arena locks once the hero is 3 tiles past its left edge.
          const lockCol = L.boss!.col - 17 + 3;
          expect(a.col).toBeGreaterThan(L.checkpoint!.col);
          expect(a.col).toBeLessThan(lockCol);
          const bump = S.some(
            (s, i) =>
              seen.has(i) &&
              !s.mud &&
              s.c0 <= a.col &&
              s.c1 >= a.col &&
              s.row - a.row - 1 >= 3 &&
              s.row - a.row - 1 <= 4 &&
              [...Array(s.row - a.row - 1)].every(
                (_, k) => !SOLID.has(L.at(a.col, a.row + 1 + k)),
              ),
          );
          expect(bump, `crate ${a.col},${a.row} can be bumped`).toBe(true);
        });
      else
        it('chili crates only appear before bosses', () => {
          expect(L.armories).toHaveLength(0);
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
          if (FLYING.has(e.kind)) continue;
          expect(
            standable(L.at(e.col, e.row + 1)),
            `${e.kind} ${e.col},${e.row}`,
          ).toBe(true);
        }
      });
    });
  });
  it('each level has its own signature pieces', () => {
    const [
      a,
      b,
      c,
      d,
      e,
      f,
      g,
      h,
      i9,
      j10,
      k11,
      l12,
      m13,
      n14,
      o15,
      p16,
      q17,
      r18,
      s19,
      t20,
    ] = LEVELS.map((_, i) => parseLevel(i));
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
        [a, b, c, d, e, f, g, i9, j10, k11].map((l) =>
          l.enemies
            .map((e) => e.kind)
            .sort()
            .join(),
        ),
      ),
    ).toHaveProperty('size', 10);
    // World 2: mud, canals with both currents, saqias, the donkey cart.
    const mud = (l: typeof e) => l.meta.rows.join('').split('u').length - 1;
    const hay = (l: typeof e) => l.meta.rows.join('').split('N').length - 1;
    expect(mud(e)).toBeGreaterThanOrEqual(15);
    expect(hay(e)).toBeGreaterThanOrEqual(20);
    expect(f.canals.length).toBeGreaterThanOrEqual(4);
    expect(new Set(f.canals.map((k) => k.dir)).size).toBe(2);
    expect(f.planks.length).toBeGreaterThanOrEqual(3);
    expect(g.saqias.length).toBeGreaterThanOrEqual(3);
    expect(g.donkeys.length).toBe(1);
    expect(g.donkeys[0].endCol - g.donkeys[0].a.col).toBeGreaterThan(25);
    expect(h.boss && h.meta.bossKind).toBe('buffalo');
    expect(mud(h) && h.canals.length && h.saqias.length).toBeTruthy();
    const kinds = (l: typeof e) => new Set(l.enemies.map((x) => x.kind));
    for (const k of ['buffalo', 'goose', 'crow'])
      expect(
        [e, f, g, h].some((l) => kinds(l).has(k)),
        k,
      ).toBe(true);
    // A clear step up from Cairo: more enemies per screen and less time.
    const density = (ls: (typeof e)[]) =>
      ls.reduce((n, l) => n + l.enemies.length, 0) /
      ls.reduce((n, l) => n + l.cols, 0);
    expect(density([e, f, g, h])).toBeGreaterThan(density([a, b, d]));
    expect(e.meta.time).toBeLessThan(a.meta.time);
    // World 3: belts both ways, stacks, lamps, boats on a tide, nets.
    expect(i9.belts.length).toBeGreaterThanOrEqual(3);
    expect(new Set(i9.belts.map((b) => b.dir)).size).toBe(2);
    expect(i9.stacks.length).toBeGreaterThanOrEqual(3);
    expect(j10.lamps.length).toBeGreaterThanOrEqual(4);
    expect(j10.meta.dark).toBeGreaterThan(0);
    expect(k11.meta.tide).toBeTruthy();
    expect(k11.seas.length).toBeGreaterThanOrEqual(4);
    expect(k11.boats.length).toBeGreaterThanOrEqual(4);
    expect(k11.nets.length).toBeGreaterThanOrEqual(10);
    expect(l12.boss && l12.meta.bossKind).toBe('crab');
    expect(
      l12.belts.length &&
        l12.stacks.length &&
        l12.lamps.length &&
        l12.boats.length &&
        l12.nets.length &&
        l12.meta.tide,
    ).toBeTruthy();
    for (const k of ['crab', 'gull', 'saw', 'plane', 'thief'])
      expect(
        [i9, j10, k11, l12].some((l) => kinds(l).has(k)),
        k,
      ).toBe(true);
    // A clear step up from World 2: denser and less time per column.
    expect(density([i9, j10, k11, l12])).toBeGreaterThan(density([e, f, g, h]));
    const perCol = (ls: (typeof e)[]) =>
      ls.reduce((n, l) => n + l.meta.time, 0) /
      ls.reduce((n, l) => n + l.cols, 0);
    expect(perCol([i9, j10, k11, l12])).toBeLessThan(perCol([e, f, g, h]));
    // Boxes never float over the sea or nets.
    for (const l of [k11, l12, o15, p16, r18])
      for (const bx of l.boxes) expect(l.at(bx.col, bx.row + 4)).not.toBe('s');
    // World 4: breaking waves, wet tiles, the tram run with wires and low
    // bridges, umbrella stands, a gale over Stanley, the storm and the boss.
    const wet = (l: typeof e) => l.meta.rows.join('').split('$').length - 1;
    expect(m13.waves.length).toBeGreaterThanOrEqual(10);
    expect(m13.meta.waves).toBeTruthy();
    expect(wet(m13)).toBeGreaterThanOrEqual(30);
    expect(m13.seas.length).toBeGreaterThanOrEqual(2);
    expect(m13.stands.length).toBeGreaterThanOrEqual(3);
    expect(n14.trams.length).toBe(1);
    expect(n14.trams[0].endCol - n14.trams[0].a.col).toBeGreaterThan(150);
    expect(n14.wires.filter((w) => !w.bridge).length).toBeGreaterThanOrEqual(8);
    expect(n14.wires.filter((w) => w.bridge).length).toBeGreaterThanOrEqual(3);
    expect(o15.wind.length).toBeGreaterThanOrEqual(1);
    expect(o15.meta.gust!.push).toBeGreaterThan(150);
    expect(o15.seas.length).toBeGreaterThanOrEqual(5);
    expect(o15.stands.length).toBeGreaterThanOrEqual(2);
    expect(p16.boss && p16.meta.bossKind).toBe('gull');
    expect(p16.meta.storm && p16.meta.waves && p16.meta.gust).toBeTruthy();
    expect(new Set(p16.wind.map((w) => w.dir)).size).toBe(2);
    expect(wet(p16)).toBeGreaterThanOrEqual(40);
    for (const k of ['skua', 'jelly', 'brolly', 'ball', 'gull'])
      expect(
        [m13, n14, o15, p16].some((l) => kinds(l).has(k)),
        k,
      ).toBe(true);
    // Jellyfish only live in the sea.
    for (const l of [m13, n14, o15, p16])
      for (const j of l.enemies.filter((x) => x.kind === 'jelly'))
        expect(
          l.seas.some((k) => j.x >= k.x0 && j.x < k.x1 && j.y >= k.top),
          `jelly ${j.col},${j.row}`,
        ).toBe(true);
    // Every wire and bridge can be ducked under from the tram roof: the
    // hazard ends above a crouching hero (32-38px) and catches a standing
    // one (46-54px).
    const roof = (n14.trams[0].a.row - 2) * 24;
    for (const w of n14.wires) {
      expect(roof - w.y1).toBeGreaterThan(38);
      expect(roof - w.y1).toBeLessThan(46);
    }
    // A clear step up from Damietta: denser and less time per column.
    expect(density([m13, n14, o15, p16])).toBeGreaterThan(
      density([i9, j10, k11, l12]),
    );
    expect(perCol([m13, n14, o15, p16])).toBeLessThan(
      perCol([i9, j10, k11, l12]),
    );
    // World 5: the sphinx avenue with sand slides, the Nile on feluccas and
    // balloons against the current, the dark tomb (collapsing slabs, burning
    // torches, doors, pillars, falling sand) and Karnak with the ram at the end.
    const count = (l: typeof e, ch: string) =>
      l.meta.rows.join('').split(ch).length - 1;
    expect(count(q17, ',')).toBeGreaterThanOrEqual(30);
    expect(count(q17, ';') + count(q17, '_')).toBeGreaterThanOrEqual(12);
    expect(q17.crates.length).toBeGreaterThanOrEqual(6);
    expect(r18.balloons.length).toBeGreaterThanOrEqual(4);
    expect(r18.boats.length).toBeGreaterThanOrEqual(4);
    expect(r18.meta.current).toBeLessThan(0);
    expect(s19.meta.dark).toBeGreaterThan(0.9);
    expect(s19.meta.torchBurn).toBeGreaterThan(0);
    expect(s19.crates.length).toBeGreaterThanOrEqual(8);
    expect(s19.lanterns.length).toBeGreaterThanOrEqual(5);
    expect(s19.ghosts.length).toBeGreaterThan(10);
    expect(s19.doors.length).toBeGreaterThanOrEqual(2);
    expect(s19.pillars.length).toBeGreaterThanOrEqual(4);
    expect(s19.sands.length).toBeGreaterThanOrEqual(3);
    expect(t20.boss && t20.meta.bossKind).toBe('ram');
    expect(count(t20, '/')).toBeGreaterThanOrEqual(40);
    expect(
      t20.doors.length && t20.pillars.length && t20.sands.length,
    ).toBeTruthy();
    for (const k of ['scarab', 'mummy', 'cobra', 'devil'])
      expect(
        [q17, r18, s19, t20].some((l) => kinds(l).has(k)),
        k,
      ).toBe(true);
    // The peak of the game: less time per column than Alexandria. Luxor's
    // danger is in its ground (slides, slabs, pillars, doors, the dark), so
    // its enemies are spread out: busier than the countryside, calmer than
    // Alexandria's storm.
    expect(density([q17, r18, s19, t20])).toBeGreaterThan(
      density([e, f, g, h]),
    );
    expect(density([q17, r18, s19, t20])).toBeLessThan(
      density([m13, n14, o15, p16]),
    );
    expect(perCol([q17, r18, s19, t20])).toBeLessThan(
      perCol([m13, n14, o15, p16]),
    );
  });
});

describe('World 2 playability', () => {
  const w2 = [4, 5, 6, 7].map((i) => parseLevel(i));
  it('gives بلبل a countryside weapon at the start of every rural level', () => {
    for (const L of w2) {
      expect(L.pickups.length, L.meta.id).toBeGreaterThanOrEqual(
        L.checkpoint ? 2 : 1,
      );
      const first = [...L.pickups].sort((a, b) => a.col - b.col)[0];
      expect(first.col - L.start.col, L.meta.id).toBeGreaterThanOrEqual(3);
      expect(first.col - L.start.col, L.meta.id).toBeLessThanOrEqual(12);
      if (L.checkpoint) {
        const nearFlag = L.pickups.some(
          (p) => Math.abs(p.col - L.checkpoint!.col) <= 6,
        );
        expect(nearFlag, L.meta.id + ' weapon at the checkpoint').toBe(true);
      }
    }
  });
  it('keeps the first crow well after a safe intro stretch', () => {
    for (const L of w2) {
      const crows = L.enemies
        .filter((e) => e.kind === 'crow')
        .sort((a, b) => a.col - b.col);
      // جرن القمح is the boss level: the buffalo alone, no crows.
      if (L.meta.id === 'jurn') {
        expect(crows.length, L.meta.id).toBe(0);
        continue;
      }
      expect(crows.length, L.meta.id).toBeGreaterThan(0);
      expect(crows[0].col - L.start.col, L.meta.id).toBeGreaterThanOrEqual(20);
    }
  });
  it('does not park a crow just past a checkpoint', () => {
    for (const L of w2) {
      if (!L.checkpoint) continue;
      for (const e of L.enemies.filter((x) => x.kind === 'crow')) {
        if (e.col <= L.checkpoint.col) continue;
        expect(
          e.col - L.checkpoint.col,
          `${L.meta.id} crow at ${e.col}`,
        ).toBeGreaterThanOrEqual(25);
      }
    }
  });
  it('spreads crows along the level instead of clustering them at the start', () => {
    for (const L of w2) {
      const early = L.enemies.filter(
        (e) => e.kind === 'crow' && e.col < L.start.col + 40,
      );
      expect(early.length, L.meta.id).toBeLessThanOrEqual(1);
    }
    // الترعة in particular used to park several crows over the opening walk.
    const canals = w2[1];
    const nearStart = canals.enemies.filter(
      (e) => e.kind === 'crow' && e.col < 40,
    );
    expect(nearStart.length).toBe(0);
  });
});

describe('World 5 playability', () => {
  const w5 = [16, 17, 18, 19].map((i) => parseLevel(i));
  const flying = new Set(['devil']);
  it('gives بلبل the throwing stick at the start and at every checkpoint', () => {
    for (const L of w5) {
      const first = [...L.pickups].sort((a, b) => a.col - b.col)[0];
      expect(first, L.meta.id).toBeDefined();
      expect(first.col - L.start.col, L.meta.id).toBeGreaterThanOrEqual(3);
      expect(first.col - L.start.col, L.meta.id).toBeLessThanOrEqual(12);
      if (L.checkpoint)
        expect(
          L.pickups.some((p) => Math.abs(p.col - L.checkpoint!.col) <= 6),
          L.meta.id + ' stick at the checkpoint',
        ).toBe(true);
    }
  });
  it('keeps the spawn and the checkpoints clear of enemies', () => {
    for (const L of w5) {
      for (const e of L.enemies) {
        expect(
          e.col - L.start.col,
          `${L.meta.id} ${e.kind} ${e.col}`,
        ).toBeGreaterThanOrEqual(15);
        if (L.checkpoint && e.col > L.checkpoint.col)
          expect(
            e.col - L.checkpoint.col,
            `${L.meta.id} ${e.kind} ${e.col} after the flag`,
          ).toBeGreaterThanOrEqual(flying.has(e.kind) ? 25 : 8);
      }
      const fly = L.enemies.filter((e) => flying.has(e.kind));
      for (const e of fly)
        expect(e.col - L.start.col, L.meta.id).toBeGreaterThanOrEqual(20);
    }
  });
  it('keeps the ram court to the ram, and spaces Karnak hazards apart', () => {
    const L = parseLevel(19);
    expect(L.meta.id).toBe('karnak');
    const arena = L.boss!.col - 17;
    expect(
      L.enemies.filter((e) => e.kind === 'mummy' && e.col >= arena).length,
    ).toBe(0);
    expect(L.pillars.filter((p) => p.col >= arena).length).toBe(0);
    expect(L.sands.filter((p) => p.col >= arena).length).toBe(0);
    expect(L.armories.some((a) => a.col < arena && a.col >= arena - 20)).toBe(
      true,
    );
    // Never a pillar, a falling-sand crack and a mummy in the same stretch.
    const marks = [
      ...L.pillars.map((p) => ({ col: p.col, kind: 'pillar' })),
      ...L.sands.map((p) => ({ col: p.col, kind: 'sand' })),
      ...L.enemies
        .filter((e) => e.kind === 'mummy')
        .map((e) => ({ col: e.col, kind: 'mummy' })),
    ].sort((a, b) => a.col - b.col);
    for (let i = 1; i < marks.length; i++)
      if (marks[i].kind !== marks[i - 1].kind)
        expect(
          marks[i].col - marks[i - 1].col,
          `${marks[i - 1].kind}@${marks[i - 1].col} next to ${marks[i].kind}@${marks[i].col}`,
        ).toBeGreaterThan(6);
  });
  it('spreads the enemies out, a little more each level', () => {
    const per100 = w5.map(
      (L) => (L.enemies.filter((e) => e.kind !== 'boss').length / L.cols) * 100,
    );
    for (const d of per100) expect(d).toBeLessThanOrEqual(8);
    for (const L of w5) {
      const cols = L.enemies.map((e) => e.col).sort((a, b) => a - b);
      // No pack: never more than three within any 12 columns.
      for (let i = 3; i < cols.length; i++)
        expect(cols[i] - cols[i - 3], L.meta.id).toBeGreaterThan(12);
    }
  });
});
