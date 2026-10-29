// Validation and normalization for sighting data crossing a trust
// boundary: Firestore documents on the way in, and report form data
// on the way out.
//
// page.tsx used to cast every Firestore document straight to
// IceSighting. A malformed or stale document (a missing location, a
// string timestamp, an unknown vehicle type from an older client)
// then flowed into the clustering, distance, and freshness code,
// which assumes valid coordinates and timestamps and produced NaN
// distances and silently wrong sorts instead of an obvious failure.
//
// This module is the gate: core fields (timestamp, location, vehicle
// type, activity) must be present and in range or the whole document
// is rejected; cosmetic fields (colors, descriptions, vote counts,
// verification tallies, updates) are normalized to safe defaults so
// one sloppy field does not hide an otherwise real report.

import { isValidGeoPoint } from './geo';
import type { IceSighting, ReportFormData } from './types';

export const VEHICLE_TYPES: IceSighting['vehicle']['type'][] = [
  'Van',
  'SUV',
  'Sedan',
  'On foot',
];

export const ACTIVITIES: IceSighting['behavior']['activity'][] = [
  'Patrolling',
  'Processing',
  'Stationary',
  'Other',
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/** A vote/tally count: finite numbers clamp to a non-negative integer. */
function count(value: unknown): number {
  const n = finiteNumber(value);
  return n == null ? 0 : Math.max(0, Math.floor(n));
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function isOneOf<T extends string>(value: unknown, options: readonly T[]): value is T {
  return typeof value === 'string' && (options as readonly string[]).includes(value);
}

/**
 * Parse one raw Firestore document into an IceSighting, or return
 * null when a core field is missing or out of range. The document id
 * always wins over any `id` field stored inside the document.
 */
export function parseSightingDocument(id: string, data: unknown): IceSighting | null {
  if (!isRecord(data)) {
    return null;
  }
  const timestamp = finiteNumber(data.timestamp);
  if (timestamp == null || timestamp <= 0) {
    return null;
  }
  if (!isValidGeoPoint(data.location)) {
    return null;
  }
  if (!isRecord(data.vehicle) || !isOneOf(data.vehicle.type, VEHICLE_TYPES)) {
    return null;
  }
  if (!isRecord(data.behavior) || !isOneOf(data.behavior.activity, ACTIVITIES)) {
    return null;
  }
  const personnel = isRecord(data.personnel) ? data.personnel : {};

  const sighting: IceSighting = {
    id,
    timestamp,
    location: { lat: data.location.lat, lng: data.location.lng },
    vehicle: {
      type: data.vehicle.type,
      color: text(data.vehicle.color),
    },
    personnel: {
      count: count(personnel.count),
      description: text(personnel.description),
    },
    behavior: {
      activity: data.behavior.activity,
      itemsHeld: text(data.behavior.itemsHeld),
    },
    upvotes: count(data.upvotes),
    downvotes: count(data.downvotes),
  };

  if (typeof data.imageUrl === 'string' && data.imageUrl !== '') {
    sighting.imageUrl = data.imageUrl;
  }
  if (isRecord(data.verification)) {
    sighting.verification = {
      stillThere: count(data.verification.stillThere),
      notThere: count(data.verification.notThere),
    };
  }
  if (Array.isArray(data.updates)) {
    const updates: NonNullable<IceSighting['updates']> = [];
    for (const update of data.updates) {
      if (!isRecord(update)) {
        continue;
      }
      const updateTimestamp = finiteNumber(update.timestamp);
      if (typeof update.text !== 'string' || updateTimestamp == null) {
        continue;
      }
      updates.push({ text: update.text, timestamp: updateTimestamp });
    }
    if (updates.length > 0) {
      sighting.updates = updates;
    }
  }
  return sighting;
}

/**
 * Parse a batch of { id, data } documents, keeping the valid ones in
 * input order and reporting the ids that were rejected, so a bad
 * document is visible in logs instead of vanishing silently.
 */
export function parseSightingDocuments(
  entries: readonly { id: string; data: unknown }[]
): { sightings: IceSighting[]; rejectedIds: string[] } {
  const sightings: IceSighting[] = [];
  const rejectedIds: string[] = [];
  for (const entry of entries) {
    const sighting = parseSightingDocument(entry.id, entry.data);
    if (sighting) {
      sightings.push(sighting);
    } else {
      rejectedIds.push(entry.id);
    }
  }
  return { sightings, rejectedIds };
}

/**
 * Check report form data before it is written to Firestore. Returns
 * stable error codes (not prose) so the form can map them to its own
 * wording in either language: 'location-required', 'vehicle-type',
 * 'personnel-count', 'activity'.
 */
export function validateReportFormData(data: Partial<ReportFormData>): string[] {
  const errors: string[] = [];
  if (!data.location || !isValidGeoPoint(data.location)) {
    errors.push('location-required');
  }
  if (!isOneOf(data.vehicleType, VEHICLE_TYPES)) {
    errors.push('vehicle-type');
  }
  const personnelCount = data.personnelCount;
  if (
    typeof personnelCount !== 'number' ||
    !Number.isFinite(personnelCount) ||
    personnelCount < 0 ||
    Math.floor(personnelCount) !== personnelCount
  ) {
    errors.push('personnel-count');
  }
  if (!isOneOf(data.activity, ACTIVITIES)) {
    errors.push('activity');
  }
  return errors;
}
