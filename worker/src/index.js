/**
 * Nalar demo — AI layer.
 *
 * POST /chat { task, stage, state, analysis, scriptReply, history } → { reply, move, model }
 *
 * The page does the diagnosis (which comparison is correct, whether the student's numbers
 * match the applet). The model only phrases one scaffolding reply around that diagnosis.
 * A guard rejects replies that reveal the answer; the page then falls back to its script.
 *
 * Model: Llama on Workers AI. The free daily allowance is used; on the Free plan, requests
 * beyond it fail instead of being charged.
 */

const MODEL_MAIN = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
const MODEL_BACKUP = "@cf/meta/llama-3.1-8b-instruct-fast";
const MAX_TURNS = 10;
const MAX_CHARS = 500;
const MOVES = ["L1", "L2", "L3", "L4", "R", "OK", "HINT"];

const ALLOWED_ORIGINS = [
  "https://bukhorizainun.github.io",
  "http://localhost:8765",
  "http://127.0.0.1:8765",
];

function cors(origin) {
  const ok = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "access-control-allow-origin": ok,
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    "access-control-max-age": "86400",
    vary: "origin",
  };
}

const clip = (v, n) => String(v ?? "").slice(0, n);

function systemPrompt(b) {
  const t = b.task || {};
  const s = b.stage || {};
  const st = b.state || {};
  const an = b.analysis || {};
  const moves = Object.entries(t.moves || {})
    .map(([k, v]) => `- ${k}: ${clip(v, 200)}`)
    .join("\n");
  const mis = (t.misconceptions || []).map((m) => `- ${clip(m, 200)}`).join("\n");

  return `Kamu adalah "guru bayangan" dalam aplikasi Nalar. Siswa SMP sedang mengerjakan applet GeoGebra tentang bilangan bulat, lalu menjelaskan cara berpikirnya di chat.

TUGAS
Judul: ${clip(t.title, 120)}
Pertanyaan tahap ini: ${clip(s.question, 400)}
Ide target (JANGAN diucapkan sebelum siswa sendiri menyatakannya): ${clip(s.target, 400)}

MISKONSEPSI YANG SERING MUNCUL
${mis}

DAFTAR LANGKAH SCAFFOLDING GURU (pilih tepat satu)
${moves}

KEADAAN APPLET SAAT INI (dibaca langsung dari GeoGebra)
${b.context ? clip(b.context, 600) : `- Lumba-lumba A (biru) di ${st.A} ${t.unit || "m"}
- Lumba-lumba B (hitam) di ${st.B} ${t.unit || "m"}
- Permukaan laut = 0. Positif = di atas permukaan, negatif = di bawah permukaan.`}

DIAGNOSIS DARI SISTEM (sudah pasti benar, jangan dibantah)
- Jenis jawaban: ${clip(an.label, 80)}
- Perbandingan yang ditulis siswa: ${an.studentComparison || "tidak ada"}
- Jawaban akhir siswa sudah benar: ${an.answerCorrect ? "ya" : "belum"}
- Miskonsepsi terdeteksi: ${an.misconception || "tidak ada"}
- Percobaan salah sebelumnya: ${Number(an.wrongAttempts) || 0}
- Langkah yang disarankan: ${an.suggestedMove}

CONTOH BALASAN DARI NASKAH GURU (boleh kamu ubah kalimatnya agar lebih alami, isinya tetap)
${clip(b.scriptReply, 500)}

ATURAN KERAS
1. Jangan pernah menyebut jawaban akhir atau perbandingan yang benar sebelum siswa menulisnya sendiri.
2. Tepat satu pertanyaan per balasan (kecuali langkah R boleh tanpa pertanyaan).
3. Maksimal 2 kalimat pendek, maksimal 45 kata. Bahasa Indonesia sederhana, sapa dengan "kamu".
4. Semua angka harus sama dengan keadaan applet di atas. Jangan mengarang angka lain.
5. Jangan menilai siswa dengan kata "salah" secara langsung; ajak ia melihat lagi.
6. Tanpa emoji, tanpa markdown.
7. Pakai langkah yang disarankan sistem. Jangan memberi cara penyelesaian yang belum disebut siswa atau naskah.${b.context ? `
8. Termometer itu tegak: suhu naik = penanda ke atas, suhu turun = penanda ke bawah.` : ""}

FORMAT KELUARAN
Balas HANYA dengan JSON satu baris: {"move":"<langkah dari daftar>","reply":"<teks untuk siswa>"}`;
}

