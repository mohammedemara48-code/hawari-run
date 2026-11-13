export const approach = (v: number, target: number, amount: number) =>
  v < target ? Math.min(v + amount, target) : Math.max(v - amount, target);
export const jumpAllowed = (sinceGround: number, sincePress: number) =>
  sinceGround < 110 && sincePress < 120;
export const stomped = (
  velocityY: number,
  previousBottom: number,
  enemyTop: number,
) => velocityY > 0 && previousBottom <= enemyTop + 9;
export const tally = (seconds: number, coins: number, enemies: number) => ({
  time: seconds * 10,
  treasure: coins * 100,
  enemies: enemies * 200,
  total: seconds * 10 + coins * 100 + enemies * 200,
});
