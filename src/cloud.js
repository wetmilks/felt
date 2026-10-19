// Accounts, cloud saves and friends.
// Talks to Supabase when the two public keys below are set. For local testing, setting
// localStorage "felt-mock-cloud" to "1" swaps in a stand-in that keeps everything in this browser.

export const CLOUD_URL = "https://pydehtkxthkzephgfhig.supabase.co";
export const CLOUD_KEY = "sb_publishable_OaDEFKdmF2nI4SBvB7_xVw_uedYqdeq";

const PUBLIC_COLS = "id, username, display_name, avatar, photo, title, rating, peak, prestige, placed, chips, stats, updated_at";
const USERNAME_RE = /^[a-z0-9_]{3,16}$/;

const isMock = () => { try { return localStorage.getItem("felt-mock-cloud") === "1"; } catch (e) { return false; } };
export const cloudEnabled = () => !!(CLOUD_URL && CLOUD_KEY) || isMock();

export function cleanUsername(u) { return String(u || "").trim().toLowerCase().replace(/^@/, ""); }
function checkUsername(u) { if (!USERNAME_RE.test(u)) throw new Error("Usernames are 3 to 16 letters, numbers or underscores."); }
function friendly(err) {
  const m = String((err && err.message) || err || "");
  if (/already registered|already been registered|User already/i.test(m)) return "That email already has an account. Try signing in.";
  if (/Invalid login credentials/i.test(m)) return "Wrong email or password.";
  if (/Password should be at least/i.test(m)) return "Password needs at least 6 characters.";
  if (/invalid.*email|email.*invalid/i.test(m)) return "That email doesn't look right.";
  if (/rate limit/i.test(m)) return "Too many tries. Wait a minute and try again.";
  if (/Failed to fetch|NetworkError|Load failed/i.test(m)) return "Can't reach the server. Check your connection.";
  return m || "Something went wrong. Try again.";
}

// the only profile fields a phone may write itself; rank, chips and stats come from the server
const starter = (p) => { const o = {}; ["display_name", "avatar", "photo", "title"].forEach((k) => { if (p && p[k] != null) o[k] = p[k]; }); return o; };

