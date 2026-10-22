import { useState, useEffect, useCallback, useRef } from "react";
import { api, apiPublic, cloud } from "../cloud.js";
import { publicProfile } from "../app/boot.jsx";
import { CLUB_COLORS, CLUB_COST, CLUB_LEVELS, DONATE_STEPS, LEVEL_PERKS, checkClubName, checkClubTag } from "../../api/_clubrules.js";
import { PrestigeBadge, pnameCls } from "../game/rewards.jsx";
import { tierForRating } from "../game/ranked.js";
import { ChipAvatar, FriendProfileModal } from "../social/Friends.jsx";
import { ClubCrest, ClubTag, clubHex, resetIn, shortSigned, signed } from "../ui/ClubTag.jsx";
import { Toggle } from "../ui/controls.jsx";
import { Icon, Modal, SectionLabel, TitlePill } from "../ui/primitives.jsx";

/* =========================================================================
   CLUBS TAB: your crew, its tables, its vault, and the weekly club fight
   ========================================================================= */
const kShort = (v) => (v >= 1e6 ? `${(v / 1e6).toFixed(1).replace(/\.0$/, "")}M` : v >= 1000 ? `${Math.round(v / 1000)}K` : String(v));
const ROLE = { owner: "Owner", admin: "Admin" };
const notReady = (m) => /does not exist|schema cache|relation|function .* not find/i.test(m || "");

// five letter boxes for a club code
function CodeBoxes({ value, onChange, onEnter, n = 5 }) {
  const [focus, setFocus] = useState(false);
  return (
    <label className="code-boxes" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
      <input className="code-real" value={value} onChange={(e) => onChange(e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, n))} onFocus={() => setFocus(true)} onBlur={() => setFocus(false)} onKeyDown={(e) => { if (e.key === "Enter") onEnter(); }} maxLength={n} autoCapitalize="characters" autoCorrect="off" autoComplete="off" spellCheck={false} aria-label="Club code" />
      {Array.from({ length: n }).map((_, i) => <span key={i} className={`cbox${focus && i === Math.min(value.length, n - 1) ? " cur" : ""}`} aria-hidden="true">{value[i] || ""}</span>)}
    </label>
  );
}

function ColorPick({ value, onChange }) {
  return (
    <div className="cl-colors" role="radiogroup" aria-label="Club color">
      {Object.entries(CLUB_COLORS).map(([k, hex]) => (
        <button key={k} role="radio" aria-checked={value === k} aria-label={k} className={`cl-color${value === k ? " on" : ""}`} onClick={() => onChange(k)}><span className="chip-ic" style={{ "--cc": hex }} /></button>
      ))}
    </div>
  );
}

