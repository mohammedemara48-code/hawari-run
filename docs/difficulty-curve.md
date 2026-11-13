# منحنى الصعوبة — Difficulty curve

The journey across Egypt gets harder one step at a time: each world keeps the
controls and the box rules but adds **one new kind of pressure per level** and
then mixes them before its boss. The numbers below come straight from the level
grids (`src/level-data.ts`) and are kept honest by `tests/levels.test.ts`
(each world must be denser and tighter on time than the one before, and every
level stays completable in the reachability graph).

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

| #   | Level             | World   |      Cols | Timer | s/col | Enemies                          | /100 | Checkpoint | New idea                                                       |
| --- | ----------------- | ------- | --------: | ----: | ----: | -------------------------------- | ---: | ---------: | -------------------------------------------------------------- |
| 1   | حارة الفوانيس     | القاهرة |       170 |   300 |  1.76 | 5 cats, 3 bats, 2 bugs           |  5.9 |     col 84 | dark alley, lanterns reveal ghost ledges                       |
| 2   | سوق تحت البلد     | القاهرة |       180 |   300 |  1.67 | 5 roosters, 4 baskets            |  5.0 |     col 96 | bouncy awnings, rolling carts, charging roosters               |
| 3   | فوق الأسطح        | القاهرة | 40 (tall) |   300 |     — | 3 pigeons, 2 roosters, 1 cat     |    — |     col 36 | climb: dishes, zip-lines, wind                                 |
| 4   | تحت المترو + boss | القاهرة |       151 |   360 |  2.38 | 5 rats, 1 bug                    |  4.0 |     col 86 | rising water, lifts; boss الفتوة برعي (6 hearts)               |
| 5   | غيطان الفجر       | الأرياف |       200 |   280 |  1.40 | 7 geese, 4 buffalo, 1 crow       |  6.0 |     col 93 | mud slows you, first calm canal (→)                            |
| 6   | الترعة            | الأرياف |       210 |   280 |  1.33 | 8 crows, 5 geese, 1 buffalo      |  6.7 |     col 96 | canal currents, against you (←) 4 of 5 times                   |
| 7   | الساقية           | الأرياف |       220 |   300 |  1.36 | 6 crows, 6 geese, 3 buffalo      |  6.8 |    col 107 | 4 rotating saqia wheels over pits, donkey-cart ride            |
| 8   | جرن القمح + boss  | الأرياف |       191 |   330 |  1.73 | 4 crows, 4 geese, 3 buffalo      |  5.8 |     col 70 | everything mixed at dusk (dark 0.3); boss أبو قرون             |
| 9   | شارع الموبيليا    | دمياط   |       236 |   285 |  1.21 | 6 saws, 6 thief cats, 5 planes   |  7.2 |    col 108 | conveyor belts (both ways), toppling furniture stacks          |
| 10  | جوه الورشة        | دمياط   |       240 |   290 |  1.21 | 7 saws, 7 planes, 5 thief cats   |  7.9 |    col 102 | swinging chandeliers over pits, lamplight (dark 0.45)          |
| 11  | ميناء الصيد       | دمياط   |       240 |   285 |  1.19 | 8 crabs, 7 gulls, 4 thief cats   |  7.9 |     col 86 | the tide (2 rows / 10 s), drifting boats, climbable nets       |
| 12  | رأس البر + boss   | دمياط   |       191 |   300 |  1.57 | 5 crabs, 4 gulls, 3 saws, 3 cats |  7.9 |     col 90 | everything mixed at blue hour, faster tide (8 s); boss أبو مقص |

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

## الأرياف → دمياط: what makes World 3 a clear step up

1. **Even less time.** 1.19–1.21 s per column on the three long levels
   (236–240 columns) against 1.33–1.40 in the countryside, and 1.57 on the
   boss level against 1.73.
2. **More enemies, and none of them can just be stomped on sight.** 7.2–7.9
   per 100 columns against 5.8–6.8:
   - **Crab (كابوريا):** raises its claws for 0.9 s every 2–3 s. Stomping it
     then hurts you: you have to read the guard and time the stomp.
   - **Seagull (نورس):** glides high and drops shells where you'll be (it
     leads your speed) — a threat from above while you deal with the ground.
   - **Runaway saw (منشار):** rolls at 128 px/s and **can't be stomped at
     all**: jump over it or burn it with chili.
   - **Runaway plane (فارة):** lines up with you, shivers for 0.38 s and
     dashes at 225 px/s, then gets dizzy.
   - **Thief cat (قطة حرامية):** doesn't hurt you; it steals up to 5 coins
     and runs. Stomp it to get them back.
3. **Platforms that never hold still.**
   - **Conveyor belts:** push you at 80 px/s. In the first level the middle
     one runs _against_ you, and the level graph only allows 4-column
     jumps off a belt.
   - **Furniture stacks (عفش):** a 3-tile wall you must climb. 0.65 s after
     you land on top it topples and becomes a 3-tile bridge, so you have to
     keep moving.
   - **Chandeliers / ship lanterns:** a 2-tile platform on a 3-tile chain,
     swinging ±0.85 rad. Boarding and leaving are both timed jumps over
     pits.
   - **The tide:** every sea rises and falls 2 rows (10 s period; 8 s at
     رأس البر). Boats ride it and drift between their moorings at 40 px/s.
     The graph models the sea at low tide, the hardest case.
   - **Nets (شبك):** climb at 110 px/s and hop off the top (400). From a
     net you can only rise 2 rows and cross a 2-column gap.
4. **A boss you must read.** أبو مقص walks at you, then raises his claws
   (guard). A stomp on raised claws hurts, and so does chili, which they
   swat away. He then lunges across the beach (290, then 320, then
   350 px/s) and buries his claws in the sand. Only while he's stuck
   (1.4 s, then 1.2 s, then 1.0 s) can he be stomped safely.
   - Phase 2 spits bubble arcs after every lunge.
   - Phase 3 adds rolling waves on both sides and two gulls.
   - In comparison, أبو قرون only had to be baited into a wall once per
     heart.

## Inside each world

Every world follows the same four-beat shape so players feel the ramp:

1. **Teach.** One mechanic, safe ground, a hint toast, generous timer.
2. **Twist.** The same mechanic turned against you (current flows backwards,
   gaps under the saqia).
3. **Combine.** Two mechanics plus the densest enemy mix.
4. **Exam + boss.** A shorter mixed run, an early checkpoint (col 70 in
   جرن القمح) and then the boss arena.

## Planned ramp for later worlds (World 3 is built; see above)

| World      | Extra pressure (planned)                                                                       |
| ---------- | ---------------------------------------------------------------------------------------------- |
| 4 اسكندرية | Wind and waves pushing sideways, slippery wet stone; enemies that throw                        |
| 5 الأقصر   | Crumbling temple floors, traps on timers, darkness with torches; ≈1.1 s/col and the final boss |

When adding a world, keep these invariants and add a test like the World 2
density test: enemies per 100 columns and seconds per column must both get
tighter than the previous world's average.
