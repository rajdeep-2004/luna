import { useEffect, useState } from 'react';

/** Counts from 0 to `target` over `durationMs`. With `instant` (Reduce Motion) it shows the target at once. */
export function useCountUp(target: number, durationMs: number, instant: boolean): number {
  const [value, setValue] = useState(instant ? target : 0);
  useEffect(() => {
    if (instant || target <= 0) {
      setValue(target);
      return;
    }
    const start = Date.now();
    const id = setInterval(() => {
      const t = Math.min(1, (Date.now() - start) / durationMs);
      setValue(Math.round(target * t));
      if (t >= 1) clearInterval(id);
    }, 30);
    return () => clearInterval(id);
  }, [target, durationMs, instant]);
  return value;
}
