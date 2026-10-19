import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";

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
const CARD_BACKS = [
  { key: "blue", label: "Classic Blue", cost: 0, a: "#2F6FDE", b: "#1F4FA8", ring: "#FFFFFF" },
  { key: "crimson", label: "Crimson", cost: 800, a: "#D23C4E", b: "#9E2233", ring: "#FFFFFF" },
  { key: "emerald", label: "Emerald", cost: 800, a: "#16A06A", b: "#0D7149", ring: "#FFFFFF" },
  { key: "midnight", label: "Midnight Gold", cost: 2500, a: "#14223D", b: "#0B1426", ring: "#F5B83D" },
  { key: "neon", label: "Neon", pass: 10, a: "#8B5CF6", b: "#DB2777", ring: "#FFFFFF" },
  { key: "carbon", label: "Carbon", pass: 20, a: "#2A2F38", b: "#16191F", ring: "#9AA4B2" },
  { key: "foil", label: "Gold Foil", pass: 30, a: "#F5C451", b: "#B7791F", ring: "#FFF3C4" },
];
const FELTS = [
  { key: "green", label: "Classic Green", cost: 0, c1: "#22A866", c2: "#138048", c3: "#0B5C33", rail: "#5A3A20" },
  { key: "royal", label: "Royal Blue", cost: 1500, c1: "#3483E6", c2: "#1C5BB8", c3: "#103C80", rail: "#3B2A1A" },
  { key: "crimson", label: "Crimson", cost: 1500, c1: "#D04256", c2: "#9C2234", c3: "#6E1422", rail: "#2E1F16" },
  { key: "purple", label: "Velvet", pass: 5, c1: "#9659E0", c2: "#6A35B0", c3: "#45207A", rail: "#2B2140" },
  { key: "ocean", label: "Ocean", pass: 15, c1: "#22C2BC", c2: "#12857F", c3: "#0A5753", rail: "#3A2A1C" },
  { key: "blackout", label: "Blackout", cost: 4000, c1: "#343C48", c2: "#1C2129", c3: "#101318", rail: "#C9A24D" },
];
const findBack = (k) => CARD_BACKS.find((b) => b.key === k) || CARD_BACKS[0];
const findFelt = (k) => FELTS.find((f) => f.key === k) || FELTS[0];
function defaultCosmetics() { return { backs: ["blue"], felts: ["green"], cardBack: "blue", felt: "green" }; }

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
const PASS_SPECIAL = { 5: { type: "felt", key: "purple" }, 10: { type: "back", key: "neon" }, 15: { type: "felt", key: "ocean" }, 20: { type: "back", key: "carbon" }, 25: { type: "avatar", key: "🦄" }, 30: { type: "back", key: "foil" } };
const passReward = (lvl) => PASS_SPECIAL[lvl] || { type: "chips", amount: 150 + lvl * 25 };
const passLevel = (xp) => Math.min(PASS_LEVELS, Math.floor(xp / PASS_XP));
const passRewardLabel = (r) => r.type === "chips" ? `${r.amount.toLocaleString()} chips` : r.type === "felt" ? `${findFelt(r.key).label} felt` : r.type === "back" ? `${findBack(r.key).label} card back` : `${r.key} avatar`;
function ensurePass(p) { const season = currentSeasonId(); return p && p.season === season ? p : { season, xp: 0 }; }
// Adds XP and hands out every reward crossed. Returns the new data and what was earned.
function grantXp(d, xp) {
  const pass = ensurePass(d.pass);
  const before = passLevel(pass.xp), after = passLevel(pass.xp + xp);
  let next = { ...d, pass: { ...pass, xp: pass.xp + xp } };
  const earned = [];
  for (let l = before + 1; l <= after; l++) {
    const r = passReward(l); earned.push({ level: l, reward: r });
    const cos = next.cosmetics || defaultCosmetics();
    if (r.type === "chips") next = { ...next, chips: next.chips + r.amount };
    else if (r.type === "felt" && !cos.felts.includes(r.key)) next = { ...next, cosmetics: { ...cos, felts: [...cos.felts, r.key] } };
    else if (r.type === "back" && !cos.backs.includes(r.key)) next = { ...next, cosmetics: { ...cos, backs: [...cos.backs, r.key] } };
    else if (r.type === "avatar" && !next.unlocked.includes(r.key)) next = { ...next, unlocked: [...next.unlocked, r.key] };
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
const TITLE_RARITY = { common: "#A9B8D0", rare: "#6FA8FF", epic: "#B98BFF", legendary: "#F5C451" };
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
function chipColumns(amount, maxCols = 3, maxPer = 9) {
  let left = Math.max(0, Math.round(amount)); const cols = [];
  for (const d of CHIP_DENOMS) { const n = Math.floor(left / d.v); if (n > 0) { cols.push({ c: d.c, n: Math.min(maxPer, n) }); left -= n * d.v; } }
  return cols.slice(0, maxCols);
}
function ChipStack({ amount, small = false }) {
  const cols = chipColumns(amount, small ? 2 : 3, small ? 5 : 9);
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
const canPrestige = (r) => isPlaced(r) && r.rating >= 1500;
function PrestigeBadge({ n, size = 18 }) {
  if (!n) return null;
  return (
    <span className="prestige-badge" style={{ width: size, height: size, fontSize: size * 0.52 }} title={`Prestige ${n}`} aria-label={`Prestige ${n}`}>
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1.5l2.6 5.6 6.1.7-4.5 4.2 1.2 6.1L12 15.1l-5.4 3 1.2-6.1-4.5-4.2 6.1-.7z" fill="url(#pgrad)" stroke="#FFE7A3" strokeWidth="1" /><defs><linearGradient id="pgrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#E36BFF" /><stop offset="1" stopColor="#7C3AED" /></linearGradient></defs></svg>
      <b>{n}</b>
    </span>
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
  const raw = lines.reduce((s, l) => s + l.value, 0);
  const after = Math.max(0, before + raw);
  if (before + raw < 0) lines.push({ label: "Rating can't go below 0", value: -(before + raw) });
  return { ...base, placement: false, before, after, delta: after - before, lines, newFrames: framesEarned(Math.max(ranked.peakRating || 0, after), ranked.frames) };
}
function framesEarned(peak, owned) { return RANK_TIERS.filter((t) => t.min > 0 && peak >= t.min && !owned.includes(t.key)).map((t) => t.key); }
function daysLeftInSeason() { const d = new Date(); const end = new Date(d.getFullYear(), d.getMonth() + 1, 1); return Math.max(1, Math.ceil((end - d) / 86400000)); }
function currentSeasonId() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; }
function rolloverSeason(ranked) {
  const season = currentSeasonId();
  if (!ranked || ranked.seasonId === season) return ranked;
  if (!isPlaced(ranked)) return { ...ranked, seasonId: season };
  const softReset = Math.round(RANK_RESET_TARGET + (ranked.rating - RANK_RESET_TARGET) * 0.5);
  return { ...ranked, rating: softReset, seasonId: season, history: [...(ranked.history || []), { seasonId: ranked.seasonId, rating: ranked.rating, tier: tierForRating(ranked.rating).key }].slice(-6) };
}
function defaultRanked() { return { schema: 2, placed: false, placementGames: [], rating: 0, peakRating: 0, wins: 0, losses: 0, streak: 0, seasonId: currentSeasonId(), history: [], frames: [], frame: null, recent: [], report: null }; }
// Older saves used a different ladder. Keep cosmetics and history, send everyone through placements once.
function migrateRanked(r) {
  if (!r) return defaultRanked();
  if (r.schema === 2) return { ...defaultRanked(), ...r };
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
function makeSfx(ctx, out) {
  const now = () => ctx.currentTime;
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
  return {
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
}
const SFX_NAMES = ["shuffle", "deal", "flip", "click", "call", "raise", "allIn", "fold", "chip", "win", "lose", "tap", "tick", "coin", "ping", "achievement", "rankUp", "rankDown", "heartbeat"];
function useSound(enabled) {
  const ref = useRef(null);
  const get = () => {
    if (!ref.current) {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
      const ctx = new AC();
      const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
      const master = ctx.createGain(); master.gain.value = 0.9; master.connect(comp); comp.connect(ctx.destination);
      ref.current = { ctx, sfx: makeSfx(ctx, master) };
    }
    if (ref.current.ctx.state === "suspended") ref.current.ctx.resume();
    return ref.current.sfx;
  };
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
  return { name: "You", avatar: "🫵", chips: 2000, unlocked: ["🫵", "🙂", "😎", "🐱"], friends: [], achievements: [], lastDailyBonus: null, stats: { handsPlayed: 0, handsWon: 0, biggestPot: 0, netChips: 0, curWinStreak: 0, bestWinStreak: 0, pos: { late: [0, 0], early: [0, 0], blinds: [0, 0] } }, settings: { winTipSeen: false, colorblind: false, cardSize: "normal", animSpeed: "normal", runTwice: false, squeeze: true }, ranked: defaultRanked(), skill: defaultSkill(), cosmetics: defaultCosmetics(), streak: { count: 0, last: null }, challenges: ensureChallenges(null), pass: ensurePass(null), history: { bankroll: [], best: [] }, titles: defaultTitles() };
}
function vibrate(pattern) { try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (e) { /* not supported */ } }
function todayStr() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }

const DISPLAY_FONT = "'Fraunces', Georgia, serif";
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
  const color = sr >= 70 ? "#34D399" : sr >= 45 ? "#F5B83D" : "#FF6B6B";
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0, display: "block" }} role="img" aria-label={`Skill Rating ${sr}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(244,247,252,0.1)" strokeWidth="5" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - sr / 100)} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x={size / 2} y={size / 2 + size * 0.12} textAnchor="middle" fill="#F4F7FC" fontWeight="700" fontSize={size * 0.34} fontFamily="Inter, -apple-system, sans-serif">{sr}</text>
    </svg>
  );
}
function TierBadge({ tier, size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" role="img" aria-label={tier.label} style={{ flexShrink: 0, display: "block" }}>
      <path d="M16 2 28 9v14l-12 7-12-7V9z" fill={tier.color} />
      <path d="M16 2 28 9 16 16 4 9z" fill="#FFFFFF" opacity="0.22" />
      <path d="M16 6.5 24.5 11.5v9L16 25.5l-8.5-5v-9z" fill="none" stroke="rgba(11,20,38,0.3)" strokeWidth="1.2" />
      <text x="16" y="20.3" textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontWeight="700" fontSize="11.5" fill="#0B1426">{tier.key === "unranked" ? "?" : tier.label[0]}</text>
    </svg>
  );
}
function Modal({ title, onClose, children, width = 360 }) {
  return (
    <div className="scrim" onClick={onClose}>
      <div className="sheet" style={{ maxWidth: width }} onClick={(e) => e.stopPropagation()} role="dialog" aria-label={title}>
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
      <div style={{ fontSize: 13, fontWeight: 600, color: "#8FA1BE" }}>{children}</div>
      {right && <div style={{ fontSize: 12, color: "#5E7196" }}>{right}</div>}
    </div>
  );
}
const signed = (n) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n).toLocaleString()}`;

/* =========================================================================
   SEATS / GAME CONSTANTS
   ========================================================================= */
const SMALL_BLIND = 10, BIG_BLIND = 20;
function makePlayers(name, avatar, stack, numSeats = 4) {
  const seats = [{ id: 0, name, isHuman: true, avatar }];
  for (let i = 1; i < numSeats; i++) seats.push({ id: i, name: BOT_NAMES[i - 1], avatar: BOT_EMOJI[i - 1] });
  return seats.map((s) => ({ ...s, stack, hole: [], folded: false, allIn: false, eliminated: false, contributed: 0, streetContributed: 0, hasActed: false }));
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
function PokerTable({ startStack, name, avatar, soundOn, setSoundOn, onExit, onHandResolved, stakes, tableSize, tournament, ranked, rankedState, skill, tourneyBuyIn = 0, bankroll, botSkill = 0.4, opponentRating = null, frameColor, tutorial, variant = "holdem", turbo = false, runTwice = false, squeeze = false, cardBack = null, felt = null, title = null, vip = false, prestige = 0, colorblind, cardSize, animSpeed, showWinTip, onDismissWinTip }) {
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
  const [players, setPlayers] = useState(() => makePlayers(name, avatar, startStack, numSeatsInit));
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
      ? { ...p, hole: [], folded: true, allIn: false, contributed: 0, streetContributed: 0, hasActed: true }
      : { ...p, hole: Array.from({ length: hc }, () => d.pop()), folded: false, allIn: p.stack <= 0, contributed: 0, streetContributed: 0, hasActed: false }));
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
    setDeck(d); setPlayers(ps); setCommunity([]); setCommunity2(null); setDealerIdx(nDealer); setPreAction(null); setHoleRevealed(!squeeze); setAllInShow(false); setAllInOdds(null); setDrama(false); setThinking(null); setCoachNote(null);
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
    setPlayers(resetPs); setCurrentBet(0); setMinRaise(BB); setPreAction(null);
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
      if (winner.id === 0) { humanWon = true; potWonByHuman = totalPot; }
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
      else if (type === "call") { const need = Math.min(currentBet - p.streetContributed, p.stack); p.stack -= need; p.contributed += need; p.streetContributed += need; if (p.stack === 0) p.allIn = true; label = `${p.name} ${p.allIn ? "calls all in" : "calls"} ${need}`; if (p.allIn) sound.allIn(vol); else sound.call(vol); flyBet(idx, need); }
      else if (type === "bet" || type === "raise") {
        const target = Math.min(amount, p.streetContributed + p.stack); const delta = target - p.streetContributed;
        p.stack -= delta; p.contributed += delta; p.streetContributed = target; if (p.stack === 0) p.allIn = true; flyBet(idx, delta);
        setMinRaise(Math.max(BB, target - currentBet)); setCurrentBet(target);
        ps.forEach((pl) => { if (pl.id !== p.id) pl.hasActed = false; });
        label = `${p.name} ${p.allIn ? "is all in for" : type === "bet" ? "bets" : "raises to"} ${target}`; if (p.allIn) sound.allIn(vol); else sound.raise(vol);
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
    const bluffing = Math.random() < pers.bluff * (0.6 + skill * 0.6);
    const toCall = currentBet - p.streetContributed; const potNow = pot;
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

  const coachAdv = tutorial && humanTurn && holeRevealed ? coachAdvice({ hole: human.hole, board: community, eq: equity, toCall: Math.max(0, humanToCall), pot, stack: human.stack, streetIn: human.streetContributed, currentBet, bb: BB, opps: Math.max(1, oppCount), position: handMetaRef.current ? handMetaRef.current.position : "early" }) : null;
  coachRef.current = coachAdv ? { adv: coachAdv, eq: equity, toCall: Math.max(0, humanToCall), pot } : null;
  const handLabel = human && human.hole.length > 0 && stage !== "idle" && stage !== "showdown" && holeRevealed ? describeCurrentHand(human.hole, community) : null;
  const dim = (id) => (stage === "showdown" && winningIds ? !winningIds.has(id) : false);
  const bots = players.slice(1);
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
    const fresh = makePlayers(name, avatar, BB * 100, players.length);
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
      : tutorial ? "Practice, nothing at stake" : vip ? `High roller room, blinds ${SB.toLocaleString()}/${BB.toLocaleString()}` : `${gameTag ? `${gameTag} cash` : "Cash game"}, blinds ${SB}/${BB}`;

  return (
    <div className={`table-wrap${drama ? " is-drama" : ""}${vip ? " vip" : ""}`} style={{ ...(cardBack ? { "--back-a": cardBack.a, "--back-b": cardBack.b, "--back-ring": cardBack.ring } : {}), ...(felt ? { "--felt1": felt.c1, "--felt2": felt.c2, "--felt3": felt.c3, "--rail": felt.rail } : {}) }}>
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

      <div key={statusText} className="status">{stage !== "showdown" ? statusText : ""}</div>

      <div className="seats">
        {bots.map((p, i) => {
          const realIdx = i + 1; const isActive = activeIdx === realIdx && stage !== "idle" && stage !== "showdown"; const revealed = (stage === "showdown" || allInShow) && !p.folded && !p.eliminated && p.hole.length > 0;
          const t = tendencyRef.current[realIdx]; const tendencyTag = t && t.total >= 4 ? (t.aggr / t.total >= 0.55 ? "Aggressive" : t.aggr / t.total <= 0.2 ? "Tight" : null) : null;
          const compact = bots.length >= 5; const tiny = bots.length >= 7;
          const avSize = tiny ? 28 : compact ? 32 : 36; const ringSize = tiny ? 34 : compact ? 38 : 42; const colWidth = tiny ? 54 : compact ? 62 : 78;
          const hc = p.hole.length || holeCount();
          const inHand = !p.eliminated && p.hole.length > 0 && stage !== "idle";
          const botRating = ranked ? botRanks[i] : null;
          return (
            <div key={p.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, width: colWidth, opacity: p.eliminated ? 0.28 : p.folded ? 0.5 : 1, transition: "opacity .3s ease" }}>
              <div ref={(el) => { seatRefs.current[p.id] = el; }} style={{ position: "relative", width: ringSize, height: ringSize }}>
                {isActive && (<svg width={ringSize} height={ringSize} style={{ position: "absolute", top: 0, left: 0, transform: "rotate(-90deg)" }}>
                  <circle cx={ringSize / 2} cy={ringSize / 2} r={ringSize / 2 - 2} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2.5" />
                  <circle cx={ringSize / 2} cy={ringSize / 2} r={ringSize / 2 - 2} fill="none" stroke={timeLeft < 8 ? "#FF6B6B" : "#34D399"} strokeWidth="2.5" strokeDasharray={2 * Math.PI * (ringSize / 2 - 2)} strokeDashoffset={2 * Math.PI * (ringSize / 2 - 2) * (1 - timeLeft / turnSeconds)} style={{ transition: "stroke-dashoffset .25s linear" }} strokeLinecap="round" /></svg>)}
                <div className="bot-av" style={{ width: avSize, height: avSize, background: AVATAR_COLORS[i], fontSize: compact ? 13 : 14 }}>{p.name[0]}</div>
                {thinking === p.id && <div className="think-dots" aria-label={`${p.name} is thinking`}><i /><i /><i /></div>}
                {dealerIdx === realIdx && !p.eliminated && <div className="dealer-chip">D</div>}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4, maxWidth: colWidth }}>
                {botRating != null && <TierBadge tier={tierForRating(botRating)} size={13} />}
                <span style={{ fontSize: compact ? 10.5 : 11.5, fontWeight: 600, color: "#C8D3E6", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</span>
              </div>
              <div className="num" style={{ fontSize: 10.5, color: "#7587A6" }}>{p.eliminated ? "Out" : p.stack.toLocaleString()}</div>
              {tendencyTag && !p.eliminated && !tiny && <div style={{ fontSize: 9.5, fontWeight: 600, color: tendencyTag === "Aggressive" ? "#FF6B6B" : "#34D399" }}>{tendencyTag}</div>}
              <div style={{ height: 34, display: "flex", alignItems: "center", justifyContent: "center", gap: 3 }}>
                {revealed && p.hole.map((c, i2) => (<div key={c.id} className={`card mini${hc > 2 ? " m4" : ""}${dim(c.id) ? " dim" : ""}${winningIds && winningIds.has(c.id) ? " win" : ""}`} style={{ marginLeft: hc > 2 && i2 ? -7 : 0, animation: `flipIn .4s cubic-bezier(.2,.8,.2,1) ${i2 * 0.08}s backwards` }}><div style={{ color: suitColor[c.s], fontSize: 9, fontWeight: 700 }}>{rankLabel(c.r)}{SUIT_GLYPH[c.s]}</div></div>))}
                {!revealed && inHand && (
                  <div key={`b${handsCount}`} className={`backs${p.folded ? " folded" : ""}`}>
                    {Array.from({ length: hc }).map((_, j) => <div key={j} className="card mini back" style={{ "--r": `${hc > 2 ? (j - 1.5) * 8 : j === 0 ? -7 : 7}deg`, marginLeft: j ? (hc > 2 ? -14 : -11) : 0, animation: `dealToSeat .42s cubic-bezier(.2,.8,.2,1) ${dealDelay(p.id, j)}s backwards` }} />)}
                  </div>
                )}
              </div>
              <div style={{ height: 18 }}>
                {allInOdds && allInOdds[p.id] != null && stage !== "showdown" ? <div className="odds-badge num" style={{ color: allInOdds[p.id] >= 50 ? "#34D399" : "#FFB4B4" }}>{allInOdds[p.id]}%</div>
                  : p.streetContributed > 0 && <div className={`chip-badge${collecting ? " collecting" : ""}`}><ChipStack amount={p.streetContributed} small />{p.streetContributed.toLocaleString()}</div>}
              </div>
            </div>
          );
        })}
      </div>
      {confetti && <Confetti key={confetti} />}
      {drama && <div className="drama-vignette" aria-hidden="true" />}

      <div className="felt-center">
        <div className={`felt-oval${drama ? " drama" : ""}`}>
          <div className="felt-logo" aria-hidden="true" style={variant === "short" ? { fontSize: 44 } : undefined}>{vip ? "VIP" : variant === "holdem" ? "felt" : variant === "short" ? "short deck" : "omaha"}</div>
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
            <ChipStack amount={pot} />
            <div ref={potRef} className={`pot-num num${potPulse ? " pulse" : ""}`}>Pot {potShown.toLocaleString()}</div>
          </div>
        </div>
        {stage === "showdown" && winnerBanner && (
          <div className="banner" style={{ borderColor: winnerBanner.won ? "rgba(52,211,153,0.45)" : "rgba(244,247,252,0.12)", background: winnerBanner.won ? "rgba(52,211,153,0.12)" : "rgba(244,247,252,0.04)" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: winnerBanner.won ? "#34D399" : "#EAF0F8" }}>{winnerBanner.text}</div>
                {winnerBanner.text2 && <div style={{ fontSize: 13, fontWeight: 600, color: "#C8D3E6", marginTop: 2 }}>{winnerBanner.text2}</div>}
              </div>
              <button className="iconbtn" onClick={() => setShareOpen(true)} aria-label="Share this hand"><Icon name="share" size={13} /></button>
            </div>
            {winnerBanner.summary && winnerBanner.summary.length > 1 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 3, paddingTop: 7, marginTop: 7, borderTop: "1px solid rgba(244,247,252,0.08)" }}>
                {winnerBanner.summary.map((s) => (
                  <div key={s.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 11.5, color: s.isWinner ? "#34D399" : "#8FA1BE", fontWeight: s.isWinner ? 600 : 400 }}>
                    <span>{s.name}</span><span>{s.desc}</span>
                  </div>
                ))}
              </div>
            )}
            {winnerBanner.potLines && winnerBanner.potLines.length > 1 && (
              <div style={{ fontSize: 10.5, color: "#7587A6", paddingTop: 5 }}>{winnerBanner.potLines.join(". ")}</div>
            )}
          </div>
        )}
      </div>

      <div style={{ width: "100%", maxWidth: 460, flexShrink: 0, height: handLabel ? 46 : 0, overflow: "hidden", transition: "height .2s ease", marginBottom: handLabel ? 8 : 0 }}>
        {handLabel && (<div className="hand-strip" style={{ borderColor: heroEq != null && heroEq >= 50 ? "rgba(52,211,153,0.4)" : "rgba(255,107,107,0.32)" }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#C8D3E6", position: "relative" }}>{handLabel}</span>
          <span className="num" style={{ fontSize: 14.5, fontWeight: 700, position: "relative", color: heroEq == null ? "#7587A6" : eqShown >= 50 ? "#34D399" : "#FF6B6B" }}>{heroEq == null ? "…" : `${eqShown}% to win`}</span>
          <div className="eq-meter" style={{ width: `${heroEq == null ? 0 : eqShown}%`, background: eqShown >= 50 ? "rgba(52,211,153,0.16)" : "rgba(255,107,107,0.13)" }} />
        </div>)}
      </div>
      {handLabel && showWinTip && (
        <div className="tip" style={{ marginTop: -4, color: "#F5B83D", borderColor: "rgba(245,184,61,0.35)", background: "rgba(245,184,61,0.08)" }}>
          <span>Your current hand and your odds of winning this pot. Use it to decide whether to call or fold.</span>
          <button className="iconbtn" onClick={onDismissWinTip} aria-label="Got it"><Icon name="check" size={13} /></button>
        </div>
      )}
      {tutorial && (coachAdv || coachNote) && (
        coachAdv ? (
          <div className={`coach act-${coachAdv.act}`} role="status">
            <div className="coach-head"><span className="coach-badge"><Icon name="cap" size={12} stroke={2.2} />Coach</span><span className="coach-act">{coachAdv.text}</span></div>
            <div className="coach-why">{coachAdv.why}</div>
          </div>
        ) : (
          <div className={`coach note ${coachNote.good ? "good" : "bad"}`} role="status">
            <div className="coach-head"><span className="coach-badge"><Icon name="cap" size={12} stroke={2.2} />Coach</span></div>
            <div className="coach-why">{coachNote.text}</div>
          </div>
        )
      )}
      {tutorial && !coachAdv && !coachNote && stage === "idle" && (
        <div className="coach note good"><div className="coach-head"><span className="coach-badge"><Icon name="cap" size={12} stroke={2.2} />Coach</span></div><div className="coach-why">Deal a hand. On every turn I'll tell you the best move and why.</div></div>
      )}

      <div className="hero-seat" style={{ borderColor: turnPulse ? "rgba(52,211,153,0.6)" : "rgba(244,247,252,0.08)", boxShadow: turnPulse ? "0 0 22px rgba(52,211,153,0.25)" : "none" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <div ref={(el) => { seatRefs.current[0] = el; }} style={{ position: "relative", width: 44, height: 44, flexShrink: 0 }}>
            {humanTurn && (<svg width="44" height="44" style={{ position: "absolute", top: 0, left: 0, transform: "rotate(-90deg)" }}>
              <circle cx="22" cy="22" r="20" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2.5" />
              <circle cx="22" cy="22" r="20" fill="none" stroke={timeLeft < 8 ? "#FF6B6B" : "#34D399"} strokeWidth="2.5" strokeDasharray={2 * Math.PI * 20} strokeDashoffset={2 * Math.PI * 20 * (1 - timeLeft / turnSeconds)} style={{ transition: "stroke-dashoffset .25s linear" }} strokeLinecap="round" /></svg>)}
            <div style={{ position: "absolute", top: 3, left: 3, width: 38, height: 38, borderRadius: "50%", background: "#25395F", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, opacity: human?.folded ? 0.4 : 1, boxShadow: frameColor ? `0 0 0 2px ${frameColor}` : "none" }}>{human?.avatar}</div>
            {dealerIdx === 0 && <div className="dealer-chip" style={{ bottom: -1, right: -1 }}>D</div>}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "flex", alignItems: "center", gap: 5 }}>{human?.name}<PrestigeBadge n={prestige} size={15} /></div>
            {title && title !== "rookie" && <TitleTag k={title} size={10.5} style={{ display: "block", marginTop: -1 }} />}
            <div className="num" style={{ fontSize: 12, color: "#8FA1BE" }}>{(human?.stack ?? 0).toLocaleString()}{ranked && handsCount > 0 && !rankedResult && <span className="standing">{ordinal(rankedPlace)} of {players.length}</span>}</div>
            {human?.streetContributed > 0 && <div className={`chip-badge${collecting ? " collecting" : ""}`} style={{ marginTop: 3 }}><ChipStack amount={human.streetContributed} small />{human.streetContributed.toLocaleString()}</div>}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {human && human.hole.length > 0 ? (
            squeeze && !holeRevealed && !human.folded && stage !== "showdown" ? (
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
            <div style={{ fontFamily: DISPLAY_FONT, fontSize: 20, fontWeight: 600, color: tournamentOver.won ? "#34D399" : "#EAF0F8", marginBottom: 4 }}>{tournamentOver.won ? "You won the tournament" : `You finished ${ordinal(tournamentOver.placement)}`}</div>
            <div className="num" style={{ fontSize: 12.5, color: "#7587A6", marginBottom: 12 }}>{tournamentOver.won ? `Outlasted ${tournamentOver.total - 1} players.` : `Out of ${tournamentOver.total} players.`}{tourneyBuyIn > 0 ? (tourneyPrize(tournamentOver.total, tournamentOver.placement, tourneyBuyIn) > 0 ? ` You cashed ${tourneyPrize(tournamentOver.total, tournamentOver.placement, tourneyBuyIn).toLocaleString()} chips.` : " Outside the money.") : ""}</div>
            <button className="btn btn-raise" style={{ width: "100%" }} onClick={() => onExit(startStack, tournamentOver)}>Back to lobby</button>
          </div>
        ) : tableCleared && !ranked && !tournament && betweenHands ? (
          <div style={{ textAlign: "center", width: "100%" }}>
            <div style={{ fontFamily: DISPLAY_FONT, fontSize: 20, fontWeight: 600, marginBottom: 4 }}>You cleared the table</div>
            <div className="num" style={{ fontSize: 12.5, color: "#7587A6", marginBottom: 12 }}>{tutorial ? "Nice. Practice chips don't count toward your balance." : `${signed(human.stack - startStack)} chips this session.`}</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn" onClick={() => onExit(human.stack)}>{tutorial ? "Lobby" : "Cash out"}</button>
              <button className="btn btn-raise" onClick={newTable}>New table</button>
            </div>
          </div>
        ) : busted ? (
          <div style={{ textAlign: "center", width: "100%" }}>
            <div style={{ fontSize: 13.5, color: "#FF6B6B", marginBottom: 10 }}>You're out of chips.</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn" onClick={() => onExit(0)}>Back to lobby</button>
              {!tournament && !ranked && <button className="btn btn-raise" onClick={rebuy}>Rebuy {rebuyAmount.toLocaleString()}</button>}
            </div>
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
        ) : (<div style={{ fontSize: 12.5, color: "#5E7196", padding: "12px 0" }}>Waiting on the table</div>)}
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
                <span style={{ width: 7, height: 7, borderRadius: "50%", flexShrink: 0, background: h.won ? "#34D399" : "rgba(244,247,252,0.2)" }} />
                <span style={{ fontSize: 12.5, color: h.won ? "#34D399" : "#C8D3E6" }}>{h.text}</span>
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
              ? <div className="kv"><span>Placement result</span><b style={{ color: preview.won ? "#34D399" : "#FF6B6B" }}>{preview.won ? "Win" : "Loss"}</b></div>
              : <div className="kv"><span>Rating change</span><b className="num" style={{ color: preview.delta >= 0 ? "#34D399" : "#FF6B6B" }}>{signed(preview.delta)} RP</b></div>}
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
  fit(hand.headline, 50, 800, hand.won ? "#34D399" : "#F4F7FC", 1186);
  if (hand.headline2) fit(hand.headline2, 38, 700, "#C8D3E6", 1240);
  else if (hand.heroDesc) fit(`You had ${hand.heroDesc}`, 36, 600, "#A9B8D0", 1240);
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
      <div style={{ fontSize: 12, color: "#7587A6", textAlign: "center", margin: "10px 0 12px" }}>Press and hold the image to save it, or tap Share.</div>
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
        return <div key={i} title={g ? (g.won ? "Win" : "Loss") : "Not played"} style={{ width: size, height: size, borderRadius: "50%", background: g ? (g.won ? "#34D399" : "#FF6B6B") : "transparent", border: g ? "none" : "1.5px solid rgba(244,247,252,0.22)" }} />;
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
      {!canPlayAgain && <div style={{ fontSize: 12, color: "#7587A6", marginTop: 10, textAlign: "center" }}>You need {RANKED_BUYIN.toLocaleString()} chips to queue again.</div>}
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
            <div className="results-sub" style={{ marginTop: 18, fontSize: 15, color: "#EAF0F8" }}>Reading your game</div>
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
          <div style={{ display: "flex", justifyContent: "center", margin: "18px 0 12px" }}><div className="badge-pop"><TierBadge tier={tier} size={96} /></div></div>
          <div className="results-kicker">You placed</div>
          <h1 className="results-head" style={{ color: tier.color, fontSize: 46, marginTop: 4 }}>{rankName(assess.rating)}</h1>
          <div className="results-sub num">{assess.rating.toLocaleString()} RP</div>
          <div style={{ margin: "16px 0 4px" }}><PlacementDots games={games} /></div>
          {assess.sk && (
            <div className="results-tier" style={{ marginTop: 16 }}>
              <SkillDial sr={assess.sk.sr} size={52} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700 }}>Skill Rating {assess.sk.sr} <span style={{ color: "#7587A6", fontWeight: 500 }}>±{assess.sk.margin}</span></div>
                <div style={{ fontSize: 12, color: "#8FA1BE", marginTop: 2 }}>{assess.sk.label}. Full breakdown in the Coach tab.</div>
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
          <h1 className="results-head" style={{ color: result.won ? "#F4F7FC" : "#B9C6DA" }}>{headline}</h1>
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
        <h1 className="results-head" style={{ color: result.won ? "#F4F7FC" : "#B9C6DA" }}>{headline}</h1>
        <div className="results-sub">{sub}</div>
        <div className="results-delta num" style={{ color: result.delta >= 0 ? "#34D399" : "#FF6B6B" }}>{signed(result.delta)}<span>RP</span></div>
        <div className="results-tier">
          <TierBadge tier={tierNow} size={42} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ fontWeight: 700, color: tierNow.color }}>{rankName(shown)}</span>
              <span className="num" style={{ fontWeight: 600 }}>{shown.toLocaleString()} RP</span>
            </div>
            <div className="bar" style={{ marginTop: 8 }}><div style={{ width: `${prog.pct * 100}%`, background: tierNow.color }} /></div>
            <div style={{ fontSize: 11.5, color: "#7587A6", marginTop: 6 }}>{prog.nextLabel ? `${prog.toNext} RP to ${prog.nextLabel}` : "Top of the ladder"}</div>
          </div>
        </div>
        {(divMoved || frameUnlocked) && (
          <div className="results-note" style={{ borderColor: result.after < result.before ? "rgba(255,107,107,0.4)" : `${tierAfter.color}88` }}>
            {divMoved && result.after > result.before && <div style={{ fontWeight: 700, color: tierAfter.color }}>{moved > 0 ? "Promoted" : "Moved up"} to {rankName(result.after)}</div>}
            {divMoved && result.after < result.before && <div style={{ fontWeight: 700, color: "#FF6B6B" }}>Dropped to {rankName(result.after)}</div>}
            {frameUnlocked && <div style={{ color: "#A9B8D0", marginTop: divMoved ? 2 : 0 }}>{frameUnlocked.label} avatar frame unlocked. Equip it from your profile.</div>}
          </div>
        )}
        <div className="results-lines">
          {result.lines.map((l) => (<div key={l.label}><span>{l.label}</span><b className="num" style={{ color: l.value >= 0 ? "#34D399" : "#FF6B6B" }}>{signed(l.value)}</b></div>))}
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
    rot: Math.random() * 540, drift: (Math.random() - 0.5) * 140, color: ["#F5B83D", "#F4F7FC", "#34D399", "#6FA8FF"][i % 4], w: 5 + Math.random() * 4,
  })), []);
  return (
    <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, pointerEvents: "none", overflow: "hidden", zIndex: 20 }}>
      {pieces.map((p) => (
        <div key={p.id} style={{ position: "absolute", top: "38%", left: `${p.left}%`, width: p.w, height: p.w * 1.6, borderRadius: 1.5, background: p.color, "--drift": `${p.drift}px`, "--rot": `${p.rot}deg`, animation: `confettiFall ${p.dur}s ease-in ${p.delay}s forwards` }} />
      ))}
    </div>
  );
}

