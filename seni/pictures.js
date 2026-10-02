/* Pictures made only of equations: every stroke is one equation with a domain, the way students
   build pictures in a graphing tool. The characters are original designs (a ninja face, a robot
   and a Batak rumah bolon), not copies of any brand. Each picture has a few parameters to move. */

const PI = Math.PI;
const r2 = (x) => Math.round(x * 100) / 100;

/** Equation text helpers; F comes from makeFmt in curves.js. */
function poly(F, terms, lhs = "y") {
  // terms: [[coefficient, "x²"], [coefficient, "x"], [constant, ""]]
  let out = "";
  for (const [c0, v] of terms) {
    const c = r2(c0);
    if (!c) continue;
    const mag = Math.abs(c) === 1 && v ? "" : F.num(Math.abs(c));
    out += out ? ` ${c < 0 ? "−" : "+"} ${mag}${v}` : `${c < 0 ? "−" : ""}${mag}${v}`;
  }
  return `<i>${lhs}</i> = ${out || "0"}`;
}
const X = "<i>x</i>", X2 = "<i>x</i>²", AX = "|<i>x</i>|";

/* stroke constructors: each returns { xy(t), t0, t1, eq, dom } */
function fx(F, f, a, b, eq) { return { xy: (t) => [t, f(t)], t0: a, t1: b, eq, dom: `${F.num(a)} ≤ ${X} ≤ ${F.num(b)}` }; }
function line(F, m, c, a, b) { return fx(F, (x) => m * x + c, a, b, poly(F, [[m, X], [c, ""]])); }
function through(F, [x1, y1], [x2, y2]) {
  if (Math.abs(x2 - x1) < 1e-9) return vline(F, x1, Math.min(y1, y2), Math.max(y1, y2));
  const m = (y2 - y1) / (x2 - x1);
  return line(F, m, y1 - m * x1, Math.min(x1, x2), Math.max(x1, x2));
}
function vline(F, x0, a, b) { return { xy: (t) => [x0, t], t0: a, t1: b, eq: `${X} = ${F.num(r2(x0))}`, dom: `${F.num(a)} ≤ <i>y</i> ≤ ${F.num(b)}` }; }
function quad(F, a, b, c, lo, hi) { return fx(F, (x) => a * x * x + b * x + c, lo, hi, poly(F, [[a, X2], [b, X], [c, ""]])); }
function circle(F, cx, cy, r) {
  return { xy: (t) => [cx + r * Math.cos(t), cy + r * Math.sin(t)], t0: 0, t1: 2 * PI, closed: true,
    eq: `${F.shift(X, r2(cx))}² + ${F.shift("<i>y</i>", r2(cy))}² = ${F.num(r2(r))}²`, dom: "" };
}
function ellipse(F, cx, cy, a, b, t0 = 0, t1 = 2 * PI) {
  const full = t1 - t0 >= 2 * PI - 1e-9;
  return { xy: (t) => [cx + a * Math.cos(t), cy + b * Math.sin(t)], t0, t1, closed: full,
    eq: full ? `(${F.shift(X, r2(cx))}/${F.num(r2(a))})² + (${F.shift("<i>y</i>", r2(cy))}/${F.num(r2(b))})² = 1`
      : `${X} = ${F.num(r2(cx))} + ${F.num(r2(a))} cos <i>t</i>, <i>y</i> = ${F.num(r2(cy))} + ${F.num(r2(b))} sin <i>t</i>`,
    dom: full ? "" : `${Math.round((t0 * 180) / PI)}° ≤ <i>t</i> ≤ ${Math.round((t1 * 180) / PI)}°` };
}
function spiral(F, cx, cy, a, turns, flip = 1) {
  return { xy: (t) => [cx + flip * a * t * Math.cos(t), cy + a * t * Math.sin(t)], t0: 0, t1: 2 * PI * turns,
    eq: `<i>r</i> = ${F.num(a)}<i>θ</i>`, dom: `${L0("pusat", "centre")} (${F.num(cx)}, ${F.num(cy)}), 0 ≤ <i>θ</i> ≤ ${2 * turns}π` };
}
/** A coloured region between two graphs: lo(x) ≤ y ≤ hi(x) for a ≤ x ≤ b (an inequality). */
function region(F, lo, hi, a, b, eqLo, eqHi) {
  return { region: true, lo, hi, t0: a, t1: b, eq: `${eqLo} ≤ <i>y</i> ≤ ${eqHi}`, dom: `${F.num(a)} ≤ ${X} ≤ ${F.num(b)}` };
}
let L0 = (id) => id;
const mirror = (fn) => [fn(1), fn(-1)];

