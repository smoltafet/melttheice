'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ReportFormData } from '@/lib/types';
import { getCurrentLocation } from '@/lib/utils';
import GlassmorphicCard from '../UI/GlassmorphicCard';

interface ReportSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ReportFormData) => void;
}

export default function ReportSheet({ isOpen, onClose, onSubmit }: ReportSheetProps) {
  const [formData, setFormData] = useState<ReportFormData>({
    vehicleType: 'Van',
    vehicleColor: '#FFFFFF',
    personnelCount: 1,
    personnelDescription: '',
    activity: 'Patrolling',
    itemsHeld: '',
  });
  const [loadingLocation, setLoadingLocation] = useState(false);

  // Auto-get location when sheet opens
  useEffect(() => {
    if (isOpen && !formData.location) {
      setLoadingLocation(true);
      getCurrentLocation()
        .then((location) => {
          setFormData((prev) => ({ ...prev, location }));
        })
        .catch((error) => {
          console.error('Error getting location:', error);
          alert('Please enable location services to report a sighting');
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
    // Reset form
    setFormData({
      vehicleType: 'Van',
      vehicleColor: '#FFFFFF',
      personnelCount: 1,
      personnelDescription: '',
      activity: 'Patrolling',
      itemsHeld: '',
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-40"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 max-h-[85vh] overflow-hidden"
          >
            <GlassmorphicCard className="rounded-t-3xl rounded-b-none p-6 max-w-2xl mx-auto">
              {/* Handle bar */}
              <div className="w-12 h-1 bg-white/30 rounded-full mx-auto mb-6" />

              <h2 className="text-2xl font-bold mb-6">Report ICE Sighting</h2>

              <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto max-h-[calc(85vh-8rem)] custom-scrollbar pr-2">
                {/* Vehicle Section */}
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-white/90">Vehicle Information</h3>
                  
                  <div>
                    <label className="block text-sm text-white/70 mb-2">Vehicle Type</label>
                    <select
                      value={formData.vehicleType}
                      onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value as any })}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white
                               focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <option value="Van">Van</option>
                      <option value="SUV">SUV</option>
                      <option value="Sedan">Sedan</option>
                      <option value="Unmarked">Unmarked</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-white/70 mb-2">Vehicle Color</label>
                    <div className="flex gap-3">
                      <input
                        type="color"
                        value={formData.vehicleColor}
                        onChange={(e) => setFormData({ ...formData, vehicleColor: e.target.value })}
                        className="w-16 h-12 rounded-lg cursor-pointer bg-transparent"
                      />
                      <input
                        type="text"
                        value={formData.vehicleColor}
                        onChange={(e) => setFormData({ ...formData, vehicleColor: e.target.value })}
                        className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white
                                 focus:outline-none focus:ring-2 focus:ring-red-500"
                        placeholder="#FFFFFF"
                      />
                    </div>
                  </div>
                </div>

                {/* Personnel Section */}
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-white/90">Personnel Information</h3>
                  
                  <div>
                    <label className="block text-sm text-white/70 mb-2">Number of People</label>
                    <input
                      type="number"
                      min="1"
                      value={formData.personnelCount}
                      onChange={(e) => setFormData({ ...formData, personnelCount: parseInt(e.target.value) })}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white
                               focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-white/70 mb-2">Description (clothing, uniforms, etc.)</label>
                    <textarea
                      value={formData.personnelDescription}
                      onChange={(e) => setFormData({ ...formData, personnelDescription: e.target.value })}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white
                               focus:outline-none focus:ring-2 focus:ring-red-500 min-h-[80px]"
                      placeholder="Dark uniforms, tactical gear..."
                    />
                  </div>
                </div>

                {/* Behavior Section */}
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-white/90">Behavior & Activity</h3>
                  
                  <div>
                    <label className="block text-sm text-white/70 mb-2">Activity</label>
                    <select
                      value={formData.activity}
                      onChange={(e) => setFormData({ ...formData, activity: e.target.value as any })}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white
                               focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <option value="Patrolling">Patrolling</option>
                      <option value="Processing">Processing</option>
                      <option value="Stationary">Stationary</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-white/70 mb-2">Items Held</label>
                    <textarea
                      value={formData.itemsHeld}
                      onChange={(e) => setFormData({ ...formData, itemsHeld: e.target.value })}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white
                               focus:outline-none focus:ring-2 focus:ring-red-500 min-h-[80px]"
                      placeholder="Radios, clipboards, weapons..."
                    />
                  </div>
                </div>

                {/* Location Info */}
                <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-sm">
                    <svg className="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                    {loadingLocation ? (
                      <span className="text-white/60">Getting your location...</span>
                    ) : formData.location ? (
                      <span className="text-white/60">
                        Location: {formData.location.lat.toFixed(4)}, {formData.location.lng.toFixed(4)}
                      </span>
                    ) : (
                      <span className="text-red-400">Location required</span>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 bg-white/10 hover:bg-white/20 text-white py-3 rounded-lg
                             transition-colors duration-200 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!formData.location || loadingLocation}
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 rounded-lg
                             transition-colors duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Submit Report
                  </button>
                </div>
              </form>
            </GlassmorphicCard>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