function RankingsModal({ onClose, suitColor = SUIT_COLOR, variant = "holdem" }) {
  return (
    <Modal title="Hand rankings" onClose={onClose} width={400}>
      <div style={{ fontSize: 12, color: "#7587A6", margin: "-6px 2px 8px" }}>Strongest first. Faded cards are kickers and only break ties.</div>
      {variant === "short" && <div className="tip" style={{ color: "#F5B83D", borderColor: "rgba(245,184,61,0.35)", background: "rgba(245,184,61,0.08)", marginTop: 4 }}><span>Short Deck changes two things: a flush beats a full house, and three of a kind beats a straight. A-6-7-8-9 is the lowest straight.</span></div>}
      {variant === "omaha" && <div className="tip" style={{ color: "#F5B83D", borderColor: "rgba(245,184,61,0.35)", background: "rgba(245,184,61,0.08)", marginTop: 4 }}><span>Omaha: your hand must use exactly 2 of your 4 cards plus 3 from the board.</span></div>}
      <div style={{ maxHeight: "62vh", overflowY: "auto", margin: "0 -4px" }}>
        {RANKING_REFERENCE.map((r, i) => (
          <div key={r.name} className="rank-row">
            <div className="rank-num num">{i + 1}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>{r.name}</div>
              <div style={{ fontSize: 11.5, color: "#7587A6", marginTop: 1 }}>{r.desc}</div>
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

function RankedCard({ ranked, chips, onPlay, onPrestige }) {
  const placed = isPlaced(ranked);
  const tier = tierOf(ranked);
  const prog = placed ? rankProgress(ranked.rating) : null;
  const games = ranked.placementGames || [];
  const locked = chips < RANKED_BUYIN;
  const month = new Date().toLocaleString("en-US", { month: "long" });
  return (
    <section className="panel" style={{ background: `linear-gradient(160deg, ${tier.color}2E 0%, #14223D 58%)`, borderColor: `${tier.color}55` }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#7587A6" }}>
        <span style={{ fontWeight: 600, color: "#A9B8D0" }}>Ranked</span>
        <span>{month} season ends in {daysLeftInSeason()} days</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14, margin: "16px 0 14px" }}>
        <TierBadge tier={tier} size={54} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: DISPLAY_FONT, fontSize: 25, fontWeight: 600, color: tier.color, lineHeight: 1.05, display: "flex", alignItems: "center", gap: 8 }}>{placed ? rankName(ranked.rating) : "Unranked"}<PrestigeBadge n={ranked.prestige} size={20} /></div>
          <div className="num" style={{ fontSize: 13, color: "#A9B8D0", marginTop: 4 }}>{placed ? `${Math.round(ranked.rating).toLocaleString()} RP` : `${games.length} of ${PLACEMENT_MATCHES} placement matches`}</div>
        </div>
        {placed && ranked.wins + ranked.losses > 0 && (
          <div style={{ textAlign: "right" }}>
            <div className="num" style={{ fontSize: 15, fontWeight: 600 }}>{ranked.wins}<span style={{ color: "#5E7196" }}> W</span> {ranked.losses}<span style={{ color: "#5E7196" }}> L</span></div>
            {ranked.streak >= 2 && <div style={{ fontSize: 11.5, color: "#34D399", marginTop: 2 }}>{ranked.streak} in a row</div>}
          </div>
        )}
      </div>
      {placed ? (
        <>
          <div className="bar"><div style={{ width: `${prog.pct * 100}%`, background: tier.color }} /></div>
          <div style={{ fontSize: 12, color: "#7587A6", marginTop: 7 }}>{prog.nextLabel ? `${prog.toNext} RP to ${prog.nextLabel}` : "Top of the ladder"}</div>
        </>
      ) : (
        <>
          <PlacementDots games={games} size={14} />
          <div style={{ fontSize: 12, color: "#7587A6", marginTop: 10, textAlign: "center" }}>Play {PLACEMENT_MATCHES} matches and we'll read your game to set your rank.</div>
        </>
      )}
      {canPrestige(ranked) && onPrestige && <button className="btn prestige-btn" style={{ width: "100%", marginTop: 14 }} onClick={onPrestige}>Prestige to Bronze for a badge and {PRESTIGE_REWARD.toLocaleString()} chips</button>}
      <button className="btn btn-raise shine" style={{ width: "100%", marginTop: canPrestige(ranked) ? 8 : 18 }} disabled={locked} onClick={onPlay}>
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
          <div style={{ fontSize: 11.5, color: "#7587A6" }}>{tournament ? "12 second clock, blinds up every 3 hands" : "12 second clock, faster bots"}</div>
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
          <div className="sec-ic" style={{ background: "rgba(52,211,153,0.16)", color: "#34D399" }}><Icon name="star" size={15} stroke={2} /></div>
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
                  <div className="bar" style={{ flex: 1, height: 6 }}><div style={{ width: `${(c.progress / c.target) * 100}%`, background: done ? "#34D399" : "linear-gradient(90deg,#6FA8FF,#8B5CF6)" }} /></div>
                  <span className="num" style={{ fontSize: 11.5, color: "#8FA1BE", minWidth: 34, textAlign: "right" }}>{c.progress}/{c.target}</span>
                </div>
              </div>
              {c.claimed ? <div className="chal-done"><Icon name="check" size={15} stroke={2.4} /></div>
                : <button className={`btn btn-sm ${done ? "btn-go shine" : ""}`} disabled={!done} style={{ padding: "7px 11px", fontSize: 12 }} onClick={() => onClaim(which, c.id)}>{done ? "Claim" : `+${rw.chips}`}</button>}
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: 11.5, color: "#5E7196", marginTop: 12 }}>
        {which === "daily" ? `New ones in ${hoursLeftToday()}h. Each pays ${rw.chips} chips and ${rw.xp} XP.` : `Resets in ${weekResetDays()} day${weekResetDays() === 1 ? "" : "s"}. Each pays ${rw.chips.toLocaleString()} chips and ${rw.xp} XP.`}
      </div>
    </section>
  );
}

