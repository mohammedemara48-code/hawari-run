// Per-world element skins: bricks, gold boxes, spent blocks and collectibles
// redrawn in each level's painted palette (original pixel art, drawn in code).
// Textures are named `${theme}-${key}`; skin() falls back to the shared art.
import Phaser from 'phaser';

type C = CanvasRenderingContext2D;
const INK = '#1d1416';
function rect(c: C, x: number, y: number, w: number, h: number, color: string) {
  c.fillStyle = color;
  c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}
function poly(c: C, pts: number[][], color: string) {
  c.fillStyle = color;
  c.beginPath();
  pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.closePath();
  c.fill();
}
function tex(
  scene: Phaser.Scene,
  key: string,
  w: number,
  h: number,
  paint: (c: C) => void,
) {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const t = scene.textures.createCanvas(key, w, h)!;
  t.context.imageSmoothingEnabled = false;
  paint(t.context);
  t.refresh();
}

export type Emblem = 'lamp' | 'star' | 'diamond' | 'gear' | 'pot' | 'crate';
export type Collectible = 'coin' | 'wheat' | 'mishabek' | 'fish';
export interface Skin {
  /** Brick: face, highlight, shadow, mortar. */
  brick: [string, string, string, string];
  /** Mystery box: face, highlight, shadow, emblem dark, emblem light, rivet. */
  box: [string, string, string, string, string, string];
  emblem: Emblem;
  /** Spent block: face, highlight, shadow. */
  used: [string, string, string];
  /** Collectible: outline, body, light, shine. */
  coin: [string, string, string, string];
  collectible: Collectible;
  /** Brick pattern: running bond or mud-brick courses with straw flecks. */
  bond: 'running' | 'mud' | 'block' | 'plank';
}

export const SKINS: Record<string, Skin> = {
  // Navy stone lit by amber lanterns.
  night: {
    brick: ['#3c3858', '#5d5880', '#26233c', '#1a1830'],
    box: ['#e8a73e', '#ffd88a', '#a8662a', '#5a3418', '#fff1b8', '#3a2414'],
    emblem: 'lamp',
    used: ['#2e2b40', '#45405e', '#1a1828'],
    coin: ['#4a2a18', '#e89a34', '#ffd27a', '#fff4c8'],
    collectible: 'coin',
    bond: 'running',
  },
  // Warm Khan sandstone, gold light, striped cloth.
  market: {
    brick: ['#9a6a42', '#c8945e', '#6a4428', '#4a2e1a'],
    box: ['#d9a23a', '#ffe08a', '#9a5e22', '#8a2a2a', '#fff0c0', '#4a2a14'],
    emblem: 'star',
    used: ['#5a4030', '#7a5a42', '#3a2818'],
    coin: ['#5a3010', '#f0b43c', '#ffe08a', '#fffbe0'],
    collectible: 'coin',
    bond: 'running',
  },
  // Red rooftop brick under a blue sky.
  roof: {
    brick: ['#a4553a', '#d07a56', '#6e3424', '#e8d6bc'],
    box: ['#f2c04e', '#fff0a8', '#b47a2a', '#2f5f8a', '#e8f4ff', '#3a4a5a'],
    emblem: 'diamond',
    used: ['#7a6a5c', '#9a8a7a', '#4a4038'],
    coin: ['#5a3a18', '#f2bf3c', '#ffe48a', '#ffffff'],
    collectible: 'coin',
    bond: 'running',
  },
  // Mossy tunnel stone, teal water, amber lamps.
  sewer: {
    brick: ['#3c4a44', '#5a6e62', '#232c28', '#16201d'],
    box: ['#c89a3a', '#f0cc72', '#7a5a22', '#1f5a52', '#bff0e0', '#2a3430'],
    emblem: 'gear',
    used: ['#2a3430', '#3e4c46', '#161e1b'],
    coin: ['#3a2a14', '#e0a03a', '#ffd07a', '#e8fff4'],
    collectible: 'coin',
    bond: 'block',
  },
  // Countryside: mud brick, terracotta pots, golden wheat.
  farm: {
    brick: ['#8a5e3a', '#b0804e', '#5e3c22', '#4a2e18'],
    box: ['#c8683a', '#f0a070', '#8a3e1e', '#5a2a12', '#ffe0b0', '#3a2010'],
    emblem: 'pot',
    used: ['#6a5040', '#8a6e58', '#43322a'],
    coin: ['#5a3a10', '#e0b040', '#ffe27a', '#fff8d0'],
    collectible: 'wheat',
    bond: 'mud',
  },
  // Damietta workshops: carved walnut, furniture crates, مشبك sweets.
  workshop: {
    brick: ['#7a4a2a', '#a8703e', '#4e2e18', '#2e1a0e'],
    box: ['#c8904e', '#f0c07a', '#7a4e26', '#4e2e14', '#ffe0a0', '#d8d0c0'],
    emblem: 'crate',
    used: ['#6a4a34', '#8a6a4e', '#422c1e'],
    coin: ['#6a2a08', '#e87a1a', '#ffb84a', '#fff0b0'],
    collectible: 'mishabek',
    bond: 'plank',
  },
  // The harbour: weathered boat timber, fish crates, silver fish.
  harbor: {
    brick: ['#5a6a72', '#7e9098', '#3a464e', '#26303a'],
    box: ['#4a8ab0', '#8ac8e8', '#2a5a7a', '#1a3a52', '#e8f4ff', '#f0d080'],
    emblem: 'crate',
    used: ['#4e5a60', '#6e7c84', '#323c42'],
    coin: ['#1a2a3a', '#9ab8cc', '#e0f0fa', '#ffffff'],
    collectible: 'fish',
    bond: 'plank',
  },
};

