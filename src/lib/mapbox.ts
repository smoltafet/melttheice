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
export const PING_RADIUS_METERS = 150;

// Maximum age for sightings (4 hours in milliseconds)
export const MAX_SIGHTING_AGE_MS = 4 * 60 * 60 * 1000;

/**
 * Geocode an address using Mapbox Geocoding API
 */
export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const encodedAddress = encodeURIComponent(address);
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?access_token=${MAPBOX_TOKEN}&bbox=${SEATTLE_METRO_BOUNDS[0][0]},${SEATTLE_METRO_BOUNDS[0][1]},${SEATTLE_METRO_BOUNDS[1][0]},${SEATTLE_METRO_BOUNDS[1][1]}&limit=1`
    );
    
    if (!response.ok) {
      throw new Error('Geocoding failed');
    }

    const data = await response.json();
    if (data.features && data.features.length > 0) {
      const [lng, lat] = data.features[0].center;
      return { lat, lng };
    }
    return null;
    return null;
  } catch (error) {
    console.error('Error geocoding address:', error);
    return null;
  }
}

/**
 * Search for address suggestions
 */
export async function searchAddressSuggestions(query: string): Promise<Array<{ id: string; place_name: string; center: [number, number] }>> {
  if (!query || query.length < 3) return [];
  
  try {
    const encodedQuery = encodeURIComponent(query);
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedQuery}.json?access_token=${MAPBOX_TOKEN}&bbox=${SEATTLE_METRO_BOUNDS[0][0]},${SEATTLE_METRO_BOUNDS[0][1]},${SEATTLE_METRO_BOUNDS[1][0]},${SEATTLE_METRO_BOUNDS[1][1]}&limit=5`
    );
    
    if (!response.ok) return [];

    const data = await response.json();
    return data.features || [];
  } catch (error) {
    console.error('Error searching address suggestions:', error);
    return [];
  }
}
