'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, ArrowRight, Car, Users, Activity, AlertTriangle, Navigation, Search, Camera, Trash2 } from 'lucide-react';
import { ReportFormData } from '@/lib/types';
import { getCurrentLocation } from '@/lib/utils';
import { geocodeAddress, searchAddressSuggestions } from '@/lib/mapbox';

interface ReportSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ReportFormData, imageFile?: File) => void;
}

export default function ReportSheet({ isOpen, onClose, onSubmit }: ReportSheetProps) {
  const [formData, setFormData] = useState<ReportFormData>({
    vehicleType: 'Van',
    vehicleColor: '',
    personnelCount: 1,
    personnelDescription: '',
    activity: 'Patrolling',
    itemsHeld: '',
  });
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [locationMode, setLocationMode] = useState<'current' | 'manual'>('current');
  const [manualAddress, setManualAddress] = useState('');
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Array<{ id: string; place_name: string; center: [number, number] }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (manualAddress.length >= 3 && locationMode === 'manual' && showSuggestions) {
        const results = await searchAddressSuggestions(manualAddress);
        // Only update if we are still intending to show suggestions (user hasn't selected one yet)
        setSuggestions(results);
      } else {
        setSuggestions([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [manualAddress, locationMode, showSuggestions]);

  const handleManualAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setManualAddress(e.target.value);
    setShowSuggestions(true);
    setGeocodeError(null);
  };

  const handleSuggestionSelect = (suggestion: { place_name: string; center: [number, number] }) => {
    setManualAddress(suggestion.place_name);
    setFormData((prev) => ({ 
      ...prev, 
      location: { lat: suggestion.center[1], lng: suggestion.center[0] } 
    }));
    setSuggestions([]);
    setShowSuggestions(false);
    setGeocodeError(null);
  };

  const fetchCurrentLocation = () => {
    setLoadingLocation(true);
    setGeocodeError(null);
    getCurrentLocation()
      .then((location) => {
        setFormData((prev) => ({ ...prev, location }));
      })
      .catch((error) => {
        console.error('Error getting location:', error);
        setGeocodeError('Could not get current location');
      })
      .finally(() => {
        setLoadingLocation(false);
      });
  };

  const handleAddressSearch = async () => {
    if (!manualAddress.trim()) return;
    
    setIsGeocoding(true);
    setGeocodeError(null);
    
    try {
      const location = await geocodeAddress(manualAddress);
      if (location) {
        setFormData((prev) => ({ ...prev, location }));
      } else {
        setGeocodeError('Address not found in Seattle area');
        setFormData((prev) => ({ ...prev, location: undefined }));
      }
    } catch (error) {
      setGeocodeError('Error searching address');
    } finally {
      setIsGeocoding(false);
    }
  };

  useEffect(() => {
    if (isOpen && locationMode === 'current' && !formData.location) {
      fetchCurrentLocation();
    }
  }, [isOpen, locationMode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.location) {
      alert('Location is required. Please enable location services.');
      return;
    }
    onSubmit(formData, imageFile || undefined);
    onClose();
    // Reset form
    setFormData({
      vehicleType: 'Van',
      vehicleColor: '',
      personnelCount: 1,
      personnelDescription: '',
      activity: 'Patrolling',
      itemsHeld: '',
    });
    setImageFile(null);
    setImagePreview(null);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const vehicleTypes = [
    { value: 'Van', label: 'Van', icon: '🚐' },
    { value: 'SUV', label: 'SUV', icon: '🚙' },
    { value: 'Sedan', label: 'Sedan', icon: '🚗' },
    { value: 'On foot', label: 'On foot', icon: '👣' },
  ];

  const activities = [
    { value: 'Patrolling', label: 'Patrolling' },
    { value: 'Processing', label: 'Processing' },
    { value: 'Stationary', label: 'Stationary' },
    { value: 'Other', label: 'Other' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-[100] backdrop-blur-md"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 30, stiffness: 400 }}
            className="fixed inset-0 z-[101] flex items-center justify-center p-6 pointer-events-none"
          >
            <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl pointer-events-auto overflow-hidden">
              {/* Header with gradient */}
              <div className="bg-gradient-to-r from-red-600 to-red-500 px-8 py-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                      <AlertTriangle className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white">Report ICE Sighting</h2>
                      <p className="text-white/80 text-sm mt-0.5">Help keep your community informed</p>
                    </div>
                  </div>
                  <button 
                    onClick={onClose}
                    className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition-colors backdrop-blur-sm"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>

              {/* Form Content */}
              <div className="px-12 py-10 overflow-y-auto max-h-[calc(90vh-120px)]">
                <form onSubmit={handleSubmit} className="space-y-10">
                  
                  {/* Vehicle Type Selection */}
                  <div>
                    <div className="flex items-center gap-3 mb-5">
                      <Car className="w-5 h-5 text-gray-600" />
                      <label className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Vehicle Type</label>
                    </div>
                    <div className="grid grid-cols-4 gap-4">
                      {vehicleTypes.map((type) => (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => setFormData({ ...formData, vehicleType: type.value as any })}
                          className={`p-4 rounded-2xl border-2 transition-all duration-200 flex flex-col items-center gap-2
                            ${formData.vehicleType === type.value 
                              ? 'border-red-500 bg-red-50 shadow-lg shadow-red-100' 
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
                        >
                          <span className="text-2xl">{type.icon}</span>
                          <span className={`text-sm font-medium ${formData.vehicleType === type.value ? 'text-red-600' : 'text-gray-700'}`}>
                            {type.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Vehicle Color & Personnel Count */}
                  <div className="grid grid-cols-2 gap-8">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">Vehicle Color</label>
                      <input
                        type="text"
                        value={formData.vehicleColor}
                        onChange={(e) => setFormData({ ...formData, vehicleColor: e.target.value })}
                        className="w-full border-2 border-gray-200 rounded-xl px-5 py-4 text-gray-900 text-lg
                                 focus:outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100
                                 transition-all placeholder:text-gray-400"
                        placeholder="e.g., White, Black"
                      />
                    </div>

                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <Users className="w-4 h-4 text-gray-600" />
                        <label className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Personnel Count</label>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, personnelCount: Math.max(1, formData.personnelCount - 1) })}
                          className="w-14 h-14 rounded-xl border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 
                                   flex items-center justify-center text-2xl text-gray-600 transition-all"
                        >
                          −
                        </button>
                        <div className="flex-1 h-14 rounded-xl bg-gray-100 flex items-center justify-center">
                          <span className="text-2xl font-bold text-gray-800">{formData.personnelCount}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, personnelCount: formData.personnelCount + 1 })}
                          className="w-14 h-14 rounded-xl border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 
                                   flex items-center justify-center text-2xl text-gray-600 transition-all"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Activity Selection */}
                  <div>
                    <div className="flex items-center gap-3 mb-5">
                      <Activity className="w-5 h-5 text-gray-600" />
                      <label className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Current Activity</label>
                    </div>
                    <div className="flex flex-wrap gap-4">
                      {activities.map((activity) => (
                        <button
                          key={activity.value}
                          type="button"
                          onClick={() => setFormData({ ...formData, activity: activity.value as any })}
                          className={`px-6 py-3 rounded-full border-2 transition-all duration-200 font-medium
                            ${formData.activity === activity.value 
                              ? 'border-red-500 bg-red-500 text-white shadow-lg shadow-red-200' 
                              : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'}`}
                        >
                          {activity.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">Additional Details</label>
                    <textarea
                      value={formData.personnelDescription}
                      onChange={(e) => setFormData({ ...formData, personnelDescription: e.target.value })}
                      className="w-full border-2 border-gray-200 rounded-xl px-5 py-4 text-gray-900
                               focus:outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100
                               transition-all min-h-[120px] resize-none placeholder:text-gray-400"
                      placeholder="Describe any additional details (uniforms, behavior, direction of travel...)"
                    />
                  </div>

                  {/* Image Upload */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">Photo Evidence (Optional)</label>
                    
                    {!imagePreview ? (
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-200 border-dashed rounded-2xl cursor-pointer hover:bg-gray-50 hover:border-gray-300 transition-all">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <Camera className="w-8 h-8 text-gray-400 mb-2" />
                          <p className="text-sm text-gray-500">Tap to upload photo</p>
                        </div>
                        <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                      </label>
                    ) : (
                      <div className="relative rounded-2xl overflow-hidden h-48 border-2 border-gray-200">
                         {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                        <button 
                          type="button"
                          onClick={removeImage}
                          className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Location Selection */}
                  <div>
                    <div className="flex items-center gap-3 mb-5">
                      <MapPin className="w-5 h-5 text-gray-600" />
                      <label className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Location</label>
                    </div>

                    <div className="bg-gray-50 rounded-2xl p-2 flex mb-4">
                      <button
                        type="button"
                        onClick={() => {
                          setLocationMode('current');
                          if (!formData.location) fetchCurrentLocation();
                        }}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all
                          ${locationMode === 'current' ? 'bg-white shadow-sm text-red-600' : 'text-gray-500 hover:text-gray-700'}`}
                      >
                        <Navigation className="w-4 h-4" />
                        Current Location
                      </button>
                      <button
                        type="button"
                        onClick={() => setLocationMode('manual')}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all
                          ${locationMode === 'manual' ? 'bg-white shadow-sm text-red-600' : 'text-gray-500 hover:text-gray-700'}`}
                      >
                        <Search className="w-4 h-4" />
                        Enter Address
                      </button>
                    </div>

                    {locationMode === 'current' ? (
                      <div className={`rounded-2xl p-5 flex items-center gap-4 border-2 transition-all
                        ${formData.location ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}>
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors
                          ${formData.location ? 'bg-green-500' : 'bg-gray-100'}`}>
                          {loadingLocation ? (
                            <div className="w-6 h-6 border-2 border-green-200 border-t-white rounded-full animate-spin" />
                          ) : (
                            <Navigation className={`w-6 h-6 ${formData.location ? 'text-white' : 'text-gray-400'}`} />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className={`text-xs font-semibold uppercase tracking-wide mb-1
                            ${formData.location ? 'text-green-700' : 'text-gray-500'}`}>
                            {loadingLocation ? 'Acquiring Signal...' : formData.location ? 'Location Locked' : 'Waiting for location'}
                          </div>
                          {formData.location ? (
                            <div className="text-green-800 font-mono text-sm">
                              {formData.location.lat.toFixed(6)}, {formData.location.lng.toFixed(6)}
                            </div>
                          ) : (
                            <button 
                              type="button"
                              onClick={fetchCurrentLocation}
                              className="text-sm text-red-600 hover:text-red-700 font-medium underline decoration-red-200 underline-offset-2"
                            >
                              Retry GPS
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="relative">
                          <input
                            type="text"
                            value={manualAddress}
                            onChange={handleManualAddressChange}
                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddressSearch())}
                            onFocus={() => {
                              if (manualAddress.length >= 3) setShowSuggestions(true);
                            }}
                            onBlur={() => {
                              // Delay hiding to allow click event to fire
                              setTimeout(() => setShowSuggestions(false), 200);
                            }}
                            placeholder="Enter street address or intersection..."
                            className="w-full border-2 border-gray-200 rounded-xl pl-5 pr-12 py-4 text-gray-900
                                     focus:outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100
                                     transition-all placeholder:text-gray-400"
                          />
                          <button
                            type="button"
                            onClick={handleAddressSearch}
                            disabled={isGeocoding || !manualAddress}
                            className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center
                                     bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 transition-colors
                                     disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isGeocoding ? (
                              <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <ArrowRight className="w-4 h-4" />
                            )}
                          </button>

                          {/* Suggestions Dropdown */}
                          <AnimatePresence>
                            {showSuggestions && suggestions.length > 0 && (
                              <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden max-h-60 overflow-y-auto"
                              >
                                {suggestions.map((suggestion) => (
                                  <button
                                    key={suggestion.id}
                                    type="button"
                                    onClick={() => handleSuggestionSelect(suggestion)}
                                    className="w-full text-left px-5 py-3 hover:bg-gray-50 flex items-center gap-3 transition-colors border-b border-gray-100 last:border-0"
                                  >
                                    <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                                    <span className="text-sm text-gray-700 truncate">{suggestion.place_name}</span>
                                  </button>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                        
                        {(geocodeError || (formData.location && !showSuggestions)) && (
                          <div className={`text-sm px-4 py-3 rounded-xl flex items-center gap-2
                            ${geocodeError ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                            {geocodeError ? (
                                <>
                                  <AlertTriangle className="w-4 h-4" />
                                  {geocodeError}
                                </>
                            ) : (
                              <>
                                <MapPin className="w-4 h-4" />
                                Location found: {formData.location?.lat.toFixed(4)}, {formData.location?.lng.toFixed(4)}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={!formData.location || loadingLocation}
                    className="w-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 
                             text-white py-5 rounded-2xl transition-all duration-200 font-bold text-lg
                             disabled:opacity-50 disabled:cursor-not-allowed 
                             flex items-center justify-center gap-3 group
                             shadow-xl shadow-red-200 hover:shadow-red-300"
                  >
                    <span>Submit Report</span>
                    <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                  </button>
                </form>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