function emblem(
  c: C,
  kind: Emblem,
  dark: string,
  light: string,
  accent: string,
) {
  if (kind === 'lamp') {
    // A little fanoos.
    rect(c, 11, 4, 2, 2, dark);
    poly(
      c,
      [
        [7, 7],
        [17, 7],
        [18, 13],
        [15, 18],
        [9, 18],
        [6, 13],
      ],
      dark,
    );
    poly(
      c,
      [
        [9, 8],
        [15, 8],
        [16, 13],
        [14, 16],
        [10, 16],
        [8, 13],
      ],
      light,
    );
    rect(c, 11, 9, 2, 6, accent);
    rect(c, 9, 18, 6, 2, dark);
  } else if (kind === 'star') {
    // Eight-pointed Islamic star.
    poly(
      c,
      [
        [12, 3],
        [14, 9],
        [20, 11],
        [14, 13],
        [12, 19],
        [10, 13],
        [4, 11],
        [10, 9],
      ],
      dark,
    );
    rect(c, 7, 6, 10, 10, dark);
    rect(c, 9, 8, 6, 6, light);
    rect(c, 11, 10, 2, 2, accent);
  } else if (kind === 'diamond') {
    poly(
      c,
      [
        [12, 4],
        [19, 11],
        [12, 18],
        [5, 11],
      ],
      dark,
    );
    poly(
      c,
      [
        [12, 6],
        [17, 11],
        [12, 16],
        [7, 11],
      ],
      light,
    );
    rect(c, 11, 9, 3, 5, accent);
  } else if (kind === 'gear') {
    // Valve wheel.
    for (const [x, y] of [
      [11, 4],
      [11, 16],
      [4, 10],
      [18, 10],
      [6, 5],
      [16, 5],
      [6, 15],
      [16, 15],
    ])
      rect(c, x, y, 3, 3, dark);
    rect(c, 7, 7, 10, 9, dark);
    rect(c, 9, 9, 6, 5, light);
    rect(c, 11, 10, 2, 3, accent);
  } else if (kind === 'crate') {
    // Slatted furniture crate stencilled with an eight-point star.
    for (const y of [6, 11, 16]) rect(c, 5, y, 14, 1, dark);
    rect(c, 5, 5, 1, 13, dark);
    rect(c, 18, 5, 1, 13, dark);
    for (const [x, y, w, h] of [
      [10, 6, 4, 12],
      [6, 10, 12, 4],
      [8, 8, 8, 8],
    ])
      rect(c, x, y, w, h, light);
    rect(c, 11, 11, 2, 2, accent);
    rect(c, 7, 9, 1, 1, dark);
    rect(c, 16, 14, 1, 1, dark);
  } else {
    // Clay qulla water pot.
    rect(c, 10, 3, 4, 2, dark);
    rect(c, 9, 5, 6, 2, dark);
    poly(
      c,
      [
        [8, 7],
        [16, 7],
        [19, 12],
        [16, 19],
        [8, 19],
        [5, 12],
      ],
      dark,
    );
    poly(
      c,
      [
        [9, 8],
        [15, 8],
        [17, 12],
        [15, 17],
        [9, 17],
        [7, 12],
      ],
      light,
    );
    rect(c, 8, 12, 9, 1, accent);
    rect(c, 10, 9, 2, 6, '#ffffff66');
  }
}

