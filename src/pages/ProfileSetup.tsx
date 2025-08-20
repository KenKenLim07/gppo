import { useState, useEffect } from "react";
import { auth } from "../services/firebase";
import { ref, get, set } from "firebase/database";
import { realtimeDb } from "../services/firebase";
import { useLocation } from "../contexts/LocationContext";
import LocationTest from "../components/LocationTest";
import { Capacitor } from '@capacitor/core';
import { useNavigate, useLocation as useRouterLocation } from "react-router-dom";
import { isProfileComplete } from '../utils/profileUtils';
import { ReusableFloatingLabelInput } from "../components/ui/ReusableFloatingLabelInput";
// Removed floating label select usage for unitType/shift

interface OfficerProfile {
  email: string;
  name: string;
  rank: string;
  contact: string;
  station: string;
  badgeNumber: string;
  lat?: number;
  lng?: number;
  lastUpdated?: number;
  photoURL?: string;
  callSign?: string;
  unitType?: string;
  shift?: string;
}

const ProfileSetup = () => {
  const navigate = useNavigate();
  const routerLocation = useRouterLocation();
  const [profile, setProfile] = useState<OfficerProfile | null>(null);
  const [name, setName] = useState("");
  const [rank, setRank] = useState("");
  const [contact, setContact] = useState("");
  const [station, setStation] = useState("");
  const [badgeNumber, setBadgeNumber] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingProfile, setCheckingProfile] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [success, setSuccess] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(2);
  const { isSharingLocation, locationLoading, toggleLocation, locationData } = useLocation();
  const [callSign, setCallSign] = useState("");
  const [unitType, setUnitType] = useState("");
  const [shift, setShift] = useState("");
  const unitTypeOptions = [
    "Mobile Patrol",
    "TOC",
    "Motorcycle",
    "Checkpoint"
  ];
  const shiftOptions = [
    "1st Shift",
    "2nd Shift",
    "3rd Shift"
  ];

  // Fetch profile on mount
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    const profileRef = ref(realtimeDb, `users/${user.uid}`);
    get(profileRef).then((snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setProfile(data);
        setName(data.name || "");
        setRank(data.rank || "");
        setContact(data.contact || "");
        setStation(data.station || "");
        setBadgeNumber(data.badgeNumber || "");
        setCallSign(data.callSign || "");
        setUnitType(data.unitType || "");
        setShift(data.shift || "");
      }
      setCheckingProfile(false);
    });
  }, []);

  useEffect(() => {
    // Auto-enter edit mode if profile is incomplete or ?edit=true is in the URL
    if ((profile && !isProfileComplete(profile)) || routerLocation.search.includes('edit=true')) {
      setEditMode(true);
    }
  }, [profile, routerLocation.search]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🔄 Profile save started...');
    const user = auth.currentUser;
    if (!user) {
      setError("You must be logged in.");
      return;
    }
    setLoading(true);
    try {
      const profileData = {
        email: user.email || "",
        name,
        rank,
        contact,
        station,
        badgeNumber,
        callSign,
        unitType,
        shift,
        ...(locationData ? { lat: locationData.lat, lng: locationData.lng, lastUpdated: locationData.lastUpdated } : {}),
      };
      
      console.log('💾 Saving profile data:', profileData);
      await set(ref(realtimeDb, `users/${user.uid}`), profileData);
      console.log('✅ Profile saved to Firebase successfully');
      
      // Update local state
      setProfile(profileData);
      setError("");
      setSuccess(true);
      console.log('🎉 Success state set, waiting before redirect...');
      
      // Keep edit mode true to show success message, then redirect with countdown
      const countdownInterval = setInterval(() => {
        setRedirectCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            console.log('🚀 Redirecting to map...');
            navigate('/map');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
    } catch (err: any) {
      console.error('❌ Profile save failed:', err);
      setError(err.message || "Failed to save profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Helper: check for missing required fields
  const requiredFields = [
    { key: 'name', label: 'Name' },
    { key: 'rank', label: 'Rank' },
    { key: 'contact', label: 'Contact' },
    { key: 'station', label: 'Station' },
    { key: 'badgeNumber', label: 'Badge Number' },
    { key: 'unitType', label: 'Unit Type' },
    { key: 'shift', label: 'Shift' },
  ] as const;
  const isMissing = (profile: OfficerProfile | null, key: typeof requiredFields[number]['key']) => {
    if (!profile) return true;
    return !profile[key as keyof OfficerProfile];
  };
  const missingFields = requiredFields.filter(f => isMissing(profile, f.key));

  const getNavigationButton = () => {
    if (editMode) {
      if (isProfileComplete(profile)) {
      return {
        text: "Cancel",
        action: () => setEditMode(false),
        style: "flex items-center gap-1 text-sm text-white font-medium px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 shadow-sm transition-colors"
      };
      }
      return null;
    } else if (isProfileComplete(profile)) {
      return {
        text: "Back to Map",
        action: () => navigate('/map'),
        style: "flex items-center gap-1 text-sm text-white font-medium px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors"
      };
    } else {
      return null;
    }
  };

  const navButton = getNavigationButton();

  if (checkingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-blue-100">
        <div className="text-lg">Checking profile...</div>
      </div>
    );
  }

  // Read-only profile view
  if (profile && !editMode) {
    return (
      <div className={`min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-6 ${Capacitor.isNativePlatform() ? 'pb-20' : ''}`}>
        <div className="w-full flex justify-center mb-4">
          {(() => {
            if (navButton === null) return null;
            const { action, style, text } = navButton;
            return (
              <button onClick={action} className={style}>{text}</button>
            );
          })()}
        </div>
        <div className="relative z-10 w-full max-w-md mx-auto">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 p-6">
            {missingFields.length > 0 && (
              <div className="mb-4 bg-yellow-600/20 border border-yellow-500/30 text-yellow-200 px-3 py-2 rounded flex items-center gap-2 text-xs">
                <svg className="w-4 h-4 text-yellow-300" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                <span>
                  Please complete your profile: {missingFields.map(f => f.label).join(', ')}
                </span>
              </div>
            )}
            <div className="flex flex-col items-center mb-4">
              <div className="text-xl font-bold text-white mb-1 text-center">{profile.name}</div>
              <div className="text-xs text-blue-200 mb-2 text-center">{profile.email}</div>
            </div>
            <div className="space-y-2 divide-y divide-white/10 text-blue-100">
              <div className="flex justify-between text-sm py-1"><span className="text-blue-200/80">Rank</span><span className="font-medium text-white">{profile.rank}</span></div>
              <div className="flex justify-between text-sm py-1"><span className="text-blue-200/80">Badge #</span><span className="font-medium text-white">{profile.badgeNumber}</span></div>
              <div className="flex justify-between text-sm py-1"><span className="text-blue-200/80">Contact</span><span className="font-medium text-white">{profile.contact}</span></div>
              <div className="flex justify-between text-sm py-1"><span className="text-blue-200/80">Station</span><span className="font-medium text-white">{profile.station}</span></div>
              {profile.callSign && (<div className="flex justify-between text-sm py-1"><span className="text-blue-200/80">Call Sign</span><span className="font-medium text-white">{profile.callSign}</span></div>)}
              {profile.unitType && (<div className="flex justify-between text-sm py-1"><span className="text-blue-200/80">Unit Type</span><span className="font-medium text-white">{profile.unitType}</span></div>)}
              {profile.shift && (<div className="flex justify-between text-sm py-1"><span className="text-blue-200/80">Shift</span><span className="font-medium text-white">{profile.shift}</span></div>)}
            </div>
            <button
              type="button"
              onClick={toggleLocation}
              className={`w-full py-2 rounded font-semibold transition mt-5 mb-2 ${isSharingLocation ? "bg-red-600 text-white hover:bg-red-700" : "bg-blue-600 text-white hover:bg-blue-700"}`}
              disabled={locationLoading}
            >
              {locationLoading ? "Processing..." : (isSharingLocation ? "Turn Off Location Sharing" : "Share My Location")}
            </button>
            <button
              type="button"
              onClick={() => setEditMode(true)}
              className="w-full bg-yellow-500 text-white py-2 rounded hover:bg-yellow-600 font-semibold transition"
            >
              Edit Profile
            </button>
            <div className="mt-6 pt-6 border-t border-white/10">
              <LocationTest />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Edit profile form
  return (
    <div className={`min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-6 ${Capacitor.isNativePlatform() ? 'pb-20' : ''}`}>
      <div className="w-full flex justify-center mb-4">
        {(() => {
          if (navButton === null) return null;
          const { action, style, text } = navButton;
          return (
            <button onClick={action} className={style}>{text}</button>
          );
        })()}
      </div>
      <form onSubmit={handleSubmit} className="relative z-10 w-full max-w-md mx-auto bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 p-8">
        {missingFields.length > 0 && (
          <div className="mb-4 bg-yellow-600/20 border border-yellow-500/30 text-yellow-200 px-3 py-2 rounded flex items-center gap-2 text-xs">
            <svg className="w-4 h-4 text-yellow-300" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
            <span>
              Please complete your profile: {missingFields.map(f => f.label).join(', ')}
            </span>
          </div>
        )}
        <div className="flex flex-col items-center mb-6">
          <h2 className="text-xl font-semibold text-white mb-1">Edit Officer Profile</h2>
          <p className="text-blue-200 text-sm">Update your details below</p>
        </div>
        {error && (
          <div className="mb-4 rounded-lg bg-red-500/20 border border-red-400/30 p-3 text-sm text-red-200">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 rounded-lg bg-green-500/20 border border-green-400/30 p-3 text-sm text-green-200">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-green-300" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">Profile saved successfully!</span>
            </div>
            <div className="mt-2 text-xs text-green-300">
              Redirecting to map in {redirectCountdown} second{redirectCountdown !== 1 ? 's' : ''}...
            </div>
          </div>
        )}

        <div className="space-y-4">
          <ReusableFloatingLabelInput
            id="name"
            type="text"
            label="Full Name"
            value={name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
            inputClassName="bg-white/10 border-white/20 text-white placeholder-white/50 focus:border-blue-400 focus:ring-blue-400"
            labelClassName="text-blue-200"
            required
          />
          <ReusableFloatingLabelInput
            id="rank"
            type="text"
            label="Rank"
            value={rank}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRank(e.target.value)}
            inputClassName="bg-white/10 border-white/20 text-white placeholder-white/50 focus:border-blue-400 focus:ring-blue-400"
            labelClassName="text-blue-200"
            required
          />
          <ReusableFloatingLabelInput
            id="contact"
            type="text"
            label="Contact Number"
            value={contact}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setContact(e.target.value)}
            inputClassName="bg-white/10 border-white/20 text-white placeholder-white/50 focus:border-blue-400 focus:ring-blue-400"
            labelClassName="text-blue-200"
            required
          />
          <ReusableFloatingLabelInput
            id="station"
            type="text"
            label="Station"
            value={station}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStation(e.target.value)}
            inputClassName="bg-white/10 border-white/20 text-white placeholder-white/50 focus:border-blue-400 focus:ring-blue-400"
            labelClassName="text-blue-200"
            required
          />
          <ReusableFloatingLabelInput
            id="badgeNumber"
            type="text"
            label="Badge Number"
            value={badgeNumber}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBadgeNumber(e.target.value)}
            inputClassName="bg-white/10 border-white/20 text-white placeholder-white/50 focus:border-blue-400 focus:ring-blue-400"
            labelClassName="text-blue-200"
            required
          />
          <ReusableFloatingLabelInput
            id="callSign"
            type="text"
            label="Call Sign (optional)"
            value={callSign}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCallSign(e.target.value)}
            inputClassName="bg-white/10 border-white/20 text-white placeholder-white/50 focus:border-blue-400 focus:ring-blue-400"
            labelClassName="text-blue-200"
          />

          {/* Standard labeled selects (no floating) for Unit Type and Shift */}
          <div>
            <label htmlFor="unitType" className="block text-sm text-blue-200 mb-1">Unit Type</label>
            <select
              id="unitType"
              value={unitType}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setUnitType(e.target.value)}
              className="w-full rounded border border-white/20 bg-white/10 text-white px-3 py-3 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
              required
            >
              <option value="" disabled className="text-gray-900">Select unit type</option>
              {unitTypeOptions.map(option => (
                <option key={option} value={option} className="text-gray-900">{option}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="shift" className="block text-sm text-blue-200 mb-1">Shift</label>
            <select
              id="shift"
              value={shift}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setShift(e.target.value)}
              className="w-full rounded border border-white/20 bg-white/10 text-white px-3 py-3 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
              required
            >
              <option value="" disabled className="text-gray-900">Select shift</option>
              {shiftOptions.map(option => (
                <option key={option} value={option} className="text-gray-900">{option}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="button"
          onClick={toggleLocation}
          className={`w-full py-2 rounded font-semibold transition mt-5 mb-2 ${isSharingLocation ? "bg-red-600 text-white hover:bg-red-700" : "bg-blue-600 text-white hover:bg-blue-700"}`}
          disabled={locationLoading}
        >
          {locationLoading ? "Processing..." : (isSharingLocation ? "Turn Off Location Sharing" : "Share My Location")}
        </button>
        <button
          type="submit"
          className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-60 disabled:transform-none shadow-lg"
          disabled={loading}
        >
          {loading ? "Saving..." : "Save Profile"}
        </button>
      </form>
    </div>
  );
};

export default ProfileSetup; 