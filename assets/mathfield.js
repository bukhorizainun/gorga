/* Mathfield: a quiet layer of mathematical line-work behind the landing page.
   - Lissajous figures x = sin(3t + d), y = sin(4t), the phase d drifting slowly
   - a rose curve r = cos(k theta) with k = 5/3, turning very slowly
   - a bundle of sine waves whose amplitude follows the scroll
   Hairlines in indigo and gold at low opacity; drawn on one fixed canvas, paused when the tab
   is hidden, and drawn once (static) when the reader prefers reduced motion. */
(function () {
  const cv = document.querySelector("canvas.mathfield");
  if (!cv) return;
  const g = cv.getContext("2d");
  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let W = 0, H = 0, dpr = 1, raf = null;
  const INK = "28, 42, 85", GOLD = "195, 154, 82";

  function size() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    cv.style.width = W + "px"; cv.style.height = H + "px";
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

  function lissajous(cx, cy, rx, ry, d, color) {
    g.beginPath();
    for (let i = 0; i <= 720; i++) {
      const t = (i / 720) * Math.PI * 2;
      const x = cx + rx * Math.sin(3 * t + d), y = cy + ry * Math.sin(4 * t);
      i ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    g.strokeStyle = color; g.stroke();
  }

  function rose(cx, cy, R, rot, color) {
    const k = 5 / 3;
    g.beginPath();
    for (let i = 0; i <= 1600; i++) {
      const th = (i / 1600) * Math.PI * 6;           // k = 5/3 closes after 3 turns
      const r = R * Math.cos(k * th);
      const x = cx + r * Math.cos(th + rot), y = cy + r * Math.sin(th + rot);
      i ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    g.strokeStyle = color; g.stroke();
  }

  function waves(y0, amp, phase, n) {
    for (let j = 0; j < n; j++) {
      g.beginPath();
      for (let x = -20; x <= W + 20; x += 8) {
        const y = y0 + amp * Math.sin(x * 0.0042 + phase + j * 0.22) * Math.cos(x * 0.0011 - j * 0.08) + j * 7;
        x > -20 ? g.lineTo(x, y) : g.moveTo(x, y);
      }
      const a = 0.035 + 0.035 * Math.sin(j / n * Math.PI);
      g.strokeStyle = j % 4 === 0 ? `rgba(${GOLD}, ${a * 2.2})` : `rgba(${INK}, ${a})`;
      g.stroke();
    }
  }

  function draw(ms) {
    const t = ms / 1000;
    const doc = Math.max(1, document.documentElement.scrollHeight - H);
    const s = window.scrollY / doc;                     // 0 at the top, 1 at the end
    const hero = smooth(H * 0.35, H * 0.9, window.scrollY); // keep the hero to the medallion
    g.clearRect(0, 0, W, H);
    g.lineWidth = 1;
    g.globalAlpha = W < 700 ? 0.6 : 1;   // quieter on phones, where text fills the width
    const m = Math.min(W, H);

    // Lissajous, upper right, fading in after the hero
    const L = hero * (0.55 + 0.45 * Math.sin(s * Math.PI));
    if (L > 0.01) {
      for (let k = 0; k < 4; k++) {
        const d = t * 0.06 + k * 0.35 + s * 2.2;
        lissajous(W * 0.93, H * 0.3, m * 0.17 - k * 8, m * 0.17 - k * 8, d,
          k === 0 ? `rgba(${GOLD}, ${0.22 * L})` : `rgba(${INK}, ${0.07 * L})`);
      }
    }
    // rose curve, lower left
    const Rv = 0.4 + 0.6 * hero;
    rose(W * 0.03, H * 0.84, m * 0.24, t * 0.015 + s * 1.5, `rgba(${INK}, ${0.06 * Rv})`);
    rose(W * 0.03, H * 0.84, m * 0.17, -t * 0.02 - s, `rgba(${GOLD}, ${0.14 * Rv})`);
    // sine bundle across the middle; amplitude breathes with the scroll
    waves(H * (0.58 - 0.08 * Math.sin(s * Math.PI * 2)), 26 + 30 * Math.sin(s * Math.PI), t * 0.12 + s * 6, 14);
  }

  function loop(ms) { draw(ms); raf = requestAnimationFrame(loop); }
  function start() { if (!raf && !reduce) raf = requestAnimationFrame(loop); }
  function stop() { if (raf) cancelAnimationFrame(raf); raf = null; }

  size();
  window.addEventListener("resize", () => { size(); if (reduce) draw(0); });
  if (reduce) { draw(0); window.addEventListener("scroll", () => draw(0), { passive: true }); return; }
  document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
  start();
})();
