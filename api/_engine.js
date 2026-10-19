// The online Hold'em engine. Pure functions over a public state (what every phone sees)
// and a secret per hand (the deck order and everyone's hole cards, which only the server reads).
// The whole deck is shuffled once per hand and never changes, so a repeated request can't
// deal a different card than the first one did.

import { randomInt, randomBytes } from "node:crypto";

export const TURN_MS = 20000;
const SHOWDOWN_MS = 5500, RUNOUT_MS = 7500, FOLD_WIN_MS = 3500, START_MS = 4000;
const SUITS = ["s", "h", "d", "c"];
const RANK_SING = { 2: "Two", 3: "Three", 4: "Four", 5: "Five", 6: "Six", 7: "Seven", 8: "Eight", 9: "Nine", 10: "Ten", 11: "Jack", 12: "Queen", 13: "King", 14: "Ace" };
const RANK_PLUR = { 2: "Twos", 3: "Threes", 4: "Fours", 5: "Fives", 6: "Sixes", 7: "Sevens", 8: "Eights", 9: "Nines", 10: "Tens", 11: "Jacks", 12: "Queens", 13: "Kings", 14: "Aces" };

/* ---------- cards and hand ranking (same rules as the app) ---------- */
function freshDeck() { const d = []; for (const s of SUITS) for (let r = 2; r <= 14; r++) d.push({ r, s, id: `${r}${s}` }); return d; }
function shuffled() { const d = freshDeck(); for (let i = d.length - 1; i > 0; i--) { const j = randomInt(i + 1); [d[i], d[j]] = [d[j], d[i]]; } return d; }
function combos(arr, k) { const res = []; const rec = (st, ch) => { if (ch.length === k) { res.push([...ch]); return; } for (let i = st; i < arr.length; i++) { ch.push(arr[i]); rec(i + 1, ch); ch.pop(); } }; rec(0, []); return res; }
function evaluate5(cards) {
  const ranks = cards.map((c) => c.r).sort((a, b) => b - a);
  const isFlush = cards.every((c) => c.s === cards[0].s);
  const counts = {}; ranks.forEach((r) => (counts[r] = (counts[r] || 0) + 1));
  const groups = Object.entries(counts).map(([r, c]) => [Number(r), c]).sort((a, b) => (b[1] - a[1]) || (b[0] - a[0]));
  const uniq = [...new Set(ranks)]; let isStraight = false, hi = 0;
  if (uniq.length === 5) { if (uniq[0] - uniq[4] === 4) { isStraight = true; hi = uniq[0]; } else if (uniq.join(",") === "14,5,4,3,2") { isStraight = true; hi = 5; } }
  if (isStraight && isFlush) return [8, hi];
  if (groups[0][1] === 4) return [7, groups[0][0], groups[1][0]];
  if (groups[0][1] === 3 && groups[1][1] === 2) return [6, groups[0][0], groups[1][0]];
  if (isFlush) return [5, ...ranks];
  if (isStraight) return [4, hi];
  if (groups[0][1] === 3) return [3, groups[0][0], ...groups.slice(1).map((g) => g[0])];
  if (groups[0][1] === 2 && groups[1][1] === 2) { const pr = [groups[0][0], groups[1][0]].sort((a, b) => b - a); return [2, ...pr, groups[2][0]]; }
  if (groups[0][1] === 2) return [1, groups[0][0], ...groups.slice(1).map((g) => g[0])];
  return [0, ...ranks];
}
export function cmpScore(a, b) { for (let i = 0; i < 6; i++) { const av = a[i] ?? 0, bv = b[i] ?? 0; if (av !== bv) return av - bv; } return 0; }
export function bestHand(hole, board) { let best = null; for (const c of combos([...hole, ...board], 5)) { const s = evaluate5(c); if (!best || cmpScore(s, best) > 0) best = s; } return best; }
export function describeScore(s) {
  switch (s[0]) {
    case 8: return s[1] === 14 ? "Royal Flush" : `Straight Flush, ${RANK_SING[s[1]]} high`;
    case 7: return `Four ${RANK_PLUR[s[1]]}`;
    case 6: return `Full House, ${RANK_PLUR[s[1]]} over ${RANK_PLUR[s[2]]}`;
    case 5: return `Flush, ${RANK_SING[s[1]]} high`;
    case 4: return `Straight, ${RANK_SING[s[1]]} high`;
    case 3: return `Three ${RANK_PLUR[s[1]]}`;
    case 2: return `Two Pair, ${RANK_PLUR[s[1]]} and ${RANK_PLUR[s[2]]}`;
    case 1: return `Pair of ${RANK_PLUR[s[1]]}`;
    default: return `${RANK_SING[s[1]]} high`;
  }
}

