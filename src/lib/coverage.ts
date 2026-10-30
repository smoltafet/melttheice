// Geographic coverage of a set of sightings.
//
// The map and the "nearest" digest answer where reports are relative
// to the viewer, but nothing describes the footprint of the reports
// themselves: whether the current set is one corner or spread across
// the whole city. This module summarizes that footprint as pure
// functions over the sightings with a usable location (a finite,
// in-range lat/lng, the same gate lib/geo applies). Bounds are plain
// min/max, so a set straddling the antimeridian reports the long way
// round; the tracker's reports are local, and that case is out of
// scope rather than silently guessed at.

import { distanceKm, isValidGeoPoint, type GeoPoint } from './geo';
import type { IceSighting } from './types';

export const DEFAULT_COVERAGE_CELL_KM = 1;

export interface CoverageBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

/** Sightings in the set that carry a usable location, in input order. */
export function locatedSightings(
  sightings: readonly IceSighting[] | null | undefined,
): IceSighting[] {
  return (sightings ?? []).filter(
    (sighting) => sighting && isValidGeoPoint(sighting.location),
  );
}

/** Min/max lat/lng box covering every located sighting, or null. */
export function coverageBounds(
  sightings: readonly IceSighting[] | null | undefined,
): CoverageBounds | null {
  const located = locatedSightings(sightings);
  if (located.length === 0) {
    return null;
  }
  let north = -Infinity;
  let south = Infinity;
  let east = -Infinity;
  let west = Infinity;
  for (const sighting of located) {
    north = Math.max(north, sighting.location.lat);
    south = Math.min(south, sighting.location.lat);
    east = Math.max(east, sighting.location.lng);
    west = Math.min(west, sighting.location.lng);
  }
  return { north, south, east, west };
}

/** Center of the coverage bounds, or null when nothing is located. */
export function coverageCenter(
  sightings: readonly IceSighting[] | null | undefined,
): GeoPoint | null {
  const bounds = coverageBounds(sightings);
  if (!bounds) {
    return null;
  }
  return {
    lat: (bounds.north + bounds.south) / 2,
    lng: (bounds.east + bounds.west) / 2,
  };
}

export interface CoverageSpan {
  /** North-south extent of the bounds, in kilometers. */
  latKm: number;
  /** East-west extent of the bounds at their center latitude. */
  lngKm: number;
  /** Corner-to-corner distance of the bounds, in kilometers. */
  diagonalKm: number;
}

/** Size of the coverage bounds, or null when nothing is located. */
export function coverageSpan(
  sightings: readonly IceSighting[] | null | undefined,
): CoverageSpan | null {
  const bounds = coverageBounds(sightings);
  if (!bounds) {
    return null;
  }
  const centerLat = (bounds.north + bounds.south) / 2;
  const latKm = distanceKm(
    { lat: bounds.south, lng: bounds.west },
    { lat: bounds.north, lng: bounds.west },
  );
  const lngKm = distanceKm(
    { lat: centerLat, lng: bounds.west },
    { lat: centerLat, lng: bounds.east },
  );
  const diagonalKm = distanceKm(
    { lat: bounds.south, lng: bounds.west },
    { lat: bounds.north, lng: bounds.east },
  );
  const round = (value: number) => Math.round(value * 1000) / 1000;
  return { latKm: round(latKm), lngKm: round(lngKm), diagonalKm: round(diagonalKm) };
}

/**
 * How many distinct grid areas the located sightings fall into.
 * Cells are `cellKm` squares (a non-positive or non-finite cell size
 * falls back to the default 1 km); the longitude cell width is
 * widened by the cosine of the set's center latitude so cells stay
 * roughly square away from the equator.
 */
export function distinctAreas(
  sightings: readonly IceSighting[] | null | undefined,
  cellKm: number = DEFAULT_COVERAGE_CELL_KM,
): number {
  const located = locatedSightings(sightings);
  if (located.length === 0) {
    return 0;
  }
  const size = Number.isFinite(cellKm) && cellKm > 0 ? cellKm : DEFAULT_COVERAGE_CELL_KM;
  const center = coverageCenter(located) as GeoPoint;
  const latCellDegrees = size / 111.32;
  const cosLat = Math.max(0.01, Math.cos((center.lat * Math.PI) / 180));
  const lngCellDegrees = size / (111.32 * cosLat);
  const cells = new Set<string>();
  for (const sighting of located) {
    const latCell = Math.floor(sighting.location.lat / latCellDegrees);
    const lngCell = Math.floor(sighting.location.lng / lngCellDegrees);
    cells.add(`${latCell}:${lngCell}`);
  }
  return cells.size;
}

export interface CoverageSummary {
  /** Sightings with a usable location. */
  locatedCount: number;
  /** Sightings in the input set, usable location or not. */
  sightingCount: number;
  bounds: CoverageBounds | null;
  center: GeoPoint | null;
  span: CoverageSpan | null;
  /** Distinct `cellKm` grid areas the located sightings fall into. */
  distinctAreas: number;
}

/** Summarize the geographic footprint of a set of sightings. */
export function summarizeCoverage(
  sightings: readonly IceSighting[] | null | undefined,
  options?: { cellKm?: number },
): CoverageSummary {
  const located = locatedSightings(sightings);
  return {
    locatedCount: located.length,
    sightingCount: (sightings ?? []).filter(Boolean).length,
    bounds: coverageBounds(located),
    center: coverageCenter(located),
    span: coverageSpan(located),
    distinctAreas: distinctAreas(located, options?.cellKm),
  };
}
