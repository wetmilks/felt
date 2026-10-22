import { useState, useEffect, useRef } from "react";

function ordinal(n) { const s = ["th", "st", "nd", "rd"], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }

function useCountUp(from, to, { delay = 450, duration = 1100 } = {}) {
  const [value, setValue] = useState(from);
  useEffect(() => {
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || from === to) { setValue(to); return; }
    let raf; const start = performance.now() + delay;
    const tick = (now) => {
      const t = Math.max(0, Math.min(1, (now - start) / duration));
      setValue(Math.round(from + (to - from) * (1 - Math.pow(1 - t, 3))));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [from, to, delay, duration]);
  return value;
}
// eases a changing number (like the pot) instead of snapping
function useTween(value, duration = 300) {
  const [shown, setShown] = useState(value);
  const cur = useRef(value);
  useEffect(() => {
    const from = cur.current;
    if (from === value) return;
    let raf; const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const v = Math.round(from + (value - from) * (1 - Math.pow(1 - t, 3)));
      cur.current = v; setShown(v);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return shown;
}

export { ordinal, useCountUp, useTween };
