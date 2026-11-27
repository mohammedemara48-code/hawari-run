import { lanternPilot, grovePilot } from './pilot-maps';
import {
  LANDMARK_WORLDS,
  LANDMARK_LEVELS,
  type LandmarkPuzzle,
} from './landmark-data';
// Authored level maps for «بلبل في الحواري». Every level is a 24px tile grid
// built with small helpers so routes can be read (and tested) as text.
//
// Legend
//   #  solid wall / ground      =  solid platform       -  one-way ledge
//   B  brick   ?  coin box   F  food box   C  weapon box   S  bead box
//   @  world-weapon pickup on the ground (نبلة in the countryside)
//   i  hidden coin box (invisible until bumped)          o  coin
//   L  lantern (lights nearby ghost platforms)           ~  ghost ledge
//   A  market awning (bouncy one-way)    K  vendor cart (moves, 3 wide)
//   X  crumbling crate                   D  satellite dish (spring)
//   H/h J/j clothesline start/end (zip)   > <  wind gust cells
//   M  moving plank (2 wide, horizontal) V  service lift (2 wide, vertical)
//   ^  broken glass (hurts)              Q  false wall (secret passage)
//   G  golden fanoos (the level secret)  T  secret water tank (bonus room)
//   !  weapon crate before a boss arena: bump it for this world's weapon
//      (chili, نبلة, …) or a bonus if already armed; back after a respawn
//   c  checkpoint   P  start   E  exit
//   enemies: g cat  b bug  k basket  t bat  r rooster  p pigeon  m rat  Z boss
// World 2 (الأرياف)
//   N  hay bale (solid)                  u  mud (solid, slows you, weak jump)
//   w / x  irrigation canal water, current flowing right / left (swim)
//   W  saqia waterwheel hub (four rotating bucket platforms)
//   Y / y  donkey cart start / end of its run (rides while you stand on it)
//   enemies: q buffalo  n goose  v crow
// World 3 (دمياط)
//   { / }  plank conveyor belt moving left / right (solid, carries you)
//   O  swinging chandelier / harbour lantern pivot (platform on a chain)
//   R  stacked furniture, base cell of a 1×3 stack: stand on it and it
//      topples to the right into a 3-wide bridge
//   s  sea water (swim); its surface rises and falls with the tide
//   U / I  fishing boat start / end of its drift (bobs on the tide)
//   %  climbable fishing net
//   enemies: a crab  l seagull  d runaway saw  e runaway plane  f fish-thief cat
// World 4 (اسكندرية)
//   $  wet corniche tiles (solid, slippery)
//   *  a wave crashing over the sea wall here on a timer (hurts while it
//      breaks; foam and a swell warn you first)
//   &  the tram, at its bottom-left cell; it runs right to the + marker on
//      its row once you climb on its roof (the view then scrolls with it)
//   |  overhead tram wire, : low bridge — duck under them on the tram roof
//   (  a beach-umbrella stand: grab an umbrella to glide (hold jump)
//   enemies: 1 storm gull  2 jellyfish (sea)  3 umbrella blown loose
//            4 beach ball
// World 5 (الأقصر)
//   ,  a recumbent ram-headed sphinx statue (solid; stand on its back)
//   /  a lotus column (solid; broken ones make stepping stones)
//   ; / _  sand slide pouring right / left (solid; it carries you hard)
//   z  hot-air balloon basket at the bottom of its climb (2 wide; it rises
//      and sinks on its own, and sinks while you stand in it)
//   0  lever: pull it and the next rotating stone door to its right swings
//      open for a few seconds
//   ]  rotating stone door (solid until its lever is pulled)
//   [  crushing pillar hanging from the ceiling (slams to the floor on a beat)
//   9  crack in the ceiling: sand pours down when you pass beneath
//   X  (here) a cracked sandstone floor slab that collapses under you
//   L / ~  (here) torches that burn out after a while, and the ghost
//      ledges their light holds up
//   enemies: 5 scarab  6 mummy (reassembles)  7 cobra (spits)
//            8 sand-dust devil
// World 6 (أسوان) re-uses the Nile water (s), feluccas (U/I), cracked
//   mud-brick slabs (X), levers (0) and gates (]) — here steel sluice gates
//   of the old dam — and the timed bursts (*) — here water spilling from a
//   gate. New: ت a Nile crocodile (lies low, gapes, then lunges a short way)
// World 7 (بورسعيد) is built around the port's cranes, not walking:
//   ه / ة  a crane hook's trolley run (start / end, same row): the hook
//          slides along its rail; jump up to grab it, ride, jump to let go
//   ح / خ  a container slung from a crane (start / end, same row): a
//          3-wide platform that carries you across
//   ص / ض  a hoisted container (bottom / top marker, same column): rises
//          and sinks in place, 3 wide
//   ب a pelican (waddles, then darts its beak forward)
//   ر a harbour barrel (rolls along and bounces off walls)
// World 8 (سيوة) is built on thirst and shifting dunes, with a distinct
// hook in every level (not a desert reskin of the same walk-and-throw):
//   س  sink-sand (solid; standing still swallows you)
//   ل  salt crust (solid, slippery like wet tiles)
//   ع  a spring (عين) that refills the thirst meter
//   غ  a mirage platform (shimmers; fakes vanish, salt reveals the real ones)
//   ن  a date; collect every one in the level to open the ف shortcut
//   ف  a palm-log shortcut, solid only after the dates are in
//   ش  a date palm (shade; thirst drains slower underneath)
//   ق  a scorpion (tells with a raised tail, then stings forward)
//   Y / y  a camel's stroll (ride its back over the sink-sand)
export const TILE = 24;
export type Theme =
  | 'night'
  | 'market'
  | 'roof'
  | 'sewer'
  | 'farm'
  | 'workshop'
  | 'harbor'
  | 'corniche'
  | 'fort'
  | 'temple'
  | 'nile'
  | 'tomb'
  | 'nubia'
  | 'portsaid'
  | 'siwa'
  | 'giza'
  | 'citadel'
  | 'rashid';
/** One region of the journey across Egypt. */
export interface WorldMeta {
  id: string;
  name: string;
  subtitle: string;
  /** Which side of the pin its name sits on. */
  side: 'left' | 'right';
  /** Marker position on the Egypt map, 0..1 of the map box. */
  x: number;
  y: number;
  /** Has levels yet; the others show as "coming soon". */
  playable: boolean;
}
export const WORLDS: WorldMeta[] = [
  {
    id: 'cairo',
    name: 'القاهرة',
    subtitle: 'حواري وأسواق وأسطح ومترو',
    x: 0.5,
    y: 0.34,
    side: 'right',
    playable: true,
  },
  {
    id: 'rif',
    name: 'الأرياف',
    subtitle: 'غيطان وسواقي وترع',
    x: 0.41,
    y: 0.22,
    side: 'left',
    playable: true,
  },
  {
    id: 'damietta',
    name: 'دمياط',
    subtitle: 'ورش موبيليا وميناء صيد',
    x: 0.58,
    y: 0.11,
    side: 'right',
    playable: true,
  },
  {
    id: 'alex',
    name: 'اسكندرية',
    subtitle: 'كورنيش وترام وقلعة قايتباي',
    x: 0.3,
    y: 0.12,
    side: 'left',
    playable: true,
  },
  {
    id: 'luxor',
    name: 'الأقصر',
    subtitle: 'معابد وبالونات ومقابر',
    x: 0.64,
    y: 0.74,
    side: 'left',
    playable: true,
  },
  {
    id: 'aswan',
    name: 'أسوان',
    subtitle: 'نجوع نوبية وفلايك وتماسيح والسد',
    x: 0.68,
    y: 0.9,
    side: 'left',
    playable: true,
  },
  {
    id: 'portsaid',
    name: 'بورسعيد',
    subtitle: 'كورنيش ومراكب وأسواق والفنار القديم',
    x: 0.74,
    y: 0.16,
    side: 'right',
    playable: true,
  },
  {
    id: 'siwa',
    name: 'سيوة',
    subtitle: 'واحة وعيون وكثبان وقلعة شالي',
    x: 0.08,
    y: 0.32,
    side: 'left',
    playable: true,
  },
];
WORLDS.push(...LANDMARK_WORLDS);
/** Each world's boss, by kind (map, HUD bar and the ending recap). */
export const BOSS_NAMES: Record<NonNullable<LevelMeta['bossKind']>, string> = {
  fatwa: 'الفتوة برعي',
  buffalo: 'أبو قرون',
  crab: 'أبو مقص',
  gull: 'ريّس النوة',
  ram: 'الكبش الحارس',
  croc: 'تمساح النيل الكبير',
  captain: 'ريّس الميناء',
  qibli: 'القِبْلي',
  prism: 'خنفساء المنشور',
  guardian: 'حارس النحاس',
  mill: 'ترس الطاحونة',
};
export interface LevelMeta {
  /** Index into WORLDS. */
  world: number;
  id: string;
  name: string;
  subtitle: string;
  theme: Theme;
  /** Seconds on the clock. */
  time: number;
  /** 0 = no darkness, 1 = pitch black outside lights. */
  dark: number;
  /** Ghost ledges become solid within this many tiles of a lit lantern. */
  lanternRadius?: number;
  /** Rising water: starts when the hero passes triggerCol. */
  water?: {
    triggerCol: number;
    col0: number;
    col1: number;
    fromRow: number;
    toRow: number;
    speed: number;
  };
  boss?: boolean;
  /** Which boss: the Cairo tough, the countryside buffalo, the giant crab,
   * the Alexandrian storm gull, the ram guardian of Karnak. */
  bossKind?:
    | 'fatwa'
    | 'buffalo'
    | 'crab'
    | 'gull'
    | 'ram'
    | 'croc'
    | 'captain'
    | 'qibli'
    | 'prism'
    | 'guardian'
    | 'mill';
  landmark?: LandmarkPuzzle;
  /** World 5: torches burn out after this many seconds. */
  torchBurn?: number;
  /** World 5: the Nile current (px/s, negative = flowing left). */
  current?: number;
  /** Crashing waves: every `period` s, after `warn` s of foam (World 4). */
  waves?: { period: number; warn: number; crash: number; roll?: number };
  /** Gust strength (px/s push) and rhythm (ms on / off). */
  gust?: { push: number; on: number; off: number };
  /** Winter storm (نوة): rain, lightning and wet everything. */
  storm?: boolean;
  /** Siwa: auto-forward sandboard run down a dune. */
  board?: { fromCol: number; toCol: number; row: number };
  /** Siwa: column where the sandstorm veil begins. */
  stormFrom?: number;
  /** Aswan's felucca voyage: the boat runs forward on its own. The river
   * runs from jetty `fromCol` to jetty `toCol` with its surface on `row`;
   * gusts are [start second, duration seconds, speed boost px/s]; rocks
   * and crocodiles sit on a side of the channel (lane 0 near, 1 far);
   * coins are [col, lane, count]. */
  sail?: {
    row: number;
    fromCol: number;
    toCol: number;
    gusts: [number, number, number][];
    rocks: [number, number][];
    crocs: [number, number][];
    coins: [number, number, number][];
  };
  /** World 7: the crane's runaway magnet sweeps along behind you from
   * `fromCol` until `toCol` (px/s); let it catch you and you're gone. */
  chase?: { fromCol: number; toCol: number; speed: number };
  /** Sea levels: the tide lifts the water `amp` rows over `period` seconds. */
  tide?: { amp: number; period: number };
  /** Music track for the level and for its boss fight (indices into TRACKS). */
  track: number;
  bossTrack?: number;
  /** Time of day of the painted backdrop (world 2 grades one painting). */
  timeOfDay?: string;
  mechanic: string;
  enemy: string;
  rows: string[];
}

class Grid {
  w: number;
  h: number;
  cells: string[][];
  constructor(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.cells = Array.from({ length: h }, () => Array(w).fill('.'));
  }
  set(x: number, y: number, ch: string) {
    if (x >= 0 && x < this.w && y >= 0 && y < this.h) this.cells[y][x] = ch;
  }
  rect(x0: number, y0: number, x1: number, y1: number, ch = '#') {
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) this.set(x, y, ch);
  }
  /** Places a string; spaces are skipped so it can overlay. */
  text(x: number, y: number, s: string) {
    [...s].forEach((ch, i) => ch !== ' ' && this.set(x + i, y, ch));
  }
  run(x0: number, x1: number, y: number, ch: string) {
    for (let x = x0; x <= x1; x++) this.set(x, y, ch);
  }
  ground(x0: number, x1: number, top = this.h - 2) {
    this.rect(x0, top, x1, this.h - 1, '#');
  }
  /** An irrigation canal: water down to a mud floor, current dir ±1. */
  canal(x0: number, x1: number, dir: number, top = this.h - 3) {
    this.rect(x0, top, x1, this.h - 2, dir > 0 ? 'w' : 'x');
    this.run(x0, x1, this.h - 1, '#');
  }
  /** Harbour water with a sand floor; `top` is the high-tide row. */
  sea(x0: number, x1: number, top = this.h - 5) {
    this.rect(x0, top, x1, this.h - 2, 's');
    this.run(x0, x1, this.h - 1, '#');
  }
  rows() {
    return this.cells.map((r) => r.join(''));
  }
}

