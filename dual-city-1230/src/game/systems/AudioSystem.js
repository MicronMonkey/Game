// Original procedural audio via Web Audio API (no external files, nothing to license).
// The AudioContext is created/resumed only after a user gesture.

const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);

const MUSIC = {
  menu: { bpm: 112, wave: 'triangle', vol: 0.05, bass: [48, 48, 53, 55], lead: [72, 76, 79, 76, 74, 77, 81, 79] },
  gather: { bpm: 132, wave: 'square', vol: 0.035, bass: [45, 45, 48, 50], lead: [69, 72, 76, 72, 74, 72, 69, 67] },
  sync: { bpm: 144, wave: 'square', vol: 0.035, bass: [50, 50, 53, 48], lead: [74, 77, 81, 77, 76, 74, 72, 74] },
  boss: { bpm: 156, wave: 'sawtooth', vol: 0.03, bass: [40, 40, 43, 38], lead: [64, 67, 70, 67, 64, 62, 64, 67] },
  memory: { bpm: 76, wave: 'sine', vol: 0.05, bass: [48, 53, 55, 52], lead: [72, 74, 76, 79, 77, 76, 74, 72] },
};

class AudioSystemImpl {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.enabled = true;
    this.track = null;
    this.timer = null;
    this.step = 0;
    this.quiet = false;
  }

  unlock() {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.enabled ? 1 : 0;
        this.master.connect(this.ctx.destination);
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
      if (this.track && !this.timer) this.startLoop();
    } catch {
      /* audio unavailable: game continues silently */
    }
  }

  setEnabled(on) {
    this.enabled = on;
    if (this.master) this.master.gain.value = on ? 1 : 0;
  }

  setQuiet(q) {
    this.quiet = q;
  }

  tone(freq, dur, { type = 'square', vol = 0.08, slide = 0, delay = 0 } = {}) {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
    const v = this.quiet ? vol * 0.4 : vol;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  noise(dur, vol = 0.06) {
    if (!this.ctx || !this.enabled) return;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    const g = this.ctx.createGain();
    g.gain.value = vol;
    src.buffer = buf;
    src.connect(g).connect(this.master);
    src.start();
  }

  sfx(name, arg = 0) {
    switch (name) {
      case 'click': return this.tone(660, 0.06, { type: 'square', vol: 0.05 });
      case 'select': return this.tone(880, 0.05, { type: 'triangle', vol: 0.06 });
      case 'order': return this.tone(520, 0.08, { type: 'triangle', vol: 0.06, slide: 200 });
      case 'arrive': {
        const n = 72 + Math.min(12, arg * 2);
        return this.tone(NOTE(n), 0.12, { type: 'triangle', vol: 0.08 });
      }
      case 'skill':
        this.tone(NOTE(72), 0.1, { type: 'sine', vol: 0.09 });
        this.tone(NOTE(79), 0.14, { type: 'sine', vol: 0.09, delay: 0.08 });
        return this.tone(NOTE(84), 0.2, { type: 'sine', vol: 0.09, delay: 0.16 });
      case 'event': return this.tone(330, 0.18, { type: 'sawtooth', vol: 0.05, slide: -120 });
      case 'deny': return this.tone(180, 0.12, { type: 'square', vol: 0.05 });
      case 'tick': return this.tone(1200, 0.03, { type: 'square', vol: 0.03 });
      case 'boss': this.noise(0.5, 0.08); return this.tone(110, 0.6, { type: 'sawtooth', vol: 0.08, slide: -50 });
      case 'hit': return this.tone(900 + Math.random() * 200, 0.03, { type: 'square', vol: 0.02 });
      case 'crit': this.noise(0.15, 0.06); return this.tone(NOTE(88), 0.18, { type: 'square', vol: 0.08, slide: -400 });
      case 'win':
        [72, 76, 79, 84].forEach((n, i) => this.tone(NOTE(n), 0.3, { type: 'triangle', vol: 0.09, delay: i * 0.12 }));
        return;
      case 'lose':
        [67, 64, 60].forEach((n, i) => this.tone(NOTE(n), 0.35, { type: 'sine', vol: 0.08, delay: i * 0.18 }));
        return;
      case 'goal':
        [79, 84, 88].forEach((n, i) => this.tone(NOTE(n), 0.2, { type: 'triangle', vol: 0.08, delay: i * 0.09 }));
        return;
      default:
    }
  }

  music(name) {
    if (this.track === name) return;
    this.stopMusic();
    this.track = name;
    if (this.ctx) this.startLoop();
  }

  startLoop() {
    const m = MUSIC[this.track];
    if (!m || !this.ctx) return;
    const stepMs = 60000 / m.bpm / 2;
    this.step = 0;
    this.timer = setInterval(() => {
      if (!this.enabled || !this.ctx || this.ctx.state !== 'running') return;
      const s = this.step++;
      const dur = stepMs / 1000;
      if (s % 2 === 0) this.tone(NOTE(m.bass[Math.floor(s / 4) % m.bass.length]), dur * 1.6, { type: 'triangle', vol: m.vol * 1.4 });
      this.tone(NOTE(m.lead[s % m.lead.length]), dur * 0.8, { type: m.wave, vol: m.vol });
    }, stepMs);
  }

  stopMusic() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.track = null;
  }

  pauseMusic() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  resumeMusic() {
    if (this.track && !this.timer && this.ctx) this.startLoop();
  }
}

export const Audio = new AudioSystemImpl();
