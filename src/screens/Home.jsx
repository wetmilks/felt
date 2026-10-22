import { useState } from "react";
import { cloudEnabled } from "../cloud.js";
import { STAKES_TIERS, TABLE_SIZES } from "../game/helpers.js";
import { streakState } from "../game/progression.js";
import { PLACEMENT_MATCHES, RANKED_BUYIN, RANKED_MATCH_HANDS, RANKED_STAKES, isPlaced, rankName, tierForRating, tierOf } from "../game/ranked.js";
import { HIGH_ROLLER_MIN, HIGH_ROLLER_TABLES, matchRating, spinReady } from "../game/rewards.jsx";
import { PAYOUTS, TOURNEY_BUYINS, TOURNEY_STACK } from "../game/skill.js";
import { ChallengesCard, PassCard, PassModal, StreakBanner } from "./home/Progress.jsx";
import { RankLadderModal, RankedCard, SizePicker, TurboRow } from "./home/RankedCard.jsx";
import { SpinCard, SpinModal, VipCard } from "./home/SpinVip.jsx";
import { FriendsTableCard } from "../social/FriendsTable.jsx";
import { ordinal } from "../ui/hooks.js";
import { FeltLogo, Icon, Modal } from "../ui/primitives.jsx";

const STAKE_CHIP = { micro: "#F2F2EE", low: "#F51E1D", high: "#196EFE" };
const PODIUM = [["#EDB000", "#CD9300"], ["#C9D4E2", "#A9B4C2"], ["#E6812D", "#C56019"]];
function HomeMenu({ onPlayAI, onFriendsTable, onEquipPass, topCards, data, chips, ranked, legendNo, onClaimDaily, onClaimChallenge, onSpin, onPrestige, sound }) {
  const [modal, setModal] = useState(null); // "ranked" | "cash" | "tournament" | "pass"
  const [passFocus, setPassFocus] = useState(null);
  const [size, setSize] = useState(TABLE_SIZES[1]);
  const [tBuyIn, setTBuyIn] = useState(TOURNEY_BUYINS[0]);
  const [turbo, setTurbo] = useState(false);
  const placed = isPlaced(ranked);
  const tier = tierOf(ranked);
  const close = () => setModal(null);
  const st = streakState(data.streak);
  const streakCount = st.claimedToday ? data.streak.count : st.nextDay > 1 ? st.nextDay - 1 : 0;
  const modes = [
    { key: "cash", title: "Cash", sub: "Rebuy anytime", color: "#F51E1D", core: "$", act: () => setModal("cash") },
    { key: "tournament", title: "Tourney", sub: "Real payouts", color: "#196EFE", core: <Icon name="trophy" size={24} stroke={2.2} />, act: () => setModal("tournament") },
    { key: "practice", title: "Practice", sub: "Tips as you play", color: "#00A560", core: <Icon name="cap" size={24} stroke={2.2} />, act: () => onPlayAI({ mode: "practice", tableSize: TABLE_SIZES[1], stakes: { sb: 10, bb: 20 } }) },
  ];
  return (
    <div className="screen screen-fade scr-wide">
      <header className="home-head">
        <FeltLogo className="home-logo" />
        <div style={{ display: "flex", alignItems: "flex-end", gap: 14 }}>
          {streakCount > 0 && <div className="streak-pill num" title="Login streak"><Icon name="flame" size={14} stroke={2.4} />{streakCount}</div>}
          <div className="home-chips"><b className="num">{chips.toLocaleString()}</b><span>CHIPS</span></div>
        </div>
      </header>

      <div className="home-stack">
        <div className="home-main">
        <div className="hs-item" style={{ order: 4 }}><RankedCard ranked={ranked} legendNo={legendNo} chips={chips} onPlay={() => setModal("ranked")} onInfo={() => setModal("ladder")} /></div>
        <div className="hs-item mode-chips" style={{ order: 5 }}>
          {modes.map((o) => (
            <button key={o.key} className="mode-chip" onClick={o.act} style={{ "--cc": o.color }}>
              <span className="mc-disc"><span className="mc-core">{o.core}</span></span>
              <span className="mc-name">{o.title}</span>
              <span className="mc-sub">{o.sub}</span>
            </button>
          ))}
        </div>
        {cloudEnabled() && onFriendsTable && <div className="hs-item" style={{ order: 6 }}><FriendsTableCard onOpen={onFriendsTable} /></div>}
        <div className="hs-item" style={{ order: 7 }}><VipCard chips={chips} onOpen={() => setModal("vip")} /></div>
        </div>
        <div className="home-side">
        <div className="hs-item" style={{ order: 1 }}>{topCards}</div>
        <div className="hs-item" style={{ order: 2 }}><StreakBanner streak={data.streak} onClaim={onClaimDaily} /></div>
        <div className="hs-item" style={{ order: 3 }}><SpinCard ready={spinReady(data)} onOpen={() => setModal("spin")} /></div>
        <div className="hs-item" style={{ order: 8 }}><PassCard pass={data.pass} onOpen={(l) => { setPassFocus(l); setModal("pass"); }} /></div>
        <div className="hs-item" style={{ order: 9 }}><ChallengesCard challenges={data.challenges} onClaim={onClaimChallenge} /></div>
        </div>
      </div>

      {modal === "pass" && <PassModal pass={data.pass} data={data} focus={passFocus} onClose={close} onEquip={onEquipPass} />}
      {modal === "spin" && <SpinModal ready={spinReady(data)} onSpin={onSpin} onClose={close} sound={sound} />}
      {modal === "ladder" && <RankLadderModal ranked={ranked} legendNo={legendNo} onClose={close} />}
      {modal === "vip" && (
        <Modal onClose={close} width={460} className="hr-sheet">
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: -4 }}><button className="iconbtn" onClick={close} aria-label="Close"><Icon name="close" size={15} stroke={2.4} /></button></div>
          <div className="hr-head">
            <span className="hr-crest"><Icon name="crown" size={32} stroke={1.8} /></span>
            <div className="lbl" style={{ color: "#EDB000", letterSpacing: "0.3em", marginTop: 20 }}>felt private room</div>
            <div className="hr-big">The High<br />Roller Room</div>
            <p className="hr-body-txt">{chips >= HIGH_ROLLER_MIN ? "Sharp players, big blinds, no hand odds. You read the table yourself. Your whole bankroll sits down with you." : `Members only. Get to ${HIGH_ROLLER_MIN.toLocaleString()} chips to get in. You have ${chips.toLocaleString()}.`}</p>
          </div>
          <div className="lbl" style={{ color: "#B9B3A6", margin: "20px 0 8px" }}>Table size</div>
          <SizePicker value={size} onChange={setSize} />
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
            {HIGH_ROLLER_TABLES.map((t, i) => {
              const locked = chips < t.minBankroll;
              return (
                <button key={t.key} disabled={locked} className="hr-row" onClick={() => onPlayAI({ mode: "cash", tableSize: size, stakes: t, vip: true })}>
                  <span className="hr-no">{i === 0 ? "I" : "II"}</span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span className="hr-name">{t.label}</span>
                    <span className="hr-meta num">Blinds {t.sb.toLocaleString()}/{t.bb.toLocaleString()} · {locked ? `Needs ${t.minBankroll.toLocaleString()}` : `Min ${t.minBankroll.toLocaleString()}`}</span>
                  </span>
                  {locked ? <Icon name="lock" size={18} stroke={2} style={{ color: "#B9B3A6", flexShrink: 0 }} /> : <span className="hr-sit">SIT</span>}
                </button>
              );
            })}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, padding: "12px 16px", borderRadius: 14, border: "1px dashed rgba(237,176,0,0.35)" }}>
            <span className="lbl" style={{ color: "#B9B3A6" }}>Your bankroll</span>
            <span className="disp num" style={{ fontSize: 26, color: "#EDB000" }}>{chips.toLocaleString()}</span>
          </div>
        </Modal>
      )}

      {modal === "ranked" && (
        <Modal title={placed ? "Ranked match" : `Placement ${(ranked.placementGames || []).length + 1} of ${PLACEMENT_MATCHES}`} onClose={close} stripe={placed ? tier.color : "#A3A6AD"}>
          <div style={{ fontSize: 13, color: "var(--t-mid)", margin: "-8px 0 16px" }}>{placed ? <>You're <b style={{ color: tier.color }}>{rankName(ranked.rating)}</b>, {Math.round(ranked.rating).toLocaleString()} RP</> : "Five matches to find where you start"}</div>
          <div className="lbl" style={{ marginBottom: 8 }}>Table size</div>
          <SizePicker value={size} onChange={setSize} />
          <div className="spec-grid">
            <div className="spec"><span className="lbl">Buy-in</span><b className="num">{RANKED_BUYIN.toLocaleString()}</b></div>
            <div className="spec"><span className="lbl">Blinds</span><b className="num">{RANKED_STAKES.sb}/{RANKED_STAKES.bb}</b></div>
            <div className="spec"><span className="lbl">Length</span><b className="num">{RANKED_MATCH_HANDS} hands</b></div>
            <div className="spec"><span className="lbl">Game</span><b>Hold'em</b></div>
            <div className="spec"><span className="lbl">Rebuys</span><b>None</b></div>
            <div className="spec"><span className="lbl">Versus</span><b style={{ color: placed ? tierForRating(matchRating(ranked)).color : "var(--t-text)", fontSize: 19 }}>{placed ? rankName(matchRating(ranked)).replace("Platinum", "Plat") : "Mixed"}</b></div>
          </div>
          <div className="pro-note">
            <Icon name="eye" size={20} stroke={2} style={{ color: "var(--t-accent)", flexShrink: 0, marginTop: 1 }} />
            <div>
              <div className="disp" style={{ fontSize: 17, fontWeight: 800 }}>Pro mode</div>
              <div style={{ fontSize: 12.5, lineHeight: 1.45, color: "var(--t-mid)", marginTop: 2 }}>No hand names and no win odds. You read the table yourself.</div>
            </div>
          </div>
          <p className="sheet-body">{placed
            ? `Finish in the top half in chips to climb. The higher you finish, the more you gain. Knock everyone out for the biggest jump. Leaving early counts as a loss.`
            : `Every call, fold and raise gets checked against the odds. After ${PLACEMENT_MATCHES} matches that read decides where you start.`}</p>
          <button className="btn btn-raise big-cta" style={{ marginTop: 0 }} onClick={() => onPlayAI({ mode: "ranked", tableSize: size, stakes: RANKED_STAKES, buyIn: RANKED_BUYIN })}>Find match</button>
        </Modal>
      )}

      {modal === "cash" && (
        <Modal title="Cash game" onClose={close} stripe="#F51E1D">
          <div className="lbl" style={{ marginBottom: 8 }}>Table size</div>
          <SizePicker value={size} onChange={setSize} />
          <div style={{ fontSize: 12.5, color: "var(--t-mid)", margin: "8px 2px 0" }}>{size.sub}</div>
          <TurboRow on={turbo} onToggle={() => setTurbo((t) => !t)} />
          <div className="lbl" style={{ margin: "16px 0 8px" }}>Stakes</div>
          <div className="list">
            {STAKES_TIERS.map((t) => {
              const locked = chips < t.minBankroll;
              const c = STAKE_CHIP[t.key] || "#EDB000";
              return (
                <button key={t.key} disabled={locked} className="stake-row" onClick={() => onPlayAI({ mode: "cash", tableSize: size, stakes: t, turbo })}>
                  <span className="chip-ic" style={{ width: 44, height: 44, borderWidth: 5, "--cc": c, ...(c === "#F2F2EE" ? { borderColor: "#111214" } : {}) }} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span className="row-title" style={{ display: "block" }}>{t.label.replace(/ Stakes$/, "")}</span>
                    <span className="row-sub num" style={{ display: "block" }}>Blinds {t.sb}/{t.bb} · {t.minBankroll ? `Needs ${t.minBankroll.toLocaleString()}` : "Anyone can sit"}</span>
                  </span>
                  <Icon name={locked ? "lock" : "chevron"} size={16} stroke={2.4} style={{ color: "var(--t-mid)", flexShrink: 0 }} />
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
        const pool = tBuyIn.buyIn * field;
        return (
          <Modal title="Tournament" onClose={close} stripe="#196EFE">
            <div className="lbl" style={{ marginBottom: 8 }}>Players</div>
            <SizePicker value={size} onChange={setSize} />
            <div className="lbl" style={{ margin: "16px 0 8px" }}>Buy-in</div>
            <div className="seg">
              {TOURNEY_BUYINS.map((b) => (
                <button key={b.key} className={`segbtn${tBuyIn.key === b.key ? " on" : ""}`} disabled={chips < b.buyIn} style={{ opacity: chips < b.buyIn ? 0.4 : 1 }} onClick={() => setTBuyIn(b)}>{b.label}</button>
              ))}
            </div>
            <div className="prize-box">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}><span className="lbl">Prize pool</span><span style={{ fontSize: 12.5, color: "var(--t-mid)" }}>Start with {TOURNEY_STACK.toLocaleString()} chips</span></div>
              <div className="disp num" style={{ fontSize: 48, marginTop: 4 }}>{pool ? pool.toLocaleString() : "Freeroll"}</div>
              {pool > 0 && (
                <div className="prize-bars">
                  {pays.map((x, i) => (
                    <div key={i}><i style={{ height: 20 + x * 60, background: `repeating-linear-gradient(180deg, ${PODIUM[i][0]} 0 8px, ${PODIUM[i][1]} 8px 10px)` }} /><span className="num">{ordinal(i + 1).toUpperCase()} · {Math.round(x * pool).toLocaleString()}</span></div>
                  ))}
                </div>
              )}
            </div>
            <TurboRow on={turbo} onToggle={() => setTurbo((t) => !t)} tournament />
            <p className="sheet-body">Blinds start at 10/20 and go up every {turbo ? 3 : 5} hands. Cashing earns tournament index points, and bigger buy-ins and deeper runs score more.</p>
            <button className="btn btn-raise big-cta" style={{ marginTop: 0 }} disabled={!canAfford} onClick={() => onPlayAI({ mode: "tournament", tableSize: size, stakes: { sb: 10, bb: 20 }, buyIn: tBuyIn.buyIn, turbo })}>{tBuyIn.buyIn ? `Buy in for ${tBuyIn.buyIn.toLocaleString()}` : "Start freeroll"}</button>
          </Modal>
        );
      })()}
    </div>
  );
}

export { HomeMenu };