/* ---------- table state ---------- */
export function newState(maxSeats) {
  return { seats: Array(maxSeats).fill(null), handNo: 0, dealId: null, dealer: -1, stage: "waiting", board: [], pot: 0, currentBet: 0, minRaise: 0, turn: -1, deadline: 0, nextAt: 0, result: null, log: [], sbSeat: -1, bbSeat: -1 };
}
const BETTING = ["preflop", "flop", "turn", "river"];
const isBetting = (st) => BETTING.includes(st.stage);
const log = (st, text) => { st.log = [...(st.log || []), { t: Date.now(), text }].slice(-12); };
const eligible = (s) => s && !s.left && !s.out && s.stack > 0;
const live = (st) => st.seats.map((s, i) => [s, i]).filter(([s]) => s && s.inHand && !s.folded);
const canAct = (s) => s && s.inHand && !s.folded && !s.allIn;
function nextIdx(st, from, pred) { const n = st.seats.length; for (let k = 1; k <= n; k++) { const i = (from + k + n) % n; if (pred(st.seats[i], i)) return i; } return -1; }
export const seatOf = (st, uid) => st.seats.findIndex((s) => s && s.uid === uid);

// The hand's secret: deck order fixed at the deal, cards read off it by position.
// Holes take the first 2 per player, then burn+3, burn+1, burn+1 for the board.
function boardFrom(sec, nPlayers, count) {
  const base = nPlayers * 2; const idx = [base + 1, base + 2, base + 3, base + 5, base + 7].slice(0, count);
  return idx.map((i) => sec.deck[i]);
}

export function sit(st, seat, player, stack, now) {
  if (seat < 0 || seat >= st.seats.length) return "No such seat.";
  if (st.seats[seat]) return "That seat's taken.";
  if (seatOf(st, player.uid) >= 0) return "You're already sitting here.";
  st.seats[seat] = { uid: player.uid, name: player.name, avatar: player.avatar || "🙂", photo: player.photo || null, prestige: player.prestige || 0, stack, bought: stack, bet: 0, total: 0, folded: true, allIn: false, acted: false, inHand: false, out: false, left: false, timeouts: 0, peekAt: null, last: null, emote: null, awaySince: null };
  log(st, `${player.name} sits down`);
  if (st.stage === "waiting" && st.seats.filter(eligible).length >= 2 && !st.nextAt) st.nextAt = now + START_MS;
  return null;
}

// returns { cashout } — what goes back to the player's bankroll
export function leave(st, seat, now, cfg) {
  const s = st.seats[seat]; if (!s) return { cashout: 0 };
  const cashout = s.stack; s.stack = 0;
  log(st, `${s.name} leaves the table`);
  if (isBetting(st) && s.inHand && !s.folded) {
    const wasTurn = st.turn === seat;
    s.folded = true; s.left = true; s.last = "Fold";
    if (wasTurn || live(st).length <= 1) advance(st, cfg.sec, now, cfg);
  } else if (isBetting(st) && s.inHand) s.left = true; // chips already in the pot stay there
  else st.seats[seat] = null;
  return { cashout };
}

