import { defaultCosmetics, ensureChallenges, ensurePass } from "./progression.js";
import { defaultRanked } from "./season.js";
import { defaultSkill } from "./skill.js";
import { defaultTitles } from "./titles.jsx";

// Saves to the host's storage when it has one, and to the browser's own storage as a backup,
// so progress sticks no matter where the game is opened.
const SAVE_KEY = "felt-player-data";
async function loadData() {
  let raw = null;
  try { if (window.storage && window.storage.get) { const res = await window.storage.get(SAVE_KEY, false); if (res && res.value) raw = res.value; } } catch (e) { /* host storage unavailable */ }
  if (!raw) { try { raw = window.localStorage.getItem(SAVE_KEY); } catch (e) { /* browser storage blocked */ } }
  try { return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
}
async function saveData(data) {
  const raw = JSON.stringify(data);
  try { window.localStorage.setItem(SAVE_KEY, raw); } catch (e) { /* browser storage blocked */ }
  try { if (window.storage && window.storage.set) await window.storage.set(SAVE_KEY, raw, false); } catch (e) { /* host storage unavailable */ }
}
function defaultData() {
  return { name: "You", avatar: "🫵", chips: 2000, unlocked: ["🫵", "🙂", "😎", "🐱"], friends: [], achievements: [], lastDailyBonus: null, stats: { handsPlayed: 0, handsWon: 0, biggestPot: 0, netChips: 0, curWinStreak: 0, bestWinStreak: 0, pos: { late: [0, 0], early: [0, 0], blinds: [0, 0] } }, settings: { winTipSeen: false, colorblind: false, cardSize: "normal", animSpeed: "normal", runTwice: false, squeeze: true }, ranked: defaultRanked(), skill: defaultSkill(), cosmetics: defaultCosmetics(), streak: { count: 0, last: null }, challenges: ensureChallenges(null), pass: ensurePass(null), history: { bankroll: [], best: [] }, titles: defaultTitles() };
}
// a phone photo comes in huge: center-crop it to a small square so it saves fast and loads instantly
function shrinkPhoto(file, size = 256) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("decode"));
      img.onload = () => {
        const side = Math.min(img.width, img.height);
        const c = document.createElement("canvas"); c.width = size; c.height = size;
        const g = c.getContext("2d"); g.imageSmoothingQuality = "high";
        g.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
        resolve(c.toDataURL("image/jpeg", 0.84));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
function vibrate(pattern) { try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (e) { /* not supported */ } }
function todayStr() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }

const DISPLAY_FONT = "var(--t-display)";

export { DISPLAY_FONT, defaultData, loadData, saveData, shrinkPhoto, todayStr, vibrate };
