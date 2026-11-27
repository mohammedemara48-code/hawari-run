// World 8 (سيوة) runtime: thirst, sink-sand, mirages, springs, camels,
// date shortcuts, the sandboard, the sandstorm, the scorpion, and the
// boss «القِبْلي» — a living south-wind sandstorm beaten by luring him
// onto an opened spring. Salt shatters mirages and interrupts a slam;
// stomping him just bounces off.
import Phaser from 'phaser';
import { camelGroundY } from './camel-ground';
import type { Alley } from './game';
import { TILE } from './level-data';
import { sound } from './audio';
import { hash } from './art-kit';
import { fightCue, toast, setThirst } from './ui';
import { isW8 } from './world8-art';

type Sprite = Phaser.Physics.Arcade.Sprite;
type Img = Phaser.Physics.Arcade.Image;
type Body = Phaser.Physics.Arcade.Body;
const body = (s: Phaser.GameObjects.GameObject) =>
  (s as Phaser.Physics.Arcade.Image).body as Body;
const oneWay = (b: Body) => {
  b.checkCollision.down = false;
  b.checkCollision.left = false;
  b.checkCollision.right = false;
};

export const THIRST = {
  max: 100,
  /** Seconds of full sun / full shade to empty the meter. */
  sun: 28,
  shade: 70,
  warn: 25,
};
export const SINK = {
  still: 28,
  start: 280,
  ms: 900,
};
export const BOARD = {
  cruise: 118,
  boost: 34,
  slow: 28,
  min: 72,
  accel: 360,
};
const CAMEL = { width: 5, speed: 86, pause: 420 };

export interface W8 {
  thirst: number;
  shade: boolean;
  sinkMs: number;
  sinking: boolean;
  springs: {
    x: number;
    y: number;
    col: number;
    img: Phaser.GameObjects.Image;
    buried?: Img;
  }[];
  palms: { x: number; y: number; col: number }[];
  dates: Sprite[];
  datesNeed: number;
  datesGot: number;
  gates: Img[];
  gatesOpen: boolean;
  mirages: (Img & { real?: boolean })[];
  camels: {
    img: Img;
    min: number;
    max: number;
    dir: number;
    waitUntil: number;
  }[];
  boarding: boolean;
  boardFrom: number;
  boardTo: number;
  boardY: number;
  boardImg?: Phaser.GameObjects.Image;
  stormFrom: number;
  veil?: Phaser.GameObjects.Rectangle;
  pulse?: Phaser.GameObjects.Image;
  lastPulse: number;
}

function under(s: Alley) {
  const b = body(s.hero);
  return s.L.at(
    Math.floor(b.center.x / TILE),
    Math.floor((b.bottom + 2) / TILE),
  );
}

export function inShade(s: Alley, w: W8) {
  const hx = s.hero.x,
    hy = s.hero.y;
  const col = Math.floor(hx / TILE);
  const row = Math.floor(hy / TILE);
  // A roof: a solid tile above the hero within a few rows.
  for (let r = row - 1; r >= row - 5 && r >= 0; r--) {
    const ch = s.L.at(col, r);
    if (ch === '#' || ch === 'X' || ch === '=' || ch === 'B') return true;
  }
  for (const p of w.palms)
    if (Math.abs(p.x - hx) < 28 && hy + 20 > p.y - 10 && hy < p.y + 50)
      return true;
  return false;
}

