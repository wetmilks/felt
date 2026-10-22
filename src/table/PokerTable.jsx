import { useEffect, useState, useRef, useCallback } from "react";
import { coachAdvice, coachVerdict, findDraws } from "../game/coachTips.js";
import { AVATAR_COLORS, BLIND_LEVEL_MULT, BOT_NAMES, BOT_PERSONALITIES, DEAL_OFFSET, SUIT_COLOR, SUIT_COLOR_CB, SUIT_GLYPH, TURN_SECONDS, VIP_NAMES, rankLabel } from "../game/helpers.js";
import { VARIANTS, bestHand, calcEquity, cmpScore, describeCurrentHand, describeScore, equityKnown, estimateStrength, freshDeck, handKind, handName, holeCount, setActiveVariant, shuffle } from "../game/poker.js";
import { PLACEMENT_MATCHES, RANKED_MATCH_HANDS, UNRANKED, isPlaced, rankName, tierForRating } from "../game/ranked.js";
import { CrownMark, PrestigeBadge, pnameCls } from "../game/rewards.jsx";
import { DISPLAY_FONT, vibrate } from "../game/save.js";
import { rankedOutcome } from "../game/season.js";
import { IDEAL_VPIP, tourneyPrize } from "../game/skill.js";
import { useSound } from "../game/sound.js";
import { TitleTag } from "../game/titles.jsx";
import { RankingsModal, WinFx } from "./RankingsModal.jsx";
import { RankedResults } from "./Results.jsx";
import { BIG_BLIND, SMALL_BLIND, computePots, makePlayers, signed } from "./setup.js";
import { ShareModal } from "./share.jsx";
import { ChipStack } from "../ui/ChipStack.jsx";
import { ordinal, useTween } from "../ui/hooks.js";
import { Icon, Modal, TierBadge, seatPos, shortNum } from "../ui/primitives.jsx";

/* =========================================================================
   POKER TABLE
   ========================================================================= */
