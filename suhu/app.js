/* Gorga demo, temperature task: the question and the answer box live inside the applet;
   the chat only probes how the student got the answer. */

// Worker URL for AI mode. Empty = scripted mode (no AI, no network beyond GeoGebra).
const GORGA_API = "https://gorga.rahmiumar.workers.dev";

(function () {
  const TASK = window.SUHU_TASK;
  const T = window.SuhuTutor;
  const EN = window.GORGA_LANG === "en";
  const tr = (id, en) => (EN ? en : id);
  const SCRIPT = tr("naskah", "script"); // label for replies that come from the script

  const $ = (id) => document.getElementById(id);
  const chatLog = $("chat-log");
  const input = $("chat-input");
  const form = $("chat-form");
  const sendBtn = $("send-btn");
  const logBody = $("log-body");

  // The teacher's applet (original by A.M. Vuković, 2013), 898 x 698 GeoGebra pixels,
  // scaled by GeoGebra to the column width.
  const W = 898;
  const H = 698;

  let api = null;
  let stageIdx = 0;
  let cur = null; // current stage: {id, type, start, end, question, origin}
  let mem = null;
  let history = [];
  let log = [];
  let busy = false;
  let done = false;
  let quiet = false; // true while the page itself changes the applet
  let randomNo = 0;

  const stage = () => cur;

  /* ---------------- GeoGebra ---------------- */

  // Two draggable diamonds on the thermometer: L (blue, left scale) and E (red, right scale).
  function temp(name) {
    if (!api) return 0;
    const y0 = api.getYcoord("A_1"); // bottom of the scale, -20 °C
    const unit = api.getValue("jedDuzina"); // one degree
    return Math.round((api.getYcoord(name) - y0) / unit) - 20;
  }
  function markers() {
    return [temp("L"), temp("E")];
  }
  function setTemp(name, t) {
    const y = api.getYcoord("A_1") + (t + 20) * api.getValue("jedDuzina");
    api.setCoords(name, api.getXcoord(name), y);
  }

  function appletAnswer() {
    return api && cur ? String(api.getValueString(`Zad${cur.type}Upisano`) || "").trim() : "";
  }

  function showState() {
    const [b, r] = markers();
    $("val-blue").textContent = T.deg(b);
    $("val-red").textContent = T.deg(r);
    $("val-ans").textContent = appletAnswer() || "–";
  }

  const ANSWER = /^Zad([456])Upisano$/;
  const CHECK = { gumb5: 4, gumb6: 5, gumb7: 6 };
  const HELP = { o_2: 4, u_2: 5, v_2: 6 };

  window.suhuOnUpdate = function (name) {
    if (!api || quiet || !cur) return;
    if (name === "E" || name === "L") showState();
    else if (ANSWER.test(name) && Number(name[3]) === cur.type) {
      showState();
      const a = appletAnswer();
      if (a) onAppletAnswer(a);
    } else if (HELP[name] === cur.type && api.getValue(name) === 1 && !mem.help) {
      mem.help = true;
      note(tr("Siswa membuka “Bantuan” di applet", "The student opened “Show help” in the applet"),
        tr("bantuan menampilkan rumus pengurangan", "the help shows the subtraction formula"));
      logEvent(tr("membuka bantuan applet", "opened the applet help"));
    }
  };

  window.suhuOnClick = function (name) {
    if (!api || quiet || !cur) return;
    if (name === "gumb1") {
      // The applet's own "New task" script picks a random type; the page then sets a
      // temperature-change task that crosses 0, so the protocol applies.
      stageIdx = Math.max(stageIdx, TASK.stages.length + 1);
      setTimeout(() => startStage(randomStage()), 60);
    } else if (CHECK[name] === cur.type) {
      const a = appletAnswer();
      if (a) onAppletAnswer(a);
    }
  };

  function translate() {
    // The applet grades the answer itself ("Excellent! ..."). The protocol keeps that for the
    // end of the conversation, so the applet's own feedback is hidden in both languages.
    for (let n = 3; n <= 8; n++) api.setVisible(`Zad${n}Provjera`, false);
    api.setVisible("Type", false);
    if (EN) return; // the original applet is in English
    const c = (cmd) => api.evalCommand(cmd);
    const NL = "UnicodeToLetter(10)";
    const tail = `${NL} + "Gunakan termometer di kiri untuk membantu." + ${NL} + ${NL} + "Tulis jawabanmu, lalu tekan Periksa."`;
    c(`Zad4Tekst = "Suhu turun dari " + Zad4Br1 + " °C ke " + Zad4Br2 + " °C." + ${NL} + "Berapa derajat penurunan suhunya?" + ${tail}`);
    c(`Zad5Tekst = "Suhu awal " + Zad5Br1 + " °C. Berapa kenaikan suhu yang" + ${NL} + "diperlukan untuk mencapai " + Zad5Br2 + " °C?" + ${tail}`);
    c(`Zad6Tekst = "Suhu awal " + Zad6Br1 + " °C. Berapa derajat suhu harus" + ${NL} + "turun untuk mencapai " + Zad6Br2 + " °C?" + ${tail}`);
    api.setCaption("gumb1", "Soal baru");
    for (const b of ["gumb4", "gumb5", "gumb6", "gumb7", "gumb8", "gumb9"]) api.setCaption(b, "Periksa");
    for (const h of ["o_1", "o_2", "u_2", "v_2"]) api.setCaption(h, "Bantuan");
  }

  function applyStage(st) {
    quiet = true;
    const c = (cmd) => api.evalCommand(cmd);
    c(`VrstaZadatka = ${st.type}`);
    c(`Zad${st.type}Br1 = ${st.start}`);
    c(`Zad${st.type}Br2 = ${st.end}`);
    api.setTextValue(`Zad${st.type}Upisano`, "");
    for (const h of Object.keys(HELP)) api.setValue(h, 0);
    setTemp("L", 0);
    setTemp("E", 0);
    quiet = false;
    // The Indonesian text is split over two lines on purpose; the English original has the
    // question on its first line.
    st.question = String(api.getValueString(`Zad${st.type}Tekst`)).split("\n").slice(0, EN ? 1 : 2).join(" ");
    showState();
  }

  function rnd(a, b) {
    return a + Math.floor(Math.random() * (b - a + 1));
  }
  function randomStage() {
    const type = [4, 5, 6][rnd(0, 2)];
    // Different sizes on each side of 0, so the two parts of the split can be told apart.
    const neg = -rnd(1, 12);
    let pos = rnd(1, 12);
    while (pos === -neg) pos = rnd(1, 12);
    randomNo += 1;
    return type === 5
      ? { id: `acak${randomNo}`, type, start: neg, end: pos, origin: tr("soal acak dari applet", "random question from the applet") }
      : { id: `acak${randomNo}`, type, start: pos, end: neg, origin: tr("soal acak dari applet", "random question from the applet") };
  }

  function onLoad(a) {
    api = a;
    translate();
    api.registerUpdateListener("suhuOnUpdate");
    api.registerClickListener("suhuOnClick");
    $("applet-loading").remove();
    $("applet-wrap").classList.add("loaded");
    applyStage(cur);
  }

  function injectApplet() {
    const params = {
      material_id: TASK.material,
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
      borderColor: "#FFFFFF",
      appletOnLoad: (a) => onLoad(a || window.ggbApplet),
    };
    try {
      new GGBApplet(params, true).inject("ggb");
    } catch (e) {
      $("applet-loading").textContent = tr("Applet GeoGebra tidak dapat dimuat. Periksa koneksi internet.", "The GeoGebra applet could not load. Check the internet connection.");
    }
  }

  /* ---------------- Chat UI ---------------- */

  const MOVE_NAME = {
    L1: "L1 Probe", L2: "L2 Point", L3: tr("L3 Langkah terarah", "L3 Guided step"), L4: "L4 Revoice",
    OK: tr("Konfirmasi akhir", "Final confirmation"), HINT: tr("Petunjuk guru", "Teacher hint"), END: tr("Penutup", "Closing"),
  };

  // Reasoning path under the applet: one motif per tutor move, in student words.
  const STEP_WORD = EN
    ? { L1: "Asking", L4: "Revoicing", L2: "Pointing", L3: "Breaking down", HINT: "Hint", OK: "Found" }
    : { L1: "Bertanya", L4: "Mengulang", L2: "Menunjuk", L3: "Memecah", HINT: "Petunjuk", OK: "Ditemukan" };
  const journey = $("journey");
  function journeyReset() {
    journey.innerHTML = `<li class="empty">${tr("Belum ada langkah.", "No steps yet.")}</li>`;
  }
  function journeyAdd(move) {
    const empty = journey.querySelector(".empty");
    if (empty) empty.remove();
    const li = document.createElement("li");
    const step = document.createElement("span");
    step.className = "step" + (move === "OK" ? " goal" : "");
    step.dataset.move = move;
    step.innerHTML = `<i></i>${STEP_WORD[move] || move}<span class="code">${move === "OK" ? "✓" : move}</span>`;
    li.appendChild(step);
    journey.appendChild(li);
  }

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

  let stageTexts = [];
  let stageStartedAt = Date.now();
  function startStage(st) {
    cur = st;
    stageTexts = [];
    stageStartedAt = Date.now();
    journeyReset();
    mem = { answerOK: false, wrong: 0, counting: 0, halfText: null, help: false };
    lastApplet = { v: "", t: 0 };
    const fixed = stageIdx < TASK.stages.length;
    $("stage-no").textContent = fixed
      ? tr(`soal ${stageIdx + 1} dari ${TASK.stages.length}`, `question ${stageIdx + 1} of ${TASK.stages.length}`)
      : tr("soal acak", "random question");
    note(fixed
      ? tr(`Soal ${stageIdx + 1} dari ${TASK.stages.length} ada di applet`, `Question ${stageIdx + 1} of ${TASK.stages.length} is in the applet`)
      : tr("Soal baru ada di applet", "A new question is in the applet"), (EN && st.origin_en) || st.origin);
    if (api) applyStage(st);
    const open = T.opening(st);
    bubble("ai", open, `${MOVE_NAME.L1} · ${SCRIPT}`);
    journeyAdd("L1");
    history.push({ role: "assistant", content: open });
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
    if (s.start === -6 && s.end === 4 && EN) {
      return {
        applet: [["2", "wrong: 6 − 4"], ["11", "wrong: counts numbers"], ["10", "correct"]],
        chat: [
          ["so -6 up to 4 is going up 10 times.", "real session (translated): 10 times"],
          ["so -6 goes up to -5, then up again to -4, until 4. It goes up 1 degree each time.", "real session (translated): one by one"],
          ["so from -6 to 0 it goes up 6, then from 0 to 4 it goes up 4", "real session (translated): split at 0"],
          ["I don't know", "don't know"],
        ],
      };
    }
    if (s.start === -6 && s.end === 4) {
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
      applet: [[String(Math.abs(Math.abs(s.start) - Math.abs(s.end))), tr("salah: tanpa tanda", "wrong: no signs")], [String(size + 1), tr("salah: hitung angka", "wrong: counts numbers")], [String(size), tr("benar", "correct")]],
      chat: EN ? [
        [`${f(s.start)} ${up ? "goes up" : "goes down"} to ${f(s.end)} so ${size}`, `${size}, no reason`],
        [`${walk.join(", ")}`, "one by one"],
        [`from ${f(s.start)} to 0 it goes ${up ? "up" : "down"} ${Math.abs(s.start)}, then from 0 to ${f(s.end)} it goes ${up ? "up" : "down"} ${Math.abs(s.end)}`, "split at 0"],
      ] : [
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
    row(tr("Isi kotak applet:", "Fill the applet box:"), set.applet, (v) => {
      if (!api) return;
      if (!cur) return;
      api.setTextValue(`Zad${cur.type}Upisano`, v); // fires the update listener like a typed answer
    });
    row(tr("Contoh penjelasan:", "Sample explanations:"), set.chat, (t) => {
      input.value = t;
      form.requestSubmit();
    });
  }

  /* ---------------- AI call ---------------- */

  async function classify(payload) {
    if (!GORGA_API) return null;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 12000);
    try {
      const r = await fetch(`${GORGA_API.replace(/\/$/, "")}/classify`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
        signal: ctrl.signal,
      });
      return r.ok ? await r.json() : null;
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
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

  let lastApplet = { v: "", t: 0 };
  function onAppletAnswer(a) {
    // Enter in the box and a click on Periksa report the same answer; count it once.
    const now = Date.now();
    if (done || (a === lastApplet.v && now - lastApplet.t < 2000)) return;
    lastApplet = { v: a, t: now };
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
    const m = markers();

    if (inp.from === "applet") bubble("student applet", tr(`Jawaban di applet: ${inp.text}`, `Answer in the applet: ${inp.text}`));
    else bubble("student", inp.text);
    history.push({ role: "user", content: inp.from === "applet" ? `(jawaban di applet) ${inp.text}` : inp.text });

    typing(true);
    const t0 = performance.now();

    // When the rules cannot place a chat answer, the AI reads it; the reading is used only
    // if what it claims can be seen in the student's own words.
    let override = null;
    let aiReading = null;
    if (inp.from === "chat" && T.read(inp.text, s).strategy === "unclear" && !mem.halfText) {
      aiReading = await classify({
        stage: { start: s.start, end: s.end, question: s.question },
        text: inp.text,
        markers: m,
        answerCorrect: mem.answerOK,
      });
      override = T.verify(aiReading, inp.text, s);
    }
    const res = T.step({ stage: s, input: inp, marker: m, mem, override });
    const size = Math.abs(s.end - s.start);
    const forbid = res.answerOK ? [] : [String(size)];
    stageTexts.push(inp.text);
    const lim = T.limits(res, s, mem, stageTexts);
    const ai = await askAI({
      lang: EN ? "en" : "id",
      lead: lim,
      task: { id: TASK.id, title: TASK.title, unit: TASK.unit, misconceptions: TASK.misconceptions, moves: TASK.moves },
      stage: { id: s.id, question: s.question, target: TASK.target },
      context:
        `Termometer di applet, skala ${TASK.range[0]} sampai ${TASK.range[1]} °C, dengan penanda biru dan merah. ` +
        `Penanda biru di ${m[0]} °C, penanda merah di ${m[1]} °C. ` +
        `Jawaban di kotak applet: ${appletAnswer() || "belum diisi"}. Soal: dari ${s.start} °C ke ${s.end} °C. ` +
        `Siswa ${mem.help ? "sudah" : "belum"} membuka bantuan applet (bantuan menampilkan rumus pengurangan).`,
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
    let source = SCRIPT;
    if (ai) {
      // The AI leads, within the limits: no more help than the protocol allows now, no
      // number the student has not earned yet, no "benar" before the goal, one question.
      const tooMuch = (T.HELP[ai.move] ?? 9) > lim.maxHelp;
      const why = T.overreach(ai.reply, lim, s);
      if (!leaks(ai.reply, forbid) && !tooMuch && !why) {
        reply = ai.reply;
        source = ai.model || "AI";
        $("mode-badge").textContent = tr("Poda · AI aktif", "Poda · AI on");
        $("mode-badge").classList.add("on");
      } else source = tr("naskah (jaga)", "script (guard)");
    }

    const shownMove = ai && source === (ai.model || "AI") && MOVE_NAME[ai.move] ? ai.move : res.move;
    bubble(res.move === "OK" ? "ai confirm" : "ai", reply, `${MOVE_NAME[shownMove]} · ${source}`);
    journeyAdd(res.move === "OK" ? "OK" : shownMove);
    history.push({ role: "assistant", content: reply });
    if (res.done) {
      lastTarget = (Date.now() - stageStartedAt) / 1000;
      reasonCard(s, mem.halfText ? `${mem.halfText} … ${inp.text}` : inp.text);
    }

    mem.answerOK = res.answerOK;
    if (res.kind.startsWith("wrong")) mem.wrong += 1;
    if (res.kind === "counting" || res.kind === "stuck") mem.counting += 1;
    if (res.kind === "splitHalf") mem.halfText = inp.text;
    mem.lastKind = res.kind;
    addLog({ stage: s.id, m, inp, res: { ...res, move: shownMove }, source, reply });

    if (res.done) {
      await new Promise((r) => setTimeout(r, 1400));
      stageIdx += 1;
      if (stageIdx < TASK.stages.length) startStage({ ...TASK.stages[stageIdx] });
      else {
        if (stageIdx === TASK.stages.length) {
          note(tr("Soal tetap selesai. Berikutnya soal acak; tombol “Soal baru” di applet juga bisa dipakai kapan saja.",
            "The set questions are done. Random questions follow; the “New task” button in the applet works at any time too."));
        }
        startStage(randomStage());
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
      marker_c: m.join("/"),
      input_from: inp.from,
      student_text: inp.text,
      numbers_read: res.reading.ns.join(" "),
      diagnosis: (T.KIND_LABEL[res.kind] || res.kind) + (res.reading.byAI ? tr(" (dibaca AI)", " (read by AI)") : ""),
      move: MOVE_NAME[res.move] || res.move,
      code: res.move,
      source,
      ai_text: reply,
    };
    log.push(row);
    updateStats();
    const rowEl = document.createElement("tr");
    const cells = [row.turn, row.time_utc.slice(11, 19), row.stage, row.marker_c, row.input_from, row.student_text, row.diagnosis, row.move, row.source];
    for (const v of cells) {
      const td = document.createElement("td");
      td.textContent = v;
      rowEl.appendChild(td);
    }
    logBody.appendChild(rowEl);
  }

  function logEvent(text) {
    const row = {
      turn: log.length + 1, time_utc: new Date().toISOString(), stage: cur.id, marker_c: markers().join("/"),
      input_from: "applet", student_text: "", numbers_read: "", diagnosis: text, move: "", source: "", ai_text: "",
    };
    log.push(row);
    updateStats();
    const rowEl = document.createElement("tr");
    for (const v of [row.turn, row.time_utc.slice(11, 19), row.stage, row.marker_c, "applet", "", text, "", ""]) {
      const td = document.createElement("td");
      td.textContent = v;
      rowEl.appendChild(td);
    }
    logBody.appendChild(rowEl);
  }

  /* ---------------- Teacher summary, transcript, reasoning card ---------------- */

  let lastTarget = null;
  function updateStats() {
    const turns = log.filter((r) => r.student_text);
    $("st-turns").textContent = turns.length;
    const ai = turns.filter((r) => r.source && !r.source.startsWith(SCRIPT)).length;
    $("st-ai").textContent = turns.length ? `${Math.round((100 * ai) / turns.length)}%` : "–";
    if (lastTarget !== null) {
      const t = Math.round(lastTarget);
      $("st-time").textContent = `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
    }
    const counts = { L1: 0, L2: 0, L3: 0, L4: 0 };
    for (const r of turns) if (r.code in counts) counts[r.code] += 1;
    const max = Math.max(1, ...Object.values(counts));
    $("st-bars").innerHTML = Object.entries(counts)
      .map(([k, v]) => `<div>${k}<span class="b" style="width:${Math.round((100 * v) / max)}%"></span>${v}</div>`)
      .join("");
  }

  function flash(btn, text) {
    const old = btn.textContent;
    btn.textContent = text;
    setTimeout(() => (btn.textContent = old), 1400);
  }

  function copyTranscript() {
    const lines = [];
    for (const el of chatLog.children) {
      if (el.classList.contains("chat-note")) lines.push(`— ${el.firstChild.textContent} —`);
      else if (el.classList.contains("card-wrap")) lines.push(`[${tr("Kartu penalaran", "Reasoning card")}] ${el.querySelector("blockquote").textContent}`);
      else if (el.classList.contains("msg") && !el.classList.contains("typing")) {
        const who = el.classList.contains("student") ? tr("Siswa", "Student") : "Poda";
        const meta = el.querySelector(".meta");
        lines.push(`${who}: ${el.querySelector("p").textContent}${meta ? `  [${meta.textContent}]` : ""}`);
      }
    }
    navigator.clipboard.writeText(lines.join("\n")).then(
      () => flash($("copy-btn"), tr("Tersalin", "Copied")),
      () => flash($("copy-btn"), tr("Gagal menyalin", "Copy failed")));
  }

  // Shown when the student reaches the target reasoning: their own words, kept as a card.
  function reasonCard(st, text) {
    const date = new Date().toLocaleDateString(EN ? "en-GB" : "id-ID", { day: "numeric", month: "long", year: "numeric" });
    const wrap = document.createElement("div");
    wrap.className = "card-wrap";
    wrap.innerHTML = `<div class="reason-card"><span class="label">${tr("Kartu penalaran · kata-katamu sendiri", "Reasoning card · in your own words")}</span>
      <blockquote></blockquote><div class="q"></div>
      <div class="row"><span class="label">${date}</span><button type="button">${tr("Simpan kartu", "Save card")}</button></div>
      <div class="ipon"></div></div>`;
    const quote = `“${text}”`;
    const question = st.question || tr(`Dari ${T.deg(st.start)} ke ${T.deg(st.end)}`, `From ${T.deg(st.start)} to ${T.deg(st.end)}`);
    wrap.querySelector("blockquote").textContent = quote;
    wrap.querySelector(".q").textContent = question;
    wrap.querySelector("button").addEventListener("click", () => saveCard(quote, question, date));
    chatLog.appendChild(wrap);
    chatLog.scrollTop = chatLog.scrollHeight;
  }

  function wrapLines(g, text, maxW) {
    const out = [];
    let line = "";
    for (const w of text.split(/\s+/)) {
      const t = line ? `${line} ${w}` : w;
      if (g.measureText(t).width > maxW && line) {
        out.push(line);
        line = w;
      } else line = t;
    }
    if (line) out.push(line);
    return out;
  }

  async function saveCard(quote, question, date) {
    const W = 1080, H = 1350;
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const g = c.getContext("2d");
    await document.fonts.ready;
    const bg = g.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, "#24346a");
    bg.addColorStop(1, "#141f42");
    g.fillStyle = bg;
    g.fillRect(0, 0, W, H);
    // The mark is drawn as vector paths: an SVG image drawn at a new size on a canvas can
    // come out blank in Chrome the first time.
    try {
      const svg = new DOMParser().parseFromString(await (await fetch("../assets/logo-light.svg")).text(), "image/svg+xml");
      const paths = [...svg.querySelectorAll("path")];
      const mark = (x, y, size, alpha) => {
        g.save();
        g.globalAlpha = alpha;
        g.translate(x, y);
        g.scale(size / 64, size / 64);
        for (const el of paths) {
          const path = new Path2D(el.getAttribute("d"));
          if (el.getAttribute("fill") && el.getAttribute("fill") !== "none") {
            g.fillStyle = el.getAttribute("fill");
            g.fill(path);
          }
          if (el.getAttribute("stroke")) {
            g.strokeStyle = el.getAttribute("stroke");
            g.lineWidth = Number(el.getAttribute("stroke-width")) || 3;
            g.lineCap = "round";
            g.lineJoin = "round";
            g.stroke(path);
          }
        }
        g.restore();
      };
      mark(W - 600, H - 640, 560, 0.12);
      mark(84, 84, 120, 1);
    } catch { /* card works without the mark */ }
    g.fillStyle = "#fffcf7";
    g.font = "500 72px 'Cormorant Garamond', Georgia, serif";
    g.fillText("gorga", 222, 168);
    g.fillStyle = "#c39a52";
    g.font = "600 24px Onest, system-ui, sans-serif";
    g.fillText(tr("KARTU PENALARAN", "REASONING CARD"), 90, 330);
    g.fillStyle = "#fffcf7";
    g.font = "500 70px 'Cormorant Garamond', Georgia, serif";
    let y = 430;
    for (const ln of wrapLines(g, quote, W - 180).slice(0, 8)) { g.fillText(ln, 90, y); y += 80; }
    g.fillStyle = "#b9c0dc";
    g.font = "30px Onest, system-ui, sans-serif";
    y += 36;
    for (const ln of wrapLines(g, question, W - 180).slice(0, 4)) { g.fillText(ln, 90, y); y += 44; }
    g.fillStyle = "#8e97bf";
    g.font = "600 22px Onest, system-ui, sans-serif";
    g.fillText(date.toUpperCase(), 90, H - 100);
    g.fillStyle = "#c39a52";
    for (let x = 0; x < W; x += 36) {
      g.beginPath(); g.moveTo(x, H); g.lineTo(x + 18, H - 26); g.lineTo(x + 36, H); g.fill();
    }
    const a = document.createElement("a");
    a.download = tr("kartu-penalaran-gorga.png", "gorga-reasoning-card.png");
    a.href = c.toDataURL("image/png");
    a.click();
  }

  function downloadCSV() {
    const cols = ["turn", "time_utc", "stage", "marker_c", "input_from", "student_text", "numbers_read", "diagnosis", "move", "source", "ai_text"];
    const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
    const csv = [cols.join(","), ...log.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\r\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "gorga-skala-suhu-log.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /* ---------------- Start ---------------- */

  function reset() {
    stageIdx = 0;
    history = [];
    done = false;
    busy = false;
    chatLog.innerHTML = "";
    input.disabled = false;
    sendBtn.disabled = false;
    startStage({ ...TASK.stages[0] });
  }

  form.addEventListener("submit", onSubmit);
  $("reset-btn").addEventListener("click", reset);
  $("csv-btn").addEventListener("click", downloadCSV);
  $("copy-btn").addEventListener("click", copyTranscript);
  $("teacher-toggle").addEventListener("change", (e) => {
    document.body.classList.toggle("teacher", e.target.checked);
    $("log-pane").hidden = !e.target.checked;
    updateStats();
  });
  $("mode-badge").textContent = GORGA_API ? "Poda · AI" : tr("Mode naskah", "Script mode");

  startStage({ ...TASK.stages[0] });
  injectApplet();
})();
