import type { Track } from './audio';
// Original musical motifs. The timbres suggest each setting's mood, not a
// historical reconstruction of ancient or medieval music.
export function addLandmarkMusic(tracks: Track[]) {
  const worlds = [
    {
      names: [
        'حافة الهضبة',
        'طريق معبد الوادي',
        'الممر الصاعد',
        'ساحة الأفق',
        'خنفساء المنشور',
      ],
      maqam: 'hijaz' as const,
      root: 57,
      timbre: 'ney' as const,
      rhythm: 'maqbara' as const,
      melodies: [
        '0 . . 1 4 . 5 .  4 . 1 . 0 . . .  0 1 4 . 5 7 . 5  4 . 1 0 . . -1 .',
        '0 4 . 5 4 1 . 0  1 . 4 5 7 . 5 .  8 7 . 5 4 . 1 .  4 1 0 . -1 . 0 .',
        '0 . 1 4 5 . 4 1  2 . 3 5 6 . 5 3  4 5 7 . 8 . 7 5  4 3 1 . 0 . . .',
        '7 . 5 . 4 1 . 4  5 7 8 . 7 5 . .  4 . 5 4 1 . 0 .  -1 0 1 4 1 0 . .',
        '0 1 4 5 7 . 5 4  1 4 5 7 8 . 7 5  8 7 5 4 5 4 1 0  4 5 4 1 0 . 0 .',
      ],
    },
    {
      names: [
        'درب الأسوار',
        'ممر الأبراج',
        'شرفات المقطم',
        'بوابة الحارس',
        'حارس النحاس',
      ],
      maqam: 'nahawand' as const,
      root: 60,
      timbre: 'rababa' as const,
      rhythm: 'maqsum' as const,
      melodies: [
        '0 . 4 5 4 . 2 .  3 4 2 . 1 . 0 .  0 2 3 4 5 . 4 .  2 1 0 . -1 . 0 .',
        '0 2 . 3 4 . 2 1  0 . -1 0 2 . 4 .  5 4 2 . 3 2 1 .  0 -1 0 . 2 . 0 .',
        '4 . 5 7 . . 5 4  3 . 4 5 . . 3 2  0 . 2 4 . 5 7 .  8 7 5 4 2 . 0 .',
        '0 0 . 4 5 4 . 2  3 . 2 1 0 . -1 .  4 4 . 7 8 7 5 .  4 3 2 1 0 . 0 .',
        '0 4 0 5 4 2 3 1  0 . 2 4 5 . 4 2  7 5 4 2 3 4 2 1  0 -1 0 2 4 . 0 .',
      ],
    },
    {
      names: [
        'حارة المشربيات',
        'بيوت التجار',
        'دروب النهر',
        'ترس الطاحونة',
        'قلب الترس',
      ],
      maqam: 'rast' as const,
      root: 62,
      timbre: 'simsimiyya' as const,
      rhythm: 'baladi' as const,
      melodies: [
        '0 2 4 . 5 4 2 1  0 . 2 4 3 2 1 .  4 5 7 . 5 4 3 2  1 . 2 1 0 . 0 .',
        '0 0 2 4 5 . 4 2  3 4 2 1 0 . 1 .  2 3 5 7 5 . 4 3  2 . 1 2 0 . . .',
        '4 . 2 . 0 1 2 4  5 . 7 5 4 . 3 .  2 4 5 . 7 8 7 5  4 2 1 . 0 . . .',
        '0 2 0 4 2 5 4 2  1 3 1 4 3 5 4 1  2 4 2 5 4 7 5 4  3 2 1 2 0 . 0 .',
        '0 2 4 5 4 2 1 0  4 5 7 8 7 5 4 2  0 2 4 5 7 5 4 2  3 4 2 1 0 . 0 .',
      ],
    },
  ];
  for (let i = 0; i < 15; i++) {
    const boss = i >= 12,
      group = boss ? i - 12 : Math.floor(i / 4),
      variation = boss ? 4 : i % 4,
      w = worlds[group];
    const seq = (s: string) =>
      s.split(/\s+/).map((n) => (n === '.' ? null : Number(n)));
    tracks.push({
      name: w.names[variation],
      maqam: w.maqam,
      root: w.root,
      bpm: boss ? 136 + group * 8 : [84, 98, 92, 112][variation] + group * 6,
      rhythm: boss ? 'harbi' : w.rhythm,
      lead: 'triangle',
      timbre: w.timbre,
      boss,
      melody: seq(w.melodies[variation]),
      bass: seq(group === 2 ? '0 . 4 . 0 2 -1 .' : '0 . . 0 4 . -1 .'),
      drone: group === 0,
    });
  }
}
