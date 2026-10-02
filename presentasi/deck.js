/* Deck: scaling, navigation, and the live scenes (chat replay, 3D solid, equation pictures, rose). */
import * as THREE from "three";
import { build, setFold, measures } from "../geometri/solids.js";
import { PICTURES, strokePoints, setLang } from "../seni/pictures.js";
import { makeFmt } from "../seni/curves.js";

const $ = (id) => document.getElementById(id);
const deck = $("deck");
const slides = [...document.querySelectorAll(".slide")];
const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const F = makeFmt("en");
setLang((id, en) => en);
let cur = -1, scale = 1;

/* ---------------- stage scaling ---------------- */
function fit() {
  scale = Math.min(window.innerWidth / 1600, window.innerHeight / 900);
  deck.style.transform = `scale(${scale}) translate(-800px, -450px)`;
}
window.addEventListener("resize", fit);
fit();

/* ---------------- navigation ---------------- */
function go(n) {
  n = Math.max(0, Math.min(slides.length - 1, n));
  if (n === cur) return;
  const prev = slides[cur];
  if (prev) { stopScene(prev.dataset.scene); prev.classList.remove("active"); }
  slides.forEach((s, i) => s.classList.toggle("past", i < n));
  cur = n;
  slides[n].classList.add("active");
  startScene(slides[n].dataset.scene);
  loadTry(slides[n]);
  $("count").textContent = `${n + 1} / ${slides.length}`;
  $("bar").style.width = `${((n + 1) / slides.length) * 100}%`;
  document.title = `${slides[n].dataset.title} — Gorga`;
  try { history.replaceState(null, "", `#${n + 1}`); } catch { /* file:// */ }
  if (n > 0) $("hint").classList.add("gone");
}
const next = () => go(cur + 1), prev = () => go(cur - 1);
document.addEventListener("keydown", (e) => {
  if (["ArrowRight", "PageDown", " ", "Enter"].includes(e.key)) { e.preventDefault(); next(); }
  else if (["ArrowLeft", "PageUp", "Backspace"].includes(e.key)) { e.preventDefault(); prev(); }
  else if (e.key === "Home") go(0);
  else if (e.key === "End") go(slides.length - 1);
  else if (e.key === "f" || e.key === "F") toggleFs();
});
$("next").addEventListener("click", next);
$("prev").addEventListener("click", prev);
$("fs").addEventListener("click", toggleFs);
function toggleFs() { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen?.(); }
document.addEventListener("click", (e) => {
  if (e.target.closest("button, a, .hud, .frame") || slides[cur].hasAttribute("data-try")) return;
  (e.clientX > window.innerWidth * 0.3 ? next : prev)();
});
let tx = null;
document.addEventListener("touchstart", (e) => { tx = e.touches[0].clientX; }, { passive: true });
document.addEventListener("touchend", (e) => {
  if (tx === null) return;
  const dx = e.changedTouches[0].clientX - tx; tx = null;
  if (Math.abs(dx) > 40 && !slides[cur].hasAttribute("data-try")) (dx < 0 ? next : prev)();
});