export function buildSiwa(s: Alley): W8 | undefined {
  if (!isW8(s.L.meta.theme)) return undefined;
  const L = s.L;
  const w: W8 = {
    thirst: THIRST.max,
    shade: false,
    sinkMs: 0,
    sinking: false,
    springs: [],
    palms: [],
    dates: [],
    datesNeed: 0,
    datesGot: 0,
    gates: [],
    gatesOpen: false,
    mirages: [],
    camels: [],
    boarding: false,
    boardFrom: (L.meta.board?.fromCol ?? 0) * TILE,
    boardTo: (L.meta.board?.toCol ?? 0) * TILE,
    boardY: ((L.meta.board?.row ?? 0) + 1) * TILE,
    stormFrom: (L.meta.stormFrom ?? 9999) * TILE,
    lastPulse: 0,
  };
  for (let r = 0; r < L.rows; r++)
    for (let c = 0; c < L.cols; c++) {
      const ch = L.at(c, r),
        x = c * TILE + 12,
        y = r * TILE + 12;
      if (ch === 'ع') {
        const img = s.add.image(x, y + 4, 'spring').setDepth(3);
        w.springs.push({ x, y: y + 4, col: c, img });
      } else if (ch === 'ش') {
        s.add
          .image(x, (r + 1) * TILE, 'palm-siwa')
          .setOrigin(0.5, 1)
          .setDepth(2);
        w.palms.push({ x, y: (r + 1) * TILE - 24, col: c });
      } else if (ch === 'ن') {
        const d = s.physics.add.sprite(x, y, 'date') as Sprite;
        body(d).setAllowGravity(false).setSize(12, 12);
        d.setDepth(6).setData('kind', 'date');
        w.dates.push(d);
        w.datesNeed++;
        s.tweens.add({
          targets: d,
          y: y - 3,
          yoyo: true,
          repeat: -1,
          duration: 700,
          ease: 'Sine.inOut',
        });
      } else if (ch === 'ف') {
        const img = s.physics.add.image(c * TILE, r * TILE, 'date-log') as Img;
        img.setOrigin(0, 0).setDepth(2).setAlpha(0.15);
        const b = body(img);
        b.setSize(TILE, 8).setOffset(0, 0);
        b.enable = false;
        oneWay(b);
        w.gates.push(img);
        s.ledges.add(img);
      } else if (ch === 'غ') {
        const real = hash(c, r, 5) > 0.42;
        const img = s.physics.add.image(x, r * TILE + 4, 'mirage') as Img;
        img.setDepth(3).setAlpha(real ? 0.85 : 0.7);
        (img as Img & { real?: boolean }).real = real;
        img.setData('real', real).setData('kind', 'mirage');
        const b = body(img);
        b.setAllowGravity(false)
          .setImmovable(true)
          .setSize(24, 8)
          .setOffset(-12, -4);
        oneWay(b);
        w.mirages.push(img as Img & { real?: boolean });
        s.ledges.add(img);
      }
    }
  // Camels reuse the donkey markers, but they're a riding animal — no cart planks.
  for (const d of L.donkeys) {
    const img = s.movers.create(0, 0, 'camel0') as Img;
    img.setOrigin(0, 1).setDepth(3);
    const x = d.a.col * TILE,
      y = (d.a.row + 1) * TILE;
    const groundY = camelGroundY(L.at, L.rows, x, y);
    img.setPosition(x, groundY);
    const b = body(img);
    b.setAllowGravity(false)
      .setImmovable(true)
      .setSize(100, 12)
      .setOffset(8, 22);
    b.reset(x, groundY);
    oneWay(b);
    s.add
      .text(
        x + 58,
        y - 100,
        'رمل غائر! اركب من ورا • سيبه يعدّي • شمال يرجّع',
        {
          fontFamily: 'sans-serif',
          fontSize: '11px',
          color: '#fff2c4',
          backgroundColor: '#183139',
          padding: { x: 5, y: 4 },
        },
      )
      .setOrigin(0.5, 1)
      .setDepth(12);
    const max = (d.endCol - CAMEL.width + 1) * TILE;
    w.camels.push({ img, min: x, max, dir: 1, waitUntil: 0 });
    // Carry like a mover so the hero stands on the camel's back.
    s.moverList.push({
      img,
      axis: 'x',
      min: x,
      max,
      speed: CAMEL.speed,
      carry: true,
      camel: true,
      donkey: { min: x, max, leftAt: -1e9, ridden: false },
    });
  }
  if (L.meta.board) {
    w.boardImg = s.add.image(0, 0, 'board').setDepth(7).setVisible(false);
  }
  if (L.meta.stormFrom !== undefined) {
    w.veil = s.add
      .rectangle(0, 0, 2000, 800, 0xc08040, 0)
      .setScrollFactor(0)
      .setDepth(40)
      .setOrigin(0.5, 0.5);
    w.pulse = s.add
      .image(0, 0, 'glow')
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(41)
      .setScrollFactor(0)
      .setAlpha(0)
      .setScale(0.5);
  }
  s.time.delayedCall(600, () => {
    if (s.mode === 'play' && isW8(s.L.meta.theme))
      toast(
        L.meta.board
          ? 'اللوح بيتسحب لوحده! نطّ تعمل حركة، والملح بيفتح العيون اللي القِبْلي بيدفنها'
          : L.meta.id === 'saltlake'
            ? 'السراب بيبرق… في حاجة بتخفي وفي حاجة حقيقية. الملح بيبينلك الصح'
            : 'العطش بيأكل… امشي في ظل النخل، واشرب من العين، وما تقفش على الرمل',
      );
  });
  return w;
}

