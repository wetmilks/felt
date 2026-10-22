import { BOT_EMOJI, BOT_NAMES } from "../game/helpers.js";

const signed = (n) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n).toLocaleString()}`;

/* =========================================================================
   SEATS / GAME CONSTANTS
   ========================================================================= */
const SMALL_BLIND = 10, BIG_BLIND = 20;
function makePlayers(name, avatar, stack, numSeats = 4, names = BOT_NAMES) {
  const seats = [{ id: 0, name, isHuman: true, avatar }];
  for (let i = 1; i < numSeats; i++) seats.push({ id: i, name: names[i - 1], avatar: BOT_EMOJI[i - 1] });
  return seats.map((s) => ({ ...s, stack, hole: [], folded: false, allIn: false, eliminated: false, shown: false, contributed: 0, streetContributed: 0, hasActed: false }));
}
function computePots(players) {
  const contributors = players.filter((p) => p.contributed > 0);
  const levels = [...new Set(contributors.map((p) => p.contributed))].sort((a, b) => a - b);
  const pots = []; let prev = 0;
  for (const level of levels) { const inLevel = contributors.filter((p) => p.contributed >= level); const amount = (level - prev) * inLevel.length; if (amount > 0) pots.push({ amount, eligible: inLevel.filter((p) => !p.folded).map((p) => p.id) }); prev = level; }
  return pots;
}

export { BIG_BLIND, SMALL_BLIND, computePots, makePlayers, signed };
