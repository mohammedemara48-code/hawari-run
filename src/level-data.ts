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
export const TILE = 24;
export type Theme = 'night' | 'market' | 'roof' | 'sewer';
export interface LevelMeta {
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

export const LEVELS: LevelMeta[] = [
  {
    id: 'lanterns',
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
    id: 'market',
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
    id: 'roofs',
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
    id: 'metro',
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
];