export const PICTURES = [
  { id: "ninja", name: ["Wajah ninja", "Ninja face"],
    params: { s: ["senyum a", "smile a", 0.05, 0.6, 0.05, 0.3], p: ["pupil r", "pupil r", 0.15, 0.55, 0.05, 0.34], h: ["tinggi rambut", "hair height", 1, 3.4, 0.1, 2.4] },
    build(F, p) {
      const out = [];
      const add = (part, col, opt = {}) => out.push(Object.assign(part, { col }, opt));
      // hair: pointed spikes from 1 − |sin|
      const hair = (x) => 2.85 + p.h * (1 - Math.abs(Math.sin(1.6 * x))) * (1 - (x / 5.4) ** 2);
      const hairEq = `2,85 + ${F.num(p.h)}(1 − |sin 1,6${X}|)(1 − (${X}/5,4)²)`;
      add(fx(F, hair, -4.6, 4.6, `<i>y</i> = ${hairEq}`), "hair", { w: 2.8 });
      for (const k of [1, -1]) add(vline(F, 4.6 * k, 2.75, r2(hair(4.6))), "hair", { w: 2.8 });
      // headband with a gorga spiral on its plate
      add(quad(F, -0.03, 0, 2.85, -4.6, 4.6), "band", { w: 2.6 });
      add(quad(F, -0.03, 0, 1.35, -4.6, 4.6), "band", { w: 2.6 });
      add(through(F, [-1.8, 1.48], [1.8, 1.48]), "plate"); add(through(F, [-1.8, 2.62], [1.8, 2.62]), "plate");
      add(vline(F, -1.8, 1.48, 2.62), "plate"); add(vline(F, 1.8, 1.48, 2.62), "plate");
      add(spiral(F, 0, 2.05, 0.045, 2), "accent", { w: 2.2 });
      add(fx(F, (x) => 2.3 + 0.55 * Math.sin(1.4 * (x - 4.6)) - 0.18 * (x - 4.6), 4.6, 8.4, `<i>y</i> = 2,3 + 0,55 sin(1,4(${X} − 4,6)) − 0,18(${X} − 4,6)`), "band", { w: 2.4 });
      add(fx(F, (x) => 1.7 + 0.45 * Math.sin(1.4 * (x - 4.6) + 1) - 0.3 * (x - 4.6), 4.6, 7.8, `<i>y</i> = 1,7 + 0,45 sin(1,4(${X} − 4,6) + 1) − 0,3(${X} − 4,6)`), "band", { w: 2.4 });
      // face and ears
      add(ellipse(F, 0, -0.6, 4.3, 4.9, PI - 0.36, 2 * PI + 0.36), "ink", { w: 2.6 });
      for (const k of [1, -1]) add(ellipse(F, 4.25 * k, -0.4, 0.75, 1.05, k > 0 ? -PI / 2 : PI / 2, k > 0 ? PI / 2 : 1.5 * PI), "ink");
      // eyes, pupils, brows
      for (const k of [-1, 1]) {
        add(ellipse(F, 1.7 * k, 0.05, 0.95, 0.6), "ink", { fill: "#ffffff" });
        add(circle(F, 1.55 * k, 0, p.p), "eye", { fill: true });
        add(through(F, [2.65 * k, 1.0], [0.85 * k, 0.78]), "ink", { w: 2.6 });
      }
      // whiskers: three straight lines on each cheek
      for (const k of [-1, 1]) for (const [c, m] of [[-1.0, 0.16], [-1.45, 0], [-1.9, -0.16]]) {
        const a = 2.25 * k, b = 3.35 * k;
        add(through(F, [a, c], [b, c + m * (3.35 - 2.25)]), "ink", { w: 1.8 });
      }
      add(quad(F, 0.8, 0, -1.15, -0.22, 0.22), "ink");
      add(quad(F, p.s, 0, -2.7, -1.35, 1.35), "mouth", { w: 2.6 });
      // colouring: each colour is an inequality between two graphs
      const face = (x) => -0.6 - 4.9 * Math.sqrt(Math.max(0, 1 - (x / 4.3) ** 2));
      add(region(F, face, (x) => 1.35 - 0.03 * x * x, -4.3, 4.3, `−0,6 − 4,9√(1 − (${X}/4,3)²)`, `−0,03${X2} + 1,35`), "#f7dfc4");
      add(region(F, (x) => 2.85 - 0.03 * x * x, hair, -4.6, 4.6, `−0,03${X2} + 2,85`, hairEq), "#f0a53a");
      add(region(F, (x) => 1.35 - 0.03 * x * x, (x) => 2.85 - 0.03 * x * x, -4.6, 4.6, `−0,03${X2} + 1,35`, `−0,03${X2} + 2,85`), "#24356b");
      add(region(F, () => 1.48, () => 2.62, -1.8, 1.8, "1,48", "2,62"), "#d5dae8");
      return out;
    },
    colors: { hair: "#d98a12", band: "#1c2a55", plate: "#6f7896", accent: "#a31d1a", ink: "#1c2a55", eye: "#2a5fb0", mouth: "#a31d1a" } },

  { id: "robot", name: ["Wajah robot", "Robot face"],
    params: { c: ["tinggi sirip", "fin height", 0.5, 3, 0.1, 1.8], e: ["miring mata", "eye slant", 0, 0.6, 0.05, 0.3], j: ["lebar rahang", "jaw width", 0.8, 2.2, 0.1, 1.5] },
    build(F, p) {
      const out = [];
      const add = (part, col, opt = {}) => out.push(Object.assign(part, { col }, opt));
      const top = 4.2;
      add(fx(F, (x) => top - 0.9 * Math.abs(x), -3.2, 3.2, `<i>y</i> = 4,2 − 0,9${AX}`), "steel", { w: 2.8 });
      add(fx(F, (x) => top + p.c - (p.c / 0.6) * Math.abs(x), -0.6, 0.6, `<i>y</i> = ${F.num(r2(top + p.c))} − ${F.num(r2(p.c / 0.6))}${AX}`), "red", { w: 2.8 });
      for (const k of [1, -1]) {
        add(through(F, [3.2 * k, 1.32], [4.3 * k, 4.6]), "red", { w: 2.8 });
        add(through(F, [4.3 * k, 4.6], [4.3 * k, 0.4]), "red", { w: 2.8 });
        add(vline(F, 3.2 * k, -2.5, 1.32), "steel", { w: 2.8 });
        add(through(F, [3.2 * k, -2.5], [p.j * k, -5]), "steel", { w: 2.8 });
        // eye: a slanted slit between two lines, filled
        const a = 0.55 * k, b = 2.6 * k;
        add(through(F, [a, 0.55], [b, 0.55 + p.e * 2.05]), "eye", { w: 2.4 });
        add(through(F, [a, 0.05], [b, 0.05 + p.e * 2.05 + 0.25]), "eye", { w: 2.4 });
        add(vline(F, b, r2(0.05 + p.e * 2.05 + 0.25), r2(0.55 + p.e * 2.05)), "eye", { w: 2.4 });
        add(through(F, [1.1 * k, -1.7], [3.2 * k, -0.9]), "steel", { w: 2 });
      }
      add(through(F, [-p.j, -5], [p.j, -5]), "steel", { w: 2.8 });
      for (const y of [-2.55, -3.05, -3.55]) add(through(F, [-1.2, y], [1.2, y]), "steel", { w: 1.8 });
      for (const x of [-0.8, -0.4, 0, 0.4, 0.8]) add(vline(F, x, -3.85, -2.3), "steel", { w: 1.6 });
      add(circle(F, 0, 2.35, 0.6), "gold", { w: 2.4, fill: "#f3e3c2" });
      add(fx(F, (x) => 2.35 + 0.3 - 0.75 * Math.abs(x), -0.4, 0.4, `<i>y</i> = 2,65 − 0,75${AX}`), "gold", { w: 2.2 });
      const jaw = 2.5 / (3.2 - p.j);
      add(region(F, (x) => -5 + jaw * Math.max(0, Math.abs(x) - p.j), (x) => top - 0.9 * Math.abs(x), -3.2, 3.2,
        `−5 + ${F.num(r2(jaw))}·maks(0, ${AX} − ${F.num(p.j)})`, `4,2 − 0,9${AX}`), "#dfe4f0");
      add(region(F, (x) => top - 0.9 * Math.abs(x), (x) => top + p.c - (p.c / 0.6) * Math.abs(x), -0.6, 0.6, `4,2 − 0,9${AX}`, `${F.num(r2(top + p.c))} − ${F.num(r2(p.c / 0.6))}${AX}`), "#c0392b");
      for (const k of [1, -1]) {
        const lo = (x) => 1.32 - (0.92 / 1.1) * (Math.abs(x) - 3.2), hi = (x) => 1.32 + (3.28 / 1.1) * (Math.abs(x) - 3.2);
        add(region(F, lo, hi, k > 0 ? 3.2 : -4.3, k > 0 ? 4.3 : -3.2, `1,32 − 0,84(${AX} − 3,2)`, `1,32 + 2,98(${AX} − 3,2)`), "#c0392b");
        const a = 0.55, b = 2.6;
        add(region(F, (x) => 0.05 + p.e * (Math.abs(x) - a) + 0.25 * (Math.abs(x) - a) / 2.05, (x) => 0.55 + p.e * (Math.abs(x) - a), k > 0 ? a : -b, k > 0 ? b : -a,
          `${F.num(r2(0.05 - (p.e + 0.12) * a))} + ${F.num(r2(p.e + 0.12))}${AX}`, `${F.num(r2(0.55 - p.e * a))} + ${F.num(r2(p.e))}${AX}`), "#7fe0ff", { glow: true });
      }
      return out;
    },
    colors: { steel: "#1c2a55", red: "#a31d1a", eye: "#1f9fc9", gold: "#8a5f1c" } },

  { id: "bolon", name: ["Rumah bolon", "Rumah bolon (Batak house)"],
    params: { a: ["lengkung atap a", "roof curve a", 0.02, 0.14, 0.01, 0.09], k: ["gelombang gorga k", "gorga waves k", 1, 4, 0.5, 2], s: ["tinggi tiang", "stilt height", 1, 3, 0.1, 2.2] },
    build(F, p) {
      const out = [];
      const add = (part, col, opt = {}) => out.push(Object.assign(part, { col }, opt));
      const ridge = (x) => 2.6 + p.a * x * x, eave = (x) => 0.2 + 0.04 * x * x;
      add(quad(F, p.a, 0, 2.6, -6.6, 6.6), "roof", { w: 3 });
      add(quad(F, 0.04, 0, 0.2, -5.2, 5.2), "roof", { w: 2.6 });
      for (const k of [1, -1]) add(through(F, [6.6 * k, r2(ridge(6.6))], [5.2 * k, r2(eave(5.2))]), "roof", { w: 2.6 });
      // the gable triangle and its ornament
      add(through(F, [-2.4, 0.45], [0, 2.55]), "red");
      add(through(F, [0, 2.55], [2.4, 0.45]), "red");
      add(spiral(F, -0.75, 1.1, 0.045, 1.5), "ink", { w: 1.8 });
      add(spiral(F, 0.75, 1.1, 0.045, 1.5, -1), "ink", { w: 1.8 });
      // wall with a gorga band: a sine wave between two ipon-ipon (tooth) rows
      add(through(F, [-4.2, -0.2], [4.2, -0.2]), "ink"); add(through(F, [-4.2, -3.2], [4.2, -3.2]), "ink");
      add(vline(F, -4.2, -3.2, -0.2), "ink"); add(vline(F, 4.2, -3.2, -0.2), "ink");
      add(fx(F, (x) => -1.7 + 0.55 * Math.sin(p.k * x), -4.2, 4.2, `<i>y</i> = −1,7 + 0,55 sin(${F.num(p.k)}${X})`), "white", { w: 2.8 });
      add(fx(F, (x) => -0.35 - 0.4 * (1 - Math.abs(Math.sin(2.5 * x))), -4.2, 4.2, `<i>y</i> = −0,35 − 0,4(1 − |sin 2,5${X}|)`), "ink", { w: 1.8 });
      add(fx(F, (x) => -3.05 + 0.4 * (1 - Math.abs(Math.sin(2.5 * x))), -4.2, 4.2, `<i>y</i> = −3,05 + 0,4(1 − |sin 2,5${X}|)`), "ink", { w: 1.8 });
      // stilts and ground
      const g = -3.2 - p.s;
      for (const x of [-3.6, -1.2, 1.2, 3.6]) add(vline(F, x, r2(g), -3.2), "wood", { w: 2.6 });
      add(through(F, [-7.5, r2(g)], [7.5, r2(g)]), "gold", { w: 2 });
      const side = (x) => eave(5.2) + ((ridge(6.6) - eave(5.2)) / 1.4) * (Math.abs(x) - 5.2);
      add(region(F, (x) => (Math.abs(x) <= 5.2 ? eave(x) : side(x)), ridge, -6.6, 6.6, `${L0("atap bawah", "lower roof")}`, `${F.num(p.a)}${X2} + 2,6`), "#2a2f45");
      add(region(F, (x) => eave(x), (x) => 2.55 - (2.1 / 2.4) * Math.abs(x), -2.4, 2.4, `0,04${X2} + 0,2`, `2,55 − 0,88${AX}`), "#f6f1e7");
      add(region(F, () => -3.2, () => -0.2, -4.2, 4.2, "−3,2", "−0,2"), "#a31d1a");
      return out;
    },
    colors: { roof: "#1c2a55", red: "#a31d1a", ink: "#141414", wood: "#5b4630", gold: "#8a5f1c", white: "#ffffff" } },
];

export function setLang(L) { L0 = L; }

/** Points of one stroke. */
export function strokePoints(s, n = 260) {
  const pts = [];
  if (s.region) {
    for (let i = 0; i <= n; i++) { const x = s.t0 + ((s.t1 - s.t0) * i) / n; pts.push([x, s.hi(x)]); }
    for (let i = n; i >= 0; i--) { const x = s.t0 + ((s.t1 - s.t0) * i) / n; pts.push([x, s.lo(x)]); }
    return pts;
  }
  for (let i = 0; i <= n; i++) {
    const t = s.t0 + ((s.t1 - s.t0) * i) / n;
    const [x, y] = s.xy(t);
    pts.push([x, y]);
  }
  return pts;
}
