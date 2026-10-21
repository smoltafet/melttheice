// Aggregate statistics over a set of sightings.
//
// The sidebar, map and alerts all render individual reports; nothing
// in the app answers aggregate questions — how much activity is in
// the current window, where it concentrates, whether it is rising,
// and how much of it the community has confirmed. This module
// computes those aggregates as pure functions so any surface (a
// sidebar summary strip today, a digest or dashboard later) can use
// them without re-deriving the logic.

import type { IceSighting } from './types';

export const DEFAULT_STATS_WINDOW_MS = 4 * 60 * 60 * 1000;

type CountMap<T extends string> = Partial<Record<T, number>>;

function increment<T extends string>(map: CountMap<T>, key: T | undefined): void {
  if (key) {
    map[key] = (map[key] || 0) + 1;
  }
}

/** Count sightings per vehicle type ("Van" / "SUV" / ...). */
export function countByVehicle(sightings: IceSighting[]): CountMap<IceSighting['vehicle']['type']> {
  const counts: CountMap<IceSighting['vehicle']['type']> = {};
  for (const sighting of sightings || []) {
    increment(counts, sighting.vehicle?.type);
  }
  return counts;
}

/** Count sightings per reported activity ("Patrolling" / ...). */
export function countByActivity(sightings: IceSighting[]): CountMap<IceSighting['behavior']['activity']> {
  const counts: CountMap<IceSighting['behavior']['activity']> = {};
  for (const sighting of sightings || []) {
    increment(counts, sighting.behavior?.activity);
  }
  return counts;
}

export interface VerificationTotals {
  stillThere: number;
  notThere: number;
  /** Sightings whose confirmations disagree (at least one of each). */
  contested: number;
  /** Sightings carrying at least one confirmation of either kind. */
  confirmedSightings: number;
}

/** Sum the community's still-there / not-there confirmations. */
export function verificationTotals(sightings: IceSighting[]): VerificationTotals {
  let stillThere = 0;
  let notThere = 0;
  let contested = 0;
  let confirmedSightings = 0;
  for (const sighting of sightings || []) {
    const here = sighting.verification?.stillThere || 0;
    const gone = sighting.verification?.notThere || 0;
    stillThere += here;
    notThere += gone;
    if (here > 0 && gone > 0) {
      contested += 1;
    }
    if (here + gone > 0) {
      confirmedSightings += 1;
    }
  }
  return { stillThere, notThere, contested, confirmedSightings };
}

/**
 * Counts per hour for the last `hours` hours ending at `now`,
 * oldest bucket first. Bucket i covers the hour starting at
 * now - (hours - i) * 1h. Future-dated sightings land in the last
 * bucket; anything older than the range is ignored.
 */
export function hourlyHistogram(
  sightings: IceSighting[],
  now: number,
  hours: number = 24
): number[] {
  const buckets = new Array<number>(Math.max(0, hours)).fill(0);
  if (buckets.length === 0) {
    return buckets;
  }
  const hourMs = 60 * 60 * 1000;
  const rangeStart = now - buckets.length * hourMs;
  for (const sighting of sightings || []) {
    if (!Number.isFinite(sighting?.timestamp)) {
      continue;
    }
    const index = Math.floor((sighting.timestamp - rangeStart) / hourMs);
    if (index >= 0 && index < buckets.length) {
      buckets[index] += 1;
    } else if (sighting.timestamp > now) {
      buckets[buckets.length - 1] += 1;
    }
  }
  return buckets;
}

export interface Hotspot {
  /** Center latitude of the grid cell. */
  lat: number;
  /** Center longitude of the grid cell. */
  lng: number;
  /** Sightings whose coordinates fall in the cell. */
  count: number;
  /** Newest sighting timestamp in the cell. */
  latestTimestamp: number;
}

/**
 * Busiest locations, by rounding coordinates into a grid (0.01° ≈
 * 1.1 km cells by default) and counting reports per cell. Returns at
 * most `limit` cells, busiest first, newest first on ties. Sightings
 * with missing or out-of-range coordinates are skipped.
 */
export function hotspotGrid(
  sightings: IceSighting[],
  cellDegrees: number = 0.01,
  limit: number = 5
): Hotspot[] {
  const cell = cellDegrees > 0 ? cellDegrees : 0.01;
  const cells = new Map<string, Hotspot>();
  for (const sighting of sightings || []) {
    const lat = sighting.location?.lat;
    const lng = sighting.location?.lng;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      continue;
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      continue;
    }
    const cellLat = Math.floor(lat / cell) * cell;
    const cellLng = Math.floor(lng / cell) * cell;
    const key = `${cellLat.toFixed(4)},${cellLng.toFixed(4)}`;
    const existing = cells.get(key);
    if (existing) {
      existing.count += 1;
      existing.latestTimestamp = Math.max(existing.latestTimestamp, sighting.timestamp);
    } else {
      cells.set(key, {
        lat: cellLat + cell / 2,
        lng: cellLng + cell / 2,
        count: 1,
        latestTimestamp: sighting.timestamp,
      });
    }
  }
  return [...cells.values()]
    .sort((a, b) => b.count - a.count || b.latestTimestamp - a.latestTimestamp)
    .slice(0, Math.max(0, limit));
}

export interface ActivityTrend {
  /** Sightings inside the current window [now - windowMs, now]. */
  current: number;
  /** Sightings inside the previous window of the same length. */
  previous: number;
  /**
   * current / previous, or null when the previous window is empty
   * (no meaningful baseline to compare against).
   */
  ratio: number | null;
}

/** Is activity rising or falling versus the previous equal window? */
export function activityTrend(
  sightings: IceSighting[],
  now: number,
  windowMs: number = DEFAULT_STATS_WINDOW_MS
): ActivityTrend {
  let current = 0;
  let previous = 0;
  for (const sighting of sightings || []) {
    if (!Number.isFinite(sighting?.timestamp)) {
      continue;
    }
    const age = now - sighting.timestamp;
    if (age >= 0 && age < windowMs) {
      current += 1;
    } else if (age >= windowMs && age < 2 * windowMs) {
      previous += 1;
    }
  }
  return {
    current,
    previous,
    ratio: previous > 0 ? current / previous : null,
  };
}

export interface SightingSummary {
  total: number;
  /** Sightings inside the stats window ending at `now`. */
  inWindow: number;
  byVehicle: CountMap<IceSighting['vehicle']['type']>;
  byActivity: CountMap<IceSighting['behavior']['activity']>;
  verification: VerificationTotals;
  trend: ActivityTrend;
  hotspots: Hotspot[];
  hourly: number[];
}

/**
 * The full aggregate digest for a set of sightings at `now`.
 * Vehicle/activity breakdowns, verification totals and hotspots are
 * computed over the in-window sightings only, so the summary always
 * describes the same period the trend compares.
 */
export function summarizeSightings(
  sightings: IceSighting[],
  now: number = Date.now(),
  windowMs: number = DEFAULT_STATS_WINDOW_MS
): SightingSummary {
  const all = sightings || [];
  const inWindowSightings = all.filter(
    (sighting) =>
      Number.isFinite(sighting?.timestamp) &&
      now - sighting.timestamp >= 0 &&
      now - sighting.timestamp < windowMs
  );
  return {
    total: all.length,
    inWindow: inWindowSightings.length,
    byVehicle: countByVehicle(inWindowSightings),
    byActivity: countByActivity(inWindowSightings),
    verification: verificationTotals(inWindowSightings),
    trend: activityTrend(all, now, windowMs),
    hotspots: hotspotGrid(inWindowSightings),
    hourly: hourlyHistogram(all, now, 24),
  };
}
