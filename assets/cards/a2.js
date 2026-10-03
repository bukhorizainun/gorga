/* Task card for Applet 2, "Carbon balance: balloons and sandbags" (full protocol).
   Built on the protocol of Applet 1 (the teacher's sessions):
   - the first move is L1: try it in the applet and say how;
   - a correct answer is never called correct yet: L4 asks for the reasoning;
   - a wrong answer or "I don't know" goes L2 (point at one thing in the applet), L3 (break the
     question down), then a hint;
   - a correct answer without the target reasoning climbs L4 -> L2 -> L3 towards it;
   - the confirmation comes only when the answer is right AND the target reasoning came from
     the student.
   DRAFT: the targets and misconceptions below are the developer's reading of the teacher's
   questions and must be confirmed by the teacher.

   The applet (material mmbs5mud) starts at a random number; this card sets the start to 0,
   because the questions count carbon from nothing. Balloons are +1, sandbags -1; the basket
   moves after SUBMIT. Values read: numBalloons/numSandbags (pending), numBalloonsTotal/
   numSandbagsTotal (submitted), textRandomTotal (the number beside the basket). */

(function () {
  const LANG = window.GORGA_LANG === "en" ? "en" : "id";
  const tx = (id, en) => (LANG === "en" ? en : id);
  const fmt = (n) => (n < 0 ? `−${-n}` : String(n));

  /* ---------------- reading the student ---------------- */

  const WORDS = {
    nol: 0, satu: 1, dua: 2, tiga: 3, empat: 4, lima: 5, enam: 6, tujuh: 7, delapan: 8, sembilan: 9,
    sepuluh: 10, sebelas: 11, "dua belas": 12, "tiga belas": 13,
    zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
    eleven: 11, twelve: 12, thirteen: 13,
  };

  function normalise(text) {
    let t = String(text || "").toLowerCase().replace(/[−–—]/g, "-").replace(/\s+/g, " ");
    for (const [w, n] of Object.entries(WORDS).sort((a, b) => b[0].length - a[0].length)) {
      t = t.replace(new RegExp(`\\b${w}\\b`, "g"), String(n));
    }
    return t
      .replace(/\b(negatif|negative|min|minus)\s*(\d)/g, "-$2")
      .replace(/\b(ditambah|tambah|plus|added to)\b/g, "+")
      .replace(/\b(dikurangi|dikurang|kurang)\b/g, "-")
      .replace(/(^|[\s(,:=])-\s+(\d)/g, "$1-$2")
      .trim();
  }
  const numbers = (t) => (t.match(/-?\d+/g) || []).map((s) => parseInt(s, 10));
  const compact = (t) => t.replace(/\s+/g, "");

  const DONTKNOW = /(tidak tahu|gak tau|ga tau|gatau|nggak tahu|ngga tahu|tdk tahu|belum tahu|bingung|entah|lupa|ga ngerti|gak ngerti|tidak mengerti|don'?t know|do not know|not sure|no idea|idk|confused)/;
  const HOWTO = /(gimana|bagaimana|gmn|cara)\s*(cara\s*)?(pakai|pake|menambah|nambah|tekan|memakai|main|submit)|how (do|can|should) i (use|add|press)|how to (use|add)|tombol(nya)? (yang )?mana|which button/;
  const WHY = /\b(kenapa|mengapa|knp|kok|why)\b/;
  const BALLOON = /(balon|balloon)/;
  const BAG = /(karung|pasir|sandbag|sand bag|\bbags?\b)/;
  const UP = /(naik|ke ?atas|terbang|melayang|bertambah|lebih tinggi|positif|\bup\b|upward|rises?|higher|goes up|positive|\+)/;
  const DOWN = /(turun|ke ?bawah|tenggelam|berkurang|lebih rendah|negatif|\bdown\b|downward|sinks?|falls?|lower|goes down|negative)/;
  const ZERO_PAIR = /((menghapus|menghilangkan|membatalkan|meniadakan|mengimbangi|menetralkan|cancels?|removes?) (1 )?balo|jumlah(nya)? (harus |juga |pasti )?sama|sama banyak|sama jumlah|sama dengan (jumlah )?balon|sebanyak balon|saling (menghapus|menghilangkan|membatalkan|meniadakan|mengurangi)|berpasangan|pasangan|berlawanan|lawan|impas|seimbang|membatalkan|menetralkan|opposite|cancel|same (number|amount)|as many|equal (number|amount)|zero pair|pairs?)/;

  /** Direction words found near "balloon" and near "sandbag" in the text. */
  function directions(t) {
    const parts = t.split(/[.,;!?]|\b(dan|sedangkan|tapi|tetapi|lalu|kalau|jika|and|but|while|whereas|if)\b/).filter(Boolean);
    let balloon = null, bag = null, sign = { balloon: false, bag: false };
    for (const p of parts) {
      const dir = DOWN.test(p) && !UP.test(p.replace(/positif|positive|\+/g, "")) ? "down" : UP.test(p) ? "up" : null;
      if (BALLOON.test(p) && !BAG.test(p)) { if (dir && !balloon) balloon = dir; if (/positif|positive|\+ ?1/.test(p)) sign.balloon = true; }
      if (BAG.test(p) && !BALLOON.test(p)) { if (dir && !bag) bag = dir; if (/negatif|negative|- ?1/.test(p)) sign.bag = true; }
    }
    // "positif" and "negatif" mentioned anywhere, in the right order, also link the two
    if (/positif|positive/.test(t) && /negatif|negative/.test(t)) {
      const bi = t.search(BALLOON), gi = t.search(BAG), pi = t.search(/positif|positive/), ni = t.search(/negatif|negative/);
      if (bi >= 0 && gi >= 0 && (bi < gi) === (pi < ni)) sign = { balloon: true, bag: true };
    }
    return { balloon, bag, sign };
  }

  /** The total the student claims: after "=", "jadi", "sisa", or the only new number. */
  function claimedTotal(t, ns, known) {
    const after = t.match(/(=|jadi|sisa(nya)?|tersisa|hasil(nya)?|totalnya|tinggal|left|remain(s|ing)?|so)\s*(-?\d+)/g);
    if (after) return parseInt(after[after.length - 1].match(/-?\d+/)[0], 10);
    if (/^-?\d+$/.test(t)) return ns[0];
    const rest = ns.filter((n) => !known.has(n) && n !== 1);   // "satu balon" is not an answer
    return rest.length === 1 ? rest[0] : null;
  }

  /* ---------------- the three questions ---------------- */

  const Q = [
    { // 1: which way the basket moves
      id: "arah",
      target: tx("Siswa menyebut kedua arah sendiri: balon membuat keranjang naik (bilangan positif) dan karung pasir membuat keranjang turun (bilangan negatif).",
        "The student states both directions: balloons move the basket up (positive numbers) and sandbags move it down (negative numbers)."),
      numbers: [1, 0],
    },
    { // 2: 8 + (-5) = 3
      id: "sisa", balloons: 8, bags: 5, answer: 3,
      target: tx("Jawaban 3 DAN ditulis sebagai penjumlahan bilangan bulat 8 + (−5) = 3, dengan karung pasir sebagai bilangan negatif.",
        "The answer 3 AND written as an integer addition 8 + (−5) = 3, with the sandbags as a negative number."),
      numbers: [8, 5, 0, 1],
    },
    { // 3: 6 + (-6) = 0
      id: "nol", balloons: 6, answer: 6,
      target: tx("Jawaban 6 (karbon yang diserap, ditulis −6 sebagai bilangan) DAN alasan pasangan nol: setiap karung pasir membatalkan satu balon, jadi banyaknya harus sama; 6 + (−6) = 0.",
        "The answer 6 (carbon absorbed, −6 as a number) AND the zero-pair reason: each sandbag cancels one balloon, so the amounts must be equal; 6 + (−6) = 0."),
      numbers: [6, 0, 1],
    },
  ];

  function read(text, qi) {
    const t = normalise(text);
    const c = compact(t);
    const ns = numbers(t);
    const q = Q[qi];
    const r = { ns, total: null, strategy: "unclear" };

    if (qi === 0) {
      const d = directions(t);
      // Both directions may come in two messages: keep what the student said before.
      const before = (read.memory && read.memory.dir) || null;
      if (before) {
        if (!d.balloon && before.balloon) d.balloon = before.balloon;
        if (!d.bag && before.bag) d.bag = before.bag;
        d.sign = { balloon: d.sign.balloon || before.sign.balloon, bag: d.sign.bag || before.sign.bag };
      }
      r.dir = d;
      if (d.balloon === "up" && d.bag === "down") r.strategy = d.sign.balloon && d.sign.bag ? "bothSigned" : "both";
      else if (d.balloon === "down" || d.bag === "up") r.strategy = "reversed";
      else if (d.balloon || d.bag) r.strategy = "one";
    } else if (qi === 1) {
      const intAdd = /(^|[^\d])8\+\(?-5\)?|\(?-5\)?\+8/.test(c);
      const sub = !intAdd && /(^|[^\d+])8-5(?!\d)/.test(c);
      const both = /(^|[^\d])8\+5(?!\d)|5\+8/.test(c);
      r.total = claimedTotal(t, ns, new Set([8, 5, -5, 0]));
      if (intAdd) r.strategy = "intAdd";
      else if (sub) r.strategy = "subtraction";
      else if (both) r.strategy = "addedBoth";
    } else {
      const intAdd = /(^|[^\d])6\+\(?-6\)?|\(?-6\)?\+6/.test(c);
      const sub = !intAdd && /(^|[^\d+])6-6(?!\d)/.test(c);
      // Here 0 is what should be left, not the amount absorbed: "6 - 6 = 0" answers 6.
      if (intAdd || sub || /(serap|absorb|karung|sandbag)\D{0,15}-?6\b|\b-?6\s*(karung|karbon|carbon|sandbag)/.test(t)) r.total = 6;
      else r.total = claimedTotal(t, ns, new Set());
      if (r.total === null && ns.some((n) => Math.abs(n) === 6)) r.total = ns.find((n) => Math.abs(n) === 6);
      if (ZERO_PAIR.test(t)) {
        r.strategy = "zeroPair";
        if (r.total !== null && Math.abs(r.total) !== 6 && !/=/.test(t)) r.total = null;  // a reason, not a new answer
      }
      else if (intAdd) r.strategy = "intAdd";
      else if (sub) r.strategy = "subtraction";
    }
    if (r.strategy === "unclear") {
      if (HOWTO.test(t)) r.strategy = "howTo";
      else if (WHY.test(t) && ns.length <= 1) r.strategy = "why";
      else if (DONTKNOW.test(t)) r.strategy = "dontKnow";
      else if (r.total !== null && ns.length <= 2) r.strategy = "answerOnly";
    }
    return r;
  }

  function isCorrect(total, qi) {
    if (total === null || total === undefined) return false;
    if (qi === 1) return total === 3;
    if (qi === 2) return Math.abs(total) === 6;
    return false;
  }

  function wrongKind(total, qi) {
    if (total === null) return "none";
    if (qi === 1) {
      if (total === 13) return "addedBoth";
      if (total === -3) return "signFlip";
      if (total === 8) return "ignoredBags";
      return "other";
    }
    if (qi === 2) {
      if (total === 0) return "restated";
      if (Math.abs(total) === 12) return "doubled";
      if (Math.abs(total) === 3) return "half";
      return "other";
    }
    return "other";
  }

  /* ---------------- the applet ---------------- */

  function setup(api) {
    // Count carbon from nothing: the questions start with clean air.
    api.evalCommand("numRandomStart=0");
    api.evalCommand("RunClickScript(scriptResetApp)");
  }

  function appState(api) {
    try {
      const v = (n) => Number(api.getValue(n)) || 0;
      const balloons = v("numBalloonsTotal") + v("numBalloons");
      const bags = v("numSandbagsTotal") + v("numSandbags");
      const basket = parseInt(api.getValueString("textRandomTotal"), 10);
      return { balloons, bags, basket: Number.isFinite(basket) ? basket : null,
        pending: v("numBalloons") !== 0 || v("numSandbags") !== 0, used: balloons + bags > 0 };
    } catch { return { balloons: 0, bags: 0, basket: null, pending: false, used: false }; }
  }

  function appletFact(app) {
    return tx(`Di applet sekarang: ${app.balloons} balon, ${app.bags} karung pasir, keranjang di angka ${app.basket ?? "?"}${app.pending ? " (belum di-SUBMIT)" : ""}.`,
      `In the applet now: ${app.balloons} balloons, ${app.bags} sandbags, basket at ${app.basket ?? "?"}${app.pending ? " (not submitted yet)" : ""}.`);
  }

  /* ---------------- one turn of the protocol ---------------- */

  function opening(qi) {
    return [
      tx("Coba tekan tombol + di samping balon dan di samping karung pasir, lalu tekan SUBMIT. Ke mana keranjangnya bergerak? Ceritakan dengan kata-katamu sendiri.",
        "Try the + buttons beside the balloons and beside the sandbags, then press SUBMIT. Which way does the basket move? Tell me in your own words."),
      tx("Coba kerjakan di aplet: buat keadaan kota itu dengan balon dan karung pasir, lalu tekan SUBMIT. Berapa karbon yang tersisa, dan bagaimana kamu menuliskannya sebagai penjumlahan?",
        "Try it in the applet: build the city with balloons and sandbags, then press SUBMIT. How much carbon is left, and how do you write it as an addition?"),
      tx("Coba di aplet: tambahkan 6 balon dulu. Berapa karung pasir yang perlu kamu tambahkan supaya keranjang kembali ke 0? Bagaimana kamu menemukannya?",
        "Try it in the applet: add 6 balloons first. How many sandbags do you need so the basket goes back to 0? How did you find it?"),
    ][qi];
  }

  /**
   * @param p {qi, text, app, mem:{answerOK, wrong, weak, lastKind}}
   * @returns {{move, kind, reply, done, answerOK, reading}}
   */
  function step(p) {
    const { qi, app, mem } = p;
    read.memory = { dir: mem.dir || null };
    const r = read(p.text, qi);
    read.memory = null;
    // A reversed direction is not carried over; correct ones are remembered for the next turn.
    if (r.dir && r.strategy !== "reversed") mem.dir = r.dir;
    let answerOK = mem.answerOK;
    if (r.total !== null) answerOK = isCorrect(r.total, qi);
    const out = (move, kind, reply, done = false) => ({ move, kind, reply, done, answerOK, reading: r });

    if (r.strategy === "howTo") {
      return out(mem.lastKind === "howTo" ? "L2" : "L1", "howTo",
        tx("Tekan + di samping balon untuk menambah balon, atau + di samping karung pasir untuk menambah karung. Tombol − menguranginya. Lalu tekan SUBMIT dan lihat angka di samping keranjang. Apa yang terjadi?",
          "Press + beside the balloons to add a balloon, or + beside the sandbags to add a sandbag; − takes one away. Then press SUBMIT and look at the number beside the basket. What happens?"));
    }
    if (r.strategy === "why") {
      return out("L4", "why", [
        tx("Pertanyaan yang bagus. Coba tambah satu balon lalu SUBMIT: angka di samping keranjang berubah dari berapa ke berapa?",
          "Good question. Add one balloon and press SUBMIT: the number beside the basket changes from what to what?"),
        tx("Pertanyaan yang bagus. Pohon menyerap karbon. Di aplet, karbon yang diserap ditunjukkan dengan apa, dan ke mana ia menggerakkan keranjang?",
          "Good question. Trees absorb carbon. In the applet, what shows absorbed carbon, and which way does it move the basket?"),
        tx("Pertanyaan yang bagus. Kalau ada satu balon dan satu karung pasir sekaligus, keranjangnya naik, turun, atau tetap?",
          "Good question. With one balloon and one sandbag together, does the basket go up, down, or stay?"),
      ][qi]);
    }

    /* ----- question 1: directions ----- */
    if (qi === 0) {
      if (r.strategy === "bothSigned") {
        return out("OK", "goal", tx(
          "Benar, seperti katamu: balon membuat keranjang naik dan ditulis positif, karung pasir membuatnya turun dan ditulis negatif.",
          "Correct, as you said: balloons move the basket up and are written as positive, sandbags move it down and are written as negative."), true);
      }
      if (r.strategy === "both") {
        return out("L4", "bothNoSign", tx(
          "Kamu melihat balon membuat keranjang naik dan karung pasir membuatnya turun. Kalau ditulis sebagai bilangan, satu balon itu bilangan apa, dan satu karung pasir bilangan apa?",
          "You saw balloons move the basket up and sandbags move it down. Written as numbers, what is one balloon, and what is one sandbag?"));
      }
      if (r.strategy === "one") {
        const said = r.dir.balloon ? tx("balon", "balloons") : tx("karung pasir", "sandbags");
        const other = r.dir.balloon ? tx("karung pasir", "a sandbag") : tx("balon", "a balloon");
        return out("L4", "oneSide", tx(
          `Kamu sudah menjelaskan apa yang terjadi dengan ${said}. Bagaimana dengan ${other}: tambahkan satu, tekan SUBMIT, lalu ke mana keranjangnya bergerak?`,
          `You explained what ${said} do. What about ${other}: add one, press SUBMIT, and which way does the basket move?`));
      }
      if (r.strategy === "reversed" || r.strategy === "dontKnow") {
        const k = r.strategy === "dontKnow" ? "dontKnow" : "reversed";
        if (mem.wrong === 0) {
          return out("L2", "wrong:" + k, tx(
            "Coba tekan + di samping balon satu kali, lalu SUBMIT. Angka di samping keranjang berubah dari berapa ke berapa, dan keranjangnya ke atas atau ke bawah?",
            "Press + beside the balloons once, then SUBMIT. The number beside the basket changes from what to what, and does the basket go up or down?"));
        }
        if (mem.wrong === 1) {
          return out("L3", "wrong:" + k, tx(
            "Kita coba satu per satu. Tambah 1 balon, SUBMIT, lihat angkanya. Lalu tambah 1 karung pasir, SUBMIT, lihat lagi. Mana yang membuat angkanya bertambah, dan mana yang membuatnya berkurang?",
            "One at a time. Add 1 balloon, SUBMIT, read the number. Then add 1 sandbag, SUBMIT, read it again. Which one makes the number bigger, and which makes it smaller?"));
        }
        // No level above L3 Focus in the framework: one smaller sub-question.
        return out("L3", "wrong:" + k, tx(
          "Kita lihat balonnya saja dulu. Tambah satu balon, tekan SUBMIT: angka di samping keranjang jadi lebih besar atau lebih kecil?",
          "Just the balloons first. Add one balloon and press SUBMIT: does the number beside the basket get bigger or smaller?"));
      }
      if (!app.used) return out("L1", "notTried", opening(0));
      return out("L1", "unclear", tx(
        "Kamu sudah mencoba tombolnya. Saat kamu menambah balon, keranjangnya bergerak ke mana? Dan saat menambah karung pasir?",
        "You tried the buttons. When you add balloons, which way does the basket move? And when you add sandbags?"));
    }

    /* ----- questions 2 and 3: an amount ----- */
    const q = Q[qi];
    const shown = qi === 1
      ? app.balloons === 8 && app.bags === 5 && !app.pending
      : app.balloons === 6 && app.bags === 6 && !app.pending;
    const reasoned = qi === 1 ? r.strategy === "intAdd" : r.strategy === "zeroPair" || r.strategy === "intAdd";

    if (reasoned && (answerOK || r.total === null)) {
      if (!answerOK && r.total === null) {
        return out("L4", "reasonNoTotal", qi === 1
          ? tx("Kamu sudah menulis penjumlahannya. Jadi, berapa karbon yang tersisa di udara? Cek dengan angka di samping keranjang setelah SUBMIT.",
            "You wrote the addition. So how much carbon is left in the air? Check the number beside the basket after SUBMIT.")
          : tx("Alasanmu sudah ada. Jadi, berapa karbon yang harus diserap pohon?",
            "Your reason is there. So how much carbon must the trees absorb?"));
      }
      return out("OK", "goal", qi === 1
        ? tx("Benar, seperti yang kamu tulis: 8 + (−5) = 3, jadi tersisa 3 karbon di udara.",
          "Correct, as you wrote: 8 + (−5) = 3, so 3 carbon stays in the air.")
        : tx("Benar, seperti alasanmu: pohon harus menyerap 6 karbon, karena 6 + (−6) = 0.",
          "Correct, as you reasoned: the trees must absorb 6 carbon, because 6 + (−6) = 0."), true);
    }

    const stuck = answerOK && r.total === null && r.strategy === "dontKnow";
    if ((r.total !== null && !answerOK) || (r.strategy === "dontKnow" && !stuck)) {
      const k = r.strategy === "dontKnow" && r.total === null ? "dontKnow" : wrongKind(r.total, qi);
      const c = r.total === null ? "" : fmt(r.total);
      if (mem.wrong === 0) {
        const replies = qi === 1 ? {
          addedBoth: tx(`Kamu menjawab ${c}. Pohon menambah karbon di udara atau menguranginya? Coba di aplet: 8 balon dan 5 karung pasir, lalu SUBMIT. Keranjang berhenti di angka berapa?`,
            `You answered ${c}. Do trees add carbon to the air or take it away? Try 8 balloons and 5 sandbags in the applet, then SUBMIT. Where does the basket stop?`),
          signFlip: tx(`Kamu menjawab ${c}. Mana yang lebih banyak, balon atau karung pasirnya? Kalau balonnya lebih banyak, keranjang berakhir di atas atau di bawah 0?`,
            `You answered ${c}. Are there more balloons or more sandbags? With more balloons, does the basket end above or below 0?`),
          ignoredBags: tx(`Kamu menjawab ${c}. Bagaimana dengan karbon yang diserap pohon? Tambahkan juga karung pasirnya di aplet, lalu SUBMIT.`,
            `You answered ${c}. What about the carbon the trees absorb? Add the sandbags in the applet too, then SUBMIT.`),
          dontKnow: tx("Tidak apa-apa. Mulai dari asapnya: tambahkan balon sebanyak karbon dari asap, lalu SUBMIT. Keranjangnya di angka berapa?",
            "That's fine. Start with the smoke: add as many balloons as the smoke adds carbon, then SUBMIT. Where is the basket?"),
          other: tx(`Kamu menjawab ${c}. Coba di aplet: 8 balon dan 5 karung pasir, lalu SUBMIT. Keranjang berhenti di angka berapa?`,
            `You answered ${c}. Try 8 balloons and 5 sandbags in the applet, then SUBMIT. Where does the basket stop?`),
        } : {
          restated: tx("Nol itu karbon yang ingin tersisa. Yang ditanyakan: berapa karbon yang harus diserap pohon? Coba di aplet: 6 balon, lalu tambah karung pasir sampai keranjang di 0.",
            "Zero is the carbon we want left. The question is how much carbon the trees must absorb. Try 6 balloons, then add sandbags until the basket is at 0."),
          doubled: tx(`Kamu menjawab ${c}. Coba di aplet: 6 balon, lalu tambah ${Math.abs(r.total)} karung pasir dan SUBMIT. Keranjang berhenti di angka berapa?`,
            `You answered ${c}. Try 6 balloons, add ${Math.abs(r.total)} sandbags and SUBMIT. Where does the basket stop?`),
          half: tx(`Kamu menjawab ${c}. Coba di aplet: 6 balon, lalu tambah ${Math.abs(r.total)} karung pasir dan SUBMIT. Keranjang sudah di 0 atau belum?`,
            `You answered ${c}. Try 6 balloons, add ${Math.abs(r.total)} sandbags and SUBMIT. Is the basket at 0 yet?`),
          dontKnow: tx("Tidak apa-apa. Tambahkan 6 balon di aplet dan SUBMIT. Lalu tambah karung pasir satu per satu: apa yang terjadi pada keranjangnya?",
            "That's fine. Add 6 balloons and SUBMIT. Then add sandbags one at a time: what happens to the basket?"),
          other: tx(`Kamu menjawab ${c}. Coba di aplet: 6 balon, lalu tambah karung pasir sampai keranjang di 0. Berapa karung pasir yang kamu pakai?`,
            `You answered ${c}. Try 6 balloons, then add sandbags until the basket is at 0. How many sandbags did you use?`),
        };
        return out("L2", "wrong:" + k, replies[k] || replies.other);
      }
      if (mem.wrong === 1) {
        return out("L3", "wrong:" + k, qi === 1
          ? tx("Kita pecah jadi dua langkah. Setelah 8 balon, keranjang di angka berapa? Lalu setiap karung pasir menurunkannya satu. Dari sana turun berapa, dan sampai di mana?",
            "Two steps. After 8 balloons, where is the basket? Each sandbag then takes it down one. How far down from there, and where does it end?")
          : tx("Kita pecah. Setelah 6 balon, keranjang di angka berapa? Setiap karung pasir menurunkannya satu. Berapa kali harus turun supaya sampai di 0?",
            "Let's break it down. After 6 balloons, where is the basket? Each sandbag takes it down one. How many steps down to reach 0?"));
      }
      // No level above L3 Focus in the framework: one smaller sub-question.
      return out("L3", "wrong:" + k, qi === 1
        ? tx("Satu langkah dulu: pasang 8 balon saja dan tekan SUBMIT. Keranjangnya di angka berapa?",
          "One step first: put on the 8 balloons only and press SUBMIT. Where is the basket?")
        : tx("Satu langkah dulu: pasang 6 balon, lalu tambah satu karung pasir dan SUBMIT. Keranjangnya turun ke angka berapa?",
          "One step first: put on 6 balloons, then add one sandbag and press SUBMIT. Where does the basket go down to?"));
    }

    if (answerOK) {
      const n = stuck ? Math.max(1, mem.weak) : mem.weak;
      const kind = r.strategy === "subtraction" ? "subtraction" : stuck ? "stuck" : "answerOnly";
      if (n === 0) {
        if (r.strategy === "subtraction") {
          return out("L4", kind, qi === 1
            ? tx("Kamu menulis 8 − 5 dan mendapat 3. Soal ini meminta penjumlahan bilangan bulat. Karung pasir itu bilangan positif atau negatif, dan bagaimana menuliskannya sebagai penjumlahan?",
              "You wrote 8 − 5 and got 3. The question asks for an integer addition. Is a sandbag a positive or a negative number, and how do you write it as an addition?")
            : tx("Kamu menulis 6 − 6 = 0. Kenapa harus 6 karung pasir, bukan 5 atau 7? Apa yang terjadi pada keranjangnya?",
              "You wrote 6 − 6 = 0. Why 6 sandbags, and not 5 or 7? What happens to the basket?"));
        }
        if (!shown) {
          return out("L4", kind, qi === 1
            ? tx(`Bagaimana kamu mendapatkan ${fmt(r.total ?? 3)}? Tunjukkan di aplet: buat asap dan pohonnya dengan balon dan karung pasir, lalu SUBMIT.`,
              `How did you get ${fmt(r.total ?? 3)}? Show it in the applet: build the smoke and the trees with balloons and sandbags, then SUBMIT.`)
            : tx("Bagaimana kamu menemukannya? Tunjukkan di aplet: 6 balon, lalu karung pasir sampai keranjang di 0.",
              "How did you find it? Show it in the applet: 6 balloons, then sandbags until the basket is at 0."));
        }
        return out("L4", kind, qi === 1
          ? tx("Kamu sudah menunjukkannya di aplet. Sekarang tulis caramu sebagai penjumlahan bilangan bulat. Bagaimana menuliskannya?",
            "You showed it in the applet. Now write your way as an integer addition. How would you write it?")
          : tx("Kamu sudah menunjukkannya di aplet. Kenapa harus 6 karung pasir, bukan 5 atau 7?",
            "You showed it in the applet. Why 6 sandbags, and not 5 or 7?"));
      }
      if (n === 1) {
        return out("L2", kind, qi === 1
          ? tx("Perhatikan tulisan “My expression” di aplet setelah kamu memasang balon dan karung pasirnya. Karung pasir ditulis dengan tanda apa di sana, dan kenapa?",
            "Look at “My expression” in the applet after you set the balloons and sandbags. Which sign do the sandbags get there, and why?")
          : tx("Perhatikan keranjang saat kamu menambah satu balon lalu satu karung pasir. Apa yang terjadi pada keranjangnya?",
            "Watch the basket when you add one balloon and then one sandbag. What happens to it?"));
      }
      return out("L3", kind, qi === 1
        ? tx("Balon ditulis +8. Karung pasir ditulis berapa? Lengkapi: 8 + (…) = 3.",
          "The balloons are +8. What are the sandbags? Complete it: 8 + (…) = 3.")
        : tx("Satu balon dan satu karung pasir: keranjangnya naik, turun, atau tetap? Jadi kenapa 6 balon perlu 6 karung pasir?",
          "One balloon and one sandbag: does the basket go up, down, or stay? So why do 6 balloons need 6 sandbags?"));
    }

    if (r.strategy === "subtraction" || r.strategy === "intAdd") {
      return out("L4", "exprNoTotal", tx("Kamu sudah menulis hitungannya. Jadi berapa hasilnya? Cek di aplet setelah SUBMIT.",
        "You wrote the calculation. So what is the result? Check it in the applet after SUBMIT."));
    }
    if (!app.used) return out("L1", "notTried", opening(qi));
    return out("L1", "unclear", qi === 1
      ? tx("Kamu sudah mencoba di aplet. Berapa karbon yang tersisa di udara, dan bagaimana kamu menuliskannya sebagai penjumlahan?",
        "You tried it in the applet. How much carbon is left in the air, and how do you write it as an addition?")
      : tx("Kamu sudah mencoba di aplet. Berapa karbon yang harus diserap pohon, dan bagaimana kamu menemukannya?",
        "You tried it in the applet. How much carbon must the trees absorb, and how did you find it?"));
  }

  /* ---------------- a rung the ladder asks for ---------------- */

  /** The line for a rung when the card itself would have chosen another move (the teacher's
      order L1 -> L2 -> L3 -> L4 holds even after a correct answer). c: {answerOK, goal, k}. */
  function say(move, qi, c) {
    const ok = c.answerOK || c.goal;
    if (move === "L1") return opening(qi);
    if (move === "OK") {
      return [
        tx("Benar, seperti katamu: balon membuat keranjang naik dan ditulis positif, karung pasir membuatnya turun dan ditulis negatif.",
          "Correct, as you said: balloons move the basket up and are written as positive, sandbags move it down and are written as negative."),
        tx("Benar, seperti yang kamu tulis: 8 + (−5) = 3, jadi tersisa 3 karbon di udara.",
          "Correct, as you wrote: 8 + (−5) = 3, so 3 carbon stays in the air."),
        tx("Benar, seperti alasanmu: pohon harus menyerap 6 karbon, karena 6 + (−6) = 0.",
          "Correct, as you reasoned: the trees must absorb 6 carbon, because 6 + (−6) = 0."),
      ][qi];
    }
    if (move === "L2") {
      if (ok) {
        return [
          tx("Perhatikan angka di samping keranjang. Tambah satu balon lalu SUBMIT, kemudian satu karung pasir lalu SUBMIT: angkanya berubah bagaimana?",
            "Look at the number beside the basket. Add one balloon and SUBMIT, then one sandbag and SUBMIT: how does the number change?"),
          tx("Perhatikan tulisan “My expression” di aplet setelah kamu memasang balon dan karung pasirnya. Karung pasir ditulis dengan tanda apa di sana, dan kenapa?",
            "Look at “My expression” in the applet after you set the balloons and sandbags. Which sign do the sandbags get there, and why?"),
          tx("Perhatikan keranjang saat kamu menambah satu balon lalu satu karung pasir. Apa yang terjadi pada keranjangnya?",
            "Watch the basket when you add one balloon and then one sandbag. What happens to it?"),
        ][qi];
      }
      return [
        tx("Coba tekan + di samping balon satu kali, lalu SUBMIT. Angka di samping keranjang berubah dari berapa ke berapa, dan keranjangnya ke atas atau ke bawah?",
          "Press + beside the balloons once, then SUBMIT. The number beside the basket changes from what to what, and does the basket go up or down?"),
        tx("Mulai dari asapnya: tambahkan balon sebanyak karbon dari asap, lalu SUBMIT. Keranjangnya di angka berapa?",
          "Start with the smoke: add as many balloons as the smoke adds carbon, then SUBMIT. Where is the basket?"),
        tx("Tambahkan 6 balon di aplet dan SUBMIT. Lalu tambah karung pasir satu per satu: apa yang terjadi pada keranjangnya?",
          "Add 6 balloons and SUBMIT. Then add sandbags one at a time: what happens to the basket?"),
      ][qi];
    }
    if (move === "L3") {
      if (ok) {
        return [
          tx("Satu balon membuat angka di samping keranjang bertambah atau berkurang? Jadi satu balon ditulis dengan tanda apa?",
            "Does one balloon make the number beside the basket bigger or smaller? So which sign does one balloon get?"),
          tx("Balon ditulis +8. Karung pasir ditulis berapa? Lengkapi: 8 + (…) = 3.",
            "The balloons are +8. What are the sandbags? Complete it: 8 + (…) = 3."),
          tx("Satu balon dan satu karung pasir: keranjangnya naik, turun, atau tetap? Jadi kenapa 6 balon perlu 6 karung pasir?",
            "One balloon and one sandbag: does the basket go up, down, or stay? So why do 6 balloons need 6 sandbags?"),
        ][qi];
      }
      if (c.k === 0) {
        return [
          tx("Kita coba satu per satu. Tambah 1 balon, SUBMIT, lihat angkanya. Lalu tambah 1 karung pasir, SUBMIT, lihat lagi. Mana yang membuat angkanya bertambah, dan mana yang membuatnya berkurang?",
            "One at a time. Add 1 balloon, SUBMIT, read the number. Then add 1 sandbag, SUBMIT, read it again. Which one makes the number bigger, and which makes it smaller?"),
          tx("Kita pecah jadi dua langkah. Setelah 8 balon, keranjang di angka berapa? Lalu setiap karung pasir menurunkannya satu. Dari sana turun berapa, dan sampai di mana?",
            "Two steps. After 8 balloons, where is the basket? Each sandbag then takes it down one. How far down from there, and where does it end?"),
          tx("Kita pecah. Setelah 6 balon, keranjang di angka berapa? Setiap karung pasir menurunkannya satu. Berapa kali harus turun supaya sampai di 0?",
            "Let's break it down. After 6 balloons, where is the basket? Each sandbag takes it down one. How many steps down to reach 0?"),
        ][qi];
      }
      return [
        tx("Kita lihat balonnya saja dulu. Tambah satu balon, tekan SUBMIT: angka di samping keranjang jadi lebih besar atau lebih kecil?",
          "Just the balloons first. Add one balloon and press SUBMIT: does the number beside the basket get bigger or smaller?"),
        tx("Satu langkah dulu: pasang 8 balon saja dan tekan SUBMIT. Keranjangnya di angka berapa?",
          "One step first: put on the 8 balloons only and press SUBMIT. Where is the basket?"),
        tx("Satu langkah dulu: pasang 6 balon, lalu tambah satu karung pasir dan SUBMIT. Keranjangnya turun ke angka berapa?",
          "One step first: put on 6 balloons, then add one sandbag and press SUBMIT. Where does the basket go down to?"),
      ][qi];
    }
    // L4: the student explains in their own words
    return [
      c.goal
        ? tx("Coba jelaskan lagi dengan kata-katamu sendiri: kenapa balon ditulis positif dan karung pasir negatif?",
          "Explain it once more in your own words: why are balloons written as positive and sandbags as negative?")
        : tx("Kamu melihat ke mana keranjang bergerak. Kalau ditulis sebagai bilangan, satu balon itu bilangan apa, dan satu karung pasir bilangan apa?",
          "You saw which way the basket moves. Written as numbers, what is one balloon, and what is one sandbag?"),
      tx("Bagaimana kamu mendapatkan 3? Ceritakan dengan balon dan karung pasir di aplet, lalu tulis sebagai penjumlahan bilangan bulat.",
        "How did you get 3? Tell me with the balloons and sandbags in the applet, then write it as an integer addition."),
      tx("Kenapa harus 6 karung pasir, bukan 5 atau 7? Jelaskan dengan kata-katamu sendiri.",
        "Why 6 sandbags, and not 5 or 7? Explain it in your own words."),
    ][qi];
  }

  /* ---------------- limits for the AI ---------------- */

  const HELP = { L1: 1, L4: 1, L2: 2, L3: 3, HINT: 4, OK: 0 };

  const KIND_LABEL = tx({
    goal: "jawaban benar + penalaran target", bothNoSign: "dua arah benar, belum dikaitkan dengan tanda", oneSide: "baru satu arah",
    notTried: "belum mencoba aplet", unclear: "belum jelas", howTo: "bertanya cara memakai aplet", why: "bertanya kenapa",
    reasonNoTotal: "penalaran ada, hasil belum", subtraction: "benar, ditulis sebagai pengurangan", answerOnly: "benar, belum ada penalaran",
    stuck: "macet setelah jawaban benar", exprNoTotal: "ada hitungan, hasil belum",
    "wrong:reversed": "salah: arah terbalik", "wrong:addedBoth": "salah: karung pasir ikut ditambahkan", "wrong:signFlip": "salah: tanda hasil terbalik",
    "wrong:ignoredBags": "salah: karung pasir diabaikan", "wrong:restated": "salah: menjawab sisa (0), bukan yang diserap",
    "wrong:doubled": "salah: dua kali lipat", "wrong:half": "salah: setengahnya", "wrong:dontKnow": "belum tahu", "wrong:other": "salah", "wrong:none": "salah",
  }, {
    goal: "correct answer + target reasoning", bothNoSign: "both directions, no sign yet", oneSide: "one direction only",
    notTried: "has not tried the applet", unclear: "unclear", howTo: "asks how to use the applet", why: "asks why",
    reasonNoTotal: "reasoning, no result yet", subtraction: "correct, written as a subtraction", answerOnly: "correct, no reasoning yet",
    stuck: "stuck after a correct answer", exprNoTotal: "calculation, no result yet",
    "wrong:reversed": "wrong: directions reversed", "wrong:addedBoth": "wrong: added the sandbags", "wrong:signFlip": "wrong: sign of the result",
    "wrong:ignoredBags": "wrong: ignored the sandbags", "wrong:restated": "wrong: answered what is left (0), not what is absorbed",
    "wrong:doubled": "wrong: doubled", "wrong:half": "wrong: half", "wrong:dontKnow": "does not know yet", "wrong:other": "wrong", "wrong:none": "wrong",
  });

  /** What the AI may do this turn: the facts, the most help allowed, and the numbers it may use. */
  function limits(res, qi, mem, texts, app) {
    const q = Q[qi];
    const goal = res.move === "OK";
    const maxHelp = goal ? 4 : HELP[res.move] || 1;
    const allow = new Set(q.numbers);
    for (const t of texts) for (const n of numbers(normalise(t))) allow.add(n);
    if (app && app.basket !== null) allow.add(app.basket);
    if (app) { allow.add(app.balloons); allow.add(app.bags); }
    for (const n of numbers(normalise(res.reply))) allow.add(n);   // the scripted move may be paraphrased
    if (res.answerOK || goal) { if (q.answer !== undefined) allow.add(q.answer); }
    if (goal || maxHelp >= 3) { if (qi === 1) { allow.add(-5); allow.add(3); } if (qi === 2) allow.add(-6); }
    const facts = [
      qi === 0
        ? tx("Soal ini menanyakan arah gerak keranjang, bukan angka.", "This question asks about directions, not a number.")
        : tx(`Jawaban akhir siswa: ${res.answerOK ? "sudah benar" : res.reading.total !== null ? `belum benar (siswa menulis ${fmt(res.reading.total)})` : "belum ada"}.`,
          `The student's final answer: ${res.answerOK ? "correct" : res.reading.total !== null ? `not correct yet (wrote ${fmt(res.reading.total)})` : "none yet"}.`),
      tx(`Cara siswa di pesan terakhir: ${KIND_LABEL[res.kind] || res.kind}.`, `The student's way in the last message: ${KIND_LABEL[res.kind] || res.kind}.`),
      goal ? tx("Penalaran target SUDAH muncul dari siswa sendiri. Saatnya konfirmasi akhir.", "The target reasoning HAS come from the student. Time for the final confirmation.")
        : res.goalSeen ? tx("Penalaran target SUDAH muncul dari siswa, tetapi tangga guru belum sampai L4: belum saatnya konfirmasi.", "The target reasoning HAS come from the student, but the teacher's ladder has not reached L4 yet: no confirmation yet.")
        : tx("Penalaran target BELUM muncul dari siswa.", "The target reasoning has NOT come from the student yet."),
      tx(`Percobaan salah sejauh ini: ${mem.wrong}.`, `Wrong attempts so far: ${mem.wrong}.`),
      app ? appletFact(app) : "",
      tx("Langkah yang dipilih aturan untuk giliran ini: ", "The move the rules chose for this turn: ") + res.move + " — " + res.reply,
    ].filter(Boolean);
    // zeroOK/splitOK switch off the temperature task's guards in the worker; this card's own guards are in overreach()
    return { goal, maxHelp, mayConfirm: false, answerOK: !!res.answerOK, zeroOK: true, splitOK: true, allowNumbers: [...allow], facts, target: q.target };
  }

  /** Content check for AI replies: a reply may not give away what the student has to find. */
  function overreach(reply, lim, qi) {
    const t = normalise(reply);
    const c = compact(t);
    const bad = numbers(t).filter((n) => !lim.allowNumbers.includes(n));
    if (bad.length) return "angka " + bad.join(",");
    if (!lim.goal && /\b(benar|salah|betul|tepat|memang|correct|wrong|right|exactly|well done)\b/.test(t)) return "menilai";
    if (!lim.goal && !t.includes("?")) return "tanpa pertanyaan";
    if (lim.goal) return null;
    if (qi === 0 && lim.maxHelp < 4) {
      if (/balon\w*[^.?!]{0,30}(naik|ke ?atas|positif)|balloons?[^.?!]{0,30}(up|positive)/.test(t)) return "memberi arah balon";
      if (/(karung|pasir)[^.?!]{0,30}(turun|ke ?bawah|negatif)|sandbags?[^.?!]{0,30}(down|negative)/.test(t)) return "memberi arah karung";
    }
    if (qi === 1 && lim.maxHelp < 3 && /8\+\(?-5|\(-5\)/.test(c)) return "memberi penjumlahan";
    if (qi === 2) {
      if (lim.maxHelp < 3 && ZERO_PAIR.test(t)) return "memberi alasan pasangan nol";
      if (!lim.allowNumbers.includes(-6) && /6\+\(?-6/.test(c)) return "memberi penjumlahan";
      if (!lim.answerOK && /(6 karung|6 sandbag|menyerap 6|diserap 6|serap 6|absorb 6|6 karbon yang (harus )?diserap)/.test(t)) return "memberi jawaban";
    }
    return null;
  }

  window.GorgaCards = window.GorgaCards || {};
  window.GorgaCards[2] = { Q, read, step, say, opening, setup, appState, limits, overreach, KIND_LABEL, HELP, normalise };
})();
