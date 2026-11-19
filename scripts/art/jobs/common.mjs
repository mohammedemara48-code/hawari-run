// Shared drawn bits for posed frames, in the same outlined style as the art.
export const INK = '#1b140f';
export const star = (x, y, r, sw = 5) => {
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
  return `<path d="${d}Z" fill="#ffd84a" stroke="${INK}" stroke-width="${sw}" stroke-linejoin="round"/>`;
};
export const stars = (x, y, r, sw) =>
  star(x, y + r, r, sw) +
  star(x + r * 3, y, r * 0.8, sw) +
  star(x + r * 6, y + r * 1.2, r * 0.9, sw);
export const dust = (x, y, r, dir = -1, sw = 5) =>
  [0, 1, 2]
    .map(
      (i) =>
        `<ellipse cx="${x + dir * i * r * 1.6}" cy="${y - (i % 2) * r * 0.7}" rx="${r * (1 - i * 0.15)}" ry="${r * 0.7 * (1 - i * 0.15)}" fill="#ecd6a4" stroke="${INK}" stroke-width="${sw}"/>`,
    )
    .join('');
export const drops = (x, y, r, n = 5, sw = 5, fill = '#bfe8ff') =>
  Array.from(
    { length: n },
    (_, i) =>
      `<path d="M${x + i * r * 1.1} ${y - i * r * 1.4} q${r * 0.5} -${r} 0 -${r * 1.7} q-${r * 0.5} ${r * 0.7} 0 ${r * 1.7}z" fill="${fill}" stroke="${INK}" stroke-width="${sw}"/>`,
  ).join('');
export const speed = (x, y, len, n = 3, sw = 6) =>
  Array.from(
    { length: n },
    (_, i) =>
      `<path d="M${x} ${y + i * len * 0.35} h${len * (1 - i * 0.2)}" stroke="#fff6dc" stroke-width="${sw}" stroke-linecap="round"/>`,
  ).join('');
export const HURT = [255, 236, 226, 0.45];
export const DEAD = [120, 120, 110, 0.3];
