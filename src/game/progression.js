import { currentSeasonId } from "./season.js";
import { boardWeek } from "../../api/_week.js";
import { defaultTitles, findTitle } from "./titles.jsx";

/* =========================================================================
   PROGRESSION: cosmetics, login streak, challenges, season pass
   ========================================================================= */
// Every back and felt is its own drawn pattern, laid over the item's colors.
const svgBg = (w, h, body) => `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}'>${body}</svg>`)}")`;
const PAT = (() => {
  const W = "#FFFFFF";
  const ring = (cx, cy) => Array.from({ length: 12 }, (_, k) => { const a = (k * 30 * Math.PI) / 180; return `<circle cx='${(cx + 5 * Math.cos(a)).toFixed(2)}' cy='${(cy + 5 * Math.sin(a)).toFixed(2)}' r='8.5' fill='none' stroke='${W}' stroke-opacity='0.42' stroke-width='0.45'/>`; }).join("");
  const rays = Array.from({ length: 18 }, (_, k) => { const a = (k * 20 * Math.PI) / 180, d = (3.2 * Math.PI) / 180, R = 60; const p = (t) => `${(20 + R * Math.cos(t)).toFixed(1)},${(28 + R * Math.sin(t)).toFixed(1)}`; return `<polygon points='20,28 ${p(a - d)} ${p(a + d)}' fill='#FBBE00' fill-opacity='0.2'/>`; }).join("");
  const spade = (x, y, sc, fill, op) => `<path transform='translate(${x} ${y}) scale(${sc})' d='M5 0C5 0 0 4.2 0 6.6C0 8.4 1.9 9.4 3.5 8.3L2.7 10.4H7.3L6.5 8.3C8.1 9.4 10 8.4 10 6.6C10 4.2 5 0 5 0Z' fill='${fill}' fill-opacity='${op}'/>`;
  const club = (x, y, sc, fill, op) => `<g transform='translate(${x} ${y}) scale(${sc})' fill='${fill}' fill-opacity='${op}'><circle cx='5' cy='2.6' r='2.5'/><circle cx='2.5' cy='6.4' r='2.5'/><circle cx='7.5' cy='6.4' r='2.5'/><path d='M4.2 6H5.8L6.9 10.4H3.1Z'/></g>`;
  return {
    classicTile: svgBg(6, 6, `<path d='M0 6L6 0M-1 1L1 -1M5 7L7 5' stroke='${W}' stroke-opacity='0.16' stroke-width='1.1'/><path d='M0 0L6 6' stroke='${W}' stroke-opacity='0.07' stroke-width='0.8'/>`),
    classicMark: svgBg(40, 56, `<ellipse cx='20' cy='28' rx='9' ry='12' fill='none' stroke='${W}' stroke-opacity='0.5' stroke-width='0.9'/><path d='M20 21.5L24 28L20 34.5L16 28Z' fill='${W}' fill-opacity='0.55'/>`),
    rosette: svgBg(40, 56, `${ring(20, 28)}<circle cx='20' cy='28' r='2' fill='${W}' fill-opacity='0.5'/>`),
    waves: svgBg(10, 5, `<path d='M0 2.5Q2.5 0.5 5 2.5T10 2.5' fill='none' stroke='${W}' stroke-opacity='0.14' stroke-width='0.6'/>`),
    suits: svgBg(16, 16, `${spade(1.5, 1.5, 0.5, W, 0.2)}${club(9.5, 9.5, 0.5, W, 0.2)}`),
    sunburst: svgBg(40, 56, `${rays}<circle cx='20' cy='28' r='6' fill='none' stroke='#FBBE00' stroke-opacity='0.75' stroke-width='0.8'/><circle cx='20' cy='28' r='2.2' fill='#FBBE00' fill-opacity='0.8'/>`),
    synthGrid: svgBg(8, 8, `<path d='M0 0.25H8M0.25 0V8' stroke='#FFCCEE' stroke-opacity='0.28' stroke-width='0.5'/>`),
    synthSun: svgBg(40, 56, `<defs><clipPath id='c'><circle cx='20' cy='26' r='9'/></clipPath></defs><g clip-path='url(#c)'><rect x='10' y='16' width='20' height='20' fill='#FFBD56' fill-opacity='0.85'/>${[27, 30, 33].map((y) => `<rect x='10' y='${y}' width='20' height='1.3' fill='#2C045B'/>`).join("")}</g>`),
    carbon: svgBg(6, 6, `<rect width='3' height='3' fill='${W}' fill-opacity='0.07'/><rect x='3' y='3' width='3' height='3' fill='${W}' fill-opacity='0.07'/><path d='M0 0.4H3M3 3.4H6' stroke='${W}' stroke-opacity='0.12' stroke-width='0.5'/>`),
    quilt: svgBg(10, 10, `<path d='M5 0L10 5L5 10L0 5Z' fill='none' stroke='#FEF4D0' stroke-opacity='0.55' stroke-width='0.6'/><path d='M5 0.9L9.1 5' stroke='#7C4D00' stroke-opacity='0.35' stroke-width='0.6'/>`),
    foilMark: svgBg(40, 56, `<circle cx='20' cy='28' r='9.5' fill='#8C5900' fill-opacity='0.55'/><circle cx='20' cy='28' r='9.5' fill='none' stroke='#FFF1BC' stroke-opacity='0.8' stroke-width='0.7'/>${spade(16, 23.5, 0.8, "#FFF1BC", 0.95)}`),
    // prestige: a twelve point gold star over violet quilting, only for players who've finished a season at Champion
    prestigeMark: svgBg(40, 56, `<circle cx='20' cy='28' r='11' fill='#1C043A' fill-opacity='0.75'/><polygon points='${Array.from({ length: 24 }, (_, k) => { const r = k % 2 ? 4.6 : 9.6; const a = (k * 15 - 90) * Math.PI / 180; return `${(20 + r * Math.cos(a)).toFixed(2)},${(28 + r * Math.sin(a)).toFixed(2)}`; }).join(" ")}' fill='#FBBE00'/><circle cx='20' cy='28' r='3.3' fill='#AA2AFF'/><circle cx='20' cy='28' r='11' fill='none' stroke='#FBBE00' stroke-opacity='0.7' stroke-width='0.6'/>`),
    prestigeQuilt: svgBg(8, 8, `<path d='M4 0L8 4L4 8L0 4Z' fill='none' stroke='#E5AFFE' stroke-opacity='0.22' stroke-width='0.6'/><circle cx='4' cy='4' r='0.6' fill='#FBBE00' fill-opacity='0.5'/>`),
    prestigeFelt: svgBg(30, 30, `<path d='M15 0L30 15L15 30L0 15Z' fill='none' stroke='#FBBE00' stroke-opacity='0.07'/><path d='M15 11L16.2 13.8L19 15L16.2 16.2L15 19L13.8 16.2L11 15L13.8 13.8Z' fill='#FBBE00' fill-opacity='0.08'/>`),
    holoQuilt: svgBg(8, 8, `<path d='M4 0L8 4L4 8L0 4Z' fill='none' stroke='#FFFFFF' stroke-opacity='0.35' stroke-width='0.6'/>`),
    holoMark: svgBg(40, 56, `<path d='M20 17L27 28L20 39L13 28Z' fill='#FFFFFF' fill-opacity='0.55'/><path d='M20 17L27 28L20 39L13 28Z' fill='none' stroke='#FFFFFF' stroke-opacity='0.9' stroke-width='0.7'/><ellipse cx='20' cy='28' rx='11' ry='15' fill='none' stroke='#FFFFFF' stroke-opacity='0.55' stroke-width='0.6'/>`),
    // the vault: the most expensive things in felt
    platMark: svgBg(40, 56, `<rect x='4' y='4' width='32' height='48' rx='3' fill='none' stroke='#5E6773' stroke-opacity='0.55' stroke-width='0.6'/><g transform='translate(20 28)'><path d='M-9 -3L-5 -8H5L9 -3L0 9Z' fill='${W}' fill-opacity='0.6' stroke='#5E6773' stroke-opacity='0.85' stroke-width='0.6'/><path d='M-9 -3H9M-5 -8L-2 -3L0 9L2 -3L5 -8M-2 -3L0 -8L2 -3' fill='none' stroke='#5E6773' stroke-opacity='0.75' stroke-width='0.5'/></g>`),
    brushed: svgBg(4, 4, `<path d='M0 1H4M0 3H4' stroke='${W}' stroke-opacity='0.2' stroke-width='0.4'/>`),
    decoMark: svgBg(40, 56, `<circle cx='20' cy='28' r='10.5' fill='#0B0B0D'/><circle cx='20' cy='28' r='10.5' fill='none' stroke='#E3B23C' stroke-width='0.9'/><circle cx='20' cy='28' r='8.4' fill='none' stroke='#E3B23C' stroke-opacity='0.55' stroke-width='0.5'/>${spade(16, 23.4, 0.8, "#E3B23C", 1)}`),
    deco: svgBg(12, 12, `<path d='M0 12A6 6 0 0 1 12 12M2 12A4 4 0 0 1 10 12M4 12A2 2 0 0 1 8 12M-6 6A6 6 0 0 1 6 6M-4 6A4 4 0 0 1 4 6M6 6A6 6 0 0 1 18 6M8 6A4 4 0 0 1 16 6' fill='none' stroke='#E3B23C' stroke-opacity='0.4' stroke-width='0.5'/>`),
    diamondFelt: svgBg(26, 26, `<path d='M13 0L26 13L13 26L0 13Z' fill='none' stroke='#E8ECF2' stroke-opacity='0.07' stroke-width='0.8'/><path d='M13 9.5L13.9 12.1L16.5 13L13.9 13.9L13 16.5L12.1 13.9L9.5 13L12.1 12.1Z' fill='${W}' fill-opacity='0.07'/>`),
    // felts
    herring: svgBg(16, 8, `<path d='M0 8L8 0M8 8L16 0' stroke='${W}' stroke-opacity='0.05' stroke-width='2.4'/><path d='M8 8L0 0M16 8L8 0' stroke='#000' stroke-opacity='0.05' stroke-width='2.4'/>`),
    lattice: svgBg(22, 22, `<path d='M11 0L22 11L11 22L0 11Z' fill='none' stroke='${W}' stroke-opacity='0.05'/>`),
    ripple: svgBg(60, 60, `${[8, 16, 24].map((r) => `<circle cx='30' cy='30' r='${r}' fill='none' stroke='${W}' stroke-opacity='0.045' stroke-width='1.2'/>`).join("")}`),
    hex: svgBg(14, 24, `<path d='M7 0L14 4V12L7 16L0 12V4Z M7 16V24' fill='none' stroke='${W}' stroke-opacity='0.06' stroke-width='0.8'/>`),
  };
})();
const CARD_BACKS = [
  { key: "blue", label: "Classic", cost: 0, a: "#0D68F8", b: "#054ABD", ring: "#FFFFFF", img: `${PAT.classicMark}, ${PAT.classicTile}`, size: "100% 100%, 6px 6px" },
  { key: "crimson", label: "Banknote", cost: 800, a: "#C80032", b: "#870020", ring: "#F4E9D8", img: `${PAT.rosette}, ${PAT.waves}`, size: "100% 100%, 10px 5px" },
  { key: "emerald", label: "Clubhouse", cost: 800, a: "#007B51", b: "#005337", ring: "#F2F5EF", img: PAT.suits, size: "12px 12px" },
  { key: "midnight", label: "Sunburst", cost: 2500, a: "#121C39", b: "#0A0F1F", ring: "#FBBE00", img: PAT.sunburst, size: "100% 100%" },
  { key: "neon", label: "Synthwave", pass: 10, a: "#6002BE", b: "#C8007A", ring: "#FFCCEE", img: `${PAT.synthSun}, ${PAT.synthGrid}, linear-gradient(180deg, #3D007D, #C8007A)`, size: "100% 100%, 7px 7px, 100% 100%" },
  { key: "carbon", label: "Carbon", pass: 20, a: "#22262E", b: "#121418", ring: "#9AA4B2", img: PAT.carbon, size: "5px 5px" },
  { key: "prestige", label: "Prestige Gold", prestige: 1, a: "#2D0154", b: "#160230", ring: "#FBBE00", img: `${PAT.prestigeMark}, ${PAT.prestigeQuilt}`, size: "100% 100%, 7px 7px" },
  { key: "holo", label: "Holo", pass: 25, anim: true, a: "#282D5D", b: "#131639", ring: "#F4F7FF", img: `${PAT.holoMark}, ${PAT.holoQuilt}, linear-gradient(115deg, #FF7FC1, #FFD57C, #79FECA, #7EC2FF, #C392FF, #FF7FC1, #FFD57C)`, size: "100% 100%, 7px 7px, 300% 300%" },
  { key: "platinum", label: "Platinum", cost: 400000, vault: true, a: "#D5DCE4", b: "#8A94A1", ring: "#FFFFFF", img: `${PAT.platMark}, ${PAT.brushed}, linear-gradient(135deg, #F6F8FB, #AEB8C4 48%, #E9EDF2 70%, #B9C2CD)`, size: "100% 100%, 4px 4px, 100% 100%" },
  { key: "blackgold", label: "Black Gold", cost: 750000, vault: true, a: "#0E0E10", b: "#050506", ring: "#E3B23C", img: `${PAT.decoMark}, ${PAT.deco}`, size: "100% 100%, 12px 12px" },
  { key: "foil", label: "Gold Foil", pass: 30, a: "#DFA200", b: "#9E6900", ring: "#FFF1BC", img: `${PAT.foilMark}, ${PAT.quilt}, linear-gradient(135deg, #FDD558, #CC8D00 50%, #FAC941)`, size: "100% 100%, 8px 8px, 100% 100%" },
];
const FELTS = [
  { key: "green", label: "Classic Green", cost: 0, c1: "#00A963", c2: "#008146", c3: "#005D31", rail: "#603714" },
  { key: "royal", label: "Herringbone", cost: 1500, c1: "#0072ED", c2: "#004EB8", c3: "#00337F", rail: "#2B2018", tex: PAT.herring, texSize: "16px 8px" },
  { key: "crimson", label: "Bordeaux", cost: 1500, c1: "#AB1035", c2: "#7A0224", c3: "#510016", rail: "#24170F", tex: PAT.lattice, texSize: "22px 22px", line: "rgba(242,188,78,0.55)" },
  { key: "purple", label: "Velvet", pass: 5, c1: "#9039ED", c2: "#6310B8", c3: "#3F057D", rail: "#221838", tex: "radial-gradient(40% 30% at 30% 30%, rgba(255,255,255,0.10), transparent 70%), radial-gradient(35% 28% at 72% 68%, rgba(255,255,255,0.07), transparent 70%), radial-gradient(30% 40% at 60% 20%, rgba(0,0,0,0.12), transparent 70%)", texSize: "100% 100%" },
  { key: "ocean", label: "Lagoon", pass: 15, c1: "#00B6AF", c2: "#007E78", c3: "#00524E", rail: "#EADCB8", tex: PAT.ripple, texSize: "60px 60px" },
  { key: "prestige", label: "Prestige", prestige: 2, c1: "#600CB2", c2: "#3E007D", c3: "#23004D", rail: "#D1A021", tex: PAT.prestigeFelt, texSize: "30px 30px", line: "rgba(251,190,0,0.55)" },
  { key: "aurora", label: "Aurora", pass: 28, anim: true, c1: "#00475E", c2: "#002C3E", c3: "#051A23", rail: "#1B2433", tex: "linear-gradient(115deg, rgba(0,213,150,0.42), rgba(17,190,255,0.16) 25%, rgba(163,43,254,0.38) 50%, rgba(0,213,150,0.14) 75%, rgba(17,190,255,0.4))", texSize: "300% 300%", line: "rgba(121,254,202,0.35)" },
  { key: "diamond", label: "Black Diamond", cost: 250000, vault: true, c1: "#3B414C", c2: "#23272F", c3: "#111318", rail: "#C9D1DC", tex: PAT.diamondFelt, texSize: "26px 26px", line: "rgba(232,236,242,0.45)" },
  { key: "blackout", label: "Onyx", cost: 4000, c1: "#2C323C", c2: "#191D24", c3: "#0D0F13", rail: "#D1A021", tex: PAT.hex, texSize: "14px 24px", line: "rgba(209,160,33,0.5)" },
];
const findBack = (k) => CARD_BACKS.find((b) => b.key === k) || CARD_BACKS[0];
// prestige gear isn't bought, it unlocks when your prestige count gets there
const ownsCosmetic = (cos, field, item, prestige) => (cos[field] || []).includes(item.key) || item.cost === 0 || (!!item.prestige && (prestige || 0) >= item.prestige);
const findFelt = (k) => FELTS.find((f) => f.key === k) || FELTS[0];
function defaultCosmetics() { return { backs: ["blue"], felts: ["green"], cardBack: "blue", felt: "green", chipsets: ["classic"], chipset: "classic", fxs: ["confetti"], fx: "confetti" }; }

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
const RARITY = { common: "#9AA4B2", rare: "#329EFF", epic: "#AA61FF", legendary: "#FCB600" };
// Every level gives something. Chips fill the gaps, the rest you can only get here.
const PASS_TRACK = [null,
  { type: "chips", amount: 250 }, { type: "emote", key: "💰", rarity: "rare" }, { type: "chips", amount: 300 }, { type: "title", key: "nightshift", rarity: "rare" }, { type: "felt", key: "purple", rarity: "epic" },
  { type: "chips", amount: 400 }, { type: "chipset", key: "goldrush", rarity: "epic" }, { type: "emote", key: "🦈", rarity: "rare" }, { type: "chips", amount: 500 }, { type: "back", key: "neon", rarity: "epic" },
  { type: "avatar", key: "🦈", rarity: "rare" }, { type: "chips", amount: 600 }, { type: "fx", key: "coins", rarity: "epic" }, { type: "emote", key: "🧊", rarity: "rare" }, { type: "felt", key: "ocean", rarity: "epic" },
  { type: "chips", amount: 750 }, { type: "title", key: "cardshark", rarity: "epic" }, { type: "chipset", key: "obsidian", rarity: "epic" }, { type: "chips", amount: 900 }, { type: "back", key: "carbon", rarity: "epic" },
  { type: "emote", key: "Run it back", rarity: "rare" }, { type: "fx", key: "fireworks", rarity: "legendary" }, { type: "chips", amount: 1000 }, { type: "avatar", key: "🦄", rarity: "epic" }, { type: "back", key: "holo", rarity: "legendary" },
  { type: "chips", amount: 1250 }, { type: "title", key: "heatcheck", rarity: "legendary" }, { type: "felt", key: "aurora", rarity: "legendary" }, { type: "chips", amount: 1500 }, { type: "back", key: "foil", rarity: "legendary" },
];
const passReward = (lvl) => ({ rarity: "common", ...(PASS_TRACK[lvl] || { type: "chips", amount: 150 + lvl * 25 }) });
// chip sets and win effects: what your chips look like and what happens when you win big
const CHIP_SETS = [
  { key: "classic", label: "Classic", cost: 0, colors: null },
  { key: "goldrush", label: "Gold Rush", pass: 7, colors: { 25000: "#FFEFB0", 5000: "#FBBE00", 1000: "#DD9800", 500: "#BE7000", 100: "#804700", 25: "#FFDC7A", 5: "#CC8900", 1: "#FFF8E0" } },
  { key: "diamond", label: "Diamond", cost: 500000, vault: true, colors: { 25000: "#FFFFFF", 5000: "#BFEFFF", 1000: "#7FD8FF", 500: "#3FB5F0", 100: "#1E7FC2", 25: "#E0F7FF", 5: "#5CC8F5", 1: "#F4FCFF" } },
  { key: "obsidian", label: "Obsidian", pass: 18, colors: { 25000: "#E8ECF2", 5000: "#9AA4B2", 1000: "#5B6472", 500: "#2B3038", 100: "#15181D", 25: "#717B8A", 5: "#3A404A", 1: "#C9D1DC" } },
];
const WIN_FX = [
  { key: "confetti", label: "Confetti", cost: 0 },
  { key: "coins", label: "Coin Rain", pass: 13 },
  { key: "fireworks", label: "Fireworks", pass: 22 },
];
const BASE_EMOTES = ["👍", "😂", "😤", "🔥", "🫡", "😬", "GG", "Nice hand", "Ship it"];
const passLevel = (xp) => Math.min(PASS_LEVELS, Math.floor(xp / PASS_XP));
const passRewardLabel = (r) => r.type === "chips" ? `${r.amount.toLocaleString()} chips` : r.type === "felt" ? `${findFelt(r.key).label} felt` : r.type === "back" ? `${findBack(r.key).label} card back`
  : r.type === "title" ? `"${findTitle(r.key).label}" title` : r.type === "emote" ? `${r.key} emote` : r.type === "chipset" ? `${CHIP_SETS.find((c) => c.key === r.key).label} chips` : r.type === "fx" ? `${WIN_FX.find((c) => c.key === r.key).label} win effect` : `${r.key} avatar`;
