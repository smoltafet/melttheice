// "What's near me?" digest for sightings.
//
// The "Nearest" sort orders the list by distance, but readers still
// have to scan card by card to answer the questions they actually
// have: how close is the closest report, which way is it, and how
// much activity is inside the rings around me (1 / 5 / 10 km)? This
// module computes that digest from the viewer's position in one pass:
// per-sighting distance + compass bearing, the nearest active report,
// counts per distance ring, and the closest report of each vehicle
// type. Sightings with missing or out-of-range coordinates are
// skipped rather than producing NaN distances, matching mapFeatures.

import { distanceKm, isValidGeoPoint, type GeoPoint } from './geo';
import { freshnessTier } from './freshness';
import type { IceSighting } from './types';

export type CompassPoint =
  | 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';

const COMPASS_POINTS: CompassPoint[] = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

/**
 * Initial great-circle bearing from `from` to `to`, in degrees
 * clockwise from north, normalized to [0, 360). Returns 0 when the
 * two points coincide (bearing is undefined there; north is as good
 * an answer as any and keeps callers branch-free).
 */
export function bearingDegrees(from: GeoPoint, to: GeoPoint): number {
  if (!isValidGeoPoint(from) || !isValidGeoPoint(to)) {
    return 0;
  }
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const lat1 = toRad(from.lat);
  const lat2 = toRad(to.lat);
  const deltaLng = toRad(to.lng - from.lng);
  const y = Math.sin(deltaLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng);
  if (x === 0 && y === 0) {
    return 0;
  }
  const degrees = (Math.atan2(y, x) * 180) / Math.PI;
  return (degrees + 360) % 360;
}

/** Compass point for a bearing in degrees (0 = N, 90 = E). */
export function compassPoint(bearing: number): CompassPoint {
  const normalized = ((bearing % 360) + 360) % 360;
  const index = Math.floor((normalized + 22.5) / 45) % 8;
  return COMPASS_POINTS[index];
}

export interface NearbySighting {
  sighting: IceSighting;
  distanceKm: number;
  bearingDegrees: number;
  compass: CompassPoint;
}

export interface NearbyDigest {
  /** Every sighting with usable coordinates, nearest first. */
  ranked: NearbySighting[];
  /** The closest sighting overall, or null when there is none. */
  nearest: NearbySighting | null;
  /** The closest sighting that is still 'live' or 'recent', or null. */
  nearestActive: NearbySighting | null;
  /** Counts of sightings whose distance falls in each ring. */
  rings: { within1Km: number; within5Km: number; within10Km: number; beyond10Km: number };
  /** Closest sighting per vehicle type present, keyed by type. */
  nearestByVehicleType: Record<string, NearbySighting>;
}

/**
 * Build the nearby digest for a viewer at `origin`. `now` is only
 * used to decide which sightings count as active (live/recent
 * freshness tiers) for `nearestActive`.
 */
export function nearbyDigest(
  sightings: IceSighting[],
  origin: GeoPoint,
  now: number = Date.now()
): NearbyDigest {
  const digest: NearbyDigest = {
    ranked: [],
    nearest: null,
    nearestActive: null,
    rings: { within1Km: 0, within5Km: 0, within10Km: 0, beyond10Km: 0 },
    nearestByVehicleType: {},
  };
  if (!Array.isArray(sightings) || !isValidGeoPoint(origin)) {
    return digest;
  }

  const ranked: NearbySighting[] = [];
  for (const sighting of sightings) {
    if (!sighting || !isValidGeoPoint(sighting.location)) {
      continue;
    }
    const distance = distanceKm(origin, sighting.location);
    if (!Number.isFinite(distance)) {
      continue;
    }
    const bearing = bearingDegrees(origin, sighting.location);
    ranked.push({
      sighting,
      distanceKm: distance,
      bearingDegrees: bearing,
      compass: compassPoint(bearing),
    });
  }
  ranked.sort((a, b) => a.distanceKm - b.distanceKm || b.sighting.timestamp - a.sighting.timestamp);
  digest.ranked = ranked;
  digest.nearest = ranked[0] ?? null;

  for (const entry of ranked) {
    if (entry.distanceKm <= 1) {
      digest.rings.within1Km += 1;
    } else if (entry.distanceKm <= 5) {
      digest.rings.within5Km += 1;
    } else if (entry.distanceKm <= 10) {
      digest.rings.within10Km += 1;
    } else {
      digest.rings.beyond10Km += 1;
    }
    if (digest.nearestActive === null) {
      const tier = freshnessTier(entry.sighting, now);
      if (tier === 'live' || tier === 'recent') {
        digest.nearestActive = entry;
      }
    }
    const vehicleType = entry.sighting.vehicle?.type;
    if (vehicleType && !(vehicleType in digest.nearestByVehicleType)) {
      digest.nearestByVehicleType[vehicleType] = entry;
    }
  }
  return digest;
}
