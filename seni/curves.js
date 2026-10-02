/* Curve families for the curve studio and a small, safe expression reader for the students' own
   equations (no eval). Every family turns a parameter t into a point, so the page can show how each
   point of the curve comes out of the equation. */

const PI = Math.PI;
const gcd = (a, b) => (b ? gcd(b, a % b) : a);

/* ---------------- number and equation formatting ---------------- */
export function makeFmt(lang) {
  const loc = lang === "en" ? "en" : "id";
  const num = (x, d = 2) => {
    if (!Number.isFinite(x)) return "—";
    const s = Math.abs(x) < 1e-9 ? 0 : x;
    return s.toLocaleString(loc, { minimumFractionDigits: 0, maximumFractionDigits: d }).replace("-", "−");
  };
  const fix = (x) => (Number.isFinite(x) ? (Math.abs(x) < 5e-3 ? 0 : x).toLocaleString(loc, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace("-", "−") : "—");
  const deg = (t) => `${Math.round((t * 180) / PI)}°`;
  // "+ 3" / "− 3" for a term that follows another
  const sig = (x) => (Math.abs(x) < 1e-9 ? "" : x < 0 ? `− ${num(-x)}` : `+ ${num(x)}`);
  // coefficient in front of a variable: 1 -> "", -1 -> "−"
  const co = (x) => (x === 1 ? "" : x === -1 ? "−" : num(x));
  // (v − h) or just v when h = 0
  const shift = (v, h) => (Math.abs(h) < 1e-9 ? v : `(${v} ${sig(-h)})`);
  return { num, fix, deg, sig, co, shift };
}

/* ---------------- families ----------------
   kind: "fx" (t = x, point (x, f(x))), "polar" (t = θ, point r(θ)·(cos θ, sin θ)), "param" (t -> (x, y)).
   params: key -> [label id, label en, min, max, step, start]. */
export const FAMILIES = [
  { id: "garis", j: "smp", kind: "fx", name: ["Garis lurus", "Straight line"],
    params: { m: ["gradien m", "gradient m", -4, 4, 0.1, 1.5], c: ["konstanta c", "constant c", -6, 6, 0.5, 1] },
    f: (x, p) => p.m * x + p.c,
    eq: (p, F) => (p.m === 0 ? `<i>y</i> = ${F.num(p.c)}` : `<i>y</i> = ${F.co(p.m)}<i>x</i> ${F.sig(p.c)}`),
    calc: (t, v, p, F) => `<i>x</i> = ${F.fix(t)} → <i>y</i> = ${F.num(p.m)} · ${F.fix(t)} ${F.sig(p.c)} = <b>${F.fix(v.y)}</b>`,
    info: (p, F, L) => [[L("gradien", "gradient"), F.num(p.m)], [L("memotong sumbu-y", "y-intercept"), `(0, ${F.num(p.c)})`],
      [L("memotong sumbu-x", "x-intercept"), p.m === 0 ? "—" : `(${F.num(-p.c / p.m)}, 0)`]],
    q: ["Geser m ke angka negatif. Ke mana garisnya miring sekarang? Apa yang terjadi saat m = 0?",
      "Move m to a negative number. Which way does the line lean now? What happens when m = 0?"] },

  { id: "parabola", j: "smp", kind: "fx", name: ["Parabola", "Parabola"],
    params: { a: ["a (lebar & arah)", "a (width & direction)", -2, 2, 0.1, 0.5], h: ["geser kanan h", "shift right h", -5, 5, 0.5, 1], k: ["geser atas k", "shift up k", -6, 6, 0.5, -3] },
    f: (x, p) => p.a * (x - p.h) ** 2 + p.k,
    eq: (p, F) => `<i>y</i> = ${F.co(p.a)}${F.shift("<i>x</i>", p.h)}² ${F.sig(p.k)}`,
    calc: (t, v, p, F) => `<i>x</i> = ${F.fix(t)} → <i>y</i> = ${F.num(p.a)} · (${F.fix(t)} ${F.sig(-p.h)})² ${F.sig(p.k)} = <b>${F.fix(v.y)}</b>`,
    info: (p, F, L) => [[L("titik puncak", "vertex"), `(${F.num(p.h)}, ${F.num(p.k)})`], [L("sumbu simetri", "axis of symmetry"), `x = ${F.num(p.h)}`],
      [L("terbuka ke", "opens"), p.a > 0 ? L("atas", "up") : p.a < 0 ? L("bawah", "down") : L("— (garis)", "— (a line)")]],
    q: ["Apa yang berubah kalau a dibuat negatif? Dan kalau a mendekati 0?", "What changes when a becomes negative? And when a gets close to 0?"] },

  { id: "lingkaran", j: "smp", kind: "param", name: ["Lingkaran", "Circle"],
    params: { r: ["jari-jari r", "radius r", 0.5, 7, 0.1, 4], a: ["pusat a", "centre a", -5, 5, 0.5, 0], b: ["pusat b", "centre b", -4, 4, 0.5, 0] },
    range: () => [0, 2 * PI],
    xy: (t, p) => [p.a + p.r * Math.cos(t), p.b + p.r * Math.sin(t)],
    eq: (p, F) => `${F.shift("<i>x</i>", p.a)}² + ${F.shift("<i>y</i>", p.b)}² = ${F.num(p.r)}²`,
    calc: (t, v, p, F) => `<i>t</i> = ${F.deg(t)} → <i>x</i> = ${F.num(p.a)} + ${F.num(p.r)} cos ${F.deg(t)} = <b>${F.fix(v.x)}</b>, <i>y</i> = ${F.num(p.b)} + ${F.num(p.r)} sin ${F.deg(t)} = <b>${F.fix(v.y)}</b>`,
    info: (p, F, L) => [[L("pusat", "centre"), `(${F.num(p.a)}, ${F.num(p.b)})`], [L("keliling 2πr", "circumference 2πr"), F.num(2 * PI * p.r)], [L("luas πr²", "area πr²"), F.num(PI * p.r * p.r)]],
    q: ["Setiap titik berjarak r dari pusat. Coba geser t pelan-pelan: kenapa x memakai cos dan y memakai sin?",
      "Every point is r away from the centre. Move t slowly: why does x use cos and y use sin?"] },

  { id: "gelombang", j: "sma", kind: "fx", name: ["Gelombang sinus", "Sine wave"],
    params: { A: ["amplitudo A", "amplitude A", 0.5, 6, 0.1, 3], B: ["frekuensi B", "frequency B", 0.2, 4, 0.1, 1], C: ["geser fase C (×π)", "phase shift C (×π)", -1, 1, 0.05, 0] },
    f: (x, p) => p.A * Math.sin(p.B * x + p.C * PI),
    eq: (p, F) => `<i>y</i> = ${F.co(p.A)} sin(${F.co(p.B)}<i>x</i>${p.C ? ` ${F.sig(p.C).replace(/ 1$/, " ")}π` : ""})`,
    calc: (t, v, p, F) => `<i>x</i> = ${F.fix(t)} → <i>y</i> = ${F.num(p.A)} sin(${F.num(p.B)} · ${F.fix(t)}${p.C ? ` ${F.sig(p.C).replace(/ 1$/, " ")}π` : ""}) = <b>${F.fix(v.y)}</b>`,
    info: (p, F, L) => [[L("amplitudo", "amplitude"), F.num(p.A)], [L("periode 2π/B", "period 2π/B"), F.num((2 * PI) / p.B)], [L("nilai terbesar", "largest value"), F.num(p.A)]],
    q: ["Gandakan B. Apa yang terjadi pada jarak antar puncak? Cocokkan dengan periode 2π/B.",
      "Double B. What happens to the distance between peaks? Compare it with the period 2π/B."] },

  { id: "mawar", j: "sma", kind: "polar", name: ["Mawar", "Rose"],
    params: { n: ["pembilang n", "numerator n", 1, 9, 1, 4], d: ["penyebut d", "denominator d", 1, 9, 1, 1], a: ["ukuran a", "size a", 2, 7, 0.5, 6] },
    range: (p) => { const g = gcd(p.n, p.d), n = p.n / g, d = p.d / g; return [0, (n * d) % 2 ? PI * d : 2 * PI * d]; },
    r: (t, p) => p.a * Math.cos((p.n / p.d) * t),
    eq: (p, F) => `<i>r</i> = ${F.num(p.a)} cos(${p.d === 1 ? F.num(p.n) : `${p.n}⁄${p.d}`} <i>θ</i>)`,
    calc: (t, v, p, F, L) => `<i>θ</i> = ${F.deg(t)} → <i>r</i> = ${F.num(p.a)} cos(${p.d === 1 ? p.n : `${p.n}⁄${p.d}`} · ${F.deg(t)}) = <b>${F.fix(v.r)}</b>${v.r < -1e-6 ? `<span class="aside">${L("r negatif: titiknya ke arah berlawanan", "negative r: the point goes the opposite way")}</span>` : ""}`,
    info: (p, F, L) => { const g = gcd(p.n, p.d), n = p.n / g, d = p.d / g; const petals = (n * d) % 2 ? n : 2 * n;
      return [[L("kelopak", "petals"), String(petals)], [L("θ berjalan sampai", "θ runs up to"), `${((n * d) % 2 ? d : 2 * d) === 1 ? "" : (n * d) % 2 ? d : 2 * d}π`], ["k = n/d", d === 1 ? String(n) : `${n}/${d}`]]; },
    q: ["Untuk d = 1: coba n = 3, lalu n = 4. Kapan banyak kelopak sama dengan n, dan kapan 2n?",
      "With d = 1: try n = 3, then n = 4. When is the number of petals n, and when is it 2n?"] },

  { id: "spiral", j: "sma", kind: "polar", name: ["Spiral Archimedes", "Archimedean spiral"],
    params: { a: ["pelebaran a", "growth a", 0.1, 1, 0.05, 0.35], turns: ["putaran", "turns", 1, 6, 1, 3] },
    range: (p) => [0, 2 * PI * p.turns],
    r: (t, p) => p.a * t,
    eq: (p, F) => `<i>r</i> = ${F.num(p.a)} <i>θ</i>`,
    calc: (t, v, p, F) => `<i>θ</i> = ${F.deg(t)} = ${F.fix(t)} rad → <i>r</i> = ${F.num(p.a)} · ${F.fix(t)} = <b>${F.fix(v.r)}</b>`,
    info: (p, F, L) => [[L("jarak antar lengkung 2πa", "gap between turns 2πa"), F.num(2 * PI * p.a)], [L("putaran", "turns"), String(p.turns)]],
    q: ["Ukur jarak antar lengkung dengan grid. Apakah selalu sama? Bandingkan dengan 2πa.",
      "Measure the gap between turns on the grid. Is it always the same? Compare it with 2πa."] },

  { id: "limacon", j: "sma", kind: "polar", name: ["Kardioid & limaçon", "Cardioid & limaçon"],
    params: { b: ["konstanta b", "constant b", 0, 6, 0.25, 3], a: ["koefisien a", "coefficient a", 0.5, 4, 0.25, 3] },
    range: () => [0, 2 * PI],
    r: (t, p) => p.b + p.a * Math.cos(t),
    eq: (p, F) => `<i>r</i> = ${F.num(p.b)} + ${F.num(p.a)} cos <i>θ</i>`,
    calc: (t, v, p, F) => `<i>θ</i> = ${F.deg(t)} → <i>r</i> = ${F.num(p.b)} + ${F.num(p.a)} cos ${F.deg(t)} = <b>${F.fix(v.r)}</b>`,
    info: (p, F, L) => { const q = p.b / p.a;
      const kind = Math.abs(q - 1) < 1e-9 ? L("kardioid (bentuk hati)", "cardioid (heart shape)") : q < 1 ? L("limaçon dengan simpul dalam", "limaçon with an inner loop")
        : q < 2 ? L("limaçon berlekuk", "dimpled limaçon") : L("limaçon cembung", "convex limaçon");
      return [[L("bentuk", "shape"), kind], ["b : a", `${F.num(p.b)} : ${F.num(p.a)}`]]; },
    q: ["Buat b sama dengan a. Bentuk apa yang muncul? Lalu buat b lebih kecil dari a.",
      "Make b equal to a. Which shape appears? Then make b smaller than a."] },

  { id: "lissajous", j: "sma", kind: "param", name: ["Lissajous", "Lissajous"],
    params: { a: ["frekuensi x: a", "x frequency a", 1, 9, 1, 3], b: ["frekuensi y: b", "y frequency b", 1, 9, 1, 2], dl: ["fase δ (×π)", "phase δ (×π)", 0, 1, 0.05, 0.5] },
    range: () => [0, 2 * PI],
    xy: (t, p) => [6 * Math.sin(p.a * t + p.dl * PI), 6 * Math.sin(p.b * t)],
    eq: (p, F) => `<i>x</i> = 6 sin(${F.num(p.a)}<i>t</i> + ${F.num(p.dl)}π), &nbsp;<i>y</i> = 6 sin(${F.num(p.b)}<i>t</i>)`,
    calc: (t, v, p, F) => `<i>t</i> = ${F.deg(t)} → <i>x</i> = <b>${F.fix(v.x)}</b>, <i>y</i> = <b>${F.fix(v.y)}</b>`,
    info: (p, F, L) => { const g = gcd(p.a, p.b); return [[L("rasio a : b", "ratio a : b"), `${p.a / g} : ${p.b / g}`], [L("lengkung menyentuh sisi kanan", "loops touching the right side"), String(p.b / g)]]; },
    q: ["Hitung berapa kali kurva menyentuh sisi kanan dan sisi atas. Bandingkan dengan a dan b.",
      "Count how many times the curve touches the right side and the top. Compare with a and b."] },

  { id: "kupu", j: "sma", kind: "polar", name: ["Kupu-kupu (Fay)", "Butterfly (Fay)"],
    params: { s: ["ukuran", "size", 0.6, 1.4, 0.05, 1.15] },
    range: () => [0, 12 * PI], samples: 7000, seconds: 9,
    r: (t, p) => p.s * (Math.exp(Math.sin(t)) - 2 * Math.cos(4 * t) + Math.sin((2 * t - PI) / 24) ** 5),
    eq: () => `<i>r</i> = e<sup>sin <i>θ</i></sup> − 2 cos 4<i>θ</i> + sin⁵((2<i>θ</i> − π)/24)`,
    calc: (t, v, p, F) => `<i>θ</i> = ${F.deg(t)} → <i>r</i> = <b>${F.fix(v.r)}</b>`,
    info: (p, F, L) => [[L("θ berjalan sampai", "θ runs up to"), "12π"], [L("sumber", "source"), "Fay (1989)"]],
    q: ["Persamaan ini punya tiga suku. Mana yang membuat sayap berulang? Perhatikan cos 4θ.",
      "This equation has three terms. Which one repeats the wings? Look at cos 4θ."] },
];

/** Samples a family (or a custom compiled function) into screen-independent points. */
export function sample(fam, p, view) {
  const pts = [];
  const n = fam.samples || 1600;
  let t0, t1;
  if (fam.kind === "fx") { t0 = view.x0; t1 = view.x1; } else [t0, t1] = fam.range(p);
  let prev = null;
  for (let i = 0; i <= n; i++) {
    const t = t0 + ((t1 - t0) * i) / n;
    let x, y, r;
    if (fam.kind === "fx") { x = t; y = fam.f(t, p); }
    else if (fam.kind === "polar") { r = fam.r(t, p); x = r * Math.cos(t); y = r * Math.sin(t); }
    else [x, y] = fam.xy(t, p);
    const ok = Number.isFinite(x) && Number.isFinite(y) && Math.abs(y) < 1e4 && Math.abs(x) < 1e4;
    // break the path at jumps (tan x, 1/x) so no false vertical line is drawn
    const jump = ok && prev && Math.abs(y - prev.y) > view.span * 0.8;
    const pt = ok ? { t, x, y, r } : null;
    if (jump) pts.push(null);
    pts.push(pt);
    prev = pt;
  }
  return pts;
}

/* ---------------- the students' own equations ----------------
   Grammar: expr = term {(+|-) term}; term = unary {(*|/|implicit) unary}; unary = (-|+) unary | power;
   power = atom [^ unary]; atom = number | constant | variable | function ( expr ) | function power | ( expr ). */
const FUNCS = { sin: Math.sin, cos: Math.cos, tan: Math.tan, asin: Math.asin, acos: Math.acos, atan: Math.atan,
  sqrt: Math.sqrt, akar: Math.sqrt, abs: Math.abs, ln: Math.log, log: Math.log10, exp: Math.exp, sinh: Math.sinh, cosh: Math.cosh };
const CONSTS = { pi: PI, "π": PI, e: Math.E };
const VARS = new Set(["x", "t", "θ", "theta"]);

function tokens(src) {
  const s = src.replace(/[·×∙]/g, "*").replace(/[−–]/g, "-").replace(/÷/g, "/").replace(/²/g, "^2").replace(/³/g, "^3")
    .replace(/√/g, "sqrt").replace(/^\s*[yr]\s*(\(\s*[xθt]\s*\))?\s*=/i, "");
  const out = [];
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (/\s/.test(ch)) { i++; continue; }
    const num = /^(\d+([.,]\d+)?|[.,]\d+)/.exec(s.slice(i));
    if (num) { out.push({ k: "num", v: Number(num[0].replace(",", ".")) }); i += num[0].length; continue; }
    const id = /^([a-zA-Z]+|θ|π)/.exec(s.slice(i));
    if (id) {
      let w = id[0].toLowerCase();
      // split runs such as "xsin" or "2pix" into known words from the left
      while (w.length) {
        const hit = Object.keys(FUNCS).concat(Object.keys(CONSTS), [...VARS]).filter((k) => w.startsWith(k)).sort((a, b) => b.length - a.length)[0];
        if (!hit) throw new Error(`"${w}"`);
        out.push(FUNCS[hit] ? { k: "fn", v: hit } : CONSTS[hit] !== undefined ? { k: "num", v: CONSTS[hit] } : { k: "var" });
        w = w.slice(hit.length);
      }
      i += id[0].length; continue;
    }
    if ("+-*/^()".includes(ch)) { out.push({ k: ch }); i++; continue; }
    throw new Error(`"${ch}"`);
  }
  return out;
}

