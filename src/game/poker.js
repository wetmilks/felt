import { RANK_PLUR, RANK_SING, SUITS, rankLabel } from "./helpers.js";

// Only one table is open at a time, so the evaluator reads the active variant from here.
let ACTIVE_VARIANT = "holdem";
// the open table sets this so the hand evaluator and equity math follow its game
function setActiveVariant(v) { ACTIVE_VARIANT = v; }
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

export { RANKING_REFERENCE, VARIANTS, bestHand, calcEquity, cmpScore, describeCurrentHand, describeScore, equityKnown, estimateStrength, freshDeck, handKind, handName, holeCount, setActiveVariant, shuffle };
