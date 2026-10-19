// What happens when a phone sends a move. Works against any `db` with the methods used below:
// the real one talks to Supabase, a stand-in one keeps everything in memory for testing.
import * as E from "./_engine.js";
import { ensureWallet, syncSave } from "./_wallet.js";
import { pushTo } from "./_push.js";

export const STAKES = [[5, 10], [10, 20], [25, 50], [50, 100], [100, 200], [250, 500], [500, 1000], [1000, 2000]];
const MIN_BB = 20, MAX_BB = 100;
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const newCode = () => Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join("");
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const fail = (error, status = 400) => ({ status, body: { error } });

async function playerInfo(db, uid) {
  const p = await db.getProfile(uid);
  if (!p) throw new Error("Make your username first.");
  return { uid, name: p.display_name || p.username, avatar: p.avatar, prestige: p.prestige }; // photos load separately so every update stays small
}
// Take a buy-in out of the wallet up front. Returns an error message, or null when it's paid.
async function debit(db, uid, amount) {
  const w = await ensureWallet(db, uid, null);
  const bal = await db.walletAdd(uid, -amount, false);
  if (bal == null) return `You need ${amount.toLocaleString()} chips for that. You have ${Math.max(0, Number(w.chips) || 0).toLocaleString()}.`;
  return null;
}
const refund = (db, uid, amount) => db.walletAdd(uid, amount, true);
function buyInRange(t) { return [t.bb * MIN_BB, t.bb * MAX_BB]; }

// Load, change, save. If someone else saved first, start over with their version.
async function mutate(db, tableId, fn, actor = null) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const loaded = await db.load(tableId);
    if (!loaded) return fail("That table doesn't exist.", 404);
    const { row, secrets } = loaded;
    if (row.closed) return fail("That table has closed.");
    const st = JSON.parse(JSON.stringify(row.state));
    const sec = st.dealId ? secrets[st.dealId] || null : null;
    if (st.dealId && !sec && ["preflop", "flop", "turn", "river"].includes(st.stage)) { await wait(150); continue; } // the deal is still being written
    const now = Date.now();
    const cfg = { sb: row.sb, bb: row.bb, sec };
    const fx = { cashouts: [], newSec: null, debit: 0 };
    const err = await fn(st, cfg, now, fx, row);
    if (err === "nothing") return { status: 200, body: { ok: true, noop: true } };
    if (err) return fail(err);
    st.at = now; // lets phones line their clocks up with the server's
    if (st.refunds && st.refunds.length) { fx.cashouts.push(...st.refunds); st.refunds = []; }
    if (fx.newSec) await db.putSecret(tableId, fx.newSec);
    const closed = st.seats.every((s) => !s);
    const saved = await db.save(tableId, row.version, st, closed);
    if (!saved) { await wait(40 + Math.random() * 120); continue; }
    if (fx.newSec) {
      const holes = {}; Object.entries(fx.newSec.holes).forEach(([seat, cards]) => { const s = st.seats[seat]; if (s) holes[s.uid] = cards; });
      await db.putHoles(tableId, st.handNo, holes);
    }
    if (!row.friendly) for (const c of fx.cashouts) if (c.amount > 0) await db.payout(c.uid, c.amount, `Cashed out of table ${row.code}`);
    // a nudge when it becomes your turn and you're not looking
    const betting = ["preflop", "flop", "turn", "river"].includes(st.stage);
    const was = row.state.turn >= 0 && row.state.seats[row.state.turn] ? `${row.state.handNo}:${row.state.seats[row.state.turn].uid}` : null;
    const turnUid = betting && st.turn >= 0 && st.seats[st.turn] ? st.seats[st.turn].uid : null;
    if (turnUid && `${st.handNo}:${turnUid}` !== was && turnUid !== actor) await pushTo(db, turnUid, { title: "Your turn", body: `Table ${row.code} · ${row.sb}/${row.bb}`, url: `/?table=${row.code}`, tag: `turn-${row.code}` }, { onlyIfAway: true });
    return { status: 200, body: { ok: true, state: st, version: row.version + 1, debit: fx.debit } };
  }
  return fail("The table's busy. Try again.", 409);
}