export function updateSiwaWorld(s: Alley, time: number, dt: number) {
  const w = s.siwa;
  if (!w) return;
  setThirst(isW8(s.L.meta.theme), w.thirst / THIRST.max, w.shade);
  if (s.mode !== 'play') return;
  w.shade = inShade(s, w);
  const glare = s.L.meta.id === 'saltlake' && !w.shade;
  const rate = THIRST.max / (w.shade && !glare ? THIRST.shade : THIRST.sun);
  // A spring underfoot refills instantly.
  const atSpring = w.springs.find(
    (p) =>
      !p.buried &&
      Math.abs(s.hero.x - p.x) < 18 &&
      Math.abs(body(s.hero).bottom - (p.y + 6)) < 22,
  );
  if (atSpring) {
    if (w.thirst < THIRST.max - 1) {
      w.thirst = THIRST.max;
      sound.fx('splash');
      s.burst(atSpring.x, atSpring.y, 0x8ad0e8, 8);
      s.hint('spring', 'عين المية! العطش راح… بس الشمس لسه بتأكل');
    }
    w.thirst = THIRST.max;
  } else {
    w.thirst = Math.max(0, w.thirst - rate * dt);
    if (w.thirst <= THIRST.warn)
      s.hint('thirst', 'العطش زاد! دور على عين أو ظل نخلة');
    if (w.thirst <= 0) {
      s.lastHurtBy = 'thirst';
      toast('عطشت… دور على عين المية');
      s.die();
      return;
    }
  }
  // Sink-sand: keep moving, or the dune swallows you.
  const ch = under(s);
  const b = body(s.hero);
  const grounded = b.blocked.down || b.touching.down || s.riding;
  if (grounded && ch === 'س' && !w.boarding && !s.riding) {
    const deep = w.camels.some(
      (c) => s.hero.x > c.min + 72 && s.hero.x < c.max + 48,
    );
    const still = deep || Math.abs(b.velocity.x) < SINK.still;
    if (deep)
      s.hint('deep-sand', 'رمل غائر! ارجع اركب الجمل من ورا… رجليه بتعدّيك');
    if (still) {
      w.sinkMs += dt * 1000;
      if (w.sinkMs > 80) s.burst(s.hero.x, b.bottom, 0xd2a050, 1);
      if (w.sinkMs > SINK.start) {
        if (!w.sinking) s.hint('sink', 'الرمل بيبتلع! اجري… ما تقفش');
        w.sinking = true;
        s.hero.y += 28 * dt;
        s.hero.setAlpha(Math.max(0.35, 1 - (w.sinkMs - SINK.start) / SINK.ms));
        if (w.sinkMs > SINK.start + SINK.ms) {
          s.lastHurtBy = 'sink';
          s.die();
          return;
        }
      }
    } else {
      w.sinkMs = 0;
      w.sinking = false;
      s.hero.setAlpha(1);
    }
  } else if (!w.boarding) {
    if (w.sinking) s.hero.setAlpha(1);
    w.sinkMs = 0;
    w.sinking = false;
  }
  // Salt crust is as slippery as Alexandria's wet tiles (handled in move).
  if (grounded && ch === 'ل')
    s.hint('saltcrust', 'قشرة الملح زلقة! خد بالك وانت بتجري');

  // Dates.
  for (const d of w.dates) {
    if (!d.active) continue;
    if (Phaser.Math.Distance.Between(s.hero.x, s.hero.y, d.x, d.y) < 18) {
      d.destroy();
      w.datesGot++;
      s.score += 200;
      s.popText(d.x, d.y - 10, 'بلح!', '#c87838');
      sound.fx('coin');
      if (w.datesGot >= w.datesNeed && w.datesNeed > 0 && !w.gatesOpen) {
        w.gatesOpen = true;
        for (const g of w.gates) {
          g.setAlpha(1);
          body(g).enable = true;
        }
        toast('البلح فتحلك كوبري نخل! اختصار فوق الشمس');
        sound.fx('clear');
      } else if (w.datesNeed > 0)
        s.hint(
          'dates',
          `بلح ${w.datesGot}/${w.datesNeed}… لمّ الكل عشان يفتح الاختصار`,
        );
    }
  }
  // Camels: the mover carries the hero; we only swap the walk texture.
  for (const c of w.camels) {
    const vx = body(c.img).velocity?.x ?? 0;
    // The painted camel faces left. Forward travel must face right.
    c.img.setFlipX(vx > 4 || (Math.abs(vx) <= 4 && c.img.x <= c.min + 1));
    c.img.setTexture(
      Math.abs(vx) > 8 ? 'camel' + (Math.floor(time / 160) % 2) : 'camel0',
    );
    if (Math.abs(s.hero.x - (c.img.x + 60)) < 50 && s.riding)
      s.hint(
        'camel',
        'اركب ضهر الجمل وسيب الحركة يعدّيك. نطّ للشط، والجمل بيرجع يستناك',
      );
  }
  // Mirages shimmer; fakes drop the hero after a short stand.
  for (const m of w.mirages) {
    if (!m.active) continue;
    const real = !!m.getData('real');
    m.setAlpha(0.55 + Math.sin(time / (real ? 420 : 180)) * 0.25);
    m.y = m.getData('homeY') ?? (m.y, m.setData('homeY', m.y), m.y);
    const standing =
      body(s.hero).blocked.down &&
      Math.abs(s.hero.x - m.x) < 16 &&
      Math.abs(body(s.hero).bottom - m.y) < 14;
    if (!real && standing) {
      const held = (m.getData('held') as number) || 0;
      m.setData('held', held + dt * 1000);
      if (held + dt * 1000 > 380) vanishMirage(s, w, m, 'step');
    } else m.setData('held', 0);
  }
  // Salt shots shatter a nearby mirage or a buried spring mound.
  for (const shot of s.shots.getChildren() as Sprite[]) {
    if (!shot.active) continue;
    for (const m of w.mirages) {
      if (!m.active) continue;
      if (Phaser.Math.Distance.Between(shot.x, shot.y, m.x, m.y) < 22) {
        vanishMirage(s, w, m, 'salt');
        shot.destroy();
        break;
      }
    }
    for (const p of w.springs) {
      if (!p.buried?.active) continue;
      if (
        Phaser.Math.Distance.Between(shot.x, shot.y, p.buried.x, p.buried.y) <
        24
      ) {
        openSpring(s, w, p);
        shot.destroy();
        break;
      }
    }
  }
  // Sandstorm veil + a sound/light pulse toward the next spring or the boss.
  if (w.veil) {
    const inStorm = s.hero.x >= w.stormFrom;
    let cover = inStorm ? 0.62 : 0;
    for (const lamp of s.lanterns)
      if (lamp.lit) {
        const d = Phaser.Math.Distance.Between(
          s.hero.x,
          s.hero.y,
          lamp.img.x,
          lamp.img.y,
        );
        if (d < 160) cover = Math.min(cover, 0.18 + (d / 160) * 0.3);
      }
    w.veil.setPosition(s.cameras.main.width / 2, s.cameras.main.height / 2);
    w.veil.setAlpha(cover);
    if (inStorm && time > w.lastPulse + 1600 && w.pulse) {
      w.lastPulse = time;
      sound.fx('wind');
      const target =
        s.boss && s.bossState.active
          ? s.boss
          : (w.springs.find((p) => !p.buried && p.x > s.hero.x) ??
            w.springs[w.springs.length - 1]);
      if (target) {
        const cam = s.cameras.main;
        const dx = target.x - s.hero.x,
          dy = (target as { y: number }).y - s.hero.y;
        const ang = Math.atan2(dy, dx);
        w.pulse
          .setPosition(
            cam.width / 2 + Math.cos(ang) * 110,
            cam.height / 2 + Math.sin(ang) * 50,
          )
          .setAlpha(0.85);
        s.tweens.add({ targets: w.pulse, alpha: 0, duration: 700 });
        s.hint(
          'storm',
          'العاصفة غطّت الدنيا! امشي ورا النبضة… نور الفانوس بيفتح طريق',
        );
      }
    }
  }
  setThirst(true, w.thirst / THIRST.max, w.shade);
}

