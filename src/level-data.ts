// Authored level maps for «بلبل في الحواري». Every level is a 24px tile grid
// built with small helpers so routes can be read (and tested) as text.
//
// Legend
//   #  solid wall / ground      =  solid platform       -  one-way ledge
//   B  brick   ?  coin box   F  food box   C  chili box   S  bead box
//   i  hidden coin box (invisible until bumped)          o  coin
//   L  lantern (lights nearby ghost platforms)           ~  ghost ledge
//   A  market awning (bouncy one-way)    K  vendor cart (moves, 3 wide)
//   X  crumbling crate                   D  satellite dish (spring)
//   H/h J/j clothesline start/end (zip)   > <  wind gust cells
//   M  moving plank (2 wide, horizontal) V  service lift (2 wide, vertical)
//   ^  broken glass (hurts)              Q  false wall (secret passage)
//   G  golden fanoos (the level secret)  T  secret water tank (bonus room)
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
  | 'fort';
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
    playable: false,
  },
];
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
   * the Alexandrian storm gull. */
  bossKind?: 'fatwa' | 'buffalo' | 'crab' | 'gull';
  /** Crashing waves: every `period` s, after `warn` s of foam (World 4). */
  waves?: { period: number; warn: number; crash: number };
  /** Gust strength (px/s push) and rhythm (ms on / off). */
  gust?: { push: number; on: number; off: number };
  /** Winter storm (نوة): rain, lightning and wet everything. */
  storm?: boolean;
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
function lanternAlley() {
  const g = new Grid(170, 15);
  g.ground(0, 30);
  g.set(3, 12, 'P');
  g.text(6, 12, 'o o o');
  g.text(10, 9, 'BFB');
  g.set(19, 12, 'g');
  // Lesson: light the lantern, cross the pit on its ghost bridge.
  g.set(27, 12, 'L');
  g.text(25, 10, 'o o');
  g.run(31, 36, 12, '~');
  g.text(31, 11, 'oooooo');
  g.ground(37, 86);
  // Two routes: balconies above (bat), cats below.
  g.run(41, 45, 10, '-');
  g.run(47, 51, 7, '-');
  g.text(47, 6, 'ooooo');
  g.set(49, 8, 't');
  g.set(46, 12, 'g');
  g.set(54, 12, 'g');
  g.text(57, 9, 'BCB');
  g.set(63, 9, '?');
  // A lantern raises a ghost stair to a coin terrace.
  g.set(67, 12, 'L');
  g.run(70, 71, 10, '~');
  g.run(72, 73, 7, '~');
  g.run(76, 81, 5, '-');
  g.text(76, 4, 'oooooo');
  g.set(78, 12, 'b');
  g.set(84, 12, 'c');
  // Set piece: the lantern relay across the dark chasm.
  g.set(86, 12, 'L');
  g.run(89, 91, 11, '~');
  g.run(93, 95, 10, '=');
  g.set(94, 9, 'L');
  g.run(98, 100, 9, '~');
  g.run(103, 105, 8, '=');
  g.set(104, 7, 'L');
  g.run(108, 110, 9, '~');
  g.run(113, 115, 10, '=');
  g.set(114, 9, 'L');
  g.run(118, 120, 11, '~');
  g.text(96, 7, 'o');
  g.text(101, 6, 'o');
  g.text(106, 6, 'o');
  g.text(111, 7, 'o');
  g.text(116, 8, 'o');
  g.set(100, 4, 't');
  g.set(110, 5, 't');
  g.ground(122, 169);
  // Secret: a dark wall top, an unlit lantern high up, a ghost path to the golden fanoos.
  g.rect(130, 10, 132, 12, '#');
  g.run(126, 129, 7, '-');
  g.run(123, 126, 4, '-');
  g.set(125, 3, 'L');
  g.run(128, 129, 4, '~');
  g.run(131, 132, 4, '~');
  g.run(135, 141, 4, '-');
  g.text(135, 3, 'oooo G');
  g.set(140, 12, 'g');
  g.set(147, 12, 'b');
  g.text(150, 9, 'B?B');
  g.set(156, 9, 'i');
  g.set(158, 12, 'g');
  g.text(152, 12, 'o o o');
  g.set(164, 12, 'E');
  return g.rows();
}

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
  // Set piece: the flooding shaft.
  g.rect(90, 4, 90, 19, '#');
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
  g.text(6, 11, 'o o o');
  g.text(10, 8, 'BFB');
  g.set(18, 11, 'n');
  // Lesson: mud slows you and weighs your jump down.
  g.run(21, 29, G2, 'u');
  g.text(22, 10, 'o o o o');
  g.ground(31, 62, G2);
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
  g.text(6, 11, 'o o o');
  g.text(11, 8, 'B?B');
  g.set(17, 6, 'v');
  // Against the current: ride a palm log across.
  g.canal(25, 36, -1);
  g.set(27, 11, 'M');
  g.text(28, 9, 'o o');
  g.ground(37, 70, G2);
  g.run(40, 44, 8, '-');
  g.text(40, 7, 'ooooo');
  g.text(48, 8, 'BCB');
  g.set(55, 8, '?');
  g.set(45, 6, 'v');
  g.set(58, 5, 'v');
  g.set(63, 11, 'n');
  // The long canal: two logs and a hay-bale island.
  g.canal(71, 92, -1);
  g.set(73, 11, 'M');
  g.rect(81, 11, 82, 13, 'N');
  g.set(84, 11, 'M');
  g.text(75, 9, 'o o o');
  g.text(86, 9, 'o o o');
  g.set(81, 5, 'v');
  g.ground(93, 120, G2);
  g.set(96, 11, 'c');
  g.text(100, 8, 'B?B');
  g.set(106, 8, 'i');
  g.set(112, 11, 'n');
  // Set piece: the sluice race — swim with a strong current under crows.
  g.canal(121, 140, 1);
  g.text(123, 10, 'o o o o o o o o');
  g.set(128, 6, 'v');
  g.set(136, 6, 'v');
  g.ground(141, 175, G2);
  // Secret: palm-trunk steps to the golden fanoos.
  g.run(146, 148, 9, '=');
  g.run(151, 153, 6, '=');
  g.run(156, 162, 4, '-');
  g.text(156, 3, 'oooo  G');
  g.set(165, 11, 'n');
  g.set(170, 11, 'q');
  g.canal(176, 186, -1);
  g.set(178, 11, 'M');
  g.text(179, 9, 'o o');
  g.ground(187, 209, G2);
  g.text(195, 8, 'BFB');
  g.set(205, 11, 'E');
  g.set(101, 5, 'v');
  g.set(150, 11, 'n');
  g.set(199, 11, 'n');
  g.set(33, 5, 'v');
  return g.rows();
}