/* 1 ─ حارة الفوانيس: night alley, lanterns reveal ghost ledges. */
/* 2 ─ سوق تحت البلد: awnings bounce, carts ferry, crates crumble. */
function market() {
  const g = new Grid(180, 15);
  g.ground(0, 24);
  g.set(3, 12, 'P');
  g.set(18, 12, 'r');
  // Lesson: an awning launches you up a coin column to the gallery.
  g.run(11, 13, 12, 'A');
  for (let y = 3; y <= 9; y++) g.set(12, y, 'o');
  g.run(15, 21, 4, '-');
  g.text(16, 3, 'ooooo');
  // A vendor cart ferries you over the first ditch.
  g.set(25, 12, 'K');
  g.text(27, 10, 'o o');
  g.ground(32, 70);
  // Two routes: the mezzanine gallery or the busy floor.
  g.run(35, 37, 12, 'A');
  g.run(40, 56, 5, '-');
  g.text(41, 4, 'o o o o o o o o');
  g.set(48, 4, 'k');
  g.set(45, 12, 'r');
  g.set(52, 12, 'k');
  g.set(58, 12, 'r');
  g.set(47, 9, 'i');
  g.text(62, 9, 'BCB');
  g.set(66, 9, '?');
  // Set piece: a crumbling crate bridge, then a cart to the far side.
  g.run(72, 74, 12, 'X');
  g.run(77, 79, 12, 'X');
  g.run(82, 84, 12, 'X');
  g.text(75, 10, 'o');
  g.text(80, 10, 'o');
  g.set(86, 11, 'K');
  g.ground(93, 107);
  g.set(96, 12, 'c');
  g.text(98, 9, 'B?B');
  // Awning tower over the spice warehouse wall.
  g.run(102, 104, 12, 'A');
  g.run(103, 106, 4, '-');
  g.text(103, 3, 'oooo');
  g.rect(108, 4, 110, 14, '#');
  g.ground(108, 140);
  g.run(114, 115, 12, 'A');
  g.run(118, 126, 8, '-');
  g.text(118, 7, 'ooooooooo');
  g.set(122, 7, 'r');
  g.set(120, 12, 'k');
  g.text(127, 9, 'BFB');
  g.set(133, 12, 'r');
  // Secrets: the water tank cellar and the golden fanoos in the roof beams.
  g.rect(130, 11, 131, 12, 'T');
  g.run(136, 137, 12, 'A');
  g.run(134, 139, 4, '-');
  g.set(138, 3, 'G');
  g.text(135, 3, 'oo');
  g.ground(141, 144);
  // Canal ferry: two carts and a mooring post.
  g.set(145, 12, 'K');
  g.set(154, 11, 'K');
  g.run(163, 164, 10, '-');
  g.text(150, 9, 'o');
  g.text(159, 8, 'o');
  g.ground(167, 179);
  g.set(171, 12, 'k');
  g.set(175, 12, 'E');
  return g.rows();
}

/* 3 ─ فوق الأسطح: vertical climb with zip lines, dishes and wind. */
function rooftops() {
  const g = new Grid(40, 60);
  g.ground(0, 39, 58);
  // Courtyard: calm start, a first dish to learn the bounce.
  g.set(2, 57, 'P');
  g.text(5, 57, 'o o');
  g.run(5, 9, 55, '-');
  g.rect(11, 52, 18, 57, '#');
  g.text(12, 51, 'o o o');
  g.text(13, 48, '? C');
  g.set(21, 57, 'D');
  g.text(21, 54, 'o');
  g.set(25, 57, 'g');
  g.run(21, 25, 52, '-');
  g.run(24, 28, 49, '-');
  g.set(28, 48, 'r');
  g.run(27, 31, 46, '-');
  g.text(27, 45, 'ooo');
  g.rect(32, 43, 39, 57, '#');
  g.set(36, 42, 'c');
  // Zip line across to the west roof slab.
  g.set(33, 39, 'H');
  g.set(8, 41, 'h');
  g.text(14, 39, 'o o o');
  g.rect(0, 43, 9, 43, '=');
  g.set(8, 39, 'F');
  g.set(38, 39, '?');
  g.text(2, 42, 'o o o');
  // West climb with a dish on an AC unit.
  g.run(2, 6, 40, '-');
  g.run(3, 11, 37, '-');
  g.rect(13, 40, 15, 40, '=');
  g.set(14, 39, 'D');
  g.text(14, 36, 'o');
  g.run(15, 20, 34, '-');
  g.run(11, 17, 31, '-');
  g.text(12, 30, 'ooooo');
  // Secret: a false wall hides the old water-tank room.
  g.rect(0, 33, 2, 33, '#');
  g.rect(0, 37, 2, 37, '#');
  g.rect(0, 34, 2, 36, 'Q');
  g.set(1, 36, 'G');
  g.set(0, 35, 'o');
  g.set(2, 35, 'o');
  // Set piece: the laundry storm — gusts push you along the washing lines.
  g.rect(10, 20, 30, 29, '>');
  g.set(12, 26, 'J');
  g.set(30, 28, 'j');
  g.run(17, 19, 28, '-');
  g.run(22, 24, 25, '-');
  g.text(18, 27, 'o');
  g.text(23, 24, 'o');
  g.set(20, 22, 'p');
  g.set(26, 27, 'p');
  g.rect(31, 30, 39, 34, '#');
  g.text(33, 29, 'o o o');
  // Upper climb to the pigeon tower.
  g.run(33, 37, 27, '-');
  g.run(27, 31, 24, '-');
  g.run(33, 37, 21, '-');
  g.text(34, 20, 'ooo');
  g.run(27, 31, 18, '-');
  g.set(30, 16, 'p');
  g.run(21, 25, 15, '-');
  g.rect(16, 15, 18, 15, '=');
  g.set(17, 14, 'D');
  g.text(17, 11, 'o');
  g.run(14, 28, 9, '-');
  g.text(14, 8, 'ooooo');
  g.set(24, 8, 'r');
  g.rect(30, 6, 39, 9, '#');
  g.set(35, 5, 'E');
  return g.rows();
}

/* 4 ─ تحت المترو: moving planks, a rising-water shaft and the boss. */
function underground() {
  const g = new Grid(151, 24);
  g.rect(0, 0, 150, 2, '#');
  g.ground(0, 30, 22);
  g.set(3, 21, 'P');
  g.set(15, 21, 'm');
  g.set(24, 21, 'm');
  g.text(8, 21, 'o o o');
  g.text(18, 18, 'B?B');
  // Sewer channel crossed on moving planks.
  g.set(32, 20, 'M');
  g.set(40, 19, 'M');
  g.run(47, 48, 20, '-');
  g.text(36, 17, 'o');
  g.text(44, 16, 'o');
  g.ground(51, 89, 22);
  g.text(60, 18, 'BFB');
  g.set(58, 21, 'm');
  g.set(78, 21, 'm');
  g.set(68, 21, 'b');
  g.set(64, 18, '?');
  // Secret alcove behind a false wall above the old platform.
  g.run(66, 68, 19, '-');
  g.run(70, 72, 16, '-');
  g.rect(73, 12, 77, 12, '#');
  g.rect(73, 16, 77, 16, '#');
  g.rect(73, 13, 77, 15, 'Q');
  g.set(76, 15, 'G');
  g.text(74, 15, 'oo');
  g.text(70, 15, 'ooo');
  g.set(86, 21, 'c');
  // Set piece: the flooding shaft. The doorway under its left wall is three
  // rows tall so the big (sandwich) form can walk in without crouching.
  g.rect(90, 4, 90, 18, '#');
  g.rect(111, 7, 111, 23, '#');
  g.ground(90, 110, 22);
  g.run(93, 96, 19, '-');
  g.run(99, 102, 16, '-');
  g.set(105, 15, 'V');
  g.run(100, 103, 9, '-');
  g.text(94, 18, 'oo');
  g.text(100, 15, 'oo');
  g.text(101, 8, 'oo');
  g.run(104, 129, 6, '#');
  g.set(115, 5, 'm');
  g.set(122, 5, 'm');
  g.text(112, 5, 'o  o  o');
  // Chili crate set into the tunnel roof before the drop into the arena.
  g.set(125, 2, '!');
  // Boss arena.
  g.rect(127, 7, 127, 21, '#');
  g.ground(112, 150, 22);
  g.rect(150, 4, 150, 21, '#');
  g.run(132, 134, 19, '-');
  g.run(143, 145, 19, '-');
  g.set(145, 21, 'Z');
  g.set(148, 21, 'E');
  return g.rows();
}

/* ───────────── World 2 · الأرياف (ground top row 12, canals 3 deep) ───────────── */
const G2 = 12;

/* 5 ─ غيطان الفجر: mud that bogs you down, hay-bale stairs, geese and buffalo. */
function fields() {
  const g = new Grid(200, 15);
  g.ground(0, 30, G2);
  g.set(3, 11, 'P');
  g.set(8, 11, '@');
  g.text(11, 11, 'o o');
  g.text(14, 8, 'BFB');
  g.set(24, 11, 'n');
  // Lesson: mud slows you and weighs your jump down.
  g.run(21, 29, G2, 'u');
  g.text(22, 10, 'o o o o');
  g.ground(31, 64, G2);
  // Hay stairs (you can't jump them from the mud).
  g.rect(32, 10, 33, 11, 'N');
  g.rect(36, 8, 37, 11, 'N');
  g.text(36, 7, 'oo');
  g.run(40, 44, 8, '-');
  g.text(40, 7, 'ooooo');
  g.set(47, 8, '?');
  g.set(54, 11, 'q');
  g.text(57, 11, 'o o');
  g.text(64, 9, 'o o');
  g.ground(68, 100, G2);
  // A mud field patrolled by geese, hay steps out of it.
  g.run(70, 80, G2, 'u');
  g.set(74, 11, 'n');
  g.set(79, 11, 'n');
  g.rect(82, 11, 83, 11, 'N');
  g.rect(85, 9, 86, 11, 'N');
  g.run(89, 95, 7, '-');
  g.text(89, 6, 'ooooooo');
  g.text(97, 8, 'BCB');
  g.set(93, 11, 'c');
  g.set(95, 11, '@');
  // First canal: the current carries you downstream.
  g.canal(101, 110, 1);
  g.text(103, 10, 'o o o o');
  g.ground(111, 199, G2);
  // Buffalo strip: lure them into the hay so they knock themselves dizzy.
  g.rect(118, 10, 118, 11, 'N');
  g.text(121, 8, 'B?B');
  g.set(126, 11, 'q');
  g.rect(133, 10, 133, 11, 'N');
  g.set(139, 11, 'q');
  // Secret: a hay tower to the golden fanoos above the fields.
  g.rect(143, 10, 144, 11, 'N');
  g.rect(146, 8, 147, 11, 'N');
  g.rect(149, 6, 150, 11, 'N');
  g.run(152, 158, 4, '-');
  g.text(152, 3, 'ooooo G');
  g.set(162, 8, 'i');
  g.set(166, 11, 'n');
  g.set(172, 11, 'n');
  g.text(176, 8, 'B?B');
  g.text(182, 11, 'o o o');
  g.set(194, 11, 'E');
  g.set(44, 11, 'n');
  g.set(91, 11, 'q');
  g.set(187, 11, 'n');
  g.set(158, 6, 'v');
  return g.rows();
}

/* 6 ─ الترعة: canals with currents, floating palm logs and diving crows. */
function canals() {
  const g = new Grid(210, 15);
  g.ground(0, 24, G2);
  g.set(3, 11, 'P');
  g.set(8, 11, '@');
  g.text(11, 11, 'o o');
  g.text(14, 8, 'B?B');
  // Against the current: ride a palm log across.
  g.canal(25, 36, -1);
  g.set(27, 11, 'M');
  g.text(28, 9, 'o o');
  g.ground(37, 70, G2);
  g.run(40, 44, 8, '-');
  g.text(40, 7, 'ooooo');
  g.text(48, 8, 'BCB');
  g.set(55, 8, '?');
  // First crow sits well after the intro and the first canal.
  g.set(52, 6, 'v');
  g.set(63, 11, 'n');
  // The long canal: two logs and a hay-bale island.
  g.canal(71, 92, -1);
  g.set(73, 11, 'M');
  g.rect(81, 11, 82, 13, 'N');
  g.set(84, 11, 'M');
  g.text(75, 9, 'o o o');
  g.text(86, 9, 'o o o');
  g.set(86, 5, 'v');
  g.ground(93, 120, G2);
  g.set(96, 11, 'c');
  g.set(98, 11, '@');
  g.text(100, 8, 'B?B');
  g.set(106, 8, 'i');
  g.set(112, 11, 'n');
  // Set piece: the sluice race — swim with a strong current under a crow.
  g.canal(121, 140, 1);
  g.text(123, 10, 'o o o o o o o o');
  g.set(132, 6, 'v');
  g.ground(141, 175, G2);
  // Secret: palm-trunk steps to the golden fanoos.
  g.run(146, 148, 9, '=');
  g.run(151, 153, 6, '=');
  g.run(156, 162, 4, '-');
  g.text(156, 3, 'oooo  G');
  g.set(165, 11, 'n');
  g.set(170, 11, 'q');
  g.set(148, 5, 'v');
  g.set(160, 5, 'v');
  g.canal(176, 186, -1);
  g.set(178, 11, 'M');
  g.text(179, 9, 'o o');
  g.ground(187, 209, G2);
  g.text(195, 8, 'BFB');
  g.set(205, 11, 'E');
  g.set(150, 11, 'n');
  g.set(199, 11, 'n');
  g.set(196, 5, 'v');
  return g.rows();
}