const passTypeLabel = (r) => ({ chips: "Chips", felt: "Table felt", back: "Card back", title: "Title", emote: "Emote", chipset: "Chip set", fx: "Win effect", avatar: "Avatar" })[r.type];
// hands over one pass item (not chips); safe to call again
function grantPassItem(next, r) {
  const cos = { ...defaultCosmetics(), ...(next.cosmetics || {}) };
  const add = (list, k) => (list.includes(k) ? list : [...list, k]);
  if (r.type === "felt") return { ...next, cosmetics: { ...cos, felts: add(cos.felts, r.key) } };
  if (r.type === "back") return { ...next, cosmetics: { ...cos, backs: add(cos.backs, r.key) } };
  if (r.type === "chipset") return { ...next, cosmetics: { ...cos, chipsets: add(cos.chipsets, r.key) } };
  if (r.type === "fx") return { ...next, cosmetics: { ...cos, fxs: add(cos.fxs, r.key) } };
  if (r.type === "avatar") return { ...next, unlocked: add(next.unlocked || [], r.key) };
  if (r.type === "emote") return { ...next, emotes: add(next.emotes || [], r.key) };
  if (r.type === "title") { const t = next.titles || defaultTitles(); return { ...next, titles: { ...t, owned: add(t.owned, r.key) } }; }
  return next;
}
// the track changed mid season: make sure everything below your level is yours
function passBackfill(d) { let n = d; const lvl = passLevel(ensurePass(d.pass).xp); for (let l = 1; l <= lvl; l++) { const r = passReward(l); if (r.type !== "chips") n = grantPassItem(n, r); } return n; }
function ensurePass(p) { const season = currentSeasonId(); return p && p.season === season ? p : { season, xp: 0 }; }
// Adds XP and hands out every reward crossed. Returns the new data and what was earned.
function grantXp(d, xp) {
  const pass = ensurePass(d.pass);
  const before = passLevel(pass.xp), after = passLevel(pass.xp + xp);
  let next = { ...d, pass: { ...pass, xp: pass.xp + xp } };
  const earned = [];
  for (let l = before + 1; l <= after; l++) {
    const r = passReward(l); earned.push({ level: l, reward: r });
    if (r.type === "chips") next = { ...next, chips: next.chips + r.amount };
    else next = grantPassItem(next, r);
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
  // this week's winnings for the weekly board: every chip won or lost at a table (not rewards or shopping)
  const wk = boardWeek();
  let w = next.wk && next.wk.id === wk ? next.wk : { id: wk, net: 0 };
  const moved = ((next.stats || {}).netChips || 0) - ((prev.stats || {}).netChips || 0);
  if (moved) w = { ...w, net: w.net + moved };
  return { ...next, history: { bankroll, best: bestList }, wk: w };
}

export { BASE_EMOTES, CARD_BACKS, CHALLENGE_REWARD, CHIP_SETS, FELTS, PASS_LEVELS, PASS_XP, STREAK_REWARDS, WIN_FX, applyChallengeEvent, challengeText, defaultCosmetics, ensureChallenges, ensurePass, findBack, findFelt, grantXp, hashStr, localDateStr, ownsCosmetic, passBackfill, passLevel, passReward, passRewardLabel, passTypeLabel, streakState, trackHistory, weekResetDays };
