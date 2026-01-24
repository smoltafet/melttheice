'use client';

import { useEffect, useRef, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import { IceSighting } from '@/lib/types';
import { calculateOpacity } from '@/lib/utils';
import { MAPBOX_TOKEN, DEFAULT_MAP_CONFIG, PING_RADIUS_METERS, SEATTLE_METRO_BOUNDS } from '@/lib/mapbox';

// Set Mapbox access token
mapboxgl.accessToken = MAPBOX_TOKEN;

interface MapViewProps {
  sightings: IceSighting[];
  onMarkerClick: (sighting: IceSighting) => void;
  selectedSighting?: IceSighting | null;
}

// Convert meters to pixels at a given latitude and zoom level
function metersToPixelsAtMaxZoom(meters: number, latitude: number): number {
  return meters / 0.075 / Math.cos((latitude * Math.PI) / 180);
}

export default function MapView({ sightings, onMarkerClick, selectedSighting }: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());

  // Fly to selected sighting
  useEffect(() => {
    if (map.current && selectedSighting) {
      map.current.flyTo({
        center: [selectedSighting.location.lng, selectedSighting.location.lat],
        zoom: 14,
        essential: true,
        duration: 2000
      });
    }
  }, [selectedSighting]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: DEFAULT_MAP_CONFIG.style,
      center: DEFAULT_MAP_CONFIG.center,
      zoom: DEFAULT_MAP_CONFIG.zoom,
      minZoom: DEFAULT_MAP_CONFIG.minZoom,
      maxZoom: DEFAULT_MAP_CONFIG.maxZoom,
      maxBounds: SEATTLE_METRO_BOUNDS,
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Add geolocate control
    map.current.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true,
        },
        trackUserLocation: true,
        showUserHeading: true,
      }),
      'top-right'
    );

    // Add sources and layers for radius circles when map loads
    map.current.on('load', () => {
      if (!map.current) return;

      // Add empty source for sightings
      map.current.addSource('sightings-radius', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [],
        },
      });

      // Add radius circle layer (pulsing effect handled by opacity)
      map.current.addLayer({
        id: 'sightings-radius-fill',
        type: 'circle',
        source: 'sightings-radius',
        paint: {
          'circle-radius': [
            'interpolate',
            ['exponential', 2],
            ['zoom'],
            10, metersToPixelsAtMaxZoom(PING_RADIUS_METERS, 47.6) / Math.pow(2, 18 - 10),
            18, metersToPixelsAtMaxZoom(PING_RADIUS_METERS, 47.6),
          ],
          'circle-color': 'rgba(255, 59, 48, 0.4)',
          'circle-stroke-color': 'rgba(255, 59, 48, 0.8)',
          'circle-stroke-width': 2,
          'circle-opacity': ['get', 'opacity'],
        },
      });

      // Add source for center markers
      map.current.addSource('sightings-centers', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [],
        },
      });

      // Add center dot layer
      map.current.addLayer({
        id: 'sightings-centers-dot',
        type: 'circle',
        source: 'sightings-centers',
        paint: {
          'circle-radius': 6,
          'circle-color': '#FF3B30',
          'circle-stroke-color': '#FFFFFF',
          'circle-stroke-width': 2,
        },
      });

      // Add click handler for center dots
      map.current.on('click', 'sightings-centers-dot', (e) => {
        if (e.features && e.features.length > 0) {
          const feature = e.features[0];
          const sightingId = feature.properties?.id;
          const sighting = sightings.find((s) => s.id === sightingId);
          if (sighting) {
            onMarkerClick(sighting);
          }
        }
      });

      // Change cursor on hover
      map.current.on('mouseenter', 'sightings-centers-dot', () => {
        if (map.current) map.current.getCanvas().style.cursor = 'pointer';
      });

      map.current.on('mouseleave', 'sightings-centers-dot', () => {
        if (map.current) map.current.getCanvas().style.cursor = '';
      });
    });

    return () => {
      map.current?.remove();
    };
  }, []);

  // Update GeoJSON sources when sightings change
  useEffect(() => {
    if (!map.current) return;

    const updateSources = () => {
      if (!map.current?.isStyleLoaded()) return;

      const radiusSource = map.current.getSource('sightings-radius') as mapboxgl.GeoJSONSource;
      const centersSource = map.current.getSource('sightings-centers') as mapboxgl.GeoJSONSource;

      if (!radiusSource || !centersSource) return;

      // Create GeoJSON features for radius circles
      const radiusFeatures = sightings.map((sighting) => ({
        type: 'Feature' as const,
        properties: {
          id: sighting.id,
          opacity: calculateOpacity(sighting.timestamp),
        },
        geometry: {
          type: 'Point' as const,
          coordinates: [sighting.location.lng, sighting.location.lat],
        },
      }));

      // Create GeoJSON features for center dots
      const centerFeatures = sightings.map((sighting) => ({
        type: 'Feature' as const,
        properties: {
          id: sighting.id,
        },
        geometry: {
          type: 'Point' as const,
          coordinates: [sighting.location.lng, sighting.location.lat],
        },
      }));

      radiusSource.setData({
        type: 'FeatureCollection',
        features: radiusFeatures,
      });

      centersSource.setData({
        type: 'FeatureCollection',
        features: centerFeatures,
      });
    };

    // Update immediately if style is loaded, otherwise wait for it
    if (map.current.isStyleLoaded()) {
      updateSources();
    } else {
      map.current.once('load', updateSources);
    }
  }, [sightings]);

  // Update click handler when sightings change
  useEffect(() => {
    if (!map.current) return;

    const handleClick = (e: mapboxgl.MapMouseEvent & { features?: mapboxgl.MapboxGeoJSONFeature[] }) => {
      if (e.features && e.features.length > 0) {
        const feature = e.features[0];
        const sightingId = feature.properties?.id;
        const sighting = sightings.find((s) => s.id === sightingId);
        if (sighting) {
          onMarkerClick(sighting);
        }
      }
    };

    map.current.off('click', 'sightings-centers-dot', handleClick);
    map.current.on('click', 'sightings-centers-dot', handleClick);
  }, [sightings, onMarkerClick]);

  return (
    <div ref={mapContainer} className="absolute inset-0 w-full h-full z-0" />
  );
}

// Helper to center map on a specific sighting
export function centerMapOnSighting(
  mapInstance: mapboxgl.Map | null,
  sighting: IceSighting,
  zoom: number = 14
) {
  if (!mapInstance) return;
  mapInstance.flyTo({
    center: [sighting.location.lng, sighting.location.lat],
    zoom,
    duration: 1000,
  });
}
