import { ClubTag, MedalPills } from "../ui/ClubTag.jsx";
import { medalCounts } from "../app/boot.jsx";
import { useState, useRef } from "react";
import { isIOS, isStandalone, cloudEnabled } from "../cloud.js";
import { ACHIEVEMENTS, SUIT_COLOR, SUIT_COLOR_CB } from "../game/helpers.js";
import { PLACEMENT_MATCHES, RANK_TIERS, divisionOf, isPlaced, rankName, rankProgress, tierForRating, tierOf } from "../game/ranked.js";
import { CrownMark, PrestigeBadge, pnameCls } from "../game/rewards.jsx";
import { shrinkPhoto } from "../game/save.js";
import { computeSkill } from "../game/skill.js";
import { TITLES, TitleTag, defaultTitles } from "../game/titles.jsx";
import { RankLadderModal, idToCode, legendLabel } from "./home/RankedCard.jsx";
import { signed } from "../table/setup.js";
import { SegToggle, SettingRow, StatCard, Toggle } from "../ui/controls.jsx";
import { Icon, MiniCard, Modal, SectionLabel, TierBadge } from "../ui/primitives.jsx";

/* =========================================================================
   PROFILE TAB
   ========================================================================= */
function BankrollChart({ points }) {
  const [hover, setHover] = useState(null);
  const svgRef = useRef(null);
  if (!points || points.length < 2) return <div className="empty" style={{ padding: "26px 0" }}>Your chip graph starts after a few hands.</div>;
  const W = 320, H = 120, P = 6;
  const vals = points.map((p) => p.v);
  let lo = Math.min(...vals), hi = Math.max(...vals);
  if (hi - lo < 10) { hi += 5; lo -= 5; }
  const x = (i) => P + (i / (points.length - 1)) * (W - P * 2);
  const y = (v) => P + (1 - (v - lo) / (hi - lo)) * (H - P * 2);
  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(p.v).toFixed(1)}`).join(" ");
  const area = `${line} L${x(points.length - 1).toFixed(1)} ${H} L${x(0).toFixed(1)} ${H} Z`;
  const first = vals[0], last = vals[vals.length - 1];
  const up = last >= first;
  const color = up ? "var(--t-good)" : "var(--t-bad)";
  const pick = (clientX) => { const r = svgRef.current.getBoundingClientRect(); const fx = (clientX - r.left) / r.width; setHover(Math.max(0, Math.min(points.length - 1, Math.round(((fx * W - P) / (W - P * 2)) * (points.length - 1))))); };
  const h = hover != null ? points[hover] : null;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <div className="num" style={{ fontSize: 22, fontWeight: 700 }}>{(h ? h.v : last).toLocaleString()}</div>
        <div className="num" style={{ fontSize: 12.5, fontWeight: 600, color: h ? "var(--t-mid)" : color }}>{h ? new Date(h.t).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : `${signed(last - first)} over ${points.length} updates`}</div>
      </div>
      <div style={{ position: "relative" }}>
        <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: "100%", height: 120, display: "block", touchAction: "pan-y" }}
          onMouseMove={(e) => pick(e.clientX)} onMouseLeave={() => setHover(null)} onTouchStart={(e) => pick(e.touches[0].clientX)} onTouchMove={(e) => pick(e.touches[0].clientX)} onTouchEnd={() => setHover(null)} role="img" aria-label={`Chip count went from ${first} to ${last}`}>
          <defs><linearGradient id="bkfill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style={{ stopColor: color, stopOpacity: 0.28 }} /><stop offset="1" style={{ stopColor: color, stopOpacity: 0 }} /></linearGradient></defs>
          {[0.25, 0.5, 0.75].map((f) => <line key={f} x1="0" x2={W} y1={H * f} y2={H * f} stroke="rgba(244,247,252,0.06)" strokeWidth="1" vectorEffect="non-scaling-stroke" />)}
          <path d={area} fill="url(#bkfill)" />
          <path d={line} fill="none" style={{ stroke: color }} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          {h && <line x1={x(hover)} x2={x(hover)} y1="0" y2={H} stroke="rgba(244,247,252,0.35)" strokeWidth="1" vectorEffect="non-scaling-stroke" />}
        </svg>
        {h && <div className="chart-dot" style={{ left: `${(x(hover) / W) * 100}%`, top: y(h.v), background: color }} />}
      </div>
      <div className="num" style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: "var(--t-faint)", marginTop: 4 }}>
        <span>Low {Math.min(...vals).toLocaleString()}</span><span>High {Math.max(...vals).toLocaleString()}</span>
      </div>
    </div>
  );
}

function PositionBars({ pos }) {
  const rows = [
    { k: "late", label: "Button and cutoff" },
    { k: "early", label: "Early and middle" },
    { k: "blinds", label: "Blinds" },
  ].map((r) => { const v = (pos && pos[r.k]) || [0, 0]; return { ...r, hands: v[0], wins: v[1], pct: v[0] ? v[1] / v[0] : 0 }; });
  if (rows.every((r) => r.hands === 0)) return <div className="empty" style={{ padding: "18px 0" }}>Play some cash or ranked hands to see this.</div>;
  const best = rows.reduce((a, b) => (b.hands >= 5 && b.pct > a.pct ? b : a), rows[0]);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {rows.map((r) => (
        <div key={r.k}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 5 }}>
            <span style={{ fontWeight: 600 }}>{r.label}</span>
            <span className="num" style={{ color: "var(--t-mid)" }}><b style={{ color: "var(--t-text)" }}>{Math.round(r.pct * 100)}%</b> of {r.hands.toLocaleString()}</span>
          </div>
          <div className="bar" style={{ height: 8 }}><div style={{ width: `${r.pct * 100}%`, background: r === best && r.hands >= 5 ? "var(--t-good)" : "#5E9EFF" }} /></div>
        </div>
      ))}
      <div style={{ fontSize: 11.5, color: "var(--t-faint)" }}>Most players win more from late position. If yours is lower, you might be playing too many hands up front.</div>
    </div>
  );
}

function BestHands({ list, suitColor }) {
  if (!list || list.length === 0) return <div className="empty" style={{ padding: "18px 0" }}>Win a showdown to start your list.</div>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {list.map((b, i) => (
        <div key={i} className="best-row">
          <div className="num best-n">{i + 1}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600 }}>{b.desc}</div>
            <div style={{ fontSize: 11, color: "var(--t-faint)" }}>{new Date(b.at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>
          </div>
          <div style={{ display: "flex", gap: 3 }}>{(b.cards || []).slice(0, 5).map((c) => <MiniCard key={c} code={idToCode(c)} suitColor={suitColor} />)}</div>
        </div>
      ))}
    </div>
  );
}

function ProfileScreen({ data, account, online, legendNo, pushOn, pushBusy, onEnablePush, isAdmin, onOpenAdmin, onOpenAuth, onSignOut, sound, onUpdateName, onSelectAvatar, onSetPhoto, onUsePhoto, onSelectFrame, onAddFriend, onUpdateSettings, onExportData, onImportData, onResetProfile, onEquipTitle, onPrestige }) {
  const importRef = useRef(null);
  const [ladder, setLadder] = useState(false);
  const [transfer, setTransfer] = useState(false);
  const [pasted, setPasted] = useState("");
  const [copied, setCopied] = useState(false);
  const profileCode = transfer ? "felt:" + btoa(unescape(encodeURIComponent(JSON.stringify(data)))) : "";
  const codeRef = useRef(null);
  const copyCode = async () => {
    try { await navigator.clipboard.writeText(profileCode); setCopied(true); }
    catch (e) { if (codeRef.current) { codeRef.current.focus(); codeRef.current.select(); try { document.execCommand("copy"); setCopied(true); } catch (e2) { /* select is the fallback */ } } }
  };
  const [pickingTitle, setPickingTitle] = useState(false);
  const tt = data.titles || defaultTitles();
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(data.name);
  const [friendInput, setFriendInput] = useState("");
  const [pickingAvatar, setPickingAvatar] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const winRate = data.stats.handsPlayed > 0 ? Math.round((data.stats.handsWon / data.stats.handsPlayed) * 100) : 0;
  const rk = data.ranked;
  const placed = isPlaced(rk);
  const tier = tierOf(rk);
  const prog = placed ? rankProgress(rk.rating) : null;
  const frameColor = rk.frame ? RANK_TIERS.find((t) => t.key === rk.frame)?.color : null;
  const skillNow = computeSkill(data.skill);
  const saveName = () => { onUpdateName(nameInput.trim() || "You"); setEditingName(false); };
  const settingsRef = useRef(null);
  const [achSel, setAchSel] = useState(null);
  const ACH_COLORS = ["#F51E1D", "#FF7E35", "#196EFE", "#00A560", "#EDB000", "#A32BFE", "#00A5B8"];
  const nextAch = ACHIEVEMENTS.find((a) => !data.achievements.includes(a.id));
  const shownAch = achSel ? ACHIEVEMENTS.find((a) => a.id === achSel) : nextAch;
  const thisMonth = new Date().toLocaleString("en-US", { month: "short" });
  const shortRank = (r) => rankName(r).replace("Platinum", "Plat").replace("Diamond", "Dia").replace("Champion", "Champ");

  return (
    <div className="screen screen-fade scr-narrow">
      <header className="home-head">
        <div className="wordmark">Me</div>
        <button className="iconbtn" onClick={() => settingsRef.current && settingsRef.current.scrollIntoView({ behavior: "smooth", block: "start" })} aria-label="Settings"><Icon name="settings" size={17} stroke={2} /></button>
      </header>
      <section className="id-card" style={{ "--sc": frameColor || (placed ? tier.color : "#A3A6AD") }}>
        <div className="stripe" />
        <div className="id-top">
        <button onClick={() => setPickingAvatar(true)} className="profile-av" style={{ boxShadow: frameColor ? `0 0 0 4px var(--t-panel), 0 0 0 8px ${frameColor}` : "none" }} aria-label="Change avatar">{(rk.prestige || 0) >= 5 && <CrownMark size={20} top={-16} />}{data.usePhoto && data.photo ? <img src={data.photo} alt="" className="av-photo" /> : data.avatar}<span className="av-edit"><Icon name="edit" size={11} stroke={2.2} /></span></button>
        {editingName ? (
          <div style={{ flex: 1, minWidth: 0 }}>
          <form onSubmit={(e) => { e.preventDefault(); saveName(); }} style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input autoFocus value={nameInput} maxLength={16} onChange={(e) => setNameInput(e.target.value)} className="input" style={{ width: 150, fontWeight: 600 }} aria-label="Display name" />
            <button type="submit" className="iconbtn" aria-label="Save name"><Icon name="check" size={14} /></button>
          </form>
          </div>
        ) : (
          <div style={{ flex: 1, minWidth: 0 }}>
            <button onClick={() => setEditingName(true)} className="name-btn"><span className={pnameCls(rk.prestige)}>{data.name}</span><PrestigeBadge n={rk.prestige} size={20} />{account && data.club && <ClubTag club={data.club} big style={{ marginLeft: 8 }} />}<Icon name="edit" size={13} style={{ color: "var(--t-mid)", marginLeft: 6 }} /></button>
            {account && account.username && <div style={{ fontSize: 13, color: "var(--t-mid)", marginTop: 2 }}>@{account.username}</div>}
            <button className="title-btn" onClick={() => setPickingTitle(true)} aria-label="Change title"><TitleTag k={tt.equipped} size={13} /><Icon name="chevron" size={11} style={{ color: "var(--t-mid)", transform: "rotate(90deg)" }} /></button>
          </div>
        )}
        </div>
        <div className="id-pills">
          <span className="chip-pill num"><span className="chip-dot" />{data.chips.toLocaleString()}</span>
          <span className="chip-pill" style={{ color: tier.color }}><TierBadge tier={tier} size={16} />{placed ? legendLabel(rk, legendNo) || rankName(rk.rating) : "Unranked"}</span>
          {skillNow && data.skill.hands >= 10 && <span className="chip-pill num">SR {skillNow.sr}</span>}
          {(data.medals || []).length > 0 && <MedalPills c={medalCounts(data.medals)} />}
        </div>
      </section>

      <SectionLabel right={<button className="rk-link" onClick={() => setLadder(true)}>{placed && rk.peakRating > rk.rating ? `Peak ${rankName(rk.peakRating)}, all ranks` : "All ranks"}</button>}>Ranked</SectionLabel>
      <section className="panel" style={{ marginBottom: 22 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <TierBadge tier={tier} size={58} div={placed ? divisionOf(rk.rating) : null} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="disp" style={{ fontSize: 30, color: placed ? tier.color : "var(--t-text)" }}>{placed ? legendLabel(rk, legendNo) || rankName(rk.rating) : "Unranked"}</div>
            <div className="num" style={{ fontSize: 12.5, color: "var(--t-mid)", marginTop: 4 }}>{placed ? `${Math.round(rk.rating).toLocaleString()} RP · ${rk.wins} wins, ${rk.losses} losses` : `${(rk.placementGames || []).length} of ${PLACEMENT_MATCHES} placements played`}</div>
          </div>
        </div>
        {placed ? (
          <div className="rk-segs" aria-hidden="true">{Array.from({ length: 10 }, (_, i) => <span key={i} style={i < Math.round(prog.pct * 10) ? { background: tier.color } : undefined} />)}</div>
        ) : (
          <div className="rk-segs" style={{ gridTemplateColumns: `repeat(${PLACEMENT_MATCHES}, minmax(0, 1fr))` }}>{Array.from({ length: PLACEMENT_MATCHES }, (_, i) => <span key={i} style={(rk.placementGames || [])[i] ? { background: rk.placementGames[i].won ? "var(--c-green)" : "var(--c-red)" } : undefined} />)}</div>
        )}
        {placed && prog.nextLabel && <div style={{ fontSize: 12, color: "var(--t-mid)", marginTop: 8 }}>{prog.toNext} RP to {prog.nextLabel}</div>}

        {(rk.recent || []).length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div className="lbl" style={{ marginBottom: 8 }}>{rk.recent.length === 1 ? "Last match" : `Last ${rk.recent.length} matches`}</div>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {rk.recent.map((m, i) => (
                <span key={i} title={`${m.won ? "Win" : "Loss"}${m.placement ? ", placement" : `, ${signed(m.delta)} RP`}`} className="rk-recent num" style={{ background: m.won ? "var(--c-green)" : "var(--t-panel2)", color: m.won ? "#111214" : "var(--t-bad)" }}>{m.placement ? (m.won ? "W" : "L") : signed(m.delta)}</span>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8, marginTop: 16 }}>
          {[...(rk.history || []).slice(-2).map((h) => { const [yy, mm] = String(h.seasonId).split("-"); return { key: h.seasonId, m: new Date(+yy, +mm - 1, 1).toLocaleString("en-US", { month: "short" }), r: h.rating, now: false }; }), { key: "now", m: thisMonth, r: placed ? rk.rating : null, now: true }].map((x) => (
            <div key={x.key} className="spec" style={{ padding: "8px 10px", boxShadow: x.now && placed ? `inset 0 0 0 1.5px ${tier.color}` : "none" }}>
              <span className="lbl">{x.m}{x.now ? " · now" : ""}</span>
              <b style={{ fontSize: 18, color: x.r != null ? tierForRating(x.r).color : "var(--t-mid)" }}>{x.r != null ? shortRank(x.r) : "Unranked"}</b>
            </div>
          ))}
        </div>

        <div className="lbl" style={{ margin: "18px 0 10px" }}>Avatar frame{rk.frames.length === 0 ? " · reach Silver for your first" : ""}</div>
        <div className="frame-grid">
          {RANK_TIERS.filter((t) => t.min > 0).map((t) => {
            const owned = rk.frames.includes(t.key);
            const on = rk.frame === t.key;
            return (
              <button key={t.key} disabled={!owned} onClick={() => onSelectFrame(on ? null : t.key)} className={`frame-chip${on ? " on" : ""}`} aria-pressed={on} title={owned ? `${t.label} frame` : `Reach ${t.label} to unlock`} style={{ "--lc": t.color }}>
                <TierBadge tier={t} size={36} />
                <span>{owned ? t.label : <Icon name="lock" size={11} stroke={2.4} />}</span>
              </button>
            );
          })}
        </div>
      </section>

      <SectionLabel>Stats</SectionLabel>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
        <StatCard label="Hands played" value={data.stats.handsPlayed.toLocaleString()} />
        <StatCard label="Win rate" value={`${winRate}%`} />
        <StatCard label="Biggest pot" value={data.stats.biggestPot.toLocaleString()} />
        <StatCard label="Net chips" value={signed(data.stats.netChips || 0)} color={(data.stats.netChips || 0) > 0 ? "var(--t-good)" : (data.stats.netChips || 0) < 0 ? "var(--t-bad)" : undefined} />
      </div>
      <section className="panel" style={{ marginBottom: 10 }}>
        <div className="panel-head"><span className="disp" style={{ fontSize: 21 }}>Bankroll</span><span style={{ fontSize: 12, color: "var(--t-mid)" }}>Your chips over time</span></div>
        <BankrollChart points={(data.history || {}).bankroll} />
      </section>
      <section className="panel" style={{ marginBottom: 10 }}>
        <div className="panel-head"><span className="disp" style={{ fontSize: 21 }}>Win rate by seat</span></div>
        <PositionBars pos={data.stats.pos} />
      </section>
      <section className="panel" style={{ marginBottom: 10 }}>
        <div className="panel-head"><span className="disp" style={{ fontSize: 21 }}>Best hands</span></div>
        <BestHands list={(data.history || {}).best} suitColor={data.settings.colorblind ? SUIT_COLOR_CB : SUIT_COLOR} />
      </section>

      <section className="panel" style={{ marginBottom: 22 }}>
        <div className="panel-head"><span className="disp" style={{ fontSize: 21 }}>Achievements</span><span style={{ fontSize: 12, color: "var(--t-mid)" }}>{data.achievements.length} of {ACHIEVEMENTS.length}</span></div>
        <div className="ach-chips">
          {ACHIEVEMENTS.map((a, i) => {
            const done = data.achievements.includes(a.id);
            return <button key={a.id} className={`ach-chip${done ? " got" : ""}${achSel === a.id ? " sel" : ""}`} style={{ "--cc": ACH_COLORS[i % ACH_COLORS.length] }} aria-label={`${a.label}${done ? ", earned" : ", locked"}`} aria-pressed={achSel === a.id} onClick={() => setAchSel(achSel === a.id ? null : a.id)} />;
          })}
        </div>
        <div style={{ fontSize: 13, color: "var(--t-mid)", marginTop: 12, lineHeight: 1.45 }}>
          {shownAch ? (() => { const done = data.achievements.includes(shownAch.id); const cur = Math.max(0, Math.min(shownAch.target, data.stats[shownAch.stat] || 0)); return <>{achSel ? (done ? "Earned: " : "Locked: ") : "Next up: "}<b style={{ color: "var(--t-text)" }}>{shownAch.label}</b>, {shownAch.desc.charAt(0).toLowerCase() + shownAch.desc.slice(1)}.{!done && <span className="num"> {cur.toLocaleString()} of {shownAch.target.toLocaleString()}.</span>}</>; })() : "All earned. Nice."}
        </div>
      </section>

      <div ref={settingsRef} style={{ scrollMarginTop: 12 }}><SectionLabel>Settings</SectionLabel></div>
      <section className="panel" style={{ padding: "0 16px", marginBottom: 12 }}>
        {account && (
          <SettingRow label="Notifications" sub={pushOn ? "On for invites and your turn" : isIOS() && !isStandalone() ? "Add felt to your Home Screen first" : "Your turn and table invites"}>
            {pushOn ? <span className="cos-tag eq">On</span> : <button className="btn btn-sm btn-raise" disabled={pushBusy || (isIOS() && !isStandalone())} onClick={onEnablePush}>Turn on</button>}
          </SettingRow>
        )}
        <SettingRow label="Colorblind suits" sub="Blue and black instead of red and black">
          <Toggle on={data.settings.colorblind} onClick={() => onUpdateSettings({ colorblind: !data.settings.colorblind })} label="Colorblind suits" />
        </SettingRow>
        <SettingRow label="Card size" sub="Bigger hole cards">
          <SegToggle options={[{ v: "normal", l: "Normal" }, { v: "large", l: "Large" }]} value={data.settings.cardSize} onChange={(v) => onUpdateSettings({ cardSize: v })} />
        </SettingRow>
        <SettingRow label="Animation speed" sub="How fast the table moves">
          <SegToggle options={[{ v: "normal", l: "Normal" }, { v: "fast", l: "Fast" }]} value={data.settings.animSpeed} onChange={(v) => onUpdateSettings({ animSpeed: v })} />
        </SettingRow>
        <SettingRow label="Squeeze your cards" sub="Peel them up slowly like a live game">
          <Toggle on={data.settings.squeeze !== false} onClick={() => onUpdateSettings({ squeeze: data.settings.squeeze === false })} label="Squeeze your cards" />
        </SettingRow>
        <SettingRow label="Run it twice" sub="When you're all in, deal the board twice and split">
          <Toggle on={!!data.settings.runTwice} onClick={() => onUpdateSettings({ runTwice: !data.settings.runTwice })} label="Run it twice" />
        </SettingRow>
        <button className="set-link" onClick={onExportData}><span><b>Export my data</b><i>Download your profile as a file</i></span><Icon name="download" size={16} /></button>
        <button className="set-link" onClick={() => { setTransfer(true); setCopied(false); setPasted(""); }}><span><b>Move my profile</b><i>Copy a code here, paste it into another copy of felt</i></span><Icon name="share" size={16} /></button>
        <button className="set-link" onClick={() => importRef.current && importRef.current.click()}><span><b>Import from a file</b><i>Use a file you exported before</i></span><Icon name="download" size={16} style={{ transform: "rotate(180deg)" }} /></button>
        <input ref={importRef} type="file" accept="application/json,.json" style={{ display: "none" }} onChange={(e) => { onImportData(e.target.files && e.target.files[0]); e.target.value = ""; }} />
        {isAdmin && <button className="set-link" onClick={onOpenAdmin}><span><b>Admin tools</b><i>Send chips, look up players, close tables</i></span><span className="pass-lvl" style={{ fontSize: 13 }}>ONLY YOU</span><Icon name="chevron" size={16} /></button>}
        <button className="set-link" onClick={() => { if (confirmReset) { onResetProfile(); setConfirmReset(false); } else setConfirmReset(true); }}><span><b style={{ color: "var(--t-bad)" }}>{confirmReset ? "Tap again to reset" : "Reset profile"}</b><i>{confirmReset ? "This can't be undone" : "Wipes chips, stats, rank and settings"}</i></span><Icon name="reset" size={16} style={{ color: "var(--t-bad)" }} /></button>
        {cloudEnabled() && (account
          ? <button className="set-link" onClick={onSignOut}><span><b style={{ color: "var(--t-bad)" }}>Sign out</b><i>@{account.username || "player"} · {account.email || "saving online"}</i></span></button>
          : <button className="set-link" onClick={() => onOpenAuth("signup")}><span><b>Sign up or sign in</b><i>Not signed in. Progress only saves on this phone.</i></span><span className="pass-lvl" style={{ fontSize: 13 }}>SIGN UP</span></button>)}
      </section>
      <div style={{ height: 12 }} />

      {ladder && <RankLadderModal ranked={rk} legendNo={legendNo} onClose={() => setLadder(false)} />}
      {transfer && (
        <Modal title="Move my profile" onClose={() => setTransfer(false)} width={400}>
          <div style={{ fontSize: 12.5, color: "var(--t-mid)", marginBottom: 8 }}>1. On the old copy, copy this code.</div>
          <textarea ref={codeRef} readOnly value={profileCode} className="input code-box" onFocus={(e) => e.target.select()} aria-label="Your profile code" />
          <button className="btn btn-sm" style={{ marginTop: 8, width: "100%" }} onClick={copyCode}>{copied ? "Copied" : "Copy code"}</button>
          <div style={{ fontSize: 12.5, color: "var(--t-mid)", margin: "18px 0 8px" }}>2. On the new copy, paste it here.</div>
          <textarea value={pasted} onChange={(e) => setPasted(e.target.value)} className="input code-box" placeholder="Paste your code" aria-label="Paste a profile code" />
          <button className="btn btn-raise btn-sm" style={{ marginTop: 8, width: "100%" }} disabled={!pasted.trim()} onClick={() => { onImportData(pasted); setTransfer(false); }}>Import</button>
          <div style={{ fontSize: 11.5, color: "var(--t-faint)", marginTop: 10 }}>Importing replaces the profile on this copy.</div>
        </Modal>
      )}
      {pickingTitle && (
        <Modal title="Titles" onClose={() => setPickingTitle(false)} width={400}>
          <div style={{ fontSize: 12, color: "var(--t-mut)", margin: "-6px 2px 10px" }}>{tt.owned.length} of {TITLES.length} unlocked. Earn them by playing or buy some in the shop.</div>
          <div style={{ maxHeight: "60vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
            {TITLES.slice().sort((a, b) => (tt.owned.includes(b.key) ? 1 : 0) - (tt.owned.includes(a.key) ? 1 : 0)).map((t) => {
              const owned = tt.owned.includes(t.key); const on = tt.equipped === t.key;
              return (
                <button key={t.key} className={`title-row${on ? " on" : ""}`} disabled={!owned} onClick={() => { onEquipTitle(t.key); setPickingTitle(false); }} style={{ opacity: owned ? 1 : 0.55, cursor: owned ? "pointer" : "default", textAlign: "left" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <TitleTag k={t.key} size={14} />
                    <div style={{ fontSize: 11, color: "var(--t-mut)", marginTop: 2 }}>{t.how || (t.cost ? `Shop, ${t.cost.toLocaleString()} chips` : "")}</div>
                  </div>
                  {on ? <span className="cos-tag eq">Equipped</span> : owned ? <span className="cos-tag">Equip</span> : <Icon name="lock" size={13} style={{ color: "var(--t-faint)" }} />}
                </button>
              );
            })}
          </div>
        </Modal>
      )}
      {pickingAvatar && (
        <Modal title="Choose avatar" onClose={() => setPickingAvatar(false)}>
          <div className="photo-row">
            <label className="btn photo-up">
              <Icon name="camera" size={15} stroke={2} />{data.photo ? "New photo" : "Upload a photo"}
              <input type="file" accept="image/*" onChange={async (e) => { const f = e.target.files && e.target.files[0]; e.target.value = ""; if (!f) return; try { const url = await shrinkPhoto(f); onSetPhoto(url); setPickingAvatar(false); } catch (err) { onSetPhoto(null, "That photo didn't load. Try another one."); } }} />
            </label>
            {data.photo && <button className={`avatar-tile photo-tile${data.usePhoto ? " on" : ""}`} onClick={() => { onUsePhoto(true); setPickingAvatar(false); }} aria-pressed={!!data.usePhoto} aria-label="Use my photo"><img src={data.photo} alt="" /></button>}
            {data.photo && <button className="iconbtn" onClick={() => onSetPhoto(null)} aria-label="Remove photo"><Icon name="close" size={13} /></button>}
          </div>
          <div className="avatar-grid">
            {data.unlocked.map((emoji) => (
              <button key={emoji} onClick={() => { onSelectAvatar(emoji); setPickingAvatar(false); }} className="avatar-tile" style={{ borderColor: emoji === data.avatar && !data.usePhoto ? "var(--t-good)" : undefined }} aria-pressed={emoji === data.avatar && !data.usePhoto}>
                <div style={{ fontSize: 26 }}>{emoji}</div>
              </button>
            ))}
          </div>
          <div style={{ fontSize: 12, color: "var(--t-mut)", marginTop: 12, textAlign: "center" }}>Buy more in the shop.</div>
        </Modal>
      )}

    </div>
  );
}

export { ProfileScreen };
