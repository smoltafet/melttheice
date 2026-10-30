// Follow-up updates digest for sightings.
//
// A sighting can collect follow-up updates (its `updates` list:
// "still there, two vans now", "gone as of 3pm") after the original
// report. The summary strip counts reports and confirmations, but
// nothing surfaces that follow-up activity, even though an update is
// often the freshest signal on a sighting. This module flattens the
// per-sighting update lists into one chronological feed, picks the
// latest update per sighting, and counts how many updates landed in
// a recent window. Updates with blank text or a missing/non-finite
// timestamp are skipped, and sightings without an updates list
// contribute nothing.

import type { IceSighting } from './types';

export interface SightingUpdateEntry {
  /** Id of the sighting the update belongs to ('' when it has none). */
  sightingId: string;
  /** The update text, trimmed. */
  text: string;
  /** When the update was posted, epoch milliseconds. */
  timestamp: number;
  /** The parent sighting's own timestamp, epoch milliseconds. */
  sightingTimestamp: number;
}

export const DEFAULT_UPDATES_WINDOW_MS = 4 * 60 * 60 * 1000;

/**
 * Every usable update from every sighting, newest first. Ties break
 * by parent sighting timestamp (newest first), then sighting id,
 * then text, so the order is deterministic for a given input set.
 */
export function flattenSightingUpdates(
  sightings: readonly IceSighting[] | null | undefined,
): SightingUpdateEntry[] {
  const entries: SightingUpdateEntry[] = [];
  for (const sighting of sightings ?? []) {
    if (!sighting || !Array.isArray(sighting.updates)) {
      continue;
    }
    const sightingId = typeof sighting.id === 'string' ? sighting.id : '';
    const sightingTimestamp = Number.isFinite(sighting.timestamp)
      ? sighting.timestamp
      : 0;
    for (const update of sighting.updates) {
      const text = typeof update?.text === 'string' ? update.text.trim() : '';
      if (!text || !Number.isFinite(update?.timestamp)) {
        continue;
      }
      entries.push({
        sightingId,
        text,
        timestamp: update.timestamp,
        sightingTimestamp,
      });
    }
  }
  entries.sort((a, b) => {
    if (b.timestamp !== a.timestamp) {
      return b.timestamp - a.timestamp;
    }
    if (b.sightingTimestamp !== a.sightingTimestamp) {
      return b.sightingTimestamp - a.sightingTimestamp;
    }
    if (a.sightingId !== b.sightingId) {
      return a.sightingId < b.sightingId ? -1 : 1;
    }
    return a.text < b.text ? -1 : a.text > b.text ? 1 : 0;
  });
  return entries;
}

/**
 * The newest update for each sighting id, keyed by sighting id.
 * Sightings with no usable updates are absent from the map.
 */
export function latestUpdatePerSighting(
  sightings: readonly IceSighting[] | null | undefined,
): Map<string, SightingUpdateEntry> {
  const latest = new Map<string, SightingUpdateEntry>();
  for (const entry of flattenSightingUpdates(sightings)) {
    if (!latest.has(entry.sightingId)) {
      latest.set(entry.sightingId, entry);
    }
  }
  return latest;
}

export interface UpdatesSummary {
  /** All usable updates across all sightings. */
  total: number;
  /** How many distinct sightings carry at least one usable update. */
  sightingsWithUpdates: number;
  /** Newest update timestamp, or null when there are no updates. */
  latestTimestamp: number | null;
  /** Updates in (now - windowMs, now]. */
  inWindow: number;
}

/**
 * Summarize follow-up update activity. `now` defaults to the newest
 * update timestamp (so a quiet period still counts the window ending
 * at the last activity, matching lib/trend); a non-positive or
 * non-finite window falls back to the default 4 hours. Updates dated
 * after `now` count in the total but not in the window.
 */
export function summarizeSightingUpdates(
  sightings: readonly IceSighting[] | null | undefined,
  options?: { now?: number; windowMs?: number },
): UpdatesSummary {
  const windowMs =
    options && Number.isFinite(options.windowMs) && (options.windowMs as number) > 0
      ? (options.windowMs as number)
      : DEFAULT_UPDATES_WINDOW_MS;

  const entries = flattenSightingUpdates(sightings);
  const latestTimestamp = entries.length > 0 ? entries[0].timestamp : null;

  const now =
    options && Number.isFinite(options.now)
      ? (options.now as number)
      : (latestTimestamp ?? 0);

  let inWindow = 0;
  for (const entry of entries) {
    const age = now - entry.timestamp;
    if (age >= 0 && age < windowMs) {
      inWindow += 1;
    }
  }

  return {
    total: entries.length,
    sightingsWithUpdates: new Set(entries.map((entry) => entry.sightingId)).size,
    latestTimestamp,
    inWindow,
  };
}