/* ---------------- Supabase ---------------- */
let sbPromise = null;
function sb() {
  if (!sbPromise) sbPromise = import("@supabase/supabase-js").then(({ createClient }) => createClient(CLOUD_URL, CLOUD_KEY, { auth: { persistSession: true, autoRefreshToken: true, storageKey: "felt-auth" } }));
  return sbPromise;
}
const real = {
  async current() {
    const c = await sb();
    const { data } = await c.auth.getSession();
    const user = data && data.session && data.session.user;
    if (!user) return null;
    const { data: prof } = await c.from("profiles").select("username").eq("id", user.id).maybeSingle();
    return { id: user.id, email: user.email, username: prof ? prof.username : null };
  },
  async signUp({ username, email, password, profile }) {
    const c = await sb(); const u = cleanUsername(username); checkUsername(u);
    const { data: taken } = await c.from("profiles").select("id").eq("username", u).maybeSingle();
    if (taken) throw new Error("That username is taken.");
    const { data, error } = await c.auth.signUp({ email: email.trim(), password });
    if (error) throw new Error(friendly(error));
    if (!data.session) throw new Error("Account made, but email confirmation is still on in Supabase. Turn it off and sign in.");
    const id = data.user.id;
    const { error: pe } = await c.from("profiles").insert({ id, username: u, ...starter(profile) });
    if (pe) throw new Error(/duplicate|unique/i.test(pe.message) ? "That username is taken." : friendly(pe));
    return { id, email: data.user.email, username: u };
  },
  async signIn({ email, password }) {
    const c = await sb();
    const { data, error } = await c.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw new Error(friendly(error));
    const { data: prof } = await c.from("profiles").select("username").eq("id", data.user.id).maybeSingle();
    return { id: data.user.id, email: data.user.email, username: prof ? prof.username : null };
  },
  async claimUsername(me, username, profile) {
    const c = await sb(); const u = cleanUsername(username); checkUsername(u);
    const { error } = await c.from("profiles").insert({ id: me.id, username: u, ...starter(profile) });
    if (error) throw new Error(/duplicate|unique/i.test(error.message) ? "That username is taken." : friendly(error));
    return { ...me, username: u };
  },
  async signOut() { const c = await sb(); await c.auth.signOut(); },
  async loadSave(me) {
    const c = await sb();
    const { data, error } = await c.from("saves").select("data, updated_at").eq("user_id", me.id).maybeSingle();
    if (error) throw new Error(friendly(error));
    return data ? data.data : null;
  },
  async pushSave(me, save, profile) {
    const c = await sb(); const now = new Date().toISOString();
    const [a, b] = await Promise.all([
      c.from("saves").upsert({ user_id: me.id, data: save, updated_at: now }),
      me.username ? c.from("profiles").update({ ...profile, updated_at: now }).eq("id", me.id) : Promise.resolve({}),
    ]);
    if (a.error || b.error) throw new Error(friendly(a.error || b.error));
  },
  async findUser(username) {
    const c = await sb(); const u = cleanUsername(username);
    const { data } = await c.from("profiles").select(PUBLIC_COLS).eq("username", u).maybeSingle();
    return data || null;
  },
  async getProfile(id) {
    const c = await sb();
    const { data } = await c.from("profiles").select(PUBLIC_COLS).eq("id", id).maybeSingle();
    return data || null;
  },
  async links(me) {
    const c = await sb();
    const { data, error } = await c.from("friendships").select("requester, addressee, status").or(`requester.eq.${me.id},addressee.eq.${me.id}`);
    if (error) throw new Error(friendly(error));
    return data || [];
  },
  async profiles(ids) {
    if (!ids.length) return [];
    const c = await sb();
    const { data } = await c.from("profiles").select(PUBLIC_COLS).in("id", ids);
    return data || [];
  },
  async top(kind, tz) {
    const c = await sb();
    let q = c.from("profiles").select(PUBLIC_COLS).limit(50);
    if (tz) q = q.eq("stats->>tz", tz);
    q = kind === "ranked" ? q.eq("placed", true).order("rating", { ascending: false }) : q.order("stats->tIndex", { ascending: false, nullsFirst: false });
    const { data, error } = await q;
    if (!error) return data || [];
    if (kind === "ranked") throw new Error(friendly(error));
    // fall back to sorting here if the server can't order by the stats field
    let q2 = c.from("profiles").select(PUBLIC_COLS).limit(200); if (tz) q2 = q2.eq("stats->>tz", tz);
    const { data: all, error: e2 } = await q2;
    if (e2) throw new Error(friendly(e2));
    return (all || []).sort((x, y) => ((y.stats || {}).tIndex || 0) - ((x.stats || {}).tIndex || 0)).slice(0, 50);
  },
  // who's in the app right now, shared over a live channel. Nothing is stored, it vanishes when you leave.
  async presence(me, onSync) {
    const c = await sb();
    const ch = c.channel("felt-online", { config: { presence: { key: me.id } } });
    let status = null, joined = false;
    ch.on("presence", { event: "sync" }, () => {
      const st = ch.presenceState(); const out = {};
      Object.keys(st).forEach((k) => { const arr = st[k] || []; const last = arr[arr.length - 1]; if (last) out[k] = last.status || "In the lobby"; });
      onSync(out);
    });
    ch.subscribe((s) => { if (s === "SUBSCRIBED") { joined = true; if (status) ch.track({ status, at: Date.now() }); } });
    return {
      set(next) { status = next; if (joined) ch.track({ status: next, at: Date.now() }); },
      hide() { status = null; if (joined) ch.untrack(); },
      leave() { try { c.removeChannel(ch); } catch (e) { /* already gone */ } },
    };
  },
  // Legend number: one plus everyone at Champion with more RP than you
  async legendRank(me, rating) {
    const c = await sb();
    const { count, error } = await c.from("profiles").select("id", { count: "exact", head: true }).eq("placed", true).gte("rating", 1500).gt("rating", rating).neq("id", me.id);
    if (error) throw new Error(friendly(error));
    return (count || 0) + 1;
  },
  async token() { const c = await sb(); const { data } = await c.auth.getSession(); return data && data.session ? data.session.access_token : null; },
  // live table updates, with a slow poll underneath in case the live connection drops
  async watchTable(id, onRow) {
    const c = await sb();
    const pull = async () => { const { data } = await c.from("poker_tables").select("state, version, closed, code, sb, bb, friendly, host").eq("id", id).maybeSingle(); if (data) onRow(data); };
    const ch = c.channel(`table-${id}`).on("postgres_changes", { event: "UPDATE", schema: "public", table: "poker_tables", filter: `id=eq.${id}` }, (p) => onRow(p.new)).subscribe();
    pull(); const t = setInterval(pull, 5000);
    return () => { clearInterval(t); try { c.removeChannel(ch); } catch (e) { /* gone */ } };
  },
  async holes(id, me) { const c = await sb(); const { data } = await c.from("poker_holes").select("hand_no, cards").eq("table_id", id).eq("user_id", me.id).maybeSingle(); return data; },
  async claimPayouts(me) {
    const c = await sb();
    const { data } = await c.from("chip_payouts").select("id, amount, reason").eq("user_id", me.id).eq("claimed", false);
    let total = 0; const reasons = [];
    for (const p of data || []) {
      const { data: got } = await c.from("chip_payouts").update({ claimed: true }).eq("id", p.id).eq("claimed", false).select("id");
      if (got && got.length) { total += Number(p.amount) || 0; reasons.push(p.reason); }
    }
    return { total, reasons };
  },
  async watchInvites(me, onList) {
    const c = await sb();
    const pull = async () => { const { data } = await c.from("table_invites").select("id, from_user, table_id, code, created_at").eq("to_user", me.id).order("created_at", { ascending: false }).limit(5); onList(data || []); };
    const ch = c.channel(`inv-${me.id}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "table_invites", filter: `to_user=eq.${me.id}` }, pull).subscribe();
    pull(); const t = setInterval(pull, 30000);
    return () => { clearInterval(t); try { c.removeChannel(ch); } catch (e) { /* gone */ } };
  },
  async clearInvite(id) { const c = await sb(); await c.from("table_invites").delete().eq("id", id); },
  async insertLink(me, other) { const c = await sb(); const { error } = await c.from("friendships").insert({ requester: me.id, addressee: other, status: "pending" }); if (error && !/duplicate/i.test(error.message)) throw new Error(friendly(error)); },
  async acceptLink(me, other) { const c = await sb(); const { error } = await c.from("friendships").update({ status: "accepted" }).eq("requester", other).eq("addressee", me.id); if (error) throw new Error(friendly(error)); },
  async deleteLinks(me, other) {
    const c = await sb();
    await Promise.all([
      c.from("friendships").delete().eq("requester", me.id).eq("addressee", other),
      c.from("friendships").delete().eq("requester", other).eq("addressee", me.id),
    ]);
  },
};

/* ---------------- local stand-in, for testing without a server ---------------- */
const MDB = "felt-mockdb", MSES = "felt-mock-session";
const mload = () => { try { return JSON.parse(localStorage.getItem(MDB)) || { users: [], profiles: {}, saves: {}, links: [] }; } catch (e) { return { users: [], profiles: {}, saves: {}, links: [] }; } };
const mstore = (db) => localStorage.setItem(MDB, JSON.stringify(db));
const wait = () => new Promise((r) => setTimeout(r, 120));
const mock = {
  async current() { await wait(); const id = localStorage.getItem(MSES); if (!id) return null; const db = mload(); const u = db.users.find((x) => x.id === id); if (!u) return null; return { id, email: u.email, username: db.profiles[id] ? db.profiles[id].username : null }; },
  async signUp({ username, email, password, profile }) {
    await wait(); const u = cleanUsername(username); checkUsername(u); const db = mload();
    if (Object.values(db.profiles).some((p) => p.username === u)) throw new Error("That username is taken.");
    if (db.users.some((x) => x.email === email.trim().toLowerCase())) throw new Error("That email already has an account. Try signing in.");
    if (password.length < 6) throw new Error("Password needs at least 6 characters.");
    const id = `u${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    db.users.push({ id, email: email.trim().toLowerCase(), password }); db.profiles[id] = { id, username: u, ...profile, updated_at: new Date().toISOString() }; mstore(db);
    localStorage.setItem(MSES, id); return { id, email, username: u };
  },
  async signIn({ email, password }) { await wait(); const db = mload(); const u = db.users.find((x) => x.email === email.trim().toLowerCase() && x.password === password); if (!u) throw new Error("Wrong email or password."); localStorage.setItem(MSES, u.id); return { id: u.id, email: u.email, username: db.profiles[u.id] ? db.profiles[u.id].username : null }; },
  async claimUsername(me, username, profile) { const u = cleanUsername(username); checkUsername(u); const db = mload(); if (Object.values(db.profiles).some((p) => p.username === u)) throw new Error("That username is taken."); db.profiles[me.id] = { id: me.id, username: u, ...profile }; mstore(db); return { ...me, username: u }; },
  async signOut() { localStorage.removeItem(MSES); },
  async loadSave(me) { await wait(); const db = mload(); return db.saves[me.id] || null; },
  async pushSave(me, save, profile) { const db = mload(); db.saves[me.id] = save; if (db.profiles[me.id]) db.profiles[me.id] = { ...db.profiles[me.id], ...profile, updated_at: new Date().toISOString() }; mstore(db); },
  async findUser(username) { await wait(); const u = cleanUsername(username); return Object.values(mload().profiles).find((p) => p.username === u) || null; },
  async getProfile(id) { await wait(); return mload().profiles[id] || null; },
  async links(me) { await wait(); return mload().links.filter((l) => l.requester === me.id || l.addressee === me.id); },
  async profiles(ids) { const db = mload(); return ids.map((i) => db.profiles[i]).filter(Boolean); },
  async top(kind, tz) { await wait(); const all = Object.values(mload().profiles).filter((p) => !tz || (p.stats || {}).tz === tz); return (kind === "ranked" ? all.filter((p) => p.placed).sort((a, b) => b.rating - a.rating) : all.sort((a, b) => ((b.stats || {}).tIndex || 0) - ((a.stats || {}).tIndex || 0))).slice(0, 50); },
  async presence(me, onSync) {
    const KEY = "felt-mock-presence";
    const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } };
    const write = (m) => localStorage.setItem(KEY, JSON.stringify(m));
    const tick = () => { const m = read(); const out = {}; Object.keys(m).forEach((k) => { if (Date.now() - m[k].at < 30000) out[k] = m[k].status; }); onSync(out); };
    const t = setInterval(tick, 1500); setTimeout(tick, 50);
    return {
      set(st) { const m = read(); m[me.id] = { status: st, at: Date.now() }; write(m); tick(); },
      hide() { const m = read(); delete m[me.id]; write(m); tick(); },
      leave() { clearInterval(t); const m = read(); delete m[me.id]; write(m); },
    };
  },
  async legendRank(me, rating) { await wait(); return Object.values(mload().profiles).filter((p) => p.id !== me.id && p.placed && p.rating >= 1500 && p.rating > rating).length + 1; },
  async token() { const id = localStorage.getItem(MSES); return id ? `tok-${id}` : null; },
  async watchTable(id, onRow) {
    let on = true;
    const pull = async () => { if (!on) return; try { const r = await api("get", { tableId: id }); onRow({ state: r.state, version: r.version, closed: r.closed, ...r.table }); } catch (e) { /* retry next time */ } };
    pull(); const t = setInterval(pull, 700);
    return () => { on = false; clearInterval(t); };
  },
  async holes(id) { const r = await api("get", { tableId: id }); return r.holes; },
  async claimPayouts() { return { total: 0, reasons: [] }; },
  async watchInvites(me, onList) { onList([]); return () => {}; },
  async clearInvite() {},
  async insertLink(me, other) { const db = mload(); if (!db.links.some((l) => l.requester === me.id && l.addressee === other)) db.links.push({ requester: me.id, addressee: other, status: "pending" }); mstore(db); },
  async acceptLink(me, other) { const db = mload(); db.links.forEach((l) => { if (l.requester === other && l.addressee === me.id) l.status = "accepted"; }); mstore(db); },
  async deleteLinks(me, other) { const db = mload(); db.links = db.links.filter((l) => !((l.requester === me.id && l.addressee === other) || (l.requester === other && l.addressee === me.id))); mstore(db); },
};

