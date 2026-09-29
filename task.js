/* Task card for Task 15. In the full product this comes from the teacher's
   spreadsheet; here it is a plain object so the demo runs without a server. */

window.GORGA_TASK = {
  id: "bilangan/15",
  title: "Permukaan laut dan kedalaman laut",
  unit: "m",
  objects: { A: "Lumba-lumba A (biru)", B: "Lumba-lumba B (hitam)" },
  stages: [
    {
      id: "s1",
      question:
        "Geser kedua lumba-lumba ke posisi yang kamu mau. Lumba-lumba mana yang lebih tinggi? " +
        "Tulis perbandingan posisinya dengan tanda < atau >, lalu jelaskan arti tiap bilangan.",
      target:
        "Perbandingan sesuai posisi di applet, dan siswa menjelaskan bahwa bilangan positif berarti di atas " +
        "permukaan laut dan bilangan negatif berarti di bawah permukaan laut. Posisi yang lebih rendah = bilangan lebih kecil.",
      require: null,
    },
    {
      id: "s2",
      question:
        "Sekarang geser lumba-lumba A ke bawah permukaan laut juga, jadi keduanya di dalam air. " +
        "Mana yang lebih besar sekarang? Tulis perbandingannya dan jelaskan alasannya.",
      target:
        "Di antara dua bilangan negatif, yang lebih dekat ke permukaan laut (0) lebih besar, misalnya -10 > -25.",
      require: "bothNegative",
    },
  ],
  misconceptions: [
    "Membandingkan nilai mutlak: menganggap -25 > 8 karena 25 > 8.",
    "Membaca kedalaman sebagai bilangan positif.",
    "Di antara dua bilangan negatif, menganggap yang angkanya lebih besar (mis. -25) lebih besar.",
  ],
  moves: {
    L1: "Probe: pertanyaan terbuka yang mengajak siswa melihat lagi applet atau jawabannya sendiri.",
    L2: "Point: mengarahkan perhatian ke satu hal spesifik (satu lumba-lumba, garis permukaan laut, satu angka).",
    L4: "Revoice: mengulang ide siswa dengan kata lain, lalu minta siswa menjelaskan atau menuliskannya dengan simbol.",
    R: "Reinforce: penguatan singkat untuk jawaban benar, diikuti pertanyaan lanjutan.",
    HINT: "Petunjuk cadangan dari guru, dipakai setelah dua kali percobaan belum berhasil.",
  },
  fallbackHint:
    "Letakkan jarimu di garis permukaan laut (0). Lumba-lumba mana yang ada di bawah jarimu? " +
    "Bilangan untuk posisi itu lebih kecil atau lebih besar dari 0?",
};
