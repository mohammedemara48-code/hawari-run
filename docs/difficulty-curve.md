# منحنى الصعوبة — Difficulty curve

The journey across Egypt gets harder one step at a time: each world keeps the
controls and the box rules but adds **one new kind of pressure per level** and
then mixes them before its boss. The numbers below come straight from the level
grids (`src/level-data.ts`) and are kept honest by `tests/levels.test.ts`
(World 2 must be denser than Cairo and every level stays completable in the
reachability graph).

## Rules that never change

- Physics: gravity 1100, jump 470 (485 running), tile 24 px. A box always has
  exactly 3 free rows under it, so a standing jump always reaches it.
- 9 lives, one checkpoint flag per level around its middle, chili power-up
  from boxes, joystick + jump + chili buttons on phones.
- Every new mechanic is introduced **alone and safe first** (over solid
  ground, with a one-time hint toast), then over a pit, then combined.

## Per-level numbers

Seconds per column = level timer ÷ level width: lower means less time to
spare. Enemies /100 = enemies per 100 columns.

| #   | Level             | World   |      Cols | Timer | s/col | Enemies                      | /100 | Checkpoint | New idea                                            |
| --- | ----------------- | ------- | --------: | ----: | ----: | ---------------------------- | ---: | ---------: | --------------------------------------------------- |
| 1   | حارة الفوانيس     | القاهرة |       170 |   300 |  1.76 | 5 cats, 3 bats, 2 bugs       |  5.9 |     col 84 | dark alley, lanterns reveal ghost ledges            |
| 2   | سوق تحت البلد     | القاهرة |       180 |   300 |  1.67 | 5 roosters, 4 baskets        |  5.0 |     col 96 | bouncy awnings, rolling carts, charging roosters    |
| 3   | فوق الأسطح        | القاهرة | 40 (tall) |   300 |     — | 3 pigeons, 2 roosters, 1 cat |    — |     col 36 | climb: dishes, zip-lines, wind                      |
| 4   | تحت المترو + boss | القاهرة |       151 |   360 |  2.38 | 5 rats, 1 bug                |  4.0 |     col 86 | rising water, lifts; boss الفتوة برعي (6 hearts)    |
| 5   | غيطان الفجر       | الأرياف |       200 |   280 |  1.40 | 7 geese, 4 buffalo, 1 crow   |  6.0 |     col 93 | mud slows you, first calm canal (→)                 |
| 6   | الترعة            | الأرياف |       210 |   280 |  1.33 | 8 crows, 5 geese, 1 buffalo  |  6.7 |     col 96 | canal currents, against you (←) 4 of 5 times        |
| 7   | الساقية           | الأرياف |       220 |   300 |  1.36 | 6 crows, 6 geese, 3 buffalo  |  6.8 |    col 107 | 4 rotating saqia wheels over pits, donkey-cart ride |
| 8   | جرن القمح + boss  | الأرياف |       191 |   330 |  1.73 | 4 crows, 4 geese, 3 buffalo  |  5.8 |     col 70 | everything mixed at dusk (dark 0.3); boss أبو قرون  |

## Cairo → الأرياف: what makes World 2 a clear step up

1. **Less time per column.** Cairo gives 1.67–2.38 s per column; the
   countryside gives 1.33–1.73 s on longer maps (200–220 columns against
   151–180). You can't stop and wait out every patrol.
2. **More and meaner enemies.** 5.8–6.8 per 100 columns against 4.0–5.9, and
   each new enemy _reacts_ to the hero instead of pacing:
   - **Buffalo (جاموسة):** lowers its horns for 0.65 s, charges at 270 px/s,
     gets dizzy when it hits a wall, and needs **two** stomps.
   - **Goose (وزة):** honks and chases you for 2.6 s, hopping over bumps.
   - **Crow (غراب):** patrols wide and dive-bombs where you are _heading_
     (it leads your speed), then climbs away. It's faster than the pigeon.
3. **Ground that fights back.**
   - **Mud (طين):** walking speed ×0.5 and jump ×0.78. The level graph
     forbids boxes over mud and allows at most a 1-tile rise and a 3-column
     gap when jumping off mud.
   - **Canals (ترعة):** you float at the surface. The current adds 85 px/s,
     and only a swim jump (460) gets you out. Against the current, waiting
     means drifting back.
   - **Saqia wheels (ساقية):** 4 buckets on a 3-tile radius turning at 0.55
     rad/s. You have to time the boarding and the jump-off, often over a
     pit.
   - **Donkey cart (عربية الكارو):** it only moves while you stand on it, so
     enemies and crows have to be dodged on a moving platform. Step off and
     it walks back home.
4. **A boss that punishes button-mashing.** أبو قرون can't be stomped while
   he's fresh: you bounce off his back. You have to bait a charge into a
   wall so he's dazed, then stomp. Each phase is faster:
   - Charge speed: 300, then 350, then 400 px/s.
   - Dazed time: 1.7 s, then 1.4 s, then 1.15 s.
   - Phase 2 crashes drop mud clods from the barn roof.
   - Phase 3 adds a leap-slam with shockwaves, plus two crows.
   - In comparison, الفتوة برعي could be stomped any time he wasn't leaping.

## Inside each world

Every world follows the same four-beat shape so players feel the ramp:

1. **Teach.** One mechanic, safe ground, a hint toast, generous timer.
2. **Twist.** The same mechanic turned against you (current flows backwards,
   gaps under the saqia).
3. **Combine.** Two mechanics plus the densest enemy mix.
4. **Exam + boss.** A shorter mixed run, an early checkpoint (col 70 in
   جرن القمح) and then the boss arena.

## Planned ramp for later worlds

| World      | Extra pressure (planned)                                                                       |
| ---------- | ---------------------------------------------------------------------------------------------- |
| 3 دمياط    | Moving water everywhere (boats, nets), timing over long water stretches; timers ≈1.25 s/col    |
| 4 اسكندرية | Wind and waves pushing sideways, slippery wet stone; enemies that throw                        |
| 5 الأقصر   | Crumbling temple floors, traps on timers, darkness with torches; ≈1.1 s/col and the final boss |

When adding a world, keep these invariants and add a test like the World 2
density test: enemies per 100 columns and seconds per column must both get
tighter than the previous world's average.
