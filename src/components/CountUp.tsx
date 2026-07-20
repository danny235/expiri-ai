"use client";

import { useEffect, useRef, useState } from "react";

// Animated counter that eases from 0 to the target when scrolled into view.
// Preserves any prefix/suffix around the number (e.g. "$1,200", "98%").
export function CountUp({ value, duration = 1400 }: { value: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState<string>(value.replace(/[\d,.]+/, (m) => (m.includes(".") ? "0.0" : "0")));

  useEffect(() => {
    const match = value.match(/[\d,.]+/);
    if (!match) return;
    const numStr = match[0];
    const target = parseFloat(numStr.replace(/,/g, ""));
    const decimals = numStr.includes(".") ? numStr.split(".")[1].length : 0;
    const prefix = value.slice(0, match.index);
    const suffix = value.slice((match.index ?? 0) + numStr.length);

    const el = ref.current;
    if (!el) return;

    let started = false;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started) {
          started = true;
          const start = performance.now();
          const tick = (now: number) => {
            const progress = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = target * eased;
            const formatted = decimals > 0 ? current.toFixed(decimals) : Math.round(current).toLocaleString("en-US");
            setDisplay(`${prefix}${formatted}${suffix}`);
            if (progress < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
          observer.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [value, duration]);

  return <span ref={ref}>{display}</span>;
}
