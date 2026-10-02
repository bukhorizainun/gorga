/* Task card, Applet 4 "Choosing eco-friendly transport" (DRAFT for the teacher to confirm).
   Sada walks on a number line in feet, starting at 0; right is positive. The applet asks its own
   random questions; the card follows the teacher's questions (10 feet per second, 2 seconds). */
(function () {
  const { make } = window.GorgaCardEngine;
  const I = (id, en) => ({ id, en });

  // The position the student gives: a signed number, or "20 ke kiri/kanan", "20 left/right".
  function position(t) {
    const side = t.match(/(-?\d+)\s*(kaki|feet|ft)?\s*(di |ke |to the |on the )?(sebelah )?(kanan|kiri|right|left)/);
    if (side) { const v = Math.abs(Number(side[1])); return /kiri|left/.test(side[5]) ? -v : v; }
    const after = t.match(/(=|di|posisi(nya)?|berada|at|jadi|is)\s*(\+?-?\d+)/g);
    if (after) return Number(after[after.length - 1].match(/\+?-?\d+/)[0]);
    const ns = (t.match(/[+-]?\d+/g) || []).map(Number).filter((x) => ![10, 2, -2, -10].includes(x));
    if (ns.length === 1) return ns[0];
    if (/^[+-]?\d+$/.test(t)) return Number(t);
    return null;
  }
  const show = (x) => (x > 0 ? `+${x}` : x < 0 ? `−${-x}` : "0");
  const MULT = /(10\s*[x×*·]\s*\(?-?2|\(?-?10\)?\s*[x×*·]\s*\(?-?2|2\s*[x×*·]\s*\(?-?10|10 ?\+ ?10|dikali|kali|tiap detik|setiap detik|per detik|each second|every second|times|multipl)/;
  const PAST = /(lalu|masa lalu|sebelumnya|mundur waktu|waktu (negatif|mundur)|-2 detik|\(-2\)|ago|past|before|earlier|backwards in time|negative time)/;
  const LEFT = /(kiri|mundur|negatif|-10|\(-10\)|left|backward|negative)/;

  make(4, {
    howTo: I("Tarik Sada ke kiri atau ke kanan di garis bilangan aplet, lalu baca posisinya. Apa yang kamu lihat?", "Drag Sada left or right on the applet's number line, then read her position. What do you see?"),
    questions: [
      { // 1: right, 10 ft/s, after 2 s -> +20
        opening: I("Sada mulai di 0 dan berjalan ke kanan 10 kaki per detik. Di mana posisinya setelah 2 detik, dan bagaimana kamu menentukannya?",
          "Sada starts at 0 and walks right at 10 feet per second. Where is she after 2 seconds, and how did you decide?"),
        target: I("+20, karena 10 × 2 = 20 ke arah kanan (positif).", "+20, because 10 × 2 = 20 to the right (positive)."),
        claim: position, correct: (x) => x === 20, show, answerNumbers: [20],
        reasons: [{ name: "kecepatan × waktu", re: MULT }], need: 1,
        wrong: [
          { test: (x) => x === -20, kind: "direction", label: I("salah: arah terbalik", "wrong: direction reversed"),
            l2: I("Sada berjalan ke kanan. Di garis bilangan, ke kanan dari 0 itu bilangan positif atau negatif?", "Sada walks right. On the number line, is right of 0 positive or negative?") },
          { test: (x) => x === 12 || x === 5 || x === 10, kind: "operation", label: I("salah: operasi kecepatan dan waktu", "wrong: operation on speed and time"),
            l2: I("Dalam 1 detik Sada berjalan 10 kaki. Di aplet, tarik Sada 10 kaki untuk detik pertama, lalu detik kedua. Ia sampai di mana?", "In 1 second Sada walks 10 feet. In the applet, move her 10 feet for the first second, then for the second. Where does she end?") },
        ],
        l2: [I("Di aplet, tarik Sada dari 0 ke kanan sejauh yang ia jalani dalam 1 detik. Lalu tambah 1 detik lagi. Ia sampai di angka berapa?", "In the applet, move Sada right from 0 as far as she walks in 1 second. Then one more second. Where is she?")],
        l3: [I("Setelah 1 detik, Sada di angka berapa?", "After 1 second, where is Sada?")],
        l4: I("Bagaimana kamu mendapatkan posisi itu? Jelaskan hubungan kecepatan dan waktunya.", "How did you get that position? Explain how the speed and the time give it."),
        confirm: I("Benar, seperti caramu: 10 × 2 = 20, jadi Sada berada di +20.", "Correct, as you worked it out: 10 × 2 = 20, so Sada is at +20."),
        numbers: [10, 2, 0, 1],
        forbid: [{ re: /(\+?20\b|10\s*[x×*]\s*2)/, until: "answer", why: "memberi jawaban" }],
      },
      { // 2: left, 10 ft/s, after 2 s -> -20
        opening: I("Sekarang Sada berjalan mundur (ke kiri) 10 kaki per detik. Di mana posisinya setelah 2 detik? Jelaskan caramu.",
          "Now Sada walks backwards (left) at 10 feet per second. Where is she after 2 seconds? Explain how."),
        target: I("−20, karena kecepatan ke kiri ditulis −10 dan (−10) × 2 = −20.", "−20, because the speed to the left is −10 and (−10) × 2 = −20."),
        claim: position, correct: (x) => x === -20, show, answerNumbers: [-20, 20],
        reasons: [{ name: "kecepatan × waktu", re: MULT }, { name: "arah kiri negatif", re: LEFT }], need: 2,
        wrong: [
          { test: (x) => x === 20, kind: "direction", label: I("salah: lupa arah ke kiri", "wrong: ignored the direction left"),
            l2: I("Sada berjalan ke kiri. Di garis bilangan, ke kiri dari 0 itu bilangan positif atau negatif?", "Sada walks left. On the number line, is left of 0 positive or negative?") },
        ],
        l2: [I("Di aplet, tarik Sada dari 0 ke kiri sejauh 1 detik berjalan, lalu 1 detik lagi. Ia sampai di angka berapa?", "In the applet, move Sada left from 0 for 1 second of walking, then one more. Where is she?")],
        l3: [I("Kalau ke kanan ditulis +10, kecepatan ke kiri ditulis berapa?", "If right is written +10, how is the speed to the left written?")],
        l4: I("Bagaimana kamu mendapatkan posisi itu? Tuliskan sebagai perkalian kecepatan dan waktu.", "How did you get that position? Write it as speed times time."),
        confirm: I("Benar, seperti caramu: (−10) × 2 = −20, jadi Sada berada di −20.", "Correct, as you worked it out: (−10) × 2 = −20, so Sada is at −20."),
        numbers: [10, 2, 0, 1],
        forbid: [{ re: /(-20\b|\(-10\)\s*[x×*]\s*2)/, until: "answer", why: "memberi jawaban" }],
      },
      { // 3: right, 10 ft/s, 2 s ago -> -20
        opening: I("Bayangkan waktu mundur 2 detik ke masa lalu. Sada berjalan ke kanan 10 kaki per detik dan sekarang di 0. Di mana ia 2 detik yang lalu?",
          "Imagine going 2 seconds back in time. Sada walks right at 10 feet per second and is at 0 now. Where was she 2 seconds ago?"),
        target: I("−20: ia datang dari kiri; waktu lalu ditulis −2, dan 10 × (−2) = −20.", "−20: she came from the left; past time is −2, and 10 × (−2) = −20."),
        claim: position, correct: (x) => x === -20, show, answerNumbers: [-20, 20],
        reasons: [{ name: "waktu lalu negatif", re: PAST }, { name: "kecepatan × waktu", re: MULT }], need: 2,
        wrong: [
          { test: (x) => x === 20, kind: "ignoredPast", label: I("salah: mengabaikan waktu ke masa lalu", "wrong: ignored that the time is in the past"),
            l2: I("Sada berjalan ke kanan dan sekarang di 0. Sebelum sampai di 0, ia datang dari sebelah mana?", "Sada walks right and is at 0 now. Before reaching 0, which side did she come from?") },
        ],
        l2: [I("Letakkan Sada di 0 di aplet. Kalau ia berjalan ke kanan, 1 detik yang lalu ia ada di mana?", "Put Sada at 0 in the applet. If she walks right, where was she 1 second ago?")],
        l3: [I("Kalau waktu ke depan ditulis +2 detik, waktu 2 detik ke masa lalu ditulis berapa?", "If 2 seconds forward is +2, how is 2 seconds into the past written?")],
        l4: I("Bagaimana kamu mendapatkan posisi itu? Jelaskan dengan kecepatan dan waktu ke masa lalu.", "How did you get that position? Explain it with the speed and the time in the past."),
        confirm: I("Benar, seperti caramu: 10 × (−2) = −20, jadi 2 detik yang lalu Sada di −20.", "Correct, as you worked it out: 10 × (−2) = −20, so 2 seconds ago Sada was at −20."),
        numbers: [10, 2, 0, 1],
        forbid: [{ re: /(-20\b|10\s*[x×*]\s*\(?-2)/, until: "answer", why: "memberi jawaban" }],
      },
      { // 4: left, 10 ft/s, 2 s ago -> +20
        opening: I("Waktu mundur 2 detik lagi. Kali ini Sada berjalan mundur (ke kiri) 10 kaki per detik dan sekarang di 0. Di mana ia 2 detik yang lalu?",
          "Back in time again, 2 seconds. This time Sada walks backwards (left) at 10 feet per second and is at 0 now. Where was she 2 seconds ago?"),
        target: I("+20: ia datang dari kanan; (−10) × (−2) = +20.", "+20: she came from the right; (−10) × (−2) = +20."),
        claim: position, correct: (x) => x === 20, show, answerNumbers: [20, -20],
        reasons: [
          { name: "negatif × negatif", re: /(\(?-10\)?\s*[x×*·]\s*\(?-2|negatif (kali|dikali) negatif|negative times (a )?negative|minus kali minus)/ },
          { name: "waktu lalu", re: PAST }, { name: "arah kiri", re: LEFT },
        ],
        need: 2,
        wrong: [
          { test: (x) => x === -20, kind: "oneSign", label: I("salah: hanya satu tanda yang diperhitungkan", "wrong: only one of the two signs counted"),
            l2: I("Sada berjalan ke kiri dan sekarang di 0. Sebelum sampai di 0, ia datang dari sebelah mana?", "Sada walks left and is at 0 now. Before reaching 0, which side did she come from?") },
        ],
        l2: [I("Letakkan Sada di 0 di aplet. Kalau ia berjalan ke kiri, 1 detik yang lalu ia ada di mana?", "Put Sada at 0. If she walks left, where was she 1 second ago?")],
        l3: [I("Kecepatannya ditulis −10 dan waktunya −2. Apa tanda hasil (−10) × (−2)?", "The speed is −10 and the time is −2. What is the sign of (−10) × (−2)?")],
        l4: I("Bagaimana kamu mendapatkan posisi itu? Jelaskan dengan kecepatan dan waktunya.", "How did you get that position? Explain it with the speed and the time."),
        confirm: I("Benar, seperti caramu: (−10) × (−2) = +20, jadi 2 detik yang lalu Sada di +20.", "Correct, as you worked it out: (−10) × (−2) = +20, so 2 seconds ago Sada was at +20."),
        numbers: [10, 2, 0, 1],
        forbid: [{ re: /(\+?20\b(?!.*\?)|\(-10\)\s*[x×*]\s*\(-2\))/, until: "answer", why: "memberi jawaban" }],
      },
      { // 5: conclusion
        opening: I("Apa simpulan yang dapat kamu ambil dari keempat soal tadi?", "What conclusion can you draw from the four questions?"),
        target: I("Aturan tanda perkalian: tanda sama → positif; tanda berbeda → negatif (posisi = kecepatan × waktu).",
          "Sign rule for multiplication: same signs → positive; different signs → negative (position = speed × time)."),
        reasons: [
          { name: "tanda sama → positif", re: /((tanda|arah)(nya)? sama.{0,30}positif|\bsama\b.{0,25}positif|positif.{0,12}(kali|dikali|x|×).{0,12}positif.{0,20}positif|negatif.{0,12}(kali|dikali|x|×).{0,12}negatif.{0,25}positif|same signs?.{0,30}positive|negative times (a )?negative.{0,20}positive)/ },
          { name: "tanda beda → negatif", re: /((tanda|arah)(nya)? (beda|berbeda|berlawanan).{0,30}negatif|\b(beda|berbeda|berlawanan)\b.{0,25}negatif|positif.{0,12}(kali|dikali|x|×).{0,12}negatif.{0,25}negatif|negatif.{0,12}(kali|dikali|x|×).{0,12}positif.{0,25}negatif|different signs?.{0,30}negative|(positive|negative) times (a )?(negative|positive).{0,20}negative)/ },
          { name: "posisi = kecepatan × waktu", re: /((kecepatan|speed).{0,20}(kali|dikali|x|×|times).{0,20}(waktu|time)|posisi\s*=)/ },
        ],
        need: 2,
        l2: [I("Lihat lagi keempat jawabanmu: +20, −20, −20, +20. Kapan hasilnya positif, dan kapan negatif?", "Look at your four answers again: +20, −20, −20, +20. When is the result positive, and when negative?")],
        l3: [I("Di soal 4, kecepatan dan waktunya sama-sama negatif. Hasilnya positif atau negatif?", "In question 4, the speed and the time are both negative. Is the result positive or negative?")],
        more: I("Itu satu bagian dari pola. Bagaimana dengan kasus yang tandanya lain?", "That is one part of the pattern. What about the case with the other signs?"),
        confirm: I("Benar, seperti simpulanmu: kalau tandanya sama hasilnya positif, kalau berbeda hasilnya negatif.", "Correct, as you concluded: same signs give a positive result, different signs a negative one."),
        numbers: [20, -20, 10, 2, 0],
        forbid: [{ re: /(sama.{0,25}positif|berbeda.{0,25}negatif|same signs?.{0,25}positive|different signs?.{0,25}negative)/, why: "memberi aturan" }],
      },
    ],
  });
})();
