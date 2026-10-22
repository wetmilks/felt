import { useState } from "react";
import { computeSkill, defaultSkill, pctStr, skillReport, tournamentIndex, tourneyPoints } from "../game/skill.js";
import { ordinal } from "../ui/hooks.js";
import { SectionLabel, SkillDial } from "../ui/primitives.jsx";

/* =========================================================================
   COACH TAB
   ========================================================================= */
function CoachScreen({ data }) {
  const k = data.skill || defaultSkill();
  const sk = computeSkill(k);
  const need = 10;
  const [open, setOpen] = useState(null);
  const recent = (k.recentQ || []).slice(0, 20).reverse();
  const tourneys = (k.tourneys || []).map((r) => ({ ...r, pts: Math.round(tourneyPoints(r)) })).sort((a, b) => b.at - a.at);
  const idx = tournamentIndex(k.tourneys);
  const scoreColor = (x) => (x >= 70 ? "var(--t-good)" : x >= 45 ? "var(--t-accent)" : "var(--t-bad)");
  const barColor = (x) => (x >= 70 ? "var(--c-green)" : x >= 45 ? "var(--t-accent)" : "var(--c-red)");
  if (!sk || k.hands < need) {
    return (
      <div className="screen screen-fade scr-narrow">
        <header className="home-head"><div className="wordmark">Coach</div></header>
        <section className="co-card co-hero">
          <SkillDial sr={k.hands} max={need} size={118} color="var(--t-accent)" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="lbl">Skill rating</div>
            <div className="disp" style={{ fontSize: 30, marginTop: 4 }}>Play a few hands</div>
            <div className="co-sub">It needs {need} hands to start. Then it scores eight things, from decisions against the odds to composure.</div>
          </div>
        </section>
      </div>
    );
  }
  const comps = sk.comps.slice().sort((a, b) => b.weight - a.weight);
  return (
    <div className="screen screen-fade scr-wide">
      <header className="home-head"><div className="wordmark">Coach</div></header>

      <div className="co-cols">
      <div className="co-col">
      <section className="co-card co-hero" style={{ order: 1 }}>
        <SkillDial sr={sk.sr} size={118} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="lbl">Skill rating</div>
          <div className="disp" style={{ fontSize: 32, color: scoreColor(sk.sr), marginTop: 4 }}>{sk.label}</div>
          <div className="co-sub num">Plus or minus {sk.margin}, from {k.hands.toLocaleString()} hands. The margin shrinks as you play.</div>
        </div>
      </section>

      <section className="co-card" style={{ order: 2 }}>
        <h2 className="co-h">Scouting report</h2>
        <p className="co-report">{skillReport(sk)}</p>
      </section>

      {recent.length > 1 && (
        <section className="co-card" style={{ order: 4 }}>
          <div className="co-headrow"><h2 className="co-h">Last {recent.length} hands</h2><span>Newest on the right</span></div>
          <div className="co-bars" aria-label="Decision quality by hand, oldest to newest">
            {recent.map((q, i) => <span key={i} title={pctStr(q)} style={{ height: `${Math.max(12, q * 100)}%`, background: q >= 0.7 ? "var(--c-green)" : q >= 0.5 ? "#4A4D55" : "var(--c-red)" }} />)}
          </div>
          <div className="co-legend"><span><i style={{ background: "var(--c-green)" }} />Good</span><span><i style={{ background: "#4A4D55" }} />Okay</span><span><i style={{ background: "var(--c-red)" }} />Leak</span></div>
        </section>
      )}

      </div>
      <div className="co-col">
      <div style={{ order: 3 }}>
      <SectionLabel right="Score out of 100">Breakdown</SectionLabel>
      <section className="co-card co-list">
        {comps.map((c) => {
          const leak = c.enough && c.score < 45;
          const show = leak || open === c.key;
          return (
            <button key={c.key} className="co-row" onClick={() => setOpen(open === c.key ? null : c.key)} aria-expanded={show} style={{ opacity: c.enough ? 1 : 0.6 }}>
              <span className="co-top"><span className="co-name">{c.label} <i>{Math.round(c.weight * 100)}%</i></span><b className="num" style={{ color: c.enough ? scoreColor(c.score) : "var(--t-mid)" }}>{c.enough ? c.score : "–"}</b></span>
              <span className="co-bar"><span style={{ width: `${c.enough ? c.score : 0}%`, background: barColor(c.score) }} /></span>
              {show && <span className="co-detail">{c.detail}</span>}
            </button>
          );
        })}
      </section>

      </div>
      <div style={{ order: 5 }}>
      <SectionLabel right={<b className="co-pts num">{idx.toLocaleString()} pts</b>}>Tournament index</SectionLabel>
      <section className="co-card co-list">
        {tourneys.length === 0 ? (
          <p className="co-sub" style={{ margin: "12px 0" }}>Works like the Global Poker Index. Each cash scores buy-in size times how deep you went against the field, then fades as it ages. Your best 8 count.</p>
        ) : tourneys.slice(0, 6).map((r, i) => (
          <div key={r.at + "-" + i} className="co-trow">
            <span className="co-place" style={{ color: r.pts > 0 ? "var(--t-text)" : "var(--t-mid)" }}>{ordinal(r.place)}</span>
            <span className="co-tmeta num">of {r.field}, {r.buyIn ? `${r.buyIn.toLocaleString()} buy-in` : "freeroll"} <i>{new Date(r.at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</i></span>
            <b className="num" style={{ color: r.pts > 0 ? "var(--t-good)" : "var(--t-mid)" }}>{r.pts > 0 ? `+${r.pts}` : "0"}</b>
          </div>
        ))}
      </section>
      </div>
      </div>
      </div>
      <div className="co-foot">Every decision is graded against your real odds at that moment. All-in pots count the equity you had when the chips went in, so bad beats don't hurt your rating and lucky rivers don't help it. Only paid tournament finishes score, and they fade after a week.</div>
    </div>
  );
}

export { CoachScreen };
