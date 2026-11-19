// World 7 (بورسعيد) runtime: the pelican, the harbour barrel and the boss
// «ريّس الميناء» on his crane. The hooks, slung containers and the chase
// magnet live in crane.ts.
import Phaser from 'phaser';
import type { Alley } from './game';
import { TILE } from './level-data';
import { sound } from './audio';
import { toast } from './ui';

type Sprite = Phaser.Physics.Arcade.Sprite;
type Body = Phaser.Physics.Arcade.Body;
const body = (s: Phaser.GameObjects.GameObject) =>
  (s as Phaser.Physics.Arcade.Image).body as Body;

/** Pelican: waddles near home; when you come close it rears back (tell)
 * and darts its beak forward a short way. Barrel: rolls along, bouncing off
 * walls and ledges' ends. Returns true when it handled the enemy. */
export function updatePortSaidEnemy(s: Alley, e: Sprite, time: number) {
  const kind = e.getData('kind');
  if (kind === 'barrel') return rollBarrel(s, e, time);
  if (kind !== 'pelican') return false;
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
  if (state === 'rear') {
    e.setTexture('pelican2').setVelocityX(0);
    e.setTint(Math.floor(time / 80) % 2 ? 0xffe0b0 : 0xffffff);
    if (over) {
      e.clearTint();
      e.setData('state', 'peck').setData('until', time + 260);
      sound.fx('clack');
    }
    return true;
  }
  if (state === 'peck') {
    e.setTexture('pelican3');
    if (edge(d) || eb.blocked.left || eb.blocked.right) e.setVelocityX(0);
    else e.setVelocityX(d * 210);
    if (over) e.setData('state', 'rest').setData('until', time + 900);
    return true;
  }
  if (state === 'rest') {
    e.setTexture('pelican0').setVelocityX(0);
    if (over) e.setData('state', 'walk').setData('until', time + 500);
    return true;
  }
  if (e.x < home.x - 50) d = 1;
  if (e.x > home.x + 50) d = -1;
  if (eb.blocked.left) d = 1;
  if (eb.blocked.right) d = -1;
  if (edge(d)) d = -d;
  if (Math.abs(dx) < 110 && Math.abs(dy) < 40 && over && eb.blocked.down) {
    d = Math.sign(dx) || d;
    e.setData('state', 'rear').setData('until', time + 520);
    e.setVelocityX(0);
    sound.fx('hiss');
    s.hint(
      'pelican',
      'البجعة رجعت راسها لورا! هتنقر قدّامها… نطّ عليها أو ابعد',
    );
  } else e.setVelocityX(d * 30);
  e.setData('dir', d).setFlipX(d > 0);
  e.setTexture('pelican' + (Math.floor(time / 360) % 2));
  return true;
}
function rollBarrel(s: Alley, e: Sprite, time: number) {
  const eb = body(e);
  let d = (e.getData('dir') as number) || -1;
  if (eb.blocked.left) d = 1;
  if (eb.blocked.right) d = -1;
  // Only start rolling once بلبل is near, so barrels arrive one by one.
  const near = Math.abs(s.hero.x - e.x) < 420;
  e.setData('dir', d);
  if (!near && !e.getData('rolling')) {
    e.setVelocityX(0).setTexture('barrel0');
    return true;
  }
  if (!e.getData('rolling')) {
    e.setData('rolling', true);
    d = Math.sign(s.hero.x - e.x) || -1;
    e.setData('dir', d);
    s.hint('barrel', 'برميل بيتدحرج! نطّ من فوقه… أو اتنطّ عليه توقّفه');
  }
  e.setVelocityX(d * 96);
  e.setTexture('barrel' + (Math.floor(time / 120) % 4));
  e.setFlipX(d > 0);
  return true;
}

/* ───────────── Boss «ريّس الميناء» ───────────── */
/** He rides his crane along the quay: walk → aim (his container swings over
 * where you stand: a mark on the ground and a flashing tell) → drop (one
 * container falls; step aside) → walk. His cab is steel — stomping only
 * bounces you off. Overhead, the port's gantry hook carries a container
 * back and forth: hang from it and press ↓ over his cab (crane.ts) — three
 * hits. From phase 2 his boom swats at you when you hang close above him
 * (it flashes first). Never more than him and one falling container. */
