// Club rules the phone and the server agree on: what a club costs, how it levels up, what names are allowed.
export const CLUB_COST = 10000;
export const CLUB_LEVELS = [0, 100000, 300000, 750000, 2000000]; // vault chips needed for levels 1 to 5
export const CLUB_COLORS = { red: "#F51E1D", blue: "#196EFE", green: "#00A560", gold: "#EDB000", purple: "#8B3DFF", pink: "#FF3D9A", teal: "#00B8B0", orange: "#FF7A1A" };
export const DONATE_STEPS = [1000, 5000, 25000, 100000];

export function clubLevel(xp) { let l = 1; CLUB_LEVELS.forEach((need, i) => { if ((Number(xp) || 0) >= need) l = i + 1; }); return l; }
export const memberCap = (lvl) => 30 + 5 * (Math.max(1, lvl) - 1);
// what each level gives you, shown in the vault
export const LEVEL_PERKS = [
  "30 members",
  "35 members, club tables use your club color",
  "40 members, gold rim on your tag",
  "45 members",
  "50 members, foil tag",
];

// slurs anywhere in the name, plus a few short ones only as whole words so "Grape Street" is fine
const BAD_ANY = /n[i1]gg|f[a@]gg|retard|k[i1]ke|tr[a@]nny|h[i1]tler|kkk/i;
const BAD_WORD = /\b(fags?|spics?|chinks?|rape|nazis?)\b/i;
const bad = (s) => BAD_ANY.test(s.replace(/[^A-Za-z0-9@]/g, "")) || BAD_WORD.test(s);
export function checkClubName(name) {
  const n = String(name || "").replace(/\s+/g, " ").trim();
  if (n.length < 3 || n.length > 24) return [null, "Club names are 3 to 24 characters."];
  if (!/^[A-Za-z0-9 '&.!-]+$/.test(n)) return [null, "Use letters, numbers and spaces in the name."];
  if (bad(n)) return [null, "Pick a different name."];
  return [n, null];
}
export function checkClubTag(tag) {
  const t = String(tag || "").trim().toUpperCase();
  if (!/^[A-Z0-9]{2,4}$/.test(t)) return [null, "Tags are 2 to 4 letters or numbers."];
  if (bad(t) || /^(FAG|KKK|NAZI|SPIC)$/.test(t)) return [null, "Pick a different tag."];
  return [t, null];
}
// the little tag that rides along on your profile and at tables
export const clubBadge = (c) => (c ? { id: c.id, tag: c.tag, color: CLUB_COLORS[c.color] ? c.color : "red", lvl: clubLevel(c.xp) } : null);
export const cleanAbout = (s) => String(s || "").replace(/\s+/g, " ").trim().slice(0, 80);
