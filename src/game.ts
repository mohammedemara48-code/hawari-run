import Phaser from 'phaser';
import { makeArt } from './art';
import { HERO_FRAME, heroBody, heroPose } from './hero-state';
import { approach, jumpAllowed, stomped, levelSpec, tally } from './rules';
import { PHYSICS, levelLayout } from './levels';
import { sound } from './audio';
import { bindUI, screen, hud, toast, touch } from './ui';
type Sprite = Phaser.Physics.Arcade.Sprite;
type Mode = 'title' | 'play' | 'pause' | 'dead' | 'clear' | 'over' | 'win';
const body = (s: Sprite) => s.body as Phaser.Physics.Arcade.Body;
export class Alley extends Phaser.Scene {
  hero!: Sprite;
  heroShadow!: Phaser.GameObjects.Image;
  growUntil = 0;
  throwUntil = 0;
  hurtPoseUntil = 0;
  heroCrouched = false;
  solids!: Phaser.Physics.Arcade.StaticGroup;
  coins!: Phaser.Physics.Arcade.Group;
  enemies!: Phaser.Physics.Arcade.Group;
  items!: Phaser.Physics.Arcade.Group;
  shots!: Phaser.Physics.Arcade.Group;
  layers: Phaser.GameObjects.TileSprite[] = [];
  keys!: Record<string, Phaser.Input.Keyboard.Key>;
  mode: Mode = 'title';
  level = 0;
  score = 0;
  coinCount = 0;
  lives = 3;
  power = 0;
  remaining = 240;
  levelCoins = 0;
  kills = 0;
  lastGround = -1000;
  lastPress = -1000;
  lastShot = 0;
  lastBump = 0;
  invincible = 0;
  hurtUntil = 0;
  elapsed = 0;
  jumpWas = false;
  actionWas = false;
  downWas = false;
  facing = 1;
  checkpoint = false;
  bonus = false;
  bonusUsed = false;
  returnX = 0;
  muted = false;
  spec = levelSpec(0);
  cloudClock = 0;
  constructor() {
    super('alley');
  }
  create() {
    makeArt(this);
    this.keys = this.input.keyboard!.addKeys(
      'LEFT,RIGHT,UP,DOWN,A,D,W,S,Z,X,SPACE,SHIFT,ESC,ENTER,M',
    ) as Record<string, Phaser.Input.Keyboard.Key>;
    this.input.keyboard!.addCapture(['SPACE', 'UP', 'DOWN', 'LEFT', 'RIGHT']);
    bindUI((a) => this.action(a));
    this.input.keyboard!.on('keydown-ESC', () => this.action('pause'));
    this.input.keyboard!.on('keydown-ENTER', () => {
      if (this.mode === 'title' || this.mode === 'over' || this.mode === 'win')
        this.action('start');
      else if (this.mode === 'clear') this.action('next');
    });
    this.input.keyboard!.on('keydown-M', () => this.action('sound'));
    this.loadLevel();
    this.physics.pause();
    screen('title');
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.mode === 'play') this.action('pause');
    });
  }
  action(action: string) {
    switch (action) {
      case 'start':
        sound.start();
        this.level = 0;
        this.score = 0;
        this.coinCount = 0;
        this.lives = 3;
        this.power = 0;
        this.checkpoint = false;
        this.bonus = false;
        this.bonusUsed = false;
        this.loadLevel();
        this.mode = 'play';
        this.physics.resume();
        screen('hidden');
        toast('يا بلبل! لمّ الفكة ووصل الفانوس');
        break;
      case 'pause':
        if (this.mode === 'play') {
          this.mode = 'pause';
          this.physics.pause();
          screen('pause');
          sound.muted = true;
        } else if (this.mode === 'pause') {
          this.mode = 'play';
          this.physics.resume();
          screen('hidden');
          sound.muted = this.muted;
        }
        break;
      case 'blur':
        if (this.mode === 'play') this.action('pause');
        break;
      case 'sound':
        this.muted = !this.muted;
        sound.muted = this.muted || this.mode === 'pause';
        document.getElementById('sound-btn')!.textContent = this.muted
          ? 'الصوت: مقفول'
          : 'الصوت: شغّال';
        if (!this.muted) sound.start();
        break;
      case 'next':
        this.level = 1;
        this.checkpoint = false;
        this.bonus = false;
        this.bonusUsed = false;
        this.loadLevel();
        this.mode = 'play';
        this.physics.resume();
        screen('hidden');
        toast('تحت البلد… خلي بالك من السلال!');
        break;
      case 'fullscreen':
        if (!document.fullscreenElement)
          void document.getElementById('game-wrap')!.requestFullscreen?.();
        else void document.exitFullscreen();
        break;
    }
  }
  loadLevel() {
    this.tweens.killAll();
    this.physics.world.colliders.destroy();
    this.children.removeAll(true);
    this.layers = [];
    this.spec = levelSpec(this.level);
    this.remaining = this.bonus ? 75 : 240;
    this.levelCoins = 0;
    this.kills = 0;
    this.elapsed = 0;
    this.lastGround = -1000;
    this.lastPress = -1000;
    this.jumpWas = false;
    this.invincible = 0;
    this.hurtUntil = this.time.now + 1200;
    const width = this.bonus ? 960 : this.spec.width;
    this.physics.world.setBounds(0, -100, width, 650);
    this.cameras.main.setBounds(0, 0, width, 360);
    this.cameras.main.setRoundPixels(true);
    this.cameras.main.setBackgroundColor('#edc093');
    const variant = this.bonus ? 1 : this.level;
    for (const [name, factor] of [
      ['sky', 0.04],
      ['far', 0.19],
      ['houses', 0.48],
    ] as [string, number][]) {
      this.layers.push(
        this.add
          .tileSprite(0, 0, 640, 360, name + variant)
          .setOrigin(0)
          .setScrollFactor(0)
          .setData('factor', factor),
      );
    }
    this.solids = this.physics.add.staticGroup();
    this.coins = this.physics.add.group({
      allowGravity: false,
      immovable: true,
    });
    this.enemies = this.physics.add.group();
    this.items = this.physics.add.group();
    this.shots = this.physics.add.group({ allowGravity: false });
    const gaps = this.bonus ? [] : this.spec.gaps;
    for (let x = 12; x < width; x += 24) {
      if (gaps.some(([a, b]) => x >= a && x < b)) continue;
      for (const y of [324, 348])
        this.solid(x, y, variant ? 'metro' : 'ground');
    }
    if (this.bonus) {
      for (let x = 108; x < 820; x += 36) {
        this.coin(x, 250);
        if (x > 200 && x < 700) this.coin(x, 190);
      }
      for (let x = 264; x < 696; x += 24) this.solid(x, 228, 'platform');
      this.add.image(850, 312, 'tank').setOrigin(0.5, 1);
      this.add
        .text(480, 111, 'مخبأ الفكة', {
          fontFamily: 'Tahoma',
          fontSize: '22px',
          color: '#ffe1a5',
        })
        .setOrigin(0.5);
      this.add
        .text(850, 236, '↓ خروج', {
          fontFamily: 'Tahoma',
          fontSize: '13px',
          color: '#ffe1a5',
        })
        .setOrigin(0.5);
      this.add.image(56, 312, 'flowers').setOrigin(0.5, 1);
    } else {
      // Original level routes: alternating rooftop terraces and ground passages.
      const layout = levelLayout(this.level);
      for (const [x, y, n] of layout.platforms) {
        for (let i = 0; i < n; i++) this.solid(x + i * 24, y, 'platform');
        for (let i = 0; i < n; i++) this.coin(x + i * 24, y - 39);
      }
      for (const [x, y] of layout.steps) this.solid(x, y, 'platform');
      for (const b of layout.blocks) this.solid(b.x, b.y, b.kind, b.content);
      for (const [x, y] of layout.rowCoins) this.coin(x, y);
      for (let x = 276; x < width - 350; x += 156)
        if (!gaps.some(([a, b]) => x > a - 12 && x < b + 12)) this.coin(x, 284);
      const enemyList =
        this.level === 0
          ? [648, 936, 1368, 1800, 2328, 2760, 3168, 3648, 4008, 4464]
          : [
              624, 840, 1224, 1656, 2028, 2508, 2928, 3360, 3768, 4320, 4776,
              4968,
            ];
      enemyList.forEach((x, i) =>
        this.enemy(
          x,
          i % 3 === 2
            ? 'basket'
            : this.level === 1 && i % 2 === 0
              ? 'bug'
              : 'cat',
        ),
      );
      for (let x = 192; x < width; x += 700) {
        this.add.image(x, 312, 'cart').setOrigin(0.5, 1);
        this.add.image(x + 200, 312, 'flowers').setOrigin(0.5, 1);
        if (!gaps.some(([a, b]) => x + 350 > a - 36 && x + 350 < b + 36))
          this.add.image(x + 350, 312, 'crate').setOrigin(0.5, 1);
      }
      this.solid(this.spec.portal, 282, 'tank')
        .setDisplaySize(48, 60)
        .refreshBody();
      this.add
        .text(this.spec.portal, 235, '↓ سرّ الحارة', {
          fontFamily: 'Tahoma',
          fontSize: '10px',
          color: '#ffe3af',
          backgroundColor: '#29464d',
          padding: { x: 5, y: 3 },
        })
        .setOrigin(0.5);
      this.add
        .image(this.spec.checkpoint, 312, 'checkpoint')
        .setOrigin(0.5, 1)
        .setName('checkpoint');
      this.add.image(this.spec.exit, 312, 'goal').setOrigin(0.5, 1);
      this.add.image(width - 70, 312, 'cart').setOrigin(0.5, 1);
    }
    const spawn = this.bonus
      ? 70
      : this.returnX || (this.checkpoint ? this.spec.checkpoint + 24 : 96);
    this.returnX = 0;
    this.hero = this.physics.add
      .sprite(spawn, 312 - HERO_FRAME.height / 2, 'hero-small-idle0')
      .setDepth(10)
      .setCollideWorldBounds(false);
    body(this.hero).setMaxVelocity(280, 650);
    this.growUntil = 0;
    this.throwUntil = 0;
    this.hurtPoseUntil = 0;
    this.heroCrouched = false;
    this.heroShadow = this.add
      .image(spawn, 312, 'hero-shadow')
      .setDepth(4)
      .setAlpha(0.24);
    this.setPower(this.power, false);
    this.cameras.main.startFollow(this.hero, true, 0.12, 1, -100, 0);
    this.cameras.main.setDeadzone(100, 360);
    this.physics.add.collider(this.hero, this.solids, () => this.headBump());
    this.physics.add.collider(this.enemies, this.solids);
    this.physics.add.collider(this.items, this.solids);
    this.physics.add.overlap(this.hero, this.coins, (_p: any, c: any) => {
      this.collect();
      c.destroy();
    });
    this.physics.add.overlap(this.hero, this.items, (_p: any, item: any) => {
      const type = item.getData('kind');
      if (type === 'invincible') {
        this.invincible = this.time.now + 9000;
        toast('خرزة الحظ! ٩ ثواني محدش يقدر عليك');
      } else this.setPower(type === 'chili' ? 2 : Math.max(1, this.power));
      this.burst(item.x, item.y, 0xffd889, 15);
      item.destroy();
      sound.fx('power');
    });
    this.physics.add.collider(this.hero, this.enemies, (_p: any, e: any) =>
      this.contact(e),
    );
    this.physics.add.collider(this.shots, this.solids, (shot: any) => {
      if (body(shot).blocked.down && (shot.getData('bounces') || 0) < 3) {
        shot.setVelocityY(-160);
        shot.setData('bounces', (shot.getData('bounces') || 0) + 1);
      } else {
        this.burst(shot.x, shot.y, 0xf5a34d, 4);
        shot.destroy();
      }
    });
    this.physics.add.overlap(this.shots, this.enemies, (shot: any, e: any) => {
      this.killEnemy(e);
      shot.destroy();
    });
    this.physics.add.overlap(this.enemies, this.enemies, (a: any, b: any) => {
      if (a !== b && (a.getData('rolling') || b.getData('rolling'))) {
        if (a.getData('rolling')) this.killEnemy(b);
        else this.killEnemy(a);
      }
    });
    sound.mode = variant;
    this.updateHud();
  }
  solid(x: number, y: number, key: string, content = '') {
    const s = this.solids.create(x, y, key) as Phaser.Physics.Arcade.Sprite;
    s.setData('kind', key).setData('content', content);
    return s;
  }
  coin(x: number, y: number) {
    const s = this.coins.create(x, y, 'coin0') as Sprite;
    s.setData('phase', x % 6);
    body(s).setSize(11, 17);
    return s;
  }
  enemy(x: number, type: string) {
    const e = this.enemies.create(x, 295, type + '0') as Sprite;
    body(e)
      .setSize(type === 'bug' ? 22 : 24, type === 'bug' ? 12 : 22)
      .setOffset(type === 'bug' ? 5 : 4, type === 'bug' ? 9 : 5);
    e.setData('kind', type)
      .setData('direction', -1)
      .setData('sleep', false)
      .setData('rolling', false);
    e.setVelocityX(type === 'bug' ? -55 : -38);
    return e;
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
        power === 2 ? 'شطة نار! دوس X وارمي الشطة' : 'سندوتش فول… بقيت أقوى!',
      );
      this.burst(this.hero.x, this.hero.y, 0xffc879, 16);
    }
    this.updateHud();
  }
  fitHeroBody(crouch: boolean) {
    const metrics = heroBody(this.power > 0, crouch),
      b = body(this.hero);
    if (
      b.width !== metrics.width ||
      b.height !== metrics.height ||
      b.offset.y !== metrics.y
    )
      b.setSize(metrics.width, metrics.height, false).setOffset(
        metrics.x,
        metrics.y,
      );
    this.heroCrouched = crouch;
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
      crouch = (this.solids.getChildren() as Sprite[]).some((s) => {
        const b = s.body as Phaser.Physics.Arcade.StaticBody;
        return (
          left < b.right &&
          left + m.width > b.left &&
          top < b.bottom &&
          top + m.height > b.top + 0.5
        );
      });
    }
    this.fitHeroBody(crouch);
    const pose = heroPose({
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
    const form = pose === 'grow0' ? 'small' : this.power > 0 ? 'big' : 'small';
    this.hero.setTexture(`hero-${form}-${pose}`).setData('pose', pose);
    this.heroShadow
      .setPosition(this.hero.x, grounded ? body(this.hero).bottom + 1 : 313)
      .setAlpha(grounded ? 0.24 : 0.07)
      .setVisible(this.mode !== 'dead');
  }
  updateHud() {
    hud(
      this.score,
      this.coinCount,
      this.lives,
      Math.max(0, Math.ceil(this.remaining)),
      this.level,
      this.power,
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
  /** Bump the block most centred over the hero's head, never a neighbour. */
  headBump() {
    const hb = body(this.hero);
    if (!hb.blocked.up || this.time.now - this.lastBump < 120) return;
    let best: Sprite | undefined,
      bestOverlap = 0;
    for (const s of this.solids.getChildren() as Sprite[]) {
      if (!s.active) continue;
      const sb = s.body as Phaser.Physics.Arcade.StaticBody;
      if (Math.abs(sb.bottom - hb.top) > 3) continue;
      const overlap = Math.min(sb.right, hb.right) - Math.max(sb.left, hb.left);
      if (overlap > bestOverlap) {
        bestOverlap = overlap;
        best = s;
      }
    }
    if (!best) return;
    this.lastBump = this.time.now;
    this.hitBlock(best);
  }
  hitBlock(block: Sprite) {
    if (!block.active || this.hero.y < block.y || block.getData('busy')) return;
    const kind = block.getData('kind');
    if (kind !== 'brick' && kind !== 'box') return;
    block.setData('busy', true);
    if (kind === 'brick' && this.power > 0) {
      this.burst(block.x, block.y, 0xcc8a62, 12);
      block.destroy();
      sound.fx('break');
      this.score += 50;
      return;
    }
    sound.fx('hit');
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
      block.setData('kind', 'used').setTexture('used');
      const content = block.getData('content') || 'coin';
      if (content === 'coin') {
        this.collect();
        const c = this.add.image(block.x, block.y - 20, 'coin1').setDepth(15);
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
        const label = this.add
          .text(block.x, block.y - 34, '+١٠٠', {
            fontFamily: 'Tahoma',
            fontSize: '12px',
            color: '#fff2c4',
            stroke: '#3a2a22',
            strokeThickness: 3,
          })
          .setOrigin(0.5)
          .setDepth(16);
        this.tweens.add({
          targets: label,
          y: label.y - 30,
          alpha: 0,
          delay: 200,
          duration: 600,
          onComplete: () => label.destroy(),
        });
      } else this.spawnItem(block, content);
    }
  }
  /** A power-up rises out of its box, then slides off the row to the ground. */
  spawnItem(block: Sprite, content: string) {
    const top = block.y - 12;
    const item = this.items.create(block.x, top, content) as Sprite;
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
        // Slide away from the hero, unless that side drops onto a terrace,
        // the secret tank or a gap — then use the open street side.
        const away = this.hero.x <= block.x ? 1 : -1;
        const dir = this.streetClear(block.x, away) ? away : -away;
        item.setData('direction', dir).setData('spawnY', item.y);
        item.setVelocity(dir * 70, 0);
      },
    });
  }
  streetClear(x: number, dir: number) {
    const from = x + dir * 36,
      to = x + dir * 110,
      lo = Math.min(from, to),
      hi = Math.max(from, to);
    if (this.spec.gaps.some(([a, b]) => a < hi && b > lo)) return false;
    return !(this.solids.getChildren() as Sprite[]).some((s) => {
      const b = s.body as Phaser.Physics.Arcade.StaticBody;
      return b.top > 228 && b.top < 312 && b.left < hi && b.right > lo;
    });
  }
  burst(x: number, y: number, color: number, count = 7) {
    for (let i = 0; i < count; i++) {
      const p = this.add
        .image(x, y, 'particle')
        .setDepth(20)
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
    this.burst(e.x, e.y, 0xe9b775, 8);
    const ghost = this.add.image(e.x, e.y, e.texture.key).setScale(1, -1);
    this.tweens.add({
      targets: ghost,
      y: e.y - 35,
      alpha: 0,
      angle: 35,
      duration: 350,
      onComplete: () => ghost.destroy(),
    });
    e.destroy();
    sound.fx('hit');
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
      } else this.killEnemy(e);
      this.hero.setVelocityY(-285);
      sound.fx('hit');
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
    sound.fx('hit');
    this.cameras.main.shake(100, 0.004);
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
    this.hero
      .setTexture(`hero-${this.power > 0 ? 'big' : 'small'}-dead`)
      .setData('pose', 'dead')
      .clearTint()
      .setAlpha(1);
    this.heroShadow.setVisible(false);
    this.hero.setVelocity(0, -250);
    this.hero.setDepth(30);
    body(this.hero).checkCollision.none = true;
    sound.fx('hit');
    this.updateHud();
    this.time.delayedCall(1100, () => {
      if (this.lives <= 0) {
        this.mode = 'over';
        this.physics.pause();
        screen('over');
      } else {
        this.bonus = false;
        this.power = 0;
        this.loadLevel();
        this.mode = 'play';
        this.physics.resume();
        toast(
          this.checkpoint ? 'راجع من فانوس الأمان' : 'لسه فيك نفس… جرّب تاني',
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
    this.updateHud();
    const details = `<div class="tally-row"><span>الفكة اللي لمّيتها</span><strong>${this.levelCoins} × ١٠٠</strong></div><div class="tally-row"><span>أعداء اتغلبت عليهم</span><strong>${this.kills} × ٢٠٠</strong></div><div class="tally-row"><span>مكافأة الوقت</span><strong>+${result.time}</strong></div><div class="tally-row total"><span>مجموعك</span><strong>${this.score}</strong></div>`;
    if (this.level === 0) screen('clear', details);
    else {
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
  portal() {
    const time = this.remaining,
      coins = this.levelCoins,
      kills = this.kills;
    if (this.bonus && this.hero.x > 810) {
      this.bonus = false;
      this.returnX = this.spec.portal + 80;
      this.loadLevel();
      this.remaining = time;
      this.levelCoins = coins;
      this.kills = kills;
      toast('رجعت للحارة ومعاك الغنيمة!');
    } else if (
      !this.bonus &&
      Math.abs(this.hero.x - this.spec.portal) < 26 &&
      body(this.hero).blocked.down
    ) {
      if (this.bonusUsed) {
        toast('خلاص… لمّيت سرّ الخزان ده!');
        return;
      }
      this.bonus = true;
      this.bonusUsed = true;
      this.loadLevel();
      this.remaining = time;
      this.levelCoins = coins;
      this.kills = kills;
      toast('مخبأ سرّي! لمّ الفكة واخرج من الخزان التاني');
    }
  }

  update(time: number, delta: number) {
    const dt = Math.min(delta, 35) / 1000;
    this.cloudClock += dt;
    this.layers.forEach(
      (l) =>
        (l.tilePositionX =
          this.cameras.main.scrollX * l.getData('factor') +
          this.cloudClock * (l.texture.key.startsWith('sky') ? 1.5 : 0)),
    );
    if (!this.hero) return;
    for (const obj of this.coins.getChildren() as Sprite[])
      obj.setTexture(
        'coin' + (Math.floor(time / 100 + obj.getData('phase')) % 6),
      );
    if (this.mode === 'title') {
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
      touch.jump;
    const action = this.keys.X.isDown || this.keys.SHIFT.isDown || touch.action,
      down = this.keys.DOWN.isDown || this.keys.S.isDown || touch.down;
    const b = body(this.hero);
    const grounded = b.blocked.down;
    if (grounded) this.lastGround = time;
    if (jump && !this.jumpWas) this.lastPress = time;
    if (jumpAllowed(time - this.lastGround, time - this.lastPress)) {
      this.hero.setVelocityY(action ? -PHYSICS.runJump : -PHYSICS.jump);
      this.lastGround = -1000;
      this.lastPress = -1000;
      sound.fx('jump');
      this.burst(this.hero.x, this.hero.y + 17, 0xdcb08a, 5);
    }
    if (!jump && this.jumpWas && b.velocity.y < -180)
      this.hero.setVelocityY(b.velocity.y * 0.48);
    const dir = Number(right) - Number(left),
      speed = action ? 245 : 157;
    b.velocity.x = approach(
      b.velocity.x,
      dir * speed,
      (dir ? 1000 : grounded ? 1400 : 450) * dt,
    );
    const skid =
      dir && Math.sign(b.velocity.x) !== dir && Math.abs(b.velocity.x) > 50;
    if (dir && !skid) this.facing = dir;
    this.hero.setFlipX(this.facing < 0);
    this.animateHero(time, grounded, dir, down);
    if (time < this.invincible) {
      this.hero.setTint(
        [0xffcc79, 0x8ee9cb, 0xffffff][Math.floor(time / 100) % 3],
      );
      if (Math.floor(time / 80) % 2 === 0)
        this.burst(this.hero.x, this.hero.y, 0x9fe3c4, 1);
    } else if (time < this.hurtUntil)
      this.hero.setAlpha(Math.floor(time / 90) % 2 === 0 ? 0.45 : 1);
    else this.hero.clearTint().setAlpha(1);
    if (
      action &&
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
      shot.setVelocity(this.facing * 350, 110).setData('born', time);
      body(shot).setAllowGravity(true).setGravityY(-600);
      sound.fx('fire');
    }
    for (const s of this.shots.getChildren() as Sprite[])
      if (time - s.getData('born') > 1800) s.destroy();
    for (const e of this.enemies.getChildren() as Sprite[]) {
      if (e.y > 390) {
        e.destroy();
        continue;
      }
      const eb = body(e),
        sleep = e.getData('sleep'),
        rolling = e.getData('rolling');
      if (!sleep) {
        let direction = Math.sign(eb.velocity.x) || -1;
        if (eb.blocked.left) direction = 1;
        if (eb.blocked.right) direction = -1;
        const nextX = e.x + direction * 20;
        if (
          eb.blocked.down &&
          this.spec.gaps.some(([a, z]) => nextX > a && nextX < z)
        )
          direction *= -1;
        e.setVelocityX(
          direction * (rolling ? 290 : e.getData('kind') === 'bug' ? 55 : 38),
        );
        e.setFlipX(direction > 0);
      }
      e.setTexture(
        e.getData('kind') + (Math.floor(time / (rolling ? 45 : 150)) % 4),
      );
    }
    // Power-ups slide off their row, then settle where they land so they can
    // never drift under a low terrace or into a gap.
    for (const item of this.items.getChildren() as Sprite[]) {
      const ib = body(item);
      if (!ib.enable) continue;
      if (item.y > 390) {
        item.destroy();
        continue;
      }
      if (item.getData('settled')) {
        item.setVelocityX(0);
        if (item.getData('kind') === 'invincible' && ib.blocked.down)
          item.setVelocityY(-160);
        continue;
      }
      if (item.y > item.getData('spawnY') + 12) item.setData('airborne', true);
      if (item.getData('airborne') && ib.blocked.down) {
        item.setData('settled', true).setVelocityX(0);
        continue;
      }
      let dir = item.getData('direction') || 1;
      if (ib.blocked.left) dir = 1;
      if (ib.blocked.right) dir = -1;
      item.setData('direction', dir).setVelocityX(dir * 70);
    }
    if (this.hero.x < HERO_FRAME.width / 2) this.hero.x = HERO_FRAME.width / 2;
    if (this.hero.y > 410) this.die();
    if (!this.bonus && !this.checkpoint && this.hero.x > this.spec.checkpoint) {
      this.checkpoint = true;
      this.add
        .image(this.spec.checkpoint + 11, 262, 'invincible')
        .setScale(0.65);
      toast('فانوس الأمان اتنوّر — هترجع هنا لو وقعت');
      sound.fx('power');
    }
    if (!this.bonus && this.hero.x > this.spec.exit - 12) this.complete();
    if (down && !this.downWas) this.portal();
    this.jumpWas = jump;
    this.actionWas = action;
    this.downWas = down;
    this.updateHud();
  }
}
