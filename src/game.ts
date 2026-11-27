import { hasAdminAccess } from './admin';
import type { LandmarkState } from './landmark-world';
import Phaser from 'phaser';
import { skinKey } from './skins';
import { makeArt } from './art';
import { isW5 } from './world5-art';
import { isW6 } from './world6-art';
import { type Sail } from './sail';
import { type Crane } from './crane';
import { isW7 } from './world7-art';
import { isW8 } from './world8-art';
import { type W8 } from './world8';

import { type W5 } from './world5';
import { type W4 } from './world4';
import { type W3 } from './world3';

import { tally } from './rules';
import { INVULN_MS, SPAWN_CLEAR } from './weapons';
import { LEVELS, TILE, WORLDS } from './level-data';
import {
  BIRD_TELL_MS,
  BOUNCE,
  FLYING,
  LEDGE,
  SOLID,
  type Parsed,
} from './level-parse';
import { sound } from './audio';
import {
  bindUI,
  bossBar,
  ending,
  refreshJourney,
  renderMap,
  screen,
  toast,
  touch,
} from './ui';
import { clearResume, loadProgress, recordClear, saveResume } from './progress';
import {
  getPlayer,
  needsLogin,
  pullProgress,
  restoreSession,
  continueLocally,
  logout,
  takeSessionLost,
} from './account';
import {
  buildProps as buildPropsImpl,
  buildFarm as buildFarmImpl,
  saqiaPos as saqiaPosImpl,
  canalAt as canalAtImpl,
} from './props';
import {
  buildAtmosphere as buildAtmosphereImpl,
  buildColliders as buildCollidersImpl,
} from './world-build';
import {
  enemy as enemyImpl,
  walkSpeed as walkSpeedImpl,
  bossKind as bossKindImpl,
  bossMax as bossMaxImpl,
  bossName as bossNameImpl,
  bossTex as bossTexImpl,
  makeBoss as makeBossImpl,
} from './enemies-build';
import { loadLevel as loadLevelImpl } from './level-build';
import {
  fitHeroBody as fitHeroBodyImpl,
  solidsNear as solidsNearImpl,
  animateHero as animateHeroImpl,
  updateHud as updateHudImpl,
  weapon as weaponImpl,
  grantIframes as grantIframesImpl,
  unstickHero as unstickHeroImpl,
  spawnX as spawnXImpl,
} from './hero';
import {
  bossPhase as bossPhaseImpl,
  bossSet as bossSetImpl,
  bossContact as bossContactImpl,
  bossChili as bossChiliImpl,
  bossDamage as bossDamageImpl,
  bossDefeat as bossDefeatImpl,
  updateBoss as updateBossImpl,
  crabContact as crabContactImpl,
  updateCrab as updateCrabImpl,
  spitBubbles as spitBubblesImpl,
  crabWave as crabWaveImpl,
  bossRange as bossRangeImpl,
  clampBoss as clampBossImpl,
  frameBossFight as frameBossFightImpl,
} from './boss';
import {
  headBump as headBumpImpl,
  hitBlock as hitBlockImpl,
  openArmory as openArmoryImpl,
  debris as debrisImpl,
  bumpAbove as bumpAboveImpl,
  spawnItem as spawnItemImpl,
} from './blocks';
import {
  contact as contactImpl,
  die as dieImpl,
  hurt as hurtImpl,
} from './damage';
import {
  dropClods as dropClodsImpl,
  throwBone as throwBoneImpl,
  updateBuffalo as updateBuffaloImpl,
  updateHazards as updateHazardsImpl,
} from './hazards';
import { updateEnemy as updateEnemyImpl } from './enemy-update';
import { updateGame as updateGameImpl } from './game-loop';
import {
  fitView as fitViewImpl,
  updateDarkness as updateDarknessImpl,
  updateWorld as updateWorldImpl,
} from './world-update';
import {
  findSecret as findSecretImpl,
  lineAt as lineAtImpl,
  onOneWay as onOneWayImpl,
  tryGrab as tryGrabImpl,
  updateZip as updateZipImpl,
  useTank as useTankImpl,
} from './grab';
import {
  body,
  coarse,
  enterFullscreen,
  lockLandscape,
  oneWay,
  armFirstTapFullscreen,
} from './game-shared';
import type {
  Canal,
  Lantern,
  Mode,
  Mover,
  SBody,
  Sprite,
  Water,
} from './game-shared';

