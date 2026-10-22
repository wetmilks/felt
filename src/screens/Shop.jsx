import { AVATAR_CATALOG } from "../game/helpers.js";
import { CARD_BACKS, CHIP_SETS, FELTS, WIN_FX, defaultCosmetics, ownsCosmetic } from "../game/progression.js";
import { TITLES, defaultTitles, findTitle } from "../game/titles.jsx";
import { useState } from "react";
import { Icon, SHOP_FEATURED, SectionLabel, TitlePill } from "../ui/primitives.jsx";

/* =========================================================================
   SHOP TAB
   ========================================================================= */
function BackSwatch({ b, w = 44 }) {
  return <div className={`back-sw${b.anim ? " holo-anim" : ""}`} style={{ width: w, height: w * 1.4, backgroundColor: b.a, backgroundImage: b.img, backgroundSize: b.size, backgroundPosition: "center", boxShadow: `inset 0 0 0 2px ${b.ring}, inset 0 0 0 3.5px ${b.b}, 0 4px 10px rgba(0,0,0,0.35)` }} />;
}
function FeltSwatch({ f }) {
  return (
    <div className={`felt-sw${f.anim ? " aurora-anim" : ""}`} style={{ backgroundColor: f.c2, backgroundImage: `${f.tex ? `${f.tex}, ` : ""}radial-gradient(ellipse at 50% 40%, ${f.c1} 0%, ${f.c2} 55%, ${f.c3} 100%)`, backgroundSize: f.tex ? `${f.texSize}, 100% 100%` : undefined, borderColor: f.rail }}>
      {f.line && <span className="felt-sw-line" style={{ borderColor: f.line }} />}
    </div>
  );
}
function ChipSetSwatch({ c }) {
  const cols = c.colors ? [c.colors[5000], c.colors[1000], c.colors[500]] : ["#F51E1D", "#196EFE", "#00A560"];
  return <div className="cs-sw">{cols.map((col, i) => <span key={i} style={{ background: col }} />)}</div>;
}
function FxSwatch({ f }) {
  const ic = f.key === "coins" ? <span className="fx-sw-coin" /> : f.key === "fireworks" ? <span className="fx-sw-burst">{Array.from({ length: 8 }).map((_, k) => <i key={k} style={{ transform: `rotate(${k * 45}deg) translateY(-11px)` }} />)}</span> : <span className="fx-sw-conf">{["#FCB600", "#00D596", "#5E9EFF", "#FF6CB3"].map((c, k) => <i key={k} style={{ background: c, transform: `rotate(${k * 35 - 40}deg) translate(${(k - 1.5) * 9}px, ${k % 2 ? -6 : 5}px)` }} />)}</span>;
  return <div className="fx-sw">{ic}</div>;
}
function CosmeticTile({ item, owned, equipped, chips, onBuy, onEquip, children }) {
  const canAfford = item.cost != null && chips >= item.cost;
  const buyable = !owned && !item.pass && !item.prestige;
  const act = equipped ? null : owned ? onEquip : buyable && canAfford ? onBuy : null;
  const st = equipped ? ["eq", "Equipped"] : owned ? ["own", "Owned"] : item.prestige ? ["pres", `Prestige ${item.prestige}`] : item.pass ? ["pass", `Pass lv ${item.pass}`] : [canAfford ? "buy" : "buy poor", item.cost.toLocaleString()];
  return (
    <button className={`sh-tile${equipped ? " on" : ""}`} onClick={act || undefined} disabled={!act} aria-pressed={equipped} aria-label={`${item.label}, ${st[1]}`}>
      <span className="sh-prev">{children}</span>
      <span className="sh-name">{item.label}</span>
      <span className={`sh-st ${st[0]} num`}>{buyable && !equipped && !owned && <i className="sh-dot" />}{st[1]}</span>
    </button>
  );
}

