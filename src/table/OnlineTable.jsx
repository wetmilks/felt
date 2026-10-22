import { useState, useRef, useCallback, useEffect } from "react";
import { api, cloud } from "../cloud.js";
import { publicProfile } from "../app/boot.jsx";
import { AVATAR_COLORS, SUIT_COLOR, SUIT_COLOR_CB, SUIT_GLYPH, rankLabel } from "../game/helpers.js";
import { BASE_EMOTES, findBack, findFelt } from "../game/progression.js";
import { ClubTag, clubFelt, clubHex } from "../ui/ClubTag.jsx";
import { CrownMark, PrestigeBadge, pnameCls } from "../game/rewards.jsx";
import { vibrate } from "../game/save.js";
import { PlayerAvatar } from "../social/Friends.jsx";
import { PeekCards } from "./PokerTable.jsx";
import { WinFx } from "./RankingsModal.jsx";
import { ChipStack } from "../ui/ChipStack.jsx";
import { Icon, Modal, seatPos, shortNum } from "../ui/primitives.jsx";

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
  const back = findBack((data.cosmetics || {}).cardBack); const myFelt = findFelt((data.cosmetics || {}).felt);
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
  const tclub = st && st.club; // a members-only club table
  const felt = tclub && (tclub.lvl || 1) >= 2 ? clubFelt(tclub) : myFelt;
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

  const okeyRef = useRef(null);
  useEffect(() => { const h = (e) => okeyRef.current && okeyRef.current(e); window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h); }, []);
  if (!row || !st) {
    return (<div className="table-wrap online"><div className="table-top"><button className="iconbtn" onClick={() => onExit()} aria-label="Back"><Icon name="back" size={15} /></button><div className="tt-title">Friends table</div><span style={{ width: 42 }} /></div><div className="empty" style={{ marginTop: 80 }}>{err || "Joining the table…"}</div></div>);
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

  const seatView = (i, k) => {
    const s = st.seats[i];
    if (!s) {
      return mySeat < 0
        ? <button key={i} className="seat seat-open" style={seatPos(k, order.length)} onClick={() => openSit(i)} aria-label={`Sit in seat ${i + 1}`}><span className="disp" style={{ fontSize: 20 }}>+</span><span className="lbl" style={{ color: "var(--t-text)" }}>Sit here</span></button>
        : <div key={i} className="seat seat-open" style={seatPos(k, order.length)} aria-label="Open seat"><span className="lbl">Open</span></div>;
    }
    const active = betting && st.turn === i; const inHand = s.inHand && st.stage !== "waiting";
    const em = s.emote && serverNow - s.emote.at < 3500 ? s.emote.e : null;
    const fmt = compact ? shortNum : (x) => x.toLocaleString();
    const col = AVATAR_COLORS[i % AVATAR_COLORS.length];
    return (
      <div key={i} className={`seat${active ? " active" : ""}`} style={{ ...seatPos(k, order.length), "--seat-c": col, opacity: s.out ? 0.45 : s.folded && inHand ? 0.5 : 1 }}>
        {em && <div key={s.emote.at} className="emote-bubble">{em}</div>}
        <div className="seat-top">
          <div className="seat-av">
            <div className="bot-av ot-av" style={{ width: 24, height: 24, fontSize: 13, overflow: "hidden" }}>{avatarOf(s, 24)}</div>
            {s.peekAt && inHand && !s.folded && <div className="peek-badge" aria-label={`${s.name} looks at their cards`}><Icon name="eye" size={11} stroke={2.4} /></div>}
            {(s.prestige || 0) >= 5 && <CrownMark size={12} top={-8} />}
          </div>
          <span className="seat-name"><span className={pnameCls(s.prestige)} style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{s.name}</span><PrestigeBadge n={s.prestige} size={11} /><ClubTag club={s.club} /></span>
        </div>
        {st.dealer === i && <div className="dealer-chip">D</div>}
        <div className="seat-stack num">{s.out ? (s.stack > 0 ? "AWAY" : "OUT") : fmt(s.stack)}</div>
        <div className="seat-cards">
          {reveal[i] ? reveal[i].map((c) => <OnlineCard key={c.id} c={c} mini suitColor={suitColor} cls={`${winnerSeats.has(i) ? "win" : ""}`} />)
            : inHand && !s.folded ? (<div className={`backs${s.peekAt ? " peeking" : ""}`}>{[0, 1].map((j) => <div key={j} className="card mini back" style={{ "--r": `${j === 0 ? -7 : 7}deg`, marginLeft: j ? -11 : 0 }} />)}</div>) : null}
        </div>
        <div className="seat-bet">
          {s.bet > 0 ? <div className="chip-badge">{!compact && <ChipStack amount={s.bet} small set={chipSet} />}{fmt(s.bet)}</div> : s.last && inHand ? <div className="ot-last">{s.last}</div> : null}
        </div>
        {active && <div className="seat-timer" aria-hidden="true"><div style={{ width: `${(secsLeft / TURN_SECS) * 100}%`, background: secsLeft < 8 ? "var(--t-bad)" : "var(--t-accent)" }} /></div>}
      </div>
    );
  };

  const raisePanel = () => {
    const maxTo = me.stack + me.bet; const minTo = Math.min(maxTo, st.currentBet + st.minRaise);
    const clamp = (v) => Math.max(minTo, Math.min(maxTo, v));
    const presets = [{ label: "Half pot", value: clamp(st.currentBet + Math.round(pot * 0.5)) }, { label: "Pot", value: clamp(st.currentBet + pot) }, { label: "All in", value: maxTo }];
    const go = (v) => { vibrate(20); setShowRaise(false); setCustom(false); send("act", { move: st.currentBet ? "raise" : "bet", amount: v }); };
    return !custom ? (
      <div className="raise-box"><div className="preset-row">
        {presets.map((p) => <button key={p.label} className="btn preset-btn" onClick={() => go(p.value)}><div style={{ fontSize: 12.5, fontWeight: 600 }}>{p.label}</div><div className="num" style={{ fontSize: 10.5, opacity: 0.8 }}>{p.value.toLocaleString()}</div></button>)}
        <button className="iconbtn" style={{ width: 44, height: 48, borderRadius: 12, background: "var(--t-panel2)" }} onClick={() => { setRaiseTo(minTo); setCustom(true); }} aria-label="Custom amount"><Icon name="edit" size={16} /></button>
      </div></div>
    ) : (
      <div className="slider-row">
        <input type="range" min={minTo} max={maxTo} value={clamp(raiseTo)} onChange={(e) => setRaiseTo(Number(e.target.value))} style={{ flex: 1 }} aria-label="Bet amount" />
        <span className="num" style={{ fontSize: 13, minWidth: 48, textAlign: "right", fontWeight: 700 }}>{clamp(raiseTo).toLocaleString()}</span>
        <button className="btn btn-raise" style={{ flex: "none", padding: "8px 16px", minHeight: 44 }} onClick={() => go(clamp(raiseTo))}>{st.currentBet ? "Raise" : "Bet"}</button>
      </div>
    );
  };

  const statusLine = st.stage === "waiting" ? (nextIn != null && st.nextAt ? `Dealing in ${nextIn}` : st.seats.filter(Boolean).length < 2 ? "Waiting for someone to sit down" : "Waiting for players") : st.stage === "showdown" ? "" : turnName ? (st.turn === mySeat ? "Your turn" : `${turnName} to act`) : "";
  const iWonUncontested = st.stage === "showdown" && st.result && st.result.uncontested && st.result.winners[0] && st.result.winners[0].seat === mySeat && !st.result.shown;

  okeyRef.current = (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
    const t = e.target; const tg = (t && t.tagName) || "";
    if ((tg === "INPUT" && t.type !== "range") || tg === "TEXTAREA" || tg === "SELECT") return;
    if (document.querySelector(".scrim, .fs-page")) return;
    if (!myTurn || !me) return;
    const k = e.key.toLowerCase();
    if (k === "f") { e.preventDefault(); setShowRaise(false); send("act", { move: "fold" }); }
    else if (k === "c" || k === "k") { e.preventDefault(); send("act", { move: toCall <= 0 ? "check" : "call" }); }
    else if ((k === "r" || k === "b") && me.stack > toCall) { e.preventDefault(); setShowRaise(true); }
    else if (k === "escape" && showRaise) { e.preventDefault(); setShowRaise(false); setCustom(false); }
  };

  return (
    <div data-felt={felt.key} data-back={back.key} className={`table-wrap online${order.length >= 7 ? " crowded" : ""}`} style={{ "--rail-c": tclub ? clubHex(tclub.color) : "#00A560", "--back-a": back.a, "--back-b": back.b, "--back-ring": back.ring, ...(back.img ? { "--back-img": back.img, "--back-size": back.size } : {}), "--felt1": felt.c1, "--felt2": felt.c2, "--felt3": felt.c3, "--rail": felt.rail, ...(felt.tex ? { "--felt-tex": felt.tex, "--felt-tex-size": felt.texSize } : {}), ...(felt.line ? { "--felt-line": felt.line } : {}) }}>
      <div className="table-top">
        <button className="iconbtn" onClick={() => (mySeat >= 0 ? setSheet({ kind: "leave" }) : onExit())} aria-label="Leave table"><Icon name="back" size={15} /></button>
        <div style={{ textAlign: "center", minWidth: 0 }}>
          <div className="tt-title">Table {row.code}</div>
          <div className="table-sub">{tclub && <ClubTag club={tclub} style={{ marginRight: 6, marginLeft: 0 }} />}{row.sb}/{row.bb} · {row.friendly ? "Friendly" : "Real chips"}</div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="iconbtn" onClick={openInvite} aria-label="Invite friends"><Icon name="user" size={14} /></button>
          {mySeat >= 0 && <button className="iconbtn" onClick={() => setSheet({ kind: "emote" })} aria-label="Send a reaction"><Icon name="chat" size={16} stroke={2} /></button>}
          <button className="iconbtn" onClick={() => setSoundOn((x) => !x)} aria-label={soundOn ? "Mute" : "Unmute"}><Icon name={soundOn ? "soundOn" : "soundOff"} size={14} /></button>
        </div>
      </div>

      <div key={statusLine} className="status">{err ? <span style={{ color: "var(--t-bad)" }}>{err}</span> : statusLine}</div>

      <div className={`seats${order.length >= 7 ? " grid4" : ""}${order.length >= 4 ? " compact" : ""}`} style={{ gridTemplateColumns: order.length === 1 ? "minmax(0, 170px)" : `repeat(${order.length >= 7 ? 4 : order.length === 2 || order.length === 4 ? 2 : 3}, minmax(0, 1fr))`, justifyContent: "center", paddingTop: 26 }}>{order.map(seatView)}</div>
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
            <div className="pot-num num">{pot.toLocaleString()}<span className="pot-l">POT</span></div>
          </div>
        </div>
        {st.stage === "showdown" && st.result && (
          <div className="banner" style={{ "--banner-c": winnerSeats.has(mySeat) ? "var(--c-green)" : "transparent" }}>
            <div className="disp" style={{ fontSize: 20, color: winnerSeats.has(mySeat) ? "var(--t-good)" : "var(--t-text)" }}>{st.result.headline}</div>
            {st.result.hands && st.result.hands.length > 1 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 3, paddingTop: 7, marginTop: 7, borderTop: "1px solid rgba(244,247,252,0.08)" }}>
                {st.result.hands.map((h) => <div key={h.seat} style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 11.5, color: winnerSeats.has(h.seat) ? "var(--t-good)" : "var(--t-mid)", fontWeight: winnerSeats.has(h.seat) ? 600 : 400 }}><span>{st.seats[h.seat] ? st.seats[h.seat].name : "Player"}</span><span>{h.desc}</span></div>)}
              </div>
            )}
          </div>
        )}
      </div>

      {me ? (
        <div className={`hero-seat${myTurn ? " turn" : ""}`}>
          {myTurn && <div className="hero-timer" aria-hidden="true"><div style={{ width: `${(secsLeft / TURN_SECS) * 100}%`, background: secsLeft < 8 ? "var(--t-bad)" : "var(--t-accent)" }} /></div>}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10, minWidth: 0, flex: 1 }}>
            <div className="hero-av" style={{ marginTop: 4 }}>
              {peekOpen && <div className="peek-badge hero" aria-label="You're looking at your cards"><Icon name="eye" size={11} stroke={2.4} /></div>}
              {(me.prestige || 0) >= 5 && <CrownMark />}
              <div className="hero-av-in" style={{ opacity: me.folded && me.inHand ? 0.45 : 1 }}>{avatarOf(me, 36)}</div>
              {st.dealer === mySeat && <div className="dealer-chip" style={{ bottom: -3, right: -3 }}>D</div>}
              {me.emote && serverNow - me.emote.at < 3500 && <div key={me.emote.at} className="emote-bubble">{me.emote.e}</div>}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="hero-name"><span className={pnameCls(me.prestige)} style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{me.name}</span><ClubTag club={me.club} />{myTurn && <span className="turn-tag">YOUR TURN</span>}</div>
              <div className="hero-stack num">{me.stack.toLocaleString()}</div>
              {me.bet > 0 && <div className="chip-badge" style={{ marginTop: 4, display: "inline-flex" }}><ChipStack amount={me.bet} small set={chipSet} />{me.bet.toLocaleString()}</div>}
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
          <div className="disp" style={{ fontSize: 22 }}>Pick a seat</div>
          <div style={{ fontSize: 12, color: "var(--t-mid)" }}>{row.friendly ? `Friendly table. Everyone sits with ${(row.bb * 100).toLocaleString()} free chips.` : `Buy in ${lo.toLocaleString()} to ${hi.toLocaleString()} from your ${data.chips.toLocaleString()} chips.`}</div>
        </div>
      )}

      <div className="controls">
        {showRaise && myTurn && raisePanel()}
        {myTurn ? (
          <div className="act-row">
            <button className="btn btn-fold" onClick={() => { vibrate(20); setShowRaise(false); send("act", { move: "fold" }); }}>Fold<kbd className="kh" aria-hidden="true">F</kbd></button>
            {toCall <= 0 ? <button className="btn btn-go" onClick={() => { vibrate(15); send("act", { move: "check" }); }}>Check<kbd className="kh" aria-hidden="true">C</kbd></button>
              : <button className="btn btn-go" onClick={() => { vibrate(15); send("act", { move: "call" }); }}>Call {Math.min(toCall, me.stack).toLocaleString()}<kbd className="kh" aria-hidden="true">C</kbd></button>}
            {!showRaise ? <button className="btn btn-raise" disabled={me.stack <= toCall} onClick={() => setShowRaise(true)}>{st.currentBet ? "Raise" : "Bet"}<kbd className="kh" aria-hidden="true">R</kbd></button> : <button className="btn" onClick={() => { setShowRaise(false); setCustom(false); }}>Cancel</button>}
          </div>
        ) : me && me.out ? (
          <div style={{ display: "flex", width: "100%", gap: 8, alignItems: "center" }}>
            <div style={{ flex: 1, fontSize: 12.5, color: "var(--t-mid)" }}>{me.stack > 0 ? "You're sitting out." : "You're out of chips."}</div>
            {me.stack > 0 ? <button className="btn btn-raise" style={{ flex: "none" }} onClick={() => send("back")}>I'm back</button>
              : <button className="btn btn-raise" style={{ flex: "none" }} onClick={() => { setBuyIn(row.friendly ? row.bb * 100 : Math.min(hi, Math.max(lo, Math.min(data.chips, row.bb * 50)))); setSheet({ kind: "rebuy" }); }}>Rebuy</button>}
          </div>
        ) : iWonUncontested ? (
          <div className="show-choice"><div className="disp">Show your cards?</div><div style={{ fontSize: 12.5, color: "var(--t-mid)", marginTop: 4 }}>Nobody called. Show them or let the next hand deal.</div><button className="btn btn-raise show-btn" style={{ width: "100%", marginTop: 12 }} onClick={() => send("show")}>Show</button></div>
        ) : me ? (
          <div className="lbl" style={{ padding: "20px 0", textAlign: "center" }}>{st.stage === "waiting" ? (st.seats.filter(Boolean).length < 2 ? "Invite friends to start" : "Starting soon") : st.stage === "showdown" ? (nextIn ? `Next hand in ${nextIn}` : "Next hand coming") : me.folded ? "You folded. Waiting for the hand to finish." : turnName ? `Waiting on ${turnName}` : "Waiting"}</div>
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
          <div className="code-card"><div className="lbl">Table code</div><div className="code-big">{row.code}</div></div>
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

export { ONLINE_STAKES, OnlineTable };
