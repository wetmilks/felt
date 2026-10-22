import { SUIT_GLYPH } from "../game/helpers.js";
import { defaultCosmetics, ensureChallenges, ensurePass, passBackfill } from "../game/progression.js";
import { isPlaced } from "../game/ranked.js";
import { PRESTIGE_REWARD } from "../game/rewards.jsx";
import { defaultData } from "../game/save.js";
import { migrateRanked, refundThemes, rolloverSeason } from "../game/season.js";
import { defaultSkill, tournamentIndex } from "../game/skill.js";
import { defaultTitles, newlyEarnedTitles } from "../game/titles.jsx";
import { FeltLogo } from "../ui/primitives.jsx";

/* =========================================================================
   APP SHELL
   ========================================================================= */
const LOADING_MS = 2800;
function LoadingScreen({ fadingOut }) {
  return (
    <div className="loading" style={{ opacity: fadingOut ? 0 : 1, pointerEvents: fadingOut ? "none" : "auto" }}>
      <FeltLogo className="loading-word" />
      <div className="loading-suits" aria-hidden="true">
        {["s", "h", "d", "c"].map((s, i) => <span key={s} style={{ color: s === "h" || s === "d" ? "var(--t-bad)" : "var(--t-text)", animationDelay: `${0.25 + i * 0.22}s` }}>{SUIT_GLYPH[s]}</span>)}
      </div>
      <div className="loading-bar"><div /></div>
    </div>
  );
}

// everything a save needs filled in, whether it came from this phone or from your account
function hydrate(d) {
  const merged = { ...defaultData(), ...d, stats: { ...defaultData().stats, ...(d.stats || {}) }, settings: { ...defaultData().settings, ...(d.settings || {}) }, skill: d.skill && d.skill.v === 2 ? { ...defaultSkill(), ...d.skill } : { ...defaultSkill(), ...(d.skill || {}), v: 2, idealSum: ((d.skill && d.skill.hands) || 0) * 0.34, report: undefined, reportSource: undefined } };
  merged.ranked = rolloverSeason(migrateRanked(d.ranked));
  if (merged.ranked.seasonEnd && merged.ranked.seasonEnd.champ && !merged.ranked.seasonEnd.rewarded) { merged.chips = (merged.chips || 0) + PRESTIGE_REWARD; merged.ranked = { ...merged.ranked, seasonEnd: { ...merged.ranked.seasonEnd, rewarded: true } }; }
  merged.stats = { ...merged.stats, pos: { late: [0, 0], early: [0, 0], blinds: [0, 0], ...(merged.stats.pos || {}) } };
  merged.cosmetics = { ...defaultCosmetics(), ...(d.cosmetics || {}) };
  merged.streak = d.streak || { count: 0, last: null };
  merged.challenges = ensureChallenges(d.challenges);
  merged.pass = ensurePass(d.pass);
  merged.history = { bankroll: [], best: [], ...(d.history || {}) };
  merged.titles = { ...defaultTitles(), ...(d.titles || {}) };
  refundThemes(merged, d);
  Object.assign(merged, passBackfill(merged));
  { const earned = newlyEarnedTitles(merged); if (earned.length) merged.titles = { ...merged.titles, owned: [...merged.titles.owned, ...earned.map((t) => t.key)] }; }
  if (merged.history.bankroll.length === 0) merged.history = { ...merged.history, bankroll: [{ t: Date.now(), v: merged.chips }] };
  return merged;
}
// "Local" on the leaderboard means players in your time zone
function myTimeZone() { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || null; } catch (e) { return null; } }
const tzLabel = (tz) => (tz ? tz.split("/").pop().replace(/_/g, " ") : "your area");
// what other players can see about you
function publicProfile(d) {
  const rk = d.ranked || {}; const st = d.stats || {};
  return {
    display_name: (d.name || "Player").slice(0, 24), avatar: d.avatar || "🫵", photo: d.usePhoto && d.photo ? d.photo : null,
    title: (d.titles || {}).equipped || null, rating: Math.round(rk.rating || 0), peak: Math.round(rk.peakRating || rk.rating || 0),
    prestige: rk.prestige || 0, placed: isPlaced(rk), chips: Math.round(d.chips || 0),
    stats: { handsPlayed: st.handsPlayed || 0, handsWon: st.handsWon || 0, biggestPot: st.biggestPot || 0, bestWinStreak: st.bestWinStreak || 0, rankedWins: rk.wins || 0, rankedLosses: rk.losses || 0, achievements: (d.achievements || []).length, tIndex: tournamentIndex((d.skill || {}).tourneys) || 0, tz: myTimeZone() },
  };
}

export { LOADING_MS, LoadingScreen, hydrate, myTimeZone, publicProfile, tzLabel };
