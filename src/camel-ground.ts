/** Sprite feet sit two pixels above its texture's bottom edge. The centre
 * of the animal follows the authored sand surface, including low dunes. */
export function camelGroundY(
  at: (col: number, row: number) => string,
  rows: number,
  x: number,
  fallback: number,
) {
  const sample = (col: number) => {
    for (let r = 10; r < rows; r++)
      if ('#=سل'.includes(at(col, r))) return r * 24 + 2;
    return fallback;
  };
  const col = (x + 60) / 24 - 0.5,
    a = Math.floor(col),
    mix = col - a;
  return sample(a) * (1 - mix) + sample(a + 1) * mix;
}
