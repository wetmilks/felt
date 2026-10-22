import { useState, useEffect, useRef, useCallback } from "react";
import { registerSW, pushEnabled, enablePush, cloud, api, cloudEnabled, isStandalone, isIOS, pushSupported } from "./cloud.js";
import { LOADING_MS, LoadingScreen, hydrate, publicProfile } from "./app/boot.jsx";
import { ACHIEVEMENTS } from "./game/helpers.js";
import { CARD_BACKS, CHALLENGE_REWARD, CHIP_SETS, FELTS, STREAK_REWARDS, WIN_FX, applyChallengeEvent, challengeText, defaultCosmetics, ensureChallenges, ensurePass, findBack, findFelt, grantXp, localDateStr, ownsCosmetic, passRewardLabel, streakState, trackHistory } from "./game/progression.js";
import { PLACEMENT_MATCHES, RANKED_BUYIN, RANK_TIERS, isPlaced, rankName, tierForRating, tierOf } from "./game/ranked.js";
import { PRESTIGE_REWARD, SPIN_PRIZES, VIP_BACK, VIP_FELT, canPrestige, matchRating, pickSpinIndex, spinReady } from "./game/rewards.jsx";
import { defaultData, loadData, saveData, todayStr, vibrate } from "./game/save.js";
import { framesEarned, migrateRanked, rankedOutcome, refundThemes, rolloverSeason } from "./game/season.js";
import { TOURNEY_STACK, addHandToSkill, defaultSkill, placementFromSkill, tourneyPoints, tourneyPrize } from "./game/skill.js";
import { useSound } from "./game/sound.js";
import { setErrorContext } from "./app/errors.js";
import { TITLES, defaultTitles, newlyEarnedTitles } from "./game/titles.jsx";
import { AdminModal } from "./screens/Admin.jsx";
import { ClubsScreen } from "./screens/Clubs.jsx";
import { lastBoardWeek, weekLabel } from "../api/_week.js";
import { CoachScreen } from "./screens/Coach.jsx";
import { HomeMenu } from "./screens/Home.jsx";
import { ProfileScreen } from "./screens/Profile.jsx";
import { LeaderboardScreen } from "./screens/Ranks.jsx";
import { ShopScreen } from "./screens/Shop.jsx";
import { AuthModal } from "./social/Friends.jsx";
import { FriendsTableModal } from "./social/FriendsTable.jsx";
import { GLOBAL_STYLE } from "./styles/global.js";
import { OnlineTable } from "./table/OnlineTable.jsx";
import { PokerTable } from "./table/PokerTable.jsx";
import { InstallCard, NotifyCard } from "./ui/Prompts.jsx";
import { ordinal } from "./ui/hooks.js";
import { FeltLogo, SeasonEndScreen } from "./ui/primitives.jsx";

