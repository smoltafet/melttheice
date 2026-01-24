// Mapbox configuration

export const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

// Seattle Metro area default center
export const SEATTLE_CENTER: [number, number] = [-122.3321, 47.6062];

// Seattle Metro area bounding box (SW corner to NE corner)
// Tighter bounds focused on core Seattle area
export const SEATTLE_METRO_BOUNDS: [[number, number], [number, number]] = [
  [-122.45, 47.48], // Southwest corner (near Renton/SeaTac)
  [-122.20, 47.72]  // Northeast corner (near Shoreline/Bellevue)
];

export const DEFAULT_MAP_CONFIG = {
  center: SEATTLE_CENTER,
  zoom: 11,
  minZoom: 10,  // Can't zoom out past metro area
  maxZoom: 18, // Maximum zoom in
  style: 'mapbox://styles/mapbox/streets-v12',
};

// Ping radius in meters (1/3 mile = ~536 meters)
export const PING_RADIUS_METERS = 536;

// Maximum age for sightings (4 hours in milliseconds)
export const MAX_SIGHTING_AGE_MS = 4 * 60 * 60 * 1000;