function PassRewardIcon({ r, size = 34 }) {
  if (r.type === "felt") { const f = findFelt(r.key); return <div className="pr-ic" style={{ width: size, height: size, background: `radial-gradient(circle at 50% 40%, ${f.c1}, ${f.c3})`, border: `3px solid ${f.rail}` }} />; }
  if (r.type === "back") { const b = findBack(r.key); return <div className="pr-ic" style={{ width: size * 0.74, height: size, borderRadius: 5, background: `repeating-linear-gradient(45deg, ${b.a} 0 4px, ${b.b} 4px 8px)`, boxShadow: `inset 0 0 0 2px ${b.ring}` }} />; }
  if (r.type === "avatar") return <div className="pr-ic" style={{ width: size, height: size, fontSize: size * 0.6, background: "rgba(244,247,252,0.08)" }}>{r.key}</div>;
  return <div className="pr-ic" style={{ width: size, height: size, background: "rgba(245,184,61,0.16)", color: "#F5B83D" }}><Icon name="chips" size={size * 0.5} stroke={2} /></div>;
}

function PassCard({ pass, onOpen }) {
  const p = ensurePass(pass);
  const lvl = passLevel(p.xp);
  const into = p.xp - lvl * PASS_XP;
  const maxed = lvl >= PASS_LEVELS;
  const nextR = maxed ? null : passReward(lvl + 1);
  const month = new Date().toLocaleString("en-US", { month: "long" });
  return (
    <button className="pass-card" onClick={onOpen}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div className="pass-lvl num"><div style={{ fontSize: 10, fontWeight: 700, opacity: 0.8, letterSpacing: "0.06em" }}>LVL</div>{lvl}</div>
        <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>{month} season pass</div>
          <div style={{ fontSize: 12, color: "#D6C7FF", marginTop: 2 }}>{maxed ? "Maxed out. Nice." : `Next: ${passRewardLabel(nextR)}`}</div>
        </div>
        {nextR && <PassRewardIcon r={nextR} size={34} />}
      </div>
      <div className="bar" style={{ marginTop: 12, height: 8, background: "rgba(255,255,255,0.14)" }}><div style={{ width: `${maxed ? 100 : (into / PASS_XP) * 100}%`, background: "linear-gradient(90deg,#F5B83D,#FF7AB8)" }} /></div>
      <div className="num" style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: "#C9B8F5", marginTop: 6 }}>
        <span>{maxed ? `${p.xp.toLocaleString()} XP` : `${into} / ${PASS_XP} XP`}</span><span>Ends in {daysLeftInSeason()} days</span>
      </div>
    </button>
  );
}

function PassModal({ pass, onClose }) {
  const p = ensurePass(pass);
  const lvl = passLevel(p.xp);
  const ref = useRef(null);
  useEffect(() => { const el = ref.current && ref.current.querySelector(".pass-row.next"); if (el && el.scrollIntoView) el.scrollIntoView({ block: "center" }); }, []);
  return (
    <Modal title="Season pass" onClose={onClose} width={400}>
      <div style={{ fontSize: 12, color: "#7587A6", margin: "-6px 2px 10px" }}>Earn XP from every hand, ranked match, tournament and challenge. Rewards unlock on their own. Resets each month.</div>
      <div ref={ref} style={{ maxHeight: "58vh", overflowY: "auto", margin: "0 -4px", padding: "0 4px" }}>
        {Array.from({ length: PASS_LEVELS }, (_, i) => i + 1).map((l) => {
          const r = passReward(l), got = l <= lvl, special = r.type !== "chips";
          return (
            <div key={l} className={`pass-row${got ? " got" : ""}${l === lvl + 1 ? " next" : ""}${special ? " special" : ""}`}>
              <div className="num pass-row-n">{l}</div>
              <PassRewardIcon r={r} size={30} />
              <div style={{ flex: 1, fontSize: 13, fontWeight: special ? 700 : 500 }}>{passRewardLabel(r)}</div>
              {got ? <Icon name="check" size={15} stroke={2.4} style={{ color: "#34D399" }} /> : <span className="num" style={{ fontSize: 11, color: "#5E7196" }}>{(l * PASS_XP).toLocaleString()} XP</span>}
            </div>
          );
        })}
      </div>
    </Modal>
  );
}

function SpinCard({ ready, onOpen }) {
  return (
    <button className={`spin-card${ready ? " ready" : ""}`} onClick={onOpen}>
      <div className="spin-ic"><Icon name="wheel" size={20} stroke={2} /></div>
      <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>{ready ? "Daily spin is ready" : "Daily spin"}</div>
        <div style={{ fontSize: 11.5, color: ready ? "#CFE6FF" : "#7587A6", marginTop: 1 }}>{ready ? "Chips, XP, or a 5,000 chip jackpot" : `Next spin in ${hoursUntilTomorrow()}h`}</div>
      </div>
      {ready ? <span className="btn btn-raise btn-sm shine" style={{ pointerEvents: "none" }}>Spin</span> : <Icon name="lock" size={14} style={{ color: "#5E7196" }} />}
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
          <div style={{ fontSize: 12, color: "#8FA1BE" }}>{result.big ? "Jackpot" : "You won"}</div>
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
      <div className="vip-ic"><Icon name="crown" size={20} stroke={2} /></div>
      <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
        <div style={{ fontSize: 14.5, fontWeight: 800, color: "#F5D27A", letterSpacing: "0.02em" }}>High Roller Room</div>
        {unlocked
          ? <div style={{ fontSize: 11.5, color: "#C9B78A", marginTop: 1 }}>Blinds from 250/500. Sharp players only.</div>
          : (<>
              <div style={{ fontSize: 11.5, color: "#9C8E6C", marginTop: 1 }} className="num">Unlocks at {HIGH_ROLLER_MIN.toLocaleString()} chips</div>
              <div className="bar" style={{ height: 5, marginTop: 7, background: "rgba(245,210,122,0.12)" }}><div style={{ width: `${Math.min(100, (chips / HIGH_ROLLER_MIN) * 100)}%`, background: "linear-gradient(90deg,#C9A24D,#F5D27A)" }} /></div>
            </>)}
      </div>
      <Icon name={unlocked ? "chevron" : "lock"} size={15} style={{ color: unlocked ? "#F5D27A" : "#6E6248" }} />
    </button>
  );
}

