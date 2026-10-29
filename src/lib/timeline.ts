// Activity timeline for sightings.
//
// The summary strip reports totals over the last 4 hours, but a total
// hides the shape of the activity: were the reports spread out, or did
// they all arrive in one burst an hour ago? This module buckets
// sightings into fixed-width time windows so the UI can name the
// busiest window and, later, draw the shape. Buckets are aligned to
// epoch multiples of the bucket width (an hourly bucket always starts
// on the hour), cover the full span from the first to the last usable
// sighting, and include empty buckets inside that span, because a gap
// with zero reports is exactly what a timeline needs to show.
// Sightings with a missing or non-finite timestamp are skipped.

import type { IceSighting } from './types';

export interface TimelineBucket {
  /** Inclusive bucket start, epoch milliseconds. */
  start: number;
  /** Exclusive bucket end, epoch milliseconds. */
  end: number;
  /** How many sightings fall in [start, end). */
  count: number;
  /** Ids of the sightings in this bucket, in input order. */
  ids: string[];
}

export const DEFAULT_BUCKET_MS = 60 * 60 * 1000;

/**
 * Bucket sightings by timestamp into consecutive windows of
 * `bucketMs` milliseconds (default one hour). A non-positive or
 * non-finite width falls back to the default rather than producing
 * an infinite or empty timeline. Returns [] when no sighting has a
 * usable timestamp.
 */
export function bucketSightingsByTime(
  sightings: readonly IceSighting[] | null | undefined,
  bucketMs: number = DEFAULT_BUCKET_MS,
): TimelineBucket[] {
  const width =
    Number.isFinite(bucketMs) && bucketMs > 0 ? bucketMs : DEFAULT_BUCKET_MS;

  const usable = (sightings ?? []).filter(
    (sighting) => sighting && Number.isFinite(sighting.timestamp),
  );
  if (usable.length === 0) {
    return [];
  }

  const firstStart =
    Math.floor(Math.min(...usable.map((s) => s.timestamp)) / width) * width;
  const lastStart =
    Math.floor(Math.max(...usable.map((s) => s.timestamp)) / width) * width;

  const buckets: TimelineBucket[] = [];
  for (let start = firstStart; start <= lastStart; start += width) {
    buckets.push({ start, end: start + width, count: 0, ids: [] });
  }

  for (const sighting of usable) {
    const index = Math.floor((sighting.timestamp - firstStart) / width);
    const bucket = buckets[index];
    if (bucket) {
      bucket.count += 1;
      if (typeof sighting.id === 'string' && sighting.id !== '') {
        bucket.ids.push(sighting.id);
      }
    }
  }
  return buckets;
}

/**
 * The bucket with the most sightings; ties go to the earliest bucket.
 * Returns null for an empty timeline or one where every bucket is
 * empty, so callers can skip rendering a "peak" that is really zero.
 */
export function busiestBucket(
  buckets: readonly TimelineBucket[] | null | undefined,
): TimelineBucket | null {
  let best: TimelineBucket | null = null;
  for (const bucket of buckets ?? []) {
    if (bucket && bucket.count > 0 && (best === null || bucket.count > best.count)) {
      best = bucket;
    }
  }
  return best;
}