/* ---------------- live demos ---------------- */
// the real pages load only when their slide is first shown, and stay loaded afterwards
function loadTry(slide) {
  if (!slide.hasAttribute("data-try")) return;
  const frame = slide.querySelector(".frame"), ifr = frame.querySelector("iframe");
  if (!ifr.src) openDemo(slide, slide.querySelector(".try-tabs button").dataset.src);
}
function openDemo(slide, src) {
  const frame = slide.querySelector(".frame"), ifr = frame.querySelector("iframe");
  frame.classList.remove("loaded");
  ifr.onload = () => frame.classList.add("loaded");
  ifr.src = src;
  slide.querySelectorAll(".try-tabs button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.src === src)));
}
document.querySelectorAll(".try-tabs").forEach((tabs) => tabs.addEventListener("click", (e) => {
  const b = e.target.closest("button"); if (b) openDemo(tabs.closest(".slide"), b.dataset.src);
}));

/* ---------------- scenes ---------------- */
const scenes = {};
function startScene(k) { if (k && scenes[k]) scenes[k].start(); }
function stopScene(k) { if (k && scenes[k]) scenes[k].stop(); }
const later = (fn, ms, bag) => { const t = setTimeout(fn, ms); bag.push(t); };

/* chat replay: the landing's real conversation, one turn at a time */
const CONVO = [
  ["st", "so from −6 up to −5, then −4, then −3, −2, −1, then 0. Then up to 1, 2, 3, and finally 4."],
  ["ai", "You went from −6 to −5, −4, −3, −2, −1, then to 1, 2, 3, up to 4. What happens as you pass a certain temperature before 1?", "L4"],
  ["st", "oh, stop at zero first"],
  ["ai", "You stop at zero first. How do you count the rise from −6 to 0, and then from 0 to 4?", "L4"],
  ["st", "from −6 to 0 it goes up 6"],
  ["ai", "From −6 to 0 it goes up 6. Then from 0 to 4 it goes up by how much, and how does that give the total rise?", "L1"],
  ["st", "then 4 more, so 10"],
  ["win", "Your answer is correct. You split the rise into two parts: 6 degrees up to 0, then 4 degrees, 10 degrees in total."],
];
scenes.chat = (() => {
  let timers = [];
  const box = $("replay");
  return {
    start() {
      box.innerHTML = ""; timers = [];
      let t = 900;
      CONVO.forEach(([who, text, lvl]) => {
        if (who !== "st") {
          later(() => { const d = document.createElement("div"); d.className = "bubble ai typing-b"; d.innerHTML = '<span class="typing"><i></i><i></i><i></i></span>'; box.append(d); }, t, timers);
          t += 1100;
        }
        later(() => {
          box.querySelector(".typing-b")?.remove();
          const d = document.createElement("div");
          d.className = `bubble ${who === "st" ? "st" : who === "win" ? "ai win" : "ai"}`;
          d.innerHTML = `<small>${who === "st" ? "Student" : "Poda"}${lvl ? `<span class="tag">${lvl}</span>` : ""}</small>${text}`;
          box.append(d);
        }, t, timers);
        t += who === "st" ? 1500 : 2300;
      });
    },
    stop() { timers.forEach(clearTimeout); },
  };
})();

/* number count-up */
scenes.count = {
  start() {
    document.querySelectorAll("[data-count]").forEach((b, i) => {
      const to = Number(b.dataset.count), t0 = performance.now() + 300 + i * 120;
      const step = (now) => {
        const k = Math.min(1, Math.max(0, (now - t0) / 1400));
        b.textContent = Math.round(to * (1 - (1 - k) ** 3));
        if (k < 1 && slides[cur].dataset.scene === "count") requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  },
  stop() {},
};

/* 3D solid: turns slowly, unfolds into its net, folds back, then the next solid */
scenes.solid = (() => {
  const host = $("solid-scene");
  let renderer = null, scene, camera, model = null, raf = 0, t0 = 0, idx = 0;
  const LIST = [
    ["balok", { p: 4, l: 2.5, t: 2 }, "Cuboid", ["V = p × l × t", "A = 2(pl + pt + lt)"]],
    ["limas", { a: 3.5, t: 3 }, "Square pyramid", ["V = ⅓ × a² × t", "A = a² + 2as"]],
    ["prisma", { a: 3, t: 4.5 }, "Triangular prism", ["V = base area × t", "A = 2 × base + 3at"]],
    ["kubus", { s: 3 }, "Cube", ["V = s³", "A = 6s²"]],
  ];
  function init() {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio) * Math.max(1, scale));
    renderer.setSize(820, 680, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.appendChild(renderer.domElement);
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(34, 820 / 680, 0.1, 200);
    scene.add(new THREE.HemisphereLight(0xffffff, 0xc9d1ea, 1.2));
    const key = new THREE.DirectionalLight(0xffffff, 1.4); key.position.set(6, 12, 8); scene.add(key);
    const rim = new THREE.DirectionalLight(0xc39a52, 0.6); rim.position.set(-8, 4, -6); scene.add(rim);
    const mat = new THREE.LineBasicMaterial({ color: 0x1c2a55, transparent: true, opacity: 0.08 });
    for (let r = 2; r <= 12; r += 2) {
      const pts = []; for (let i = 0; i <= 128; i++) { const a = (i / 128) * Math.PI * 2; pts.push(new THREE.Vector3(r * Math.cos(a), 0, r * Math.sin(a))); }
      scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat));
    }
  }
  function show(i) {
    const [kind, d, name, f] = LIST[i];
    if (model) scene.remove(model.root);
    model = build(kind, d); setFold(model, 1); scene.add(model.root);
    const m = measures(kind, d);
    $("solid-name").textContent = name;
    $("s-vol").textContent = F.num(m.V); $("s-area").textContent = F.num(m.L);
    $("s-fv").textContent = f[0]; $("s-fa").textContent = f[1];
    const [Fc, E, V] = m.euler;
    $("s-euler").innerHTML = `faces <b>${Fc}</b> + vertices <b>${V}</b> − edges <b>${E}</b> = <b>2</b>`;
  }
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const t = Math.max(0, (now - t0) / 1000);   // rAF time can sit just before t0
    const cyc = 9, k = t % cyc;
    if (Math.floor(t / cyc) !== idx) { idx = Math.floor(t / cyc); show(idx % LIST.length); }
    // closed (0–2.5 s) → unfold (2.5–4.5) → flat (4.5–6) → fold (6–8) → closed
    const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);
    const fold = k < 2.5 ? 1 : k < 4.5 ? 1 - ease((k - 2.5) / 2) : k < 6 ? 0 : k < 8 ? ease((k - 6) / 2) : 1;
    setFold(model, fold);
    const a = t * 0.35;
    camera.position.set(11 * Math.cos(a), 7 + 2 * (1 - fold), 11 * Math.sin(a));
    camera.lookAt(0, model.height / 2 * fold, 0);
    renderer.render(scene, camera);
  }
  return {
    start() { if (!renderer) init(); idx = 0; show(0); t0 = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(frame); },
    stop() { cancelAnimationFrame(raf); },
  };
})();

