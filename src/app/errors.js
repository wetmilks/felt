// When something breaks on someone's phone, felt sends a short report so it can get fixed.
// Reports land in Admin > Errors. No personal data beyond the username of a signed-in player.
import { sessionToken } from "../cloud.js";

const BUILD = typeof __BUILD__ !== "undefined" ? __BUILD__ : "dev";
const sent = new Set();
let count = 0;
let context = { where: "starting up" };

// What the player was doing, so a report says "ranked table" instead of just a line number
export function setErrorContext(c) { context = { ...context, ...c }; }

// Errors that aren't felt's fault: no connection, browser extensions, a known harmless browser warning
const NOISE = [/ResizeObserver loop/i, /^Script error\.?$/i, /Failed to fetch/i, /Load failed/i, /NetworkError/i, /Can't reach/i, /AbortError/i];

export function reportError(err, extra = {}) {
  try {
    const e = err instanceof Error ? err : new Error(typeof err === "string" ? err : (() => { try { return JSON.stringify(err).slice(0, 200); } catch (x) { return "Unknown error"; } })());
    const message = String(e.message || e).slice(0, 300);
    let stack = String(e.stack || "").split("\n").slice(0, 12).join("\n");
    if (extra.componentStack) stack += "\nIn component:" + String(extra.componentStack).split("\n").slice(0, 6).join("\n");
    stack = stack.slice(0, 2000);
    if (NOISE.some((r) => r.test(message)) || /extension:\/\//.test(stack)) return;
    const sig = message + "|" + (stack.split("\n")[1] || "");
    if (sent.has(sig) || count >= 8) return;
    sent.add(sig); count++;
    const error = {
      message, stack, kind: extra.kind || "error", where: extra.where || context.where,
      url: window.location.pathname + window.location.search, ua: navigator.userAgent.slice(0, 200), build: BUILD,
    };
    sessionToken().then((token) => fetch("/api/table", {
      method: "POST", keepalive: true,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ action: "report", error }),
    })).catch(() => {});
  } catch (x) { /* reporting must never break the app */ }
}

export function installErrorHandlers() {
  window.addEventListener("error", (ev) => { if (ev.error) reportError(ev.error); else if (ev.message) reportError(new Error(ev.message)); });
  window.addEventListener("unhandledrejection", (ev) => reportError(ev.reason || new Error("Unhandled promise rejection"), { kind: "promise" }));
}
