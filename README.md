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
js/main.js        bootstrap
```

To tune the feel, edit `js/config.js`. Useful values: `gravity`, `flapVelocity`,
`gapMin/gapMax`, `speedMin/speedMax`, `rampPasses`.
