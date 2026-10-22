import { LOADING_MS } from "../app/boot.jsx";
import { CHIP_STACK_CSS } from "./chipstack.js";

const GLOBAL_STYLE = `
:root { --t-bg: #09142A; --t-panel: #102243; --t-panel2: #1F3868; --t-text: #F4F7FC; --t-text2: #C8D3E6; --t-sub: #A5B8D6; --t-mid: #8BA1C6; --t-mut: #7187AE; --t-faint: #59719F; --t-accent: #FCB600; --t-good: #00D596; --t-bad: #FF585C; --t-display: 'Fraunces', Georgia, serif; --t-body: 'Inter', -apple-system, sans-serif; }
* { box-sizing: border-box; }
body { margin: 0; background: var(--t-bg); }
button { font-family: inherit; color: inherit; }
:focus-visible { outline: 2px solid var(--t-good); outline-offset: 2px; }
@keyframes potBump { 0% { transform: scale(1);} 45% { transform: scale(1.12);} 100% { transform: scale(1);} }
@keyframes fadeSlide { from { opacity:0; transform: translateY(-3px);} to { opacity:1; transform: translateY(0);} }
@keyframes sheetIn { from { opacity:0; transform: translateY(10px);} to { opacity:1; transform: translateY(0);} }
@keyframes screenIn { from { opacity:0; } to { opacity:1; } }
@keyframes dealToHero { 0% { opacity: 0; transform: translate3d(0,-42vh,0) rotate(-16deg) scale(.5); } 55% { opacity: 1; } 100% { opacity: 1; transform: translate3d(0,0,0) rotate(0) scale(1); } }
@keyframes dealToSeat { 0% { opacity: 0; transform: translate3d(0,24vh,0) rotate(0) scale(.6); } 60% { opacity: 1; } 100% { opacity: 1; transform: translate3d(0,0,0) rotate(var(--r, 0deg)) scale(1); } }
@keyframes flipIn { 0% { opacity: 0; transform: perspective(500px) rotateY(-90deg) translateY(-6px); } 50% { opacity: 1; } 100% { opacity: 1; transform: perspective(500px) rotateY(0) translateY(0); } }
@keyframes foldAway { to { opacity: 0; transform: translate3d(0,-12px,0) scale(.75) rotate(-10deg); } }
@keyframes confettiFall { 0% { transform: translateY(-10px) translateX(0) rotate(0deg); opacity:1; } 100% { transform: translateY(340px) translateX(var(--drift)) rotate(var(--rot)); opacity:0; } }
@keyframes suitIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
@keyframes loadFill { from { transform: scaleX(0); } to { transform: scaleX(1); } }
@keyframes resultsIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes riseIn { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes badgePop { 0% { opacity: 0; transform: scale(.4) rotate(-20deg); } 60% { opacity: 1; transform: scale(1.12) rotate(4deg); } 100% { transform: scale(1) rotate(0); } }

.app { font-family: var(--t-body); background: radial-gradient(130% 70% at 50% -15%, #103F8D 0%, var(--t-bg) 62%); height: 100vh; height: 100dvh; color: var(--t-text); display: flex; flex-direction: column; align-items: center; overflow: hidden; }
.app-table { height: 100vh; height: 100dvh; background: radial-gradient(130% 70% at 50% -15%, #103F8D 0%, var(--t-bg) 62%); }
.app-main { flex: 1; width: 100%; display: flex; justify-content: center; overflow: hidden; padding-top: 16px; }
.screen { width: 100%; max-width: 460px; height: 100%; overflow-y: auto; padding: 0 16px 40px; }
.screen-fade { animation: screenIn 0.2s ease; }
.home-head { display: flex; justify-content: space-between; align-items: center; margin: 2px 2px 18px; }
.wordmark { font-family: var(--t-display); font-size: 30px; font-weight: 700; letter-spacing: -0.02em; }
.wordmark-sm { font-family: var(--t-display); font-size: 18px; font-weight: 700; letter-spacing: -0.01em; line-height: 1.1; }
.num { font-variant-numeric: tabular-nums; }
.chip-pill { display: inline-flex; align-items: center; gap: 6px; background: rgba(244,247,252,0.06); border: 1px solid rgba(244,247,252,0.1); border-radius: 20px; padding: 5px 11px; font-size: 13px; font-weight: 600; }
.chip-dot { width: 12px; height: 12px; border-radius: 50%; background: var(--t-accent); box-shadow: inset 0 0 0 2.5px var(--t-bg), inset 0 0 0 4px var(--t-accent); display: inline-block; }
.panel { background: var(--t-panel); border: 1px solid rgba(244,247,252,0.08); border-radius: 20px; padding: 16px 18px 18px; }
.list { display: flex; flex-direction: column; gap: 8px; }
.row { display: flex; align-items: center; justify-content: space-between; gap: 12px; width: 100%; background: var(--t-panel); border: 1px solid rgba(244,247,252,0.07); border-radius: 16px; padding: 14px 16px; cursor: pointer; text-align: left; transition: border-color .15s ease, background .15s ease; }
div.row { cursor: default; }
button.row:hover:not(:disabled) { border-color: rgba(244,247,252,0.18); }
button.row:active:not(:disabled) { background: #152A53; }
.row:disabled { opacity: 0.45; cursor: default; }
.row-title { font-size: 14.5px; font-weight: 600; }
.row-sub { font-size: 12px; color: var(--t-mut); margin-top: 2px; }
.bar { height: 7px; border-radius: 4px; background: rgba(244,247,252,0.1); overflow: hidden; }
.bar > div { height: 100%; border-radius: 4px; transition: width .35s ease, background .35s ease; }
.stat { background: var(--t-panel); border: 1px solid rgba(244,247,252,0.07); border-radius: 14px; padding: 12px 14px; }
.comp-row { background: var(--t-panel); border: 1px solid rgba(244,247,252,0.06); border-radius: 14px; padding: 12px 14px; }
.segbtn:disabled { cursor: not-allowed; }
.spark { display: flex; align-items: flex-end; gap: 3px; height: 42px; margin-top: 12px; }
.spark > div { flex: 1; border-radius: 2px; min-width: 4px; }
.report { margin-top: 16px; background: var(--t-panel); border: 1px solid rgba(244,247,252,0.08); border-radius: 16px; padding: 14px 16px; }
.report p { font-size: 13.5px; line-height: 1.55; color: var(--t-text2); margin: 6px 0 0; }
.report-head { display: flex; justify-content: space-between; font-size: 12px; font-weight: 600; color: var(--t-sub); }
.ach-row { display: flex; align-items: center; gap: 12px; padding: 10px 14px; background: var(--t-panel); border: 1px solid rgba(244,247,252,0.06); border-radius: 12px; }
.ach-mark { width: 20px; height: 20px; border-radius: 50%; border: 1.5px solid; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.lb-dock { position: sticky; bottom: 0; padding: 10px 0 34px; background: linear-gradient(180deg, rgba(9,20,42,0) 0%, var(--t-bg) 30%); }
.lb-pinned { box-shadow: 0 -6px 18px rgba(0,0,0,0.35); }
.lb-row { display: flex; align-items: center; gap: 10px; border-radius: 12px; padding: 10px 14px; border: 1px solid transparent; }
.empty { font-size: 12.5px; color: var(--t-faint); padding: 8px 2px; }
.input { background: var(--t-panel); border: 1px solid rgba(244,247,252,0.1); border-radius: 12px; padding: 10px 12px; color: var(--t-text); font-size: 14px; font-family: inherit; }
.input:focus { outline: none; border-color: rgba(0,213,150,0.6); }
.profile-av { background: var(--t-panel2); border: none; width: 76px; height: 76px; border-radius: 50%; font-size: 34px; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px; cursor: pointer; }
.name-btn { background: none; border: none; font-size: 19px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; padding: 2px 4px; }
.frame-swatch { display: inline-flex; align-items: center; gap: 6px; border: 1.5px solid; border-radius: 20px; padding: 5px 11px 5px 9px; font-size: 12px; font-weight: 600; cursor: pointer; background: transparent; }
.frame-swatch:disabled { cursor: default; }
.avatar-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.avatar-tile { display: flex; flex-direction: column; align-items: center; justify-content: center; background: var(--t-panel); border: 1px solid rgba(244,247,252,0.07); border-radius: 14px; padding: 12px 4px 10px; cursor: pointer; }
.avatar-tile:disabled { cursor: default; }
.seg { display: flex; gap: 3px; background: rgba(244,247,252,0.06); border-radius: 12px; padding: 3px; }
.segbtn { flex: 1; border: none; border-radius: 9px; padding: 8px 6px; font-size: 12px; font-weight: 600; cursor: pointer; background: transparent; color: var(--t-sub); transition: background .15s ease, color .15s ease; white-space: nowrap; }
.segbtn.on { background: var(--t-text); color: var(--t-bg); }
.kv-list { margin: 14px 0 4px; border-top: 1px solid rgba(244,247,252,0.06); }
.kv { display: flex; justify-content: space-between; align-items: baseline; font-size: 13px; padding: 9px 2px; border-bottom: 1px solid rgba(244,247,252,0.06); color: var(--t-mid); }
.kv b { color: var(--t-text); font-weight: 600; }
.scrim { position: fixed; top: 0; right: 0; bottom: 0; left: 0; background: rgba(3,8,20,0.74); display: flex; align-items: center; justify-content: center; padding: 16px; z-index: 30; animation: screenIn .15s ease; }
.sheet { background: var(--t-panel); border: 1px solid rgba(244,247,252,0.1); border-radius: 20px; padding: 18px; width: 100%; max-height: 86vh; overflow-y: auto; animation: sheetIn .22s cubic-bezier(.2,.9,.3,1); box-shadow: 0 24px 60px rgba(0,0,0,0.5); }
.sheet-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
.sheet-title { font-family: var(--t-display); font-size: 19px; font-weight: 700; }
.sheet-body { font-size: 13px; line-height: 1.5; color: var(--t-mid); margin: 12px 2px 16px; }
.toast { position: fixed; top: 18px; left: 50%; transform: translateX(-50%); z-index: 40; background: var(--t-panel); border: 1px solid rgba(252,182,0,0.45); border-radius: 14px; padding: 10px 16px; animation: sheetIn .25s ease; box-shadow: 0 10px 30px rgba(0,0,0,0.45); min-width: 200px; text-align: center; }
.bottom-nav { width: 100%; max-width: 460px; display: flex; justify-content: space-around; align-items: center; padding: 6px 6px calc(8px + env(safe-area-inset-bottom)); border-top: 1px solid rgba(244,247,252,0.08); flex-shrink: 0; background: rgba(9,20,42,0.88); }
.navbtn { background: none; border: none; display: flex; flex-direction: column; align-items: center; cursor: pointer; padding: 6px 8px; transition: color .15s ease; flex: 1; }
.play-fab { background: none; border: none; display: flex; flex-direction: column; align-items: center; cursor: pointer; padding: 2px 4px 0; flex: 1; color: var(--t-text); }
.play-fab-disc { width: 46px; height: 46px; margin-top: 0; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: var(--t-bg); background: radial-gradient(circle at 35% 30%, #FFDC7A, var(--t-accent) 70%); box-shadow: 0 0 12px rgba(252,182,0,0.35); transition: transform .18s ease; }
.play-fab:active .play-fab-disc { transform: scale(0.93); }
.play-fab:not(.on) .play-fab-disc { filter: saturate(0.85) brightness(0.92); }

.loading { position: fixed; top: 0; right: 0; bottom: 0; left: 0; background: radial-gradient(130% 70% at 50% -15%, #103F8D 0%, var(--t-bg) 62%); display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 50; transition: opacity .6s ease; color: var(--t-text); }
.loading-word { font-family: var(--t-display); font-size: 48px; font-weight: 700; letter-spacing: -0.03em; animation: suitIn .8s ease both; }
.loading-suits { display: flex; gap: 14px; margin-top: 10px; font-size: 20px; }
.loading-suits span { animation: suitIn .5s ease both; }
.loading-bar { width: 120px; height: 3px; background: rgba(244,247,252,0.1); border-radius: 2px; margin-top: 28px; overflow: hidden; }
.loading-bar div { height: 100%; background: var(--t-accent); transform-origin: left; animation: loadFill ${LOADING_MS / 1000}s cubic-bezier(.4,0,.2,1) both; }
.spinner { width: 34px; height: 34px; border-radius: 50%; border: 3px solid rgba(244,247,252,0.12); border-top-color: var(--t-accent); animation: spin .8s linear infinite; }

.table-wrap { font-family: var(--t-body); height: 100%; color: var(--t-text); display: flex; flex-direction: column; align-items: center; padding: 12px 14px; overflow: hidden; position: relative; }
.table-top { width: 100%; max-width: 460px; display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-shrink: 0; }
.table-top > div:first-of-type { flex: 1; }
.table-sub { font-size: 10.5px; color: var(--t-mut); margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.status { width: 100%; max-width: 460px; text-align: center; font-size: 12.5px; color: var(--t-sub); font-weight: 500; min-height: 18px; margin: 8px 0 2px; flex-shrink: 0; animation: fadeSlide 0.25s ease; }
.seats { width: 100%; max-width: 460px; display: flex; justify-content: space-around; flex-wrap: wrap; row-gap: 6px; flex-shrink: 0; margin-top: 4px; }
.bot-av { position: absolute; top: 3px; left: 3px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: var(--t-display); font-weight: 700; color: #FFFFFF; }
.backs { display: flex; align-items: center; }
.backs .card.mini { width: 20px; height: 29px; border-radius: 4px; transform: rotate(var(--r, 0deg)); }
.backs.folded { animation: foldAway .35s ease forwards; }
.felt-center { width: 100%; max-width: 460px; flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 10px; }
.felt-oval { position: relative; width: 100%; max-width: 420px; padding: 22px 16px 16px; display: flex; flex-direction: column; align-items: center; gap: 10px; border-radius: 999px; background-color: var(--felt2, #008146); background-image: repeating-radial-gradient(circle at 30% 40%, rgba(255,255,255,0.022) 0 1px, transparent 1px 3px), radial-gradient(ellipse at 50% 40%, var(--felt1, #00A963) 0%, var(--felt2, #008146) 52%, var(--felt3, #005D31) 100%); border: 7px solid var(--rail, #603714); box-shadow: inset 0 0 0 2px rgba(0,0,0,0.25), inset 0 10px 30px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.06), 0 14px 34px rgba(0,0,0,0.45), 0 0 60px rgba(0,169,99,0.12); }
.card-slot { width: clamp(30px,8.5vw,40px); height: clamp(43px,12vw,57px); border-radius: 7px; border: 1.5px dashed rgba(255,255,255,0.22); }
.pot-num { font-size: 15px; color: #FFFFFF; font-weight: 700; font-family: var(--t-body); background: rgba(0,0,0,0.28); padding: 3px 12px; border-radius: 20px; }
.pot-num.pulse { animation: potBump 0.32s ease; }
.banner { animation: sheetIn 0.28s ease; border: 1px solid; border-radius: 14px; padding: 10px 14px; width: 100%; max-width: 380px; }
.hand-strip { position: relative; overflow: hidden; display: flex; align-items: center; justify-content: space-between; background: rgba(244,247,252,0.04); border: 1px solid; border-radius: 12px; padding: 9px 14px; height: 38px; }
.tip { width: 100%; max-width: 460px; margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between; gap: 10px; border: 1px solid; border-radius: 12px; padding: 8px 12px; font-size: 11.5px; line-height: 1.4; }
.tip .iconbtn { flex-shrink: 0; color: inherit; }
.hero-seat { width: 100%; max-width: 460px; flex-shrink: 0; background: var(--t-panel); border: 1px solid; transition: border-color .4s ease, box-shadow .4s ease; border-radius: 20px; padding: 12px 14px; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.controls { width: 100%; max-width: 460px; display: flex; flex-direction: column; align-items: center; gap: 8px; flex-shrink: 0; padding-top: 10px; padding-bottom: env(safe-area-inset-bottom); }
.slider-row { display: flex; align-items: center; gap: 10px; background: rgba(244,247,252,0.06); padding: 8px 8px 8px 14px; border-radius: 14px; width: 100%; }
.rank-row { display: flex; align-items: center; gap: 12px; padding: 10px 4px; border-bottom: 1px solid rgba(244,247,252,0.06); }
.rank-row:last-child { border-bottom: none; }
.rank-num { width: 18px; font-size: 12px; font-weight: 600; color: var(--t-faint); text-align: right; flex-shrink: 0; }
.mcard { width: 21px; height: 30px; border-radius: 4px; background: #FFFFFF; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 9.5px; font-weight: 700; line-height: 1.05; box-shadow: 0 1px 2px rgba(0,0,0,0.3); }
.mm { position: fixed; top: 0; right: 0; bottom: 0; left: 0; z-index: 36; background: radial-gradient(130% 70% at 50% -15%, #103F8D 0%, var(--t-bg) 62%); display: flex; align-items: center; justify-content: center; transition: opacity .4s ease; }
.mm-inner { display: flex; flex-direction: column; align-items: center; gap: 12px; animation: sheetIn .3s ease; }
.mm-title { font-family: var(--t-display); font-size: 26px; font-weight: 700; }
.mm-sub { font-size: 13.5px; color: var(--t-mid); }

.results { position: fixed; top: 0; right: 0; bottom: 0; left: 0; z-index: 35; background: radial-gradient(130% 70% at 50% -15%, #103F8D 0%, var(--t-bg) 62%); display: flex; align-items: center; justify-content: center; padding: 20px 16px; overflow-y: auto; animation: resultsIn .35s ease; }
.results-inner { width: 100%; max-width: 380px; display: flex; flex-direction: column; margin: auto 0; }
.results-inner > * { animation: riseIn .5s cubic-bezier(.2,.9,.3,1) both; }
.results-inner > *:nth-child(2) { animation-delay: .05s; } .results-inner > *:nth-child(3) { animation-delay: .1s; }
.results-inner > *:nth-child(4) { animation-delay: .18s; } .results-inner > *:nth-child(5) { animation-delay: .26s; }
.results-inner > *:nth-child(n+6) { animation-delay: .34s; }
.badge-pop { animation: badgePop .7s cubic-bezier(.2,.9,.3,1.2) .2s both; filter: drop-shadow(0 10px 30px rgba(0,0,0,0.5)); }
.results-kicker { font-size: 12.5px; color: var(--t-mut); text-align: center; }
.results-head { font-family: var(--t-display); font-size: 52px; font-weight: 700; letter-spacing: -0.03em; line-height: 1; text-align: center; margin: 8px 0 8px; }
.results-sub { font-size: 14px; color: var(--t-mid); text-align: center; }
.results-delta { font-family: var(--t-display); font-size: 42px; font-weight: 700; text-align: center; margin: 22px 0 18px; letter-spacing: -0.02em; }
.results-delta span { font-family: var(--t-body); font-size: 15px; font-weight: 600; margin-left: 6px; opacity: .8; letter-spacing: 0; }
.results-tier { display: flex; align-items: center; gap: 14px; background: var(--t-panel); border: 1px solid rgba(244,247,252,0.08); border-radius: 16px; padding: 14px 16px; }
.results-note { margin-top: 10px; border: 1px solid; border-radius: 12px; padding: 10px 14px; font-size: 13px; text-align: center; }
.results-lines { margin-top: 16px; }
.results-lines > div { display: flex; justify-content: space-between; font-size: 13px; color: var(--t-sub); padding: 7px 2px; border-bottom: 1px solid rgba(244,247,252,0.06); }
.results-lines b { font-weight: 600; }
.results-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 16px; }
.results-stats > div { background: var(--t-panel); border-radius: 12px; padding: 10px 8px; text-align: center; }
.results-stats b { display: block; font-size: 16px; font-weight: 600; }
.results-stats span { font-size: 11px; color: var(--t-mut); }
.linkbtn { background: none; border: none; color: var(--t-mut); font-size: 12.5px; margin-top: 14px; cursor: pointer; text-decoration: underline; text-underline-offset: 3px; align-self: center; padding: 4px; }

.card { position: relative; width: clamp(30px,8.5vw,40px); height: clamp(43px,12vw,57px); border-radius: 7px; background: #FFFFFF; display:flex; flex-direction:column; align-items:center; justify-content:center; font-weight:800; font-size:clamp(11px,3.2vw,14px); box-shadow: 0 1px 0 rgba(255,255,255,0.7) inset, 0 2px 3px rgba(0,0,0,0.2), 0 8px 14px rgba(0,0,0,0.28); transition: opacity .35s ease, filter .35s ease; will-change: transform, opacity; backface-visibility: hidden; }
.card.dim { opacity: 0.3; filter: grayscale(0.7); }
.card.mucked { opacity: 0.4; filter: grayscale(0.5); }
.card.win { box-shadow: 0 1px 0 rgba(255,255,255,0.6) inset, 0 0 0 2px var(--t-accent), 0 0 16px rgba(252,182,0,0.6); }
.card.back { background-color: var(--back-a, #0D68F8); background-image: repeating-linear-gradient(45deg, rgba(255,255,255,0.14) 0 3px, transparent 3px 7px); box-shadow: inset 0 0 0 2px var(--back-ring, #FFFFFF), inset 0 0 0 3.5px var(--back-b, #054ABD), 0 3px 8px rgba(0,0,0,0.35); }
.card.big { width: clamp(50px,15vw,66px); height: clamp(70px,21vw,92px); font-size: clamp(18px,5.4vw,24px); border-radius: 10px; }
.card.mini { width: 22px; height: 31px; font-size: 10px; border-radius: 5px; }
.btn { border: 1px solid rgba(244,247,252,0.18); background: rgba(244,247,252,0.05); border-radius: 14px; padding: 13px 18px; font-weight: 700; font-size: clamp(13px,3.5vw,14.5px); cursor: pointer; transition: transform .12s ease, background .15s ease, border-color .15s ease; color: var(--t-text); white-space: nowrap; flex: 1; }
.btn:hover:not(:disabled) { border-color: rgba(244,247,252,0.3); }
.btn:active:not(:disabled) { transform: scale(0.97); }
.btn:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-sm { flex: none; padding: 8px 16px; font-size: 13px; border-radius: 11px; }
.btn-fold { border-color: rgba(255,88,92,0.45); color: var(--t-bad); background: rgba(255,88,92,0.08); }
.btn-go { border-color: rgba(0,213,150,0.5); color: var(--t-good); background: rgba(0,213,150,0.08); }
.btn-raise { background: linear-gradient(180deg, #FFD252, var(--t-accent)); color: var(--t-bg); border-color: transparent; box-shadow: 0 6px 18px rgba(252,182,0,0.28); }
.btn-raise:hover:not(:disabled) { background: linear-gradient(180deg, #FFDC7A, #FFC224); border-color: transparent; }
.iconbtn { background: rgba(244,247,252,0.06); border: 1px solid rgba(244,247,252,0.14); color: var(--t-text2); width: 30px; height: 30px; border-radius: 50%; cursor: pointer; display:flex; align-items:center; justify-content:center; flex-shrink:0; transition: background .15s ease; padding: 0; }
.iconbtn:hover { background: rgba(244,247,252,0.12); }
.chip-badge { font-size: 10.5px; background: #0A1A35; color: var(--t-accent); border: 1px solid rgba(252,182,0,0.5); padding: 2px 8px; border-radius: 20px; font-weight: 700; font-variant-numeric: tabular-nums; transition: transform .5s cubic-bezier(.5,0,.3,1), opacity .5s ease; display: inline-block; }
.chip-badge.collecting { transform: translateY(-60px) scale(0.4); opacity: 0; }
.dealer-chip { position: absolute; bottom: -2px; right: -2px; width: 15px; height: 15px; border-radius: 50%; background: #FFFFFF; color: var(--t-bg); font-size: 8.5px; font-weight: 800; display:flex; align-items:center; justify-content:center; box-shadow: 0 1px 3px rgba(0,0,0,0.4); }
input[type=range] { accent-color: var(--t-accent); }
.preset-btn { display: flex; flex-direction: column; gap: 1px; padding: 8px 6px; border-color: rgba(252,182,0,0.45); color: var(--t-accent); background: rgba(252,182,0,0.08); }

.eq-meter { position: absolute; left: 0; top: 0; bottom: 0; transition: width .45s ease, background .3s ease; pointer-events: none; }
.hand-strip > span { z-index: 1; }
.felt-logo { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); font-family: var(--t-display); font-weight: 700; font-size: 64px; letter-spacing: -0.03em; color: rgba(255,255,255,0.06); pointer-events: none; user-select: none; }
.run2 { display: flex; align-items: center; gap: 4px; position: relative; }
.run2 > span { font-size: 10px; font-weight: 700; color: rgba(255,255,255,0.75); margin-right: 4px; }
.card.r2 { width: clamp(24px,6.5vw,30px); height: clamp(34px,9vw,42px); font-size: clamp(9px,2.6vw,11px); border-radius: 5px; }
.card.big.o4 { width: clamp(38px,11vw,48px); height: clamp(54px,15.5vw,68px); font-size: clamp(14px,4vw,18px); border-radius: 8px; }
.card.mini.m4 { width: 17px; height: 26px; font-size: 8.5px; }
.pre-row { display: flex; gap: 6px; width: 100%; }
.pre-btn { flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; border: 1px solid rgba(244,247,252,0.14); background: rgba(244,247,252,0.04); color: var(--t-sub); border-radius: 12px; padding: 12px 4px; font-size: 12.5px; font-weight: 600; cursor: pointer; transition: border-color .15s ease, color .15s ease, background .15s ease; white-space: nowrap; }
.pre-btn.on { border-color: rgba(252,182,0,0.65); color: var(--t-accent); background: rgba(252,182,0,0.1); }
.pre-box { width: 14px; height: 14px; border-radius: 4px; border: 1.5px solid currentColor; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
.squeeze { display: flex; gap: 6px; position: relative; touch-action: none; cursor: grab; -webkit-user-select: none; user-select: none; }
.card.sq { overflow: hidden; }
.sq-cover { position: absolute; top: 0; right: 0; bottom: 0; left: 0; border-radius: inherit; background-color: var(--back-a, #0D68F8); background-image: repeating-linear-gradient(45deg, rgba(255,255,255,0.14) 0 3px, transparent 3px 7px); box-shadow: inset 0 0 0 2px var(--back-ring, #FFFFFF), inset 0 0 0 3.5px var(--back-b, #054ABD); }
.sq-hint { position: absolute; left: 0; right: 0; bottom: -15px; text-align: center; font-size: 10px; font-weight: 600; color: var(--t-mid); pointer-events: none; animation: hintPulse 1.6s ease-in-out infinite; }
.flights { position: fixed; top: 0; right: 0; bottom: 0; left: 0; pointer-events: none; z-index: 26; }
.flight { position: absolute; width: 0; height: 0; }
.fchip { position: absolute; left: -9px; top: -9px; width: 18px; height: 18px; border-radius: 50%; border: 3px dashed rgba(255,255,255,0.88); box-shadow: 0 2px 5px rgba(0,0,0,0.45); animation: chipFly .62s cubic-bezier(.3,.6,.25,1) both; }
.fchip.c0 { background: var(--t-accent); } .fchip.c1 { background: #F40028; } .fchip.c2 { background: #0D68F8; }
.float-amt { position: absolute; transform: translate(-50%, -50%); font-weight: 800; font-size: 17px; color: var(--t-good); text-shadow: 0 2px 10px rgba(0,0,0,0.7); animation: floatUp 1.3s ease-out .45s both; white-space: nowrap; }
.bigwin { position: fixed; top: 0; right: 0; bottom: 0; left: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; pointer-events: none; z-index: 27; animation: bigWinBg 2.1s ease both; }
.bigwin-label { font-family: var(--t-display); font-size: 30px; font-weight: 700; color: var(--t-accent); animation: bigWinPop 2.1s cubic-bezier(.2,.9,.3,1.2) both; }
.bigwin-amt { font-size: 56px; font-weight: 800; color: #FFFFFF; text-shadow: 0 6px 30px rgba(252,182,0,0.65); animation: bigWinPop 2.1s cubic-bezier(.2,.9,.3,1.2) .08s both; }
.shine { position: relative; overflow: hidden; }
.shine::after { content: ""; position: absolute; top: 0; bottom: 0; left: -60%; width: 40%; background: linear-gradient(100deg, transparent, rgba(255,255,255,0.5), transparent); transform: skewX(-20deg); animation: shimmer 4.8s ease-in-out infinite; pointer-events: none; }
.shine:disabled::after { display: none; }
@keyframes chipFly { 0% { transform: translate3d(0,0,0) scale(.7); opacity: 0; } 12% { opacity: 1; } 85% { opacity: 1; } 100% { transform: translate3d(var(--dx), var(--dy), 0) scale(1); opacity: 0; } }
@keyframes floatUp { 0% { opacity: 0; transform: translate(-50%,-30%) scale(.8); } 20% { opacity: 1; transform: translate(-50%,-90%) scale(1.08); } 100% { opacity: 0; transform: translate(-50%,-260%) scale(1); } }
@keyframes bigWinPop { 0% { opacity: 0; transform: scale(.5); } 18% { opacity: 1; transform: scale(1.1); } 30% { transform: scale(1); } 80% { opacity: 1; } 100% { opacity: 0; transform: scale(1.05) translateY(-20px); } }
@keyframes bigWinBg { 0% { background: rgba(9,20,42,0); } 20% { background: rgba(9,20,42,0.5); } 80% { background: rgba(9,20,42,0.5); } 100% { background: rgba(9,20,42,0); } }
@keyframes hintPulse { 0%, 100% { opacity: .5; } 50% { opacity: 1; } }
@keyframes shimmer { 0%, 72% { left: -60%; } 100% { left: 130%; } }
/* ---- progression + color pass ---- */
.app { position: relative; isolation: isolate; background: var(--t-bg); }
.app::before { content: ""; position: absolute; top: -20%; left: -20%; right: -20%; height: 90%; pointer-events: none; z-index: -1; background: radial-gradient(40% 45% at 22% 18%, rgba(13,112,255,0.38), transparent 70%), radial-gradient(35% 40% at 85% 10%, rgba(131,59,255,0.30), transparent 70%), radial-gradient(40% 40% at 60% 70%, rgba(0,184,166,0.16), transparent 70%); animation: aurora 22s ease-in-out infinite alternate; }
.app { overflow: hidden; }
@keyframes aurora { 0% { transform: translate3d(0,0,0) scale(1); } 50% { transform: translate3d(4%,3%,0) scale(1.06); } 100% { transform: translate3d(-4%,1%,0) scale(1.02); } }
.panel { background: linear-gradient(180deg, rgba(19,41,85,0.94), rgba(14,32,64,0.94)); box-shadow: 0 10px 30px rgba(0,0,0,0.22); }
.row, .stat, .avatar-tile { background: rgba(17,37,75,0.9); }
.panel-label { display: flex; align-items: center; gap: 6px; font-size: 12.5px; font-weight: 600; color: var(--t-mid); margin-bottom: 12px; }
.sec-ic { width: 28px; height: 28px; border-radius: 9px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.badge-dot { min-width: 18px; height: 18px; padding: 0 5px; border-radius: 9px; background: #FF456E; color: #FFFFFF; font-size: 11px; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; animation: badgePop .35s ease; }
.streak-pill { color: #FF8F30; border-color: rgba(255,126,53,0.4); background: rgba(255,126,53,0.12); }

.streak-banner { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; padding: 14px 14px 14px 12px; border-radius: 18px; background: linear-gradient(120deg, #FF6A17 0%, #FF1174 100%); box-shadow: 0 10px 28px rgba(255,17,116,0.3); animation: riseIn .4s ease both; }
.streak-flame { width: 42px; height: 42px; border-radius: 13px; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; color: #FFFFFF; animation: flameBob 1.6s ease-in-out infinite; flex-shrink: 0; }
@keyframes flameBob { 0%, 100% { transform: translateY(0) rotate(-3deg); } 50% { transform: translateY(-2px) rotate(3deg); } }
.streak-panel { background: linear-gradient(160deg, rgba(255,106,23,0.2) 0%, rgba(19,41,85,0.94) 55%); border-color: rgba(255,126,53,0.3); }
.streak-row { display: grid; grid-template-columns: repeat(7, 1fr); gap: 5px; margin-top: 14px; }
.streak-day { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 8px 0 7px; border-radius: 11px; background: rgba(244,247,252,0.05); border: 1px solid rgba(244,247,252,0.07); color: var(--t-mid); }
.streak-day .sd-n { font-size: 9.5px; font-weight: 600; }
.streak-day .sd-amt { font-size: 11px; font-weight: 700; color: var(--t-text); }
.streak-day.got { background: rgba(0,213,150,0.14); border-color: rgba(0,213,150,0.4); color: var(--t-good); }
.streak-day.today { border-color: #FF7E35; background: rgba(255,126,53,0.16); box-shadow: 0 0 0 2px rgba(255,126,53,0.25); animation: hintPulse 1.8s ease-in-out infinite; }
.streak-day.big:not(.got) { background: linear-gradient(180deg, rgba(252,182,0,0.22), rgba(252,182,0,0.06)); border-color: rgba(252,182,0,0.45); }


.pr-ic { border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.pass-row { display: flex; align-items: center; gap: 10px; padding: 9px 8px; border-radius: 12px; border: 1px solid transparent; }
.pass-row + .pass-row { margin-top: 2px; }
.pass-row.special { background: rgba(131,59,255,0.1); }
.pass-row.got { opacity: 0.62; }
.pass-row.next { border-color: rgba(252,182,0,0.6); background: rgba(252,182,0,0.08); opacity: 1; }
.pass-row-n { width: 22px; text-align: center; font-size: 12px; font-weight: 700; color: var(--t-mid); }

.chal-panel { border-color: rgba(0,213,150,0.2); }
.chal { display: flex; align-items: center; gap: 12px; padding: 11px 12px; border-radius: 14px; background: rgba(244,247,252,0.04); border: 1px solid rgba(244,247,252,0.06); }
.chal.claimed { opacity: 0.5; }
.chal-done { width: 32px; height: 32px; border-radius: 50%; background: rgba(0,213,150,0.16); color: var(--t-good); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }

.var-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-bottom: 12px; }
.var-tile { border: 1.5px solid rgba(244,247,252,0.1); background: rgba(244,247,252,0.04); border-radius: 14px; padding: 10px 9px; text-align: left; cursor: pointer; transition: border-color .15s ease, background .15s ease; }
.var-name { font-size: 13px; font-weight: 700; }
.var-sub { font-size: 10.5px; color: var(--t-mut); margin-top: 2px; line-height: 1.3; }
.var-tile.on.v-holdem { border-color: var(--t-good); background: rgba(0,213,150,0.12); }
.var-tile.on.v-omaha { border-color: #A07BFF; background: rgba(131,59,255,0.14); }
.var-tile.on.v-short { border-color: #FF8F30; background: rgba(255,126,53,0.13); }
.turbo-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 12px; padding: 10px 12px; border-radius: 14px; background: rgba(244,247,252,0.04); border: 1px solid rgba(244,247,252,0.07); }
.turbo-ic { width: 30px; height: 30px; border-radius: 9px; background: rgba(252,182,0,0.16); color: var(--t-accent); display: flex; align-items: center; justify-content: center; }

.cos-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.cos-tile { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 12px 6px 10px; border-radius: 16px; background: rgba(17,37,75,0.9); border: 1.5px solid rgba(244,247,252,0.07); cursor: pointer; transition: border-color .15s ease, transform .12s ease; }
.cos-tile:active:not(:disabled) { transform: scale(0.96); }
.cos-tile.on { border-color: var(--t-good); box-shadow: 0 0 0 3px rgba(0,213,150,0.15); }
.cos-tile:disabled { cursor: default; }
.cos-prev { height: 62px; display: flex; align-items: center; justify-content: center; }
.cos-name { font-size: 11.5px; font-weight: 600; text-align: center; }
.cos-tag { display: inline-flex; align-items: center; gap: 4px; font-size: 10.5px; font-weight: 700; padding: 3px 8px; border-radius: 10px; background: rgba(244,247,252,0.08); color: var(--t-text2); }
.cos-tag.eq { background: rgba(0,213,150,0.16); color: var(--t-good); }
.cos-tag.buy { background: rgba(252,182,0,0.16); color: var(--t-accent); }
.cos-tag.locked { color: var(--t-faint); }
.back-sw { border-radius: 6px; }
.felt-sw { width: 78px; height: 48px; border-radius: 999px; border: 4px solid; box-shadow: 0 4px 10px rgba(0,0,0,0.35), inset 0 4px 10px rgba(0,0,0,0.3); }

.chart-dot { position: absolute; width: 10px; height: 10px; margin: -5px 0 0 -5px; border-radius: 50%; box-shadow: 0 0 0 2px var(--t-panel); pointer-events: none; }
.best-row { display: flex; align-items: center; gap: 10px; padding: 9px 10px; border-radius: 12px; background: rgba(244,247,252,0.04); }
.best-n { width: 22px; height: 22px; border-radius: 50%; background: rgba(252,182,0,0.16); color: var(--t-accent); font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }

.play-fab-disc { animation: fabGlow 2.6s ease-in-out infinite; }
@keyframes fabGlow { 0%, 100% { box-shadow: 0 0 10px rgba(252,182,0,0.3); } 50% { box-shadow: 0 0 18px rgba(252,182,0,0.6); } }
.toast { background: linear-gradient(135deg, #15336E, #2B176A); border-color: rgba(252,182,0,0.6); }
.table-wrap::before { content: ""; position: absolute; top: 0; left: 0; right: 0; bottom: 0; pointer-events: none; z-index: -1; background: radial-gradient(60% 40% at 50% 42%, var(--felt1, #00A963), transparent 70%); opacity: 0.16; animation: tableBreath 6s ease-in-out infinite; }
.table-wrap { isolation: isolate; }
@keyframes tableBreath { 0%, 100% { opacity: 0.12; } 50% { opacity: 0.22; } }
.pot-num { position: relative; }
.felt-oval { padding-top: 34px; padding-bottom: 28px; }
.felt-logo { white-space: nowrap; }
/* ---- round 3: coach, chip piles, all in drama, titles ---- */
.code-box { width: 100%; height: 76px; resize: none; font-family: ui-monospace, Menlo, monospace; font-size: 10.5px; line-height: 1.35; word-break: break-all; }
.title-tag { font-weight: 700; letter-spacing: 0.02em; white-space: nowrap; }
.title-btn { background: rgba(244,247,252,0.05); border: 1px solid rgba(244,247,252,0.1); border-radius: 20px; padding: 3px 10px; margin-top: 4px; display: inline-flex; align-items: center; gap: 5px; cursor: pointer; }
.title-row { display: flex; align-items: center; gap: 10px; width: 100%; padding: 11px 14px; border-radius: 14px; background: rgba(17,37,75,0.9); border: 1px solid rgba(244,247,252,0.07); }
.title-row.on { border-color: var(--t-good); }
.standing { margin-left: 8px; font-size: 10.5px; font-weight: 700; color: var(--t-accent); background: rgba(252,182,0,0.12); border-radius: 8px; padding: 1px 6px; }

.coach { width: 100%; max-width: 460px; margin-bottom: 8px; border-radius: 14px; padding: 9px 12px 10px; border: 1px solid rgba(94,158,255,0.35); background: linear-gradient(135deg, rgba(13,104,248,0.16), rgba(131,59,255,0.12)); animation: fadeSlide .25s ease; flex-shrink: 0; }
.coach-head { display: flex; align-items: center; gap: 8px; margin-bottom: 3px; }
.coach-badge { display: inline-flex; align-items: center; gap: 4px; font-size: 10.5px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: #91BBFF; }
.coach-act { font-size: 14px; font-weight: 800; }
.coach-why { font-size: 12px; line-height: 1.4; color: var(--t-text2); }
.coach.act-raise .coach-act, .coach.act-bet .coach-act { color: var(--t-accent); }
.coach.act-call .coach-act, .coach.act-check .coach-act { color: var(--t-good); }
.coach.act-fold .coach-act { color: #FF7E7F; }
.coach.note.good { border-color: rgba(0,213,150,0.4); background: rgba(0,213,150,0.1); }
.coach.note.bad { border-color: rgba(255,126,53,0.45); background: rgba(255,126,53,0.1); }
.coach.note.bad .coach-badge { color: #FEAA69; }
.coach.note.good .coach-badge { color: #3EEDB1; }

.chipstack { display: inline-flex; align-items: flex-end; gap: 2px; vertical-align: bottom; }
.chipcol { display: flex; flex-direction: column-reverse; }
.pchip { display: block; width: 24px; height: 6px; border-radius: 10px / 3px; margin-top: -1.5px; background: repeating-linear-gradient(90deg, var(--cc) 0 3px, rgba(255,255,255,0.85) 3px 5px, var(--cc) 5px 9px); box-shadow: inset 0 -1.5px 0 rgba(0,0,0,0.35), 0 1px 1px rgba(0,0,0,0.35); animation: chipDrop .28s cubic-bezier(.3,1.4,.5,1) backwards; }
.chipstack.sm .pchip { width: 12px; height: 3.5px; margin-top: -1px; border-radius: 6px / 2px; }
@keyframes chipDrop { from { transform: translateY(-10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
.pot-row { display: flex; align-items: flex-end; gap: 8px; position: relative; min-height: 30px; }
.chip-badge { display: inline-flex; align-items: center; gap: 5px; }

.odds-badge { font-size: 11px; font-weight: 800; background: rgba(9,20,42,0.85); border: 1px solid rgba(244,247,252,0.15); border-radius: 10px; padding: 1px 7px; animation: fadeSlide .25s ease; }
.think-dots { position: absolute; top: -6px; right: -10px; display: flex; gap: 2px; background: var(--t-text); border-radius: 10px; padding: 4px 5px; box-shadow: 0 2px 6px rgba(0,0,0,0.35); }
.think-dots i { width: 4px; height: 4px; border-radius: 50%; background: var(--t-bg); animation: thinkDot 1s ease-in-out infinite; }
.think-dots i:nth-child(2) { animation-delay: .15s; }
.think-dots i:nth-child(3) { animation-delay: .3s; }
@keyframes thinkDot { 0%, 100% { opacity: .3; transform: translateY(0); } 40% { opacity: 1; transform: translateY(-2px); } }

.drama-vignette { position: fixed; top: 0; left: 0; right: 0; bottom: 0; pointer-events: none; z-index: 5; background: radial-gradient(ellipse 70% 40% at 50% 50%, transparent 30%, rgba(0,0,0,0.55) 100%); animation: dramaIn .5s ease both, dramaPulse 0.85s ease-in-out .5s infinite; }
@keyframes dramaIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes dramaPulse { 0%, 100% { opacity: 1; } 30% { opacity: 0.75; } }
.felt-oval.drama { z-index: 6; box-shadow: inset 0 0 0 2px rgba(0,0,0,0.25), inset 0 10px 30px rgba(0,0,0,0.35), 0 0 0 2px rgba(252,182,0,0.5), 0 0 50px rgba(252,182,0,0.35); transition: box-shadow .4s ease; }
.is-drama .hero-seat { position: relative; z-index: 6; }
.card-slot.next { border-color: #FEC100; border-style: solid; box-shadow: 0 0 16px rgba(252,182,0,0.6); animation: slotPulse .85s ease-in-out infinite; }
@keyframes slotPulse { 0%, 100% { transform: scale(1); } 30% { transform: scale(1.07); } }
/* ---- daily spin, high roller room, prestige ---- */
.spin-card { width: 100%; display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 18px; cursor: pointer; text-align: left; color: var(--t-text); background: rgba(17,37,75,0.9); border: 1px solid rgba(244,247,252,0.08); transition: transform .14s ease; }
.spin-card:active { transform: scale(0.98); }
.spin-card.ready { background: linear-gradient(120deg, #0059E8 0%, #00A5B8 100%); border-color: transparent; box-shadow: 0 10px 26px rgba(0,165,184,0.28); }
.spin-ic { width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.14); flex-shrink: 0; }
.spin-card.ready .spin-ic { animation: spinNudge 3s ease-in-out infinite; }
@keyframes spinNudge { 0%, 70%, 100% { transform: rotate(0); } 80% { transform: rotate(-25deg); } 90% { transform: rotate(15deg); } }
.wheel-wrap { position: relative; width: 260px; max-width: 100%; margin: 6px auto 0; height: 260px; }
.wheel { width: 100%; height: 100%; display: block; filter: drop-shadow(0 10px 24px rgba(0,0,0,0.45)); }
.wheel-pointer { position: absolute; top: -6px; left: 50%; margin-left: -13px; width: 0; height: 0; border-left: 13px solid transparent; border-right: 13px solid transparent; border-top: 24px solid #FEC100; z-index: 2; filter: drop-shadow(0 3px 4px rgba(0,0,0,0.5)); }
.spin-result { text-align: center; margin-top: 14px; animation: badgePop .45s cubic-bezier(.3,1.4,.5,1) both; }


.prestige-badge { display: inline-block; flex-shrink: 0; vertical-align: middle; margin-left: 2px; overflow: visible; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.35)); }
.prestige-btn { border-color: rgba(224,88,255,0.55); color: #EFBDFF; background: linear-gradient(135deg, rgba(224,88,255,0.16), rgba(126,15,255,0.16)); font-size: 13px; }
/* ---- 9 handed: two rows of four, tighter table ---- */
.seats.grid4 { display: grid; grid-template-columns: repeat(4, 1fr); justify-items: center; row-gap: 2px; margin-top: 0; }
.crowded .status { margin: 4px 0 0; }
.crowded .felt-oval { padding: 16px 14px 12px; gap: 8px; }
.crowded .felt-center { gap: 6px; }
.crowded .felt-oval .card, .crowded .card-slot { width: clamp(28px,7.6vw,36px); height: clamp(40px,10.8vw,51px); }
.crowded .felt-logo { font-size: 52px; }
.crowded .chip-badge { padding: 1px 7px; }
/* ---- rank ladder ---- */
.ranked-info { display: inline-flex; align-items: center; gap: 5px; background: none; border: none; padding: 0; cursor: pointer; color: var(--t-mut); font-size: 12px; }
.ranked-badge-btn { background: none; border: none; padding: 0; cursor: pointer; display: block; }
.ladder-me { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 16px; border: 1px solid; margin-bottom: 12px; }
.ladder-list { max-height: 44vh; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; margin: 0 -4px; padding: 0 4px; }
.ladder-tier { border: 1px solid; border-radius: 14px; padding: 10px 12px; background: rgba(17,37,75,0.7); }
.ladder-tier-head { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.ladder-divs { display: flex; flex-direction: column; gap: 4px; }
.ladder-div { display: flex; justify-content: space-between; align-items: center; font-size: 12.5px; padding: 6px 10px; border-radius: 9px; border: 1px solid transparent; background: rgba(244,247,252,0.03); color: var(--t-text2); }
.ladder-div.passed { color: var(--t-mut); }
.ladder-section { margin-top: 14px; padding-top: 12px; border-top: 1px solid rgba(244,247,252,0.08); }
.ladder-h { font-size: 13.5px; font-weight: 700; margin-bottom: 6px; }
.ladder-p { font-size: 12px; line-height: 1.45; color: var(--t-mid); margin-bottom: 6px; }
.prestige-box { border: 1px solid rgba(224,88,255,0.3); border-radius: 14px; padding: 12px; background: linear-gradient(135deg, rgba(224,88,255,0.08), rgba(126,15,255,0.08)); }
/* ---- rank emblems ---- */
.tb-champ .tb-sparkle { animation: tbTwinkle 2.4s ease-in-out infinite; transform-origin: 32px 32px; }
@keyframes tbTwinkle { 0%, 100% { opacity: 1; } 50% { opacity: 0.25; } }
/* ---- hold to peek ---- */
.peek { display: flex; gap: 6px; position: relative; touch-action: none; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; cursor: pointer; }
.peek .card.peek-open { transform: translateY(-6px) rotate(-1deg); transition: transform .12s ease; }
.peek .card.peek-open + .card.peek-open { transform: translateY(-6px) rotate(1.5deg); }
.peek-badge { position: absolute; top: -6px; left: -8px; z-index: 3; width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: var(--t-accent); color: #09142A; box-shadow: 0 0 0 3px rgba(252,182,0,0.25), 0 2px 6px rgba(0,0,0,0.4); animation: peekPop .22s cubic-bezier(.3,1.5,.5,1) both, peekGlow 1.2s ease-in-out .22s infinite; }
.peek-badge.hero { top: -4px; left: -4px; }
@keyframes peekPop { from { opacity: 0; transform: scale(.4); } to { opacity: 1; transform: scale(1); } }
@keyframes peekGlow { 0%, 100% { box-shadow: 0 0 0 3px rgba(252,182,0,0.25), 0 2px 6px rgba(0,0,0,0.4); } 50% { box-shadow: 0 0 0 6px rgba(252,182,0,0.12), 0 2px 6px rgba(0,0,0,0.4); } }
.backs .card.mini { transition: transform .2s ease; }
.backs.peeking .card.mini { transform: rotate(var(--r, 0deg)) translateY(-5px) scaleY(0.8); }
/* practice: the coach and your odds share one fixed-height panel */
.coach-panel { position: relative; overflow: hidden; width: 100%; max-width: 460px; flex-shrink: 0; margin-bottom: 8px; border-radius: 14px; padding: 8px 12px 9px; height: 70px; border: 1px solid rgba(94,158,255,0.3); background: linear-gradient(135deg, rgba(13,104,248,0.13), rgba(131,59,255,0.09)); transition: border-color .25s ease, background .25s ease; }
.coach-panel > * { position: relative; }
.coach-panel .cp-meter { position: absolute; top: 0; left: 0; bottom: 0; transition: width .45s ease, background .3s ease; }
.cp-top { display: flex; align-items: center; gap: 8px; min-height: 20px; margin-bottom: 3px; }
.cp-hand { margin-left: auto; display: inline-flex; align-items: baseline; gap: 7px; min-width: 0; }
.cp-name { font-size: 12px; font-weight: 600; color: var(--t-text2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cp-hand b { font-size: 14px; font-weight: 800; }
.coach-panel .coach-why { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.coach-panel.act-raise .coach-act, .coach-panel.act-bet .coach-act { color: var(--t-accent); }
.coach-panel.act-call .coach-act, .coach-panel.act-check .coach-act { color: var(--t-good); }
.coach-panel.act-fold .coach-act { color: #FF7E7F; }
.coach-panel.note.good { border-color: rgba(0,213,150,0.4); background: rgba(0,213,150,0.08); }
.coach-panel.note.bad { border-color: rgba(255,126,53,0.45); background: rgba(255,126,53,0.08); }
.coach-panel.note.bad .coach-badge { color: #FEAA69; }
.coach-panel.note.good .coach-badge { color: #3EEDB1; }
.coach-panel.idle .coach-why { color: var(--t-mid); }

/* shorter phones and Safari with its bars showing: tighten everything so the felt never runs into the seats */
@media (max-height: 760px) {
  .table-wrap { padding-top: 8px; padding-bottom: 8px; }
  .table-wrap .status { margin: 4px 0 0; min-height: 16px; }
  .table-wrap .felt-oval { padding-top: 18px !important; padding-bottom: 14px !important; gap: 7px; }
  .table-wrap .felt-logo { font-size: 50px; }
  .table-wrap .felt-center { gap: 6px; }
  .table-wrap .hero-seat { padding: 8px 12px; border-radius: 16px; }
  .table-wrap .card.big:not(.o4) { width: clamp(46px,13vw,56px); height: clamp(64px,18.5vw,78px); font-size: clamp(17px,5vw,21px); }
  .table-wrap .controls { padding-top: 8px; }
  .table-wrap .controls .btn { padding-top: 11px; padding-bottom: 11px; }
  .table-wrap .pre-btn { padding-top: 10px; padding-bottom: 10px; }
}
/* drawn card backs and felt textures (patterns come from the item, colors from its vars) */
.card.back, .sq-cover { background-image: var(--back-img, repeating-linear-gradient(45deg, rgba(255,255,255,0.14) 0 3px, transparent 3px 7px)); background-size: var(--back-size, auto); background-position: center; }
.backs .card.mini.back { background-size: var(--back-size, auto); }
.felt-oval { background-image: var(--felt-tex, linear-gradient(transparent, transparent)), repeating-radial-gradient(circle at 30% 40%, rgba(255,255,255,0.022) 0 1px, transparent 1px 3px), radial-gradient(ellipse at 50% 40%, var(--felt1, #00A963) 0%, var(--felt2, #008146) 52%, var(--felt3, #005D31) 100%); background-size: var(--felt-tex-size, 100% 100%), auto, 100% 100%; }
.felt-oval::before { content: ""; position: absolute; top: 9px; right: 9px; bottom: 9px; left: 9px; border-radius: 999px; border: 1.5px solid var(--felt-line, transparent); pointer-events: none; }
.felt-sw { position: relative; }
.felt-sw-line { position: absolute; top: 3px; right: 3px; bottom: 3px; left: 3px; border-radius: 999px; border: 1px solid; }
/* profile photo */
.profile-av { position: relative; overflow: visible; }
.av-photo { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; display: block; }
.av-edit { position: absolute; right: -2px; bottom: -2px; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: var(--t-text); color: var(--t-bg); box-shadow: 0 0 0 3px var(--t-bg); }
.photo-row { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.photo-up { position: relative; display: inline-flex; align-items: center; justify-content: center; gap: 8px; overflow: hidden; }
.photo-up input { position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; font-size: 0; }
.photo-tile { width: 48px; height: 48px; padding: 0 !important; flex-shrink: 0; overflow: hidden; border-radius: 50% !important; }
.photo-tile img { width: 100%; height: 100%; object-fit: cover; display: block; }
.photo-tile.on { box-shadow: 0 0 0 2px var(--t-good) !important; }
/* accounts and friends */
.auth-form { display: flex; flex-direction: column; gap: 12px; }
.auth-field { display: flex; flex-direction: column; gap: 5px; }
.auth-field > span { font-size: 12px; font-weight: 600; color: var(--t-sub); }
.auth-field small { font-size: 11px; color: var(--t-faint); }
.auth-field .input, .auth-at .input { width: 100%; box-sizing: border-box; }
.auth-at { position: relative; display: flex; align-items: center; }
.auth-at b { position: absolute; left: 12px; color: var(--t-mut); font-weight: 600; pointer-events: none; font-size: 14px; }
.auth-at .input { padding-left: 28px !important; }
.auth-err { font-size: 12.5px; color: var(--t-bad); background: rgba(255,88,92,0.08); border: 1px solid rgba(255,88,92,0.3); border-radius: 10px; padding: 8px 10px; }
.auth-switch { text-align: center; font-size: 12.5px; color: var(--t-mut); }
.auth-switch button { background: none; border: none; color: var(--t-accent); font-weight: 700; cursor: pointer; font-size: 12.5px; padding: 0 2px; }
.auth-note { text-align: center; font-size: 11.5px; color: var(--t-faint); margin-top: -4px; }
.acct-cta { padding: 16px !important; margin-bottom: 8px; }
.friend-row { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 14px; background: var(--t-panel); border: 1px solid rgba(244,247,252,0.06); }
.friend-row.tap { cursor: pointer; transition: transform .12s ease, border-color .15s ease; }
.friend-row.tap:active { transform: scale(0.985); }
.friend-sub { font-size: 11px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--t-mut); margin: 4px 2px 6px; }
.friend-msg { font-size: 12px; color: var(--t-bad); margin: 0 2px 10px; }
.friend-msg.ok { color: var(--t-good); }
.fp-head { display: flex; flex-direction: column; align-items: center; text-align: center; margin-top: -6px; }
.fp-name { font-family: var(--t-display); font-size: 22px; font-weight: 700; margin-top: 10px; display: flex; align-items: center; gap: 6px; }
.fp-user { font-size: 12px; color: var(--t-mut); margin-top: 2px; }
.fp-rank { display: flex; align-items: center; gap: 12px; margin-top: 16px; padding: 12px 14px; border-radius: 14px; background: rgba(244,247,252,0.04); border: 1px solid rgba(244,247,252,0.07); }
.fp-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-top: 8px; }
.fp-stats > div { display: flex; flex-direction: column; align-items: center; gap: 1px; padding: 10px 4px; border-radius: 12px; background: rgba(244,247,252,0.04); border: 1px solid rgba(244,247,252,0.06); }
.fp-stats b { font-size: 15px; font-weight: 750; }
.fp-stats span { font-size: 10.5px; color: var(--t-mut); }
.live-dot { position: absolute; right: -1px; bottom: -1px; border-radius: 50%; background: #00D596; box-shadow: 0 0 0 2px var(--t-panel), 0 0 8px rgba(0,213,150,0.6); }
.fp-status { font-size: 12px; color: var(--t-mut); margin-top: 3px; }
.fp-status.on { color: var(--t-good); font-weight: 600; }
.lb-row.tap { cursor: pointer; }
.lb-row.tap:active { transform: scale(0.985); }
/* online tables */
.ft-card { width: 100%; display: flex; align-items: center; gap: 12px; padding: 14px; border-radius: 18px; cursor: pointer; text-align: left; color: var(--t-text); background: linear-gradient(135deg, rgba(0,213,150,0.16), rgba(13,104,248,0.12)); border: 1px solid rgba(0,213,150,0.35); transition: transform .14s ease; }
.ft-card:active { transform: scale(0.98); }
.ft-ic { width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: #3EEDB1; background: rgba(0,213,150,0.16); flex-shrink: 0; }
.stake-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
.stake-btn { padding: 9px 4px; border-radius: 10px; border: 1px solid rgba(244,247,252,0.12); background: rgba(244,247,252,0.04); color: var(--t-sub); font-weight: 650; font-size: 12.5px; cursor: pointer; }
.stake-btn.on { border-color: var(--t-accent); color: var(--t-accent); background: rgba(252,182,0,0.1); }
.code-input { width: 100%; box-sizing: border-box; text-align: center; font-size: 30px !important; font-weight: 800; letter-spacing: 0.4em; padding: 14px 0 14px 0.4em !important; }
.code-card { text-align: center; padding: 14px; border-radius: 14px; background: rgba(244,247,252,0.04); border: 1px dashed rgba(244,247,252,0.18); margin-bottom: 10px; }
.code-big { font-size: 34px; font-weight: 800; letter-spacing: 0.3em; padding-left: 0.3em; margin-top: 2px; }
.ot-sit { border-radius: 50%; border: 1.5px dashed rgba(0,213,150,0.6); background: rgba(0,213,150,0.08); color: #3EEDB1; font-size: 20px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 0; }
.ot-open { border-radius: 50%; border: 1.5px dashed rgba(244,247,252,0.15); }
.ot-av { overflow: hidden; background: var(--t-panel2) !important; }
.ot-last { font-size: 10px; font-weight: 700; color: var(--t-sub); background: rgba(244,247,252,0.06); border-radius: 8px; padding: 2px 7px; white-space: nowrap; }
.ot-watch { flex-direction: column; align-items: flex-start !important; gap: 3px !important; border-color: rgba(244,247,252,0.08) !important; }
.emote-bubble { position: absolute; bottom: calc(100% + 4px); left: 50%; transform: translateX(-50%); z-index: 5; background: var(--t-text); color: var(--t-bg); font-size: 13px; font-weight: 700; padding: 4px 9px; border-radius: 12px; white-space: nowrap; box-shadow: 0 6px 16px rgba(0,0,0,0.35); animation: emotePop 3.4s ease forwards; pointer-events: none; }
.emote-bubble::after { content: ""; position: absolute; top: 100%; left: 50%; margin-left: -5px; border: 5px solid transparent; border-top-color: var(--t-text); }
@keyframes emotePop { 0% { opacity: 0; transform: translate(-50%, 6px) scale(0.8); } 8% { opacity: 1; transform: translate(-50%, 0) scale(1.06); } 14% { transform: translate(-50%, 0) scale(1); } 85% { opacity: 1; } 100% { opacity: 0; transform: translate(-50%, -6px); } }
.emote-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.emote-btn { padding: 14px 6px; border-radius: 14px; border: 1px solid rgba(244,247,252,0.1); background: rgba(244,247,252,0.04); color: var(--t-text); font-size: 22px; cursor: pointer; font-weight: 700; }
.emote-btn:nth-child(n+7) { font-size: 13.5px; }
.invite-banner { position: fixed; left: 12px; right: 12px; top: calc(env(safe-area-inset-top) + 10px); z-index: 40; display: flex; align-items: center; gap: 8px; padding: 12px 12px 12px 14px; border-radius: 16px; background: var(--t-panel); border: 1px solid rgba(0,213,150,0.45); box-shadow: 0 14px 34px rgba(0,0,0,0.45); animation: sheetIn .25s ease; max-width: 460px; margin: 0 auto; }
/* prestige: shimmering names, seat crowns, the perk track, season end */
.pname { background: linear-gradient(90deg, #FAE3A1 0%, #F1B700 25%, #FEF4D3 50%, #F1B700 75%, #FAE3A1 100%); background-size: 200% auto; -webkit-background-clip: text; background-clip: text; color: transparent !important; -webkit-text-fill-color: transparent; animation: pshine 3.6s linear infinite; }
@keyframes pshine { to { background-position: -200% center; } }
.crown-mark { position: absolute; left: 50%; transform: translateX(-50%); z-index: 4; display: flex; align-items: center; justify-content: center; color: #FBBE00; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.6)) drop-shadow(0 0 6px rgba(251,190,0,0.45)); pointer-events: none; }
.profile-av .crown-mark { z-index: 2; }
.perk-list { display: flex; flex-direction: column; gap: 6px; margin-top: 10px; }
.perk { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 10px; background: rgba(244,247,252,0.04); font-size: 12.5px; color: var(--t-sub); }
.perk.got { color: var(--t-text); background: rgba(224,88,255,0.1); }
.season-end { display: flex; flex-direction: column; align-items: center; text-align: center; margin-top: -10px; }
.se-kicker { font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--t-mut); margin-top: 14px; }
.se-title { font-family: var(--t-display); font-size: 28px; font-weight: 700; margin-top: 4px; }
.se-body { font-size: 13px; line-height: 1.5; color: var(--t-mid); margin-top: 8px; }
.pr-ic { display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.pa-av { border-radius: 50%; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.1); box-shadow: inset 0 0 0 2px rgba(255,255,255,0.15); }
.pa-emote { background: #F4F7FC; color: #09142A; font-weight: 800; padding: 0.25em 0.5em; border-radius: 0.7em; position: relative; white-space: nowrap; line-height: 1.1; }
.pa-emote::after { content: ""; position: absolute; top: 100%; left: 50%; margin-left: -0.25em; border: 0.25em solid transparent; border-top-color: #F4F7FC; }
.pa-title { max-width: 72px; text-align: center; overflow: hidden; }
.ps-art .pa-title { max-width: 110px; }
.pa-chips { border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px; background: radial-gradient(circle at 50% 35%, rgba(252,182,0,0.35), rgba(252,182,0,0.08)); color: #FEC100; box-shadow: inset 0 0 0 1.5px rgba(252,182,0,0.45); }
.chipset-sw { height: 48px; display: flex; align-items: flex-end; justify-content: center; padding-bottom: 6px; }
.fx-sw { width: 48px; height: 48px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: radial-gradient(circle, rgba(255,255,255,0.12), rgba(255,255,255,0.02)); position: relative; }
.fx-sw-coin { width: 24px; height: 24px; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #FFF2BA, #FBBE00 45%, #B37900); box-shadow: inset 0 0 0 2px rgba(255,238,193,0.6), 0 2px 6px rgba(0,0,0,0.4); animation: coinSpin 1.6s linear infinite; }
.fx-sw-burst { position: relative; width: 4px; height: 4px; }
.fx-sw-burst i { position: absolute; left: 0; top: 0; width: 4px; height: 9px; border-radius: 2px; background: #FF6CB3; transform-origin: 2px 2px; box-shadow: 0 0 6px #FF6CB3; }
.fx-sw-burst i:nth-child(odd) { background: #FCB600; box-shadow: 0 0 6px #FCB600; }
.fx-sw-conf { position: relative; width: 4px; height: 4px; }
.fx-sw-conf i { position: absolute; width: 6px; height: 10px; border-radius: 1.5px; }
@keyframes coinSpin { 0% { transform: rotateY(0deg); } 100% { transform: rotateY(360deg); } }
/* win effects at the table */
.fx-layer { position: absolute; top: 0; right: 0; bottom: 0; left: 0; pointer-events: none; overflow: hidden; z-index: 20; }
.fx-coin { position: absolute; top: -30px; }
.fx-coin i { display: block; width: 100%; height: 100%; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #FFF2BA, #FBBE00 45%, #B37900); box-shadow: inset 0 0 0 2px rgba(255,238,193,0.6), 0 3px 8px rgba(0,0,0,0.35); animation: coinSpin var(--spin) linear infinite; }
@keyframes coinFall { 0% { transform: translateY(0); opacity: 1; } 85% { opacity: 1; } 100% { transform: translateY(105vh); opacity: 0; } }
.fx-burst { position: absolute; width: 0; height: 0; }
.fx-burst i { position: absolute; left: -3px; top: -3px; width: 6px; height: 6px; border-radius: 50%; }
@keyframes burstOut { 0% { transform: translate(0, 0) scale(0.4); opacity: 0; } 12% { opacity: 1; } 70% { opacity: 1; } 100% { transform: translate(var(--dx), calc(var(--dy) + 30px)) scale(0.6); opacity: 0; } }
/* animated holo back and aurora felt */
@keyframes holoShift { 0% { background-position: center, 0 0, 0% 50%; } 100% { background-position: center, 0 0, 100% 50%; } }
.holo-anim, .table-wrap[data-back="holo"] .card.back, .table-wrap[data-back="holo"] .sq-cover { animation: holoShift 5s linear infinite alternate; }
@keyframes auroraShift { 0% { background-position: 0% 50%, 0 0, 0 0; } 100% { background-position: 100% 50%, 0 0, 0 0; } }
.aurora-anim, .table-wrap[data-felt="aurora"] .felt-oval { animation: auroraShift 12s ease-in-out infinite alternate; }
.scope-toggle { display: flex; gap: 2px; padding: 2px; border-radius: 10px; background: rgba(244,247,252,0.07); flex-shrink: 0; }
.scope-toggle button { display: inline-flex; align-items: center; gap: 4px; border: none; background: transparent; color: var(--t-mut); font-size: 11.5px; font-weight: 700; padding: 6px 9px; border-radius: 8px; cursor: pointer; }
.scope-toggle button.on { background: var(--t-text); color: var(--t-bg); }
/* install + notifications */
.app-card { display: flex; align-items: center; gap: 12px; padding: 12px 10px 12px 12px; border-radius: 16px; background: var(--t-panel); border: 1px solid rgba(244,247,252,0.1); }
.app-card.notify { border-color: rgba(252,182,0,0.35); background: linear-gradient(135deg, rgba(252,182,0,0.1), var(--t-panel)); }
.app-card-ic { width: 42px; height: 42px; border-radius: 11px; flex-shrink: 0; object-fit: cover; box-shadow: 0 4px 12px rgba(0,0,0,0.3); }
.app-card-ic.bell { display: flex; align-items: center; justify-content: center; background: rgba(252,182,0,0.16); color: var(--t-accent); box-shadow: none; }
.share-ic { display: inline-flex; vertical-align: -2px; padding: 1px 3px; border-radius: 4px; background: rgba(94,158,255,0.18); color: #81B1FF; }
/* show or muck */
.show-btn { display: inline-flex; align-items: center; justify-content: center; gap: 7px; }
.shown-tag { position: absolute; top: -9px; left: 50%; transform: translateX(-50%); z-index: 2; font-size: 9px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; padding: 2px 8px; border-radius: 20px; background: var(--t-accent); color: var(--t-bg); white-space: nowrap; animation: peekPop .22s cubic-bezier(.3,1.5,.5,1) both; }
${CHIP_STACK_CSS}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; animation-delay: 0ms !important; transition-duration: 0.01ms !important; }
}
`;

export { GLOBAL_STYLE };
