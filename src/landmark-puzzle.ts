export function lightAligned(values: number[], target: number[]) {
  return (
    values.length === target.length &&
    values.every((value, i) => value === target[i])
  );
}
export function seesHero(
  guard: { x: number; y: number; angle: number; range: number },
  hero: { x: number; y: number },
  covers: { x: number; y: number; w: number; h: number }[],
) {
  const dx = hero.x - guard.x,
    dy = hero.y - guard.y;
  const diff = Math.atan2(
    Math.sin(Math.atan2(dy, dx) - guard.angle),
    Math.cos(Math.atan2(dy, dx) - guard.angle),
  );
  if (Math.hypot(dx, dy) > guard.range || Math.abs(diff) > 0.34) return false;
  for (const cover of covers)
    for (let t = 0.03; t < 1; t += 0.03) {
      const x = guard.x + dx * t,
        y = guard.y + dy * t;
      if (
        x >= cover.x &&
        x <= cover.x + cover.w &&
        y >= cover.y &&
        y <= cover.y + cover.h
      )
        return false;
    }
  return true;
}
export function balanceY(load: number, target: number) {
  return {
    left: 324 - (load - target) * 20,
    right: 276 + (load - target) * 20,
  };
}