export function startHand(st, now, cfg) {
  st.seats.forEach((s, i) => { if (s && s.left) st.seats[i] = null; });
  st.seats.forEach((s) => { if (s && s.stack <= 0 && !s.out) { s.out = true; s.awaySince = s.awaySince || now; } });
  const players = st.seats.map((s, i) => [s, i]).filter(([s]) => eligible(s)).map(([, i]) => i);
  st.result = null; st.board = []; st.pot = 0; st.turn = -1; st.nextAt = 0;
  if (players.length < 2) { st.stage = "waiting"; st.seats.forEach((s) => { if (s) { s.inHand = false; s.folded = true; s.bet = 0; s.total = 0; s.allIn = false; s.last = null; } }); return null; }
  st.handNo += 1; st.dealId = randomBytes(6).toString("hex");
  st.dealer = nextIdx(st, st.dealer < 0 ? -1 : st.dealer, (s) => eligible(s));
  st.seats.forEach((s, i) => { if (!s) return; const inn = players.includes(i); Object.assign(s, { bet: 0, total: 0, folded: !inn, allIn: false, acted: false, inHand: inn, last: null, peekAt: null, emote: s.emote && now - s.emote.at < 3000 ? s.emote : null }); });
  const heads = players.length === 2;
  const sbSeat = heads ? st.dealer : nextIdx(st, st.dealer, (s) => eligible(s));
  const bbSeat = nextIdx(st, sbSeat, (s) => eligible(s));
  st.sbSeat = sbSeat; st.bbSeat = bbSeat;
  const post = (i, amt) => { const s = st.seats[i]; const a = Math.min(amt, s.stack); s.stack -= a; s.bet += a; s.total += a; if (s.stack === 0) s.allIn = true; };
  post(sbSeat, cfg.sb); post(bbSeat, cfg.bb);
  st.currentBet = cfg.bb; st.minRaise = cfg.bb; st.stage = "preflop";
  // deal two each, one at a time starting left of the button
  const deck = shuffled(); const order = []; let i = st.dealer;
  for (let k = 0; k < players.length; k++) { i = nextIdx(st, i, (s, j) => players.includes(j)); order.push(i); }
  const holes = {}; order.forEach((seat, k) => { holes[seat] = [deck[k], deck[k + order.length]]; });
  const sec = { dealId: st.dealId, deck, holes, n: players.length };
  st.handPlayers = players.length;
  log(st, `Hand ${st.handNo}. Blinds ${cfg.sb}/${cfg.bb}`);
  const actors = players.filter((p) => canAct(st.seats[p]));
  if (actors.length === 0 || (actors.length === 1 && st.seats[actors[0]].bet >= st.currentBet)) { finishRound(st, sec, now, cfg); return sec; }
  st.turn = nextIdx(st, bbSeat, canAct); st.deadline = now + TURN_MS;
  return sec;
}

export function act(st, sec, seat, type, amount, now, cfg, auto = false) {
  if (!isBetting(st)) return "No hand going.";
  if (st.turn !== seat) return "Not your turn.";
  const s = st.seats[seat]; if (!canAct(s)) return "You can't act.";
  const toCall = st.currentBet - s.bet;
  if (type === "check" && toCall > 0) return "You can't check, there's a bet.";
  if (type === "call" && toCall <= 0) type = "check";
  if (type === "fold") { s.folded = true; s.last = "Fold"; log(st, `${s.name} folds`); }
  else if (type === "check") { s.last = "Check"; log(st, `${s.name} checks`); }
  else if (type === "call") { const a = Math.min(toCall, s.stack); s.stack -= a; s.bet += a; s.total += a; if (s.stack === 0) s.allIn = true; s.last = s.allIn ? "All in" : `Call ${a}`; log(st, `${s.name} ${s.allIn ? "calls all in" : "calls"} ${a}`); }
  else if (type === "bet" || type === "raise") {
    const maxTo = s.stack + s.bet;
    let target = Math.min(Math.floor(Number(amount) || 0), maxTo);
    const minTo = st.currentBet + st.minRaise;
    if (target < minTo && target < maxTo) return `Minimum is ${minTo}.`;
    if (target <= st.currentBet) return "That's not a raise.";
    const delta = target - s.bet; s.stack -= delta; s.bet = target; s.total += delta; if (s.stack === 0) s.allIn = true;
    const raiseBy = target - st.currentBet;
    if (raiseBy >= st.minRaise) { st.minRaise = raiseBy; st.seats.forEach((o, i) => { if (o && i !== seat && canAct(o)) o.acted = false; }); }
    const wasBet = st.currentBet === 0; st.currentBet = target;
    s.last = s.allIn ? "All in" : wasBet ? `Bet ${target}` : `Raise ${target}`; log(st, `${s.name} ${s.allIn ? "is all in for" : wasBet ? "bets" : "raises to"} ${target}`);
  } else return "Unknown move.";
  s.acted = true; if (!auto) s.timeouts = 0;
  advance(st, sec, now, cfg);
  return null;
}

