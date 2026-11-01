// Verification consensus for sightings.
//
// filtering.ts reduces each sighting's verification votes to a
// three-way state (confirmed only when nobody has voted not-there,
// contested when both sides voted), and sightingStats.ts totals the
// raw votes. Neither answers the proportional question a reader
// actually asks: given the votes this report has, which way does the
// community lean, and how strongly? A report with 9 still-there votes
// and 1 not-there vote is not meaningfully "contested" in the same
// way as one split 1-1, and a 1-0 report should not carry the same
// weight as a 12-1 one.
//
// This module scores consensus by share: the fraction of votes that
// say still-there, bucketed into levels with a minimum vote count
// before a lean counts as settled. Pure functions throughout; vote
// counts that are missing, non-finite, or negative read as zero and
// fractional counts are floored, matching lib/personnel.

import type { IceSighting } from './types';

export type ConsensusLevel =
  | 'unverified'
  | 'confirmed'
  | 'leaning-confirmed'
  | 'contested'
  | 'leaning-refuted'
  | 'refuted';

/** Votes needed before a one-sided share settles at the top level. */
export const CONSENSUS_SETTLED_MIN_VOTES = 3;

export interface VerificationVotes {
  stillThere: number;
  notThere: number;
  total: number;
}

export interface SightingConsensus extends VerificationVotes {
  /** stillThere / total, in [0, 1]; null when there are no votes. */
  stillShare: number | null;
  level: ConsensusLevel;
}

/** One sighting's verification votes, normalized to safe integers. */
export function verificationVotes(
  sighting: IceSighting | null | undefined,
): VerificationVotes {
  const clean = (value: unknown): number =>
    typeof value === 'number' && Number.isFinite(value) && value > 0
      ? Math.floor(value)
      : 0;
  const stillThere = clean(sighting?.verification?.stillThere);
  const notThere = clean(sighting?.verification?.notThere);
  return { stillThere, notThere, total: stillThere + notThere };
}

/**
 * Consensus for one sighting. Shares at or above 2/3 lean confirmed
 * and at or below 1/3 lean refuted; a share strictly between is
 * contested. A lean settles to 'confirmed' / 'refuted' only once at
 * least CONSENSUS_SETTLED_MIN_VOTES votes back it, so a single vote
 * never settles a report on its own.
 */
export function consensusFor(
  sighting: IceSighting | null | undefined,
): SightingConsensus {
  const votes = verificationVotes(sighting);
  if (votes.total === 0) {
    return { ...votes, stillShare: null, level: 'unverified' };
  }
  const stillShare = votes.stillThere / votes.total;
  let level: ConsensusLevel;
  if (stillShare >= 2 / 3) {
    level =
      votes.total >= CONSENSUS_SETTLED_MIN_VOTES
        ? 'confirmed'
        : 'leaning-confirmed';
  } else if (stillShare <= 1 / 3) {
    level =
      votes.total >= CONSENSUS_SETTLED_MIN_VOTES
        ? 'refuted'
        : 'leaning-refuted';
  } else {
    level = 'contested';
  }
  return { ...votes, stillShare, level };
}

export interface ConsensusSummary {
  /** Sightings examined (junk entries skipped). */
  sightingCount: number;
  /** Sightings per consensus level. */
  counts: Record<ConsensusLevel, number>;
  totalStillThere: number;
  totalNotThere: number;
  /** All still-there votes / all votes; null when nobody voted. */
  overallShare: number | null;
  /**
   * Id of the most evenly split sighting that has votes on both
   * sides (share closest to 1/2; ties break on more votes, then the
   * newer sighting). Null when no sighting has both kinds of votes.
   */
  mostContestedId: string | null;
}

/** Summarize consensus across a set of sightings. */
export function summarizeConsensus(
  sightings: readonly IceSighting[] | null | undefined,
): ConsensusSummary {
  const counts: Record<ConsensusLevel, number> = {
    unverified: 0,
    confirmed: 0,
    'leaning-confirmed': 0,
    contested: 0,
    'leaning-refuted': 0,
    refuted: 0,
  };
  let sightingCount = 0;
  let totalStillThere = 0;
  let totalNotThere = 0;
  let best: { id: string; distance: number; total: number; timestamp: number } | null =
    null;

  for (const sighting of sightings ?? []) {
    if (!sighting || typeof sighting !== 'object') {
      continue;
    }
    sightingCount += 1;
    const consensus = consensusFor(sighting);
    counts[consensus.level] += 1;
    totalStillThere += consensus.stillThere;
    totalNotThere += consensus.notThere;
    if (consensus.stillThere > 0 && consensus.notThere > 0) {
      const distance = Math.abs((consensus.stillShare ?? 0.5) - 0.5);
      const timestamp =
        typeof sighting.timestamp === 'number' &&
        Number.isFinite(sighting.timestamp)
          ? sighting.timestamp
          : 0;
      const candidate = {
        id: typeof sighting.id === 'string' ? sighting.id : '',
        distance,
        total: consensus.total,
        timestamp,
      };
      if (
        !best ||
        candidate.distance < best.distance ||
        (candidate.distance === best.distance &&
          (candidate.total > best.total ||
            (candidate.total === best.total &&
              candidate.timestamp > best.timestamp)))
      ) {
        best = candidate;
      }
    }
  }

  const totalVotes = totalStillThere + totalNotThere;
  return {
    sightingCount,
    counts,
    totalStillThere,
    totalNotThere,
    overallShare: totalVotes > 0 ? totalStillThere / totalVotes : null,
    mostContestedId: best ? best.id : null,
  };
}
