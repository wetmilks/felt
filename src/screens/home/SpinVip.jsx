import { useState, useRef, useEffect } from "react";
import { HIGH_ROLLER_MIN, SPIN_PRIZES, hoursUntilTomorrow } from "../../game/rewards.jsx";
import { DIAMOND_PATH, FullScreen, Icon, LOGO_RED } from "../../ui/primitives.jsx";

function SpinCard({ ready, onOpen }) {
  return (
    <button className={`spin-row${ready ? " ready" : " used"}`} onClick={onOpen}>
      <span className="spin-wheel" aria-hidden="true" />
      <span style={{ flex: 1, minWidth: 0 }}>
        <span className="ec-title">Daily spin</span>
        <span className="ec-sub">{ready ? "Free spin ready. Jackpot is 5,000" : `Next free spin in ${hoursUntilTomorrow()}h`}</span>
      </span>
      <span className="spin-go">{ready ? "SPIN" : <Icon name="lock" size={15} stroke={2.2} />}</span>
    </button>
  );
}

function SpinModal({ ready, onSpin, onClose, sound }) {
  const [rot, setRot] = useState(0);
  const [result, setResult] = useState(null);
  const [spinning, setSpinning] = useState(false);
  const timers = useRef([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const SEG = 360 / SPIN_PRIZES.length;
  const T = 4.6;
  const go = () => {
    if (!ready || spinning || result) return;
    const out = onSpin();
    if (!out) return;
    const jitter = (Math.random() * 2 - 1) * (SEG / 2 - 6);
    const target = 360 * 6 + (360 - (out.index * SEG + SEG / 2)) + jitter;
    setSpinning(true); setRot(target);
    // a tick each time a slice edge passes the pointer, slowing down with the wheel
    const n = Math.floor(target / SEG);
    for (let k = 1; k <= n; k++) { const t = T * (1 - Math.cbrt(1 - (k * SEG) / target)); if (t < T - 0.05) timers.current.push(setTimeout(() => sound && sound.tick(), t * 1000)); }
    timers.current.push(setTimeout(() => { setSpinning(false); setResult(out); if (sound) out.big ? sound.rankUp() : sound.coin(); }, T * 1000 + 150));
  };
  const close = spinning ? () => {} : onClose;
  const r = 120, cx = 130, cy = 130;
  const pt = (deg, rad) => { const a = ((deg - 90) * Math.PI) / 180; return [cx + rad * Math.cos(a), cy + rad * Math.sin(a)]; };
  const jackpot = SPIN_PRIZES.find((p) => p.sub === "jackpot");
  return (
    <FullScreen label="Daily spin" onClose={close} className="spin-page">
      <div className="fs-top">
        <div>
          <h1 className="fs-title">Daily spin</h1>
          <div className="lbl" style={{ marginTop: 6 }}>One free spin a day</div>
        </div>
        <button className="iconbtn" onClick={close} disabled={spinning} aria-label="Close"><Icon name="close" size={15} stroke={2.4} /></button>
      </div>
      <div className="wheel-wrap">
        <div className="wheel-pointer" aria-hidden="true" />
        <svg viewBox="0 0 260 260" className="wheel" style={{ transform: `rotate(${rot}deg)`, transition: spinning ? `transform ${T}s cubic-bezier(.33,1,.68,1)` : "none" }} role="img" aria-label={`Prize wheel: ${SPIN_PRIZES.map((p) => `${p.label} ${p.sub}`).join(", ")}`}>
          <circle cx={cx} cy={cy} r={r + 7} fill="none" stroke="#2C2F35" strokeWidth="2" />
          <circle cx={cx} cy={cy} r={r + 3} fill="none" stroke="#111214" strokeWidth="6" />
          {SPIN_PRIZES.map((p, i) => {
            const [x1, y1] = pt(i * SEG, r), [x2, y2] = pt((i + 1) * SEG, r);
            const dark = p.sub === "jackpot";
            const mid = i * SEG + SEG / 2;
            return (
              <g key={i}>
                <path d={`M${cx} ${cy} L${x1} ${y1} A${r} ${r} 0 0 1 ${x2} ${y2} Z`} fill={p.color} />
                <g transform={`rotate(${mid} ${cx} ${cy})`}>
                  <text x={cx} y={cy - 76} textAnchor="middle" fontSize={p.label === "?" ? 28 : 25} fontWeight="900" fill={dark ? "#111214" : "#FFFFFF"} fontFamily="'Big Shoulders Display', Impact, sans-serif">{p.label.toUpperCase()}</text>
                  <text x={cx} y={cy - 63} textAnchor="middle" fontSize="9.5" fontWeight="900" letterSpacing="1" fill={dark ? "#111214" : "#FFFFFF"} fontFamily="'Big Shoulders Display', Impact, sans-serif">{p.sub.toUpperCase()}</text>
                </g>
              </g>
            );
          })}
          <circle cx={cx} cy={cy} r={r - 6} fill="none" stroke="#F2F2EE" strokeWidth="12" strokeDasharray="17.4 11.6" />
          <circle cx={cx} cy={cy} r="34" fill="#111214" stroke="var(--t-accent)" strokeWidth="5" strokeDasharray="8.9 6" />
          <text x={cx + 9} y={cy + 6} textAnchor="end" fontSize="21" fontWeight="700" letterSpacing="-1" fill="#F2F2EE" fontFamily="'Familjen Grotesk Variable', -apple-system, sans-serif">felt</text>
          <path transform={`translate(${cx + 10} ${cy + 1}) scale(0.05)`} fill={LOGO_RED} d={DIAMOND_PATH} />
        </svg>
      </div>
      {result ? (
        <div className="spin-result">
          <div className="lbl">{result.big ? "Jackpot" : "You won"}</div>
          <div className="disp">{result.text}</div>
        </div>
      ) : (
        <p className="spin-note">Chips, XP or a mystery prize. The jackpot pays <b className="num">{(jackpot ? jackpot.amount : 5000).toLocaleString()}</b>.</p>
      )}
      <div className="fs-bottom">
        {result ? <button className="btn btn-raise big-cta" onClick={onClose}>Nice</button>
          : <button className="btn btn-raise big-cta" disabled={!ready || spinning} onClick={go}>{spinning ? "Spinning" : ready ? "Spin" : `Back in ${hoursUntilTomorrow()}h`}</button>}
        <div className="fs-foot">Comes back at midnight</div>
      </div>
    </FullScreen>
  );
}

function VipCard({ chips, onOpen }) {
  const unlocked = chips >= HIGH_ROLLER_MIN;
  const pct = Math.min(100, (chips / HIGH_ROLLER_MIN) * 100);
  return (
    <button className="hr-card" onClick={onOpen}>
      <span className="hr-stripe" />
      <span className="hr-body">
        <span className="hr-crest"><Icon name={unlocked ? "crown" : "lock"} size={22} stroke={2} /></span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span className="hr-kicker">MEMBERS ONLY</span>
          <span className="hr-title">HIGH ROLLER ROOM</span>
          <span className="hr-sub num">{unlocked ? "Blinds 250/500 and up. No hand odds." : `Opens at ${HIGH_ROLLER_MIN.toLocaleString()} chips. You're ${Math.floor(pct)}% there.`}</span>
        </span>
        {unlocked && <span className="hr-enter">ENTER</span>}
      </span>
      {!unlocked && <span className="hr-bar"><span style={{ width: `${pct}%` }} /></span>}
    </button>
  );
}

export { SpinCard, SpinModal, VipCard };
