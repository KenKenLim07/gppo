import { useState, useEffect } from "react";
import { auth } from "../services/firebase";
import { ref, get, set } from "firebase/database";
import { realtimeDb } from "../services/firebase";
import { useLocation } from "../contexts/LocationContext";
import LocationTest from "../components/LocationTest";
import { Capacitor } from '@capacitor/core';
import { useNavigate } from "react-router-dom";

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) {
      setError("You must be logged in.");
      return;
    }
    setLoading(true);
    try {
      await set(ref(realtimeDb, `users/${user.uid}`), {
        email: user.email,
        name,
        rank,
        contact,
        station,
        badgeNumber,
        callSign,
        unitType,
        shift,
        ...(locationData ? { lat: locationData.lat, lng: locationData.lng, lastUpdated: locationData.lastUpdated } : {}),
      });
      setProfile({
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
      });
      setEditMode(false);
      setError("");
    } catch (err: any) {
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

  if (checkingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="text-gray-700 dark:text-gray-200 text-lg">Checking profile...</div>
      </div>
    );
  }

  // Minimalist profile view
  if (profile && !editMode) {
    return (
      <div className={`min-h-screen flex flex-col justify-start bg-gray-100 dark:bg-gray-900 p-2 pt-6 md:pt-8 ${Capacitor.isNativePlatform() ? 'pb-20' : ''}`}>
        {/* Home/Back Button - outside card */}
        <div className="w-full flex justify-center mb-2">
          <button
            onClick={() => navigate('/map')}
            className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-semibold px-3 py-1 rounded bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 shadow-sm"
            aria-label="Back to Map"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Home
          </button>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow w-full max-w-sm border border-gray-200 dark:border-gray-700 relative mx-auto">
          {/* Missing Details Warning */}
          {missingFields.length > 0 && (
            <div className="mb-4 mt-2 bg-yellow-100 dark:bg-yellow-900/30 border-l-4 border-yellow-500 text-yellow-800 dark:text-yellow-200 px-3 py-2 rounded flex items-center gap-2 text-xs shadow-sm">
              <svg className="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01" /></svg>
              <span>
                Please complete your profile: {missingFields.map(f => f.label).join(', ')}
              </span>
            </div>
          )}
          <div className="flex flex-col items-center mb-4">
            <span className="text-5xl mb-2">👮</span>
            <div className="text-xl font-bold text-gray-900 dark:text-white mb-1 text-center">{profile.name}</div>
            <div className="text-xs text-gray-400 dark:text-gray-400 mb-2 text-center">{profile.email}</div>
          </div>
          <div className="space-y-2 divide-y divide-gray-200 dark:divide-gray-700">
            <div className="flex justify-between text-sm py-1">
              <span className="text-gray-500 dark:text-gray-300">Rank</span>
              <span className="font-medium text-gray-900 dark:text-white">{profile.rank}</span>
            </div>
            <div className="flex justify-between text-sm py-1">
              <span className="text-gray-500 dark:text-gray-300">Badge #</span>
              <span className="font-medium text-gray-900 dark:text-white">{profile.badgeNumber}</span>
            </div>
            <div className="flex justify-between text-sm py-1">
              <span className="text-gray-500 dark:text-gray-300">Contact</span>
              <span className="font-medium text-gray-900 dark:text-white">{profile.contact}</span>
            </div>
            <div className="flex justify-between text-sm py-1">
              <span className="text-gray-500 dark:text-gray-300">Station</span>
              <span className="font-medium text-gray-900 dark:text-white">{profile.station}</span>
            </div>
            {profile.callSign && (
              <div className="flex justify-between text-sm py-1">
                <span className="text-gray-500 dark:text-gray-300">Call Sign</span>
                <span className="font-medium text-gray-900 dark:text-white">{profile.callSign}</span>
              </div>
            )}
            {profile.unitType && (
              <div className="flex justify-between text-sm py-1">
                <span className="text-gray-500 dark:text-gray-300">Unit Type</span>
                <span className="font-medium text-gray-900 dark:text-white">{profile.unitType}</span>
              </div>
            )}
            {profile.shift && (
              <div className="flex justify-between text-sm py-1">
                <span className="text-gray-500 dark:text-gray-300">Shift</span>
                <span className="font-medium text-gray-900 dark:text-white">{profile.shift}</span>
              </div>
            )}
            {profile.lat && profile.lng && (
              <div className="flex justify-between text-xs py-1">
                <span className="text-gray-400 dark:text-gray-400">Location</span>
                <span className="text-gray-700 dark:text-gray-200">{profile.lat.toFixed(5)}, {profile.lng.toFixed(5)}</span>
              </div>
            )}
            {profile.lastUpdated && (
              <div className="flex justify-between text-xs py-1">
                <span className="text-gray-400 dark:text-gray-400">Last updated</span>
                <span className="text-gray-400 dark:text-gray-400">{new Date(profile.lastUpdated).toLocaleString()}</span>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={toggleLocation}
            className={`w-full py-2 rounded font-semibold transition mt-5 mb-2 ${
              isSharingLocation
                ? "bg-red-600 text-white hover:bg-red-700"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
            disabled={locationLoading}
          >
            {locationLoading 
              ? "Processing..." 
              : (isSharingLocation ? "Turn Off Location Sharing" : "Share My Location")
            }
          </button>
          <button
            type="button"
            onClick={() => setEditMode(true)}
            className="w-full bg-yellow-500 text-white py-2 rounded hover:bg-yellow-600 font-semibold transition"
          >
            Edit Profile
          </button>
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <LocationTest />
          </div>
        </div>
      </div>
    );
  }

  // Minimalist edit profile form
  return (
    <div className={`min-h-screen flex flex-col justify-start bg-gray-100 dark:bg-gray-900 p-6 pt-6 md:pt-8 ${Capacitor.isNativePlatform() ? 'pb-20' : ''}`}>
      {/* Home/Back Button - outside card */}
      <div className="w-full flex justify-center mb-2">
        <button
          onClick={() => navigate('/map')}
          type="button"
          className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-semibold px-3 py-1 rounded bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 shadow-sm"
          aria-label="Back to Map"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Home
        </button>
      </div>
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow w-full max-w-sm border border-gray-200 dark:border-gray-700 relative mx-auto">
        {/* Missing Details Warning */}
        {missingFields.length > 0 && (
          <div className="mb-4 mt-2 bg-yellow-100 dark:bg-yellow-900/30 border-l-4 border-yellow-500 text-yellow-800 dark:text-yellow-200 px-3 py-2 rounded flex items-center gap-2 text-xs shadow-sm">
            <svg className="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01" /></svg>
            <span>
              Please complete your profile: {missingFields.map(f => f.label).join(', ')}
            </span>
          </div>
        )}
        <div className="flex flex-col items-center mb-6">
          <span className="text-4xl mb-2">👮</span>
          <h2 className="text-2xl font-bold mb-1 text-gray-900 dark:text-white">
            Edit Officer Profile
          </h2>
          <p className="text-gray-500 dark:text-gray-300 text-sm">
            Update your details below
          </p>
        </div>
        {error && <p className="text-red-500 mb-3">{error}</p>}
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-200 mb-1" htmlFor="name">Name</label>
        <input
          id="name"
          type="text"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full p-2 mb-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-200 mb-1" htmlFor="rank">Rank</label>
        <input
          id="rank"
          type="text"
          placeholder="Rank"
          value={rank}
          onChange={(e) => setRank(e.target.value)}
          className="w-full p-2 mb-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-200 mb-1" htmlFor="contact">Contact</label>
        <input
          id="contact"
          type="text"
          placeholder="Contact"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          className="w-full p-2 mb-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-200 mb-1" htmlFor="station">Station</label>
        <input
          id="station"
          type="text"
          placeholder="Station"
          value={station}
          onChange={(e) => setStation(e.target.value)}
          className="w-full p-2 mb-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-200 mb-1" htmlFor="badgeNumber">Badge Number</label>
        <input
          id="badgeNumber"
          type="text"
          placeholder="Badge Number"
          value={badgeNumber}
          onChange={(e) => setBadgeNumber(e.target.value)}
          className="w-full p-2 mb-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-200 mb-1" htmlFor="callSign">Call Sign</label>
        <input
          id="callSign"
          type="text"
          placeholder="Call Sign (e.g., Patrol 1)"
          value={callSign}
          onChange={(e) => setCallSign(e.target.value)}
          className="w-full p-2 mb-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="mb-3">
          <label htmlFor="unitType" className="block text-xs font-medium text-gray-700 dark:text-gray-200 mb-1">Unit Type</label>
          <select
            id="unitType"
            value={unitType}
            onChange={e => setUnitType(e.target.value)}
            className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="" disabled>Select unit type</option>
            {unitTypeOptions.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>
        <div className="mb-3">
          <label htmlFor="shift" className="block text-xs font-medium text-gray-700 dark:text-gray-200 mb-1">Shift</label>
          <select
            id="shift"
            value={shift}
            onChange={e => setShift(e.target.value)}
            className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="" disabled>Select shift</option>
            {shiftOptions.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={toggleLocation}
          className={`w-full py-2 rounded font-semibold transition mb-3 ${
            isSharingLocation
              ? "bg-red-600 text-white hover:bg-red-700"
              : "bg-blue-600 text-white hover:bg-blue-700"
          }`}
          disabled={locationLoading}
        >
          {locationLoading 
            ? "Processing..." 
            : (isSharingLocation ? "Turn Off Location Sharing" : "Share My Location")
          }
        </button>
        <button
          type="submit"
          className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 font-semibold transition"
          disabled={loading}
        >
          {loading ? "Saving..." : "Save Profile"}
        </button>
        {profile && (
          <button
            type="button"
            onClick={() => setEditMode(false)}
            className="w-full bg-gray-400 text-white py-2 rounded hover:bg-gray-500 font-semibold transition mt-3"
          >
            Cancel
          </button>
        )}
      </form>
    </div>
  );
};

export default ProfileSetup; 