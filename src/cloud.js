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
    const { error: pe } = await c.from("profiles").insert({ id, username: u, ...profile, updated_at: new Date().toISOString() });
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
    const { error } = await c.from("profiles").insert({ id: me.id, username: u, ...profile, updated_at: new Date().toISOString() });
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
  async insertLink(me, other) { const db = mload(); if (!db.links.some((l) => l.requester === me.id && l.addressee === other)) db.links.push({ requester: me.id, addressee: other, status: "pending" }); mstore(db); },
  async acceptLink(me, other) { const db = mload(); db.links.forEach((l) => { if (l.requester === other && l.addressee === me.id) l.status = "accepted"; }); mstore(db); },
  async deleteLinks(me, other) { const db = mload(); db.links = db.links.filter((l) => !((l.requester === me.id && l.addressee === other) || (l.requester === other && l.addressee === me.id))); mstore(db); },
};

const be = () => (isMock() ? mock : real);

/* ---------------- what the app calls ---------------- */
export const cloud = {
  current: () => be().current(),
  signUp: (a) => be().signUp(a),
  signIn: (a) => be().signIn(a),
  claimUsername: (me, u, p) => be().claimUsername(me, u, p),
  signOut: () => be().signOut(),
  loadSave: (me) => be().loadSave(me),
  pushSave: (me, save, profile) => be().pushSave(me, save, profile),
  getProfile: (id) => be().getProfile(id),
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
