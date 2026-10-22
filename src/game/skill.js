import { PLACEMENT_CAP } from "./ranked.js";

/* =========================================================================
   SKILL RATING
   A 0-100 read on how well you actually play, built from every hand you finish.
   Nothing here depends on luck alone: all-in pots are scored by your equity
   when the money went in, and results against tougher bots count for more.
   ========================================================================= */
// roughly how often a solid player should put chips in preflop at each table size
const IDEAL_VPIP = { 2: 0.6, 3: 0.45, 4: 0.34, 5: 0.29, 6: 0.25, 7: 0.23, 8: 0.21, 9: 0.19 };
const SKILL_WEIGHTS = { decisions: 0.32, preflop: 0.16, results: 0.14, aggression: 0.1, showdown: 0.1, tournaments: 0.07, position: 0.06, composure: 0.05 };
const SKILL_LABELS = [[90, "Elite"], [75, "Expert"], [60, "Strong"], [45, "Solid"], [30, "Developing"], [0, "Beginner"]];
const clamp100 = (x) => Math.max(0, Math.min(100, x));
const skillLabel = (sr) => SKILL_LABELS.find(([min]) => sr >= min)[1];
const pctStr = (x) => `${Math.round(x * 100)}%`;

function defaultSkill() {
  return { v: 2, hands: 0, w: 0, s: 0, vpip: 0, pfr: 0, aggr: 0, calls: 0, folds: 0, idealSum: 0,
    pos: { late: [0, 0], early: [0, 0], blinds: [0, 0] }, sawFlop: 0, sdSeen: 0, sdWon: 0,
    netBB: 0, evBB: 0, evBBw: 0, tiltHands: 0, tiltW: 0, tiltS: 0, recentQ: [], tourneys: [] };
}
// Folds one finished hand into the running totals.
function addHandToSkill(k0, h) {
  if (!h) return k0;
  const base = defaultSkill();
  const k = { ...base, ...k0, pos: { ...base.pos, ...(k0 && k0.pos) } };
  const pk = h.position || "early";
  const afterLoss = h.afterBigLoss && h.w > 0;
  return {
    ...k, hands: k.hands + 1, w: k.w + h.w, s: k.s + h.s,
    vpip: k.vpip + (h.vpip ? 1 : 0), pfr: k.pfr + (h.pfr ? 1 : 0), aggr: k.aggr + h.aggr, calls: k.calls + h.calls, folds: k.folds + h.folds,
    idealSum: k.idealSum + (h.idealVpip || 0.34),
    pos: { ...k.pos, [pk]: [k.pos[pk][0] + 1, k.pos[pk][1] + (h.vpip ? 1 : 0)] },
    sawFlop: k.sawFlop + (h.sawFlop ? 1 : 0), sdSeen: k.sdSeen + (h.wentSD ? 1 : 0), sdWon: k.sdWon + (h.wonSD ? 1 : 0),
    netBB: k.netBB + h.netBB, evBB: k.evBB + h.evBB, evBBw: k.evBBw + h.evBB * (0.5 + (h.botSkill == null ? 0.4 : h.botSkill)),
    tiltHands: k.tiltHands + (afterLoss ? 1 : 0), tiltW: k.tiltW + (afterLoss ? h.w : 0), tiltS: k.tiltS + (afterLoss ? h.s : 0),
    recentQ: h.w > 0 ? [h.s / h.w, ...(k.recentQ || [])].slice(0, 30) : k.recentQ,
  };
}

