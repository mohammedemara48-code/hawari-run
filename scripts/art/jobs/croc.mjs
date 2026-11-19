// Nile crocodile (QuiverAI art): the small crocodiles and the great boss.
const SVG = 'scripts/art/svg/croc.svg';
const moves = [
  {
    group: 'jaw-lower',
    ids: ['lower-jaw', 'jaw-rim-shading'],
    before: 'head',
    attrs: { 'stroke-width': '6' },
  },
  { group: 'upper', ids: ['head', 'teeth'], before: 'near-front-leg' },
];
const HINGE = [288, 152];
const INK = '#1b140f';
const mouth = `<path d="M288 150 L60 62 L40 96 L30 182 L40 196 Z" fill="#a8383a" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>
<path d="M270 160 L80 150 Q60 170 90 182 L260 168 Z" fill="#d8686a" stroke="none"/>`;
const dust = (x, y) =>
  [0, 1, 2]
    .map(
      (i) =>
        `<ellipse cx="${x - i * 46}" cy="${y - (i % 2) * 22}" rx="${30 - i * 5}" ry="${20 - i * 4}" fill="#ecd6a4" stroke="${INK}" stroke-width="5"/>`,
    )
    .join('');
const star = (x, y, r) => {
  let d = '';
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI / 5) * i - Math.PI / 2,
      rr = i % 2 ? r * 0.45 : r;
    d +=
      (i ? 'L' : 'M') +
      (x + Math.cos(a) * rr).toFixed(1) +
      ' ' +
      (y + Math.sin(a) * rr).toFixed(1);
  }
  return `<path d="${d}Z" fill="#ffd84a" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>`;
};
const splash = [0, 1, 2, 3, 4]
  .map(
    (i) =>
      `<path d="M${880 + i * 28} ${330 - i * 40} q14 -30 0 -50 q-14 20 0 50z" fill="#bfe8ff" stroke="${INK}" stroke-width="5"/>`,
  )
  .join('');
const walk = (s) => ({
  'near-front-leg': { rotate: 12 * s, pivot: [0.5, 0.1] },
  'near-rear-leg': { rotate: -12 * s, pivot: [0.5, 0.1] },
  'far-legs': { dx: 10 * s },
});
const open = (deg, low = -8) => ({
  upper: { rotate: deg, at: HINGE },
  'jaw-lower': { rotate: low, at: HINGE },
});
const pose = {
  idle0: {},
  idle1: { parts: { ...walk(1), upper: { rotate: 3, at: HINGE } } },
  gape: {
    parts: open(24),
    overlays: [{ in: 'crocodile', before: 'jaw-lower', svg: mouth }],
  },
  lunge: {
    parts: {
      ...open(16, -6),
      'near-front-leg': { rotate: 28, pivot: [0.5, 0.1] },
      'near-rear-leg': { rotate: -26, pivot: [0.5, 0.1] },
    },
    overlays: [
      { in: 'crocodile', before: 'jaw-lower', svg: mouth },
      { in: 'crocodile', svg: dust(1010, 400) },
    ],
  },
  stuck: {
    parts: {
      upper: { rotate: -7, at: HINGE, dy: 14 },
      'jaw-lower': { dy: 14 },
    },
    overlays: [
      {
        in: 'crocodile',
        svg:
          dust(150, 395) +
          star(160, 40, 26) +
          star(240, 10, 20) +
          star(320, 46, 22),
      },
    ],
  },
  tail: { parts: walk(-1), overlays: [{ in: 'crocodile', svg: splash }] },
  hurt: { parts: open(10, -4), tint: [255, 236, 226, 0.45] },
  dead: {
    parts: { crocodile: { sy: -1, at: [200, 112] } },
    tint: [120, 120, 110, 0.3],
  },
};
const frames = [];
for (const [k, v] of Object.entries(pose))
  frames.push({
    key: 'boss6-' + k,
    w: 168,
    h: 88,
    box: [2, 4, 164, 68],
    moves,
    ...v,
  });
const small = [
  pose.idle0,
  pose.idle1,
  pose.gape,
  { ...pose.lunge, overlays: pose.gape.overlays, parts: open(14, -5) },
];
small.forEach((v, i) =>
  frames.push({
    key: 'croc' + i,
    w: 44,
    h: 22,
    box: [0, 2, 44, 18],
    moves,
    ...v,
  }),
);
export default { svg: SVG, frames };
