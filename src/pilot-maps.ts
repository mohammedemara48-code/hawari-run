// Pilot only. Insert authored encounters without touching any other city's maps.
// Tile coordinates remain inspectable; stable level IDs and music live elsewhere.
export function expandPilot(
  rows: string[],
  inserts: { at: number; width: number }[],
) {
  const mapX = (x: number) =>
    x + inserts.reduce((n, part) => n + (x >= part.at ? part.width : 0), 0);
  const cells = rows.map((row) => {
    const out = Array(
      row.length + inserts.reduce((n, p) => n + p.width, 0),
    ).fill('.');
    [...row].forEach((ch, x) => (out[mapX(x)] = ch));
    return out;
  });
  const put = (x: number, y: number, value: string) => {
    if (cells[y] && x >= 0 && x < cells[y].length) cells[y][x] = value;
  };
  const run = (a: number, b: number, y: number, value: string) => {
    for (let x = a; x <= b; x++) put(x, y, value);
  };
  const floor = (a: number, b: number) => {
    run(a, b, cells.length - 2, '#');
    run(a, b, cells.length - 1, '#');
  };
  return { cells, put, run, floor, rows: () => cells.map((r) => r.join('')) };
}

export function lanternPilot() {
  const g = expandPilot(
    Array.from({ length: 15 }, () => '.'.repeat(300)),
    [],
  );
  g.floor(0, 299);
  g.put(3, 12, 'P');
  g.put(294, 12, 'E');
  g.put(154, 12, 'c');
  g.put(10, 9, 'F');
  g.put(157, 9, 'F');
  g.put(163, 9, 'C');
  // Safe first lesson: the glowing bridge is over a shallow, escapable trench.
  for (const [a, b, lamp] of [
    [31, 35, 27],
    [92, 96, 88],
    [180, 184, 176],
    [229, 233, 225],
  ]) {
    g.run(a, b, 13, '.');
    g.run(a, b, 12, '~');
    g.run(a, b, 11, 'o');
    g.put(lamp, 12, 'L');
  }
  // Balconies, a courtyard, a lit stair and a final hidden rooftop garden.
  for (const [x, y, w] of [
    [43, 10, 6],
    [47, 7, 10],
    [67, 10, 6],
    [105, 10, 7],
    [110, 7, 12],
    [132, 10, 7],
    [193, 10, 7],
    [198, 7, 12],
    [244, 10, 7],
    [248, 7, 9],
    [252, 4, 12],
  ]) {
    g.run(x, x + w - 1, y, '-');
    g.run(x + 1, x + w - 2, y - 1, 'o');
  }
  g.put(104, 12, 'L');
  g.run(106, 109, 10, '~');
  g.put(246, 12, 'L');
  g.put(257, 3, 'L');
  g.run(259, 264, 4, '~');
  g.put(262, 3, 'G');
  for (const x of [73, 138, 211, 274]) {
    g.run(x, x + 3, 12, '#');
    g.run(x, x + 3, 11, '#');
    g.run(x - 2, x + 4, 9, 'o');
  }
  for (const x of [63, 125, 280]) g.put(x, 12, 'g');
  // The courtyard cat guards the optional balcony, not the flag's landing lane.
  g.put(203, 6, 'g');
  g.put(82, 9, '?');
  g.put(218, 9, '?');
  g.put(288, 9, 'i');
  return g.rows();
}

export function grovePilot(rows: string[]) {
  const g = expandPilot(rows, [
    { at: 53, width: 80 },
    { at: 116, width: 50 },
    { at: 160, width: 50 },
  ]);
  // A second oasis: low sun route vs shaded stepped terraces, not an empty road.
  g.floor(53, 132);
  for (const x of [56, 83, 113, 128]) {
    g.put(x, 12, 'ع');
    g.put(x, 10, 'ش');
  }
  for (const x of [62, 91, 119]) {
    g.run(x, x + 5, 11, '-');
    g.run(x + 5, x + 13, 8, '-');
    g.run(x + 6, x + 11, 7, 'o');
    g.put(x + 9, 10, 'ش');
  }
  g.put(76, 12, 'ق');
  g.put(106, 12, 'ق');
  g.put(87, 9, 'F');
  // First camel still makes the crossing; checkpoint is on its receiving bank.
  g.put(246, 12, '.');
  g.put(209, 12, 'c');
  g.put(204, 12, 'ع');
  g.put(204, 10, 'ش');
  g.put(206, 12, '@');
  // After the flag: sandstone steps and shade, then the second camel/log choice.
  g.floor(196, 245);
  for (const x of [217, 234]) {
    g.run(x, x + 4, 12, '#');
    g.run(x, x + 4, 11, '#');
    g.put(x + 2, 9, 'ش');
    g.run(x - 2, x + 5, 9, 'o');
  }
  g.put(229, 12, 'ع');
  g.put(229, 10, 'ش');
  // Final grove has a lower route and a rising orchard gallery to the secret.
  g.floor(290, 339);
  for (const x of [294, 316, 336]) {
    g.put(x, 12, 'ع');
    g.put(x, 10, 'ش');
  }
  g.run(298, 303, 11, '-');
  g.run(306, 316, 8, '-');
  g.run(320, 327, 10, '-');
  g.run(307, 315, 7, 'o');
  g.put(312, 10, 'ش');
  g.put(329, 12, 'ق');
  // The optional climb has its own water and shade, so exploring is not a thirst trap.
  g.put(356, 12, 'ع');
  g.put(357, 9, 'ش');
  g.put(363, 6, 'ش');
  g.put(366, 4, 'ع');
  return g.rows();
}

export function plateauPilot() {
  const g = expandPilot(
    Array.from({ length: 17 }, () => '.'.repeat(340)),
    [],
  );
  g.floor(0, 339);
  g.put(3, 14, 'P');
  g.put(336, 14, 'E');
  g.put(174, 14, 'c');
  g.put(9, 11, 'F');
  g.put(180, 11, 'F');
  g.put(184, 11, 'C');
  // Three different spaces: temple steps, an open colonnade, the rising gallery.
  for (const [x, y, width] of [
    [16, 12, 6],
    [22, 9, 12],
    [38, 12, 7],
    [74, 12, 7],
    [80, 9, 14],
    [92, 6, 14],
    [111, 9, 7],
    [195, 12, 7],
    [202, 9, 14],
    [214, 6, 15],
    [234, 9, 9],
    [304, 12, 8],
    [311, 9, 15],
  ]) {
    g.run(x, x + width - 1, y, '-');
    g.run(x + 1, x + width - 2, y - 1, 'o');
  }
  // Visible short gaps, separated by broad safe landings. No blind drops.
  for (const [a, b] of [
    [65, 68],
    [122, 125],
    [249, 252],
  ]) {
    g.run(a, b, 15, '.');
    g.run(a, b, 16, '.');
    g.run(a - 1, b + 1, 12, 'o');
  }
  for (const x of [134, 151, 281, 298]) {
    g.run(x, x + 3, 14, '#');
    g.run(x, x + 3, 13, '#');
  }
  g.put(104, 5, 'G');
  g.put(41, 11, '5');
  g.put(114, 8, '5');
  g.put(224, 5, '5');
  g.put(320, 8, '5');
  g.put(161, 11, '?');
  g.put(285, 10, '?');
  return g.rows();
}
