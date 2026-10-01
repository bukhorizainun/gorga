/* Gorga medallion for the landing hero.
   Centre: one large simeol-eol scroll, an Archimedean spiral r = a*theta plus its point
   reflection (a 180 degree turn), the same construction as the logo.
   Around it: eight small scrolls at equal angles (rotational symmetry of order 8) and a
   ring of ipon-ipon triangles, the way carved gorga panels frame a central motif. */

(function () {
  const NS = "http://www.w3.org/2000/svg";

  function el(name, attrs, parent) {
    const e = document.createElementNS(NS, name);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  /** Path of one scroll centred on (0, 0): spiral, then its point reflection. */
  function scroll(a, turns) {
    const t0 = 0.55, t1 = 2 * Math.PI * turns, steps = 160;
    const d = a * t1;
    const first = [];
    for (let i = 0; i <= steps; i++) {
      const t = t0 + ((t1 - t0) * i) / steps;
      const r = a * t;
      first.push([-d + r * Math.cos(t), -r * Math.sin(t)]);
    }
    const second = first.map(([x, y]) => [-x, -y]).reverse();
    return "M" + first.concat(second).map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join(" L");
  }

  function medallion(svg) {
    const C = 300;
    svg.setAttribute("viewBox", "0 0 600 600");
    const root = el("g", { transform: `translate(${C} ${C})` }, svg);

    // outer rings
    el("circle", { r: 288, class: "hair" }, root);
    el("circle", { r: 276, class: "hair faint" }, root);

    // slowly turning ring: ipon triangles and eight small scrolls
    const ring = el("g", { class: "ring" }, root);
    const N = 56;
    for (let i = 0; i < N; i++) {
      const ang = (360 * i) / N;
      const t = el("path", { d: "M-7 -270 L7 -270 L0 -252 Z", class: "tri", transform: `rotate(${ang})` }, ring);
      t.style.animationDelay = `${0.6 + i * 0.018}s`;
    }
    el("circle", { r: 246, class: "hair faint" }, ring);
    const small = scroll(1.45, 2);
    for (let i = 0; i < 8; i++) {
      const ang = 22.5 + 45 * i;
      const g = el("g", { transform: `rotate(${ang}) translate(0 -198) rotate(90)` }, ring);
      const p = el("path", { d: small, class: "scroll thin", pathLength: 1 }, g);
      p.style.animationDelay = `${1.0 + i * 0.12}s`;
    }

    // inner frame and the central scroll
    el("circle", { r: 150, class: "hair" }, root);
    for (let i = 0; i < 4; i++) {
      el("path", { d: "M0 -162 L6 -150 L0 -138 L-6 -150 Z", class: "dia", transform: `rotate(${45 + 90 * i})` }, root);
    }
    const big = el("path", { d: scroll(4.1, 2), class: "scroll", pathLength: 1 }, root);
    big.style.animationDelay = "0.2s";
    el("circle", { r: 4, class: "dot" }, root);
  }

  document.querySelectorAll("svg[data-gorga]").forEach(medallion);

  /* Gentle reveal of page sections as they scroll into view. Content stays visible
     without JavaScript, and with reduced motion nothing moves. */
  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reduce && "IntersectionObserver" in window) {
    const items = document.querySelectorAll(".head2, .dialog, .ladder, .guards, .steps, .teach > *, .wins, .acts, .name .wrap > *");
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    items.forEach((n) => { n.classList.add("rv"); io.observe(n); });
  }

  /* Header gains a solid ground once the page scrolls past the hero top. */
  const bar = document.querySelector("header.bar.dark");
  if (bar) {
    const on = () => bar.classList.toggle("scrolled", window.scrollY > 24);
    window.addEventListener("scroll", on, { passive: true }); on();
  }
})();
