// Search and filtering for sightings.
//
// Sorting answers "in what order?", but readers of the sidebar often
// arrive with a narrower question: "any white vans near the school?",
// "what's been reported in the last hour?", "which of these are
// actually confirmed?". Until now the only way to answer was to scroll
// the whole list and eyeball every card.
//
// This module is the pure logic behind a search box and filter set
// for the list: free-text search over everything written on a report
// (vehicle type and color, personnel description, activity, items
// held, follow-up updates), plus structured filters for vehicle type,
// activity, verification state, age, and community trust. It operates
// on cluster representatives, so a search hit shows one card per
// event, exactly like the unfiltered list.

import { trustScore } from './clusters';
import type { IceSighting } from './types';

/** How a sighting's community verification reads at a glance. */
export type VerificationState = 'confirmed' | 'contested' | 'unverified';

export type VerificationFilter = 'any' | VerificationState;

export interface SightingFilter {
  /** Free text; every whitespace-separated token must match. */
  query?: string;
  /** Keep only these vehicle types (e.g. ['Van', 'SUV']). */
  vehicleTypes?: string[];
  /** Keep only these activities (e.g. ['Patrolling']). */
  activities?: string[];
  /** Verification state to keep; 'any' (the default) keeps all. */
  verification?: VerificationFilter;
  /** Drop sightings older than this many ms at `now`. */
  maxAgeMs?: number;
  /** Drop sightings whose trust score is below this. */
  minTrustScore?: number;
}

/**
 * Lowercase, strip diacritics, and collapse whitespace so search is
 * forgiving about case, accents ("patrullando" vs "patrullándo"),
 * and stray spacing. Non-strings normalize to ''.
 */
export function normalizeSearchText(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Split a raw query into normalized tokens; empty query → []. */
export function tokenizeQuery(query: unknown): string[] {
  const normalized = normalizeSearchText(query);
  return normalized === '' ? [] : normalized.split(' ');
}

/**
 * Everything searchable about a sighting, as one normalized string:
 * vehicle type and color, personnel count and description, activity,
 * items held, and the text of any follow-up updates.
 */
export function sightingSearchText(sighting: IceSighting): string {
  if (!sighting) {
    return '';
  }
  const parts: unknown[] = [
    sighting.vehicle?.type,
    sighting.vehicle?.color,
    sighting.personnel?.description,
    sighting.personnel?.count != null ? String(sighting.personnel.count) : '',
    sighting.behavior?.activity,
    sighting.behavior?.itemsHeld,
  ];
  if (Array.isArray(sighting.updates)) {
    for (const update of sighting.updates) {
      parts.push(update?.text);
    }
  }
  return parts.map(normalizeSearchText).filter(Boolean).join(' ');
}

/**
 * True when every token of the query appears in the sighting's
 * searchable text. An empty query matches everything, so the search
 * box can be wired unconditionally.
 */
export function matchesQuery(sighting: IceSighting, query: unknown): boolean {
  const tokens = tokenizeQuery(query);
  if (tokens.length === 0) {
    return true;
  }
  const text = sightingSearchText(sighting);
  return tokens.every((token) => text.includes(token));
}

/**
 * Classify a sighting by its still-there / not-there confirmations:
 * both kinds present → 'contested'; only still-there → 'confirmed';
 * neither (or only not-there, which reads as unconfirmed rather than
 * refuted on its own) → 'unverified', except that not-there votes
 * with zero still-there and a negative trust score count as
 * 'contested' too — the community is actively disputing it.
 */
export function verificationState(sighting: IceSighting): VerificationState {
  const stillThere = sighting?.verification?.stillThere ?? 0;
  const notThere = sighting?.verification?.notThere ?? 0;
  if (stillThere > 0 && notThere > 0) {
    return 'contested';
  }
  if (stillThere > 0) {
    return 'confirmed';
  }
  if (notThere > 0 && trustScore(sighting) < 0) {
    return 'contested';
  }
  return 'unverified';
}

/** True when a sighting passes every active dimension of a filter. */
export function matchesFilter(
  sighting: IceSighting,
  filter: SightingFilter,
  now: number = Date.now()
): boolean {
  if (!sighting) {
    return false;
  }
  if (filter.query && !matchesQuery(sighting, filter.query)) {
    return false;
  }
  if (filter.vehicleTypes?.length) {
    if (!filter.vehicleTypes.includes(sighting.vehicle?.type ?? '')) {
      return false;
    }
  }
  if (filter.activities?.length) {
    if (!filter.activities.includes(sighting.behavior?.activity ?? '')) {
      return false;
    }
  }
  if (filter.verification && filter.verification !== 'any') {
    if (verificationState(sighting) !== filter.verification) {
      return false;
    }
  }
  if (filter.maxAgeMs != null) {
    const timestamp = Number.isFinite(sighting.timestamp) ? sighting.timestamp : now;
    if (now - timestamp > filter.maxAgeMs) {
      return false;
    }
  }
  if (filter.minTrustScore != null) {
    if (trustScore(sighting) < filter.minTrustScore) {
      return false;
    }
  }
  return true;
}

/**
 * Apply a filter to a list of sightings, preserving input order —
 * ordering stays the sort modes' job. Returns a new array.
 */
export function filterSightings(
  sightings: IceSighting[],
  filter: SightingFilter,
  now: number = Date.now()
): IceSighting[] {
  if (!Array.isArray(sightings)) {
    return [];
  }
  return sightings.filter((sighting) => matchesFilter(sighting, filter, now));
}

export interface FilterFacets {
  vehicleTypes: Record<string, number>;
  activities: Record<string, number>;
  verification: Record<VerificationState, number>;
}

/**
 * Counts per filter dimension over a list, for rendering filter
 * chips with honest counts ("Van · 3"). Verification counts always
 * carry all three states so the UI never has to special-case a
 * missing key.
 */
export function facetCounts(sightings: IceSighting[]): FilterFacets {
  const facets: FilterFacets = {
    vehicleTypes: {},
    activities: {},
    verification: { confirmed: 0, contested: 0, unverified: 0 },
  };
  if (!Array.isArray(sightings)) {
    return facets;
  }
  for (const sighting of sightings) {
    if (!sighting) {
      continue;
    }
    const vehicleType = sighting.vehicle?.type;
    if (vehicleType) {
      facets.vehicleTypes[vehicleType] = (facets.vehicleTypes[vehicleType] ?? 0) + 1;
    }
    const activity = sighting.behavior?.activity;
    if (activity) {
      facets.activities[activity] = (facets.activities[activity] ?? 0) + 1;
    }
    facets.verification[verificationState(sighting)] += 1;
  }
  return facets;
}
