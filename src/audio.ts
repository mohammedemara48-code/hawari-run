// Original chiptune score and effects, synthesised live with Web Audio.
// Each level has its own maqam-flavoured theme over darbuka rhythms
// (maqsum, baladi, saidi); intensity layers build up when danger is near.
// Signal path: voices → music / sfx buses → master → compressor → limiter.

/** Maqam scales in semitones from the tonic (x.5 = quarter tone). */
export const MAQAM = {
  nahawand: [0, 2, 3, 5, 7, 8, 11],
  hijaz: [0, 1, 4, 5, 7, 8, 10],
  rast: [0, 2, 3.5, 5, 7, 9, 10.5],
  kurd: [0, 1, 3, 5, 7, 8, 10],
  bayati: [0, 1.5, 3, 5, 7, 8, 10],
} as const;
type MaqamName = keyof typeof MAQAM;
/** Darbuka patterns over 8 eighth-notes: D = doum, T = tek, k = ka, . = rest. */
export const RHYTHM = {
  maqsum: 'DT.TD.T.',
  baladi: 'DD.TD.T.',
  saidi: 'DT.DD.T.',
  malfuf: 'D..T..T.',
  fallahi: 'DTkTDTkT',
} as const;
type RhythmName = keyof typeof RHYTHM;
interface Track {
  name: string;
  maqam: MaqamName;
  root: number; // MIDI note of the tonic
  bpm: number;
  rhythm: RhythmName;
  lead: OscillatorType;
  /** Scale degrees per eighth note (7 = octave, negative = below), null = rest. */
  melody: (number | null)[];
  bass: (number | null)[];
  drone?: boolean;
}
const _ = null;
export const TRACKS: Track[] = [
  {
    name: 'حارة الفوانيس (نهاوند · مقسوم)',
    maqam: 'nahawand',
    root: 62,
    bpm: 104,
    rhythm: 'maqsum',
    lead: 'square',
    melody: [
      4,
      _,
      3,
      4,
      5,
      _,
      4,
      3,
      2,
      _,
      3,
      2,
      1,
      _,
      0,
      _,
      2,
      3,
      4,
      _,
      6,
      5,
      4,
      _,
      3,
      _,
      2,
      _,
      1,
      2,
      0,
      _,
      7,
      _,
      6,
      7,
      8,
      _,
      7,
      6,
      5,
      _,
      6,
      5,
      4,
      _,
      3,
      4,
      5,
      _,
      4,
      3,
      2,
      _,
      1,
      2,
      3,
      2,
      1,
      0,
      -1,
      _,
      0,
      _,
    ],
    bass: [0, _, _, 0, -3, _, _, _, -2, _, _, -2, -3, _, _, _],
  },
  {
    name: 'سوق تحت البلد (حجاز · بلدي)',
    maqam: 'hijaz',
    root: 64,
    bpm: 118,
    rhythm: 'baladi',
    lead: 'square',
    melody: [
      0,
      1,
      2,
      _,
      2,
      1,
      2,
      3,
      4,
      _,
      3,
      2,
      1,
      _,
      0,
      _,
      4,
      5,
      6,
      _,
      5,
      4,
      3,
      4,
      2,
      _,
      1,
      2,
      0,
      _,
      _,
      _,
      7,
      _,
      6,
      5,
      6,
      _,
      4,
      _,
      5,
      4,
      3,
      4,
      2,
      _,
      1,
      _,
      2,
      3,
      4,
      5,
      4,
      3,
      2,
      1,
      1,
      0,
      1,
      2,
      0,
      _,
      _,
      _,
    ],
    bass: [0, _, 0, _, 4, _, _, _, 3, _, 3, _, 1, _, _, _],
  },
  {
    name: 'فوق الأسطح (راست · صعيدي)',
    maqam: 'rast',
    root: 60,
    bpm: 128,
    rhythm: 'saidi',
    lead: 'triangle',
    melody: [
      0,
      _,
      2,
      4,
      4,
      _,
      3,
      2,
      4,
      5,
      4,
      3,
      2,
      _,
      _,
      _,
      2,
      _,
      3,
      4,
      5,
      _,
      4,
      5,
      6,
      7,
      6,
      5,
      4,
      _,
      _,
      _,
      7,
      _,
      7,
      6,
      5,
      _,
      6,
      5,
      4,
      _,
      5,
      4,
      3,
      _,
      2,
      _,
      4,
      3,
      2,
      1,
      2,
      _,
      1,
      0,
      1,
      _,
      2,
      _,
      0,
      _,
      _,
      _,
    ],
    bass: [0, _, _, 0, 0, _, 4, _, 3, _, _, 3, 4, _, 4, _],
  },
  {
    name: 'تحت المترو (كرد · ملفوف)',
    maqam: 'kurd',
    root: 57,
    bpm: 96,
    rhythm: 'malfuf',
    lead: 'sawtooth',
    drone: true,
    melody: [
      0,
      _,
      _,
      1,
      0,
      _,
      -2,
      _,
      0,
      _,
      1,
      3,
      1,
      _,
      _,
      _,
      3,
      _,
      4,
      3,
      1,
      _,
      0,
      _,
      1,
      _,
      0,
      -2,
      0,
      _,
      _,
      _,
      4,
      _,
      5,
      4,
      3,
      _,
      1,
      _,
      3,
      4,
      5,
      7,
      5,
      _,
      4,
      _,
      3,
      _,
      1,
      0,
      1,
      _,
      3,
      1,
      0,
      _,
      -2,
      _,
      0,
      _,
      _,
      _,
    ],
    bass: [0, _, _, _, 0, _, -2, _, -3, _, _, _, -2, _, _, _],
  },
  {
    name: 'المعلّم برعي (حجاز · فلاحي)',
    maqam: 'hijaz',
    root: 59,
    bpm: 138,
    rhythm: 'fallahi',
    lead: 'sawtooth',
    drone: true,
    melody: [
      0,
      1,
      0,
      1,
      2,
      _,
      1,
      0,
      4,
      _,
      5,
      4,
      2,
      1,
      0,
      _,
      0,
      1,
      2,
      3,
      4,
      3,
      2,
      1,
      2,
      _,
      1,
      _,
      0,
      _,
      -1,
      _,
      7,
      _,
      8,
      7,
      6,
      5,
      4,
      _,
      5,
      4,
      2,
      _,
      1,
      2,
      1,
      0,
      4,
      4,
      5,
      4,
      2,
      2,
      1,
      2,
      1,
      0,
      -1,
      0,
      0,
      _,
      _,
      _,
    ],
    bass: [0, 0, _, 0, 1, _, 0, _, 0, 0, _, 0, -2, _, -1, _],
  },
];
const midi = (n: number) => 440 * 2 ** ((n - 69) / 12);
export function degreeToSemis(maqam: MaqamName, degree: number) {
  const scale = MAQAM[maqam],
    n = scale.length,
    oct = Math.floor(degree / n),
    i = ((degree % n) + n) % n;
  return oct * 12 + scale[i];
}
const STORE = 'hawari-audio';
export class Sound {
  ctx?: AudioContext;
  master?: GainNode;
  musicBus?: GainNode;
  sfxBus?: GainNode;
  comp?: DynamicsCompressorNode;
  limiter?: DynamicsCompressorNode;
  noise?: AudioBuffer;
  droneOsc?: OscillatorNode;
  droneGain?: GainNode;
  timer?: ReturnType<typeof setInterval>;
  musicVolume = 0.9;
  sfxVolume = 1;
  private _muted = false;
  track = 0;
  intensity = 0;
  bossPhase = 0;
  step = 0;
  nextTime = 0;
  duckUntil = 0;
  errors = 0;
  constructor() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE) || '{}');
      if (typeof saved.music === 'number') this.musicVolume = saved.music;
      if (typeof saved.sfx === 'number') this.sfxVolume = saved.sfx;
    } catch {
      /* Storage may be unavailable. */
    }
  }
  get muted() {
    return this._muted;
  }
  set muted(m: boolean) {
    this._muted = m;
    if (this.ctx && this.master)
      this.master.gain.setTargetAtTime(m ? 0 : 1, this.ctx.currentTime, 0.02);
  }
  start() {
    // Audio is optional: old iOS (webkit prefix only), blocked autoplay or a
    // standalone launch without a gesture must never stop the game starting.
    try {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctx) return;
      if (!this.ctx) {
        const ctx = new Ctx();
        this.ctx = ctx;
        this.master = ctx.createGain();
        this.master.gain.value = this._muted ? 0 : 1;
        this.musicBus = ctx.createGain();
        this.sfxBus = ctx.createGain();
        this.comp = ctx.createDynamicsCompressor();
        this.comp.threshold.value = -18;
        this.comp.knee.value = 8;
        this.comp.ratio.value = 4;
        this.comp.attack.value = 0.004;
        this.comp.release.value = 0.18;
        this.limiter = ctx.createDynamicsCompressor();
        this.limiter.threshold.value = -2;
        this.limiter.knee.value = 0;
        this.limiter.ratio.value = 20;
        this.limiter.attack.value = 0.001;
        this.limiter.release.value = 0.08;
        this.musicBus.connect(this.master);
        this.sfxBus.connect(this.master);
        this.master.connect(this.comp);
        this.comp.connect(this.limiter);
        this.limiter.connect(ctx.destination);
        const len = ctx.sampleRate;
        this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
        const data = this.noise.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
        this.applyVolumes();
      }
      this.ctx.resume?.().catch(() => {});
      if (!this.timer) this.timer = setInterval(() => this.schedule(), 30);
    } catch (e) {
      this.errors++;
      console.warn('audio unavailable', e);
    }
  }
  applyVolumes() {
    if (!this.ctx) return;
    // Perceptual curve: sliders feel linear, buses get a loud ceiling.
    this.musicBus!.gain.setTargetAtTime(
      1.6 * this.musicVolume ** 1.5,
      this.ctx.currentTime,
      0.03,
    );
    this.sfxBus!.gain.setTargetAtTime(
      2.2 * this.sfxVolume ** 1.5,
      this.ctx.currentTime,
      0.03,
    );
  }
  setVolumes(music: number, sfx: number) {
    this.musicVolume = Math.max(0, Math.min(1, music));
    this.sfxVolume = Math.max(0, Math.min(1, sfx));
    this.applyVolumes();
    try {
      localStorage.setItem(
        STORE,
        JSON.stringify({ music: this.musicVolume, sfx: this.sfxVolume }),
      );
    } catch {
      /* Storage may be unavailable. */
    }
  }
  setTrack(index: number) {
    if (index === this.track) return;
    this.track = index;
    this.step = 0;
    this.bossPhase = 0;
    if (this.ctx) this.nextTime = this.ctx.currentTime + 0.08;
    this.updateDrone();
  }
  setIntensity(level: number) {
    this.intensity = Math.max(0, Math.min(3, level));
  }
  /** Debug snapshot for tests. */
  state() {
    return {
      ready: !!this.ctx,
      context: this.ctx?.state ?? 'none',
      track: this.track,
      trackName: TRACKS[this.track]?.name,
      intensity: this.intensity,
      bossPhase: this.bossPhase,
      music: this.musicVolume,
      sfx: this.sfxVolume,
      compressor: !!this.comp && !!this.limiter,
      errors: this.errors,
    };
  }
  private updateDrone() {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = TRACKS[this.track];
    if (t.drone && !this.droneOsc) {
      const o = ctx.createOscillator(),
        f = ctx.createBiquadFilter(),
        g = ctx.createGain();
      o.type = 'sawtooth';
      f.type = 'lowpass';
      f.frequency.value = 380;
      g.gain.value = 0;
      o.connect(f);
      f.connect(g);
      g.connect(this.musicBus!);
      o.start();
      this.droneOsc = o;
      this.droneGain = g;
    }
    if (this.droneOsc && this.droneGain) {
      this.droneOsc.frequency.setTargetAtTime(
        midi(t.root - 24),
        ctx.currentTime,
        0.1,
      );
      this.droneGain.gain.setTargetAtTime(
        t.drone ? 0.05 : 0,
        ctx.currentTime,
        0.3,
      );
    }
  }
  /* ── Voices ── */
  private voice(
    freq: number,
    t: number,
    dur: number,
    type: OscillatorType,
    vol: number,
    bus: GainNode,
    opts: {
      slide?: number;
      bendFrom?: number;
      vibrato?: number;
      filter?: number;
    } = {},
  ) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator(),
      g = ctx.createGain();
    o.type = type;
    if (opts.bendFrom) {
      // Ornament: slide up into the note (a little mordent-like scoop).
      o.frequency.setValueAtTime(freq * opts.bendFrom, t);
      o.frequency.exponentialRampToValueAtTime(
        freq,
        t + Math.min(0.06, dur / 2),
      );
    } else o.frequency.setValueAtTime(freq, t);
    if (opts.slide)
      o.frequency.exponentialRampToValueAtTime(opts.slide, t + dur);
    let out: AudioNode = o;
    if (opts.filter) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = opts.filter;
      o.connect(f);
      out = f;
    }
    if (opts.vibrato) {
      const lfo = ctx.createOscillator(),
        lg = ctx.createGain();
      lfo.frequency.value = 6;
      lg.gain.value = freq * opts.vibrato;
      lfo.connect(lg);
      lg.connect(o.frequency);
      lfo.start(t + 0.08);
      lfo.stop(t + dur + 0.05);
    }
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.006);
    g.gain.setTargetAtTime(vol * 0.6, t + 0.03, 0.06);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    out.connect(g);
    g.connect(bus);
    o.start(t);
    o.stop(t + dur + 0.03);
  }
  private hit(
    t: number,
    kind: 'doum' | 'tek' | 'ka' | 'riq' | 'snap',
    vol: number,
    bus: GainNode,
  ) {
    const ctx = this.ctx!;
    if (kind === 'doum') {
      const o = ctx.createOscillator(),
        g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(150, t);
      o.frequency.exponentialRampToValueAtTime(52, t + 0.18);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
      o.connect(g);
      g.connect(bus);
      o.start(t);
      o.stop(t + 0.34);
      return;
    }
    const src = ctx.createBufferSource(),
      f = ctx.createBiquadFilter(),
      g = ctx.createGain();
    src.buffer = this.noise!;
    const conf = {
      tek: { type: 'bandpass', freq: 3200, q: 1.4, dur: 0.07 },
      ka: { type: 'bandpass', freq: 1800, q: 1.2, dur: 0.05 },
      riq: { type: 'highpass', freq: 7000, q: 0.7, dur: 0.045 },
      snap: { type: 'bandpass', freq: 1200, q: 0.8, dur: 0.12 },
    }[kind];
    f.type = conf.type as BiquadFilterType;
    f.frequency.value = conf.freq;
    f.Q.value = conf.q;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + conf.dur);
    src.connect(f);
    f.connect(g);
    g.connect(bus);
    src.start(t, Math.random() * 0.5);
    src.stop(t + conf.dur + 0.02);
  }
  /* ── Music scheduler ── */
  private schedule() {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;
    try {
      if (this.nextTime < ctx.currentTime - 0.2)
        this.nextTime = ctx.currentTime + 0.05;
      while (this.nextTime < ctx.currentTime + 0.14) {
        this.playStep(this.nextTime);
        const t = TRACKS[this.track];
        const tempo =
          t.bpm *
          (1 + (this.intensity >= 2 ? 0.07 : 0) + this.bossPhase * 0.06);
        this.nextTime += 60 / tempo / 2;
        this.step++;
      }
    } catch (e) {
      this.errors++;
      console.warn('music step failed', e);
    }
  }
  private playStep(time: number) {
    const t = TRACKS[this.track],
      bus = this.musicBus!,
      s = this.step;
    const duck = time < this.duckUntil ? 0.35 : 1;
    const eighth = 60 / t.bpm / 2;
    const level = Math.max(
      this.intensity,
      this.track === 4 ? 1 + this.bossPhase : 0,
    );
    // Darbuka.
    const ch = RHYTHM[t.rhythm][s % 8];
    if (ch === 'D') this.hit(time, 'doum', 0.55 * duck, bus);
    else if (ch === 'T') this.hit(time, 'tek', 0.32 * duck, bus);
    else if (ch === 'k') this.hit(time, 'ka', 0.22 * duck, bus);
    if (level >= 1 && s % 2 === 1) this.hit(time, 'riq', 0.16 * duck, bus);
    if (level >= 2) this.hit(time + eighth / 2, 'riq', 0.1 * duck, bus);
    if (level >= 3 && s % 8 === 4) this.hit(time, 'snap', 0.22 * duck, bus);
    // Bass (one entry per eighth over 16 steps).
    const b = t.bass[s % t.bass.length];
    if (b !== null) {
      const f = midi(t.root - 24 + degreeToSemis(t.maqam, b));
      this.voice(f, time, eighth * 1.7, 'triangle', 0.42 * duck, bus);
      this.voice(f, time, eighth * 0.9, 'square', 0.08 * duck, bus, {
        filter: 600,
      });
    }
    // Lead melody with ornaments.
    const m = t.melody[s % t.melody.length];
    if (m !== null) {
      let len = 1;
      while (len < 4 && t.melody[(s + len) % t.melody.length] === null) len++;
      const f = midi(t.root + degreeToSemis(t.maqam, m));
      const ornament = (s * 7) % 11 === 0 ? 0.97 : 0;
      this.voice(
        f,
        time,
        eighth * len * 0.95,
        t.lead,
        (t.lead === 'triangle' ? 0.3 : 0.15) * duck,
        bus,
        {
          bendFrom: ornament || undefined,
          vibrato: len > 1 ? 0.012 : 0,
        },
      );
      // Layered lead: an octave-up shimmer, joined by a detuned saw when intense.
      if (level >= 1)
        this.voice(
          f * 2,
          time,
          eighth * len * 0.6,
          'square',
          0.04 * duck,
          bus,
          { filter: 2600 },
        );
      if (level >= 2)
        this.voice(
          f * 1.004,
          time,
          eighth * len * 0.9,
          'sawtooth',
          0.07 * duck,
          bus,
          { filter: 1800 },
        );
    }
    // Counter-line: answer phrase arpeggio on the off-bars when intense.
    if (level >= 2 && s % 4 === 2) {
      const deg = [0, 2, 4, 2][Math.floor(s / 4) % 4];
      this.voice(
        midi(t.root - 12 + degreeToSemis(t.maqam, deg)),
        time,
        eighth * 0.8,
        'square',
        0.06 * duck,
        bus,
        { filter: 1400 },
      );
    }
  }
  /* ── Effects ── */
  tone(
    freq: number,
    duration = 0.12,
    type: OscillatorType = 'square',
    volume = 0.2,
    delay = 0,
    slide = 0,
  ) {
    if (!this.ctx || !this.sfxBus) return;
    try {
      this.voice(
        freq,
        this.ctx.currentTime + delay,
        duration,
        type,
        volume,
        this.sfxBus,
        { slide: slide || undefined },
      );
    } catch (e) {
      this.errors++;
      console.warn('sfx failed', e);
    }
  }
  private noiseFx(
    freq: number,
    dur: number,
    vol: number,
    delay = 0,
    type: BiquadFilterType = 'bandpass',
  ) {
    if (!this.ctx || !this.noise) return;
    const ctx = this.ctx,
      t = ctx.currentTime + delay;
    const src = ctx.createBufferSource(),
      f = ctx.createBiquadFilter(),
      g = ctx.createGain();
    src.buffer = this.noise;
    f.type = type;
    f.frequency.setValueAtTime(freq, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(80, freq / 4), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f);
    f.connect(g);
    g.connect(this.sfxBus!);
    src.start(t);
    src.stop(t + dur + 0.02);
  }
  private stinger(
    notes: number[],
    step: number,
    type: OscillatorType = 'square',
    vol = 0.22,
  ) {
    if (!this.ctx) return;
    this.duckUntil = this.ctx.currentTime + notes.length * step + 0.3;
    notes.forEach((n, i) => {
      this.tone(midi(n), step * 1.6, type, vol, i * step);
      this.tone(midi(n - 12), step * 1.4, 'triangle', vol * 0.8, i * step);
    });
  }
  fx(kind: string) {
    if (!this.ctx) return;
    switch (kind) {
      case 'jump':
        this.tone(220, 0.16, 'square', 0.16, 0, 660);
        this.tone(440, 0.1, 'triangle', 0.1, 0, 990);
        break;
      case 'coin':
        this.tone(988, 0.07, 'square', 0.14);
        this.tone(1480, 0.16, 'square', 0.16, 0.06);
        break;
      case 'hit':
      case 'stomp':
        this.tone(180, 0.14, 'square', 0.3, 0, 60);
        this.noiseFx(1800, 0.09, 0.4);
        break;
      case 'hurt':
        this.tone(330, 0.3, 'sawtooth', 0.26, 0, 90);
        this.noiseFx(900, 0.2, 0.3);
        break;
      case 'bump':
        this.tone(160, 0.08, 'square', 0.3, 0, 90);
        this.noiseFx(700, 0.06, 0.3);
        break;
      case 'break':
        this.noiseFx(2400, 0.22, 0.55);
        this.tone(110, 0.15, 'square', 0.3, 0, 40);
        break;
      case 'fire':
        this.noiseFx(4000, 0.18, 0.3);
        this.tone(700, 0.14, 'sawtooth', 0.12, 0, 160);
        break;
      case 'bounce':
        this.tone(150, 0.2, 'triangle', 0.4, 0, 520);
        this.tone(300, 0.14, 'square', 0.1, 0.02, 900);
        break;
      case 'zip':
        this.noiseFx(5000, 0.35, 0.18, 0, 'highpass');
        this.tone(900, 0.3, 'triangle', 0.08, 0, 600);
        break;
      case 'crumble':
        this.noiseFx(900, 0.35, 0.45);
        break;
      case 'splash':
        this.noiseFx(2600, 0.4, 0.5);
        break;
      case 'wind':
        this.noiseFx(1400, 1.2, 0.16);
        break;
      case 'lantern':
        [72, 79, 84].forEach((n, i) =>
          this.tone(midi(n), 0.22, 'triangle', 0.22, i * 0.05),
        );
        break;
      case 'roar':
        this.tone(110, 0.6, 'sawtooth', 0.35, 0, 55);
        this.noiseFx(600, 0.6, 0.35);
        break;
      case 'shock':
        this.tone(70, 0.4, 'square', 0.4, 0, 35);
        this.noiseFx(400, 0.4, 0.5, 0, 'lowpass');
        break;
      case 'boss-hit':
        this.tone(140, 0.25, 'square', 0.4, 0, 50);
        this.noiseFx(2200, 0.2, 0.55);
        break;
      case 'power':
        this.stinger([64, 68, 71, 76], 0.075, 'square', 0.2);
        break;
      case 'secret':
        // Hijaz flourish.
        this.stinger([62, 63, 66, 67, 69, 74], 0.09, 'triangle', 0.32);
        break;
      case 'checkpoint':
        this.stinger([67, 71, 74], 0.1, 'square', 0.18);
        break;
      case 'clear':
        this.stinger([62, 66, 69, 74, 73, 74, 78], 0.14, 'square', 0.22);
        break;
    }
  }
}
export const sound = new Sound();
