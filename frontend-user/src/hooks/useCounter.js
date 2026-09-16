import { useEffect, useRef, useState } from 'react';

// Tương đương animateCounters() trong bản gốc: đếm dần tới target khi phần tử xuất hiện.
export default function useCounter(target, suffix = '') {
  const ref = useRef(null);
  const [display, setDisplay] = useState(`0${suffix}`);
  const done = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !done.current) {
            done.current = true;
            const duration = 1200;
            const start = performance.now();
            const step = (now) => {
              const progress = Math.min((now - start) / duration, 1);
              const value = (target * progress).toFixed(1);
              setDisplay(`${value}${suffix}`);
              if (progress < 1) requestAnimationFrame(step);
            };
            requestAnimationFrame(step);
            io.disconnect();
          }
        });
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [target, suffix]);

  return [ref, display];
}