function collect(st) { st.seats.forEach((s) => { if (s) { st.pot += s.bet; s.bet = 0; s.acted = false; } }); st.currentBet = 0; }

function advance(st, sec, now, cfg) {
  const l = live(st);
  if (l.length <= 1) return winUncontested(st, now, l[0] && l[0][1]);
  const actors = l.filter(([s]) => !s.allIn);
  const pending = actors.filter(([s]) => !s.acted || s.bet < st.currentBet);
  if (pending.length > 0 && !(actors.length === 1 && actors[0][0].bet >= st.currentBet)) {
    st.turn = nextIdx(st, st.turn, (s) => canAct(s) && (!s.acted || s.bet < st.currentBet));
    st.deadline = now + TURN_MS;
    return;
  }
  finishRound(st, sec, now, cfg);
}

function finishRound(st, sec, now, cfg) {
  collect(st); st.minRaise = cfg.bb; st.turn = -1;
  const n = sec.n; const next = { preflop: 3, flop: 4, turn: 5 }[st.stage];
  const stillActing = live(st).filter(([s]) => !s.allIn).length;
  if (st.stage === "river") return showdown(st, sec, now, false);
  if (stillActing <= 1) { st.board = boardFrom(sec, n, 5); st.stage = "river"; return showdown(st, sec, now, true); }
  st.board = boardFrom(sec, n, next); st.stage = { 3: "flop", 4: "turn", 5: "river" }[next];
  st.turn = nextIdx(st, st.dealer, canAct); st.deadline = now + TURN_MS;
  st.seats.forEach((s) => { if (s && s.inHand && !s.folded && !s.allIn) s.last = null; });
}

function winUncontested(st, now, seat) {
  collect(st);
  const s = st.seats[seat];
  const amount = st.pot; s.stack += amount; st.pot = 0;
  st.result = { uncontested: true, winners: [{ seat, amount, desc: null }], reveal: {}, headline: `${s.name} wins ${amount.toLocaleString()}` };
  log(st, st.result.headline);
  st.stage = "showdown"; st.turn = -1; st.nextAt = now + FOLD_WIN_MS;
}

