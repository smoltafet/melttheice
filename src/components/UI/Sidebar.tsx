"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Clock, MapPin, Car, Users, X, Menu, ChevronLeft, ChevronRight, ArrowLeft, Activity, Navigation, Settings, HelpCircle, ChevronUp, ChevronDown, Eye, Type, Bell, BellOff } from "lucide-react";
import { IceSighting } from "@/lib/types";
import { doc, updateDoc, increment, getDoc, setDoc } from "firebase/firestore";
import { db, auth, messaging } from "@/lib/firebase";
import { RecaptchaVerifier, signInWithPhoneNumber, signOut, onAuthStateChanged, User, ConfirmationResult } from "firebase/auth";
import { useSettings, ColorMode, TextSize } from "@/lib/settings-context";
import { getCurrentLocation } from "@/lib/utils";

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
  const urgency = getUrgencyLevel(sighting.timestamp);
  const colors = getUrgencyColors(urgency);

  const urgencyLabels = {
    high: "ACTIVE THREAT",
    medium: "RECENT SIGHTING",
    low: "OLDER REPORT",
  };

  // Dynamic text classes based on settings
  const textClasses = {
    sm: textSize === 'lg' ? 'text-base' : textSize === 'xl' ? 'text-lg' : 'text-sm',
    base: textSize === 'lg' ? 'text-lg' : textSize === 'xl' ? 'text-xl' : 'text-base',
    lg: textSize === 'lg' ? 'text-xl' : textSize === 'xl' ? 'text-2xl' : 'text-lg',
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
              <h3 className={`${textClasses.sm} font-semibold text-gray-700 uppercase tracking-wider`}>Photo Evidence</h3>
            </div>
            <div className="rounded-2xl border border-gray-200 shadow-sm relative bg-gray-50 flex justify-center p-2">
              <img 
                src={sighting.imageUrl} 
                alt="Sighting evidence" 
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
            <span>Reported {formatTimeAgo(sighting.timestamp)}</span>
          </div>
          <p className={`text-gray-700 ${textClasses.sm} ml-6`}>{formatFullTime(sighting.timestamp)}</p>
        </div>

        {/* Vehicle Section */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Car className="w-5 h-5 text-gray-600" />
            <h3 className={`${textClasses.sm} font-semibold text-gray-700 uppercase tracking-wider`}>Vehicle</h3>
          </div>
          <div className="bg-gray-50 rounded-2xl p-5 space-y-4">
            <div className="flex justify-between items-center">
              <span className={`text-gray-500 ${textClasses.base}`}>Type</span>
              <span className={`font-semibold text-gray-900 ${textClasses.base}`}>{sighting.vehicle.type}</span>
            </div>
            <div className="border-t border-gray-200" />
            <div className="flex justify-between items-center">
              <span className={`text-gray-500 ${textClasses.base}`}>Color</span>
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
            <h3 className={`${textClasses.sm} font-semibold text-gray-700 uppercase tracking-wider`}>Personnel</h3>
          </div>
          <div className="bg-gray-50 rounded-2xl p-5 space-y-4">
            <div className="flex justify-between items-center">
              <span className={`text-gray-500 ${textClasses.base}`}>Count</span>
              <span className={`font-semibold text-gray-900 ${textClasses.base}`}>{sighting.personnel.count} {sighting.personnel.count === 1 ? 'person' : 'people'}</span>
            </div>
            {sighting.personnel.description && (
              <>
                <div className="border-t border-gray-200" />
                <div>
                  <span className={`text-gray-500 block mb-2 ${textClasses.base}`}>Description</span>
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
            <h3 className={`${textClasses.sm} font-semibold text-gray-700 uppercase tracking-wider`}>Activity</h3>
          </div>
          <div className="bg-gray-50 rounded-2xl p-5 space-y-4">
            <div className="flex justify-between items-center">
              <span className={`text-gray-500 ${textClasses.base}`}>Status</span>
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
            <h3 className={`${textClasses.sm} font-semibold text-gray-700 uppercase tracking-wider`}>Location</h3>
          </div>
          <div className="bg-gray-50 rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <span className={`text-gray-500 ${textClasses.base}`}>Coordinates</span>
              <span className={`font-mono text-gray-900 ${textClasses.sm}`}>
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

// Settings View Component
const SettingsView = ({ onBack }: { onBack: () => void }) => {
  const { colorMode, setColorMode, textSize, setTextSize } = useSettings();
  
  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);

  // Monitor Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setConfirmationResult(null);
        setVerificationCode("");
        setPhoneNumber("");
      }
    });
    return () => unsubscribe();
  }, []);

  // Fetch initial notification status
  useEffect(() => {
    const fetchNotifStatus = async () => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            setNotificationsEnabled(userDoc.data().notificationsEnabled || false);
          } else {
            // Create user doc if it doesn't exist
            await setDoc(doc(db, 'users', user.uid), {
              phoneNumber: user.phoneNumber,
              notificationsEnabled: false,
              createdAt: Date.now()
            });
          }
        } catch (err) {
          console.error("Error fetching user notif status:", err);
        }
      }
    };
    fetchNotifStatus();
  }, [user]);

  // Track user location for alerts
  useEffect(() => {
    let interval: NodeJS.Timeout;

    const updateLocation = async () => {
      if (user && notificationsEnabled) {
        try {
          const location = await getCurrentLocation();
          await updateDoc(doc(db, 'users', user.uid), {
            lastKnownLocation: location,
            updatedAt: Date.now()
          });
        } catch (err) {
          console.error("Error updating location for alerts:", err);
        }
      }
    };

    if (user && notificationsEnabled) {
      updateLocation();
      interval = setInterval(updateLocation, 5 * 60 * 1000); // Update every 5 mins
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [user, notificationsEnabled]);

  // Initialize Recaptcha
  useEffect(() => {
    const initRecaptcha = async () => {
      if (!user && !confirmationResult && !window.recaptchaVerifier) {
        try {
          const { RecaptchaVerifier } = await import("firebase/auth");
          window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
            'size': 'invisible',
            'callback': () => {
              // reCAPTCHA solved
            },
            'expired-callback': () => {
               // Reset if expired
               if (window.recaptchaVerifier) {
                 window.recaptchaVerifier.clear();
                 window.recaptchaVerifier = undefined;
               }
            }
          });
          // Pre-render to ensure it's ready
          window.recaptchaVerifier.render();
        } catch (err) {
          console.error("Recaptcha init error:", err);
        }
      }
    };

    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      initRecaptcha();
    }, 100);

    return () => {
      clearTimeout(timer);
      if (window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
          window.recaptchaVerifier = undefined;
        } catch (e) {
          console.error("Error clearing recaptcha", e);
        }
      }
    };
  }, [user, confirmationResult]);

  const onSignInSubmit = async () => {
    setError(null);
    setLoading(true);

    // Basic validation
    if (!phoneNumber.startsWith('+')) {
      setError("Please include your country code (e.g., +1 for USA).");
      setLoading(false);
      return;
    }

    if (phoneNumber.length < 10) {
      setError("Please enter a valid phone number.");
      setLoading(false);
      return;
    }

    try {
      if (!window.recaptchaVerifier) {
         // Try to re-init if missing
         const { RecaptchaVerifier } = await import("firebase/auth");
         window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
            'size': 'invisible',
            'callback': () => {}
         });
      }
      
      const appVerifier = window.recaptchaVerifier;
      const confirmation = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
      setConfirmationResult(confirmation);
      setLoading(false);
    } catch (err: any) {
      console.error("Error sending code:", err);
      if (err.code === 'auth/invalid-app-credential') {
        setError("Domain not authorized. Check Firebase Console whitelisting.");
      } else if (err.code === 'auth/captcha-check-failed') {
        setError("Captcha check failed. Make sure your domain (e.g., localhost) is added to 'Authorized Domains' in Firebase Console.");
      } else if (err.code === 'auth/too-many-requests') {
        setError("Too many attempts. Please try again later or use a test number.");
      } else {
        // Show the actual error message and code for debugging
        setError(`${err.message} (${err.code || 'unknown'})`);
      }
      setLoading(false);
      
      // Reset recaptcha if error
      if (window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
          window.recaptchaVerifier = undefined;
        } catch (e) {
          console.error("Error clearing recaptcha", e);
        }
      }
    }
  };

  const onVerifyCode = async () => {
    if (!confirmationResult) return;
    setError(null);
    setLoading(true);

    try {
      await confirmationResult.confirm(verificationCode);
      // User is verified and signed in handled by onAuthStateChanged
      setLoading(false);
    } catch (err: any) {
      console.error("Error verifying code:", err);
      setError("Invalid verification code. Please try again.");
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Error signing out:", err);
    }
  };

  const handleToggleNotifications = async () => {
    if (!user) {
      setError("Please sign in to enable notifications.");
      return;
    }

    if (!messaging) {
      setError("Messaging not supported on this device.");
      return;
    }

    setNotifLoading(true);
    setError(null);

    try {
      if (!notificationsEnabled) {
        // Request permission
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          const { getToken } = await import('firebase/messaging');
          const token = await getToken(messaging, { 
            vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY 
          });
          
          if (token) {
            // Store token in Firestore
            await updateDoc(doc(db, 'users', user.uid), {
              fcmToken: token,
              notificationsEnabled: true,
              lastKnownLocation: null, // To be updated during sightings
              updatedAt: Date.now()
            });
            setNotificationsEnabled(true);
          }
        } else {
          setError("Notification permission denied.");
        }
      } else {
        // Disable notifications
        await updateDoc(doc(db, 'users', user.uid), {
          notificationsEnabled: false,
          updatedAt: Date.now()
        });
        setNotificationsEnabled(false);
      }
    } catch (err: any) {
      console.error("Error toggling notifications:", err);
      setError(err.message || "Failed to update notification settings.");
    } finally {
      setNotifLoading(false);
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
          <p className="text-gray-500 mb-8">Customize app experience & manage account.</p>
        </div>

        {/* Account Settings */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-gray-700" />
            <h2 className="text-lg font-semibold text-gray-900">Account</h2>
          </div>
          
          <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
            {user ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Signed in as</p>
                    <p className="font-semibold text-gray-900">{user.phoneNumber}</p>
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  className="w-full py-2.5 px-4 bg-white border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors focus:ring-2 focus:ring-gray-200"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {!confirmationResult ? (
                  <>
                    <p className="text-sm text-gray-600 mb-2">Sign in with your phone number to sync settings and history.</p>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">Phone Number (E.164 format)</label>
                        <input 
                          type="tel" 
                          placeholder="+1 555-555-5555"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        />
                        <p className="text-[10px] text-gray-400 mt-1">Include country code starting with +</p>
                      </div>
                      <div id="recaptcha-container"></div>
                      
                      {error && (
                        <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          {error}
                        </p>
                      )}

                      <button
                        onClick={onSignInSubmit}
                        disabled={loading || !phoneNumber}
                        className={`w-full py-3 px-4 bg-black text-white rounded-xl font-medium transition-all ${
                          loading || !phoneNumber ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-800 shadow-md'
                        }`}
                      >
                        {loading ? "Sending Code..." : "Send Verification Code"}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-gray-600">Enter code sent to {phoneNumber}</p>
                      <button 
                         onClick={() => {
                           setConfirmationResult(null); 
                           setVerificationCode("");
                           setError(null);
                         }}
                         className="text-xs text-blue-600 font-medium hover:underline"
                      >
                        Change Number
                      </button>
                    </div>
                    
                    <div className="space-y-3">
                         <input 
                          type="text" 
                          placeholder="123456"
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value)}
                          className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all tracking-widest text-center text-lg font-mono"
                        />
                      
                      {error && (
                        <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          {error}
                        </p>
                      )}

                      <button
                        onClick={onVerifyCode}
                        disabled={loading || !verificationCode}
                        className={`w-full py-3 px-4 bg-blue-600 text-white rounded-xl font-medium transition-all ${
                          loading || !verificationCode ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700 shadow-lg shadow-blue-200'
                        }`}
                      >
                        {loading ? "Verifying..." : "Verify & Sign In"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Proximity Alerts Settings */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-5 h-5 text-gray-700" />
            <h2 className="text-lg font-semibold text-gray-900">Real-time Alerts</h2>
          </div>
          
          <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <p className="font-medium text-gray-900">Push Notifications</p>
                <p className="text-xs text-gray-500 mt-0.5">Receive alerts when sightings are reported near you.</p>
              </div>
              <button
                onClick={handleToggleNotifications}
                disabled={notifLoading || !user}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  notificationsEnabled ? 'bg-blue-600' : 'bg-gray-200'
                } ${(!user || notifLoading) ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    notificationsEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            
            {!user && (
              <p className="text-[10px] text-orange-600 mt-3 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Sign in to enable proximity alerts
              </p>
            )}
            
            {notificationsEnabled && (
              <div className="mt-4 p-3 bg-blue-50 rounded-xl border border-blue-100 flex items-start gap-2">
                <Bell className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <p className="text-[11px] text-blue-800 leading-relaxed">
                  You will receive a notification if a sighting is reported within 2km of your location. Make sure browser notifications are allowed.
                </p>
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

const SidebarGlobalFooter = ({ onSettingsClick }: { onSettingsClick: () => void }) => (
  <div className="px-4 py-3 border-t border-gray-200 bg-white">
    <div className="space-y-1">
      <button className="w-full flex items-center gap-4 px-5 py-5 text-gray-700 hover:bg-gray-50 hover:text-gray-900 rounded-xl transition-colors text-lg font-medium">
        <HelpCircle className="w-7 h-7" />
        Help
      </button>
      <button 
        onClick={onSettingsClick}
        className="w-full flex items-center gap-4 px-5 py-5 text-gray-700 hover:bg-gray-50 hover:text-gray-900 rounded-xl transition-colors text-lg font-medium"
      >
        <Settings className="w-7 h-7" />
        Settings
      </button>
    </div>
  </div>
);

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
            Recent Sightings
          </h2>
          <span className="text-sm text-gray-500">Last 4 hours</span>
        </div>

        {sortedSightings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <MapPin className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 font-medium">No recent sightings</p>
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
