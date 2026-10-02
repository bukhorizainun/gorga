/* Task card, Algebra Mission 1 "Find the pattern, discover the expression" (DRAFT for the teacher).
   Handwashing: every student uses 3 litres; the applet shows the number of students, the water
   meter and a table. Expression: 3x. */
(function () {
  const { make } = window.GorgaCardEngine;
  const I = (id, en) => ({ id, en });
  const MULT = /(3\s*[x×*·]\s*x|x\s*[x×*·]\s*3|\b3x\b|dikali(kan)?\s*(dengan\s*)?3|kali(kan)?\s*3|3\s*kali|tiga kali|times 3|3 times|multipl)/;

  function amount(skip) {
    return (t, raw, correct) => {
      const cands = [];
      for (const m of t.match(/(bertambah|naik|tambah|nambah|lebih|plus|\+|=|jadi|adalah|increases? by|goes up by|is|so)\s*(\d+)/g) || []) cands.push(Number(m.match(/\d+/)[0]));
      const lead = t.match(/^(\d+)/);
      if (lead) cands.unshift(Number(lead[1]));
      if (cands.length) return cands.find((x) => correct && correct(x)) ?? cands[cands.length - 1];
      const ns = (t.match(/\d+/g) || []).map(Number).filter((x) => !skip.includes(x));
      return ns.length === 1 ? ns[0] : null;
    };
  }

  function appState(api) {
    try {
      const n = parseInt(String(api.getValueString("stN")).replace(/\D+/g, " ").trim().split(" ").pop(), 10);
      const w = parseInt(String(api.getValueString("teksW1")).replace(/[^\d]+/g, " ").trim().split(" ")[0], 10);
      return { used: n > 0, students: Number.isFinite(n) ? n : null, water: Number.isFinite(w) ? w : null };
    } catch { return { used: true }; }
  }

  make(8, {
    appState,
    howTo: I("Tekan ➕ untuk menambah siswa dan ➖ untuk mengurangi. Lalu lihat meteran air dan tabelnya. Apa yang berubah?",
      "Press ➕ to add a student and ➖ to take one away. Then look at the water meter and the table. What changes?"),
    questions: [
      { // 1: one more student -> +3 litres
        opening: I("Ubah jumlah siswa beberapa kali. Apa yang terjadi pada jumlah air ketika siswa bertambah satu?", "Change the number of students a few times. What happens to the water when one more student is added?"),
        target: I("Air selalu bertambah 3 liter untuk setiap tambahan satu siswa (pola tetap).", "The water always goes up by 3 litres for each extra student (a constant pattern)."),
        claim: amount([1]), correct: (x) => x === 3, answerNumbers: [3],
        reasons: [{ name: "pola tetap tiap siswa", re: /(selalu|setiap|tiap|terus|konstan|tetap|sama|pola|always|every|each|pattern|constant|same)/ }],
        need: 1,
        wrong: [
          { test: (x) => x === 1, kind: "countedStudents", label: I("salah: menyebut tambahan siswa, bukan air", "wrong: gave the extra student, not the water"),
            l2: I("Itu tambahan siswanya. Lihat meteran air: angkanya berubah dari berapa ke berapa?", "That is the extra student. Look at the water meter: from what to what does it change?") },
        ],
        l2: [I("Tambah satu siswa lalu lihat meteran air. Dari berapa liter ke berapa liter?", "Add one student and look at the water meter. From how many litres to how many?")],
        l3: [I("Di tabel, berapa liter untuk 1 siswa, dan berapa untuk 2 siswa?", "In the table, how many litres for 1 student, and for 2?")],
        l4: I("Apakah selalu bertambah segitu setiap kali satu siswa ditambah? Cek di tabel, lalu jelaskan.", "Does it always go up by that much each time one student is added? Check the table and explain."),
        confirm: I("Benar, seperti pengamatanmu: setiap tambahan satu siswa, air bertambah 3 liter.", "Correct, as you observed: each extra student adds 3 litres of water."),
        numbers: [1, 0],
        forbid: [{ re: /(bertambah 3|naik 3|\+ ?3 liter|3 liter (lebih|tambahan)|up by 3|adds? 3)/, until: "answer", why: "memberi jawaban" }],
      },
      { // 2: x students -> 3 times x
        opening: I("Jika ada x siswa dan tiap siswa memakai 3 liter air, bagaimana kamu menentukan jumlah airnya tanpa menghitung satu per satu?",
          "If there are x students and each uses 3 litres, how can you find the total water without counting one by one?"),
        target: I("Kalikan banyak siswa dengan 3: 3 × x = 3x.", "Multiply the number of students by 3: 3 × x = 3x."),
        reasons: [{ name: "mengalikan dengan 3", re: MULT }, { name: "terkait banyak siswa", re: /(siswa|murid|anak|\bx\b|students?|pupils?)/ }],
        need: 2,
        l2: [I("Lihat tabelnya: untuk 4 siswa ada berapa liter? Untuk 5 siswa? Apa hubungan kedua angka di tiap baris?", "Look at the table: how many litres for 4 students? For 5? How are the two numbers in each row related?")],
        l3: [I("Kalau 10 siswa masing-masing memakai 3 liter, bagaimana kamu menghitungnya dengan satu operasi?", "If 10 students each use 3 litres, how would you work it out with one operation?")],
        more: I("Coba tulis caramu sebagai ekspresi dengan x.", "Try writing your way as an expression with x."),
        confirm: I("Benar, seperti caramu: banyak siswa dikali 3, yaitu 3x.", "Correct, as you put it: the number of students times 3, that is 3x."),
        numbers: [3, 4, 5, 10],
        forbid: [{ re: /(\b3x\b|3\s*[x×*]\s*x|x\s*[x×*]\s*3)/, why: "memberi ekspresi" }],
      },
      { // 3: meaning of 3 and x in 3x
        opening: I("Dalam ekspresi 3x, apa arti 3 dan apa arti x dalam konteks penggunaan air?", "In the expression 3x, what do 3 and x mean for the water use?"),
        target: I("3 = liter air untuk setiap siswa; x = banyak siswa.", "3 = litres of water per student; x = the number of students."),
        reasons: [
          { name: "3 = liter per siswa", re: /(3.{0,30}(liter|\bl\b).{0,30}(per|tiap|setiap|untuk|masing|each|a|every)|(liter|air).{0,20}(per|tiap|setiap|masing) (siswa|anak|murid)|litres? (per|for each|each) student)/ },
          { name: "x = banyak siswa", re: /(x.{0,25}(banyak|jumlah|banyaknya)?\s*(siswa|murid|anak|orang)|(banyak|jumlah) (siswa|murid|anak)|x.{0,25}(number of )?(students?|pupils?|people))/ },
        ],
        need: 2,
        l2: [I("Lihat cerita di aplet: siapa yang memakai 3 liter air?", "Look at the story in the applet: who uses 3 litres of water?")],
        l3: [I("Kalau x = 4, berapa siswanya? Dan apa yang kamu kalikan dengan 3?", "If x = 4, how many students is that? And what do you multiply by 3?")],
        more: I("Kamu sudah menjelaskan satu bagian. Bagaimana dengan bagian yang satunya?", "You explained one part. What about the other?"),
        confirm: I("Benar, seperti penjelasanmu: 3 adalah liter air tiap siswa, dan x adalah banyak siswa.", "Correct, as you explained: 3 is the litres per student, and x is the number of students."),
        numbers: [3, 4],
        forbid: [{ re: /(liter (per|tiap|setiap) siswa|x (adalah|itu|berarti) (banyak|jumlah) siswa|litres? per student|x (is|means) the number of students)/, why: "memberi arti" }],
      },
      { // 4: predict 12 students -> 36 litres
        opening: I("Tanpa mengubah aplet dulu, prediksikan berapa liter air untuk 12 siswa. Jelaskan caramu, lalu cek dengan aplet.",
          "Without changing the applet first, predict how many litres 12 students would use. Explain how, then check with the applet."),
        target: I("36 liter, karena 3 × 12 = 36 (memakai ekspresi 3x dengan x = 12).", "36 litres, because 3 × 12 = 36 (using 3x with x = 12)."),
        claim: amount([12]), correct: (x) => x === 36, answerNumbers: [36],
        reasons: [{ name: "3 × 12", re: /(3\s*[x×*·]\s*12|12\s*[x×*·]\s*3|3x|x\s*=\s*12|dikali(kan)?\s*3|kali 3|times 3|multipl)/ }],
        need: 1,
        wrong: [
          { test: (x) => x === 15, kind: "added", label: I("salah: menjumlah 12 + 3", "wrong: added 12 + 3"),
            l2: I("Tiap siswa memakai 3 liter. Kalau ada 2 siswa, berapa liter? Apakah itu 2 + 3?", "Each student uses 3 litres. With 2 students, how many litres? Is that 2 + 3?") },
          { test: (x) => x === 4, kind: "divided", label: I("salah: membagi 12 dengan 3", "wrong: divided 12 by 3"),
            l2: I("Lebih banyak siswa berarti lebih banyak air. Untuk 12 siswa, airnya lebih dari 12 liter atau kurang?", "More students means more water. For 12 students, is it more or less than 12 litres?") },
        ],
        l2: [I("Ingat ekspresi yang kamu temukan. Untuk 12 siswa, x berapa?", "Remember the expression you found. For 12 students, what is x?")],
        l3: [I("Untuk 10 siswa airnya 30 liter. Berapa untuk 2 siswa lagi?", "10 students use 30 litres. How much for 2 more students?")],
        l4: I("Bagaimana kamu mendapatkan prediksi itu? Lalu cek di aplet: tambahkan siswa sampai 12.", "How did you get that prediction? Then check it in the applet: add students up to 12."),
        confirm: I("Benar, seperti caramu: 3 × 12 = 36 liter.", "Correct, as you worked it out: 3 × 12 = 36 litres."),
        numbers: [12, 3, 10, 30, 2],
        forbid: [{ re: /(\b36\b|3\s*[x×*]\s*12|12\s*[x×*]\s*3)/, until: "answer", why: "memberi jawaban" }],
      },
    ],
  });
})();
