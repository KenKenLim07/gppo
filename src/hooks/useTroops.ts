import { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import { realtimeDb } from "../services/firebase";

export type Troop = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  contact: string;
  status?: string;
  rank?: string;
  station?: string;
  badgeNumber?: string;
  email?: string;
  lastUpdated?: number;
  emergencyTriggeredAt?: number;
};

export const useTroops = () => {
  const [troops, setTroops] = useState<Troop[]>([]);

  useEffect(() => {
    const usersRef = ref(realtimeDb, "users");

    const unsubscribe = onValue(usersRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        setTroops([]);
        return;
      }
      const parsedTroops: Troop[] = Object.entries(data)
        .map(([id, value]: [string, any]) => ({
          id,
          ...value,
        }))
        .filter((troop) => {
          // More robust filtering for valid location data
          return troop.lat != null && 
                 troop.lng != null &&
                 typeof troop.lat === "number" &&
                 typeof troop.lng === "number" &&
                 !isNaN(troop.lat) &&
                 !isNaN(troop.lng) &&
                 troop.lat !== 0 &&
                 troop.lng !== 0;
        }); // Only those with valid location
      setTroops(parsedTroops);
    });

    return () => unsubscribe(); // detach listener on unmount
  }, []);

  return troops;
}; 