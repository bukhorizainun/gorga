/* The ladder order the teacher asked for (3 Oct 2026):
   - every question climbs the rungs in order, one rung per student reply, even when the answer
     is already right: L1 Probe -> L2 Point -> L3 Focus -> L4 Revoice & fade -> confirmation;
   - L4 comes only once the answer is right (or an idea is there, for open questions); until
     then the ladder stays at L3; an L4 explanation that falls short goes back down to L3;
   - support fades across the activities: the first applet of a topic window starts at L1,
     later applets start higher (L2-L4, then L3-L4), so students let go of the scaffold slowly.
   START (applet number -> first rung) is the teacher's to set; the values below are a draft.
   For trying a ladder out, ?tangga=1|2|3 in the address overrides START. */
(function () {
  const START = { 1: 1, 2: 2, 3: 2, 4: 2, 5: 3, 6: 3, 7: 3, 8: 1, 9: 2 };
  const ORDER = ["L1", "L2", "L3", "L4"];

  function start(n) {
    const q = parseInt(new URLSearchParams(location.search).get("tangga"), 10);
    return q >= 1 && q <= 3 ? q : START[n] || 1;
  }
  const rungs = (n) => ORDER.slice(start(n) - 1);

  /** A fresh ladder for one question; its first rung is the opening move. */
  function create(n) {
    const r = rungs(n);
    return { rungs: r, move: r[0], goal: false, goalText: null, count: { [r[0]]: 1 } };
  }

  /**
   * One student reply. res is the card's reading of it ({move, kind, done, answerOK}).
   * Returns the move for this turn: the next rung, never skipping one.
   */
  function next(g, res, text) {
    const kind = String(res.kind || "");
    // A wrong answer after the goal takes the goal back; "I don't know" does not.
    if (kind.startsWith("wrong:") && kind !== "wrong:dontKnow") g.goal = false;
    if (res.done && !g.goal) { g.goal = true; g.goalText = text; }
    const ready = g.goal || res.answerOK || (res.move === "L4" && kind !== "why" && kind !== "howTo");
    let move;
    if (g.move === "L4") {
      if (g.goal && !kind.startsWith("wrong")) move = "OK";
      else if (res.move === "L4" && ready) move = "L4";   // still explaining: ask again
      else move = "L3";                                   // the explanation fell short: back down
    } else {
      const i = g.rungs.indexOf(g.move);
      move = g.rungs[Math.min(i + 1, g.rungs.length - 1)];
      if (move === "L4" && !ready) move = "L3";
    }
    g.count[move] = (g.count[move] || 0) + 1;
    g.move = move;
    return move;
  }

  /** A line for the AI about where the ladder is. */
  function fact(g, move, en) {
    const path = g.rungs.join(" → ");
    if (move === "OK") return en ? "The ladder is complete; time for the confirmation." : "Tangga sudah lengkap; saatnya konfirmasi.";
    return en
      ? `The teacher's ladder for this activity: ${path}, always in order. This turn MUST be ${move}${g.goal ? ", even though the student has already given the answer and the reasoning: use it to check or deepen, without saying it is correct yet" : ""}.`
      : `Tangga guru untuk aktivitas ini: ${path}, selalu berurutan. Giliran ini WAJIB ${move}${g.goal ? ", walaupun siswa sudah memberi jawaban dan alasannya: pakai untuk memeriksa atau memperdalam, belum boleh bilang benar" : ""}.`;
  }

  window.GorgaLadder = { START, ORDER, start, rungs, create, next, fact };
})();