function HomeMenu({ onPlayAI, data, chips, ranked, onClaimDaily, onClaimChallenge, onSpin, onPrestige, sound }) {
  const [modal, setModal] = useState(null); // "ranked" | "cash" | "tournament" | "pass"
  const [size, setSize] = useState(TABLE_SIZES[1]);
  const [tBuyIn, setTBuyIn] = useState(TOURNEY_BUYINS[0]);
  const [turbo, setTurbo] = useState(false);
  const placed = isPlaced(ranked);
  const close = () => setModal(null);
  const st = streakState(data.streak);
  const streakCount = st.claimedToday ? data.streak.count : st.nextDay > 1 ? st.nextDay - 1 : 0;
  const modes = [
    { key: "cash", title: "Cash", sub: "Rebuy anytime", icon: "chips", act: () => setModal("cash") },
    { key: "tournament", title: "Tournament", sub: "Real payouts", icon: "trophy", act: () => setModal("tournament") },
    { key: "practice", title: "Practice", sub: "Tips as you play", icon: "cap", act: () => onPlayAI({ mode: "practice", tableSize: TABLE_SIZES[1], stakes: { sb: 10, bb: 20 } }) },
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

      <StreakBanner streak={data.streak} onClaim={onClaimDaily} />
      <div style={{ marginBottom: 14 }}><SpinCard ready={spinReady(data)} onOpen={() => setModal("spin")} /></div>

      <div style={{ marginBottom: 14 }}><RankedCard ranked={ranked} chips={chips} onPlay={() => setModal("ranked")} onPrestige={() => setModal("prestige")} /></div>

      <div className="mode-grid">
        {modes.map((o) => (
          <button key={o.key} className={`mode-tile m-${o.key}`} onClick={o.act}>
            <div className="mode-ic"><Icon name={o.icon} size={20} stroke={2} /></div>
            <div className="mode-title">{o.title}</div>
            <div className="mode-sub">{o.sub}</div>
          </button>
        ))}
      </div>

      <div style={{ marginBottom: 14 }}><VipCard chips={chips} onOpen={() => setModal("vip")} /></div>
      <div style={{ marginBottom: 14 }}><PassCard pass={data.pass} onOpen={() => setModal("pass")} /></div>
      <ChallengesCard challenges={data.challenges} onClaim={onClaimChallenge} />

      {modal === "pass" && <PassModal pass={data.pass} onClose={close} />}
      {modal === "spin" && <SpinModal ready={spinReady(data)} onSpin={onSpin} onClose={close} sound={sound} />}
      {modal === "prestige" && (
        <Modal title="Prestige" onClose={close}>
          <div style={{ display: "flex", justifyContent: "center", margin: "4px 0 12px" }}><PrestigeBadge n={(ranked.prestige || 0) + 1} size={56} /></div>
          <p className="sheet-body" style={{ marginTop: 0 }}>You made Champion. Prestige resets your rank to Bronze so you can climb again, and you keep a badge that shows how many times you've done it.</p>
          <div className="kv-list">
            <div className="kv"><span>New rank</span><b>Bronze I</b></div>
            <div className="kv"><span>Badge</span><b>Prestige {(ranked.prestige || 0) + 1}</b></div>
            <div className="kv"><span>Bonus</span><b className="num">{PRESTIGE_REWARD.toLocaleString()} chips</b></div>
            <div className="kv"><span>You keep</span><b>Frames, titles, stats, peak rank</b></div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button className="btn" onClick={close}>Not yet</button>
            <button className="btn btn-raise shine" onClick={() => { onPrestige(); close(); }}>Prestige</button>
          </div>
        </Modal>
      )}
      {modal === "vip" && (
        <Modal title="High Roller Room" onClose={close} width={380}>
          <p className="sheet-body" style={{ marginTop: 0 }}>{chips >= HIGH_ROLLER_MIN ? "Big blinds and the sharpest bots in felt. Your whole bankroll comes to the table, so pick your spot." : `Get to ${HIGH_ROLLER_MIN.toLocaleString()} chips to get in. You have ${chips.toLocaleString()}.`}</p>
          <SizePicker value={size} onChange={setSize} />
          <div className="list" style={{ marginTop: 12 }}>
            {HIGH_ROLLER_TABLES.map((t) => {
              const locked = chips < t.minBankroll;
              return (
                <button key={t.key} disabled={locked} className="row vip-row" onClick={() => onPlayAI({ mode: "cash", tableSize: size, stakes: t, vip: true })}>
                  <div style={{ textAlign: "left" }}>
                    <div className="row-title" style={{ color: "#F5D27A" }}>{t.label}</div>
                    <div className="row-sub num">Blinds {t.sb.toLocaleString()}/{t.bb.toLocaleString()}{locked ? `, needs ${t.minBankroll.toLocaleString()} chips` : ""}</div>
                  </div>
                  <Icon name={locked ? "lock" : "chevron"} size={15} style={{ color: "#9C8E6C", flexShrink: 0 }} />
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
            <div className="kv"><span>Opponents</span><b>{placed ? `Near ${rankName(ranked.rating)}` : "Mixed, to test you"}</b></div>
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
                  <Icon name={locked ? "lock" : "chevron"} size={15} style={{ color: "#5E7196", flexShrink: 0 }} />
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
            <div style={{ fontSize: 12, color: "#7587A6", margin: "14px 2px 6px" }}>Buy-in</div>
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
  const scoreColor = (x) => (x >= 70 ? "#34D399" : x >= 45 ? "#F5B83D" : "#FF6B6B");
  if (!sk || k.hands < need) {
    return (
      <div className="screen screen-fade">
        <header className="home-head"><div className="wordmark">Coach</div></header>
        <section className="panel" style={{ textAlign: "center", padding: "26px 20px" }}>
          <div style={{ fontFamily: DISPLAY_FONT, fontSize: 22, fontWeight: 700 }}>Play a few hands first</div>
          <p className="sheet-body" style={{ margin: "8px 0 16px" }}>Your Skill Rating looks at eight things: decisions against the odds, preflop discipline, aggression, position, showdowns, luck-adjusted results, composure and tournaments. It needs {need} hands to start.</p>
          <div className="bar" style={{ maxWidth: 220, margin: "0 auto" }}><div style={{ width: `${(k.hands / need) * 100}%`, background: "#F5B83D" }} /></div>
          <div className="num" style={{ fontSize: 12, color: "#7587A6", marginTop: 8 }}>{k.hands} of {need} hands</div>
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
          <div style={{ fontSize: 12, color: "#7587A6" }}>Skill Rating</div>
          <div style={{ fontFamily: DISPLAY_FONT, fontSize: 26, fontWeight: 700, color: scoreColor(sk.sr), lineHeight: 1.1 }}>{sk.label}</div>
          <div className="num" style={{ fontSize: 12.5, color: "#8FA1BE", marginTop: 4 }}>±{sk.margin} from {k.hands.toLocaleString()} hands. The margin shrinks as you play.</div>
        </div>
      </section>

      <section className="panel" style={{ marginBottom: 14 }}>
        <div className="report-head" style={{ marginBottom: 6 }}><span>Scouting report</span></div>
        <p style={{ fontSize: 13.5, lineHeight: 1.55, color: "#C8D3E6", margin: 0 }}>{skillReport(sk)}</p>
      </section>

      <SectionLabel right="Score out of 100">Breakdown</SectionLabel>
      <div className="list" style={{ gap: 6, marginBottom: 14 }}>
        {sk.comps.slice().sort((a, b) => b.weight - a.weight).map((c) => (
          <div key={c.key} className="comp-row" style={{ opacity: c.enough ? 1 : 0.62 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>{c.label} <span style={{ fontSize: 11, color: "#5E7196", fontWeight: 500 }}>{Math.round(c.weight * 100)}%</span></div>
              <div className="num" style={{ fontSize: 15, fontWeight: 700, color: c.enough ? scoreColor(c.score) : "#7587A6" }}>{c.enough ? c.score : "–"}</div>
            </div>
            <div className="bar" style={{ marginTop: 7, height: 5 }}><div style={{ width: `${c.enough ? c.score : 0}%`, background: scoreColor(c.score) }} /></div>
            <div style={{ fontSize: 11.5, color: "#8FA1BE", marginTop: 6, lineHeight: 1.4 }}>{c.detail}</div>
          </div>
        ))}
      </div>

      {recent.length > 1 && (
        <section className="panel" style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, color: "#7587A6" }}>Decision quality, last {recent.length} hands</div>
          <div className="spark" aria-label="Decision quality by hand, oldest to newest">
            {recent.map((q, i) => <div key={i} style={{ height: `${Math.max(8, q * 100)}%`, background: q >= 0.7 ? "#34D399" : q >= 0.5 ? "#F5B83D" : "#FF6B6B" }} title={pctStr(q)} />)}
          </div>
          <div style={{ fontSize: 11, color: "#5E7196", marginTop: 6 }}>Newest on the right</div>
        </section>
      )}

      <SectionLabel right={`${idx.toLocaleString()} pts`}>Tournament index</SectionLabel>
      <section className="panel" style={{ marginBottom: 14 }}>
        {tourneys.length === 0 ? (
          <div style={{ fontSize: 13, color: "#8FA1BE", lineHeight: 1.5 }}>Works like the Global Poker Index. Each cash scores buy-in size times how deep you went against the field, then fades as it ages. Your best 8 count.</div>
        ) : (
          <>
            {tourneys.slice(0, 6).map((r, i) => (
              <div key={r.at + "-" + i} className="kv" style={{ alignItems: "center" }}>
                <span>{ordinal(r.place)} of {r.field}, {r.buyIn ? `${r.buyIn.toLocaleString()} buy-in` : "freeroll"} <span style={{ color: "#5E7196" }}>{new Date(r.at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span></span>
                <b className="num" style={{ color: r.pts > 0 ? "#34D399" : "#5E7196" }}>{r.pts > 0 ? `+${r.pts}` : "0"}</b>
              </div>
            ))}
            <div style={{ fontSize: 11.5, color: "#5E7196", marginTop: 10, lineHeight: 1.45 }}>Only paid finishes score. Results lose value after a week and drop off after 90 days, like the GPI.</div>
          </>
        )}
      </section>
      <div style={{ fontSize: 11.5, color: "#5E7196", margin: "0 4px", lineHeight: 1.5 }}>Every decision is graded against your real odds at that moment. All-in pots count the equity you had when the chips went in, so bad beats don't hurt your rating and lucky rivers don't help it. Results against tougher opponents count more.</div>
    </div>
  );
}

/* =========================================================================
   SHOP TAB
   ========================================================================= */
function BackSwatch({ b, w = 44 }) {
  return <div className="back-sw" style={{ width: w, height: w * 1.4, background: `repeating-linear-gradient(45deg, ${b.a} 0 5px, ${b.b} 5px 10px)`, boxShadow: `inset 0 0 0 3px ${b.ring}, 0 4px 10px rgba(0,0,0,0.35)` }} />;
}
function FeltSwatch({ f }) {
  return <div className="felt-sw" style={{ background: `radial-gradient(ellipse at 50% 40%, ${f.c1} 0%, ${f.c2} 55%, ${f.c3} 100%)`, borderColor: f.rail }} />;
}
function CosmeticTile({ item, owned, equipped, chips, onBuy, onEquip, children }) {
  const canAfford = item.cost != null && chips >= item.cost;
  let label, cls = "", act = null;
  if (equipped) { label = "Equipped"; cls = " eq"; }
  else if (owned) { label = "Equip"; act = onEquip; }
  else if (item.pass) { label = `Pass lvl ${item.pass}`; cls = " locked"; }
  else { label = item.cost.toLocaleString(); act = canAfford ? onBuy : null; cls = canAfford ? " buy" : " locked"; }
  return (
    <button className={`cos-tile${equipped ? " on" : ""}`} onClick={act || undefined} disabled={!act && !equipped} aria-pressed={equipped}>
      <div className="cos-prev">{children}</div>
      <div className="cos-name">{item.label}</div>
      <div className={`cos-tag num${cls}`}>{!owned && !item.pass && <span className="chip-dot" style={{ width: 9, height: 9 }} />}{item.pass && !owned ? <Icon name="lock" size={10} stroke={2.2} /> : null}{label}</div>
    </button>
  );
}

function ShopScreen({ data, onClaimChips, onBuyAvatar, onClaimDaily, onBuyCosmetic, onEquipCosmetic, onBuyTitle }) {
  const st = streakState(data.streak);
  const cos = data.cosmetics || defaultCosmetics();
  const curDay = st.claimedToday ? data.streak.count : st.nextDay;
  return (
    <div className="screen screen-fade">
      <header className="home-head">
        <div className="wordmark">Shop</div>
        <div className="chip-pill num"><span className="chip-dot" />{data.chips.toLocaleString()}</div>
      </header>

      <section className="panel streak-panel" style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div className="sec-ic" style={{ background: "rgba(255,138,76,0.18)", color: "#FF8A4C" }}><Icon name="flame" size={15} stroke={2} /></div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>Daily streak</div>
              <div style={{ fontSize: 11.5, color: "#A9B8D0" }}>{st.claimedToday ? "Claimed. Come back tomorrow." : "Miss a day and it starts over"}</div>
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
          <CosmeticTile key={f.key} item={f} owned={cos.felts.includes(f.key)} equipped={cos.felt === f.key} chips={data.chips} onBuy={() => onBuyCosmetic("felt", f)} onEquip={() => onEquipCosmetic("felt", f.key)}>
            <FeltSwatch f={f} />
          </CosmeticTile>
        ))}
      </div>

      <SectionLabel right="Tap to equip">Card backs</SectionLabel>
      <div className="cos-grid" style={{ marginBottom: 24 }}>
        {CARD_BACKS.map((b) => (
          <CosmeticTile key={b.key} item={b} owned={cos.backs.includes(b.key)} equipped={cos.cardBack === b.key} chips={data.chips} onBuy={() => onBuyCosmetic("back", b)} onEquip={() => onEquipCosmetic("back", b.key)}>
            <BackSwatch b={b} w={34} />
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
                <div style={{ fontSize: 11, color: "#5E7196", marginTop: 2, textTransform: "capitalize" }}>{t.rarity}</div>
              </div>
              {owned ? <span className="cos-tag eq">Owned</span>
                : <button className="btn btn-sm" disabled={!can} onClick={() => onBuyTitle(t)} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span className="chip-dot" style={{ width: 10, height: 10 }} /><span className="num">{t.cost.toLocaleString()}</span></button>}
            </div>
          );
        })}
        <div style={{ fontSize: 11.5, color: "#5E7196", padding: "4px 2px 0" }}>More titles are earned by playing. See them all on your profile.</div>
      </div>

      <SectionLabel right="Rank frames come from ranked play">Avatars</SectionLabel>
      <div className="avatar-grid" style={{ marginBottom: 24 }}>
        {AVATAR_CATALOG.map((a) => {
          const owned = data.unlocked.includes(a.emoji);
          const canAfford = data.chips >= a.cost;
          return (
            <button key={a.emoji} disabled={owned || !canAfford} onClick={() => onBuyAvatar(a)} className="avatar-tile" style={{ opacity: owned || canAfford ? 1 : 0.4 }}>
              <div style={{ fontSize: 26 }}>{a.emoji}</div>
              <div className="num" style={{ fontSize: 10.5, color: owned ? "#34D399" : "#A9B8D0", marginTop: 4, fontWeight: 600 }}>{owned ? "Owned" : a.cost === 0 ? "Free" : a.cost.toLocaleString()}</div>
            </button>
          );
        })}
      </div>

      <SectionLabel>Free chips</SectionLabel>
      <div className="list">
        {CHIP_PACKS.map((pack) => (
          <div key={pack.label} className="row">
            <div>
              <div className="row-title">{pack.label}</div>
              <div className="row-sub num">{pack.amount.toLocaleString()} chips</div>
            </div>
            <button className="btn btn-sm" onClick={() => onClaimChips(pack.amount)}>Claim</button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* =========================================================================
   LEADERBOARD TAB
   ========================================================================= */
function LeaderboardScreen({ data }) {
  const [tab, setTab] = useState("ranked");
  const placed = isPlaced(data.ranked);
  const month = new Date().toLocaleString("en-US", { month: "long" });
  const myIndex = tournamentIndex((data.skill || {}).tourneys);
  // sample players stand in until online play exists, so the boards have company
  const others = MOCK_PLAYERS.map((m) => ({ name: m.name, isYou: false, title: hashStr(m.name) % 5 < 2 ? TITLES[1 + (hashStr(m.name + "t") % (TITLES.length - 1))].key : null, rating: Math.round(Math.min(1680, m.wins * 9 + m.chips / 80)), index: Math.round(m.wins * 7 + m.chips / 150) }));
  const you = { name: data.name, isYou: true, prestige: data.ranked.prestige || 0, title: (data.titles || defaultTitles()).equipped, rating: placed ? Math.round(data.ranked.rating) : null, index: myIndex };
  const isRanked = tab === "ranked";
  const key = isRanked ? "rating" : "index";
  const pool = [...others, ...(you[key] != null ? [you] : [])].sort((a, b) => b[key] - a[key]);
  const myPos = pool.findIndex((p) => p.isYou);
  const SHOW = 50;
  const visible = pool.slice(0, SHOW);
  const value = (p) => (isRanked ? `${p.rating.toLocaleString()} RP` : `${p.index.toLocaleString()} pts`);
  const medal = ["#F5B83D", "#C9D4E2", "#D9894E"];
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
      <div key={(pinned ? "pin-" : "") + p.name + (p.isYou ? "-you" : "")} ref={p.isYou && !pinned ? meRef : null} className={`lb-row${pinned ? " lb-pinned" : ""}`} style={{ background: p.isYou ? "rgba(52,211,153,0.1)" : "#14223D", borderColor: p.isYou ? "rgba(52,211,153,0.4)" : "rgba(244,247,252,0.06)" }}>
        <div className="num" style={{ width: 26, fontSize: 13.5, fontWeight: 700, color: i < 3 ? medal[i] : "#5E7196" }}>{i + 1}</div>
        {tier && <TierBadge tier={tier} size={26} />}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: p.isYou ? "#34D399" : "#F4F7FC", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.isYou && p.name !== "You" ? `${p.name} (you)` : p.name}{p.prestige ? <PrestigeBadge n={p.prestige} size={15} /> : null}</div>
          {(tier || (p.title && p.title !== "rookie")) && <div style={{ fontSize: 11, display: "flex", gap: 8, alignItems: "baseline", whiteSpace: "nowrap", overflow: "hidden" }}>{tier && <span style={{ color: tier.color }}>{rankName(p.rating)}</span>}{p.title && p.title !== "rookie" && <TitleTag k={p.title} size={10.5} />}</div>}
        </div>
        <div className="num" style={{ fontSize: 13.5, fontWeight: 600, color: "#C8D3E6" }}>{value(p)}</div>
      </div>
    );
  };
  return (
    <div ref={scrollRef} className="screen screen-fade" style={{ paddingBottom: 0, display: "flex", flexDirection: "column" }}>
      <header className="home-head" style={{ marginBottom: 12 }}><div className="wordmark">Leaderboard</div></header>
      <div className="seg" style={{ marginBottom: 10 }}>
        <button onClick={() => setTab("ranked")} className={`segbtn${isRanked ? " on" : ""}`}>Ranked</button>
        <button onClick={() => setTab("index")} className={`segbtn${!isRanked ? " on" : ""}`}>Tournament index</button>
      </div>
      <div style={{ fontSize: 12, color: "#7587A6", margin: "0 2px 12px" }}>
        {isRanked ? `${month} season, ends in ${daysLeftInSeason()} days. Ranked by RP.` : "Best 8 tournament cashes. Results fade over 90 days."}
      </div>
      <div className="list" style={{ gap: 6, flex: 1 }}>
        {visible.map((p, i) => renderRow(p, i))}
        <div style={{ fontSize: 11, color: "#5E7196", textAlign: "center", padding: "8px 0 4px" }}>Other players are samples until online play is added.</div>
      </div>
      {/* your spot stays visible at the bottom, even when you're off the list */}
      <div className="lb-dock">
        {isRanked && !placed ? (
          <div className="lb-row" style={{ background: "#14223D", borderColor: "rgba(244,247,252,0.1)" }}>
            <TierBadge tier={UNRANKED} size={26} />
            <div style={{ flex: 1, fontSize: 13, color: "#A9B8D0" }}>Finish {PLACEMENT_MATCHES - (data.ranked.placementGames || []).length} more placement {PLACEMENT_MATCHES - (data.ranked.placementGames || []).length === 1 ? "match" : "matches"} to get on the board</div>
          </div>
        ) : myPos >= 0 && !meVisible ? renderRow(pool[myPos], myPos, true) : null}
      </div>
    </div>
  );
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
  const color = up ? "#34D399" : "#FF6B6B";
  const pick = (clientX) => { const r = svgRef.current.getBoundingClientRect(); const fx = (clientX - r.left) / r.width; setHover(Math.max(0, Math.min(points.length - 1, Math.round(((fx * W - P) / (W - P * 2)) * (points.length - 1))))); };
  const h = hover != null ? points[hover] : null;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <div className="num" style={{ fontSize: 22, fontWeight: 700 }}>{(h ? h.v : last).toLocaleString()}</div>
        <div className="num" style={{ fontSize: 12.5, fontWeight: 600, color: h ? "#8FA1BE" : color }}>{h ? new Date(h.t).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : `${signed(last - first)} over ${points.length} updates`}</div>
      </div>
      <div style={{ position: "relative" }}>
        <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: "100%", height: 120, display: "block", touchAction: "pan-y" }}
          onMouseMove={(e) => pick(e.clientX)} onMouseLeave={() => setHover(null)} onTouchStart={(e) => pick(e.touches[0].clientX)} onTouchMove={(e) => pick(e.touches[0].clientX)} onTouchEnd={() => setHover(null)} role="img" aria-label={`Chip count went from ${first} to ${last}`}>
          <defs><linearGradient id="bkfill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={color} stopOpacity="0.28" /><stop offset="1" stopColor={color} stopOpacity="0" /></linearGradient></defs>
          {[0.25, 0.5, 0.75].map((f) => <line key={f} x1="0" x2={W} y1={H * f} y2={H * f} stroke="rgba(244,247,252,0.06)" strokeWidth="1" vectorEffect="non-scaling-stroke" />)}
          <path d={area} fill="url(#bkfill)" />
          <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          {h && <line x1={x(hover)} x2={x(hover)} y1="0" y2={H} stroke="rgba(244,247,252,0.35)" strokeWidth="1" vectorEffect="non-scaling-stroke" />}
        </svg>
        {h && <div className="chart-dot" style={{ left: `${(x(hover) / W) * 100}%`, top: y(h.v), background: color }} />}
      </div>
      <div className="num" style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: "#5E7196", marginTop: 4 }}>
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
            <span className="num" style={{ color: "#8FA1BE" }}><b style={{ color: "#F4F7FC" }}>{Math.round(r.pct * 100)}%</b> of {r.hands.toLocaleString()}</span>
          </div>
          <div className="bar" style={{ height: 8 }}><div style={{ width: `${r.pct * 100}%`, background: r === best && r.hands >= 5 ? "#34D399" : "#6FA8FF" }} /></div>
        </div>
      ))}
      <div style={{ fontSize: 11.5, color: "#5E7196" }}>Most players win more from late position. If yours is lower, you might be playing too many hands up front.</div>
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
            <div style={{ fontSize: 11, color: "#5E7196" }}>{new Date(b.at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>
          </div>
          <div style={{ display: "flex", gap: 3 }}>{(b.cards || []).slice(0, 5).map((c) => <MiniCard key={c} code={idToCode(c)} suitColor={suitColor} />)}</div>
        </div>
      ))}
    </div>
  );
}

