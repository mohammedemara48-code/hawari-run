import Phaser from 'phaser';
import { makeSkins, skinKey } from './skins';
import { makeArt } from './art';
import { makeCreatures } from './creatures';
import {
  hash,
  makeParallax,
  makeProps,
  paintLevel,
  PALETTES,
} from './world-art';
import { HERO_FRAME, heroBody, heroPose } from './hero-state';
import { approach, jumpAllowed, stomped, tally } from './rules';
import { PHYSICS } from './levels';
import { LEVELS, TILE } from './level-data';
import {
  BOUNCE,
  LEDGE,
  MOVERS,
  SOLID,
  parseLevel,
  type Parsed,
} from './level-parse';
import { sound } from './audio';
import { bindUI, bossBar, hud, renderMap, screen, toast, touch } from './ui';
import { loadProgress, recordClear, recordSecret } from './progress';

type Sprite = Phaser.Physics.Arcade.Sprite;
type Img = Phaser.Physics.Arcade.Image;
type Body = Phaser.Physics.Arcade.Body;
type SBody = Phaser.Physics.Arcade.StaticBody;
type Mode =
  'title' | 'map' | 'play' | 'pause' | 'dead' | 'clear' | 'over' | 'win';
type Any = Phaser.Types.Physics.Arcade.GameObjectWithBody;
const body = (s: Phaser.GameObjects.GameObject) => (s as Sprite).body as Body;
const EDGE = 144;
const coarse = () => window.matchMedia?.('(pointer: coarse)').matches;
/** Best effort: only works in fullscreen / installed apps on some browsers. */
export function lockLandscape() {
  try {
    const o = window.screen.orientation as ScreenOrientation & {
      lock?: (o: string) => Promise<void>;
    };
    o?.lock?.('landscape')?.catch(() => {});
  } catch {
    /* Orientation lock unsupported. */
  }
}
/** Fullscreen on the first tap of a phone; iOS falls back to standalone + 100dvh. */
export function enterFullscreen() {
  try {
    const el = document.getElementById('game-wrap') as HTMLElement & {
      webkitRequestFullscreen?: () => void;
    };
    if (document.fullscreenElement) return;
    if (el.requestFullscreen)
      el.requestFullscreen({ navigationUI: 'hide' })
        .then(() => lockLandscape())
        .catch(() => {});
    else el.webkitRequestFullscreen?.();
  } catch {
    /* Fullscreen is unavailable (e.g. iOS Safari): CSS fills the viewport. */
  }
}
function oneWay(b: SBody | Body) {
  b.checkCollision.down = false;
  b.checkCollision.left = false;
  b.checkCollision.right = false;
}
const randomZone = (r: Phaser.Geom.Rectangle) =>
  ({
    type: 'random',
    source: r as unknown as Phaser.Types.GameObjects.Particles.RandomZoneSource,
  }) as Phaser.Types.GameObjects.Particles.EmitZoneData;