function vanishMirage(s: Alley, _w: W8, m: Img, why: 'step' | 'salt') {
  if (!m.active) return;
  const real = !!m.getData('real');
  if (why === 'salt' && real) {
    m.setAlpha(1).setTint(0xffffff);
    s.hint('mirage-real', 'العين دي حقيقية! الملح بيّنها');
    sound.fx('coin');
    return;
  }
  body(m).enable = false;
  s.tweens.add({
    targets: m,
    alpha: 0,
    y: m.y + 10,
    duration: 220,
    onComplete: () => m.destroy(),
  });
  if (why === 'step')
    s.hint('mirage', 'سراب! المنصّة اختفت… الملح بيبينلك الصح من الغلط');
  else s.hint('mirage-fake', 'السراب اتكسر… دي كانت وهمية');
  sound.fx('crumble');
  s.burst(m.x, m.y, 0xc8e8f0, 6);
}

export function openSpring(s: Alley, w: W8, p: W8['springs'][number]) {
  if (!p.buried) return;
  s.burst(p.buried.x, p.buried.y, 0xd2a050, 8);
  p.buried.destroy();
  p.buried = undefined;
  p.img.setVisible(true).setAlpha(1);
  sound.fx('splash');
  toast('العين اتفتحت! جرّ القِبْلي فوق المية');
}

