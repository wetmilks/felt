import { useMemo } from "react";

// Every sound is synthesized: filtered noise for paper and clay, short tones for felt thumps and bells.
// Real recordings of cards and chips (Kenney's Casino Audio, CC0). Fetched once, decoded when sound
// first starts. Until they're ready, or if they fail, the synthesized versions below play instead.
const SAMPLE_SETS = { slide: 8, place: 4, shove: 4, lay: 3, collide: 4, handle: 6, stack: 6, shuffle: 1 };
const SAMPLE_FILE = { slide: "card-slide", place: "card-place", shove: "card-shove", lay: "chip-lay", collide: "chips-collide", handle: "chips-handle", stack: "chips-stack", shuffle: "card-shuffle" };
let sampleFetch = null;
function fetchSamples() {
  if (sampleFetch) return sampleFetch;
  const base = (import.meta.env && import.meta.env.BASE_URL) || "/";
  const jobs = [];
  Object.entries(SAMPLE_SETS).forEach(([k, n]) => { for (let i = 1; i <= n; i++) { const name = n === 1 ? SAMPLE_FILE[k] : `${SAMPLE_FILE[k]}-${i}`; jobs.push(fetch(`${base}sfx/${name}.mp3`).then((r) => (r.ok ? r.arrayBuffer() : null)).then((ab) => [k, ab]).catch(() => [k, null])); } });
  sampleFetch = Promise.all(jobs);
  return sampleFetch;
}
if (typeof window !== "undefined") setTimeout(() => { try { fetchSamples(); } catch (e) { /* offline */ } }, 1200);

