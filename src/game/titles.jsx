import { PASS_LEVELS, PASS_XP } from "./progression.js";
import { computeSkill } from "./skill.js";

/* =========================================================================
   TITLES: shown under your name at the table, on your profile and the leaderboard
   ========================================================================= */
const TITLE_RARITY = { common: "var(--t-sub)", rare: "#5E9EFF", epic: "#B27DFF", legendary: "#FEC100" };
const TITLES = [
  { key: "rookie", label: "Rookie", rarity: "common", how: "Everyone starts here" },
  // earned
  { key: "grinder", label: "Grinder", rarity: "rare", how: "Play 500 hands", earn: (d) => d.stats.handsPlayed >= 500 },
  { key: "onfire", label: "On Fire", rarity: "rare", how: "Win 5 hands in a row", earn: (d) => (d.stats.bestWinStreak || 0) >= 5 },
  { key: "whale", label: "Whale", rarity: "epic", how: "Win a pot of 5,000 or more", earn: (d) => d.stats.biggestPot >= 5000 },
  { key: "loyal", label: "Loyal", rarity: "rare", how: "Hit a 7 day login streak", earn: (d) => d.streak && d.streak.count >= 7 },
  { key: "closer", label: "Closer", rarity: "epic", how: "Win a tournament", earn: (d) => ((d.skill && d.skill.tourneys) || []).some((t) => t.place === 1) },
  { key: "shark", label: "Shark", rarity: "epic", how: "Reach a Skill Rating of 75", earn: (d) => { const k = computeSkill(d.skill); return !!k && (d.skill.hands || 0) >= 100 && k.sr >= 75; } },
  { key: "diamond", label: "Diamond Hands", rarity: "epic", how: "Reach Diamond in ranked", earn: (d) => (d.ranked.peakRating || 0) >= 1200 },
  { key: "champion", label: "Champion", rarity: "legendary", how: "Reach Champion in ranked", earn: (d) => (d.ranked.peakRating || 0) >= 1500 },
  { key: "royal", label: "Royal Club", rarity: "legendary", how: "Win with a royal flush", earn: (d) => ((d.history && d.history.best) || []).some((b) => b.kind === 8 && b.s && b.s[1] === 14) },
  { key: "maxed", label: "Maxed Out", rarity: "legendary", how: "Finish the season pass", earn: (d) => d.pass && d.pass.xp >= PASS_LEVELS * PASS_XP },
  // season pass
  { key: "nightshift", label: "Night Shift", rarity: "rare", how: "Season pass level 4" },
  { key: "cardshark", label: "Card Shark", rarity: "epic", how: "Season pass level 17" },
  { key: "heatcheck", label: "Heat Check", rarity: "legendary", how: "Season pass level 27" },
  // bought
  { key: "lucky", label: "Lucky", rarity: "common", cost: 1500 },
  { key: "nightowl", label: "Night Owl", rarity: "common", cost: 1500 },
  { key: "bluffer", label: "The Bluffer", rarity: "rare", cost: 3000 },
  { key: "professor", label: "The Professor", rarity: "rare", cost: 3000 },
  { key: "bigstack", label: "Big Stack", rarity: "epic", cost: 7500 },
  { key: "highroller", label: "High Roller", rarity: "epic", cost: 10000 },
  { key: "legend", label: "Living Legend", rarity: "legendary", cost: 40000 },
];
const findTitle = (k) => TITLES.find((t) => t.key === k) || TITLES[0];
function defaultTitles() { return { owned: ["rookie"], equipped: "rookie" }; }
// Returns any titles your stats now qualify for that you don't have yet.
function newlyEarnedTitles(d) {
  const owned = (d.titles || defaultTitles()).owned;
  return TITLES.filter((t) => t.earn && !owned.includes(t.key) && (() => { try { return t.earn(d); } catch (e) { return false; } })());
}
function TitleTag({ k, size = 11, style }) {
  const t = findTitle(k);
  return <span className="title-tag" style={{ color: TITLE_RARITY[t.rarity], fontSize: size, ...style }}>{t.label}</span>;
}

export { TITLES, TITLE_RARITY, TitleTag, defaultTitles, findTitle, newlyEarnedTitles };
