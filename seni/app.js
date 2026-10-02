/* Curve studio: pick an equation, move its parameters, and watch a point build the curve from it.
   Curves can be kept on the canvas in gorga colours and saved as a picture. */
import { FAMILIES, sample, compile, makeFmt } from "./curves.js";

const EN = window.GORGA_LANG === "en";
const L = (id, en) => (EN ? en : id);
const F = makeFmt(EN ? "en" : "id");
const $ = (id) => document.getElementById(id);
const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const INK = { nila: "#1c2a55", merah: "#a31d1a", emas: "#8a5f1c", hitam: "#141414", sky: "#56628f" };
const BG = "#fbfbfd";

/* ---------------- state ---------------- */
const params = new URLSearchParams(location.search);
let level = ["smp", "sma"].includes(params.get("j")) ? params.get("j") : "smp";
let fam = null, p = {}, pts = [], prog = 0, playing = false, last = 0, zoom = 1, ink = "nila";
const layers = [];
const view = { x0: -10, x1: 10, span: 15 };

/* custom family: the student's own y = f(x) or r = f(θ) */
const own = { id: "own", j: "both", kind: "fx", name: [L("Persamaanmu", "Your equation"), ""], own: true, src: "", fn: () => NaN,
  params: {}, f: (x) => own.fn(x), r: (t) => own.fn(t), range: () => [0, 2 * Math.PI * own.turns], turns: 1,
  eq: () => `${own.kind === "fx" ? "<i>y</i>" : "<i>r</i>"} = ${esc(own.src || "…")}`,
  calc: (t, v) => own.kind === "fx" ? `<i>x</i> = ${F.fix(t)} → <i>y</i> = <b>${F.fix(v.y)}</b>` : `<i>θ</i> = ${F.deg(t)} → <i>r</i> = <b>${F.fix(v.r)}</b>`,
  info: () => [], q: [L("Ubah satu angka di persamaanmu. Bagian kurva mana yang ikut berubah?", "Change one number in your equation. Which part of the curve changes?")] };
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

/* ---------------- canvas ---------------- */
const stage = $("stage"), cv = $("cv"), ctx = cv.getContext("2d");
let W = 0, H = 0, dpr = 1;
function resize() {
  dpr = Math.min(2, window.devicePixelRatio || 1);
  W = stage.clientWidth; H = stage.clientHeight;
  cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
  view.span = (20 * H) / W;
  draw();
}
new ResizeObserver(resize).observe(stage);
const unit = () => (W / 20) * zoom;
const sx = (x) => W / 2 + x * unit();
const sy = (y) => H / 2 - y * unit();

