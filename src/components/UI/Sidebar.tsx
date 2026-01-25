"use client";

import { useState, useEffect, useRef } from "react";
import { toBlob } from "html-to-image";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Clock, MapPin, Car, Users, X, Menu, ChevronLeft, ChevronRight, ArrowLeft, Activity, Navigation, Settings, Globe, ChevronUp, ChevronDown, Eye, Type, Bell, BellOff, Share2 } from "lucide-react";
import { IceSighting } from "@/lib/types";
import { doc, updateDoc, increment, getDoc, setDoc, arrayUnion } from "firebase/firestore";
import { db, auth, messaging } from "@/lib/firebase";
import { RecaptchaVerifier, signInWithPhoneNumber, signOut, onAuthStateChanged, User, ConfirmationResult } from "firebase/auth";
import { useSettings, ColorMode, TextSize } from "@/lib/settings-context";
import { getCurrentLocation } from "@/lib/utils";
import { useLanguage } from "@/lib/language-context";

declare global {
  interface Window {
    recaptchaVerifier: RecaptchaVerifier | undefined;
  }
}

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
  const { getUrgencyColors, textSize } = useSettings();
  const { t } = useLanguage();
  const urgency = getUrgencyLevel(sighting.timestamp);
  const colors = getUrgencyColors(urgency);
  const contentRef = useRef<HTMLDivElement>(null);
  
  const [updateText, setUpdateText] = useState("");
  const [isSubmittingUpdate, setIsSubmittingUpdate] = useState(false);

  const handleVerification = async (isStillThere: boolean) => {
    console.log(`Attempting verification vote: ${isStillThere ? 'YES' : 'NO'} for sighting ${sighting.id}`);
    try {
      if (!sighting.id) {
        console.error("Sighting ID is missing");
        return;
      }
      const sightingRef = doc(db, 'sightings', sighting.id);
      await updateDoc(sightingRef, {
        [`verification.${isStillThere ? 'stillThere' : 'notThere'}`]: increment(1)
      });
      console.log("Verification vote successful");
    } catch (error) {
      console.error("Error updating verification:", error);
    }
  };

  const handleAddUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!updateText.trim()) return;

    console.log(`Attempting to add update for sighting ${sighting.id}: ${updateText}`);
    setIsSubmittingUpdate(true);
    try {
      if (!sighting.id) {
        console.error("Sighting ID is missing");
        return;
      }
      const sightingRef = doc(db, 'sightings', sighting.id);
      await updateDoc(sightingRef, {
        updates: arrayUnion({
          text: updateText.trim(),
          timestamp: Date.now()
        })
      });
      console.log("Update added successfully");
      setUpdateText("");
    } catch (error) {
      console.error("Error adding update:", error);
    } finally {
      setIsSubmittingUpdate(false);
    }
  };

  const urgencyLabels = {
    high: t('urgency.high'),
    medium: t('urgency.medium'),
    low: t('urgency.low'),
  };

  // Dynamic text classes based on settings
  const textClasses = {
    sm: textSize === 'lg' ? 'text-base' : textSize === 'xl' ? 'text-lg' : 'text-sm',
    base: textSize === 'lg' ? 'text-lg' : textSize === 'xl' ? 'text-xl' : 'text-base',
    lg: textSize === 'lg' ? 'text-xl' : textSize === 'xl' ? 'text-2xl' : 'text-lg',
  };

  const handleShare = async () => {
    const shareData = {
      title: '🚨 ICE Sighting Alert',
      text: `⚠️ ICE Sighting Reported!\n\n📍 Location: Near ${sighting.location.lat.toFixed(4)}, ${sighting.location.lng.toFixed(4)}\n🚙 Vehicle: ${sighting.vehicle.color} ${sighting.vehicle.type}\n⏰ Time: ${formatTimeAgo(sighting.timestamp)}\n\nStay safe! See details:`,
      url: 'https://melttheice.us'
    };

    try {
      let file: File | null = null;
      if (contentRef.current) {
        try {
          // Generate image from the content
          const blob = await toBlob(contentRef.current, {
            cacheBust: true,
            backgroundColor: '#ffffff',
            filter: (node) => {
              // Exclude the header from the image
              return node instanceof Element && node.id !== 'no-share-header';
            },
            style: {
              height: 'auto',
              overflow: 'visible',
              maxHeight: 'none'
            }
          });

          if (blob) {
            file = new File([blob], 'ice-sighting.png', { type: blob.type });
          }
        } catch (imgErr) {
          console.error('Error generating image:', imgErr);
        }
      }

      // Check if we can share files
      if (file && navigator.canShare && navigator.canShare({ files: [file] }) && navigator.share) {
        await navigator.share({
          files: [file],
          title: shareData.title,
          text: shareData.text,
          url: shareData.url
        });
      } else if (navigator.share) {
        // Fallback to text share
        await navigator.share(shareData);
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
        alert('Link copied to clipboard!');
      }
    } catch (err) {
      console.error('Error sharing:', err);
      // Final fallback if share fails (e.g. user cancelled)
    }
  };

  return (
    <motion.div 
      ref={contentRef}
      className="flex flex-col h-full bg-white"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
    >
      {/* Back Header */}
      <div id="no-share-header" className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors group"
        >
          <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
          <span className="font-medium">{t('sidebar.all')}</span>
        </button>

        <button
          onClick={handleShare}
          className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
          title="Share Sighting"
        >
          <Share2 className="w-5 h-5" />
        </button>
      </div>

      {/* Urgency Banner */}
      <div className={`px-6 py-4 ${colors.bg} border-b ${colors.border}`}>
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className={`w-4 h-4 rounded-full ${colors.dot}`} />
            {urgency === "high" && (
              <div className={`absolute inset-0 w-4 h-4 rounded-full ${colors.dot} animate-ping opacity-75`} />
            )}
          </div>
          <span className={`font-bold uppercase tracking-wider ${colors.text} ${textClasses.sm}`}>
            {urgencyLabels[urgency]}
          </span>
        </div>
      </div>

      {/* Detail Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
        
        {/* Image Evidence */}
        {sighting.imageUrl && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
               <div className="w-5 h-5 text-gray-600 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
               </div>
              <h3 className={`${textClasses.sm} font-semibold text-gray-700 uppercase tracking-wider`}>{t('detail.photo')}</h3>
            </div>
            <div className="rounded-2xl border border-gray-200 shadow-sm relative bg-gray-50 flex justify-center p-2">
              <img 
                src={sighting.imageUrl} 
                alt={t('detail.evidence')} 
                className="max-h-40 w-auto h-auto rounded-lg object-contain"
                loading="lazy"
              />
            </div>
          </div>
        )}

        {/* Time Info */}
        <div className="mb-8">
          <div className={`flex items-center gap-2 text-gray-500 ${textClasses.sm} mb-1`}>
            <Clock className="w-4 h-4" />
            <span>{t('detail.reported')} {formatTimeAgo(sighting.timestamp)}</span>
          </div>
          <p className={`text-gray-700 ${textClasses.sm} ml-6`}>{formatFullTime(sighting.timestamp)}</p>
        </div>

        {/* Vehicle Section */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Car className="w-5 h-5 text-gray-600" />
            <h3 className={`${textClasses.sm} font-semibold text-gray-700 uppercase tracking-wider`}>{t('sighting.vehicle')}</h3>
          </div>
          <div className="bg-gray-50 rounded-2xl p-5 space-y-4">
            <div className="flex justify-between items-center">
              <span className={`text-gray-500 ${textClasses.base}`}>{t('detail.type')}</span>
              <span className={`font-semibold text-gray-900 ${textClasses.base}`}>{sighting.vehicle.type}</span>
            </div>
            <div className="border-t border-gray-200" />
            <div className="flex justify-between items-center">
              <span className={`text-gray-500 ${textClasses.base}`}>{t('detail.color')}</span>
              <div className="flex items-center gap-2">
                <span className={`font-semibold text-gray-900 ${textClasses.base}`}>{sighting.vehicle.color || "Unknown"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Personnel Section */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-gray-600" />
            <h3 className={`${textClasses.sm} font-semibold text-gray-700 uppercase tracking-wider`}>{t('sighting.personnel')}</h3>
          </div>
          <div className="bg-gray-50 rounded-2xl p-5 space-y-4">
            <div className="flex justify-between items-center">
              <span className={`text-gray-500 ${textClasses.base}`}>{t('detail.count')}</span>
              <span className={`font-semibold text-gray-900 ${textClasses.base}`}>{sighting.personnel.count} {sighting.personnel.count === 1 ? 'person' : 'people'}</span>
            </div>
            {sighting.personnel.description && (
              <>
                <div className="border-t border-gray-200" />
                <div>
                  <span className={`text-gray-500 block mb-2 ${textClasses.base}`}>{t('detail.description')}</span>
                  <p className={`text-gray-900 ${textClasses.base}`}>{sighting.personnel.description}</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Activity Section */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-gray-600" />
            <h3 className={`${textClasses.sm} font-semibold text-gray-700 uppercase tracking-wider`}>{t('sighting.activity')}</h3>
          </div>
          <div className="bg-gray-50 rounded-2xl p-5 space-y-4">
            <div className="flex justify-between items-center">
              <span className={`text-gray-500 ${textClasses.base}`}>{t('detail.status')}</span>
              <span className={`px-3 py-1 rounded-full font-medium ${textClasses.sm} ${
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
                  <span className={`text-gray-500 block mb-2 ${textClasses.base}`}>Details</span>
                  <p className={`text-gray-900 ${textClasses.base}`}>{sighting.behavior.itemsHeld}</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Location Section */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Navigation className="w-5 h-5 text-gray-600" />
            <h3 className={`${textClasses.sm} font-semibold text-gray-700 uppercase tracking-wider`}>{t('sighting.location')}</h3>
          </div>
          <div className="bg-gray-50 rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <span className={`text-gray-500 ${textClasses.base}`}>{t('detail.coordinates')}</span>
              <span className={`font-mono text-gray-900 ${textClasses.sm}`}>
                {sighting.location.lat.toFixed(5)}, {sighting.location.lng.toFixed(5)}
              </span>
            </div>
          </div>
        </div>

        {/* Verification Section */}
        <div className="mb-8">
           <div className="flex items-center gap-2 mb-4">
            <Eye className="w-5 h-5 text-gray-600" />
            <h3 className={`${textClasses.sm} font-semibold text-gray-700 uppercase tracking-wider`}>Verification</h3>
          </div>
          <div className="bg-gray-50 rounded-2xl p-5">
            <p className={`text-gray-700 font-medium mb-4 ${textClasses.base}`}>Is this still there?</p>
            <div className="flex gap-3">
              <button 
                onClick={() => handleVerification(true)}
                className="flex-1 bg-white border border-gray-200 rounded-xl py-3 px-4 flex items-center justify-center gap-2 shadow-sm hover:bg-green-50 hover:border-green-200 transition-colors"
              >
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="font-medium text-gray-900">Yes ({sighting.verification?.stillThere || 0})</span>
              </button>
              <button 
                onClick={() => handleVerification(false)}
                className="flex-1 bg-white border border-gray-200 rounded-xl py-3 px-4 flex items-center justify-center gap-2 shadow-sm hover:bg-red-50 hover:border-red-200 transition-colors"
                >
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="font-medium text-gray-900">No ({sighting.verification?.notThere || 0})</span>
              </button>
            </div>
          </div>
        </div>

        {/* Updates Section */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
             <Bell className="w-5 h-5 text-gray-600" />
            <h3 className={`${textClasses.sm} font-semibold text-gray-700 uppercase tracking-wider`}>Updates</h3>
          </div>
          
           <div className="space-y-4">
            {/* Existing Updates */}
            {sighting.updates && sighting.updates.map((update, index) => (
              <div key={index} className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
                <p className={`text-gray-800 ${textClasses.base}`}>{update.text}</p>
                <div className="mt-2 flex items-center gap-2 text-blue-600 text-xs font-medium">
                  <Clock className="w-3 h-3" />
                  <span>{formatTimeAgo(update.timestamp)}</span>
                </div>
              </div>
            ))}

            {/* Add Update Form */}
            <form onSubmit={handleAddUpdate} className="bg-gray-50 rounded-2xl p-5">
              <label className={`block text-gray-700 font-medium mb-2 ${textClasses.sm}`}>
                Add more description
              </label>
              <textarea
                value={updateText}
                onChange={(e) => setUpdateText(e.target.value)}
                placeholder="Details about movement, specific location, or changes..."
                className="w-full bg-white border border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans text-base mb-3 resize-none"
                rows={3}
              />
              <button
                type="submit"
                disabled={!updateText.trim() || isSubmittingUpdate}
                className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-xl disabled:opacity-50 hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                {isSubmittingUpdate ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                Add Update
              </button>
            </form>
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
  onVote,
}: {
  sighting: IceSighting;
  onClick: () => void;
  onVote: (e: React.MouseEvent, direction: 'up' | 'down') => void;
}) => {
  const { getUrgencyColors, textSize } = useSettings();
  const urgency = getUrgencyLevel(sighting.timestamp);
  const colors = getUrgencyColors(urgency);
  
  const score = (sighting.upvotes || 0) - (sighting.downvotes || 0);

  // Dynamic text classes based on settings
  const textClasses = {
    xs: textSize === 'lg' ? 'text-sm' : textSize === 'xl' ? 'text-base' : 'text-xs',
    sm: textSize === 'lg' ? 'text-base' : textSize === 'xl' ? 'text-lg' : 'text-sm',
    base: textSize === 'lg' ? 'text-lg' : textSize === 'xl' ? 'text-xl' : 'text-base',
  };

  return (
    <motion.button
      onClick={onClick}
      className={`w-full p-4 rounded-xl border ${colors.bg} ${colors.border} ${colors.hover} transition-all duration-200 text-left mb-4 flex gap-3`}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      {/* Voting Column */}
      <div className="flex flex-col items-center gap-1 min-w-[32px]">
        <div 
          role="button"
          onClick={(e) => onVote(e, 'up')}
          className="p-1 hover:bg-black/5 rounded-full transition-colors text-gray-500 hover:text-green-600"
        >
          <ChevronUp className="w-6 h-6" />
        </div>
        <span className={`font-bold ${textClasses.sm} ${score > 0 ? 'text-green-600' : score < 0 ? 'text-red-500' : 'text-gray-600'}`}>
          {score}
        </span>
        <div 
          role="button"
          onClick={(e) => onVote(e, 'down')}
          className="p-1 hover:bg-black/5 rounded-full transition-colors text-gray-500 hover:text-red-600"
        >
          <ChevronDown className="w-6 h-6" />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            {/* Header Row: Vehicle (Left) | Status & Time (Right) */}
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <Car className="w-5 h-5 text-gray-700" />
                <span className={`${textClasses.base} font-semibold text-gray-900`}>
                  {sighting.vehicle.color} {sighting.vehicle.type}
                </span>
              </div>

              <div className="flex flex-col items-end gap-1">
                <span className={`${textClasses.xs} px-2 py-1 rounded-full font-medium ${colors.bg} ${colors.text}`}>
                  {urgency === "high" ? "ACTIVE" : urgency === "medium" ? "RECENT" : "OLDER"}
                </span>
                <div className={`flex items-center gap-1 ${textClasses.xs} text-gray-500`}>
                  <Clock className="w-3 h-3" />
                  <span>{formatTimeAgo(sighting.timestamp)}</span>
                </div>
              </div>
            </div>

            {/* Personnel count */}
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-gray-500" />
              <span className={`${textClasses.sm} text-gray-600`}>
                {sighting.personnel.count} personnel
              </span>
            </div>

            {/* Activity */}
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-gray-500" />
              <span className={`${textClasses.sm} text-gray-600`}>
                {sighting.behavior.activity}
              </span>
            </div>
          </div>

          {/* Chevron indicator */}
          <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0 mt-1" />
        </div>
      </div>
    </motion.button>
  );
};

// Settings View Component (Simplified - No Phone Auth)
const SettingsView = ({ onBack }: { onBack: () => void }) => {
  const { colorMode, setColorMode, textSize, setTextSize } = useSettings();
  const { t } = useLanguage();
  
  // Simple state for SMS alerts
  const [phoneNumber, setPhoneNumber] = useState("");
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Check if user has existing alert settings on mount
  useEffect(() => {
    const checkExistingSettings = async () => {
      try {
        // Check localStorage for userId
        const storedUserId = localStorage.getItem('alertUserId');
        if (storedUserId) {
          setUserId(storedUserId);
          const userDoc = await getDoc(doc(db, 'users', storedUserId));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setPhoneNumber(data.phoneNumber || "");
            setNotificationsEnabled(data.notificationsEnabled || false);
          }
        }
      } catch (err) {
        console.error("Error checking existing settings:", err);
      }
    };
    checkExistingSettings();
  }, []);

  const handleToggleNotifications = async () => {
    setError(null);
    setLoading(true);

    try {
      if (!notificationsEnabled) {
        // Enabling notifications
        
        // Validate phone number
        if (!phoneNumber.startsWith('+')) {
          setError("Please include your country code (e.g., +1 for USA).");
          setLoading(false);
          return;
        }

        const isValidFormat = /^\+[1-9]\d{1,14}$/.test(phoneNumber);
        if (!isValidFormat) {
          setError("Invalid phone number format. Use E.164 format: +1234567890");
          setLoading(false);
          return;
        }

        // Get user's location
        console.log("📍 Getting user location...");
        const location = await getCurrentLocation();
        console.log("✅ Location captured:", location);

        // Generate or use existing userId
        const uid = userId || crypto.randomUUID();
        
        // Store in Firestore
        await setDoc(doc(db, 'users', uid), {
          phoneNumber: phoneNumber,
          location: location,
          notificationsEnabled: true,
          createdAt: Date.now(),
          updatedAt: Date.now()
        });

        // Store userId in localStorage
        localStorage.setItem('alertUserId', uid);
        setUserId(uid);
        setNotificationsEnabled(true);
        
        console.log("✅ SMS alerts enabled for", phoneNumber);
      } else {
        // Disabling notifications
        if (userId) {
          await updateDoc(doc(db, 'users', userId), {
            notificationsEnabled: false,
            updatedAt: Date.now()
          });
        }
        setNotificationsEnabled(false);
        console.log("🔕 SMS alerts disabled");
      }
    } catch (err: any) {
      console.error("Error toggling notifications:", err);
      if (err.code === 1) {
        setError("Location access denied. Please enable location permissions in your browser.");
      } else {
        setError(err.message || "Failed to update notification settings.");
      }
    } finally {
      setLoading(false);
    }
  };

  const colorOptions = [
    { id: 'default', label: 'Default', colors: ['#EF4444', '#F97316', '#9CA3AF'] },
    { id: 'protanopia', label: 'Protanopia (Red-Blind)', colors: ['#2563EB', '#EAB308', '#6B7280'] },
    { id: 'deuteranopia', label: 'Deuteranopia (Green-Blind)', colors: ['#4F46E5', '#F59E0B', '#64748B'] },
    { id: 'tritanopia', label: 'Tritanopia (Blue-Blind)', colors: ['#E11D48', '#06B6D4', '#6B7280'] },
    { id: 'achromatopsia', label: 'Monochromacy', colors: ['#000000', '#9CA3AF', '#FFFFFF'] },
  ] as const;

  const textSizeOptions = [
    { id: 'sm', label: 'Small', px: '14px' },
    { id: 'base', label: 'Medium', px: '16px' },
    { id: 'lg', label: 'Large', px: '18px' },
    { id: 'xl', label: 'Extra Large', px: '20px' },
  ] as const;

  return (
    <motion.div 
      className="flex flex-col h-full bg-white"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors group"
        >
          <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
          <span className="font-medium">Back</span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Settings</h1>
          <p className="text-gray-500 mb-8">Customize app experience & manage SMS alerts.</p>
        </div>

        {/* SMS Alerts Settings */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-5 h-5 text-gray-700" />
            <h2 className="text-lg font-semibold text-gray-900">{t('settings.notifications')}</h2>
          </div>
          
          <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100 space-y-4">
            <p className="text-sm text-gray-600">
              Get SMS alerts when ICE activity is reported near your location.
            </p>

            {/* Phone Number Input */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">
                Phone Number (E.164 format)
              </label>
              <input 
                type="tel" 
                placeholder="+1 555-555-5555"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                disabled={notificationsEnabled}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
              <p className="text-[10px] text-gray-400 mt-1">Include country code starting with +</p>
            </div>

            {/* Error Display */}
            {error && (
              <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                {error}
              </p>
            )}

            {/* Enable/Disable Toggle */}
            <div className="flex items-center justify-between gap-4 pt-2">
              <div className="flex-1">
                <p className="font-medium text-gray-900">SMS Alerts</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {notificationsEnabled ? 'Enabled' : 'Enable to receive SMS alerts'}
                </p>
              </div>
              <button
                onClick={handleToggleNotifications}
                disabled={loading || (!notificationsEnabled && !phoneNumber)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  notificationsEnabled ? 'bg-blue-600' : 'bg-gray-200'
                } ${(loading || (!notificationsEnabled && !phoneNumber)) ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    notificationsEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {notificationsEnabled && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-2">
                <Bell className="w-4 h-4 text-green-600 mt-0.5" />
                <div className="text-xs text-green-700">
                  <p className="font-semibold">Alerts Active</p>
                  <p className="mt-1">You'll receive SMS alerts for sightings within 2km of your location.</p>
                </div>
              </div>
            )}
          </div>
        </section>

        <div className="border-t border-gray-100" />

        {/* Color Blindness Settings */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Eye className="w-5 h-5 text-gray-700" />
            <h2 className="text-lg font-semibold text-gray-900">Color Blindness Mode</h2>
          </div>
          <div className="grid gap-3">
            {colorOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => setColorMode(option.id)}
                className={`w-full p-4 rounded-xl border-2 transition-all flex items-center justify-between group ${
                  colorMode === option.id 
                    ? "border-black bg-gray-50" 
                    : "border-transparent bg-white hover:bg-gray-50 border-gray-100"
                }`}
              >
                <div className="flex items-center gap-4">
                  {/* Color Preview Circles */}
                  <div className="flex -space-x-2">
                    {option.colors.map((color, i) => (
                      <div 
                        key={i}
                        className="w-8 h-8 rounded-full border-2 border-white shadow-sm"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <span className={`font-medium ${colorMode === option.id ? "text-black" : "text-gray-600"}`}>
                    {option.label}
                  </span>
                </div>
                {colorMode === option.id && (
                  <div className="w-3 h-3 rounded-full bg-black" />
                )}
              </button>
            ))}
          </div>
        </section>

        <div className="border-t border-gray-100" />

        {/* Text Size Settings */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Type className="w-5 h-5 text-gray-700" />
            <h2 className="text-lg font-semibold text-gray-900">Text Size</h2>
          </div>
          <div className="bg-gray-50 rounded-2xl p-2 flex items-center justify-between">
            {textSizeOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => setTextSize(option.id)}
                className={`flex-1 py-3 px-2 rounded-xl text-sm font-medium transition-all ${
                  textSize === option.id
                    ? "bg-white text-black shadow-sm"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                <div className="flex flex-col items-center gap-1">
                  <span style={{ fontSize: option.px }} className="font-serif">Aa</span>
                  <span className="text-xs opacity-70">{option.label}</span>
                </div>
              </button>
            ))}
          </div>
          <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
             <p className={`text-gray-600 ${
               textSize === 'sm' ? 'text-sm' :
               textSize === 'base' ? 'text-base' :
               textSize === 'lg' ? 'text-lg' : 'text-xl'
             }`}>
               Preview: The quick brown fox jumps over the lazy dog.
             </p>
          </div>
        </section>
      </div>
    </motion.div>
  );
};

const SidebarGlobalFooter = ({ onSettingsClick }: { onSettingsClick: () => void }) => {
  const { language, setLanguage, t } = useLanguage();
  
  return (
    <div className="px-4 py-3 border-t border-gray-200 bg-white">
      <div className="space-y-1">
        <button 
          onClick={() => setLanguage(language === 'en' ? 'es' : 'en')}
          className="w-full flex items-center gap-4 px-5 py-5 text-gray-700 hover:bg-gray-50 hover:text-gray-900 rounded-xl transition-colors text-lg font-medium"
        >
          <Globe className="w-7 h-7" />
          {language === 'en' ? 'English' : 'Español'}
        </button>
        <button 
          onClick={onSettingsClick}
          className="w-full flex items-center gap-4 px-5 py-5 text-gray-700 hover:bg-gray-50 hover:text-gray-900 rounded-xl transition-colors text-lg font-medium"
        >
          <Settings className="w-7 h-7" />
          {t('sidebar.settings')}
        </button>
      </div>
    </div>
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
  const [showSettings, setShowSettings] = useState(false);
  const { t } = useLanguage();

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
    setShowSettings(false);
    onSightingClick?.(sighting);
  };

  const handleBackClick = () => {
    if (showSettings) {
      setShowSettings(false);
      return;
    }
    
    if (onBack) {
      onBack();
    } else {
      setInternalSelectedSighting(null);
    }
  };

  const handleVote = async (e: React.MouseEvent, sightingId: string, direction: 'up' | 'down') => {
    e.stopPropagation(); // Prevent opening the detail view
    const sightingRef = doc(db, 'sightings', sightingId);
    
    try {
      if (direction === 'up') {
        await updateDoc(sightingRef, {
          upvotes: increment(1)
        });
      } else {
        await updateDoc(sightingRef, {
          downvotes: increment(1)
        });
      }
    } catch (error) {
      console.error("Error voting:", error);
    }
  };

  // Sort sightings by trust score (upvotes - downvotes), then by timestamp
  const sortedSightings = [...sightings].sort((a, b) => {
    const scoreA = (a.upvotes || 0) - (a.downvotes || 0);
    const scoreB = (b.upvotes || 0) - (b.downvotes || 0);
    
    if (scoreA !== scoreB) {
      return scoreB - scoreA; // High score first
    }
    return b.timestamp - a.timestamp; // Newest first as tiebreaker
  });

  const SightingsList = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-8 py-6 border-b border-gray-200">
        <div className="flex items-center justify-center relative">
          <div className="flex items-center gap-4">
             {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
               src="/lightThemeBanner.webp" 
               alt="Melt the ICE" 
               className="h-12 w-auto object-contain" 
            />
          </div>
          <button 
            onClick={toggleSidebar} 
            className="md:hidden absolute right-0 top-1/2 -translate-y-1/2 p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Sightings List */}
      <div className="flex-1 px-6 py-6 overflow-y-auto custom-scrollbar">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-base font-semibold text-gray-700 uppercase tracking-wide">
            {t('sidebar.recent')}
          </h2>
          <span className="text-sm text-gray-500">Last 4 hours</span>
        </div>

        {sortedSightings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <MapPin className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 font-medium">{t('msg.nosightings')}</p>
            <p className="text-sm text-gray-400 mt-1">Sightings will appear here when reported</p>
          </div>
        ) : (
          <div>
            {sortedSightings.map((sighting) => (
              <SightingCard
                key={sighting.id}
                sighting={sighting}
                onClick={() => handleSightingClick(sighting)}
                onVote={(e, dir) => handleVote(e, sighting.id, dir)}
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
    <div className="flex flex-col h-full bg-white">
      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {showSettings ? (
            <SettingsView key="settings" onBack={() => setShowSettings(false)} />
          ) : selectedSighting ? (
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
      </div>
      <SidebarGlobalFooter onSettingsClick={() => setShowSettings(true)} />
    </div>
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
