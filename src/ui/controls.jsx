function SettingRow({ label, sub, children }) {
  return (
    <div className="set-row">
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14.5, fontWeight: 600 }}>{label}</div>
        {sub && <div style={{ fontSize: 12, color: "var(--t-mid)", marginTop: 1 }}>{sub}</div>}
      </div>
      {children}
    </div>
  );
}
function Toggle({ on, onClick, label }) {
  return (
    <button onClick={onClick} role="switch" aria-checked={on} aria-label={label} style={{ width: 50, height: 30, borderRadius: 15, border: "none", background: on ? "var(--t-accent)" : "var(--t-track)", position: "relative", cursor: "pointer", transition: "background .2s ease", flexShrink: 0 }}>
      <div style={{ position: "absolute", top: 3, left: on ? 23 : 3, width: 24, height: 24, borderRadius: "50%", background: on ? "#111214" : "var(--t-mid)", transition: "left .2s ease, background .2s ease" }} />
    </button>
  );
}
function SegToggle({ options, value, onChange }) {
  return (
    <div className="seg" style={{ flexShrink: 0 }}>
      {options.map((o) => (
        <button key={o.v} onClick={() => onChange(o.v)} className={`segbtn${value === o.v ? " on" : ""}`} style={{ padding: "6px 10px" }}>{o.l}</button>
      ))}
    </div>
  );
}
function StatCard({ label, value, color }) {
  return (
    <div className="stat">
      <div className="lbl">{label}</div>
      <div className="disp num" style={{ fontSize: 32, marginTop: 4, color: color || "var(--t-text)" }}>{value}</div>
    </div>
  );
}

export { SegToggle, SettingRow, StatCard, Toggle };
