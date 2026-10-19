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

    const options = {
      enableHighAccuracy: true,
      timeout: 10000, // Increased to 10 seconds
      maximumAge: 0,
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        // If high accuracy fails or times out, try one more time without high accuracy
        if (error.code === error.TIMEOUT || error.code === error.POSITION_UNAVAILABLE) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              resolve({
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
              });
            },
            (err) => reject(err),
            { ...options, enableHighAccuracy: false, timeout: 5000 }
          );
        } else {
          reject(error);
        }
      },
      options
    );
  });
}

/**
 * Convert hex color to RGBA
 */
export function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Calculate distance between two coordinates in kilometers (Haversine
 * formula). The implementation lives in ./geo so the client and the
 * alerts API route share a single copy; it is re-exported here to keep
 * the existing import path working.
 */
export { calculateDistance } from './geo';
