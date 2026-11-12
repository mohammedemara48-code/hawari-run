import Phaser from 'phaser';
import { Alley } from './game';
import './style.css';
const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 640,
  height: 360,
  pixelArt: true,
  roundPixels: true,
  backgroundColor: '#e8ad85',
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
// Public engine handle makes state inspectable for debugging; no service credentials.
(window as any).hawari = game;
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