// The Vault: the priciest things in felt. A second tap buys, so nobody drops 250K by accident.
const kShort = (v) => (v >= 1e6 ? `${v / 1e6}M` : `${Math.round(v / 1000)}K`);
function Vault({ data, onBuyCosmetic, onEquipCosmetic, onBuyTitle }) {
  const [arm, setArm] = useState(null);
  const cos = data.cosmetics || defaultCosmetics(); const tt = data.titles || defaultTitles(); const pr = data.ranked.prestige;
  const items = [
    { type: "felt", item: FELTS.find((f) => f.key === "diamond"), kind: "Table felt" },
    { type: "back", item: CARD_BACKS.find((b) => b.key === "platinum"), kind: "Card back" },
    { type: "chipset", item: CHIP_SETS.find((c) => c.key === "diamond"), kind: "Chip set" },
    { type: "back", item: CARD_BACKS.find((b) => b.key === "blackgold"), kind: "Card back" },
    { type: "title", item: TITLES.find((t) => t.key === "millionaire"), kind: "Title" },
  ].filter((v) => v.item);
  return (
    <section className="vault" aria-label="The Vault">
      <div className="vault-head">
        <div><div className="lbl" style={{ color: "#EDB000" }}>For the big stacks</div><div className="disp vault-title">The Vault</div></div>
        <span className="vault-lock" aria-hidden="true"><Icon name="lock" size={22} stroke={2} /></span>
      </div>
      <div className="vault-grid">
        {items.map(({ type, item, kind }) => {
          const field = { felt: "felts", back: "backs", chipset: "chipsets" }[type];
          const owned = type === "title" ? tt.owned.includes(item.key) : ownsCosmetic(cos, field, item, pr);
          const equipped = type === "title" ? tt.equipped === item.key : type === "felt" ? cos.felt === item.key : type === "back" ? cos.cardBack === item.key : (cos.chipset || "classic") === item.key;
          const can = data.chips >= item.cost; const armed = arm === `${type}:${item.key}`;
          const tap = () => {
            if (owned) { if (!equipped && type !== "title") onEquipCosmetic(type, item.key); return; }
            if (!can) return;
            if (!armed) { setArm(`${type}:${item.key}`); return; }
            setArm(null); if (type === "title") onBuyTitle(item); else onBuyCosmetic(type, item);
          };
          const pct = Math.min(100, (data.chips / item.cost) * 100);
          return (
            <button key={`${type}-${item.key}`} className={`vt${equipped ? " on" : ""}${armed ? " armed" : ""}${type === "title" ? " wide" : ""}`} onClick={tap} disabled={!owned && !can} aria-label={`${item.label}, ${owned ? (equipped ? "equipped" : "owned") : `${item.cost.toLocaleString()} chips`}`}>
              <span className="vt-prev">{type === "felt" ? <FeltSwatch f={item} /> : type === "back" ? <BackSwatch b={item} w={46} /> : type === "chipset" ? <ChipSetSwatch c={item} /> : <TitlePill k={item.key} />}</span>
              <span className="vt-kind">{kind}</span>
              <span className="vt-name">{item.label}</span>
              {owned ? <span className="vt-st own">{equipped ? "Equipped" : type === "title" ? "Owned" : "Owned · tap to use"}</span>
                : armed ? <span className="vt-st buy">Tap again to buy</span>
                : can ? <span className="vt-st buy num">{kShort(item.cost)}</span>
                : <span className="vt-need"><span className="vt-bar"><i style={{ width: `${pct}%` }} /></span><span className="num">{kShort(item.cost)}</span></span>}
            </button>
          );
        })}
      </div>
      <div className="vault-note">The rarest gear in felt. No pass, no prestige, just chips.</div>
    </section>
  );
}

