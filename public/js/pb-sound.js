// PolitiBattle Module — pb-sound — loaded by politibattle.html, arena.html, politibattle-multi.html
'use strict';

window.PBSound = {
  _ctx: null,
  _masterGain: null,
  _weatherGain: null,
  _weatherNode: null,
  _muted: false,
  _volume: 0.7,

  init() {
    if (this._ctx) return;
    try {
      this._ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.warn('PBSound: Web Audio API not available', e);
      return;
    }
    this._masterGain = this._ctx.createGain();
    this._masterGain.connect(this._ctx.destination);
    this._weatherGain = this._ctx.createGain();
    this._weatherGain.gain.value = 0.25;
    this._weatherGain.connect(this._masterGain);
    try {
      const saved = JSON.parse(localStorage.getItem('pb_sound') || '{}');
      if (typeof saved.muted === 'boolean') this._muted = saved.muted;
      if (typeof saved.volume === 'number') this._volume = saved.volume;
    } catch (_) {}
    this._applyVolume();
  },

  _applyVolume() {
    if (!this._masterGain) return;
    this._masterGain.gain.value = this._muted ? 0 : this._volume;
  },

  _save() {
    try {
      localStorage.setItem('pb_sound', JSON.stringify({ muted: this._muted, volume: this._volume }));
    } catch (_) {}
  },

  _makeOsc(type, freq, gainVal) {
    const ctx = this._ctx;
    const g = ctx.createGain();
    g.gain.value = gainVal;
    g.connect(this._masterGain);
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    osc.connect(g);
    return { osc, gain: g };
  },

  _makeNoiseBuffer() {
    const ctx = this._ctx;
    const bufLen = ctx.sampleRate;
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  },

  _playNoise(durationSec, gainPeak, filterType, filterFreq, filterQ) {
    const ctx = this._ctx;
    const src = ctx.createBufferSource();
    src.buffer = this._makeNoiseBuffer();
    src.loop = true;
    const g = ctx.createGain();
    const now = ctx.currentTime;
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(gainPeak, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);
    if (filterType) {
      const filt = ctx.createBiquadFilter();
      filt.type = filterType;
      filt.frequency.value = filterFreq || 1000;
      if (filterQ) filt.Q.value = filterQ;
      src.connect(filt);
      filt.connect(g);
    } else {
      src.connect(g);
    }
    g.connect(this._masterGain);
    src.start(now);
    src.stop(now + durationSec + 0.05);
  },

  setMuted(bool) {
    this._muted = !!bool;
    this._applyVolume();
    this._save();
  },

  setVolume(v) {
    this._volume = Math.max(0, Math.min(1, v));
    this._applyVolume();
    this._save();
  },

  // ─── BATTLE START FANFARE ─────────────────────────────────────────────────
  // Ascending arpeggio C4 E4 G4 C5 sawtooth 0.4s each + bass hit at 0.8s
  playFanfare() {
    if (!this._ctx) return;
    const ctx = this._ctx;
    const notes = [261.63, 329.63, 392.00, 523.25];
    const now = ctx.currentTime;
    notes.forEach((freq, i) => {
      const t = now + i * 0.4;
      const { osc, gain } = this._makeOsc('sawtooth', freq, 0);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.22, t + 0.02);
      gain.gain.setValueAtTime(0.22, t + 0.3);
      gain.gain.linearRampToValueAtTime(0, t + 0.4);
      osc.start(t); osc.stop(t + 0.42);
    });
    const bassT = now + 0.8;
    const { osc: bOsc, gain: bGain } = this._makeOsc('triangle', 60, 0);
    bGain.gain.setValueAtTime(0, bassT);
    bGain.gain.linearRampToValueAtTime(0.5, bassT + 0.03);
    bGain.gain.exponentialRampToValueAtTime(0.0001, bassT + 0.6);
    bOsc.start(bassT); bOsc.stop(bassT + 0.65);
  },

  // ─── VICTORY MUSIC ────────────────────────────────────────────────────────
  // C5 E5 G5 C6 B5 G5 E5 C6, square wave, 5s chiptune
  playVictory() {
    if (!this._ctx) return;
    const ctx = this._ctx;
    const seq = [
      { f: 523.25, d: 0.25 }, { f: 659.25, d: 0.25 }, { f: 783.99, d: 0.25 },
      { f: 1046.50, d: 0.5  }, { f: 987.77, d: 0.25 }, { f: 783.99, d: 0.25 },
      { f: 659.25, d: 0.25 }, { f: 1046.50, d: 0.75 },
    ];
    let t = ctx.currentTime;
    seq.forEach(({ f, d }) => {
      const { osc, gain } = this._makeOsc('square', f, 0);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.18, t + 0.01);
      gain.gain.setValueAtTime(0.18, t + d * 0.7);
      gain.gain.linearRampToValueAtTime(0, t + d);
      osc.start(t); osc.stop(t + d + 0.02);
      t += d;
    });
  },

  // ─── DEFEAT MUSIC ─────────────────────────────────────────────────────────
  // G4 F4 Eb4 D4 C4, sine + tremolo, melancholy
  playDefeat() {
    if (!this._ctx) return;
    const ctx = this._ctx;
    const notes = [392.00, 349.23, 311.13, 293.66, 261.63];
    let t = ctx.currentTime;
    notes.forEach((freq) => {
      const d = 0.7;
      const { osc, gain } = this._makeOsc('sine', freq, 0);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.2, t + 0.05);
      gain.gain.setValueAtTime(0.2, t + d - 0.1);
      gain.gain.linearRampToValueAtTime(0, t + d);
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.value = 6;
      lfoGain.gain.value = 0.06;
      lfo.connect(lfoGain);
      lfoGain.connect(gain.gain);
      osc.start(t); osc.stop(t + d + 0.05);
      lfo.start(t); lfo.stop(t + d + 0.05);
      t += d;
    });
  },

  // ─── HIT SOUND (TYPE-BASED) ───────────────────────────────────────────────
  playHit(type) {
    if (!this._ctx) return;
    const ctx = this._ctx;
    const now = ctx.currentTime;
    switch ((type || '').toLowerCase()) {
      case 'republican': {
        const { osc, gain } = this._makeOsc('triangle', 80, 0);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.5, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
        osc.start(now); osc.stop(now + 0.18);
        break;
      }
      case 'democrat': {
        const { osc, gain } = this._makeOsc('sawtooth', 800, 0.18);
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.2);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.2);
        osc.start(now); osc.stop(now + 0.22);
        break;
      }
      case 'authoritarian': {
        const { osc, gain } = this._makeOsc('square', 400, 0);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.3, now + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.linearRampToValueAtTime(600, now + 0.02);
        osc.frequency.linearRampToValueAtTime(380, now + 0.08);
        osc.start(now); osc.stop(now + 0.18);
        break;
      }
      case 'green': {
        this._playNoise(0.2, 0.12, 'bandpass', 1200, 2);
        break;
      }
      case 'socialist': {
        const { osc, gain } = this._makeOsc('sawtooth', 120, 0.15);
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.linearRampToValueAtTime(280, now + 0.25);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.25);
        osc.start(now); osc.stop(now + 0.28);
        break;
      }
      case 'libertarian': {
        const { osc, gain } = this._makeOsc('sine', 1200, 0);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.25, now + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
        osc.start(now); osc.stop(now + 0.12);
        break;
      }
      case 'corporate': {
        this._playNoise(0.05, 0.3, 'highpass', 3000);
        break;
      }
      case 'revolutionary': {
        this._playNoise(0.3, 0.45, 'lowpass', 2000, 1);
        break;
      }
      case 'populist': {
        const { osc, gain } = this._makeOsc('sawtooth', 200, 0.14);
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.linearRampToValueAtTime(450, now + 0.3);
        gain.gain.setValueAtTime(0.14, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.3);
        osc.start(now); osc.stop(now + 0.32);
        break;
      }
      case 'centrist':
      default: {
        const { osc, gain } = this._makeOsc('sine', 440, 0.15);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.1);
        osc.start(now); osc.stop(now + 0.12);
        break;
      }
    }
  },

  // ─── CRITICAL HIT ─────────────────────────────────────────────────────────
  // C6 square + reverb-like decaying echoes
  playCrit() {
    if (!this._ctx) return;
    const ctx = this._ctx;
    const now = ctx.currentTime;
    [0, 0.06, 0.12, 0.20].forEach((offset, i) => {
      const vol = 0.3 / (i + 1);
      const { osc, gain } = this._makeOsc('square', 1046.50, 0);
      gain.gain.setValueAtTime(0, now + offset);
      gain.gain.linearRampToValueAtTime(vol, now + offset + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.12);
      osc.start(now + offset); osc.stop(now + offset + 0.15);
    });
  },

  // ─── KO SOUND ─────────────────────────────────────────────────────────────
  // Freq sweep 600→80hz, triangle, 1s fade out
  playKO() {
    if (!this._ctx) return;
    const ctx = this._ctx;
    const now = ctx.currentTime;
    const { osc, gain } = this._makeOsc('triangle', 600, 0.4);
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 1.0);
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.linearRampToValueAtTime(0, now + 1.0);
    osc.start(now); osc.stop(now + 1.05);
  },

  // ─── SUPER EFFECTIVE ──────────────────────────────────────────────────────
  // E5 G5 C6 rapid with simulated reverb (delayed echoes)
  playSuperEffective() {
    if (!this._ctx) return;
    const ctx = this._ctx;
    const notes = [659.25, 783.99, 1046.50];
    const now = ctx.currentTime;
    notes.forEach((freq, i) => {
      const t = now + i * 0.08;
      const { osc, gain } = this._makeOsc('sine', freq, 0);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.25, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
      osc.start(t); osc.stop(t + 0.15);
      [0.07, 0.14, 0.21].forEach((delay, j) => {
        const vol = 0.12 / (j + 1);
        const { osc: oe, gain: ge } = this._makeOsc('sine', freq, 0);
        ge.gain.setValueAtTime(0, t + delay);
        ge.gain.linearRampToValueAtTime(vol, t + delay + 0.01);
        ge.gain.exponentialRampToValueAtTime(0.0001, t + delay + 0.1);
        oe.start(t + delay); oe.stop(t + delay + 0.12);
      });
    });
  },

  // ─── NOT VERY EFFECTIVE ───────────────────────────────────────────────────
  // Low sine 120hz dull thud, 0.2s
  playNotEffective() {
    if (!this._ctx) return;
    const ctx = this._ctx;
    const now = ctx.currentTime;
    const { osc, gain } = this._makeOsc('sine', 120, 0);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
    osc.start(now); osc.stop(now + 0.22);
  },

  // ─── STATUS SOUNDS ────────────────────────────────────────────────────────
  playStatus(type) {
    if (!this._ctx) return;
    const ctx = this._ctx;
    const now = ctx.currentTime;
    switch ((type || '').toLowerCase()) {
      case 'burn': {
        for (let i = 0; i < 8; i++) {
          const t = now + Math.random() * 0.35;
          const freq = 800 + Math.random() * 2000;
          this._playNoise(0.05, 0.15 + Math.random() * 0.1, 'bandpass', freq, 3);
        }
        break;
      }
      case 'paralysis': {
        const { osc, gain } = this._makeOsc('square', 200, 0.22);
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.linearRampToValueAtTime(2000, now + 0.03);
        osc.frequency.linearRampToValueAtTime(200, now + 0.08);
        gain.gain.setValueAtTime(0.22, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
        osc.start(now); osc.stop(now + 0.12);
        break;
      }
      case 'sleep': {
        [164.81, 146.83, 130.81].forEach((freq, i) => {
          const t = now + i * 0.45;
          const { osc, gain } = this._makeOsc('sine', freq, 0);
          gain.gain.setValueAtTime(0, t);
          gain.gain.linearRampToValueAtTime(0.12, t + 0.08);
          gain.gain.setValueAtTime(0.12, t + 0.3);
          gain.gain.linearRampToValueAtTime(0, t + 0.45);
          osc.start(t); osc.stop(t + 0.48);
        });
        break;
      }
      case 'poison': {
        const { osc, gain } = this._makeOsc('sine', 300, 0.15);
        gain.gain.setValueAtTime(0.15, now); gain.gain.linearRampToValueAtTime(0, now + 0.4);
        const lfo = ctx.createOscillator(); const lfoG = ctx.createGain();
        lfo.frequency.value = 12; lfoG.gain.value = 40;
        lfo.connect(lfoG); lfoG.connect(osc.frequency);
        osc.start(now); osc.stop(now + 0.42); lfo.start(now); lfo.stop(now + 0.42);
        break;
      }
      case 'toxic': {
        const { osc, gain } = this._makeOsc('sine', 200, 0.15);
        gain.gain.setValueAtTime(0.15, now); gain.gain.linearRampToValueAtTime(0, now + 0.5);
        const lfo = ctx.createOscillator(); const lfoG = ctx.createGain();
        lfo.frequency.value = 8; lfoG.gain.value = 30;
        lfo.connect(lfoG); lfoG.connect(osc.frequency);
        osc.start(now); osc.stop(now + 0.52); lfo.start(now); lfo.stop(now + 0.52);
        break;
      }
      case 'freeze': {
        this._playNoise(0.15, 0.4, 'highpass', 4000, 1);
        break;
      }
      case 'confusion': {
        const { osc, gain } = this._makeOsc('sine', 440, 0.15);
        gain.gain.setValueAtTime(0.15, now); gain.gain.linearRampToValueAtTime(0, now + 0.4);
        osc.frequency.setValueAtTime(440, now); osc.frequency.linearRampToValueAtTime(280, now + 0.4);
        const lfo = ctx.createOscillator(); const lfoG = ctx.createGain();
        lfo.frequency.value = 18; lfoG.gain.value = 150;
        lfo.connect(lfoG); lfoG.connect(osc.frequency);
        osc.start(now); osc.stop(now + 0.42); lfo.start(now); lfo.stop(now + 0.42);
        break;
      }
      default: break;
    }
  },

  // ─── WEATHER AMBIENT LOOPS ────────────────────────────────────────────────
  startWeather(type) {
    if (!this._ctx) return;
    this.stopWeather();
    const ctx = this._ctx;
    switch ((type || '').toLowerCase()) {
      case 'rain': {
        const src = ctx.createBufferSource();
        src.buffer = this._makeNoiseBuffer(); src.loop = true;
        const filt = ctx.createBiquadFilter();
        filt.type = 'bandpass'; filt.frequency.value = 400; filt.Q.value = 0.5;
        src.connect(filt); filt.connect(this._weatherGain);
        src.start();
        this._weatherNode = src;
        break;
      }
      case 'sunny': {
        const osc = ctx.createOscillator();
        osc.type = 'sine'; osc.frequency.value = 900;
        const lfo = ctx.createOscillator(); const lfoG = ctx.createGain();
        lfo.frequency.value = 3; lfoG.gain.value = 200;
        lfo.connect(lfoG); lfoG.connect(osc.frequency);
        const g = ctx.createGain(); g.gain.value = 0.08;
        osc.connect(g); g.connect(this._weatherGain);
        osc.start(); lfo.start();
        this._weatherNode = { stop: () => { try { osc.stop(); lfo.stop(); } catch (_) {} } };
        break;
      }
      case 'sandstorm': {
        const src = ctx.createBufferSource();
        src.buffer = this._makeNoiseBuffer(); src.loop = true;
        const filt = ctx.createBiquadFilter();
        filt.type = 'lowpass'; filt.frequency.value = 1000;
        const sweep = ctx.createOscillator(); const sweepG = ctx.createGain();
        sweep.frequency.value = 0.3; sweepG.gain.value = 600;
        sweep.connect(sweepG); sweepG.connect(filt.frequency);
        src.connect(filt); filt.connect(this._weatherGain);
        src.start(); sweep.start();
        this._weatherNode = { stop: () => { try { src.stop(); sweep.stop(); } catch (_) {} } };
        break;
      }
      case 'hail': {
        let active = true;
        const scheduleHailPop = () => {
          if (!active) return;
          const delay = 0.1 + Math.random() * 0.4;
          const g = ctx.createGain();
          const buf = this._makeNoiseBuffer();
          const src = ctx.createBufferSource();
          src.buffer = buf;
          const t = ctx.currentTime + delay;
          g.gain.setValueAtTime(0, t);
          g.gain.linearRampToValueAtTime(0.5, t + 0.01);
          g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
          src.connect(g); g.connect(this._weatherGain);
          src.start(t); src.stop(t + 0.08);
          this._hailTimeout = setTimeout(scheduleHailPop, delay * 1000);
        };
        scheduleHailPop();
        this._weatherNode = {
          stop: () => { active = false; clearTimeout(this._hailTimeout); },
        };
        break;
      }
      default: break;
    }
  },

  stopWeather() {
    if (this._weatherNode) {
      try { this._weatherNode.stop(); } catch (_) {}
      this._weatherNode = null;
    }
  },

  // ─── UI SOUNDS ────────────────────────────────────────────────────────────
  playUI(type) {
    if (!this._ctx) return;
    const ctx = this._ctx;
    const now = ctx.currentTime;
    switch ((type || '').toLowerCase()) {
      case 'click': {
        const { osc, gain } = this._makeOsc('sine', 880, 0.12);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
        osc.start(now); osc.stop(now + 0.07);
        break;
      }
      case 'confirm': {
        [523.25, 659.25].forEach((freq, i) => {
          const t = now + i * 0.08;
          const { osc, gain } = this._makeOsc('sine', freq, 0);
          gain.gain.setValueAtTime(0, t);
          gain.gain.linearRampToValueAtTime(0.18, t + 0.01);
          gain.gain.setValueAtTime(0.18, t + 0.06);
          gain.gain.linearRampToValueAtTime(0, t + 0.08);
          osc.start(t); osc.stop(t + 0.1);
        });
        break;
      }
      case 'switchin': {
        const { osc, gain } = this._makeOsc('sawtooth', 300, 0.15);
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(900, now + 0.2);
        gain.gain.setValueAtTime(0.15, now); gain.gain.linearRampToValueAtTime(0, now + 0.2);
        osc.start(now); osc.stop(now + 0.22);
        break;
      }
      case 'switchout': {
        const { osc, gain } = this._makeOsc('sawtooth', 900, 0.15);
        osc.frequency.setValueAtTime(900, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.15);
        gain.gain.setValueAtTime(0.15, now); gain.gain.linearRampToValueAtTime(0, now + 0.15);
        osc.start(now); osc.stop(now + 0.17);
        break;
      }
      case 'error': {
        const { osc, gain } = this._makeOsc('square', 220, 0.2);
        const lfo = ctx.createOscillator(); const lfoG = ctx.createGain();
        lfo.frequency.value = 30; lfoG.gain.value = 0.15;
        lfo.connect(lfoG); lfoG.connect(gain.gain);
        gain.gain.setValueAtTime(0.2, now); gain.gain.linearRampToValueAtTime(0, now + 0.2);
        osc.start(now); osc.stop(now + 0.22); lfo.start(now); lfo.stop(now + 0.22);
        break;
      }
      default: break;
    }
  },

  // ─── SYNC WITH BATTLE EVENTS ──────────────────────────────────────────────
  handleEvent(battleEvent) {
    if (!battleEvent || !this._ctx) return;
    const ev = battleEvent;
    switch (ev.type) {
      case 'damage':
        this.playHit(ev.move && ev.move.tp);
        break;
      case 'crit':
        this.playCrit();
        break;
      case 'ko':
        this.playKO();
        break;
      case 'eff':
        if (ev.eff > 1) this.playSuperEffective();
        else if (ev.eff < 1) this.playNotEffective();
        break;
      case 'status':
        this.playStatus(ev.statusApplied);
        break;
      case 'weather':
        if (ev.weather) this.startWeather(ev.weather);
        else this.stopWeather();
        break;
      case 'switch':
        if (ev.switchDir === 'out') this.playUI('switchOut');
        else this.playUI('switchIn');
        break;
      default: break;
    }
  },
};
