/* Task card for "Tahap 1: Skala Suhu". The protocol follows the teacher's own tutor
   instructions (L1 first; a correct answer is not called correct yet but gets L4; a wrong
   answer gets L2 then L3; counting one by one is not enough; the session ends with a
   confirmation once the answer and the target reasoning, splitting at 0, are both there). */

window.SUHU_TASK = {
  id: "bilangan/skala-suhu",
  title: "Skala suhu",
  unit: "°C",
  range: [-10, 10],
  stages: [
    {
      id: "soal1",
      start: -6,
      end: 4,
      question: "Suhu awal −6 °C. Berapa kenaikan suhu yang diperlukan untuk mencapai 4 °C?",
      origin: "soal dari sesi guru",
    },
    {
      id: "soal2",
      start: 3,
      end: -5,
      question: "Suhu awal 3 °C, lalu turun sampai −5 °C. Berapa derajat penurunan suhunya?",
      origin: "contoh tambahan untuk demo",
    },
  ],
  target:
    "Untuk perubahan yang melewati 0, siswa memecah perubahan di 0: dari suhu awal ke 0, lalu dari 0 ke suhu akhir, " +
    "kemudian menjumlahkan kedua bagian (misalnya dari −6 ke 0 naik 6, dari 0 ke 4 naik 4, jadi naik 10).",
  misconceptions: [
    "Mengurangkan angka tanpa memperhatikan tanda, misalnya 6 − 4 = 2.",
    "Menghitung angka di termometer, bukan lompatannya (menjawab 11, bukan 10).",
    "Memberi tanda negatif pada kenaikan (menjawab −10).",
    "Menghitung satu per satu tanpa melihat 0 sebagai titik pemecah.",
  ],
  moves: {
    L1: "Probe: meminta siswa mencoba dengan termometer dan menjelaskan caranya.",
    L2: "Point: mengarahkan perhatian ke satu hal di termometer (titik awal, arah gerak, angka 0).",
    L3: "Langkah terarah: memecah soal menjadi pertanyaan yang lebih kecil. (Definisi sementara, menunggu rumusan guru.)",
    L4: "Revoice: mengulang jawaban siswa lalu meminta penjelasan atau cara yang lebih ringkas.",
    OK: "Konfirmasi akhir: jawaban benar dan penalaran target sudah muncul.",
    HINT: "Petunjuk cadangan dari guru setelah beberapa percobaan belum berhasil.",
  },
};