// make a club, or edit yours: same form either way
function ClubForm({ start = {}, cost, busy, err, onSubmit, submitLabel, extra }) {
  const [name, setName] = useState(start.name || ""); const [tag, setTag] = useState(start.tag || "");
  const [color, setColor] = useState(start.color || "red"); const [about, setAbout] = useState(start.about || ""); const [open, setOpen] = useState(start.open !== false);
  const [, nameErr] = name ? checkClubName(name) : [null, null]; const [, tagErr] = tag ? checkClubTag(tag) : [null, null];
  const ready = name && tag && !nameErr && !tagErr;
  return (
    <>
      <div className="cl-preview" style={{ "--cc": clubHex(color) }}>
        <ClubCrest club={{ tag: tag || "TAG", color }} size={70} />
        <div style={{ minWidth: 0 }}>
          <div className="disp cl-preview-name">{name || "Your club"}</div>
          <div className="cl-preview-line"><span className="pname">You</span><ClubTag club={{ tag: tag || "TAG", color }} /></div>
        </div>
      </div>
      <label className="cl-field"><span className="lbl">Name</span><input className="input" value={name} maxLength={24} onChange={(e) => setName(e.target.value)} placeholder="Gator Gang" /></label>
      {nameErr && <div className="cl-hint bad">{nameErr}</div>}
      <label className="cl-field"><span className="lbl">Tag</span><input className="input cl-tag-in" value={tag} maxLength={4} onChange={(e) => setTag(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} placeholder="GTR" autoCapitalize="characters" /></label>
      <div className={`cl-hint${tagErr ? " bad" : ""}`}>{tagErr || "2 to 4 letters. Shows next to every member's name."}</div>
      <div className="cl-field"><span className="lbl">Color</span><ColorPick value={color} onChange={setColor} /></div>
      <label className="cl-field"><span className="lbl">About <i>optional</i></span><input className="input" value={about} maxLength={80} onChange={(e) => setAbout(e.target.value)} placeholder="UF's finest degenerates" /></label>
      <div className="ft-friendly" style={{ marginTop: 14 }}>
        <div style={{ flex: 1, minWidth: 0 }}><div className="disp" style={{ fontSize: 19 }}>{open ? "Open club" : "Invite only"}</div><div className="ft-sub" style={{ marginTop: 2 }}>{open ? "Anyone can join from the rankings" : "People need your code or link"}</div></div>
        <Toggle on={open} onClick={() => setOpen((o) => !o)} label="Open club" />
      </div>
      {extra}
      {err && <div className="auth-err" style={{ marginTop: 12 }}>{err}</div>}
      <button className="btn btn-raise big-cta" disabled={!ready || busy} onClick={() => onSubmit({ name, tag, color, about, open })}>{busy ? "One sec" : submitLabel}{cost ? <span className="cl-cost num"> · {kShort(cost)}</span> : null}</button>
    </>
  );
}

function ClubRow({ c, mineId, canJoin, onView, onJoin }) {
  const you = c.id === mineId;
  return (
    <div className={`lb-item cl-row${you ? " you" : ""}`}>
      <span className="lb-pl num">{c.rank}</span>
      <button className="cl-row-main" onClick={() => onView(c)}>
        <ClubCrest club={c} size={40} />
        <span style={{ flex: 1, minWidth: 0 }}>
          <span className="lb-nm"><span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</span>{you && <span className="lb-tag">Yours</span>}</span>
          <span className="lb-tier" style={{ color: "var(--t-mid)" }}><span className="num">{c.members}/{c.cap}</span> members · LV {c.level}{c.open ? "" : " · Invite only"}{canJoin && c.open && c.members < c.cap && c.score ? <> · <span className={`num cl-score${c.score > 0 ? " up" : " down"}`}>{shortSigned(c.score)}</span></> : null}</span>
        </span>
      </button>
      {canJoin && c.open && c.members < c.cap ? <button className="btn btn-sm btn-go cl-join" onClick={() => onJoin(c)}>Join</button>
        : <span className={`lb-val num cl-score${c.score > 0 ? " up" : c.score < 0 ? " down" : ""}`}>{shortSigned(c.score)}</span>}
    </div>
  );
}

function ClubsScreen({ data, account, online = {}, onOpenAuth, onDebit, onOpenTable, onStartTable, onFounder, onClub, toast, pendingCode, onPendingDone }) {
  const [mine, setMine] = useState(undefined); // undefined while loading, null when you're not in one
  const [board, setBoard] = useState(null);
  const [err, setErr] = useState(null);
  const [sheet, setSheet] = useState(null);
  const [busy, setBusy] = useState(false); const [sheetErr, setSheetErr] = useState(null);
  const [profileId, setProfileId] = useState(null);
  const [code, setCode] = useState("");
  const loadRef = useRef(0);
  const load = useCallback(async () => {
    const n = ++loadRef.current;
    try {
      const [m, b] = await Promise.all([account ? api("club", { op: "mine" }) : Promise.resolve({ club: null }), apiPublic("club", { op: "board" })]);
      if (n !== loadRef.current) return;
      setMine(m.club ? m : null); setBoard(b); setErr(null);
      if (account && onClub) onClub(m.club ? { id: m.club.id, tag: m.club.tag, color: m.club.color, lvl: m.club.level } : null);
    } catch (e) { if (n !== loadRef.current) return; setErr(e.message); setMine((x) => (x === undefined ? null : x)); }
  }, [account]);
  useEffect(() => { load(); const t = setInterval(load, 20000); return () => clearInterval(t); }, [load]);
  useEffect(() => { if (pendingCode) setSheet({ kind: "join", code: pendingCode }); }, [pendingCode]);
  const open = (s) => { setSheetErr(null); setBusy(false); setSheet(s); };
  const close = () => { if (sheet && sheet.kind === "join" && onPendingDone) onPendingDone(); setSheet(null); setSheetErr(null); };
  // every club change goes to the server, then the screen reloads
  const act = async (payload, after) => {
    setBusy(true); setSheetErr(null);
    try {
      if (payload.op === "create" || payload.op === "donate") await cloud.pushSave(account, data, publicProfile(data)).catch(() => {}); // the server needs your latest chips first
      const r = await api("club", payload);
      if (r.debit) onDebit(r.debit);
      await load();
      setBusy(false);
      if (after) after(r);
      return r;
    } catch (e) { setSheetErr(e.message); setBusy(false); return null; }
  };
  const inviteLink = (c) => `${window.location.origin}/?club=${c.code}`;
  const share = async (c) => {
    const url = inviteLink(c); const text = `Join ${c.name} [${c.tag}] on felt`;
    try { if (navigator.share) { await navigator.share({ title: text, text, url }); return; } } catch (e) { if (e && e.name === "AbortError") return; }
    try { await navigator.clipboard.writeText(url); toast({ title: "Link copied", label: "Paste it in your group chat" }); } catch (e) { toast({ title: "Your club code", label: c.code }); }
  };
  const canJoin = !!account && mine === null;
  const club = mine && mine.club;
  const me = mine && mine.me;
  const isAdmin = me && (me.role === "owner" || me.role === "admin");
  const clubs = (board && board.clubs) || [];
  const resetMs = (board && board.resetMs) || (mine && mine.resetMs) || 0;

  const rankings = (
    <>
      <SectionLabel right={resetMs ? `Resets in ${resetIn(resetMs)}` : null}>Club rankings</SectionLabel>
      {clubs.length ? (
        <section className="lb-list cl-board">{clubs.slice(0, club ? 10 : 50).map((c) => <ClubRow key={c.id} c={c} mineId={club && club.id} canJoin={canJoin} onView={(x) => open({ kind: "view", id: x.id })} onJoin={(x) => act({ op: "join", id: x.id }, () => toast({ title: "You're in", label: `Welcome to ${x.name}` }))} />)}</section>
      ) : <div className="lb-empty">{board ? "No clubs yet. Start the first one." : err ? (notReady(err) ? "Clubs are almost ready. Check back soon." : err) : "Loading clubs…"}</div>}
      {club && clubs.length > 10 && <div className="lb-empty">Top 10 of {clubs.length} clubs</div>}
      <div className="lb-note" style={{ marginTop: 10 }}>Every member's chips won this week, added up. Cash, tourneys, ranked and real tables all count.</div>
    </>
  );

  let body;
  if (mine === undefined) body = <div className="lb-empty" style={{ padding: "40px 0" }}>Loading…</div>;
  else if (!club) {
    body = (
      <>
        <section className="cl-hero">
          <div className="cl-hero-chips" aria-hidden="true">{["red", "blue", "green", "gold"].map((k, i) => <span key={k} className="chip-ic" style={{ "--cc": CLUB_COLORS[k], transform: `rotate(${i * 22}deg)` }} />)}</div>
          <div className="disp cl-hero-t">Find your crew</div>
          <p className="cl-hero-p">Clubs get their own tables, a tag next to every member's name, and a fight for the top spot every week.</p>
          {account ? (
            <>
              <button className="btn btn-raise big-cta" onClick={() => open({ kind: "create" })}>Start a club<span className="cl-cost num"> · {kShort(CLUB_COST)}</span></button>
              <div className="lbl" style={{ margin: "18px 0 8px" }}>Got a code?</div>
              <div className="ft-code" style={{ marginTop: 0 }}>
                <CodeBoxes value={code} onChange={setCode} onEnter={() => code.length === 5 && open({ kind: "join", code })} />
                <button className="btn ft-join" disabled={code.length !== 5} onClick={() => open({ kind: "join", code })}>Join</button>
              </div>
            </>
          ) : <button className="btn btn-raise big-cta" onClick={() => onOpenAuth("signup")}>Make an account to join</button>}
        </section>
        {rankings}
      </>
    );
  } else {
    const lvl = club.level; const next = CLUB_LEVELS[lvl]; const floor = CLUB_LEVELS[lvl - 1];
    const pct = next ? Math.min(100, ((club.xp - floor) / (next - floor)) * 100) : 100;
    const onlineCount = mine.members.filter((m) => online[m.id]).length;
    body = (
      <>
        <section className="cl-card" style={{ "--cc": clubHex(club.color) }}>
          <div className="cl-stripe" />
          <div className="cl-top">
            <ClubCrest club={club} size={78} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="disp cl-name">{club.name}</div>
              <div className="cl-meta"><ClubTag club={club} big /><span className="cl-lv">LV {lvl}</span>{!club.open && <span className="cl-priv"><Icon name="lock" size={12} stroke={2.4} />Invite only</span>}</div>
            </div>
          </div>
          {club.about && <p className="cl-about">{club.about}</p>}
          <div className="cl-stats">
            <div><span className="lbl">This week</span><b className={`num${club.score > 0 ? " up" : club.score < 0 ? " down" : ""}`}>{shortSigned(club.score)}</b></div>
            <div><span className="lbl">Rank</span><b className="num">{club.rank ? `#${club.rank}` : "-"}<i>of {club.of || 1}</i></b></div>
            <div><span className="lbl">Members</span><b className="num">{club.members}<i>/{club.cap}</i></b></div>
          </div>
          <div className="cl-actions">
            <button className="btn btn-sm btn-go" onClick={() => open({ kind: "invite" })}><Icon name="user" size={16} stroke={2.4} />Invite</button>
            <button className="btn btn-sm btn-raise" onClick={() => onStartTable(club)}>Club table</button>
            <button className="btn btn-sm" onClick={() => open({ kind: "donate" })}><Icon name="chips" size={16} stroke={2.2} />Vault</button>
          </div>
        </section>

        {mine.tables && mine.tables.length > 0 && (
          <>
            <SectionLabel right="Members only">Club tables</SectionLabel>
            <section className="lb-list">
              {mine.tables.map((t) => (
                <div key={t.id} className="lb-item cl-table">
                  <span className="cl-tdot" />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span className="lb-nm num">Table {t.code} · {t.sb}/{t.bb}{t.friendly ? " · Friendly" : ""}</span>
                    <span className="lb-tier" style={{ color: "var(--t-mid)" }}>{t.players.length}/{t.seats} seated{t.players.length ? ` · ${t.players.slice(0, 3).join(", ")}${t.players.length > 3 ? "…" : ""}` : ""}</span>
                  </span>
                  <button className="btn btn-sm btn-raise" onClick={() => onOpenTable(t.id)}>Join</button>
                </div>
              ))}
            </section>
          </>
        )}

        <SectionLabel right={`${onlineCount} online · resets in ${resetIn(resetMs)}`}>This week</SectionLabel>
        <section className="lb-list">
          {mine.members.map((m, i) => {
            const you = account && m.id === account.id; const tier = m.placed ? tierForRating(m.rating) : null;
            return (
              <button key={m.id} className={`lb-item tap${you ? " you" : ""}`} onClick={() => open({ kind: "member", m })}>
                <span className="lb-pl num">{i + 1}</span>
                <ChipAvatar p={m} letter={m.name} size={38} tier={tier} live={!you && !!online[m.id]} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className="lb-nm"><span className={pnameCls(m.prestige)} style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{m.name}</span>{m.prestige ? <PrestigeBadge n={m.prestige} size={15} /> : null}{ROLE[m.role] && <span className={`cl-role ${m.role}`}>{ROLE[m.role]}</span>}{you && <span className="lb-tag">You</span>}</span>
                  <span className="lb-tier" style={{ color: online[m.id] && !you ? "var(--t-good)" : "var(--t-mid)" }}>{online[m.id] && !you ? online[m.id] : m.donated ? `${kShort(m.donated)} in the vault` : `@${m.username}`}</span>
                </span>
                <span className={`lb-val num cl-score${m.net > 0 ? " up" : m.net < 0 ? " down" : ""}`}>{shortSigned(m.net)}</span>
              </button>
            );
          })}
        </section>

        <SectionLabel right={next ? `${kShort(next - club.xp)} to LV ${lvl + 1}` : "Max level"}>Club vault</SectionLabel>
        <section className="cl-vault" style={{ "--cc": clubHex(club.color) }}>
          <div className="cl-vault-top">
            <div><span className="lbl">In the vault</span><b className="disp num">{club.xp.toLocaleString()}</b></div>
            <button className="btn btn-sm btn-raise" onClick={() => open({ kind: "donate" })}>Put chips in</button>
          </div>
          <div className="cl-vbar"><i style={{ width: `${pct}%` }} /></div>
          <ol className="cl-perks">
            {LEVEL_PERKS.map((p, i) => (
              <li key={i} className={i < lvl ? "got" : ""}><span className="cl-plv">LV {i + 1}</span><span className="cl-ptxt">{p}</span><span className="cl-pneed num">{i < lvl ? <Icon name="check" size={15} stroke={2.6} /> : kShort(CLUB_LEVELS[i])}</span></li>
            ))}
          </ol>
          {me.donated > 0 && <div className="cl-vnote">You've put in {me.donated.toLocaleString()}.</div>}
        </section>

        {rankings}

        <div className="cl-foot">
          {isAdmin && <button className="btn btn-sm" onClick={() => open({ kind: "settings" })}><Icon name="settings" size={16} stroke={2.2} />Club settings</button>}
          <button className="btn btn-sm cl-leave" onClick={() => open({ kind: "leave" })}>Leave club</button>
        </div>
      </>
    );
  }

  return (
    <div className="screen screen-fade scr-narrow cl-screen">
      <header className="home-head">
        <div className="wordmark">Clubs</div>
        <div className="home-chips"><b className="num">{data.chips.toLocaleString()}</b><span>CHIPS</span></div>
      </header>
      {body}

      {sheet && sheet.kind === "create" && (
        <Modal title="Start a club" onClose={close} width={420} stripe="#EDB000" className="cl-sheet">
          <div className="sheet-body" style={{ margin: "-8px 0 14px" }}>Costs {CLUB_COST.toLocaleString()} chips. You'll be the owner.</div>
          <ClubForm cost={CLUB_COST} busy={busy} err={sheetErr || (data.chips < CLUB_COST ? `You need ${CLUB_COST.toLocaleString()} chips. You have ${data.chips.toLocaleString()}.` : null)} submitLabel="Start it"
            onSubmit={(f) => act({ op: "create", ...f }, (r) => { onFounder(); setSheet(null); toast({ title: `${r.club.name} is live`, label: "Send the invite link to your crew" }); })} />
        </Modal>
      )}

      {sheet && sheet.kind === "settings" && club && (
        <Modal title="Club settings" onClose={close} width={420} stripe={clubHex(club.color)} className="cl-sheet">
          <ClubForm start={club} busy={busy} err={sheetErr} submitLabel="Save"
            extra={<button className="cl-link" onClick={() => act({ op: "edit", newCode: true }, () => toast({ title: "New invite code", label: "Old links stop working" }))}>Make a new invite code</button>}
            onSubmit={(f) => act({ op: "edit", ...f }, () => { setSheet(null); toast({ title: "Saved", label: f.name }); })} />
        </Modal>
      )}

      {sheet && sheet.kind === "invite" && club && (
        <Modal title="Invite your crew" onClose={close} width={400} stripe={clubHex(club.color)}>
          <div className="sheet-body" style={{ margin: "-8px 0 14px" }}>{club.open ? "Anyone with the link joins straight in." : "Your club is invite only. The code or link is the only way in."}</div>
          <div className="cl-codebig num" aria-label={`Club code ${club.code}`}>{club.code.split("").map((ch, i) => <span key={i}>{ch}</span>)}</div>
          <div className="cl-linkline">{inviteLink(club).replace(/^https?:\/\//, "")}</div>
          <button className="btn btn-raise big-cta" onClick={() => share(club)}><Icon name="share" size={18} stroke={2.4} style={{ marginRight: 8 }} />Share invite</button>
          <div className="cl-hint" style={{ textAlign: "center", marginTop: 10 }}>{club.members}/{club.cap} spots used</div>
        </Modal>
      )}

      {sheet && sheet.kind === "donate" && club && (
        <Modal title="Club vault" onClose={close} width={400} stripe={clubHex(club.color)}>
          <div className="sheet-body" style={{ margin: "-8px 0 14px" }}>Chips in the vault level up {club.name} for everyone. They don't come back out.</div>
          <div className="cl-steps" role="radiogroup" aria-label="Amount">
            {DONATE_STEPS.map((v) => <button key={v} role="radio" aria-checked={sheet.amount === v} className={`cl-step num${sheet.amount === v ? " on" : ""}`} disabled={busy || data.chips < v} onClick={() => setSheet({ ...sheet, amount: v })}>{kShort(v)}</button>)}
          </div>
          {sheetErr && <div className="auth-err" style={{ marginTop: 12 }}>{sheetErr}</div>}
          <button className="btn btn-raise big-cta" disabled={busy || !sheet.amount || data.chips < sheet.amount} onClick={() => { const v = sheet.amount; act({ op: "donate", amount: v }, (r) => { setSheet({ kind: "donate" }); toast({ title: r.leveled ? `${club.tag} hit level ${r.level}` : `+${v.toLocaleString()} to the vault`, label: r.leveled ? LEVEL_PERKS[r.level - 1] : `${club.name} has ${r.xp.toLocaleString()}` }); }); }}>{busy ? "Putting it in" : sheet.amount ? `Put in ${sheet.amount.toLocaleString()}` : "Pick an amount"}</button>
          <div className="cl-hint" style={{ marginTop: 12 }}>You have {data.chips.toLocaleString()} chips. {CLUB_LEVELS[club.level] ? `${(CLUB_LEVELS[club.level] - club.xp).toLocaleString()} more gets the club to level ${club.level + 1}.` : "Your club is maxed out."}</div>
        </Modal>
      )}

      {sheet && sheet.kind === "leave" && club && (() => {
        const others = mine.members.filter((m) => !account || m.id !== account.id);
        const heir = me.role === "owner" && others.length ? (others.find((m) => m.role === "admin") || others.slice().sort((a, b) => Date.parse(a.joined) - Date.parse(b.joined))[0]) : null;
        return (
          <Modal title={`Leave ${club.tag}?`} onClose={close} width={380} stripe="#F51E1D">
            <p className="sheet-body" style={{ marginTop: -6 }}>{me.role === "owner" ? (heir ? `${heir.name} becomes the owner.` : "You're the last one here, so the club closes for good.") : "You can come back later if there's room."} Chips you put in the vault stay with the club.</p>
            {sheetErr && <div className="auth-err">{sheetErr}</div>}
            <button className="btn big-cta cl-leave" disabled={busy} onClick={() => act({ op: "leave" }, () => { setSheet(null); toast({ title: "You left", label: club.name }); })}>Leave club</button>
          </Modal>
        );
      })()}

      {sheet && sheet.kind === "member" && club && (() => {
        const m = sheet.m; const you = account && m.id === account.id;
        const canKick = !you && (me.role === "owner" || (me.role === "admin" && m.role === "member"));
        const canRole = !you && me.role === "owner";
        return (
          <Modal title="" onClose={close} width={380} stripe={clubHex(club.color)} className="cl-msheet">
            <div className="cl-mtop">
              <ChipAvatar p={m} letter={m.name} size={64} tier={m.placed ? tierForRating(m.rating) : null} live={!you && !!online[m.id]} />
              <div style={{ minWidth: 0 }}>
                <div className="disp cl-mname">{m.name}</div>
                <div className="cl-mline">@{m.username}{ROLE[m.role] && <span className={`cl-role ${m.role}`}>{ROLE[m.role]}</span>}</div>
                {m.title && m.title !== "rookie" && <TitlePill k={m.title} style={{ marginTop: 6 }} />}
              </div>
            </div>
            <div className="cl-stats" style={{ marginTop: 14 }}>
              <div><span className="lbl">This week</span><b className={`num${m.net > 0 ? " up" : m.net < 0 ? " down" : ""}`}>{signed(m.net)}</b></div>
              <div><span className="lbl">Vault</span><b className="num">{kShort(m.donated || 0)}</b></div>
              <div><span className="lbl">Joined</span><b className="num" style={{ fontSize: 18 }}>{m.joined ? new Date(m.joined).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "-"}</b></div>
            </div>
            {!you && <button className="btn big-cta btn-go" onClick={() => { setSheet(null); setProfileId(m.id); }}>Full profile</button>}
            {(canRole || canKick) && (
              <div className="cl-manage">
                {canRole && m.role !== "admin" && <button className="btn btn-sm" disabled={busy} onClick={() => act({ op: "role", user: m.id, role: "admin" }, () => setSheet(null))}>Make admin</button>}
                {canRole && m.role === "admin" && <button className="btn btn-sm" disabled={busy} onClick={() => act({ op: "role", user: m.id, role: "member" }, () => setSheet(null))}>Remove admin</button>}
                {canRole && <button className="btn btn-sm" disabled={busy} onClick={() => (sheet.confirm === "owner" ? act({ op: "role", user: m.id, role: "owner" }, () => { setSheet(null); toast({ title: "New owner", label: `${m.name} runs ${club.tag} now` }); }) : setSheet({ ...sheet, confirm: "owner" }))}>{sheet.confirm === "owner" ? "Tap to confirm" : "Make owner"}</button>}
                {canKick && <button className="btn btn-sm cl-leave" disabled={busy} onClick={() => (sheet.confirm === "kick" ? act({ op: "kick", user: m.id }, () => setSheet(null)) : setSheet({ ...sheet, confirm: "kick" }))}>{sheet.confirm === "kick" ? "Tap to confirm" : "Kick"}</button>}
              </div>
            )}
            {sheetErr && <div className="auth-err" style={{ marginTop: 10 }}>{sheetErr}</div>}
          </Modal>
        );
      })()}

      {sheet && sheet.kind === "view" && <ClubViewSheet id={sheet.id} canJoin={canJoin} busy={busy} err={sheetErr} online={online} onClose={close} onPlayer={(id) => { setSheet(null); setProfileId(id); }} onJoin={(c) => act({ op: "join", id: c.id }, () => { setSheet(null); toast({ title: "You're in", label: `Welcome to ${c.name}` }); })} />}

      {sheet && sheet.kind === "join" && (
        <Modal title="Join a club" onClose={close} width={380} stripe="#EDB000">
          {!account ? (
            <>
              <p className="sheet-body" style={{ marginTop: -6 }}>Make an account first, then you're in.</p>
              <button className="btn btn-raise big-cta" onClick={() => { close(); onOpenAuth("signup"); }}>Create account</button>
            </>
          ) : club ? (
            <p className="sheet-body" style={{ marginTop: -6 }}>You're already in {club.name}. Leave it first if you want to switch.</p>
          ) : (
            <>
              <p className="sheet-body" style={{ marginTop: -6 }}>Club code</p>
              <div className="cl-codebig num">{sheet.code.split("").map((ch, i) => <span key={i}>{ch}</span>)}</div>
              {sheetErr && <div className="auth-err" style={{ marginTop: 12 }}>{sheetErr}</div>}
              <button className="btn btn-raise big-cta" disabled={busy} onClick={() => act({ op: "join", code: sheet.code }, (r) => { close(); toast({ title: "You're in", label: `Welcome to ${r.club.name}` }); })}>{busy ? "Joining" : "Join club"}</button>
            </>
          )}
        </Modal>
      )}

      {profileId && <FriendProfileModal friendId={profileId} online={online} account={account} onClose={() => setProfileId(null)} />}
    </div>
  );
}

// someone else's club, from the rankings
function ClubViewSheet({ id, canJoin, busy, err, online, onClose, onJoin, onPlayer }) {
  const [v, setV] = useState(null);
  useEffect(() => { let on = true; apiPublic("club", { op: "view", id }).then((r) => on && setV(r)).catch((e) => on && setV({ error: e.message })); return () => { on = false; }; }, [id]);
  const c = v && v.club;
  return (
    <Modal title="" onClose={onClose} width={400} stripe={c ? clubHex(c.color) : "#A3A6AD"} className="cl-vsheet">
      {!v ? <div className="empty" style={{ padding: "30px 0" }}>Loading…</div> : !c ? <div className="empty">{v.error || "Couldn't load that club."}</div> : (
        <>
          <div className="cl-top" style={{ marginTop: 4 }}>
            <ClubCrest club={c} size={70} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="disp cl-name">{c.name}</div>
              <div className="cl-meta"><ClubTag club={c} big /><span className="cl-lv">LV {c.level}</span>{!c.open && <span className="cl-priv"><Icon name="lock" size={12} stroke={2.4} />Invite only</span>}</div>
            </div>
          </div>
          {c.about && <p className="cl-about">{c.about}</p>}
          <div className="cl-stats">
            <div><span className="lbl">This week</span><b className={`num${c.score > 0 ? " up" : c.score < 0 ? " down" : ""}`}>{shortSigned(c.score)}</b></div>
            <div><span className="lbl">Rank</span><b className="num">{c.rank ? `#${c.rank}` : "-"}</b></div>
            <div><span className="lbl">Members</span><b className="num">{c.members}<i>/{c.cap}</i></b></div>
          </div>
          <div className="cl-vlist">
            {(v.members || []).slice(0, 8).map((m) => (
              <button key={m.id} className="lb-item tap" onClick={() => onPlayer(m.id)}>
                <ChipAvatar p={m} letter={m.name} size={32} tier={m.placed ? tierForRating(m.rating) : null} live={!!online[m.id]} />
                <span style={{ flex: 1, minWidth: 0 }}><span className="lb-nm"><span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{m.name}</span>{ROLE[m.role] && <span className={`cl-role ${m.role}`}>{ROLE[m.role]}</span>}</span></span>
                <span className={`num cl-score${m.net > 0 ? " up" : m.net < 0 ? " down" : ""}`} style={{ fontFamily: "var(--t-display)", fontWeight: 800, fontSize: 17 }}>{shortSigned(m.net)}</span>
              </button>
            ))}
            {(v.members || []).length > 8 && <div className="lb-empty">and {v.members.length - 8} more</div>}
          </div>
          {err && <div className="auth-err" style={{ marginTop: 10 }}>{err}</div>}
          {canJoin && (c.open ? <button className="btn btn-raise big-cta" disabled={busy || c.members >= c.cap} onClick={() => onJoin(c)}>{c.members >= c.cap ? "Club is full" : busy ? "Joining" : "Join club"}</button>
            : <div className="cl-hint" style={{ textAlign: "center", marginTop: 14 }}>Invite only. Ask a member for the code.</div>)}
        </>
      )}
    </Modal>
  );
}

export { ClubsScreen };
