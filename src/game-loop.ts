import type { Alley } from './game';
import { body } from './game-shared';
import type { Sprite } from './game-shared';
import { TILE } from './level-data';
import { PHYSICS } from './levels';
import { CANAL, GUST, GLIDE, MUD, SAND, WET } from './level-parse';
import { approach, jumpAllowed } from './rules';
import { sailStep } from './sail';
import { hangStep, tryHook } from './crane';
import { beltPush, updateNet } from './world3';
import { alexMove, bossGustPush } from './world4';
import { luxorMove } from './world5';
import { boardStep, maybeStartBoard } from './world8';
import { sound } from './audio';
import { toast, touch } from './ui';

export function updateGame(scene: Alley, time: number, delta: number) {
  const dt = Math.min(delta, 35) / 1000;
  scene.clock += dt;
  if (!scene.hero) return;
  scene.updateWorld(time, dt);
  if (scene.mode === 'title' || scene.mode === 'map') {
    scene.animateHero(time, true, 0, false);
    return;
  }
  if (scene.mode !== 'play') return;
  scene.elapsed += dt;
  scene.remaining -= dt;
  if (scene.remaining <= 0) {
    scene.lastHurtBy = 'time';
    scene.die();
    return;
  }
  const left = scene.keys.LEFT.isDown || scene.keys.A.isDown || touch.left,
    right = scene.keys.RIGHT.isDown || scene.keys.D.isDown || touch.right;
  const jump =
    scene.keys.SPACE.isDown ||
    scene.keys.Z.isDown ||
    scene.keys.UP.isDown ||
    scene.keys.W.isDown ||
    touch.jump ||
    touch.stickJump;
  const keyAction = scene.keys.X.isDown || scene.keys.SHIFT.isDown,
    action = keyAction || touch.run,
    throwing = keyAction || touch.throw,
    down = scene.keys.DOWN.isDown || scene.keys.S.isDown || touch.down;
  const b = body(scene.hero);
  // Riding a lamp or boat that drops away under you still counts as
  // standing, so you can always jump off it.
  const grounded = b.blocked.down || b.touching.down || scene.riding;
  if (grounded) scene.lastGround = time;
  if (jump && !scene.jumpWas) scene.lastPress = time;
  // Sailing the felucca replaces walking: the hero rides the deck.
  move: {
    if (scene.sail?.on) {
      sailStep(scene, scene.sail, time, dt, {
        dir: Number(right) - Number(left),
        jump: jump && !scene.jumpWas,
      });
      scene.lastPress = -1000;
      scene.animateHero(time, time >= scene.sail.hopUntil, 0, false);
      break move;
    }
    if (scene.siwa) maybeStartBoard(scene, scene.siwa);
    if (scene.siwa?.boarding) {
      boardStep(scene, scene.siwa, time, dt, {
        dir: Number(right) - Number(left),
        jump: jump && !scene.jumpWas,
      });
      scene.animateHero(time, grounded, 1, false);
      break move;
    }
    if (scene.crane?.hang) {
      hangStep(scene, scene.crane, time, {
        dir: Number(right) - Number(left),
        jumpPressed: jump && !scene.jumpWas,
        downPressed: down && !scene.downWas,
      });
      scene.lastPress = -1000;
      scene.animateHero(time, false, 0, false);
      break move;
    }
    // Wind gusts: the level's strength and rhythm (Cairo: 2.6 s on, 1.6
    // off), easing in and out so you feel each one build.
    const G = scene.L.meta.gust ?? GUST,
      gt = time % (G.on + G.off);
    const gust = scene.L.wind.length > 0 && gt < G.on;
    const env = gust ? Math.min(1, gt / 350, (G.on - gt) / 250) : 0;
    if (gust !== scene.windOn) {
      scene.windOn = gust;
      scene.windEmitters.forEach((e) => (gust ? e.start() : e.stop()));
      if (
        gust &&
        scene.L.wind.some(
          (w) => Math.abs(scene.hero.y - (w.y0 + w.y1) / 2) < 300,
        )
      )
        sound.fx('wind');
    }
    let windPush = 0;
    if (gust)
      for (const w of scene.L.wind)
        if (
          scene.hero.x > w.x0 &&
          scene.hero.x < w.x1 &&
          scene.hero.y > w.y0 &&
          scene.hero.y < w.y1
        )
          windPush = w.dir * G.push * env;
    windPush += bossGustPush(scene, time);
    const camelRide =
      scene.riding && scene.moverList.some((m) => m.camel && m.donkey?.ridden);
    // Direction steers the mount while seated, rather than walking off its back.
    // A jump returns normal left/right movement for dismounting.
    if (camelRide && (left || right)) scene.facing = left ? -1 : 1;
    const dir = camelRide && !jump ? 0 : Number(right) - Number(left);
    // Countryside ground: mud bogs you down, canals float you and drag you.
    const under = scene.L.at(
      Math.floor(b.center.x / TILE),
      Math.floor((b.bottom + 2) / TILE),
    );
    scene.onMud = grounded && under === 'u';
    if (scene.onMud) {
      scene.hint('mud', 'الطين بيمسك في رجلك… والنطّة من فوقه ضعيفة');
      if (dir && Math.floor(time / 110) % 2 === 0)
        scene.burst(scene.hero.x, b.bottom, 0x4a3020, 1);
    }
    const canal = scene.zip ? undefined : scene.canalAt(b.center.x, b.bottom);
    if (canal && !scene.swimming) {
      sound.fx('splash');
      scene.burst(scene.hero.x, canal.top, 0x8ad0b8, 8);
      if (canal.sea)
        scene.hint(
          'sea',
          'البحر بيعلى وينزل مع المدّ… اعوم واضغط نطّ عشان تطلع',
        );
      else
        scene.hint(
          'canal',
          canal.dir < 0
            ? 'التيار ضدّك! اعوم واضغط نطّ عشان تطلع'
            : 'التيار شايلك… اضغط نطّ عشان تطلع من الترعة',
        );
    }
    scene.swimming = !!canal;
    if (canal) {
      const depth = b.center.y - canal.top;
      if (depth > -2)
        b.velocity.y -= (1100 + Math.min(1, (depth + 2) / 14) * 900) * dt;
      b.velocity.y *= Math.pow(0.9, dt * 60);
      b.velocity.y = Phaser.Math.Clamp(b.velocity.y, -CANAL.swimJump, 150);
      windPush += canal.dir * CANAL.current;
      const stroke =
        depth < 16 &&
        ((jump && !scene.jumpWas) ||
          (touch.stickJump && time - scene.lastStroke >= CANAL.stroke));
      if (stroke) {
        scene.hero.setVelocityY(-CANAL.swimJump);
        scene.lastStroke = time;
        scene.lastPress = -1000;
        sound.fx('swim');
        scene.burst(scene.hero.x, canal.top, 0x8ad0b8, 6);
      }
      if (Math.floor(time / 300) % 4 === 0 && Math.abs(b.velocity.x) > 20)
        scene.burst(
          scene.hero.x - scene.facing * 10,
          canal.top + 2,
          0xc8fff0,
          1,
        );
    }
    windPush += beltPush(under, grounded);
    const alex = alexMove(scene, grounded, under, jump, dt);
    const sand = luxorMove(scene, grounded, under);
    windPush += sand.push;
    if (alex.glide) windPush *= GLIDE.wind;
    if (beltPush(under, grounded))
      scene.hint('belt', 'السير شغّال! بيزقّك… امشي عكسه أو استغلّه');
    const hanging =
      !scene.zip &&
      updateNet(
        scene,
        time,
        { dir, jump, jumpPressed: jump && !scene.jumpWas, down },
        grounded,
      );
    if (scene.zip) scene.updateZip(time, jump);
    else if (hanging) {
      scene.lastPress = -1000;
    } else {
      if (!grounded && time > scene.zipCooldown) scene.tryGrab();
      if (!grounded && !scene.zip && scene.crane)
        tryHook(scene, scene.crane, time);
      if (
        !scene.zip &&
        jumpAllowed(time - scene.lastGround, time - scene.lastPress)
      ) {
        scene.hero.setVelocityY(
          (action ? -PHYSICS.runJump : -PHYSICS.jump) *
            (scene.onMud ? MUD.jump : 1),
        );
        scene.lastGround = -1000;
        scene.lastPress = -1000;
        sound.fx('jump');
        scene.burst(scene.hero.x, scene.hero.y + 17, 0xdcb08a, 5);
      }
      if (
        !jump &&
        scene.jumpWas &&
        b.velocity.y < -180 &&
        b.velocity.y > -PHYSICS.runJump - 5
      )
        scene.hero.setVelocityY(b.velocity.y * 0.48);
      const speed =
        (action ? 245 : 157) *
        (scene.onMud ? MUD.speed : 1) *
        (scene.swimming ? CANAL.swim : 1);
      b.velocity.x = approach(
        b.velocity.x,
        dir * speed + windPush,
        (dir
          ? sand.sand
            ? SAND.accel
            : alex.wet || under === 'ل'
              ? WET.accel
              : 1000
          : grounded
            ? sand.sand
              ? SAND.carry
              : alex.wet || under === 'ل'
                ? WET.decel
                : 1400
            : 450) * dt,
      );
      const skid =
        dir && Math.sign(b.velocity.x) !== dir && Math.abs(b.velocity.x) > 50;
      if (dir && !skid) scene.facing = dir;
      // Hold down on a one-way ledge to drop through it.
      if (down && grounded) {
        if (!scene.downWas) scene.downSince = time;
        if (time - scene.downSince > 280 && scene.onOneWay()) {
          scene.dropUntil = time + 240;
          scene.downSince = time + 10000;
        }
      }
    }
    scene.hero.setFlipX(scene.facing < 0);
    scene.animateHero(time, grounded && !scene.zip, dir, down);
  }
  if (time < scene.invincible) {
    scene.hero.setTint(
      [0xffcc79, 0x8ee9cb, 0xffffff][Math.floor(time / 100) % 3],
    );
    if (Math.floor(time / 80) % 2 === 0)
      scene.burst(scene.hero.x, scene.hero.y, 0x9fe3c4, 1);
  } else if (time < scene.hurtUntil)
    scene.hero.setAlpha(Math.floor(time / 90) % 2 === 0 ? 0.45 : 1);
  else scene.hero.setAlpha(1);
  scene.heroGlow.setPosition(scene.hero.x, scene.hero.y);
  if (scene.heldLantern && scene.heldLanternGlow) {
    const lx = scene.hero.x + scene.facing * 11,
      ly = scene.hero.y + 8;
    const flicker =
      0.82 +
      Math.sin(scene.clock * 7) * 0.08 +
      Math.sin(scene.clock * 13) * 0.04;
    scene.heldLantern.setPosition(lx, ly).setFlipX(scene.facing < 0);
    scene.heldLanternGlow
      .setPosition(lx, ly)
      .setFlipX(scene.facing < 0)
      .setAlpha(flicker);
  }
  if (
    throwing &&
    !scene.actionWas &&
    scene.power === 2 &&
    !scene.weapon().hidden &&
    time - scene.lastShot > 280
  ) {
    const w = scene.weapon();
    scene.lastShot = time;
    scene.throwUntil = time + 220;
    const shot = scene.shots.create(
      scene.hero.x + scene.facing * 18,
      scene.hero.y - 3,
      w.projectile,
    ) as Sprite;
    shot
      .setVelocity(scene.facing * w.vx, w.vy)
      .setData('born', time)
      .setData('bounce', w.bounce)
      .setData('spin', (w.spin ?? 0) * scene.facing)
      .setData('splat', w.splat ?? (w.bounce ? 0xf5a34d : 0x8a4a2a))
      .setDepth(9);
    body(shot).setAllowGravity(true).setGravityY(w.gravityY);
    sound.fx(w.sfx);
  }
  for (const s of scene.shots.getChildren() as Sprite[]) {
    if (time - s.getData('born') > 1800) s.destroy();
    else if (s.getData('spin')) s.angle += s.getData('spin') * dt;
  }
  let near = false;
  for (const e of scene.enemies.getChildren() as Sprite[]) {
    if (e.y > scene.L.height + 60) {
      e.destroy();
      continue;
    }
    if (
      Math.abs(e.x - scene.hero.x) < 220 &&
      Math.abs(e.y - scene.hero.y) < 160
    )
      near = true;
    scene.updateEnemy(e, time);
  }
  scene.updateItems();
  if (scene.boss?.active) scene.updateBoss(time);
  if (scene.camFocus && scene.boss?.active) scene.frameBossFight();
  for (const l of scene.lanterns)
    if (
      !l.lit &&
      Math.abs(l.img.x - scene.hero.x) < 34 &&
      Math.abs(l.img.y - scene.hero.y) < 46
    )
      scene.lightLantern(l);
  if (
    scene.secret?.active &&
    Math.abs(scene.secret.x - scene.hero.x) < 22 &&
    Math.abs(scene.secret.y - scene.hero.y) < 34
  )
    scene.findSecret();
  if (scene.fakeRect) {
    const inside = scene.fakeRect.contains(scene.hero.x, scene.hero.y);
    for (const f of scene.fakes)
      f.setAlpha(approach(f.alpha, inside ? 0.22 : 1, dt * 4));
  }
  if (scene.L.tank && down && !scene.downWas && grounded) scene.useTank();
  let intensity = near ? 1 : 0;
  if (scene.water) {
    const w = scene.water;
    const inShaft = scene.hero.x > w.x0 && scene.hero.x < w.x1;
    if (!w.active && scene.hero.x > w.trigger && inShaft) {
      w.active = true;
      toast('المية طالعة! اطلع بسرعة');
      sound.fx('splash');
      scene.cameras.main.shake(250, 0.005);
    }
    if (w.active && w.y > w.stop) w.y = Math.max(w.stop, w.y - w.speed * dt);
    if (w.active && inShaft && w.y > w.stop) intensity = 2;
    if (inShaft && b.bottom > w.y + 10) {
      sound.fx('splash');
      scene.lastHurtBy = 'water';
      scene.die();
      return;
    }
  }
  if (scene.remaining < 100) intensity = Math.max(intensity, 2);
  if (!scene.bossState.active || scene.bossState.defeated)
    sound.setIntensity(intensity);
  const cp = scene.spec.checkpoint;
  if (
    scene.L.checkpoint &&
    !scene.checkpoint &&
    Math.abs(scene.hero.x - cp.x) < 20 &&
    Math.abs(b.bottom - cp.y) < 30
  ) {
    scene.checkpoint = true;
    scene.flag?.setTexture('checkpoint-lit');
    scene.burst(cp.x, cp.y - 50, 0xffd36b, 16);
    toast('علم الأمان اترفع — هترجع هنا لو وقعت');
    sound.fx('checkpoint');
    scene.stashRun();
  }
  if (
    scene.exitDoor?.visible &&
    Math.abs(scene.hero.x - scene.spec.exit.x) < 18 &&
    Math.abs(b.bottom - scene.spec.exit.y) < 30
  )
    scene.complete();
  if (scene.hero.x < 12) scene.hero.x = 12;
  // Once the gull's fight starts the camera is locked to the keep roof;
  // keep the hero inside it too, so you can't walk (or be blown by his
  // wing-beat) off screen.
  if (
    scene.bossKind === 'gull' &&
    scene.bossState.active &&
    scene.boss?.active
  ) {
    const lo = scene.bossState.arenaX + 12;
    if (scene.hero.x < lo) {
      scene.hero.x = lo;
      if (body(scene.hero).velocity.x < 0) body(scene.hero).velocity.x = 0;
    }
  }
  if (scene.hero.x > scene.L.width - 12) scene.hero.x = scene.L.width - 12;
  if (scene.hero.y > scene.L.height + 60) {
    scene.lastHurtBy = 'fall';
    scene.die();
  }
  scene.riseVy = body(scene.hero).velocity.y;
  scene.jumpWas = jump;
  scene.actionWas = throwing;
  scene.downWas = down;
  scene.updateHud();
}