function ProfileScreen({ data, onUpdateName, onSelectAvatar, onSelectFrame, onAddFriend, onUpdateSettings, onExportData, onImportData, onResetProfile, onEquipTitle }) {
  const importRef = useRef(null);
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
        <button onClick={() => setPickingAvatar(true)} className="profile-av" style={{ boxShadow: frameColor ? `0 0 0 3px #0B1426, 0 0 0 6px ${frameColor}` : "none" }} aria-label="Change avatar">{data.avatar}</button>
        {editingName ? (
          <form onSubmit={(e) => { e.preventDefault(); saveName(); }} style={{ display: "flex", gap: 6, justifyContent: "center", alignItems: "center" }}>
            <input autoFocus value={nameInput} maxLength={16} onChange={(e) => setNameInput(e.target.value)} className="input" style={{ width: 160, textAlign: "center", fontWeight: 600 }} aria-label="Display name" />
            <button type="submit" className="iconbtn" aria-label="Save name"><Icon name="check" size={13} /></button>
          </form>
        ) : (
          <button onClick={() => setEditingName(true)} className="name-btn">{data.name}<PrestigeBadge n={rk.prestige} size={20} /><Icon name="edit" size={12} style={{ color: "#5E7196", marginLeft: 6 }} /></button>
        )}
        <button className="title-btn" onClick={() => setPickingTitle(true)} aria-label="Change title"><TitleTag k={tt.equipped} size={12.5} /><Icon name="chevron" size={11} style={{ color: "#5E7196", transform: "rotate(90deg)" }} /></button>
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 8 }}>
          <span className="chip-pill num"><span className="chip-dot" />{data.chips.toLocaleString()}</span>
          <span className="chip-pill" style={{ color: tier.color }}><TierBadge tier={tier} size={14} />{placed ? rankName(rk.rating) : "Unranked"}</span>
          {skillNow && data.skill.hands >= 10 && <span className="chip-pill num">SR {skillNow.sr}</span>}
        </div>
      </div>

      <SectionLabel right={placed && rk.peakRating > rk.rating ? `Peak ${rankName(rk.peakRating)}` : null}>Ranked</SectionLabel>
      <section className="panel" style={{ marginBottom: 26 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <TierBadge tier={tier} size={40} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: tier.color }}>{placed ? rankName(rk.rating) : "Unranked"}</div>
            <div className="num" style={{ fontSize: 12, color: "#7587A6", marginTop: 1 }}>{placed ? `${Math.round(rk.rating).toLocaleString()} RP${prog.nextLabel ? `, ${prog.toNext} to ${prog.nextLabel}` : ""}` : `${(rk.placementGames || []).length} of ${PLACEMENT_MATCHES} placements played`}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="num" style={{ fontSize: 14, fontWeight: 600 }}>{rk.wins}W {rk.losses}L</div>
            <div className="num" style={{ fontSize: 11, color: "#7587A6" }}>{rk.wins + rk.losses > 0 ? `${Math.round((rk.wins / (rk.wins + rk.losses)) * 100)}% won` : "No matches yet"}</div>
          </div>
        </div>
        {placed ? <div className="bar" style={{ marginTop: 14 }}><div style={{ width: `${prog.pct * 100}%`, background: tier.color }} /></div> : <div style={{ marginTop: 14 }}><PlacementDots games={rk.placementGames || []} /></div>}

        {(rk.recent || []).length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 11.5, color: "#7587A6", marginBottom: 7 }}>{rk.recent.length === 1 ? "Last match" : `Last ${rk.recent.length} matches, newest first`}</div>
            <div style={{ display: "flex", gap: 4 }}>
              {rk.recent.map((m, i) => (
                <div key={i} title={`${m.won ? "Win" : "Loss"}${m.placement ? ", placement" : `, ${signed(m.delta)} RP`}`} className="num" style={{ flex: 1, maxWidth: 34, textAlign: "center", fontSize: 10, fontWeight: 700, padding: "5px 0", borderRadius: 6, color: m.won ? "#0B1426" : "#FF6B6B", background: m.won ? "#34D399" : "rgba(255,107,107,0.16)" }}>{m.placement ? (m.won ? "W" : "L") : signed(m.delta)}</div>
              ))}
            </div>
          </div>
        )}

        {rk.history.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 11.5, color: "#7587A6", marginBottom: 7 }}>Past seasons</div>
            <div style={{ display: "flex", gap: 12, overflowX: "auto" }}>
              {rk.history.slice().reverse().map((h) => {
                const label = new Date(`${h.seasonId}-15`).toLocaleString("en-US", { month: "short", year: "numeric" });
                return (
                  <div key={h.seasonId} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flexShrink: 0 }}>
                    <TierBadge tier={tierForRating(h.rating)} size={26} />
                    <div style={{ fontSize: 10, color: "#7587A6" }}>{label}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid rgba(244,247,252,0.06)" }}>
          <div style={{ fontSize: 11.5, color: "#7587A6", marginBottom: 9 }}>Avatar frame{rk.frames.length === 0 ? ". Reach Silver to unlock your first." : ""}</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {RANK_TIERS.filter((t) => t.min > 0).map((t) => {
              const owned = rk.frames.includes(t.key);
              const on = rk.frame === t.key;
              return (
                <button key={t.key} disabled={!owned} onClick={() => onSelectFrame(on ? null : t.key)} className="frame-swatch" aria-pressed={on} title={owned ? `${t.label} frame` : `Reach ${t.label} to unlock`}
                  style={{ borderColor: owned ? t.color : "rgba(244,247,252,0.12)", background: on ? `${t.color}33` : "transparent", opacity: owned ? 1 : 0.45 }}>
                  {owned ? <span style={{ width: 8, height: 8, borderRadius: "50%", background: t.color, display: "block" }} /> : <Icon name="lock" size={11} style={{ color: "#5E7196" }} />}
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
              <div className="ach-mark" style={{ background: done ? "#34D399" : "transparent", borderColor: done ? "#34D399" : "rgba(244,247,252,0.18)", color: "#0B1426" }}>{done && <Icon name="check" size={12} stroke={2.6} />}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: done ? "#F4F7FC" : "#A9B8D0" }}>{a.label}</div>
                <div style={{ fontSize: 11.5, color: "#7587A6" }}>{a.desc}</div>
              </div>
              {!done && <div className="num" style={{ fontSize: 11.5, color: "#5E7196" }}>{cur.toLocaleString()}/{a.target.toLocaleString()}</div>}
            </div>
          );
        })}
      </div>

      <SectionLabel>Friends</SectionLabel>
      <form onSubmit={(e) => { e.preventDefault(); if (friendInput.trim()) { onAddFriend(friendInput.trim()); setFriendInput(""); } }} style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <input value={friendInput} onChange={(e) => setFriendInput(e.target.value)} placeholder="Add a friend by name" className="input" style={{ flex: 1 }} aria-label="Friend name" />
        <button type="submit" className="btn btn-sm">Add</button>
      </form>
      <div className="list" style={{ gap: 6 }}>
        {data.friends.length === 0 && <div className="empty">No friends added yet.</div>}
        {data.friends.map((f, i) => (
          <div key={i} className="lb-row" style={{ background: "#14223D", borderColor: "rgba(244,247,252,0.06)" }}>
            <div className="bot-av" style={{ position: "static", width: 28, height: 28, background: AVATAR_COLORS[i % AVATAR_COLORS.length], fontSize: 12 }}>{f[0].toUpperCase()}</div>
            <div style={{ fontSize: 13.5, fontWeight: 600 }}>{f}</div>
          </div>
        ))}
      </div>

      {transfer && (
        <Modal title="Move my profile" onClose={() => setTransfer(false)} width={400}>
          <div style={{ fontSize: 12.5, color: "#8FA1BE", marginBottom: 8 }}>1. On the old copy, copy this code.</div>
          <textarea ref={codeRef} readOnly value={profileCode} className="input code-box" onFocus={(e) => e.target.select()} aria-label="Your profile code" />
          <button className="btn btn-sm" style={{ marginTop: 8, width: "100%" }} onClick={copyCode}>{copied ? "Copied" : "Copy code"}</button>
          <div style={{ fontSize: 12.5, color: "#8FA1BE", margin: "18px 0 8px" }}>2. On the new copy, paste it here.</div>
          <textarea value={pasted} onChange={(e) => setPasted(e.target.value)} className="input code-box" placeholder="Paste your code" aria-label="Paste a profile code" />
          <button className="btn btn-raise btn-sm" style={{ marginTop: 8, width: "100%" }} disabled={!pasted.trim()} onClick={() => { onImportData(pasted); setTransfer(false); }}>Import</button>
          <div style={{ fontSize: 11.5, color: "#5E7196", marginTop: 10 }}>Importing replaces the profile on this copy.</div>
        </Modal>
      )}
      {pickingTitle && (
        <Modal title="Titles" onClose={() => setPickingTitle(false)} width={400}>
          <div style={{ fontSize: 12, color: "#7587A6", margin: "-6px 2px 10px" }}>{tt.owned.length} of {TITLES.length} unlocked. Earn them by playing or buy some in the shop.</div>
          <div style={{ maxHeight: "60vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
            {TITLES.slice().sort((a, b) => (tt.owned.includes(b.key) ? 1 : 0) - (tt.owned.includes(a.key) ? 1 : 0)).map((t) => {
              const owned = tt.owned.includes(t.key); const on = tt.equipped === t.key;
              return (
                <button key={t.key} className={`title-row${on ? " on" : ""}`} disabled={!owned} onClick={() => { onEquipTitle(t.key); setPickingTitle(false); }} style={{ opacity: owned ? 1 : 0.55, cursor: owned ? "pointer" : "default", textAlign: "left" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <TitleTag k={t.key} size={14} />
                    <div style={{ fontSize: 11, color: "#7587A6", marginTop: 2 }}>{t.how || (t.cost ? `Shop, ${t.cost.toLocaleString()} chips` : "")}</div>
                  </div>
                  {on ? <span className="cos-tag eq">Equipped</span> : owned ? <span className="cos-tag">Equip</span> : <Icon name="lock" size={13} style={{ color: "#5E7196" }} />}
                </button>
              );
            })}
          </div>
        </Modal>
      )}
      {pickingAvatar && (
        <Modal title="Choose avatar" onClose={() => setPickingAvatar(false)}>
          <div className="avatar-grid">
            {data.unlocked.map((emoji) => (
              <button key={emoji} onClick={() => { onSelectAvatar(emoji); setPickingAvatar(false); }} className="avatar-tile" style={{ borderColor: emoji === data.avatar ? "#34D399" : undefined }} aria-pressed={emoji === data.avatar}>
                <div style={{ fontSize: 26 }}>{emoji}</div>
              </button>
            ))}
          </div>
          <div style={{ fontSize: 12, color: "#7587A6", marginTop: 12, textAlign: "center" }}>Buy more in the shop.</div>
        </Modal>
      )}

      {showSettings && (
        <Modal title="Settings" onClose={() => { setShowSettings(false); setConfirmReset(false); }}>
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
              <Icon name="download" size={15} style={{ color: "#8FA1BE" }} />
            </button>
            <button className="row" onClick={() => { setTransfer(true); setShowSettings(false); setCopied(false); setPasted(""); }}>
              <div style={{ textAlign: "left" }}><div className="row-title">Move my profile</div><div className="row-sub">Copy a code here, paste it into another copy of felt</div></div>
              <Icon name="share" size={15} style={{ color: "#8FA1BE" }} />
            </button>
            <button className="row" onClick={() => importRef.current && importRef.current.click()}>
              <div style={{ textAlign: "left" }}><div className="row-title">Import from a file</div><div className="row-sub">Use a file you exported before</div></div>
              <Icon name="download" size={15} style={{ color: "#8FA1BE", transform: "rotate(180deg)" }} />
            </button>
            <input ref={importRef} type="file" accept="application/json,.json" style={{ display: "none" }} onChange={(e) => { onImportData(e.target.files && e.target.files[0]); e.target.value = ""; }} />
            <button className="row" style={{ borderColor: confirmReset ? "rgba(255,107,107,0.5)" : undefined }} onClick={() => { if (confirmReset) { onResetProfile(); setShowSettings(false); setConfirmReset(false); } else setConfirmReset(true); }}>
              <div style={{ textAlign: "left" }}><div className="row-title" style={{ color: "#FF6B6B" }}>{confirmReset ? "Tap again to reset" : "Reset profile"}</div><div className="row-sub">{confirmReset ? "This can't be undone" : "Wipes chips, stats, rank, and settings"}</div></div>
              <Icon name="reset" size={15} style={{ color: "#FF6B6B" }} />
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
        <div style={{ fontSize: 11.5, color: "#7587A6" }}>{sub}</div>
      </div>
      {children}
    </div>
  );
}
function Toggle({ on, onClick, label }) {
  return (
    <button onClick={onClick} role="switch" aria-checked={on} aria-label={label} style={{ width: 44, height: 26, borderRadius: 14, border: "none", background: on ? "#34D399" : "rgba(244,247,252,0.14)", position: "relative", cursor: "pointer", transition: "background .2s ease", flexShrink: 0 }}>
      <div style={{ position: "absolute", top: 3, left: on ? 21 : 3, width: 20, height: 20, borderRadius: "50%", background: "#F4F7FC", transition: "left .2s ease" }} />
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
      <div style={{ fontSize: 11.5, color: "#7587A6", marginTop: 2 }}>{label}</div>
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
        {["s", "h", "d", "c"].map((s, i) => <span key={s} style={{ color: s === "h" || s === "d" ? "#FF6B6B" : "#F4F7FC", animationDelay: `${0.25 + i * 0.22}s` }}>{SUIT_GLYPH[s]}</span>)}
      </div>
      <div className="loading-bar"><div /></div>
    </div>
  );
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
  const toastTimer = useRef(null);
  const sound = useSound(soundOn);

  useEffect(() => {
    const minTimer = new Promise((res) => setTimeout(res, LOADING_MS));
    (async () => {
      const [d] = await Promise.all([loadData(), minTimer]);
      if (d) {
        const merged = { ...defaultData(), ...d, stats: { ...defaultData().stats, ...(d.stats || {}) }, settings: { ...defaultData().settings, ...(d.settings || {}) }, skill: d.skill && d.skill.v === 2 ? { ...defaultSkill(), ...d.skill } : { ...defaultSkill(), ...(d.skill || {}), v: 2, idealSum: ((d.skill && d.skill.hands) || 0) * 0.34, report: undefined, reportSource: undefined } };
        merged.ranked = rolloverSeason(migrateRanked(d.ranked));
        merged.stats = { ...merged.stats, pos: { late: [0, 0], early: [0, 0], blinds: [0, 0], ...(merged.stats.pos || {}) } };
        merged.cosmetics = { ...defaultCosmetics(), ...(d.cosmetics || {}) };
        merged.streak = d.streak || { count: 0, last: null };
        merged.challenges = ensureChallenges(d.challenges);
        merged.pass = ensurePass(d.pass);
        merged.history = { bankroll: [], best: [], ...(d.history || {}) };
        merged.titles = { ...defaultTitles(), ...(d.titles || {}) };
        { const earned = newlyEarnedTitles(merged); if (earned.length) merged.titles = { ...merged.titles, owned: [...merged.titles.owned, ...earned.map((t) => t.key)] }; }
        if (merged.history.bankroll.length === 0) merged.history = { ...merged.history, bankroll: [{ t: Date.now(), v: merged.chips }] };
        setData(merged);
        saveData(merged);
      }
      setLoaded(true);
      setTimeout(() => setBootDone(true), 600);
    })();
  }, []);
  const persist = (next) => { setData(next); saveData(next); };
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
    persist({ ...data, chips: data.chips + PRESTIGE_REWARD, ranked: { ...r, rating: 0, prestige: n, streak: 0, recent: [] } });
    showToast({ title: `Prestige ${n}`, label: `Back to Bronze. +${PRESTIGE_REWARD.toLocaleString()} chips` }, 3200);
  };
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
  const handleEquipCosmetic = (type, key) => {
    const cos = data.cosmetics || defaultCosmetics();
    if (!cos[type === "back" ? "backs" : "felts"].includes(key)) return;
    sound.tap();
    persist({ ...data, cosmetics: { ...cos, [type === "back" ? "cardBack" : "felt"]: key } });
  };
  const handleBuyAvatar = (avatarObj) => {
    if (data.unlocked.includes(avatarObj.emoji) || data.chips < avatarObj.cost) return;
    sound.coin();
    persist({ ...data, chips: data.chips - avatarObj.cost, unlocked: [...data.unlocked, avatarObj.emoji] });
  };
  const handleSelectAvatar = (emoji) => { sound.tap(); persist({ ...data, avatar: emoji }); };
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
          ranked = { ...ranked, rating: o.after, peakRating: Math.max(r.peakRating || 0, o.after), frames, frame: o.newFrames.length > 0 ? o.newFrames[o.newFrames.length - 1] : r.frame, recent: [{ won: o.won, delta: o.delta }, ...(r.recent || [])].slice(0, 10) };
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
        merged.skill = d.skill && d.skill.v === 2 ? { ...defaultSkill(), ...d.skill } : defaultSkill();
        sound.coin(); persist(merged);
        showToast({ title: "Profile imported", label: `${merged.name}, ${merged.chips.toLocaleString()} chips` });
      } catch (e) { showToast({ title: "Couldn't import", label: "That isn't a felt profile code." }); }
    });
  };

  if (inTable) {
    const isPractice = session?.mode === "practice";
    const isTournament = session?.mode === "tournament";
    const isRanked = session?.mode === "ranked";
    const frameColor = data.ranked.frame ? RANK_TIERS.find((t) => t.key === data.ranked.frame)?.color : null;
    const placed = isPlaced(data.ranked);
    const isVip = !!session?.vip;
    const botSkill = isRanked ? tierOf(data.ranked).botSkill : isPractice ? 0.2 : isVip ? 0.72 : 0.4;
    const opponentRating = isRanked ? (placed ? data.ranked.rating : 650) : null;
    return (
      <div className="app-table">
        <style>{GLOBAL_STYLE}</style>
        <PokerTable
          key={tableKey}
          startStack={isPractice ? 2000 : isTournament ? TOURNEY_STACK : isRanked ? (session?.buyIn ?? RANKED_BUYIN) : (session?.startChips ?? data.chips)}
          name={data.name} avatar={data.avatar} soundOn={soundOn} setSoundOn={setSoundOn}
          onExit={handleExitTable} onHandResolved={handleHandResolved}
          stakes={session?.stakes} tableSize={session?.tableSize} tournament={isTournament} ranked={isRanked}
          rankedState={data.ranked} skill={data.skill} tourneyBuyIn={session?.buyIn || 0} bankroll={data.chips} botSkill={botSkill} opponentRating={opponentRating} frameColor={frameColor} tutorial={isPractice}
          variant={session?.variant || "holdem"} turbo={!!session?.turbo} runTwice={!!data.settings.runTwice} squeeze={data.settings.squeeze !== false} cardBack={isVip ? VIP_BACK : findBack((data.cosmetics || {}).cardBack)} felt={isVip ? VIP_FELT : findFelt((data.cosmetics || {}).felt)} title={(data.titles || defaultTitles()).equipped} vip={isVip} prestige={data.ranked.prestige || 0}
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
          {tab === "shop" && <ShopScreen data={data} onClaimChips={handleClaimChips} onBuyAvatar={handleBuyAvatar} onClaimDaily={handleClaimDaily} onBuyCosmetic={handleBuyCosmetic} onEquipCosmetic={handleEquipCosmetic} onBuyTitle={handleBuyTitle} />}
          {tab === "home" && <HomeMenu onPlayAI={handlePlayAI} data={data} chips={data.chips} ranked={data.ranked} onClaimDaily={handleClaimDaily} onClaimChallenge={handleClaimChallenge} onSpin={handleSpin} onPrestige={handlePrestige} sound={sound} goShop={() => setTab("shop")} />}
          {tab === "leaderboard" && <LeaderboardScreen data={data} />}
          {tab === "coach" && <CoachScreen data={data} />}
          {tab === "profile" && <ProfileScreen data={data} onUpdateName={handleUpdateName} onSelectAvatar={handleSelectAvatar} onSelectFrame={handleSelectFrame} onAddFriend={handleAddFriend} onUpdateSettings={handleUpdateSettings} onExportData={handleExportData} onImportData={handleImportData} onResetProfile={handleResetProfile} onEquipTitle={handleEquipTitle} />}
        </div>
      </main>
      <BottomNav tab={tab} setTab={(t) => { sound.tap(); setTab(t); }} />
      {toast && (
        <div className="toast" role="status">
          <div style={{ fontSize: 12, fontWeight: 700, color: "#F5B83D" }}>{toast.title}</div>
          <div style={{ fontSize: 12.5, color: "#C8D3E6" }}>{toast.label}</div>
        </div>
      )}
    </div>
  );
}