export async function handle(body, token, db) {
  const user = token ? await db.getUser(token) : null;
  if (!user) return fail("Sign in first.", 401);
  const uid = user.id; const a = body || {};

  if (a.action === "create") {
    const stake = STAKES.find(([sb, bb]) => sb === a.sb && bb === a.bb);
    if (!stake) return fail("Pick blinds from the list.");
    const [sb, bb] = stake; const friendly = !!a.friendly;
    const maxSeats = Math.max(2, Math.min(9, Math.floor(a.maxSeats || 6)));
    const [lo, hi] = buyInRange({ bb });
    const buyIn = friendly ? bb * 100 : Math.floor(a.buyIn || 0);
    if (!friendly && (buyIn < lo || buyIn > hi)) return fail(`Buy in between ${lo.toLocaleString()} and ${hi.toLocaleString()}.`);
    const me = await playerInfo(db, uid);
    if (!friendly) { const e = await debit(db, uid, buyIn); if (e) return fail(e); }
    const st = E.newState(maxSeats); const now = Date.now();
    E.sit(st, 0, me, buyIn, now); st.at = now;
    for (let i = 0; i < 8; i++) {
      const code = newCode();
      const row = await db.createTable({ code, host: uid, sb, bb, friendly, max_seats: maxSeats, state: st });
      if (row) return { status: 200, body: { ok: true, tableId: row.id, code, state: st, debit: friendly ? 0 : buyIn } };
    }
    if (!friendly) await refund(db, uid, buyIn);
    return fail("Couldn't make a table code. Try again.");
  }

  if (a.action === "join") {
    const code = String(a.code || "").trim().toUpperCase();
    if (!/^[A-Z]{4}$/.test(code)) return fail("Codes are 4 letters.");
    const row = await db.findByCode(code);
    if (!row || row.closed) return fail(`No open table with code ${code}.`, 404);
    return { status: 200, body: { ok: true, tableId: row.id, code: row.code } };
  }

  if (a.action === "admin") return admin(a, uid, db);

  if (a.action === "save") return { status: 200, body: { ok: true, ...(await syncSave(db, uid, a.data, a.profile)) } };
  if (a.action === "wallet") { const w = await ensureWallet(db, uid, a.data || null); return { status: 200, body: { ok: true, chips: Number(w.chips) || 0, rating: w.rating, prestige: w.prestige } }; }
  if (a.action === "pushKey") return { status: 200, body: { ok: true, key: (await db.vapid()).publicKey } };
  if (a.action === "pushSubscribe") {
    const sub = a.sub; if (!sub || typeof sub.endpoint !== "string" || !sub.keys) return fail("Bad subscription.");
    await db.savePushSub(uid, sub); return { status: 200, body: { ok: true } };
  }
  if (a.action === "pushUnsubscribe") { if (a.endpoint) await db.dropPushSub(String(a.endpoint)); return { status: 200, body: { ok: true } }; }
  if (a.action === "here") { await db.touchPush(uid); return { status: 200, body: { ok: true } }; }

  if (a.action === "mine") return { status: 200, body: { ok: true, tables: await db.myTables(uid) } };

  if (a.action === "get") { // used by the stand-in and as a fallback when live updates drop
    const loaded = await db.load(a.tableId);
    if (!loaded) return fail("That table doesn't exist.", 404);
    return { status: 200, body: { ok: true, state: loaded.row.state, version: loaded.row.version, closed: loaded.row.closed, table: { code: loaded.row.code, sb: loaded.row.sb, bb: loaded.row.bb, friendly: loaded.row.friendly, host: loaded.row.host }, holes: await db.getHoles(a.tableId, uid) } };
  }

  if (a.action === "invite") {
    const loaded = await db.load(a.tableId);
    if (!loaded || loaded.row.closed) return fail("That table has closed.");
    if (E.seatOf(loaded.row.state, uid) < 0 && loaded.row.host !== uid) return fail("Sit down first.");
    await db.invite(a.to, uid, a.tableId, loaded.row.code);
    const me = await db.getProfile(uid);
    await pushTo(db, a.to, { title: "Table invite", body: `${(me && (me.display_name || me.username)) || "A friend"} wants you at table ${loaded.row.code}`, url: `/?table=${loaded.row.code}`, tag: `inv-${loaded.row.code}` });
    return { status: 200, body: { ok: true } };
  }

  const tableId = a.tableId; if (!tableId) return fail("Which table?");
  switch (a.action) {
    case "sit": {
      const me = await playerInfo(db, uid);
      const loaded = await db.load(tableId);
      if (!loaded || loaded.row.closed) return fail("That table has closed.");
      const t = loaded.row; const [lo, hi] = buyInRange(t);
      const buyIn = t.friendly ? t.bb * 100 : Math.floor(a.buyIn || 0);
      if (!t.friendly && (buyIn < lo || buyIn > hi)) return fail(`Buy in between ${lo.toLocaleString()} and ${hi.toLocaleString()}.`);
      if (!t.friendly) { const e = await debit(db, uid, buyIn); if (e) return fail(e); }
      const r = await mutate(db, tableId, async (st, cfg, now, fx) => {
        const e = E.sit(st, Math.floor(a.seat), me, buyIn, now); if (e) return e;
        fx.debit = t.friendly ? 0 : buyIn; return null;
      }, uid);
      if (r.status !== 200 && !t.friendly) await refund(db, uid, buyIn);
      return r;
    }
    case "rebuy": {
      const loaded = await db.load(tableId);
      if (!loaded || loaded.row.closed) return fail("That table has closed.");
      const t = loaded.row; const [, hi] = buyInRange(t);
      const amount = t.friendly ? t.bb * 100 : Math.floor(a.amount || 0);
      if (!t.friendly && (amount < 1 || amount > hi)) return fail(`You can top up to ${hi.toLocaleString()} total.`);
      if (!t.friendly) { const e = await debit(db, uid, amount); if (e) return fail(e); }
      const r = await mutate(db, tableId, async (st, cfg, now, fx, row) => {
        const seat = E.seatOf(st, uid); if (seat < 0) return "You're not at this table.";
        const s = st.seats[seat];
        if (!row.friendly && s.stack + amount > hi) return `You can top up to ${hi.toLocaleString()} total.`;
        if (row.friendly && s.stack > 0) return "Friendly tables only reload when you're out.";
        const e = E.rebuy(st, seat, amount, now); if (e) return e;
        fx.debit = row.friendly ? 0 : amount; return null;
      }, uid);
      if (r.status !== 200 && !t.friendly) await refund(db, uid, amount);
      return r;
    }
    case "leave": return mutate(db, tableId, async (st, cfg, now, fx) => {
      const seat = E.seatOf(st, uid); if (seat < 0) return null;
      const { cashout } = E.leave(st, seat, now, cfg);
      fx.cashouts.push({ uid, amount: cashout }); fx.cashout = cashout;
      return null;
    }, uid);
    case "act": return mutate(db, tableId, async (st, cfg, now) => {
      const seat = E.seatOf(st, uid); if (seat < 0) return "You're not at this table.";
      if (!cfg.sec) return "Hold on, dealing.";
      return E.act(st, cfg.sec, seat, a.move, a.amount, now, cfg);
    }, uid);
    case "tick": return mutate(db, tableId, async (st, cfg, now, fx) => {
      const r = E.tick(st, cfg.sec, now, cfg);
      if (!r.changed) return "nothing";
      fx.newSec = r.newSec; fx.cashouts.push(...r.cashouts); return null;
    });
    case "back": return mutate(db, tableId, async (st, cfg, now) => { const seat = E.seatOf(st, uid); return seat < 0 ? "You're not at this table." : E.back(st, seat, now); });
    case "peek": return mutate(db, tableId, async (st, cfg, now) => { const seat = E.seatOf(st, uid); if (seat < 0) return "nothing"; st.seats[seat].peekAt = a.on ? now : null; return null; });
    case "emote": return mutate(db, tableId, async (st, cfg, now) => { const seat = E.seatOf(st, uid); if (seat < 0) return "nothing"; st.seats[seat].emote = { e: String(a.e || "").slice(0, 16), at: now }; return null; });
    case "show": return mutate(db, tableId, async (st, cfg) => {
      const seat = E.seatOf(st, uid);
      if (seat < 0 || st.stage !== "showdown" || !st.result || !st.result.uncontested || st.result.winners[0].seat !== seat || !cfg.sec) return "You can't show now.";
      st.result.reveal = { ...st.result.reveal, [seat]: cfg.sec.holes[seat] }; st.result.shown = true;
      st.result.headline = `${st.seats[seat].name} shows`; return null;
    });
    default: return fail("Unknown action.");
  }
}

