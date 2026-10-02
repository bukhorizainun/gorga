/* Card engine: turns a task-card spec (data) into a full-protocol card for the activity page,
   following the teacher's Scaffold Ladder framework:
   - L1 Probe opens every question (open diagnostic question, nothing pointed out yet);
   - only after an insufficient answer does support rise: L2 Point (one feature), then L3 Focus
     (one smaller sub-question); there is no level above L3;
   - a correct answer without the target reasoning gets L4 (explain it with the applet); if the
     explanation is still missing, support rises again (L2, then L3);
   - the confirmation comes when the answer is right and the target reasoning came from the student,
     and it adds no new explanation (revoice and fade).
   Specs are drafts written from the teacher's questions; the teacher confirms them.

   Spec per question:
     opening: {id, en}                         L1 probe
     target:  {id, en}                         what counts as successful reasoning (secret for the AI)
     claim(t, raw) -> value | null             the answer the student gives (closed questions)
     correct(value) -> bool
     show(value) -> string                     how to say the student's answer back
     reasons: [{name, re}], need: n            key ideas; n of them make the target reasoning
     wrong: [{test(value, t), kind, l2:{id,en}}]   recognised misconceptions (first help, L2)
     l2: [{id,en}], l3: [{id,en}, ...]         point / focus moves, used in order
     l4: {id,en}                               ask for the reasoning after a correct answer
     more: {id,en}                             open questions: ask for one more idea
     confirm: {id,en}                          scripted confirmation (no new explanation)
     numbers: [..]                             numbers the tutor may always use
     forbid: [{re, until:"answer"|"goal", why}] content the tutor may not give away
*/
(function () {
  const LANG = window.GORGA_LANG === "en" ? "en" : "id";
  const L = (p) => (p && typeof p === "object" ? (LANG === "en" ? p.en : p.id) : p || "");
  const tx = (id, en) => (LANG === "en" ? en : id);
  const fmt = (n) => (typeof n === "number" && n < 0 ? `−${-n}` : String(n));

  const WORDS = {
    nol: 0, satu: 1, dua: 2, tiga: 3, empat: 4, lima: 5, enam: 6, tujuh: 7, delapan: 8, sembilan: 9, sepuluh: 10,
    zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
    "dua puluh": 20, twenty: 20,
  };
  function normalise(text) {
    let t = String(text || "").toLowerCase().replace(/[−–—]/g, "-").replace(/\s+/g, " ");
    for (const [w, n] of Object.entries(WORDS).sort((a, b) => b[0].length - a[0].length)) {
      t = t.replace(new RegExp(`\\b${w}\\b`, "g"), String(n));
    }
    return t.replace(/\b(negatif|negative|min|minus)\s*(\d)/g, "-$2").replace(/(^|[\s(,:=])-\s+(\d)/g, "$1-$2").trim();
  }
  const numbers = (t) => (String(t).replace(/(\d),(\d)/g, "$1.$2").match(/-?\d+(\.\d+)?/g) || []).map(Number);

  const DONTKNOW = /(tidak tahu|gak tau|ga tau|gatau|nggak tahu|ngga tahu|tdk tahu|belum tahu|bingung|entah|lupa|ga ngerti|gak ngerti|tidak mengerti|don'?t know|do not know|not sure|no idea|idk|confused)/;
  const HOWTO = /(gimana|bagaimana|gmn)\s*(cara\s*)?(pakai|pake|memakai|main|geser|menggeser|klik)|how (do|can|should) i (use|move|drag|click)|how to (use|move|drag)/;
  const WHY = /\b(kenapa|mengapa|knp|kok|why)\b/;
  const HELP = { L1: 1, L4: 1, L2: 2, L3: 3, OK: 0 };

  const LABEL = {
    goal: ["jawaban benar + penalaran target", "correct answer + target reasoning"],
    reasonNoAnswer: ["alasan ada, jawaban belum", "reasoning, no answer yet"],
    answerOnly: ["benar, belum ada alasan", "correct, no reasoning yet"],
    partial: ["baru sebagian ide", "part of the idea only"],
    unclear: ["belum jelas", "unclear"], howTo: ["bertanya cara memakai aplet", "asks how to use the applet"],
    why: ["bertanya kenapa", "asks why"], "wrong:dontKnow": ["belum tahu", "does not know yet"], "wrong:other": ["salah", "wrong"],
  };

  function make(n, spec) {
    const Q = spec.questions;
    const KIND_LABEL = {};
    for (const [k, v] of Object.entries(LABEL)) KIND_LABEL[k] = tx(v[0], v[1]);
    Q.forEach((q) => (q.wrong || []).forEach((w) => { KIND_LABEL["wrong:" + w.kind] = L(w.label) || KIND_LABEL["wrong:other"]; }));

    function read(text, qi, mem) {
      const q = Q[qi];
      const t = normalise(text);
      const r = { t, ns: numbers(t), claim: null, reasons: [], strategy: "unclear" };
      if (q.claim) r.claim = q.claim(t, String(text || ""), q.correct);
      const before = new Set(mem.reasons || []);
      for (const rs of q.reasons || []) if (rs.re.test(t)) before.add(rs.name);
      r.reasons = [...before];
      if (HOWTO.test(t)) r.strategy = "howTo";
      else if (WHY.test(t) && r.claim === null && !r.reasons.length) r.strategy = "why";
      else if (DONTKNOW.test(t) && r.claim === null) r.strategy = "dontKnow";
      return r;
    }

    function step(p) {
      const { qi, mem } = p;
      const q = Q[qi];
      const r = read(p.text, qi, mem);
      const closed = typeof q.correct === "function";
      // A reason added after a correct answer may contain other numbers ("each third needs 1
      // seedling"); they are part of the reasoning, not a new answer.
      if (r.claim !== null && closed && mem.answerOK && !q.correct(r.claim) && r.reasons.length > (mem.reasons || []).length) r.claim = null;
      let answerOK = mem.answerOK;
      if (r.claim !== null && closed) answerOK = !!q.correct(r.claim);
      const reasoned = r.reasons.length >= (q.need || 1);
      const out = (move, kind, reply, done = false) => {
        mem.reasons = r.reasons;               // ideas stay found across messages
        return { move, kind, reply, done, answerOK, reading: { total: r.claim, reasons: r.reasons } };
      };
      const pick = (list, i) => L(list[Math.min(i, list.length - 1)]);

      if (r.strategy === "howTo") return out(mem.lastKind === "howTo" ? "L2" : "L1", "howTo", L(spec.howTo));
      if (r.strategy === "why") return out("L2", "why", pick(q.l2, 0));

      // success: the answer (if the question has one) and the target reasoning
      if (reasoned && (!closed || answerOK)) return out("OK", "goal", L(q.confirm), true);
      if (reasoned && closed && r.claim === null) {
        return out("L4", "reasonNoAnswer", L(q.askAnswer) || tx("Alasanmu sudah ada. Jadi, apa jawabanmu?", "Your reasoning is there. So what is your answer?"));
      }

      // a wrong answer or "I don't know": L2 (the misconception's own pointer), then L3 Focus
      if ((closed && r.claim !== null && !answerOK) || r.strategy === "dontKnow") {
        const w = r.claim !== null ? (q.wrong || []).find((x) => x.test(r.claim, r.t)) : null;
        const kind = r.strategy === "dontKnow" ? "dontKnow" : w ? w.kind : "other";
        if (mem.wrong === 0) {
          const said = r.claim !== null ? tx(`Kamu menjawab ${q.show ? q.show(r.claim) : fmt(r.claim)}. `, `You answered ${q.show ? q.show(r.claim) : fmt(r.claim)}. `) : "";
          return out("L2", "wrong:" + kind, w ? said + L(w.l2) : said + pick(q.l2, 0));
        }
        return out("L3", "wrong:" + kind, pick(q.l3, mem.wrong - 1));
      }

      // correct answer, reasoning still missing: L4, then point, then focus
      if (closed && answerOK) {
        const k = mem.weak;
        if (k === 0) return out("L4", "answerOnly", L(q.l4));
        if (k === 1) return out("L2", "answerOnly", pick(q.l2w || q.l2, 0));
        return out("L3", "answerOnly", pick(q.l3w || q.l3, k - 2));
      }

      // open questions: part of the idea -> ask for more; nothing yet -> point, then focus
      if (!closed && r.reasons.length) return out("L4", "partial", L(q.more));
      const miss = mem.miss || 0;
      mem.miss = miss + 1;
      if (miss === 0) return out("L2", "unclear", pick(q.l2, 0));
      return out("L3", "unclear", pick(q.l3, miss - 1));
    }

    function limits(res, qi, mem, texts) {
      const q = Q[qi];
      const goal = res.move === "OK";
      const maxHelp = goal ? 3 : HELP[res.move] || 1;
      const allow = new Set(q.numbers || []);
      for (const t of texts) for (const x of numbers(normalise(t))) allow.add(x);
      for (const x of numbers(normalise(res.reply))) allow.add(x);
      if ((res.answerOK || goal) && q.answerNumbers) q.answerNumbers.forEach((x) => allow.add(x));
      const facts = [
        typeof q.correct === "function"
          ? tx(`Jawaban siswa: ${res.answerOK ? "sudah benar" : res.reading.total !== null ? `belum benar (${q.show ? q.show(res.reading.total) : res.reading.total})` : "belum ada"}.`,
            `The student's answer: ${res.answerOK ? "correct" : res.reading.total !== null ? `not correct yet (${q.show ? q.show(res.reading.total) : res.reading.total})` : "none yet"}.`)
          : tx("Soal ini terbuka: tidak ada satu jawaban benar; nilai dari ide kunci.", "This is an open question: no single right answer; judge by the key ideas."),
        tx(`Ide kunci yang sudah muncul dari siswa: ${(res.reading.reasons || []).join(", ") || "belum ada"}.`, `Key ideas the student has given: ${(res.reading.reasons || []).join(", ") || "none yet"}.`),
        tx(`Cara siswa di pesan terakhir: ${KIND_LABEL[res.kind] || res.kind}.`, `The student's way in the last message: ${KIND_LABEL[res.kind] || res.kind}.`),
        goal ? tx("Penalaran target SUDAH muncul dari siswa sendiri. Saatnya konfirmasi singkat tanpa penjelasan baru.", "The target reasoning HAS come from the student. Time for a short confirmation with no new explanation.")
          : tx("Penalaran target BELUM muncul dari siswa.", "The target reasoning has NOT come from the student yet."),
        tx("Langkah yang dipilih aturan: ", "The move the rules chose: ") + res.move + " — " + res.reply,
      ];
      return { goal, maxHelp, mayConfirm: false, answerOK: !!res.answerOK, zeroOK: true, splitOK: true,
        allowNumbers: [...allow], facts, target: L(q.target) };
    }

    function overreach(reply, lim, qi) {
      const q = Q[qi];
      const t = normalise(reply);
      const bad = numbers(t).filter((x) => !lim.allowNumbers.includes(x));
      if (bad.length) return "angka " + bad.join(",");
      if (!lim.goal && /\b(benar|salah|betul|tepat|memang|correct|wrong|right|exactly|well done)\b/.test(t)) return "menilai";
      if (!lim.goal && !t.includes("?")) return "tanpa pertanyaan";
      if (lim.goal) return null;
      for (const f of q.forbid || []) {
        if (f.until === "answer" && lim.answerOK) continue;
        if (f.re.test(t)) return f.why || "memberi jawaban";
      }
      return null;
    }

    const card = {
      Q, read, step, limits, overreach, KIND_LABEL, HELP, normalise,
      opening: (qi) => L(Q[qi].opening),
      setup: spec.setup || (() => {}),
      appState: spec.appState || (() => ({ used: true })),
    };
    window.GorgaCards = window.GorgaCards || {};
    window.GorgaCards[n] = card;
    return card;
  }

  window.GorgaCardEngine = { make, normalise, numbers, L, tx };
})();
