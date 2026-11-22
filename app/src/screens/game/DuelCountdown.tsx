import { useEffect, useRef, useState } from 'react';
import { AppText } from '../../components';

type Props = {
  /** Time left when this question appeared, from the server's clock. */
  remainingMs: number;
  /** Stops the clock once an answer is in flight or shown. */
  paused: boolean;
  onExpire: () => void;
};

/**
 * The 60 s duel countdown (game-modes.md §4). It counts against a fixed deadline, not by ticks,
 * so a slow JS thread can't stretch it. The server is still the judge: a late answer is a timeout.
 */
export function DuelCountdown({ remainingMs, paused, onExpire }: Props) {
  const deadline = useRef(Date.now() + Math.max(0, remainingMs));
  const fired = useRef(false);
  const [left, setLeft] = useState(Math.max(0, Math.ceil(remainingMs / 1000)));
  const expire = useRef(onExpire);
  useEffect(() => {
    expire.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    if (paused) return;
    const tick = () => {
      const ms = deadline.current - Date.now();
      setLeft(Math.max(0, Math.ceil(ms / 1000)));
      if (ms <= 0 && !fired.current) {
        fired.current = true;
        expire.current();
      }
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [paused]);

  return (
    <AppText
      variant="code"
      color={left <= 10 ? 'emberSoft' : 'moon'}
      accessibilityLabel={`${left} seconds left`}
      accessibilityLiveRegion={left <= 10 ? 'polite' : 'none'}
    >
      0:{String(left).padStart(2, '0')}
    </AppText>
  );
}
