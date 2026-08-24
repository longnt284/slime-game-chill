/* Bộ hiệu ứng âm thanh WebAudio nhỏ gọn — không cần asset ngoài. */

type OscType = OscillatorType;

class SFX {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  muted = false;

  unlock() {
    if (!this.ctx) {
      const AC: typeof AudioContext =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.24;
      this.master.connect(this.ctx.destination);
      const len = Math.floor(this.ctx.sampleRate * 0.3);
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.24;
    return this.muted;
  }

  private tone(
    freq: number,
    dur: number,
    type: OscType = "square",
    vol = 0.5,
    slideTo?: number,
    delay = 0,
  ) {
    if (!this.ctx || !this.master || this.muted) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(Math.max(20, freq), t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private noise(dur: number, vol = 0.4, freq = 1200, delay = 0) {
    if (!this.ctx || !this.master || !this.noiseBuf || this.muted) return;
    const t = this.ctx.currentTime + delay;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f);
    f.connect(g);
    g.connect(this.master);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  shoot() {
    this.tone(720, 0.07, "square", 0.1, 260);
  }
  throwSound() {
    this.tone(420, 0.12, "triangle", 0.16, 700);
  }
  frost() {
    this.tone(1150, 0.12, "sine", 0.12, 500);
  }
  zap() {
    this.tone(1500, 0.1, "sawtooth", 0.12, 120);
    this.noise(0.08, 0.12, 3200);
  }
  hit() {
    this.noise(0.05, 0.1, 2400);
  }
  kill() {
    this.tone(300, 0.09, "square", 0.16, 70);
    this.noise(0.07, 0.12, 900);
  }
  gem() {
    this.tone(880, 0.07, "square", 0.1, 1320);
  }
  core() {
    this.tone(520, 0.1, "triangle", 0.2);
    this.tone(780, 0.14, "triangle", 0.2, undefined, 0.08);
    this.tone(1040, 0.2, "triangle", 0.18, undefined, 0.16);
  }
  heal() {
    this.tone(620, 0.12, "sine", 0.2, 940);
  }
  hurt() {
    this.tone(190, 0.16, "sawtooth", 0.26, 90);
    this.noise(0.12, 0.2, 500);
  }
  levelUp() {
    const seq = [523, 659, 784, 1047];
    seq.forEach((f, i) => this.tone(f, 0.14, "square", 0.16, undefined, i * 0.09));
  }
  evolve() {
    const seq = [392, 523, 659, 784, 1047, 1319];
    seq.forEach((f, i) => this.tone(f, 0.16, "triangle", 0.2, undefined, i * 0.07));
    this.noise(0.5, 0.08, 4000, 0.1);
  }
  bossRoar() {
    this.tone(85, 0.65, "sawtooth", 0.32, 48);
    this.noise(0.55, 0.22, 260);
    this.tone(64, 0.7, "square", 0.18, 40, 0.05);
  }
  bossDie() {
    this.tone(220, 0.8, "sawtooth", 0.28, 36);
    this.noise(0.7, 0.3, 700);
    const seq = [523, 659, 784, 1047, 1319];
    seq.forEach((f, i) => this.tone(f, 0.16, "square", 0.14, undefined, 0.35 + i * 0.08));
  }
  wave() {
    this.tone(440, 0.1, "square", 0.14);
    this.tone(587, 0.14, "square", 0.14, undefined, 0.1);
  }
  click() {
    this.tone(600, 0.05, "square", 0.12, 400);
  }
  gameover() {
    const seq = [392, 330, 262, 196];
    seq.forEach((f, i) => this.tone(f, 0.3, "triangle", 0.2, undefined, i * 0.22));
  }
  victory() {
    const seq = [523, 659, 784, 1047, 784, 1047, 1319, 1568];
    seq.forEach((f, i) => this.tone(f, 0.18, "square", 0.15, undefined, i * 0.11));
  }
}

export const sfx = new SFX();
