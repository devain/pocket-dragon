/* Pocket Dragon — dragon roster (data only) + unlock rules + selection.
 *
 * To add a dragon: append an entry to ROSTER. Each entry has four independent
 * parts that shared code reads:
 *   look   — which art parts + palette drawDragon() assembles (art.js)
 *   wings  — wingbeat keyframes and resting poses (Dragon._wings)
 *   flight — overrides of the base flight model in config.js (Dragon.updateFly)
 *   ability— optional special move, by type (Dragon.ABILITIES)
 *   fx/sound — trail/particle colours and flap timbre (game.js, audio.js)
 * plus `unlock`, a rule interpreted by PD.Unlocks.
 */
(function () {
  'use strict';
  const PD = window.PD;

  const ROSTER = [
    {
      id: 'emerald',
      name: 'Emerald',
      tagline: 'The cheerful all-rounder',
      blurb: 'Steady, eager and quick to answer every tap.',
      stats: { lift: 3, glide: 3, speed: 3, control: 5 },
      unlock: { type: 'always' },
      look: {
        palette: {
          body: '#3cc7a0', bodyLight: '#94f2d2', bodyShade: '#22907f',
          belly: '#ffeab8', bellyShade: '#eec285',
          wing: '#ff9db4', wingLight: '#ffc4d2', wingDark: '#e0628a', wingBack: '#d97a9d', wingBackDark: '#ad4a72',
          horn: '#ffd774', hornShade: '#df9d3a', spike: '#ff8fab', frill: '#ff9db4',
          iris: '#3a2766', irisLight: '#8a63ea', cheek: '#ff6f9a', mouth: '#7a2040', tongue: '#ff8aa3',
        },
        body: { rx: 19, ry: 16 }, head: { r: 17, snout: 1 },
        wing: 'bat', wingScale: 1, tail: 'spade', back: 'spikes', horns: 'nubs', face: 'bright', extras: [],
      },
      wings: { raise: 0.03, down: 0.1, recover: 0.24, beats: 1, coast: 0.38, glide: 0.52, dive: 0.86, flutter: 1, hover: 0.62 },
      flight: {},
      fx: { trail: '#ffffff', wash: '#ffffff' },
      sound: { flap: 'leather', pitch: 1 },
    },
    {
      id: 'frost',
      name: 'Frost',
      tagline: 'The dreamy drifter',
      blurb: 'Rides the breeze on wide feathered wings and floats down like snow.',
      stats: { lift: 2, glide: 5, speed: 2, control: 4 },
      unlock: { type: 'best', score: 15 },
      look: {
        palette: {
          body: '#a9dcff', bodyLight: '#eefaff', bodyShade: '#6fa6dd',
          belly: '#ffffff', bellyShade: '#c9def3',
          wing: '#f2fbff', wingLight: '#ffffff', wingDark: '#8fcaf2', wingBack: '#bcdcf4', wingBackDark: '#7ea9d6',
          horn: '#c8f8ff', hornShade: '#6fd0ee', spike: '#bff4ff', frill: '#ffffff',
          iris: '#24477f', irisLight: '#6fc0ff', cheek: '#ff9ec4', mouth: '#5a2a50', tongue: '#ff9ab4',
          scarf: '#ff6f91', scarfShade: '#cf4772',
        },
        body: { rx: 20, ry: 14.5 }, head: { r: 16, snout: 1.12 },
        wing: 'feather', wingScale: 1.18, tail: 'plume', back: 'icicles', horns: 'crystal', face: 'calm', extras: ['scarf'],
      },
      // Slow, deep, unhurried beats; holds its wings wide open.
      wings: { raise: 0.05, down: 0.15, recover: 0.34, beats: 1, coast: 0.42, glide: 0.5, dive: 0.78, flutter: 0.5, hover: 0.85 },
      flight: {
        gravity: 1250, flapKick: -250, flapThrust: 1800, flapThrustTime: 0.11,
        riseCarry: 0.25, maxClimb: 470,
        glideTerminal: 190, glideTime: 0.7, glideHold: 0.35, apexGravity: 0.38, apexBand: 170,
        diveTerminal: 700, pitchStiff: 95, pitchDamp: 14, flapPitchKick: 2.2, pitchDown: 0.85,
      },
      fx: { trail: '#d4f3ff', wash: '#e8f8ff', sparkle: { kind: 'STAR', colors: ['#ffffff', '#cdf3ff', '#9fe2ff'], rate: 0.07 } },
      sound: { flap: 'airy', pitch: 1.25 },
    },
    {
      id: 'blaze',
      name: 'Blaze',
      tagline: 'The hot-headed show-off',
      blurb: 'Huge flaps, heavy dives, a little too fast. Hard to master.',
      stats: { lift: 5, glide: 1, speed: 5, control: 2 },
      unlock: { type: 'best', score: 30 },
      look: {
        palette: {
          body: '#ff7a45', bodyLight: '#ffb27a', bodyShade: '#d4472b',
          belly: '#ffe08a', bellyShade: '#f0ae4a',
          wing: '#ffc94d', wingLight: '#fff0a0', wingDark: '#f0822a', wingBack: '#d9662a', wingBackDark: '#a8401f',
          horn: '#ffe6b0', hornShade: '#d9a25e', spike: '#5b2c43', frill: '#ffc94d',
          iris: '#4a1206', irisLight: '#ff9d1f', cheek: '#ff4f5a', mouth: '#6a1424', tongue: '#ff7a8a',
        },
        body: { rx: 20.5, ry: 17.5 }, head: { r: 17.5, snout: 0.92 },
        wing: 'blade', wingScale: 0.92, tail: 'flame', back: 'ridge', horns: 'ram', face: 'fierce', extras: [],
      },
      // Short, violent strokes; wings tucked tight between beats.
      wings: { raise: 0.02, down: 0.065, recover: 0.15, beats: 1, coast: 0.3, glide: 0.62, dive: 0.95, flutter: 1.6, hover: 0.45 },
      flight: {
        gravity: 1850, flapKick: -390, flapThrust: 3000, flapThrustTime: 0.07,
        fallCarry: 0.2, riseCarry: 0.5, maxClimb: 700, climbDrag: 0.0002,
        glideTerminal: 520, glideTime: 0.25, glideHold: 0.1, apexGravity: 0.8, apexBand: 110,
        diveTerminal: 900, pitchStiff: 210, pitchDamp: 15, flapPitchKick: 4.5, flapSurge: 120,
        pitchUp: -0.65, pitchDown: 1.2, speedMul: 1.12,
      },
      fx: { trail: '#ffd36b', wash: '#ffe2a0', sparkle: { kind: 'EMBER', colors: ['#ffd166', '#ff9a3d', '#ff5e3a'], rate: 0.035 } },
      sound: { flap: 'punch', pitch: 0.8 },
    },
    {
      id: 'mystic',
      name: 'Mystic',
      tagline: 'The curious stargazer',
      blurb: 'Flutters like a moth. Hold to hover in place while the stars recharge.',
      stats: { lift: 3, glide: 2, speed: 3, control: 4 },
      unlock: { type: 'orbs', count: 60 },
      ability: { type: 'hover', label: 'Hold to hover', duration: 1.1, recharge: 2.6, holdDelay: 0.16, drift: 22, grip: 10 },
      look: {
        palette: {
          body: '#8b6cf0', bodyLight: '#c9b8ff', bodyShade: '#5b42bd',
          belly: '#ebe2ff', bellyShade: '#bba7f2',
          wing: '#a8f4ff', wingLight: '#e8fdff', wingDark: '#ff9fe8', wingBack: '#86d6f0', wingBackDark: '#d77ad0',
          horn: '#ffe9a8', hornShade: '#e0b85a', spike: '#ffb3ec', frill: '#ffb3ec',
          iris: '#34186a', irisLight: '#ff9ef0', cheek: '#ff8ad8', mouth: '#5a1f5a', tongue: '#ff9ac8',
          gem: '#5ff3ff', glow: '#bff8ff',
        },
        body: { rx: 17.5, ry: 15.5 }, head: { r: 18, snout: 0.85 },
        wing: 'moth', wingScale: 1.05, tail: 'wisp', back: 'mane', horns: 'antennae', face: 'dreamy', extras: ['gem', 'stars'],
      },
      // Two quick flutters per tap, like a moth.
      wings: { raise: 0.025, down: 0.06, recover: 0.11, beats: 2, coast: 0.4, glide: 0.55, dive: 0.8, flutter: 2.2, hover: 0.42 },
      flight: {
        gravity: 1500, flapKick: -320, flapThrust: 1900, flapThrustTime: 0.07,
        riseCarry: 0.3, maxClimb: 540,
        glideTerminal: 380, glideTime: 0.4, glideHold: 0.25, apexGravity: 0.6,
        diveTerminal: 760, pitchStiff: 170, pitchDamp: 19,
      },
      fx: { trail: '#e9c2ff', wash: '#f4dcff', sparkle: { kind: 'STAR', colors: ['#fff6c8', '#ffb3ec', '#9ff3ff'], rate: 0.08 } },
      sound: { flap: 'shimmer', pitch: 1.1 },
    },
  ];

  // ---------------------------------------------------------------------------
  // Unlocks: rules are data; checkers are registered by type.
  // ---------------------------------------------------------------------------
  const RULES = {
    always: { met: () => true, text: () => '' },
    best: { met: (r, s) => s.best >= r.score, text: (r) => `Score ${r.score} in one flight` },
    orbs: { met: (r, s) => s.orbs >= r.count, text: (r) => `Collect ${r.count} fire orbs in total` },
    runs: { met: (r, s) => s.runs >= r.count, text: (r) => `Take ${r.count} flights` },
  };

  const Unlocks = {
    // V1 testing: every dragon is available. Set false to enable progression.
    unlockAll: true,
    stats() {
      return {
        best: PD.storage.get('pd_best', 0) | 0,
        orbs: PD.storage.get('pd_orbs', 0) | 0,
        runs: PD.storage.get('pd_runs', 0) | 0,
      };
    },
    isUnlocked(def, stats) {
      if (this.unlockAll) return true;
      const rule = RULES[def.unlock.type] || RULES.always;
      return rule.met(def.unlock, stats || this.stats());
    },
    requirement(def) {
      const rule = RULES[def.unlock.type] || RULES.always;
      return rule.text(def.unlock);
    },
    /** Ids unlocked right now — take before saving a run's results. */
    snapshot() {
      return ROSTER.filter((d) => this.isUnlocked(d)).map((d) => d.id);
    },
    /** Add a finished run to the lifetime stats (best is saved by the game). */
    recordRun(orbs) {
      PD.storage.set('pd_orbs', (PD.storage.get('pd_orbs', 0) | 0) + orbs);
      PD.storage.set('pd_runs', (PD.storage.get('pd_runs', 0) | 0) + 1);
    },
    /** Dragons unlocked since the snapshot was taken. */
    newSince(snap) {
      return ROSTER.filter((d) => !snap.includes(d.id) && this.isUnlocked(d));
    },
    registerRule(type, rule) { RULES[type] = rule; },
  };

  const Dragons = {
    list: ROSTER,
    get(id) { return ROSTER.find((d) => d.id === id) || ROSTER[0]; },
    selected() {
      const d = this.get(PD.storage.get('pd_dragon', 'emerald'));
      return Unlocks.isUnlocked(d) ? d : ROSTER[0];
    },
    select(id) {
      const d = this.get(id);
      if (!Unlocks.isUnlocked(d)) return false;
      PD.storage.set('pd_dragon', d.id);
      return true;
    },
    bestFor(id) { return PD.storage.get('pd_best_' + id, 0) | 0; },
    setBestFor(id, v) { PD.storage.set('pd_best_' + id, v); },
  };

  PD.Dragons = Dragons;
  PD.Unlocks = Unlocks;
})();
