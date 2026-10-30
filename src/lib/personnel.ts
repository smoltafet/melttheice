// Personnel totals for sightings.
//
// Every sighting records how many personnel were seen
// (`personnel.count`), and the cards and search text surface that
// number one report at a time, but nothing adds it up: a reader
// cannot tell whether the reports in the current window describe
// three officers or thirty. This module aggregates the counts as
// pure functions, following the same window convention as
// lib/trend and lib/updates (default `now` is the newest usable
// sighting, a non-positive or non-finite window falls back to the
// default 4 hours, and future-dated sightings count in the totals
// but not in the window). A personnel count that is missing,
// non-finite, or negative reads as zero; fractional counts are
// floored, matching how lib/validation normalizes counts on the
// way in.

import type { IceSighting } from './types';

export const DEFAULT_PERSONNEL_WINDOW_MS = 4 * 60 * 60 * 1000;

/** One sighting's personnel count, normalized to a safe integer. */
export function personnelCount(
  sighting: IceSighting | null | undefined,
): number {
  const count = sighting?.personnel?.count;
  return typeof count === 'number' && Number.isFinite(count) && count > 0
    ? Math.floor(count)
    : 0;
}

/** Total personnel reported across every sighting in the set. */
export function totalPersonnel(
  sightings: readonly IceSighting[] | null | undefined,
): number {
  let total = 0;
  for (const sighting of sightings ?? []) {
    if (sighting) {
      total += personnelCount(sighting);
    }
  }
  return total;
}

export interface PersonnelSummary {
  /** Personnel reported across all usable sightings. */
  total: number;
  /** Personnel reported by sightings in (now - windowMs, now]. */
  inWindow: number;
  /** Sightings carrying a personnel count above zero. */
  sightingsWithPersonnel: number;
  /** Usable sightings in the set (objects with a finite timestamp). */
  sightingCount: number;
  /**
   * Mean personnel per usable sighting, rounded to one decimal;
   * 0 when the set has no usable sightings.
   */
  averagePerSighting: number;
  /** Largest single-report count, or null when nothing was reported. */
  largest: { sightingId: string; count: number } | null;
}

/**
 * Summarize the personnel counts in a set of sightings. Only
 * sightings with a finite timestamp are usable (the same gate the
 * other summary modules apply); unusable entries are skipped
 * entirely rather than counted as zero-person reports, so the
 * average is not diluted by malformed documents.
 */
export function summarizePersonnel(
  sightings: readonly IceSighting[] | null | undefined,
  options?: { now?: number; windowMs?: number },
): PersonnelSummary {
  const windowMs =
    options && Number.isFinite(options.windowMs) && (options.windowMs as number) > 0
      ? (options.windowMs as number)
      : DEFAULT_PERSONNEL_WINDOW_MS;

  const usable = (sightings ?? []).filter(
    (sighting) => sighting && Number.isFinite(sighting.timestamp),
  );

  const now =
    options && Number.isFinite(options.now)
      ? (options.now as number)
      : usable.length > 0
        ? Math.max(...usable.map((sighting) => sighting.timestamp))
        : 0;

  let total = 0;
  let inWindow = 0;
  let sightingsWithPersonnel = 0;
  let largest: PersonnelSummary['largest'] = null;

  for (const sighting of usable) {
    const count = personnelCount(sighting);
    total += count;
    if (count > 0) {
      sightingsWithPersonnel += 1;
    }
    if (count > 0 && (largest === null || count > largest.count)) {
      largest = {
        sightingId: typeof sighting.id === 'string' ? sighting.id : '',
        count,
      };
    }
    const age = now - sighting.timestamp;
    if (age >= 0 && age < windowMs) {
      inWindow += count;
    }
  }

  return {
    total,
    inWindow,
    sightingsWithPersonnel,
    sightingCount: usable.length,
    averagePerSighting:
      usable.length > 0 ? Math.round((total / usable.length) * 10) / 10 : 0,
    largest,
  };
}
