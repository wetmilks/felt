import { describeCurrentHand } from "./poker.js";

/* =========================================================================
   PRACTICE COACH: what to do with this hand and why, in plain words
   ========================================================================= */
function findDraws(hole, board) {
  if (board.length < 3 || board.length >= 5) return null;
  const all = [...hole, ...board];
  const out = [];
  const suits = {}; all.forEach((c) => (suits[c.s] = (suits[c.s] || 0) + 1));
  const fs = Object.keys(suits).find((s) => suits[s] === 4 && hole.some((c) => c.s === s));
  if (fs) out.push({ name: "a flush draw", outs: 9 });
  const ranks = new Set(all.map((c) => c.r)); if (ranks.has(14)) ranks.add(1);
  const holeRanks = new Set(hole.flatMap((c) => (c.r === 14 ? [14, 1] : [c.r])));
  let best = null;
  for (let lo = 1; lo <= 10; lo++) {
    const win = [lo, lo + 1, lo + 2, lo + 3, lo + 4];
    const have = win.filter((r) => ranks.has(r));
    if (have.length === 5) return out.length ? out : null; // already a straight
    if (have.length === 4 && win.some((r) => holeRanks.has(r) && ranks.has(r))) {
      const missing = win.find((r) => !ranks.has(r));
      const open = (missing === lo || missing === lo + 4) && lo > 1 && lo + 4 < 14;
      if (!best || open) best = open ? { name: "an open-ended straight draw", outs: 8 } : { name: "a gutshot straight draw", outs: 4 };
    }
  }
  if (best) out.push(best);
  return out.length ? out : null;
}
// eq is 0 to 100. Returns { act: "fold" | "check" | "call" | "bet" | "raise", text, why }
function coachAdvice({ hole, board, eq, toCall, pot, stack, streetIn, currentBet, bb, opps, position }) {
  if (eq == null || !hole || !hole.length) return null;
  const e = eq / 100;
  const share = 1 / (opps + 1);
  const rel = e / share;
  const potOdds = toCall > 0 ? toCall / (pot + toCall) : 0;
  const need = Math.round(potOdds * 100);
  const hand = describeCurrentHand(hole, board);
  const draws = findDraws(hole, board);
  const drawTxt = draws ? draws.map((d) => d.name).join(" and ") : null;
  const outs = draws ? Math.min(15, draws.reduce((a, d) => a + d.outs, 0)) : 0;
  const maxTo = stack + streetIn;
  const sizeTo = (to) => (to >= maxTo ? "all in" : `to ${to.toLocaleString()}`);
  const pre = board.length === 0;
  const late = position === "late";
  const pct = `${Math.round(eq)}%`;
  if (pre) {
    if (rel >= 1.45) {
      const to = toCall > bb ? Math.min(maxTo, currentBet * 3) : Math.min(maxTo, bb * (late ? 2.5 : 3));
      return { act: "raise", text: `Raise ${sizeTo(Math.round(to))}`, why: `${hand} is a strong starting hand. You're about ${pct} against ${opps} player${opps > 1 ? "s" : ""}, so build the pot now.` };
    }
    if (rel >= 1.1) {
      if (toCall <= bb && late) return { act: "raise", text: `Raise ${sizeTo(Math.round(Math.min(maxTo, bb * 2.5)))}`, why: `${hand} is good enough to open from late position. Acting last after the flop is a big edge.` };
      if (toCall === 0) return { act: "check", text: "Check", why: `${hand} is decent but not worth building a big pot out of position. See the flop for free.` };
      if (toCall <= bb * 4 || e >= potOdds + 0.08) return { act: "call", text: "Call", why: `${hand} is playable. It only costs ${toCall.toLocaleString()} to see a flop.` };
      return { act: "fold", text: "Fold", why: `${hand} is okay, but this raise is big. Save your chips for a better spot.` };
    }
    if (toCall === 0) return { act: "check", text: "Check", why: `${hand} is weak, but it's free to see the flop. Never fold when you can check.` };
    if (toCall <= bb && late && rel >= 0.9) return { act: "call", text: "Call", why: `${hand} is marginal, but it's cheap and you act last.` };
    return { act: "fold", text: "Fold", why: `${hand} loses to most hands here. Folding weak hands before the flop is how good players save chips.` };
  }
  // after the flop
  if (e >= 0.68 || (rel >= 1.7 && e >= 0.5)) {
    const to = toCall > 0 ? Math.round(Math.min(maxTo, currentBet * 2.5 + pot * 0.3)) : Math.round(Math.min(maxTo, streetIn + pot * 0.66));
    return { act: toCall > 0 ? "raise" : "bet", text: toCall > 0 ? `Raise ${sizeTo(to)}` : to >= maxTo ? "Bet all in" : `Bet ${to.toLocaleString()}`, why: `You have ${hand.toLowerCase()} and about ${pct} to win. Bet big so worse hands pay you.` };
  }
  if (toCall === 0) {
    if (e >= 0.5) { const amt = Math.max(bb, Math.round(Math.min(maxTo, pot * 0.5))); return { act: "bet", text: amt >= maxTo ? "Bet all in" : `Bet ${amt.toLocaleString()}`, why: `You're ahead at ${pct}. A half pot bet protects your hand and gets value.` }; }
    if (drawTxt) return { act: "check", text: "Check", why: `You have ${drawTxt} (${outs} outs). Take the free card and see if it hits.` };
    return { act: "check", text: "Check", why: `${hand} isn't strong here (${pct}). Check and see what happens for free.` };
  }
  if (e >= potOdds + 0.03) {
    return { act: "call", text: "Call", why: drawTxt
      ? `You need ${need}% to call and you have about ${pct} with ${drawTxt}. The price is right.`
      : `You need ${need}% to call and you have about ${pct}. That's a profitable call.` };
  }
  return { act: "fold", text: "Fold", why: drawTxt
    ? `You have ${drawTxt}, but you need ${need}% and only have about ${pct}. The bet is too big to chase.`
    : `You need ${need}% to call and only have about ${pct}. Let this one go.` };
}
// After you act, say something only when it really mattered.
function coachVerdict(adv, type, eq, toCall, pot) {
  if (!adv) return null;
  const e = eq / 100, potOdds = toCall > 0 ? toCall / (pot + toCall) : 0;
  const aggressive = type === "bet" || type === "raise";
  if (type === "fold" && toCall === 0) return { good: false, text: "You folded when you could check for free. Always check instead." };
  if (type === "fold" && adv.act !== "fold" && e >= potOdds + 0.1) return { good: false, text: `You folded about ${Math.round(eq)}% when you only needed ${Math.round(potOdds * 100)}%. That was worth a call.` };
  if (type === "call" && adv.act === "fold" && e < potOdds - 0.06) return { good: false, text: `That call needed ${Math.round(potOdds * 100)}% and you had about ${Math.round(eq)}%. Over time that loses chips.` };
  if (aggressive && adv.act === "fold" && e < 0.3) return { good: false, text: `Risky. You raised with about ${Math.round(eq)}%. Bluffs work best when it's cheap and you act last.` };
  if ((type === adv.act) || (aggressive && (adv.act === "bet" || adv.act === "raise"))) {
    const lines = type === "fold" ? ["Good fold. Those chips stay yours.", "Right call to let it go.", "Disciplined. That's how you save chips."]
      : type === "call" ? ["Good call. The price was right.", "Nice, the odds were on your side."]
      : type === "check" ? ["Smart check.", "Good, no reason to put chips in there."]
      : ["Nice, that's how you build a pot.", "Good bet. Make them pay to see more cards."];
    return { good: true, text: lines[Math.floor(Math.random() * lines.length)] };
  }
  return null;
}

export { coachAdvice, coachVerdict, findDraws };
