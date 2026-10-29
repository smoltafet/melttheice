// Export sightings out of the app as CSV or JSON.
//
// Everything else in the app is built for looking at reports on the
// map or in the list; there was no way to take the data with you —
// for a spreadsheet, a shared doc, or an archive of a day's reports.
// This module serializes a set of sightings into stable, flat export
// records (one row per sighting, updates flattened) and renders them
// as RFC 4180 CSV or pretty-printed JSON. Rows are always in
// chronological order (oldest first), whatever order the caller is
// displaying them in, and entries that are not usable sightings at
// all (non-objects, or no finite timestamp) are skipped instead of
// producing corrupt rows; missing cosmetic fields export as empty.

import type { IceSighting } from './types';

export type ExportFormat = 'csv' | 'json';

export interface SightingExportRecord {
  id: string;
  reportedAt: string;
  timestamp: number;
  latitude: number | null;
  longitude: number | null;
  vehicleType: string;
  vehicleColor: string;
  personnelCount: number;
  personnelDescription: string;
  activity: string;
  itemsHeld: string;
  upvotes: number;
  downvotes: number;
  stillThere: number;
  notThere: number;
  updates: string;
}

const CSV_COLUMNS: (keyof SightingExportRecord)[] = [
  'id',
  'reportedAt',
  'latitude',
  'longitude',
  'vehicleType',
  'vehicleColor',
  'personnelCount',
  'personnelDescription',
  'activity',
  'itemsHeld',
  'upvotes',
  'downvotes',
  'stillThere',
  'notThere',
  'updates',
];

function finiteNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/**
 * Normalize one sighting into its flat export record, or return null
 * when the entry is not a usable sighting (not an object, or its
 * timestamp is missing/not finite — a row without a time cannot be
 * placed in the chronological export at all).
 */
export function sightingExportRecord(sighting: IceSighting): SightingExportRecord | null {
  if (!sighting || typeof sighting !== 'object') {
    return null;
  }
  const timestamp = sighting.timestamp;
  if (typeof timestamp !== 'number' || !Number.isFinite(timestamp)) {
    return null;
  }
  const lat = sighting.location?.lat;
  const lng = sighting.location?.lng;
  const updates = Array.isArray(sighting.updates)
    ? sighting.updates
        .filter((update) => update && typeof update.text === 'string' && update.text.trim() !== '')
        .map((update) => update.text.trim())
        .join(' | ')
    : '';
  return {
    id: text(sighting.id),
    reportedAt: new Date(timestamp).toISOString(),
    timestamp,
    latitude: typeof lat === 'number' && Number.isFinite(lat) ? lat : null,
    longitude: typeof lng === 'number' && Number.isFinite(lng) ? lng : null,
    vehicleType: text(sighting.vehicle?.type),
    vehicleColor: text(sighting.vehicle?.color),
    personnelCount: finiteNumber(sighting.personnel?.count, 0),
    personnelDescription: text(sighting.personnel?.description),
    activity: text(sighting.behavior?.activity),
    itemsHeld: text(sighting.behavior?.itemsHeld),
    upvotes: finiteNumber(sighting.upvotes, 0),
    downvotes: finiteNumber(sighting.downvotes, 0),
    stillThere: finiteNumber(sighting.verification?.stillThere, 0),
    notThere: finiteNumber(sighting.verification?.notThere, 0),
    updates,
  };
}

/**
 * The export records for a set of sightings, oldest first. The input
 * array is not mutated.
 */
export function sightingExportRecords(sightings: IceSighting[]): SightingExportRecord[] {
  return (Array.isArray(sightings) ? sightings : [])
    .map(sightingExportRecord)
    .filter((record): record is SightingExportRecord => record !== null)
    .sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Escape one CSV cell per RFC 4180: quote it when it contains a
 * comma, a double quote, or a line break, doubling any quotes inside.
 */
export function escapeCsvCell(value: unknown): string {
  const cell = value === null || value === undefined ? '' : String(value);
  return /[",\r\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell;
}

/**
 * Serialize sightings as CSV: a header row plus one row per sighting,
 * CRLF line endings (RFC 4180), and a trailing CRLF.
 */
export function sightingsToCsv(sightings: IceSighting[]): string {
  const lines = [CSV_COLUMNS.join(',')];
  for (const record of sightingExportRecords(sightings)) {
    lines.push(CSV_COLUMNS.map((column) => escapeCsvCell(record[column])).join(','));
  }
  return lines.join('\r\n') + '\r\n';
}

/**
 * Serialize sightings as pretty-printed JSON (the export records,
 * without the internal epoch `timestamp` field — `reportedAt` already
 * carries the same moment in ISO form).
 */
export function sightingsToJson(sightings: IceSighting[]): string {
  const records = sightingExportRecords(sightings).map((record) => {
    const rest: Record<string, unknown> = { ...record };
    delete rest.timestamp;
    return rest;
  });
  return JSON.stringify(records, null, 2) + '\n';
}

/**
 * Default download filename for an export, e.g.
 * "sightings-2026-10-29.csv".
 */
export function exportFilename(format: ExportFormat, date: Date = new Date()): string {
  const day = date.toISOString().slice(0, 10);
  return `sightings-${day}.${format}`;
}
