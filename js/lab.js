/* Pocket Dragon — flight lab (dev only). Open index.html?lab to fly without
 * obstacles and tune the flight model live. Inert without the URL flag. */
(function () {
  'use strict';
  const PD = window.PD;
  if (!/[?&]lab\b/.test(location.search)) return;

  PD.lab = { obstacles: false };
  // Sliders edit the live dragon's resolved flight model (dragon.F).
  const live = () => PD.game.dragon.F;
  // Extra comparison preset applied on top of the current dragon.
  const V1 = { gravity: 1650, flapKick: -470, flapThrust: 0, flapThrustTime: 0, fallCarry: 0, riseCarry: 0, maxClimb: 470, climbDrag: 0, glideTerminal: 720, diveTerminal: 720, apexGravity: 1, flapPitchKick: 0, flapSurge: 0 };
  const SLIDERS = [
    ['gravity', 800, 2400, 10], ['flapKick', -600, 0, 5], ['flapThrust', 0, 5000, 50],
    ['flapThrustTime', 0, 0.2, 0.005], ['fallCarry', 0, 1, 0.01], ['riseCarry', 0, 1, 0.01],
    ['glideTerminal', 150, 800, 5], ['diveTerminal', 300, 1200, 10], ['glideTime', 0, 1.5, 0.05],
    ['apexGravity', 0.2, 1, 0.05], ['pitchStiff', 30, 400, 5], ['pitchDamp', 2, 40, 1],
  ];

  function build() {
    const css = document.createElement('style');
    css.textContent = `
      #lab{position:fixed;left:8px;top:8px;z-index:50;width:250px;max-height:calc(100vh - 16px);overflow:auto;
        background:rgba(30,20,50,.86);color:#fff;font:12px/1.3 system-ui,sans-serif;border-radius:10px;padding:8px 10px;}
      #lab b{display:block;margin:2px 0 6px;font-size:13px}
      #lab label{display:grid;grid-template-columns:96px 1fr 44px;gap:4px;align-items:center;margin:2px 0}
      #lab input[type=range]{width:100%}
      #lab .row{display:flex;flex-wrap:wrap;gap:4px;margin:6px 0}
      #lab button{font:inherit;padding:3px 7px;border-radius:6px;border:0;background:#ffb347;color:#2b1d3a;cursor:pointer}
      #lab button.on{background:#fff}
      #lab .ro{opacity:.8;font-variant-numeric:tabular-nums}`;
    document.head.appendChild(css);
    const el = document.createElement('div');
    el.id = 'lab';
    el.innerHTML = `<b>Flight lab</b><div class="row" id="lab-presets"></div>
      <label style="grid-template-columns:auto 1fr"><input type="checkbox" id="lab-obs"> obstacles</label>
      <div id="lab-sliders"></div><div class="ro" id="lab-ro"></div>`;
    document.body.appendChild(el);
    // Panel interaction must never reach the game's tap handler / Space key.
    el.addEventListener('pointerdown', (e) => e.stopPropagation());
    el.addEventListener('keydown', (e) => { if (e.code === 'Space') e.preventDefault(); });

    const inputs = {};
    const sl = el.querySelector('#lab-sliders');
    for (const [k, min, max, step] of SLIDERS) {
      const lab = document.createElement('label');
      lab.innerHTML = `<span>${k}</span><input type="range" min="${min}" max="${max}" step="${step}"><span class="ro"></span>`;
      const inp = lab.querySelector('input'), out = lab.querySelectorAll('span')[1];
      inp.addEventListener('input', () => { live()[k] = +inp.value; out.textContent = inp.value; markPreset(null); });
      inputs[k] = { inp, out };
      sl.appendChild(lab);
    }
    const pr = el.querySelector('#lab-presets');
    const btns = {};
    function markPreset(name) { for (const n in btns) btns[n].classList.toggle('on', n === name); }
    const sync = () => { for (const k in inputs) { inputs[k].inp.value = live()[k]; inputs[k].out.textContent = live()[k]; } };
    const add = (name, fn) => {
      const b = document.createElement('button');
      b.textContent = name;
      b.addEventListener('click', () => { fn(); sync(); markPreset(name); b.blur(); });
      btns[name] = b;
      pr.appendChild(b);
    };
    for (const def of PD.Dragons.list) add(def.name, () => PD.game.setDragon(def));
    add('V1 feel', () => Object.assign(live(), V1));
    const wait = setInterval(() => { if (PD.game) { clearInterval(wait); sync(); markPreset(PD.game.def.name); } }, 50);
    const obs = el.querySelector('#lab-obs');
    obs.addEventListener('change', () => { PD.lab.obstacles = obs.checked; obs.blur(); });

    const ro = el.querySelector('#lab-ro');
    setInterval(() => {
      const d = PD.game && PD.game.dragon;
      if (d) ro.textContent = `vy ${d.vy.toFixed(0)}  pitch ${d.rot.toFixed(2)}  glide ${d.glide.toFixed(2)}`;
    }, 100);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