function parseJSON(text) {
  if (text && typeof text === "object") return text;
  const m = String(text || "").match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    return JSON.parse(m[0]);
  } catch {
    return null;
  }
}

function normalise(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[−–—]/g, "-")
    .replace(/\s/g, "");
}

/** True when the reply states the correct comparison of the two applet values. */
function leaksAnswer(reply, a, b) {
  const t = normalise(reply);
  const pairs = a === b ? [`${a}=${b}`] : a > b ? [`${a}>${b}`, `${b}<${a}`] : [`${a}<${b}`, `${b}>${a}`];
  return pairs.some((p) => t.includes(p));
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("origin") || "";
    const h = cors(origin);
    const send = (status, data) =>
      new Response(JSON.stringify(data), {
        status,
        headers: { ...h, "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
      });

    if (request.method === "OPTIONS") return new Response(null, { headers: h });
    if (request.method !== "POST") return send(405, { error: "POST only" });
    if (!ALLOWED_ORIGINS.includes(origin)) return send(403, { error: "origin not allowed" });

    const { pathname } = new URL(request.url);
    if (pathname !== "/chat") return send(404, { error: "not found" });

    let b;
    try {
      b = await request.json();
    } catch {
      return send(400, { error: "bad json" });
    }

    // Two page types: the dolphin task sends A/B, other tasks send a context text and
    // a list of strings the reply must not contain yet.
    const forbid = Array.isArray(b.forbid) ? b.forbid.map((f) => normalise(f)).filter(Boolean).slice(0, 10) : null;
    const a = Number(b?.state?.A);
    const bb = Number(b?.state?.B);
    if (!forbid && (!Number.isFinite(a) || !Number.isFinite(bb))) return send(400, { error: "missing state" });

    const turns = (Array.isArray(b.history) ? b.history : [])
      .filter((m) => m && (m.role === "user" || m.role === "assistant"))
      .slice(-MAX_TURNS)
      .map((m) => ({ role: m.role, content: clip(m.content, MAX_CHARS) }))
      .filter((m) => m.content.trim());
    if (!turns.length || turns[turns.length - 1].role !== "user") return send(400, { error: "no student turn" });

    const messages = [{ role: "system", content: systemPrompt(b) }, ...turns];
    const correct = b?.analysis?.kind === "correct";

    for (const model of [MODEL_MAIN, MODEL_BACKUP]) {
      try {
        const out = await env.AI.run(model, { messages, max_tokens: 220, temperature: 0.3 });
        const j = parseJSON(out?.response);
        const reply = clip(j?.reply, 400).trim();
        const move = MOVES.includes(j?.move) ? j.move : null;
        if (!reply || !move) continue;
        if (forbid) {
          const t = normalise(reply);
          if (forbid.some((f) => new RegExp(`(^|[^0-9])${f}([^0-9]|$)`).test(t))) continue;
          // Keep the move the page chose, and no numbers beyond the script and the student's text.
          if (b?.analysis?.suggestedMove && move !== b.analysis.suggestedMove) continue;
          const nums = (x) => (normalise(x).match(/\d+/g) || []).map(Number);
          const allowed = new Set([...nums(b.scriptReply), ...nums(turns[turns.length - 1].content)]);
          if (nums(reply).some((n) => !allowed.has(n))) continue;
          if (String(b.scriptReply || "").includes("?") && !reply.includes("?")) continue;
        } else if (!correct && leaksAnswer(reply, a, bb)) continue;
        return send(200, { reply, move, model: model.split("/").pop() });
      } catch {
        // allowance used up or model busy: try the next model
      }
    }
    return send(502, { error: "no usable reply" });
  },
};