const be = () => (isMock() ? mock : real);
let syncListener = null;

// every move at an online table goes to the game server, signed with your login
export async function api(action, payload = {}) {
  const token = await be().token();
  if (!token) throw new Error("Sign in first.");
  let res;
  try { res = await fetch("/api/table", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ action, ...payload }) }); }
  catch (e) { throw new Error("Can't reach the table. Check your connection."); }
  let body = {}; try { body = await res.json(); } catch (e) { /* empty */ }
  if (!res.ok || body.error) throw new Error(body.error || `Server error (${res.status})`);
  return body;
}

/* ---------------- what the app calls ---------------- */
export const cloud = {
  current: () => be().current(),
  signUp: (a) => be().signUp(a),
  signIn: (a) => be().signIn(a),
  claimUsername: (me, u, p) => be().claimUsername(me, u, p),
  signOut: () => be().signOut(),
  loadSave: (me) => be().loadSave(me),
  // saves go through the server, which checks the chips and rank and sends back the real numbers
  async pushSave(me, save, profile) {
    let r;
    if (isMock()) { await mock.pushSave(me, save, profile); try { r = await api("save", { data: save, profile }); } catch (e) { return null; } }
    else r = await api("save", { data: save, profile });
    if (r && syncListener) syncListener(r);
    return r;
  },
  onSync(fn) { syncListener = fn; },
  getProfile: (id) => be().getProfile(id),
  top: (kind, tz) => be().top(kind, tz),
  legendRank: (me, rating) => be().legendRank(me, rating),
  watchTable: (id, cb) => be().watchTable(id, cb),
  holes: (id, me) => be().holes(id, me),
  claimPayouts: (me) => be().claimPayouts(me),
  watchInvites: (me, cb) => be().watchInvites(me, cb),
  clearInvite: (id) => be().clearInvite(id),
  presence: (me, onSync) => be().presence(me, onSync),
  // friends, split into accepted, waiting on me, and waiting on them
  async friends(me) {
    const links = await be().links(me);
    const other = (l) => (l.requester === me.id ? l.addressee : l.requester);
    const profs = await be().profiles([...new Set(links.map(other))]);
    const byId = Object.fromEntries(profs.map((p) => [p.id, p]));
    const out = { friends: [], incoming: [], outgoing: [] };
    links.forEach((l) => {
      const p = byId[other(l)]; if (!p) return;
      if (l.status === "accepted") out.friends.push(p);
      else if (l.addressee === me.id) out.incoming.push(p);
      else out.outgoing.push(p);
    });
    out.friends.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    return out;
  },
  async addFriend(me, username) {
    const u = cleanUsername(username);
    if (!u) throw new Error("Type their username.");
    if (u === me.username) throw new Error("That's you.");
    const p = await be().findUser(u);
    if (!p) throw new Error(`No player called @${u}.`);
    const links = await be().links(me);
    const l = links.find((x) => x.requester === p.id || x.addressee === p.id);
    if (l && l.status === "accepted") return { status: "already", profile: p };
    if (l && l.requester === p.id) { await be().acceptLink(me, p.id); return { status: "accepted", profile: p }; } // they already asked you
    if (l) return { status: "pending", profile: p };
    await be().insertLink(me, p.id);
    return { status: "sent", profile: p };
  },
  accept: (me, id) => be().acceptLink(me, id),
  remove: (me, id) => be().deleteLinks(me, id),
};