export function boardStep(
  s: Alley,
  w: W8,
  time: number,
  dt: number,
  input: { dir: number; jump: boolean },
) {
  const b = body(s.hero);
  const target =
    BOARD.cruise +
    (input.dir > 0 ? BOARD.boost : input.dir < 0 ? -BOARD.slow : 0);
  b.velocity.x = approach(
    b.velocity.x,
    Math.max(BOARD.min, target),
    BOARD.accel * dt,
  );
  s.facing = 1;
  s.hero.setFlipX(false);
  if (input.jump && (b.blocked.down || b.touching.down || s.riding)) {
    s.hero.setVelocityY(-420);
    s.lastGround = -1000;
    sound.fx('jump');
    s.score += 50;
    s.popText(s.hero.x, s.hero.y - 24, 'حركة!', '#ffe08a');
    s.burst(s.hero.x, b.bottom, 0xe8c070, 6);
  }
  if (w.boardImg) {
    w.boardImg
      .setVisible(true)
      .setPosition(s.hero.x, b.bottom + 2)
      .setFlipX(false);
  }
  if (s.hero.x >= w.boardTo - 12) {
    w.boarding = false;
    w.boardImg?.setVisible(false);
    toast('نزلت من اللوح! العاصفة قدام… ورا النبضة');
  }
  void time;
}

function approach(v: number, t: number, a: number) {
  if (v < t) return Math.min(t, v + a);
  if (v > t) return Math.max(t, v - a);
  return t;
}

export function maybeStartBoard(s: Alley, w: W8) {
  if (w.boarding || !s.L.meta.board) return;
  if (s.hero.x >= w.boardFrom && s.hero.x < w.boardTo - 40) {
    w.boarding = true;
    s.hero.setVelocityX(BOARD.cruise);
    s.hint(
      'board',
      'اللوح بيجري لوحده على الكثيب! يمين تسرّع، شمال تهدّي، نطّ تعمل حركة',
    );
  }
}