// ---- GPI-style tournament index: buy-in factor x finish factor x aging, best 8 results ----
const TOURNEY_BUYINS = [{ key: "free", label: "Freeroll", buyIn: 0 }, { key: "t250", label: "250", buyIn: 250 }, { key: "t1k", label: "1,000", buyIn: 1000 }, { key: "t5k", label: "5,000", buyIn: 5000 }];
const PAYOUTS = { 2: [1], 3: [1], 4: [0.7, 0.3], 5: [0.7, 0.3], 6: [0.5, 0.3, 0.2], 7: [0.5, 0.3, 0.2], 8: [0.5, 0.3, 0.2], 9: [0.5, 0.3, 0.2] };
const TOURNEY_STACK = 1500;
function tourneyPrize(field, place, buyIn) { const p = PAYOUTS[field] || [1]; return place <= p.length ? Math.round(p[place - 1] * buyIn * field) : 0; }
function tourneyPoints(r, now = Date.now()) {
  const paid = (PAYOUTS[r.field] || [1]).length;
  if (r.place > paid) return 0; // like the GPI, only cashes score
  const buyInFactor = Math.max(0.4, Math.min(2, 1 + 0.35 * Math.log2(Math.max(250, r.buyIn || 0) / 1000)));
  const finishFactor = Math.log2(r.field / r.place) + 0.5;
  const days = (now - r.at) / 86400000;
  const aging = days <= 7 ? 1 : days <= 14 ? 0.8 : days <= 30 ? 0.6 : days <= 60 ? 0.4 : days <= 90 ? 0.2 : 0;
  return 100 * buyInFactor * finishFactor * aging;
}
function tournamentIndex(list, now = Date.now()) {
  return Math.round((list || []).map((r) => tourneyPoints(r, now)).sort((a, b) => b - a).slice(0, 8).reduce((a, b) => a + b, 0));
}

