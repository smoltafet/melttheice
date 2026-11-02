// Triage priority for sightings.
//
// The sort modes each answer one question (newest, nearest, freshest,
// top rated), but someone deciding where to go first needs those
// signals combined: a report matters most when it is recent, the
// crowd's votes say the activity is still there, the report itself
// carries enough detail to act on, and other readers trust it. This
// module scores each sighting 0-100 from exactly those four parts,
// reusing the existing freshness, consensus, and completeness
// modules instead of re-deriving their rules:
//
//   freshness     40 points, the freshness decay factor at `now`
//   verification  30 points, by consensus level (confirmed highest,
//                 refuted zero, unverified a low middle value)
//   completeness  20 points, the report's completeness score scaled
//   trust         10 points, net upvotes clamped to [-10, 10]
//
// Scores bucket into levels (urgent / high / normal / low) so the UI
// can count how many reports need attention now. Pure functions
// throughout; sightings with an unusable timestamp score their
// freshness part as 0 rather than being dropped, because a report
// with a broken clock can still be the only report of an event.

import { assessCompleteness } from './completeness';
import { consensusFor, type ConsensusLevel } from './consensus';
import { decayFactor, sightingAgeMs } from './freshness';
import type { IceSighting } from './types';

export type PriorityLevel = 'urgent' | 'high' | 'normal' | 'low';

export const PRIORITY_URGENT_THRESHOLD = 70;
export const PRIORITY_HIGH_THRESHOLD = 50;
export const PRIORITY_NORMAL_THRESHOLD = 30;

export interface PriorityParts {
  /** 0-40 from the freshness decay factor. */
  freshness: number;
  /** 0-30 from the consensus level. */
  verification: number;
  /** 0-20 from the completeness score. */
  completeness: number;
  /** 0-10 from net upvotes, clamped. */
  trust: number;
}

export interface SightingPriority {
  /** 0-100, one decimal. */
  score: number;
  level: PriorityLevel;
  parts: PriorityParts;
}

const VERIFICATION_POINTS: Record<ConsensusLevel, number> = {
  confirmed: 30,
  'leaning-confirmed': 21,
  contested: 18,
  unverified: 9,
  'leaning-refuted': 6,
  refuted: 0,
};

const round1 = (value: number): number => Math.round(value * 10) / 10;

export function priorityLevelFor(score: number): PriorityLevel {
  if (score >= PRIORITY_URGENT_THRESHOLD) {
    return 'urgent';
  }
  if (score >= PRIORITY_HIGH_THRESHOLD) {
    return 'high';
  }
  if (score >= PRIORITY_NORMAL_THRESHOLD) {
    return 'normal';
  }
  return 'low';
}

/** Priority for one sighting at `now`. Junk input scores 0 / low. */
export function priorityFor(
  sighting: IceSighting | null | undefined,
  now: number = Date.now(),
): SightingPriority {
  if (!sighting || typeof sighting !== 'object') {
    return {
      score: 0,
      level: 'low',
      parts: { freshness: 0, verification: 0, completeness: 0, trust: 0 },
    };
  }

  const age = sightingAgeMs(sighting, now);
  const freshness = Number.isFinite(sighting.timestamp)
    ? 40 * decayFactor(age)
    : 0;
  const verification = VERIFICATION_POINTS[consensusFor(sighting).level];
  const completeness = 20 * (assessCompleteness(sighting).score / 100);
  const netTrust = Math.max(
    -10,
    Math.min(10, (sighting.upvotes || 0) - (sighting.downvotes || 0)),
  );
  const trust = netTrust / 2 + 5;

  const parts: PriorityParts = {
    freshness: round1(freshness),
    verification,
    completeness: round1(completeness),
    trust: round1(trust),
  };
  const score = round1(
    Math.max(0, Math.min(100, freshness + verification + completeness + trust)),
  );
  return { score, level: priorityLevelFor(score), parts };
}

/**
 * Order sightings by priority, highest first. Pure: the input array
 * is not mutated. Ties break toward the newer sighting, then toward
 * higher net trust, so the order is stable and explainable.
 */
export function sortSightingsByPriority(
  sightings: readonly IceSighting[] | null | undefined,
  now: number = Date.now(),
): IceSighting[] {
  const scored = (sightings ?? [])
    .filter((sighting) => sighting && typeof sighting === 'object')
    .map((sighting) => ({ sighting, priority: priorityFor(sighting, now) }));
  scored.sort((a, b) => {
    if (b.priority.score !== a.priority.score) {
      return b.priority.score - a.priority.score;
    }
    const timeDelta = (b.sighting.timestamp || 0) - (a.sighting.timestamp || 0);
    if (timeDelta !== 0) {
      return timeDelta;
    }
    const trustA = (a.sighting.upvotes || 0) - (a.sighting.downvotes || 0);
    const trustB = (b.sighting.upvotes || 0) - (b.sighting.downvotes || 0);
    return trustB - trustA;
  });
  return scored.map((entry) => entry.sighting);
}

export interface PrioritySummary {
  /** Sightings scored (junk entries skipped). */
  sightingCount: number;
  /** Sightings per priority level. */
  counts: Record<PriorityLevel, number>;
  /** Mean score across the set, one decimal; 0 for an empty set. */
  averageScore: number;
  /**
   * Id of the highest-priority sighting (ties break toward the newer
   * sighting). Null for an empty set.
   */
  topId: string | null;
  /** Score of the top sighting; 0 for an empty set. */
  topScore: number;
}

/** Summarize priority across a set of sightings. */
export function summarizePriority(
  sightings: readonly IceSighting[] | null | undefined,
  now: number = Date.now(),
): PrioritySummary {
  const counts: Record<PriorityLevel, number> = {
    urgent: 0,
    high: 0,
    normal: 0,
    low: 0,
  };
  let total = 0;
  let count = 0;
  let topId: string | null = null;
  let topScore = 0;
  let topTimestamp = -Infinity;
  for (const sighting of sightings ?? []) {
    if (!sighting || typeof sighting !== 'object') {
      continue;
    }
    const priority = priorityFor(sighting, now);
    counts[priority.level] += 1;
    total += priority.score;
    count += 1;
    const timestamp = Number.isFinite(sighting.timestamp)
      ? sighting.timestamp
      : -Infinity;
    if (
      priority.score > topScore ||
      (priority.score === topScore && timestamp > topTimestamp)
    ) {
      topId = sighting.id ?? null;
      topScore = priority.score;
      topTimestamp = timestamp;
    }
  }
  return {
    sightingCount: count,
    counts,
    averageScore: count > 0 ? round1(total / count) : 0,
    topId,
    topScore,
  };
}