/* ---------------- notifications ---------------- */
export const pushSupported = () => typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
export const isStandalone = () => { try { return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true; } catch (e) { return false; } };
export const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
function b64ToBytes(b64) { const pad = "=".repeat((4 - (b64.length % 4)) % 4); const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/")); return Uint8Array.from(raw, (ch) => ch.charCodeAt(0)); }
export function registerSW() { if (!("serviceWorker" in navigator)) return Promise.resolve(null); return navigator.serviceWorker.register("/sw.js").catch(() => null); }
// Ask permission (needs a tap), subscribe this phone, and tell the server where to send things.
export async function enablePush() {
  if (!pushSupported()) throw new Error(isIOS() && !isStandalone() ? "Add felt to your Home Screen first, then turn these on from there." : "This browser can't do notifications.");
  const perm = await Notification.requestPermission();
  if (perm !== "granted") throw new Error("Notifications are blocked. You can allow them in your phone's settings.");
  const reg = (await navigator.serviceWorker.getRegistration()) || (await registerSW());
  if (!reg) throw new Error("Couldn't set up notifications.");
  const { key } = await api("pushKey");
  let sub = await reg.pushManager.getSubscription();
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(key) });
  await api("pushSubscribe", { sub: sub.toJSON() });
  return true;
}
export async function pushEnabled() {
  if (!pushSupported() || Notification.permission !== "granted") return false;
  const reg = await navigator.serviceWorker.getRegistration(); if (!reg) return false;
  return !!(await reg.pushManager.getSubscription());
}
