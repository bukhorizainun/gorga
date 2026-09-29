/* Deterministic tutor for the temperature task.
   read()     turns a student text into numbers and a strategy label.
   step()     applies the teacher's protocol and returns the next move plus a scripted reply.
   The AI mode gets the same result, so every number and every decision comes from here. */

(function () {
  // Page language: the page sets window.GORGA_LANG before this file loads ("id" or "en").
  const LANG = typeof window !== "undefined" && window.GORGA_LANG === "en" ? "en" : "id";
  const tx = (id, en) => (LANG === "en" ? en : id);

  const WORDS = {
    nol: 0, satu: 1, dua: 2, tiga: 3, empat: 4, lima: 5, enam: 6, tujuh: 7, delapan: 8,
    sembilan: 9, sepuluh: 10, sebelas: 11, "dua belas": 12,
    zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8,
    nine: 9, ten: 10, eleven: 11, twelve: 12,
  };

  function normalise(text) {
    let t = String(text || "")
      .toLowerCase()
      .replace(/[−–—]/g, "-")
      .replace(/°\s*c?|derajat( celcius| celsius)?|degrees?( celsius)?/g, " ")
      .replace(/\s+/g, " ");
    for (const [w, n] of Object.entries(WORDS).sort((a, b) => b[0].length - a[0].length)) {
      t = t.replace(new RegExp(`\\b${w}\\b`, "g"), String(n));
    }
    return t
      .replace(/\b(min|minus|negatif|negative)\s*(\d)/g, "-$2")
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

  const DONTKNOW = /(tidak tahu|gak tau|ga tau|gatau|nggak tahu|ngga tahu|tdk tahu|belum tahu|bingung|entah|lupa|don'?t know|do not know|not sure|no idea|idk|confused)/;
  const ONE_BY_ONE = /(satu per satu|satu-satu|satu satu|masing-masing 1|naiknya 1|turunnya 1|per 1|tiap 1|1 by 1|one at a time|each degree|every degree|1 each)/;
  const DIRECTION = /\b(atas|bawah|naik|turun|up|down|upward|downward|rise|rises|fall|falls)\b/;
  const HOWTO = /(gimana|bagaimana|gmn|cara)\s*(cara\s*)?(geser|gerak|pakai|pake|menggeser|memakai|mengisi|isi)|how (do|can|should) i (move|drag|use|slide)|how to (move|drag|use)/;
  const WHY = /\b(kenapa|mengapa|knp|kok|why)\b/;

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
    const below = Math.abs(Math.min(stage.start, stage.end));
    const above = Math.max(stage.start, stage.end);
    const splitFull = crosses && hasZero && (
      (count(partA) >= 2 && count(partB) >= 2) ||
      // both parts as amounts plus the total, e.g. "-6 ke 0 naik 6, terus 4 lagi, jadi 10"
      (ns.includes(below) && ns.includes(above) && abs.includes(size))
    );
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
    return LANG === "en"
      ? { up, verb: up ? "rises" : "falls", noun: up ? "rise" : "fall" }
      : { up, verb: up ? "naik" : "turun", noun: up ? "kenaikan" : "penurunan" };
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
    // A reading from the AI, already checked by verify(), replaces "unclear".
    if (p.override && r.strategy === "unclear") {
      r.strategy = p.override.strategy;
      if (p.override.total !== null && p.override.total !== undefined) r.total = p.override.total;
      r.byAI = true;
    }
    // The two halves of the split may come in two messages.
    if (r.strategy !== "split" && mem.halfText && read(`${mem.halfText} ${input.text}`, stage).strategy === "split") {
      r.strategy = "split";
    }
    const { verb, noun, up } = verbs(stage);
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
        tx(`Tarik penanda biru atau merah ke atas atau ke bawah di sepanjang termometer. ` +
          `Coba letakkan penanda biru di ${s}. Lalu apa yang kamu lihat saat penandanya digerakkan ke ${e}?`,
          `Drag the blue or the red marker up or down along the thermometer. ` +
          `Try putting the blue marker at ${s}. What do you notice as you move it to ${e}?`));
    }
    if (r.strategy === "why") {
      return out("L4", "why",
        answerOK
          ? tx(`Pertanyaan yang bagus. Menurutmu, apa yang istimewa dari 0 °C di termometer, dibandingkan angka lainnya?`,
              `Good question. What do you think is special about 0 °C on the thermometer, compared with the other numbers?`)
          : tx(`Pertanyaan yang bagus. Coba kita lihat bersama di termometer: dari ${s}, penandanya perlu bergerak ke mana supaya sampai di ${e}?`,
              `Good question. Let's look at the thermometer together: from ${s}, which way does the marker have to move to reach ${e}?`));
    }

    if (r.strategy === "offTopic") {
      return out("L1", "offTopic",
        tx(`Kita lanjutkan soal suhunya dulu, ya. Dari ${s}, penanda di termometer perlu bergerak ke mana supaya sampai di ${e}?`,
          `Let's get back to the temperature question. From ${s}, which way does the marker have to move to reach ${e}?`));
    }
    if (r.strategy === "splitIdea") {
      return out("L4", "splitIdea",
        tx(`Kamu mau berhenti di 0 dulu. Dari ${s} sampai 0 °C, berapa derajat ${verb}nya?`,
          `You want to stop at 0 first. From ${s} to 0 °C, how many degrees does it ${up ? "rise" : "fall"}?`));
    }

    // Goal reached: correct answer and the split at 0 in the student's own words.
    if (r.strategy === "split" && (answerOK || claimed === null)) {
      if (!answerOK && claimed === null) {
        return out("L4", "splitNoTotal",
          tx(`Kamu sudah memecahnya di 0. Jadi, berapa total ${noun} suhu dari ${s} sampai ${e}?`,
            `You split it at 0. So what is the total ${noun} in temperature from ${s} to ${e}?`));
      }
      const a = Math.abs(stage.start);
      const b = Math.abs(stage.end);
      return out("OK", "goal",
        tx(`Benar. Dari ${s} ke 0 °C ${verb} ${a} derajat, lalu dari 0 °C ke ${e} ${verb} ${b} derajat, ` +
          `jadi total ${verb} ${size} °C. Memecah di 0 membuat hitungannya cepat.`,
          `Correct. From ${s} to 0 °C it ${verb} ${a} degrees, then from 0 °C to ${e} it ${verb} ${b} degrees, ` +
          `so in total it ${verb} ${size} °C. Splitting at 0 makes the counting quick.`), true);
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
              ? tx(`Geser penanda biru ke ${s} dan penanda merah ke ${e}. Dari biru ke merah, ke arah mana suhunya bergerak, dan melewati angka apa saja?`,
                  `Move the blue marker to ${s} and the red marker to ${e}. Going from blue to red, which way does the temperature move, and which numbers does it pass?`)
              : tx(`Letakkan dulu penanda termometer di ${s}. Lalu gerakkan sampai ${e}: ke arah mana penandanya bergerak, dan melewati angka apa saja?`,
                  `First put the thermometer marker at ${s}. Then move it to ${e}: which way does it move, and which numbers does it pass?`));
        }
        const c = claimed === null ? "" : fmt(claimed);
        const replies = LANG === "en" ? {
          noSign: `You answered ${c}. Check it on the thermometer: start at ${s} and go ${up ? "up" : "down"} ${Math.abs(claimed)} degrees. Where does the marker end up?`,
          fencepost: `You answered ${c}. Did you count the numbers or the jumps? Count how many times the marker moves from ${s} to ${e}.`,
          signOfRise: `You answered ${c}. From ${s} to ${e}, does the temperature rise or fall? If it rises, what does the minus sign in your answer mean?`,
          dontKnow: `That's fine. The marker is at ${s} now. Move it slowly to ${e}: which way does it go?`,
          other: `You answered ${c}. Move the marker from ${s} to ${e}. Which numbers does it pass?`,
          none: `Move the marker from ${s} to ${e}. Which numbers does it pass?`,
        } : {
          noSign: `Kamu menjawab ${c}. Coba cek dengan termometer: mulai dari ${s}, ${verb} ${Math.abs(claimed)} derajat. Penandanya sampai di angka berapa?`,
          fencepost: `Kamu menjawab ${c}. Yang kamu hitung angka-angkanya atau lompatannya? Coba hitung berapa kali penanda bergerak dari ${s} sampai ${e}.`,
          signOfRise: `Kamu menjawab ${c}. Dari ${s} ke ${e}, suhunya naik atau turun? Kalau naik, apa arti tanda minus di jawabanmu?`,
          dontKnow: `Tidak apa-apa. Penanda termometer sekarang di ${s}. Gerakkan pelan-pelan ke ${e}: ke arah mana penandanya bergerak?`,
          other: `Kamu menjawab ${c}. Gerakkan penanda dari ${s} sampai ${e}. Angka apa saja yang dilewati penandanya?`,
          none: `Gerakkan penanda dari ${s} sampai ${e}. Angka apa saja yang dilewati penandanya?`,
        };
        return out("L2", "wrong:" + k, replies[k] || replies.other);
      }
      if (n === 1) {
        return out("L3", "wrong:" + k,
          tx(`Coba bagi jadi dua bagian. Berapa derajat dari ${s} sampai 0 °C? Lalu berapa derajat dari 0 °C sampai ${e}?`,
            `Try it in two parts. How many degrees from ${s} to 0 °C? And how many from 0 °C to ${e}?`));
      }
      return out("HINT", "wrong:" + k,
        tx(`Hitung lompatannya, bukan angkanya. Dari ${s} ke 0 °C ada ${Math.abs(stage.start)} lompatan. ` +
          `Sekarang hitung lompatan dari 0 °C ke ${e}, lalu jumlahkan keduanya.`,
          `Count the jumps, not the numbers. From ${s} to 0 °C there are ${Math.abs(stage.start)} jumps. ` +
          `Now count the jumps from 0 °C to ${e}, then add the two.`));
    }

    // Answer is correct but the target reasoning is not there yet.
    if (answerOK) {
      switch (r.strategy) {
        case "counting": {
          // A stuck student skips the "faster way?" question and gets the pointer to 0.
          const n = stuck ? Math.max(1, mem.counting) : mem.counting;
          const kind = stuck ? "stuck" : "counting";
          if (n === 0) {
            return out("L4", kind,
              tx(`Kamu menghitung satu per satu dan sampai di ${size}. Bisakah kamu menemukannya lebih cepat, tanpa menghitung satu per satu?`,
                `You counted one by one and got ${size}. Can you find it faster, without counting one by one?`));
          }
          if (n === 1) {
            return out("L2", kind,
              tx(`Perhatikan angka 0 di termometer. Kalau kamu berhenti sebentar di 0 °C, berapa derajat yang sudah ${verb} dari ${s}?`,
                `Look at 0 on the thermometer. If you stop at 0 °C for a moment, how many degrees has it ${up ? "risen" : "fallen"} from ${s}?`));
          }
          return out("L3", kind,
            tx(`Berapa derajat dari ${s} sampai 0 °C, dan berapa derajat dari 0 °C sampai ${e}? Tuliskan keduanya.`,
              `How many degrees from ${s} to 0 °C, and how many from 0 °C to ${e}? Write both.`));
        }
        case "direction":
          return out("L4", "direction",
            tx(`Ya, suhunya ${verb}. Berapa derajat ${noun}nya, dan bagaimana kamu menghitungnya di termometer?`,
              `Yes, the temperature ${verb}. By how many degrees, and how did you count it on the thermometer?`));
        case "splitHalf":
          return out("L4", "splitHalf",
            tx(`Kamu sudah berhenti di 0. Bagian yang satunya lagi berapa derajat? Tulis kedua bagiannya.`,
              `You stopped at 0. How many degrees is the other part? Write both parts.`));
        case "sumOnly":
          return out("L4", "sumOnly",
            tx(`Kamu menjumlahkan ${Math.abs(stage.start)} dan ${Math.abs(stage.end)}. Di termometer, angka-angka itu jarak dari mana ke mana?`,
              `You added ${Math.abs(stage.start)} and ${Math.abs(stage.end)}. On the thermometer, each of those is the distance from where to where?`));
        case "formal":
          return out("L4", "formal",
            tx(`Hitunganmu cocok. Bisakah kamu menunjukkannya di termometer: dari ${s} ke mana dulu, lalu ke mana?`,
              `Your calculation works. Can you show it on the thermometer: from ${s}, where to first, and then where?`));
        default:
          if (mem.lastKind === "answerOnly") {
            return out("L4", "answerOnly",
              tx(`Coba ceritakan langkahnya satu per satu: dari ${s}, penandanya kamu gerakkan ke mana, dan sampai mana?`,
                `Tell me your steps: from ${s}, which way did you move the marker, and how far?`));
          }
          if (input.from === "applet") {
            return out("L4", "answerOnly",
              tx(`Kamu menulis ${fmt(claimed)} di applet. Bagaimana kamu mendapatkan ${fmt(claimed)}? Ceritakan langkahmu di termometer.`,
                `You wrote ${fmt(claimed)} in the applet. How did you get ${fmt(claimed)}? Tell me your steps on the thermometer.`));
          }
          return out("L4", "answerOnly",
            tx(`Oke, coba jelaskan caramu memakai termometer. Bagaimana kamu bisa mendapatkan ${size}?`,
              `Okay, explain how you used the thermometer. How did you get ${size}?`));
      }
    }

    // No total yet.
    if (r.strategy === "counting") {
      return out("L1", "countingNoTotal",
        tx(`Kamu menggerakkan penanda derajat demi derajat. Jadi, berapa ${noun} suhunya dari ${s} sampai ${e}?`,
          `You moved the marker degree by degree. So what is the ${noun} in temperature from ${s} to ${e}?`));
    }
    if (r.strategy === "direction") {
      return out("L1", "direction",
        tx(`Ya, coba gerakkan penanda ke arah itu dari ${s} sampai ${e}. Berapa derajat ${noun} yang kamu lihat?`,
          `Yes, move the marker that way from ${s} to ${e}. How many degrees of ${noun} do you see?`));
    }
    return out("L1", "unclear",
      tx(`Coba kerjakan dengan termometer di applet. Berapa ${noun} suhunya, dan bagaimana kamu mendapatkannya?`,
        `Try it with the thermometer in the applet. What is the ${noun} in temperature, and how did you get it?`));
  }

  function opening(stage) {
    const { noun } = verbs(stage);
    return tx(`Coba kerjakan dengan termometer di applet. Berapa ${noun} suhunya, dan bagaimana kamu mendapatkannya? Tulis jawabanmu di kotak jawaban applet, lalu tekan Periksa.`,
      `Try it with the thermometer in the applet. What is the ${noun} in temperature, and how did you get it? Type your answer in the applet's answer box, then press Check answer.`);
  }

  const KIND_LABEL_EN = {
    goal: "correct answer + split at 0 (target)",
    splitNoTotal: "split at 0, no total yet",
    counting: "correct, counting one by one",
    countingNoTotal: "counting one by one, no total yet",
    splitHalf: "stopped at 0, one part only",
    sumOnly: "correct, sum without meaning",
    formal: "correct, symbolic calculation",
    answerOnly: "correct, no explanation yet",
    direction: "direction only",
    unclear: "unclear",
    howTo: "asks how to use the applet",
    offTopic: "off topic",
    stuck: "stuck, no faster way yet",
    splitIdea: "idea of stopping at 0, no numbers",
    why: "asks why",
    "wrong:noSign": "wrong: subtracted without signs",
    "wrong:fencepost": "wrong: counted numbers, not jumps",
    "wrong:signOfRise": "wrong: minus sign on a rise",
    "wrong:dontKnow": "does not know yet",
    "wrong:other": "wrong",
    "wrong:none": "wrong",
  };

  const KIND_LABEL_ID = {
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
    offTopic: "di luar soal",
    stuck: "macet, belum tahu cara lebih cepat",
    splitIdea: "ide berhenti di 0, belum ada angka",
    why: "bertanya kenapa",
    "wrong:noSign": "salah: mengurangkan tanpa tanda",
    "wrong:fencepost": "salah: menghitung angka, bukan lompatan",
    "wrong:signOfRise": "salah: kenaikan diberi tanda minus",
    "wrong:dontKnow": "belum tahu",
    "wrong:other": "salah",
    "wrong:none": "salah",
  };
  const KIND_LABEL = LANG === "en" ? KIND_LABEL_EN : KIND_LABEL_ID;

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
      "L4:direction": [`Siswa menyebut arah perubahan suhu saja. Tanggapi arahnya, lalu tanya berapa derajat perubahannya dan bagaimana ia menghitungnya di termometer.`, noSplit],
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
      "L1:offTopic": [`Siswa menulis hal di luar soal. Tanggapi singkat dan ramah, lalu ajak kembali ke soal termometer dengan satu pertanyaan.`, noAnswer + " " + noSplit],
      "L4:splitIdea": [`Siswa sendiri punya ide berhenti di 0 tapi belum menyebut angka. Hargai idenya, lalu tanya berapa derajat dari ${s} sampai 0 °C.`, noAnswer],
      "L4:why": [`Siswa bertanya kenapa. Jangan langsung menjawab; kembalikan pertanyaannya supaya ia berpikir sendiri, dengan melihat termometer.`, noAnswer + " " + noSplit],
    };
    const key = `${res.move}:${k.startsWith("wrong") ? "wrong" : k === "stuck" ? "counting" : k}`;
    const [aim, avoid] = AIM[key] || [null, null];
    if (!aim) return null;
    const allow = new Set([stage.start, stage.end]);
    for (const n of numbers(normalise(res.reply))) allow.add(n);
    for (const n of numbers(normalise(studentText))) allow.add(n);
    return { aim, avoid, allowNumbers: [...allow] };
  }

  const AI_STRATEGIES = ["split", "splitHalf", "splitIdea", "counting", "sumOnly", "formal", "answerOnly",
    "dontKnow", "direction", "howTo", "why", "offTopic", "unclear"];
  const ZERO_WORDS = /(\b0\b|nol|titik beku|beku|zero|freezing)/;

  /**
   * Checks an AI reading of the student's text against the text itself and the task.
   * Anything the AI claims about numbers must be visible in what the student wrote.
   * Returns {strategy, total} to use, or null to stay with "unclear".
   */
  function verify(ai, text, stage) {
    if (!ai || !AI_STRATEGIES.includes(ai.strategy) || ai.strategy === "unclear") return null;
    const t = normalise(text);
    const ns = numbers(t);
    const abs = ns.map(Math.abs);
    const has = (v) => abs.includes(Math.abs(v));
    const zero = ZERO_WORDS.test(t);
    let total = Number.isFinite(Number(ai.total)) && ai.total !== null ? Number(ai.total) : null;
    if (total !== null && !has(total)) total = null; // the AI may not invent the student's number

    // The part below 0 must appear as a positive amount ("naik 6"), not only as the temperature
    // "-6"; the part above 0 has the same number as its temperature, so either counts.
    const below = Math.abs(Math.min(stage.start, stage.end));
    const above = Math.max(stage.start, stage.end);
    const partBelow = ns.includes(below);
    const partAbove = ns.includes(above);
    // One part alone counts only if it is clearly an amount: the part below 0 written as a
    // positive number, or the part above 0 written twice (as temperature and as amount).
    const halfPart = partBelow || ns.filter((n) => n === above).length >= 2;

    switch (ai.strategy) {
      case "split":
        // The final confirmation depends on this, so both parts and the stop at 0 must be written.
        if (partBelow && partAbove && zero) return { strategy: "split", total };
        if (zero && halfPart) return { strategy: "splitHalf", total };
        return zero ? { strategy: "splitIdea", total: null } : null;
      case "splitHalf":
        if (zero && halfPart) return { strategy: "splitHalf", total };
        return zero ? { strategy: "splitIdea", total: null } : null;
      case "splitIdea":
        return zero ? { strategy: "splitIdea", total: null } : null;
      case "counting":
        return ns.length >= 2 || /satu|per derajat|tiap derajat|one by one|each degree|every degree/.test(t) ? { strategy: "counting", total } : null;
      case "answerOnly":
        return total !== null ? { strategy: "answerOnly", total } : null;
      case "sumOnly":
      case "formal":
        return ns.length >= 2 ? { strategy: ai.strategy, total } : null;
      default:
        return { strategy: ai.strategy, total: null };
    }
  }

  // How much help each move gives. The AI may pick any move up to the level the protocol
  // has reached; L4 (revoice) and L1 (probe) give no new information.
  const HELP = { L1: 1, L4: 1, L2: 2, L3: 3, HINT: 4, OK: 0 };

  /**
   * AI-led mode: the rules no longer write the reply. They state the facts, the most help
   * allowed at this point of the protocol, and the numbers the reply may contain.
   * @param texts all student texts of this stage (chat and applet), oldest first
   */
  function limits(res, stage, mem, texts) {
    const size = Math.abs(stage.end - stage.start);
    const below = Math.abs(Math.min(stage.start, stage.end));
    const above = Math.max(stage.start, stage.end);
    const goal = res.move === "OK";
    const maxHelp = goal ? 4 : HELP[res.move] || 1;
    const allow = new Set([stage.start, stage.end]);
    for (const t of texts) for (const n of numbers(normalise(t))) allow.add(n);
    if (res.answerOK || goal) allow.add(size);
    const studentRaisedZero = ["splitIdea", "splitHalf", "splitNoTotal", "why"].includes(res.kind);
    const zeroOK = goal || maxHelp >= 2 || studentRaisedZero;
    if (zeroOK) allow.add(0);
    else allow.delete(0);
    if (maxHelp >= 4) { allow.add(0); allow.add(below); allow.add(above); }
    if (goal) { allow.add(0); allow.add(below); allow.add(above); allow.add(size); }
    const claimed = res.reading.total;
    const facts = [
      `Jawaban akhir siswa: ${res.answerOK ? `sudah benar (${size})` : claimed !== null ? `belum benar (siswa menulis ${fmt(claimed)})` : "belum ada"}.`,
      `Cara siswa di pesan terakhir: ${KIND_LABEL[res.kind] || res.kind}.`,
      goal
        ? "Penalaran target SUDAH muncul dari siswa sendiri. Saatnya konfirmasi akhir."
        : "Penalaran target (memecah di 0) BELUM muncul dari siswa.",
      `Percobaan salah sejauh ini: ${mem.wrong}. Berapa kali siswa menghitung satu per satu atau macet: ${mem.counting}.`,
    ];
    return { goal, maxHelp, allowNumbers: [...allow], facts, size, zeroOK, splitOK: goal || maxHelp >= 3 || studentRaisedZero };
  }

  /**
   * Content check for AI replies: a label can say L4 while the sentence gives the split away.
   * Returns the reason to reject, or null.
   */
  function overreach(reply, lim, stage) {
    const t = String(reply || "").toLowerCase().replace(/[−–—]/g, "-");
    const digits = (t.match(/-?\d+/g) || []).map(Number);
    const bad = digits.filter((n) => !lim.allowNumbers.includes(n));
    if (bad.length) return `angka ${bad.join(",")}`;
    if (!lim.zeroOK && /(\b0\b|\bnol\b|titik beku|\bzero\b|freezing)/.test(t)) return "menyebut 0";
    if (!lim.splitOK) {
      if (/(dua bagian|pecah|dibagi dua|bagi (jadi|menjadi) dua|dua langkah|two parts|two steps|split|break it)/.test(t)) return "memecah soal";
      const s = String(stage.start), e = String(stage.end);
      if (new RegExp(`${s}\\s*(°c)?\\s*(ke|sampai|hingga|to)\\s*(0|nol|zero)`).test(t) &&
          new RegExp(`(0|nol|zero)\\s*(°c)?\\s*(ke|sampai|hingga|to)\\s*${e}`).test(t)) return "memecah soal";
    }
    if (!lim.goal && /\b(benar|salah|betul|tepat|memang|correct|wrong|right|exactly|well done)\b/.test(t)) return "menilai";
    if (!lim.goal && !t.includes("?")) return "tanpa pertanyaan";
    return null;
  }

  const api = { normalise, numbers, read, step, opening, isCorrect, fmt, deg, KIND_LABEL, brief, verify, limits, HELP, overreach };
  if (typeof module !== "undefined") module.exports = api;
  else window.SuhuTutor = api;
})();