/** Compiles an expression in one variable into a function, or throws an Error with a short reason. */
export function compile(src) {
  const tk = tokens(src);
  if (!tk.length) throw new Error("empty");
  let i = 0;
  const peek = () => tk[i] || { k: "end" };
  const take = (k) => { if (peek().k !== k) throw new Error(k === ")" ? "missing )" : `expected ${k}`); return tk[i++]; };
  const startsAtom = (t) => t.k === "num" || t.k === "var" || t.k === "fn" || t.k === "(";
  function expr() {
    let a = term();
    while (peek().k === "+" || peek().k === "-") { const op = tk[i++].k, b = term(), l = a; a = op === "+" ? (x) => l(x) + b(x) : (x) => l(x) - b(x); }
    return a;
  }
  function term() {
    let a = unary();
    for (;;) {
      const t = peek();
      if (t.k === "*" || t.k === "/") { i++; const b = unary(), l = a; a = t.k === "*" ? (x) => l(x) * b(x) : (x) => l(x) / b(x); }
      else if (startsAtom(t)) { const b = power(), l = a; a = (x) => l(x) * b(x); }
      else return a;
    }
  }
  function unary() {
    if (peek().k === "-") { i++; const a = unary(); return (x) => -a(x); }
    if (peek().k === "+") { i++; return unary(); }
    return power();
  }
  function power() {
    const a = atom();
    if (peek().k === "^") { i++; const b = unary(); return (x) => a(x) ** b(x); }
    return a;
  }
  function atom() {
    const t = peek();
    if (t.k === "num") { i++; return () => t.v; }
    if (t.k === "var") { i++; return (x) => x; }
    if (t.k === "(") { i++; const a = expr(); take(")"); return a; }
    if (t.k === "fn") { i++; const f = FUNCS[t.v]; const a = peek().k === "(" ? atom() : power(); return (x) => f(a(x)); }
    throw new Error("incomplete");
  }
  const f = expr();
  if (i < tk.length) throw new Error(`unexpected ${peek().k}`);
  return f;
}
