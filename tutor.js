/* Deterministic part of the tutor.
   analyse() reads the student's text against the live applet state and the task card.
   scripted() turns that diagnosis into one scaffolding reply. The AI mode receives the
   same diagnosis, so all mathematical facts come from here, never from the model. */

(function () {
  const OPS = {
    ">": (x, y) => x > y,
    "<": (x, y) => x < y,
    ">=": (x, y) => x >= y,
    "<=": (x, y) => x <= y,
    "=": (x, y) => x === y,
  };

  function normalise(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/[−–—]/g, "-")
      .replace(/\b(min|minus|negatif)\s*(\d)/g, "-$2")
      .replace(/(\d)\s*(m|meter|ft)\b/g, "$1")
      .replace(/\s+/g, " ")
      .trim();
  }

  function findComparison(t) {
    const m = t.match(/(-?\s?\d+)\s*(>=|<=|>|<|=)\s*(-?\s?\d+)/);
    if (!m) return null;
    const x = parseInt(m[1].replace(/\s/g, ""), 10);
    const y = parseInt(m[3].replace(/\s/g, ""), 10);
    return { x, op: m[2], y, text: `${x} ${m[2]} ${y}` };
  }

  const EXPLAIN = /(atas|bawah|permukaan|dalam|kedalaman|tinggi|rendah|dasar|dekat|jauh|nol|di air|laut)/;
  const MENTIONS = /(lumba|\ba\b|\bb\b|biru|hitam|lebih tinggi|lebih rendah|lebih dalam|lebih besar|lebih kecil)/;

  function describe(n, unit) {
    if (n > 0) return `${n} ${unit} di atas permukaan laut`;
    if (n < 0) return `${-n} ${unit} di bawah permukaan laut`;
    return "tepat di permukaan laut";
  }

  function correctComparison(a, b) {
    if (a > b) return `${a} > ${b}`;
    if (a < b) return `${a} < ${b}`;
    return `${a} = ${b}`;
  }

  /** @returns {{kind:string, move:string, cmp?:object, matches?:boolean, misconception?:string|null}} */
  function analyse(text, state, stage, attempts) {
    const t = normalise(text);
    const { A: a, B: b } = state;

    if (stage.require === "bothNegative" && !(a < 0 && b < 0)) {
      return { kind: "needMove", move: "L2" };
    }

    const cmp = findComparison(t);
    if (cmp) {
      const truth = OPS[cmp.op](cmp.x, cmp.y);
      const matches = (cmp.x === a && cmp.y === b) || (cmp.x === b && cmp.y === a);
      if (!truth) {
        const absMis =
          (cmp.x < 0 || cmp.y < 0) && OPS[cmp.op](Math.abs(cmp.x), Math.abs(cmp.y));
        const move = attempts.wrong === 0 ? "L1" : attempts.wrong === 1 ? "L2" : "HINT";
        return { kind: "wrong", move, cmp, matches, misconception: absMis ? "nilai mutlak" : null };
      }
      if (!matches) return { kind: "mismatch", move: "L2", cmp };
      if (!EXPLAIN.test(t)) return { kind: "noExplain", move: "L4", cmp };
      return { kind: "correct", move: "R", cmp };
    }
    if (MENTIONS.test(t)) return { kind: "informal", move: "L4" };
    return { kind: "unclear", move: "L1" };
  }

  function scripted(d, state, stage, task, text) {
    const u = task.unit;
    const { A: a, B: b } = state;
    const lower = a < b ? "A" : "B";

    switch (d.kind) {
      case "needMove":
        return "Sebelum menjawab, geser dulu lumba-lumba A ke bawah garis permukaan laut, sampai keduanya ada di dalam air. Setelah itu, di angka berapa A sekarang?";
      case "wrong":
        if (d.move === "L1") {
          return d.misconception
            ? `Kamu menulis ${d.cmp.text}. Coba lihat applet-mu: lumba-lumba mana yang lebih dekat ke dasar laut?`
            : `Kamu menulis ${d.cmp.text}. Kalau kamu lihat posisi kedua lumba-lumba di applet, mana yang ada lebih tinggi?`;
        }
        if (d.move === "L2") {
          return `Perhatikan lumba-lumba ${lower}. Ia ada di ${describe(Math.min(a, b), u)}. Bilangan untuk posisi yang lebih rendah itu lebih besar atau lebih kecil?`;
        }
        return task.fallbackHint;
      case "mismatch":
        return `Tanda perbandinganmu benar untuk ${d.cmp.text}, tapi angkanya belum sama dengan posisi di applet. Di angka berapa lumba-lumba A dan B sekarang?`;
      case "noExplain":
        return `Kamu menulis ${d.cmp.text}. Coba jelaskan dengan kata-katamu: apa arti ${a} dan apa arti ${b} di sini?`;
      case "informal":
        return "Idemu sudah mulai kelihatan. Bisakah kamu menuliskannya sebagai perbandingan dua bilangan, pakai tanda < atau >?";
      case "correct":
        if (stage.id === "s1") {
          return `Tepat. ${a} berarti ${describe(a, u)}, dan ${b} berarti ${describe(b, u)}. Posisi yang lebih rendah selalu bilangan yang lebih kecil.`;
        }
        return `Bagus. ${Math.max(a, b)} lebih dekat ke permukaan laut daripada ${Math.min(a, b)}, jadi ${Math.max(a, b)} lebih besar. Di antara dua bilangan negatif, yang lebih dekat ke 0 selalu lebih besar.`;
      default:
        return "Coba lihat applet dulu: di angka berapa lumba-lumba A, dan di angka berapa lumba-lumba B?";
    }
  }

  const KIND_LABEL = {
    needMove: "applet belum sesuai tahap",
    wrong: "perbandingan salah",
    mismatch: "angka tidak sesuai applet",
    noExplain: "benar, belum ada alasan",
    informal: "ide informal, tanpa simbol",
    correct: "target tercapai",
    unclear: "belum jelas",
  };

  window.GorgaTutor = { analyse, scripted, correctComparison, describe, KIND_LABEL, normalise };
})();
