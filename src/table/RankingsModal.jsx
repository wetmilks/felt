import { SUIT_COLOR } from "../game/helpers.js";
import { RANKING_REFERENCE } from "../game/poker.js";
import { CoinRain, Confetti, Fireworks } from "./Results.jsx";
import { MiniCard, Modal } from "../ui/primitives.jsx";

function WinFx({ kind }) { return kind === "coins" ? <CoinRain /> : kind === "fireworks" ? <Fireworks /> : <Confetti />; }

function RankingsModal({ onClose, suitColor = SUIT_COLOR, variant = "holdem" }) {
  return (
    <Modal title="Hand rankings" onClose={onClose} width={400}>
      <div style={{ fontSize: 12, color: "var(--t-mut)", margin: "-6px 2px 8px" }}>Strongest first. Faded cards are kickers and only break ties.</div>
      {variant === "short" && <div className="tip" style={{ color: "var(--t-accent)", borderColor: "rgba(252,182,0,0.35)", background: "rgba(252,182,0,0.08)", marginTop: 4 }}><span>Short Deck changes two things: a flush beats a full house, and three of a kind beats a straight. A-6-7-8-9 is the lowest straight.</span></div>}
      {variant === "omaha" && <div className="tip" style={{ color: "var(--t-accent)", borderColor: "rgba(252,182,0,0.35)", background: "rgba(252,182,0,0.08)", marginTop: 4 }}><span>Omaha: your hand must use exactly 2 of your 4 cards plus 3 from the board.</span></div>}
      <div style={{ maxHeight: "62vh", overflowY: "auto", margin: "0 -4px" }}>
        {RANKING_REFERENCE.map((r, i) => (
          <div key={r.name} className="rank-row">
            <div className="rank-num num">{i + 1}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>{r.name}</div>
              <div style={{ fontSize: 11.5, color: "var(--t-mut)", marginTop: 1 }}>{r.desc}</div>
            </div>
            <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
              {r.cards.map((c, j) => <MiniCard key={c} code={c} suitColor={suitColor} dim={j >= r.uses} />)}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}

export { RankingsModal, WinFx };
