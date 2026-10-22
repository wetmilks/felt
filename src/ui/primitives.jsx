import { useRef, useEffect } from "react";
import { SUIT_GLYPH } from "../game/helpers.js";
import { ROMAN, divisionOf, rankName, tierForRating } from "../game/ranked.js";
import { PRESTIGE_PERKS, PRESTIGE_REWARD } from "../game/rewards.jsx";
import { TITLE_RARITY, findTitle } from "../game/titles.jsx";
import { ordinal } from "./hooks.js";

const BODY_FONT = "'Inter', -apple-system, sans-serif";

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
  chat: ["M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"],
  search: ["M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z", "m20 20-3.5-3.5"],
  coach: ["M9 18h6", "M10 22h4", "M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.2 1 2V17h6v-.3c0-.8.4-1.5 1-2A7 7 0 0 0 12 2z"],
};
function Icon({ name, size = 16, stroke = 1.8, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" style={style} aria-hidden="true">
      {ICON_PATHS[name].map((d, i) => <path key={i} d={d} />)}
    </svg>
  );
}
// A chip-style dial: progress ring outside, dashed rim inside, the score in the middle
function SkillDial({ sr, size = 64, max = 100, color: col }) {
  const color = col || (sr >= 70 ? "var(--t-good)" : sr >= 45 ? "var(--t-accent)" : "var(--t-bad)");
  const s = size, c0 = s / 2, ringW = s * 0.093, r = c0 - ringW / 2, circ = 2 * Math.PI * r;
  const inner = s * 0.386;
  const showOf = s >= 80;
  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} style={{ flexShrink: 0, display: "block" }} role="img" aria-label={`Skill Rating ${sr} of ${max}`}>
      <circle cx={c0} cy={c0} r={r} fill="none" stroke="#2C2F35" strokeWidth={ringW} />
      <circle cx={c0} cy={c0} r={r} fill="none" style={{ stroke: color }} strokeWidth={ringW} strokeDasharray={circ} strokeDashoffset={circ * (1 - Math.max(0, Math.min(1, sr / max)))} transform={`rotate(-90 ${c0} ${c0})`} />
      <circle cx={c0} cy={c0} r={inner} fill="#111214" stroke="#2C2F35" strokeWidth={s * 0.042} strokeDasharray={`${s * 0.06} ${s * 0.045}`} />
      <text x={c0} y={showOf ? c0 + s * 0.1 : c0 + s * 0.15} textAnchor="middle" fill="#F2F2EE" fontWeight="900" fontSize={s * (showOf ? 0.42 : 0.44)} fontFamily="'Big Shoulders Display', Impact, sans-serif">{sr}</text>
      {showOf && <text x={c0} y={c0 + s * 0.26} textAnchor="middle" fill="#A3A6AD" fontWeight="700" fontSize={s * 0.093} letterSpacing={s * 0.011} fontFamily="'Familjen Grotesk Variable', -apple-system, sans-serif">{`OF ${max}`}</text>}
    </svg>
  );
}
// Rank emblems grow as you climb: Bronze is a plain medallion, each tier adds a piece
// (shield, wings, spikes, a crystal, a crown), and pips under it show the division.
const BADGE_PAL = {
  unranked: ["#D5DCE8", "#7A8FB2", "#3B4C69"],
  bronze: ["#FFBC7B", "#D56F18", "#733300"],
  silver: ["#FFFFFF", "#B9C5D6", "#5B6E8B"],
  gold: ["#FFE993", "#F6B800", "#8C5E00"],
  platinum: ["#ADFFF2", "#00C6B7", "#005F57"],
  diamond: ["#D9EBFF", "#4791FF", "#102FD2"],
  champion: ["#FFD6FF", "#D041FF", "#5D00A1"],
};
const SHIELD = "M32 9 L49 15 V30 C49 41.5 41.5 49.5 32 55 C22.5 49.5 15 41.5 15 30 V15 Z";
const SHIELD_IN = "M32 14 L44.5 18.5 V30 C44.5 39 39 45.5 32 49.8 C25 45.5 19.5 39 19.5 30 V18.5 Z";
const CRYSTAL = "M32 6 L47 17 L47 37 L32 56 L17 37 L17 17 Z";
const CRYSTAL_IN = "M32 11.5 L42.5 19.5 L42.5 35.5 L32 49.5 L21.5 35.5 L21.5 19.5 Z";
const WING_1 = "M16 22 C9 20.5 3.5 24.5 2.5 31 C6.5 28.5 11 28.2 16 29.5 Z";
const WING_2 = "M16 30 C10 30.5 5.5 35 5.2 41 C8.6 37.6 12.2 36.6 16.5 37 Z";
const WING_3 = "M17.5 38 C13 39.5 10 43.5 10.3 48.5 C13 45.5 16 44.3 19.5 44 Z";
// A rank is a poker chip in the tier's color. The middle shows your division.
function TierBadge({ tier, size = 28, div = null }) {
  const k = tier.key in BADGE_PAL ? tier.key : "unranked";
  const col = k === "unranked" ? "#7A7E86" : tier.color;
  const label = k === "champion" ? null : div ? ROMAN[div] : k === "unranked" ? "?" : null;
  const showText = size >= 22;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label={`${tier.label}${div ? ` ${ROMAN[div]}` : ""}`} style={{ flexShrink: 0, display: "block", overflow: "visible" }}>
      <circle cx="32" cy="32" r="30" fill={col} />
      <circle cx="32" cy="32" r="25.5" fill="none" stroke="#F2F2EE" strokeWidth="9" strokeDasharray="10 10.03" />
      <circle cx="32" cy="32" r="17.5" fill="rgba(0,0,0,0.2)" />
      {k === "champion" && <path d="M20 39 L22 25 L28 31 L32 22 L36 31 L42 25 L44 39 Z" fill="#F2F2EE" stroke="rgba(0,0,0,0.3)" strokeWidth="1.5" strokeLinejoin="round" />}
      {label && showText && <text x="32" y="32" dy="0.35em" textAnchor="middle" fontSize={label.length > 2 ? 17 : 21} fontWeight="900" fill="#FFFFFF" stroke="rgba(0,0,0,0.35)" strokeWidth="2.5" paintOrder="stroke" fontFamily="'Big Shoulders Display', Impact, sans-serif">{label}</text>}
    </svg>
  );
}
// A full-screen page for moments that deserve the whole phone: the spin, signing in, a season ending
function FullScreen({ label, onClose, className = "", children }) {
  const closeRef = useRef(onClose); closeRef.current = onClose;
  useEffect(() => {
    const k = (e) => { if (e.key === "Escape" && closeRef.current) closeRef.current(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);
  return (
    <div className={`fs-page${className ? ` ${className}` : ""}`} role="dialog" aria-modal="true" aria-label={label}>
      <div className="fs-inner">{children}</div>
    </div>
  );
}
const ORD_WORDS = ["", "first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth"];
function SeasonEndScreen({ se, onClose }) {
  const [yy, mm] = String(se.seasonId).split("-");
  const month = new Date(+yy, +mm - 1, 1).toLocaleString("en-US", { month: "long" });
  const next = new Date(+yy, +mm, 1).toLocaleString("en-US", { month: "long" });
  const perk = PRESTIGE_PERKS.find((pk) => pk.n === se.prestige);
  const fromTier = tierForRating(se.from), toTier = tierForRating(se.to);
  const short = (r) => rankName(r).replace("Platinum", "Plat").replace("Diamond", "Dia");
  return (
    <FullScreen label={`${month} season is over`} onClose={onClose} className={`se-page${se.champ ? " champ" : ""}`}>
      <div className="se-rays" aria-hidden="true" style={{ "--rc": se.champ ? "rgba(237,176,0,0.14)" : "rgba(242,242,238,0.05)" }} />
      <div className="lbl se-kick">{month} is over</div>
      <h1 className="se-big">You finished<br /><span style={{ color: fromTier.color }}>{se.champ ? "Champion" : rankName(se.from)}</span></h1>
      <div className="se-emblem badge-pop">
        {se.champ ? (
          <div className="se-pchip">
            <span className="se-crown"><Icon name="crown" size={34} stroke={2} /></span>
            <b className="num">P{se.prestige}</b><span>Prestige</span>
          </div>
        ) : <TierBadge tier={fromTier} size={150} div={divisionOf(se.from)} />}
      </div>
      <p className="se-copy">{se.champ ? `That's your ${ORD_WORDS[se.prestige] || ordinal(se.prestige)} prestige. It stays on your profile forever.` : "Every month the ladder resets partway. Finish a month at Champion to earn a prestige."}</p>
      <div className="se-rows">
        {se.champ && <div className="se-row"><span className="chip-ic" style={{ "--cc": "#F51E1D", width: 34, height: 34 }} /><b>Prestige bonus</b><em className="num" style={{ color: "var(--t-good)" }}>+{PRESTIGE_REWARD.toLocaleString()}</em></div>}
        {se.champ && perk && <div className="se-row"><span className="chip-ic" style={{ "--cc": "#EDB000", width: 34, height: 34 }} /><b>{perk.label} unlocked</b><em>New</em></div>}
        <div className="se-row">
          <TierBadge tier={toTier} size={34} div={divisionOf(se.to)} />
          <span style={{ flex: 1, minWidth: 0 }}><b>{next} starts you at</b><i>Everyone's RP comes partway back. Nobody drops to Bronze.</i></span>
          <em style={{ color: toTier.color }}>{short(se.to)}</em>
        </div>
      </div>
      <div className="fs-bottom"><button className="btn btn-raise big-cta" onClick={onClose}>{se.champ ? "New season" : "Let's go"}</button></div>
    </FullScreen>
  );
}
function TitlePill({ k, style }) {
  const t = findTitle(k); const c = TITLE_RARITY[t.rarity];
  const leg = t.rarity === "legendary", common = t.rarity === "common";
  return <span className="title-pill" style={{ color: leg ? "#111214" : common ? "var(--t-text)" : c, background: leg ? "#EDB000" : common ? "#2E3036" : `${c}2E`, ...style }}>{t.label}</span>;
}
const SHOP_FEATURED = [["felt", "blackout", "Black hex weave with a gold rail."], ["back", "midnight", "A gold sunburst on midnight navy."], ["felt", "crimson", "Deep red lattice with gold thread."], ["felt", "royal", "Blue herringbone, old card room style."], ["back", "crimson", "Red rosette, cut like a banknote."], ["back", "emerald", "Green suits for the regulars."]];
// On a computer opponents sit around the oval, clockwise from your left. Slots are percent of the table area.
const SEAT_SLOTS = {
  1: [[50, 15]], 2: [[28, 17], [72, 17]], 3: [[10, 42], [50, 14], [90, 42]], 4: [[10, 50], [33, 15], [67, 15], [90, 50]],
  5: [[9, 60], [22, 20], [50, 13], [78, 20], [91, 60]], 6: [[9, 62], [12, 25], [37, 14], [63, 14], [88, 25], [91, 62]],
  7: [[8, 62], [11, 27], [31, 15], [50, 13], [69, 15], [89, 27], [92, 62]], 8: [[8, 64], [9, 31], [26, 16], [42, 13], [58, 13], [74, 16], [91, 31], [92, 64]],
  9: [[8, 66], [8, 34], [22, 17], [37, 13], [50, 12], [63, 13], [78, 17], [92, 34], [92, 66]],
};
const seatPos = (k, n) => { const row = SEAT_SLOTS[Math.max(1, Math.min(9, n))]; const p = row[k] || [50, 10]; return { "--sx": `${p[0]}%`, "--sy": `${p[1]}%` }; };
// The felt wordmark: lowercase, with a red diamond for the period
const LOGO_RED = "#E8202A";
const DIAMOND_PATH = "M50 3 C60 21 72 37 87 50 C72 63 60 79 50 97 C40 79 28 63 13 50 C28 37 40 21 50 3 Z";
function FeltLogo({ className = "" }) {
  return (
    <span className={`brand-logo${className ? ` ${className}` : ""}`} role="img" aria-label="felt">
      <span aria-hidden="true">felt</span>
      <svg viewBox="0 0 100 100" aria-hidden="true"><path fill={LOGO_RED} d={DIAMOND_PATH} /></svg>
    </span>
  );
}
function Modal({ title, onClose, children, width = 380, className = "", stripe }) {
  return (
    <div className={`scrim${className ? ` ${className}-scrim` : ""}`} onClick={onClose}>
      <div className={`sheet${className ? ` ${className}` : ""}`} style={{ maxWidth: width, ...(stripe ? { "--sheet-c": stripe } : {}) }} onClick={(e) => e.stopPropagation()} role="dialog" aria-label={title || undefined}>
        {title && (
          <div className="sheet-head">
            <div className="sheet-title">{title}</div>
            <button className="iconbtn" onClick={onClose} aria-label="Close"><Icon name="close" size={15} stroke={2.4} /></button>
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
  return <div className="sec-label"><h2>{children}</h2>{right && <span>{right}</span>}</div>;
}
// 119,975 becomes 120k so crowded tables still fit
const shortNum = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(1).replace(/\.0$/, "")}M` : n >= 1e5 ? `${Math.round(n / 1000)}k` : n >= 1e4 ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k` : n.toLocaleString());

export { DIAMOND_PATH, FeltLogo, FullScreen, Icon, LOGO_RED, MiniCard, Modal, SHOP_FEATURED, SeasonEndScreen, SectionLabel, SkillDial, TierBadge, TitlePill, seatPos, shortNum };
