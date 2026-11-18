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
  class Dragon {
    constructor() {
      this.circles = CFG.hitCircles.map(() => ({ x: 0, y: 0, r: 0 }));
      this.reset(0, 0, CFG.playScale);
    }

    reset(x, y, scale) {
      this.x = x; this.y = y; this.vy = 0; this.rot = 0; this.scale = scale;
      this.wingPhase = 0; this.wingT = 0.4; this.flapBoost = 0; this.squash = 0;
      this.blink = 0; this.blinkTimer = rand(1.5, 3.5);
      this.happy = 0; this.flash = 0; this.glow = 0; this.time = 0;
      this.dead = false; this.grounded = false; this.spin = 0;
      this.tween = null;
    }

    get mood() {
      if (this.dead) return 'hit';
      return this.happy > 0 ? 'happy' : 'normal';
    }

    flap() {
      this.vy = CFG.flapVelocity;
      this.flapBoost = 1;
      this.wingPhase = 0;
      this.squash = 1;
    }

    tweenTo(x, scale, dur) {
      this.tween = { fx: this.x, fs: this.scale, tx: x, ts: scale, t: 0, d: dur };
    }

    _common(dt) {
      this.time += dt;
      if (this.tween) {
        const tw = this.tween;
        tw.t += dt;
        const k = PD.easeOutCubic(clamp(tw.t / tw.d, 0, 1));
        this.x = lerp(tw.fx, tw.tx, k);
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

    _wings(dt, speed) {
      this.wingPhase += dt * (speed + this.flapBoost * 34);
      this.flapBoost = Math.max(0, this.flapBoost - dt * 4);
      this.wingT = 0.5 - 0.5 * Math.cos(this.wingPhase);
    }

    updateHover(dt, baseY) {
      this._common(dt);
      this.y = baseY + Math.sin(this.time * 2.6) * 9;
      this.vy = 0;
      this.rot = Math.sin(this.time * 2.6 + 1.2) * 0.06;
      this._wings(dt, 9);
    }

    /** Frozen in the air (after un-pausing): animate only. */
    updateIdle(dt) {
      this._common(dt);
      this._wings(dt, 9);
    }

    updateFly(dt) {
      this._common(dt);
      this.vy = Math.min(this.vy + CFG.gravity * dt, CFG.maxFall);
      this.y += this.vy * dt;
      if (this.y < CFG.ceiling) {
        this.y = CFG.ceiling;
        if (this.vy < 0) this.vy = 0;
      }
      const target = clamp(-0.42 + (this.vy - CFG.flapVelocity) / 1150 * 1.4, -0.42, 0.95);
      this.rot += (target - this.rot) * Math.min(1, dt * (this.vy < 0 ? 16 : 5.5));
      this._wings(dt, this.vy > 250 ? 16 : 12);
    }

    die(onGround) {
      this.dead = true;
      this.flash = 1;
      this.happy = 0;
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
        this.vy = Math.min(this.vy + CFG.gravity * dt, CFG.maxFall * 1.2);
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
        wingT: this.wingT, blink: this.blink, mood: this.mood,
        time: this.time, tint,
      };
    }
  }

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
  const K = { PUFF: 0, SPARK: 1, STAR: 2, RING: 3 };

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
