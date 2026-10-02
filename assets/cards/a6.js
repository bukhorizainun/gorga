/* Task card, Applet 6 "Reforestation planning" (DRAFT for the teacher to confirm).
   Seedlings for one whole area = seedlings ÷ fraction of the area:
   4 ÷ 1 1/3 = 3;  40 ÷ 5/8 = 64;  34 ÷ 5 2/3 = 6. */
(function () {
  const { make } = window.GorgaCardEngine;
  const I = (id, en) => ({ id, en });

  // The number of seedlings the student gives: after "=", "jadi", "butuh", or the only new number.
  function seedlings(known) {
    return (t, raw, correct) => {
      // candidates: a leading number, and numbers after "=", "jadi", "butuh"...; a correct one wins,
      // because the rest may be steps of the student's reasoning
      const cands = [];
      const lead = t.match(/^(\d+(?:[.,]\d+)?)/);
      if (lead) cands.push(Number(lead[1].replace(",", ".")));
      for (const m of t.match(/(=|jadi|butuh|perlu|diperlukan|dibutuhkan|hasil(nya)?|need(s|ed)?|is|so)\s*(\d+(?:[.,]\d+)?)/g) || []) {
        cands.push(Number(m.match(/\d+(?:[.,]\d+)?/)[0].replace(",", ".")));
      }
      if (cands.length) return cands.find((x) => correct && correct(x)) ?? cands[cands.length - 1];
      const ns = (t.replace(/(\d),(\d)/g, "$1.$2").match(/\d+(\.\d+)?/g) || []).map(Number).filter((x) => !known.includes(x));
      return ns.length === 1 ? ns[0] : /^\d+([.,]\d+)?$/.test(t) ? Number(t.replace(",", ".")) : null;
    };
  }
  const near = (a, b) => Math.abs(a - b) < 0.05;
  // L2 may point at a feature but may not name the operation before the student finds it.
  const DIVIDE_WORD = { re: /(membagi|dibagi|\bbagi\b|pembagian|divide|division)/, until: "answer", why: "memberi operasi" };

  make(6, {
    howTo: I("Isi kotak di aplet, lalu tekan FILL BOX untuk melihat model pecahannya. Apa yang kamu lihat?", "Type in the box, then press FILL BOX to see the fraction model. What do you see?"),
    questions: [
      { // 1: 4 seedlings for 1 1/3 -> 3
        opening: I("4 bibit cukup untuk 1⅓ bagian area. Berapa bibit untuk 1 bagian area, dan bagaimana kamu menemukannya?",
          "4 seedlings are enough for 1⅓ of an area. How many seedlings for 1 whole area, and how did you find it?"),
        target: I("3 bibit: 1⅓ = 4/3, jadi tiap ⅓ bagian butuh 1 bibit, dan 1 bagian = 3/3 butuh 3 (atau 4 ÷ 4/3 = 3).",
          "3 seedlings: 1⅓ = 4/3, so each ⅓ needs 1 seedling, and 1 whole = 3/3 needs 3 (or 4 ÷ 4/3 = 3)."),
        claim: seedlings([4, 1]), correct: (x) => near(x, 3), answerNumbers: [3],
        reasons: [
          { name: "per sepertiga", re: /((1\/3|sepertiga|third).{0,30}1 bibit|1 bibit.{0,30}(1\/3|sepertiga|third)|tiap (1\/3|sepertiga)|setiap (1\/3|sepertiga)|4\/3|empat pertiga|each third)/ },
          { name: "membagi", re: /(4\s*[:÷/]\s*(1 ?1\/3|4\/3|1[.,]33)|4\s*[x×*]\s*3\/4|dibagi|bagi|divide)/ },
        ],
        need: 1,
        wrong: [
          { test: (x) => near(x, 16 / 3) || near(x, 5.3) || x === 5, kind: "multiplied", label: I("salah: mengalikan, bukan membagi", "wrong: multiplied instead of divided"),
            l2: I("Satu bagian area itu lebih kecil atau lebih besar dari 1⅓ bagian? Jadi bibitnya lebih banyak atau lebih sedikit dari 4?", "Is one whole area smaller or bigger than 1⅓? So more or fewer seedlings than 4?") },
          { test: (x) => x === 12, kind: "timesThree", label: I("salah: mengalikan dengan 3", "wrong: multiplied by 3"),
            l2: I("Lihat model di aplet: 1⅓ bagian terdiri dari berapa potongan sepertiga?", "Look at the model: how many thirds make 1⅓?") },
        ],
        l2: [I("Di model aplet, 1⅓ bagian terdiri dari berapa potongan sepertiga? Dan 4 bibit dibagi ke potongan-potongan itu?", "In the applet's model, how many thirds make 1⅓? And how are the 4 seedlings shared over them?")],
        l3: [I("Kalau 4 bibit untuk 4 potongan sepertiga, satu potongan sepertiga butuh berapa bibit?", "If 4 seedlings cover 4 thirds, how many seedlings for one third?")],
        l4: I("Bagaimana kamu mendapatkan 3? Jelaskan dengan potongan-potongan bagian areanya.", "How did you get 3? Explain it with the pieces of the area."),
        confirm: I("Benar, seperti caramu: 4 bibit untuk 1⅓ bagian berarti 3 bibit untuk 1 bagian.", "Correct, as you worked it out: 4 seedlings for 1⅓ means 3 seedlings for one whole."),
        numbers: [4, 1, 3],
        forbid: [{ re: /(\b3 bibit|3 seedlings|= ?3\b)/, until: "answer", why: "memberi jawaban" }, DIVIDE_WORD],
      },
      { // 2: 40 seedlings for 5/8 -> 64
        opening: I("40 bibit cukup untuk ⅝ taman kota. Jelaskan bagaimana kamu menentukan bibit untuk seluruh taman.",
          "40 seedlings are enough for ⅝ of a city park. Explain how you find the seedlings for the whole park."),
        target: I("64 bibit: ⅛ taman butuh 40 ÷ 5 = 8 bibit, jadi 8/8 butuh 8 × 8 = 64 (atau 40 ÷ ⅝ = 64).",
          "64 seedlings: ⅛ of the park needs 40 ÷ 5 = 8, so 8/8 needs 8 × 8 = 64 (or 40 ÷ ⅝ = 64)."),
        claim: seedlings([40, 5, 8]), correct: (x) => x === 64, answerNumbers: [64],
        reasons: [
          { name: "per seperdelapan", re: /(40\s*[:÷/]\s*5\b|8 bibit|seperdelapan|1\/8|eighth)/ },
          { name: "dibagi pecahan / dikali", re: /(40\s*[:÷/]\s*5\/8|40\s*[x×*]\s*8\/5|8\s*[x×*]\s*8|dibagi|bagi|divide)/ },
        ],
        need: 1,
        wrong: [
          { test: (x) => x === 25, kind: "multiplied", label: I("salah: mengalikan dengan ⅝", "wrong: multiplied by ⅝"),
            l2: I("Seluruh taman lebih besar atau lebih kecil dari ⅝ taman? Jadi bibitnya lebih banyak atau lebih sedikit dari 40?", "Is the whole park bigger or smaller than ⅝ of it? So more or fewer seedlings than 40?") },
          { test: (x) => x === 8, kind: "stoppedAtEighth", label: I("salah: berhenti di ⅛", "wrong: stopped at one eighth"),
            l2: I("8 bibit itu untuk berapa bagian taman? Seluruh taman ada berapa bagian seperdelapan?", "Those 8 seedlings are for which part of the park? How many eighths make the whole park?") },
          { test: (x) => x === 320, kind: "timesEight", label: I("salah: mengalikan 40 dengan 8", "wrong: multiplied 40 by 8"),
            l2: I("40 bibit itu untuk 5 potongan seperdelapan, bukan 1. Satu potongan butuh berapa bibit?", "Those 40 seedlings are for 5 eighths, not 1. How many for one eighth?") },
        ],
        l2: [I("⅝ taman terdiri dari berapa potongan seperdelapan? 40 bibit dibagi ke potongan-potongan itu.", "How many eighths make ⅝ of the park? The 40 seedlings are shared over them.")],
        l3: [I("Kalau 40 bibit untuk 5 potongan, satu potongan seperdelapan butuh berapa bibit?", "If 40 seedlings cover 5 pieces, how many for one eighth?"), I("Satu seperdelapan butuh 8 bibit. Seluruh taman ada 8 potongan seperdelapan. Berapa bibitnya?", "One eighth needs 8 seedlings. The whole park has 8 eighths. How many seedlings?")],
        l4: I("Bagaimana kamu mendapatkan 64? Jelaskan langkahnya dengan potongan seperdelapan.", "How did you get 64? Explain the steps with the eighths."),
        confirm: I("Benar, seperti caramu: dari 40 bibit untuk ⅝ taman, seluruh taman butuh 64 bibit.", "Correct, as you worked it out: from 40 seedlings for ⅝, the whole park needs 64."),
        numbers: [40, 5, 8],
        forbid: [{ re: /(\b64\b|8\s*[x×*]\s*8)/, until: "answer", why: "memberi jawaban" }, DIVIDE_WORD],
      },
      { // 3: 34 seedlings for 5 2/3 -> 6
        opening: I("34 bibit cukup untuk 5⅔ bagian hutan kota. Jelaskan bagaimana kamu menentukan bibit untuk satu bagian.",
          "34 seedlings are enough for 5⅔ parts of a city forest. Explain how you find the seedlings for one part."),
        target: I("6 bibit: 5⅔ = 17/3, tiap ⅓ butuh 34 ÷ 17 = 2 bibit, jadi 1 bagian = 3/3 butuh 6 (atau 34 ÷ 17/3 = 6).",
          "6 seedlings: 5⅔ = 17/3, each ⅓ needs 34 ÷ 17 = 2, so one part = 3/3 needs 6 (or 34 ÷ 17/3 = 6)."),
        claim: seedlings([34, 5, 2, 3, 17]), correct: (x) => near(x, 6), answerNumbers: [6],
        reasons: [
          { name: "5⅔ = 17/3", re: /(17\/3|17 (potong|bagian)|tujuh belas pertiga|seventeen thirds)/ },
          { name: "per sepertiga", re: /(34\s*[:÷/]\s*17|2 bibit|tiap (1\/3|sepertiga)|setiap (1\/3|sepertiga)|each third|per third)/ },
          { name: "membagi", re: /(34\s*[:÷/]\s*(17\/3|5 ?2\/3)|34\s*[x×*]\s*3\/17|dibagi|bagi|divide)/ },
        ],
        need: 2,
        wrong: [
          { test: (x) => x > 34, kind: "multiplied", label: I("salah: mengalikan, bukan membagi", "wrong: multiplied instead of divided"),
            l2: I("Satu bagian hutan lebih kecil dari 5⅔ bagian. Jadi bibitnya lebih banyak atau lebih sedikit dari 34?", "One part is smaller than 5⅔ parts. So more or fewer seedlings than 34?") },
          { test: (x) => near(x, 6.8) || near(x, 34 / 5), kind: "ignoredFraction", label: I("salah: mengabaikan ⅔", "wrong: ignored the ⅔"),
            l2: I("Kamu membagi dengan 5. Bagaimana dengan ⅔ bagiannya?", "You divided by 5. What about the ⅔?") },
        ],
        l2: [I("5⅔ bagian itu sama dengan berapa potongan sepertiga?", "How many thirds make 5⅔?")],
        l3: [I("Kalau 34 bibit untuk 17 potongan sepertiga, satu potongan butuh berapa bibit?", "If 34 seedlings cover 17 thirds, how many for one third?"), I("Satu sepertiga butuh 2 bibit. Satu bagian ada 3 potongan sepertiga. Berapa bibitnya?", "One third needs 2 seedlings. One part has 3 thirds. How many seedlings?")],
        l4: I("Bagaimana kamu mendapatkan 6? Jelaskan langkahnya dengan potongan sepertiga.", "How did you get 6? Explain the steps with the thirds."),
        confirm: I("Benar, seperti caramu: dari 34 bibit untuk 5⅔ bagian, satu bagian butuh 6 bibit.", "Correct, as you worked it out: from 34 seedlings for 5⅔ parts, one part needs 6."),
        numbers: [34, 5, 2, 3],
        forbid: [{ re: /(\b6 bibit|6 seedlings|= ?6\b)/, until: "answer", why: "memberi jawaban" }, { re: /17\/3/, until: "answer", why: "memberi langkah kunci" }, DIVIDE_WORD],
      },
      { // 4: reflection
        opening: I("Mengapa perencanaan yang tepat penting dalam penanaman pohon untuk aksi iklim?", "Why is careful planning important when planting trees for climate action?"),
        target: I("Dua ide yang masuk akal, misalnya: bibit tidak kurang/berlebih, hemat biaya dan tenaga, lebih banyak karbon terserap, ekosistem pulih.",
          "Two sensible ideas, for example: no shortage or waste of seedlings, saving cost and effort, more carbon absorbed, the ecosystem recovers."),
        reasons: [
          { name: "tidak kurang/berlebih", re: /(tidak (kurang|lebih|terbuang|sia)|kekurangan|kelebihan|terbuang|boros|hemat|cukup|waste|shortage|enough|too (many|few))/ },
          { name: "biaya/tenaga/waktu", re: /(biaya|dana|uang|waktu|tenaga|sumber daya|cost|money|time|effort|resources)/ },
          { name: "karbon/iklim", re: /(karbon|co2|iklim|menyerap|carbon|climate|absorb)/ },
          { name: "ekosistem", re: /(ekosistem|hutan|lingkungan|habitat|ecosystem|forest|environment)/ },
        ],
        need: 2,
        l2: [I("Ingat soal-soal tadi: apa yang terjadi kalau jumlah bibitnya kurang, atau terlalu banyak?", "Think back to the questions: what happens if there are too few seedlings, or too many?")],
        l3: [I("Kalau bibitnya kurang, apa akibatnya bagi area yang ingin dihijaukan?", "If there are too few seedlings, what happens to the area that should turn green?")],
        more: I("Itu masuk akal. Apa lagi alasan pentingnya perencanaan?", "That makes sense. What else makes planning important?"),
        confirm: I("Benar, alasanmu masuk akal dan kamu menjelaskannya sendiri.", "Correct, your reasons make sense and you explained them yourself."),
        numbers: [],
        forbid: [],
      },
    ],
  });
})();
