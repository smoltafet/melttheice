'use client';

import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { IceSighting } from '@/lib/types';
import { calculateOpacity } from '@/lib/utils';
import { MAPBOX_TOKEN, DEFAULT_MAP_CONFIG, PING_RADIUS_METERS } from '@/lib/mapbox';

// Set Mapbox access token
mapboxgl.accessToken = MAPBOX_TOKEN;

interface MapViewProps {
  sightings: IceSighting[];
  onMarkerClick: (sighting: IceSighting) => void;
}

export default function MapView({ sightings, onMarkerClick }: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<Map<string, mapboxgl.Marker>>(new Map());

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: DEFAULT_MAP_CONFIG.style,
      center: DEFAULT_MAP_CONFIG.center,
      zoom: DEFAULT_MAP_CONFIG.zoom,
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

    return () => {
      map.current?.remove();
    };
  }, []);

  // Update markers when sightings change
  useEffect(() => {
    if (!map.current) return;

    // Remove markers that no longer exist
    markers.current.forEach((marker, id) => {
      if (!sightings.find((s) => s.id === id)) {
        marker.remove();
        markers.current.delete(id);
      }
    });

    // Add or update markers
    sightings.forEach((sighting) => {
      const opacity = calculateOpacity(sighting.timestamp);

      if (markers.current.has(sighting.id)) {
        // Update existing marker opacity
        const existingMarker = markers.current.get(sighting.id);
        const el = existingMarker?.getElement();
        if (el) {
          const pulseCircle = el.querySelector('.pulse-circle') as HTMLElement;
          if (pulseCircle) {
            pulseCircle.style.opacity = opacity.toString();
          }
        }
      } else {
        // Create new marker
        const el = createMarkerElement(opacity);

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([sighting.location.lng, sighting.location.lat])
          .addTo(map.current!);

        el.addEventListener('click', () => {
          onMarkerClick(sighting);
        });

        markers.current.set(sighting.id, marker);
      }
    });
  }, [sightings, onMarkerClick]);

  return (
    <div ref={mapContainer} className="absolute inset-0 w-full h-full z-0" />
  );
}

// Create custom marker element with white dot and pulsing red circle
function createMarkerElement(opacity: number): HTMLElement {
  const el = document.createElement('div');
  el.className = 'custom-marker';
  el.style.width = '120px';
  el.style.height = '120px';
  el.style.position = 'relative';
  el.style.cursor = 'pointer';

  // Pulsing red danger zone (500m radius visual representation)
  const pulseCircle = document.createElement('div');
  pulseCircle.className = 'pulse-circle pulse-danger';
  pulseCircle.style.position = 'absolute';
  pulseCircle.style.top = '50%';
  pulseCircle.style.left = '50%';
  pulseCircle.style.transform = 'translate(-50%, -50%)';
  pulseCircle.style.width = '100px';
  pulseCircle.style.height = '100px';
  pulseCircle.style.borderRadius = '50%';
  pulseCircle.style.backgroundColor = 'rgba(255, 59, 48, 0.3)';
  pulseCircle.style.border = '2px solid rgba(255, 59, 48, 0.6)';
  pulseCircle.style.opacity = opacity.toString();

  // White center dot
  const centerDot = document.createElement('div');
  centerDot.style.position = 'absolute';
  centerDot.style.top = '50%';
  centerDot.style.left = '50%';
  centerDot.style.transform = 'translate(-50%, -50%)';
  centerDot.style.width = '12px';
  centerDot.style.height = '12px';
  centerDot.style.borderRadius = '50%';
  centerDot.style.backgroundColor = '#ffffff';
  centerDot.style.border = '2px solid rgba(255, 59, 48, 0.8)';
  centerDot.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)';
  centerDot.style.zIndex = '10';

  el.appendChild(pulseCircle);
  el.appendChild(centerDot);

  return el;
}

// Helper to center map on a specific sighting
export function centerMapOnSighting(
  map: mapboxgl.Map | null,
  sighting: IceSighting,
  zoom: number = 14
) {
  if (!map) return;
  map.flyTo({
    center: [sighting.location.lng, sighting.location.lat],
    zoom,
    duration: 1000,
  });
}
