'use client';

import { useState, useEffect, useCallback } from 'react';
import { collection, addDoc, onSnapshot, query, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { IceSighting, ReportFormData } from '@/lib/types';
import { isExpired } from '@/lib/utils';
import { Sidebar } from '@/components/UI/Sidebar';
import MapView from '@/components/Map/MapView';
import ReportButton from '@/components/Report/ReportButton';
import ReportSheet from '@/components/Report/ReportSheet';

export default function HomePage() {
  const [sightings, setSightings] = useState<IceSighting[]>([]);
  const [isReportSheetOpen, setIsReportSheetOpen] = useState(false);
  const [selectedSighting, setSelectedSighting] = useState<IceSighting | null>(null);

  const handleSightingSelect = useCallback((sighting: IceSighting) => {
    setSelectedSighting(sighting);
  }, []);

  const handleBackToMap = useCallback(() => {
    setSelectedSighting(null);
  }, []);

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

  return (
    <main className="relative w-screen h-screen overflow-hidden">
      <Sidebar 
        sightings={sightings} 
        onSightingClick={handleSightingSelect}
        selectedSighting={selectedSighting}
        onBack={handleBackToMap}
      >
        {/* Mapbox Background */}
        <div className="absolute inset-0 z-0">
          <MapView 
            sightings={sightings} 
            onMarkerClick={handleSightingSelect}
            selectedSighting={selectedSighting}
          />
        </div>

        {/* Overlay layer: UI elements on top of map */}
        <div className="absolute inset-0 z-[101] pointer-events-none [&>*]:pointer-events-auto">
          <ReportButton onClick={() => setIsReportSheetOpen(true)} />
          <ReportSheet
            isOpen={isReportSheetOpen}
            onClose={() => setIsReportSheetOpen(false)}
            onSubmit={handleReportSubmit}
          />
        </div>
      </Sidebar>
    </main>
  );
}

