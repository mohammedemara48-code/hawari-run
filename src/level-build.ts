import { buildReadability } from './readability';
import { buildLandmark } from './landmark-world';
import Phaser from 'phaser';
import type { Alley } from './game';
import { EDGE, body } from './game-shared';
import { HERO_FRAME } from './hero-state';
import { INVULN_MS } from './weapons';
import { PALETTES, paintLevel } from './world-art';
import { TILE } from './level-data';
import { parseLevel } from './level-parse';
import { bossBar } from './ui';
import { sound } from './audio';
import { requestBackdrop, releaseBackdrops } from './backdrops';
import { prepareWorldArt } from './world-assets';
import { releaseLevelTextures } from './level-textures';

export function loadLevel(scene: Alley) {
  scene.tweens.killAll();
  scene.time.removeAllEvents();
  scene.physics.world.colliders.destroy();
  scene.children.removeAll(true);
  releaseLevelTextures(scene.textures);
  releaseBackdrops(scene);
  scene.layers = [];
  scene.lanterns = [];
  scene.moverList = [];
  scene.canals = [];
  scene.w3 = undefined;
  scene.w5 = undefined;
  scene.sail = undefined;
  scene.crane = undefined;
  scene.siwa = undefined;
  scene.landmark = undefined;
  scene.darkBoost = 0;
  scene.wheels = [];
  scene.swimming = false;
  scene.onMud = false;
  scene.fakes = [];
  scene.fakeRect = undefined;
  scene.windEmitters = [];
  scene.water = undefined;
  scene.dark = undefined;
  scene.heldLantern = undefined;
  scene.heldLanternGlow = undefined;
  scene.boss = undefined;
  scene.camFocus = undefined;
  scene.secret = undefined;
  scene.zip = null;
  const L = (scene.L = parseLevel(scene.level));
  prepareWorldArt(scene, L.meta);
  const meta = L.meta,
    pal = PALETTES[meta.theme];
  scene.spec = {
    index: scene.level,
    name: meta.name,
    width: L.width,
    height: L.height,
    start: { x: L.start.x, y: (L.start.row + 1) * TILE },
    exit: { x: L.exit.x, y: (L.exit.row + 1) * TILE },
    checkpoint: L.checkpoint
      ? { x: L.checkpoint.x, y: (L.checkpoint.row + 1) * TILE }
      : { x: -1, y: -1 },
  };
  scene.remaining = meta.time;
  scene.levelCoins = 0;
  scene.kills = 0;
  scene.elapsed = 0;
  scene.lastGround = -1000;
  scene.lastPress = -1000;
  scene.jumpWas = false;
  scene.invincible = 0;
  scene.hurtUntil = scene.time.now + INVULN_MS;
  scene.bossState = {
    active: false,
    hp: scene.bossMax,
    chili: 0,
    state: 'idle',
    until: 0,
    invuln: 0,
    volley: 0,
    defeated: false,
    arenaX: L.boss ? (L.boss.col - 17) * TILE : 0,
  };
  const edge = EDGE;
  scene.physics.world.setBounds(0, -200, L.width, L.height + 400);
  const cam = scene.cameras.main;
  // The street-end wall left of the start keeps the hero clear of the stick.
  cam.setBounds(-edge, 0, L.width + edge * 2, L.height);
  cam.setRoundPixels(true);
  cam.setBackgroundColor(pal.sky[pal.sky.length - 1][1]);
  // Parallax: the painted backdrop (or the procedural sky/far/mid fallback)
  // behind the play field, plus near silhouettes in front.
  const painted = scene.textures.exists(`backdrop-${scene.level}`);
  const layerSpec: [string, number, number][] = painted
    ? [
        ['backdrop', 0.1, -100],
        ['near', 1.25, 40],
      ]
    : [
        ['sky', 0.03, -100],
        ['far', 0.16, -90],
        ['mid', 0.42, -80],
        ['near', 1.25, 40],
      ];
  for (const [name, factor, depth] of layerSpec)
    scene.layers.push(
      scene.add
        .tileSprite(
          0,
          0,
          cam.width,
          360,
          name === 'backdrop'
            ? `backdrop-${scene.level}`
            : `${meta.theme}-${name}`,
        )
        .setOrigin(0)
        .setScrollFactor(0)
        .setDepth(depth)
        .setAlpha(
          name === 'near' ? (meta.landmark ? 0 : painted ? 0.55 : 0.9) : 1,
        )
        .setData('factor', factor)
        .setData('name', name),
    );
  // Street ends: solid building walls beyond the map.
  {
    const g = scene.add.graphics().setDepth(1);
    for (const x0 of [-edge, L.width]) {
      g.fillStyle(Phaser.Display.Color.HexStringToColor(pal.stone[2]).color, 1);
      const wallTop = meta.id === 'saltlake' ? 11 * TILE : 0;
      g.fillRect(x0, wallTop, edge, L.height - wallTop);
      g.fillStyle(Phaser.Display.Color.HexStringToColor(pal.mortar).color, 1);
      for (let y = wallTop; y < L.height; y += 12) g.fillRect(x0, y, edge, 1);
      for (let y = wallTop; y < L.height; y += 12)
        for (let x = x0 + ((y / 12) % 2 ? 0 : 12); x < x0 + edge; x += 24)
          g.fillRect(x, y, 1, 12);
    }
  }
  for (const c of paintLevel(scene, L, scene.level))
    scene.add.image(c.x, 0, c.key).setOrigin(0).setDepth(0);
  if (L.fakes.length) {
    for (const c of paintLevel(scene, L, scene.level, true))
      scene.fakes.push(
        scene.add.image(c.x, 0, c.key).setOrigin(0).setDepth(12),
      );
    const xs = L.fakes.map((f) => f.col),
      ys = L.fakes.map((f) => f.row);
    scene.fakeRect = new Phaser.Geom.Rectangle(
      Math.min(...xs) * TILE - 6,
      Math.min(...ys) * TILE - 6,
      (Math.max(...xs) - Math.min(...xs) + 1) * TILE + 12,
      (Math.max(...ys) - Math.min(...ys) + 1) * TILE + 12,
    );
  }
  scene.terrain = scene.physics.add.staticGroup();
  scene.ledges = scene.physics.add.staticGroup();
  scene.ghosts = scene.physics.add.staticGroup();
  scene.blocks = scene.physics.add.staticGroup();
  scene.crates = scene.physics.add.staticGroup();
  scene.bouncers = scene.physics.add.staticGroup();
  scene.movers = scene.physics.add.group({
    allowGravity: false,
    immovable: true,
  });
  scene.coins = scene.physics.add.group({
    allowGravity: false,
    immovable: true,
  });
  scene.enemies = scene.physics.add.group();
  scene.items = scene.physics.add.group();
  scene.shots = scene.physics.add.group({ allowGravity: false });
  scene.hazards = scene.physics.add.group();
  scene.buildBodies();
  scene.buildProps();
  const spawn =
    scene.checkpoint && L.checkpoint ? scene.spec.checkpoint : scene.spec.start;
  scene.hero = scene.physics.add
    .sprite(spawn.x, spawn.y - HERO_FRAME.height / 2, 'hero-small-idle0')
    .setDepth(10);
  body(scene.hero).setMaxVelocity(300, 820);
  scene.growUntil = 0;
  scene.throwUntil = 0;
  scene.hurtPoseUntil = 0;
  scene.heroCrouched = false;
  scene.heroShadow = scene.add
    .image(spawn.x, spawn.y, 'hero-shadow')
    .setDepth(4)
    .setAlpha(0.24);
  scene.heroGlow = scene.add
    .image(spawn.x, spawn.y, 'glow')
    .setBlendMode(Phaser.BlendModes.ADD)
    .setDepth(51)
    .setScale(0.9)
    .setAlpha(meta.dark && meta.theme !== 'tomb' ? 0.3 : 0);
  // وادي الملوك: a فانوس in بلبل's hand, with a warm cone ahead of him.
  // The dark overlay stays off so the brighter tomb stays readable.
  if (meta.theme === 'tomb') {
    scene.heldLantern = scene.add
      .image(scene.hero.x + 11, scene.hero.y + 8, 'tomb-hand-lantern')
      .setDepth(11);
    scene.heldLanternGlow = scene.add
      .image(scene.hero.x + 11, scene.hero.y + 8, 'tomb-lantern-glow')
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(8)
      .setOrigin(80 / 256, 0.5)
      .setAlpha(0.9);
  }
  scene.setPower(scene.power, false);
  scene.followHero();
  if (scene.checkpoint)
    for (const l of scene.lanterns)
      if (l.img.x < spawn.x) scene.lightLantern(l, false);
  scene.landmark = buildLandmark(scene);
  if (scene.landmark) {
    scene.physics.add.collider(scene.hero, scene.landmark.gates);
    scene.physics.add.collider(scene.hero, scene.landmark.platforms);
  }
  scene.buildColliders();
  scene.clearSpawnCamp();
  buildReadability(scene);
  scene.buildAtmosphere();
  sound.setTrack(meta.track);
  sound.setIntensity(0);
  bossBar(false);
  scene.fitView();
  scene.updateHud();
  requestBackdrop(scene, scene.level);
}
/** The normal camera: follow the hero with a little deadzone. */
