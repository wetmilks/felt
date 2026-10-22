import { CLUB_COLORS } from "../../api/_clubrules.js";

export const clubHex = (c) => CLUB_COLORS[c] || CLUB_COLORS.red;
// light club colors get dark lettering so the tag stays readable
const DARK_TEXT = { gold: true, teal: true, orange: true };
export const clubInk = (c) => (DARK_TEXT[c] ? "#111214" : "#FFFFFF");

// The tag that sits next to a name. Level 3 clubs get a gold rim, level 5 a foil finish.
export function ClubTag({ club, big = false, style }) {
  if (!club || !club.tag) return null;
  const lvl = club.lvl || club.level || 1;
  return <span className={`club-tag${big ? " big" : ""}${lvl >= 5 ? " foil" : lvl >= 3 ? " rim" : ""}`} style={{ "--cc": clubHex(club.color), "--ct": clubInk(club.color), ...style }} title={`${club.tag} club`}>{club.tag}</span>;
}

// A club's crest: a poker chip in the club color with the tag stamped in the middle
export function ClubCrest({ club, size = 64 }) {
  const lvl = (club && (club.level || club.lvl)) || 1;
  const tag = (club && club.tag) || "?";
  return (
    <span className={`club-crest${lvl >= 5 ? " foil" : lvl >= 3 ? " rim" : ""}`} style={{ "--cc": clubHex(club && club.color), "--ct": clubInk(club && club.color), width: size, height: size, borderWidth: Math.max(4, Math.round(size * 0.095)) }} aria-hidden="true">
      <span className="cc-core" style={{ fontSize: Math.round(size * (tag.length > 3 ? 0.21 : 0.26)) }}>{tag}</span>
    </span>
  );
}

// club tables at level 2 and up use the club's color for the felt
function shade(hex, k) { const n = parseInt(hex.slice(1), 16); const f = (v) => Math.round(v * k).toString(16).padStart(2, "0"); return `#${f(n >> 16)}${f((n >> 8) & 255)}${f(n & 255)}`; }
export function clubFelt(club) {
  const hex = clubHex(club && club.color);
  return { key: `club-${club.color}`, c1: shade(hex, 0.78), c2: shade(hex, 0.56), c3: shade(hex, 0.34), rail: "#16171A", line: "rgba(242,242,238,0.35)" };
}

// +12,400 or -800, for weekly winnings
export const signed = (v) => `${v > 0 ? "+" : v < 0 ? "-" : ""}${Math.abs(Math.round(v || 0)).toLocaleString()}`;
export function shortSigned(v) {
  const a = Math.abs(Math.round(v || 0)); const s = v > 0 ? "+" : v < 0 ? "-" : "";
  return s + (a >= 1e6 ? `${(a / 1e6).toFixed(a >= 1e7 ? 0 : 1).replace(/\.0$/, "")}M` : a >= 1e4 ? `${Math.round(a / 1e3)}K` : a.toLocaleString());
}
// "12h" or "3 days", for tight spots
export function shortIn(ms) { const h = Math.floor(ms / 3600000); return h >= 48 ? `${Math.floor(h / 24)} days` : h >= 1 ? `${h}h` : `${Math.max(1, Math.floor(ms / 60000))}m`; }
export function resetIn(ms) {
  const h = Math.max(0, Math.floor(ms / 3600000));
  if (h >= 48) return `${Math.floor(h / 24)} days`;
  if (h >= 1) return `${h}h ${Math.floor((ms % 3600000) / 60000)}m`;
  return `${Math.max(1, Math.floor(ms / 60000))}m`;
}

// weekly board medals, as little gold, silver and bronze chips with a count
export function MedalPills({ c }) {
  if (!c) return null;
  const cols = { g: ["#EDB000", "#CD9300", "1st"], s: ["#C9D4E2", "#A9B4C2", "2nd"], b: ["#E6812D", "#C56019", "3rd"] };
  return <>{Object.entries(c).filter(([, n]) => n > 0).map(([k, n]) => <span key={k} className="chip-pill num medal-pill" title={`${n} weekly ${cols[k][2]} place finish${n > 1 ? "es" : ""}`}><span className="medal-dot" style={{ width: 16, height: 16, background: `repeating-conic-gradient(${cols[k][0]} 0 30deg, ${cols[k][1]} 30deg 45deg)` }} />{n}</span>)}</>;
}
