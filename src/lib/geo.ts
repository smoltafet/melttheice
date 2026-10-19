// Geographic helpers shared by the client UI and the alerts API route.
//
// This module intentionally has no imports so it can be used from both
// browser components and server route handlers, and so it can be unit
// tested in plain Node.

export interface GeoPoint {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_KM = 6371;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Calculate the great-circle distance between two coordinates in
 * kilometers using the Haversine formula.
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

/** Distance in kilometers between two { lat, lng } points. */
export function distanceKm(a: GeoPoint, b: GeoPoint): number {
  return calculateDistance(a.lat, a.lng, b.lat, b.lng);
}

/**
 * Format a distance in kilometers for display.
 * Under 1 km the value is shown in whole meters, under 10 km with one
 * decimal place, and larger distances rounded to whole kilometers.
 */
export function formatDistance(km: number): string {
  if (!Number.isFinite(km) || km < 0) {
    return '';
  }
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  if (km < 10) {
    return `${km.toFixed(1)} km`;
  }
  return `${Math.round(km)} km`;
}

/**
 * Return a new array of sightings sorted by distance from `origin`,
 * nearest first. Sightings at the same distance are ordered newest
 * first so the result is deterministic. The input array is not mutated.
 */
export function sortSightingsByDistance<T extends { location: GeoPoint; timestamp: number }>(
  sightings: readonly T[],
  origin: GeoPoint
): T[] {
  return [...sightings].sort((a, b) => {
    const distanceDiff = distanceKm(a.location, origin) - distanceKm(b.location, origin);
    if (distanceDiff !== 0) {
      return distanceDiff;
    }
    return b.timestamp - a.timestamp;
  });
}

/**
 * Return the sightings within `radiusKm` of `origin`, in input order.
 */
export function filterWithinRadius<T extends { location: GeoPoint }>(
  sightings: readonly T[],
  origin: GeoPoint,
  radiusKm: number
): T[] {
  return sightings.filter((s) => distanceKm(s.location, origin) <= radiusKm);
}

/**
 * Map every sighting id to its distance in kilometers from `origin`.
 */
export function distanceById<T extends { id: string; location: GeoPoint }>(
  sightings: readonly T[],
  origin: GeoPoint
): Map<string, number> {
  const result = new Map<string, number>();
  for (const s of sightings) {
    result.set(s.id, distanceKm(s.location, origin));
  }
  return result;
}

/**
 * A stored value only counts as a location when it is an object with
 * finite numeric lat/lng fields.
 */
export function isValidGeoPoint(value: unknown): value is GeoPoint {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as { lat?: unknown; lng?: unknown };
  return (
    typeof candidate.lat === 'number' &&
    Number.isFinite(candidate.lat) &&
    typeof candidate.lng === 'number' &&
    Number.isFinite(candidate.lng) &&
    candidate.lat >= -90 &&
    candidate.lat <= 90 &&
    candidate.lng >= -180 &&
    candidate.lng <= 180
  );
}

/**
 * Resolve the location a user saved for proximity alerts from their
 * Firestore user document.
 *
 * The settings UI (Sidebar SettingsView) stores the position under the
 * `location` field, while some older documents use `lastKnownLocation`.
 * The current field wins; the legacy field is only a fallback. Returns
 * null when the document has no usable location.
 */
export function resolveUserAlertLocation(userData: {
  location?: unknown;
  lastKnownLocation?: unknown;
}): GeoPoint | null {
  if (isValidGeoPoint(userData.location)) {
    return userData.location;
  }
  if (isValidGeoPoint(userData.lastKnownLocation)) {
    return userData.lastKnownLocation;
  }
  return null;
}