function grid(g, w, h, u, polar) {
  const cx = w / 2, cy = h / 2;
  g.lineWidth = 1;
  if (polar) {
    for (let r = 1; r * u < Math.hypot(w, h); r++) {
      g.strokeStyle = r % 2 ? "rgba(28,42,85,.05)" : "rgba(28,42,85,.10)";
      g.beginPath(); g.arc(cx, cy, r * u, 0, 2 * Math.PI); g.stroke();
    }
    g.strokeStyle = "rgba(28,42,85,.07)";
    for (let k = 0; k < 12; k++) { const a = (k * Math.PI) / 6; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + 2000 * Math.cos(a), cy - 2000 * Math.sin(a)); g.stroke(); }
  } else {
    const n = Math.ceil(w / u / 2) + 1, m = Math.ceil(h / u / 2) + 1;
    for (let i = -n; i <= n; i++) { g.strokeStyle = i % 2 ? "rgba(28,42,85,.045)" : "rgba(28,42,85,.09)"; g.beginPath(); g.moveTo(cx + i * u, 0); g.lineTo(cx + i * u, h); g.stroke(); }
    for (let j = -m; j <= m; j++) { g.strokeStyle = j % 2 ? "rgba(28,42,85,.045)" : "rgba(28,42,85,.09)"; g.beginPath(); g.moveTo(0, cy + j * u); g.lineTo(w, cy + j * u); g.stroke(); }
  }
  g.strokeStyle = "rgba(28,42,85,.38)"; g.lineWidth = 1.1;
  g.beginPath(); g.moveTo(0, cy); g.lineTo(w, cy); g.moveTo(cx, 0); g.lineTo(cx, h); g.stroke();
  g.fillStyle = "rgba(86,98,143,.85)"; g.font = "500 11px Onest, sans-serif"; g.textAlign = "center"; g.textBaseline = "top";
  const step = u < 22 ? 4 : 2;
  for (let i = -20; i <= 20; i += step) if (i) {
    const x = cx + i * u; if (x > 12 && x < w - 12) g.fillText(F.num(i), x, cy + 6);
  }
  g.textAlign = "right"; g.textBaseline = "middle";
  for (let j = -20; j <= 20; j += step) if (j) {
    const y = cy - j * u; if (y > 12 && y < h - 12) g.fillText(F.num(j), cx - 7, y);
  }
  g.font = "italic 400 17px 'Cormorant Garamond', serif"; g.fillStyle = "rgba(28,42,85,.75)";
  g.textAlign = "right"; g.textBaseline = "bottom"; g.fillText("x", w - 10, cy - 6);
  g.textAlign = "left"; g.textBaseline = "top"; g.fillText("y", cx + 8, 8);
}

function path(g, list, upto, toX, toY) {
  g.beginPath();
  let pen = false;
  for (let i = 0; i <= upto && i < list.length; i++) {
    const q = list[i];
    if (!q) { pen = false; continue; }
    if (pen) g.lineTo(toX(q.x), toY(q.y)); else { g.moveTo(toX(q.x), toY(q.y)); pen = true; }
  }
  g.stroke();
}

