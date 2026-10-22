import { useRef, useEffect, useState } from "react";
import { TABLE_SIZES } from "../../game/helpers.js";
import { VARIANTS } from "../../game/poker.js";
import { DIV_SIZE, PLACEMENT_MATCHES, RANKED_BUYIN, RANKED_MATCH_HANDS, RANK_TIERS, ROMAN, divisionOf, isPlaced, rankName, rankProgress, tierForRating, tierOf } from "../../game/ranked.js";
import { PRESTIGE_PERKS, PRESTIGE_REWARD, PrestigeBadge } from "../../game/rewards.jsx";
import { daysLeftInSeason } from "../../game/season.js";
import { Toggle } from "../../ui/controls.jsx";
import { Icon, Modal, TierBadge } from "../../ui/primitives.jsx";

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
// Every rank from the top down as a chip, where you sit, and what prestige gets you
function RankLadderModal({ ranked, legendNo, onClose }) {
  const placed = isPlaced(ranked);
  const rating = placed ? Math.round(ranked.rating) : null;
  const myTier = tierOf(ranked);
  const meRef = useRef(null);
  useEffect(() => { if (meRef.current && meRef.current.scrollIntoView) meRef.current.scrollIntoView({ block: "center" }); }, []);
  const pres = ranked.prestige || 0;
  const peakTier = placed ? tierForRating(ranked.peakRating || ranked.rating) : null;
  const myDiv = placed ? divisionOf(ranked.rating) : null;
  const [how, setHow] = useState(false);
  return (
    <Modal title="All ranks" onClose={onClose} width={460} stripe={placed ? myTier.color : "#A3A6AD"}>
      <div style={{ fontSize: 13, color: "var(--t-mid)", margin: "-8px 0 14px" }}>{placed ? `Each tier is 300 RP, split into I, II and III. You have ${rating.toLocaleString()} RP.` : `Play ${PLACEMENT_MATCHES - (ranked.placementGames || []).length} more placement ${PLACEMENT_MATCHES - (ranked.placementGames || []).length === 1 ? "match" : "matches"} to get your rank.`}</div>
      <ol className="lad-list">
        {RANK_TIERS.slice().reverse().map((t) => {
          const isChamp = t.key === "champion";
          const here = placed && myTier.key === t.key;
          const owned = (ranked.frames || []).includes(t.key);
          const range = isChamp ? "1,500+ · Top players get a Legend number" : `${t.min.toLocaleString()} to ${(t.min + 299).toLocaleString()}`;
          const extra = !here && peakTier && peakTier.key === t.key ? " · Your peak" : !here && owned && t.min > 0 ? " · Frame unlocked" : "";
          return (
            <li key={t.key} ref={here ? meRef : null} className={`lad-row${here ? " here" : ""}`} style={{ "--lc": t.color }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <TierBadge tier={t} size={42} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className="lad-name" style={{ color: t.color }}>{t.label}</span>
                  <span className="lad-sub">{range}{extra}</span>
                </span>
                {here && <span className="lad-you">{isChamp ? (legendNo ? `LEGEND #${legendNo}` : "YOU") : `YOU · ${ROMAN[myDiv]}`}</span>}
              </div>
              {here && !isChamp && (
                <div className="lad-divs">
                  {[1, 2, 3].map((d) => {
                    const lo = t.min + (d - 1) * DIV_SIZE;
                    const fill = rating >= lo + DIV_SIZE ? 100 : rating >= lo ? ((rating - lo) / DIV_SIZE) * 100 : 0;
                    return (
                      <div key={d}>
                        <div className="lad-seg"><div style={{ width: `${fill}%` }} /></div>
                        <div className={`lad-dl${d === myDiv ? " on" : ""}`}>{ROMAN[d]}{d === myDiv ? ` · ${rating.toLocaleString()}` : ""}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </li>
          );
        })}
      </ol>

      <section className="lad-prestige">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
          <div className="disp" style={{ fontSize: 24 }}>Prestige</div>
          <div className="lbl">{pres ? `You have ${pres}` : "None yet"}</div>
        </div>
        <div style={{ fontSize: 12.5, lineHeight: 1.45, color: "var(--t-mid)", marginTop: 4 }}>Finish a month at Champion to earn one, plus {PRESTIGE_REWARD.toLocaleString()} chips. You keep your rank, and each one unlocks gear. Season ends in {daysLeftInSeason()} days.</div>
        <div className="lad-perks">
          {PRESTIGE_PERKS.map((pk) => {
            const got = pres >= pk.n;
            return (
              <div key={pk.n} className={`lad-perk${got ? " got" : ""}`}>
                <div className="disp" style={{ fontSize: 18, color: got ? "var(--t-accent)" : "var(--t-mid)" }}>P{pk.n}{got ? " · Yours" : ""}</div>
                <div style={{ fontSize: 11.5, color: got ? "var(--t-text2)" : "var(--t-mid)", marginTop: 2, lineHeight: 1.3 }}>{pk.label.replace("Prestige Gold card back", "Gold card back").replace("Gold shimmer on your name", "Gold name shimmer")}</div>
              </div>
            );
          })}
        </div>
      </section>

      {(ranked.history || []).length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div className="lbl" style={{ marginBottom: 8 }}>Past seasons</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
            {(ranked.history || []).slice().reverse().slice(0, 6).map((h) => {
              const t = tierForRating(h.rating); const [yy, mm] = String(h.seasonId).split("-");
              return (
                <div key={h.seasonId} className="spec" style={{ padding: "8px 10px" }}>
                  <span className="lbl">{new Date(+yy, +mm - 1, 1).toLocaleString("en-US", { month: "short" })}</span>
                  <b style={{ color: t.color, fontSize: 17 }}>{rankName(h.rating).replace("Platinum", "Plat").replace("Diamond", "Dia")}</b>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <button className="lad-how" onClick={() => setHow((v) => !v)} aria-expanded={how}>How RP works<Icon name="chevron" size={14} stroke={2.4} style={{ transform: how ? "rotate(-90deg)" : "rotate(90deg)", transition: "transform .2s ease" }} /></button>
      {how && (
        <div style={{ fontSize: 13, lineHeight: 1.5, color: "var(--t-mid)" }}>
          <p style={{ margin: "0 0 8px" }}>Each ranked match is {RANKED_MATCH_HANDS} hands. Where you finish in chips decides most of it: first place is the big gain, last place the big loss. Clearing the table, knockouts, smart decisions and win streaks add more. Leaving early costs 30 RP.</p>
          <p style={{ margin: 0 }}>Higher ranks match you against tougher players. Champion has no divisions. Instead you get a Legend number, your spot among every real player at Champion. When a new season starts, everyone's RP comes partway back toward Gold, but nobody drops to Bronze.</p>
        </div>
      )}
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
  const lit = placed ? Math.round(prog.pct * 10) : 0;
  return (
    <section className="rk-card" style={{ "--sc": placed ? tier.color : "#A3A6AD" }}>
      <div className="stripe" />
      <div className="rk-body">
        <div className="rk-top"><span className="lbl">Ranked · {month}</span><button className="rk-link" onClick={onInfo}>All ranks</button></div>
        {placed ? (
          <div className="rk-main">
            <div className="rk-rp num">{Math.round(ranked.rating).toLocaleString()}</div>
            <div style={{ paddingBottom: 6, minWidth: 0 }}>
              <div className="rk-tier" style={{ color: tier.color }}>{legendLabel(ranked, legendNo) || rankName(ranked.rating)}<PrestigeBadge n={ranked.prestige} size={18} /></div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--t-mid)", marginTop: 3 }}>RP · {prog.nextLabel ? `${prog.toNext} to ${prog.nextLabel}` : legendNo ? "finish the month here for a prestige" : "top of the ladder"}</div>
            </div>
          </div>
        ) : (
          <div className="rk-main">
            <div className="rk-rp num">{games.length}<span style={{ fontSize: 44, color: "var(--t-mid)" }}>/{PLACEMENT_MATCHES}</span></div>
            <div style={{ paddingBottom: 6, minWidth: 0 }}>
              <div className="rk-tier">Placements</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--t-mid)", marginTop: 3 }}>We read your game to set your rank</div>
            </div>
          </div>
        )}
        {placed ? (
          <div className="rk-segs" aria-hidden="true">{Array.from({ length: 10 }, (_, i) => <span key={i} style={i < lit ? { background: tier.color } : undefined} />)}</div>
        ) : (
          <div className="rk-segs" style={{ gridTemplateColumns: `repeat(${PLACEMENT_MATCHES}, minmax(0, 1fr))` }} aria-label={`${games.filter((g) => g.won).length} wins in ${games.length} placement matches`}>
            {Array.from({ length: PLACEMENT_MATCHES }, (_, i) => <span key={i} style={games[i] ? { background: games[i].won ? "var(--c-green)" : "var(--c-red)" } : undefined} />)}
          </div>
        )}
        <div className="rk-wl">
          {placed && ranked.wins + ranked.losses > 0 && <><span><b>{ranked.wins}</b> wins</span><span><b>{ranked.losses}</b> losses</span>{ranked.streak >= 2 && <span><b>W{ranked.streak}</b> streak</span>}</>}
          <span style={{ marginLeft: "auto" }}>{daysLeftInSeason()} days left</span>
        </div>
        <button className="btn btn-raise big-cta" disabled={locked} onClick={onPlay}>
          {locked ? `Need ${RANKED_BUYIN.toLocaleString()} chips` : placed ? "Play ranked" : `Placement match ${games.length + 1}`}
        </button>
      </div>
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

export { RankLadderModal, RankedCard, SizePicker, TurboRow, hoursLeftToday, idToCode, legendLabel };
