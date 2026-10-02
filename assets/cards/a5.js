/* Task card, Applet 5 "Patterns for sustainable decisions" (DRAFT for the teacher to confirm).
   The applet's cards: -1/-3, -2/-6 (value 1/3); 2/-6, -2÷6, 1÷(-3) (value -1/3); 3/-1, -6÷2, -3/1 (value -3).
   The applet checks the sorting itself ("Number correct"); the card asks for the reasoning. */
(function () {
  const { make } = window.GorgaCardEngine;
  const I = (id, en) => ({ id, en });
  const SAME_POS = /((tanda|sign)(nya)? (yang )?sama.{0,30}(positif|positive)|\bsama\b.{0,25}positif|negatif.{0,15}(dibagi|bagi|kali|dikali|:|÷|\/|x|×).{0,15}negatif.{0,25}positif|negative.{0,20}(divided by|times).{0,15}negative.{0,25}positive|same signs?.{0,30}positive)/;
  const DIFF_NEG = /((tanda|sign)(nya)? (yang )?(beda|berbeda|berlawanan).{0,30}(negatif|negative)|\b(beda|berbeda|berlawanan)\b.{0,25}negatif|positif.{0,15}(dibagi|bagi|kali|dikali|:|÷|\/|x|×).{0,15}negatif.{0,25}negatif|negatif.{0,15}(dibagi|bagi|kali|dikali|:|÷|\/|x|×).{0,15}positif.{0,25}negatif|(positive|negative).{0,20}(divided by|times).{0,15}(negative|positive).{0,25}negative|different signs?.{0,30}negative)/;
  const VALUE = /(nilai(nya)? (sama|yang sama)|hasil(nya)? (sama|yang sama)|dihitung|menghitung|hitung|sama dengan|1\/3|-1\/3|-3\b|same value|equal|calculat|work(ed)? out)/;

  make(5, {
    howTo: I("Tarik kartu ke kotak di aplet, lalu tekan CHECK. Kartu dengan nilai yang sama masuk ke kotak yang sama. Apa yang kamu coba dulu?",
      "Drag the cards into the boxes, then press CHECK. Cards with the same value go in the same box. What did you try first?"),
    questions: [
      { // 1: which expressions have the same value
        opening: I("Kelompokkan kartu di aplet berdasarkan nilainya, lalu tekan CHECK. Kelompok apa saja yang kamu temukan?", "Sort the cards in the applet by their value, then press CHECK. Which groups did you find?"),
        target: I("Tiga kelompok dengan nilai 1/3, −1/3, dan −3, ditemukan dengan menghitung nilai tiap kartu (memperhatikan tanda).",
          "Three groups with values 1/3, −1/3 and −3, found by working out each card's value (paying attention to the signs)."),
        reasons: [
          { name: "menghitung nilai", re: VALUE },
          { name: "kelompok 1/3 atau −1/3 atau −3", re: /(1\/3|-1\/3|-3\b|sepertiga|third|tiga kelompok|3 kelompok|three groups)/ },
        ],
        need: 2,
        l2: [I("Ambil satu kartu, misalnya −6 ÷ 2. Berapa nilainya? Kartu lain mana yang nilainya sama?", "Take one card, for example −6 ÷ 2. What is its value? Which other card has the same value?")],
        l3: [I("Bandingkan dua kartu saja: −1/−3 dan −2/−6. Apakah nilainya sama? Bagaimana kamu tahu?", "Compare just two cards: −1/−3 and −2/−6. Are their values the same? How do you know?")],
        more: I("Itu bagian yang bagus. Kelompok apa lagi yang kamu temukan, dan nilainya berapa?", "Good part. Which other groups did you find, and what are their values?"),
        confirm: I("Benar, seperti caramu: kamu mengelompokkan kartu dengan menghitung nilainya.", "Correct, as you did it: you grouped the cards by working out their values."),
        numbers: [-6, 2, -1, -3, -2, 1, 3, 6],
        forbid: [{ re: /(-1\/3|1\/3|-3\b).{0,30}(kelompok|group)/, why: "memberi kelompok" }],
      },
      { // 2: how did you decide they belong together
        opening: I("Bagaimana kamu menentukan bahwa ekspresi-ekspresi itu berada dalam kelompok yang sama? Jelaskan alasanmu.", "How did you decide that those expressions belong to the same group? Explain your reason."),
        target: I("Nilainya dihitung dan hasilnya sama; tanda hasil mengikuti tanda pembilang/penyebut (atau bilangan yang dibagi/pembagi).",
          "Their values are worked out and are equal; the sign of the result follows the signs of the two numbers."),
        reasons: [{ name: "nilai sama", re: VALUE }, { name: "memperhatikan tanda", re: /(tanda|negatif|positif|minus|sign|negative|positive)/ }],
        need: 2,
        l2: [I("Lihat −2 ÷ 6 dan 2/−6. Angkanya sama-sama 2 dan 6. Apa yang berbeda, dan apakah nilainya tetap sama?", "Look at −2 ÷ 6 and 2/−6. Both use 2 and 6. What is different, and is the value still the same?")],
        l3: [I("Berapa nilai 2/−6? Berapa nilai −2 ÷ 6?", "What is 2/−6? What is −2 ÷ 6?")],
        more: I("Lalu apa peran tanda negatifnya dalam alasanmu?", "And what part does the negative sign play in your reason?"),
        confirm: I("Benar, seperti alasanmu: nilainya sama setelah dihitung dengan memperhatikan tandanya.", "Correct, as you reasoned: the values are equal once you work them out with their signs."),
        numbers: [-2, 6, 2, -6],
        forbid: [],
      },
      { // 3: the pattern
        opening: I("Pola apa yang kamu temukan ketika mengalikan atau membagi bilangan bulat positif dan negatif?", "What pattern did you find when multiplying or dividing positive and negative integers?"),
        target: I("Tanda sama → hasil positif; tanda berbeda → hasil negatif.", "Same signs → positive result; different signs → negative result."),
        reasons: [{ name: "tanda sama → positif", re: SAME_POS }, { name: "tanda beda → negatif", re: DIFF_NEG }],
        need: 2,
        l2: [I("Lihat kelompok nilai 1/3: −1/−3 dan −2/−6. Tanda kedua bilangan di tiap kartu sama atau berbeda?", "Look at the group with value 1/3: −1/−3 and −2/−6. Are the two signs on each card the same or different?")],
        l3: [I("Negatif dibagi negatif hasilnya positif atau negatif? Lalu positif dibagi negatif?", "Negative divided by negative: positive or negative? And positive divided by negative?")],
        more: I("Itu satu bagian dari pola. Bagaimana kalau tandanya berbeda?", "That is one part of the pattern. What if the signs are different?"),
        confirm: I("Benar, seperti polamu: tanda sama hasilnya positif, tanda berbeda hasilnya negatif.", "Correct, as in your pattern: same signs give positive, different signs give negative."),
        numbers: [-1, -3, -2, -6, 1, 3],
        forbid: [{ re: /(sama.{0,25}positif|berbeda.{0,25}negatif|same signs?.{0,25}positive|different signs?.{0,25}negative)/, why: "memberi pola" }],
      },
      { // 4: the rule
        opening: I("Apa simpulanmu tentang aturan perkalian dan pembagian bilangan bulat positif dan negatif?", "What do you conclude about the rule for multiplying and dividing positive and negative integers?"),
        target: I("Aturan yang sama berlaku untuk perkalian dan pembagian: tanda sama → positif, tanda berbeda → negatif.",
          "The same rule holds for multiplication and division: same signs → positive, different signs → negative."),
        reasons: [
          { name: "tanda sama → positif", re: SAME_POS }, { name: "tanda beda → negatif", re: DIFF_NEG },
          { name: "berlaku untuk kali dan bagi", re: /((perkalian|kali).{0,20}(dan|maupun|juga).{0,20}(pembagian|bagi)|(pembagian|bagi).{0,20}(dan|maupun|juga).{0,20}(perkalian|kali)|both (multiplication|division)|multiplication and division|division and multiplication)/ },
        ],
        need: 2,
        l2: [I("Pola yang kamu temukan di soal sebelumnya: apakah berlaku juga untuk perkalian, misalnya (−3) × (−1)?", "The pattern from the last question: does it also hold for multiplication, for example (−3) × (−1)?")],
        l3: [I("Berapa (−6) ÷ 2, dan berapa (−3) × 2? Tandanya sama atau berbeda?", "What is (−6) ÷ 2, and what is (−3) × 2? Same sign or different?")],
        more: I("Bagaimana dengan kasus tanda yang satunya lagi?", "And the other case of signs?"),
        confirm: I("Benar, seperti simpulanmu: tanda sama hasilnya positif, tanda berbeda hasilnya negatif, untuk perkalian maupun pembagian.", "Correct, as you concluded: same signs give positive, different signs give negative, for multiplication and division."),
        numbers: [-3, -1, -6, 2, 6],
        forbid: [{ re: /(sama.{0,25}positif|berbeda.{0,25}negatif|same signs?.{0,25}positive|different signs?.{0,25}negative)/, why: "memberi aturan" }],
      },
      { // 5: reflection
        opening: I("Menurutmu, bagaimana penalaran matematis membantu seseorang mengambil keputusan yang mendukung aksi iklim?", "How do you think mathematical reasoning helps someone make decisions that support climate action?"),
        target: I("Dua ide yang masuk akal, misalnya: membandingkan data/pilihan, melihat pola atau tren, menghitung dampak (emisi, energi), memeriksa informasi sebelum memutuskan.",
          "Two sensible ideas, for example: comparing data or options, seeing patterns or trends, working out impacts (emissions, energy), checking information before deciding."),
        reasons: [
          { name: "membandingkan", re: /(membandingkan|bandingkan|memilih|pilihan|compare|choose|option)/ },
          { name: "pola/tren", re: /(pola|tren|kecenderungan|pattern|trend)/ },
          { name: "menghitung dampak", re: /(menghitung|hitung|emisi|energi|karbon|dampak|calculat|emission|energy|carbon|impact)/ },
          { name: "memeriksa informasi", re: /(data|informasi|bukti|fakta|memeriksa|cek|information|evidence|fact|check)/ },
        ],
        need: 2,
        l2: [I("Pikirkan satu keputusan sehari-hari, misalnya memilih jalan kaki atau naik motor. Bagaimana matematika membantu memilih?", "Think of one everyday decision, like walking or riding a motorbike. How does mathematics help you choose?")],
        l3: [I("Kalau kamu tahu berapa emisi tiap pilihan, apa yang bisa kamu lakukan dengan angka itu?", "If you knew the emissions of each option, what could you do with those numbers?")],
        more: I("Itu masuk akal. Apa lagi yang bisa dibantu oleh penalaran matematis?", "That makes sense. What else can mathematical reasoning help with?"),
        confirm: I("Benar, alasanmu masuk akal dan kamu menjelaskannya sendiri.", "Correct, your reasons make sense and you explained them yourself."),
        numbers: [],
        forbid: [],
      },
    ],
  });
})();
