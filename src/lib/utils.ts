import { formatDistanceToNow } from 'date-fns';
import { MAX_SIGHTING_AGE_MS } from './mapbox';

/**
 * Calculate opacity based on sighting age (0-4 hours)
 * Newer sightings are more opaque
 */
export function calculateOpacity(timestamp: number): number {
  const now = Date.now();
  const age = now - timestamp;
  
  // If older than max age, return 0
  if (age > MAX_SIGHTING_AGE_MS) {
    return 0;
  }
  
  // Linear decay from 1.0 to 0.3 over 4 hours
  const ratio = age / MAX_SIGHTING_AGE_MS;
  return 1.0 - (ratio * 0.7); // Decays from 1.0 to 0.3
}

/**
 * Check if a sighting has expired (older than 4 hours)
 */
export function isExpired(timestamp: number): boolean {
  const now = Date.now();
  const age = now - timestamp;
  return age > MAX_SIGHTING_AGE_MS;
}

/**
 * Format timestamp to human-readable time
 */
export function formatTimestamp(timestamp: number): string {
  try {
    return formatDistanceToNow(timestamp, { addSuffix: true });
  } catch (error) {
    return 'Unknown time';
  }
}

/**
 * Get current user location using Geolocation API
 */
export function getCurrentLocation(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      }
    );
  });
}
