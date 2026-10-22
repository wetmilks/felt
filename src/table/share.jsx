import { useState, useEffect } from "react";
import { SUIT_GLYPH, rankLabel } from "../game/helpers.js";
import { VARIANTS } from "../game/poker.js";
import { DIAMOND_PATH, LOGO_RED, Modal } from "../ui/primitives.jsx";

// Draws a finished hand as a 1080x1350 image for saving or sharing.
function drawShareImage(hand) {
  const W = 1080, H = 1350;
  const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const g = cv.getContext("2d");
  const sans = "-apple-system, 'Inter', 'Helvetica Neue', Arial, sans-serif";
  const disp = "'Big Shoulders Display', Impact, 'Arial Narrow', sans-serif";
  g.fillStyle = "#111214"; g.fillRect(0, 0, W, H);
  const rr = (x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
  // table
  // a chip-striped rail, like the app
  g.beginPath(); g.ellipse(W / 2, 560, 480, 270, 0, 0, Math.PI * 2); g.fillStyle = "#F51E1D"; g.fill();
  g.save(); g.beginPath(); g.ellipse(W / 2, 560, 469, 259, 0, 0, Math.PI * 2); g.strokeStyle = "#F2F2EE"; g.lineWidth = 22; g.setLineDash([16, 30]); g.stroke(); g.restore();
  g.beginPath(); g.ellipse(W / 2, 560, 458, 248, 0, 0, Math.PI * 2); g.fillStyle = "#111214"; g.fill();
  g.beginPath(); g.ellipse(W / 2, 560, 452, 242, 0, 0, Math.PI * 2);
  const fg = g.createRadialGradient(W / 2, 520, 30, W / 2, 560, 470); fg.addColorStop(0, "#00A963"); fg.addColorStop(0.55, "#008146"); fg.addColorStop(1, "#005D31"); g.fillStyle = fg; g.fill();
  const drawCard = (id, x, y, w, h, faded) => {
    const suit = id.slice(-1), rank = Number(id.slice(0, -1));
    g.save(); g.globalAlpha = faded ? 0.5 : 1;
    g.shadowColor = "rgba(0,0,0,0.35)"; g.shadowBlur = 18; g.shadowOffsetY = 8;
    rr(x, y, w, h, w * 0.12); g.fillStyle = "#F2F2EE"; g.fill();
    g.shadowColor = "transparent";
    g.fillStyle = suit === "h" || suit === "d" ? "#F40028" : "#111214"; g.textAlign = "center";
    g.font = `900 ${Math.round(w * 0.5)}px ${disp}`; g.fillText(rankLabel(rank), x + w / 2, y + h * 0.48);
    g.font = `${Math.round(w * 0.4)}px ${sans}`; g.fillText(SUIT_GLYPH[suit], x + w / 2, y + h * 0.86);
    g.restore();
  };
  const row = (ids, y, w, h, gap) => { const total = ids.length * w + (ids.length - 1) * gap; let x = (W - total) / 2; ids.forEach((id) => { drawCard(id, x, y, w, h); x += w + gap; }); };
  if (hand.board.length) row(hand.board, hand.board2 ? 412 : 468, 126, 176, 16);
  if (hand.board2) row(hand.board2, 602, 92, 128, 12);
  // your cards, below the table
  const hw = hand.hero.length > 2 ? 132 : 168, hh = hand.hero.length > 2 ? 184 : 236;
  row(hand.hero, 868, hw, hh, 20);
  // words
  g.textAlign = "left"; g.fillStyle = "#F2F2EE"; g.font = `700 112px 'Familjen Grotesk Variable', ${sans}`; g.fillText("felt", 70, 150);
  { const wd = g.measureText("felt").width; g.save(); g.translate(70 + wd + 4, 150 - 24); g.scale(0.24, 0.24); g.fillStyle = LOGO_RED; g.fill(new Path2D(DIAMOND_PATH)); g.restore(); }
  g.textAlign = "right"; g.fillStyle = "#A3A6AD"; g.font = `600 30px ${sans}`;
  g.fillText(`${VARIANTS[hand.variant] ? VARIANTS[hand.variant].label : "Hold'em"}, ${new Date(hand.at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`, W - 72, 122);
  g.textAlign = "center";
  const fit = (text, size, weight, color, y) => { let s = size; g.font = `${weight} ${s}px ${sans}`; while (g.measureText(text).width > W - 120 && s > 26) { s -= 2; g.font = `${weight} ${s}px ${sans}`; } g.fillStyle = color; g.fillText(text, W / 2, y); };
  fit(hand.headline, 50, 800, hand.won ? "#00D986" : "#F2F2EE", 1186);
  if (hand.headline2) fit(hand.headline2, 38, 700, "#D7D9DD", 1240);
  else if (hand.heroDesc) fit(`You had ${hand.heroDesc}`, 36, 600, "#BFC2C8", 1240);
  return cv.toDataURL("image/png");
}
function ShareModal({ hand, onClose }) {
  const [url, setUrl] = useState(null);
  useEffect(() => { try { setUrl(drawShareImage(hand)); } catch (e) { setUrl(""); } }, [hand]);
  const share = async () => {
    try {
      const blob = await (await fetch(url)).blob();
      const file = new File([blob], "felt-hand.png", { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: "felt" }); return; }
    } catch (e) { /* fall through to download */ }
    try { const a = document.createElement("a"); a.href = url; a.download = "felt-hand.png"; document.body.appendChild(a); a.click(); a.remove(); } catch (e) { /* press and hold still works */ }
  };
  return (
    <Modal title="Share this hand" onClose={onClose} width={380}>
      {url ? <img src={url} alt={hand.headline} style={{ width: "100%", borderRadius: 14, display: "block" }} />
        : url === "" ? <div className="empty">Couldn't draw the image on this device.</div>
        : <div className="spinner" style={{ margin: "40px auto" }} />}
      <div style={{ fontSize: 12, color: "var(--t-mut)", textAlign: "center", margin: "10px 0 12px" }}>Press and hold the image to save it, or tap Share.</div>
      <button className="btn btn-raise" style={{ width: "100%" }} disabled={!url} onClick={share}>Share</button>
    </Modal>
  );
}

export { ShareModal };
