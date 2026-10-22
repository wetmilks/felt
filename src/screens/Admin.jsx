import { useState, useEffect } from "react";
import { api, cleanUsername } from "../cloud.js";
import { rankName } from "../game/ranked.js";
import { timeAgo } from "../social/Friends.jsx";
import { SettingRow, Toggle } from "../ui/controls.jsx";
import { Modal, shortNum } from "../ui/primitives.jsx";
import { ClubTag } from "../ui/ClubTag.jsx";

// Only shows for accounts on the server's admin list, and the server checks again on every action.
function AdminModal({ onClose }) {
  const [tab, setTab] = useState("chips");
  const [username, setUsername] = useState(""); const [amount, setAmount] = useState(10000); const [note, setNote] = useState(""); const [everyone, setEveryone] = useState(false);
  const [player, setPlayer] = useState(null); const [msg, setMsg] = useState(null); const [busy, setBusy] = useState(false); const [tables, setTables] = useState(null);
  const [errors, setErrors] = useState(null); const [openErr, setOpenErr] = useState(null);
  const [clubs, setClubs] = useState(null); const [dropArm, setDropArm] = useState(null);
  const run = async (fn) => { setBusy(true); setMsg(null); try { await fn(); } catch (e) { setMsg({ ok: false, text: e.message }); } setBusy(false); };
  const lookup = () => run(async () => { const r = await api("admin", { op: "lookup", username }); setPlayer(r.player); });
  const give = (sign) => run(async () => {
    const amt = Math.abs(Math.trunc(Number(amount) || 0)) * sign;
    const r = await api("admin", { op: "give", amount: amt, note, everyone, username });
    setMsg({ ok: true, text: everyone ? `${amt > 0 ? "Sent" : "Took"} ${Math.abs(amt).toLocaleString()} ${amt > 0 ? "to" : "from"} ${r.count} players.` : `${amt > 0 ? "Sent" : "Took"} ${Math.abs(amt).toLocaleString()} chips ${amt > 0 ? "to" : "from"} @${r.player}. Lands within a minute.` });
  });
  const loadTables = () => run(async () => { const r = await api("admin", { op: "tables" }); setTables(r.tables); });
  const loadErrors = () => run(async () => { const r = await api("admin", { op: "errors" }); setErrors(r.errors); });
  const loadClubs = () => run(async () => { const r = await api("admin", { op: "clubs" }); setClubs(r.clubs); });
  useEffect(() => { if (tab === "tables" && tables === null) loadTables(); if (tab === "errors" && errors === null) loadErrors(); if (tab === "clubs" && clubs === null) loadClubs(); }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Modal title="Admin" onClose={onClose} width={400}>
      <div className="seg" style={{ marginBottom: 12 }}>
        <button className={`segbtn${tab === "chips" ? " on" : ""}`} onClick={() => setTab("chips")}>Chips</button>
        <button className={`segbtn${tab === "player" ? " on" : ""}`} onClick={() => setTab("player")}>Look up</button>
        <button className={`segbtn${tab === "tables" ? " on" : ""}`} onClick={() => setTab("tables")}>Tables</button>
        <button className={`segbtn${tab === "errors" ? " on" : ""}`} onClick={() => setTab("errors")}>Errors</button>
        <button className={`segbtn${tab === "clubs" ? " on" : ""}`} onClick={() => setTab("clubs")}>Clubs</button>
      </div>
      {tab === "chips" && (<div className="auth-form">
        <SettingRow label="Everyone" sub="Send to every player with an account"><Toggle on={everyone} onClick={() => setEveryone((x) => !x)} label="Everyone" /></SettingRow>
        {!everyone && <div className="auth-at"><b>@</b><input className="input" value={username} onChange={(e) => setUsername(cleanUsername(e.target.value))} placeholder="username" autoCapitalize="none" autoCorrect="off" aria-label="Username" /></div>}
        <div className="stake-grid">{[1000, 10000, 100000, 1000000].map((v) => <button key={v} className={`stake-btn${Number(amount) === v ? " on" : ""}`} onClick={() => setAmount(v)}>{shortNum(v)}</button>)}</div>
        <input className="input num" type="number" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} aria-label="Amount" />
        <input className="input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={60} placeholder="Note they'll see (optional)" aria-label="Note" />
        {msg && <div className={msg.ok ? "friend-msg ok" : "auth-err"}>{msg.text}</div>}
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" disabled={busy || (!everyone && username.length < 3)} onClick={() => give(-1)}>Take</button>
          <button className="btn btn-raise" disabled={busy || (!everyone && username.length < 3)} onClick={() => give(1)}>{busy ? "…" : "Send chips"}</button>
        </div>
      </div>)}
      {tab === "player" && (<div className="auth-form">
        <div style={{ display: "flex", gap: 8 }}>
          <div className="auth-at" style={{ flex: 1 }}><b>@</b><input className="input" value={username} onChange={(e) => setUsername(cleanUsername(e.target.value))} placeholder="username" autoCapitalize="none" aria-label="Username" /></div>
          <button className="btn btn-sm" disabled={busy || username.length < 3} onClick={lookup}>Find</button>
        </div>
        {msg && !msg.ok && <div className="auth-err">{msg.text}</div>}
        {player && (
          <div className="fp-stats" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
            <div><b>{player.display_name}</b><span>@{player.username}</span></div>
            <div><b className="num">{player.chips == null ? "no save" : player.chips.toLocaleString()}</b><span>Chips</span></div>
            <div><b>{player.placed ? rankName(player.rating) : "Unranked"}</b><span>{player.placed ? `${player.rating} RP` : "Rank"}</span></div>
            <div><b className="num">{player.prestige || 0}</b><span>Prestige</span></div>
          </div>
        )}
      </div>)}
      {tab === "tables" && (<div>
        {msg && !msg.ok && <div className="auth-err" style={{ marginBottom: 8 }}>{msg.text}</div>}
        {tables === null ? <div className="empty">Loading…</div> : tables.length === 0 ? <div className="empty">No open tables.</div> : (
          <div className="list" style={{ gap: 6, maxHeight: "50vh", overflowY: "auto" }}>
            {tables.map((t) => (
              <div key={t.id} className="friend-row">
                <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13.5, fontWeight: 700 }}>{t.code} <span className="num" style={{ fontWeight: 500, color: "var(--t-mut)" }}>{t.sb}/{t.bb}{t.friendly ? " · friendly" : ""}</span></div><div style={{ fontSize: 11, color: "var(--t-mut)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.players.length ? t.players.join(", ") : "Empty"} · {timeAgo(new Date(t.updated_at).getTime())}</div></div>
                <button className="btn btn-sm" disabled={busy} onClick={() => run(async () => { await api("admin", { op: "close", tableId: t.id }); setTables((l) => l.filter((x) => x.id !== t.id)); })}>Close</button>
              </div>
            ))}
          </div>
        )}
        <div style={{ fontSize: 11, color: "var(--t-faint)", marginTop: 10 }}>Closing a table sends everyone's chips back to them.</div>
      </div>)}
      {tab === "errors" && (<div>
        {msg && !msg.ok && <div className="auth-err" style={{ marginBottom: 8 }}>{msg.text}</div>}
        {errors === null ? <div className="empty">Loading…</div> : errors.length === 0 ? <div className="empty">No errors reported. Nice.</div> : (
          <div className="err-list">
            {errors.map((e) => (
              <button key={e.sig} className="err-row" onClick={() => setOpenErr(openErr === e.sig ? null : e.sig)} aria-expanded={openErr === e.sig}>
                <span className="err-top"><b>{e.message}</b><i className="num">{e.count}×</i></span>
                <span className="err-meta">{e.where || "somewhere"} · {timeAgo(e.last)} · {e.build || "?"}{e.users && e.users.length ? ` · ${e.users.map((u) => `@${u}`).join(", ")}` : " · guest"}</span>
                {openErr === e.sig && <pre className="err-stack">{e.stack}{"\n\n"}{e.ua}{e.url ? `\n${e.url}` : ""}</pre>}
              </button>
            ))}
          </div>
        )}
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button className="btn" disabled={busy} onClick={loadErrors}>Refresh</button>
          <button className="btn" disabled={busy || !errors || errors.length === 0} onClick={() => run(async () => { await api("admin", { op: "clearErrors" }); setErrors([]); })}>Clear all</button>
        </div>
        <div style={{ fontSize: 11, color: "var(--t-faint)", marginTop: 10 }}>Crashes and errors from everyone's phones, newest first. The same error counts up instead of repeating.</div>
      </div>)}
      {tab === "clubs" && (<div>
        {msg && !msg.ok && <div className="auth-err" style={{ marginBottom: 8 }}>{msg.text}</div>}
        {clubs === null ? <div className="empty">Loading…</div> : clubs.length === 0 ? <div className="empty">No clubs yet.</div> : (
          <div className="list" style={{ gap: 6, maxHeight: "50vh", overflowY: "auto" }}>
            {clubs.map((c) => (
              <div key={c.id} className="friend-row">
                <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13.5, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>{c.name}<ClubTag club={c} /></div><div className="num" style={{ fontSize: 11, color: "var(--t-mut)" }}>{c.members} members · {shortNum(c.xp)} in the vault</div></div>
                <button className="btn btn-sm" disabled={busy} onClick={() => (dropArm === c.id ? run(async () => { await api("admin", { op: "dropClub", id: c.id }); setClubs((l) => l.filter((x) => x.id !== c.id)); setDropArm(null); }) : setDropArm(c.id))}>{dropArm === c.id ? "Sure?" : "Delete"}</button>
              </div>
            ))}
          </div>
        )}
        <div style={{ fontSize: 11, color: "var(--t-faint)", marginTop: 10 }}>Deleting a club kicks everyone and wipes its vault. Use it for bad names.</div>
      </div>)}
    </Modal>
  );
}

export { AdminModal };
