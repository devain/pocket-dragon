/* Pocket Dragon — dragon art, assembled from parts.
 * A dragon's `look` (see dragons.js) picks one entry from each part registry
 * below plus a palette. Every part uses the shared sticker style: plum
 * outlines, flat cel fills with soft gradients. Local space: facing right,
 * body centre ≈ (0,0), roughly 86×58 units before scaling. */
(function () {
  'use strict';
  const PD = window.PD;
  const TAU = Math.PI * 2;
  const OUT = PD.Art.OUT;
  const LW = 2.6; // standard outline width

  // --- tiny helpers ------------------------------------------------------------
  function ellipse(g, x, y, rx, ry, rot) {
    g.beginPath();
    g.ellipse(x, y, rx, ry, rot || 0, 0, TAU);
  }
  function lgrad(g, x0, y0, x1, y1, stops) {
    const gr = g.createLinearGradient(x0, y0, x1, y1);
    for (const s of stops) gr.addColorStop(s[0], s[1]);
    return gr;
  }
  /** Fill+outline a union of circles as one blob. */
  function blob(g, circles, fill) {
    for (const c of circles) { g.beginPath(); g.arc(c[0], c[1], c[2], 0, TAU); g.stroke(); }
    g.fillStyle = fill;
    for (const c of circles) { g.beginPath(); g.arc(c[0], c[1], c[2], 0, TAU); g.fill(); }
  }
  /** Thick outlined stroke along the current path. */
  function tube(g, width, color, T) {
    g.strokeStyle = T ? '#fff' : OUT;
    g.lineWidth = width + 2.8;
    g.stroke();
    g.strokeStyle = T ? '#fff' : color;
    g.lineWidth = width;
    g.stroke();
  }

  // =============================================================================
  // Wings — drawn in the wing's local frame (pivot at the shoulder, pointing up
  // and back). `c` = { light, mid, dark, bone } chosen for near/far wing.
  // =============================================================================
  const WINGS = {
    // Emerald: classic leathery membrane, two finger bones.
    bat: {
      tip: { x: -25, y: -23 },
      draw(g, c, P, T, back) {
        g.beginPath();
        g.moveTo(2, 3); g.lineTo(-3, -17); g.lineTo(-13, -33);
        g.quadraticCurveTo(-17, -25, -25, -23);
        g.quadraticCurveTo(-24, -14, -30, -8);
        g.quadraticCurveTo(-17, -8, -9, 5);
        g.closePath();
        g.fillStyle = T ? '#fff' : lgrad(g, 0, -33, 0, 5, [[0, c.light], [0.45, c.mid], [1, c.dark]]);
        g.fill(); g.lineWidth = 2.4; g.stroke();
        g.beginPath();
        g.moveTo(-3, -17); g.lineTo(-25, -23);
        g.moveTo(-3, -17); g.lineTo(-30, -8);
        g.lineWidth = 1.6; g.strokeStyle = T ? '#fff' : c.dark; g.stroke();
        g.beginPath(); g.moveTo(2, 3); g.lineTo(-3, -17); g.lineTo(-13, -33);
        tube(g, 3, c.bone, T);
      },
    },
    // Frost: broad wing of soft scalloped feathers, frosted tips.
    feather: {
      tip: { x: -30, y: -26 },
      draw(g, c, P, T, back) {
        const pts = [[-11, -37], [-20, -36], [-27, -30], [-32, -21], [-33, -11], [-28, -2], [-19, 4], [-9, 7]];
        g.beginPath();
        g.moveTo(2, 3); g.lineTo(-2, -18); g.lineTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < pts.length; i++) {
          const a = pts[i - 1], b = pts[i];
          const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
          const dx = mx + 12, dy = my + 14, l = Math.hypot(dx, dy) || 1;
          g.quadraticCurveTo(mx + dx / l * 5, my + dy / l * 5, b[0], b[1]);
        }
        g.closePath();
        g.fillStyle = T ? '#fff' : lgrad(g, 0, 0, -30, -28, [[0, c.light], [0.55, c.mid], [1, c.dark]]);
        g.fill(); g.lineWidth = 2.4; g.stroke();
        // feather quills fanning from the wrist
        g.beginPath();
        for (let i = 1; i < pts.length - 1; i++) { g.moveTo(-4, -12); g.lineTo(pts[i][0] * 0.82 - 0.7, pts[i][1] * 0.82 - 2); }
        g.lineWidth = 1.3; g.strokeStyle = T ? '#fff' : c.dark; g.globalAlpha *= 0.7; g.stroke(); g.globalAlpha /= 0.7;
        // covert feathers: a soft inner row
        if (!T) {
          g.beginPath();
          g.moveTo(-1, -14); g.quadraticCurveTo(-14, -18, -20, -8); g.quadraticCurveTo(-12, -2, -2, 2);
          g.fillStyle = c.light; g.globalAlpha *= 0.75; g.fill(); g.globalAlpha /= 0.75;
        }
        g.beginPath(); g.moveTo(2, 3); g.lineTo(-2, -18); g.lineTo(-11, -37);
        tube(g, 3, c.bone, T);
      },
    },
    // Blaze: short, sharp, jagged wing with a hooked claw.
    blade: {
      tip: { x: -21, y: -22 },
      draw(g, c, P, T, back) {
        g.beginPath();
        g.moveTo(2, 3); g.lineTo(-2, -14); g.lineTo(-9, -30);
        g.quadraticCurveTo(-11, -22, -21, -22);
        g.quadraticCurveTo(-15, -15, -25, -10);
        g.quadraticCurveTo(-16, -6, -15, 1);
        g.quadraticCurveTo(-9, 0, -6, 5);
        g.closePath();
        g.fillStyle = T ? '#fff' : lgrad(g, 0, -30, 0, 5, [[0, c.light], [0.4, c.mid], [1, c.dark]]);
        g.fill(); g.lineWidth = 2.4; g.stroke();
        g.beginPath();
        g.moveTo(-2, -14); g.lineTo(-21, -22);
        g.moveTo(-2, -14); g.lineTo(-25, -10);
        g.moveTo(-2, -14); g.lineTo(-15, 1);
        g.lineWidth = 1.6; g.strokeStyle = T ? '#fff' : c.dark; g.stroke();
        g.beginPath(); g.moveTo(2, 3); g.lineTo(-2, -14); g.lineTo(-9, -30);
        tube(g, 3.4, c.bone, T);
        // claw
        g.beginPath();
        g.moveTo(-10.5, -28); g.quadraticCurveTo(-9, -36, -4, -37); g.quadraticCurveTo(-7, -33, -7, -29);
        g.closePath();
        g.fillStyle = T ? '#fff' : P.horn; g.fill(); g.strokeStyle = T ? '#fff' : OUT; g.lineWidth = 2; g.stroke();
      },
    },
    // Mystic: translucent moth wings, fore + hind lobes with eye-spots.
    moth: {
      tip: { x: -28, y: -32 },
      draw(g, c, P, T, back) {
        const fillA = T ? 1 : 0.86;
        const fill = T ? '#fff' : lgrad(g, 0, 0, -28, -32, [[0, c.light], [0.5, c.mid], [1, c.dark]]);
        // hind wing
        g.beginPath();
        g.moveTo(0, 4); g.bezierCurveTo(-10, -4, -30, -8, -27, 4); g.bezierCurveTo(-24, 12, -8, 11, 0, 4);
        g.globalAlpha *= fillA; g.fillStyle = fill; g.fill(); g.globalAlpha /= fillA;
        g.lineWidth = 2.2; g.stroke();
        // fore wing
        g.beginPath();
        g.moveTo(1, 1); g.bezierCurveTo(-2, -26, -24, -44, -29, -30); g.bezierCurveTo(-32, -20, -18, -8, 1, 1);
        g.globalAlpha *= fillA; g.fillStyle = fill; g.fill(); g.globalAlpha /= fillA;
        g.lineWidth = 2.2; g.stroke();
        if (T) return;
        // veins
        g.beginPath();
        g.moveTo(0, 0); g.quadraticCurveTo(-10, -22, -24, -34);
        g.moveTo(0, 0); g.quadraticCurveTo(-16, -16, -28, -24);
        g.moveTo(0, 4); g.quadraticCurveTo(-12, 2, -24, 3);
        g.lineWidth = 1.1; g.strokeStyle = c.dark; g.globalAlpha *= 0.6; g.stroke(); g.globalAlpha /= 0.6;
        // eye-spots
        g.strokeStyle = OUT; g.lineWidth = 1.6;
        ellipse(g, -19, -25, 4.6, 4.2, 0.5); g.fillStyle = P.horn; g.fill(); g.stroke();
        ellipse(g, -19, -25, 2, 2); g.fillStyle = P.iris; g.fill();
        g.fillStyle = '#fff'; g.beginPath(); g.arc(-18, -26.3, 0.9, 0, TAU); g.fill();
        ellipse(g, -17, 4, 2.6, 2.3); g.fillStyle = P.horn; g.fill(); g.stroke();
      },
    },
  };

  function drawWing(g, look, wingT, px, py, back, T, fold) {
    const P = look.palette;
    g.save();
    g.translate(px, py);
    g.rotate(PD.lerp(0.32, -1.5, wingT));
    const s = (look.wingScale || 1) * (back ? 0.86 : 1);
    g.scale(s, s);
    // fold: 0 = membrane fully open (power stroke), 1 = tucked (recovery / dive)
    if (fold) g.scale(1 - 0.3 * fold, 1 - 0.42 * fold);
    g.strokeStyle = T ? '#fff' : OUT;
    g.lineJoin = 'round';
    const c = back
      ? { light: P.wingBack, mid: P.wingBack, dark: P.wingBackDark, bone: P.bodyShade }
      : { light: P.wingLight, mid: P.wing, dark: P.wingDark, bone: P.body };
    (WINGS[look.wing] || WINGS.bat).draw(g, c, P, T, back);
    g.restore();
  }

  // =============================================================================
  // Tails — (tx, ty) is the tail end, already swayed and dragged by motion.
  // =============================================================================
  function tailBody(g, P, T, tx, ty, thick) {
    g.beginPath();
    g.moveTo(-12, -4 - thick);
    g.quadraticCurveTo(-26, 0 - thick, tx, ty);
    g.quadraticCurveTo(-30, 8 + thick, -10, 14 + thick);
    g.closePath();
    g.fillStyle = T ? '#fff' : P.bodyShade;
    g.fill(); g.stroke();
  }
  const TAILS = {
    spade(g, P, T, tx, ty) {
      tailBody(g, P, T, tx, ty, 0);
      g.beginPath();
      g.moveTo(tx + 4, ty + 2);
      g.quadraticCurveTo(tx - 1, ty - 9, tx - 12, ty - 10);
      g.quadraticCurveTo(tx - 7, ty - 1, tx - 11, ty + 6);
      g.quadraticCurveTo(tx - 3, ty + 5, tx + 4, ty + 2);
      g.fillStyle = T ? '#fff' : P.spike; g.fill(); g.stroke();
    },
    // Frost: long tail ending in a soft snowy plume.
    plume(g, P, T, tx, ty, t) {
      tx -= 4;
      tailBody(g, P, T, tx, ty, -1);
      const w = Math.sin(t * 3.1) * 1.2;
      blob(g, [[tx - 1, ty - 3, 6], [tx - 8, ty + 1 + w, 5.5], [tx - 5, ty + 6, 4.8], [tx - 11, ty - 4 - w, 4]], T ? '#fff' : P.belly);
      if (!T) {
        g.fillStyle = P.wingDark; g.globalAlpha *= 0.5;
        ellipse(g, tx - 7, ty + 3, 2.5, 1.6); g.fill(); g.globalAlpha /= 0.5;
      }
    },
    // Blaze: stout tail with a living flame at the tip.
    flame(g, P, T, tx, ty, t) {
      tailBody(g, P, T, tx + 2, ty, 1.5);
      g.save();
      g.translate(tx - 1, ty - 1);
      g.rotate(-1.15 + Math.sin(t * 6) * 0.12);
      if (T) { PD.Art.flame(g, 6.5, t, '#fff', true); }
      else {
        PD.Art.flame(g, 6.5, t * 1.6, '#ff8a3d', true);
        g.translate(0, 1.5);
        PD.Art.flame(g, 3.8, t * 1.6 + 1, '#ffe27a', false);
      }
      g.restore();
    },
    // Mystic: slender curling wisp with a star at the tip.
    wisp(g, P, T, tx, ty, t) {
      g.beginPath();
      g.moveTo(-10, 6);
      g.bezierCurveTo(-22, 10, -30, 2, tx, ty);
      g.arc(tx + 3, ty - 1, 3.4, Math.PI, Math.PI * 2.6, false);
      g.lineCap = 'round';
      tube(g, 4.5, P.bodyShade, T);
      g.save();
      g.translate(tx - 3, ty - 4);
      g.rotate(t * 1.5);
      g.fillStyle = T ? '#fff' : P.horn;
      g.strokeStyle = T ? '#fff' : OUT; g.lineWidth = 1.8;
      PD.Art.star4(g, 0, 0, 7); g.stroke();
      g.restore();
    },
  };

  // =============================================================================
  // Back decoration (between tail and body)
  // =============================================================================
  function plates(g, specs, fill, shape) {
    g.fillStyle = fill;
    for (const s of specs) {
      g.save(); g.translate(s[0], s[1]); g.rotate(s[2]);
      g.beginPath(); shape(g); g.closePath(); g.fill(); g.stroke();
      g.restore();
    }
  }
  const BACKS = {
    spikes(g, P, T) {
      plates(g, [[-5, -11, -0.25], [-14, -9, -0.7], [-20, -3, -1.15]], T ? '#fff' : P.spike,
        (g) => { g.moveTo(-4.5, 3); g.lineTo(0, -7); g.lineTo(4.5, 3); });
    },
    // Frost: a crest of ice shards.
    icicles(g, P, T) {
      plates(g, [[-4, -10, -0.2], [-12, -9, -0.6], [-19, -4, -1.05]], T ? '#fff' : lgrad(g, 0, -12, 0, 4, [[0, '#ffffff'], [1, P.spike]]),
        (g) => { g.moveTo(-3, 3); g.lineTo(-0.5, -11); g.lineTo(3, 2); g.lineTo(0, 5); });
    },
    // Blaze: a row of dark, swept-back armour plates.
    ridge(g, P, T) {
      plates(g, [[0, -12, -0.05], [-8, -11, -0.45], [-15, -7, -0.85], [-21, -1, -1.2]], T ? '#fff' : P.spike,
        (g) => { g.moveTo(-5, 3); g.lineTo(-3, -10); g.lineTo(5, 3); });
    },
    // Mystic: a soft fluffy mane.
    mane(g, P, T) {
      blob(g, [[-2, -11, 5.2], [-10, -10, 4.8], [-17, -5, 4.2]], T ? '#fff' : P.spike);
    },
  };

  // =============================================================================
  // Horns / crest (behind the head)
  // =============================================================================
  function horn(g, bx, by, tx, ty, fill) {
    g.beginPath();
    g.moveTo(bx - 5, by + 3);
    g.quadraticCurveTo(bx - 5, ty + 7, tx, ty);
    g.quadraticCurveTo(bx + 3, by - 6, bx + 5, by + 3);
    g.closePath();
    g.fillStyle = fill; g.fill(); g.stroke();
  }
  function frill(g, fill) {
    g.beginPath();
    g.moveTo(4, -16);
    g.quadraticCurveTo(-6, -21, -13, -15);
    g.quadraticCurveTo(-5, -12, -9, -5);
    g.quadraticCurveTo(0, -8, 4, -6);
    g.closePath();
    g.fillStyle = fill; g.fill(); g.stroke();
  }
  const HORNS = {
    nubs(g, P, T) {
      horn(g, 4, -22, -7, -34, T ? '#fff' : P.hornShade);
      horn(g, 13, -24, 3, -39, T ? '#fff' : P.horn);
      frill(g, T ? '#fff' : P.frill);
    },
    // Frost: slender swept-back ice horns + a fluffy ear tuft.
    crystal(g, P, T) {
      const f = (bx, by, tx, ty, col) => {
        g.beginPath();
        g.moveTo(bx - 4.5, by + 2); g.quadraticCurveTo(bx - 6, ty + 10, tx, ty); g.quadraticCurveTo(bx + 1.5, by - 6, bx + 4.5, by + 2);
        g.closePath(); g.fillStyle = col; g.fill(); g.stroke();
      };
      f(3, -20, -14, -32, T ? '#fff' : P.hornShade);
      f(11, -23, -4, -40, T ? '#fff' : lgrad(g, 0, -40, 0, -20, [[0, '#ffffff'], [1, P.horn]]));
      blob(g, [[-3, -14, 5], [-9, -11, 4], [-6, -7, 3.6]], T ? '#fff' : P.frill);
    },
    // Blaze: thick curled ram horns.
    ram(g, P, T) {
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(9, -21); g.bezierCurveTo(8, -33, -5, -34, -7, -25); g.bezierCurveTo(-8, -19, -3, -16, 0, -19);
      tube(g, 5.5, P.hornShade, T);
      g.beginPath();
      g.moveTo(17, -22); g.bezierCurveTo(17, -36, 1, -39, -1, -29); g.bezierCurveTo(-2, -22, 4, -19, 7, -22);
      tube(g, 6.5, P.horn, T);
      if (!T) {
        g.beginPath(); g.moveTo(13, -31); g.quadraticCurveTo(6, -35, 2, -30);
        g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 1.6; g.stroke();
        g.strokeStyle = OUT;
      }
      g.lineWidth = LW;
    },
    // Mystic: curling antennae with glowing tips + soft frill.
    antennae(g, P, T, t) {
      frill(g, T ? '#fff' : P.frill);
      g.lineCap = 'round';
      const sway = Math.sin(t * 2.2) * 1.5;
      const ant = (bx, by, cx, cy, ex, ey) => {
        g.beginPath(); g.moveTo(bx, by); g.quadraticCurveTo(cx, cy, ex, ey);
        tube(g, 2, P.bodyShade, T);
        g.lineWidth = LW; g.strokeStyle = T ? '#fff' : OUT;
        g.beginPath(); g.arc(ex, ey, 3.6, 0, TAU);
        g.fillStyle = T ? '#fff' : P.gem; g.fill(); g.stroke();
        if (!T) { g.fillStyle = '#fff'; g.beginPath(); g.arc(ex - 1, ey - 1.2, 1.2, 0, TAU); g.fill(); }
      };
      ant(7, -22, 0, -36, -6 + sway, -42);
      ant(14, -24, 14, -40, 22 + sway, -45);
    },
  };

  // =============================================================================
  // Faces — eyes carry most of the personality.
  // =============================================================================
  function eyeBall(g, P, ex, ey, rx, ry) {
    ellipse(g, ex, ey, rx, ry);
    g.fillStyle = '#ffffff'; g.fill(); g.lineWidth = 2.2; g.stroke();
    ellipse(g, ex + 1.6, ey + 0.8, rx * 0.72, ry * 0.77);
    g.fillStyle = lgrad(g, 0, ey - 6, 0, ey + 7, [[0, P.iris], [1, P.irisLight]]);
    g.fill();
    ellipse(g, ex + 2, ey + 0.4, rx * 0.39, ry * 0.42);
    g.fillStyle = '#120a20'; g.fill();
  }
  /** Cover the top of an eye with an eyelid (body colour) down to `lidY`, optionally tilted. */
  function lid(g, P, ex, ey, rx, ry, lidY, tilt) {
    g.save();
    ellipse(g, ex, ey, rx, ry); g.clip();
    g.beginPath();
    g.moveTo(ex - rx - 1, lidY - tilt); g.lineTo(ex + rx + 1, lidY + tilt);
    g.lineTo(ex + rx + 1, ey - ry - 2); g.lineTo(ex - rx - 1, ey - ry - 2); g.closePath();
    g.fillStyle = P.body; g.fill();
    g.restore();
    g.beginPath();
    g.moveTo(ex - rx + 0.5, lidY - tilt); g.lineTo(ex + rx - 0.5, lidY + tilt);
    g.lineWidth = 2.6; g.stroke();
  }
  const FACES = {
    bright: {
      eye(g, P, ex, ey) {
        eyeBall(g, P, ex, ey, 7.2, 8.6);
        g.fillStyle = '#ffffff';
        g.beginPath(); g.arc(ex + 3.6, ey - 2.4, 2.2, 0, TAU); g.fill();
        g.beginPath(); g.arc(ex - 0.2, ey + 4, 1.1, 0, TAU); g.fill();
        g.beginPath(); g.ellipse(ex, ey, 7.2, 8.6, 0, Math.PI * 1.12, Math.PI * 1.9); g.lineWidth = 3.4; g.stroke();
      },
      mouth(g, P, mx) {
        g.beginPath(); g.moveTo(25.5 + mx, 3.5); g.quadraticCurveTo(30 + mx, 7, 34 + mx, 2.5); g.stroke();
        fang(g, 28 + mx);
      },
    },
    // Frost: serene, heavy-lidded, long lashes.
    calm: {
      eye(g, P, ex, ey) {
        eyeBall(g, P, ex, ey, 7, 8.2);
        g.fillStyle = '#ffffff';
        g.beginPath(); g.arc(ex + 3.2, ey + 0.5, 1.8, 0, TAU); g.fill();
        lid(g, P, ex, ey, 7, 8.2, ey - 1.5, 0.8);
        g.beginPath();
        g.moveTo(ex - 6.5, ey - 1.6); g.quadraticCurveTo(ex - 9.5, ey - 3, ex - 10.5, ey - 6);
        g.moveTo(ex - 4.5, ey - 1.8); g.quadraticCurveTo(ex - 6.5, ey - 5, ex - 6.5, ey - 7.5);
        g.lineWidth = 1.8; g.stroke();
      },
      mouth(g, P, mx) {
        g.beginPath(); g.moveTo(26.5 + mx, 3.2); g.quadraticCurveTo(29.5 + mx, 5.5, 32.5 + mx, 3); g.stroke();
      },
    },
    // Blaze: narrowed eye under a determined brow, toothy grin.
    fierce: {
      eye(g, P, ex, ey) {
        eyeBall(g, P, ex, ey, 7, 8);
        g.fillStyle = '#ffffff';
        g.beginPath(); g.arc(ex + 3.4, ey + 0.4, 1.7, 0, TAU); g.fill();
        lid(g, P, ex, ey, 7, 8, ey - 2.5, 2.4);
        g.beginPath(); g.moveTo(ex - 8, ey - 9.5); g.lineTo(ex + 8.5, ey - 4.5);
        g.lineWidth = 4.2; g.stroke();
      },
      mouth(g, P, mx) {
        g.beginPath(); g.moveTo(23.5 + mx, 2); g.quadraticCurveTo(29 + mx, 8, 34.5 + mx, 1); g.stroke();
        fang(g, 26.5 + mx); fang(g, 30.5 + mx);
      },
    },
    // Mystic: huge starry eye.
    dreamy: {
      eye(g, P, ex, ey) {
        eyeBall(g, P, ex, ey, 7.6, 9);
        g.fillStyle = '#ffffff';
        PD.Art.star4(g, ex + 3.4, ey - 2.6, 3.4);
        g.beginPath(); g.arc(ex - 0.4, ey + 4.2, 1.2, 0, TAU); g.fill();
        g.beginPath(); g.arc(ex + 3.4, ey + 3.4, 0.7, 0, TAU); g.fill();
        g.beginPath(); g.ellipse(ex, ey, 7.6, 9, 0, Math.PI * 1.12, Math.PI * 1.9); g.lineWidth = 3.2; g.stroke();
        g.beginPath(); g.moveTo(ex + 5.5, ey - 6.5); g.lineTo(ex + 8, ey - 9.5); g.lineWidth = 1.8; g.stroke();
      },
      mouth(g, P, mx) {
        g.beginPath();
        g.moveTo(26 + mx, 3); g.quadraticCurveTo(28 + mx, 6, 30 + mx, 3.2); g.quadraticCurveTo(32 + mx, 6, 34 + mx, 2.5);
        g.stroke();
      },
    },
  };
  function fang(g, x) {
    g.beginPath(); g.moveTo(x, 4.8); g.lineTo(x + 1, 7.6); g.lineTo(x + 2.2, 5.2);
    g.fillStyle = '#ffffff'; g.fill(); g.lineWidth = 1; g.stroke(); g.lineWidth = 2;
  }

  function drawFace(g, d, look) {
    const P = look.palette;
    const ex = 17, ey = -11;
    const mx = ((look.head.snout || 1) - 1) * 16;
    g.strokeStyle = OUT;
    g.lineCap = 'round';
    if (d.mood === 'hit') {
      g.beginPath();
      for (let i = 0; i <= 28; i++) {
        const a = i * 0.45 + d.time * 9, r = 0.6 + i * 0.22;
        const px = ex + Math.cos(a) * r, py = ey + Math.sin(a) * r;
        if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
      }
      g.lineWidth = 2; g.stroke();
      ellipse(g, 30 + mx, 5, 2.6, 3.2);
      g.fillStyle = P.mouth; g.fill(); g.lineWidth = 1.8; g.stroke();
      return;
    }
    const face = FACES[look.face] || FACES.bright;
    if (d.mood === 'happy') {
      g.beginPath(); g.moveTo(11, -9); g.quadraticCurveTo(17, -18, 23, -9); g.lineWidth = 3; g.stroke();
    } else if (d.blink > 0) {
      g.beginPath(); g.moveTo(10.5, -11); g.quadraticCurveTo(17, -6, 23.5, -11); g.lineWidth = 3; g.stroke();
    } else {
      face.eye(g, P, ex, ey);
    }
    g.lineWidth = 2;
    if (d.mood === 'happy') {
      g.beginPath();
      g.moveTo(25 + mx, 2.5); g.quadraticCurveTo(30 + mx, 12, 35 + mx, 1.5); g.closePath();
      g.fillStyle = P.mouth; g.fill(); g.stroke();
      ellipse(g, 30 + mx, 6.5, 2.6, 1.6); g.fillStyle = P.tongue; g.fill();
    } else {
      face.mouth(g, P, mx);
    }
  }

  // =============================================================================
  // Extras — accessories / marks. `behind` parts draw before the body.
  // =============================================================================
  const EXTRAS = {
    scarf: {
      behind(g, P, T, d) {
        // Trailing ends flutter in the wind, faster when flying fast.
        const t = d.time, tl = d.tail || 0;
        g.lineCap = 'round';
        for (let i = 0; i < 2; i++) {
          const ph = t * 9 + i * 1.7;
          const ey = -4 + i * 5 + tl * 4;
          g.beginPath();
          g.moveTo(2, -1 + i * 2);
          g.bezierCurveTo(-8, ey - 4 + Math.sin(ph) * 3, -16, ey + Math.sin(ph + 1.3) * 4, -24 + i * 3, ey + Math.sin(ph + 2.2) * 5);
          tube(g, 5 - i, i ? P.scarfShade : P.scarf, T);
        }
        g.lineWidth = LW;
      },
      front(g, P, T) {
        g.lineCap = 'round';
        g.beginPath(); g.moveTo(-2, -4); g.quadraticCurveTo(6, 9, 18, 4);
        tube(g, 6.5, P.scarf, T);
        if (!T) {
          g.beginPath();
          for (const x of [2, 7, 12]) { g.moveTo(x, 1 + (x - 7) * 0.1); g.lineTo(x + 1.5, 6.5); }
          g.strokeStyle = P.scarfShade; g.lineWidth = 1.4; g.stroke();
        }
        g.strokeStyle = T ? '#fff' : OUT; g.lineWidth = LW;
      },
    },
    gem: {
      front(g, P, T, d) {
        const x = 14, y = -22;
        if (!T) {
          g.save();
          g.globalAlpha *= 0.35 + 0.2 * Math.sin(d.time * 3);
          g.fillStyle = P.glow;
          g.beginPath(); g.arc(x, y, 7, 0, TAU); g.fill();
          g.restore();
        }
        g.beginPath();
        g.moveTo(x, y - 5); g.lineTo(x + 3.6, y); g.lineTo(x, y + 4); g.lineTo(x - 3.6, y); g.closePath();
        g.fillStyle = T ? '#fff' : P.gem; g.fill(); g.lineWidth = 1.8; g.stroke();
        if (!T) { g.fillStyle = '#fff'; g.beginPath(); g.arc(x - 1, y - 1.5, 1, 0, TAU); g.fill(); }
        g.lineWidth = LW;
      },
    },
    stars: {
      body(g, P, T) {
        if (T) return;
        g.fillStyle = P.bodyLight;
        g.globalAlpha *= 0.85;
        PD.Art.star4(g, -12, 0, 2.6); PD.Art.star4(g, -6, 12, 2); PD.Art.star4(g, -17, 9, 1.6);
        g.globalAlpha /= 0.85;
      },
    },
  };
  function extras(stage, g, look, T, d) {
    for (const id of look.extras || []) {
      const e = EXTRAS[id];
      if (e && e[stage]) e[stage](g, look.palette, T, d);
    }
  }

  // =============================================================================
  // Assembly
  // =============================================================================
  /** d: { x, y, rot, scale, sx, sy, wingT, wingLag, fold, tail, blink, mood, time, tint, look } */
  function drawDragon(g, d) {
    const look = d.look || PD.Dragons.list[0].look;
    const P = look.palette;
    const T = !!d.tint;
    const C = (k) => (T ? '#ffffff' : P[k]);
    const t = d.time;
    const B = look.body, H = look.head, sn = H.snout || 1;

    g.save();
    g.translate(d.x, d.y);
    g.rotate(d.rot);
    g.scale(d.scale * d.sx, d.scale * d.sy);
    g.lineJoin = 'round';
    g.lineCap = 'round';
    const reset = () => { g.strokeStyle = T ? '#fff' : OUT; g.lineWidth = LW; };
    reset();

    // Far wing (slightly lagging the near wing for depth)
    const lag = d.wingLag == null ? d.wingT : d.wingLag;
    drawWing(g, look, PD.clamp(lag * 0.92 + 0.04, -0.1, 1.05), -9, -9, true, T, d.fold || 0);
    reset();

    // Tail sways gently and trails the motion (drags down on climbs, lifts in dives).
    const tl = d.tail || 0;
    const sw = Math.sin(t * 4.2) * 3 * (1 - Math.min(1, Math.abs(tl)) * 0.5);
    (TAILS[look.tail] || TAILS.spade)(g, P, T, -36 + Math.abs(tl) * 2, -8 + sw + tl * 9, t);
    reset();
    extras('behind', g, look, T, d);
    reset();
    (BACKS[look.back] || BACKS.spikes)(g, P, T);
    reset();

    // Feet
    const fy = 4 + B.ry - 3;
    g.fillStyle = C('bodyShade');
    ellipse(g, -12, fy - 2, 5.5, 4.5, 0.3); g.fill(); g.stroke();
    ellipse(g, 3, fy, 5.5, 4.5, -0.2); g.fill(); g.stroke();

    // Body
    ellipse(g, -4, 4, B.rx, B.ry);
    g.fillStyle = T ? '#fff' : lgrad(g, 0, 4 - B.ry, 0, 4 + B.ry, [[0, P.bodyLight], [0.35, P.body], [1, P.bodyShade]]);
    g.fill(); g.stroke();
    extras('body', g, look, T, d);

    // Belly
    if (!T) {
      g.save();
      g.translate(4, 9);
      g.rotate(-0.35);
      ellipse(g, 0, 0, 11, 8.5);
      g.fillStyle = lgrad(g, 0, -8, 0, 8, [[0, '#fff6e8'], [1, P.belly]]);
      g.fill();
      g.beginPath();
      for (let i = -1; i <= 1; i++) {
        g.moveTo(-8 + Math.abs(i) * 1.5, i * 4);
        g.quadraticCurveTo(0, i * 4 + 2.5, 8 - Math.abs(i) * 1.5, i * 4);
      }
      g.strokeStyle = P.bellyShade; g.lineWidth = 1.5; g.stroke();
      g.restore();
      reset();
    }

    // Little arm
    ellipse(g, 11, 10, 4, 5.5, -0.5);
    g.fillStyle = C('body'); g.fill(); g.stroke();

    // Near wing
    drawWing(g, look, d.wingT, -4, -8, false, T, d.fold || 0);
    reset();

    // Horns / crest (behind head)
    (HORNS[look.horns] || HORNS.nubs)(g, P, T, t);
    reset();

    // Head (union outline: stroke both shapes, then fill both)
    const snx = 13 + 14 * sn, srx = 10 * sn;
    g.beginPath(); g.arc(13, -9, H.r, 0, TAU); g.stroke();
    ellipse(g, snx, -3, srx, 8); g.stroke();
    g.fillStyle = T ? '#fff' : lgrad(g, 0, -9 - H.r, 0, 8, [[0, P.bodyLight], [0.4, P.body], [1, P.bodyShade]]);
    g.beginPath(); g.arc(13, -9, H.r, 0, TAU); g.fill();
    ellipse(g, snx, -3, srx, 8); g.fill();

    extras('front', g, look, T, d);
    reset();

    if (!T) {
      // Snout & gloss highlights
      g.globalAlpha = 0.55; g.fillStyle = P.bodyLight;
      ellipse(g, snx + 1, -5, 6.5 * sn, 4); g.fill();
      g.globalAlpha = 0.45; g.fillStyle = '#ffffff';
      ellipse(g, 7, -9 - H.r + 7, 6, 3, -0.5); g.fill();
      // Cheek blush
      g.globalAlpha = 0.5; g.fillStyle = P.cheek;
      ellipse(g, 22, 1, 4.5, 2.6); g.fill();
      g.globalAlpha = 1;
      // Nostril
      g.fillStyle = OUT;
      ellipse(g, snx + 7 * sn, -6, 1.3, 1.8, 0.3); g.fill();
      drawFace(g, d, look);
    }
    g.restore();
  }

  /** Local wing-tip point for trails (see Dragon.wingTip). */
  function wingTip(look) {
    const w = WINGS[look.wing] || WINGS.bat, s = look.wingScale || 1;
    return { x: w.tip.x * s, y: w.tip.y * s };
  }

  Object.assign(PD.Art, { drawDragon, wingTip, DRAGON_PARTS: { WINGS, TAILS, BACKS, HORNS, FACES, EXTRAS } });
})();
