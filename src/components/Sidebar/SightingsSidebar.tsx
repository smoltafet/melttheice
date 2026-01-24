'use client';

import { IceSighting } from '@/lib/types';
import { formatTimestamp } from '@/lib/utils';
import GlassmorphicCard from '../UI/GlassmorphicCard';

interface SightingsSidebarProps {
  sightings: IceSighting[];
  onSightingClick: (sighting: IceSighting) => void;
}

export default function SightingsSidebar({ sightings, onSightingClick }: SightingsSidebarProps) {
  return (
    <div className="absolute left-4 top-4 bottom-4 w-80 z-[80] flex flex-col">
      <GlassmorphicCard className="flex-1 flex flex-col p-4">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-white">Recent Sightings</h2>
          <p className="text-sm text-white/60 mt-1">
            {sightings.length} {sightings.length === 1 ? 'report' : 'reports'} in the last 4 hours
          </p>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2">
          {sightings.length === 0 ? (
            <div className="text-center py-12 text-white/50">
              <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm">No recent sightings</p>
              <p className="text-xs mt-1">Be the first to report</p>
            </div>
          ) : (
            sightings.map((sighting) => (
              <button
                key={sighting.id}
                onClick={() => onSightingClick(sighting)}
                className="w-full text-left bg-white/5 hover:bg-white/10 rounded-lg p-3
                         border border-white/10 transition-all duration-200 hover:border-red-500/50"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full pulse-danger" />
                    <span className="text-sm font-semibold text-white">
                      {sighting.vehicle.type}
                    </span>
                  </div>
                  <span className="text-xs text-white/60">
                    {formatTimestamp(sighting.timestamp)}
                  </span>
                </div>

                <div className="space-y-1 text-xs text-white/70">
                  <div className="flex items-center gap-2">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                    <span>{sighting.location.lat.toFixed(4)}, {sighting.location.lng.toFixed(4)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                    </svg>
                    <span>{sighting.personnel.count} {sighting.personnel.count === 1 ? 'person' : 'people'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                    <span>{sighting.behavior.activity}</span>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </GlassmorphicCard>
    </div>
  );
}
