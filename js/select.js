/* Pocket Dragon — dragon selection screen.
 * Cards are generated from the roster; each has a live canvas preview that
 * runs the real Dragon simulation (its own wingbeat tempo and style). */
(function () {
  'use strict';
  const PD = window.PD;

  const STAT_LABELS = [['lift', 'Lift'], ['glide', 'Glide'], ['speed', 'Speed'], ['control', 'Control']];
  const LOCK_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10V8a5 5 0 0 1 10 0v2h1.2c.9 0 1.6.7 1.6 1.6v8c0 .9-.7 1.6-1.6 1.6H5.8c-.9 0-1.6-.7-1.6-1.6v-8c0-.9.7-1.6 1.6-1.6zm2.6 0h4.8V8a2.4 2.4 0 0 0-4.8 0z"/></svg>';

  class DragonSelect {
    constructor(game) {
      this.game = game;
      this.root = document.getElementById('screen-select');
      this.wrap = document.getElementById('select-wrap');
      this.grid = document.getElementById('dragon-cards');
      this.cards = PD.Dragons.list.map((def, i) => this._card(def, i));
      this.visible = false;
    }

    _card(def, i) {
      const el = document.createElement('button');
      el.className = 'card';
      el.type = 'button';
      el.setAttribute('role', 'radio');
      el.style.setProperty('--accent', def.look.palette.body);
      el.style.setProperty('--i', i);
      const stats = STAT_LABELS.map(([k, label]) =>
        `<li><span>${label}</span><span class="pips">${[1, 2, 3, 4, 5].map((n) => `<i class="${n <= def.stats[k] ? 'on' : ''}"></i>`).join('')}</span></li>`).join('');
      el.innerHTML = `
        <span class="card-badge">Selected</span>
        <span class="card-stage"><canvas></canvas><span class="card-lock">${LOCK_SVG}<span class="lock-text"></span></span></span>
        <span class="card-name">${def.name}</span>
        <span class="card-tag">${def.tagline}</span>
        <span class="card-blurb">${def.blurb}</span>
        <ul class="card-stats">${stats}</ul>
        <span class="card-foot">${def.ability ? `<span class="chip">✦ ${def.ability.label}</span>` : ''}<span class="chip best"></span></span>`;
      el.setAttribute('aria-label', `${def.name}: ${def.tagline}`);
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        this.choose(def);
      });
      el.addEventListener('pointerdown', (e) => e.preventDefault());
      this.grid.appendChild(el);
      const canvas = el.querySelector('canvas');
      const dragon = new PD.Dragon(def);
      dragon.reset(0, 0, 1);
      return { def, el, canvas, ctx: canvas.getContext('2d'), dragon, best: el.querySelector('.chip.best'), lock: el.querySelector('.lock-text') };
    }

    open() {
      this.visible = true;
      const stats = PD.Unlocks.stats();
      const cur = this.game.def;
      for (const c of this.cards) {
        const unlocked = PD.Unlocks.isUnlocked(c.def, stats);
        c.el.classList.toggle('locked', !unlocked);
        c.lock.textContent = unlocked ? '' : PD.Unlocks.requirement(c.def);
        const b = PD.Dragons.bestFor(c.def.id);
        c.best.textContent = `Best ${b}`;
        c.best.style.display = unlocked ? '' : 'none';
      }
      this.mark(cur);
      this.layout();
    }

    close() { this.visible = false; }

    /** Pick a column count for the screen shape, then shrink-to-fit if needed. */
    layout() {
      const g = this.game;
      const u = parseFloat(getComputedStyle(g.container).getPropertyValue('--u')) || 1;
      const Wu = g.container.clientWidth / u, Hu = g.container.clientHeight / u;
      const four = Wu >= 4 * 186 + 3 * 12 + 30;
      this.grid.style.setProperty('--cols', four ? 4 : 2);
      this.grid.style.setProperty('--card-w', four ? 186 : Math.min(200, (Wu - 12 - 30) / 2));
      this.wrap.style.transform = '';
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      for (const c of this.cards) {
        const r = c.canvas.getBoundingClientRect();
        c.w = r.width; c.h = r.height;
        c.canvas.width = Math.max(1, Math.round(r.width * dpr));
        c.canvas.height = Math.max(1, Math.round(r.height * dpr));
        c.dpr = dpr;
      }
      const s = Math.min(1, (Hu - 16) / (this.wrap.offsetHeight / u), (Wu - 16) / (this.wrap.offsetWidth / u));
      if (s < 1) this.wrap.style.transform = `scale(${s.toFixed(3)})`;
      // canvases keep their backing size; CSS scale only shrinks them visually
    }

    mark(def) {
      for (const c of this.cards) {
        const on = c.def === def;
        c.el.classList.toggle('selected', on);
        c.el.setAttribute('aria-checked', on ? 'true' : 'false');
      }
    }

    choose(def) {
      const c = this.cards.find((x) => x.def === def);
      if (!PD.Unlocks.isUnlocked(def)) {
        c.el.classList.remove('nope');
        void c.el.offsetWidth;
        c.el.classList.add('nope');
        this.game.audio.click();
        return;
      }
      if (def !== this.game.def) {
        this.game.setDragon(def);
        this.game.audio.select(def);
      } else {
        this.game.audio.click();
      }
      this.mark(def);
      c.dragon.happy = 0.9;
      c.dragon.squash = 1;
      c.dragon.startStroke();
    }

    /** Arrow-key navigation. */
    step(dir) {
      const list = this.cards.filter((c) => PD.Unlocks.isUnlocked(c.def));
      const i = list.findIndex((c) => c.def === this.game.def);
      const next = list[(i + dir + list.length) % list.length];
      if (next) { this.choose(next.def); next.el.focus({ preventScroll: true }); }
    }

    update(dt) {
      if (!this.visible) return;
      for (const c of this.cards) {
        const d = c.dragon;
        d.updateHover(dt, 0);
        const g = c.ctx, k = c.dpr || 1;
        g.setTransform(k, 0, 0, k, 0, 0);
        g.clearRect(0, 0, c.w, c.h);
        const s = c.h / 92;
        // soft ground shadow that breathes with the bob
        g.fillStyle = 'rgba(43,29,58,0.14)';
        g.beginPath();
        g.ellipse(c.w / 2, c.h * 0.9, (26 - d.y * 0.4) * s, 4.5 * s, 0, 0, Math.PI * 2);
        g.fill();
        const rs = d.renderState(false);
        rs.x = c.w / 2 + 2 * s;
        rs.y = c.h * 0.56 + d.y * s;
        rs.scale = 0.98 * s;
        PD.Art.drawDragon(g, rs);
      }
    }
  }

  PD.DragonSelect = DragonSelect;
})();