/* 7 ─ الساقية: ride waterwheel buckets and the donkey cart over the ditch. */
function waterwheels() {
  const g = new Grid(220, 15);
  g.ground(0, 26, G2);
  g.set(3, 11, 'P');
  g.set(8, 11, '@');
  g.text(11, 11, 'o o');
  g.text(14, 8, 'B?B');
  g.set(22, 11, 'n');
  // Lesson: a saqia over a pit — ride a bucket up to the far ledge.
  g.set(32, 7, 'W');
  g.text(31, 2, 'ooo');
  // A low island so a missed first bucket is a scare, not a void death.
  g.rect(27, 13, 35, 14, '#');
  g.rect(34, 12, 35, 12, 'N');
  g.run(37, 44, 5, '-');
  g.text(38, 4, 'oooooo');
  g.ground(36, 72, G2);
  g.text(48, 8, 'BCB');
  g.set(56, 11, 'q');
  g.set(62, 6, 'v');
  // Set piece: the donkey cart crosses the dry ditch while crows dive.
  g.set(68, 11, 'Y');
  g.set(105, 11, 'y');
  g.text(76, 8, 'o o o o o o o o o o o o');
  g.set(80, 5, 'v');
  g.set(100, 5, 'v');
  g.ground(103, 111, G2);
  g.set(107, 11, 'c');
  g.set(109, 11, '@');
  // Two wheels in a row over a pit: jump bucket to bucket.
  g.set(116, 7, 'W');
  g.set(127, 7, 'W');
  g.text(120, 4, 'ooo');
  g.ground(136, 219, G2);
  g.set(150, 11, 'q');
  g.text(145, 8, 'B?B');
  g.text(156, 8, 'BFB');
  g.set(161, 11, 'n');
  g.set(167, 11, 'n');
  g.set(164, 8, 'i');
  // Secret: a third wheel lifts you to the golden fanoos.
  g.set(176, 7, 'W');
  g.run(180, 185, 3, '-');
  g.text(180, 2, 'oooo G');
  g.set(195, 11, 'n');
  g.set(200, 5, 'v');
  g.text(203, 8, 'B?B');
  g.set(214, 11, 'E');
  g.set(44, 11, 'n');
  g.set(141, 11, 'n');
  g.set(153, 5, 'v');
  g.set(208, 11, 'q');
  return g.rows();
}

/* 8 ─ جرن القمح: everything at once by moonlight, then the buffalo «أبو قرون». */
function threshingFloor() {
  const g = new Grid(191, 15);
  g.ground(0, 22, G2);
  g.set(3, 11, 'P');
  g.set(8, 11, '@');
  g.text(11, 11, 'o o');
  g.text(14, 8, 'B?B');
  g.set(20, 11, 'n');
  g.ground(23, 50, G2);
  g.run(25, 36, G2, 'u');
  g.text(27, 10, 'o o o o');
  g.rect(38, 11, 38, 11, 'N');
  g.rect(40, 9, 41, 11, 'N');
  g.run(44, 49, 7, '-');
  g.text(44, 6, 'oooooo');
  g.set(46, 11, 'q');
  // Canal with a log, the current pushing you on.
  g.canal(51, 66, 1);
  g.set(53, 11, 'M');
  g.text(55, 9, 'o o o');
  g.ground(67, 95, G2);
  g.set(70, 11, 'c');
  g.set(73, 11, '@');
  g.text(74, 8, 'B?B');
  g.set(88, 11, 'q');
  // A saqia over the pit.
  g.set(101, 7, 'W');
  g.text(100, 2, 'ooo');
  g.rect(96, 13, 104, 14, '#');
  g.rect(102, 12, 104, 12, 'N');
  g.ground(105, 160, G2);
  g.text(115, 8, 'BFB');
  g.set(121, 8, 'i');
  g.set(126, 11, 'n');
  // Secret: hay tower to the golden fanoos.
  g.rect(136, 10, 137, 11, 'N');
  g.rect(139, 8, 140, 11, 'N');
  g.run(142, 147, 6, '-');
  g.text(142, 5, 'oooo G');
  g.text(150, 8, 'BCB');
  // Boss arena: climb the hay over the wall and drop into the threshing floor.
  g.rect(156, 10, 157, 11, 'N');
  g.rect(158, 7, 159, 11, 'N');
  g.rect(160, 4, 160, 11, '#');
  g.ground(160, 190, G2);
  g.rect(190, 3, 190, 11, '#');
  g.run(167, 169, 9, '-');
  g.run(181, 183, 9, '-');
  g.set(180, 11, 'Z');
  g.set(187, 11, 'E');
  g.set(77, 11, 'n');
  g.set(112, 11, 'q');
  // Chili crate before the buffalo's arena: walk in armed.
  g.set(155, 8, '!');
  return g.rows();
}

/* ───────────── World 3 · دمياط (workshops: ground row 12 · harbour: quay row 10) ───────────── */
const G3 = 12,
  GH = 10;

/* 9 ─ شارع الموبيليا: conveyor belts, toppling furniture, runaway tools. */
function workshopStreet() {
  const g = new Grid(236, 15);
  g.ground(0, 38, G3);
  g.set(3, 11, 'P');
  g.text(6, 11, 'o o o');
  g.text(10, 8, 'B?B');
  g.set(16, 11, 'e');
  // Lesson: the belt carries you along.
  g.run(20, 33, G3, '}');
  g.text(22, 10, 'o o o o o o');
  g.set(30, 11, 'f');
  // Lesson: climb the stacked furniture and it topples into a bridge.
  g.set(38, 11, 'R');
  g.text(40, 9, 'o o');
  g.ground(46, 80, G3);
  g.set(50, 11, 'd');
  g.text(54, 8, 'BCB');
  g.set(58, 11, 'e');
  g.run(60, 64, 8, '-');
  g.text(60, 7, 'ooooo');
  g.set(67, 8, '?');
  g.set(70, 11, 'f');
  g.set(75, 11, 'e');
  // Against the belt, saws riding it towards you, then a stack bridge.
  g.ground(81, 97, G3);
  g.run(81, 96, G3, '{');
  g.text(84, 10, 'o o o o o o');
  g.set(88, 11, 'd');
  g.set(97, 11, 'R');
  g.text(99, 9, 'o o');
  g.ground(105, 140, G3);
  g.set(108, 11, 'c');
  g.text(112, 8, 'B?B');
  g.set(118, 8, 'i');
  g.set(125, 11, 'f');
  g.set(132, 11, 'e');
  // Set piece: the long belt with saws and shelves overhead.
  g.ground(141, 170, G3);
  g.run(141, 170, G3, '}');
  g.run(146, 150, 8, '-');
  g.run(156, 160, 8, '-');
  g.text(146, 7, 'ooooo');
  g.text(156, 7, 'ooooo');
  g.set(152, 11, 'd');
  g.set(164, 11, 'd');
  g.ground(171, 235, G3);
  // Secret: a stack up to the varnish shelf (jump before it topples).
  g.set(175, 11, 'R');
  g.run(178, 184, 6, '-');
  g.text(178, 5, 'oooo  G');
  g.set(190, 11, 'f');
  g.set(196, 11, 'd');
  g.text(200, 8, 'BFB');
  g.set(206, 11, 'e');
  g.set(212, 11, 'f');
  g.set(220, 11, 'd');
  g.set(225, 11, 'f');
  g.text(215, 11, 'o o o');
  g.set(230, 11, 'E');
  return g.rows();
}

/* 10 ─ جوه الورشة: lamp-lit workshop, swinging chandeliers over the saw pits. */
function insideWorkshop() {
  const g = new Grid(240, 15);
  g.ground(0, 24, G3);
  g.set(3, 11, 'P');
  g.text(6, 11, 'o o o');
  g.text(10, 8, 'B?B');
  g.set(15, 11, 'e');
  // Lesson: ride the chandelier over the pit.
  g.rect(21, 10, 24, 11);
  g.set(26, 4, 'O');
  g.text(25, 4, 'o');
  g.text(27, 4, 'o');
  g.ground(34, 60, G3);
  g.text(40, 8, 'BCB');
  g.set(46, 11, 'e');
  g.set(52, 11, 'd');
  g.set(56, 11, 'f');
  g.set(60, 11, 'R');
  g.text(62, 9, 'o o');
  g.ground(68, 80, G3);
  g.set(72, 11, 'f');
  // Two chandeliers in a row over the long pit.
  g.rect(77, 10, 80, 11);
  g.set(83, 4, 'O');
  g.set(91, 4, 'O');
  g.text(85, 3, 'o o o o');
  g.ground(98, 140, G3);
  g.set(102, 11, 'c');
  // The belt runs against you, saws and planes coming down it.
  g.run(110, 125, G3, '{');
  g.text(112, 10, 'o o o o o');
  g.set(116, 11, 'd');
  g.set(122, 11, 'e');
  g.text(128, 8, 'B?B');
  g.set(134, 11, 'f');
  g.set(138, 11, 'd');
  // Stack bridge to a single post, then on.
  g.set(140, 11, 'R');
  g.rect(147, 11, 147, 14);
  g.text(142, 9, 'o o');
  g.ground(151, 185, G3);
  // Secret: lumber shelves up to the golden fanoos.
  g.run(155, 157, 9, '=');
  g.run(160, 164, 6, '-');
  g.text(160, 5, 'oo G');
  g.set(167, 8, 'i');
  g.set(169, 11, 'e');
  g.run(172, 184, G3, '}');
  g.set(176, 11, 'd');
  g.set(181, 11, 'f');
  // A last chandelier pit.
  g.rect(183, 10, 185, 11);
  g.set(188, 4, 'O');
  g.ground(195, 239, G3);
  g.text(200, 8, 'BFB');
  g.set(207, 11, 'd');
  g.set(212, 11, 'e');
  g.set(218, 11, 'f');
  g.set(224, 11, 'd');
  g.set(228, 11, 'e');
  g.text(216, 11, 'o o o');
  g.set(37, 11, 'f');
  g.set(158, 11, 'd');
  g.set(197, 11, 'e');
  g.set(234, 11, 'E');
  return g.rows();
}

/* 11 ─ ميناء الصيد: the tide, bobbing boats, net climbs, crabs and gulls. */
function harbor() {
  const g = new Grid(240, 15);
  g.ground(0, 24, GH);
  g.set(3, 9, 'P');
  g.text(6, 9, 'o o o');
  g.text(10, 6, 'B?B');
  g.set(18, 9, 'a');
  // Lesson: a small inlet — the tide comes in and out.
  g.sea(25, 32);
  g.text(26, 8, 'o o o o');
  g.ground(33, 60, GH);
  g.set(40, 3, 'l');
  g.set(45, 9, 'a');
  g.text(48, 6, 'BCB');
  g.set(55, 9, 'f');
  // A basin crossed on a drifting fishing boat.
  g.sea(61, 82);
  g.set(62, 10, 'U');
  g.set(77, 10, 'I');
  g.text(64, 8, 'o o o o o o o');
  g.set(70, 3, 'l');
  g.ground(83, 124, GH);
  g.set(86, 9, 'c');
  // Climb the net to the pier deck, gulls overhead.
  g.rect(94, 4, 94, 9, '%');
  g.run(95, 99, 3, '=');
  g.text(95, 2, 'ooooo');
  g.run(103, 107, 5, '-');
  g.text(103, 4, 'ooo');
  g.set(104, 1, 'l');
  g.set(110, 9, 'a');
  g.set(115, 9, 'a');
  g.set(120, 9, 'f');
  // Two boats, boat to boat across the wide basin.
  g.sea(125, 150);
  g.set(126, 10, 'U');
  g.set(134, 10, 'I');
  g.set(138, 10, 'U');
  g.set(146, 10, 'I');
  g.text(128, 8, 'o o o o o o o o o o');
  g.set(132, 3, 'l');
  g.set(144, 2, 'l');
  g.ground(151, 239, GH);
  g.text(156, 6, 'B?B');
  g.set(162, 6, 'i');
  g.set(166, 9, 'a');
  // Secret: up the net to the crow's nest.
  g.rect(170, 3, 170, 9, '%');
  g.run(171, 176, 3, '-');
  g.text(171, 2, 'oooo G');
  g.set(180, 9, 'f');
  g.set(184, 3, 'l');
  g.sea(188, 197);
  g.set(189, 10, 'U');
  g.set(193, 10, 'I');
  g.set(203, 9, 'a');
  g.text(206, 6, 'BFB');
  g.set(212, 9, 'f');
  g.set(218, 2, 'l');
  g.set(222, 9, 'a');
  g.set(227, 9, 'a');
  g.text(214, 9, 'o o o');
  g.set(234, 9, 'E');
  return g.rows();
}

/* 12 ─ رأس البر: where the Nile meets the sea — everything, then «أبو مقص». */
function rasElBar() {
  const g = new Grid(191, 15);
  g.ground(0, 22, GH);
  g.set(3, 9, 'P');
  g.text(6, 9, 'o o o');
  g.text(10, 6, 'B?B');
  g.set(16, 9, 'a');
  g.set(20, 3, 'l');
  // The fish-market belt and a crate stack over the gap.
  g.ground(23, 40, GH);
  g.run(23, 36, GH, '}');
  g.text(25, 8, 'o o o o o');
  g.set(30, 9, 'd');
  g.set(40, 9, 'R');
  g.text(42, 7, 'o o');
  g.ground(48, 70, GH);
  g.set(52, 9, 'f');
  g.text(56, 6, 'BCB');
  g.set(62, 9, 'a');
  g.set(66, 3, 'l');
  // A harbour lantern swings over the water, then a boat.
  g.sea(71, 86);
  g.set(74, 4, 'O');
  g.set(80, 10, 'U');
  g.set(84, 10, 'I');
  g.text(75, 8, 'o o o o o');
  g.ground(87, 120, GH);
  g.set(90, 9, 'c');
  g.set(96, 9, 'a');
  // Net to the lighthouse pier.
  g.rect(100, 4, 100, 9, '%');
  g.run(101, 105, 3, '=');
  g.text(101, 2, 'oo G');
  g.set(108, 2, 'l');
  g.set(112, 9, 'f');
  g.set(116, 9, 'a');
  g.sea(121, 134);
  g.set(122, 10, 'U');
  g.set(129, 10, 'I');
  g.text(123, 8, 'o o o o');
  g.set(127, 3, 'l');
  g.ground(135, 160, GH);
  g.text(140, 6, 'BFB');
  g.set(146, 9, 'd');
  g.set(150, 9, 'a');
  // Boss arena: up the breakwater blocks, over the wall, onto the beach.
  g.rect(154, 8, 155, 9);
  g.rect(157, 5, 158, 9);
  g.rect(160, 3, 160, 9);
  g.ground(160, 190, GH);
  g.rect(190, 1, 190, 9);
  g.run(167, 169, 7, '-');
  g.run(181, 183, 7, '-');
  g.set(180, 9, 'Z');
  g.set(187, 9, 'E');
  g.set(57, 9, 'd');
  g.set(138, 9, 'f');
  // Chili crate before the crab's arena: walk in armed.
  g.set(152, 6, '!');
  return g.rows();
}