/** Hidden boxes: invisible and solid only when bumped from below. */
function oneWayBelow(b: SBody) {
  b.checkCollision.up = false;
  b.checkCollision.left = false;
  b.checkCollision.right = false;
}
interface Lantern {
  img: Phaser.GameObjects.Image;
  glow: Phaser.GameObjects.Image;
  lit: boolean;
  col: number;
  row: number;
}
interface Mover {
  img: Img;
  axis: 'x' | 'y';
  min: number;
  max: number;
  speed: number;
  chains?: Phaser.GameObjects.TileSprite[];
  chainTop?: number;
  steam?: Phaser.GameObjects.Particles.ParticleEmitter;
}
interface Water {
  top: Phaser.GameObjects.TileSprite;
  fill: Phaser.GameObjects.Rectangle;
  y: number;
  active: boolean;
  x0: number;
  x1: number;
  stop: number;
  speed: number;
  trigger: number;
}
export class Alley extends Phaser.Scene {
  L!: Parsed;
  hero!: Sprite;
  heroShadow!: Phaser.GameObjects.Image;
  heroGlow!: Phaser.GameObjects.Image;
  growUntil = 0;
  throwUntil = 0;
  hurtPoseUntil = 0;
  heroCrouched = false;
  terrain!: Phaser.Physics.Arcade.StaticGroup;
  ledges!: Phaser.Physics.Arcade.StaticGroup;
  ghosts!: Phaser.Physics.Arcade.StaticGroup;
  blocks!: Phaser.Physics.Arcade.StaticGroup;
  crates!: Phaser.Physics.Arcade.StaticGroup;
  bouncers!: Phaser.Physics.Arcade.StaticGroup;
  movers!: Phaser.Physics.Arcade.Group;
  coins!: Phaser.Physics.Arcade.Group;
  enemies!: Phaser.Physics.Arcade.Group;
  items!: Phaser.Physics.Arcade.Group;
  shots!: Phaser.Physics.Arcade.Group;
  hazards!: Phaser.Physics.Arcade.Group;
  moverList: Mover[] = [];
  lanterns: Lantern[] = [];
  layers: Phaser.GameObjects.TileSprite[] = [];
  fakes: Phaser.GameObjects.Image[] = [];
  fakeRect?: Phaser.Geom.Rectangle;
  secret?: Phaser.GameObjects.Image;
  secretGlow?: Phaser.GameObjects.Image;
  secretFound = false;
  exitDoor?: Phaser.GameObjects.Image;
  flag?: Phaser.GameObjects.Image;
  dark?: Phaser.GameObjects.RenderTexture;
  water?: Water;
  windOn = false;
  windEmitters: Phaser.GameObjects.Particles.ParticleEmitter[] = [];
  ambient?: Phaser.GameObjects.Particles.ParticleEmitter;
  boss?: Sprite;
  bossState = {
    active: false,
    hp: 6,
    chili: 0,
    state: 'idle',
    until: 0,
    invuln: 0,
    volley: 0,
    defeated: false,
    arenaX: 0,
  };
  zip: { line: number; dir: number } | null = null;
  zipCooldown = 0;
  dropUntil = 0;
  downSince = 0;
  keys!: Record<string, Phaser.Input.Keyboard.Key>;
  mode: Mode = 'title';
  level = 0;
  score = 0;
  coinCount = 0;
  lives = 3;
  power = 0;
  remaining = 300;
  levelCoins = 0;
  kills = 0;
  lastGround = -1000;
  lastPress = -1000;
  lastShot = 0;
  lastBump = 0;
  riseVy = 0;
  invincible = 0;
  hurtUntil = 0;
  elapsed = 0;
  jumpWas = false;
  actionWas = false;
  downWas = false;
  facing = 1;
  checkpoint = false;
  muted = false;
  clock = 0;
  spec = {
    index: 0,
    name: '',
    width: 0,
    height: 0,
    start: { x: 0, y: 0 },
    exit: { x: 0, y: 0 },
    checkpoint: { x: 0, y: 0 },
  };
  constructor() {
    super('alley');
  }
  preload() {
    // Painted backdrops (one per level), baked to 1280×360 mirrored loops.
    LEVELS.forEach((_, i) =>
      this.load.image(`backdrop-${i}`, `bg/l${i + 1}.webp`),
    );
  }
  create() {
    makeArt(this);
    makeCreatures(this);
    makeProps(this);
    makeSkins(this);
    for (const l of LEVELS) makeParallax(this, l.theme);
    this.keys = this.input.keyboard!.addKeys(
      'LEFT,RIGHT,UP,DOWN,A,D,W,S,Z,X,SPACE,SHIFT,ESC,ENTER,M',
    ) as Record<string, Phaser.Input.Keyboard.Key>;
    this.input.keyboard!.addCapture(['SPACE', 'UP', 'DOWN', 'LEFT', 'RIGHT']);
    bindUI((a) => this.action(a));
    this.input.keyboard!.on('keydown-ESC', () => this.action('pause'));
    this.input.keyboard!.on('keydown-ENTER', () => {
      if (this.mode === 'title') this.action('start');
      else if (this.mode === 'map')
        this.action('play-' + loadProgress().unlocked);
      else if (this.mode === 'over') this.action('retry');
      else if (this.mode === 'clear') this.action('next');
      else if (this.mode === 'win') this.action('map');
    });
    this.input.keyboard!.on('keydown-M', () => this.action('sound'));
    this.scale.on('resize', () => this.fitView());
    this.loadLevel();
    this.physics.pause();
    screen('title');
    const portrait = window.matchMedia(
      '(orientation: portrait) and (pointer: coarse) and (max-width: 700px)',
    );
    portrait.addEventListener?.('change', (e) => {
      if (e.matches && this.mode === 'play') this.action('pause');
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.mode === 'play') this.action('pause');
    });
  }
  /* ───────────────────────── Flow ───────────────────────── */
  action(action: string) {
    if (action.startsWith('play-')) {
      const n = Number(action.slice(5));
      if (!(n <= loadProgress().unlocked)) return;
      this.score = 0;
      this.coinCount = 0;
      this.lives = 3;
      this.power = 0;
      this.startLevel(n);
      return;
    }
    switch (action) {
      case 'start':
        sound.start();
        if (coarse()) enterFullscreen();
        lockLandscape();
        this.showMap();
        break;
      case 'map':
        this.showMap();
        break;
      case 'retry':
        this.score = 0;
        this.coinCount = 0;
        this.lives = 3;
        this.power = 0;
        this.startLevel(this.level);
        break;
      case 'next':
        this.startLevel(Math.min(LEVELS.length - 1, this.level + 1));
        break;
      case 'pause':
        if (this.mode === 'play') {
          this.mode = 'pause';
          this.physics.pause();
          screen('pause');
        } else if (this.mode === 'pause') {
          this.mode = 'play';
          this.physics.resume();
          screen('hidden');
        }
        break;
      case 'blur':
        if (this.mode === 'play') this.action('pause');
        break;
      case 'sound':
        this.muted = !this.muted;
        sound.muted = this.muted;
        document.querySelectorAll('[data-action="sound"]').forEach((b) => {
          b.textContent = this.muted ? 'الصوت: مقفول' : 'الصوت: شغّال';
        });
        if (!this.muted) sound.start();
        break;
      case 'fullscreen':
        try {
          if (!document.fullscreenElement) enterFullscreen();
          else document.exitFullscreen?.()?.catch(() => {});
        } catch {
          /* Fullscreen is unavailable (e.g. iOS standalone). */
        }
        break;
    }
  }
  showMap() {
    this.mode = 'map';
    this.physics.pause();
    renderMap(loadProgress(), LEVELS);
    screen('map');
    bossBar(false);
  }
  /** Start a level (keeps the run's score and lives). Public for tests. */
  startLevel(index: number) {
    sound.start();
    this.level = index;
    this.checkpoint = false;
    this.secretFound = false;
    this.loadLevel();
    this.mode = 'play';
    this.physics.resume();
    screen('hidden');
    toast(`${LEVELS[index].name} — ${LEVELS[index].subtitle}`);
  }
  /* ───────────────────────── Building ───────────────────────── */
  loadLevel() {
    this.tweens.killAll();
    this.time.removeAllEvents();
    this.physics.world.colliders.destroy();
    this.children.removeAll(true);
    this.layers = [];
    this.lanterns = [];
    this.moverList = [];
    this.fakes = [];
    this.fakeRect = undefined;
    this.windEmitters = [];
    this.water = undefined;
    this.dark = undefined;
    this.boss = undefined;
    this.secret = undefined;
    this.zip = null;
    const L = (this.L = parseLevel(this.level));
    const meta = L.meta,
      pal = PALETTES[meta.theme];
    this.spec = {
      index: this.level,
      name: meta.name,
      width: L.width,
      height: L.height,
      start: { x: L.start.x, y: (L.start.row + 1) * TILE },
      exit: { x: L.exit.x, y: (L.exit.row + 1) * TILE },
      checkpoint: L.checkpoint
        ? { x: L.checkpoint.x, y: (L.checkpoint.row + 1) * TILE }
        : { x: -1, y: -1 },
    };
    this.remaining = meta.time;
    this.levelCoins = 0;
    this.kills = 0;
    this.elapsed = 0;
    this.lastGround = -1000;
    this.lastPress = -1000;
    this.jumpWas = false;
    this.invincible = 0;
    this.hurtUntil = this.time.now + 1200;
    this.bossState = {
      active: false,
      hp: 6,
      chili: 0,
      state: 'idle',
      until: 0,
      invuln: 0,
      volley: 0,
      defeated: false,
      arenaX: L.boss ? (L.boss.col - 17) * TILE : 0,
    };
    const vertical = L.height > 600;
    const edge = EDGE;
    this.physics.world.setBounds(0, -200, L.width, L.height + 400);
    const cam = this.cameras.main;
    // The street-end wall left of the start keeps the hero clear of the stick.
    cam.setBounds(-edge, 0, L.width + edge * 2, L.height);
    cam.setRoundPixels(true);
    cam.setBackgroundColor(pal.sky[pal.sky.length - 1][1]);
    // Parallax: the painted backdrop (or the procedural sky/far/mid fallback)
    // behind the play field, plus near silhouettes in front.
    const painted = this.textures.exists(`backdrop-${this.level}`);
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
      this.layers.push(
        this.add
          .tileSprite(
            0,
            0,
            cam.width,
            360,
            name === 'backdrop'
              ? `backdrop-${this.level}`
              : `${meta.theme}-${name}`,
          )
          .setOrigin(0)
          .setScrollFactor(0)
          .setDepth(depth)
          .setAlpha(name === 'near' ? (painted ? 0.55 : 0.9) : 1)
          .setData('factor', factor)
          .setData('name', name),
      );
    // Street ends: solid building walls beyond the map.
    {
      const g = this.add.graphics().setDepth(1);
      for (const x0 of [-edge, L.width]) {
        g.fillStyle(
          Phaser.Display.Color.HexStringToColor(pal.stone[2]).color,
          1,
        );
        g.fillRect(x0, 0, edge, L.height);
        g.fillStyle(Phaser.Display.Color.HexStringToColor(pal.mortar).color, 1);
        for (let y = 0; y < L.height; y += 12) g.fillRect(x0, y, edge, 1);
        for (let y = 0; y < L.height; y += 12)
          for (let x = x0 + ((y / 12) % 2 ? 0 : 12); x < x0 + edge; x += 24)
            g.fillRect(x, y, 1, 12);
      }
    }
    for (const c of paintLevel(this, L, this.level))
      this.add.image(c.x, 0, c.key).setOrigin(0).setDepth(0);
    if (L.fakes.length) {
      for (const c of paintLevel(this, L, this.level, true))
        this.fakes.push(
          this.add.image(c.x, 0, c.key).setOrigin(0).setDepth(12),
        );
      const xs = L.fakes.map((f) => f.col),
        ys = L.fakes.map((f) => f.row);
      this.fakeRect = new Phaser.Geom.Rectangle(
        Math.min(...xs) * TILE - 6,
        Math.min(...ys) * TILE - 6,
        (Math.max(...xs) - Math.min(...xs) + 1) * TILE + 12,
        (Math.max(...ys) - Math.min(...ys) + 1) * TILE + 12,
      );
    }
    this.terrain = this.physics.add.staticGroup();
    this.ledges = this.physics.add.staticGroup();
    this.ghosts = this.physics.add.staticGroup();
    this.blocks = this.physics.add.staticGroup();
    this.crates = this.physics.add.staticGroup();
    this.bouncers = this.physics.add.staticGroup();
    this.movers = this.physics.add.group({
      allowGravity: false,
      immovable: true,
    });
    this.coins = this.physics.add.group({
      allowGravity: false,
      immovable: true,
    });
    this.enemies = this.physics.add.group();
    this.items = this.physics.add.group();
    this.shots = this.physics.add.group({ allowGravity: false });
    this.hazards = this.physics.add.group();
    this.buildBodies();
    this.buildProps();
    const spawn =
      this.checkpoint && L.checkpoint ? this.spec.checkpoint : this.spec.start;
    this.hero = this.physics.add
      .sprite(spawn.x, spawn.y - HERO_FRAME.height / 2, 'hero-small-idle0')
      .setDepth(10);
    body(this.hero).setMaxVelocity(300, 820);
    this.growUntil = 0;
    this.throwUntil = 0;
    this.hurtPoseUntil = 0;
    this.heroCrouched = false;
    this.heroShadow = this.add
      .image(spawn.x, spawn.y, 'hero-shadow')
      .setDepth(4)
      .setAlpha(0.24);
    this.heroGlow = this.add
      .image(spawn.x, spawn.y, 'glow')
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(51)
      .setScale(0.9)
      .setAlpha(meta.dark ? 0.3 : 0);
    this.setPower(this.power, false);
    cam.startFollow(
      this.hero,
      true,
      0.12,
      vertical ? 0.14 : 0.2,
      0,
      vertical ? 30 : 20,
    );
    cam.setDeadzone(90, vertical ? 90 : 70);
    if (this.checkpoint)
      for (const l of this.lanterns)
        if (l.img.x < spawn.x) this.lightLantern(l, false);
    this.buildColliders();
    this.buildAtmosphere();
    sound.setTrack(this.level);
    sound.setIntensity(0);
    bossBar(false);
    this.fitView();
    this.updateHud();
  }
  /** Merge solid tiles into as few rectangles as possible. */
  buildBodies() {
    const L = this.L;
    let open = new Map<string, Phaser.Geom.Rectangle>();
    const rects: Phaser.Geom.Rectangle[] = [];
    for (let r = 0; r < L.rows; r++) {
      const next = new Map<string, Phaser.Geom.Rectangle>();
      for (const [, a, b] of this.runs('#', r)) {
        const k = a + ',' + b,
          prev = open.get(k);
        if (prev) {
          prev.height += TILE;
          next.set(k, prev);
        } else {
          const rc = new Phaser.Geom.Rectangle(
            a * TILE,
            r * TILE,
            (b - a + 1) * TILE,
            TILE,
          );
          rects.push(rc);
          next.set(k, rc);
        }
      }
      open = next;
    }
    for (const rc of rects)
      this.terrain.add(
        this.add.zone(rc.centerX, rc.centerY, rc.width, rc.height),
      );
    for (const [r, a, b] of this.runs('='))
      this.terrain.add(
        this.add.zone(
          ((a + b + 1) / 2) * TILE,
          r * TILE + 12,
          (b - a + 1) * TILE,
          TILE,
        ),
      );
    for (const [r, a, b] of this.runs('-')) {
      const z = this.add.zone(
        ((a + b + 1) / 2) * TILE,
        r * TILE + 4,
        (b - a + 1) * TILE,
        8,
      );
      this.ledges.add(z);
      oneWay(body(z));
    }
  }
  runs(ch: string, only?: number) {
    const out: [number, number, number][] = [];
    for (
      let r = only ?? 0;
      r < (only === undefined ? this.L.rows : only + 1);
      r++
    ) {
      let a = -1;
      for (let c = 0; c <= this.L.cols; c++) {
        const s = c < this.L.cols && this.L.at(c, r) === ch;
        if (s && a < 0) a = c;
        if (!s && a >= 0) {
          out.push([r, a, c - 1]);
          a = -1;
        }
      }
    }
    return out;
  }
  buildProps() {
    const L = this.L,
      theme = L.meta.theme;
    for (const p of L.bricks) this.block(p.x, p.y, 'brick');
    for (const b of L.boxes) {
      const s = this.block(b.x, b.y, 'box', b.content);
      if (b.hidden) {
        s.setAlpha(0).setData('hidden', true);
        oneWayBelow(s.body as SBody);
      }
    }
    if (L.tank) {
      const t = this.blocks.create(
        L.tank.x + 12,
        L.tank.y + 12,
        'tank',
      ) as Sprite;
      t.setDisplaySize(48, 48).refreshBody();
      t.setData('kind', 'tank').setDepth(3);
    }
    for (const c of L.coins) this.coin(c.x, c.y);
    for (const p of L.lanterns) {
      const img = this.add.image(p.x, p.y - 2, 'lantern-off').setDepth(3);
      const glow = this.add
        .image(p.x, p.y + 4, 'glow')
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(51)
        .setAlpha(0.15)
        .setScale(0.5);
      this.lanterns.push({ img, glow, lit: false, col: p.col, row: p.row });
    }
    for (const g of L.ghosts) {
      const hint = this.add
        .image(g.x, g.y - 6, 'ghost-hint')
        .setDepth(2)
        .setAlpha(0.35);
      const s = this.ghosts.create(g.x, g.y - 6, 'ghost') as Sprite;
      s.setAlpha(0).setDepth(2).setData('lit', false).setData('hint', hint);
      const sb = s.body as SBody;
      sb.setSize(24, 8).setOffset(0, 0);
      oneWay(sb);
    }
    // Awnings: trampolines on poles.
    for (const [r, a, b] of this.runs('A')) {
      const style = 'awning' + Math.floor(hash(a, r) * 3);
      for (let c = a; c <= b; c++) {
        const s = this.bouncers.create(
          c * TILE + 12,
          r * TILE + 8,
          style,
        ) as Sprite;
        s.setDepth(3).setData('kind', 'awning');
        const sb = s.body as SBody;
        sb.setSize(24, 8).setOffset(0, 0);
        oneWay(sb);
      }
      for (const c of [a, b]) {
        let rr = r + 1;
        while (rr < L.rows && !SOLID.has(L.at(c, rr)) && rr - r < 6) rr++;
        if (rr - r < 6)
          this.add
            .tileSprite(
              c * TILE + (c === a ? 2 : 22),
              r * TILE + 10,
              4,
              (rr - r) * TILE - 10,
              'awning-pole',
            )
            .setOrigin(0.5, 0)
            .setDepth(1);
      }
    }
    for (const d of L.dishes) {
      const s = this.bouncers.create(d.x, d.y, 'dish') as Sprite;
      s.setDepth(3).setData('kind', 'dish');
      const sb = s.body as SBody;
      sb.setSize(22, 8).setOffset(3, 0);
      oneWay(sb);
    }
    for (const x of L.crates) {
      const s = this.crates.create(x.x, x.y, 'ccrate') as Sprite;
      s.setDepth(3).setData('home', { x: x.x, y: x.y });
    }
    for (const g of L.spikes) {
      const s = this.hazards.create(g.x, g.y + 6, 'glass') as Sprite;
      body(s)
        .setAllowGravity(false)
        .setImmovable(true)
        .setSize(20, 6)
        .setOffset(2, 6);
      s.setData('kind', 'glass');
    }
    const addMover = (
      p: { col: number; row: number },
      kind: 'cart' | 'plank' | 'lift',
    ) => {
      const m = MOVERS[kind];
      const img = this.movers.create(
        p.col * TILE,
        p.row * TILE,
        kind === 'cart' ? 'vcart' : kind,
      ) as Img;
      img.setOrigin(0, 0).setDepth(kind === 'cart' ? 3 : 2);
      const b = body(img);
      if (kind === 'cart') {
        img.y = p.row * TILE - 8;
        b.setSize(72, 12).setOffset(0, 8);
      } else b.setSize(m.width * TILE, 10).setOffset(0, 0);
      b.reset(img.x, img.y);
      oneWay(b);
      const mover: Mover =
        kind === 'lift'
          ? {
              img,
              axis: 'y',
              min: (p.row - m.range) * TILE,
              max: p.row * TILE,
              speed: m.speed,
            }
          : {
              img,
              axis: 'x',
              min: p.col * TILE,
              max: (p.col + m.range) * TILE,
              speed: m.speed,
            };
      if (kind === 'lift') {
        let r = p.row - m.range - 1;
        while (r > 0 && !SOLID.has(L.at(p.col, r))) r--;
        mover.chainTop = (r + 1) * TILE;
        mover.chains = [6, 42].map((dx) =>
          this.add
            .tileSprite(img.x + dx, mover.chainTop!, 4, 10, 'chain')
            .setOrigin(0.5, 0)
            .setDepth(1),
        );
      }
      if (mover.axis === 'x') img.setVelocityX(m.speed);
      else img.setVelocityY(-m.speed);
      if (kind === 'cart')
        mover.steam = this.add
          .particles(0, 0, 'steam', {
            lifespan: 1200,
            speedY: { min: -30, max: -14 },
            speedX: { min: -6, max: 6 },
            scale: { start: 0.4, end: 1.3 },
            alpha: { start: 0.45, end: 0 },
            frequency: 160,
          })
          .setDepth(4);
      this.moverList.push(mover);
    };
    L.carts.forEach((p) => addMover(p, 'cart'));
    L.planks.forEach((p) => addMover(p, 'plank'));
    L.lifts.forEach((p) => addMover(p, 'lift'));
    for (const e of L.enemies) this.enemy(e.x, e.y, e.kind);
    if (L.boss) this.makeBoss(L.boss.x, (L.boss.row + 1) * TILE);
    if (L.checkpoint)
      this.flag = this.add
        .image(
          L.checkpoint.x,
          (L.checkpoint.row + 1) * TILE,
          this.checkpoint ? 'checkpoint-lit' : 'checkpoint-flag',
        )
        .setOrigin(0.3, 1)
        .setDepth(3);
    this.exitDoor = this.add
      .image(L.exit.x, (L.exit.row + 1) * TILE, 'exit-door')
      .setOrigin(0.5, 1)
      .setDepth(2);
    this.add
      .image(L.exit.x, (L.exit.row + 1) * TILE - 72, 'glow')
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(51)
      .setScale(0.9)
      .setVisible(!L.boss)
      .setName('exit-glow');
    if (L.boss) this.exitDoor.setVisible(false);
    if (L.secret) {
      this.secret = this.add
        .image(L.secret.x, L.secret.y, 'fanoos-gold')
        .setDepth(5);
      this.tweens.add({
        targets: this.secret,
        y: L.secret.y - 4,
        yoyo: true,
        repeat: -1,
        duration: 700,
        ease: 'Sine.inOut',
      });
      this.secretGlow = this.add
        .image(L.secret.x, L.secret.y, 'glow')
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(51)
        .setScale(0.6);
    }
    const w = L.meta.water;
    if (w) {
      const x0 = w.col0 * TILE,
        x1 = (w.col1 + 1) * TILE,
        y = w.fromRow * TILE;
      this.water = {
        top: this.add
          .tileSprite(x0, y, x1 - x0, 16, 'water')
          .setOrigin(0)
          .setDepth(11),
        fill: this.add
          .rectangle(x0, y + 14, x1 - x0, L.height, 0x174f52, 0.92)
          .setOrigin(0)
          .setDepth(11),
        y,
        active: false,
        x0,
        x1,
        stop: w.toRow * TILE,
        speed: w.speed,
        trigger: w.triggerCol * TILE,
      };
    }
    // Parked foul carts with steam on the flat streets.
    if (theme === 'market' || theme === 'night') {
      const groundRow = L.rows - 2;
      for (let c = 6; c < L.cols - 6; c += 23) {
        const ok = [0, 1, 2].every(
          (k) =>
            L.at(c + k, groundRow) === '#' &&
            L.at(c + k, groundRow - 1) === '.' &&
            L.at(c + k, groundRow - 2) === '.',
        );
        if (!ok || hash(c, 4) < 0.3) continue;
        this.add
          .image(c * TILE, groundRow * TILE, 'vcart')
          .setOrigin(0, 1)
          .setDepth(1);
        this.add
          .particles(c * TILE + 53, groundRow * TILE - 40, 'steam', {
            lifespan: 1600,
            speedY: { min: -26, max: -12 },
            speedX: { min: -5, max: 8 },
            scale: { start: 0.4, end: 1.6 },
            alpha: { start: 0.4, end: 0 },
            frequency: 220,
          })
          .setDepth(2);
      }
    }
  }
  buildAtmosphere() {
    const L = this.L,
      meta = L.meta,
      cam = this.cameras.main;
    if (meta.dark)
      this.dark = this.add
        .renderTexture(0, 0, cam.width, cam.height)
        .setOrigin(0)
        .setScrollFactor(0)
        .setDepth(50);
    if (meta.theme === 'market' || meta.theme === 'sewer')
      for (let x = 300; x < L.width; x += 520 + Math.floor(hash(x, 2) * 200))
        this.add
          .image(x, meta.theme === 'sewer' ? 3 * TILE : 0, 'shaft')
          .setOrigin(0.5, 0)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setAlpha(meta.theme === 'sewer' ? 0.3 : 0.2)
          .setDepth(meta.theme === 'sewer' ? 52 : 6)
          .setScale(1.2, L.height / 300);
    const zone = (w: number, h: number) =>
      randomZone(new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h));
    const conf: Record<
      string,
      Phaser.Types.GameObjects.Particles.ParticleEmitterConfig
    > = {
      night: {
        lifespan: 4200,
        speed: { min: 4, max: 16 },
        scale: { start: 0.9, end: 0.3 },
        frequency: 160,
        blendMode: 'ADD',
        emitZone: zone(1000, 380),
        alpha: {
          onEmit: () => 0,
          onUpdate: (_p, _k, t) =>
            Math.sin(t * Math.PI) * (0.55 + 0.45 * Math.sin(t * 30)),
        },
      },
      market: {
        lifespan: 5000,
        speedX: { min: -8, max: 8 },
        speedY: { min: -6, max: 4 },
        scale: { min: 0.6, max: 1.4 },
        alpha: { start: 0.5, end: 0 },
        frequency: 90,
        tint: 0xffe3b0,
        blendMode: 'ADD',
        emitZone: zone(1000, 380),
      },
      roof: {
        lifespan: 5000,
        speedX: { min: 30, max: 60 },
        speedY: { min: 4, max: 18 },
        rotate: { min: 0, max: 360 },
        alpha: { start: 0.9, end: 0 },
        frequency: 500,
        emitZone: zone(1000, 380),
      },
      sewer: {
        lifespan: 900,
        speedY: { min: 0, max: 10 },
        gravityY: 700,
        alpha: { start: 0.9, end: 0.4 },
        frequency: 110,
        emitZone: zone(1000, 40),
      },
    };
    const key = {
      night: 'firefly',
      market: 'mote',
      roof: 'feather',
      sewer: 'drip',
    }[meta.theme];
    this.ambient = this.add
      .particles(0, 0, key, conf[meta.theme])
      .setDepth(meta.theme === 'night' ? 53 : 30);
    for (const w of L.wind) {
      const e = this.add.particles(0, 0, 'streak', {
        lifespan: 900,
        speedX: { min: 260 * w.dir, max: 380 * w.dir },
        alpha: { start: 0.7, end: 0 },
        frequency: 60,
        emitZone: randomZone(
          new Phaser.Geom.Rectangle(w.x0, w.y0, w.x1 - w.x0, w.y1 - w.y0),
        ),
        emitting: false,
      });
      e.setDepth(30);
      this.windEmitters.push(e);
    }
    if (meta.theme === 'roof')
      this.time.addEvent({
        delay: 3800,
        loop: true,
        callback: () => {
          const c2 = this.cameras.main;
          for (let i = 0; i < 5; i++) {
            const b = this.add
              .image(
                c2.scrollX - 30 - i * 14,
                c2.scrollY + 40 + (i % 2) * 10 + i * 4,
                'bird',
              )
              .setDepth(-85);
            this.tweens.add({
              targets: b,
              x: b.x + c2.width + 120,
              y: b.y - 30,
              duration: 7000,
              onComplete: () => b.destroy(),
            });
            this.tweens.add({
              targets: b,
              scaleY: 0.4,
              yoyo: true,
              repeat: -1,
              duration: 160,
            });
          }
        },
      });
  }
  buildColliders() {
    const hero = this.hero,
      hb = body(hero);
    const fromAbove = (h: unknown, s: unknown) => {
      const ho = h as Any,
        so = s as Any;
      const b = ho.body as Body,
        sb = so.body as Body;
      if (
        ho === (this.hero as unknown) &&
        (this.time.now < this.dropUntil || this.zip)
      )
        return false;
      const prevBottom = b.prev.y + b.height;
      const top = sb.moves ? Math.min(sb.top, sb.prev.y) : sb.top;
      return b.velocity.y >= -5 && prevBottom <= top + 7;
    };
    this.physics.add.collider(hero, this.terrain, () => this.headBump());
    this.physics.add.collider(hero, this.blocks, () => this.headBump());
    this.physics.add.collider(hero, this.ledges, undefined, fromAbove);
    this.physics.add.collider(
      hero,
      this.ghosts,
      undefined,
      (h, g) => (g as Sprite).getData('lit') && fromAbove(h, g),
    );
    this.physics.add.collider(hero, this.movers, undefined, fromAbove);
    this.physics.add.collider(hero, this.crates, (_h, c) => {
      if (Math.abs(hb.bottom - body(c as Sprite).top) < 3)
        this.crumble(c as Sprite);
    });
    this.physics.add.collider(
      hero,
      this.bouncers,
      (_h, s) => this.bounce(s as Sprite),
      fromAbove,
    );
    for (const g of [this.enemies, this.items]) {
      this.physics.add.collider(g, this.terrain);
      this.physics.add.collider(g, this.blocks);
      this.physics.add.collider(g, this.crates);
      this.physics.add.collider(g, this.ledges, undefined, fromAbove);
      this.physics.add.collider(g, this.movers, undefined, fromAbove);
      this.physics.add.collider(g, this.bouncers, undefined, fromAbove);
    }
    this.physics.add.overlap(hero, this.coins, (_p, c) => {
      this.collect();
      this.burst((c as Sprite).x, (c as Sprite).y, 0xffe08a, 4);
      c.destroy();
    });
    this.physics.add.overlap(hero, this.items, (_p, it) => {
      const item = it as Sprite;
      const type = item.getData('kind');
      if (type === 'coin') this.collect();
      else if (type === 'invincible') {
        this.invincible = this.time.now + 9000;
        toast('خرزة الحظ! ٩ ثواني محدش يقدر عليك');
        sound.fx('power');
      } else {
        this.setPower(type === 'chili' ? 2 : Math.max(1, this.power));
        sound.fx('power');
      }
      this.burst(item.x, item.y, 0xffd889, 15);
      item.destroy();
    });
    this.physics.add.collider(hero, this.enemies, (_p, e) =>
      this.contact(e as Sprite),
    );
    this.physics.add.overlap(hero, this.hazards, () => this.hurt());
    this.physics.add.collider(this.hazards, this.terrain, (h) => {
      const s = h as Sprite;
      if (s.getData('kind') === 'bone') {
        this.burst(s.x, s.y, 0xf3ead2, 4);
        s.destroy();
      }
    });
    for (const g of [this.terrain, this.blocks, this.crates])
      this.physics.add.collider(this.shots, g, (shot) => {
        const s = shot as Sprite;
        if (body(s).blocked.down && (s.getData('bounces') || 0) < 3) {
          s.setVelocityY(-160);
          s.setData('bounces', (s.getData('bounces') || 0) + 1);
        } else {
          this.burst(s.x, s.y, 0xf5a34d, 4);
          s.destroy();
        }
      });
    this.physics.add.overlap(this.shots, this.enemies, (shot, e) => {
      this.killEnemy(e as Sprite);
      shot.destroy();
    });
    this.physics.add.overlap(this.enemies, this.enemies, (a, b) => {
      const A = a as Sprite,
        B = b as Sprite;
      if (A !== B && (A.getData('rolling') || B.getData('rolling')))
        this.killEnemy(A.getData('rolling') ? B : A);
    });
    if (this.boss) {
      const boss = this.boss;
      this.physics.add.collider(boss, this.terrain);
      this.physics.add.collider(boss, this.ledges, undefined, fromAbove);
      this.physics.add.overlap(hero, boss, () => this.bossContact());
      this.physics.add.overlap(this.shots, boss, (a, b) => {
        (a === boss ? b : a).destroy();
        this.bossChili();
      });
    }
  }
  /* ───────────────────────── Entities ───────────────────────── */
  /** The current world's skin for a shared element texture. */
  skin(key: string) {
    return skinKey(this, this.L.meta.theme, key);
  }
  block(x: number, y: number, key: string, content = '') {
    const s = this.blocks.create(x, y, this.skin(key)) as Sprite;
    s.setData('kind', key).setData('content', content).setDepth(4);
    return s;
  }
  coin(x: number, y: number) {
    const s = this.coins.create(x, y, this.skin('coin0')) as Sprite;
    s.setData('phase', Math.floor(x / 24) % 6).setDepth(5);
    body(s).setSize(11, 17);
    return s;
  }
  enemy(x: number, y: number, type: string) {
    const flying = type === 'bat' || type === 'pigeon';
    const e = this.enemies.create(x, y, type + '0') as Sprite;
    const sizes: Record<string, [number, number, number, number]> = {
      cat: [24, 22, 4, 5],
      bug: [22, 12, 5, 9],
      basket: [24, 22, 4, 5],
      bat: [20, 16, 6, 4],
      rooster: [22, 26, 6, 5],
      pigeon: [20, 14, 5, 4],
      rat: [22, 12, 5, 5],
    };
    const [w, h, ox, oy] = sizes[type];
    const b = body(e);
    b.setSize(w, h).setOffset(ox, oy);
    if (flying) b.setAllowGravity(false);
    // Feet on the tile floor: body bottom = bottom of the tile cell.
    else e.y = y + TILE / 2 - (oy + h) + e.height / 2 - 1;
    b.reset(e.x, e.y);
    e.setDepth(8)
      .setData('kind', type)
      .setData('home', { x, y: e.y })
      .setData('state', type === 'bat' ? 'perch' : 'walk')
      .setData('until', 0)
      .setData('sleep', false)
      .setData('rolling', false)
      .setData('seed', hash(x, y) * 10);
    if (!flying) e.setVelocityX(-this.walkSpeed(type));
    return e;
  }
  walkSpeed(type: string) {
    return (
      (
        { cat: 38, bug: 55, basket: 38, rooster: 34, rat: 92 } as Record<
          string,
          number
        >
      )[type] ?? 40
    );
  }
  makeBoss(x: number, bottom: number) {
    const boss = this.physics.add
      .sprite(x, bottom - 32, 'boss-idle0')
      .setDepth(9);
    body(boss).setSize(52, 54).setOffset(13, 10);
    boss.setFlipX(true);
    this.boss = boss;
  }
  setPower(power: number, announce = true) {
    const previous = this.power;
    this.power = power;
    this.hero
      .setScale(1)
      .setTexture(`hero-${power > 0 ? 'big' : 'small'}-idle0`);
    this.fitHeroBody(false);
    if (announce && power > previous) this.growUntil = this.time.now + 420;
    if (announce) {
      toast(
        power === 2
          ? 'شطة نار! دوس X أو زرار الشطة وارمي'
          : 'سندوتش فول… بقيت أقوى!',
      );
      this.burst(this.hero.x, this.hero.y, 0xffc879, 16);
    }
    this.updateHud();
  }
  fitHeroBody(crouch: boolean) {
    const m = heroBody(this.power > 0, crouch),
      b = body(this.hero);
    if (b.width !== m.width || b.height !== m.height || b.offset.y !== m.y)
      b.setSize(m.width, m.height, false).setOffset(m.x, m.y);
    this.heroCrouched = crouch;
  }
  solidsNear(): SBody[] {
    const out: SBody[] = [];
    for (const g of [this.terrain, this.blocks, this.crates])
      for (const s of g.getChildren()) {
        const b = (s as Sprite).body as SBody;
        if (b && b.enable && s.active) out.push(b);
      }
    return out;
  }
  animateHero(
    now: number,
    grounded: boolean,
    direction: number,
    down: boolean,
  ) {
    let crouch = grounded && down;
    if (this.heroCrouched && !crouch) {
      const m = heroBody(this.power > 0, false),
        left = this.hero.x - HERO_FRAME.width / 2 + m.x,
        top = this.hero.y - HERO_FRAME.height / 2 + m.y;
      crouch = this.solidsNear().some(
        (b) =>
          left < b.right &&
          left + m.width > b.left &&
          top < b.bottom &&
          top + m.height > b.top + 0.5,
      );
    }
    this.fitHeroBody(crouch);
    let pose = heroPose({
      now,
      grounded,
      vx: body(this.hero).velocity.x,
      vy: body(this.hero).velocity.y,
      direction,
      down: crouch,
      growUntil: this.growUntil,
      throwUntil: this.throwUntil,
      hurtUntil: this.hurtPoseUntil,
      dead: this.mode === 'dead',
    });
    if (this.zip && this.mode === 'play') pose = 'throw1';
    const form = pose === 'grow0' ? 'small' : this.power > 0 ? 'big' : 'small';
    this.hero.setTexture(`hero-${form}-${pose}`).setData('pose', pose);
    this.heroShadow
      .setPosition(this.hero.x, body(this.hero).bottom + 1)
      .setAlpha(grounded ? 0.24 : 0)
      .setVisible(this.mode !== 'dead');
  }
  updateHud() {
    hud(
      this.score,
      this.coinCount,
      this.lives,
      Math.max(0, Math.ceil(this.remaining)),
      `${this.level + 1} · ${LEVELS[this.level].name}`,
      this.power,
      this.secretFound,
    );
  }
  collect() {
    this.coinCount++;
    this.levelCoins++;
    this.score += 100;
    if (this.coinCount % 50 === 0) {
      this.lives++;
      toast('٥٠ جنيه فكة! محاولة زيادة');
    }
    sound.fx('coin');
    this.updateHud();
  }
  popText(x: number, y: number, text: string, color = '#fff2c4') {
    const label = this.add
      .text(x, y, text, {
        fontFamily: 'Changa, Tahoma',
        fontSize: '13px',
        color,
        stroke: '#2a1a14',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(60);
    this.tweens.add({
      targets: label,
      y: y - 30,
      alpha: 0,
      delay: 250,
      duration: 650,
      onComplete: () => label.destroy(),
    });
  }
  /* ───────────────────────── Blocks ───────────────────────── */
  headBump() {
    const hb = body(this.hero);
    if (!hb.blocked.up || this.time.now - this.lastBump < 120) return;
    let best: SBody | undefined,
      bestOverlap = 0,
      touched = 0;
    for (const sb of this.solidsNear()) {
      if (Math.abs(sb.bottom - hb.top) > 3) continue;
      const overlap = Math.min(sb.right, hb.right) - Math.max(sb.left, hb.left);
      if (overlap <= 0) continue;
      touched++;
      if (overlap > bestOverlap) {
        bestOverlap = overlap;
        best = sb;
      }
    }
    if (!best) return;
    // Corner correction: clipping a block edge by a few pixels slides past it.
    if (touched === 1 && bestOverlap <= 7 && this.riseVy < -120) {
      const shift =
        hb.center.x < best.center.x ? -(bestOverlap + 1) : bestOverlap + 1;
      const left = hb.left + shift,
        right = hb.right + shift;
      const free = !this.solidsNear().some(
        (o) =>
          o.left < right &&
          o.right > left &&
          o.top < hb.bottom - 1 &&
          o.bottom > hb.top - 8,
      );
      if (free) {
        this.hero.x += shift;
        hb.x += shift;
        hb.velocity.y = this.riseVy;
        hb.blocked.up = false;
        return;
      }
    }
    this.lastBump = this.time.now;
    const go = best.gameObject as Sprite;
    if (go && this.blocks.contains(go)) this.hitBlock(go);
  }
  hitBlock(block: Sprite) {
    if (!block.active || this.hero.y < block.y || block.getData('busy')) return;
    const kind = block.getData('kind');
    if (kind !== 'brick' && kind !== 'box') return;
    block.setData('busy', true);
    if (block.getData('hidden')) {
      block.setAlpha(1).setData('hidden', false);
      const sb = block.body as SBody;
      sb.checkCollision.up =
        sb.checkCollision.left =
        sb.checkCollision.right =
          true;
      this.popText(block.x, block.y - 24, 'مخبّي!', '#ffe08a');
    }
    if (kind === 'brick' && this.power > 0) {
      this.burst(block.x, block.y, 0xcc8a62, 12);
      this.debris(block.x, block.y);
      block.destroy();
      sound.fx('break');
      this.cameras.main.shake(70, 0.003);
      this.score += 50;
      return;
    }
    sound.fx('bump');
    this.bumpAbove(block);
    const oldY = block.y;
    this.tweens.add({
      targets: block,
      y: oldY - 6,
      duration: 70,
      yoyo: true,
      onComplete: () => {
        if (block.active) block.setData('busy', false);
      },
    });
    if (kind === 'box') {
      block.setData('kind', 'used').setTexture(this.skin('used'));
      const content = block.getData('content') || 'coin';
      if (content === 'coin') {
        this.collect();
        const c = this.add
          .image(block.x, block.y - 20, this.skin('coin1'))
          .setDepth(15);
        this.tweens.add({
          targets: c,
          y: c.y - 46,
          duration: 260,
          yoyo: true,
          ease: 'Quad.easeOut',
          onComplete: () => {
            this.burst(c.x, c.y, 0xffd474, 6);
            c.destroy();
          },
        });
        this.popText(block.x, block.y - 34, '+١٠٠');
      } else this.spawnItem(block, content);
    }
  }
  debris(x: number, y: number) {
    for (let i = 0; i < 4; i++) {
      const d = this.add
        .image(x, y, 'particle')
        .setScale(2)
        .setTint(0x9a5a44)
        .setDepth(20);
      this.tweens.add({
        targets: d,
        x: x + (i % 2 ? 1 : -1) * (20 + i * 8),
        y: y + 120,
        angle: 200,
        duration: 600,
        ease: 'Quad.easeIn',
        onComplete: () => d.destroy(),
      });
    }
  }
  bumpAbove(block: Sprite) {
    const sb = block.body as SBody;
    for (const e of this.enemies.getChildren() as Sprite[]) {
      const eb = body(e);
      if (
        Math.abs(eb.bottom - sb.top) < 4 &&
        eb.right > sb.left &&
        eb.left < sb.right
      )
        this.killEnemy(e);
    }
    for (const item of this.items.getChildren() as Sprite[]) {
      const ib = body(item);
      if (
        ib.enable &&
        Math.abs(ib.bottom - sb.top) < 4 &&
        ib.right > sb.left &&
        ib.left < sb.right
      )
        item.setVelocityY(-200);
    }
  }
  spawnItem(block: Sprite, content: string) {
    const top = block.y - 12;
    const item = this.items.create(block.x, top, this.skin(content)) as Sprite;
    item.setData('kind', content).setDepth(5).setScale(0.3);
    const ib = body(item);
    ib.setAllowGravity(false).enable = false;
    this.tweens.add({
      targets: item,
      y: top - item.height / 2 - 1,
      scale: 1,
      duration: 380,
      ease: 'Sine.easeOut',
      onComplete: () => {
        if (!item.active) return;
        ib.enable = true;
        ib.reset(item.x, item.y);
        ib.setAllowGravity(true);
        const away = this.hero.x <= block.x ? 1 : -1;
        const dir = this.floorAhead(block.x, block.y + 12 + 3 * TILE, away)
          ? away
          : -away;
        item.setData('direction', dir).setData('spawnY', item.y);
        item.setVelocity(dir * 70, 0);
      },
    });
  }
  /** True when the floor beneath y continues for a few tiles towards dir. */
  floorAhead(x: number, y: number, dir: number) {
    const col = Math.floor(x / TILE);
    let row = Math.floor(y / TILE);
    while (row < this.L.rows && !this.standable(col, row)) row++;
    for (let k = 1; k <= 3; k++)
      if (!this.standable(col + dir * k, row)) return false;
    return true;
  }
  standable(col: number, row: number) {
    const ch = this.L.at(col, row);
    return (
      SOLID.has(ch) ||
      LEDGE.has(ch) ||
      ch === 'X' ||
      ch === 'D' ||
      ch === 'K' ||
      ch === 'M'
    );
  }
  /* ───────────────────────── Mechanics ───────────────────────── */
  bounce(s: Sprite) {
    const dish = s.getData('kind') === 'dish';
    const held =
      this.jumpWas || this.keys.SPACE.isDown || touch.jump || touch.stickJump;
    const v = dish
      ? held
        ? BOUNCE.dishHold
        : BOUNCE.dish
      : held
        ? BOUNCE.awningHold
        : BOUNCE.awning;
    this.hero.setVelocityY(-v);
    this.lastGround = -1000;
    this.riseVy = -v;
    sound.fx('bounce');
    this.tweens.add({
      targets: s,
      scaleY: 0.65,
      scaleX: 1.12,
      duration: 70,
      yoyo: true,
    });
    this.burst(
      this.hero.x,
      body(this.hero).bottom,
      dish ? 0xe8ecef : 0xffe0a0,
      6,
    );
  }
  crumble(c: Sprite) {
    if (c.getData('shaking')) return;
    c.setData('shaking', true);
    const home = c.getData('home');
    this.tweens.add({
      targets: c,
      x: home.x + 2,
      yoyo: true,
      repeat: 4,
      duration: 35,
    });
    this.time.delayedCall(360, () => {
      if (!c.active) return;
      (c.body as SBody).enable = false;
      sound.fx('crumble');
      this.burst(c.x, c.y, 0xa8743e, 8);
      this.tweens.add({
        targets: c,
        y: home.y + 220,
        angle: 25,
        alpha: 0,
        duration: 520,
        ease: 'Quad.easeIn',
      });
      this.time.delayedCall(2600, () => {
        if (!c.active) return;
        c.setPosition(home.x, home.y).setAngle(0).setAlpha(0);
        (c.body as SBody).enable = true;
        (c.body as SBody).reset(home.x, home.y);
        c.setData('shaking', false);
        this.tweens.add({ targets: c, alpha: 1, duration: 250 });
      });
    });
  }
  lightLantern(l: Lantern, announce = true) {
    if (l.lit) return;
    l.lit = true;
    l.img.setTexture('lantern-on');
    l.glow.setAlpha(0.85).setScale(1.3);
    this.tweens.add({
      targets: l.glow,
      scale: 1.45,
      alpha: 0.7,
      yoyo: true,
      repeat: -1,
      duration: 900,
      ease: 'Sine.inOut',
    });
    const radius = this.L.meta.lanternRadius ?? 0;
    let revealed = 0;
    for (const g of this.ghosts.getChildren() as Sprite[]) {
      const col = Math.floor(g.x / TILE),
        row = Math.floor((g.y + 6) / TILE),
        d = Math.hypot(col - l.col, row - l.row);
      if (g.getData('lit') || d > radius) continue;
      g.setData('lit', true);
      revealed++;
      (g.getData('hint') as Phaser.GameObjects.Image).setVisible(false);
      this.tweens.add({
        targets: g,
        alpha: 1,
        duration: 260,
        delay: announce ? d * 45 : 0,
      });
    }
    if (announce) {
      sound.fx('lantern');
      this.burst(l.img.x, l.img.y, 0xffd36b, 12);
      if (revealed && this.lanterns.filter((o) => o.lit).length === 1)
        toast('الفانوس نوّر سكة كانت مخفية!');
    }
  }
  /* ───────────────────────── Combat ───────────────────────── */
  burst(x: number, y: number, color: number, count = 7) {
    for (let i = 0; i < count; i++) {
      const p = this.add
        .image(x, y, 'particle')
        .setDepth(55)
        .setTint(color)
        .setScale(i % 3 === 0 ? 1 : 0.5);
      this.tweens.add({
        targets: p,
        x: x + Math.cos(i * 2.39) * (18 + i * 2),
        y: y - 10 - Math.sin(i * 1.7) * 24,
        alpha: 0,
        angle: i * 50,
        duration: 320 + i * 20,
        onComplete: () => p.destroy(),
      });
    }
  }
  killEnemy(e: Sprite) {
    if (!e.active) return;
    this.score += 200;
    this.kills++;
    this.burst(e.x, e.y, 0xe9b775, 10);
    this.popText(e.x, e.y - 18, '+٢٠٠');
    const ghost = this.add
      .image(e.x, e.y, e.texture.key)
      .setFlipY(true)
      .setDepth(20)
      .setTintFill(0xffffff);
    this.time.delayedCall(60, () => ghost.clearTint());
    this.tweens.add({
      targets: ghost,
      y: e.y - 35,
      alpha: 0,
      angle: 35,
      duration: 420,
      onComplete: () => ghost.destroy(),
    });
    this.cameras.main.shake(60, 0.0025);
    e.destroy();
    sound.fx('stomp');
    this.updateHud();
  }
  contact(e: Sprite) {
    if (this.mode !== 'play' || !e.active) return;
    const b = body(this.hero),
      eb = body(e);
    if (this.time.now < this.invincible) {
      this.killEnemy(e);
      return;
    }
    if (
      stomped(
        b.touching.down ? Math.max(1, b.velocity.y) : b.velocity.y,
        b.prev.y + b.height,
        eb.top,
      )
    ) {
      if (e.getData('kind') === 'basket') {
        if (e.getData('sleep')) {
          e.setData('sleep', false).setData('rolling', true);
          e.setVelocityX(this.hero.x < e.x ? 290 : -290);
          e.setTint(0xffd18a);
        } else {
          e.setData('sleep', true).setData('rolling', false);
          e.setVelocityX(0);
          e.setScale(1, 0.7);
        }
        sound.fx('stomp');
      } else this.killEnemy(e);
      this.hero.setVelocityY(this.jumpWas ? -420 : -300);
      this.burst(this.hero.x, this.hero.y + 14, 0xeed9a4, 5);
    } else if (e.getData('sleep')) {
      e.setData('sleep', false).setData('rolling', true);
      e.setVelocityX(this.hero.x < e.x ? 290 : -290);
      this.hurtUntil = this.time.now + 250;
    } else this.hurt();
  }
  hurt() {
    if (
      this.time.now < this.hurtUntil ||
      this.time.now < this.invincible ||
      this.mode !== 'play'
    )
      return;
    sound.fx('hurt');
    this.cameras.main.shake(140, 0.006);
    this.hero.setTintFill(0xffffff);
    this.time.delayedCall(70, () => this.hero?.active && this.hero.clearTint());
    if (this.power > 0) {
      this.setPower(0, false);
      this.hurtUntil = this.time.now + 1800;
      this.hurtPoseUntil = this.time.now + 240;
      this.burst(this.hero.x, this.hero.y, 0xe6b17a, 14);
    } else this.die();
  }
  die() {
    if (this.mode !== 'play') return;
    this.mode = 'dead';
    this.lives--;
    this.zip = null;
    body(this.hero).setAllowGravity(true);
    this.hero
      .setTexture(`hero-${this.power > 0 ? 'big' : 'small'}-dead`)
      .setData('pose', 'dead')
      .clearTint()
      .setAlpha(1);
    this.heroShadow.setVisible(false);
    this.hero.setVelocity(0, -250);
    this.hero.setDepth(30);
    body(this.hero).checkCollision.none = true;
    sound.fx('hurt');
    sound.setIntensity(0);
    this.updateHud();
    this.time.delayedCall(1100, () => {
      if (this.lives <= 0) {
        this.mode = 'over';
        this.physics.pause();
        screen('over');
      } else {
        this.power = 0;
        this.loadLevel();
        this.mode = 'play';
        this.physics.resume();
        toast(
          this.checkpoint ? 'راجع من علم الأمان' : 'لسه فيك نفس… جرّب تاني',
        );
      }
    });
  }
  complete() {
    if (this.mode !== 'play') return;
    this.mode = 'clear';
    this.physics.pause();
    const result = tally(
      Math.ceil(this.remaining),
      this.levelCoins,
      this.kills,
    );
    this.score += result.time;
    this.burst(this.hero.x, this.hero.y, 0xffd474, 30);
    sound.fx('clear');
    sound.setIntensity(0);
    this.updateHud();
    recordClear(this.level, this.score, this.levelCoins, this.secretFound);
    const row = (a: string, b: string, cls = '') =>
      `<div class="tally-row ${cls}"><span>${a}</span><strong>${b}</strong></div>`;
    const details =
      row('الفكة اللي لمّيتها', `${this.levelCoins} × ١٠٠`) +
      row('أعداء اتغلبت عليهم', `${this.kills} × ٢٠٠`) +
      row('مكافأة الوقت', `+${result.time}`) +
      row(
        'الفانوس الدهبي',
        this.secretFound ? 'لقيته! +١٠٠٠' : 'لسه مستخبّي…',
      ) +
      row('مجموعك', String(this.score), 'total');
    if (this.level < LEVELS.length - 1) {
      const next = LEVELS[this.level + 1];
      document.getElementById('clear-title')!.textContent =
        `${this.level + 1} · ${LEVELS[this.level].name}`;
      document.getElementById('next-name')!.textContent = `على ${next.name} ◀`;
      screen('clear', details);
    } else {
      this.mode = 'win';
      screen('win', details);
      try {
        const best = Number(localStorage.getItem('hawari-best') || 0);
        if (this.score > best)
          localStorage.setItem('hawari-best', String(this.score));
      } catch {
        /* Private browsing can disable local score storage. */
      }
    }
  }
  /* ───────────────────────── Boss ───────────────────────── */
  bossPhase() {
    const hp = this.bossState.hp;
    return hp > 4 ? 1 : hp > 2 ? 2 : 3;
  }
  bossSet(state: string, ms: number) {
    this.bossState.state = state;
    this.bossState.until = this.time.now + ms;
  }
  bossContact() {
    const boss = this.boss!,
      s = this.bossState;
    if (this.mode !== 'play' || s.defeated || !s.active) return;
    const b = body(this.hero),
      bb = body(boss);
    if (b.velocity.y > 0 && b.prev.y + b.height <= bb.top + 16) {
      this.hero.setVelocityY(-430);
      if (this.time.now >= s.invuln) this.bossDamage(1);
    } else if (this.time.now < this.invincible) {
      this.hero.setVelocityX(this.hero.x < boss.x ? -260 : 260);
    } else if (s.state !== 'hurt') {
      this.hurt();
      if (this.mode === 'play')
        this.hero.setVelocity(this.hero.x < boss.x ? -240 : 240, -260);
    }
  }
  bossChili() {
    const s = this.bossState;
    if (s.defeated || !s.active || this.time.now < s.invuln) return;
    s.chili++;
    this.boss!.setTintFill(0xffa040);
    this.time.delayedCall(60, () => this.boss?.active && this.boss.clearTint());
    // Chili is weaker than a stomp: two hits per heart.
    if (s.chili % 2 === 0) this.bossDamage(1);
    else sound.fx('fire');
  }
  bossDamage(n: number) {
    const s = this.bossState,
      boss = this.boss!;
    const before = this.bossPhase();
    s.hp = Math.max(0, s.hp - n);
    s.invuln = this.time.now + 1000;
    this.score += 500;
    sound.fx('boss-hit');
    this.cameras.main.shake(180, 0.01);
    boss.setTintFill(0xffffff);
    this.time.delayedCall(80, () => boss.active && boss.clearTint());
    // Hit-stop.
    this.physics.pause();
    this.time.delayedCall(
      70,
      () => this.mode === 'play' && this.physics.resume(),
    );
    this.popText(boss.x, boss.y - 40, '+٥٠٠', '#ffe08a');
    bossBar(true, s.hp / 6, this.bossPhase());
    if (s.hp <= 0) {
      this.bossDefeat();
      return;
    }
    if (this.bossPhase() !== before) {
      sound.bossPhase = this.bossPhase() - 1;
      sound.fx('roar');
      toast(
        this.bossPhase() === 2
          ? 'الفتوة برعي اتعصّب! بيرمي عضم سمك'
          : 'آخر نَفَس! نطّ فوق الرجّة',
      );
    }
    this.bossSet('hurt', 450);
    boss.setVelocity(boss.x < this.hero.x ? -200 : 200, -380);
  }
  bossDefeat() {
    const s = this.bossState,
      boss = this.boss!;
    s.defeated = true;
    this.bossSet('dead', 99999);
    boss.setTexture('boss-dead').setFlipY(true);
    body(boss).checkCollision.none = true;
    boss.setVelocity(0, -300);
    this.hazards.clear(true, true);
    this.burst(boss.x, boss.y, 0xffd474, 40);
    sound.fx('clear');
    sound.setTrack(this.level);
    sound.setIntensity(0);
    bossBar(false);
    toast('الفتوة برعي اتهزم! باب الخروج اتفتح');
    this.kills++;
    this.score += 3000;
    this.cameras.main.setBounds(0, 0, this.L.width + EDGE, this.L.height);
    this.exitDoor!.setVisible(true).setAlpha(0).setScale(1, 0.2);
    (
      this.children.getByName('exit-glow') as Phaser.GameObjects.Image | null
    )?.setVisible(true);
    this.tweens.add({
      targets: this.exitDoor,
      alpha: 1,
      scaleY: 1,
      duration: 600,
      ease: 'Back.out',
      delay: 500,
    });
  }
  updateBoss(time: number) {
    const boss = this.boss!,
      s = this.bossState,
      bb = body(boss);
    if (s.defeated) {
      if (boss.y > this.L.height + 200) boss.destroy();
      return;
    }
    if (!s.active) {
      boss.setTexture('boss-idle' + (Math.floor(time / 400) % 2));
      if (this.hero.x > s.arenaX + TILE * 3) {
        s.active = true;
        this.cameras.main.setBounds(
          s.arenaX,
          0,
          this.L.width - s.arenaX,
          this.L.height,
        );
        sound.setTrack(4);
        sound.fx('roar');
        bossBar(true, 1, 1);
        toast('الفتوة برعي: «مين اللي داخل حارتي؟!» — اتنطّ على راسه');
        this.bossSet('walk', 1600);
        this.cameras.main.shake(300, 0.006);
      }
      return;
    }
    const phase = this.bossPhase();
    const grounded = bb.blocked.down;
    const toHero = Math.sign(this.hero.x - boss.x) || 1;
    if (s.state !== 'leap' && s.state !== 'hurt') boss.setFlipX(toHero < 0);
    const over = time > s.until;
    switch (s.state) {
      case 'walk':
        boss.setTexture('boss-idle' + (Math.floor(time / 180) % 2));
        boss.setVelocityX(toHero * (phase === 3 ? 95 : 62));
        if (over) {
          boss.setVelocityX(0);
          if (phase === 1) this.bossSet('telegraph', 650);
          else if (phase === 2) {
            s.volley = 3;
            this.bossSet('throw', 350);
          } else this.bossSet('slamUp', 200);
        }
        break;
      case 'throw':
        boss.setTexture('boss-throw');
        boss.setVelocityX(0);
        if (over) {
          if (s.volley > 0) {
            this.throwBone(boss, phase);
            s.volley--;
            this.bossSet('throw', phase === 3 ? 260 : 380);
          } else this.bossSet('telegraph', phase === 3 ? 450 : 600);
        }
        break;
      case 'slamUp':
        boss.setTexture('boss-crouch');
        if (grounded && over) {
          boss.setVelocity(0, -620);
          boss.setTexture('boss-leap');
          this.bossSet('slam', 2000);
        }
        break;
      case 'slam':
        if (grounded && bb.velocity.y >= 0 && time > s.until - 1800) {
          sound.fx('shock');
          this.cameras.main.shake(220, 0.012);
          for (const d of [-1, 1]) {
            const w = this.hazards.create(
              boss.x + d * 30,
              bb.bottom - 9,
              'shock',
            ) as Sprite;
            body(w).setAllowGravity(false).setSize(26, 14).setOffset(4, 4);
            w.setVelocityX(d * 230)
              .setData('kind', 'shock')
              .setData('born', time)
              .setDepth(9)
              .setFlipX(d < 0);
          }
          s.volley = 4;
          this.bossSet('throw', 500);
        }
        break;
      case 'telegraph':
        boss.setTexture('boss-crouch');
        boss.setVelocityX(0);
        boss.setTint(Math.floor(time / 80) % 2 ? 0xff9a7a : 0xffffff);
        if (over) {
          boss.clearTint();
          const dx = Phaser.Math.Clamp(
            (this.hero.x - boss.x) / 0.95,
            -300,
            300,
          );
          boss.setVelocity(dx, phase === 3 ? -600 : -540);
          boss.setTexture('boss-leap');
          sound.fx('roar');
          this.bossSet('leap', 2000);
        }
        break;
      case 'leap':
        if (grounded && bb.velocity.y >= 0 && time > s.until - 1850) {
          boss.setVelocityX(0);
          this.cameras.main.shake(120, 0.006);
          this.burst(boss.x, bb.bottom, 0xb8a888, 10);
          this.bossSet('dazed', phase === 1 ? 1600 : phase === 2 ? 1300 : 1050);
        }
        break;
      case 'dazed':
        boss.setTexture('boss-dazed');
        boss.setVelocityX(0);
        if (Math.floor(time / 120) % 3 === 0) {
          const st = this.add
            .image(boss.x + Math.cos(time / 150) * 22, boss.y - 38, 'star')
            .setDepth(20);
          this.tweens.add({
            targets: st,
            alpha: 0,
            y: st.y - 8,
            duration: 300,
            onComplete: () => st.destroy(),
          });
        }
        if (over) this.bossSet('walk', phase === 3 ? 900 : 1300);
        break;
      case 'hurt':
        boss.setTexture('boss-hurt');
        if (over && grounded) {
          boss.setVelocityX(0);
          this.bossSet('walk', 700);
        }
        break;
    }
    if (boss.x < s.arenaX + 40) boss.x = s.arenaX + 40;
    if (boss.x > this.L.width - 40) boss.x = this.L.width - 40;
    for (const h of this.hazards.getChildren() as Sprite[]) {
      const k = h.getData('kind');
      if (
        k === 'shock' &&
        (time - h.getData('born') > 2600 ||
          body(h).blocked.left ||
          body(h).blocked.right)
      )
        h.destroy();
      else if (k === 'bone') {
        h.angle += 12;
        if (h.y > this.L.height + 40) h.destroy();
      }
    }
  }
  throwBone(boss: Sprite, phase: number) {
    const bone = this.hazards.create(boss.x, boss.y - 20, 'bone') as Sprite;
    const dx = this.hero.x - boss.x;
    bone.setVelocity(
      Phaser.Math.Clamp(dx / 1.05, -320, 320) +
        (Math.random() - 0.5) * 40 * phase,
      -380,
    );
    bone.setData('kind', 'bone').setDepth(9);
    body(bone).setSize(14, 8);
    sound.fx('fire');
  }
  /* ───────────────────────── View ───────────────────────── */
  fitView() {
    const cam = this.cameras.main;
    const w = this.scale.gameSize.width,
      h = this.scale.gameSize.height;
    cam.setSize(w, h);
    for (const l of this.layers) l.setSize(w, 360);
    if (this.dark) this.dark.resize(w, h);
  }
  updateDarkness() {
    const rt = this.dark;
    if (!rt) return;
    const cam = this.cameras.main,
      sx = cam.scrollX,
      sy = cam.scrollY;
    rt.clear();
    rt.fill(0x05061a, this.L.meta.dark);
    const light = (x: number, y: number, r: number, a = 1) => {
      if (
        x + r < sx ||
        x - r > sx + cam.width ||
        y + r < sy ||
        y - r > sy + cam.height
      )
        return;
      rt.stamp('light', undefined, x - sx, y - sy, {
        scale: (r * 2) / 256,
        alpha: a,
        erase: true,
      });
    };
    light(this.hero.x, this.hero.y, 120 + Math.sin(this.clock * 3) * 3);
    const radius = (this.L.meta.lanternRadius ?? 4) * TILE;
    for (const l of this.lanterns)
      light(l.img.x, l.img.y, l.lit ? radius * 1.05 : 46, l.lit ? 1 : 0.7);
    if (this.secret?.active) light(this.secret.x, this.secret.y, 60, 0.9);
    if (this.exitDoor?.visible)
      light(this.exitDoor.x, this.exitDoor.y - 50, 110);
    if (this.flag)
      light(this.flag.x, this.flag.y - 40, this.checkpoint ? 120 : 50, 0.8);
    if (this.water)
      light((this.water.x0 + this.water.x1) / 2, this.water.y, 170, 0.7);
    if (this.boss?.active && this.bossState.active)
      light(this.boss.x, this.boss.y, 170);
    for (const s of this.shots.getChildren() as Sprite[])
      light(s.x, s.y, 50, 0.9);
    for (const m of this.moverList) light(m.img.x + 24, m.img.y, 60, 0.6);
  }
  updateWorld(time: number, dt: number) {
    const cam = this.cameras.main;
    const maxY = Math.max(0, this.L.height - cam.height);
    for (const l of this.layers) {
      const f = l.getData('factor') as number,
        name = l.getData('name');
      if (name === 'near' || name === 'backdrop') {
        l.tilePositionX = cam.scrollX * f;
        l.y = 0;
      } else if (name === 'sky') {
        l.tilePositionX = cam.scrollX * f + this.clock * 2;
        l.y = 0;
        l.setScale(1, Math.max(1, cam.height / 360));
      } else {
        l.tilePositionX = cam.scrollX * f;
        // Climbing lowers the skyline so the sky opens up above.
        l.y = cam.height - 360 + Math.min(320, (maxY - cam.scrollY) * f * 0.6);
      }
    }
    this.ambient?.setPosition(
      cam.scrollX + cam.width / 2,
      cam.scrollY + (this.L.meta.theme === 'sewer' ? 20 : cam.height / 2),
    );
    const shine = this.skin(Math.floor(time / 140) % 10 < 2 ? 'box1' : 'box');
    for (const obj of this.blocks.getChildren() as Sprite[])
      if (obj.getData('kind') === 'box' && obj.texture.key !== shine)
        obj.setTexture(shine);
    for (const obj of this.coins.getChildren() as Sprite[])
      obj.setTexture(
        this.skin('coin' + (Math.floor(time / 100 + obj.getData('phase')) % 6)),
      );
    // Ride carts and planks: carry the hero by the platform's own step.
    if (this.mode === 'play' && !this.zip) {
      const hb = body(this.hero);
      const on = this.moverList.find((m) => {
        const mb = body(m.img);
        return (
          m.axis === 'x' &&
          Math.abs(hb.bottom - mb.top) < 3 &&
          hb.right > mb.left + 2 &&
          hb.left < mb.right - 2
        );
      });
      if (on && hb.velocity.y >= 0) this.hero.x += body(on.img).velocity.x * dt;
    }
    for (const m of this.moverList) {
      const b = body(m.img);
      if (m.axis === 'x') {
        if (m.img.x <= m.min && b.velocity.x <= 0) b.setVelocityX(m.speed);
        if (m.img.x >= m.max && b.velocity.x >= 0) b.setVelocityX(-m.speed);
      } else {
        if (m.img.y <= m.min && b.velocity.y <= 0) b.setVelocityY(m.speed);
        if (m.img.y >= m.max && b.velocity.y >= 0) b.setVelocityY(-m.speed);
      }
      if (m.chains && m.chainTop !== undefined)
        for (const c of m.chains)
          c.setSize(4, Math.max(4, m.img.y - m.chainTop));
      m.steam?.setPosition(m.img.x + 53, m.img.y - 2);
    }
    if (this.water) {
      this.water.top.tilePositionX = this.clock * 20;
      this.water.top.y = this.water.y;
      this.water.fill.y = this.water.y + 14;
    }
    this.updateDarkness();
    void dt;
  }
  update(time: number, delta: number) {
    const dt = Math.min(delta, 35) / 1000;
    this.clock += dt;
    if (!this.hero) return;
    this.updateWorld(time, dt);
    if (this.mode === 'title' || this.mode === 'map') {
      this.animateHero(time, true, 0, false);
      return;
    }
    if (this.mode !== 'play') return;
    this.elapsed += dt;
    this.remaining -= dt;
    if (this.remaining <= 0) {
      this.die();
      return;
    }
    const left = this.keys.LEFT.isDown || this.keys.A.isDown || touch.left,
      right = this.keys.RIGHT.isDown || this.keys.D.isDown || touch.right;
    const jump =
      this.keys.SPACE.isDown ||
      this.keys.Z.isDown ||
      this.keys.UP.isDown ||
      this.keys.W.isDown ||
      touch.jump ||
      touch.stickJump;
    const keyAction = this.keys.X.isDown || this.keys.SHIFT.isDown,
      action = keyAction || touch.run,
      throwing = keyAction || touch.throw,
      down = this.keys.DOWN.isDown || this.keys.S.isDown || touch.down;
    const b = body(this.hero);
    const grounded = b.blocked.down || b.touching.down;
    if (grounded) this.lastGround = time;
    if (jump && !this.jumpWas) this.lastPress = time;
    // Wind gusts: 2.6 s on, 1.6 s off.
    const gust = this.L.wind.length > 0 && time % 4200 < 2600;
    if (gust !== this.windOn) {
      this.windOn = gust;
      this.windEmitters.forEach((e) => (gust ? e.start() : e.stop()));
      if (
        gust &&
        this.L.wind.some((w) => Math.abs(this.hero.y - (w.y0 + w.y1) / 2) < 300)
      )
        sound.fx('wind');
    }
    let windPush = 0;
    if (gust)
      for (const w of this.L.wind)
        if (
          this.hero.x > w.x0 &&
          this.hero.x < w.x1 &&
          this.hero.y > w.y0 &&
          this.hero.y < w.y1
        )
          windPush = w.dir * 150;
    const dir = Number(right) - Number(left);
    if (this.zip) this.updateZip(time, jump);
    else {
      if (!grounded && time > this.zipCooldown) this.tryGrab();
      if (
        !this.zip &&
        jumpAllowed(time - this.lastGround, time - this.lastPress)
      ) {
        this.hero.setVelocityY(action ? -PHYSICS.runJump : -PHYSICS.jump);
        this.lastGround = -1000;
        this.lastPress = -1000;
        sound.fx('jump');
        this.burst(this.hero.x, this.hero.y + 17, 0xdcb08a, 5);
      }
      if (
        !jump &&
        this.jumpWas &&
        b.velocity.y < -180 &&
        b.velocity.y > -PHYSICS.runJump - 5
      )
        this.hero.setVelocityY(b.velocity.y * 0.48);
      const speed = action ? 245 : 157;
      b.velocity.x = approach(
        b.velocity.x,
        dir * speed + windPush,
        (dir ? 1000 : grounded ? 1400 : 450) * dt,
      );
      const skid =
        dir && Math.sign(b.velocity.x) !== dir && Math.abs(b.velocity.x) > 50;
      if (dir && !skid) this.facing = dir;
      // Hold down on a one-way ledge to drop through it.
      if (down && grounded) {
        if (!this.downWas) this.downSince = time;
        if (time - this.downSince > 280 && this.onOneWay()) {
          this.dropUntil = time + 240;
          this.downSince = time + 10000;
        }
      }
    }
    this.hero.setFlipX(this.facing < 0);
    this.animateHero(time, grounded && !this.zip, dir, down);
    if (time < this.invincible) {
      this.hero.setTint(
        [0xffcc79, 0x8ee9cb, 0xffffff][Math.floor(time / 100) % 3],
      );
      if (Math.floor(time / 80) % 2 === 0)
        this.burst(this.hero.x, this.hero.y, 0x9fe3c4, 1);
    } else if (time < this.hurtUntil)
      this.hero.setAlpha(Math.floor(time / 90) % 2 === 0 ? 0.45 : 1);
    else this.hero.setAlpha(1);
    this.heroGlow.setPosition(this.hero.x, this.hero.y);
    if (
      throwing &&
      !this.actionWas &&
      this.power === 2 &&
      time - this.lastShot > 280
    ) {
      this.lastShot = time;
      this.throwUntil = time + 220;
      const shot = this.shots.create(
        this.hero.x + this.facing * 18,
        this.hero.y - 3,
        'fire',
      ) as Sprite;
      shot
        .setVelocity(this.facing * 350, 110)
        .setData('born', time)
        .setDepth(9);
      body(shot).setAllowGravity(true).setGravityY(-600);
      sound.fx('fire');
    }
    for (const s of this.shots.getChildren() as Sprite[])
      if (time - s.getData('born') > 1800) s.destroy();
    let near = false;
    for (const e of this.enemies.getChildren() as Sprite[]) {
      if (e.y > this.L.height + 60) {
        e.destroy();
        continue;
      }
      if (
        Math.abs(e.x - this.hero.x) < 220 &&
        Math.abs(e.y - this.hero.y) < 160
      )
        near = true;
      this.updateEnemy(e, time);
    }
    this.updateItems();
    if (this.boss?.active) this.updateBoss(time);
    for (const l of this.lanterns)
      if (
        !l.lit &&
        Math.abs(l.img.x - this.hero.x) < 34 &&
        Math.abs(l.img.y - this.hero.y) < 46
      )
        this.lightLantern(l);
    if (
      this.secret?.active &&
      Math.abs(this.secret.x - this.hero.x) < 22 &&
      Math.abs(this.secret.y - this.hero.y) < 34
    )
      this.findSecret();
    if (this.fakeRect) {
      const inside = this.fakeRect.contains(this.hero.x, this.hero.y);
      for (const f of this.fakes)
        f.setAlpha(approach(f.alpha, inside ? 0.22 : 1, dt * 4));
    }
    if (this.L.tank && down && !this.downWas && grounded) this.useTank();
    let intensity = near ? 1 : 0;
    if (this.water) {
      const w = this.water;
      const inShaft = this.hero.x > w.x0 && this.hero.x < w.x1;
      if (!w.active && this.hero.x > w.trigger && inShaft) {
        w.active = true;
        toast('المية طالعة! اطلع بسرعة');
        sound.fx('splash');
        this.cameras.main.shake(250, 0.005);
      }
      if (w.active && w.y > w.stop) w.y = Math.max(w.stop, w.y - w.speed * dt);
      if (w.active && inShaft && w.y > w.stop) intensity = 2;
      if (inShaft && b.bottom > w.y + 10) {
        sound.fx('splash');
        this.die();
        return;
      }
    }
    if (this.remaining < 100) intensity = Math.max(intensity, 2);
    if (!this.bossState.active || this.bossState.defeated)
      sound.setIntensity(intensity);
    const cp = this.spec.checkpoint;
    if (
      this.L.checkpoint &&
      !this.checkpoint &&
      Math.abs(this.hero.x - cp.x) < 20 &&
      Math.abs(b.bottom - cp.y) < 30
    ) {
      this.checkpoint = true;
      this.flag?.setTexture('checkpoint-lit');
      this.burst(cp.x, cp.y - 50, 0xffd36b, 16);
      toast('علم الأمان اترفع — هترجع هنا لو وقعت');
      sound.fx('checkpoint');
    }
    if (
      this.exitDoor?.visible &&
      Math.abs(this.hero.x - this.spec.exit.x) < 18 &&
      Math.abs(b.bottom - this.spec.exit.y) < 30
    )
      this.complete();
    if (this.hero.x < 12) this.hero.x = 12;
    if (this.hero.x > this.L.width - 12) this.hero.x = this.L.width - 12;
    if (this.hero.y > this.L.height + 60) this.die();
    this.riseVy = body(this.hero).velocity.y;
    this.jumpWas = jump;
    this.actionWas = throwing;
    this.downWas = down;
    this.updateHud();
  }
  findSecret() {
    const s = this.secret!;
    this.secretFound = true;
    this.score += 1000;
    recordSecret(this.level);
    sound.fx('secret');
    this.burst(s.x, s.y, 0xffd23f, 24);
    this.popText(s.x, s.y - 20, 'الفانوس الدهبي! +١٠٠٠', '#ffe08a');
    toast('لقيت الفانوس الدهبي — سرّ المرحلة!');
    s.destroy();
    this.secretGlow?.destroy();
    this.updateHud();
  }
  useTank() {
    const t = this.blocks
      .getChildren()
      .find((s) => (s as Sprite).getData('kind') === 'tank') as
      Sprite | undefined;
    if (
      !t ||
      t.getData('used') ||
      Math.abs(t.x - this.hero.x) > 24 ||
      body(this.hero).bottom > t.y - 20
    )
      return;
    t.setData('used', true);
    toast('خزان الفكة! لمّ بسرعة');
    sound.fx('secret');
    for (let i = 0; i < 10; i++) {
      const c = this.items.create(t.x, t.y - 34, this.skin('coin1')) as Sprite;
      c.setData('kind', 'coin')
        .setData('settled', true)
        .setVelocity((i - 4.5) * 34, -330 - (i % 3) * 40)
        .setDepth(6);
    }
  }
  onOneWay() {
    const b = body(this.hero);
    const ch = this.L.at(
      Math.floor(b.center.x / TILE),
      Math.floor((b.bottom + 2) / TILE),
    );
    return ch === '-' || ch === '~';
  }
  lineAt(i: number) {
    const ln = this.L.lines[i];
    return { ax: ln.a.x, ay: ln.a.y - 10, bx: ln.b.x, by: ln.b.y - 10 };
  }
  tryGrab() {
    const b = body(this.hero);
    const hand = b.top - 2;
    for (let i = 0; i < this.L.lines.length; i++) {
      const { ax, ay, bx, by } = this.lineAt(i);
      const x = this.hero.x;
      if (x < Math.min(ax, bx) + 4 || x > Math.max(ax, bx) - 4) continue;
      const ly = ay + ((by - ay) * (x - ax)) / (bx - ax);
      if (Math.abs(hand - ly) < 14) {
        this.zip = { line: i, dir: Math.sign(bx - ax) };
        b.setAllowGravity(false);
        this.facing = this.zip.dir;
        sound.fx('zip');
        return;
      }
    }
  }
  updateZip(time: number, jump: boolean) {
    const zip = this.zip!,
      b = body(this.hero);
    const { ax, ay, bx, by } = this.lineAt(zip.line);
    const slope = (by - ay) / (bx - ax);
    const vx = zip.dir * 235;
    const ly = ay + slope * (this.hero.x - ax);
    // Hands stay on the rope: the body top hangs just under the line.
    b.setVelocity(vx, slope * vx + (ly + 2 - b.top) * 12);
    if (Math.floor(time / 50) % 3 === 0)
      this.burst(this.hero.x, b.top, 0xffffff, 1);
    const release = (vy: number) => {
      this.zip = null;
      this.zipCooldown = time + 380;
      b.setAllowGravity(true);
      b.setVelocity(vx * 0.85, vy);
    };
    if (jump && !this.jumpWas) {
      release(-PHYSICS.jump * 0.85);
      sound.fx('jump');
    } else if (
      (zip.dir > 0 && this.hero.x >= bx - 6) ||
      (zip.dir < 0 && this.hero.x <= bx + 6)
    )
      release(0);
    else if (b.blocked.left || b.blocked.right || b.blocked.down) release(0);
  }
  updateEnemy(e: Sprite, time: number) {
    const eb = body(e),
      kind = e.getData('kind') as string,
      home = e.getData('home') as { x: number; y: number },
      state = e.getData('state') as string,
      dx = this.hero.x - e.x,
      dy = this.hero.y - e.y;
    const frame = (n: number) => e.setTexture(kind + n);
    const dist = (x: number, y: number) =>
      Phaser.Math.Distance.Between(e.x, e.y, x, y);
    if (kind === 'bat') {
      // Perches, swoops at where the hero was, flaps back home.
      if (state === 'perch') {
        frame(0);
        eb.setVelocity(0, 0);
        if (
          Math.abs(dx) < 170 &&
          dy > -10 &&
          dy < 220 &&
          time > e.getData('until')
        ) {
          e.setData('state', 'swoop').setData('until', time + 1300);
          e.setData('target', { x: this.hero.x, y: this.hero.y });
        }
      } else if (state === 'swoop') {
        const t = e.getData('target');
        this.physics.moveTo(e, t.x, t.y, 190);
        frame(1 + (Math.floor(time / 80) % 3));
        if (time > e.getData('until') || dist(t.x, t.y) < 10)
          e.setData('state', 'return');
      } else {
        this.physics.moveTo(e, home.x, home.y, 120);
        frame(1 + (Math.floor(time / 100) % 3));
        if (dist(home.x, home.y) < 6) {
          e.setPosition(home.x, home.y);
          e.setData('state', 'perch').setData('until', time + 900);
        }
      }
      e.setFlipX(eb.velocity.x > 0);
      return;
    }
    if (kind === 'pigeon') {
      // Hovers on a figure-eight, dives at the hero, climbs back.
      const seed = e.getData('seed');
      if (state === 'walk') {
        const tx = home.x + Math.sin(time / 900 + seed) * 34,
          ty = home.y + Math.sin(time / 420 + seed) * 8;
        eb.setVelocity((tx - e.x) * 4, (ty - e.y) * 4);
        frame(Math.floor(time / 90) % 3);
        if (
          Math.abs(dx) < 130 &&
          dy > 10 &&
          dy < 230 &&
          time > e.getData('until')
        ) {
          e.setData('state', 'dive').setData('until', time + 900);
          this.physics.moveTo(e, this.hero.x, this.hero.y, 235);
        }
      } else if (state === 'dive') {
        frame(3);
        if (time > e.getData('until') || eb.blocked.down)
          e.setData('state', 'climb');
      } else {
        this.physics.moveTo(e, home.x, home.y, 130);
        frame(Math.floor(time / 70) % 3);
        if (dist(home.x, home.y) < 8)
          e.setData('state', 'walk').setData('until', time + 1200);
      }
      e.setFlipX(eb.velocity.x < 0);
      return;
    }
    if (e.getData('sleep')) return;
    const rolling = e.getData('rolling');
    if (kind === 'rooster') {
      // Spots you, scratches the ground (telegraph), charges, gets dizzy.
      if (
        state === 'walk' &&
        Math.abs(dy) < 34 &&
        Math.abs(dx) < 170 &&
        time > e.getData('until')
      ) {
        e.setData('state', 'tell')
          .setData('until', time + 450)
          .setData('dir', Math.sign(dx) || 1);
        e.setVelocityX(0);
        return;
      }
      if (state === 'tell') {
        frame(2);
        e.setVelocityX(Math.sin(time / 20) * 20);
        e.setFlipX(e.getData('dir') > 0);
        if (time > e.getData('until'))
          e.setData('state', 'charge').setData('until', time + 1300);
        return;
      }
      if (state === 'charge') {
        frame(2);
        const d = e.getData('dir');
        e.setVelocityX(d * 240);
        e.setFlipX(d > 0);
        const ahead = this.standable(
          Math.floor((e.x + d * 16) / TILE),
          Math.floor((eb.bottom + 2) / TILE),
        );
        if (
          time > e.getData('until') ||
          eb.blocked.left ||
          eb.blocked.right ||
          (eb.blocked.down && !ahead)
        ) {
          e.setVelocityX(0);
          e.setData('state', 'dizzy').setData('until', time + 950);
          this.burst(e.x, e.y - 12, 0xffe36a, 4);
        }
        return;
      }
      if (state === 'dizzy') {
        frame(3);
        e.setVelocityX(0);
        if (time > e.getData('until')) {
          e.setData('state', 'walk').setData('until', time + 800);
          e.setVelocityX(-(e.getData('dir') || 1) * this.walkSpeed(kind));
        }
        return;
      }
    }
    let direction = Math.sign(eb.velocity.x) || -1;
    if (eb.blocked.left) direction = 1;
    if (eb.blocked.right) direction = -1;
    if (eb.blocked.down && !rolling) {
      const col = Math.floor((e.x + direction * 14) / TILE),
        row = Math.floor((eb.bottom + 2) / TILE);
      if (!this.standable(col, row)) direction *= -1;
    }
    e.setVelocityX(direction * (rolling ? 290 : this.walkSpeed(kind)));
    if (kind === 'rat' && eb.blocked.down && time > e.getData('until')) {
      e.setData('until', time + 1400 + hash(time, e.x) * 1400);
      e.setVelocityY(-250);
    }
    e.setFlipX(direction > 0);
    frame(
      kind === 'rooster'
        ? Math.floor(time / 160) % 2
        : Math.floor(time / (rolling ? 45 : kind === 'rat' ? 70 : 150)) % 4,
    );
  }
  updateItems() {
    for (const item of this.items.getChildren() as Sprite[]) {
      const ib = body(item);
      if (!ib.enable) continue;
      if (item.y > this.L.height + 60) {
        item.destroy();
        continue;
      }
      if (item.getData('settled')) {
        if (ib.blocked.down) item.setVelocityX(0);
        if (item.getData('kind') === 'invincible' && ib.blocked.down)
          item.setVelocityY(-160);
        continue;
      }
      if (item.y > item.getData('spawnY') + 12) item.setData('airborne', true);
      if (item.getData('airborne') && ib.blocked.down) {
        item.setData('settled', true).setVelocityX(0);
        continue;
      }
      let d = item.getData('direction') || 1;
      if (ib.blocked.left) d = 1;
      if (ib.blocked.right) d = -1;
      item.setData('direction', d).setVelocityX(d * 70);
    }
  }
}
