import { useState, useRef, useEffect } from "react";
import { CHALLENGE_REWARD, CHIP_SETS, PASS_LEVELS, PASS_XP, STREAK_REWARDS, WIN_FX, challengeText, defaultCosmetics, ensureChallenges, ensurePass, findBack, findFelt, passLevel, passReward, passRewardLabel, passTypeLabel, streakState, weekResetDays } from "../../game/progression.js";
import { daysLeftInSeason } from "../../game/season.js";
import { TitleTag, defaultTitles, findTitle } from "../../game/titles.jsx";
import { BackSwatch, FeltSwatch, FxSwatch } from "../Shop.jsx";
import { hoursLeftToday } from "./RankedCard.jsx";
import { ChipStack } from "../../ui/ChipStack.jsx";
import { Icon, Modal, shortNum } from "../../ui/primitives.jsx";

const kNum = (n) => (n >= 1000 ? `${(n / 1000).toFixed(n % 1000 ? 1 : 0)}K` : String(n));
function StreakBanner({ streak, onClaim }) {
  const st = streakState(streak);
  if (st.claimedToday) return null;
  const day = st.nextDay;
  return (
    <section className="streak-card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
        <div className="disp" style={{ fontSize: 21, fontWeight: 800 }}>Daily streak</div>
        <div style={{ fontSize: 12.5, color: "var(--t-mid)" }}>{day === 1 && streak && streak.count > 0 ? "Streak reset, start again" : `Day ${day} of 7`}</div>
      </div>
      <div className="streak-days">
        {STREAK_REWARDS.map((amt, i) => {
          const d = i + 1;
          return (
            <div key={d} className={`sday${d < day ? " got" : d === day ? " today" : ""}${d === 7 ? " big" : ""}`}>
              <i>{d < day ? <Icon name="check" size={14} stroke={3.2} /> : d}</i>
              <span className="num">{kNum(amt)}</span>
            </div>
          );
        })}
      </div>
      <button className="btn btn-raise big-cta" style={{ minHeight: 50, fontSize: 22 }} onClick={onClaim}>Claim {STREAK_REWARDS[day - 1].toLocaleString()}</button>
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
    <section className="chal-card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}><span className="disp" style={{ fontSize: 22, fontWeight: 800 }}>Challenges</span>{ready > 0 && <span className="badge-dot num">{ready}</span>}</span>
        <div className="mini-seg" role="tablist" aria-label="Challenge list">
          {[["daily", "Daily"], ["weekly", "Weekly"]].map(([v, l]) => <button key={v} role="tab" aria-selected={which === v} className={which === v ? "on" : ""} onClick={() => setWhich(v)}>{l}</button>)}
        </div>
      </div>
      <div style={{ fontSize: 12, color: "var(--t-mid)", marginTop: 6 }}>{which === "daily" ? `New ones in ${hoursLeftToday()}h.` : `Resets in ${weekResetDays()} day${weekResetDays() === 1 ? "" : "s"}.`} Each pays {rw.chips.toLocaleString()} chips and {rw.xp} XP.</div>
      <div style={{ marginTop: 4 }}>
        {list.map((c) => {
          const done = c.progress >= c.target;
          return (
            <div key={c.id} className={`chal-row${c.claimed ? " claimed" : ""}`}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="chal-text"><span>{challengeText(c)}</span><span className="num" style={{ color: done ? "var(--t-good)" : "var(--t-mid)", flexShrink: 0 }}>{Math.min(c.progress, c.target)}/{c.target}</span></div>
                <div className="bar" style={{ marginTop: 8, height: 6 }}><div style={{ width: `${Math.min(100, (c.progress / c.target) * 100)}%`, background: done ? "var(--c-green)" : "#F2F2EE" }} /></div>
              </div>
              {c.claimed ? <span className="chal-reward" style={{ color: "var(--t-good)" }} aria-label="Claimed"><Icon name="check" size={18} stroke={3} /></span>
                : done ? <button className="btn btn-sm btn-raise" style={{ minHeight: 44 }} onClick={() => onClaim(which, c.id)}>Claim</button>
                : <span className="chal-reward">+{kNum(rw.chips)}</span>}
            </div>
          );
        })}
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

const passShortLabel = (r) => r.type === "chips" ? `${r.amount.toLocaleString()} chips` : r.type === "back" ? `${findBack(r.key).label} back` : r.type === "felt" ? `${findFelt(r.key).label} felt` : r.type === "fx" ? WIN_FX.find((x) => x.key === r.key).label : r.type === "title" ? findTitle(r.key).label : r.type === "emote" ? "Emote" : r.type === "avatar" ? "Avatar" : r.type === "chipset" ? `${CHIP_SETS.find((x) => x.key === r.key).label} chips` : passRewardLabel(r);
function PassCard({ pass, onOpen }) {
  const p = ensurePass(pass);
  const lvl = passLevel(p.xp);
  const into = p.xp - lvl * PASS_XP;
  const maxed = lvl >= PASS_LEVELS;
  const stripRef = useRef(null);
  useEffect(() => { const el = stripRef.current; if (el) el.scrollLeft = 0; }, []);
  const from = Math.max(1, Math.min(lvl - 1, PASS_LEVELS - 7));
  const shown = Array.from({ length: Math.min(8, PASS_LEVELS - from + 1) }, (_, i) => from + i);
  return (
    <section className="pass-card">
      <div className="pass-top">
        <button className="rk-link" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 8, color: "var(--t-text)" }} onClick={() => onOpen(lvl + 1)}>
          <span className="disp" style={{ fontSize: 22, fontWeight: 800 }}>Season pass</span><span className="pass-lvl num">LV {lvl}</span>
        </button>
        <button className="rk-link" onClick={() => onOpen(lvl + 1)}>See all {PASS_LEVELS}</button>
      </div>
      <div className="pass-xp"><div className="bar"><div style={{ width: `${maxed ? 100 : (into / PASS_XP) * 100}%`, background: "var(--t-accent)" }} /></div><span className="num">{maxed ? "Maxed out" : `${into} / ${PASS_XP} XP`}</span></div>
      <div className="pass-strip" ref={stripRef}>
        {shown.map((l) => {
          const r = passReward(l); const got = l <= lvl; const next = l === lvl + 1;
          return (
            <button key={l} className={`pass-mini r-${r.rarity}${got ? " got" : ""}${next ? " next" : ""}`} onClick={() => onOpen(l)} aria-label={`Level ${l}: ${passRewardLabel(r)}`}>
              <span className="pm-l num">{next ? `NEXT · ${l}` : `LV ${l}`}</span>
              <span className="pm-art"><PassArt r={r} size={40} /></span>
              <span className="pm-name">{passShortLabel(r)}</span>
              {got ? <span className="pm-r" style={{ color: "var(--t-good)" }}>Got it</span> : <span className="pm-r">{r.rarity}</span>}
            </button>
          );
        })}
      </div>
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
  const maxed = lvl >= PASS_LEVELS;
  return (
    <Modal title="" onClose={onClose} width={460} className="pass-sheet">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
          <div className="sheet-title">Season pass</div>
          <div className="lbl" style={{ marginTop: 6 }}>{month} · {daysLeftInSeason()} days left</div>
        </div>
        <button className="iconbtn" onClick={onClose} aria-label="Close"><Icon name="close" size={15} stroke={2.4} /></button>
      </div>
      <div className="ps-head" style={{ marginTop: 16 }}>
        <div className="ps-big num">{lvl}</div>
        <div style={{ flex: 1, paddingBottom: 4 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: "var(--t-mid)" }}><span>Level {lvl} of {PASS_LEVELS}</span><span className="num">{maxed ? "Maxed out" : `${into} / ${PASS_XP} XP`}</span></div>
          <div className="bar" style={{ height: 12, borderRadius: 6, marginTop: 8 }}><div style={{ width: `${maxed ? 100 : (into / PASS_XP) * 100}%`, borderRadius: 6, background: "repeating-linear-gradient(90deg, var(--t-accent) 0 14px, #FDD05A 14px 18px)" }} /></div>
        </div>
      </div>

      <div className={`ps-preview r-${r.rarity}`}>
        <div className="ps-art"><PassArt r={r} size={88} /></div>
        <div className="ps-meta">
          <div className="ps-rarity" style={{ color: "var(--rt)" }}>Level {sel} · {r.rarity}</div>
          <div className="ps-name">{r.type === "chips" ? `${r.amount.toLocaleString()} chips` : passShortLabel(r)}</div>
          <div className="ps-sub">{passTypeLabel(r)}. {r.type === "emote" ? "Send it at friends tables." : r.type === "fx" ? "Plays when you win a big pot." : r.type === "chipset" ? "Every chip you bet, in this set." : r.type === "title" ? "Shows under your name." : r.type === "chips" ? "Straight to your bankroll." : "Only from the season pass."}</div>
          <div style={{ marginTop: "auto", paddingTop: 4 }}>
            {got ? (canEquip ? <button className={`btn btn-sm${equipped ? "" : " btn-raise"}`} disabled={equipped} onClick={() => onEquip(r)}>{equipped ? "Equipped" : "Equip"}</button> : <span className="ps-got"><Icon name="check" size={14} stroke={2.8} /> Unlocked</span>)
              : <span className="ps-lock num">{((sel * PASS_XP) - p.xp).toLocaleString()} XP TO GO</span>}
          </div>
        </div>
      </div>

      <div className="ps-track" ref={trackRef}>
        <div className="ps-line"><div style={{ width: `${Math.min(100, ((lvl + (lvl < PASS_LEVELS ? into / PASS_XP : 0)) / PASS_LEVELS) * 100)}%` }} /></div>
        {Array.from({ length: PASS_LEVELS }, (_, i) => i + 1).map((l) => {
          const rr = passReward(l); const g = l <= lvl;
          return (
            <button key={l} data-l={l} className={`ps-tile r-${rr.rarity}${g ? " got" : ""}${l === lvl + 1 ? " next" : ""}${l === sel ? " sel" : ""}`} onClick={() => setSel(l)} aria-label={`Level ${l}: ${passRewardLabel(rr)}`}>
              <span className="ps-card">
                <span className="ps-tile-art"><PassArt r={rr} size={44} /></span>
                <span className="ps-tile-name">{rr.type === "chips" ? `${shortNum(rr.amount)} chips` : passTypeLabel(rr)}</span>
              </span>
              <span className="ps-node num">{g ? <Icon name="check" size={13} stroke={3.4} /> : l}</span>
            </button>
          );
        })}
      </div>
      <div style={{ fontSize: 12, color: "var(--t-mid)", marginTop: 12, textAlign: "center" }}>Swipe for every level. XP comes from hands, ranked matches, tournaments and challenges.</div>
    </Modal>
  );
}

export { ChallengesCard, PassCard, PassModal, StreakBanner, kNum };
