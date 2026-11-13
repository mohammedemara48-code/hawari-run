import { paintEgypt, type WorldState } from './map-art';
import { sound } from './audio';
import { WORLDS, type LevelMeta } from './level-data';
import type { Progress } from './progress';
export type Screen =
  'title' | 'map' | 'pause' | 'clear' | 'over' | 'win' | 'hidden';
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
  // The visible stick stays anchored in the bottom-left corner. Input is
  // relative to where the thumb lands in the low touch zone, so touching
  // anywhere there never makes the hero jump or crouch by itself.
  let id: number | null = null,
    cx = 0,
    cy = 0;
  const radius = () => Math.max(24, base.offsetWidth * 0.4);
  const place = (dx: number, dy: number) => {
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
  };
  resetStick = () => {
    id = null;
    zone.classList.remove('active', 'running', 'jumping');
    place(0, 0);
  };
  const move = (e: PointerEvent) => {
    let dx = e.clientX - cx,
      dy = e.clientY - cy;
    const r = radius(),
      d = Math.hypot(dx, dy);
    // The input origin trails a thumb that drifts far past the rim.
    if (d > r * 1.6) {
      const k = (d - r * 1.6) / d;
      cx += dx * k;
      cy += dy * k;
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
    cx = e.clientX;
    cy = e.clientY;
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
  // Delegated so buttons rendered later (the map) work too.
  document.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-action]');
    if (b && !b.hasAttribute('disabled')) handler(b.dataset.action!);
  });
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
  // Volume sliders in the pause menu (saved, default high).
  const music = document.getElementById(
      'music-volume',
    ) as HTMLInputElement | null,
    sfx = document.getElementById('sfx-volume') as HTMLInputElement | null;
  if (music && sfx) {
    music.value = String(Math.round(sound.musicVolume * 100));
    sfx.value = String(Math.round(sound.sfxVolume * 100));
    const apply = () => {
      sound.setVolumes(Number(music.value) / 100, Number(sfx.value) / 100);
      music.style.setProperty('--fill', music.value + '%');
      sfx.style.setProperty('--fill', sfx.value + '%');
    };
    music.addEventListener('input', apply);
    sfx.addEventListener('input', () => {
      apply();
      sound.fx('coin');
    });
    music.style.setProperty('--fill', music.value + '%');
    sfx.style.setProperty('--fill', sfx.value + '%');
  }
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
    const first =
      document.querySelector<HTMLButtonElement>(
        `[data-screen="${which}"] .map-node.current`,
      ) ??
      document.querySelector<HTMLButtonElement>(
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
  level: string,
  power: number,
  secret = false,
) {
  text('score', String(score).padStart(6, '0'));
  text('coins', String(coins).padStart(2, '0'));
  text('lives', String(lives));
  text('time', String(timer));
  text('world', level);
  text('power', ['على قدّه', 'شطارة الفول', 'شطة نار'][power]);
  document.getElementById('time')!.classList.toggle('hurry', timer < 100);
  document.getElementById('secret-icon')?.classList.toggle('found', secret);
  setThrowReady(power === 2);
}
/** The boss health bar under the HUD. */
export function bossBar(
  visible: boolean,
  fraction = 1,
  phase = 1,
  name?: string,
) {
  const el = document.getElementById('boss-bar');
  if (!el) return;
  el.hidden = !visible;
  if (name) (el.querySelector('.boss-name') as HTMLElement).textContent = name;
  el.dataset.phase = String(phase);
  (el.querySelector('.boss-fill') as HTMLElement).style.width =
    `${Math.round(fraction * 100)}%`;
}
const THEME_ICON: Record<string, string> = {
  night:
    '<path d="M10 2h4v2h2v2h1v8h-1v3h-2v2h-4v-2H8v-3H7V6h1V4h2z" fill="#ffd36b"/><path d="M10 6h2v9h-2z" fill="#fff6c8"/><path d="M11 19h2v3h-2z" fill="#b8862a"/>',
  market:
    '<path d="M2 6h20v4l-2 2-2-2-2 2-2-2-2 2-2-2-2 2-2-2-2 2z" fill="#d8443a"/><path d="M5 6h3v4H5zm6 0h3v4h-3zm6 0h3v4h-3z" fill="#f4ead2"/><path d="M4 12h16v9H4z" fill="#7a4b2e"/><path d="M9 14h6v7H9z" fill="#ffd36b"/>',
  roof: '<path d="M3 21V9h4v12zm6 0V4h6v17zm8 0v-9h4v9z" fill="#c8a070"/><path d="M11 6h2v2h-2zm0 4h2v2h-2zm-6 1h1v1H5zm13 3h1v1h-1z" fill="#3e5a6e"/><path d="M14 2c3 0 5 2 5 4h-5z" fill="#e8ecef"/>',
  sewer:
    '<path d="M2 21V9a10 10 0 0 1 20 0v12h-4V10a6 6 0 0 0-12 0v11z" fill="#4b5c5e"/><path d="M6 17h12v4H6z" fill="#1f6a6a"/><path d="M8 16h8v1H8z" fill="#6fd0c0"/>',
  farm: '<path d="M11 10h2v12h-2z" fill="#a8822a"/><path d="M10 2h4v2h1v6h-1v2h-4v-2H9V4h1z" fill="#f0c860"/><path d="M11 3h1v7h-1z" fill="#fff0b0"/><path d="M5 9h3v2h1v3H8v1H6v-1H5zm11 0h3v5h-1v1h-2v-1h-1v-3h1z" fill="#e0b040"/><path d="M2 20h20v2H2z" fill="#6a9a3a"/>',
  workshop:
    '<path d="M4 3h16v18H4z" fill="#5a3418"/><path d="M5 4h14v16H5z" fill="#a8703e"/><path d="M12 6l2 4 4 2-4 2-2 4-2-4-4-2 4-2z" fill="#ffd27a"/><path d="M11 11h2v2h-2z" fill="#6a4228"/>',
  harbor:
    '<path d="M2 15h20l-3 5H5z" fill="#2e6aa8"/><path d="M3 15h18v2H3z" fill="#f0ead8"/><path d="M11 3h2v12h-2z" fill="#4a3220"/><path d="M13 4l6 9h-6z" fill="#e8e0d0"/><path d="M1 21h22v2H1z" fill="#4a9ac8"/>',
};
let selectedWorld: number | undefined;
let lastUnlocked = -1;
let lastMap: { progress: Progress; levels: LevelMeta[] } | undefined;
/** World states for the Egypt map, from progress. */
export function worldStates(
  progress: Progress,
  levels: LevelMeta[],
): WorldState[] {
  return WORLDS.map((w, wi) => {
    const own = levels
      .map((l, i) => ({ l, i }))
      .filter((o) => o.l.world === wi);
    if (!w.playable || !own.length) return 'soon';
    if (own.every((o) => progress.cleared[o.l.id])) return 'cleared';
    return own[0].i <= progress.unlocked ? 'open' : 'locked';
  });
}
export function renderMap(
  progress: Progress,
  levels: LevelMeta[],
  world?: number,
) {
  const nodes = document.getElementById('map-nodes'),
    pins = document.getElementById('map-worlds');
  if (!nodes || !pins) return;
  lastMap = { progress, levels };
  const states = worldStates(progress, levels);
  const current = levels[Math.min(progress.unlocked, levels.length - 1)].world;
  // A newly unlocked level pulls the map to its world; otherwise keep
  // whichever world the player was browsing.
  if (world === undefined && progress.unlocked !== lastUnlocked)
    selectedWorld = current;
  lastUnlocked = progress.unlocked;
  selectedWorld = world ?? selectedWorld ?? current;
  if (states[selectedWorld] === 'soon' || states[selectedWorld] === 'locked')
    selectedWorld = current;
  const total = levels.filter((l) => progress.secrets[l.id]).length;
  text('map-secrets', `${total} / ${levels.length}`);
  pins.innerHTML = WORLDS.map((w, wi) => {
    const st = states[wi];
    const label =
      st === 'soon'
        ? 'قريبًا'
        : st === 'locked'
          ? 'مقفولة'
          : st === 'cleared'
            ? 'خلصت ✔'
            : 'مفتوحة';
    return `<button class="world-pin ${st} side-${w.side} ${wi === selectedWorld ? 'selected' : ''}" data-world="${wi}" style="--x:${w.x * 100}%;--y:${w.y * 100}%" ${st === 'soon' || st === 'locked' ? 'aria-disabled="true"' : ''} aria-label="${w.name} — ${label}">
      <span class="pin-dot">${st === 'soon' || st === 'locked' ? '🔒' : wi + 1}</span><span class="pin-name">${w.name}<small>${label}</small></span>
    </button>`;
  }).join('');
  pins.querySelectorAll<HTMLButtonElement>('.world-pin').forEach((b) =>
    b.addEventListener('click', () => {
      const wi = Number(b.dataset.world);
      if (states[wi] === 'open' || states[wi] === 'cleared')
        renderMap(progress, levels, wi);
      else
        toast(
          states[wi] === 'soon'
            ? `${WORLDS[wi].name}: قريبًا في المشوار`
            : `خلّص ${WORLDS[wi - 1]?.name ?? ''} الأول`,
        );
    }),
  );
  const w = WORLDS[selectedWorld];
  text('world-name', `${selectedWorld + 1} · ${w.name}`);
  text('world-sub', w.subtitle);
  nodes.innerHTML = levels
    .map((l, i) => ({ l, i }))
    .filter((o) => o.l.world === selectedWorld)
    .map(({ l, i }, k) => {
      const locked = i > progress.unlocked,
        cleared = progress.cleared[l.id],
        secret = progress.secrets[l.id];
      const best = progress.best[l.id];
      const state = locked
        ? 'locked'
        : cleared
          ? 'cleared'
          : i === progress.unlocked
            ? 'current'
            : '';
      return `<button class="map-node ${state}" data-node="${i}" ${locked ? 'disabled aria-disabled="true"' : `data-action="play-${i}"`} aria-label="${k + 1} · ${l.name}">
        <span class="node-badge"><svg viewBox="0 0 24 24" shape-rendering="crispEdges" aria-hidden="true">${locked ? LOCK_ICON : (THEME_ICON[l.theme] ?? THEME_ICON.night)}</svg><b>${k + 1}</b>${cleared ? '<em class="tick">✔</em>' : ''}</span>
        <span class="node-text"><strong>${l.name}</strong><small>${locked ? 'مقفولة — خلّص اللي قبلها' : l.mechanic}</small>
        <span class="node-meta"><i class="fanoos ${secret ? 'found' : ''}" title="الفانوس الدهبي">${secret ? '★' : '☆'} فانوس</i>${best ? `<i>أعلى ${best}</i>` : ''}${l.boss ? '<i class="boss">زعيم</i>' : ''}</span></span>
      </button>`;
    })
    .join('');
  const canvas = document.getElementById(
    'map-canvas',
  ) as HTMLCanvasElement | null;
  if (canvas) {
    const paint = () =>
      paintEgypt(canvas, worldStates(lastMap!.progress, lastMap!.levels));
    requestAnimationFrame(paint);
    mapResize?.disconnect();
    mapResize = new ResizeObserver(paint);
    mapResize.observe(canvas.parentElement!);
  }
}
let mapResize: ResizeObserver | undefined;
const LOCK_ICON =
  '<path d="M8 10V7a4 4 0 0 1 8 0v3h-2V7a2 2 0 0 0-4 0v3z" fill="#9aa39a"/><path d="M6 10h12v10H6z" fill="#6c766e"/><path d="M11 13h2v4h-2z" fill="#2a322e"/>';
export function toast(text: string) {
  const el = document.getElementById('toast')!;
  el.textContent = text;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2500);
}
