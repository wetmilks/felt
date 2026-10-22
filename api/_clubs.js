// Clubs and the weekly boards. Everything here goes through the server, so nobody can fake a tag,
// skip the club fee or pad the weekly numbers from their phone.
import { CLUB_COST, clubBadge, clubLevel, memberCap, checkClubName, checkClubTag, cleanAbout, CLUB_COLORS } from "./_clubrules.js";
import { boardWeek, lastBoardWeek, msToWeekReset } from "./_week.js";
import { ensureWallet } from "./_wallet.js";
import { pushTo } from "./_push.js";

const ok = (body) => ({ status: 200, body: { ok: true, ...body } });
const fail = (error, status = 400) => ({ status, body: { error } });
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const newCode = () => Array.from({ length: 5 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join("");
const n = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

// what everyone can see about a club (the invite code is for members only)
function pubClub(c, extra = {}) {
  const level = clubLevel(c.xp);
  return { id: c.id, name: c.name, tag: c.tag, color: CLUB_COLORS[c.color] ? c.color : "red", about: c.about || "", open: !!c.open, xp: n(c.xp), level, cap: memberCap(level), owner: c.owner, ...extra };
}
function playerRow(p, extra = {}) {
  const st = p.stats || {};
  return { id: p.id, username: p.username, name: p.display_name || p.username, avatar: p.avatar, title: p.title, prestige: p.prestige || 0, rating: p.rating || 0, placed: !!p.placed, club: st.club || null, medals: st.medals || null, ...extra };
}

// keep the tag on someone's profile in step with their club
export async function setProfileClub(db, uid, club) {
  try {
    const stats = { ...((await db.getProfileStats(uid)) || {}) };
    if (club) stats.club = clubBadge(club); else delete stats.club;
    await db.updateProfile(uid, { stats });
  } catch (e) { /* the next save fixes it */ }
}
async function refreshAllTags(db, club) {
  const members = await db.clubMembers(club.id);
  await Promise.all(members.map((m) => setProfileClub(db, m.user_id, club)));
}

// this week's club standings: every member's weekly winnings added up
async function clubStandings(db, wk) {
  const [clubs, week] = await Promise.all([db.listClubs(), db.clubWeek(wk)]);
  const byId = Object.fromEntries((week || []).map((r) => [r.club_id, r]));
  return clubs
    .map((c) => pubClub(c, { members: n((byId[c.id] || {}).members), score: n((byId[c.id] || {}).score) }))
    .filter((c) => c.members > 0)
    .sort((a, b) => b.score - a.score || b.xp - a.xp || a.name.localeCompare(b.name))
    .map((c, i) => ({ ...c, rank: i + 1 }));
}

// chips won or lost at real-money friends tables count toward the week too
export async function trackLive(db, uid, delta) {
  if (!delta) return;
  try { await db.weeklyAdd(boardWeek(), uid, Math.round(delta), 0); } catch (e) { /* the board is best effort */ }
}

export async function clubAction(a, uid, db) {
  const op = a.op;
  const wk = boardWeek();

  // ---- anyone can look ----
  if (op === "board") {
    const list = await clubStandings(db, wk);
    return ok({ week: wk, resetMs: msToWeekReset(), clubs: list.slice(0, 100) });
  }
  if (op === "view") {
    const c = await db.getClub(String(a.id || ""));
    if (!c) return fail("That club is gone.", 404);
    const members = await db.clubMembers(c.id);
    const ids = members.map((m) => m.user_id);
    const [profs, scores, list] = await Promise.all([db.profilesBasic(ids), db.weeklyFor(wk, ids), clubStandings(db, wk)]);
    const pm = Object.fromEntries(profs.map((p) => [p.id, p])); const sm = Object.fromEntries(scores.map((s) => [s.user_id, n(s.net)]));
    const mine = list.find((x) => x.id === c.id);
    return ok({
      club: pubClub(c, { members: members.length, score: mine ? mine.score : 0, rank: mine ? mine.rank : null, of: list.length }),
      members: members.filter((m) => pm[m.user_id]).map((m) => playerRow(pm[m.user_id], { role: m.role, net: sm[m.user_id] || 0 })).sort((x, y) => y.net - x.net),
    });
  }
  if (!uid) return fail("Sign in first.", 401);

  const mem = await db.memberOf(uid);
  const myClub = mem && mem.club;

  if (op === "mine") {
    if (!myClub) return ok({ club: null });
    const members = await db.clubMembers(myClub.id);
    const ids = members.map((m) => m.user_id);
    const [profs, scores, list, tables] = await Promise.all([db.profilesBasic(ids), db.weeklyFor(wk, ids), clubStandings(db, wk), db.clubTables(myClub.id)]);
    const pm = Object.fromEntries(profs.map((p) => [p.id, p])); const sm = Object.fromEntries(scores.map((s) => [s.user_id, n(s.net)]));
    const mine = list.find((x) => x.id === myClub.id);
    return ok({
      club: pubClub(myClub, { code: myClub.code, members: members.length, score: mine ? mine.score : 0, rank: mine ? mine.rank : null, of: list.length }),
      me: { role: mem.role, donated: n(mem.donated) },
      members: members.filter((m) => pm[m.user_id]).map((m) => playerRow(pm[m.user_id], { role: m.role, donated: n(m.donated), net: sm[m.user_id] || 0, joined: m.joined_at })).sort((x, y) => y.net - x.net || y.donated - x.donated),
      tables, week: wk, resetMs: msToWeekReset(),
    });
  }

  if (op === "create") {
    if (myClub) return fail("Leave your club first.");
    const [name, e1] = checkClubName(a.name); if (e1) return fail(e1);
    const [tag, e2] = checkClubTag(a.tag); if (e2) return fail(e2);
    const color = CLUB_COLORS[a.color] ? a.color : "red";
    await ensureWallet(db, uid, null);
    const bal = await db.walletAdd(uid, -CLUB_COST, false);
    if (bal == null) return fail(`Starting a club costs ${CLUB_COST.toLocaleString()} chips.`);
    let club = null, clash = null;
    for (let i = 0; i < 5 && !club; i++) {
      const r = await db.createClub({ name, tag, color, about: cleanAbout(a.about), open: a.open !== false, code: newCode(), owner: uid });
      if (r && r.conflict) { clash = r.conflict; if (clash !== "code") break; } else club = r;
    }
    if (!club) {
      await db.walletAdd(uid, CLUB_COST, true);
      return fail(clash === "tag" ? `The tag ${tag} is taken.` : clash === "name" ? "That name is taken." : "Couldn't make the club. Try again.");
    }
    if (!(await db.addMember(uid, club.id, "owner"))) { await db.deleteClub(club.id); await db.walletAdd(uid, CLUB_COST, true); return fail("Leave your club first."); }
    await setProfileClub(db, uid, club);
    return ok({ club: pubClub(club, { code: club.code, members: 1 }), debit: CLUB_COST });
  }

  if (op === "join") {
    if (myClub) return fail("Leave your club first.");
    const code = String(a.code || "").trim().toUpperCase();
    const c = code ? await db.findClubByCode(code) : await db.getClub(String(a.id || ""));
    if (!c) return fail(code ? `No club with code ${code}.` : "That club is gone.", 404);
    if (!c.open && code !== c.code) return fail("That club is invite only. Ask a member for the code.");
    const count = (await db.clubMembers(c.id)).length;
    if (count >= memberCap(clubLevel(c.xp))) return fail(`${c.name} is full.`);
    if (!(await db.addMember(uid, c.id, "member"))) return fail("Leave your club first.");
    await setProfileClub(db, uid, c);
    return ok({ club: pubClub(c, { members: count + 1 }) });
  }

  if (!myClub) return fail("You're not in a club.");
  const isOwner = mem.role === "owner"; const isAdmin = isOwner || mem.role === "admin";

  if (op === "leave") {
    await db.removeMember(uid);
    await setProfileClub(db, uid, null);
    if (isOwner) {
      const rest = await db.clubMembers(myClub.id);
      if (!rest.length) { await db.deleteClub(myClub.id); return ok({ closed: true }); }
      const next = rest.slice().sort((x, y) => (y.role === "admin") - (x.role === "admin") || Date.parse(x.joined_at) - Date.parse(y.joined_at))[0];
      await db.setMemberRole(next.user_id, "owner"); await db.updateClub(myClub.id, { owner: next.user_id });
    }
    return ok({});
  }

  if (op === "kick" || op === "role") {
    const target = String(a.user || "");
    if (!target || target === uid) return fail("Pick someone else.");
    const tm = await db.memberOf(target);
    if (!tm || tm.club_id !== myClub.id) return fail("They're not in your club.");
    if (op === "kick") {
      if (!isAdmin || tm.role === "owner" || (tm.role === "admin" && !isOwner)) return fail("Only the owner can do that.", 403);
      await db.removeMember(target); await setProfileClub(db, target, null);
      return ok({});
    }
    if (!isOwner) return fail("Only the owner can change roles.", 403);
    const role = a.role === "owner" ? "owner" : a.role === "admin" ? "admin" : "member";
    if (role === "owner") { await db.setMemberRole(target, "owner"); await db.setMemberRole(uid, "admin"); await db.updateClub(myClub.id, { owner: target }); }
    else await db.setMemberRole(target, role);
    return ok({});
  }

  if (op === "edit") {
    if (!isAdmin) return fail("Only the owner and admins can edit the club.", 403);
    const fields = {};
    if (a.name != null) { const [v, e] = checkClubName(a.name); if (e) return fail(e); fields.name = v; }
    if (a.tag != null) { const [v, e] = checkClubTag(a.tag); if (e) return fail(e); fields.tag = v; }
    if (a.color != null && CLUB_COLORS[a.color]) fields.color = a.color;
    if (a.about != null) fields.about = cleanAbout(a.about);
    if (a.open != null) fields.open = !!a.open;
    if (a.newCode) fields.code = newCode();
    const clash = await db.updateClub(myClub.id, fields);
    if (clash) return fail(clash === "tag" ? `The tag ${fields.tag} is taken.` : clash === "name" ? "That name is taken." : "Couldn't save. Try again.");
    const club = { ...myClub, ...fields };
    if (fields.tag || fields.color) await refreshAllTags(db, club);
    return ok({ club: pubClub(club, { code: club.code }) });
  }

  if (op === "donate") {
    const amount = Math.floor(n(a.amount));
    if (amount < 100 || amount > 10000000) return fail("Pick an amount.");
    await ensureWallet(db, uid, null);
    const bal = await db.walletAdd(uid, -amount, false);
    if (bal == null) return fail(`You don't have ${amount.toLocaleString()} chips to put in.`);
    const before = clubLevel(myClub.xp);
    const xp = await db.clubDonate(myClub.id, uid, amount);
    const level = clubLevel(xp);
    if (level !== before) await refreshAllTags(db, { ...myClub, xp });
    return ok({ debit: amount, xp, level, leveled: level > before });
  }

  return fail("Unknown club action.");
}

// tell your club a table just opened, but only people who aren't already looking at felt
export async function announceClubTable(db, uid, code, sb, bb) {
  try {
    const mem = await db.memberOf(uid); if (!mem || !mem.club) return;
    const members = (await db.clubMembers(mem.club.id)).filter((m) => m.user_id !== uid);
    const me = await db.getProfile(uid);
    const who = (me && (me.display_name || me.username)) || "Someone";
    await Promise.all(members.map((m) => pushTo(db, m.user_id, { title: `${mem.club.tag} table open`, body: `${who} started a ${sb}/${bb} club table`, url: `/?table=${code}`, tag: `club-${code}` }, { onlyIfAway: true })));
  } catch (e) { /* best effort */ }
}

export async function weeklyAction(a, uid, db) {
  if (a.op === "board") {
    const wk = boardWeek(), lw = lastBoardWeek();
    const [top, lastTop] = await Promise.all([db.weeklyTop(wk, 50), db.weeklyTop(lw, 3)]);
    const rows = top.filter((r) => n(r.net) > 0); // the board is for winners
    const lastRows = lastTop.filter((r) => n(r.net) > 0);
    const profs = await db.profilesBasic([...new Set([...rows, ...lastRows].map((r) => r.user_id))]);
    const pm = Object.fromEntries(profs.map((p) => [p.id, p]));
    let me = null;
    if (uid) {
      const mine = await db.weeklyMine(wk, uid);
      const net = mine ? n(mine.net) : 0;
      me = { net, place: net > 0 ? (await db.weeklyAbove(wk, net)) + 1 : null };
    }
    return ok({
      week: wk, resetMs: msToWeekReset(),
      players: rows.filter((r) => pm[r.user_id]).map((r) => playerRow(pm[r.user_id], { net: n(r.net) })),
      last: { week: lw, players: lastRows.filter((r) => pm[r.user_id]).map((r) => playerRow(pm[r.user_id], { net: n(r.net) })) },
      me,
    });
  }
  if (!uid) return fail("Sign in first.", 401);
  // a new week: if you finished top 3 last week, your medal is waiting
  if (a.op === "claim") {
    const lw = lastBoardWeek();
    const top = (await db.weeklyTop(lw, 3)).filter((r) => n(r.net) > 0);
    const i = top.findIndex((r) => r.user_id === uid);
    if (i < 0) return ok({ week: lw, place: null });
    if (!(await db.weeklyClaim(lw, uid))) return ok({ week: lw, place: null, already: true });
    return ok({ week: lw, place: i + 1, net: n(top[i].net) });
  }
  return fail("Unknown weekly action.");
}
