"""Gorga mark: a simeol-eol scroll. One Archimedean spiral r = a*theta ends exactly at the
centre point m after two full turns; its point reflection through m (a 180 degree turn)
gives the second spiral, so the two outer arms meet at m and form one S-shaped line.
A band of ipon-ipon triangles sits below. Writes assets/logo.svg, logo-light.svg, favicon.svg."""
import math
import pathlib

OUT = pathlib.Path(__file__).resolve().parent.parent / "assets"
OUT.mkdir(exist_ok=True)


def scroll(mx, my, a, turns=2.0, steps=260):
    d = a * 2 * math.pi * turns  # outer radius, reaching m at angle 0
    cx, cy = mx - d, my
    first = []
    for i in range(steps + 1):
        t = 0.55 + (2 * math.pi * turns - 0.55) * i / steps
        r = a * t
        first.append((cx + r * math.cos(t), cy - r * math.sin(t)))
    second = [(2 * mx - x, 2 * my - y) for x, y in first]
    pts = first + second[::-1]  # centre 1 -> m -> centre 2
    return "M" + " L".join(f"{x:.2f} {y:.2f}" for x, y in pts)


def mark(line, red, band=True):
    body = f'<path d="{scroll(32, 27, 1.02)}" fill="none" stroke="{line}" stroke-width="3.3" stroke-linecap="round" stroke-linejoin="round"/>'
    if band:
        teeth = " ".join(f"M{6 + i * 6.5} 58 L{9.25 + i * 6.5} 52.5 L{12.5 + i * 6.5} 58 Z" for i in range(8))
        body += f'<path d="{teeth}" fill="{red}"/>'
    return body


RED = "#A31D1A"
for name, line in (("logo.svg", "#17120E"), ("logo-light.svg", "#FFFCF7")):
    (OUT / name).write_text(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="Gorga">'
        f"{mark(line, RED)}</svg>\n", encoding="utf8")

(OUT / "favicon.svg").write_text(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">'
    '<rect width="64" height="64" rx="12" fill="#17120E"/>'
    f"{mark('#FFFCF7', '#D2402A')}</svg>\n", encoding="utf8")
print("written:", ", ".join(sorted(p.name for p in OUT.glob("*.svg"))))
