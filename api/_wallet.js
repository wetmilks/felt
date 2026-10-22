// Your chips and rank live here, on the server. The app plays hands on your phone and reports what
// changed, and the server only lets chips and RP climb as fast as a real player plausibly could.
// Spending always goes through. Anything over the limit is held back and the account gets a flag.

import { boardWeek } from "./_week.js";
import { clubBadge } from "./_clubrules.js";

export const CHIP_CAP = 800000;             // most you can bank in one burst (a monster whale-table session)
const CHIP_RATE = 400000 / 3600000;         // refills at 400k an hour
export const RP_CAP = 300;
const RP_RATE = 300 / 3600000;              // about ten good ranked matches an hour
const n = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

// First time we see an account: start the wallet from what they already had, within reason.
export async function ensureWallet(db, uid, clientData) {
  const w = await db.getWallet(uid);
  if (w && w.seeded) return w;
  const save = await db.getSaveData(uid);
  const c = clientData || {};
  const sc = save ? n(save.chips) : 0, cc = n(c.chips);
  const chips = Math.round(save ? Math.min(Math.max(sc, cc), sc + 250000, 5000000) : Math.min(cc, 100000));
  const sr = save && save.ranked ? n(save.ranked.rating) : 0, cr = c.ranked ? n(c.ranked.rating) : 0;
  const rating = Math.round(Math.min(Math.max(sr, cr), save ? 1700 : 1000));
  const prestige = Math.round(Math.min(Math.max(save && save.ranked ? n(save.ranked.prestige) : 0, c.ranked ? n(c.ranked.prestige) : 0), 3));
  // brand new accounts start with an empty allowance, so a doctored guest save can't sneak in a fortune
  return db.seedWallet(uid, { chips: Math.max(0, chips), rating: Math.max(0, rating), prestige, chipBucket: save ? 200000 : 0, rpBucket: save ? RP_CAP / 2 : 0 });
}

const PROFILE_FIELDS = ["display_name", "avatar", "photo", "title", "stats"];
function cleanProfile(p) {
  const out = {};
  PROFILE_FIELDS.forEach((k) => { if (p && p[k] !== undefined) out[k] = p[k]; });
  if (typeof out.display_name === "string") out.display_name = out.display_name.slice(0, 24);
  if (out.photo && (typeof out.photo !== "string" || out.photo.length > 80000 || !out.photo.startsWith("data:image/"))) delete out.photo;
  if (out.stats && JSON.stringify(out.stats).length > 2000) delete out.stats;
  return out;
}

// One save from a phone: work out what changed, allow what's believable, write back the truth.
export async function syncSave(db, uid, data, profile) {
  if (!data || typeof data !== "object") throw new Error("Nothing to save.");
  const w = await ensureWallet(db, uid, data);
  const now = Date.now();
  const elapsed = Math.max(0, now - Date.parse(w.bucket_at || new Date(now).toISOString()));
  let chipBucket = Math.min(CHIP_CAP, n(w.chip_bucket) + elapsed * CHIP_RATE);
  let rpBucket = Math.min(RP_CAP, n(w.rp_bucket) + elapsed * RP_RATE);
  let flagged = false;

  // chips: the phone says where it started (base) and where it is now
  const base = data.chipSync && Number.isFinite(Number(data.chipSync.base)) ? Number(data.chipSync.base) : n(w.chips);
  const sent = Math.round(n(data.chips) - base);
  let applied = sent;
  if (sent > 0) { applied = Math.min(sent, Math.floor(chipBucket)); chipBucket -= applied; if (applied < sent) flagged = true; }
  const balance = applied !== 0 ? n(await db.walletAdd(uid, applied, true)) : n(w.chips);

  // rank: drops always count, climbs are paced
  const rk = data.ranked || {};
  let rating = Math.max(0, Math.round(n(rk.rating)));
  if (rating > n(w.rating)) { const up = Math.min(rating - n(w.rating), Math.floor(rpBucket)); rpBucket -= up; if (up < rating - n(w.rating)) flagged = true; rating = n(w.rating) + up; }
  // prestige only goes up one at a time, from a season you finished at Champion
  let prestige = Math.max(0, Math.round(n(rk.prestige)));
  if (prestige > n(w.prestige)) prestige = n(w.rating) >= 1500 ? n(w.prestige) + 1 : n(w.prestige);

  await db.updateWallet(uid, { rating, prestige, chip_bucket: Math.floor(chipBucket), rp_bucket: Math.floor(rpBucket), bucket_at: new Date(now).toISOString(), flags: n(w.flags) + (flagged ? 1 : 0) });
  const truth = { ...data, chips: balance, chipSync: { base: balance }, ranked: { ...rk, rating, prestige } };
  await db.putSave(uid, truth);
  // the weekly board: the phone reports what it won this week, and it can't claim more than the chips that really came in
  try {
    const wk = boardWeek(now);
    if (applied > 0) await db.weeklyAdd(wk, uid, 0, applied);
    if (data.wk && data.wk.id === wk && Number.isFinite(Number(data.wk.net))) await db.weeklySetBot(wk, uid, Math.round(Number(data.wk.net)));
  } catch (e) { /* the board is best effort, never block a save */ }
  const prev = await db.getProfile(uid);
  let clubOut;
  if (prev) {
    const fields = cleanProfile(profile);
    // your club tag comes from the server, never from the phone
    if (fields.stats) {
      let club = null; try { const m = await db.memberOf(uid); club = m && m.club ? clubBadge(m.club) : null; } catch (e) { club = (prev.stats && prev.stats.club) || null; }
      fields.stats = { ...fields.stats }; if (club) fields.stats.club = club; else delete fields.stats.club;
      clubOut = club;
    }
    await db.updateProfile(uid, { ...fields, chips: balance, rating, prestige, placed: !!rk.placed, peak: Math.max(n(prev.peak), rating), updated_at: new Date(now).toISOString() });
  }
  return { chips: balance, rating, prestige, sentChips: n(data.chips), sentRating: n(rk.rating), sentPrestige: n(rk.prestige), flagged, ...(clubOut !== undefined ? { club: clubOut } : {}) };
}
