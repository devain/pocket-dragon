# Pocket Dragon

A tiny one-tap arcade game. Guide a baby dragon through towers, floating rocks
and magical crystal gates, and grab fire orbs along the way.

## Run

No build step and no dependencies.

- **Quickest:** double-click `index.html` (it works from `file://`).
- **Recommended (and needed for phones on your LAN):** serve the folder:
  ```
  npx serve .            # or: python -m http.server 8000
  ```
  Then open the printed URL.

## Controls

| Action        | Desktop                       | Mobile           |
|---------------|-------------------------------|------------------|
| Flap / start  | Space, ↑, W, Enter, or click  | Tap anywhere     |
| Pause         | P or Esc, or the pause button | Pause button     |
| Mute          | M, or the speaker button      | Speaker button   |
| Restart       | Space / Enter / click         | Tap or Restart   |

The game also pauses on its own when the tab loses focus. After you unpause,
the dragon waits in the air until your next tap.

## Scoring

- +1 for each obstacle pair you pass.
- +1 for each fire orb. Orbs grabbed in quick succession play a rising combo chime.
- Your best score is saved in `localStorage` (`pd_best`).

## Structure

```
index.html        page shell + DOM UI (title, ready, pause, game-over)
css/style.css     UI styling (scales with the game via --u)
js/util.js        helpers, seeded RNG, safe storage, object Pool, collision
js/config.js      all gameplay tuning (physics, difficulty, fairness)
js/audio.js       Web Audio synth SFX + procedural music loop
js/art.js         procedural art: dragon, obstacles, orbs, pre-rendered parallax
js/entities.js    Dragon, Field (obstacles + orbs), Particles, FloatTexts
js/game.js        state machine, fixed-step loop, input, rendering, HUD
js/lab.js         dev-only flight lab (index.html?lab)
js/main.js        bootstrap
```

## Flight model

The dragon is meant to feel like a creature with wings, not a bouncing ball:

- **Wingbeat.** A tap gives an instant kick so the dragon responds right away. A short downstroke then adds thrust, which gives the flap its weight. Some momentum carries over: flapping again while climbing stacks a little, and flapping out of a dive has to cancel the fall first.
- **Soft apex and glide.** Near the top of each arc the spread wings ease gravity. While descending, quadratic drag caps the fall at a slow glide speed. After a moment the wings tuck and the drag fades into a committed dive.
- **Pitch.** The body points along its actual flight path, driven by a slightly bouncy spring, and each wingbeat gives the nose a small upward kick.
- **Animation.** The wings follow keyframes on each beat: snap up, full downstroke, then a folded recovery. Between beats they settle into a spread glide pose or a swept-back dive tuck, and flutter faster at higher speed. The tail lags behind the motion.
- **Effects.** A downwash crescent and puffs appear at the moment of the downstroke, the wingtips leave trails, and a dive shows speed streaks. A wind sound rises and brightens as the dragon picks up speed.

**Flight lab:** open `index.html?lab` to fly with no obstacles and adjust the
flight values live. The panel also has buttons for the candidate settings that
were compared, including the original V1 feel. You can switch obstacles back on
from the panel.

To tune the feel, edit `js/config.js`. Flight values: `gravity`, `flapKick`,
`flapThrust`, `glideTerminal`, `glideTime`, `apexGravity`. Difficulty values:
`gapMin/gapMax`, `speedMin/speedMax`, `rampPasses`.
