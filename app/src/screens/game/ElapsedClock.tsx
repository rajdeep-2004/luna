import { useEffect, useState } from 'react';
import { AppText } from '../../components';

/** Small elapsed clock (no countdown outside duels, game-modes.md §4). Cosmetic: the server measures real time. */
export function ElapsedClock() {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const mm = Math.floor(seconds / 60);
  const ss = String(seconds % 60).padStart(2, '0');
  return (
    <AppText variant="code" color="textMuted" accessibilityLabel={`${seconds} seconds elapsed`}>
      {mm}:{ss}
    </AppText>
  );
}