function draw() {
  if (!W) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  const polar = fam && (fam.kind === "polar");
  grid(ctx, W, H, unit(), polar);
  ctx.lineJoin = ctx.lineCap = "round";
  for (const l of layers) { ctx.strokeStyle = INK[l.ink]; ctx.lineWidth = 1.6; path(ctx, l.pts, l.pts.length, sx, sy); }
  if (!pts.length) return;
  const upto = Math.floor(prog * (pts.length - 1));
  ctx.strokeStyle = INK[ink]; ctx.lineWidth = 2.4;
  path(ctx, pts, upto, sx, sy);
  // the point that is being computed right now, and how it is measured
  let k = upto; while (k > 0 && !pts[k]) k--;
  const q = pts[k];
  if (!q) return;
  const X = sx(q.x), Y = sy(q.y);
  ctx.save();
  ctx.strokeStyle = "rgba(138,95,28,.75)"; ctx.lineWidth = 1.2; ctx.setLineDash([4, 5]);
  if (polar) {
    ctx.beginPath(); ctx.moveTo(sx(0), sy(0)); ctx.lineTo(X, Y); ctx.stroke();
    if (q.r < 0) { // the direction θ points to, while the point sits on the other side
      ctx.strokeStyle = "rgba(138,95,28,.3)";
      ctx.beginPath(); ctx.moveTo(sx(0), sy(0)); ctx.lineTo(sx(-q.x), sy(-q.y)); ctx.stroke();
    }
    ctx.setLineDash([]); ctx.strokeStyle = "rgba(138,95,28,.55)";
    const a = ((q.t % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    ctx.beginPath(); ctx.arc(sx(0), sy(0), 22, 0, -a, true); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(X, sy(0)); ctx.moveTo(X, Y); ctx.lineTo(sx(0), Y); ctx.stroke();
  }
  ctx.restore();
  ctx.fillStyle = "rgba(195,154,82,.22)"; ctx.beginPath(); ctx.arc(X, Y, 13, 0, 2 * Math.PI); ctx.fill();
  ctx.fillStyle = "#fff"; ctx.strokeStyle = "#8a5f1c"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(X, Y, 5.5, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
  $("calc").innerHTML = fam.calc(q.t, q, p, F, L);
}

/* ---------------- animation ---------------- */
function play(from = 0) {
  prog = from;
  if (REDUCED) { prog = 1; draw(); syncScrub(); return; }
  playing = true; last = performance.now();
  requestAnimationFrame(tick);
}
function tick(now) {
  if (!playing) return;
  const secs = fam.seconds || 4.2;
  prog = Math.min(1, prog + (now - last) / 1000 / secs);
  last = now;
  draw(); syncScrub();
  if (prog < 1) requestAnimationFrame(tick); else playing = false;
}
const syncScrub = () => { $("scrub").value = Math.round(prog * 1000); };

/* ---------------- panel ---------------- */
function famList() {
  const list = FAMILIES.filter((f) => f.j === level);
  $("fams").innerHTML = list.map((f) => `<button type="button" data-f="${f.id}" aria-pressed="${fam && fam.id === f.id}">${L(f.name[0], f.name[1])}</button>`).join("")
    + `<button type="button" data-f="own" aria-pressed="${fam === own}">${own.name[0]}</button>`;
  document.querySelectorAll("#levels button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.j === level)));
}

function choose(id) {
  fam = id === "own" ? own : FAMILIES.find((f) => f.id === id);
  p = {};
  for (const [k, v] of Object.entries(fam.params)) p[k] = v[5];
  $("sliders").innerHTML = Object.entries(fam.params).map(([k, [li, le, min, max, step, v]]) =>
    `<label class="dim"><span>${L(li, le)}</span><input type="range" min="${min}" max="${max}" step="${step}" value="${v}" data-p="${k}"><b>${F.num(v)}</b></label>`).join("");
  $("sliders").querySelectorAll("input").forEach((inp) => inp.addEventListener("input", () => {
    p[inp.dataset.p] = Number(inp.value); inp.nextElementSibling.textContent = F.num(Number(inp.value));
    refresh(false);
  }));
  $("own").hidden = fam !== own;
  $("params-wrap").hidden = !Object.keys(fam.params).length;
  $("fam-name").textContent = fam === own ? own.name[0] : L(fam.name[0], fam.name[1]);
  document.querySelectorAll("#fams button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.f === id)));
  try { history.replaceState(null, "", `?j=${level}&k=${id}${EN ? "&lang=en" : ""}`); } catch { /* file:// */ }
  refresh(true);
}

function refresh(animate) {
  pts = fam === own && !own.src ? [] : sample(fam, p, view);
  $("eq").innerHTML = fam.eq(p, F);
  const info = fam.info(p, F, L);
  $("info").innerHTML = info.map(([a, b]) => `<div><span class="unit">${a}</span><span class="val">${b}</span></div>`).join("");
  $("info").hidden = !info.length;
  $("q").textContent = L(fam.q[0], fam.q[1] || fam.q[0]);
  if (!pts.length) $("calc").innerHTML = L("Tulis persamaanmu di bawah, lalu tekan Gambar.", "Write your equation below, then press Draw.");
  if (animate) play(0); else { playing = false; prog = 1; draw(); syncScrub(); }
}

$("levels").addEventListener("click", (e) => {
  const b = e.target.closest("button"); if (!b) return;
  level = b.dataset.j; famList(); choose(FAMILIES.find((f) => f.j === level).id);
});
$("fams").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) choose(b.dataset.f); });
$("scrub").addEventListener("input", (e) => { playing = false; prog = Number(e.target.value) / 1000; draw(); });
$("replay").addEventListener("click", () => play(0));
$("keep").addEventListener("click", () => {
  if (!pts.length) return;
  layers.push({ pts, ink });
  $("layers").textContent = L(`${layers.length} kurva tersimpan di kanvas`, `${layers.length} curve${layers.length > 1 ? "s" : ""} kept on the canvas`);
  draw();
});
$("clear").addEventListener("click", () => { layers.length = 0; $("layers").textContent = ""; draw(); });
$("inks").addEventListener("click", (e) => {
  const b = e.target.closest("button"); if (!b) return;
  ink = b.dataset.ink;
  document.querySelectorAll("#inks button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
  draw();
});
$("save").addEventListener("click", () => {
  const s = 2, w = 1600, h = Math.round((1600 * H) / W);
  const c = document.createElement("canvas"); c.width = w * s; c.height = h * s;
  const g = c.getContext("2d"); g.scale(s, s);
  g.fillStyle = BG; g.fillRect(0, 0, w, h);
  const u = (w / 20) * zoom, X = (x) => w / 2 + x * u, Y = (y) => h / 2 - y * u;
  if ($("withgrid").checked) grid(g, w, h, u, fam && fam.kind === "polar");
  g.lineJoin = g.lineCap = "round";
  for (const l of layers.concat(pts.length ? [{ pts, ink }] : [])) { g.strokeStyle = INK[l.ink]; g.lineWidth = 3; path(g, l.pts, l.pts.length, X, Y); }
  g.font = "italic 400 26px 'Cormorant Garamond', serif"; g.fillStyle = "rgba(28,42,85,.55)"; g.textAlign = "right"; g.textBaseline = "bottom";
  g.fillText("gorga · " + L("seni matematika", "math art"), w - 28, h - 22);
  const a = document.createElement("a"); a.download = "gorga-kurva.png"; a.href = c.toDataURL("image/png"); a.click();
});
stage.addEventListener("wheel", (e) => {
  e.preventDefault();
  zoom = Math.min(3, Math.max(0.4, zoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1)));
  draw();
}, { passive: false });

/* the student's own equation */
document.querySelectorAll("#own-kind button").forEach((b) => b.addEventListener("click", () => {
  own.kind = b.dataset.kind;
  document.querySelectorAll("#own-kind button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
  $("own-pre").innerHTML = own.kind === "fx" ? "<i>y</i> =" : "<i>r</i> =";
  $("own-turns").hidden = own.kind === "fx";
}));
$("own-turns-in").addEventListener("input", (e) => { own.turns = Number(e.target.value); e.target.nextElementSibling.textContent = `${own.turns}`; });
$("own").addEventListener("submit", (e) => {
  e.preventDefault();
  const src = $("own-src").value.trim();
  try {
    own.fn = compile(src); own.src = src;
    if (!Number.isFinite(own.fn(0.7)) && !Number.isFinite(own.fn(2.1))) throw new Error("nan");
    $("own-err").textContent = "";
    refresh(true);
  } catch (err) {
    $("own-err").textContent = L(`Persamaan belum bisa dibaca${err.message.startsWith('"') ? ` (tidak dikenal: ${err.message})` : ""}. Contoh: 2x − 1, x² − 4, 3 sin(2x), 1 + cos θ.`,
      `The equation cannot be read yet${err.message.startsWith('"') ? ` (unknown: ${err.message})` : ""}. Examples: 2x − 1, x² − 4, 3 sin(2x), 1 + cos θ.`);
  }
});
document.querySelectorAll("#own .eg").forEach((b) => b.addEventListener("click", () => {
  const kind = b.dataset.kind;
  document.querySelector(`#own-kind button[data-kind="${kind}"]`).click();
  $("own-src").value = b.textContent; $("own").requestSubmit();
}));

/* start: ?k= picks a curve; ?j= the school level */
famList();
const start = params.get("k");
// inside the deck, a link to one curve shows only the curve studio
if (start && document.documentElement.classList.contains("embed")) document.documentElement.classList.add("only-curves");
if (start === "own") choose("own");
else if (start && FAMILIES.some((f) => f.id === start)) {
  level = FAMILIES.find((f) => f.id === start).j; famList(); choose(start);
} else choose(FAMILIES.find((f) => f.j === level).id);
resize();
