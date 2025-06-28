import { useState, useEffect } from "react";
import { auth } from "../services/firebase";
import { ref, get, set } from "firebase/database";
import { realtimeDb } from "../services/firebase";
import { useLocation } from "../contexts/LocationContext";

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
}

const ProfileSetup = () => {
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
        ...(locationData ? { lat: locationData.lat, lng: locationData.lng, lastUpdated: locationData.lastUpdated } : {}),
      });
      setProfile({
        email: user.email || "",
        name,
        rank,
        contact,
        station,
        badgeNumber,
        ...(locationData ? { lat: locationData.lat, lng: locationData.lng, lastUpdated: locationData.lastUpdated } : {}),
      });
      setEditMode(false);
      setError("");
    } catch (err) {
      setError("Failed to save profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (checkingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="text-gray-700 dark:text-gray-200 text-lg">Checking profile...</div>
      </div>
    );
  }

  // Show profile view if profile exists and not in edit mode
  if (profile && !editMode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-2 pt-8 md:pt-12">
        <div className="bg-white dark:bg-gray-800 p-8 rounded shadow-md w-full max-w-md">
          <div className="flex flex-col items-center mb-6">
            <span className="text-4xl mb-2">👮</span>
            <h2 className="text-2xl font-bold mb-1 text-gray-900 dark:text-white">
              Officer Profile
            </h2>
            <p className="text-gray-500 dark:text-gray-300 text-sm mb-2">
              View your details or update your location
            </p>
          </div>
          <div className="mb-4">
            <div className="text-gray-700 dark:text-gray-200 mb-1"><strong>Name:</strong> {profile.name}</div>
            <div className="text-gray-700 dark:text-gray-200 mb-1"><strong>Rank:</strong> {profile.rank}</div>
            <div className="text-gray-700 dark:text-gray-200 mb-1"><strong>Contact:</strong> {profile.contact}</div>
            <div className="text-gray-700 dark:text-gray-200 mb-1"><strong>Station:</strong> {profile.station}</div>
            <div className="text-gray-700 dark:text-gray-200 mb-1"><strong>Badge Number:</strong> {profile.badgeNumber}</div>
            <div className="text-gray-700 dark:text-gray-200 mb-1"><strong>Email:</strong> {profile.email}</div>
            {locationData && (
              <div className="text-gray-700 dark:text-gray-200 mb-1">
                <strong>Location:</strong> {locationData.lat.toFixed(5)}, {locationData.lng.toFixed(5)}
              </div>
            )}
            {locationData?.lastUpdated && (
              <div className="text-gray-500 dark:text-gray-400 text-xs mb-1">
                Last updated: {new Date(locationData.lastUpdated).toLocaleString()}
              </div>
            )}
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
              ? (isSharingLocation ? "Turning Off..." : "Sharing Location...") 
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
        </div>
      </div>
    );
  }

  // Show form if no profile or in edit mode
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-6">
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 p-8 rounded shadow-md w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <span className="text-4xl mb-2">👮</span>
          <h2 className="text-2xl font-bold mb-1 text-gray-900 dark:text-white">
            Officer Profile Setup
          </h2>
          <p className="text-gray-500 dark:text-gray-300 text-sm">
            Please complete your profile details
          </p>
        </div>
        {error && <p className="text-red-500 mb-3">{error}</p>}
        <input
          type="text"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full p-2 mb-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
        <input
          type="text"
          placeholder="Rank"
          value={rank}
          onChange={(e) => setRank(e.target.value)}
          className="w-full p-2 mb-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
        <input
          type="text"
          placeholder="Contact"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          className="w-full p-2 mb-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
        <input
          type="text"
          placeholder="Station"
          value={station}
          onChange={(e) => setStation(e.target.value)}
          className="w-full p-2 mb-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
        <input
          type="text"
          placeholder="Badge Number"
          value={badgeNumber}
          onChange={(e) => setBadgeNumber(e.target.value)}
          className="w-full p-2 mb-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
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
            ? (isSharingLocation ? "Turning Off..." : "Sharing Location...") 
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