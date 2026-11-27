/**
 * Live duel clock (D-053). The server owns time; the app only needs to know how far its own clock
 * is from the server's so a countdown shows the same seconds on both phones. Nothing here decides
 * anything: when a deadline passes, the server moves the duel and the app redraws from its push.
 */

/** One ping: when it left, when the ack came back (both on this device's clock), the server's time. */
export type ClockSample = { sentAt: number; receivedAt: number; serverNow: number };

/**
 * Offset = server clock − device clock, from the sample with the smallest round trip. A short round
 * trip bounds the error tightly (at most half the RTT), and a slow sample is usually one that sat in
 * a queue on one leg only, which skews the midpoint. This is the classic NTP-style "min RTT" filter.
 * Returns null when there are no usable samples.
 */
export function estimateOffset(samples: readonly ClockSample[]): number | null {
  let best: ClockSample | null = null;
  for (const s of samples) {
    const rtt = s.receivedAt - s.sentAt;
    if (!Number.isFinite(rtt) || rtt < 0 || !Number.isFinite(s.serverNow)) continue;
    if (!best || rtt < best.receivedAt - best.sentAt) best = s;
  }
  if (!best) return null;
  const midpoint = best.sentAt + (best.receivedAt - best.sentAt) / 2;
  return Math.round(best.serverNow - midpoint);
}

/**
 * A rough offset from a pushed timestamp (snapshot `serverNow`) before any ping has answered:
 * it ignores the one-way delay, so it is only a fallback.
 */
export function offsetFromPush(serverNowIso: string, receivedAt: number): number | null {
  const t = Date.parse(serverNowIso);
  return Number.isFinite(t) ? t - receivedAt : null;
}

/** Milliseconds until a server timestamp, seen from this device. Never negative. */
export function msUntil(serverIso: string | null, offsetMs: number, deviceNow: number): number {
  if (!serverIso) return 0;
  const at = Date.parse(serverIso);
  if (!Number.isFinite(at)) return 0;
  return Math.max(0, at - (deviceNow + offsetMs));
}

/**
 * The timer's screen-reader label. It only changes when the time left crosses one of the marks
 * (e.g. 30, 20, 10, 5 s), so a screen reader isn't flooded with a new number every second.
 */
export function timerLabel(leftMs: number, marks: readonly number[]): string {
  const left = Math.ceil(Math.max(0, leftMs) / 1000);
  if (left === 0) return "Time's up";
  const sorted = [...marks].sort((a, b) => a - b);
  const mark = sorted.find((m) => left <= m);
  if (mark === undefined) return `More than ${sorted[sorted.length - 1] ?? 0} seconds left`;
  return `${mark} seconds or less left`;
}
