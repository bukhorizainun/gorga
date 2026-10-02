/* Geometry studio: rotate a solid, change its size, unfold its net, read volume and surface area. */
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { build, setFold, measures } from "./solids.js";

const EN = window.GORGA_LANG === "en";
const tr = (id, en) => (EN ? en : id);
const $ = (id) => document.getElementById(id);

const SOLIDS = {
  kubus: { name: tr("Kubus", "Cube"), dims: { s: [tr("rusuk s", "edge s"), 1, 6, 3] },
    q: tr("Jika rusuk kubus dibuat 2 kali lebih panjang, volumenya menjadi berapa kali? Coba dengan slider.", "If the cube's edge is made twice as long, how many times bigger is the volume? Try it with the slider.") },
  balok: { name: tr("Balok", "Cuboid"), dims: { p: [tr("panjang p", "length p"), 1, 6, 4], l: [tr("lebar l", "width l"), 1, 6, 2.5], t: [tr("tinggi t", "height t"), 1, 6, 2] },
    q: tr("Buka jaringnya. Ada berapa pasang sisi yang ukurannya sama? Bagaimana itu terlihat di rumus luas permukaan?", "Unfold the net. How many pairs of faces have the same size? How does that show in the surface-area formula?") },
  prisma: { name: tr("Prisma segitiga", "Triangular prism"), dims: { a: [tr("sisi segitiga a", "triangle side a"), 1, 5, 3], t: [tr("panjang t", "length t"), 1, 7, 4.5] },
    q: tr("Hitung sisi (S), rusuk (R), dan titik sudut (T). Apakah S + T − R = 2 juga berlaku di sini?", "Count faces (F), edges (E) and vertices (V). Does F + V − E = 2 hold here too?") },
  limas: { name: tr("Limas segi empat", "Square pyramid"), dims: { a: [tr("sisi alas a", "base side a"), 1, 6, 3.5], t: [tr("tinggi t", "height t"), 1, 6, 3] },
    q: tr("Bandingkan volume limas ini dengan balok yang alas dan tingginya sama. Berapa limas mengisi satu balok?", "Compare this pyramid's volume with a cuboid of the same base and height. How many pyramids fill one cuboid?") },
  tabung: { name: tr("Tabung", "Cylinder"), dims: { r: [tr("jari-jari r", "radius r"), 0.5, 3, 1.5], t: [tr("tinggi t", "height t"), 1, 6, 3.5] },
    q: tr("Jika jari-jari dibuat 2 kali, volumenya menjadi berapa kali? Kenapa tidak 2 kali?", "If the radius is doubled, how many times bigger is the volume? Why not twice?") },
  kerucut: { name: tr("Kerucut", "Cone"), dims: { r: [tr("jari-jari r", "radius r"), 0.5, 3, 1.6], t: [tr("tinggi t", "height t"), 1, 6, 3.6] },
    q: tr("Berapa kerucut yang isinya sama dengan satu tabung beralas dan tinggi sama? Bandingkan angka volumenya.", "How many cones hold as much as one cylinder with the same base and height? Compare the volumes.") },
  bola: { name: tr("Bola", "Sphere"), dims: { r: [tr("jari-jari r", "radius r"), 0.5, 3, 1.8] },
    q: tr("Luas permukaan bola sama dengan luas berapa lingkaran berjari-jari sama? Lihat rumusnya.", "The sphere's surface equals how many circles of the same radius? Look at the formula.") },
};
const FORMULA = {
  kubus: ["V = s³", "L = 6s²"], balok: ["V = p × l × t", "L = 2(pl + pt + lt)"],
  prisma: ["V = luas alas × t", "L = 2 × luas alas + 3at"], limas: ["V = ⅓ × a² × t", "L = a² + 4 × ½ × a × s"],
  tabung: ["V = πr²t", "L = 2πr(r + t)"], kerucut: ["V = ⅓πr²t", "L = πr(r + s)"], bola: ["V = ⁴⁄₃πr³", "L = 4πr²"],
};
if (EN) { FORMULA.prisma = ["V = base area × t", "A = 2 × base area + 3at"]; FORMULA.limas = ["V = ⅓ × a² × t", "A = a² + 4 × ½ × a × s"];
  for (const k in FORMULA) FORMULA[k][1] = FORMULA[k][1].replace(/^L =/, "A ="); }

