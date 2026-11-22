/** "2d 4h", "5h 12m", "8m": a coarse countdown for resets and expiries. Never negative. */
export function formatRemaining(untilIso: string, now = Date.now()): string {
  const ms = Math.max(0, new Date(untilIso).getTime() - now);
  const mins = Math.floor(ms / 60_000);
  const days = Math.floor(mins / 1440);
  const hours = Math.floor((mins % 1440) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins % 60}m`;
  return `${Math.max(1, mins)}m`;
}

/** "1:05" for a duration in milliseconds. */
export function formatClock(ms: number): string {
  const total = Math.round(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}
