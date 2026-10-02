/* Task card, Applet 7 "Estimating carbon emissions" (DRAFT for the teacher to confirm).
   The teacher's activity: 7.6 kg per trip, 9.6 trips -> round to 8 × 10 = 80 kg (exact 72.96).
   The applet shows its own random products with an area model. Both questions are reflections. */
(function () {
  const { make } = window.GorgaCardEngine;
  const I = (id, en) => ({ id, en });

  make(7, {
    howTo: I("Pakai panah di aplet untuk membulatkan tiap bilangan desimal, lalu lihat model luasnya untuk hasil sebenarnya. Apa yang kamu lihat?",
      "Use the arrows in the applet to round each decimal, then look at the area model for the exact result. What do you see?"),
    questions: [
      { // 1: why estimate first
        opening: I("Apa manfaat memperkirakan hasil perkalian sebelum menghitung hasil sebenarnya? Kamu boleh memakai contoh 7,6 × 9,6.",
          "What is the benefit of estimating a product before working out the exact result? You may use the example 7.6 × 9.6."),
        target: I("Dua ide, misalnya: cepat mendapat gambaran besarnya hasil; memeriksa apakah hasil sebenarnya masuk akal / mendeteksi kesalahan; cukup untuk mengambil keputusan cepat.",
          "Two ideas, for example: a quick sense of how big the result is; checking whether the exact result makes sense / spotting mistakes; good enough for a quick decision."),
        reasons: [
          { name: "cepat/gambaran", re: /(cepat|mudah|gambaran|kira-kira|perkiraan|sekitar|quick|fast|easy|rough|idea of|about)/ },
          { name: "memeriksa hasil", re: /(memeriksa|cek|mengecek|masuk akal|salah hitung|kesalahan|benar atau tidak|mendekati|check|makes sense|reasonable|mistake|error|close to)/ },
          { name: "contoh 8 × 10 = 80", re: /(8\s*[x×*]\s*10|10\s*[x×*]\s*8|\b80\b|72[.,]96|\b73\b)/ },
          { name: "keputusan", re: /(keputusan|memutuskan|memilih|decide|decision|choose)/ },
        ],
        need: 2,
        l2: [I("Lihat aplet: hasil estimasi dan hasil sebenarnya ditampilkan berdampingan. Seberapa dekat keduanya?", "Look at the applet: the estimate and the exact result are shown side by side. How close are they?")],
        l3: [I("7,6 dibulatkan jadi 8 dan 9,6 jadi 10. Berapa 8 × 10, dan apa gunanya angka itu sebelum menghitung 7,6 × 9,6?", "7.6 rounds to 8 and 9.6 to 10. What is 8 × 10, and what is that number good for before you work out 7.6 × 9.6?")],
        more: I("Itu satu manfaat. Bagaimana estimasi membantumu memeriksa hasil hitunganmu?", "That is one benefit. How does an estimate help you check your calculation?"),
        confirm: I("Benar, seperti alasanmu: estimasi memberi gambaran cepat dan membantu memeriksa hasil sebenarnya.", "Correct, as you reasoned: an estimate gives a quick picture and helps check the exact result."),
        numbers: [7.6, 9.6, 8, 10],
        forbid: [{ re: /(memeriksa|masuk akal|check|makes sense)/, why: "memberi ide target" }],
      },
      { // 2: estimation and eco-friendly choices
        opening: I("Bagaimana memperkirakan emisi karbon atau penggunaan energi membantu kita memilih tindakan yang lebih ramah lingkungan?",
          "How does estimating carbon emissions or energy use help us choose more eco-friendly actions?"),
        target: I("Dua ide, misalnya: membandingkan pilihan dengan cepat (misalnya kendaraan pribadi vs jalan kaki/transportasi umum), melihat seberapa besar dampaknya, merencanakan pengurangan emisi.",
          "Two ideas, for example: comparing options quickly (e.g. private car vs walking/public transport), seeing how big the impact is, planning to cut emissions."),
        reasons: [
          { name: "membandingkan pilihan", re: /(membandingkan|bandingkan|memilih|pilihan|dibanding|compare|choose|option|instead)/ },
          { name: "besar dampak", re: /(dampak|seberapa (besar|banyak)|banyak(nya)? emisi|total|impact|how (much|big))/ },
          { name: "mengurangi/merencanakan", re: /(mengurangi|kurangi|hemat|merencanakan|rencana|target|reduce|save|plan)/ },
          { name: "contoh tindakan", re: /(jalan kaki|sepeda|transportasi umum|bus|kereta|listrik|lampu|walk|bike|bicycle|public transport|train|electricity|light)/ },
        ],
        need: 2,
        l2: [I("Ingat contoh aktivitas: 7,6 kg emisi per perjalanan kendaraan pribadi. Apa yang bisa kamu lakukan dengan perkiraan totalnya?", "Remember the example: 7.6 kg of emissions per car trip. What could you do with an estimate of the total?")],
        l3: [I("Kalau kamu tahu perkiraan emisi naik mobil dan jalan kaki, bagaimana kamu memilih?", "If you knew the estimated emissions of driving and of walking, how would you choose?")],
        more: I("Itu masuk akal. Apa lagi yang bisa dibantu oleh perkiraan itu?", "That makes sense. What else can that estimate help with?"),
        confirm: I("Benar, alasanmu masuk akal dan kamu menjelaskannya sendiri.", "Correct, your reasons make sense and you explained them yourself."),
        numbers: [7.6],
        forbid: [],
      },
    ],
  });
})();
