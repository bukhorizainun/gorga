/* Nalar demo, temperature task: the question and the answer box live inside the applet;
   the chat only probes how the student got the answer. */

// Worker URL for AI mode. Empty = scripted mode (no AI, no network beyond GeoGebra).
const NALAR_API = "";

(function () {
  const TASK = window.SUHU_TASK;
  const T = window.SuhuTutor;

  const $ = (id) => document.getElementById(id);
  const chatLog = $("chat-log");
  const input = $("chat-input");
  const form = $("chat-form");
  const sendBtn = $("send-btn");
  const logBody = $("log-body");

  // Applet size in GeoGebra pixels; the page scales it to the column width.
  const W = 600;
  const H = 520;
  const VIEW = { xmin: -5, xmax: 15, ymin: -13.5, ymax: 12 };
  const QX = 3.2; // left edge of the question block, in applet units

  let api = null;
  let stageIdx = 0;
  let mem = null;
  let history = [];
  let log = [];
  let busy = false;
  let done = false;
  let quiet = false; // true while the page itself changes the applet
  let qObjects = [];

  const stage = () => TASK.stages[stageIdx];
  const px = (x) => Math.round(((x - VIEW.xmin) / (VIEW.xmax - VIEW.xmin)) * W);
  const py = (y) => Math.round(((VIEW.ymax - y) / (VIEW.ymax - VIEW.ymin)) * H);

  /* ---------------- GeoGebra ---------------- */

  function marker() {
    return api ? Math.round(api.getYcoord("P")) : 0;
  }

  function appletAnswer() {
    return api ? String(api.getValueString("jwb") || "").trim() : "";
  }

  function showState() {
    $("val-t").textContent = T.deg(marker());
    const a = appletAnswer();
    $("val-ans").textContent = a || "–";
  }

  window.suhuOnUpdate = function (name) {
    if (!api || quiet) return;
    if (name === "P") {
      const y = api.getYcoord("P");
      const r = Math.max(TASK.range[0], Math.min(TASK.range[1], Math.round(y)));
      if (Math.abs(y - r) > 1e-9) {
        quiet = true;
        api.setCoords("P", 0, r);
        quiet = false;
      }
      showState();
    } else if (name === "jwb") {
      showState();
      const a = appletAnswer();
      if (a) onAppletAnswer(a);
    }
  };

  function style(name, rgb, opts = {}) {
    if (rgb) api.setColor(name, ...rgb);
    if (opts.fill !== undefined) api.setFilling(name, opts.fill);
    if (opts.line !== undefined) api.setLineThickness(name, opts.line);
    api.setLabelVisible(name, false);
    if (opts.fixed !== false) api.setFixed(name, true, false);
  }

  const NILA = [20, 29, 51];
  const SOGA = [176, 102, 63];
  const EMAS = [201, 161, 91];
  const INK3 = [128, 120, 104];

  function buildApplet(a) {
    api = a;
    const c = (cmd) => api.evalCommand(cmd);
    api.setAxesVisible(false, false);
    api.setGridVisible(false);
    c(`ZoomIn(${VIEW.xmin},${VIEW.ymin},${VIEW.xmax},${VIEW.ymax})`);

    // Thermometer: tube, bulb, scale, mercury column.
    c("tube = Polygon((-0.5,-11.2),(0.5,-11.2),(0.5,10.8),(-0.5,10.8))");
    style("tube", [230, 224, 212], { fill: 0.35, line: 3 });
    c("blb = Polygon(Sequence((0.95 cos(t), -12 + 1.3 sin(t)), t, 0, 2pi - pi/18, pi/18))");
    style("blb", SOGA, { fill: 1, line: 1 });
    c("tks = Sequence(Segment((0.5,k),(If(Mod(k,5)==0,1.3,0.9),k)),k,-10,10)");
    style("tks", INK3, { line: 2 });
    c("lbs = Sequence(Text(k, (1.55, k - 0.3)), k, -10, 10)");
    style("lbs", INK3);
    c("z0 = Segment((-1.1,0),(1.3,0))");
    style("z0", EMAS, { line: 6 });

    c("trk = Segment((0,-10),(0,10))");
    api.setVisible("trk", false);
    c("P = Point(trk)");
    api.setCoords("P", 0, 0);
    api.setColor("P", ...NILA);
    api.setPointSize("P", 7);
    api.setLabelVisible("P", false);
    c("merc = Polygon((-0.26,-11.2),(0.26,-11.2),(0.26,y(P)),(-0.26,y(P)))");
    style("merc", SOGA, { fill: 1, line: 0 });
    c("mk = Segment((-1.1,y(P)),(0.5,y(P)))");
    style("mk", NILA, { line: 5 });
    c('tP = Text(round(y(P)) + " °C", (-3.9, y(P) - 0.3))');
    style("tP", NILA);

    // Answer box inside the applet.
    c('jwb = ""');
    c(`cap = Text("Jawaban (°C):", (${QX}, -0.6))`);
    style("cap", NILA);
    c("ib = InputBox(jwb)");
    api.setLabelVisible("ib", false);
    c(`SetCoords(ib, ${px(QX) - 4}, ${py(-1.1)})`);
    c(`hint = Text("tulis angkanya, lalu tekan Enter", (${QX}, -4.3))`);
    style("hint", INK3);

    api.registerUpdateListener("suhuOnUpdate");
    $("applet-loading").remove();
    $("applet-wrap").classList.add("loaded");
    showQuestion();
    showState();
  }

  function wrap(text, width) {
    const out = [];
    let line = "";
    for (const w of text.split(" ")) {
      if ((line + " " + w).trim().length > width) {
        out.push(line.trim());
        line = w;
      } else line += " " + w;
    }
    if (line.trim()) out.push(line.trim());
    return out;
  }

  function showQuestion() {
    if (!api) return;
    quiet = true;
    for (const n of qObjects) api.deleteObject(n);
    qObjects = [];
    const s = stage();
    const lines = [`Soal ${stageIdx + 1}`, ...wrap(s.question, 30)];
    lines.forEach((ln, i) => {
      const name = `q${i}`;
      const safe = ln.replace(/"/g, "'");
      api.evalCommand(`${name} = Text("${safe}", (${QX}, ${10 - i * 1.35}))`);
      style(name, i === 0 ? SOGA : NILA);
      qObjects.push(name);
    });
    api.setTextValue("jwb", "");
    api.setCoords("P", 0, 0);
    quiet = false;
    showState();
  }

  function injectApplet() {
    const params = {
      appName: "classic",
      width: W,
      height: H,
      scaleContainerClass: "applet-wrap",
      allowUpscale: false,
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

  const MOVE_NAME = {
    L1: "L1 Probe", L2: "L2 Point", L3: "L3 Langkah terarah", L4: "L4 Revoice",
    OK: "Konfirmasi akhir", HINT: "Petunjuk guru", END: "Penutup",
  };

  function bubble(cls, text, meta) {
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
    chatLog.appendChild(el);
    chatLog.scrollTop = chatLog.scrollHeight;
    return el;
  }

  function note(text, meta) {
    const el = document.createElement("div");
    el.className = "chat-note";
    el.textContent = text;
    if (meta) {
      const m = document.createElement("span");
      m.className = "meta-inline";
      m.textContent = ` · ${meta}`;
      el.appendChild(m);
    }
    chatLog.appendChild(el);
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

  function startStage() {
    const s = stage();
    mem = { answerOK: false, wrong: 0, counting: 0, halfText: null };
    $("stage-no").textContent = `soal ${stageIdx + 1} dari ${TASK.stages.length}`;
    note(`Soal ${stageIdx + 1} dari ${TASK.stages.length} ada di applet`, s.origin);
    const open = T.opening(s);
    bubble("ai", open, `${MOVE_NAME.L1} · naskah`);
    history.push({ role: "assistant", content: open });
    showQuestion();
    renderQuick();
  }

  function quickSet() {
    const s = stage();
    const size = Math.abs(s.end - s.start);
    const f = T.fmt;
    const up = s.end > s.start;
    const verb = up ? "naik" : "turun";
    const walk = [];
    for (let v = s.start; up ? v <= s.end : v >= s.end; v += up ? 1 : -1) walk.push(f(v));
    if (s.id === "soal1") {
      return {
        applet: [["2", "salah: 6 − 4"], ["11", "salah: hitung angka"], ["10", "benar"]],
        chat: [
          ["jadi -6 naik ke 4 itu naik 10 kali.", "sesi asli: 10 kali"],
          ["jadi -6 naik ke -5 lalu naik lagi ke -4 sampai nanti ke 4. Naiknya 1 derajat masing-masing.", "sesi asli: satu-satu"],
          ["jadi dari -6 ke 0 naik 6, lalu dari 0 ke 4 naik 4", "sesi asli: pecah di 0"],
          ["tidak tahu", "tidak tahu"],
        ],
      };
    }
    return {
      applet: [[String(Math.abs(Math.abs(s.start) - Math.abs(s.end))), "salah: tanpa tanda"], [String(size + 1), "salah: hitung angka"], [String(size), "benar"]],
      chat: [
        [`${f(s.start)} ${verb} ke ${f(s.end)} jadi ${size}`, `${size} tanpa alasan`],
        [`${walk.join(", ")}`, "satu-satu"],
        [`dari ${f(s.start)} ke 0 ${verb} ${Math.abs(s.start)}, lalu dari 0 ke ${f(s.end)} ${verb} ${Math.abs(s.end)}`, "pecah di 0"],
      ],
    };
  }

  function renderQuick() {
    const q = $("quick");
    if (done) {
      q.hidden = true;
      return;
    }
    q.hidden = false;
    q.innerHTML = "";
    const set = quickSet();
    const row = (label, items, onPick) => {
      const div = document.createElement("div");
      div.className = "quick-row";
      const span = document.createElement("span");
      span.textContent = label;
      div.appendChild(span);
      for (const [text, lab] of items) {
        const b = document.createElement("button");
        b.type = "button";
        b.textContent = lab;
        b.title = text;
        b.addEventListener("click", () => !busy && !done && onPick(text));
        div.appendChild(b);
      }
      q.appendChild(div);
    };
    row("Isi kotak applet:", set.applet, (v) => {
      if (!api) return;
      api.setTextValue("jwb", v); // fires the update listener like a typed answer
    });
    row("Contoh penjelasan:", set.chat, (t) => {
      input.value = t;
      form.requestSubmit();
    });
  }

  /* ---------------- AI call ---------------- */

  async function askAI(payload) {
    if (!NALAR_API) return null;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    try {
      const r = await fetch(`${NALAR_API.replace(/\/$/, "")}/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
        signal: ctrl.signal,
      });
      if (!r.ok) return null;
      const data = await r.json();
      return data && data.reply ? data : null;
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  function leaks(reply, forbid) {
    const t = T.normalise(reply).replace(/\s/g, "");
    return forbid.some((f) => new RegExp(`(^|[^0-9])${f}([^0-9]|$)`).test(t));
  }

  /* ---------------- Turn ---------------- */

  let lastApplet = "";
  function onAppletAnswer(a) {
    if (done || a === lastApplet) return;
    lastApplet = a;
    turn({ from: "applet", text: a });
  }

  async function onSubmit(e) {
    e.preventDefault();
    const text = input.value.trim();
    if (!text || busy || done) return;
    input.value = "";
    turn({ from: "chat", text });
  }

  async function turn(inp) {
    if (busy) return;
    busy = true;
    sendBtn.disabled = true;
    const s = stage();
    const m = marker();

    if (inp.from === "applet") bubble("student applet", `Jawaban di applet: ${inp.text}`);
    else bubble("student", inp.text);
    history.push({ role: "user", content: inp.from === "applet" ? `(jawaban di applet) ${inp.text}` : inp.text });

    const res = T.step({ stage: s, input: inp, marker: m, mem });
    const size = Math.abs(s.end - s.start);

    typing(true);
    const t0 = performance.now();
    const forbid = res.answerOK ? [] : [String(size)];
    const ai = res.move === "OK" ? null : await askAI({
      task: { id: TASK.id, title: TASK.title, unit: TASK.unit, misconceptions: TASK.misconceptions, moves: TASK.moves },
      stage: { id: s.id, question: s.question, target: TASK.target },
      context:
        `Termometer di applet, skala ${TASK.range[0]} sampai ${TASK.range[1]} °C. Penanda siswa sekarang di ${m} °C. ` +
        `Jawaban di kotak applet: ${appletAnswer() || "belum diisi"}. Soal: dari ${s.start} °C ke ${s.end} °C.`,
      analysis: {
        kind: res.kind,
        label: T.KIND_LABEL[res.kind],
        suggestedMove: res.move,
        answerCorrect: res.answerOK,
        wrongAttempts: mem.wrong,
      },
      forbid,
      scriptReply: res.reply,
      history: history.slice(-10),
    });
    const ms = Math.round(performance.now() - t0);
    if (!ai && ms < 450) await new Promise((r) => setTimeout(r, 450 - ms));
    typing(false);

    let reply = res.reply;
    let source = "naskah";
    if (ai) {
      if (!leaks(ai.reply, forbid)) {
        reply = ai.reply;
        source = ai.model || "AI";
        $("mode-badge").textContent = `Mode AI · ${source}`;
        $("mode-badge").classList.add("on");
      } else source = "naskah (jaga)";
    }

    bubble(res.move === "OK" ? "ai confirm" : "ai", reply, `${MOVE_NAME[res.move]} · ${source}`);
    history.push({ role: "assistant", content: reply });

    mem.answerOK = res.answerOK;
    if (res.kind.startsWith("wrong")) mem.wrong += 1;
    if (res.kind === "counting") mem.counting += 1;
    if (res.kind === "splitHalf") mem.halfText = inp.text;
    addLog({ stage: s.id, m, inp, res, source, reply });

    if (res.done) {
      await new Promise((r) => setTimeout(r, 900));
      stageIdx += 1;
      lastApplet = "";
      if (stageIdx < TASK.stages.length) startStage();
      else {
        done = true;
        bubble("ai end", "Kedua soal selesai. Tekan “Ulangi” untuk mencoba jalur jawaban yang lain.", MOVE_NAME.END);
        input.disabled = true;
        renderQuick();
      }
    }
    busy = false;
    sendBtn.disabled = done;
    if (!done && inp.from === "chat") input.focus();
  }

  /* ---------------- Log ---------------- */

  function addLog({ stage: sid, m, inp, res, source, reply }) {
    const row = {
      turn: log.length + 1,
      time_utc: new Date().toISOString(),
      stage: sid,
      marker_c: m,
      input_from: inp.from,
      student_text: inp.text,
      numbers_read: res.reading.ns.join(" "),
      diagnosis: T.KIND_LABEL[res.kind] || res.kind,
      move: MOVE_NAME[res.move] || res.move,
      source,
      ai_text: reply,
    };
    log.push(row);
    const tr = document.createElement("tr");
    const cells = [row.turn, row.time_utc.slice(11, 19), row.stage, row.marker_c, row.input_from, row.student_text, row.diagnosis, row.move, row.source];
    for (const v of cells) {
      const td = document.createElement("td");
      td.textContent = v;
      tr.appendChild(td);
    }
    logBody.appendChild(tr);
  }

  function downloadCSV() {
    const cols = ["turn", "time_utc", "stage", "marker_c", "input_from", "student_text", "numbers_read", "diagnosis", "move", "source", "ai_text"];
    const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
    const csv = [cols.join(","), ...log.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\r\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "nalar-skala-suhu-log.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /* ---------------- Start ---------------- */

  function reset() {
    stageIdx = 0;
    history = [];
    done = false;
    busy = false;
    lastApplet = "";
    chatLog.innerHTML = "";
    input.disabled = false;
    sendBtn.disabled = false;
    startStage();
  }

  form.addEventListener("submit", onSubmit);
  $("reset-btn").addEventListener("click", reset);
  $("csv-btn").addEventListener("click", downloadCSV);
  $("teacher-toggle").addEventListener("change", (e) => {
    document.body.classList.toggle("teacher", e.target.checked);
    $("log-pane").hidden = !e.target.checked;
  });
  $("mode-badge").textContent = NALAR_API ? "Mode AI · menyambung…" : "Mode naskah (tanpa AI)";

  startStage();
  injectApplet();
})();
