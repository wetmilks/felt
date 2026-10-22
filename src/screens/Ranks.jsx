import { useState, useEffect, useRef } from "react";
import { cloudEnabled, cloud } from "../cloud.js";
import { myTimeZone, publicProfile, tzLabel } from "../app/boot.jsx";
import { MOCK_PLAYERS } from "../game/helpers.js";
import { PLACEMENT_MATCHES, UNRANKED, isPlaced, rankName, tierForRating } from "../game/ranked.js";
import { PrestigeBadge, pnameCls } from "../game/rewards.jsx";
import { daysLeftInSeason } from "../game/season.js";
import { tournamentIndex } from "../game/skill.js";
import { ChipAvatar, FriendProfileModal, FriendsSection } from "../social/Friends.jsx";
import { Icon, TierBadge } from "../ui/primitives.jsx";

/* =========================================================================
   LEADERBOARD TAB
   ========================================================================= */
function LeaderboardScreen({ data, account, online = {}, onOpenAuth }) {
  const [tab, setTab] = useState("ranked");
  const [fl, setFl] = useState(null); const [openF, setOpenF] = useState(null);
  // real players from everyone's accounts; the sample list only shows if that can't load
  const [real, setReal] = useState({});
  const [scope, setScope] = useState(() => { try { return localStorage.getItem("felt-lb-scope") || "world"; } catch (e) { return "world"; } });
  const tz = myTimeZone();
  const realKey = `${tab}-${scope}`;
  useEffect(() => {
    if (!cloudEnabled() || tab === "friends") return;
    let on = true;
    cloud.top(tab === "ranked" ? "ranked" : "index", scope === "local" ? tz : null).then((list) => on && setReal((r) => ({ ...r, [realKey]: list }))).catch(() => on && setReal((r) => ({ ...r, [realKey]: false })));
    return () => { on = false; };
  }, [tab, scope]); // eslint-disable-line react-hooks/exhaustive-deps
  const pickScope = (v) => { setScope(v); try { localStorage.setItem("felt-lb-scope", v); } catch (e) { /* private mode */ } };
  useEffect(() => { if (!account) return; cloud.friends(account).then((r) => setFl(r.friends)).catch(() => setFl([])); }, [account]);
  const placed = isPlaced(data.ranked);
  const month = new Date().toLocaleString("en-US", { month: "long" });
  const myIndex = tournamentIndex((data.skill || {}).tourneys);
  const friendIds = new Set((fl || []).map((f) => f.id));
  const realList = real[realKey];
  const live = Array.isArray(realList);
  const others = live ? realList.filter((p) => !account || p.id !== account.id).map((p) => ({ id: p.id, name: p.display_name, profile: p, isYou: false, prestige: p.prestige || 0, rating: p.placed ? p.rating : null, index: (p.stats || {}).tIndex || 0 })).filter((p) => (tab === "ranked" ? p.rating != null : true)) : MOCK_PLAYERS.map((m) => ({ name: m.name, isYou: false, rating: Math.round(Math.min(1680, m.wins * 9 + m.chips / 80)), index: Math.round(m.wins * 7 + m.chips / 150) }));
  const you = { name: data.name, isYou: true, profile: { ...publicProfile(data), id: account ? account.id : "me" }, prestige: data.ranked.prestige || 0, rating: placed ? Math.round(data.ranked.rating) : null, index: myIndex };
  const isRanked = tab === "ranked";
  const key = isRanked ? "rating" : "index";
  const pool = [...others, ...(you[key] != null ? [you] : [])].sort((a, b) => b[key] - a[key]);
  const myPos = pool.findIndex((p) => p.isYou);
  const visible = pool.slice(0, 50);
  const usePodium = visible.length >= 3;
  const rest = usePodium ? visible.slice(3) : visible;
  // only dock your row at the bottom when your spot in the list is scrolled out of view
  const scrollRef = useRef(null); const meRef = useRef(null);
  const [meVisible, setMeVisible] = useState(true);
  useEffect(() => {
    const el = meRef.current;
    if (!el) { setMeVisible(false); return; }
    if (!("IntersectionObserver" in window)) { setMeVisible(true); return; }
    const io = new IntersectionObserver(([e]) => setMeVisible(e.isIntersecting), { threshold: 0.6 });
    io.observe(el);
    return () => io.disconnect();
  }, [tab, myPos, live]);
  const tierLine = (p, i) => (isRanked ? (live && scope === "world" && p.rating >= 1500 ? `Legend #${i + 1}` : rankName(p.rating)) : `${p.index.toLocaleString()} pts`);
  const avatar = (p, size) => <ChipAvatar p={live || p.isYou ? p.profile : null} letter={p.name} size={size} tier={isRanked ? tierForRating(p.rating) : null} live={!p.isYou && !!online[p.id]} />;
  const row = (p, i, pinned = false) => {
    const tier = isRanked ? tierForRating(p.rating) : null;
    const tap = !!p.profile && !p.isYou;
    return (
      <button key={(pinned ? "pin-" : "") + (p.id || p.name) + (p.isYou ? "-you" : "")} ref={p.isYou && !pinned ? meRef : null} className={`lb-item${p.isYou ? " you" : ""}${tap ? " tap" : ""}`} disabled={!tap} onClick={tap ? () => setOpenF(p.id) : undefined}>
        <span className="lb-pl num">{pinned ? `#${i + 1}` : i + 1}</span>
        {avatar(p, 38)}
        <span style={{ flex: 1, minWidth: 0 }}>
          <span className="lb-nm"><span className={pnameCls(p.prestige)} style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{p.isYou ? (pinned ? "You" : p.name) : p.name}</span>{p.prestige ? <PrestigeBadge n={p.prestige} size={15} /> : null}{p.isYou && !pinned && <span className="lb-tag">You</span>}{!p.isYou && friendIds.has(p.id) && <span className="lb-tag friend">Friend</span>}</span>
          <span className="lb-tier" style={{ color: tier ? tier.color : "var(--t-mid)" }}>{isRanked ? tierLine(p, i) : "Tournament index"}</span>
        </span>
        <span className="lb-val num">{isRanked ? p.rating.toLocaleString() : p.index.toLocaleString()}</span>
      </button>
    );
  };
  // the top three stand on a podium
  const podium = (
    <section className="podium" aria-label="Top three">
      {[1, 0, 2].map((k) => {
        const p = visible[k];
        if (!p) return <div key={k} />;
        const tier = isRanked ? tierForRating(p.rating) : null;
        const ring = tier ? tier.color : ["#EDB000", "#C9D4E2", "#E6812D"][k];
        const big = k === 0;
        return (
          <button key={k} ref={p.isYou ? meRef : null} className={`pod${big ? " first" : ""}`} disabled={!p.profile || p.isYou} onClick={() => setOpenF(p.id)}>
            {big && <Icon name="crown" size={22} stroke={1.8} style={{ color: "#EDB000" }} />}
            <span className="pod-av">{avatar(p, big ? 62 : 50)}</span>
            <span className="pod-name"><span className={pnameCls(p.prestige)}>{p.isYou ? "You" : p.name}</span></span>
            <span className="pod-val num">{isRanked ? p.rating.toLocaleString() : p.index.toLocaleString()}</span>
            <span className="pod-block" style={{ height: big ? 92 : k === 1 ? 64 : 48, "--sc": big ? "#EDB000" : ring }}><b>{k + 1}</b></span>
          </button>
        );
      })}
    </section>
  );
  const head = (
    <header className="home-head lb-head">
      <div className="wordmark">Ranks</div>
      {tab !== "friends" && cloudEnabled() && (
        <div className="mini-seg" role="radiogroup" aria-label="Leaderboard scope">
          <button role="radio" aria-checked={scope === "world"} className={scope === "world" ? "on" : ""} onClick={() => pickScope("world")}>World</button>
          <button role="radio" aria-checked={scope === "local"} className={scope === "local" ? "on" : ""} onClick={() => pickScope("local")}>Local</button>
        </div>
      )}
    </header>
  );
  const seg = (
    <div className="seg lb-seg">
      <button onClick={() => setTab("ranked")} className={`segbtn${tab === "ranked" ? " on" : ""}`}>Ranked</button>
      <button onClick={() => setTab("index")} className={`segbtn${tab === "index" ? " on" : ""}`}>Tourney</button>
      {cloudEnabled() && <button onClick={() => setTab("friends")} className={`segbtn${tab === "friends" ? " on" : ""}`}>Friends</button>}
    </div>
  );
  if (tab === "friends") {
    return (
      <div className="screen screen-fade scr-narrow">
        {head}
        {seg}
        <FriendsSection account={account} online={online} onOpenAuth={onOpenAuth} bare />
      </div>
    );
  }
  const note = live ? (pool.length <= 1 ? (scope === "local" ? `No one else in ${tzLabel(tz)} time yet. Get your friends on felt.` : "No one else is on the board yet. Get your friends on felt.") : scope === "local" ? `Everyone in ${tzLabel(tz)} time. Tap a player to see their profile.` : "Everyone with a felt account. Tap a player to see their profile.")
    : realList === undefined && cloudEnabled() ? "Loading players…" : "Other players are samples until online play is added.";
  return (
    <div ref={scrollRef} className="screen screen-fade scr-narrow" style={{ display: "flex", flexDirection: "column" }}>
      {head}
      {seg}
      <div className="lb-note">{isRanked ? `${month} season, ends in ${daysLeftInSeason()} days.` : "Best 8 tournament cashes, fading over 90 days."}{scope === "local" && cloudEnabled() ? ` Players in ${tzLabel(tz)} time.` : ""}</div>
      {usePodium && podium}
      {rest.length > 0 && <section className="lb-list">{rest.map((p, j) => row(p, usePodium ? j + 3 : j))}</section>}
      <div className="lb-empty">{note}</div>
      {isRanked && !placed ? (
        <div className="lb-me lb-dock">
          <div className="lb-item">
            <TierBadge tier={UNRANKED} size={34} />
            <span style={{ flex: 1, fontSize: 13, color: "var(--t-sub)" }}>Finish {PLACEMENT_MATCHES - (data.ranked.placementGames || []).length} more placement {PLACEMENT_MATCHES - (data.ranked.placementGames || []).length === 1 ? "match" : "matches"} to get on the board</span>
          </div>
        </div>
      ) : myPos >= 0 && !meVisible ? <div className="lb-me lb-dock">{row(pool[myPos], myPos, true)}</div> : null}
      {openF && <FriendProfileModal friendId={openF} online={online} account={account} onClose={() => setOpenF(null)} />}
    </div>
  );
}

export { LeaderboardScreen };
