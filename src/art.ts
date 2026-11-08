import Phaser from 'phaser';
type C = CanvasRenderingContext2D;
const ink = '#24283c',
  gold = '#f9c86b',
  teal = '#346d70',
  cream = '#ffe2ad';
function rect(c: C, x: number, y: number, w: number, h: number, color: string) {
  c.fillStyle = color;
  c.fillRect(Math.round(x), Math.round(y), w, h);
}
function line(
  c: C,
  x: number,
  y: number,
  x2: number,
  y2: number,
  color: string,
  width = 1,
) {
  c.strokeStyle = color;
  c.lineWidth = width;
  c.beginPath();
  c.moveTo(x, y);
  c.lineTo(x2, y2);
  c.stroke();
}
function poly(c: C, points: number[][], color: string) {
  c.fillStyle = color;
  c.beginPath();
  points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.closePath();
  c.fill();
}
function ellipse(
  c: C,
  x: number,
  y: number,
  rx: number,
  ry: number,
  color: string,
) {
  c.fillStyle = color;
  c.beginPath();
  c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  c.fill();
}
function texture(
  scene: Phaser.Scene,
  key: string,
  w: number,
  h: number,
  paint: (c: C) => void,
) {
  const t = scene.textures.createCanvas(key, w, h)!;
  const c = t.context;
  c.imageSmoothingEnabled = false;
  paint(c);
  t.refresh();
}
function windowArt(c: C, x: number, y: number, w = 20, h = 30, lit = false) {
  rect(c, x - 2, y - 2, w + 4, h + 4, '#9a6654');
  rect(c, x, y, w, h, ink);
  rect(c, x + 2, y + 2, w - 4, h - 4, lit ? '#dba263' : '#48777a');
  rect(c, x + 3, y + 3, w / 2 - 4, h - 6, lit ? '#ffe0a0' : '#5c8b88');
  rect(c, x + w / 2 - 1, y, 2, h, '#483b41');
  rect(c, x, y + h / 2, w, 2, '#483b41');
  rect(c, x - 3, y + h, w + 6, 3, '#d7aa7a');
}
function balcony(c: C, x: number, y: number, w: number) {
  rect(c, x - 5, y + 18, w + 10, 4, '#573e3c');
  rect(c, x - 3, y + 22, w + 6, 3, '#a77662');
  rect(c, x - 3, y, w + 6, 3, '#403b42');
  for (let i = 0; i <= w; i += 7) {
    rect(c, x + i, y, 2, 19, '#3c3c43');
    rect(c, x + i + 2, y + 7, 2, 7, '#694b49');
  }
  rect(c, x - 5, y - 2, w + 10, 2, '#bd986e');
}
function house(
  c: C,
  x: number,
  w: number,
  h: number,
  color: string,
  variant: number,
) {
  const y = 310 - h;
  rect(c, x + 4, y + 7, w, h, '#3b4b54');
  rect(c, x, y, w, h, color);
  rect(c, x + 5, y + 6, w - 10, h - 6, variant % 2 ? '#c18a6e' : '#bc8264');
  rect(c, x + 8, y + 8, w - 16, h - 8, color);
  rect(c, x - 4, y - 3, w + 8, 6, '#e6ba86');
  rect(c, x - 2, y + 3, w + 4, 4, '#8e6156');
  rect(c, x + w - 7, y + 10, 7, h - 10, '#9a6b60');
  for (let yy = y + 45; yy < 290; yy += 48) {
    rect(c, x, yy, w, 3, '#d3a078');
    rect(c, x, yy + 3, w, 2, '#aa745d');
  }
  // chipped plaster and exposed masonry
  for (let j = 0; j < 12; j++) {
    const px = x + ((j * 31 + variant * 7) % (w - 16)),
      py = y + 15 + ((j * 41) % (h - 25));
    rect(c, px, py, 7, 2, '#b47d64');
    if (j % 3 === 0) {
      rect(c, px + 2, py + 3, 9, 3, '#a77160');
      rect(c, px + 6, py + 4, 1, 3, '#d7a681');
    }
  }
  for (let yy = y + 18; yy < 260; yy += 48) {
    for (let xx = x + 14; xx < x + w - 23; xx += 34) {
      windowArt(c, xx, yy, 18, 27, (xx + yy) % 3 === 0);
      if ((yy + variant) % 2 === 0) balcony(c, xx - 2, yy + 19, 22);
    }
  }
  // carved doorway, steps, AC unit and roof pots
  rect(c, x + 15, 276, 28, 34, '#5b4847');
  ellipse(c, x + 29, 279, 14, 12, '#5b4847');
  rect(c, x + 18, 277, 22, 33, '#416c6a');
  rect(c, x + 20, 279, 8, 27, '#538783');
  rect(c, x + 29, 277, 2, 33, '#293e48');
  rect(c, x + 34, 293, 2, 3, gold);
  rect(c, x + 12, 307, 34, 3, '#d9b58a');
  rect(c, x + w - 29, y + 51, 22, 12, '#d8bc92');
  for (let i = 0; i < 4; i++)
    rect(c, x + w - 26 + i * 4, y + 53, 1, 7, '#8b8976');
  rect(c, x + 14, y - 9, 9, 6, '#8a5a4e');
  rect(c, x + 15, y - 12, 7, 4, '#dc9a70');
  rect(c, x + w - 25, y - 15, 14, 11, '#5c7370');
  rect(c, x + w - 27, y - 17, 18, 3, '#b5ae8c');
}
function palm(c: C, x: number, y: number, scale = 1) {
  c.save();
  c.translate(x, y);
  c.scale(scale, scale);
  rect(c, -4, -63, 8, 63, '#725b50');
  rect(c, -3, -63, 3, 63, '#b19067');
  for (let i = 0; i < 9; i++) line(c, -3, -i * 7, 3, -i * 7 - 4, '#4c4e45', 2);
  for (let i = 0; i < 7; i++) {
    const dx = (i - 3) * 12;
    poly(
      c,
      [
        [0, -63],
        [dx, -82 + Math.abs(i - 3) * 3],
        [dx * 1.6, -58 + Math.abs(i - 3) * 5],
        [dx * 0.8, -68],
      ],
      i % 2 ? '#417b67' : '#2d655c',
    );
  }
  c.restore();
}
function lantern(c: C, x: number, y: number) {
  rect(c, x - 2, y - 4, 4, 4, '#765246');
  poly(
    c,
    [
      [x - 7, y],
      [x + 7, y],
      [x + 5, y + 15],
      [x - 5, y + 15],
    ],
    ink,
  );
  poly(
    c,
    [
      [x - 5, y + 2],
      [x + 5, y + 2],
      [x + 3, y + 12],
      [x - 3, y + 12],
    ],
    gold,
  );
  rect(c, x - 1, y + 2, 2, 11, '#fff1bb');
  rect(c, x - 5, y + 15, 10, 3, '#946345');
}
export function makeArt(scene: Phaser.Scene) {
  if (scene.textures.exists('hero0')) return;
  for (let f = 0; f < 10; f++)
    texture(scene, 'hero' + f, 26, 36, (c) => {
      const run = f >= 1 && f <= 6,
        dy = run ? (f % 3 === 0 ? -1 : 0) : 0;
      c.translate(0, dy);
      // dark outlined silhouette, original blue-cap courier
      rect(c, 7, 1, 12, 3, ink);
      rect(c, 5, 4, 17, 4, ink);
      rect(c, 7, 2, 11, 5, '#1c797e');
      rect(c, 9, 2, 8, 2, '#54b4a2');
      rect(c, 17, 6, 7, 2, ink);
      rect(c, 17, 5, 6, 2, '#efb94e');
      rect(c, 7, 8, 14, 10, ink);
      rect(c, 9, 8, 11, 9, '#c98256');
      rect(c, 11, 8, 9, 5, '#f2b47b');
      rect(c, 18, 10, 2, 3, ink);
      rect(c, 21, 12, 2, 3, '#e4a270');
      rect(c, 8, 8, 3, 6, '#523d37');
      rect(c, 12, 16, 6, 3, '#b86d4b');
      rect(c, 6, 18, 14, 11, ink);
      rect(c, 7, 19, 12, 9, '#f3d5a0');
      rect(c, 7, 18, 4, 11, teal);
      rect(c, 15, 18, 4, 11, '#20505b');
      rect(c, 8, 20, 2, 7, '#64a49a');
      rect(c, 11, 18, 4, 3, '#e07d44');
      rect(c, 11, 21, 3, 4, '#ce643d');
      rect(c, 6, 28, 14, 3, ink);
      rect(c, 7, 28, 12, 2, '#b67e55');
      const swing = run ? [0, 2, 4, 1, -2, -3][f - 1] : 0;
      if (f === 7) {
        rect(c, 4, 13, 4, 9, ink);
        rect(c, 4, 12, 4, 4, '#f5bb83');
        rect(c, 19, 18, 4, 8, ink);
        rect(c, 19, 23, 4, 4, '#d28e61');
      } else {
        rect(c, 4, 19 + swing, 4, 8, ink);
        rect(c, 4, 24 + swing, 4, 4, '#e9aa76');
        rect(c, 19, 19 - swing, 4, 8, ink);
        rect(c, 19, 24 - swing, 4, 4, '#cc8459');
      }
      const stride = run ? [0, 2, 4, 1, -2, -4][f - 1] : 0;
      rect(c, 7 - stride, 30, 5, 4, ink);
      rect(c, 8 - stride, 30, 3, 3, '#d9bf94');
      rect(c, 14 + stride, 30, 5, 4, ink);
      rect(c, 15 + stride, 30, 3, 3, '#b69e7c');
      rect(c, 5 - stride, 33, 8, 3, ink);
      rect(c, 13 + stride, 33, 8, 3, ink);
      rect(c, 6 - stride, 33, 5, 1, '#83594b');
      rect(c, 15 + stride, 33, 5, 1, '#a46d4e');
      if (f === 9) {
        rect(c, 18, 10, 2, 3, '#f2b47b');
        rect(c, 18, 11, 2, 1, ink);
      }
      if (f === 8) {
        rect(c, 15, 10, 6, 2, ink);
        rect(c, 17, 8, 2, 6, ink);
      }
    });
  for (let f = 0; f < 4; f++)
    texture(scene, 'cat' + f, 28, 24, (c) => {
      const dy = f % 2;
      rect(c, 5, 10 + dy, 18, 10, ink);
      rect(c, 6, 11 + dy, 16, 7, '#ad7357');
      rect(c, 8, 9 + dy, 13, 8, '#cf976c');
      poly(
        c,
        [
          [7, 10 + dy],
          [6, 1 + dy],
          [13, 7 + dy],
        ],
        ink,
      );
      poly(
        c,
        [
          [17, 7 + dy],
          [24, 1 + dy],
          [23, 12 + dy],
        ],
        ink,
      );
      poly(
        c,
        [
          [8, 9 + dy],
          [8, 5 + dy],
          [11, 8 + dy],
        ],
        '#d29177',
      );
      poly(
        c,
        [
          [19, 8 + dy],
          [22, 5 + dy],
          [21, 10 + dy],
        ],
        '#d29177',
      );
      rect(c, 8, 10 + dy, 5, 3, '#f9d47f');
      rect(c, 18, 10 + dy, 5, 3, '#f9d47f');
      rect(c, 11, 10 + dy, 2, 3, ink);
      rect(c, 18, 10 + dy, 2, 3, ink);
      rect(c, 14, 14 + dy, 3, 2, '#71464a');
      rect(c, 6 + (f % 2) * 3, 20, 5, 3, ink);
      rect(c, 18 - (f % 2) * 3, 20, 5, 3, ink);
      rect(c, 2, 9 + dy, 4, 8, '#8b5b4e');
      rect(c, 0, 5 + dy, 3, 7, ink);
    });
  for (let f = 0; f < 4; f++)
    texture(scene, 'basket' + f, 26, 24, (c) => {
      ellipse(c, 13, 13, 12, 10, ink);
      ellipse(c, 13, 12, 10, 8, '#b47b4b');
      ellipse(c, 13, 11, 9, 7, '#e1af65');
      for (let y = 6; y < 19; y += 4) rect(c, 5, y, 16, 1, '#815b47');
      for (let x = 7; x < 22; x += 5) rect(c, x, 5 + (f % 2), 1, 14, '#f1c775');
      rect(c, 5, 2, 16, 4, ink);
      rect(c, 6, 2, 14, 2, '#eac87b');
      rect(c, 7, 20, 5, 3, ink);
      rect(c, 17, 20, 5, 3, ink);
      rect(c, 8, 9, 3, 3, ink);
      rect(c, 16, 9, 3, 3, ink);
    });
  for (let f = 0; f < 4; f++)
    texture(scene, 'bug' + f, 26, 20, (c) => {
      for (let x = 4; x < 24; x += 7) {
        line(c, x, 12, x - 3, 18 - (f % 2) * 2, ink, 2);
        line(c, x, 9, x - 3, 4 + (f % 2) * 2, ink, 2);
      }
      ellipse(c, 14, 11, 10, 7, ink);
      ellipse(c, 14, 10, 8, 5, '#8d5f64');
      ellipse(c, 13, 9, 5, 3, '#bf8377');
      rect(c, 14, 6, 1, 10, '#5d485a');
      rect(c, 4, 8, 5, 5, '#d4a25f');
      rect(c, 4, 9, 2, 2, ink);
      line(c, 5, 8, 0, 2, ink);
    });
  for (let f = 0; f < 6; f++)
    texture(scene, 'coin' + f, 16, 20, (c) => {
      const w = [6, 10, 14, 10, 6, 3][f];
      rect(c, 8 - w / 2, 1, w, 18, '#7e533e');
      rect(c, 9 - w / 2, 2, w - 2, 15, '#e6a941');
      rect(c, 10 - w / 2, 3, Math.max(1, w - 4), 12, '#ffdb7a');
      rect(c, 7, 5, 2, 8, '#d59a3b');
      rect(c, 8 - w / 2, 4, 1, 9, '#fff0b2');
    });
  for (const key of ['brick', 'box', 'used', 'ground', 'metro', 'platform'])
    texture(scene, key, 24, 24, (c) => {
      if (key === 'ground' || key === 'metro') {
        rect(c, 0, 0, 24, 24, key === 'ground' ? '#806055' : '#344957');
        rect(c, 0, 0, 24, 4, key === 'ground' ? '#dba87c' : '#aebfb4');
        rect(c, 0, 4, 24, 2, '#3b3c47');
        rect(c, 0, 7, 24, 1, '#a6775e');
        for (let i = 0; i < 4; i++) {
          rect(
            c,
            (i * 11) % 21,
            10 + i * 3,
            3,
            2,
            key === 'ground' ? '#a47a60' : '#566772',
          );
        }
        rect(c, 23, 6, 1, 18, '#473e43');
        return;
      }
      rect(c, 0, 0, 24, 24, ink);
      rect(
        c,
        1,
        1,
        22,
        21,
        key === 'box'
          ? '#f1b94c'
          : key === 'used'
            ? '#7a6a58'
            : key === 'platform'
              ? '#568782'
              : '#ac6955',
      );
      rect(c, 2, 2, 20, 2, key === 'box' ? '#ffe298' : '#df9b70');
      rect(c, 2, 3, 2, 18, key === 'box' ? '#fbd577' : '#c68462');
      rect(c, 2, 20, 20, 2, key === 'box' ? '#bc8038' : '#775349');
      rect(c, 21, 4, 1, 16, '#694c45');
      if (key === 'box') {
        poly(
          c,
          [
            [12, 4],
            [19, 11],
            [12, 18],
            [5, 11],
          ],
          '#875a3c',
        );
        poly(
          c,
          [
            [12, 6],
            [17, 11],
            [12, 16],
            [7, 11],
          ],
          '#fff0ab',
        );
        rect(c, 11, 9, 3, 5, '#d29639');
        for (const [x, y] of [
          [4, 4],
          [18, 4],
          [4, 17],
          [18, 17],
        ])
          rect(c, x, y, 2, 2, '#855c38');
      } else if (key === 'brick') {
        rect(c, 1, 10, 22, 2, '#5c4243');
        rect(c, 10, 1, 2, 9, '#5c4243');
        rect(c, 5, 12, 2, 10, '#5c4243');
        rect(c, 17, 12, 2, 10, '#5c4243');
      } else if (key === 'platform') {
        rect(c, 2, 6, 20, 2, '#2f5a65');
        rect(c, 10, 8, 4, 14, '#355963');
      } else {
        rect(c, 6, 6, 12, 10, '#8d7a5d');
        rect(c, 7, 7, 10, 1, '#b8a27b');
      }
    });
  texture(scene, 'food', 24, 20, (c) => {
    ellipse(c, 12, 10, 11, 8, ink);
    ellipse(c, 12, 9, 10, 7, '#d7984b');
    ellipse(c, 11, 7, 9, 5, '#f8ce7a');
    rect(c, 2, 10, 20, 4, '#624736');
    rect(c, 4, 10, 16, 2, '#9f7337');
    for (let i = 0; i < 5; i++) rect(c, 4 + i * 3, 11, 2, 2, '#5b924b');
    rect(c, 5, 6, 3, 1, '#fff0b1');
    rect(c, 13, 5, 3, 1, '#fff0b1');
  });
  texture(scene, 'chili', 24, 24, (c) => {
    poly(
      c,
      [
        [5, 6],
        [18, 4],
        [20, 10],
        [15, 17],
        [5, 22],
        [8, 17],
        [10, 10],
      ],
      ink,
    );
    poly(
      c,
      [
        [7, 7],
        [17, 6],
        [18, 10],
        [14, 16],
        [8, 19],
        [11, 12],
      ],
      '#ed7948',
    );
    rect(c, 12, 7, 4, 3, '#ffbe69');
    rect(c, 16, 1, 3, 6, '#69aa74');
    rect(c, 13, 1, 4, 2, '#95bf77');
  });
  texture(scene, 'invincible', 24, 24, (c) => {
    poly(
      c,
      [
        [12, 0],
        [18, 5],
        [22, 13],
        [17, 22],
        [7, 22],
        [2, 13],
        [6, 5],
      ],
      ink,
    );
    poly(
      c,
      [
        [12, 2],
        [17, 7],
        [20, 13],
        [15, 20],
        [9, 20],
        [4, 13],
        [8, 7],
      ],
      '#77d0be',
    );
    poly(
      c,
      [
        [12, 5],
        [16, 11],
        [12, 18],
        [8, 11],
      ],
      '#e4ffe0',
    );
    rect(c, 10, 1, 4, 2, gold);
  });
  texture(scene, 'fire', 12, 12, (c) => {
    poly(
      c,
      [
        [5, 0],
        [11, 4],
        [10, 10],
        [3, 12],
        [0, 7],
      ],
      '#e47245',
    );
    rect(c, 3, 3, 6, 6, '#ffd278');
    rect(c, 5, 3, 3, 4, '#fff1bd');
  });
  texture(scene, 'particle', 4, 4, (c) => rect(c, 0, 0, 4, 4, '#ffffff'));
  texture(scene, 'tank', 48, 60, (c) => {
    rect(c, 5, 5, 38, 55, ink);
    rect(c, 8, 6, 32, 54, '#387a77');
    rect(c, 9, 8, 8, 50, '#59a297');
    rect(c, 37, 8, 3, 50, '#25535d');
    for (let y = 12; y < 60; y += 12) {
      rect(c, 8, y, 32, 2, '#2d666c');
      rect(c, 9, y + 2, 29, 1, '#78b3a0');
    }
    rect(c, 0, 0, 48, 9, ink);
    rect(c, 2, 1, 44, 5, '#6bb1a0');
    rect(c, 2, 1, 44, 2, '#a4ceac');
    rect(c, 18, 14, 13, 12, '#294c53');
    rect(c, 20, 16, 9, 2, gold);
    rect(c, 24, 18, 2, 6, gold);
  });
  texture(scene, 'checkpoint', 36, 64, (c) => {
    rect(c, 17, 2, 3, 62, ink);
    rect(c, 18, 3, 1, 60, '#e6b571');
    line(c, 19, 7, 32, 7, ink, 2);
    lantern(c, 29, 10);
    rect(c, 9, 61, 19, 3, '#98735c');
  });
  texture(scene, 'goal', 72, 172, (c) => {
    rect(c, 27, 5, 5, 167, ink);
    rect(c, 28, 6, 2, 165, '#c29c6b');
    rect(c, 24, 167, 12, 5, ink);
    rect(c, 20, 170, 21, 2, '#dfbd83');
    line(c, 30, 10, 58, 10, ink, 3);
    lantern(c, 55, 18);
    rect(c, 33, 43, 34, 21, '#b9684c');
    rect(c, 34, 44, 32, 5, '#d99d66');
    rect(c, 34, 51, 32, 5, cream);
    rect(c, 34, 58, 32, 5, '#527d6c');
    rect(c, 34, 64, 29, 3, ink);
    poly(
      c,
      [
        [35, 44],
        [45, 54],
        [35, 63],
      ],
      '#f2be68',
    );
  });
  // Three authored repeating parallax layers, each 960 logical pixels wide.
  for (const underground of [false, true]) {
    const suffix = underground ? '1' : '0';
    texture(scene, 'sky' + suffix, 960, 360, (c) => {
      const colors = underground
        ? ['#26354b', '#2b3f52', '#354c5b', '#3b5962']
        : ['#e8ad85', '#efbd8b', '#f5cf9c', '#f8d9ab'];
      for (let y = 0; y < 360; y++)
        rect(c, 0, y, 960, 1, colors[Math.min(3, Math.floor(y / 90))]);
      if (!underground) {
        ellipse(c, 728, 84, 32, 32, '#ffe5ae');
        ellipse(c, 728, 84, 25, 25, '#fff0c1');
        for (let i = 0; i < 10; i++) {
          const x = (i * 193) % 960,
            y = 46 + ((i * 37) % 100);
          rect(c, x, y, 55, 3, '#f7d0a0');
          rect(c, x + 10, y - 3, 22, 3, '#f7d0a0');
        }
        for (let i = 0; i < 9; i++)
          line(
            c,
            40 + i * 111,
            70 + (i % 3) * 9,
            45 + i * 111,
            67 + (i % 3) * 9,
            '#b98478',
          );
      } else {
        for (let i = 0; i < 17; i++) {
          rect(c, i * 60, 55, 4, 250, '#263b4d');
          rect(c, i * 60 + 3, 57, 51, 3, '#527079');
        }
        for (let i = 0; i < 8; i++) {
          const x = i * 128;
          rect(c, x, 100, 90, 200, '#1e3043');
          ellipse(c, x + 45, 100, 45, 50, '#1e3043');
          rect(c, x + 7, 114, 76, 185, '#2b4151');
        }
        rect(c, 0, 304, 960, 3, '#a38562');
      }
    });
    texture(scene, 'far' + suffix, 960, 360, (c) => {
      if (underground) {
        for (let x = 0; x < 960; x += 180) {
          rect(c, x + 12, 195, 120, 76, '#405d68');
          rect(c, x + 16, 199, 112, 36, '#719392');
          for (let j = 0; j < 4; j++)
            rect(c, x + 21 + j * 27, 203, 22, 26, '#354f60');
          rect(c, x + 20, 243, 105, 3, '#b8976a');
          rect(c, x + 20, 251, 105, 2, '#2a4255');
          rect(c, x + 14, 272, 116, 8, '#263a4a');
        }
        return;
      }
      for (let x = 0; x < 960; x += 40) {
        const h = 45 + ((x * 7) % 64);
        rect(c, x, 274 - h, 42, h, '#b58e80');
        rect(c, x + 5, 270 - h, 32, 5, '#c29a86');
        for (let y = 280 - h; y < 270; y += 12)
          for (let xx = x + 7; xx < x + 35; xx += 11)
            rect(c, xx, y, 4, 6, '#a88077');
      }
      for (const x of [100, 610, 850]) {
        rect(c, x, 156, 12, 107, '#af8b7e');
        rect(c, x - 4, 181, 20, 5, '#ccaa8e');
        rect(c, x - 2, 153, 16, 5, '#cea58a');
        poly(
          c,
          [
            [x, 153],
            [x + 6, 134],
            [x + 12, 153],
          ],
          '#b88e7b',
        );
        rect(c, x + 5, 128, 2, 10, '#926f70');
        ellipse(c, x + 24, 237, 22, 17, '#b28e7f');
        rect(c, x + 2, 237, 44, 28, '#b28e7f');
      }
      poly(
        c,
        [
          [460, 266],
          [500, 225],
          [540, 266],
        ],
        '#c4a18b',
      );
      poly(
        c,
        [
          [520, 266],
          [550, 236],
          [581, 266],
        ],
        '#b99a88',
      );
      rect(c, 0, 270, 960, 20, '#c4a38a');
      rect(c, 0, 280, 960, 10, '#8baaa0');
      rect(c, 0, 282, 960, 2, '#b9c3a3');
    });
    texture(scene, 'houses' + suffix, 960, 360, (c) => {
      if (underground) {
        for (let x = 0; x < 960; x += 120) {
          rect(c, x, 91, 18, 221, '#304f5a');
          rect(c, x + 2, 93, 5, 215, '#63817e');
          rect(c, x - 5, 89, 28, 9, '#a89979');
          rect(c, x - 5, 302, 28, 10, '#7d8677');
          rect(c, x + 20, 274, 94, 36, '#756754');
          rect(c, x + 23, 279, 89, 4, '#b7a381');
          for (let j = 0; j < 4; j++)
            rect(c, x + 28 + j * 22, 286, 16, 17, '#423f44');
          line(c, x + 18, 83, x + 113, 83, '#a38961', 2);
          lantern(c, x + 65, 92);
          rect(c, x + 30, 168, 69, 39, '#243e4b');
          rect(c, x + 33, 171, 63, 33, '#52817b');
          c.font = 'bold 13px Tahoma';
          c.fillStyle = cream;
          c.textAlign = 'center';
          c.fillText(x % 240 === 0 ? 'تحت البلد' : 'سوق البلد', x + 65, 191);
        }
        return;
      }
      house(c, 0, 103, 164, '#d4a37c', 1);
      house(c, 109, 115, 219, '#c99676', 2);
      house(c, 231, 103, 184, '#dfb487', 3);
      house(c, 347, 129, 238, '#c98e71', 4);
      house(c, 484, 108, 179, '#d7a17a', 5);
      house(c, 604, 101, 213, '#d6aa86', 6);
      house(c, 718, 131, 173, '#bb8c75', 7);
      house(c, 858, 102, 229, '#d3a17b', 8);
      // shopfronts, striped awnings, hanging laundry
      for (const [x, w] of [
        [110, 110],
        [350, 120],
        [720, 124],
      ]) {
        rect(c, x + 4, 261, w - 8, 48, '#4a5f5e');
        rect(c, x + 8, 265, w - 16, 8, '#d6b37e');
        for (let j = 0; j < w; j += 14) {
          poly(
            c,
            [
              [x + j, 253],
              [x + j + 14, 253],
              [x + j + 19, 267],
              [x + j + 4, 267],
            ],
            j % 28 === 0 ? '#b35743' : '#efd0a0',
          );
          rect(c, x + j + 4, 267, 14, 4, j % 28 === 0 ? '#974a3e' : '#d7ad7d');
        }
        rect(c, x + 17, 280, 34, 28, '#273e49');
        rect(c, x + 62, 280, 34, 28, '#283f48');
        for (let j = 0; j < 4; j++)
          rect(
            c,
            x + 65 + j * 7,
            287,
            5,
            16,
            ['#c69d5e', '#b86f4c', '#dfa873', '#609782'][j],
          );
      }
      for (const [x, y] of [
        [40, 162],
        [240, 148],
        [580, 125],
        [780, 163],
      ]) {
        line(c, x, y, x + 100, y + 8, '#544b4c');
        for (let i = 0; i < 4; i++) {
          const xx = x + 14 + i * 21,
            yy = y + i * 2;
          poly(
            c,
            [
              [xx, yy],
              [xx + 15, yy + 1],
              [xx + 13, yy + 23],
              [xx + 2, yy + 22],
            ],
            ['#56948e', '#d4bd8c', '#b75e4d', '#737c86'][i],
          );
          rect(c, xx + 2, yy, 2, 3, '#4a4345');
        }
      }
      palm(c, 329, 310, 1.22);
      palm(c, 711, 310, 1.05);
      for (const x of [55, 292, 552, 905]) {
        rect(c, x, 234, 3, 78, '#3e4749');
        line(c, x + 1, 236, x + 13, 230, '#3e4749', 2);
        lantern(c, x + 13, 233);
      }
    });
  }
  texture(scene, 'cart', 84, 64, (c) => {
    rect(c, 10, 30, 62, 25, ink);
    rect(c, 12, 32, 58, 21, '#97634f');
    rect(c, 14, 34, 54, 3, '#daaa72');
    for (let i = 0; i < 5; i++) rect(c, 17 + i * 11, 40, 8, 10, '#b87f58');
    ellipse(c, 22, 57, 7, 7, ink);
    ellipse(c, 62, 57, 7, 7, ink);
    ellipse(c, 22, 57, 3, 3, '#ac9c79');
    ellipse(c, 62, 57, 3, 3, '#ac9c79');
    rect(c, 7, 28, 68, 4, '#e5c590');
    rect(c, 16, 13, 3, 17, ink);
    rect(c, 66, 13, 3, 17, ink);
    poly(
      c,
      [
        [6, 14],
        [17, 3],
        [67, 3],
        [78, 14],
      ],
      '#548e87',
    );
    for (let i = 0; i < 5; i++) rect(c, 15 + i * 11, 4, 5, 9, '#d9be87');
    rect(c, 29, 16, 20, 13, '#c5a36f');
    ellipse(c, 39, 16, 10, 3, '#edcf94');
    rect(c, 27, 19, 3, 7, '#8b724f');
    rect(c, 53, 22, 8, 7, '#e4bc7d');
    c.font = 'bold 9px Tahoma';
    c.fillStyle = ink;
    c.textAlign = 'center';
    c.fillText('فول', 42, 48);
  });
  texture(scene, 'crate', 32, 30, (c) => {
    rect(c, 0, 0, 32, 30, ink);
    rect(c, 2, 2, 28, 25, '#aa7c55');
    for (let y = 4; y < 27; y += 7) rect(c, 3, y, 26, 1, '#e1af70');
    rect(c, 3, 2, 3, 25, '#d6a467');
    rect(c, 26, 2, 3, 25, '#684e42');
    line(c, 6, 5, 26, 24, '#694b3e', 3);
    line(c, 6, 24, 26, 5, '#dbab70', 3);
  });
  texture(scene, 'flowers', 28, 32, (c) => {
    poly(
      c,
      [
        [4, 18],
        [24, 18],
        [21, 32],
        [7, 32],
      ],
      ink,
    );
    poly(
      c,
      [
        [6, 20],
        [22, 20],
        [19, 29],
        [9, 29],
      ],
      '#b26b4e',
    );
    rect(c, 4, 18, 20, 3, '#db9362');
    for (let i = 0; i < 5; i++) {
      line(c, 14, 20, 5 + i * 5, 6 + (i % 2) * 5, '#4e8264', 2);
      rect(
        c,
        3 + i * 5,
        4 + (i % 2) * 5,
        5,
        5,
        ['#e8ad69', '#b95d54', '#eee0ad'][i % 3],
      );
    }
  });
}
