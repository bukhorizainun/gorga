"""Build the Gorga landing page in every language from one skeleton.

content/<lang>.json holds the words; this file holds the structure. Output:
  id -> index.html, en -> en/index.html, de -> de/index.html, tr -> tr/index.html

usage: python tools/landing/build.py
"""
import html
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
SITE = "https://rahmiumar.github.io/gorga/"
LANGS = [("id", "ID", ""), ("en", "EN", "en/"), ("de", "DE", "de/"), ("tr", "TR", "tr/")]
QUESTIONS = [9, 3, 7, 5, 5, 4, 2]
FULL = {1, 2}   # activities with a task card (full protocol)


def load(lang):
    with open(os.path.join(HERE, "content", lang + ".json"), encoding="utf-8") as f:
        return json.load(f)


def page(c, path):
    lang = c["lang"]
    up = "../" if path else ""
    A = up + "assets/"
    al = c["app_lang"]
    ids = c["ids"]
    e = html.escape

    def lang_links():
        out = []
        for code, label, p in LANGS:
            href = up + p if p else (up or "./")
            cur = ' aria-current="true"' if code == lang else ""
            out.append(f'<a href="{href}" hreflang="{code}" lang="{code}"{cur}>{label}</a>')
        return "".join(out)

    alternates = "\n  ".join(
        f'<link rel="alternate" hreflang="{code}" href="{SITE}{p}">' for code, _, p in LANGS)

    convo = []
    for i, line in enumerate(c["convo"]):
        kind, text = line[0], line[1]
        who = c["who_st"] if kind == "st" else c["who_ai"]
        tag = f'<sup class="lvl">{line[2]}</sup>' if len(line) > 2 else ""
        cls = "found" if kind == "win" else kind   # not "win": that class belongs to the topic buttons
        convo.append(f'<p class="say {cls}" style="--i:{i}"><span class="who">{who}</span><span class="txt">{text}{tag}</span></p>')

    rungs = []
    for i, (code, h, p, q) in enumerate(c["rungs"]):
        level = [1, 2, 3, 1][i]          # instructional control: rises L1 -> L3, falls again at L4 (fade)
        dots = "".join(f'<i class="{"on" if k < level else ""}"></i>' for k in range(3))
        rungs.append(f'''<li class="rung r{i + 1}" style="--i:{i}">
            <span class="code"{' lang="en"' if any(w in code for w in ("Probe", "Revoice", "Point", "Focus")) else ""}>{code}</span><h3>{h}</h3><p>{p}</p><blockquote>{q}</blockquote>{f'<span class="lv" aria-hidden="true">{dots}</span>' if dots else ''}
          </li>''')

    guards = "".join(f'<li><b>{g}</b><span>{t}</span></li>' for g, t in c["guards"])
    steps = "".join(
        f'<li style="--i:{i}"><span class="n">{i + 1}</span><h3>{h}</h3><p>{p}</p></li>' for i, (h, p) in enumerate(c["steps"]))
    feats = "".join(
        f'<li><b>{b}{f" <em class=\"soon\">{s}</em>" if s else ""}</b><span>{t}</span></li>' for b, t, s in c["feats"])

    m = c["mock"]
    stats = "".join(f'<div class="stat"><span>{a}</span><b>{b}</b><small>{s}</small></div>' for a, b, s in m["stats"])
    rows = "".join("<tr>" + "".join(f"<td>{x}</td>" for x in r) + "</tr>" for r in m["rows"])
    head = "".join(f"<th>{x}</th>" for x in m["head"])

    wins = "".join(
        f'<button type="button" class="win{" on" if i == 0 else ""}" data-win="{i}" aria-pressed="{"true" if i == 0 else "false"}">{w}<small>{s}</small></button>'
        for i, (w, s) in enumerate(c["wins"]))

    acts = []
    for i, (title, desc) in enumerate(c["acts"]):
        n = i + 1
        q = QUESTIONS[i]
        meta = f'{c["applet"]} {n} · {q} {c["q_one"] if q == 1 else c["q_many"]}'
        if n == 1:
            acts.append(f'''<li class="act lead-act" style="--i:{i}">
            <a class="pic" href="{up}suhu/?lang={al}"><img src="{A}covers/a1.jpg" alt="" loading="lazy" width="1200" height="935"><span class="badge live">{c["full"]}</span></a>
            <div class="cap"><span class="meta">{meta}</span><h3>{title}</h3><p>{desc}</p>
              <a class="go" href="{up}suhu/?lang={al}">{c["full_link"]} <span aria-hidden="true">→</span></a>
              <a class="go alt" href="{up}aktivitas/?a=1&amp;lang={al}">{c["own_link"]} <span aria-hidden="true">→</span></a></div>
          </li>''')
        else:
            acts.append(f'''<li class="act" style="--i:{i}">
            <a class="pic" href="{up}aktivitas/?a={n}&amp;lang={al}" aria-label="{e(title)}"><img src="{A}covers/a{n}.jpg" alt="" loading="lazy" width="1200" height="750"><span class="badge{' live' if n in FULL else ''}">{c["full"] if n in FULL else c["general"]}</span></a>
            <div class="cap"><span class="meta">{meta}</span><h3><a href="{up}aktivitas/?a={n}&amp;lang={al}">{title}</a></h3><p>{desc}</p></div>
          </li>''')

    note = f'<p class="app-note">{c["app_note"]}</p>' if c["app_note"] else ""
    facts = "".join(f'<li><b>{b}</b><span>{s}</span></li>' for b, s in c["facts"])

    return f'''<!doctype html>
<html lang="{lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{e(c["title"])}</title>
  <meta name="description" content="{e(c["description"])}">
  <meta property="og:title" content="{e(c["title"])}">
  <meta property="og:description" content="{e(c["og_description"])}">
  <meta property="og:image" content="{SITE}assets/covers/a1.jpg">
  <meta name="theme-color" content="#f4f5fa">
  <link rel="icon" href="{A}favicon.svg" type="image/svg+xml">
  {alternates}
  <link rel="alternate" hreflang="x-default" href="{SITE}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400;1,500&family=Onest:wght@400;500;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="{A}gorga.css">
  <link rel="stylesheet" href="{A}home.css">
</head>
<body class="landing">
  <div class="sky" aria-hidden="true"><i></i><i></i><i></i></div>
  <canvas class="mathfield" aria-hidden="true"></canvas>

  <header class="top">
    <a class="mark" href="{up or './'}" aria-label="{e(c["home_label"])}"><img src="{A}logo-nila.svg" alt="" width="34" height="34"><span>gorga</span></a>
    <nav aria-label="{e(c["nav_label"])}">
      {''.join(f'<a href="#{i}">{t}</a>' for i, t in zip(ids, c["nav"]))}
    </nav>
    <div class="end">
      <div class="langs" role="group" aria-label="Language">{lang_links()}</div>
      <a class="pill" href="{up}suhu/?lang={al}">{c["cta_small"]} <span aria-hidden="true">→</span></a>
    </div>
  </header>

  <main>
    <section class="hero">
      <div class="hero-text">
        <p class="kicker">{c["eyebrow"]}</p>
        <h1>{c["h1"]}</h1>
        <p class="lead">{c["lead"]}</p>
        <div class="cta">
          <a class="btn" href="{up}suhu/?lang={al}">{c["cta"]} <span aria-hidden="true">→</span></a>
          <a class="link" href="#{ids[0]}">{c["cta2"]}</a>
        </div>
        {note}
        <ul class="facts">{facts}</ul>
      </div>
      <figure class="art">
        <svg data-gorga role="img" aria-label="{e(c["art_label"])}"></svg>
        <figcaption>{c["caption"]}</figcaption>
      </figure>
    </section>

    <section class="chapter" id="{ids[0]}">
      <header class="ch-head" data-rv>
        <p class="kicker"><span class="no">I</span>{c["c_eyebrow"]}</p>
        <h2>{c["c_h2"]}</h2>
        <p class="intro">{c["c_intro"]}</p>
      </header>
      <div class="dialogue">
        <div class="lines" data-rv="seq">{''.join(convo)}</div>
        <aside class="note" data-rv>
          <h3>{c["aside_h"]}</h3>
          <p>{c["aside_p"]}</p>
          <p class="small">{c["aside_small"]}</p>
          <a class="link" href="{up}suhu/?lang={al}">{c["aside_cta"]} <span aria-hidden="true">→</span></a>
        </aside>
      </div>
    </section>

    <section class="chapter" id="{ids[1]}">
      <header class="ch-head" data-rv>
        <p class="kicker"><span class="no">II</span>{c["p_eyebrow"]}</p>
        <h2>{c["p_h2"]}</h2>
        <p class="intro">{c["p_intro"]}</p>
      </header>
      <div class="ascent" data-rv="seq">
        <svg class="path" aria-hidden="true"><path pathLength="1"/></svg>
        <ol>{''.join(rungs)}</ol>
      </div>
      <p class="ladder-note" data-rv>{c["ladder_note"]}</p>
      <ul class="guards" data-rv>{guards}</ul>
    </section>

    <section class="chapter" id="how">
      <header class="ch-head" data-rv>
        <p class="kicker"><span class="no">III</span>{c["h_eyebrow"]}</p>
        <h2>{c["h_h2"]}</h2>
        <p class="intro">{c["h_intro"]}</p>
      </header>
      <ol class="steps" data-rv="seq">{steps}</ol>
    </section>

    <section class="chapter teach" id="{ids[2]}">
      <div class="teach-text" data-rv>
        <p class="kicker"><span class="no">IV</span>{c["t_eyebrow"]}</p>
        <h2>{c["t_h2"]}</h2>
        <ul class="feats">{feats}</ul>
      </div>
      <div class="mock" aria-hidden="true" data-rv>
        <div class="stats">{stats}
          <div class="stat moves"><span>{m["moves"]}</span>
            <div class="bars"><div>L1<i style="width:30%"></i>2</div><div>L2<i style="width:15%"></i>1</div><div>L3<i style="width:0"></i>0</div><div>L4<i style="width:60%"></i>4</div></div>
          </div>
        </div>
        <table><thead><tr>{head}</tr></thead><tbody>{rows}</tbody></table>
        <p class="mock-note">{m["note"]}</p>
      </div>
    </section>

    <section class="chapter" id="{ids[3]}">
      <header class="ch-head" data-rv>
        <p class="kicker"><span class="no">V</span>{c["a_eyebrow"]}</p>
        <h2>{c["a_h2"]}</h2>
        <p class="intro">{c["a_intro"]}</p>
      </header>
      <div class="wins" role="group" aria-label="{e(c["wins_label"])}" data-rv>{wins}</div>
      <div class="win-panel" data-panel="0">
        <ul class="gallery" data-rv="seq">{''.join(acts)}</ul>
        <p class="next-note">{c["next"]}</p>
      </div>
      <div class="win-panel" data-panel="soon" hidden><p class="soon-note">{c["soon"]}</p></div>
    </section>

    <section class="chapter name">
      <img class="name-mark" src="{A}logo-nila.svg" alt="{e(c["logo_alt"])}" width="260" height="260" data-rv>
      <div data-rv>
        <p class="kicker">{c["n_eyebrow"]}</p>
        <h2>{c["n_h2"]}</h2>
        <p class="name-what">{c["n_p1"]}</p>
        <p>{c["n_p_gorga"]}</p>
        <p>{c["n_p_poda"]}</p>
      </div>
    </section>
  </main>

  <footer class="foot">
    <p>{c["foot1"]}</p>
    <p>© 2026 Gorga · Dr. Rahmi Ramadhani Umar · <a href="https://github.com/rahmiumar" rel="noopener">github.com/rahmiumar</a></p>
    <div class="langs foot-langs" role="group" aria-label="Language">{lang_links()}</div>
  </footer>

  <script>
    try {{ localStorage.setItem("gorga-lang", "{al}"); }} catch (e) {{}}
    document.querySelector(".wins").addEventListener("click", function (e) {{
      var b = e.target.closest(".win"); if (!b) return;
      document.querySelectorAll(".win").forEach(function (x) {{ x.classList.toggle("on", x === b); x.setAttribute("aria-pressed", x === b); }});
      var first = b.dataset.win === "0";
      document.querySelector('[data-panel="0"]').hidden = !first;
      document.querySelector('[data-panel="soon"]').hidden = first;
    }});
  </script>
  <script src="{A}motif.js"></script>
  <script src="{A}mathfield.js"></script>
</body>
</html>
'''


for code, _, path in LANGS:
    out = os.path.join(ROOT, path, "index.html")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w", encoding="utf-8", newline="\n") as f:
        f.write(page(load(code), path))
    print("wrote", os.path.relpath(out, ROOT))