function BottomNav({ tab, setTab }) {
  const side = (it) => {
    const active = tab === it.key;
    return (
      <button key={it.key} onClick={() => setTab(it.key)} className="navbtn" aria-current={active ? "page" : undefined} style={{ color: active ? "#F4F7FC" : "#566A90" }}>
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
* { box-sizing: border-box; }
body { margin: 0; background: #0B1426; }
button { font-family: inherit; color: inherit; }
:focus-visible { outline: 2px solid #34D399; outline-offset: 2px; }
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

.app { font-family: 'Inter', -apple-system, sans-serif; background: radial-gradient(130% 70% at 50% -15%, #1E427E 0%, #0B1426 62%); height: 100vh; height: 100dvh; color: #F4F7FC; display: flex; flex-direction: column; align-items: center; overflow: hidden; }
.app-table { height: 100vh; height: 100dvh; background: radial-gradient(130% 70% at 50% -15%, #1E427E 0%, #0B1426 62%); }
.app-main { flex: 1; width: 100%; display: flex; justify-content: center; overflow: hidden; padding-top: 16px; }
.screen { width: 100%; max-width: 460px; height: 100%; overflow-y: auto; padding: 0 16px 40px; }
.screen-fade { animation: screenIn 0.2s ease; }
.home-head { display: flex; justify-content: space-between; align-items: center; margin: 2px 2px 18px; }
.wordmark { font-family: 'Fraunces', Georgia, serif; font-size: 30px; font-weight: 700; letter-spacing: -0.02em; }
.wordmark-sm { font-family: 'Fraunces', Georgia, serif; font-size: 18px; font-weight: 700; letter-spacing: -0.01em; line-height: 1.1; }
.num { font-variant-numeric: tabular-nums; }
.chip-pill { display: inline-flex; align-items: center; gap: 6px; background: rgba(244,247,252,0.06); border: 1px solid rgba(244,247,252,0.1); border-radius: 20px; padding: 5px 11px; font-size: 13px; font-weight: 600; }
.chip-dot { width: 12px; height: 12px; border-radius: 50%; background: #F5B83D; box-shadow: inset 0 0 0 2.5px #0B1426, inset 0 0 0 4px #F5B83D; display: inline-block; }
.panel { background: #14223D; border: 1px solid rgba(244,247,252,0.08); border-radius: 20px; padding: 16px 18px 18px; }
.list { display: flex; flex-direction: column; gap: 8px; }
.row { display: flex; align-items: center; justify-content: space-between; gap: 12px; width: 100%; background: #14223D; border: 1px solid rgba(244,247,252,0.07); border-radius: 16px; padding: 14px 16px; cursor: pointer; text-align: left; transition: border-color .15s ease, background .15s ease; }
div.row { cursor: default; }
button.row:hover:not(:disabled) { border-color: rgba(244,247,252,0.18); }
button.row:active:not(:disabled) { background: #1A2B4B; }
.row:disabled { opacity: 0.45; cursor: default; }
.row-title { font-size: 14.5px; font-weight: 600; }
.row-sub { font-size: 12px; color: #7587A6; margin-top: 2px; }
.bar { height: 7px; border-radius: 4px; background: rgba(244,247,252,0.1); overflow: hidden; }
.bar > div { height: 100%; border-radius: 4px; transition: width .35s ease, background .35s ease; }
.stat { background: #14223D; border: 1px solid rgba(244,247,252,0.07); border-radius: 14px; padding: 12px 14px; }
.comp-row { background: #14223D; border: 1px solid rgba(244,247,252,0.06); border-radius: 14px; padding: 12px 14px; }
.segbtn:disabled { cursor: not-allowed; }
.spark { display: flex; align-items: flex-end; gap: 3px; height: 42px; margin-top: 12px; }
.spark > div { flex: 1; border-radius: 2px; min-width: 4px; }
.report { margin-top: 16px; background: #14223D; border: 1px solid rgba(244,247,252,0.08); border-radius: 16px; padding: 14px 16px; }
.report p { font-size: 13.5px; line-height: 1.55; color: #C8D3E6; margin: 6px 0 0; }
.report-head { display: flex; justify-content: space-between; font-size: 12px; font-weight: 600; color: #A9B8D0; }
.ach-row { display: flex; align-items: center; gap: 12px; padding: 10px 14px; background: #14223D; border: 1px solid rgba(244,247,252,0.06); border-radius: 12px; }
.ach-mark { width: 20px; height: 20px; border-radius: 50%; border: 1.5px solid; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.lb-dock { position: sticky; bottom: 0; padding: 10px 0 34px; background: linear-gradient(180deg, rgba(11,20,38,0) 0%, #0B1426 30%); }
.lb-pinned { box-shadow: 0 -6px 18px rgba(0,0,0,0.35); }
.lb-row { display: flex; align-items: center; gap: 10px; border-radius: 12px; padding: 10px 14px; border: 1px solid transparent; }
.empty { font-size: 12.5px; color: #5E7196; padding: 8px 2px; }
.input { background: #14223D; border: 1px solid rgba(244,247,252,0.1); border-radius: 12px; padding: 10px 12px; color: #F4F7FC; font-size: 14px; font-family: inherit; }
.input:focus { outline: none; border-color: rgba(52,211,153,0.6); }
.profile-av { background: #25395F; border: none; width: 76px; height: 76px; border-radius: 50%; font-size: 34px; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px; cursor: pointer; }
.name-btn { background: none; border: none; font-size: 19px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; padding: 2px 4px; }
.frame-swatch { display: inline-flex; align-items: center; gap: 6px; border: 1.5px solid; border-radius: 20px; padding: 5px 11px 5px 9px; font-size: 12px; font-weight: 600; cursor: pointer; background: transparent; }
.frame-swatch:disabled { cursor: default; }
.avatar-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.avatar-tile { display: flex; flex-direction: column; align-items: center; justify-content: center; background: #14223D; border: 1px solid rgba(244,247,252,0.07); border-radius: 14px; padding: 12px 4px 10px; cursor: pointer; }
.avatar-tile:disabled { cursor: default; }
.seg { display: flex; gap: 3px; background: rgba(244,247,252,0.06); border-radius: 12px; padding: 3px; }
.segbtn { flex: 1; border: none; border-radius: 9px; padding: 8px 6px; font-size: 12px; font-weight: 600; cursor: pointer; background: transparent; color: #A9B8D0; transition: background .15s ease, color .15s ease; white-space: nowrap; }
.segbtn.on { background: #F4F7FC; color: #0B1426; }
.kv-list { margin: 14px 0 4px; border-top: 1px solid rgba(244,247,252,0.06); }
.kv { display: flex; justify-content: space-between; align-items: baseline; font-size: 13px; padding: 9px 2px; border-bottom: 1px solid rgba(244,247,252,0.06); color: #8FA1BE; }
.kv b { color: #F4F7FC; font-weight: 600; }
.scrim { position: fixed; top: 0; right: 0; bottom: 0; left: 0; background: rgba(3,8,20,0.74); display: flex; align-items: center; justify-content: center; padding: 16px; z-index: 30; animation: screenIn .15s ease; }
.sheet { background: #14223D; border: 1px solid rgba(244,247,252,0.1); border-radius: 20px; padding: 18px; width: 100%; max-height: 86vh; overflow-y: auto; animation: sheetIn .22s cubic-bezier(.2,.9,.3,1); box-shadow: 0 24px 60px rgba(0,0,0,0.5); }
.sheet-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
.sheet-title { font-family: 'Fraunces', Georgia, serif; font-size: 19px; font-weight: 700; }
.sheet-body { font-size: 13px; line-height: 1.5; color: #8FA1BE; margin: 12px 2px 16px; }
.toast { position: fixed; top: 18px; left: 50%; transform: translateX(-50%); z-index: 40; background: #14223D; border: 1px solid rgba(245,184,61,0.45); border-radius: 14px; padding: 10px 16px; animation: sheetIn .25s ease; box-shadow: 0 10px 30px rgba(0,0,0,0.45); min-width: 200px; text-align: center; }
.bottom-nav { width: 100%; max-width: 460px; display: flex; justify-content: space-around; align-items: center; padding: 6px 6px calc(8px + env(safe-area-inset-bottom)); border-top: 1px solid rgba(244,247,252,0.08); flex-shrink: 0; background: rgba(11,20,38,0.88); }
.navbtn { background: none; border: none; display: flex; flex-direction: column; align-items: center; cursor: pointer; padding: 6px 8px; transition: color .15s ease; flex: 1; }
.play-fab { background: none; border: none; display: flex; flex-direction: column; align-items: center; cursor: pointer; padding: 2px 4px 0; flex: 1; color: #F4F7FC; }
.play-fab-disc { width: 46px; height: 46px; margin-top: 0; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #0B1426; background: radial-gradient(circle at 35% 30%, #FFE08A, #F5B83D 70%); box-shadow: 0 0 12px rgba(245,184,61,0.35); transition: transform .18s ease; }
.play-fab:active .play-fab-disc { transform: scale(0.93); }
.play-fab:not(.on) .play-fab-disc { filter: saturate(0.85) brightness(0.92); }

.loading { position: fixed; top: 0; right: 0; bottom: 0; left: 0; background: radial-gradient(130% 70% at 50% -15%, #1E427E 0%, #0B1426 62%); display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 50; transition: opacity .6s ease; color: #F4F7FC; }
.loading-word { font-family: 'Fraunces', Georgia, serif; font-size: 48px; font-weight: 700; letter-spacing: -0.03em; animation: suitIn .8s ease both; }
.loading-suits { display: flex; gap: 14px; margin-top: 10px; font-size: 20px; }
.loading-suits span { animation: suitIn .5s ease both; }
.loading-bar { width: 120px; height: 3px; background: rgba(244,247,252,0.1); border-radius: 2px; margin-top: 28px; overflow: hidden; }
.loading-bar div { height: 100%; background: #F5B83D; transform-origin: left; animation: loadFill ${LOADING_MS / 1000}s cubic-bezier(.4,0,.2,1) both; }
.spinner { width: 34px; height: 34px; border-radius: 50%; border: 3px solid rgba(244,247,252,0.12); border-top-color: #F5B83D; animation: spin .8s linear infinite; }

.table-wrap { font-family: 'Inter', -apple-system, sans-serif; height: 100%; color: #F4F7FC; display: flex; flex-direction: column; align-items: center; padding: 12px 14px; overflow: hidden; position: relative; }
.table-top { width: 100%; max-width: 460px; display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-shrink: 0; }
.table-top > div:first-of-type { flex: 1; }
.table-sub { font-size: 10.5px; color: #7587A6; margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.status { width: 100%; max-width: 460px; text-align: center; font-size: 12.5px; color: #A9B8D0; font-weight: 500; min-height: 18px; margin: 8px 0 2px; flex-shrink: 0; animation: fadeSlide 0.25s ease; }
.seats { width: 100%; max-width: 460px; display: flex; justify-content: space-around; flex-wrap: wrap; row-gap: 6px; flex-shrink: 0; margin-top: 4px; }
.bot-av { position: absolute; top: 3px; left: 3px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: 'Fraunces', Georgia, serif; font-weight: 700; color: #FFFFFF; }
.backs { display: flex; align-items: center; }
.backs .card.mini { width: 20px; height: 29px; border-radius: 4px; transform: rotate(var(--r, 0deg)); }
.backs.folded { animation: foldAway .35s ease forwards; }
.felt-center { width: 100%; max-width: 460px; flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 10px; }
.felt-oval { position: relative; width: 100%; max-width: 420px; padding: 22px 16px 16px; display: flex; flex-direction: column; align-items: center; gap: 10px; border-radius: 999px; background-color: var(--felt2, #138048); background-image: repeating-radial-gradient(circle at 30% 40%, rgba(255,255,255,0.022) 0 1px, transparent 1px 3px), radial-gradient(ellipse at 50% 40%, var(--felt1, #22A866) 0%, var(--felt2, #138048) 52%, var(--felt3, #0B5C33) 100%); border: 7px solid var(--rail, #5A3A20); box-shadow: inset 0 0 0 2px rgba(0,0,0,0.25), inset 0 10px 30px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.06), 0 14px 34px rgba(0,0,0,0.45), 0 0 60px rgba(34,168,102,0.12); }
.card-slot { width: clamp(30px,8.5vw,40px); height: clamp(43px,12vw,57px); border-radius: 7px; border: 1.5px dashed rgba(255,255,255,0.22); }
.pot-num { font-size: 15px; color: #FFFFFF; font-weight: 700; font-family: 'Inter', sans-serif; background: rgba(0,0,0,0.28); padding: 3px 12px; border-radius: 20px; }
.pot-num.pulse { animation: potBump 0.32s ease; }
.banner { animation: sheetIn 0.28s ease; border: 1px solid; border-radius: 14px; padding: 10px 14px; width: 100%; max-width: 380px; }
.hand-strip { position: relative; overflow: hidden; display: flex; align-items: center; justify-content: space-between; background: rgba(244,247,252,0.04); border: 1px solid; border-radius: 12px; padding: 9px 14px; height: 38px; }
.tip { width: 100%; max-width: 460px; margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between; gap: 10px; border: 1px solid; border-radius: 12px; padding: 8px 12px; font-size: 11.5px; line-height: 1.4; }
.tip .iconbtn { flex-shrink: 0; color: inherit; }
.hero-seat { width: 100%; max-width: 460px; flex-shrink: 0; background: #14223D; border: 1px solid; transition: border-color .4s ease, box-shadow .4s ease; border-radius: 20px; padding: 12px 14px; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.controls { width: 100%; max-width: 460px; display: flex; flex-direction: column; align-items: center; gap: 8px; flex-shrink: 0; padding-top: 10px; padding-bottom: env(safe-area-inset-bottom); }
.slider-row { display: flex; align-items: center; gap: 10px; background: rgba(244,247,252,0.06); padding: 8px 8px 8px 14px; border-radius: 14px; width: 100%; }
.rank-row { display: flex; align-items: center; gap: 12px; padding: 10px 4px; border-bottom: 1px solid rgba(244,247,252,0.06); }
.rank-row:last-child { border-bottom: none; }
.rank-num { width: 18px; font-size: 12px; font-weight: 600; color: #5E7196; text-align: right; flex-shrink: 0; }
.mcard { width: 21px; height: 30px; border-radius: 4px; background: #FFFFFF; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 9.5px; font-weight: 700; line-height: 1.05; box-shadow: 0 1px 2px rgba(0,0,0,0.3); }
.mm { position: fixed; top: 0; right: 0; bottom: 0; left: 0; z-index: 36; background: radial-gradient(130% 70% at 50% -15%, #1E427E 0%, #0B1426 62%); display: flex; align-items: center; justify-content: center; transition: opacity .4s ease; }
.mm-inner { display: flex; flex-direction: column; align-items: center; gap: 12px; animation: sheetIn .3s ease; }
.mm-title { font-family: 'Fraunces', Georgia, serif; font-size: 26px; font-weight: 700; }
.mm-sub { font-size: 13.5px; color: #8FA1BE; }

.results { position: fixed; top: 0; right: 0; bottom: 0; left: 0; z-index: 35; background: radial-gradient(130% 70% at 50% -15%, #1E427E 0%, #0B1426 62%); display: flex; align-items: center; justify-content: center; padding: 20px 16px; overflow-y: auto; animation: resultsIn .35s ease; }
.results-inner { width: 100%; max-width: 380px; display: flex; flex-direction: column; margin: auto 0; }
.results-inner > * { animation: riseIn .5s cubic-bezier(.2,.9,.3,1) both; }
.results-inner > *:nth-child(2) { animation-delay: .05s; } .results-inner > *:nth-child(3) { animation-delay: .1s; }
.results-inner > *:nth-child(4) { animation-delay: .18s; } .results-inner > *:nth-child(5) { animation-delay: .26s; }
.results-inner > *:nth-child(n+6) { animation-delay: .34s; }
.badge-pop { animation: badgePop .7s cubic-bezier(.2,.9,.3,1.2) .2s both; filter: drop-shadow(0 10px 30px rgba(0,0,0,0.5)); }
.results-kicker { font-size: 12.5px; color: #7587A6; text-align: center; }
.results-head { font-family: 'Fraunces', Georgia, serif; font-size: 52px; font-weight: 700; letter-spacing: -0.03em; line-height: 1; text-align: center; margin: 8px 0 8px; }
.results-sub { font-size: 14px; color: #8FA1BE; text-align: center; }
.results-delta { font-family: 'Fraunces', Georgia, serif; font-size: 42px; font-weight: 700; text-align: center; margin: 22px 0 18px; letter-spacing: -0.02em; }
.results-delta span { font-family: 'Inter', sans-serif; font-size: 15px; font-weight: 600; margin-left: 6px; opacity: .8; letter-spacing: 0; }
.results-tier { display: flex; align-items: center; gap: 14px; background: #14223D; border: 1px solid rgba(244,247,252,0.08); border-radius: 16px; padding: 14px 16px; }
.results-note { margin-top: 10px; border: 1px solid; border-radius: 12px; padding: 10px 14px; font-size: 13px; text-align: center; }
.results-lines { margin-top: 16px; }
.results-lines > div { display: flex; justify-content: space-between; font-size: 13px; color: #A9B8D0; padding: 7px 2px; border-bottom: 1px solid rgba(244,247,252,0.06); }
.results-lines b { font-weight: 600; }
.results-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 16px; }
.results-stats > div { background: #14223D; border-radius: 12px; padding: 10px 8px; text-align: center; }
.results-stats b { display: block; font-size: 16px; font-weight: 600; }
.results-stats span { font-size: 11px; color: #7587A6; }
.linkbtn { background: none; border: none; color: #7587A6; font-size: 12.5px; margin-top: 14px; cursor: pointer; text-decoration: underline; text-underline-offset: 3px; align-self: center; padding: 4px; }

.card { position: relative; width: clamp(30px,8.5vw,40px); height: clamp(43px,12vw,57px); border-radius: 7px; background: #FFFFFF; display:flex; flex-direction:column; align-items:center; justify-content:center; font-weight:800; font-size:clamp(11px,3.2vw,14px); box-shadow: 0 1px 0 rgba(255,255,255,0.7) inset, 0 2px 3px rgba(0,0,0,0.2), 0 8px 14px rgba(0,0,0,0.28); transition: opacity .35s ease, filter .35s ease; will-change: transform, opacity; backface-visibility: hidden; }
.card.dim { opacity: 0.3; filter: grayscale(0.7); }
.card.mucked { opacity: 0.4; filter: grayscale(0.5); }
.card.win { box-shadow: 0 1px 0 rgba(255,255,255,0.6) inset, 0 0 0 2px #F5B83D, 0 0 16px rgba(245,184,61,0.6); }
.card.back { background-color: var(--back-a, #2F6FDE); background-image: repeating-linear-gradient(45deg, rgba(255,255,255,0.14) 0 3px, transparent 3px 7px); box-shadow: inset 0 0 0 2px var(--back-ring, #FFFFFF), inset 0 0 0 3.5px var(--back-b, #1F4FA8), 0 3px 8px rgba(0,0,0,0.35); }
.card.big { width: clamp(50px,15vw,66px); height: clamp(70px,21vw,92px); font-size: clamp(18px,5.4vw,24px); border-radius: 10px; }
.card.mini { width: 22px; height: 31px; font-size: 10px; border-radius: 5px; }
.btn { border: 1px solid rgba(244,247,252,0.18); background: rgba(244,247,252,0.05); border-radius: 14px; padding: 13px 18px; font-weight: 700; font-size: clamp(13px,3.5vw,14.5px); cursor: pointer; transition: transform .12s ease, background .15s ease, border-color .15s ease; color: #EAF0F8; white-space: nowrap; flex: 1; }
.btn:hover:not(:disabled) { border-color: rgba(244,247,252,0.3); }
.btn:active:not(:disabled) { transform: scale(0.97); }
.btn:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-sm { flex: none; padding: 8px 16px; font-size: 13px; border-radius: 11px; }
.btn-fold { border-color: rgba(255,107,107,0.45); color: #FF6B6B; background: rgba(255,107,107,0.08); }
.btn-go { border-color: rgba(52,211,153,0.5); color: #34D399; background: rgba(52,211,153,0.08); }
.btn-raise { background: linear-gradient(180deg, #FFD666, #F5B83D); color: #0B1426; border-color: transparent; box-shadow: 0 6px 18px rgba(245,184,61,0.28); }
.btn-raise:hover:not(:disabled) { background: linear-gradient(180deg, #FFE08A, #FFC94D); border-color: transparent; }
.iconbtn { background: rgba(244,247,252,0.06); border: 1px solid rgba(244,247,252,0.14); color: #C8D3E6; width: 30px; height: 30px; border-radius: 50%; cursor: pointer; display:flex; align-items:center; justify-content:center; flex-shrink:0; transition: background .15s ease; padding: 0; }
.iconbtn:hover { background: rgba(244,247,252,0.12); }
.chip-badge { font-size: 10.5px; background: #0E1A30; color: #F5B83D; border: 1px solid rgba(245,184,61,0.5); padding: 2px 8px; border-radius: 20px; font-weight: 700; font-variant-numeric: tabular-nums; transition: transform .5s cubic-bezier(.5,0,.3,1), opacity .5s ease; display: inline-block; }
.chip-badge.collecting { transform: translateY(-60px) scale(0.4); opacity: 0; }
.dealer-chip { position: absolute; bottom: -2px; right: -2px; width: 15px; height: 15px; border-radius: 50%; background: #FFFFFF; color: #0B1426; font-size: 8.5px; font-weight: 800; display:flex; align-items:center; justify-content:center; box-shadow: 0 1px 3px rgba(0,0,0,0.4); }
input[type=range] { accent-color: #F5B83D; }
.preset-btn { display: flex; flex-direction: column; gap: 1px; padding: 8px 6px; border-color: rgba(245,184,61,0.45); color: #F5B83D; background: rgba(245,184,61,0.08); }

.eq-meter { position: absolute; left: 0; top: 0; bottom: 0; transition: width .45s ease, background .3s ease; pointer-events: none; }
.hand-strip > span { z-index: 1; }
.felt-logo { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); font-family: 'Fraunces', Georgia, serif; font-weight: 700; font-size: 64px; letter-spacing: -0.03em; color: rgba(255,255,255,0.06); pointer-events: none; user-select: none; }
.run2 { display: flex; align-items: center; gap: 4px; position: relative; }
.run2 > span { font-size: 10px; font-weight: 700; color: rgba(255,255,255,0.75); margin-right: 4px; }
.card.r2 { width: clamp(24px,6.5vw,30px); height: clamp(34px,9vw,42px); font-size: clamp(9px,2.6vw,11px); border-radius: 5px; }
.card.big.o4 { width: clamp(38px,11vw,48px); height: clamp(54px,15.5vw,68px); font-size: clamp(14px,4vw,18px); border-radius: 8px; }
.card.mini.m4 { width: 17px; height: 26px; font-size: 8.5px; }
.pre-row { display: flex; gap: 6px; width: 100%; }
.pre-btn { flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; border: 1px solid rgba(244,247,252,0.14); background: rgba(244,247,252,0.04); color: #A9B8D0; border-radius: 12px; padding: 12px 4px; font-size: 12.5px; font-weight: 600; cursor: pointer; transition: border-color .15s ease, color .15s ease, background .15s ease; white-space: nowrap; }
.pre-btn.on { border-color: rgba(245,184,61,0.65); color: #F5B83D; background: rgba(245,184,61,0.1); }
.pre-box { width: 14px; height: 14px; border-radius: 4px; border: 1.5px solid currentColor; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
.squeeze { display: flex; gap: 6px; position: relative; touch-action: none; cursor: grab; -webkit-user-select: none; user-select: none; }
.card.sq { overflow: hidden; }
.sq-cover { position: absolute; top: 0; right: 0; bottom: 0; left: 0; border-radius: inherit; background-color: var(--back-a, #2F6FDE); background-image: repeating-linear-gradient(45deg, rgba(255,255,255,0.14) 0 3px, transparent 3px 7px); box-shadow: inset 0 0 0 2px var(--back-ring, #FFFFFF), inset 0 0 0 3.5px var(--back-b, #1F4FA8); }
.sq-hint { position: absolute; left: 0; right: 0; bottom: -15px; text-align: center; font-size: 10px; font-weight: 600; color: #8FA1BE; pointer-events: none; animation: hintPulse 1.6s ease-in-out infinite; }
.flights { position: fixed; top: 0; right: 0; bottom: 0; left: 0; pointer-events: none; z-index: 26; }
.flight { position: absolute; width: 0; height: 0; }
.fchip { position: absolute; left: -9px; top: -9px; width: 18px; height: 18px; border-radius: 50%; border: 3px dashed rgba(255,255,255,0.88); box-shadow: 0 2px 5px rgba(0,0,0,0.45); animation: chipFly .62s cubic-bezier(.3,.6,.25,1) both; }
.fchip.c0 { background: #F5B83D; } .fchip.c1 { background: #E5383B; } .fchip.c2 { background: #2F6FDE; }
.float-amt { position: absolute; transform: translate(-50%, -50%); font-weight: 800; font-size: 17px; color: #34D399; text-shadow: 0 2px 10px rgba(0,0,0,0.7); animation: floatUp 1.3s ease-out .45s both; white-space: nowrap; }
.bigwin { position: fixed; top: 0; right: 0; bottom: 0; left: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; pointer-events: none; z-index: 27; animation: bigWinBg 2.1s ease both; }
.bigwin-label { font-family: 'Fraunces', Georgia, serif; font-size: 30px; font-weight: 700; color: #F5B83D; animation: bigWinPop 2.1s cubic-bezier(.2,.9,.3,1.2) both; }
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
.app { position: relative; isolation: isolate; background: #0B1426; }
.app::before { content: ""; position: absolute; top: -20%; left: -20%; right: -20%; height: 90%; pointer-events: none; z-index: -1; background: radial-gradient(40% 45% at 22% 18%, rgba(59,130,246,0.38), transparent 70%), radial-gradient(35% 40% at 85% 10%, rgba(139,92,246,0.30), transparent 70%), radial-gradient(40% 40% at 60% 70%, rgba(20,184,166,0.16), transparent 70%); animation: aurora 22s ease-in-out infinite alternate; }
.app { overflow: hidden; }
@keyframes aurora { 0% { transform: translate3d(0,0,0) scale(1); } 50% { transform: translate3d(4%,3%,0) scale(1.06); } 100% { transform: translate3d(-4%,1%,0) scale(1.02); } }
.panel { background: linear-gradient(180deg, rgba(25,43,77,0.94), rgba(18,32,58,0.94)); box-shadow: 0 10px 30px rgba(0,0,0,0.22); }
.row, .stat, .avatar-tile { background: rgba(22,38,68,0.9); }
.panel-label { display: flex; align-items: center; gap: 6px; font-size: 12.5px; font-weight: 600; color: #8FA1BE; margin-bottom: 12px; }
.sec-ic { width: 28px; height: 28px; border-radius: 9px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.badge-dot { min-width: 18px; height: 18px; padding: 0 5px; border-radius: 9px; background: #FF5C7A; color: #FFFFFF; font-size: 11px; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; animation: badgePop .35s ease; }
.streak-pill { color: #FF9A4C; border-color: rgba(255,138,76,0.4); background: rgba(255,138,76,0.12); }

.streak-banner { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; padding: 14px 14px 14px 12px; border-radius: 18px; background: linear-gradient(120deg, #FF7A3D 0%, #F0447A 100%); box-shadow: 0 10px 28px rgba(240,68,122,0.3); animation: riseIn .4s ease both; }
.streak-flame { width: 42px; height: 42px; border-radius: 13px; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; color: #FFFFFF; animation: flameBob 1.6s ease-in-out infinite; flex-shrink: 0; }
@keyframes flameBob { 0%, 100% { transform: translateY(0) rotate(-3deg); } 50% { transform: translateY(-2px) rotate(3deg); } }
.streak-panel { background: linear-gradient(160deg, rgba(255,122,61,0.2) 0%, rgba(25,43,77,0.94) 55%); border-color: rgba(255,138,76,0.3); }
.streak-row { display: grid; grid-template-columns: repeat(7, 1fr); gap: 5px; margin-top: 14px; }
.streak-day { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 8px 0 7px; border-radius: 11px; background: rgba(244,247,252,0.05); border: 1px solid rgba(244,247,252,0.07); color: #8FA1BE; }
.streak-day .sd-n { font-size: 9.5px; font-weight: 600; }
.streak-day .sd-amt { font-size: 11px; font-weight: 700; color: #F4F7FC; }
.streak-day.got { background: rgba(52,211,153,0.14); border-color: rgba(52,211,153,0.4); color: #34D399; }
.streak-day.today { border-color: #FF8A4C; background: rgba(255,138,76,0.16); box-shadow: 0 0 0 2px rgba(255,138,76,0.25); animation: hintPulse 1.8s ease-in-out infinite; }
.streak-day.big:not(.got) { background: linear-gradient(180deg, rgba(245,184,61,0.22), rgba(245,184,61,0.06)); border-color: rgba(245,184,61,0.45); }

.mode-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 14px; }
.mode-tile { border: none; border-radius: 18px; padding: 14px 10px 13px; text-align: left; cursor: pointer; color: #FFFFFF; position: relative; overflow: hidden; transition: transform .14s ease; box-shadow: 0 8px 22px rgba(0,0,0,0.25); }
.mode-tile:active { transform: scale(0.96); }
.mode-tile::after { content: ""; position: absolute; right: -18px; bottom: -18px; width: 64px; height: 64px; border-radius: 50%; background: rgba(255,255,255,0.12); }
.mode-tile.m-cash { background: linear-gradient(150deg, #22C27A, #0F8A55); }
.mode-tile.m-tournament { background: linear-gradient(150deg, #9B6BFF, #6236D6); }
.mode-tile.m-practice { background: linear-gradient(150deg, #3C9BFF, #1F5FD0); }
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
.pass-row-n { width: 22px; text-align: center; font-size: 12px; font-weight: 700; color: #8FA1BE; }

.chal-panel { border-color: rgba(52,211,153,0.2); }
.chal { display: flex; align-items: center; gap: 12px; padding: 11px 12px; border-radius: 14px; background: rgba(244,247,252,0.04); border: 1px solid rgba(244,247,252,0.06); }
.chal.claimed { opacity: 0.5; }
.chal-done { width: 32px; height: 32px; border-radius: 50%; background: rgba(52,211,153,0.16); color: #34D399; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }

.var-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-bottom: 12px; }
.var-tile { border: 1.5px solid rgba(244,247,252,0.1); background: rgba(244,247,252,0.04); border-radius: 14px; padding: 10px 9px; text-align: left; cursor: pointer; transition: border-color .15s ease, background .15s ease; }
.var-name { font-size: 13px; font-weight: 700; }
.var-sub { font-size: 10.5px; color: #7587A6; margin-top: 2px; line-height: 1.3; }
.var-tile.on.v-holdem { border-color: #34D399; background: rgba(52,211,153,0.12); }
.var-tile.on.v-omaha { border-color: #A78BFA; background: rgba(139,92,246,0.14); }
.var-tile.on.v-short { border-color: #FF9A4C; background: rgba(255,138,76,0.13); }
.turbo-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 12px; padding: 10px 12px; border-radius: 14px; background: rgba(244,247,252,0.04); border: 1px solid rgba(244,247,252,0.07); }
.turbo-ic { width: 30px; height: 30px; border-radius: 9px; background: rgba(245,184,61,0.16); color: #F5B83D; display: flex; align-items: center; justify-content: center; }

.cos-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.cos-tile { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 12px 6px 10px; border-radius: 16px; background: rgba(22,38,68,0.9); border: 1.5px solid rgba(244,247,252,0.07); cursor: pointer; transition: border-color .15s ease, transform .12s ease; }
.cos-tile:active:not(:disabled) { transform: scale(0.96); }
.cos-tile.on { border-color: #34D399; box-shadow: 0 0 0 3px rgba(52,211,153,0.15); }
.cos-tile:disabled { cursor: default; }
.cos-prev { height: 50px; display: flex; align-items: center; justify-content: center; }
.cos-name { font-size: 11.5px; font-weight: 600; text-align: center; }
.cos-tag { display: inline-flex; align-items: center; gap: 4px; font-size: 10.5px; font-weight: 700; padding: 3px 8px; border-radius: 10px; background: rgba(244,247,252,0.08); color: #C8D3E6; }
.cos-tag.eq { background: rgba(52,211,153,0.16); color: #34D399; }
.cos-tag.buy { background: rgba(245,184,61,0.16); color: #F5B83D; }
.cos-tag.locked { color: #5E7196; }
.back-sw { border-radius: 6px; }
.felt-sw { width: 64px; height: 40px; border-radius: 999px; border: 4px solid; box-shadow: 0 4px 10px rgba(0,0,0,0.35), inset 0 4px 10px rgba(0,0,0,0.3); }

.chart-dot { position: absolute; width: 10px; height: 10px; margin: -5px 0 0 -5px; border-radius: 50%; box-shadow: 0 0 0 2px #14223D; pointer-events: none; }
.best-row { display: flex; align-items: center; gap: 10px; padding: 9px 10px; border-radius: 12px; background: rgba(244,247,252,0.04); }
.best-n { width: 22px; height: 22px; border-radius: 50%; background: rgba(245,184,61,0.16); color: #F5B83D; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }

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
.title-row.on { border-color: #34D399; }
.standing { margin-left: 8px; font-size: 10.5px; font-weight: 700; color: #F5B83D; background: rgba(245,184,61,0.12); border-radius: 8px; padding: 1px 6px; }

.coach { width: 100%; max-width: 460px; margin-bottom: 8px; border-radius: 14px; padding: 9px 12px 10px; border: 1px solid rgba(111,168,255,0.35); background: linear-gradient(135deg, rgba(47,111,222,0.16), rgba(139,92,246,0.12)); animation: fadeSlide .25s ease; flex-shrink: 0; }
.coach-head { display: flex; align-items: center; gap: 8px; margin-bottom: 3px; }
.coach-badge { display: inline-flex; align-items: center; gap: 4px; font-size: 10.5px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: #9CC2FF; }
.coach-act { font-size: 14px; font-weight: 800; }
.coach-why { font-size: 12px; line-height: 1.4; color: #C8D3E6; }
.coach.act-raise .coach-act, .coach.act-bet .coach-act { color: #F5B83D; }
.coach.act-call .coach-act, .coach.act-check .coach-act { color: #34D399; }
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
.think-dots { position: absolute; top: -6px; right: -10px; display: flex; gap: 2px; background: #F4F7FC; border-radius: 10px; padding: 4px 5px; box-shadow: 0 2px 6px rgba(0,0,0,0.35); }
.think-dots i { width: 4px; height: 4px; border-radius: 50%; background: #0B1426; animation: thinkDot 1s ease-in-out infinite; }
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
.spin-card { width: 100%; display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 18px; cursor: pointer; text-align: left; color: #F4F7FC; background: rgba(22,38,68,0.9); border: 1px solid rgba(244,247,252,0.08); transition: transform .14s ease; }
.spin-card:active { transform: scale(0.98); }
.spin-card.ready { background: linear-gradient(120deg, #1D5FD6 0%, #0EA5B7 100%); border-color: transparent; box-shadow: 0 10px 26px rgba(14,165,183,0.28); }
.spin-ic { width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.14); flex-shrink: 0; }
.spin-card.ready .spin-ic { animation: spinNudge 3s ease-in-out infinite; }
@keyframes spinNudge { 0%, 70%, 100% { transform: rotate(0); } 80% { transform: rotate(-25deg); } 90% { transform: rotate(15deg); } }
.wheel-wrap { position: relative; width: 260px; max-width: 100%; margin: 6px auto 0; height: 260px; }
.wheel { width: 100%; height: 100%; display: block; filter: drop-shadow(0 10px 24px rgba(0,0,0,0.45)); }
.wheel-pointer { position: absolute; top: -6px; left: 50%; margin-left: -13px; width: 0; height: 0; border-left: 13px solid transparent; border-right: 13px solid transparent; border-top: 24px solid #F5C451; z-index: 2; filter: drop-shadow(0 3px 4px rgba(0,0,0,0.5)); }
.spin-result { text-align: center; margin-top: 14px; animation: badgePop .45s cubic-bezier(.3,1.4,.5,1) both; }

.vip-card { width: 100%; display: flex; align-items: center; gap: 12px; padding: 14px; border-radius: 18px; cursor: pointer; text-align: left; color: #F4F7FC; background: linear-gradient(135deg, #1A1C22 0%, #0C0D10 100%); border: 1px solid rgba(201,162,77,0.35); position: relative; overflow: hidden; transition: transform .14s ease; }
.vip-card:active { transform: scale(0.98); }
.vip-card.open { border-color: rgba(245,210,122,0.7); box-shadow: 0 10px 28px rgba(201,162,77,0.22); }
.vip-card.open::after { content: ""; position: absolute; top: 0; bottom: 0; left: -60%; width: 40%; background: linear-gradient(100deg, transparent, rgba(245,210,122,0.18), transparent); transform: skewX(-20deg); animation: shimmer 5.5s ease-in-out infinite; pointer-events: none; }
.vip-ic { width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: #F5D27A; background: rgba(201,162,77,0.14); border: 1px solid rgba(201,162,77,0.35); flex-shrink: 0; }
.vip-row { background: linear-gradient(135deg, #1A1C22, #101114) !important; border-color: rgba(201,162,77,0.3) !important; }
.table-wrap.vip .felt-oval { box-shadow: inset 0 0 0 2px rgba(0,0,0,0.3), inset 0 10px 30px rgba(0,0,0,0.45), 0 0 0 1px rgba(245,210,122,0.25), 0 14px 34px rgba(0,0,0,0.5), 0 0 60px rgba(201,162,77,0.18); }
.table-wrap.vip .felt-logo { color: rgba(245,210,122,0.09); letter-spacing: 0.08em; }
.table-wrap.vip .wordmark-sm { color: #F5D27A; }

.prestige-badge { position: relative; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; vertical-align: middle; margin-left: 2px; }
.prestige-badge svg { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
.prestige-badge b { position: relative; color: #FFFFFF; font-family: 'Inter', sans-serif; font-weight: 800; line-height: 1; margin-top: 1px; text-shadow: 0 1px 1px rgba(0,0,0,0.4); }
.prestige-btn { border-color: rgba(227,107,255,0.55); color: #F0C2FF; background: linear-gradient(135deg, rgba(227,107,255,0.16), rgba(124,58,237,0.16)); font-size: 13px; }
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; animation-delay: 0ms !important; transition-duration: 0.01ms !important; }
}
`;
