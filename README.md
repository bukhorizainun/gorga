# Gorga demo

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

## Skala suhu (`suhu/`)

Second demo, closer to the teacher's own sessions: the question and the answer box are inside
the applet (a thermometer). The chat does not re-grade the answer; it probes how the student got
it, following the teacher's protocol: L1 first, a correct answer gets L4 (not "benar" yet), a
wrong answer gets L2 then L3, counting one by one is not enough, and the session ends with a
confirmation once the answer and the split at 0 are both there. `suhu/tutor.js` reads the numbers
in the student's text and decides the move; the optional worker only rephrases it.

The applet is the teacher's GeoGebra material `yx7ubuvn` (original by A.M. Vuković, 2013). The page
sets task type 5 (-6 to 4) and type 4 (3 to -5), then random crossing-zero tasks of types 4 to 6
("Soal baru"). It translates the task texts, hides the applet's own right/wrong feedback, reads the
blue and red markers (`L`, `E`) and the answer text (`Zad<n>Upisano`), and logs when the student
opens the help box (it shows the subtraction formula).

AI layers in the temperature demo (worker at `nalar-demo.zainun.workers.dev`):
- `/chat` (AI-led): the model reads the conversation, the applet state and the teacher's protocol and
  chooses the move itself. `tutor.limits()` sets the most help allowed at this point, the numbers the
  reply may contain, and whether 0 and the split may be mentioned yet; `tutor.overreach()` checks the
  sentence itself (a label can say L4 while the words give the split away). Rejected replies fall
  back to the script.
- `/classify` reads the strategy of chat answers the rules mark "unclear". `tutor.verify()` keeps the
  reading only if what it claims is visible in the student's words (for the split: both parts and
  0 or "titik beku"). The log marks these rows "(dibaca AI)".
