// Activity trend for sightings.
//
// The summary strip shows totals for the last 4 hours, but a total
// cannot say whether activity is picking up or dying down. This
// module compares the sightings in the current window against the
// immediately preceding window of the same length: how many fell in
// each, the signed difference, and the percent change. When the
// previous window is empty the percent change is undefined (null)
// and the direction is "new" if anything arrived at all, so the UI
// never prints a meaningless "infinite percent" line. Sightings
// with a missing or non-finite timestamp are skipped, and future
// timestamps count in neither window.

import type { IceSighting } from './types';

export type TrendDirection = 'rising' | 'falling' | 'steady' | 'new' | 'none';

export interface ActivityTrend {
  /** Sightings in (now - windowMs, now]. */
  currentCount: number;
  /** Sightings in (now - 2 * windowMs, now - windowMs]. */
  previousCount: number;
  /** currentCount - previousCount. */
  delta: number;
  /**
   * Percent change versus the previous window, rounded to a whole
   * number; null when the previous window is empty.
   */
  percentChange: number | null;
  direction: TrendDirection;
}

export const DEFAULT_TREND_WINDOW_MS = 4 * 60 * 60 * 1000;

/**
 * Compare sighting activity between the current window ending at
 * `now` (default: the newest usable sighting, so a quiet period
 * still compares against the last activity rather than the wall
 * clock) and the window right before it. A non-positive or
 * non-finite window falls back to the default 4 hours.
 */
export function compareActivityTrend(
  sightings: readonly IceSighting[] | null | undefined,
  options?: { now?: number; windowMs?: number },
): ActivityTrend {
  const windowMs =
    options && Number.isFinite(options.windowMs) && (options.windowMs as number) > 0
      ? (options.windowMs as number)
      : DEFAULT_TREND_WINDOW_MS;

  const usable = (sightings ?? []).filter(
    (sighting) => sighting && Number.isFinite(sighting.timestamp),
  );

  const now =
    options && Number.isFinite(options.now)
      ? (options.now as number)
      : usable.length > 0
        ? Math.max(...usable.map((s) => s.timestamp))
        : 0;

  let currentCount = 0;
  let previousCount = 0;
  for (const sighting of usable) {
    const age = now - sighting.timestamp;
    if (age < 0) {
      continue;
    }
    if (age < windowMs) {
      currentCount += 1;
    } else if (age < 2 * windowMs) {
      previousCount += 1;
    }
  }

  const delta = currentCount - previousCount;
  const percentChange =
    previousCount > 0 ? Math.round((delta / previousCount) * 100) : null;

  let direction: TrendDirection;
  if (currentCount === 0 && previousCount === 0) {
    direction = 'none';
  } else if (previousCount === 0) {
    direction = 'new';
  } else if (delta > 0) {
    direction = 'rising';
  } else if (delta < 0) {
    direction = 'falling';
  } else {
    direction = 'steady';
  }

  return { currentCount, previousCount, delta, percentChange, direction };
}
