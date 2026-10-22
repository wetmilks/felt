const CHIP_STACK_CSS = `
/* =====================================================================
   CHIP STACK: the one felt look. Near black, chip colors, condensed caps,
   and the striped edge of a poker chip on anything that matters.
   ===================================================================== */
:root { --t-bg: #111214; --t-panel: #1C1E22; --t-raise: #24262B; --t-panel2: #2A2C31; --t-track: #2C2F35; --t-text: #F2F2EE; --t-text2: #D7D9DD; --t-sub: #BFC2C8; --t-mid: #A3A6AD; --t-mut: #9A9DA4; --t-faint: #868A91; --t-accent: #EDB000; --t-good: #00D986; --t-bad: #FF584D; --t-display: 'Big Shoulders Display', 'Arial Narrow', Impact, sans-serif; --t-body: 'Familjen Grotesk Variable', 'Familjen Grotesk', -apple-system, system-ui, sans-serif; --c-red: #F51E1D; --c-blue: #196EFE; --c-green: #00A560; --c-gold: #EDB000; --c-white: #F2F2EE; --rule: rgba(242,242,238,0.08); }
body { background: var(--t-bg); }
input, textarea, select { font-family: inherit; }
:focus-visible { outline: 2px solid var(--t-accent); outline-offset: 2px; }
/* anything drawn with the display face reads as Chip Stack caps */
[style*="var(--t-display)"] { text-transform: uppercase; font-weight: 800 !important; letter-spacing: 0.02em; }
.disp { font-family: var(--t-display); font-weight: 900; text-transform: uppercase; letter-spacing: 0.02em; line-height: 0.95; }
.lbl { font-size: 11px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: var(--t-mid); }
.stripe { height: 10px; background: repeating-linear-gradient(90deg, var(--sc, var(--t-accent)) 0 18px, #F2F2EE 18px 28px); }
.stripe.thin { height: 6px; background: repeating-linear-gradient(90deg, var(--sc, var(--t-accent)) 0 12px, #F2F2EE 12px 18px); }
.chip-ic { display: inline-block; flex-shrink: 0; border-radius: 50%; box-sizing: border-box; border: 4px dashed #F2F2EE; background: var(--cc, var(--t-accent)); }

.app, .app-table, .loading, .mm, .results { background: var(--t-bg) !important; }
.app::before, .table-wrap::before { display: none !important; }
.app-main { padding-top: 0; }
.screen { padding: 0 16px 40px; }
.screen-fade { animation: screenIn .18s ease; }
.home-head { display: flex; justify-content: space-between; align-items: flex-end; margin: 18px 4px 16px; gap: 12px; }
.wordmark { font-family: var(--t-display); font-weight: 900; font-size: 40px; line-height: 0.85; letter-spacing: 0.04em; text-transform: uppercase; }
.wordmark::after { content: ""; display: block; height: 6px; width: 74px; margin-top: 7px; border-radius: 3px; background: repeating-linear-gradient(90deg, var(--t-accent) 0 10px, #F2F2EE 10px 16px); }
.chip-pill { display: inline-flex; align-items: center; gap: 6px; background: var(--t-raise); border: none; border-radius: 999px; padding: 6px 12px; font-family: var(--t-display); font-weight: 800; font-size: 18px; line-height: 1; letter-spacing: 0.02em; text-transform: uppercase; }
.chip-dot { width: 14px; height: 14px; border-radius: 50%; box-sizing: border-box; border: 3px dashed #F2F2EE; background: var(--t-accent); box-shadow: none; }
.streak-pill { display: inline-flex; align-items: center; gap: 4px; padding: 6px 10px; border-radius: 999px; background: var(--t-panel); border: none; font-family: var(--t-display); font-weight: 800; font-size: 18px; line-height: 1; color: var(--t-text); margin-bottom: 4px; }
.streak-pill svg { color: #FF7E35; }

.panel { background: var(--t-panel) !important; border: none !important; border-radius: 18px; box-shadow: none !important; padding: 16px; }
.list { gap: 8px; }
.row { background: var(--t-raise); border: none; border-radius: 14px; padding: 12px 14px; min-height: 64px; }
button.row:hover:not(:disabled) { background: #2A2C31; }
button.row:active:not(:disabled) { background: #2F3238; }
.row-title { font-family: var(--t-display); font-weight: 900; font-size: 22px; line-height: 1; text-transform: uppercase; letter-spacing: 0.02em; }
.row-sub { font-size: 12.5px; color: var(--t-mid); margin-top: 3px; }
.stat, .comp-row, .ach-row, .best-row, .title-row, .friend-row, .chal { background: var(--t-panel); border: none; }
.bar { height: 8px; border-radius: 4px; background: var(--t-track); }
.bar > div { border-radius: 4px; }
.empty { color: var(--t-mid); }
.input { background: #111214; border: 2px solid var(--t-track); border-radius: 12px; padding: 12px 14px; font-size: 16px; color: var(--t-text); min-height: 48px; }
.input:focus { border-color: var(--t-accent); }
.seg { gap: 4px; background: var(--t-panel); border-radius: 12px; padding: 4px; }
.sheet .seg { background: #111214; }
.segbtn { font-family: var(--t-display); font-weight: 800; font-size: 16px; letter-spacing: 0.04em; text-transform: uppercase; color: var(--t-mid); border-radius: 9px; padding: 10px 6px; min-height: 40px; }
.segbtn.on { background: #F2F2EE; color: #111214; font-weight: 900; }
.kv-list { border-top-color: var(--rule); }
.kv { border-bottom-color: var(--rule); color: var(--t-mid); font-size: 13.5px; }
.kv b { color: var(--t-text); }
.sheet-body { color: var(--t-mid); font-size: 13.5px; }
.panel-label { font-family: var(--t-display); font-weight: 800; font-size: 20px; letter-spacing: 0.04em; text-transform: uppercase; color: var(--t-text); }
.sec-ic, .mode-ic, .turbo-ic, .spin-ic { display: none !important; }
.badge-dot { background: var(--t-accent); color: #111214; }
.linkbtn { color: var(--t-text); font-weight: 700; }

/* buttons: solid blocks of display caps */
.btn { font-family: var(--t-display); font-weight: 900; text-transform: uppercase; letter-spacing: 0.04em; font-size: 20px; line-height: 1; border: none; background: var(--t-panel2); color: var(--t-text); border-radius: 12px; padding: 15px 16px; min-height: 52px; box-shadow: none; }
.btn:hover:not(:disabled) { background: #33363C; border: none; }
.btn-sm { font-size: 16px; min-height: 40px; padding: 10px 14px; border-radius: 10px; }
.btn-raise, .btn-raise:hover:not(:disabled) { background: var(--t-accent); color: #111214; box-shadow: none; }
.btn-raise:hover:not(:disabled) { filter: brightness(1.06); }
.btn-go, .btn-go:hover:not(:disabled) { background: #F2F2EE; color: #111214; border: none; }
.btn-fold, .btn-fold:hover:not(:disabled) { background: var(--t-panel2); color: var(--t-text); border: none; }
.btn:disabled { opacity: 0.38; }
.shine::after { display: none !important; }
.iconbtn { width: 44px; height: 44px; border-radius: 12px; border: none; background: var(--t-panel); color: var(--t-text); }
.iconbtn:hover { background: #2A2C31; }
.sheet .iconbtn { background: var(--t-panel2); }
.cos-tag { font-family: var(--t-display); font-weight: 800; font-size: 14px; letter-spacing: 0.06em; text-transform: uppercase; border-radius: 6px; padding: 3px 7px; background: var(--t-panel2); color: var(--t-text); }
.cos-tag.eq { background: none; color: var(--t-accent); padding: 3px 0; }
.cos-tag.buy { background: var(--t-accent); color: #111214; }
.cos-tag.locked { background: none; color: var(--t-mid); padding: 3px 0; }

/* bottom sheets with a chip stripe on top */
.scrim { align-items: flex-end; padding: 0; background: rgba(5,5,6,0.68); }
.sheet { position: relative; background: var(--t-panel); border: none; border-radius: 26px 26px 0 0; padding: 0 18px calc(26px + env(safe-area-inset-bottom)); max-height: 92vh; max-height: 92dvh; box-shadow: 0 -10px 40px rgba(0,0,0,0.5); animation: sheetUp .26s cubic-bezier(.2,.9,.3,1); }
.sheet::before { content: ""; display: block; height: 10px; margin: 0 -18px 18px; background: repeating-linear-gradient(90deg, var(--sheet-c, var(--t-accent)) 0 18px, #F2F2EE 18px 28px); }
@keyframes sheetUp { from { transform: translateY(40px); opacity: 0; } to { transform: none; opacity: 1; } }
@media (min-width: 620px) { .scrim { align-items: center; padding: 16px; } .sheet { border-radius: 24px; overflow-x: hidden; } }
.sheet-head { align-items: flex-start; gap: 12px; margin-bottom: 16px; }
.sheet-title { font-family: var(--t-display); font-weight: 900; font-size: 34px; line-height: 0.92; text-transform: uppercase; letter-spacing: 0.02em; padding-top: 4px; }
.toast { background: var(--t-panel); border: none; border-radius: 14px; overflow: hidden; padding: 14px 16px 10px; box-shadow: 0 16px 40px rgba(0,0,0,0.55); }
.toast::before { content: ""; position: absolute; top: 0; left: 0; right: 0; height: 5px; background: repeating-linear-gradient(90deg, var(--t-accent) 0 12px, #F2F2EE 12px 18px); }
.toast div:first-child { font-family: var(--t-display); font-size: 17px !important; font-weight: 900 !important; letter-spacing: 0.04em; text-transform: uppercase; }

/* bottom nav: words, not icons, with a gold bar over the tab you're on */
.bottom-nav { background: #0B0C0E; border-top: none; padding: 0 10px env(safe-area-inset-bottom); display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); align-items: stretch; height: calc(62px + env(safe-area-inset-bottom)); }
.navbtn { font-family: var(--t-display); font-weight: 800; font-size: 15px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--t-mid); background: none; border: none; border-top: 4px solid transparent; padding: 0; display: flex; align-items: center; justify-content: center; position: relative; }
.navbtn[aria-current="page"] { color: var(--t-text); font-weight: 900; font-size: 17px; border-top-color: var(--t-accent); }
.navbtn .badge-dot { position: absolute; top: 8px; right: 8px; min-width: 16px; height: 16px; font-size: 10px; }

/* loading */
.loading-word { font-size: 88px; }
.loading-suits { gap: 10px; }
.loading-bar { height: 8px; width: 150px; border-radius: 4px; background: var(--t-track); }
.loading-bar div { background: repeating-linear-gradient(90deg, var(--t-accent) 0 16px, #F2F2EE 16px 24px); }
.spinner { border-color: var(--t-track); border-top-color: var(--t-accent); }

/* ---------- home ---------- */
.home-chips { text-align: right; }
.home-chips b { display: block; font-family: var(--t-display); font-weight: 800; font-size: 34px; line-height: 0.9; }
.home-chips span { font-size: 11px; font-weight: 700; letter-spacing: 0.16em; color: var(--t-mid); }
.home-stack { display: flex; flex-direction: column; gap: 12px; }
.streak-card { padding: 14px 16px 16px; border-radius: 16px; background: var(--t-panel); }
.streak-days { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 6px; margin-top: 12px; }
.sday { display: flex; flex-direction: column; align-items: center; gap: 4px; font-size: 11px; color: var(--t-mid); }
.sday i { width: 36px; height: 36px; border-radius: 50%; box-sizing: border-box; display: flex; align-items: center; justify-content: center; font-style: normal; font-family: var(--t-display); font-weight: 800; font-size: 15px; background: var(--t-track); color: var(--t-mid); }
.sday.got i { border: 4px dashed #F2F2EE; background: var(--t-accent); color: #111214; }
.sday.today i { border: 3px solid var(--t-accent); background: var(--t-panel2); color: var(--t-text); font-weight: 900; }
.sday.today { color: var(--t-text); font-weight: 700; }
.sday.big:not(.got) i { border: 2px dashed var(--t-accent); color: var(--t-accent); }
.spin-row { width: 100%; display: flex; align-items: center; gap: 14px; padding: 12px 14px; border-radius: 16px; background: var(--t-panel); border: none; color: var(--t-text); text-align: left; cursor: pointer; }
.spin-row:active { transform: scale(0.985); }
.spin-wheel { width: 48px; height: 48px; flex-shrink: 0; border-radius: 50%; box-sizing: border-box; border: 4px dashed #F2F2EE; background: conic-gradient(#0D68F8 0 45deg, #00A169 45deg 90deg, #833BFF 90deg 135deg, #E38400 135deg 180deg, #EA1D91 180deg 225deg, #00A5B8 225deg 270deg, #1F2430 270deg 315deg, #D1A021 315deg 360deg); }
.spin-row.used .spin-wheel { filter: grayscale(1) brightness(0.6); }
.spin-go { padding: 10px 14px; border-radius: 10px; background: var(--t-panel2); font-family: var(--t-display); font-weight: 900; font-size: 18px; letter-spacing: 0.04em; }
.spin-row.ready .spin-go { background: var(--t-accent); color: #111214; }
.rk-card { border-radius: 18px; background: var(--t-panel); overflow: hidden; }
.rk-body { padding: 14px 18px 18px; }
.rk-top { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; }
.rk-link { background: none; border: none; padding: 4px 0; color: var(--t-text); font-size: 12px; font-weight: 700; text-decoration: underline; text-underline-offset: 3px; cursor: pointer; }
.rk-main { display: flex; align-items: flex-end; gap: 12px; margin-top: 6px; }
.rk-rp { font-family: var(--t-display); font-weight: 900; font-size: 84px; line-height: 0.8; font-variant-numeric: tabular-nums; }
.rk-tier { font-family: var(--t-display); font-weight: 800; font-size: 22px; line-height: 1; text-transform: uppercase; display: flex; align-items: center; gap: 6px; }
.rk-segs { display: grid; grid-template-columns: repeat(10, minmax(0, 1fr)); gap: 4px; margin-top: 14px; }
.rk-segs span { height: 8px; border-radius: 2px; background: var(--t-track); }
.rk-wl { display: flex; gap: 16px; margin-top: 12px; font-size: 12.5px; color: var(--t-mid); }
.rk-wl b { color: var(--t-text); }
.big-cta { margin-top: 14px; width: 100%; min-height: 56px; font-size: 24px; }
.mode-chips { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; padding: 4px 0; }
.mode-chip { display: flex; flex-direction: column; align-items: center; gap: 8px; background: none; border: none; color: var(--t-text); padding: 0; cursor: pointer; }
.mode-chip .mc-disc { width: 96px; height: 96px; border-radius: 50%; box-sizing: border-box; border: 9px dashed #F2F2EE; background: var(--cc); display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 18px rgba(0,0,0,0.4); transition: transform .15s ease; }
.mode-chip .mc-core { width: 52px; height: 52px; border-radius: 50%; background: rgba(0,0,0,0.16); display: flex; align-items: center; justify-content: center; color: #F2F2EE; font-family: var(--t-display); font-weight: 900; font-size: 22px; }
.mode-chip:active .mc-disc { transform: scale(0.94) rotate(-12deg); }
@media (max-width: 360px) { .mode-chip .mc-disc { width: 84px; height: 84px; border-width: 8px; } }
.mode-chip .mc-name { font-family: var(--t-display); font-weight: 800; font-size: 20px; letter-spacing: 0.04em; }
.mode-chip .mc-sub { font-size: 11.5px; color: var(--t-mid); margin-top: -6px; }
.edge-card { position: relative; overflow: hidden; width: 100%; display: flex; align-items: center; gap: 12px; padding: 14px 16px 14px 22px; border-radius: 14px; background: var(--t-panel); border: none; color: var(--t-text); text-align: left; cursor: pointer; }
.edge-card::before { content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 8px; background: repeating-linear-gradient(180deg, var(--sc, var(--c-green)) 0 10px, #F2F2EE 10px 16px); }
.edge-card:active { transform: scale(0.985); }
.ec-title { display: block; font-family: var(--t-display); font-weight: 800; font-size: 22px; line-height: 1; letter-spacing: 0.02em; text-transform: uppercase; }
.ec-sub { display: block; font-size: 12.5px; color: var(--t-mid); margin-top: 3px; }
.hr-card { width: 100%; display: block; padding: 0; border-radius: 18px; background: #0A0A0B; overflow: hidden; border: none; color: #F2F2EE; text-align: left; cursor: pointer; box-shadow: inset 0 0 0 1px rgba(237,176,0,0.4); }
.hr-card:active { transform: scale(0.985); }
.hr-card .hr-stripe { display: block; height: 8px; background: repeating-linear-gradient(90deg, #EDB000 0 14px, #0A0A0B 14px 20px); }
.hr-card .hr-body { display: flex; align-items: center; gap: 14px; padding: 14px 16px 16px; }
.hr-crest { width: 58px; height: 58px; flex-shrink: 0; border-radius: 50%; box-sizing: border-box; border: 5px dashed #EDB000; background: #17181B; display: flex; align-items: center; justify-content: center; color: #EDB000; }
.hr-kicker { display: block; font-size: 11px; font-weight: 700; letter-spacing: 0.16em; color: #EDB000; }
.hr-title { display: block; font-family: var(--t-display); font-weight: 900; font-size: 26px; line-height: 1; letter-spacing: 0.02em; margin-top: 2px; }
.hr-sub { display: block; font-size: 12.5px; color: #B9B3A6; margin-top: 3px; }
.hr-enter { padding: 9px 12px; border-radius: 10px; border: 1.5px solid #EDB000; color: #EDB000; font-family: var(--t-display); font-weight: 900; font-size: 17px; letter-spacing: 0.06em; line-height: 1; }
.hr-card .hr-body { width: 100%; box-sizing: border-box; }
.hr-bar { display: block; height: 6px; border-radius: 3px; background: #24221C; margin: 0 16px 16px; overflow: hidden; }
.hr-bar > span { display: block; height: 100%; background: repeating-linear-gradient(90deg, #EDB000 0 10px, #FDD05A 10px 13px); }
.pass-card { border-radius: 18px; background: var(--t-panel); padding: 14px 0 16px; overflow: hidden; }
.pass-top { display: flex; justify-content: space-between; align-items: center; padding: 0 16px; }
.pass-lvl { padding: 2px 7px; border-radius: 6px; background: var(--t-accent); color: #111214; font-family: var(--t-display); font-weight: 900; font-size: 15px; }
.pass-xp { display: flex; align-items: center; gap: 10px; padding: 0 16px; margin-top: 10px; }
.pass-xp .bar { flex: 1; }
.pass-xp span { font-size: 12px; font-weight: 600; color: var(--t-mid); }
.pass-strip { display: flex; gap: 8px; overflow-x: auto; margin-top: 14px; padding: 0 16px 2px; scroll-snap-type: x proximity; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
.pass-strip::-webkit-scrollbar { display: none; }
.pass-mini { flex: 0 0 88px; border-radius: 12px; background: var(--t-raise); overflow: hidden; border: none; color: var(--t-text); padding: 0 0 8px; display: flex; flex-direction: column; align-items: center; gap: 6px; cursor: pointer; scroll-snap-align: start; }
.pass-mini::before { content: ""; align-self: stretch; height: 5px; background: var(--rc, #A3A6AD); }
.pass-mini.next { box-shadow: inset 0 0 0 2px var(--t-accent); }
.pass-mini.got { opacity: 0.6; }
.pass-mini .pm-l { font-size: 11px; font-weight: 700; letter-spacing: 0.1em; color: var(--t-mid); }
.pass-mini.next .pm-l { color: var(--t-accent); }
.pass-mini .pm-art { height: 44px; display: flex; align-items: center; justify-content: center; }
.pass-mini .pm-name { font-size: 12px; font-weight: 600; text-align: center; padding: 0 4px; line-height: 1.15; }
.pass-mini .pm-r { font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--rt, var(--t-mid)); }
.r-common { --rc: #A3A6AD; --rt: #A3A6AD; } .r-rare { --rc: #196EFE; --rt: #6095FF; } .r-epic { --rc: #A32BFE; --rt: #B97CFE; } .r-legendary { --rc: #EDB000; --rt: #EDB000; }
.chal-card { padding: 14px 16px 8px; border-radius: 18px; background: var(--t-panel); }
.chal-row { display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--rule); }
.chal-row:last-child { border-bottom: none; }
.chal-row.claimed { opacity: 0.5; }
.chal-text { display: flex; justify-content: space-between; gap: 8px; font-size: 14.5px; font-weight: 600; }
.chal-reward { width: 58px; text-align: center; font-family: var(--t-display); font-weight: 800; font-size: 17px; color: var(--t-mid); }
.mini-seg { display: flex; padding: 3px; border-radius: 10px; background: #111214; }
.mini-seg button { min-height: 32px; padding: 0 12px; border: none; border-radius: 8px; background: transparent; color: var(--t-mid); font-family: var(--t-display); font-weight: 800; font-size: 15px; letter-spacing: 0.06em; text-transform: uppercase; cursor: pointer; }
.mini-seg button.on { background: var(--t-panel2); color: var(--t-text); }
.app-card { background: var(--t-panel); border: none; border-radius: 16px; }
.app-card.notify { background: var(--t-panel); box-shadow: inset 0 0 0 1.5px rgba(237,176,0,0.5); }
.app-card-ic.bell { background: rgba(237,176,0,0.16); color: var(--t-accent); }
.invite-banner { background: var(--t-panel); border: none; box-shadow: 0 12px 30px rgba(0,0,0,0.5), inset 0 0 0 2px var(--c-green); }

/* sheet pieces */
.turbo-row { background: var(--t-raise); border: none; border-radius: 12px; }
.turbo-row > div > div > div:first-child { font-family: var(--t-display); font-weight: 800; font-size: 19px; letter-spacing: 0.04em; text-transform: uppercase; }
.stake-row { display: flex; align-items: center; gap: 14px; width: 100%; padding: 12px 14px; border-radius: 14px; background: var(--t-raise); border: none; color: var(--t-text); text-align: left; cursor: pointer; }
.stake-row:disabled { opacity: 0.4; cursor: default; }
.stake-row:active:not(:disabled) { background: #2F3238; }
.spec-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin: 14px 0 0; }
.spec { padding: 10px 12px; border-radius: 12px; background: var(--t-raise); }
.spec b { display: block; font-family: var(--t-display); font-weight: 900; font-size: 22px; line-height: 1.1; text-transform: uppercase; }
.pro-note { display: flex; gap: 12px; align-items: flex-start; padding: 12px 14px; border-radius: 12px; background: #111214; margin-top: 12px; }
.prize-box { padding: 14px; border-radius: 14px; background: var(--t-raise); margin-top: 14px; }
.prize-bars { display: flex; align-items: flex-end; gap: 8px; margin-top: 12px; }
.prize-bars > div { flex: 1; display: flex; flex-direction: column; gap: 4px; }
.prize-bars i { display: block; border-radius: 6px 6px 2px 2px; }
.prize-bars span { font-family: var(--t-display); font-weight: 800; font-size: 16px; }
.var-tile { background: var(--t-raise); border: 2px solid transparent; border-radius: 12px; }
.var-tile.on.v-holdem, .var-tile.on.v-omaha, .var-tile.on.v-short { border-color: var(--t-accent); background: var(--t-raise); }
.var-name { font-family: var(--t-display); font-weight: 800; font-size: 18px; text-transform: uppercase; letter-spacing: 0.02em; }

/* ---------- the table ---------- */
.table-wrap { background: var(--t-bg); padding: 10px 16px 12px; }
.table-top { gap: 10px; }
.table-top .iconbtn { width: 42px; height: 42px; border-radius: 10px; }
.tt-title { font-family: var(--t-display); font-weight: 900; font-size: 26px; line-height: 0.9; letter-spacing: 0.04em; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.table-sub { font-size: 10.5px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--t-mid); margin-top: 3px; }
.status { font-size: 11px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--t-mid); margin: 8px 0 4px; min-height: 16px; }
.seats { display: grid; gap: 8px; justify-content: stretch; margin-top: 2px; }
.seats.grid4 { gap: 6px; }
.seat { position: relative; border-radius: 12px; background: var(--t-panel); padding: 11px 8px 6px; display: flex; flex-direction: column; align-items: stretch; gap: 3px; min-width: 0; transition: opacity .3s ease, box-shadow .2s ease; }
.seat::before { content: ""; position: absolute; left: 0; right: 0; top: 0; height: 5px; border-radius: 12px 12px 0 0; background: repeating-linear-gradient(90deg, var(--seat-c) 0 10px, #F2F2EE 10px 15px); }
.seat.active { box-shadow: 0 0 0 3px var(--t-accent); }
.seat-top { display: flex; align-items: center; gap: 6px; min-width: 0; }
.seat-av { position: relative; flex-shrink: 0; }
.seat .bot-av { position: static; width: 24px !important; height: 24px !important; font-size: 12px !important; }
.seat-name { font-size: 13px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: flex; align-items: center; gap: 4px; min-width: 0; }
.seat-stack { font-family: var(--t-display); font-weight: 800; font-size: 21px; line-height: 1; font-variant-numeric: tabular-nums; }
.seat-tag { font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
.seat-cards { height: 32px; display: flex; align-items: center; justify-content: center; gap: 3px; }
.seat-bet { height: 20px; display: flex; align-items: center; justify-content: center; }
.seat-timer { position: absolute; left: 8px; right: 8px; bottom: 4px; height: 3px; border-radius: 2px; background: var(--t-track); overflow: hidden; }
.seat-timer > div { height: 100%; transition: width .25s linear; }
.seat .dealer-chip { position: absolute; top: 9px; right: 6px; bottom: auto; }
.seat .peek-badge { top: -6px; left: -6px; }
.seat .think-dots { top: -4px; right: -8px; }
.seats.compact .seat { padding: 10px 6px 5px; }
.seats.compact .seat-name { font-size: 12px; }
.seats.compact .seat-stack { font-size: 18px; }
.seats.compact .seat .bot-av { width: 20px !important; height: 20px !important; font-size: 10.5px !important; }
.seats.grid4 .seat-cards { height: 28px; }
.bot-av { font-family: var(--t-display); font-weight: 900; }
.felt-center { gap: 10px; }
.felt-oval { border: 11px solid transparent !important; border-radius: 999px; padding: 26px 14px 20px; background: var(--felt-tex, linear-gradient(transparent, transparent)) padding-box, radial-gradient(ellipse at 50% 35%, var(--felt1, #00A963) 0%, var(--felt2, #008146) 55%, var(--felt3, #005D31) 100%) padding-box, repeating-linear-gradient(90deg, var(--rail-c, #F51E1D) 0 22px, #F2F2EE 22px 32px) border-box !important; background-size: var(--felt-tex-size, auto), auto, auto !important; box-shadow: inset 0 0 0 3px #111214, inset 0 8px 24px rgba(0,0,0,0.3), 0 20px 40px rgba(0,0,0,0.5) !important; }
.felt-oval::before { top: 6px; right: 6px; bottom: 6px; left: 6px; }
.felt-oval.drama { box-shadow: inset 0 0 0 3px #111214, 0 0 0 3px var(--t-accent), 0 0 50px rgba(237,176,0,0.35) !important; }
.felt-logo { font-family: var(--t-body); font-weight: 700; text-transform: none; letter-spacing: -0.045em; color: rgba(255,255,255,0.06); }
.card { background: #F2F2EE; font-family: var(--t-display); font-weight: 900; border-radius: 7px; box-shadow: 0 3px 0 rgba(0,0,0,0.35); line-height: 0.95; }
.card > div:last-child { font-family: -apple-system, system-ui, sans-serif; }
.card.big { font-size: clamp(24px,7vw,32px); border-radius: 9px; box-shadow: 0 4px 0 rgba(0,0,0,0.4); }
.card.big:not(.o4):first-child { transform: rotate(-4deg); }
.card.big:not(.o4):nth-child(2) { transform: rotate(4deg); }
.card.mini { font-size: 11px; box-shadow: 0 2px 0 rgba(0,0,0,0.35); }
.card.win { box-shadow: 0 0 0 3px var(--t-accent), 0 0 18px rgba(237,176,0,0.55); }
.card-slot { border: none; background: rgba(0,0,0,0.18); }
.card-slot.next { border: 2px solid var(--t-accent); }
.pot-row { align-items: center; }
.pot-num { background: none; padding: 0; font-family: var(--t-display); font-weight: 900; font-size: 28px; line-height: 1; color: #FFFFFF; display: inline-flex; align-items: baseline; gap: 8px; }
.pot-l { font-family: var(--t-body); font-size: 11px; font-weight: 700; letter-spacing: 0.16em; color: rgba(255,255,255,0.8); }
.chip-badge { background: #111214; border: none; color: var(--t-text); font-family: var(--t-display); font-weight: 800; font-size: 14px; padding: 2px 8px; border-radius: 999px; }
.dealer-chip { background: #F2F2EE; color: #111214; font-family: var(--t-display); font-weight: 900; font-size: 10px; width: 17px; height: 17px; }
.odds-badge { background: #111214; border: none; font-family: var(--t-display); font-size: 14px; }
.banner { background: var(--t-panel) !important; border: none !important; border-radius: 14px; box-shadow: inset 0 0 0 2px var(--banner-c, transparent); }
.banner > div:first-child > div:first-child > div:first-child { font-family: var(--t-display); font-weight: 900; font-size: 20px !important; letter-spacing: 0.02em; text-transform: uppercase; }
.hero-seat { position: relative; overflow: visible; background: var(--t-panel); border: none !important; border-radius: 16px; padding: 12px 14px; box-shadow: none !important; }
.hero-seat.turn { box-shadow: inset 0 0 0 2px var(--t-accent) !important; }
.hero-timer { position: absolute; left: 0; right: 0; top: 0; height: 5px; background: var(--t-track); border-radius: 16px 16px 0 0; overflow: hidden; }
.hero-seat .sq-hint { bottom: -14px; }
.hero-timer > div { height: 100%; transition: width .25s linear; }
.hero-name { font-size: 15px; font-weight: 700; display: flex; align-items: center; gap: 6px; white-space: nowrap; min-width: 0; }
.hero-name > span:first-child { min-width: 24px; }
.turn-tag { flex-shrink: 0; }
.turn-tag { font-size: 10.5px; font-weight: 700; letter-spacing: 0.12em; color: #111214; background: var(--t-accent); padding: 2px 6px; border-radius: 4px; }
.hero-stack { font-family: var(--t-display); font-weight: 900; font-size: 32px; line-height: 0.95; font-variant-numeric: tabular-nums; margin-top: 2px; }
.hero-hand { font-size: 12.5px; font-weight: 600; color: var(--t-mid); min-height: 17px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.hero-av { position: relative; width: 36px; height: 36px; flex-shrink: 0; }
.hero-av-in { width: 36px; height: 36px; border-radius: 50%; background: var(--t-panel2); display: flex; align-items: center; justify-content: center; font-size: 17px; overflow: hidden; }
.standing { background: none; color: var(--t-text); font-family: var(--t-display); font-weight: 900; font-size: 14px; padding: 0; margin-left: 6px; }
.controls { gap: 8px; padding-top: 10px; }
.controls .btn { min-height: 58px; font-size: 22px; }
.act-row { display: grid; grid-template-columns: 1fr 1.25fr 1.25fr; gap: 8px; width: 100%; }
.act-row.two { grid-template-columns: 1fr 1fr; }
.raise-box { width: 100%; padding: 12px 14px 14px; border-radius: 16px; background: var(--t-panel); }
.preset-row { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)) 44px; gap: 6px; }
.preset-btn { min-height: 48px !important; padding: 6px 4px !important; background: var(--t-panel2) !important; color: var(--t-text) !important; flex-direction: column; gap: 2px; }
.preset-btn > div:first-child { font-family: var(--t-display); font-size: 16px !important; font-weight: 900 !important; }
.preset-btn > div:last-child { font-family: var(--t-body); font-size: 11.5px !important; opacity: 0.75; text-transform: none; letter-spacing: 0; }
.slider-row { background: var(--t-panel); border-radius: 14px; padding: 10px 10px 10px 14px; }
.slider-row .num { font-family: var(--t-display); font-weight: 900; font-size: 24px !important; }
input[type=range] { accent-color: var(--t-accent); height: 28px; }
.pre-row { gap: 8px; }
.pre-btn { border: 2px solid var(--t-track); background: transparent; color: var(--t-text); border-radius: 12px; font-family: var(--t-display); font-weight: 800; font-size: 17px; letter-spacing: 0.04em; text-transform: uppercase; min-height: 52px; }
.pre-btn.on { border-color: var(--t-accent); color: var(--t-text); background: rgba(237,176,0,0.12); }
.pre-box { display: none; }
.peek-badge { background: var(--t-accent); color: #111214; }
.coach-panel { background: var(--t-panel) !important; border: none !important; border-radius: 16px; padding: 13px 14px 10px !important; height: 82px; }
.coach-panel::before { content: ""; position: absolute; left: 0; right: 0; top: 0; height: 5px; background: repeating-linear-gradient(90deg, var(--c-green) 0 14px, #F2F2EE 14px 20px); z-index: 1; }
.coach-badge { font-family: var(--t-display); font-weight: 900; font-size: 16px; letter-spacing: 0.06em; color: var(--t-good) !important; }
.coach-act { font-family: var(--t-display); font-weight: 900; font-size: 17px; letter-spacing: 0.02em; text-transform: uppercase; }
.coach-why { font-size: 13px; color: var(--t-text2); }
.coach-panel.note.good, .coach-panel.note.bad { background: var(--t-panel) !important; }
.coach-panel .cp-meter { display: none; }
.cp-hand b { font-family: var(--t-display); font-size: 18px; }
.tip { border: none !important; background: var(--t-panel) !important; color: var(--t-text2) !important; border-radius: 12px; box-shadow: inset 0 0 0 1.5px rgba(237,176,0,0.5); }
.bigwin-label { font-family: var(--t-display); font-weight: 900; font-size: 26px; letter-spacing: 0.2em; text-transform: uppercase; color: var(--t-accent); }
.bigwin-amt { font-family: var(--t-display); font-weight: 900; font-size: 88px; line-height: 0.9; color: #FFFFFF; text-shadow: 0 6px 30px rgba(0,0,0,0.6); }
.fchip { border: 3px dashed #F2F2EE; }
.fchip.c0 { background: var(--t-accent); } .fchip.c1 { background: var(--c-red); } .fchip.c2 { background: var(--c-blue); }
.float-amt { font-family: var(--t-display); font-weight: 900; font-size: 24px; color: var(--t-good); }
.mm-title { font-family: var(--t-display); font-weight: 900; font-size: 40px; text-transform: uppercase; letter-spacing: 0.02em; }
.mm-sub { font-size: 12px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--t-mid); }
.shown-tag { background: var(--t-accent); color: #111214; font-family: var(--t-display); font-size: 12px; letter-spacing: 0.08em; }
.show-choice { width: 100%; padding: 14px; border-radius: 16px; background: var(--t-panel); }
.show-choice .disp { font-size: 24px; }
.emote-bubble { background: #F2F2EE; color: #111214; font-family: var(--t-display); font-weight: 900; font-size: 15px; letter-spacing: 0.04em; text-transform: uppercase; border-radius: 10px; }
.emote-bubble::after { border-top-color: #F2F2EE; }
.emote-btn { background: var(--t-panel2); border: none; border-radius: 999px; font-family: var(--t-display); font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; }
.ot-sit { border: 2px dashed #3A3D44; background: transparent; color: var(--t-mid); }
.code-big { font-family: var(--t-display); font-weight: 900; font-size: 52px; letter-spacing: 0.2em; }
.code-card { background: #111214; border: 2px dashed #3A3D44; }
.code-input { font-family: var(--t-display) !important; font-weight: 900 !important; font-size: 40px !important; letter-spacing: 0.3em; }
.stake-grid { gap: 6px; }
.stake-btn { border: none; background: #111214; color: var(--t-text); font-family: var(--t-display); font-weight: 800; font-size: 16px; border-radius: 9px; min-height: 40px; }
.stake-btn.on { background: #F2F2EE; color: #111214; }

/* ---------- High Roller: black and gold ---------- */
.table-wrap.vip { --t-bg: #070708; --t-panel: #121316; --t-raise: #17181B; --t-panel2: #1E1F23; --t-accent: #EDB000; --rail-c: #EDB000; background: #070708 !important; }
.table-wrap.vip .seat { box-shadow: inset 0 0 0 1px rgba(237,176,0,0.3); }
.table-wrap.vip .seat::before { background: repeating-linear-gradient(90deg, #EDB000 0 10px, #070708 10px 14px); }
.table-wrap.vip .seat.active { box-shadow: 0 0 0 3px #EDB000; }
.table-wrap.vip .felt-oval { background: radial-gradient(ellipse at 50% 35%, #2C313B, #181B21 60%, #0C0E12) padding-box, repeating-linear-gradient(90deg, #EDB000 0 20px, #121316 20px 30px) border-box !important; box-shadow: inset 0 0 0 3px #070708, inset 0 0 0 4px rgba(237,176,0,0.35), 0 24px 50px rgba(0,0,0,0.7) !important; }
.table-wrap.vip .hero-seat { box-shadow: inset 0 0 0 1px rgba(237,176,0,0.5) !important; }
.table-wrap.vip .hero-seat.turn { box-shadow: inset 0 0 0 2px #EDB000 !important; }
.table-wrap.vip .iconbtn { background: transparent; box-shadow: inset 0 0 0 1px rgba(237,176,0,0.4); color: #EDB000; }
.table-wrap.vip .btn-fold { background: transparent; box-shadow: inset 0 0 0 1.5px rgba(237,176,0,0.5); }
.table-wrap.vip .pot-num { color: #EDB000; }
.table-wrap.vip .card.back, .table-wrap.vip .sq-cover { background-color: #121316 !important; background-image: repeating-linear-gradient(45deg, rgba(237,176,0,0.25) 0 2px, transparent 2px 6px) !important; box-shadow: inset 0 0 0 2px #121316, inset 0 0 0 3px #EDB000, 0 3px 0 rgba(0,0,0,0.4) !important; }
.table-wrap.vip .fchip.c0 { background: #EDB000; } .table-wrap.vip .fchip.c1 { background: #121316; } .table-wrap.vip .fchip.c2 { background: #8E6900; }
.vip-logo { display: flex; flex-direction: column; align-items: center; color: transparent !important; font-size: 0 !important; }
.vip-logo .vl-word { font-family: var(--t-display); font-weight: 900; font-size: 60px; letter-spacing: 0.06em; color: rgba(237,176,0,0.1); text-transform: uppercase; }
.vip-intro { position: fixed; top: 0; right: 0; bottom: 0; left: 0; z-index: 40; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; background: #070708; animation: viFade 2.4s ease forwards; cursor: pointer; }
.vi-crest { width: 92px; height: 92px; border-radius: 50%; box-sizing: border-box; border: 8px dashed #EDB000; background: #121316; display: flex; align-items: center; justify-content: center; color: #EDB000; animation: viUp .8s cubic-bezier(.2,.8,.2,1) .1s both; }
.vi-kicker { margin-top: 22px; font-size: 11px; font-weight: 700; letter-spacing: 0.3em; color: #EDB000; text-transform: uppercase; animation: viUp .8s cubic-bezier(.2,.8,.2,1) .2s both; }
.vi-title { font-family: var(--t-display); font-weight: 900; font-size: 56px; line-height: 0.9; text-transform: uppercase; margin: 8px 0 14px; color: #F2F2EE; animation: viUp .9s cubic-bezier(.2,.8,.2,1) .3s both; }
.vi-rule { width: 150px; height: 8px; border-radius: 4px; background: repeating-linear-gradient(90deg, #EDB000 0 14px, #070708 14px 20px); animation: viRule 1s cubic-bezier(.2,.8,.2,1) .5s both; }
.vi-sub { margin-top: 14px; font-size: 12px; font-weight: 700; letter-spacing: 0.16em; color: #B9B3A6; animation: viUp .8s cubic-bezier(.2,.8,.2,1) .6s both; }
@keyframes viUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
@keyframes viRule { from { transform: scaleX(0); opacity: 0; } to { transform: scaleX(1); opacity: 1; } }
@keyframes viFade { 0%, 80% { opacity: 1; } 100% { opacity: 0; visibility: hidden; } }
.hr-sheet-scrim { background: rgba(0,0,0,0.85); }
.sheet.hr-sheet { background: #070708; color: #F2F2EE; --sheet-c: #EDB000; }
.sheet.hr-sheet::before { background: repeating-linear-gradient(90deg, #EDB000 0 18px, #070708 18px 26px); }
.sheet.hr-sheet .iconbtn { background: transparent; box-shadow: inset 0 0 0 1px rgba(237,176,0,0.4); color: #EDB000; }
.sheet.hr-sheet .seg { background: transparent; box-shadow: inset 0 0 0 1px rgba(237,176,0,0.3); }
.sheet.hr-sheet .segbtn { color: #F2F2EE; }
.sheet.hr-sheet .segbtn.on { background: #EDB000; color: #111214; }
.hr-head { text-align: center; display: flex; flex-direction: column; align-items: center; }
.hr-head .hr-crest { width: 86px; height: 86px; border-width: 8px; box-shadow: 0 0 0 4px #070708, 0 0 0 5px rgba(237,176,0,0.35); }
.hr-big { font-family: var(--t-display); font-weight: 900; font-size: 50px; line-height: 0.88; text-transform: uppercase; margin-top: 8px; }
.hr-body-txt { font-size: 14px; line-height: 1.5; color: #B9B3A6; margin: 12px 4px 0; }
.hr-row { display: flex; align-items: center; gap: 14px; width: 100%; padding: 14px 16px; border-radius: 16px; background: #121316; border: none; box-shadow: inset 0 0 0 1px rgba(237,176,0,0.5); color: #F2F2EE; text-align: left; cursor: pointer; }
.hr-row:disabled { background: #0D0E10; box-shadow: inset 0 0 0 1px rgba(237,176,0,0.18); cursor: default; }
.hr-row:active:not(:disabled) { transform: scale(0.985); }
.hr-no { width: 30px; font-family: var(--t-display); font-weight: 900; font-size: 34px; line-height: 1; color: #EDB000; }
.hr-row:disabled .hr-no { color: #6E6858; }
.hr-name { display: block; font-family: var(--t-display); font-weight: 900; font-size: 24px; line-height: 1; text-transform: uppercase; }
.hr-row:disabled .hr-name { color: #B9B3A6; }
.hr-meta { display: block; font-size: 12.5px; color: #B9B3A6; margin-top: 4px; }
.hr-sit { padding: 9px 12px; border-radius: 10px; background: #EDB000; color: #111214; font-family: var(--t-display); font-weight: 900; font-size: 17px; letter-spacing: 0.06em; }

/* ---------- results, pass, spin, ladder ---------- */
.results-kicker { font-size: 11px; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; color: var(--t-mid); }
.results-head { font-family: var(--t-display); font-weight: 900; font-size: 76px; line-height: 0.85; text-transform: uppercase; letter-spacing: 0; }
.results-sub { color: var(--t-mid); }
.results-delta { font-family: var(--t-display); font-weight: 900; font-size: 72px; line-height: 0.9; letter-spacing: 0; }
.results-delta span { font-family: var(--t-body); font-size: 12px; font-weight: 700; letter-spacing: 0.16em; }
.results-tier { position: relative; overflow: hidden; background: var(--t-panel); border: none; border-radius: 16px; padding: 18px 16px 14px; }
.results-tier::before { content: ""; position: absolute; left: 0; right: 0; top: 0; height: 8px; background: repeating-linear-gradient(90deg, var(--tc, var(--t-accent)) 0 16px, #F2F2EE 16px 24px); }
.results-note { border: none; background: var(--t-panel); border-radius: 12px; box-shadow: inset 0 0 0 1.5px var(--note-c, rgba(237,176,0,0.5)); }
.results-lines > div { border-bottom-color: var(--rule); }
.results-stats > div { background: var(--t-panel); border-radius: 12px; }
.results-stats b { font-family: var(--t-display); font-weight: 900; font-size: 24px; }
.results-stats span { font-size: 10.5px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; }
.pass-sheet { --sheet-c: #A32BFE; }
.ps-head { display: flex; align-items: flex-end; gap: 14px; margin-bottom: 14px; }
.ps-big { font-family: var(--t-display); font-weight: 900; font-size: 84px; line-height: 0.78; }
.ps-preview { display: flex; gap: 14px; padding: 14px; border-radius: 16px; background: var(--t-raise); position: relative; overflow: hidden; }
.ps-preview::before { content: ""; position: absolute; left: 0; right: 0; top: 0; height: 6px; background: repeating-linear-gradient(90deg, var(--rc, #A3A6AD) 0 14px, #F2F2EE 14px 20px); }
.ps-art { width: 104px; height: 104px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; border-radius: 14px; background: #111214; }
.ps-meta { flex: 1; min-width: 0; display: flex; flex-direction: column; align-items: flex-start; gap: 4px; }
.ps-rarity { font-size: 11px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; }
.ps-name { font-family: var(--t-display); font-weight: 900; font-size: 28px; line-height: 0.95; text-transform: uppercase; }
.ps-sub { font-size: 12.5px; color: var(--t-mid); }
.ps-got { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 700; color: var(--t-good); }
.ps-lock { display: inline-flex; align-items: center; gap: 5px; font-family: var(--t-display); font-size: 16px; font-weight: 800; color: var(--t-accent); }
.ps-track { position: relative; display: flex; gap: 10px; overflow-x: auto; margin: 16px -18px 0; padding: 4px 18px 8px; scroll-snap-type: x proximity; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
.ps-track::-webkit-scrollbar { display: none; }
.ps-line { position: absolute; left: 18px; bottom: 23px; height: 4px; width: calc(30 * 96px); background: var(--t-track); }
.ps-line > div { height: 100%; background: var(--t-accent); }
.ps-tile { flex: 0 0 86px; display: flex; flex-direction: column; align-items: center; gap: 8px; background: none; border: none; padding: 0; color: var(--t-text); cursor: pointer; scroll-snap-align: center; }
.ps-card { align-self: stretch; height: 112px; border-radius: 12px; background: var(--t-raise); overflow: hidden; display: flex; flex-direction: column; align-items: center; gap: 6px; padding-bottom: 8px; }
.ps-card::before { content: ""; align-self: stretch; height: 5px; background: var(--rc, #A3A6AD); }
.ps-tile.got .ps-card { opacity: 0.6; }
.ps-tile.sel .ps-card { box-shadow: inset 0 0 0 2px #F2F2EE; }
.ps-tile.next .ps-card { box-shadow: inset 0 0 0 2px var(--t-accent); }
.ps-tile-art { flex: 1; display: flex; align-items: center; justify-content: center; }
.ps-tile-name { font-size: 11.5px; font-weight: 600; color: var(--t-text2); white-space: nowrap; }
.ps-node { position: relative; z-index: 1; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: var(--t-display); font-weight: 900; font-size: 14px; background: var(--t-track); color: var(--t-mid); }
.ps-tile.got .ps-node { box-sizing: border-box; border: 4px dashed #111214; background: var(--t-accent); color: #111214; }
.ps-tile.next .ps-node { box-sizing: border-box; border: 3px solid var(--t-accent); background: #111214; color: var(--t-text); }
.pa-chips { background: none; box-shadow: none; color: var(--t-text); }
.pa-chips > svg { display: none; }
.pa-chips::before { content: ""; width: 60%; height: 60%; border-radius: 50%; box-sizing: border-box; border: 4px dashed #F2F2EE; background: var(--c-red); margin-bottom: 3px; }
.pa-chips b { font-family: var(--t-display); font-weight: 900; }
.pa-emote { background: #F2F2EE; color: #111214; font-family: var(--t-display); font-weight: 900; text-transform: uppercase; }
.pa-emote::after { border-top-color: #F2F2EE; }
.pa-av { background: var(--t-panel2); box-shadow: none; }
.wheel-wrap { width: 300px; height: 300px; margin: 24px auto 0; }
.wheel-pointer { top: -16px; margin-left: -14px; border-left-width: 14px; border-right-width: 14px; border-top: 26px solid #F2F2EE; }
.wheel { filter: drop-shadow(0 20px 40px rgba(0,0,0,0.55)); }
.spin-result .disp { font-size: 44px; color: var(--t-accent); }
.ladder-me { border: none; background: var(--t-raise); border-radius: 14px; box-shadow: inset 0 0 0 2px var(--lc, var(--t-accent)); }
.ladder-tier { border: none !important; background: var(--t-raise); border-radius: 14px; }
.ladder-tier.here { box-shadow: inset 0 0 0 2px var(--lc, var(--t-accent)); }
.ladder-div { background: #111214; border: none; border-radius: 8px; }
.ladder-div.here { box-shadow: inset 0 0 0 1.5px var(--lc, var(--t-accent)); }
.ladder-h { font-family: var(--t-display); font-weight: 900; font-size: 22px; text-transform: uppercase; letter-spacing: 0.02em; }
.prestige-box { border: none; background: var(--t-raise); border-radius: 14px; position: relative; overflow: hidden; padding-top: 18px; }
.prestige-box::before { content: ""; position: absolute; left: 0; right: 0; top: 0; height: 6px; background: repeating-linear-gradient(90deg, #EDB000 0 14px, #111214 14px 20px); }
.perk { background: #111214; }
.perk.got { background: rgba(237,176,0,0.12); color: var(--t-text); }
.season-end .se-title { font-family: var(--t-display); font-weight: 900; font-size: 54px; line-height: 0.88; text-transform: uppercase; }
.se-kicker { letter-spacing: 0.3em; }

/* ---------- shop, ranks, coach, profile ---------- */
.sec-label { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; margin: 0 4px 10px; }
.sec-label h2 { margin: 0; font-family: var(--t-display); font-weight: 800; font-size: 22px; letter-spacing: 0.04em; text-transform: uppercase; color: var(--t-text); }
.sec-label span { font-size: 12px; color: var(--t-mid); }
.cos-grid { gap: 8px; }
.cos-tile { background: var(--t-panel); border: none; border-radius: 14px; padding: 12px 8px 10px; }
.cos-tile.on { box-shadow: inset 0 0 0 2px var(--t-accent); border: none; }
.cos-name { font-size: 13px; font-weight: 600; }
.felt-sw { border-width: 5px; }
.avatar-tile { background: var(--t-panel); border: none; border-radius: 14px; }
.title-row { border-radius: 14px; }
.title-row.on { box-shadow: inset 0 0 0 2px var(--t-accent); border: none; }
.title-tag { font-family: var(--t-display); font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; }
.lb-row { background: var(--t-panel); border: none; border-radius: 12px; min-height: 54px; }
.lb-row.lb-pinned, .lb-dock .lb-row { background: var(--t-raise); box-shadow: inset 0 0 0 2px var(--t-accent); }
.lb-dock { background: linear-gradient(180deg, rgba(17,18,20,0) 0%, var(--t-bg) 30%); }
.scope-toggle { background: var(--t-panel); border-radius: 10px; padding: 3px; }
.scope-toggle button { font-family: var(--t-display); font-weight: 800; font-size: 14px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--t-mid); min-height: 32px; }
.scope-toggle button.on { background: var(--t-panel2); color: var(--t-text); }
.report { background: var(--t-panel); border: none; border-radius: 18px; }
.report-head { font-family: var(--t-display); font-weight: 800; font-size: 20px; letter-spacing: 0.04em; text-transform: uppercase; color: var(--t-text); }
.spark > div { border-radius: 3px 3px 0 0; }
.profile-av { width: 84px; height: 84px; }
.name-btn { font-family: var(--t-display); font-weight: 900; font-size: 34px; text-transform: uppercase; letter-spacing: 0.02em; }
.frame-swatch { font-family: var(--t-display); font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; font-size: 14px; }
.title-btn { background: var(--t-panel2); border: none; }
.friend-row { background: var(--t-panel); border-radius: 14px; }
.friend-sub { font-size: 11px; font-weight: 700; letter-spacing: 0.16em; color: var(--t-mid); }
.fp-name { font-family: var(--t-display); font-weight: 900; font-size: 40px; line-height: 0.9; text-transform: uppercase; }
.fp-rank { background: var(--t-raise); border: none; }
.fp-stats > div { background: var(--t-raise); border: none; }
.fp-stats b { font-family: var(--t-display); font-weight: 900; font-size: 22px; }
.live-dot { background: var(--c-green); box-shadow: 0 0 0 2px var(--t-panel); }
.auth-field > span { font-size: 11px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: var(--t-mid); }
.auth-err { background: rgba(255,88,77,0.1); border: none; box-shadow: inset 0 0 0 1.5px rgba(255,88,77,0.4); }
.auth-switch button { color: var(--t-accent); }
.ft-card { background: var(--t-panel); border: none; }
.chal { border: none; }

/* ranks podium */
.podium { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); align-items: end; gap: 8px; padding: 8px 0 0; margin-bottom: 6px; }
.pod { display: flex; flex-direction: column; align-items: center; gap: 0; background: none; border: none; padding: 0; color: var(--t-text); cursor: pointer; min-width: 0; }
.pod:disabled { cursor: default; opacity: 1; }
.pod-av { border-radius: 50%; display: block; margin-top: 4px; }
.pod-av > * { display: block; }
.pod-letter { border-radius: 50%; display: flex !important; align-items: center; justify-content: center; font-family: var(--t-display); font-weight: 900; font-size: 26px; color: #F2F2EE; }
.pod-name { max-width: 100%; font-weight: 700; font-size: 14px; margin-top: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pod-val { font-family: var(--t-display); font-weight: 800; font-size: 19px; line-height: 1.1; }
.pod-block { align-self: stretch; position: relative; margin-top: 6px; border-radius: 10px 10px 0 0; background: var(--t-panel); overflow: hidden; display: flex; justify-content: center; }
.pod.first .pod-block { background: var(--t-raise); }
.pod-block::before { content: ""; position: absolute; left: 0; right: 0; top: 0; height: 6px; background: repeating-linear-gradient(90deg, var(--sc) 0 10px, #F2F2EE 10px 15px); }
.pod-block b { font-family: var(--t-display); font-weight: 900; font-size: 34px; line-height: 1; padding-top: 14px; color: var(--t-mid); }
.pod.first .pod-block b { font-size: 46px; color: var(--t-accent); }
/* profile identity card */
.id-card { border-radius: 20px; background: var(--t-panel); overflow: hidden; margin-bottom: 22px; }
.id-top { display: flex; align-items: center; gap: 18px; padding: 20px 18px 12px; }
.id-top .profile-av { margin: 6px; flex-shrink: 0; }
.id-top .name-btn { padding: 0; text-align: left; justify-content: flex-start; color: var(--t-text); max-width: 100%; }
.id-top .name-btn > span:first-child { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.id-top .title-btn { margin-top: 8px; }
.id-pills { display: flex; flex-wrap: wrap; gap: 8px; padding: 4px 18px 18px; }
.seat-open { min-height: 92px; border: 2px dashed #3A3D44; background: transparent; align-items: center; justify-content: center; color: var(--t-mid); gap: 4px; cursor: pointer; font-family: inherit; }
.seat-open::before { display: none; }
.seat-open .disp { color: var(--t-text); }
.seat .emote-bubble { z-index: 6; }
.ot-watch { padding: 14px 16px !important; }
.ot-last { background: #111214; color: var(--t-text); font-family: var(--t-display); font-weight: 800; font-size: 13px; letter-spacing: 0.06em; text-transform: uppercase; }
/* rank ladder as chips */
.lad-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.lad-row { padding: 10px 14px; border-radius: 14px; background: var(--t-raise); }
.lad-row.here { padding: 12px 14px 14px; box-shadow: inset 0 0 0 2px var(--lc); }
.lad-name { display: block; font-family: var(--t-display); font-weight: 900; font-size: 24px; line-height: 1; text-transform: uppercase; letter-spacing: 0.02em; }
.lad-sub { display: block; font-size: 12px; color: var(--t-mid); margin-top: 3px; }
.lad-you { padding: 3px 8px; border-radius: 6px; background: var(--lc); color: #111214; font-family: var(--t-display); font-weight: 900; font-size: 14px; letter-spacing: 0.06em; white-space: nowrap; }
.lad-divs { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; margin-top: 12px; }
.lad-seg { height: 8px; border-radius: 3px; background: var(--t-track); overflow: hidden; }
.lad-seg > div { height: 100%; background: var(--lc); }
.lad-dl { font-family: var(--t-display); font-weight: 800; font-size: 14px; color: var(--t-mid); margin-top: 4px; }
.lad-dl.on { color: var(--t-text); }
.lad-prestige { position: relative; overflow: hidden; margin-top: 14px; padding: 20px 14px 14px; border-radius: 16px; background: var(--t-raise); }
.lad-prestige::before { content: ""; position: absolute; left: 0; right: 0; top: 0; height: 8px; background: repeating-linear-gradient(90deg, #EDB000 0 16px, #111214 16px 22px); }
.lad-perks { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; margin-top: 10px; }
.lad-perk { padding: 8px; border-radius: 10px; background: #111214; }
.lad-perk.got { box-shadow: inset 0 0 0 1.5px var(--t-accent); }
.lad-how { display: flex; align-items: center; gap: 6px; margin: 16px 0 6px; background: none; border: none; padding: 6px 0; color: var(--t-text); font-family: var(--t-display); font-weight: 800; font-size: 18px; letter-spacing: 0.04em; text-transform: uppercase; cursor: pointer; min-height: 44px; }
.av-tier { position: absolute; right: -4px; bottom: -4px; border-radius: 50%; box-shadow: 0 0 0 2px var(--t-panel); display: block; }
.lb-row .av-tier, .friend-row .av-tier { box-shadow: 0 0 0 2px var(--t-panel); }
/* profile */
.panel-head { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; margin-bottom: 12px; }
.stat { padding: 12px 14px; border-radius: 14px; }
.rk-recent { min-width: 34px; padding: 5px 6px; border-radius: 6px; text-align: center; font-family: var(--t-display); font-weight: 900; font-size: 14px; line-height: 1; }
.frame-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 6px; }
.frame-chip { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 8px 2px; border-radius: 12px; border: none; background: #111214; color: var(--t-text); cursor: pointer; font-family: var(--t-display); font-weight: 800; font-size: 13px; letter-spacing: 0.04em; text-transform: uppercase; }
.frame-chip:disabled { opacity: 0.4; cursor: default; }
.frame-chip.on { box-shadow: inset 0 0 0 2px var(--lc); }
.frame-chip span { min-height: 14px; display: flex; align-items: center; }
.ach-chips { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 6px; }
.ach-chip { position: relative; width: 100%; padding-top: 100%; height: 0; border-radius: 50%; border: none; background: #24262B; cursor: pointer; }
.ach-chip::after { content: ""; position: absolute; top: 0; left: 0; right: 0; bottom: 0; border-radius: 50%; box-sizing: border-box; border: 4px dashed #3A3D44; }
.ach-chip.got { background: var(--cc); }
.ach-chip.got::after { border-color: #F2F2EE; }
.ach-chip.sel { box-shadow: 0 0 0 3px var(--t-bg), 0 0 0 5px var(--t-text); }
.set-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 58px; padding: 8px 0; border-bottom: 1px solid var(--rule); }
.set-link { display: flex; align-items: center; gap: 12px; width: 100%; min-height: 58px; padding: 8px 0; background: none; border: none; border-bottom: 1px solid var(--rule); color: var(--t-mid); text-align: left; cursor: pointer; font-family: inherit; }
.set-link:last-child { border-bottom: none; }
.set-link > span:first-child { flex: 1; min-width: 0; }
.set-link b { display: block; font-size: 14.5px; font-weight: 600; color: var(--t-text); }
.set-link i { display: block; font-style: normal; font-size: 12px; color: var(--t-mid); margin-top: 1px; }
/* friends */
.fr-add { flex: 1; display: flex; align-items: center; gap: 8px; padding: 0 12px; min-height: 50px; border-radius: 12px; background: var(--t-panel); color: var(--t-mid); }
.fr-add input { flex: 1; min-width: 0; border: none; background: transparent; color: var(--t-text); font-size: 16px; outline: none; }
.fr-req { border-radius: 16px; background: var(--t-panel); overflow: hidden; margin-bottom: 10px; }
.fr-h { padding: 8px 4px 8px; }
.fr-list { border-radius: 16px; background: var(--t-panel); padding: 0 14px; margin-bottom: 8px; }
.fr-row { display: flex; align-items: center; gap: 12px; width: 100%; min-height: 66px; padding: 8px 0; background: none; border: none; border-bottom: 1px solid var(--rule); color: var(--t-text); cursor: pointer; font-family: inherit; }
.fr-row:last-child { border-bottom: none; }
.fr-name { display: flex; align-items: center; gap: 5px; font-size: 15px; font-weight: 700; white-space: nowrap; overflow: hidden; }
.fr-sub { display: block; font-size: 12.5px; color: var(--t-mid); margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.fr-rank { display: flex; flex-direction: column; align-items: flex-end; font-family: var(--t-display); font-weight: 800; font-size: 15px; letter-spacing: 0.04em; text-transform: uppercase; flex-shrink: 0; }
.fr-rank i { font-style: normal; font-family: var(--t-body); font-size: 11.5px; font-weight: 600; letter-spacing: 0; text-transform: none; color: var(--t-mid); }
/* ---------- full-screen pages ---------- */
.fs-page { position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 32; background: var(--t-bg); overflow-y: auto; overflow-x: hidden; -webkit-overflow-scrolling: touch; animation: screenIn .2s ease; }
.fs-inner { position: relative; z-index: 1; max-width: 440px; min-height: 100%; margin: 0 auto; box-sizing: border-box; padding: calc(env(safe-area-inset-top) + 30px) 18px calc(env(safe-area-inset-bottom) + 22px); display: flex; flex-direction: column; }
.fs-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
.fs-title { margin: 0; font-family: var(--t-display); font-weight: 900; font-size: 40px; line-height: 0.88; letter-spacing: 0.02em; text-transform: uppercase; }
.fs-bottom { margin-top: auto; padding-top: 24px; display: flex; flex-direction: column; align-items: center; align-self: stretch; }
.fs-bottom .big-cta { margin-top: 0; }
.fs-foot { font-size: 12px; color: var(--t-mid); margin-top: 10px; text-align: center; }
/* spin */
.spin-page .wheel-wrap { position: relative; width: 330px; max-width: 86vw; height: auto; margin: 44px auto 0; }
.spin-page .wheel-wrap::before { content: ""; display: block; padding-top: 100%; }
.spin-page .wheel { position: absolute; top: 0; left: 0; width: 100%; height: 100%; filter: drop-shadow(0 24px 40px rgba(0,0,0,0.55)); }
.spin-page .wheel-pointer { top: -8px; }
.spin-note { margin: 36px 0 0; text-align: center; font-size: 14px; line-height: 1.5; color: var(--t-mid); }
.spin-note b { color: var(--t-text); }
.spin-page .spin-result { margin-top: 28px; text-align: center; }
.spin-page .spin-result .disp { font-size: 54px; color: var(--t-accent); margin-top: 4px; }
/* ranked results */
.results.rr { align-items: flex-start; padding: calc(env(safe-area-inset-top) + 22px) 18px calc(env(safe-area-inset-bottom) + 20px); background: var(--t-bg); }
.rr .results-inner { max-width: 420px; min-height: 100%; margin: 0 auto; }
.rr-top { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; font-size: 12px; color: var(--t-mid); }
.rr-head { display: flex; justify-content: space-between; align-items: flex-end; gap: 12px; margin: 12px 0 18px; }
.rr-place { font-family: var(--t-display); font-weight: 900; font-size: 116px; line-height: 0.8; text-transform: uppercase; }
.rr-of { font-family: var(--t-display); font-weight: 800; font-size: 22px; line-height: 1; text-transform: uppercase; letter-spacing: 0.02em; color: var(--t-sub); margin-top: 8px; }
.rr-rp { text-align: right; flex-shrink: 0; }
.rr-rp b { display: block; font-family: var(--t-display); font-weight: 900; font-size: 62px; line-height: 0.85; text-transform: uppercase; }
.rr-rp span { display: block; font-size: 11px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: var(--t-mid); margin-top: 6px; }
.rr-card { border-radius: 16px; background: var(--t-panel); overflow: hidden; margin-bottom: 10px; }
.rr-body { padding: 14px 16px 16px; }
.rr-body .pl-dots { justify-content: flex-start; }
.rr-row1 { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; font-size: 12.5px; color: var(--t-mid); }
.rr-rank { font-family: var(--t-display); font-weight: 900; font-size: 40px; line-height: 0.95; text-transform: uppercase; margin-top: 4px; }
.rr-rank.big { font-size: 52px; text-align: center; margin-top: 6px; }
.rr .rk-segs { margin-top: 12px; }
.rr-small { font-size: 12.5px; color: var(--t-mid); line-height: 1.45; }
.rr-unlock { display: flex; align-items: center; gap: 10px; margin-top: 12px; padding: 10px 12px; border-radius: 12px; background: #111214; box-shadow: inset 0 0 0 1.5px var(--lc); font-size: 13px; color: var(--t-text2); line-height: 1.35; }
.rr-lines { margin-top: 12px; border-top: 1px solid var(--rule); padding-top: 2px; }
.rr-lines > div { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; padding-top: 8px; font-size: 13px; color: var(--t-mid); }
.rr-lines b { font-family: var(--t-display); font-weight: 800; font-size: 17px; }
.rr-stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; margin-bottom: 10px; }
.rr-stats > div { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 12px 4px 10px; border-radius: 12px; background: var(--t-panel); text-align: center; min-width: 0; }
.rr-stats b { font-family: var(--t-display); font-weight: 900; font-size: 26px; line-height: 1; white-space: nowrap; }
.rr-stats span { font-size: 9.5px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--t-mid); margin-top: 6px; }
.rr-stand { border-radius: 16px; background: var(--t-panel); padding: 2px 16px; margin-bottom: 10px; }
.rr-srow { display: flex; align-items: center; gap: 14px; min-height: 46px; border-bottom: 1px solid var(--rule); }
.rr-srow:last-child { border-bottom: none; }
.rr-spl { width: 40px; flex-shrink: 0; font-family: var(--t-display); font-weight: 900; font-size: 20px; text-transform: uppercase; }
.rr-sname { flex: 1; min-width: 0; font-size: 14px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rr-srow b { font-family: var(--t-display); font-weight: 800; font-size: 19px; }
.rr-srow i { font-style: normal; font-size: 12.5px; color: var(--t-mid); white-space: nowrap; }
.rr-srow.out .rr-spl, .rr-srow.out .rr-sname { color: var(--t-mid); }
.rr-srow.me .rr-sname { color: var(--t-accent); }
.rr-btns { margin-top: auto; padding-top: 14px; }
.rr-btns .big-cta { margin-top: 0; margin-bottom: 8px; }
.rr-two { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.rr-two .btn { min-height: 54px; }
.rr-need { font-size: 12.5px; color: var(--t-mid); text-align: center; margin-bottom: 10px; }
.rr-placed { display: flex; flex-direction: column; align-items: center; margin: 22px 0 18px; text-align: center; }
.rr-skill { display: flex; align-items: center; gap: 14px; padding: 14px 16px; }
.rr-h { margin: 0; font-family: var(--t-display); font-weight: 800; font-size: 20px; letter-spacing: 0.04em; text-transform: uppercase; }
.rr-report { margin: 8px 0 0; font-size: 14px; line-height: 1.55; color: var(--t-text2); }
.rr .rr-wait { align-items: center; justify-content: center; text-align: center; }
.pl-dots { display: flex; gap: 6px; justify-content: center; }
.pl-dot { display: block; border-radius: 50%; box-sizing: border-box; border: 2px dashed #3A3D44; }
.pl-dot.w { background: var(--c-green); border-color: rgba(242,242,238,0.9); }
.pl-dot.l { background: var(--c-red); border-color: rgba(242,242,238,0.9); }
/* season end */
.se-page .fs-inner { text-align: center; align-items: center; }
.se-rays { position: absolute; top: 0; left: 0; right: 0; height: 78%; pointer-events: none; background: repeating-conic-gradient(from 0deg at 50% 46%, var(--rc) 0deg 8deg, transparent 8deg 20deg); -webkit-mask-image: radial-gradient(circle at 50% 46%, #000 25%, transparent 72%); mask-image: radial-gradient(circle at 50% 46%, #000 25%, transparent 72%); }
.se-kick { margin-top: 18px; letter-spacing: 0.3em; }
.se-big { margin: 12px 0 0; font-family: var(--t-display); font-weight: 900; font-size: 60px; line-height: 0.86; text-transform: uppercase; letter-spacing: 0.01em; }
.se-emblem { margin: 40px 0 22px; }
.se-pchip { position: relative; width: 150px; height: 150px; border-radius: 50%; box-sizing: border-box; border: 13px dashed #F2F2EE; background: #EDB000; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #111214; box-shadow: 0 0 0 6px #111214, 0 18px 40px rgba(0,0,0,0.5); }
.se-pchip b { font-family: var(--t-display); font-weight: 900; font-size: 58px; line-height: 0.85; }
.se-pchip > span:last-child { font-size: 10px; font-weight: 800; letter-spacing: 0.2em; text-transform: uppercase; margin-top: 4px; }
.se-crown { position: absolute; top: -50px; left: 50%; margin-left: -17px; color: #EDB000; }
.se-copy { margin: 0 0 18px; font-size: 14.5px; line-height: 1.5; color: var(--t-sub); max-width: 330px; }
.se-rows { align-self: stretch; display: flex; flex-direction: column; gap: 8px; text-align: left; }
.se-row { display: flex; align-items: center; gap: 14px; padding: 14px 16px; border-radius: 14px; background: var(--t-panel); }
.se-row > b { flex: 1; min-width: 0; font-size: 14.5px; font-weight: 700; }
.se-row span b { display: block; font-size: 14.5px; font-weight: 700; }
.se-row i { display: block; font-style: normal; font-size: 12px; color: var(--t-mid); margin-top: 2px; line-height: 1.35; }
.se-row em { font-style: normal; font-family: var(--t-display); font-weight: 900; font-size: 22px; text-transform: uppercase; flex-shrink: 0; }
/* coach */
.co-card { border-radius: 18px; background: var(--t-panel); padding: 14px 16px 16px; margin-bottom: 12px; }
.co-hero { display: flex; align-items: center; gap: 18px; padding: 16px; }
.co-sub { font-size: 12.5px; line-height: 1.4; color: var(--t-mid); margin-top: 6px; }
.co-h { margin: 0; font-family: var(--t-display); font-weight: 800; font-size: 20px; letter-spacing: 0.04em; text-transform: uppercase; }
.co-report { margin: 8px 0 0; font-size: 14px; line-height: 1.55; color: var(--t-text2); }
.co-list { padding: 4px 16px; }
.co-row { display: block; width: 100%; padding: 11px 0; background: none; border: none; border-bottom: 1px solid var(--rule); color: var(--t-text); text-align: left; cursor: pointer; font-family: inherit; }
.co-row:last-child { border-bottom: none; }
.co-top { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; }
.co-name { font-size: 14px; font-weight: 600; }
.co-name i { font-style: normal; font-size: 11px; color: var(--t-mid); font-weight: 500; }
.co-top b { font-family: var(--t-display); font-weight: 900; font-size: 21px; line-height: 1; }
.co-bar { display: block; height: 6px; border-radius: 3px; background: var(--t-track); margin-top: 7px; overflow: hidden; }
.co-bar span { display: block; height: 100%; border-radius: 3px; }
.co-detail { display: block; font-size: 12px; color: var(--t-mid); line-height: 1.4; margin-top: 7px; }
.co-headrow { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; }
.co-headrow > span { font-size: 12px; color: var(--t-mid); }
.co-bars { display: flex; align-items: flex-end; gap: 4px; height: 64px; margin-top: 14px; }
.co-bars span { flex: 1; min-width: 0; border-radius: 2px; }
.co-legend { display: flex; gap: 16px; margin-top: 12px; font-size: 12px; color: var(--t-mid); }
.co-legend span { display: inline-flex; align-items: center; gap: 6px; }
.co-legend i { width: 9px; height: 9px; border-radius: 2px; }
.sec-label .co-pts { font-family: var(--t-display); font-weight: 800; font-size: 20px; letter-spacing: 0.04em; text-transform: uppercase; color: var(--t-text); }
.co-trow { display: flex; align-items: center; gap: 12px; min-height: 52px; border-bottom: 1px solid var(--rule); }
.co-trow:last-child { border-bottom: none; }
.co-place { width: 44px; flex-shrink: 0; font-family: var(--t-display); font-weight: 900; font-size: 24px; text-transform: uppercase; }
.co-tmeta { flex: 1; min-width: 0; font-size: 13px; }
.co-tmeta i { font-style: normal; color: var(--t-mid); }
.co-trow b { font-family: var(--t-display); font-weight: 800; font-size: 19px; }
.co-foot { font-size: 11.5px; color: var(--t-faint); margin: 2px 4px 0; line-height: 1.5; }
/* shop */
.sh-feat { position: relative; display: flex; align-items: center; gap: 8px; padding: 16px 16px 18px; border-radius: 18px; background: var(--t-panel); overflow: hidden; margin-bottom: 24px; }
.sh-blurb { font-size: 12.5px; color: var(--t-mid); margin-top: 6px; line-height: 1.4; }
.sh-buy { margin-top: 14px; min-height: 44px; padding: 10px 16px; font-size: 20px; }
.sh-feat-art { width: 132px; height: 110px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; margin-right: -4px; }
.sh-scroll { display: flex; gap: 8px; overflow-x: auto; margin: 0 -16px 24px; padding: 0 16px 2px; scroll-padding: 0 16px; scroll-snap-type: x proximity; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
.sh-scroll::-webkit-scrollbar { display: none; }
.sh-scroll > .sh-tile { flex: 0 0 108px; scroll-snap-align: start; }
.sh-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin-bottom: 24px; }
.sh-tile { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; padding: 10px 10px 12px; border-radius: 14px; border: none; background: var(--t-panel); color: var(--t-text); text-align: left; cursor: pointer; font-family: inherit; min-width: 0; }
.sh-tile:disabled { cursor: default; }
.sh-tile:active:not(:disabled) { transform: scale(0.97); }
.sh-prev { align-self: stretch; height: 84px; display: flex; align-items: center; justify-content: center; margin-bottom: 8px; }
.sh-grid .sh-prev { height: 56px; }
.sh-name { font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
.sh-st { display: inline-flex; align-items: center; gap: 5px; font-family: var(--t-display); font-weight: 800; font-size: 17px; letter-spacing: 0.04em; text-transform: uppercase; line-height: 1.1; white-space: nowrap; }
.sh-st.eq { color: var(--t-text); }
.sh-st.own { color: var(--t-mid); }
.sh-st.pass { color: #B27DFF; }
.sh-st.pres { color: var(--t-accent); }
.sh-st.buy { color: var(--t-text); }
.sh-st.poor { color: var(--t-mid); }
.sh-dot { width: 11px; height: 11px; border-radius: 50%; box-sizing: border-box; border: 2px dashed #F2F2EE; background: var(--c-red); flex-shrink: 0; }
.sh-titles { border-radius: 18px; background: var(--t-panel); padding: 2px 14px; }
.sh-trow { display: flex; align-items: center; gap: 10px; min-height: 57px; border-bottom: 1px solid var(--rule); }
.sh-trow:last-child { border-bottom: none; }
.title-pill { display: inline-block; padding: 4px 8px; border-radius: 6px; font-family: var(--t-display); font-weight: 800; font-size: 16px; letter-spacing: 0.04em; text-transform: uppercase; line-height: 1.1; white-space: nowrap; }
.sh-rar { flex: 1; min-width: 0; font-size: 12px; color: var(--t-mid); text-transform: capitalize; }
.sh-price { min-height: 40px; padding: 0 12px; border-radius: 10px; border: none; background: var(--t-panel2); color: var(--t-text); font-family: var(--t-display); font-weight: 800; font-size: 18px; letter-spacing: 0.02em; cursor: pointer; }
.sh-price:disabled { color: var(--t-mid); cursor: default; opacity: 0.7; }
.sh-note { font-size: 11.5px; color: var(--t-faint); margin: 8px 4px 24px; }
.sh-scroll.sh-avs { gap: 10px; padding-top: 6px; padding-bottom: 6px; }
.sh-av { flex: 0 0 auto; display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 0; border: none; background: none; color: var(--t-text); cursor: pointer; font-family: inherit; }
.sh-av-c { width: 66px; height: 66px; border-radius: 50%; background: var(--t-panel2); display: flex; align-items: center; justify-content: center; font-size: 32px; }
.sh-av.on .sh-av-c { box-shadow: 0 0 0 3px var(--t-bg), 0 0 0 6px var(--t-accent); }
.sh-av:disabled { cursor: default; }
.sh-av .sh-st { font-size: 14px; }
.cs-sw { display: flex; align-items: center; }
.cs-sw span { width: 34px; height: 34px; border-radius: 50%; box-sizing: border-box; border: 4px dashed #F2F2EE; margin-left: -10px; box-shadow: 0 0 0 2px var(--t-panel); }
.cs-sw span:first-child { margin-left: 0; }
/* friend profile */
.fp-close { position: absolute; top: 26px; right: 18px; z-index: 2; }
.fp-hero { display: flex; flex-direction: column; align-items: center; text-align: center; padding-top: 18px; }
.fp-av { position: relative; padding: 5px; border-radius: 50%; box-shadow: inset 0 0 0 3px var(--rc); }
.fp-big { display: flex; align-items: center; gap: 8px; margin-top: 12px; font-family: var(--t-display); font-weight: 900; font-size: 40px; line-height: 0.95; text-transform: uppercase; max-width: 100%; }
.fp-big > span:first-child { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fp-at { font-size: 13px; color: var(--t-mid); margin-top: 4px; }
.fp-pill { display: flex; align-items: center; gap: 10px; margin-top: 16px; padding: 12px 14px; border-radius: 12px; background: var(--t-raise); font-size: 13.5px; font-weight: 600; color: var(--t-mid); }
.fp-pill i { width: 10px; height: 10px; border-radius: 50%; background: #5A5E66; flex-shrink: 0; }
.fp-pill.on { background: rgba(0,165,96,0.14); color: var(--t-good); }
.fp-pill.on i { background: var(--c-green); box-shadow: 0 0 0 3px rgba(0,165,96,0.25); }
.fp-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 10px; }
.fp-grid > div { padding: 12px 14px; border-radius: 14px; background: var(--t-raise); min-width: 0; }
.fp-grid b { display: block; font-family: var(--t-display); font-weight: 900; font-size: 26px; line-height: 1; text-transform: uppercase; margin-top: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.fp-grid i { display: block; font-style: normal; font-size: 11.5px; color: var(--t-mid); margin-top: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.fp-remove { display: block; margin: 16px auto 0; padding: 10px 14px; background: none; border: none; color: var(--t-bad); font-size: 13.5px; font-weight: 700; cursor: pointer; font-family: inherit; }
/* sign in */
.auth-chips { position: absolute; top: calc(env(safe-area-inset-top) + 50px); right: -46px; width: 210px; height: 212px; pointer-events: none; }
.auth-chips span { position: absolute; width: 124px; height: 124px; border-radius: 50%; box-sizing: border-box; border: 11px dashed #F2F2EE; background: var(--cc); box-shadow: 0 12px 30px rgba(0,0,0,0.45); }
.auth-chips span:nth-child(1) { left: 0; top: 38px; }
.auth-chips span:nth-child(2) { left: 70px; top: 0; }
.auth-chips span:nth-child(3) { left: 80px; top: 88px; }
.auth-hero { margin-top: 150px; }
.auth-logo { font-size: 112px; margin-left: -4px; }
.auth-blurb { margin: 22px 0 0; font-size: 15px; line-height: 1.5; color: var(--t-sub); max-width: 330px; }
.auth-seg { display: flex; margin: 26px 0 18px; }
.auth-seg .segbtn { flex: 1; min-height: 46px; font-size: 18px; }
.auth-page .auth-form { gap: 14px; }
.auth-page .auth-form > .auth-field:first-child { margin-top: 0; }
.auth-page .input { background: var(--t-panel); border: 2px solid var(--t-track); min-height: 52px; font-size: 16px; }
.auth-page .input:focus { border-color: #5A5E66; outline: none; }
.auth-page .auth-form .big-cta { margin-top: 4px; }
.auth-guest { background: none; border: none; color: var(--t-text); font-size: 14.5px; font-weight: 700; text-decoration: underline; text-underline-offset: 4px; cursor: pointer; padding: 8px; font-family: inherit; }
@media (max-height: 740px) { .auth-hero { margin-top: 108px; } .auth-logo { font-size: 92px; } .auth-chips { transform: scale(0.8); transform-origin: top right; } }
/* play friends sheet */
.ftc { border-radius: 16px; background: var(--t-raise); padding: 14px; margin-bottom: 10px; }
.ft-mine { display: flex; align-items: center; gap: 12px; }
.ft-dot { width: 12px; height: 12px; border-radius: 50%; background: var(--c-green); box-shadow: 0 0 0 4px rgba(0,165,96,0.25); flex-shrink: 0; }
.ft-mine-t { font-size: 22px; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ft-h { margin: 0; font-family: var(--t-display); font-weight: 800; font-size: 21px; letter-spacing: 0.04em; text-transform: uppercase; }
.ft-sub { font-size: 12.5px; color: var(--t-mid); margin-top: 2px; }
.ft-code { display: flex; gap: 8px; margin-top: 12px; }
.code-boxes { position: relative; flex: 1; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; cursor: text; }
.code-real { position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0; border: none; padding: 0; font-size: 16px; color: transparent; background: transparent; caret-color: transparent; z-index: 1; }
.cbox { height: 54px; border-radius: 10px; background: #111214; box-shadow: inset 0 0 0 1.5px #3A3D44; display: flex; align-items: center; justify-content: center; font-family: var(--t-display); font-weight: 900; font-size: 30px; color: var(--t-text); }
.cbox.cur { box-shadow: inset 0 0 0 2px var(--t-accent); }
.ft-join { flex: 0 0 88px; min-height: 54px; }
.ft-line { display: flex; align-items: center; gap: 10px; margin-top: 12px; }
.ft-line > .lbl { width: 56px; flex-shrink: 0; font-size: 10.5px; }
.ft-opts { flex: 1; min-width: 0; display: flex; gap: 6px; }
.ft-opts.scroll { overflow-x: auto; scrollbar-width: none; -webkit-overflow-scrolling: touch; }
.ft-opts.scroll::-webkit-scrollbar { display: none; }
.ft-opt { flex: 1 1 0; min-width: 0; min-height: 40px; padding: 0 6px; border-radius: 10px; border: none; background: var(--t-panel2); color: var(--t-text); font-family: var(--t-display); font-weight: 800; font-size: 16px; letter-spacing: 0.02em; text-transform: uppercase; white-space: nowrap; cursor: pointer; }
.ft-opts.scroll .ft-opt { flex: 0 0 72px; }
.ft-opt.on { background: #F2F2EE; color: #111214; font-weight: 900; }
.ft-opt:disabled { opacity: 0.35; cursor: default; }
.ft-friendly { display: flex; align-items: center; gap: 12px; margin-top: 12px; padding: 12px 14px; border-radius: 12px; background: #111214; }
.ft-note { font-size: 12px; color: var(--t-mid); margin-top: 12px; line-height: 1.4; }
.ft-sheet .big-cta { margin-top: 4px; }
/* ranks board: every avatar sits in a chip the color of that player's rank */
.chip-av { position: relative; display: inline-flex; flex-shrink: 0; box-sizing: border-box; border-radius: 50%; }
.chip-av-ring { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 1; pointer-events: none; }
.chip-av .live-dot { z-index: 2; }
.lb-head { align-items: center; }
.lb-seg { margin-bottom: 10px; }
.lb-seg .segbtn.on { background: var(--t-accent); color: #111214; }
.lb-note { font-size: 12px; color: var(--t-mid); margin: 0 4px 12px; }
.lb-list { border-radius: 18px; background: var(--t-panel); padding: 0 14px; }
.lb-item { display: flex; align-items: center; gap: 12px; width: 100%; min-height: 66px; padding: 8px 0; background: none; border: none; border-bottom: 1px solid var(--rule); color: var(--t-text); text-align: left; font-family: inherit; }
.lb-item:last-child { border-bottom: none; }
.lb-item:disabled { opacity: 1; cursor: default; }
.lb-item.tap { cursor: pointer; }
.lb-item.tap:active { opacity: 0.8; }
.lb-pl { min-width: 28px; flex-shrink: 0; font-family: var(--t-display); font-weight: 900; font-size: 22px; color: var(--t-mid); }
.lb-item.you .lb-pl { color: var(--t-accent); }
.lb-nm { display: flex; align-items: center; gap: 6px; font-size: 15px; font-weight: 700; white-space: nowrap; overflow: hidden; }
.lb-tag { font-family: var(--t-display); font-weight: 800; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--t-accent); flex-shrink: 0; }
.lb-tag.friend { color: var(--t-good); }
.lb-tier { display: block; font-size: 12.5px; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.lb-val { font-family: var(--t-display); font-weight: 900; font-size: 22px; flex-shrink: 0; }
.lb-empty { font-size: 12px; color: var(--t-faint); text-align: center; padding: 12px 0 8px; }
.lb-me { border-radius: 16px; background: var(--t-panel); box-shadow: inset 0 0 0 2px var(--t-accent); padding: 0 14px; margin-top: auto; }
.lb-me .lb-item { border-bottom: none; }
.lb-me .lb-pl { color: var(--t-accent); }
.pod-av { box-shadow: none !important; }
/* the felt wordmark: lowercase, a red diamond for the period */
.brand-logo { display: inline-flex; align-items: baseline; font-family: var(--t-body); font-weight: 700; line-height: 1; letter-spacing: -0.045em; text-transform: none; color: var(--t-text); }
.brand-logo svg { width: 0.21em; height: 0.21em; margin-left: 0.035em; flex-shrink: 0; }
.home-logo { font-size: 48px; margin-bottom: -6px; }
/* ---------- computer layout ---------- */
.app-col { width: 100%; max-width: 460px; height: 100%; }
.side-logo, .side-foot { display: none !important; }
.home-main, .home-side, .co-col { display: contents; }
.co-cols { display: flex; flex-direction: column; }
.hs-item:empty { display: none; }
.kh { display: none; }
@media (min-width: 1024px) {
  .app { flex-direction: row; align-items: stretch; }
  .bottom-nav { order: -1; width: 232px; max-width: none; height: 100%; flex-shrink: 0; display: flex; flex-direction: column; justify-content: flex-start; align-items: stretch; gap: 4px; padding: 30px 14px 26px 0; border-top: none; border-right: 1px solid var(--rule); background: #0B0C0E; }
  .bottom-nav .side-logo { display: inline-flex !important; order: -2; font-size: 44px; margin: 0 0 30px 26px; }
  .navbtn { flex: none; flex-direction: row; justify-content: flex-start; align-items: center; min-height: 54px; padding: 0 22px; border-top: none; border-left: 4px solid transparent; border-radius: 0 14px 14px 0; font-size: 21px; text-align: left; cursor: pointer; }
  .navbtn[data-k="home"] { order: -1; }
  .navbtn[aria-current="page"] { font-size: 21px; border-top: none; border-left-color: var(--t-accent); background: var(--t-panel); }
  .navbtn:hover { color: var(--t-text); }
  .side-foot { display: flex !important; flex-direction: column; order: 10; margin-top: auto; padding: 0 26px; }
  .side-foot b { font-family: var(--t-display); font-weight: 900; font-size: 30px; line-height: 1; }
  .side-foot span { font-size: 11px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: var(--t-mid); margin-top: 4px; }
  .app-main { padding-top: 0; }
  .app-col { max-width: 1200px; }
  .screen { max-width: none; padding: 30px 40px 60px; }
  .screen.scr-wide { padding-left: max(40px, calc((100% - 1120px) / 2)); padding-right: max(40px, calc((100% - 1120px) / 2)); }
  .screen.scr-mid { padding-left: max(40px, calc((100% - 940px) / 2)); padding-right: max(40px, calc((100% - 940px) / 2)); }
  .screen.scr-narrow { padding-left: max(40px, calc((100% - 760px) / 2)); padding-right: max(40px, calc((100% - 760px) / 2)); }
  .home-logo { display: none; }
  .home-head { margin-top: 4px; }
  .home-stack { display: grid; grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr); gap: 20px; align-items: start; }
  .home-main, .home-side { display: flex; flex-direction: column; gap: 14px; }
  .mode-chip .mc-disc { width: 118px; height: 118px; border-width: 11px; }
  .mode-chip .mc-core { width: 64px; height: 64px; font-size: 26px; }
  .co-cols { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 0 22px; align-items: start; }
  .co-col { display: block; }
  .sh-scroll { flex-wrap: wrap; overflow: visible; margin: 0 0 26px; padding: 0; }
  .sh-scroll > .sh-tile { flex: 0 0 140px; }
  .sh-scroll.sh-avs { gap: 14px; padding: 6px 0; }
  .sh-tile:hover:not(:disabled) { box-shadow: inset 0 0 0 2px #3A3D44; }
  .btn:hover:not(:disabled) { filter: brightness(1.08); }
  .fr-row:hover, .lb-item.tap:hover, .co-row:hover { background: rgba(255,255,255,0.025); }
}
/* the table on a computer: players around the oval, you and your buttons along the bottom */
@media (min-width: 1024px) and (min-height: 600px) {
  .table-wrap { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); grid-template-rows: auto auto minmax(0, 1fr) auto auto; grid-template-areas: "top top" "status status" "table table" "coach coach" "hero controls"; column-gap: 18px; max-width: 1240px; margin: 0 auto; padding: 18px 28px 22px; align-items: end; }
  .table-wrap > * { grid-column: 1 / -1; }
  .table-wrap .table-top { grid-area: top; max-width: none; }
  .table-wrap .status { grid-area: status; max-width: none; font-size: 12px; }
  .table-wrap .seats { grid-area: table; display: block; position: relative; z-index: 2; max-width: none; width: 100%; height: 100%; margin: 0; padding: 0 !important; pointer-events: none; }
  .table-wrap .seats .seat { position: absolute; left: var(--sx, 50%); top: var(--sy, 10%); width: 172px; transform: translate(-50%, -50%); pointer-events: auto; padding: 12px 10px 8px; }
  .table-wrap.crowded .seats .seat { width: 150px; }
  .table-wrap .seats .seat-name { font-size: 14px; }
  .table-wrap .seats .seat-stack { font-size: 22px; }
  .table-wrap .seats .seat .bot-av { width: 26px !important; height: 26px !important; font-size: 13px !important; }
  .table-wrap .seats .card.mini { width: 28px; height: 40px; font-size: 13px; }
  .table-wrap .seats .seat-cards { height: 42px; }
  .table-wrap .seats .seat-open { min-height: 110px; }
  .table-wrap .felt-center { grid-area: table; z-index: 1; position: relative; max-width: none; width: 100%; height: 100%; padding-top: 5%; box-sizing: border-box; }
  .table-wrap .felt-oval { width: 62%; max-width: 820px; height: 58%; min-height: 220px; max-height: 400px; justify-content: center; gap: 14px; padding: 20px 40px; }
  .table-wrap .felt-oval .card, .table-wrap .felt-oval .card-slot { width: 60px; height: 84px; font-size: 30px; border-radius: 9px; }
  .table-wrap .felt-logo { font-size: 120px; }
  .table-wrap .felt-center .banner { position: absolute; left: 50%; bottom: 1%; transform: translateX(-50%); width: 440px; max-width: 46%; z-index: 4; }
  .table-wrap .coach-panel, .table-wrap .tip { grid-area: coach; justify-self: center; width: 100%; max-width: 900px; margin: 8px 0 10px; }
  .table-wrap .hero-seat { grid-area: hero; max-width: none; align-self: stretch; padding: 16px 18px; }
  .table-wrap .hero-seat .card.big { width: 84px; height: 118px; font-size: 34px; border-radius: 11px; }
  .table-wrap .hero-seat .card.big.o4 { width: 64px; height: 90px; font-size: 26px; }
  .table-wrap .controls { grid-area: controls; max-width: none; align-self: end; padding-top: 0; }
  .table-wrap .controls .btn { min-height: 64px; }
  .kh { display: inline-block; margin-left: 8px; padding: 2px 6px; border-radius: 5px; background: rgba(0,0,0,0.18); font-family: var(--t-body); font-size: 11px; font-weight: 700; letter-spacing: 0.04em; line-height: 1.3; vertical-align: middle; opacity: 0.75; }
  .btn-go .kh, .btn-raise .kh { background: rgba(0,0,0,0.12); }
  .preset-btn .kh { margin-left: 6px; padding: 1px 5px; font-size: 10px; }
}
@media (min-width: 1024px) and (min-height: 600px) and (max-height: 820px) {
  .table-wrap .seats .seat { padding: 9px 8px 6px; gap: 2px; }
  .table-wrap .seats .seat-cards { height: 34px; }
  .table-wrap .seats .card.mini { width: 24px; height: 34px; font-size: 11px; }
  .table-wrap .felt-oval .card, .table-wrap .felt-oval .card-slot { width: 50px; height: 70px; font-size: 25px; }
  .table-wrap .hero-seat .card.big { width: 72px; height: 100px; font-size: 29px; }
}
@media (min-width: 1024px) and (min-height: 600px) and (max-height: 820px) {
  .table-wrap .felt-center { padding-top: 9%; }
  .table-wrap .felt-oval { height: 50%; min-height: 190px; }
}
/* admin error log */
.err-list { display: flex; flex-direction: column; gap: 6px; max-height: 52vh; overflow-y: auto; }
.err-row { display: flex; flex-direction: column; align-items: stretch; gap: 3px; width: 100%; padding: 10px 12px; border: none; border-radius: 12px; background: var(--t-raise); color: var(--t-text); text-align: left; cursor: pointer; font-family: inherit; }
.err-top { display: flex; justify-content: space-between; gap: 10px; align-items: baseline; }
.err-top b { font-size: 13px; font-weight: 700; line-height: 1.35; word-break: break-word; }
.err-top i { font-style: normal; font-family: var(--t-display); font-weight: 900; font-size: 18px; color: var(--t-bad); flex-shrink: 0; }
.err-meta { font-size: 11.5px; color: var(--t-mid); }
.err-stack { margin: 6px 0 0; padding: 8px 10px; border-radius: 8px; background: #111214; color: var(--t-sub); font-size: 10.5px; line-height: 1.45; white-space: pre-wrap; word-break: break-all; max-height: 220px; overflow-y: auto; }

/* ===== clubs, the weekly board, the vault and the Sunday Major ===== */
.bottom-nav { grid-template-columns: repeat(6, minmax(0, 1fr)); padding-left: 4px; padding-right: 4px; }
.navbtn { font-size: 14.5px; letter-spacing: 0.05em; }
.navbtn[aria-current="page"] { font-size: 16px; }
@media (max-width: 360px) { .navbtn { font-size: 13px; letter-spacing: 0.03em; } .navbtn[aria-current="page"] { font-size: 14.5px; } }

.club-tag { display: inline-flex; align-items: center; flex-shrink: 0; height: 17px; padding: 0 5px; margin-left: 2px; border-radius: 5px; background: var(--cc); color: var(--ct, #fff); font-family: var(--t-display); font-weight: 900; font-size: 12px; line-height: 1; letter-spacing: 0.06em; text-transform: uppercase; box-shadow: inset 0 -2px 0 rgba(0,0,0,0.2); vertical-align: middle; }
.club-tag.big { height: 22px; padding: 0 7px; font-size: 15px; border-radius: 6px; }
.club-tag.rim { box-shadow: inset 0 -2px 0 rgba(0,0,0,0.2), 0 0 0 1.5px #111214, 0 0 0 3px #EDB000; margin-left: 5px; }
.club-tag.foil { background: linear-gradient(115deg, var(--cc) 0%, var(--cc) 30%, rgba(255,255,255,0.75) 46%, var(--cc) 60%, var(--cc) 100%); background-size: 260% 100%; animation: tagFoil 3.2s linear infinite; box-shadow: inset 0 -2px 0 rgba(0,0,0,0.2), 0 0 0 1.5px #111214, 0 0 0 3px #EDB000; margin-left: 5px; }
@keyframes tagFoil { from { background-position: 100% 0; } to { background-position: -160% 0; } }
.club-crest { position: relative; flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center; box-sizing: border-box; border-radius: 50%; border: 6px dashed #F2F2EE; background: var(--cc); box-shadow: 0 6px 14px rgba(0,0,0,0.35); }
.club-crest .cc-core { width: 68%; height: 68%; border-radius: 50%; background: rgba(0,0,0,0.16); box-shadow: inset 0 0 0 1.5px rgba(255,255,255,0.28); display: flex; align-items: center; justify-content: center; font-family: var(--t-display); font-weight: 900; letter-spacing: 0.02em; color: var(--ct, #fff); line-height: 1; }
.club-crest.rim { box-shadow: 0 0 0 3px #111214, 0 0 0 5px #EDB000, 0 6px 14px rgba(0,0,0,0.35); }
.club-crest.foil { box-shadow: 0 0 0 3px #111214, 0 0 0 5px #EDB000, 0 0 18px rgba(237,176,0,0.45); }
.club-crest.foil .cc-core { background: linear-gradient(135deg, rgba(255,255,255,0.35), rgba(0,0,0,0.12) 50%, rgba(255,255,255,0.3)); }
.medal-dot { display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; border-radius: 50%; color: #111214; font-family: var(--t-display); font-weight: 900; box-shadow: inset 0 0 0 2px rgba(0,0,0,0.15); }
.medal-pill { padding: 5px 10px 5px 6px; font-size: 16px; }
.fp-medals { display: flex; gap: 6px; justify-content: center; margin-top: 10px; }

/* the clubs tab */
.cl-hero { position: relative; overflow: hidden; border-radius: 20px; background: var(--t-panel); padding: 22px 18px 18px; margin-bottom: 22px; }
.cl-hero::before { content: ""; position: absolute; left: 0; right: 0; top: 0; height: 10px; background: repeating-linear-gradient(90deg, var(--t-accent) 0 18px, #F2F2EE 18px 28px); }
.cl-hero-chips { display: flex; margin: 8px 0 14px; }
.cl-hero-chips .chip-ic { width: 46px; height: 46px; border-width: 6px; margin-right: -12px; box-shadow: 0 4px 10px rgba(0,0,0,0.4); }
.cl-hero-t { font-size: 40px; }
.cl-hero-p { font-size: 14px; line-height: 1.5; color: var(--t-mid); margin: 8px 0 0; max-width: 460px; }
.cl-cost { opacity: 0.6; }
.cl-board .cl-row { gap: 10px; }
.cl-row.you { box-shadow: none; }
.cl-row.you .lb-pl { color: var(--t-accent); }
.cl-row-main { flex: 1; min-width: 0; display: flex; align-items: center; gap: 12px; background: none; border: none; padding: 0; color: var(--t-text); text-align: left; font-family: inherit; cursor: pointer; }
.cl-join { min-height: 36px; padding: 8px 14px; font-size: 15px; flex-shrink: 0; }
.cl-score { color: var(--t-mid); }
.cl-score.up, .wk-val { color: var(--t-good); }
.cl-score.down { color: #FF8A80; }
.cl-card { position: relative; overflow: hidden; border-radius: 20px; background: var(--t-panel); padding: 0 16px 16px; margin-bottom: 22px; }
.cl-stripe { height: 10px; margin: 0 -16px 18px; background: repeating-linear-gradient(90deg, var(--cc) 0 18px, #F2F2EE 18px 28px); }
.cl-top { display: flex; align-items: center; gap: 16px; }
.cl-name { font-size: 34px; overflow-wrap: anywhere; }
.cl-meta { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
.cl-meta .club-tag { margin-left: 0; }
.cl-lv { font-family: var(--t-display); font-weight: 900; font-size: 15px; letter-spacing: 0.06em; padding: 3px 7px; border-radius: 6px; background: var(--t-panel2); }
.cl-priv { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; color: var(--t-mid); }
.cl-about { font-size: 14px; color: var(--t-sub); margin: 14px 2px 0; line-height: 1.45; }
.cl-stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin-top: 16px; }
.cl-stats > div { padding: 10px 12px; border-radius: 12px; background: var(--t-raise); min-width: 0; }
.cl-stats b { display: block; font-family: var(--t-display); font-weight: 900; font-size: 26px; line-height: 1.05; margin-top: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cl-stats b.up { color: var(--t-good); }
.cl-stats b.down { color: #FF8A80; }
.cl-stats b i { font-style: normal; font-size: 16px; color: var(--t-mid); margin-left: 3px; }
.cl-actions { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin-top: 12px; }
.cl-actions .btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-height: 46px; padding: 10px 8px; font-size: 16px; }
.cl-table .cl-tdot { width: 10px; height: 10px; border-radius: 50%; background: var(--t-good); box-shadow: 0 0 0 4px rgba(0,217,134,0.18); flex-shrink: 0; margin: 0 6px 0 4px; }
.cl-role { font-family: var(--t-display); font-weight: 800; font-size: 11.5px; letter-spacing: 0.08em; text-transform: uppercase; padding: 2px 5px; border-radius: 4px; flex-shrink: 0; background: var(--t-panel2); color: var(--t-sub); }
.cl-role.owner { background: rgba(237,176,0,0.16); color: var(--t-accent); }
.cl-vault { border-radius: 18px; background: var(--t-panel); padding: 16px; margin-bottom: 22px; }
.cl-vault-top { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; }
.cl-vault-top b { display: block; font-size: 38px; margin-top: 2px; }
.cl-vbar { height: 12px; border-radius: 6px; background: #111214; overflow: hidden; margin: 14px 0 12px; }
.cl-vbar i { display: block; height: 100%; border-radius: 6px; background: repeating-linear-gradient(90deg, var(--cc) 0 12px, #F2F2EE 12px 16px); }
.cl-perks { list-style: none; margin: 0; padding: 0; }
.cl-perks li { display: flex; align-items: center; gap: 12px; padding: 9px 0; border-bottom: 1px solid var(--rule); color: var(--t-faint); font-size: 13.5px; }
.cl-perks li:last-child { border-bottom: none; }
.cl-perks li.got { color: var(--t-text); }
.cl-plv { font-family: var(--t-display); font-weight: 900; font-size: 15px; letter-spacing: 0.04em; min-width: 34px; }
.cl-perks li.got .cl-plv { color: var(--cc); }
.cl-ptxt { flex: 1; min-width: 0; }
.cl-pneed { font-family: var(--t-display); font-weight: 800; font-size: 15px; color: var(--t-mid); display: inline-flex; }
.cl-perks li.got .cl-pneed { color: var(--t-good); }
.cl-vnote { font-size: 12.5px; color: var(--t-mid); margin-top: 10px; }
.cl-foot { display: flex; gap: 8px; justify-content: center; margin: 6px 0 10px; flex-wrap: wrap; }
.cl-foot .btn { display: inline-flex; align-items: center; gap: 6px; }
.btn.cl-leave, .btn.cl-leave:hover:not(:disabled) { background: rgba(255,88,77,0.12); color: #FF8A80; }
.cl-preview { display: flex; align-items: center; gap: 14px; padding: 14px; border-radius: 16px; background: #111214; margin-bottom: 6px; }
.cl-preview-name { font-size: 28px; overflow-wrap: anywhere; }
.cl-preview-line { display: flex; align-items: center; gap: 6px; margin-top: 6px; font-size: 14px; font-weight: 700; color: var(--t-sub); }
.cl-field { display: flex; flex-direction: column; gap: 6px; margin-top: 14px; }
.cl-field .lbl i { font-style: normal; text-transform: none; letter-spacing: 0; color: var(--t-faint); font-weight: 600; margin-left: 4px; }
.cl-field .input { width: 100%; box-sizing: border-box; }
.cl-tag-in { font-family: var(--t-display); font-weight: 900; font-size: 22px !important; letter-spacing: 0.12em; text-transform: uppercase; }
.cl-hint { font-size: 12px; color: var(--t-mid); margin-top: 6px; }
.cl-hint.bad { color: #FF8A80; }
.cl-colors { display: grid; grid-template-columns: repeat(8, minmax(0, 1fr)); gap: 6px; }
.cl-color { aspect-ratio: 1; display: flex; align-items: center; justify-content: center; border: none; border-radius: 50%; background: none; padding: 0; cursor: pointer; }
.cl-color .chip-ic { width: 82%; height: 82%; border-width: 4px; }
.cl-color.on { box-shadow: 0 0 0 2.5px var(--t-text); }
.cl-link { display: block; margin: 14px auto 0; background: none; border: none; color: var(--t-mid); font-size: 13px; text-decoration: underline; text-underline-offset: 3px; cursor: pointer; }
.cl-codebig { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 8px; }
.cl-codebig span { height: 64px; border-radius: 12px; background: #111214; box-shadow: inset 0 0 0 1.5px #3A3D44; display: flex; align-items: center; justify-content: center; font-family: var(--t-display); font-weight: 900; font-size: 38px; }
.cl-linkline { text-align: center; font-size: 13px; color: var(--t-mid); margin-top: 12px; word-break: break-all; }
.cl-steps { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.cl-step { min-height: 64px; border: none; border-radius: 14px; background: #111214; box-shadow: inset 0 0 0 1.5px #3A3D44; color: var(--t-text); font-family: var(--t-display); font-weight: 900; font-size: 30px; cursor: pointer; }
.cl-step:hover:not(:disabled) { box-shadow: inset 0 0 0 2px var(--t-accent); }
.cl-step:disabled { opacity: 0.35; cursor: default; }
.cl-mtop { display: flex; align-items: center; gap: 14px; margin-top: 4px; }
.cl-mname { font-size: 30px; overflow-wrap: anywhere; }
.cl-mline { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--t-mid); margin-top: 4px; }
.cl-manage { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
.cl-manage .btn { flex: 1 1 40%; }
.cl-vlist { margin-top: 14px; border-radius: 14px; background: var(--t-raise); padding: 0 12px; }
.cl-vlist .lb-item { min-height: 54px; }

/* the weekly board */
.wk-last { border-radius: 14px; background: var(--t-panel); padding: 10px 12px; margin: 0 0 12px; }
.wk-last-row { display: flex; gap: 6px; margin-top: 8px; overflow-x: auto; scrollbar-width: none; }
.wk-last-row::-webkit-scrollbar { display: none; }
.wk-last-p { display: inline-flex; align-items: center; gap: 7px; flex-shrink: 0; padding: 6px 10px 6px 6px; border-radius: 999px; border: none; background: var(--t-raise); color: var(--t-text); font-size: 13px; font-weight: 700; cursor: pointer; font-family: inherit; }
.wk-last-p b { font-family: var(--t-display); font-weight: 800; font-size: 15px; color: var(--t-good); }

/* the vault */
.vault { position: relative; border-radius: 20px; background: #0A0A0B; box-shadow: inset 0 0 0 1px rgba(237,176,0,0.45); padding: 0 14px 14px; margin-bottom: 26px; overflow: hidden; }
.vault::before { content: ""; display: block; height: 8px; margin: 0 -14px 16px; background: repeating-linear-gradient(90deg, #EDB000 0 14px, #0A0A0B 14px 20px); }
.vault-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 0 2px 14px; }
.vault-title { font-size: 40px; color: #F2F2EE; margin-top: 2px; }
.vault-lock { width: 52px; height: 52px; border-radius: 50%; box-sizing: border-box; border: 5px dashed #EDB000; background: #17181B; display: flex; align-items: center; justify-content: center; color: #EDB000; flex-shrink: 0; }
.vault-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.vt { display: flex; flex-direction: column; align-items: flex-start; gap: 3px; padding: 12px; border-radius: 14px; border: none; background: #121316; box-shadow: inset 0 0 0 1px rgba(237,176,0,0.28); color: #F2F2EE; text-align: left; font-family: inherit; cursor: pointer; min-width: 0; }
.vt.wide { grid-column: 1 / -1; }
.vt:disabled { cursor: default; opacity: 1; }
.vt.on { box-shadow: inset 0 0 0 2px #EDB000; }
.vt.armed { box-shadow: inset 0 0 0 2px #EDB000, 0 0 18px rgba(237,176,0,0.25); }
.vt-prev { align-self: stretch; height: 84px; border-radius: 10px; background: #070708; display: flex; align-items: center; justify-content: center; margin-bottom: 8px; }
.vt-prev .felt-sw { transform: scale(1.15); }
.vt-kind { font-size: 10.5px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: #B9B3A6; }
.vt-name { font-family: var(--t-display); font-weight: 900; font-size: 21px; line-height: 1; text-transform: uppercase; letter-spacing: 0.02em; }
.vt-st { margin-top: 6px; font-family: var(--t-display); font-weight: 900; font-size: 16px; letter-spacing: 0.04em; text-transform: uppercase; padding: 5px 9px; border-radius: 8px; }
.vt-st.buy { background: #EDB000; color: #111214; }
.vt-st.own { padding: 5px 0; color: #B9B3A6; font-weight: 800; font-size: 14px; }
.vt-need { align-self: stretch; display: flex; align-items: center; gap: 8px; margin-top: 8px; font-family: var(--t-display); font-weight: 800; font-size: 16px; color: #B9B3A6; }
.vt-bar { flex: 1; height: 6px; border-radius: 3px; background: #24221C; overflow: hidden; }
.vt-bar i { display: block; height: 100%; background: repeating-linear-gradient(90deg, #EDB000 0 10px, #FDD05A 10px 13px); }
.vault-note { font-size: 12px; color: #8E887A; margin: 12px 2px 0; }

/* the Sunday Major */
.mj-card { width: 100%; display: block; padding: 0; border-radius: 18px; background: var(--t-panel); overflow: hidden; border: none; color: #F2F2EE; text-align: left; cursor: pointer; }
.mj-card:active { transform: scale(0.985); }
.mj-stripe { display: block; height: 8px; background: repeating-linear-gradient(90deg, #196EFE 0 14px, #EDB000 14px 20px, #196EFE 20px 34px, #F2F2EE 34px 40px); }
.mj-body { display: flex; align-items: center; gap: 14px; padding: 14px 16px 16px; width: 100%; box-sizing: border-box; }
.mj-crest { width: 58px; height: 58px; flex-shrink: 0; border-radius: 50%; box-sizing: border-box; border: 6px dashed #F2F2EE; background: #196EFE; display: flex; align-items: center; justify-content: center; color: #F2F2EE; box-shadow: 0 0 0 2px #EDB000; }
.mj-kicker { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: #6FA6FF; }
.mj-live { width: 8px; height: 8px; border-radius: 50%; background: var(--t-good); box-shadow: 0 0 0 3px rgba(0,217,134,0.2); animation: livePulse 1.6s ease-in-out infinite; }
@keyframes livePulse { 50% { box-shadow: 0 0 0 6px rgba(0,217,134,0.05); } }
.mj-title { display: block; font-family: var(--t-display); font-weight: 900; font-size: 28px; line-height: 1; letter-spacing: 0.02em; text-transform: uppercase; margin-top: 3px; }
.mj-sub { display: block; font-size: 12.5px; color: var(--t-mid); margin-top: 3px; }
.mj-enter { padding: 9px 12px; border-radius: 10px; background: #196EFE; color: #F2F2EE; font-family: var(--t-display); font-weight: 900; font-size: 17px; letter-spacing: 0.06em; line-height: 1; flex-shrink: 0; }
.mj-bar { display: block; height: 6px; border-radius: 3px; background: #1A2233; margin: 0 16px 16px; overflow: hidden; }
.mj-bar > span { display: block; height: 100%; background: repeating-linear-gradient(90deg, #196EFE 0 10px, #6FA6FF 10px 13px); }

@media (min-width: 1024px) {
  .bottom-nav { padding-left: 0; padding-right: 14px; }
  .navbtn { font-size: 21px; }
  .navbtn[aria-current="page"] { font-size: 21px; }
  .vault-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .vt.wide { grid-column: span 2; }
  .vt:hover:not(:disabled) { box-shadow: inset 0 0 0 1.5px rgba(237,176,0,0.7); }
  .cl-row-main:hover { opacity: 0.85; }
}
.cl-screen .lb-list { margin-bottom: 22px; }
.cl-screen .lb-list.cl-board { margin-bottom: 8px; }
.cl-step.on { box-shadow: inset 0 0 0 2.5px var(--t-accent); background: rgba(237,176,0,0.08); }
.cl-steps + .auth-err + .big-cta, .cl-steps + .big-cta { margin-top: 14px; }
`;

export { CHIP_STACK_CSS };
