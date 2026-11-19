// World 6 (أسوان) runtime: the Nile crocodile and the boss «تمساح النيل
// الكبير». The village, river and dam re-use the World 5 runtime
// (feluccas on the current, cracked slabs, levers and gates) and the
// World 4 timed bursts; this file only adds the crocodiles.
import Phaser from 'phaser';
import type { Alley } from './game';
import { TILE } from './level-data';
import { sound } from './audio';
import { toast } from './ui';

type Sprite = Phaser.Physics.Arcade.Sprite;
type Body = Phaser.Physics.Arcade.Body;
const body = (s: Phaser.GameObjects.GameObject) =>
  (s as Phaser.Physics.Arcade.Image).body as Body;

/** Nile crocodile: lies low and crawls a little; when you come close it
 * gapes (a clear tell), lunges a short way, then rests. Stomp it from
 * above or hit it with the frond. Returns true when it handled the enemy. */
export function updateAswanEnemy(s: Alley, e: Sprite, time: number) {
  if (e.getData('kind') !== 'croc') return false;
  const eb = body(e),
    state = e.getData('state') as string,
    home = e.getData('home') as { x: number; y: number },
    dx = s.hero.x - e.x,
    dy = s.hero.y - e.y;
  let d = (e.getData('dir') as number) || -1;
  const edge = (dir: number) =>
    eb.blocked.down &&
    !s.standable(
      Math.floor((e.x + dir * 22) / TILE),
      Math.floor((eb.bottom + 2) / TILE),
    );
  const over = time > (e.getData('until') as number);
  if (state === 'gape') {
    e.setTexture('croc2').setVelocityX(0);
    e.setTint(Math.floor(time / 80) % 2 ? 0xffd0a0 : 0xffffff);
    if (over) {
      e.clearTint();
      e.setData('state', 'lunge').setData('until', time + 320);
      sound.fx('clack');
    }
    return true;
  }
  if (state === 'lunge') {
    e.setTexture('croc3');
    if (edge(d) || eb.blocked.left || eb.blocked.right) e.setVelocityX(0);
    else e.setVelocityX(d * 230);
    if (over) e.setData('state', 'rest').setData('until', time + 1200);
    return true;
  }
  if (state === 'rest') {
    e.setTexture('croc0').setVelocityX(0);
    if (over) e.setData('state', 'walk').setData('until', time + 600);
    return true;
  }
  // Crawl back and forth near home.
  if (e.x < home.x - 60) d = 1;
  if (e.x > home.x + 60) d = -1;
  if (eb.blocked.left) d = 1;
  if (eb.blocked.right) d = -1;
  if (edge(d)) d = -d;
  if (Math.abs(dx) < 130 && Math.abs(dy) < 40 && over && eb.blocked.down) {
    d = Math.sign(dx) || d;
    e.setData('state', 'gape').setData('until', time + 560);
    e.setVelocityX(0);
    sound.fx('hiss');
    s.hint('croc', 'التمساح فتح بقه! هيهجم قدّام شوية… نطّ من فوقه أو ابعد');
  } else e.setVelocityX(d * 22);
  e.setData('dir', d).setFlipX(d > 0);
  e.setTexture('croc' + (Math.floor(time / 420) % 2));
  return true;
}

/* ───────────── Boss «تمساح النيل الكبير» ───────────── */
/** walk → gape (tell) → lunge across the sand → stuck (jaws dug in: stomp
 * his head) → walk. From phase 2 he also swings his tail: one splash wave
 * runs along the sand (jump it). Never more than him and one wave. */
