import {
  landmarkBossContact,
  landmarkBossShot,
  updateLandmarkBoss,
} from './landmark-world';
import Phaser from 'phaser';
import type { Alley } from './game';
import { EDGE, body } from './game-shared';
import type { Sprite } from './game-shared';
import { TILE } from './level-data';
import { bossBar } from './ui';
import { sound } from './audio';
import { toast } from './ui';
import { stormContact, updateStormBoss } from './world4';
import { ramContact, ramPhase, updateRamBoss } from './world5';
import { crocContact, crocPhase, updateCrocBoss } from './world6';
import { captainContact, captainPhase, updateCaptainBoss } from './world7';
import { qibliContact, qibliPhase, qibliSalt, updateQibliBoss } from './world8';

export function bossPhase(scene: Alley) {
  const hp = scene.bossState.hp;
  if (scene.bossKind === 'ram') return hp > 6 ? 1 : hp > 4 ? 2 : hp > 2 ? 3 : 4;
  return hp > 4 ? 1 : hp > 2 ? 2 : 3;
}
export function bossSet(scene: Alley, state: string, ms: number) {
  scene.bossState.state = state;
  scene.bossState.until = scene.time.now + ms;
}
export function bossContact(scene: Alley) {
  const boss = scene.boss!,
    s = scene.bossState;
  if (scene.mode !== 'play' || s.defeated || !s.active) return;
  const b = body(scene.hero),
    bb = body(boss);
  const fromAbove = b.velocity.y > 0 && b.prev.y + b.height <= bb.top + 16;
  if (scene.landmark) {
    landmarkBossContact(scene, fromAbove);
    return;
  }
  if (scene.bossKind === 'crab') {
    scene.crabContact(fromAbove);
    return;
  }
  if (scene.bossKind === 'gull') {
    stormContact(scene, fromAbove);
    return;
  }
  if (scene.bossKind === 'ram') {
    ramContact(scene, fromAbove);
    return;
  }
  if (scene.bossKind === 'croc') {
    crocContact(scene, fromAbove);
    return;
  }
  if (scene.bossKind === 'captain') {
    captainContact(scene, fromAbove);
    return;
  }
  if (scene.bossKind === 'qibli') {
    qibliContact(scene, fromAbove);
    return;
  }
  if (scene.bossKind === 'buffalo' && s.state !== 'dazed') {
    // The buffalo's back is only open while it's dazed from a crash.
    if (fromAbove) {
      scene.hero.setVelocity(scene.hero.x < boss.x ? -200 : 200, -430);
      scene.hint('horns', 'ضهره ناشف دلوقتي! خلّيه يخبط في الحيطة ويدوخ');
      return;
    }
    if (scene.time.now < scene.invincible)
      scene.hero.setVelocityX(scene.hero.x < boss.x ? -260 : 260);
    else if (s.state !== 'hurt') {
      scene.hurt();
      if (scene.mode === 'play')
        scene.hero.setVelocity(scene.hero.x < boss.x ? -280 : 280, -300);
    }
    return;
  }
  if (fromAbove) {
    scene.hero.setVelocityY(-430);
    if (scene.time.now >= s.invuln) scene.bossDamage(1);
  } else if (scene.bossKind === 'buffalo') {
    // Dazed: brushing past is harmless.
    scene.hero.setVelocityX(scene.hero.x < boss.x ? -120 : 120);
  } else if (scene.time.now < scene.invincible) {
    scene.hero.setVelocityX(scene.hero.x < boss.x ? -260 : 260);
  } else if (s.state !== 'hurt') {
    scene.hurt();
    if (scene.mode === 'play')
      scene.hero.setVelocity(scene.hero.x < boss.x ? -240 : 240, -260);
  }
}
export function bossChili(scene: Alley) {
  const s = scene.bossState;
  if (s.defeated || !s.active || scene.time.now < s.invuln) return;
  if (scene.landmark) {
    landmarkBossShot(scene);
    return;
  }
  if (
    scene.bossKind === 'crab' &&
    (s.state === 'guard' || s.state === 'snap')
  ) {
    // Raised claws swat the chili away.
    sound.fx('clack');
    scene.burst(scene.boss!.x, scene.boss!.y - 20, 0xf5a34d, 4);
    return;
  }
  if (scene.bossKind === 'ram' && s.state !== 'bowed') {
    // Shots just glance off the stone; only the bowed brow feels them.
    scene.burst(scene.boss!.x, scene.boss!.y - 20, 0xf5a34d, 4);
    scene.hint(
      'ram-chili',
      'العصاية مش بتأثر في الحجر… غير لما يوطّي راسه، أو اتنطّ على جوهرته',
    );
    return;
  }
  if (scene.bossKind === 'captain') {
    // Steel cab: only a container from the gantry hook dents it.
    scene.burst(scene.boss!.x, scene.boss!.y - 20, 0xf4c040, 4);
    scene.hint(
      'captain-shot',
      'الكابينة حديد… نزّل عليها الحاوية من خطّاف الونش الكبير',
    );
    return;
  }
  if (scene.bossKind === 'qibli') {
    qibliSalt(scene);
    return;
  }
  if (scene.bossKind === 'croc' && s.state !== 'stuck') {
    // The frond slaps off his hide unless his jaws are dug in.
    scene.burst(scene.boss!.x, scene.boss!.y - 10, 0x5aa040, 4);
    scene.hint(
      'croc-frond',
      'السعفة مش بتأثر في جلده… غير لما يغرز بقه في الرملة',
    );
    return;
  }
  s.chili++;
  scene.boss!.setTintFill(0xffa040);
  scene.time.delayedCall(
    60,
    () => scene.boss?.active && scene.boss.clearTint(),
  );
  // Chili is weaker than a stomp: two hits per heart.
  if (s.chili % 2 === 0) scene.bossDamage(1);
  else sound.fx('fire');
}
export function bossDamage(scene: Alley, n: number) {
  const s = scene.bossState,
    boss = scene.boss!;
  const before = scene.bossPhase();
  s.hp = Math.max(0, s.hp - n);
  s.invuln = scene.time.now + 1000;
  scene.score += 500;
  sound.fx('boss-hit');
  scene.cameras.main.shake(180, 0.01);
  boss.setTintFill(0xffffff);
  scene.time.delayedCall(80, () => boss.active && boss.clearTint());
  // Hit-stop.
  scene.physics.pause();
  scene.time.delayedCall(
    70,
    () => scene.mode === 'play' && scene.physics.resume(),
  );
  scene.popText(boss.x, boss.y - 40, '+٥٠٠', '#ffe08a');
  bossBar(true, s.hp / scene.bossMax, scene.bossPhase(), scene.bossName);
  if (s.hp <= 0) {
    scene.bossDefeat();
    return;
  }
  if (scene.bossPhase() !== before) {
    sound.bossPhase = scene.bossPhase() - 1;
    sound.fx('roar');
    const buffalo = scene.bossKind === 'buffalo';
    if (scene.bossKind === 'ram') ramPhase(scene, scene.bossPhase());
    else if (scene.bossKind === 'croc') crocPhase(scene.bossPhase());
    else if (scene.bossKind === 'captain') captainPhase(scene.bossPhase());
    else if (scene.bossKind === 'qibli') qibliPhase(scene.bossPhase());
    else if (scene.bossKind === 'crab')
      toast(
        scene.bossPhase() === 2
          ? 'أبو مقص اتعصّب! بيتف فقاقيع وهو مغروز'
          : 'آخر نَفَس! الموج جاي والنوارس فوقك',
      );
    else if (scene.bossKind === 'gull')
      toast(
        scene.bossPhase() === 2
          ? 'ريّس النوة اتعصّب! بيرمي صدف ويرفرف يطيّرك'
          : 'آخر نَفَس! بينادي البرق… والنوارس جاية',
      );
    else
      toast(
        scene.bossPhase() === 2
          ? buffalo
            ? 'أبو قرون اتجنن! لما يخبط الطين بيقع من فوق'
            : 'الفتوة برعي اتعصّب! بيرمي عضم سمك'
          : buffalo
            ? 'آخر نَفَس! بينطّ ويرجّ الأرض… خلي بالك من الطين'
            : 'آخر نَفَس! نطّ فوق الرجّة',
      );
    if (
      (scene.bossKind === 'crab' || scene.bossKind === 'gull') &&
      scene.bossPhase() === 3
    )
      // The storm gull calls in no gulls: his lightning is enough.
      for (const dx of scene.bossKind === 'gull' ? [] : [-140, 140]) {
        const e = scene.enemy(
          Phaser.Math.Clamp(boss.x + dx, s.arenaX + 60, scene.L.width - 60),
          3 * TILE,
          scene.bossKind === 'gull' ? 'skua' : 'gull',
        );
        // Storm gulls called in wheel about first instead of diving at
        // بلبل while he is still bouncing off the boss.
        if (scene.bossKind === 'gull')
          e.setData('until', scene.time.now + 1800);
      }
  }
  scene.bossSet('hurt', 450);
  if (scene.bossKind === 'crab')
    boss.setVelocity(boss.x < scene.hero.x ? -160 : 160, -240);
  else if (scene.bossKind === 'buffalo')
    boss.setVelocity(boss.x < scene.hero.x ? -150 : 150, -260);
  else if (scene.bossKind === 'gull')
    boss.setVelocity(boss.x < scene.hero.x ? -180 : 180, -200);
  else if (scene.bossKind === 'captain')
    boss.setVelocity(boss.x < scene.hero.x ? -60 : 60, -120);
  else if (scene.bossKind === 'ram' || scene.bossKind === 'croc')
    boss.setVelocity(boss.x < scene.hero.x ? -120 : 120, -220);
  else boss.setVelocity(boss.x < scene.hero.x ? -200 : 200, -380);
}
export function bossDefeat(scene: Alley) {
  const s = scene.bossState,
    boss = scene.boss!;
  s.defeated = true;
  scene.bossSet('dead', 99999);
  boss.setTexture(scene.bossTex('dead')).setFlipY(true);
  body(boss).checkCollision.none = true;
  body(boss).setAllowGravity(true);
  if (scene.w4) {
    for (const b of scene.w4.bolts.splice(0)) b.img.destroy();
    scene.w4.bossGustUntil = 0;
  }
  if (scene.w5) scene.w5.darkTarget = 0;
  boss.setVelocity(0, -300);
  scene.hazards.clear(true, true);
  scene.burst(boss.x, boss.y, 0xffd474, 40);
  sound.fx('clear');
  sound.setTrack(scene.L.meta.track);
  sound.setIntensity(0);
  bossBar(false);
  toast(
    {
      prism: 'خنفساء المنشور اتطفت! باب الأفق اتفتح',
      guardian: 'حارس النحاس سلّم المفتاح! باب القلعة اتفتح',
      mill: 'الترس وقف بسلام! رشيد اتفتحت والمشوار اكتمل',
      ram: 'الكبش الحارس رجع حجر! باب الكرنك اتفتح… وأسوان مستنياك',
      croc: 'التمساح الكبير رجع النيل! الجزيرة بقت بتاعتك… وبورسعيد مستنياك',
      captain: 'ريّس الميناء نزل من الونش! الميناء بقى بتاعك… وسيوة مستنياك',
      qibli: 'القِبْلي اتشتت على العين! الواحة بقت بتاعتك… والأهرامات مستنياك',
      buffalo: 'أبو قرون قعد في الطين! باب الجرن اتفتح',
      crab: 'أبو مقص رجع البحر! رأس البر بقت بتاعتك',
      gull: 'ريّس النوة طار مع الريح! النوة هديت والقلعة بقت بتاعتك',
      fatwa: 'الفتوة برعي اتهزم! باب الخروج اتفتح',
    }[scene.bossKind],
  );
  scene.kills++;
  scene.score += 3000;
  scene.cameras.main.setBounds(0, 0, scene.L.width + EDGE, scene.L.height);
  scene.cameras.main
    .startFollow(
      scene.hero,
      true,
      0.12,
      0.2,
      0,
      scene.cameras.main.followOffset.y,
    )
    .setDeadzone(90, 70);
  scene.camFocus?.destroy();
  scene.camFocus = undefined;
  scene.exitDoor!.setVisible(true).setAlpha(0).setScale(1, 0.2);
  (
    scene.children.getByName('exit-glow') as Phaser.GameObjects.Image | null
  )?.setVisible(true);
  scene.tweens.add({
    targets: scene.exitDoor,
    alpha: 1,
    scaleY: 1,
    duration: 600,
    ease: 'Back.out',
    delay: 500,
  });
}
export function updateBoss(scene: Alley, time: number) {
  const boss = scene.boss!,
    s = scene.bossState,
    bb = body(boss);
  if (s.defeated) {
    if (boss.y > scene.L.height + 200) boss.destroy();
    return;
  }
  if (!s.active) {
    boss.setTexture(
      scene.bossTex(
        'idle' +
          (Math.floor(time / (scene.bossKind === 'gull' ? 160 : 400)) % 2),
      ),
    );
    if (scene.bossKind === 'gull')
      body(boss).setVelocityY(Math.sin(time / 300) * 20);
    if (scene.hero.x > s.arenaX + TILE * 3) {
      s.active = true;
      scene.camFocus = scene.add.zone(
        scene.cameras.main.midPoint.x,
        scene.hero.y,
        1,
        1,
      );
      scene.cameras.main
        .startFollow(
          scene.camFocus,
          true,
          1,
          0.2,
          0,
          scene.cameras.main.followOffset.y,
        )
        .setDeadzone(0, 70);
      scene.cameras.main.setBounds(
        s.arenaX,
        0,
        scene.L.width - s.arenaX,
        scene.L.height,
      );
      sound.setTrack(scene.L.meta.bossTrack ?? 4);
      sound.fx(
        {
          prism: 'clack',
          guardian: 'rumble',
          mill: 'clack',
          ram: 'rumble',
          croc: 'roar',
          captain: 'rumble',
          qibli: 'roar',
          buffalo: 'moo',
          crab: 'clack',
          gull: 'screech',
          fatwa: 'roar',
        }[scene.bossKind],
      );
      bossBar(true, 1, 1, scene.bossName);
      toast(
        {
          prism: 'اعكس النور على المستقبلات، ولما الخنفساء تنوّر أخضر اضربها',
          guardian: 'افصل فوانيس الحراس من وراهم، وبعدها درع الحارس ينكشف',
          mill: 'وزن الأكياس على العلامة، ولما قلب الترس ينوّر اضربه',
          croc: 'تمساح النيل الكبير: «الجزيرة دي بتاعتي!» — لما يهجم ويغرز بقه في الرملة اتنطّ على راسه، ونطّ فوق موجة ديله',
          captain:
            'ريّس الميناء: «محدّش يرسى في ميناي!» — ابعد عن علامة الحاوية، اتشعبط في خطّاف الونش الكبير اللي فوق ونزّل الحاوية على كابينته',
          qibli:
            'القِبْلي: «الواحة دي في ريحي!» — نطّ فوق موجة الرمل، افتح العين بالملح، وجرّه يضرب فوقها',
          ram: 'الكبش الحارس: «محدّش يعدّي الكرنك!» — لما يخبط الأرض ويوطّي راسه اتنطّ على الجوهرة، وحجر واحد بينزل وظلّه بيبان قبله',
          buffalo:
            'أبو قرون: «مين داس على جرني؟!» — خلّيه يخبط ويدوخ واتنطّ على ضهره',
          crab: 'أبو مقص: «مين داخل شطّي؟!» — استنى مقصّه يتغرز في الرملة واتنطّ عليه',
          gull: 'ريّس النوة: «القلعة دي بتاعتي!» — استنى لما يغطس ويغرز منقاره واتنطّ عليه',
          fatwa: 'الفتوة برعي: «مين اللي داخل حارتي؟!» — اتنطّ على راسه',
        }[scene.bossKind],
      );
      scene.bossSet('walk', 1600);
      scene.cameras.main.shake(300, 0.006);
    }
    return;
  }
  if (scene.landmark) {
    updateLandmarkBoss(scene, time);
    scene.updateHazards(time);
    return;
  }
  if (scene.bossKind === 'buffalo') {
    scene.updateBuffalo(time);
    scene.updateHazards(time);
    return;
  }
  if (scene.bossKind === 'crab') {
    scene.updateCrab(time);
    scene.updateHazards(time);
    return;
  }
  if (scene.bossKind === 'gull') {
    updateStormBoss(scene, time);
    scene.updateHazards(time);
    return;
  }
  if (scene.bossKind === 'ram') {
    updateRamBoss(scene, time);
    scene.updateHazards(time);
    return;
  }
  if (scene.bossKind === 'croc') {
    updateCrocBoss(scene, time);
    scene.updateHazards(time);
    return;
  }
  if (scene.bossKind === 'captain') {
    updateCaptainBoss(scene, time);
    scene.updateHazards(time);
    return;
  }
  if (scene.bossKind === 'qibli') {
    updateQibliBoss(scene, time);
    scene.updateHazards(time);
    return;
  }
  const phase = scene.bossPhase();
  const grounded = bb.blocked.down;
  const toHero = Math.sign(scene.hero.x - boss.x) || 1;
  if (s.state !== 'leap' && s.state !== 'hurt') boss.setFlipX(toHero < 0);
  const over = time > s.until;
  switch (s.state) {
    case 'walk':
      boss.setTexture('boss-idle' + (Math.floor(time / 180) % 2));
      boss.setVelocityX(toHero * (phase === 3 ? 95 : 62));
      if (over) {
        boss.setVelocityX(0);
        if (phase === 1) scene.bossSet('telegraph', 650);
        else if (phase === 2) {
          s.volley = 3;
          scene.bossSet('throw', 350);
        } else scene.bossSet('slamUp', 200);
      }
      break;
    case 'throw':
      boss.setTexture('boss-throw');
      boss.setVelocityX(0);
      if (over) {
        if (s.volley > 0) {
          scene.throwBone(boss, phase);
          s.volley--;
          scene.bossSet('throw', phase === 3 ? 260 : 380);
        } else scene.bossSet('telegraph', phase === 3 ? 450 : 600);
      }
      break;
    case 'slamUp':
      boss.setTexture('boss-crouch');
      if (grounded && over) {
        boss.setVelocity(0, -620);
        boss.setTexture('boss-leap');
        scene.bossSet('slam', 2000);
      }
      break;
    case 'slam':
      if (grounded && bb.velocity.y >= 0 && time > s.until - 1800) {
        sound.fx('shock');
        scene.cameras.main.shake(220, 0.012);
        for (const d of [-1, 1]) {
          const w = scene.hazards.create(
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
        scene.bossSet('throw', 500);
      }
      break;
    case 'telegraph':
      boss.setTexture('boss-crouch');
      boss.setVelocityX(0);
      boss.setTint(Math.floor(time / 80) % 2 ? 0xff9a7a : 0xffffff);
      if (over) {
        boss.clearTint();
        const dx = Phaser.Math.Clamp((scene.hero.x - boss.x) / 0.95, -300, 300);
        boss.setVelocity(dx, phase === 3 ? -600 : -540);
        boss.setTexture('boss-leap');
        sound.fx('roar');
        scene.bossSet('leap', 2000);
      }
      break;
    case 'leap':
      if (grounded && bb.velocity.y >= 0 && time > s.until - 1850) {
        boss.setVelocityX(0);
        scene.cameras.main.shake(120, 0.006);
        scene.burst(boss.x, bb.bottom, 0xb8a888, 10);
        scene.bossSet('dazed', phase === 1 ? 1600 : phase === 2 ? 1300 : 1050);
      }
      break;
    case 'dazed':
      boss.setTexture('boss-dazed');
      boss.setVelocityX(0);
      if (Math.floor(time / 120) % 3 === 0) {
        const st = scene.add
          .image(boss.x + Math.cos(time / 150) * 22, boss.y - 38, 'star')
          .setDepth(20);
        scene.tweens.add({
          targets: st,
          alpha: 0,
          y: st.y - 8,
          duration: 300,
          onComplete: () => st.destroy(),
        });
      }
      if (over) scene.bossSet('walk', phase === 3 ? 900 : 1300);
      break;
    case 'hurt':
      boss.setTexture('boss-hurt');
      if (over && grounded) {
        boss.setVelocityX(0);
        scene.bossSet('walk', 700);
      }
      break;
  }
  scene.clampBoss();
  scene.updateHazards(time);
}
/** «أبو مقص» contact: claws up (guard / snap) can't be stomped; while
 * his claws are stuck in the sand he is harmless from the side. */
export function crabContact(scene: Alley, fromAbove: boolean) {
  const boss = scene.boss!,
    s = scene.bossState;
  const armed = s.state === 'guard' || s.state === 'snap';
  if (fromAbove && !armed) {
    scene.hero.setVelocityY(-430);
    if (scene.time.now >= s.invuln) scene.bossDamage(1);
    return;
  }
  if (fromAbove && armed) {
    scene.hero.setVelocity(scene.hero.x < boss.x ? -220 : 220, -440);
    scene.hint('crab-guard', 'المقص مرفوع! استنى لما يتغرز في الرملة');
    scene.hurt();
    return;
  }
  if (s.state === 'stuck' || s.state === 'hurt') {
    scene.hero.setVelocityX(scene.hero.x < boss.x ? -140 : 140);
    return;
  }
  if (scene.time.now < scene.invincible)
    scene.hero.setVelocityX(scene.hero.x < boss.x ? -260 : 260);
  else {
    scene.hurt();
    if (scene.mode === 'play')
      scene.hero.setVelocity(scene.hero.x < boss.x ? -260 : 260, -280);
  }
}
/** walk → guard (claws up) → snap (lunge) → stuck (vulnerable) → spit /
 * waves in later phases → walk. */
export function updateCrab(scene: Alley, time: number) {
  const boss = scene.boss!,
    s = scene.bossState,
    bb = body(boss);
  const phase = scene.bossPhase();
  const grounded = bb.blocked.down;
  const toHero = Math.sign(scene.hero.x - boss.x) || 1;
  const [lo, hi] = scene.bossRange();
  const over = time > s.until;
  const tex = (pose: string) => boss.setTexture(scene.bossTex(pose));
  if (!['snap', 'hurt'].includes(s.state)) boss.setFlipX(toHero > 0);
  switch (s.state) {
    case 'walk':
      tex('idle' + (Math.floor(time / 120) % 2));
      boss.setVelocityX(toHero * [70, 90, 110][phase - 1]);
      if (over) {
        boss.setVelocityX(0);
        sound.fx('clack');
        scene.bossSet('guard', [800, 650, 520][phase - 1]);
      }
      break;
    case 'guard':
      tex('guard');
      boss.setVelocityX(Math.sin(time / 30) * 10);
      if (over) {
        s.volley = toHero;
        sound.fx('clack');
        scene.bossSet('snap', 700);
      }
      break;
    case 'snap': {
      tex('snap');
      const d = s.volley || 1;
      boss.setFlipX(d > 0);
      boss.setVelocityX(d * [290, 320, 350][phase - 1]);
      if (Math.floor(time / 50) % 2 === 0)
        scene.burst(boss.x - d * 40, bb.bottom, 0xe0cca0, 2);
      const atEdge = (d < 0 && boss.x <= lo + 2) || (d > 0 && boss.x >= hi - 2);
      if (over || atEdge || bb.blocked.left || bb.blocked.right) {
        boss.setVelocityX(0);
        scene.cameras.main.shake(140, 0.007);
        scene.burst(boss.x + d * 46, bb.bottom, 0xe0cca0, 10);
        sound.fx('shock');
        scene.bossSet('stuck', [1400, 1200, 1000][phase - 1]);
      }
      break;
    }
    case 'stuck':
      tex('stuck');
      boss.setVelocityX(0);
      if (Math.floor(time / 140) % 3 === 0)
        scene.burst(
          boss.x + (Math.random() - 0.5) * 80,
          bb.bottom - 2,
          0xe0cca0,
          1,
        );
      if (over) {
        if (phase >= 2) {
          scene.bossSet('spit', phase === 3 ? 900 : 700);
          scene.spitBubbles(boss, phase);
        } else scene.bossSet('walk', 1500);
      }
      break;
    case 'spit':
      tex('spit');
      boss.setVelocityX(0);
      if (over) {
        if (phase === 3) scene.crabWave(boss);
        scene.bossSet('walk', phase === 3 ? 1000 : 1300);
      }
      break;
    case 'hurt':
      tex('hurt');
      if (over && grounded) {
        boss.setVelocityX(0);
        scene.bossSet('walk', 800);
      }
      break;
  }
  scene.clampBoss();
}
export function spitBubbles(scene: Alley, boss: Sprite, phase: number) {
  sound.fx('swim');
  const n = phase === 3 ? 4 : 3;
  for (let i = 0; i < n; i++) {
    const b = scene.hazards.create(boss.x, boss.y - 24, 'bubble') as Sprite;
    body(b).setSize(10, 10).setGravityY(-500);
    const spread = (i - (n - 1) / 2) * 70;
    b.setVelocity(
      Phaser.Math.Clamp(scene.hero.x - boss.x, -260, 260) * 0.6 + spread,
      -330 - (i % 2) * 60,
    )
      .setData('kind', 'bubble')
      .setDepth(9);
  }
}
export function crabWave(scene: Alley, boss: Sprite) {
  sound.fx('splash');
  for (const d of [-1, 1]) {
    const w = scene.hazards.create(
      boss.x + d * 50,
      body(boss).bottom - 11,
      'wave',
    ) as Sprite;
    body(w).setAllowGravity(false).setSize(30, 16).setOffset(5, 6);
    w.setVelocityX(d * 210)
      .setData('kind', 'wave')
      .setData('born', scene.time.now)
      .setDepth(9)
      .setFlipX(d < 0);
  }
}
/** Where the boss's centre may go: its whole sprite stays between the
 * arena's left camera edge and the right wall, so it is never cut off. */
export function bossRange(scene: Alley): [number, number] {
  const half = (scene.boss?.displayWidth ?? 80) / 2;
  return [scene.bossState.arenaX + half + 4, scene.L.width - TILE - half + 6];
}
export function clampBoss(scene: Alley) {
  const [lo, hi] = scene.bossRange();
  scene.boss!.x = Phaser.Math.Clamp(scene.boss!.x, lo, hi);
}
/** Boss-fight camera: frame hero and boss together inside the arena,
 * always keeping the hero on screen and, whenever the gap allows, the
 * whole boss too. */
export function frameBossFight(scene: Alley) {
  const cam = scene.cameras.main,
    boss = scene.boss!,
    w = cam.width;
  const half = boss.displayWidth / 2 + 6;
  let lo = scene.hero.x - w / 2 + 40,
    hi = scene.hero.x + w / 2 - 40;
  const blo = boss.x + half - w / 2,
    bhi = boss.x - half + w / 2;
  if (Math.max(lo, blo) <= Math.min(hi, bhi)) {
    lo = Math.max(lo, blo);
    hi = Math.min(hi, bhi);
  }
  const left = scene.bossState.arenaX,
    right = scene.L.width;
  // Glide toward the midpoint, but never let the glide lag push hero or
  // boss out of frame: the smoothed centre is hard-clamped to the range
  // that keeps both in view.
  const target = Phaser.Math.Clamp((scene.hero.x + boss.x) / 2, lo, hi);
  const cur = scene.camFocus!.x;
  let cx = Phaser.Math.Clamp(cur + (target - cur) * 0.16, lo, hi);
  cx =
    right - left <= w
      ? (left + right) / 2
      : Phaser.Math.Clamp(cx, left + w / 2, right - w / 2);
  scene.camFocus!.setPosition(cx, scene.hero.y);
}
