/* Gorga motif panel: rows of simeol-eol scrolls separated by ipon-ipon bands.
   Each scroll is an Archimedean spiral r = a*theta plus its point reflection (a 180 degree
   turn), the same construction as the logo. Rows alternate mirror images, as carved
   gorga panels do. */

(function () {
  const NS = "http://www.w3.org/2000/svg";

  function scroll(mx, my, a, turns, flip) {
    const d = a * 2 * Math.PI * turns;
    const cx = mx - d;
    const first = [];
    const steps = 150;
    const t0 = 0.55;
    const t1 = 2 * Math.PI * turns;
    for (let i = 0; i <= steps; i++) {
      const t = t0 + ((t1 - t0) * i) / steps;
      const r = a * t;
      const y = flip ? my + r * Math.sin(t) : my - r * Math.sin(t);
      first.push([cx + r * Math.cos(t), y]);
    }
    const second = first.map(([x, y]) => [2 * mx - x, 2 * my - y]).reverse();
    return "M" + first.concat(second).map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(" L");
  }

  function el(name, attrs) {
    const e = document.createElementNS(NS, name);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }

  function band(svg, y, width, h, fill) {
    const w = h * 1.5;
    let d = "";
    for (let x = 0; x < width; x += w) d += `M${x} ${y + h} L${x + w / 2} ${y} L${x + w} ${y + h} Z `;
    svg.appendChild(el("path", { d, fill }));
  }

  /** Draws the panel into an <svg data-gorga> element. */
  function panel(svg) {
    const W = 600, H = 660;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    const rows = 4, cols = 3;
    const cellW = W / cols, rowH = 150, bandH = 12, top = 18;
    const a = 3.6;
    band(svg, 2, W, bandH, "#a31d1a");
    for (let r = 0; r < rows; r++) {
      const y0 = top + r * (rowH + bandH + 6);
      for (let c = 0; c < cols; c++) {
        const mx = c * cellW + cellW / 2;
        const my = y0 + rowH / 2 + 6;
        const flip = (r + c) % 2 === 1;
        const g = el("g", { class: "tile" });
        g.appendChild(el("rect", { x: c * cellW + 4, y: y0 + 8, width: cellW - 8, height: rowH - 4, fill: "transparent" }));
        const p = el("path", { d: scroll(mx, my, a, 2, flip), class: "scroll" });
        p.style.animationDelay = `${(r * cols + c) * 0.09}s`;
        g.appendChild(p);
        svg.appendChild(g);
      }
      band(svg, y0 + rowH + 8, W, bandH, r % 2 ? "#fffcf7" : "#a31d1a");
    }
  }

  document.querySelectorAll("svg[data-gorga]").forEach(panel);
})();
