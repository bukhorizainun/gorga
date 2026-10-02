/* Task card, Applet 3 "Sea level and depth with integers" (DRAFT for the teacher to confirm).
   Representation: dolphins on a vertical scale in feet, sea level at 0. */
(function () {
  const { make } = window.GorgaCardEngine;
  const I = (id, en) => ({ id, en });

  // Which dolphin the student names: "lumba-lumba A", "A", or its number (+25 A, -32 B, 18 C).
  function dolphin(t, raw) {
    const m = raw.match(/(?:lumba-?lumba|dolphin)\s*([abc])\b/i) || raw.match(/\b([ABC])\b/);
    if (m) return m[1].toUpperCase();
    if (/(^|[^\d])\+?25\b/.test(t)) return "A";
    if (/-32\b|\b32\b/.test(t)) return "B";
    if (/(^|[^\d])\+?18\b/.test(t)) return "C";
    return null;
  }
  // An order of the three dolphins, from letters or from their numbers, in the order written.
  function order(t, raw) {
    const marks = [];
    const re = /(?:lumba-?lumba|dolphin)\s*([abc])\b|\b([ABC])\b|(-32|\+?25|\+?18|\b32\b)/gi;
    let m;
    while ((m = re.exec(raw.replace(/[−–—]/g, "-")))) {
      const v = (m[1] || m[2] || "").toUpperCase() || ({ "-32": "B", "32": "B", "25": "A", "+25": "A", "18": "C", "+18": "C" })[m[3]];
      if (v && !marks.includes(v)) marks.push(v);
    }
    return marks.length === 3 ? marks.join("") : null;
  }
  const said = (x) => (x.length === 1 ? `lumba-lumba ${x}` : x.split("").join(", "));

  make(3, {
    howTo: I("Tarik lumba-lumba ke atas atau ke bawah di aplet, lalu perhatikan angka di garis ukur dan garis permukaan laut. Apa yang kamu lihat?",
      "Drag a dolphin up or down in the applet, then look at the numbers on the scale and at the sea-level line. What do you see?"),
    questions: [
      { // 1a: the meaning of a positive number
        opening: I("Gerakkan lumba-lumba di aplet. Apa arti bilangan positif pada aplet ini?", "Move the dolphins in the applet. What does a positive number mean in this applet?"),
        target: I("Bilangan positif = posisi di atas permukaan laut (permukaan laut = 0).", "A positive number = a position above sea level (sea level = 0)."),
        reasons: [{ name: "di atas permukaan laut", re: /(di ?atas|atas (permukaan|air|laut)|above|over the (sea|water)|out of the water|di udara|keluar (dari )?air)/ }],
        need: 1,
        l2: [I("Perhatikan garis permukaan laut dan angka 0 di garis ukur. Lumba-lumba yang angkanya positif ada di mana dibanding garis itu?", "Look at the sea-level line and 0 on the scale. Where is a dolphin with a positive number compared with that line?")],
        l3: [I("Geser satu lumba-lumba ke angka 10. Sekarang ia berada di dalam air atau di luar air?", "Move one dolphin to 10. Is it in the water or out of it now?")],
        more: I("Coba jelaskan lagi dengan melihat garis permukaan laut: bilangan positif itu posisinya di mana?", "Explain again using the sea-level line: where is a positive number?"),
        confirm: I("Benar, seperti katamu: bilangan positif menunjukkan posisi di atas permukaan laut.", "Correct, as you said: a positive number shows a position above sea level."),
        numbers: [0, 10],
        forbid: [{ re: /(di ?atas permukaan|above sea level)/, why: "memberi arti positif" }],
      },
      { // 1b: the meaning of a negative number
        opening: I("Apa arti bilangan negatif pada aplet ini?", "What does a negative number mean in this applet?"),
        target: I("Bilangan negatif = posisi di bawah permukaan laut (kedalaman).", "A negative number = a position below sea level (a depth)."),
        reasons: [{ name: "di bawah permukaan laut", re: /(di ?bawah|bawah (permukaan|air|laut)|kedalaman|dalam (air|laut)|menyelam|below|under(water| the (sea|water))|beneath|depth|deep)/ }],
        need: 1,
        l2: [I("Perhatikan garis permukaan laut. Lumba-lumba yang angkanya negatif ada di mana dibanding garis itu?", "Look at the sea-level line. Where is a dolphin with a negative number compared with it?")],
        l3: [I("Geser satu lumba-lumba ke −20. Sekarang ia di dalam air atau di luar air?", "Move one dolphin to −20. Is it in the water or out of it now?")],
        more: I("Coba jelaskan dengan garis permukaan laut: bilangan negatif itu posisinya di mana?", "Explain using the sea-level line: where is a negative number?"),
        confirm: I("Benar, seperti katamu: bilangan negatif menunjukkan posisi di bawah permukaan laut.", "Correct, as you said: a negative number shows a position below sea level."),
        numbers: [0, -20, 20],
        forbid: [{ re: /(di ?bawah permukaan|below sea level|kedalaman|depth)/, why: "memberi arti negatif" }],
      },
      { // 1c: why scientists use positive and negative numbers
        opening: I("Mengapa ilmuwan memakai bilangan positif dan negatif untuk posisi lumba-lumba terhadap permukaan laut?", "Why do scientists use positive and negative numbers for the dolphins' positions relative to sea level?"),
        target: I("Dua ide: permukaan laut sebagai titik acuan 0, dan dua arah yang berlawanan (atas/bawah); boleh juga: memudahkan membandingkan/mengukur posisi.",
          "Two ideas: sea level as the reference point 0, and two opposite directions (up/down); also accepted: it makes positions easy to compare or measure."),
        reasons: [
          { name: "acuan 0 di permukaan laut", re: /(permukaan laut.{0,25}(0|nol|acuan|patokan)|(0|nol).{0,25}permukaan laut|titik acuan|patokan|acuan|reference|starting point|sea level (is|as) (0|zero))/ },
          { name: "dua arah berlawanan", re: /(berlawanan|atas (dan|atau) bawah|atas.{0,40}bawah|positif.{0,40}negatif|above.{0,40}below|positive.{0,40}negative|opposite|two directions|dua arah)/ },
          { name: "membandingkan/mengukur", re: /(membandingkan|bandingkan|perbandingan|mengukur|ukur|seberapa (tinggi|dalam|jauh)|compare|measure|how (high|deep|far))/ },
        ],
        need: 2,
        l2: [I("Perhatikan garis permukaan laut di aplet. Angka berapa yang ada di garis itu, dan apa yang terjadi pada angka di atas dan di bawahnya?", "Look at the sea-level line in the applet. Which number is on that line, and what happens to the numbers above and below it?")],
        l3: [I("Kalau hanya memakai angka tanpa tanda, misalnya “25 kaki”, bagaimana kita tahu lumba-lumba itu di atas atau di bawah air?", "With numbers only, without signs, say “25 feet”, how would we know whether the dolphin is above or below the water?")],
        more: I("Itu satu alasan yang bagus. Apa peran permukaan laut, atau garis 0, dalam caramu menjelaskan?", "That is one good reason. What role does sea level, the 0 line, play in your explanation?"),
        confirm: I("Benar, seperti penjelasanmu: permukaan laut menjadi titik 0, dan tanda positif atau negatif menunjukkan arahnya.", "Correct, as you explained: sea level is the 0 point, and the sign shows the direction."),
        numbers: [0, 25],
        forbid: [{ re: /(titik acuan|patokan|reference point|berlawanan arah|opposite directions)/, why: "memberi ide target" }],
      },
      { // 2a: the highest dolphin
        opening: I("Lihat posisi ketiga lumba-lumba: A di +25, B di −32, C di +18. Lumba-lumba mana yang paling tinggi, dan bagaimana kamu tahu?", "Look at the three dolphins: A at +25, B at −32, C at +18. Which dolphin is highest, and how do you know?"),
        target: I("Lumba-lumba A (+25), karena +25 paling besar / paling jauh di atas permukaan laut.", "Dolphin A (+25), because +25 is the greatest / furthest above sea level."),
        claim: dolphin, correct: (x) => x === "A", show: said,
        reasons: [{ name: "alasan posisi/besar", re: /(paling (besar|tinggi|atas|jauh)|terbesar|tertinggi|lebih (besar|tinggi)|di ?atas|positif|largest|greatest|highest|bigger|above|positive|garis bilangan|number line)/ }],
        need: 1,
        wrong: [
          { test: (x) => x === "B", kind: "noSignHigh", label: I("salah: melihat angka tanpa tanda (32 > 25)", "wrong: compared numbers without signs (32 > 25)"),
            l2: I("Perhatikan tandanya juga. −32 berada di atas atau di bawah permukaan laut?", "Look at the sign too. Is −32 above or below sea level?") },
          { test: (x) => x === "C", kind: "other", l2: I("Bandingkan +18 dan +25 di garis ukur. Mana yang lebih tinggi?", "Compare +18 and +25 on the scale. Which one is higher?") },
        ],
        l2: [I("Letakkan ketiga lumba-lumba di aplet pada +25, −32, dan +18. Mana yang paling atas?", "Put the three dolphins at +25, −32 and +18 in the applet. Which one is at the top?")],
        l3: [I("Lihat dua yang positif saja dulu: +25 dan +18. Mana yang lebih tinggi?", "First only the two positive ones: +25 and +18. Which is higher?")],
        l4: I("Bagaimana kamu tahu lumba-lumba A yang paling tinggi? Jelaskan dengan garis ukur di aplet.", "How do you know dolphin A is highest? Explain it with the scale in the applet."),
        confirm: I("Benar, seperti alasanmu: lumba-lumba A di +25 berada paling tinggi.", "Correct, as you reasoned: dolphin A at +25 is the highest."),
        numbers: [25, -32, 18, 0],
        forbid: [{ re: /(lumba-?lumba a\b.{0,30}(paling )?tinggi|dolphin a\b.{0,30}highest|a (yang|is the) (paling tinggi|highest))/, until: "answer", why: "memberi jawaban" }],
      },
      { // 2b: the deepest dolphin
        opening: I("Lumba-lumba mana yang berada paling dalam? Jelaskan caramu menentukannya.", "Which dolphin is deepest? Explain how you decided."),
        target: I("Lumba-lumba B (−32), karena −32 berada paling jauh di bawah permukaan laut.", "Dolphin B (−32), because −32 is furthest below sea level."),
        claim: dolphin, correct: (x) => x === "B", show: said,
        reasons: [{ name: "alasan kedalaman", re: /(paling (bawah|dalam|kecil|rendah|jauh)|terdalam|terkecil|di ?bawah|negatif|deepest|lowest|smallest|below|negative|garis bilangan|number line)/ }],
        need: 1,
        wrong: [
          { test: (x) => x === "A", kind: "biggest", label: I("salah: memilih angka terbesar", "wrong: picked the greatest number"),
            l2: I("Paling dalam berarti paling jauh ke bawah air. +25 itu di atas atau di bawah permukaan laut?", "Deepest means furthest down in the water. Is +25 above or below sea level?") },
          { test: (x) => x === "C", kind: "other", l2: I("Perhatikan tanda +18. Ia berada di dalam air atau di atas air?", "Look at the sign of +18. Is it in the water or above it?") },
        ],
        l2: [I("Letakkan ketiga lumba-lumba di aplet. Mana yang paling jauh ke bawah dari garis permukaan laut?", "Put the three dolphins in the applet. Which one is furthest below the sea-level line?")],
        l3: [I("Dari ketiganya, mana yang angkanya negatif?", "Of the three, which has a negative number?")],
        l4: I("Bagaimana kamu tahu lumba-lumba B yang paling dalam? Jelaskan dengan garis permukaan laut.", "How do you know dolphin B is deepest? Explain it with the sea-level line."),
        confirm: I("Benar, seperti alasanmu: lumba-lumba B di −32 berada paling dalam.", "Correct, as you reasoned: dolphin B at −32 is the deepest."),
        numbers: [25, -32, 18, 0],
        forbid: [{ re: /(lumba-?lumba b\b.{0,30}(paling )?dalam|dolphin b\b.{0,30}deepest)/, until: "answer", why: "memberi jawaban" }],
      },
      { // 2c: order from lowest to highest
        opening: I("Urutkan posisi ketiga lumba-lumba dari yang paling rendah hingga paling tinggi. Bagaimana kamu mengurutkannya?", "Order the three dolphins from lowest to highest. How did you order them?"),
        target: I("B (−32), C (+18), A (+25): negatif di bawah semua yang positif; di antara positif, yang lebih kecil lebih rendah.",
          "B (−32), C (+18), A (+25): the negative one is below all positives; among positives, the smaller is lower."),
        claim: order, correct: (x) => x === "BCA", show: said,
        reasons: [{ name: "alasan urutan", re: /(karena|sebab|because|since|paling (bawah|dalam|rendah)|di ?bawah|negatif|lebih (kecil|rendah)|below|negative|smaller|lower|garis bilangan|number line)/ }],
        need: 1,
        wrong: [
          { test: (x) => x === "CAB", kind: "noSignOrder", label: I("salah: mengurutkan angka tanpa tanda", "wrong: ordered the numbers without signs"),
            l2: I("Perhatikan tanda −32. Di aplet, −32 berada di atas atau di bawah +18?", "Look at the sign of −32. In the applet, is −32 above or below +18?") },
          { test: (x) => x === "ACB", kind: "reversed", label: I("salah: urutan terbalik (tinggi ke rendah)", "wrong: reversed order (high to low)"),
            l2: I("Urutannya diminta dari yang paling rendah. Lumba-lumba mana yang paling bawah di aplet?", "The order should start from the lowest. Which dolphin is at the bottom in the applet?") },
        ],
        l2: [I("Letakkan ketiganya di aplet. Mulai dari yang paling bawah: lumba-lumba mana?", "Put all three in the applet. Start from the bottom: which dolphin?")],
        l3: [I("Mana yang paling rendah? Lalu dari dua sisanya, mana yang lebih rendah?", "Which is lowest? Then of the other two, which is lower?")],
        l4: I("Jelaskan bagaimana kamu menentukan urutan itu, dengan melihat garis ukur di aplet.", "Explain how you decided that order, using the scale in the applet."),
        confirm: I("Benar, seperti alasanmu: dari bawah ke atas urutannya B (−32), C (+18), A (+25).", "Correct, as you reasoned: from bottom to top the order is B (−32), C (+18), A (+25)."),
        numbers: [25, -32, 18, 0],
        forbid: [{ re: /b\W{0,6}c\W{0,6}a\b|-32\W{0,6}18\W{0,6}25/, until: "answer", why: "memberi urutan" }],
      },
      { // 2d: why scientists need the positions
        opening: I("Menurutmu, mengapa ilmuwan perlu mengetahui posisi lumba-lumba terhadap permukaan laut?", "Why do you think scientists need to know the dolphins' positions relative to sea level?"),
        target: I("Dua ide yang masuk akal, misalnya: memantau habitat/ekosistem, dampak perubahan iklim atau naiknya permukaan laut, melindungi lumba-lumba, kedalaman/suhu/makanan.",
          "Two sensible ideas, for example: monitoring habitat/ecosystem, effects of climate change or rising sea level, protecting dolphins, depth/temperature/food."),
        reasons: [
          { name: "habitat/ekosistem", re: /(habitat|ekosistem|tempat (hidup|tinggal)|lingkungan|ecosystem|environment|where they live)/ },
          { name: "perubahan iklim/permukaan laut", re: /(perubahan iklim|iklim|pemanasan|permukaan laut (naik|meningkat)|climate|warming|sea level (rise|rising))/ },
          { name: "melindungi/memantau", re: /(melindungi|menjaga|memantau|pantau|melestarikan|selamat|protect|monitor|conserv|save|safe)/ },
          { name: "kedalaman/suhu/makanan", re: /(makan|suhu|kedalaman|bernapas|napas|food|temperature|depth|breath)/ },
        ],
        need: 2,
        l2: [I("Ingat pengantar aktivitas ini tentang perubahan iklim dan permukaan laut. Apa hubungannya dengan tempat hidup lumba-lumba?", "Remember the introduction about climate change and sea level. How is that linked to where dolphins live?")],
        l3: [I("Kalau permukaan laut naik, apa yang bisa berubah bagi lumba-lumba?", "If sea level rises, what could change for the dolphins?")],
        more: I("Itu alasan yang masuk akal. Apa lagi yang bisa dipelajari ilmuwan dari posisi itu?", "That is a sensible reason. What else could scientists learn from those positions?"),
        confirm: I("Benar, alasanmu masuk akal dan kamu menjelaskannya sendiri.", "Correct, your reasons make sense and you explained them yourself."),
        numbers: [0],
        forbid: [],
      },
    ],
  });
})();
