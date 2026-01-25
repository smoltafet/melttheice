'use client';

import { useState, useEffect, useCallback } from 'react';
import { collection, addDoc, onSnapshot, query, orderBy, Timestamp, doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { IceSighting, ReportFormData } from '@/lib/types';
import { isExpired } from '@/lib/utils';
import { Sidebar } from '@/components/UI/Sidebar';
import MapView from '@/components/Map/MapView';
import ReportButton from '@/components/Report/ReportButton';
import ReportSheet from '@/components/Report/ReportSheet';
import LocationDropdown, { Location } from '@/components/Map/LocationDropdown';

export default function HomePage() {
  const [sightings, setSightings] = useState<IceSighting[]>([]);
  const [isReportSheetOpen, setIsReportSheetOpen] = useState(false);
  const [selectedSighting, setSelectedSighting] = useState<IceSighting | null>(null);
  const [viewLocation, setViewLocation] = useState<Location | null>(null);

  const handleSightingSelect = useCallback((sighting: IceSighting) => {
    setSelectedSighting(sighting);
  }, []);

  const handleBackToMap = useCallback(() => {
    setSelectedSighting(null);
  }, []);

  const handleLocationSelect = useCallback((location: Location) => {
    setViewLocation(location);
    setSelectedSighting(null); // Clear selected sighting when moving to a new area
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
            imageUrl: data.imageUrl,
            upvotes: data.upvotes || 0,
            downvotes: data.downvotes || 0,
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
  const handleReportSubmit = useCallback(async (data: ReportFormData, imageFile?: File) => {
    if (!data.location) {
      alert('Location is required');
      return;
    }

    try {
      // Generate a specific ID for the report
      const reportId = crypto.randomUUID();
      const sightingRef = doc(db, 'sightings', reportId);
      
      let imageUrl = null;

      // Upload image if provided
      if (imageFile) {
        try {
           const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
           const { storage } = await import('@/lib/firebase');
           
           const storageRef = ref(storage, `sightings/${reportId}/${imageFile.name}`);
           const snapshot = await uploadBytes(storageRef, imageFile);
           imageUrl = await getDownloadURL(snapshot.ref);
        } catch (uploadError) {
          console.error('Error uploading image:', uploadError);
          // Continue submission even if image upload fails, but maybe alert user?
          // For now we just log it and continue without image
        }
      }

      await setDoc(sightingRef, {
        id: reportId,
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
        imageUrl: imageUrl || undefined,
        upvotes: 0,
        downvotes: 0,
      });

      console.log('Sighting reported successfully');

      // Trigger alerts via API
      console.log('🚨 Triggering proximity alerts...');
      fetch('/api/send-alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sighting: { 
            location: data.location,
            vehicle: { type: data.vehicleType, color: data.vehicleColor }
          } 
        }),
      })
        .then(async (response) => {
          const result = await response.json();
          console.log('✅ Alert API response:', result);
          if (result.smsAttempts > 0) {
            console.log(`📱 ${result.smsAttempts} SMS alert(s) sent`);
          }
          if (result.fcmAttempts > 0) {
            console.log(`📲 ${result.fcmAttempts} push notification(s) sent`);
          }
        })
        .catch(err => {
          console.error('❌ Error triggering alerts:', err);
        });

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
            viewLocation={viewLocation}
          />
        </div>

        {/* Overlay layer: UI elements on top of map */}
        <div className="absolute inset-0 z-[101] pointer-events-none [&>*]:pointer-events-auto">
          {/* Location Dropdown - Top Right */}
          <div className="absolute top-6 right-6">
            <LocationDropdown onLocationSelect={handleLocationSelect} />
          </div>

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