// The full read: eight components, each 0-100, blended into one rating with a margin that shrinks as you play more.
function computeSkill(k) {
  if (!k || k.hands < 1) return null;
  const n = k.hands;
  const q = k.w > 0 ? k.s / k.w : null;
  const vpip = k.vpip / n, pfr = k.pfr / n, ideal = (k.idealSum || n * 0.34) / n;
  const af = k.aggr / Math.max(1, k.calls); // never calling at all reads as max aggression, not a free pass
  const comps = [];
  const add = (key, label, score, detail, tip, enough = true) => comps.push({ key, label, score: Math.round(clamp100(score)), detail, tip, enough, weight: SKILL_WEIGHTS[key] });

  add("decisions", "Decision quality", q == null ? 50 : ((q - 0.5) / 0.45) * 100,
    q == null ? "No graded decisions yet" : `${pctStr(q)} of your calls, folds and bets matched the odds`,
    "Before calling, compare your win chance to the price. Calling 50 into a 150 pot needs about 25% to break even.", q != null);

  const loose = vpip - ideal, raiseRatio = vpip > 0 ? pfr / vpip : 0;
  add("preflop", "Preflop discipline", (100 - Math.abs(loose) * 260) * 0.65 + clamp100((raiseRatio / 0.7) * 100) * 0.35,
    `You play ${pctStr(vpip)} of hands (about ${pctStr(ideal)} is ideal at your tables), raising ${pctStr(raiseRatio)} of the time you enter`,
    loose > 0.08 ? `Fold more weak starting hands. Aim for around ${pctStr(ideal)} at these table sizes.` : loose < -0.08 ? "You're folding too much. Open up with suited aces, pairs and connected cards, especially on the button." : "When you do play a hand, raise instead of just calling.", n >= 10);

  add("aggression", "Aggression", af >= 1.5 && af <= 3.5 ? 100 : af < 1.5 ? (af / 1.5) * 100 : 100 - (af - 3.5) * 25,
    `${af.toFixed(1)} bets and raises for every call`,
    af < 1.5 ? "Bet your strong hands instead of checking and calling. Make them pay." : "Ease off the barrels a little. Not every hand needs a raise.", k.aggr + k.calls >= 8);

  // compare acting last (button, cutoff) against every other seat, so short-handed tables still score
  const [lateN, lateV] = k.pos.late;
  const earlyN = k.pos.early[0] + k.pos.blinds[0], earlyV = k.pos.early[1] + k.pos.blinds[1];
  const posOk = lateN >= 5 && earlyN >= 5;
  const posDiff = posOk ? lateV / lateN - earlyV / earlyN : 0;
  add("position", "Position", posOk ? 50 + posDiff * 250 : 50,
    posOk ? `You play ${pctStr(lateV / lateN)} of hands when acting last vs ${pctStr(earlyV / earlyN)} from other seats` : "Needs more hands from different seats",
    "Play more hands when you act last and fewer when you act first. Acting last means more information.", posOk);

  const sdOk = k.sdSeen >= 5;
  const wsd = sdOk ? k.sdWon / k.sdSeen : 0, wtsd = k.sawFlop > 0 ? k.sdSeen / k.sawFlop : 0;
  add("showdown", "Showdown", sdOk ? clamp100(wsd * 140 - 20) * 0.7 + clamp100(100 - Math.abs(wtsd - 0.32) * 250) * 0.3 : 50,
    sdOk ? `You win ${pctStr(wsd)} of showdowns and reach one ${pctStr(wtsd)} of the time you see a flop` : "Needs a few more showdowns",
    wsd < 0.5 ? "You're getting to showdown with too many second-best hands. Let marginal hands go on the river." : "Good showdown value. Keep only taking strong hands to the end.", sdOk);

  const bb100 = (k.evBBw / n) * 100;
  add("results", "Luck-adjusted results", 50 + bb100 * 2.5,
    `${bb100 >= 0 ? "+" : ""}${Math.round(bb100)} big blinds per 100 hands, luck-adjusted`,
    "Results follow decisions. Fix your weakest area and this climbs.", n >= 50);

  const tOk = k.tiltHands >= 4 && q != null;
  const qt = tOk ? k.tiltS / k.tiltW : 0;
  add("composure", "Composure", tOk ? 75 + (qt - q) * 300 : 50,
    tOk ? `Right after a big loss your decisions are ${pctStr(qt)} good vs ${pctStr(q)} normally` : "Needs a few hands after big losses",
    "After losing a big pot, slow down for a hand or two. Tilt costs more than bad luck.", tOk);

  const idx = tournamentIndex(k.tourneys);
  const tCount = (k.tourneys || []).length;
  add("tournaments", "Tournament index", tCount ? Math.log2(1 + idx / 40) * 22 : 50,
    tCount ? `${idx.toLocaleString()} index points from ${tCount} tournament${tCount === 1 ? "" : "s"}` : "No tournaments played yet",
    "Cash in more tournaments, especially bigger buy-ins. Only paid finishes score, and recent ones count most.", tCount >= 3);

  // components without enough data count half, so a thin sample can't swing the rating much
  let num = 0, den = 0;
  for (const c of comps) { const w = c.weight * (c.enough ? 1 : 0.5); num += c.score * w; den += w; }
  const sr = Math.round(num / den);
  const margin = Math.max(3, Math.round(30 / Math.sqrt(Math.max(1, n / 8))));
  return { sr, margin, label: skillLabel(sr), comps, stats: { q, vpip, pfr, af, ideal, n, idx } };
}
// A plain-English read built from the weakest and strongest components.
function skillReport(sk) {
  if (!sk) return "Play some hands and your report will show up here.";
  const ranked = sk.comps.filter((c) => c.enough).sort((a, b) => a.score - b.score);
  if (ranked.length === 0) return "Keep playing. A few more hands and there's enough to read your game.";
  const leak = ranked[0], best = ranked[ranked.length - 1];
  const parts = [];
  if (best !== leak && best.score >= 55) parts.push(`Your strongest area is ${best.label.toLowerCase()}: ${best.detail.charAt(0).toLowerCase() + best.detail.slice(1)}.`);
  parts.push(`Your biggest leak is ${leak.label.toLowerCase()}: ${leak.detail.charAt(0).toLowerCase() + leak.detail.slice(1)}.`);
  parts.push(leak.tip);
  return parts.join(" ");
}
// Placement: your Skill Rating sets your start, pulled toward the middle when the sample is small.
function placementFromSkill(skill, games) {
  const sk = computeSkill(skill);
  const sr = sk ? sk.sr : 45;
  const srAdj = 45 + (sr - 45) * Math.min(1, (skill ? skill.hands : 0) / 60);
  const winRate = games.length ? games.filter((g) => g.won).length / games.length : 0.5;
  const rating = Math.round(Math.max(0, Math.min(PLACEMENT_CAP, ((srAdj - 15) / 70) * 1300 + (winRate - 0.5) * 200)));
  return { rating, sk, report: skillReport(sk) };
}
// Ranked match grading still uses decision quality from just that match.
function matchQuality(hands) {
  let w = 0, s = 0;
  for (const h of hands) { if (h) { w += h.w || 0; s += h.s || 0; } }
  return w > 0 ? s / w : null;
}

export { IDEAL_VPIP, PAYOUTS, TOURNEY_BUYINS, TOURNEY_STACK, addHandToSkill, computeSkill, defaultSkill, matchQuality, pctStr, placementFromSkill, skillReport, tournamentIndex, tourneyPoints, tourneyPrize };
