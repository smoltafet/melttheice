// Type definitions for the ICE Sighting Tracker

export interface IceSighting {
  id: string;
  timestamp: number;
  location: {
    lat: number;
    lng: number;
  };
  vehicle: {
    type: 'Van' | 'SUV' | 'Sedan' | 'On foot';
    color: string;
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
  verification?: {
    stillThere: number;
    notThere: number;
  };
  updates?: {
    text: string;
    timestamp: number;
  }[];
}

export interface ReportFormData {
  vehicleType: 'Van' | 'SUV' | 'Sedan' | 'On foot';
  vehicleColor: string;
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
