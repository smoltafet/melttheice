"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Clock, MapPin, Car, Users, X, Menu, ChevronLeft, ChevronRight, ArrowLeft, Activity, Navigation } from "lucide-react";
import { IceSighting } from "@/lib/types";



// Format time ago from timestamp
const formatTimeAgo = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

// Format full timestamp
const formatFullTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

// Get urgency level based on time
const getUrgencyLevel = (timestamp: number): "high" | "medium" | "low" => {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);

  if (minutes < 30) return "high";
  if (minutes < 120) return "medium";
  return "low";
};

// Sighting Detail View Component
const SightingDetailView = ({
  sighting,
  onBack,
}: {
  sighting: IceSighting;
  onBack: () => void;
}) => {
  const urgency = getUrgencyLevel(sighting.timestamp);
  const urgencyConfig = {
    high: { bg: "bg-red-50", border: "border-red-200", text: "text-red-700", label: "ACTIVE THREAT", dot: "bg-red-500" },
    medium: { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-700", label: "RECENT SIGHTING", dot: "bg-orange-500" },
    low: { bg: "bg-gray-50", border: "border-gray-200", text: "text-gray-700", label: "OLDER REPORT", dot: "bg-gray-400" },
  };

  return (
    <motion.div 
      className="flex flex-col h-full"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
    >
      {/* Back Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors group"
        >
          <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
          <span className="font-medium">All Sightings</span>
        </button>
      </div>

      {/* Urgency Banner */}
      <div className={`px-6 py-4 ${urgencyConfig[urgency].bg} border-b ${urgencyConfig[urgency].border}`}>
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className={`w-4 h-4 rounded-full ${urgencyConfig[urgency].dot}`} />
            {urgency === "high" && (
              <div className={`absolute inset-0 w-4 h-4 rounded-full ${urgencyConfig[urgency].dot} animate-ping opacity-75`} />
            )}
          </div>
          <span className={`text-sm font-bold uppercase tracking-wider ${urgencyConfig[urgency].text}`}>
            {urgencyConfig[urgency].label}
          </span>
        </div>
      </div>

      {/* Detail Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
        {/* Time Info */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <Clock className="w-4 h-4" />
            <span>Reported {formatTimeAgo(sighting.timestamp)}</span>
          </div>
          <p className="text-gray-700 text-sm ml-6">{formatFullTime(sighting.timestamp)}</p>
        </div>

        {/* Vehicle Section */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Car className="w-5 h-5 text-gray-600" />
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Vehicle</h3>
          </div>
          <div className="bg-gray-50 rounded-2xl p-5 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Type</span>
              <span className="font-semibold text-gray-900">{sighting.vehicle.type}</span>
            </div>
            <div className="border-t border-gray-200" />
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Color</span>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-900">{sighting.vehicle.color || "Unknown"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Personnel Section */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-gray-600" />
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Personnel</h3>
          </div>
          <div className="bg-gray-50 rounded-2xl p-5 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Count</span>
              <span className="font-semibold text-gray-900">{sighting.personnel.count} {sighting.personnel.count === 1 ? 'person' : 'people'}</span>
            </div>
            {sighting.personnel.description && (
              <>
                <div className="border-t border-gray-200" />
                <div>
                  <span className="text-gray-500 block mb-2">Description</span>
                  <p className="text-gray-900">{sighting.personnel.description}</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Activity Section */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-gray-600" />
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Activity</h3>
          </div>
          <div className="bg-gray-50 rounded-2xl p-5 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Status</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                sighting.behavior.activity === 'Patrolling' ? 'bg-blue-100 text-blue-700' :
                sighting.behavior.activity === 'Processing' ? 'bg-purple-100 text-purple-700' :
                sighting.behavior.activity === 'Stationary' ? 'bg-yellow-100 text-yellow-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {sighting.behavior.activity}
              </span>
            </div>
            {sighting.behavior.itemsHeld && (
              <>
                <div className="border-t border-gray-200" />
                <div>
                  <span className="text-gray-500 block mb-2">Details</span>
                  <p className="text-gray-900">{sighting.behavior.itemsHeld}</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Location Section */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Navigation className="w-5 h-5 text-gray-600" />
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Location</h3>
          </div>
          <div className="bg-gray-50 rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Coordinates</span>
              <span className="font-mono text-sm text-gray-900">
                {sighting.location.lat.toFixed(5)}, {sighting.location.lng.toFixed(5)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
        <p className="text-xs text-gray-500 text-center">
          Report expires {formatTimeAgo(sighting.timestamp + 4 * 60 * 60 * 1000)}
        </p>
      </div>
    </motion.div>
  );
};

const SightingCard = ({
  sighting,
  onClick,
}: {
  sighting: IceSighting;
  onClick: () => void;
}) => {
  const urgency = getUrgencyLevel(sighting.timestamp);
  const urgencyColors = {
    high: "bg-red-50 border-red-200 hover:bg-red-100",
    medium: "bg-orange-50 border-orange-200 hover:bg-orange-100",
    low: "bg-gray-50 border-gray-200 hover:bg-gray-100",
  };
  const pulseColors = {
    high: "bg-red-500",
    medium: "bg-orange-500",
    low: "bg-gray-400",
  };

  return (
    <motion.button
      onClick={onClick}
      className={`w-full p-4 rounded-xl border ${urgencyColors[urgency]} transition-all duration-200 text-left mb-3`}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      <div className="flex items-start gap-3">
        {/* Pulsing indicator */}
        <div className="relative flex-shrink-0 mt-1">
          <div className={`w-3 h-3 rounded-full ${pulseColors[urgency]}`} />
          {urgency === "high" && (
            <div className={`absolute inset-0 w-3 h-3 rounded-full ${pulseColors[urgency]} animate-ping opacity-75`} />
          )}
        </div>

        <div className="flex-1 min-w-0">
          {/* Time and vehicle type */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-gray-600">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-medium">{formatTimeAgo(sighting.timestamp)}</span>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
              urgency === "high" ? "bg-red-100 text-red-700" :
              urgency === "medium" ? "bg-orange-100 text-orange-700" :
              "bg-gray-100 text-gray-700"
            }`}>
              {urgency === "high" ? "ACTIVE" : urgency === "medium" ? "RECENT" : "OLDER"}
            </span>
          </div>

          {/* Vehicle info */}
          <div className="flex items-center gap-2 mb-2">
            <Car className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-semibold text-gray-800">
              {sighting.vehicle.color} {sighting.vehicle.type}
            </span>
          </div>

          {/* Personnel count */}
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-600">
              {sighting.personnel.count} personnel
            </span>
          </div>

          {/* Activity */}
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-600">
              {sighting.behavior.activity}
            </span>
          </div>
        </div>

        {/* Chevron indicator */}
        <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0 mt-1" />
      </div>
    </motion.button>
  );
};

const AnimatedMenuToggle = ({
  toggle,
  isOpen,
}: {
  toggle: () => void;
  isOpen: boolean;
}) => (
  <button
    onClick={toggle}
    aria-label="Toggle menu"
    className="focus:outline-none z-999 p-2 bg-white rounded-lg shadow-lg"
  >
    {isOpen ? (
      <X className="w-6 h-6 text-gray-700" />
    ) : (
      <Menu className="w-6 h-6 text-gray-700" />
    )}
  </button>
);

interface SidebarProps {
  children?: React.ReactNode;
  sightings?: IceSighting[];
  onSightingClick?: (sighting: IceSighting) => void;
  selectedSighting?: IceSighting | null;
  onBack?: () => void;
}

const Sidebar = ({ 
  children, 
  sightings = [], 
  onSightingClick,
  selectedSighting: propSelectedSighting,
  onBack
}: SidebarProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [internalSelectedSighting, setInternalSelectedSighting] = useState<IceSighting | null>(null);

  // Use prop if provided, otherwise internal state
  const selectedSighting = propSelectedSighting !== undefined ? propSelectedSighting : internalSelectedSighting;

  const mobileSidebarVariants = {
    hidden: { x: "-100%" },
    visible: { x: 0 },
  };

  const toggleSidebar = () => setIsOpen(!isOpen);

  const handleSightingClick = (sighting: IceSighting) => {
    if (propSelectedSighting === undefined) {
      setInternalSelectedSighting(sighting);
    }
    onSightingClick?.(sighting);
  };

  const handleBackClick = () => {
    if (onBack) {
      onBack();
    } else {
      setInternalSelectedSighting(null);
    }
  };

  const SightingsList = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-8 py-6 border-b border-gray-200">
        <div className="flex items-center justify-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">ICE Tracker</h1>
              <p className="text-sm text-gray-500">Seattle Metro Area</p>
            </div>
          </div>
          <button onClick={toggleSidebar} className="md:hidden p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="px-8 py-5 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-center gap-12">
          <div className="text-center">
            <p className="text-3xl font-bold text-red-600">{sightings.filter(s => getUrgencyLevel(s.timestamp) === "high").length}</p>
            <p className="text-sm text-gray-500 mt-1">Active</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-orange-600">{sightings.filter(s => getUrgencyLevel(s.timestamp) === "medium").length}</p>
            <p className="text-sm text-gray-500 mt-1">Recent</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-gray-600">{sightings.length}</p>
            <p className="text-sm text-gray-500 mt-1">Total</p>
          </div>
        </div>
      </div>

      {/* Sightings List */}
      <div className="flex-1 px-6 py-6 overflow-y-auto custom-scrollbar">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-base font-semibold text-gray-700 uppercase tracking-wide">
            Recent Sightings
          </h2>
          <span className="text-sm text-gray-500">Last 4 hours</span>
        </div>

        {sightings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <MapPin className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 font-medium">No recent sightings</p>
            <p className="text-sm text-gray-400 mt-1">Sightings will appear here when reported</p>
          </div>
        ) : (
          <div>
            {sightings.map((sighting) => (
              <SightingCard
                key={sighting.id}
                sighting={sighting}
                onClick={() => handleSightingClick(sighting)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-8 py-5 border-t border-gray-200 bg-gray-50">
        <p className="text-sm text-gray-500 text-center">
          Sightings expire after 4 hours • Stay safe
        </p>
      </div>
    </div>
  );

  const SidebarContent = () => (
    <AnimatePresence mode="wait">
      {selectedSighting ? (
        <SightingDetailView 
          key="detail"
          sighting={selectedSighting} 
          onBack={handleBackClick} 
        />
      ) : (
        <motion.div 
          key="list"
          className="h-full"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.2 }}
        >
          <SightingsList />
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={mobileSidebarVariants}
            transition={{ duration: 0.3 }}
            className="md:hidden fixed inset-0 z-50 bg-white text-black"
          >
            <SidebarContent />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar - Collapsible */}
      <motion.div 
        className="hidden md:flex flex-col fixed top-0 left-0 h-full bg-white text-black shadow-xl z-[100]"
        animate={{ width: isCollapsed ? 80 : 460 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        {/* Collapse Toggle Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-4 top-8 z-10 w-8 h-8 bg-white border border-gray-200 rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4 text-gray-600" />
          ) : (
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          )}
        </button>
        
        {isCollapsed ? (
          /* Collapsed State - Simple menu icon */
          <div className="flex flex-col h-full items-center justify-center">
            <button 
              onClick={() => setIsCollapsed(false)}
              className="p-3 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <div className="flex flex-col gap-1.5">
                <div className="w-6 h-0.5 bg-gray-600 rounded-full" />
                <div className="w-6 h-0.5 bg-gray-600 rounded-full" />
                <div className="w-6 h-0.5 bg-gray-600 rounded-full" />
              </div>
            </button>
          </div>
        ) : (
          <SidebarContent />
        )}
      </motion.div>

      {/* Main Content Area */}
      <div 
        className={`flex-1 transition-all duration-300 relative h-full ml-0 ${isCollapsed ? 'md:ml-[80px]' : 'md:ml-[460px]'}`}
      >
        {/* Top bar for mobile toggle - fixed positioning to sit on top of map on mobile */}
        <div className="absolute top-4 left-4 z-[999] md:hidden">
          <AnimatedMenuToggle toggle={toggleSidebar} isOpen={isOpen} />
        </div>
        
        {/* Map / Content Container */}
        <div className="h-full w-full">
          {children}
        </div>
      </div>
    </div>
  );
};


export { Sidebar };