/* 7 ─ الساقية: ride waterwheel buckets and the donkey cart over the ditch. */
function waterwheels() {
  const g = new Grid(220, 15);
  g.ground(0, 26, G2);
  g.set(3, 11, 'P');
  g.text(6, 11, 'o o o');
  g.text(10, 8, 'B?B');
  g.set(18, 11, 'n');
  // Lesson: a saqia over a pit — ride a bucket up to the far ledge.
  g.set(32, 7, 'W');
  g.text(31, 2, 'ooo');
  g.run(37, 44, 5, '-');
  g.text(38, 4, 'oooooo');
  g.ground(39, 72, G2);
  g.text(48, 8, 'BCB');
  g.set(56, 11, 'q');
  g.set(62, 6, 'v');
  // Set piece: the donkey cart crosses the dry ditch while crows dive.
  g.set(68, 11, 'Y');
  g.set(105, 11, 'y');
  g.text(76, 8, 'o o o o o o o o o o o o');
  g.set(80, 5, 'v');
  g.set(89, 4, 'v');
  g.set(97, 5, 'v');
  g.ground(103, 111, G2);
  g.set(107, 11, 'c');
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
  g.text(6, 11, 'o o o');
  g.text(10, 8, 'B?B');
  g.set(16, 11, 'n');
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
  g.text(74, 8, 'B?B');
  g.set(80, 5, 'v');
  g.set(88, 11, 'q');
  // A saqia over the pit.
  g.set(101, 7, 'W');
  g.text(100, 2, 'ooo');
  g.ground(108, 160, G2);
  g.text(115, 8, 'BFB');
  g.set(121, 8, 'i');
  g.set(126, 11, 'n');
  g.set(132, 5, 'v');
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
  g.set(146, 3, 'v');
  g.set(60, 5, 'v');
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
  g.text(9, 7, 'B?B');
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
  g.run(31, 44, G4, '$');
  g.set(34, 10, '*');
  g.set(38, 10, '*');
  g.set(42, 10, '*');
  g.set(36, 4, '1');
  g.set(46, 7, '3');
  g.text(49, 7, 'BCB');
  g.set(54, 10, '4');
  g.set(57, 10, '(');
  g.sea(61, 72, 12);
  g.set(64, 13, '2');
  g.set(69, 12, '2');
  g.rect(66, 10, 67, 11);
  g.text(62, 8, 'o o o o o');
  // The fort walls: climb the stepped bastion in the gale.
  g.ground(73, 128, G4);
  g.set(76, 10, 'c');
  g.rect(82, 8, 128, 10);
  g.rect(90, 5, 128, 7);
  g.run(82, 89, 8, '$');
  g.set(85, 7, '*');
  g.set(88, 3, '1');
  g.set(94, 4, '4');
  g.text(96, 1, 'B?B');
  g.set(100, 4, '3');
  g.run(104, 114, 5, '$');
  g.set(108, 4, '*');
  g.set(112, 4, '4');
  // Secret: the lantern of the old lighthouse, on the tower top.
  g.rect(116, 3, 119, 4);
  g.text(116, 2, 'o  G');
  g.set(122, 4, '1');
  g.set(125, 4, '4');
  // Down into the courtyard by the battlements.
  g.rect(129, 8, 132, 10);
  g.ground(129, 160, G4);
  g.text(136, 7, 'BFB');
  g.run(140, 152, G4, '$');
  g.set(143, 10, '*');
  g.set(148, 10, '*');
  g.set(146, 4, '1');
  g.set(154, 10, '4');
  g.set(157, 7, '3');
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
    rows: lanternAlley(),
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
    waves: { period: 2.8, warn: 0.85, crash: 0.8 },
    gust: { push: 200, on: 2200, off: 1500 },
    boss: true,
    mechanic: 'النوة: مطر وريح متقلّبة وموج + الزعيم',
    enemy: 'ريّس النوة',
    rows: qaitbay(),
  },
];
