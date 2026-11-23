import type { Alley } from './game';
const pending = new WeakMap<Alley, Set<number>>();
/** Optional art must never hold up a level or offline play. Phaser keeps the
 * generated fallback until the image is decoded, then swaps only this scene.
 */
export function requestBackdrop(scene: Alley, index: number) {
  const key = `backdrop-${index}`;
  if (scene.textures.exists(key)) return;
  let queue = pending.get(scene);
  if (!queue) {
    queue = new Set();
    pending.set(scene, queue);
  }
  if (queue.has(index)) return;
  queue.add(index);
  const event = `filecomplete-image-${key}`;
  const clean = () => {
    queue.delete(index);
    scene.load.off(event, complete);
    scene.load.off('loaderror', failed);
  };
  const failed = (file: { key: string }) => {
    if (file.key === key) clean();
  };
  const complete = () => {
    clean();
    if (scene.level !== index || !scene.sys.isActive()) {
      scene.textures.remove(key);
      return;
    }
    const camera = scene.cameras.main;
    const backdrop = scene.add
      .tileSprite(0, 0, camera.width, 360, key)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(-100)
      .setData('factor', 0.1)
      .setData('name', 'backdrop');
    scene.layers = scene.layers.filter((layer) => {
      if (['sky', 'far', 'mid'].includes(layer.getData('name'))) {
        layer.destroy();
        return false;
      }
      if (layer.getData('name') === 'near')
        layer.setAlpha(scene.L.meta.landmark ? 0 : 0.55);
      return true;
    });
    scene.layers.unshift(backdrop);
  };
  scene.load.once(event, complete);
  scene.load.on('loaderror', failed);
  scene.load.image(key, `bg/l${index + 1}.webp`);
  if (!scene.load.isLoading()) scene.load.start();
}
/** Run after old display objects are gone; retain only the boot/current image. */
export function releaseBackdrops(scene: Alley) {
  for (const key of scene.textures.getTextureKeys())
    if (
      /^backdrop-\d+$/.test(key) &&
      key !== 'backdrop-0' &&
      key !== `backdrop-${scene.level}`
    )
      scene.textures.remove(key);
}
