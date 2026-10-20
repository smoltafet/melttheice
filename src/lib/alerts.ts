// Alert planning for the /api/send-alerts route.
//
// The route handler used to inline all of its decisions — payload
// checking, radius filtering, channel selection, message wording —
// between the Firebase/Twilio calls, so none of it could be tested
// without live credentials, and a malformed sighting payload (for
// example one missing `vehicle`) threw a TypeError mid-loop and
// failed the whole request with a 500 after some users had already
// been alerted. This module makes those decisions pure and testable;
// the route only performs the actual sends for the plan it is given.

import { calculateDistance, isValidGeoPoint, resolveUserAlertLocation, type GeoPoint } from './geo';
import { MAX_SIGHTING_AGE_MS } from './mapbox';

/** Users within this distance of a sighting get alerted. */
export const ALERT_RADIUS_KM = 2;

export interface AlertSighting {
  location: GeoPoint;
  vehicleType: string;
  vehicleColor: string;
  /** Epoch ms when the sighting was reported, when known. */
  timestamp?: number;
}

export interface AlertRecipient {
  userId: string;
  distanceKm: number;
  language: 'en' | 'es';
  fcmToken: string | null;
  /** E.164 phone number when the user has a valid one stored. */
  phoneNumber: string | null;
}

/**
 * Validate the sighting from a request body. Returns null for
 * anything malformed — the caller answers 400 instead of crashing.
 * Vehicle fields default to an "unknown" description rather than
 * failing: a location-only report should still alert nearby users.
 */
export function parseAlertSighting(body: unknown): AlertSighting | null {
  if (typeof body !== 'object' || body === null) {
    return null;
  }
  const sighting = (body as { sighting?: unknown }).sighting;
  if (typeof sighting !== 'object' || sighting === null) {
    return null;
  }
  const candidate = sighting as {
    location?: unknown;
    vehicle?: { type?: unknown; color?: unknown };
    timestamp?: unknown;
  };
  if (!isValidGeoPoint(candidate.location)) {
    return null;
  }
  const vehicleType =
    typeof candidate.vehicle?.type === 'string' && candidate.vehicle.type.trim()
      ? candidate.vehicle.type.trim()
      : 'Vehicle';
  const vehicleColor =
    typeof candidate.vehicle?.color === 'string' && candidate.vehicle.color.trim()
      ? candidate.vehicle.color.trim()
      : '';
  const timestamp =
    typeof candidate.timestamp === 'number' && Number.isFinite(candidate.timestamp)
      ? candidate.timestamp
      : undefined;
  return { location: candidate.location, vehicleType, vehicleColor, timestamp };
}

/**
 * A sighting older than the app's visibility window (or timestamped
 * in the future) should not trigger a fresh round of alerts — the
 * report form can be retried, and replaying an hours-old payload used
 * to re-alert everyone nearby. Sightings without a timestamp are
 * treated as fresh (the current client does not send one).
 */
export function isAlertableSighting(sighting: AlertSighting, now: number = Date.now()): boolean {
  if (sighting.timestamp == null) {
    return true;
  }
  const age = now - sighting.timestamp;
  return age >= 0 && age <= MAX_SIGHTING_AGE_MS;
}

/** E.164 format check previously inlined in the route. */
export function isValidPhoneNumber(value: unknown): value is string {
  return typeof value === 'string' && /^\+[1-9]\d{1,14}$/.test(value);
}

export interface AlertMessage {
  title: string;
  body: string;
}

/** Localized alert wording, unchanged from the original route. */
export function buildAlertMessage(sighting: AlertSighting, language: 'en' | 'es'): AlertMessage {
  const title = language === 'es' ? '⚠️ ALERTA DE ICE' : '⚠️ ICE ALERT';
  const warning =
    language === 'es'
      ? 'ADVERTENCIA: ¡Avistamiento de ICE reportado cerca de ti!'
      : 'WARNING: ICE Sighting reported near you!';
  const vehicleInfo = `${sighting.vehicleColor} ${sighting.vehicleType}`.trim();
  const detailsLink =
    language === 'es' ? 'Ver detalles en melttheice.us' : 'See details at melttheice.us';
  return { title, body: `${warning} (${vehicleInfo}). ${detailsLink}` };
}

/**
 * Decide who gets alerted for a sighting: users with a resolvable
 * stored location within `radiusKm`, each with the channels they can
 * actually receive on. Users with neither a push token nor a valid
 * phone number are excluded — counting them as "alerted" (as the old
 * counters effectively did) overstates what was sent. Order is
 * nearest first so any downstream rate limiting drops the farthest
 * recipients, not the closest.
 */
export function planAlerts(
  users: ReadonlyArray<{ id: string; data: Record<string, unknown> }>,
  sighting: AlertSighting,
  radiusKm: number = ALERT_RADIUS_KM
): AlertRecipient[] {
  const recipients: AlertRecipient[] = [];

  for (const user of users) {
    const userLocation = resolveUserAlertLocation(user.data);
    if (!userLocation) {
      continue;
    }
    const distanceKm = calculateDistance(
      sighting.location.lat,
      sighting.location.lng,
      userLocation.lat,
      userLocation.lng
    );
    if (distanceKm > radiusKm) {
      continue;
    }
    const fcmToken =
      typeof user.data.fcmToken === 'string' && user.data.fcmToken ? user.data.fcmToken : null;
    const phoneNumber = isValidPhoneNumber(user.data.phoneNumber) ? user.data.phoneNumber : null;
    if (!fcmToken && !phoneNumber) {
      continue;
    }
    recipients.push({
      userId: user.id,
      distanceKm,
      language: user.data.language === 'es' ? 'es' : 'en',
      fcmToken,
      phoneNumber,
    });
  }

  recipients.sort((a, b) => a.distanceKm - b.distanceKm);
  return recipients;
}