function ShopScreen({ data, onClaimChips, onBuyAvatar, onClaimDaily, onBuyCosmetic, onEquipCosmetic, onBuyTitle }) {
  const cos = data.cosmetics || defaultCosmetics();
  const pr = data.ranked.prestige;
  const feat = SHOP_FEATURED.map(([type, key, blurb]) => {
    const item = type === "felt" ? FELTS.find((f) => f.key === key) : CARD_BACKS.find((b) => b.key === key);
    return item ? { type, item, blurb } : null;
  }).find((x) => x && !ownsCosmetic(cos, x.type === "felt" ? "felts" : "backs", x.item, pr));
  const tt = data.titles || defaultTitles();
  return (
    <div className="screen screen-fade scr-mid">
      <header className="home-head">
        <div className="wordmark">Shop</div>
        <div className="home-chips"><b className="num">{data.chips.toLocaleString()}</b><span>CHIPS</span></div>
      </header>

      {feat && (
        <section className="sh-feat">
          <div style={{ flex: 1, minWidth: 0, position: "relative", zIndex: 1 }}>
            <div className="lbl">Featured {feat.type === "felt" ? "felt" : "card back"}</div>
            <div className="disp" style={{ fontSize: 38, marginTop: 4 }}>{feat.item.label}</div>
            <div className="sh-blurb">{feat.blurb}</div>
            <button className="btn btn-go sh-buy num" disabled={data.chips < feat.item.cost} onClick={() => onBuyCosmetic(feat.type, feat.item)}>Buy {feat.item.cost.toLocaleString()}</button>
          </div>
          <div className="sh-feat-art" aria-hidden="true">{feat.type === "felt" ? <div style={{ transform: "scale(1.75)" }}><FeltSwatch f={feat.item} /></div> : <div style={{ transform: "rotate(-8deg)" }}><BackSwatch b={feat.item} w={74} /></div>}</div>
        </section>
      )}

      <Vault data={data} onBuyCosmetic={onBuyCosmetic} onEquipCosmetic={onEquipCosmetic} onBuyTitle={onBuyTitle} />

      <SectionLabel right="Tap to equip">Table felts</SectionLabel>
      <div className="sh-scroll">
        {FELTS.filter((f) => !f.vault).map((f) => (
          <CosmeticTile key={f.key} item={f} owned={ownsCosmetic(cos, "felts", f, pr)} equipped={cos.felt === f.key} chips={data.chips} onBuy={() => onBuyCosmetic("felt", f)} onEquip={() => onEquipCosmetic("felt", f.key)}>
            <FeltSwatch f={f} />
          </CosmeticTile>
        ))}
      </div>

      <SectionLabel right="Tap to equip">Card backs</SectionLabel>
      <div className="sh-scroll">
        {CARD_BACKS.filter((b) => !b.vault).map((b) => (
          <CosmeticTile key={b.key} item={b} owned={ownsCosmetic(cos, "backs", b, pr)} equipped={cos.cardBack === b.key} chips={data.chips} onBuy={() => onBuyCosmetic("back", b)} onEquip={() => onEquipCosmetic("back", b.key)}>
            <BackSwatch b={b} w={50} />
          </CosmeticTile>
        ))}
      </div>

      <SectionLabel right="From the season pass">Chip sets</SectionLabel>
      <div className="sh-grid">
        {CHIP_SETS.filter((c) => !c.vault).map((c) => (
          <CosmeticTile key={c.key} item={c} owned={ownsCosmetic(cos, "chipsets", c, pr)} equipped={(cos.chipset || "classic") === c.key} chips={data.chips} onEquip={() => onEquipCosmetic("chipset", c.key)}>
            <ChipSetSwatch c={c} />
          </CosmeticTile>
        ))}
      </div>

      <SectionLabel right="Plays when you win big">Win effects</SectionLabel>
      <div className="sh-grid">
        {WIN_FX.map((f) => (
          <CosmeticTile key={f.key} item={f} owned={ownsCosmetic(cos, "fxs", f, pr)} equipped={(cos.fx || "confetti") === f.key} chips={data.chips} onEquip={() => onEquipCosmetic("fx", f.key)}>
            <FxSwatch f={f} />
          </CosmeticTile>
        ))}
      </div>

      <SectionLabel right="Shows under your name">Titles</SectionLabel>
      <section className="sh-titles">
        {TITLES.filter((t) => t.cost && !t.vault).map((t) => {
          const owned = tt.owned.includes(t.key); const eq = tt.equipped === t.key; const can = data.chips >= t.cost;
          return (
            <div key={t.key} className="sh-trow">
              <TitlePill k={t.key} />
              <span className="sh-rar">{t.rarity}</span>
              {eq ? <span className="sh-st eq">Equipped</span> : owned ? <span className="sh-st own">Owned</span>
                : <button className="sh-price num" disabled={!can} onClick={() => onBuyTitle(t)} aria-label={`Buy ${findTitle(t.key).label} for ${t.cost.toLocaleString()} chips`}>{t.cost.toLocaleString()}</button>}
            </div>
          );
        })}
      </section>
      <div className="sh-note">More titles are earned by playing. Equip them from your profile.</div>

      <SectionLabel right="Frames come from ranked">Avatars</SectionLabel>
      <div className="sh-scroll sh-avs">
        {AVATAR_CATALOG.map((a) => {
          const owned = data.unlocked.includes(a.emoji); const eq = data.avatar === a.emoji && !data.usePhoto; const can = data.chips >= a.cost;
          return (
            <button key={a.emoji} className={`sh-av${eq ? " on" : ""}`} disabled={owned || !can} onClick={() => onBuyAvatar(a)} aria-label={`${a.emoji} avatar, ${eq ? "yours" : owned ? "owned" : a.cost === 0 ? "free" : `${a.cost} chips`}`}>
              <span className="sh-av-c">{a.emoji}</span>
              <span className={`sh-st ${eq ? "eq" : owned ? "own" : can ? "buy" : "buy poor"} num`}>{eq ? "Yours" : owned ? "Owned" : a.cost === 0 ? "Free" : a.cost.toLocaleString()}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export { BackSwatch, FeltSwatch, FxSwatch, ShopScreen };
