// Type definitions for the ICE Sighting Tracker

export interface IceSighting {
  id: string;
  timestamp: number;
  location: {
    lat: number;
    lng: number;
  };
  vehicle: {
    type: 'Van' | 'SUV' | 'Sedan' | 'Unmarked';
    color: string;
    marked: boolean;
  };
  personnel: {
    count: number;
    description: string;
  };
  behavior: {
    activity: 'Patrolling' | 'Processing' | 'Stationary' | 'Other';
    itemsHeld: string;
  };
  imageUrl?: string;
  upvotes: number;
  downvotes: number;
}

export interface ReportFormData {
  vehicleType: 'Van' | 'SUV' | 'Sedan' | 'Unmarked';
  vehicleColor: string;
  vehicleMarked: boolean;
  personnelCount: number;
  personnelDescription: string;
  activity: 'Patrolling' | 'Processing' | 'Stationary' | 'Other';
  itemsHeld: string;
  location?: {
    lat: number;
    lng: number;
  };
  imageUrl?: string;
}