/* ---------- admin: only usernames on the server's list get in ---------- */
const ADMINS = ["william"]; // usernames, lowercase
async function isAdmin(db, uid) {
  const p = await db.getProfile(uid);
  const list = [...ADMINS, ...String((typeof process !== "undefined" && process.env.ADMIN_USERNAMES) || "").split(",")].map((x) => x.trim().toLowerCase()).filter(Boolean);
  return !!(p && p.username && list.includes(p.username.toLowerCase()));
}
async function admin(a, uid, db) {
  const ok = await isAdmin(db, uid);
  if (a.op === "check") return { status: 200, body: { ok: true, admin: ok } };
  if (!ok) return fail("Not allowed.", 403);
  if (a.op === "lookup") {
    const p = await db.findProfile(String(a.username || "").trim().toLowerCase().replace(/^@/, ""));
    if (!p) return fail("No player with that username.");
    const w = await db.getWallet(p.id);
    return { status: 200, body: { ok: true, player: { ...p, chips: w ? Number(w.chips) : await db.getChips(p.id), flags: w ? w.flags : 0 } } };
  }
  if (a.op === "give") {
    const amount = Math.trunc(Number(a.amount) || 0);
    if (!amount || Math.abs(amount) > 1e12) return fail("Pick an amount.");
    const note = String(a.note || "").slice(0, 60) || (amount > 0 ? "A gift from felt" : "Adjusted by felt");
    if (a.everyone) { const n = await db.payoutAll(amount, note); return { status: 200, body: { ok: true, count: n } }; }
    const p = await db.findProfile(String(a.username || "").trim().toLowerCase().replace(/^@/, ""));
    if (!p) return fail("No player with that username.");
    await db.payout(p.id, amount, note);
    return { status: 200, body: { ok: true, count: 1, player: p.username } };
  }
  if (a.op === "tables") return { status: 200, body: { ok: true, tables: await db.openTables() } };
  if (a.op === "close") {
    const r = await mutate(db, a.tableId, async (st, cfg, now, fx) => {
      st.seats.forEach((s, i) => { if (s) { fx.cashouts.push({ uid: s.uid, amount: s.stack + s.bet }); st.seats[i] = null; } });
      st.pot = 0; st.stage = "waiting"; st.turn = -1; st.nextAt = 0; st.result = null; st.board = [];
      return null;
    });
    return r;
  }
  return fail("Unknown admin action.");
}
