import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { cloud, cloudEnabled, cleanUsername, api, pushSupported, isStandalone, isIOS, registerSW, enablePush, pushEnabled } from "./cloud.js";

/* =========================================================================
   SHARED HELPERS
   ========================================================================= */
const SUITS = ["s", "h", "d", "c"];
const SUIT_GLYPH = { s: "♠", h: "♥", d: "♦", c: "♣" };
const SUIT_COLOR = { s: "#1A1A1A", h: "#E5383B", d: "#E5383B", c: "#1A1A1A" };
const SUIT_COLOR_CB = { s: "#1A1A1A", h: "#2E6FB0", d: "#2E6FB0", c: "#1A1A1A" };
const RANK_SING = { 2: "Two", 3: "Three", 4: "Four", 5: "Five", 6: "Six", 7: "Seven", 8: "Eight", 9: "Nine", 10: "Ten", 11: "Jack", 12: "Queen", 13: "King", 14: "Ace" };
const RANK_PLUR = { 2: "Twos", 3: "Threes", 4: "Fours", 5: "Fives", 6: "Sixes", 7: "Sevens", 8: "Eights", 9: "Nines", 10: "Tens", 11: "Jacks", 12: "Queens", 13: "Kings", 14: "Aces" };
const rankLabel = (r) => (r <= 10 ? String(r) : RANK_SING[r][0]);
const TURN_SECONDS = 30;
const DEAL_OFFSET = 0.42; // seconds: cards start flying once the shuffle finishes
const AVATAR_COLORS = ["#2F6FDE", "#12A36B", "#E0861E", "#8B5CF6", "#E0475B", "#0EA5B7", "#D9468F", "#7C8A1E"];
const BOT_EMOJI = ["🧑‍💻", "😼", "🐯", "🦊", "🐼"];
const BOT_NAMES = ["Marlo", "Yuki", "Renn", "Devon", "Kira", "Teo", "Sasha", "Bram"];
const VIP_NAMES = ["Laurent", "Vivienne", "Sterling", "Margaux", "Aurelio", "Celeste", "Dmitri", "Isolde"];

const AVATAR_CATALOG = [
  { emoji: "🫵", cost: 0 }, { emoji: "🙂", cost: 0 }, { emoji: "😎", cost: 0 }, { emoji: "🐱", cost: 0 },
  { emoji: "🦊", cost: 400 }, { emoji: "🐸", cost: 400 }, { emoji: "🐼", cost: 600 }, { emoji: "🤖", cost: 800 },
  { emoji: "👽", cost: 800 }, { emoji: "🦁", cost: 1200 }, { emoji: "🐉", cost: 1600 }, { emoji: "🥷", cost: 1600 },
  { emoji: "👑", cost: 2500 }, { emoji: "🃏", cost: 3000 },
];
const CHIP_PACKS = [
  { label: "Quick Refill", amount: 500 }, { label: "Big Refill", amount: 1500 }, { label: "Mega Refill", amount: 5000 },
];
const MOCK_PLAYERS = [
  { name: "Jax", chips: 18400, wins: 62, hands: 140 }, { name: "Kapish", chips: 9200, wins: 34, hands: 98 },
  { name: "Chezanax", chips: 26100, wins: 88, hands: 201 }, { name: "Mei", chips: 41200, wins: 121, hands: 260 },
  { name: "Renn", chips: 7300, wins: 21, hands: 77 }, { name: "Yuki", chips: 15600, wins: 55, hands: 150 },
  { name: "Priya", chips: 12800, wins: 40, hands: 110 }, { name: "Dev", chips: 5200, wins: 15, hands: 60 },
];
// aggression: how likely/big they bet & raise. bluff: chance to raise on a weak hand. tight: how much strength they need to continue.
const BOT_PERSONALITIES = [
  { tag: "Loose-Aggressive", aggression: 1.35, bluff: 0.22, tight: 0.85 },
  { tag: "Tight", aggression: 0.7, bluff: 0.05, tight: 1.25 },
  { tag: "Balanced", aggression: 1.0, bluff: 0.12, tight: 1.0 },
  { tag: "Maniac", aggression: 1.7, bluff: 0.35, tight: 0.7 },
  { tag: "Rock", aggression: 0.5, bluff: 0.02, tight: 1.5 },
  { tag: "Balanced", aggression: 1.1, bluff: 0.1, tight: 1.05 },
  { tag: "Loose-Passive", aggression: 0.8, bluff: 0.08, tight: 0.8 },
  { tag: "Tight-Aggressive", aggression: 1.3, bluff: 0.1, tight: 1.2 },
];
const STAKES_TIERS = [
  { key: "micro", label: "Micro Stakes", sb: 10, bb: 20, minBankroll: 0 },
  { key: "low", label: "Low Stakes", sb: 25, bb: 50, minBankroll: 1000 },
  { key: "high", label: "High Stakes", sb: 100, bb: 200, minBankroll: 5000 },
];
const TABLE_SIZES = [
  { key: "heads-up", label: "Heads-Up", seats: 2, sub: "Just you and one opponent" },
  { key: "four-max", label: "4-Max", seats: 4, sub: "Classic short-handed table" },
  { key: "six-max", label: "6-Max", seats: 6, sub: "A full, livelier table" },
  { key: "nine-max", label: "9-Max", seats: 9, sub: "A full ring game" },
];
const BLIND_LEVEL_MULT = [1, 1.5, 2, 3, 4, 6, 8, 10];
const ACHIEVEMENTS = [
  { id: "first_win", label: "First blood", desc: "Win a hand", stat: "handsWon", target: 1 },
  { id: "ten_wins", label: "Heater", desc: "Win 10 hands", stat: "handsWon", target: 10 },
  { id: "fifty_wins", label: "Regular", desc: "Win 50 hands", stat: "handsWon", target: 50 },
  { id: "hundred_hands", label: "Grinder", desc: "Play 100 hands", stat: "handsPlayed", target: 100 },
  { id: "big_pot", label: "Big score", desc: "Win a pot of 500 or more", stat: "biggestPot", target: 500 },
  { id: "huge_pot", label: "Whale", desc: "Win a pot of 2,000 or more", stat: "biggestPot", target: 2000 },
  { id: "net_positive", label: "In the green", desc: "Get to +1,000 net chips", stat: "netChips", target: 1000 },
].map((a) => ({ ...a, check: (s) => (s[a.stat] || 0) >= a.target }));

/* =========================================================================
   RANKED MODE
   Ladder: Unranked -> 5 placement matches -> Bronze I ... Diamond III -> Champion.
   Each tier spans 300 RP, split into divisions I, II, III of 100 RP each.
   ========================================================================= */
const RANKED_BUYIN = 1000;
const RANKED_STAKES = { sb: 25, bb: 50 };
const RANKED_MATCH_HANDS = 20; // a ranked match is 20 hands, or less if someone takes every chip
const PLACEMENT_MATCHES = 5;
const PLACEMENT_CAP = 1299; // you can place as high as Diamond I, Champion has to be earned
const DIV_SIZE = 100;
const RANK_RESET_TARGET = 600;
const RANK_TIERS = [
  { key: "bronze", label: "Bronze", min: 0, color: "#D9894E", botSkill: 0.12 },
  { key: "silver", label: "Silver", min: 300, color: "#C9D4E2", botSkill: 0.28 },
  { key: "gold", label: "Gold", min: 600, color: "#F5C451", botSkill: 0.45 },
  { key: "platinum", label: "Platinum", min: 900, color: "#3FD8C6", botSkill: 0.6 },
  { key: "diamond", label: "Diamond", min: 1200, color: "#6FA8FF", botSkill: 0.76 },
  { key: "champion", label: "Champion", min: 1500, color: "#E36BFF", botSkill: 0.9 },
];
const UNRANKED = { key: "unranked", label: "Unranked", min: -1, color: "#7486A3", botSkill: 0.5 };
const ROMAN = ["", "I", "II", "III"];
function tierForRating(r) { let t = RANK_TIERS[0]; for (const tier of RANK_TIERS) if (r >= tier.min) t = tier; return t; }
function divisionOf(r) { const t = tierForRating(r); if (t.key === "champion") return null; return Math.min(3, Math.floor((r - t.min) / DIV_SIZE) + 1); }
function rankName(r) { const t = tierForRating(r); const d = divisionOf(r); return d ? `${t.label} ${ROMAN[d]}` : t.label; }
function rankProgress(r) {
  const t = tierForRating(r); const d = divisionOf(r);
  if (!d) return { pct: 1, toNext: 0, nextLabel: null };
  const base = t.min + (d - 1) * DIV_SIZE, nextAt = base + DIV_SIZE;
  return { pct: Math.max(0, Math.min(1, (r - base) / DIV_SIZE)), toNext: nextAt - Math.round(r), nextLabel: rankName(nextAt) };
}
const isPlaced = (ranked) => !!(ranked && ranked.placed);
const tierOf = (ranked) => (isPlaced(ranked) ? tierForRating(ranked.rating) : UNRANKED);

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

/* =========================================================================
   PROGRESSION: cosmetics, login streak, challenges, season pass
   ========================================================================= */
// Every back and felt is its own drawn pattern, laid over the item's colors.
const svgBg = (w, h, body) => `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}'>${body}</svg>`)}")`;
const PAT = (() => {
  const W = "#FFFFFF";
  const ring = (cx, cy) => Array.from({ length: 12 }, (_, k) => { const a = (k * 30 * Math.PI) / 180; return `<circle cx='${(cx + 5 * Math.cos(a)).toFixed(2)}' cy='${(cy + 5 * Math.sin(a)).toFixed(2)}' r='8.5' fill='none' stroke='${W}' stroke-opacity='0.42' stroke-width='0.45'/>`; }).join("");
  const rays = Array.from({ length: 18 }, (_, k) => { const a = (k * 20 * Math.PI) / 180, d = (3.2 * Math.PI) / 180, R = 60; const p = (t) => `${(20 + R * Math.cos(t)).toFixed(1)},${(28 + R * Math.sin(t)).toFixed(1)}`; return `<polygon points='20,28 ${p(a - d)} ${p(a + d)}' fill='#F2C14E' fill-opacity='0.2'/>`; }).join("");
  const spade = (x, y, sc, fill, op) => `<path transform='translate(${x} ${y}) scale(${sc})' d='M5 0C5 0 0 4.2 0 6.6C0 8.4 1.9 9.4 3.5 8.3L2.7 10.4H7.3L6.5 8.3C8.1 9.4 10 8.4 10 6.6C10 4.2 5 0 5 0Z' fill='${fill}' fill-opacity='${op}'/>`;
  const club = (x, y, sc, fill, op) => `<g transform='translate(${x} ${y}) scale(${sc})' fill='${fill}' fill-opacity='${op}'><circle cx='5' cy='2.6' r='2.5'/><circle cx='2.5' cy='6.4' r='2.5'/><circle cx='7.5' cy='6.4' r='2.5'/><path d='M4.2 6H5.8L6.9 10.4H3.1Z'/></g>`;
  return {
    classicTile: svgBg(6, 6, `<path d='M0 6L6 0M-1 1L1 -1M5 7L7 5' stroke='${W}' stroke-opacity='0.16' stroke-width='1.1'/><path d='M0 0L6 6' stroke='${W}' stroke-opacity='0.07' stroke-width='0.8'/>`),
    classicMark: svgBg(40, 56, `<ellipse cx='20' cy='28' rx='9' ry='12' fill='none' stroke='${W}' stroke-opacity='0.5' stroke-width='0.9'/><path d='M20 21.5L24 28L20 34.5L16 28Z' fill='${W}' fill-opacity='0.55'/>`),
    rosette: svgBg(40, 56, `${ring(20, 28)}<circle cx='20' cy='28' r='2' fill='${W}' fill-opacity='0.5'/>`),
    waves: svgBg(10, 5, `<path d='M0 2.5Q2.5 0.5 5 2.5T10 2.5' fill='none' stroke='${W}' stroke-opacity='0.14' stroke-width='0.6'/>`),
    suits: svgBg(16, 16, `${spade(1.5, 1.5, 0.5, W, 0.2)}${club(9.5, 9.5, 0.5, W, 0.2)}`),
    sunburst: svgBg(40, 56, `${rays}<circle cx='20' cy='28' r='6' fill='none' stroke='#F2C14E' stroke-opacity='0.75' stroke-width='0.8'/><circle cx='20' cy='28' r='2.2' fill='#F2C14E' fill-opacity='0.8'/>`),
    synthGrid: svgBg(8, 8, `<path d='M0 0.25H8M0.25 0V8' stroke='#FFD1F0' stroke-opacity='0.28' stroke-width='0.5'/>`),
    synthSun: svgBg(40, 56, `<defs><clipPath id='c'><circle cx='20' cy='26' r='9'/></clipPath></defs><g clip-path='url(#c)'><rect x='10' y='16' width='20' height='20' fill='#FFC46B' fill-opacity='0.85'/>${[27, 30, 33].map((y) => `<rect x='10' y='${y}' width='20' height='1.3' fill='#2A1150'/>`).join("")}</g>`),
    carbon: svgBg(6, 6, `<rect width='3' height='3' fill='${W}' fill-opacity='0.07'/><rect x='3' y='3' width='3' height='3' fill='${W}' fill-opacity='0.07'/><path d='M0 0.4H3M3 3.4H6' stroke='${W}' stroke-opacity='0.12' stroke-width='0.5'/>`),
    quilt: svgBg(10, 10, `<path d='M5 0L10 5L5 10L0 5Z' fill='none' stroke='#FFF6D6' stroke-opacity='0.55' stroke-width='0.6'/><path d='M5 0.9L9.1 5' stroke='#7A4E0E' stroke-opacity='0.35' stroke-width='0.6'/>`),
    foilMark: svgBg(40, 56, `<circle cx='20' cy='28' r='9.5' fill='#8A5A12' fill-opacity='0.55'/><circle cx='20' cy='28' r='9.5' fill='none' stroke='#FFF3C4' stroke-opacity='0.8' stroke-width='0.7'/>${spade(16, 23.5, 0.8, "#FFF3C4", 0.95)}`),
    // prestige: a twelve point gold star over violet quilting, only for players who've finished a season at Champion
    prestigeMark: svgBg(40, 56, `<circle cx='20' cy='28' r='11' fill='#1A0A33' fill-opacity='0.75'/><polygon points='${Array.from({ length: 24 }, (_, k) => { const r = k % 2 ? 4.6 : 9.6; const a = (k * 15 - 90) * Math.PI / 180; return `${(20 + r * Math.cos(a)).toFixed(2)},${(28 + r * Math.sin(a)).toFixed(2)}`; }).join(" ")}' fill='#F2C14E'/><circle cx='20' cy='28' r='3.3' fill='#B04BFF'/><circle cx='20' cy='28' r='11' fill='none' stroke='#F2C14E' stroke-opacity='0.7' stroke-width='0.6'/>`),
    prestigeQuilt: svgBg(8, 8, `<path d='M4 0L8 4L4 8L0 4Z' fill='none' stroke='#E9B8FF' stroke-opacity='0.22' stroke-width='0.6'/><circle cx='4' cy='4' r='0.6' fill='#F2C14E' fill-opacity='0.5'/>`),
    prestigeFelt: svgBg(30, 30, `<path d='M15 0L30 15L15 30L0 15Z' fill='none' stroke='#F2C14E' stroke-opacity='0.07'/><path d='M15 11L16.2 13.8L19 15L16.2 16.2L15 19L13.8 16.2L11 15L13.8 13.8Z' fill='#F2C14E' fill-opacity='0.08'/>`),
    holoQuilt: svgBg(8, 8, `<path d='M4 0L8 4L4 8L0 4Z' fill='none' stroke='#FFFFFF' stroke-opacity='0.35' stroke-width='0.6'/>`),
    holoMark: svgBg(40, 56, `<path d='M20 17L27 28L20 39L13 28Z' fill='#FFFFFF' fill-opacity='0.55'/><path d='M20 17L27 28L20 39L13 28Z' fill='none' stroke='#FFFFFF' stroke-opacity='0.9' stroke-width='0.7'/><ellipse cx='20' cy='28' rx='11' ry='15' fill='none' stroke='#FFFFFF' stroke-opacity='0.55' stroke-width='0.6'/>`),
    // felts
    herring: svgBg(16, 8, `<path d='M0 8L8 0M8 8L16 0' stroke='${W}' stroke-opacity='0.05' stroke-width='2.4'/><path d='M8 8L0 0M16 8L8 0' stroke='#000' stroke-opacity='0.05' stroke-width='2.4'/>`),
    lattice: svgBg(22, 22, `<path d='M11 0L22 11L11 22L0 11Z' fill='none' stroke='${W}' stroke-opacity='0.05'/>`),
    ripple: svgBg(60, 60, `${[8, 16, 24].map((r) => `<circle cx='30' cy='30' r='${r}' fill='none' stroke='${W}' stroke-opacity='0.045' stroke-width='1.2'/>`).join("")}`),
    hex: svgBg(14, 24, `<path d='M7 0L14 4V12L7 16L0 12V4Z M7 16V24' fill='none' stroke='${W}' stroke-opacity='0.06' stroke-width='0.8'/>`),
  };
})();
const CARD_BACKS = [
  { key: "blue", label: "Classic", cost: 0, a: "#2F6FDE", b: "#1F4FA8", ring: "#FFFFFF", img: `${PAT.classicMark}, ${PAT.classicTile}`, size: "100% 100%, 6px 6px" },
  { key: "crimson", label: "Banknote", cost: 800, a: "#B8333F", b: "#7E1C27", ring: "#F4E9D8", img: `${PAT.rosette}, ${PAT.waves}`, size: "100% 100%, 10px 5px" },
  { key: "emerald", label: "Clubhouse", cost: 800, a: "#127A52", b: "#0A5238", ring: "#F2F5EF", img: PAT.suits, size: "12px 12px" },
  { key: "midnight", label: "Sunburst", cost: 2500, a: "#141C33", b: "#0A0F1F", ring: "#F2C14E", img: PAT.sunburst, size: "100% 100%" },
  { key: "neon", label: "Synthwave", pass: 10, a: "#5B2AA8", b: "#C02679", ring: "#FFD1F0", img: `${PAT.synthSun}, ${PAT.synthGrid}, linear-gradient(180deg, #3A1670, #C02679)`, size: "100% 100%, 7px 7px, 100% 100%" },
  { key: "carbon", label: "Carbon", pass: 20, a: "#22262E", b: "#121418", ring: "#9AA4B2", img: PAT.carbon, size: "5px 5px" },
  { key: "prestige", label: "Prestige Gold", prestige: 1, a: "#2A0E4A", b: "#14062A", ring: "#F2C14E", img: `${PAT.prestigeMark}, ${PAT.prestigeQuilt}`, size: "100% 100%, 7px 7px" },
  { key: "holo", label: "Holo", pass: 25, anim: true, a: "#2A2F55", b: "#151833", ring: "#F4F7FF", img: `${PAT.holoMark}, ${PAT.holoQuilt}, linear-gradient(115deg, #FF8CC6, #FFD98A, #8CFFD0, #8CC8FF, #C79BFF, #FF8CC6, #FFD98A)`, size: "100% 100%, 7px 7px, 300% 300%" },
  { key: "foil", label: "Gold Foil", pass: 30, a: "#D9A53A", b: "#9C6A16", ring: "#FFF3C4", img: `${PAT.foilMark}, ${PAT.quilt}, linear-gradient(135deg, #F6D77A, #C88F27 50%, #F2CB6A)`, size: "100% 100%, 8px 8px, 100% 100%" },
];
const FELTS = [
  { key: "green", label: "Classic Green", cost: 0, c1: "#22A866", c2: "#138048", c3: "#0B5C33", rail: "#5A3A20" },
  { key: "royal", label: "Herringbone", cost: 1500, c1: "#2F76D6", c2: "#1B52A8", c3: "#0F3673", rail: "#2B2018", tex: PAT.herring, texSize: "16px 8px" },
  { key: "crimson", label: "Bordeaux", cost: 1500, c1: "#9E2F3E", c2: "#701C2A", c3: "#4A0F1A", rail: "#24170F", tex: PAT.lattice, texSize: "22px 22px", line: "rgba(233,190,110,0.55)" },
  { key: "purple", label: "Velvet", pass: 5, c1: "#8A4FD6", c2: "#5E2DA3", c3: "#3B1A6E", rail: "#221A33", tex: "radial-gradient(40% 30% at 30% 30%, rgba(255,255,255,0.10), transparent 70%), radial-gradient(35% 28% at 72% 68%, rgba(255,255,255,0.07), transparent 70%), radial-gradient(30% 40% at 60% 20%, rgba(0,0,0,0.12), transparent 70%)", texSize: "100% 100%" },
  { key: "ocean", label: "Lagoon", pass: 15, c1: "#1FB5AE", c2: "#0F7E78", c3: "#09524E", rail: "#E8DCC0", tex: PAT.ripple, texSize: "60px 60px" },
  { key: "prestige", label: "Prestige", prestige: 2, c1: "#5B2A9E", c2: "#3B1670", c3: "#210A44", rail: "#C9A24D", tex: PAT.prestigeFelt, texSize: "30px 30px", line: "rgba(242,193,78,0.55)" },
  { key: "aurora", label: "Aurora", pass: 28, anim: true, c1: "#12465A", c2: "#0B2C3A", c3: "#051A23", rail: "#1B2433", tex: "linear-gradient(115deg, rgba(52,211,153,0.42), rgba(56,189,248,0.16) 25%, rgba(168,85,247,0.38) 50%, rgba(52,211,153,0.14) 75%, rgba(56,189,248,0.4))", texSize: "300% 300%", line: "rgba(140,255,208,0.35)" },
  { key: "blackout", label: "Onyx", cost: 4000, c1: "#2C323C", c2: "#191D24", c3: "#0D0F13", rail: "#C9A24D", tex: PAT.hex, texSize: "14px 24px", line: "rgba(201,162,77,0.5)" },
];
const findBack = (k) => CARD_BACKS.find((b) => b.key === k) || CARD_BACKS[0];
// prestige gear isn't bought, it unlocks when your prestige count gets there
const ownsCosmetic = (cos, field, item, prestige) => (cos[field] || []).includes(item.key) || item.cost === 0 || (!!item.prestige && (prestige || 0) >= item.prestige);
const findFelt = (k) => FELTS.find((f) => f.key === k) || FELTS[0];
function defaultCosmetics() { return { backs: ["blue"], felts: ["green"], cardBack: "blue", felt: "green", chipsets: ["classic"], chipset: "classic", fxs: ["confetti"], fx: "confetti" }; }

const STREAK_REWARDS = [300, 400, 500, 650, 800, 1000, 1500];
function localDateStr(d = new Date()) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
function yesterdayStr() { const d = new Date(); d.setDate(d.getDate() - 1); return localDateStr(d); }
function weekKey(d = new Date()) { const m = new Date(d); m.setHours(0, 0, 0, 0); m.setDate(m.getDate() - ((m.getDay() + 6) % 7)); return `W${localDateStr(m)}`; }
function weekResetDays() { const d = new Date(); return 7 - ((d.getDay() + 6) % 7); }
function streakState(st) {
  const today = localDateStr();
  if (!st || !st.last) return { claimedToday: false, nextDay: 1 };
  if (st.last === today) return { claimedToday: true, nextDay: Math.min(7, st.count) };
  return { claimedToday: false, nextDay: st.last === yesterdayStr() ? (st.count % 7) + 1 : 1 };
}

// Each challenge counts something that happens in a hand or at the end of a match.
const CHALLENGE_DEFS = [
  { id: "hands", daily: 20, weekly: 120, text: (n) => `Play ${n} hands`, ev: (e) => (e.hand ? 1 : 0) },
  { id: "wins", daily: 6, weekly: 35, text: (n) => `Win ${n} hands`, ev: (e) => (e.hand && e.won ? 1 : 0) },
  { id: "showdowns", daily: 3, weekly: 15, text: (n) => `Win ${n} showdowns`, ev: (e) => (e.hand && e.wonSD ? 1 : 0) },
  { id: "flush", daily: 1, weekly: 3, text: (n) => (n === 1 ? "Win a hand with a flush or better" : `Win ${n} hands with a flush or better`), ev: (e) => (e.hand && e.won && e.best && [5, 6, 7, 8].includes(e.best.kind) ? 1 : 0) },
  { id: "late", daily: 3, weekly: 15, text: (n) => `Win ${n} hands from the button or cutoff`, ev: (e) => (e.hand && e.won && e.position === "late" ? 1 : 0) },
  { id: "bigpot", daily: 1, weekly: 4, text: (n) => (n === 1 ? "Win a pot of 1,000 or more" : `Win ${n} pots of 1,000 or more`), ev: (e) => (e.hand && e.won && e.potWon >= 1000 ? 1 : 0) },
  { id: "allin", daily: 1, weekly: 4, text: (n) => (n === 1 ? "Win an all-in" : `Win ${n} all-ins`), ev: (e) => (e.hand && e.won && e.allIn ? 1 : 0) },
  { id: "good", daily: 25, weekly: 150, text: (n) => `Make ${n} good decisions`, ev: (e) => (e.hand ? e.goodCount || 0 : 0) },
  { id: "ranked", daily: 1, weekly: 3, text: (n) => (n === 1 ? "Win a ranked match" : `Win ${n} ranked matches`), ev: (e) => (e.rankedWin ? 1 : 0) },
  { id: "cash", daily: 1, weekly: 3, text: (n) => (n === 1 ? "Cash in a tournament" : `Cash in ${n} tournaments`), ev: (e) => (e.tourneyCash ? 1 : 0) },
];
const CHALLENGE_REWARD = { daily: { chips: 250, xp: 120 }, weekly: { chips: 1000, xp: 400 } };
function hashStr(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function pickSeeded(list, n, seed) { const a = list.slice(); let x = seed || 1; for (let i = a.length - 1; i > 0; i--) { x = (Math.imul(x, 1103515245) + 12345) >>> 0; const j = x % (i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a.slice(0, n); }
function ensureChallenges(ch) {
  const day = localDateStr(), week = weekKey();
  let next = ch || {};
  if (next.day !== day) next = { ...next, day, daily: pickSeeded(CHALLENGE_DEFS, 3, hashStr("d" + day)).map((c) => ({ id: c.id, target: c.daily, progress: 0, claimed: false })) };
  if (next.week !== week) next = { ...next, week, weekly: pickSeeded(CHALLENGE_DEFS.filter((c) => c.id !== "hands" && c.id !== "good"), 3, hashStr("w" + week)).map((c) => ({ id: c.id, target: c.weekly, progress: 0, claimed: false })) };
  const fix = (list, key, seed) => {
    const kept = (list || []).filter((c) => CHALLENGE_DEFS.some((d) => d.id === c.id));
    if (kept.length >= 3) return kept;
    const extra = pickSeeded(CHALLENGE_DEFS.filter((d) => !kept.some((c) => c.id === d.id) && (key === "daily" || (d.id !== "hands" && d.id !== "good"))), 3 - kept.length, hashStr(seed)).map((d) => ({ id: d.id, target: d[key], progress: 0, claimed: false }));
    return [...kept, ...extra];
  };
  const daily = fix(next.daily, "daily", "dx" + day), weekly = fix(next.weekly, "weekly", "wx" + week);
  if (daily !== next.daily || weekly !== next.weekly) next = { ...next, daily, weekly };
  return next;
}
function applyChallengeEvent(ch, e) {
  const bump = (list) => list.map((c) => { const def = CHALLENGE_DEFS.find((d) => d.id === c.id); const inc = def ? def.ev(e) : 0; return inc ? { ...c, progress: Math.min(c.target, c.progress + inc) } : c; });
  const done = (list, list2) => list2.filter((c, i) => c.progress >= c.target && list[i].progress < list[i].target).map((c) => c.id);
  const daily = bump(ch.daily), weekly = bump(ch.weekly);
  return { ch: { ...ch, daily, weekly }, completed: [...done(ch.daily, daily), ...done(ch.weekly, weekly)] };
}
const challengeText = (c) => { const def = CHALLENGE_DEFS.find((d) => d.id === c.id); return def ? def.text(c.target) : c.id; };

// Season pass: 30 levels, 400 XP each, rewards granted the moment you level up.
const PASS_LEVELS = 30, PASS_XP = 400;
const RARITY = { common: "#9AA4B2", rare: "#4EA8FF", epic: "#B072FF", legendary: "#F5B83D" };
// Every level gives something. Chips fill the gaps, the rest you can only get here.
const PASS_TRACK = [null,
  { type: "chips", amount: 250 }, { type: "emote", key: "💰", rarity: "rare" }, { type: "chips", amount: 300 }, { type: "title", key: "nightshift", rarity: "rare" }, { type: "felt", key: "purple", rarity: "epic" },
  { type: "chips", amount: 400 }, { type: "chipset", key: "goldrush", rarity: "epic" }, { type: "emote", key: "🦈", rarity: "rare" }, { type: "chips", amount: 500 }, { type: "back", key: "neon", rarity: "epic" },
  { type: "avatar", key: "🦈", rarity: "rare" }, { type: "chips", amount: 600 }, { type: "fx", key: "coins", rarity: "epic" }, { type: "emote", key: "🧊", rarity: "rare" }, { type: "felt", key: "ocean", rarity: "epic" },
  { type: "chips", amount: 750 }, { type: "title", key: "cardshark", rarity: "epic" }, { type: "chipset", key: "obsidian", rarity: "epic" }, { type: "chips", amount: 900 }, { type: "back", key: "carbon", rarity: "epic" },
  { type: "emote", key: "Run it back", rarity: "rare" }, { type: "fx", key: "fireworks", rarity: "legendary" }, { type: "chips", amount: 1000 }, { type: "avatar", key: "🦄", rarity: "epic" }, { type: "back", key: "holo", rarity: "legendary" },
  { type: "chips", amount: 1250 }, { type: "title", key: "heatcheck", rarity: "legendary" }, { type: "felt", key: "aurora", rarity: "legendary" }, { type: "chips", amount: 1500 }, { type: "back", key: "foil", rarity: "legendary" },
];
const passReward = (lvl) => ({ rarity: "common", ...(PASS_TRACK[lvl] || { type: "chips", amount: 150 + lvl * 25 }) });
// chip sets and win effects: what your chips look like and what happens when you win big
const CHIP_SETS = [
  { key: "classic", label: "Classic", cost: 0, colors: null },
  { key: "goldrush", label: "Gold Rush", pass: 7, colors: { 25000: "#FFF1B8", 5000: "#F2C14E", 1000: "#D99A2B", 500: "#B8742A", 100: "#7A4A1A", 25: "#FFE08A", 5: "#C98A1E", 1: "#FFF8E0" } },
  { key: "obsidian", label: "Obsidian", pass: 18, colors: { 25000: "#E8ECF2", 5000: "#9AA4B2", 1000: "#5B6472", 500: "#2B3038", 100: "#15181D", 25: "#717B8A", 5: "#3A404A", 1: "#C9D1DC" } },
];
const WIN_FX = [
  { key: "confetti", label: "Confetti", cost: 0 },
  { key: "coins", label: "Coin Rain", pass: 13 },
  { key: "fireworks", label: "Fireworks", pass: 22 },
];
const BASE_EMOTES = ["👍", "😂", "😤", "🔥", "🫡", "😬", "GG", "Nice hand", "Ship it"];
const passLevel = (xp) => Math.min(PASS_LEVELS, Math.floor(xp / PASS_XP));
const passRewardLabel = (r) => r.type === "chips" ? `${r.amount.toLocaleString()} chips` : r.type === "felt" ? `${findFelt(r.key).label} felt` : r.type === "back" ? `${findBack(r.key).label} card back`
  : r.type === "title" ? `"${findTitle(r.key).label}" title` : r.type === "emote" ? `${r.key} emote` : r.type === "chipset" ? `${CHIP_SETS.find((c) => c.key === r.key).label} chips` : r.type === "fx" ? `${WIN_FX.find((c) => c.key === r.key).label} win effect` : `${r.key} avatar`;
const passTypeLabel = (r) => ({ chips: "Chips", felt: "Table felt", back: "Card back", title: "Title", emote: "Emote", chipset: "Chip set", fx: "Win effect", avatar: "Avatar" })[r.type];
// hands over one pass item (not chips); safe to call again
function grantPassItem(next, r) {
  const cos = { ...defaultCosmetics(), ...(next.cosmetics || {}) };
  const add = (list, k) => (list.includes(k) ? list : [...list, k]);
  if (r.type === "felt") return { ...next, cosmetics: { ...cos, felts: add(cos.felts, r.key) } };
  if (r.type === "back") return { ...next, cosmetics: { ...cos, backs: add(cos.backs, r.key) } };
  if (r.type === "chipset") return { ...next, cosmetics: { ...cos, chipsets: add(cos.chipsets, r.key) } };
  if (r.type === "fx") return { ...next, cosmetics: { ...cos, fxs: add(cos.fxs, r.key) } };
  if (r.type === "avatar") return { ...next, unlocked: add(next.unlocked || [], r.key) };
  if (r.type === "emote") return { ...next, emotes: add(next.emotes || [], r.key) };
  if (r.type === "title") { const t = next.titles || defaultTitles(); return { ...next, titles: { ...t, owned: add(t.owned, r.key) } }; }
  return next;
}
// the track changed mid season: make sure everything below your level is yours
function passBackfill(d) { let n = d; const lvl = passLevel(ensurePass(d.pass).xp); for (let l = 1; l <= lvl; l++) { const r = passReward(l); if (r.type !== "chips") n = grantPassItem(n, r); } return n; }
function ensurePass(p) { const season = currentSeasonId(); return p && p.season === season ? p : { season, xp: 0 }; }
// Adds XP and hands out every reward crossed. Returns the new data and what was earned.
function grantXp(d, xp) {
  const pass = ensurePass(d.pass);
  const before = passLevel(pass.xp), after = passLevel(pass.xp + xp);
  let next = { ...d, pass: { ...pass, xp: pass.xp + xp } };
  const earned = [];
  for (let l = before + 1; l <= after; l++) {
    const r = passReward(l); earned.push({ level: l, reward: r });
    if (r.type === "chips") next = { ...next, chips: next.chips + r.amount };
    else next = grantPassItem(next, r);
  }
  return { next, earned };
}
// Keeps a running bankroll line and your best showdown hands.
function trackHistory(prev, next, best) {
  const h = { bankroll: [], best: [], ...(next.history || {}) };
  let bankroll = h.bankroll;
  if (next.chips !== prev.chips || bankroll.length === 0) bankroll = [...bankroll, { t: Date.now(), v: next.chips }].slice(-120);
  let bestList = h.best;
  if (best && !bestList.some((b) => b.desc === best.desc)) {
    const cmp = (a, b) => { for (let i = 0; i < 6; i++) { const x = a.s[i] || 0, y = b.s[i] || 0; if (x !== y) return y - x; } return 0; };
    bestList = [...bestList, { ...best, at: Date.now() }].sort(cmp).slice(0, 5);
  }
  return { ...next, history: { bankroll, best: bestList } };
}

/* =========================================================================
   TITLES: shown under your name at the table, on your profile and the leaderboard
   ========================================================================= */
const TITLE_RARITY = { common: "var(--t-sub)", rare: "#6FA8FF", epic: "#B98BFF", legendary: "#F5C451" };
const TITLES = [
  { key: "rookie", label: "Rookie", rarity: "common", how: "Everyone starts here" },
  // earned
  { key: "grinder", label: "Grinder", rarity: "rare", how: "Play 500 hands", earn: (d) => d.stats.handsPlayed >= 500 },
  { key: "onfire", label: "On Fire", rarity: "rare", how: "Win 5 hands in a row", earn: (d) => (d.stats.bestWinStreak || 0) >= 5 },
  { key: "whale", label: "Whale", rarity: "epic", how: "Win a pot of 5,000 or more", earn: (d) => d.stats.biggestPot >= 5000 },
  { key: "loyal", label: "Loyal", rarity: "rare", how: "Hit a 7 day login streak", earn: (d) => d.streak && d.streak.count >= 7 },
  { key: "closer", label: "Closer", rarity: "epic", how: "Win a tournament", earn: (d) => ((d.skill && d.skill.tourneys) || []).some((t) => t.place === 1) },
  { key: "shark", label: "Shark", rarity: "epic", how: "Reach a Skill Rating of 75", earn: (d) => { const k = computeSkill(d.skill); return !!k && (d.skill.hands || 0) >= 100 && k.sr >= 75; } },
  { key: "diamond", label: "Diamond Hands", rarity: "epic", how: "Reach Diamond in ranked", earn: (d) => (d.ranked.peakRating || 0) >= 1200 },
  { key: "champion", label: "Champion", rarity: "legendary", how: "Reach Champion in ranked", earn: (d) => (d.ranked.peakRating || 0) >= 1500 },
  { key: "royal", label: "Royal Club", rarity: "legendary", how: "Win with a royal flush", earn: (d) => ((d.history && d.history.best) || []).some((b) => b.kind === 8 && b.s && b.s[1] === 14) },
  { key: "maxed", label: "Maxed Out", rarity: "legendary", how: "Finish the season pass", earn: (d) => d.pass && d.pass.xp >= PASS_LEVELS * PASS_XP },
  // season pass
  { key: "nightshift", label: "Night Shift", rarity: "rare", how: "Season pass level 4" },
  { key: "cardshark", label: "Card Shark", rarity: "epic", how: "Season pass level 17" },
  { key: "heatcheck", label: "Heat Check", rarity: "legendary", how: "Season pass level 27" },
  // bought
  { key: "lucky", label: "Lucky", rarity: "common", cost: 1500 },
  { key: "nightowl", label: "Night Owl", rarity: "common", cost: 1500 },
  { key: "bluffer", label: "The Bluffer", rarity: "rare", cost: 3000 },
  { key: "professor", label: "The Professor", rarity: "rare", cost: 3000 },
  { key: "bigstack", label: "Big Stack", rarity: "epic", cost: 7500 },
  { key: "highroller", label: "High Roller", rarity: "epic", cost: 10000 },
  { key: "legend", label: "Living Legend", rarity: "legendary", cost: 40000 },
];
const findTitle = (k) => TITLES.find((t) => t.key === k) || TITLES[0];
function defaultTitles() { return { owned: ["rookie"], equipped: "rookie" }; }
// Returns any titles your stats now qualify for that you don't have yet.
function newlyEarnedTitles(d) {
  const owned = (d.titles || defaultTitles()).owned;
  return TITLES.filter((t) => t.earn && !owned.includes(t.key) && (() => { try { return t.earn(d); } catch (e) { return false; } })());
}
function TitleTag({ k, size = 11, style }) {
  const t = findTitle(k);
  return <span className="title-tag" style={{ color: TITLE_RARITY[t.rarity], fontSize: size, ...style }}>{t.label}</span>;
}

/* =========================================================================
   CHIP STACKS: amounts drawn as real piles of chips
   ========================================================================= */
const CHIP_DENOMS = [
  { v: 25000, c: "#2DD4BF" }, { v: 5000, c: "#D9468F" }, { v: 1000, c: "#F2C94C" }, { v: 500, c: "#8B5CF6" },
  { v: 100, c: "#2A2F3A" }, { v: 25, c: "#16A06A" }, { v: 5, c: "#E0475B" }, { v: 1, c: "#E8EEF7" },
];
// the high roller room plays with its own set: champagne, burgundy, gold, onyx, ivory, emerald
const VIP_CHIP = { 25000: "#EBD39A", 5000: "#7A1E2C", 1000: "#C9A050", 500: "#8C6A3A", 100: "#ECE5D5", 25: "#11533F", 5: "#7A1E2C", 1: "#ECE5D5" };
function chipColumns(amount, maxCols = 3, maxPer = 9, palette = null) {
  let left = Math.max(0, Math.round(amount)); const cols = [];
  for (const d of CHIP_DENOMS) { const n = Math.floor(left / d.v); if (n > 0) { cols.push({ c: palette ? palette[d.v] : d.c, n: Math.min(maxPer, n) }); left -= n * d.v; } }
  return cols.slice(0, maxCols);
}
function ChipStack({ amount, small = false, vip = false, set = null }) {
  const cs = set && typeof CHIP_SETS !== "undefined" ? CHIP_SETS.find((c) => c.key === set) : null;
  const cols = chipColumns(amount, small ? 2 : 3, small ? 5 : 9, vip ? VIP_CHIP : cs ? cs.colors : null);
  if (!cols.length) return null;
  return (
    <span className={`chipstack${small ? " sm" : ""}`} aria-hidden="true">
      {cols.map((col, ci) => (
        <span key={ci} className="chipcol">
          {Array.from({ length: col.n }).map((_, i) => <span key={i} className="pchip" style={{ "--cc": col.c, animationDelay: `${i * 0.025}s` }} />)}
        </span>
      ))}
    </span>
  );
}

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

/* =========================================================================
   DAILY SPIN, HIGH ROLLER ROOM, PRESTIGE
   ========================================================================= */
// Eight slices, clockwise from the top. Weights decide the odds.
const SPIN_PRIZES = [
  { label: "150", sub: "chips", type: "chips", amount: 150, w: 22, color: "#2F6FDE" },
  { label: "300", sub: "chips", type: "chips", amount: 300, w: 20, color: "#16A06A" },
  { label: "150", sub: "XP", type: "xp", amount: 150, w: 16, color: "#8B5CF6" },
  { label: "600", sub: "chips", type: "chips", amount: 600, w: 14, color: "#E0861E" },
  { label: "300", sub: "XP", type: "xp", amount: 300, w: 10, color: "#D9468F" },
  { label: "1.2k", sub: "chips", type: "chips", amount: 1200, w: 9, color: "#0EA5B7" },
  { label: "?", sub: "mystery", type: "mystery", w: 6, color: "#1F2430" },
  { label: "5k", sub: "jackpot", type: "chips", amount: 5000, w: 3, color: "#C9A24D" },
];
function pickSpinIndex() {
  const total = SPIN_PRIZES.reduce((a, p) => a + p.w, 0);
  let r = Math.random() * total;
  for (let i = 0; i < SPIN_PRIZES.length; i++) { r -= SPIN_PRIZES[i].w; if (r < 0) return i; }
  return 0;
}
const spinReady = (d) => d.lastSpin !== localDateStr();
function hoursUntilTomorrow() { const d = new Date(); const t = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1); return Math.max(1, Math.ceil((t - d) / 3600000)); }

// The VIP lounge: big blinds, sharp bots, a black and gold table.
const HIGH_ROLLER_MIN = 25000;
const HIGH_ROLLER_TABLES = [
  { key: "vip", label: "High Roller", sb: 250, bb: 500, minBankroll: 25000, vip: true },
  { key: "whale", label: "Whale Table", sb: 1000, bb: 2000, minBankroll: 100000, vip: true },
];
const VIP_FELT = { key: "vip", label: "VIP", c1: "#2C313B", c2: "#181B21", c3: "#0C0E12", rail: "#C9A24D" };
const VIP_BACK = { key: "vipback", label: "VIP", a: "#14161B", b: "#0B0C0F", ring: "#E2B65A" };

// Prestige: hit Champion, reset to Bronze, keep a badge that counts how many times you've done it.
const PRESTIGE_REWARD = 10000;
// Prestige comes from seasons now: finish a month at Champion and it's yours. Nobody gets sent back to Bronze.
const canPrestige = () => false;
const PRESTIGE_PERKS = [
  { n: 1, label: "Prestige Gold card back" },
  { n: 2, label: "Prestige felt" },
  { n: 3, label: "Gold shimmer on your name" },
  { n: 5, label: "Crown on your seat" },
  { n: 10, label: "Black diamond badge" },
];
const pnameCls = (n) => ((n || 0) >= 3 ? "pname" : "");
// Who you get matched against. After a prestige your badge says Bronze but this stays at your real level.
const matchRating = (r) => r.rating || 0;
// Climbing back after a prestige: wins count extra and losses sting less until your badge catches up.
function prestigeBoost() { return 1; }
// A gold starburst around a gem medallion. The gem changes color as your prestige count climbs.
const PRESTIGE_COLORS = [[1, "#F3B4FF", "#B04BFF", "#5B1599"], [3, "#FFB3C4", "#F0436B", "#8A0F2E"], [5, "#B8F4FF", "#22B8E0", "#0B5470"], [10, "#3A3A44", "#17171D", "#000000"]];
const BURST = (() => { const pts = []; for (let i = 0; i < 24; i++) { const r = i % 2 ? 17.5 : 23.5; const a = (i * 15 - 90) * Math.PI / 180; pts.push(`${(24 + r * Math.cos(a)).toFixed(2)},${(24 + r * Math.sin(a)).toFixed(2)}`); } return pts.join(" "); })();
// Prestige 5 and up: a small gold crown sits on top of your avatar
function CrownMark({ size = 14, top = -9 }) {
  return <span className="crown-mark" style={{ top, width: size + 6, height: size + 2 }} aria-label="Prestige crown"><Icon name="crown" size={size} stroke={2} /></span>;
}
function PrestigeBadge({ n, size = 18 }) {
  if (!n) return null;
  let pal = PRESTIGE_COLORS[0]; for (const c of PRESTIGE_COLORS) if (n >= c[0]) pal = c;
  const [, hi, mid, lo] = pal;
  const id = `pb${pal[0]}`;
  return (
    <svg className="prestige-badge" width={size} height={size} viewBox="0 0 48 48" role="img" aria-label={`Prestige ${n}`}>
      <title>{`Prestige ${n}`}</title>
      <defs>
        <linearGradient id={`${id}-gold`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFF3C4" /><stop offset="0.5" stopColor="#F5C451" /><stop offset="1" stopColor="#A86A0C" /></linearGradient>
        <radialGradient id={`${id}-gem`} cx="38%" cy="30%" r="75%"><stop offset="0" stopColor={hi} /><stop offset="0.55" stopColor={mid} /><stop offset="1" stopColor={lo} /></radialGradient>
      </defs>
      <polygon points={BURST} fill={`url(#${id}-gold)`} stroke="#7A4A06" strokeWidth="0.8" strokeLinejoin="round" />
      <circle cx="24" cy="24" r="14" fill={`url(#${id}-gem)`} stroke="#FFE7A3" strokeWidth="2" />
      <circle cx="24" cy="24" r="10.5" fill="none" stroke="#FFFFFF" strokeOpacity="0.28" strokeWidth="1" />
      <path d="M13.5 19.5 C16 13 32 13 34.5 19.5 C29 16.5 19 16.5 13.5 19.5 Z" fill="#FFFFFF" opacity="0.28" />
      <text x="24" y="24" dy="0.36em" textAnchor="middle" fontSize={n >= 10 ? 13 : 16} fontWeight="900" fill="#FFFFFF" stroke={lo} strokeWidth="0.6" paintOrder="stroke" fontFamily="Inter, -apple-system, sans-serif">{n}</text>
    </svg>
  );
}

/* =========================================================================
   THEME PACKS: buy a whole new look for the app
   ========================================================================= */
const THEMES = [
  { key: "classic", label: "Classic", cost: 0, sub: "Navy, gold and green felt. The original.", sw: ["#0B1426", "#14223D", "#F5B83D", "#F4F7FC"], font: "'Fraunces', Georgia, serif" },
  { key: "afterhours", label: "After Hours", cost: 5000, sub: "A private card room. Warm black, ivory and brass.", sw: ["#120F0D", "#1C1814", "#C9A66B", "#EDE6D8"], font: "'Instrument Serif', Georgia, serif" },
  { key: "cardroom", label: "Card Room", cost: 5000, sub: "Felt green, card white and card red. Your modes are a hand of cards.", sw: ["#0C3528", "#134A39", "#D8343B", "#F6F7F4"], font: "'Archivo Variable', sans-serif" },
  { key: "montecarlo", label: "Monte Carlo", cost: 10000, sub: "1920s casino. Black lacquer, gold leaf, art deco frames.", sw: ["#0C0C0F", "#16161C", "#D4AF5A", "#F1E9D8"], font: "'Limelight', Georgia, serif" },
];
const findTheme = (k) => THEMES.find((t) => t.key === k) || THEMES[0];
function defaultThemes() { return { owned: ["classic"], equipped: "classic" }; }
// a tiny mock of the home screen, painted in the theme's own colors
function ThemePreview({ t }) {
  const [bg, panel, accent, text] = t.sw;
  return (
    <div className="theme-mock" style={{ background: bg }}>
      <div style={{ fontFamily: t.font, color: t.key === "montecarlo" ? accent : text, fontSize: 15, letterSpacing: t.key === "montecarlo" ? "0.08em" : 0, fontStyle: t.key === "afterhours" ? "italic" : "normal" }}>felt</div>
      <div className="tm-panel" style={{ background: panel, borderRadius: t.key === "montecarlo" ? 2 : t.key === "afterhours" ? 6 : 8, border: t.key === "montecarlo" ? `1px solid ${accent}66` : "none" }}>
        <div style={{ width: "55%", height: 5, borderRadius: 2, background: text, opacity: 0.85 }} />
        <div style={{ width: "35%", height: 4, borderRadius: 2, background: text, opacity: 0.35, marginTop: 4 }} />
        <div style={{ marginTop: 8, height: 12, borderRadius: t.key === "montecarlo" ? 1 : 4, background: accent }} />
      </div>
      <div style={{ display: "flex", gap: 4 }}>
        {[0, 1, 2].map((i) => <div key={i} style={{ flex: 1, height: 18, borderRadius: t.key === "montecarlo" ? 1 : 4, background: t.key === "cardroom" ? "#F6F7F4" : panel, border: t.key === "montecarlo" ? `1px solid ${accent}55` : "none" }} />)}
      </div>
    </div>
  );
}

// One place decides what a ranked match is worth, so the results screen and the saved profile always agree.
// Points for where you finish in chips: first is the big win, last the big loss, the middle sits in between.
function placeRp(place, field) { if (field <= 1) return 30; const f = (field - place) / (field - 1); return Math.round(-24 + 54 * f); }
function rankedOutcome({ buyIn, finalStack, cleared, hands, knockouts, ranked, matchHands = [], place = null, field = null, complete = false }) {
  const busted = finalStack <= 0;
  const forfeit = !cleared && !busted && !complete;
  const net = finalStack - buyIn;
  const ratio = net / buyIn;
  const fd = Math.max(2, field || 2);
  const pl = cleared ? 1 : Math.min(fd, Math.max(1, place || fd));
  const placeValue = forfeit ? -30 : placeRp(pl, fd) + (cleared ? 10 : 0);
  const won = !forfeit && placeValue > 0;
  const quality = matchQuality(matchHands);
  const base = { won, forfeit, cleared, busted, finalStack, net, hands, knockouts, quality, matchHands, place: pl, field: fd };
  if (!isPlaced(ranked)) {
    const done = (ranked.placementGames || []).length + 1;
    return { ...base, placement: true, placementNumber: done, placementFinal: done >= PLACEMENT_MATCHES, before: null, after: null, delta: 0, lines: [], newFrames: [] };
  }
  const lines = [];
  if (cleared) lines.push({ label: "Cleared the table", value: placeValue });
  else if (forfeit) lines.push({ label: "Left before the match ended", value: -30 });
  else lines.push({ label: `${busted ? "Busted" : "Finished"} ${ordinal(pl)} of ${fd}`, value: placeValue });
  if (!forfeit && net > 0) { const v = Math.round(8 * Math.min(ratio, 1)); if (v > 0) lines.push({ label: `Up ${net.toLocaleString()} chips`, value: v }); }
  if (knockouts > 0 && !forfeit) lines.push({ label: `${knockouts} knockout${knockouts > 1 ? "s" : ""}`, value: 5 * knockouts });
  if (quality != null && !forfeit) { const v = Math.round((quality - 0.55) * 30); if (v !== 0) lines.push({ label: `Decision quality ${Math.round(quality * 100)}%`, value: v }); }
  const priorStreak = Math.max(0, ranked.streak || 0);
  if (won && priorStreak >= 1) lines.push({ label: `${priorStreak + 1} wins in a row`, value: Math.min(3, priorStreak) * 4 });
  const before = Math.round(ranked.rating);
  const earned = lines.reduce((s, l) => s + l.value, 0);
  const boost = prestigeBoost(ranked);
  if (boost > 1 && earned !== 0) {
    const extra = earned > 0 ? earned * (boost - 1) : -Math.round(earned / 2);
    lines.push({ label: earned > 0 ? `Prestige climb boost x${boost}` : "Prestige climb boost, half loss", value: extra });
  }
  const raw = lines.reduce((s, l) => s + l.value, 0);
  const after = Math.max(0, before + raw);
  // your hidden rating moves by what the match was really worth, no boost
  const mmrBefore = matchRating(ranked);
  const mmrAfter = Math.max(0, Math.min(1800, mmrBefore + earned));
  if (before + raw < 0) lines.push({ label: "Rating can't go below 0", value: -(before + raw) });
  return { ...base, placement: false, before, after, delta: after - before, mmrAfter, lines, newFrames: framesEarned(Math.max(ranked.peakRating || 0, after), ranked.frames) };
}
function framesEarned(peak, owned) { return RANK_TIERS.filter((t) => t.min > 0 && peak >= t.min && !owned.includes(t.key)).map((t) => t.key); }
function daysLeftInSeason() { const d = new Date(); const end = new Date(d.getFullYear(), d.getMonth() + 1, 1); return Math.max(1, Math.ceil((end - d) / 86400000)); }
function currentSeasonId() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; }
function rolloverSeason(ranked) {
  const season = currentSeasonId();
  if (!ranked || ranked.seasonId === season) return ranked;
  if (!isPlaced(ranked)) return { ...ranked, seasonId: season };
  const softReset = Math.round(RANK_RESET_TARGET + (ranked.rating - RANK_RESET_TARGET) * 0.5);
  // finishing the month at Champion is what earns a prestige
  const champ = ranked.rating >= 1500;
  const prestige = (ranked.prestige || 0) + (champ ? 1 : 0);
  const seasonEnd = { seasonId: ranked.seasonId, from: Math.round(ranked.rating), to: softReset, champ, prestige, rewarded: false, seen: false };
  return { ...ranked, rating: softReset, mmr: undefined, prestige, seasonWins: champ ? [...(ranked.seasonWins || []), ranked.seasonId] : ranked.seasonWins || [], seasonEnd, seasonId: season, history: [...(ranked.history || []), { seasonId: ranked.seasonId, rating: ranked.rating, tier: tierForRating(ranked.rating).key }].slice(-6) };
}
function defaultRanked() { return { schema: 2, placed: false, placementGames: [], rating: 0, peakRating: 0, wins: 0, losses: 0, streak: 0, seasonId: currentSeasonId(), history: [], frames: [], frame: null, recent: [], report: null }; }
// Older saves used a different ladder. Keep cosmetics and history, send everyone through placements once.
function migrateRanked(r) {
  if (!r) return defaultRanked();
  if (r.schema === 2) {
    const out = { ...defaultRanked(), ...r };
    // the old prestige button sent people to Bronze with a hidden rating; put them where a season reset would have
    if (out.mmr != null && out.mmr > (out.rating || 0) + 100) out.rating = Math.max(out.rating || 0, Math.round(RANK_RESET_TARGET + (out.mmr - RANK_RESET_TARGET) * 0.5));
    delete out.mmr;
    return out;
  }
  return { ...defaultRanked(), frames: [...new Set((r.frames || []).map((f) => String(f).replace(/^frame_/, "")))], frame: null, history: [] };
}

// Only one table is open at a time, so the evaluator reads the active variant from here.
let ACTIVE_VARIANT = "holdem";
const VARIANTS = {
  holdem: { key: "holdem", label: "Hold'em", hole: 2, sub: "Two cards, the classic" },
  omaha: { key: "omaha", label: "Omaha", hole: 4, sub: "Four cards, use exactly two" },
  short: { key: "short", label: "Short Deck", hole: 2, sub: "Sixes and up, flush beats a full house" },
};
const holeCount = () => (VARIANTS[ACTIVE_VARIANT] || VARIANTS.holdem).hole;
function freshDeck(v = ACTIVE_VARIANT) { const lo = v === "short" ? 6 : 2; const d = []; for (const s of SUITS) for (let r = lo; r <= 14; r++) d.push({ r, s, id: `${r}${s}` }); return d; }
const FULL_DECKS = { holdem: freshDeck("holdem"), short: freshDeck("short") };
const deckFor = (v = ACTIVE_VARIANT) => (v === "short" ? FULL_DECKS.short : FULL_DECKS.holdem);
const FULL_DECK = FULL_DECKS.holdem;
// Short Deck reorders the ladder: three of a kind beats a straight, and a flush beats a full house.
const SHORT_ORDER = [0, 1, 2, 4, 3, 6, 5, 7, 8];
function shuffle(deck) { const d = [...deck]; for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; } return d; }
function sample(arr, k) { const a = arr.slice(); const n = a.length; const take = Math.min(k, n); for (let i = 0; i < take; i++) { const j = i + Math.floor(Math.random() * (n - i)); [a[i], a[j]] = [a[j], a[i]]; } return a.slice(0, take); }
function combos(arr, k) { const res = []; const rec = (start, chosen) => { if (chosen.length === k) { res.push([...chosen]); return; } for (let i = start; i < arr.length; i++) { chosen.push(arr[i]); rec(i + 1, chosen); chosen.pop(); } }; rec(0, []); return res; }
function evaluate5(cards, short = ACTIVE_VARIANT === "short") {
  const r = evaluate5Base(cards, short);
  if (!short) return r;
  const kind = r[0]; r[0] = SHORT_ORDER[kind]; r.kind = kind;
  return r;
}
function evaluate5Base(cards, short) {
  const ranks = cards.map((c) => c.r).sort((a, b) => b - a);
  const suits = cards.map((c) => c.s);
  const isFlush = suits.every((s) => s === suits[0]);
  const counts = {};
  ranks.forEach((r) => (counts[r] = (counts[r] || 0) + 1));
  const groups = Object.entries(counts).map(([r, c]) => [Number(r), c]).sort((a, b) => (b[1] - a[1]) || (b[0] - a[0]));
  let uniq = [...new Set(ranks)]; let isStraight = false, straightHigh = 0;
  if (uniq.length === 5) { if (uniq[0] - uniq[4] === 4) { isStraight = true; straightHigh = uniq[0]; } else if (uniq.join(",") === (short ? "14,9,8,7,6" : "14,5,4,3,2")) { isStraight = true; straightHigh = short ? 9 : 5; } }
  if (isStraight && isFlush) return [8, straightHigh, cards];
  if (groups[0][1] === 4) return [7, groups[0][0], groups[1][0], cards];
  if (groups[0][1] === 3 && groups[1][1] === 2) return [6, groups[0][0], groups[1][0], cards];
  if (isFlush) return [5, ...ranks, cards];
  if (isStraight) return [4, straightHigh, cards];
  if (groups[0][1] === 3) return [3, groups[0][0], ...groups.slice(1).map((g) => g[0]), cards];
  if (groups[0][1] === 2 && groups[1][1] === 2) { const pr = [groups[0][0], groups[1][0]].sort((a, b) => b - a); return [2, ...pr, groups[2][0], cards]; }
  if (groups[0][1] === 2) return [1, groups[0][0], ...groups.slice(1).map((g) => g[0]), cards];
  return [0, ...ranks, cards];
}
function cmpScore(a, b) { for (let i = 0; i < 6; i++) { const av = a[i] ?? 0, bv = b[i] ?? 0; if (typeof av === "number" && av !== bv) return av - bv; } return 0; }
function bestOf(cards) { if (cards.length <= 5) return evaluate5(cards); let best = null; for (const c of combos(cards, 5)) { const s = evaluate5(c); if (!best || cmpScore(s, best) > 0) best = s; } return best; }
// A player's best hand under the active variant. Omaha must use exactly two hole cards and three from the board.
function bestHand(hole, board) {
  if (ACTIVE_VARIANT === "omaha" && hole.length === 4 && board.length >= 3) {
    let best = null;
    for (const h of combos(hole, 2)) for (const b of combos(board, 3)) { const s = evaluate5([...h, ...b]); if (!best || cmpScore(s, best) > 0) best = s; }
    return best;
  }
  return bestOf([...hole, ...board]);
}
const HAND_NAMES = ["High Card", "One Pair", "Two Pair", "Three of a Kind", "Straight", "Flush", "Full House", "Four of a Kind", "Straight Flush"];
const handKind = (score) => (score.kind != null ? score.kind : score[0]);
const handName = (score) => (handKind(score) === 8 && score[1] === 14 ? "Royal Flush" : HAND_NAMES[handKind(score)]);
const TUTORIAL_TIPS = {
  preflop: "These two cards are yours alone. Everyone gets two, face down, to start each hand.",
  flop: "The flop: three shared cards land in the middle. Everyone builds their best hand using these plus their own two.",
  turn: "The turn: a fourth shared card. One more betting round before the last card.",
  river: "The river: the fifth and final shared card. Last chance to bet before showdown.",
  showdown: "Showdown: whoever has the best 5-card hand (any mix of their own cards and the shared ones) takes the pot.",
};
// Best to worst. `uses` = how many of the five cards make the hand (the rest are kickers and get dimmed).
const RANKING_REFERENCE = [
  { name: "Royal Flush", desc: "A K Q J 10, all the same suit", cards: ["As", "Ks", "Qs", "Js", "10s"], uses: 5 },
  { name: "Straight Flush", desc: "Five in a row, all the same suit", cards: ["9h", "8h", "7h", "6h", "5h"], uses: 5 },
  { name: "Four of a Kind", desc: "Four cards of one rank", cards: ["Qs", "Qh", "Qd", "Qc", "7s"], uses: 4 },
  { name: "Full House", desc: "Three of a kind plus a pair", cards: ["Ks", "Kh", "Kd", "4c", "4s"], uses: 5 },
  { name: "Flush", desc: "Any five of the same suit", cards: ["Ad", "Jd", "8d", "6d", "2d"], uses: 5 },
  { name: "Straight", desc: "Five in a row, mixed suits", cards: ["10c", "9d", "8s", "7h", "6c"], uses: 5 },
  { name: "Three of a Kind", desc: "Three cards of one rank", cards: ["7s", "7h", "7d", "Kc", "2s"], uses: 3 },
  { name: "Two Pair", desc: "Two different pairs", cards: ["Js", "Jd", "5c", "5h", "Ah"], uses: 4 },
  { name: "One Pair", desc: "Two cards of one rank", cards: ["10s", "10h", "Ac", "8d", "3s"], uses: 2 },
  { name: "High Card", desc: "Nothing else, so your highest card plays", cards: ["Ah", "Jc", "8s", "5d", "3c"], uses: 1 },
];
function describeScore(score) {
  switch (handKind(score)) {
    case 8: return score[1] === 14 ? "Royal Flush" : `Straight Flush, ${RANK_SING[score[1]]} high`;
    case 7: return `Four ${RANK_PLUR[score[1]]}`;
    case 6: return `Full House, ${RANK_PLUR[score[1]]} over ${RANK_PLUR[score[2]]}`;
    case 5: return `Flush, ${RANK_SING[score[1]]} high`;
    case 4: return `Straight, ${RANK_SING[score[1]]} high`;
    case 3: return `Three ${RANK_PLUR[score[1]]}`;
    case 2: return `Two Pair, ${RANK_PLUR[score[1]]} and ${RANK_PLUR[score[2]]}`;
    case 1: return `Pair of ${RANK_PLUR[score[1]]}`;
    default: return `${RANK_SING[score[1]]} high`;
  }
}
function describeCurrentHand(hole, board) {
  if (!hole || hole.length < 2) return null;
  if (board.length === 0) {
    if (hole.length === 4) {
      const suitCounts = {}; hole.forEach((c) => (suitCounts[c.s] = (suitCounts[c.s] || 0) + 1));
      const pairs = Object.values(suitCounts).filter((n) => n >= 2).length;
      return `${hole.map((c) => c.r).sort((x, y) => y - x).map((r) => rankLabel(r)).join(" ")}${pairs >= 2 ? ", double suited" : pairs === 1 ? ", suited" : ""}`;
    }
    const [a, b] = hole; if (a.r === b.r) return `Pocket ${RANK_PLUR[a.r]}`; const hi = Math.max(a.r, b.r), lo = Math.min(a.r, b.r); return `${RANK_SING[hi]}-${RANK_SING[lo]}${a.s === b.s ? " suited" : ""}`;
  }
  return describeScore(bestHand(hole, board));
}
function preflopStrength(a, b) { const hi = Math.max(a.r, b.r), lo = Math.min(a.r, b.r); let s = (hi - 2) / 12 * 0.5 + (lo - 2) / 12 * 0.25; if (a.r === b.r) s += 0.35; if (a.s === b.s) s += 0.08; if (hi - lo <= 3) s += 0.05; return Math.min(1, s); }
function estimateStrength(hole, community) {
  if (community.length < 3) {
    if (hole.length === 4) return Math.max(...combos(hole, 2).map(([a, b]) => preflopStrength(a, b))) * 0.92;
    return preflopStrength(hole[0], hole[1]);
  }
  const score = bestHand(hole, community); return Math.min(1, handKind(score) / 8 + score[1] / 40);
}
function calcEquity(hole, board, numOpponents, iters = 100) {
  if (numOpponents <= 0) return 100;
  const usedIds = new Set([...hole, ...board].map((c) => c.id));
  const unseen = deckFor().filter((c) => !usedIds.has(c.id));
  const hc = holeCount();
  if (hc === 4) iters = Math.min(iters, Math.max(30, Math.round(120 / numOpponents))); // Omaha hands are 60x the work to score
  const need = numOpponents * hc + (5 - board.length);
  let winSum = 0;
  for (let i = 0; i < iters; i++) {
    const drawn = sample(unseen, need); let idx = 0; const oppHoles = [];
    for (let o = 0; o < numOpponents; o++) { const h = []; for (let k = 0; k < hc; k++) h.push(drawn[idx++]); oppHoles.push(h); }
    let fullBoard = [...board]; while (fullBoard.length < 5) fullBoard.push(drawn[idx++]);
    const myScore = bestHand(hole, fullBoard); let oppBest = null;
    for (const oh of oppHoles) { const s = bestHand(oh, fullBoard); if (!oppBest || cmpScore(s, oppBest) > 0) oppBest = s; }
    const cmp = cmpScore(myScore, oppBest);
    if (cmp > 0) winSum += 1; else if (cmp === 0) winSum += 0.5;
  }
  return Math.round((winSum / iters) * 100);
}

// Equity against opponents whose cards are known (used when the money is all in, to remove luck from results).
function equityKnown(hole, oppHoles, board, iters = 350) {
  if (!oppHoles.length) return 1;
  const used = new Set([...hole, ...oppHoles.flat(), ...board].map((c) => c.id));
  const unseen = deckFor().filter((c) => !used.has(c.id));
  const need = 5 - board.length;
  const runs = need === 0 ? 1 : hole.length === 4 ? Math.min(iters, 120) : iters;
  let win = 0;
  for (let i = 0; i < runs; i++) {
    const full = need === 0 ? board : [...board, ...sample(unseen, need)];
    const mine = bestHand(hole, full);
    const opp = oppHoles.map((oh) => bestHand(oh, full));
    let best = opp[0]; for (const sc of opp) if (cmpScore(sc, best) > 0) best = sc;
    const cmp = cmpScore(mine, best);
    if (cmp > 0) win += 1; else if (cmp === 0) win += 1 / (opp.filter((sc) => cmpScore(sc, best) === 0).length + 1);
  }
  return win / runs;
}
// Every sound is synthesized: filtered noise for paper and clay, short tones for felt thumps and bells.
// Real recordings of cards and chips (Kenney's Casino Audio, CC0). Fetched once, decoded when sound
// first starts. Until they're ready, or if they fail, the synthesized versions below play instead.
const SAMPLE_SETS = { slide: 8, place: 4, shove: 4, lay: 3, collide: 4, handle: 6, stack: 6, shuffle: 1 };
const SAMPLE_FILE = { slide: "card-slide", place: "card-place", shove: "card-shove", lay: "chip-lay", collide: "chips-collide", handle: "chips-handle", stack: "chips-stack", shuffle: "card-shuffle" };
let sampleFetch = null;
function fetchSamples() {
  if (sampleFetch) return sampleFetch;
  const base = (import.meta.env && import.meta.env.BASE_URL) || "/";
  const jobs = [];
  Object.entries(SAMPLE_SETS).forEach(([k, n]) => { for (let i = 1; i <= n; i++) { const name = n === 1 ? SAMPLE_FILE[k] : `${SAMPLE_FILE[k]}-${i}`; jobs.push(fetch(`${base}sfx/${name}.mp3`).then((r) => (r.ok ? r.arrayBuffer() : null)).then((ab) => [k, ab]).catch(() => [k, null])); } });
  sampleFetch = Promise.all(jobs);
  return sampleFetch;
}
if (typeof window !== "undefined") setTimeout(() => { try { fetchSamples(); } catch (e) { /* offline */ } }, 1200);

function makeSfx(ctx, out) {
  const now = () => ctx.currentTime;
  const bufs = {}; // set name -> decoded buffers
  fetchSamples().then((list) => list.forEach(([k, ab]) => {
    if (!ab) return;
    const done = (b) => { (bufs[k] = bufs[k] || []).push(b); };
    try { const pr = ctx.decodeAudioData(ab.slice(0), done, () => {}); if (pr && pr.catch) pr.catch(() => {}); } catch (e) { /* undecodable */ } // each audio context decodes its own copy
  })).catch(() => {});
  const has = (k) => bufs[k] && bufs[k].length > 0;
  const lastPick = {};
  // play one recording from a set: a different take than last time, slightly retuned so repeats never sound copied
  const sample = (k, at = 0, gain = 1, { maxDur = 0, rate = 1 } = {}) => {
    if (!has(k)) return false;
    const list = bufs[k]; let i = Math.floor(Math.random() * list.length);
    if (list.length > 1 && i === lastPick[k]) i = (i + 1) % list.length; lastPick[k] = i;
    const t = now() + at;
    const src = ctx.createBufferSource(); src.buffer = list[i];
    src.playbackRate.value = rate * (1 + (Math.random() * 2 - 1) * 0.05);
    const gv = gain * (0.88 + Math.random() * 0.12);
    const g = ctx.createGain(); g.gain.value = gv; g.gain.setValueAtTime(gv, t);
    src.connect(g); g.connect(out); src.start(t);
    if (maxDur && list[i].duration > maxDur) { g.gain.setValueAtTime(gv, t + maxDur * 0.7); g.gain.linearRampToValueAtTime(0.0001, t + maxDur); src.stop(t + maxDur + 0.02); }
    return true;
  };
  let noiseBuf = null;
  const getNoise = () => {
    if (!noiseBuf) { noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    return noiseBuf;
  };
  const env = (g, t, peak, attack, dur) => {
    const p = Math.max(0.0002, peak);
    // start silent: a gain left at its default of 1 for even one sample makes an audible click
    g.gain.value = 0; g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(p, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(dur, attack + 0.005));
  };
  const burst = (at, dur, { type = "bandpass", freq = 2000, to = null, q = 1, gain = 0.2, attack = 0.002 } = {}) => {
    const t = now() + at;
    const src = ctx.createBufferSource(); src.buffer = getNoise();
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur); f.Q.value = q;
    const g = ctx.createGain(); env(g, t, gain, attack, dur);
    src.connect(f); f.connect(g); g.connect(out);
    src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.03);
  };
  const tone = (at, freq, dur, { type = "sine", gain = 0.1, to = null, attack = 0.004 } = {}) => {
    const t = now() + at;
    const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t); if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    const g = ctx.createGain(); env(g, t, gain, attack, dur);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.03);
  };
  const jit = (x, pct) => x * (1 + (Math.random() * 2 - 1) * pct);
  // one card leaving the deck: a quick swish of air, then a snap and a soft thud on the felt
  const flick = (at, v = 1) => {
    burst(at, 0.075, { freq: jit(5200, 0.1), to: 1800, q: 0.9, gain: 0.16 * v, attack: 0.01 });
    burst(at + 0.07, 0.018, { type: "highpass", freq: 2400, gain: 0.2 * v });
    tone(at + 0.07, jit(190, 0.08), 0.05, { gain: 0.07 * v, to: 120 });
  };
  // two clay chips knocking together
  const clack = (at, v = 1) => { const f = jit(3600, 0.15); burst(at, 0.024, { freq: f, q: 5, gain: 0.75 * v }); tone(at, f * 0.78, 0.07, { gain: 0.07 * v, type: "triangle" }); };
  const chips = (at, n, v = 1, spread = 0.045) => { let t = at; for (let i = 0; i < n; i++) { clack(t, v * (1 - i * 0.06)); t += jit(spread, 0.35); } };
  // a knuckle on the felt
  const knock = (at, v = 1) => { tone(at, jit(150, 0.05), 0.07, { gain: 0.24 * v, to: 95, attack: 0.002 }); burst(at, 0.03, { type: "lowpass", freq: 500, gain: 0.18 * v }); };
  const bell = (at, f, v = 1, dur = 0.5) => { tone(at, f, dur, { gain: 0.07 * v }); tone(at, f * 2.01, dur * 0.6, { gain: 0.025 * v }); tone(at, f * 3.02, dur * 0.3, { gain: 0.012 * v }); };
  const synth = {
    shuffle: () => {
      let t = 0;
      for (let i = 0; i < 16; i++) { const p = i / 15; t += 0.022 - 0.01 * Math.sin(p * Math.PI); burst(t, 0.012, { freq: jit(3800, 0.2), q: 2.5, gain: 0.1 + 0.06 * Math.sin(p * Math.PI) }); }
      burst(t + 0.02, 0.12, { type: "lowpass", freq: 1400, to: 600, gain: 0.05, attack: 0.03 });
      knock(t + 0.13, 0.35);
    },
    deal: (count = 1, spacing = 0.08) => { for (let i = 0; i < count; i++) flick(i * spacing, 0.75 + Math.random() * 0.25); },
    flip: (count = 1, spacing = 0.12) => {
      for (let i = 0; i < count; i++) {
        const at = i * spacing;
        burst(at, 0.05, { freq: 4200, to: 2600, q: 1, gain: 0.08, attack: 0.008 });
        burst(at + 0.045, 0.014, { freq: jit(3000, 0.1), q: 1.4, gain: 0.26 });
        tone(at + 0.045, 210, 0.045, { gain: 0.06, to: 130 });
      }
    },
    click: (v = 1) => { knock(0, v); knock(0.11, v * 0.8); },
    call: (v = 1) => chips(0, 3, v),
    raise: (v = 1) => chips(0, 5, v, 0.04),
    allIn: (v = 1) => { burst(0, 0.38, { type: "lowpass", freq: 900, to: 400, gain: 0.1 * v, attack: 0.12 }); chips(0.12, 9, v, 0.028); tone(0, 95, 0.4, { gain: 0.09 * v, to: 70, attack: 0.08 }); },
    fold: (v = 1) => { burst(0, 0.18, { freq: 2600, to: 800, q: 0.8, gain: 0.26 * v, attack: 0.03 }); burst(0.16, 0.025, { type: "lowpass", freq: 700, gain: 0.2 * v }); },
    chip: () => chips(0, 4, 0.6, 0.05),
    win: () => { chips(0, 7, 0.8, 0.035); [523.25, 659.25, 783.99].forEach((f, i) => bell(0.28 + i * 0.07, f, 0.9, 0.7)); },
    lose: () => { tone(0, 330, 0.22, { gain: 0.05, to: 247 }); tone(0.16, 247, 0.35, { gain: 0.045, to: 196 }); },
    tap: () => tone(0, 720, 0.04, { gain: 0.07 }),
    tick: () => { tone(0, 1900, 0.04, { gain: 0.12, type: "triangle" }); burst(0, 0.01, { type: "highpass", freq: 4000, gain: 0.1 }); },
    coin: () => { chips(0, 5, 0.7, 0.04); bell(0.18, 1318.5, 0.6, 0.35); },
    ping: () => { bell(0, 880, 0.9, 0.4); bell(0.09, 1318.5, 0.7, 0.45); },
    achievement: () => { [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => bell(i * 0.08, f, 1, 0.6)); },
    rankUp: () => { [392, 523.25, 659.25, 783.99, 1046.5].forEach((f, i) => bell(i * 0.09, f, 1.1, 0.8)); chips(0.5, 6, 0.6, 0.04); },
    rankDown: () => { [523.25, 466.16, 392, 311.13].forEach((f, i) => tone(i * 0.12, f, 0.35, { gain: 0.05, type: "triangle" })); },
    // lub-dub: two low thumps, the second softer
    heartbeat: () => { [[0, 1], [0.2, 0.7]].forEach(([at, v]) => { tone(at, 62, 0.17, { gain: 0.5 * v, to: 44, attack: 0.006 }); tone(at, 128, 0.11, { gain: 0.2 * v, to: 88, attack: 0.004 }); burst(at, 0.05, { type: "lowpass", freq: 320, gain: 0.22 * v }); }); },
  };
  // bet size in big blinds picks the sound: one chip set down, a short stack, or a whole handful
  const betSound = (v, bb) => {
    if (bb != null && bb <= 2.5) return sample("lay", 0, 0.75 * v);
    if (!sample("stack", 0, 0.8 * v)) return false;
    if (bb != null && bb > 12) sample("handle", 0.1, 0.5 * v);
    return true;
  };
  const chimes = (at, v) => [523.25, 659.25, 783.99].forEach((f, i) => bell(at + i * 0.07, f, v, 0.7));
  return {
    ...synth,
    shuffle: () => { if (!sample("shuffle", 0, 0.75)) synth.shuffle(); },
    deal: (count = 1, spacing = 0.08) => { if (!has("slide")) return synth.deal(count, spacing); for (let i = 0; i < count; i++) sample("slide", i * spacing, 0.42, { maxDur: 0.34 }); },
    flip: (count = 1, spacing = 0.12) => { if (!has("place")) return synth.flip(count, spacing); for (let i = 0; i < count; i++) sample("place", i * spacing, 0.7, { maxDur: 0.45 }); },
    call: (v = 1, bb) => { if (!betSound(v, bb)) synth.call(v); },
    raise: (v = 1, bb) => { if (!betSound(v, bb == null ? 6 : bb)) synth.raise(v); },
    allIn: (v = 1) => { if (!sample("handle", 0, 0.85 * v)) return synth.allIn(v); sample("stack", 0.16, 0.7 * v); tone(0, 95, 0.4, { gain: 0.06 * v, to: 70, attack: 0.08 }); },
    fold: (v = 1) => { if (!sample("shove", 0, 0.65 * v, { maxDur: 0.5 })) synth.fold(v); },
    chip: () => { if (!sample("collide", 0, 0.6)) return synth.chip(); sample("collide", 0.09, 0.45); },
    win: () => { if (!sample("handle", 0, 0.9)) return synth.win(); sample("stack", 0.22, 0.6); chimes(0.3, 0.6); },
    coin: () => { if (!sample("handle", 0, 0.8)) return synth.coin(); bell(0.18, 1318.5, 0.5, 0.35); },
    rankUp: () => { [392, 523.25, 659.25, 783.99, 1046.5].forEach((f, i) => bell(i * 0.09, f, 1.1, 0.8)); if (!sample("handle", 0.5, 0.7)) synth.chip(); },
  };
}
const SFX_NAMES = ["shuffle", "deal", "flip", "click", "call", "raise", "allIn", "fold", "chip", "win", "lose", "tap", "tick", "coin", "ping", "achievement", "rankUp", "rankDown", "heartbeat"];
// one audio context for the whole app, so recordings decode once and iOS only needs unlocking once
const AUDIO_REF = { current: null };
function audioGet() {
  const ref = AUDIO_REF;
  if (!ref.current) {
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
    const ctx = new AC();
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
    const master = ctx.createGain(); master.gain.value = 0.9; master.connect(comp); comp.connect(ctx.destination);
    ref.current = { ctx, sfx: makeSfx(ctx, master) };
  }
  if (ref.current.ctx.state === "suspended") ref.current.ctx.resume();
  return ref.current.sfx;
}
// the first tap anywhere unlocks audio and decodes the recordings, so the first deal already sounds real
if (typeof window !== "undefined") {
  const unlock = () => { try { audioGet(); } catch (e) { /* no audio */ } window.removeEventListener("pointerdown", unlock, true); window.removeEventListener("keydown", unlock, true); };
  window.addEventListener("pointerdown", unlock, true); window.addEventListener("keydown", unlock, true);
}
function useSound(enabled) {
  const get = audioGet;
  return useMemo(() => {
    const api = {};
    SFX_NAMES.forEach((n) => { api[n] = (...args) => { if (!enabled) return; try { const s = get(); if (s) s[n](...args); } catch (e) { /* audio not available */ } }; });
    return api;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);
}

// Saves to the host's storage when it has one, and to the browser's own storage as a backup,
// so progress sticks no matter where the game is opened.
const SAVE_KEY = "felt-player-data";
async function loadData() {
  let raw = null;
  try { if (window.storage && window.storage.get) { const res = await window.storage.get(SAVE_KEY, false); if (res && res.value) raw = res.value; } } catch (e) { /* host storage unavailable */ }
  if (!raw) { try { raw = window.localStorage.getItem(SAVE_KEY); } catch (e) { /* browser storage blocked */ } }
  try { return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
}
async function saveData(data) {
  const raw = JSON.stringify(data);
  try { window.localStorage.setItem(SAVE_KEY, raw); } catch (e) { /* browser storage blocked */ }
  try { if (window.storage && window.storage.set) await window.storage.set(SAVE_KEY, raw, false); } catch (e) { /* host storage unavailable */ }
}
function defaultData() {
  return { name: "You", avatar: "🫵", chips: 2000, unlocked: ["🫵", "🙂", "😎", "🐱"], friends: [], achievements: [], lastDailyBonus: null, stats: { handsPlayed: 0, handsWon: 0, biggestPot: 0, netChips: 0, curWinStreak: 0, bestWinStreak: 0, pos: { late: [0, 0], early: [0, 0], blinds: [0, 0] } }, settings: { winTipSeen: false, colorblind: false, cardSize: "normal", animSpeed: "normal", runTwice: false, squeeze: true }, ranked: defaultRanked(), skill: defaultSkill(), cosmetics: defaultCosmetics(), streak: { count: 0, last: null }, challenges: ensureChallenges(null), pass: ensurePass(null), history: { bankroll: [], best: [] }, titles: defaultTitles(), themes: defaultThemes() };
}
// a phone photo comes in huge: center-crop it to a small square so it saves fast and loads instantly
function shrinkPhoto(file, size = 256) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("decode"));
      img.onload = () => {
        const side = Math.min(img.width, img.height);
        const c = document.createElement("canvas"); c.width = size; c.height = size;
        const g = c.getContext("2d"); g.imageSmoothingQuality = "high";
        g.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
        resolve(c.toDataURL("image/jpeg", 0.84));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
function vibrate(pattern) { try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (e) { /* not supported */ } }
function todayStr() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }

const DISPLAY_FONT = "var(--t-display)";
const BODY_FONT = "'Inter', -apple-system, sans-serif";
function useGoogleFonts() {
  useEffect(() => {
    if (document.getElementById("felt-fonts")) return;
    const link = document.createElement("link");
    link.id = "felt-fonts";
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700;800&display=swap";
    document.head.appendChild(link);
  }, []);
}

/* =========================================================================
   UI PRIMITIVES
   ========================================================================= */
const ICON_PATHS = {
  back: ["m15 18-6-6 6-6"],
  chevron: ["m9 18 6-6-6-6"],
  close: ["M18 6 6 18", "m6 6 12 12"],
  check: ["M20 6 9 17l-5-5"],
  history: ["M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8", "M3 3v5h5", "M12 7v5l4 2"],
  soundOn: ["M11 5 6 9H2v6h4l5 4z", "M15.5 8.5a5 5 0 0 1 0 7", "M19 5a10 10 0 0 1 0 14"],
  soundOff: ["M11 5 6 9H2v6h4l5 4z", "m22 9-6 6", "m16 9 6 6"],
  eye: ["M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z", "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"],
  help: ["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z", "M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3", "M12 17h.01"],
  settings: ["M20 7h-9", "M14 17H5", "M17 20a3 3 0 1 0 0-6 3 3 0 0 0 0 6z", "M7 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"],
  home: ["M3 10.5 12 3l9 7.5", "M5 9.5V21h14V9.5", "M10 21v-6h4v6"],
  bag: ["M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z", "M3 6h18", "M16 10a4 4 0 0 1-8 0"],
  ranks: ["M3 3v18h18", "M8 17v-4", "M13 17V7", "M18 17v-8"],
  user: ["M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2", "M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"],
  lock: ["M5 11h14v10H5z", "M8 11V7a4 4 0 0 1 8 0v4"],
  edit: ["M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"],
  download: ["M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4", "m7 10 5 5 5-5", "M12 15V3"],
  reset: ["M3 12a9 9 0 1 0 3-6.7L3 8", "M3 3v5h5"],
  share: ["M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7", "m16 6-4-4-4 4", "M12 2v13"],
  flame: ["M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"],
  gift: ["M20 12v10H4V12", "M2 7h20v5H2z", "M12 22V7", "M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z", "M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"],
  crown: ["M3 7l4.5 4L12 4l4.5 7L21 7l-2 11H5z", "M5 21h14"],
  wheel: ["M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z", "M12 2v20", "M2 12h20", "M4.9 4.9l14.2 14.2", "M19.1 4.9 4.9 19.1"],
  star: ["M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"],
  chips: ["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z", "M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10z", "M12 2v3", "M12 19v3", "M2 12h3", "M19 12h3"],
  trophy: ["M8 21h8", "M12 17v4", "M7 4h10v5a5 5 0 0 1-10 0z", "M17 5h3a3 3 0 0 1-3 4", "M7 5H4a3 3 0 0 0 3 4"],
  cap: ["M22 10 12 5 2 10l10 5 10-5z", "M6 12v5c3 2 9 2 12 0v-5"],
  bolt: ["M13 2 3 14h9l-1 8 10-12h-9l1-8z"],
  chart: ["M3 3v18h18", "m7 14 4-4 3 3 5-6"],
  camera: ["M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z", "M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"],
  coach: ["M9 18h6", "M10 22h4", "M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.2 1 2V17h6v-.3c0-.8.4-1.5 1-2A7 7 0 0 0 12 2z"],
};
function Icon({ name, size = 16, stroke = 1.8, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" style={style} aria-hidden="true">
      {ICON_PATHS[name].map((d, i) => <path key={i} d={d} />)}
    </svg>
  );
}
function SkillDial({ sr, size = 64 }) {
  const r = size / 2 - 4, c = 2 * Math.PI * r;
  const color = sr >= 70 ? "var(--t-good)" : sr >= 45 ? "var(--t-accent)" : "var(--t-bad)";
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0, display: "block" }} role="img" aria-label={`Skill Rating ${sr}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(244,247,252,0.1)" strokeWidth="5" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" style={{ stroke: color }} strokeWidth="5" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - sr / 100)} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x={size / 2} y={size / 2 + size * 0.12} textAnchor="middle" fill="#F4F7FC" fontWeight="700" fontSize={size * 0.34} fontFamily="Inter, -apple-system, sans-serif">{sr}</text>
    </svg>
  );
}
// Rank emblems grow as you climb: Bronze is a plain medallion, each tier adds a piece
// (shield, wings, spikes, a crystal, a crown), and pips under it show the division.
const BADGE_PAL = {
  unranked: ["#D5DCE8", "#7E8FAB", "#3F4C63"],
  bronze: ["#F6C08C", "#C8783F", "#6E3713"],
  silver: ["#FFFFFF", "#B9C5D6", "#5F6E85"],
  gold: ["#FFEB9C", "#F2B930", "#8C5E04"],
  platinum: ["#B6FFF3", "#2EC4B6", "#0B5E57"],
  diamond: ["#D9EBFF", "#5A9CFF", "#1B3FB8"],
  champion: ["#FFD9FF", "#D45BFF", "#5B1599"],
};
const SHIELD = "M32 9 L49 15 V30 C49 41.5 41.5 49.5 32 55 C22.5 49.5 15 41.5 15 30 V15 Z";
const SHIELD_IN = "M32 14 L44.5 18.5 V30 C44.5 39 39 45.5 32 49.8 C25 45.5 19.5 39 19.5 30 V18.5 Z";
const CRYSTAL = "M32 6 L47 17 L47 37 L32 56 L17 37 L17 17 Z";
const CRYSTAL_IN = "M32 11.5 L42.5 19.5 L42.5 35.5 L32 49.5 L21.5 35.5 L21.5 19.5 Z";
const WING_1 = "M16 22 C9 20.5 3.5 24.5 2.5 31 C6.5 28.5 11 28.2 16 29.5 Z";
const WING_2 = "M16 30 C10 30.5 5.5 35 5.2 41 C8.6 37.6 12.2 36.6 16.5 37 Z";
const WING_3 = "M17.5 38 C13 39.5 10 43.5 10.3 48.5 C13 45.5 16 44.3 19.5 44 Z";
function TierBadge({ tier, size = 28, div = null }) {
  const k = tier.key in BADGE_PAL ? tier.key : "unranked";
  const [hi, mid, lo] = BADGE_PAL[k];
  const g = `tb-${k}`;
  const lvl = ["unranked", "bronze", "silver", "gold", "platinum", "diamond", "champion"].indexOf(k);
  const wings = lvl >= 3 ? (lvl >= 6 ? 3 : lvl >= 4 ? 2 : 1) : 0;
  const body = lvl >= 5 ? CRYSTAL : lvl >= 2 || lvl === 0 ? SHIELD : null;
  const inner = lvl >= 5 ? CRYSTAL_IN : SHIELD_IN;
  const wingFill = lvl >= 6 ? "url(#tb-champion-wing)" : `url(#${g}-v)`;
  const Wing = ({ flip }) => (
    <g transform={flip ? "translate(64 0) scale(-1 1)" : undefined}>
      {wings >= 1 && <path d={WING_1} fill={wingFill} stroke={lo} strokeWidth="1" />}
      {wings >= 2 && <path d={WING_2} fill={wingFill} stroke={lo} strokeWidth="1" />}
      {wings >= 3 && <path d={WING_3} fill={wingFill} stroke={lo} strokeWidth="1" />}
    </g>
  );
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label={`${tier.label}${div ? ` ${ROMAN[div]}` : ""}`} style={{ flexShrink: 0, display: "block", overflow: "visible" }} className={lvl === 6 ? "tb-champ" : undefined}>
      <defs>
        <linearGradient id={`${g}-v`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={hi} /><stop offset="0.55" stopColor={mid} /><stop offset="1" stopColor={lo} /></linearGradient>
        <linearGradient id={`${g}-d`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={lo} /><stop offset="1" stopColor={mid} /></linearGradient>
        <radialGradient id={`${g}-glow`} cx="50%" cy="50%" r="50%"><stop offset="0" stopColor={mid} stopOpacity="0.75" /><stop offset="1" stopColor={mid} stopOpacity="0" /></radialGradient>
        {lvl >= 6 && <linearGradient id="tb-champion-wing" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFF3C4" /><stop offset="0.5" stopColor="#F5C451" /><stop offset="1" stopColor="#B7791F" /></linearGradient>}
      </defs>
      {lvl >= 5 && <circle cx="32" cy="32" r="31" fill={`url(#${g}-glow)`} />}
      <Wing /><Wing flip />
      {/* platinum and up: spikes over the top */}
      {lvl >= 4 && lvl < 6 && <path d="M24 13 L27 4 L30 11 Z M34 11 L37 4 L40 13 Z M30 10 L32 1 L34 10 Z" fill={`url(#${g}-v)`} stroke={lo} strokeWidth="1" />}
      {/* the body: medallion for bronze, shield for silver to platinum, crystal for diamond and champion */}
      {body ? (
        <g>
          <path d={body} fill={`url(#${g}-v)`} stroke={lo} strokeWidth="1.6" strokeLinejoin="round" />
          <path d={inner} fill={`url(#${g}-d)`} opacity="0.9" />
          {lvl >= 5 && <path d="M32 11.5 L32 49.5 M21.5 19.5 L42.5 35.5 M42.5 19.5 L21.5 35.5" stroke={hi} strokeOpacity="0.35" strokeWidth="1" />}
          <path d={lvl >= 5 ? "M32 8 L45 17.5 L32 27 L19 17.5 Z" : "M32 10.5 L47 16 V24 C40 21 25 21 17 24 V16 Z"} fill="#FFFFFF" opacity="0.18" />
        </g>
      ) : (
        <g>
          <circle cx="32" cy="32" r="21" fill={`url(#${g}-v)`} stroke={lo} strokeWidth="1.6" />
          <circle cx="32" cy="32" r="16" fill={`url(#${g}-d)`} />
          <circle cx="32" cy="32" r="21" fill="none" stroke={hi} strokeOpacity="0.5" strokeWidth="1" strokeDasharray="2 3" />
          <path d="M14 26 C20 14 44 14 50 26 C42 21 22 21 14 26 Z" fill="#FFFFFF" opacity="0.18" />
        </g>
      )}
      {/* champion: a jeweled crown sitting on top of the crystal */}
      {lvl >= 6 && (
        <g>
          <path d="M19.5 14 L21.5 1.5 L27.5 7.5 L32 -1.5 L36.5 7.5 L42.5 1.5 L44.5 14 Z" fill="url(#tb-champion-wing)" stroke="#8A5A0B" strokeWidth="1.2" strokeLinejoin="round" />
          <path d="M19.5 14 H44.5" stroke="#8A5A0B" strokeWidth="1.6" />
          <circle cx="32" cy="7" r="2.4" fill="#FF4F8B" stroke="#8A5A0B" strokeWidth="0.8" />
          <circle cx="24" cy="9.5" r="1.6" fill="#5AD8FF" />
          <circle cx="40" cy="9.5" r="1.6" fill="#5AD8FF" />
        </g>
      )}
      {/* center emblem gets fancier each tier */}
      {lvl === 0 && <text x="32" y="39" textAnchor="middle" fontSize="20" fontWeight="800" fill="#E6ECF5" fontFamily="Inter, -apple-system, sans-serif">?</text>}
      {lvl === 1 && <path d="M24 36 L32 27 L40 36" fill="none" stroke={hi} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />}
      {lvl === 2 && <path d="M24 37 L32 28.5 L40 37 M24 30 L32 21.5 L40 30" fill="none" stroke={hi} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />}
      {(lvl === 3 || lvl === 4) && <path d="M32 19 L35.2 26.4 L43 27.1 L37 32.3 L38.9 40 L32 35.9 L25.1 40 L27 32.3 L21 27.1 L28.8 26.4 Z" fill={hi} stroke={lo} strokeWidth="1" strokeLinejoin="round" />}
      {lvl === 4 && <circle cx="32" cy="30.5" r="2.6" fill={mid} />}
      {lvl >= 5 && (
        <g>
          <path d="M32 20 L40 28 L32 40 L24 28 Z" fill={lvl >= 6 ? "#FF4F8B" : "#FFFFFF"} stroke={lo} strokeWidth="1.2" strokeLinejoin="round" />
          <path d="M24 28 L40 28 M28 28 L32 40 L36 28 M28 28 L32 20 L36 28" fill="none" stroke={lo} strokeOpacity="0.45" strokeWidth="0.8" />
        </g>
      )}
      {/* division pips */}
      {div && (
        <g>
          {[0, 1, 2].map((i) => <path key={i} d={`M${19.5 + i * 9} 59.5 l3.5 -3.5 l3.5 3.5 l-3.5 3.5 Z`} fill={i < div ? hi : "rgba(255,255,255,0.12)"} stroke={i < div ? lo : "rgba(0,0,0,0.25)"} strokeWidth="0.8" />)}
        </g>
      )}
      {/* champion sparkles */}
      {lvl >= 6 && <g className="tb-sparkle"><path d="M56 12 l1.2 3 3 1.2 -3 1.2 -1.2 3 -1.2 -3 -3 -1.2 3 -1.2 Z" fill="#FFF3C4" /><path d="M8 46 l1 2.4 2.4 1 -2.4 1 -1 2.4 -1 -2.4 -2.4 -1 2.4 -1 Z" fill="#FFF3C4" /></g>}
    </svg>
  );
}
function Modal({ title, onClose, children, width = 360, className = "" }) {
  return (
    <div className={`scrim${className ? ` ${className}-scrim` : ""}`} onClick={onClose}>
      <div className={`sheet${className ? ` ${className}` : ""}`} style={{ maxWidth: width }} onClick={(e) => e.stopPropagation()} role="dialog" aria-label={title}>
        {title && (
          <div className="sheet-head">
            <div className="sheet-title">{title}</div>
            <button className="iconbtn" onClick={onClose} aria-label="Close"><Icon name="close" size={14} /></button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
function MiniCard({ code, suitColor, dim }) {
  const r = code.slice(0, -1), s = code.slice(-1);
  return (
    <div className="mcard" style={{ opacity: dim ? 0.3 : 1 }}>
      <span style={{ color: suitColor[s] }}>{r}</span>
      <span style={{ color: suitColor[s] }}>{SUIT_GLYPH[s]}</span>
    </div>
  );
}
function SectionLabel({ children, right }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", margin: "0 2px 10px" }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--t-mid)" }}>{children}</div>
      {right && <div style={{ fontSize: 12, color: "var(--t-faint)" }}>{right}</div>}
    </div>
  );
}
// 119,975 becomes 120k so crowded tables still fit
const shortNum = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(1).replace(/\.0$/, "")}M` : n >= 1e5 ? `${Math.round(n / 1000)}k` : n >= 1e4 ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k` : n.toLocaleString());
const signed = (n) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n).toLocaleString()}`;

/* =========================================================================
   SEATS / GAME CONSTANTS
   ========================================================================= */
const SMALL_BLIND = 10, BIG_BLIND = 20;
function makePlayers(name, avatar, stack, numSeats = 4, names = BOT_NAMES) {
  const seats = [{ id: 0, name, isHuman: true, avatar }];
  for (let i = 1; i < numSeats; i++) seats.push({ id: i, name: names[i - 1], avatar: BOT_EMOJI[i - 1] });
  return seats.map((s) => ({ ...s, stack, hole: [], folded: false, allIn: false, eliminated: false, shown: false, contributed: 0, streetContributed: 0, hasActed: false }));
}
function computePots(players) {
  const contributors = players.filter((p) => p.contributed > 0);
  const levels = [...new Set(contributors.map((p) => p.contributed))].sort((a, b) => a - b);
  const pots = []; let prev = 0;
  for (const level of levels) { const inLevel = contributors.filter((p) => p.contributed >= level); const amount = (level - prev) * inLevel.length; if (amount > 0) pots.push({ amount, eligible: inLevel.filter((p) => !p.folded).map((p) => p.id) }); prev = level; }
  return pots;
}

/* =========================================================================
   POKER TABLE
   ========================================================================= */
function PokerTable({ startStack, name, avatar, photo = null, soundOn, setSoundOn, onExit, onHandResolved, stakes, tableSize, tournament, ranked, rankedState, skill, tourneyBuyIn = 0, bankroll, botSkill = 0.4, opponentRating = null, frameColor, tutorial, variant = "holdem", turbo = false, runTwice = false, squeeze = false, cardBack = null, felt = null, title = null, vip = false, prestige = 0, chipSet = "classic", winFx = "confetti", colorblind, cardSize, animSpeed, showWinTip, onDismissWinTip }) {
  const suitColor = colorblind ? SUIT_COLOR_CB : SUIT_COLOR;
  const cardScale = cardSize === "large" ? 1.18 : 1;
  const speedMult = animSpeed === "fast" ? 0.55 : 1;
  ACTIVE_VARIANT = variant; // the hand evaluator and equity math follow the open table's game
  useEffect(() => () => { ACTIVE_VARIANT = "holdem"; }, []);
  const turnSeconds = turbo ? 12 : TURN_SECONDS;
  const numSeatsInit = tableSize?.seats ?? 4;
  const [handsCount, setHandsCount] = useState(0);
  const blindLevel = tournament ? Math.min(Math.floor(handsCount / (turbo ? 3 : 5)), BLIND_LEVEL_MULT.length - 1) : 0;
  const SB = Math.round((stakes?.sb ?? SMALL_BLIND) * BLIND_LEVEL_MULT[blindLevel]);
  const BB = Math.round((stakes?.bb ?? BIG_BLIND) * BLIND_LEVEL_MULT[blindLevel]);
  const [players, setPlayers] = useState(() => makePlayers(name, avatar, startStack, numSeatsInit, vip ? VIP_NAMES : BOT_NAMES));
  const [deck, setDeck] = useState([]);
  const [community, setCommunity] = useState([]);
  const [stage, setStage] = useState("idle");
  const [dealerIdx, setDealerIdx] = useState(-1);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [currentBet, setCurrentBet] = useState(0);
  const [minRaise, setMinRaise] = useState(BB);
  const [statusText, setStatusText] = useState("Hit Deal to start.");
  const [betInput, setBetInput] = useState(0);
  const [showRaise, setShowRaise] = useState(false);
  const [customRaise, setCustomRaise] = useState(false);
  const [timeLeft, setTimeLeft] = useState(turnSeconds);
  const [community2, setCommunity2] = useState(null);
  const [showRankingsLocal, setShowRankingsLocal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [collecting, setCollecting] = useState(false);
  const [potPulse, setPotPulse] = useState(false);
  const [winningIds, setWinningIds] = useState(null);
  const [winnerBanner, setWinnerBanner] = useState(null);
  const [equity, setEquity] = useState(null);
  const [history, setHistory] = useState([]);
  const [confetti, setConfetti] = useState(null);
  const [confirmFold, setConfirmFold] = useState(false);
  const [turnPulse, setTurnPulse] = useState(false);
  const [tournamentOver, setTournamentOver] = useState(null);
  const [knockouts, setKnockouts] = useState(0);
  const [tableCleared, setTableCleared] = useState(false);
  const [bestPot, setBestPot] = useState(0);
  const [rankedResult, setRankedResult] = useState(null);
  const [leaveSheet, setLeaveSheet] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [allInShow, setAllInShow] = useState(false); // everyone's all in: hands go face up
  const [allInOdds, setAllInOdds] = useState(null);
  const [drama, setDrama] = useState(false); // waiting on the last card of an all in
  const [thinking, setThinking] = useState(null); // a bot taking its time on a big decision
  const [coachNote, setCoachNote] = useState(null);
  // serious tables: your cards stay face down, you hold to look, and everyone sees you look
  const blindPeek = !!(ranked || tournament || vip);
  // pro mode: no hand name and no win odds, you read the board yourself
  const proMode = !!(ranked || vip);
  // show or muck: when everyone folds to you, you pick whether the table sees your cards
  const [showChoice, setShowChoice] = useState(null); // { eq, shown }
  const imageRef = useRef({ bluff: 0, value: 0 }); // what the bots have seen you show
  const lastAggRef = useRef(-1); // who made the last bet or raise this street
  const heroEqRef = useRef(null);
  const [vipIntro, setVipIntro] = useState(!!vip);
  useEffect(() => { if (!vip) return; const t = setTimeout(() => mountedRef.current && setVipIntro(false), 2600); return () => clearTimeout(t); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);
  const [peekOpen, setPeekOpen] = useState(false);
  const [peekers, setPeekers] = useState({}); // seat id -> time they looked
  const peekRef = useRef({ hand: 0, looks: 0, streets: {} });
  const heroPeekStatsRef = useRef({ peeks: 0, onDraws: 0 });
  function flashPeek(id, ms = 1500) {
    const t = Date.now();
    setPeekers((m) => ({ ...m, [id]: t }));
    setTimeout(() => mountedRef.current && setPeekers((m) => (m[id] === t ? (({ [id]: _, ...rest }) => rest)(m) : m)), ms);
  }
  function onHeroPeek() {
    const pr = peekRef.current;
    if (pr.hand !== handsCount) { pr.hand = handsCount; pr.looks = 0; pr.streets = {}; }
    pr.looks += 1;
    // a look after the flop is the tell bots pay attention to
    if (community.length >= 3 && !pr.streets[stage]) {
      pr.streets[stage] = true;
      const st = heroPeekStatsRef.current; st.peeks += 1;
      if (human && findDraws(human.hole, community)) st.onDraws += 1;
      if (pr.looks > 1) setStatusText("You look at your cards again");
    }
  }
  const coachRef = useRef(null); const coachTimerRef = useRef(null);

  const botTimeoutRef = useRef(null); const flowTimeoutRef = useRef(null);
  const timerIntervalRef = useRef(null); const deadlineRef = useRef(0); const mountedRef = useRef(true);
  const confirmFoldRef = useRef(null);
  const tendencyRef = useRef(Object.fromEntries(Array.from({ length: 8 }, (_, i) => [i + 1, { aggr: 0, total: 0 }])));
  const sound = useSound(soundOn);
  // what the human did this hand and this match, for decision-quality scoring
  const handDecisionsRef = useRef([]); const matchHandsRef = useRef([]); const equityRef = useRef(null);
  const lastHandRef = useRef(null);
  const handMetaRef = useRef(null); const lastBigLossRef = useRef(false); const boardBaseRef = useRef(0); const lastTickRef = useRef(null);
  // in ranked, show each opponent's rank near yours so the matchmaking is visible
  const [botRanks] = useState(() => (opponentRating == null ? [] : Array.from({ length: 8 }, () => Math.max(0, Math.min(1650, Math.round(opponentRating + (Math.random() * 2 - 1) * 90))))));
  const [matchmaking, setMatchmaking] = useState(ranked ? "searching" : null);
  useEffect(() => {
    if (!ranked) return;
    const t1 = setTimeout(() => mountedRef.current && setMatchmaking("found"), 1500);
    const t2 = setTimeout(() => mountedRef.current && setMatchmaking(null), 2300);
    return () => { clearTimeout(t1); clearTimeout(t2); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => { mountedRef.current = false; clearTimeout(botTimeoutRef.current); clearTimeout(flowTimeoutRef.current); clearInterval(timerIntervalRef.current); clearTimeout(confirmFoldRef.current); clearTimeout(coachTimerRef.current); }, []);

  const pot = players.reduce((s, p) => s + p.contributed, 0);
  const canAct = (p) => !p.folded && !p.allIn;
  const alive = (p) => !p.eliminated;
  function nextAliveFrom(idx, list) { const n = list.length; for (let i = 1; i <= n; i++) { const j = (idx + i) % n; if (alive(list[j])) return j; } return idx; }
  function nextActiveFrom(idx, list) { const n = list.length; for (let i = 1; i <= n; i++) { const cand = list[(idx + i) % n]; if (canAct(cand)) return cand.id; } return -1; }

  function startHand() {
    clearTimeout(botTimeoutRef.current); clearTimeout(flowTimeoutRef.current); clearInterval(timerIntervalRef.current);
    sound.shuffle();
    handDecisionsRef.current = [];
    boardBaseRef.current = 0;
    const liveN = players.filter((q) => !q.eliminated).length;
    setTimeout(() => mountedRef.current && sound.deal(liveN * holeCount(), 0.07 * speedMult), DEAL_OFFSET * speedMult * 1000);
    let d = shuffle(freshDeck(variant));
    const hc = holeCount();
    const numSeats = players.length;
    const nDealer = nextAliveFrom(dealerIdx < 0 ? -1 : dealerIdx, players);
    let ps = players.map((p) => (p.eliminated
      ? { ...p, hole: [], folded: true, shown: false, allIn: false, contributed: 0, streetContributed: 0, hasActed: true }
      : { ...p, hole: Array.from({ length: hc }, () => d.pop()), folded: false, shown: false, allIn: p.stack <= 0, contributed: 0, streetContributed: 0, hasActed: false }));
    const sbIdx = nextAliveFrom(nDealer, ps); const bbIdx = nextAliveFrom(sbIdx, ps);
    // where the human sits this hand: button and cutoff are "late", blinds are "blinds", the rest "early"
    const liveCount = ps.filter((p) => !p.eliminated).length;
    let position = "early";
    if (nDealer === 0) position = "late";
    else if (sbIdx === 0 || bbIdx === 0) position = "blinds";
    else { const order = []; let j = bbIdx; for (let k = 0; k < liveCount; k++) { j = nextAliveFrom(j, ps); order.push(j); if (j === nDealer) break; } position = order.indexOf(0) >= order.length - 2 ? "late" : "early"; }
    handMetaRef.current = { startStack: ps[0].stack, position, seats: liveCount, afterBigLoss: lastBigLossRef.current, sawFlop: false, allInEq: null, allInPot: 0 };
    ps[sbIdx].contributed = ps[sbIdx].streetContributed = Math.min(SB, ps[sbIdx].stack); ps[sbIdx].stack -= ps[sbIdx].contributed;
    ps[bbIdx].contributed = ps[bbIdx].streetContributed = Math.min(BB, ps[bbIdx].stack); ps[bbIdx].stack -= ps[bbIdx].contributed;
    ps.forEach((p) => { if (!p.eliminated && p.stack === 0) p.allIn = true; });
    setDeck(d); setPlayers(ps); setCommunity([]); setCommunity2(null); setDealerIdx(nDealer); setPreAction(null); setHoleRevealed(!squeeze); setAllInShow(false); setAllInOdds(null); setDrama(false); setThinking(null); setCoachNote(null); setPeekOpen(false); setPeekers({});
    setShowChoice(null); lastAggRef.current = -1; heroEqRef.current = null;
    { const im = imageRef.current; im.bluff *= 0.75; im.value *= 0.75; } // the table slowly forgets
    setCurrentBet(BB); setMinRaise(BB); setStage("preflop"); setWinningIds(null); setWinnerBanner(null); setShowRaise(false); setCustomRaise(false); setConfirmFold(false);
    setStatusText(`Hand ${handsCount + 1}. Blinds ${SB}/${BB}.`);
    const firstToAct = nextAliveFrom(bbIdx, ps);
    setActiveIdx(canAct(ps[firstToAct]) ? firstToAct : nextActiveFrom(bbIdx, ps));
    setHandsCount((h) => h + 1);
  }

  function collectAndProceed(ps, then) {
    setCollecting(true); sound.chip();
    flowTimeoutRef.current = setTimeout(() => {
      if (!mountedRef.current) return;
      const cleared = ps.map((p) => ({ ...p, streetContributed: 0 }));
      setPlayers(cleared); setCollecting(false);
      setPotPulse(true); setTimeout(() => mountedRef.current && setPotPulse(false), 300);
      then(cleared);
    }, 520 * speedMult);
  }

  function goToNextStreet(ps, d, curStage, curCommunity, curDealer) {
    const resetPs = ps.map((p) => ({ ...p, hasActed: false }));
    setPlayers(resetPs); setCurrentBet(0); setMinRaise(BB); setPreAction(null); lastAggRef.current = -1;
    let newCommunity = curCommunity; let newDeck = [...d]; let nextStage = curStage;
    const meta = handMetaRef.current;
    if (meta && !ps[0].folded) {
      if (curStage === "preflop") meta.sawFlop = true;
      // money's in with cards to come: lock in the human's equity right now
      const live = ps.filter((p) => !p.folded);
      if (meta.allInEq == null && curStage !== "river" && live.length > 1 && live.filter((p) => !p.allIn && p.stack > 0).length <= 1) {
        meta.allInEq = equityKnown(ps[0].hole, live.filter((p) => p.id !== 0).map((p) => p.hole), curCommunity);
        meta.allInPot = computePots(ps).filter((pt) => pt.eligible.includes(0)).reduce((a, pt) => a + pt.amount, 0);
      }
    }
    { const live = ps.filter((p) => !p.folded); if (live.length > 1 && curStage !== "river" && live.filter((p) => !p.allIn && p.stack > 0).length <= 1) setAllInShow(true); }
    if (curStage === "preflop") { newDeck.pop(); newCommunity = [newDeck.pop(), newDeck.pop(), newDeck.pop()]; nextStage = "flop"; setStatusText("Flop"); }
    else if (curStage === "flop") { newDeck.pop(); newCommunity = [...curCommunity, newDeck.pop()]; nextStage = "turn"; setStatusText("Turn"); }
    else if (curStage === "turn") { newDeck.pop(); newCommunity = [...curCommunity, newDeck.pop()]; nextStage = "river"; setStatusText("River"); }
    else if (curStage === "river") { nextStage = "showdown"; }
    const newCardCount = newCommunity.length - curCommunity.length;
    boardBaseRef.current = curCommunity.length;
    // bots re-check their cards too: weak ones when they pick up a draw, sharp ones at random to fake it
    if (blindPeek && nextStage !== "showdown") {
      resetPs.forEach((bp) => {
        if (bp.isHuman || bp.folded || bp.eliminated || !bp.hole.length) return;
        const drawing = !!findDraws(bp.hole, newCommunity);
        const chance = botSkill >= 0.6 ? 0.22 : drawing ? 0.65 : 0.08;
        if (Math.random() < chance) setTimeout(() => mountedRef.current && flashPeek(bp.id, 600 + Math.random() * (drawing ? 2200 : 1200)), (500 + Math.random() * 1400) * speedMult);
      });
    }
    // the showdown stage only starts once the pot is paid, so Next hand can't skip the payout
    setStage(nextStage === "showdown" ? curStage : nextStage); setCommunity(newCommunity); setDeck(newDeck);
    if (nextStage !== "showdown") sound.flip(newCardCount, 0.12 * speedMult);
    if (nextStage === "showdown") { flowTimeoutRef.current = setTimeout(() => doShowdown(resetPs, newCommunity), 450 * speedMult); setActiveIdx(-1); return; }
    const stillIn = resetPs.filter((p) => !p.folded);
    if (stillIn.length <= 1 || stillIn.every((p) => p.allIn || p.stack === 0)) { flowTimeoutRef.current = setTimeout(() => runOutOrShowdown(resetPs, newDeck, newCommunity), 1000 * speedMult); setActiveIdx(-1); return; }
    setActiveIdx(nextActiveFrom(curDealer, resetPs));
  }

  function runOutOrShowdown(ps, d, comm) {
    const stillIn = ps.filter((p) => !p.folded);
    if (stillIn.length > 1 && comm.length < 5) {
      setAllInShow(true);
      let nd = [...d]; const before = comm.length;
      // run it twice: a second board from the remaining deck, each pot split in half between the two runouts
      if (runTwice && !ps[0].folded) {
        let nc = [...comm]; nd.pop(); while (nc.length < 5) nc.push(nd.pop());
        const nc2 = [...comm]; while (nc2.length < 5) nc2.push(nd.pop());
        boardBaseRef.current = before;
        setDeck(nd); setCommunity(nc); setCommunity2(nc2); sound.flip(nc.length - before, 0.12 * speedMult);
        setTimeout(() => mountedRef.current && sound.flip(nc2.length - before, 0.12 * speedMult), 650 * speedMult);
        flowTimeoutRef.current = setTimeout(() => doShowdown(ps, nc, nc2), 1800 * speedMult);
        return;
      }
      // one street at a time so every card lands
      const steps = [];
      let have = comm.length;
      if (have === 0) { nd.pop(); steps.push([nd.pop(), nd.pop(), nd.pop()]); have = 3; }
      while (have < 5) { nd.pop(); steps.push([nd.pop()]); have += 1; }
      const heroIn = !ps[0].folded;
      const runStep = (i, cur) => {
        if (i >= steps.length) { setDrama(false); flowTimeoutRef.current = setTimeout(() => doShowdown(ps, cur), 700 * speedMult); return; }
        const last = i === steps.length - 1 && steps.length > 0;
        const wait = (last ? (heroIn ? 2300 : 1500) : 1150) * speedMult;
        if (last && heroIn) {
          setDrama(true); sound.heartbeat(); setStatusText("One card to come");
          setTimeout(() => mountedRef.current && sound.heartbeat(), 900 * speedMult);
          setTimeout(() => mountedRef.current && sound.heartbeat(), 1750 * speedMult);
        }
        flowTimeoutRef.current = setTimeout(() => {
          if (!mountedRef.current) return;
          const next = [...cur, ...steps[i]];
          boardBaseRef.current = cur.length;
          setCommunity(next); setDeck(nd); sound.flip(steps[i].length, 0.12 * speedMult);
          setStatusText(next.length === 3 ? "Flop" : next.length === 4 ? "Turn" : "River");
          if (last) setDrama(false);
          runStep(i + 1, next);
        }, i === 0 ? 450 * speedMult : wait);
      };
      runStep(0, comm);
    } else doShowdown(ps, comm);
  }

  function doShowdown(ps, comm, comm2 = null) {
    setStage("showdown"); setDrama(false); setThinking(null);
    const contenders = ps.filter((p) => !p.folded);
    const pots = computePots(ps);
    let finalPs = ps.map((p) => ({ ...p }));
    const lines = []; let bestCardIds = null; let humanWon = false; let headline = ""; let headline2 = null; let potWonByHuman = 0; let summary = null;
    const awards = {}; // who won how much, for the chips flying to each winner

    if (contenders.length === 1) {
      const winner = contenders[0]; const totalPot = pots.reduce((s, pp) => s + pp.amount, 0);
      finalPs = finalPs.map((p) => (p.id === winner.id ? { ...p, stack: p.stack + totalPot } : p)); awards[winner.id] = totalPot;
      const who = winner.isHuman ? "You win" : `${winner.name} wins`; lines.push(`${who} ${totalPot.toLocaleString()}. Everyone else folded.`); headline = `${who} ${totalPot.toLocaleString()}`;
      if (winner.id === 0) { humanWon = true; potWonByHuman = totalPot; setShowChoice({ eq: heroEqRef.current, shown: false }); }
      else if (Math.random() < 0.16 + (1 - botSkill) * 0.1) {
        // bots flash their cards now and then, sometimes the nuts, sometimes air
        finalPs = finalPs.map((p) => (p.id === winner.id ? { ...p, shown: true } : p));
        const cards = winner.hole.map((c) => `${rankLabel(c.r)}${SUIT_GLYPH[c.s]}`).join(" ");
        const made = comm.length >= 3 ? describeCurrentHand(winner.hole, comm) : null;
        headline2 = `${winner.name} shows ${cards}${made ? `, ${made.toLowerCase()}` : ""}`;
      }
    } else {
      const boards = comm2 ? [comm, comm2] : [comm];
      const allWinnerIds = new Set();
      boards.forEach((board, bi) => {
        const scored = contenders.map((p) => ({ ...p, score: bestHand(p.hole, board) }));
        const boardWon = {}; let mainWinners = null, mainBest = null;
        pots.forEach((potObj, i) => {
          const amount = boards.length === 1 ? potObj.amount : bi === 0 ? Math.ceil(potObj.amount / 2) : Math.floor(potObj.amount / 2);
          const eligible = scored.filter((p) => potObj.eligible.includes(p.id));
          let best = null; eligible.forEach((p) => { if (!best || cmpScore(p.score, best) > 0) best = p.score; });
          const winners = eligible.filter((p) => cmpScore(p.score, best) === 0);
          const share = Math.floor(amount / winners.length);
          winners.forEach((w) => { finalPs = finalPs.map((p) => (p.id === w.id ? { ...p, stack: p.stack + share } : p)); awards[w.id] = (awards[w.id] || 0) + share; boardWon[w.id] = (boardWon[w.id] || 0) + share; if (w.id === 0) { humanWon = true; potWonByHuman += share; } allWinnerIds.add(w.id); });
          if (i === 0) { mainWinners = winners; mainBest = best; }
          if (boards.length === 1) lines.push(`${pots.length > 1 ? (i === 0 ? "Main pot" : `Side pot ${i}`) : "Pot"}: ${winners.map((w) => w.name).join(" & ")} ${share.toLocaleString()}`);
        });
        // the headline names whoever took the main pot and everything they won on this board, side pots included
        const amt = mainWinners.length > 1 ? Math.floor(mainWinners.reduce((a, w) => a + (boardWon[w.id] || 0), 0) / mainWinners.length) : boardWon[mainWinners[0].id] || 0;
        const h = `${boards.length > 1 ? `Run ${bi + 1}: ` : ""}${mainWinners.map((w) => (w.isHuman ? "You" : w.name)).join(" & ")} ${mainWinners.length > 1 ? "split" : mainWinners[0].isHuman ? "win" : "wins"} ${amt.toLocaleString()} with ${handName(mainBest)}`;
        if (bi === 0) { bestCardIds = new Set(mainBest[mainBest.length - 1].map((c) => c.id)); headline = h; } else headline2 = h;
        if (boards.length > 1) lines.push(`Run ${bi + 1}: ${Object.keys(boardWon).map((id) => `${contenders.find((c) => c.id === +id).name} ${boardWon[id].toLocaleString()}`).join(", ")}`);
        // full transparency: show every contender's actual hand, ranked best to worst, so a result is never ambiguous
        if (bi === 0) summary = scored.slice().sort((a, b) => cmpScore(b.score, a.score)).map((p) => ({ id: p.id, name: p.name, desc: describeScore(p.score), isWinner: allWinnerIds.has(p.id) }));
      });
    }
    finalPs = finalPs.map((p) => ({ ...p, contributed: 0, streetContributed: 0 }));

    // A bot that hits zero is out in every mode. The human is only marked out in tournaments;
    // cash and ranked handle a human bust with their own end-of-session screens.
    const botsBusted = finalPs.filter((p) => !p.isHuman && !p.eliminated && p.stack <= 0).length;
    finalPs = finalPs.map((p) => (!p.eliminated && p.stack <= 0 && (tournament || !p.isHuman) ? { ...p, eliminated: true, folded: true } : p));
    if (botsBusted > 0 && humanWon) setKnockouts((k) => k + botsBusted);
    if (!tournament && finalPs[0].stack > 0 && finalPs.every((p) => p.isHuman || p.eliminated)) setTableCleared(true);
    if (humanWon) setBestPot((b) => Math.max(b, potWonByHuman));

    if (tournament) {
      const aliveAfter = finalPs.filter((p) => !p.eliminated);
      const humanAlive = aliveAfter.some((p) => p.isHuman);
      if (!humanAlive) {
        const placement = aliveAfter.length + 1;
        setTournamentOver({ won: false, placement, total: finalPs.length });
      } else if (aliveAfter.length === 1) {
        setTournamentOver({ won: true, placement: 1, total: finalPs.length });
      }
    }

    setPlayers(finalPs); setStatusText(lines.join(". ")); setActiveIdx(-1); setWinningIds(bestCardIds);
    setWinnerBanner({ text: headline, text2: headline2, won: humanWon, summary, potLines: lines });
    setHistory((h) => [{ id: Date.now(), text: headline2 ? `${headline}. ${headline2}` : headline, won: humanWon }, ...h].slice(0, 15));
    // the hand as it ended, for the share image and your best-hands list
    const heroShowdown = !ps[0].folded && comm.length === 5 && contenders.length > 1;
    const heroScore = heroShowdown ? bestHand(ps[0].hole, comm) : null;
    lastHandRef.current = { headline, headline2, won: humanWon, potWon: potWonByHuman, hero: ps[0].hole.map((c) => c.id), board: comm.map((c) => c.id), board2: comm2 ? comm2.map((c) => c.id) : null, heroDesc: heroScore ? describeScore(heroScore) : null, variant, at: Date.now() };
    flyWinnings(awards);
    // celebrate what you actually gained this hand, not the pot (your own chips coming back don't count)
    const startedWith = handMetaRef.current && handMetaRef.current.startStack != null ? handMetaRef.current.startStack : finalPs[0].stack;
    const heroGain = finalPs[0].stack - startedWith;
    if (humanWon && heroGain >= 25 * BB) { setBigWin(heroGain); setTimeout(() => mountedRef.current && setBigWin(null), 2100); }
    humanWon ? sound.win() : sound.lose();
    if (humanWon) vibrate([30, 40, 30]); else vibrate(25);
    const preHandStack = finalPs[0].stack - potWonByHuman; // rough baseline before this pot landed
    if (humanWon && heroGain > 0 && (heroGain >= 300 || (preHandStack > 0 && potWonByHuman >= preHandStack * 0.4))) {
      setConfetti(Date.now());
      setTimeout(() => mountedRef.current && setConfetti(null), 1600);
    }
    const hd = handDecisionsRef.current;
    const meta = handMetaRef.current || {};
    const net = finalPs[0].stack - (meta.startStack == null ? finalPs[0].stack : meta.startStack);
    // all-in luck removed: credit the equity you had when the money went in, not how the board ran out
    const evNet = meta.allInEq != null ? net - potWonByHuman + meta.allInEq * meta.allInPot : net;
    const wentSD = contenders.length > 1 && contenders.some((p) => p.id === 0);
    const decisions = {
      w: hd.reduce((a, d) => a + d.weight, 0), s: hd.reduce((a, d) => a + d.score * d.weight, 0),
      vpip: hd.some((d) => d.street === "preflop" && (d.type === "call" || d.type === "bet" || d.type === "raise")),
      pfr: hd.some((d) => d.street === "preflop" && (d.type === "bet" || d.type === "raise")),
      aggr: hd.filter((d) => d.type === "bet" || d.type === "raise").length, calls: hd.filter((d) => d.type === "call").length, folds: hd.filter((d) => d.type === "fold").length,
      seats: meta.seats || players.length, position: meta.position || "early", idealVpip: IDEAL_VPIP[meta.seats || players.length] || 0.34,
      sawFlop: !!meta.sawFlop, wentSD, wonSD: wentSD && humanWon,
      netBB: net / BB, evBB: evNet / BB, botSkill, afterBigLoss: !!meta.afterBigLoss,
    };
    lastBigLossRef.current = net <= -20 * BB;
    matchHandsRef.current.push(decisions);
    handDecisionsRef.current = [];
    onHandResolved({
      won: humanWon, potWon: potWonByHuman, finalStack: finalPs[0].stack, decisions, variant,
      position: meta.position || "early", wonSD: wentSD && humanWon, allIn: !!ps[0].allIn,
      goodCount: hd.filter((d) => d.score >= 1).length,
      best: heroScore ? { kind: handKind(heroScore), s: [handKind(heroScore), ...heroScore.slice(1).filter((x) => typeof x === "number")].slice(0, 6), desc: describeScore(heroScore), cards: heroScore[heroScore.length - 1].map((c) => c.id), won: humanWon } : null,
    });
  }

  // Grades each human decision against the odds: was a call or fold right given equity vs. pot odds?
  function recordDecision(type, toCall, potNow, extra = 0) {
    const eqPct = equityRef.current;
    if (eqPct == null) return;
    const eq = eqPct / 100;
    const potOdds = toCall > 0 ? toCall / (potNow + toCall) : 0;
    let score;
    if (type === "fold") score = toCall === 0 ? 0 : eq < potOdds + 0.02 ? 1 : eq < potOdds + 0.12 ? 0.5 : 0;
    else if (type === "call") score = eq >= potOdds - 0.02 ? 1 : eq >= potOdds - 0.1 ? 0.5 : 0;
    else if (type === "check") score = eq > 0.72 ? 0.6 : 0.85;
    else {
      // a bet or raise is judged by the equity it needs if called: shoving 1,000 into 100 needs close to 50%
      const be = extra > 0 ? extra / (potNow + 2 * extra) : 0.5;
      score = eq >= Math.max(0.5, be + 0.05) ? 1 : eq >= be ? 0.6 : 0.15;
    }
    const weight = 1 + Math.min(4, (toCall + potNow) / (BB * 10));
    heroEqRef.current = eqPct; // what you had when you last put chips in, for show or muck
    handDecisionsRef.current.push({ street: stage, type, score, weight });
  }
  const handleAction = useCallback((idx, type, amount = 0) => {
    if (idx === 0 && tutorial && coachRef.current) {
      const c = coachRef.current; coachRef.current = null;
      const v = coachVerdict(c.adv, type, c.eq, c.toCall, c.pot);
      if (v) { setCoachNote(v); clearTimeout(coachTimerRef.current); coachTimerRef.current = setTimeout(() => mountedRef.current && setCoachNote(null), 4200); }
    }
    if (idx !== 0) setThinking(null);
    setPlayers((prev) => {
      let ps = prev.map((p) => ({ ...p })); const p = ps[idx];
      if (!p || p.folded || p.allIn) return prev;
      if (idx === 0) recordDecision(type, Math.max(0, currentBet - p.streetContributed), prev.reduce((a, q) => a + q.contributed, 0), type === "bet" || type === "raise" ? Math.max(0, Math.min(amount, p.stack + p.streetContributed) - p.streetContributed) : 0);
      let label = "";
      const vol = idx === 0 ? 1 : 0.5;
      if (type === "fold") { p.folded = true; label = `${p.name} folds`; sound.fold(vol); }
      else if (type === "check") { label = `${p.name} checks`; sound.click(vol); }
      else if (type === "call") { const need = Math.min(currentBet - p.streetContributed, p.stack); p.stack -= need; p.contributed += need; p.streetContributed += need; if (p.stack === 0) p.allIn = true; label = `${p.name} ${p.allIn ? "calls all in" : "calls"} ${need}`; if (p.allIn) sound.allIn(vol); else sound.call(vol, need / BB); flyBet(idx, need); }
      else if (type === "bet" || type === "raise") {
        const target = Math.min(amount, p.streetContributed + p.stack); const delta = target - p.streetContributed;
        p.stack -= delta; p.contributed += delta; p.streetContributed = target; if (p.stack === 0) p.allIn = true; flyBet(idx, delta); lastAggRef.current = idx;
        setMinRaise(Math.max(BB, target - currentBet)); setCurrentBet(target);
        ps.forEach((pl) => { if (pl.id !== p.id) pl.hasActed = false; });
        label = `${p.name} ${p.allIn ? "is all in for" : type === "bet" ? "bets" : "raises to"} ${target}`; if (p.allIn) sound.allIn(vol); else sound.raise(vol, delta / BB);
      }
      p.hasActed = true; setStatusText(label); setShowRaise(false); setCustomRaise(false);
      const stillIn = ps.filter((pl) => !pl.folded);
      const curStage = stage, curCommunity = community, curDealer = dealerIdx;
      if (stillIn.length <= 1) { collectAndProceed(ps, (cps) => doShowdown(cps, curCommunity)); setActiveIdx(-1); return ps; }
      const targetBet = type === "bet" || type === "raise" ? amount : currentBet;
      const openToAct = ps.filter((pl) => canAct(pl) && (!pl.hasActed || pl.streetContributed < targetBet));
      if (openToAct.length === 0) { collectAndProceed(ps, (cps) => goToNextStreet(cps, deck, curStage, curCommunity, curDealer)); setActiveIdx(-1); }
      else setActiveIdx(nextActiveFrom(idx, ps));
      return ps;
    });
  }, [currentBet, community, dealerIdx, stage, deck]);

  useEffect(() => {
    if (activeIdx < 0 || stage === "idle" || stage === "showdown") return;
    const p = players[activeIdx]; if (!p || p.isHuman) return;
    const pers = BOT_PERSONALITIES[activeIdx - 1] || BOT_PERSONALITIES[0];
    // decide now, act after a believable pause: snap folds, quick checks, long tanks on big spots
    const skill = botSkill;
    const opps = players.filter((q) => q.id !== p.id && !q.folded && !q.eliminated).length;
    const eq = skill >= 0.3 ? calcEquity(p.hole, community, Math.max(1, opps), 40 + Math.round(skill * 60)) / 100 : estimateStrength(p.hole, community);
    let strength = (eq + (Math.random() * 2 - 1) * 0.3 * (1 - skill)) * (1 + (pers.tight - 1) * 0.4);
    if (blindPeek && skill >= 0.45 && peekRef.current.hand === handsCount && peekRef.current.streets[stage] && !players[0].folded) {
      const hs = heroPeekStatsRef.current;
      const readsDraw = hs.peeks >= 3 ? hs.onDraws / hs.peeks : 0.5;
      strength += 0.1 * skill * readsDraw;
    }
    const bluffing = Math.random() < pers.bluff * (0.6 + skill * 0.6);
    const toCall = currentBet - p.streetContributed; const potNow = pot;
    // you showed a bluff: they call you lighter. You showed the nuts: they give your bets more credit
    if (toCall > 0 && lastAggRef.current === 0) {
      const im = imageRef.current;
      strength += (0.09 * Math.min(2, im.bluff) - 0.06 * Math.min(2, im.value)) * (0.5 + skill);
    }
    const potOdds = toCall > 0 ? toCall / (potNow + toCall) : 0;
    const sizeBet = (frac) => Math.min(p.stack + p.streetContributed, currentBet + Math.max(minRaise, Math.round(potNow * frac)));
    const t = tendencyRef.current[activeIdx];
    let move;
    if (toCall <= 0) {
      if ((strength > 0.62 / pers.aggression && Math.random() < 0.55 * pers.aggression) || (bluffing && Math.random() < 0.5)) move = { type: "bet", amount: sizeBet(0.45 + Math.random() * 0.4 * pers.aggression), aggr: true };
      else move = { type: "check" };
    } else if (strength > Math.max(0.66, potOdds + 0.25) / Math.sqrt(pers.aggression) && Math.random() < 0.45 * pers.aggression) move = { type: "raise", amount: sizeBet(0.6 + Math.random() * 0.5 * pers.aggression), aggr: true };
    else if (strength >= potOdds - 0.03 * skill) move = { type: "call" };
    else if (Math.random() < (1 - skill) * 0.4 && toCall < p.stack * 0.25) move = { type: "call" }; // weak bots chase
    else if (bluffing && skill > 0.5 && toCall < p.stack * 0.2) move = { type: "raise", amount: sizeBet(0.8), aggr: true };
    else move = { type: "fold" };
    const chipsAtRisk = move.type === "call" ? Math.min(toCall, p.stack) : move.amount ? move.amount - p.streetContributed : 0;
    const huge = chipsAtRisk >= p.stack * 0.45 || (move.type === "fold" && toCall >= p.stack * 0.45);
    const big = huge || (chipsAtRisk >= potNow * 0.8 && chipsAtRisk >= BB * 15);
    const r = Math.random();
    let ms;
    if (huge) ms = 2200 + r * 2300;
    else if (big) ms = 1500 + r * 1300;
    else if (move.type === "fold") ms = toCall <= BB * 2 ? 420 + r * 500 : 900 + r * 900;
    else if (move.type === "check") ms = 480 + r * 700;
    else if (move.type === "call") ms = 750 + r * 900;
    else ms = 1100 + r * 1200;
    if (!big && Math.random() < 0.1) ms *= 0.5; // the occasional snap
    ms = ms * speedMult * (turbo ? 0.5 : 1);
    const thinkTimer = big && ms > 1800 ? setTimeout(() => mountedRef.current && setThinking(p.id), 900 * speedMult) : null;
    botTimeoutRef.current = setTimeout(() => {
      if (!mountedRef.current) return;
      clearTimeout(thinkTimer); setThinking(null);
      if (t) { if (move.aggr) { t.aggr += 1; t.total += 1; } else t.total += 1; }
      handleAction(activeIdx, move.type, move.amount || 0);
    }, Math.min(ms, (turnSeconds - 2) * 1000));
    return () => { clearTimeout(botTimeoutRef.current); clearTimeout(thinkTimer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIdx, stage]);

  useEffect(() => {
    clearInterval(timerIntervalRef.current);
    if (activeIdx < 0 || stage === "idle" || stage === "showdown") return;
    deadlineRef.current = Date.now() + turnSeconds * 1000; setTimeLeft(turnSeconds); lastTickRef.current = null;
    timerIntervalRef.current = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000)); setTimeLeft(remaining);
      if (activeIdx === 0 && remaining > 0 && remaining <= 5 && remaining !== lastTickRef.current) { lastTickRef.current = remaining; sound.tick(); }
      if (remaining <= 0) { clearInterval(timerIntervalRef.current); const p = players[activeIdx]; if (p) { const toCall = currentBet - p.streetContributed; handleAction(activeIdx, toCall > 0 ? "fold" : "check"); } }
    }, 250);
    return () => clearInterval(timerIntervalRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIdx, stage]);

  const human = players[0];
  const humanToCall = currentBet - (human?.streetContributed || 0);
  const humanTurn = stage !== "idle" && stage !== "showdown" && activeIdx === 0 && human && !human.folded && !human.allIn;

  useEffect(() => {
    if (humanTurn) {
      sound.ping(); vibrate(15); setTurnPulse(true);
      const t = setTimeout(() => mountedRef.current && setTurnPulse(false), 1400);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [humanTurn]);

  function handleFoldClick() {
    const bigPot = pot >= 300 || (human && pot >= human.stack * 0.25);
    if (bigPot && !confirmFold) {
      setConfirmFold(true);
      clearTimeout(confirmFoldRef.current);
      confirmFoldRef.current = setTimeout(() => mountedRef.current && setConfirmFold(false), 3000);
      return;
    }
    clearTimeout(confirmFoldRef.current); setConfirmFold(false);
    vibrate(20);
    handleAction(0, "fold");
  }
  useEffect(() => { if (humanTurn) setBetInput(Math.min(human.stack + human.streetContributed, Math.max(currentBet + minRaise, BB * 2))); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [humanTurn]);

  const holeKey = human?.hole.map((c) => c.id).join(",") || "";
  const commKey = community.map((c) => c.id).join(",");
  const oppCount = players.filter((p) => !p.folded && !p.isHuman).length;
  useEffect(() => {
    if (!human || human.hole.length === 0 || stage === "idle" || stage === "showdown" || human.folded) { setEquity(null); return; }
    const raf = requestAnimationFrame(() => { if (mountedRef.current) setEquity(calcEquity(human.hole, community, oppCount)); });
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holeKey, commKey, oppCount, stage]);

  useEffect(() => { equityRef.current = equity; }, [equity]);
  useEffect(() => {
    if (!allInShow || stage === "showdown" || stage === "idle") { if (!allInShow) setAllInOdds(null); return; }
    const live = players.filter((p) => !p.folded && !p.eliminated && p.hole.length);
    if (live.length < 2) return;
    const raf = requestAnimationFrame(() => {
      if (!mountedRef.current) return;
      const odds = {}; live.forEach((p) => { odds[p.id] = Math.round(equityKnown(p.hole, live.filter((q) => q.id !== p.id).map((q) => q.hole), community, 500) * 100); });
      setAllInOdds(odds);
    });
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allInShow, commKey, stage]);
  // ---- chips that fly: seat to pot on every bet, pot to the winner at showdown ----
  const seatRefs = useRef({}); const potRef = useRef(null);
  const [flights, setFlights] = useState([]);
  const [preAction, setPreAction] = useState(null); // "checkfold" | "check" | "callany"
  const [holeRevealed, setHoleRevealed] = useState(!squeeze);
  const [bigWin, setBigWin] = useState(null);
  const [shareOpen, setShareOpen] = useState(false);
  const centerOf = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
  function fly(fromEl, toEl, n = 3, label = null) {
    const a = centerOf(fromEl), b = centerOf(toEl); if (!a || !b) return;
    const id = Math.random().toString(36).slice(2);
    setFlights((f) => [...f, { id, x: a.x, y: a.y, dx: b.x - a.x, dy: b.y - a.y, n }, ...(label ? [{ id: id + "t", x: b.x, y: b.y, label }] : [])]);
    setTimeout(() => mountedRef.current && setFlights((f) => f.filter((x) => x.id !== id && x.id !== id + "t")), 1500);
  }
  function flyBet(idx, amount) { if (amount > 0) setTimeout(() => mountedRef.current && fly(seatRefs.current[idx], potRef.current, Math.min(5, 2 + Math.floor(amount / (BB * 4)))), 0); }
  function flyWinnings(awards) {
    Object.entries(awards).forEach(([id, amt], k) => setTimeout(() => mountedRef.current && fly(potRef.current, seatRefs.current[id], 6, `+${amt.toLocaleString()}`), (280 + k * 160) * speedMult));
  }
  // pre-actions fire the moment it's your turn
  useEffect(() => {
    if (!humanTurn || !preAction) return;
    const pa = preAction; const toCall = humanToCall;
    setPreAction(null);
    if (pa === "check" && toCall > 0) return; // someone bet, so this one's your call
    if (pa.startsWith("call:") && Number(pa.slice(5)) !== toCall) return; // the price changed, so you decide
    const t = setTimeout(() => {
      if (!mountedRef.current) return;
      if (pa === "checkfold") handleAction(0, toCall > 0 ? "fold" : "check");
      else if (pa === "check") handleAction(0, "check");
      else handleAction(0, toCall > 0 ? "call" : "check");
    }, 380);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [humanTurn]);
  const revealHole = () => { if (!holeRevealed) { setHoleRevealed(true); sound.flip(1); } };
  function showHand() {
    if (!showChoice || showChoice.shown || !human) return;
    const eq = showChoice.eq != null ? showChoice.eq / 100 : estimateStrength(human.hole, community);
    const kind = eq < 0.4 ? "bluff" : eq >= 0.6 ? "value" : "meh";
    const im = imageRef.current;
    if (kind === "bluff") im.bluff += 1; else if (kind === "value") im.value += 1;
    setShowChoice({ ...showChoice, shown: true, kind });
    setPlayers((prev) => prev.map((p, i) => (i === 0 ? { ...p, shown: true } : p)));
    const cards = human.hole.map((c) => `${rankLabel(c.r)}${SUIT_GLYPH[c.s]}`).join(" ");
    setWinnerBanner((b) => (b ? { ...b, text2: kind === "bluff" ? `You show ${cards}. The table saw that bluff and they'll call you lighter for a while.` : kind === "value" ? `You show ${cards}. They'll give your bets more respect for a while.` : `You show ${cards}.` } : b));
    sound.flip(2); vibrate(15);
  }

  const coachAdv = tutorial && humanTurn && holeRevealed ? coachAdvice({ hole: human.hole, board: community, eq: equity, toCall: Math.max(0, humanToCall), pot, stack: human.stack, streetIn: human.streetContributed, currentBet, bb: BB, opps: Math.max(1, oppCount), position: handMetaRef.current ? handMetaRef.current.position : "early" }) : null;
  coachRef.current = coachAdv ? { adv: coachAdv, eq: equity, toCall: Math.max(0, humanToCall), pot } : null;
  const hiddenHand = blindPeek && !peekOpen && !allInShow;
  const handLabel = human && human.hole.length > 0 && stage !== "idle" && stage !== "showdown" && (holeRevealed || blindPeek) && !hiddenHand && (!proMode || allInShow) ? describeCurrentHand(human.hole, community) : null;
  const dim = (id) => (stage === "showdown" && winningIds ? !winningIds.has(id) : false);
  const bots = players.slice(1);
  const contested = players.filter((p) => !p.folded && !p.eliminated && p.hole.length > 0).length > 1;
  const ringColor = vip ? "#D9B46A" : "#34D399";
  const busted = human && human.stack <= 0 && (stage === "idle" || stage === "showdown");
  const betweenHands = stage === "idle" || stage === "showdown";
  const rebuyAmount = startStack > 0 ? startStack : BB * 100;
  const potShown = useTween(pot, 280);
  const heroEq = allInOdds && allInOdds[0] != null ? allInOdds[0] : equity;
  const eqShown = useTween(heroEq == null ? 0 : heroEq, 450);
  function rebuy() {
    sound.coin(); vibrate(20);
    setPlayers((prev) => prev.map((p, i) => (i === 0 ? { ...p, stack: rebuyAmount, allIn: false, folded: false } : p)));
  }
  function newTable() {
    sound.shuffle();
    const fresh = makePlayers(name, avatar, BB * 100, players.length, vip ? VIP_NAMES : BOT_NAMES);
    setPlayers(fresh.map((p, i) => (i === 0 ? { ...p, stack: human.stack } : p)));
    setTableCleared(false); setDealerIdx(-1); setStage("idle"); setCommunity([]); setWinnerBanner(null); setWinningIds(null);
    setStatusText("New table. Deal when you're ready.");
  }

  // deal order: each live seat gets a card in turn, then the second round
  const liveSeats = players.filter((p) => !p.eliminated).map((p) => p.id);
  const dealStep = 0.07 * speedMult;
  const dealDelay = (seatId, cardIdx) => { const order = Math.max(0, liveSeats.indexOf(seatId)); return DEAL_OFFSET * speedMult + (cardIdx * liveSeats.length + order) * dealStep; };

  // ---- ranked match lifecycle ----
  // where you'd finish if the match ended right now: one place behind everyone with more chips
  const rankedPlace = 1 + players.filter((p) => !p.isHuman && p.stack + p.contributed > (human ? human.stack + human.contributed : 0)).length;
  const outcomeFor = (finalStack, cleared, complete = false) => rankedOutcome({ buyIn: startStack, finalStack, cleared, hands: handsCount, knockouts, ranked: rankedState, matchHands: matchHandsRef.current, place: cleared ? 1 : finalStack <= 0 ? 1 + players.filter((p) => !p.isHuman && p.stack > 0).length : rankedPlace, field: players.length, complete });
  function finishRanked(finalStack, cleared, complete = false) {
    if (rankedResult) return null;
    clearTimeout(botTimeoutRef.current); clearTimeout(flowTimeoutRef.current); clearInterval(timerIntervalRef.current);
    const o = outcomeFor(finalStack, cleared, complete);
    setLeaveSheet(false); setRankedResult(o); setActiveIdx(-1);
    return o;
  }
  useEffect(() => {
    if (!ranked || rankedResult || !betweenHands) return;
    if (busted) finishRanked(0, false, true);
    else if (tableCleared) finishRanked(human.stack, true, true);
    else if (stage === "showdown" && handsCount >= RANKED_MATCH_HANDS) finishRanked(human.stack, false, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busted, tableCleared, stage]);
  useEffect(() => {
    // give the final showdown a moment on screen before the results take over
    if (!rankedResult || showResults) return;
    const t = setTimeout(() => {
      if (!mountedRef.current) return;
      setShowResults(true);
      playResultSound(rankedResult);
    }, 1900 * speedMult);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rankedResult]);
  function leaveRankedNow() {
    const o = finishRanked(human.stack, false);
    if (o) { setShowResults(true); playResultSound(o); }
  }
  function playResultSound(r) {
    if (r.placementFinal) { setTimeout(() => mountedRef.current && sound.rankUp(), 1850); return; }
    if (!r.placement && rankName(r.after) !== rankName(r.before)) { if (r.after > r.before) { sound.rankUp(); vibrate([30, 40, 30, 40, 60]); } else sound.rankDown(); return; }
    if (r.won) { sound.achievement(); vibrate([30, 40, 30]); } else sound.lose();
  }
  function handleBack() {
    if (ranked && !rankedResult) { setLeaveSheet(true); return; }
    if (tournament && !tournamentOver && handsCount > 0) { setLeaveSheet(true); return; }
    if (ranked && rankedResult) { setShowResults(true); return; }
    onExit(human.stack, tournamentOver);
  }
  const bankrollAfter = rankedResult ? (bankroll ?? 0) - startStack + rankedResult.finalStack : 0;
  const placementNo = ranked && !isPlaced(rankedState) ? (rankedState.placementGames || []).length + 1 : null;

  const gameTag = [variant !== "holdem" && VARIANTS[variant] ? VARIANTS[variant].label : null, turbo ? "Turbo" : null].filter(Boolean).join(" ");
  const modeLine = tournament
    ? (tournamentOver ? "Tournament over" : `${gameTag || "Tournament"}, level ${blindLevel + 1}, blinds ${SB}/${BB}`)
    : ranked
      ? `${placementNo ? `Placement ${placementNo} of ${PLACEMENT_MATCHES}` : "Ranked"}, ${handsCount === 0 ? `${RANKED_MATCH_HANDS} hand match` : handsCount >= RANKED_MATCH_HANDS ? "final hand" : `hand ${handsCount} of ${RANKED_MATCH_HANDS}`}`
      : tutorial ? "Practice, nothing at stake" : vip ? `${stakes?.label || "High Roller"} · ${SB.toLocaleString()} / ${BB.toLocaleString()}` : `${gameTag ? `${gameTag} cash` : "Cash game"}, blinds ${SB}/${BB}`;

  return (
    <div data-felt={felt ? felt.key : "green"} data-back={cardBack ? cardBack.key : "blue"} className={`table-wrap${drama ? " is-drama" : ""}${vip ? " vip" : ""}${bots.length >= 7 ? " crowded" : ""}`} style={{ ...(cardBack ? { "--back-a": cardBack.a, "--back-b": cardBack.b, "--back-ring": cardBack.ring, ...(cardBack.img ? { "--back-img": cardBack.img, "--back-size": cardBack.size } : {}) } : {}), ...(felt ? { "--felt1": felt.c1, "--felt2": felt.c2, "--felt3": felt.c3, "--rail": felt.rail, ...(felt.tex ? { "--felt-tex": felt.tex, "--felt-tex-size": felt.texSize } : {}), ...(felt.line ? { "--felt-line": felt.line } : {}) } : {}) }}>
      <div className="table-top">
        <button className="iconbtn" onClick={handleBack} aria-label="Leave table"><Icon name="back" size={15} /></button>
        <div style={{ textAlign: "center", minWidth: 0 }}>
          <div className="wordmark-sm">felt</div>
          <div className="table-sub">{modeLine}</div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="iconbtn" onClick={() => setShowHistory(true)} aria-label="Hand history"><Icon name="history" size={14} /></button>
          <button className="iconbtn" onClick={() => setSoundOn((s) => !s)} aria-label={soundOn ? "Mute" : "Unmute"}><Icon name={soundOn ? "soundOn" : "soundOff"} size={14} /></button>
          <button className="iconbtn" onClick={() => setShowRankingsLocal(true)} aria-label="Hand rankings"><Icon name="help" size={14} /></button>
        </div>
      </div>

      {vipIntro && (
        <div className="vip-intro" onClick={() => setVipIntro(false)} aria-hidden="true">
          <div className="vi-crest"><Icon name="crown" size={22} stroke={1.6} /></div>
          <div className="vi-kicker">felt private room</div>
          <div className="vi-title">{stakes?.label || "High Roller"}</div>
          <div className="vi-rule" />
          <div className="vi-sub num">Blinds {SB.toLocaleString()} / {BB.toLocaleString()}</div>
        </div>
      )}
      <div key={statusText} className="status">{stage !== "showdown" ? statusText : ""}</div>

      <div className={`seats${bots.length >= 7 ? " grid4" : ""}`}>
        {bots.map((p, i) => {
          const realIdx = i + 1; const isActive = activeIdx === realIdx && stage !== "idle" && stage !== "showdown"; const revealed = (stage === "showdown" || allInShow) && !p.folded && !p.eliminated && p.hole.length > 0 && (contested || p.shown);
          const t = tendencyRef.current[realIdx]; const tendencyTag = t && t.total >= 4 ? (t.aggr / t.total >= 0.55 ? "Aggressive" : t.aggr / t.total <= 0.2 ? "Tight" : null) : null;
          const compact = bots.length >= 5; const tiny = bots.length >= 7;
          const avSize = tiny ? 28 : compact ? 32 : 36; const ringSize = tiny ? 34 : compact ? 38 : 42; const colWidth = tiny ? 76 : compact ? 62 : 78;
          const fmt = compact ? shortNum : (n) => n.toLocaleString();
          const hc = p.hole.length || holeCount();
          const inHand = !p.eliminated && p.hole.length > 0 && stage !== "idle";
          const botRating = ranked ? botRanks[i] : null;
          return (
            <div key={p.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, width: colWidth, opacity: p.eliminated ? 0.28 : p.folded ? 0.5 : 1, transition: "opacity .3s ease" }}>
              <div ref={(el) => { seatRefs.current[p.id] = el; }} style={{ position: "relative", width: ringSize, height: ringSize }}>
                {isActive && (<svg width={ringSize} height={ringSize} style={{ position: "absolute", top: 0, left: 0, transform: "rotate(-90deg)" }}>
                  <circle cx={ringSize / 2} cy={ringSize / 2} r={ringSize / 2 - 2} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2.5" />
                  <circle cx={ringSize / 2} cy={ringSize / 2} r={ringSize / 2 - 2} fill="none" stroke={timeLeft < 8 ? "#FF6B6B" : ringColor} strokeWidth="2.5" strokeDasharray={2 * Math.PI * (ringSize / 2 - 2)} strokeDashoffset={2 * Math.PI * (ringSize / 2 - 2) * (1 - timeLeft / turnSeconds)} style={{ transition: "stroke-dashoffset .25s linear" }} strokeLinecap="round" /></svg>)}
                <div className="bot-av" style={{ width: avSize, height: avSize, background: AVATAR_COLORS[i], fontSize: compact ? 13 : 14 }}>{p.name[0]}</div>
                {peekers[p.id] && <div className="peek-badge" aria-label={`${p.name} looks at their cards`}><Icon name="eye" size={11} stroke={2.4} /></div>}
                {thinking === p.id && <div className="think-dots" aria-label={`${p.name} is thinking`}><i /><i /><i /></div>}
                {dealerIdx === realIdx && !p.eliminated && <div className="dealer-chip">D</div>}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4, maxWidth: colWidth }}>
                {botRating != null && <TierBadge tier={tierForRating(botRating)} size={13} />}
                <span style={{ fontSize: compact ? 10.5 : 11.5, fontWeight: 600, color: "var(--t-text2)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</span>
              </div>
              <div className="num" style={{ fontSize: 10.5, color: "var(--t-mut)" }}>{p.eliminated ? "Out" : fmt(p.stack)}</div>
              {tendencyTag && !p.eliminated && !tiny && <div style={{ fontSize: 9.5, fontWeight: 600, color: tendencyTag === "Aggressive" ? "var(--t-bad)" : "var(--t-good)" }}>{tendencyTag}</div>}
              <div style={{ height: tiny ? 30 : 34, display: "flex", alignItems: "center", justifyContent: "center", gap: 3 }}>
                {revealed && p.hole.map((c, i2) => (<div key={c.id} className={`card mini${hc > 2 ? " m4" : ""}${dim(c.id) ? " dim" : ""}${winningIds && winningIds.has(c.id) ? " win" : ""}`} style={{ marginLeft: hc > 2 && i2 ? -7 : 0, animation: `flipIn .4s cubic-bezier(.2,.8,.2,1) ${i2 * 0.08}s backwards` }}><div style={{ color: suitColor[c.s], fontSize: 9, fontWeight: 700 }}>{rankLabel(c.r)}{SUIT_GLYPH[c.s]}</div></div>))}
                {!revealed && inHand && (
                  <div key={`b${handsCount}`} className={`backs${p.folded ? " folded" : ""}${peekers[p.id] ? " peeking" : ""}`}>
                    {Array.from({ length: hc }).map((_, j) => <div key={j} className="card mini back" style={{ "--r": `${hc > 2 ? (j - 1.5) * 8 : j === 0 ? -7 : 7}deg`, marginLeft: j ? (hc > 2 ? -14 : -11) : 0, animation: `dealToSeat .42s cubic-bezier(.2,.8,.2,1) ${dealDelay(p.id, j)}s backwards` }} />)}
                  </div>
                )}
              </div>
              <div style={{ height: 18 }}>
                {allInOdds && allInOdds[p.id] != null && stage !== "showdown" ? <div className="odds-badge num" style={{ color: allInOdds[p.id] >= 50 ? "var(--t-good)" : "#FFB4B4" }}>{allInOdds[p.id]}%</div>
                  : p.streetContributed > 0 && <div className={`chip-badge${collecting ? " collecting" : ""}`}>{!compact && <ChipStack amount={p.streetContributed} small vip={vip} set={chipSet} />}{fmt(p.streetContributed)}</div>}
              </div>
            </div>
          );
        })}
      </div>
      {confetti && <WinFx key={confetti} kind={winFx} />}
      {drama && <div className="drama-vignette" aria-hidden="true" />}

      <div className="felt-center">
        <div className={`felt-oval${drama ? " drama" : ""}`}>
          {vip ? (
            <div className="felt-logo vip-logo" aria-hidden="true"><span className="vl-word">felt</span></div>
          ) : <div className="felt-logo" aria-hidden="true" style={variant === "short" ? { fontSize: 44 } : undefined}>{variant === "holdem" ? "felt" : variant === "short" ? "short deck" : "omaha"}</div>}
          <div style={{ display: "flex", gap: "clamp(4px,1.4vw,6px)", position: "relative" }}>
            {community.map((c, i) => <div key={c.id} className={`card${dim(c.id) ? " dim" : ""}${winningIds && winningIds.has(c.id) ? " win" : ""}`} style={{ animation: `flipIn .45s cubic-bezier(.2,.8,.2,1) ${Math.max(0, i - boardBaseRef.current) * 0.12 * speedMult}s backwards` }}><div style={{ color: suitColor[c.s] }}>{rankLabel(c.r)}</div><div style={{ color: suitColor[c.s], fontSize: "0.9em" }}>{SUIT_GLYPH[c.s]}</div></div>)}
            {Array.from({ length: 5 - community.length }).map((_, i) => (<div key={i} className={`card-slot${drama && i === 0 ? " next" : ""}`} />))}
          </div>
          {community2 && (
            <div className="run2" aria-label="Second run">
              <span>Run 2</span>
              {community2.map((c, i) => <div key={c.id + "r2"} className="card r2" style={{ animation: `flipIn .45s cubic-bezier(.2,.8,.2,1) ${(0.6 + Math.max(0, i - boardBaseRef.current) * 0.12) * speedMult}s backwards`, opacity: i < boardBaseRef.current ? 0.55 : 1 }}><div style={{ color: suitColor[c.s] }}>{rankLabel(c.r)}</div><div style={{ color: suitColor[c.s], fontSize: "0.9em" }}>{SUIT_GLYPH[c.s]}</div></div>)}
            </div>
          )}
          <div className="pot-row" style={{ visibility: pot > 0 ? "visible" : "hidden" }}>
            <ChipStack amount={pot} vip={vip} set={chipSet} />
            <div ref={potRef} className={`pot-num num${potPulse ? " pulse" : ""}`}>Pot {potShown.toLocaleString()}</div>
          </div>
        </div>
        {stage === "showdown" && winnerBanner && (
          <div className="banner" style={{ borderColor: winnerBanner.won ? "rgba(52,211,153,0.45)" : "rgba(244,247,252,0.12)", background: winnerBanner.won ? "rgba(52,211,153,0.12)" : "rgba(244,247,252,0.04)" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: winnerBanner.won ? "var(--t-good)" : "var(--t-text)" }}>{winnerBanner.text}</div>
                {winnerBanner.text2 && <div style={{ fontSize: 13, fontWeight: 600, color: "var(--t-text2)", marginTop: 2 }}>{winnerBanner.text2}</div>}
              </div>
              <button className="iconbtn" onClick={() => setShareOpen(true)} aria-label="Share this hand"><Icon name="share" size={13} /></button>
            </div>
            {winnerBanner.summary && winnerBanner.summary.length > 1 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 3, paddingTop: 7, marginTop: 7, borderTop: "1px solid rgba(244,247,252,0.08)" }}>
                {winnerBanner.summary.map((s) => (
                  <div key={s.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 11.5, color: s.isWinner ? "var(--t-good)" : "var(--t-mid)", fontWeight: s.isWinner ? 600 : 400 }}>
                    <span>{s.name}</span><span>{s.desc}</span>
                  </div>
                ))}
              </div>
            )}
            {winnerBanner.potLines && winnerBanner.potLines.length > 1 && (
              <div style={{ fontSize: 10.5, color: "var(--t-mut)", paddingTop: 5 }}>{winnerBanner.potLines.join(". ")}</div>
            )}
          </div>
        )}
      </div>

      {tutorial ? (
        // practice: one panel holds your hand, your odds and the coach, so nothing jumps around
        <div className={`coach-panel ${coachAdv ? `act-${coachAdv.act}` : coachNote ? `note ${coachNote.good ? "good" : "bad"}` : "idle"}`} role="status">
          {handLabel && <div className="cp-meter" style={{ width: `${heroEq == null ? 0 : eqShown}%`, background: eqShown >= 50 ? "rgba(52,211,153,0.13)" : "rgba(255,107,107,0.11)" }} />}
          <div className="cp-top">
            <span className="coach-badge"><Icon name="cap" size={12} stroke={2.2} />Coach</span>
            {coachAdv && <span className="coach-act">{coachAdv.text}</span>}
            {handLabel && <span className="cp-hand"><span className="cp-name">{handLabel}</span><b className="num" style={{ color: heroEq == null ? "var(--t-mut)" : eqShown >= 50 ? "var(--t-good)" : "var(--t-bad)" }}>{heroEq == null ? "…" : `${eqShown}%`}</b></span>}
          </div>
          <div className="coach-why">{coachAdv ? coachAdv.why : coachNote ? coachNote.text : stage === "idle" ? "Deal a hand. On every turn I'll tell you the best move and why." : betweenHands ? "Hit Next hand when you're ready." : human && human.folded ? "You're out of this one. Watch how it plays out." : "Waiting on the table. The % is your chance to win right now."}</div>
        </div>
      ) : (<>
      <div style={{ width: "100%", maxWidth: 460, flexShrink: 0, height: handLabel ? 46 : 0, overflow: "hidden", transition: "height .2s ease", marginBottom: handLabel ? 8 : 0 }}>
        {handLabel && (<div className="hand-strip" style={{ borderColor: heroEq != null && heroEq >= 50 ? "rgba(52,211,153,0.4)" : "rgba(255,107,107,0.32)" }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--t-text2)", position: "relative" }}>{handLabel}</span>
          <span className="num" style={{ fontSize: 14.5, fontWeight: 700, position: "relative", color: heroEq == null ? "var(--t-mut)" : eqShown >= 50 ? "var(--t-good)" : "var(--t-bad)" }}>{heroEq == null ? "…" : `${eqShown}% to win`}</span>
          <div className="eq-meter" style={{ width: `${heroEq == null ? 0 : eqShown}%`, background: eqShown >= 50 ? "rgba(52,211,153,0.16)" : "rgba(255,107,107,0.13)" }} />
        </div>)}
      </div>
      {handLabel && showWinTip && (
        <div className="tip" style={{ marginTop: -4, color: "var(--t-accent)", borderColor: "rgba(245,184,61,0.35)", background: "rgba(245,184,61,0.08)" }}>
          <span>Your current hand and your odds of winning this pot. Use it to decide whether to call or fold.</span>
          <button className="iconbtn" onClick={onDismissWinTip} aria-label="Got it"><Icon name="check" size={13} /></button>
        </div>
      )}
      </>)}
      <div className="hero-seat" style={{ borderColor: turnPulse ? (vip ? "rgba(217,180,106,0.75)" : "rgba(52,211,153,0.6)") : (vip ? "rgba(217,180,106,0.2)" : "rgba(244,247,252,0.08)"), boxShadow: turnPulse ? (vip ? "0 0 26px rgba(217,180,106,0.28)" : "0 0 22px rgba(52,211,153,0.25)") : "none" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <div ref={(el) => { seatRefs.current[0] = el; }} style={{ position: "relative", width: 44, height: 44, flexShrink: 0 }}>
            {peekOpen && <div className="peek-badge hero" aria-label="You looked at your cards"><Icon name="eye" size={11} stroke={2.4} /></div>}
            {prestige >= 5 && <CrownMark />}
            {humanTurn && (<svg width="44" height="44" style={{ position: "absolute", top: 0, left: 0, transform: "rotate(-90deg)" }}>
              <circle cx="22" cy="22" r="20" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2.5" />
              <circle cx="22" cy="22" r="20" fill="none" stroke={timeLeft < 8 ? "#FF6B6B" : ringColor} strokeWidth="2.5" strokeDasharray={2 * Math.PI * 20} strokeDashoffset={2 * Math.PI * 20 * (1 - timeLeft / turnSeconds)} style={{ transition: "stroke-dashoffset .25s linear" }} strokeLinecap="round" /></svg>)}
            <div style={{ position: "absolute", top: 3, left: 3, width: 38, height: 38, borderRadius: "50%", background: "var(--t-panel2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, opacity: human?.folded ? 0.4 : 1, boxShadow: frameColor ? `0 0 0 2px ${frameColor}` : "none", overflow: "hidden" }}>{photo ? <img src={photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /> : human?.avatar}</div>
            {dealerIdx === 0 && <div className="dealer-chip" style={{ bottom: -1, right: -1 }}>D</div>}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "flex", alignItems: "center", gap: 5 }}><span className={pnameCls(prestige)}>{human?.name}</span><PrestigeBadge n={prestige} size={15} /></div>
            {title && title !== "rookie" && <TitleTag k={title} size={10.5} style={{ display: "block", marginTop: -1 }} />}
            <div className="num" style={{ fontSize: 12, color: "var(--t-mid)" }}>{(human?.stack ?? 0).toLocaleString()}{ranked && handsCount > 0 && !rankedResult && <span className="standing">{ordinal(rankedPlace)} of {players.length}</span>}</div>
            {human?.streetContributed > 0 && <div className={`chip-badge${collecting ? " collecting" : ""}`} style={{ marginTop: 3 }}><ChipStack amount={human.streetContributed} small vip={vip} set={chipSet} />{human.streetContributed.toLocaleString()}</div>}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, position: "relative" }}>
          {human?.shown && stage === "showdown" && <div className="shown-tag">Shown</div>}
          {human && human.hole.length > 0 ? (
            blindPeek && !human.folded && stage !== "showdown" && !allInShow ? (
              <PeekCards key={`pk${handsCount}`} cards={human.hole} suitColor={suitColor} omaha={human.hole.length > 2} delayFor={(i) => dealDelay(0, i)} open={peekOpen} setOpen={(v) => { setPeekOpen(v); if (v) { onHeroPeek(); sound.flip(1); } }} scale={cardScale} />
            ) : squeeze && !holeRevealed && !human.folded && stage !== "showdown" ? (
              <SqueezeCards key={`sq${handsCount}`} cards={human.hole} suitColor={suitColor} omaha={human.hole.length > 2} delayFor={(i) => dealDelay(0, i)} onReveal={revealHole} />
            ) : human.hole.map((c, i) => (<div key={c.id} className={`card big${human.hole.length > 2 ? " o4" : ""}${dim(c.id) ? " dim" : ""}${winningIds && winningIds.has(c.id) ? " win" : ""}${human.folded ? " mucked" : ""}`} style={{ animation: holeRevealed && squeeze ? "none" : `dealToHero .5s cubic-bezier(.2,.85,.25,1) ${dealDelay(0, i)}s backwards`, ...(cardScale !== 1 && human.hole.length <= 2 ? { width: 64 * cardScale, height: 90 * cardScale, fontSize: 22 * cardScale } : {}) }}><div style={{ color: suitColor[c.s] }}>{rankLabel(c.r)}</div><div style={{ color: suitColor[c.s], fontSize: "0.85em" }}>{SUIT_GLYPH[c.s]}</div></div>))
          ) : (<><div className="card big back" style={{ animation: "none" }} /><div className="card big back" style={{ animation: "none" }} /></>)}
        </div>
      </div>

      <div className="controls">
        {showRaise && humanTurn && (() => {
          const maxAmt = human.stack + human.streetContributed;
          const minAmt = Math.max(currentBet + minRaise, BB);
          const clamp = (v) => Math.max(minAmt, Math.min(maxAmt, v));
          const halfPot = clamp(currentBet + Math.round(pot * 0.5));
          const potAmt = clamp(currentBet + pot);
          const presets = [{ label: "Half pot", value: halfPot }, { label: "Pot", value: potAmt }, { label: "All in", value: maxAmt }];
          return (
            <div style={{ width: "100%" }}>
              {!customRaise ? (
                <div style={{ display: "flex", gap: 7, width: "100%" }}>
                  {presets.map((p) => (
                    <button key={p.label} className="btn preset-btn" onClick={() => { vibrate(20); setBetInput(p.value); handleAction(0, currentBet === 0 ? "bet" : "raise", p.value); }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600 }}>{p.label}</div>
                      <div className="num" style={{ fontSize: 10.5, opacity: 0.8 }}>{p.value.toLocaleString()}</div>
                    </button>
                  ))}
                  <button className="iconbtn" style={{ width: 42, height: 42, borderRadius: 12 }} onClick={() => { setBetInput(minAmt); setCustomRaise(true); }} aria-label="Custom amount"><Icon name="edit" size={15} /></button>
                </div>
              ) : (
                <div className="slider-row">
                  <input type="range" min={minAmt} max={maxAmt} value={clamp(betInput)} onChange={(e) => setBetInput(Number(e.target.value))} style={{ flex: 1 }} aria-label="Bet amount" />
                  <span className="num" style={{ fontSize: 13, minWidth: 48, textAlign: "right", fontWeight: 700 }}>{clamp(betInput).toLocaleString()}</span>
                  <button className="btn btn-raise" style={{ flex: "none", padding: "8px 16px" }} onClick={() => handleAction(0, currentBet === 0 ? "bet" : "raise", clamp(betInput))}>{currentBet === 0 ? "Bet" : "Raise"}</button>
                </div>
              )}
            </div>
          );
        })()}
        {ranked && rankedResult ? (
          <button className="btn btn-raise" style={{ flex: "none", width: "100%" }} onClick={() => setShowResults(true)}>See match results</button>
        ) : tournamentOver ? (
          <div style={{ textAlign: "center", width: "100%" }}>
            <div style={{ fontFamily: DISPLAY_FONT, fontSize: 20, fontWeight: 600, color: tournamentOver.won ? "var(--t-good)" : "var(--t-text)", marginBottom: 4 }}>{tournamentOver.won ? "You won the tournament" : `You finished ${ordinal(tournamentOver.placement)}`}</div>
            <div className="num" style={{ fontSize: 12.5, color: "var(--t-mut)", marginBottom: 12 }}>{tournamentOver.won ? `Outlasted ${tournamentOver.total - 1} players.` : `Out of ${tournamentOver.total} players.`}{tourneyBuyIn > 0 ? (tourneyPrize(tournamentOver.total, tournamentOver.placement, tourneyBuyIn) > 0 ? ` You cashed ${tourneyPrize(tournamentOver.total, tournamentOver.placement, tourneyBuyIn).toLocaleString()} chips.` : " Outside the money.") : ""}</div>
            <button className="btn btn-raise" style={{ width: "100%" }} onClick={() => onExit(startStack, tournamentOver)}>Back to lobby</button>
          </div>
        ) : tableCleared && !ranked && !tournament && betweenHands ? (
          <div style={{ textAlign: "center", width: "100%" }}>
            <div style={{ fontFamily: DISPLAY_FONT, fontSize: 20, fontWeight: 600, marginBottom: 4 }}>You cleared the table</div>
            <div className="num" style={{ fontSize: 12.5, color: "var(--t-mut)", marginBottom: 12 }}>{tutorial ? "Nice. Practice chips don't count toward your balance." : `${signed(human.stack - startStack)} chips this session.`}</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn" onClick={() => onExit(human.stack)}>{tutorial ? "Lobby" : "Cash out"}</button>
              <button className="btn btn-raise" onClick={newTable}>New table</button>
            </div>
          </div>
        ) : busted ? (
          <div style={{ textAlign: "center", width: "100%" }}>
            <div style={{ fontSize: 13.5, color: "var(--t-bad)", marginBottom: tutorial || tournament || ranked ? 10 : 4 }}>You're out of chips.</div>
            {!tutorial && !tournament && !ranked && <div style={{ fontSize: 12, color: "var(--t-mut)", marginBottom: 10 }}>Daily rewards, the spin, challenges and the season pass get you back in.</div>}
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn" onClick={() => onExit(0)}>Back to lobby</button>
              {tutorial && <button className="btn btn-raise" onClick={rebuy}>Rebuy {rebuyAmount.toLocaleString()}</button>}
            </div>
          </div>
        ) : betweenHands && showChoice && stage === "showdown" && !(ranked && handsCount >= RANKED_MATCH_HANDS) ? (
          <div style={{ display: "flex", width: "100%", gap: 8 }}>
            <button className="btn show-btn" disabled={showChoice.shown} onClick={showHand}><Icon name="eye" size={14} stroke={2.2} />{showChoice.shown ? "Shown" : "Show cards"}</button>
            <button className="btn btn-raise" onClick={startHand}>{showChoice.shown ? "Next hand" : "Muck, next hand"}</button>
          </div>
        ) : betweenHands ? (
          <button className="btn btn-raise" style={{ flex: "none", width: "100%" }} onClick={startHand}>{stage === "idle" ? "Deal" : "Next hand"}</button>
        ) : humanTurn ? (
          <div style={{ display: "flex", width: "100%", gap: 8 }}>
            <button className="btn btn-fold" onClick={handleFoldClick}>{confirmFold ? "Tap again" : "Fold"}</button>
            {humanToCall <= 0 ? (<button className="btn btn-go" onClick={() => { vibrate(15); handleAction(0, "check"); }}>Check</button>) : (<button className="btn btn-go" onClick={() => { vibrate(15); handleAction(0, "call"); }}>Call {Math.min(humanToCall, human.stack).toLocaleString()}</button>)}
            {!showRaise ? (<button className="btn" onClick={() => setShowRaise(true)} disabled={human.stack + human.streetContributed <= currentBet}>{currentBet === 0 ? "Bet" : "Raise"}</button>) : (<button className="btn" onClick={() => { setShowRaise(false); setCustomRaise(false); }}>Cancel</button>)}
          </div>
        ) : human && !human.folded && !human.allIn && !human.eliminated && !betweenHands ? (
          <div className="pre-row" role="group" aria-label="Act in advance">
            {[
              { key: "checkfold", label: humanToCall > 0 ? "Fold" : "Check / Fold" },
              humanToCall > 0 ? { key: `call:${humanToCall}`, label: `Call ${Math.min(humanToCall, human.stack).toLocaleString()}` } : { key: "check", label: "Check" },
              { key: "callany", label: "Call any" },
            ].map((o) => {
              const k = o.key; const on = preAction === k;
              return <button key={o.key} className={`pre-btn${on ? " on" : ""}`} aria-pressed={on} onClick={() => { sound.tap(); setPreAction(on ? null : k); }}><span className="pre-box">{on && <Icon name="check" size={11} stroke={3} />}</span>{o.label}</button>;
            })}
          </div>
        ) : (<div style={{ fontSize: 12.5, color: "var(--t-faint)", padding: "12px 0" }}>Waiting on the table</div>)}
      </div>

      <div className="flights" aria-hidden="true">
        {flights.map((f) => f.label
          ? <div key={f.id} className="float-amt num" style={{ left: f.x, top: f.y }}>{f.label}</div>
          : <div key={f.id} className="flight" style={{ left: f.x, top: f.y, "--dx": `${f.dx}px`, "--dy": `${f.dy}px` }}>
              {Array.from({ length: f.n }).map((_, i) => <span key={i} className={`fchip c${i % 3}`} style={{ animationDelay: `${i * 0.035}s`, marginTop: -i * 3 }} />)}
            </div>)}
      </div>
      {bigWin && (
        <div className="bigwin" aria-live="polite">
          <div className="bigwin-label">Big win</div>
          <div className="bigwin-amt num">+{bigWin.toLocaleString()}</div>
        </div>
      )}
      {shareOpen && lastHandRef.current && <ShareModal hand={lastHandRef.current} onClose={() => setShareOpen(false)} />}
      {showRankingsLocal && <RankingsModal onClose={() => setShowRankingsLocal(false)} suitColor={suitColor} variant={variant} />}
      {showHistory && (
        <Modal title="Hand history" onClose={() => setShowHistory(false)}>
          {history.length === 0 && <div className="empty">No hands played yet this session.</div>}
          <div style={{ maxHeight: "55vh", overflowY: "auto" }}>
            {history.map((h) => (
              <div key={h.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 2px", borderBottom: "1px solid rgba(244,247,252,0.06)" }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", flexShrink: 0, background: h.won ? "var(--t-good)" : "rgba(244,247,252,0.2)" }} />
                <span style={{ fontSize: 12.5, color: h.won ? "var(--t-good)" : "var(--t-text2)" }}>{h.text}</span>
              </div>
            ))}
          </div>
        </Modal>
      )}
      {leaveSheet && tournament && !tournamentOver && (() => {
        const place = players.filter((p) => !p.eliminated).length;
        return (
          <Modal title="Leave the tournament?" onClose={() => setLeaveSheet(false)}>
            <p className="sheet-body">You'd be out in {ordinal(place)} place{tourneyBuyIn > 0 ? ` and ${tourneyPrize(players.length, place, tourneyBuyIn) > 0 ? `cash ${tourneyPrize(players.length, place, tourneyBuyIn).toLocaleString()} chips` : "lose your buy-in"}` : ""}. It still counts toward your tournament index.</p>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn" onClick={() => setLeaveSheet(false)}>Keep playing</button>
              <button className="btn btn-raise" onClick={() => onExit(human.stack, { won: false, placement: place, total: players.length, left: true })}>Leave</button>
            </div>
          </Modal>
        );
      })()}
      {leaveSheet && ranked && !rankedResult && (() => {
        const preview = outcomeFor(human.stack, false);
        return (
          <Modal title="Forfeit this match?" onClose={() => setLeaveSheet(false)}>
            <p className="sheet-body">
              {`The match ends after hand ${RANKED_MATCH_HANDS}. Leaving now counts as a loss, but you keep the ${human.stack.toLocaleString()} chips in front of you.`}
              {!betweenHands ? " Chips you've already put in this pot stay in the pot." : ""}
            </p>
            {preview.placement
              ? <div className="kv"><span>Placement result</span><b style={{ color: preview.won ? "var(--t-good)" : "var(--t-bad)" }}>{preview.won ? "Win" : "Loss"}</b></div>
              : <div className="kv"><span>Rating change</span><b className="num" style={{ color: preview.delta >= 0 ? "var(--t-good)" : "var(--t-bad)" }}>{signed(preview.delta)} RP</b></div>}
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button className="btn" onClick={() => setLeaveSheet(false)}>Keep playing</button>
              <button className="btn btn-raise" onClick={leaveRankedNow}>Forfeit</button>
            </div>
          </Modal>
        );
      })()}
      {ranked && rankedResult && showResults && (
        <RankedResults
          result={rankedResult} rankedState={rankedState} skill={skill} tableLabel={tableSize?.label} canPlayAgain={bankrollAfter >= startStack}
          onLobby={(extra) => onExit(rankedResult.finalStack, null, { ...rankedResult, ...extra })}
          onAgain={(extra) => onExit(rankedResult.finalStack, null, { ...rankedResult, ...extra }, { again: true })}
          onReview={() => setShowResults(false)}
        />
      )}
      {matchmaking && (
        <div className="mm" style={{ opacity: matchmaking === "found" ? 0.98 : 1 }}>
          <div className="mm-inner">
            {matchmaking === "searching" ? <div className="spinner" aria-hidden="true" /> : <TierBadge tier={opponentRating != null && isPlaced(rankedState) ? tierForRating(opponentRating) : UNRANKED} size={46} />}
            <div className="mm-title">{matchmaking === "searching" ? "Finding a table" : "Match found"}</div>
            <div className="mm-sub">{placementNo ? `Placement match ${placementNo} of ${PLACEMENT_MATCHES}` : `Players near ${rankName(rankedState.rating)}`}</div>
          </div>
        </div>
      )}
    </div>
  );
}

// Your hole cards start face down: drag up to peel them back from the bottom, or tap to flip.
// Lift the corner to look, like a real squeeze. Let go and they drop back face down.
// Every lift past halfway counts as a look and shows on your seat.
function PeekCards({ cards, suitColor, omaha, delayFor, open, setOpen, scale = 1 }) {
  const [peel, setPeel] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startY = useRef(null); const shown = useRef(false);
  const down = (e) => { startY.current = e.clientY; shown.current = false; setDragging(true); try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) { /* older browsers */ } };
  const move = (e) => {
    if (startY.current == null) return;
    const v = Math.max(0, Math.min(1, (startY.current - e.clientY) / 80));
    setPeel(v);
    if (v > 0.25 && !shown.current) { shown.current = true; setOpen(true); }
  };
  const up = () => { if (startY.current == null) return; startY.current = null; setDragging(false); setPeel(0); if (shown.current) setOpen(false); };
  const sz = scale !== 1 && !omaha ? { width: 64 * scale, height: 90 * scale, fontSize: 22 * scale } : {};
  return (
    <div className="squeeze" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onContextMenu={(e) => e.preventDefault()} role="button" tabIndex={0} aria-label="Drag up to look at your cards"
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { setPeel(1); setOpen(true); setTimeout(() => { setPeel(0); setOpen(false); }, 1200); } }}>
      {cards.map((c, i) => {
        const clip = `inset(0 0 ${Math.round(peel * 100)}% 0)`;
        return (
          <div key={c.id} className={`card big sq${omaha ? " o4" : ""}`} style={{ animation: `dealToHero .5s cubic-bezier(.2,.85,.25,1) ${delayFor(i)}s backwards`, ...sz }}>
            <div style={{ color: suitColor[c.s] }}>{rankLabel(c.r)}</div><div style={{ color: suitColor[c.s], fontSize: "0.85em" }}>{SUIT_GLYPH[c.s]}</div>
            <div className="sq-cover" style={{ clipPath: clip, WebkitClipPath: clip, transition: dragging ? "none" : "clip-path .28s cubic-bezier(.3,1.3,.5,1), -webkit-clip-path .28s cubic-bezier(.3,1.3,.5,1)" }} />
          </div>
        );
      })}
      {!dragging && <div className="sq-hint">Drag up to look</div>}
    </div>
  );
}
function SqueezeCards({ cards, suitColor, omaha, delayFor, onReveal }) {
  const [peel, setPeel] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startY = useRef(null); const moved = useRef(false); const peelRef = useRef(0);
  const set = (v) => { peelRef.current = v; setPeel(v); };
  const down = (e) => { startY.current = e.clientY; moved.current = false; setDragging(true); try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) { /* older browsers */ } };
  const move = (e) => { if (startY.current == null) return; const d = startY.current - e.clientY; if (Math.abs(d) > 5) moved.current = true; set(Math.max(0, Math.min(1, d / 80))); };
  const up = () => { if (startY.current == null) return; startY.current = null; setDragging(false); if (!moved.current || peelRef.current > 0.42) onReveal(); else set(0); };
  return (
    <div className="squeeze" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} role="button" tabIndex={0} aria-label="Drag up or tap to see your cards" onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onReveal(); }}>
      {cards.map((c, i) => {
        const clip = `inset(0 0 ${Math.round(peel * 100)}% 0)`;
        return (
          <div key={c.id} className={`card big sq${omaha ? " o4" : ""}`} style={{ animation: `dealToHero .5s cubic-bezier(.2,.85,.25,1) ${delayFor(i)}s backwards` }}>
            <div style={{ color: suitColor[c.s] }}>{rankLabel(c.r)}</div><div style={{ color: suitColor[c.s], fontSize: "0.85em" }}>{SUIT_GLYPH[c.s]}</div>
            <div className="sq-cover" style={{ clipPath: clip, WebkitClipPath: clip, transition: dragging ? "none" : "clip-path .2s ease, -webkit-clip-path .2s ease" }} />
          </div>
        );
      })}
      <div className="sq-hint">Drag up to peek</div>
    </div>
  );
}

// Draws a finished hand as a 1080x1350 image for saving or sharing.
function drawShareImage(hand) {
  const W = 1080, H = 1350;
  const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const g = cv.getContext("2d");
  const sans = "-apple-system, 'Inter', 'Helvetica Neue', Arial, sans-serif";
  const bg = g.createRadialGradient(W / 2, -150, 80, W / 2, 380, 1250); bg.addColorStop(0, "#1E427E"); bg.addColorStop(0.62, "#0B1426"); bg.addColorStop(1, "#0B1426");
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  const rr = (x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
  // table
  g.beginPath(); g.ellipse(W / 2, 560, 480, 270, 0, 0, Math.PI * 2); g.fillStyle = "#5A3A20"; g.fill();
  g.beginPath(); g.ellipse(W / 2, 560, 458, 248, 0, 0, Math.PI * 2);
  const fg = g.createRadialGradient(W / 2, 520, 30, W / 2, 560, 470); fg.addColorStop(0, "#22A866"); fg.addColorStop(0.55, "#138048"); fg.addColorStop(1, "#0B5C33"); g.fillStyle = fg; g.fill();
  const drawCard = (id, x, y, w, h, faded) => {
    const suit = id.slice(-1), rank = Number(id.slice(0, -1));
    g.save(); g.globalAlpha = faded ? 0.5 : 1;
    g.shadowColor = "rgba(0,0,0,0.35)"; g.shadowBlur = 18; g.shadowOffsetY = 8;
    rr(x, y, w, h, w * 0.12); g.fillStyle = "#FFFFFF"; g.fill();
    g.shadowColor = "transparent";
    g.fillStyle = suit === "h" || suit === "d" ? "#E5383B" : "#111827"; g.textAlign = "center";
    g.font = `800 ${Math.round(w * 0.42)}px ${sans}`; g.fillText(rankLabel(rank), x + w / 2, y + h * 0.46);
    g.font = `${Math.round(w * 0.4)}px ${sans}`; g.fillText(SUIT_GLYPH[suit], x + w / 2, y + h * 0.86);
    g.restore();
  };
  const row = (ids, y, w, h, gap) => { const total = ids.length * w + (ids.length - 1) * gap; let x = (W - total) / 2; ids.forEach((id) => { drawCard(id, x, y, w, h); x += w + gap; }); };
  if (hand.board.length) row(hand.board, hand.board2 ? 412 : 468, 126, 176, 16);
  if (hand.board2) row(hand.board2, 602, 92, 128, 12);
  // your cards, below the table
  const hw = hand.hero.length > 2 ? 132 : 168, hh = hand.hero.length > 2 ? 184 : 236;
  row(hand.hero, 868, hw, hh, 20);
  // words
  g.textAlign = "left"; g.fillStyle = "#F4F7FC"; g.font = `700 76px Georgia, 'Times New Roman', serif`; g.fillText("felt", 72, 130);
  g.textAlign = "right"; g.fillStyle = "#8FA1BE"; g.font = `500 30px ${sans}`;
  g.fillText(`${VARIANTS[hand.variant] ? VARIANTS[hand.variant].label : "Hold'em"}, ${new Date(hand.at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`, W - 72, 122);
  g.textAlign = "center";
  const fit = (text, size, weight, color, y) => { let s = size; g.font = `${weight} ${s}px ${sans}`; while (g.measureText(text).width > W - 120 && s > 26) { s -= 2; g.font = `${weight} ${s}px ${sans}`; } g.fillStyle = color; g.fillText(text, W / 2, y); };
  fit(hand.headline, 50, 800, hand.won ? "var(--t-good)" : "var(--t-text)", 1186);
  if (hand.headline2) fit(hand.headline2, 38, 700, "var(--t-text2)", 1240);
  else if (hand.heroDesc) fit(`You had ${hand.heroDesc}`, 36, 600, "var(--t-sub)", 1240);
  return cv.toDataURL("image/png");
}
function ShareModal({ hand, onClose }) {
  const [url, setUrl] = useState(null);
  useEffect(() => { try { setUrl(drawShareImage(hand)); } catch (e) { setUrl(""); } }, [hand]);
  const share = async () => {
    try {
      const blob = await (await fetch(url)).blob();
      const file = new File([blob], "felt-hand.png", { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: "felt" }); return; }
    } catch (e) { /* fall through to download */ }
    try { const a = document.createElement("a"); a.href = url; a.download = "felt-hand.png"; document.body.appendChild(a); a.click(); a.remove(); } catch (e) { /* press and hold still works */ }
  };
  return (
    <Modal title="Share this hand" onClose={onClose} width={380}>
      {url ? <img src={url} alt={hand.headline} style={{ width: "100%", borderRadius: 14, display: "block" }} />
        : url === "" ? <div className="empty">Couldn't draw the image on this device.</div>
        : <div className="spinner" style={{ margin: "40px auto" }} />}
      <div style={{ fontSize: 12, color: "var(--t-mut)", textAlign: "center", margin: "10px 0 12px" }}>Press and hold the image to save it, or tap Share.</div>
      <button className="btn btn-raise" style={{ width: "100%" }} disabled={!url} onClick={share}>Share</button>
    </Modal>
  );
}

function ordinal(n) { const s = ["th", "st", "nd", "rd"], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }

function useCountUp(from, to, { delay = 450, duration = 1100 } = {}) {
  const [value, setValue] = useState(from);
  useEffect(() => {
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || from === to) { setValue(to); return; }
    let raf; const start = performance.now() + delay;
    const tick = (now) => {
      const t = Math.max(0, Math.min(1, (now - start) / duration));
      setValue(Math.round(from + (to - from) * (1 - Math.pow(1 - t, 3))));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [from, to, delay, duration]);
  return value;
}
// eases a changing number (like the pot) instead of snapping
function useTween(value, duration = 300) {
  const [shown, setShown] = useState(value);
  const cur = useRef(value);
  useEffect(() => {
    const from = cur.current;
    if (from === value) return;
    let raf; const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const v = Math.round(from + (value - from) * (1 - Math.pow(1 - t, 3)));
      cur.current = v; setShown(v);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return shown;
}

function PlacementDots({ games, size = 12 }) {
  return (
    <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
      {Array.from({ length: PLACEMENT_MATCHES }).map((_, i) => {
        const g = games[i];
        return <div key={i} title={g ? (g.won ? "Win" : "Loss") : "Not played"} style={{ width: size, height: size, borderRadius: "50%", background: g ? (g.won ? "var(--t-good)" : "var(--t-bad)") : "transparent", border: g ? "none" : "1.5px solid rgba(244,247,252,0.22)" }} />;
      })}
    </div>
  );
}

function RankedResults({ result, rankedState, skill, tableLabel, canPlayAgain, onLobby, onAgain, onReview }) {
  const [assess, setAssess] = useState(result.placementFinal ? null : "n/a");
  useEffect(() => {
    if (!result.placementFinal) return;
    // short beat so the reveal lands, then place from the Skill Rating
    const games = [...(rankedState.placementGames || []), { won: result.won }];
    const t = setTimeout(() => setAssess(placementFromSkill(skill, games)), 1800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const headline = result.forfeit ? "Forfeit" : result.won ? "Victory" : "Defeat";
  const sub = result.cleared ? `You cleared the table in ${result.hands} hand${result.hands === 1 ? "" : "s"}.`
    : result.busted ? `Busted on hand ${result.hands}, ${ordinal(result.place || 2)} of ${result.field || 2}.`
    : result.forfeit ? `Left after ${result.hands} hand${result.hands === 1 ? "" : "s"}.`
    : `Finished ${ordinal(result.place || 1)} of ${result.field || 2} in chips after ${result.hands} hands.`;
  const extra = assess && assess !== "n/a" ? { placedRating: assess.rating, report: assess.report } : {};
  const ready = !result.placementFinal || (assess && assess !== "n/a");
  const stats = (
    <div className="results-stats">
      <div><b className="num">{signed(result.net)}</b><span>Chips</span></div>
      <div><b className="num">{result.hands}</b><span>Hands</span></div>
      <div><b className="num">{result.quality == null ? "–" : `${Math.round(result.quality * 100)}%`}</b><span>Good decisions</span></div>
    </div>
  );
  const buttons = (
    <>
      <div style={{ display: "flex", gap: 8, marginTop: 24 }}>
        <button className="btn" disabled={!ready} onClick={() => onLobby(extra)}>Lobby</button>
        {canPlayAgain && <button className="btn btn-raise" disabled={!ready} onClick={() => onAgain(extra)}>{result.placement && !result.placementFinal ? "Next placement" : "Play again"}</button>}
      </div>
      {!canPlayAgain && <div style={{ fontSize: 12, color: "var(--t-mut)", marginTop: 10, textAlign: "center" }}>You need {RANKED_BUYIN.toLocaleString()} chips to queue again.</div>}
      <button className="linkbtn" onClick={onReview}>Look at the table</button>
    </>
  );

  if (result.placementFinal) {
    const games = [...(rankedState.placementGames || []), { won: result.won }];
    if (!ready) {
      return (
        <div className="results" role="dialog" aria-label="Placement">
          <div className="results-inner" style={{ alignItems: "center" }}>
            <div className="spinner" style={{ width: 40, height: 40 }} aria-hidden="true" />
            <div className="results-sub" style={{ marginTop: 18, fontSize: 15, color: "var(--t-text)" }}>Reading your game</div>
            <div className="results-kicker" style={{ marginTop: 6 }}>Scoring your decisions, preflop play, aggression, showdowns and more</div>
          </div>
        </div>
      );
    }
    const tier = tierForRating(assess.rating);
    return (
      <div className="results" role="dialog" aria-label="Placement result">
        <div className="results-inner">
          <div className="results-kicker">Placements complete</div>
          <div style={{ display: "flex", justifyContent: "center", margin: "18px 0 12px" }}><div className="badge-pop"><TierBadge tier={tier} size={110} div={divisionOf(assess.rating)} /></div></div>
          <div className="results-kicker">You placed</div>
          <h1 className="results-head" style={{ color: tier.color, fontSize: 46, marginTop: 4 }}>{rankName(assess.rating)}</h1>
          <div className="results-sub num">{assess.rating.toLocaleString()} RP</div>
          <div style={{ margin: "16px 0 4px" }}><PlacementDots games={games} /></div>
          {assess.sk && (
            <div className="results-tier" style={{ marginTop: 16 }}>
              <SkillDial sr={assess.sk.sr} size={52} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700 }}>Skill Rating {assess.sk.sr} <span style={{ color: "var(--t-mut)", fontWeight: 500 }}>±{assess.sk.margin}</span></div>
                <div style={{ fontSize: 12, color: "var(--t-mid)", marginTop: 2 }}>{assess.sk.label}. Full breakdown in the Coach tab.</div>
              </div>
            </div>
          )}
          <div className="report">
            <div className="report-head"><span>Scouting report</span></div>
            <p>{assess.report}</p>
          </div>
          {stats}
          {buttons}
        </div>
      </div>
    );
  }

  if (result.placement) {
    const games = [...(rankedState.placementGames || []), { won: result.won }];
    return (
      <div className="results" role="dialog" aria-label="Placement match result">
        <div className="results-inner">
          <div className="results-kicker">Placement match {result.placementNumber} of {PLACEMENT_MATCHES}{tableLabel ? `, ${tableLabel}` : ""}</div>
          <h1 className="results-head" style={{ color: result.won ? "var(--t-text)" : "#B9C6DA" }}>{headline}</h1>
          <div className="results-sub">{sub}</div>
          <div style={{ margin: "26px 0 10px" }}><PlacementDots games={games} size={16} /></div>
          <div className="results-sub" style={{ fontSize: 13 }}>{PLACEMENT_MATCHES - games.length} more to go. Your rank comes from how you play, not just whether you win.</div>
          {stats}
          {buttons}
        </div>
      </div>
    );
  }

  return <RatedResults result={result} headline={headline} sub={sub} tableLabel={tableLabel} stats={stats} buttons={buttons} />;
}

function RatedResults({ result, headline, sub, tableLabel, stats, buttons }) {
  const shown = useCountUp(result.before, result.after);
  const tierBefore = tierForRating(result.before), tierAfter = tierForRating(result.after);
  const moved = RANK_TIERS.indexOf(tierAfter) - RANK_TIERS.indexOf(tierBefore);
  const divMoved = rankName(result.after) !== rankName(result.before);
  const tierNow = tierForRating(shown);
  const prog = rankProgress(shown);
  const frameUnlocked = result.newFrames.length > 0 ? RANK_TIERS.find((t) => t.key === result.newFrames[result.newFrames.length - 1]) : null;
  return (
    <div className="results" role="dialog" aria-label="Match results">
      <div className="results-inner">
        <div className="results-kicker">Ranked match{tableLabel ? `, ${tableLabel}` : ""}</div>
        <h1 className="results-head" style={{ color: result.won ? "var(--t-text)" : "#B9C6DA" }}>{headline}</h1>
        <div className="results-sub">{sub}</div>
        <div className="results-delta num" style={{ color: result.delta >= 0 ? "var(--t-good)" : "var(--t-bad)" }}>{signed(result.delta)}<span>RP</span></div>
        <div className="results-tier">
          <TierBadge tier={tierNow} size={50} div={divisionOf(shown)} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ fontWeight: 700, color: tierNow.color }}>{rankName(shown)}</span>
              <span className="num" style={{ fontWeight: 600 }}>{shown.toLocaleString()} RP</span>
            </div>
            <div className="bar" style={{ marginTop: 8 }}><div style={{ width: `${prog.pct * 100}%`, background: tierNow.color }} /></div>
            <div style={{ fontSize: 11.5, color: "var(--t-mut)", marginTop: 6 }}>{prog.nextLabel ? `${prog.toNext} RP to ${prog.nextLabel}` : "Top of the ladder"}</div>
          </div>
        </div>
        {(divMoved || frameUnlocked) && (
          <div className="results-note" style={{ borderColor: result.after < result.before ? "rgba(255,107,107,0.4)" : `${tierAfter.color}88` }}>
            {divMoved && result.after > result.before && <div style={{ fontWeight: 700, color: tierAfter.color }}>{moved > 0 ? "Promoted" : "Moved up"} to {rankName(result.after)}</div>}
            {divMoved && result.after < result.before && <div style={{ fontWeight: 700, color: "var(--t-bad)" }}>Dropped to {rankName(result.after)}</div>}
            {frameUnlocked && <div style={{ color: "var(--t-sub)", marginTop: divMoved ? 2 : 0 }}>{frameUnlocked.label} avatar frame unlocked. Equip it from your profile.</div>}
          </div>
        )}
        <div className="results-lines">
          {result.lines.map((l) => (<div key={l.label}><span>{l.label}</span><b className="num" style={{ color: l.value >= 0 ? "var(--t-good)" : "var(--t-bad)" }}>{signed(l.value)}</b></div>))}
        </div>
        {stats}
        {buttons}
      </div>
    </div>
  );
}

function Confetti() {
  const pieces = useMemo(() => Array.from({ length: 28 }).map((_, i) => ({
    id: i, left: 8 + Math.random() * 84, delay: Math.random() * 0.25, dur: 1.1 + Math.random() * 0.6,
    rot: Math.random() * 540, drift: (Math.random() - 0.5) * 140, color: ["var(--t-accent)", "var(--t-text)", "var(--t-good)", "#6FA8FF"][i % 4], w: 5 + Math.random() * 4,
  })), []);
  return (
    <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, pointerEvents: "none", overflow: "hidden", zIndex: 20 }}>
      {pieces.map((p) => (
        <div key={p.id} style={{ position: "absolute", top: "38%", left: `${p.left}%`, width: p.w, height: p.w * 1.6, borderRadius: 1.5, background: p.color, "--drift": `${p.drift}px`, "--rot": `${p.rot}deg`, animation: `confettiFall ${p.dur}s ease-in ${p.delay}s forwards` }} />
      ))}
    </div>
  );
}

// Win effects from the season pass. Confetti is the default.
function CoinRain() {
  const coins = useMemo(() => Array.from({ length: 26 }).map((_, i) => ({ id: i, left: 4 + Math.random() * 92, delay: Math.random() * 0.45, dur: 1.15 + Math.random() * 0.6, size: 14 + Math.random() * 10, spin: 0.35 + Math.random() * 0.4 })), []);
  return (
    <div className="fx-layer" aria-hidden="true">
      {coins.map((c) => <div key={c.id} className="fx-coin" style={{ left: `${c.left}%`, width: c.size, height: c.size, animation: `coinFall ${c.dur}s cubic-bezier(.35,.1,.7,1) ${c.delay}s forwards`, "--spin": `${c.spin}s` }}><i /></div>)}
    </div>
  );
}
function Fireworks() {
  const bursts = useMemo(() => [0, 1, 2].map((b) => ({ id: b, x: 18 + Math.random() * 64, y: 18 + Math.random() * 30, delay: b * 0.32, hue: ["#F5B83D", "#FF7AB8", "#6FD3FF", "#8CFFB0"][Math.floor(Math.random() * 4)] })), []);
  return (
    <div className="fx-layer" aria-hidden="true">
      {bursts.map((b) => (
        <div key={b.id} className="fx-burst" style={{ left: `${b.x}%`, top: `${b.y}%` }}>
          {Array.from({ length: 16 }).map((_, k) => { const a = (k / 16) * Math.PI * 2; const r = 60 + (k % 3) * 14; return <i key={k} style={{ background: b.hue, boxShadow: `0 0 6px ${b.hue}`, "--dx": `${Math.cos(a) * r}px`, "--dy": `${Math.sin(a) * r}px`, animation: `burstOut 1.1s cubic-bezier(.15,.7,.3,1) ${b.delay}s both` }} />; })}
        </div>
      ))}
    </div>
  );
}
function WinFx({ kind }) { return kind === "coins" ? <CoinRain /> : kind === "fireworks" ? <Fireworks /> : <Confetti />; }

function RankingsModal({ onClose, suitColor = SUIT_COLOR, variant = "holdem" }) {
  return (
    <Modal title="Hand rankings" onClose={onClose} width={400}>
      <div style={{ fontSize: 12, color: "var(--t-mut)", margin: "-6px 2px 8px" }}>Strongest first. Faded cards are kickers and only break ties.</div>
      {variant === "short" && <div className="tip" style={{ color: "var(--t-accent)", borderColor: "rgba(245,184,61,0.35)", background: "rgba(245,184,61,0.08)", marginTop: 4 }}><span>Short Deck changes two things: a flush beats a full house, and three of a kind beats a straight. A-6-7-8-9 is the lowest straight.</span></div>}
      {variant === "omaha" && <div className="tip" style={{ color: "var(--t-accent)", borderColor: "rgba(245,184,61,0.35)", background: "rgba(245,184,61,0.08)", marginTop: 4 }}><span>Omaha: your hand must use exactly 2 of your 4 cards plus 3 from the board.</span></div>}
      <div style={{ maxHeight: "62vh", overflowY: "auto", margin: "0 -4px" }}>
        {RANKING_REFERENCE.map((r, i) => (
          <div key={r.name} className="rank-row">
            <div className="rank-num num">{i + 1}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>{r.name}</div>
              <div style={{ fontSize: 11.5, color: "var(--t-mut)", marginTop: 1 }}>{r.desc}</div>
            </div>
            <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
              {r.cards.map((c, j) => <MiniCard key={c} code={c} suitColor={suitColor} dim={j >= r.uses} />)}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}

/* =========================================================================
   HOME TAB
   ========================================================================= */
function SizePicker({ value, onChange }) {
  return (
    <div className="seg" role="radiogroup" aria-label="Table size">
      {TABLE_SIZES.map((ts) => (
        <button key={ts.key} role="radio" aria-checked={value.key === ts.key} className={`segbtn${value.key === ts.key ? " on" : ""}`} onClick={() => onChange(ts)}>{ts.label}</button>
      ))}
    </div>
  );
}

// Every rank from the top down, where you are on it, how RP works, and prestige.
function RankLadderModal({ ranked, legendNo, onClose }) {
  const placed = isPlaced(ranked);
  const rating = placed ? Math.round(ranked.rating) : null;
  const myTier = tierOf(ranked);
  const prog = placed ? rankProgress(ranked.rating) : null;
  const meRef = useRef(null);
  useEffect(() => { if (meRef.current && meRef.current.scrollIntoView) meRef.current.scrollIntoView({ block: "center" }); }, []);
  const pres = ranked.prestige || 0;
  const tiers = RANK_TIERS.slice().reverse();
  return (
    <Modal title="Ranks" onClose={onClose} width={420}>
      <div className="ladder-me" style={{ borderColor: `${myTier.color}66`, background: `linear-gradient(135deg, ${myTier.color}22, rgba(22,38,68,0.9))` }}>
        <TierBadge tier={myTier} size={52} div={placed ? divisionOf(ranked.rating) : null} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: DISPLAY_FONT, fontSize: 20, fontWeight: 600, color: myTier.color }}>{placed ? legendLabel(ranked, legendNo) || rankName(ranked.rating) : "Unranked"}<PrestigeBadge n={ranked.prestige} size={18} /></div>
          <div className="num" style={{ fontSize: 12, color: "var(--t-sub)", marginTop: 2 }}>{placed ? `${rating.toLocaleString()} RP${prog.nextLabel ? `, ${prog.toNext} to ${prog.nextLabel}` : ""}` : `${(ranked.placementGames || []).length} of ${PLACEMENT_MATCHES} placement matches played`}</div>
          {placed && <div className="bar" style={{ marginTop: 8, height: 6 }}><div style={{ width: `${prog.pct * 100}%`, background: myTier.color }} /></div>}
        </div>
      </div>

      <div className="ladder-list">
        {tiers.map((t) => {
          const isChamp = t.key === "champion";
          const divs = isChamp ? [{ label: "Champion", min: t.min }] : [3, 2, 1].map((d) => ({ label: `${t.label} ${ROMAN[d]}`, min: t.min + (d - 1) * DIV_SIZE }));
          const owned = (ranked.frames || []).includes(t.key);
          return (
            <div key={t.key} className="ladder-tier" style={{ borderColor: `${t.color}40` }}>
              <div className="ladder-tier-head">
                <TierBadge tier={t} size={38} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: t.color }}>{t.label}</div>
                  <div style={{ fontSize: 11, color: "var(--t-mut)" }}>{isChamp ? "1,500 RP and up, ranked by Legend number" : `${t.min.toLocaleString()} to ${(t.min + 299).toLocaleString()} RP`}{t.min > 0 ? (owned ? ", frame unlocked" : ", unlocks a frame") : ""}</div>
                </div>
              </div>
              <div className="ladder-divs">
                {divs.map((dv) => {
                  const here = placed && rankName(ranked.rating) === dv.label;
                  const passed = placed && rating >= dv.min && !here;
                  return (
                    <div key={dv.label} ref={here ? meRef : null} className={`ladder-div${here ? " here" : ""}${passed ? " passed" : ""}`} style={here ? { borderColor: t.color, background: `${t.color}1F` } : undefined}>
                      <span style={{ fontWeight: here ? 700 : 500, display: "flex", alignItems: "center", gap: 8 }}><TierBadge tier={t} size={24} div={isChamp ? null : [3, 2, 1][divs.indexOf(dv)]} />{dv.label}</span>
                      <span className="num" style={{ color: "var(--t-mut)" }}>{here ? <b style={{ color: t.color }}>You</b> : passed ? <Icon name="check" size={13} stroke={2.4} style={{ color: "var(--t-good)" }} /> : `${dv.min.toLocaleString()} RP`}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="ladder-section">
        <div className="ladder-h">How RP works</div>
        <div className="ladder-p">Each ranked match is {RANKED_MATCH_HANDS} hands. Where you finish in chips decides most of it: first place is the big gain, last place the big loss. Clearing the table, knockouts, smart decisions and win streaks add more. Leaving early costs 30 RP.</div>
        <div className="ladder-p">Each tier has three divisions of {DIV_SIZE} RP. Higher ranks match you against tougher players. Champion has no divisions. Instead you get a Legend number, your spot among every real player at Champion.</div>
      </div>

      <div className="ladder-section prestige-box">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <PrestigeBadge n={Math.max(1, pres)} size={34} />
          <div style={{ flex: 1 }}>
            <div className="ladder-h" style={{ margin: 0 }}>Seasons and prestige</div>
            <div style={{ fontSize: 11.5, color: "#C9B8F5" }}>{pres ? `Prestige ${pres}` : "No prestige yet"} · season ends in {daysLeftInSeason()} days</div>
          </div>
        </div>
        <div className="ladder-p" style={{ marginTop: 8 }}>Every month is a season. Finish it at Champion and you earn a prestige plus {PRESTIGE_REWARD.toLocaleString()} chips. When a new season starts, everyone's RP comes partway back toward Gold, so you climb again, but nobody drops to Bronze.</div>
        <div className="perk-list">
          {PRESTIGE_PERKS.map((pk) => {
            const got = pres >= pk.n;
            return (
              <div key={pk.n} className={`perk${got ? " got" : ""}`}>
                <PrestigeBadge n={pk.n} size={22} />
                <span style={{ flex: 1 }}>{pk.label}</span>
                {got ? <Icon name="check" size={14} stroke={2.6} style={{ color: "var(--t-good)" }} /> : <span className="num" style={{ fontSize: 11, color: "var(--t-faint)" }}>Prestige {pk.n}</span>}
              </div>
            );
          })}
        </div>
        {(ranked.history || []).length > 0 && (<>
          <div className="ladder-h" style={{ marginTop: 12 }}>Past seasons</div>
          {(ranked.history || []).slice().reverse().map((h) => { const t = RANK_TIERS.find((x) => x.key === h.tier) || RANK_TIERS[0]; const [yy, mm] = String(h.seasonId).split("-"); const name = new Date(+yy, +mm - 1, 1).toLocaleString("en-US", { month: "short", year: "numeric" }); return (
            <div key={h.seasonId} className="perk"><TierBadge tier={t} size={22} /><span style={{ flex: 1 }}>{name}</span><span style={{ fontSize: 12, fontWeight: 600, color: t.color }}>{t.label}{(ranked.seasonWins || []).includes(h.seasonId) ? " · Prestige" : ""}</span></div>
          ); })}
        </>)}
      </div>
    </Modal>
  );
}

// At Champion the tiers run out, so you get a Legend number: your spot among every real Champion
const legendLabel = (ranked, legendNo) => (isPlaced(ranked) && ranked.rating >= 1500 ? (legendNo ? `Legend #${legendNo}` : "Champion") : null);
function RankedCard({ ranked, legendNo, chips, onPlay, onInfo }) {
  const placed = isPlaced(ranked);
  const tier = tierOf(ranked);
  const prog = placed ? rankProgress(ranked.rating) : null;
  const games = ranked.placementGames || [];
  const locked = chips < RANKED_BUYIN;
  const month = new Date().toLocaleString("en-US", { month: "long" });
  return (
    <section className="panel" style={{ background: `linear-gradient(160deg, ${tier.color}2E 0%, #14223D 58%)`, borderColor: `${tier.color}55` }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--t-mut)" }}>
        <button className="ranked-info" onClick={onInfo} aria-label="See all ranks"><span style={{ fontWeight: 600, color: "var(--t-sub)" }}>Ranked</span><Icon name="help" size={14} stroke={2} /></button>
        <span>{month} season ends in {daysLeftInSeason()} days</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14, margin: "16px 0 14px" }}>
        <button className="ranked-badge-btn" onClick={onInfo} aria-label="See all ranks"><TierBadge tier={tier} size={58} div={placed ? divisionOf(ranked.rating) : null} /></button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: DISPLAY_FONT, fontSize: 25, fontWeight: 600, color: tier.color, lineHeight: 1.05, display: "flex", alignItems: "center", gap: 8 }}>{placed ? legendLabel(ranked, legendNo) || rankName(ranked.rating) : "Unranked"}<PrestigeBadge n={ranked.prestige} size={20} /></div>
          <div className="num" style={{ fontSize: 13, color: "var(--t-sub)", marginTop: 4 }}>{placed ? `${Math.round(ranked.rating).toLocaleString()} RP${legendNo && ranked.rating >= 1500 ? " · Champion" : ""}` : `${games.length} of ${PLACEMENT_MATCHES} placement matches`}</div>
        </div>
        {placed && ranked.wins + ranked.losses > 0 && (
          <div style={{ textAlign: "right" }}>
            <div className="num" style={{ fontSize: 15, fontWeight: 600 }}>{ranked.wins}<span style={{ color: "var(--t-faint)" }}> W</span> {ranked.losses}<span style={{ color: "var(--t-faint)" }}> L</span></div>
            {ranked.streak >= 2 && <div style={{ fontSize: 11.5, color: "var(--t-good)", marginTop: 2 }}>{ranked.streak} in a row</div>}
          </div>
        )}
      </div>
      {placed ? (
        <>
          <div className="bar"><div style={{ width: `${prog.pct * 100}%`, background: tier.color }} /></div>
          <div style={{ fontSize: 12, color: "var(--t-mut)", marginTop: 7 }}>{prog.nextLabel ? `${prog.toNext} RP to ${prog.nextLabel}` : legendNo ? "Finish the month here to earn a prestige" : "Finish the month at Champion to earn a prestige"}</div>
        </>
      ) : (
        <>
          <PlacementDots games={games} size={14} />
          <div style={{ fontSize: 12, color: "var(--t-mut)", marginTop: 10, textAlign: "center" }}>Play {PLACEMENT_MATCHES} matches and we'll read your game to set your rank.</div>
        </>
      )}
      <button className="btn btn-raise shine" style={{ width: "100%", marginTop: 18 }} disabled={locked} onClick={onPlay}>
        {locked ? `You need ${RANKED_BUYIN.toLocaleString()} chips to buy in` : placed ? "Play ranked" : `Play placement match ${games.length + 1}`}
      </button>
    </section>
  );
}

const idToCode = (id) => { const s = id.slice(-1), r = +id.slice(0, -1); return `${({ 14: "A", 13: "K", 12: "Q", 11: "J" })[r] || r}${s}`; };
function hoursLeftToday() { const d = new Date(); return 24 - d.getHours(); }

function VariantPicker({ value, onChange }) {
  return (
    <div className="var-grid" role="radiogroup" aria-label="Game">
      {Object.values(VARIANTS).map((v) => (
        <button key={v.key} role="radio" aria-checked={value === v.key} className={`var-tile v-${v.key}${value === v.key ? " on" : ""}`} onClick={() => onChange(v.key)}>
          <div className="var-name">{v.label}</div>
          <div className="var-sub">{v.sub}</div>
        </button>
      ))}
    </div>
  );
}
function TurboRow({ on, onToggle, tournament }) {
  return (
    <div className="turbo-row">
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div className="turbo-ic"><Icon name="bolt" size={15} stroke={2} /></div>
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 600 }}>Turbo</div>
          <div style={{ fontSize: 11.5, color: "var(--t-mut)" }}>{tournament ? "12 second clock, blinds up every 3 hands" : "12 second clock, faster bots"}</div>
        </div>
      </div>
      <Toggle on={on} onClick={onToggle} label="Turbo" />
    </div>
  );
}

function StreakBanner({ streak, onClaim }) {
  const st = streakState(streak);
  if (st.claimedToday) return null;
  const amount = STREAK_REWARDS[st.nextDay - 1];
  return (
    <section className="streak-banner">
      <div className="streak-flame"><Icon name="flame" size={22} stroke={2} /></div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14.5, fontWeight: 700 }}>Day {st.nextDay} reward is ready</div>
        <div style={{ fontSize: 12, color: "#FFD9B0", marginTop: 1 }}>{st.nextDay === 1 && streak && streak.count > 0 ? "Streak reset. Come back daily to grow it." : st.nextDay === 7 ? "Biggest reward of the week" : `Tomorrow pays ${STREAK_REWARDS[st.nextDay].toLocaleString()}`}</div>
      </div>
      <button className="btn btn-raise btn-sm shine" onClick={onClaim}>+{amount.toLocaleString()}</button>
    </section>
  );
}

function ChallengesCard({ challenges, onClaim }) {
  const [which, setWhich] = useState("daily");
  const ch = ensureChallenges(challenges);
  const list = ch[which] || [];
  const ready = [...ch.daily, ...ch.weekly].filter((c) => c.progress >= c.target && !c.claimed).length;
  const rw = CHALLENGE_REWARD[which];
  return (
    <section className="panel chal-panel">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div className="sec-ic" style={{ background: "rgba(52,211,153,0.16)", color: "var(--t-good)" }}><Icon name="star" size={15} stroke={2} /></div>
          <div style={{ fontSize: 15, fontWeight: 700 }}>Challenges</div>
          {ready > 0 && <span className="badge-dot num">{ready}</span>}
        </div>
        <SegToggle options={[{ v: "daily", l: "Daily" }, { v: "weekly", l: "Weekly" }]} value={which} onChange={setWhich} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {list.map((c) => {
          const done = c.progress >= c.target;
          return (
            <div key={c.id} className={`chal${c.claimed ? " claimed" : ""}`}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 6 }}>{challengeText(c)}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div className="bar" style={{ flex: 1, height: 6 }}><div style={{ width: `${(c.progress / c.target) * 100}%`, background: done ? "var(--t-good)" : "linear-gradient(90deg,#6FA8FF,#8B5CF6)" }} /></div>
                  <span className="num" style={{ fontSize: 11.5, color: "var(--t-mid)", minWidth: 34, textAlign: "right" }}>{c.progress}/{c.target}</span>
                </div>
              </div>
              {c.claimed ? <div className="chal-done"><Icon name="check" size={15} stroke={2.4} /></div>
                : <button className={`btn btn-sm ${done ? "btn-go shine" : ""}`} disabled={!done} style={{ padding: "7px 11px", fontSize: 12 }} onClick={() => onClaim(which, c.id)}>{done ? "Claim" : `+${rw.chips}`}</button>}
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: 11.5, color: "var(--t-faint)", marginTop: 12 }}>
        {which === "daily" ? `New ones in ${hoursLeftToday()}h. Each pays ${rw.chips} chips and ${rw.xp} XP.` : `Resets in ${weekResetDays()} day${weekResetDays() === 1 ? "" : "s"}. Each pays ${rw.chips.toLocaleString()} chips and ${rw.xp} XP.`}
      </div>
    </section>
  );
}

// The art for one pass reward, at any size
function PassArt({ r, size = 54 }) {
  if (r.type === "back") return <BackSwatch b={findBack(r.key)} w={size * 0.66} />;
  if (r.type === "felt") { const f = findFelt(r.key); return <div style={{ transform: `scale(${size / 64})` }}><FeltSwatch f={f} /></div>; }
  if (r.type === "chipset") return <div style={{ transform: `scale(${size / 36})` }}><ChipStack amount={31525} set={r.key} /></div>;
  if (r.type === "fx") return <div style={{ transform: `scale(${size / 50})` }}><FxSwatch f={WIN_FX.find((x) => x.key === r.key)} /></div>;
  if (r.type === "avatar") return <div className="pa-av" style={{ width: size * 0.9, height: size * 0.9, fontSize: size * 0.52 }}>{r.key}</div>;
  if (r.type === "emote") return <div className="pa-emote" style={{ fontSize: r.key.length > 3 ? size * 0.2 : size * 0.42 }}>{r.key}</div>;
  if (r.type === "title") return <div className="pa-title"><TitleTag k={r.key} size={Math.max(9, size * 0.2)} style={{ whiteSpace: "normal", lineHeight: 1.15, display: "inline-block" }} /></div>;
  return <div className="pa-chips" style={{ width: size * 0.8, height: size * 0.8 }}><Icon name="chips" size={size * 0.42} stroke={2} /><b className="num" style={{ fontSize: size * 0.19 }}>{shortNum(r.amount)}</b></div>;
}
function PassRewardIcon({ r, size = 34 }) { return <div className="pr-ic" style={{ width: size, height: size }}><PassArt r={r} size={size} /></div>; }

function PassCard({ pass, onOpen }) {
  const p = ensurePass(pass);
  const lvl = passLevel(p.xp);
  const into = p.xp - lvl * PASS_XP;
  const maxed = lvl >= PASS_LEVELS;
  const month = new Date().toLocaleString("en-US", { month: "long" });
  const stripRef = useRef(null);
  useEffect(() => { const el = stripRef.current; if (el) el.scrollLeft = 0; }, []);
  const upcoming = Array.from({ length: Math.min(8, PASS_LEVELS - lvl) }, (_, i) => lvl + 1 + i);
  return (
    <section className="pass-card">
      <button className="pass-head" onClick={() => onOpen(lvl + 1)}>
        <div className="pass-lvl num"><div style={{ fontSize: 10, fontWeight: 700, opacity: 0.8, letterSpacing: "0.06em" }}>LVL</div>{lvl}</div>
        <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>{month} season pass</div>
          <div className="num" style={{ fontSize: 12, color: "#D6C7FF", marginTop: 2 }}>{maxed ? "Maxed out. Nice." : `${into} / ${PASS_XP} XP · ends in ${daysLeftInSeason()} days`}</div>
        </div>
        <Icon name="chevron" size={16} style={{ color: "#D6C7FF" }} />
      </button>
      <div className="bar" style={{ marginTop: 12, height: 8, background: "rgba(255,255,255,0.14)" }}><div style={{ width: `${maxed ? 100 : (into / PASS_XP) * 100}%`, background: "linear-gradient(90deg,#F5B83D,#FF7AB8)" }} /></div>
      {!maxed && (
        <div className="pass-strip" ref={stripRef}>
          {upcoming.map((l, i) => { const r = passReward(l); return (
            <button key={l} className={`pass-mini r-${r.rarity}${i === 0 ? " next" : ""}`} onClick={() => onOpen(l)} aria-label={`Level ${l}: ${passRewardLabel(r)}`}>
              <div className="pm-art"><PassArt r={r} size={38} /></div>
              <div className="pm-l num">{l}</div>
            </button>
          ); })}
        </div>
      )}
    </section>
  );
}

function PassModal({ pass, data, focus, onClose, onEquip }) {
  const p = ensurePass(pass);
  const lvl = passLevel(p.xp);
  const into = p.xp - lvl * PASS_XP;
  const [sel, setSel] = useState(Math.max(1, Math.min(PASS_LEVELS, focus || lvl + 1)));
  const trackRef = useRef(null);
  useEffect(() => {
    const el = trackRef.current && trackRef.current.querySelector(`[data-l="${sel}"]`);
    if (el && trackRef.current) trackRef.current.scrollLeft = el.offsetLeft - trackRef.current.clientWidth / 2 + el.clientWidth / 2;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const r = passReward(sel); const got = sel <= lvl;
  const cos = { ...defaultCosmetics(), ...(data.cosmetics || {}) };
  const equipped = r.type === "back" ? cos.cardBack === r.key : r.type === "felt" ? cos.felt === r.key : r.type === "chipset" ? cos.chipset === r.key : r.type === "fx" ? cos.fx === r.key : r.type === "title" ? (data.titles || defaultTitles()).equipped === r.key : r.type === "avatar" ? data.avatar === r.key && !data.usePhoto : false;
  const canEquip = got && ["back", "felt", "chipset", "fx", "title", "avatar"].includes(r.type);
  const month = new Date().toLocaleString("en-US", { month: "long" });
  return (
    <Modal title="" onClose={onClose} width={440} className="pass-sheet">
      <div className="ps-head">
        <div className="pass-lvl num" style={{ width: 48, height: 48 }}><div style={{ fontSize: 9.5, fontWeight: 700, opacity: 0.8 }}>LVL</div>{lvl}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 800 }}>{month} season pass</div>
          <div className="num" style={{ fontSize: 12, color: "#D6C7FF" }}>{lvl >= PASS_LEVELS ? "Maxed out" : `${into} / ${PASS_XP} XP to level ${lvl + 1}`} · {daysLeftInSeason()} days left</div>
        </div>
        <button className="iconbtn" onClick={onClose} aria-label="Close"><Icon name="close" size={14} /></button>
      </div>

      <div className={`ps-preview r-${r.rarity}`}>
        <div className="ps-art"><PassArt r={r} size={96} /></div>
        <div className="ps-meta">
          <div className="ps-rarity" style={{ color: RARITY[r.rarity] }}>{r.rarity} · {passTypeLabel(r)}</div>
          <div className="ps-name">{r.type === "chips" ? `${r.amount.toLocaleString()} chips` : passRewardLabel(r).replace(/ (felt|card back|title|emote|chips|win effect|avatar)$/, "").replace(/"/g, "")}</div>
          <div className="ps-sub">{r.type === "emote" ? "Send it at friends tables." : r.type === "fx" ? "Plays when you win a big pot." : r.type === "chipset" ? "Every chip you bet, in this set." : r.type === "title" ? "Shows under your name." : r.type === "chips" ? "Straight to your bankroll." : "Only from the season pass."}</div>
          {got ? (canEquip ? <button className={`btn btn-sm${equipped ? "" : " btn-raise"}`} disabled={equipped} onClick={() => onEquip(r)}>{equipped ? "Equipped" : "Equip"}</button> : <span className="ps-got"><Icon name="check" size={13} stroke={2.6} /> Unlocked</span>)
            : <span className="ps-lock num"><Icon name="lock" size={12} stroke={2.2} /> Level {sel} · {((sel * PASS_XP) - p.xp).toLocaleString()} XP to go</span>}
        </div>
      </div>

      <div className="ps-track" ref={trackRef}>
        <div className="ps-line"><div style={{ width: `${Math.min(100, ((lvl + (lvl < PASS_LEVELS ? into / PASS_XP : 0)) / PASS_LEVELS) * 100)}%` }} /></div>
        {Array.from({ length: PASS_LEVELS }, (_, i) => i + 1).map((l) => {
          const rr = passReward(l); const g = l <= lvl;
          return (
            <button key={l} data-l={l} className={`ps-tile r-${rr.rarity}${g ? " got" : ""}${l === lvl + 1 ? " next" : ""}${l === sel ? " sel" : ""}`} onClick={() => setSel(l)} aria-label={`Level ${l}: ${passRewardLabel(rr)}`}>
              <div className="ps-node num">{g ? <Icon name="check" size={11} stroke={3} /> : l}</div>
              <div className="ps-tile-art"><PassArt r={rr} size={46} /></div>
              <div className="ps-tile-name">{rr.type === "chips" ? shortNum(rr.amount) : passTypeLabel(rr)}</div>
            </button>
          );
        })}
      </div>
      <div style={{ fontSize: 11.5, color: "var(--t-mut)", marginTop: 10, textAlign: "center" }}>Swipe for every level. XP comes from hands, ranked matches, tournaments and challenges.</div>
    </Modal>
  );
}

function SpinCard({ ready, onOpen }) {
  return (
    <button className={`spin-card${ready ? " ready" : ""}`} onClick={onOpen}>
      <div className="spin-ic"><Icon name="wheel" size={20} stroke={2} /></div>
      <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>{ready ? "Daily spin is ready" : "Daily spin"}</div>
        <div style={{ fontSize: 11.5, color: ready ? "#CFE6FF" : "var(--t-mut)", marginTop: 1 }}>{ready ? "Chips, XP, or a 5,000 chip jackpot" : `Next spin in ${hoursUntilTomorrow()}h`}</div>
      </div>
      {ready ? <span className="btn btn-raise btn-sm shine" style={{ pointerEvents: "none" }}>Spin</span> : <Icon name="lock" size={14} style={{ color: "var(--t-faint)" }} />}
    </button>
  );
}

function SpinModal({ ready, onSpin, onClose, sound }) {
  const [rot, setRot] = useState(0);
  const [result, setResult] = useState(null);
  const [spinning, setSpinning] = useState(false);
  const timers = useRef([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const SEG = 360 / SPIN_PRIZES.length;
  const T = 4.6;
  const go = () => {
    if (!ready || spinning || result) return;
    const out = onSpin();
    if (!out) return;
    const jitter = (Math.random() * 2 - 1) * (SEG / 2 - 6);
    const target = 360 * 6 + (360 - (out.index * SEG + SEG / 2)) + jitter;
    setSpinning(true); setRot(target);
    // a tick each time a slice edge passes the pointer, slowing down with the wheel
    const n = Math.floor(target / SEG);
    for (let k = 1; k <= n; k++) { const t = T * (1 - Math.cbrt(1 - (k * SEG) / target)); if (t < T - 0.05) timers.current.push(setTimeout(() => sound && sound.tick(), t * 1000)); }
    timers.current.push(setTimeout(() => { setSpinning(false); setResult(out); if (sound) out.big ? sound.rankUp() : sound.coin(); }, T * 1000 + 150));
  };
  const r = 120, cx = 130, cy = 130;
  const pt = (deg, rad) => { const a = ((deg - 90) * Math.PI) / 180; return [cx + rad * Math.cos(a), cy + rad * Math.sin(a)]; };
  return (
    <Modal title="Daily spin" onClose={spinning ? () => {} : onClose} width={360}>
      <div className="wheel-wrap">
        <div className="wheel-pointer" aria-hidden="true" />
        <svg viewBox="0 0 260 260" className="wheel" style={{ transform: `rotate(${rot}deg)`, transition: spinning ? `transform ${T}s cubic-bezier(.33,1,.68,1)` : "none" }} role="img" aria-label="Prize wheel">
          {SPIN_PRIZES.map((p, i) => {
            const [x1, y1] = pt(i * SEG, r), [x2, y2] = pt((i + 1) * SEG, r);
            const [lx, ly] = pt(i * SEG + SEG / 2, r * 0.66);
            const [sx, sy] = pt(i * SEG + SEG / 2, r * 0.44);
            return (
              <g key={i}>
                <path d={`M${cx} ${cy} L${x1} ${y1} A${r} ${r} 0 0 1 ${x2} ${y2} Z`} fill={p.color} stroke="#0B1426" strokeWidth="2" />
                <g transform={`rotate(${i * SEG + SEG / 2} ${lx} ${ly})`}><text x={lx} y={ly + 6} textAnchor="middle" fontSize="19" fontWeight="800" fill="#FFFFFF" fontFamily="Inter, -apple-system, sans-serif">{p.label}</text></g>
                <g transform={`rotate(${i * SEG + SEG / 2} ${sx} ${sy})`}><text x={sx} y={sy + 4} textAnchor="middle" fontSize="9.5" fontWeight="700" fill="rgba(255,255,255,0.8)" fontFamily="Inter, -apple-system, sans-serif">{p.sub.toUpperCase()}</text></g>
              </g>
            );
          })}
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#F5C451" strokeWidth="5" />
          {SPIN_PRIZES.map((_, i) => { const [x, y] = pt(i * SEG, r - 1); return <circle key={i} cx={x} cy={y} r="3.5" fill="#FFF3C4" />; })}
          <circle cx={cx} cy={cy} r="20" fill="#0B1426" stroke="#F5C451" strokeWidth="3" />
          <text x={cx} y={cy + 6} textAnchor="middle" fontSize="17" fill="#F5C451">{"♠"}</text>
        </svg>
      </div>
      {result ? (
        <div className="spin-result">
          <div style={{ fontSize: 12, color: "var(--t-mid)" }}>{result.big ? "Jackpot" : "You won"}</div>
          <div style={{ fontFamily: DISPLAY_FONT, fontSize: 26, fontWeight: 700, color: "#F5C451" }}>{result.text}</div>
          <button className="btn btn-raise" style={{ width: "100%", marginTop: 12 }} onClick={onClose}>Nice</button>
        </div>
      ) : (
        <button className="btn btn-raise shine" style={{ width: "100%", marginTop: 14 }} disabled={!ready || spinning} onClick={go}>{spinning ? "Spinning..." : ready ? "Spin" : `Come back in ${hoursUntilTomorrow()}h`}</button>
      )}
    </Modal>
  );
}

function VipCard({ chips, onOpen }) {
  const unlocked = chips >= HIGH_ROLLER_MIN;
  return (
    <button className={`vip-card${unlocked ? " open" : ""}`} onClick={onOpen}>
      <div className="vc-top">
        <span className="vc-kicker">felt · Private Room</span>
        <span className="vc-crest"><Icon name={unlocked ? "crown" : "lock"} size={15} stroke={1.8} /></span>
      </div>
      <div className="vc-title">The High Roller Room</div>
      {unlocked ? (
        <div className="vc-foot"><span className="num">Blinds from 250 / 500</span><span className="vc-enter"><span className="vc-enter-t">Enter</span><Icon name="chevron" size={12} stroke={2.2} /></span></div>
      ) : (
        <>
          <div className="vc-foot"><span className="num">Opens at {HIGH_ROLLER_MIN.toLocaleString()} chips</span><span className="num">{Math.floor(Math.min(100, (chips / HIGH_ROLLER_MIN) * 100))}%</span></div>
          <div className="vc-bar"><div style={{ width: `${Math.min(100, (chips / HIGH_ROLLER_MIN) * 100)}%` }} /></div>
        </>
      )}
    </button>
  );
}

function HomeMenu({ onPlayAI, onFriendsTable, onEquipPass, topCards, data, chips, ranked, legendNo, onClaimDaily, onClaimChallenge, onSpin, onPrestige, sound }) {
  const [modal, setModal] = useState(null); // "ranked" | "cash" | "tournament" | "pass"
  const [passFocus, setPassFocus] = useState(null);
  const [size, setSize] = useState(TABLE_SIZES[1]);
  const [tBuyIn, setTBuyIn] = useState(TOURNEY_BUYINS[0]);
  const [turbo, setTurbo] = useState(false);
  const placed = isPlaced(ranked);
  const close = () => setModal(null);
  const st = streakState(data.streak);
  const streakCount = st.claimedToday ? data.streak.count : st.nextDay > 1 ? st.nextDay - 1 : 0;
  const modes = [
    { key: "cash", title: "Cash", sub: "Rebuy anytime", icon: "chips", rank: "K", suit: "d", act: () => setModal("cash") },
    { key: "tournament", title: "Tournament", sub: "Real payouts", icon: "trophy", rank: "A", suit: "s", act: () => setModal("tournament") },
    { key: "practice", title: "Practice", sub: "Tips as you play", icon: "cap", rank: "Q", suit: "h", act: () => onPlayAI({ mode: "practice", tableSize: TABLE_SIZES[1], stakes: { sb: 10, bb: 20 } }) },
  ];
  return (
    <div className="screen screen-fade">
      <header className="home-head">
        <div className="wordmark">felt</div>
        <div style={{ display: "flex", gap: 6 }}>
          {streakCount > 0 && <div className="chip-pill num streak-pill" title="Login streak"><Icon name="flame" size={13} stroke={2.2} />{streakCount}</div>}
          <div className="chip-pill num"><span className="chip-dot" />{chips.toLocaleString()}</div>
        </div>
      </header>

      {topCards}
      <StreakBanner streak={data.streak} onClaim={onClaimDaily} />
      <div style={{ marginBottom: 14 }}><SpinCard ready={spinReady(data)} onOpen={() => setModal("spin")} /></div>

      <div style={{ marginBottom: 14 }}><RankedCard ranked={ranked} legendNo={legendNo} chips={chips} onPlay={() => setModal("ranked")} onInfo={() => setModal("ladder")} /></div>

      <div className="mode-grid">
        {modes.map((o) => (
          <button key={o.key} className={`mode-tile m-${o.key} suit-${o.suit}`} onClick={o.act}>
            <span className="pc-index" aria-hidden="true"><b>{o.rank}</b><i>{SUIT_GLYPH[o.suit]}</i></span>
            <span className="pc-pip" aria-hidden="true">{SUIT_GLYPH[o.suit]}</span>
            <div className="mode-ic"><Icon name={o.icon} size={20} stroke={2} /></div>
            <div className="mode-title">{o.title}</div>
            <div className="mode-sub">{o.sub}</div>
            <span className="pc-index flip" aria-hidden="true"><b>{o.rank}</b><i>{SUIT_GLYPH[o.suit]}</i></span>
          </button>
        ))}
      </div>

      {cloudEnabled() && onFriendsTable && <div style={{ marginBottom: 14 }}><FriendsTableCard onOpen={onFriendsTable} /></div>}
      <div style={{ marginBottom: 14 }}><VipCard chips={chips} onOpen={() => setModal("vip")} /></div>
      <div style={{ marginBottom: 14 }}><PassCard pass={data.pass} onOpen={(l) => { setPassFocus(l); setModal("pass"); }} /></div>
      <ChallengesCard challenges={data.challenges} onClaim={onClaimChallenge} />

      {modal === "pass" && <PassModal pass={data.pass} data={data} focus={passFocus} onClose={close} onEquip={onEquipPass} />}
      {modal === "spin" && <SpinModal ready={spinReady(data)} onSpin={onSpin} onClose={close} sound={sound} />}
      {modal === "ladder" && <RankLadderModal ranked={ranked} legendNo={legendNo} onClose={close} />}
      {modal === "vip" && (
        <Modal onClose={close} width={380} className="vip-sheet">
          <div className="vs-head">
            <button className="iconbtn vs-close" onClick={close} aria-label="Close"><Icon name="close" size={14} /></button>
            <div className="vs-crest"><Icon name="crown" size={20} stroke={1.6} /></div>
            <div className="vs-kicker">felt private room</div>
            <div className="vs-title">The High Roller Room</div>
            <p className="vs-body">{chips >= HIGH_ROLLER_MIN ? "Sharp players, big blinds, no hand odds. You read the table yourself. Your whole bankroll sits down with you." : `Members only. Get to ${HIGH_ROLLER_MIN.toLocaleString()} chips to get in. You have ${chips.toLocaleString()}.`}</p>
          </div>
          <SizePicker value={size} onChange={setSize} />
          <div className="list" style={{ marginTop: 12 }}>
            {HIGH_ROLLER_TABLES.map((t, i) => {
              const locked = chips < t.minBankroll;
              return (
                <button key={t.key} disabled={locked} className={`vip-row t-${t.key}`} onClick={() => onPlayAI({ mode: "cash", tableSize: size, stakes: t, vip: true })}>
                  <div className="vr-no">{i === 0 ? "I" : "II"}</div>
                  <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                    <div className="vr-title">{t.label}</div>
                    <div className="vr-sub num">Blinds {t.sb.toLocaleString()} / {t.bb.toLocaleString()}</div>
                    <div className="vr-min num">{locked ? `Needs ${t.minBankroll.toLocaleString()} chips` : `Min ${t.minBankroll.toLocaleString()}`}</div>
                  </div>
                  <Icon name={locked ? "lock" : "chevron"} size={15} style={{ flexShrink: 0 }} />
                </button>
              );
            })}
          </div>
        </Modal>
      )}

      {modal === "ranked" && (
        <Modal title={placed ? "Ranked match" : `Placement match ${(ranked.placementGames || []).length + 1} of ${PLACEMENT_MATCHES}`} onClose={close}>
          <SizePicker value={size} onChange={setSize} />
          <div className="kv-list">
            <div className="kv"><span>Game</span><b>Hold'em</b></div>
            <div className="kv"><span>Buy-in</span><b className="num">{RANKED_BUYIN.toLocaleString()} chips</b></div>
            <div className="kv"><span>Blinds</span><b className="num">{RANKED_STAKES.sb}/{RANKED_STAKES.bb}</b></div>
            <div className="kv"><span>Rebuys</span><b>None</b></div>
            <div className="kv"><span>Match length</span><b className="num">{RANKED_MATCH_HANDS} hands</b></div>
            <div className="kv"><span>Opponents</span><b>{placed ? `Near ${rankName(matchRating(ranked))}` : "Mixed, to test you"}</b></div>
          </div>
          <p className="sheet-body">{placed
            ? `Play ${RANKED_MATCH_HANDS} hands. Finish in the top half in chips to climb, and the higher you finish the more you gain. Knock everyone out for the biggest jump. Leave early and it counts as a loss.`
            : `Every call, fold and raise gets checked against the odds. Each match is ${RANKED_MATCH_HANDS} hands. After 5 matches that read decides where you start.`}</p>
          <button className="btn btn-raise shine" style={{ width: "100%" }} onClick={() => onPlayAI({ mode: "ranked", tableSize: size, stakes: RANKED_STAKES, buyIn: RANKED_BUYIN })}>Find match</button>
        </Modal>
      )}

      {modal === "cash" && (
        <Modal title="Cash game" onClose={close} width={380}>
          <SizePicker value={size} onChange={setSize} />
          <TurboRow on={turbo} onToggle={() => setTurbo((t) => !t)} />
          <div className="list" style={{ marginTop: 12 }}>
            {STAKES_TIERS.map((t) => {
              const locked = chips < t.minBankroll;
              return (
                <button key={t.key} disabled={locked} className="row" onClick={() => onPlayAI({ mode: "cash", tableSize: size, stakes: t, turbo })}>
                  <div style={{ textAlign: "left" }}>
                    <div className="row-title">{t.label}</div>
                    <div className="row-sub num">Blinds {t.sb}/{t.bb}{locked ? `, needs ${t.minBankroll.toLocaleString()} chips` : ""}</div>
                  </div>
                  <Icon name={locked ? "lock" : "chevron"} size={15} style={{ color: "var(--t-faint)", flexShrink: 0 }} />
                </button>
              );
            })}
          </div>
        </Modal>
      )}

      {modal === "tournament" && (() => {
        const field = size.seats;
        const pays = PAYOUTS[field] || [1];
        const canAfford = chips >= tBuyIn.buyIn;
        return (
          <Modal title="Tournament" onClose={close} width={380}>
            <SizePicker value={size} onChange={setSize} />
            <div style={{ fontSize: 12, color: "var(--t-mut)", margin: "14px 2px 6px" }}>Buy-in</div>
            <div className="seg">
              {TOURNEY_BUYINS.map((b) => (
                <button key={b.key} className={`segbtn${tBuyIn.key === b.key ? " on" : ""}`} disabled={chips < b.buyIn} style={{ opacity: chips < b.buyIn ? 0.4 : 1 }} onClick={() => setTBuyIn(b)}>{b.label}</button>
              ))}
            </div>
            <TurboRow on={turbo} onToggle={() => setTurbo((t) => !t)} tournament />
            <div className="kv-list">
              <div className="kv"><span>Starting stack</span><b className="num">{TOURNEY_STACK.toLocaleString()}</b></div>
              <div className="kv"><span>Prize pool</span><b className="num">{tBuyIn.buyIn ? (tBuyIn.buyIn * field).toLocaleString() : "None"}</b></div>
              <div className="kv"><span>Pays</span><b className="num">{pays.map((x, i) => `${ordinal(i + 1)} ${Math.round(x * 100)}%`).join(", ")}</b></div>
            </div>
            <p className="sheet-body">Blinds start at 10/20 and go up every {turbo ? 3 : 5} hands. Cashing earns tournament index points. Bigger buy-ins and deeper runs score more.</p>
            <button className="btn btn-raise shine" style={{ width: "100%" }} disabled={!canAfford} onClick={() => onPlayAI({ mode: "tournament", tableSize: size, stakes: { sb: 10, bb: 20 }, buyIn: tBuyIn.buyIn, turbo })}>{tBuyIn.buyIn ? `Buy in for ${tBuyIn.buyIn.toLocaleString()}` : "Start freeroll"}</button>
          </Modal>
        );
      })()}
    </div>
  );
}

/* =========================================================================
   COACH TAB
   ========================================================================= */
function CoachScreen({ data }) {
  const k = data.skill || defaultSkill();
  const sk = computeSkill(k);
  const need = 10;
  const recent = (k.recentQ || []).slice(0, 20).reverse();
  const tourneys = (k.tourneys || []).map((r) => ({ ...r, pts: Math.round(tourneyPoints(r)) })).sort((a, b) => b.at - a.at);
  const idx = tournamentIndex(k.tourneys);
  const scoreColor = (x) => (x >= 70 ? "var(--t-good)" : x >= 45 ? "var(--t-accent)" : "var(--t-bad)");
  if (!sk || k.hands < need) {
    return (
      <div className="screen screen-fade">
        <header className="home-head"><div className="wordmark">Coach</div></header>
        <section className="panel" style={{ textAlign: "center", padding: "26px 20px" }}>
          <div style={{ fontFamily: DISPLAY_FONT, fontSize: 22, fontWeight: 700 }}>Play a few hands first</div>
          <p className="sheet-body" style={{ margin: "8px 0 16px" }}>Your Skill Rating looks at eight things: decisions against the odds, preflop discipline, aggression, position, showdowns, luck-adjusted results, composure and tournaments. It needs {need} hands to start.</p>
          <div className="bar" style={{ maxWidth: 220, margin: "0 auto" }}><div style={{ width: `${(k.hands / need) * 100}%`, background: "var(--t-accent)" }} /></div>
          <div className="num" style={{ fontSize: 12, color: "var(--t-mut)", marginTop: 8 }}>{k.hands} of {need} hands</div>
        </section>
      </div>
    );
  }
  return (
    <div className="screen screen-fade">
      <header className="home-head"><div className="wordmark">Coach</div></header>

      <section className="panel" style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 14 }}>
        <SkillDial sr={sk.sr} size={88} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, color: "var(--t-mut)" }}>Skill Rating</div>
          <div style={{ fontFamily: DISPLAY_FONT, fontSize: 26, fontWeight: 700, color: scoreColor(sk.sr), lineHeight: 1.1 }}>{sk.label}</div>
          <div className="num" style={{ fontSize: 12.5, color: "var(--t-mid)", marginTop: 4 }}>±{sk.margin} from {k.hands.toLocaleString()} hands. The margin shrinks as you play.</div>
        </div>
      </section>

      <section className="panel" style={{ marginBottom: 14 }}>
        <div className="report-head" style={{ marginBottom: 6 }}><span>Scouting report</span></div>
        <p style={{ fontSize: 13.5, lineHeight: 1.55, color: "var(--t-text2)", margin: 0 }}>{skillReport(sk)}</p>
      </section>

      <SectionLabel right="Score out of 100">Breakdown</SectionLabel>
      <div className="list" style={{ gap: 6, marginBottom: 14 }}>
        {sk.comps.slice().sort((a, b) => b.weight - a.weight).map((c) => (
          <div key={c.key} className="comp-row" style={{ opacity: c.enough ? 1 : 0.62 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>{c.label} <span style={{ fontSize: 11, color: "var(--t-faint)", fontWeight: 500 }}>{Math.round(c.weight * 100)}%</span></div>
              <div className="num" style={{ fontSize: 15, fontWeight: 700, color: c.enough ? scoreColor(c.score) : "var(--t-mut)" }}>{c.enough ? c.score : "–"}</div>
            </div>
            <div className="bar" style={{ marginTop: 7, height: 5 }}><div style={{ width: `${c.enough ? c.score : 0}%`, background: scoreColor(c.score) }} /></div>
            <div style={{ fontSize: 11.5, color: "var(--t-mid)", marginTop: 6, lineHeight: 1.4 }}>{c.detail}</div>
          </div>
        ))}
      </div>

      {recent.length > 1 && (
        <section className="panel" style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, color: "var(--t-mut)" }}>Decision quality, last {recent.length} hands</div>
          <div className="spark" aria-label="Decision quality by hand, oldest to newest">
            {recent.map((q, i) => <div key={i} style={{ height: `${Math.max(8, q * 100)}%`, background: q >= 0.7 ? "var(--t-good)" : q >= 0.5 ? "var(--t-accent)" : "var(--t-bad)" }} title={pctStr(q)} />)}
          </div>
          <div style={{ fontSize: 11, color: "var(--t-faint)", marginTop: 6 }}>Newest on the right</div>
        </section>
      )}

      <SectionLabel right={`${idx.toLocaleString()} pts`}>Tournament index</SectionLabel>
      <section className="panel" style={{ marginBottom: 14 }}>
        {tourneys.length === 0 ? (
          <div style={{ fontSize: 13, color: "var(--t-mid)", lineHeight: 1.5 }}>Works like the Global Poker Index. Each cash scores buy-in size times how deep you went against the field, then fades as it ages. Your best 8 count.</div>
        ) : (
          <>
            {tourneys.slice(0, 6).map((r, i) => (
              <div key={r.at + "-" + i} className="kv" style={{ alignItems: "center" }}>
                <span>{ordinal(r.place)} of {r.field}, {r.buyIn ? `${r.buyIn.toLocaleString()} buy-in` : "freeroll"} <span style={{ color: "var(--t-faint)" }}>{new Date(r.at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span></span>
                <b className="num" style={{ color: r.pts > 0 ? "var(--t-good)" : "var(--t-faint)" }}>{r.pts > 0 ? `+${r.pts}` : "0"}</b>
              </div>
            ))}
            <div style={{ fontSize: 11.5, color: "var(--t-faint)", marginTop: 10, lineHeight: 1.45 }}>Only paid finishes score. Results lose value after a week and drop off after 90 days, like the GPI.</div>
          </>
        )}
      </section>
      <div style={{ fontSize: 11.5, color: "var(--t-faint)", margin: "0 4px", lineHeight: 1.5 }}>Every decision is graded against your real odds at that moment. All-in pots count the equity you had when the chips went in, so bad beats don't hurt your rating and lucky rivers don't help it. Results against tougher opponents count more.</div>
    </div>
  );
}

/* =========================================================================
   SHOP TAB
   ========================================================================= */
function BackSwatch({ b, w = 44 }) {
  return <div className={`back-sw${b.anim ? " holo-anim" : ""}`} style={{ width: w, height: w * 1.4, backgroundColor: b.a, backgroundImage: b.img, backgroundSize: b.size, backgroundPosition: "center", boxShadow: `inset 0 0 0 2px ${b.ring}, inset 0 0 0 3.5px ${b.b}, 0 4px 10px rgba(0,0,0,0.35)` }} />;
}
function FeltSwatch({ f }) {
  return (
    <div className={`felt-sw${f.anim ? " aurora-anim" : ""}`} style={{ backgroundColor: f.c2, backgroundImage: `${f.tex ? `${f.tex}, ` : ""}radial-gradient(ellipse at 50% 40%, ${f.c1} 0%, ${f.c2} 55%, ${f.c3} 100%)`, backgroundSize: f.tex ? `${f.texSize}, 100% 100%` : undefined, borderColor: f.rail }}>
      {f.line && <span className="felt-sw-line" style={{ borderColor: f.line }} />}
    </div>
  );
}
function ChipSetSwatch({ c }) { return <div className="chipset-sw"><div style={{ transform: "scale(1.55)", transformOrigin: "50% 100%" }}><ChipStack amount={31525} set={c.key} /></div></div>; }
function FxSwatch({ f }) {
  const ic = f.key === "coins" ? <span className="fx-sw-coin" /> : f.key === "fireworks" ? <span className="fx-sw-burst">{Array.from({ length: 8 }).map((_, k) => <i key={k} style={{ transform: `rotate(${k * 45}deg) translateY(-11px)` }} />)}</span> : <span className="fx-sw-conf">{["#F5B83D", "#34D399", "#6FA8FF", "#FF7AB8"].map((c, k) => <i key={k} style={{ background: c, transform: `rotate(${k * 35 - 40}deg) translate(${(k - 1.5) * 9}px, ${k % 2 ? -6 : 5}px)` }} />)}</span>;
  return <div className="fx-sw">{ic}</div>;
}
function CosmeticTile({ item, owned, equipped, chips, onBuy, onEquip, children }) {
  const canAfford = item.cost != null && chips >= item.cost;
  let label, cls = "", act = null;
  if (equipped) { label = "Equipped"; cls = " eq"; }
  else if (owned) { label = "Equip"; act = onEquip; }
  else if (item.prestige) { label = `Prestige ${item.prestige}`; cls = " locked"; }
  else if (item.pass) { label = `Pass lvl ${item.pass}`; cls = " locked"; }
  else { label = item.cost.toLocaleString(); act = canAfford ? onBuy : null; cls = canAfford ? " buy" : " locked"; }
  return (
    <button className={`cos-tile${equipped ? " on" : ""}`} onClick={act || undefined} disabled={!act && !equipped} aria-pressed={equipped}>
      <div className="cos-prev">{children}</div>
      <div className="cos-name">{item.label}</div>
      <div className={`cos-tag num${cls}`}>{!owned && !item.pass && !item.prestige && <span className="chip-dot" style={{ width: 9, height: 9 }} />}{(item.pass || item.prestige) && !owned ? <Icon name="lock" size={10} stroke={2.2} /> : null}{label}</div>
    </button>
  );
}

function ShopScreen({ data, onClaimChips, onBuyAvatar, onClaimDaily, onBuyCosmetic, onEquipCosmetic, onBuyTitle, onBuyTheme, onEquipTheme, onPreviewTheme, previewTheme }) {
  const ts = data.themes || defaultThemes();
  const st = streakState(data.streak);
  const cos = data.cosmetics || defaultCosmetics();
  const curDay = st.claimedToday ? data.streak.count : st.nextDay;
  return (
    <div className="screen screen-fade">
      <header className="home-head">
        <div className="wordmark">Shop</div>
        <div className="chip-pill num"><span className="chip-dot" />{data.chips.toLocaleString()}</div>
      </header>

      <SectionLabel right="Changes the whole app">Themes</SectionLabel>
      <div className="theme-grid" style={{ marginBottom: 24 }}>
        {THEMES.map((t) => {
          const owned = ts.owned.includes(t.key), on = ts.equipped === t.key, viewing = previewTheme === t.key;
          return (
            <div key={t.key} className={`theme-card${on ? " on" : ""}${viewing ? " viewing" : ""}`}>
              <ThemePreview t={t} />
              <div className="theme-name">{t.label}</div>
              <div className="theme-sub">{t.sub}</div>
              <div style={{ display: "flex", gap: 6, marginTop: "auto" }}>
                {on ? <span className="cos-tag eq" style={{ flex: 1, justifyContent: "center", padding: "7px 8px" }}>Equipped</span>
                  : owned ? <button className="btn btn-sm" style={{ flex: 1 }} onClick={() => onEquipTheme(t.key)}>Equip</button>
                  : (<>
                      <button className="btn btn-sm" style={{ flex: 1, padding: "7px 6px" }} onClick={() => onPreviewTheme(t.key)}>{viewing ? "Viewing" : "Preview"}</button>
                      <button className="btn btn-sm btn-raise" style={{ flex: 1, padding: "7px 6px" }} disabled={data.chips < t.cost} onClick={() => onBuyTheme(t)}>{shortNum(t.cost)}</button>
                    </>)}
              </div>
            </div>
          );
        })}
      </div>

      <section className="panel streak-panel" style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div className="sec-ic" style={{ background: "rgba(255,138,76,0.18)", color: "#FF8A4C" }}><Icon name="flame" size={15} stroke={2} /></div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>Daily streak</div>
              <div style={{ fontSize: 11.5, color: "var(--t-sub)" }}>{st.claimedToday ? "Claimed. Come back tomorrow." : "Miss a day and it starts over"}</div>
            </div>
          </div>
          <button className={`btn btn-raise btn-sm${st.claimedToday ? "" : " shine"}`} disabled={st.claimedToday} onClick={onClaimDaily}>{st.claimedToday ? "Claimed" : "Claim"}</button>
        </div>
        <div className="streak-row">
          {STREAK_REWARDS.map((amt, i) => {
            const day = i + 1;
            const got = st.claimedToday ? day <= curDay : day < curDay;
            const today = day === curDay;
            return (
              <div key={day} className={`streak-day${got ? " got" : ""}${today && !st.claimedToday ? " today" : ""}${day === 7 ? " big" : ""}`}>
                <div className="sd-n">Day {day}</div>
                {got ? <Icon name="check" size={14} stroke={2.6} /> : <span className="chip-dot" style={{ width: 11, height: 11 }} />}
                <div className="sd-amt num">{amt >= 1000 ? `${amt / 1000}k` : amt}</div>
              </div>
            );
          })}
        </div>
      </section>

      <SectionLabel right="Tap to equip">Table felts</SectionLabel>
      <div className="cos-grid" style={{ marginBottom: 24 }}>
        {FELTS.map((f) => (
          <CosmeticTile key={f.key} item={f} owned={ownsCosmetic(cos, "felts", f, data.ranked.prestige)} equipped={cos.felt === f.key} chips={data.chips} onBuy={() => onBuyCosmetic("felt", f)} onEquip={() => onEquipCosmetic("felt", f.key)}>
            <FeltSwatch f={f} />
          </CosmeticTile>
        ))}
      </div>

      <SectionLabel right="Tap to equip">Card backs</SectionLabel>
      <div className="cos-grid" style={{ marginBottom: 24 }}>
        {CARD_BACKS.map((b) => (
          <CosmeticTile key={b.key} item={b} owned={ownsCosmetic(cos, "backs", b, data.ranked.prestige)} equipped={cos.cardBack === b.key} chips={data.chips} onBuy={() => onBuyCosmetic("back", b)} onEquip={() => onEquipCosmetic("back", b.key)}>
            <BackSwatch b={b} w={42} />
          </CosmeticTile>
        ))}
      </div>

      <SectionLabel right="From the season pass">Chip sets</SectionLabel>
      <div className="cos-grid" style={{ marginBottom: 24 }}>
        {CHIP_SETS.map((c) => (
          <CosmeticTile key={c.key} item={c} owned={ownsCosmetic(cos, "chipsets", c, data.ranked.prestige)} equipped={(cos.chipset || "classic") === c.key} chips={data.chips} onEquip={() => onEquipCosmetic("chipset", c.key)}>
            <ChipSetSwatch c={c} />
          </CosmeticTile>
        ))}
      </div>

      <SectionLabel right="Plays when you win big">Win effects</SectionLabel>
      <div className="cos-grid" style={{ marginBottom: 24 }}>
        {WIN_FX.map((f) => (
          <CosmeticTile key={f.key} item={f} owned={ownsCosmetic(cos, "fxs", f, data.ranked.prestige)} equipped={(cos.fx || "confetti") === f.key} chips={data.chips} onEquip={() => onEquipCosmetic("fx", f.key)}>
            <FxSwatch f={f} />
          </CosmeticTile>
        ))}
      </div>

      <SectionLabel right="Shows under your name">Titles</SectionLabel>
      <div className="list" style={{ gap: 6, marginBottom: 24 }}>
        {TITLES.filter((t) => t.cost).map((t) => {
          const owned = (data.titles || defaultTitles()).owned.includes(t.key);
          const can = data.chips >= t.cost;
          return (
            <div key={t.key} className="title-row">
              <div style={{ flex: 1, minWidth: 0 }}>
                <TitleTag k={t.key} size={14} />
                <div style={{ fontSize: 11, color: "var(--t-faint)", marginTop: 2, textTransform: "capitalize" }}>{t.rarity}</div>
              </div>
              {owned ? <span className="cos-tag eq">Owned</span>
                : <button className="btn btn-sm" disabled={!can} onClick={() => onBuyTitle(t)} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span className="chip-dot" style={{ width: 10, height: 10 }} /><span className="num">{t.cost.toLocaleString()}</span></button>}
            </div>
          );
        })}
        <div style={{ fontSize: 11.5, color: "var(--t-faint)", padding: "4px 2px 0" }}>More titles are earned by playing. See them all on your profile.</div>
      </div>

      <SectionLabel right="Rank frames come from ranked play">Avatars</SectionLabel>
      <div className="avatar-grid" style={{ marginBottom: 24 }}>
        {AVATAR_CATALOG.map((a) => {
          const owned = data.unlocked.includes(a.emoji);
          const canAfford = data.chips >= a.cost;
          return (
            <button key={a.emoji} disabled={owned || !canAfford} onClick={() => onBuyAvatar(a)} className="avatar-tile" style={{ opacity: owned || canAfford ? 1 : 0.4 }}>
              <div style={{ fontSize: 26 }}>{a.emoji}</div>
              <div className="num" style={{ fontSize: 10.5, color: owned ? "var(--t-good)" : "var(--t-sub)", marginTop: 4, fontWeight: 600 }}>{owned ? "Owned" : a.cost === 0 ? "Free" : a.cost.toLocaleString()}</div>
            </button>
          );
        })}
      </div>

    </div>
  );
}

/* =========================================================================
   LEADERBOARD TAB
   ========================================================================= */
function LeaderboardScreen({ data, account, online = {}, onOpenAuth }) {
  const [tab, setTab] = useState("ranked");
  const [fl, setFl] = useState(null); const [openF, setOpenF] = useState(null);
  // real players from everyone's accounts; the sample list only shows if that can't load
  const [real, setReal] = useState({});
  const [scope, setScope] = useState(() => { try { return localStorage.getItem("felt-lb-scope") || "world"; } catch (e) { return "world"; } });
  const tz = myTimeZone();
  const realKey = `${tab}-${scope}`;
  useEffect(() => {
    if (!cloudEnabled() || tab === "friends") return;
    let on = true;
    cloud.top(tab === "ranked" ? "ranked" : "index", scope === "local" ? tz : null).then((list) => on && setReal((r) => ({ ...r, [realKey]: list }))).catch(() => on && setReal((r) => ({ ...r, [realKey]: false })));
    return () => { on = false; };
  }, [tab, scope]); // eslint-disable-line react-hooks/exhaustive-deps
  const pickScope = (v) => { setScope(v); try { localStorage.setItem("felt-lb-scope", v); } catch (e) { /* private mode */ } };
  useEffect(() => { if (tab !== "friends" || !account) return; cloud.friends(account).then((r) => setFl(r.friends)).catch(() => setFl([])); }, [tab, account]);
  const placed = isPlaced(data.ranked);
  const month = new Date().toLocaleString("en-US", { month: "long" });
  const myIndex = tournamentIndex((data.skill || {}).tourneys);
  // sample players stand in until online play exists, so the boards have company
  const realList = real[realKey];
  const live = Array.isArray(realList);
  const others = live ? realList.filter((p) => !account || p.id !== account.id).map((p) => ({ id: p.id, name: p.display_name, profile: p, isYou: false, prestige: p.prestige || 0, title: p.title, rating: p.placed ? p.rating : null, index: (p.stats || {}).tIndex || 0 })).filter((p) => (tab === "ranked" ? p.rating != null : true)) : MOCK_PLAYERS.map((m) => ({ name: m.name, isYou: false, title: hashStr(m.name) % 5 < 2 ? TITLES[1 + (hashStr(m.name + "t") % (TITLES.length - 1))].key : null, rating: Math.round(Math.min(1680, m.wins * 9 + m.chips / 80)), index: Math.round(m.wins * 7 + m.chips / 150) }));
  const you = { name: data.name, isYou: true, profile: { ...publicProfile(data), id: account ? account.id : "me" }, prestige: data.ranked.prestige || 0, title: (data.titles || defaultTitles()).equipped, rating: placed ? Math.round(data.ranked.rating) : null, index: myIndex };
  const isRanked = tab === "ranked";
  const key = isRanked ? "rating" : "index";
  const pool = [...others, ...(you[key] != null ? [you] : [])].sort((a, b) => b[key] - a[key]);
  const myPos = pool.findIndex((p) => p.isYou);
  const SHOW = 50;
  const visible = pool.slice(0, SHOW);
  const value = (p) => (isRanked ? `${p.rating.toLocaleString()} RP` : `${p.index.toLocaleString()} pts`);
  const medal = ["var(--t-accent)", "#C9D4E2", "#D9894E"];
  // only dock your row at the bottom when your spot in the list is scrolled out of view
  const scrollRef = useRef(null); const meRef = useRef(null);
  const [meVisible, setMeVisible] = useState(true);
  useEffect(() => {
    const el = meRef.current;
    if (!el) { setMeVisible(false); return; }
    if (!("IntersectionObserver" in window)) { setMeVisible(true); return; }
    const io = new IntersectionObserver(([e]) => setMeVisible(e.isIntersecting), { root: scrollRef.current, threshold: 0.6 });
    io.observe(el);
    return () => io.disconnect();
  }, [tab, myPos]);
  const renderRow = (p, i, pinned = false) => {
    const tier = isRanked ? tierForRating(p.rating) : null;
    return (
      <div key={(pinned ? "pin-" : "") + (p.id || p.name) + (p.isYou ? "-you" : "")} ref={p.isYou && !pinned ? meRef : null} className={`lb-row${pinned ? " lb-pinned" : ""}${p.profile && !p.isYou ? " tap" : ""}`} onClick={p.profile && !p.isYou ? () => setOpenF(p.id) : undefined} style={{ background: p.isYou ? "rgba(52,211,153,0.1)" : "var(--t-panel)", borderColor: p.isYou ? "rgba(52,211,153,0.4)" : "rgba(244,247,252,0.06)" }}>
        <div className="num" style={{ width: 26, fontSize: 13.5, fontWeight: 700, color: i < 3 ? medal[i] : "var(--t-faint)" }}>{i + 1}</div>
        {tier && <TierBadge tier={tier} size={30} />}
        {live && p.profile && <PlayerAvatar p={p.profile} size={30} live={!p.isYou && !!online[p.id]} />}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: p.isYou ? "var(--t-good)" : "var(--t-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}><span className={pnameCls(p.prestige)}>{p.isYou && p.name !== "You" ? `${p.name} (you)` : p.name}</span>{p.prestige ? <PrestigeBadge n={p.prestige} size={15} /> : null}</div>
          {(tier || (p.title && p.title !== "rookie")) && <div style={{ fontSize: 11, display: "flex", gap: 8, alignItems: "baseline", whiteSpace: "nowrap", overflow: "hidden" }}>{tier && <span style={{ color: tier.color }}>{live && scope === "world" && p.rating >= 1500 ? `Legend #${i + 1}` : rankName(p.rating)}</span>}{p.title && p.title !== "rookie" && <TitleTag k={p.title} size={10.5} />}</div>}
        </div>
        <div className="num" style={{ fontSize: 13.5, fontWeight: 600, color: "var(--t-text2)" }}>{value(p)}</div>
      </div>
    );
  };
  if (tab === "friends") {
    const me = { id: "me", ...publicProfile(data), username: account ? account.username : null, isYou: true };
    const rows = [...(fl || []), me].sort((a, b) => (b.placed ? b.rating : -1) - (a.placed ? a.rating : -1));
    return (
      <div className="screen screen-fade">
        <header className="home-head" style={{ marginBottom: 12 }}><div className="wordmark">Leaderboard</div></header>
        <div className="seg" style={{ marginBottom: 10 }}>
          <button onClick={() => setTab("ranked")} className="segbtn">Ranked</button>
          <button onClick={() => setTab("index")} className="segbtn">Tournament index</button>
          <button onClick={() => setTab("friends")} className="segbtn on">Friends</button>
        </div>
        {!account ? (
          <div className="panel acct-cta"><div style={{ fontSize: 14.5, fontWeight: 700 }}>See how you stack up</div><div style={{ fontSize: 12.5, color: "var(--t-mid)", marginTop: 3 }}>Make an account and add friends to rank against them.</div><button className="btn btn-sm btn-raise" style={{ marginTop: 12, width: "100%" }} onClick={() => onOpenAuth("signup")}>Create account</button></div>
        ) : fl === null ? <div className="empty">Loading…</div> : (
          <div className="list" style={{ gap: 6 }}>
            {rows.map((p, i) => (
              <div key={p.id} className={`friend-row${p.isYou ? "" : " tap"}`} style={p.isYou ? { borderColor: "rgba(52,211,153,0.4)", background: "rgba(52,211,153,0.08)" } : undefined} onClick={p.isYou ? undefined : () => setOpenF(p.id)}>
                <div className="num" style={{ width: 22, fontSize: 13.5, fontWeight: 700, color: i < 3 ? ["var(--t-accent)", "#C9D4E2", "#D9894E"][i] : "var(--t-faint)" }}>{i + 1}</div>
                <PlayerAvatar p={p} size={34} live={!p.isYou && !!online[p.id]} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 650, color: p.isYou ? "var(--t-good)" : "var(--t-text)", display: "flex", alignItems: "center", gap: 5 }}>{p.display_name}{p.isYou ? " (you)" : ""}<PrestigeBadge n={p.prestige} size={14} /></div>
                  <div style={{ fontSize: 11, color: p.placed ? tierForRating(p.rating).color : "var(--t-mut)" }}>{p.placed ? rankName(p.rating) : "Unranked"}</div>
                </div>
                <div className="num" style={{ fontSize: 13, fontWeight: 600, color: "var(--t-text2)" }}>{p.placed ? `${p.rating.toLocaleString()} RP` : "-"}</div>
              </div>
            ))}
            {fl.length === 0 && <div className="empty">Add friends from your Profile tab and they'll show up here.</div>}
          </div>
        )}
        {openF && <FriendProfileModal friendId={openF} online={online} onClose={() => setOpenF(null)} />}
      </div>
    );
  }
  return (
    <div ref={scrollRef} className="screen screen-fade" style={{ paddingBottom: 0, display: "flex", flexDirection: "column" }}>
      <header className="home-head" style={{ marginBottom: 12 }}><div className="wordmark">Leaderboard</div></header>
      <div className="seg" style={{ marginBottom: 10 }}>
        <button onClick={() => setTab("ranked")} className={`segbtn${isRanked ? " on" : ""}`}>Ranked</button>
        <button onClick={() => setTab("index")} className={`segbtn${!isRanked ? " on" : ""}`}>Tournament index</button>
        {cloudEnabled() && <button onClick={() => setTab("friends")} className="segbtn">Friends</button>}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "0 2px 12px" }}>
        <div style={{ flex: 1, fontSize: 12, color: "var(--t-mut)" }}>{scope === "local" && cloudEnabled() ? `Players in ${tzLabel(tz)} time. ` : ""}{isRanked ? `${month} season, ends in ${daysLeftInSeason()} days.` : "Best 8 tournament cashes, fading over 90 days."}</div>
        {cloudEnabled() && (
          <div className="scope-toggle" role="radiogroup" aria-label="Leaderboard scope">
            <button role="radio" aria-checked={scope === "world"} className={scope === "world" ? "on" : ""} onClick={() => pickScope("world")}><Icon name="wheel" size={11} stroke={2.2} />World</button>
            <button role="radio" aria-checked={scope === "local"} className={scope === "local" ? "on" : ""} onClick={() => pickScope("local")}><Icon name="home" size={11} stroke={2.2} />Local</button>
          </div>
        )}
      </div>
      <div className="list" style={{ gap: 6, flex: 1 }}>
        {visible.map((p, i) => renderRow(p, i))}
        <div style={{ fontSize: 11, color: "var(--t-faint)", textAlign: "center", padding: "8px 0 4px" }}>{live ? (pool.length <= 1 ? (scope === "local" ? `No one else in ${tzLabel(tz)} time yet. Get your friends on felt.` : "No one else is on the board yet. Get your friends on felt.") : scope === "local" ? `Everyone in ${tzLabel(tz)} time. Tap a player to see their profile.` : "Everyone with a felt account. Tap a player to see their profile.") : realList === undefined && cloudEnabled() ? "Loading players…" : "Other players are samples until online play is added."}</div>
      </div>
      {/* your spot stays visible at the bottom, even when you're off the list */}
      <div className="lb-dock">
        {isRanked && !placed ? (
          <div className="lb-row" style={{ background: "var(--t-panel)", borderColor: "rgba(244,247,252,0.1)" }}>
            <TierBadge tier={UNRANKED} size={26} />
            <div style={{ flex: 1, fontSize: 13, color: "var(--t-sub)" }}>Finish {PLACEMENT_MATCHES - (data.ranked.placementGames || []).length} more placement {PLACEMENT_MATCHES - (data.ranked.placementGames || []).length === 1 ? "match" : "matches"} to get on the board</div>
          </div>
        ) : myPos >= 0 && !meVisible ? renderRow(pool[myPos], myPos, true) : null}
      </div>
      {openF && tab !== "friends" && <FriendProfileModal friendId={openF} online={online} account={account} onClose={() => setOpenF(null)} />}
    </div>
  );
}

/* =========================================================================
   ONLINE TABLES: real people, the server deals
   ========================================================================= */
const ONLINE_STAKES = [[5, 10], [10, 20], [25, 50], [50, 100], [100, 200], [250, 500], [500, 1000], [1000, 2000]];
const EMOTES = ["👍", "😂", "😤", "🔥", "🫡", "😬", "GG", "Nice hand", "Ship it"];
const TURN_SECS = 20;

function OnlineCard({ c, mini = false, cls = "", suitColor }) {
  return (
    <div className={`card${mini ? " mini" : ""}${cls ? " " + cls : ""}`}>
      {mini ? <div style={{ color: suitColor[c.s], fontSize: 9, fontWeight: 700 }}>{rankLabel(c.r)}{SUIT_GLYPH[c.s]}</div>
        : (<><div style={{ color: suitColor[c.s] }}>{rankLabel(c.r)}</div><div style={{ color: suitColor[c.s], fontSize: "0.9em" }}>{SUIT_GLYPH[c.s]}</div></>)}
    </div>
  );
}

function OnlineTable({ tableId, account, data, sound, soundOn, setSoundOn, onExit, onDebit, onClaim }) {
  const [row, setRow] = useState(null);
  const [holes, setHoles] = useState(null);
  const [err, setErr] = useState(null);
  const [sheet, setSheet] = useState(null);
  const [buyIn, setBuyIn] = useState(0);
  const [showRaise, setShowRaise] = useState(false); const [custom, setCustom] = useState(false); const [raiseTo, setRaiseTo] = useState(0);
  const [photos, setPhotos] = useState({});
  const [peekOpen, setPeekOpen] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [friends, setFriends] = useState(null); const [invited, setInvited] = useState({});
  const versionRef = useRef(-1); const offsetRef = useRef(0); const tickAt = useRef(0); const prevRef = useRef(null); const mounted = useRef(true); const errT = useRef(null);
  const suitColor = data.settings.colorblind ? SUIT_COLOR_CB : SUIT_COLOR;
  const back = findBack((data.cosmetics || {}).cardBack); const felt = findFelt((data.cosmetics || {}).felt);
  const chipSet = (data.cosmetics || {}).chipset || "classic"; const winFx = (data.cosmetics || {}).fx || "confetti";
  const [fxAt, setFxAt] = useState(null);
  const myEmotes = [...BASE_EMOTES, ...(data.emotes || [])];

  const apply = useCallback((r) => {
    if (!r || !r.state || r.version == null || r.version <= versionRef.current) return;
    versionRef.current = r.version;
    // the server stamps each save; a stamp can only arrive late, never early, so the biggest gap seen is the real one
    if (r.state.at) { const est = r.state.at - Date.now(); offsetRef.current = offsetRef.seen ? Math.max(offsetRef.current, est) : est; offsetRef.seen = true; }
    setRow((prev) => ({ ...(prev || {}), ...r }));
  }, []);
  const flash = (m) => { setErr(m); clearTimeout(errT.current); errT.current = setTimeout(() => mounted.current && setErr(null), 3200); };
  const send = useCallback(async (action, payload = {}, quiet = false) => {
    try {
      const r = await api(action, { tableId, ...payload });
      if (r.state) apply({ state: r.state, version: r.version });
      if (r.debit) onDebit(r.debit);
      return r;
    } catch (e) { if (!quiet) flash(e.message); return null; }
  }, [tableId, apply, onDebit]);

  useEffect(() => {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    const ping = () => { if (!document.hidden) api("here").catch(() => {}); };
    ping(); const t = setInterval(ping, 20000);
    document.addEventListener("visibilitychange", ping);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", ping); };
  }, []);
  useEffect(() => {
    mounted.current = true;
    let stop = null;
    api("get", { tableId }).then((r) => { apply({ state: r.state, version: r.version, closed: r.closed, ...r.table }); if (r.holes) setHoles(r.holes); }).catch((e) => flash(e.message));
    cloud.watchTable(tableId, (r) => apply(r)).then((s) => { if (mounted.current) stop = s; else s(); });
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => { mounted.current = false; clearInterval(t); if (stop) stop(); };
  }, [tableId, apply]);

  const st = row && row.state;
  const mySeat = st ? st.seats.findIndex((s) => s && s.uid === account.id) : -1;
  const me = mySeat >= 0 ? st.seats[mySeat] : null;
  const serverNow = now + offsetRef.current;
  const betting = st && ["preflop", "flop", "turn", "river"].includes(st.stage);

  // your two cards for this hand (only your phone ever gets them)
  useEffect(() => {
    if (!st || !me || !me.inHand || !st.handNo) return;
    if (holes && holes.hand_no === st.handNo) return;
    let tries = 0, on = true;
    const pull = () => cloud.holes(tableId, account).then((h) => { if (!on) return; if (h && h.hand_no === st.handNo) setHoles(h); else if (tries++ < 8) setTimeout(pull, 400); }).catch(() => {});
    pull();
    return () => { on = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [st && st.handNo, me && me.inHand]);

  // photos load once per player
  useEffect(() => {
    if (!st) return;
    st.seats.forEach((s) => { if (s && photos[s.uid] === undefined) { setPhotos((p) => ({ ...p, [s.uid]: null })); cloud.getProfile(s.uid).then((p) => mounted.current && setPhotos((m) => ({ ...m, [s.uid]: (p && p.photo) || null }))).catch(() => {}); } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [st && st.seats.map((s) => (s ? s.uid : "")).join(",")]);

  // anyone at the table keeps it moving: auto-acts on the clock and deals the next hand
  useEffect(() => {
    if (!st) return;
    const due = (betting && st.turn >= 0 && serverNow > st.deadline + 900) || ((st.stage === "showdown" || st.stage === "waiting") && st.nextAt && serverNow > st.nextAt + 250) || (st.stage === "waiting" && !st.nextAt && st.seats.filter((s) => s && !s.out && s.stack > 0).length >= 2);
    if (due && Date.now() - tickAt.current > 1500) { tickAt.current = Date.now(); send("tick", {}, true); }
  });

  // sounds and buzzes, from what changed since the last update
  useEffect(() => {
    if (!st) return;
    const p = prevRef.current; prevRef.current = st;
    if (!p) return;
    if (st.handNo !== p.handNo && betting) { sound.shuffle(); const n = st.seats.filter((s) => s && s.inHand).length; setTimeout(() => mounted.current && sound.deal(n * 2, 0.07), 500); setPeekOpen(false); }
    if (st.board.length > p.board.length && st.handNo === p.handNo) sound.flip(st.board.length - p.board.length, 0.12);
    st.seats.forEach((s, i) => { const o = p.seats[i]; if (s && o && s.uid === o.uid && st.handNo === p.handNo) { if (s.bet > o.bet) { if (s.allIn && !o.allIn) sound.allIn(i === mySeat ? 1 : 0.6); else sound.call(i === mySeat ? 1 : 0.6, (s.bet - o.bet) / (row.bb || 1)); } else if (s.folded && !o.folded) sound.fold(i === mySeat ? 1 : 0.5); else if (s.last === "Check" && o.last !== "Check") sound.click(0.6); } });
    if (st.turn === mySeat && p.turn !== mySeat && betting) { sound.ping(); vibrate(15); }
    if (st.stage === "showdown" && p.stage !== "showdown" && st.result) { const mine = st.result.winners.some((w) => w.seat === mySeat); if (mine) { sound.win(); vibrate([30, 40, 30]); const w = st.result.winners.find((x) => x.seat === mySeat); if (w && w.amount >= (row.bb || 1) * 10) { setFxAt(Date.now()); setTimeout(() => mounted.current && setFxAt(null), 1800); } } else if (me && me.inHand) sound.lose(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row && row.version]);

  if (!row || !st) {
    return (<div className="table-wrap online"><div className="table-top"><button className="iconbtn" onClick={() => onExit()} aria-label="Back"><Icon name="back" size={15} /></button><div className="wordmark-sm">felt</div><span style={{ width: 30 }} /></div><div className="empty" style={{ marginTop: 80 }}>{err || "Joining the table…"}</div></div>);
  }

  const n = st.seats.length;
  const order = mySeat >= 0 ? Array.from({ length: n - 1 }, (_, k) => (mySeat + 1 + k) % n).filter((i) => st.seats[i]) : Array.from({ length: n }, (_, k) => k);
  const pot = st.pot + st.seats.reduce((a, s) => a + (s ? s.bet : 0), 0);
  const myTurn = betting && st.turn === mySeat && me && !me.folded && !me.allIn;
  const toCall = me ? Math.max(0, st.currentBet - me.bet) : 0;
  const secsLeft = betting && st.turn >= 0 ? Math.max(0, Math.ceil((st.deadline - serverNow) / 1000)) : TURN_SECS;
  const reveal = (st.result && st.result.reveal) || {};
  const winnerSeats = new Set(((st.result && st.result.winners) || []).map((w) => w.seat));
  const [lo, hi] = [row.bb * 20, row.bb * 100];
  const canBuy = row.friendly ? true : data.chips >= lo;
  const turnName = betting && st.turn >= 0 && st.seats[st.turn] ? st.seats[st.turn].name : null;
  const nextIn = st.nextAt ? Math.max(0, Math.ceil((st.nextAt - serverNow) / 1000)) : null;
  const myCards = holes && st.handNo && holes.hand_no === st.handNo ? holes.cards : null;
  const avatarOf = (s, size) => (photos[s.uid] ? <img src={photos[s.uid]} alt="" style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", display: "block" }} /> : s.avatar || "🙂");
  const openSit = (i) => { if (!canBuy) { flash(`You need ${lo.toLocaleString()} chips to sit here.`); return; } setBuyIn(row.friendly ? row.bb * 100 : Math.min(hi, Math.max(lo, Math.min(data.chips, row.bb * 50)))); setSheet({ kind: "sit", seat: i }); };
  const openInvite = () => { setSheet({ kind: "invite" }); if (!friends) cloud.friends(account).then((r) => mounted.current && setFriends(r.friends)).catch(() => setFriends([])); };
  const shareText = `Come play poker with me on felt. Table code ${row.code}`;
  const shareLink = `${window.location.origin}/?table=${row.code}`;
  const compact = order.length >= 5; const tiny = order.length >= 7;

  const seatView = (i) => {
    const s = st.seats[i];
    const colW = tiny ? 76 : compact ? 62 : 78; const ring = tiny ? 34 : compact ? 38 : 42; const av = ring - 6;
    if (!s) {
      return (
        <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, width: colW }}>
          {mySeat < 0 ? <button className="ot-sit" style={{ width: ring, height: ring }} onClick={() => openSit(i)} aria-label={`Sit in seat ${i + 1}`}>+</button> : <div className="ot-open" style={{ width: ring, height: ring }} />}
          <div style={{ fontSize: 10.5, color: "var(--t-faint)", fontWeight: 600 }}>{mySeat < 0 ? "Sit here" : "Open"}</div>
        </div>
      );
    }
    const active = betting && st.turn === i; const inHand = s.inHand && st.stage !== "waiting";
    const em = s.emote && serverNow - s.emote.at < 3500 ? s.emote.e : null;
    const fmt = compact ? shortNum : (x) => x.toLocaleString();
    return (
      <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, width: colW, opacity: s.out ? 0.45 : s.folded && inHand ? 0.55 : 1, transition: "opacity .3s ease" }}>
        <div style={{ position: "relative", width: ring, height: ring }}>
          {active && (<svg width={ring} height={ring} style={{ position: "absolute", top: 0, left: 0, transform: "rotate(-90deg)" }}>
            <circle cx={ring / 2} cy={ring / 2} r={ring / 2 - 2} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2.5" />
            <circle cx={ring / 2} cy={ring / 2} r={ring / 2 - 2} fill="none" stroke={secsLeft < 8 ? "#FF6B6B" : "#34D399"} strokeWidth="2.5" strokeDasharray={2 * Math.PI * (ring / 2 - 2)} strokeDashoffset={2 * Math.PI * (ring / 2 - 2) * (1 - secsLeft / TURN_SECS)} style={{ transition: "stroke-dashoffset .25s linear" }} strokeLinecap="round" /></svg>)}
          <div className="bot-av ot-av" style={{ width: av, height: av, fontSize: av * 0.5 }}>{avatarOf(s, av)}</div>
          {s.peekAt && inHand && !s.folded && <div className="peek-badge" aria-label={`${s.name} looks at their cards`}><Icon name="eye" size={11} stroke={2.4} /></div>}
          {st.dealer === i && <div className="dealer-chip">D</div>}
          {(s.prestige || 0) >= 5 && <CrownMark size={12} top={-8} />}
          {em && <div key={s.emote.at} className="emote-bubble">{em}</div>}
        </div>
        <div style={{ fontSize: compact ? 10.5 : 11.5, fontWeight: 600, color: "var(--t-text2)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: colW, display: "flex", alignItems: "center", gap: 3 }}><span className={pnameCls(s.prestige)}>{s.name}</span><PrestigeBadge n={s.prestige} size={11} /></div>
        <div className="num" style={{ fontSize: 10.5, color: "var(--t-mut)" }}>{s.out ? (s.stack > 0 ? "Away" : "Out") : fmt(s.stack)}</div>
        <div style={{ height: tiny ? 30 : 34, display: "flex", alignItems: "center", justifyContent: "center", gap: 3 }}>
          {reveal[i] ? reveal[i].map((c) => <OnlineCard key={c.id} c={c} mini suitColor={suitColor} cls={`${winnerSeats.has(i) ? "win" : ""}`} />)
            : inHand && !s.folded ? (<div className={`backs${s.peekAt ? " peeking" : ""}`}>{[0, 1].map((j) => <div key={j} className="card mini back" style={{ "--r": `${j === 0 ? -7 : 7}deg`, marginLeft: j ? -11 : 0 }} />)}</div>) : null}
        </div>
        <div style={{ height: 18 }}>
          {s.bet > 0 ? <div className="chip-badge">{!compact && <ChipStack amount={s.bet} small set={chipSet} />}{fmt(s.bet)}</div> : s.last && inHand ? <div className="ot-last">{s.last}</div> : null}
        </div>
      </div>
    );
  };

  const raisePanel = () => {
    const maxTo = me.stack + me.bet; const minTo = Math.min(maxTo, st.currentBet + st.minRaise);
    const clamp = (v) => Math.max(minTo, Math.min(maxTo, v));
    const presets = [{ label: "Half pot", value: clamp(st.currentBet + Math.round(pot * 0.5)) }, { label: "Pot", value: clamp(st.currentBet + pot) }, { label: "All in", value: maxTo }];
    const go = (v) => { vibrate(20); setShowRaise(false); setCustom(false); send("act", { move: st.currentBet ? "raise" : "bet", amount: v }); };
    return !custom ? (
      <div style={{ display: "flex", gap: 7, width: "100%" }}>
        {presets.map((p) => <button key={p.label} className="btn preset-btn" onClick={() => go(p.value)}><div style={{ fontSize: 12.5, fontWeight: 600 }}>{p.label}</div><div className="num" style={{ fontSize: 10.5, opacity: 0.8 }}>{p.value.toLocaleString()}</div></button>)}
        <button className="iconbtn" style={{ width: 42, height: 42, borderRadius: 12 }} onClick={() => { setRaiseTo(minTo); setCustom(true); }} aria-label="Custom amount"><Icon name="edit" size={15} /></button>
      </div>
    ) : (
      <div className="slider-row">
        <input type="range" min={minTo} max={maxTo} value={clamp(raiseTo)} onChange={(e) => setRaiseTo(Number(e.target.value))} style={{ flex: 1 }} aria-label="Bet amount" />
        <span className="num" style={{ fontSize: 13, minWidth: 48, textAlign: "right", fontWeight: 700 }}>{clamp(raiseTo).toLocaleString()}</span>
        <button className="btn btn-raise" style={{ flex: "none", padding: "8px 16px" }} onClick={() => go(clamp(raiseTo))}>{st.currentBet ? "Raise" : "Bet"}</button>
      </div>
    );
  };

  const statusLine = st.stage === "waiting" ? (nextIn != null && st.nextAt ? `Dealing in ${nextIn}` : st.seats.filter(Boolean).length < 2 ? "Waiting for someone to sit down" : "Waiting for players") : st.stage === "showdown" ? "" : turnName ? (st.turn === mySeat ? "Your turn" : `${turnName} to act`) : "";
  const iWonUncontested = st.stage === "showdown" && st.result && st.result.uncontested && st.result.winners[0] && st.result.winners[0].seat === mySeat && !st.result.shown;

  return (
    <div data-felt={felt.key} data-back={back.key} className={`table-wrap online${order.length >= 7 ? " crowded" : ""}`} style={{ "--back-a": back.a, "--back-b": back.b, "--back-ring": back.ring, ...(back.img ? { "--back-img": back.img, "--back-size": back.size } : {}), "--felt1": felt.c1, "--felt2": felt.c2, "--felt3": felt.c3, "--rail": felt.rail, ...(felt.tex ? { "--felt-tex": felt.tex, "--felt-tex-size": felt.texSize } : {}), ...(felt.line ? { "--felt-line": felt.line } : {}) }}>
      <div className="table-top">
        <button className="iconbtn" onClick={() => (mySeat >= 0 ? setSheet({ kind: "leave" }) : onExit())} aria-label="Leave table"><Icon name="back" size={15} /></button>
        <div style={{ textAlign: "center", minWidth: 0 }}>
          <div className="wordmark-sm">felt</div>
          <div className="table-sub">Table {row.code} · {row.sb}/{row.bb}{row.friendly ? " · Friendly" : ""}</div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="iconbtn" onClick={openInvite} aria-label="Invite friends"><Icon name="user" size={14} /></button>
          {mySeat >= 0 && <button className="iconbtn" onClick={() => setSheet({ kind: "emote" })} aria-label="Send a reaction"><span style={{ fontSize: 14, lineHeight: 1 }}>😀</span></button>}
          <button className="iconbtn" onClick={() => setSoundOn((x) => !x)} aria-label={soundOn ? "Mute" : "Unmute"}><Icon name={soundOn ? "soundOn" : "soundOff"} size={14} /></button>
        </div>
      </div>

      <div key={statusLine} className="status">{err ? <span style={{ color: "var(--t-bad)" }}>{err}</span> : statusLine}</div>

      <div className={`seats${order.length >= 7 ? " grid4" : ""}`}>{order.map(seatView)}</div>
      {fxAt && <WinFx key={fxAt} kind={winFx} />}

      <div className="felt-center">
        <div className="felt-oval">
          <div className="felt-logo" aria-hidden="true">felt</div>
          <div style={{ display: "flex", gap: "clamp(4px,1.4vw,6px)", position: "relative" }}>
            {st.board.map((c, i) => <div key={c.id + st.handNo} className={`card${st.stage === "showdown" && !st.result?.uncontested ? "" : ""}`} style={{ animation: `flipIn .45s cubic-bezier(.2,.8,.2,1) ${(st.result && st.result.runout ? i : Math.max(0, i - (st.board.length > 3 ? st.board.length - 1 : 0))) * 0.14}s backwards` }}><div style={{ color: suitColor[c.s] }}>{rankLabel(c.r)}</div><div style={{ color: suitColor[c.s], fontSize: "0.9em" }}>{SUIT_GLYPH[c.s]}</div></div>)}
            {Array.from({ length: 5 - st.board.length }).map((_, i) => <div key={i} className="card-slot" />)}
          </div>
          <div className="pot-row" style={{ visibility: pot > 0 ? "visible" : "hidden" }}>
            <ChipStack amount={pot} set={chipSet} />
            <div className="pot-num num">Pot {pot.toLocaleString()}</div>
          </div>
        </div>
        {st.stage === "showdown" && st.result && (
          <div className="banner" style={{ borderColor: winnerSeats.has(mySeat) ? "rgba(52,211,153,0.45)" : "rgba(244,247,252,0.12)", background: winnerSeats.has(mySeat) ? "rgba(52,211,153,0.12)" : "rgba(244,247,252,0.04)" }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: winnerSeats.has(mySeat) ? "var(--t-good)" : "var(--t-text)" }}>{st.result.headline}</div>
            {st.result.hands && st.result.hands.length > 1 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 3, paddingTop: 7, marginTop: 7, borderTop: "1px solid rgba(244,247,252,0.08)" }}>
                {st.result.hands.map((h) => <div key={h.seat} style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 11.5, color: winnerSeats.has(h.seat) ? "var(--t-good)" : "var(--t-mid)", fontWeight: winnerSeats.has(h.seat) ? 600 : 400 }}><span>{st.seats[h.seat] ? st.seats[h.seat].name : "Player"}</span><span>{h.desc}</span></div>)}
              </div>
            )}
          </div>
        )}
      </div>

      {me ? (
        <div className="hero-seat" style={{ borderColor: myTurn ? "rgba(52,211,153,0.6)" : "rgba(244,247,252,0.08)", boxShadow: myTurn ? "0 0 22px rgba(52,211,153,0.2)" : "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <div style={{ position: "relative", width: 44, height: 44, flexShrink: 0 }}>
              {peekOpen && <div className="peek-badge hero" aria-label="You're looking at your cards"><Icon name="eye" size={11} stroke={2.4} /></div>}
              {(me.prestige || 0) >= 5 && <CrownMark />}
              {myTurn && (<svg width="44" height="44" style={{ position: "absolute", top: 0, left: 0, transform: "rotate(-90deg)" }}>
                <circle cx="22" cy="22" r="20" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2.5" />
                <circle cx="22" cy="22" r="20" fill="none" stroke={secsLeft < 8 ? "#FF6B6B" : "#34D399"} strokeWidth="2.5" strokeDasharray={2 * Math.PI * 20} strokeDashoffset={2 * Math.PI * 20 * (1 - secsLeft / TURN_SECS)} style={{ transition: "stroke-dashoffset .25s linear" }} strokeLinecap="round" /></svg>)}
              <div style={{ position: "absolute", top: 3, left: 3, width: 38, height: 38, borderRadius: "50%", background: "var(--t-panel2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, overflow: "hidden", opacity: me.folded && me.inHand ? 0.45 : 1 }}>{avatarOf(me, 38)}</div>
              {st.dealer === mySeat && <div className="dealer-chip" style={{ bottom: -1, right: -1 }}>D</div>}
              {me.emote && serverNow - me.emote.at < 3500 && <div key={me.emote.at} className="emote-bubble">{me.emote.e}</div>}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}><span className={pnameCls(me.prestige)}>{me.name}</span></div>
              <div className="num" style={{ fontSize: 12, color: "var(--t-mid)" }}>{me.stack.toLocaleString()}</div>
              {me.bet > 0 && <div className="chip-badge" style={{ marginTop: 3 }}><ChipStack amount={me.bet} small set={chipSet} />{me.bet.toLocaleString()}</div>}
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, position: "relative" }}>
            {reveal[mySeat] && st.stage === "showdown" ? reveal[mySeat].map((c) => <div key={c.id} className={`card big${winnerSeats.has(mySeat) ? " win" : ""}`}><div style={{ color: suitColor[c.s] }}>{rankLabel(c.r)}</div><div style={{ color: suitColor[c.s], fontSize: "0.85em" }}>{SUIT_GLYPH[c.s]}</div></div>)
              : myCards && me.inHand && !me.folded && betting ? <PeekCards key={`opk${st.handNo}`} cards={myCards} suitColor={suitColor} omaha={false} delayFor={(i) => 0.5 + i * 0.12} open={peekOpen} setOpen={(v) => { setPeekOpen(v); if (v) sound.flip(1); send("peek", { on: v }, true); }} />
              : myCards && me.inHand ? myCards.map((c) => <div key={c.id} className="card big mucked"><div style={{ color: suitColor[c.s] }}>{rankLabel(c.r)}</div><div style={{ color: suitColor[c.s], fontSize: "0.85em" }}>{SUIT_GLYPH[c.s]}</div></div>)
              : (<><div className="card big back" style={{ opacity: 0.35 }} /><div className="card big back" style={{ opacity: 0.35 }} /></>)}
          </div>
        </div>
      ) : (
        <div className="hero-seat ot-watch">
          <div style={{ fontSize: 13.5, fontWeight: 700 }}>Pick a seat</div>
          <div style={{ fontSize: 12, color: "var(--t-mid)" }}>{row.friendly ? `Friendly table. Everyone sits with ${(row.bb * 100).toLocaleString()} free chips.` : `Buy in ${lo.toLocaleString()} to ${hi.toLocaleString()} from your ${data.chips.toLocaleString()} chips.`}</div>
        </div>
      )}

      <div className="controls">
        {showRaise && myTurn && raisePanel()}
        {myTurn ? (
          <div style={{ display: "flex", width: "100%", gap: 8 }}>
            <button className="btn btn-fold" onClick={() => { vibrate(20); setShowRaise(false); send("act", { move: "fold" }); }}>Fold</button>
            {toCall <= 0 ? <button className="btn btn-go" onClick={() => { vibrate(15); send("act", { move: "check" }); }}>Check</button>
              : <button className="btn btn-go" onClick={() => { vibrate(15); send("act", { move: "call" }); }}>Call {Math.min(toCall, me.stack).toLocaleString()}</button>}
            {!showRaise ? <button className="btn" disabled={me.stack <= toCall} onClick={() => setShowRaise(true)}>{st.currentBet ? "Raise" : "Bet"}</button> : <button className="btn" onClick={() => { setShowRaise(false); setCustom(false); }}>Cancel</button>}
          </div>
        ) : me && me.out ? (
          <div style={{ display: "flex", width: "100%", gap: 8, alignItems: "center" }}>
            <div style={{ flex: 1, fontSize: 12.5, color: "var(--t-mid)" }}>{me.stack > 0 ? "You're sitting out." : "You're out of chips."}</div>
            {me.stack > 0 ? <button className="btn btn-raise" style={{ flex: "none" }} onClick={() => send("back")}>I'm back</button>
              : <button className="btn btn-raise" style={{ flex: "none" }} onClick={() => { setBuyIn(row.friendly ? row.bb * 100 : Math.min(hi, Math.max(lo, Math.min(data.chips, row.bb * 50)))); setSheet({ kind: "rebuy" }); }}>Rebuy</button>}
          </div>
        ) : iWonUncontested ? (
          <button className="btn show-btn" style={{ width: "100%" }} onClick={() => send("show")}><Icon name="eye" size={14} stroke={2.2} />Show cards</button>
        ) : me ? (
          <div style={{ fontSize: 12.5, color: "var(--t-faint)", padding: "12px 0" }}>{st.stage === "waiting" ? (st.seats.filter(Boolean).length < 2 ? "Invite friends to start" : "Starting soon") : st.stage === "showdown" ? (nextIn ? `Next hand in ${nextIn}` : "Next hand coming") : me.folded ? "You folded. Waiting for the hand to finish." : turnName ? `Waiting on ${turnName}` : "Waiting"}</div>
        ) : (
          <button className="btn btn-raise" style={{ width: "100%" }} onClick={openInvite}>Invite friends</button>
        )}
      </div>

      {sheet && sheet.kind === "sit" && (
        <Modal title={`Seat ${sheet.seat + 1}`} onClose={() => setSheet(null)}>
          {row.friendly ? <p className="sheet-body" style={{ marginTop: 0 }}>Friendly table. You sit with {(row.bb * 100).toLocaleString()} free chips. Your bankroll isn't touched.</p> : (<>
            <p className="sheet-body" style={{ marginTop: 0 }}>Comes out of your {data.chips.toLocaleString()} chips. Whatever you have when you leave goes back.</p>
            <div className="slider-row"><input type="range" min={lo} max={Math.min(hi, data.chips)} step={row.bb} value={buyIn} onChange={(e) => setBuyIn(Number(e.target.value))} style={{ flex: 1 }} aria-label="Buy in" /><span className="num" style={{ fontWeight: 700, minWidth: 64, textAlign: "right" }}>{buyIn.toLocaleString()}</span></div>
          </>)}
          <button className="btn btn-raise" style={{ width: "100%", marginTop: 14 }} onClick={async () => { const seat = sheet.seat; setSheet(null); if (!row.friendly) await cloud.pushSave(account, data, publicProfile(data)).catch(() => {}); send("sit", { seat, buyIn }); }}>{row.friendly ? "Sit down" : `Buy in for ${buyIn.toLocaleString()}`}</button>
        </Modal>
      )}
      {sheet && sheet.kind === "rebuy" && (
        <Modal title="Rebuy" onClose={() => setSheet(null)}>
          {row.friendly ? <p className="sheet-body" style={{ marginTop: 0 }}>Reload {(row.bb * 100).toLocaleString()} free chips.</p> : (
            <div className="slider-row"><input type="range" min={lo} max={Math.max(lo, Math.min(hi, data.chips))} step={row.bb} value={buyIn} onChange={(e) => setBuyIn(Number(e.target.value))} style={{ flex: 1 }} aria-label="Rebuy amount" /><span className="num" style={{ fontWeight: 700, minWidth: 64, textAlign: "right" }}>{buyIn.toLocaleString()}</span></div>
          )}
          <button className="btn btn-raise" style={{ width: "100%", marginTop: 14 }} disabled={!row.friendly && data.chips < lo} onClick={async () => { setSheet(null); if (!row.friendly) await cloud.pushSave(account, data, publicProfile(data)).catch(() => {}); send("rebuy", { amount: buyIn }); }}>{row.friendly ? "Reload" : data.chips < lo ? "Not enough chips" : `Rebuy ${buyIn.toLocaleString()}`}</button>
        </Modal>
      )}
      {sheet && sheet.kind === "leave" && (
        <Modal title="Leave the table?" onClose={() => setSheet(null)}>
          <p className="sheet-body" style={{ marginTop: 0 }}>{me && me.inHand && !me.folded && betting ? "You'll fold this hand. " : ""}{row.friendly ? "Friendly chips stay here." : `Your ${me ? me.stack.toLocaleString() : 0} chips go back to your bankroll.`}</p>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn" onClick={() => setSheet(null)}>Stay</button>
            <button className="btn btn-raise" onClick={async () => { setSheet(null); await send("leave"); onClaim(); onExit(); }}>Leave</button>
          </div>
        </Modal>
      )}
      {sheet && sheet.kind === "emote" && (
        <Modal title="React" onClose={() => setSheet(null)}>
          <div className="emote-grid">{myEmotes.map((e) => <button key={e} className="emote-btn" onClick={() => { setSheet(null); send("emote", { e }, true); }}>{e}</button>)}</div>
        </Modal>
      )}
      {sheet && sheet.kind === "invite" && (
        <Modal title="Invite friends" onClose={() => setSheet(null)}>
          <div className="code-card"><div style={{ fontSize: 11, color: "var(--t-mut)", fontWeight: 700, letterSpacing: "0.08em" }}>TABLE CODE</div><div className="code-big">{row.code}</div></div>
          <button className="btn" style={{ width: "100%", marginBottom: 12 }} onClick={async () => { try { if (navigator.share) await navigator.share({ title: "felt", text: shareText, url: shareLink }); else { await navigator.clipboard.writeText(`${shareText} ${shareLink}`); flash("Invite link copied"); } } catch (e) { /* cancelled */ } }}><Icon name="share" size={14} /> Share invite link</button>
          <div className="friend-sub">Your friends</div>
          <div className="list" style={{ gap: 6, maxHeight: "40vh", overflowY: "auto" }}>
            {friends === null && <div className="empty">Loading…</div>}
            {friends && friends.length === 0 && <div className="empty">No friends yet. Add them from your Profile.</div>}
            {(friends || []).map((f) => {
              const seated = st.seats.some((s) => s && s.uid === f.id);
              return (
                <div key={f.id} className="friend-row">
                  <PlayerAvatar p={f} size={32} />
                  <div style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 650 }}>{f.display_name}<div style={{ fontSize: 11, color: "var(--t-mut)", fontWeight: 400 }}>@{f.username}</div></div>
                  <button className="btn btn-sm" disabled={seated || invited[f.id]} onClick={async () => { setInvited((m) => ({ ...m, [f.id]: true })); try { await api("invite", { tableId, to: f.id }); sound.tap(); } catch (e) { flash(e.message); setInvited((m) => ({ ...m, [f.id]: false })); } }}>{seated ? "Here" : invited[f.id] ? "Invited" : "Invite"}</button>
                </div>
              );
            })}
          </div>
        </Modal>
      )}
    </div>
  );
}

// Only shows for accounts on the server's admin list, and the server checks again on every action.
function AdminModal({ onClose }) {
  const [tab, setTab] = useState("chips");
  const [username, setUsername] = useState(""); const [amount, setAmount] = useState(10000); const [note, setNote] = useState(""); const [everyone, setEveryone] = useState(false);
  const [player, setPlayer] = useState(null); const [msg, setMsg] = useState(null); const [busy, setBusy] = useState(false); const [tables, setTables] = useState(null);
  const run = async (fn) => { setBusy(true); setMsg(null); try { await fn(); } catch (e) { setMsg({ ok: false, text: e.message }); } setBusy(false); };
  const lookup = () => run(async () => { const r = await api("admin", { op: "lookup", username }); setPlayer(r.player); });
  const give = (sign) => run(async () => {
    const amt = Math.abs(Math.trunc(Number(amount) || 0)) * sign;
    const r = await api("admin", { op: "give", amount: amt, note, everyone, username });
    setMsg({ ok: true, text: everyone ? `${amt > 0 ? "Sent" : "Took"} ${Math.abs(amt).toLocaleString()} ${amt > 0 ? "to" : "from"} ${r.count} players.` : `${amt > 0 ? "Sent" : "Took"} ${Math.abs(amt).toLocaleString()} chips ${amt > 0 ? "to" : "from"} @${r.player}. Lands within a minute.` });
  });
  const loadTables = () => run(async () => { const r = await api("admin", { op: "tables" }); setTables(r.tables); });
  useEffect(() => { if (tab === "tables" && tables === null) loadTables(); }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Modal title="Admin" onClose={onClose} width={400}>
      <div className="seg" style={{ marginBottom: 12 }}>
        <button className={`segbtn${tab === "chips" ? " on" : ""}`} onClick={() => setTab("chips")}>Chips</button>
        <button className={`segbtn${tab === "player" ? " on" : ""}`} onClick={() => setTab("player")}>Look up</button>
        <button className={`segbtn${tab === "tables" ? " on" : ""}`} onClick={() => setTab("tables")}>Tables</button>
      </div>
      {tab === "chips" && (<div className="auth-form">
        <SettingRow label="Everyone" sub="Send to every player with an account"><Toggle on={everyone} onClick={() => setEveryone((x) => !x)} label="Everyone" /></SettingRow>
        {!everyone && <div className="auth-at"><b>@</b><input className="input" value={username} onChange={(e) => setUsername(cleanUsername(e.target.value))} placeholder="username" autoCapitalize="none" autoCorrect="off" aria-label="Username" /></div>}
        <div className="stake-grid">{[1000, 10000, 100000, 1000000].map((v) => <button key={v} className={`stake-btn${Number(amount) === v ? " on" : ""}`} onClick={() => setAmount(v)}>{shortNum(v)}</button>)}</div>
        <input className="input num" type="number" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} aria-label="Amount" />
        <input className="input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={60} placeholder="Note they'll see (optional)" aria-label="Note" />
        {msg && <div className={msg.ok ? "friend-msg ok" : "auth-err"}>{msg.text}</div>}
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" disabled={busy || (!everyone && username.length < 3)} onClick={() => give(-1)}>Take</button>
          <button className="btn btn-raise" disabled={busy || (!everyone && username.length < 3)} onClick={() => give(1)}>{busy ? "…" : "Send chips"}</button>
        </div>
      </div>)}
      {tab === "player" && (<div className="auth-form">
        <div style={{ display: "flex", gap: 8 }}>
          <div className="auth-at" style={{ flex: 1 }}><b>@</b><input className="input" value={username} onChange={(e) => setUsername(cleanUsername(e.target.value))} placeholder="username" autoCapitalize="none" aria-label="Username" /></div>
          <button className="btn btn-sm" disabled={busy || username.length < 3} onClick={lookup}>Find</button>
        </div>
        {msg && !msg.ok && <div className="auth-err">{msg.text}</div>}
        {player && (
          <div className="fp-stats" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
            <div><b>{player.display_name}</b><span>@{player.username}</span></div>
            <div><b className="num">{player.chips == null ? "no save" : player.chips.toLocaleString()}</b><span>Chips</span></div>
            <div><b>{player.placed ? rankName(player.rating) : "Unranked"}</b><span>{player.placed ? `${player.rating} RP` : "Rank"}</span></div>
            <div><b className="num">{player.prestige || 0}</b><span>Prestige</span></div>
          </div>
        )}
      </div>)}
      {tab === "tables" && (<div>
        {msg && !msg.ok && <div className="auth-err" style={{ marginBottom: 8 }}>{msg.text}</div>}
        {tables === null ? <div className="empty">Loading…</div> : tables.length === 0 ? <div className="empty">No open tables.</div> : (
          <div className="list" style={{ gap: 6, maxHeight: "50vh", overflowY: "auto" }}>
            {tables.map((t) => (
              <div key={t.id} className="friend-row">
                <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13.5, fontWeight: 700 }}>{t.code} <span className="num" style={{ fontWeight: 500, color: "var(--t-mut)" }}>{t.sb}/{t.bb}{t.friendly ? " · friendly" : ""}</span></div><div style={{ fontSize: 11, color: "var(--t-mut)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.players.length ? t.players.join(", ") : "Empty"} · {timeAgo(new Date(t.updated_at).getTime())}</div></div>
                <button className="btn btn-sm" disabled={busy} onClick={() => run(async () => { await api("admin", { op: "close", tableId: t.id }); setTables((l) => l.filter((x) => x.id !== t.id)); })}>Close</button>
              </div>
            ))}
          </div>
        )}
        <div style={{ fontSize: 11, color: "var(--t-faint)", marginTop: 10 }}>Closing a table sends everyone's chips back to them.</div>
      </div>)}
    </Modal>
  );
}

// Get felt on the home screen like a real app, then let it ping you
function InstallCard({ onDismiss, prompt }) {
  return (
    <div className="app-card">
      <img src="/icon-192.png" alt="" className="app-card-ic" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 750 }}>Get the felt app</div>
        <div style={{ fontSize: 11.5, color: "var(--t-sub)", marginTop: 2, lineHeight: 1.4 }}>{prompt ? "Full screen, one tap from your home screen, and notifications." : <>Tap <span className="share-ic"><Icon name="share" size={11} stroke={2.4} /></span> then <b>Add to Home Screen</b>. Full screen, plus notifications.</>}</div>
      </div>
      {prompt && <button className="btn btn-sm btn-raise" onClick={prompt}>Install</button>}
      <button className="iconbtn" onClick={onDismiss} aria-label="Not now"><Icon name="close" size={12} /></button>
    </div>
  );
}
function NotifyCard({ onEnable, onDismiss, busy }) {
  return (
    <div className="app-card notify">
      <div className="app-card-ic bell"><Icon name="flame" size={18} stroke={2} /></div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 750 }}>Turn on notifications</div>
        <div style={{ fontSize: 11.5, color: "var(--t-sub)", marginTop: 2 }}>Know when a friend invites you and when it's your turn.</div>
      </div>
      <button className="btn btn-sm btn-raise" disabled={busy} onClick={onEnable}>{busy ? "…" : "Turn on"}</button>
      <button className="iconbtn" onClick={onDismiss} aria-label="Not now"><Icon name="close" size={12} /></button>
    </div>
  );
}

// Home screen entry: make a table, join one with a code, or get back to one you're sitting at
function FriendsTableCard({ onOpen }) {
  return (
    <button className="ft-card" onClick={onOpen}>
      <div className="ft-ic"><Icon name="user" size={19} stroke={2} /></div>
      <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
        <div style={{ fontSize: 14.5, fontWeight: 750 }}>Play with friends</div>
        <div style={{ fontSize: 11.5, color: "var(--t-sub)", marginTop: 1 }}>Real people, your own table</div>
      </div>
      <Icon name="chevron" size={15} style={{ color: "var(--t-faint)" }} />
    </button>
  );
}
function FriendsTableModal({ account, data, onClose, onOpenTable, onOpenAuth, onDebit }) {
  const [mode, setMode] = useState("menu");
  const [stake, setStake] = useState(1); const [seats, setSeats] = useState(6); const [friendly, setFriendly] = useState(false);
  const [buyIn, setBuyIn] = useState(0); const [code, setCode] = useState(""); const [busy, setBusy] = useState(false); const [err, setErr] = useState(null);
  const [mine, setMine] = useState(null);
  useEffect(() => { if (!account) return; api("mine").then((r) => setMine(r.tables || [])).catch(() => setMine([])); }, [account]);
  const [sb, bb] = ONLINE_STAKES[stake]; const lo = bb * 20, hi = bb * 100;
  useEffect(() => { setBuyIn(Math.min(hi, Math.max(lo, Math.min(data.chips, bb * 50)))); }, [stake]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!account) {
    return (
      <Modal title="Play with friends" onClose={onClose}>
        <p className="sheet-body" style={{ marginTop: 0 }}>Make an account so your friends can find you and join your table.</p>
        <button className="btn btn-raise" style={{ width: "100%" }} onClick={() => { onClose(); onOpenAuth("signup"); }}>Create account</button>
      </Modal>
    );
  }
  const create = async () => {
    setBusy(true); setErr(null);
    try {
      if (!friendly) await cloud.pushSave(account, data, publicProfile(data));
      const r = await api("create", { sb, bb, friendly, maxSeats: seats, buyIn });
      if (r.debit) onDebit(r.debit);
      onOpenTable(r.tableId);
    } catch (e) { setErr(e.message); }
    setBusy(false);
  };
  const join = async () => {
    setBusy(true); setErr(null);
    try { const r = await api("join", { code }); onOpenTable(r.tableId); } catch (e) { setErr(e.message); }
    setBusy(false);
  };
  const affordable = friendly || data.chips >= lo;
  return (
    <Modal title={mode === "create" ? "New table" : mode === "join" ? "Join a table" : "Play with friends"} onClose={onClose} width={380}>
      {mode === "menu" && (<>
        {mine && mine.length > 0 && (<>
          <div className="friend-sub">You're sitting at</div>
          <div className="list" style={{ gap: 6, marginBottom: 12 }}>
            {mine.map((t) => <button key={t.id} className="row" onClick={() => onOpenTable(t.id)}><div style={{ textAlign: "left" }}><div className="row-title">Table {t.code}</div><div className="row-sub num">{t.sb}/{t.bb} · {t.players} {t.players === 1 ? "player" : "players"}{t.friendly ? " · Friendly" : ""}</div></div><Icon name="chevron" size={15} /></button>)}
          </div>
        </>)}
        <div className="list" style={{ gap: 8 }}>
          <button className="row" onClick={() => setMode("create")}><div style={{ textAlign: "left" }}><div className="row-title">Start a table</div><div className="row-sub">Pick the blinds, invite your friends</div></div><Icon name="chevron" size={15} /></button>
          <button className="row" onClick={() => setMode("join")}><div style={{ textAlign: "left" }}><div className="row-title">Join with a code</div><div className="row-sub">Got a 4-letter code from a friend?</div></div><Icon name="chevron" size={15} /></button>
        </div>
      </>)}
      {mode === "create" && (<>
        <div className="friend-sub">Blinds</div>
        <div className="stake-grid">{ONLINE_STAKES.map(([s, b], i) => <button key={b} className={`stake-btn${stake === i ? " on" : ""}`} onClick={() => setStake(i)}><span className="num">{shortNum(s)}/{shortNum(b)}</span></button>)}</div>
        <div className="friend-sub" style={{ marginTop: 12 }}>Seats</div>
        <div className="seg">{[2, 4, 6, 9].map((n) => <button key={n} className={`segbtn${seats === n ? " on" : ""}`} onClick={() => setSeats(n)}>{n === 2 ? "Heads-up" : `${n} seats`}</button>)}</div>
        <SettingRow label="Friendly table" sub={friendly ? `Everyone gets ${(bb * 100).toLocaleString()} free chips. Bankrolls aren't touched.` : "Real chips. Buy in from your bankroll, cash out when you leave."}>
          <Toggle on={friendly} onClick={() => setFriendly((f) => !f)} label="Friendly table" />
        </SettingRow>
        {!friendly && (affordable ? (
          <div style={{ marginTop: 4 }}>
            <div className="friend-sub">Your buy in</div>
            <div className="slider-row"><input type="range" min={lo} max={Math.min(hi, data.chips)} step={bb} value={buyIn} onChange={(e) => setBuyIn(Number(e.target.value))} style={{ flex: 1 }} aria-label="Buy in" /><span className="num" style={{ fontWeight: 700, minWidth: 64, textAlign: "right" }}>{buyIn.toLocaleString()}</span></div>
          </div>
        ) : <div className="auth-err" style={{ marginTop: 8 }}>You need {lo.toLocaleString()} chips for these blinds. Pick lower blinds or make it a friendly table.</div>)}
        {err && <div className="auth-err" style={{ marginTop: 10 }}>{err}</div>}
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <button className="btn" onClick={() => setMode("menu")}>Back</button>
          <button className="btn btn-raise" disabled={busy || !affordable} onClick={create}>{busy ? "Making it…" : "Create table"}</button>
        </div>
      </>)}
      {mode === "join" && (<>
        <input className="input code-input" value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4))} placeholder="ABCD" autoFocus autoCapitalize="characters" aria-label="Table code" />
        {err && <div className="auth-err" style={{ marginTop: 10 }}>{err}</div>}
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <button className="btn" onClick={() => setMode("menu")}>Back</button>
          <button className="btn btn-raise" disabled={busy || code.length !== 4} onClick={join}>{busy ? "Finding it…" : "Join"}</button>
        </div>
      </>)}
    </Modal>
  );
}

/* =========================================================================
   ACCOUNTS AND FRIENDS
   ========================================================================= */
function PlayerAvatar({ p, size = 40, live = false }) {
  const style = { width: size, height: size, borderRadius: "50%", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--t-panel2)", fontSize: size * 0.48 };
  return (
    <div style={{ position: "relative", flexShrink: 0, width: size, height: size }}>
      <div style={style}>{p && p.photo ? <img src={p.photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /> : (p && p.avatar) || "🙂"}</div>
      {live && <span className="live-dot" style={{ width: Math.max(9, size * 0.26), height: Math.max(9, size * 0.26) }} aria-label="Online" />}
    </div>
  );
}
const presenceLine = (p, online) => (online && online[p.id] ? online[p.id] : p.updated_at ? `Seen ${timeAgo(new Date(p.updated_at).getTime())}` : "Offline");
function AuthModal({ mode, setMode, onClose, onAuthed, account, data }) {
  const [username, setUsername] = useState(""); const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const signup = mode === "signup", pick = mode === "username";
  const submit = async (e) => {
    e.preventDefault(); setErr(""); setBusy(true);
    try {
      let me;
      if (pick) me = await cloud.claimUsername(account, username, publicProfile(data));
      else if (signup) { const prof = publicProfile(data); if (!data.name || data.name === "You") prof.display_name = cleanUsername(username); me = await cloud.signUp({ username, email, password, profile: prof }); }
      else me = await cloud.signIn({ email, password });
      onAuthed(me, pick ? "signup" : mode);
    } catch (e2) { setErr(e2.message || "Something went wrong."); }
    setBusy(false);
  };
  return (
    <Modal title={pick ? "Pick a username" : signup ? "Create your account" : "Sign in"} onClose={onClose}>
      <form onSubmit={submit} className="auth-form">
        {!pick && !signup ? null : (
          <label className="auth-field"><span>Username</span>
            <div className="auth-at"><b>@</b><input className="input" value={username} onChange={(e) => setUsername(cleanUsername(e.target.value).replace(/[^a-z0-9_]/g, ""))} maxLength={16} autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="yourname" autoFocus aria-label="Username" /></div>
            <small>Friends add you with this. Letters, numbers and _ only.</small>
          </label>
        )}
        {!pick && (<>
          <label className="auth-field"><span>Email</span><input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoCapitalize="none" autoComplete="email" placeholder="you@email.com" autoFocus={!signup} aria-label="Email" /></label>
          <label className="auth-field"><span>Password</span><input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={signup ? "new-password" : "current-password"} placeholder={signup ? "6 or more characters" : ""} aria-label="Password" /></label>
        </>)}
        {err && <div className="auth-err" role="alert">{err}</div>}
        <button type="submit" className="btn btn-raise" disabled={busy || (pick ? username.length < 3 : (!email || password.length < (signup ? 6 : 1) || (signup && username.length < 3)))}>{busy ? "One sec…" : pick ? "Save username" : signup ? "Create account" : "Sign in"}</button>
        {!pick && <div className="auth-switch">{signup ? "Already have an account?" : "New to felt?"} <button type="button" onClick={() => { setErr(""); setMode(signup ? "signin" : "signup"); }}>{signup ? "Sign in" : "Create one"}</button></div>}
        {signup && <div className="auth-note">Everything you have now moves into the account.</div>}
      </form>
    </Modal>
  );
}
function FriendProfileModal({ friendId, online = {}, onClose, onRemove, account = null, onAdded }) {
  const [p, setP] = useState(null); const [confirm, setConfirm] = useState(false); const [addMsg, setAddMsg] = useState(null);
  const [rel, setRel] = useState(null); // friend | incoming | outgoing | none
  useEffect(() => { let on = true; cloud.getProfile(friendId).then((x) => on && setP(x || false)).catch(() => on && setP(false)); return () => { on = false; }; }, [friendId]);
  useEffect(() => {
    if (!account || onRemove) return; let on = true;
    cloud.friends(account).then((r) => { if (!on) return; const has = (l) => l.some((x) => x.id === friendId); setRel(has(r.friends) ? "friend" : has(r.incoming) ? "incoming" : has(r.outgoing) ? "outgoing" : "none"); }).catch(() => on && setRel("none"));
    return () => { on = false; };
  }, [account, friendId, onRemove]);
  if (p === null) return <Modal title="Profile" onClose={onClose}><div className="empty">Loading…</div></Modal>;
  if (!p) return <Modal title="Player" onClose={onClose}><div className="empty">Couldn't load this player.</div></Modal>;
  const st = p.stats || {}; const tier = p.placed ? tierForRating(p.rating) : UNRANKED;
  const winRate = st.handsPlayed ? Math.round((st.handsWon / st.handsPlayed) * 100) : 0;
  const live = online[p.id];
  return (
    <Modal title="Profile" onClose={onClose} width={380}>
      <div className="fp-head">
        <div style={{ position: "relative" }}>{(p.prestige || 0) >= 5 && <CrownMark size={22} top={-18} />}<PlayerAvatar p={p} size={84} live={!!live} /></div>
        <div className="fp-name"><span className={pnameCls(p.prestige)}>{p.display_name}</span><PrestigeBadge n={p.prestige} size={20} /></div>
        <div className="fp-user">@{p.username}</div>
        <div className={`fp-status${live ? " on" : ""}`}>{presenceLine(p, online)}</div>
        {p.title && p.title !== "rookie" && <TitleTag k={p.title} size={12.5} style={{ marginTop: 4 }} />}
      </div>
      <div className="fp-rank">
        <TierBadge tier={tier} size={44} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: tier.color }}>{p.placed ? rankName(p.rating) : "Unranked"}</div>
          <div className="num" style={{ fontSize: 12, color: "var(--t-mut)" }}>{p.placed ? `${p.rating.toLocaleString()} RP · peak ${rankName(p.peak || p.rating)}` : "Still in placements"}</div>
        </div>
        <div className="num" style={{ textAlign: "right", fontSize: 13, fontWeight: 700 }}>{st.rankedWins || 0}W {st.rankedLosses || 0}L</div>
      </div>
      <div className="fp-stats">
        <div><b className="num">{shortNum(p.chips || 0)}</b><span>Chips</span></div>
        <div><b className="num">{(st.handsPlayed || 0).toLocaleString()}</b><span>Hands</span></div>
        <div><b className="num">{winRate}%</b><span>Win rate</span></div>
        <div><b className="num">{shortNum(st.biggestPot || 0)}</b><span>Biggest pot</span></div>
        <div><b className="num">{st.bestWinStreak || 0}</b><span>Best streak</span></div>
        <div><b className="num">{st.achievements || 0}</b><span>Achievements</span></div>
      </div>
      {account && !onRemove && account.id !== p.id && rel && (
        <button className={`btn${rel === "friend" || rel === "outgoing" ? "" : " btn-raise"}`} style={{ width: "100%", marginTop: 14 }} disabled={!!addMsg || rel === "friend" || rel === "outgoing"} onClick={async () => { try { const r = await cloud.addFriend(account, p.username); setAddMsg(r.status === "sent" ? "Request sent" : r.status === "accepted" ? "You're friends now" : r.status === "already" ? "Already friends" : "Request pending"); if (onAdded) onAdded(); } catch (e) { setAddMsg(e.message); } }}>{addMsg || (rel === "friend" ? "Friends" : rel === "outgoing" ? "Request sent" : rel === "incoming" ? "Accept friend request" : "Add friend")}</button>
      )}
      {onRemove && <button className="btn" style={{ width: "100%", marginTop: 14, color: confirm ? "var(--t-bad)" : "var(--t-mut)" }} onClick={() => { if (confirm) { onRemove(p.id); onClose(); } else setConfirm(true); }}>{confirm ? "Tap again to remove" : "Remove friend"}</button>}
    </Modal>
  );
}
function timeAgo(t) {
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 2) return "just now"; if (m < 60) return `${m}m ago`; const h = Math.round(m / 60); if (h < 24) return `${h}h ago`; const d = Math.round(h / 24); return d < 30 ? `${d}d ago` : "a while ago";
}
function FriendsSection({ account, online = {}, onOpenAuth, sound }) {
  const [lists, setLists] = useState(null); const [input, setInput] = useState(""); const [msg, setMsg] = useState(null); const [busy, setBusy] = useState(false); const [open, setOpen] = useState(null);
  const refresh = useCallback(() => { if (!account) return; cloud.friends(account).then(setLists).catch(() => setLists((l) => l || { friends: [], incoming: [], outgoing: [], offline: true })); }, [account]);
  useEffect(() => { refresh(); if (!account) return; const t = setInterval(refresh, 20000); return () => clearInterval(t); }, [refresh, account]);
  if (!cloudEnabled()) return null;
  if (!account) {
    return (<>
      <SectionLabel>Friends</SectionLabel>
      <div className="panel acct-cta">
        <div style={{ fontSize: 14.5, fontWeight: 700 }}>Play with your friends</div>
        <div style={{ fontSize: 12.5, color: "var(--t-mid)", marginTop: 3, lineHeight: 1.45 }}>Make an account to add friends, see their rank and stats, and keep your progress safe on any phone.</div>
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button className="btn btn-sm" style={{ flex: 1 }} onClick={() => onOpenAuth("signin")}>Sign in</button>
          <button className="btn btn-sm btn-raise" style={{ flex: 1 }} onClick={() => onOpenAuth("signup")}>Create account</button>
        </div>
      </div>
    </>);
  }
  const add = async (e) => {
    e.preventDefault(); if (!input.trim() || busy) return; setBusy(true); setMsg(null);
    try {
      const r = await cloud.addFriend(account, input);
      const at = `@${r.profile.username}`;
      setMsg({ ok: true, text: r.status === "sent" ? `Request sent to ${at}.` : r.status === "accepted" ? `You and ${at} are friends now.` : r.status === "already" ? `${at} is already your friend.` : `Still waiting on ${at}.` });
      setInput(""); if (sound) sound.tap(); refresh();
    } catch (e2) { setMsg({ ok: false, text: e2.message }); }
    setBusy(false);
  };
  const act = async (fn) => { try { await fn(); if (sound) sound.tap(); } catch (e) { setMsg({ ok: false, text: e.message }); } refresh(); };
  const L0 = lists || { friends: [], incoming: [], outgoing: [] };
  const L = { ...L0, friends: [...L0.friends].sort((a, b) => (online[b.id] ? 1 : 0) - (online[a.id] ? 1 : 0)) };
  const liveCount = L.friends.filter((p) => online[p.id]).length;
  const row = (p, right, onTap, showLive = false) => (
    <div key={p.id} className={`friend-row${onTap ? " tap" : ""}`} onClick={onTap || undefined} role={onTap ? "button" : undefined} tabIndex={onTap ? 0 : undefined}>
      <PlayerAvatar p={p} size={36} live={showLive && !!online[p.id]} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 650, display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap", overflow: "hidden" }}><span className={pnameCls(p.prestige)}>{p.display_name}</span><PrestigeBadge n={p.prestige} size={14} />{p.placed && <span style={{ fontSize: 11, fontWeight: 600, color: tierForRating(p.rating).color }}>{rankName(p.rating)}</span>}</div>
        <div style={{ fontSize: 11, color: showLive && online[p.id] ? "var(--t-good)" : "var(--t-mut)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{showLive ? presenceLine(p, online) : `@${p.username}`}</div>
      </div>
      {right}
    </div>
  );
  return (<>
    <SectionLabel right={liveCount ? `${liveCount} online` : `@${account.username || "you"}`}>Friends</SectionLabel>
    <form onSubmit={add} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
      <div className="auth-at" style={{ flex: 1 }}><b>@</b><input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Add by username" className="input" autoCapitalize="none" autoCorrect="off" spellCheck={false} aria-label="Friend's username" /></div>
      <button type="submit" className="btn btn-sm" disabled={busy || !input.trim()}>{busy ? "…" : "Add"}</button>
    </form>
    {msg && <div className={`friend-msg${msg.ok ? " ok" : ""}`}>{msg.text}</div>}
    {L.incoming.length > 0 && (<>
      <div className="friend-sub">Requests</div>
      <div className="list" style={{ gap: 6, marginBottom: 10 }}>
        {L.incoming.map((p) => row(p, <div style={{ display: "flex", gap: 6 }}><button className="btn btn-sm" onClick={() => act(() => cloud.remove(account, p.id))}>Decline</button><button className="btn btn-sm btn-raise" onClick={() => act(() => cloud.accept(account, p.id))}>Accept</button></div>))}
      </div>
    </>)}
    <div className="list" style={{ gap: 6 }}>
      {lists === null && <div className="empty">Loading friends…</div>}
      {lists && L.friends.length === 0 && <div className="empty">No friends yet. Tell yours your username: @{account.username}</div>}
      {L.friends.map((p) => row(p, <Icon name="chevron" size={14} style={{ color: "var(--t-faint)" }} />, () => setOpen(p.id), true))}
    </div>
    {L.outgoing.length > 0 && (<>
      <div className="friend-sub" style={{ marginTop: 10 }}>Waiting on them</div>
      <div className="list" style={{ gap: 6 }}>
        {L.outgoing.map((p) => row(p, <button className="btn btn-sm" onClick={() => act(() => cloud.remove(account, p.id))}>Cancel</button>))}
      </div>
    </>)}
    {open && <FriendProfileModal friendId={open} online={online} onClose={() => setOpen(null)} onRemove={(id) => act(() => cloud.remove(account, id))} />}
  </>);
}

/* =========================================================================
   PROFILE TAB
   ========================================================================= */
function BankrollChart({ points }) {
  const [hover, setHover] = useState(null);
  const svgRef = useRef(null);
  if (!points || points.length < 2) return <div className="empty" style={{ padding: "26px 0" }}>Your chip graph starts after a few hands.</div>;
  const W = 320, H = 120, P = 6;
  const vals = points.map((p) => p.v);
  let lo = Math.min(...vals), hi = Math.max(...vals);
  if (hi - lo < 10) { hi += 5; lo -= 5; }
  const x = (i) => P + (i / (points.length - 1)) * (W - P * 2);
  const y = (v) => P + (1 - (v - lo) / (hi - lo)) * (H - P * 2);
  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(p.v).toFixed(1)}`).join(" ");
  const area = `${line} L${x(points.length - 1).toFixed(1)} ${H} L${x(0).toFixed(1)} ${H} Z`;
  const first = vals[0], last = vals[vals.length - 1];
  const up = last >= first;
  const color = up ? "var(--t-good)" : "var(--t-bad)";
  const pick = (clientX) => { const r = svgRef.current.getBoundingClientRect(); const fx = (clientX - r.left) / r.width; setHover(Math.max(0, Math.min(points.length - 1, Math.round(((fx * W - P) / (W - P * 2)) * (points.length - 1))))); };
  const h = hover != null ? points[hover] : null;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <div className="num" style={{ fontSize: 22, fontWeight: 700 }}>{(h ? h.v : last).toLocaleString()}</div>
        <div className="num" style={{ fontSize: 12.5, fontWeight: 600, color: h ? "var(--t-mid)" : color }}>{h ? new Date(h.t).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : `${signed(last - first)} over ${points.length} updates`}</div>
      </div>
      <div style={{ position: "relative" }}>
        <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: "100%", height: 120, display: "block", touchAction: "pan-y" }}
          onMouseMove={(e) => pick(e.clientX)} onMouseLeave={() => setHover(null)} onTouchStart={(e) => pick(e.touches[0].clientX)} onTouchMove={(e) => pick(e.touches[0].clientX)} onTouchEnd={() => setHover(null)} role="img" aria-label={`Chip count went from ${first} to ${last}`}>
          <defs><linearGradient id="bkfill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style={{ stopColor: color, stopOpacity: 0.28 }} /><stop offset="1" style={{ stopColor: color, stopOpacity: 0 }} /></linearGradient></defs>
          {[0.25, 0.5, 0.75].map((f) => <line key={f} x1="0" x2={W} y1={H * f} y2={H * f} stroke="rgba(244,247,252,0.06)" strokeWidth="1" vectorEffect="non-scaling-stroke" />)}
          <path d={area} fill="url(#bkfill)" />
          <path d={line} fill="none" style={{ stroke: color }} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          {h && <line x1={x(hover)} x2={x(hover)} y1="0" y2={H} stroke="rgba(244,247,252,0.35)" strokeWidth="1" vectorEffect="non-scaling-stroke" />}
        </svg>
        {h && <div className="chart-dot" style={{ left: `${(x(hover) / W) * 100}%`, top: y(h.v), background: color }} />}
      </div>
      <div className="num" style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: "var(--t-faint)", marginTop: 4 }}>
        <span>Low {Math.min(...vals).toLocaleString()}</span><span>High {Math.max(...vals).toLocaleString()}</span>
      </div>
    </div>
  );
}

function PositionBars({ pos }) {
  const rows = [
    { k: "late", label: "Button and cutoff" },
    { k: "early", label: "Early and middle" },
    { k: "blinds", label: "Blinds" },
  ].map((r) => { const v = (pos && pos[r.k]) || [0, 0]; return { ...r, hands: v[0], wins: v[1], pct: v[0] ? v[1] / v[0] : 0 }; });
  if (rows.every((r) => r.hands === 0)) return <div className="empty" style={{ padding: "18px 0" }}>Play some cash or ranked hands to see this.</div>;
  const best = rows.reduce((a, b) => (b.hands >= 5 && b.pct > a.pct ? b : a), rows[0]);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {rows.map((r) => (
        <div key={r.k}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 5 }}>
            <span style={{ fontWeight: 600 }}>{r.label}</span>
            <span className="num" style={{ color: "var(--t-mid)" }}><b style={{ color: "var(--t-text)" }}>{Math.round(r.pct * 100)}%</b> of {r.hands.toLocaleString()}</span>
          </div>
          <div className="bar" style={{ height: 8 }}><div style={{ width: `${r.pct * 100}%`, background: r === best && r.hands >= 5 ? "var(--t-good)" : "#6FA8FF" }} /></div>
        </div>
      ))}
      <div style={{ fontSize: 11.5, color: "var(--t-faint)" }}>Most players win more from late position. If yours is lower, you might be playing too many hands up front.</div>
    </div>
  );
}

function BestHands({ list, suitColor }) {
  if (!list || list.length === 0) return <div className="empty" style={{ padding: "18px 0" }}>Win a showdown to start your list.</div>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {list.map((b, i) => (
        <div key={i} className="best-row">
          <div className="num best-n">{i + 1}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600 }}>{b.desc}</div>
            <div style={{ fontSize: 11, color: "var(--t-faint)" }}>{new Date(b.at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>
          </div>
          <div style={{ display: "flex", gap: 3 }}>{(b.cards || []).slice(0, 5).map((c) => <MiniCard key={c} code={idToCode(c)} suitColor={suitColor} />)}</div>
        </div>
      ))}
    </div>
  );
}

function ProfileScreen({ data, account, online, legendNo, pushOn, pushBusy, onEnablePush, isAdmin, onOpenAdmin, onOpenAuth, onSignOut, sound, onUpdateName, onSelectAvatar, onSetPhoto, onUsePhoto, onSelectFrame, onAddFriend, onUpdateSettings, onExportData, onImportData, onResetProfile, onEquipTitle, onPrestige }) {
  const importRef = useRef(null);
  const [ladder, setLadder] = useState(false);
  const [transfer, setTransfer] = useState(false);
  const [pasted, setPasted] = useState("");
  const [copied, setCopied] = useState(false);
  const profileCode = transfer ? "felt:" + btoa(unescape(encodeURIComponent(JSON.stringify(data)))) : "";
  const codeRef = useRef(null);
  const copyCode = async () => {
    try { await navigator.clipboard.writeText(profileCode); setCopied(true); }
    catch (e) { if (codeRef.current) { codeRef.current.focus(); codeRef.current.select(); try { document.execCommand("copy"); setCopied(true); } catch (e2) { /* select is the fallback */ } } }
  };
  const [pickingTitle, setPickingTitle] = useState(false);
  const tt = data.titles || defaultTitles();
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(data.name);
  const [friendInput, setFriendInput] = useState("");
  const [pickingAvatar, setPickingAvatar] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const winRate = data.stats.handsPlayed > 0 ? Math.round((data.stats.handsWon / data.stats.handsPlayed) * 100) : 0;
  const rk = data.ranked;
  const placed = isPlaced(rk);
  const tier = tierOf(rk);
  const prog = placed ? rankProgress(rk.rating) : null;
  const frameColor = rk.frame ? RANK_TIERS.find((t) => t.key === rk.frame)?.color : null;
  const skillNow = computeSkill(data.skill);
  const saveName = () => { onUpdateName(nameInput.trim() || "You"); setEditingName(false); };

  return (
    <div className="screen screen-fade">
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button className="iconbtn" onClick={() => setShowSettings(true)} aria-label="Settings"><Icon name="settings" size={14} /></button>
      </div>
      <div style={{ textAlign: "center", margin: "0 0 24px" }}>
        <button onClick={() => setPickingAvatar(true)} className="profile-av" style={{ boxShadow: frameColor ? `0 0 0 3px #0B1426, 0 0 0 6px ${frameColor}` : "none" }} aria-label="Change avatar">{(rk.prestige || 0) >= 5 && <CrownMark size={20} top={-16} />}{data.usePhoto && data.photo ? <img src={data.photo} alt="" className="av-photo" /> : data.avatar}<span className="av-edit"><Icon name="edit" size={11} stroke={2.2} /></span></button>
        {editingName ? (
          <form onSubmit={(e) => { e.preventDefault(); saveName(); }} style={{ display: "flex", gap: 6, justifyContent: "center", alignItems: "center" }}>
            <input autoFocus value={nameInput} maxLength={16} onChange={(e) => setNameInput(e.target.value)} className="input" style={{ width: 160, textAlign: "center", fontWeight: 600 }} aria-label="Display name" />
            <button type="submit" className="iconbtn" aria-label="Save name"><Icon name="check" size={13} /></button>
          </form>
        ) : (
          <button onClick={() => setEditingName(true)} className="name-btn"><span className={pnameCls(rk.prestige)}>{data.name}</span><PrestigeBadge n={rk.prestige} size={20} /><Icon name="edit" size={12} style={{ color: "var(--t-faint)", marginLeft: 6 }} /></button>
        )}
        <button className="title-btn" onClick={() => setPickingTitle(true)} aria-label="Change title"><TitleTag k={tt.equipped} size={12.5} /><Icon name="chevron" size={11} style={{ color: "var(--t-faint)", transform: "rotate(90deg)" }} /></button>
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 8 }}>
          <span className="chip-pill num"><span className="chip-dot" />{data.chips.toLocaleString()}</span>
          <span className="chip-pill" style={{ color: tier.color }}><TierBadge tier={tier} size={16} />{placed ? legendLabel(rk, legendNo) || rankName(rk.rating) : "Unranked"}</span>
          {skillNow && data.skill.hands >= 10 && <span className="chip-pill num">SR {skillNow.sr}</span>}
        </div>
      </div>

      <SectionLabel right={<button className="ranked-info" onClick={() => setLadder(true)}>{placed && rk.peakRating > rk.rating ? `Peak ${rankName(rk.peakRating)}, ` : ""}all ranks<Icon name="chevron" size={11} /></button>}>Ranked</SectionLabel>
      <section className="panel" style={{ marginBottom: 26 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <TierBadge tier={tier} size={46} div={placed ? divisionOf(rk.rating) : null} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: tier.color }}>{placed ? legendLabel(rk, legendNo) || rankName(rk.rating) : "Unranked"}</div>
            <div className="num" style={{ fontSize: 12, color: "var(--t-mut)", marginTop: 1 }}>{placed ? `${Math.round(rk.rating).toLocaleString()} RP${prog.nextLabel ? `, ${prog.toNext} to ${prog.nextLabel}` : ""}` : `${(rk.placementGames || []).length} of ${PLACEMENT_MATCHES} placements played`}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="num" style={{ fontSize: 14, fontWeight: 600 }}>{rk.wins}W {rk.losses}L</div>
            <div className="num" style={{ fontSize: 11, color: "var(--t-mut)" }}>{rk.wins + rk.losses > 0 ? `${Math.round((rk.wins / (rk.wins + rk.losses)) * 100)}% won` : "No matches yet"}</div>
          </div>
        </div>
        {placed ? <div className="bar" style={{ marginTop: 14 }}><div style={{ width: `${prog.pct * 100}%`, background: tier.color }} /></div> : <div style={{ marginTop: 14 }}><PlacementDots games={rk.placementGames || []} /></div>}

        {(rk.recent || []).length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 11.5, color: "var(--t-mut)", marginBottom: 7 }}>{rk.recent.length === 1 ? "Last match" : `Last ${rk.recent.length} matches, newest first`}</div>
            <div style={{ display: "flex", gap: 4 }}>
              {rk.recent.map((m, i) => (
                <div key={i} title={`${m.won ? "Win" : "Loss"}${m.placement ? ", placement" : `, ${signed(m.delta)} RP`}`} className="num" style={{ flex: 1, maxWidth: 34, textAlign: "center", fontSize: 10, fontWeight: 700, padding: "5px 0", borderRadius: 6, color: m.won ? "var(--t-bg)" : "var(--t-bad)", background: m.won ? "var(--t-good)" : "rgba(255,107,107,0.16)" }}>{m.placement ? (m.won ? "W" : "L") : signed(m.delta)}</div>
              ))}
            </div>
          </div>
        )}

        {rk.history.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 11.5, color: "var(--t-mut)", marginBottom: 7 }}>Past seasons</div>
            <div style={{ display: "flex", gap: 12, overflowX: "auto" }}>
              {rk.history.slice().reverse().map((h) => {
                const label = new Date(`${h.seasonId}-15`).toLocaleString("en-US", { month: "short", year: "numeric" });
                return (
                  <div key={h.seasonId} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flexShrink: 0 }}>
                    <TierBadge tier={tierForRating(h.rating)} size={26} />
                    <div style={{ fontSize: 10, color: "var(--t-mut)" }}>{label}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid rgba(244,247,252,0.06)" }}>
          <div style={{ fontSize: 11.5, color: "var(--t-mut)", marginBottom: 9 }}>Avatar frame{rk.frames.length === 0 ? ". Reach Silver to unlock your first." : ""}</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {RANK_TIERS.filter((t) => t.min > 0).map((t) => {
              const owned = rk.frames.includes(t.key);
              const on = rk.frame === t.key;
              return (
                <button key={t.key} disabled={!owned} onClick={() => onSelectFrame(on ? null : t.key)} className="frame-swatch" aria-pressed={on} title={owned ? `${t.label} frame` : `Reach ${t.label} to unlock`}
                  style={{ borderColor: owned ? t.color : "rgba(244,247,252,0.12)", background: on ? `${t.color}33` : "transparent", opacity: owned ? 1 : 0.45 }}>
                  {owned ? <span style={{ width: 8, height: 8, borderRadius: "50%", background: t.color, display: "block" }} /> : <Icon name="lock" size={11} style={{ color: "var(--t-faint)" }} />}
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <SectionLabel>Stats</SectionLabel>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
        <StatCard label="Hands played" value={data.stats.handsPlayed.toLocaleString()} />
        <StatCard label="Win rate" value={`${winRate}%`} />
        <StatCard label="Biggest pot" value={data.stats.biggestPot.toLocaleString()} />
        <StatCard label="Net chips" value={signed(data.stats.netChips || 0)} />
      </div>
      <section className="panel" style={{ marginBottom: 10 }}>
        <div className="panel-label"><Icon name="chart" size={14} stroke={2} />Chip graph</div>
        <BankrollChart points={(data.history || {}).bankroll} />
      </section>
      <section className="panel" style={{ marginBottom: 10 }}>
        <div className="panel-label">Win rate by position</div>
        <PositionBars pos={data.stats.pos} />
      </section>
      <section className="panel" style={{ marginBottom: 26 }}>
        <div className="panel-label"><Icon name="trophy" size={14} stroke={2} />Best hands</div>
        <BestHands list={(data.history || {}).best} suitColor={data.settings.colorblind ? SUIT_COLOR_CB : SUIT_COLOR} />
      </section>

      <SectionLabel right={`${data.achievements.length} of ${ACHIEVEMENTS.length}`}>Achievements</SectionLabel>
      <div className="list" style={{ gap: 6, marginBottom: 26 }}>
        {ACHIEVEMENTS.map((a) => {
          const done = data.achievements.includes(a.id);
          const cur = Math.max(0, Math.min(a.target, data.stats[a.stat] || 0));
          return (
            <div key={a.id} className="ach-row">
              <div className="ach-mark" style={{ background: done ? "var(--t-good)" : "transparent", borderColor: done ? "var(--t-good)" : "rgba(244,247,252,0.18)", color: "var(--t-bg)" }}>{done && <Icon name="check" size={12} stroke={2.6} />}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: done ? "var(--t-text)" : "var(--t-sub)" }}>{a.label}</div>
                <div style={{ fontSize: 11.5, color: "var(--t-mut)" }}>{a.desc}</div>
              </div>
              {!done && <div className="num" style={{ fontSize: 11.5, color: "var(--t-faint)" }}>{cur.toLocaleString()}/{a.target.toLocaleString()}</div>}
            </div>
          );
        })}
      </div>

      <FriendsSection account={account} online={online} onOpenAuth={onOpenAuth} sound={sound} />

      {ladder && <RankLadderModal ranked={rk} legendNo={legendNo} onClose={() => setLadder(false)} />}
      {transfer && (
        <Modal title="Move my profile" onClose={() => setTransfer(false)} width={400}>
          <div style={{ fontSize: 12.5, color: "var(--t-mid)", marginBottom: 8 }}>1. On the old copy, copy this code.</div>
          <textarea ref={codeRef} readOnly value={profileCode} className="input code-box" onFocus={(e) => e.target.select()} aria-label="Your profile code" />
          <button className="btn btn-sm" style={{ marginTop: 8, width: "100%" }} onClick={copyCode}>{copied ? "Copied" : "Copy code"}</button>
          <div style={{ fontSize: 12.5, color: "var(--t-mid)", margin: "18px 0 8px" }}>2. On the new copy, paste it here.</div>
          <textarea value={pasted} onChange={(e) => setPasted(e.target.value)} className="input code-box" placeholder="Paste your code" aria-label="Paste a profile code" />
          <button className="btn btn-raise btn-sm" style={{ marginTop: 8, width: "100%" }} disabled={!pasted.trim()} onClick={() => { onImportData(pasted); setTransfer(false); }}>Import</button>
          <div style={{ fontSize: 11.5, color: "var(--t-faint)", marginTop: 10 }}>Importing replaces the profile on this copy.</div>
        </Modal>
      )}
      {pickingTitle && (
        <Modal title="Titles" onClose={() => setPickingTitle(false)} width={400}>
          <div style={{ fontSize: 12, color: "var(--t-mut)", margin: "-6px 2px 10px" }}>{tt.owned.length} of {TITLES.length} unlocked. Earn them by playing or buy some in the shop.</div>
          <div style={{ maxHeight: "60vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
            {TITLES.slice().sort((a, b) => (tt.owned.includes(b.key) ? 1 : 0) - (tt.owned.includes(a.key) ? 1 : 0)).map((t) => {
              const owned = tt.owned.includes(t.key); const on = tt.equipped === t.key;
              return (
                <button key={t.key} className={`title-row${on ? " on" : ""}`} disabled={!owned} onClick={() => { onEquipTitle(t.key); setPickingTitle(false); }} style={{ opacity: owned ? 1 : 0.55, cursor: owned ? "pointer" : "default", textAlign: "left" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <TitleTag k={t.key} size={14} />
                    <div style={{ fontSize: 11, color: "var(--t-mut)", marginTop: 2 }}>{t.how || (t.cost ? `Shop, ${t.cost.toLocaleString()} chips` : "")}</div>
                  </div>
                  {on ? <span className="cos-tag eq">Equipped</span> : owned ? <span className="cos-tag">Equip</span> : <Icon name="lock" size={13} style={{ color: "var(--t-faint)" }} />}
                </button>
              );
            })}
          </div>
        </Modal>
      )}
      {pickingAvatar && (
        <Modal title="Choose avatar" onClose={() => setPickingAvatar(false)}>
          <div className="photo-row">
            <label className="btn photo-up">
              <Icon name="camera" size={15} stroke={2} />{data.photo ? "New photo" : "Upload a photo"}
              <input type="file" accept="image/*" onChange={async (e) => { const f = e.target.files && e.target.files[0]; e.target.value = ""; if (!f) return; try { const url = await shrinkPhoto(f); onSetPhoto(url); setPickingAvatar(false); } catch (err) { onSetPhoto(null, "That photo didn't load. Try another one."); } }} />
            </label>
            {data.photo && <button className={`avatar-tile photo-tile${data.usePhoto ? " on" : ""}`} onClick={() => { onUsePhoto(true); setPickingAvatar(false); }} aria-pressed={!!data.usePhoto} aria-label="Use my photo"><img src={data.photo} alt="" /></button>}
            {data.photo && <button className="iconbtn" onClick={() => onSetPhoto(null)} aria-label="Remove photo"><Icon name="close" size={13} /></button>}
          </div>
          <div className="avatar-grid">
            {data.unlocked.map((emoji) => (
              <button key={emoji} onClick={() => { onSelectAvatar(emoji); setPickingAvatar(false); }} className="avatar-tile" style={{ borderColor: emoji === data.avatar && !data.usePhoto ? "var(--t-good)" : undefined }} aria-pressed={emoji === data.avatar && !data.usePhoto}>
                <div style={{ fontSize: 26 }}>{emoji}</div>
              </button>
            ))}
          </div>
          <div style={{ fontSize: 12, color: "var(--t-mut)", marginTop: 12, textAlign: "center" }}>Buy more in the shop.</div>
        </Modal>
      )}

      {showSettings && (
        <Modal title="Settings" onClose={() => { setShowSettings(false); setConfirmReset(false); }}>
          {account && (
            <SettingRow label="Notifications" sub={pushOn ? "On for invites and your turn" : isIOS() && !isStandalone() ? "Add felt to your Home Screen first" : "Invites and your turn at friends tables"}>
              {pushOn ? <span className="cos-tag eq">On</span> : <button className="btn btn-sm btn-raise" disabled={pushBusy || (isIOS() && !isStandalone())} onClick={onEnablePush}>Turn on</button>}
            </SettingRow>
          )}
          {isAdmin && (
            <SettingRow label="Admin" sub="Send chips, look up players, close tables">
              <button className="btn btn-sm btn-raise" onClick={() => { setShowSettings(false); onOpenAdmin(); }}>Open</button>
            </SettingRow>
          )}
          {cloudEnabled() && (
            <SettingRow label={account ? `@${account.username || "player"}` : "Account"} sub={account ? `Saving online · ${account.email || ""}` : "Not signed in. Progress only saves on this phone."}>
              {account ? <button className="btn btn-sm" onClick={() => { onSignOut(); setShowSettings(false); }}>Sign out</button> : <button className="btn btn-sm btn-raise" onClick={() => { onOpenAuth("signup"); setShowSettings(false); }}>Sign up</button>}
            </SettingRow>
          )}
          <SettingRow label="Colorblind suits" sub="Blue and black instead of red and black">
            <Toggle on={data.settings.colorblind} onClick={() => onUpdateSettings({ colorblind: !data.settings.colorblind })} label="Colorblind suits" />
          </SettingRow>
          <SettingRow label="Card size" sub="Bigger hole cards">
            <SegToggle options={[{ v: "normal", l: "Normal" }, { v: "large", l: "Large" }]} value={data.settings.cardSize} onChange={(v) => onUpdateSettings({ cardSize: v })} />
          </SettingRow>
          <SettingRow label="Animation speed" sub="How fast the table moves">
            <SegToggle options={[{ v: "normal", l: "Normal" }, { v: "fast", l: "Fast" }]} value={data.settings.animSpeed} onChange={(v) => onUpdateSettings({ animSpeed: v })} />
          </SettingRow>
          <SettingRow label="Squeeze your cards" sub="Peel your hole cards to reveal them">
            <Toggle on={data.settings.squeeze !== false} onClick={() => onUpdateSettings({ squeeze: data.settings.squeeze === false })} label="Squeeze your cards" />
          </SettingRow>
          <SettingRow label="Run it twice" sub="When you're all in, deal the board twice and split">
            <Toggle on={!!data.settings.runTwice} onClick={() => onUpdateSettings({ runTwice: !data.settings.runTwice })} label="Run it twice" />
          </SettingRow>
          <div className="list" style={{ marginTop: 16, gap: 8 }}>
            <button className="row" onClick={onExportData}>
              <div style={{ textAlign: "left" }}><div className="row-title">Export my data</div><div className="row-sub">Download your profile as a file</div></div>
              <Icon name="download" size={15} style={{ color: "var(--t-mid)" }} />
            </button>
            <button className="row" onClick={() => { setTransfer(true); setShowSettings(false); setCopied(false); setPasted(""); }}>
              <div style={{ textAlign: "left" }}><div className="row-title">Move my profile</div><div className="row-sub">Copy a code here, paste it into another copy of felt</div></div>
              <Icon name="share" size={15} style={{ color: "var(--t-mid)" }} />
            </button>
            <button className="row" onClick={() => importRef.current && importRef.current.click()}>
              <div style={{ textAlign: "left" }}><div className="row-title">Import from a file</div><div className="row-sub">Use a file you exported before</div></div>
              <Icon name="download" size={15} style={{ color: "var(--t-mid)", transform: "rotate(180deg)" }} />
            </button>
            <input ref={importRef} type="file" accept="application/json,.json" style={{ display: "none" }} onChange={(e) => { onImportData(e.target.files && e.target.files[0]); e.target.value = ""; }} />
            <button className="row" style={{ borderColor: confirmReset ? "rgba(255,107,107,0.5)" : undefined }} onClick={() => { if (confirmReset) { onResetProfile(); setShowSettings(false); setConfirmReset(false); } else setConfirmReset(true); }}>
              <div style={{ textAlign: "left" }}><div className="row-title" style={{ color: "var(--t-bad)" }}>{confirmReset ? "Tap again to reset" : "Reset profile"}</div><div className="row-sub">{confirmReset ? "This can't be undone" : "Wipes chips, stats, rank, and settings"}</div></div>
              <Icon name="reset" size={15} style={{ color: "var(--t-bad)" }} />
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
function SettingRow({ label, sub, children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 0", borderBottom: "1px solid rgba(244,247,252,0.06)" }}>
      <div>
        <div style={{ fontSize: 13.5, fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: 11.5, color: "var(--t-mut)" }}>{sub}</div>
      </div>
      {children}
    </div>
  );
}
function Toggle({ on, onClick, label }) {
  return (
    <button onClick={onClick} role="switch" aria-checked={on} aria-label={label} style={{ width: 44, height: 26, borderRadius: 14, border: "none", background: on ? "var(--t-good)" : "rgba(244,247,252,0.14)", position: "relative", cursor: "pointer", transition: "background .2s ease", flexShrink: 0 }}>
      <div style={{ position: "absolute", top: 3, left: on ? 21 : 3, width: 20, height: 20, borderRadius: "50%", background: "var(--t-text)", transition: "left .2s ease" }} />
    </button>
  );
}
function SegToggle({ options, value, onChange }) {
  return (
    <div className="seg" style={{ flexShrink: 0 }}>
      {options.map((o) => (
        <button key={o.v} onClick={() => onChange(o.v)} className={`segbtn${value === o.v ? " on" : ""}`} style={{ padding: "6px 10px" }}>{o.l}</button>
      ))}
    </div>
  );
}
function StatCard({ label, value }) {
  return (
    <div className="stat">
      <div className="num" style={{ fontSize: 20, fontWeight: 600, fontFamily: DISPLAY_FONT }}>{value}</div>
      <div style={{ fontSize: 11.5, color: "var(--t-mut)", marginTop: 2 }}>{label}</div>
    </div>
  );
}

/* =========================================================================
   APP SHELL
   ========================================================================= */
const LOADING_MS = 2800;
function LoadingScreen({ fadingOut }) {
  return (
    <div className="loading" style={{ opacity: fadingOut ? 0 : 1, pointerEvents: fadingOut ? "none" : "auto" }}>
      <div className="loading-word">felt</div>
      <div className="loading-suits" aria-hidden="true">
        {["s", "h", "d", "c"].map((s, i) => <span key={s} style={{ color: s === "h" || s === "d" ? "var(--t-bad)" : "var(--t-text)", animationDelay: `${0.25 + i * 0.22}s` }}>{SUIT_GLYPH[s]}</span>)}
      </div>
      <div className="loading-bar"><div /></div>
    </div>
  );
}

// everything a save needs filled in, whether it came from this phone or from your account
function hydrate(d) {
  const merged = { ...defaultData(), ...d, stats: { ...defaultData().stats, ...(d.stats || {}) }, settings: { ...defaultData().settings, ...(d.settings || {}) }, skill: d.skill && d.skill.v === 2 ? { ...defaultSkill(), ...d.skill } : { ...defaultSkill(), ...(d.skill || {}), v: 2, idealSum: ((d.skill && d.skill.hands) || 0) * 0.34, report: undefined, reportSource: undefined } };
  merged.ranked = rolloverSeason(migrateRanked(d.ranked));
  if (merged.ranked.seasonEnd && merged.ranked.seasonEnd.champ && !merged.ranked.seasonEnd.rewarded) { merged.chips = (merged.chips || 0) + PRESTIGE_REWARD; merged.ranked = { ...merged.ranked, seasonEnd: { ...merged.ranked.seasonEnd, rewarded: true } }; }
  merged.stats = { ...merged.stats, pos: { late: [0, 0], early: [0, 0], blinds: [0, 0], ...(merged.stats.pos || {}) } };
  merged.cosmetics = { ...defaultCosmetics(), ...(d.cosmetics || {}) };
  merged.streak = d.streak || { count: 0, last: null };
  merged.challenges = ensureChallenges(d.challenges);
  merged.pass = ensurePass(d.pass);
  merged.history = { bankroll: [], best: [], ...(d.history || {}) };
  merged.titles = { ...defaultTitles(), ...(d.titles || {}) };
  merged.themes = { ...defaultThemes(), ...(d.themes || {}) };
  Object.assign(merged, passBackfill(merged));
  { const earned = newlyEarnedTitles(merged); if (earned.length) merged.titles = { ...merged.titles, owned: [...merged.titles.owned, ...earned.map((t) => t.key)] }; }
  if (merged.history.bankroll.length === 0) merged.history = { ...merged.history, bankroll: [{ t: Date.now(), v: merged.chips }] };
  return merged;
}
// "Local" on the leaderboard means players in your time zone
function myTimeZone() { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || null; } catch (e) { return null; } }
const tzLabel = (tz) => (tz ? tz.split("/").pop().replace(/_/g, " ") : "your area");
// what other players can see about you
function publicProfile(d) {
  const rk = d.ranked || {}; const st = d.stats || {};
  return {
    display_name: (d.name || "Player").slice(0, 24), avatar: d.avatar || "🫵", photo: d.usePhoto && d.photo ? d.photo : null,
    title: (d.titles || {}).equipped || null, rating: Math.round(rk.rating || 0), peak: Math.round(rk.peakRating || rk.rating || 0),
    prestige: rk.prestige || 0, placed: isPlaced(rk), chips: Math.round(d.chips || 0),
    stats: { handsPlayed: st.handsPlayed || 0, handsWon: st.handsWon || 0, biggestPot: st.biggestPot || 0, bestWinStreak: st.bestWinStreak || 0, rankedWins: rk.wins || 0, rankedLosses: rk.losses || 0, achievements: (d.achievements || []).length, tIndex: tournamentIndex((d.skill || {}).tourneys) || 0, tz: myTimeZone() },
  };
}

export default function App() {
  useGoogleFonts();
  const [loaded, setLoaded] = useState(false);
  const [bootDone, setBootDone] = useState(false);
  const [data, setData] = useState(defaultData());
  const [tab, setTab] = useState("home");
  const [inTable, setInTable] = useState(false);
  const [session, setSession] = useState(null); // { mode, tableSize, stakes, buyIn, startChips }
  const [tableKey, setTableKey] = useState(0);
  const [soundOn, setSoundOn] = useState(true);
  const [toast, setToast] = useState(null);
  const [previewTheme, setPreviewTheme] = useState(null);
  const [account, setAccount] = useState(null); // { id, email, username } when signed in
  const [authOpen, setAuthOpen] = useState(null); // "signup" | "signin" | "username"
  const [online, setOnline] = useState({}); // user id -> what they're doing, for everyone in the app right now
  const [onlineTable, setOnlineTable] = useState(null); // id of the friends table you're at
  const [ftOpen, setFtOpen] = useState(false);
  const [invites, setInvites] = useState([]);
  const [inviteNames, setInviteNames] = useState({});
  const [isAdmin, setIsAdmin] = useState(false); const [adminOpen, setAdminOpen] = useState(false);
  const [legendNo, setLegendNo] = useState(null);
  // install + notifications
  const [installPrompt, setInstallPrompt] = useState(null);
  const [pushOn, setPushOn] = useState(false); const [pushBusy, setPushBusy] = useState(false);
  const [hideInstall, setHideInstall] = useState(() => { try { return !!localStorage.getItem("felt-hide-install"); } catch (e) { return false; } });
  const [hideNotify, setHideNotify] = useState(() => { try { return !!localStorage.getItem("felt-hide-notify"); } catch (e) { return false; } });
  useEffect(() => {
    registerSW();
    const onPrompt = (e) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    const onMsg = (e) => { const m = e.data || {}; if (m.type === "open" && m.url) { try { const code = new URL(m.url, window.location.origin).searchParams.get("table"); if (code) openTableCodeRef.current(code); } catch (err) { /* bad url */ } } };
    if ("serviceWorker" in navigator) navigator.serviceWorker.addEventListener("message", onMsg);
    return () => { window.removeEventListener("beforeinstallprompt", onPrompt); if ("serviceWorker" in navigator) navigator.serviceWorker.removeEventListener("message", onMsg); };
  }, []);
  useEffect(() => { if (!account) { setPushOn(false); return; } pushEnabled().then(setPushOn).catch(() => setPushOn(false)); }, [account]);
  const turnOnPush = async () => {
    setPushBusy(true);
    try { await enablePush(); setPushOn(true); showToast({ title: "Notifications on", label: "You'll hear about invites and your turn" }, 2600); }
    catch (e) { showToast({ title: "Notifications", label: e.message }, 3400); }
    setPushBusy(false);
  };
  const dismiss = (key, set) => { set(true); try { localStorage.setItem(key, "1"); } catch (e) { /* private mode */ } };
  const openTableCodeRef = useRef(() => {});
  const champRating = isPlaced(data.ranked) && data.ranked.rating >= 1500 ? Math.round(data.ranked.rating) : null;
  useEffect(() => {
    if (!account || champRating == null) { setLegendNo(null); return; }
    let on = true; const t = setTimeout(() => cloud.legendRank(account, champRating).then((n) => on && setLegendNo(n)).catch(() => {}), 600);
    return () => { on = false; clearTimeout(t); };
  }, [account, champRating]);
  useEffect(() => { if (!account || !account.username) { setIsAdmin(false); return; } api("admin", { op: "check" }).then((r) => setIsAdmin(!!r.admin)).catch(() => setIsAdmin(false)); }, [account]);
  const toastTimer = useRef(null);
  const sound = useSound(soundOn);

  useEffect(() => {
    const minTimer = new Promise((res) => setTimeout(res, LOADING_MS));
    (async () => {
      const [d] = await Promise.all([loadData(), minTimer]);
      if (d) {
        const merged = hydrate(d);
        setData(merged);
        saveData(merged);
      }
      // signed in from before: pull the account's save if it's newer than this phone's
      if (cloudEnabled()) {
        try {
          const me = await cloud.current();
          if (me) {
            setAccount(me);
            const remote = await cloud.loadSave(me);
            if (remote && (remote.savedAt || 0) > ((d && d.savedAt) || 0)) { const m = hydrate(remote); setData(m); saveData(m); }
          }
        } catch (e) { /* offline: keep playing on the local save */ }
      }
      setLoaded(true);
      setTimeout(() => setBootDone(true), 600);
    })();
  }, []);
  const persist = (next) => { const n = { ...next, savedAt: Date.now() }; setData(n); saveData(n); };
  // The server owns your chips and rank. After each save it sends back the real numbers, and anything
  // you earned on this phone since that save stays on top of them.
  const [syncFlag, setSyncFlag] = useState(false);
  useEffect(() => {
    cloud.onSync((r) => {
      if (!r || r.chips == null) return;
      setData((d) => {
        const chips = Math.max(0, Math.round(r.chips + (d.chips - r.sentChips)));
        const rk = d.ranked || {};
        const rating = Math.max(0, Math.round(r.rating + ((rk.rating || 0) - r.sentRating)));
        const prestige = Math.max(0, r.prestige + ((rk.prestige || 0) - r.sentPrestige));
        if (chips === d.chips && (d.chipSync || {}).base === r.chips && rating === Math.round(rk.rating || 0) && prestige === (rk.prestige || 0)) return d;
        const n = { ...d, chips, chipSync: { base: r.chips }, ranked: { ...rk, rating, prestige } };
        saveData(n); return n;
      });
      if (r.flagged) setSyncFlag(true);
    });
    return () => cloud.onSync(null);
  }, []);
  useEffect(() => { if (syncFlag) { showToast({ title: "Chips checked", label: "Some chips or RP didn't add up, so the server kept the verified amount." }, 3600); setSyncFlag(false); } }, [syncFlag]); // eslint-disable-line react-hooks/exhaustive-deps
  // signed in: every change goes up to your account a couple of seconds later
  const pushRef = useRef(null);
  useEffect(() => {
    if (!account || !loaded) return;
    clearTimeout(pushRef.current);
    pushRef.current = setTimeout(() => { cloud.pushSave(account, data, publicProfile(data)).catch(() => {}); }, 2500);
    return () => clearTimeout(pushRef.current);
  }, [data, account, loaded]);
  // tell friends you're here and what you're playing
  const presenceRef = useRef(null);
  const myStatus = onlineTable ? "At a friends table" : !inTable || !session ? "In the lobby" : session.vip ? "At the High Roller table" : session.mode === "ranked" ? "Playing ranked" : session.mode === "tournament" ? "In a tournament" : session.mode === "practice" ? "Practicing" : "Playing cash";
  useEffect(() => {
    if (!account || !account.username) return;
    let gone = false, h = null;
    cloud.presence(account, (m) => !gone && setOnline(m)).then((x) => { if (gone) { x.leave(); return; } h = x; presenceRef.current = x; x.set(statusRef.current); }).catch(() => {});
    const vis = () => { const x = presenceRef.current; if (!x) return; if (document.hidden) x.hide(); else x.set(statusRef.current); };
    document.addEventListener("visibilitychange", vis);
    return () => { gone = true; document.removeEventListener("visibilitychange", vis); if (h) h.leave(); presenceRef.current = null; setOnline({}); };
  }, [account]);
  const statusRef = useRef(myStatus); statusRef.current = myStatus;
  useEffect(() => { if (presenceRef.current && !document.hidden) presenceRef.current.set(myStatus); }, [myStatus]);
  const handleAuthed = async (me, mode) => {
    setAccount(me); setAuthOpen(me.username ? null : "username");
    if (mode === "signin") {
      try {
        const remote = await cloud.loadSave(me);
        if (remote) {
          try { localStorage.setItem("felt-guest-backup", JSON.stringify(data)); } catch (e) { /* full */ }
          const m = { ...hydrate(remote), savedAt: Date.now() }; setData(m); saveData(m);
          showToast({ title: "Signed in", label: `Welcome back, @${me.username || "player"}` }, 2600); return;
        }
      } catch (e) { /* fall through and upload this phone's progress */ }
    }
    let cur = data;
    if (mode === "signup" && me.username && (!data.name || data.name === "You")) { cur = { ...data, name: me.username }; persist(cur); }
    cloud.pushSave(me, cur, publicProfile(cur)).catch(() => {});
    showToast({ title: mode === "signup" ? "Account made" : "Signed in", label: "Your progress now saves online" }, 2600);
  };
  // signing out hands the phone back to a fresh guest; your progress lives in the account
  // chips coming back from friends tables land here
  const dataRef = useRef(data); dataRef.current = data;
  const claimPayouts = useCallback(async () => {
    if (!account) return;
    try {
      const r = await cloud.claimPayouts(account);
      if (r.total !== 0) { const d = dataRef.current; const base = d.chipSync && d.chipSync.base != null ? d.chipSync.base + r.total : undefined; persist({ ...d, chips: Math.max(0, d.chips + r.total), ...(base != null ? { chipSync: { base } } : {}) }); showToast({ title: `${r.total > 0 ? "+" : "-"}${Math.abs(r.total).toLocaleString()} chips`, label: r.reasons.length === 1 ? r.reasons[0] : "Chips from friends tables" }, 3000); if (r.total > 0) sound.coin(); }
    } catch (e) { /* try again later */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account]);
  useEffect(() => { if (!account || !loaded) return; claimPayouts(); const t = setInterval(claimPayouts, 60000); return () => clearInterval(t); }, [account, loaded, claimPayouts]);
  const handleDebit = useCallback((amount) => { const d = dataRef.current; const base = d.chipSync && d.chipSync.base != null ? d.chipSync.base - amount : undefined; persist({ ...d, chips: Math.max(0, d.chips - amount), ...(base != null ? { chipSync: { base } } : {}) }); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // friends asking you to their table
  useEffect(() => {
    if (!account || !account.username) { setInvites([]); return; }
    let stop = null, on = true;
    cloud.watchInvites(account, (list) => { if (!on) return; setInvites(list); list.forEach((iv) => { if (!inviteNames[iv.from_user]) cloud.getProfile(iv.from_user).then((p) => p && setInviteNames((m) => ({ ...m, [iv.from_user]: p.display_name }))).catch(() => {}); }); }).then((s) => { if (on) stop = s; else s(); });
    return () => { on = false; if (stop) stop(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account]);
  const openTable = (id) => { sound.tap(); setFtOpen(false); setOnlineTable(id); };
  openTableCodeRef.current = (code) => { if (!account) return; api("join", { code }).then((r) => openTable(r.tableId)).catch((e) => showToast({ title: "Can't join", label: e.message }, 2600)); };
  const acceptInvite = async (iv) => { cloud.clearInvite(iv.id).catch(() => {}); setInvites((l) => l.filter((x) => x.id !== iv.id)); try { const r = await api("join", { code: iv.code }); openTable(r.tableId); } catch (e) { showToast({ title: "Can't join", label: e.message }, 2600); } };
  // a shared link like felt-coral.vercel.app/?table=ABCD drops you at that table
  useEffect(() => {
    if (!loaded) return;
    let code = null; try { code = new URLSearchParams(window.location.search).get("table"); } catch (e) { /* no url */ }
    if (!code) return;
    try { window.history.replaceState(null, "", window.location.pathname); } catch (e) { /* ignore */ }
    if (!account) { showToast({ title: "Join your friend's table", label: "Make an account or sign in first" }, 3200); setAuthOpen("signup"); try { sessionStorage.setItem("felt-pending-table", code); } catch (e) { /* ignore */ } return; }
    api("join", { code }).then((r) => openTable(r.tableId)).catch((e) => showToast({ title: "Can't join", label: e.message }, 2800));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);
  useEffect(() => {
    if (!account) return; let code = null; try { code = sessionStorage.getItem("felt-pending-table"); sessionStorage.removeItem("felt-pending-table"); } catch (e) { /* ignore */ }
    if (code) api("join", { code }).then((r) => openTable(r.tableId)).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account]);
  const handleSignOut = async () => {
    try { await cloud.pushSave(account, data, publicProfile(data)); } catch (e) { showToast({ title: "Can't sign out yet", label: "Couldn't save to your account. Check your connection." }, 2800); return; }
    await cloud.signOut().catch(() => {}); setAccount(null);
    const fresh = hydrate({ ...defaultData(), name: "You" }); setData(fresh); saveData(fresh);
    showToast({ title: "Signed out", label: "Sign back in anytime to pick up where you left off" }, 2600);
  };
  const showToast = (t, ms = 2600) => { clearTimeout(toastTimer.current); setToast(t); toastTimer.current = setTimeout(() => setToast(null), ms); };

  const checkAchievements = (statsObj, base) => {
    const newly = ACHIEVEMENTS.filter((a) => !base.achievements.includes(a.id) && a.check(statsObj));
    if (newly.length === 0) return base.achievements;
    sound.achievement(); vibrate([20, 30, 20, 30, 40]);
    showToast({ title: "Achievement unlocked", label: newly[0].label });
    return [...base.achievements, ...newly.map((a) => a.id)];
  };
  const addSkill = addHandToSkill;
  // Updaters stay pure: they queue what you earned and this shows it right after.
  const notesRef = useRef([]);
  const flushNotes = () => {
    const notes = notesRef.current; notesRef.current = [];
    if (!notes.length) return;
    const lvl = notes.filter((n) => n.kind === "level");
    const chal = notes.filter((n) => n.kind === "challenge");
    const ttl = notes.filter((n) => n.kind === "title");
    if (ttl.length) { sound.rankUp(); showToast({ title: "Title unlocked", label: `${ttl.map((n) => n.t.label).join(", ")}. Equip it on your profile.` }, 3200); }
    else if (lvl.length) { const top = lvl[lvl.length - 1]; sound.rankUp(); showToast({ title: `Season pass level ${top.level}`, label: `Unlocked ${passRewardLabel(top.reward)}` }, 3000); }
    else if (chal.length) { sound.achievement(); showToast({ title: "Challenge complete", label: `${challengeText(chal[0].c)}. Claim it on Home.` }, 2800); }
  };
  const queueNotes = (completed, earned, ch) => {
    completed.forEach((id) => { const c = [...ch.daily, ...ch.weekly].find((x) => x.id === id); if (c) notesRef.current.push({ kind: "challenge", c }); });
    earned.forEach((e) => notesRef.current.push({ kind: "level", ...e }));
  };
  const withTitles = (d) => {
    const earned = newlyEarnedTitles(d);
    if (!earned.length) return d;
    earned.forEach((t) => notesRef.current.push({ kind: "title", t }));
    const tt = d.titles || defaultTitles();
    return { ...d, titles: { ...tt, owned: [...tt.owned, ...earned.map((t) => t.key)] } };
  };
  const progress = (d, e, xp) => {
    const r = applyChallengeEvent(ensureChallenges(d.challenges), e);
    const g = grantXp({ ...d, challenges: r.ch }, xp);
    queueNotes(r.completed, g.earned, r.ch);
    return g.next;
  };

  const handleClaimChips = (amount) => { sound.coin(); vibrate(20); persist({ ...data, chips: data.chips + amount }); };
  const handleClaimDaily = () => {
    const st = streakState(data.streak);
    if (st.claimedToday) return;
    const amount = STREAK_REWARDS[st.nextDay - 1];
    sound.coin(); vibrate(20);
    const next = withTitles(trackHistory(data, { ...data, chips: data.chips + amount, lastDailyBonus: todayStr(), streak: { count: st.nextDay, last: localDateStr() } }, null));
    persist(next);
    showToast({ title: `Day ${st.nextDay} streak`, label: `+${amount.toLocaleString()} chips` });
    setTimeout(flushNotes, 2700);
  };
  const handleClaimChallenge = (which, id) => {
    const ch = ensureChallenges(data.challenges);
    const list = ch[which];
    const c = list.find((x) => x.id === id);
    if (!c || c.claimed || c.progress < c.target) return;
    const rw = CHALLENGE_REWARD[which];
    sound.coin(); vibrate(20);
    const g = grantXp({ ...data, chips: data.chips + rw.chips, challenges: { ...ch, [which]: list.map((x) => (x.id === id ? { ...x, claimed: true } : x)) } }, rw.xp);
    persist(withTitles(trackHistory(data, g.next, null)));
    setTimeout(flushNotes, 3100);
    if (g.earned.length) { const top = g.earned[g.earned.length - 1]; sound.rankUp(); showToast({ title: `Season pass level ${top.level}`, label: `Unlocked ${passRewardLabel(top.reward)}` }, 3000); }
    else showToast({ title: "Reward claimed", label: `+${rw.chips.toLocaleString()} chips, +${rw.xp} XP` });
  };
  const handleBuyCosmetic = (type, item) => {
    const cos = data.cosmetics || defaultCosmetics();
    const field = type === "back" ? "backs" : "felts";
    if (cos[field].includes(item.key) || !item.cost || data.chips < item.cost) return;
    sound.coin(); vibrate(20);
    persist({ ...data, chips: data.chips - item.cost, cosmetics: { ...cos, [field]: [...cos[field], item.key], [type === "back" ? "cardBack" : "felt"]: item.key } });
  };
  // the wheel's result is decided here and saved before the animation even starts
  const handleSpin = () => {
    if (!spinReady(data)) return null;
    const index = pickSpinIndex();
    const pz = SPIN_PRIZES[index];
    let next = { ...data, lastSpin: localDateStr() };
    let text = "", big = false;
    if (pz.type === "chips") { next = { ...next, chips: next.chips + pz.amount }; text = `${pz.amount.toLocaleString()} chips`; big = pz.amount >= 5000; }
    else if (pz.type === "xp") { const g = grantXp(next, pz.amount); next = g.next; text = `${pz.amount} XP`; g.earned.forEach((e) => notesRef.current.push({ kind: "level", ...e })); }
    else {
      const cos = next.cosmetics || defaultCosmetics(); const tt = next.titles || defaultTitles();
      const pool = [
        ...FELTS.filter((f) => f.cost && !cos.felts.includes(f.key)).map((f) => ({ kind: "felt", item: f })),
        ...CARD_BACKS.filter((b) => b.cost && !cos.backs.includes(b.key)).map((b) => ({ kind: "back", item: b })),
        ...TITLES.filter((t) => t.cost && t.cost <= 3000 && !tt.owned.includes(t.key)).map((t) => ({ kind: "title", item: t })),
      ];
      if (!pool.length) { next = { ...next, chips: next.chips + 3000 }; text = "3,000 chips"; }
      else {
        const m = pool[Math.floor(Math.random() * pool.length)]; big = true;
        if (m.kind === "felt") { next = { ...next, cosmetics: { ...cos, felts: [...cos.felts, m.item.key] } }; text = `${m.item.label} felt`; }
        else if (m.kind === "back") { next = { ...next, cosmetics: { ...cos, backs: [...cos.backs, m.item.key] } }; text = `${m.item.label} card back`; }
        else { next = { ...next, titles: { ...tt, owned: [...tt.owned, m.item.key] } }; text = `"${m.item.label}" title`; }
      }
    }
    persist(withTitles(trackHistory(data, next, null)));
    setTimeout(flushNotes, 5200);
    return { index, text, big };
  };
  const handlePrestige = () => {
    const r = data.ranked;
    if (!canPrestige(r)) return;
    sound.rankUp(); vibrate([30, 40, 30, 40, 60]);
    const n = (r.prestige || 0) + 1;
    persist({ ...data, chips: data.chips + PRESTIGE_REWARD, ranked: { ...r, rating: 0, mmr: matchRating(r), prestige: n, streak: 0, recent: [] } });
    showToast({ title: `Prestige ${n}`, label: `Back to Bronze. +${PRESTIGE_REWARD.toLocaleString()} chips` }, 3200);
  };
  // theme packs: the body gets a class, every screen restyles from there
  const themeState = data.themes || defaultThemes();
  const activeTheme = previewTheme || themeState.equipped || "classic";
  useEffect(() => {
    try { document.body.className = `theme-${activeTheme}`; const m = document.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute("content", findTheme(activeTheme).sw[0]); } catch (e) { /* no document */ }
  }, [activeTheme]);
  const handleBuyTheme = (t) => {
    const ts = data.themes || defaultThemes();
    if (ts.owned.includes(t.key) || data.chips < t.cost) return;
    sound.rankUp(); vibrate([20, 30, 20]);
    setPreviewTheme(null);
    persist({ ...data, chips: data.chips - t.cost, themes: { owned: [...ts.owned, t.key], equipped: t.key } });
    showToast({ title: "Theme unlocked", label: `${t.label} is on. Switch anytime in the shop.` });
  };
  const handleEquipTheme = (key) => {
    const ts = data.themes || defaultThemes();
    if (!ts.owned.includes(key)) return;
    sound.tap(); setPreviewTheme(null);
    persist({ ...data, themes: { ...ts, equipped: key } });
  };
  const handlePreviewTheme = (key) => { sound.tap(); setPreviewTheme(key); };
  const handleBuyTitle = (t) => {
    const tt = data.titles || defaultTitles();
    if (!t.cost || tt.owned.includes(t.key) || data.chips < t.cost) return;
    sound.coin(); vibrate(20);
    persist({ ...data, chips: data.chips - t.cost, titles: { owned: [...tt.owned, t.key], equipped: t.key } });
    showToast({ title: "Title equipped", label: t.label });
  };
  const handleEquipTitle = (key) => {
    const tt = data.titles || defaultTitles();
    if (!tt.owned.includes(key)) return;
    sound.tap();
    persist({ ...data, titles: { ...tt, equipped: key } });
  };
  const handleEquipPass = (r) => {
    if (r.type === "title") return handleEquipTitle(r.key);
    if (r.type === "avatar") return handleSelectAvatar(r.key);
    return handleEquipCosmetic(r.type, r.key);
  };
  const handleEquipCosmetic = (type, key) => {
    const cos = { ...defaultCosmetics(), ...(data.cosmetics || {}) };
    const map = { back: [CARD_BACKS, "backs", "cardBack"], felt: [FELTS, "felts", "felt"], chipset: [CHIP_SETS, "chipsets", "chipset"], fx: [WIN_FX, "fxs", "fx"] }[type];
    if (!map) return;
    const item = map[0].find((x) => x.key === key);
    if (!item || !ownsCosmetic(cos, map[1], item, data.ranked.prestige)) return;
    sound.tap();
    persist({ ...data, cosmetics: { ...cos, [map[2]]: key } });
  };
  const handleBuyAvatar = (avatarObj) => {
    if (data.unlocked.includes(avatarObj.emoji) || data.chips < avatarObj.cost) return;
    sound.coin();
    persist({ ...data, chips: data.chips - avatarObj.cost, unlocked: [...data.unlocked, avatarObj.emoji] });
  };
  const handleSelectAvatar = (emoji) => { sound.tap(); persist({ ...data, avatar: emoji, usePhoto: false }); };
  const handleSetPhoto = (url, err) => {
    if (err) { showToast({ title: "Photo", label: err }, 2600); return; }
    sound.tap(); persist(url ? { ...data, photo: url, usePhoto: true } : { ...data, photo: null, usePhoto: false });
  };
  const handleUsePhoto = (on) => { sound.tap(); persist({ ...data, usePhoto: !!on && !!data.photo }); };
  const handleSelectFrame = (frameKey) => { sound.tap(); persist({ ...data, ranked: { ...data.ranked, frame: frameKey } }); };
  const handleUpdateName = (name) => { sound.tap(); persist({ ...data, name }); };
  const handleAddFriend = (name) => { sound.tap(); persist({ ...data, friends: [...data.friends, name] }); };

  // Saves after every hand so closing the app mid-session never loses progress.
  // Cash games bank the stack each hand. Ranked chips settle when the match ends.
  // Practice only feeds the coach. Everything else also moves challenges and the season pass.
  const handleHandResolved = (p) => {
    const mode = session?.mode;
    const isCash = mode === "cash";
    const counts = mode === "cash" || mode === "ranked";
    setData((d) => {
      let next = { ...d, skill: p.decisions ? addSkill(d.skill || defaultSkill(), p.decisions) : d.skill };
      if (counts) {
        const pos = { late: [0, 0], early: [0, 0], blinds: [0, 0], ...(d.stats.pos || {}) };
        const pk = pos[p.position] ? p.position : "early";
        pos[pk] = [pos[pk][0] + 1, pos[pk][1] + (p.won ? 1 : 0)];
        const cur = p.won ? (d.stats.curWinStreak || 0) + 1 : 0;
        const stats = { ...d.stats, pos, curWinStreak: cur, bestWinStreak: Math.max(d.stats.bestWinStreak || 0, cur), handsPlayed: d.stats.handsPlayed + 1, handsWon: d.stats.handsWon + (p.won ? 1 : 0), biggestPot: Math.max(d.stats.biggestPot, p.won ? p.potWon : 0) };
        if (isCash && typeof p.finalStack === "number") stats.netChips = d.stats.netChips + (p.finalStack - d.chips);
        next = { ...next, stats, achievements: checkAchievements(stats, d), ...(isCash && typeof p.finalStack === "number" ? { chips: Math.max(0, p.finalStack) } : {}) };
      }
      if (mode !== "practice") next = progress(next, { hand: true, ...p }, 5 + (p.won ? 6 : 0));
      next = trackHistory(d, next, mode !== "practice" && p.wonSD && p.best ? p.best : null);
      next = withTitles(next);
      saveData(next);
      return next;
    });
    setTimeout(flushNotes, 0);
  };
  const handleExitTable = (finalStack, tournamentResult, rankedResult, opts = {}) => {
    sound.tap();
    const mode = session?.mode;
    if (mode === "ranked") {
      const buyIn = session?.buyIn ?? RANKED_BUYIN;
      const o = rankedResult || rankedOutcome({ buyIn, finalStack, cleared: false, hands: 0, knockouts: 0, ranked: data.ranked });
      const nextChips = Math.max(0, data.chips - buyIn + o.finalStack);
      let placedNow = null;
      setData((d) => {
        const r = d.ranked;
        let ranked = { ...r, wins: r.wins + (o.won ? 1 : 0), losses: r.losses + (o.won ? 0 : 1), streak: o.won ? Math.max(0, r.streak || 0) + 1 : 0 };
        if (o.placement) {
          const games = [...(r.placementGames || []), { won: o.won, hands: o.matchHands || [] }];
          ranked = { ...ranked, placementGames: games, recent: [{ won: o.won, delta: 0, placement: true }, ...(r.recent || [])].slice(0, 10) };
          if (games.length >= PLACEMENT_MATCHES) {
            const rating = o.placedRating != null ? o.placedRating : placementFromSkill(d.skill, games).rating;
            const newFrames = framesEarned(rating, r.frames);
            placedNow = rating;
            ranked = { ...ranked, placed: true, rating, peakRating: Math.max(r.peakRating || 0, rating), report: o.report || null, placementGames: games.map((g) => ({ won: g.won })), frames: [...r.frames, ...newFrames], frame: newFrames.length ? newFrames[newFrames.length - 1] : r.frame };
          }
        } else {
          const frames = [...r.frames, ...o.newFrames.filter((f) => !r.frames.includes(f))];
          ranked = { ...ranked, rating: o.after, mmr: undefined, peakRating: Math.max(r.peakRating || 0, o.after), frames, frame: o.newFrames.length > 0 ? o.newFrames[o.newFrames.length - 1] : r.frame, recent: [{ won: o.won, delta: o.delta }, ...(r.recent || [])].slice(0, 10) };
        }
        const stats = { ...d.stats, netChips: d.stats.netChips + o.net };
        const achievements = checkAchievements(stats, d);
        let next = { ...d, chips: nextChips, stats, achievements, ranked };
        next = progress(next, { rankedWin: o.won }, o.won ? 60 : 25);
        next = withTitles(trackHistory(d, next, null));
        saveData(next);
        return next;
      });
      setTimeout(flushNotes, 3000);
      if (opts.again && nextChips >= buyIn) { setTableKey((k) => k + 1); return; }
      setInTable(false); setSession(null);
      if (placedNow != null) showToast({ title: "You're ranked", label: rankName(placedNow) }, 2800);
      return;
    }
    if (mode === "cash") {
      setData((d) => {
        const netChips = d.stats.netChips + (finalStack - d.chips);
        const stats = { ...d.stats, netChips };
        const achievements = checkAchievements(stats, d);
        const next = trackHistory(d, { ...d, chips: Math.max(0, finalStack), stats, achievements }, null);
        saveData(next);
        return next;
      });
    }
    if (mode === "tournament" && tournamentResult) {
      const buyIn = session?.buyIn || 0;
      const r = { at: Date.now(), field: tournamentResult.total, place: tournamentResult.placement, buyIn };
      const prize = tourneyPrize(r.field, r.place, buyIn);
      const pts = Math.round(tourneyPoints(r));
      setData((d) => {
        const sk = d.skill || defaultSkill();
        let next = { ...d, chips: Math.max(0, d.chips - buyIn + prize), stats: { ...d.stats, netChips: d.stats.netChips + prize - buyIn }, skill: { ...sk, tourneys: [...(sk.tourneys || []), r].slice(-40) } };
        next = progress(next, { tourneyCash: prize > 0 }, 20 + (prize > 0 ? 60 : 0) + (tournamentResult.won ? 40 : 0));
        next = withTitles(trackHistory(d, next, null));
        saveData(next);
        return next;
      });
      setTimeout(flushNotes, 3200);
      showToast({ title: tournamentResult.won ? "Tournament won" : `Finished ${ordinal(r.place)} of ${r.field}`, label: `${prize > 0 ? `Cashed ${prize.toLocaleString()} chips. ` : ""}${pts > 0 ? `+${pts} index points` : "No index points outside the money"}` }, 3000);
    }
    setInTable(false); setSession(null);
  };
  const handlePlayAI = (config) => { sound.tap(); setSession({ ...config, startChips: data.chips }); setTableKey((k) => k + 1); setInTable(true); };
  const handleDismissWinTip = () => { persist({ ...data, settings: { ...data.settings, winTipSeen: true } }); };
  const handleUpdateSettings = (patch) => { sound.tap(); persist({ ...data, settings: { ...data.settings, ...patch } }); };
  const handleExportData = () => {
    try {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `felt-profile-${data.name.replace(/\s+/g, "_")}.json`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) { /* download not supported in this environment */ }
  };
  const handleResetProfile = () => { sound.tap(); persist(defaultData()); };
  // brings a profile over from another copy of felt (like the old chat version)
  const handleImportData = (file) => {
    if (!file) return;
    const readText = (cb) => { if (typeof file === "string") { cb(file); return; } const reader = new FileReader(); reader.onload = () => cb(String(reader.result)); reader.readAsText(file); };
    readText((text) => {
      try {
        const raw = text.trim();
        const d = JSON.parse(raw.startsWith("{") ? raw : decodeURIComponent(escape(atob(raw.replace(/^felt:/, "").replace(/\s+/g, "")))));
        if (!d || typeof d !== "object" || typeof d.chips !== "number") throw new Error("not a felt profile");
        const merged = { ...defaultData(), ...d, stats: { ...defaultData().stats, ...(d.stats || {}) }, settings: { ...defaultData().settings, ...(d.settings || {}) } };
        merged.ranked = rolloverSeason(migrateRanked(d.ranked));
        merged.cosmetics = { ...defaultCosmetics(), ...(d.cosmetics || {}) };
        merged.challenges = ensureChallenges(d.challenges);
        merged.pass = ensurePass(d.pass);
        merged.history = { bankroll: [], best: [], ...(d.history || {}) };
        merged.titles = { ...defaultTitles(), ...(d.titles || {}) };
        merged.themes = { ...defaultThemes(), ...(d.themes || {}) };
        merged.skill = d.skill && d.skill.v === 2 ? { ...defaultSkill(), ...d.skill } : defaultSkill();
        sound.coin(); persist(merged);
        showToast({ title: "Profile imported", label: `${merged.name}, ${merged.chips.toLocaleString()} chips` });
      } catch (e) { showToast({ title: "Couldn't import", label: "That isn't a felt profile code." }); }
    });
  };

  if (onlineTable && account) {
    return (
      <div className="app-table">
        <style>{GLOBAL_STYLE}</style>
        <OnlineTable key={onlineTable} tableId={onlineTable} account={account} data={data} sound={sound} soundOn={soundOn} setSoundOn={setSoundOn} onExit={() => { setOnlineTable(null); claimPayouts(); }} onDebit={handleDebit} onClaim={claimPayouts} />
        {toast && <div className="toast" role="status"><div style={{ fontSize: 12, fontWeight: 700, color: "var(--t-accent)" }}>{toast.title}</div><div style={{ fontSize: 12.5, color: "var(--t-text2)" }}>{toast.label}</div></div>}
      </div>
    );
  }
  if (inTable) {
    const isPractice = session?.mode === "practice";
    const isTournament = session?.mode === "tournament";
    const isRanked = session?.mode === "ranked";
    const frameColor = data.ranked.frame ? RANK_TIERS.find((t) => t.key === data.ranked.frame)?.color : null;
    const placed = isPlaced(data.ranked);
    const isVip = !!session?.vip;
    const botSkill = isRanked ? (placed ? tierForRating(matchRating(data.ranked)).botSkill : tierOf(data.ranked).botSkill) : isPractice ? 0.2 : isVip ? 0.72 : 0.4;
    const opponentRating = isRanked ? (placed ? matchRating(data.ranked) : 650) : null;
    return (
      <div className="app-table">
        <style>{GLOBAL_STYLE}</style>
        <PokerTable
          key={tableKey}
          startStack={isPractice ? 2000 : isTournament ? TOURNEY_STACK : isRanked ? (session?.buyIn ?? RANKED_BUYIN) : (session?.startChips ?? data.chips)}
          name={data.name} avatar={data.avatar} photo={data.usePhoto ? data.photo : null} soundOn={soundOn} setSoundOn={setSoundOn}
          onExit={handleExitTable} onHandResolved={handleHandResolved}
          stakes={session?.stakes} tableSize={session?.tableSize} tournament={isTournament} ranked={isRanked}
          rankedState={data.ranked} skill={data.skill} tourneyBuyIn={session?.buyIn || 0} bankroll={data.chips} botSkill={botSkill} opponentRating={opponentRating} frameColor={frameColor} tutorial={isPractice}
          variant={session?.variant || "holdem"} turbo={!!session?.turbo} runTwice={!!data.settings.runTwice} squeeze={data.settings.squeeze !== false} cardBack={isVip ? VIP_BACK : findBack((data.cosmetics || {}).cardBack)} felt={isVip ? VIP_FELT : findFelt((data.cosmetics || {}).felt)} title={(data.titles || defaultTitles()).equipped} vip={isVip} prestige={data.ranked.prestige || 0} chipSet={(data.cosmetics || {}).chipset || "classic"} winFx={(data.cosmetics || {}).fx || "confetti"}
          colorblind={data.settings.colorblind} cardSize={data.settings.cardSize} animSpeed={data.settings.animSpeed}
          showWinTip={!data.settings.winTipSeen} onDismissWinTip={handleDismissWinTip}
        />
      </div>
    );
  }

  return (
    <div className="app">
      <style>{GLOBAL_STYLE}</style>
      {!bootDone && <LoadingScreen fadingOut={loaded} />}
      <main className="app-main">
        <div key={tab} style={{ width: "100%", maxWidth: 460, height: "100%" }}>
          {tab === "shop" && <ShopScreen data={data} onClaimChips={handleClaimChips} onBuyAvatar={handleBuyAvatar} onClaimDaily={handleClaimDaily} onBuyCosmetic={handleBuyCosmetic} onEquipCosmetic={handleEquipCosmetic} onBuyTitle={handleBuyTitle} onBuyTheme={handleBuyTheme} onEquipTheme={handleEquipTheme} onPreviewTheme={handlePreviewTheme} previewTheme={previewTheme} />}
          {tab === "home" && <HomeMenu topCards={<>
            {!isStandalone() && !hideInstall && (installPrompt || isIOS()) && <div style={{ marginBottom: 14 }}><InstallCard prompt={installPrompt ? async () => { installPrompt.prompt(); try { await installPrompt.userChoice; } catch (e) { /* closed */ } setInstallPrompt(null); } : null} onDismiss={() => dismiss("felt-hide-install", setHideInstall)} /></div>}
            {account && pushSupported() && !pushOn && !hideNotify && (isStandalone() || !isIOS()) && typeof Notification !== "undefined" && Notification.permission !== "denied" && <div style={{ marginBottom: 14 }}><NotifyCard busy={pushBusy} onEnable={turnOnPush} onDismiss={() => dismiss("felt-hide-notify", setHideNotify)} /></div>}
          </>} legendNo={legendNo} onEquipPass={handleEquipPass} onPlayAI={handlePlayAI} onFriendsTable={() => { sound.tap(); setFtOpen(true); }} data={data} chips={data.chips} ranked={data.ranked} onClaimDaily={handleClaimDaily} onClaimChallenge={handleClaimChallenge} onSpin={handleSpin} onPrestige={handlePrestige} sound={sound} goShop={() => setTab("shop")} />}
          {tab === "leaderboard" && <LeaderboardScreen data={data} account={account} online={online} onOpenAuth={setAuthOpen} />}
          {tab === "coach" && <CoachScreen data={data} />}
          {tab === "profile" && <ProfileScreen data={data} account={account} online={online} legendNo={legendNo} pushOn={pushOn} pushBusy={pushBusy} onEnablePush={turnOnPush} isAdmin={isAdmin} onOpenAdmin={() => setAdminOpen(true)} onOpenAuth={setAuthOpen} onSignOut={handleSignOut} sound={sound} onUpdateName={handleUpdateName} onSelectAvatar={handleSelectAvatar} onSetPhoto={handleSetPhoto} onUsePhoto={handleUsePhoto} onSelectFrame={handleSelectFrame} onAddFriend={handleAddFriend} onUpdateSettings={handleUpdateSettings} onExportData={handleExportData} onImportData={handleImportData} onResetProfile={handleResetProfile} onEquipTitle={handleEquipTitle} onPrestige={handlePrestige} />}
        </div>
      </main>
      <BottomNav tab={tab} setTab={(t) => { sound.tap(); setTab(t); if (t !== "shop") setPreviewTheme(null); }} />
      {previewTheme && tab === "shop" && (() => {
        const t = findTheme(previewTheme);
        return (
          <div className="preview-bar" role="status">
            <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 700, fontSize: 13.5 }}>Previewing {t.label}</div><div style={{ fontSize: 11.5, opacity: 0.75 }}>Scroll around to see it</div></div>
            <button className="btn btn-sm" onClick={() => setPreviewTheme(null)}>Stop</button>
            <button className="btn btn-sm btn-raise" disabled={data.chips < t.cost} onClick={() => handleBuyTheme(t)}>{data.chips < t.cost ? `Need ${shortNum(t.cost)}` : `Buy ${t.cost.toLocaleString()}`}</button>
          </div>
        );
      })()}
      {invites.length > 0 && !inTable && (
        <div className="invite-banner" role="status">
          <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 700 }}>{inviteNames[invites[0].from_user] || "A friend"} invited you</div><div style={{ fontSize: 11.5, color: "var(--t-sub)" }}>Table {invites[0].code}</div></div>
          <button className="btn btn-sm" onClick={() => { cloud.clearInvite(invites[0].id).catch(() => {}); setInvites((l) => l.slice(1)); }}>Later</button>
          <button className="btn btn-sm btn-raise" onClick={() => acceptInvite(invites[0])}>Join</button>
        </div>
      )}
      {adminOpen && isAdmin && <AdminModal onClose={() => setAdminOpen(false)} />}
      {loaded && bootDone && data.ranked.seasonEnd && !data.ranked.seasonEnd.seen && (() => {
        const se = data.ranked.seasonEnd; const [yy, mm] = String(se.seasonId).split("-");
        const month = new Date(+yy, +mm - 1, 1).toLocaleString("en-US", { month: "long" });
        const close = () => persist({ ...data, ranked: { ...data.ranked, seasonEnd: { ...se, seen: true } } });
        const perk = PRESTIGE_PERKS.find((pk) => pk.n === se.prestige);
        return (
          <Modal title="" onClose={close} width={360}>
            <div className="season-end">
              {se.champ ? <PrestigeBadge n={se.prestige} size={72} /> : <TierBadge tier={tierForRating(se.to)} size={64} />}
              <div className="se-kicker">{month} season is over</div>
              <div className="se-title">{se.champ ? `Prestige ${se.prestige}` : "New season"}</div>
              <div className="se-body">{se.champ ? `You finished ${month} at Champion. That's a prestige${perk ? `, and it unlocks your ${perk.label.toLowerCase()}` : ""}. +${PRESTIGE_REWARD.toLocaleString()} chips.` : `You finished at ${rankName(se.from)}.`} Everyone's RP came partway back, so you start this season at {rankName(se.to)}.</div>
              <button className="btn btn-raise" style={{ width: "100%", marginTop: 14 }} onClick={close}>{se.champ ? "Let's go" : "Got it"}</button>
            </div>
          </Modal>
        );
      })()}
      {ftOpen && <FriendsTableModal account={account} data={data} onClose={() => setFtOpen(false)} onOpenTable={openTable} onOpenAuth={setAuthOpen} onDebit={handleDebit} />}
      {authOpen && <AuthModal mode={authOpen} setMode={setAuthOpen} onClose={() => setAuthOpen(null)} onAuthed={handleAuthed} account={account} data={data} />}
      {toast && (
        <div className="toast" role="status">
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--t-accent)" }}>{toast.title}</div>
          <div style={{ fontSize: 12.5, color: "var(--t-text2)" }}>{toast.label}</div>
        </div>
      )}
    </div>
  );
}

function BottomNav({ tab, setTab }) {
  const side = (it) => {
    const active = tab === it.key;
    return (
      <button key={it.key} onClick={() => setTab(it.key)} className="navbtn" aria-current={active ? "page" : undefined} style={{ color: active ? "var(--t-text)" : "#566A90" }}>
        <Icon name={it.icon} size={20} stroke={active ? 2 : 1.7} />
        <div style={{ fontSize: 10.5, fontWeight: 600, marginTop: 3 }}>{it.label}</div>
      </button>
    );
  };
  const playActive = tab === "home";
  return (
    <nav className="bottom-nav">
      {side({ key: "shop", icon: "bag", label: "Shop" })}
      {side({ key: "leaderboard", icon: "ranks", label: "Ranks" })}
      <button onClick={() => setTab("home")} className={`play-fab${playActive ? " on" : ""}`} aria-current={playActive ? "page" : undefined} aria-label="Play">
        <span className="play-fab-disc"><span style={{ fontSize: 20, lineHeight: 1 }}>{"♠"}</span></span>
        <span style={{ fontSize: 10.5, fontWeight: 700, marginTop: 3 }}>Play</span>
      </button>
      {side({ key: "coach", icon: "coach", label: "Coach" })}
      {side({ key: "profile", icon: "user", label: "Profile" })}
    </nav>
  );
}

const GLOBAL_STYLE = `
:root { --t-bg: #0B1426; --t-panel: #14223D; --t-panel2: #25395F; --t-text: #F4F7FC; --t-text2: #C8D3E6; --t-sub: #A9B8D0; --t-mid: #8FA1BE; --t-mut: #7587A6; --t-faint: #5E7196; --t-accent: #F5B83D; --t-good: #34D399; --t-bad: #FF6B6B; --t-display: 'Fraunces', Georgia, serif; --t-body: 'Inter', -apple-system, sans-serif; }
* { box-sizing: border-box; }
body { margin: 0; background: var(--t-bg); }
button { font-family: inherit; color: inherit; }
:focus-visible { outline: 2px solid var(--t-good); outline-offset: 2px; }
@keyframes potBump { 0% { transform: scale(1);} 45% { transform: scale(1.12);} 100% { transform: scale(1);} }
@keyframes fadeSlide { from { opacity:0; transform: translateY(-3px);} to { opacity:1; transform: translateY(0);} }
@keyframes sheetIn { from { opacity:0; transform: translateY(10px);} to { opacity:1; transform: translateY(0);} }
@keyframes screenIn { from { opacity:0; } to { opacity:1; } }
@keyframes dealToHero { 0% { opacity: 0; transform: translate3d(0,-42vh,0) rotate(-16deg) scale(.5); } 55% { opacity: 1; } 100% { opacity: 1; transform: translate3d(0,0,0) rotate(0) scale(1); } }
@keyframes dealToSeat { 0% { opacity: 0; transform: translate3d(0,24vh,0) rotate(0) scale(.6); } 60% { opacity: 1; } 100% { opacity: 1; transform: translate3d(0,0,0) rotate(var(--r, 0deg)) scale(1); } }
@keyframes flipIn { 0% { opacity: 0; transform: perspective(500px) rotateY(-90deg) translateY(-6px); } 50% { opacity: 1; } 100% { opacity: 1; transform: perspective(500px) rotateY(0) translateY(0); } }
@keyframes foldAway { to { opacity: 0; transform: translate3d(0,-12px,0) scale(.75) rotate(-10deg); } }
@keyframes confettiFall { 0% { transform: translateY(-10px) translateX(0) rotate(0deg); opacity:1; } 100% { transform: translateY(340px) translateX(var(--drift)) rotate(var(--rot)); opacity:0; } }
@keyframes suitIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
@keyframes loadFill { from { transform: scaleX(0); } to { transform: scaleX(1); } }
@keyframes resultsIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes riseIn { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes badgePop { 0% { opacity: 0; transform: scale(.4) rotate(-20deg); } 60% { opacity: 1; transform: scale(1.12) rotate(4deg); } 100% { transform: scale(1) rotate(0); } }

.app { font-family: var(--t-body); background: radial-gradient(130% 70% at 50% -15%, #1E427E 0%, var(--t-bg) 62%); height: 100vh; height: 100dvh; color: var(--t-text); display: flex; flex-direction: column; align-items: center; overflow: hidden; }
.app-table { height: 100vh; height: 100dvh; background: radial-gradient(130% 70% at 50% -15%, #1E427E 0%, var(--t-bg) 62%); }
.app-main { flex: 1; width: 100%; display: flex; justify-content: center; overflow: hidden; padding-top: 16px; }
.screen { width: 100%; max-width: 460px; height: 100%; overflow-y: auto; padding: 0 16px 40px; }
.screen-fade { animation: screenIn 0.2s ease; }
.home-head { display: flex; justify-content: space-between; align-items: center; margin: 2px 2px 18px; }
.wordmark { font-family: var(--t-display); font-size: 30px; font-weight: 700; letter-spacing: -0.02em; }
.wordmark-sm { font-family: var(--t-display); font-size: 18px; font-weight: 700; letter-spacing: -0.01em; line-height: 1.1; }
.num { font-variant-numeric: tabular-nums; }
.chip-pill { display: inline-flex; align-items: center; gap: 6px; background: rgba(244,247,252,0.06); border: 1px solid rgba(244,247,252,0.1); border-radius: 20px; padding: 5px 11px; font-size: 13px; font-weight: 600; }
.chip-dot { width: 12px; height: 12px; border-radius: 50%; background: var(--t-accent); box-shadow: inset 0 0 0 2.5px var(--t-bg), inset 0 0 0 4px var(--t-accent); display: inline-block; }
.panel { background: var(--t-panel); border: 1px solid rgba(244,247,252,0.08); border-radius: 20px; padding: 16px 18px 18px; }
.list { display: flex; flex-direction: column; gap: 8px; }
.row { display: flex; align-items: center; justify-content: space-between; gap: 12px; width: 100%; background: var(--t-panel); border: 1px solid rgba(244,247,252,0.07); border-radius: 16px; padding: 14px 16px; cursor: pointer; text-align: left; transition: border-color .15s ease, background .15s ease; }
div.row { cursor: default; }
button.row:hover:not(:disabled) { border-color: rgba(244,247,252,0.18); }
button.row:active:not(:disabled) { background: #1A2B4B; }
.row:disabled { opacity: 0.45; cursor: default; }
.row-title { font-size: 14.5px; font-weight: 600; }
.row-sub { font-size: 12px; color: var(--t-mut); margin-top: 2px; }
.bar { height: 7px; border-radius: 4px; background: rgba(244,247,252,0.1); overflow: hidden; }
.bar > div { height: 100%; border-radius: 4px; transition: width .35s ease, background .35s ease; }
.stat { background: var(--t-panel); border: 1px solid rgba(244,247,252,0.07); border-radius: 14px; padding: 12px 14px; }
.comp-row { background: var(--t-panel); border: 1px solid rgba(244,247,252,0.06); border-radius: 14px; padding: 12px 14px; }
.segbtn:disabled { cursor: not-allowed; }
.spark { display: flex; align-items: flex-end; gap: 3px; height: 42px; margin-top: 12px; }
.spark > div { flex: 1; border-radius: 2px; min-width: 4px; }
.report { margin-top: 16px; background: var(--t-panel); border: 1px solid rgba(244,247,252,0.08); border-radius: 16px; padding: 14px 16px; }
.report p { font-size: 13.5px; line-height: 1.55; color: var(--t-text2); margin: 6px 0 0; }
.report-head { display: flex; justify-content: space-between; font-size: 12px; font-weight: 600; color: var(--t-sub); }
.ach-row { display: flex; align-items: center; gap: 12px; padding: 10px 14px; background: var(--t-panel); border: 1px solid rgba(244,247,252,0.06); border-radius: 12px; }
.ach-mark { width: 20px; height: 20px; border-radius: 50%; border: 1.5px solid; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.lb-dock { position: sticky; bottom: 0; padding: 10px 0 34px; background: linear-gradient(180deg, rgba(11,20,38,0) 0%, var(--t-bg) 30%); }
.lb-pinned { box-shadow: 0 -6px 18px rgba(0,0,0,0.35); }
.lb-row { display: flex; align-items: center; gap: 10px; border-radius: 12px; padding: 10px 14px; border: 1px solid transparent; }
.empty { font-size: 12.5px; color: var(--t-faint); padding: 8px 2px; }
.input { background: var(--t-panel); border: 1px solid rgba(244,247,252,0.1); border-radius: 12px; padding: 10px 12px; color: var(--t-text); font-size: 14px; font-family: inherit; }
.input:focus { outline: none; border-color: rgba(52,211,153,0.6); }
.profile-av { background: var(--t-panel2); border: none; width: 76px; height: 76px; border-radius: 50%; font-size: 34px; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px; cursor: pointer; }
.name-btn { background: none; border: none; font-size: 19px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; padding: 2px 4px; }
.frame-swatch { display: inline-flex; align-items: center; gap: 6px; border: 1.5px solid; border-radius: 20px; padding: 5px 11px 5px 9px; font-size: 12px; font-weight: 600; cursor: pointer; background: transparent; }
.frame-swatch:disabled { cursor: default; }
.avatar-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.avatar-tile { display: flex; flex-direction: column; align-items: center; justify-content: center; background: var(--t-panel); border: 1px solid rgba(244,247,252,0.07); border-radius: 14px; padding: 12px 4px 10px; cursor: pointer; }
.avatar-tile:disabled { cursor: default; }
.seg { display: flex; gap: 3px; background: rgba(244,247,252,0.06); border-radius: 12px; padding: 3px; }
.segbtn { flex: 1; border: none; border-radius: 9px; padding: 8px 6px; font-size: 12px; font-weight: 600; cursor: pointer; background: transparent; color: var(--t-sub); transition: background .15s ease, color .15s ease; white-space: nowrap; }
.segbtn.on { background: var(--t-text); color: var(--t-bg); }
.kv-list { margin: 14px 0 4px; border-top: 1px solid rgba(244,247,252,0.06); }
.kv { display: flex; justify-content: space-between; align-items: baseline; font-size: 13px; padding: 9px 2px; border-bottom: 1px solid rgba(244,247,252,0.06); color: var(--t-mid); }
.kv b { color: var(--t-text); font-weight: 600; }
.scrim { position: fixed; top: 0; right: 0; bottom: 0; left: 0; background: rgba(3,8,20,0.74); display: flex; align-items: center; justify-content: center; padding: 16px; z-index: 30; animation: screenIn .15s ease; }
.sheet { background: var(--t-panel); border: 1px solid rgba(244,247,252,0.1); border-radius: 20px; padding: 18px; width: 100%; max-height: 86vh; overflow-y: auto; animation: sheetIn .22s cubic-bezier(.2,.9,.3,1); box-shadow: 0 24px 60px rgba(0,0,0,0.5); }
.sheet-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
.sheet-title { font-family: var(--t-display); font-size: 19px; font-weight: 700; }
.sheet-body { font-size: 13px; line-height: 1.5; color: var(--t-mid); margin: 12px 2px 16px; }
.toast { position: fixed; top: 18px; left: 50%; transform: translateX(-50%); z-index: 40; background: var(--t-panel); border: 1px solid rgba(245,184,61,0.45); border-radius: 14px; padding: 10px 16px; animation: sheetIn .25s ease; box-shadow: 0 10px 30px rgba(0,0,0,0.45); min-width: 200px; text-align: center; }
.bottom-nav { width: 100%; max-width: 460px; display: flex; justify-content: space-around; align-items: center; padding: 6px 6px calc(8px + env(safe-area-inset-bottom)); border-top: 1px solid rgba(244,247,252,0.08); flex-shrink: 0; background: rgba(11,20,38,0.88); }
.navbtn { background: none; border: none; display: flex; flex-direction: column; align-items: center; cursor: pointer; padding: 6px 8px; transition: color .15s ease; flex: 1; }
.play-fab { background: none; border: none; display: flex; flex-direction: column; align-items: center; cursor: pointer; padding: 2px 4px 0; flex: 1; color: var(--t-text); }
.play-fab-disc { width: 46px; height: 46px; margin-top: 0; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: var(--t-bg); background: radial-gradient(circle at 35% 30%, #FFE08A, var(--t-accent) 70%); box-shadow: 0 0 12px rgba(245,184,61,0.35); transition: transform .18s ease; }
.play-fab:active .play-fab-disc { transform: scale(0.93); }
.play-fab:not(.on) .play-fab-disc { filter: saturate(0.85) brightness(0.92); }

.loading { position: fixed; top: 0; right: 0; bottom: 0; left: 0; background: radial-gradient(130% 70% at 50% -15%, #1E427E 0%, var(--t-bg) 62%); display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 50; transition: opacity .6s ease; color: var(--t-text); }
.loading-word { font-family: var(--t-display); font-size: 48px; font-weight: 700; letter-spacing: -0.03em; animation: suitIn .8s ease both; }
.loading-suits { display: flex; gap: 14px; margin-top: 10px; font-size: 20px; }
.loading-suits span { animation: suitIn .5s ease both; }
.loading-bar { width: 120px; height: 3px; background: rgba(244,247,252,0.1); border-radius: 2px; margin-top: 28px; overflow: hidden; }
.loading-bar div { height: 100%; background: var(--t-accent); transform-origin: left; animation: loadFill ${LOADING_MS / 1000}s cubic-bezier(.4,0,.2,1) both; }
.spinner { width: 34px; height: 34px; border-radius: 50%; border: 3px solid rgba(244,247,252,0.12); border-top-color: var(--t-accent); animation: spin .8s linear infinite; }

.table-wrap { font-family: var(--t-body); height: 100%; color: var(--t-text); display: flex; flex-direction: column; align-items: center; padding: 12px 14px; overflow: hidden; position: relative; }
.table-top { width: 100%; max-width: 460px; display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-shrink: 0; }
.table-top > div:first-of-type { flex: 1; }
.table-sub { font-size: 10.5px; color: var(--t-mut); margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.status { width: 100%; max-width: 460px; text-align: center; font-size: 12.5px; color: var(--t-sub); font-weight: 500; min-height: 18px; margin: 8px 0 2px; flex-shrink: 0; animation: fadeSlide 0.25s ease; }
.seats { width: 100%; max-width: 460px; display: flex; justify-content: space-around; flex-wrap: wrap; row-gap: 6px; flex-shrink: 0; margin-top: 4px; }
.bot-av { position: absolute; top: 3px; left: 3px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: var(--t-display); font-weight: 700; color: #FFFFFF; }
.backs { display: flex; align-items: center; }
.backs .card.mini { width: 20px; height: 29px; border-radius: 4px; transform: rotate(var(--r, 0deg)); }
.backs.folded { animation: foldAway .35s ease forwards; }
.felt-center { width: 100%; max-width: 460px; flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 10px; }
.felt-oval { position: relative; width: 100%; max-width: 420px; padding: 22px 16px 16px; display: flex; flex-direction: column; align-items: center; gap: 10px; border-radius: 999px; background-color: var(--felt2, #138048); background-image: repeating-radial-gradient(circle at 30% 40%, rgba(255,255,255,0.022) 0 1px, transparent 1px 3px), radial-gradient(ellipse at 50% 40%, var(--felt1, #22A866) 0%, var(--felt2, #138048) 52%, var(--felt3, #0B5C33) 100%); border: 7px solid var(--rail, #5A3A20); box-shadow: inset 0 0 0 2px rgba(0,0,0,0.25), inset 0 10px 30px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.06), 0 14px 34px rgba(0,0,0,0.45), 0 0 60px rgba(34,168,102,0.12); }
.card-slot { width: clamp(30px,8.5vw,40px); height: clamp(43px,12vw,57px); border-radius: 7px; border: 1.5px dashed rgba(255,255,255,0.22); }
.pot-num { font-size: 15px; color: #FFFFFF; font-weight: 700; font-family: var(--t-body); background: rgba(0,0,0,0.28); padding: 3px 12px; border-radius: 20px; }
.pot-num.pulse { animation: potBump 0.32s ease; }
.banner { animation: sheetIn 0.28s ease; border: 1px solid; border-radius: 14px; padding: 10px 14px; width: 100%; max-width: 380px; }
.hand-strip { position: relative; overflow: hidden; display: flex; align-items: center; justify-content: space-between; background: rgba(244,247,252,0.04); border: 1px solid; border-radius: 12px; padding: 9px 14px; height: 38px; }
.tip { width: 100%; max-width: 460px; margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between; gap: 10px; border: 1px solid; border-radius: 12px; padding: 8px 12px; font-size: 11.5px; line-height: 1.4; }
.tip .iconbtn { flex-shrink: 0; color: inherit; }
.hero-seat { width: 100%; max-width: 460px; flex-shrink: 0; background: var(--t-panel); border: 1px solid; transition: border-color .4s ease, box-shadow .4s ease; border-radius: 20px; padding: 12px 14px; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.controls { width: 100%; max-width: 460px; display: flex; flex-direction: column; align-items: center; gap: 8px; flex-shrink: 0; padding-top: 10px; padding-bottom: env(safe-area-inset-bottom); }
.slider-row { display: flex; align-items: center; gap: 10px; background: rgba(244,247,252,0.06); padding: 8px 8px 8px 14px; border-radius: 14px; width: 100%; }
.rank-row { display: flex; align-items: center; gap: 12px; padding: 10px 4px; border-bottom: 1px solid rgba(244,247,252,0.06); }
.rank-row:last-child { border-bottom: none; }
.rank-num { width: 18px; font-size: 12px; font-weight: 600; color: var(--t-faint); text-align: right; flex-shrink: 0; }
.mcard { width: 21px; height: 30px; border-radius: 4px; background: #FFFFFF; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 9.5px; font-weight: 700; line-height: 1.05; box-shadow: 0 1px 2px rgba(0,0,0,0.3); }
.mm { position: fixed; top: 0; right: 0; bottom: 0; left: 0; z-index: 36; background: radial-gradient(130% 70% at 50% -15%, #1E427E 0%, var(--t-bg) 62%); display: flex; align-items: center; justify-content: center; transition: opacity .4s ease; }
.mm-inner { display: flex; flex-direction: column; align-items: center; gap: 12px; animation: sheetIn .3s ease; }
.mm-title { font-family: var(--t-display); font-size: 26px; font-weight: 700; }
.mm-sub { font-size: 13.5px; color: var(--t-mid); }

.results { position: fixed; top: 0; right: 0; bottom: 0; left: 0; z-index: 35; background: radial-gradient(130% 70% at 50% -15%, #1E427E 0%, var(--t-bg) 62%); display: flex; align-items: center; justify-content: center; padding: 20px 16px; overflow-y: auto; animation: resultsIn .35s ease; }
.results-inner { width: 100%; max-width: 380px; display: flex; flex-direction: column; margin: auto 0; }
.results-inner > * { animation: riseIn .5s cubic-bezier(.2,.9,.3,1) both; }
.results-inner > *:nth-child(2) { animation-delay: .05s; } .results-inner > *:nth-child(3) { animation-delay: .1s; }
.results-inner > *:nth-child(4) { animation-delay: .18s; } .results-inner > *:nth-child(5) { animation-delay: .26s; }
.results-inner > *:nth-child(n+6) { animation-delay: .34s; }
.badge-pop { animation: badgePop .7s cubic-bezier(.2,.9,.3,1.2) .2s both; filter: drop-shadow(0 10px 30px rgba(0,0,0,0.5)); }
.results-kicker { font-size: 12.5px; color: var(--t-mut); text-align: center; }
.results-head { font-family: var(--t-display); font-size: 52px; font-weight: 700; letter-spacing: -0.03em; line-height: 1; text-align: center; margin: 8px 0 8px; }
.results-sub { font-size: 14px; color: var(--t-mid); text-align: center; }
.results-delta { font-family: var(--t-display); font-size: 42px; font-weight: 700; text-align: center; margin: 22px 0 18px; letter-spacing: -0.02em; }
.results-delta span { font-family: var(--t-body); font-size: 15px; font-weight: 600; margin-left: 6px; opacity: .8; letter-spacing: 0; }
.results-tier { display: flex; align-items: center; gap: 14px; background: var(--t-panel); border: 1px solid rgba(244,247,252,0.08); border-radius: 16px; padding: 14px 16px; }
.results-note { margin-top: 10px; border: 1px solid; border-radius: 12px; padding: 10px 14px; font-size: 13px; text-align: center; }
.results-lines { margin-top: 16px; }
.results-lines > div { display: flex; justify-content: space-between; font-size: 13px; color: var(--t-sub); padding: 7px 2px; border-bottom: 1px solid rgba(244,247,252,0.06); }
.results-lines b { font-weight: 600; }
.results-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 16px; }
.results-stats > div { background: var(--t-panel); border-radius: 12px; padding: 10px 8px; text-align: center; }
.results-stats b { display: block; font-size: 16px; font-weight: 600; }
.results-stats span { font-size: 11px; color: var(--t-mut); }
.linkbtn { background: none; border: none; color: var(--t-mut); font-size: 12.5px; margin-top: 14px; cursor: pointer; text-decoration: underline; text-underline-offset: 3px; align-self: center; padding: 4px; }

.card { position: relative; width: clamp(30px,8.5vw,40px); height: clamp(43px,12vw,57px); border-radius: 7px; background: #FFFFFF; display:flex; flex-direction:column; align-items:center; justify-content:center; font-weight:800; font-size:clamp(11px,3.2vw,14px); box-shadow: 0 1px 0 rgba(255,255,255,0.7) inset, 0 2px 3px rgba(0,0,0,0.2), 0 8px 14px rgba(0,0,0,0.28); transition: opacity .35s ease, filter .35s ease; will-change: transform, opacity; backface-visibility: hidden; }
.card.dim { opacity: 0.3; filter: grayscale(0.7); }
.card.mucked { opacity: 0.4; filter: grayscale(0.5); }
.card.win { box-shadow: 0 1px 0 rgba(255,255,255,0.6) inset, 0 0 0 2px var(--t-accent), 0 0 16px rgba(245,184,61,0.6); }
.card.back { background-color: var(--back-a, #2F6FDE); background-image: repeating-linear-gradient(45deg, rgba(255,255,255,0.14) 0 3px, transparent 3px 7px); box-shadow: inset 0 0 0 2px var(--back-ring, #FFFFFF), inset 0 0 0 3.5px var(--back-b, #1F4FA8), 0 3px 8px rgba(0,0,0,0.35); }
.card.big { width: clamp(50px,15vw,66px); height: clamp(70px,21vw,92px); font-size: clamp(18px,5.4vw,24px); border-radius: 10px; }
.card.mini { width: 22px; height: 31px; font-size: 10px; border-radius: 5px; }
.btn { border: 1px solid rgba(244,247,252,0.18); background: rgba(244,247,252,0.05); border-radius: 14px; padding: 13px 18px; font-weight: 700; font-size: clamp(13px,3.5vw,14.5px); cursor: pointer; transition: transform .12s ease, background .15s ease, border-color .15s ease; color: var(--t-text); white-space: nowrap; flex: 1; }
.btn:hover:not(:disabled) { border-color: rgba(244,247,252,0.3); }
.btn:active:not(:disabled) { transform: scale(0.97); }
.btn:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-sm { flex: none; padding: 8px 16px; font-size: 13px; border-radius: 11px; }
.btn-fold { border-color: rgba(255,107,107,0.45); color: var(--t-bad); background: rgba(255,107,107,0.08); }
.btn-go { border-color: rgba(52,211,153,0.5); color: var(--t-good); background: rgba(52,211,153,0.08); }
.btn-raise { background: linear-gradient(180deg, #FFD666, var(--t-accent)); color: var(--t-bg); border-color: transparent; box-shadow: 0 6px 18px rgba(245,184,61,0.28); }
.btn-raise:hover:not(:disabled) { background: linear-gradient(180deg, #FFE08A, #FFC94D); border-color: transparent; }
.iconbtn { background: rgba(244,247,252,0.06); border: 1px solid rgba(244,247,252,0.14); color: var(--t-text2); width: 30px; height: 30px; border-radius: 50%; cursor: pointer; display:flex; align-items:center; justify-content:center; flex-shrink:0; transition: background .15s ease; padding: 0; }
.iconbtn:hover { background: rgba(244,247,252,0.12); }
.chip-badge { font-size: 10.5px; background: #0E1A30; color: var(--t-accent); border: 1px solid rgba(245,184,61,0.5); padding: 2px 8px; border-radius: 20px; font-weight: 700; font-variant-numeric: tabular-nums; transition: transform .5s cubic-bezier(.5,0,.3,1), opacity .5s ease; display: inline-block; }
.chip-badge.collecting { transform: translateY(-60px) scale(0.4); opacity: 0; }
.dealer-chip { position: absolute; bottom: -2px; right: -2px; width: 15px; height: 15px; border-radius: 50%; background: #FFFFFF; color: var(--t-bg); font-size: 8.5px; font-weight: 800; display:flex; align-items:center; justify-content:center; box-shadow: 0 1px 3px rgba(0,0,0,0.4); }
input[type=range] { accent-color: var(--t-accent); }
.preset-btn { display: flex; flex-direction: column; gap: 1px; padding: 8px 6px; border-color: rgba(245,184,61,0.45); color: var(--t-accent); background: rgba(245,184,61,0.08); }

.eq-meter { position: absolute; left: 0; top: 0; bottom: 0; transition: width .45s ease, background .3s ease; pointer-events: none; }
.hand-strip > span { z-index: 1; }
.felt-logo { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); font-family: var(--t-display); font-weight: 700; font-size: 64px; letter-spacing: -0.03em; color: rgba(255,255,255,0.06); pointer-events: none; user-select: none; }
.run2 { display: flex; align-items: center; gap: 4px; position: relative; }
.run2 > span { font-size: 10px; font-weight: 700; color: rgba(255,255,255,0.75); margin-right: 4px; }
.card.r2 { width: clamp(24px,6.5vw,30px); height: clamp(34px,9vw,42px); font-size: clamp(9px,2.6vw,11px); border-radius: 5px; }
.card.big.o4 { width: clamp(38px,11vw,48px); height: clamp(54px,15.5vw,68px); font-size: clamp(14px,4vw,18px); border-radius: 8px; }
.card.mini.m4 { width: 17px; height: 26px; font-size: 8.5px; }
.pre-row { display: flex; gap: 6px; width: 100%; }
.pre-btn { flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; border: 1px solid rgba(244,247,252,0.14); background: rgba(244,247,252,0.04); color: var(--t-sub); border-radius: 12px; padding: 12px 4px; font-size: 12.5px; font-weight: 600; cursor: pointer; transition: border-color .15s ease, color .15s ease, background .15s ease; white-space: nowrap; }
.pre-btn.on { border-color: rgba(245,184,61,0.65); color: var(--t-accent); background: rgba(245,184,61,0.1); }
.pre-box { width: 14px; height: 14px; border-radius: 4px; border: 1.5px solid currentColor; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
.squeeze { display: flex; gap: 6px; position: relative; touch-action: none; cursor: grab; -webkit-user-select: none; user-select: none; }
.card.sq { overflow: hidden; }
.sq-cover { position: absolute; top: 0; right: 0; bottom: 0; left: 0; border-radius: inherit; background-color: var(--back-a, #2F6FDE); background-image: repeating-linear-gradient(45deg, rgba(255,255,255,0.14) 0 3px, transparent 3px 7px); box-shadow: inset 0 0 0 2px var(--back-ring, #FFFFFF), inset 0 0 0 3.5px var(--back-b, #1F4FA8); }
.sq-hint { position: absolute; left: 0; right: 0; bottom: -15px; text-align: center; font-size: 10px; font-weight: 600; color: var(--t-mid); pointer-events: none; animation: hintPulse 1.6s ease-in-out infinite; }
.flights { position: fixed; top: 0; right: 0; bottom: 0; left: 0; pointer-events: none; z-index: 26; }
.flight { position: absolute; width: 0; height: 0; }
.fchip { position: absolute; left: -9px; top: -9px; width: 18px; height: 18px; border-radius: 50%; border: 3px dashed rgba(255,255,255,0.88); box-shadow: 0 2px 5px rgba(0,0,0,0.45); animation: chipFly .62s cubic-bezier(.3,.6,.25,1) both; }
.fchip.c0 { background: var(--t-accent); } .fchip.c1 { background: #E5383B; } .fchip.c2 { background: #2F6FDE; }
.float-amt { position: absolute; transform: translate(-50%, -50%); font-weight: 800; font-size: 17px; color: var(--t-good); text-shadow: 0 2px 10px rgba(0,0,0,0.7); animation: floatUp 1.3s ease-out .45s both; white-space: nowrap; }
.bigwin { position: fixed; top: 0; right: 0; bottom: 0; left: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; pointer-events: none; z-index: 27; animation: bigWinBg 2.1s ease both; }
.bigwin-label { font-family: var(--t-display); font-size: 30px; font-weight: 700; color: var(--t-accent); animation: bigWinPop 2.1s cubic-bezier(.2,.9,.3,1.2) both; }
.bigwin-amt { font-size: 56px; font-weight: 800; color: #FFFFFF; text-shadow: 0 6px 30px rgba(245,184,61,0.65); animation: bigWinPop 2.1s cubic-bezier(.2,.9,.3,1.2) .08s both; }
.shine { position: relative; overflow: hidden; }
.shine::after { content: ""; position: absolute; top: 0; bottom: 0; left: -60%; width: 40%; background: linear-gradient(100deg, transparent, rgba(255,255,255,0.5), transparent); transform: skewX(-20deg); animation: shimmer 4.8s ease-in-out infinite; pointer-events: none; }
.shine:disabled::after { display: none; }
@keyframes chipFly { 0% { transform: translate3d(0,0,0) scale(.7); opacity: 0; } 12% { opacity: 1; } 85% { opacity: 1; } 100% { transform: translate3d(var(--dx), var(--dy), 0) scale(1); opacity: 0; } }
@keyframes floatUp { 0% { opacity: 0; transform: translate(-50%,-30%) scale(.8); } 20% { opacity: 1; transform: translate(-50%,-90%) scale(1.08); } 100% { opacity: 0; transform: translate(-50%,-260%) scale(1); } }
@keyframes bigWinPop { 0% { opacity: 0; transform: scale(.5); } 18% { opacity: 1; transform: scale(1.1); } 30% { transform: scale(1); } 80% { opacity: 1; } 100% { opacity: 0; transform: scale(1.05) translateY(-20px); } }
@keyframes bigWinBg { 0% { background: rgba(11,20,38,0); } 20% { background: rgba(11,20,38,0.5); } 80% { background: rgba(11,20,38,0.5); } 100% { background: rgba(11,20,38,0); } }
@keyframes hintPulse { 0%, 100% { opacity: .5; } 50% { opacity: 1; } }
@keyframes shimmer { 0%, 72% { left: -60%; } 100% { left: 130%; } }
/* ---- progression + color pass ---- */
.app { position: relative; isolation: isolate; background: var(--t-bg); }
.app::before { content: ""; position: absolute; top: -20%; left: -20%; right: -20%; height: 90%; pointer-events: none; z-index: -1; background: radial-gradient(40% 45% at 22% 18%, rgba(59,130,246,0.38), transparent 70%), radial-gradient(35% 40% at 85% 10%, rgba(139,92,246,0.30), transparent 70%), radial-gradient(40% 40% at 60% 70%, rgba(20,184,166,0.16), transparent 70%); animation: aurora 22s ease-in-out infinite alternate; }
.app { overflow: hidden; }
@keyframes aurora { 0% { transform: translate3d(0,0,0) scale(1); } 50% { transform: translate3d(4%,3%,0) scale(1.06); } 100% { transform: translate3d(-4%,1%,0) scale(1.02); } }
.panel { background: linear-gradient(180deg, rgba(25,43,77,0.94), rgba(18,32,58,0.94)); box-shadow: 0 10px 30px rgba(0,0,0,0.22); }
.row, .stat, .avatar-tile { background: rgba(22,38,68,0.9); }
.panel-label { display: flex; align-items: center; gap: 6px; font-size: 12.5px; font-weight: 600; color: var(--t-mid); margin-bottom: 12px; }
.sec-ic { width: 28px; height: 28px; border-radius: 9px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.badge-dot { min-width: 18px; height: 18px; padding: 0 5px; border-radius: 9px; background: #FF5C7A; color: #FFFFFF; font-size: 11px; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; animation: badgePop .35s ease; }
.streak-pill { color: #FF9A4C; border-color: rgba(255,138,76,0.4); background: rgba(255,138,76,0.12); }

.streak-banner { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; padding: 14px 14px 14px 12px; border-radius: 18px; background: linear-gradient(120deg, #FF7A3D 0%, #F0447A 100%); box-shadow: 0 10px 28px rgba(240,68,122,0.3); animation: riseIn .4s ease both; }
.streak-flame { width: 42px; height: 42px; border-radius: 13px; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; color: #FFFFFF; animation: flameBob 1.6s ease-in-out infinite; flex-shrink: 0; }
@keyframes flameBob { 0%, 100% { transform: translateY(0) rotate(-3deg); } 50% { transform: translateY(-2px) rotate(3deg); } }
.streak-panel { background: linear-gradient(160deg, rgba(255,122,61,0.2) 0%, rgba(25,43,77,0.94) 55%); border-color: rgba(255,138,76,0.3); }
.streak-row { display: grid; grid-template-columns: repeat(7, 1fr); gap: 5px; margin-top: 14px; }
.streak-day { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 8px 0 7px; border-radius: 11px; background: rgba(244,247,252,0.05); border: 1px solid rgba(244,247,252,0.07); color: var(--t-mid); }
.streak-day .sd-n { font-size: 9.5px; font-weight: 600; }
.streak-day .sd-amt { font-size: 11px; font-weight: 700; color: var(--t-text); }
.streak-day.got { background: rgba(52,211,153,0.14); border-color: rgba(52,211,153,0.4); color: var(--t-good); }
.streak-day.today { border-color: #FF8A4C; background: rgba(255,138,76,0.16); box-shadow: 0 0 0 2px rgba(255,138,76,0.25); animation: hintPulse 1.8s ease-in-out infinite; }
.streak-day.big:not(.got) { background: linear-gradient(180deg, rgba(245,184,61,0.22), rgba(245,184,61,0.06)); border-color: rgba(245,184,61,0.45); }

.mode-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 14px; }
.mode-ic { width: 34px; height: 34px; border-radius: 11px; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; margin-bottom: 10px; }
.mode-title { font-size: 14px; font-weight: 700; }
.mode-sub { font-size: 11px; opacity: 0.82; margin-top: 1px; }

.pass-card { width: 100%; border: 1px solid rgba(196,160,255,0.35); border-radius: 20px; padding: 14px 16px; cursor: pointer; color: #FFFFFF; background: linear-gradient(135deg, #5B2BC9 0%, #8E2DB8 55%, #C2307E 100%); box-shadow: 0 12px 30px rgba(120,50,200,0.32); text-align: left; transition: transform .14s ease; }
.pass-card:active { transform: scale(0.98); }
.pass-lvl { width: 48px; height: 48px; border-radius: 14px; background: rgba(255,255,255,0.16); display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 19px; font-weight: 800; line-height: 1; flex-shrink: 0; }
.pr-ic { border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.pass-row { display: flex; align-items: center; gap: 10px; padding: 9px 8px; border-radius: 12px; border: 1px solid transparent; }
.pass-row + .pass-row { margin-top: 2px; }
.pass-row.special { background: rgba(139,92,246,0.1); }
.pass-row.got { opacity: 0.62; }
.pass-row.next { border-color: rgba(245,184,61,0.6); background: rgba(245,184,61,0.08); opacity: 1; }
.pass-row-n { width: 22px; text-align: center; font-size: 12px; font-weight: 700; color: var(--t-mid); }

.chal-panel { border-color: rgba(52,211,153,0.2); }
.chal { display: flex; align-items: center; gap: 12px; padding: 11px 12px; border-radius: 14px; background: rgba(244,247,252,0.04); border: 1px solid rgba(244,247,252,0.06); }
.chal.claimed { opacity: 0.5; }
.chal-done { width: 32px; height: 32px; border-radius: 50%; background: rgba(52,211,153,0.16); color: var(--t-good); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }

.var-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-bottom: 12px; }
.var-tile { border: 1.5px solid rgba(244,247,252,0.1); background: rgba(244,247,252,0.04); border-radius: 14px; padding: 10px 9px; text-align: left; cursor: pointer; transition: border-color .15s ease, background .15s ease; }
.var-name { font-size: 13px; font-weight: 700; }
.var-sub { font-size: 10.5px; color: var(--t-mut); margin-top: 2px; line-height: 1.3; }
.var-tile.on.v-holdem { border-color: var(--t-good); background: rgba(52,211,153,0.12); }
.var-tile.on.v-omaha { border-color: #A78BFA; background: rgba(139,92,246,0.14); }
.var-tile.on.v-short { border-color: #FF9A4C; background: rgba(255,138,76,0.13); }
.turbo-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 12px; padding: 10px 12px; border-radius: 14px; background: rgba(244,247,252,0.04); border: 1px solid rgba(244,247,252,0.07); }
.turbo-ic { width: 30px; height: 30px; border-radius: 9px; background: rgba(245,184,61,0.16); color: var(--t-accent); display: flex; align-items: center; justify-content: center; }

.cos-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.cos-tile { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 12px 6px 10px; border-radius: 16px; background: rgba(22,38,68,0.9); border: 1.5px solid rgba(244,247,252,0.07); cursor: pointer; transition: border-color .15s ease, transform .12s ease; }
.cos-tile:active:not(:disabled) { transform: scale(0.96); }
.cos-tile.on { border-color: var(--t-good); box-shadow: 0 0 0 3px rgba(52,211,153,0.15); }
.cos-tile:disabled { cursor: default; }
.cos-prev { height: 62px; display: flex; align-items: center; justify-content: center; }
.cos-name { font-size: 11.5px; font-weight: 600; text-align: center; }
.cos-tag { display: inline-flex; align-items: center; gap: 4px; font-size: 10.5px; font-weight: 700; padding: 3px 8px; border-radius: 10px; background: rgba(244,247,252,0.08); color: var(--t-text2); }
.cos-tag.eq { background: rgba(52,211,153,0.16); color: var(--t-good); }
.cos-tag.buy { background: rgba(245,184,61,0.16); color: var(--t-accent); }
.cos-tag.locked { color: var(--t-faint); }
.back-sw { border-radius: 6px; }
.felt-sw { width: 78px; height: 48px; border-radius: 999px; border: 4px solid; box-shadow: 0 4px 10px rgba(0,0,0,0.35), inset 0 4px 10px rgba(0,0,0,0.3); }

.chart-dot { position: absolute; width: 10px; height: 10px; margin: -5px 0 0 -5px; border-radius: 50%; box-shadow: 0 0 0 2px var(--t-panel); pointer-events: none; }
.best-row { display: flex; align-items: center; gap: 10px; padding: 9px 10px; border-radius: 12px; background: rgba(244,247,252,0.04); }
.best-n { width: 22px; height: 22px; border-radius: 50%; background: rgba(245,184,61,0.16); color: var(--t-accent); font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }

.play-fab-disc { animation: fabGlow 2.6s ease-in-out infinite; }
@keyframes fabGlow { 0%, 100% { box-shadow: 0 0 10px rgba(245,184,61,0.3); } 50% { box-shadow: 0 0 18px rgba(245,184,61,0.6); } }
.toast { background: linear-gradient(135deg, #1D3563, #2A1F5E); border-color: rgba(245,184,61,0.6); }
.table-wrap::before { content: ""; position: absolute; top: 0; left: 0; right: 0; bottom: 0; pointer-events: none; z-index: -1; background: radial-gradient(60% 40% at 50% 42%, var(--felt1, #22A866), transparent 70%); opacity: 0.16; animation: tableBreath 6s ease-in-out infinite; }
.table-wrap { isolation: isolate; }
@keyframes tableBreath { 0%, 100% { opacity: 0.12; } 50% { opacity: 0.22; } }
.pot-num { position: relative; }
.felt-oval { padding-top: 34px; padding-bottom: 28px; }
.felt-logo { white-space: nowrap; }
/* ---- round 3: coach, chip piles, all in drama, titles ---- */
.code-box { width: 100%; height: 76px; resize: none; font-family: ui-monospace, Menlo, monospace; font-size: 10.5px; line-height: 1.35; word-break: break-all; }
.title-tag { font-weight: 700; letter-spacing: 0.02em; white-space: nowrap; }
.title-btn { background: rgba(244,247,252,0.05); border: 1px solid rgba(244,247,252,0.1); border-radius: 20px; padding: 3px 10px; margin-top: 4px; display: inline-flex; align-items: center; gap: 5px; cursor: pointer; }
.title-row { display: flex; align-items: center; gap: 10px; width: 100%; padding: 11px 14px; border-radius: 14px; background: rgba(22,38,68,0.9); border: 1px solid rgba(244,247,252,0.07); }
.title-row.on { border-color: var(--t-good); }
.standing { margin-left: 8px; font-size: 10.5px; font-weight: 700; color: var(--t-accent); background: rgba(245,184,61,0.12); border-radius: 8px; padding: 1px 6px; }

.coach { width: 100%; max-width: 460px; margin-bottom: 8px; border-radius: 14px; padding: 9px 12px 10px; border: 1px solid rgba(111,168,255,0.35); background: linear-gradient(135deg, rgba(47,111,222,0.16), rgba(139,92,246,0.12)); animation: fadeSlide .25s ease; flex-shrink: 0; }
.coach-head { display: flex; align-items: center; gap: 8px; margin-bottom: 3px; }
.coach-badge { display: inline-flex; align-items: center; gap: 4px; font-size: 10.5px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: #9CC2FF; }
.coach-act { font-size: 14px; font-weight: 800; }
.coach-why { font-size: 12px; line-height: 1.4; color: var(--t-text2); }
.coach.act-raise .coach-act, .coach.act-bet .coach-act { color: var(--t-accent); }
.coach.act-call .coach-act, .coach.act-check .coach-act { color: var(--t-good); }
.coach.act-fold .coach-act { color: #FF8A8A; }
.coach.note.good { border-color: rgba(52,211,153,0.4); background: rgba(52,211,153,0.1); }
.coach.note.bad { border-color: rgba(255,138,76,0.45); background: rgba(255,138,76,0.1); }
.coach.note.bad .coach-badge { color: #FFB37A; }
.coach.note.good .coach-badge { color: #6EE7B7; }

.chipstack { display: inline-flex; align-items: flex-end; gap: 2px; vertical-align: bottom; }
.chipcol { display: flex; flex-direction: column-reverse; }
.pchip { display: block; width: 24px; height: 6px; border-radius: 10px / 3px; margin-top: -1.5px; background: repeating-linear-gradient(90deg, var(--cc) 0 3px, rgba(255,255,255,0.85) 3px 5px, var(--cc) 5px 9px); box-shadow: inset 0 -1.5px 0 rgba(0,0,0,0.35), 0 1px 1px rgba(0,0,0,0.35); animation: chipDrop .28s cubic-bezier(.3,1.4,.5,1) backwards; }
.chipstack.sm .pchip { width: 12px; height: 3.5px; margin-top: -1px; border-radius: 6px / 2px; }
@keyframes chipDrop { from { transform: translateY(-10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
.pot-row { display: flex; align-items: flex-end; gap: 8px; position: relative; min-height: 30px; }
.chip-badge { display: inline-flex; align-items: center; gap: 5px; }

.odds-badge { font-size: 11px; font-weight: 800; background: rgba(11,20,38,0.85); border: 1px solid rgba(244,247,252,0.15); border-radius: 10px; padding: 1px 7px; animation: fadeSlide .25s ease; }
.think-dots { position: absolute; top: -6px; right: -10px; display: flex; gap: 2px; background: var(--t-text); border-radius: 10px; padding: 4px 5px; box-shadow: 0 2px 6px rgba(0,0,0,0.35); }
.think-dots i { width: 4px; height: 4px; border-radius: 50%; background: var(--t-bg); animation: thinkDot 1s ease-in-out infinite; }
.think-dots i:nth-child(2) { animation-delay: .15s; }
.think-dots i:nth-child(3) { animation-delay: .3s; }
@keyframes thinkDot { 0%, 100% { opacity: .3; transform: translateY(0); } 40% { opacity: 1; transform: translateY(-2px); } }

.drama-vignette { position: fixed; top: 0; left: 0; right: 0; bottom: 0; pointer-events: none; z-index: 5; background: radial-gradient(ellipse 70% 40% at 50% 50%, transparent 30%, rgba(0,0,0,0.55) 100%); animation: dramaIn .5s ease both, dramaPulse 0.85s ease-in-out .5s infinite; }
@keyframes dramaIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes dramaPulse { 0%, 100% { opacity: 1; } 30% { opacity: 0.75; } }
.felt-oval.drama { z-index: 6; box-shadow: inset 0 0 0 2px rgba(0,0,0,0.25), inset 0 10px 30px rgba(0,0,0,0.35), 0 0 0 2px rgba(245,184,61,0.5), 0 0 50px rgba(245,184,61,0.35); transition: box-shadow .4s ease; }
.is-drama .hero-seat { position: relative; z-index: 6; }
.card-slot.next { border-color: #F5C451; border-style: solid; box-shadow: 0 0 16px rgba(245,184,61,0.6); animation: slotPulse .85s ease-in-out infinite; }
@keyframes slotPulse { 0%, 100% { transform: scale(1); } 30% { transform: scale(1.07); } }
/* ---- daily spin, high roller room, prestige ---- */
.spin-card { width: 100%; display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 18px; cursor: pointer; text-align: left; color: var(--t-text); background: rgba(22,38,68,0.9); border: 1px solid rgba(244,247,252,0.08); transition: transform .14s ease; }
.spin-card:active { transform: scale(0.98); }
.spin-card.ready { background: linear-gradient(120deg, #1D5FD6 0%, #0EA5B7 100%); border-color: transparent; box-shadow: 0 10px 26px rgba(14,165,183,0.28); }
.spin-ic { width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.14); flex-shrink: 0; }
.spin-card.ready .spin-ic { animation: spinNudge 3s ease-in-out infinite; }
@keyframes spinNudge { 0%, 70%, 100% { transform: rotate(0); } 80% { transform: rotate(-25deg); } 90% { transform: rotate(15deg); } }
.wheel-wrap { position: relative; width: 260px; max-width: 100%; margin: 6px auto 0; height: 260px; }
.wheel { width: 100%; height: 100%; display: block; filter: drop-shadow(0 10px 24px rgba(0,0,0,0.45)); }
.wheel-pointer { position: absolute; top: -6px; left: 50%; margin-left: -13px; width: 0; height: 0; border-left: 13px solid transparent; border-right: 13px solid transparent; border-top: 24px solid #F5C451; z-index: 2; filter: drop-shadow(0 3px 4px rgba(0,0,0,0.5)); }
.spin-result { text-align: center; margin-top: 14px; animation: badgePop .45s cubic-bezier(.3,1.4,.5,1) both; }


.prestige-badge { display: inline-block; flex-shrink: 0; vertical-align: middle; margin-left: 2px; overflow: visible; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.35)); }
.prestige-btn { border-color: rgba(227,107,255,0.55); color: #F0C2FF; background: linear-gradient(135deg, rgba(227,107,255,0.16), rgba(124,58,237,0.16)); font-size: 13px; }
/* ---- 9 handed: two rows of four, tighter table ---- */
.seats.grid4 { display: grid; grid-template-columns: repeat(4, 1fr); justify-items: center; row-gap: 2px; margin-top: 0; }
.crowded .status { margin: 4px 0 0; }
.crowded .felt-oval { padding: 16px 14px 12px; gap: 8px; }
.crowded .felt-center { gap: 6px; }
.crowded .felt-oval .card, .crowded .card-slot { width: clamp(28px,7.6vw,36px); height: clamp(40px,10.8vw,51px); }
.crowded .felt-logo { font-size: 52px; }
.crowded .chip-badge { padding: 1px 7px; }
/* ---- rank ladder ---- */
.ranked-info { display: inline-flex; align-items: center; gap: 5px; background: none; border: none; padding: 0; cursor: pointer; color: var(--t-mut); font-size: 12px; }
.ranked-badge-btn { background: none; border: none; padding: 0; cursor: pointer; display: block; }
.ladder-me { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 16px; border: 1px solid; margin-bottom: 12px; }
.ladder-list { max-height: 44vh; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; margin: 0 -4px; padding: 0 4px; }
.ladder-tier { border: 1px solid; border-radius: 14px; padding: 10px 12px; background: rgba(22,38,68,0.7); }
.ladder-tier-head { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.ladder-divs { display: flex; flex-direction: column; gap: 4px; }
.ladder-div { display: flex; justify-content: space-between; align-items: center; font-size: 12.5px; padding: 6px 10px; border-radius: 9px; border: 1px solid transparent; background: rgba(244,247,252,0.03); color: var(--t-text2); }
.ladder-div.passed { color: var(--t-mut); }
.ladder-section { margin-top: 14px; padding-top: 12px; border-top: 1px solid rgba(244,247,252,0.08); }
.ladder-h { font-size: 13.5px; font-weight: 700; margin-bottom: 6px; }
.ladder-p { font-size: 12px; line-height: 1.45; color: var(--t-mid); margin-bottom: 6px; }
.prestige-box { border: 1px solid rgba(227,107,255,0.3); border-radius: 14px; padding: 12px; background: linear-gradient(135deg, rgba(227,107,255,0.08), rgba(124,58,237,0.08)); }
/* ---- rank emblems ---- */
.tb-champ .tb-sparkle { animation: tbTwinkle 2.4s ease-in-out infinite; transform-origin: 32px 32px; }
@keyframes tbTwinkle { 0%, 100% { opacity: 1; } 50% { opacity: 0.25; } }
/* ---- theme shop ---- */
.theme-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.theme-card { display: flex; flex-direction: column; gap: 4px; padding: 10px; border-radius: 16px; background: var(--t-panel); border: 1px solid rgba(244,247,252,0.08); min-height: 228px; }
.theme-card.on { box-shadow: inset 0 0 0 1.5px var(--t-good); }
.theme-card.viewing { box-shadow: inset 0 0 0 1.5px var(--t-accent); }
.theme-mock { border-radius: 10px; padding: 10px; display: flex; flex-direction: column; gap: 7px; height: 108px; margin-bottom: 6px; box-shadow: inset 0 0 0 1px rgba(255,255,255,0.06); overflow: hidden; }
.tm-panel { padding: 8px; }
.theme-name { font-size: 14.5px; font-weight: 700; }
.theme-sub { font-size: 11.5px; line-height: 1.35; color: var(--t-mut); margin-bottom: 8px; }
.preview-bar { position: fixed; left: 50%; transform: translateX(-50%); bottom: calc(86px + env(safe-area-inset-bottom)); width: calc(100% - 24px); max-width: 436px; z-index: 35; display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-radius: 14px; background: var(--t-panel); color: var(--t-text); border: 1px solid var(--t-accent); box-shadow: 0 12px 30px rgba(0,0,0,0.45); animation: sheetIn .2s ease; }
.preview-bar .btn { flex: none; }
/* ---- theme packs: each one is scoped to a class on <body> ---- */
body.theme-afterhours { --t-bg: #120F0D; --t-panel: #1C1814; --t-panel2: #2A241E; --t-text: #EDE6D8; --t-text2: #DDD5C7; --t-sub: #C3BAAB; --t-mid: #A69D8F; --t-mut: #8F8678; --t-faint: #6E665B; --t-accent: #C9A66B; --t-good: #8CC5A0; --t-bad: #D0756D; --t-display: 'Instrument Serif', Georgia, serif; --t-body: 'Hanken Grotesk Variable', 'Hanken Grotesk', -apple-system, sans-serif; background: var(--t-bg); }
body.theme-afterhours { --bg: #120F0D; --raise: #1C1814; --raise2: #241F1A; --rule: rgba(237,230,216,0.10); --rule2: rgba(237,230,216,0.18); --ivory: #EDE6D8; --muted: #A69D8F; --faint: #6E665B; --brass: #C9A66B; --brass-dim: rgba(201,166,107,0.16); --win: #8CC5A0; --loss: #D0756D; --serif: 'Instrument Serif', Georgia, serif; --sans: 'Hanken Grotesk Variable', 'Hanken Grotesk', -apple-system, sans-serif; }
body.theme-afterhours { background: var(--bg); }
body.theme-afterhours .app, body.theme-afterhours .app-table, body.theme-afterhours .table-wrap, body.theme-afterhours .sheet, body.theme-afterhours .loading, body.theme-afterhours button, body.theme-afterhours input, body.theme-afterhours textarea { font-family: var(--sans); }
body.theme-afterhours .app, body.theme-afterhours .app-table, body.theme-afterhours .loading { background: var(--bg); }
body.theme-afterhours .app::before, body.theme-afterhours .table-wrap::before { display: none; }
body.theme-afterhours .app-main { padding-top: 10px; }
body.theme-afterhours .screen-fade { animation: none; }
body.theme-afterhours .wordmark, body.theme-afterhours .wordmark-sm, body.theme-afterhours .loading-word { font-family: var(--serif) !important; font-weight: 400 !important; letter-spacing: -0.01em; color: var(--ivory); }
body.theme-afterhours .wordmark { font-size: 30px; font-style: italic; }
body.theme-afterhours .wordmark-sm { font-size: 20px; font-style: italic; }
body.theme-afterhours .loading-word { font-style: italic; font-size: 56px; }
body.theme-afterhours .sheet-title, body.theme-afterhours .results-head, body.theme-afterhours .bigwin-label, body.theme-afterhours .bigwin-amt { font-family: var(--serif) !important; font-weight: 400 !important; letter-spacing: 0; }
body.theme-afterhours .sheet-title { font-size: 26px; }
body.theme-afterhours .results-head { font-size: 54px !important; }
body.theme-afterhours .row-title { font-weight: 600; letter-spacing: -0.005em; }
body.theme-afterhours [style*="Instrument Serif"] { font-weight: 400 !important; }
body.theme-afterhours .panel, body.theme-afterhours .stat, body.theme-afterhours .avatar-tile, body.theme-afterhours .cos-tile, body.theme-afterhours .ladder-tier, body.theme-afterhours .hero-seat, body.theme-afterhours .var-tile, body.theme-afterhours .spin-card, body.theme-afterhours .pass-card, body.theme-afterhours .streak-banner, body.theme-afterhours .chal-panel, body.theme-afterhours .streak-panel { background: var(--raise) !important; border: 1px solid var(--rule) !important; border-radius: 12px !important; box-shadow: none !important; color: var(--ivory); }
body.theme-afterhours .row, body.theme-afterhours .chal, body.theme-afterhours .best-row, body.theme-afterhours .title-row, body.theme-afterhours .ach-row, body.theme-afterhours .lb-row, body.theme-afterhours .turbo-row, body.theme-afterhours .ladder-div { background: transparent !important; border: none !important; border-bottom: 1px solid var(--rule) !important; border-radius: 0 !important; box-shadow: none !important; padding-left: 2px; padding-right: 2px; }
body.theme-afterhours .list { gap: 0 !important; }
body.theme-afterhours .lb-row[style*="140, body.theme-afterhours 197, body.theme-afterhours 160"], body.theme-afterhours .lb-row[style*="52, body.theme-afterhours 211, body.theme-afterhours 153"] { background: var(--brass-dim) !important; border-radius: 8px !important; }
body.theme-afterhours .ladder-div.here { background: var(--brass-dim) !important; border-radius: 8px !important; }
body.theme-afterhours button.row:active:not(:disabled) { background: var(--raise) !important; }
body.theme-afterhours .sheet { background: var(--raise) !important; border: 1px solid var(--rule2) !important; border-radius: 16px; box-shadow: 0 30px 80px rgba(0,0,0,0.6); animation: sheetIn .2s ease; }
body.theme-afterhours .scrim { background: rgba(8,6,5,0.78); }
body.theme-afterhours .kv, body.theme-afterhours .kv-list { border-color: var(--rule) !important; }
body.theme-afterhours .bar { background: var(--rule); height: 3px; border-radius: 2px; }
body.theme-afterhours .bar > div { border-radius: 2px; }
body.theme-afterhours .sec-ic, body.theme-afterhours .mode-ic, body.theme-afterhours .turbo-ic, body.theme-afterhours .streak-flame, body.theme-afterhours .spin-ic { display: none !important; }
body.theme-afterhours .btn { background: transparent; border: 1px solid var(--rule2); color: var(--ivory); border-radius: 10px; font-weight: 600; letter-spacing: 0; box-shadow: none; }
body.theme-afterhours .btn:hover:not(:disabled) { border-color: var(--muted); }
body.theme-afterhours .btn-raise, body.theme-afterhours .btn-raise:hover:not(:disabled), body.theme-afterhours .btn-go, body.theme-afterhours .btn-go:hover:not(:disabled) { background: var(--ivory); color: #1A1612; border-color: var(--ivory); box-shadow: none; }
body.theme-afterhours .btn-fold, body.theme-afterhours .btn-fold:hover:not(:disabled) { background: transparent; color: var(--loss); border-color: rgba(208,117,109,0.4); }
body.theme-afterhours .btn:disabled { opacity: 0.35; }
body.theme-afterhours .shine::after { display: none !important; }
body.theme-afterhours .iconbtn { background: transparent; border: 1px solid var(--rule2); color: var(--muted); }
body.theme-afterhours .preset-btn { background: var(--raise2); }
body.theme-afterhours .seg { background: transparent; border: 1px solid var(--rule2); border-radius: 10px; }
body.theme-afterhours .segbtn { color: var(--muted); font-weight: 600; }
body.theme-afterhours .segbtn.on { background: var(--ivory); color: #1A1612; }
body.theme-afterhours .chip-pill { background: transparent; border: 1px solid var(--rule2); color: var(--ivory); }
body.theme-afterhours .chip-dot { background: var(--brass); box-shadow: inset 0 0 0 2.5px var(--bg), inset 0 0 0 4px var(--brass); }
body.theme-afterhours .input { background: transparent; border: 1px solid var(--rule2); color: var(--ivory); }
body.theme-afterhours .toast { background: var(--ivory); border: none; box-shadow: 0 16px 40px rgba(0,0,0,0.5); }
body.theme-afterhours .toast div:first-child { color: #8A6A30 !important; }
body.theme-afterhours .toast div:last-child { color: #1A1612 !important; }
body.theme-afterhours .badge-dot { background: var(--brass); color: #1A1612; }
body.theme-afterhours .cos-tile.on, body.theme-afterhours .title-row.on { box-shadow: inset 0 0 0 1px var(--brass) !important; }
body.theme-afterhours .bottom-nav { background: var(--bg); border-top: 1px solid var(--rule); }
body.theme-afterhours .navbtn { color: var(--faint) !important; }
body.theme-afterhours .navbtn[aria-current="page"] { color: var(--ivory) !important; }
body.theme-afterhours .play-fab { color: var(--ivory); }
body.theme-afterhours .play-fab-disc { width: 46px; height: 46px; background: transparent; color: var(--brass); border: 1px solid var(--brass); box-shadow: none !important; animation: none; }
body.theme-afterhours .play-fab.on .play-fab-disc { background: var(--brass); color: var(--bg); }
body.theme-afterhours .play-fab:not(.on) .play-fab-disc { filter: none; }
body.theme-afterhours .home3 { padding-bottom: 48px; }
body.theme-afterhours .h3-top { display: flex; justify-content: space-between; align-items: baseline; margin: 0 2px 26px; }
body.theme-afterhours .h3-bank { display: flex; align-items: center; gap: 7px; font-size: 15px; font-weight: 600; color: var(--ivory); }
body.theme-afterhours .h3-hello { margin: 0 2px 26px; }
body.theme-afterhours .h3-hello h1 { font-family: var(--serif); font-weight: 400; font-size: 40px; line-height: 1.02; letter-spacing: -0.01em; margin: 0; color: var(--ivory); }
body.theme-afterhours .h3-hello p { margin: 8px 0 0; font-size: 13.5px; color: var(--muted); }
body.theme-afterhours .h3-today { border-top: 1px solid var(--rule); margin-bottom: 30px; }
body.theme-afterhours .h3-line { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 2px; border-bottom: 1px solid var(--rule); }
body.theme-afterhours .h3-line b { display: block; font-size: 15px; font-weight: 600; }
body.theme-afterhours .h3-line span { display: block; font-size: 12.5px; color: var(--muted); margin-top: 2px; }
body.theme-afterhours .h3-sec-head { display: flex; justify-content: space-between; align-items: baseline; margin: 0 2px 12px; }
body.theme-afterhours .h3-sec-head h2 { font-family: var(--serif); font-weight: 400; font-size: 26px; margin: 0; color: var(--ivory); }
body.theme-afterhours .h3-link { background: none; border: none; padding: 0; color: var(--brass); font-size: 13px; font-weight: 600; cursor: pointer; }
body.theme-afterhours .h3-ranked { margin-bottom: 34px; }
body.theme-afterhours .h3-rank-row { display: flex; align-items: center; gap: 14px; margin-bottom: 14px; }
body.theme-afterhours .h3-rank-name { display: flex; align-items: center; gap: 8px; font-family: var(--serif); font-size: 32px; line-height: 1; color: var(--ivory); }
body.theme-afterhours .h3-rank-sub { font-size: 13px; color: var(--muted); margin-top: 6px; }
body.theme-afterhours .h3-rank-note { font-size: 12.5px; color: var(--brass); margin-top: 4px; }
body.theme-afterhours .h3-record { font-family: var(--serif); font-size: 26px; color: var(--ivory); white-space: nowrap; }
body.theme-afterhours .h3-record small { font-family: var(--sans); font-size: 11px; color: var(--faint); margin: 0 4px 0 1px; }
body.theme-afterhours .h3-track { height: 2px; background: var(--rule2); border-radius: 1px; overflow: hidden; }
body.theme-afterhours .h3-track > div { height: 100%; background: var(--brass); }
body.theme-afterhours .h3-tables { margin-bottom: 34px; }
body.theme-afterhours .h3-table { display: grid; grid-template-columns: 1fr auto; width: 100%; text-align: left; background: none; border: none; border-top: 1px solid var(--rule); padding: 16px 2px; color: var(--ivory); cursor: pointer; }
body.theme-afterhours .h3-table:last-child { border-bottom: 1px solid var(--rule); }
body.theme-afterhours .h3-table:active:not(:disabled) .h3-table-name { color: var(--brass); }
body.theme-afterhours .h3-table:disabled { cursor: default; }
body.theme-afterhours .h3-table:disabled .h3-table-name { color: var(--faint); }
body.theme-afterhours .h3-table-name { font-family: var(--serif); font-size: 25px; line-height: 1.05; }
body.theme-afterhours .h3-table-sub { font-size: 12.5px; color: var(--muted); margin-top: 3px; }
body.theme-afterhours .h3-table.vip .h3-table-name { color: var(--brass); font-style: italic; }
body.theme-afterhours .h3-pass { margin-bottom: 30px; }
body.theme-afterhours .h3-pass-btn { width: 100%; background: none; border: none; padding: 0; color: var(--ivory); text-align: left; cursor: pointer; }
body.theme-afterhours .h3-pass-sub { display: flex; justify-content: space-between; font-size: 12.5px; color: var(--muted); margin-top: 8px; }
body.theme-afterhours .home3 .chal-panel { background: transparent !important; border: none !important; padding: 0 !important; }
body.theme-afterhours .home3 .chal-panel > div:first-child > div > div:nth-child(2) { font-family: var(--serif); font-weight: 400 !important; font-size: 26px !important; }
body.theme-afterhours .home3 .chal { padding: 12px 2px; }
body.theme-afterhours .home3 .chal:first-child { border-top: 1px solid var(--rule) !important; }
body.theme-afterhours .table-wrap[data-felt="green"] { --felt1: #2A5B47 !important; --felt2: #1D4636 !important; --felt3: #133227 !important; --rail: #2B2018 !important; }
body.theme-afterhours .felt-oval { box-shadow: inset 0 0 0 1px rgba(0,0,0,0.3), inset 0 12px 30px rgba(0,0,0,0.4), 0 20px 40px rgba(0,0,0,0.45); }
body.theme-afterhours .felt-logo { font-family: var(--serif) !important; font-style: italic; font-weight: 400 !important; }
body.theme-afterhours .pot-num { background: rgba(0,0,0,0.35); font-weight: 600; }
body.theme-afterhours .hand-strip { background: var(--raise) !important; border-color: var(--rule) !important; }
body.theme-afterhours .eq-meter { opacity: 0.6; }
body.theme-afterhours .status { color: var(--muted); }
body.theme-afterhours .coach { background: var(--raise) !important; border: 1px solid var(--brass-dim) !important; border-left: 2px solid var(--brass) !important; border-radius: 10px; }
body.theme-afterhours .coach-badge { color: var(--brass) !important; }
body.theme-afterhours .chip-badge { background: var(--bg); border-color: rgba(201,166,107,0.5); color: var(--brass); }
body.theme-afterhours .bot-av { font-family: var(--serif) !important; font-weight: 400 !important; font-size: 17px !important; }
body.theme-afterhours .lb-dock { background: linear-gradient(180deg, rgba(18,15,13,0) 0%, var(--bg) 35%) !important; }
body.theme-afterhours .streak-day { background: transparent !important; border-color: var(--rule) !important; color: var(--muted) !important; box-shadow: none !important; animation: none !important; }
body.theme-afterhours .streak-day.got { color: var(--win) !important; }
body.theme-afterhours .streak-day.today { border-color: var(--brass) !important; color: var(--ivory) !important; }
body.theme-afterhours .streak-day.big:not(.got) { border-color: rgba(201,166,107,0.4) !important; }
body.theme-afterhours .cos-tag.buy { background: var(--brass-dim); color: var(--brass); }
body.theme-afterhours .cos-tag.eq { background: rgba(140,197,160,0.12); color: var(--win); }
body.theme-afterhours .felt-sw { box-shadow: inset 0 4px 10px rgba(0,0,0,0.3) !important; }
body.theme-afterhours .table-wrap[data-back="blue"] { --back-a: #7A2730 !important; --back-b: #5C1A22 !important; --back-ring: #EDE6D8 !important; }
body.theme-afterhours .bot-av { filter: saturate(0.55) brightness(0.9); }
body.theme-cardroom { --t-bg: #0C3528; --t-panel: #134A39; --t-panel2: #1B5A45; --t-text: #F2F7F4; --t-text2: #E3EEE8; --t-sub: #C3D9CF; --t-mid: #A9C7BA; --t-mut: #93B5A6; --t-faint: #6F9584; --t-accent: #E9B949; --t-good: #8FE0B0; --t-bad: #FF9A9E; --t-display: 'Archivo Variable', 'Archivo', -apple-system, sans-serif; --t-body: 'Archivo Variable', 'Archivo', -apple-system, sans-serif; background: var(--t-bg); }
body.theme-cardroom { --felt-bg: #0C3528; --felt-up: #124636; --felt-up2: #175641; --felt-line: rgba(232,245,238,0.09); --card: #F6F7F4; --card-edge: #DADDD6; --ink: #121417; --red: #D8343B; --red-dark: #B02028; --gold: #E9B949; --muted: #93B5A6; }
body.theme-cardroom { background: var(--felt-bg); }
body.theme-cardroom .app, body.theme-cardroom .app-table, body.theme-cardroom .table-wrap, body.theme-cardroom .sheet, body.theme-cardroom .loading, body.theme-cardroom button, body.theme-cardroom input, body.theme-cardroom textarea { font-family: 'Archivo Variable', 'Archivo', -apple-system, sans-serif; }
body.theme-cardroom .app, body.theme-cardroom .app-table, body.theme-cardroom .loading { background-color: var(--felt-bg); background-image: radial-gradient(120% 70% at 50% 0%, rgba(255,255,255,0.07), transparent 60%), repeating-radial-gradient(circle at 20% 30%, rgba(255,255,255,0.018) 0 1px, transparent 1px 3px); }
body.theme-cardroom .app::before, body.theme-cardroom .table-wrap::before { display: none; }
body.theme-cardroom .screen { padding-top: 6px; }
body.theme-cardroom .wordmark, body.theme-cardroom .sheet-title, body.theme-cardroom .results-head, body.theme-cardroom .loading-word, body.theme-cardroom .wordmark-sm, body.theme-cardroom .mode-title, body.theme-cardroom .bigwin-label, body.theme-cardroom .pass-lvl, body.theme-cardroom .bigwin-amt { font-family: 'Archivo Variable', 'Archivo', -apple-system, sans-serif !important; }
body.theme-cardroom .wordmark, body.theme-cardroom .sheet-title, body.theme-cardroom .results-head, body.theme-cardroom .loading-word, body.theme-cardroom .wordmark-sm, body.theme-cardroom .mode-title, body.theme-cardroom .bigwin-label, body.theme-cardroom .pass-lvl, body.theme-cardroom [style*="Archivo"] { font-stretch: 125%; font-weight: 800 !important; letter-spacing: -0.015em; }
body.theme-cardroom .wordmark { font-size: 32px; letter-spacing: -0.03em; }
body.theme-cardroom .wordmark::after, body.theme-cardroom .wordmark-sm::after { content: "♦"; color: var(--red); font-size: 0.42em; margin-left: 3px; vertical-align: 0.9em; }
body.theme-cardroom .sheet-title { font-size: 20px; }
body.theme-cardroom .row-title { font-weight: 700; }
body.theme-cardroom .panel, body.theme-cardroom .row, body.theme-cardroom .stat, body.theme-cardroom .avatar-tile, body.theme-cardroom .cos-tile, body.theme-cardroom .title-row, body.theme-cardroom .chal, body.theme-cardroom .best-row, body.theme-cardroom .ladder-tier, body.theme-cardroom .lb-row, body.theme-cardroom .hero-seat, body.theme-cardroom .turbo-row, body.theme-cardroom .var-tile, body.theme-cardroom .ach-row, body.theme-cardroom .spin-card, body.theme-cardroom .pass-card, body.theme-cardroom .streak-banner { background: var(--felt-up) !important; border: 1px solid var(--felt-line) !important; box-shadow: 0 1px 0 rgba(255,255,255,0.05) inset, 0 6px 18px rgba(0,0,0,0.18); color: #F2F7F4; }
body.theme-cardroom .row, body.theme-cardroom .chal, body.theme-cardroom .best-row, body.theme-cardroom .title-row, body.theme-cardroom .ach-row, body.theme-cardroom .lb-row, body.theme-cardroom .turbo-row { background: var(--felt-up2) !important; box-shadow: none; }
body.theme-cardroom .panel { border-radius: 18px; }
body.theme-cardroom .sheet { background: #0F3F30 !important; border: 1px solid var(--felt-line) !important; border-radius: 20px; }
body.theme-cardroom .scrim { background: rgba(4,20,14,0.72); }
body.theme-cardroom button.row:active:not(:disabled) { background: #1B6049 !important; }
body.theme-cardroom .chal-panel, body.theme-cardroom .streak-panel { border-color: var(--felt-line) !important; }
body.theme-cardroom .bar { background: rgba(0,0,0,0.28); height: 6px; }
body.theme-cardroom .btn { border: 1.5px solid rgba(232,245,238,0.22); background: transparent; color: #F2F7F4; border-radius: 12px; font-weight: 700; box-shadow: none; }
body.theme-cardroom .btn:hover:not(:disabled) { border-color: rgba(232,245,238,0.4); }
body.theme-cardroom .btn-raise, body.theme-cardroom .btn-raise:hover:not(:disabled) { background: var(--red); color: #FFFFFF; border-color: var(--red); box-shadow: 0 2px 0 var(--red-dark), 0 8px 18px rgba(216,52,59,0.25); }
body.theme-cardroom .btn-raise:active:not(:disabled) { box-shadow: 0 0 0 var(--red-dark); transform: translateY(2px); }
body.theme-cardroom .btn-go, body.theme-cardroom .btn-go:hover:not(:disabled) { background: var(--card); color: var(--ink); border-color: var(--card); box-shadow: 0 2px 0 var(--card-edge); }
body.theme-cardroom .btn-fold, body.theme-cardroom .btn-fold:hover:not(:disabled) { background: transparent; color: #FF9A9E; border-color: rgba(255,120,125,0.45); }
body.theme-cardroom .shine::after { display: none; }
body.theme-cardroom .iconbtn { background: rgba(232,245,238,0.07); border: 1px solid var(--felt-line); color: #E3EEE8; }
body.theme-cardroom .preset-btn { background: var(--felt-up2); }
body.theme-cardroom .segbtn.on { background: var(--card); color: var(--ink); }
body.theme-cardroom .seg { background: rgba(0,0,0,0.22); }
body.theme-cardroom .chip-pill { background: rgba(0,0,0,0.22); border: 1px solid var(--felt-line); }
body.theme-cardroom .chip-dot { background: var(--gold); box-shadow: inset 0 0 0 2.5px var(--felt-bg), inset 0 0 0 4px var(--gold); }
body.theme-cardroom .input { background: rgba(0,0,0,0.22); border: 1px solid var(--felt-line); color: #fff; }
body.theme-cardroom .toast { background: var(--card); border: none; box-shadow: 0 12px 30px rgba(0,0,0,0.4); }
body.theme-cardroom .toast div:first-child { color: var(--red) !important; }
body.theme-cardroom .toast div:last-child { color: var(--ink) !important; }
body.theme-cardroom .streak-banner .btn-raise, body.theme-cardroom .spin-card .btn-raise, body.theme-cardroom .chal .btn-go, body.theme-cardroom .streak-panel .btn-raise { background: var(--card); color: var(--ink); border-color: var(--card); box-shadow: 0 2px 0 var(--card-edge); }
body.theme-cardroom .streak-banner { animation: none; }
body.theme-cardroom .streak-flame, body.theme-cardroom .spin-ic, body.theme-cardroom .sec-ic, body.theme-cardroom .turbo-ic, body.theme-cardroom .mode-ic { background: rgba(232,245,238,0.08) !important; color: var(--gold) !important; border: none; }
body.theme-cardroom .streak-banner > div:nth-child(2) > div:last-child, body.theme-cardroom .spin-card > div:nth-child(2) > div:last-child { color: var(--muted) !important; }
body.theme-cardroom .spin-card.ready { box-shadow: 0 0 0 1px rgba(233,185,73,0.35) inset, 0 6px 18px rgba(0,0,0,0.18); }
body.theme-cardroom .spin-card.ready .spin-ic { animation: none; }
body.theme-cardroom .pass-card { color: #F2F7F4; }
body.theme-cardroom .pass-card .pass-lvl { background: var(--card); color: var(--ink); }
body.theme-cardroom .pass-card .pass-lvl div { color: #5B6359; }
body.theme-cardroom .pass-card [style*="#D6C7FF"], body.theme-cardroom .pass-card [style*="#C9B8F5"] { color: var(--muted) !important; }
body.theme-cardroom .pass-card .bar > div { background: var(--gold) !important; }
body.theme-cardroom .mode-tile:focus-visible { outline: 2px solid var(--gold); }
body.theme-cardroom .bottom-nav { background: #0A2E22; border-top: 1px solid var(--felt-line); }
body.theme-cardroom .navbtn[aria-current="page"] { color: #FFFFFF !important; }
body.theme-cardroom .navbtn[aria-current="page"]::after { content: ""; width: 5px; height: 5px; border-radius: 50%; background: var(--red); margin-top: 4px; }
body.theme-cardroom .navbtn { color: #6F9584 !important; }
body.theme-cardroom .play-fab-disc { position: relative; width: 52px; height: 52px; background: var(--card); color: var(--ink); border: none; box-shadow: 0 3px 0 var(--card-edge), 0 8px 18px rgba(0,0,0,0.35) !important; animation: none; }
body.theme-cardroom .puck-ring { position: absolute; top: 5px; left: 5px; right: 5px; bottom: 5px; border-radius: 50%; border: 1.5px solid var(--ink); opacity: 0.85; }
body.theme-cardroom .puck-text { font-weight: 800; font-stretch: 125%; font-size: 10.5px; letter-spacing: 0.08em; }
body.theme-cardroom .play-fab:not(.on) .play-fab-disc { filter: none; opacity: 0.85; }
body.theme-cardroom .felt-oval { box-shadow: inset 0 0 0 2px rgba(0,0,0,0.25), inset 0 10px 30px rgba(0,0,0,0.35), 0 14px 34px rgba(0,0,0,0.4); }
body.theme-cardroom .hand-strip { background: rgba(0,0,0,0.2) !important; }
body.theme-cardroom .coach { border-color: rgba(233,185,73,0.35) !important; background: rgba(0,0,0,0.22) !important; }
body.theme-cardroom .coach-badge { color: var(--gold) !important; }
body.theme-cardroom .lb-dock { background: linear-gradient(180deg, rgba(12,53,40,0) 0%, var(--felt-bg) 35%) !important; }
body.theme-cardroom .table-wrap[data-back="blue"] { --back-a: #B02028 !important; --back-b: #7E151C !important; --back-ring: #F6F7F4 !important; }
body.theme-montecarlo { --t-bg: #0C0C0F; --t-panel: #16161C; --t-panel2: #22222A; --t-text: #F1E9D8; --t-text2: #E2D8C3; --t-sub: #CFC3A8; --t-mid: #B3A688; --t-mut: #988B6E; --t-faint: #6F6650; --t-accent: #D4AF5A; --t-good: #9CCB9F; --t-bad: #D9776F; --t-display: 'Limelight', Georgia, serif; --t-body: 'Josefin Sans Variable', 'Josefin Sans', -apple-system, sans-serif; background: var(--t-bg); }
body.theme-montecarlo .app, body.theme-montecarlo .app-table, body.theme-montecarlo .loading { background-color: var(--t-bg); background-image: repeating-conic-gradient(from 0deg at 50% -8%, rgba(212,175,90,0.05) 0deg 2.5deg, transparent 2.5deg 9deg); }
body.theme-montecarlo .app::before, body.theme-montecarlo .table-wrap::before { display: none; }
body.theme-montecarlo .app, body.theme-montecarlo .app-table, body.theme-montecarlo .table-wrap, body.theme-montecarlo .sheet, body.theme-montecarlo .loading, body.theme-montecarlo button, body.theme-montecarlo input, body.theme-montecarlo textarea { font-family: var(--t-body); }
body.theme-montecarlo .wordmark, body.theme-montecarlo .wordmark-sm, body.theme-montecarlo .loading-word { font-family: var(--t-display) !important; font-weight: 400 !important; color: var(--t-accent); letter-spacing: 0.08em; }
body.theme-montecarlo .sheet-title, body.theme-montecarlo .results-head, body.theme-montecarlo .mode-title, body.theme-montecarlo .bigwin-label, body.theme-montecarlo .bigwin-amt, body.theme-montecarlo .pass-lvl, body.theme-montecarlo .row-title { font-family: var(--t-display) !important; font-weight: 400 !important; letter-spacing: 0.05em; }
body.theme-montecarlo .panel, body.theme-montecarlo .stat, body.theme-montecarlo .avatar-tile, body.theme-montecarlo .cos-tile, body.theme-montecarlo .ladder-tier, body.theme-montecarlo .hero-seat, body.theme-montecarlo .var-tile, body.theme-montecarlo .row, body.theme-montecarlo .chal, body.theme-montecarlo .title-row, body.theme-montecarlo .ach-row, body.theme-montecarlo .lb-row, body.theme-montecarlo .turbo-row, body.theme-montecarlo .best-row, body.theme-montecarlo .streak-banner, body.theme-montecarlo .spin-card, body.theme-montecarlo .pass-card { background: var(--t-panel) !important; color: var(--t-text); border: 1px solid rgba(212,175,90,0.42) !important; border-radius: 4px !important;
  box-shadow: inset 0 0 0 3px var(--t-panel), inset 0 0 0 4px rgba(212,175,90,0.18) !important; animation: none; }
body.theme-montecarlo .sheet { background: var(--t-panel) !important; border: 1px solid rgba(212,175,90,0.5) !important; border-radius: 6px; box-shadow: inset 0 0 0 4px var(--t-panel), inset 0 0 0 5px rgba(212,175,90,0.2), 0 30px 80px rgba(0,0,0,0.6); }
body.theme-montecarlo .scrim { background: rgba(5,5,7,0.8); }
body.theme-montecarlo .mode-ic, body.theme-montecarlo .streak-flame, body.theme-montecarlo .spin-ic, body.theme-montecarlo .sec-ic, body.theme-montecarlo .turbo-ic, body.theme-montecarlo .vip-ic { background: transparent !important; border: 1px solid rgba(212,175,90,0.55) !important; color: var(--t-accent) !important; border-radius: 2px !important; animation: none !important; }
body.theme-montecarlo .streak-banner > div:nth-child(2) > div:last-child, body.theme-montecarlo .spin-card > div:nth-child(2) > div:last-child, body.theme-montecarlo .pass-card [style*="#D6C7FF"], body.theme-montecarlo .pass-card [style*="#C9B8F5"] { color: var(--t-mid) !important; }
body.theme-montecarlo .pass-card .pass-lvl { background: transparent; border: 1px solid rgba(212,175,90,0.5); border-radius: 2px; color: var(--t-accent); }
body.theme-montecarlo .pass-card .bar > div, body.theme-montecarlo .bar > div { background: linear-gradient(90deg, #B88E35, #E6C877) !important; }
body.theme-montecarlo .bar { background: rgba(212,175,90,0.14); height: 4px; border-radius: 0; }
body.theme-montecarlo .bar > div { border-radius: 0; }
body.theme-montecarlo .btn { border: 1px solid rgba(212,175,90,0.5); background: transparent; color: var(--t-text); border-radius: 2px; letter-spacing: 0.06em; font-weight: 600; box-shadow: none; }
body.theme-montecarlo .btn:hover:not(:disabled) { border-color: var(--t-accent); }
body.theme-montecarlo .btn-raise, body.theme-montecarlo .btn-raise:hover:not(:disabled), body.theme-montecarlo .btn-go, body.theme-montecarlo .btn-go:hover:not(:disabled) { background: linear-gradient(180deg, #EBCF84, #B88E35); color: #141416; border-color: #EBCF84; box-shadow: inset 0 0 0 2px rgba(20,20,22,0.22); }
body.theme-montecarlo .btn-fold, body.theme-montecarlo .btn-fold:hover:not(:disabled) { background: transparent; color: var(--t-bad); border-color: rgba(217,119,111,0.5); }
body.theme-montecarlo .shine::after { display: none !important; }
body.theme-montecarlo .iconbtn { background: transparent; border: 1px solid rgba(212,175,90,0.45); color: var(--t-accent); border-radius: 3px; }
body.theme-montecarlo .preset-btn { background: var(--t-panel2); }
body.theme-montecarlo .seg { background: transparent; border: 1px solid rgba(212,175,90,0.4); border-radius: 3px; }
body.theme-montecarlo .segbtn { color: var(--t-mid); border-radius: 2px; letter-spacing: 0.04em; }
body.theme-montecarlo .segbtn.on { background: linear-gradient(180deg, #EBCF84, #B88E35); color: #141416; }
body.theme-montecarlo .chip-pill { background: transparent; border: 1px solid rgba(212,175,90,0.4); border-radius: 3px; color: var(--t-text); }
body.theme-montecarlo .chip-dot { background: var(--t-accent); box-shadow: inset 0 0 0 2.5px var(--t-bg), inset 0 0 0 4px var(--t-accent); }
body.theme-montecarlo .input { background: transparent; border: 1px solid rgba(212,175,90,0.4); color: var(--t-text); border-radius: 3px; }
body.theme-montecarlo .toast { background: var(--t-panel); border: 1px solid var(--t-accent); border-radius: 4px; }
body.theme-montecarlo .badge-dot { background: var(--t-accent); color: #141416; }
body.theme-montecarlo .bottom-nav { background: #0C0C0F; border-top: 1px solid rgba(212,175,90,0.3); }
body.theme-montecarlo .navbtn { color: var(--t-faint) !important; }
body.theme-montecarlo .navbtn[aria-current="page"] { color: var(--t-accent) !important; }
body.theme-montecarlo .play-fab-disc { width: 42px; height: 42px; border-radius: 3px; transform: rotate(45deg); background: linear-gradient(135deg, #EBCF84, #B88E35); color: #141416; box-shadow: 0 0 0 4px #0C0C0F, 0 0 0 5px rgba(212,175,90,0.5) !important; animation: none; }
body.theme-montecarlo .play-fab-disc > span { transform: rotate(-45deg); }
body.theme-montecarlo .play-fab:not(.on) .play-fab-disc { filter: none; opacity: 0.85; }
body.theme-montecarlo .play-fab:active .play-fab-disc { transform: rotate(45deg) scale(0.93); }
body.theme-montecarlo .table-wrap[data-felt="green"] { --felt1: #176048 !important; --felt2: #0F4836 !important; --felt3: #082B20 !important; --rail: #B88E35 !important; }
body.theme-montecarlo .table-wrap[data-back="blue"] { --back-a: #16161C !important; --back-b: #0C0C0F !important; --back-ring: #D4AF5A !important; }
body.theme-montecarlo .felt-oval { box-shadow: inset 0 0 0 2px rgba(0,0,0,0.3), inset 0 10px 30px rgba(0,0,0,0.45), 0 0 0 1px rgba(212,175,90,0.6), 0 14px 34px rgba(0,0,0,0.5); }
body.theme-montecarlo .felt-logo { font-family: var(--t-display) !important; color: rgba(212,175,90,0.12); letter-spacing: 0.1em; }
body.theme-montecarlo .pot-num { background: rgba(0,0,0,0.45); border: 1px solid rgba(212,175,90,0.45); border-radius: 3px; }
body.theme-montecarlo .hand-strip { background: var(--t-panel) !important; }
body.theme-montecarlo .chip-badge { background: #0C0C0F; border-color: rgba(212,175,90,0.6); color: var(--t-accent); }
body.theme-montecarlo .coach { background: var(--t-panel) !important; border: 1px solid rgba(212,175,90,0.45) !important; border-radius: 4px; }
body.theme-montecarlo .coach-badge { color: var(--t-accent) !important; }
body.theme-montecarlo .lb-dock { background: linear-gradient(180deg, rgba(12,12,15,0) 0%, var(--t-bg) 35%) !important; }
body.theme-montecarlo .streak-day { background: transparent !important; border: 1px solid rgba(212,175,90,0.25) !important; border-radius: 3px !important; color: var(--t-mid) !important; box-shadow: none !important; animation: none !important; }
body.theme-montecarlo .streak-day.got { color: var(--t-good) !important; }
body.theme-montecarlo .streak-day.today { border-color: var(--t-accent) !important; color: var(--t-text) !important; }
body.theme-montecarlo .play-fab-disc { width: 36px; height: 36px; margin-top: 4px; margin-bottom: 6px; }
body.theme-montecarlo .play-fab span:last-child { margin-top: 2px !important; }
/* ---- hold to peek ---- */
.peek { display: flex; gap: 6px; position: relative; touch-action: none; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; cursor: pointer; }
.peek .card.peek-open { transform: translateY(-6px) rotate(-1deg); transition: transform .12s ease; }
.peek .card.peek-open + .card.peek-open { transform: translateY(-6px) rotate(1.5deg); }
.peek-badge { position: absolute; top: -6px; left: -8px; z-index: 3; width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: var(--t-accent); color: #0B1426; box-shadow: 0 0 0 3px rgba(245,184,61,0.25), 0 2px 6px rgba(0,0,0,0.4); animation: peekPop .22s cubic-bezier(.3,1.5,.5,1) both, peekGlow 1.2s ease-in-out .22s infinite; }
.peek-badge.hero { top: -4px; left: -4px; }
@keyframes peekPop { from { opacity: 0; transform: scale(.4); } to { opacity: 1; transform: scale(1); } }
@keyframes peekGlow { 0%, 100% { box-shadow: 0 0 0 3px rgba(245,184,61,0.25), 0 2px 6px rgba(0,0,0,0.4); } 50% { box-shadow: 0 0 0 6px rgba(245,184,61,0.12), 0 2px 6px rgba(0,0,0,0.4); } }
.backs .card.mini { transition: transform .2s ease; }
.backs.peeking .card.mini { transform: rotate(var(--r, 0deg)) translateY(-5px) scaleY(0.8); }
/* ---------- mode tiles are playing cards in every theme; each theme just picks the card stock ---------- */
.mode-grid { --pc-face: #F7F8FB; --pc-edge: #D3DAE6; --pc-ink: #0B1426; --pc-red: #E0475B; --pc-sub: #5E6B82; --pc-shadow: rgba(0,0,0,0.35); --pc-font: var(--t-display); --pc-weight: 700; --pc-size: 17px; --pc-line: transparent; gap: 10px !important; padding: 4px 2px 6px; }
.mode-tile { position: relative; background: var(--pc-face) !important; color: var(--pc-ink) !important; border: none !important; border-radius: 14px !important; min-height: 150px; padding: 12px 10px !important; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center !important; cursor: pointer; box-shadow: 0 1px 0 rgba(255,255,255,0.7) inset, inset 0 0 0 4px var(--pc-face), inset 0 0 0 5px var(--pc-line), 0 3px 0 var(--pc-edge), 0 12px 22px var(--pc-shadow) !important; transition: transform .18s cubic-bezier(.3,1.4,.5,1); overflow: visible !important; }
.mode-tile::after { display: none !important; }
.mode-tile:nth-child(1) { transform: rotate(-3deg) translateY(4px); }
.mode-tile:nth-child(3) { transform: rotate(3deg) translateY(4px); }
.mode-tile:active { transform: translateY(-6px) rotate(0deg) scale(1.02); }
.mode-tile:focus-visible { outline: 2px solid var(--t-accent); }
.mode-tile .mode-ic { display: none !important; }
.mode-tile .mode-title { font-family: var(--pc-font) !important; font-weight: var(--pc-weight) !important; font-size: var(--pc-size) !important; color: var(--pc-ink) !important; margin-top: 6px; line-height: 1.05; }
.mode-tile .mode-sub { font-size: 11px !important; color: var(--pc-sub) !important; opacity: 1 !important; font-weight: 600; margin-top: 3px; }
.pc-index { position: absolute; top: 8px; left: 9px; display: flex; flex-direction: column; align-items: center; line-height: 0.95; }
.pc-index b { font-family: var(--pc-font); font-weight: 800; font-size: 17px; }
.pc-index i { font-style: normal; font-size: 14px; }
.pc-index.flip { top: auto; left: auto; bottom: 8px; right: 9px; transform: rotate(180deg); }
.pc-pip { display: block; font-size: 34px; line-height: 1; }
.mode-tile.suit-h .pc-index, .mode-tile.suit-h .pc-pip, .mode-tile.suit-d .pc-index, .mode-tile.suit-d .pc-pip { color: var(--pc-red); }
.mode-tile.suit-s .pc-index, .mode-tile.suit-s .pc-pip, .mode-tile.suit-c .pc-index, .mode-tile.suit-c .pc-pip { color: var(--pc-ink); }
body.theme-cardroom .mode-grid { --pc-face: #F6F7F4; --pc-edge: #DADDD6; --pc-ink: #121417; --pc-red: #D8343B; --pc-sub: #5B6359; --pc-font: 'Archivo Variable', 'Archivo', sans-serif; --pc-weight: 800; --pc-size: 15px; }
body.theme-cardroom .pc-index b { font-stretch: 100%; }
body.theme-afterhours .mode-grid { --pc-face: #EDE6D8; --pc-edge: #C9BEA9; --pc-ink: #1C1814; --pc-red: #A8463C; --pc-sub: #6E665B; --pc-font: 'Instrument Serif', Georgia, serif; --pc-weight: 400; --pc-size: 20px; --pc-line: rgba(28,24,20,0.12); }
body.theme-afterhours .pc-index b { font-weight: 400; font-size: 20px; }
body.theme-montecarlo .mode-grid { --pc-face: #15151B; --pc-edge: #060608; --pc-ink: #D4AF5A; --pc-red: #C9584E; --pc-sub: #9A927E; --pc-font: var(--t-display); --pc-weight: 400; --pc-size: 15px; --pc-line: rgba(212,175,90,0.45); --pc-shadow: rgba(0,0,0,0.55); }
body.theme-montecarlo .mode-tile { box-shadow: inset 0 0 0 1px rgba(212,175,90,0.6), inset 0 0 0 4px var(--pc-face), inset 0 0 0 5px var(--pc-line), 0 3px 0 var(--pc-edge), 0 12px 22px var(--pc-shadow) !important; }
body.theme-montecarlo .mode-tile .mode-title { letter-spacing: 0.04em; }
body.theme-montecarlo .pc-index b { font-weight: 400; }
body.theme-montecarlo .pc-index { top: 11px; left: 11px; } body.theme-montecarlo .pc-index.flip { top: auto; left: auto; bottom: 11px; right: 11px; }
.mode-tile .mode-sub { padding: 0 3px; }
/* practice: the coach and your odds share one fixed-height panel */
.coach-panel { position: relative; overflow: hidden; width: 100%; max-width: 460px; flex-shrink: 0; margin-bottom: 8px; border-radius: 14px; padding: 8px 12px 9px; height: 70px; border: 1px solid rgba(111,168,255,0.3); background: linear-gradient(135deg, rgba(47,111,222,0.13), rgba(139,92,246,0.09)); transition: border-color .25s ease, background .25s ease; }
.coach-panel > * { position: relative; }
.coach-panel .cp-meter { position: absolute; top: 0; left: 0; bottom: 0; transition: width .45s ease, background .3s ease; }
.cp-top { display: flex; align-items: center; gap: 8px; min-height: 20px; margin-bottom: 3px; }
.cp-hand { margin-left: auto; display: inline-flex; align-items: baseline; gap: 7px; min-width: 0; }
.cp-name { font-size: 12px; font-weight: 600; color: var(--t-text2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cp-hand b { font-size: 14px; font-weight: 800; }
.coach-panel .coach-why { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.coach-panel.act-raise .coach-act, .coach-panel.act-bet .coach-act { color: var(--t-accent); }
.coach-panel.act-call .coach-act, .coach-panel.act-check .coach-act { color: var(--t-good); }
.coach-panel.act-fold .coach-act { color: #FF8A8A; }
.coach-panel.note.good { border-color: rgba(52,211,153,0.4); background: rgba(52,211,153,0.08); }
.coach-panel.note.bad { border-color: rgba(255,138,76,0.45); background: rgba(255,138,76,0.08); }
.coach-panel.note.bad .coach-badge { color: #FFB37A; }
.coach-panel.note.good .coach-badge { color: #6EE7B7; }
.coach-panel.idle .coach-why { color: var(--t-mid); }

/* shorter phones and Safari with its bars showing: tighten everything so the felt never runs into the seats */
@media (max-height: 760px) {
  .table-wrap { padding-top: 8px; padding-bottom: 8px; }
  .table-wrap .status { margin: 4px 0 0; min-height: 16px; }
  .table-wrap .felt-oval { padding-top: 18px !important; padding-bottom: 14px !important; gap: 7px; }
  .table-wrap .felt-logo { font-size: 50px; }
  .table-wrap .felt-center { gap: 6px; }
  .table-wrap .hero-seat { padding: 8px 12px; border-radius: 16px; }
  .table-wrap .card.big:not(.o4) { width: clamp(46px,13vw,56px); height: clamp(64px,18.5vw,78px); font-size: clamp(17px,5vw,21px); }
  .table-wrap .controls { padding-top: 8px; }
  .table-wrap .controls .btn { padding-top: 11px; padding-bottom: 11px; }
  .table-wrap .pre-btn { padding-top: 10px; padding-bottom: 10px; }
}
/* drawn card backs and felt textures (patterns come from the item, colors from its vars) */
.card.back, .sq-cover { background-image: var(--back-img, repeating-linear-gradient(45deg, rgba(255,255,255,0.14) 0 3px, transparent 3px 7px)); background-size: var(--back-size, auto); background-position: center; }
.backs .card.mini.back { background-size: var(--back-size, auto); }
.felt-oval { background-image: var(--felt-tex, linear-gradient(transparent, transparent)), repeating-radial-gradient(circle at 30% 40%, rgba(255,255,255,0.022) 0 1px, transparent 1px 3px), radial-gradient(ellipse at 50% 40%, var(--felt1, #22A866) 0%, var(--felt2, #138048) 52%, var(--felt3, #0B5C33) 100%); background-size: var(--felt-tex-size, 100% 100%), auto, 100% 100%; }
.felt-oval::before { content: ""; position: absolute; top: 9px; right: 9px; bottom: 9px; left: 9px; border-radius: 999px; border: 1.5px solid var(--felt-line, transparent); pointer-events: none; }
.felt-sw { position: relative; }
.felt-sw-line { position: absolute; top: 3px; right: 3px; bottom: 3px; left: 3px; border-radius: 999px; border: 1px solid; }
/* profile photo */
.profile-av { position: relative; overflow: visible; }
.av-photo { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; display: block; }
.av-edit { position: absolute; right: -2px; bottom: -2px; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: var(--t-text); color: var(--t-bg); box-shadow: 0 0 0 3px var(--t-bg); }
.photo-row { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.photo-up { position: relative; display: inline-flex; align-items: center; justify-content: center; gap: 8px; overflow: hidden; }
.photo-up input { position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; font-size: 0; }
.photo-tile { width: 48px; height: 48px; padding: 0 !important; flex-shrink: 0; overflow: hidden; border-radius: 50% !important; }
.photo-tile img { width: 100%; height: 100%; object-fit: cover; display: block; }
.photo-tile.on { box-shadow: 0 0 0 2px var(--t-good) !important; }
/* accounts and friends */
.auth-form { display: flex; flex-direction: column; gap: 12px; }
.auth-field { display: flex; flex-direction: column; gap: 5px; }
.auth-field > span { font-size: 12px; font-weight: 600; color: var(--t-sub); }
.auth-field small { font-size: 11px; color: var(--t-faint); }
.auth-field .input, .auth-at .input { width: 100%; box-sizing: border-box; }
.auth-at { position: relative; display: flex; align-items: center; }
.auth-at b { position: absolute; left: 12px; color: var(--t-mut); font-weight: 600; pointer-events: none; font-size: 14px; }
.auth-at .input { padding-left: 28px !important; }
.auth-err { font-size: 12.5px; color: var(--t-bad); background: rgba(255,107,107,0.08); border: 1px solid rgba(255,107,107,0.3); border-radius: 10px; padding: 8px 10px; }
.auth-switch { text-align: center; font-size: 12.5px; color: var(--t-mut); }
.auth-switch button { background: none; border: none; color: var(--t-accent); font-weight: 700; cursor: pointer; font-size: 12.5px; padding: 0 2px; }
.auth-note { text-align: center; font-size: 11.5px; color: var(--t-faint); margin-top: -4px; }
.acct-cta { padding: 16px !important; margin-bottom: 8px; }
.friend-row { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 14px; background: var(--t-panel); border: 1px solid rgba(244,247,252,0.06); }
.friend-row.tap { cursor: pointer; transition: transform .12s ease, border-color .15s ease; }
.friend-row.tap:active { transform: scale(0.985); }
.friend-sub { font-size: 11px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--t-mut); margin: 4px 2px 6px; }
.friend-msg { font-size: 12px; color: var(--t-bad); margin: 0 2px 10px; }
.friend-msg.ok { color: var(--t-good); }
.fp-head { display: flex; flex-direction: column; align-items: center; text-align: center; margin-top: -6px; }
.fp-name { font-family: var(--t-display); font-size: 22px; font-weight: 700; margin-top: 10px; display: flex; align-items: center; gap: 6px; }
.fp-user { font-size: 12px; color: var(--t-mut); margin-top: 2px; }
.fp-rank { display: flex; align-items: center; gap: 12px; margin-top: 16px; padding: 12px 14px; border-radius: 14px; background: rgba(244,247,252,0.04); border: 1px solid rgba(244,247,252,0.07); }
.fp-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-top: 8px; }
.fp-stats > div { display: flex; flex-direction: column; align-items: center; gap: 1px; padding: 10px 4px; border-radius: 12px; background: rgba(244,247,252,0.04); border: 1px solid rgba(244,247,252,0.06); }
.fp-stats b { font-size: 15px; font-weight: 750; }
.fp-stats span { font-size: 10.5px; color: var(--t-mut); }
.live-dot { position: absolute; right: -1px; bottom: -1px; border-radius: 50%; background: #34D399; box-shadow: 0 0 0 2px var(--t-panel), 0 0 8px rgba(52,211,153,0.6); }
.fp-status { font-size: 12px; color: var(--t-mut); margin-top: 3px; }
.fp-status.on { color: var(--t-good); font-weight: 600; }
.lb-row.tap { cursor: pointer; }
.lb-row.tap:active { transform: scale(0.985); }
/* online tables */
.ft-card { width: 100%; display: flex; align-items: center; gap: 12px; padding: 14px; border-radius: 18px; cursor: pointer; text-align: left; color: var(--t-text); background: linear-gradient(135deg, rgba(52,211,153,0.16), rgba(47,111,222,0.12)); border: 1px solid rgba(52,211,153,0.35); transition: transform .14s ease; }
.ft-card:active { transform: scale(0.98); }
.ft-ic { width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: #6EE7B7; background: rgba(52,211,153,0.16); flex-shrink: 0; }
.stake-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
.stake-btn { padding: 9px 4px; border-radius: 10px; border: 1px solid rgba(244,247,252,0.12); background: rgba(244,247,252,0.04); color: var(--t-sub); font-weight: 650; font-size: 12.5px; cursor: pointer; }
.stake-btn.on { border-color: var(--t-accent); color: var(--t-accent); background: rgba(245,184,61,0.1); }
.code-input { width: 100%; box-sizing: border-box; text-align: center; font-size: 30px !important; font-weight: 800; letter-spacing: 0.4em; padding: 14px 0 14px 0.4em !important; }
.code-card { text-align: center; padding: 14px; border-radius: 14px; background: rgba(244,247,252,0.04); border: 1px dashed rgba(244,247,252,0.18); margin-bottom: 10px; }
.code-big { font-size: 34px; font-weight: 800; letter-spacing: 0.3em; padding-left: 0.3em; margin-top: 2px; }
.ot-sit { border-radius: 50%; border: 1.5px dashed rgba(52,211,153,0.6); background: rgba(52,211,153,0.08); color: #6EE7B7; font-size: 20px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 0; }
.ot-open { border-radius: 50%; border: 1.5px dashed rgba(244,247,252,0.15); }
.ot-av { overflow: hidden; background: var(--t-panel2) !important; }
.ot-last { font-size: 10px; font-weight: 700; color: var(--t-sub); background: rgba(244,247,252,0.06); border-radius: 8px; padding: 2px 7px; white-space: nowrap; }
.ot-watch { flex-direction: column; align-items: flex-start !important; gap: 3px !important; border-color: rgba(244,247,252,0.08) !important; }
.emote-bubble { position: absolute; bottom: calc(100% + 4px); left: 50%; transform: translateX(-50%); z-index: 5; background: var(--t-text); color: var(--t-bg); font-size: 13px; font-weight: 700; padding: 4px 9px; border-radius: 12px; white-space: nowrap; box-shadow: 0 6px 16px rgba(0,0,0,0.35); animation: emotePop 3.4s ease forwards; pointer-events: none; }
.emote-bubble::after { content: ""; position: absolute; top: 100%; left: 50%; margin-left: -5px; border: 5px solid transparent; border-top-color: var(--t-text); }
@keyframes emotePop { 0% { opacity: 0; transform: translate(-50%, 6px) scale(0.8); } 8% { opacity: 1; transform: translate(-50%, 0) scale(1.06); } 14% { transform: translate(-50%, 0) scale(1); } 85% { opacity: 1; } 100% { opacity: 0; transform: translate(-50%, -6px); } }
.emote-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.emote-btn { padding: 14px 6px; border-radius: 14px; border: 1px solid rgba(244,247,252,0.1); background: rgba(244,247,252,0.04); color: var(--t-text); font-size: 22px; cursor: pointer; font-weight: 700; }
.emote-btn:nth-child(n+7) { font-size: 13.5px; }
.invite-banner { position: fixed; left: 12px; right: 12px; top: calc(env(safe-area-inset-top) + 10px); z-index: 40; display: flex; align-items: center; gap: 8px; padding: 12px 12px 12px 14px; border-radius: 16px; background: var(--t-panel); border: 1px solid rgba(52,211,153,0.45); box-shadow: 0 14px 34px rgba(0,0,0,0.45); animation: sheetIn .25s ease; max-width: 460px; margin: 0 auto; }
/* prestige: shimmering names, seat crowns, the perk track, season end */
.pname { background: linear-gradient(90deg, #F6E3B0 0%, #E9B949 25%, #FFF6D8 50%, #E9B949 75%, #F6E3B0 100%); background-size: 200% auto; -webkit-background-clip: text; background-clip: text; color: transparent !important; -webkit-text-fill-color: transparent; animation: pshine 3.6s linear infinite; }
@keyframes pshine { to { background-position: -200% center; } }
.crown-mark { position: absolute; left: 50%; transform: translateX(-50%); z-index: 4; display: flex; align-items: center; justify-content: center; color: #F2C14E; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.6)) drop-shadow(0 0 6px rgba(242,193,78,0.45)); pointer-events: none; }
.profile-av .crown-mark { z-index: 2; }
.perk-list { display: flex; flex-direction: column; gap: 6px; margin-top: 10px; }
.perk { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 10px; background: rgba(244,247,252,0.04); font-size: 12.5px; color: var(--t-sub); }
.perk.got { color: var(--t-text); background: rgba(227,107,255,0.1); }
.season-end { display: flex; flex-direction: column; align-items: center; text-align: center; margin-top: -10px; }
.se-kicker { font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--t-mut); margin-top: 14px; }
.se-title { font-family: var(--t-display); font-size: 28px; font-weight: 700; margin-top: 4px; }
.se-body { font-size: 13px; line-height: 1.5; color: var(--t-mid); margin-top: 8px; }
/* ---------- season pass: a swipeable track ---------- */
.pass-card { cursor: default !important; }
.pass-card:active { transform: none !important; }
.pass-head { width: 100%; display: flex; align-items: center; gap: 12px; background: none; border: none; padding: 0; color: inherit; cursor: pointer; text-align: left; }
.pass-strip { display: flex; gap: 8px; overflow-x: auto; margin: 12px -16px -2px; padding: 4px 16px 6px; scroll-snap-type: x mandatory; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
.pass-strip::-webkit-scrollbar { display: none; }
.pass-mini { flex: 0 0 auto; width: 62px; height: 74px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.16); background: rgba(10,6,30,0.32); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; cursor: pointer; scroll-snap-align: start; color: #fff; padding: 0; position: relative; overflow: hidden; }
.pass-mini .pm-art { height: 46px; display: flex; align-items: center; justify-content: center; }
.pass-mini .pm-l { font-size: 10px; font-weight: 800; opacity: 0.75; }
.pass-mini.next { border-color: rgba(255,214,102,0.9); box-shadow: 0 0 0 2px rgba(255,214,102,0.25); }
.pass-mini.r-rare { border-color: rgba(78,168,255,0.5); } .pass-mini.r-epic { border-color: rgba(176,114,255,0.6); background: rgba(60,20,110,0.4); } .pass-mini.r-legendary { border-color: rgba(245,184,61,0.7); background: rgba(90,55,10,0.35); }
.pass-mini.next.r-rare, .pass-mini.next.r-epic, .pass-mini.next.r-legendary { border-color: rgba(255,214,102,0.95); }
.pass-sheet { padding: 16px !important; background: linear-gradient(180deg, #241048 0%, #120A2A 45%, var(--t-panel) 100%) !important; border-color: rgba(196,160,255,0.3) !important; overflow-x: hidden; }
.ps-head { display: flex; align-items: center; gap: 12px; color: #fff; margin-bottom: 12px; }
.ps-preview { display: flex; align-items: center; gap: 14px; padding: 14px; border-radius: 18px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); min-height: 132px; position: relative; overflow: hidden; }
.ps-preview::before { content: ""; position: absolute; left: -30px; top: -30px; width: 170px; height: 170px; border-radius: 50%; background: radial-gradient(circle, var(--rc, rgba(154,164,178,0.25)), transparent 70%); pointer-events: none; }
.ps-preview.r-rare { --rc: rgba(78,168,255,0.35); border-color: rgba(78,168,255,0.35); } .ps-preview.r-epic { --rc: rgba(176,114,255,0.45); border-color: rgba(176,114,255,0.45); } .ps-preview.r-legendary { --rc: rgba(245,184,61,0.45); border-color: rgba(245,184,61,0.55); }
.ps-art { width: 110px; height: 110px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; position: relative; }
.ps-meta { flex: 1; min-width: 0; display: flex; flex-direction: column; align-items: flex-start; gap: 4px; position: relative; }
.ps-rarity { font-size: 10.5px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; }
.ps-name { font-family: var(--t-display); font-size: 21px; font-weight: 700; color: #fff; line-height: 1.1; }
.ps-sub { font-size: 12px; color: var(--t-mid); margin-bottom: 4px; }
.ps-got { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 700; color: var(--t-good); }
.ps-lock { display: inline-flex; align-items: center; gap: 5px; font-size: 11.5px; font-weight: 600; color: var(--t-mut); }
.ps-track { position: relative; display: flex; gap: 8px; overflow-x: auto; margin: 14px -16px 0; padding: 26px 16px 8px; scroll-snap-type: x proximity; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
.ps-track::-webkit-scrollbar { display: none; }
.ps-line { position: absolute; left: 46px; top: 36px; height: 3px; width: calc(30 * 88px - 88px); background: rgba(255,255,255,0.12); border-radius: 3px; }
.ps-line > div { height: 100%; border-radius: 3px; background: linear-gradient(90deg, #F5B83D, #FF7AB8); }
.ps-tile { flex: 0 0 80px; height: 118px; position: relative; border-radius: 14px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.04); color: #fff; cursor: pointer; padding: 22px 4px 6px; display: flex; flex-direction: column; align-items: center; justify-content: space-between; scroll-snap-align: center; transition: transform .15s ease, border-color .15s ease; }
.ps-tile:active { transform: scale(0.96); }
.ps-tile.r-rare { background: rgba(78,168,255,0.08); border-color: rgba(78,168,255,0.3); } .ps-tile.r-epic { background: rgba(176,114,255,0.12); border-color: rgba(176,114,255,0.4); } .ps-tile.r-legendary { background: linear-gradient(180deg, rgba(245,184,61,0.18), rgba(245,184,61,0.05)); border-color: rgba(245,184,61,0.55); }
.ps-tile.got { opacity: 0.6; }
.ps-tile.sel { opacity: 1; border-color: #fff; box-shadow: 0 0 0 2px rgba(255,255,255,0.35), 0 8px 20px rgba(0,0,0,0.35); }
.ps-tile.next .ps-node { background: #F5B83D; color: #241048; border-color: #FFE08A; }
.ps-node { position: absolute; top: -12px; left: 50%; transform: translateX(-50%); width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10.5px; font-weight: 800; background: #2A1A52; border: 2px solid rgba(255,255,255,0.25); color: #fff; }
.ps-tile.got .ps-node { background: #34D399; border-color: #8CF0C6; color: #062A1D; }
.ps-tile-art { flex: 1; display: flex; align-items: center; justify-content: center; }
.ps-tile-name { font-size: 10px; font-weight: 700; color: rgba(255,255,255,0.75); white-space: nowrap; }
.pr-ic { display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.pa-av { border-radius: 50%; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.1); box-shadow: inset 0 0 0 2px rgba(255,255,255,0.15); }
.pa-emote { background: #F4F7FC; color: #0B1426; font-weight: 800; padding: 0.25em 0.5em; border-radius: 0.7em; position: relative; white-space: nowrap; line-height: 1.1; }
.pa-emote::after { content: ""; position: absolute; top: 100%; left: 50%; margin-left: -0.25em; border: 0.25em solid transparent; border-top-color: #F4F7FC; }
.pa-title { max-width: 72px; text-align: center; overflow: hidden; }
.ps-art .pa-title { max-width: 110px; }
.pa-chips { border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px; background: radial-gradient(circle at 50% 35%, rgba(245,184,61,0.35), rgba(245,184,61,0.08)); color: #F5C451; box-shadow: inset 0 0 0 1.5px rgba(245,184,61,0.45); }
.chipset-sw { height: 48px; display: flex; align-items: flex-end; justify-content: center; padding-bottom: 6px; }
.fx-sw { width: 48px; height: 48px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: radial-gradient(circle, rgba(255,255,255,0.12), rgba(255,255,255,0.02)); position: relative; }
.fx-sw-coin { width: 24px; height: 24px; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #FFF4C2, #F2C14E 45%, #B07A1A); box-shadow: inset 0 0 0 2px rgba(255,240,200,0.6), 0 2px 6px rgba(0,0,0,0.4); animation: coinSpin 1.6s linear infinite; }
.fx-sw-burst { position: relative; width: 4px; height: 4px; }
.fx-sw-burst i { position: absolute; left: 0; top: 0; width: 4px; height: 9px; border-radius: 2px; background: #FF7AB8; transform-origin: 2px 2px; box-shadow: 0 0 6px #FF7AB8; }
.fx-sw-burst i:nth-child(odd) { background: #F5B83D; box-shadow: 0 0 6px #F5B83D; }
.fx-sw-conf { position: relative; width: 4px; height: 4px; }
.fx-sw-conf i { position: absolute; width: 6px; height: 10px; border-radius: 1.5px; }
@keyframes coinSpin { 0% { transform: rotateY(0deg); } 100% { transform: rotateY(360deg); } }
/* win effects at the table */
.fx-layer { position: absolute; top: 0; right: 0; bottom: 0; left: 0; pointer-events: none; overflow: hidden; z-index: 20; }
.fx-coin { position: absolute; top: -30px; }
.fx-coin i { display: block; width: 100%; height: 100%; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #FFF4C2, #F2C14E 45%, #B07A1A); box-shadow: inset 0 0 0 2px rgba(255,240,200,0.6), 0 3px 8px rgba(0,0,0,0.35); animation: coinSpin var(--spin) linear infinite; }
@keyframes coinFall { 0% { transform: translateY(0); opacity: 1; } 85% { opacity: 1; } 100% { transform: translateY(105vh); opacity: 0; } }
.fx-burst { position: absolute; width: 0; height: 0; }
.fx-burst i { position: absolute; left: -3px; top: -3px; width: 6px; height: 6px; border-radius: 50%; }
@keyframes burstOut { 0% { transform: translate(0, 0) scale(0.4); opacity: 0; } 12% { opacity: 1; } 70% { opacity: 1; } 100% { transform: translate(var(--dx), calc(var(--dy) + 30px)) scale(0.6); opacity: 0; } }
/* animated holo back and aurora felt */
@keyframes holoShift { 0% { background-position: center, 0 0, 0% 50%; } 100% { background-position: center, 0 0, 100% 50%; } }
.holo-anim, .table-wrap[data-back="holo"] .card.back, .table-wrap[data-back="holo"] .sq-cover { animation: holoShift 5s linear infinite alternate; }
@keyframes auroraShift { 0% { background-position: 0% 50%, 0 0, 0 0; } 100% { background-position: 100% 50%, 0 0, 0 0; } }
.aurora-anim, .table-wrap[data-felt="aurora"] .felt-oval { animation: auroraShift 12s ease-in-out infinite alternate; }
.scope-toggle { display: flex; gap: 2px; padding: 2px; border-radius: 10px; background: rgba(244,247,252,0.07); flex-shrink: 0; }
.scope-toggle button { display: inline-flex; align-items: center; gap: 4px; border: none; background: transparent; color: var(--t-mut); font-size: 11.5px; font-weight: 700; padding: 6px 9px; border-radius: 8px; cursor: pointer; }
.scope-toggle button.on { background: var(--t-text); color: var(--t-bg); }
/* install + notifications */
.app-card { display: flex; align-items: center; gap: 12px; padding: 12px 10px 12px 12px; border-radius: 16px; background: var(--t-panel); border: 1px solid rgba(244,247,252,0.1); }
.app-card.notify { border-color: rgba(245,184,61,0.35); background: linear-gradient(135deg, rgba(245,184,61,0.1), var(--t-panel)); }
.app-card-ic { width: 42px; height: 42px; border-radius: 11px; flex-shrink: 0; object-fit: cover; box-shadow: 0 4px 12px rgba(0,0,0,0.3); }
.app-card-ic.bell { display: flex; align-items: center; justify-content: center; background: rgba(245,184,61,0.16); color: var(--t-accent); box-shadow: none; }
.share-ic { display: inline-flex; vertical-align: -2px; padding: 1px 3px; border-radius: 4px; background: rgba(111,168,255,0.18); color: #8CB8FF; }
/* ---------- High Roller Room: black lacquer, emerald baize, champagne gold ---------- */
.vip-card { width: 100%; display: flex; flex-direction: column; align-items: stretch; gap: 0; padding: 16px 18px 15px; border-radius: 18px; cursor: pointer; text-align: left; color: #F3EDE0; background-color: #0C0B09; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4'%3E%3Cpath d='M0 4L4 0' stroke='%23FFFFFF' stroke-opacity='0.025'/%3E%3C/svg%3E"), radial-gradient(120% 90% at 85% 0%, rgba(217,180,106,0.16), transparent 55%), linear-gradient(160deg, #1A1713 0%, #0B0A08 60%, #121009 100%); border: 1px solid rgba(217,180,106,0.32); position: relative; overflow: hidden; transition: transform .14s ease, box-shadow .3s ease; box-shadow: inset 0 1px 0 rgba(255,240,210,0.08), 0 10px 26px rgba(0,0,0,0.35); }
.vip-card::before { content: ""; position: absolute; top: 5px; right: 5px; bottom: 5px; left: 5px; border-radius: 14px; border: 1px solid rgba(217,180,106,0.14); pointer-events: none; }
.vip-card:active { transform: scale(0.985); }
.vip-card.open { border-color: rgba(217,180,106,0.6); box-shadow: inset 0 1px 0 rgba(255,240,210,0.1), 0 12px 32px rgba(0,0,0,0.4), 0 0 34px rgba(217,180,106,0.12); }
.vip-card.open::after { content: ""; position: absolute; top: 0; bottom: 0; left: -60%; width: 34%; background: linear-gradient(100deg, transparent, rgba(241,220,166,0.13), transparent); transform: skewX(-20deg); animation: shimmer 7s ease-in-out infinite; pointer-events: none; }
.vc-top { display: flex; justify-content: space-between; align-items: center; width: 100%; gap: 10px; }
.vc-kicker, .vs-kicker, .vi-kicker { font-family: 'Josefin Sans Variable', 'Josefin Sans', var(--t-body); text-transform: uppercase; letter-spacing: 0.24em; font-size: 9.5px; font-weight: 600; color: #A7905F; }
.vc-crest { color: #D9B46A; display: flex; }
.vc-title { font-family: 'Instrument Serif', Georgia, serif; font-style: italic; font-size: 27px; line-height: 1.1; margin: 10px 0 12px; background: linear-gradient(180deg, #F6E6BC 10%, #D9B46A 60%, #B48B45 100%); -webkit-background-clip: text; background-clip: text; color: transparent; letter-spacing: -0.005em; }
.vc-foot { display: flex; justify-content: space-between; align-items: center; width: 100%; gap: 10px; font-size: 11.5px; color: #B9AC92; }
.vc-enter { display: inline-flex; align-items: center; gap: 3px; line-height: 1; color: #E9CF95; font-family: 'Josefin Sans Variable', 'Josefin Sans', var(--t-body); text-transform: uppercase; letter-spacing: 0.18em; font-size: 10px; font-weight: 700; }
.vc-enter-t { display: inline-block; line-height: 1; padding-top: 0.32em; margin-right: -0.18em; } /* Josefin caps ride high, and letter spacing leaves a gap after the last letter */
.vc-bar { width: 100%; height: 3px; border-radius: 3px; background: rgba(217,180,106,0.14); margin-top: 9px; overflow: hidden; }
.vc-bar > div { height: 100%; background: linear-gradient(90deg, #A7823F, #F1DCA6); }

.vip-sheet-scrim { background: rgba(4,3,2,0.82) !important; backdrop-filter: blur(3px); -webkit-backdrop-filter: blur(3px); }
.sheet.vip-sheet { background: radial-gradient(120% 60% at 50% 0%, rgba(217,180,106,0.12), transparent 60%), linear-gradient(180deg, #15120E, #0C0A08) !important; border: 1px solid rgba(217,180,106,0.32) !important; border-radius: 20px !important; color: #F3EDE0; box-shadow: 0 30px 80px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,240,210,0.07) !important; position: relative; }
.vs-head { text-align: center; position: relative; padding-top: 6px; margin-bottom: 14px; }
.vs-close { position: absolute; top: -4px; right: -4px; background: transparent !important; border-color: rgba(217,180,106,0.3) !important; color: #D9B46A !important; }
.vs-crest { color: #D9B46A; display: flex; justify-content: center; margin-bottom: 8px; }
.vs-title { font-family: 'Instrument Serif', Georgia, serif; font-style: italic; font-size: 30px; line-height: 1.1; margin-top: 6px; color: #F1DCA6; }
.vs-body { font-size: 12.5px; line-height: 1.55; color: #B9AC92; margin: 10px 8px 0; }
.vip-sheet .seg { background: rgba(217,180,106,0.07) !important; border: 1px solid rgba(217,180,106,0.16) !important; border-radius: 12px !important; }
.vip-sheet .segbtn { color: #B9AC92 !important; background: transparent !important; border: none !important; border-radius: 9px !important; }
.vip-sheet .segbtn.on { background: linear-gradient(180deg, #F1DCA6, #C9A050) !important; color: #15110A !important; }
.vip-row { display: flex; align-items: center; gap: 14px; width: 100%; text-align: left; cursor: pointer; padding: 15px 16px; border-radius: 14px; color: #D9B46A; background: linear-gradient(135deg, #1B1712, #0F0D0A); border: 1px solid rgba(217,180,106,0.28); transition: border-color .15s ease, transform .12s ease; position: relative; overflow: hidden; }
.vip-row:active:not(:disabled) { transform: scale(0.985); }
.vip-row:hover:not(:disabled) { border-color: rgba(217,180,106,0.55); }
.vip-row:disabled { opacity: 0.45; cursor: not-allowed; }
.vip-row.t-whale { background: linear-gradient(135deg, #17181B, #0A0A0C); border-color: rgba(214,220,230,0.28); color: #D6DCE6; }
.vr-no { width: 34px; height: 34px; border-radius: 50%; border: 1px solid currentColor; display: flex; align-items: center; justify-content: center; font-family: 'Instrument Serif', Georgia, serif; font-size: 15px; flex-shrink: 0; opacity: 0.85; }
.vr-title { font-family: 'Instrument Serif', Georgia, serif; font-style: italic; font-size: 21px; line-height: 1.1; color: #F1DCA6; }
.vip-row.t-whale .vr-title { color: #EEF1F6; }
.vr-sub { font-size: 12px; color: #C8BDA6; margin-top: 3px; }
.vip-row.t-whale .vr-sub { color: #B8BFCB; }
.vr-min { font-family: 'Josefin Sans Variable', 'Josefin Sans', var(--t-body); text-transform: uppercase; letter-spacing: 0.16em; font-size: 9px; font-weight: 600; color: #8C7B57; margin-top: 5px; }
.vip-row.t-whale .vr-min { color: #7E8694; }

.table-wrap.vip { --t-bg: #0A0907; --t-panel: #15120E; --t-panel2: #221D16; --t-text: #F3EDE0; --t-text2: #E2D9C6; --t-sub: #C8BDA6; --t-mid: #A89C85; --t-mut: #8C806B; --t-faint: #665C4C; --t-accent: #D9B46A; --t-good: #8FD0A6; --t-bad: #E08E80; --t-display: 'Instrument Serif', Georgia, serif;
  background-color: #090807 !important; background-image: radial-gradient(60% 34% at 50% -4%, rgba(241,220,166,0.17), transparent 72%), radial-gradient(80% 50% at 50% 50%, rgba(18,72,56,0.22), transparent 72%), radial-gradient(140% 90% at 50% 50%, transparent 55%, rgba(0,0,0,0.6) 100%) !important; }
.table-wrap.vip::before { opacity: 0.1; }
.table-wrap.vip .wordmark-sm { font-family: 'Instrument Serif', Georgia, serif !important; font-style: italic; font-weight: 400 !important; font-size: 22px !important; background: linear-gradient(180deg, #F6E6BC 10%, #D9B46A 60%, #B48B45 100%); -webkit-background-clip: text; background-clip: text; color: transparent !important; }
.table-wrap.vip .table-sub { font-family: 'Josefin Sans Variable', 'Josefin Sans', var(--t-body) !important; text-transform: uppercase; letter-spacing: 0.2em; font-size: 9.5px !important; font-weight: 600; color: #A7905F !important; margin-top: 2px; }
.table-wrap.vip .iconbtn { background: transparent !important; border: 1px solid rgba(217,180,106,0.28) !important; color: #D9B46A !important; border-radius: 50% !important; }
.table-wrap.vip .status { color: #C8BDA6; font-style: italic; font-family: 'Instrument Serif', Georgia, serif; font-size: 15px; letter-spacing: 0.01em; }
.table-wrap.vip .bot-av { background: radial-gradient(circle at 35% 30%, #2A241C, #0E0C09 75%) !important; color: #E9CF95 !important; font-family: 'Instrument Serif', Georgia, serif !important; font-weight: 400 !important; font-size: 17px !important; box-shadow: inset 0 0 0 1px rgba(217,180,106,0.6), 0 3px 10px rgba(0,0,0,0.5) !important; border: none !important; }
.table-wrap.vip .felt-oval { border: 10px solid #1A130C !important; background-color: #0B3328 !important; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='26' height='26'%3E%3Cpath d='M13 0L26 13L13 26L0 13Z' fill='none' stroke='%23E2C27E' stroke-opacity='0.07'/%3E%3Ccircle cx='13' cy='13' r='0.9' fill='%23E2C27E' fill-opacity='0.12'/%3E%3C/svg%3E"), radial-gradient(ellipse at 50% 35%, #17594A 0%, #0D3A2E 50%, #062019 100%) !important; box-shadow: inset 0 0 0 1px rgba(0,0,0,0.5), inset 0 14px 34px rgba(0,0,0,0.55), 0 0 0 1px rgba(217,180,106,0.55), 0 0 0 3px #0D0A07, 0 0 0 4px rgba(217,180,106,0.25), 0 18px 40px rgba(0,0,0,0.6), 0 0 80px rgba(217,180,106,0.08) !important; }
.table-wrap.vip .felt-oval::after { content: ""; position: absolute; top: 7px; right: 7px; bottom: 7px; left: 7px; border-radius: 999px; border: 1px solid rgba(217,180,106,0.32); pointer-events: none; }
.table-wrap.vip .felt-oval.drama { box-shadow: inset 0 0 0 1px rgba(0,0,0,0.5), inset 0 14px 34px rgba(0,0,0,0.55), 0 0 0 2px rgba(241,220,166,0.7), 0 0 60px rgba(217,180,106,0.4) !important; }
.vip-logo { display: flex; flex-direction: column; align-items: center; gap: 2px; color: transparent !important; font-size: 0 !important; }
.vip-logo .vl-word { font-family: 'Instrument Serif', Georgia, serif; font-style: italic; font-size: 58px; line-height: 0.95; color: rgba(241,220,166,0.1); letter-spacing: -0.01em; }
.vip-logo .vl-sub { font-family: 'Josefin Sans Variable', 'Josefin Sans', sans-serif; text-transform: uppercase; letter-spacing: 0.42em; font-size: 8.5px; font-weight: 600; color: rgba(241,220,166,0.16); padding-left: 0.42em; }
.table-wrap.vip .fchip.c0 { background: #C9A050; } .table-wrap.vip .fchip.c1 { background: #7A1E2C; } .table-wrap.vip .fchip.c2 { background: #1E1A15; }
.table-wrap.vip .fchip { border-color: rgba(241,220,166,0.85); }
.table-wrap.vip .card { background: #FBF6EA; }
.table-wrap.vip .card.back, .table-wrap.vip .sq-cover { background-color: #0E0C09 !important; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='7' height='7'%3E%3Cpath d='M3.5 0L7 3.5L3.5 7L0 3.5Z' fill='none' stroke='%23D9B46A' stroke-opacity='0.55' stroke-width='0.7'/%3E%3C/svg%3E") !important; background-size: 7px 7px !important; box-shadow: inset 0 0 0 1.5px #D9B46A, inset 0 0 0 3.5px #0E0C09, inset 0 0 0 4.2px rgba(217,180,106,0.55), 0 3px 9px rgba(0,0,0,0.5) !important; }
.table-wrap.vip .card.mini.back { box-shadow: inset 0 0 0 1px #D9B46A, inset 0 0 0 2.2px #0E0C09, 0 2px 5px rgba(0,0,0,0.5) !important; }
.table-wrap.vip .card-slot { border: 1px solid rgba(217,180,106,0.2); background: rgba(0,0,0,0.12); }
.table-wrap.vip .pot-num { background: rgba(6,5,4,0.62); border: 1px solid rgba(217,180,106,0.38); color: #F1DCA6; letter-spacing: 0.02em; }
.table-wrap.vip .chip-badge { background: #0E0C09; border-color: rgba(217,180,106,0.5); color: #E9CF95; }
.table-wrap.vip .dealer-chip { background: linear-gradient(180deg, #F1DCA6, #C9A050); color: #15110A; }
.table-wrap.vip .hero-seat { background: linear-gradient(180deg, #17130F, #0D0B08) !important; border-radius: 18px !important; box-shadow: inset 0 1px 0 rgba(255,240,210,0.06), 0 10px 30px rgba(0,0,0,0.45); }
.table-wrap.vip .btn { background: rgba(243,237,224,0.025) !important; border: 1px solid rgba(217,180,106,0.22) !important; color: #E2D9C6 !important; border-radius: 13px !important; font-family: var(--t-body); box-shadow: none !important; }
.table-wrap.vip .btn-fold { color: #E08E80 !important; border-color: rgba(224,142,128,0.3) !important; }
.table-wrap.vip .btn-go { color: #F1DCA6 !important; border-color: rgba(217,180,106,0.55) !important; background: rgba(217,180,106,0.07) !important; }
.table-wrap.vip .btn-raise, .table-wrap.vip .preset-btn { background: linear-gradient(180deg, #F3DFAA, #C9A050) !important; color: #15110A !important; border-color: transparent !important; box-shadow: inset 0 1px 0 rgba(255,255,255,0.45), 0 8px 22px rgba(201,160,80,0.25) !important; }
.table-wrap.vip .pre-btn { background: transparent !important; border-color: rgba(217,180,106,0.2) !important; color: #B9AC92 !important; }
.table-wrap.vip .pre-btn.on { border-color: rgba(217,180,106,0.7) !important; color: #F1DCA6 !important; background: rgba(217,180,106,0.08) !important; }
.table-wrap.vip .banner { background: rgba(10,9,7,0.75) !important; border-color: rgba(217,180,106,0.35) !important; }
.table-wrap.vip .peek-badge { background: #F1DCA6; color: #15110A; box-shadow: 0 0 0 3px rgba(217,180,106,0.25), 0 2px 6px rgba(0,0,0,0.5); }
.table-wrap.vip .sq-hint { color: #A7905F; }
.table-wrap.vip input[type=range] { accent-color: #D9B46A; }
.table-wrap.vip .bigwin-label { font-family: 'Instrument Serif', Georgia, serif; font-style: italic; font-weight: 400; color: #F1DCA6; }
.table-wrap.vip .bigwin-amt { text-shadow: 0 6px 30px rgba(217,180,106,0.6); color: #FBF2DC; }

.vip-intro { position: fixed; top: 0; right: 0; bottom: 0; left: 0; z-index: 40; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; background: radial-gradient(70% 45% at 50% 45%, #1B1610 0%, #070605 70%); animation: viFade 2.6s ease forwards; cursor: pointer; }
.vi-crest { color: #D9B46A; margin-bottom: 14px; animation: viUp .9s cubic-bezier(.2,.8,.2,1) .1s both; }
.vi-kicker { animation: viUp .9s cubic-bezier(.2,.8,.2,1) .25s both; }
.vi-title { font-family: 'Instrument Serif', Georgia, serif; font-style: italic; font-size: 46px; line-height: 1.05; margin: 10px 0 14px; background: linear-gradient(180deg, #F6E6BC 10%, #D9B46A 60%, #B48B45 100%); -webkit-background-clip: text; background-clip: text; color: transparent; animation: viUp 1s cubic-bezier(.2,.8,.2,1) .35s both; padding: 0 0.1em; }
.vi-rule { width: 120px; height: 1px; background: linear-gradient(90deg, transparent, #D9B46A, transparent); animation: viRule 1.1s cubic-bezier(.2,.8,.2,1) .55s both; }
.vi-sub { margin-top: 14px; font-size: 12px; letter-spacing: 0.14em; color: #B9AC92; animation: viUp .9s cubic-bezier(.2,.8,.2,1) .7s both; }
@keyframes viUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
@keyframes viRule { from { transform: scaleX(0); opacity: 0; } to { transform: scaleX(1); opacity: 1; } }
@keyframes viFade { 0%, 78% { opacity: 1; } 100% { opacity: 0; visibility: hidden; } }

/* show or muck */
.show-btn { display: inline-flex; align-items: center; justify-content: center; gap: 7px; }
.shown-tag { position: absolute; top: -9px; left: 50%; transform: translateX(-50%); z-index: 2; font-size: 9px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; padding: 2px 8px; border-radius: 20px; background: var(--t-accent); color: var(--t-bg); white-space: nowrap; animation: peekPop .22s cubic-bezier(.3,1.5,.5,1) both; }
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; animation-delay: 0ms !important; transition-duration: 0.01ms !important; }
}
`;
