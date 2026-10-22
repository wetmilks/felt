import { useState, useEffect, useMemo } from "react";
import { PLACEMENT_MATCHES, RANKED_BUYIN, RANK_TIERS, UNRANKED, divisionOf, rankName, rankProgress, tierForRating } from "../game/ranked.js";
import { placementFromSkill } from "../game/skill.js";
import { signed } from "./setup.js";
import { ordinal, useCountUp } from "../ui/hooks.js";
import { SkillDial, TierBadge } from "../ui/primitives.jsx";

function PlacementDots({ games, size = 12 }) {
  return (
    <div className="pl-dots">
      {Array.from({ length: PLACEMENT_MATCHES }).map((_, i) => {
        const g = games[i];
        return <span key={i} title={g ? (g.won ? "Win" : "Loss") : "Not played"} className={`pl-dot${g ? (g.won ? " w" : " l") : ""}`} style={{ width: size, height: size, borderWidth: Math.max(2, Math.round(size * 0.16)) }} />;
      })}
    </div>
  );
}

function RankedResults({ result, rankedState, skill, tableLabel, canPlayAgain, onLobby, onAgain, onReview, standings }) {
  const [assess, setAssess] = useState(result.placementFinal ? null : "n/a");
  useEffect(() => {
    if (!result.placementFinal) return;
    // short beat so the reveal lands, then place from the Skill Rating
    const games = [...(rankedState.placementGames || []), { won: result.won }];
    const t = setTimeout(() => setAssess(placementFromSkill(skill, games)), 1800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const extra = assess && assess !== "n/a" ? { placedRating: assess.rating, report: assess.report } : {};
  const ready = !result.placementFinal || (assess && assess !== "n/a");
  const pots = (result.matchHands || []).filter((h) => h && h.potWon).length;
  const tiles = [
    { v: signed(result.net), l: "Chips", c: result.net > 0 ? "var(--t-good)" : result.net < 0 ? "var(--t-bad)" : null },
    { v: result.knockouts || 0, l: "Knockouts" },
    { v: pots, l: "Pots won" },
    { v: result.quality == null ? "–" : `${Math.round(result.quality * 100)}%`, l: "Decisions" },
  ];
  const stats = <div className="rr-stats">{tiles.map((t) => <div key={t.l}><b className="num" style={t.c ? { color: t.c } : undefined}>{t.v}</b><span>{t.l}</span></div>)}</div>;
  const table = standings && standings.length > 1 ? (
    <section className="rr-stand" aria-label="Final standings">
      {standings.map((s, i) => (
        <div key={i} className={`rr-srow${s.me ? " me" : ""}${s.stack <= 0 ? " out" : ""}`}>
          <span className="rr-spl">{ordinal(i + 1)}</span>
          <span className="rr-sname">{s.name}</span>
          {s.stack > 0 ? <b className="num">{s.stack.toLocaleString()}</b> : <i>{s.bust ? `Busted, hand ${s.bust}` : "Busted"}</i>}
        </div>
      ))}
    </section>
  ) : null;
  const buttons = (
    <div className="rr-btns">
      {canPlayAgain ? <button className="btn btn-raise big-cta" disabled={!ready} onClick={() => onAgain(extra)}>{result.placement && !result.placementFinal ? "Next placement" : "Play again"}</button>
        : <div className="rr-need">You need {RANKED_BUYIN.toLocaleString()} chips to queue again.</div>}
      <div className="rr-two">
        <button className="btn" onClick={onReview}>View table</button>
        <button className="btn" disabled={!ready} onClick={() => onLobby(extra)}>Lobby</button>
      </div>
    </div>
  );
  const top = (kicker) => <div className="rr-top"><span className="lbl">{kicker}</span><span className="num">{result.hands} hand{result.hands === 1 ? "" : "s"}</span></div>;
  const placeBig = result.forfeit ? "Left" : ordinal(result.place || 1);
  const placeSub = result.forfeit ? "the match early" : result.cleared ? "Cleared the table" : `of ${result.field || 2} players`;
  const head = (right) => (
    <div className="rr-head">
      <div style={{ minWidth: 0 }}><div className="rr-place">{placeBig}</div><div className="rr-of">{placeSub}</div></div>
      {right}
    </div>
  );

  if (result.placementFinal) {
    const games = [...(rankedState.placementGames || []), { won: result.won }];
    if (!ready) {
      return (
        <div className="results rr" role="dialog" aria-label="Placement">
          <div className="results-inner rr-wait">
            <TierBadge tier={UNRANKED} size={110} />
            <div className="disp" style={{ fontSize: 34, marginTop: 22 }}>Reading your game</div>
            <div className="rr-small" style={{ marginTop: 8, textAlign: "center" }}>Scoring your decisions, preflop play, aggression, showdowns and more</div>
            <div className="spinner" style={{ width: 28, height: 28, marginTop: 22 }} aria-hidden="true" />
          </div>
        </div>
      );
    }
    const tier = tierForRating(assess.rating);
    return (
      <div className="results rr" role="dialog" aria-label="Placement result">
        <div className="results-inner">
          {top("Placements complete")}
          <div className="rr-placed">
            <div className="badge-pop"><TierBadge tier={tier} size={128} div={divisionOf(assess.rating)} /></div>
            <div className="lbl" style={{ marginTop: 18 }}>You placed</div>
            <div className="rr-rank big" style={{ color: tier.color }}>{rankName(assess.rating)}</div>
            <div className="rr-small num">{assess.rating.toLocaleString()} RP</div>
            <div style={{ marginTop: 12 }}><PlacementDots games={games} size={16} /></div>
          </div>
          {assess.sk && (
            <section className="rr-card rr-skill">
              <SkillDial sr={assess.sk.sr} size={58} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="lbl">Skill rating</div>
                <div className="disp" style={{ fontSize: 24, marginTop: 2 }}>{assess.sk.label} <span className="num" style={{ color: "var(--t-mid)", fontSize: 18 }}>±{assess.sk.margin}</span></div>
                <div className="rr-small" style={{ marginTop: 2 }}>Full breakdown in the Coach tab.</div>
              </div>
            </section>
          )}
          <section className="rr-card rr-body">
            <h3 className="rr-h">Scouting report</h3>
            <p className="rr-report">{assess.report}</p>
          </section>
          {stats}
          {buttons}
        </div>
      </div>
    );
  }

  if (result.placement) {
    const games = [...(rankedState.placementGames || []), { won: result.won }];
    const left = PLACEMENT_MATCHES - games.length;
    return (
      <div className="results rr" role="dialog" aria-label="Placement match result">
        <div className="results-inner">
          {top(`Placement ${result.placementNumber} of ${PLACEMENT_MATCHES}${tableLabel ? ` · ${tableLabel}` : ""}`)}
          {head(<div className="rr-rp" style={{ color: result.won ? "var(--t-good)" : "var(--t-bad)" }}><b>{result.won ? "Win" : "Loss"}</b><span>Placement</span></div>)}
          <section className="rr-card">
            <div className="stripe thin" style={{ "--sc": "#A3A6AD" }} />
            <div className="rr-body">
              <div className="lbl">Placements</div>
              <div style={{ margin: "12px 0 10px" }}><PlacementDots games={games} size={18} /></div>
              <div className="rr-small">{left > 0 ? `${left} more to go. ` : ""}Your rank comes from how you play, not just whether you win.</div>
            </div>
          </section>
          {stats}
          {table}
          {buttons}
        </div>
      </div>
    );
  }

  return <RatedResults result={result} top={top(`Ranked · match over${tableLabel ? ` · ${tableLabel}` : ""}`)} head={head} stats={stats} table={table} buttons={buttons} />;
}

function RatedResults({ result, top, head, stats, table, buttons }) {
  const shown = useCountUp(result.before, result.after);
  const tierBefore = tierForRating(result.before), tierAfter = tierForRating(result.after);
  const moved = RANK_TIERS.indexOf(tierAfter) - RANK_TIERS.indexOf(tierBefore);
  const divMoved = rankName(result.after) !== rankName(result.before);
  const tierNow = tierForRating(shown);
  const prog = rankProgress(shown);
  const frameUnlocked = result.newFrames.length > 0 ? RANK_TIERS.find((t) => t.key === result.newFrames[result.newFrames.length - 1]) : null;
  const up = result.after > result.before, down = result.after < result.before;
  const status = divMoved && up ? (moved > 0 ? "Promoted" : "Moved up") : divMoved && down ? "Dropped" : "Your rank";
  const on = prog.nextLabel ? Math.round(prog.pct * 10) : 10;
  return (
    <div className="results rr" role="dialog" aria-label="Match results">
      <div className="results-inner">
        {top}
        {head(<div className="rr-rp" style={{ color: result.delta >= 0 ? "var(--t-good)" : "var(--t-bad)" }}><b className="num">{signed(result.delta)}</b><span>Rank points</span></div>)}
        <section className="rr-card">
          <div className="stripe" style={{ "--sc": tierNow.color }} />
          <div className="rr-body">
            <div className="rr-row1"><span className="lbl" style={{ color: divMoved && down ? "var(--t-bad)" : tierNow.color }}>{status}</span><span className="num">{result.before.toLocaleString()} to {result.after.toLocaleString()} RP</span></div>
            <div className="rr-rank" style={{ color: tierNow.color }}>{rankName(shown)}</div>
            <div className="rk-segs">{Array.from({ length: 10 }, (_, i) => <span key={i} style={i < on ? { background: tierNow.color } : undefined} />)}</div>
            <div className="rr-small" style={{ marginTop: 10 }}>{prog.nextLabel ? `${prog.toNext} more to reach ${prog.nextLabel}` : "Top of the ladder"}</div>
            {frameUnlocked && <div className="rr-unlock" style={{ "--lc": frameUnlocked.color }}><TierBadge tier={frameUnlocked} size={26} />{frameUnlocked.label} avatar frame unlocked. Equip it from your profile.</div>}
            <div className="rr-lines">
              {result.lines.map((l) => (<div key={l.label}><span>{l.label}</span><b className="num" style={{ color: l.value >= 0 ? "var(--t-good)" : "var(--t-bad)" }}>{signed(l.value)}</b></div>))}
            </div>
          </div>
        </section>
        {stats}
        {table}
        {buttons}
      </div>
    </div>
  );
}

function Confetti() {
  const pieces = useMemo(() => Array.from({ length: 28 }).map((_, i) => ({
    id: i, left: 8 + Math.random() * 84, delay: Math.random() * 0.25, dur: 1.1 + Math.random() * 0.6,
    rot: Math.random() * 540, drift: (Math.random() - 0.5) * 140, color: ["var(--t-accent)", "var(--t-text)", "var(--t-good)", "#5E9EFF"][i % 4], w: 5 + Math.random() * 4,
  })), []);
  return (
    <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, pointerEvents: "none", overflow: "hidden", zIndex: 20 }}>
      {pieces.map((p) => (
        <div key={p.id} style={{ position: "absolute", top: "38%", left: `${p.left}%`, width: p.w, height: p.w * 1.6, borderRadius: 1.5, background: p.color, "--drift": `${p.drift}px`, "--rot": `${p.rot}deg`, animation: `confettiFall ${p.dur}s ease-in ${p.delay}s forwards` }} />
      ))}
    </div>
  );
}

// Win effects from the season pass. Confetti is the default.
function CoinRain() {
  const coins = useMemo(() => Array.from({ length: 26 }).map((_, i) => ({ id: i, left: 4 + Math.random() * 92, delay: Math.random() * 0.45, dur: 1.15 + Math.random() * 0.6, size: 14 + Math.random() * 10, spin: 0.35 + Math.random() * 0.4 })), []);
  return (
    <div className="fx-layer" aria-hidden="true">
      {coins.map((c) => <div key={c.id} className="fx-coin" style={{ left: `${c.left}%`, width: c.size, height: c.size, animation: `coinFall ${c.dur}s cubic-bezier(.35,.1,.7,1) ${c.delay}s forwards`, "--spin": `${c.spin}s` }}><i /></div>)}
    </div>
  );
}
function Fireworks() {
  const bursts = useMemo(() => [0, 1, 2].map((b) => ({ id: b, x: 18 + Math.random() * 64, y: 18 + Math.random() * 30, delay: b * 0.32, hue: ["#FCB600", "#FF6CB3", "#58CEFF", "#79FFA6"][Math.floor(Math.random() * 4)] })), []);
  return (
    <div className="fx-layer" aria-hidden="true">
      {bursts.map((b) => (
        <div key={b.id} className="fx-burst" style={{ left: `${b.x}%`, top: `${b.y}%` }}>
          {Array.from({ length: 16 }).map((_, k) => { const a = (k / 16) * Math.PI * 2; const r = 60 + (k % 3) * 14; return <i key={k} style={{ background: b.hue, boxShadow: `0 0 6px ${b.hue}`, "--dx": `${Math.cos(a) * r}px`, "--dy": `${Math.sin(a) * r}px`, animation: `burstOut 1.1s cubic-bezier(.15,.7,.3,1) ${b.delay}s both` }} />; })}
        </div>
      ))}
    </div>
  );
}

export { CoinRain, Confetti, Fireworks, RankedResults };
