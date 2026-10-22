import { useState, useEffect, useCallback } from "react";
import { cloud, cleanUsername, cloudEnabled } from "../cloud.js";
import { publicProfile } from "../app/boot.jsx";
import { AVATAR_COLORS } from "../game/helpers.js";
import { hashStr } from "../game/progression.js";
import { UNRANKED, rankName, tierForRating } from "../game/ranked.js";
import { CrownMark, PrestigeBadge, pnameCls } from "../game/rewards.jsx";
import { FeltLogo, FullScreen, Icon, Modal, SectionLabel, TierBadge, TitlePill, shortNum } from "../ui/primitives.jsx";

/* =========================================================================
   ACCOUNTS AND FRIENDS
   ========================================================================= */
// An avatar sitting inside a poker chip the color of the player's rank
function ChipAvatar({ p, letter, size = 40, tier, live = false }) {
  const rim = Math.max(4, Math.round(size * 0.13));
  const S = size + rim * 2, rw = (rim / S) * 100, r = 50 - rw / 2, c = 2 * Math.PI * r, seg = c / 8;
  return (
    <span className="chip-av" style={{ width: S, height: S, padding: rim }}>
      <svg className="chip-av-ring" viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r={r} fill="none" stroke={tier ? tier.color : "#3A3D44"} strokeWidth={rw} />
        <circle cx="50" cy="50" r={r} fill="none" stroke="#F2F2EE" strokeWidth={rw} strokeDasharray={`${seg * 0.42} ${seg * 0.58}`} strokeDashoffset={seg * 0.21} transform="rotate(-90 50 50)" />
      </svg>
      {p ? <PlayerAvatar p={p} size={size} live={live} /> : <span className="pod-letter" style={{ width: size, height: size, fontSize: Math.round(size * 0.42), background: AVATAR_COLORS[hashStr(letter || "?") % AVATAR_COLORS.length] }}>{(letter || "?")[0]}</span>}
    </span>
  );
}
function PlayerAvatar({ p, size = 40, live = false, tier = null }) {
  const style = { width: size, height: size, borderRadius: "50%", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--t-panel2)", fontSize: size * 0.48 };
  return (
    <div style={{ position: "relative", flexShrink: 0, width: size, height: size }}>
      <div style={style}>{p && p.photo ? <img src={p.photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} /> : (p && p.avatar) || "🙂"}</div>
      {live && <span className="live-dot" style={{ width: Math.max(9, size * 0.26), height: Math.max(9, size * 0.26) }} aria-label="Online" />}
      {tier && <span className="av-tier"><TierBadge tier={tier} size={Math.max(15, Math.round(size * 0.44))} /></span>}
    </div>
  );
}
const presenceLine = (p, online) => (online && online[p.id] ? online[p.id] : p.updated_at ? `Seen ${timeAgo(new Date(p.updated_at).getTime())}` : "Offline");
function AuthModal({ mode, setMode, onClose, onAuthed, account, data, welcome = false }) {
  const [username, setUsername] = useState(""); const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  const signup = mode === "signup", pick = mode === "username";
  const submit = async (e) => {
    e.preventDefault(); setErr(""); setBusy(true);
    try {
      let me;
      if (pick) me = await cloud.claimUsername(account, username, publicProfile(data));
      else if (signup) { const prof = publicProfile(data); if (!data.name || data.name === "You") prof.display_name = cleanUsername(username); me = await cloud.signUp({ username, email, password, profile: prof }); }
      else me = await cloud.signIn({ email, password });
      onAuthed(me, pick ? "signup" : mode);
    } catch (e2) { setErr(e2.message || "Something went wrong."); }
    setBusy(false);
  };
  const switchTo = (m) => { setErr(""); setMode(m); };
  const can = pick ? username.length >= 3 : !!email && password.length >= (signup ? 6 : 1) && (!signup || username.length >= 3);
  return (
    <FullScreen label={pick ? "Pick a username" : signup ? "Create your account" : "Sign in"} onClose={onClose} className="auth-page">
      <div className="auth-chips" aria-hidden="true"><span style={{ "--cc": "#F51E1D" }} /><span style={{ "--cc": "#196EFE" }} /><span style={{ "--cc": "#00A560" }} /></div>
      <div className="auth-hero">
        <FeltLogo className="auth-logo" />
        <p className="auth-blurb">{pick ? "Pick the name your friends will find you by." : "Keep your chips safe, climb the ranks and play your friends."}</p>
      </div>
      {!pick && (
        <div className="seg auth-seg" role="tablist">
          <button role="tab" aria-selected={!signup} className={`segbtn${!signup ? " on" : ""}`} onClick={() => switchTo("signin")}>Sign in</button>
          <button role="tab" aria-selected={signup} className={`segbtn${signup ? " on" : ""}`} onClick={() => switchTo("signup")}>New account</button>
        </div>
      )}
      <form onSubmit={submit} className="auth-form">
        {(pick || signup) && (
          <label className="auth-field"><span>Username</span>
            <div className="auth-at"><b>@</b><input className="input" value={username} onChange={(e) => setUsername(cleanUsername(e.target.value).replace(/[^a-z0-9_]/g, ""))} maxLength={16} autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="yourname" aria-label="Username" /></div>
            <small>Friends add you with this. Letters, numbers and _ only.</small>
          </label>
        )}
        {!pick && (<>
          <label className="auth-field"><span>Email</span><input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoCapitalize="none" autoComplete="email" placeholder="you@email.com" aria-label="Email" /></label>
          <label className="auth-field"><span>Password</span><input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={signup ? "new-password" : "current-password"} placeholder={signup ? "6 or more characters" : ""} aria-label="Password" /></label>
        </>)}
        {err && <div className="auth-err" role="alert">{err}</div>}
        <button type="submit" className="btn btn-raise big-cta" disabled={busy || !can}>{busy ? "One sec" : pick ? "Save username" : signup ? "Create account" : "Sign in"}</button>
      </form>
      <div className="fs-bottom">
        <button type="button" className="auth-guest" onClick={onClose}>{pick ? "Not now" : account ? "Close" : welcome ? "Play as a guest" : "Keep playing as a guest"}</button>
        {!pick && !account && <div className="fs-foot">{welcome ? "You can make an account later from your profile. Your chips come with you." : "Your guest chips move into your account when you sign up."}</div>}
      </div>
    </FullScreen>
  );
}
function FriendProfileModal({ friendId, online = {}, onClose, onRemove, account = null, onAdded }) {
  const [p, setP] = useState(null); const [confirm, setConfirm] = useState(false); const [addMsg, setAddMsg] = useState(null);
  const [rel, setRel] = useState(null); // friend | incoming | outgoing | none
  useEffect(() => { let on = true; cloud.getProfile(friendId).then((x) => on && setP(x || false)).catch(() => on && setP(false)); return () => { on = false; }; }, [friendId]);
  useEffect(() => {
    if (!account || onRemove) return; let on = true;
    cloud.friends(account).then((r) => { if (!on) return; const has = (l) => l.some((x) => x.id === friendId); setRel(has(r.friends) ? "friend" : has(r.incoming) ? "incoming" : has(r.outgoing) ? "outgoing" : "none"); }).catch(() => on && setRel("none"));
    return () => { on = false; };
  }, [account, friendId, onRemove]);
  if (p === null) return <Modal title="Player" onClose={onClose}><div className="empty">Loading…</div></Modal>;
  if (!p) return <Modal title="Player" onClose={onClose}><div className="empty">Couldn't load this player.</div></Modal>;
  const st = p.stats || {}; const tier = p.placed ? tierForRating(p.rating) : UNRANKED;
  const winRate = st.handsPlayed ? Math.round((st.handsWon / st.handsPlayed) * 100) : 0;
  const live = online[p.id];
  const ring = p.placed ? tier.color : "#3A3D44";
  return (
    <Modal title="" onClose={onClose} width={400} stripe={p.placed ? tier.color : "#A3A6AD"} className="fp-sheet">
      <button className="iconbtn fp-close" onClick={onClose} aria-label="Close"><Icon name="close" size={15} stroke={2.4} /></button>
      <div className="fp-hero">
        <div className="fp-av" style={{ "--rc": ring }}>{(p.prestige || 0) >= 5 && <CrownMark size={22} top={-20} />}<PlayerAvatar p={p} size={92} live={!!live} /></div>
        <div className="fp-big"><span className={pnameCls(p.prestige)}>{p.display_name}</span><PrestigeBadge n={p.prestige} size={24} /></div>
        <div className="fp-at">@{p.username}</div>
        {p.title && p.title !== "rookie" && <TitlePill k={p.title} style={{ marginTop: 8 }} />}
      </div>
      <div className={`fp-pill${live ? " on" : ""}`}><i />{presenceLine(p, online)}</div>
      <div className="fp-grid">
        <div><span className="lbl">Ranked</span><b style={{ color: p.placed ? tier.color : "var(--t-mid)" }}>{p.placed ? rankName(p.rating) : "Unranked"}</b><i className="num">{p.placed ? `${p.rating.toLocaleString()} RP · ${st.rankedWins || 0}W ${st.rankedLosses || 0}L` : "Still in placements"}</i></div>
        <div><span className="lbl">Hands</span><b className="num">{(st.handsPlayed || 0).toLocaleString()}</b><i className="num">{winRate}% won</i></div>
        <div><span className="lbl">Biggest pot</span><b className="num">{(st.biggestPot || 0).toLocaleString()}</b><i className="num">Best streak {st.bestWinStreak || 0}</i></div>
        <div><span className="lbl">Chips</span><b className="num">{shortNum(p.chips || 0)}</b><i className="num">{st.achievements || 0} achievements</i></div>
      </div>
      {account && !onRemove && account.id !== p.id && rel && (
        <button className={`btn big-cta${rel === "friend" || rel === "outgoing" ? "" : " btn-raise"}`} disabled={!!addMsg || rel === "friend" || rel === "outgoing"} onClick={async () => { try { const r = await cloud.addFriend(account, p.username); setAddMsg(r.status === "sent" ? "Request sent" : r.status === "accepted" ? "You're friends now" : r.status === "already" ? "Already friends" : "Request pending"); if (onAdded) onAdded(); } catch (e) { setAddMsg(e.message); } }}>{addMsg || (rel === "friend" ? "Friends" : rel === "outgoing" ? "Request sent" : rel === "incoming" ? "Accept friend request" : "Add friend")}</button>
      )}
      {onRemove && <button className="fp-remove" onClick={() => { if (confirm) { onRemove(p.id); onClose(); } else setConfirm(true); }}>{confirm ? "Tap again to remove" : "Remove friend"}</button>}
    </Modal>
  );
}
function timeAgo(t) {
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 2) return "just now"; if (m < 60) return `${m}m ago`; const h = Math.round(m / 60); if (h < 24) return `${h}h ago`; const d = Math.round(h / 24); return d < 30 ? `${d}d ago` : "a while ago";
}
function FriendsSection({ account, online = {}, onOpenAuth, sound, bare = false }) {
  const [lists, setLists] = useState(null); const [input, setInput] = useState(""); const [msg, setMsg] = useState(null); const [busy, setBusy] = useState(false); const [open, setOpen] = useState(null);
  const refresh = useCallback(() => { if (!account) return; cloud.friends(account).then(setLists).catch(() => setLists((l) => l || { friends: [], incoming: [], outgoing: [], offline: true })); }, [account]);
  useEffect(() => { refresh(); if (!account) return; const t = setInterval(refresh, 20000); return () => clearInterval(t); }, [refresh, account]);
  if (!cloudEnabled()) return null;
  if (!account) {
    return (<>
      {!bare && <SectionLabel>Friends</SectionLabel>}
      <section className="rk-card" style={{ "--sc": "#00A560" }}>
        <div className="stripe" />
        <div className="rk-body">
          <div className="disp" style={{ fontSize: 26 }}>Play with your friends</div>
          <div style={{ fontSize: 13, color: "var(--t-mid)", marginTop: 6, lineHeight: 1.45 }}>Make an account to add friends, see their rank and stats, and keep your chips safe on any phone.</div>
          <div className="act-row two" style={{ marginTop: 14 }}>
            <button className="btn" onClick={() => onOpenAuth("signin")}>Sign in</button>
            <button className="btn btn-raise" onClick={() => onOpenAuth("signup")}>Create account</button>
          </div>
        </div>
      </section>
    </>);
  }
  const add = async (e) => {
    e.preventDefault(); if (!input.trim() || busy) return; setBusy(true); setMsg(null);
    try {
      const r = await cloud.addFriend(account, input);
      const at = `@${r.profile.username}`;
      setMsg({ ok: true, text: r.status === "sent" ? `Request sent to ${at}.` : r.status === "accepted" ? `You and ${at} are friends now.` : r.status === "already" ? `${at} is already your friend.` : `Still waiting on ${at}.` });
      setInput(""); if (sound) sound.tap(); refresh();
    } catch (e2) { setMsg({ ok: false, text: e2.message }); }
    setBusy(false);
  };
  const act = async (fn) => { try { await fn(); if (sound) sound.tap(); } catch (e) { setMsg({ ok: false, text: e.message }); } refresh(); };
  const L = lists || { friends: [], incoming: [], outgoing: [] };
  const on = L.friends.filter((p) => online[p.id]).sort((a, b) => (b.placed ? b.rating : -1) - (a.placed ? a.rating : -1));
  const off = L.friends.filter((p) => !online[p.id]).sort((a, b) => (b.placed ? b.rating : -1) - (a.placed ? a.rating : -1));
  const shortRank = (p) => (p.placed ? rankName(p.rating).replace("Platinum", "Plat").replace("Diamond", "Dia") : "Unranked");
  const row = (p, live) => (
    <button key={p.id} className="fr-row" onClick={() => setOpen(p.id)}>
      <ChipAvatar p={p} size={36} live={live} tier={p.placed ? tierForRating(p.rating) : null} />
      <span style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
        <span className="fr-name"><span className={pnameCls(p.prestige)}>{p.display_name}</span><PrestigeBadge n={p.prestige} size={15} /></span>
        <span className="fr-sub" style={{ color: live ? "var(--t-good)" : "var(--t-mid)" }}>{presenceLine(p, online)}</span>
      </span>
      <span className="fr-rank" style={{ color: p.placed ? tierForRating(p.rating).color : "var(--t-mid)" }}>{shortRank(p)}{p.placed && <i className="num">{p.rating.toLocaleString()} RP</i>}</span>
    </button>
  );
  return (<>
    {!bare && <SectionLabel right={`@${account.username || "you"}`}>Friends</SectionLabel>}
    <form onSubmit={add} style={{ display: "flex", gap: 8, marginBottom: 10 }}>
      <label className="fr-add">
        <Icon name="search" size={16} stroke={2.2} />
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Add by username" autoCapitalize="none" autoCorrect="off" spellCheck={false} aria-label="Friend's username" />
      </label>
      <button type="submit" className="btn btn-go" style={{ flex: "none", minHeight: 50, padding: "0 18px" }} disabled={busy || !input.trim()}>{busy ? "…" : "Add"}</button>
    </form>
    {msg && <div className={`friend-msg${msg.ok ? " ok" : ""}`}>{msg.text}</div>}
    {L.incoming.map((p) => (
      <section key={p.id} className="fr-req">
        <div className="stripe thin" />
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px 12px" }}>
          <ChipAvatar p={p} size={36} tier={p.placed ? tierForRating(p.rating) : null} />
          <span style={{ flex: 1, minWidth: 0 }}><span className="fr-name">{p.display_name}</span><span className="fr-sub">Wants to be friends</span></span>
          <button className="iconbtn" style={{ background: "var(--t-panel2)" }} aria-label={`Decline ${p.display_name}`} onClick={() => act(() => cloud.remove(account, p.id))}><Icon name="close" size={14} stroke={2.6} /></button>
          <button className="btn btn-sm btn-raise" style={{ minHeight: 44 }} onClick={() => act(() => cloud.accept(account, p.id))}>Accept</button>
        </div>
      </section>
    ))}
    {lists === null && <div className="empty">Loading friends…</div>}
    {lists && L.friends.length === 0 && <div className="empty" style={{ padding: "6px 4px 12px" }}>No friends yet. Tell yours your username: @{account.username}</div>}
    {on.length > 0 && (<><div className="lbl fr-h">Online · {on.length}</div><section className="fr-list">{on.map((p) => row(p, true))}</section></>)}
    {off.length > 0 && (<><div className="lbl fr-h">Offline · {off.length}</div><section className="fr-list">{off.map((p) => row(p, false))}</section></>)}
    {L.outgoing.length > 0 && (<>
      <div className="lbl fr-h">Waiting on them</div>
      <section className="fr-list">
        {L.outgoing.map((p) => (
          <div key={p.id} className="fr-row">
            <PlayerAvatar p={p} size={40} />
            <span style={{ flex: 1, minWidth: 0 }}><span className="fr-name">{p.display_name}</span><span className="fr-sub">@{p.username}</span></span>
            <button className="btn btn-sm" onClick={() => act(() => cloud.remove(account, p.id))}>Cancel</button>
          </div>
        ))}
      </section>
    </>)}
    {open && <FriendProfileModal friendId={open} online={online} onClose={() => setOpen(null)} onRemove={(id) => act(() => cloud.remove(account, id))} />}
  </>);
}

export { AuthModal, ChipAvatar, FriendProfileModal, FriendsSection, PlayerAvatar, timeAgo };
