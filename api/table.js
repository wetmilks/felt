// POST /api/table — every online-table move goes through here.
// Needs SUPABASE_SECRET_KEY set in Vercel. That key never reaches anyone's phone.
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";
import { handle } from "./_handler.js";

const URL = "https://pydehtkxthkzephgfhig.supabase.co";
let admin = null; let vapidKeys = null;
function client() {
  if (!admin) admin = createClient(URL, process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  return admin;
}

const db = {
  async getUser(token) { const { data, error } = await client().auth.getUser(token); return error ? null : data.user; },
  async getProfile(uid) { const { data } = await client().from("profiles").select("username, display_name, avatar, prestige, peak").eq("id", uid).maybeSingle(); return data; },
  async getChips(uid) {
    const w = await this.getWallet(uid); if (w && w.seeded) return Number(w.chips) || 0;
    const { data } = await client().from("saves").select("data").eq("user_id", uid).maybeSingle(); return data && data.data ? Number(data.data.chips) || 0 : null;
  },
  // ---- the wallet: chips and rank the server vouches for ----
  async getWallet(uid) { const { data } = await client().from("wallets").select("*").eq("user_id", uid).maybeSingle(); return data; },
  async seedWallet(uid, { chips, rating, prestige, chipBucket, rpBucket }) {
    const c = client();
    await c.from("wallets").upsert({ user_id: uid }, { onConflict: "user_id", ignoreDuplicates: true });
    const { data: claimed } = await c.from("wallets").update({ seeded: true, rating, prestige, chip_bucket: Math.floor(chipBucket), rp_bucket: Math.floor(rpBucket), bucket_at: new Date().toISOString() }).eq("user_id", uid).eq("seeded", false).select("user_id");
    if (claimed && claimed.length && chips > 0) await this.walletAdd(uid, chips, true); // keeps anything already credited, like a table cash-out
    return this.getWallet(uid);
  },
  async walletAdd(uid, delta, allowShort) {
    const { data, error } = await client().rpc("wallet_add", { uid, delta: Math.round(delta), allow_short: !!allowShort });
    if (error) throw new Error(error.message);
    return data == null ? null : Number(data);
  },
  async updateWallet(uid, fields) { const { error } = await client().from("wallets").update({ ...fields, updated_at: new Date().toISOString() }).eq("user_id", uid); if (error) throw new Error(error.message); },
  async getSaveData(uid) { const { data } = await client().from("saves").select("data").eq("user_id", uid).maybeSingle(); return data ? data.data : null; },
  async putSave(uid, d) { const { error } = await client().from("saves").upsert({ user_id: uid, data: d, updated_at: new Date().toISOString() }); if (error) throw new Error(error.message); },
  async updateProfile(uid, fields) { const { error } = await client().from("profiles").update(fields).eq("id", uid); if (error) throw new Error(error.message); },
  // ---- small settings and logs kept in server_config ----
  async getConfig(key) { const { data } = await client().from("server_config").select("value").eq("key", key).maybeSingle(); return data ? data.value : null; },
  async setConfig(key, value) { const { error } = await client().from("server_config").upsert({ key, value }, { onConflict: "key" }); if (error) throw new Error(error.message); },
  // ---- notifications ----
  async vapid() {
    if (vapidKeys) return vapidKeys;
    const c = client();
    let { data } = await c.from("server_config").select("value").eq("key", "vapid").maybeSingle();
    if (!data) { const k = webpush.generateVAPIDKeys(); await c.from("server_config").upsert({ key: "vapid", value: k }, { onConflict: "key", ignoreDuplicates: true }); ({ data } = await c.from("server_config").select("value").eq("key", "vapid").maybeSingle()); }
    vapidKeys = data.value; return vapidKeys;
  },
  async sendPush(sub, payload) {
    const k = await this.vapid();
    try { await webpush.sendNotification(sub, JSON.stringify(payload), { TTL: 300, vapidDetails: { subject: "https://felt-coral.vercel.app", publicKey: k.publicKey, privateKey: k.privateKey } }); return "ok"; }
    catch (e) { return e && (e.statusCode === 404 || e.statusCode === 410) ? "gone" : "error"; }
  },
  async pushSubs(uid) { const { data } = await client().from("push_subs").select("endpoint, sub, active_at").eq("user_id", uid); return data || []; },
  async savePushSub(uid, sub) { const { error } = await client().from("push_subs").upsert({ endpoint: sub.endpoint, user_id: uid, sub, active_at: new Date().toISOString() }); if (error) throw new Error(error.message); },
  async dropPushSub(endpoint) { await client().from("push_subs").delete().eq("endpoint", endpoint); },
  async touchPush(uid) { await client().from("push_subs").update({ active_at: new Date().toISOString() }).eq("user_id", uid); },
  async createTable(row) {
    const { data, error } = await client().from("poker_tables").insert(row).select("id").single();
    if (error) { if (/duplicate|unique/i.test(error.message)) return null; throw new Error(error.message); }
    return data;
  },
  async findByCode(code) { const { data } = await client().from("poker_tables").select("id, code, closed").eq("code", code).eq("closed", false).maybeSingle(); return data; },
  async load(id) {
    const c = client();
    const [{ data: row }, { data: sec }] = await Promise.all([
      c.from("poker_tables").select("*").eq("id", id).maybeSingle(),
      c.from("poker_secrets").select("deck").eq("table_id", id).maybeSingle(),
    ]);
    if (!row) return null;
    return { row, secrets: (sec && sec.deck) || {} };
  },
  async save(id, version, state, closed) {
    const { data, error } = await client().from("poker_tables").update({ state, version: version + 1, closed, updated_at: new Date().toISOString() }).eq("id", id).eq("version", version).select("id");
    if (error) throw new Error(error.message);
    return data && data.length > 0;
  },
  async putSecret(id, sec) {
    const c = client();
    const { data } = await c.from("poker_secrets").select("deck").eq("table_id", id).maybeSingle();
    const map = (data && data.deck) || {};
    map[sec.dealId] = sec;
    const keys = Object.keys(map); while (keys.length > 3) delete map[keys.shift()]; // keep the last few deals only
    const { error } = await c.from("poker_secrets").upsert({ table_id: id, deck: map });
    if (error) throw new Error(error.message);
  },
  async putHoles(id, handNo, byUid) {
    const rows = Object.entries(byUid).map(([user_id, cards]) => ({ table_id: id, user_id, hand_no: handNo, cards }));
    if (rows.length) { const { error } = await client().from("poker_holes").upsert(rows); if (error) throw new Error(error.message); }
  },
  async getHoles(id, uid) { const { data } = await client().from("poker_holes").select("hand_no, cards").eq("table_id", id).eq("user_id", uid).maybeSingle(); return data; },
  // chips land in the wallet right away; the payout row is how the phone hears about it
  async payout(uid, amount, reason) {
    await this.walletAdd(uid, amount, true);
    const { error } = await client().from("chip_payouts").insert({ user_id: uid, amount, reason }); if (error) throw new Error(error.message);
  },
  async invite(to, from, tableId, code) { await client().from("table_invites").insert({ to_user: to, from_user: from, table_id: tableId, code }); },
  async findProfile(username) { const { data } = await client().from("profiles").select("id, username, display_name, rating, placed, prestige").eq("username", username).maybeSingle(); return data; },
  async payoutAll(amount, reason) {
    const { data } = await client().from("profiles").select("id");
    for (const p of data || []) await this.payout(p.id, amount, reason);
    return (data || []).length;
  },
  async openTables() {
    const { data } = await client().from("poker_tables").select("id, code, sb, bb, friendly, state, updated_at").eq("closed", false).order("updated_at", { ascending: false }).limit(30);
    return (data || []).map((t) => ({ id: t.id, code: t.code, sb: t.sb, bb: t.bb, friendly: t.friendly, players: (t.state.seats || []).filter(Boolean).map((x) => x.name), stage: t.state.stage, updated_at: t.updated_at }));
  },
  async myTables(uid) {
    const { data } = await client().from("poker_tables").select("id, code, sb, bb, friendly, state").eq("closed", false).contains("state", { seats: [{ uid }] }).limit(5);
    return (data || []).map((t) => ({ id: t.id, code: t.code, sb: t.sb, bb: t.bb, friendly: t.friendly, players: (t.state.seats || []).filter(Boolean).length }));
  },
};

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") { res.status(405).json({ error: "POST only" }); return; }
  if (!process.env.SUPABASE_SECRET_KEY && !process.env.SUPABASE_SERVICE_ROLE_KEY) { res.status(500).json({ error: "The server key isn't set up in Vercel yet." }); return; }
  try {
    const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    let body = req.body; if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }
    const r = await handle(body, token, db);
    res.status(r.status).json(r.body);
  } catch (e) {
    res.status(500).json({ error: e && e.message ? e.message : "Server error" });
  }
}
