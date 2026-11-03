export const CHORDS = {
  C: [null, 3, 2, 0, 1, 0],
  G: [3, 2, 0, 0, 0, 3],
  Am: [null, 0, 2, 2, 1, 0],
  F: [1, 3, 3, 2, 1, 1],
  Em: [0, 2, 2, 0, 0, 0],
  Dm: [null, null, 0, 2, 3, 1],
};

const OPEN_MIDI = [40, 45, 50, 55, 59, 64];
const midiToHz = m => 440 * Math.pow(2, (m - 69) / 12);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.cache = new Map();
    this.muted = false;
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.8;
  }

  get ready() {
    return !!this.ctx;
  }

  start() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.8;
      const comp = this.ctx.createDynamicsCompressor();
      this.master.connect(comp);
      comp.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  buffer(freq) {
    const key = freq.toFixed(2);
    if (this.cache.has(key)) return this.cache.get(key);
    const sr = this.ctx.sampleRate;
    const len = Math.floor(sr * 1.8);
    const buf = this.ctx.createBuffer(1, len, sr);
    const d = buf.getChannelData(0);
    const n = Math.round(sr / freq);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    for (let i = n; i < len; i++) d[i] = 0.4985 * (d[i - n] + d[i - n + 1]);

    const fade = Math.floor(sr * 0.1);
    for (let i = 0; i < fade; i++) d[len - 1 - i] *= i / fade;
    this.cache.set(key, buf);
    return buf;
  }

  strum(chord, dir, speed, recv) {
    if (!this.ctx || !CHORDS[chord]) return null;
    const vel = clamp(0.25 + ((speed || 40) - 10) / 140 * 0.75, 0.2, 1);
    const spacing = clamp(0.03 - (speed || 40) / 150 * 0.02, 0.008, 0.03);
    const strings = [];
    CHORDS[chord].forEach((f, i) => {
      if (f !== null) strings.push(i);
    });
    if (dir === 'up') strings.reverse();
    const lead = 0.005;
    const t0 = this.ctx.currentTime + lead;
    strings.forEach((s, n) => {
      const freq = midiToHz(OPEN_MIDI[s] + CHORDS[chord][s]);
      const src = this.ctx.createBufferSource();
      src.buffer = this.buffer(freq);
      const g = this.ctx.createGain();
      g.gain.value = (vel * (0.85 + Math.random() * 0.15) * 1.4) / Math.sqrt(strings.length);
      src.connect(g);
      g.connect(this.master);
      src.start(t0 + n * spacing);
    });
    const outLatency = (this.ctx.outputLatency || 0) + (this.ctx.baseLatency || 0);
    return performance.now() - recv + lead * 1000 + outLatency * 1000;
  }

  click(accent) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.frequency.value = accent ? 1200 : 800;
    g.gain.setValueAtTime(0.18, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t);
    osc.stop(t + 0.07);
  }
}
