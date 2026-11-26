import { randomInt } from 'node:crypto';
import { SELECTION } from '../config/game';

/** A random source returning a float in [0, 1). Injectable so tests can be deterministic. */
export type Rng = () => number;

// crypto.randomInt needs (max - min) < 2^48.
const RNG_STEPS = 2 ** 48 - 1;
/** Default random source, backed by `crypto.randomInt` (not `Math.random`). */
export const cryptoRng: Rng = () => randomInt(RNG_STEPS) / RNG_STEPS;

const usable = (w: number) => Number.isFinite(w) && w > 0;

/**
 * Picks one item with probability proportional to its weight. Items with weight 0 (or negative,
 * NaN, infinite) are never picked. Returns null when nothing has a usable weight.
 */
export function weightedPick<T>(
  items: readonly T[],
  weightFn: (item: T) => number,
  rng: Rng = cryptoRng,
): T | null {
  const weights = items.map(weightFn);
  const total = weights.reduce((sum, w) => (usable(w) ? sum + w : sum), 0);
  if (total <= 0) return null;
  let r = rng() * total;
  let last: T | null = null;
  for (let i = 0; i < items.length; i++) {
    const w = weights[i]!;
    if (!usable(w)) continue;
    last = items[i]!;
    r -= w;
    if (r < 0) return last;
  }
  return last; // float rounding left r a hair above 0: the last usable item
}

/** Up to `k` distinct items, each drawn by `weightedPick` from what is left, in draw order. */
export function sampleWithoutReplacement<T>(
  items: readonly T[],
  k: number,
  weightFn: (item: T) => number,
  rng: Rng = cryptoRng,
): T[] {
  const left = [...items];
  const out: T[] = [];
  while (out.length < k) {
    const pick = weightedPick(left, weightFn, rng);
    if (pick === null) break;
    out.push(pick);
    left.splice(left.indexOf(pick), 1);
  }
  return out;
}

/** `exp(-score / temperature)`: lower scores are likelier, the D-048 selection weight. */
export const scoreWeight = (score: number, temperature: number = SELECTION.temperature) =>
  Math.exp(-score / temperature);

/**
 * Weighted pick by score. Scores are shifted so the best one has weight 1, which keeps the
 * relative weights the same while avoiding underflow to 0 when every score is large.
 */
export function pickByScore<T>(
  items: readonly T[],
  scoreFn: (item: T) => number,
  rng: Rng = cryptoRng,
): T | null {
  const scored = items.map((item) => ({ item, s: scoreFn(item) }));
  const min = Math.min(...scored.map((x) => x.s));
  return weightedPick(scored, (x) => scoreWeight(x.s - min), rng)?.item ?? null;
}

/** The items sharing the lowest tier value (the hard filter before sampling). */
export function bestTier<T>(items: readonly T[], tierFn: (item: T) => number): T[] {
  if (!items.length) return [];
  const min = Math.min(...items.map(tierFn));
  return items.filter((x) => tierFn(x) === min);
}

/**
 * A full ordering: tiers in ascending order, and a uniformly random order inside each tier.
 * Used where a round takes the first N, so a thin best tier is topped up from the next one.
 */
export function tieredOrder<T>(
  items: readonly T[],
  tierFn: (item: T) => number,
  rng: Rng = cryptoRng,
): T[] {
  const tiers = new Map<number, T[]>();
  for (const x of items) {
    const t = tierFn(x);
    tiers.set(t, [...(tiers.get(t) ?? []), x]);
  }
  return [...tiers.keys()]
    .sort((a, b) => a - b)
    .flatMap((t) => {
      const group = tiers.get(t)!;
      return sampleWithoutReplacement(group, group.length, () => 1, rng);
    });
}