export function updateCrocBoss(s: Alley, time: number) {
  const boss = s.boss!,
    st = s.bossState,
    bb = body(boss);
  const phase = s.bossPhase();
  const P = (a: number[]) => a[phase - 1];
  const over = time > st.until;
  const toHero = Math.sign(s.hero.x - boss.x) || 1;
  const [lo, hi] = s.bossRange();
  const tex = (pose: string) => boss.setTexture('boss6-' + pose);
  if (!['lunge', 'hurt', 'stuck'].includes(st.state)) boss.setFlipX(toHero > 0);
  switch (st.state) {
    case 'walk':
      tex('idle' + (Math.floor(time / 300) % 2));
      boss.setVelocityX(toHero * P([50, 62, 76]));
      if (over) {
        boss.setVelocityX(0);
        st.volley++;
        const wave =
          phase >= 2 &&
          st.volley % 2 === 0 &&
          !(s.hazards.getChildren() as Sprite[]).some(
            (h) => h.getData('kind') === 'shock',
          );
        boss.setData('next', wave ? 'tail' : 'lunge');
        st.state = 'gape';
        st.until = time + P([850, 720, 600]);
        sound.fx(wave ? 'splash' : 'hiss');
      }
      break;
    case 'gape': {
      const tail = boss.getData('next') === 'tail';
      tex(tail ? 'tail' : 'gape');
      boss.setVelocityX(0);
      boss.setTint(
        Math.floor(time / 80) % 2 ? (tail ? 0xa0e0ff : 0xffd0a0) : 0xffffff,
      );
      if (over) {
        boss.clearTint();
        if (tail) {
          splash(s, boss, phase, time);
          st.state = 'rest';
          st.until = time + 700;
        } else {
          boss.setData('dir', toHero);
          st.state = 'lunge';
          st.until = time + 2200;
          sound.fx('roar');
        }
      }
      break;
    }
    case 'lunge': {
      tex('lunge');
      const d = (boss.getData('dir') as number) || 1;
      boss.setFlipX(d > 0);
      boss.setVelocityX(d * P([280, 310, 340]));
      if (Math.floor(time / 60) % 2 === 0)
        s.burst(boss.x - d * 70, bb.bottom, 0xe8d0a0, 2);
      const wall =
        bb.blocked.left ||
        bb.blocked.right ||
        (d < 0 && boss.x <= lo + 2) ||
        (d > 0 && boss.x >= hi - 2);
      if (wall || over) {
        boss.setVelocityX(0);
        sound.fx('shock');
        s.cameras.main.shake(200, 0.01);
        s.burst(boss.x + d * 70, bb.bottom - 6, 0xe8d0a0, 14);
        st.state = 'stuck';
        st.until = time + P([1600, 1400, 1200]);
        s.hint('croc-stuck', 'بقه اتغرز في الرملة! اتنطّ على راسه دلوقتي');
      }
      break;
    }
    case 'stuck':
      tex('stuck');
      boss.setVelocityX(0);
      if (over) {
        st.state = 'walk';
        st.until = time + P([1500, 1250, 1050]);
      }
      break;
    case 'rest':
      tex('idle0');
      boss.setVelocityX(0);
      if (over) {
        st.state = 'walk';
        st.until = time + P([1500, 1250, 1050]);
      }
      break;
    case 'hurt':
      tex('hurt');
      if (over && bb.blocked.down) {
        boss.setVelocityX(0);
        st.state = 'walk';
        st.until = time + 700;
      }
      break;
  }
  s.clampBoss();
}
/** One splash wave rolling along the sand toward the hero. */
function splash(s: Alley, boss: Sprite, phase: number, time: number) {
  const d = Math.sign(s.hero.x - boss.x) || -1;
  const bb = body(boss);
  sound.fx('wave');
  const w = s.hazards.create(
    boss.x + d * 70,
    bb.bottom - 11,
    'splash',
  ) as Sprite;
  body(w).setAllowGravity(false).setSize(24, 16).setOffset(5, 6);
  w.setVelocityX(d * [0, 210, 240][phase - 1])
    .setData('kind', 'shock')
    .setData('born', time)
    .setDepth(9)
    .setFlipX(d > 0);
  s.hint('splash', 'ديله رمى موجة! نطّ من فوقها أو اطلع على الحصيرة');
}
export function crocPhase(phase: number) {
  toast(
    phase === 2
      ? 'التمساح اتعصّب! بيضرب بديله موجة على الرملة… نطّ من فوقها'
      : 'آخر نَفَس! أسرع… بس لسه بيغرز بقه بعد كل هجمة',
  );
}
/** Only his head, while his jaws are dug into the sand, can be stomped. */
export function crocContact(s: Alley, fromAbove: boolean) {
  const boss = s.boss!,
    st = s.bossState;
  if (st.state === 'stuck' && fromAbove) {
    s.hero.setVelocityY(-450);
    if (s.time.now >= st.invuln) s.bossDamage(1);
    return;
  }
  if (st.state === 'stuck' || st.state === 'hurt') {
    s.hero.setVelocityX(s.hero.x < boss.x ? -140 : 140);
    return;
  }
  if (fromAbove && st.state !== 'lunge') {
    s.hero.setVelocity(s.hero.x < boss.x ? -220 : 220, -420);
    s.hint(
      'croc-back',
      'جلده ناشف! استنى لما يهجم ويغرز بقه في الرملة… واتنطّ على راسه',
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
