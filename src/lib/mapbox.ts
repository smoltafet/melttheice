// Mapbox configuration

export const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

// Seattle Metro area default center
export const SEATTLE_CENTER: [number, number] = [-122.3321, 47.6062];

export const DEFAULT_MAP_CONFIG = {
  center: SEATTLE_CENTER,
  zoom: 11,
  style: 'mapbox://styles/mapbox/streets-v12', // You can customize this to match the screenshot
};

// Ping radius in meters
export const PING_RADIUS_METERS = 500;

// Maximum age for sightings (4 hours in milliseconds)
export const MAX_SIGHTING_AGE_MS = 4 * 60 * 60 * 1000;
