/* Deterministic tutor for the temperature task.
   read()     turns a student text into numbers and a strategy label.
   step()     applies the teacher's protocol and returns the next move plus a scripted reply.
   The AI mode gets the same result, so every number and every decision comes from here. */

(function () {
  const WORDS = {
    nol: 0, satu: 1, dua: 2, tiga: 3, empat: 4, lima: 5, enam: 6, tujuh: 7, delapan: 8,
    sembilan: 9, sepuluh: 10, sebelas: 11, "dua belas": 12,
  };

  function normalise(text) {
    let t = String(text || "")
      .toLowerCase()
      .replace(/[−–—]/g, "-")
      .replace(/°\s*c?|derajat( celcius| celsius)?/g, " ")
      .replace(/\s+/g, " ");
    for (const [w, n] of Object.entries(WORDS).sort((a, b) => b[0].length - a[0].length)) {
      t = t.replace(new RegExp(`\\b${w}\\b`, "g"), String(n));
    }
    return t
      .replace(/\b(min|minus|negatif)\s*(\d)/g, "-$2")
      .replace(/(^|[\s(,:=])-\s+(\d)/g, "$1-$2")
      .trim();
  }

  /** Integers in reading order. "ke-4" style hyphens after a word count as a minus sign too. */
  function numbers(t) {
    return (t.match(/-?\d+/g) || []).map((s) => parseInt(s, 10));
  }

  function hasRun(ns, len) {
    let run = 1;
    for (let i = 1; i < ns.length; i++) {
      run = Math.abs(ns[i] - ns[i - 1]) === 1 ? run + 1 : 1;
      if (run >= len) return true;
    }
    return false;
  }

  const DONTKNOW = /(tidak tahu|gak tau|ga tau|gatau|nggak tahu|ngga tahu|tdk tahu|belum tahu|bingung|entah|lupa)/;
  const ONE_BY_ONE = /(satu per satu|satu-satu|satu satu|masing-masing 1|naiknya 1|turunnya 1|per 1|tiap 1)/;
  const DIRECTION = /\b(atas|bawah|naik|turun)\b/;
  const HOWTO = /(gimana|bagaimana|gmn|cara)\s*(cara\s*)?(geser|gerak|pakai|pake|menggeser|memakai|mengisi|isi)/;
  const WHY = /\b(kenapa|mengapa|knp|kok)\b/;

  /**
   * Reads a text against one stage.
   * @returns {{ns:number[], total:number|null, strategy:string}}
   */
  function read(text, stage) {
    const t = normalise(text);
    const ns = numbers(t);
    const size = Math.abs(stage.end - stage.start);
    const partA = Math.abs(stage.start);
    const partB = Math.abs(stage.end);
    const crosses = stage.start * stage.end < 0;
    const abs = ns.map(Math.abs);
    const count = (v) => abs.filter((x) => x === v).length;
    const hasZero = ns.includes(0);

    // The total the student claims: the change size (either sign), else the last number
    // when the text is just a number or a short "naik/jadi/total N" answer.
    let total = null;
    if (ns.some((n) => Math.abs(n) === size)) total = ns.find((n) => Math.abs(n) === size);
    else if (/^-?\d+$/.test(t)) total = ns[0];
    else {
      // One number that is not a temperature from the question and not a part of the split.
      const known = new Set([stage.start, stage.end, 0, partA, partB]);
      const rest = ns.filter((n) => !known.has(n));
      if (rest.length === 1 && !hasRun(ns, 3)) total = rest[0];
    }

    let strategy = "unclear";
    const splitFull = crosses && hasZero && count(partA) >= 2 && count(partB) >= 2;
    const splitHalf = crosses && hasZero && (count(partA) >= 2 || count(partB) >= 2);
    const sumExpr = new RegExp(`\\b${partA}\\s*\\+\\s*${partB}\\b|\\b${partB}\\s*\\+\\s*${partA}\\b`).test(t);
    const diffExpr = /-?\d+\s*-\s*\(\s*-?\d+\s*\)|-?\d+\s*-\s*-\d+/.test(t);

    if (splitFull) strategy = "split";
    else if (hasRun(ns, 3) || ONE_BY_ONE.test(t)) strategy = "counting";
    else if (splitHalf) strategy = "splitHalf";
    else if (sumExpr) strategy = "sumOnly";
    else if (diffExpr) strategy = "formal";
    else if (HOWTO.test(t)) strategy = "howTo";
    else if (WHY.test(t) && ns.length <= 1) strategy = "why";
    else if (DONTKNOW.test(t)) strategy = "dontKnow";
    else if (total !== null && ns.length <= 3) strategy = "answerOnly";
    else if (DIRECTION.test(t) && !ns.length) strategy = "direction";

    return { ns, total, strategy };
  }

  /** Is this total correct for the stage? Rises must be positive; a fall may be written either way. */
  function isCorrect(total, stage) {
    if (total === null || total === undefined || Number.isNaN(total)) return false;
    const size = Math.abs(stage.end - stage.start);
    return stage.end > stage.start ? total === size : Math.abs(total) === size;
  }

  const fmt = (n) => (n < 0 ? `−${-n}` : String(n));
  const deg = (n) => `${fmt(n)} °C`;

  function verbs(stage) {
    const up = stage.end > stage.start;
    return { up, verb: up ? "naik" : "turun", noun: up ? "kenaikan" : "penurunan" };
  }

  /** The misconception behind a wrong total, if we recognise it. */
  function wrongKind(total, stage) {
    const size = Math.abs(stage.end - stage.start);
    const { up } = verbs(stage);
    if (total === null) return "none";
    if (Math.abs(total) === Math.abs(Math.abs(stage.start) - Math.abs(stage.end))) return "noSign";
    if (Math.abs(total) === size + 1) return "fencepost";
    if (up && total === -size) return "signOfRise";
    return "other";
  }

  /**
   * One turn of the protocol.
   * @param p {stage, input:{from:"applet"|"chat", text:string}, marker:number, mem:{answerOK, wrong, counting, asked}}
   * @returns {{move, kind, reply, done, answerOK, reading}}
   */
  function step(p) {
    const { stage, input, marker, mem } = p;
    const r = read(input.text, stage);
    // The two halves of the split may come in two messages.
    if (r.strategy !== "split" && mem.halfText && read(`${mem.halfText} ${input.text}`, stage).strategy === "split") {
      r.strategy = "split";
    }
    const { verb, noun } = verbs(stage);
    const size = Math.abs(stage.end - stage.start);
    const s = deg(stage.start);
    const e = deg(stage.end);
    let answerOK = mem.answerOK;

    // A total given now (in the applet box, or in chat) decides whether the answer is right.
    const claimed = r.total;
    if (claimed !== null) answerOK = isCorrect(claimed, stage);

    const out = (move, kind, reply, done = false) => ({ move, kind, reply, done, answerOK, reading: r });

    // Questions from the student about the tool, or "why", come before the protocol.
    if (r.strategy === "howTo") {
      return out(mem.lastKind === "howTo" ? "L2" : "L1", "howTo",
        `Tarik penanda biru atau merah ke atas atau ke bawah di sepanjang termometer. ` +
        `Coba letakkan penanda biru di ${s}. Lalu apa yang kamu lihat saat penandanya digerakkan ke ${e}?`);
    }
    if (r.strategy === "why") {
      return out("L4", "why",
        answerOK
          ? `Pertanyaan yang bagus. Menurutmu, apa yang istimewa dari 0 °C di termometer, dibandingkan angka lainnya?`
          : `Pertanyaan yang bagus. Coba kita lihat bersama di termometer: dari ${s}, penandanya perlu bergerak ke mana supaya sampai di ${e}?`);
    }

    // Goal reached: correct answer and the split at 0 in the student's own words.
    if (r.strategy === "split" && (answerOK || claimed === null)) {
      if (!answerOK && claimed === null) {
        return out("L4", "splitNoTotal",
          `Kamu sudah memecahnya di 0. Jadi, berapa total ${noun} suhu dari ${s} sampai ${e}?`);
      }
      const a = Math.abs(stage.start);
      const b = Math.abs(stage.end);
      return out("OK", "goal",
        `Benar. Dari ${s} ke 0 °C ${verb} ${a} derajat, lalu dari 0 °C ke ${e} ${verb} ${b} derajat, ` +
        `jadi total ${verb} ${size} °C. Memecah di 0 membuat hitungannya cepat.`, true);
    }

    // Wrong total, or "tidak tahu": L2, then L3, then the teacher's hint.
    // Once the answer is right, "tidak tahu" is about the faster way, not the answer:
    // it moves one rung up the counting ladder instead.
    const stuck = answerOK && claimed === null && r.strategy === "dontKnow";
    if (stuck) r.strategy = "counting";

    if ((claimed !== null && !answerOK) || r.strategy === "dontKnow") {
      const k = r.strategy === "dontKnow" && claimed === null ? "dontKnow" : wrongKind(claimed, stage);
      const n = mem.wrong;
      if (n === 0) {
        const markers = [].concat(marker);
        if (!markers.includes(stage.start)) {
          return out("L2", "wrong:" + k,
            markers.length > 1
              ? `Geser penanda biru ke ${s} dan penanda merah ke ${e}. Dari biru ke merah, ke arah mana suhunya bergerak, dan melewati angka apa saja?`
              : `Letakkan dulu penanda termometer di ${s}. Lalu gerakkan sampai ${e}: ke arah mana penandanya bergerak, dan melewati angka apa saja?`);
        }
        const replies = {
          noSign: `Kamu menjawab ${fmt(claimed)}. Coba cek dengan termometer: mulai dari ${s}, ${verb} ${Math.abs(claimed)} derajat. Penandanya sampai di angka berapa?`,
          fencepost: `Kamu menjawab ${fmt(claimed)}. Yang kamu hitung angka-angkanya atau lompatannya? Coba hitung berapa kali penanda bergerak dari ${s} sampai ${e}.`,
          signOfRise: `Kamu menjawab ${fmt(claimed)}. Dari ${s} ke ${e}, suhunya naik atau turun? Kalau naik, apa arti tanda minus di jawabanmu?`,
          dontKnow: `Tidak apa-apa. Penanda termometer sekarang di ${s}. Gerakkan pelan-pelan ke ${e}: ke arah mana penandanya bergerak?`,
          other: `Kamu menjawab ${fmt(claimed)}. Gerakkan penanda dari ${s} sampai ${e}. Angka apa saja yang dilewati penandanya?`,
          none: `Gerakkan penanda dari ${s} sampai ${e}. Angka apa saja yang dilewati penandanya?`,
        };
        return out("L2", "wrong:" + k, replies[k] || replies.other);
      }
      if (n === 1) {
        return out("L3", "wrong:" + k,
          `Coba bagi jadi dua bagian. Berapa derajat dari ${s} sampai 0 °C? Lalu berapa derajat dari 0 °C sampai ${e}?`);
      }
      return out("HINT", "wrong:" + k,
        `Hitung lompatannya, bukan angkanya. Dari ${s} ke 0 °C ada ${Math.abs(stage.start)} lompatan. ` +
        `Sekarang hitung lompatan dari 0 °C ke ${e}, lalu jumlahkan keduanya.`);
    }

    // Answer is correct but the target reasoning is not there yet.
    if (answerOK) {
      switch (r.strategy) {
        case "counting": {
          // A stuck student skips the "faster way?" question and gets the pointer to 0.
          const n = stuck ? Math.max(1, mem.counting) : mem.counting;
          if (n === 0) {
            return out("L4", "counting",
              `Kamu menghitung satu per satu dan sampai di ${size}. Bisakah kamu menemukannya lebih cepat, tanpa menghitung satu per satu?`);
          }
          if (n === 1) {
            return out("L2", "counting",
              `Perhatikan angka 0 di termometer. Kalau kamu berhenti sebentar di 0 °C, berapa derajat yang sudah ${verb} dari ${s}?`);
          }
          return out("L3", "counting",
            `Berapa derajat dari ${s} sampai 0 °C, dan berapa derajat dari 0 °C sampai ${e}? Tuliskan keduanya.`);
        }
        case "splitHalf":
          return out("L4", "splitHalf",
            `Kamu sudah berhenti di 0. Bagian yang satunya lagi berapa derajat? Tulis kedua bagiannya.`);
        case "sumOnly":
          return out("L4", "sumOnly",
            `Kamu menjumlahkan ${Math.abs(stage.start)} dan ${Math.abs(stage.end)}. Di termometer, angka-angka itu jarak dari mana ke mana?`);
        case "formal":
          return out("L4", "formal",
            `Hitunganmu cocok. Bisakah kamu menunjukkannya di termometer: dari ${s} ke mana dulu, lalu ke mana?`);
        default:
          if (mem.lastKind === "answerOnly") {
            return out("L4", "answerOnly",
              `Coba ceritakan langkahnya satu per satu: dari ${s}, penandanya kamu gerakkan ke mana, dan sampai mana?`);
          }
          if (input.from === "applet") {
            return out("L4", "answerOnly",
              `Kamu menulis ${fmt(claimed)} di applet. Bagaimana kamu mendapatkan ${fmt(claimed)}? Ceritakan langkahmu di termometer.`);
          }
          return out("L4", "answerOnly",
            `Oke, coba jelaskan caramu memakai termometer. Bagaimana kamu bisa mendapatkan ${size}?`);
      }
    }

    // No total yet.
    if (r.strategy === "counting") {
      return out("L1", "countingNoTotal",
        `Kamu menggerakkan penanda derajat demi derajat. Jadi, berapa ${noun} suhunya dari ${s} sampai ${e}?`);
    }
    if (r.strategy === "direction") {
      return out("L1", "direction",
        `Ya, coba gerakkan penanda ke arah itu dari ${s} sampai ${e}. Berapa derajat ${noun} yang kamu lihat?`);
    }
    return out("L1", "unclear",
      `Coba kerjakan dengan termometer di applet. Berapa ${noun} suhunya, dan bagaimana kamu mendapatkannya?`);
  }

  function opening(stage) {
    const { noun } = verbs(stage);
    return `Coba kerjakan dengan termometer di applet. Berapa ${noun} suhunya, dan bagaimana kamu mendapatkannya? Tulis jawabanmu di kotak jawaban applet, lalu tekan Periksa.`;
  }

  const KIND_LABEL = {
    goal: "jawaban benar + pecah di 0 (target)",
    splitNoTotal: "pecah di 0, total belum ada",
    counting: "benar, menghitung satu per satu",
    countingNoTotal: "menghitung satu per satu, total belum ada",
    splitHalf: "berhenti di 0, baru satu bagian",
    sumOnly: "benar, penjumlahan tanpa makna",
    formal: "benar, hitungan simbolik",
    answerOnly: "benar, belum ada penjelasan",
    direction: "baru arah gerak",
    unclear: "belum jelas",
    howTo: "bertanya cara memakai applet",
    why: "bertanya kenapa",
    "wrong:noSign": "salah: mengurangkan tanpa tanda",
    "wrong:fencepost": "salah: menghitung angka, bukan lompatan",
    "wrong:signOfRise": "salah: kenaikan diberi tanda minus",
    "wrong:dontKnow": "belum tahu",
    "wrong:other": "salah",
    "wrong:none": "salah",
  };

  /**
   * What the AI has to achieve with this turn, in words, plus the numbers it may use.
   * The AI writes its own sentence from this; the scripted reply is only the fallback.
   */
  function brief(res, stage, studentText) {
    const s = deg(stage.start);
    const e = deg(stage.end);
    const { noun } = verbs(stage);
    const noSplit = "Jangan menyebut angka 0 sebagai titik pemecah dan jangan menyebut dua bagian perubahan (dari suhu awal ke 0, dari 0 ke suhu akhir).";
    const noAnswer = "Jangan menyebut jawaban akhir.";
    const k = res.kind;
    const AIM = {
      "L1:unclear": [`Ajak siswa mencoba dengan termometer di applet, lalu tanya berapa ${noun} suhunya dan bagaimana ia mendapatkannya.`, noAnswer],
      "L1:direction": [`Tanggapi arah yang disebut siswa, lalu minta ia menggerakkan penanda dari ${s} sampai ${e} dan menyebut berapa ${noun} yang ia lihat.`, noAnswer],
      "L1:countingNoTotal": [`Siswa bergerak derajat demi derajat tapi belum menyebut totalnya. Tanyakan totalnya.`, noAnswer],
      "L2:wrong": [`Jawaban siswa belum tepat. Tanpa bilang salah, ajak siswa memeriksa jawabannya sendiri di termometer (mulai dari ${s}, bergerak sebanyak jawabannya, lihat sampai di mana).`, noAnswer + " " + noSplit],
      "L3:wrong": [`Pecah soal menjadi dua pertanyaan kecil: berapa derajat dari ${s} sampai 0 °C, dan berapa dari 0 °C sampai ${e}. Jangan beri hasilnya.`, noAnswer],
      "L4:answerOnly": [`Siswa sudah menulis jawaban yang benar tapi belum menjelaskan. Jangan bilang benar. Minta ia menceritakan bagaimana ia mendapatkannya dengan termometer.`, noSplit],
      "L4:counting": [`Siswa menghitung satu per satu. Sebut kembali caranya dengan kata-katamu, hargai usahanya, lalu tanya apakah ada cara yang lebih cepat tanpa menghitung satu per satu.`, noSplit],
      "L2:counting": [`Arahkan perhatian siswa ke angka 0 di termometer: tanya berapa derajat dari ${s} sampai 0 °C.`, "Jangan beri hasilnya."],
      "L3:counting": [`Minta siswa menuliskan dua bagian: dari ${s} sampai 0 °C, dan dari 0 °C sampai ${e}.`, "Jangan beri hasilnya."],
      "L4:splitHalf": [`Siswa sudah berhenti di 0 dan menyebut satu bagian. Minta bagian yang satunya lagi.`, noAnswer],
      "L4:splitNoTotal": [`Siswa sudah memecah di 0. Tanya total perubahannya.`, noAnswer],
      "L4:sumOnly": [`Siswa menjumlahkan dua angka. Tanya dari mana kedua angka itu di termometer, dari mana ke mana.`, noSplit],
      "L4:formal": [`Siswa memakai hitungan simbolik. Hargai, lalu minta ia menunjukkan langkahnya di termometer.`, noSplit],
      "L1:howTo": [`Siswa bertanya cara memakai applet. Jelaskan singkat: penanda biru dan merah ditarik ke atas atau ke bawah. Lalu ajak ia meletakkan penanda biru di ${s}.`, noAnswer + " " + noSplit],
      "L2:howTo": [`Siswa masih bingung memakai applet. Jelaskan lagi dengan kata lain cara menarik penanda, lalu ajak mencoba dari ${s}.`, noAnswer + " " + noSplit],
      "L4:why": [`Siswa bertanya kenapa. Jangan langsung menjawab; kembalikan pertanyaannya supaya ia berpikir sendiri, dengan melihat termometer.`, noAnswer + " " + noSplit],
    };
    const key = `${res.move}:${k.startsWith("wrong") ? "wrong" : k}`;
    const [aim, avoid] = AIM[key] || [null, null];
    if (!aim) return null;
    const allow = new Set([stage.start, stage.end]);
    for (const n of numbers(normalise(res.reply))) allow.add(n);
    for (const n of numbers(normalise(studentText))) allow.add(n);
    return { aim, avoid, allowNumbers: [...allow] };
  }

  const api = { normalise, numbers, read, step, opening, isCorrect, fmt, deg, KIND_LABEL, brief };
  if (typeof module !== "undefined") module.exports = api;
  else window.SuhuTutor = api;
})();