/* equation pictures: drawn stroke by stroke, the equations scroll alongside */
scenes.art = (() => {
  const cv = $("art-cv"), ctx = cv.getContext("2d");
  const W = 820, H = 680;
  let raf = 0, t0 = 0, which = 0, strokes = [], shown = -1;
  const u = W / 19, sx = (x) => W / 2 + x * u, sy = (y) => H / 2 - (y - 0.3) * u;
  function load(i) {
    const pic = PICTURES[i % PICTURES.length];
    const p = {}; for (const [k, v] of Object.entries(pic.params)) p[k] = v[5];
    strokes = pic.build(F, p).map((s) => Object.assign(s, { pts: strokePoints(s), color: pic.colors[s.col] || s.col }));
    for (const s of strokes) { s.eq = s.eq.replace(/(\d),(\d)/g, "$1.$2"); s.dom = s.dom.replace(/(\d),(\d)/g, "$1.$2"); }
    const nr = strokes.filter((s) => s.region).length;
    $("art-count").innerHTML = `${pic.name[1]}: <b>${strokes.length - nr}</b> equations and <b>${nr}</b> inequalities.`;
    $("ticker").innerHTML = ""; shown = -1;
  }
  function draw(done) {
    const d = Math.min(2, window.devicePixelRatio || 1) * Math.max(1, scale);
    if (cv.width !== Math.round(W * d)) { cv.width = Math.round(W * d); cv.height = Math.round(H * d); }
    ctx.setTransform(d, 0, 0, d, 0, 0); ctx.clearRect(0, 0, W, H);
    ctx.lineJoin = ctx.lineCap = "round";
    strokes.forEach((s, i) => {
      if (!s.region || i > done) return;
      ctx.globalAlpha = Math.min(1, done - i);
      ctx.beginPath(); s.pts.forEach(([x, y], j) => (j ? ctx.lineTo(sx(x), sy(y)) : ctx.moveTo(sx(x), sy(y)))); ctx.closePath();
      if (s.glow) { ctx.shadowColor = "rgba(80,200,255,.9)"; ctx.shadowBlur = 18; }
      ctx.fillStyle = s.color; ctx.fill(); ctx.shadowBlur = 0;
    });
    ctx.globalAlpha = 1;
    let head = null;
    strokes.forEach((s, i) => {
      if (s.region || i > done) return;
      const frac = Math.min(1, done - i), k = Math.max(1, Math.floor(frac * (s.pts.length - 1)));
      ctx.beginPath();
      for (let j = 0; j <= k; j++) { const [x, y] = s.pts[j]; j ? ctx.lineTo(sx(x), sy(y)) : ctx.moveTo(sx(x), sy(y)); }
      if (s.fill && frac >= 1) { ctx.closePath(); ctx.fillStyle = s.fill === true ? s.color : s.fill; ctx.fill(); }
      ctx.strokeStyle = s.color; ctx.lineWidth = (s.w || 2.2) * 1.15; ctx.stroke();
      if (frac < 1) head = s.pts[k];
    });
    if (head) {
      ctx.fillStyle = "rgba(195,154,82,.25)"; ctx.beginPath(); ctx.arc(sx(head[0]), sy(head[1]), 13, 0, 7); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.strokeStyle = "#8a5f1c"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(sx(head[0]), sy(head[1]), 5.5, 0, 7); ctx.fill(); ctx.stroke();
    }
    const now = Math.min(strokes.length - 1, Math.floor(done));
    while (shown < now) {
      shown++;
      const s = strokes[shown], div = document.createElement("div");
      div.innerHTML = `${s.eq}${s.dom ? `<small>${s.dom}</small>` : ""}`;
      $("ticker").append(div);
      while ($("ticker").children.length > 7) $("ticker").firstChild.remove();
    }
  }
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const per = 0.24, total = strokes.length * per;
    const t = Math.max(0, (now - t0) / 1000);
    if (t > total + 3.5) { which++; load(which); t0 = now; return; }
    draw(REDUCED ? strokes.length : (t / total) * strokes.length);
  }
  return {
    start() { which = 0; load(0); t0 = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(frame); },
    stop() { cancelAnimationFrame(raf); },
  };
})();

