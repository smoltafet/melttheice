'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, ArrowRight, Car, Users, Activity, AlertTriangle } from 'lucide-react';
import { ReportFormData } from '@/lib/types';
import { getCurrentLocation } from '@/lib/utils';

interface ReportSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ReportFormData) => void;
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

  useEffect(() => {
    if (isOpen && !formData.location) {
      setLoadingLocation(true);
      getCurrentLocation()
        .then((location) => {
          setFormData((prev) => ({ ...prev, location }));
        })
        .catch((error) => {
          console.error('Error getting location:', error);
        })
        .finally(() => {
          setLoadingLocation(false);
        });
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.location) {
      alert('Location is required. Please enable location services.');
      return;
    }
    onSubmit(formData);
    onClose();
    setFormData({
      vehicleType: 'Van',
      vehicleColor: '',
      personnelCount: 1,
      personnelDescription: '',
      activity: 'Patrolling',
      itemsHeld: '',
    });
  };

  const vehicleTypes = [
    { value: 'Van', label: 'Van', icon: '🚐' },
    { value: 'SUV', label: 'SUV', icon: '🚙' },
    { value: 'Sedan', label: 'Sedan', icon: '🚗' },
    { value: 'Unmarked', label: 'Unmarked', icon: '🚘' },
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

                  {/* Location Status */}
                  <div className={`rounded-2xl p-5 flex items-center gap-4 ${formData.location ? 'bg-green-50 border-2 border-green-200' : 'bg-amber-50 border-2 border-amber-200'}`}>
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${formData.location ? 'bg-green-500' : 'bg-amber-500'}`}>
                      <MapPin className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className={`text-xs font-semibold uppercase tracking-wide ${formData.location ? 'text-green-700' : 'text-amber-700'}`}>
                        {loadingLocation ? 'Acquiring Location...' : formData.location ? 'Location Captured' : 'Location Required'}
                      </div>
                      {formData.location && (
                        <div className="text-green-800 font-mono text-sm mt-1">
                          {formData.location.lat.toFixed(6)}, {formData.location.lng.toFixed(6)}
                        </div>
                      )}
                    </div>
                    {loadingLocation && (
                      <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
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
