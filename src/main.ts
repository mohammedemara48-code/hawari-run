import Phaser from 'phaser';
import { Alley } from './game';
import { sound } from './audio';
import './style.css';
/** World height is fixed; the width follows the screen so wide phones see more street. */
export const VIEW_HEIGHT = 360;
export function viewWidth(w: number, h: number) {
  if (!w || !h) return 640;
  return Math.max(560, Math.min(900, Math.round((VIEW_HEIGHT * w) / h)));
}
const wrap = document.getElementById('game-wrap')!;
function boot() {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: viewWidth(wrap.clientWidth, wrap.clientHeight),
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
  const fit = () => {
    const w = viewWidth(wrap.clientWidth, wrap.clientHeight);
    if (game.scale.gameSize.width !== w) game.scale.setGameSize(w, VIEW_HEIGHT);
    else game.scale.refresh();
  };
  new ResizeObserver(fit).observe(wrap);
  window.addEventListener('orientationchange', () => setTimeout(fit, 250));
  document.addEventListener('fullscreenchange', () => setTimeout(fit, 50));
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
        .register('/sw.js', { scope: '/' })
        .catch((e) => console.warn('offline worker unavailable', e));
    else
      void navigator.serviceWorker
        .getRegistrations()
        .then((r) => r.forEach((x) => void x.unregister()))
        .catch(() => {});
  });
