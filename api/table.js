// POST /api/table — every online-table move goes through here.
// Needs SUPABASE_SECRET_KEY set in Vercel. That key never reaches anyone's phone.
import { createClient } from "@supabase/supabase-js";
import { handle } from "./_handler.js";

const URL = "https://pydehtkxthkzephgfhig.supabase.co";
let admin = null;
function client() {
  if (!admin) admin = createClient(URL, process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  return admin;
}

const db = {
  async getUser(token) { const { data, error } = await client().auth.getUser(token); return error ? null : data.user; },
  async getProfile(uid) { const { data } = await client().from("profiles").select("username, display_name, avatar, prestige").eq("id", uid).maybeSingle(); return data; },
  async getChips(uid) { const { data } = await client().from("saves").select("data").eq("user_id", uid).maybeSingle(); return data && data.data ? Number(data.data.chips) || 0 : null; },
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
  async payout(uid, amount, reason) { const { error } = await client().from("chip_payouts").insert({ user_id: uid, amount, reason }); if (error) throw new Error(error.message); },
  async invite(to, from, tableId, code) { await client().from("table_invites").insert({ to_user: to, from_user: from, table_id: tableId, code }); },
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
