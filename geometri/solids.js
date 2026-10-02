/* Solids for the Geometry studio. Every flat-faced solid is built from hinged faces so its net can
   unfold: fold = 1 is the closed solid, fold = 0 the flat net. Hinge angles are exact:
   cuboid 90°, triangular prism 120° (interior angle 60°), square pyramid π − atan(t / (a/2)). */
import * as THREE from "three";

const FACE = new THREE.MeshStandardMaterial({ color: 0xdfe5f5, roughness: 0.55, metalness: 0.05, side: THREE.DoubleSide,
  transparent: true, opacity: 0.94, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
const FACE_ACCENT = FACE.clone(); FACE_ACCENT.color = new THREE.Color(0xc39a52);
const EDGE = new THREE.LineBasicMaterial({ color: 0x1c2a55 });

/** A flat polygon (points in its local x-z plane, y = 0) with its outline. */
function polygon(points, accent = false) {
  const shape = new THREE.Shape(points.map(([x, z]) => new THREE.Vector2(x, -z)));
  const geo = new THREE.ShapeGeometry(shape);
  geo.rotateX(-Math.PI / 2);                       // shape x-y -> world x-z
  const g = new THREE.Group();
  g.add(new THREE.Mesh(geo, accent ? FACE_ACCENT : FACE));
  const ring = points.concat([points[0]]).map(([x, z]) => new THREE.Vector3(x, 0, z));
  g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(ring), EDGE));
  return g;
}
function hinge(parent, at, axis, angle) {
  const p = new THREE.Group();
  p.position.set(...at);
  p.userData = { axis, angle };
  parent.add(p);
  return p;
}

/** Cuboid p × l × t (x, z, y). */
function cuboid(p, l, t) {
  const root = new THREE.Group();
  const hinges = [];
  root.add(polygon([[-p / 2, -l / 2], [p / 2, -l / 2], [p / 2, l / 2], [-p / 2, l / 2]], true));   // base
  const front = hinge(root, [0, 0, l / 2], "x", -Math.PI / 2); front.add(polygon([[-p / 2, 0], [p / 2, 0], [p / 2, t], [-p / 2, t]]));
  const back = hinge(root, [0, 0, -l / 2], "x", Math.PI / 2); back.add(polygon([[-p / 2, 0], [p / 2, 0], [p / 2, -t], [-p / 2, -t]]));
  const right = hinge(root, [p / 2, 0, 0], "z", Math.PI / 2); right.add(polygon([[0, -l / 2], [t, -l / 2], [t, l / 2], [0, l / 2]]));
  const left = hinge(root, [-p / 2, 0, 0], "z", -Math.PI / 2); left.add(polygon([[0, -l / 2], [-t, -l / 2], [-t, l / 2], [0, l / 2]]));
  const top = hinge(back, [0, 0, -t], "x", Math.PI / 2); top.add(polygon([[-p / 2, 0], [p / 2, 0], [p / 2, -l], [-p / 2, -l]]));
  hinges.push(front, back, right, left, top);
  return { root, hinges, height: t };
}

/** Triangular prism: equilateral triangle side a, length t along x. */
function prism(a, t) {
  const root = new THREE.Group();
  const hinges = [];
  const h = (Math.sqrt(3) / 2) * a;
  root.add(polygon([[-t / 2, -a / 2], [t / 2, -a / 2], [t / 2, a / 2], [-t / 2, a / 2]], true));
  const s1 = hinge(root, [0, 0, a / 2], "x", -(2 * Math.PI) / 3); s1.add(polygon([[-t / 2, 0], [t / 2, 0], [t / 2, a], [-t / 2, a]]));
  const s2 = hinge(root, [0, 0, -a / 2], "x", (2 * Math.PI) / 3); s2.add(polygon([[-t / 2, 0], [t / 2, 0], [t / 2, -a], [-t / 2, -a]]));
  const e1 = hinge(root, [t / 2, 0, 0], "z", Math.PI / 2); e1.add(polygon([[0, -a / 2], [h, 0], [0, a / 2]], true));
  const e2 = hinge(root, [-t / 2, 0, 0], "z", -Math.PI / 2); e2.add(polygon([[0, -a / 2], [-h, 0], [0, a / 2]], true));
  hinges.push(s1, s2, e1, e2);
  return { root, hinges, height: h };
}

