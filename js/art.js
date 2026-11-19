/* Pocket Dragon — procedural art.
 * Everything is drawn with Canvas paths in one consistent "sticker" style:
 * dark plum outlines, flat cel colours + soft gradients, pastel dusk palette.
 * Static scenery is pre-rendered once into tileable off-screen canvases. */
(function () {
  'use strict';
  const PD = window.PD;
  const CFG = PD.CFG;
  const TAU = Math.PI * 2;
  const OUT = '#2b1d3a';

  // ---------------------------------------------------------------------------
  // Palettes
  // ---------------------------------------------------------------------------
  const DP = {
    outline: OUT,
    body: '#3cc7a0', bodyLight: '#94f2d2', bodyShade: '#22907f',
    belly: '#ffeab8', bellyShade: '#eec285',
    wing: '#ff9db4', wingDark: '#e0628a', wingBack: '#d97a9d', wingBackDark: '#ad4a72',
    horn: '#ffd774', hornShade: '#df9d3a',
    spike: '#ff8fab',
    iris: '#3a2766', irisLight: '#8a63ea',
    cheek: '#ff6f9a', mouth: '#7a2040', tongue: '#ff8aa3',
  };

  const OP = {
    stone: '#ece6fb', stoneMid: '#cbc2ea', stoneShade: '#a196d2',
    roof: '#5b86e8', roofShade: '#3d5fc0',
    banner: '#ef5b7a', bannerShade: '#c23f62',
    windowGlow: '#ffd27a',
    rockLight: '#c1aad8', rock: '#9a7fbc', rockShade: '#735a98', rockDark: '#58447a',
    grass: '#8ddc72', grassShade: '#57aa5f', grassLight: '#c4f59c',
    obsidian: '#4c3f92', obsidianShade: '#2c2462', rune: '#7ff6ff',
    gold: '#ffd166', goldShade: '#cf8a26',
    crystal: '#bffaff', crystalMid: '#6fdcf5', crystalShade: '#3a9fe0',
  };

  function makeCanvas(w, h, pr) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(w * pr));
    c.height = Math.max(1, Math.ceil(h * pr));
    const g = c.getContext('2d');
    g.setTransform(pr, 0, 0, pr, 0, 0);
    return { c, g };
  }

  function ellipse(g, x, y, rx, ry, rot) {
    g.beginPath();
    g.ellipse(x, y, rx, ry, rot || 0, 0, TAU);
  }

  function vgrad(g, y0, y1, stops) {
    const gr = g.createLinearGradient(0, y0, 0, y1);
    for (const s of stops) gr.addColorStop(s[0], s[1]);
    return gr;
  }
  function hgrad(g, x0, x1, stops) {
    const gr = g.createLinearGradient(x0, 0, x1, 0);
    for (const s of stops) gr.addColorStop(s[0], s[1]);
    return gr;
  }

  // ---------------------------------------------------------------------------
  // Sprites
  // ---------------------------------------------------------------------------
  function radialSprite(size, stops) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    const r = size / 2;
    const gr = g.createRadialGradient(r, r, 0, r, r, r);
    for (const s of stops) gr.addColorStop(s[0], s[1]);
    g.fillStyle = gr;
    g.fillRect(0, 0, size, size);
    return c;
  }

  function buildSprites() {
    return {
      soft: radialSprite(64, [[0, 'rgba(255,255,255,1)'], [0.5, 'rgba(255,255,255,0.55)'], [1, 'rgba(255,255,255,0)']]),
      fireGlow: radialSprite(128, [[0, 'rgba(255,214,120,0.95)'], [0.3, 'rgba(255,140,50,0.5)'], [1, 'rgba(255,80,40,0)']]),
      cyanGlow: radialSprite(128, [[0, 'rgba(160,250,255,0.9)'], [0.35, 'rgba(90,200,255,0.35)'], [1, 'rgba(90,160,255,0)']]),
      warmGlow: radialSprite(128, [[0, 'rgba(255,220,140,0.85)'], [0.4, 'rgba(255,170,90,0.3)'], [1, 'rgba(255,150,80,0)']]),
    };
  }

  // ---------------------------------------------------------------------------
  // Dragon
  // ---------------------------------------------------------------------------
  function drawWing(g, wingT, px, py, back, tint, fold) {
    g.save();
    g.translate(px, py);
    g.rotate(PD.lerp(0.32, -1.5, wingT));
    if (back) g.scale(0.86, 0.86);
    // fold: 0 = membrane fully open (power stroke), 1 = tucked (recovery / dive)
    if (fold) g.scale(1 - 0.3 * fold, 1 - 0.42 * fold);
    // Membrane
    g.beginPath();
    g.moveTo(2, 3);
    g.lineTo(-3, -17);
    g.lineTo(-13, -33);
    g.quadraticCurveTo(-17, -25, -25, -23);
    g.quadraticCurveTo(-24, -14, -30, -8);
    g.quadraticCurveTo(-17, -8, -9, 5);
    g.closePath();
    if (tint) g.fillStyle = '#fff';
    else g.fillStyle = vgrad(g, -33, 5, back
      ? [[0, DP.wingBack], [1, DP.wingBackDark]]
      : [[0, '#ffc4d2'], [0.45, DP.wing], [1, DP.wingDark]]);
    g.fill();
    g.lineWidth = 2.4;
    g.stroke();
    // Finger bones
    g.beginPath();
    g.moveTo(-3, -17); g.lineTo(-25, -23);
    g.moveTo(-3, -17); g.lineTo(-30, -8);
    g.lineWidth = 1.6;
    g.strokeStyle = tint ? '#fff' : (back ? DP.wingBackDark : DP.wingDark);
    g.stroke();
    // Arm
    g.beginPath();
    g.moveTo(2, 3); g.lineTo(-3, -17); g.lineTo(-13, -33);
    g.strokeStyle = tint ? '#fff' : OUT;
    g.lineWidth = 5.8;
    g.stroke();
    g.strokeStyle = tint ? '#fff' : (back ? DP.bodyShade : DP.body);
    g.lineWidth = 3;
    g.stroke();
    g.restore();
  }

  function drawHorn(g, bx, by, tx, ty, fill) {
    g.beginPath();
    g.moveTo(bx - 5, by + 3);
    g.quadraticCurveTo(bx - 5, ty + 7, tx, ty);
    g.quadraticCurveTo(bx + 3, by - 6, bx + 5, by + 3);
    g.closePath();
    g.fillStyle = fill;
    g.fill();
    g.stroke();
  }

  /**
   * d: { x, y, rot, scale, sx, sy, wingT, blink, mood, time, tint }
   * Local space: facing right, body centre ≈ (0,0), roughly 86×58 units.
   */
  function drawDragon(g, d) {
    const T = !!d.tint;
    const C = (k) => (T ? '#ffffff' : DP[k]);
    const t = d.time;

    g.save();
    g.translate(d.x, d.y);
    g.rotate(d.rot);
    g.scale(d.scale * d.sx, d.scale * d.sy);
    g.lineJoin = 'round';
    g.lineCap = 'round';
    g.strokeStyle = T ? '#fff' : OUT;
    g.lineWidth = 2.6;

    // Far wing (slightly lagging the near wing for depth)
    const lag = d.wingLag == null ? d.wingT : d.wingLag;
    drawWing(g, PD.clamp(lag * 0.92 + 0.04, -0.1, 1.05), -9, -9, true, T, d.fold || 0);
    g.strokeStyle = T ? '#fff' : OUT;
    g.lineWidth = 2.6;

    // Tail
    // Tail sways gently and trails the motion (drags down on climbs, lifts in dives).
    const tl = d.tail || 0;
    const sw = Math.sin(t * 4.2) * 3 * (1 - Math.min(1, Math.abs(tl)) * 0.5);
    const tx = -36 + Math.abs(tl) * 2, ty = -8 + sw + tl * 9;
    g.beginPath();
    g.moveTo(-12, -4);
    g.quadraticCurveTo(-26, 0, tx, ty);
    g.quadraticCurveTo(-30, 8, -10, 14);
    g.closePath();
    g.fillStyle = C('bodyShade');
    g.fill();
    g.stroke();
    // Tail spade
    g.beginPath();
    g.moveTo(tx + 4, ty + 2);
    g.quadraticCurveTo(tx - 1, ty - 9, tx - 12, ty - 10);
    g.quadraticCurveTo(tx - 7, ty - 1, tx - 11, ty + 6);
    g.quadraticCurveTo(tx - 3, ty + 5, tx + 4, ty + 2);
    g.fillStyle = C('spike');
    g.fill();
    g.stroke();

    // Back spikes
    g.fillStyle = C('spike');
    const spikes = [[-5, -11, -0.25], [-14, -9, -0.7], [-20, -3, -1.15]];
    for (const s of spikes) {
      g.save();
      g.translate(s[0], s[1]);
      g.rotate(s[2]);
      g.beginPath();
      g.moveTo(-4.5, 3); g.lineTo(0, -7); g.lineTo(4.5, 3);
      g.closePath();
      g.fill();
      g.stroke();
      g.restore();
    }

    // Feet
    g.fillStyle = C('bodyShade');
    ellipse(g, -12, 17, 5.5, 4.5, 0.3); g.fill(); g.stroke();
    ellipse(g, 3, 19, 5.5, 4.5, -0.2); g.fill(); g.stroke();

    // Body
    ellipse(g, -4, 4, 19, 16);
    g.fillStyle = T ? '#fff' : vgrad(g, -12, 20, [[0, DP.bodyLight], [0.35, DP.body], [1, DP.bodyShade]]);
    g.fill();
    g.stroke();

    // Belly
    if (!T) {
      g.save();
      g.translate(4, 9);
      g.rotate(-0.35);
      ellipse(g, 0, 0, 11, 8.5);
      g.fillStyle = vgrad(g, -8, 8, [[0, '#fff6d8'], [1, DP.belly]]);
      g.fill();
      g.beginPath();
      for (let i = -1; i <= 1; i++) {
        g.moveTo(-8 + Math.abs(i) * 1.5, i * 4);
        g.quadraticCurveTo(0, i * 4 + 2.5, 8 - Math.abs(i) * 1.5, i * 4);
      }
      g.strokeStyle = DP.bellyShade;
      g.lineWidth = 1.5;
      g.stroke();
      g.restore();
      g.strokeStyle = OUT;
      g.lineWidth = 2.6;
    }

    // Little arm
    ellipse(g, 11, 10, 4, 5.5, -0.5);
    g.fillStyle = C('body');
    g.fill();
    g.stroke();

    // Near wing
    drawWing(g, d.wingT, -4, -8, false, T, d.fold || 0);
    g.strokeStyle = T ? '#fff' : OUT;
    g.lineWidth = 2.6;

    // Horns + ear frill (behind head)
    drawHorn(g, 4, -22, -7, -34, C('hornShade'));
    drawHorn(g, 13, -24, 3, -39, C('horn'));
    g.beginPath();
    g.moveTo(4, -16);
    g.quadraticCurveTo(-6, -21, -13, -15);
    g.quadraticCurveTo(-5, -12, -9, -5);
    g.quadraticCurveTo(0, -8, 4, -6);
    g.closePath();
    g.fillStyle = C('wing');
    g.fill();
    g.stroke();

    // Head (union outline: stroke both shapes, then fill both)
    g.beginPath(); g.arc(13, -9, 17, 0, TAU); g.stroke();
    ellipse(g, 27, -3, 10, 8); g.stroke();
    const hg = T ? '#fff' : vgrad(g, -26, 8, [[0, DP.bodyLight], [0.4, DP.body], [1, DP.bodyShade]]);
    g.fillStyle = hg;
    g.beginPath(); g.arc(13, -9, 17, 0, TAU); g.fill();
    ellipse(g, 27, -3, 10, 8); g.fill();

    if (!T) {
      // Snout & gloss highlights
      g.globalAlpha = 0.55;
      g.fillStyle = DP.bodyLight;
      ellipse(g, 28, -5, 6.5, 4); g.fill();
      g.globalAlpha = 0.45;
      g.fillStyle = '#ffffff';
      ellipse(g, 7, -19, 6, 3, -0.5); g.fill();
      g.globalAlpha = 1;

      // Cheek blush
      g.globalAlpha = 0.5;
      g.fillStyle = DP.cheek;
      ellipse(g, 22, 1, 4.5, 2.6); g.fill();
      g.globalAlpha = 1;

      // Nostril
      g.fillStyle = OUT;
      ellipse(g, 34, -6, 1.3, 1.8, 0.3); g.fill();

      drawFace(g, d);
    }

    g.restore();
  }

  function drawFace(g, d) {
    const ex = 17, ey = -11;
    g.strokeStyle = OUT;
    g.lineCap = 'round';
    if (d.mood === 'hit') {
      // Dizzy spiral eye
      g.beginPath();
      for (let i = 0; i <= 28; i++) {
        const a = i * 0.45 + d.time * 9;
        const r = 0.6 + i * 0.22;
        const px = ex + Math.cos(a) * r, py = ey + Math.sin(a) * r;
        if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
      }
      g.lineWidth = 2;
      g.stroke();
      // "o" mouth
      ellipse(g, 30, 5, 2.6, 3.2);
      g.fillStyle = DP.mouth;
      g.fill();
      g.lineWidth = 1.8;
      g.stroke();
      return;
    }

    if (d.mood === 'happy') {
      g.beginPath();
      g.moveTo(11, -9);
      g.quadraticCurveTo(17, -18, 23, -9);
      g.lineWidth = 3;
      g.stroke();
    } else if (d.blink > 0) {
      g.beginPath();
      g.moveTo(10.5, -11);
      g.quadraticCurveTo(17, -6, 23.5, -11);
      g.lineWidth = 3;
      g.stroke();
    } else {
      // Big expressive eye
      ellipse(g, ex, ey, 7.2, 8.6);
      g.fillStyle = '#ffffff';
      g.fill();
      g.lineWidth = 2.2;
      g.stroke();
      ellipse(g, ex + 1.6, ey + 0.8, 5.2, 6.6);
      g.fillStyle = vgrad(g, ey - 6, ey + 7, [[0, DP.iris], [1, DP.irisLight]]);
      g.fill();
      ellipse(g, ex + 2, ey + 0.4, 2.8, 3.6);
      g.fillStyle = '#120a20';
      g.fill();
      g.fillStyle = '#ffffff';
      g.beginPath(); g.arc(ex + 3.6, ey - 2.4, 2.2, 0, TAU); g.fill();
      g.beginPath(); g.arc(ex - 0.2, ey + 4, 1.1, 0, TAU); g.fill();
      // Upper lid
      g.beginPath();
      g.ellipse(ex, ey, 7.2, 8.6, 0, Math.PI * 1.12, Math.PI * 1.9);
      g.lineWidth = 3.4;
      g.stroke();
    }

    // Mouth
    g.lineWidth = 2;
    if (d.mood === 'happy') {
      g.beginPath();
      g.moveTo(25, 2.5);
      g.quadraticCurveTo(30, 12, 35, 1.5);
      g.closePath();
      g.fillStyle = DP.mouth;
      g.fill();
      g.stroke();
      ellipse(g, 30, 6.5, 2.6, 1.6);
      g.fillStyle = DP.tongue;
      g.fill();
    } else {
      g.beginPath();
      g.moveTo(25.5, 3.5);
      g.quadraticCurveTo(30, 7, 34, 2.5);
      g.stroke();
      // tiny fang
      g.beginPath();
      g.moveTo(28, 4.8); g.lineTo(29, 7.6); g.lineTo(30.2, 5.2);
      g.fillStyle = '#ffffff';
      g.fill();
      g.lineWidth = 1;
      g.stroke();
    }
  }

  // ---------------------------------------------------------------------------
  // Fire orb
  // ---------------------------------------------------------------------------
  function flame(g, r, t, color, stroke) {
    const flick = Math.sin(t * 13) * 0.12 + Math.sin(t * 7.3) * 0.1;
    const tipY = -r * 2.1 * (1 + flick * 0.5);
    const tipX = Math.sin(t * 5) * r * 0.28;
    g.beginPath();
    g.moveTo(tipX, tipY);
    g.quadraticCurveTo(r * 1.15, -r * 0.6, r, r * 0.15);
    g.arc(0, r * 0.15, r, 0, Math.PI);
    g.quadraticCurveTo(-r * 1.15, -r * 0.6, tipX, tipY);
    g.closePath();
    g.fillStyle = color;
    g.fill();
    if (stroke) g.stroke();
  }

  function star4(g, x, y, r) {
    g.beginPath();
    g.moveTo(x, y - r);
    g.quadraticCurveTo(x, y, x + r, y);
    g.quadraticCurveTo(x, y, x, y + r);
    g.quadraticCurveTo(x, y, x - r, y);
    g.quadraticCurveTo(x, y, x, y - r);
    g.fill();
  }

  function drawOrb(g, x, y, t, s, sprites) {
    const pulse = 1 + Math.sin(t * 6) * 0.07;
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = 0.8;
    const R = 32 * s * pulse;
    g.drawImage(sprites.fireGlow, x - R, y - R, R * 2, R * 2);
    g.restore();

    g.save();
    g.translate(x, y + 4 * s);
    g.scale(s, s);
    g.lineJoin = 'round';
    g.strokeStyle = '#6e1f2a';
    g.lineWidth = 2.2;
    flame(g, 10.5, t, '#ff5a3c', true);
    g.translate(0, 2);
    flame(g, 7.2, t + 1.3, '#ffa43a', false);
    g.translate(0, 2);
    flame(g, 4.2, t + 2.1, '#fff2b0', false);
    g.restore();

    // orbiting sparkles
    g.save();
    g.fillStyle = '#fff6c8';
    for (let i = 0; i < 2; i++) {
      const a = t * 2.6 + i * Math.PI;
      const sx = x + Math.cos(a) * 17 * s;
      const sy = y + Math.sin(a) * 7 * s - 2;
      star4(g, sx, sy, (2.6 + Math.sin(t * 8 + i) * 0.9) * s);
    }
    g.restore();
  }

  // ---------------------------------------------------------------------------
  // Obstacles
  // ---------------------------------------------------------------------------
  function columnSides(g, x, w, y0, y1) {
    g.beginPath();
    g.moveTo(x, y0); g.lineTo(x, y1);
    g.moveTo(x + w, y0); g.lineTo(x + w, y1);
    g.strokeStyle = OUT;
    g.lineWidth = 3;
    g.stroke();
  }

  function towerColumn(g, x, w, y0, y1, isBottom, sprites, t) {
    const h = y1 - y0;
    if (h <= 0) return;
    g.fillStyle = hgrad(g, x, x + w, [[0, OP.stoneMid], [0.08, OP.stone], [0.55, OP.stoneMid], [0.7, OP.stoneShade], [1, OP.stoneShade]]);
    g.fillRect(x, y0, w, h);
    // Bricks, aligned to the cap edge so they look fixed to the tower
    const edge = isBottom ? y0 : y1;
    const rowH = 16;
    g.beginPath();
    for (let i = 1; i < 80; i++) {
      const yy = isBottom ? edge + i * rowH : edge - i * rowH;
      if (isBottom ? yy > y1 : yy < y0) break;
      g.moveTo(x, yy); g.lineTo(x + w, yy);
      const off = i % 2 ? 0 : 13;
      const yy2 = isBottom ? yy - rowH : yy + rowH;
      for (let bx = x + 12 + off; bx < x + w - 5; bx += 26) {
        g.moveTo(bx, yy); g.lineTo(bx, yy2);
      }
    }
    g.strokeStyle = 'rgba(43,29,58,0.2)';
    g.lineWidth = 2;
    g.stroke();

    // Coloured band next to the cap
    const bandY = isBottom ? y0 + 5 : y1 - 15;
    g.fillStyle = hgrad(g, x, x + w, [[0, OP.roof], [0.65, OP.roof], [0.7, OP.roofShade], [1, OP.roofShade]]);
    g.fillRect(x, bandY, w, 10);
    g.strokeStyle = OUT;
    g.lineWidth = 2.5;
    g.strokeRect(x, bandY, w, 10);

    if (isBottom && h > 90) {
      // Glowing arched window
      const wx = x + w * 0.38, wy = y0 + 40, ww = 16, wh = 26;
      g.save();
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = 0.35 + Math.sin(t * 3 + x * 0.01) * 0.08;
      g.drawImage(sprites.warmGlow, wx - 34, wy + wh / 2 - 34, 68, 68);
      g.restore();
      g.beginPath();
      g.moveTo(wx - ww / 2, wy + wh);
      g.lineTo(wx - ww / 2, wy + ww / 2);
      g.arc(wx, wy + ww / 2, ww / 2, Math.PI, 0);
      g.lineTo(wx + ww / 2, wy + wh);
      g.closePath();
      g.fillStyle = vgrad(g, wy, wy + wh, [[0, '#fff1b8'], [1, '#ffb347']]);
      g.fill();
      g.stroke();
      g.beginPath();
      g.moveTo(wx, wy + 1); g.lineTo(wx, wy + wh);
      g.moveTo(wx - ww / 2, wy + wh * 0.55); g.lineTo(wx + ww / 2, wy + wh * 0.55);
      g.lineWidth = 2;
      g.stroke();
    }
    if (!isBottom && h > 100) {
      // Hanging banner
      const bx = x + w * 0.42, top = y1 - 82, bw = 24, bh = 46;
      const sway = Math.sin(t * 2 + x * 0.02) * 1.5;
      g.beginPath();
      g.moveTo(bx - bw / 2, top);
      g.lineTo(bx + bw / 2, top);
      g.lineTo(bx + bw / 2 + sway, top + bh);
      g.lineTo(bx + sway, top + bh - 9);
      g.lineTo(bx - bw / 2 + sway, top + bh);
      g.closePath();
      g.fillStyle = hgrad(g, bx - bw / 2, bx + bw / 2, [[0, OP.banner], [0.6, OP.banner], [1, OP.bannerShade]]);
      g.fill();
      g.lineWidth = 2.5;
      g.stroke();
      // Gold flame emblem
      g.fillStyle = OP.gold;
      g.beginPath();
      g.moveTo(bx + sway * 0.5, top + 9);
      g.quadraticCurveTo(bx + 7, top + 20, bx + sway * 0.5, top + 27);
      g.quadraticCurveTo(bx - 7, top + 20, bx + sway * 0.5, top + 9);
      g.fill();
      g.lineWidth = 1.5;
      g.stroke();
      // Rod
      g.beginPath();
      g.moveTo(bx - bw / 2 - 4, top); g.lineTo(bx + bw / 2 + 4, top);
      g.lineWidth = 4;
      g.stroke();
    }
    columnSides(g, x, w, y0, y1);
  }

  function towerCap(g, x, y, w, h, merlonsDown) {
    const mh = 9, n = 4, mw = w / (n * 2 - 1);
    g.beginPath();
    if (!merlonsDown) {
      g.moveTo(x, y + h);
      g.lineTo(x, y);
      for (let i = 0; i < n; i++) {
        const mx = x + i * 2 * mw;
        g.lineTo(mx, y);
        g.lineTo(mx + mw, y);
        if (i < n - 1) { g.lineTo(mx + mw, y + mh); g.lineTo(mx + 2 * mw, y + mh); }
      }
      g.lineTo(x + w, y + h);
    } else {
      g.moveTo(x, y);
      g.lineTo(x, y + h);
      for (let i = 0; i < n; i++) {
        const mx = x + i * 2 * mw;
        g.lineTo(mx, y + h);
        g.lineTo(mx + mw, y + h);
        if (i < n - 1) { g.lineTo(mx + mw, y + h - mh); g.lineTo(mx + 2 * mw, y + h - mh); }
      }
      g.lineTo(x + w, y);
    }
    g.closePath();
    g.fillStyle = hgrad(g, x, x + w, [[0, OP.stone], [0.6, OP.stoneMid], [1, OP.stoneShade]]);
    g.fill();
    g.strokeStyle = OUT;
    g.lineWidth = 3;
    g.stroke();
    // Ledge shadow line
    g.beginPath();
    const ly = merlonsDown ? y + 4 : y + h - 4;
    g.moveTo(x + 3, ly); g.lineTo(x + w - 3, ly);
    g.strokeStyle = 'rgba(43,29,58,0.25)';
    g.lineWidth = 2;
    g.stroke();
  }

  function rockPath(g, x, w, y0, y1, seed) {
    // Edges wobble inwards only, so the art never pokes outside the hitbox.
    const wob = (y) => 2.5 + 1.6 * Math.sin(y * 0.045 + seed) + 0.9 * Math.sin(y * 0.11 + seed * 1.7);
    g.beginPath();
    g.moveTo(x + wob(y0), y0);
    for (let y = y0; y < y1; y += 12) g.lineTo(x + wob(y), y);
    g.lineTo(x + wob(y1), y1);
    g.lineTo(x + w - wob(y1 + 40), y1);
    for (let y = y1; y > y0; y -= 12) g.lineTo(x + w - wob(y + 40), y);
    g.lineTo(x + w - wob(y0 + 40), y0);
    g.closePath();
  }

  function rockColumn(g, x, w, y0, y1, seed, edgeY) {
    if (y1 - y0 <= 0) return;
    rockPath(g, x, w, y0, y1, seed);
    g.fillStyle = hgrad(g, x, x + w, [[0, OP.rockLight], [0.35, OP.rock], [0.7, OP.rockShade], [1, OP.rockShade]]);
    g.fill();
    g.save();
    g.clip();
    // Strata + crystal specks
    g.beginPath();
    for (let i = 1; i < 40; i++) {
      const yy = edgeY + (edgeY > y0 + 1 ? -i : i) * 30;
      if (yy < y0 - 30 || yy > y1 + 30) continue;
      g.moveTo(x, yy + 6);
      g.quadraticCurveTo(x + w * 0.5, yy - 4 + (i % 3) * 3, x + w, yy + 2);
    }
    g.strokeStyle = 'rgba(58,40,90,0.28)';
    g.lineWidth = 2;
    g.stroke();
    g.fillStyle = 'rgba(160,250,255,0.75)';
    for (let i = 1; i < 30; i++) {
      const yy = edgeY + (edgeY > y0 + 1 ? -i : i) * 47 + ((seed * 7 + i * 13) % 17);
      if (yy < y0 || yy > y1) continue;
      const xx = x + 14 + ((seed * 31 + i * 23) % (w - 28));
      g.beginPath();
      g.moveTo(xx, yy - 4); g.lineTo(xx + 3, yy); g.lineTo(xx, yy + 4); g.lineTo(xx - 3, yy);
      g.fill();
    }
    g.restore();
    rockPath(g, x, w, y0, y1, seed);
    g.strokeStyle = OUT;
    g.lineWidth = 3;
    g.stroke();
  }

  function grassCap(g, x, y, w, h, t) {
    // Rock lump under the grass
    g.beginPath();
    g.moveTo(x + 6, y + 10);
    g.lineTo(x + w - 6, y + 10);
    g.quadraticCurveTo(x + w - 4, y + h, x + w - 14, y + h);
    g.lineTo(x + 14, y + h);
    g.quadraticCurveTo(x + 4, y + h, x + 6, y + 10);
    g.fillStyle = hgrad(g, x, x + w, [[0, OP.rock], [0.6, OP.rockShade], [1, OP.rockDark]]);
    g.fill();
    g.strokeStyle = OUT;
    g.lineWidth = 3;
    g.stroke();
    // Grass blanket with scalloped drips
    g.beginPath();
    g.moveTo(x, y + 9);
    g.quadraticCurveTo(x + 2, y + 2, x + 10, y + 3);
    for (let i = 0; i < 5; i++) {
      const sx = x + 10 + i * (w - 20) / 5;
      g.quadraticCurveTo(sx + (w - 20) / 10, y - 1 + (i % 2) * 2, sx + (w - 20) / 5, y + 3);
    }
    g.quadraticCurveTo(x + w - 2, y + 2, x + w, y + 9);
    g.quadraticCurveTo(x + w, y + 15, x + w - 8, y + 15);
    const scallops = 6;
    for (let i = scallops; i > 0; i--) {
      const sx = x + 8 + (i - 1) * (w - 16) / scallops;
      g.quadraticCurveTo(sx + (w - 16) / scallops / 2, y + 21 + (i % 2) * 2, sx, y + 15);
    }
    g.quadraticCurveTo(x, y + 15, x, y + 9);
    g.closePath();
    g.fillStyle = vgrad(g, y, y + 20, [[0, OP.grassLight], [0.3, OP.grass], [1, OP.grassShade]]);
    g.fill();
    g.stroke();
    // Tiny flowers
    const fl = [[0.25, '#ffffff'], [0.55, '#ffd166'], [0.8, '#ff9db4']];
    for (const f of fl) {
      const fx = x + w * f[0], fy = y + 6;
      g.fillStyle = f[1];
      g.beginPath(); g.arc(fx, fy, 2.6, 0, TAU); g.fill();
      g.lineWidth = 1.2; g.stroke();
    }
  }

  function rockBottomCap(g, x, y, w, h, t, sprites) {
    // Jagged stalactite underside, kept within the cap rectangle
    g.beginPath();
    g.moveTo(x + 4, y);
    g.lineTo(x + w - 4, y);
    g.lineTo(x + w - 2, y + h * 0.55);
    const pts = [[0.9, 0.7], [0.82, 1.0], [0.72, 0.68], [0.6, 0.92], [0.48, 0.66], [0.36, 1.0], [0.24, 0.7], [0.14, 0.88], [0.06, 0.6]];
    for (const p of pts) g.lineTo(x + w * p[0], y + h * p[1]);
    g.lineTo(x + 2, y + h * 0.5);
    g.closePath();
    g.fillStyle = hgrad(g, x, x + w, [[0, OP.rock], [0.55, OP.rockShade], [1, OP.rockDark]]);
    g.fill();
    g.strokeStyle = OUT;
    g.lineWidth = 3;
    g.stroke();
    // Glowing crystal hanging from it
    const cx = x + w * 0.6, cy = y + h * 0.62;
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = 0.55 + Math.sin(t * 4 + x * 0.05) * 0.2;
    g.drawImage(sprites.cyanGlow, cx - 22, cy - 22, 44, 44);
    g.restore();
    g.beginPath();
    g.moveTo(cx, cy - 7); g.lineTo(cx + 5, cy); g.lineTo(cx, cy + 9); g.lineTo(cx - 5, cy);
    g.closePath();
    g.fillStyle = OP.crystalMid;
    g.fill();
    g.lineWidth = 2;
    g.stroke();
    // Vines draping over the edge
    g.strokeStyle = OP.grassShade;
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(x + 16, y - 22);
    g.quadraticCurveTo(x + 10, y - 2, x + 18, y + 12);
    g.moveTo(x + w - 22, y - 30);
    g.quadraticCurveTo(x + w - 14, y - 6, x + w - 24, y + 8);
    g.stroke();
    g.fillStyle = OP.grass;
    for (const l of [[x + 12, y - 6], [x + 17, y + 6], [x + w - 16, y - 12], [x + w - 21, y + 2]]) {
      ellipse(g, l[0], l[1], 4, 2.4, 0.6);
      g.fill();
    }
  }

  function crystalColumn(g, x, w, y0, y1, edgeY, t, seed, sprites) {
    const h = y1 - y0;
    if (h <= 0) return;
    g.fillStyle = hgrad(g, x, x + w, [[0, '#6556b0'], [0.15, OP.obsidian], [0.6, OP.obsidian], [0.7, OP.obsidianShade], [1, OP.obsidianShade]]);
    g.fillRect(x, y0, w, h);
    g.fillStyle = 'rgba(255,255,255,0.08)';
    g.fillRect(x + 8, y0, 9, h);
    // Runes, spaced from the cap edge
    const dir = edgeY > y0 + 1 ? -1 : 1;
    for (let i = 0; i < 30; i++) {
      const ry = edgeY + dir * (40 + i * 52);
      if (ry < y0 + 10 || ry > y1 - 10) { if (i > 0 && (ry < y0 - 60 || ry > y1 + 60)) break; continue; }
      const rx = x + w * 0.42;
      const a = 0.5 + 0.5 * Math.sin(t * 3 - i * 0.8 + seed);
      g.save();
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = 0.25 + a * 0.45;
      g.drawImage(sprites.cyanGlow, rx - 24, ry - 24, 48, 48);
      g.restore();
      g.strokeStyle = OP.rune;
      g.globalAlpha = 0.55 + a * 0.45;
      g.lineWidth = 2.2;
      g.beginPath();
      switch ((seed + i) % 4) {
        case 0: g.arc(rx, ry, 6, 0, TAU); g.moveTo(rx, ry - 10); g.lineTo(rx, ry + 10); break;
        case 1: g.moveTo(rx, ry - 8); g.lineTo(rx + 7, ry + 6); g.lineTo(rx - 7, ry + 6); g.closePath(); break;
        case 2: g.moveTo(rx, ry - 9); g.lineTo(rx + 7, ry); g.lineTo(rx, ry + 9); g.lineTo(rx - 7, ry); g.closePath(); g.moveTo(rx + 1.5, ry); g.arc(rx, ry, 1.5, 0, TAU); break;
        default: g.moveTo(rx - 7, ry - 6); g.lineTo(rx, ry - 1); g.lineTo(rx + 7, ry - 6); g.moveTo(rx - 7, ry + 2); g.lineTo(rx, ry + 7); g.lineTo(rx + 7, ry + 2);
      }
      g.stroke();
      g.globalAlpha = 1;
    }
    columnSides(g, x, w, y0, y1);
  }

  function crystalCap(g, x, y, w, h, pointsDown, t, moving, sprites) {
    const band = 9;
    const by = pointsDown ? y : y + h - band;
    const baseY = pointsDown ? y + band : y + h - band;
    const tipDir = pointsDown ? 1 : -1;
    // Energy glow on the gap side (visual only)
    const pulse = 0.5 + 0.5 * Math.sin(t * (moving ? 7 : 3.5) + x * 0.03);
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = (moving ? 0.5 : 0.32) + pulse * 0.25;
    const gy = pointsDown ? y + h : y;
    g.drawImage(sprites.cyanGlow, x - 6, gy - 26, w + 12, 52);
    g.restore();
    // Crystal shards
    const shards = [[0.12, 0.55, 15], [0.3, 0.85, 18], [0.5, 1.0, 22], [0.7, 0.8, 18], [0.88, 0.6, 15]];
    g.lineWidth = 2.2;
    g.strokeStyle = OUT;
    for (const s of shards) {
      const cx = x + w * s[0];
      const len = (h - band) * s[1];
      const hw = s[2] / 2;
      const tipY = baseY + tipDir * len;
      const midY = baseY + tipDir * len * 0.62;
      // left facet (light)
      g.beginPath();
      g.moveTo(cx - hw, baseY); g.lineTo(cx - hw, midY); g.lineTo(cx, tipY); g.lineTo(cx, baseY);
      g.closePath();
      g.fillStyle = OP.crystal;
      g.fill();
      // right facet (shade)
      g.beginPath();
      g.moveTo(cx + hw, baseY); g.lineTo(cx + hw, midY); g.lineTo(cx, tipY); g.lineTo(cx, baseY);
      g.closePath();
      g.fillStyle = OP.crystalShade;
      g.fill();
      g.beginPath();
      g.moveTo(cx - hw, baseY); g.lineTo(cx - hw, midY); g.lineTo(cx, tipY); g.lineTo(cx + hw, midY); g.lineTo(cx + hw, baseY);
      g.stroke();
    }
    // Gold frame band
    g.beginPath();
    g.rect(x + 2, by, w - 4, band);
    g.fillStyle = vgrad(g, by, by + band, [[0, '#fff0b0'], [0.5, OP.gold], [1, OP.goldShade]]);
    g.fill();
    g.lineWidth = 2.6;
    g.stroke();
    // Gem in the band
    g.fillStyle = '#ff7ad9';
    ellipse(g, x + w / 2, by + band / 2, 5, 3.4);
    g.fill();
    g.lineWidth = 1.6;
    g.stroke();
  }

  function drawObstacle(g, o, groundY, t, sprites) {
    const capH = CFG.capH, capW = CFG.capW;
    const top = o.gapY - o.gap / 2;
    const bot = o.gapY + o.gap / 2;
    const capX = o.x - (capW - o.w) / 2;
    const yTop = -40, yBottom = groundY + 24;
    g.save();
    g.lineJoin = 'round';
    g.lineCap = 'round';
    switch (o.type) {
      case 'tower':
        towerColumn(g, o.x, o.w, yTop, top - capH, false, sprites, t);
        towerCap(g, capX, top - capH, capW, capH, true);
        towerColumn(g, o.x, o.w, bot + capH, yBottom, true, sprites, t);
        towerCap(g, capX, bot, capW, capH, false);
        break;
      case 'rock':
        rockColumn(g, o.x, o.w, yTop, top - capH + 2, o.seed, top - capH);
        rockBottomCap(g, capX, top - capH, capW, capH, t, sprites);
        rockColumn(g, o.x, o.w, bot + capH - 4, yBottom, o.seed + 3, bot + capH);
        grassCap(g, capX, bot, capW, capH, t);
        break;
      default: // crystal
        crystalColumn(g, o.x, o.w, yTop, top - capH, top - capH, t, o.seed, sprites);
        crystalCap(g, capX, top - capH, capW, capH, true, t, o.amp > 0, sprites);
        crystalColumn(g, o.x, o.w, bot + capH, yBottom, bot + capH, t, o.seed + 1, sprites);
        crystalCap(g, capX, bot, capW, capH, false, t, o.amp > 0, sprites);
    }
    g.restore();
  }

  // ---------------------------------------------------------------------------
  // Scenery (pre-rendered, tileable horizontally)
  // ---------------------------------------------------------------------------
  function ridge(x, T, specs) {
    let y = 0;
    for (const s of specs) y += s.a * Math.pow(1 - Math.abs(Math.sin(Math.PI * s.k * x / T + s.p)), s.e);
    return y;
  }

  function cloudShape(g, x, y, w, light, shade) {
    const puffs = [[-0.36, 0.1, 0.2], [-0.15, -0.12, 0.27], [0.1, -0.2, 0.3], [0.32, 0.02, 0.22], [0.0, 0.12, 0.26]];
    g.fillStyle = shade;
    for (const p of puffs) { g.beginPath(); g.arc(x + p[0] * w, y + p[1] * w + w * 0.07, p[2] * w, 0, TAU); g.fill(); }
    g.fillStyle = light;
    for (const p of puffs) { g.beginPath(); g.arc(x + p[0] * w, y + p[1] * w, p[2] * w * 0.94, 0, TAU); g.fill(); }
  }

  function drawIsland(g, x, y, s, opts) {
    g.save();
    g.translate(x, y);
    g.scale(s, s);
    // Waterfall
    if (opts.waterfall) {
      g.fillStyle = vgrad(g, 2, 150, [[0, 'rgba(225,245,255,0.95)'], [1, 'rgba(225,245,255,0)']]);
      g.fillRect(38, 2, 8, 148);
      g.fillStyle = 'rgba(255,255,255,0.7)';
      g.fillRect(40, 2, 2, 120);
    }
    // Rocky underside
    g.beginPath();
    g.moveTo(-72, 0);
    const under = [[-62, 18], [-50, 28], [-42, 50], [-24, 58], [-14, 90], [-2, 76], [8, 112], [18, 70], [34, 58], [46, 34], [60, 22], [72, 0]];
    for (const p of under) g.lineTo(p[0], p[1]);
    g.closePath();
    g.fillStyle = hgrad(g, -72, 72, [[0, '#b7a6e0'], [0.5, '#9d8ad0'], [1, '#8571bf']]);
    g.fill();
    g.strokeStyle = 'rgba(110,90,170,0.5)';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(-50, 22); g.lineTo(-20, 30); g.lineTo(10, 26); g.lineTo(40, 32);
    g.moveTo(-30, 44); g.lineTo(0, 48); g.lineTo(22, 44);
    g.stroke();
    // Castle
    if (opts.castle) {
      const tw = (cx, w, h, roofC) => {
        g.fillStyle = '#d9d0f3';
        g.fillRect(cx - w / 2, -h, w, h);
        g.fillStyle = '#b8acdf';
        g.fillRect(cx + w * 0.15, -h, w * 0.35, h);
        g.fillStyle = roofC;
        g.beginPath();
        g.moveTo(cx - w / 2 - 4, -h); g.lineTo(cx, -h - w * 1.3); g.lineTo(cx + w / 2 + 4, -h);
        g.closePath();
        g.fill();
        g.fillStyle = '#ffd98a';
        g.fillRect(cx - 2, -h * 0.7, 4, 7);
      };
      tw(-30, 18, 54, '#7f96e6');
      tw(-8, 24, 36, '#6f86d6');
      tw(12, 14, 46, '#8fa4ee');
    }
    // Grass top
    ellipse(g, 0, 3, 74, 12);
    g.fillStyle = '#86c99a';
    g.fill();
    ellipse(g, 0, 0, 74, 11);
    g.fillStyle = '#b3e6a6';
    g.fill();
    // Trees
    for (const tr of opts.trees || []) {
      g.fillStyle = '#9b7aa8';
      g.fillRect(tr[0] - 2, -tr[1] * 0.9, 4, tr[1] * 0.9);
      g.fillStyle = '#79c492';
      g.beginPath(); g.arc(tr[0], -tr[1], tr[1] * 0.55, 0, TAU); g.fill();
      g.fillStyle = '#9edcaa';
      g.beginPath(); g.arc(tr[0] - tr[1] * 0.15, -tr[1] * 1.12, tr[1] * 0.32, 0, TAU); g.fill();
    }
    g.restore();
  }

  function buildBackground(W, H, groundY, pr) {
    const bgPr = Math.min(pr, 2);
    const rnd = PD.seeded(1337);

    // Sky (screen sized, static)
    const sky = makeCanvas(W, H, bgPr);
    {
      const g = sky.g;
      g.fillStyle = vgrad(g, 0, groundY, [
        [0, '#2c3482'], [0.32, '#5a55b8'], [0.58, '#a77bcf'], [0.8, '#f2a0bf'], [1, '#ffd2a6'],
      ]);
      g.fillRect(0, 0, W, H);
      // Stars
      for (let i = 0; i < 70; i++) {
        const x = rnd() * W, y = rnd() * H * 0.42;
        const a = (1 - y / (H * 0.42)) * (0.4 + rnd() * 0.6);
        g.fillStyle = `rgba(255,255,255,${a.toFixed(3)})`;
        const r = rnd() < 0.15 ? 1.6 : 0.9;
        g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
      }
      // Sun glow
      const sx = W * 0.7, sy = groundY - 150;
      const sg = g.createRadialGradient(sx, sy, 0, sx, sy, 300);
      sg.addColorStop(0, 'rgba(255,246,214,0.95)');
      sg.addColorStop(0.15, 'rgba(255,226,170,0.55)');
      sg.addColorStop(1, 'rgba(255,190,170,0)');
      g.fillStyle = sg;
      g.fillRect(0, 0, W, H);
      g.fillStyle = 'rgba(255,248,226,0.95)';
      g.beginPath(); g.arc(sx, sy, 40, 0, TAU); g.fill();
    }

    const layers = [];

    // Mountains + horizon cloud bank
    {
      const T = 1024, y0 = Math.round(H * 0.28), h = groundY + 8 - y0;
      const L = makeCanvas(T, h, bgPr);
      const g = L.g;
      g.translate(0, -y0);
      const far = [{ k: 3, a: 92, p: 0.3, e: 1.6 }, { k: 7, a: 44, p: 1.1, e: 2 }, { k: 13, a: 16, p: 2.0, e: 1 }];
      const near = [{ k: 4, a: 70, p: 2.2, e: 1.8 }, { k: 9, a: 28, p: 0.5, e: 1.5 }, { k: 17, a: 10, p: 1.4, e: 1 }];
      const yb1 = groundY - 112, yb2 = groundY - 52;
      const pathRidge = (yb, specs) => {
        g.beginPath();
        g.moveTo(0, groundY + 8);
        for (let x = 0; x <= T; x += 4) g.lineTo(x, yb - ridge(x, T, specs));
        g.lineTo(T, groundY + 8);
        g.closePath();
      };
      pathRidge(yb1, far);
      g.fillStyle = vgrad(g, yb1 - 150, groundY, [[0, '#a99be0'], [0.6, '#c0a3dc'], [1, '#efb7d0']]);
      g.fill();
      // Snow line on far peaks
      g.save();
      pathRidge(yb1, far);
      g.clip();
      g.beginPath();
      g.moveTo(0, yb1 - 300);
      g.lineTo(T, yb1 - 300);
      for (let x = T; x >= 0; x -= 8) g.lineTo(x, yb1 - 108 + Math.sin(x * 0.06) * 5 + Math.sin(x * 0.17) * 3);
      g.closePath();
      g.fillStyle = 'rgba(246,240,255,0.85)';
      g.fill();
      g.restore();
      pathRidge(yb2, near);
      g.fillStyle = vgrad(g, yb2 - 100, groundY, [[0, '#8a7cca'], [0.7, '#b391cf'], [1, '#e5a8c8']]);
      g.fill();
      // Horizon cloud bank (wraps across the tile edge)
      const bank = (yy, rMin, rMax, col, count) => {
        g.fillStyle = col;
        for (let i = 0; i < count; i++) {
          const x = (i / count) * T + rnd() * 20;
          const r = rMin + rnd() * (rMax - rMin);
          for (const ox of [-T, 0, T]) { g.beginPath(); g.arc(x + ox, yy + rnd() * 6, r, 0, TAU); g.fill(); }
        }
      };
      bank(groundY - 18, 22, 40, 'rgba(250,200,222,0.9)', 22);
      bank(groundY - 2, 20, 34, 'rgba(255,229,238,0.95)', 26);
      layers.push({ canvas: L.c, tileW: T, y: y0, h, f: 0.08, drift: 0 });
    }

    // Floating islands
    {
      const T = 1300, h = Math.round(groundY * 0.82);
      const L = makeCanvas(T, h, bgPr);
      const g = L.g;
      g.globalAlpha = 0.92;
      drawIsland(g, 230, H * 0.25, 0.95, { castle: true, waterfall: true, trees: [[40, 16], [56, 12]] });
      drawIsland(g, 690, H * 0.47, 0.55, { trees: [[-30, 14], [-12, 18], [24, 12]] });
      drawIsland(g, 1060, H * 0.17, 0.72, { waterfall: true, trees: [[-40, 15], [30, 18]] });
      layers.push({ canvas: L.c, tileW: T, y: 0, h, f: 0.2, drift: 0 });
    }

    // Clouds
    {
      const T = 1200, h = Math.round(H * 0.7);
      const L = makeCanvas(T, h, bgPr);
      const g = L.g;
      const clouds = [[120, 70, 150], [420, 150, 110], [640, 60, 190], [900, 190, 130], [1080, 95, 120], [300, 260, 90]];
      for (const c of clouds) cloudShape(g, c[0], c[1] * (H / 640), c[2], 'rgba(255,250,253,0.9)', 'rgba(236,206,236,0.85)');
      layers.push({ canvas: L.c, tileW: T, y: 0, h, f: 0.35, drift: 9 });
    }

    // Ground strip (scrolls at gameplay speed)
    const ground = (function () {
      const T = 512, y0 = groundY - 14, h = H - y0 + 30;
      const L = makeCanvas(T, h, Math.min(pr, 3));
      const g = L.g;
      g.translate(0, -y0);
      g.fillStyle = vgrad(g, groundY, H + 30, [[0, '#b7826d'], [0.45, '#8c5a66'], [1, '#5b3a58']]);
      g.fillRect(0, groundY, T, H + 30 - groundY);
      // Soil strata
      g.strokeStyle = 'rgba(70,40,70,0.22)';
      g.lineWidth = 3;
      for (let k = 0; k < 3; k++) {
        const yy = groundY + 30 + k * 18;
        g.beginPath();
        for (let x = 0; x <= T; x += 8) g.lineTo(x, yy + Math.sin(2 * Math.PI * (k + 2) * x / T + k) * 4);
        g.stroke();
      }
      // Pebbles
      const pr2 = PD.seeded(99);
      for (let i = 0; i < 26; i++) {
        const x = 12 + pr2() * (T - 24), y = groundY + 24 + pr2() * (H - groundY - 20);
        ellipse(g, x, y, 3 + pr2() * 4, 2 + pr2() * 2.5);
        g.fillStyle = pr2() < 0.5 ? 'rgba(255,220,200,0.25)' : 'rgba(60,30,60,0.25)';
        g.fill();
      }
      // Grass
      const gy = (x) => groundY - 6 + 2.5 * Math.sin(2 * Math.PI * 8 * x / T) + 1.5 * Math.sin(2 * Math.PI * 21 * x / T + 1);
      const scal = (x, base, amp) => base + amp * Math.abs(Math.sin(Math.PI * x / 32));
      g.beginPath();
      g.moveTo(0, gy(0));
      for (let x = 0; x <= T; x += 4) g.lineTo(x, gy(x));
      for (let x = T; x >= 0; x -= 4) g.lineTo(x, scal(x, groundY + 13, 6));
      g.closePath();
      g.fillStyle = OP.grassShade;
      g.fill();
      g.strokeStyle = OUT;
      g.lineWidth = 2.5;
      g.stroke();
      g.beginPath();
      g.moveTo(0, gy(0));
      for (let x = 0; x <= T; x += 4) g.lineTo(x, gy(x));
      for (let x = T; x >= 0; x -= 4) g.lineTo(x, scal(x + 16, groundY + 6, 5));
      g.closePath();
      g.fillStyle = vgrad(g, groundY - 8, groundY + 10, [[0, OP.grassLight], [0.35, OP.grass], [1, '#74c766']]);
      g.fill();
      // Crisp top outline
      g.beginPath();
      g.moveTo(-2, gy(0));
      for (let x = 0; x <= T + 2; x += 4) g.lineTo(x, gy(x));
      g.strokeStyle = OUT;
      g.lineWidth = 3;
      g.stroke();
      // Tufts & flowers
      const fr = PD.seeded(7);
      g.strokeStyle = '#4f9a58';
      g.lineWidth = 2;
      for (let i = 0; i < 18; i++) {
        const x = 10 + fr() * (T - 20), y = gy(x) + 2;
        g.beginPath();
        g.moveTo(x - 4, y - 5); g.lineTo(x, y); g.lineTo(x + 1, y - 7); g.moveTo(x, y); g.lineTo(x + 5, y - 5);
        g.stroke();
      }
      const fcols = ['#ffffff', '#ffd166', '#ff9db4', '#bfa8ff'];
      for (let i = 0; i < 14; i++) {
        const x = 10 + fr() * (T - 20), y = gy(x) + 3 + fr() * 5;
        g.fillStyle = fcols[i % 4];
        g.beginPath(); g.arc(x, y, 2.4, 0, TAU); g.fill();
        g.fillStyle = '#ffb347';
        g.beginPath(); g.arc(x, y, 0.9, 0, TAU); g.fill();
      }
      return { canvas: L.c, tileW: T, y: y0, h, f: 1, drift: 0 };
    })();

    return { sky: sky.c, layers, ground };
  }

  PD.Art = { buildSprites, buildBackground, drawDragon, drawOrb, drawObstacle, star4, OUT, DP };
})();