/* ───────────── World 4 · اسكندرية (promenade row 11 · tram street row 13) ───────────── */
const G4 = 11,
  GT = 13;

/* 13 ─ الكورنيش: waves break over the sea wall on a beat; wet tiles slide. */
function corniche() {
  const g = new Grid(250, 15);
  g.ground(0, 26, G4);
  g.set(3, 10, 'P');
  g.text(6, 10, 'o o o');
  g.text(10, 7, 'B?B');
  g.set(17, 10, '4');
  // Lesson: a wave breaks over the wall — wait for it, then run.
  g.run(20, 25, G4, '$');
  g.set(23, 10, '*');
  g.text(21, 7, 'o   o');
  // A little beach: swim past the jellyfish.
  g.sea(27, 34, 12);
  g.set(31, 13, '2');
  g.text(28, 9, 'o o o o');
  g.ground(35, 70, G4);
  g.set(40, 3, 'l');
  g.set(43, 10, '(');
  // Café awnings to glide between.
  g.run(46, 50, 8, '-');
  g.text(46, 7, 'ooooo');
  g.run(53, 56, 5, '-');
  g.text(53, 4, 'oooo');
  g.run(54, 63, G4, '$');
  g.set(56, 10, '*');
  g.set(61, 10, '*');
  g.set(58, 4, '1');
  g.text(65, 7, 'BCB');
  g.set(69, 10, '4');
  g.ground(75, 110, G4);
  g.set(79, 10, 'c');
  g.set(85, 7, '3');
  // A set of two waves in a row.
  g.run(87, 97, G4, '$');
  g.set(90, 10, '*');
  g.set(94, 10, '*');
  g.text(88, 7, 'o o o o o');
  g.text(99, 7, 'B?B');
  g.set(104, 7, 'i');
  g.set(107, 10, '4');
  // A wider beach, two jellyfish.
  g.sea(111, 122, 12);
  g.set(114, 13, '2');
  g.set(119, 12, '2');
  g.text(112, 9, 'o o o o o o');
  g.ground(123, 170, G4);
  g.set(126, 10, '(');
  // Up onto the balustrade promenade; the fanoos waits on a lamp post.
  g.rect(130, 8, 150, 10);
  g.set(136, 7, '*');
  g.set(141, 7, '4');
  g.set(145, 3, '1');
  g.run(152, 156, 5, '-');
  g.text(152, 4, 'ooo G');
  g.set(160, 6, '3');
  g.set(164, 10, '4');
  g.set(168, 10, '*');
  g.text(157, 10, 'o o o');
  // A gap in the wall.
  g.text(171, 7, 'o   o');
  g.ground(176, 249, G4);
  g.text(181, 7, 'BFB');
  g.run(186, 198, G4, '$');
  g.set(188, 10, '*');
  g.set(192, 10, '*');
  g.set(196, 10, '*');
  g.set(193, 4, '1');
  g.set(201, 10, '(');
  g.set(205, 7, '3');
  g.set(209, 10, '4');
  g.set(212, 2, 'l');
  g.text(215, 7, 'B?B');
  g.set(219, 10, '4');
  g.run(222, 228, G4, '$');
  g.set(225, 10, '*');
  g.set(230, 4, '1');
  g.set(234, 10, '4');
  g.text(236, 10, 'o o o');
  g.set(244, 10, 'E');
  return g.rows();
}

/* 14 ─ الترام: ride the roof of the yellow tram; duck under wires and bridges. */
function tramRide() {
  const g = new Grid(232, 15);
  g.ground(0, 231, GT);
  g.set(2, 12, 'P');
  g.text(4, 9, 'o o');
  // The tram waits at the stop; climb on and it sets off.
  g.set(6, 12, '&');
  g.set(208, 12, '+');
  g.text(9, 8, 'o o o');
  // Wires to duck under, bridges, boxes overhead, gulls and umbrellas.
  g.set(26, 8, '|');
  g.text(30, 8, 'o o o');
  g.text(36, 6, 'B?B');
  g.set(44, 3, '1');
  g.set(48, 8, '|');
  g.set(49, 8, '|');
  g.set(54, 7, '3');
  g.rect(62, 5, 65, 8, ':');
  g.text(68, 8, 'o o o o');
  g.set(74, 2, 'l');
  g.set(78, 8, '|');
  g.text(84, 6, 'BCB');
  g.set(90, 3, '1');
  g.set(93, 8, '|');
  g.set(94, 8, '|');
  // The secret: off the roof onto a balcony and up to the fanoos.
  g.run(99, 103, 7, '-');
  g.run(105, 107, 5, '-');
  g.text(99, 6, 'ooo');
  g.set(107, 4, 'G');
  g.set(110, 8, '|');
  g.set(116, 7, '3');
  g.set(120, 12, 'c');
  g.rect(124, 5, 127, 8, ':');
  g.text(130, 8, 'o o o');
  g.set(134, 3, '1');
  g.set(138, 8, '|');
  g.set(139, 8, '|');
  g.text(144, 6, 'B?B');
  g.set(148, 2, 'l');
  g.set(152, 7, '3');
  g.set(156, 8, '|');
  g.set(162, 3, '1');
  g.set(168, 8, '|');
  g.set(169, 8, '|');
  g.text(172, 6, 'BFB');
  g.rect(180, 5, 183, 8, ':');
  g.set(186, 3, '1');
  g.set(190, 7, '3');
  g.set(194, 8, '|');
  g.text(198, 8, 'o o o');
  g.set(203, 3, '1');
  // The street below: broken bottles and runaway beach balls.
  for (const x of [40, 70, 100, 132, 160, 188]) g.set(x, 12, '4');
  for (const x of [56, 86, 146, 176]) g.run(x, x + 1, 12, '^');
  g.set(220, 12, '4');
  g.text(222, 12, 'o o');
  g.set(227, 12, 'E');
  return g.rows();
}

/* 15 ─ كوبري ستانلي: a headwind over the bridge, gaps to glide, sea below. */
function stanley() {
  const g = new Grid(240, 15);
  g.ground(0, 24, G4);
  g.set(3, 10, 'P');
  g.text(6, 10, 'o o o');
  g.text(9, 7, 'B?B');
  g.set(14, 10, '4');
  g.run(16, 22, G4, '$');
  g.set(19, 10, '*');
  g.set(23, 10, '(');
  // The bridge: a deck on piers over the bay, broken by repair gaps.
  g.sea(25, 214, 11);
  g.run(25, 214, 14, '#');
  const deck = (a: number, b: number) => g.rect(a, 8, b, 9);
  const pier = (x: number) => g.rect(x, 10, x + 1, 13);
  g.rect(25, 9, 27, 10);
  deck(25, 52);
  pier(38);
  pier(50);
  // Pavilions (the bridge towers) to hop over.
  g.rect(34, 5, 36, 7);
  g.set(32, 3, '1');
  g.text(42, 4, 'BCB');
  g.set(47, 7, '4');
  // Gap 1: glide it or swim and climb the buoy ledge.
  g.run(53, 54, 10, '-');
  g.set(56, 12, '2');
  g.text(54, 6, 'o o o');
  deck(58, 90);
  pier(66);
  pier(80);
  g.run(60, 70, 8, '$');
  g.set(64, 7, '3');
  g.set(72, 7, '4');
  g.rect(76, 5, 78, 7);
  g.set(80, 3, '1');
  g.text(84, 4, 'B?B');
  g.set(88, 7, '4');
  g.run(91, 92, 10, '-');
  g.set(93, 12, '2');
  g.text(91, 6, 'o o o');
  deck(96, 130);
  pier(104);
  pier(120);
  g.set(100, 7, 'c');
  g.set(106, 7, '(');
  // Secret: up the lamp standards to the fanoos above the bridge.
  g.run(110, 112, 6, '-');
  g.run(114, 117, 3, '-');
  g.text(114, 2, 'oo G');
  g.set(119, 7, '3');
  g.rect(123, 5, 125, 7);
  g.set(127, 7, '4');
  g.run(131, 132, 10, '-');
  g.set(134, 12, '2');
  g.set(136, 12, '2');
  g.text(131, 6, 'o o o o');
  deck(137, 175);
  pier(146);
  pier(162);
  g.text(140, 4, 'BFB');
  g.set(145, 3, '1');
  g.run(149, 160, 8, '$');
  g.set(152, 7, '3');
  g.set(158, 7, '4');
  g.rect(165, 5, 167, 7);
  g.set(170, 2, 'l');
  g.set(173, 7, '4');
  g.run(176, 177, 10, '-');
  g.set(179, 12, '2');
  g.text(176, 6, 'o o o');
  deck(181, 214);
  pier(190);
  pier(204);
  g.set(185, 7, '3');
  g.set(189, 3, '1');
  g.text(194, 4, 'B?B');
  g.set(199, 7, '4');
  g.set(203, 7, '4');
  g.set(208, 3, '1');
  // Off the bridge onto the corniche again.
  g.ground(215, 239, G4);
  g.rect(212, 9, 214, 10);
  g.set(220, 10, '*');
  g.run(218, 223, G4, '$');
  g.set(227, 10, '4');
  g.text(229, 10, 'o o o');
  g.set(235, 10, 'E');
  // A headwind blows across the whole bridge.
  g.set(28, 4, '<');
  g.set(211, 7, '<');
  return g.rows();
}

/* 16 ─ قلعة قايتباي: the storm (نوة) on the rocks, the fort walls, the boss. */
function qaitbay() {
  const g = new Grid(214, 15);
  g.ground(0, 22, G4);
  g.set(3, 10, 'P');
  g.text(6, 10, 'o o o');
  // Safe start before any enemy: a ful box to grow, a chili box (thrown up
  // in an arc in Alexandria, so it reaches the gulls) and an umbrella to
  // glide over the tide pools.
  g.text(5, 7, 'BFBCB');
  g.set(11, 10, '(');
  g.run(12, 22, G4, '$');
  g.set(15, 10, '*');
  g.set(20, 10, '*');
  g.set(18, 3, '1');
  // Rocks and tide pools at the foot of the fort.
  g.sea(23, 30, 12);
  g.set(26, 13, '2');
  g.rect(26, 10, 27, 11);
  g.text(25, 8, 'o o');
  g.ground(31, 60, G4);
  // Dry stones to land on out of the tide pool and wait for the waves, then
  // two waves that break together: run past both in the calm between.
  // A dry stone between the two waves, out of reach of both: small بلبل
  // can stop there and wait out the next one.
  g.run(36, 38, G4, '$');
  g.run(42, 44, G4, '$');
  g.set(37, 10, '*');
  g.set(43, 10, '*');
  g.set(36, 4, '1');
  g.set(47, 7, '3');
  g.text(49, 7, 'BCB');
  g.set(57, 10, '(');
  g.sea(61, 72, 12);
  g.set(64, 13, '2');
  g.set(69, 12, '2');
  g.rect(66, 10, 67, 11);
  g.text(62, 8, 'o o o o o');
  // A stone at the water line by each far bank, so you climb out with a
  // normal one-step jump instead of treading water against the wall.
  g.rect(71, 12, 72, 12);
  g.rect(29, 12, 30, 12);
  // The fort walls: climb the stepped bastion in the gale.
  g.ground(73, 128, G4);
  g.set(76, 10, 'c');
  // The same kit again just past the checkpoint, for a respawn.
  g.text(76, 7, 'BFBC');
  g.set(79, 10, '(');
  g.rect(82, 8, 128, 10);
  g.rect(90, 5, 128, 7);
  g.run(82, 89, 8, '$');
  g.set(85, 7, '*');
  // Gulls over the bastion fly above head height, like everywhere else,
  // and not right over the step up from the slippery ledge (there they sat
  // in the arc of the only jump up).
  // Not over the wave on the wet ledge either: one danger at a time.
  g.set(100, 1, '1');
  g.text(96, 1, 'B?B');
  g.run(104, 114, 5, '$');
  g.set(108, 4, '*');
  // One beach ball on the bastion. Balls used to roll off it straight
  // away; now they keep to their ledge, so three would crowd the climb.
  g.set(112, 4, '4');
  // Secret: the lantern of the old lighthouse, on the tower top.
  g.rect(116, 3, 119, 4);
  g.text(116, 2, 'o  G');
  g.set(122, 1, '1');
  // Down into the courtyard by the battlements.
  g.rect(129, 8, 132, 10);
  g.ground(129, 160, G4);
  g.text(136, 7, 'BFB');
  // One wave in the courtyard, on a short wet patch.
  g.run(140, 146, G4, '$');
  g.set(143, 10, '*');
  g.set(146, 4, '1');
  // Gale: the wind changes its mind across the battlements.
  g.set(84, 2, '>');
  g.set(126, 4, '>');
  g.set(134, 3, '<');
  g.set(158, 9, '<');
  // Boss arena: the roof of the keep, open to the storm.
  g.rect(161, 7, 162, 10);
  g.ground(161, 213, G4);
  g.rect(213, 1, 213, 10);
  g.run(171, 174, 7, '-');
  g.run(186, 189, 7, '-');
  g.run(201, 204, 7, '-');
  g.set(196, 6, 'Z');
  g.set(210, 10, 'E');
  // Chili crate before the gull's arena: walk in armed.
  g.set(167, 7, '!');
  return g.rows();
}

/* ───────────── World 5 · الأقصر (ground row 12) ───────────── */
const G5 = 12;
/** A ram-headed sphinx on its plinth: steps up at both ends. */
function sphinx(g: Grid, x: number) {
  g.rect(x, 10, x + 6, 11);
  g.rect(x + 1, 8, x + 4, 9, ',');
}
/** A sand slide: stairs of pouring sand, `steps` rows down from `row`,
 * descending right (';') or left ('_'), filled solid beneath. */
