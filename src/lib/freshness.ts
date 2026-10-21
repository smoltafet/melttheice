// Freshness scoring for sightings.
//
// "Top rated" and "Newest" are both blunt ways to order the list: a
// heavily upvoted report from three hours ago can outrank a sighting
// happening right now, and a brand-new unconfirmed report outranks a
// slightly older one that five people have confirmed is still there.
// This module gives the sidebar a "Freshest" order built for the
// question readers actually ask — what is most likely still happening
// near me right now?
//
// The score starts at 100 and decays exponentially with age (45-minute
// half-life by default), is adjusted by community trust and by the
// still-there / not-there confirmations, and is clamped to [0, 125]
// so bonuses can lift a confirmed fresh report above an unconfirmed
// one without letting votes outweigh recency entirely.

import { trustScore } from './clusters';
import type { IceSighting } from './types';

export type FreshnessTier = 'live' | 'recent' | 'aging' | 'stale';

/** A sighting is "live" for its first 30 minutes. */
export const LIVE_WINDOW_MS = 30 * 60 * 1000;
/** "Recent" covers the first two hours. */
export const RECENT_WINDOW_MS = 2 * 60 * 60 * 1000;
/** The app expires sightings after 4 hours; past that they are stale. */
export const STALE_WINDOW_MS = 4 * 60 * 60 * 1000;
/** Default half-life of the freshness decay. */
export const DEFAULT_HALF_LIFE_MS = 45 * 60 * 1000;

export interface FreshnessOptions {
  /** Half-life of the exponential age decay, in ms. */
  halfLifeMs?: number;
}

/** Age of a sighting in ms; future timestamps clamp to zero. */
export function sightingAgeMs(sighting: IceSighting, now: number): number {
  const timestamp = Number.isFinite(sighting?.timestamp) ? sighting.timestamp : now;
  return Math.max(0, now - timestamp);
}

/** Which freshness band a sighting falls into at `now`. */
export function freshnessTier(sighting: IceSighting, now: number): FreshnessTier {
  const age = sightingAgeMs(sighting, now);
  if (age <= LIVE_WINDOW_MS) {
    return 'live';
  }
  if (age <= RECENT_WINDOW_MS) {
    return 'recent';
  }
  if (age <= STALE_WINDOW_MS) {
    return 'aging';
  }
  return 'stale';
}

/** Exponential decay factor in (0, 1]: 1 when brand new, 0.5 after one half-life. */
export function decayFactor(ageMs: number, halfLifeMs: number = DEFAULT_HALF_LIFE_MS): number {
  if (!(halfLifeMs > 0)) {
    return 0;
  }
  return Math.pow(0.5, Math.max(0, ageMs) / halfLifeMs);
}

/**
 * Freshness score for one sighting at `now`, in [0, 125].
 *
 *   base        100 * decay(age)
 *   trust       +2 per net upvote, capped at ±20
 *   still-there +3 per confirmation, capped at +15
 *   not-there   when "not there" reports outnumber "still there", the
 *               whole score is scaled down (to as low as 25%) — the
 *               crowd is saying the event is over.
 */
export function freshnessScore(
  sighting: IceSighting,
  now: number,
  options?: FreshnessOptions
): number {
  const age = sightingAgeMs(sighting, now);
  let score = 100 * decayFactor(age, options?.halfLifeMs ?? DEFAULT_HALF_LIFE_MS);

  const trust = Math.max(-20, Math.min(20, trustScore(sighting) * 2));
  score += trust;

  const stillThere = sighting.verification?.stillThere || 0;
  const notThere = sighting.verification?.notThere || 0;
  score += Math.min(15, stillThere * 3);

  if (notThere > stillThere && notThere > 0) {
    const total = stillThere + notThere;
    const goneShare = notThere / total; // in (0.5, 1]
    score *= 1 - 0.75 * goneShare;
  }

  return Math.max(0, Math.min(125, score));
}

/**
 * Order sightings freshest-first. Pure: the input array is not
 * mutated. Ties break toward higher trust, then newest timestamp.
 */
export function sortSightingsByFreshness(
  sightings: IceSighting[],
  now: number = Date.now(),
  options?: FreshnessOptions
): IceSighting[] {
  return [...sightings].sort((a, b) => {
    const byScore = freshnessScore(b, now, options) - freshnessScore(a, now, options);
    if (byScore !== 0) {
      return byScore;
    }
    const byTrust = trustScore(b) - trustScore(a);
    return byTrust !== 0 ? byTrust : b.timestamp - a.timestamp;
  });
}

/** Group sightings by freshness tier at `now` (every tier key present). */
export function partitionByFreshness(
  sightings: IceSighting[],
  now: number
): Record<FreshnessTier, IceSighting[]> {
  const partitions: Record<FreshnessTier, IceSighting[]> = {
    live: [],
    recent: [],
    aging: [],
    stale: [],
  };
  for (const sighting of sightings || []) {
    partitions[freshnessTier(sighting, now)].push(sighting);
  }
  return partitions;
}

/**
 * Sightings still inside the app's relevance window (4 hours by
 * default), freshest first. This is the set the map and alerts care
 * about once future-dated and long-expired reports are dropped.
 */
export function activeSightings(
  sightings: IceSighting[],
  now: number = Date.now(),
  maxAgeMs: number = STALE_WINDOW_MS
): IceSighting[] {
  return sortSightingsByFreshness(
    (sightings || []).filter((sighting) => sightingAgeMs(sighting, now) <= maxAgeMs),
    now
  );
}

export interface FreshnessSummary {
  total: number;
  live: number;
  recent: number;
  aging: number;
  stale: number;
  /** Median age in ms across all sightings (0 when empty). */
  medianAgeMs: number;
  /** Timestamp of the newest sighting, or null when empty. */
  newestTimestamp: number | null;
}

/** Counts per tier plus age statistics, for headers and diagnostics. */
export function freshnessSummary(sightings: IceSighting[], now: number): FreshnessSummary {
  const partitions = partitionByFreshness(sightings, now);
  const ages = (sightings || [])
    .map((sighting) => sightingAgeMs(sighting, now))
    .sort((a, b) => a - b);
  const medianAgeMs = ages.length === 0
    ? 0
    : ages[Math.floor((ages.length - 1) / 2)];
  const newestTimestamp = (sightings || []).reduce<number | null>(
    (newest, sighting) => (newest == null || sighting.timestamp > newest ? sighting.timestamp : newest),
    null
  );
  return {
    total: sightings?.length || 0,
    live: partitions.live.length,
    recent: partitions.recent.length,
    aging: partitions.aging.length,
    stale: partitions.stale.length,
    medianAgeMs,
    newestTimestamp,
  };
}
