/* Pocket Dragon — game entities: dragon, obstacle/orb field, particles, popups. */
(function () {
  'use strict';
  const PD = window.PD;
  const CFG = PD.CFG;
  const { clamp, lerp, rand, chance } = PD;
  const TAU = Math.PI * 2;

  // ---------------------------------------------------------------------------
  // Dragon
  // ---------------------------------------------------------------------------
  // Flight-model keys a dragon definition may override (defaults live in config.js).
  const FLIGHT_KEYS = [
    'gravity', 'flapKick', 'flapThrust', 'flapThrustTime', 'fallCarry', 'riseCarry', 'maxClimb', 'climbDrag',
    'glideTerminal', 'diveTerminal', 'glideTime', 'glideHold', 'apexBand', 'apexGravity',
    'pitchRefSpeed', 'pitchUp', 'pitchDown', 'pitchStiff', 'pitchDamp', 'flapPitchKick', 'flapSurge', 'speedMul',
  ];
  const DEFAULT_WINGS = { raise: 0.03, down: 0.1, recover: 0.24, beats: 1, coast: 0.38, glide: 0.52, dive: 0.86, flutter: 1, hover: 0.62 };

  /** Resolve a dragon definition into the parameter blocks the simulation reads. */
  function resolveFlight(def) {
    const F = { speedMul: 1 };
    for (const k of FLIGHT_KEYS) if (CFG[k] !== undefined) F[k] = CFG[k];
    return Object.assign(F, def && def.flight);
  }

  // Special moves, by type. Each returns true while the move is active and
  // may take over vertical motion. Add new types here; dragons opt in via data.
  const ABILITIES = {
    hover: {
      update(d, ab, dt, holding) {
        const active = holding && d.sinceFlap > ab.holdDelay && d.energy > 0 && d.thrust <= 0;
        if (active) {
          d.energy = Math.max(0, d.energy - dt / ab.duration);
          // Hang in the air with a slight drift down
          d.vy += (ab.drift - d.vy) * Math.min(1, dt * ab.grip);
          d.stamina = 1;
        } else if (!holding) {
          d.energy = Math.min(1, d.energy + dt / ab.recharge);
        }
        return active;
      },
    },
  };

  class Dragon {
    constructor(def) {
      this.circles = CFG.hitCircles.map(() => ({ x: 0, y: 0, r: 0 }));
      this.setDef(def || (PD.Dragons && PD.Dragons.list[0]));
      this.reset(0, 0, CFG.playScale);
    }

    /** Swap character: visuals, wingbeat and flight model all come from data. */
    setDef(def) {
      this.def = def || null;
      this.F = resolveFlight(def);
      this.W = Object.assign({}, DEFAULT_WINGS, def && def.wings);
      this.ability = (def && def.ability) || null;
      this.look = def && def.look;
    }

    reset(x, y, scale) {
      this.x = x; this.y = y; this.vy = 0; this.rot = 0; this.rotV = 0; this.scale = scale;
      this.baseX = x; this.surge = 0; this.surgeV = 0;
      // Flight
      this.thrust = 0;        // seconds of downstroke thrust left
      this.stamina = 1;       // glide stamina: 1 = wings fully spread, 0 = tucked dive
      this.sinceFlap = 9;
      this.flapPower = 1;     // how hard the last flap had to work (for FX/audio)
      this.energy = 1;        // ability meter (e.g. hover)
      this.hovering = false;
      // Wings: stroke time (-1 = passive), pose, fold, lagged far wing
      this.stroke = -1; this.wingT = 0.45; this.wingV = 0; this.fold = 0; this.wingLag = 0.45;
      this.tail = 0; this.tailV = 0;
      this.hoverClock = 0;
      this.squash = 0;
      this.blink = 0; this.blinkTimer = rand(1.5, 3.5);
      this.happy = 0; this.flash = 0; this.glow = 0; this.time = rand(0, 10);
      this.dead = false; this.grounded = false; this.spin = 0;
      this.tween = null;
      this._idleY = null;
    }

    get mood() {
      if (this.dead) return 'hit';
      return this.happy > 0 ? 'happy' : 'normal';
    }

    /** 1 = wings fully spread gliding, 0 = tucked dive. */
    get glide() {
      // Stays fully spread for the first part of the descent, then tucks.
      const s = Math.min(1, this.stamina / (1 - this.F.glideHold));
      return s * s * (3 - 2 * s);
    }

    /**
     * A wingbeat: an instant kick (responsiveness) followed by a short
     * downstroke of thrust (weight). Some existing momentum carries over, so
     * flapping out of a dive feels different from flapping at the apex.
     */
    flap() {
      const c = this.F;
      const before = this.vy;
      this.vy = (this.vy > 0 ? this.vy * c.fallCarry : this.vy * c.riseCarry) + c.flapKick;
      if (this.vy < -c.maxClimb) this.vy = -c.maxClimb;
      this.thrust = c.flapThrustTime;
      this.stamina = 1;
      this.sinceFlap = 0;
      this.flapPower = clamp(0.6 + before / 900, 0.4, 1.4);
      this.startStroke();
      this.squash = 1;
      this.surgeV += c.flapSurge;
      this.rotV -= c.flapPitchKick;
    }

    startStroke() {
      this.stroke = 0;
    }

    /** Seconds from the tap to the bottom of the (first) downstroke. */
    get washDelay() {
      return this.W.raise + this.W.down * 0.45;
    }

    get stroking() {
      const W = this.W;
      return this.stroke >= 0 && this.stroke < (W.raise + W.down) * W.beats;
    }

    tweenTo(x, scale, dur) {
      this.tween = { fx: this.baseX, fs: this.scale, tx: x, ts: scale, t: 0, d: dur };
    }

    _common(dt) {
      this.time += dt;
      if (this.tween) {
        const tw = this.tween;
        tw.t += dt;
        const k = PD.easeOutCubic(clamp(tw.t / tw.d, 0, 1));
        this.x = this.baseX = lerp(tw.fx, tw.tx, k);
        this.scale = lerp(tw.fs, tw.ts, k);
        if (tw.t >= tw.d) this.tween = null;
      }
      this.blinkTimer -= dt;
      if (this.blinkTimer <= 0) { this.blink = 0.13; this.blinkTimer = rand(2, 4.5); }
      this.blink = Math.max(0, this.blink - dt);
      this.happy = Math.max(0, this.happy - dt);
      this.flash = Math.max(0, this.flash - dt * 5);
      this.glow = Math.max(0, this.glow - dt * 2.2);
      this.squash = Math.max(0, this.squash - dt * 6);
    }

    /**
     * Wing pose. During a stroke we follow keyframes (quick raise, powerful
     * downstroke with the membrane fully open, folded recovery); `beats` > 1
     * chains extra, smaller flutters. Otherwise the wings settle into a pose
     * that reads the airflow: spread for gliding, swept and half-folded for a
     * dive, with a flutter that grows with speed. Hovering = rapid shimmer.
     */
    _wings(dt, airspeed) {
      const W = this.W;
      if (this.stroke >= 0) {
        this.stroke += dt;
        const s = this.stroke, beat = W.raise + W.down;
        const n = Math.floor(s / beat);
        if (n < W.beats) {
          const ls = s - n * beat;
          const top = n === 0 ? 1 : 0.78;      // follow-up flutters are shallower
          const bottom = n === W.beats - 1 ? -0.08 : 0.25;
          if (ls < W.raise) {
            // snap up, folded slightly so the upstroke slices the air
            const k = ls / W.raise;
            this.wingT = lerp(this.wingT, top, k * k);
            this.fold = lerp(this.fold, 0.35, k);
          } else {
            const k = (ls - W.raise) / W.down;
            const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
            this.wingT = lerp(top + 0.02, bottom, e);
            this.fold = Math.max(0, 0.35 * (1 - k * 3));
          }
        } else if (s < W.beats * beat + W.recover) {
          const k = (s - W.beats * beat) / W.recover;
          this.wingT = lerp(-0.08, this._passivePose(), PD.easeOutCubic(k));
          this.fold = Math.sin(k * Math.PI) * 0.45;
        } else {
          this.stroke = -1;
        }
        this.wingV = 0;
      }
      if (this.stroke < 0) {
        let target = this._passivePose(), fold = (1 - this.glide) * 0.55;
        if (this.hovering) {
          // Hummingbird-fast shallow beats
          target = 0.5 + Math.sin(this.time * 46) * 0.34;
          fold = 0;
          this.wingT = target;
          this.wingV = 0;
        } else {
          // Flutter: the membrane trembles harder the faster air rushes past.
          const flut = clamp((airspeed - 180) / 600, 0, 1);
          target += Math.sin(this.time * (30 + 22 * flut) * (0.8 + 0.2 * W.flutter)) * (0.012 + 0.05 * flut) * W.flutter;
          this.wingV += ((target - this.wingT) * 260 - this.wingV * 22) * dt;
          this.wingT += this.wingV * dt;
        }
        this.fold += (fold - this.fold) * Math.min(1, dt * 7);
      }
      // Far wing trails the near one a touch for depth.
      this.wingLag += (this.wingT - this.wingLag) * Math.min(1, dt * 30);
    }

    _passivePose() {
      const W = this.W;
      if (this.vy < -60) return W.coast;           // coasting up: wings low, swept
      return lerp(W.dive, W.glide, this.glide);   // glide spread -> dive tuck
    }

    /** Tail is a damped spring dragged by vertical velocity changes. */
    _tail(dt) {
      const target = clamp(-this.vy / 520, -1, 1);
      this.tailV += ((target - this.tail) * 90 - this.tailV * 11) * dt;
      this.tail += this.tailV * dt;
    }

    _surge(dt) {
      this.surgeV += (-this.surge * 60 - this.surgeV * 11) * dt;
      this.surge += this.surgeV * dt;
    }

    updateHover(dt, baseY) {
      this._common(dt);
      // Hovering = a rhythm of real wingbeats (tempo per dragon), the body bobbing with them.
      const period = this.W.hover;
      const prev = this.hoverClock;
      this.hoverClock = (this.hoverClock + dt) % period;
      if (this.hoverClock < prev) this.startStroke();
      const ph = this.hoverClock / period;
      // Lift right after each downstroke, sink in between.
      const bob = Math.cos((ph - 0.28) * Math.PI * 2);
      const amp = 4 + period * 6;
      this.y = baseY - bob * amp + Math.sin(this.time * 0.9) * 3;
      this.vy = bob * amp * 9;
      this.stamina = 1;
      this.hovering = false;
      this.rot += (Math.sin(this.time * 1.3) * 0.05 - this.rot) * Math.min(1, dt * 4);
      this._wings(dt, 0);
      this._tail(dt);
    }

    /** Frozen in the air (after un-pausing): hover in place. */
    updateIdle(dt) {
      if (this._idleY == null) this._idleY = this.y;
      this.updateHover(dt, this._idleY);
    }

    updateFly(dt, speed, holding) {
      this._common(dt);
      this._idleY = null;
      const c = this.F;
      this.sinceFlap += dt;

      const ab = this.ability;
      this.hovering = !!(ab && ABILITIES[ab.type] && ABILITIES[ab.type].update(this, ab, dt, !!holding));

      if (!this.hovering) {
        let g = c.gravity;
        // Downstroke thrust
        if (this.thrust > 0) {
          this.vy -= c.flapThrust * Math.min(dt, this.thrust);
          this.thrust -= dt;
          if (this.vy < -c.maxClimb) this.vy = -c.maxClimb;
        } else if (this.vy > -c.apexBand && this.vy < c.apexBand) {
          // Soft apex: lift from the spread wings briefly offsets gravity.
          const k = 1 - Math.abs(this.vy) / c.apexBand;
          g *= 1 - (1 - c.apexGravity) * k * this.glide;
        }

        // Glide stamina drains once we're descending; wings tuck into a dive.
        if (this.vy > 0) this.stamina = Math.max(0, this.stamina - dt / c.glideTime);

        // Quadratic air drag. Falling: terminal speed blends glide -> dive.
        let vy = this.vy + g * dt;
        if (vy > 0) {
          const term = lerp(c.diveTerminal, c.glideTerminal, this.glide);
          vy -= (c.gravity / (term * term)) * vy * vy * dt;
        } else {
          vy += c.climbDrag * vy * vy * dt;
        }
        this.vy = vy;
      }
      this.y += this.vy * dt;
      if (this.y < CFG.ceiling) {
        this.y = CFG.ceiling;
        if (this.vy < 0) this.vy = 0;
      }

      // Body pitch follows the flight path (velocity direction) through an
      // under-damped spring, so it leads into climbs and swings into dives.
      const vx = Math.max(speed || 0, c.pitchRefSpeed);
      const target = this.hovering ? -0.08 + Math.sin(this.time * 3) * 0.05
        : clamp(Math.atan2(this.vy, vx), c.pitchUp, c.pitchDown);
      this.rotV += ((target - this.rot) * c.pitchStiff - this.rotV * c.pitchDamp) * dt;
      this.rot += this.rotV * dt;

      this._surge(dt);
      this.x = this.baseX + this.surge;
      this._wings(dt, Math.hypot(vx, this.vy));
      this._tail(dt);
    }

    die(onGround) {
      this.dead = true;
      this.flash = 1;
      this.happy = 0;
      this.hovering = false;
      if (onGround) {
        this.grounded = true;
        this.vy = 0;
      } else {
        this.vy = -240;
        this.spin = 7;
      }
    }

    updateDead(dt, groundY) {
      this._common(dt);
      const rest = groundY - 19 * this.scale / CFG.playScale;
      if (!this.grounded) {
        this.vy = Math.min(this.vy + CFG.gravity * dt, CFG.diveTerminal * 1.1);
        this.y += this.vy * dt;
        this.rot += this.spin * dt;
        if (this.y >= rest) {
          this.y = rest;
          this.grounded = true;
          this.vy = 0;
          // Normalise so the settle doesn't unwind several turns
          this.rot = Math.atan2(Math.sin(this.rot), Math.cos(this.rot));
          return true;
        }
      } else {
        if (this.y < rest) this.y = Math.min(rest, this.y + 400 * dt);
        this.rot += (0.35 - this.rot) * Math.min(1, dt * 10);
      }
      this.wingT += (0.8 - this.wingT) * Math.min(1, dt * 6);
      return false;
    }

    /** World-space hit circles (cached objects, no allocation). */
    hitCircles() {
      const c = Math.cos(this.rot), s = Math.sin(this.rot), k = this.scale;
      for (let i = 0; i < CFG.hitCircles.length; i++) {
        const h = CFG.hitCircles[i], o = this.circles[i];
        const lx = h.x * k, ly = h.y * k;
        o.x = this.x + lx * c - ly * s;
        o.y = this.y + lx * s + ly * c;
        o.r = h.r * k;
      }
      return this.circles;
    }

    renderState(tint) {
      const sq = this.squash;
      return {
        x: this.x, y: this.y, rot: this.rot, scale: this.scale,
        sx: 1 - 0.08 * sq, sy: 1 + 0.1 * sq,
        wingT: this.wingT, wingLag: this.wingLag, fold: this.fold, tail: this.tail,
        blink: this.blink, mood: this.mood, hovering: this.hovering,
        time: this.time, tint, look: this.look,
      };
    }

    /** World position of the near wing's tip (for trails). */
    wingTip(out) {
      // Mirrors drawWing(): pivot (-4,-8), rotation lerp(0.32,-1.5,wingT), style tip scaled by fold
      const look = this.look;
      const tip = (PD.Art && PD.Art.wingTip && look) ? PD.Art.wingTip(look) : { x: -25, y: -23 };
      const a = lerp(0.32, -1.5, this.wingT);
      const fx = 1 - 0.3 * this.fold, fy = 1 - 0.42 * this.fold;
      const lx0 = tip.x * fx, ly0 = tip.y * fy;
      const ca = Math.cos(a), sa = Math.sin(a);
      const lx = -4 + lx0 * ca - ly0 * sa, ly = -8 + lx0 * sa + ly0 * ca;
      const c = Math.cos(this.rot), s = Math.sin(this.rot), k = this.scale;
      out.x = this.x + (lx * c - ly * s) * k;
      out.y = this.y + (lx * s + ly * c) * k;
      return out;
    }
  }
  Dragon.ABILITIES = ABILITIES;
  Dragon.resolveFlight = resolveFlight;
  Dragon.FLIGHT_KEYS = FLIGHT_KEYS;

  // ---------------------------------------------------------------------------
  // Obstacles + orbs
  // ---------------------------------------------------------------------------
  class Field {
    constructor() {
      this.obs = new PD.Pool(() => ({
        x: 0, w: CFG.obsW, gap: 160, gapY: 300, baseY: 300, amp: 0, phase: 0, freq: 1.5,
        type: 'tower', seed: 0, passed: false,
      }), 8);
      this.orbs = new PD.Pool(() => ({
        x: 0, y: 0, offY: 0, attach: null, phase: 0, magnet: false, dead: false,
      }), 16);
      this.rects = [0, 1, 2, 3].map(() => ({ x: 0, y: 0, w: 0, h: 0 }));
      this.reset();
    }

    reset() {
      this.obs.clear();
      this.orbs.clear();
      this.untilNext = CFG.firstSpawnDelay;
      this.lastObs = null;
      this.count = 0;
    }

    static difficulty(passed) {
      return clamp(passed / CFG.rampPasses, 0, 1);
    }

    static speedFor(passed) {
      return lerp(CFG.speedMin, CFG.speedMax, Field.difficulty(passed));
    }

    update(dt, speed, passed, W, groundY) {
      this.untilNext -= speed * dt;
      if (PD.lab && !PD.lab.obstacles) this.untilNext = Math.max(this.untilNext, 60);
      if (this.untilNext <= 0) {
        const d = Field.difficulty(passed);
        this.spawn(passed, d, W, groundY);
        this.untilNext += lerp(CFG.spacingMax, CFG.spacingMin, d) + rand(-12, 22);
      }
      const dx = speed * dt;
      this.obs.update((o) => {
        o.x -= dx;
        if (o.amp > 0) {
          o.phase += dt * o.freq;
          o.gapY = o.baseY + Math.sin(o.phase) * o.amp;
        }
        return o.x + CFG.capW > -60;
      });
      this.orbs.update((b) => {
        if (b.dead) return false;
        b.phase += dt;
        if (!b.magnet) {
          b.x -= dx;
          if (b.attach) b.y = b.attach.gapY + b.offY;
        }
        return b.x > -50;
      });
    }

    spawn(passed, d, W, groundY) {
      const o = this.obs.obtain();
      o.w = CFG.obsW;
      o.x = W + 30;
      o.gap = lerp(CFG.gapMax, CFG.gapMin, d) + rand(-6, 6);
      o.passed = false;
      o.seed = (Math.random() * 1000) | 0;

      // Type mix: introduce magical barriers once the player has warmed up
      if (passed < CFG.crystalFrom) o.type = chance(0.5) ? 'tower' : 'rock';
      else {
        const r = Math.random();
        o.type = r < 0.36 ? 'tower' : r < 0.68 ? 'rock' : 'crystal';
      }
      const moving = o.type === 'crystal' && passed >= CFG.movingFrom && chance(0.35 + 0.4 * d);
      o.amp = moving ? rand(22, 30 + 26 * d) : 0;
      o.freq = 1.3 + 0.7 * d;
      o.phase = rand(0, TAU);

      const minC = CFG.gapTopMargin + o.gap / 2 + o.amp;
      const maxC = groundY - CFG.gapBottomMargin - o.gap / 2 - o.amp;
      let c;
      const prev = this.lastObs ? this.lastObs.baseY : null;
      if (prev === null) {
        c = lerp(minC, maxC, rand(0.35, 0.6));
      } else {
        // Fairness: limit how far the gap can jump from the previous one
        const a = Math.max(minC, prev - CFG.maxRise);
        const b = Math.min(maxC, prev + CFG.maxDrop);
        c = a <= b ? rand(a, b) : clamp(prev, minC, maxC);
      }
      o.baseY = o.gapY = c;
      if (moving) o.gapY = c + Math.sin(o.phase) * o.amp;

      // Orb inside the gap
      if (chance(CFG.orbInGapChance)) {
        const b = this.orbs.obtain();
        b.x = o.x + o.w / 2;
        b.offY = rand(-o.gap * 0.2, o.gap * 0.2);
        b.attach = o;
        b.y = o.gapY + b.offY;
        b.phase = rand(0, TAU);
        b.magnet = false;
        b.dead = false;
      }
      // Orb in the open air between this pair and the previous one
      if (this.lastObs && chance(CFG.orbBetweenChance)) {
        const p = this.lastObs;
        const b = this.orbs.obtain();
        b.x = (p.x + p.w / 2 + o.x + o.w / 2) / 2;
        b.y = clamp((p.baseY + c) / 2 + rand(-40, 40), CFG.gapTopMargin + 20, groundY - 70);
        b.attach = null;
        b.phase = rand(0, TAU);
        b.magnet = false;
        b.dead = false;
      }
      this.lastObs = o;
      this.count++;
    }

    /** Collision rectangles for a pair (cached, inset for fairness). */
    rectsFor(o, groundY) {
      const capH = CFG.capH, capW = CFG.capW, ins = CFG.hitInset;
      const top = o.gapY - o.gap / 2, bot = o.gapY + o.gap / 2;
      const capX = o.x - (capW - o.w) / 2;
      const r = this.rects;
      set(r[0], o.x + ins, -400, o.w - ins * 2, top - capH + 400);
      set(r[1], capX + ins, top - capH, capW - ins * 2, capH - ins);
      set(r[2], capX + ins, bot + ins, capW - ins * 2, capH - ins);
      set(r[3], o.x + ins, bot + capH, o.w - ins * 2, groundY + 100 - bot);
      return r;
    }
  }
  function set(r, x, y, w, h) { r.x = x; r.y = y; r.w = w; r.h = h; }

  // ---------------------------------------------------------------------------
  // Particles (pooled)
  // ---------------------------------------------------------------------------
  const K = { PUFF: 0, SPARK: 1, STAR: 2, RING: 3, ARC: 4, STREAK: 5 };

  class Particles {
    constructor() {
      this.pool = new PD.Pool(() => ({
        kind: 0, x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, size: 1, grow: 0,
        color: '#fff', g: 0, drag: 0, rot: 0, vr: 0, add: false,
      }), 240);
    }

    emit(kind, x, y, o) {
      if (this.pool.active.length >= 500) return null;
      const p = this.pool.obtain();
      p.kind = kind; p.x = x; p.y = y;
      p.vx = o.vx || 0; p.vy = o.vy || 0;
      p.life = p.max = o.life || 0.6;
      p.size = o.size || 4; p.grow = o.grow || 0;
      p.color = o.color || '#fff';
      p.g = o.g || 0; p.drag = o.drag || 0;
      p.rot = o.rot || 0; p.vr = o.vr || 0;
      p.add = !!o.add;
      return p;
    }

    burst(kind, x, y, n, o) {
      for (let i = 0; i < n; i++) {
        const a = rand(0, TAU), sp = rand(o.spMin || 40, o.spMax || 160);
        this.emit(kind, x, y, {
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
          life: rand(o.lifeMin || 0.3, o.lifeMax || 0.7),
          size: rand(o.sizeMin || 2, o.sizeMax || 5),
          color: Array.isArray(o.color) ? PD.pick(o.color) : o.color,
          g: o.g || 0, drag: o.drag || 2, add: o.add, rot: rand(0, TAU), vr: rand(-6, 6), grow: o.grow || 0,
        });
      }
    }

    update(dt, scrollDx) {
      this.pool.update((p) => {
        p.life -= dt;
        if (p.life <= 0) return false;
        p.vy += p.g * dt;
        const dr = Math.max(0, 1 - p.drag * dt);
        p.vx *= dr; p.vy *= dr;
        p.x += p.vx * dt - scrollDx;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;
        p.size += p.grow * dt;
        return true;
      });
    }

    clear() { this.pool.clear(); }

    draw(g, sprites, additive) {
      const a = this.pool.active;
      g.save();
      if (additive) g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < a.length; i++) {
        const p = a[i];
        if (p.add !== additive) continue;
        const k = p.life / p.max;
        switch (p.kind) {
          case K.PUFF: {
            g.globalAlpha = k * 0.75;
            const s = p.size;
            g.drawImage(sprites.soft, p.x - s, p.y - s, s * 2, s * 2);
            break;
          }
          case K.SPARK:
            g.globalAlpha = Math.min(1, k * 1.6);
            g.fillStyle = p.color;
            g.beginPath();
            g.arc(p.x, p.y, Math.max(0.3, p.size * (0.4 + 0.6 * k)), 0, TAU);
            g.fill();
            break;
          case K.STAR:
            g.globalAlpha = Math.min(1, k * 2);
            g.fillStyle = p.color;
            g.save();
            g.translate(p.x, p.y);
            g.rotate(p.rot);
            PD.Art.star4(g, 0, 0, p.size);
            g.restore();
            break;
          case K.RING:
            g.globalAlpha = k * 0.9;
            g.strokeStyle = p.color;
            g.lineWidth = 3 * k + 0.5;
            g.beginPath();
            g.arc(p.x, p.y, p.size, 0, TAU);
            g.stroke();
            break;
          case K.ARC: {
            // Downwash crescent: the lower half of a ring, tilted with the body
            g.globalAlpha = k * 0.55;
            g.strokeStyle = p.color;
            g.lineWidth = 1 + 3.5 * k;
            g.lineCap = 'round';
            g.beginPath();
            g.ellipse(p.x, p.y, p.size * 1.25, p.size * 0.55, p.rot, 0.12 * Math.PI, 0.88 * Math.PI);
            g.stroke();
            break;
          }
          case K.STREAK: {
            const sp = Math.hypot(p.vx, p.vy) || 1;
            g.globalAlpha = k * 0.4;
            g.strokeStyle = p.color;
            g.lineWidth = 1.5;
            g.lineCap = 'round';
            g.beginPath();
            g.moveTo(p.x, p.y);
            g.lineTo(p.x - (p.vx / sp) * p.size, p.y - (p.vy / sp) * p.size);
            g.stroke();
            break;
          }
        }
      }
      g.restore();
    }
  }
  Particles.K = K;

  // ---------------------------------------------------------------------------
  // Floating "+1" texts (pooled)
  // ---------------------------------------------------------------------------
  class FloatTexts {
    constructor() {
      this.pool = new PD.Pool(() => ({ x: 0, y: 0, text: '', life: 0, max: 1, color: '#fff' }), 8);
    }
    spawn(x, y, text, color) {
      const t = this.pool.obtain();
      t.x = x; t.y = y; t.text = text; t.color = color || '#ffd166';
      t.life = t.max = 0.8;
    }
    update(dt) {
      this.pool.update((t) => {
        t.life -= dt;
        t.y -= 46 * dt;
        return t.life > 0;
      });
    }
    clear() { this.pool.clear(); }
    draw(g) {
      const a = this.pool.active;
      if (!a.length) return;
      g.save();
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.lineJoin = 'round';
      for (const t of a) {
        const age = 1 - t.life / t.max;
        const s = age < 0.2 ? PD.easeOutBack(age / 0.2) : 1;
        g.globalAlpha = Math.min(1, (t.life / t.max) * 2.5);
        g.font = `900 ${Math.round(24 * s)}px ${PD.FONT}`;
        g.strokeStyle = PD.Art.OUT;
        g.lineWidth = 6;
        g.strokeText(t.text, t.x, t.y);
        g.fillStyle = t.color;
        g.fillText(t.text, t.x, t.y);
      }
      g.restore();
    }
  }

  PD.Dragon = Dragon;
  PD.Field = Field;
  PD.Particles = Particles;
  PD.FloatTexts = FloatTexts;
})();