export function updateSiwaEnemy(s: Alley, e: Sprite, time: number) {
  if (e.getData('kind') !== 'scorpion') return false;
  const eb = body(e),
    state = e.getData('state') as string,
    home = e.getData('home') as { x: number; y: number },
    dx = s.hero.x - e.x,
    dy = s.hero.y - e.y;
  let d = (e.getData('dir') as number) || -1;
  const edge = (dir: number) =>
    eb.blocked.down &&
    !s.standable(
      Math.floor((e.x + dir * 16) / TILE),
      Math.floor((eb.bottom + 2) / TILE),
    );
  const over = time > (e.getData('until') as number);
  if (state === 'tell') {
    e.setTexture('scorpion2').setVelocityX(0);
    e.setTint(Math.floor(time / 80) % 2 ? 0xffe0a0 : 0xffffff);
    if (over) {
      e.clearTint();
      e.setData('state', 'sting').setData('until', time + 280);
      sound.fx('clack');
    }
    return true;
  }
  if (state === 'sting') {
    e.setTexture('scorpion3');
    if (edge(d) || eb.blocked.left || eb.blocked.right) e.setVelocityX(0);
    else e.setVelocityX(d * 200);
    if (over) e.setData('state', 'rest').setData('until', time + 800);
    return true;
  }
  if (state === 'rest') {
    e.setTexture('scorpion0').setVelocityX(0);
    if (over) e.setData('state', 'walk').setData('until', time + 400);
    return true;
  }
  if (e.x < home.x - 44) d = 1;
  if (e.x > home.x + 44) d = -1;
  if (eb.blocked.left) d = 1;
  if (eb.blocked.right) d = -1;
  if (edge(d)) d = -d;
  if (Math.abs(dx) < 100 && Math.abs(dy) < 36 && over && eb.blocked.down) {
    d = Math.sign(dx) || d;
    e.setData('state', 'tell').setData('until', time + 480);
    e.setVelocityX(0);
    sound.fx('hiss');
    s.hint('scorpion', 'العقرب رفع ذيله! هينقر قدّام… نطّ عليه أو ابعد');
  } else e.setVelocityX(d * 32);
  e.setData('dir', d).setFlipX(d > 0);
  e.setTexture('scorpion' + (Math.floor(time / 200) % 2));
  return true;
}

/* ───────────── Boss «القِبْلي» ───────────── */
/** A living south-wind sandstorm. He hovers, tells, then slams a sand
 * wave (jump it). He buries springs under dunes; a salt crystal opens
 * them again (and cancels a slam mid-tell). Lure him so his slam lands
 * on an open spring — the water grounds him. Stomping bounces off.
 * Never more than him and one sand wave. */
