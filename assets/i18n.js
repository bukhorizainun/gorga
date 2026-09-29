/* Language for activity pages: ?lang=en|id wins, then the last choice, then Indonesian.
   Load this before the page scripts; they read window.GORGA_LANG. Elements with
   data-i18n="key" get their content from the page's dictionary via gorgaApplyI18n(). */
(function () {
  const KEY = "gorga-lang";
  const fromUrl = new URLSearchParams(location.search).get("lang");
  let lang = fromUrl;
  if (!lang) {
    try { lang = localStorage.getItem(KEY); } catch { /* storage may be blocked */ }
  }
  lang = lang === "en" ? "en" : "id";
  try { localStorage.setItem(KEY, lang); } catch { /* not needed to work */ }
  window.GORGA_LANG = lang;
  document.documentElement.lang = lang;

  window.gorgaApplyI18n = function (dict) {
    const d = dict[lang] || {};
    for (const el of document.querySelectorAll("[data-i18n]")) {
      const v = d[el.dataset.i18n];
      if (v !== undefined) el.innerHTML = v;
    }
    for (const el of document.querySelectorAll("[data-i18n-ph]")) {
      const v = d[el.dataset.i18nPh];
      if (v !== undefined) el.placeholder = v;
    }
    if (d._title) document.title = d._title;
    for (const a of document.querySelectorAll("[data-set-lang]")) {
      if (a.dataset.setLang === lang) a.setAttribute("aria-current", "true");
      else a.removeAttribute("aria-current");
    }
  };

  // Remember a language choice made through any switch link.
  document.addEventListener("click", (e) => {
    const a = e.target.closest("[data-set-lang]");
    if (!a) return;
    try { localStorage.setItem(KEY, a.dataset.setLang); } catch { /* the link carries ?lang= anyway */ }
  });
})();
