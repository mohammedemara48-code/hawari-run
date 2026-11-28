import { lightAligned, seesHero, balanceY } from './landmark-puzzle';
import Phaser from 'phaser';
import type { Alley } from './game';
import { body } from './game-shared';
import { TILE } from './level-data';
import { touch, toast, fightCue } from './ui';
import { sound } from './audio';

type Img = Phaser.Physics.Arcade.Image;
export interface LandmarkState {
  kind: 'light' | 'stealth' | 'balance';
  values: number[];
  solved: boolean;
  alarmUntil: number;
  disabled: boolean[];
  downWas: boolean;
  vulnerableUntil: number;
  gates: Img[];
  platforms: Img[];
  covers: { x: number; y: number; w: number; h: number }[];
  ink: Phaser.GameObjects.Graphics;
  label: Phaser.GameObjects.Text;
}
export function buildLandmark(s: Alley): LandmarkState | undefined {
  const p = s.L.meta.landmark;
  if (!p) return;
  const gates: Img[] = [];
  for (let r = 10; r < 15; r++)
    gates.push(
      s.physics.add
        .staticImage(p.gate * TILE + 12, r * TILE + 12, 'landmark-gate')
        .setDepth(5) as Img,
    );
  const platforms: Img[] = [];
  if (p.kind === 'balance')
    for (const [i, x] of [
      p.stations[0] * TILE + 65,
      p.stations[0] * TILE + 175,
    ].entries()) {
      const img = s.physics.add
        .image(x, i === 0 ? 324 : 276, 'landmark-platform')
        .setDepth(4);
      body(img).setAllowGravity(false).setImmovable(true);
      body(img).checkCollision.down = false;
      body(img).checkCollision.left = false;
      body(img).checkCollision.right = false;
      platforms.push(img);
    }
  const covers =
    p.kind === 'stealth'
      ? p.stations.map((col, i) => ({
          x: (col - 5) * TILE,
          y: 298 - (i % 2) * 24,
          w: 36,
          h: 62 + (i % 2) * 24,
        }))
      : [];
  return {
    kind: p.kind,
    values:
      p.kind === 'balance'
        ? [0]
        : p.stations.map((col, i) =>
            s.L.meta.id === 'giza-plateau' &&
            s.checkpoint &&
            col < (s.L.checkpoint?.col ?? 0)
              ? p.target[i]
              : 0,
          ),
    solved: false,
    alarmUntil: 0,
    disabled: p.stations.map(() => false),
    downWas: false,
    vulnerableUntil: 0,
    gates,
    platforms,
    covers,
    ink: s.add.graphics().setDepth(6),
    label: s.add
      .text(0, 0, '', {
        fontFamily: 'Tahoma',
        fontSize: '13px',
        stroke: '#07141a',
        strokeThickness: 3,
        color: '#fff3c7',
        backgroundColor: '#18252ad9',
        padding: { x: 8, y: 5 },
        rtl: true,
      })
      .setDepth(20),
  };
}
function open(s: Alley, w: LandmarkState) {
  if (w.solved) return;
  w.solved = true;
  for (const gate of w.gates) {
    gate.disableBody(true, false);
    gate.setAlpha(0.18);
  }
  sound.fx('secret');
  if (!s.L.meta.boss) toast('الطريق اتفتح!');
  w.vulnerableUntil = s.time.now + 6500;
}
export function updateLandmark(s: Alley, time: number, dt: number) {
  const w = s.landmark,
    p = s.L.meta.landmark;
  if (!w || !p || s.mode !== 'play') return;
  const down = s.keys.DOWN.isDown || s.keys.S.isDown || touch.down,
    pressed = down && !w.downWas;
  w.downWas = down;
  const g = w.ink;
  g.clear();
  // Dark outlined staging panels separate controls from painted masonry.
  for (const col of p.stations) {
    const x = col * TILE + 12;
    g.fillStyle(0x0b1b24, 0.9);
    g.fillRoundedRect(x - 23, 291, 46, 48, 5);
    g.lineStyle(2, 0xffd778, 1);
    g.strokeRoundedRect(x - 23, 291, 46, 48, 5);
    if (w.kind === 'balance') {
      g.fillStyle(0xf2ca7b);
      g.fillCircle(x, 308, 9);
      g.lineStyle(3, 0x182830);
      g.lineBetween(x - 6, 308, x + 6, 308);
      g.fillStyle(0x8df7df);
      g.fillRect(x - 8, 326, 16, 4);
    }
  }
  if (s.boss && s.L.meta.boss) {
    // Shield ring: cyan when open, gold when locked, so the state is readable.
    g.lineStyle(4, w.solved ? 0x8df7df : 0xffc26e, w.solved ? 1 : 0.8);
    g.strokeCircle(s.boss.x, s.boss.y - 8, w.solved ? 58 : 52);
  }
  const feet = body(s.hero).bottom;
  const near = p.stations.findIndex(
    (col) => Math.abs(s.hero.x - col * TILE - 12) < 47,
  );
  let message: string;
  if (w.kind === 'light') {
    p.stations.forEach((col, i) => {
      const x = col * TILE + 12,
        y = 310;
      if (pressed && near === i) {
        w.values[i] = (w.values[i] + 1) % 4;
        sound.fx('clack');
      }
      const correct = w.values[i] === p.target[i];
      g.lineStyle(2, 0xffedbd, 0.8);
      g.strokeRect(x - 18, y - 24, 36, 48);
      for (let n = 0; n < 4; n++) {
        g.fillStyle(n === w.values[i] ? 0x8df7df : 0x665846);
        g.fillRect(x - 16 + n * 9, y + 28, 6, 5);
      }
      g.lineStyle(7, 0x152331, 1);
      g.lineBetween(x - 36, y - 12, x, y);
      g.lineStyle(4, correct ? 0x8df7df : 0xffd478, 1);
      const endpoint = correct
        ? { x: x + 78, y: y - 80 }
        : {
            x: x + Math.cos((w.values[i] * Math.PI) / 2) * 70,
            y: y + Math.sin((w.values[i] * Math.PI) / 2) * 70,
          };
      g.lineBetween(x - 36, y - 12, x, y);
      g.lineBetween(x, y, endpoint.x, endpoint.y);
      g.fillStyle(0x10232c);
      g.fillCircle(x + 78, y - 80, 13);
      g.lineStyle(2, 0xffdc85);
      g.strokeCircle(x + 78, y - 80, 13);
      g.fillStyle(correct ? 0x8df7df : 0x785c40);
      g.fillCircle(x + 78, y - 80, 9);
      g.lineStyle(6, 0xd2e5e5);
      const a = (w.values[i] * Math.PI) / 4;
      g.lineBetween(
        x - Math.cos(a) * 14,
        y - Math.sin(a) * 14,
        x + Math.cos(a) * 14,
        y + Math.sin(a) * 14,
      );
      g.lineStyle(2, 0x917444);
      g.lineBetween(x, y + 18, x, y + 46);
    });
    if (lightAligned(w.values, p.target)) open(s, w);
    message =
      near >= 0
        ? '↓ دوّر العاكس · خلّي النور يوصل للدائرة'
        : 'وصّل النور لكل المستقبلات';
  } else if (w.kind === 'stealth') {
    let seen = false;
    for (const c of w.covers) {
      g.fillStyle(0x26353e);
      g.fillRect(c.x - 3, c.y - 3, c.w + 6, c.h + 3);
      g.fillStyle(0x8d8069);
      g.fillRect(c.x, c.y, c.w, c.h);
      g.fillStyle(0xd4c2a0);
      g.fillRect(c.x - 3, c.y, c.w + 6, 8);
    }
    p.stations.forEach((col, i) => {
      const x = col * TILE + 12,
        y = 266 - (i % 2) * 24,
        angle =
          Math.PI / 2 +
          Math.sin(time / (1550 - p.variant * 150) + i * 1.7) * 1.5;
      if (pressed && near === i && s.hero.x > x + 12) {
        w.disabled[i] = true;
        sound.fx('clack');
      }
      g.fillStyle(0x3b423c);
      g.fillRect(x - 7, y - 7, 14, 26);
      g.fillStyle(w.disabled[i] ? 0x52685c : 0xffd076);
      g.fillCircle(x, y, 7);
      if (!w.disabled[i]) {
        g.fillStyle(time < w.alarmUntil ? 0xef6952 : 0xffd17c, 0.17);
        g.beginPath();
        g.moveTo(x, y);
        g.arc(x, y, 200, angle - 0.34, angle + 0.34);
        g.closePath();
        g.fillPath();
        if (
          seesHero(
            { x, y, angle, range: 200 },
            { x: s.hero.x, y: s.hero.y },
            w.covers,
          )
        )
          seen = true;
      }
    });
    if (seen) {
      if (time >= w.alarmUntil) sound.fx('clack');
      w.alarmUntil = time + 1800;
    }
    if (w.disabled.every(Boolean)) open(s, w);
    // Alarm costs time, not an unseen hit. A clear warning comes before it.
    if (time < w.alarmUntil) s.remaining -= dt * 0.55;
    message =
      time < w.alarmUntil
        ? 'إنذار! استخبى ورا الشرافة، الوقت بيجري أسرع'
        : near >= 0
          ? 'عدّي خلف الحارس واضغط ↓ عشان تفصل الفانوس'
          : 'خليك خارج مخروط النور أو ورا الشرافات';
  } else {
    const col = p.stations[0],
      x = col * TILE + 12,
      target = p.target[0];
    if (pressed && near >= 0) {
      w.values[0] = (w.values[0] + 1) % 6;
      sound.fx('clack');
    }
    const pos = balanceY(w.values[0], target);
    w.platforms.forEach((platform, i) => {
      const y = i === 0 ? pos.left : pos.right,
        old = platform.y;
      platform.y = Phaser.Math.Linear(old, y, Math.min(1, dt * 5));
      body(platform).updateFromGameObject();
      if (
        Math.abs(body(s.hero).center.x - platform.x) < 40 &&
        Math.abs(feet - (old - 8)) < 9 &&
        body(s.hero).velocity.y >= 0
      ) {
        s.hero.y += platform.y - old;
        body(s.hero).updateFromGameObject();
      }
      g.lineStyle(2, 0xc9ac70);
      g.lineBetween(platform.x, 202, platform.x, platform.y);
      g.lineBetween(x + 65, 202, x + 175, 202);
      for (let j = 0; j < (i === 0 ? w.values[0] : 5 - w.values[0]); j++) {
        g.fillStyle(0x142731);
        g.fillRoundedRect(platform.x - 29 + j * 10, platform.y - 26, 13, 20, 3);
        g.fillStyle(0xf2c978);
        g.fillRoundedRect(platform.x - 27 + j * 10, platform.y - 24, 9, 16, 3);
      }
    });
    g.lineStyle(2, 0x8de0c3);
    g.lineBetween(x + 22, 316, x + 108, 316);
    if (w.values[0] === target) open(s, w);
    message =
      near >= 0
        ? `↓ انقل كيس · الكفة اليسار ${w.values[0]} / العلامة ${target}`
        : 'اضبط الأكياس على علامة الميزان';
  }
  if (!s.L.meta.boss && s.exitDoor) s.exitDoor.setVisible(w.solved);
  w.label.setText(message).setVisible(!s.L.meta.boss);
  const cam = s.cameras.main.worldView;
  w.label.setPosition(
    Phaser.Math.Clamp(
      p.stations[Math.max(0, near)] * TILE - 55,
      cam.x + 8,
      cam.right - w.label.width - 8,
    ),
    178,
  );
}
export function landmarkBossContact(s: Alley, above: boolean) {
  const w = s.landmark;
  if (!w || !s.boss) return;
  if (
    above &&
    s.time.now < w.vulnerableUntil &&
    s.time.now >= s.bossState.invuln
  ) {
    s.hero.setVelocityY(-420);
    s.bossDamage(1);
    return;
  }
  if (above) s.hero.setVelocityY(-380);
  else if (s.time.now < w.vulnerableUntil) {
    // A stunned scarab is harmless: shove the hero clear instead of hurting.
    s.hero.setVelocity(s.hero.x < s.boss.x ? -240 : 240, -220);
  } else s.hurt();
}
export function landmarkBossShot(s: Alley) {
  if (s.landmark && s.time.now < s.landmark.vulnerableUntil) {
    s.bossDamage(1);
  } else s.hint('landmark-shield', 'الدرع مقفول! حل لغز الساحة الأول');
}
export function updateLandmarkBoss(s: Alley, time: number) {
  const w = s.landmark,
    p = s.L.meta.landmark,
    boss = s.boss!;
  if (!w || !p) return;
  const st = s.bossState,
    phase = s.bossPhase();
  if (time < st.invuln) {
    boss.setVelocityX(0);
    return;
  }
  if (w.solved && time > w.vulnerableUntil) {
    w.solved = false;
    if (w.kind === 'light') w.values = w.values.map((v) => (v + phase) % 4);
    else if (w.kind === 'stealth') w.disabled = w.disabled.map(() => false);
    else w.values[0] = (p.target[0] + 1) % 6;
  }
  const left = ` (باقي ${st.hp})`;
  if (w.solved) {
    fightCue('الدرع اتفتح! انطّ عليها أو اضرب' + left, true);
  } else if (time % (3400 - phase * 250) < 800) {
    fightCue('هتهجم! انطّ فوقها');
  } else {
    fightCue(
      w.kind === 'light'
        ? 'الدرع مقفول: دوّر العواكس بزرار ▼'
        : 'الدرع مقفول: حل لغز الساحة',
    );
  }
  if (w.solved) {
    boss.setTint(0x8bffe2);
    boss.setVelocityX(0);
    st.state = 'exposed';
  } else {
    boss.clearTint();
    st.state = 'guard';
    // Three distinct attacks with a visible wind-up, then a dodge window.
    const t = time % (3400 - phase * 250);
    if (t < 800) {
      boss.setVelocityX(0);
      boss.setTint(0xffc26e);
    } else if (t < 1250) {
      boss.setVelocityX(
        (s.hero.x < boss.x ? -1 : 1) *
          (w.kind === 'stealth' ? 145 : w.kind === 'balance' ? 110 : 62),
      );
    } else boss.setVelocityX(0);
  }
  boss.x = Phaser.Math.Clamp(boss.x, st.arenaX + 65, s.L.width - 90);
  boss.setTexture(s.bossTex('idle' + (Math.floor(time / 220) % 2)));
}