export function updateQibliBoss(s: Alley, time: number) {
  const boss = s.boss!,
    st = s.bossState,
    w = s.siwa;
  if (!w) return;
  const phase = s.bossPhase();
  const P = (a: number[]) => a[phase - 1];
  // The fight must teach itself: say what to press and when, in big letters.
  if (!st.defeated) {
    if (s.power < 2) {
      s.setPower(2, false);
      toast('بلورة ملح جديدة في إيدك!');
    }
    const born = (boss.getData('born') as number | undefined) ?? time;
    boss.setData('born', born);
    if (st.state === 'tell') fightCue('القِبْلي بيلمع! دوس زرار الملح ◀', true);
    else if (st.state === 'stunned') fightCue('وقع! نطّ على ديله من فوق ▼');
    else if (time - born < 7000)
      fightCue(
        'الملح سلاحك: لما القِبْلي يلمع ارمي الملح، وبعدين نطّ على ديله ×٣',
      );
  }
  // A dark rim behind the sandstorm: gold-on-sand backdrops hid him on phones.
  let halo = boss.getData('halo') as Phaser.GameObjects.Image | undefined;
  if (!halo || !halo.active) {
    halo = s.add.image(boss.x, boss.y, boss.texture.key).setDepth(8);
    boss.setData('halo', halo);
    boss.once('destroy', () => halo?.destroy());
  }
  halo
    .setTexture(boss.texture.key)
    .setPosition(boss.x, boss.y)
    .setFlipX(boss.flipX)
    .setScale(boss.scaleX * 1.1, boss.scaleY * 1.1)
    .setTint(0x2a1208)
    .setAlpha(0.85)
    .setVisible(boss.visible);
  const over = time > st.until;
  const toHero = Math.sign(s.hero.x - boss.x) || 1;
  const tex = (pose: string) => boss.setTexture('boss8-' + pose);
  const waving = () =>
    (s.hazards.getChildren() as Sprite[]).some(
      (h) => h.active && h.getData('kind') === 'sandwave',
    );
  if (st.state !== 'hurt' && st.state !== 'stunned') boss.setFlipX(toHero > 0);
  // Float just above the dune; while stunned he lies low on the sand.
  const floor = (s.L.rows - 2) * TILE;
  if (st.state === 'stunned') {
    if (boss.y < floor - 48) boss.y = Math.min(floor - 48, boss.y + 3);
  } else if (boss.y > floor - 90) boss.y = floor - 90;
  // The shared hit knock-back launches bosses upward; this one used to fly
  // off the top of the screen after the first hit and never come back.
  if (boss.y < floor - 150) {
    boss.y = floor - 150;
    boss.setVelocityY(0);
  }
  switch (st.state) {
    case 'walk':
    case 'hover':
      tex('idle' + (Math.floor(time / 280) % 2));
      boss.setVelocityX(toHero * P([40, 52, 64]));
      boss.setVelocityY(Math.sin(time / 280) * 20);
      if (over && !waving()) {
        boss.setVelocityX(0);
        if (Math.abs(s.hero.x - boss.x) > 300) {
          // Too far for the salt to reach: close in before telling.
          boss.setVelocityX(toHero * P([60, 80, 100]));
        } else if (
          phase >= 2 &&
          w.springs.some((p) => !p.buried) &&
          Math.random() > 0.45
        ) {
          st.state = 'bury';
          st.until = time + P([0, 700, 560]);
          tex('bury');
          sound.fx('hiss');
          s.hint('qibli-bury', 'القِبْلي بيدفن العين! ارمي الملح على الكوم');
        } else {
          st.state = 'tell';
          st.until = time + P([1500, 1300, 1100]);
          boss.setData('tellStart', time);
          tex('charge');
          sound.fx('roar');
          s.hint(
            'qibli-tell',
            'القِبْلي هيهجم بموجة رمل! نطّ فوقها، أو ارمي ملح وهو بيلمّ نفسه',
          );
        }
      }
      break;
    case 'tell':
      tex('charge');
      boss.setVelocity(0, 0);
      boss.setTint(Math.floor(time / 80) % 2 ? 0xffe080 : 0xffffff);
      if (over) {
        boss.clearTint();
        boss.setData('tellEnd', time);
        st.state = 'slam';
        st.until = time + 420;
        tex('slam');
        sandWave(s, boss.x, toHero, P([220, 260, 300]));
      }
      break;
    case 'slam':
      tex('slam');
      boss.setVelocityX(toHero * 80);
      // If the slam lands on an open spring, the water grounds him.
      if (w.springs.some((p) => !p.buried && Math.abs(boss.x - p.x) < 28)) {
        s.burst(boss.x, boss.y + 40, 0x8ad0e8, 16);
        sound.fx('splash');
        toast('المية فرّقت العاصفة!');
        s.bossDamage(2);
        st.state = 'hurt';
        st.until = time + 900;
        tex('hurt');
        break;
      }
      if (over) {
        st.state = 'hover';
        st.until = time + P([900, 750, 600]);
      }
      break;
    case 'bury':
      tex('bury');
      boss.setVelocity(0, 0);
      if (over) {
        const open = w.springs.filter((p) => !p.buried);
        const p = open.sort(
          (a, b) => Math.abs(a.x - s.hero.x) - Math.abs(b.x - s.hero.x),
        )[0];
        if (p) burySpring(s, w, p);
        st.state = 'hover';
        st.until = time + P([800, 700, 560]);
      }
      break;
    case 'hurt':
      tex('hurt');
      boss.setVelocity(0, 0);
      if (over) {
        st.state = 'hover';
        st.until = time + 700;
      }
      break;
    case 'stunned':
      // Salt dropped him mid-charge: low on the sand, tail exposed,
      // one good stomp before he pulls himself together.
      tex('hurt');
      boss.setVelocityX(0);
      boss.setTint(Math.floor(time / 120) % 2 ? 0xbfe8ff : 0xffffff);
      if (over) {
        boss.clearTint();
        st.state = 'hover';
        st.until = time + 700;
      }
      break;
  }
}

function burySpring(s: Alley, w: W8, p: W8['springs'][number]) {
  if (p.buried) return;
  const m = s.physics.add.image(p.x, p.y + 2, 'sand-mound') as Img;
  m.setDepth(4);
  body(m).setAllowGravity(false).setImmovable(true).setSize(26, 12);
  p.buried = m;
  p.img.setVisible(false);
  s.burst(p.x, p.y, 0xd2a050, 8);
  sound.fx('crumble');
}

