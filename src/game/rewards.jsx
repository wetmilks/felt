import { localDateStr } from "./progression.js";
import { Icon } from "../ui/primitives.jsx";

/* =========================================================================
   DAILY SPIN, HIGH ROLLER ROOM, PRESTIGE
   ========================================================================= */
// Eight slices, clockwise from the top. Weights decide the odds.
const SPIN_PRIZES = [
  { label: "150", sub: "chips", type: "chips", amount: 150, w: 22, color: "#0D68F8" },
  { label: "300", sub: "chips", type: "chips", amount: 300, w: 20, color: "#00A169" },
  { label: "150", sub: "XP", type: "xp", amount: 150, w: 16, color: "#7E2FFF" },
  { label: "600", sub: "chips", type: "chips", amount: 600, w: 14, color: "#C46E00" },
  { label: "300", sub: "XP", type: "xp", amount: 300, w: 10, color: "#D80380" },
  { label: "1.2k", sub: "chips", type: "chips", amount: 1200, w: 9, color: "#008C9D" },
  { label: "?", sub: "mystery", type: "mystery", w: 6, color: "#24282F" },
  { label: "5k", sub: "jackpot", type: "chips", amount: 5000, w: 3, color: "#EDB000" },
];
function pickSpinIndex() {
  const total = SPIN_PRIZES.reduce((a, p) => a + p.w, 0);
  let r = Math.random() * total;
  for (let i = 0; i < SPIN_PRIZES.length; i++) { r -= SPIN_PRIZES[i].w; if (r < 0) return i; }
  return 0;
}
const spinReady = (d) => d.lastSpin !== localDateStr();
function hoursUntilTomorrow() { const d = new Date(); const t = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1); return Math.max(1, Math.ceil((t - d) / 3600000)); }

// The VIP lounge: big blinds, sharp bots, a black and gold table.
const HIGH_ROLLER_MIN = 25000;
const HIGH_ROLLER_TABLES = [
  { key: "vip", label: "High Roller", sb: 250, bb: 500, minBankroll: 25000, vip: true },
  { key: "whale", label: "Whale Table", sb: 1000, bb: 2000, minBankroll: 100000, vip: true },
];
const VIP_FELT = { key: "vip", label: "VIP", c1: "#2C313B", c2: "#181B21", c3: "#0C0E12", rail: "#D1A021" };
const VIP_BACK = { key: "vipback", label: "VIP", a: "#14161B", b: "#0B0C0F", ring: "#EBB32D" };

// Prestige: hit Champion, reset to Bronze, keep a badge that counts how many times you've done it.
const PRESTIGE_REWARD = 10000;
// Prestige comes from seasons now: finish a month at Champion and it's yours. Nobody gets sent back to Bronze.
const canPrestige = () => false;
const PRESTIGE_PERKS = [
  { n: 1, label: "Prestige Gold card back" },
  { n: 2, label: "Prestige felt" },
  { n: 3, label: "Gold shimmer on your name" },
  { n: 5, label: "Crown on your seat" },
  { n: 10, label: "Black diamond badge" },
];
const pnameCls = (n) => ((n || 0) >= 3 ? "pname" : "");
// Who you get matched against. After a prestige your badge says Bronze but this stays at your real level.
const matchRating = (r) => r.rating || 0;
// Climbing back after a prestige: wins count extra and losses sting less until your badge catches up.
function prestigeBoost() { return 1; }
// A gold starburst around a gem medallion. The gem changes color as your prestige count climbs.
const PRESTIGE_COLORS = [[1, "#F2ACFF", "#AA2AFF", "#5D00A1"], [3, "#FEA9BD", "#FF0C62", "#8D002C"], [5, "#B2F3FF", "#00B9E3", "#005472"], [10, "#3A3A44", "#17171D", "#000000"]];
const BURST = (() => { const pts = []; for (let i = 0; i < 24; i++) { const r = i % 2 ? 17.5 : 23.5; const a = (i * 15 - 90) * Math.PI / 180; pts.push(`${(24 + r * Math.cos(a)).toFixed(2)},${(24 + r * Math.sin(a)).toFixed(2)}`); } return pts.join(" "); })();
// Prestige 5 and up: a small gold crown sits on top of your avatar
function CrownMark({ size = 14, top = -9 }) {
  return <span className="crown-mark" style={{ top, width: size + 6, height: size + 2 }} aria-label="Prestige crown"><Icon name="crown" size={size} stroke={2} /></span>;
}
// Prestige is a gold chip with the count on it
function PrestigeBadge({ n, size = 18 }) {
  if (!n) return null;
  return (
    <svg className="prestige-badge" width={size} height={size} viewBox="0 0 48 48" role="img" aria-label={`Prestige ${n}`}>
      <title>{`Prestige ${n}`}</title>
      <circle cx="24" cy="24" r="23" fill="#EDB000" />
      <circle cx="24" cy="24" r="19.5" fill="none" stroke="#F2F2EE" strokeWidth="6" strokeDasharray="7.65 7.65" />
      <text x="24" y="24" dy="0.36em" textAnchor="middle" fontSize={n >= 10 ? 17 : 21} fontWeight="900" fill="#111214" fontFamily="'Big Shoulders Display', Impact, sans-serif">{`P${n}`}</text>
    </svg>
  );
}

export { CrownMark, HIGH_ROLLER_MIN, HIGH_ROLLER_TABLES, PRESTIGE_PERKS, PRESTIGE_REWARD, PrestigeBadge, SPIN_PRIZES, VIP_BACK, VIP_FELT, canPrestige, hoursUntilTomorrow, matchRating, pickSpinIndex, pnameCls, prestigeBoost, spinReady };
