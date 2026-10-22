/* =========================================================================
   RANKED MODE
   Ladder: Unranked -> 5 placement matches -> Bronze I ... Diamond III -> Champion.
   Each tier spans 300 RP, split into divisions I, II, III of 100 RP each.
   ========================================================================= */
const RANKED_BUYIN = 1000;
const RANKED_STAKES = { sb: 25, bb: 50 };
const RANKED_MATCH_HANDS = 20; // a ranked match is 20 hands, or less if someone takes every chip
const PLACEMENT_MATCHES = 5;
const PLACEMENT_CAP = 1299; // you can place as high as Diamond I, Champion has to be earned
const DIV_SIZE = 100;
const RANK_RESET_TARGET = 600;
const RANK_TIERS = [
  { key: "bronze", label: "Bronze", min: 0, color: "#E6812D", botSkill: 0.12 },
  { key: "silver", label: "Silver", min: 300, color: "#C9D4E2", botSkill: 0.28 },
  { key: "gold", label: "Gold", min: 600, color: "#FEC100", botSkill: 0.45 },
  { key: "platinum", label: "Platinum", min: 900, color: "#00DBC7", botSkill: 0.6 },
  { key: "diamond", label: "Diamond", min: 1200, color: "#5E9EFF", botSkill: 0.76 },
  { key: "champion", label: "Champion", min: 1500, color: "#E058FF", botSkill: 0.9 },
];
const UNRANKED = { key: "unranked", label: "Unranked", min: -1, color: "#7086AB", botSkill: 0.5 };
const ROMAN = ["", "I", "II", "III"];
function tierForRating(r) { let t = RANK_TIERS[0]; for (const tier of RANK_TIERS) if (r >= tier.min) t = tier; return t; }
function divisionOf(r) { const t = tierForRating(r); if (t.key === "champion") return null; return Math.min(3, Math.floor((r - t.min) / DIV_SIZE) + 1); }
function rankName(r) { const t = tierForRating(r); const d = divisionOf(r); return d ? `${t.label} ${ROMAN[d]}` : t.label; }
function rankProgress(r) {
  const t = tierForRating(r); const d = divisionOf(r);
  if (!d) return { pct: 1, toNext: 0, nextLabel: null };
  const base = t.min + (d - 1) * DIV_SIZE, nextAt = base + DIV_SIZE;
  return { pct: Math.max(0, Math.min(1, (r - base) / DIV_SIZE)), toNext: nextAt - Math.round(r), nextLabel: rankName(nextAt) };
}
const isPlaced = (ranked) => !!(ranked && ranked.placed);
const tierOf = (ranked) => (isPlaced(ranked) ? tierForRating(ranked.rating) : UNRANKED);

export { DIV_SIZE, PLACEMENT_CAP, PLACEMENT_MATCHES, RANKED_BUYIN, RANKED_MATCH_HANDS, RANKED_STAKES, RANK_RESET_TARGET, RANK_TIERS, ROMAN, UNRANKED, divisionOf, isPlaced, rankName, rankProgress, tierForRating, tierOf };
