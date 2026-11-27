import { useEffect, useState } from 'react';

/**
 * The device clock, re-read every `everyMs` while `active`. Countdowns derive their value from a
 * fixed deadline and this, never by counting ticks, so a slow JS thread can't stretch them.
 */
export function useNow(everyMs: number, active = true): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), everyMs);
    return () => clearInterval(id);
  }, [everyMs, active]);
  return now;
}