function slide(g: Grid, x: number, row: number, steps: number, ch: string) {
  for (let i = 0; i < steps; i++) {
    const r = row + i,
      cols =
        ch === ';' ? [x + 2 * i, x + 2 * i + 1] : [x - 2 * i, x - 2 * i - 1];
    for (const c of cols) {
      g.set(c, r, ch);
      g.rect(c, r + 1, c, G5 - 1);
    }
  }
}
/** A rotating stone door under a lintel (cols x-2..x+2), its lever `back`
 * columns before it. */
function gateway(g: Grid, x: number, back: number, top = 2) {
  g.rect(x - 2, top, x + 2, top + 2);
  g.rect(x, top + 3, x, G5 - 1, ']');
  g.set(x - back, G5 - 1, '0');
}

/* 17 ─ طريق الكباش: the sphinx avenue in the afternoon sun. */
function ramAvenue() {
  const g = new Grid(260, 15);
  g.ground(0, 34, G5);
  g.set(3, 11, 'P');
  g.text(6, 11, 'o o o');
  g.text(10, 8, 'B?B');
  sphinx(g, 19);
  g.set(21, 7, '7');
  g.text(26, 9, 'o o');
  g.set(30, 11, '5');
  // Lesson: cracked slabs over a pit collapse under you — keep running.
  g.run(35, 39, G5, 'X');
  g.text(35, 10, 'o o o');
  g.ground(40, 76, G5);
  g.text(47, 8, 'BFB');
  sphinx(g, 52);
  g.set(54, 7, '5');
  g.set(61, 11, '7');
  // A dune and its sand slide.
  g.rect(64, 9, 67, 11);
  slide(g, 68, 10, 2, ';');
  g.text(64, 7, 'oooo');
  g.ground(81, 120, G5);
  g.set(83, 11, 'c');
  g.text(86, 8, 'B?B');
  g.set(90, 8, 'i');
  g.set(93, 11, '7');
  sphinx(g, 96);
  g.set(105, 11, '5');
  g.run(108, 113, 9, '=');
  g.text(108, 7, 'oooooo');
  // The high dune: stairs up, then a long slide down into the devil.
  g.ground(119, 150, G5);
  g.rect(119, 10, 120, 11);
  g.rect(121, 8, 125, 11);
  slide(g, 126, 9, 3, ';');
  g.text(121, 6, 'ooooo');
  g.set(134, 10, '8');
  g.set(140, 11, '5');
  g.run(151, 155, G5, 'X');
  g.text(151, 9, 'o o o');
  g.ground(156, 215, G5);
  g.set(158, 11, '7');
  g.text(160, 8, 'BCB');
  sphinx(g, 165);
  // Secret: up the stepped pylon of a gateway to the golden fanoos.
  g.rect(178, 10, 179, 11);
  g.rect(180, 7, 181, 11);
  g.rect(182, 4, 186, 11);
  g.text(182, 3, 'ooo');
  g.set(185, 2, 'G');
  // Sand pouring against you along the ground.
  g.run(199, 203, G5, '_');
  g.text(199, 9, 'o o o');
  g.set(223, 11, '7');
  g.ground(220, 259, G5);
  g.text(223, 8, 'B?B');
  g.set(228, 11, '5');
  g.set(240, 11, '5');
  sphinx(g, 243);
  g.set(255, 11, 'E');
  g.set(7, 11, '@');
  g.set(85, 11, '@');
  return g.rows();
}

/* 18 ─ النيل: feluccas on the current and hot-air balloons at dawn. */
function nileDawn() {
  const g = new Grid(250, 15);
  g.ground(0, 24, G5);
  g.set(3, 11, 'P');
  g.text(6, 11, 'o o o');
  g.text(9, 8, 'B?B');
  g.set(20, 11, '7');
  // The Nile: swimming fights the current; ride the felucca.
  g.sea(25, 52, G5);
  g.set(26, G5, 'U');
  g.set(45, G5, 'I');
  g.text(28, 9, 'o o o o o o');
  g.ground(53, 80, G5);
  g.set(55, 11, '7');
  // A balloon lifts you to the palm-top ledge.
  g.set(58, 11, 'z');
  g.run(61, 66, 5, '=');
  g.text(61, 4, 'ooooo');
  g.set(65, 4, '7');
  g.set(70, 11, '5');
  g.sea(81, 110, G5);
  g.set(82, G5, 'U');
  g.set(100, G5, 'I');
  // From the felucca onto a balloon over the river; the fanoos is high up.
  g.set(92, 9, 'z');
  g.run(96, 99, 3, '=');
  g.text(96, 2, 'oo');
  g.set(98, 1, 'G');
  g.set(95, 6, '8');
  g.ground(111, 140, G5);
  g.set(113, 11, 'c');
  g.text(116, 8, 'BFB');
  g.set(125, 11, '5');
  // Balloon up the cliff.
  g.set(129, 11, 'z');
  g.rect(132, 6, 140, 11);
  g.text(133, 4, 'o o o');
  g.set(135, 5, '5');
  // The widest reach: two feluccas and a balloon in the middle.
  g.sea(141, 175, G5);
  g.set(142, G5, 'U');
  g.set(152, G5, 'I');
  g.set(156, G5, 'U');
  g.set(170, G5, 'I');
  g.set(165, 9, 'z');
  g.text(158, 9, 'o o o');
  g.set(168, 6, '8');
  g.ground(176, 191, G5);
  g.text(179, 8, 'B?B');
  g.set(184, 11, '7');
  g.run(192, 195, G5, 'X');
  g.text(192, 10, 'oooo');
  g.ground(196, 215, G5);
  g.set(200, 11, '5');
  g.set(207, 11, '5');
  g.text(210, 8, 'BCB');
  g.sea(216, 236, G5);
  g.set(217, G5, 'U');
  g.set(230, G5, 'I');
  g.set(225, 9, '8');
  g.ground(237, 249, G5);
  g.set(240, 11, '5');
  g.set(245, 11, 'E');
  g.set(7, 11, '@');
  g.set(115, 11, '@');
  return g.rows();
}

/* 19 ─ وادي الملوك: inside the tomb — torches burn out, floors give way,
 * pillars crush and the mummies keep getting up. */
function kingsValley() {
  const g = new Grid(240, 15);
  g.rect(0, 0, 239, 1);
  g.ground(0, 30, G5);
  g.set(3, 11, 'P');
  g.set(6, 11, 'L');
  g.text(8, 11, 'o o o');
  g.text(10, 8, 'B?B');
  g.set(22, 2, '[');
  g.set(26, 11, '5');
  // Lesson: the floor gives way.
  g.run(31, 35, G5, 'X');
  g.text(31, 10, 'o o o');
  g.ground(36, 70, G5);
  g.set(38, 11, 'L');
  g.set(42, 11, '5');
  g.set(46, 2, '9');
  g.set(50, 2, '[');
  g.set(54, 11, '6');
  // Pull the lever and race the rotating door before it swings shut.
  gateway(g, 64, 6, 1);
  g.set(61, 11, '5');
  g.text(66, 11, 'o o');
  // The torch relay over the dark shaft.
  g.set(69, 11, 'L');
  g.run(71, 74, 11, '~');
  g.run(76, 77, 10, '=');
  g.set(77, 9, 'L');
  g.run(79, 81, 10, '~');
  g.text(72, 9, 'o o');
  g.text(79, 8, 'o o');
  g.ground(83, 124, G5);
  g.set(85, 11, 'c');
  g.text(88, 8, 'BFB');
  g.set(97, 2, '[');
  g.set(100, 11, '6');
  g.set(101, 2, '[');
  g.set(109, 2, '9');
  gateway(g, 118, 6, 1);
  g.set(115, 11, '5');
  g.set(121, 11, '7');
  g.run(125, 130, G5, 'X');
  g.text(125, 10, 'o o o');
  g.ground(131, 170, G5);
  g.set(134, 11, '6');
  g.set(140, 11, '7');
  // Secret: a torch lights a ghost stair to a hidden burial niche.
  g.set(144, 11, 'L');
  g.run(146, 148, 9, '~');
  g.set(148, 8, 'L');
  g.run(150, 152, 6, '~');
  g.text(150, 5, 'oo');
  g.set(152, 4, 'G');
  g.set(156, 11, '5');
  g.set(160, 2, '9');
  g.set(164, 2, '[');
  g.set(167, 11, '7');
  g.ground(175, 239, G5);
  g.set(178, 11, '6');
  gateway(g, 188, 6, 1);
  g.set(192, 2, '[');
  g.set(195, 2, '[');
  g.set(196, 11, '6');
  g.text(201, 8, 'B?B');
  g.set(204, 11, '6');
  g.set(213, 2, '9');
  g.set(216, 11, '7');
  g.set(220, 11, '6');
  g.set(230, 11, 'L');
  g.set(235, 11, 'E');
  g.set(7, 11, '@');
  g.set(87, 11, '@');
  return g.rows();
}

/* 20 ─ معبد الكرنك: moonlight in Karnak — lotus columns, rotating doors,
 * crushing pillars, and the ram guardian. */
function karnak() {
  const g = new Grid(220, 15);
  g.ground(0, 24, G5);
  g.set(3, 11, 'P');
  g.text(6, 11, 'o o o');
  g.text(9, 8, 'B?B');
  g.set(21, 11, '5');
  // Broken lotus columns over a sand pit.
  g.rect(27, 9, 28, 14, '/');
  g.rect(31, 8, 32, 14, '/');
  g.rect(35, 10, 36, 14, '/');
  g.rect(39, 8, 40, 14, '/');
  g.rect(43, 9, 44, 14, '/');
  g.text(27, 7, 'oo  oo  oo  oo  oo');
  g.set(31, 7, '7');
  g.set(46, 9, '8');
  g.ground(45, 90, G5);
  g.set(49, 11, '5');
  gateway(g, 60, 8);
  g.set(58, 5, '9');
  g.set(62, 5, '9');
  g.text(63, 11, 'o o');
  // The hypostyle hall: a roof and spaced crushing pillars on a beat.
  g.rect(66, 0, 88, 2);
  g.set(70, 3, '[');
  g.set(78, 3, '[');
  g.set(86, 3, '[');
  g.set(92, 11, 'c');
  g.ground(91, 109, G5);
  g.text(95, 8, 'BFB');
  g.rect(100, 9, 103, 11);
  slide(g, 104, 10, 2, ';');
  g.set(109, 11, '5');
  g.ground(114, 165, G5);
  g.set(117, 11, '7');
  // Secret: lotus columns up to the fanoos on the tallest capital.
  g.rect(120, 10, 121, 11, '/');
  g.rect(123, 7, 124, 11, '/');
  g.rect(126, 5, 127, 11, '/');
  g.text(126, 4, 'oo');
  g.set(127, 2, 'G');
  g.set(125, 3, '8');
  g.set(131, 11, '5');
  g.set(137, 11, '7');
  gateway(g, 146, 8);
  g.set(144, 5, '9');
  g.set(148, 5, '9');
  g.set(156, 11, '6');
  g.set(160, 10, '8');
  // The boss court: torches for when the moon goes dark, and ledges
  // to escape the shockwaves. The ram fights alone here, plus one
  // telegraphed falling stone (spawned in the fight, not on the map).
  g.ground(166, 219, G5);
  g.rect(184, 0, 218, 1);
  g.set(188, 11, 'L');
  g.set(212, 11, 'L');
  g.run(186, 189, 8, '-');
  g.run(209, 212, 8, '-');
  g.rect(219, 0, 219, 11);
  g.set(200, 11, 'Z');
  g.set(215, 11, 'E');
  g.set(7, 11, '@');
  g.set(94, 11, '@');
  g.set(178, 8, '!');
  return g.rows();
}

/* ─────────────── World 6: أسوان ─────────────── */
const G6 = 12;
/** A Nubian house: a painted block `h` rows tall with a flat roof. */
function house(g: Grid, x: number, w: number, h: number) {
  g.rect(x, G6 - h, x + w - 1, G6 - 1);
}

/* 21 ─ نجع النوبة: a painted Nubian village above the river. */
function nubianVillage() {
  const g = new Grid(240, 15);
  g.ground(0, 40, G6);
  g.set(3, 11, 'P');
  g.text(6, 11, 'o o o');
  g.set(8, 11, '@');
  g.text(11, 8, 'B?B');
  house(g, 17, 4, 2);
  g.text(17, 9, 'oooo');
  g.set(26, 11, '5');
  house(g, 30, 5, 3);
  g.set(32, 8, '7');
  g.run(36, 39, 7, '=');
  g.text(36, 6, 'oooo');
  // A garden pool by the river: a crocodile basks on the far bank.
  g.sea(41, 46, G6);
  g.text(41, 9, 'o o o');
  g.ground(47, 83, G6);
  g.set(50, 11, 'ت');
  g.text(55, 8, 'BFB');
  house(g, 60, 4, 2);
  house(g, 64, 4, 4);
  g.text(64, 7, 'oooo');
  g.set(70, 11, '5');
  g.run(73, 76, 9, '=');
  g.set(80, 11, '7');
  // Cracked mud-brick over a ditch: keep running.
  g.run(84, 88, G6, 'X');
  g.text(84, 10, 'o o o');
  g.ground(89, 140, G6);
  g.set(93, 11, 'c');
  g.text(96, 8, 'B?B');
  g.set(99, 8, 'i');
  house(g, 104, 5, 2);
  house(g, 109, 4, 4);
  // Secret: up the stair of roofs to the dovecote's golden fanoos.
  g.run(113, 115, 6, '=');
  g.run(117, 118, 3, '=');
  g.text(117, 2, 'oo');
  g.set(118, 1, 'G');
  g.set(116, 11, 'ت');
  g.set(124, 11, '8');
  g.set(132, 11, '5');
  g.sea(141, 147, G6);
  g.text(141, 9, 'o o o o');
  g.ground(148, 200, G6);
  g.set(152, 11, 'ت');
  g.text(156, 8, 'BCB');
  house(g, 161, 4, 2);
  house(g, 165, 4, 3);
  house(g, 169, 4, 2);
  g.set(167, 8, '7');
  g.set(176, 11, '5');
  g.run(180, 183, 9, '=');
  g.text(180, 8, 'oooo');
  g.set(188, 11, 'ت');
  g.set(195, 11, '8');
  g.run(201, 205, G6, 'X');
  g.text(201, 10, 'o o o');
  g.ground(206, 239, G6);
  g.text(210, 8, 'B?B');
  house(g, 216, 4, 2);
  g.set(223, 11, '5');
  g.set(234, 11, 'E');
  return g.rows();
}

