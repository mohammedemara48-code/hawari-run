// Original two-voice score, composed for this game. No sampled audio.
export class Sound {
  ctx?: AudioContext;
  muted = false;
  beat = 0;
  next = 0;
  mode = 0;
  timer?: ReturnType<typeof setInterval>;
  start() {
    this.ctx ??= new AudioContext();
    void this.ctx.resume();
    if (!this.timer) this.timer = setInterval(() => this.tick(), 80);
  }
  tone(
    freq: number,
    duration = 0.12,
    type: OscillatorType = 'square',
    volume = 0.045,
    delay = 0,
    slide = 0,
  ) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime + delay,
      o = this.ctx.createOscillator(),
      g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + duration);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(volume, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.001, t + duration);
    o.connect(g);
    g.connect(this.ctx.destination);
    o.start(t);
    o.stop(t + duration + 0.02);
  }
  fx(kind: string) {
    switch (kind) {
      case 'jump':
        this.tone(240, 0.15, 'square', 0.035, 0, 620);
        break;
      case 'coin':
        this.tone(988, 0.08);
        this.tone(1480, 0.12, 'triangle', 0.07, 0.07);
        break;
      case 'hit':
        this.tone(130, 0.16, 'sawtooth', 0.045, 0, 45);
        break;
      case 'power':
        [330, 440, 554, 880].forEach((f, i) =>
          this.tone(f, 0.16, 'triangle', 0.08, i * 0.09),
        );
        break;
      case 'clear':
        [392, 494, 587, 784, 740, 988].forEach((f, i) =>
          this.tone(f, 0.25, 'square', 0.035, i * 0.15),
        );
        break;
      case 'fire':
        this.tone(780, 0.14, 'sawtooth', 0.025, 0, 100);
        break;
      case 'bump':
        this.tone(330, 0.07, 'square', 0.05, 0, 180);
        this.tone(520, 0.08, 'triangle', 0.04, 0.05);
        break;
      case 'break':
        this.tone(90, 0.12, 'sawtooth', 0.06, 0, 35);
        break;
    }
  }
  tick() {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    if (now < this.next) return;
    this.next = now + 0.17;
    const melody =
      this.mode === 1
        ? [
            62, 0, 69, 70, 69, 65, 0, 62, 60, 65, 67, 0, 65, 62, 57, 0, 62, 65,
            69, 0, 72, 70, 69, 65, 67, 0, 65, 62, 60, 57, 60, 0,
          ]
        : [
            67, 0, 70, 74, 0, 72, 70, 65, 67, 0, 62, 65, 0, 67, 69, 0, 70, 74,
            77, 0, 75, 74, 70, 0, 72, 69, 65, 0, 62, 65, 67, 0,
          ];
    const note = melody[this.beat % 32];
    if (note) this.tone(440 * 2 ** ((note - 69) / 12), 0.13, 'triangle', 0.045);
    if (this.beat % 4 === 0) {
      const bass = [43, 46, 41, 38][Math.floor(this.beat / 8) % 4];
      this.tone(440 * 2 ** ((bass - 69) / 12), 0.22, 'triangle', 0.065);
    }
    if (this.beat % 2 === 1) this.tone(75, 0.035, 'square', 0.02, 0, 40);
    this.beat++;
  }
}
export const sound = new Sound();
