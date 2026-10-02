/* Level page: reads assets/catalog.json and shows one school level with its topics and activities.
   ?j=sd|smp|sma picks the level. Adding a level, topic or applet only needs a new catalog entry. */
(function () {
  const EN = window.GORGA_LANG === "en";
  const lang = EN ? "en" : "id";
  const t = (o) => (o && typeof o === "object" && !Array.isArray(o) ? o[lang] ?? o.id : o);
  const L = (id, en) => (EN ? en : id);
  const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const withLang = (href) => `../${href}${href.includes("?") ? "&" : "?"}lang=${lang}`;
  let cat = null;
  let level = new URLSearchParams(location.search).get("j") || "smp";

  function count(lv) { return lv.topics.reduce((n, tp) => n + tp.items.length, 0); }

  function item(it, i, two, solo) {
    const applet = it.type === "applet";
    const href = withLang(applet ? (it.href || `aktivitas/?a=${it.n}`) : it.href);
    const meta = applet
      ? `${it.mission ? `${L("Misi", "Mission")} ${it.mission}` : `Applet ${it.n}`} · ${it.q} ${L("soal", it.q === 1 ? "question" : "questions")}`
      : t(it.kicker);
    const badge = applet ? `<span class="badge live">${L("Protokol penuh · AI", "Full protocol · AI")}</span>` : `<span class="badge">${L("Di luar GeoGebra", "Outside GeoGebra")}</span>`;
    return `<li class="act${solo ? " lead-act" : ""}" style="--i:${i}">
      <a class="pic" href="${href}" aria-label="${esc(t(it.title))}"><img src="../assets/${it.cover}" alt="" loading="lazy" width="1200" height="${two ? 750 : 900}">${badge}</a>
      <div class="cap"><span class="meta">${meta}</span><h3><a href="${href}">${t(it.title)}</a></h3><p>${t(it.desc)}</p>
      ${applet && it.n === 1 ? `<a class="go alt" href="${withLang("aktivitas/?a=1")}">${L("Soal asli aktivitas (9)", "The activity's own questions (9)")} <span aria-hidden="true">→</span></a>` : ""}</div>
    </li>`;
  }

  function render() {
    const lv = cat.levels.find((x) => x.id === level) || cat.levels[1];
    level = lv.id;
    document.title = `${t(lv.name)} — Gorga`;
    $("tabs").innerHTML = cat.levels.map((x) => {
      const n = count(x);
      return `<button type="button" role="tab" data-j="${x.id}" aria-selected="${x.id === level}">${t(x.name)}<small>${n ? `${n} ${L("materi", n === 1 ? "item" : "items")}` : L("disiapkan", "in preparation")}</small></button>`;
    }).join("");
    $("phase").textContent = t(lv.phase);
    $("intro").textContent = t(lv.intro);
    $("index").innerHTML = lv.topics.map((tp, i) => `<a href="#${tp.id}"><span>${ROMAN[i]}</span>${t(tp.name)}<small>${tp.items.length}</small></a>`).join("");
    $("index").hidden = !lv.topics.length;

    if (!lv.topics.length) {
      $("topics").innerHTML = `<section class="topic soon-topic fade-in"><p class="kicker">${L("Sedang disiapkan", "In preparation")}</p>
        <ul class="plan">${t(lv.plan).map((p, i) => `<li style="--i:${i}">${p}</li>`).join("")}</ul>
        <p class="next-note">${L("Topik ini disusun bersama guru. Sementara itu, coba jenjang SMP.", "These topics are being written with teachers. Meanwhile, try lower secondary.")}</p></section>`;
    } else {
      $("topics").innerHTML = lv.topics.map((tp, i) => {
        const two = tp.items.length <= 2;
        return `<section class="topic fade-in" id="${tp.id}" style="--d:${i}">
          <header class="ch-head"><p class="kicker"><span class="no">${ROMAN[i]}</span>${L("Topik", "Topic")}</p><h2>${t(tp.name)}</h2><p class="intro">${t(tp.intro)}</p></header>
          <ul class="gallery${two ? " gallery-two" : ""}">${tp.items.map((it, k) => item(it, k, two, tp.items.length === 1)).join("")}</ul>
        </section>`;
      }).join("");
    }
    try { history.replaceState(null, "", `?j=${level}${EN ? "&lang=en" : ""}${location.hash}`); } catch (e) { /* file:// */ }
  }
  const $ = (id) => document.getElementById(id);

  $("tabs").addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b || b.dataset.j === level) return;
    level = b.dataset.j; history.replaceState(null, "", location.pathname + location.search); render();
  });

  fetch("../assets/catalog.json").then((r) => r.json()).then((c) => {
    cat = c; render();
    if (location.hash) { const el = document.querySelector(location.hash); if (el) el.scrollIntoView(); }
  }).catch(() => { $("topics").innerHTML = `<p class="next-note">${L("Katalog belum bisa dimuat. Muat ulang halaman.", "The catalog could not be loaded. Reload the page.")}</p>`; });
})();