/* 22 ─ فلايك أسوان: feluccas between the granite islands, crocodiles on
 * the sandbars. */
function feluccas() {
  const g = new Grid(250, 15);
  g.ground(0, 22, G6);
  g.set(3, 11, 'P');
  g.text(6, 11, 'o o o');
  g.set(8, 11, '@');
  g.text(10, 8, 'B?B');
  g.set(19, 11, '7');
  g.sea(23, 50, G6);
  g.set(24, G6, 'U');
  g.set(43, G6, 'I');
  g.text(26, 9, 'o o o o o o');
  g.ground(51, 76, G6);
  g.set(54, 11, 'ت');
  g.rect(60, 9, 63, 11);
  g.text(60, 8, 'oooo');
  g.set(68, 11, '7');
  g.sea(77, 104, G6);
  g.set(78, G6, 'U');
  g.set(96, G6, 'I');
  // A granite boulder midstream with a crocodile on it.
  g.rect(88, 10, 91, 13);
  g.set(90, 9, 'ت');
  g.text(82, 9, 'o o o');
  g.ground(105, 134, G6);
  g.set(107, 11, 'c');
  g.text(110, 8, 'BFB');
  g.set(118, 11, '5');
  // Secret: up the granite rocks of the island to the fanoos.
  g.rect(124, 10, 126, 11);
  g.rect(127, 7, 129, 11);
  g.rect(130, 4, 132, 11);
  g.text(130, 3, 'ooo');
  g.set(131, 2, 'G');
  g.sea(135, 170, G6);
  g.set(136, G6, 'U');
  g.set(148, G6, 'I');
  g.rect(151, 10, 153, 13);
  g.set(152, 9, 'ت');
  g.set(155, G6, 'U');
  g.set(166, G6, 'I');
  g.text(156, 9, 'o o o o');
  g.ground(171, 190, G6);
  g.text(174, 8, 'B?B');
  g.set(180, 11, 'ت');
  g.run(191, 194, G6, 'X');
  g.text(191, 10, 'oooo');
  g.ground(195, 214, G6);
  g.set(199, 11, '5');
  g.text(204, 8, 'BCB');
  g.set(210, 11, '7');
  g.sea(215, 236, G6);
  g.set(216, G6, 'U');
  g.set(229, G6, 'I');
  g.ground(237, 249, G6);
  g.set(240, 11, 'ت');
  g.set(245, 11, 'E');
  return g.rows();
}

/* 23 ─ بوابات السد: on the old dam — pull a lever to lift a sluice gate,
 * and time your run past the gates spilling water. */
function damGates() {
  const g = new Grid(240, 15);
  g.ground(0, 239, G6);
  g.set(3, 11, 'P');
  g.text(6, 11, 'o o o');
  g.set(8, 11, '@');
  g.text(10, 8, 'B?B');
  g.set(20, 11, '5');
  // Lesson: a spillway bursts on a beat; the foam warns first.
  g.set(28, 11, '*');
  g.text(26, 9, 'o o o');
  g.set(36, 11, 'ت');
  gateway(g, 48, 6);
  g.text(50, 11, 'o o');
  g.set(56, 11, '*');
  g.set(62, 11, '*');
  g.run(58, 61, 8, '=');
  g.text(58, 7, 'oooo');
  g.text(68, 8, 'BFB');
  g.set(74, 11, '7');
  g.set(80, 11, 'ت');
  g.set(86, 11, 'c');
  gateway(g, 98, 6);
  g.set(94, 11, '5');
  g.set(104, 11, '*');
  g.set(110, 11, '*');
  g.set(116, 11, '*');
  g.run(106, 108, 8, '=');
  g.run(112, 114, 8, '=');
  g.text(106, 7, 'ooo ooo');
  g.set(122, 11, 'ت');
  // Secret: a maintenance stair up the gate tower.
  g.rect(128, 10, 129, 11);
  g.rect(130, 7, 131, 11);
  g.rect(132, 4, 135, 11);
  g.text(132, 3, 'ooo');
  g.set(134, 2, 'G');
  g.text(140, 8, 'B?B');
  g.set(146, 11, '5');
  gateway(g, 158, 6);
  g.set(154, 11, '7');
  g.set(164, 11, '*');
  g.set(172, 11, '*');
  g.set(168, 11, 'ت');
  g.text(176, 8, 'BCB');
  g.set(184, 11, '5');
  gateway(g, 196, 6);
  g.set(202, 11, '*');
  g.set(208, 11, 'ت');
  g.set(214, 11, '7');
  g.text(220, 8, 'B?B');
  g.set(226, 11, '5');
  g.set(235, 11, 'E');
  return g.rows();
}

/* 24 ─ جزيرة التمساح: a sandbank island at sunset, and the great Nile
 * crocodile. Only he and his tail-splash wave are ever in play. */
function crocIsland() {
  const g = new Grid(200, 15);
  g.ground(0, 26, G6);
  g.set(3, 11, 'P');
  g.text(6, 11, 'o o o');
  g.text(9, 8, 'B?B');
  g.set(20, 11, '5');
  g.sea(27, 46, G6);
  g.set(28, G6, 'U');
  g.set(40, G6, 'I');
  g.text(30, 9, 'o o o o');
  g.ground(47, 90, G6);
  g.set(50, 11, 'ت');
  g.text(55, 8, 'BFB');
  g.rect(62, 9, 65, 11);
  // Secret: palm stumps up to the fanoos.
  g.rect(67, 7, 68, 11);
  g.rect(70, 4, 71, 11);
  g.text(70, 3, 'oo');
  g.set(71, 2, 'G');
  g.set(78, 11, '7');
  g.set(85, 11, 'ت');
  g.run(91, 94, G6, 'X');
  g.text(91, 10, 'oooo');
  g.ground(95, 199, G6);
  g.set(98, 11, 'c');
  g.text(102, 8, 'B?B');
  g.set(110, 11, '5');
  g.set(118, 11, 'ت');
  // The arena: open sand with a reed ledge each side to hop clear of
  // the splash wave.
  g.set(126, 8, '!');
  g.run(146, 149, 8, '-');
  g.run(186, 189, 8, '-');
  g.rect(199, 0, 199, 11);
  g.set(168, 11, 'Z');
  g.set(195, 11, 'E');
  g.set(100, 11, '@');
  g.set(7, 11, '@');
  return g.rows();
}

/* Aswan: up the first cataract by felucca — the river is the level. */
function cataract() {
  const g = new Grid(240, 15);
  g.ground(0, 11, G6);
  g.set(3, 11, 'P');
  g.text(5, 11, 'o o');
  g.text(4, 8, 'BFB');
  g.set(8, 11, '@');
  g.sea(12, 225, G6);
  g.ground(226, 239, G6);
  g.text(228, 11, 'o o o');
  g.run(229, 231, 9, '-');
  g.set(230, 8, 'G');
  g.set(236, 11, 'E');
  return g.rows();
}
export const CATARACT: NonNullable<LevelMeta['sail']> = {
  row: G6,
  fromCol: 12,
  toCol: 226,
  gusts: [
    [8, 0.9, 55],
    [22, 0.9, 55],
    [38, 1.0, 55],
    [52, 0.9, 55],
  ],
  rocks: [
    [30, 0],
    [42, 1],
    [60, 0],
    [72, 0],
    [86, 1],
    [102, 1],
    [114, 0],
    [130, 1],
    [146, 0],
    [160, 1],
    [178, 0],
    [192, 1],
    [208, 0],
  ],
  crocs: [
    [51, 1],
    [94, 0],
    [122, 0],
    [153, 1],
    [169, 0],
    [200, 0],
    [216, 1],
  ],
  coins: [
    [22, 1, 3],
    [64, 1, 3],
    [96, 1, 3],
    [136, 0, 4],
    [184, 0, 3],
    [218, 0, 3],
  ],
};
/* ─────────────── World 7: بورسعيد ─────────────── */
const G7 = 12;
/** A Port Said house front: a block `h` rows tall (wooden balconies on top). */
function balconyHouse(g: Grid, x: number, w: number, h: number) {
  g.rect(x, G7 - h, x + w - 1, G7 - 1);
}

/* 26 ─ مطاردة السوق الحرة: the runaway crane magnet sweeps through the
 * free-market behind you — keep moving, swing across the gaps on crane
 * hooks, ride a slung container, climb a hoist over the container wall. */
function freeZone() {
  const g = new Grid(260, 15);
  g.ground(0, 59, G7);
  g.set(3, 11, 'P');
  g.text(6, 11, 'o o o');
  g.text(7, 8, 'BFB');
  balconyHouse(g, 24, 3, 2);
  g.text(24, 9, 'ooo');
  g.set(34, 11, 'ر');
  balconyHouse(g, 40, 4, 3);
  g.set(52, 11, 'ر');
  // Gap 1: one hook across.
  g.set(58, 7, 'ه');
  g.set(70, 7, 'ة');
  g.text(62, 4, 'ooo');
  g.ground(72, 108, G7);
  g.set(80, 11, 'ب');
  balconyHouse(g, 88, 4, 2);
  g.text(96, 8, 'B?B');
  g.set(102, 11, 'ر');
  // Gap 2: a slung container carries you over.
  g.set(108, 9, 'ح');
  g.set(122, 9, 'خ');
  g.text(112, 6, 'oooo');
  g.ground(126, 168, G7);
  g.set(128, 11, 'c');
  g.set(140, 11, 'ب');
  // Secret: bounce off the awning onto the shop roof for the fanoos.
  balconyHouse(g, 146, 4, 4);
  g.set(144, 11, 'A');
  g.text(146, 7, 'ooo');
  g.set(149, 7, 'G');
  g.set(158, 11, 'ر');
  // Gap 3: hook, a container pillar, hook.
  g.set(167, 7, 'ه');
  g.set(176, 7, 'ة');
  g.rect(178, 9, 179, 14);
  g.set(180, 7, 'ه');
  g.set(190, 7, 'ة');
  g.ground(192, 259, G7);
  g.text(196, 8, 'BFB');
  g.set(204, 11, 'ر');
  // The container wall: ride the hoist up and over.
  g.set(209, 11, 'ص');
  g.set(209, 4, 'ض');
  g.rect(212, 4, 217, 11);
  g.text(212, 3, 'oooooo');
  g.set(230, 11, 'ب');
  g.set(252, 11, 'E');
  return g.rows();
}

/* 27 ─ ساحة الحاويات: container stacks over a sheer drop — slung
 * containers, hooks and hoists are the only way across. */
function containerYard() {
  const g = new Grid(220, 15);
  g.ground(0, 14, G7);
  g.set(3, 11, 'P');
  g.text(6, 11, 'o o o');
  g.text(8, 8, 'BFB');
  g.rect(15, 9, 24, 14);
  g.text(17, 8, 'ooo');
  g.set(25, 8, 'ح');
  g.set(33, 8, 'خ');
  g.rect(37, 8, 46, 14);
  g.set(44, 7, 'ر');
  g.set(46, 5, 'ه');
  g.set(58, 5, 'ة');
  g.text(50, 2, 'ooo');
  g.rect(61, 9, 70, 14);
  g.set(66, 8, 'ب');
  // The hoist up the tall stack (the fanoos waits on its far end).
  g.set(71, 11, 'ص');
  g.set(71, 4, 'ض');
  g.rect(74, 4, 84, 14);
  g.text(76, 3, 'ooooo');
  g.set(83, 3, 'G');
  g.rect(85, 9, 100, 14);
  g.text(88, 5, 'B?B');
  g.set(96, 8, 'ر');
  g.set(101, 8, 'ح');
  g.set(113, 8, 'خ');
  g.set(117, 6, 'ح');
  g.set(127, 6, 'خ');
  g.text(119, 3, 'oooo');
  g.rect(131, 9, 150, 14);
  g.set(133, 8, 'c');
  g.text(138, 5, 'BFB');
  g.set(146, 8, 'ب');
  g.set(150, 6, 'ه');
  g.set(160, 6, 'ة');
  g.rect(162, 9, 163, 14);
  g.set(163, 6, 'ه');
  g.set(174, 6, 'ة');
  g.rect(177, 10, 195, 14);
  g.set(186, 9, 'ر');
  g.ground(196, 219, G7);
  g.text(200, 11, 'o o o');
  g.set(214, 11, 'E');
  return g.rows();
}

/* 28 ─ رصيف الميناء: the captain's crane on the quay. Overhead, the port's
 * gantry hook carries a container back and forth: hang from it and drop
 * the container on his cab. */
function harbourQuay() {
  const g = new Grid(200, 15);
  g.ground(0, 26, G7);
  g.set(3, 11, 'P');
  g.text(6, 11, 'o o o');
  g.text(9, 8, 'BFB');
  g.set(20, 11, 'ر');
  g.set(27, 9, 'ح');
  g.set(37, 9, 'خ');
  g.text(30, 6, 'oooo');
  g.ground(41, 199, G7);
  g.set(50, 11, 'ب');
  g.text(55, 8, 'B?B');
  // Containers stacked on the quay; the fanoos on top of the stack.
  g.rect(62, 10, 66, 11);
  g.rect(67, 8, 71, 11);
  g.rect(72, 6, 74, 11);
  g.text(72, 5, 'ooo');
  g.set(73, 4, 'G');
  g.set(80, 11, 'ر');
  g.set(98, 11, 'c');
  g.text(102, 8, 'BFB');
  g.set(118, 11, 'ب');
  // The arena: ledges up to the gantry hook's height.
  // Boarding stays inside the boss camera. Keep the firing lane clear.
  g.run(163, 166, 9, '-');
  g.set(164, 4, 'ه');
  g.set(194, 4, 'ة');
  g.rect(199, 0, 199, 11);
  g.set(176, 11, 'Z');
  g.set(196, 11, 'E');
  return g.rows();
}

