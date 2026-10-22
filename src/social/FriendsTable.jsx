import { useState, useRef, useEffect } from "react";
import { api, cloud } from "../cloud.js";
import { publicProfile } from "../app/boot.jsx";
import { kNum } from "../screens/home/Progress.jsx";
import { ONLINE_STAKES } from "../table/OnlineTable.jsx";
import { Toggle } from "../ui/controls.jsx";
import { Icon, Modal } from "../ui/primitives.jsx";

// Home screen entry: make a table, join one with a code, or get back to one you're sitting at
function FriendsTableCard({ onOpen }) {
  return (
    <button className="edge-card" onClick={onOpen} style={{ "--sc": "#00A560" }}>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span className="ec-title">Play friends</span>
        <span className="ec-sub">Real people, your own table</span>
      </span>
      <Icon name="chevron" size={16} stroke={2.4} style={{ color: "var(--t-mid)", flexShrink: 0 }} />
    </button>
  );
}
function FriendsTableModal({ account, data, onClose, onOpenTable, onOpenAuth, onDebit }) {
  const [stake, setStake] = useState(() => (data.chips >= 2500 ? 2 : data.chips >= 400 ? 1 : 0));
  const [seats, setSeats] = useState(6); const [friendly, setFriendly] = useState(false);
  const [buyIn, setBuyIn] = useState(0); const [code, setCode] = useState(""); const [busy, setBusy] = useState(null);
  const [err, setErr] = useState(null); const [joinErr, setJoinErr] = useState(null); const [codeFocus, setCodeFocus] = useState(false);
  const [mine, setMine] = useState(null);
  const codeRef = useRef(null);
  useEffect(() => { if (!account) return; api("mine").then((r) => setMine(r.tables || [])).catch(() => setMine([])); }, [account]);
  const [sb, bb] = ONLINE_STAKES[stake]; const lo = bb * 20, mid = bb * 50, hi = bb * 100;
  useEffect(() => { setBuyIn(data.chips >= mid ? mid : lo); }, [stake]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!account) {
    return (
      <Modal title="Play friends" onClose={onClose} stripe="#00A560">
        <p className="sheet-body" style={{ marginTop: 0 }}>Make an account so your friends can find you and join your table.</p>
        <button className="btn btn-raise big-cta" onClick={() => { onClose(); onOpenAuth("signup"); }}>Create account</button>
      </Modal>
    );
  }
  const create = async () => {
    setBusy("create"); setErr(null);
    try {
      if (!friendly) await cloud.pushSave(account, data, publicProfile(data));
      const r = await api("create", { sb, bb, friendly, maxSeats: seats, buyIn });
      if (r.debit) onDebit(r.debit);
      onOpenTable(r.tableId);
    } catch (e) { setErr(e.message); }
    setBusy(null);
  };
  const join = async () => {
    if (code.length !== 4 || busy) return;
    setBusy("join"); setJoinErr(null);
    try { const r = await api("join", { code }); onOpenTable(r.tableId); } catch (e) { setJoinErr(e.message); }
    setBusy(null);
  };
  const affordable = friendly || data.chips >= lo;
  return (
    <Modal title="Play friends" onClose={onClose} width={400} stripe="#00A560" className="ft-sheet">
      {(mine || []).map((t) => (
        <div key={t.id} className="ftc ft-mine">
          <span className="ft-dot" />
          <div style={{ flex: 1, minWidth: 0 }}><div className="lbl">You're sitting at</div><div className="disp ft-mine-t num">Table {t.code} · {kNum(t.sb)}/{kNum(t.bb)}</div></div>
          <button className="btn btn-go btn-sm" onClick={() => onOpenTable(t.id)}>Rejoin</button>
        </div>
      ))}
      <section className="ftc">
        <h3 className="ft-h">Join with a code</h3>
        <div className="ft-code">
          <label className="code-boxes">
            <input ref={codeRef} className="code-real" value={code} onChange={(e) => { setJoinErr(null); setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4)); }} onFocus={() => setCodeFocus(true)} onBlur={() => setCodeFocus(false)} onKeyDown={(e) => { if (e.key === "Enter") join(); }} maxLength={4} autoCapitalize="characters" autoCorrect="off" autoComplete="off" spellCheck={false} aria-label="Table code" />
            {[0, 1, 2, 3].map((i) => <span key={i} className={`cbox${codeFocus && i === Math.min(code.length, 3) ? " cur" : ""}`} aria-hidden="true">{code[i] || ""}</span>)}
          </label>
          <button className="btn ft-join" disabled={!!busy || code.length !== 4} onClick={join}>{busy === "join" ? "…" : "Join"}</button>
        </div>
        {joinErr && <div className="auth-err" style={{ marginTop: 10 }}>{joinErr}</div>}
      </section>
      <section className="ftc">
        <h3 className="ft-h">Start a table</h3>
        <div className="ft-sub">Pick the blinds, invite your friends</div>
        <div className="ft-line"><span className="lbl">Blinds</span>
          <div className="ft-opts scroll">{ONLINE_STAKES.map(([s, b], i) => <button key={b} className={`ft-opt num${stake === i ? " on" : ""}`} onClick={() => setStake(i)}>{kNum(s)}/{kNum(b)}</button>)}</div>
        </div>
        <div className="ft-line"><span className="lbl">Seats</span>
          <div className="ft-opts">{[2, 4, 6, 9].map((n) => <button key={n} className={`ft-opt${seats === n ? " on" : ""}`} onClick={() => setSeats(n)}>{n === 2 ? "Heads-up" : n}</button>)}</div>
        </div>
        <div className="ft-friendly">
          <div style={{ flex: 1, minWidth: 0 }}><div className="disp" style={{ fontSize: 19 }}>Friendly table</div><div className="ft-sub" style={{ marginTop: 2 }}>Free chips, nothing on the line</div></div>
          <Toggle on={friendly} onClick={() => setFriendly((f) => !f)} label="Friendly table" />
        </div>
        {!friendly && (
          <div className="ft-line"><span className="lbl">Buy in</span>
            <div className="ft-opts">{[lo, mid, hi].map((v) => <button key={v} className={`ft-opt num${buyIn === v ? " on" : ""}`} disabled={v > data.chips} onClick={() => setBuyIn(v)}>{v.toLocaleString()}</button>)}</div>
          </div>
        )}
        <div className="ft-note" style={!affordable ? { color: "var(--t-bad)" } : undefined}>{friendly ? `Everyone gets ${hi.toLocaleString()} free chips. Bankrolls aren't touched.` : affordable ? "Real chips. Buy in from your bankroll, cash out when you leave." : `You need ${lo.toLocaleString()} chips for these blinds. Pick lower blinds or make it friendly.`}</div>
      </section>
      {err && <div className="auth-err" style={{ marginTop: 10 }}>{err}</div>}
      <button className="btn btn-raise big-cta" disabled={!!busy || !affordable} onClick={create}>{busy === "create" ? "Making it" : "Create table"}</button>
    </Modal>
  );
}

export { FriendsTableCard, FriendsTableModal };
