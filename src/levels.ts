// Shared movement constants (the scene and the reachability tests use these).
export const PHYSICS = {
  gravity: 1100,
  jump: 470,
  runJump: 485,
  step: 1 / 60,
};
/** Apex of a jump using Phaser Arcade's fixed 60 Hz integration (velocity first). */
export function apex(v0: number) {
  let v = -v0,
    y = 0,
    min = 0;
  for (let i = 0; i < 200; i++) {
    v += PHYSICS.gravity * PHYSICS.step;
    y += v * PHYSICS.step;
    min = Math.min(min, y);
  }
  return -min;
}
