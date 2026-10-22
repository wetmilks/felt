import { Icon } from "./primitives.jsx";

// Get felt on the home screen like a real app, then let it ping you
function InstallCard({ onDismiss, prompt }) {
  return (
    <div className="app-card">
      <img src="/icon-192.png" alt="" className="app-card-ic" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 750 }}>Get the felt app</div>
        <div style={{ fontSize: 11.5, color: "var(--t-sub)", marginTop: 2, lineHeight: 1.4 }}>{prompt ? "Full screen, one tap from your home screen, and notifications." : <>Tap <span className="share-ic"><Icon name="share" size={11} stroke={2.4} /></span> then <b>Add to Home Screen</b>. Full screen, plus notifications.</>}</div>
      </div>
      {prompt && <button className="btn btn-sm btn-raise" onClick={prompt}>Install</button>}
      <button className="iconbtn" onClick={onDismiss} aria-label="Not now"><Icon name="close" size={12} /></button>
    </div>
  );
}
function NotifyCard({ onEnable, onDismiss, busy }) {
  return (
    <div className="app-card notify">
      <div className="app-card-ic bell"><Icon name="flame" size={18} stroke={2} /></div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 750 }}>Turn on notifications</div>
        <div style={{ fontSize: 11.5, color: "var(--t-sub)", marginTop: 2 }}>Know when a friend invites you and when it's your turn.</div>
      </div>
      <button className="btn btn-sm btn-raise" disabled={busy} onClick={onEnable}>{busy ? "…" : "Turn on"}</button>
      <button className="iconbtn" onClick={onDismiss} aria-label="Not now"><Icon name="close" size={12} /></button>
    </div>
  );
}

export { InstallCard, NotifyCard };