function sandWave(s: Alley, x: number, dir: number, speed: number) {
  if (
    (s.hazards.getChildren() as Sprite[]).some(
      (h) => h.active && h.getData('kind') === 'sandwave',
    )
  )
    return;
  const y = (s.L.rows - 2) * TILE - 6;
  const h = s.hazards.create(x + dir * 20, y, 'sand-mound') as Sprite;
  h.setDepth(6).setData('kind', 'sandwave');
  body(h)
    .setAllowGravity(false)
    .setSize(28, 12)
    .setVelocityX(dir * speed);
  s.time.delayedCall(1600, () => h.active && h.destroy());
  s.burst(x, y, 0xd2a050, 8);
  sound.fx('wind');
}

export function qibliPhase(phase: number) {
  toast(
    phase === 2
      ? 'القِبْلي اشتد! بقى يدفن العيون ويموج الرمل أسرع'
      : 'آخر نفس! العاصفة جنّت… افتح العين وجرّه فوقها',
  );
}

export function qibliContact(s: Alley, fromAbove: boolean) {
  const boss = s.boss!,
    st = s.bossState;
  if (st.state === 'stunned') {
    if (fromAbove) {
      // The readable counter: salt the charge, stomp the tail.
      s.bossDamage(1);
      s.burst(boss.x, boss.y + 16, 0xe8f0f4, 12);
      s.hero.setVelocity(s.hero.x < boss.x ? -200 : 200, -420);
      boss.clearTint().setTexture('boss8-hurt');
      st.state = 'hurt';
      st.until = s.time.now + 900;
      s.hint('qibli-tail', 'ضربة على الديل! كمّل: شتّته بالملح ونطّ تاني');
    } else {
      // Shouldering a downed storm just bounces you off.
      s.hero.setVelocity(s.hero.x < boss.x ? -160 : 160, -300);
    }
    return;
  }
  if (st.state === 'hurt') {
    s.hero.setVelocityX(s.hero.x < boss.x ? -140 : 140);
    return;
  }
  if (fromAbove) {
    s.hero.setVelocity(s.hero.x < boss.x ? -220 : 220, -420);
    s.hint(
      'qibli-roof',
      'العاصفة مش بتتحمل نطّة! شتّته بالملح وهو بيلمّ، وبعدين نطّ على ديله',
    );
    return;
  }
  if (s.time.now < s.invincible)
    s.hero.setVelocityX(s.hero.x < boss.x ? -260 : 260);
  else {
    s.hurt();
    if (s.mode === 'play')
      s.hero.setVelocity(s.hero.x < boss.x ? -280 : 280, -300);
  }
}

/** Salt does not chip the boss down. Mid-tell it cancels the slam; a
 * buried spring next to the shot is opened in updateSiwaWorld. */
export function qibliSalt(s: Alley) {
  const st = s.bossState;
  s.burst(s.boss!.x, s.boss!.y, 0xe8f0f4, 6);
  // A shot thrown during the tell still lands if it is in the air when the
  // tell ends (the flight takes about a second on a phone).
  const tellStart = (s.boss!.getData('tellStart') as number | undefined) ?? -1;
  const tellEnd = (s.boss!.getData('tellEnd') as number | undefined) ?? 0;
  const lateHit =
    st.state === 'slam' &&
    s.lastShot >= tellStart &&
    s.lastShot <= tellEnd &&
    s.time.now - tellEnd < 1100;
  if (st.state === 'tell' || lateHit) {
    for (const h of s.hazards.getChildren() as Sprite[])
      if (h.active && h.getData('kind') === 'sandwave') h.destroy();
    // Salt mid-charge drops him: stunned, low, tail exposed and stompable.
    st.state = 'stunned';
    st.until = s.time.now + 2400;
    s.boss!.setVelocity(0, 0).setTexture('boss8-hurt').clearTint();
    sound.fx('crumble');
    toast('الملح شتت هجومته! ديله مكشوف… نطّ عليه بسرعة');
    return;
  }
  if (st.state === 'stunned') {
    s.hint('qibli-tail2', 'هو واقع خلاص! نطّ على ديله قبل ما يقوم');
    return;
  }
  s.hint(
    'qibli-salt',
    'الملح لوحده مش بيجيب القِبْلي… شتّته وهو بيلمّ ونطّ على ديله، أو افتح العين وجرّه',
  );
}
