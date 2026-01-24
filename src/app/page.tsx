'use client';

import { useState, useEffect, useCallback } from 'react';
import { collection, addDoc, onSnapshot, query, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { IceSighting, ReportFormData } from '@/lib/types';
import { isExpired } from '@/lib/utils';
import MapView from '@/components/Map/MapView';
import SightingsSidebar from '@/components/Sidebar/SightingsSidebar';
import ReportButton from '@/components/Report/ReportButton';
import ReportSheet from '@/components/Report/ReportSheet';
import SightingDetailSheet from '@/components/Details/SightingDetailSheet';

export default function HomePage() {
  const [sightings, setSightings] = useState<IceSighting[]>([]);
  const [isReportSheetOpen, setIsReportSheetOpen] = useState(false);
  const [selectedSighting, setSelectedSighting] = useState<IceSighting | null>(null);

  // Subscribe to real-time sightings from Firebase
  useEffect(() => {
    const q = query(collection(db, 'sightings'), orderBy('timestamp', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const allSightings: IceSighting[] = [];

        snapshot.forEach((doc) => {
          const data = doc.data();
          const sighting: IceSighting = {
            id: doc.id,
            timestamp: data.timestamp,
            location: data.location,
            vehicle: data.vehicle,
            personnel: data.personnel,
            behavior: data.behavior,
          };

          // Filter out expired sightings (older than 4 hours)
          if (!isExpired(sighting.timestamp)) {
            allSightings.push(sighting);
          }
        });

        setSightings(allSightings);
      },
      (error) => {
        console.error('Error fetching sightings:', error);
      }
    );

    return () => unsubscribe();
  }, []);

  // Handle sighting report submission
  const handleReportSubmit = useCallback(async (data: ReportFormData) => {
    if (!data.location) {
      alert('Location is required');
      return;
    }

    try {
      await addDoc(collection(db, 'sightings'), {
        timestamp: Date.now(),
        location: data.location,
        vehicle: {
          type: data.vehicleType,
          color: data.vehicleColor,
        },
        personnel: {
          count: data.personnelCount,
          description: data.personnelDescription,
        },
        behavior: {
          activity: data.activity,
          itemsHeld: data.itemsHeld,
        },
      });

      console.log('Sighting reported successfully');
    } catch (error) {
      console.error('Error reporting sighting:', error);
      alert('Failed to submit report. Please try again.');
    }
  }, []);

  // Handle sidebar sighting click - would center map on sighting
  const handleSightingClick = useCallback((sighting: IceSighting) => {
    setSelectedSighting(sighting);
    // TODO: Center map on sighting
  }, []);

  // Handle map marker click
  const handleMarkerClick = useCallback((sighting: IceSighting) => {
    setSelectedSighting(sighting);
  }, []);

  return (
    <main className="relative w-screen h-screen overflow-hidden">
      {/* Mapbox Background */}
      <MapView sightings={sightings} onMarkerClick={handleMarkerClick} />

      {/* Sidebar */}
      <SightingsSidebar
        sightings={sightings}
        onSightingClick={handleSightingClick}
      />

      {/* Report Button */}
      <ReportButton onClick={() => setIsReportSheetOpen(true)} />

      {/* Report Sheet */}
      <ReportSheet
        isOpen={isReportSheetOpen}
        onClose={() => setIsReportSheetOpen(false)}
        onSubmit={handleReportSubmit}
      />

      {/* Detail Sheet */}
      <SightingDetailSheet
        sighting={selectedSighting}
        onClose={() => setSelectedSighting(null)}
      />
    </main>
  );
}
