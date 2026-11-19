import Phaser from 'phaser';
import { Alley } from './game';
import { sound } from './audio';
import { initUpdates } from './update';
import './style.css';
/** World height is fixed; the width follows the screen so wide phones see more street. */
export const VIEW_HEIGHT = 360;
export function viewWidth(w: number, h: number) {
  if (!w || !h) return 640;
  return Math.max(560, Math.min(1280, Math.round((VIEW_HEIGHT * w) / h)));
}
const wrap = document.getElementById('game-wrap')!;
const phoneFill = () =>
  window.matchMedia?.(
    '(pointer: coarse) and (max-width: 1200px), (max-height: 600px) and (orientation: landscape)',
  ).matches;
// A phone held upright: the whole game is turned 90° with CSS so it still
// plays in landscape without rotating the phone (touch controls are DOM and
// follow the rotation; the stick maps its drag back into the turned frame).
// Typing is never done sideways: while the login form is up or a text field
// has focus the page stays upright (html.form-upright) instead.
// Portrait comes from the screen, not the viewport: an open keyboard shrinks
// the viewport's height and must not read as the phone being turned.
const coarse = window.matchMedia?.('(pointer: coarse)');
const portraitMq = window.matchMedia?.('(orientation: portrait)');
const loginScreen = document.querySelector<HTMLElement>(
  '[data-screen="login"]',
);
function screenPortrait() {
  const t = screen.orientation?.type;
  if (t) return t.startsWith('portrait');
  return !!portraitMq?.matches;
}
function isPhone() {
  return !!coarse?.matches && Math.min(screen.width, screen.height) <= 900;
}
const TEXT_TYPES = /^(text|password|number|tel|email|search|url)$/;
export function typing() {
  const el = document.activeElement as HTMLElement | null;
  if (!el || el.closest('[hidden]')) return false;
  if (el instanceof HTMLTextAreaElement || el.isContentEditable) return true;
  return el instanceof HTMLInputElement && TEXT_TYPES.test(el.type || 'text');
}
function applyRotation() {
  const upright = isPhone() && screenPortrait();
  const form = upright && (!!(loginScreen && !loginScreen.hidden) || typing());
  const root = document.documentElement.classList;
  root.toggle('rotated', upright && !form);
  root.toggle('form-upright', form);
}
applyRotation();
portraitMq?.addEventListener?.('change', applyRotation);
screen.orientation?.addEventListener?.('change', applyRotation);
document.addEventListener('focusin', applyRotation);
document.addEventListener('focusout', () => setTimeout(applyRotation, 0));
if (loginScreen)
  new MutationObserver(() => {
    if (loginScreen.hidden && typing())
      (document.activeElement as HTMLElement).blur();
    applyRotation();
  }).observe(loginScreen, { attributes: true, attributeFilter: ['hidden'] });
function measure() {
  if (phoneFill() || document.documentElement.classList.contains('rotated')) {
    const vv = window.visualViewport;
    let w = Math.round(vv?.width ?? window.innerWidth);
    let h = Math.round(vv?.height ?? window.innerHeight);
    if (document.documentElement.classList.contains('rotated')) [w, h] = [h, w];
    return viewWidth(w, h);
  }
  return viewWidth(wrap.clientWidth, wrap.clientHeight);
}
function boot() {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: measure(),
    height: VIEW_HEIGHT,
    pixelArt: true,
    roundPixels: true,
    backgroundColor: '#1a2030',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    physics: {
      default: 'arcade',
      arcade: { gravity: { x: 0, y: 1100 }, debug: false },
    },
    scene: [Alley],
    audio: { noAudio: true },
    render: { antialias: false, pixelArt: true },
    fps: { target: 60, forceSetTimeOut: false },
  });
  // Phaser sizes the canvas from the parent's on-screen box, which the
  // quarter turn swaps; use the parent's own (untransformed) size instead.
  const sm = game.scale as unknown as {
    parent: HTMLElement | null;
    parentSize: Phaser.Structs.Size;
    getParentBounds: () => boolean;
  };
  const parentBounds = sm.getParentBounds.bind(sm);
  sm.getParentBounds = () => {
    if (!document.documentElement.classList.contains('rotated') || !sm.parent)
      return parentBounds();
    const w = sm.parent.offsetWidth,
      h = sm.parent.offsetHeight;
    if (sm.parentSize.width === w && sm.parentSize.height === h) return false;
    sm.parentSize.setSize(w, h);
    return true;
  };
  // The keyboard opening or closing is not a new screen shape: skip it and
  // refit once typing ends.
  const fit = () => {
    if (typing()) return;
    const w = measure();
    if (game.scale.gameSize.width !== w) game.scale.setGameSize(w, VIEW_HEIGHT);
    else game.scale.refresh();
  };
  new ResizeObserver(fit).observe(wrap);
  window.addEventListener('orientationchange', () => setTimeout(fit, 250));
  new MutationObserver(() => setTimeout(fit, 60)).observe(
    document.documentElement,
    { attributes: true, attributeFilter: ['class'] },
  );
  document.addEventListener('focusout', () => setTimeout(fit, 120));
  document.addEventListener('fullscreenchange', () => setTimeout(fit, 50));
  window.visualViewport?.addEventListener('resize', () => setTimeout(fit, 50));
  // Public engine handle makes state inspectable for debugging; no service credentials.
  Object.assign(window, { hawari: game, hawariAudio: sound });
}
// Shop signs are painted with the Arabic display font; never wait long for it.
Promise.race([
  Promise.all([
    document.fonts?.load('bold 10px Changa'),
    document.fonts?.load('13px Changa'),
  ]),
  new Promise((r) => setTimeout(r, 1200)),
])
  .catch(() => {})
  .finally(boot);
// Offline worker: production only. A failed registration must never block play.
if ('serviceWorker' in navigator)
  window.addEventListener('load', () => {
    if (import.meta.env.PROD)
      navigator.serviceWorker
        .register('/sw.js', { scope: '/', updateViaCache: 'none' })
        .catch((e) => console.warn('offline worker unavailable', e))
        .finally(initUpdates);
    else
      void navigator.serviceWorker
        .getRegistrations()
        .then((r) => r.forEach((x) => void x.unregister()))
        .catch(() => {});
  });
// Development builds have no worker, but still show what's new once.
if (!('serviceWorker' in navigator) || !import.meta.env.PROD)
  window.addEventListener('load', initUpdates);