function makeSfx(ctx, out) {
  const now = () => ctx.currentTime;
  const bufs = {}; // set name -> decoded buffers
  fetchSamples().then((list) => list.forEach(([k, ab]) => {
    if (!ab) return;
    const done = (b) => { (bufs[k] = bufs[k] || []).push(b); };
    try { const pr = ctx.decodeAudioData(ab.slice(0), done, () => {}); if (pr && pr.catch) pr.catch(() => {}); } catch (e) { /* undecodable */ } // each audio context decodes its own copy
  })).catch(() => {});
  const has = (k) => bufs[k] && bufs[k].length > 0;
  const lastPick = {};
  // play one recording from a set: a different take than last time, slightly retuned so repeats never sound copied
  const sample = (k, at = 0, gain = 1, { maxDur = 0, rate = 1 } = {}) => {
    if (!has(k)) return false;
    const list = bufs[k]; let i = Math.floor(Math.random() * list.length);
    if (list.length > 1 && i === lastPick[k]) i = (i + 1) % list.length; lastPick[k] = i;
    const t = now() + at;
    const src = ctx.createBufferSource(); src.buffer = list[i];
    src.playbackRate.value = rate * (1 + (Math.random() * 2 - 1) * 0.05);
    const gv = gain * (0.88 + Math.random() * 0.12);
    const g = ctx.createGain(); g.gain.value = gv; g.gain.setValueAtTime(gv, t);
    src.connect(g); g.connect(out); src.start(t);
    if (maxDur && list[i].duration > maxDur) { g.gain.setValueAtTime(gv, t + maxDur * 0.7); g.gain.linearRampToValueAtTime(0.0001, t + maxDur); src.stop(t + maxDur + 0.02); }
    return true;
  };
  let noiseBuf = null;
  const getNoise = () => {
    if (!noiseBuf) { noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    return noiseBuf;
  };
  const env = (g, t, peak, attack, dur) => {
    const p = Math.max(0.0002, peak);
    // start silent: a gain left at its default of 1 for even one sample makes an audible click
    g.gain.value = 0; g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(p, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(dur, attack + 0.005));
  };
  const burst = (at, dur, { type = "bandpass", freq = 2000, to = null, q = 1, gain = 0.2, attack = 0.002 } = {}) => {
    const t = now() + at;
    const src = ctx.createBufferSource(); src.buffer = getNoise();
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur); f.Q.value = q;
    const g = ctx.createGain(); env(g, t, gain, attack, dur);
    src.connect(f); f.connect(g); g.connect(out);
    src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.03);
  };
  const tone = (at, freq, dur, { type = "sine", gain = 0.1, to = null, attack = 0.004 } = {}) => {
    const t = now() + at;
    const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t); if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    const g = ctx.createGain(); env(g, t, gain, attack, dur);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.03);
  };
  const jit = (x, pct) => x * (1 + (Math.random() * 2 - 1) * pct);
  // one card leaving the deck: a quick swish of air, then a snap and a soft thud on the felt
  const flick = (at, v = 1) => {
    burst(at, 0.075, { freq: jit(5200, 0.1), to: 1800, q: 0.9, gain: 0.16 * v, attack: 0.01 });
    burst(at + 0.07, 0.018, { type: "highpass", freq: 2400, gain: 0.2 * v });
    tone(at + 0.07, jit(190, 0.08), 0.05, { gain: 0.07 * v, to: 120 });
  };
  // two clay chips knocking together
  const clack = (at, v = 1) => { const f = jit(3600, 0.15); burst(at, 0.024, { freq: f, q: 5, gain: 0.75 * v }); tone(at, f * 0.78, 0.07, { gain: 0.07 * v, type: "triangle" }); };
  const chips = (at, n, v = 1, spread = 0.045) => { let t = at; for (let i = 0; i < n; i++) { clack(t, v * (1 - i * 0.06)); t += jit(spread, 0.35); } };
  // a knuckle on the felt
  const knock = (at, v = 1) => { tone(at, jit(150, 0.05), 0.07, { gain: 0.24 * v, to: 95, attack: 0.002 }); burst(at, 0.03, { type: "lowpass", freq: 500, gain: 0.18 * v }); };
  const bell = (at, f, v = 1, dur = 0.5) => { tone(at, f, dur, { gain: 0.07 * v }); tone(at, f * 2.01, dur * 0.6, { gain: 0.025 * v }); tone(at, f * 3.02, dur * 0.3, { gain: 0.012 * v }); };
  const synth = {
    shuffle: () => {
      let t = 0;
      for (let i = 0; i < 16; i++) { const p = i / 15; t += 0.022 - 0.01 * Math.sin(p * Math.PI); burst(t, 0.012, { freq: jit(3800, 0.2), q: 2.5, gain: 0.1 + 0.06 * Math.sin(p * Math.PI) }); }
      burst(t + 0.02, 0.12, { type: "lowpass", freq: 1400, to: 600, gain: 0.05, attack: 0.03 });
      knock(t + 0.13, 0.35);
    },
    deal: (count = 1, spacing = 0.08) => { for (let i = 0; i < count; i++) flick(i * spacing, 0.75 + Math.random() * 0.25); },
    flip: (count = 1, spacing = 0.12) => {
      for (let i = 0; i < count; i++) {
        const at = i * spacing;
        burst(at, 0.05, { freq: 4200, to: 2600, q: 1, gain: 0.08, attack: 0.008 });
        burst(at + 0.045, 0.014, { freq: jit(3000, 0.1), q: 1.4, gain: 0.26 });
        tone(at + 0.045, 210, 0.045, { gain: 0.06, to: 130 });
      }
    },
    click: (v = 1) => { knock(0, v); knock(0.11, v * 0.8); },
    call: (v = 1) => chips(0, 3, v),
    raise: (v = 1) => chips(0, 5, v, 0.04),
    allIn: (v = 1) => { burst(0, 0.38, { type: "lowpass", freq: 900, to: 400, gain: 0.1 * v, attack: 0.12 }); chips(0.12, 9, v, 0.028); tone(0, 95, 0.4, { gain: 0.09 * v, to: 70, attack: 0.08 }); },
    fold: (v = 1) => { burst(0, 0.18, { freq: 2600, to: 800, q: 0.8, gain: 0.26 * v, attack: 0.03 }); burst(0.16, 0.025, { type: "lowpass", freq: 700, gain: 0.2 * v }); },
    chip: () => chips(0, 4, 0.6, 0.05),
    win: () => { chips(0, 7, 0.8, 0.035); [523.25, 659.25, 783.99].forEach((f, i) => bell(0.28 + i * 0.07, f, 0.9, 0.7)); },
    lose: () => { tone(0, 330, 0.22, { gain: 0.05, to: 247 }); tone(0.16, 247, 0.35, { gain: 0.045, to: 196 }); },
    tap: () => tone(0, 720, 0.04, { gain: 0.07 }),
    tick: () => { tone(0, 1900, 0.04, { gain: 0.12, type: "triangle" }); burst(0, 0.01, { type: "highpass", freq: 4000, gain: 0.1 }); },
    coin: () => { chips(0, 5, 0.7, 0.04); bell(0.18, 1318.5, 0.6, 0.35); },
    ping: () => { bell(0, 880, 0.9, 0.4); bell(0.09, 1318.5, 0.7, 0.45); },
    achievement: () => { [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => bell(i * 0.08, f, 1, 0.6)); },
    rankUp: () => { [392, 523.25, 659.25, 783.99, 1046.5].forEach((f, i) => bell(i * 0.09, f, 1.1, 0.8)); chips(0.5, 6, 0.6, 0.04); },
    rankDown: () => { [523.25, 466.16, 392, 311.13].forEach((f, i) => tone(i * 0.12, f, 0.35, { gain: 0.05, type: "triangle" })); },
    // lub-dub: two low thumps, the second softer
    heartbeat: () => { [[0, 1], [0.2, 0.7]].forEach(([at, v]) => { tone(at, 62, 0.17, { gain: 0.5 * v, to: 44, attack: 0.006 }); tone(at, 128, 0.11, { gain: 0.2 * v, to: 88, attack: 0.004 }); burst(at, 0.05, { type: "lowpass", freq: 320, gain: 0.22 * v }); }); },
  };
  // bet size in big blinds picks the sound: one chip set down, a short stack, or a whole handful
  const betSound = (v, bb) => {
    if (bb != null && bb <= 2.5) return sample("lay", 0, 0.75 * v);
    if (!sample("stack", 0, 0.8 * v)) return false;
    if (bb != null && bb > 12) sample("handle", 0.1, 0.5 * v);
    return true;
  };
  const chimes = (at, v) => [523.25, 659.25, 783.99].forEach((f, i) => bell(at + i * 0.07, f, v, 0.7));
  return {
    ...synth,
    shuffle: () => { if (!sample("shuffle", 0, 0.75)) synth.shuffle(); },
    deal: (count = 1, spacing = 0.08) => { if (!has("slide")) return synth.deal(count, spacing); for (let i = 0; i < count; i++) sample("slide", i * spacing, 0.42, { maxDur: 0.34 }); },
    flip: (count = 1, spacing = 0.12) => { if (!has("place")) return synth.flip(count, spacing); for (let i = 0; i < count; i++) sample("place", i * spacing, 0.7, { maxDur: 0.45 }); },
    call: (v = 1, bb) => { if (!betSound(v, bb)) synth.call(v); },
    raise: (v = 1, bb) => { if (!betSound(v, bb == null ? 6 : bb)) synth.raise(v); },
    allIn: (v = 1) => { if (!sample("handle", 0, 0.85 * v)) return synth.allIn(v); sample("stack", 0.16, 0.7 * v); tone(0, 95, 0.4, { gain: 0.06 * v, to: 70, attack: 0.08 }); },
    fold: (v = 1) => { if (!sample("shove", 0, 0.65 * v, { maxDur: 0.5 })) synth.fold(v); },
    chip: () => { if (!sample("collide", 0, 0.6)) return synth.chip(); sample("collide", 0.09, 0.45); },
    win: () => { if (!sample("handle", 0, 0.9)) return synth.win(); sample("stack", 0.22, 0.6); chimes(0.3, 0.6); },
    coin: () => { if (!sample("handle", 0, 0.8)) return synth.coin(); bell(0.18, 1318.5, 0.5, 0.35); },
    rankUp: () => { [392, 523.25, 659.25, 783.99, 1046.5].forEach((f, i) => bell(i * 0.09, f, 1.1, 0.8)); if (!sample("handle", 0.5, 0.7)) synth.chip(); },
  };
}
const SFX_NAMES = ["shuffle", "deal", "flip", "click", "call", "raise", "allIn", "fold", "chip", "win", "lose", "tap", "tick", "coin", "ping", "achievement", "rankUp", "rankDown", "heartbeat"];
// one audio context for the whole app, so recordings decode once and iOS only needs unlocking once
const AUDIO_REF = { current: null };
function audioGet() {
  const ref = AUDIO_REF;
  if (!ref.current) {
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
    const ctx = new AC();
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
    const master = ctx.createGain(); master.gain.value = 0.9; master.connect(comp); comp.connect(ctx.destination);
    ref.current = { ctx, sfx: makeSfx(ctx, master) };
  }
  if (ref.current.ctx.state === "suspended") ref.current.ctx.resume();
  return ref.current.sfx;
}
// the first tap anywhere unlocks audio and decodes the recordings, so the first deal already sounds real
if (typeof window !== "undefined") {
  const unlock = () => { try { audioGet(); } catch (e) { /* no audio */ } window.removeEventListener("pointerdown", unlock, true); window.removeEventListener("keydown", unlock, true); };
  window.addEventListener("pointerdown", unlock, true); window.addEventListener("keydown", unlock, true);
}
function useSound(enabled) {
  const get = audioGet;
  return useMemo(() => {
    const api = {};
    SFX_NAMES.forEach((n) => { api[n] = (...args) => { if (!enabled) return; try { const s = get(); if (s) s[n](...args); } catch (e) { /* audio not available */ } }; });
    return api;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);
}

export { useSound };
