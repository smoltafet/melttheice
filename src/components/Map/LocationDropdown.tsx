'use client';

import { useState } from 'react';
import { MapPin, ChevronDown } from 'lucide-react';

export interface Location {
  name: string;
  coordinates: [number, number]; // [lng, lat]
  zoom?: number;
}

export const SEATTLE_LOCATIONS: Location[] = [
  { name: 'Seattle Overview', coordinates: [-122.3321, 47.6062], zoom: 10 },
  { name: 'University District', coordinates: [-122.3133, 47.6610], zoom: 14 },
  { name: 'South Park', coordinates: [-122.3230, 47.5263], zoom: 14},
  { name: 'Burien', coordinates: [-122.3489, 47.4693], zoom: 14 },
  { name: 'Renton', coordinates: [-122.2028, 47.4798], zoom: 14 },
  { name: 'Bellevue', coordinates: [-122.1920, 47.6141], zoom: 13 },
  { name: 'Capitol Hill', coordinates: [-122.3189, 47.6240], zoom: 14 },
  { name: 'Ballard', coordinates: [-122.3862, 47.6765], zoom: 14 },
  { name: 'West Seattle', coordinates: [-122.3867, 47.5704], zoom: 13 },
];

interface LocationDropdownProps {
  onLocationSelect: (location: Location) => void;
}

export default function LocationDropdown({ onLocationSelect }: LocationDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Location>(SEATTLE_LOCATIONS[0]);

  const handleSelect = (location: Location) => {
    setSelectedLocation(location);
    setIsOpen(false);
    onLocationSelect(location);
  };

  return (
    <div className="relative">
      {/* Dropdown Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-5 py-3 bg-white/95 hover:bg-white 
                   border-2 border-gray-200 rounded-xl shadow-lg
                   transition-all duration-200 min-w-[240px]
                   backdrop-blur-sm hover:shadow-xl"
      >
        <MapPin className="w-5 h-5 text-red-600" />
        <span className="flex-1 text-left font-medium text-gray-800">
          {selectedLocation.name}
        </span>
        <ChevronDown 
          className={`w-5 h-5 text-gray-600 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`} 
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menu */}
          <div className="absolute top-full mt-2 left-0 right-0 bg-white rounded-xl shadow-2xl 
                          border-2 border-gray-200 overflow-hidden z-50 backdrop-blur-sm">
            <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
              {SEATTLE_LOCATIONS.map((location, index) => (
                <button
                  key={index}
                  onClick={() => handleSelect(location)}
                  className={`w-full px-5 py-3 text-left hover:bg-red-50 
                            transition-colors duration-150 flex items-center gap-3
                            ${selectedLocation.name === location.name ? 'bg-red-50 text-red-700 font-semibold' : 'text-gray-700'}`}
                >
                  <MapPin className={`w-4 h-4 ${
                    selectedLocation.name === location.name ? 'text-red-600' : 'text-gray-400'
                  }`} />
                  <span>{location.name}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