export class Alley extends Phaser.Scene {
  L!: Parsed;
  hero!: Sprite;
  heroShadow!: Phaser.GameObjects.Image;
  heroGlow!: Phaser.GameObjects.Image;
  /** Handheld tomb lantern and its pre-rendered facing-biased glow. */
  heldLantern?: Phaser.GameObjects.Image;
  heldLanternGlow?: Phaser.GameObjects.Image;
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
  canals: Canal[] = [];
  /** World 3 mechanics (belts, lamps, stacks, boats, nets, sea). */
  w3?: W3;
  /** World 4 mechanics (waves, tram, umbrellas, storm). */
  w4?: W4;
  /** World 5 mechanics (doors, pillars, sand, balloons, torches). */
  w5?: W5;
  /** Extra darkness laid over the level (0..1). */
  darkBoost = 0;
  wheels: Phaser.GameObjects.Image[] = [];
  swimming = false;
  onMud = false;
  hints = new Set<string>();
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
  /** Invisible point the camera follows during a boss fight. */
  camFocus?: Phaser.GameObjects.Zone;
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
  /** World 7: hooks, slung containers, the chase magnet. */
  crane?: Crane;
  zipCooldown = 0;
  /** Standing on a swinging lamp or a bobbing boat this frame. */
  riding = false;
  /** Aswan's felucca voyage (the cataract level). */
  sail?: Sail;
  /** World 8 (سيوة): thirst, dunes, camels, board, storm. */
  siwa?: W8;
  landmark?: LandmarkState;
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
  lastStroke = 0;
  lastBump = 0;
  /** What last cost a life or a power tier, for tests and toasts. */
  lastHurtBy = '';
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
    this.load.image('backdrop-0', 'bg/l1.webp');
    // Drawn creature art (bosses, enemies): replaces the procedural frames
    // with the same keys and sizes; see scripts/art.
    if (!location.search.includes('oldart')) {
      this.load.image('sprites', 'sprites/creatures.png');
      this.load.json('sprites-map', 'sprites/creatures.json');
    }
  }
  create() {
    makeArt(this);
    this.keys = this.input.keyboard!.addKeys(
      'LEFT,RIGHT,UP,DOWN,A,D,W,S,Z,X,SPACE,SHIFT,ESC,ENTER,M',
      false,
    ) as Record<string, Phaser.Input.Keyboard.Key>;
    this.input.keyboard!.addCapture(['SPACE', 'UP', 'DOWN', 'LEFT', 'RIGHT']);
    const lifetime = new AbortController();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => lifetime.abort());
    // Let letters and spaces reach the name field while typing.
    const kb = this.input.keyboard!;
    document.addEventListener(
      'focusin',
      (e) => {
        if ((e.target as HTMLElement).matches?.('input, textarea'))
          kb.disableGlobalCapture();
      },
      { signal: lifetime.signal },
    );
    document.addEventListener('focusout', () => kb.enableGlobalCapture(), {
      signal: lifetime.signal,
    });
    bindUI((a) => this.action(a));
    this.input.keyboard!.on('keydown-ESC', () => this.action('pause'));
    this.input.keyboard!.on('keydown-ENTER', () => {
      if (document.body.classList.contains('update-open')) return;
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
    armFirstTapFullscreen();
    // Restore the saved identity before deciding to offer sign-in.
    screen('title');
    void this.bootSession();
    document.addEventListener(
      'visibilitychange',
      () => {
        if (document.hidden && this.mode === 'play') {
          this.stashRun();
          this.action('pause');
        }
      },
      { signal: lifetime.signal },
    );
    window.addEventListener('pagehide', () => this.stashRun(), {
      signal: lifetime.signal,
    });
  }
  /* ───────────────────────── Flow ───────────────────────── */
  action(action: string) {
    if (action.startsWith('play-')) {
      const n = Number(action.slice(5));
      if (!Number.isInteger(n) || n < 0 || n >= LEVELS.length) return;
      if (!(hasAdminAccess() || n <= loadProgress().unlocked)) return;
      this.score = 0;
      this.coinCount = 0;
      this.lives = 3;
      this.power = 0;
      clearResume();
      this.startLevel(n);
      return;
    }
    switch (action) {
      case 'start-after-login':
        this.showTitle();
        break;
      case 'start':
        sound.start();
        if (coarse()) enterFullscreen();
        lockLandscape();
        this.showMap();
        break;
      case 'resume':
        sound.start();
        if (coarse()) enterFullscreen();
        lockLandscape();
        this.resumeLevel();
        break;
      case 'switch-player': {
        // The save badge must never interrupt a run, including stray taps.
        if (this.mode === 'play') break;
        if (this.mode === 'pause') this.stashRun();
        this.physics.pause();
        screen('login');
        const cancel = document.getElementById('login-cancel');
        if (cancel) cancel.hidden = false;
        document
          .getElementById('login-form')
          ?.setAttribute('data-switching', '1');
        break;
      }
      case 'logout': {
        if (this.mode === 'play') break;
        if (this.mode === 'pause') this.stashRun();
        this.physics.pause();
        logout();
        const input = document.getElementById(
          'player-name-input',
        ) as HTMLInputElement | null;
        if (input) input.value = '';
        this.mode = 'title';
        refreshJourney();
        screen('login');
        toast('خرجت من الحساب');
        break;
      }
      case 'login-cancel':
        continueLocally();
        this.showTitle();
        break;
      case 'map':
        if (this.mode === 'play' || this.mode === 'pause') this.stashRun();
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
  showTitle() {
    this.mode = 'title';
    this.physics.pause();
    screen('title');
    bossBar(false);
  }
  async bootSession() {
    // Storage may have been wiped (in-app browsers, PWA containers): ask
    // IndexedDB and the server session before showing the login screen.
    const hadLocal = !!getPlayer();
    await restoreSession();
    if (takeSessionLost() && getPlayer()) {
      // The server forgot this phone (cookie lost). Ask for the PIN again so
      // progress syncs and admin access comes back, instead of staying local.
      refreshJourney();
      screen('login');
      document
        .getElementById('login-form')
        ?.setAttribute('data-switching', '1');
      const err = document.getElementById('login-error');
      if (err) {
        err.hidden = false;
        err.textContent =
          'الجلسة خلصت على الجهاز ده. ادخل برقمك السري عشان يرجع تقدمك وصلاحياتك';
      }
      return;
    }
    if (needsLogin()) {
      if (this.mode === 'title') screen('login');
      return;
    }
    if (!hadLocal) {
      const login = document.querySelector<HTMLElement>(
        '[data-screen="login"]',
      );
      if ((login && !login.hidden) || this.mode === 'title') this.showTitle();
      return;
    }
    await pullProgress();
    if (this.mode === 'title') this.showTitle();
  }
  showMap() {
    this.mode = 'map';
    this.physics.pause();
    renderMap(loadProgress(), LEVELS);
    screen('map');
    bossBar(false);
  }
  /** Snapshot a mid-level run so كمّل can bring the player back. */
  stashRun() {
    if (this.mode !== 'play' && this.mode !== 'pause' && this.mode !== 'dead')
      return;
    saveResume({
      levelIndex: this.level,
      checkpoint: this.checkpoint,
      lives: Math.max(1, this.lives),
      score: this.score,
      coins: this.coinCount,
      power: this.power,
    });
  }
  resumeLevel() {
    const r = loadProgress().resume;
    if (!r) {
      this.showMap();
      return;
    }
    this.score = r.score;
    this.coinCount = r.coins;
    this.lives = r.lives;
    this.power = r.power;
    this.startLevel(r.levelIndex, { checkpoint: r.checkpoint });
  }
  /** Start a level (keeps the run's score and lives). Public for tests. */
  startLevel(index: number, opts?: { checkpoint?: boolean }) {
    if (!Number.isInteger(index) || index < 0 || index >= LEVELS.length) {
      this.showMap();
      return;
    }
    sound.start();
    this.level = index;
    this.checkpoint = !!opts?.checkpoint;
    this.secretFound = false;
    this.loadLevel();
    this.mode = 'play';
    this.physics.resume();
    screen('hidden');
    toast(
      this.checkpoint
        ? `${LEVELS[index].name} — رجوع من علم الأمان`
        : `${LEVELS[index].name} — ${LEVELS[index].subtitle}`,
    );
  }
  /* ───────────────────────── Building ───────────────────────── */
  loadLevel() {
    loadLevelImpl(this);
  }
  followHero() {
    const vertical = this.L.height > 600;
    this.cameras.main
      .startFollow(
        this.hero,
        true,
        0.12,
        vertical ? 0.14 : 0.2,
        0,
        vertical ? 30 : 20,
      )
      .setDeadzone(90, vertical ? 90 : 70);
  }
  /** Direction of the wind zone the hero is in (1 when outside them all). */
  windDir() {
    const w = this.L.wind.find(
      (q) => this.hero.x > q.x0 - 200 && this.hero.x < q.x1 + 200,
    );
    return w ? w.dir : 1;
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
    for (const ch of ['N', 'u', ',', '/', ';', '_', 'س', 'ل'])
      for (const [r, a, b] of this.runs(ch))
        this.terrain.add(
          this.add.zone(
            ((a + b + 1) / 2) * TILE,
            r * TILE + 12,
            (b - a + 1) * TILE,
            TILE,
          ),
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
    buildPropsImpl(this);
  }
  buildFarm() {
    buildFarmImpl(this);
  }
  saqiaPos(m: Mover, t: number): [number, number] {
    return saqiaPosImpl(this, m, t);
  }
  canalAt(x: number, bottom: number) {
    return canalAtImpl(this, x, bottom);
  }
  hint(key: string, text: string) {
    if (this.hints.has(key)) return;
    this.hints.add(key);
    toast(text);
  }
  buildAtmosphere() {
    buildAtmosphereImpl(this);
  }
  buildColliders() {
    buildCollidersImpl(this);
  }
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
    return enemyImpl(this, x, y, type);
  }
  walkSpeed(type: string) {
    return walkSpeedImpl(this, type);
  }
  get bossKind() {
    return bossKindImpl(this);
  }
  get bossMax() {
    return bossMaxImpl(this);
  }
  get bossName() {
    return bossNameImpl(this);
  }
  bossTex(pose: string) {
    return bossTexImpl(this, pose);
  }
  makeBoss(x: number, bottom: number) {
    makeBossImpl(this, x, bottom);
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
          ? this.weapon().toast
          : this.L.meta.theme === 'farm'
            ? 'بلح زغلول… بقيت أقوى!'
            : this.L.meta.theme === 'workshop'
              ? 'سندوتش جبنة دمياطي… بقيت أقوى!'
              : this.L.meta.theme === 'harbor'
                ? 'سمكة مشوية من المينا… بقيت أقوى!'
                : this.L.meta.theme === 'corniche' ||
                    this.L.meta.theme === 'fort'
                  ? 'جمبري مشوي من الكورنيش… بقيت أقوى!'
                  : isW5(this.L.meta.theme)
                    ? 'عيش شمسي سخن من فرن الأقصر… بقيت أقوى!'
                    : isW8(this.L.meta.theme)
                      ? 'بلح سيوة… بقيت أقوى!'
                      : isW7(this.L.meta.theme)
                        ? 'سمك بلطي مشوي من الكورنيش… بقيت أقوى!'
                        : isW6(this.L.meta.theme)
                          ? 'عيش شمسي من فرن النجع… بقيت أقوى!'
                          : 'سندوتش فول… بقيت أقوى!',
      );
      this.burst(this.hero.x, this.hero.y, 0xffc879, 16);
    }
    this.updateHud();
  }
  fitHeroBody(crouch: boolean) {
    fitHeroBodyImpl(this, crouch);
  }
  solidsNear(): SBody[] {
    return solidsNearImpl(this);
  }
  animateHero(
    now: number,
    grounded: boolean,
    direction: number,
    down: boolean,
  ) {
    animateHeroImpl(this, now, grounded, direction, down);
  }
  updateHud() {
    updateHudImpl(this);
  }
  weapon() {
    return weaponImpl(this);
  }
  grantIframes() {
    grantIframesImpl(this);
  }
  unstickHero() {
    unstickHeroImpl(this);
  }
  spawnX() {
    return spawnXImpl(this);
  }
  birdTell(e: Sprite, time: number, fx: string) {
    e.setData('state', 'tell')
      .setData('until', time + BIRD_TELL_MS)
      .setData('target', { x: this.hero.x, y: this.hero.y });
    body(e).setVelocity(0, 0);
    const mark = this.add
      .text(e.x, e.y - 26, '!', {
        fontFamily: 'Changa, Tahoma',
        fontSize: '22px',
        color: '#ffe14a',
        stroke: '#5a1010',
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setDepth(40);
    e.setData('mark', mark);
    e.once('destroy', () => mark.destroy());
    sound.fx(fx);
  }
  /** Runs the warning; returns true while the bird is still warning, and
   * launches the dive (at `speed` px/s) when the warning is over. */
  birdTelling(e: Sprite, time: number, speed: number) {
    const mark = e.getData('mark') as Phaser.GameObjects.Text | undefined;
    if (time < e.getData('until')) {
      body(e).setVelocity(Math.sin(time / 22) * 40, 0);
      e.setTint(Math.floor(time / 90) % 2 ? 0xff7a6a : 0xffffff);
      mark?.setPosition(e.x, e.y - 26 + Math.sin(time / 60) * 2);
      return true;
    }
    mark?.destroy();
    e.setData('mark', undefined).clearTint();
    const t = e.getData('target') as { x: number; y: number };
    const d = Phaser.Math.Distance.Between(e.x, e.y, t.x, t.y);
    e.setData('state', 'dive').setData(
      'until',
      time + (d / speed) * 1000 + 120,
    );
    this.physics.moveTo(e, t.x, t.y, speed);
    return false;
  }
  nearSpawn(x: number) {
    return Math.abs(x - this.spawnX()) < SPAWN_CLEAR;
  }
  /** After a respawn, send campers home and delay their next dive. */
  clearSpawnCamp() {
    const until = this.time.now + INVULN_MS + 700;
    for (const e of this.enemies.getChildren() as Sprite[]) {
      if (!FLYING.has(e.getData('kind'))) continue;
      const home = e.getData('home') as { x: number; y: number };
      if (this.nearSpawn(e.x) || this.nearSpawn(home.x)) {
        e.setPosition(home.x, home.y);
        body(e).reset(home.x, home.y);
        e.setData('state', e.getData('kind') === 'bat' ? 'perch' : 'walk');
        e.setData('until', until);
        e.setVelocity(0, 0);
      }
    }
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
    headBumpImpl(this);
  }
  hitBlock(block: Sprite) {
    hitBlockImpl(this, block);
  }
  /** Weapon crate before a boss: arms بلبل with this world's weapon,
   * or pays a bonus if he is already armed. */
  openArmory(block: Sprite) {
    openArmoryImpl(this, block);
  }
  debris(x: number, y: number) {
    debrisImpl(this, x, y);
  }
  bumpAbove(block: Sprite) {
    bumpAboveImpl(this, block);
  }
  spawnItem(block: Sprite, content: string) {
    spawnItemImpl(this, block, content);
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
    // Luxor's cracked slabs give way faster and take longer to come back.
    const w5 =
      isW5(this.L.meta.theme) ||
      isW6(this.L.meta.theme) ||
      isW7(this.L.meta.theme) ||
      isW8(this.L.meta.theme);
    this.tweens.add({
      targets: c,
      x: home.x + 2,
      yoyo: true,
      repeat: 4,
      duration: 35,
    });
    this.time.delayedCall(w5 ? 250 : 360, () => {
      if (!c.active) return;
      (c.body as SBody).enable = false;
      sound.fx('crumble');
      this.burst(c.x, c.y, w5 ? 0xd8aa6e : 0xa8743e, 8);
      this.tweens.add({
        targets: c,
        y: home.y + 220,
        angle: 25,
        alpha: 0,
        duration: 520,
        ease: 'Quad.easeIn',
      });
      this.time.delayedCall(w5 ? 3600 : 2600, () => {
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
    const burn = this.L.meta.torchBurn;
    l.until = burn ? this.time.now + burn * 1000 : 0;
    l.img.setTexture(this.skin('lantern-on'));
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
  /** Tough enemies (the buffalo) take two hits; the first leaves them dizzy. */
  damageEnemy(e: Sprite) {
    if (!e.active) return;
    const hp = (e.getData('hp') as number) - 1;
    if (hp > 0) {
      e.setData('hp', hp).setData('state', 'dizzy');
      e.setData('until', this.time.now + 1500).setVelocityX(0);
      e.setTintFill(0xffffff);
      this.time.delayedCall(70, () => e.active && e.clearTint());
      this.burst(e.x, e.y - 10, 0xffe36a, 6);
      sound.fx('moo');
      this.score += 100;
      return;
    }
    this.killEnemy(e);
  }
  killEnemy(e: Sprite) {
    if (!e.active) return;
    const stolen = (e.getData('stolen') as number) || 0;
    for (let i = 0; i < stolen; i++) {
      const c = this.items.create(e.x, e.y - 10, this.skin('coin1')) as Sprite;
      c.setData('kind', 'coin')
        .setData('settled', true)
        .setVelocity((i - (stolen - 1) / 2) * 50, -300 - (i % 2) * 50)
        .setDepth(6);
    }
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
    contactImpl(this, e);
  }
  /** `soft`: a wave or a lightning bolt. These knock small بلبل back
   * instead of killing him (and still cost a big one his growth). */
  hurt(source = 'hit', soft = false) {
    hurtImpl(this, source, soft);
  }
  die() {
    dieImpl(this);
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
      const cur = LEVELS[this.level],
        next = LEVELS[this.level + 1];
      const local = LEVELS.slice(0, this.level + 1).filter(
        (l) => l.world === cur.world,
      ).length;
      const worldDone = next.world !== cur.world;
      document.getElementById('clear-title')!.textContent = worldDone
        ? `خلّصت ${WORLDS[cur.world].name}! الطريق مفتوح على ${WORLDS[next.world].name}`
        : `${local} · ${cur.name}`;
      document.getElementById('next-name')!.textContent = worldDone
        ? `على ${WORLDS[next.world].name}: ${next.name} ◀`
        : `على ${next.name} ◀`;
      screen('clear', details);
    } else {
      this.mode = 'win';
      screen('win', details);
      ending(loadProgress(), LEVELS, this.score);
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
    return bossPhaseImpl(this);
  }
  bossSet(state: string, ms: number) {
    bossSetImpl(this, state, ms);
  }
  bossContact() {
    bossContactImpl(this);
  }
  bossChili() {
    bossChiliImpl(this);
  }
  bossDamage(n: number) {
    bossDamageImpl(this, n);
  }
  bossDefeat() {
    bossDefeatImpl(this);
  }
  updateBoss(time: number) {
    updateBossImpl(this, time);
  }
  crabContact(fromAbove: boolean) {
    crabContactImpl(this, fromAbove);
  }
  updateCrab(time: number) {
    updateCrabImpl(this, time);
  }
  spitBubbles(boss: Sprite, phase: number) {
    spitBubblesImpl(this, boss, phase);
  }
  crabWave(boss: Sprite) {
    crabWaveImpl(this, boss);
  }
  bossRange(): [number, number] {
    return bossRangeImpl(this);
  }
  clampBoss() {
    clampBossImpl(this);
  }
  frameBossFight() {
    frameBossFightImpl(this);
  }
  updateHazards(time: number) {
    updateHazardsImpl(this, time);
  }
  /** «أبو قرون»: walk → snort (telegraph) → charge → crash → dazed. */
  updateBuffalo(time: number) {
    updateBuffaloImpl(this, time);
  }
  dropClods(n: number) {
    dropClodsImpl(this, n);
  }
  throwBone(boss: Sprite, phase: number) {
    throwBoneImpl(this, boss, phase);
  }
  /* ───────────────────────── View ───────────────────────── */
  fitView() {
    fitViewImpl(this);
  }
  updateDarkness() {
    updateDarknessImpl(this);
  }
  updateWorld(time: number, dt: number) {
    updateWorldImpl(this, time, dt);
  }
  update(time: number, delta: number) {
    updateGameImpl(this, time, delta);
  }
  findSecret() {
    findSecretImpl(this);
  }
  useTank() {
    useTankImpl(this);
  }
  onOneWay() {
    return onOneWayImpl(this);
  }
  lineAt(i: number) {
    return lineAtImpl(this, i);
  }
  tryGrab() {
    tryGrabImpl(this);
  }
  updateZip(time: number, jump: boolean) {
    updateZipImpl(this, time, jump);
  }
  updateEnemy(e: Sprite, time: number) {
    updateEnemyImpl(this, e, time);
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