function PokerTable({ startStack, name, avatar, photo = null, soundOn, setSoundOn, onExit, onHandResolved, stakes, tableSize, tournament, ranked, rankedState, skill, tourneyBuyIn = 0, bankroll, botSkill = 0.4, opponentRating = null, frameColor, tutorial, variant = "holdem", turbo = false, runTwice = false, squeeze = false, cardBack = null, felt = null, title = null, vip = false, prestige = 0, chipSet = "classic", winFx = "confetti", colorblind, cardSize, animSpeed, showWinTip, onDismissWinTip }) {
  const suitColor = colorblind ? SUIT_COLOR_CB : SUIT_COLOR;
  const cardScale = cardSize === "large" ? 1.18 : 1;
  const speedMult = animSpeed === "fast" ? 0.55 : 1;
  setActiveVariant(variant); // the hand evaluator and equity math follow the open table's game
  useEffect(() => () => { setActiveVariant("holdem"); }, []);
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
  const bustHandRef = useRef({});
  // keyboard play on a computer: F fold, C check or call, R raise, 1 2 3 presets, Space deals
  const keyRef = useRef(null);
  useEffect(() => { const h = (e) => keyRef.current && keyRef.current(e); window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h); }, []);
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
    finalPs.forEach((p) => { if (!p.isHuman && !p.eliminated && p.stack <= 0) bustHandRef.current[p.id] = matchHandsRef.current.length + 1; });
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
    matchHandsRef.current.push({ ...decisions, potWon: humanWon });
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
  const ringColor = vip ? "#E1B24E" : "#00D596";
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
  // Chip Stack header: a big title and a small line under it
  const modeTitle = tournament ? (tournamentOver ? "Tourney over" : "Tourney") : ranked ? (placementNo ? `Placement ${placementNo}/${PLACEMENT_MATCHES}` : "Ranked") : tutorial ? "Practice" : vip ? (stakes?.label || "High Roller") : `Cash ${SB}/${BB}`;
  const modeSub = tournament ? (tournamentOver ? "" : `Level ${blindLevel + 1} · ${SB}/${BB}${gameTag ? ` · ${gameTag}` : ""}`) : ranked ? `${handsCount === 0 ? `${RANKED_MATCH_HANDS} hand match` : handsCount >= RANKED_MATCH_HANDS ? "Final hand" : `Hand ${handsCount} of ${RANKED_MATCH_HANDS}`} · ${SB}/${BB}` : tutorial ? "Nothing at stake" : vip ? `Blinds ${SB.toLocaleString()}/${BB.toLocaleString()}` : `${gameTag ? `${gameTag} · ` : ""}${tableSize?.label || ""}`;
  const railColor = vip ? "#EDB000" : ranked ? (isPlaced(rankedState) ? tierForRating(rankedState.rating).color : "#A3A6AD") : tournament ? "#196EFE" : tutorial ? "#00A560" : "#F51E1D";
  const modeLine = tournament
    ? (tournamentOver ? "Tournament over" : `${gameTag || "Tournament"}, level ${blindLevel + 1}, blinds ${SB}/${BB}`)
    : ranked
      ? `${placementNo ? `Placement ${placementNo} of ${PLACEMENT_MATCHES}` : "Ranked"}, ${handsCount === 0 ? `${RANKED_MATCH_HANDS} hand match` : handsCount >= RANKED_MATCH_HANDS ? "final hand" : `hand ${handsCount} of ${RANKED_MATCH_HANDS}`}`
      : tutorial ? "Practice, nothing at stake" : vip ? `${stakes?.label || "High Roller"} · ${SB.toLocaleString()} / ${BB.toLocaleString()}` : `${gameTag ? `${gameTag} cash` : "Cash game"}, blinds ${SB}/${BB}`;

  keyRef.current = (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
    const t = e.target; const tg = (t && t.tagName) || "";
    if ((tg === "INPUT" && t.type !== "range") || tg === "TEXTAREA" || tg === "SELECT") return;
    if (document.querySelector(".scrim, .fs-page, .results")) return;
    const k = e.key === " " ? "space" : e.key.toLowerCase();
    if (humanTurn && human) {
      const maxAmt = human.stack + human.streetContributed;
      const minAmt = Math.max(currentBet + minRaise, BB);
      const clampAmt = (v) => Math.max(minAmt, Math.min(maxAmt, v));
      const kind = currentBet === 0 ? "bet" : "raise";
      if (k === "f") { e.preventDefault(); handleFoldClick(); return; }
      if (k === "c" || k === "k") { e.preventDefault(); handleAction(0, humanToCall <= 0 ? "check" : "call"); return; }
      if ((k === "r" || k === "b") && maxAmt > currentBet) { e.preventDefault(); setShowRaise(true); return; }
      if (showRaise) {
        if (k === "escape") { e.preventDefault(); setShowRaise(false); setCustomRaise(false); return; }
        if (!customRaise && (k === "1" || k === "2" || k === "3")) { e.preventDefault(); const v = k === "1" ? clampAmt(currentBet + Math.round(pot * 0.5)) : k === "2" ? clampAmt(currentBet + pot) : maxAmt; setBetInput(v); handleAction(0, kind, v); return; }
        if (customRaise && k === "enter") { e.preventDefault(); handleAction(0, kind, clampAmt(betInput)); return; }
      }
    }
    if ((k === "space" || k === "enter") && betweenHands && !(ranked && rankedResult) && !tournamentOver && !busted && !(tableCleared && !ranked && !tournament)) { e.preventDefault(); startHand(); return; }
    if (k === "s" && betweenHands && showChoice && !showChoice.shown && stage === "showdown") { e.preventDefault(); showHand(); }
  };

  return (
    <div data-felt={felt ? felt.key : "green"} data-back={cardBack ? cardBack.key : "blue"} className={`table-wrap${drama ? " is-drama" : ""}${vip ? " vip" : ""}${bots.length >= 7 ? " crowded" : ""}`} style={{ "--rail-c": railColor, ...(cardBack ? { "--back-a": cardBack.a, "--back-b": cardBack.b, "--back-ring": cardBack.ring, ...(cardBack.img ? { "--back-img": cardBack.img, "--back-size": cardBack.size } : {}) } : {}), ...(felt ? { "--felt1": felt.c1, "--felt2": felt.c2, "--felt3": felt.c3, "--rail": felt.rail, ...(felt.tex ? { "--felt-tex": felt.tex, "--felt-tex-size": felt.texSize } : {}), ...(felt.line ? { "--felt-line": felt.line } : {}) } : {}) }}>
      <div className="table-top">
        <button className="iconbtn" onClick={handleBack} aria-label="Leave table"><Icon name="back" size={15} /></button>
        <div style={{ textAlign: "center", minWidth: 0 }}>
          <div className="tt-title">{modeTitle}</div>
          {modeSub && <div className="table-sub">{modeSub}</div>}
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

      <div className={`seats${bots.length >= 7 ? " grid4" : ""}${bots.length >= 4 ? " compact" : ""}`} style={{ gridTemplateColumns: bots.length === 1 ? "minmax(0, 170px)" : `repeat(${bots.length >= 7 ? 4 : bots.length === 2 || bots.length === 4 ? 2 : 3}, minmax(0, 1fr))`, justifyContent: "center" }}>
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
            <div key={p.id} className={`seat${isActive ? " active" : ""}`} style={{ ...seatPos(i, bots.length), "--seat-c": AVATAR_COLORS[i % AVATAR_COLORS.length], opacity: p.eliminated ? 0.28 : p.folded ? 0.45 : 1 }}>
              <div className="seat-top">
                <div ref={(el) => { seatRefs.current[p.id] = el; }} className="seat-av">
                  <div className="bot-av" style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}>{p.name[0]}</div>
                  {peekers[p.id] && <div className="peek-badge" aria-label={`${p.name} looks at their cards`}><Icon name="eye" size={11} stroke={2.4} /></div>}
                  {thinking === p.id && <div className="think-dots" aria-label={`${p.name} is thinking`}><i /><i /><i /></div>}
                </div>
                <span className="seat-name">{botRating != null && <TierBadge tier={tierForRating(botRating)} size={13} />}<span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</span></span>
              </div>
              {dealerIdx === realIdx && !p.eliminated && <div className="dealer-chip">D</div>}
              <div className="seat-stack num">{p.eliminated ? "OUT" : fmt(p.stack)}</div>
              {tendencyTag && !p.eliminated && !tiny && <div className="seat-tag" style={{ color: tendencyTag === "Aggressive" ? "var(--t-bad)" : "var(--t-good)" }}>{tendencyTag}</div>}
              <div className="seat-cards">
                {revealed && p.hole.map((c, i2) => (<div key={c.id} className={`card mini${hc > 2 ? " m4" : ""}${dim(c.id) ? " dim" : ""}${winningIds && winningIds.has(c.id) ? " win" : ""}`} style={{ marginLeft: hc > 2 && i2 ? -7 : 0, animation: `flipIn .4s cubic-bezier(.2,.8,.2,1) ${i2 * 0.08}s backwards` }}><div style={{ color: suitColor[c.s], fontSize: 10.5, fontWeight: 900 }}>{rankLabel(c.r)}{SUIT_GLYPH[c.s]}</div></div>))}
                {!revealed && inHand && (
                  <div key={`b${handsCount}`} className={`backs${p.folded ? " folded" : ""}${peekers[p.id] ? " peeking" : ""}`}>
                    {Array.from({ length: hc }).map((_, j) => <div key={j} className="card mini back" style={{ "--r": `${hc > 2 ? (j - 1.5) * 8 : j === 0 ? -7 : 7}deg`, marginLeft: j ? (hc > 2 ? -14 : -11) : 0, animation: `dealToSeat .42s cubic-bezier(.2,.8,.2,1) ${dealDelay(p.id, j)}s backwards` }} />)}
                  </div>
                )}
              </div>
              <div className="seat-bet">
                {allInOdds && allInOdds[p.id] != null && stage !== "showdown" ? <div className="odds-badge num" style={{ color: allInOdds[p.id] >= 50 ? "var(--t-good)" : "#FEABAB" }}>{allInOdds[p.id]}%</div>
                  : p.streetContributed > 0 && <div className={`chip-badge${collecting ? " collecting" : ""}`}>{!compact && <ChipStack amount={p.streetContributed} small vip={vip} set={chipSet} />}{fmt(p.streetContributed)}</div>}
              </div>
              {isActive && <div className="seat-timer" aria-hidden="true"><div style={{ width: `${(timeLeft / turnSeconds) * 100}%`, background: timeLeft < 8 ? "var(--t-bad)" : "var(--t-accent)" }} /></div>}
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
            <div ref={potRef} className={`pot-num num${potPulse ? " pulse" : ""}`}>{potShown.toLocaleString()}<span className="pot-l">POT</span></div>
          </div>
        </div>
        {stage === "showdown" && winnerBanner && (
          <div className="banner" style={{ "--banner-c": winnerBanner.won ? "var(--c-green)" : "transparent" }}>
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
          {handLabel && <div className="cp-meter" style={{ width: `${heroEq == null ? 0 : eqShown}%`, background: eqShown >= 50 ? "rgba(0,213,150,0.13)" : "rgba(255,88,92,0.11)" }} />}
          <div className="cp-top">
            <span className="coach-badge"><Icon name="cap" size={12} stroke={2.2} />Coach</span>
            {coachAdv && <span className="coach-act">{coachAdv.text}</span>}
            {handLabel && <span className="cp-hand"><span className="cp-name">{handLabel}</span><b className="num" style={{ color: heroEq == null ? "var(--t-mut)" : eqShown >= 50 ? "var(--t-good)" : "var(--t-bad)" }}>{heroEq == null ? "…" : `${eqShown}%`}</b></span>}
          </div>
          <div className="coach-why">{coachAdv ? coachAdv.why : coachNote ? coachNote.text : stage === "idle" ? "Deal a hand. On every turn I'll tell you the best move and why." : betweenHands ? "Hit Next hand when you're ready." : human && human.folded ? "You're out of this one. Watch how it plays out." : "Waiting on the table. The % is your chance to win right now."}</div>
        </div>
      ) : (<>
      {handLabel && showWinTip && (
        <div className="tip" style={{ marginTop: -4, color: "var(--t-accent)", borderColor: "rgba(252,182,0,0.35)", background: "rgba(252,182,0,0.08)" }}>
          <span>Under your stack: your hand and your odds of winning this pot. Use it to decide whether to call or fold.</span>
          <button className="iconbtn" onClick={onDismissWinTip} aria-label="Got it"><Icon name="check" size={13} /></button>
        </div>
      )}
      </>)}
      <div className={`hero-seat${humanTurn ? " turn" : ""}`}>
        {humanTurn && <div className="hero-timer" aria-hidden="true"><div style={{ width: `${(timeLeft / turnSeconds) * 100}%`, background: timeLeft < 8 ? "var(--t-bad)" : "var(--t-accent)" }} /></div>}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, minWidth: 0, flex: 1 }}>
          <div ref={(el) => { seatRefs.current[0] = el; }} className="hero-av" style={{ marginTop: 4 }}>
            {peekOpen && <div className="peek-badge hero" aria-label="You looked at your cards"><Icon name="eye" size={11} stroke={2.4} /></div>}
            {prestige >= 5 && <CrownMark />}
            <div className="hero-av-in" style={{ opacity: human?.folded ? 0.4 : 1, boxShadow: frameColor ? `0 0 0 2px ${frameColor}` : "none" }}>{photo ? <img src={photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /> : human?.avatar}</div>
            {dealerIdx === 0 && <div className="dealer-chip" style={{ bottom: -3, right: -3 }}>D</div>}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="hero-name"><span className={pnameCls(prestige)} style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{human?.name}</span><PrestigeBadge n={prestige} size={15} />{humanTurn ? <span className="turn-tag">YOUR TURN</span> : ranked && handsCount > 0 && !rankedResult ? <span className="standing">{ordinal(rankedPlace).toUpperCase()}</span> : null}</div>
            {title && title !== "rookie" && <TitleTag k={title} size={10.5} style={{ display: "block", marginTop: 1 }} />}
            <div className="hero-stack num">{(human?.stack ?? 0).toLocaleString()}</div>
            {!tutorial && <div className="hero-hand">{handLabel ? <>{handLabel} · <b style={{ color: heroEq == null ? "var(--t-mid)" : eqShown >= 50 ? "var(--t-good)" : "var(--t-bad)" }}>{heroEq == null ? "…" : `${eqShown}% to win`}</b></> : proMode && human && human.hole.length > 0 && stage !== "idle" ? "Pro mode, no odds shown" : ""}</div>}
            {human?.streetContributed > 0 && <div className={`chip-badge${collecting ? " collecting" : ""}`} style={{ marginTop: 4, display: "inline-flex" }}><ChipStack amount={human.streetContributed} small vip={vip} set={chipSet} />{human.streetContributed.toLocaleString()}</div>}
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
            <div className="raise-box">
              {!customRaise ? (
                <div className="preset-row">
                  {presets.map((p, pi) => (
                    <button key={p.label} className="btn preset-btn" onClick={() => { vibrate(20); setBetInput(p.value); handleAction(0, currentBet === 0 ? "bet" : "raise", p.value); }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600 }}>{p.label}<kbd className="kh" aria-hidden="true">{pi + 1}</kbd></div>
                      <div className="num" style={{ fontSize: 10.5, opacity: 0.8 }}>{p.value.toLocaleString()}</div>
                    </button>
                  ))}
                  <button className="iconbtn" style={{ width: 44, height: 48, borderRadius: 12, background: "var(--t-panel2)" }} onClick={() => { setBetInput(minAmt); setCustomRaise(true); }} aria-label="Custom amount"><Icon name="edit" size={16} /></button>
                </div>
              ) : (
                <div className="slider-row" style={{ padding: 0, background: "none" }}>
                  <input type="range" min={minAmt} max={maxAmt} value={clamp(betInput)} onChange={(e) => setBetInput(Number(e.target.value))} style={{ flex: 1 }} aria-label="Bet amount" />
                  <span className="num" style={{ fontSize: 13, minWidth: 48, textAlign: "right", fontWeight: 700 }}>{clamp(betInput).toLocaleString()}</span>
                  <button className="btn btn-raise" style={{ flex: "none", padding: "8px 16px", minHeight: 44 }} onClick={() => handleAction(0, currentBet === 0 ? "bet" : "raise", clamp(betInput))}>{currentBet === 0 ? "Bet" : "Raise"}</button>
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
          <div className="show-choice">
            <div className="disp">{showChoice.shown ? "Cards shown" : "Show your cards?"}</div>
            <div style={{ fontSize: 12.5, color: "var(--t-mid)", marginTop: 4 }}>{showChoice.shown ? "The table saw what you had." : "Nobody called, so it's your choice."}</div>
            <div className="act-row two" style={{ marginTop: 12 }}>
              <button className="btn btn-raise show-btn" disabled={showChoice.shown} onClick={showHand}>{showChoice.shown ? "Shown" : "Show"}</button>
              <button className="btn" onClick={startHand}>{showChoice.shown ? "Next hand" : "Muck"}<kbd className="kh" aria-hidden="true">Space</kbd></button>
            </div>
          </div>
        ) : betweenHands ? (
          <button className="btn btn-raise" style={{ flex: "none", width: "100%" }} onClick={startHand}>{stage === "idle" ? "Deal" : "Next hand"}<kbd className="kh" aria-hidden="true">Space</kbd></button>
        ) : humanTurn ? (
          <div className="act-row">
            <button className="btn btn-fold" onClick={handleFoldClick}>{confirmFold ? "Sure?" : "Fold"}<kbd className="kh" aria-hidden="true">F</kbd></button>
            {humanToCall <= 0 ? (<button className="btn btn-go" onClick={() => { vibrate(15); handleAction(0, "check"); }}>Check<kbd className="kh" aria-hidden="true">C</kbd></button>) : (<button className="btn btn-go" onClick={() => { vibrate(15); handleAction(0, "call"); }}>Call {Math.min(humanToCall, human.stack).toLocaleString()}<kbd className="kh" aria-hidden="true">C</kbd></button>)}
            {!showRaise ? (<button className="btn btn-raise" onClick={() => setShowRaise(true)} disabled={human.stack + human.streetContributed <= currentBet}>{currentBet === 0 ? "Bet" : "Raise"}<kbd className="kh" aria-hidden="true">R</kbd></button>) : (<button className="btn" onClick={() => { setShowRaise(false); setCustomRaise(false); }}>Cancel<kbd className="kh" aria-hidden="true">Esc</kbd></button>)}
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
        ) : (<div className="lbl" style={{ padding: "20px 0" }}>Waiting on the table</div>)}
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
          standings={(() => {
            const others = players.filter((p) => !p.isHuman).sort((a, b) => b.stack - a.stack || (bustHandRef.current[b.id] || 0) - (bustHandRef.current[a.id] || 0))
              .map((p) => ({ name: p.name, stack: Math.max(0, p.stack), bust: p.stack <= 0 ? bustHandRef.current[p.id] : null }));
            others.splice(Math.max(0, Math.min(others.length, (rankedResult.place || 1) - 1)), 0, { name: "You", stack: Math.max(0, rankedResult.finalStack), me: true });
            return others;
          })()}
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

export { PeekCards, PokerTable };
