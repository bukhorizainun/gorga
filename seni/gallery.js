/* "Pictures from equations": a picture is drawn one equation at a time, the list names every
   equation with its domain, and pointing at an equation lights up its stroke. */
import { PICTURES, strokePoints, setLang } from "./pictures.js";
import { makeFmt } from "./curves.js";

const EN = window.GORGA_LANG === "en";
const L = (id, en) => (EN ? en : id);
const F = makeFmt(EN ? "en" : "id");
setLang(L);
const $ = (id) => document.getElementById(id);
const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const stage = $("pic-stage"), cv = $("pic-cv"), ctx = cv.getContext("2d");
let W = 0, H = 0, dpr = 1;
let pic = PICTURES[0], p = {}, strokes = [], prog = 1, playing = false, last = 0, focus = -1;

function resize() {
  dpr = Math.min(2, window.devicePixelRatio || 1);
  W = stage.clientWidth; H = stage.clientHeight;
  cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
  draw();
}
new ResizeObserver(resize).observe(stage);
const u = () => W / 19;
const sx = (x) => W / 2 + x * u(), sy = (y) => H / 2 - (y - 0.3) * u();

function draw() {
  if (!W) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  ctx.lineJoin = ctx.lineCap = "round";
  const n = strokes.length, done = prog * n;
  let head = null;
  // colours (inequalities) lie under the lines, whatever their place in the list
  strokes.forEach((s, i) => {
    if (!s.region || i > done) return;
    ctx.globalAlpha = Math.min(1, done - i) * (focus < 0 || focus === i ? 1 : 0.25);
    ctx.beginPath();
    s.pts.forEach(([x, y], j) => (j ? ctx.lineTo(sx(x), sy(y)) : ctx.moveTo(sx(x), sy(y))));
    ctx.closePath();
    if (s.glow) { ctx.shadowColor = "rgba(80,200,255,.9)"; ctx.shadowBlur = 18; }
    ctx.fillStyle = s.col; ctx.fill();
    ctx.shadowBlur = 0;
    if (focus === i) { ctx.strokeStyle = "#8a5f1c"; ctx.lineWidth = 2; ctx.setLineDash([5, 5]); ctx.stroke(); ctx.setLineDash([]); }
  });
  strokes.forEach((s, i) => {
    if (s.region || i > done) return;
    const frac = Math.min(1, done - i);
    const k = Math.max(1, Math.floor(frac * (s.pts.length - 1)));
    const col = pic.colors[s.col] || s.col;
    ctx.globalAlpha = focus < 0 || focus === i ? 1 : 0.14;
    ctx.beginPath();
    for (let j = 0; j <= k; j++) { const [x, y] = s.pts[j]; j ? ctx.lineTo(sx(x), sy(y)) : ctx.moveTo(sx(x), sy(y)); }
    if (s.fill && frac >= 1) { ctx.closePath(); ctx.fillStyle = s.fill === true ? col : s.fill; ctx.fill(); }
    ctx.strokeStyle = col; ctx.lineWidth = (s.w || 2.2) * (W / 760) * (focus === i ? 1.6 : 1);
    ctx.stroke();
    if (frac < 1) head = s.pts[k];
  });
  ctx.globalAlpha = 1;
  if (head && playing) {
    ctx.fillStyle = "rgba(195,154,82,.25)"; ctx.beginPath(); ctx.arc(sx(head[0]), sy(head[1]), 12, 0, 2 * Math.PI); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.strokeStyle = "#8a5f1c"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(sx(head[0]), sy(head[1]), 5, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
  }
  const now = Math.min(n - 1, Math.floor(done));
  document.querySelectorAll("#eqs li").forEach((li, i) => li.classList.toggle("now", playing && i === now));
}

function play() {
  if (REDUCED) { prog = 1; playing = false; draw(); return; }
  prog = 0; playing = true; last = performance.now();
  requestAnimationFrame(function tick(t) {
    if (!playing) return;
    prog = Math.min(1, prog + (t - last) / 1000 / Math.max(6, strokes.length * 0.22));
    last = t; draw();
    if (prog < 1) requestAnimationFrame(tick); else { playing = false; draw(); }
  });
}

function rebuild(animate) {
  strokes = pic.build(F, p).map((s) => Object.assign(s, { pts: strokePoints(s) }));
  const nr = strokes.filter((s) => s.region).length, ne = strokes.length - nr;
  $("pic-count").innerHTML = L(`Gambar ini tersusun dari <b>${ne}</b> persamaan dan <b>${nr}</b> pertidaksamaan untuk warnanya.`,
    `This picture is made of <b>${ne}</b> equations and <b>${nr}</b> inequalities for its colours.`);
  $("eqs").innerHTML = strokes.map((s, i) => `<li data-i="${i}" tabindex="0"${s.region ? ' class="ineq"' : ""}><i class="dot" style="background:${pic.colors[s.col] || s.col}"></i><span class="e">${s.eq}</span>${s.dom ? `<span class="d">${s.dom}</span>` : ""}</li>`).join("");
  if (animate) play(); else { prog = 1; playing = false; draw(); }
}

function choose(id) {
  pic = PICTURES.find((x) => x.id === id);
  p = {};
  for (const [k, v] of Object.entries(pic.params)) p[k] = v[5];
  document.querySelectorAll("#pics button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.p === id)));
  $("pic-sliders").innerHTML = Object.entries(pic.params).map(([k, [li, le, min, max, step, v]]) =>
    `<label class="dim"><span>${L(li, le)}</span><input type="range" min="${min}" max="${max}" step="${step}" value="${v}" data-p="${k}"><b>${F.num(v)}</b></label>`).join("");
  $("pic-sliders").querySelectorAll("input").forEach((inp) => inp.addEventListener("input", () => {
    p[inp.dataset.p] = Number(inp.value); inp.nextElementSibling.textContent = F.num(Number(inp.value)); rebuild(false);
  }));
  rebuild(true);
}

$("pics").innerHTML = PICTURES.map((x) => `<button type="button" data-p="${x.id}" aria-pressed="false">${L(x.name[0], x.name[1])}</button>`).join("");
$("pics").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) choose(b.dataset.p); });
$("pic-replay").addEventListener("click", play);
const eqs = $("eqs");
const setFocus = (e) => { const li = e.target.closest("li"); focus = li ? Number(li.dataset.i) : -1; if (!playing) draw(); };
eqs.addEventListener("pointerover", setFocus); eqs.addEventListener("focusin", setFocus);
eqs.addEventListener("pointerleave", () => { focus = -1; if (!playing) draw(); });
eqs.addEventListener("focusout", () => { focus = -1; if (!playing) draw(); });

// start drawing only when the section comes into view
let started = false;
choose(PICTURES[0].id); playing = false; prog = 0; draw();
new IntersectionObserver((en, io) => {
  if (en[0].isIntersecting && !started) { started = true; play(); io.disconnect(); }
}, { threshold: 0.35 }).observe(stage);
resize();
