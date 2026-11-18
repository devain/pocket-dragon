/* Pocket Dragon — game controller: states, fixed-step loop, input, render, UI. */
(function () {
  'use strict';
  const PD = window.PD;
  const CFG = PD.CFG;
  const { clamp, rand } = PD;
  const K = PD.Particles.K;

  const TIPS = [
    'The sky is calling. One more flight?',
    'Tip: short, rhythmic taps keep you steady.',
    'Tip: fire orbs are worth a point each!',
    'Tip: crystal gates drift. Watch their rhythm.',
    'Tip: aim for the middle of each gap.',
  ];

  class Game {
    constructor() {
      this.container = document.getElementById('game');
      this.canvas = document.getElementById('canvas');
      this.ctx = this.canvas.getContext('2d', { alpha: false });
      this.audio = new PD.AudioEngine();
      this.dragon = new PD.Dragon();
      this.field = new PD.Field();
      this.particles = new PD.Particles();
      this.texts = new PD.FloatTexts();
      this.sprites = PD.Art.buildSprites();

      this.best = PD.storage.get('pd_best', 0) | 0;
      this.score = 0;
      this.passed = 0;
      this.state = 'title';
      this.prevState = null;
      this.stateTime = 0;
      this.time = 0;
      this.scroll = 0;
      this.speed = 0;
      this.shake = 0;
      this.flashA = 0;
      this.scorePop = 0;
      this.hitstop = 0;
      this.combo = 0;
      this.comboTimer = 0;
      this.frozen = false;
      this.sparkleTimer = 0;
      this.gameOverShown = false;

      const $ = (id) => document.getElementById(id);
      this.ui = {
        title: $('screen-title'), ready: $('screen-ready'), pause: $('screen-pause'), over: $('screen-over'),
        readyText: $('ready-text'), readyHint: $('ready-hint'),
        titleBest: $('title-best'), overScore: $('over-score'), overBest: $('over-best'),
        newBest: $('new-best'), tip: $('over-tip'),
        btnPause: $('btn-pause'), btnSound: $('btn-sound'), btnResume: $('btn-resume'), btnRestart: $('btn-restart'),
        btnHome: $('btn-home'),
      };

      this.resize();
      this.bindInput();
      this.bindUI();
      this.enterTitle();
      this.updateSoundButton();

      this.last = performance.now();
      this.acc = 0;
      this.frame = this.frame.bind(this);
      requestAnimationFrame(this.frame);
    }

    // -------------------------------------------------------------------------
    // Layout
    // -------------------------------------------------------------------------
    resize() {
      const vw = window.innerWidth, vh = window.innerHeight;
      const aspect = vw / vh;
      let H = CFG.baseH;
      let W = H * aspect;
      if (W < CFG.minW) {
        W = CFG.minW;
        H = clamp(CFG.minW / aspect, CFG.baseH, CFG.maxH);
      }
      W = Math.min(W, CFG.maxW);
      const scale = Math.min(vw / W, vh / H);
      const cssW = Math.round(W * scale), cssH = Math.round(H * scale);
      this.container.style.width = cssW + 'px';
      this.container.style.height = cssH + 'px';
      // UI unit: fit both height and width so narrow phones don't overflow.
      this.container.style.setProperty('--u', Math.min(cssH / 640, cssW / 420).toFixed(4) + 'px');
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      this.canvas.width = Math.round(cssW * dpr);
      this.canvas.height = Math.round(cssH * dpr);

      const prevGround = this.groundY;
      this.W = W;
      this.H = H;
      this.pr = (cssW * dpr) / W;
      this.groundY = H - CFG.groundH;
      this.playX = clamp(W * 0.28, 96, 250);
      this.readyY = this.groundY * 0.46;
      this.bg = PD.Art.buildBackground(W, H, this.groundY, this.pr);

      // Keep the dragon sensible if the window changes mid-session
      if (prevGround !== undefined) {
        if (this.state === 'title') { this.dragon.x = W / 2; }
        else if (!this.dragon.tween) this.dragon.x = this.playX;
      }
    }

    // -------------------------------------------------------------------------
    // Input
    // -------------------------------------------------------------------------
    bindInput() {
      const unlock = () => {
        this.audio.unlock();
        if (this.audio.ctx && !this.audio.musicPlaying) this.audio.startMusic();
      };
      this.container.addEventListener('pointerdown', (e) => {
        unlock();
        if (e.target.closest('button')) return;
        if (e.button !== undefined && e.button > 0) return;
        e.preventDefault();
        this.primary();
      });
      // iOS sometimes only unlocks audio on touchend/click
      ['touchend', 'click'].forEach((ev) => window.addEventListener(ev, unlock, { passive: true }));

      window.addEventListener('keydown', (e) => {
        const k = e.code;
        if (k === 'Space' || k === 'ArrowUp' || k === 'KeyW' || k === 'Enter' || k === 'NumpadEnter') {
          e.preventDefault();
          if (e.repeat) return;
          unlock();
          this.primary();
        } else if (k === 'KeyP' || k === 'Escape') {
          e.preventDefault();
          unlock();
          if (this.state === 'paused') this.resume();
          else this.pause();
        } else if (k === 'KeyM') {
          unlock();
          this.toggleSound();
        }
      });

      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.pause();
          this.audio.suspend();
        } else {
          this.audio.resume();
          this.last = performance.now();
        }
      });
      window.addEventListener('blur', () => this.pause());
      window.addEventListener('resize', () => this.resize());
      window.addEventListener('orientationchange', () => setTimeout(() => this.resize(), 120));
      this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    bindUI() {
      const on = (btn, fn) => btn.addEventListener('click', (e) => {
        e.stopPropagation();
        btn.blur();
        this.audio.unlock();
        fn();
      });
      on(this.ui.btnPause, () => this.pause());
      on(this.ui.btnResume, () => this.resume());
      on(this.ui.btnSound, () => this.toggleSound());
      on(this.ui.btnRestart, () => this.restart());
      on(this.ui.btnHome, () => { this.audio.click(); this.enterTitle(); });
      // Buttons should never keep keyboard focus (Space would re-click them)
      document.querySelectorAll('button').forEach((b) => b.addEventListener('pointerdown', (e) => e.preventDefault()));
    }

    /** Tap / click / Space. */
    primary() {
      switch (this.state) {
        case 'title': this.startFromTitle(); break;
        case 'ready': this.beginPlaying(); break;
        case 'playing':
          if (this.frozen) { this.frozen = false; this.showScreen(null); }
          this.flap();
          break;
        case 'gameover':
          if (this.stateTime > CFG.restartGuard) this.restart();
          break;
        default: break; // paused / dying ignore taps
      }
    }

    flap() {
      this.dragon.flap();
      this.audio.flap();
      const d = this.dragon;
      for (let i = 0; i < 3; i++) {
        this.particles.emit(K.PUFF, d.x - 14 + rand(-4, 4), d.y + 8 + rand(-3, 3), {
          vx: rand(-90, -40), vy: rand(30, 80), life: rand(0.3, 0.45), size: rand(5, 8), grow: 14, drag: 3,
        });
      }
    }

    toggleSound() {
      this.audio.setMuted(!this.audio.muted);
      this.updateSoundButton();
      if (!this.audio.muted) this.audio.click();
    }

    updateSoundButton() {
      const m = this.audio.muted;
      this.ui.btnSound.classList.toggle('muted', m);
      this.ui.btnSound.setAttribute('aria-label', m ? 'Unmute sound' : 'Mute sound');
      this.ui.btnSound.title = m ? 'Unmute (M)' : 'Mute (M)';
    }

    // -------------------------------------------------------------------------
    // State transitions
    // -------------------------------------------------------------------------
    setState(s) {
      this.state = s;
      this.stateTime = 0;
      this.container.dataset.state = s;
    }

    showScreen(name) {
      for (const n of ['title', 'ready', 'pause', 'over']) this.ui[n].classList.toggle('show', n === name);
    }

    enterTitle() {
      this.resetRun();
      this.setState('title');
      this.dragon.reset(this.W / 2, this.groundY * 0.52, CFG.titleScale);
      this.ui.titleBest.textContent = this.best;
      this.showScreen('title');
      this.audio.setMusicLevel(0.5);
    }

    resetRun() {
      this.score = 0;
      this.passed = 0;
      this.combo = 0;
      this.comboTimer = 0;
      this.frozen = false;
      this.hitstop = 0;
      this.shake = 0;
      this.flashA = 0;
      this.gameOverShown = false;
      this.field.reset();
      this.particles.clear();
      this.texts.clear();
    }

    startFromTitle() {
      this.resetRun();
      this.dragon.tweenTo(this.playX, CFG.playScale, 0.45);
      this.audio.click();
      this.showScreen(null);
      this.setState('playing');
      this.flap();
    }

    restart() {
      this.resetRun();
      this.dragon.reset(this.playX, this.readyY, CFG.playScale);
      this.ui.readyText.textContent = 'Get Ready!';
      this.ui.readyHint.textContent = 'Tap, click or press Space to fly';
      this.showScreen('ready');
      this.setState('ready');
      this.audio.setMusicLevel(0.5);
      this.audio.click();
    }

    beginPlaying() {
      this.showScreen(null);
      this.setState('playing');
      this.flap();
    }

    pause() {
      if (this.state !== 'playing' && this.state !== 'ready') return;
      this.prevState = this.state;
      this.setState('paused');
      this.showScreen('pause');
      this.audio.setMusicLevel(0.15);
    }

    resume() {
      if (this.state !== 'paused') return;
      this.audio.click();
      this.audio.setMusicLevel(0.5);
      const prev = this.prevState;
      this.setState(prev);
      if (prev === 'playing') {
        // Never resume straight into a fall: wait for the next tap.
        this.frozen = true;
        this.ui.readyText.textContent = 'Paused';
        this.ui.readyHint.textContent = 'Tap to continue';
        this.showScreen('ready');
      } else {
        this.showScreen('ready');
      }
      this.last = performance.now();
    }

    die(onGround) {
      if (this.state !== 'playing') return;
      this.setState('dying');
      const d = this.dragon;
      d.die(onGround);
      this.hitstop = CFG.hitStop;
      this.shake = CFG.shake;
      this.flashA = 0.85;
      this.audio.hit();
      this.audio.setMusicLevel(0.2);
      try { if (navigator.vibrate) navigator.vibrate(60); } catch (e) { /* ignore */ }
      this.particles.burst(K.STAR, d.x + 8, d.y - 6, 7, {
        color: ['#ffe066', '#fff4b8', '#ffffff'], spMin: 90, spMax: 230, sizeMin: 5, sizeMax: 9, lifeMin: 0.4, lifeMax: 0.8, drag: 3,
      });
      this.particles.burst(K.SPARK, d.x + 8, d.y, 12, {
        color: ['#ffffff', '#ffd166'], spMin: 60, spMax: 260, sizeMin: 2, sizeMax: 4, add: true, drag: 3,
      });
    }

    enterGameOver() {
      this.setState('gameover');
      const newBest = this.score > this.best;
      if (newBest) {
        this.best = this.score;
        PD.storage.set('pd_best', this.best);
      }
      this.ui.overScore.textContent = this.score;
      this.ui.overBest.textContent = this.best;
      this.ui.newBest.classList.toggle('show', newBest && this.score > 0);
      let tip;
      if (newBest && this.score > 0) tip = 'A new legend takes flight!';
      else if (this.best - this.score <= 3 && this.best > 0) tip = `So close! ${this.best - this.score + 1} more to beat your best.`;
      else tip = PD.pick(TIPS);
      this.ui.tip.textContent = tip;
      this.showScreen('over');
      this.audio.gameOver();
    }

    // -------------------------------------------------------------------------
    // Simulation
    // -------------------------------------------------------------------------
    frame(now) {
      requestAnimationFrame(this.frame);
      let dt = (now - this.last) / 1000;
      this.last = now;
      if (!(dt > 0)) dt = 0;
      if (dt > 0.1) dt = 0.1;
      this.acc += dt;
      const step = CFG.step;
      while (this.acc >= step) {
        this.update(step);
        this.acc -= step;
      }
      this.render();
    }

    update(dt) {
      if (this.state === 'paused') return;
      this.time += dt;
      this.stateTime += dt;
      this.flashA = Math.max(0, this.flashA - dt * 4);
      this.shake *= Math.exp(-dt * 9);
      if (this.shake < 0.2) this.shake = 0;
      if (this.hitstop > 0) { this.hitstop -= dt; return; }

      const s = this.state;
      const d = this.dragon;
      let speed = 0;
      if (s === 'title') speed = 70;
      else if (s === 'ready') speed = 90;
      else if (s === 'playing' && !this.frozen) speed = PD.Field.speedFor(this.passed);
      this.speed = speed;
      this.scroll += speed * dt;

      switch (s) {
        case 'title':
          d.updateHover(dt, this.groundY * 0.52);
          this.ambientSparkles(dt);
          break;
        case 'ready':
          d.updateHover(dt, this.readyY);
          break;
        case 'playing':
          if (this.frozen) { d.updateIdle(dt); break; }
          d.updateFly(dt);
          this.field.update(dt, speed, this.passed, this.W, this.groundY);
          this.collectOrbs(dt);
          this.checkCollisions();
          break;
        case 'dying':
          d.updateDead(dt, this.groundY);
          if (d.grounded && this.stateTime > 0.6) this.enterGameOver();
          break;
        case 'gameover':
          d.updateDead(dt, this.groundY);
          break;
      }

      this.comboTimer = Math.max(0, this.comboTimer - dt);
      this.scorePop = Math.max(0, this.scorePop - dt * 4);
      this.particles.update(dt, speed * dt * 0.6);
      this.texts.update(dt);
    }

    ambientSparkles(dt) {
      this.sparkleTimer -= dt;
      if (this.sparkleTimer > 0) return;
      this.sparkleTimer = 0.18;
      const d = this.dragon;
      const a = rand(0, Math.PI * 2), r = rand(50, 95);
      this.particles.emit(K.STAR, d.x + Math.cos(a) * r, d.y + Math.sin(a) * r * 0.7, {
        vy: rand(-30, -10), life: rand(0.6, 1.1), size: rand(2.5, 4.5), color: PD.pick(['#fff6c8', '#ffd166', '#bffaff']), vr: rand(-2, 2),
      });
    }

    checkCollisions() {
      const d = this.dragon;
      const circles = d.hitCircles();
      for (const c of circles) {
        if (c.y + c.r >= this.groundY) { this.die(true); return; }
      }
      const obs = this.field.obs.active;
      for (let i = 0; i < obs.length; i++) {
        const o = obs[i];
        if (!o.passed && o.x + o.w / 2 < d.x) {
          o.passed = true;
          this.passed++;
          this.addScore(1);
          this.audio.pass();
        }
        if (Math.abs(o.x + o.w / 2 - d.x) > 110) continue;
        const rects = this.field.rectsFor(o, this.groundY);
        for (const r of rects) {
          for (const c of circles) {
            if (PD.circleRect(c.x, c.y, c.r, r.x, r.y, r.w, r.h)) { this.die(false); return; }
          }
        }
      }
    }

    collectOrbs(dt) {
      const d = this.dragon;
      const cx = d.x + 6 * d.scale, cy = d.y - 3 * d.scale;
      const orbs = this.field.orbs.active;
      for (let i = 0; i < orbs.length; i++) {
        const b = orbs[i];
        if (b.dead) continue;
        const dx = cx - b.x, dy = cy - b.y;
        const dist = Math.hypot(dx, dy);
        if (dist < CFG.orbMagnetR) {
          b.magnet = true;
          b.attach = null;
          const k = Math.min(1, dt * 14);
          b.x += dx * k;
          b.y += dy * k;
        }
        if (dist < CFG.orbCollectR) {
          b.dead = true;
          this.combo = this.comboTimer > 0 ? this.combo + 1 : 0;
          this.comboTimer = CFG.comboWindow;
          this.addScore(1);
          this.audio.collect(this.combo);
          d.happy = 0.5;
          d.glow = 1;
          this.particles.burst(K.SPARK, b.x, b.y, 16, {
            color: ['#fff2b0', '#ffb347', '#ff7a3d', '#ffffff'], spMin: 80, spMax: 260, sizeMin: 2, sizeMax: 4.5, add: true, drag: 4,
          });
          this.particles.emit(K.RING, b.x, b.y, { size: 10, grow: 140, life: 0.35, color: '#ffd166', add: true });
          this.texts.spawn(b.x, b.y - 22, this.combo > 0 ? `+1 x${this.combo + 1}` : '+1');
        }
      }
    }

    addScore(n) {
      this.score += n;
      this.scorePop = 1;
    }

    // -------------------------------------------------------------------------
    // Rendering
    // -------------------------------------------------------------------------
    drawTiled(g, layer, offset) {
      const T = layer.tileW;
      let x = -(((offset % T) + T) % T);
      x = Math.round(x * this.pr) / this.pr;
      // Overlap by one device pixel so tile joins never show a hairline seam.
      const ov = 1 / this.pr;
      for (; x < this.W; x += T) g.drawImage(layer.canvas, x - ov, layer.y, T + ov * 2, layer.h);
    }

    render() {
      const g = this.ctx;
      const W = this.W, H = this.H;
      g.setTransform(this.pr, 0, 0, this.pr, 0, 0);
      g.imageSmoothingEnabled = true;
      g.drawImage(this.bg.sky, 0, 0, W, H);

      g.save();
      if (this.shake > 0) g.translate(rand(-1, 1) * this.shake, rand(-1, 1) * this.shake);

      for (const L of this.bg.layers) this.drawTiled(g, L, this.scroll * L.f + this.time * L.drift);

      const t = this.time;
      for (const o of this.field.obs.active) PD.Art.drawObstacle(g, o, this.groundY, t, this.sprites);
      for (const b of this.field.orbs.active) {
        if (!b.dead) PD.Art.drawOrb(g, b.x, b.y + Math.sin(b.phase * 3) * 4, t + b.phase, 1, this.sprites);
      }

      this.particles.draw(g, this.sprites, false);

      // Dragon (+ collect glow, + hit flash)
      const d = this.dragon;
      if (d.glow > 0) {
        g.save();
        g.globalCompositeOperation = 'lighter';
        g.globalAlpha = d.glow * 0.8;
        const R = 70 * d.scale;
        g.drawImage(this.sprites.fireGlow, d.x - R, d.y - R, R * 2, R * 2);
        g.restore();
      }
      PD.Art.drawDragon(g, d.renderState(false));
      if (d.flash > 0) {
        g.save();
        g.globalAlpha = d.flash;
        PD.Art.drawDragon(g, d.renderState(true));
        g.restore();
      }

      this.particles.draw(g, this.sprites, true);
      this.drawTiled(g, this.bg.ground, this.scroll);
      this.texts.draw(g);
      g.restore();

      this.drawHUD(g);

      if (this.flashA > 0) {
        g.fillStyle = `rgba(255,255,255,${(this.flashA * 0.55).toFixed(3)})`;
        g.fillRect(0, 0, W, H);
      }
    }

    drawHUD(g) {
      const s = this.state;
      const showScore = s === 'playing' || s === 'dying' || s === 'paused' || (s === 'ready');
      if (!showScore) return;
      g.save();
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.lineJoin = 'round';
      const x = this.W / 2, y = 64;
      const pop = 1 + this.scorePop * 0.25;
      g.translate(x, y);
      g.scale(pop, pop);
      g.font = `900 56px ${PD.FONT}`;
      g.strokeStyle = PD.Art.OUT;
      g.lineWidth = 10;
      g.strokeText(String(this.score), 0, 4);
      g.fillStyle = '#ffffff';
      g.fillText(String(this.score), 0, 0);
      g.restore();

      g.save();
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.lineJoin = 'round';
      g.font = `800 17px ${PD.FONT}`;
      g.strokeStyle = PD.Art.OUT;
      g.lineWidth = 5;
      const label = `BEST ${Math.max(this.best, this.score)}`;
      g.strokeText(label, x, y + 44);
      g.fillStyle = '#ffd166';
      g.fillText(label, x, y + 44);
      g.restore();
    }
  }

  PD.Game = Game;
})();
