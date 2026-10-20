// Map feature building for sightings.
//
// The sidebar groups duplicate reports of the same event into one
// card (see ./clusters), but the map used to draw one radius circle
// and one center dot per REPORT. Three people reporting the same van
// produced three stacked circles and three dots a few meters apart,
// which read as three separate events and made the busiest — most
// corroborated — events look like clutter instead of one strong
// signal.
//
// This module builds the map's GeoJSON from clusters instead: one
// feature per event, anchored at the cluster representative, carrying
// the report count and the newest member timestamp (so the caller can
// fade the feature by the event's freshest activity rather than by
// whichever report happened to anchor it). It is pure and import-free
// of mapbox-gl so it can be unit tested in plain Node.

import { clusterSightings, type ClusterOptions } from './clusters';
import type { IceSighting } from './types';

export interface SightingMapFeature {
  /** Representative sighting id — marker clicks resolve to this id. */
  id: string;
  /** [lng, lat] in GeoJSON order. */
  coordinates: [number, number];
  /** How many reports describe this event (>= 1). */
  reportCount: number;
  /** Newest member timestamp; use this for age/opacity. */
  latestTimestamp: number;
  /** True when members disagree about whether it is still there. */
  contested: boolean;
  /** All member sighting ids, representative first. */
  memberIds: string[];
}

export interface GeoJsonPointFeature {
  type: 'Feature';
  properties: Record<string, string | number | boolean>;
  geometry: { type: 'Point'; coordinates: [number, number] };
}

function hasUsableLocation(sighting: IceSighting): boolean {
  const location = sighting?.location;
  if (!location) {
    return false;
  }
  const { lat, lng } = location;
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/**
 * Build one map feature per sighting cluster. Sightings without a
 * usable location are skipped: a single document with missing or
 * out-of-range coordinates used to put NaN into the GeoJSON source
 * and could break rendering for every other sighting. The input array
 * is not mutated.
 */
export function buildMapFeatures(
  sightings: IceSighting[],
  options?: ClusterOptions
): SightingMapFeature[] {
  const usable = (sightings || []).filter(hasUsableLocation);
  return clusterSightings(usable, options).map((cluster) => ({
    id: cluster.representative.id,
    coordinates: [
      cluster.representative.location.lng,
      cluster.representative.location.lat,
    ],
    reportCount: cluster.reportCount,
    latestTimestamp: cluster.latestTimestamp,
    contested: cluster.contested,
    memberIds: cluster.members.map((member) => member.id),
  }));
}

/**
 * Convert map features to GeoJSON point features for a Mapbox source.
 * `extraProperties` is merged into every feature's properties (the
 * radius layer uses it for the per-feature opacity value, which only
 * the caller can compute from the app's age settings).
 */
export function toGeoJsonFeatures(
  features: SightingMapFeature[],
  extraProperties?: (feature: SightingMapFeature) => Record<string, string | number | boolean>
): GeoJsonPointFeature[] {
  return features.map((feature) => ({
    type: 'Feature',
    properties: {
      id: feature.id,
      reportCount: feature.reportCount,
      latestTimestamp: feature.latestTimestamp,
      contested: feature.contested,
      ...(extraProperties ? extraProperties(feature) : {}),
    },
    geometry: {
      type: 'Point',
      coordinates: feature.coordinates,
    },
  }));
}