function showdown(st, sec, now, runout) {
  const contenders = live(st).map(([, i]) => i);
  const scores = {}; contenders.forEach((i) => { scores[i] = bestHand(sec.holes[i], st.board); });
  // side pots from what everyone put in this hand
  const contrib = st.seats.map((s, i) => [i, s ? s.total : 0]).filter(([, t]) => t > 0);
  const levels = [...new Set(contrib.map(([, t]) => t))].sort((a, b) => a - b);
  let prev = 0; const won = {};
  for (const lv of levels) {
    const inLevel = contrib.filter(([, t]) => t >= lv);
    const amount = (lv - prev) * inLevel.length; prev = lv;
    const elig = inLevel.map(([i]) => i).filter((i) => contenders.includes(i));
    if (!amount) continue;
    if (!elig.length) { // an uncalled bet goes back to whoever made it, even if they've left the table
      const back = inLevel[0][0]; const bs = st.seats[back];
      if (bs && bs.left) { st.refunds = [...(st.refunds || []), { uid: bs.uid, amount }]; } else won[back] = (won[back] || 0) + amount;
      continue;
    }
    let best = null; elig.forEach((i) => { if (!best || cmpScore(scores[i], best) > 0) best = scores[i]; });
    const winners = elig.filter((i) => cmpScore(scores[i], best) === 0);
    // odd chip goes to the first winner left of the button
    const ordered = winners.sort((a, b) => ((a - st.dealer - 1 + st.seats.length) % st.seats.length) - ((b - st.dealer - 1 + st.seats.length) % st.seats.length));
    const share = Math.floor(amount / winners.length); let odd = amount - share * winners.length;
    ordered.forEach((i) => { won[i] = (won[i] || 0) + share + (odd > 0 ? 1 : 0); if (odd > 0) odd -= 1; });
  }
  Object.entries(won).forEach(([i, a]) => { st.seats[i].stack += a; });
  st.pot = 0;
  const reveal = {}; contenders.forEach((i) => { reveal[i] = sec.holes[i]; });
  const winners = Object.entries(won).filter(([i]) => contenders.includes(Number(i))).map(([i, a]) => ({ seat: Number(i), amount: a, desc: describeScore(scores[i]) }));
  const top = winners.slice().sort((a, b) => b.amount - a.amount)[0];
  const names = winners.map((w) => st.seats[w.seat].name);
  st.result = { uncontested: false, winners, reveal, hands: contenders.map((i) => ({ seat: i, desc: describeScore(scores[i]) })), headline: top ? `${names.join(" & ")} ${winners.length > 1 ? "split" : "wins"} ${winners.reduce((a, w) => a + w.amount, 0).toLocaleString()} with ${top.desc}` : "Hand over", runout };
  log(st, st.result.headline);
  st.stage = "showdown"; st.turn = -1; st.nextAt = now + (runout ? RUNOUT_MS : SHOWDOWN_MS);
}

// Called by any phone at the table: auto-acts for whoever ran out of time, moves to the next hand,
// and cashes out anyone who has been away a long time. Returns { changed, newHand, cashouts }.
export function tick(st, sec, now, cfg) {
  const out = { changed: false, newSec: null, cashouts: [] };
  if (isBetting(st) && st.turn >= 0 && now > st.deadline + 600) {
    const s = st.seats[st.turn];
    const toCall = st.currentBet - s.bet;
    s.timeouts = (s.timeouts || 0) + 1;
    if (s.timeouts >= 2 && !s.out) { s.out = true; s.awaySince = now; log(st, `${s.name} is away`); }
    act(st, sec, st.turn, toCall > 0 ? "fold" : "check", 0, now, cfg, true);
    out.changed = true;
  } else if ((st.stage === "showdown" || st.stage === "waiting") && st.nextAt && now >= st.nextAt) {
    out.newSec = startHand(st, now, cfg); out.changed = true;
  } else if (st.stage === "waiting" && !st.nextAt && st.seats.filter(eligible).length >= 2) {
    st.nextAt = now + START_MS; out.changed = true;
  }
  // gone for ten minutes and not in a hand: send their chips home and free the seat
  st.seats.forEach((s, i) => {
    if (s && s.out && s.awaySince && now - s.awaySince > 600000 && !(isBetting(st) && s.inHand && !s.folded)) {
      out.cashouts.push({ uid: s.uid, amount: s.stack }); s.stack = 0;
      if (isBetting(st) && s.inHand) s.left = true; else st.seats[i] = null;
      log(st, `${s.name} was cashed out for being away`); out.changed = true;
    }
  });
  return out;
}

export function back(st, seat, now) {
  const s = st.seats[seat]; if (!s || s.left) return "Not seated.";
  if (s.stack <= 0) return "Rebuy first.";
  s.out = false; s.timeouts = 0; s.awaySince = null;
  if (st.stage === "waiting" && st.seats.filter(eligible).length >= 2 && !st.nextAt) st.nextAt = now + START_MS;
  return null;
}
export function rebuy(st, seat, amount, now) {
  const s = st.seats[seat]; if (!s || s.left) return "Not seated.";
  if (isBetting(st) && s.inHand && !s.folded) return "Wait for this hand to end.";
  s.stack += amount; s.bought += amount; s.out = false; s.timeouts = 0; s.awaySince = null;
  log(st, `${s.name} rebuys for ${amount.toLocaleString()}`);
  if (st.stage === "waiting" && st.seats.filter(eligible).length >= 2 && !st.nextAt) st.nextAt = now + START_MS;
  return null;
}