export default function App() {
  const [loaded, setLoaded] = useState(false);
  const [bootDone, setBootDone] = useState(false);
  const [data, setData] = useState(defaultData());
  const [tab, setTab] = useState("home");
  const [inTable, setInTable] = useState(false);
  const [session, setSession] = useState(null); // { mode, tableSize, stakes, buyIn, startChips }
  const [tableKey, setTableKey] = useState(0);
  const [soundOn, setSoundOn] = useState(true);
  const [toast, setToast] = useState(null);
  const [account, setAccount] = useState(null); // { id, email, username } when signed in
  const [authOpen, setAuthOpen] = useState(null); // "signup" | "signin" | "username"
  const [welcome, setWelcome] = useState(false); // first open without an account: sign up, sign in or play as a guest
  const [online, setOnline] = useState({}); // user id -> what they're doing, for everyone in the app right now
  const [onlineTable, setOnlineTable] = useState(null); // id of the friends table you're at
  const [ftOpen, setFtOpen] = useState(false); const [ftClub, setFtClub] = useState(null);
  const [pendingClub, setPendingClub] = useState(null); // a club code from an invite link
  // your club tag, for showing on your own stuff. The server is the real source; this just mirrors it.
  const setClubBadge = (c) => setData((d) => { const same = JSON.stringify(d.club || null) === JSON.stringify(c || null); if (same) return d; const n = { ...d, club: c || null }; saveData(n); return n; });
  const [invites, setInvites] = useState([]);
  const [inviteNames, setInviteNames] = useState({});
  const [isAdmin, setIsAdmin] = useState(false); const [adminOpen, setAdminOpen] = useState(false);
  const [legendNo, setLegendNo] = useState(null);
  // install + notifications
  const [installPrompt, setInstallPrompt] = useState(null);
  const [pushOn, setPushOn] = useState(false); const [pushBusy, setPushBusy] = useState(false);
  const [hideInstall, setHideInstall] = useState(() => { try { return !!localStorage.getItem("felt-hide-install"); } catch (e) { return false; } });
  const [hideNotify, setHideNotify] = useState(() => { try { return !!localStorage.getItem("felt-hide-notify"); } catch (e) { return false; } });
  useEffect(() => {
    registerSW();
    const onPrompt = (e) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    const onMsg = (e) => { const m = e.data || {}; if (m.type === "open" && m.url) { try { const code = new URL(m.url, window.location.origin).searchParams.get("table"); if (code) openTableCodeRef.current(code); } catch (err) { /* bad url */ } } };
    if ("serviceWorker" in navigator) navigator.serviceWorker.addEventListener("message", onMsg);
    return () => { window.removeEventListener("beforeinstallprompt", onPrompt); if ("serviceWorker" in navigator) navigator.serviceWorker.removeEventListener("message", onMsg); };
  }, []);
  useEffect(() => { if (!account) { setPushOn(false); return; } pushEnabled().then(setPushOn).catch(() => setPushOn(false)); }, [account]);
  const turnOnPush = async () => {
    setPushBusy(true);
    try { await enablePush(); setPushOn(true); showToast({ title: "Notifications on", label: "You'll hear about invites and your turn" }, 2600); }
    catch (e) { showToast({ title: "Notifications", label: e.message }, 3400); }
    setPushBusy(false);
  };
  const dismiss = (key, set) => { set(true); try { localStorage.setItem(key, "1"); } catch (e) { /* private mode */ } };
  const openTableCodeRef = useRef(() => {});
  const champRating = isPlaced(data.ranked) && data.ranked.rating >= 1500 ? Math.round(data.ranked.rating) : null;
  useEffect(() => {
    if (!account || champRating == null) { setLegendNo(null); return; }
    let on = true; const t = setTimeout(() => cloud.legendRank(account, champRating).then((n) => on && setLegendNo(n)).catch(() => {}), 600);
    return () => { on = false; clearTimeout(t); };
  }, [account, champRating]);
  useEffect(() => { if (!account || !account.username) { setIsAdmin(false); return; } api("admin", { op: "check" }).then((r) => setIsAdmin(!!r.admin)).catch(() => setIsAdmin(false)); }, [account]);
  const toastTimer = useRef(null);
  const sound = useSound(soundOn);

  useEffect(() => {
    const minTimer = new Promise((res) => setTimeout(res, LOADING_MS));
    (async () => {
      const [d] = await Promise.all([loadData(), minTimer]);
      if (d) {
        const merged = hydrate(d);
        setData(merged);
        saveData(merged);
      }
      // signed in from before: pull the account's save if it's newer than this phone's
      if (cloudEnabled()) {
        try {
          const me = await cloud.current();
          if (me) {
            setAccount(me);
            const remote = await cloud.loadSave(me);
            if (remote && (remote.savedAt || 0) > ((d && d.savedAt) || 0)) { const m = hydrate(remote); setData(m); saveData(m); }
          }
        } catch (e) { /* offline: keep playing on the local save */ }
      }
      setLoaded(true);
      setTimeout(() => setBootDone(true), 600);
    })();
  }, []);
  const persist = (next) => { const n = { ...next, savedAt: Date.now() }; setData(n); saveData(n); };
  // The server owns your chips and rank. After each save it sends back the real numbers, and anything
  // you earned on this phone since that save stays on top of them.
  const [syncFlag, setSyncFlag] = useState(false);
  useEffect(() => {
    cloud.onSync((r) => {
      if (!r || r.chips == null) return;
      setData((d) => {
        const chips = Math.max(0, Math.round(r.chips + (d.chips - r.sentChips)));
        const rk = d.ranked || {};
        const rating = Math.max(0, Math.round(r.rating + ((rk.rating || 0) - r.sentRating)));
        const prestige = Math.max(0, r.prestige + ((rk.prestige || 0) - r.sentPrestige));
        if (chips === d.chips && (d.chipSync || {}).base === r.chips && rating === Math.round(rk.rating || 0) && prestige === (rk.prestige || 0)) return d;
        const n = { ...d, chips, chipSync: { base: r.chips }, ranked: { ...rk, rating, prestige } };
        saveData(n); return n;
      });
      if (r.flagged) setSyncFlag(true);
      if ("club" in r) setClubBadge(r.club);
    });
    return () => cloud.onSync(null);
  }, []);
  useEffect(() => { if (syncFlag) { showToast({ title: "Chips checked", label: "Some chips or RP didn't add up, so the server kept the verified amount." }, 3600); setSyncFlag(false); } }, [syncFlag]); // eslint-disable-line react-hooks/exhaustive-deps
  // signed in: every change goes up to your account a couple of seconds later
  const pushRef = useRef(null);
  useEffect(() => {
    if (!account || !loaded) return;
    clearTimeout(pushRef.current);
    pushRef.current = setTimeout(() => { cloud.pushSave(account, data, publicProfile(data)).catch(() => {}); }, 2500);
    return () => clearTimeout(pushRef.current);
  }, [data, account, loaded]);
  // tell friends you're here and what you're playing
  const presenceRef = useRef(null);
  const myStatus = onlineTable ? "At a friends table" : !inTable || !session ? "In the lobby" : session.vip ? "At the High Roller table" : session.mode === "ranked" ? "Playing ranked" : session.mode === "tournament" ? "In a tournament" : session.mode === "practice" ? "Practicing" : "Playing cash";
  // error reports say where the player was
  setErrorContext({ where: inTable || onlineTable ? myStatus : `${tab} tab` }); // set during render so a crash in this render is tagged right
  useEffect(() => {
    if (!account || !account.username) return;
    let gone = false, h = null;
    cloud.presence(account, (m) => !gone && setOnline(m)).then((x) => { if (gone) { x.leave(); return; } h = x; presenceRef.current = x; x.set(statusRef.current); }).catch(() => {});
    const vis = () => { const x = presenceRef.current; if (!x) return; if (document.hidden) x.hide(); else x.set(statusRef.current); };
    document.addEventListener("visibilitychange", vis);
    return () => { gone = true; document.removeEventListener("visibilitychange", vis); if (h) h.leave(); presenceRef.current = null; setOnline({}); };
  }, [account]);
  const statusRef = useRef(myStatus); statusRef.current = myStatus;
  useEffect(() => { if (presenceRef.current && !document.hidden) presenceRef.current.set(myStatus); }, [myStatus]);
  // first time you open felt without an account, you pick: make one, sign in, or play as a guest
  useEffect(() => {
    if (!loaded || !bootDone || account || !cloudEnabled() || data.welcomed || authOpen) return;
    setWelcome(true); setAuthOpen("signup");
  }, [loaded, bootDone, account, data.welcomed]); // eslint-disable-line react-hooks/exhaustive-deps
  const closeAuth = () => { setAuthOpen(null); if (welcome) { setWelcome(false); persist({ ...data, welcomed: true }); } };
  const handleAuthed = async (me, mode) => {
    setWelcome(false);
    setAccount(me); setAuthOpen(me.username ? null : "username");
    if (mode === "signin") {
      try {
        const remote = await cloud.loadSave(me);
        if (remote) {
          try { localStorage.setItem("felt-guest-backup", JSON.stringify(data)); } catch (e) { /* full */ }
          const m = { ...hydrate(remote), savedAt: Date.now() }; setData(m); saveData(m);
          showToast({ title: "Signed in", label: `Welcome back, @${me.username || "player"}` }, 2600); return;
        }
      } catch (e) { /* fall through and upload this phone's progress */ }
    }
    let cur = data;
    if (mode === "signup" && me.username && (!data.name || data.name === "You")) { cur = { ...data, name: me.username }; persist(cur); }
    cloud.pushSave(me, cur, publicProfile(cur)).catch(() => {});
    showToast({ title: mode === "signup" ? "Account made" : "Signed in", label: "Your progress now saves online" }, 2600);
  };
  // signing out hands the phone back to a fresh guest; your progress lives in the account
  // chips coming back from friends tables land here
  const dataRef = useRef(data); dataRef.current = data;
  const claimPayouts = useCallback(async () => {
    if (!account) return;
    try {
      const r = await cloud.claimPayouts(account);
      if (r.total !== 0) { const d = dataRef.current; const base = d.chipSync && d.chipSync.base != null ? d.chipSync.base + r.total : undefined; persist({ ...d, chips: Math.max(0, d.chips + r.total), ...(base != null ? { chipSync: { base } } : {}) }); showToast({ title: `${r.total > 0 ? "+" : "-"}${Math.abs(r.total).toLocaleString()} chips`, label: r.reasons.length === 1 ? r.reasons[0] : "Chips from friends tables" }, 3000); if (r.total > 0) sound.coin(); }
    } catch (e) { /* try again later */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account]);
  useEffect(() => { if (!account || !loaded) return; claimPayouts(); const t = setInterval(claimPayouts, 60000); return () => clearInterval(t); }, [account, loaded, claimPayouts]);
  const handleDebit = useCallback((amount) => { const d = dataRef.current; const base = d.chipSync && d.chipSync.base != null ? d.chipSync.base - amount : undefined; persist({ ...d, chips: Math.max(0, d.chips - amount), ...(base != null ? { chipSync: { base } } : {}) }); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // friends asking you to their table
  useEffect(() => {
    if (!account || !account.username) { setInvites([]); return; }
    let stop = null, on = true;
    cloud.watchInvites(account, (list) => { if (!on) return; setInvites(list); list.forEach((iv) => { if (!inviteNames[iv.from_user]) cloud.getProfile(iv.from_user).then((p) => p && setInviteNames((m) => ({ ...m, [iv.from_user]: p.display_name }))).catch(() => {}); }); }).then((s) => { if (on) stop = s; else s(); });
    return () => { on = false; if (stop) stop(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account]);
  const openTable = (id) => { sound.tap(); setFtOpen(false); setOnlineTable(id); };
  openTableCodeRef.current = (code) => { if (!account) return; api("join", { code }).then((r) => openTable(r.tableId)).catch((e) => showToast({ title: "Can't join", label: e.message }, 2600)); };
  const acceptInvite = async (iv) => { cloud.clearInvite(iv.id).catch(() => {}); setInvites((l) => l.filter((x) => x.id !== iv.id)); try { const r = await api("join", { code: iv.code }); openTable(r.tableId); } catch (e) { showToast({ title: "Can't join", label: e.message }, 2600); } };
  // a shared link like felt-coral.vercel.app/?table=ABCD drops you at that table
  useEffect(() => {
    if (!loaded) return;
    let code = null, clubCode = null; try { const q = new URLSearchParams(window.location.search); code = q.get("table"); clubCode = q.get("club"); } catch (e) { /* no url */ }
    // felt-coral.vercel.app/?club=ABCDE opens the Clubs tab ready to join
    if (clubCode && /^[A-Za-z]{5}$/.test(clubCode)) { try { window.history.replaceState(null, "", window.location.pathname); } catch (e) { /* ignore */ } setPendingClub(clubCode.toUpperCase()); setTab("clubs"); if (!account) { setWelcome(false); persist({ ...dataRef.current, welcomed: true }); } return; }
    if (!code) return;
    try { window.history.replaceState(null, "", window.location.pathname); } catch (e) { /* ignore */ }
    if (!account) { showToast({ title: "Join your friend's table", label: "Make an account or sign in first" }, 3200); setAuthOpen("signup"); try { sessionStorage.setItem("felt-pending-table", code); } catch (e) { /* ignore */ } return; }
    api("join", { code }).then((r) => openTable(r.tableId)).catch((e) => showToast({ title: "Can't join", label: e.message }, 2800));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);
  useEffect(() => {
    if (!account) return; let code = null; try { code = sessionStorage.getItem("felt-pending-table"); sessionStorage.removeItem("felt-pending-table"); } catch (e) { /* ignore */ }
    if (code) api("join", { code }).then((r) => openTable(r.tableId)).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account]);
  // a new week: if you finished top 3 on last week's board, collect your medal
  useEffect(() => {
    if (!account || !account.username || !loaded) return;
    const lw = lastBoardWeek();
    if (dataRef.current.medalWeek === lw) return;
    let on = true;
    const t = setTimeout(() => {
      api("weekly", { op: "claim" }).then((r) => {
        if (!on) return;
        setData((d) => {
          let next = { ...d, medalWeek: lw };
          if (r.place) next = withTitles({ ...next, medals: [...(d.medals || []).filter((m) => m.week !== r.week), { week: r.week, place: r.place, net: r.net }].slice(-60) });
          saveData(next); return next;
        });
        if (r.place) { sound.rankUp(); showToast({ title: `${ordinal(r.place)} on the weekly board`, label: `Week of ${weekLabel(r.week)}, +${(r.net || 0).toLocaleString()} won. Your medal is on your profile.` }, 4200); setTimeout(flushNotes, 4400); }
      }).catch(() => {});
    }, 1800);
    return () => { on = false; clearTimeout(t); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account, loaded]);
  const handleSignOut = async () => {
    try { await cloud.pushSave(account, data, publicProfile(data)); } catch (e) { showToast({ title: "Can't sign out yet", label: "Couldn't save to your account. Check your connection." }, 2800); return; }
    await cloud.signOut().catch(() => {}); setAccount(null);
    const fresh = hydrate({ ...defaultData(), name: "You" }); setData(fresh); saveData(fresh);
    showToast({ title: "Signed out", label: "Sign back in anytime to pick up where you left off" }, 2600);
  };
  const showToast = (t, ms = 2600) => { clearTimeout(toastTimer.current); setToast(t); toastTimer.current = setTimeout(() => setToast(null), ms); };

  const checkAchievements = (statsObj, base) => {
    const newly = ACHIEVEMENTS.filter((a) => !base.achievements.includes(a.id) && a.check(statsObj));
    if (newly.length === 0) return base.achievements;
    sound.achievement(); vibrate([20, 30, 20, 30, 40]);
    showToast({ title: "Achievement unlocked", label: newly[0].label });
    return [...base.achievements, ...newly.map((a) => a.id)];
  };
  const addSkill = addHandToSkill;
  // Updaters stay pure: they queue what you earned and this shows it right after.
  const notesRef = useRef([]);
  const flushNotes = () => {
    const notes = notesRef.current; notesRef.current = [];
    if (!notes.length) return;
    const lvl = notes.filter((n) => n.kind === "level");
    const chal = notes.filter((n) => n.kind === "challenge");
    const ttl = notes.filter((n) => n.kind === "title");
    if (ttl.length) { sound.rankUp(); showToast({ title: "Title unlocked", label: `${ttl.map((n) => n.t.label).join(", ")}. Equip it on your profile.` }, 3200); }
    else if (lvl.length) { const top = lvl[lvl.length - 1]; sound.rankUp(); showToast({ title: `Season pass level ${top.level}`, label: `Unlocked ${passRewardLabel(top.reward)}` }, 3000); }
    else if (chal.length) { sound.achievement(); showToast({ title: "Challenge complete", label: `${challengeText(chal[0].c)}. Claim it on Home.` }, 2800); }
  };
  const queueNotes = (completed, earned, ch) => {
    completed.forEach((id) => { const c = [...ch.daily, ...ch.weekly].find((x) => x.id === id); if (c) notesRef.current.push({ kind: "challenge", c }); });
    earned.forEach((e) => notesRef.current.push({ kind: "level", ...e }));
  };
  const withTitles = (d) => {
    const earned = newlyEarnedTitles(d);
    if (!earned.length) return d;
    earned.forEach((t) => notesRef.current.push({ kind: "title", t }));
    const tt = d.titles || defaultTitles();
    return { ...d, titles: { ...tt, owned: [...tt.owned, ...earned.map((t) => t.key)] } };
  };
  const progress = (d, e, xp) => {
    const r = applyChallengeEvent(ensureChallenges(d.challenges), e);
    const g = grantXp({ ...d, challenges: r.ch }, xp);
    queueNotes(r.completed, g.earned, r.ch);
    return g.next;
  };

  const handleClaimChips = (amount) => { sound.coin(); vibrate(20); persist({ ...data, chips: data.chips + amount }); };
  const handleClaimDaily = () => {
    const st = streakState(data.streak);
    if (st.claimedToday) return;
    const amount = STREAK_REWARDS[st.nextDay - 1];
    sound.coin(); vibrate(20);
    const next = withTitles(trackHistory(data, { ...data, chips: data.chips + amount, lastDailyBonus: todayStr(), streak: { count: st.nextDay, last: localDateStr() } }, null));
    persist(next);
    showToast({ title: `Day ${st.nextDay} streak`, label: `+${amount.toLocaleString()} chips` });
    setTimeout(flushNotes, 2700);
  };
  const handleClaimChallenge = (which, id) => {
    const ch = ensureChallenges(data.challenges);
    const list = ch[which];
    const c = list.find((x) => x.id === id);
    if (!c || c.claimed || c.progress < c.target) return;
    const rw = CHALLENGE_REWARD[which];
    sound.coin(); vibrate(20);
    const g = grantXp({ ...data, chips: data.chips + rw.chips, challenges: { ...ch, [which]: list.map((x) => (x.id === id ? { ...x, claimed: true } : x)) } }, rw.xp);
    persist(withTitles(trackHistory(data, g.next, null)));
    setTimeout(flushNotes, 3100);
    if (g.earned.length) { const top = g.earned[g.earned.length - 1]; sound.rankUp(); showToast({ title: `Season pass level ${top.level}`, label: `Unlocked ${passRewardLabel(top.reward)}` }, 3000); }
    else showToast({ title: "Reward claimed", label: `+${rw.chips.toLocaleString()} chips, +${rw.xp} XP` });
  };
  const handleBuyCosmetic = (type, item) => {
    const cos = { ...defaultCosmetics(), ...(data.cosmetics || {}) };
    const [field, slot] = { back: ["backs", "cardBack"], felt: ["felts", "felt"], chipset: ["chipsets", "chipset"] }[type] || [];
    if (!field || (cos[field] || []).includes(item.key) || !item.cost || data.chips < item.cost) return;
    sound.coin(); vibrate(20);
    persist({ ...data, chips: data.chips - item.cost, cosmetics: { ...cos, [field]: [...(cos[field] || []), item.key], [slot]: item.key } });
    if (item.vault) showToast({ title: "From the Vault", label: `${item.label} is yours` });
  };
  // the wheel's result is decided here and saved before the animation even starts
  const handleSpin = () => {
    if (!spinReady(data)) return null;
    const index = pickSpinIndex();
    const pz = SPIN_PRIZES[index];
    let next = { ...data, lastSpin: localDateStr() };
    let text = "", big = false;
    if (pz.type === "chips") { next = { ...next, chips: next.chips + pz.amount }; text = `${pz.amount.toLocaleString()} chips`; big = pz.amount >= 5000; }
    else if (pz.type === "xp") { const g = grantXp(next, pz.amount); next = g.next; text = `${pz.amount} XP`; g.earned.forEach((e) => notesRef.current.push({ kind: "level", ...e })); }
    else {
      const cos = next.cosmetics || defaultCosmetics(); const tt = next.titles || defaultTitles();
      const pool = [
        ...FELTS.filter((f) => f.cost && !f.vault && !cos.felts.includes(f.key)).map((f) => ({ kind: "felt", item: f })),
        ...CARD_BACKS.filter((b) => b.cost && !b.vault && !cos.backs.includes(b.key)).map((b) => ({ kind: "back", item: b })),
        ...TITLES.filter((t) => t.cost && t.cost <= 3000 && !tt.owned.includes(t.key)).map((t) => ({ kind: "title", item: t })),
      ];
      if (!pool.length) { next = { ...next, chips: next.chips + 3000 }; text = "3,000 chips"; }
      else {
        const m = pool[Math.floor(Math.random() * pool.length)]; big = true;
        if (m.kind === "felt") { next = { ...next, cosmetics: { ...cos, felts: [...cos.felts, m.item.key] } }; text = `${m.item.label} felt`; }
        else if (m.kind === "back") { next = { ...next, cosmetics: { ...cos, backs: [...cos.backs, m.item.key] } }; text = `${m.item.label} card back`; }
        else { next = { ...next, titles: { ...tt, owned: [...tt.owned, m.item.key] } }; text = `"${m.item.label}" title`; }
      }
    }
    persist(withTitles(trackHistory(data, next, null)));
    setTimeout(flushNotes, 5200);
    return { index, text, big };
  };
  const handlePrestige = () => {
    const r = data.ranked;
    if (!canPrestige(r)) return;
    sound.rankUp(); vibrate([30, 40, 30, 40, 60]);
    const n = (r.prestige || 0) + 1;
    persist({ ...data, chips: data.chips + PRESTIGE_REWARD, ranked: { ...r, rating: 0, mmr: matchRating(r), prestige: n, streak: 0, recent: [] } });
    showToast({ title: `Prestige ${n}`, label: `Back to Bronze. +${PRESTIGE_REWARD.toLocaleString()} chips` }, 3200);
  };
  // themes were retired: tell anyone who got chips back, once
  useEffect(() => {
    if (!data.themeRefund) return;
    showToast({ title: "Themes are gone", label: `You got ${data.themeRefund.toLocaleString()} chips back` }, 3600);
    const { themeRefund, ...rest } = data;
    persist(rest);
  }, [data.themeRefund]); // eslint-disable-line react-hooks/exhaustive-deps
  const handleBuyTitle = (t) => {
    const tt = data.titles || defaultTitles();
    if (!t.cost || tt.owned.includes(t.key) || data.chips < t.cost) return;
    sound.coin(); vibrate(20);
    persist({ ...data, chips: data.chips - t.cost, titles: { owned: [...tt.owned, t.key], equipped: t.key } });
    showToast({ title: "Title equipped", label: t.label });
  };
  const handleEquipTitle = (key) => {
    const tt = data.titles || defaultTitles();
    if (!tt.owned.includes(key)) return;
    sound.tap();
    persist({ ...data, titles: { ...tt, equipped: key } });
  };
  const handleEquipPass = (r) => {
    if (r.type === "title") return handleEquipTitle(r.key);
    if (r.type === "avatar") return handleSelectAvatar(r.key);
    return handleEquipCosmetic(r.type, r.key);
  };
  const handleEquipCosmetic = (type, key) => {
    const cos = { ...defaultCosmetics(), ...(data.cosmetics || {}) };
    const map = { back: [CARD_BACKS, "backs", "cardBack"], felt: [FELTS, "felts", "felt"], chipset: [CHIP_SETS, "chipsets", "chipset"], fx: [WIN_FX, "fxs", "fx"] }[type];
    if (!map) return;
    const item = map[0].find((x) => x.key === key);
    if (!item || !ownsCosmetic(cos, map[1], item, data.ranked.prestige)) return;
    sound.tap();
    persist({ ...data, cosmetics: { ...cos, [map[2]]: key } });
  };
  const handleBuyAvatar = (avatarObj) => {
    if (data.unlocked.includes(avatarObj.emoji) || data.chips < avatarObj.cost) return;
    sound.coin();
    persist({ ...data, chips: data.chips - avatarObj.cost, unlocked: [...data.unlocked, avatarObj.emoji] });
  };
  const handleSelectAvatar = (emoji) => { sound.tap(); persist({ ...data, avatar: emoji, usePhoto: false }); };
  const handleSetPhoto = (url, err) => {
    if (err) { showToast({ title: "Photo", label: err }, 2600); return; }
    sound.tap(); persist(url ? { ...data, photo: url, usePhoto: true } : { ...data, photo: null, usePhoto: false });
  };
  const handleUsePhoto = (on) => { sound.tap(); persist({ ...data, usePhoto: !!on && !!data.photo }); };
  const handleSelectFrame = (frameKey) => { sound.tap(); persist({ ...data, ranked: { ...data.ranked, frame: frameKey } }); };
  const handleUpdateName = (name) => { sound.tap(); persist({ ...data, name }); };
  const handleAddFriend = (name) => { sound.tap(); persist({ ...data, friends: [...data.friends, name] }); };

  // Saves after every hand so closing the app mid-session never loses progress.
  // Cash games bank the stack each hand. Ranked chips settle when the match ends.
  // Practice only feeds the coach. Everything else also moves challenges and the season pass.
  const handleHandResolved = (p) => {
    const mode = session?.mode;
    const isCash = mode === "cash";
    const counts = mode === "cash" || mode === "ranked";
    setData((d) => {
      let next = { ...d, skill: p.decisions ? addSkill(d.skill || defaultSkill(), p.decisions) : d.skill };
      if (counts) {
        const pos = { late: [0, 0], early: [0, 0], blinds: [0, 0], ...(d.stats.pos || {}) };
        const pk = pos[p.position] ? p.position : "early";
        pos[pk] = [pos[pk][0] + 1, pos[pk][1] + (p.won ? 1 : 0)];
        const cur = p.won ? (d.stats.curWinStreak || 0) + 1 : 0;
        const stats = { ...d.stats, pos, curWinStreak: cur, bestWinStreak: Math.max(d.stats.bestWinStreak || 0, cur), handsPlayed: d.stats.handsPlayed + 1, handsWon: d.stats.handsWon + (p.won ? 1 : 0), biggestPot: Math.max(d.stats.biggestPot, p.won ? p.potWon : 0) };
        if (isCash && typeof p.finalStack === "number") stats.netChips = d.stats.netChips + (p.finalStack - d.chips);
        next = { ...next, stats, achievements: checkAchievements(stats, d), ...(isCash && typeof p.finalStack === "number" ? { chips: Math.max(0, p.finalStack) } : {}) };
      }
      if (mode !== "practice") next = progress(next, { hand: true, ...p }, 5 + (p.won ? 6 : 0));
      next = trackHistory(d, next, mode !== "practice" && p.wonSD && p.best ? p.best : null);
      next = withTitles(next);
      saveData(next);
      return next;
    });
    setTimeout(flushNotes, 0);
  };
  const handleExitTable = (finalStack, tournamentResult, rankedResult, opts = {}) => {
    sound.tap();
    const mode = session?.mode;
    if (mode === "ranked") {
      const buyIn = session?.buyIn ?? RANKED_BUYIN;
      const o = rankedResult || rankedOutcome({ buyIn, finalStack, cleared: false, hands: 0, knockouts: 0, ranked: data.ranked });
      const nextChips = Math.max(0, data.chips - buyIn + o.finalStack);
      let placedNow = null;
      setData((d) => {
        const r = d.ranked;
        let ranked = { ...r, wins: r.wins + (o.won ? 1 : 0), losses: r.losses + (o.won ? 0 : 1), streak: o.won ? Math.max(0, r.streak || 0) + 1 : 0 };
        if (o.placement) {
          const games = [...(r.placementGames || []), { won: o.won, hands: o.matchHands || [] }];
          ranked = { ...ranked, placementGames: games, recent: [{ won: o.won, delta: 0, placement: true }, ...(r.recent || [])].slice(0, 10) };
          if (games.length >= PLACEMENT_MATCHES) {
            const rating = o.placedRating != null ? o.placedRating : placementFromSkill(d.skill, games).rating;
            const newFrames = framesEarned(rating, r.frames);
            placedNow = rating;
            ranked = { ...ranked, placed: true, rating, peakRating: Math.max(r.peakRating || 0, rating), report: o.report || null, placementGames: games.map((g) => ({ won: g.won })), frames: [...r.frames, ...newFrames], frame: newFrames.length ? newFrames[newFrames.length - 1] : r.frame };
          }
        } else {
          const frames = [...r.frames, ...o.newFrames.filter((f) => !r.frames.includes(f))];
          ranked = { ...ranked, rating: o.after, mmr: undefined, peakRating: Math.max(r.peakRating || 0, o.after), frames, frame: o.newFrames.length > 0 ? o.newFrames[o.newFrames.length - 1] : r.frame, recent: [{ won: o.won, delta: o.delta }, ...(r.recent || [])].slice(0, 10) };
        }
        const stats = { ...d.stats, netChips: d.stats.netChips + o.net };
        const achievements = checkAchievements(stats, d);
        let next = { ...d, chips: nextChips, stats, achievements, ranked };
        next = progress(next, { rankedWin: o.won }, o.won ? 60 : 25);
        next = withTitles(trackHistory(d, next, null));
        saveData(next);
        return next;
      });
      setTimeout(flushNotes, 3000);
      if (opts.again && nextChips >= buyIn) { setTableKey((k) => k + 1); return; }
      setInTable(false); setSession(null);
      if (placedNow != null) showToast({ title: "You're ranked", label: rankName(placedNow) }, 2800);
      return;
    }
    if (mode === "cash") {
      setData((d) => {
        const netChips = d.stats.netChips + (finalStack - d.chips);
        const stats = { ...d.stats, netChips };
        const achievements = checkAchievements(stats, d);
        const next = trackHistory(d, { ...d, chips: Math.max(0, finalStack), stats, achievements }, null);
        saveData(next);
        return next;
      });
    }
    if (mode === "tournament" && tournamentResult) {
      const buyIn = session?.buyIn || 0;
      const r = { at: Date.now(), field: tournamentResult.total, place: tournamentResult.placement, buyIn, ...(session?.major ? { major: true } : {}) };
      const prize = tourneyPrize(r.field, r.place, buyIn);
      const pts = Math.round(tourneyPoints(r));
      setData((d) => {
        const sk = d.skill || defaultSkill();
        let next = { ...d, chips: Math.max(0, d.chips - buyIn + prize), stats: { ...d.stats, netChips: d.stats.netChips + prize - buyIn }, skill: { ...sk, tourneys: [...(sk.tourneys || []), r].slice(-40) } };
        next = progress(next, { tourneyCash: prize > 0 }, 20 + (prize > 0 ? 60 : 0) + (tournamentResult.won ? 40 : 0));
        next = withTitles(trackHistory(d, next, null));
        saveData(next);
        return next;
      });
      setTimeout(flushNotes, 3200);
      showToast({ title: r.major ? (tournamentResult.won ? "You won the Sunday Major" : `Sunday Major: ${ordinal(r.place)} of ${r.field}`) : tournamentResult.won ? "Tournament won" : `Finished ${ordinal(r.place)} of ${r.field}`, label: `${prize > 0 ? `Cashed ${prize.toLocaleString()} chips. ` : ""}${pts > 0 ? `+${pts} index points` : "No index points outside the money"}` }, 3000);
    }
    setInTable(false); setSession(null);
  };
  const handlePlayAI = (config) => { sound.tap(); setSession({ ...config, startChips: data.chips }); setTableKey((k) => k + 1); setInTable(true); };
  const handleDismissWinTip = () => { persist({ ...data, settings: { ...data.settings, winTipSeen: true } }); };
  const handleUpdateSettings = (patch) => { sound.tap(); persist({ ...data, settings: { ...data.settings, ...patch } }); };
  const handleExportData = () => {
    try {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `felt-profile-${data.name.replace(/\s+/g, "_")}.json`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) { /* download not supported in this environment */ }
  };
  const handleResetProfile = () => { sound.tap(); persist(defaultData()); };
  // brings a profile over from another copy of felt (like the old chat version)
  const handleImportData = (file) => {
    if (!file) return;
    const readText = (cb) => { if (typeof file === "string") { cb(file); return; } const reader = new FileReader(); reader.onload = () => cb(String(reader.result)); reader.readAsText(file); };
    readText((text) => {
      try {
        const raw = text.trim();
        const d = JSON.parse(raw.startsWith("{") ? raw : decodeURIComponent(escape(atob(raw.replace(/^felt:/, "").replace(/\s+/g, "")))));
        if (!d || typeof d !== "object" || typeof d.chips !== "number") throw new Error("not a felt profile");
        const merged = { ...defaultData(), ...d, stats: { ...defaultData().stats, ...(d.stats || {}) }, settings: { ...defaultData().settings, ...(d.settings || {}) } };
        merged.ranked = rolloverSeason(migrateRanked(d.ranked));
        merged.cosmetics = { ...defaultCosmetics(), ...(d.cosmetics || {}) };
        merged.challenges = ensureChallenges(d.challenges);
        merged.pass = ensurePass(d.pass);
        merged.history = { bankroll: [], best: [], ...(d.history || {}) };
        merged.titles = { ...defaultTitles(), ...(d.titles || {}) };
        refundThemes(merged, d);
        merged.skill = d.skill && d.skill.v === 2 ? { ...defaultSkill(), ...d.skill } : defaultSkill();
        sound.coin(); persist(merged);
        showToast({ title: "Profile imported", label: `${merged.name}, ${merged.chips.toLocaleString()} chips` });
      } catch (e) { showToast({ title: "Couldn't import", label: "That isn't a felt profile code." }); }
    });
  };

  if (onlineTable && account) {
    return (
      <div className="app-table">
        <style>{GLOBAL_STYLE}</style>
        <OnlineTable key={onlineTable} tableId={onlineTable} account={account} data={data} sound={sound} soundOn={soundOn} setSoundOn={setSoundOn} onExit={() => { setOnlineTable(null); claimPayouts(); }} onDebit={handleDebit} onClaim={claimPayouts} />
        {toast && <div className="toast" role="status"><div style={{ fontSize: 12, fontWeight: 700, color: "var(--t-accent)" }}>{toast.title}</div><div style={{ fontSize: 12.5, color: "var(--t-text2)" }}>{toast.label}</div></div>}
      </div>
    );
  }
  if (inTable) {
    const isPractice = session?.mode === "practice";
    const isTournament = session?.mode === "tournament";
    const isRanked = session?.mode === "ranked";
    const frameColor = data.ranked.frame ? RANK_TIERS.find((t) => t.key === data.ranked.frame)?.color : null;
    const placed = isPlaced(data.ranked);
    const isVip = !!session?.vip;
    const isMajor = isTournament && !!session?.major;
    const botSkill = isRanked ? (placed ? tierForRating(matchRating(data.ranked)).botSkill : tierOf(data.ranked).botSkill) : isPractice ? 0.2 : isVip || isMajor ? 0.72 : 0.4;
    const opponentRating = isRanked ? (placed ? matchRating(data.ranked) : 650) : null;
    return (
      <div className="app-table">
        <style>{GLOBAL_STYLE}</style>
        <PokerTable
          key={tableKey}
          startStack={isPractice ? 2000 : isTournament ? TOURNEY_STACK : isRanked ? (session?.buyIn ?? RANKED_BUYIN) : (session?.startChips ?? data.chips)}
          name={data.name} avatar={data.avatar} photo={data.usePhoto ? data.photo : null} soundOn={soundOn} setSoundOn={setSoundOn}
          onExit={handleExitTable} onHandResolved={handleHandResolved}
          stakes={session?.stakes} tableSize={session?.tableSize} tournament={isTournament} ranked={isRanked}
          rankedState={data.ranked} skill={data.skill} tourneyBuyIn={session?.buyIn || 0} bankroll={data.chips} botSkill={botSkill} opponentRating={opponentRating} frameColor={frameColor} tutorial={isPractice}
          variant={session?.variant || "holdem"} turbo={!!session?.turbo} runTwice={!!data.settings.runTwice} squeeze={data.settings.squeeze !== false} cardBack={isVip ? VIP_BACK : findBack((data.cosmetics || {}).cardBack)} felt={isVip ? VIP_FELT : findFelt((data.cosmetics || {}).felt)} title={(data.titles || defaultTitles()).equipped} vip={isVip} prestige={data.ranked.prestige || 0} chipSet={(data.cosmetics || {}).chipset || "classic"} winFx={(data.cosmetics || {}).fx || "confetti"}
          colorblind={data.settings.colorblind} cardSize={data.settings.cardSize} animSpeed={data.settings.animSpeed}
          showWinTip={!data.settings.winTipSeen} onDismissWinTip={handleDismissWinTip} eventName={isMajor ? "Major" : null}
        />
      </div>
    );
  }

  return (
    <div className="app">
      <style>{GLOBAL_STYLE}</style>
      {!bootDone && <LoadingScreen fadingOut={loaded} />}
      <main className="app-main">
        <div key={tab} className="app-col">
          {tab === "shop" && <ShopScreen data={data} onClaimChips={handleClaimChips} onBuyAvatar={handleBuyAvatar} onClaimDaily={handleClaimDaily} onBuyCosmetic={handleBuyCosmetic} onEquipCosmetic={handleEquipCosmetic} onBuyTitle={handleBuyTitle} />}
          {tab === "home" && <HomeMenu topCards={<>
            {!isStandalone() && !hideInstall && (installPrompt || isIOS()) && <div style={{ marginBottom: 14 }}><InstallCard prompt={installPrompt ? async () => { installPrompt.prompt(); try { await installPrompt.userChoice; } catch (e) { /* closed */ } setInstallPrompt(null); } : null} onDismiss={() => dismiss("felt-hide-install", setHideInstall)} /></div>}
            {account && pushSupported() && !pushOn && !hideNotify && (isStandalone() || !isIOS()) && typeof Notification !== "undefined" && Notification.permission !== "denied" && <div style={{ marginBottom: 14 }}><NotifyCard busy={pushBusy} onEnable={turnOnPush} onDismiss={() => dismiss("felt-hide-notify", setHideNotify)} /></div>}
          </>} legendNo={legendNo} onEquipPass={handleEquipPass} onPlayAI={handlePlayAI} onFriendsTable={() => { sound.tap(); setFtOpen(true); }} data={data} chips={data.chips} ranked={data.ranked} onClaimDaily={handleClaimDaily} onClaimChallenge={handleClaimChallenge} onSpin={handleSpin} onPrestige={handlePrestige} sound={sound} goShop={() => setTab("shop")} />}
          {tab === "leaderboard" && <LeaderboardScreen data={data} account={account} online={online} onOpenAuth={setAuthOpen} />}
          {tab === "coach" && <CoachScreen data={data} />}
          {tab === "clubs" && <ClubsScreen data={data} account={account} online={online} onOpenAuth={setAuthOpen} onDebit={handleDebit} onOpenTable={openTable} onStartTable={(c) => { sound.tap(); setFtClub(c); setFtOpen(true); }} onClub={setClubBadge} onFounder={() => { if (!dataRef.current.clubFounder) { persist(withTitles({ ...dataRef.current, clubFounder: true })); setTimeout(flushNotes, 2600); } }} toast={(t) => showToast(t, 2800)} pendingCode={pendingClub} onPendingDone={() => setPendingClub(null)} />}
          {tab === "profile" && <ProfileScreen data={data} account={account} online={online} legendNo={legendNo} pushOn={pushOn} pushBusy={pushBusy} onEnablePush={turnOnPush} isAdmin={isAdmin} onOpenAdmin={() => setAdminOpen(true)} onOpenAuth={setAuthOpen} onSignOut={handleSignOut} sound={sound} onUpdateName={handleUpdateName} onSelectAvatar={handleSelectAvatar} onSetPhoto={handleSetPhoto} onUsePhoto={handleUsePhoto} onSelectFrame={handleSelectFrame} onAddFriend={handleAddFriend} onUpdateSettings={handleUpdateSettings} onExportData={handleExportData} onImportData={handleImportData} onResetProfile={handleResetProfile} onEquipTitle={handleEquipTitle} onPrestige={handlePrestige} />}
        </div>
      </main>
      <BottomNav tab={tab} chips={data.chips} setTab={(t) => { sound.tap(); setTab(t); }} />
      {invites.length > 0 && !inTable && (
        <div className="invite-banner" role="status">
          <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 700 }}>{inviteNames[invites[0].from_user] || "A friend"} invited you</div><div style={{ fontSize: 11.5, color: "var(--t-sub)" }}>Table {invites[0].code}</div></div>
          <button className="btn btn-sm" onClick={() => { cloud.clearInvite(invites[0].id).catch(() => {}); setInvites((l) => l.slice(1)); }}>Later</button>
          <button className="btn btn-sm btn-raise" onClick={() => acceptInvite(invites[0])}>Join</button>
        </div>
      )}
      {adminOpen && isAdmin && <AdminModal onClose={() => setAdminOpen(false)} />}
      {loaded && bootDone && data.ranked.seasonEnd && !data.ranked.seasonEnd.seen && (() => {
        const se = data.ranked.seasonEnd;
        const close = () => persist({ ...data, ranked: { ...data.ranked, seasonEnd: { ...se, seen: true } } });
        return <SeasonEndScreen se={se} onClose={close} />;
      })()}
      {ftOpen && <FriendsTableModal account={account} data={data} club={ftClub} onClose={() => { setFtOpen(false); setFtClub(null); }} onOpenTable={(id) => { setFtClub(null); openTable(id); }} onOpenAuth={setAuthOpen} onDebit={handleDebit} />}
      {authOpen && <AuthModal mode={authOpen} setMode={setAuthOpen} onClose={closeAuth} onAuthed={handleAuthed} account={account} data={data} welcome={welcome} />}
      {toast && (
        <div className="toast" role="status">
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--t-accent)" }}>{toast.title}</div>
          <div style={{ fontSize: 12.5, color: "var(--t-text2)" }}>{toast.label}</div>
        </div>
      )}
    </div>
  );
}

// A tab bar on phones. On a computer the same buttons stack into a sidebar with the logo and your chips.
function BottomNav({ tab, setTab, chips }) {
  const items = [{ key: "shop", label: "Shop" }, { key: "leaderboard", label: "Ranks" }, { key: "home", label: "Play" }, { key: "clubs", label: "Clubs" }, { key: "coach", label: "Coach" }, { key: "profile", label: "Me" }];
  return (
    <nav className="bottom-nav" aria-label="Main">
      <FeltLogo className="side-logo" />
      {items.map((it) => <button key={it.key} data-k={it.key} className="navbtn" aria-current={tab === it.key ? "page" : undefined} onClick={() => setTab(it.key)}>{it.label}</button>)}
      {chips != null && <div className="side-foot"><b className="num">{chips.toLocaleString()}</b><span>Chips</span></div>}
    </nav>
  );
}
