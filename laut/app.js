/* Gorga demo: GeoGebra applet + scaffolding chat. */

// Worker URL for AI mode. Empty = scripted mode (no AI, no network beyond GeoGebra).
const GORGA_API = "https://gorga.zainun.workers.dev";

(function () {
  const TASK = window.GORGA_TASK;
  const T = window.GorgaTutor;

  const $ = (id) => document.getElementById(id);
  const chatLog = $("chat-log");
  const input = $("chat-input");
  const form = $("chat-form");
  const sendBtn = $("send-btn");
  const logBody = $("log-body");

  let api = null;
  let stageIdx = 0;
  let attempts = { wrong: 0 };
  let history = []; // [{role, content}] for the AI
  let log = [];
  let busy = false;
  let done = false;
  let moves = 0;
  let lastMoved = null;

  /* ---------------- GeoGebra ---------------- */

  function readState() {
    if (!api) return { A: 8, B: -25 };
    return {
      A: Math.round(api.getYcoord("A")),
      B: Math.round(api.getYcoord("B")),
    };
  }

  function showState() {
    const s = readState();
    $("val-a").textContent = s.A;
    $("val-b").textContent = s.B;
    renderQuick();
  }

  let snapping = false;
  window.gorgaOnUpdate = function (name) {
    if (!api || snapping || (name !== "A" && name !== "B")) return;
    const x = api.getXcoord(name);
    const y = api.getYcoord(name);
    const r = Math.max(-50, Math.min(25, Math.round(y)));
    if (Math.abs(y - r) > 1e-9) {
      snapping = true;
      api.setCoords(name, x, r);
      snapping = false;
    }
    moves += 1;
    lastMoved = Date.now();
    showState();
  };

  function buildApplet(a) {
    api = a;
    const c = (cmd) => api.evalCommand(cmd);
    api.setAxesVisible(false, true);
    api.setGridVisible(false);
    c("ZoomIn(-12,-55,12,31)");

    c("sky: y >= 0");
    api.setColor("sky", 214, 228, 246);
    api.setFilling("sky", 0.55);
    c("sea: y < 0");
    api.setColor("sea", 62, 82, 124);
    api.setFilling("sea", 0.28);
    for (const n of ["sky", "sea"]) {
      api.setFixed(n, true, false);
      api.setLabelVisible(n, false);
      api.setLineThickness(n, 0);
    }

    c("lvl: y = 0");
    api.setColor("lvl", 201, 161, 91);
    api.setLineThickness("lvl", 6);
    api.setFixed("lvl", true, false);
    api.setLabelVisible("lvl", false);

    c("pA = Segment((-2,-50),(-2,25))");
    c("pB = Segment((5,-50),(5,25))");
    api.setVisible("pA", false);
    api.setVisible("pB", false);

    c("A = Point(pA)");
    c("B = Point(pB)");
    api.setCoords("A", -2, 8);
    api.setCoords("B", 5, -25);
    api.setColor("A", 46, 109, 180);
    api.setColor("B", 20, 29, 51);
    for (const n of ["A", "B"]) {
      api.setPointSize(n, 9);
      api.setLabelVisible(n, false);
    }

    c("hA = Segment((0, y(A)), A)");
    c("hB = Segment((0, y(B)), B)");
    api.setColor("hA", 46, 109, 180);
    api.setColor("hB", 20, 29, 51);
    for (const n of ["hA", "hB"]) {
      api.setLineStyle(n, 1);
      api.setFixed(n, true, false);
      api.setLabelVisible(n, false);
    }

    c('tA = Text("A: " + round(y(A)) + " m", A + (0.8, 2.3))');
    c('tB = Text("B: " + round(y(B)) + " m", B + (0.9, 2.3))');
    api.setColor("tA", 46, 109, 180);
    api.setColor("tB", 20, 29, 51);
    for (const n of ["tA", "tB"]) api.setFixed(n, true, false);

    c('tL = Text("permukaan laut", (-11.6, 1.3))');
    api.setColor("tL", 140, 74, 47);
    api.setFixed("tL", true, false);

    api.registerUpdateListener("gorgaOnUpdate");
    $("applet-loading").remove();
    $("applet-wrap").classList.add("loaded");
    showState();
  }

  function injectApplet() {
    const wrap = $("applet-wrap");
    const w = Math.min(640, Math.max(300, wrap.clientWidth));
    const params = {
      appName: "classic",
      width: w,
      height: Math.round(w * 0.82),
      showToolBar: false,
      showAlgebraInput: false,
      showMenuBar: false,
      showResetIcon: false,
      enableRightClick: false,
      enableShiftDragZoom: false,
      enableLabelDrags: false,
      showZoomButtons: false,
      language: "id",
      perspective: "G",
      borderColor: "#FFFFFF",
      appletOnLoad: (a) => buildApplet(a || window.ggbApplet),
    };
    try {
      new GGBApplet(params, true).inject("ggb");
    } catch (e) {
      $("applet-loading").textContent = "Applet GeoGebra tidak dapat dimuat. Periksa koneksi internet.";
    }
  }

  /* ---------------- Chat UI ---------------- */

  const MOVE_NAME = { Q: "Pertanyaan", L1: "L1 Probe", L2: "L2 Point", L4: "L4 Revoice", R: "Reinforce", HINT: "Petunjuk guru", END: "Penutup" };

  function bubble(role, text, meta) {
    const el = document.createElement("div");
    el.className = `msg ${role}`;
    const p = document.createElement("p");
    p.textContent = text;
    el.appendChild(p);
    if (meta) {
      const m = document.createElement("span");
      m.className = "meta";
      m.textContent = meta;
      el.appendChild(m);
    }
    chatLog.appendChild(el);
    chatLog.scrollTop = chatLog.scrollHeight;
    return el;
  }

  function typing(on) {
    let el = chatLog.querySelector(".typing");
    if (on && !el) {
      el = document.createElement("div");
      el.className = "msg ai typing";
      el.innerHTML = "<p><span></span><span></span><span></span></p>";
      chatLog.appendChild(el);
      chatLog.scrollTop = chatLog.scrollHeight;
    } else if (!on && el) el.remove();
  }

  function ask(stage) {
    bubble("ai question", stage.question, MOVE_NAME.Q);
    history.push({ role: "assistant", content: stage.question });
  }

  function renderQuick() {
    const q = $("quick");
    const s = readState();
    const stage = TASK.stages[stageIdx];
    if (done || !stage) {
      q.hidden = true;
      return;
    }
    const hi = Math.max(s.A, s.B);
    const lo = Math.min(s.A, s.B);
    let ex;
    if (stage.id === "s1") {
      ex = [
        [`${lo} > ${hi} karena ${Math.abs(lo)} lebih besar dari ${Math.abs(hi)}`, "salah"],
        [`${hi} > ${lo}`, "benar tanpa alasan"],
        [`${hi} > ${lo} karena yang ${hi} ada lebih tinggi, ${lo} lebih dalam di bawah permukaan laut`, "benar + alasan"],
      ];
    } else {
      ex = [
        [`${lo} > ${hi} karena ${Math.abs(lo)} lebih besar`, "salah"],
        [`${hi} > ${lo}`, "benar tanpa alasan"],
        [`${hi} > ${lo} karena ${hi} lebih dekat ke permukaan laut`, "benar + alasan"],
      ];
    }
    q.innerHTML = "<span>Coba jawaban contoh:</span>";
    for (const [text, label] of ex) {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = label;
      b.title = text;
      b.addEventListener("click", () => {
        if (busy || done) return;
        input.value = text;
        form.requestSubmit();
      });
      q.appendChild(b);
    }
    q.hidden = done;
  }

  /* ---------------- AI call ---------------- */

  function containsCorrect(reply, a, b) {
    const t = T.normalise(reply).replace(/\s/g, "");
    const pairs = a === b ? [`${a}=${b}`] : a > b ? [`${a}>${b}`, `${b}<${a}`] : [`${a}<${b}`, `${b}>${a}`];
    return pairs.some((p) => t.includes(p));
  }

  async function askAI(payload) {
    if (!GORGA_API) return null;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    try {
      const r = await fetch(`${GORGA_API.replace(/\/$/, "")}/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
        signal: ctrl.signal,
      });
      if (!r.ok) return null;
      const data = await r.json();
      if (!data || !data.reply) return null;
      return data;
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  /* ---------------- Turn ---------------- */

  async function onSubmit(e) {
    e.preventDefault();
    const text = input.value.trim();
    if (!text || busy || done) return;
    input.value = "";
    busy = true;
    sendBtn.disabled = true;

    const stage = TASK.stages[stageIdx];
    const state = readState();
    bubble("student", text);
    history.push({ role: "user", content: text });

    const d = T.analyse(text, state, stage, attempts);
    const script = T.scripted(d, state, stage, TASK, text);

    typing(true);
    const t0 = performance.now();
    const ai = await askAI({
      task: {
        id: TASK.id,
        title: TASK.title,
        unit: TASK.unit,
        objects: TASK.objects,
        misconceptions: TASK.misconceptions,
        moves: TASK.moves,
        fallbackHint: TASK.fallbackHint,
      },
      stage: { id: stage.id, question: stage.question, target: stage.target },
      state: { ...state, moves, secondsSinceMove: lastMoved ? Math.round((Date.now() - lastMoved) / 1000) : null },
      analysis: {
        kind: d.kind,
        label: T.KIND_LABEL[d.kind],
        suggestedMove: d.move,
        misconception: d.misconception || null,
        studentComparison: d.cmp ? d.cmp.text : null,
        wrongAttempts: attempts.wrong,
      },
      scriptReply: script,
      history: history.slice(-10),
    });
    const ms = Math.round(performance.now() - t0);
    if (!ai && ms < 450) await new Promise((r) => setTimeout(r, 450 - ms));
    typing(false);

    let reply = script;
    let move = d.move;
    let source = "naskah";
    if (ai) {
      const leaks = d.kind !== "correct" && containsCorrect(ai.reply, state.A, state.B);
      if (!leaks && MOVE_NAME[ai.move]) {
        reply = ai.reply;
        move = d.move === "R" || d.move === "HINT" ? d.move : ai.move;
        source = ai.model || "AI";
        $("mode-badge").textContent = `Mode AI · ${source}`;
        $("mode-badge").classList.add("on");
      } else {
        source = "naskah (jaga)";
      }
    }

    bubble("ai", reply, `${MOVE_NAME[move] || move} · ${source}`);
    history.push({ role: "assistant", content: reply });

    if (d.kind === "wrong") attempts.wrong += 1;
    addLog({ stage: stage.id, state, text, d, move, source, reply });

    if (d.kind === "correct") {
      attempts = { wrong: 0 };
      stageIdx += 1;
      if (stageIdx < TASK.stages.length) {
        await new Promise((r) => setTimeout(r, 700));
        ask(TASK.stages[stageIdx]);
      } else {
        done = true;
        await new Promise((r) => setTimeout(r, 700));
        bubble("ai end", "Aktivitas demo selesai. Tekan “Ulangi” untuk mencoba jalur jawaban yang lain.", MOVE_NAME.END);
        input.disabled = true;
      }
    }
    renderQuick();
    busy = false;
    sendBtn.disabled = done;
    if (!done) input.focus();
  }

  /* ---------------- Log ---------------- */

  function addLog({ stage, state, text, d, move, source, reply }) {
    const row = {
      turn: log.length + 1,
      time_utc: new Date().toISOString(),
      stage,
      A: state.A,
      B: state.B,
      student_text: text,
      diagnosis: T.KIND_LABEL[d.kind],
      move: MOVE_NAME[move] || move,
      source,
      ai_text: reply,
    };
    log.push(row);
    const tr = document.createElement("tr");
    const cells = [row.turn, row.time_utc.slice(11, 19), row.stage, row.A, row.B, row.student_text, row.diagnosis, row.move, row.source];
    for (const v of cells) {
      const td = document.createElement("td");
      td.textContent = v;
      tr.appendChild(td);
    }
    logBody.appendChild(tr);
  }

  function downloadCSV() {
    const cols = ["turn", "time_utc", "stage", "A", "B", "student_text", "diagnosis", "move", "source", "ai_text"];
    const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
    const csv = [cols.join(","), ...log.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\r\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "nalar-demo-log.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /* ---------------- Start ---------------- */

  function reset() {
    stageIdx = 0;
    attempts = { wrong: 0 };
    history = [];
    done = false;
    busy = false;
    chatLog.innerHTML = "";
    input.disabled = false;
    sendBtn.disabled = false;
    if (api) {
      api.setCoords("A", -2, 8);
      api.setCoords("B", 5, -25);
    }
    ask(TASK.stages[0]);
    showState();
  }

  form.addEventListener("submit", onSubmit);
  $("reset-btn").addEventListener("click", reset);
  $("csv-btn").addEventListener("click", downloadCSV);
  $("teacher-toggle").addEventListener("change", (e) => {
    document.body.classList.toggle("teacher", e.target.checked);
    $("log-pane").hidden = !e.target.checked;
  });
  $("mode-badge").textContent = GORGA_API ? "Mode AI · menyambung…" : "Mode naskah (tanpa AI)";

  ask(TASK.stages[0]);
  renderQuick();
  injectApplet();
})();
