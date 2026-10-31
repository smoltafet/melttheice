// Report completeness for a set of sightings.
//
// Every other summary in the sidebar counts what was reported; none
// of them say how complete those reports are. A sighting with a
// location but no vehicle color, personnel count, or description is
// far less actionable than a full one, and follow-up effort is best
// spent on the reports that are almost complete. This module scores
// each sighting 0-100 from the fields it actually carries, lists the
// fields it is missing, and summarizes a whole set: the average
// score, how many reports clear the completeness bar, and which
// field is missing most often. Pure functions throughout.

import { isValidGeoPoint } from './geo';
import type { IceSighting } from './types';

export const COMPLETE_SCORE_THRESHOLD = 80;

export type CompletenessField =
  | 'location'
  | 'vehicleColor'
  | 'personnelCount'
  | 'personnelDescription'
  | 'activity'
  | 'itemsHeld'
  | 'image'
  | 'verification';

interface FieldCheck {
  field: CompletenessField;
  weight: number;
  present: (sighting: IceSighting) => boolean;
}

const nonEmpty = (value: unknown): boolean =>
  typeof value === 'string' && value.trim().length > 0;

// Weights sum to 100. Location and the personnel details carry the
// most weight because they decide whether a report can be acted on
// at all; a photo and community verification help but are bonuses.
const FIELD_CHECKS: readonly FieldCheck[] = [
  { field: 'location', weight: 25, present: (s) => isValidGeoPoint(s?.location) },
  { field: 'vehicleColor', weight: 15, present: (s) => nonEmpty(s?.vehicle?.color) },
  {
    field: 'personnelCount',
    weight: 15,
    present: (s) =>
      typeof s?.personnel?.count === 'number' &&
      Number.isFinite(s.personnel.count) &&
      s.personnel.count > 0,
  },
  {
    field: 'personnelDescription',
    weight: 15,
    present: (s) => nonEmpty(s?.personnel?.description),
  },
  {
    field: 'activity',
    weight: 10,
    present: (s) => nonEmpty(s?.behavior?.activity) && s.behavior.activity !== 'Other',
  },
  { field: 'itemsHeld', weight: 10, present: (s) => nonEmpty(s?.behavior?.itemsHeld) },
  { field: 'image', weight: 5, present: (s) => nonEmpty(s?.imageUrl) },
  {
    field: 'verification',
    weight: 5,
    present: (s) =>
      (s?.verification?.stillThere ?? 0) + (s?.verification?.notThere ?? 0) > 0,
  },
];

export interface SightingCompleteness {
  /** 0-100, the weighted share of checked fields the report carries. */
  score: number;
  /** Fields the report is missing, in check order. */
  missing: CompletenessField[];
  /** True when the score clears COMPLETE_SCORE_THRESHOLD. */
  complete: boolean;
}

/** Score one sighting's completeness. Junk input scores 0. */
export function assessCompleteness(
  sighting: IceSighting | null | undefined,
): SightingCompleteness {
  if (!sighting || typeof sighting !== 'object') {
    return {
      score: 0,
      missing: FIELD_CHECKS.map((check) => check.field),
      complete: false,
    };
  }
  let score = 0;
  const missing: CompletenessField[] = [];
  for (const check of FIELD_CHECKS) {
    if (check.present(sighting)) {
      score += check.weight;
    } else {
      missing.push(check.field);
    }
  }
  return { score, missing, complete: score >= COMPLETE_SCORE_THRESHOLD };
}

export interface CompletenessSummary {
  /** Sightings assessed (null entries in the input are skipped). */
  sightingCount: number;
  /** Mean score across the set, one decimal; 0 for an empty set. */
  averageScore: number;
  /** Reports at or above COMPLETE_SCORE_THRESHOLD. */
  completeCount: number;
  /** Reports below the threshold. */
  incompleteCount: number;
  /** How often each field is missing across the set. */
  missingCounts: Record<CompletenessField, number>;
  /** The field missing most often, or null when nothing is missing. */
  mostCommonMissing: CompletenessField | null;
}

/** Summarize completeness across a set of sightings. */
export function summarizeCompleteness(
  sightings: readonly IceSighting[] | null | undefined,
): CompletenessSummary {
  const missingCounts = Object.fromEntries(
    FIELD_CHECKS.map((check) => [check.field, 0]),
  ) as Record<CompletenessField, number>;
  const entries = (sightings ?? []).filter(Boolean);
  let scoreTotal = 0;
  let completeCount = 0;
  for (const sighting of entries) {
    const result = assessCompleteness(sighting);
    scoreTotal += result.score;
    if (result.complete) {
      completeCount += 1;
    }
    for (const field of result.missing) {
      missingCounts[field] += 1;
    }
  }
  let mostCommonMissing: CompletenessField | null = null;
  for (const check of FIELD_CHECKS) {
    if (
      missingCounts[check.field] > 0 &&
      (mostCommonMissing === null ||
        missingCounts[check.field] > missingCounts[mostCommonMissing])
    ) {
      mostCommonMissing = check.field;
    }
  }
  return {
    sightingCount: entries.length,
    averageScore:
      entries.length === 0 ? 0 : Math.round((scoreTotal / entries.length) * 10) / 10,
    completeCount,
    incompleteCount: entries.length - completeCount,
    missingCounts,
    mostCommonMissing,
  };
}