export function updateCaptainBoss(s: Alley, time: number) {
  const boss = s.boss!,
    st = s.bossState,
    bb = body(boss);
  const phase = s.bossPhase();
  const P = (a: number[]) => a[phase - 1];
  const over = time > st.until;
  const toHero = Math.sign(s.hero.x - boss.x) || 1;
  const tex = (pose: string) => boss.setTexture('boss7-' + pose);
  const falling = () =>
    (s.hazards.getChildren() as Sprite[]).some(
      (h) => h.active && h.getData('kind') === 'container',
    );
  const hanging = !!s.crane?.hang;
  const close = hanging && Math.abs(s.hero.x - boss.x) < 110;
  if (st.state !== 'hurt') boss.setFlipX(toHero > 0);
  switch (st.state) {
    case 'walk':
      tex('idle' + (Math.floor(time / 320) % 2));
      boss.setVelocityX(toHero * P([46, 58, 70]));
      if (phase >= 2 && close && over) {
        boss.setVelocityX(0);
        st.state = 'swat';
        st.until = time + P([0, 650, 520]);
        sound.fx('roar');
        s.hint(
          'captain-swat',
          'الريّس بيلفّ دراع الونش عليك! ابعد عنه وإنت متعلّق… وارجع لما يهدى',
        );
      } else if (over && !falling()) {
        boss.setVelocityX(0);
        boss.setData('aimX', s.hero.x);
        st.state = 'aim';
        st.until = time + P([950, 820, 700]);
        sound.fx('hiss');
        mark(s, s.hero.x, bb.bottom, st.until - time);
      }
      break;
    case 'aim':
      tex('aim');
      boss.setVelocityX(0);
      boss.setTint(Math.floor(time / 80) % 2 ? 0xfff0a0 : 0xffffff);
      if (over) {
        boss.clearTint();
        drop(s, boss.getData('aimX') as number, phase);
        st.state = 'drop';
        st.until = time + 650;
      }
      break;
    case 'drop':
      tex('drop');
      boss.setVelocityX(0);
      if (over) {
        st.state = 'walk';
        st.until = time + P([1700, 1400, 1150]);
      }
      break;
    case 'swat':
      tex('charge');
      boss.setVelocityX(0);
      boss.setTint(Math.floor(time / 70) % 2 ? 0xffc0a0 : 0xffffff);
      if (over) {
        boss.clearTint();
        s.cameras.main.shake(160, 0.008);
        s.burst(boss.x + toHero * 40, boss.y - 70, 0xf4c040, 10);
        sound.fx('shock');
        if (
          s.crane?.hang &&
          Math.abs(s.hero.x - boss.x) < 120 &&
          time >= s.invincible
        )
          s.hurt('swat');
        st.state = 'walk';
        st.until = time + 900;
      }
      break;
    case 'hurt':
      tex('hurt');
      boss.setVelocityX(0);
      if (over) {
        st.state = 'walk';
        st.until = time + 700;
      }
      break;
    default:
      st.state = 'walk';
  }
  s.clampBoss();
}
/** A pulsing mark where the container will land. */
function mark(s: Alley, x: number, ground: number, ms: number) {
  const m = s.add.rectangle(x, ground - 2, 46, 4, 0x1b140f, 0.45).setDepth(8);
  s.tweens.add({
    targets: m,
    scaleX: 1.3,
    alpha: 0.75,
    yoyo: true,
    repeat: -1,
    duration: 180,
  });
  s.time.delayedCall(ms + 900, () => m.destroy());
}
/** One container dropped from his hook, straight down over the mark. */
function drop(s: Alley, x: number, phase: number) {
  const cam = s.cameras.main;
  const c = s.hazards.create(x, cam.scrollY + 10, 'container') as Sprite;
  c.setData('kind', 'container').setDepth(9);
  body(c)
    .setSize(40, 24)
    .setOffset(4, 4)
    .setMaxVelocity(0, [420, 480, 540][phase - 1]);
  sound.fx('fire');
  s.hint('container', 'الريّس بيرمي حاوية! ابعد عن العلامة اللي على الأرض');
}
export function captainPhase(phase: number) {
  toast(
    phase === 2
      ? 'ريّس الميناء اتعصّب! دراع الونش بقى يلفّ على اللي متعلّق قريب منه'
      : 'آخر حاوية! نزّلها عليه… بس خلّي بالك من الدراع',
  );
}
/** His cab is steel: a stomp bounces off; touching him hurts. */
export function captainContact(s: Alley, fromAbove: boolean) {
  const boss = s.boss!,
    st = s.bossState;
  if (st.state === 'hurt') {
    s.hero.setVelocityX(s.hero.x < boss.x ? -140 : 140);
    return;
  }
  if (fromAbove) {
    s.hero.setVelocity(s.hero.x < boss.x ? -220 : 220, -420);
    s.hint(
      'captain-roof',
      'الكابينة حديد! اتشعبط في خطّاف الونش الكبير اللي فوق… ونزّل الحاوية عليه',
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
