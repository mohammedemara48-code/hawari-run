import type { LevelMeta, WorldMeta } from './level-data';

export const LANDMARK_WORLDS: WorldMeta[] = [
  {
    id: 'giza',
    name: 'هضبة الأهرامات',
    subtitle: 'الجيزة · هضبة ومعبد وممرات النور',
    x: 0.38,
    y: 0.39,
    side: 'left',
    playable: true,
  },
  {
    id: 'citadel',
    name: 'قلعة صلاح الدين',
    subtitle: 'القاهرة · أسوار وأبراج وشرفات المقطم',
    x: 0.59,
    y: 0.4,
    side: 'right',
    playable: true,
  },
  {
    id: 'rashid',
    name: 'رشيد',
    subtitle: 'مشربيات وطوب ملون وتجارة على النيل',
    x: 0.36,
    y: 0.16,
    side: 'left',
    playable: true,
  },
];

/** All coordinates are tile positions; runtime puzzles are authored separately
 * from the static map so their state resets cleanly on checkpoint restart. */
export interface LandmarkPuzzle {
  kind: 'light' | 'stealth' | 'balance';
  variant: number;
  stations: number[];
  gate: number;
  target: number[];
}
export const LANDMARK_IDS = [
  'giza-plateau',
  'giza-valley',
  'giza-gallery',
  'giza-horizon',
  'citadel-ramparts',
  'citadel-towers',
  'citadel-terraces',
  'citadel-guardian',
  'rashid-lattices',
  'rashid-merchants',
  'rashid-river',
  'rashid-mill',
];
const names = [
  ['حافة الهضبة', 'طريق معبد الوادي', 'الممر الصاعد', 'ساحة الأفق'],
  ['درب الأسوار', 'ممر الأبراج', 'شرفات المقطم', 'بوابة الحارس'],
  ['حارة المشربيات', 'بيوت التجار', 'دروب النهر', 'ترس الطاحونة'],
];
const hooks = [
  [
    'دوّر العاكس لتوصل النور',
    'وصل شعاعين بنفس الوقت',
    'النور لازم يعدّي من ثلاث عواكس',
    'اعكس النور على خنفساء المنشور',
  ],
  [
    'استخبى ورا الشرافة لحد الفانوس ما يعدّي',
    'غيّر ارتفاعك عشان تهرب من عين الحارس',
    'اختار اللحظة بين فانوسين',
    'عدّي من ورا الدرع واقطع الإنذار',
  ],
  [
    'انقل كيس بين الكفتين وافتح طريقك',
    'وزّع كيسين عشان تعلّي الكفة الصح',
    'وصل الميزان لعلامة المرسى',
    'وازن الحمل عشان تكشف ترس الطاحونة',
  ],
];
const subtitles = [
  'عواكس النور خيال لعب مستوحى من المكان، مش شرح تاريخي',
  'الجامع في الخلفية، والمغامرة فوق الأسوار وبين الأبراج',
  'بيوت التجار والمشربيات فوقك، والميزان في إيدك',
];
function map(group: number, variant: number) {
  const width = 116 + variant * 8,
    height = 17;
  const cells = Array.from({ length: height }, () => Array(width).fill('.'));
  const put = (x: number, y: number, value: string) => {
    cells[y][x] = value;
  };
  for (let x = 0; x < width; x++) {
    put(x, 15, '#');
    put(x, 16, '#');
  }
  put(3, 14, 'P');
  put(width - 4, 14, 'E');
  put(39, 14, 'c');
  put(9, 11, 'F');
  if (variant === 3) put(45, 11, '!');
  else put(45, 11, 'C');
  // A reachable optional upper route, not a carbon copy of the old city maps.
  for (let i = 0; i < 4 + variant; i++) {
    const x = 12 + i * 13,
      row = group === 0 ? 12 - (i % 2) : group === 1 ? 12 - (i % 3) : 12;
    for (let j = 0; j < 4; j++) put(x + j, row, '-');
    put(x + 1, row - 1, 'o');
    put(x + 2, row - 1, 'o');
  }
  put(28, 12, 'G');
  for (let x = 7; x < width - 10; x += 9) put(x, 14, 'o');
  if (group === 0) {
    put(29, 14, '5');
    put(76, 14, '5');
  }
  if (group === 2) {
    put(26, 14, 'g');
    put(81, 14, 'g');
  }
  if (variant === 3) put(width - 12, 14, 'Z');
  return cells.map((row) => row.join(''));
}
export const LANDMARK_LEVELS: LevelMeta[] = Array.from(
  { length: 12 },
  (_, i) => {
    const group = Math.floor(i / 4),
      variant = i % 4;
    return {
      world: 8 + group,
      id: LANDMARK_IDS[i],
      name: names[group][variant],
      subtitle: subtitles[group],
      theme: (['giza', 'citadel', 'rashid'] as const)[group],
      time: 260 + variant * 20,
      dark: 0,
      track: 40 + i,
      timeOfDay: `landmark-${i}`,
      boss: variant === 3,
      bossKind:
        variant === 3
          ? (['prism', 'guardian', 'mill'] as const)[group]
          : undefined,
      bossTrack: variant === 3 ? 52 + group : undefined,
      mechanic: hooks[group][variant],
      enemy: ['خنافس الهضبة', 'عين الحارس', 'قطط المخزن'][group],
      landmark: {
        kind: (['light', 'stealth', 'balance'] as const)[group],
        variant,
        stations:
          variant === 3
            ? group === 0
              ? [115, 120, 125]
              : group === 1
                ? [116, 122]
                : [118]
            : group === 0
              ? [56, 66, 76].slice(0, Math.min(3, variant + 1))
              : group === 1
                ? [58, 76, 91].slice(0, Math.min(3, variant + 1))
                : [59],
        gate: variant === 3 ? 136 : 101 + variant * 8,
        target:
          group === 0
            ? [1, 3, 2].slice(0, Math.min(3, variant + 1))
            : group === 2
              ? [variant + 1]
              : [],
      },
      rows: map(group, variant),
    };
  },
);