export function makeSkins(scene: Phaser.Scene) {
  // The countryside power-up: a bunch of fresh dates (بلح) instead of foul.
  if (!scene.textures.exists('farm-food'))
    tex(scene, 'farm-food', 24, 20, (c) => {
      rect(c, 11, 0, 2, 6, '#5a7a2a');
      rect(c, 6, 2, 12, 2, '#7a9a3a');
      const dates: [number, number][] = [
        [5, 6],
        [10, 5],
        [15, 6],
        [3, 10],
        [8, 10],
        [13, 10],
        [18, 10],
        [6, 14],
        [11, 14],
        [16, 14],
        [9, 17],
      ];
      for (const [x, y] of dates) {
        rect(c, x, y, 5, 5, INK);
        rect(c, x + 1, y, 3, 4, '#b8401e');
        rect(c, x + 1, y + 1, 1, 2, '#f08a4a');
      }
    });
  // Damietta power-ups: a Damietta-cheese sandwich and a grilled fish.
  if (!scene.textures.exists('workshop-food')) {
    tex(scene, 'workshop-food', 24, 20, (c) => {
      rect(c, 1, 5, 22, 12, INK);
      rect(c, 2, 6, 20, 10, '#d8a050');
      rect(c, 2, 6, 20, 2, '#f0c878');
      rect(c, 3, 10, 18, 3, '#fff8e8');
      for (const x of [5, 10, 15]) rect(c, x, 11, 2, 1, '#e8e0c8');
      rect(c, 2, 14, 20, 2, '#a86a2a');
    });
    tex(scene, 'harbor-food', 24, 20, (c) => {
      rect(c, 0, 14, 24, 5, INK);
      rect(c, 1, 15, 22, 3, '#e8e4dc');
      rect(c, 3, 6, 16, 9, INK);
      rect(c, 4, 7, 14, 7, '#c87a3a');
      rect(c, 4, 7, 14, 2, '#e8a060');
      for (const x of [7, 11, 15]) rect(c, x, 8, 1, 5, '#6a3a1a');
      rect(c, 18, 5, 5, 11, INK);
      rect(c, 19, 6, 3, 9, '#c87a3a');
      rect(c, 6, 9, 2, 2, '#14100e');
      rect(c, 2, 12, 3, 2, '#f0e060');
    });
  }
  for (const [theme, s] of Object.entries(SKINS)) {
    if (scene.textures.exists(`${theme}-box`)) continue;
    const [bf, bl, bs, bm] = s.brick;
    tex(scene, `${theme}-brick`, 24, 24, (c) => {
      rect(c, 0, 0, 24, 24, INK);
      rect(c, 1, 1, 22, 22, bm);
      const courses =
        s.bond === 'mud'
          ? [
              [1, 7],
              [9, 6],
              [16, 7],
            ]
          : s.bond === 'block'
            ? [
                [1, 10],
                [12, 10],
              ]
            : [
                [1, 10],
                [12, 10],
              ];
      courses.forEach(([y, h], i) => {
        const off = i % 2 ? (s.bond === 'mud' ? 6 : 6) : 0;
        const w = s.bond === 'block' ? 22 : s.bond === 'mud' ? 10 : 10;
        for (let x = 1 - off; x < 23; x += w + 1) {
          const x0 = Math.max(1, x),
            x1 = Math.min(23, x + w);
          if (x1 - x0 < 2) continue;
          rect(c, x0, y, x1 - x0, h, bf);
          rect(c, x0, y, x1 - x0, 1, bl);
          rect(c, x0, y + h - 1, x1 - x0, 1, bs);
          if (s.bond === 'mud') {
            // Straw flecks in sun-dried brick.
            rect(c, x0 + 2, y + 2, 2, 1, '#d8b070');
            rect(c, x0 + 6, y + 4, 1, 1, '#d8b070');
          }
        }
      });
      if (s.bond === 'plank') {
        // Carved boards: vertical grain and a peg.
        for (let x = 4; x < 22; x += 6) rect(c, x, 2, 1, 20, bs);
        rect(c, 11, 5, 2, 2, bl);
      }
      if (s.bond === 'block') {
        // Moss in the joint.
        rect(c, 3, 11, 5, 1, '#4f8a54');
        rect(c, 15, 22, 4, 1, '#4f8a54');
      }
    });
    const [f, l, sh, ed, el, rv] = s.box;
    for (const shine of [false, true])
      tex(scene, `${theme}-box${shine ? '1' : ''}`, 24, 24, (c) => {
        rect(c, 0, 0, 24, 24, INK);
        rect(c, 1, 1, 22, 21, f);
        rect(c, 2, 2, 20, 2, l);
        rect(c, 2, 3, 2, 18, l);
        rect(c, 2, 20, 20, 2, sh);
        rect(c, 21, 4, 1, 16, sh);
        if (s.emblem === 'star') {
          // Striped cloth band like the Khan awnings.
          for (let x = 2; x < 22; x += 4)
            rect(c, x, 19, 2, 2, x % 8 ? '#2f4f8a' : '#c83a3a');
        }
        emblem(c, s.emblem, ed, el, sh);
        for (const [x, y] of [
          [4, 4],
          [18, 4],
          [4, 17],
          [18, 17],
        ])
          rect(c, x, y, 2, 2, rv);
        if (shine) {
          rect(c, 5, 5, 2, 2, '#ffffff');
          rect(c, 7, 7, 2, 2, '#fff7d6');
          rect(c, 13, 6, 2, 3, '#ffffff');
        }
      });
    const [uf, ul, us] = s.used;
    tex(scene, `${theme}-used`, 24, 24, (c) => {
      rect(c, 0, 0, 24, 24, INK);
      rect(c, 1, 1, 22, 21, uf);
      rect(c, 2, 2, 20, 2, ul);
      rect(c, 2, 20, 20, 2, us);
      rect(c, 6, 7, 12, 10, us);
      rect(c, 7, 8, 10, 1, ul);
      if (s.emblem === 'pot') {
        // A cracked, emptied pot.
        rect(c, 11, 8, 1, 4, uf);
        rect(c, 12, 11, 2, 1, uf);
      }
      for (const [x, y] of [
        [4, 4],
        [18, 4],
        [4, 17],
        [18, 17],
      ])
        rect(c, x, y, 2, 2, us);
    });
    const [co, cb, cl, cs] = s.coin;
    for (let fr = 0; fr < 6; fr++)
      tex(scene, `${theme}-coin${fr}`, 16, 20, (c) => {
        if (s.collectible === 'wheat') {
          // A plump ear of wheat (سنبلة) that sways: two rows of kernels,
          // long awns and a leaf on the stalk.
          const sway = [0, 1, 1, 0, -1, -1][fr];
          rect(c, 7, 12, 2, 8, co);
          rect(c, 7, 12, 1, 8, '#c89a3a');
          rect(c, 3, 14, 4, 2, co);
          rect(c, 4, 14, 3, 1, '#9aa040');
          for (let i = 0; i < 5; i++) {
            const y = 3 + i * 2,
              shift = i < 2 ? sway : i < 4 ? Math.sign(sway) * 0.5 : 0;
            for (const side of [0, 1]) {
              const x = Math.round(5 + side * 4 + shift);
              if (i === 4 && side === 1) continue;
              const kx = i === 4 ? 7 + Math.round(shift) : x;
              rect(c, kx - 1, y - 1, 4, 4, co);
              rect(c, kx, y, 2, 3, cb);
              rect(c, kx, y, 1, 1, cl);
              // Awns fanning out from each kernel.
              rect(c, kx + (side ? 3 : -2), y - 2, 1, 2, cb);
            }
          }
          rect(c, 7 + sway, 0, 2, 3, co);
          rect(c, 7 + sway, 1, 1, 2, cs);
          rect(c, 5 + sway, 0, 1, 2, cb);
          rect(c, 10 + sway, 0, 1, 2, cb);
          return;
        }
        if (s.collectible === 'mishabek') {
          // مشبك: a round lattice of syrup-glazed loops (a ring, a cross
          // and four little rings), turning edge-on as it spins.
          const sq = [1, 0.75, 0.4, 0.75, 1, 1][fr];
          c.save();
          c.translate(8, 10);
          c.scale(sq, 1);
          const loop = (x: number, y: number, r: number) => {
            c.beginPath();
            c.arc(x, y, r, 0, Math.PI * 2);
            c.stroke();
          };
          for (const [w, col] of [
            [4, co],
            [2, cb],
          ] as const) {
            c.lineWidth = w;
            c.strokeStyle = col;
            loop(0, 0, 6);
            for (const [x, y] of [
              [0, -3.5],
              [0, 3.5],
              [-3.5, 0],
              [3.5, 0],
            ])
              loop(x, y, 1.6);
          }
          c.fillStyle = cl;
          c.fillRect(-4, -6, 3, 1);
          c.fillRect(2, 3, 1, 1);
          c.restore();
          // Syrup drip.
          if (fr % 3 === 0) rect(c, 8, 17, 1, 2, cb);
          return;
        }
        if (s.collectible === 'fish') {
          // A silver fish, tail flicking, turning as it spins.
          const sq = [1, 0.8, 0.45, 0.8, 1, 1][fr];
          c.save();
          c.translate(8, 10);
          c.rotate(-Math.PI / 2.6);
          c.scale(sq, 1);
          c.fillStyle = co;
          c.beginPath();
          c.ellipse(0, 0, 4.5, 8, 0, 0, Math.PI * 2);
          c.fill();
          c.beginPath();
          c.moveTo(0, 6);
          c.lineTo(-5, 11);
          c.lineTo(5, 11);
          c.fill();
          c.fillStyle = cb;
          c.beginPath();
          c.ellipse(0, 0, 3, 6.5, 0, 0, Math.PI * 2);
          c.fill();
          c.fillRect(-3, 8, 6, 2);
          c.fillStyle = cl;
          c.fillRect(-2, -5, 1, 8);
          c.fillStyle = cs;
          c.fillRect(1, -3, 1, 6);
          c.fillStyle = '#14100e';
          c.fillRect(-1, -5, 2, 2);
          c.restore();
          return;
        }
        const w = [6, 10, 14, 10, 6, 3][fr];
        rect(c, 8 - w / 2, 1, w, 18, co);
        rect(c, 9 - w / 2, 2, w - 2, 15, cb);
        rect(c, 10 - w / 2, 3, Math.max(1, w - 4), 12, cl);
        rect(c, 7, 5, 2, 8, cb);
        rect(c, 8 - w / 2, 4, 1, 9, cs);
      });
  }
}
/** Theme texture with a shared fallback. */
export function skinKey(scene: Phaser.Scene, theme: string, key: string) {
  const k = `${theme}-${key}`;
  return scene.textures.exists(k) ? k : key;
}
