"""Fetches the teacher's seven GeoGebra activities (intro texts, questions, applet) and writes
assets/activities.json with the Indonesian and English parts split. Run again when an
activity changes on GeoGebra."""
import json
import pathlib
import re
import urllib.request

OUT = pathlib.Path(__file__).resolve().parent.parent / "assets" / "activities.json"
IDS = ["yx7ubuvn", "pdujyyp8", "zjjfsxst", "wbamqk9r", "qhyyqxbm", "umkeqpct", "kkund5uy"]


def frac(m):
    whole, a, b = m.group(1), m.group(2), m.group(3)
    f = f"<sup>{a}</sup>&frasl;<sub>{b}</sub>"
    return f"{whole}{f}" if whole else f


def clean(s):
    s = s.replace("﻿", "")
    s = re.sub(r"\[math\](.*?)\[/math\]", lambda m: m.group(1).replace("\\times", " × ").replace("\\cdot", " · "), s)
    s = re.sub(r"(\d+)?\s*\\frac\{(\d+)\}\{(\d+)\}\s*", lambda m: frac(m) + " ", s)
    s = re.sub(r"\[b\](.*?)\[/b\]", r"<b>\1</b>", s, flags=re.S)
    s = re.sub(r"\[/?[iu]\]", "", s)
    s = re.sub(r"\s*\[list\]\s*", "<ul>", s)
    s = re.sub(r"\s*\[/list\]\s*", "</ul>", s)
    s = re.sub(r"\s*\[\*\]\s*", "<li>", s)
    s = re.sub(r"\s*\[/\*\]\s*", "</li>", s)
    s = re.sub(r"[ \t]+", " ", s)
    s = re.sub(r"\n{3,}", "\n\n", s)
    return s.strip()


# The English part starts at a "(" that opens a line (maybe after a BOM, [b] or [i]),
# or at an inline "([i]" / "[i](".
EN_START = re.compile(r"\n\s*\(\s*﻿?|\(\s*﻿?\s*(?:\[b\]\s*)?\[i\]|\[i\]\s*\(")


def split(text):
    text = text or ""
    m = EN_START.search(text)
    if not m:
        return {"id": clean(text), "en": ""}
    ind, en = text[: m.start()], text[m.start():]
    en = clean(en).strip()
    if en.startswith("("):
        en = en[1:]
    en = re.sub(r"\)\s*\.?\s*$", "", en).strip()
    return {"id": clean(ind), "en": en}


def title(t):
    m = re.match(r"^(.*?)\s*\((.*)\)\s*$", t or "")
    return {"id": m.group(1), "en": m.group(2)} if m else {"id": t, "en": t}


acts = []
for n, mid in enumerate(IDS, 1):
    with urllib.request.urlopen(f"https://api.geogebra.org/v1.0/materials/{mid}") as r:
        d = json.load(r)
    items = []
    for e in d["elements"]:
        if e["type"] == "T":
            items.append({"type": "text", "title": split(e.get("title") or ""), "body": split(e.get("text") or "")})
        elif e["type"] == "Q":
            items.append({"type": "question", "title": split(e.get("title") or ""), "body": split(e["question"]["question"])})
        elif e["type"] == "G":
            m = re.search(r"/material-(\w+)\.ggb", e.get("url", ""))
            items.append({"type": "applet", "material": m.group(1) if m else mid})
    acts.append({"n": n, "activity": mid, "title": title(d["title"]), "thumb": d.get("thumbUrl", ""), "items": items})

OUT.write_text(json.dumps(acts, ensure_ascii=False, indent=1), encoding="utf8")
print(f"{len(acts)} activities, {sum(1 for a in acts for i in a['items'] if i['type'] == 'question')} questions -> {OUT}")