/* ─────────────── World 8: سيوة ─────────────── */
/* بستان سيوة: thirst tutorial, palm shade, springs, a camel ride,
 * dates that open a palm-log shortcut over the sun, sink-sand between groves. */
function siwaGrove() {
  const g = new Grid(200, 15);
  g.ground(0, 32);
  g.set(3, 12, 'P');
  g.set(7, 12, '@');
  g.set(12, 12, 'ع');
  g.set(12, 10, 'ش');
  g.text(16, 9, 'BFB');
  g.text(18, 12, 'o o');
  g.set(22, 10, 'ش');
  g.set(26, 12, 'ق');
  // First sink stretch: keep moving, a spring waits in the shade beyond.
  g.rect(33, 13, 52, 14, 'س');
  g.set(42, 12, 'ق');
  g.text(36, 12, 'o o o');
  g.ground(53, 88);
  g.set(55, 12, 'ع');
  g.set(55, 10, 'ش');
  g.set(60, 10, 'ش');
  g.set(66, 10, 'ش');
  g.set(72, 10, 'ش');
  // Dates hang off a terrace — a short stair from the ground, then the ledge.
  g.run(58, 63, 11, '-');
  g.run(62, 76, 8, '-');
  g.set(64, 7, 'ن');
  g.set(69, 7, 'ن');
  g.set(74, 7, 'ن');
  g.text(64, 6, 'o o o o');
  // A scorpion patrols under the dates terrace — the shortcut is guarded.
  g.set(66, 12, 'ق');
  g.set(80, 12, 'ق');
  g.text(83, 9, 'B?B');
  // Camel ride over a sink pit.
  g.set(86, 12, 'Y');
  g.rect(90, 13, 112, 14, 'س');
  g.ground(113, 132);
  g.set(114, 12, 'y');
  g.set(116, 12, 'c');
  g.set(120, 12, 'ع');
  g.set(120, 10, 'ش');
  // Long sun pit: the camel is the main path; dates open a high palm-log.
  g.set(128, 12, 'Y');
  g.ground(154, 199);
  g.set(155, 12, 'y');
  g.run(134, 150, 8, 'ف');
  g.text(136, 7, 'o o o o o');
  g.set(160, 12, 'ع');
  g.set(160, 10, 'ش');
  g.set(168, 12, 'ق');
  g.text(172, 9, 'B?B');
  // Secret up a short stair of ledges, in the last grove.
  g.run(176, 179, 10, '-');
  g.run(180, 184, 7, '-');
  g.run(185, 190, 5, '-');
  g.set(188, 4, 'G');
  g.text(185, 4, 'ooo');
  // …and the secret stair has its own guard.
  g.set(186, 12, 'ق');
  g.set(194, 12, 'E');
  return g.rows();
}

/* سراب الملح: slippery salt crust, glare, and mirages (fakes vanish
 * underfoot; salt reveals the real ones). Three deliberate crossings —
 * floating pans ferry you over open brine — no hopscotch patching. */
function siwaSalt() {
  const g = new Grid(210, 15);
  // Shore one: crust underfoot, the salt crystal, a spring, a first scorpion.
  g.rect(0, 13, 30, 14, 'ل');
  g.set(3, 12, 'P');
  g.set(7, 12, '@');
  g.set(12, 12, 'ع');
  g.text(16, 9, 'BFB');
  g.set(18, 12, 'ق');
  // Crossing one — the ferry pan: open brine, one pan carries you over,
  // sliding home onto both banks so you walk on and off. An optional
  // mirage balcony rides above it; salt shows the real pans.
  g.set(30, 13, 'M');
  g.set(30, 14, '.'); // no stray tile under the pan's home cell
  g.run(31, 37, 9, 'غ');
  g.text(31, 8, 'oooo');
  // Shore two: the long glare walk. Springs, guards, one rare shade palm.
  g.rect(35, 13, 120, 14, 'ل');
  g.set(45, 12, 'ق');
  g.set(48, 12, 'ع');
  g.text(60, 9, 'B?B');
  g.set(64, 12, 'ق');
  g.run(80, 86, 9, 'غ'); // optional high mirage walk over the glare
  g.text(80, 8, 'oooo');
  g.set(88, 12, 'ع');
  g.set(96, 12, 'ق');
  g.set(100, 12, 'c');
  g.set(108, 12, 'ع');
  g.set(114, 10, 'ش'); // rare shade
  g.set(114, 12, 'ع');
  // Crossings two and three — two ferry pans with a guarded shelf between.
  g.set(120, 13, 'M');
  g.set(120, 14, '.');
  g.rect(125, 13, 140, 14, 'ل');
  g.set(132, 12, 'ق');
  g.text(136, 9, 'B?B');
  g.set(140, 13, 'M');
  g.set(140, 14, '.');
  // Final shore: a step-pan up to the high mirage route and the secret.
  g.rect(145, 13, 209, 14, 'ل');
  g.set(152, 12, 'ع');
  g.set(152, 10, 'M');
  g.run(154, 166, 7, 'غ');
  g.run(162, 168, 5, '-');
  g.set(165, 4, 'G');
  g.text(162, 4, 'ooo');
  g.set(168, 12, 'ق');
  g.set(176, 12, 'ع');
  g.set(184, 12, 'ق');
  g.set(200, 12, 'E');
  return g.rows();
}

/* قلعة شالي: crumbling salt-mud, a vertical climb through the ruins,
 * shade under the walls, sand in the courtyards. */
function siwaShali() {
  const g = new Grid(190, 15);
  g.ground(0, 24);
  g.set(3, 12, 'P');
  g.set(7, 12, '@');
  g.set(12, 12, 'ع');
  g.text(16, 9, 'BFB');
  g.set(20, 12, 'ق');
  // Courtyard of sink-sand, then the fortress rise.
  g.rect(25, 13, 36, 14, 'س');
  g.ground(37, 60);
  g.set(40, 12, 'ع');
  // The fortress is guarded: a scorpion holds the courtyard before the climb.
  g.set(44, 12, 'ق');
  // Climb: crumbling floors and solid ledges, shade under roofs.
  g.run(46, 58, 10, 'X');
  g.rect(59, 5, 64, 8, '#');
  g.run(50, 56, 7, '-');
  g.run(50, 54, 4, '-');
  g.text(50, 3, 'ooo');
  g.set(56, 12, 'ق');
  g.run(62, 70, 10, '-');
  // …and another paces the mid ledge.
  g.set(66, 9, 'ق');
  g.run(72, 82, 8, 'X');
  g.run(74, 82, 5, '-');
  g.rect(84, 3, 88, 6, '#');
  g.run(76, 82, 2, '-');
  g.text(76, 1, 'oooo');
  g.set(88, 12, 'c');
  g.set(92, 12, 'ع');
  g.ground(61, 100);
  g.set(96, 10, 'V');
  g.run(100, 108, 7, '-');
  g.run(110, 120, 5, 'X');
  g.rect(112, 1, 124, 3, '#');
  g.set(114, 8, 'ع');
  g.set(118, 12, 'ق');
  g.set(124, 12, 'ق');
  g.ground(101, 128);
  // Crumbling bridge over a sink courtyard; a spring waits in the shade.
  g.run(129, 148, 9, 'X');
  g.rect(130, 13, 150, 14, 'س');
  g.set(140, 11, 'ع');
  g.rect(142, 5, 150, 7, '#');
  g.ground(151, 189);
  g.set(154, 12, 'ع');
  // A guard waits past the crumbling bridge, before the blocks.
  g.set(160, 12, 'ق');
  g.text(158, 9, 'B?B');
  g.set(166, 12, 'ق');
  // Secret in a high attic of the last tower.
  g.rect(170, 5, 182, 8, '#');
  g.run(166, 170, 10, '-');
  g.run(168, 174, 7, '-');
  g.run(172, 180, 4, '-');
  g.set(178, 3, 'G');
  g.text(172, 3, 'ooo');
  g.set(184, 12, 'E');
  return g.rows();
}

/* كثبان القِبْلي: a brisk sandboard down the dune, then a sandstorm you
 * navigate by a sound/light pulse, then the boss «القِبْلي». */
function siwaQibli() {
  const g = new Grid(220, 15);
  g.ground(0, 219);
  g.set(3, 12, 'P');
  g.set(6, 12, '@');
  g.text(10, 9, 'BFB');
  g.text(16, 9, 'ooo o oo');
  // Sandboard run: rocks to hop and dune mouths to clear at speed —
  // the coins draw the safe line through every obstacle.
  g.rect(8, 13, 110, 14, 'س');
  for (const x of [18, 28, 40, 52, 64, 76, 88, 100]) {
    g.text(x, 9, 'ooo');
    if (x % 40 === 18) g.set(x + 8, 8, 'o');
  }
  // Sandstone teeth: two-high rocks you hop on the board.
  for (const x of [34, 60, 86]) {
    g.set(x, 12, '#');
    g.set(x, 11, '#');
    g.set(x - 1, 10, 'o');
    g.set(x, 9, 'o');
    g.set(x + 1, 10, 'o');
  }
  // Dune mouths: two-wide open pits, coins arcing over the lip.
  for (const x of [46, 47, 96, 97]) {
    g.set(x, 13, '.');
    g.set(x, 14, '.');
  }
  g.text(44, 9, 'oooo');
  g.text(94, 9, 'oooo');
  g.set(48, 10, 'ش');
  g.set(80, 12, 'ع');
  // Storm approach: lanterns punch holes in the veil, scorpions in the dust.
  g.set(112, 12, 'L');
  g.set(118, 12, 'ق');
  g.set(120, 12, 'c');
  g.set(124, 12, 'ع');
  g.set(128, 9, '!');
  g.set(130, 12, 'ق');
  g.set(132, 12, 'L');
  // A salt crystal waits by the arena gate, so you never fight barehanded.
  g.set(134, 12, '@');
  // Arena lock wall, two springs the boss buries, sink patches, the Qibli.
  g.rect(136, 0, 136, 8, '#');
  g.rect(148, 13, 158, 14, 'س');
  g.set(152, 12, 'ع');
  g.set(166, 12, 'ع');
  g.set(158, 12, 'L');
  g.set(180, 12, 'Z');
  g.rect(200, 0, 200, 8, '#');
  g.set(208, 12, 'E');
  // Secret off a high ledge early in the board run.
  g.run(22, 26, 10, '-');
  g.run(26, 30, 8, '-');
  g.run(30, 38, 6, '-');
  g.set(36, 5, 'G');
  g.text(30, 5, 'ooo');
  return g.rows();
}