/* rose curves r = 6 cos(kθ), k = 2…7, traced with the live computation */
scenes.rose = (() => {
  const cv = $("rose-cv"), ctx = cv.getContext("2d");
  const W = 820, H = 680, u = 50, cx = W / 2, cy = H / 2;
  let raf = 0, t0 = 0, k = 2;
  const KS = [2, 3, 4, 5, 7];
  const range = (n) => (n % 2 ? Math.PI : 2 * Math.PI);
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const per = 6.5, t = Math.max(0, (now - t0) / 1000), i = Math.floor(t / per);
    k = KS[i % KS.length];
    const prog = REDUCED ? 1 : Math.min(1, (t % per) / 4.5);
    const d = Math.min(2, window.devicePixelRatio || 1) * Math.max(1, scale);
    if (cv.width !== Math.round(W * d)) { cv.width = Math.round(W * d); cv.height = Math.round(H * d); }
    ctx.setTransform(d, 0, 0, d, 0, 0); ctx.clearRect(0, 0, W, H);
    ctx.lineWidth = 1;
    for (let r = 1; r <= 7; r++) { ctx.strokeStyle = r % 2 ? "rgba(28,42,85,.05)" : "rgba(28,42,85,.1)"; ctx.beginPath(); ctx.arc(cx, cy, r * u, 0, 7); ctx.stroke(); }
    ctx.strokeStyle = "rgba(28,42,85,.07)";
    for (let j = 0; j < 12; j++) { const a = (j * Math.PI) / 6; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + 360 * Math.cos(a), cy - 360 * Math.sin(a)); ctx.stroke(); }
    const T = range(k) * prog, N = 900;
    ctx.strokeStyle = "#1c2a55"; ctx.lineWidth = 2.6; ctx.lineJoin = "round"; ctx.beginPath();
    let px = cx + 6 * u, py = cy;
    for (let j = 0; j <= N; j++) {
      const th = (T * j) / N, r = 6 * Math.cos(k * th);
      px = cx + r * u * Math.cos(th); py = cy - r * u * Math.sin(th);
      j ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.stroke();
    ctx.save(); ctx.setLineDash([5, 6]); ctx.strokeStyle = "rgba(138,95,28,.75)"; ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(px, py); ctx.stroke(); ctx.restore();
    ctx.fillStyle = "rgba(195,154,82,.25)"; ctx.beginPath(); ctx.arc(px, py, 14, 0, 7); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.strokeStyle = "#8a5f1c"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(px, py, 6, 0, 7); ctx.fill(); ctx.stroke();
    const r = 6 * Math.cos(k * T);
    $("rose-eq").innerHTML = `<i>r</i> = 6 cos(${k}<i>θ</i>)`;
    $("rose-calc").innerHTML = `<i>θ</i> = ${F.deg(T)} → <i>r</i> = 6 cos(${k} · ${F.deg(T)}) = <b>${F.fix(r)}</b><br><span class="small">${k % 2 ? k : 2 * k} petals · ${k % 2 ? "odd k gives k petals" : "even k gives 2k petals"}</span>`;
  }
  return {
    start() { t0 = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(frame); },
    stop() { cancelAnimationFrame(raf); },
  };
})();

window.addEventListener("hashchange", () => { const h = parseInt(location.hash.slice(1), 10); if (Number.isFinite(h)) go(h - 1); });
/* start at the slide in the address, if any */
const fromHash = parseInt(location.hash.slice(1), 10);
go(Number.isFinite(fromHash) ? fromHash - 1 : 0);
