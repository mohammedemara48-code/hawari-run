export type Screen = 'title' | 'pause' | 'clear' | 'over' | 'win' | 'hidden';
export const touch = {
  left: false,
  right: false,
  /** Stick pushed far: run. */
  run: false,
  jump: false,
  /** Stick pushed up: a held jump input (variable height while held). */
  stickJump: false,
  /** Dedicated chili throw button. */
  throw: false,
  down: false,
  /** Analog stick vector, -1..1 (for tests and HUD feedback). */
  x: 0,
  y: 0,
};
type Flag = 'left' | 'right' | 'run' | 'jump' | 'stickJump' | 'throw' | 'down';
export const STICK = {
  radius: 46,
  deadzone: 0.24,
  run: 0.78,
  down: 0.55,
  /** Up past this triggers a jump; it stays held until the thumb drops below release. */
  up: 0.5,
  upRelease: 0.3,
};
/** Pure mapping from a stick vector to movement flags. */
export function stickFlags(x: number, y: number, jumping = false) {
  const mag = Math.hypot(x, y);
  // Up (or up-left / up-right, within ~60° of vertical) is a jump input with
  // hysteresis, so wobbling near the threshold cannot re-trigger it.
  const stickJump = jumping
    ? -y > STICK.upRelease
    : -y > STICK.up && -y > Math.abs(x) * 0.55;
  if (mag < STICK.deadzone)
    return { left: false, right: false, run: false, down: false, stickJump };
  const down = y > STICK.down && y > Math.abs(x) * 0.9;
  return {
    left: !down && x < -STICK.deadzone,
    right: !down && x > STICK.deadzone,
    run: !down && Math.abs(x) > STICK.run,
    down,
    stickJump,
  };
}
function releaseAll() {
  for (const k of [
    'left',
    'right',
    'run',
    'jump',
    'stickJump',
    'throw',
    'down',
  ] as Flag[])
    touch[k] = false;
  touch.x = touch.y = 0;
  document
    .querySelectorAll('.touch-controls .held')
    .forEach((el) => el.classList.remove('held'));
  resetStick?.();
}
let resetStick: (() => void) | undefined;
function bindStick(zone: HTMLElement) {
  const base = zone.querySelector<HTMLElement>('.stick-base')!,
    knob = zone.querySelector<HTMLElement>('.stick-knob')!;
  let id: number | null = null,
    cx = 0,
    cy = 0;
  const place = (dx: number, dy: number) => {
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
  };
  resetStick = () => {
    id = null;
    zone.classList.remove('active');
    base.style.removeProperty('left');
    base.style.removeProperty('top');
    place(0, 0);
  };
  const move = (e: PointerEvent) => {
    let dx = e.clientX - cx,
      dy = e.clientY - cy;
    const r = STICK.radius,
      d = Math.hypot(dx, dy);
    // Floating base follows a thumb that drifts far past the rim.
    if (d > r * 1.6) {
      const k = (d - r * 1.6) / d;
      cx += dx * k;
      cy += dy * k;
      const box = zone.getBoundingClientRect();
      base.style.left = `${cx - box.left}px`;
      base.style.top = `${cy - box.top}px`;
      dx = e.clientX - cx;
      dy = e.clientY - cy;
    }
    const len = Math.hypot(dx, dy),
      clamp = len > r ? r / len : 1;
    place(dx * clamp, dy * clamp);
    touch.x = (dx * clamp) / r;
    touch.y = (dy * clamp) / r;
    Object.assign(touch, stickFlags(touch.x, touch.y, touch.stickJump));
    zone.classList.toggle('jumping', touch.stickJump);
    zone.classList.toggle('running', touch.run);
  };
  zone.addEventListener('pointerdown', (e) => {
    if (id !== null) return;
    e.preventDefault();
    id = e.pointerId;
    zone.setPointerCapture(id);
    const box = zone.getBoundingClientRect();
    // Floating: the base appears under the thumb, kept inside the zone.
    cx = Math.min(Math.max(e.clientX, box.left + 58), box.right - 58);
    cy = Math.min(Math.max(e.clientY, box.top + 58), box.bottom - 58);
    base.style.left = `${cx - box.left}px`;
    base.style.top = `${cy - box.top}px`;
    zone.classList.add('active');
    move(e);
  });
  zone.addEventListener('pointermove', (e) => {
    if (e.pointerId === id) move(e);
  });
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture'])
    zone.addEventListener(ev, (e) => {
      if ((e as PointerEvent).pointerId !== id) return;
      touch.left = touch.right = touch.run = touch.down = false;
      touch.stickJump = false;
      touch.x = touch.y = 0;
      zone.classList.remove('running', 'jumping');
      resetStick?.();
    });
}
export function setThrowReady(ready: boolean) {
  const b = document.querySelector<HTMLButtonElement>('[data-touch="throw"]');
  if (b && b.classList.contains('off') === ready) {
    b.classList.toggle('off', !ready);
    b.setAttribute('aria-disabled', String(!ready));
    b.setAttribute(
      'aria-label',
      ready ? 'ارمي الشطة' : 'الشطة مقفولة: كُل شطة من الصندوق',
    );
  }
}
let handler: (action: string) => void = () => {};
export function bindUI(fn: (action: string) => void) {
  handler = fn;
  document
    .querySelectorAll<HTMLButtonElement>('[data-action]')
    .forEach((b) =>
      b.addEventListener('click', () => handler(b.dataset.action!)),
    );
  document.querySelectorAll<HTMLButtonElement>('[data-touch]').forEach((b) => {
    const key = b.dataset.touch as Flag;
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      b.setPointerCapture(e.pointerId);
      // A dim chili button still swallows the touch but does nothing.
      if (b.classList.contains('off')) return;
      touch[key] = true;
      b.classList.add('held');
      navigator.vibrate?.(8);
    });
    for (const event of ['pointerup', 'pointercancel', 'lostpointercapture'])
      b.addEventListener(event, () => {
        touch[key] = false;
        b.classList.remove('held');
      });
  });
  const stick = document.querySelector<HTMLElement>('[data-stick]');
  if (stick) bindStick(stick);
  const pad = document.querySelector<HTMLElement>('.touch-controls');
  // No page scroll, pinch-zoom, long-press menu or double-tap zoom from play.
  for (const ev of ['touchstart', 'touchmove', 'contextmenu', 'dblclick'])
    pad?.addEventListener(ev, (e) => e.preventDefault(), { passive: false });
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  window.addEventListener('blur', () => {
    releaseAll();
    handler('blur');
  });
}
export function screen(which: Screen, details = '') {
  document
    .querySelectorAll<HTMLElement>('[data-screen]')
    .forEach((el) => (el.hidden = el.dataset.screen !== which));
  document.getElementById('shade')!.hidden = which === 'hidden';
  document
    .getElementById('game-wrap')!
    .classList.toggle('playing', which === 'hidden');
  if (which === 'clear' || which === 'win')
    document.getElementById(which + '-details')!.innerHTML = details;
  document
    .getElementById('pause-btn')!
    .setAttribute('aria-label', which === 'pause' ? 'كمّل اللعب' : 'وقف مؤقت');
  if (which !== 'hidden') {
    const first = document.querySelector<HTMLButtonElement>(
      `[data-screen="${which}"] button`,
    );
    first?.focus();
  }
}
function text(id: string, value: string) {
  const el = document.getElementById(id)!;
  if (el.textContent !== value) el.textContent = value;
}
export function hud(
  score: number,
  coins: number,
  lives: number,
  timer: number,
  level: number,
  power: number,
) {
  text('score', String(score).padStart(6, '0'));
  text('coins', String(coins).padStart(2, '0'));
  text('lives', String(lives));
  text('time', String(timer));
  text('world', `١ – ${level === 0 ? '١' : '٢'}`);
  text('power', ['على قدّه', 'شطارة الفول', 'شطة نار'][power]);
  setThrowReady(power === 2);
}
export function toast(text: string) {
  const el = document.getElementById('toast')!;
  el.textContent = text;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2500);
}
