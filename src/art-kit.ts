// Shared canvas drawing helpers for the code-drawn art modules.
import Phaser from 'phaser';

type C = CanvasRenderingContext2D;
export const hash = (a: number, b: number, s = 0) => {
  let h = (a * 374761393 + b * 668265263 + s * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
export function rect(
  c: C,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
) {
  c.fillStyle = color;
  c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}
export function poly(c: C, pts: number[][], color: string) {
  c.fillStyle = color;
  c.beginPath();
  pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.closePath();
  c.fill();
}
export function disc(
  c: C,
  x: number,
  y: number,
  r: number,
  color: string,
  start = 0,
  end = Math.PI * 2,
) {
  c.fillStyle = color;
  c.beginPath();
  c.moveTo(x, y);
  c.arc(x, y, r, start, end);
  c.closePath();
  c.fill();
}
export function grad(c: C, y0: number, y1: number, stops: [number, string][]) {
  const g = c.createLinearGradient(0, y0, 0, y1);
  for (const [o, col] of stops) g.addColorStop(o, col);
  return g;
}
export function tex(
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
  return t;
}

export interface Palette {
  sky: [number, string][];
  stone: string[];
  mortar: string;
  top: string[];
  wood: string[];
  accent: string;
  glow: string;
  window: string;
  windowLit: string;
  fog: string;
}
