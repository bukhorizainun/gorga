/* Gorga activity page for the teacher's activities without a task card yet.
   The applet and the questions come from assets/activities.json (fetched from GeoGebra).
   General protocol: help rises one level every two turns (sooner when the student is stuck),
   the tutor never gives the answer, and the AI may confirm only from the second turn on,
   when the student's answer and reason are complete. */

const GORGA_API = "https://gorga.rahmiumar.workers.dev";

(function () {
  const EN = window.GORGA_LANG === "en";
  const tr = (id, en) => (EN ? en : id);
  const L = (pair) => (EN && pair && pair.en ? pair.en : (pair && pair.id) || "");
  const $ = (id) => document.getElementById(id);
  const chatLog = $("chat-log");
  const input = $("chat-input");
  const form = $("chat-form");
  const sendBtn = $("send-btn");
  const SCRIPT = tr("naskah", "script");

  const n = Math.max(1, Math.min(7, parseInt(new URLSearchParams(location.search).get("a"), 10) || 2));
  $("lang-id").href = `?a=${n}&lang=id`;
  $("lang-en").href = `?a=${n}&lang=en`;

  const HELP = { L1: 1, L4: 1, L2: 2, L3: 3, HINT: 4, OK: 0 };
  const MOVE_NAME = {
    L1: "L1 Probe", L2: "L2 Point", L3: tr("L3 Langkah terarah", "L3 Guided step"), L4: "L4 Revoice",
    OK: tr("Konfirmasi", "Confirmation"), HINT: tr("Petunjuk", "Hint"),
  };
  const STEP_WORD = EN
    ? { L1: "Asking", L4: "Revoicing", L2: "Pointing", L3: "Breaking down", HINT: "Hint", OK: "Found" }
    : { L1: "Bertanya", L4: "Mengulang", L2: "Menunjuk", L3: "Memecah", HINT: "Petunjuk", OK: "Ditemukan" };
  const LEVEL_NAME = EN
    ? { 1: "L1 · L4 · asking and revoicing", 2: "L2 · pointing at one thing", 3: "L3 · breaking the question down", 4: "Hint · clearer help" }
    : { 1: "L1 · L4 · bertanya dan mengulang", 2: "L2 · menunjuk satu hal", 3: "L3 · memecah soal", 4: "Petunjuk · bantuan lebih jelas" };
  const DONTKNOW = /(tidak tahu|gak tau|ga tau|gatau|nggak tahu|belum tahu|bingung|ga ngerti|gak ngerti|tidak mengerti|don'?t know|not sure|no idea|idk|confused)/i;

  // Scripted fallbacks, one per level of help.
  const FALLBACK = EN ? {
    L1: "Try it in the applet first. What do you notice, and how did you get your answer?",
    L4: (q) => `So your idea is: “${q}”. Can you explain why?`,
    L2: "Look at the applet again. Which part of it helps you answer this question?",
    L3: "Let's break it down: what does the applet show you, and what exactly does the question ask?",
    HINT: "Read the question again slowly, then write the first step you would take in the applet.",
  } : {
    L1: "Coba kerjakan di applet dulu. Apa yang kamu temukan, dan bagaimana kamu mendapatkan jawabanmu?",
    L4: (q) => `Jadi menurutmu, “${q}”. Bisa kamu jelaskan kenapa?`,
    L2: "Perhatikan lagi applet-nya. Bagian mana yang membantumu menjawab pertanyaan ini?",
    L3: "Coba kita pecah: apa yang ditunjukkan applet, dan apa sebenarnya yang ditanyakan soal ini?",
    HINT: "Baca lagi pertanyaannya pelan-pelan, lalu tuliskan satu langkah pertama yang kamu lakukan di applet.",
  };

  let act = null;
  let questions = [];
  let qi = 0;
  let state = []; // per question: {turns, stuck, done, history, dom}
  let log = [];
  let busy = false;
  let api = null;

  const plain = (html) => { const d = document.createElement("div"); d.innerHTML = html; return d.textContent.replace(/\s+/g, " ").trim(); };
  const numbersIn = (t) => (String(t).replace(/[−–—]/g, "-").match(/-?\d+/g) || []).map(Number);

  /* ---------------- page from data ---------------- */

  async function load() {
    const all = await (await fetch("../assets/activities.json")).json();
    act = all.find((a) => a.n === n);
    document.title = `${L(act.title)} — Gorga`;
    $("act-title").textContent = L(act.title);
    $("act-title").classList.toggle("long", L(act.title).length > 45);
    if (n === 1) {
      const a = document.createElement("a");
      a.className = "sibling";
      a.href = `../suhu/?lang=${EN ? "en" : "id"}`;
      a.textContent = tr("Versi protokol penuh dengan kartu tugas: Skala Suhu →", "Full-protocol version with a task card: Temperature Scale →");
      $("act-title").after(a);
    }
    $("crumb-here").textContent = `${tr("Applet", "Applet")} ${n}`;
    $("act-no").textContent = tr(`Applet ${n} dari 7`, `Applet ${n} of 7`);

    // Links to the other six activities.
    $("act-steps").innerHTML = all.map((a) => {
      const href = a.n === 1 ? `../suhu/?lang=${EN ? "en" : "id"}` : `?a=${a.n}&lang=${EN ? "en" : "id"}`;
      return `<a href="${href}"${a.n === n ? ' aria-current="page"' : ""} title="${plain(L(a.title))}">${a.n}</a>`;
    }).join("");

    const texts = act.items.filter((i) => i.type === "text");
    const intro = texts[0];
    if (intro) {
      const body = L(intro.body).split("\n").filter(Boolean);
      $("intro-lead").innerHTML = " " + body[0];
      $("intro-rest").innerHTML = body.slice(1).map((p) => `<p>${p}</p>`).join("");
      if (body.length < 2) $("intro-rest").remove();
    }
    // Instructions that sit between the applet and the questions.
    $("notes").innerHTML = texts.slice(1).map((t) =>
      `<div class="note-card">${L(t.title) ? `<span class="label">${L(t.title)}</span>` : ""}<div>${L(t.body).replace(/\n/g, "<br>")}</div></div>`).join("");

    questions = act.items.filter((i) => i.type === "question");
    state = questions.map(() => ({ turns: 0, stuck: 0, done: false, history: [], nodes: [], path: [] }));
    $("q-dots").innerHTML = questions.map((_, i) => `<button type="button" data-q="${i}" aria-label="${tr("Soal", "Question")} ${i + 1}"></button>`).join("");
    $("q-dots").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) show(Number(b.dataset.q)); });
    $("st-done-note").textContent = tr(`dari ${questions.length}`, `of ${questions.length}`);

    const applet = act.items.find((i) => i.type === "applet");
    injectApplet(applet ? applet.material : act.activity);
    show(0);
  }

  function injectApplet(material) {
    try {
      new GGBApplet({
        material_id: material,
        scaleContainerClass: "applet-wrap",
        allowUpscale: false,
        showToolBar: false, showAlgebraInput: false, showMenuBar: false,
        enableShiftDragZoom: false, showZoomButtons: false, borderColor: "#FFFFFF",
        appletOnLoad: (a) => {
          api = a || window.ggbApplet;
          // Replace only the thermometer applet's pale green view, which clashes with the page.
          try {
            if (/<bgColor r="226" g="244" b="217"/.test(api.getXML())) api.setGraphicsOptions(1, { bgColor: "#F3F5FB" });
          } catch { /* keep the applet colour */ }
          // Keep the frame in the applet's own proportions so it scales on any screen.
          const m = String(api.getXML()).match(/<size width="(\d+)" height="(\d+)"/);
          if (m) $("applet-wrap").style.aspectRatio = `${m[1]} / ${m[2]}`;
          $("applet-loading").remove();
          $("applet-wrap").classList.add("loaded");
        },
      }, true).inject("ggb");
    } catch {
      $("applet-loading").textContent = tr("Applet GeoGebra tidak dapat dimuat.", "The GeoGebra applet could not load.");
    }
  }

  /* ---------------- questions ---------------- */

  function show(i) {
    qi = i;
    const q = questions[i];
    const st = state[i];
    $("q-no").textContent = tr(`Soal ${i + 1} dari ${questions.length}`, `Question ${i + 1} of ${questions.length}`) +
      (L(q.title) ? ` · ${L(q.title)}` : "");
    $("q-text").innerHTML = L(q.body).replace(/\n/g, "<br>");
    $("q-prev").disabled = i === 0;
    $("q-next").disabled = i === questions.length - 1;
    [...$("q-dots").children].forEach((b, k) => {
      b.classList.toggle("on", k === i);
      b.classList.toggle("done", state[k].done);
    });
    chatLog.innerHTML = "";
    if (!st.nodes.length) {
      const open = FALLBACK.L1;
      st.nodes.push(msgNode("ai", open, `${MOVE_NAME.L1} · ${SCRIPT}`));
      st.history.push({ role: "assistant", content: open });
      st.path.push("L1");
    }
    st.nodes.forEach((el) => chatLog.appendChild(el));
    chatLog.scrollTop = chatLog.scrollHeight;
    renderPath(st.path);
    renderLevel(level(st));
    input.disabled = st.done;
    sendBtn.disabled = st.done;
    input.placeholder = st.done ? tr("Soal ini sudah tuntas. Lanjut ke soal berikutnya →", "This question is done. Go to the next one →")
      : tr("Tulis jawaban dan alasanmu…", "Write your answer and your reason…");
  }

  function level(st) {
    // Two turns per level; each "I don't know" moves one level up. First reply stays at level 1.
    return Math.min(4, 1 + Math.floor(Math.max(0, st.turns - 1) / 2) + st.stuck);
  }

  function renderLevel(lv) {
    [...$("level-meter").children].forEach((el, k) => el.classList.toggle("on", k < lv));
    $("level-name").textContent = LEVEL_NAME[lv];
  }

  function renderPath(path) {
    const j = $("journey");
    j.innerHTML = path.length ? "" : `<li class="empty">${tr("Belum ada langkah.", "No steps yet.")}</li>`;
    for (const move of path) {
      const li = document.createElement("li");
      li.innerHTML = `<span class="step${move === "OK" ? " goal" : ""}" data-move="${move}"><i></i>${STEP_WORD[move] || move}<span class="code">${move === "OK" ? "✓" : move}</span></span>`;
      j.appendChild(li);
    }
  }

  function msgNode(cls, text, meta) {
    const el = document.createElement("div");
    el.className = `msg ${cls}`;
    const p = document.createElement("p");
    p.textContent = text;
    el.appendChild(p);
    if (meta) {
      const m = document.createElement("span");
      m.className = "meta";
      m.textContent = meta;
      el.appendChild(m);
    }
    return el;
  }

  function add(node) {
    state[qi].nodes.push(node);
    chatLog.appendChild(node);
    chatLog.scrollTop = chatLog.scrollHeight;
  }

  /* ---------------- a turn ---------------- */

  async function ask(payload) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 20000);
    try {
      const r = await fetch(`${GORGA_API}/chat`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify(payload), signal: ctrl.signal,
      });
      return r.ok ? await r.json() : null;
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  function guardOK(ai, lim) {
    if (!ai || !ai.reply) return false;
    const confirming = ai.move === "OK" && lim.mayConfirm;
    if (!confirming && (HELP[ai.move] ?? 9) > lim.maxHelp) return false;
    if (numbersIn(ai.reply).some((x) => !lim.allowNumbers.includes(x))) return false;
    if (!confirming && /\b(benar|salah|betul|tepat|memang|correct|wrong|right|exactly|well done)\b/i.test(ai.reply)) return false;
    if (!confirming && !ai.reply.includes("?")) return false;
    return true;
  }

  async function onSubmit(e) {
    e.preventDefault();
    const text = input.value.trim();
    const st = state[qi];
    if (!text || busy || st.done) return;
    input.value = "";
    busy = true;
    sendBtn.disabled = true;
    add(msgNode("student", text));
    st.history.push({ role: "user", content: text });
    st.turns += 1;
    if (DONTKNOW.test(text)) st.stuck += 1;
    const lv = level(st);
    const q = questions[qi];
    const context = [L(act.title), ...act.items.filter((i) => i.type === "text").map((t) => plain(L(t.body)))].join(" — ");
    const studentNums = st.history.filter((h) => h.role === "user").flatMap((h) => numbersIn(h.content));
    const lim = {
      goal: false,
      mayConfirm: st.turns >= 2,
      maxHelp: lv,
      allowNumbers: [...new Set([...numbersIn(plain(L(q.body))), ...numbersIn(context), ...studentNums])],
      zeroOK: true,
      splitOK: true,
      facts: [
        `Giliran siswa untuk soal ini: ${st.turns}. Siswa bilang tidak tahu: ${st.stuck} kali.`,
        "Belum ada kartu tugas dari guru untuk soal ini; nilai dari pertanyaan dan konteks aktivitas.",
      ],
    };

    const typingEl = msgNode("ai typing", "");
    typingEl.querySelector("p").innerHTML = "<span></span><span></span><span></span>";
    chatLog.appendChild(typingEl);
    chatLog.scrollTop = chatLog.scrollHeight;
    const ai = await ask({
      open: true, lang: EN ? "en" : "id", lead: lim, forbid: [],
      stage: { id: `a${n}q${qi + 1}`, question: plain(L(q.body)) },
      context, analysis: { suggestedMove: lv === 1 ? "L4" : lv === 2 ? "L2" : lv === 3 ? "L3" : "HINT" },
      history: st.history.slice(-10),
    });
    typingEl.remove();

    let reply, move, source;
    if (guardOK(ai, lim)) {
      reply = ai.reply;
      move = ai.move === "OK" && lim.mayConfirm ? "OK" : ai.move;
      source = ai.model || "AI";
      $("mode-badge").textContent = tr("Poda · AI aktif", "Poda · AI on");
      $("mode-badge").classList.add("on");
    } else {
      move = st.turns === 1 ? "L4" : lv === 1 ? "L4" : lv === 2 ? "L2" : lv === 3 ? "L3" : "HINT";
      const f = FALLBACK[move];
      reply = typeof f === "function" ? f(text.length > 90 ? `${text.slice(0, 87)}…` : text) : f;
      source = SCRIPT;
    }
    add(msgNode(move === "OK" ? "ai confirm" : "ai", reply, `${MOVE_NAME[move] || move} · ${source}`));
    st.history.push({ role: "assistant", content: reply });
    st.path.push(move);
    renderPath(st.path);
    renderLevel(level(st));
    addLog(text, move, source, reply);

    if (move === "OK") {
      st.done = true;
      [...$("q-dots").children][qi].classList.add("done");
      if (qi < questions.length - 1) {
        const next = document.createElement("div");
        next.className = "chat-note next-q";
        next.innerHTML = `<button type="button" class="btn small">${tr("Soal berikutnya", "Next question")} <span class="arrow">→</span></button>`;
        next.querySelector("button").addEventListener("click", () => show(qi + 1));
        add(next);
      } else {
        add(Object.assign(document.createElement("div"), {
          className: "chat-note",
          textContent: tr("Semua soal di aktivitas ini sudah tuntas.", "All questions in this activity are done."),
        }));
      }
      input.disabled = true;
    }
    busy = false;
    sendBtn.disabled = st.done;
    if (!st.done) input.focus();
  }

  /* ---------------- teacher mode ---------------- */

  function addLog(text, move, source, reply) {
    const row = { turn: log.length + 1, time_utc: new Date().toISOString(), question: qi + 1, student_text: text,
      move, source, ai_text: reply };
    log.push(row);
    const tr_ = document.createElement("tr");
    for (const v of [row.turn, row.time_utc.slice(11, 19), row.question, text, MOVE_NAME[move] || move, source, reply]) {
      const td = document.createElement("td");
      td.textContent = v;
      tr_.appendChild(td);
    }
    $("log-body").appendChild(tr_);
    $("st-turns").textContent = log.length;
    const ai = log.filter((r) => !r.source.startsWith(SCRIPT)).length;
    $("st-ai").textContent = `${Math.round((100 * ai) / log.length)}%`;
    $("st-done").textContent = state.filter((s) => s.done).length;
    const counts = { L1: 0, L2: 0, L3: 0, L4: 0 };
    for (const r of log) if (r.move in counts) counts[r.move] += 1;
    const max = Math.max(1, ...Object.values(counts));
    $("st-bars").innerHTML = Object.entries(counts)
      .map(([k, v]) => `<div>${k}<span class="b" style="width:${Math.round((100 * v) / max)}%"></span>${v}</div>`).join("");
  }

  function downloadCSV() {
    const cols = ["turn", "time_utc", "question", "student_text", "move", "source", "ai_text"];
    const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
    const csv = [cols.join(","), ...log.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    a.download = `gorga-applet-${n}-log.csv`;
    a.click();
  }

  function copyTranscript() {
    const lines = [];
    questions.forEach((q, i) => {
      if (!state[i].history.length) return;
      lines.push(`— ${tr("Soal", "Question")} ${i + 1}: ${plain(L(q.body))} —`);
      for (const h of state[i].history) lines.push(`${h.role === "user" ? tr("Siswa", "Student") : "Poda"}: ${h.content}`);
    });
    const btn = $("copy-btn");
    const old = btn.textContent;
    navigator.clipboard.writeText(lines.join("\n")).then(
      () => { btn.textContent = tr("Tersalin", "Copied"); setTimeout(() => (btn.textContent = old), 1400); },
      () => { btn.textContent = tr("Gagal menyalin", "Copy failed"); setTimeout(() => (btn.textContent = old), 1400); });
  }

  form.addEventListener("submit", onSubmit);
  $("q-prev").addEventListener("click", () => qi > 0 && show(qi - 1));
  $("q-next").addEventListener("click", () => qi < questions.length - 1 && show(qi + 1));
  $("csv-btn").addEventListener("click", downloadCSV);
  $("copy-btn").addEventListener("click", copyTranscript);
  $("teacher-toggle").addEventListener("change", (e) => {
    document.body.classList.toggle("teacher", e.target.checked);
    $("log-pane").hidden = !e.target.checked;
  });
  $("mode-badge").textContent = "Poda · AI";
  load();
})();
