import { PLACEMENT_MATCHES, RANK_RESET_TARGET, RANK_TIERS, isPlaced, tierForRating } from "./ranked.js";
import { matchRating, prestigeBoost } from "./rewards.jsx";
import { matchQuality } from "./skill.js";
import { ordinal } from "../ui/hooks.js";

/* =========================================================================
   OLD THEME PACKS: retired when felt moved to one look. Owners get their chips back once.
   ========================================================================= */
const OLD_THEME_COST = { afterhours: 5000, cardroom: 5000, montecarlo: 10000 };
function refundThemes(merged, d) {
  if (d && d.themes && !d.themesRefunded) {
    const back = (d.themes.owned || []).reduce((a, k) => a + (OLD_THEME_COST[k] || 0), 0);
    if (back > 0) { merged.chips = (merged.chips || 0) + back; merged.themeRefund = back; }
  }
  delete merged.themes;
  merged.themesRefunded = true;
}

// One place decides what a ranked match is worth, so the results screen and the saved profile always agree.
// Points for where you finish in chips: first is the big win, last the big loss, the middle sits in between.
function placeRp(place, field) { if (field <= 1) return 30; const f = (field - place) / (field - 1); return Math.round(-24 + 54 * f); }
function rankedOutcome({ buyIn, finalStack, cleared, hands, knockouts, ranked, matchHands = [], place = null, field = null, complete = false }) {
  const busted = finalStack <= 0;
  const forfeit = !cleared && !busted && !complete;
  const net = finalStack - buyIn;
  const ratio = net / buyIn;
  const fd = Math.max(2, field || 2);
  const pl = cleared ? 1 : Math.min(fd, Math.max(1, place || fd));
  const placeValue = forfeit ? -30 : placeRp(pl, fd) + (cleared ? 10 : 0);
  const won = !forfeit && placeValue > 0;
  const quality = matchQuality(matchHands);
  const base = { won, forfeit, cleared, busted, finalStack, net, hands, knockouts, quality, matchHands, place: pl, field: fd };
  if (!isPlaced(ranked)) {
    const done = (ranked.placementGames || []).length + 1;
    return { ...base, placement: true, placementNumber: done, placementFinal: done >= PLACEMENT_MATCHES, before: null, after: null, delta: 0, lines: [], newFrames: [] };
  }
  const lines = [];
  if (cleared) lines.push({ label: "Cleared the table", value: placeValue });
  else if (forfeit) lines.push({ label: "Left before the match ended", value: -30 });
  else lines.push({ label: `${busted ? "Busted" : "Finished"} ${ordinal(pl)} of ${fd}`, value: placeValue });
  if (!forfeit && net > 0) { const v = Math.round(8 * Math.min(ratio, 1)); if (v > 0) lines.push({ label: `Up ${net.toLocaleString()} chips`, value: v }); }
  if (knockouts > 0 && !forfeit) lines.push({ label: `${knockouts} knockout${knockouts > 1 ? "s" : ""}`, value: 5 * knockouts });
  if (quality != null && !forfeit) { const v = Math.round((quality - 0.55) * 30); if (v !== 0) lines.push({ label: `Decision quality ${Math.round(quality * 100)}%`, value: v }); }
  const priorStreak = Math.max(0, ranked.streak || 0);
  if (won && priorStreak >= 1) lines.push({ label: `${priorStreak + 1} wins in a row`, value: Math.min(3, priorStreak) * 4 });
  const before = Math.round(ranked.rating);
  const earned = lines.reduce((s, l) => s + l.value, 0);
  const boost = prestigeBoost(ranked);
  if (boost > 1 && earned !== 0) {
    const extra = earned > 0 ? earned * (boost - 1) : -Math.round(earned / 2);
    lines.push({ label: earned > 0 ? `Prestige climb boost x${boost}` : "Prestige climb boost, half loss", value: extra });
  }
  const raw = lines.reduce((s, l) => s + l.value, 0);
  const after = Math.max(0, before + raw);
  // your hidden rating moves by what the match was really worth, no boost
  const mmrBefore = matchRating(ranked);
  const mmrAfter = Math.max(0, Math.min(1800, mmrBefore + earned));
  if (before + raw < 0) lines.push({ label: "Rating can't go below 0", value: -(before + raw) });
  return { ...base, placement: false, before, after, delta: after - before, mmrAfter, lines, newFrames: framesEarned(Math.max(ranked.peakRating || 0, after), ranked.frames) };
}
function framesEarned(peak, owned) { return RANK_TIERS.filter((t) => t.min > 0 && peak >= t.min && !owned.includes(t.key)).map((t) => t.key); }
function daysLeftInSeason() { const d = new Date(); const end = new Date(d.getFullYear(), d.getMonth() + 1, 1); return Math.max(1, Math.ceil((end - d) / 86400000)); }
function currentSeasonId() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; }
function rolloverSeason(ranked) {
  const season = currentSeasonId();
  if (!ranked || ranked.seasonId === season) return ranked;
  if (!isPlaced(ranked)) return { ...ranked, seasonId: season };
  const softReset = Math.round(RANK_RESET_TARGET + (ranked.rating - RANK_RESET_TARGET) * 0.5);
  // finishing the month at Champion is what earns a prestige
  const champ = ranked.rating >= 1500;
  const prestige = (ranked.prestige || 0) + (champ ? 1 : 0);
  const seasonEnd = { seasonId: ranked.seasonId, from: Math.round(ranked.rating), to: softReset, champ, prestige, rewarded: false, seen: false };
  return { ...ranked, rating: softReset, mmr: undefined, prestige, seasonWins: champ ? [...(ranked.seasonWins || []), ranked.seasonId] : ranked.seasonWins || [], seasonEnd, seasonId: season, history: [...(ranked.history || []), { seasonId: ranked.seasonId, rating: ranked.rating, tier: tierForRating(ranked.rating).key }].slice(-6) };
}
function defaultRanked() { return { schema: 2, placed: false, placementGames: [], rating: 0, peakRating: 0, wins: 0, losses: 0, streak: 0, seasonId: currentSeasonId(), history: [], frames: [], frame: null, recent: [], report: null }; }
// Older saves used a different ladder. Keep cosmetics and history, send everyone through placements once.
function migrateRanked(r) {
  if (!r) return defaultRanked();
  if (r.schema === 2) {
    const out = { ...defaultRanked(), ...r };
    // the old prestige button sent people to Bronze with a hidden rating; put them where a season reset would have
    if (out.mmr != null && out.mmr > (out.rating || 0) + 100) out.rating = Math.max(out.rating || 0, Math.round(RANK_RESET_TARGET + (out.mmr - RANK_RESET_TARGET) * 0.5));
    delete out.mmr;
    return out;
  }
  return { ...defaultRanked(), frames: [...new Set((r.frames || []).map((f) => String(f).replace(/^frame_/, "")))], frame: null, history: [] };
}

export { currentSeasonId, daysLeftInSeason, defaultRanked, framesEarned, migrateRanked, rankedOutcome, refundThemes, rolloverSeason };
