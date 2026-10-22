/* =========================================================================
   SHARED HELPERS
   ========================================================================= */
const SUITS = ["s", "h", "d", "c"];
const SUIT_GLYPH = { s: "♠", h: "♥", d: "♦", c: "♣" };
const SUIT_COLOR = { s: "#1A1A1A", h: "#F40028", d: "#F40028", c: "#1A1A1A" };
const SUIT_COLOR_CB = { s: "#1A1A1A", h: "#076EC1", d: "#076EC1", c: "#1A1A1A" };
const RANK_SING = { 2: "Two", 3: "Three", 4: "Four", 5: "Five", 6: "Six", 7: "Seven", 8: "Eight", 9: "Nine", 10: "Ten", 11: "Jack", 12: "Queen", 13: "King", 14: "Ace" };
const RANK_PLUR = { 2: "Twos", 3: "Threes", 4: "Fours", 5: "Fives", 6: "Sixes", 7: "Sevens", 8: "Eights", 9: "Nines", 10: "Tens", 11: "Jacks", 12: "Queens", 13: "Kings", 14: "Aces" };
const rankLabel = (r) => (r <= 10 ? String(r) : RANK_SING[r][0]);
const TURN_SECONDS = 30;
const DEAL_OFFSET = 0.42; // seconds: cards start flying once the shuffle finishes
const AVATAR_COLORS = ["#196EFE", "#00A560", "#E38400", "#833BFF", "#F51E1D", "#00A5B8", "#EA1D91", "#EDB000"];
const BOT_EMOJI = ["🧑‍💻", "😼", "🐯", "🦊", "🐼"];
const BOT_NAMES = ["Marlo", "Yuki", "Renn", "Devon", "Kira", "Teo", "Sasha", "Bram"];
const VIP_NAMES = ["Laurent", "Vivienne", "Sterling", "Margaux", "Aurelio", "Celeste", "Dmitri", "Isolde"];

const AVATAR_CATALOG = [
  { emoji: "🫵", cost: 0 }, { emoji: "🙂", cost: 0 }, { emoji: "😎", cost: 0 }, { emoji: "🐱", cost: 0 },
  { emoji: "🦊", cost: 400 }, { emoji: "🐸", cost: 400 }, { emoji: "🐼", cost: 600 }, { emoji: "🤖", cost: 800 },
  { emoji: "👽", cost: 800 }, { emoji: "🦁", cost: 1200 }, { emoji: "🐉", cost: 1600 }, { emoji: "🥷", cost: 1600 },
  { emoji: "👑", cost: 2500 }, { emoji: "🃏", cost: 3000 },
];
const CHIP_PACKS = [
  { label: "Quick Refill", amount: 500 }, { label: "Big Refill", amount: 1500 }, { label: "Mega Refill", amount: 5000 },
];
const MOCK_PLAYERS = [
  { name: "Jax", chips: 18400, wins: 62, hands: 140 }, { name: "Kapish", chips: 9200, wins: 34, hands: 98 },
  { name: "Chezanax", chips: 26100, wins: 88, hands: 201 }, { name: "Mei", chips: 41200, wins: 121, hands: 260 },
  { name: "Renn", chips: 7300, wins: 21, hands: 77 }, { name: "Yuki", chips: 15600, wins: 55, hands: 150 },
  { name: "Priya", chips: 12800, wins: 40, hands: 110 }, { name: "Dev", chips: 5200, wins: 15, hands: 60 },
];
// aggression: how likely/big they bet & raise. bluff: chance to raise on a weak hand. tight: how much strength they need to continue.
const BOT_PERSONALITIES = [
  { tag: "Loose-Aggressive", aggression: 1.35, bluff: 0.22, tight: 0.85 },
  { tag: "Tight", aggression: 0.7, bluff: 0.05, tight: 1.25 },
  { tag: "Balanced", aggression: 1.0, bluff: 0.12, tight: 1.0 },
  { tag: "Maniac", aggression: 1.7, bluff: 0.35, tight: 0.7 },
  { tag: "Rock", aggression: 0.5, bluff: 0.02, tight: 1.5 },
  { tag: "Balanced", aggression: 1.1, bluff: 0.1, tight: 1.05 },
  { tag: "Loose-Passive", aggression: 0.8, bluff: 0.08, tight: 0.8 },
  { tag: "Tight-Aggressive", aggression: 1.3, bluff: 0.1, tight: 1.2 },
];
const STAKES_TIERS = [
  { key: "micro", label: "Micro Stakes", sb: 10, bb: 20, minBankroll: 0 },
  { key: "low", label: "Low Stakes", sb: 25, bb: 50, minBankroll: 1000 },
  { key: "high", label: "High Stakes", sb: 100, bb: 200, minBankroll: 5000 },
];
const TABLE_SIZES = [
  { key: "heads-up", label: "Heads-Up", seats: 2, sub: "Just you and one opponent" },
  { key: "four-max", label: "4-Max", seats: 4, sub: "Classic short-handed table" },
  { key: "six-max", label: "6-Max", seats: 6, sub: "A full, livelier table" },
  { key: "nine-max", label: "9-Max", seats: 9, sub: "A full ring game" },
];
const BLIND_LEVEL_MULT = [1, 1.5, 2, 3, 4, 6, 8, 10];
const ACHIEVEMENTS = [
  { id: "first_win", label: "First blood", desc: "Win a hand", stat: "handsWon", target: 1 },
  { id: "ten_wins", label: "Heater", desc: "Win 10 hands", stat: "handsWon", target: 10 },
  { id: "fifty_wins", label: "Regular", desc: "Win 50 hands", stat: "handsWon", target: 50 },
  { id: "hundred_hands", label: "Grinder", desc: "Play 100 hands", stat: "handsPlayed", target: 100 },
  { id: "big_pot", label: "Big score", desc: "Win a pot of 500 or more", stat: "biggestPot", target: 500 },
  { id: "huge_pot", label: "Whale", desc: "Win a pot of 2,000 or more", stat: "biggestPot", target: 2000 },
  { id: "net_positive", label: "In the green", desc: "Get to +1,000 net chips", stat: "netChips", target: 1000 },
].map((a) => ({ ...a, check: (s) => (s[a.stat] || 0) >= a.target }));

export { ACHIEVEMENTS, AVATAR_CATALOG, AVATAR_COLORS, BLIND_LEVEL_MULT, BOT_EMOJI, BOT_NAMES, BOT_PERSONALITIES, DEAL_OFFSET, MOCK_PLAYERS, RANK_PLUR, RANK_SING, STAKES_TIERS, SUITS, SUIT_COLOR, SUIT_COLOR_CB, SUIT_GLYPH, TABLE_SIZES, TURN_SECONDS, VIP_NAMES, rankLabel };
