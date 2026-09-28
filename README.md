# Nalar demo

Prototype for discussion: a GeoGebra applet next to an AI "shadow teacher" that answers each
student response with one scaffolding move (Probe, Point, Revoice, Reinforce) and never gives
the answer away.

- `index.html`, `style.css`, `app.js`: the page. The applet is built at load time through the
  GeoGebra Apps API; the final version embeds the teacher's own GeoGebra Classroom applet.
- `task.js`: the task card (question, target idea, misconceptions, allowed moves).
- `tutor.js`: deterministic diagnosis against the live applet state, plus scripted replies.
- `worker/`: optional Cloudflare Worker (Workers AI) that phrases the reply. Without it, the
  page runs in scripted mode.

Turn on "Mode guru" to see the move labels and the per-turn log (CSV export).
