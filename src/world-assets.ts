import type Phaser from 'phaser';
import { LEVELS, type LevelMeta } from './level-data';
import { makeCreatures } from './creatures';
import { makeFarmCreatures } from './creatures-farm';
import { makeSeaCreatures } from './creatures-sea';
import { makeAlexCreatures } from './creatures-alex';
import { makeLuxorCreatures } from './creatures-luxor';
import { makeFarmProps, makeParallax, makeProps } from './world-art';
import { makeDamiettaProps } from './world3-art';
import { makeAlexProps } from './world4-art';
import { makeLuxorProps } from './world5-art';
import { makeAswanProps } from './world6-art';
import { makePortSaidProps } from './world7-art';
import { makeSiwaProps } from './world8-art';
import { makeLandmarkArt } from './landmark-art';
import { makeSkins } from './skins';
const prepared = new WeakMap<Phaser.Scene, Set<number>>();
/** Keep the synchronous level switch contract, but paint only worlds visited.
 * Shared Cairo art stays resident because later worlds reuse its particles,
 * projectiles and basic props. Each additional world is generated once.
 */
export function prepareWorldArt(scene: Phaser.Scene, meta: LevelMeta) {
  let worlds = prepared.get(scene);
  if (!worlds) {
    worlds = new Set();
    prepared.set(scene, worlds);
    makeCreatures(scene);
    makeProps(scene);
  }
  if (!worlds.has(meta.world)) {
    if (meta.world >= 8) {
      makeLuxorCreatures(scene);
      makeLuxorProps(scene);
      makeLandmarkArt(scene);
    }
    switch (meta.world) {
      case 1:
        makeFarmCreatures(scene);
        makeFarmProps(scene);
        break;
      case 2:
        makeSeaCreatures(scene);
        makeDamiettaProps(scene);
        break;
      case 3:
        makeAlexCreatures(scene);
        makeAlexProps(scene);
        break;
      // Later worlds reuse the Nile boats, gates, levers and Luxor enemies.
      case 4:
        makeLuxorCreatures(scene);
        makeLuxorProps(scene);
        break;
      case 5:
        makeSeaCreatures(scene);
        makeDamiettaProps(scene);
        makeAlexProps(scene);
        makeLuxorCreatures(scene);
        makeLuxorProps(scene);
        makeAswanProps(scene);
        break;
      case 6:
        makeLuxorProps(scene);
        makeAswanProps(scene);
        makeAlexProps(scene);
        makeSeaCreatures(scene);
        makeDamiettaProps(scene);
        makePortSaidProps(scene);
        break;
      case 7:
        makeLuxorCreatures(scene);
        makeLuxorProps(scene);
        makeSiwaProps(scene);
        break;
    }
    worlds.add(meta.world);
  }
  makeSkins(scene, meta.theme);
  makeParallax(
    scene,
    meta.theme,
    scene.textures.exists(`backdrop-${LEVELS.indexOf(meta)}`),
  );
}
