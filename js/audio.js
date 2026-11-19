/* Pocket Dragon — procedural audio (Web Audio API).
 * Every sound and the music loop are synthesised at runtime, so there are no
 * audio files to load and no licensing questions. */
(function () {
  'use strict';
  const PD = window.PD;

  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

  // --- Music data: F major, gentle "music box over strings" feel -------------
  const BPM = 104;
  const BEAT = 60 / BPM;
  const EIGHTH = BEAT / 2;
  const CHORDS = [
    { root: 41, notes: [53, 57, 60, 64] }, // Fmaj7
    { root: 36, notes: [52, 55, 60, 62] }, // Cadd9
    { root: 38, notes: [50, 53, 57, 60] }, // Dm7
    { root: 34, notes: [50, 53, 57, 58] }, // Bbmaj7 (voiced high)
  ];
  // [beat, midi, lengthInBeats] per bar, 8 bars
  const MELODY = [
    [[0, 81, 1], [1, 79, 0.5], [1.5, 77, 0.5], [2, 72, 1.5]],
    [[0, 76, 1], [1, 79, 1], [2, 84, 2]],
    [[0, 81, 1.5], [1.5, 79, 0.5], [2, 77, 1], [3, 74, 1]],
    [[0, 77, 2.5], [3, 74, 0.5], [3.5, 76, 0.5]],
    [[0, 77, 0.5], [0.5, 81, 0.5], [1, 84, 1], [2, 86, 1], [3, 84, 1]],
    [[0, 79, 2], [2, 76, 1], [3, 79, 1]],
    [[0, 77, 1], [1, 81, 1], [2, 79, 1], [3, 74, 1]],
    [[0, 74, 2], [2, 77, 2]],
  ];
  const ARP = [0, 1, 2, 3, 2, 1, 2, 3];

  class AudioEngine {
    constructor() {
      this.ctx = null;
      this.muted = !!PD.storage.get('pd_muted', false);
      this.musicPlaying = false;
      this.musicLevel = 0.5;
      this.step = 0;
      this.nextTime = 0;
      this.timer = null;
    }

    /** Must be called from a user gesture at least once (autoplay policy). */
    unlock() {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return false;
        const ctx = (this.ctx = new AC());
        this.master = ctx.createGain();
        this.master.gain.value = this.muted ? 0 : 0.85;
        const comp = ctx.createDynamicsCompressor();
        comp.threshold.value = -14;
        comp.ratio.value = 4;
        this.master.connect(comp);
        comp.connect(ctx.destination);

        this.sfx = ctx.createGain();
        this.sfx.gain.value = 0.9;
        this.sfx.connect(this.master);

        this.musicBus = ctx.createGain();
        this.musicBus.gain.value = 0;
        this.musicBus.connect(this.master);

        // Soft echo for the melody/arp: delay -> lowpass -> feedback
        this.echo = ctx.createDelay(1);
        this.echo.delayTime.value = EIGHTH * 3;
        const fb = ctx.createGain();
        fb.gain.value = 0.32;
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 2400;
        this.echo.connect(lp);
        lp.connect(fb);
        fb.connect(this.echo);
        lp.connect(this.musicBus);

        const len = ctx.sampleRate;
        this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
        const data = this.noiseBuf.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

        // Wind bed: looped noise -> bandpass -> gain, driven by airspeed.
        const wind = ctx.createBufferSource();
        wind.buffer = this.noiseBuf;
        wind.loop = true;
        this.windFilter = ctx.createBiquadFilter();
        this.windFilter.type = 'bandpass';
        this.windFilter.frequency.value = 500;
        this.windFilter.Q.value = 0.8;
        this.windGain = ctx.createGain();
        this.windGain.gain.value = 0;
        wind.connect(this.windFilter);
        this.windFilter.connect(this.windGain);
        this.windGain.connect(this.sfx);
        wind.start();
        this._wind = -1;
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return true;
    }

    get ready() {
      return !!this.ctx && this.ctx.state === 'running';
    }

    setMuted(m) {
      this.muted = m;
      PD.storage.set('pd_muted', m);
      if (this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 0.85, this.ctx.currentTime, 0.03);
    }

    suspend() {
      if (this.ctx && this.ctx.state === 'running') this.ctx.suspend();
    }
    resume() {
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    }

    // --- Primitives ----------------------------------------------------------
    tone(freq, t, dur, o) {
      o = o || {};
      const ctx = this.ctx;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = o.type || 'sine';
      osc.frequency.setValueAtTime(freq, t);
      if (o.slideTo) osc.frequency.exponentialRampToValueAtTime(o.slideTo, t + (o.slideTime || dur));
      if (o.detune) osc.detune.value = o.detune;
      const vol = o.vol == null ? 0.2 : o.vol;
      const atk = o.attack || 0.005;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(vol, t + atk);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(g);
      g.connect(o.dest || this.sfx);
      if (o.send) g.connect(o.send);
      osc.start(t);
      osc.stop(t + dur + 0.05);
    }

    noise(t, dur, o) {
      o = o || {};
      const ctx = this.ctx;
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuf;
      const f = ctx.createBiquadFilter();
      f.type = o.filter || 'bandpass';
      f.frequency.setValueAtTime(o.freq || 1000, t);
      if (o.freqTo) f.frequency.exponentialRampToValueAtTime(o.freqTo, t + dur);
      f.Q.value = o.q || 1;
      const g = ctx.createGain();
      const vol = o.vol == null ? 0.2 : o.vol;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(vol, t + (o.attack || 0.004));
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(f);
      f.connect(g);
      g.connect(o.dest || this.sfx);
      src.start(t, Math.random() * 0.5);
      src.stop(t + dur + 0.05);
    }

    // --- Sound effects ---------------------------------------------------------
    /** power ~0.4 (lazy beat at the apex) .. 1.4 (hauling out of a dive). */
    flap(power) {
      if (!this.ready) return;
      const pw = power == null ? 1 : power;
      const t = this.ctx.currentTime;
      const p = PD.rand(0.93, 1.07);
      // Leathery whoosh on the downstroke, a soft body thump under it.
      this.noise(t + 0.02, 0.16, { filter: 'bandpass', freq: (1500 - 300 * pw) * p, freqTo: 320, q: 1.1, vol: 0.2 + 0.12 * pw, attack: 0.02 });
      this.tone((230 - 40 * pw) * p, t + 0.025, 0.1, { type: 'sine', slideTo: 105, vol: 0.1 + 0.07 * pw, attack: 0.01 });
    }

    /** level 0..1 loudness, bright 0..1 pitch of the rushing air. */
    setWind(level, bright) {
      if (!this.windGain) return;
      const q = Math.round(level * 40) + Math.round(bright * 10) * 100;
      if (q === this._wind) return; // avoid flooding automation events
      this._wind = q;
      const t = this.ctx.currentTime;
      this.windGain.gain.setTargetAtTime(level * 0.16, t, 0.12);
      this.windFilter.frequency.setTargetAtTime(380 + 1100 * bright + 300 * level, t, 0.15);
    }

    collect(combo) {
      if (!this.ready) return;
      const t = this.ctx.currentTime;
      const base = 76 + Math.min(combo, 6) * 2;
      [0, 4, 7, 12].forEach((s, i) => {
        this.tone(mtof(base + s), t + i * 0.045, 0.28, { type: 'triangle', vol: 0.13 });
        this.tone(mtof(base + s + 12), t + i * 0.045, 0.18, { type: 'sine', vol: 0.05 });
      });
      this.noise(t, 0.25, { filter: 'highpass', freq: 5000, vol: 0.05 });
    }

    pass() {
      if (!this.ready) return;
      const t = this.ctx.currentTime;
      this.tone(mtof(91), t, 0.12, { type: 'sine', vol: 0.05 });
      this.tone(mtof(96), t + 0.05, 0.14, { type: 'sine', vol: 0.04 });
    }

    hit() {
      if (!this.ready) return;
      const t = this.ctx.currentTime;
      this.noise(t, 0.32, { filter: 'lowpass', freq: 2600, freqTo: 180, q: 0.8, vol: 0.55 });
      this.tone(95, t, 0.35, { type: 'sine', slideTo: 38, vol: 0.55 });
      this.tone(180, t, 0.22, { type: 'square', slideTo: 60, vol: 0.09 });
    }

    gameOver() {
      if (!this.ready) return;
      const t = this.ctx.currentTime;
      [76, 72, 69, 65].forEach((m, i) => {
        const last = i === 3;
        this.tone(mtof(m), t + i * 0.15, last ? 0.8 : 0.28, { type: 'triangle', vol: 0.12 });
        this.tone(mtof(m - 12), t + i * 0.15, last ? 0.8 : 0.28, { type: 'sine', vol: 0.06 });
      });
    }

    click() {
      if (!this.ready) return;
      const t = this.ctx.currentTime;
      this.tone(660, t, 0.08, { type: 'sine', slideTo: 990, vol: 0.09 });
    }

    // --- Music -----------------------------------------------------------------
    startMusic() {
      if (!this.ctx || this.musicPlaying) return;
      this.musicPlaying = true;
      this.step = 0;
      this.nextTime = this.ctx.currentTime + 0.1;
      this.setMusicLevel(this.musicLevel, 1.2);
      this.timer = setInterval(() => this._schedule(), 30);
    }

    setMusicLevel(level, time) {
      this.musicLevel = level;
      if (this.ctx) this.musicBus.gain.setTargetAtTime(level, this.ctx.currentTime, (time || 0.4) / 3);
    }

    _schedule() {
      const ctx = this.ctx;
      if (!ctx || ctx.state !== 'running') return;
      if (this.nextTime < ctx.currentTime - 0.2) this.nextTime = ctx.currentTime + 0.05;
      while (this.nextTime < ctx.currentTime + 0.15) {
        this._playStep(this.step, this.nextTime);
        this.nextTime += EIGHTH;
        this.step = (this.step + 1) % 64;
      }
    }

    _playStep(step, t) {
      const bar = step >> 3;
      const within = step & 7;
      const chord = CHORDS[bar % 4];
      const bus = this.musicBus;

      if (within === 0) {
        // Pad
        for (const n of chord.notes) {
          this.tone(mtof(n), t, BEAT * 4.3, { type: 'sine', vol: 0.03, attack: 0.5, dest: bus });
          this.tone(mtof(n), t, BEAT * 4.0, { type: 'triangle', vol: 0.012, attack: 0.6, detune: 7, dest: bus });
        }
      }
      if (within === 0 || within === 4) {
        this.tone(mtof(chord.root), t, BEAT * 1.9, { type: 'sine', vol: 0.14, attack: 0.02, dest: bus });
        this.tone(mtof(chord.root + 12), t, BEAT * 1.2, { type: 'triangle', vol: 0.035, attack: 0.02, dest: bus });
      }
      // Music-box arpeggio
      const an = chord.notes[ARP[within]] + 12;
      this.tone(mtof(an), t, 0.35, { type: 'triangle', vol: within % 2 ? 0.012 : 0.02, dest: bus, send: this.echo });
      // Shaker on the off-beats
      if (within % 2 === 1) this.noise(t, 0.05, { filter: 'highpass', freq: 7000, vol: 0.018, dest: bus });

      // Melody
      for (const ev of MELODY[bar]) {
        if (ev[0] * 2 === within) {
          const d = ev[2] * BEAT * 0.95;
          this.tone(mtof(ev[1]), t, d, { type: 'triangle', vol: 0.055, attack: 0.012, dest: bus, send: this.echo });
          this.tone(mtof(ev[1] + 12), t, Math.min(d, 0.3), { type: 'sine', vol: 0.015, dest: bus });
        }
      }
    }
  }

  PD.AudioEngine = AudioEngine;
})();
