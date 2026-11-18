/* Pocket Dragon — gameplay tuning. All distances are in logical pixels
 * (the playfield is 640 logical px tall; width adapts to the screen). */
(function () {
  'use strict';
  window.PD.CFG = {
    // Logical viewport
    baseH: 640,
    minW: 360,
    maxW: 1100,
    maxH: 820,
    groundH: 76,

    // Physics (fixed 120 Hz step)
    step: 1 / 120,
    gravity: 1650,
    flapVelocity: -470,
    maxFall: 720,
    ceiling: -12,

    // Dragon
    playScale: 0.72,
    titleScale: 1.35,
    // Hit circles in dragon-local units (before scale). Wings/tail/horns are
    // deliberately excluded so near-misses feel fair.
    hitCircles: [
      { x: 13, y: -8, r: 14 }, // head
      { x: -4, y: 4, r: 14 },  // body
    ],

    // Obstacles
    obsW: 76,
    capW: 92,
    capH: 24,
    hitInset: 3,            // forgiveness on obstacle edges
    firstSpawnDelay: 210,   // px of scroll before the first pair spawns
    gapTopMargin: 66,
    gapBottomMargin: 58,

    // Difficulty: d goes 0 -> 1 over `rampPasses` passed pairs
    rampPasses: 40,
    speedMin: 170, speedMax: 262,
    gapMin: 142, gapMax: 182,
    spacingMin: 238, spacingMax: 272,
    maxRise: 150,           // max upward shift of gap centre between pairs
    maxDrop: 185,           // max downward shift
    crystalFrom: 4,         // magical barriers appear after N passes
    movingFrom: 10,         // and start drifting after N passes

    // Orbs
    orbInGapChance: 0.5,
    orbBetweenChance: 0.32,
    orbCollectR: 26,
    orbMagnetR: 64,
    comboWindow: 2.4,

    // Game feel
    hitStop: 0.09,
    shake: 11,
    restartGuard: 0.55,
  };
})();
