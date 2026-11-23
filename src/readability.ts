import type { Alley } from './game';
/** The architecture remains visible, while only the background is graded.
 * Ground, hero, pickups, enemies and puzzle drawings keep their original light. */
export function buildReadability(s: Alley) {
  const strong = !!s.L.meta.landmark;
  const g = s.add
    .graphics()
    .setDepth(-50)
    .setScrollFactor(0)
    .setName('backdrop-readability');
  const width = Math.max(1280, s.scale.gameSize.width),
    height = 720;
  for (let y = 0; y < height; y += 8) {
    const alpha = strong
      ? 0.16 + Math.min(y / 360, 1) * 0.26
      : s.L.meta.dark
        ? 0
        : 0.06 + Math.min(y / 360, 1) * 0.1;
    g.fillStyle(0x10252c, alpha);
    g.fillRect(0, y, width, 8);
  }
  if (!strong) return;
  const outline = s.add.graphics().setDepth(1);
  // Pick out only playable ledges, not decorative masonry in the painting.
  for (let row = 0; row < s.L.rows; row++)
    for (let col = 0; col < s.L.cols; col++) {
      const ch = s.L.at(col, row);
      if (ch !== '-' && ch !== '#') continue;
      if (ch === '#' && s.L.at(col, row - 1) === '#') continue;
      outline.lineStyle(5, 0x14232a, 1);
      outline.lineBetween(col * 24, row * 24 + 1, (col + 1) * 24, row * 24 + 1);
      outline.lineStyle(2, 0xffd778, 1);
      outline.lineBetween(col * 24, row * 24 - 1, (col + 1) * 24, row * 24 - 1);
    }
}
