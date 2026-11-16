// What's new, newest first. Each release adds an entry here and bumps the
// version in package.json to match; the build publishes this list in
// /version.json so an older build that is still running can show it.
export interface Release {
  version: string;
  date: string;
  notes: string[];
}
export const CHANGELOG: Release[] = [
  {
    version: '2.0.2',
    date: '2026-11-16',
    notes: [
      'نبلة الأرياف بدل الشطة، وصندوق السلاح قبل كل زعيم بيدّي سلاح العالم',
      'البلبل يكبر بالأكل، والضربة تنزّل درجة: السلاح وبعدين الحجم وبعدين الموت',
      'الترعة بقت تتعدّى، والغربان متوزعة مش متجمّعة عند البداية',
    ],
  },
  {
    version: '2.0.1',
    date: '2026-11-15',
    notes: [
      'تصليح مرحلة تحت المترو: بلبل الكبير بقى يعدّي من تحت الحيطة بعد علم الأمان',
      'صندوق شطة قبل كل وحش عشان بلبل يدخل المواجهة مسلّح',
      'اللعبة بقت تقولّك أول ما يكون فيه تحديث جديد',
    ],
  },
];
export const APP_VERSION = CHANGELOG[0].version;

/** -1, 0 or 1, comparing dotted numeric versions ("2.0.10" > "2.0.9"). */
export function compareVersions(a: string, b: string) {
  const x = a.split('.').map(Number),
    y = b.split('.').map(Number);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const d = (x[i] || 0) - (y[i] || 0);
    if (d) return d > 0 ? 1 : -1;
  }
  return 0;
}

/** Releases newer than `from` (all of them when `from` is null), newest first. */
export function releasesSince(from: string | null, log: Release[] = CHANGELOG) {
  return log
    .filter((r) => from === null || compareVersions(r.version, from) > 0)
    .sort((a, b) => compareVersions(b.version, a.version));
}

/** Contents of /version.json. */
export interface VersionInfo {
  build: string;
  version: string;
  changelog: Release[];
}
