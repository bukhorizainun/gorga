/* Task card, Algebra Mission 2 "Protecting our planet" (DRAFT for the teacher).
   Water context: W = 3x + 5y + 20 — blue layer students handwashing (3 L each, x), green layer
   trees watered (5 L each, y), orange layer mopping the classroom floor (always 20 L). */
(function () {
  const { make } = window.GorgaCardEngine;
  const I = (id, en) => ({ id, en });
  const BLUE = /(biru|siswa|cuci tangan|mencuci|3x|blue|students?|handwash)/;
  const GREEN = /(hijau|pohon|siram|5y|green|trees?|water(ing)? the)/;
  const ORANGE = /(oranye|orange|jingga|mengepel|\bpel\b|lantai|mop|floor|konstanta|constant|\b20\b)/;

  function amount(skip) {
    return (t, raw, correct) => {
      const cands = [];
      for (const m of t.match(/(bertambah|naik|tambah|nambah|berubah|lebih|plus|\+|=|jadi|sebanyak|increases? by|goes up by|changes by|by|is)\s*(\d+)/g) || []) cands.push(Number(m.match(/\d+/)[0]));
      if (cands.length) return cands.find((x) => correct && correct(x)) ?? cands[cands.length - 1];
      const ns = (t.match(/\d+/g) || []).map(Number).filter((x) => !skip.includes(x));
      return ns.length === 1 ? ns[0] : null;
    };
  }

  function appState(api) {
    try {
      const v = (n) => Number(api.getValue(n));
      const w = parseInt(String(api.getValueString("teksTotal")).replace(/[^\d]+/g, " ").trim().split(" ")[0], 10);
      return { used: true, x: v("nx"), y: v("ny"), W: Number.isFinite(w) ? w : null };
    } catch { return { used: true }; }
  }

  make(9, {
    appState,
    howTo: I("Tekan ➕ atau ➖ di samping siswa (x) dan pohon (y), lalu lihat lapisan warna di meteran air. Apa yang berubah?",
      "Press ➕ or ➖ beside the students (x) and the trees (y), then look at the coloured layers in the water meter. What changes?"),
    questions: [
      { // 1: x + 1 -> blue layer +3
        opening: I("Saat x naik 1, lapisan mana yang berubah? Berapa?", "When x goes up by 1, which layer changes? By how much?"),
        target: I("Lapisan biru (siswa mencuci tangan) bertambah 3 liter.", "The blue layer (students handwashing) goes up by 3 litres."),
        claim: amount([1]), correct: (x) => x === 3, answerNumbers: [3],
        reasons: [{ name: "lapisan siswa/biru", re: BLUE }], need: 1,
        wrong: [{ test: (x, t) => BLUE.test(t) && x !== 3, kind: "misreadBlue", label: I("salah baca: lapisan benar, angka keliru", "misread: right layer, wrong amount"),
          l2: I("Kamu sudah melihat lapisan biru. Baca labelnya sebelum dan sesudah kamu menekan ➕ di samping siswa: dari berapa liter ke berapa?", "You found the blue layer. Read its label before and after you press ➕ beside the students: from how many litres to how many?") },
        { test: (x, t) => x === 5 && !BLUE.test(t), kind: "otherLayer", label: I("salah: melihat lapisan lain", "wrong: looked at another layer"),
          l2: I("Lihat lagi lapisan mana yang bertambah tinggi saat kamu menekan ➕ di samping siswa.", "Look again at which layer grows when you press ➕ beside the students.") }],
        l2: [I("Tekan ➕ di samping siswa satu kali. Lapisan warna apa yang bertambah tinggi di meteran?", "Press ➕ beside the students once. Which colour layer grows in the meter?")],
        l3: [I("Lihat label lapisan biru sebelum dan sesudah kamu menekan ➕. Dari berapa liter ke berapa?", "Read the blue layer's label before and after you press ➕. From how many litres to how many?")],
        l4: I("Kenapa bertambah segitu? Hubungkan dengan cerita di aplet.", "Why does it grow by that much? Connect it with the story in the applet."),
        confirm: I("Benar, seperti pengamatanmu: lapisan siswa (biru) bertambah 3 liter.", "Correct, as you observed: the students' (blue) layer grows by 3 litres."),
        numbers: [1],
        forbid: [{ re: /(biru.{0,30}3|3 liter|blue.{0,30}3|3 litres)/, until: "answer", why: "memberi jawaban" }],
      },
      { // 2: y + 1 -> green layer +5
        opening: I("Saat y naik 1, lapisan mana yang berubah? Berapa?", "When y goes up by 1, which layer changes? By how much?"),
        target: I("Lapisan hijau (pohon disiram) bertambah 5 liter.", "The green layer (trees watered) goes up by 5 litres."),
        claim: amount([1]), correct: (x) => x === 5, answerNumbers: [5],
        reasons: [{ name: "lapisan pohon/hijau", re: GREEN }], need: 1,
        wrong: [{ test: (x, t) => GREEN.test(t) && x !== 5, kind: "misreadGreen", label: I("salah baca: lapisan benar, angka keliru", "misread: right layer, wrong amount"),
          l2: I("Kamu sudah melihat lapisan hijau. Baca labelnya sebelum dan sesudah kamu menekan ➕ di samping pohon: dari berapa liter ke berapa?", "You found the green layer. Read its label before and after you press ➕ beside the trees: from how many litres to how many?") },
        { test: (x, t) => x === 3 && !GREEN.test(t), kind: "otherLayer", label: I("salah: melihat lapisan lain", "wrong: looked at another layer"),
          l2: I("Kali ini yang berubah pohonnya, bukan siswa. Lapisan mana yang bertambah saat kamu menekan ➕ di samping pohon?", "This time the trees change, not the students. Which layer grows when you press ➕ beside the trees?") }],
        l2: [I("Tekan ➕ di samping pohon satu kali. Lapisan warna apa yang bertambah tinggi?", "Press ➕ beside the trees once. Which colour layer grows?")],
        l3: [I("Baca label lapisan hijau sebelum dan sesudah kamu menekan ➕. Dari berapa liter ke berapa?", "Read the green layer's label before and after you press ➕. From how many litres to how many?")],
        l4: I("Kenapa bertambah segitu? Hubungkan dengan cerita di aplet.", "Why does it grow by that much? Connect it with the story in the applet."),
        confirm: I("Benar, seperti pengamatanmu: lapisan pohon (hijau) bertambah 5 liter.", "Correct, as you observed: the trees' (green) layer grows by 5 litres."),
        numbers: [1],
        forbid: [{ re: /(hijau.{0,30}5|5 liter|green.{0,30}5|5 litres)/, until: "answer", why: "memberi jawaban" }],
      },
      { // 3: the layer that never changes
        opening: I("Lapisan mana yang tidak pernah berubah? Bagaimana kamu tahu?", "Which layer never changes? How do you know?"),
        target: I("Lapisan oranye (mengepel lantai kelas), selalu 20 liter berapa pun x dan y.", "The orange layer (mopping the classroom floor), always 20 litres whatever x and y are."),
        reasons: [{ name: "lapisan tetap/oranye", re: ORANGE }, { name: "tidak bergantung x dan y", re: /(berapa pun|apapun|tidak (ikut|pernah)? ?berubah|tetap|selalu|tidak (bergantung|tergantung)|whatever|always|never changes|stays|same)/ }],
        need: 2,
        l2: [I("Tekan ➕ dan ➖ untuk x lalu untuk y. Perhatikan lapisan yang tingginya tidak ikut bergerak.", "Press ➕ and ➖ for x, then for y. Watch for the layer whose height does not move.")],
        l3: [I("Saat kamu mengubah x, lapisan oranye berubah atau tidak? Dan saat mengubah y?", "When you change x, does the orange layer change? And when you change y?")],
        more: I("Lapisan itu yang mana, dan apakah ia berubah saat x atau y berubah?", "Which layer is it, and does it change when x or y changes?"),
        confirm: I("Benar, seperti pengamatanmu: lapisan mengepel lantai tetap 20 liter.", "Correct, as you observed: the mopping layer stays at 20 litres."),
        numbers: [],
        forbid: [{ re: /(oranye|orange|mengepel|mopping|\b20\b)/, why: "memberi jawaban" }],
      },
      { // 4: write W and explain each part
        opening: I("Berdasarkan perubahan di meteran, tuliskan ekspresi aljabar untuk total air W. Jelaskan arti setiap bagiannya.",
          "From the changes on the meter, write an algebraic expression for the total water W. Explain what each part means."),
        target: I("W = 3x + 5y + 20: 3x air cuci tangan siswa (3 L tiap siswa), 5y air siram pohon (5 L tiap pohon), 20 air mengepel yang tetap.",
          "W = 3x + 5y + 20: 3x handwashing (3 L per student), 5y watering trees (5 L per tree), 20 the fixed mopping water."),
        reasons: [
          { name: "ekspresi 3x + 5y + 20", re: /(3x\s*\+\s*5y\s*\+\s*20|5y\s*\+\s*3x\s*\+\s*20|20\s*\+\s*3x\s*\+\s*5y|w\s*=\s*3x)/ },
          { name: "arti 3x", re: /(3x.{0,40}(siswa|cuci|tangan|students?|handwash)|(siswa|students?).{0,40}3x)/ },
          { name: "arti 5y", re: /(5y.{0,40}(pohon|siram|trees?)|(pohon|trees?).{0,40}5y)/ },
          { name: "arti 20", re: /(20.{0,40}(tetap|konstan|pel|lantai|mop|floor|fixed|constant|always)|(tetap|konstan|constant).{0,30}20)/ },
        ],
        need: 3,
        l2: [I("Lihat ketiga lapisan di meteran. Lapisan biru bergantung pada apa? Lapisan hijau? Lapisan oranye?", "Look at the three layers in the meter. What does the blue layer depend on? The green? The orange?")],
        l3: [I("Mulai dari satu bagian: berapa liter air cuci tangan untuk x siswa?", "Start with one part: how many litres of handwashing water for x students?")],
        more: I("Bagus. Bagian mana yang belum kamu tulis atau jelaskan?", "Good. Which part have you not written or explained yet?"),
        confirm: I("Benar, seperti penjelasanmu: W = 3x + 5y + 20, dengan arti tiap bagian yang kamu sebutkan.", "Correct, as you explained: W = 3x + 5y + 20, with the meaning of each part you gave."),
        numbers: [],
        forbid: [{ re: /(3x\s*\+\s*5y|5y\s*\+\s*20|w\s*=)/, why: "memberi ekspresi" }],
      },
      { // 5: 4 more students, trees the same -> +12 litres
        opening: I("Jika siswa yang mencuci tangan bertambah 4 orang dan pohonnya tetap, bagaimana perubahan total air? Jelaskan tanpa menghitung ulang semuanya.",
          "If 4 more students wash their hands and the trees stay the same, how does the total water change? Explain without recalculating everything."),
        target: I("Bertambah 12 liter: hanya bagian 3x yang berubah, 4 × 3 = 12; bagian 5y dan 20 tetap.", "It goes up by 12 litres: only the 3x part changes, 4 × 3 = 12; 5y and 20 stay the same."),
        claim: amount([4]), correct: (x) => x === 12, answerNumbers: [12],
        reasons: [
          { name: "4 × 3", re: /(4\s*[x×*·]\s*3|3\s*[x×*·]\s*4|3 liter.{0,30}4|4.{0,30}3 liter|3x)/ },
          { name: "bagian lain tetap", re: /((pohon|5y|20|lainnya|yang lain).{0,30}(tetap|tidak berubah|sama)|(trees?|5y|20|the rest).{0,30}(same|unchanged|don'?t change))/ },
        ],
        need: 2,
        wrong: [
          { test: (x) => x === 4, kind: "countedStudents", label: I("salah: menyebut tambahan siswa, bukan air", "wrong: gave the extra students, not the water"),
            l2: I("Itu tambahan siswanya. Tiap siswa memakai berapa liter?", "That is the extra students. How many litres does each student use?") },
          { test: (x) => x === 7, kind: "added", label: I("salah: menjumlah 4 + 3", "wrong: added 4 + 3"),
            l2: I("Tiap siswa memakai 3 liter. Kalau 2 siswa tambahan, airnya bertambah berapa?", "Each student uses 3 litres. For 2 extra students, how much more water?") },
          { test: (x) => x === 32 || x === 37, kind: "recalculated", label: I("salah: ikut menambah bagian yang tetap", "wrong: added the parts that stay the same"),
            l2: I("Bagian mana saja di W yang berubah kalau hanya siswanya yang bertambah?", "Which parts of W change if only the students increase?") },
        ],
        l2: [I("Di aplet, tekan ➕ siswa 4 kali. Lapisan mana yang berubah, dan berapa?", "In the applet, press ➕ for students 4 times. Which layer changes, and by how much?")],
        l3: [I("Satu siswa tambahan menambah berapa liter? Lalu 4 siswa?", "One extra student adds how many litres? And 4 students?")],
        l4: I("Jelaskan kenapa bertambah segitu, dan bagian W mana yang tidak berubah.", "Explain why it grows by that much, and which parts of W do not change."),
        confirm: I("Benar, seperti penjelasanmu: hanya bagian 3x yang berubah, 4 × 3 = 12 liter.", "Correct, as you explained: only the 3x part changes, 4 × 3 = 12 litres."),
        numbers: [4, 3, 5, 20],
        forbid: [{ re: /(\b12\b|4\s*[x×*]\s*3|3\s*[x×*]\s*4)/, until: "answer", why: "memberi jawaban" }],
      },
      { // 6: why 20 does not change
        opening: I("Dalam W = 3x + 5y + 20, mengapa bilangan 20 tidak berubah ketika x atau y berubah?", "In W = 3x + 5y + 20, why does 20 not change when x or y changes?"),
        target: I("20 adalah konstanta: tidak dikalikan dengan x atau y, jadi tidak bergantung pada banyak siswa atau pohon; artinya air mengepel lantai yang selalu sama.",
          "20 is a constant: it is not multiplied by x or y, so it does not depend on the number of students or trees; it is the mopping water, always the same."),
        reasons: [
          { name: "tidak bergantung x atau y", re: /(tidak (ada|punya|dikali|dikalikan|bergantung|tergantung).{0,20}(x|y|variabel|siswa|pohon)|tanpa (x|y|variabel)|konstanta|constant|not (multiplied|depend)|no (x|y|variable)|independent)/ },
          { name: "arti konteks (mengepel)", re: /(mengepel|\bpel\b|lantai|mop|floor|selalu sama|tiap hari sama|always the same)/ },
        ],
        need: 2,
        l2: [I("Lihat suku 3x dan 5y. Apa yang ada pada keduanya, tapi tidak ada pada 20?", "Look at the terms 3x and 5y. What do both have that 20 does not?")],
        l3: [I("Di cerita aplet, 20 liter itu dipakai untuk apa? Apakah itu bergantung pada banyak siswa?", "In the applet's story, what are the 20 litres used for? Do they depend on the number of students?")],
        more: I("Itu satu alasan. Apa arti 20 liter itu dalam cerita di aplet?", "That is one reason. What do those 20 litres mean in the applet's story?"),
        confirm: I("Benar, seperti alasanmu: 20 tidak bergantung pada x atau y, karena itu air mengepel yang selalu sama.", "Correct, as you reasoned: 20 does not depend on x or y, because it is the mopping water that is always the same."),
        numbers: [20, 3, 5],
        forbid: [{ re: /(konstanta|constant|mengepel|mopping)/, why: "memberi alasan" }],
      },
    ],
  });
})();