export const LEVELS: LevelMeta[] = [
  {
    world: 0,
    id: 'lanterns',
    track: 0,
    name: 'حارة الفوانيس',
    subtitle: 'الليل طويل… نوّر الفوانيس تبان السكة',
    theme: 'night',
    time: 300,
    dark: 0.8,
    lanternRadius: 9,
    mechanic: 'فوانيس بتنوّر سلالم مخفية',
    enemy: 'الوطواط',
    rows: lanternPilot(),
  },
  {
    world: 0,
    id: 'market',
    track: 1,
    name: 'سوق تحت البلد',
    subtitle: 'تندات بتنطّط، عربيات ماشية، وصناديق مش مضمونة',
    theme: 'market',
    time: 300,
    dark: 0,
    mechanic: 'تندات نطّاطة وعربيات ماشية',
    enemy: 'الديك الهايج',
    rows: market(),
  },
  {
    world: 0,
    id: 'roofs',
    track: 2,
    name: 'فوق الأسطح',
    subtitle: 'اطلع لبرج الحمام… والهوا مش في صفّك',
    theme: 'roof',
    time: 300,
    dark: 0,
    mechanic: 'حبال غسيل وأطباق دش وريح',
    enemy: 'الحمام الغطّاس',
    rows: rooftops(),
  },
  {
    world: 0,
    id: 'metro',
    track: 3,
    bossTrack: 4,
    bossKind: 'fatwa',
    name: 'تحت المترو',
    subtitle: 'المية طالعة… والفتوة برعي مستنيك',
    theme: 'sewer',
    time: 360,
    dark: 0.8,
    water: {
      triggerCol: 92,
      col0: 91,
      col1: 110,
      fromRow: 23,
      toRow: 8,
      speed: 21,
    },
    boss: true,
    mechanic: 'مية طالعة ومنصّات ماشية',
    enemy: 'فار المجاري + الفتوة برعي',
    rows: underground(),
  },
  {
    world: 1,
    id: 'fields',
    track: 5,
    name: 'غيطان الفجر',
    subtitle: 'الطين بيمسك في رجلك… والوز مش بيهزّر',
    theme: 'farm',
    timeOfDay: 'dawn',
    time: 280,
    dark: 0,
    mechanic: 'طين بيبطّأ وتبن بيتطلع عليه',
    enemy: 'الجاموسة الهايجة + الوز',
    rows: fields(),
  },
  {
    world: 1,
    id: 'canals',
    track: 6,
    name: 'الترعة',
    subtitle: 'التيار شادد… اركب جذع النخل وخلي بالك من الغربان',
    theme: 'farm',
    timeOfDay: 'noon',
    time: 280,
    dark: 0,
    mechanic: 'ترع بتيار وجذوع نخل عايمة',
    enemy: 'الغراب الغطّاس',
    rows: canals(),
  },
  {
    world: 1,
    id: 'saqia',
    track: 7,
    name: 'الساقية',
    subtitle: 'اركب قواديس الساقية… وعربية الحمار مستنياك',
    theme: 'farm',
    timeOfDay: 'dusk',
    time: 300,
    dark: 0,
    mechanic: 'سواقي بتلف وعربية كارو',
    enemy: 'الغربان + الجاموس',
    rows: waterwheels(),
  },
  {
    world: 1,
    id: 'jurn',
    track: 8,
    bossTrack: 9,
    bossKind: 'buffalo',
    name: 'جرن القمح',
    subtitle: 'بالليل في الجرن… وأبو قرون صاحي',
    theme: 'farm',
    timeOfDay: 'night',
    time: 330,
    dark: 0.3,
    boss: true,
    mechanic: 'كل حاجة مع بعض + الزعيم',
    enemy: 'أبو قرون',
    rows: threshingFloor(),
  },
  {
    world: 2,
    id: 'furniture',
    track: 10,
    name: 'شارع الموبيليا',
    subtitle: 'السيور شغالة والعفش متكوّم… والمناشير هربانة',
    theme: 'workshop',
    timeOfDay: 'morning',
    time: 285,
    dark: 0,
    mechanic: 'سيور خشب وعفش بيقع يعمل كوبري',
    enemy: 'منشار وفارة هربانين + قطط حرامية',
    rows: workshopStreet(),
  },
  {
    world: 2,
    id: 'workshop',
    track: 11,
    name: 'جوه الورشة',
    subtitle: 'النجف بيتمرجح فوق حفر النشارة',
    theme: 'workshop',
    timeOfDay: 'lamplight',
    time: 290,
    dark: 0.45,
    mechanic: 'نجف بيتمرجح وسيور عكسك',
    enemy: 'العِدّة الهربانة',
    rows: insideWorkshop(),
  },
  {
    world: 2,
    id: 'harbor',
    track: 12,
    name: 'ميناء الصيد',
    subtitle: 'المد والجزر شغالين… اركب المراكب واطلع على الشباك',
    theme: 'harbor',
    timeOfDay: 'dusk',
    time: 285,
    dark: 0,
    tide: { amp: 2, period: 10 },
    mechanic: 'مد وجزر ومراكب بتتهز وشباك تتسلّق',
    enemy: 'الكابوريا + النوارس',
    rows: harbor(),
  },
  {
    world: 2,
    id: 'rasbar',
    track: 13,
    bossTrack: 14,
    bossKind: 'crab',
    name: 'رأس البر',
    subtitle: 'مطرح ما النيل بيبوس البحر… وأبو مقص مستني',
    theme: 'harbor',
    timeOfDay: 'bluehour',
    time: 300,
    dark: 0.2,
    tide: { amp: 2, period: 8 },
    boss: true,
    mechanic: 'البحر والسيور والنجف مع بعض + الزعيم',
    enemy: 'أبو مقص',
    rows: rasElBar(),
  },
  {
    world: 3,
    id: 'corniche',
    track: 15,
    name: 'الكورنيش',
    subtitle: 'الموج بيضرب السور على إيقاع… والبلاط مبلول',
    theme: 'corniche',
    timeOfDay: 'morning',
    time: 270,
    dark: 0,
    waves: { period: 3.4, warn: 1.0, crash: 0.8 },
    mechanic: 'موج بيضرب السور بتوقيت وبلاط بيزحلق',
    enemy: 'كورة البحر + الشماسي الطايرة',
    rows: corniche(),
  },
  {
    world: 3,
    id: 'tram',
    track: 16,
    name: 'الترام',
    subtitle: 'اركب على سطح الترام… وطّي من السلك والكباري',
    theme: 'corniche',
    timeOfDay: 'noon',
    time: 200,
    dark: 0,
    mechanic: 'فوق سطح الترام: الشاشة ماشية ووطّي من السلك',
    enemy: 'نوارس النوة + الشماسي',
    rows: tramRide(),
  },
  {
    world: 3,
    id: 'stanley',
    track: 17,
    name: 'كوبري ستانلي',
    subtitle: 'الهوا ضدّك فوق الكوبري… افتح الشمسية وطير',
    theme: 'corniche',
    timeOfDay: 'sunset',
    time: 255,
    dark: 0,
    gust: { push: 185, on: 2400, off: 1700 },
    mechanic: 'هوا قوي وشمسية بتطيّرك وقناديل في البحر',
    enemy: 'قناديل البحر + نوارس النوة',
    rows: stanley(),
  },
  {
    world: 3,
    id: 'qaitbay',
    track: 18,
    bossTrack: 19,
    bossKind: 'gull',
    name: 'قلعة قايتباي',
    subtitle: 'النوة قايمة… وريّس النوة فوق القلعة',
    theme: 'fort',
    timeOfDay: 'storm',
    time: 250,
    dark: 0.15,
    storm: true,
    // The waves on the keep break together, with a long calm between:
    // foam for a second, the crash, then two seconds to run through.
    waves: { period: 4.6, warn: 1.1, crash: 0.8, roll: 0 },
    gust: { push: 200, on: 2200, off: 1500 },
    boss: true,
    mechanic: 'النوة: مطر وريح متقلّبة وموج + الزعيم',
    enemy: 'ريّس النوة',
    rows: qaitbay(),
  },
  {
    world: 4,
    id: 'kabbash',
    track: 20,
    name: 'طريق الكباش',
    subtitle: 'الكباش الحجر صاحية… والرمل بيزحلق وزوابع التراب جاية',
    theme: 'temple',
    timeOfDay: 'afternoon',
    time: 240,
    dark: 0,
    mechanic: 'رمل بيزحلق وبلاط بيقع وسفنكسات تطلع على ضهرها',
    enemy: 'الجعران + الكوبرا + زوابع التراب',
    rows: ramAvenue(),
  },
  {
    world: 4,
    id: 'nile',
    track: 21,
    name: 'النيل',
    subtitle: 'الفجر على النيل… اركب الفلوكة والبالونة قبل ما التيار يشدّك',
    theme: 'nile',
    timeOfDay: 'nile-dawn',
    time: 270,
    dark: 0,
    current: -80,
    mechanic: 'فلايك على النيل وبالونات بتطلع وتنزل وتيار شادد',
    enemy: 'زوابع التراب فوق المية + الجعران',
    rows: nileDawn(),
  },
  {
    world: 4,
    id: 'valley',
    track: 22,
    name: 'وادي الملوك',
    subtitle: 'جوه المقبرة… المشاعل بتطفي والأرض بتقع والمومياوات بتقوم تاني',
    theme: 'tomb',
    timeOfDay: 'tomb',
    time: 225,
    dark: 0.93,
    lanternRadius: 5,
    torchBurn: 12,
    mechanic: 'مشاعل بتطفي وأرض بتقع وأعمدة بتهرس وأبواب بروافع',
    enemy: 'المومياوات اللي بتتلم تاني + الرمل النازل',
    rows: kingsValley(),
  },
  {
    world: 4,
    id: 'karnak',
    track: 23,
    bossTrack: 24,
    bossKind: 'ram',
    name: 'معبد الكرنك',
    subtitle: 'تحت القمر في الكرنك… والكبش الحارس صحي',
    theme: 'temple',
    timeOfDay: 'moon',
    time: 230,
    dark: 0.3,
    lanternRadius: 5,
    torchBurn: 16,
    boss: true,
    mechanic:
      'أعمدة اللوتس والأبواب الدوّارة والأعمدة اللي بتهرس + الزعيم الأخير',
    enemy: 'الكبش الحارس',
    rows: karnak(),
  },
  {
    world: 5,
    id: 'nubia',
    track: 25,
    name: 'نجع النوبة',
    subtitle: 'بيوت ملونة على النيل… والتمساح نايم على الشط',
    theme: 'nubia',
    timeOfDay: 'nubia-day',
    time: 240,
    dark: 0,
    mechanic: 'أسطح بيوت نوبية ملونة وبرك فيها تماسيح',
    enemy: 'التمساح + الكوبرا + الجعران',
    rows: nubianVillage(),
  },
  {
    world: 5,
    id: 'feluccas',
    track: 26,
    name: 'فلايك أسوان',
    subtitle: 'اركب الفلوكة بين الجزر… والتماسيح على الصخر',
    theme: 'nubia',
    timeOfDay: 'nubia-sunset',
    time: 260,
    dark: 0,
    current: -70,
    mechanic: 'فلايك ماشية على التيار بين صخور الجرانيت',
    enemy: 'تماسيح على الجزر والصخر',
    rows: feluccas(),
  },
  {
    world: 5,
    id: 'dam',
    track: 27,
    name: 'بوابات السد',
    subtitle: 'شدّ الرافعة ترفع البوابة… واستنى المية تنزل قبل ما تعدّي',
    theme: 'nubia',
    timeOfDay: 'nubia-noon',
    time: 240,
    dark: 0,
    waves: { period: 4.4, warn: 1.2, crash: 0.8, roll: 0.5 },
    mechanic: 'بوابات السد بروافع ومية بتندفع على ميعاد',
    enemy: 'التمساح + الكوبرا',
    rows: damGates(),
  },
  {
    world: 5,
    id: 'cataract',
    track: 30,
    name: 'شلال أسوان',
    subtitle: 'الفلوكة بتجري لوحدها… نطّ تعدّي الصخر والتماسيح',
    theme: 'nubia',
    timeOfDay: 'nubia-afternoon',
    time: 200,
    dark: 0,
    current: -40,
    sail: CATARACT,
    mechanic: 'الفلوكة بتجري لوحدها: نطّ بين الشطّين، وهبّات ريح بتسرعك',
    enemy: 'تماسيح طالعة من المية + صخور الشلال',
    rows: cataract(),
  },
  {
    world: 5,
    id: 'crocisland',
    track: 28,
    bossTrack: 29,
    bossKind: 'croc',
    name: 'جزيرة التمساح',
    subtitle: 'الغروب على الجزيرة… وتمساح النيل الكبير صاحي',
    theme: 'nubia',
    timeOfDay: 'nubia-dusk',
    time: 230,
    dark: 0,
    boss: true,
    mechanic: 'جزيرة رملية وتمساح بيهجم بفكّه وديله + الزعيم',
    enemy: 'تمساح النيل الكبير',
    rows: crocIsland(),
  },
  {
    world: 6,
    id: 'freezone',
    track: 32,
    name: 'مطاردة السوق الحرة',
    subtitle: 'مغناطيس الونش فلت وجاي وراك… اجري واتشعبط في الخطاطيف',
    theme: 'portsaid',
    timeOfDay: 'ps-noon',
    time: 200,
    dark: 0,
    chase: { fromCol: 12, toCol: 238, speed: 92 },
    mechanic: 'مطاردة: مغناطيس ونش وراك وخطاطيف ماشية فوق الفجوات',
    enemy: 'المغناطيس + البراميل + البجعة',
    rows: freeZone(),
  },
  {
    world: 6,
    id: 'yard',
    track: 31,
    name: 'ساحة الحاويات',
    subtitle: 'الحاويات متعلّقة في الأوناش… والأرض بعيدة تحت',
    theme: 'portsaid',
    timeOfDay: 'ps-morning',
    time: 240,
    dark: 0,
    mechanic: 'حاويات طايرة على الأوناش ورافعات بتطلع وتنزل',
    enemy: 'البراميل + البجعة',
    rows: containerYard(),
  },
  {
    world: 6,
    id: 'quay',
    track: 33,
    bossTrack: 34,
    bossKind: 'captain',
    name: 'رصيف الميناء',
    subtitle: 'ريّس الميناء فوق ونشه… والونش الكبير فوقكم الاتنين',
    theme: 'portsaid',
    timeOfDay: 'ps-dusk',
    time: 240,
    dark: 0,
    boss: true,
    mechanic: 'خطاف الونش الكبير شايل حاوية: نزّلها على كابينة الريّس',
    enemy: 'ريّس الميناء',
    rows: harbourQuay(),
  },
  {
    world: 7,
    id: 'grove',
    track: 35,
    name: 'بستان سيوة',
    subtitle: 'العطش بيأكل… امشي في ظل النخل، واشرب من العين، واركب الجمل',
    theme: 'siwa',
    timeOfDay: 'siwa-noon',
    time: 320,
    dark: 0,
    mechanic: 'عطش وظل نخل وعيون، جمل تركبه، وبلح بيفتح اختصار فوق الرمل',
    enemy: 'العقرب',
    rows: grovePilot(siwaGrove()),
  },
  {
    world: 7,
    id: 'saltlake',
    track: 36,
    name: 'سراب الملح',
    subtitle: 'السراب بيبرق… في منصّة بتختفي وفي عين حقيقية، والملح بيبينلك',
    theme: 'siwa',
    timeOfDay: 'siwa-glare',
    time: 210,
    dark: 0,
    mechanic: 'سراب وهمي وحقيقي، قشرة ملح زلقة، وأحواض ملحية طايرة',
    enemy: 'العقرب + السراب',
    rows: siwaSalt(),
  },
  {
    world: 7,
    id: 'shali',
    track: 37,
    name: 'قلعة شالي',
    subtitle: 'حيطان الكارشيف بتوقع من تحتك… والظل جوه الخرابة بيهدّي العطش',
    theme: 'siwa',
    timeOfDay: 'siwa-dusk',
    time: 220,
    dark: 0,
    mechanic: 'قلعة كارشيف: بلاط بيفور، طلوع عمودي، وظل الحيطان ضد العطش',
    enemy: 'العقرب + الأرض اللي بتقع',
    rows: siwaShali(),
  },
  {
    world: 7,
    id: 'qibli',
    track: 38,
    bossTrack: 39,
    bossKind: 'qibli',
    name: 'كثبان القِبْلي',
    subtitle: 'اللوح بيجري على الكثيب… وبعد العاصفة، القِبْلي مستنيك',
    theme: 'siwa',
    timeOfDay: 'siwa-khamsin',
    time: 220,
    dark: 0,
    boss: true,
    board: { fromCol: 8, toCol: 110, row: 12 },
    stormFrom: 100,
    mechanic:
      'لوح رمل بيجري لوحده، عاصفة بتخفي الشاشة ورا النبضة، والقِبْلي على العين',
    enemy: 'القِبْلي',
    rows: siwaQibli(),
  },
];

LEVELS.push(...LANDMARK_LEVELS);
