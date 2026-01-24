'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { IceSighting } from '@/lib/types';
import { formatTimestamp } from '@/lib/utils';
import GlassmorphicCard from '../UI/GlassmorphicCard';

interface SightingDetailSheetProps {
  sighting: IceSighting | null;
  onClose: () => void;
}

export default function SightingDetailSheet({ sighting, onClose }: SightingDetailSheetProps) {
  return (
    <AnimatePresence>
      {sighting && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-40"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 max-h-[70vh] overflow-hidden"
          >
            <GlassmorphicCard className="rounded-t-3xl rounded-b-none p-6 max-w-2xl mx-auto">
              {/* Handle bar */}
              <div className="w-12 h-1 bg-white/30 rounded-full mx-auto mb-6" />

              <div className="overflow-y-auto max-h-[calc(70vh-4rem)] custom-scrollbar">
                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-white">Sighting Details</h2>
                    <p className="text-sm text-white/60 mt-1">
                      {formatTimestamp(sighting.timestamp)}
                    </p>
                  </div>
                  <button
                    onClick={onClose}
                    className="text-white/60 hover:text-white transition-colors"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Location */}
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <div className="flex items-center gap-2 text-red-400 mb-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                    <span className="font-semibold">Location</span>
                  </div>
                  <p className="text-white/80 text-sm">
                    {sighting.location.lat.toFixed(6)}, {sighting.location.lng.toFixed(6)}
                  </p>
                </div>

                {/* Vehicle Info */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-white mb-3">Vehicle Information</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-3">
                      <span className="text-white/60 min-w-[80px]">Type:</span>
                      <span className="text-white font-medium">{sighting.vehicle.type}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-white/60 min-w-[80px]">Color:</span>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded border border-white/30"
                          style={{ backgroundColor: sighting.vehicle.color }}
                        />
                        <span className="text-white font-medium">{sighting.vehicle.color}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Personnel Info */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-white mb-3">Personnel Information</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-3">
                      <span className="text-white/60 min-w-[80px]">Count:</span>
                      <span className="text-white font-medium">
                        {sighting.personnel.count} {sighting.personnel.count === 1 ? 'person' : 'people'}
                      </span>
                    </div>
                    {sighting.personnel.description && (
                      <div>
                        <span className="text-white/60">Description:</span>
                        <p className="text-white/80 mt-1 bg-white/5 p-3 rounded-lg">
                          {sighting.personnel.description}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Behavior Info */}
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-white mb-3">Behavior & Activity</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-3">
                      <span className="text-white/60 min-w-[80px]">Activity:</span>
                      <span className="text-white font-medium">{sighting.behavior.activity}</span>
                    </div>
                    {sighting.behavior.itemsHeld && (
                      <div>
                        <span className="text-white/60">Items Held:</span>
                        <p className="text-white/80 mt-1 bg-white/5 p-3 rounded-lg">
                          {sighting.behavior.itemsHeld}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </GlassmorphicCard>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
