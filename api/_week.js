// felt's week runs on New York time: it starts Monday at midnight. The phone and the server both use
// this file, so a week is the same week everywhere. A week is named by its Monday, like "2026-10-19".
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
let fmt = null;
function nyParts(ts) {
  if (!fmt) fmt = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit", weekday: "short", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" });
  const p = {}; fmt.formatToParts(new Date(ts)).forEach((x) => { p[x.type] = x.value; });
  return { y: +p.year, m: +p.month, d: +p.day, dow: DAYS.indexOf(p.weekday), h: +p.hour % 24, min: +p.minute, s: +p.second };
}
const iso = (y, m, d) => new Date(Date.UTC(y, m - 1, d)).toISOString().slice(0, 10);

export function boardWeek(ts = Date.now()) { const p = nyParts(ts); return iso(p.y, p.m, p.d - p.dow); }
export function lastBoardWeek(ts = Date.now()) { const p = nyParts(ts); return iso(p.y, p.m, p.d - p.dow - 7); }
// how long until the board resets, give or take a daylight saving hour
export function msToWeekReset(ts = Date.now()) { const p = nyParts(ts); return (((7 - p.dow) * 24 - p.h) * 3600 - p.min * 60 - p.s) * 1000; }
export function isSundayNY(ts = Date.now()) { return nyParts(ts).dow === 6; }
export function msToSunday(ts = Date.now()) { const p = nyParts(ts); if (p.dow === 6) return 0; return (((6 - p.dow) * 24 - p.h) * 3600 - p.min * 60 - p.s) * 1000; }
export function msToMonday(ts = Date.now()) { return msToWeekReset(ts); }
export function weekLabel(week) { const d = new Date(`${week}T12:00:00Z`); return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }); }
