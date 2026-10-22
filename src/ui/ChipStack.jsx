import { CHIP_SETS } from "../game/progression.js";

/* =========================================================================
   CHIP STACKS: amounts drawn as real piles of chips
   ========================================================================= */
const CHIP_DENOMS = [
  { v: 25000, c: "#00D5BF" }, { v: 5000, c: "#EA1D91" }, { v: 1000, c: "#F8C700" }, { v: 500, c: "#833BFF" },
  { v: 100, c: "#2A2F3A" }, { v: 25, c: "#00A169" }, { v: 5, c: "#F31D4E" }, { v: 1, c: "#E8EEF7" },
];
// the high roller room plays with its own set: champagne, burgundy, gold, onyx, ivory, emerald
const VIP_CHIP = { 25000: "#F1D289", 5000: "#840026", 1000: "#D19D2A", 500: "#926825", 100: "#ECE5D5", 25: "#00543E", 5: "#840026", 1: "#ECE5D5" };
function chipColumns(amount, maxCols = 3, maxPer = 9, palette = null) {
  let left = Math.max(0, Math.round(amount)); const cols = [];
  for (const d of CHIP_DENOMS) { const n = Math.floor(left / d.v); if (n > 0) { cols.push({ c: palette ? palette[d.v] : d.c, n: Math.min(maxPer, n) }); left -= n * d.v; } }
  return cols.slice(0, maxCols);
}
function ChipStack({ amount, small = false, vip = false, set = null }) {
  const cs = set && typeof CHIP_SETS !== "undefined" ? CHIP_SETS.find((c) => c.key === set) : null;
  const cols = chipColumns(amount, small ? 2 : 3, small ? 5 : 9, vip ? VIP_CHIP : cs ? cs.colors : null);
  if (!cols.length) return null;
  return (
    <span className={`chipstack${small ? " sm" : ""}`} aria-hidden="true">
      {cols.map((col, ci) => (
        <span key={ci} className="chipcol">
          {Array.from({ length: col.n }).map((_, i) => <span key={i} className="pchip" style={{ "--cc": col.c, animationDelay: `${i * 0.025}s` }} />)}
        </span>
      ))}
    </span>
  );
}

export { ChipStack };
