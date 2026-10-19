// Duplicate-sighting grouping.
//
// Several people often report the same ICE activity from slightly
// different positions within a few minutes of each other. Rendered as
// separate cards (and separate map pins) those reports flood the list
// and make one event look like many. This module groups sightings that
// plausibly describe the same event so the UI can show one card per
// event with a "N similar reports" badge instead.
//
// Two sightings belong to the same cluster when ALL of these hold:
//   - their locations are within `radiusKm` of the cluster's
//     representative sighting,
//   - their timestamps are within `windowMs` of the representative's,
//   - they describe the same vehicle type (a van and an officer on foot
//     at the same corner are two reports, not duplicates).
//
// The representative is the member a reader should see first: highest
// trust score (upvotes - downvotes), newest first on ties. Clustering
// is greedy in that priority order, so a high-trust report anchors its
// cluster and lower-trust duplicates attach to it — never the reverse.

import { distanceKm } from './geo';
import type { IceSighting } from './types';

export interface ClusterOptions {
  /** Max distance from the representative, in kilometers. */
  radiusKm?: number;
  /** Max |timestamp difference| from the representative, in ms. */
  windowMs?: number;
}

export const DEFAULT_CLUSTER_RADIUS_KM = 0.4;
export const DEFAULT_CLUSTER_WINDOW_MS = 45 * 60 * 1000;

export interface SightingCluster {
  /** The member shown as the cluster's card. */
  representative: IceSighting;
  /** All members, representative first, then newest first. */
  members: IceSighting[];
  /** members.length — how many reports describe this event. */
  reportCount: number;
  /** Newest member timestamp. */
  latestTimestamp: number;
  /** Sum of "still there" confirmations across members. */
  stillThere: number;
  /** Sum of "not there anymore" reports across members. */
  notThere: number;
  /**
   * True when the confirmations disagree about whether the sighting is
   * still present (at least one of each) — the UI can flag the event
   * as contested instead of treating every report as settled fact.
   */
  contested: boolean;
}

/** Trust score used across the app: upvotes minus downvotes. */
export function trustScore(sighting: IceSighting): number {
  return (sighting.upvotes || 0) - (sighting.downvotes || 0);
}

function resolveOptions(options?: ClusterOptions): Required<ClusterOptions> {
  return {
    radiusKm: options?.radiusKm ?? DEFAULT_CLUSTER_RADIUS_KM,
    windowMs: options?.windowMs ?? DEFAULT_CLUSTER_WINDOW_MS,
  };
}

function isDuplicateOf(
  candidate: IceSighting,
  representative: IceSighting,
  options: Required<ClusterOptions>
): boolean {
  if (candidate.vehicle?.type !== representative.vehicle?.type) {
    return false;
  }
  if (Math.abs(candidate.timestamp - representative.timestamp) > options.windowMs) {
    return false;
  }
  if (!candidate.location || !representative.location) {
    return false;
  }
  return distanceKm(candidate.location, representative.location) <= options.radiusKm;
}

function summarize(members: IceSighting[]): SightingCluster {
  let stillThere = 0;
  let notThere = 0;
  let latestTimestamp = members[0].timestamp;
  for (const member of members) {
    stillThere += member.verification?.stillThere || 0;
    notThere += member.verification?.notThere || 0;
    if (member.timestamp > latestTimestamp) {
      latestTimestamp = member.timestamp;
    }
  }
  return {
    representative: members[0],
    members,
    reportCount: members.length,
    latestTimestamp,
    stillThere,
    notThere,
    contested: stillThere > 0 && notThere > 0,
  };
}

/**
 * Group sightings into duplicate clusters. The input array is not
 * mutated. Clusters are returned newest-activity first; singletons are
 * included as one-member clusters so callers can render uniformly.
 */
export function clusterSightings(
  sightings: IceSighting[],
  options?: ClusterOptions
): SightingCluster[] {
  const resolved = resolveOptions(options);

  // Priority order: the most trusted, then newest, sighting anchors
  // each cluster.
  const byPriority = [...sightings].sort((a, b) => {
    const byTrust = trustScore(b) - trustScore(a);
    return byTrust !== 0 ? byTrust : b.timestamp - a.timestamp;
  });

  const assigned = new Set<string>();
  const clusters: SightingCluster[] = [];

  for (const representative of byPriority) {
    if (assigned.has(representative.id)) {
      continue;
    }
    assigned.add(representative.id);
    const members: IceSighting[] = [representative];

    for (const candidate of byPriority) {
      if (assigned.has(candidate.id)) {
        continue;
      }
      if (isDuplicateOf(candidate, representative, resolved)) {
        assigned.add(candidate.id);
        members.push(candidate);
      }
    }

    // Representative first; the rest newest first for display.
    const [first, ...rest] = members;
    rest.sort((a, b) => b.timestamp - a.timestamp);
    clusters.push(summarize([first, ...rest]));
  }

  clusters.sort((a, b) => b.latestTimestamp - a.latestTimestamp);
  return clusters;
}

/**
 * Map from a cluster representative's sighting id to how many EXTRA
 * reports were grouped into it (0 for singletons). Sightings that are
 * not representatives do not appear in the map. This is the shape the
 * sidebar needs to badge each visible card.
 */
export function duplicateCountById(
  sightings: IceSighting[],
  options?: ClusterOptions
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const cluster of clusterSightings(sightings, options)) {
    if (cluster.reportCount > 1) {
      counts.set(cluster.representative.id, cluster.reportCount - 1);
    }
  }
  return counts;
}
