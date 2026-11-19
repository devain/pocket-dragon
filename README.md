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
| Hover (Mystic)| Hold Space / mouse button     | Hold your finger |
| Choose dragon | D on the title, or the pill    | Dragon button    |
| Pause         | P or Esc, or the pause button | Pause button     |
| Mute          | M, or the speaker button      | Speaker button   |
| Restart       | Space / Enter / click         | Tap or Restart   |

The game also pauses on its own when the tab loses focus. After you unpause,
the dragon waits in the air until your next tap.

## Dragons

To choose a dragon, tap **Dragon** on the title screen, or press **D**. On the selection screen you can also use the arrow keys, then Enter. The game remembers your choice.

| Dragon | Personality | How it flies |
|---|---|---|
| **Emerald** | Cheerful all-rounder | Balanced and responsive. The reference feel. |
| **Frost** | Dreamy drifter | Soft flaps, a long feathered glide, slow descent and the calmest rhythm. Big drops need patience. |
| **Blaze** | Hot-headed show-off | Huge flaps, heavy dives and momentum that stacks on quick double taps. The world scrolls 12% faster. |
| **Mystic** | Curious stargazer | Flutters twice per tap. **Hold** the flap input to hover for about 1 s; the star meter recharges once you let go. |

Each dragon has its own silhouette and its own wings (leathery, feathered, blade or moth). Tails, crests, faces and accessories differ too, as do wingbeat timing, trail and particle effects, and flap sound.

Locks: all four dragons are unlocked for testing. Each dragon already has an unlock rule (score 15, score 30, or 60 fire orbs in total). To turn progression on, set `unlockAll: false` in `PD.Unlocks` in `js/dragons.js`. Locked dragons then show as silhouettes with their requirement, and the game-over panel announces any new unlocks.

### Adding a dragon

Append an entry to `ROSTER` in `js/dragons.js`. No gameplay code changes are needed. Each entry has these parts:

- **`look`:** a palette plus one entry from each art registry in `js/dragon-art.js`: `wing`, `tail`, `back`, `horns`, `face` and `extras`. Add a new part to a registry if you need a new look.
- **`wings`:** wingbeat keyframes (`raise`, `down`, `recover`, `beats`) and resting poses.
- **`flight`:** overrides of the base flight model in `config.js`, plus `speedMul`.
- **`ability`** (optional): a special move whose type is registered in `Dragon.ABILITIES` (`hover` exists).
- **`fx`** and **`sound`:** trail and particle colours, and the flap sound style.
- **`stats`:** 1–5 ratings shown on the selection card.
- **`unlock`:** an unlock rule. Rule types are registered in `PD.Unlocks`.

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
js/art.js         procedural art: obstacles, orbs, pre-rendered parallax
js/dragon-art.js  dragon art assembled from part registries (wings, tails, faces…)
js/dragons.js     dragon roster (data), unlock rules, selection persistence
js/entities.js    Dragon, Field (obstacles + orbs), Particles, FloatTexts
js/game.js        state machine, fixed-step loop, input, rendering, HUD
js/select.js      dragon selection screen with live previews
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
current dragon's flight values live. The panel has a button for each dragon and
one for the original V1 feel. You can switch obstacles back on
from the panel.

To tune the feel, edit `js/config.js`. Flight values: `gravity`, `flapKick`,
`flapThrust`, `glideTerminal`, `glideTime`, `apexGravity`. Difficulty values:
`gapMin/gapMax`, `speedMin/speedMax`, `rampPasses`.
