/* Pocket Dragon — shared helpers.
 * All modules attach to the single global namespace `PD` (classic scripts, so the
 * game also runs straight from file:// without a dev server). */
(function () {
  'use strict';
  const PD = (window.PD = window.PD || {});

  PD.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  PD.lerp = (a, b, t) => a + (b - a) * t;
  PD.rand = (a, b) => a + Math.random() * (b - a);
  PD.chance = (p) => Math.random() < p;
  PD.pick = (arr) => arr[(Math.random() * arr.length) | 0];
  PD.easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
  PD.easeOutBack = (t) => {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  };

  /** Deterministic PRNG (used so procedural art looks identical every launch). */
  PD.seeded = function (seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  /** localStorage wrapper that never throws (private mode, blocked storage...). */
  PD.storage = {
    get(key, fallback) {
      try {
        const v = window.localStorage.getItem(key);
        return v === null ? fallback : JSON.parse(v);
      } catch (e) {
        return fallback;
      }
    },
    set(key, value) {
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
      } catch (e) { /* ignore */ }
    },
  };

  /**
   * Simple object pool. `active` is iterated by systems; dead objects are
   * swap-removed back into `free`, so steady-state gameplay allocates nothing.
   */
  class Pool {
    constructor(factory, initial) {
      this.factory = factory;
      this.free = [];
      this.active = [];
      for (let i = 0; i < initial; i++) this.free.push(factory());
    }
    obtain() {
      const o = this.free.length ? this.free.pop() : this.factory();
      this.active.push(o);
      return o;
    }
    /** Calls fn(item, dt); items for which fn returns false are released. */
    update(fn) {
      const a = this.active;
      for (let i = a.length - 1; i >= 0; i--) {
        if (!fn(a[i])) {
          const o = a[i];
          a[i] = a[a.length - 1];
          a.pop();
          this.free.push(o);
        }
      }
    }
    clear() {
      while (this.active.length) this.free.push(this.active.pop());
    }
  }
  PD.Pool = Pool;

  /** Circle vs axis-aligned rectangle. */
  PD.circleRect = function (cx, cy, r, rx, ry, rw, rh) {
    const nx = cx < rx ? rx : cx > rx + rw ? rx + rw : cx;
    const ny = cy < ry ? ry : cy > ry + rh ? ry + rh : cy;
    const dx = cx - nx, dy = cy - ny;
    return dx * dx + dy * dy < r * r;
  };

  PD.FONT = "'Baloo 2', 'Fredoka', 'Nunito', 'Arial Rounded MT Bold', 'Trebuchet MS', system-ui, sans-serif";
})();