/* ---------------- scene ---------------- */
const host = $("stage");
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
renderer.outputColorSpace = THREE.SRGBColorSpace;
host.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 200);
camera.position.set(9, 7, 11);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.dampingFactor = 0.08; controls.enablePan = false;
controls.minDistance = 6; controls.maxDistance = 30;
controls.autoRotate = !window.matchMedia("(prefers-reduced-motion: reduce)").matches; controls.autoRotateSpeed = 0.8;
controls.addEventListener("start", () => { controls.autoRotate = false; });

scene.add(new THREE.HemisphereLight(0xffffff, 0xc9d1ea, 1.15));
const key = new THREE.DirectionalLight(0xffffff, 1.4); key.position.set(6, 12, 8); scene.add(key);
const rim = new THREE.DirectionalLight(0xc39a52, 0.5); rim.position.set(-8, 4, -6); scene.add(rim);
// a faint polar floor: rings and spokes, the same quiet line-work as the landing
const floor = new THREE.Group();
const ringMat = new THREE.LineBasicMaterial({ color: 0x1c2a55, transparent: true, opacity: 0.08 });
for (let r = 2; r <= 12; r += 2) {
  const pts = []; for (let i = 0; i <= 128; i++) { const a = (i / 128) * Math.PI * 2; pts.push(new THREE.Vector3(r * Math.cos(a), 0, r * Math.sin(a))); }
  floor.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), ringMat));
}
for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; floor.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(12 * Math.cos(a), 0, 12 * Math.sin(a))]), ringMat)); }
floor.position.y = -0.01;
scene.add(floor);

let kind = "balok", dims = {}, model = null, fold = 1, target = 1;
function rebuild() {
  if (model) scene.remove(model.root);
  model = build(kind, dims);
  setFold(model, fold);
  scene.add(model.root);
  controls.target.set(0, model.height / 2, 0);
  readouts();
}
function resize() {
  const w = host.clientWidth, h = host.clientHeight;
  renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(host);
resize();
(function loop() {
  requestAnimationFrame(loop);
  if (Math.abs(target - fold) > 0.001) { fold += (target - fold) * 0.08; if (model) setFold(model, fold); }
  controls.update(); renderer.render(scene, camera);
})();

/* ---------------- panel ---------------- */
const fmt = (x) => x.toLocaleString(EN ? "en" : "id", { maximumFractionDigits: 2 });
function readouts() {
  const m = measures(kind, dims);
  $("vol").textContent = fmt(m.V); $("area").textContent = fmt(m.L);
  $("f-vol").textContent = FORMULA[kind][0]; $("f-area").textContent = FORMULA[kind][1];
  const e = $("euler");
  if (m.euler) {
    const [F, E, V] = m.euler;
    e.hidden = false;
    $("eF").textContent = F; $("eE").textContent = E; $("eV").textContent = V;
  } else e.hidden = true;
  $("q").textContent = SOLIDS[kind].q;
  const flat = model && model.hinges.length;
  $("net").disabled = !flat;
  $("net-note").textContent = flat ? "" : tr("Bangun lengkung tidak punya jaring dari sisi datar; lihat rumus luasnya.", "Curved solids have no net of flat faces; see the surface formula.");
}

function choose(k) {
  kind = k; dims = {};
  for (const [key, [, , , v]] of Object.entries(SOLIDS[k].dims)) dims[key] = v;
  document.querySelectorAll("#solids button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.k === k)));
  $("sliders").innerHTML = Object.entries(SOLIDS[k].dims).map(([key, [label, min, max, v]]) =>
    `<label class="dim"><span>${label}</span><input type="range" min="${min}" max="${max}" step="0.1" value="${v}" data-d="${key}"><b>${v}</b></label>`).join("");
  $("sliders").querySelectorAll("input").forEach((inp) => inp.addEventListener("input", () => {
    dims[inp.dataset.d] = Number(inp.value); inp.nextElementSibling.textContent = inp.value; rebuild();
  }));
  $("net").value = 1; fold = target = 1;
  $("solid-name").textContent = SOLIDS[k].name;
  rebuild();
}

$("solids").innerHTML = Object.entries(SOLIDS).map(([k, s]) => `<button type="button" data-k="${k}" aria-pressed="false">${s.name}</button>`).join("");
$("solids").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) choose(b.dataset.k); });
$("net").addEventListener("input", (e) => { target = Number(e.target.value); controls.autoRotate = false; });
$("open").addEventListener("click", () => { target = target > 0.5 ? 0 : 1; $("net").value = target; controls.autoRotate = false; });
choose("balok");