/** Square pyramid: base a, height t. */
function pyramid(a, t) {
  const root = new THREE.Group();
  const hinges = [];
  const s = Math.hypot(t, a / 2);                      // slant height
  const fold = Math.PI - Math.atan2(t, a / 2);
  root.add(polygon([[-a / 2, -a / 2], [a / 2, -a / 2], [a / 2, a / 2], [-a / 2, a / 2]], true));
  const f = hinge(root, [0, 0, a / 2], "x", -fold); f.add(polygon([[-a / 2, 0], [a / 2, 0], [0, s]]));
  const b = hinge(root, [0, 0, -a / 2], "x", fold); b.add(polygon([[-a / 2, 0], [a / 2, 0], [0, -s]]));
  const r = hinge(root, [a / 2, 0, 0], "z", fold); r.add(polygon([[0, -a / 2], [s, 0], [0, a / 2]]));
  const l = hinge(root, [-a / 2, 0, 0], "z", -fold); l.add(polygon([[0, -a / 2], [-s, 0], [0, a / 2]]));
  hinges.push(f, b, r, l);
  return { root, hinges, height: t };
}

/** Curved solids: no net animation, only the closed solid with a few guide lines. */
function curved(kind, r, t) {
  const root = new THREE.Group();
  const geo = kind === "tabung" ? new THREE.CylinderGeometry(r, r, t, 72, 1)
    : kind === "kerucut" ? new THREE.ConeGeometry(r, t, 72, 1)
    : new THREE.SphereGeometry(r, 64, 40);
  const mesh = new THREE.Mesh(geo, FACE);
  mesh.position.y = kind === "bola" ? r : t / 2;
  root.add(mesh);
  const guide = (rad, y) => {
    const pts = [];
    for (let i = 0; i <= 96; i++) { const a = (i / 96) * Math.PI * 2; pts.push(new THREE.Vector3(rad * Math.cos(a), y, rad * Math.sin(a))); }
    root.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), EDGE));
  };
  if (kind === "tabung") { guide(r, 0); guide(r, t); }
  if (kind === "kerucut") guide(r, 0);
  if (kind === "bola") { guide(r, r); }
  return { root, hinges: [], height: kind === "bola" ? 2 * r : t };
}

export function build(kind, d) {
  if (kind === "kubus") return cuboid(d.s, d.s, d.s);
  if (kind === "balok") return cuboid(d.p, d.l, d.t);
  if (kind === "prisma") return prism(d.a, d.t);
  if (kind === "limas") return pyramid(d.a, d.t);
  return curved(kind, d.r, d.t);
}

/** Sets the fold of every hinge (1 = closed, 0 = flat net). */
export function setFold(model, fold) {
  for (const h of model.hinges) {
    h.rotation.set(0, 0, 0);
    h.rotation[h.userData.axis] = h.userData.angle * fold;
  }
}

/** Volume, surface area and Euler counts (faces, edges, vertices) for the readouts. */
export function measures(kind, d) {
  const PI = Math.PI;
  switch (kind) {
    case "kubus": return { V: d.s ** 3, L: 6 * d.s ** 2, euler: [6, 12, 8] };
    case "balok": return { V: d.p * d.l * d.t, L: 2 * (d.p * d.l + d.p * d.t + d.l * d.t), euler: [6, 12, 8] };
    case "prisma": { const base = (Math.sqrt(3) / 4) * d.a ** 2; return { V: base * d.t, L: 2 * base + 3 * d.a * d.t, euler: [5, 9, 6] }; }
    case "limas": { const s = Math.hypot(d.t, d.a / 2); return { V: (d.a ** 2 * d.t) / 3, L: d.a ** 2 + 2 * d.a * s, euler: [5, 8, 5] }; }
    case "tabung": return { V: PI * d.r ** 2 * d.t, L: 2 * PI * d.r * (d.r + d.t), euler: null };
    case "kerucut": { const s = Math.hypot(d.r, d.t); return { V: (PI * d.r ** 2 * d.t) / 3, L: PI * d.r * (d.r + s), euler: null }; }
    default: return { V: (4 / 3) * PI * d.r ** 3, L: 4 * PI * d.r ** 2, euler: null };
  }
}
