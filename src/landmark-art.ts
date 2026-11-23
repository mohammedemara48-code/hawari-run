import type Phaser from 'phaser';
import { tex, rect, poly, disc, hash } from './art-kit';

/** Original sprites for fictional mechanical bosses, not depictions of monuments. */
export function makeLandmarkArt(scene: Phaser.Scene) {
  if (scene.textures.exists('landmark-platform')) return;
  tex(scene, 'landmark-platform', 72, 16, (c) => {
    rect(c, 0, 0, 72, 16, '#392b23');
    rect(c, 1, 1, 70, 4, '#f0c884');
    rect(c, 2, 5, 68, 9, '#95704a');
    for (let x = 4; x < 70; x += 12) rect(c, x, 6, 2, 8, '#59412c');
  });
  tex(scene, 'landmark-gate', 24, 24, (c) => {
    rect(c, 0, 0, 24, 24, '#352e29');
    rect(c, 2, 0, 20, 24, '#a58553');
    rect(c, 4, 0, 3, 24, '#e7c989');
    rect(c, 17, 0, 3, 24, '#e7c989');
    rect(c, 0, 7, 24, 3, '#5e4933');
    rect(c, 0, 19, 24, 3, '#5e4933');
  });
  for (const kind of ['prism', 'guardian', 'mill'])
    for (const pose of ['idle0', 'idle1', 'hurt', 'walk0', 'walk1', 'throw'])
      tex(scene, `boss-${kind}-${pose}`, 96, 96, (c) => {
        const pulse = pose.endsWith('1') ? 2 : 0;
        if (kind === 'prism') {
          for (const y of [49, 65])
            for (const dir of [-1, 1]) {
              poly(
                c,
                [
                  [48 + dir * 20, y],
                  [48 + dir * 44, y + 8],
                  [48 + dir * 38, y + 13],
                  [48 + dir * 18, y + 5],
                ],
                '#8c6b3d',
              );
            }
          disc(c, 48, 55, 28, '#242d39');
          disc(c, 48, 54, 24, '#c9a05b');
          poly(
            c,
            [
              [48, 29],
              [67, 52],
              [48, 78],
              [29, 52],
            ],
            '#245d78',
          );
          poly(
            c,
            [
              [48, 33],
              [62, 52],
              [48, 72],
            ],
            '#7ee6dc',
          );
          rect(c, 46, 30, 3, 44, '#e9ffe3');
          disc(c, 48, 24, 14, '#c19b5f');
          rect(c, 37, 20, 7, 5, '#f6e0a0');
          rect(c, 53, 20, 7, 5, '#f6e0a0');
          poly(
            c,
            [
              [37, 16],
              [30, 6],
              [39, 11],
              [43, 15],
            ],
            '#d5b779',
          );
          poly(
            c,
            [
              [59, 16],
              [66, 6],
              [57, 11],
              [53, 15],
            ],
            '#d5b779',
          );
        } else if (kind === 'guardian') {
          rect(c, 34, 37, 31, 43, '#473b32');
          rect(c, 37, 36, 26, 34, '#b18b4d');
          rect(c, 38, 71, 9, 20, '#775736');
          rect(c, 54, 71, 9, 20, '#775736');
          rect(c, 29, 87, 20, 6, '#302b28');
          rect(c, 53, 87, 20, 6, '#302b28');
          disc(c, 50, 24, 17, '#403a32');
          disc(c, 50, 23, 13, '#cba761');
          rect(c, 38, 22, 24, 7, '#242d2f');
          rect(c, 42, 24, 5, 3, '#f6dc87');
          rect(c, 55, 24, 5, 3, '#f6dc87');
          poly(
            c,
            [
              [20, 39],
              [41, 35],
              [43, 74],
              [28, 83],
              [15, 69],
            ],
            '#4b6a64',
          );
          poly(
            c,
            [
              [23, 43],
              [37, 40],
              [38, 69],
              [28, 77],
              [20, 66],
            ],
            '#d8b665',
          );
          rect(c, 70, 36, 4, 45, '#796140');
          rect(c, 66, 37, 13, 18, '#f5d173');
          rect(c, 69, 41, 7, 10, '#fff1ad');
        } else {
          const spin = pose.endsWith('1') ? 0.15 : 0;
          for (let i = 0; i < 12; i++) {
            const a = (i * Math.PI) / 6 + spin;
            disc(c, 48 + Math.cos(a) * 33, 48 + Math.sin(a) * 33, 8, '#493325');
            disc(c, 48 + Math.cos(a) * 33, 48 + Math.sin(a) * 33, 5, '#a37b48');
          }
          disc(c, 48, 48, 34, '#2d2927');
          disc(c, 48, 48, 29, '#987045');
          disc(c, 48, 48, 23, '#4d3b2a');
          for (let i = 0; i < 6; i++) {
            const a = (i * Math.PI) / 3 + spin;
            poly(
              c,
              [
                [46, 46],
                [48 + Math.cos(a) * 27, 48 + Math.sin(a) * 27],
                [51 + Math.cos(a) * 26, 51 + Math.sin(a) * 26],
                [51, 51],
              ],
              '#d4ac69',
            );
          }
          disc(c, 48, 48, 12, '#233d3d');
          disc(c, 48, 48, 7, '#83d0b8');
          rect(c, 34, 32, 8, 5, '#ffe2a1');
          rect(c, 55, 32, 8, 5, '#ffe2a1');
        }
        for (let i = 0; i < 22; i++)
          rect(
            c,
            12 + hash(i, 1) * 72,
            12 + hash(i, 2) * 72,
            1,
            1,
            '#ffffff14',
          );
        if (pulse) rect(c, 44, 45, 8, 3, '#fff5c7');
      });
}
